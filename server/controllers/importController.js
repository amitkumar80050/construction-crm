const path = require('path');
const fs = require('fs');
const importService = require('../services/importService');
const Activity = require('../models/Activity');

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
  try {
    const { tempFilePath, fileType, sheetName, columnMapping, duplicateStrategy, fileName } = req.body;
    if (!tempFilePath || !fileType || !columnMapping) {
      return res.status(400).json({ success: false, message: 'Missing required import parameters' });
    }

    const result = await importService.processImport({
      tempFilePath,
      fileType,
      sheetName,
      columnMapping,
      duplicateStrategy: duplicateStrategy || 'skip',
      userId: req.user.id,
    });

    await Activity.create({
      user: req.user.id,
      type: 'create',
      module: 'client',
      description: `Imported leads from "${fileName || 'file'}": ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Import failed' });
  }
};

module.exports = {
  uploadCSV,
  uploadExcel,
  getCrmFields,
  selectSheet,
  preview,
  process: process_,
};