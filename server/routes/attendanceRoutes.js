const express = require('express');
const router = express.Router();
const { protect, manager } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/attendanceController');

router.use(protect);
router.post('/checkin', ctrl.checkIn);
router.post('/checkout', ctrl.checkOut);
router.get('/my', ctrl.getMyAttendance);
router.get('/pending', manager, ctrl.getPendingForTeam);
router.put('/:id/approve', manager, ctrl.approveAttendance);
router.put('/:id/reject', manager, ctrl.rejectAttendance);

router.post('/mark', ctrl.markAttendance);
router.put('/:id/review', manager, ctrl.reviewAttendance);

module.exports = router;