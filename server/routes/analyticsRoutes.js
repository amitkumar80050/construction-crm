const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getDashboardAnalytics,
  getUserPerformance,
  getReminderAnalytics,
} = require('../controllers/analyticsController');

router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/performance', protect, admin, getUserPerformance);
router.get('/reminders', protect, getReminderAnalytics);

module.exports = router;