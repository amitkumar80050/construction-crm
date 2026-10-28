const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { triggerVapiOutboundCall, handleVapiWebhook } = require('../services/vapiService');

// @route   POST /api/vapi/call/:leadId
// @desc    Trigger real outbound cellular phone call to lead via Vapi
// @access  Private
router.post('/call/:leadId', protect, async (req, res) => {
  try {
    const result = await triggerVapiOutboundCall(req.params.leadId, req.user, req.body);
    res.json({ success: true, message: 'Outbound cellular call placed successfully', ...result });
  } catch (error) {
    console.error('Vapi Call error:', error.message);
    const isCarrierIssue = error.message.includes('Free Vapi numbers') || error.message.includes('international') || error.message.includes('VAPI_API_KEY');
    res.status(isCarrierIssue ? 400 : 500).json({ success: false, message: error.message, isCarrierIssue });
  }
});

// @route   POST /api/vapi/webhook
// @desc    Receive call completion report and auto-advance lead stages
// @access  Public (called by Vapi servers)
router.post('/webhook', async (req, res) => {
  try {
    const result = await handleVapiWebhook(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Vapi Webhook error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
