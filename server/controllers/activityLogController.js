const Activity = require('../models/Activity');
const User = require('../models/User');

function buildFilters(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to + 'T23:59:59');
  }
  if (query.module) filter.module = query.module;
  if (query.action || query.type) filter.type = query.action || query.type;
  if (query.search) filter.description = { $regex: query.search, $options: 'i' };
  return filter;
}

function paginate(query) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  return { page, limit, skip: (page - 1) * limit };
}

// @desc  Employee's own logs — identity taken from JWT, never from request params
// @route GET /api/logs/my
// @access Private
const getMyLogs = async (req, res) => {
  try {
    const filter = { user: req.user.id, ...buildFilters(req.query) };
    const { page, limit, skip } = paginate(req.query);

    const [data, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Activity.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load activity logs.' });
  }
};

// @desc  Manager: list team members with activity counts
// @route GET /api/manager/logs/employees
// @access Private/Manager
const getManagedEmployees = async (req, res) => {
  try {
    // Your User model doesn't currently have a manager/team relation.
    // Until that exists, "managed employees" defaults to all non-admin users
    // in the same department as the manager — adjust once you add a real
    // teamId/managerId field to User.
    const filter = { role: { $ne: 'admin' }, isDeleted: { $ne: true } };
    if (req.user.role === 'manager') {
      filter.department = req.user.department;
    }

    const employees = await User.find(filter).select('userId name department role').lean();

    const counts = await Activity.aggregate([
      { $match: { user: { $in: employees.map((e) => e._id) } } },
      { $group: { _id: '$user', total: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.total]));

    const result = employees.map((e) => ({
      ...e,
      totalActivities: countMap.get(e._id.toString()) || 0,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load employees.' });
  }
};

// @desc  Manager: one employee's logs (with authorization check)
// @route GET /api/manager/logs/:userId
// @access Private/Manager
const getEmployeeLogs = async (req, res) => {
  try {
    const targetUser = await User.findOne({ userId: req.params.userId });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Authorization: manager can only view same-department employees
    if (req.user.role === 'manager' && targetUser.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view these logs.' });
    }

    const filter = { user: targetUser._id, ...buildFilters(req.query) };
    const { page, limit, skip } = paginate(req.query);

    const [data, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Activity.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      employee: { userId: targetUser.userId, name: targetUser.name, department: targetUser.department, role: targetUser.role },
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load activity logs.' });
  }
};

// @desc  Admin: all logs, org-wide
// @route GET /api/admin/logs
// @access Private/Admin
const getAllLogs = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    if (req.query.userId) {
      const targetUser = await User.findOne({ userId: req.query.userId });
      if (!targetUser) return res.status(404).json({ success: false, message: 'Employee not found.' });
      filter.user = targetUser._id;
    }

    const { page, limit, skip } = paginate(req.query);
    const [data, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Activity.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Unable to load activity logs.' });
  }
};

module.exports = { getMyLogs, getManagedEmployees, getEmployeeLogs, getAllLogs };