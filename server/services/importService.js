const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const Client = require('../models/Client');
const Stage = require('../models/Stage');

const CRM_FIELDS = [
  { key: 'Name', label: 'Lead Name', required: true },
  { key: 'Company', label: 'Company', required: true },
  { key: 'Email', label: 'Email', required: true },
  { key: 'Phone', label: 'Phone', required: true },
  { key: 'Status', label: 'Status', required: false },
  { key: 'Stage', label: 'Stage', required: false },
  { key: 'ProjectValue', label: 'Project Value', required: false },
  { key: 'Notes', label: 'Notes', required: false },
];

const VALID_STATUSES = ['lead', 'active', 'closed', 'lost'];
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

// --- File parsing -----------------------------------------------------

function readCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  const detectedColumns = records.length > 0 ? Object.keys(records[0]) : [];
  return { rows: records, detectedColumns, sheetNames: null, activeSheet: null };
}

function readExcel(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const activeSheet = sheetName || sheetNames[0];
  const sheet = workbook.Sheets[activeSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
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
    mapped[crmField] = rawRow[uploadedColumn] != null ? String(rawRow[uploadedColumn]).trim() : '';
  }
  return mapped;
}

async function validateRow(mapped, rowNumber, stageNameToId, seenInBatch) {
  const errors = [];

  if (!mapped.Name) errors.push({ row: rowNumber, column: 'Name', value: '', reason: 'Name is required', suggestedFix: 'Provide a lead name' });
  if (!mapped.Company) errors.push({ row: rowNumber, column: 'Company', value: '', reason: 'Company is required', suggestedFix: 'Provide a company name' });
  if (!mapped.Phone) errors.push({ row: rowNumber, column: 'Phone', value: '', reason: 'Phone is required', suggestedFix: 'Provide a phone number' });

  if (mapped.Email) {
    if (!EMAIL_REGEX.test(mapped.Email)) {
      errors.push({ row: rowNumber, column: 'Email', value: mapped.Email, reason: 'Invalid email format', suggestedFix: 'Use a valid email address (e.g. name@example.com)' });
    }
  } else {
    errors.push({ row: rowNumber, column: 'Email', value: '', reason: 'Email is required', suggestedFix: 'Provide an email address' });
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
    const batchKey = `${mapped.Email.toLowerCase()}|${mapped.Phone}`;
    if (seenInBatch.has(batchKey)) {
      status = 'duplicate';
    } else {
      const existing = await Client.findOne({
        $or: [{ email: mapped.Email.toLowerCase() }, { phone: mapped.Phone }],
      }).select('_id');
      if (existing) status = 'duplicate';
    }
    seenInBatch.add(batchKey);
  }

  return { status, errors };
}

// --- Preview -------------------------------------------------------------

async function buildPreview({ tempFilePath, fileType, sheetName, columnMapping }) {
  const { rows: rawRows } = readFile(tempFilePath, fileType, sheetName);

  const stages = await Stage.find({ isActive: true }).select('name');
  const stageNameToId = new Map(stages.map((s) => [s.name.toLowerCase(), s._id]));

  const seenInBatch = new Set();
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

async function processImport({ tempFilePath, fileType, sheetName, columnMapping, duplicateStrategy, userId }) {
  const startTime = Date.now();
  const preview = await buildPreview({ tempFilePath, fileType, sheetName, columnMapping });

  const stages = await Stage.find({ isActive: true }).select('name');
  const stageNameToId = new Map(stages.map((s) => [s.name.toLowerCase(), s._id]));

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
      company: row.data.Company,
      email: row.data.Email.toLowerCase(),
      phone: row.data.Phone,
      status: (row.data.Status || 'lead').toLowerCase(),
      projectValue: row.data.ProjectValue ? Number(row.data.ProjectValue) : 0,
      notes: row.data.Notes || '',
      assignedTo: userId,
    };
    if (row.data.Stage && stageNameToId.has(row.data.Stage.toLowerCase())) {
      doc.currentStage = stageNameToId.get(row.data.Stage.toLowerCase());
    }

    if (row.status === 'duplicate') {
      if (duplicateStrategy === 'skip') {
        skipped += 1;
        continue;
      }
      if (duplicateStrategy === 'only_new') {
        skipped += 1;
        continue;
      }
      // 'update' or 'replace' — apply the same field update either way
      // (a full "replace" isn't safe for a CRM record with relations, so
      // we update matched fields rather than deleting+recreating).
      toUpdate.push({
        filter: { $or: [{ email: doc.email }, { phone: doc.phone }] },
        update: doc,
      });
      continue;
    }

    // valid, new record
    doc.clientId = await Client.generateClientId();
    toInsert.push(doc);
  }

  if (toInsert.length > 0) {
    const result = await Client.insertMany(toInsert, { ordered: false });
    imported += result.length;
  }

  for (const { filter, update } of toUpdate) {
    const result = await Client.updateOne(filter, { $set: update });
    if (result.matchedCount > 0) updated += 1;
    else skipped += 1;
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
  buildPreview,
  processImport,
};