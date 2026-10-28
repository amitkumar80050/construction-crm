const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Stage = require('../models/Stage');

const CRM_FIELDS = [
  { key: 'Name', label: 'Lead Name', required: true },
  { key: 'Contact', label: 'Phone or email', required: false },
  { key: 'Address', label: 'Address', required: false },
  { key: 'Source', label: 'Source', required: false },
  { key: 'Phone', label: 'Phone', required: false },
  { key: 'Email', label: 'Email', required: false },
  { key: 'Company', label: 'Company', required: false },
  { key: 'Status', label: 'Status', required: false },
  { key: 'Stage', label: 'Stage', required: false },
  { key: 'ProjectValue', label: 'Project Value', required: false },
  { key: 'Notes', label: 'Notes', required: false },
];

const VALID_STATUSES = ['lead', 'active', 'closed', 'lost'];
const VALID_SOURCES = ['website', 'referral', 'social_media', 'email', 'call', 'other'];
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

// --- File parsing -----------------------------------------------------

function readCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  const detectedColumns = records.length > 0
    ? Object.keys(records[0]).filter((col) => col && !col.startsWith('__EMPTY'))
    : [];
  return { rows: records, detectedColumns, sheetNames: null, activeSheet: null };
}

function readExcel(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const activeSheet = sheetName || sheetNames[0];
  const sheet = workbook.Sheets[activeSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const detectedColumns = rows.length > 0
    ? Object.keys(rows[0]).filter((col) => col && !col.startsWith('__EMPTY'))
    : [];
  return { rows, detectedColumns, sheetNames, activeSheet };
}

function readFile(filePath, fileType, sheetName) {
  return fileType === 'excel' ? readExcel(filePath, sheetName) : readCSV(filePath);
}

// --- Mapping & validation ----------------------------------------------

function applyMapping(rawRow, columnMapping) {
  const mapped = {};
  for (const [uploadedColumn, crmField] of Object.entries(columnMapping)) {
    if (!crmField) continue; // ignored column
    const val = rawRow[uploadedColumn] ?? rawRow[uploadedColumn.trim()] ?? '';
    mapped[crmField] = val != null ? String(val).trim() : '';
  }
  if (mapped.Contact) {
    if (mapped.Contact.includes('@') && !mapped.Email) mapped.Email = mapped.Contact.toLowerCase();
    else if (!mapped.Phone) mapped.Phone = mapped.Contact.replace(/\D/g, '');
  }
  if (mapped.Email) mapped.Email = mapped.Email.toLowerCase();
  if (mapped.Phone) mapped.Phone = mapped.Phone.replace(/\D/g, '');
  return mapped;
}

async function validateRow(mapped, rowNumber, stageNameToId, seenInBatch, LeadModel = Lead) {
  const errors = [];

  if (!mapped.Name) errors.push({ row: rowNumber, column: 'Name', value: '', reason: 'Name is required', suggestedFix: 'Provide a lead name' });

  if (!mapped.Phone && !mapped.Email) errors.push({ row: rowNumber, column: 'Contact', value: '', reason: 'A phone number or email is required', suggestedFix: 'Provide a valid phone number or email address' });
  if (mapped.Phone && (mapped.Phone.length < 7 || mapped.Phone.length > 15)) {
    errors.push({ row: rowNumber, column: 'Phone', value: mapped.Phone, reason: 'Invalid phone number', suggestedFix: 'Use 7 to 15 digits' });
  }

  if (mapped.Email) {
    if (!EMAIL_REGEX.test(mapped.Email)) {
      errors.push({ row: rowNumber, column: 'Email', value: mapped.Email, reason: 'Invalid email format', suggestedFix: 'Use a valid email address (e.g. name@example.com)' });
    }
  }

  if (!mapped.Source) {
    mapped.Source = 'other';
  } else {
    const cleanSource = mapped.Source.toLowerCase().replace(/[\s-]+/g, '_');
    if (!VALID_SOURCES.includes(cleanSource)) {
      const SOURCE_MAP = {
        facebook: 'social_media',
        fb: 'social_media',
        instagram: 'social_media',
        insta: 'social_media',
        linkedin: 'social_media',
        twitter: 'social_media',
        meta: 'social_media',
        social: 'social_media',
        socialmedia: 'social_media',
        google: 'website',
        web: 'website',
        site: 'website',
        phone: 'call',
        telephone: 'call',
        mobile: 'call',
        cold_call: 'call',
        calling: 'call',
        lead: 'other',
      };
      mapped.Source = SOURCE_MAP[cleanSource] || 'other';
    } else {
      mapped.Source = cleanSource;
    }
  }

  if (mapped.Status && !VALID_STATUSES.includes(mapped.Status.toLowerCase())) {
    errors.push({ row: rowNumber, column: 'Status', value: mapped.Status, reason: `Invalid status "${mapped.Status}"`, suggestedFix: `Use one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (mapped.ProjectValue && isNaN(Number(mapped.ProjectValue))) {
    errors.push({ row: rowNumber, column: 'ProjectValue', value: mapped.ProjectValue, reason: 'Not a valid number', suggestedFix: 'Use numbers only, e.g. 50000' });
  }

  if (mapped.Stage && !stageNameToId.has(mapped.Stage.toLowerCase())) {
    errors.push({ row: rowNumber, column: 'Stage', value: mapped.Stage, reason: `Unknown stage "${mapped.Stage}"`, suggestedFix: 'Match an existing stage name, or leave blank' });
  }

  // Duplicate detection: existing DB record (by email or phone) OR duplicate within this same file
  let status = 'valid';
  if (errors.length > 0) {
    status = 'invalid';
  } else {
    const emailKey = mapped.Email?.toLowerCase() || '';
    const phoneKey = mapped.Phone?.replace(/\D/g, '') || '';
    if ((emailKey && seenInBatch.emails.has(emailKey)) || (phoneKey && seenInBatch.phones.has(phoneKey))) {
      status = 'duplicate';
    } else {
      const contactConditions = [];
      if (emailKey) contactConditions.push({ email: emailKey });
      if (phoneKey) contactConditions.push({ phone: phoneKey });
      const existing = contactConditions.length
        ? await LeadModel.findOne({ $or: contactConditions }).select('_id')
        : null;
      if (existing) status = 'duplicate';
    }
    if (emailKey) seenInBatch.emails.add(emailKey);
    if (phoneKey) seenInBatch.phones.add(phoneKey);
  }

  return { status, errors };
}

// --- Preview -------------------------------------------------------------

async function buildPreview({ tempFilePath, fileType, sheetName, columnMapping }) {
  const { rows: rawRows } = readFile(tempFilePath, fileType, sheetName);

  const stages = await Stage.find({ isActive: true }).select('name');
  const stageNameToId = new Map(stages.map((s) => [s.name.toLowerCase(), s._id]));

  const seenInBatch = { emails: new Set(), phones: new Set() };
  const rows = [];
  const errorReport = [];

  let rowNumber = 1;
  for (const rawRow of rawRows) {
    rowNumber += 1; // account for header row = row 1
    const mapped = applyMapping(rawRow, columnMapping);

    // Skip fully empty rows
    const hasAnyValue = Object.values(mapped).some((v) => v && v.trim());
    if (!hasAnyValue) continue;

    const { status, errors } = await validateRow(mapped, rowNumber, stageNameToId, seenInBatch);
    rows.push({ rowNumber, data: mapped, status, errors: errors.length ? errors : undefined });
    errorReport.push(...errors);
  }

  const totalRecords = rows.length;
  const validRecords = rows.filter((r) => r.status === 'valid').length;
  const duplicateRecords = rows.filter((r) => r.status === 'duplicate').length;
  const invalidRecords = rows.filter((r) => r.status === 'invalid').length;

  return { totalRecords, validRecords, invalidRecords, duplicateRecords, rows, errorReport };
}

// --- Import (bulk insert) -------------------------------------------------

async function processImport({ tempFilePath, fileType, sheetName, columnMapping, duplicateStrategy, userId, assignedTo = userId, teamId = null }) {
  const startTime = Date.now();
  const preview = await buildPreview({ tempFilePath, fileType, sheetName, columnMapping });

  const stages = await Stage.find({ isActive: true }).select('name');
  const stageNameToId = new Map(stages.map((s) => [s.name.toLowerCase(), s._id]));

  // Find the highest existing numerical LeadId to ensure unique sequential IDs across the batch
  const allLeads = await Lead.find({ LeadId: { $exists: true } }).select('LeadId').lean();
  let maxNum = 0;
  for (const l of allLeads) {
    if (typeof l.LeadId === 'string') {
      const match = l.LeadId.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const toInsert = [];
  const toUpdate = []; // { filter, update }

  for (const row of preview.rows) {
    if (row.status === 'invalid') {
      failed += 1;
      continue;
    }

    const doc = {
      name: row.data.Name,
      company: row.data.Company || row.data.Name,
      email: row.data.Email || '',
      phone: row.data.Phone || '',
      source: row.data.Source ? String(row.data.Source).toLowerCase().replace(/[\s-]+/g, '_') : 'other',
      address: { street: row.data.Address || '' },
      status: (row.data.Status || 'lead').toLowerCase(),
      projectValue: row.data.ProjectValue ? Number(row.data.ProjectValue) : 0,
      notes: row.data.Notes || '',
    };
    if (row.data.Stage && stageNameToId.has(row.data.Stage.toLowerCase())) {
      doc.currentStage = stageNameToId.get(row.data.Stage.toLowerCase());
    }

    if (row.status === 'duplicate') {
      if (duplicateStrategy === 'skip' || duplicateStrategy === 'only_new') {
        skipped += 1;
        continue;
      }
      const orConditions = [
        ...(doc.email ? [{ email: doc.email }] : []),
        ...(doc.phone ? [{ phone: doc.phone }] : []),
      ];
      if (orConditions.length > 0) {
        toUpdate.push({
          filter: { $or: orConditions },
          update: doc,
        });
      } else {
        skipped += 1;
      }
      continue;
    }

    // valid, new record with unique sequential LeadId
    maxNum += 1;
    doc.LeadId = `CLT-${String(maxNum).padStart(4, '0')}`;
    doc.assignedTo = (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) ? assignedTo : null;
    doc.createdBy = (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : null;
    doc.team = (teamId && mongoose.Types.ObjectId.isValid(teamId)) ? teamId : null;
    toInsert.push(doc);
  }

  if (toInsert.length > 0) {
    try {
      const result = await Lead.insertMany(toInsert, { ordered: false });
      imported += result.length;
    } catch (insertError) {
      const count = insertError.insertedDocs?.length ?? insertError.result?.nInserted ?? 0;
      imported += count;
      failed += (toInsert.length - count);
      console.error('Lead.insertMany handled error:', insertError.message);
    }
  }

  for (const { filter, update } of toUpdate) {
    try {
      const result = await Lead.updateOne(filter, { $set: update });
      if (result.matchedCount > 0) updated += 1;
      else skipped += 1;
    } catch (updateError) {
      console.error('Lead.updateOne error:', updateError.message);
      failed += 1;
    }
  }

  // Clean up the temp file now that we're done with it
  try { fs.unlinkSync(tempFilePath); } catch (e) { /* non-fatal */ }

  const importDuration = Date.now() - startTime;

  return {
    totalUploaded: preview.totalRecords,
    imported,
    updated,
    skipped,
    duplicate: preview.duplicateRecords,
    failed,
    importDuration,
    errorReport: preview.errorReport,
  };
}

module.exports = {
  CRM_FIELDS,
  readFile,
  validateRow,
  buildPreview,
  processImport,
};