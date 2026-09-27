const Stage = require('../models/Stage');
const Client = require('../models/Client');
const Activity = require('../models/Activity');
const Remark = require('../models/Remark');

const DEFAULT_STAGES = [
  { name: 'New', order: 1, color: '#3b82f6', description: 'Newly captured lead' },
  { name: 'Connected', order: 2, color: '#06b6d4', description: 'Initial contact made by telecaller' },
  { name: 'Interested', order: 3, color: '#8b5cf6', description: 'Prospect expressed positive interest' },
  { name: 'Follow-up', order: 4, color: '#f59e0b', description: 'Scheduled follow-up discussion' },
  { name: 'Site Visit Planned', order: 5, color: '#ec4899', description: 'Site inspection planned; executive to be assigned' },
  { name: 'Site Visit Done', order: 6, color: '#10b981', description: 'Executive verified site visit with photo & GPS' },
  { name: 'Quotation', order: 7, color: '#6366f1', description: 'Price quote or formal proposal submitted' },
  { name: 'Converted', order: 8, color: '#22c55e', description: 'Deal closed and contracted' },
  { name: 'Lost', order: 9, color: '#ef4444', description: 'Deal lost or disqualified' },
];

// Helper to seed standard stages if empty or ensure all standard stages exist
const ensureStandardStages = async () => {
  const count = await Stage.countDocuments();
  if (count === 0) {
    await Stage.insertMany(DEFAULT_STAGES);
  }
};

// @desc    Get all stages
// @route   GET /api/stages
// @access  Private
const getStages = async (req, res) => {
  try {
    await ensureStandardStages();

    const stages = await Stage.find({ isActive: true }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: stages.length,
      data: stages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get single stage
// @route   GET /api/stages/:id
// @access  Private
const getStage = async (req, res) => {
  try {
    const stage = await Stage.findById(req.params.id);

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    res.status(200).json({
      success: true,
      data: stage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Create stage
// @route   POST /api/stages
// @access  Private/Admin
const createStage = async (req, res) => {
  try {
    const stage = await Stage.create(req.body);

    await Activity.create({
      user: req.user.id,
      type: 'create',
      module: 'stage',
      description: `Created stage: ${stage.name}`,
    });

    res.status(201).json({
      success: true,
      data: stage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update stage
// @route   PUT /api/stages/:id
// @access  Private/Admin
const updateStage = async (req, res) => {
  try {
    let stage = await Stage.findById(req.params.id);

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    stage = await Stage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await Activity.create({
      user: req.user.id,
      type: 'update',
      module: 'stage',
      description: `Updated stage: ${stage.name}`,
    });

    res.status(200).json({
      success: true,
      data: stage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Delete stage
// @route   DELETE /api/stages/:id
// @access  Private/Admin
const deleteStage = async (req, res) => {
  try {
    const stage = await Stage.findById(req.params.id);

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    // Check if stage is in use
    const clientsUsingStage = await Client.countDocuments({ currentStage: stage._id });
    if (clientsUsingStage > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete stage as it is being used by ${clientsUsingStage} leads`,
      });
    }

    await stage.deleteOne();

    await Activity.create({
      user: req.user.id,
      type: 'delete',
      module: 'stage',
      description: `Deleted stage: ${stage.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Stage deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get stage change history for a client
// @route   GET /api/stages/history/:clientId
// @access  Private
const getClientStageHistory = async (req, res) => {
  try {
    const history = await Activity.find({
      client: req.params.clientId,
      module: 'stage',
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update client stage with role-based validation and notes
// @route   PUT /api/stages/client/:clientId
// @access  Private
const updateClientStage = async (req, res) => {
  try {
    const { stageId, notes, followUpDate } = req.body;
    const client = await Client.findById(req.params.clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Lead/Client not found',
      });
    }

    const targetStage = await Stage.findById(stageId);
    if (!targetStage) {
      return res.status(404).json({
        success: false,
        message: 'Target stage not found',
      });
    }

    const userRole = req.user.role;
    const targetStageName = targetStage.name.toLowerCase();

    // Role-to-Stage Permission Enforcement from Executive Summary:
    // Telecaller: Stages up to "Site Visit Planned" (or Lost). Cannot mark "Site Visit Done", "Quotation", or "Converted".
    if (userRole === 'telecaller') {
      const restrictedStagesForTelecaller = ['site visit done', 'quotation', 'converted'];
      if (restrictedStagesForTelecaller.some((s) => targetStageName.includes(s))) {
        return res.status(403).json({
          success: false,
          message: `Telecallers can only advance leads up to 'Site Visit Planned'. Marking '${targetStage.name}' requires Manager or Sales Executive verification.`,
        });
      }

      // Mandatory notes on stage updates
      if (['follow-up', 'interested', 'connected'].some((s) => targetStageName.includes(s))) {
        if (!notes || !notes.trim()) {
          return res.status(400).json({
            success: false,
            message: `Call outcome notes are mandatory when moving lead to '${targetStage.name}'.`,
          });
        }
      }
    }

    // Sales Executive: Cannot finalize Quotation or Converted (Manager/Admin only)
    if (userRole === 'sales executer' || userRole === 'user') {
      const restrictedForSales = ['quotation', 'converted'];
      if (restrictedForSales.some((s) => targetStageName.includes(s))) {
        return res.status(403).json({
          success: false,
          message: `Finalizing '${targetStage.name}' requires Manager or Admin approval.`,
        });
      }
    }

    // Apply stage change
    client.currentStage = stageId;
    client.lastContactDate = new Date();
    if (followUpDate) {
      client.nextContactDate = new Date(followUpDate);
    }
    await client.save();

    // Create a Remark entry if notes provided
    if (notes && notes.trim()) {
      await Remark.create({
        client: client._id,
        user: req.user._id,
        content: `[Stage changed to ${targetStage.name}]: ${notes}`,
        type: targetStageName.includes('follow') ? 'follow-up' : 'call',
        visibility: 'public',
      });
    }

    // Log Activity
    await Activity.create({
      user: req.user._id,
      client: client._id,
      type: 'update',
      module: 'stage',
      description: `Updated ${client.name} stage to ${targetStage.name}${notes ? ` ("${notes}")` : ''}`,
    });

    const updatedClient = await Client.findById(client._id)
      .populate('assignedTo', 'name email')
      .populate('currentStage', 'name color order');

    res.status(200).json({
      success: true,
      message: `Lead advanced to ${targetStage.name}`,
      data: updatedClient,
    });
  } catch (error) {
    console.error('updateClientStage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error updating stage',
      error: error.message,
    });
  }
};

module.exports = {
  getStages,
  getStage,
  createStage,
  updateStage,
  deleteStage,
  updateClientStage,
  getClientStageHistory,
  ensureStandardStages,
};