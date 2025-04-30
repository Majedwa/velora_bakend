// routes/reviews.js
const express = require('express');
const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
  getAverageRating,
  getRecentReviews
} = require('../controllers/reviewController');

const Review = require('../models/Review');

const router = express.Router({ mergeParams: true });

const { protect } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Public routes
router.get('/recent', getRecentReviews);
router.get('/average/:siteId', getAverageRating);

// Mixed access routes
router
  .route('/')
  .get(
    advancedResults(Review, {
      path: 'user_id',
      select: 'name'
    }),
    getReviews
  )
  .post(protect, addReview);

router
  .route('/:id')
  .get(getReview)
  .put(protect, updateReview) // Only owner or admin can update
  .delete(protect, deleteReview); // Only owner or admin can delete

module.exports = router;