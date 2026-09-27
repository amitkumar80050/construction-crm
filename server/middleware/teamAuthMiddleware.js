const User = require('../models/User');
const manageableRoles = ['telecaller', 'sales executer'];

const createCanManageUser = (UserModel) => async (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'manager') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(403).json({ success: false, message: 'Managers cannot edit their own team record here.' });
  }

  try {
    const targetUser = await UserModel.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (!manageableRoles.includes(targetUser.role)) {
      return res.status(403).json({ success: false, message: 'Managers can only edit telecallers and sales executives.' });
    }

    const managerTeamIds = (req.user.teamIds || []).map(String);
    const targetTeamIds = (targetUser.teamIds || []).map(String);
    const sharesTeam = targetTeamIds.some((id) => managerTeamIds.includes(id));
    if (!sharesTeam) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your own team.' });
    }

    req.targetUser = targetUser;
    return next();
  } catch (error) {
    console.error('Unable to verify team access:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify team access.' });
  }
};

module.exports = { canManageUser: createCanManageUser(User), createCanManageUser };