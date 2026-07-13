const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a stage name'],
    unique: true,
  },
  description: {
    type: String,
  },
  order: {
    type: Number,
    required: true,
    unique: true,
  },
  color: {
    type: String,
    default: '#4CAF50',
  },
  isActive: {
    type: Boolean,
    default: true,
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

stageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Stage', stageSchema);