const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload, cleanupTempFile } = require('../middleware/uploadMiddleware');
const {
  uploadCSV,
  uploadExcel,
  selectSheet,
  previewImport,
  processImport,
  getImportHistory,
  downloadErrorReport,
  downloadTemplate,
} = require('../controllers/importController');

// Rate limit: max 10 import operations per 15 minutes per user/IP
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many import requests. Please try again later.' },
});

// All import routes require admin access
router.post('/csv', protect, admin, importLimiter, upload.single('file'), cleanupTempFile, uploadCSV);
router.post('/excel', protect, admin, importLimiter, upload.single('file'), cleanupTempFile, uploadExcel);
router.post('/select-sheet', protect, admin, selectSheet);
router.post('/preview', protect, admin, previewImport);
router.post('/process', protect, admin, importLimiter, processImport);
router.get('/history', protect, admin, getImportHistory);
router.get('/error-report/:id', protect, admin, downloadErrorReport);
router.get('/template/:module', protect, admin, downloadTemplate);

module.exports = router;