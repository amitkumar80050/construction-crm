const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { validationResult } = require('express-validator');
const { sectionValidators } = require('../validations/settingsValidator');
const settingsController = require('../controllers/settingsController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

// All settings routes: admin only
router.use(protect, admin);

router.get('/', settingsController.getSettings);

router.put('/company', sectionValidators.company, validate, settingsController.updateCompany);
router.put('/theme', sectionValidators.theme, validate, settingsController.updateTheme);
router.put('/crm', sectionValidators.crm, validate, settingsController.updateCRM);
router.put('/notification', sectionValidators.notification, validate, settingsController.updateNotification);
router.put('/security', sectionValidators.security, validate, settingsController.updateSecurity);
router.put('/email', sectionValidators.email, validate, settingsController.updateEmail);
router.put('/system', sectionValidators.system, validate, settingsController.updateSystem);
router.put('/dashboard', sectionValidators.dashboard, validate, settingsController.updateDashboard);
router.put('/upload', sectionValidators.upload, validate, settingsController.updateUpload);
router.put('/backup', sectionValidators.backup, validate, settingsController.updateBackup);
router.put('/activity-log', sectionValidators['activity-log'], validate, settingsController.updateActivityLog);

router.post('/email/test', settingsController.testEmail);
router.post('/backup/manual', settingsController.manualBackup);
router.post('/backup/restore', settingsController.restoreBackup);

// Logo/favicon upload — reuses existing upload middleware
router.post('/company/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const settingsService = require('../services/settingsService');
  const settings = await settingsService.updateSection('company', { logo: `/uploads/${req.file.filename}` });
  res.status(200).json({ success: true, data: { logo: settings.company.logo } });
});

router.post('/company/favicon', upload.single('favicon'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const settingsService = require('../services/settingsService');
  const settings = await settingsService.updateSection('company', { favicon: `/uploads/${req.file.filename}` });
  res.status(200).json({ success: true, data: { favicon: settings.company.favicon } });
});

module.exports = router;