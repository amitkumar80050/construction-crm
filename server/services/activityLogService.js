const Activity = require('../models/Activity');

async function logActivity({ req, user, type, module, description, targetId, targetType, client, metadata }) {
  try {
    const actorId = user?._id || user?.id || user;
    await Activity.create({
      user: actorId,
      userIdSnapshot: user?.userId,
      userNameSnapshot: user?.name,
      type,
      module,
      description,
      targetId: targetId || null,
      targetType: targetType || null,
      client: client || undefined,
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent') || req?.headers?.['user-agent'],
      metadata,
    });
  } catch (error) {
    console.error('Activity log error (non-fatal):', error.message);
    // Never throw — logging failure must not break the actual business operation
  }
}

module.exports = { logActivity };