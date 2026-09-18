const Activity = require('../models/Activity');

async function logActivity({ req, user, type, module, description, targetId, targetType, client }) {
  try {
    await Activity.create({
      user: user._id,
      userIdSnapshot: user.userId,
      userNameSnapshot: user.name,
      type,
      module,
      description,
      targetId: targetId || null,
      targetType: targetType || null,
      client: client || undefined,
      ipAddress: req?.ip,
    });
  } catch (error) {
    console.error('Activity log error (non-fatal):', error.message);
    // Never throw — logging failure must not break the actual business operation
  }
}

module.exports = { logActivity };