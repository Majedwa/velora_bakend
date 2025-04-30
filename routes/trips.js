// routes/trips.js
const express = require('express');
const {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  addSiteToTrip,
  removeSiteFromTrip,
  updateSiteOrder,
  getTripOfflineData
} = require('../controllers/tripController');

const Trip = require('../models/Trip');

const router = express.Router();

const { protect } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// All trip routes require authentication
router.use(protect);

router
  .route('/')
  .get(
    advancedResults(Trip, {
      path: 'sites',
      populate: {
        path: 'site_id',
        model: 'Site'
      }
    }),
    getTrips
  )
  .post(createTrip);

router
  .route('/:id')
  .get(getTrip)
  .put(updateTrip)
  .delete(deleteTrip);

router
  .route('/:id/sites')
  .post(addSiteToTrip);

router
  .route('/:id/sites/:siteId')
  .delete(removeSiteFromTrip);

router
  .route('/:id/sites/:siteId/order')
  .put(updateSiteOrder);

router
  .route('/:id/offline')
  .get(getTripOfflineData);

module.exports = router;