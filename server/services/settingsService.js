const Settings = require('../models/Settings');

// Ensures exactly one Settings document always exists (singleton pattern)
async function getOrCreateSettings() {
  let settings = await Settings.findOne({ singleton: 'main' }).select('+email.smtpPassword');
  if (!settings) {
    settings = await Settings.create({ singleton: 'main' });
  }
  return settings;
}

async function getSettings({ includeSecrets = false } = {}) {
  const query = Settings.findOne({ singleton: 'main' });
  if (includeSecrets) query.select('+email.smtpPassword');
  let settings = await query;
  if (!settings) settings = await Settings.create({ singleton: 'main' });
  return settings;
}

async function updateSection(section, updates) {
  const settings = await getOrCreateSettings();
  if (!settings[section]) {
    const err = new Error(`Unknown settings section: ${section}`);
    err.statusCode = 400;
    throw err;
  }

  // Merge only known fields — never blindly overwrite the whole sub-document
  Object.keys(updates).forEach((key) => {
    if (key in settings[section].toObject()) {
      settings[section][key] = updates[key];
    }
  });

  await settings.save();
  return settings;
}

module.exports = { getSettings, updateSection, getOrCreateSettings };