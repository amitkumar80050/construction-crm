const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please add a reminder title'],
  },
  description: {
    type: String,
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date'],
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'overdue'],
    default: 'pending',
  },
  type: {
    type: String,
    enum: ['call', 'meeting', 'follow-up', 'task', 'other'],
    default: 'task',
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
  },
  completedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

reminderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Reminder', reminderSchema);