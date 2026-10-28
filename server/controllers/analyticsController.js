const Lead = require('../models/Lead');
const Remark = require('../models/Remark');
const Stage = require('../models/Stage');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res) => {
  try {
    // Get leadstatistics
    const totalLeads = await Lead.countDocuments();
    const leads = await Lead.countDocuments({ status: 'lead' });
    const active = await Lead.countDocuments({ status: 'active' });
    const closed = await Lead.countDocuments({ status: 'closed' });
    const lost = await Lead.countDocuments({ status: 'lost' });

    // Get stage distribution
    const stageDistribution = await Lead.aggregate([
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
      { $lookup: { from: 'stages', localField: '_id', foreignField: '_id', as: 'stage' } },
      { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
      { $project: { stageName: '$stage.name', count: 1 } },
    ]);

    // Get recent activity
    const recentRemarks = await Remark.find()
      .populate('user', 'name')
      .populate('Lead', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get upcoming reminders
    const upcomingReminders = await Reminder.find({
      user: req.user.id,
      status: 'pending',
      dueDate: { $gte: new Date() },
    })
      .populate('Lead', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    // Get performance metrics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get monthly new Leads
    const monthlyNewLeads = await Lead.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        Leadstats: {
          total: totalLeads,
          leads,
          active,
          closed,
          lost,
          conversionRate: totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(2) : 0,
        },
        stageDistribution,
        recentActivity: recentRemarks,
        upcomingReminders,
        userStats: {
          total: totalUsers,
          active: activeUsers,
        },
        monthlyNewLeads,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get user performance analytics
// @route   GET /api/analytics/performance
// @access  Private
const getUserPerformance = async (req, res) => {
  try {
    let userFilter = { isActive: true, isDeleted: { $ne: true } };

    if (req.user.role === 'admin') {
      // Admin sees all active users
    } else if (req.user.role === 'manager') {
      // Manager sees members of their team(s) plus themselves
      const managerTeamIds = req.user.teamIds || [];
      const teamUsers = await User.find({
        $or: [
          { teamIds: { $in: managerTeamIds } },
          { _id: req.user._id }
        ],
        isActive: true,
        isDeleted: { $ne: true },
      }).select('_id');
      userFilter._id = { $in: teamUsers.map((u) => u._id) };
    } else {
      // Telecaller / sales executer sees their own performance
      userFilter._id = req.user._id;
    }

    const users = await User.find(userFilter).select('name email role');

    const performanceData = await Promise.all(
      users.map(async (user) => {
        const LeadsAssigned = await Lead.countDocuments({ assignedTo: user._id });
        const leadsConverted = await Lead.countDocuments({
          assignedTo: user._id,
          status: 'closed',
        });
        const remarks = await Remark.countDocuments({ user: user._id });
        const completedReminders = await Reminder.countDocuments({
          user: user._id,
          status: 'completed',
        });

        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          LeadsAssigned,
          leadsConverted,
          conversionRate: LeadsAssigned > 0 ? ((leadsConverted / LeadsAssigned) * 100).toFixed(2) : 0,
          remarks,
          completedReminders,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get reminder analytics
// @route   GET /api/analytics/reminders
// @access  Private
const getReminderAnalytics = async (req, res) => {
  try {
    const total = await Reminder.countDocuments({ user: req.user.id });
    const completed = await Reminder.countDocuments({
      user: req.user.id,
      status: 'completed',
    });
    const pending = await Reminder.countDocuments({
      user: req.user.id,
      status: 'pending',
    });
    const overdue = await Reminder.countDocuments({
      user: req.user.id,
      status: 'overdue',
    });

    const priorityDistribution = await Reminder.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const monthlyTrend = await Reminder.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        completed,
        pending,
        overdue,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
        priorityDistribution,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getUserPerformance,
  getReminderAnalytics,
};