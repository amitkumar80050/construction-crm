const Reminder = require('../models/Reminder');
const Activity = require('../models/Activity');
const { sendReminderEmail } = require('../services/notificationService');

// @desc    Get all reminders
// @route   GET /api/reminders
// @access  Private
const getReminders = async (req, res) => {
  try {
    let query = { user: req.user.id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by priority
    if (req.query.priority) {
      query.priority = req.query.priority;
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

    // Filter by client
    if (req.query.client) {
      query.client = req.query.client;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const total = await Reminder.countDocuments(query);

    const reminders = await Reminder.find(query)
      .populate('client', 'name company email phone')
      .populate('user', 'name email')
      .sort({ dueDate: 1 })
      .limit(limit)
      .skip(startIndex);

    // Update overdue status
    const now = new Date();
    const overdueReminders = reminders.filter(
      (r) => r.dueDate < now && r.status === 'pending'
    );

    for (const reminder of overdueReminders) {
      reminder.status = 'overdue';
      await reminder.save();
    }

    res.status(200).json({
      success: true,
      count: reminders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: reminders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
const getReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id)
      .populate('client', 'name company email phone')
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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Create reminder
// @route   POST /api/reminders
// @access  Private
const createReminder = async (req, res) => {
  try {
    const reminderData = {
      ...req.body,
      user: req.user.id,
    };

    const reminder = await Reminder.create(reminderData);

    // Send email notification
    if (req.body.sendEmail) {
      await sendReminderEmail(reminder);
    }

    // Log activity
    await Activity.create({
      user: req.user.id,
      client: reminder.client,
      type: 'create',
      module: 'reminder',
      description: `Created reminder: ${reminder.title}`,
    });

    const populatedReminder = await Reminder.findById(reminder._id)
      .populate('client', 'name company email')
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: populatedReminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
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

    // Check if user owns the reminder
    if (reminder.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reminder',
      });
    }

    reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('client', 'name company email')
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
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

    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
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

    if (reminder.user.toString() !== req.user.id && req.user.role !== 'admin') {
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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

module.exports = {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder,
};