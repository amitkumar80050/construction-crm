const Remark = require('../models/Remark');
const Client = require('../models/Client');
const Activity = require('../models/Activity');

// @desc    Get all remarks for a client
// @route   GET /api/remarks/client/:clientId
// @access  Private
const getRemarksByClient = async (req, res) => {
  try {
    const remarks = await Remark.find({ client: req.params.clientId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: remarks.length,
      data: remarks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get single remark
// @route   GET /api/remarks/:id
// @access  Private
const getRemark = async (req, res) => {
  try {
    const remark = await Remark.findById(req.params.id)
      .populate('user', 'name email')
      .populate('client', 'name company');

    if (!remark) {
      return res.status(404).json({
        success: false,
        message: 'Remark not found',
      });
    }

    res.status(200).json({
      success: true,
      data: remark,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Create remark
// @route   POST /api/remarks
// @access  Private
const createRemark = async (req, res) => {
  try {
    const { client, content, type, visibility } = req.body;

    const remark = await Remark.create({
      client,
      user: req.user.id,
      content,
      type: type || 'note',
      visibility: visibility || 'public',
    });

    // Update client last contact date
    await Client.findByIdAndUpdate(client, {
      lastContactDate: Date.now(),
    });

    // Log activity
    await Activity.create({
      user: req.user.id,
      client: client,
      type: 'create',
      module: 'remark',
      description: `Added remark for lead`,
    });

    const populatedRemark = await Remark.findById(remark._id)
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: populatedRemark,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update remark
// @route   PUT /api/remarks/:id
// @access  Private
const updateRemark = async (req, res) => {
  try {
    let remark = await Remark.findById(req.params.id);

    if (!remark) {
      return res.status(404).json({
        success: false,
        message: 'Remark not found',
      });
    }

    // Check if user owns the remark or is admin
    if (remark.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this remark',
      });
    }

    remark = await Remark.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: remark,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Delete remark
// @route   DELETE /api/remarks/:id
// @access  Private
const deleteRemark = async (req, res) => {
  try {
    const remark = await Remark.findById(req.params.id);

    if (!remark) {
      return res.status(404).json({
        success: false,
        message: 'Remark not found',
      });
    }

    // Check if user owns the remark or is admin
    if (remark.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this remark',
      });
    }

    await remark.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Remark deleted successfully',
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
  getRemarksByClient,
  getRemark,
  createRemark,
  updateRemark,
  deleteRemark,
};