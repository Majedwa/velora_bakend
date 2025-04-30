// routes/guides.js
const express = require('express');
const {
  getGuides,
  getGuide,
  createGuide,
  updateGuide,
  deleteGuide,
  getGuidesByLanguage,
  getFeaturedGuides,
  searchGuides
} = require('../controllers/guideController');

const Guide = require('../models/Guide');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Public routes for discovering guides
router.get('/language/:language', getGuidesByLanguage);
router.get('/featured', getFeaturedGuides);
router.get('/search', searchGuides);

// Mixed access routes (some operations need authentication)
router
  .route('/')
  .get(
    advancedResults(Guide, {
      path: 'user_id',
      select: 'name email'
    }), 
    getGuides
  )
  .post(protect, authorize('Guide'), createGuide);

router
  .route('/:id')
  .get(getGuide)
  .put(protect, updateGuide) // Only owner or admin can update
  .delete(protect, deleteGuide); // Only owner or admin can delete

module.exports = router;