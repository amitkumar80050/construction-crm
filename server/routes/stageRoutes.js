const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getStages,
  getStage,
  createStage,
  updateStage,
  deleteStage,
  updateClientStage,
  getClientStageHistory,
} = require('../controllers/stageController');

router.route('/')
  .get(protect, getStages)
  .post(protect, admin, createStage);

router.put('/client/:clientId', protect, updateClientStage);
router.get('/history/:clientId', protect, getClientStageHistory);

router.route('/:id')
  .get(protect, getStage)
  .put(protect, admin, updateStage)
  .delete(protect, admin, deleteStage);

module.exports = router;