const settingsService = require('../services/settingsService');
const Activity = require('../models/Activity');
const notificationService = require('../services/notificationService');

// Map URL section slug -> schema key (URL uses kebab-case, schema uses camelCase)
const SECTION_MAP = {
  company: 'company',
  theme: 'theme',
  crm: 'crm',
  notification: 'notifications',
  security: 'security',
  email: 'email',
  system: 'system',
  dashboard: 'dashboard',
  upload: 'fileUpload',
  backup: 'backup',
  'activity-log': 'activityLog',
};

const getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSettings({ includeSecrets: false });
    res.set('Cache-Control', 'no-store'); // <-- this line
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

const updateSection = (urlSection) => async (req, res) => {
  const schemaKey = SECTION_MAP[urlSection];
  if (!schemaKey) {
    return res.status(400).json({ success: false, message: `Unknown settings section: ${urlSection}` });
  }

  try {
    const settings = await settingsService.updateSection(schemaKey, req.body);

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'settings',
      description: `Updated ${urlSection} settings`,
    });

    // Never leak the SMTP password back in the response
    const responseData = settings.toObject();
    if (responseData.email) delete responseData.email.smtpPassword;

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to update settings' });
  }
};

const testEmail = async (req, res) => {
  try {
    const { testRecipient } = req.body;
    if (!testRecipient) {
      return res.status(400).json({ success: false, message: 'testRecipient email is required' });
    }

    const settings = await settingsService.getSettings({ includeSecrets: true });
    if (!settings.email.smtpHost || !settings.email.smtpUsername) {
      return res.status(400).json({ success: false, message: 'SMTP settings are not configured yet' });
    }

    await notificationService.sendTestEmail(testRecipient, settings.email);
    res.status(200).json({ success: true, message: `Test email sent to ${testRecipient}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send test email' });
  }
};

// Backup/restore require real filesystem + mongodump/mongorestore access.
// Not implemented here — see note in the chat response for why.
const manualBackup = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Manual backup is not yet implemented. Requires a decision on storage target (local disk / S3 / Atlas API) before implementation.',
  });
};

const restoreBackup = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Restore is not yet implemented. Requires a decision on storage target before implementation.',
  });
};

module.exports = {
  getSettings,
  updateCompany: updateSection('company'),
  updateTheme: updateSection('theme'),
  updateCRM: updateSection('crm'),
  updateNotification: updateSection('notification'),
  updateSecurity: updateSection('security'),
  updateEmail: updateSection('email'),
  updateSystem: updateSection('system'),
  updateDashboard: updateSection('dashboard'),
  updateUpload: updateSection('upload'),
  updateBackup: updateSection('backup'),
  updateActivityLog: updateSection('activity-log'),
  testEmail,
  manualBackup,
  restoreBackup,
};