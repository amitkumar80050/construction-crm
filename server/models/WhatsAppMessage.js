const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null, // null if the phone number doesn't match any known client
  },
  phone: {
    type: String,
    required: true,
    index: true,
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },
  body: {
    type: String,
    default: '',
  },
  waMessageId: {
    type: String,
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

whatsAppMessageSchema.index({ client: 1, createdAt: -1 });
whatsAppMessageSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);