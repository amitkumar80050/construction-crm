const Client = require('../models/Client');
const LeadStageHistory = require('../models/LeadStageHistory');
const Remark = require('../models/Remark');
const User = require('../models/User');
const Team = require('../models/Team');
const { validateTransition } = require('../services/leadStageService');
const { roundRobinAssignments } = require('../services/leadDistributionService');
const { sendLeadAssignmentEmail, sendLeadStageNotificationEmail } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');

const getLeads = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'telecaller' || req.user.role === 'sales executer') {
      query.assignedTo = req.user.id;
    } else if (req.user.role === 'manager') {
      const teamIds = req.user.teamIds || [];
      query.$or = [
        { assignedTo: { $in: await getTeamUserIds(teamIds) } },
        { team: { $in: teamIds } },
      ];
    }
    if (req.query.stage) query.pipelineStage = req.query.stage;
    if (req.query.status) query.status = req.query.status;

    const leads = await Client.find(query).populate('assignedTo', 'name userId').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getMyLeads = async (req, res) => {
  if (req.user.role !== 'telecaller') return res.status(403).json({ success: false, message: 'Telecaller access required' });
  return getLeads(req, res);
};

const canAccessLead = async (lead, req, UserModel = User) => {
  if (req.user.role === 'admin') return true;
  if (['telecaller', 'sales executer'].includes(req.user.role)) {
    return String(lead.assignedTo?._id || lead.assignedTo) === String(req.user.id);
  }
  if (req.user.role !== 'manager') return false;

  const managerTeamIds = (req.user.teamIds || []).map(String);
  if (lead.team && managerTeamIds.includes(String(lead.team))) return true;
  const ownerId = lead.assignedTo?._id || lead.assignedTo;
  if (!ownerId) return false;
  const owner = await UserModel.findById(ownerId).select('teamIds');
  return (owner?.teamIds || []).some((teamId) => managerTeamIds.includes(String(teamId)));
};

const canReassignLead = (role) => ['admin', 'manager'].includes(role);
const canAssignToRole = (assigneeRole, pipelineStage) => assigneeRole !== 'sales executer' || pipelineStage === 'SITE_VISIT_PLANNED';

async function getTeamUserIds(teamIds) {
  const users = await User.find({ teamIds: { $in: teamIds } }).select('_id');
  return users.map((u) => u._id);
}

const createLead = async (req, res) => {
  try {
    if (!['admin', 'manager', 'telecaller'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only Admins, Managers, and Telecallers can create leads.' });
    }
    const { name, company, email, phone, address, source, teamId } = req.body;
    if (!name?.trim() || !source) {
      return res.status(400).json({ success: false, message: 'Name and source are required.' });
    }

    const normalizedEmail = email?.trim().toLowerCase() || '';
    const normalizedPhone = phone?.replace(/\D/g, '') || '';
    if (!normalizedPhone && !normalizedEmail) return res.status(400).json({ success: false, message: 'A valid phone number or email is required.' });
    if (normalizedPhone && (normalizedPhone.length < 7 || normalizedPhone.length > 15)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain between 7 and 15 digits.' });
    }
    const contactQuery = [];
    if (normalizedEmail) contactQuery.push({ email: normalizedEmail });
    if (normalizedPhone) contactQuery.push({ phone: normalizedPhone });
    const duplicate = await Client.findOne({ $or: contactQuery }).select('_id name');
    if (duplicate) return res.status(409).json({ success: false, message: `A lead already exists with this email or phone (${duplicate.name}).` });

    let assignedTeam = null;
    if (req.user.role === 'admin') {
      if (teamId) {
        assignedTeam = await Team.findById(teamId).select('_id');
        if (!assignedTeam) return res.status(400).json({ success: false, message: 'Team not found.' });
      }
    } else {
      const userTeams = (req.user.teamIds || []).map(String);
      const selectedTeamId = teamId ? String(teamId) : userTeams[0];
      if (selectedTeamId && !userTeams.includes(selectedTeamId)) {
        return res.status(403).json({ success: false, message: 'You can only create leads for your own team.' });
      }
      if (selectedTeamId) assignedTeam = await Team.findById(selectedTeamId).select('_id');
    }

    const lead = await Client.create({
      clientId: await Client.generateClientId(),
      name: name.trim(),
      company: company?.trim() || name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address,
      source: source || 'other',
      assignedTo: req.user.role === 'telecaller' ? req.user.id : null,
      createdBy: req.user.id,
      team: assignedTeam?._id || null,
      pipelineStage: 'NEW',
    });
    await logActivity({ req, user: req.user, type: 'create', module: 'client', description: `Created lead ${lead.name}`, targetId: lead._id, targetType: 'Client', client: lead._id });
    return res.status(201).json({ success: true, data: lead });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A lead with this contact already exists.' });
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to create lead.' });
  }
};

const changeStage = async (req, res) => {
  try {
    const newStage = req.body.newStage || req.body.stage;
    const { notes, followUpDate } = req.body;
    if (req.user.role === 'sales executer' && newStage === 'SITE_VISIT_DONE') {
      return res.status(403).json({ success: false, message: 'Complete the assigned site visit with photo and GPS proof to mark it done.' });
    }
    const lead = await Client.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!await canAccessLead(lead, req)) return res.status(403).json({ success: false, message: 'You can only update leads assigned to you or your team.' });

    const oldStage = lead.pipelineStage || 'NEW';
    const check = validateTransition({ role: req.user.role, oldStage, newStage, notes, followUpDate });
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    lead.pipelineStage = newStage;
    if (followUpDate) lead.followUpDate = followUpDate;
    await lead.save();

    await LeadStageHistory.create({ lead: lead._id, oldStage, newStage, changedBy: req.user.id, notes });
    await logActivity({ req, user: req.user, type: 'update', module: 'stage', description: `Moved lead ${lead.name} from ${oldStage} to ${newStage}`, targetId: lead._id, targetType: 'Client', client: lead._id, metadata: { oldStage, newStage } });

    if (['INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'].includes(newStage) || req.user.role === 'telecaller') {
      let teamIds = lead.team ? [lead.team] : [];
      if (!teamIds.length && lead.assignedTo) {
        const owner = await User.findById(lead.assignedTo).select('teamIds');
        teamIds = owner?.teamIds || [];
      }
      const managers = teamIds.length
        ? await User.find({ role: 'manager', teamIds: { $in: teamIds }, isActive: true, isDeleted: { $ne: true } }).select('name email')
        : [];
      for (const manager of managers) {
        await sendLeadStageNotificationEmail(manager, lead);
      }
    }

    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getLeadDetails = async (req, res) => {
  try {
    const lead = await Client.findById(req.params.id).populate('assignedTo', 'name userId');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!await canAccessLead(lead, req)) return res.status(403).json({ success: false, message: 'You can only view leads assigned to you or your team.' });

    const history = await LeadStageHistory.find({ lead: lead._id }).populate('changedBy', 'name').sort({ changedAt: -1 });
    const notes = await Remark.find({ client: lead._id }).populate('user', 'name').sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { lead, history, notes } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const addLeadNote = async (req, res) => {
  try {
    const lead = await Client.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!await canAccessLead(lead, req)) return res.status(403).json({ success: false, message: 'You can only add notes to leads assigned to you or your team.' });
    if (!req.body.content?.trim()) return res.status(400).json({ success: false, message: 'Note content is required' });
    const note = await Remark.create({ client: lead._id, user: req.user.id, content: req.body.content.trim(), type: 'call', visibility: 'team' });
    lead.lastContactDate = Date.now();
    await lead.save();
    await logActivity({ req, user: req.user, type: 'create', module: 'remark', description: `Added call note for ${lead.name}`, targetId: note._id, targetType: 'Remark', client: lead._id });
    res.status(201).json({ success: true, data: await note.populate('user', 'name email') });
  } catch (error) { res.status(500).json({ success: false, message: error.message || 'Unable to add lead note' }); }
};

// Round-robin distribution among a team's telecallers
const distributeLeads = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!canReassignLead(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Manager or Admin access required.' });
    }
    if (!teamId) return res.status(400).json({ success: false, message: 'A team is required for distribution.' });
    if (req.user.role === 'manager' && !(req.user.teamIds || []).some((id) => String(id) === String(teamId))) {
      return res.status(403).json({ success: false, message: 'You can only distribute leads for your own team.' });
    }
    const team = await Team.findById(teamId).select('_id');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found.' });

    const telecallers = await User.find({ teamIds: teamId, role: 'telecaller', isActive: true, isDeleted: { $ne: true } }).select('_id name email');
    if (telecallers.length === 0) {
      return res.status(400).json({ success: false, message: 'No active telecallers in this team' });
    }

    const unassigned = await Client.find({ team: teamId, assignedTo: null, pipelineStage: 'NEW' }).sort({ createdAt: 1 });
    if (unassigned.length === 0) {
      return res.status(200).json({ success: true, message: 'No unassigned leads to distribute', distributed: 0 });
    }

    const assignments = roundRobinAssignments(unassigned, telecallers);
    for (const { item: lead, assignee } of assignments) {
      lead.assignedTo = assignee._id;
      await lead.save();
      await sendLeadAssignmentEmail(assignee, lead);
    }

    await logActivity({ req, user: req.user, type: 'update', module: 'client', description: `Distributed ${unassigned.length} leads round-robin across ${telecallers.length} telecallers`, metadata: { leadCount: unassigned.length, telecallerCount: telecallers.length } });
    res.status(200).json({ success: true, distributed: unassigned.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const reassignLead = async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Manager or Admin access required.' });
    }
    const lead = await Client.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    if (!await canAccessLead(lead, req)) {
      return res.status(403).json({ success: false, message: 'You can only reassign leads in your own team.' });
    }

    const assignee = await User.findOne({
      _id: req.body.assignedTo,
      role: { $in: ['telecaller', 'sales executer'] },
      isActive: true,
      isDeleted: { $ne: true },
    }).select('name email teamIds');
    if (!assignee) return res.status(400).json({ success: false, message: 'Select an active Telecaller or Sales Executive.' });
    if (!canAssignToRole(assignee.role, lead.pipelineStage)) {
      return res.status(400).json({ success: false, message: 'Sales Executives can only be assigned after the lead reaches Site Visit Planned.' });
    }

    if (req.user.role === 'manager') {
      const managerTeamIds = (req.user.teamIds || []).map(String);
      if (!(assignee.teamIds || []).some((id) => managerTeamIds.includes(String(id)))) {
        return res.status(403).json({ success: false, message: 'You can only assign leads to members of your team.' });
      }
    }

    lead.assignedTo = assignee._id;
    if (!lead.team) {
      const sharedTeam = (assignee.teamIds || []).find((id) => req.user.role === 'admin' || (req.user.teamIds || []).some((managerTeam) => String(managerTeam) === String(id)));
      if (sharedTeam) lead.team = sharedTeam;
    }
    await lead.save();
    await sendLeadAssignmentEmail(assignee, lead);
    await logActivity({ req, user: req.user, type: 'update', module: 'client', description: `Assigned lead ${lead.name} to ${assignee.name}`, targetId: lead._id, targetType: 'Client', client: lead._id, metadata: { assigneeId: assignee._id } });
    return res.status(200).json({ success: true, data: await lead.populate('assignedTo', 'name userId') });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to reassign lead.' });
  }
};

module.exports = { getLeads, getMyLeads, createLead, reassignLead, changeStage, getLeadDetails, addLeadNote, distributeLeads, canAccessLead, canReassignLead, canAssignToRole };