const Client = require('../models/Client');
const Stage = require('../models/Stage');
const User = require('../models/User');
const ImportLog = require('../models/ImportLog');
const { validateLeadRow } = require('../validations/importValidator');
const { chunkArray } = require('../utils/importHelpers');

const BATCH_SIZE = 500;

/**
 * Validates all mapped rows and classifies them.
 * Returns { validRows, invalidRows, errorReport, duplicates }
 */
async function analyzeLeadRows(mappedRows) {
  const stages = await Stage.find({ isActive: true }).select('name');
  const users = await User.find({ isActive: true }).select('name email');

  const validRows = [];
  const errorReport = [];

  mappedRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +2 accounts for header row + 1-indexing
    const { valid, errors } = validateLeadRow(row, rowNumber, stages, users);
    if (valid) {
      validRows.push({ ...row, __row: rowNumber });
    } else {
      errorReport.push(...errors);
    }
  });

  // Duplicate detection within the file itself (email, phone, or name+phone)
  const seen = new Map();
  const dedupedRows = [];
  const duplicatesWithinFile = [];

  for (const row of validRows) {
    const key = (row.email || '').toLowerCase() || `${(row.name || '').toLowerCase()}|${row.phone}`;
    if (seen.has(key)) {
      duplicatesWithinFile.push(row);
    } else {
      seen.set(key, true);
      dedupedRows.push(row);
    }
  }

  // Duplicate detection against existing database records
  const emails = dedupedRows.map((r) => r.email).filter(Boolean);
  const phones = dedupedRows.map((r) => r.phone).filter(Boolean);

  const existingClients = await Client.find({
    $or: [
      { email: { $in: emails } },
      { phone: { $in: phones } },
    ],
  }).select('email phone name');

  const existingEmailSet = new Set(existingClients.map((c) => c.email?.toLowerCase()).filter(Boolean));
  const existingPhoneSet = new Set(existingClients.map((c) => c.phone).filter(Boolean));

  const newRows = [];
  const duplicateRows = [];

  for (const row of dedupedRows) {
    const isDuplicate =
      (row.email && existingEmailSet.has(row.email.toLowerCase())) ||
      (row.phone && existingPhoneSet.has(row.phone));

    if (isDuplicate) {
      duplicateRows.push(row);
    } else {
      newRows.push(row);
    }
  }

  return {
    totalRows: mappedRows.length,
    validRows: newRows,
    duplicateRows: [...duplicateRows, ...duplicatesWithinFile],
    invalidCount: errorReport.length > 0 ? new Set(errorReport.map((e) => e.row)).size : 0,
    errorReport,
    existingClients,
  };
}

/**
 * Performs the actual bulk insert/update using MongoDB bulkWrite,
 * processed in batches for large files.
 */
async function bulkImportLeads({ newRows, duplicateRows, duplicateStrategy, assignedUserId, stagesByName }) {
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const buildDoc = async (row) => {
    const clientId = await Client.generateClientId();
    const stageId = row.stage ? stagesByName.get(String(row.stage).trim().toLowerCase()) : undefined;

    return {
      clientId,
      name: row.name,
      company: row.company,
      email: row.email ? row.email.toLowerCase() : undefined,
      phone: row.phone,
      status: row.status || 'lead',
      projectValue: row.projectValue ? Number(row.projectValue) : undefined,
      notes: row.notes,
      assignedTo: assignedUserId,
      currentStage: stageId,
      source: 'other',
    };
  };

  // Insert genuinely new rows in batches
  const newBatches = chunkArray(newRows, BATCH_SIZE);
  for (const batch of newBatches) {
    const docs = [];
    for (const row of batch) {
      try {
        docs.push(await buildDoc(row));
      } catch (err) {
        failed++;
      }
    }

    if (docs.length > 0) {
      try {
        const result = await Client.insertMany(docs, { ordered: false });
        imported += result.length;
      } catch (err) {
        // insertMany with ordered:false still inserts valid docs and reports failures
        const insertedCount = err.insertedDocs?.length || 0;
        imported += insertedCount;
        failed += (docs.length - insertedCount);
      }
    }
  }

  // Handle duplicates per the chosen strategy
  if (duplicateStrategy === 'skip' || duplicateStrategy === 'only_new') {
    skipped += duplicateRows.length;
  } else if (duplicateStrategy === 'update' || duplicateStrategy === 'replace') {
    const dupBatches = chunkArray(duplicateRows, BATCH_SIZE);
    for (const batch of dupBatches) {
      const bulkOps = [];
      for (const row of batch) {
        const filter = row.email ? { email: row.email.toLowerCase() } : { phone: row.phone };
        const stageId = row.stage ? stagesByName.get(String(row.stage).trim().toLowerCase()) : undefined;

        const updateDoc = {
          name: row.name,
          company: row.company,
          phone: row.phone,
          ...(row.projectValue ? { projectValue: Number(row.projectValue) } : {}),
          ...(row.notes ? { notes: row.notes } : {}),
          ...(stageId ? { currentStage: stageId } : {}),
          updatedAt: new Date(),
        };

        bulkOps.push({
          updateOne: {
            filter,
            update: { $set: updateDoc },
          },
        });
      }

      if (bulkOps.length > 0) {
        try {
          const result = await Client.bulkWrite(bulkOps, { ordered: false });
          updated += result.modifiedCount || 0;
        } catch (err) {
          failed += batch.length;
        }
      }
    }
  }

  return { imported, updated, skipped, failed };
}

module.exports = { analyzeLeadRows, bulkImportLeads, BATCH_SIZE };