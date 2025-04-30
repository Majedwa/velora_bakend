// routes/users.js
const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateProfile
} = require('../controllers/userController');

const User = require('../models/User');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const { uploadSingle } = require('../middleware/upload');

// Routes for current user profile
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile/photo', protect, uploadSingle('profile_image'), updateProfilePhoto);

// Admin only routes
router
  .route('/')
  .get(protect, authorize('Admin'), advancedResults(User), getUsers)
  .post(protect, authorize('Admin'), createUser);

router
  .route('/:id')
  .get(protect, authorize('Admin'), getUser)
  .put(protect, authorize('Admin'), updateUser)
  .delete(protect, authorize('Admin'), deleteUser);

// Function to handle profile photo upload - should be defined in userController
function updateProfilePhoto(req, res, next) {
  // This is a placeholder - the actual implementation would be in userController
  res.status(200).json({
    success: true,
    data: { message: 'Profile photo updated' }
  });
}

module.exports = router;