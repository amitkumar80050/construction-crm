const Client = require('../models/Client');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');

const getTeamUserIds = async (teamIds) => (await User.find({ teamIds: { $in: teamIds } }).distinct('_id'));

const canAccessClient = async (client, req) => {
  if (req.user.role === 'admin') return true;
  if (['telecaller', 'sales executer'].includes(req.user.role)) {
    return String(client.assignedTo?._id || client.assignedTo) === String(req.user.id);
  }
  if (req.user.role !== 'manager') return false;
  const teamIds = (req.user.teamIds || []).map(String);
  if (client.team && teamIds.includes(String(client.team))) return true;
  const ownerId = client.assignedTo?._id || client.assignedTo;
  if (!ownerId) return false;
  const owner = await User.findById(ownerId).select('teamIds');
  return (owner?.teamIds || []).some((teamId) => teamIds.includes(String(teamId)));
};

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
const getClients = async (req, res) => {
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
      filters.push({ $or: [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ] });
    }
    const query = filters.length > 1 ? { $and: filters } : filters[0] || {};

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Client.countDocuments(query);

    const clients = await Client.find(query)
      .populate('assignedTo', 'name email')
      .populate('currentStage', 'name color')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    res.status(200).json({
      success: true,
      count: clients.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: clients,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('currentStage', 'name color description');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    if (!await canAccessClient(client, req)) return res.status(403).json({ success: false, message: 'You can only view leads assigned to you or your team.' });

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Create client
// @route   POST /api/clients
// @access  Private
const createClient = async (req, res) => {
  try {
    if (!['admin', 'manager', 'telecaller'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only Admins, Managers, and Telecallers can create leads.' });
    }
    const clientData = { ...req.body };
    const email = typeof clientData.email === 'string' ? clientData.email.trim().toLowerCase() : '';
    const phone = typeof clientData.phone === 'string' ? clientData.phone.replace(/\D/g, '') : '';
    if (!clientData.name?.trim() || !clientData.source) {
      return res.status(400).json({ success: false, message: 'Name and source are required.' });
    }
    if (!email && !phone) return res.status(400).json({ success: false, message: 'A valid phone number or email is required.' });
    if (phone && (phone.length < 7 || phone.length > 15)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain between 7 and 15 digits.' });
    }
    const contactQuery = [];
    if (email) contactQuery.push({ email });
    if (phone) contactQuery.push({ phone });
    const duplicate = await Client.findOne({ $or: contactQuery }).select('name');
    if (duplicate) return res.status(409).json({ success: false, message: `A lead already exists with this email or phone (${duplicate.name}).` });

    let teamId = req.user.role === 'admin' ? clientData.team : (req.user.teamIds || [])[0];
    if (req.user.role === 'manager' && clientData.team && !(req.user.teamIds || []).some((id) => String(id) === String(clientData.team))) {
      return res.status(403).json({ success: false, message: 'You can only create leads for your own team.' });
    }
    if (req.user.role === 'admin' && teamId && !await Team.exists({ _id: teamId })) {
      return res.status(400).json({ success: false, message: 'Team not found.' });
    }
    clientData.email = email;
    clientData.phone = phone;
    clientData.company = clientData.company?.trim() || clientData.name.trim();
    clientData.team = teamId || null;
    clientData.assignedTo = req.user.role === 'telecaller' ? req.user.id : null;
    clientData.createdBy = req.user.id;
    clientData.pipelineStage = 'NEW';

    // Generate client ID
    clientData.clientId = await Client.generateClientId();

    const client = await Client.create(clientData);

    // Log activity
    await Activity.create({
      user: req.user.id,
      client: client._id,
      type: 'create',
      module: 'client',
      description: `Created lead: ${client.name} (${client.company})`,
    });

    res.status(201).json({
      success: true,
      data: client,
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

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
const updateClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    if (!await canAccessClient(client, req)) {
      return res.status(403).json({ success: false, message: 'You can only edit leads assigned to you or your team.' });
    }
    if (!['admin', 'manager', 'telecaller'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Your role cannot edit lead details.' });
    }

    const editableFields = ['name', 'company', 'email', 'phone', 'address', 'source', 'status', 'projectValue', 'notes', 'tags', 'followUpDate', 'nextContactDate'];
    const updateData = Object.fromEntries(Object.entries(req.body).filter(([key]) => editableFields.includes(key)));
    if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();

    client = await Client.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    // Log activity
    await Activity.create({
      user: req.user.id,
      client: client._id,
      type: 'update',
      module: 'client',
      description: `Updated lead: ${client.name}`,
    });

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private/Admin
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    await client.deleteOne();

    // Log activity
    await Activity.create({
      user: req.user.id,
      client: client._id,
      type: 'delete',
      module: 'client',
      description: `Deleted lead: ${client.name}`,
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

// @desc    Get client statistics
// @route   GET /api/clients/stats
// @access  Private
const getClientStats = async (req, res) => {
  try {
    const scope = req.user.role === 'admin'
      ? {}
      : ['telecaller', 'sales executer'].includes(req.user.role)
        ? { assignedTo: req.user.id }
        : req.user.role === 'manager'
          ? { $or: [{ team: { $in: req.user.teamIds || [] } }, { assignedTo: { $in: await getTeamUserIds(req.user.teamIds || []) } }] }
          : null;
    if (!scope) return res.status(403).json({ success: false, message: 'Access denied.' });
    const total = await Client.countDocuments(scope);
    const leads = await Client.countDocuments({ ...scope, status: 'lead' });
    const active = await Client.countDocuments({ ...scope, status: 'active' });
    const closed = await Client.countDocuments({ ...scope, status: 'closed' });
    const lost = await Client.countDocuments({ ...scope, status: 'lost' });

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
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
};