// controllers/userController.js
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Delete associated guide profile if exists
  const Guide = require('../models/Guide');
  await Guide.deleteMany({ user_id: user._id });

  // Delete user's trips and associated trip_sites
  const Trip = require('../models/Trip');
  const TripSite = require('../models/TripSite');
  
  const trips = await Trip.find({ user_id: user._id });
  
  // For each trip, delete trip_sites first
  for (const trip of trips) {
    await TripSite.deleteMany({ trip_id: trip._id });
  }
  
  // Then delete the trips themselves
  await Trip.deleteMany({ user_id: user._id });

  // Delete user's reviews
  const Review = require('../models/Review');
  await Review.deleteMany({ user_id: user._id });

  // Finally delete the user
  await user.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get user's profile (current user)
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  // Get user with trips and reviews
  const user = await User.findById(req.user.id);
  
  // Get user's guide profile if role is Guide
  let guideProfile = null;
  if (user.role === 'Guide') {
    const Guide = require('../models/Guide');
    guideProfile = await Guide.findOne({ user_id: user._id });
  }
  
  // Get user's trips
  const Trip = require('../models/Trip');
  const trips = await Trip.find({ user_id: user._id });
  
  // Get user's reviews
  const Review = require('../models/Review');
  const reviews = await Review.find({ user_id: user._id }).populate({
    path: 'site_id',
    select: 'name image_url'
  });

  res.status(200).json({
    success: true,
    data: {
      user,
      guideProfile,
      tripsCount: trips.length,
      reviewsCount: reviews.length,
      recentTrips: trips.slice(0, 3),
      recentReviews: reviews.slice(0, 3)
    }
  });
});

// @desc    Update profile (current user)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  // Filter allowed fields (prevent role changes by regular users)
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    language: req.body.language
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});