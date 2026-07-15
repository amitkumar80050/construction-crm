const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  softDeleteUser,
  restoreUser,
  permanentlyDeleteUser,
  resetUserPassword,
  assignRole,
  assignPermissions,
  updateProfile,
} = require('../controllers/userController');

// Self-service (kept as-is)
router.put('/profile', protect, updateProfile);

// Admin: list + create
router.route('/')
  .get(protect, admin, getUsers)
  .post(protect, admin, createUser);

// Admin: single user CRUD + soft delete
router.route('/:id')
  .get(protect, admin, getUser)
  .put(protect, admin, updateUser)
  .delete(protect, admin, softDeleteUser);

// Admin: restore + permanent delete
router.put('/:id/restore', protect, admin, restoreUser);
router.delete('/:id/permanent', protect, admin, permanentlyDeleteUser);

// Admin: password, role, permissions
router.put('/:id/reset-password', protect, admin, resetUserPassword);
router.put('/:id/role', protect, admin, assignRole);
router.put('/:id/permissions', protect, admin, assignPermissions);

module.exports = router;