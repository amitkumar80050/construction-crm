const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const whatsappController = require('../controllers/whatsappController');

router.post('/init', protect, whatsappController.init);
router.get('/status', protect, whatsappController.getStatus);
router.post('/logout', protect, whatsappController.logout);
router.post('/send', protect, whatsappController.sendMessage);
router.get('/messages/:clientId', protect, whatsappController.getMessagesByClient);

module.exports = router;