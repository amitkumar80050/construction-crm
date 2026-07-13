const Stage = require('../models/Stage');
const Client = require('../models/Client');
const Activity = require('../models/Activity');

// @desc    Get all stages
// @route   GET /api/stages
// @access  Private
const getStages = async (req, res) => {
  try {
    const stages = await Stage.find({ isActive: true })
      .sort({ order: 1 });

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
      .populate('user', 'name email')
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

// @desc    Update client stage
// @route   PUT /api/stages/client/:clientId
// @access  Private
const updateClientStage = async (req, res) => {
  try {
    const { stageId } = req.body;
    const client = await Client.findById(req.params.clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const stage = await Stage.findById(stageId);
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    client.currentStage = stageId;
    await client.save();

    await Activity.create({
      user: req.user.id,
      client: client._id,
      type: 'update',
      module: 'stage',
      description: `Updated lead ${client.name} stage to ${stage.name}`,
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

module.exports = {
  getStages,
  getStage,
  createStage,
  updateStage,
  deleteStage,
  updateClientStage,
  getClientStageHistory,
};