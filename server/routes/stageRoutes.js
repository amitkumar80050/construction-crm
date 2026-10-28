const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getStages,
  getStage,
  createStage,
  updateStage,
  deleteStage,
  updateLeadstage,
  getLeadstageHistory,
} = require('../controllers/stageController');

router.route('/')
  .get(protect, getStages)
  .post(protect, admin, createStage);

router.put('/Lead/:LeadId', protect, updateLeadstage);
router.get('/history/:LeadId', protect, getLeadstageHistory);

router.route('/:id')
  .get(protect, getStage)
  .put(protect, admin, updateStage)
  .delete(protect, admin, deleteStage);

module.exports = router;