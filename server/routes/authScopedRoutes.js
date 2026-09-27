const express = require('express');
const router = express.Router();
const { protect, admin, manager } = require('../middleware/authMiddleware');
const { canManageUser } = require('../middleware/teamAuthMiddleware');
const teamController = require('../controllers/teamController');
const userController = require('../controllers/userController');

// Teams
router.get('/teams', protect, admin, teamController.getTeams);
router.post('/teams', protect, admin, teamController.createTeam);
router.put('/teams/:id', protect, admin, (req, res) => teamController.updateTeam({ ...req, params: { teamId: req.params.id } }, res));
router.delete('/teams/:id', protect, admin, (req, res) => teamController.deleteTeam({ ...req, params: { teamId: req.params.id } }, res));

// Users — scoped to Admin (all) / Manager (own team)
router.get('/users', protect, manager, userController.listUsersScoped);
router.post('/users', protect, admin, userController.createUser);
router.put('/users/:id', protect, manager, canManageUser, userController.updateUserRestricted);
router.delete('/users/:id', protect, admin, userController.softDeleteUser);

module.exports = router;