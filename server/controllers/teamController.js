const Team = require('../models/Team');
const User = require('../models/User');
const Activity = require('../models/Activity');

const createTeam = async (req, res) => {
  try {
    const { name, code, department, description, teamLead } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Team name and code are required' });
    }

    const existing = await Team.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Team code already exists' });
    }

    if (teamLead) {
      const leadUser = await User.findById(teamLead);
      if (!leadUser) return res.status(400).json({ success: false, message: 'Team Lead user not found' });
    }

    const team = await Team.create({
      name, code: code.toUpperCase(), department, description,
      teamLead: teamLead || null, createdBy: req.user.id,
    });

    await Activity.create({
      user: req.user.id, type: 'create', module: 'team',
      description: `Created team: ${team.name} (${team.code})`,
    });

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('teamLead', 'name userId email')
      .sort({ createdAt: -1 })
      .lean();

    const memberCounts = await User.aggregate([
      { $unwind: '$teamIds' },
      { $group: { _id: '$teamIds', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(memberCounts.map((c) => [c._id.toString(), c.count]));

    const result = teams.map((t) => ({ ...t, memberCount: countMap.get(t._id.toString()) || 0 }));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('teamLead', 'name userId email');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const members = await User.find({ teamIds: team._id }).select('userId name email role department');
    res.status(200).json({ success: true, data: { ...team.toObject(), members } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { name, department, description, status, teamLead } = req.body;
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const leadChanged = teamLead && teamLead !== String(team.teamLead);

    if (name) team.name = name;
    if (department) team.department = department;
    if (description !== undefined) team.description = description;
    if (status) team.status = status;
    if (teamLead) team.teamLead = teamLead;
    await team.save();

    if (leadChanged) {
      const newLead = await User.findById(teamLead);
      await Activity.create({
        user: req.user.id, type: 'update', module: 'team',
        description: `Changed Team Lead of ${team.name} to ${newLead?.name || teamLead}`,
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
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    team.status = 'ARCHIVED';
    await team.save();

    await Activity.create({ user: req.user.id, type: 'delete', module: 'team', description: `Archived team: ${team.name}` });
    res.status(200).json({ success: true, message: 'Team archived' });
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

    user.teamIds = user.teamIds.filter((id) => String(id) !== String(team._id));
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