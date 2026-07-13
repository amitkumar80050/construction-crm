const Client = require('../models/Client');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
const getClients = async (req, res) => {
  try {
    let query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by assigned user
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    // Search by name or company
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

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
    const clientData = req.body;
    clientData.assignedTo = req.user.id;

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

    client = await Client.findByIdAndUpdate(req.params.id, req.body, {
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
    const total = await Client.countDocuments();
    const leads = await Client.countDocuments({ status: 'lead' });
    const active = await Client.countDocuments({ status: 'active' });
    const closed = await Client.countDocuments({ status: 'closed' });
    const lost = await Client.countDocuments({ status: 'lost' });

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