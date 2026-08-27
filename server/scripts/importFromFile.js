/**
 * CLI script to bulk-import leads directly from a local Excel/CSV file,
 * without going through the web upload UI.
 *
 * Usage:
 *   node server/scripts/importFromFile.js <path-to-file> [--mapping=path/to/mapping.json] [--strategy=skip|update|replace|only_new] [--assignedTo=<userEmail>]
 *
 * Examples:
 *   node server/scripts/importFromFile.js "C:\Users\amity\Desktop\leads.xlsx"
 *   node server/scripts/importFromFile.js "./data/leads.csv" --strategy=update --assignedTo=admin@example.com
 *   node server/scripts/importFromFile.js "./data/leads.xlsx" --mapping="./data/mapping.json"
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { parseCSV, parseExcel, applyColumnMapping } = require('../utils/importHelpers');
const { analyzeLeadRows, bulkImportLeads } = require('../services/importService');
const Stage = require('../models/Stage');
const User = require('../models/User');
const ImportLog = require('../models/ImportLog');

// CRM fields this script knows how to map to — keep in sync with
// CRM_FIELDS.leads in server/controllers/importController.js
const CRM_FIELD_KEYS = [
  'name', 'company', 'email', 'phone', 'status', 'stage',
  'projectValue', 'notes', 'assignedTo', 'remark', 'reminderTitle', 'reminderDate',
];

// Fallback auto-mapping: matches column headers to CRM fields by loose name matching.
// Used only when no --mapping file is provided.
const AUTO_MAP_ALIASES = {
  name: ['name', 'lead name', 'client name', 'customer name', 'full name'],
  company: ['company', 'company name', 'organization'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'],
  status: ['status', 'lead status'],
  stage: ['stage', 'current stage'],
  projectValue: ['project value', 'budget', 'value', 'deal value'],
  notes: ['notes', 'remark', 'remarks', 'comment', 'comments'],
  assignedTo: ['assigned to', 'assigned user', 'assigned employee', 'owner'],
  remark: ['latest remark', 'remark', 'remarks'],
  reminderTitle: ['reminder title', 'reminder'],
  reminderDate: ['reminder date', 'reminder due date', 'due date'],
};

function parseArgs(argv) {
  const args = { file: null, mapping: null, strategy: 'skip', assignedTo: null };
  argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--mapping=')) args.mapping = arg.split('=')[1];
    else if (arg.startsWith('--strategy=')) args.strategy = arg.split('=')[1];
    else if (arg.startsWith('--assignedTo=')) args.assignedTo = arg.split('=')[1];
    else if (!arg.startsWith('--')) args.file = arg;
  });
  return args;
}

function buildAutoMapping(detectedColumns) {
  const mapping = {};
  detectedColumns.forEach((col) => {
    const normalized = col.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(AUTO_MAP_ALIASES)) {
      if (aliases.includes(normalized)) {
        mapping[col] = field;
        break;
      }
    }
  });
  return mapping;
}

async function resolveAssignedUser(identifier) {
  if (!identifier) {
    // Fall back to the first admin found — every import needs an assignedTo
    const admin = await User.findOne({ role: 'admin', isActive: true });
    if (!admin) throw new Error('No --assignedTo provided and no admin user found to fall back to.');
    return admin._id;
  }
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { name: identifier }],
  });
  if (!user) throw new Error(`--assignedTo user not found: ${identifier}`);
  return user._id;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.file) {
    console.error('Usage: node server/scripts/importFromFile.js <path-to-file> [--mapping=path.json] [--strategy=skip|update|replace|only_new] [--assignedTo=email]');
    process.exit(1);
  }

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isExcel = ext === '.xlsx' || ext === '.xls';
  const isCSV = ext === '.csv';

  if (!isExcel && !isCSV) {
    console.error(`Unsupported file type: ${ext}. Use .csv, .xls, or .xlsx`);
    process.exit(1);
  }

  console.log(`\n📂 Reading file: ${filePath}`);

  // --- Connect to MongoDB ---
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env — cannot connect to database.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  try {
    // --- Parse file ---
    let rawRows;
    if (isCSV) {
      rawRows = await parseCSV(filePath);
    } else {
      const { sheetNames, sheets } = parseExcel(filePath);
      const firstSheet = sheets[sheetNames[0]];
      console.log(`📄 Using sheet: "${sheetNames[0]}" (${sheetNames.length} sheet(s) found)`);
      rawRows = firstSheet;
    }

    if (!rawRows || rawRows.length === 0) {
      console.error('File is empty or has no data rows.');
      process.exit(1);
    }

    console.log(`📊 Found ${rawRows.length} rows, ${Object.keys(rawRows[0]).length} columns`);

    // --- Determine column mapping ---
    let mapping;
    if (args.mapping) {
      const mappingPath = path.resolve(args.mapping);
      if (!fs.existsSync(mappingPath)) {
        console.error(`Mapping file not found: ${mappingPath}`);
        process.exit(1);
      }
      mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
      console.log(`🗺️  Using provided mapping file: ${mappingPath}`);
    } else {
      const detectedColumns = Object.keys(rawRows[0]);
      mapping = buildAutoMapping(detectedColumns);
      console.log('🗺️  Auto-mapped columns:', mapping);

      const unmapped = detectedColumns.filter((c) => !mapping[c]);
      if (unmapped.length > 0) {
        console.log(`⚠️  Unmapped columns (ignored): ${unmapped.join(', ')}`);
      }

      const mappedFields = new Set(Object.values(mapping));
      const missingRequired = ['name', 'phone', 'company', 'email'].filter((f) => !mappedFields.has(f));
      if (missingRequired.length > 0) {
        console.error(`\n❌ Auto-mapping could not find columns for required fields: ${missingRequired.join(', ')}`);
        console.error('   Provide an explicit --mapping=path/to/mapping.json file instead. Example:');
        console.error(JSON.stringify(
          Object.fromEntries(detectedColumns.map((c) => [c, '<crm_field_key_or_null>'])),
          null, 2
        ));
        console.error(`\nValid CRM field keys: ${CRM_FIELD_KEYS.join(', ')}`);
        process.exit(1);
      }
    }

    // --- Apply mapping ---
    const mappedRows = applyColumnMapping(rawRows, mapping);

    // --- Validate + detect duplicates ---
    console.log('\n🔍 Validating rows and checking for duplicates...');
    const analysis = await analyzeLeadRows(mappedRows);

    console.log(`\n--- Analysis ---`);
    console.log(`Total rows:        ${analysis.totalRows}`);
    console.log(`Valid (new):       ${analysis.validRows.length}`);
    console.log(`Duplicates:        ${analysis.duplicateRows.length}`);
    console.log(`Invalid rows:      ${analysis.invalidCount}`);

    if (analysis.errorReport.length > 0) {
      console.log(`\n⚠️  Validation errors (first 20 shown):`);
      analysis.errorReport.slice(0, 20).forEach((e) => {
        console.log(`  Row ${e.row} [${e.column}]: ${e.reason}`);
      });
      if (analysis.errorReport.length > 20) {
        console.log(`  ...and ${analysis.errorReport.length - 20} more`);
      }
    }

    if (analysis.validRows.length === 0 && analysis.duplicateRows.length === 0) {
      console.log('\nNothing to import — no valid or duplicate rows found. Exiting.');
      return;
    }

    // --- Resolve assigned user + stages ---
    const assignedUserId = await resolveAssignedUser(args.assignedTo);
    const stages = await Stage.find({ isActive: true }).select('name');
    const stagesByName = new Map(stages.map((s) => [s.name.toLowerCase(), s._id]));

    // --- Import ---
    console.log(`\n🚀 Importing with duplicate strategy: "${args.strategy}"...`);
    const startTime = Date.now();

    const result = await bulkImportLeads({
      newRows: analysis.validRows,
      duplicateRows: args.strategy === 'only_new' ? [] : analysis.duplicateRows,
      duplicateStrategy: args.strategy,
      assignedUserId,
      stagesByName,
    });

    const durationMs = Date.now() - startTime;

    // --- Log the import ---
    await ImportLog.create({
      user: assignedUserId,
      module: 'leads',
      fileName: path.basename(filePath),
      fileSize: fs.statSync(filePath).size,
      fileType: isExcel ? 'excel' : 'csv',
      ipAddress: 'local-cli',
      totalRecords: analysis.totalRows,
      validRecords: analysis.validRows.length,
      invalidRecords: analysis.invalidCount,
      duplicateRecords: analysis.duplicateRows.length,
      importedRecords: result.imported,
      updatedRecords: result.updated,
      skippedRecords: result.skipped,
      failedRecords: result.failed,
      duplicateStrategy: args.strategy,
      status: 'completed',
      errorReport: analysis.errorReport,
      columnMapping: mapping,
      durationMs,
    });

    console.log(`\n--- Import Complete (${durationMs}ms) ---`);
    console.log(`✅ Imported:  ${result.imported}`);
    console.log(`🔄 Updated:   ${result.updated}`);
    console.log(`⏭️  Skipped:   ${result.skipped}`);
    console.log(`❌ Failed:    ${result.failed}`);
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main();