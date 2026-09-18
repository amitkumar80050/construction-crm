const whatsappService = require('../services/whatsappService');
const WhatsAppMessage = require('../models/WhatsAppMessage');

// @desc  Start/init WhatsApp client (generates QR if not yet linked)
// @route POST /api/whatsapp/init
// @access Private
const init = (req, res) => {
  whatsappService.initWhatsApp();
  res.status(200).json({ success: true, message: 'WhatsApp client initializing...' });
};

// @desc  Get current connection status + QR (if pending)
// @route GET /api/whatsapp/status
// @access Private
const getStatus = (req, res) => {
  res.status(200).json({ success: true, data: whatsappService.getStatus() });
};

// @desc  Disconnect / logout WhatsApp
// @route POST /api/whatsapp/logout
// @access Private
const logout = (req, res) => {
  whatsappService.logout();
  res.status(200).json({ success: true, message: 'WhatsApp disconnected.' });
};

// @desc  Send a message to a client's phone
// @route POST /api/whatsapp/send
// @access Private
const sendMessage = async (req, res) => {
  try {
    const { phone, body } = req.body;
    if (!phone || !body) {
      return res.status(400).json({ success: false, message: 'Phone and message body are required' });
    }
    await whatsappService.sendMessage(phone, body, req.user.id);
    res.status(200).json({ success: true, message: 'Message sent.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Get chat history for a specific client
// @route GET /api/whatsapp/messages/:clientId
// @access Private
const getMessagesByClient = async (req, res) => {
  try {
    const messages = await WhatsAppMessage.find({ client: req.params.clientId })
      .sort({ createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load messages.' });
  }
};

module.exports = { init, getStatus, logout, sendMessage, getMessagesByClient };