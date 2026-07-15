const { body } = require('express-validator');

// Loose validation per-section — types are enforced at the Mongoose layer too,
// this catches obviously bad input early with clear messages.
const sectionValidators = {
  company: [
    body('email').optional().isEmail().withMessage('Invalid company email'),
    body('website').optional().isURL().withMessage('Invalid website URL'),
    body('pincode').optional().isPostalCode('any').withMessage('Invalid pincode'),
  ],
  theme: [
    body('mode').optional().isIn(['light', 'dark']),
    body('buttonStyle').optional().isIn(['rounded', 'square', 'pill']),
    body('layoutWidth').optional().isIn(['fluid', 'boxed']),
  ],
  crm: [
    body('defaultReminderTimeMinutes').optional().isInt({ min: 0 }),
    body('defaultFollowupDays').optional().isInt({ min: 0 }),
    body('leadSources').optional().isArray(),
    body('leadStages').optional().isArray(),
  ],
  notification: [
    body('emailNotification').optional().isBoolean(),
    body('smsNotification').optional().isBoolean(),
  ],
  security: [
    body('passwordMinLength').optional().isInt({ min: 4, max: 64 }),
    body('sessionTimeoutMinutes').optional().isInt({ min: 1 }),
    body('maxLoginAttempts').optional().isInt({ min: 1 }),
  ],
  email: [
    body('smtpPort').optional().isInt({ min: 1, max: 65535 }),
    body('senderEmail').optional().isEmail(),
    body('encryptionType').optional().isIn(['none', 'tls', 'ssl']),
  ],
  system: [
    body('maintenanceMode').optional().isBoolean(),
  ],
  dashboard: [
    body('refreshTimeSeconds').optional().isInt({ min: 0 }),
  ],
  upload: [
    body('maxUploadSizeMB').optional().isInt({ min: 1, max: 100 }),
  ],
  backup: [
    body('backupSchedule').optional().isIn(['daily', 'weekly', 'monthly']),
  ],
  'activity-log': [
    body('retentionDays').optional().isInt({ min: 1 }),
  ],
};

module.exports = { sectionValidators };