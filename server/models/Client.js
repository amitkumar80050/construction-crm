const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a lead name'],
    trim: true,
  },
  company: {
    type: String,
    required: [true, 'Please add a company name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'social_media', 'email', 'call', 'other'],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['lead', 'active', 'closed', 'lost'],
    default: 'lead',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  currentStage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage',
  },
  projectValue: {
    type: Number,
    min: 0,
  },
  notes: {
    type: String,
  },
  tags: [String],
  lastContactDate: {
    type: Date,
  },
  nextContactDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate client ID
clientSchema.statics.generateClientId = async function () {
  const lastClient = await this.findOne().sort({ createdAt: -1 });
  const lastId = lastClient ? parseInt(lastClient.clientId.split('-')[1]) : 0;
  return `CLT-${String(lastId + 1).padStart(4, '0')}`;
};

clientSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Client', clientSchema);