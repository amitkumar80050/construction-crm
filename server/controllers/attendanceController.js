const Attendance = require('../models/Attendance');
const Team = require('../models/Team');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { createInAppNotification } = require('./notificationController');

// Helper to get local date string YYYY-MM-DD
const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// @desc    Check in attendance
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
  try {
    const today = getTodayDateString();

    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today.',
        data: existingAttendance,
      });
    }

    const { userNotes } = req.body;

    const attendance = await Attendance.create({
      user: req.user._id,
      date: today,
      checkInTime: new Date(),
      status: 'PENDING',
      userNotes: userNotes || '',
    });

    await Activity.create({
      user: req.user._id,
      type: 'create',
      module: 'attendance',
      description: `${req.user.name} checked in for attendance.`,
    });

    res.status(201).json({
      success: true,
      message: 'Check-in successful! Attendance is pending approval.',
      data: attendance,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record check-in',
      error: error.message,
    });
  }
};

// @desc    Check out attendance
// @route   POST /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
  try {
    const today = getTodayDateString();

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in record found for today.',
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out today.',
        data: attendance,
      });
    }

    const checkOutTime = new Date();
    const diffMs = checkOutTime - new Date(attendance.checkInTime);
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // rounded to 2 decimals

    attendance.checkOutTime = checkOutTime;
    attendance.hoursWorked = hoursWorked;
    await attendance.save();

    await Activity.create({
      user: req.user._id,
      type: 'update',
      module: 'attendance',
      description: `${req.user.name} checked out (Worked ${hoursWorked} hrs).`,
    });

    res.status(200).json({
      success: true,
      message: 'Check-out recorded successfully.',
      data: attendance,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record check-out',
      error: error.message,
    });
  }
};

// @desc    Get user's personal attendance history & today's status
// @route   GET /api/attendance/my
// @access  Private
const getMyAttendance = async (req, res) => {
  try {
    const today = getTodayDateString();
    const todayRecord = await Attendance.findOne({
      user: req.user._id,
      date: today,
    });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;

    const total = await Attendance.countDocuments({ user: req.user._id });
    const records = await Attendance.find({ user: req.user._id })
      .populate('manager', 'name email')
      .sort({ date: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      today: todayRecord || null,
      count: records.length,
      total,
      data: records,
    });
  } catch (error) {
    console.error('getMyAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance history',
    });
  }
};

// @desc    Get pending attendance records for manager's team or admin
// @route   GET /api/attendance/pending
// @access  Private (Manager / Admin)
const getPendingAttendance = async (req, res) => {
  try {
    let query = { status: 'PENDING' };

    if (req.user.role !== 'admin') {
      // Find teams led by this manager
      const managedTeams = await Team.find({ teamLead: req.user._id }).select('_id');
      const teamIds = managedTeams.map((t) => t._id);

      // Find users in these teams
      const teamUsers = await User.find({ teamIds: { $in: teamIds } }).select('_id');
      const userIds = teamUsers.map((u) => u._id);

      query.user = { $in: userIds };
    }

    const pending = await Attendance.find(query)
      .populate('user', 'name email role department')
      .sort({ checkInTime: -1 });

    res.status(200).json({
      success: true,
      count: pending.length,
      data: pending,
    });
  } catch (error) {
    console.error('getPendingAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving pending attendance',
    });
  }
};

// @desc    Approve attendance
// @route   PUT /api/attendance/:id/approve
// @access  Private (Manager / Admin)
const approveAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate('user', 'name email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    attendance.status = 'APPROVED';
    attendance.manager = req.user._id;
    if (req.body.remarks) {
      attendance.managerRemarks = req.body.remarks;
    }
    await attendance.save();

    await Activity.create({
      user: req.user._id,
      type: 'update',
      module: 'attendance',
      description: `Approved attendance for ${attendance.user?.name} on ${attendance.date}`,
    });

    await createInAppNotification({
      recipient: attendance.user._id,
      type: 'attendance_approved',
      title: 'Attendance Approved',
      message: `Your attendance for ${attendance.date} has been approved by ${req.user.name}.`,
      link: '/attendance',
      sender: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Attendance approved successfully',
      data: attendance,
    });
  } catch (error) {
    console.error('approveAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving attendance',
    });
  }
};

// @desc    Reject attendance
// @route   PUT /api/attendance/:id/reject
// @access  Private (Manager / Admin)
const rejectAttendance = async (req, res) => {
  try {
    const { remarks } = req.body;
    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejecting attendance',
      });
    }

    const attendance = await Attendance.findById(req.params.id).populate('user', 'name email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    attendance.status = 'REJECTED';
    attendance.manager = req.user._id;
    attendance.managerRemarks = remarks;
    await attendance.save();

    await Activity.create({
      user: req.user._id,
      type: 'update',
      module: 'attendance',
      description: `Rejected attendance for ${attendance.user?.name} on ${attendance.date}. Reason: ${remarks}`,
    });

    await createInAppNotification({
      recipient: attendance.user._id,
      type: 'attendance_rejected',
      title: 'Attendance Rejected',
      message: `Your attendance for ${attendance.date} was rejected. Reason: ${remarks}`,
      link: '/attendance',
      sender: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Attendance rejected',
      data: attendance,
    });
  } catch (error) {
    console.error('rejectAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting attendance',
    });
  }
};

// @desc    Get team attendance summary
// @route   GET /api/attendance/team
// @access  Private (Manager / Admin)
const getTeamAttendance = async (req, res) => {
  try {
    let query = {};
    if (req.query.date) {
      query.date = req.query.date;
    }

    if (req.user.role !== 'admin') {
      const managedTeams = await Team.find({ teamLead: req.user._id }).select('_id');
      const teamIds = managedTeams.map((t) => t._id);
      const teamUsers = await User.find({ teamIds: { $in: teamIds } }).select('_id');
      query.user = { $in: teamUsers.map((u) => u._id) };
    }

    const records = await Attendance.find(query)
      .populate('user', 'name email role department')
      .populate('manager', 'name email')
      .sort({ date: -1, checkInTime: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error('getTeamAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving team attendance',
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getPendingAttendance,
  approveAttendance,
  rejectAttendance,
  getTeamAttendance,
};
