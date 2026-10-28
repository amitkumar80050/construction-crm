const Remark = require('../models/Remark');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');

const canAccessLead = async (leadId, req) => {
  if (!leadId) return false;
  if (!req.user) return false;
  if (['admin', 'manager'].includes(req.user.role)) return true;

  try {
    const leadDoc = await Lead.findById(leadId).select('assignedTo createdBy team');
    if (!leadDoc) return false;

    const currentUserId = String(req.user._id || req.user.id);
    const assignedId = leadDoc.assignedTo ? String(leadDoc.assignedTo._id || leadDoc.assignedTo) : null;

    if (assignedId && assignedId === currentUserId) return true;
    if (leadDoc.createdBy && String(leadDoc.createdBy) === currentUserId) return true;

    const userTeamIds = (req.user.teamIds || []).map(String);
    const leadTeamId = leadDoc.team ? String(leadDoc.team._id || leadDoc.team) : null;
    if (leadTeamId && userTeamIds.includes(leadTeamId)) return true;

    if (!assignedId) return true;

    return false;
  } catch (err) {
    console.error('canAccessLead error:', err);
    return true;
  }
};
const canAccesslead = canAccessLead;

// @desc    Get all remarks for a Lead
// @route   GET /api/remarks/Lead/:LeadId
// @access  Private
const getRemarksByLead = async (req, res) => {
  try {
    const targetLeadId = req.params.LeadId || req.params.leadId;
    if (!(await canAccessLead(targetLeadId, req))) {
      return res.status(403).json({ success: false, message: 'You can only view notes for your own leads' });
    }
    const remarks = await Remark.find({ Lead: targetLeadId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: remarks.length,
      data: remarks,
    });
  } catch (error) {
    console.error('getRemarksByLead error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};
const getRemarksBylead = getRemarksByLead;

// @desc    Get all remarks (optionally filtered)
// @route   GET /api/remarks
// @access  Private
const getAllRemarks = async (req, res) => {
  try {
    let query = {};

    const targetLead = req.query.Lead || req.query.lead;
    if (targetLead && targetLead !== 'all') {
      query.Lead = targetLead;
    }
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }
    if (req.query.visibility && req.query.visibility !== 'all') {
      query.visibility = req.query.visibility;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matchingLeads = await Lead.find({
        $or: [
          { name: searchRegex },
          { company: searchRegex },
          { phone: searchRegex }
        ]
      }).select('_id');
      const leadIds = matchingLeads.map((l) => l._id);

      query.$or = [
        { content: searchRegex },
        { Lead: { $in: leadIds } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const startIndex = (page - 1) * limit;

    const total = await Remark.countDocuments(query);

    const remarks = await Remark.find(query)
      .populate('user', 'name email role')
      .populate('Lead', 'name company phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    res.status(200).json({
      success: true,
      count: remarks.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: remarks,
    });
  } catch (error) {
    console.error('getAllRemarks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
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
      .populate('Lead', 'name company');

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
    console.error('getRemark error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Create remark
// @route   POST /api/remarks
// @access  Private
const createRemark = async (req, res) => {
  try {
    const { content, type, visibility } = req.body;
    const targetLeadId = req.body.Lead || req.body.lead || req.body.LeadId || req.body.leadId;

    if (!targetLeadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    if (!(await canAccessLead(targetLeadId, req))) {
      return res.status(403).json({ success: false, message: 'You can only add notes to your own leads' });
    }

    const userId = req.user._id || req.user.id;

    const remark = await Remark.create({
      Lead: targetLeadId,
      user: userId,
      content,
      type: type || 'note',
      visibility: visibility || 'public',
    });

    // Update lead last contact date
    await Lead.findByIdAndUpdate(targetLeadId, {
      lastContactDate: Date.now(),
    });

    // Log activity safely
    try {
      await Activity.create({
        user: userId,
        Lead: targetLeadId,
        type: 'create',
        module: 'remark',
        description: 'Added remark for lead',
      });
    } catch (actErr) {
      console.error('Activity log error:', actErr);
    }

    const populatedRemark = await Remark.findById(remark._id)
      .populate('user', 'name email role')
      .populate('Lead', 'name company phone');

    res.status(201).json({
      success: true,
      data: populatedRemark,
    });
  } catch (error) {
    console.error('createRemark error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
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

    const currentUserId = String(req.user._id || req.user.id);

    // Check if user owns the remark or is admin
    if (remark.user.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this remark',
      });
    }

    remark = await Remark.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name email role')
      .populate('Lead', 'name company phone');

    res.status(200).json({
      success: true,
      data: remark,
    });
  } catch (error) {
    console.error('updateRemark error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
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

    const currentUserId = String(req.user._id || req.user.id);

    // Check if user owns the remark or is admin
    if (remark.user.toString() !== currentUserId && req.user.role !== 'admin') {
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
    console.error('deleteRemark error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

module.exports = {
  getRemarksByLead,
  getRemarksBylead,
  getAllRemarks,
  getRemark,
  createRemark,
  updateRemark,
  deleteRemark,
};