const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const leadController = require('../controllers/leadController');

router.get('/', protect, leadController.getLeads);
router.post('/', protect, leadController.createLead);
router.get('/my', protect, leadController.getMyLeads);
router.get('/:id', protect, leadController.getLeadDetails);
router.put('/:id', protect, leadController.reassignLead);
router.patch('/:id/stage', protect, leadController.changeStage);
router.post('/:id/notes', protect, leadController.addLeadNote);
router.post('/distribute', protect, leadController.distributeLeads);

module.exports = router;