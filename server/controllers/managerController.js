const Lead = require('../models/Lead');
const User = require('../models/User');
const Team = require('../models/Team');
const SiteVisit = require('../models/SiteVisit');
const Attendance = require('../models/Attendance');
const Remark = require('../models/Remark');
const { sendSiteVisitAssignmentEmail, sendLeadAssignmentEmail } = require('../services/notificationService');
const attendanceController = require('./attendanceController');
const { validateVisitAssignment, validateManualLeadAssignment, attendanceRange } = require('../services/managerWorkflowService');
const { logActivity } = require('../services/activityLogService');

const teamUserQuery = (req) => (req.user.role === 'admin'
  ? { isActive: true }
  : { teamIds: { $in: req.user.teamIds || [] }, isActive: true });

const teamUserIds = async (req) => (await User.find(teamUserQuery(req)).distinct('_id'));

const ensureTeamUser = async (req, userId) => {
  const user = await User.findOne({ _id: userId, ...teamUserQuery(req) });
  if (!user) {
    const error = new Error('Selected employee is not part of your team');
    error.status = 403;
    throw error;
  }
  return user;
};

const getDashboard = async (req, res) => {
  try {
    const ids = await teamUserIds(req);
    const leadQuery = req.user.role === 'admin'
      ? {}
      : { $or: [{ assignedTo: { $in: ids } }, { team: { $in: req.user.teamIds || [] } }] };
    const attendanceQuery = req.user.role === 'admin'
      ? { user: { $ne: req.user.id } }
      : { user: { $in: ids.filter((id) => String(id) !== String(req.user.id)) } };
    const visitScope = req.user.role === 'admin' ? {} : { assignedTo: { $in: ids } };
    const teamsQuery = req.user.role === 'admin'
      ? { status: 'ACTIVE' }
      : { _id: { $in: req.user.teamIds || [] } };

    const [totalLeads, stages, callsDone, plannedVisits, doneVisits, missedVisits, pendingAttendance, team, unassignedLeads, regularLeads, allTeams, scheduledVisits, readyVisitLeads] = await Promise.all([
      Lead.countDocuments(leadQuery),
      Lead.aggregate([{ $match: leadQuery }, { $group: { _id: '$pipelineStage', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Remark.countDocuments({ ...(req.user.role === 'admin' ? {} : { user: { $in: ids } }), type: 'call' }),
      SiteVisit.countDocuments({ ...visitScope, status: { $in: ['PLANNED', 'SCHEDULED'] } }),
      SiteVisit.countDocuments({ ...visitScope, status: { $in: ['DONE', 'COMPLETED'] } }),
      SiteVisit.countDocuments({ ...visitScope, status: { $in: ['MISSED', 'NOT_DONE'] } }),
      Attendance.countDocuments({ ...attendanceQuery, status: 'PENDING' }),
      User.find(teamUserQuery(req))
        .populate('teamIds', 'name code department')
        .select('name email role teamIds phone department')
        .sort({ name: 1 }),
      Lead.find({ ...(req.user.role === 'admin' ? {} : { team: { $in: req.user.teamIds || [] } }), pipelineStage: 'NEW', $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] })
        .populate('team', 'name code')
        .select('name company email phone pipelineStage team')
        .sort({ createdAt: -1 })
        .limit(100),
      Lead.find(leadQuery)
        .populate('team', 'name code')
        .populate('assignedTo', 'name email role')
        .select('name company email phone pipelineStage assignedTo team createdAt')
        .sort({ createdAt: -1 })
        .limit(200),
      Team.find(teamsQuery).select('name code department').sort({ name: 1 }),
      SiteVisit.find(visitScope)
        .populate('lead', 'name company phone pipelineStage')
        .populate('assignedTo', 'name email role')
        .sort({ scheduledAt: -1 })
        .limit(100),
      Lead.find({ ...leadQuery, pipelineStage: 'SITE_VISIT_PLANNED' })
        .populate('team', 'name code')
        .populate('assignedTo', 'name email role')
        .select('name company email phone pipelineStage assignedTo team createdAt'),
    ]);

    // Combine ready visit leads at top without duplicates
    const readyIds = new Set(readyVisitLeads.map((l) => String(l._id)));
    const combinedLeads = [
      ...readyVisitLeads,
      ...regularLeads.filter((l) => !readyIds.has(String(l._id))),
    ];

    res.json({
      success: true,
      data: {
        totalLeads,
        stages,
        callsDone,
        siteVisits: { planned: plannedVisits, done: doneVisits, missed: missedVisits },
        pendingAttendance,
        team,
        unassignedLeads,
        teamLeads: combinedLeads,
        scheduledVisits: scheduledVisits || [],
        teams: allTeams || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to load manager dashboard' });
  }
};

const distribute = async (req, res) => {
  try {
    const ids = await teamUserIds(req);
    const telecallers = await User.find({ _id: { $in: ids }, role: 'telecaller', isActive: true, isDeleted: { $ne: true } }).select('_id name email');
    if (!telecallers.length) return res.status(400).json({ success: false, message: 'No active telecallers in your team' });
    const teamScope = req.user.role === 'admin' ? {} : { team: { $in: req.user.teamIds || [] } };
    const selectedLeadIds = [...new Set((req.body.leadIds || []).map(String))];
    const query = selectedLeadIds.length
      ? { ...teamScope, _id: { $in: selectedLeadIds }, pipelineStage: 'NEW', $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] }
      : { ...teamScope, $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }], pipelineStage: 'NEW' };
    const leads = await Lead.find(query);
    if (selectedLeadIds.length && leads.length !== selectedLeadIds.length) {
      return res.status(403).json({ success: false, message: 'Every selected lead must be unassigned and belong to your team.' });
    }

    let assignedCount = 0;
    if (req.body.assignedTo) {
      if (!selectedLeadIds.length) return res.status(400).json({ success: false, message: 'Select leads before assigning to a specific Telecaller.' });
      const assignee = await ensureTeamUser(req, req.body.assignedTo);
      const validationError = validateManualLeadAssignment({
        selectedLeadCount: selectedLeadIds.length,
        matchedLeadCount: leads.length,
        assigneeRole: assignee.role,
        assigneeTeamIds: assignee.teamIds || [],
        managerTeamIds: req.user.teamIds || [],
        isAdmin: req.user.role === 'admin',
      });
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      for (const lead of leads) {
        lead.assignedTo = assignee._id;
        await lead.save();
        await sendLeadAssignmentEmail(assignee, lead);
        assignedCount += 1;
      }
    } else {
      for (let index = 0; index < leads.length; index += 1) {
        const assignee = telecallers[index % telecallers.length];
        leads[index].assignedTo = assignee._id;
        await leads[index].save();
        await sendLeadAssignmentEmail(assignee, leads[index]);
        assignedCount += 1;
      }
    }

    await logActivity({ req, user: req.user, type: 'update', module: 'Lead', description: `Assigned ${assignedCount} leads across the team`, metadata: { assignedCount } });
    res.json({ success: true, distributed: assignedCount });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Unable to distribute leads' });
  }
};

const assignVisit = async (req, res) => {
  try {
    const { leadId, executiveId, scheduledAt, address, priority, notes } = req.body;
    if (!leadId || !executiveId || !scheduledAt || !address?.trim() || !priority || !notes?.trim()) return res.status(400).json({ success: false, message: 'All site visit fields are required' });
    if (new Date(scheduledAt) <= new Date()) return res.status(400).json({ success: false, message: 'Site visit date cannot be in the past' });
    const executive = await ensureTeamUser(req, executiveId);
    if (executive.role !== 'sales executer') return res.status(400).json({ success: false, message: 'Site visits can only be assigned to Sales Executives' });
    const ids = await teamUserIds(req);
    const lead = await Lead.findOne({
      _id: leadId,
      pipelineStage: 'SITE_VISIT_PLANNED',
      ...(req.user.role === 'admin' ? {} : { assignedTo: { $in: ids } }),
    });
    if (!lead) return res.status(403).json({ success: false, message: 'Lead is not part of your team' });
    const validationError = validateVisitAssignment({
      scheduledAt,
      address,
      priority,
      notes,
      leadStage: lead.pipelineStage,
      executiveRole: executive.role,
      executiveTeamIds: executive.teamIds || [],
      managerTeamIds: req.user.teamIds || [],
      isAdmin: req.user.role === 'admin',
    });
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const visit = await SiteVisit.create({ lead: leadId, assignedTo: executiveId, scheduledAt, address: address.trim(), priority, notes: notes.trim(), createdBy: req.user.id });
    await sendSiteVisitAssignmentEmail(executive, visit);
    await logActivity({ req, user: req.user, type: 'create', module: 'site_visit', description: `Assigned site visit for ${lead.name} to ${executive.name}`, targetId: visit._id, targetType: 'SiteVisit', Lead: lead._id, metadata: { assignedTo: executive._id, scheduledAt: visit.scheduledAt } });
    res.status(201).json({ success: true, data: await visit.populate('assignedTo', 'name email') });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Unable to assign site visit' });
  }
};

const listAttendance = async (req, res) => {
  try {
    const ids = await teamUserIds(req);
    const query = {
      user: { $in: ids.filter((id) => String(id) !== String(req.user.id)) },
      ...attendanceRange(req.query.period || 'week'),
    };
    if (req.query.status) query.status = req.query.status;
    const records = await Attendance.find(query)
      .populate('user', 'name userId department')
      .sort({ date: -1, checkInTime: -1 });
    return res.json({ success: true, data: records });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to load team attendance.' });
  }
};

const updateAttendance = (req, res) => attendanceController.reviewAttendance({
  ...req,
  body: {
    ...req.body,
    decision: req.body.status,
    managerRemarks: req.body.managerRemarks,
  },
}, res);

module.exports = { getDashboard, distribute, assignVisit, listAttendance, updateAttendance };