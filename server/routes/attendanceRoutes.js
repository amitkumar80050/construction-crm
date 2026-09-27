const express = require('express');
const router = express.Router();
const { protect, manager } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getPendingAttendance,
  approveAttendance,
  rejectAttendance,
  getTeamAttendance,
} = require('../controllers/attendanceController');

// All attendance routes are protected
router.use(protect);

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/my', getMyAttendance);

// Manager / Admin routes
router.get('/pending', manager, getPendingAttendance);
router.get('/team', manager, getTeamAttendance);
router.put('/:id/approve', manager, approveAttendance);
router.put('/:id/reject', manager, rejectAttendance);

module.exports = router;
