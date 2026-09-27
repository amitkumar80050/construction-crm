const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/authMiddleware');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
} = require('../controllers/clientController');
const { distributeLeads } = require('../controllers/leadDistributionController');

router.route('/')
  .get(protect, getClients)
  .post(protect, createClient);

router.post('/distribute', protect, distributeLeads);
router.get('/stats', protect, getClientStats);

router.route('/:id')
  .get(protect, getClient)
  .put(protect, updateClient)
  .delete(protect, admin, deleteClient);

module.exports = router;