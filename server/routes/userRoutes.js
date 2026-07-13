const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
} = require('../controllers/userController');

router.get('/', protect, admin, getUsers);
router.put('/profile', protect, updateProfile);

router.route('/:id')
  .get(protect, admin, getUser)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router;