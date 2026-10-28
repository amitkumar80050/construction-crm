const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');

const getTeamUserIds = async (teamIds) => (await User.find({ teamIds: { $in: teamIds } }).distinct('_id'));

const canAccesslead = async (Lead, req) => {
  if (req.user.role === 'admin') return true;
  if (['telecaller', 'sales executer'].includes(req.user.role)) {
    return String(Lead.assignedTo?._id || Lead.assignedTo) === String(req.user.id);
  }
  if (req.user.role !== 'manager') return false;
  const teamIds = (req.user.teamIds || []).map(String);
  if (Lead.team && teamIds.includes(String(Lead.team))) return true;
  const ownerId = Lead.assignedTo?._id || Lead.assignedTo;
  if (!ownerId) return false;
  const owner = await User.findById(ownerId).select('teamIds');
  return (owner?.teamIds || []).some((teamId) => teamIds.includes(String(teamId)));
};

// @desc    Get all Leads
// @route   GET /api/Leads
// @access  Private
const getLeads = async (req, res) => {
  try {
    const filters = [];
    if (['telecaller', 'sales executer'].includes(req.user.role)) {
      filters.push({ assignedTo: req.user.id });
    } else if (req.user.role === 'manager') {
      const teamIds = req.user.teamIds || [];
      filters.push({ $or: [{ team: { $in: teamIds } }, { assignedTo: { $in: await getTeamUserIds(teamIds) } }] });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Filter by status
    if (req.query.status) {
      filters.push({ status: req.query.status });
    }

    // Filter by assigned user
    if (req.query.assignedTo && ['admin', 'manager'].includes(req.user.role)) {
      filters.push({ assignedTo: req.query.assignedTo });
    }

    // Search by name or company
    if (req.query.search) {
      const search = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filters.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      });
    }
    const query = filters.length > 1 ? { $and: filters } : filters[0] || {};

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Lead.countDocuments(query);

    const Leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('currentStage', 'name color')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    res.status(200).json({
      success: true,
      count: Leads.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: Leads,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get single Lead
// @route   GET /api/Leads/:id
// @access  Private
const getlead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('currentStage', 'name color description');

    if (!Lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    if (!await canAccessLead(Lead, req)) return res.status(403).json({ success: false, message: 'You can only view leads assigned to you or your team.' });

    res.status(200).json({
      success: true,
      data: Lead,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Create Lead
// @route   POST /api/Leads
// @access  Private
const createlead = async (req, res) => {
  try {
    if (!['admin', 'manager', 'telecaller'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only Admins, Managers, and Telecallers can create leads.' });
    }
    const LeadData = { ...req.body };
    const email = typeof LeadData.email === 'string' ? LeadData.email.trim().toLowerCase() : '';
    const phone = typeof LeadData.phone === 'string' ? LeadData.phone.replace(/\D/g, '') : '';
    if (!LeadData.name?.trim() || !LeadData.source) {
      return res.status(400).json({ success: false, message: 'Name and source are required.' });
    }
    if (!email && !phone) return res.status(400).json({ success: false, message: 'A valid phone number or email is required.' });
    if (phone && (phone.length < 7 || phone.length > 15)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain between 7 and 15 digits.' });
    }
    const contactQuery = [];
    if (email) contactQuery.push({ email });
    if (phone) contactQuery.push({ phone });
    const duplicate = await Lead.findOne({ $or: contactQuery }).select('name');
    if (duplicate) return res.status(409).json({ success: false, message: `A lead already exists with this email or phone (${duplicate.name}).` });

    let teamId = req.user.role === 'admin' ? LeadData.team : (req.user.teamIds || [])[0];
    if (req.user.role === 'manager' && LeadData.team && !(req.user.teamIds || []).some((id) => String(id) === String(LeadData.team))) {
      return res.status(403).json({ success: false, message: 'You can only create leads for your own team.' });
    }
    if (req.user.role === 'admin' && teamId && !await Team.exists({ _id: teamId })) {
      return res.status(400).json({ success: false, message: 'Team not found.' });
    }
    LeadData.email = email;
    LeadData.phone = phone;
    LeadData.company = LeadData.company?.trim() || LeadData.name.trim();
    LeadData.team = teamId || null;
    LeadData.assignedTo = req.user.role === 'telecaller' ? req.user.id : null;
    LeadData.createdBy = req.user.id;
    LeadData.pipelineStage = 'NEW';

    // Generate leadID
    LeadData.LeadId = await Lead.generateLeadId();

    const lead = await Lead.create(LeadData);

    // Log activity
    await Activity.create({
      user: req.user.id,
      Lead: Lead._id,
      type: 'create',
      module: 'Lead',
      description: `Created lead: ${Lead.name} (${Lead.company})`,
    });

    res.status(201).json({
      success: true,
      data: Lead,
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A lead with this contact already exists.' });
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update Lead
// @route   PUT /api/Leads/:id
// @access  Private
const updatelead = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!Lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    if (!await canAccessLead(Lead, req)) {
      return res.status(403).json({ success: false, message: 'You can only edit leads assigned to you or your team.' });
    }
    if (!['admin', 'manager', 'telecaller'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Your role cannot edit lead details.' });
    }

    const editableFields = ['name', 'company', 'email', 'phone', 'address', 'source', 'status', 'projectValue', 'notes', 'tags', 'followUpDate', 'nextContactDate'];
    const updateData = Object.fromEntries(Object.entries(req.body).filter(([key]) => editableFields.includes(key)));
    if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();

    lead = await Lead.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    // Log activity
    await Activity.create({
      user: req.user.id,
      Lead: Lead._id,
      type: 'update',
      module: 'Lead',
      description: `Updated lead: ${Lead.name}`,
    });

    res.status(200).json({
      success: true,
      data: Lead,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Delete Lead
// @route   DELETE /api/Leads/:id
// @access  Private/Admin
const deletelead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!Lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    await Lead.deleteOne();

    // Log activity
    await Activity.create({
      user: req.user.id,
      Lead: Lead._id,
      type: 'delete',
      module: 'Lead',
      description: `Deleted lead: ${Lead.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'lead deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get leadstatistics
// @route   GET /api/Leads/stats
// @access  Private
const getLeadstats = async (req, res) => {
  try {
    const scope = req.user.role === 'admin'
      ? {}
      : ['telecaller', 'sales executer'].includes(req.user.role)
        ? { assignedTo: req.user.id }
        : req.user.role === 'manager'
          ? { $or: [{ team: { $in: req.user.teamIds || [] } }, { assignedTo: { $in: await getTeamUserIds(req.user.teamIds || []) } }] }
          : null;
    if (!scope) return res.status(403).json({ success: false, message: 'Access denied.' });
    const total = await Lead.countDocuments(scope);
    const leads = await Lead.countDocuments({ ...scope, status: 'lead' });
    const active = await Lead.countDocuments({ ...scope, status: 'active' });
    const closed = await Lead.countDocuments({ ...scope, status: 'closed' });
    const lost = await Lead.countDocuments({ ...scope, status: 'lost' });

    res.status(200).json({
      success: true,
      data: {
        total,
        leads,
        active,
        closed,
        lost,
        conversionRate: total > 0 ? ((closed / total) * 100).toFixed(2) : 0,
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
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadstats,
};