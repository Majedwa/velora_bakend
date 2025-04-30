// controllers/guideController.js
const Guide = require('../models/Guide');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all guides
// @route   GET /api/guides
// @access  Public
exports.getGuides = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single guide
// @route   GET /api/guides/:id
// @access  Public
exports.getGuide = asyncHandler(async (req, res, next) => {
  const guide = await Guide.findById(req.params.id).populate({
    path: 'user_id',
    select: 'name email'
  });

  if (!guide) {
    return next(
      new ErrorResponse(`Guide not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: guide
  });
});

// @desc    Create guide profile (for users with role="Guide")
// @route   POST /api/guides
// @access  Private (Only for users with role="Guide")
exports.createGuide = asyncHandler(async (req, res, next) => {
  // Add user id to req.body
  req.body.user_id = req.user.id;

  // Check if user is a guide
  if (req.user.role !== 'Guide') {
    return next(
      new ErrorResponse(`User must have a Guide role to create a guide profile`, 403)
    );
  }

  // Check if guide profile already exists
  const existingGuide = await Guide.findOne({ user_id: req.user.id });

  if (existingGuide) {
    return next(
      new ErrorResponse(`User already has a guide profile`, 400)
    );
  }

  // Create guide profile
  const guide = await Guide.create(req.body);

  res.status(201).json({
    success: true,
    data: guide
  });
});

// @desc    Update guide profile
// @route   PUT /api/guides/:id
// @access  Private
exports.updateGuide = asyncHandler(async (req, res, next) => {
  let guide = await Guide.findById(req.params.id);

  if (!guide) {
    return next(
      new ErrorResponse(`Guide not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is the guide owner or an admin
  if (guide.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to update this guide profile`, 401)
    );
  }

  // Remove user_id from req.body if it exists to prevent changing the owner
  if (req.body.user_id) {
    delete req.body.user_id;
  }

  guide = await Guide.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: guide
  });
});

// @desc    Delete guide profile
// @route   DELETE /api/guides/:id
// @access  Private
exports.deleteGuide = asyncHandler(async (req, res, next) => {
  const guide = await Guide.findById(req.params.id);

  if (!guide) {
    return next(
      new ErrorResponse(`Guide not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is the guide owner or an admin
  if (guide.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to delete this guide profile`, 401)
    );
  }

  await guide.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get guides by language
// @route   GET /api/guides/language/:language
// @access  Public
exports.getGuidesByLanguage = asyncHandler(async (req, res, next) => {
  const guides = await Guide.find({
    languages: { $in: [req.params.language] }
  }).populate({
    path: 'user_id',
    select: 'name email'
  });

  res.status(200).json({
    success: true,
    count: guides.length,
    data: guides
  });
});

// @desc    Get featured guides (showcase experience)
// @route   GET /api/guides/featured
// @access  Public
exports.getFeaturedGuides = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 5;
  
  // In a real implementation, you might have additional criteria for featuring guides
  // For now, we'll just get the most recently added guides
  const guides = await Guide.find()
    .sort('-createdAt')
    .limit(limit)
    .populate({
      path: 'user_id',
      select: 'name'
    });

  res.status(200).json({
    success: true,
    count: guides.length,
    data: guides
  });
});

// @desc    Search guides by name, language, or location
// @route   GET /api/guides/search
// @access  Public
exports.searchGuides = asyncHandler(async (req, res, next) => {
  const { name, language, location } = req.query;
  
  // Build query object
  const query = {};
  
  if (language) {
    query.languages = { $in: [language] };
  }
  
  // Find guides that match query
  let guides = await Guide.find(query).populate({
    path: 'user_id',
    select: 'name email'
  });
  
  // If name was provided, filter guides by user name (since name is in the User model)
  if (name && guides.length > 0) {
    guides = guides.filter(guide => {
      const userName = guide.user_id ? guide.user_id.name.toLowerCase() : '';
      return userName.includes(name.toLowerCase());
    });
  }
  
  res.status(200).json({
    success: true,
    count: guides.length,
    data: guides
  });
});