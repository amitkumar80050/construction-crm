const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  uploadCSV,
  uploadExcel,
  getCrmFields,
  selectSheet,
  preview,
  process: processImport,
} = require('../controllers/importController');

router.post('/csv', protect, admin, upload.single('file'), uploadCSV);
router.post('/excel', protect, admin, upload.single('file'), uploadExcel);
router.get('/fields', protect, admin, getCrmFields);
router.post('/select-sheet', protect, admin, selectSheet);
router.post('/preview', protect, admin, preview);
router.post('/process', protect, admin, processImport);

module.exports = router;