const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: [true, 'Please add remark content'],
  },
  type: {
    type: String,
    enum: ['call', 'meeting', 'email', 'note', 'follow-up'],
    default: 'note',
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'team'],
    default: 'public',
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

remarkSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Remark', remarkSchema);