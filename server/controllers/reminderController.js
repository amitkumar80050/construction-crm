const Reminder = require('../models/Reminder');
const Activity = require('../models/Activity');
const { sendReminderEmail } = require('../services/notificationService');

// @desc    Get all reminders (optionally filtered by Lead, status, priority, etc.)
// @route   GET /api/reminders
// @access  Private
const getReminders = async (req, res) => {
  try {
    // 1. Automatically update overdue pending reminders in database safely without triggering doc validation
    const now = new Date();
    try {
      await Reminder.updateMany(
        { dueDate: { $lt: now }, status: 'pending' },
        { $set: { status: 'overdue' } }
      );
    } catch (err) {
      console.warn('Overdue status update warning:', err.message);
    }

    let query = {};

    const targetLeadId = req.query.Lead || req.query.lead || req.query.LeadId || req.query.leadId;

    if (targetLeadId && targetLeadId !== 'all') {
      // Filter by Lead (capital L in schema)
      query.Lead = targetLeadId;
    } else {
      // General reminder list: non-admin/manager only sees own reminders
      if (req.user && req.user.role !== 'admin' && req.user.role !== 'manager') {
        query.user = req.user._id || req.user.id;
      }
    }

    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    // Filter by priority
    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }

    // Filter by type
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }

    // Search query
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const Lead = require('../models/Lead');
      const matchingLeads = await Lead.find({
        $or: [
          { name: searchRegex },
          { company: searchRegex },
          { phone: searchRegex }
        ]
      }).select('_id');
      const leadIds = matchingLeads.map((l) => l._id);

      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { Lead: { $in: leadIds } }
      ];
    }

    // Filter by due date
    if (req.query.dueDate) {
      const date = new Date(req.query.dueDate);
      query.dueDate = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    // Upcoming reminders
    if (req.query.upcoming === 'true') {
      query.dueDate = { $gte: new Date() };
      query.status = 'pending';
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const startIndex = (page - 1) * limit;

    const total = await Reminder.countDocuments(query);

    const reminders = await Reminder.find(query)
      .populate('Lead', 'name company email phone')
      .populate('user', 'name email role')
      .sort({ dueDate: 1 })
      .limit(limit)
      .skip(startIndex);

    res.status(200).json({
      success: true,
      count: reminders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: reminders,
    });
  } catch (error) {
    console.error('getReminders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Get reminders by Lead ID
// @route   GET /api/reminders/Lead/:LeadId
// @access  Private
const getRemindersByLead = async (req, res) => {
  try {
    const targetLeadId = req.params.LeadId || req.params.leadId;
    const reminders = await Reminder.find({ Lead: targetLeadId })
      .populate('Lead', 'name company email phone')
      .populate('user', 'name email')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    console.error('getRemindersByLead error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
const getReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id)
      .populate('Lead', 'name company email phone')
      .populate('user', 'name email');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('getReminder error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Create reminder
// @route   POST /api/reminders
// @access  Private
const createReminder = async (req, res) => {
  try {
    const targetLeadId = req.body.Lead || req.body.lead || req.body.LeadId || req.body.leadId;
    if (!targetLeadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const userId = req.user._id || req.user.id;

    const reminderData = {
      ...req.body,
      Lead: targetLeadId,
      user: userId,
    };

    const reminder = await Reminder.create(reminderData);

    // Send email notification safely
    if (req.body.sendEmail) {
      try {
        await sendReminderEmail(reminder);
      } catch (emailErr) {
        console.error('sendReminderEmail error:', emailErr);
      }
    }

    // Log activity safely
    try {
      await Activity.create({
        user: userId,
        Lead: reminder.Lead,
        type: 'create',
        module: 'reminder',
        description: `Created reminder: ${reminder.title}`,
      });
    } catch (actErr) {
      console.error('Activity log error:', actErr);
    }

    const populatedReminder = await Reminder.findById(reminder._id)
      .populate('Lead', 'name company email')
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: populatedReminder,
    });
  } catch (error) {
    console.error('createReminder error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
const updateReminder = async (req, res) => {
  try {
    let reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    const currentUserId = String(req.user._id || req.user.id);

    // Check if user owns the reminder or is admin
    if (reminder.user.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reminder',
      });
    }

    reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('Lead', 'name company email')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error('updateReminder error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Complete reminder
// @route   PUT /api/reminders/:id/complete
// @access  Private
const completeReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    reminder.status = 'completed';
    reminder.completedAt = Date.now();
    await reminder.save();

    const populated = await Reminder.findById(reminder._id)
      .populate('Lead', 'name company email phone')
      .populate('user', 'name email role');

    res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    console.error('completeReminder error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    const currentUserId = String(req.user._id || req.user.id);

    if (reminder.user.toString() !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reminder',
      });
    }

    await reminder.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    console.error('deleteReminder error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error',
    });
  }
};

module.exports = {
  getReminders,
  getRemindersByLead,
  getReminder,
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder,
};