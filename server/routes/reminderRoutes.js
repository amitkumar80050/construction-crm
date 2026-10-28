const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getReminders,
  getRemindersByLead,
  getReminder,
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder,
} = require('../controllers/reminderController');

router.route('/')
  .get(protect, getReminders)
  .post(protect, createReminder);

router.get('/Lead/:LeadId', protect, getRemindersByLead);
router.get('/lead/:leadId', protect, getRemindersByLead);

router.put('/:id/complete', protect, completeReminder);

router.route('/:id')
  .get(protect, getReminder)
  .put(protect, updateReminder)
  .delete(protect, deleteReminder);

module.exports = router;