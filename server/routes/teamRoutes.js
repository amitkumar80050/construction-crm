const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');

// Admin-only management
router.post('/', protect, admin, teamController.createTeam);
router.get('/', protect, teamController.getTeams); // any authenticated user can see the team list (names/leads), not private data
router.get('/:teamId', protect, teamController.getTeam);
router.patch('/:teamId', protect, admin, teamController.updateTeam);
router.delete('/:teamId', protect, admin, teamController.deleteTeam);
router.post('/:teamId/members', protect, admin, teamController.addMember);
router.delete('/:teamId/members/:userId', protect, admin, teamController.removeMember);

module.exports = router;