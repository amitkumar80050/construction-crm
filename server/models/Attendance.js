const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true }, // 'YYYY-MM-DD', one record per user per day
  checkInTime: Date,
  checkOutTime: Date,
  markedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerRemarks: { type: String, trim: true, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String,
});

attendanceSchema.index({ user: 1, date: 1 }, { unique: true }); // one attendance mark per user per day

module.exports = mongoose.model('Attendance', attendanceSchema);