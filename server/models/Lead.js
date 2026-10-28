const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  LeadId: {
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
    trim: true,
    default: '',
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: '',
    validate: { validator: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: 'Please add a valid email' },
  },
  phone: {
    type: String,
    trim: true,
    default: '',
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
    default: null,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  pipelineStage: {
    type: String,
    enum: ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'],
    default: 'NEW',
  },
  followUpDate: { type: Date },

  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate leadID
LeadSchema.statics.generateLeadId = async function () {
  const lastLead = await this.findOne().sort({ createdAt: -1 });
  const lastId = lastLead && lastLead.LeadId ? parseInt(lastLead.LeadId.split('-')[1]) || 0 : 0;
  return `CLT-${String(lastId + 1).padStart(4, '0')}`;
};

LeadSchema.pre('save', function (next) {
  if (!this.company && this.name) this.company = this.name;
  this.updatedAt = Date.now();
  next();
});

LeadSchema.pre('validate', function (next) {
  if (!this.phone?.trim() && !this.email?.trim()) {
    this.invalidate('phone', 'A valid phone number or email is required');
  }
  if (this.phone) {
    const phoneDigits = this.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      this.invalidate('phone', 'Phone number must contain between 7 and 15 digits');
    } else {
      this.phone = phoneDigits;
    }
  }
  next();
});

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
