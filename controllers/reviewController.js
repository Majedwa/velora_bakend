// controllers/reviewController.js
const Review = require('../models/Review');
const Site = require('../models/Site');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get reviews for a site
// @route   GET /api/sites/:siteId/reviews
// @access  Public
exports.getReviews = asyncHandler(async (req, res, next) => {
  if (req.params.siteId) {
    const reviews = await Review.find({ site_id: req.params.siteId })
      .populate({
        path: 'user_id',
        select: 'name'
      });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } else {
    res.status(200).json(res.advancedResults);
  }
});

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
exports.getReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate({
    path: 'user_id',
    select: 'name'
  }).populate({
    path: 'site_id',
    select: 'name description'
  });

  if (!review) {
    return next(
      new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: review
  });
});

// @desc    Add review for a site
// @route   POST /api/sites/:siteId/reviews
// @access  Private
exports.addReview = asyncHandler(async (req, res, next) => {
  req.body.site_id = req.params.siteId;
  req.body.user_id = req.user.id;

  // Check if site exists
  const site = await Site.findById(req.params.siteId);

  if (!site) {
    return next(
      new ErrorResponse(`Site not found with id of ${req.params.siteId}`, 404)
    );
  }

  // Check if user already reviewed this site
  const existingReview = await Review.findOne({
    site_id: req.params.siteId,
    user_id: req.user.id
  });

  if (existingReview) {
    return next(
      new ErrorResponse(`User already reviewed this site`, 400)
    );
  }

  const review = await Review.create(req.body);

  res.status(201).json({
    success: true,
    data: review
  });
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = asyncHandler(async (req, res, next) => {
  let review = await Review.findById(req.params.id);

  if (!review) {
    return next(
      new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure review belongs to user or user is admin
  if (review.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(`Not authorized to update this review`, 401)
    );
  }

  // Make sure rating is valid
  if (req.body.rating) {
    if (req.body.rating < 1 || req.body.rating > 5) {
      return next(new ErrorResponse('Rating must be between 1 and 5', 400));
    }
  }

  review = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Update average rating
  review.constructor.getAverageRating(review.site_id);

  res.status(200).json({
    success: true,
    data: review
  });
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(
      new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure review belongs to user or user is admin
  if (review.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(`Not authorized to delete this review`, 401)
    );
  }

  await review.remove();

  // Update average rating
  review.constructor.getAverageRating(review.site_id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get average rating for a site
// @route   GET /api/sites/:siteId/average-rating
// @access  Public
exports.getAverageRating = asyncHandler(async (req, res, next) => {
  const result = await Review.aggregate([
    {
      $match: { site_id: mongoose.Types.ObjectId(req.params.siteId) }
    },
    {
      $group: {
        _id: '$site_id',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length === 0) {
    return res.status(200).json({
      success: true,
      averageRating: 0,
      reviewCount: 0
    });
  }

  res.status(200).json({
    success: true,
    averageRating: result[0].averageRating,
    reviewCount: result[0].reviewCount
  });
});

// @desc    Get top rated sites
// @route   GET /api/sites/top-rated
// @access  Public
exports.getTopRatedSites = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 5;
  
  // Aggregate to get sites with their average ratings
  const topSites = await Review.aggregate([
    {
      $group: {
        _id: '$site_id',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    },
    {
      $match: {
        reviewCount: { $gte: 3 } // Minimum number of reviews to be considered
      }
    },
    {
      $sort: { averageRating: -1 }
    },
    {
      $limit: limit
    }
  ]);

  // Get full site details for each top rated site
  const siteDetails = [];
  for (const site of topSites) {
    const siteData = await Site.findById(site._id);
    if (siteData) {
      siteDetails.push({
        ...siteData.toObject(),
        averageRating: site.averageRating,
        reviewCount: site.reviewCount
      });
    }
  }

  res.status(200).json({
    success: true,
    count: siteDetails.length,
    data: siteDetails
  });
});

// @desc    Get recent reviews
// @route   GET /api/reviews/recent
// @access  Public
exports.getRecentReviews = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const reviews = await Review.find()
    .sort('-date')
    .limit(limit)
    .populate({
      path: 'user_id',
      select: 'name'
    })
    .populate({
      path: 'site_id',
      select: 'name image_url'
    });

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews
  });
});