const path = require('path');
const fs = require('fs');
const Stage = require('../models/Stage');
const User = require('../models/User');
const ImportLog = require('../models/ImportLog');
const { parseCSV, parseExcel, applyColumnMapping, toCSV } = require('../utils/importHelpers');
const { analyzeLeadRows, bulkImportLeads } = require('../services/importService');

const CRM_FIELDS = {
  leads: [
    { key: 'name', label: 'Lead Name', required: true },
    { key: 'company', label: 'Company', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'status', label: 'Status', required: false },
    { key: 'stage', label: 'Stage', required: false },
    { key: 'projectValue', label: 'Project Value', required: false },
    { key: 'notes', label: 'Notes', required: false },
  ],
};

// @desc    Upload and parse a CSV file, return raw preview data + detected columns
// @route   POST /api/import/csv
// @access  Private/Admin
const uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const rows = await parseCSV(req.file.path);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }

    const detectedColumns = Object.keys(rows[0]);

    res.status(200).json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: 'csv',
        tempFilePath: req.file.filename, // used later in /process
        detectedColumns,
        crmFields: CRM_FIELDS.leads,
        preview: rows.slice(0, 20),
        totalRows: rows.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to parse CSV file' });
  }
};

// @desc    Upload and parse an Excel file, return sheet names + preview
// @route   POST /api/import/excel
// @access  Private/Admin
const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { sheetNames, sheets } = parseExcel(req.file.path);
    const firstSheet = sheets[sheetNames[0]];

    if (!firstSheet || firstSheet.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file has no data' });
    }

    const detectedColumns = Object.keys(firstSheet[0]);

    res.status(200).json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: 'excel',
        tempFilePath: req.file.filename,
        sheetNames,
        activeSheet: sheetNames[0],
        detectedColumns,
        crmFields: CRM_FIELDS.leads,
        preview: firstSheet.slice(0, 20),
        totalRows: firstSheet.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to parse Excel file' });
  }
};

// @desc    Re-parse a specific sheet from a previously uploaded Excel file
// @route   POST /api/import/select-sheet
// @access  Private/Admin
const selectSheet = async (req, res) => {
  try {
    const { tempFilePath, sheetName } = req.body;
    const fullPath = path.join(__dirname, '..', 'temp-uploads', tempFilePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(400).json({ success: false, message: 'Uploaded file not found or expired. Please re-upload.' });
    }

    const { sheets } = parseExcel(fullPath);
    const rows = sheets[sheetName];

    if (!rows) {
      return res.status(400).json({ success: false, message: 'Sheet not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        activeSheet: sheetName,
        detectedColumns: Object.keys(rows[0] || {}),
        preview: rows.slice(0, 20),
        totalRows: rows.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to read sheet' });
  }
};

// @desc    Validate mapped columns and return a full preview breakdown
// @route   POST /api/import/preview
// @access  Private/Admin
const previewImport = async (req, res) => {
  try {
    const { tempFilePath, fileType, sheetName, columnMapping } = req.body;

    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      return res.status(400).json({ success: false, message: 'Column mapping is required' });
    }

    const fullPath = path.join(__dirname, '..', 'temp-uploads', tempFilePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(400).json({ success: false, message: 'Uploaded file not found or expired. Please re-upload.' });
    }

    let rawRows;
    if (fileType === 'csv') {
      rawRows = await parseCSV(fullPath);
    } else {
      const { sheets, sheetNames } = parseExcel(fullPath);
      rawRows = sheets[sheetName || sheetNames[0]];
    }

    const mappedRows = applyColumnMapping(rawRows, columnMapping);
    const analysis = await analyzeLeadRows(mappedRows);

    res.status(200).json({
      success: true,
      data: {
        totalRecords: analysis.totalRows,
        validRecords: analysis.validRows.length,
        invalidRecords: analysis.invalidCount,
        duplicateRecords: analysis.duplicateRows.length,
        newRecords: analysis.validRows.length,
        errorReport: analysis.errorReport,
        duplicatePreview: analysis.duplicateRows.slice(0, 10),
        validPreview: analysis.validRows.slice(0, 10),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to validate import data' });
  }
};

// @desc    Execute the final import: bulk insert/update with chosen duplicate strategy
// @route   POST /api/import/process
// @access  Private/Admin
const processImport = async (req, res) => {
  const startTime = Date.now();
  try {
    const { tempFilePath, fileType, sheetName, columnMapping, duplicateStrategy, module: importModule } = req.body;

    const fullPath = path.join(__dirname, '..', 'temp-uploads', tempFilePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(400).json({ success: false, message: 'Uploaded file not found or expired. Please re-upload.' });
    }

    let rawRows;
    if (fileType === 'csv') {
      rawRows = await parseCSV(fullPath);
    } else {
      const { sheets, sheetNames } = parseExcel(fullPath);
      rawRows = sheets[sheetName || sheetNames[0]];
    }

    const mappedRows = applyColumnMapping(rawRows, columnMapping);
    const analysis = await analyzeLeadRows(mappedRows);

    const stages = await Stage.find({ isActive: true }).select('name');
    const stagesByName = new Map(stages.map((s) => [s.name.toLowerCase(), s._id]));

    const strategy = duplicateStrategy || 'skip';
    const result = await bulkImportLeads({
      newRows: analysis.validRows,
      duplicateRows: strategy === 'only_new' ? [] : analysis.duplicateRows,
      duplicateStrategy: strategy,
      assignedUserId: req.user.id,
      stagesByName,
    });

    const durationMs = Date.now() - startTime;

    const log = await ImportLog.create({
      user: req.user.id,
      module: importModule || 'leads',
      fileName: req.body.fileName || 'unknown',
      fileSize: req.body.fileSize || 0,
      fileType,
      ipAddress: req.ip,
      totalRecords: analysis.totalRows,
      validRecords: analysis.validRows.length,
      invalidRecords: analysis.invalidCount,
      duplicateRecords: analysis.duplicateRows.length,
      importedRecords: result.imported,
      updatedRecords: result.updated,
      skippedRecords: result.skipped,
      failedRecords: result.failed,
      duplicateStrategy: strategy,
      status: 'completed',
      errorReport: analysis.errorReport,
      columnMapping,
      durationMs,
    });

    // Clean up the temp file now that import is done
    fs.unlink(fullPath, () => {});

    res.status(200).json({
      success: true,
      data: {
        importLogId: log._id,
        totalUploaded: analysis.totalRows,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        duplicate: analysis.duplicateRows.length,
        failed: result.failed,
        durationMs,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import processing failed' });
  }
};

// @desc    Get import history
// @route   GET /api/import/history
// @access  Private/Admin
const getImportHistory = async (req, res) => {
  try {
    const logs = await ImportLog.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to load import history' });
  }
};

// @desc    Download the error report for a specific import as CSV
// @route   GET /api/import/error-report/:id
// @access  Private/Admin
const downloadErrorReport = async (req, res) => {
  try {
    const log = await ImportLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Import log not found' });
    }

    const csvContent = toCSV(log.errorReport, ['row', 'column', 'value', 'reason', 'suggestedFix']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="error-report-${log._id}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate error report' });
  }
};

// @desc    Download a blank import template for a given module
// @route   GET /api/import/template/:module
// @access  Private/Admin
const downloadTemplate = async (req, res) => {
  const { module: moduleName } = req.params;
  const fields = CRM_FIELDS[moduleName];

  if (!fields) {
    return res.status(400).json({ success: false, message: 'Unknown module' });
  }

  const header = fields.map((f) => f.label).join(',');
  const exampleRow = fields.map((f) => (f.required ? `Sample ${f.label}` : '')).join(',');
  const csvContent = `${header}\n${exampleRow}`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${moduleName}-import-template.csv"`);
  res.status(200).send(csvContent);
};

module.exports = {
  uploadCSV,
  uploadExcel,
  selectSheet,
  previewImport,
  processImport,
  getImportHistory,
  downloadErrorReport,
  downloadTemplate,
};