const path = require('path');
const fs = require('fs');
const importService = require('../services/importService');
const Activity = require('../models/Activity');
const ImportLog = require('../models/ImportLog');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'imports');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// @desc    Upload a CSV file, read its columns
// @route   POST /import/csv
// @access  Private/Admin
const uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { detectedColumns } = importService.readFile(req.file.path, 'csv');
    res.status(200).json({
      success: true,
      data: {
        tempFilePath: req.file.path,
        fileName: req.file.originalname,
        fileType: 'csv',
        detectedColumns,
        sheetNames: null,
        activeSheet: null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to read CSV file' });
  }
};

// @desc    Upload an Excel file, read sheets/columns
// @route   POST /import/excel
// @access  Private/Admin
const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { detectedColumns, sheetNames, activeSheet } = importService.readFile(req.file.path, 'excel');
    res.status(200).json({
      success: true,
      data: {
        tempFilePath: req.file.path,
        fileName: req.file.originalname,
        fileType: 'excel',
        detectedColumns,
        sheetNames,
        activeSheet,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to read Excel file' });
  }
};

// @desc    Get CRM field list for mapping UI
// @route   GET /import/template/leads  (also doubles as field list)
// @access  Private/Admin
const getCrmFields = async (req, res) => {
  res.status(200).json({ success: true, data: importService.CRM_FIELDS });
};

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadTemplate = (req, res) => {
  const headers = importService.CRM_FIELDS.map((field) => field.key);
  res.type('text/csv');
  res.attachment('leads-import-template.csv');
  res.send(`${headers.map(escapeCsvValue).join(',')}\r\n`);
};

const getHistory = async (req, res) => {
  try {
    const logs = await ImportLog.find({ user: req.user.id })
      .select('-errorReport')
      .populate('user', 'name userId')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error('Unable to load import history:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load import history' });
  }
};

const downloadErrorReport = async (req, res) => {
  try {
    const log = await ImportLog.findOne({ _id: req.params.id, user: req.user.id }).select('fileName errorReport');
    if (!log) return res.status(404).json({ success: false, message: 'Import report not found' });

    const columns = ['row', 'column', 'value', 'reason', 'suggestedFix'];
    const lines = [columns.map(escapeCsvValue).join(',')];
    for (const error of log.errorReport || []) {
      lines.push(columns.map((column) => escapeCsvValue(error[column])).join(','));
    }
    res.type('text/csv');
    res.attachment(`${path.parse(log.fileName).name}-errors.csv`);
    return res.send(`${lines.join('\r\n')}\r\n`);
  } catch (error) {
    console.error('Unable to download import report:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to download error report' });
  }
};

// @desc    Re-read a sheet (for Excel sheet switching)
// @route   POST /import/select-sheet
// @access  Private/Admin
const selectSheet = async (req, res) => {
  try {
    const { tempFilePath, sheetName } = req.body;
    const { detectedColumns, sheetNames, activeSheet } = importService.readFile(tempFilePath, 'excel', sheetName);
    res.status(200).json({ success: true, data: { detectedColumns, sheetNames, activeSheet, tempFilePath } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to read sheet' });
  }
};

// @desc    Validate + preview mapped data before import
// @route   POST /import/preview
// @access  Private/Admin
const preview = async (req, res) => {
  try {
    const { tempFilePath, fileType, sheetName, columnMapping } = req.body;
    if (!tempFilePath || !fileType || !columnMapping) {
      return res.status(400).json({ success: false, message: 'Missing required preview parameters' });
    }
    const result = await importService.buildPreview({ tempFilePath, fileType, sheetName, columnMapping });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to build preview' });
  }
};

// @desc    Run the actual import (bulk insert/update)
// @route   POST /import/process
// @access  Private/Admin
const process_ = async (req, res) => {
  let importLogData;
  try {
    const { tempFilePath, fileType, sheetName, columnMapping, duplicateStrategy, fileName } = req.body;
    let teamId = req.body.teamId || null;
    let assignedTo = req.user.id;
    if (!tempFilePath || !fileType || !columnMapping) {
      return res.status(400).json({ success: false, message: 'Missing required import parameters' });
    }

    if (req.user.role === 'manager') {
      const managerTeams = (req.user.teamIds || []).map(String);
      teamId = teamId || managerTeams[0] || null;
      if (!teamId || !managerTeams.includes(String(teamId))) {
        return res.status(403).json({ success: false, message: 'Choose one of your teams for this import.' });
      }
      assignedTo = null;
    } else if (req.user.role === 'admin') {
      assignedTo = null;
    } else if (req.user.role === 'telecaller') {
      const callerTeams = (req.user.teamIds || []).map(String);
      teamId = teamId || callerTeams[0] || null;
      if (teamId && !callerTeams.includes(String(teamId))) {
        return res.status(403).json({ success: false, message: 'You can only import leads into your own team.' });
      }
    }

    const fileSize = fs.statSync(tempFilePath).size;
    const startedAt = Date.now();

    const result = await importService.processImport({
      tempFilePath,
      fileType,
      sheetName,
      columnMapping,
      duplicateStrategy: duplicateStrategy || 'skip',
      userId: req.user.id,
      assignedTo,
      teamId,
    });

    importLogData = {
      user: req.user.id,
      module: 'leads',
      fileName: fileName || path.basename(tempFilePath),
      fileSize,
      fileType,
      ipAddress: req.ip,
      totalRecords: result.totalUploaded,
      validRecords: Math.max(0, result.totalUploaded - result.failed - result.duplicate),
      invalidRecords: result.failed,
      duplicateRecords: result.duplicate,
      importedRecords: result.imported,
      updatedRecords: result.updated,
      skippedRecords: result.skipped,
      failedRecords: result.failed,
      duplicateStrategy: duplicateStrategy || 'skip',
      status: 'completed',
      errorReport: result.errorReport,
      columnMapping,
      durationMs: Date.now() - startedAt,
    };
    const importLog = await ImportLog.create(importLogData);
    result.importLogId = importLog._id;

    await Activity.create({
      user: req.user.id,
      type: 'create',
      module: 'client',
      description: `Imported leads from "${fileName || 'file'}": ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    if (importLogData) {
      await ImportLog.create({ ...importLogData, status: 'failed' }).catch((logError) => {
        console.error('Unable to save failed import log:', logError.message);
      });
    }
    res.status(500).json({ success: false, message: 'Import failed' });
  }
};

module.exports = {
  uploadCSV,
  uploadExcel,
  getCrmFields,
  downloadTemplate,
  getHistory,
  downloadErrorReport,
  selectSheet,
  preview,
  process: process_,
};