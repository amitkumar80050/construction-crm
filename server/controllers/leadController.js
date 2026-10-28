const Lead = require('../models/Lead');
const LeadStageHistory = require('../models/LeadStageHistory');
const Remark = require('../models/Remark');
const User = require('../models/User');
const Team = require('../models/Team');
const Stage = require('../models/Stage');
const { validateTransition } = require('../services/leadStageService');
const { roundRobinAssignments } = require('../services/leadDistributionService');
const { sendLeadAssignmentEmail, sendLeadStageNotificationEmail } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');

const PIPELINE_TO_STAGE_KEYWORDS = {
  NEW: ['new', 'lead', 'prospect'],
  CONNECTED: ['connected', 'contacted', 'connect'],
  INTERESTED: ['interested', 'interest'],
  FOLLOW_UP: ['follow-up', 'follow up', 'followup', 'follow'],
  SITE_VISIT_PLANNED: ['site visit planned', 'visit planned', 'site visit'],
  SITE_VISIT_DONE: ['site visit done', 'visit done', 'site visit completed', 'visit completed'],
  QUOTATION: ['quotation', 'proposal', 'negotiation', 'quote'],
  CONVERTED: ['converted', 'closed', 'won'],
};

async function syncLeadStageObject(lead) {
  try {
    if (lead.pipelineStage) {
      const keywords = PIPELINE_TO_STAGE_KEYWORDS[lead.pipelineStage] || [];
      const stages = await Stage.find({ isActive: true }).sort({ order: 1 });
      let matched = stages.find((s) => keywords.some((k) => s.name.toLowerCase().includes(k)));
      if (!matched && stages.length > 0) {
        matched = stages[0];
      }
      if (matched) {
        lead.currentStage = matched._id;
      }
    }
  } catch (err) {
    console.warn('syncLeadStageObject warning:', err.message);
  }
}

const getLeads = async (req, res) => {
  try {
    let query = {};
    const selectedTeam = req.query.team || req.query.teamId;

    if (req.user.role === 'admin') {
      if (selectedTeam && selectedTeam !== 'all') {
        query.team = selectedTeam;
      }
    } else if (req.user.role === 'manager') {
      const managerTeams = await Team.find({
        $or: [
          { teamLead: req.user._id },
          { _id: { $in: req.user.teamIds || [] } }
        ]
      }).select('_id');
      const authorizedTeamIds = managerTeams.map((t) => String(t._id));
      if (selectedTeam && selectedTeam !== 'all') {
        if (!authorizedTeamIds.includes(String(selectedTeam))) {
          return res.status(403).json({ success: false, message: 'Not authorized for this team' });
        }
        query.team = selectedTeam;
      } else {
        query.team = { $in: authorizedTeamIds };
      }
    } else if (req.user.role === 'telecaller' || req.user.role === 'sales executer') {
      const userTeamIds = (req.user.teamIds || []).map(String);
      if (selectedTeam && selectedTeam !== 'all') {
        if (!userTeamIds.includes(String(selectedTeam))) {
          return res.status(403).json({ success: false, message: 'Not authorized for this team' });
        }
        query.team = selectedTeam;
      } else if (userTeamIds.length > 0) {
        query.team = { $in: req.user.teamIds };
      }
      query.assignedTo = req.user.id;
    }

    if (req.query.stage) query.pipelineStage = req.query.stage;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { company: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { LeadId: searchRegex }
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name userId email role')
      .populate('team', 'name code department')
      .populate('currentStage', 'name color order')
      .sort({ createdAt: -1 });

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
  const userTeamIds = (req.user.teamIds || []).map(String);
  const leadTeamId = lead.team?._id ? String(lead.team._id) : (lead.team ? String(lead.team) : null);

  if (['telecaller', 'sales executer'].includes(req.user.role)) {
    const isAssigned = String(lead.assignedTo?._id || lead.assignedTo) === String(req.user.id);
    const belongsToMyTeam = leadTeamId && userTeamIds.includes(leadTeamId);
    return isAssigned && (userTeamIds.length === 0 || !leadTeamId || belongsToMyTeam);
  }
  if (req.user.role === 'manager') {
    if (!leadTeamId && !lead.assignedTo) return true;
    if (leadTeamId && userTeamIds.includes(leadTeamId)) return true;
    if (leadTeamId) {
      const isLead = await Team.exists({ _id: leadTeamId, teamLead: req.user.id });
      if (isLead) return true;
    }
    if (String(lead.createdBy) === String(req.user.id)) return true;
    const ownerId = lead.assignedTo?._id || lead.assignedTo;
    if (!ownerId) return true;
    const owner = await UserModel.findById(ownerId).select('teamIds');
    return (owner?.teamIds || []).some((teamId) => userTeamIds.includes(String(teamId)));
  }
  return false;
};

const canReassignLead = (role) => ['admin', 'manager'].includes(role);
const canAssignToRole = (assigneeRole, pipelineStage) => assigneeRole !== 'sales executer' || pipelineStage === 'SITE_VISIT_PLANNED';

async function getTeamUserIds(teamIds) {
  const users = await User.find({ teamIds: { $in: teamIds } }).select('_id');
  return users.map((u) => u._id);
}

const createLead = async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only Admins and Managers can create leads.' });
    }
    const { name, company, email, phone, address, source, teamId, assignedTo, projectValue, notes, status, pipelineStage } = req.body;
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
    const duplicate = await Lead.findOne({ $or: contactQuery }).select('_id name');
    if (duplicate) return res.status(409).json({ success: false, message: `A lead already exists with this email or phone (${duplicate.name}).` });

    let assignedTeam = null;
    if (req.user.role === 'admin') {
      if (teamId) {
        assignedTeam = await Team.findById(teamId).select('_id');
        if (!assignedTeam) return res.status(400).json({ success: false, message: 'Team not found.' });
      }
    } else {
      const userTeams = (req.user.teamIds || []).map(String);
      const isLeadOfTeam = teamId ? await Team.exists({ _id: teamId, teamLead: req.user.id }) : false;
      const selectedTeamId = teamId ? String(teamId) : userTeams[0];
      if (selectedTeamId && !userTeams.includes(selectedTeamId) && !isLeadOfTeam) {
        return res.status(403).json({ success: false, message: 'You can only create leads for your own team.' });
      }
      if (selectedTeamId) assignedTeam = await Team.findById(selectedTeamId).select('_id');
    }

    let targetAssignee = null;
    if (assignedTo) {
      const assigneeUser = await User.findOne({
        _id: assignedTo,
        isActive: true,
        isDeleted: { $ne: true },
      }).select('_id name email teamIds role');
      if (assigneeUser) {
        targetAssignee = assigneeUser._id;
        if (!assignedTeam && assigneeUser.teamIds?.length) {
          assignedTeam = await Team.findById(assigneeUser.teamIds[0]).select('_id');
        }
      }
    }

    const lead = await Lead.create({
      LeadId: await Lead.generateLeadId(),
      name: name.trim(),
      company: company?.trim() || name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address,
      source: source || 'other',
      status: status || 'lead',
      projectValue: Number(projectValue) || 0,
      notes: notes ? String(notes).trim() : '',
      assignedTo: targetAssignee,
      createdBy: req.user.id,
      team: assignedTeam?._id || null,
      pipelineStage: pipelineStage || 'NEW',
    });
    await syncLeadStageObject(lead);
    await lead.save();
    if (targetAssignee) {
      const assigneeUser = await User.findById(targetAssignee).select('name email');
      if (assigneeUser) await sendLeadAssignmentEmail(assigneeUser, lead);
    }
    await logActivity({ req, user: req.user, type: 'create', module: 'Lead', description: `Created lead ${lead.name}`, targetId: lead._id, targetType: 'Lead', Lead: lead._id });
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
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!await canAccessLead(lead, req)) return res.status(403).json({ success: false, message: 'You can only update leads assigned to you or your team.' });

    const oldStage = lead.pipelineStage || 'NEW';
    const check = validateTransition({ role: req.user.role, oldStage, newStage, notes, followUpDate });
    if (!check.valid) return res.status(400).json({ success: false, message: check.message });

    lead.pipelineStage = newStage;
    if (followUpDate) lead.followUpDate = followUpDate;
    lead.lastContactDate = new Date();
    if (newStage === 'CONVERTED') lead.status = 'closed';
    else if (['CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION'].includes(newStage)) {
      if (lead.status === 'lead') lead.status = 'active';
    }

    await syncLeadStageObject(lead);
    await lead.save();

    await LeadStageHistory.create({ lead: lead._id, oldStage, newStage, changedBy: req.user.id, notes });
    await logActivity({ req, user: req.user, type: 'update', module: 'stage', description: `Moved lead ${lead.name} from ${oldStage} to ${newStage}`, targetId: lead._id, targetType: 'Lead', Lead: lead._id, metadata: { oldStage, newStage } });

    if (['INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'].includes(newStage) || req.user.role === 'telecaller') {
      let teamIds = lead.team ? [lead.team] : [];
      if (!teamIds.length && lead.assignedTo) {
        const owner = await User.findById(lead.assignedTo).select('teamIds');
        teamIds = owner?.teamIds || [];
      }
      const managers = teamIds.length
        ? await User.find({ role: 'manager', teamIds: { $in: teamIds }, isActive: true, isDeleted: { $ne: true } }).select('name email')
        : await User.find({ role: 'manager', isActive: true, isDeleted: { $ne: true } }).select('name email');
      for (const manager of managers) {
        await sendLeadStageNotificationEmail(manager, lead);
      }
    }

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name userId email role')
      .populate('team', 'name code department')
      .populate('currentStage', 'name color order');

    res.status(200).json({ success: true, data: updatedLead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const getLeadDetails = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name userId email role')
      .populate('team', 'name code department')
      .populate('currentStage', 'name color order');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!await canAccessLead(lead, req)) return res.status(403).json({ success: false, message: 'You can only view leads assigned to you or your team.' });

    const history = await LeadStageHistory.find({ lead: lead._id }).populate('changedBy', 'name').sort({ changedAt: -1 });
    const notes = await Remark.find({ Lead: lead._id }).populate('user', 'name').sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { ...lead.toObject(), lead, history, notes } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const addLeadNote = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!await canAccessLead(lead, req)) return res.status(403).json({ success: false, message: 'You can only add notes to leads assigned to you or your team.' });
    if (!req.body.content?.trim()) return res.status(400).json({ success: false, message: 'Note content is required' });
    const note = await Remark.create({ Lead: lead._id, user: req.user.id, content: req.body.content.trim(), type: 'call', visibility: 'team' });
    lead.lastContactDate = Date.now();
    await lead.save();
    await logActivity({ req, user: req.user, type: 'create', module: 'remark', description: `Added call note for ${lead.name}`, targetId: note._id, targetType: 'Remark', Lead: lead._id });
    res.status(201).json({ success: true, data: await note.populate('user', 'name email') });
  } catch (error) { res.status(500).json({ success: false, message: error.message || 'Unable to add lead note' }); }
};

const { distributeLeads } = require('./leadDistributionController');

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    if (!await canAccessLead(lead, req)) {
      return res.status(403).json({ success: false, message: 'You can only update leads assigned to you or your team.' });
    }

    const {
      name,
      company,
      email,
      phone,
      address,
      source,
      status,
      projectValue,
      notes,
      pipelineStage,
      stage,
      currentStage,
      teamId,
      team,
      assignedTo,
      followUpDate,
      tags
    } = req.body;

    if (name !== undefined) lead.name = name.trim();
    if (company !== undefined) lead.company = company.trim() || lead.name;
    if (email !== undefined) lead.email = email.trim().toLowerCase();
    if (phone !== undefined) {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned) lead.phone = cleaned;
    }
    if (address !== undefined) lead.address = address;
    if (source !== undefined) lead.source = source;
    if (status !== undefined) lead.status = status;
    if (projectValue !== undefined) lead.projectValue = Number(projectValue) || 0;
    if (notes !== undefined) lead.notes = String(notes).trim();
    if (tags !== undefined) lead.tags = tags;
    if (followUpDate !== undefined) lead.followUpDate = followUpDate;

    // Team assignment (Admins and Managers)
    const targetTeamId = teamId || team;
    if (targetTeamId !== undefined && ['admin', 'manager'].includes(req.user.role)) {
      if (targetTeamId) {
        const teamObj = await Team.findById(targetTeamId).select('_id');
        if (teamObj) lead.team = teamObj._id;
      } else {
        lead.team = null;
      }
    }

    // Reassignment (Admins and Managers)
    if (assignedTo !== undefined && ['admin', 'manager'].includes(req.user.role)) {
      if (assignedTo) {
        const assignee = await User.findOne({
          _id: assignedTo,
          role: { $in: ['telecaller', 'sales executer'] },
          isActive: true,
          isDeleted: { $ne: true },
        }).select('name email teamIds role');

        if (assignee) {
          if (canAssignToRole(assignee.role, lead.pipelineStage)) {
            lead.assignedTo = assignee._id;
            if (!lead.team && assignee.teamIds?.length) {
              lead.team = assignee.teamIds[0];
            }
            await sendLeadAssignmentEmail(assignee, lead);
            await logActivity({
              req,
              user: req.user,
              type: 'update',
              module: 'Lead',
              description: `Assigned lead ${lead.name} to ${assignee.name}`,
              targetId: lead._id,
              targetType: 'Lead',
              Lead: lead._id,
              metadata: { assigneeId: assignee._id }
            });
          }
        }
      } else {
        lead.assignedTo = null;
      }
    }

    // Pipeline stage update
    const targetStageStr = pipelineStage || stage;
    if (targetStageStr && targetStageStr !== lead.pipelineStage) {
      const oldStage = lead.pipelineStage || 'NEW';
      lead.pipelineStage = targetStageStr;
      if (targetStageStr === 'CONVERTED') lead.status = 'closed';
      await LeadStageHistory.create({
        lead: lead._id,
        oldStage,
        newStage: targetStageStr,
        changedBy: req.user.id,
        notes: notes || 'Updated via lead editor'
      });
    }

    if (currentStage) {
      lead.currentStage = currentStage;
    } else {
      await syncLeadStageObject(lead);
    }

    await lead.save();

    await logActivity({
      req,
      user: req.user,
      type: 'update',
      module: 'Lead',
      description: `Updated lead ${lead.name}`,
      targetId: lead._id,
      targetType: 'Lead',
      Lead: lead._id
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name userId email role')
      .populate('team', 'name code department')
      .populate('currentStage', 'name color order');

    return res.status(200).json({ success: true, data: populatedLead });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: 'Unable to update lead.' });
  }
};

const reassignLead = async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Manager or Admin access required.' });
    }
    const lead = await Lead.findById(req.params.id);
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
    await logActivity({ req, user: req.user, type: 'update', module: 'Lead', description: `Assigned lead ${lead.name} to ${assignee.name}`, targetId: lead._id, targetType: 'Lead', Lead: lead._id, metadata: { assigneeId: assignee._id } });
    return res.status(200).json({ success: true, data: await lead.populate('assignedTo', 'name userId') });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to reassign lead.' });
  }
};

module.exports = { getLeads, getMyLeads, createLead, updateLead, reassignLead, changeStage, getLeadDetails, addLeadNote, distributeLeads, canAccessLead, canReassignLead, canAssignToRole };