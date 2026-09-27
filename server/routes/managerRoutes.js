const express = require('express');
const { protect, manager } = require('../middleware/authMiddleware');
const controller = require('../controllers/managerController');

const router = express.Router();
router.use(protect, manager);
router.get('/dashboard', controller.getDashboard);
router.post('/distribute', controller.distribute);
router.post('/assign-visit', controller.assignVisit);
router.get('/attendance', controller.listAttendance);
router.put('/attendance/:id', controller.updateAttendance);

module.exports = router;