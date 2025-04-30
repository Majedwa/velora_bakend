// routes/sites.js
const express = require('express');
const {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  getSitesInRadius,
  getSitesByType,
  sitePhotoUpload,
  getTopRatedSites
} = require('../controllers/siteController');

const Site = require('../models/Site');

// Include review router for nested routes
const reviewRouter = require('./reviews');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const { uploadSingle } = require('../middleware/upload');

// Re-route into other resource routers
router.use('/:siteId/reviews', reviewRouter);

// Special routes
router.get('/radius', getSitesInRadius);
router.get('/type/:type', getSitesByType);
router.get('/top-rated', getTopRatedSites);

// Main routes
router
  .route('/')
  .get(advancedResults(Site), getSites)
  .post(protect, authorize('Admin'), createSite);

router
  .route('/:id')
  .get(getSite)
  .put(protect, authorize('Admin'), updateSite)
  .delete(protect, authorize('Admin'), deleteSite);

router
  .route('/:id/photo')
  .put(protect, authorize('Admin'), uploadSingle('site_image'), sitePhotoUpload);

module.exports = router;