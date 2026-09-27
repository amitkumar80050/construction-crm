const Client = require('../models/Client');
const User = require('../models/User');
const Team = require('../models/Team');
const Activity = require('../models/Activity');

// @desc    Distribute leads round-robin among team members
// @route   POST /api/clients/distribute
// @access  Private (Manager / Admin)
const distributeLeads = async (req, res) => {
  try {
    const { clientIds, userIds, teamId, roleFilter } = req.body;

    // 1. Resolve target users
    let targetUsers = [];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds }, isActive: true }).select('name email role');
    } else {
      // Find team members
      let teamQuery = { isActive: true };
      if (teamId) {
        teamQuery.teamIds = teamId;
      } else if (req.user.role === 'manager') {
        const managedTeams = await Team.find({ teamLead: req.user._id }).select('_id');
        teamQuery.teamIds = { $in: managedTeams.map((t) => t._id) };
      }

      if (roleFilter) {
        teamQuery.role = roleFilter;
      } else {
        teamQuery.role = { $in: ['telecaller', 'sales executer', 'user'] };
      }

      targetUsers = await User.find(teamQuery).select('name email role');
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible team members found to distribute leads to. Please select or add team members.',
      });
    }

    // 2. Resolve leads to distribute
    let leadsToDistribute = [];
    if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
      leadsToDistribute = await Client.find({ _id: { $in: clientIds } });
    } else {
      // Auto find unassigned leads or leads assigned to admin/creator
      leadsToDistribute = await Client.find({
        $or: [{ assignedTo: null }, { assignedTo: req.user._id }],
      }).limit(100);
    }

    if (leadsToDistribute.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No unassigned leads found to distribute.',
      });
    }

    // 3. Round-Robin Distribution
    const distributionSummary = {};
    targetUsers.forEach((u) => {
      distributionSummary[u.name] = 0;
    });

    for (let i = 0; i < leadsToDistribute.length; i++) {
      const lead = leadsToDistribute[i];
      const targetUser = targetUsers[i % targetUsers.length];

      lead.assignedTo = targetUser._id;
      if (teamId) lead.team = teamId;
      await lead.save();

      distributionSummary[targetUser.name] += 1;

      await Activity.create({
        user: req.user._id,
        client: lead._id,
        type: 'update',
        module: 'client',
        description: `Lead ${lead.name} distributed to ${targetUser.name} (${targetUser.role}) via Round-Robin.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully distributed ${leadsToDistribute.length} leads across ${targetUsers.length} members.`,
      totalDistributed: leadsToDistribute.length,
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
