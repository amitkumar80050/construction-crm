const express = require('express');
const router = express.Router();
const { protect, admin, manager } = require('../middleware/authMiddleware');
const { getMyLogs, getManagedEmployees, getEmployeeLogs, getAllLogs } = require('../controllers/activityLogController');

router.get('/logs/my', protect, getMyLogs);
router.get('/manager/logs/employees', protect, manager, getManagedEmployees);
router.get('/manager/logs/:userId', protect, manager, getEmployeeLogs);
router.get('/admin/logs', protect, admin, getAllLogs);

module.exports = router;