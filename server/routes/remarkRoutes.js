const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getRemarksByClient,
  getRemark,
  createRemark,
  updateRemark,
  deleteRemark,
} = require('../controllers/remarkController');

router.get('/client/:clientId', protect, getRemarksByClient);

router.route('/')
  .post(protect, createRemark);

router.route('/:id')
  .get(protect, getRemark)
  .put(protect, updateRemark)
  .delete(protect, deleteRemark);

module.exports = router;