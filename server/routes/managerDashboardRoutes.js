const express = require('express');
const router = express.Router();
const { protect, manager } = require('../middleware/authMiddleware');
const { getManagerDashboard } = require('../controllers/managerDashboardController');

router.use(protect);
router.use(manager);

router.get('/dashboard', getManagerDashboard);

module.exports = router;
