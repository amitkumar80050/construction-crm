const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { sendAttendanceDecisionEmail } = require('../services/notificationService');

const createAttendanceController = ({
  Attendance: AttendanceModel,
  User: UserModel,
  Activity: ActivityModel,
  notifyAttendanceDecision = async () => {},
}) => {
  const today = () => new Date().toISOString().slice(0, 10);

  const logActivity = async (user, description, req, targetId) => {
    try {
      await ActivityModel.create({
        user: user?._id || user?.id || user,
        userIdSnapshot: user?.userId,
        userNameSnapshot: user?.name,
        type: 'update',
        module: 'attendance',
        description,
        targetId: targetId || null,
        targetType: 'Attendance',
        ipAddress: req?.ip,
        userAgent: req?.get?.('user-agent') || req?.headers?.['user-agent'],
      });
    } catch (error) {
      console.error('Unable to log attendance activity:', error.message);
    }
  };

  const checkIn = async (req, res) => {
    const timestamp = new Date();
    try {
      const existing = await AttendanceModel.findOne({ user: req.user.id, date: today() });
      if (existing) {
        return res.status(409).json({ success: false, message: 'You have already checked in today.' });
      }
      const record = await AttendanceModel.create({
        user: req.user.id,
        date: today(),
        checkInTime: timestamp,
        markedAt: timestamp,
      });
      await logActivity(req.user, 'Checked in', req, record._id);
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'You have already checked in today.' });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: 'Unable to check in.' });
    }
  };

  const checkOut = async (req, res) => {
    try {
      const record = await AttendanceModel.findOne({ user: req.user.id, date: today() });
      if (!record || !(record.checkInTime || record.markedAt)) {
        return res.status(404).json({ success: false, message: 'Check in before checking out.' });
      }
      if (record.checkOutTime) {
        return res.status(409).json({ success: false, message: 'You have already checked out today.' });
      }
      if (record.status !== 'PENDING') {
        return res.status(409).json({ success: false, message: 'This attendance record has already been reviewed.' });
      }

      record.checkOutTime = new Date();
      await record.save();
      await logActivity(req.user, 'Checked out', req, record._id);
      return res.status(200).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Unable to check out.' });
    }
  };

  const getMyAttendance = async (req, res) => {
    try {
      const records = await AttendanceModel.find({ user: req.user.id }).sort({ date: -1 }).limit(30);
      return res.status(200).json({ success: true, data: records });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Unable to load attendance.' });
    }
  };

  const getPendingForTeam = async (req, res) => {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Manager or admin access required.' });
    }
    try {
      const scope = { _id: { $ne: req.user.id } };
      if (req.user.role !== 'admin') scope.teamIds = { $in: req.user.teamIds || [] };
      const teamUsers = await UserModel.find(scope).select('_id');
      const userIds = teamUsers.map((user) => user._id);
      const records = userIds.length
        ? await AttendanceModel.find({ user: { $in: userIds }, status: 'PENDING' })
          .populate('user', 'name userId department')
          .sort({ date: -1, checkInTime: -1 })
        : [];
      return res.status(200).json({ success: true, data: records });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Unable to load pending attendance.' });
    }
  };

  const reviewAttendance = async (req, res) => {
    const decision = req.body.decision;
    const remarks = String(req.body.managerRemarks ?? req.body.rejectionReason ?? req.body.reason ?? '').trim();
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be APPROVED or REJECTED.' });
    }
    try {
      const record = await AttendanceModel.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
      if (record.status !== 'PENDING') {
        return res.status(409).json({ success: false, message: 'This attendance record has already been reviewed.' });
      }

      const employee = await UserModel.findById(record.user).select('name userId department teamIds email');
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
      if (String(employee._id) === String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'You cannot review your own attendance.' });
      }
      if (req.user.role !== 'admin') {
        const managerTeamIds = (req.user.teamIds || []).map(String);
        const sharesTeam = (employee.teamIds || []).some((teamId) => managerTeamIds.includes(String(teamId)));
        if (!sharesTeam) {
          return res.status(403).json({ success: false, message: 'You can only review your own team\'s attendance.' });
        }
      }

      record.status = decision;
      record.managerId = req.user.id;
      record.managerRemarks = remarks;
      record.reviewedBy = req.user.id;
      record.reviewedAt = new Date();
      if (decision === 'REJECTED') record.rejectionReason = remarks;
      await record.save();
      await logActivity(req.user, `${decision === 'APPROVED' ? 'Approved' : 'Rejected'} attendance for ${employee.name}`, req, record._id);
      try {
        await notifyAttendanceDecision(employee, decision, remarks);
      } catch (error) {
        console.error('Unable to send attendance decision notification:', error.message);
      }
      return res.status(200).json({ success: true, data: record });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Unable to review attendance.' });
    }
  };

  const withDecision = (decision) => (req, res) => reviewAttendance({
    ...req,
    body: { ...req.body, decision },
  }, res);

  return {
    checkIn,
    checkOut,
    markAttendance: checkIn,
    getMyAttendance,
    getPendingForTeam,
    reviewAttendance,
    approveAttendance: withDecision('APPROVED'),
    rejectAttendance: withDecision('REJECTED'),
  };
};

module.exports = {
  ...createAttendanceController({
    Attendance,
    User,
    Activity,
    notifyAttendanceDecision: sendAttendanceDecisionEmail,
  }),
  createAttendanceController,
};