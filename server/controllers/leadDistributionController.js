const Lead = require('../models/Lead');
const User = require('../models/User');
const Team = require('../models/Team');
const Activity = require('../models/Activity');

// @desc    Distribute leads round-robin among team members
// @route   POST /api/leads/distribute
// @access  Private (Manager / Admin)
const distributeLeads = async (req, res) => {
  try {
    const { LeadIds, userIds, teamId, roleFilter } = req.body;

    // 1. Resolve target users
    let targetUsers = [];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds }, isActive: true }).select('name email role');
    } else {
      let teamQuery = { isActive: true };
      if (teamId) {
        teamQuery.teamIds = teamId;
      } else if (req.user.role === 'manager') {
        const managedTeams = await Team.find({ teamLead: req.user._id }).select('_id');
        const mTeamIds = managedTeams.map((t) => t._id);
        if (mTeamIds.length > 0) {
          teamQuery.teamIds = { $in: mTeamIds };
        } else if (req.user.teamIds && req.user.teamIds.length > 0) {
          teamQuery.teamIds = { $in: req.user.teamIds };
        }
      }

      if (roleFilter) {
        teamQuery.role = roleFilter;
      } else {
        teamQuery.role = { $in: ['telecaller', 'sales executer', 'user'] };
      }

      targetUsers = await User.find(teamQuery).select('name email role');

      // Resilient fallback: If no users found with team restriction, search organization-wide by roleFilter
      if (targetUsers.length === 0 && roleFilter) {
        targetUsers = await User.find({ role: roleFilter, isActive: true }).select('name email role');
      }
      if (targetUsers.length === 0) {
        targetUsers = await User.find({ role: { $in: ['telecaller', 'sales executer', 'user'] }, isActive: true }).select('name email role');
      }
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible team members found to distribute leads to. Please add team members first.',
      });
    }

    // 2. Resolve leads to distribute
    let leadsToDistribute = [];
    if (LeadIds && Array.isArray(LeadIds) && LeadIds.length > 0) {
      leadsToDistribute = await Lead.find({ _id: { $in: LeadIds } });
    } else {
      const query = {
        $or: [{ assignedTo: null }, { assignedTo: req.user._id }],
      };
      if (teamId) {
        query.team = teamId;
      } else if (req.user.role === 'manager') {
        const managedTeams = await Team.find({ teamLead: req.user._id }).select('_id');
        const mTeamIds = managedTeams.map((t) => t._id);
        if (mTeamIds.length > 0) {
          query.$or = [
            { assignedTo: null, team: { $in: mTeamIds } },
            { assignedTo: null, team: null },
            { assignedTo: req.user._id },
          ];
        }
      }

      leadsToDistribute = await Lead.find(query).sort({ createdAt: 1 }).limit(100);
    }

    if (leadsToDistribute.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unassigned leads found to distribute.',
        totalDistributed: 0,
        distributed: 0,
        breakdown: {},
      });
    }

    // 3. Round-Robin Distribution
    const distributionSummary = {};
    targetUsers.forEach((u) => {
      distributionSummary[u.name] = 0;
    });

    let notificationService;
    try {
      notificationService = require('../services/notificationService');
    } catch (_) {}

    for (let i = 0; i < leadsToDistribute.length; i++) {
      const lead = leadsToDistribute[i];
      const targetUser = targetUsers[i % targetUsers.length];

      lead.assignedTo = targetUser._id;
      if (teamId) lead.team = teamId;
      await lead.save();

      distributionSummary[targetUser.name] += 1;

      if (notificationService?.sendLeadAssignmentEmail) {
        try {
          await notificationService.sendLeadAssignmentEmail(targetUser, lead);
        } catch (_) {}
      }

      await Activity.create({
        user: req.user._id,
        Lead: lead._id,
        type: 'update',
        module: 'Lead',
        description: `Lead ${lead.name} distributed to ${targetUser.name} (${targetUser.role}) via Round-Robin.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully distributed ${leadsToDistribute.length} leads across ${targetUsers.length} members.`,
      totalDistributed: leadsToDistribute.length,
      distributed: leadsToDistribute.length,
      breakdown: distributionSummary,
    });
  } catch (error) {
    console.error('distributeLeads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to distribute leads',
      error: error.message,
    });
  }
};

module.exports = {
  distributeLeads,
};
