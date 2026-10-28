const Team = require('../models/Team');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { syncTeamManagerMembership, deleteTeamIfEmpty } = require('../services/teamMembershipService');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validateTeamLead = async (teamLeadId) => {
  if (!teamLeadId) return null;
  const leadUser = await User.findById(teamLeadId);
  if (!leadUser) return { error: 'Team manager user not found' };
  if (leadUser.role !== 'manager') return { error: 'Team lead must have the Manager role' };
  if (!leadUser.isActive || leadUser.isDeleted) return { error: 'Team manager must be active' };
  return { user: leadUser };
};

const createTeam = async (req, res) => {
    try {
      const { department, description, teamLead } = req.body;
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
      if (!name || !code) {
        return res.status(400).json({ success: false, message: 'Team name and code are required' });
      }

      const existingName = await Team.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
      if (existingName) {
        return res.status(400).json({ success: false, message: 'Team name already exists' });
      }
      const existingCode = await Team.findOne({ code });
      if (existingCode) {
        return res.status(400).json({ success: false, message: 'Team code already exists' });
      }

      const leadResult = await validateTeamLead(teamLead);
      if (leadResult?.error) return res.status(400).json({ success: false, message: leadResult.error });

      const team = await Team.create({
        name, code, department, description,
        teamLead: teamLead || null, createdBy: req.user.id,
      });
      if (teamLead) {
        await syncTeamManagerMembership({ Team, User, teamId: team._id, nextManagerId: teamLead });
      }

      await Activity.create({ user: req.user.id, type: 'create', module: 'team', description: `Created team: ${team.name} (${team.code})` });
      res.status(201).json({ success: true, data: team });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) return res.status(400).json({ success: false, message: 'Team name or code already exists' });
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };

const getTeams = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      let userTeamIds = req.user.teamIds || [];
      if (!userTeamIds || userTeamIds.length === 0) {
        const defaultTeam = await Team.findOne({ status: { $ne: 'ARCHIVED' } }).sort({ createdAt: 1 });
        if (defaultTeam) {
          await User.findByIdAndUpdate(req.user._id, { $addToSet: { teamIds: defaultTeam._id } });
          userTeamIds = [defaultTeam._id];
          req.user.teamIds = userTeamIds;
        }
      }
      query = {
        $or: [
          { _id: { $in: userTeamIds } },
          { teamLead: req.user._id },
          { department: req.user.department || 'sales' }
        ]
      };
    }
    let teams = await Team.find(query)
      .populate('teamLead', 'name userId email role')
      .sort({ createdAt: -1 })
      .lean();

    if (teams.length === 0 && req.user.role !== 'admin') {
      teams = await Team.find({ status: { $ne: 'ARCHIVED' } })
        .populate('teamLead', 'name userId email role')
        .sort({ createdAt: -1 })
        .lean();
    }

    const allTeamIds = teams.map((t) => t._id);
    const membersByTeam = await User.find({
      $or: [
        { teamIds: { $in: allTeamIds } },
        { _id: { $in: teams.map((t) => t.teamLead?._id || t.teamLead).filter(Boolean) } }
      ],
      isDeleted: { $ne: true }
    }).select('name email phone role department isActive teamIds').lean();

    const result = teams.map((t) => {
      const tLeadId = String(t.teamLead?._id || t.teamLead || '');
      const tMembers = membersByTeam.filter((m) =>
        (m.teamIds || []).some((id) => String(id) === String(t._id)) ||
        String(m._id) === tLeadId
      );
      if (req.user && !tMembers.some((m) => String(m._id) === String(req.user._id))) {
        tMembers.push({
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          department: req.user.department,
          isActive: true
        });
      }
      const uniqueMembers = Array.from(new Map(tMembers.map((m) => [String(m._id), m])).values());

      return {
        ...t,
        memberCount: uniqueMembers.length,
        members: uniqueMembers
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('teamLead', 'name userId email role');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    let isMember = (req.user.teamIds || []).some((id) => String(id?._id || id) === String(team._id)) ||
                   String(team.teamLead?._id || team.teamLead) === String(req.user._id);
    if (req.user.role !== 'admin' && !isMember) {
      if (team.status !== 'ARCHIVED') {
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { teamIds: team._id } });
        if (!req.user.teamIds) req.user.teamIds = [];
        req.user.teamIds.push(team._id);
        isMember = true;
      } else {
        return res.status(403).json({ success: false, message: 'You can only view your own team.' });
      }
    }

    const members = await User.find({
      $or: [
        { teamIds: team._id },
        { _id: team.teamLead?._id || team.teamLead }
      ],
      isDeleted: { $ne: true }
    }).select('userId name email phone role department isActive');

    if (req.user && !members.some((m) => String(m._id) === String(req.user._id))) {
      members.push({
        _id: req.user._id,
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        department: req.user.department,
        isActive: true
      });
    }

    const uniqueMembers = Array.from(new Map(members.map((m) => [String(m._id), m])).values());

    res.status(200).json({ success: true, data: { ...team.toObject(), members: uniqueMembers } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { department, description, status } = req.body;
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const name = req.body.name === undefined ? team.name : String(req.body.name).trim();
    const code = req.body.code === undefined ? team.code : String(req.body.code).trim().toUpperCase();
    if (!name || !code) return res.status(400).json({ success: false, message: 'Team name and code are required' });

    const duplicateName = await Team.findOne({ _id: { $ne: team._id }, name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (duplicateName) return res.status(400).json({ success: false, message: 'Team name already exists' });
    const duplicateCode = await Team.findOne({ _id: { $ne: team._id }, code });
    if (duplicateCode) return res.status(400).json({ success: false, message: 'Team code already exists' });

    const nextTeamLead = req.body.teamLead === undefined ? team.teamLead : (req.body.teamLead || null);
    const leadResult = await validateTeamLead(nextTeamLead);
    if (leadResult?.error) return res.status(400).json({ success: false, message: leadResult.error });
    const previousTeamLead = team.teamLead;

    team.name = name;
    team.code = code;
    if (department) team.department = department;
    if (description !== undefined) team.description = description;
    if (status) team.status = status;
    team.teamLead = nextTeamLead;
      try {
        await team.save();
      } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Team name or code already exists' });
        throw error;
      }
    await syncTeamManagerMembership({ Team, User, teamId: team._id, previousManagerId: previousTeamLead, nextManagerId: nextTeamLead });

    if (String(previousTeamLead || '') !== String(nextTeamLead || '')) {
      const newLead = nextTeamLead ? await User.findById(nextTeamLead) : null;
      await Activity.create({
        user: req.user.id, type: 'update', module: 'team',
        description: `Changed Team Lead of ${team.name} to ${newLead?.name || 'unassigned'}`,
      });
    }

    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const result = await deleteTeamIfEmpty({ Team, User, teamId: req.params.teamId });
    const { team, memberCount } = result;
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!result.deleted) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete team with ${memberCount} member(s). Remove all members first.`,
      });
    }

    await Activity.create({ user: req.user.id, type: 'delete', module: 'team', description: `Deleted team: ${team.name}` });
    res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!['telecaller', 'sales executer'].includes(user.role)) {
      return res.status(400).json({ success: false, message: 'Only telecallers and sales executives can be added as team members.' });
    }

    // Current rule: one team per user — remove from any prior team
    user.teamIds = [team._id];
    await user.save({ validateBeforeSave: false });

    await Activity.create({
      user: req.user.id, type: 'update', module: 'team',
      description: `${user.name} added to ${team.name}`,
    });

    res.status(200).json({ success: true, message: 'Member added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const removeMember = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(team.teamLead || '') === String(user._id)) {
      return res.status(400).json({ success: false, message: 'Assign a different team lead before removing this manager.' });
    }

    user.teamIds = (user.teamIds || []).filter((id) => String(id) !== String(team._id));
    await user.save({ validateBeforeSave: false });

    await Activity.create({
      user: req.user.id, type: 'update', module: 'team',
      description: `${user.name} removed from ${team.name}`,
    });

    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { createTeam, getTeams, getTeam, updateTeam, deleteTeam, addMember, removeMember };