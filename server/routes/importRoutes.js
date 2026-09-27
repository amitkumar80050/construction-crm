const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const canImportLeads = (req, res, next) => {
  if (['admin', 'manager', 'telecaller'].includes(req.user.role)) return next();
  return res.status(403).json({ success: false, message: 'Only Admins, Managers, and Telecallers can import leads.' });
};
const upload = require('../middleware/uploadMiddleware');
const {
  uploadCSV,
  uploadExcel,
  getCrmFields,
  downloadTemplate,
  getHistory,
  downloadErrorReport,
  selectSheet,
  preview,
  process: processImport,
} = require('../controllers/importController');

router.post('/csv', protect, canImportLeads, upload.single('file'), uploadCSV);
router.post('/excel', protect, canImportLeads, upload.single('file'), uploadExcel);
router.get('/fields', protect, canImportLeads, getCrmFields);
router.get('/template/leads', protect, canImportLeads, downloadTemplate);
router.get('/history', protect, canImportLeads, getHistory);
router.get('/:id/errors', protect, canImportLeads, downloadErrorReport);
router.post('/select-sheet', protect, canImportLeads, selectSheet);
router.post('/preview', protect, canImportLeads, preview);
router.post('/process', protect, canImportLeads, processImport);

module.exports = router;