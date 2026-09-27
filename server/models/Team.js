const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  nameKey: { type: String, lowercase: true, trim: true, select: false },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: { type: String, default: 'sales' },
  description: { type: String },
  teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

teamSchema.index({ nameKey: 1 }, { unique: true, sparse: true });

teamSchema.pre('validate', function (next) {
  if (this.name) this.nameKey = this.name.trim().toLocaleLowerCase('en');
  next();
});

teamSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Team', teamSchema);