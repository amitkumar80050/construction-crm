const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const exportRateLimiter = require('../middleware/exportRateLimiter');
const { exportRequestValidator, templateValidator } = require('../validations/exportValidator');
const { validationResult } = require('express-validator');
const exportController = require('../controllers/exportController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

router.get('/modules', protect, exportController.getModules);
router.post('/preview', protect, exportRequestValidator, validate, exportController.previewExport);

router.post('/csv', protect, exportRateLimiter, exportRequestValidator, validate, exportController.exportCSV);
router.post('/excel', protect, exportRateLimiter, exportRequestValidator, validate, exportController.exportExcel);
router.post('/pdf', protect, exportRateLimiter, exportRequestValidator, validate, exportController.exportPDF);

router.get('/history', protect, exportController.getHistory);

router.get('/templates', protect, exportController.getTemplates);
router.post('/templates', protect, admin, templateValidator, validate, exportController.createTemplate);
router.put('/templates/:id', protect, admin, exportController.updateTemplate);
router.delete('/templates/:id', protect, admin, exportController.deleteTemplate);

module.exports = router;