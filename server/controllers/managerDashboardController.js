const User = require('../models/User');
const Team = require('../models/Team');
const Client = require('../models/Client');
const Stage = require('../models/Stage');
const Remark = require('../models/Remark');
const SiteVisit = require('../models/SiteVisit');
const Attendance = require('../models/Attendance');

// Helper to get local date string YYYY-MM-DD
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// @desc    Get aggregated metrics and KPIs for manager's team
// @route   GET /api/manager/dashboard
// @access  Private (Manager / Admin)
const getManagerDashboard = async (req, res) => {
  try {
    let teamMemberIds = [];
    let managedTeams = [];

    if (req.user.role === 'admin') {
      const allMembers = await User.find({ isActive: true }).select('_id');
      teamMemberIds = allMembers.map((u) => u._id);
      managedTeams = await Team.find({ status: 'ACTIVE' }).select('name code');
    } else {
      managedTeams = await Team.find({ teamLead: req.user._id }).select('_id name code');
      const teamIds = managedTeams.map((t) => t._id);
      const members = await User.find({ teamIds: { $in: teamIds }, isActive: true }).select('_id');
      teamMemberIds = members.map((m) => m._id);
    }

    const today = getTodayDateString();

    // 1. Total Leads assigned to team
    const totalLeads = await Client.countDocuments({
      $or: [{ assignedTo: { $in: teamMemberIds } }, { team: { $in: managedTeams.map((t) => t._id) } }],
    });

    // 2. Leads by Stage (Funnel)
    const stages = await Stage.find({ isActive: true }).sort({ order: 1 });
    const stageFunnel = await Promise.all(
      stages.map(async (stage) => {
        const count = await Client.countDocuments({
          currentStage: stage._id,
          $or: [{ assignedTo: { $in: teamMemberIds } }, { team: { $in: managedTeams.map((t) => t._id) } }],
        });
        return {
          id: stage._id,
          name: stage.name,
          color: stage.color,
          order: stage.order,
          count,
        };
      })
    );

    // 3. Site visits stats
    const visitsScheduled = await SiteVisit.countDocuments({
      assignedTo: { $in: teamMemberIds },
      status: 'PLANNED',
    });
    const visitsDone = await SiteVisit.countDocuments({
      assignedTo: { $in: teamMemberIds },
      status: 'DONE',
    });
    const visitsNotDone = await SiteVisit.countDocuments({
      assignedTo: { $in: teamMemberIds },
      status: 'NOT_DONE',
    });

    // 4. Attendance today
    const attendanceToday = await Attendance.find({
      user: { $in: teamMemberIds },
      date: today,
    });
    const pendingAttendanceCount = await Attendance.countDocuments({
      user: { $in: teamMemberIds },
      status: 'PENDING',
    });

    // 5. Calls / Remarks logged today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const remarksTodayCount = await Remark.countDocuments({
      user: { $in: teamMemberIds },
      createdAt: { $gte: startOfToday },
    });

    // 6. Active team members list
    const teamMembers = await User.find({ _id: { $in: teamMemberIds } })
      .select('name email role department')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        stageFunnel,
        siteVisits: {
          scheduled: visitsScheduled,
          completed: visitsDone,
          notDone: visitsNotDone,
          total: visitsScheduled + visitsDone + visitsNotDone,
        },
        attendance: {
          presentToday: attendanceToday.length,
          pendingApprovals: pendingAttendanceCount,
          totalMembers: teamMemberIds.length,
        },
        activity: {
          callsToday: remarksTodayCount,
        },
        teamMembers,
        managedTeams,
      },
    });
  } catch (error) {
    console.error('getManagerDashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve manager dashboard metrics',
      error: error.message,
    });
  }
};

module.exports = {
  getManagerDashboard,
};
