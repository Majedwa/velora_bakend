// controllers/tripController.js
const Trip = require('../models/Trip');
const TripSite = require('../models/TripSite');
const Site = require('../models/Site');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all trips (for logged in user)
// @route   GET /api/trips
// @access  Private
exports.getTrips = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'Admin') {
    // Admin can see all trips
    res.status(200).json(res.advancedResults);
  } else {
    // Regular users can only see their own trips
    const trips = await Trip.find({ user_id: req.user.id })
      .populate('sites');

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  }
});

// @desc    Get single trip
// @route   GET /api/trips/:id
// @access  Private
exports.getTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id).populate({
    path: 'sites',
    populate: {
      path: 'site_id',
      model: 'Site'
    }
  });

  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner or admin
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this trip`,
        401
      )
    );
  }

  res.status(200).json({
    success: true,
    data: trip
  });
});

// @desc    Create new trip
// @route   POST /api/trips
// @access  Private
exports.createTrip = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user_id = req.user.id;

  const trip = await Trip.create(req.body);

  res.status(201).json({
    success: true,
    data: trip
  });
});

// @desc    Update trip
// @route   PUT /api/trips/:id
// @access  Private
exports.updateTrip = asyncHandler(async (req, res, next) => {
  let trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this trip`,
        401
      )
    );
  }

  trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: trip
  });
});

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Private
exports.deleteTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this trip`,
        401
      )
    );
  }

  // Delete all trip sites
  await TripSite.deleteMany({ trip_id: req.params.id });
  
  // Delete the trip
  await trip.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add site to trip
// @route   POST /api/trips/:id/sites
// @access  Private
exports.addSiteToTrip = asyncHandler(async (req, res, next) => {
  const { site_id, visit_order } = req.body;

  // Check if trip exists
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this trip`,
        401
      )
    );
  }

  // Check if site exists
  const site = await Site.findById(site_id);
  if (!site) {
    return next(
      new ErrorResponse(`Site not found with id of ${site_id}`, 404)
    );
  }

  // Check if site is already in the trip
  const existingTripSite = await TripSite.findOne({
    trip_id: req.params.id,
    site_id
  });

  if (existingTripSite) {
    return next(
      new ErrorResponse(`Site is already added to this trip`, 400)
    );
  }

  // Add site to trip
  const tripSite = await TripSite.create({
    trip_id: req.params.id,
    site_id,
    visit_order: visit_order || 1
  });

  res.status(201).json({
    success: true,
    data: tripSite
  });
});

// @desc    Remove site from trip
// @route   DELETE /api/trips/:id/sites/:siteId
// @access  Private
exports.removeSiteFromTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this trip`,
        401
      )
    );
  }

  // Find and remove trip site
  const tripSite = await TripSite.findOne({
    trip_id: req.params.id,
    site_id: req.params.siteId
  });

  if (!tripSite) {
    return next(
      new ErrorResponse(`Site not found in this trip`, 404)
    );
  }

  await tripSite.remove();

  // Reorder remaining sites if needed
  const remainingSites = await TripSite.find({ trip_id: req.params.id }).sort('visit_order');
  
  // Update order of remaining sites
  for (let i = 0; i < remainingSites.length; i++) {
    remainingSites[i].visit_order = i + 1;
    await remainingSites[i].save();
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update site order in trip
// @route   PUT /api/trips/:id/sites/:siteId/order
// @access  Private
exports.updateSiteOrder = asyncHandler(async (req, res, next) => {
  const { new_order } = req.body;
  
  if (!new_order || typeof new_order !== 'number' || new_order < 1) {
    return next(
      new ErrorResponse('Please provide a valid new order value', 400)
    );
  }

  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this trip`,
        401
      )
    );
  }

  // Find trip site
  const tripSite = await TripSite.findOne({
    trip_id: req.params.id,
    site_id: req.params.siteId
  });

  if (!tripSite) {
    return next(
      new ErrorResponse(`Site not found in this trip`, 404)
    );
  }

  // Get all trip sites ordered by visit_order
  const allTripSites = await TripSite.find({ trip_id: req.params.id }).sort('visit_order');
  
  // Current order
  const oldOrder = tripSite.visit_order;
  
  // Update orders
  if (new_order > oldOrder) {
    // Moving down in the list - decrement sites in between
    for (const site of allTripSites) {
      if (site.visit_order > oldOrder && site.visit_order <= new_order) {
        site.visit_order -= 1;
        await site.save();
      }
    }
  } else if (new_order < oldOrder) {
    // Moving up in the list - increment sites in between
    for (const site of allTripSites) {
      if (site.visit_order >= new_order && site.visit_order < oldOrder) {
        site.visit_order += 1;
        await site.save();
      }
    }
  }
  
  // Set the new order for the target site
  tripSite.visit_order = new_order;
  await tripSite.save();

  res.status(200).json({
    success: true,
    data: tripSite
  });
});

// @desc    Get trip for offline use (with full site data)
// @route   GET /api/trips/:id/offline
// @access  Private
exports.getTripOfflineData = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(
      new ErrorResponse(`Trip not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is trip owner
  if (trip.user_id.toString() !== req.user.id && req.user.role !== 'Admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this trip`,
        401
      )
    );
  }

  // Get all sites in this trip
  const tripSites = await TripSite.find({ trip_id: req.params.id }).sort('visit_order');
  
  // Get full site data for each site
  const sitesData = [];
  for (const tripSite of tripSites) {
    const site = await Site.findById(tripSite.site_id);
    if (site) {
      sitesData.push({
        ...site.toObject(),
        visit_order: tripSite.visit_order
      });
    }
  }

  // Create offline-friendly data structure
  const offlineData = {
    trip: trip.toObject(),
    sites: sitesData,
    last_updated: new Date(),
    version: 1 // For data versioning
  };

  res.status(200).json({
    success: true,
    data: offlineData
  });
});