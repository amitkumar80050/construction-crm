const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/authMiddleware');
const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadstats,
} = require('../controllers/LeadController');
const { distributeLeads } = require('../controllers/leadDistributionController');

router.route('/')
  .get(protect, getLeads)
  .post(protect, createLead);

router.post('/distribute', protect, distributeLeads);
router.get('/stats', protect, getLeadstats);

router.route('/:id')
  .get(protect, getLead)
  .put(protect, updateLead)
  .delete(protect, admin, deleteLead);

module.exports = router;