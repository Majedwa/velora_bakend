// controllers/siteController.js
const Site = require('../models/Site');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all sites
// @route   GET /api/sites
// @access  Public
exports.getSites = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single site
// @route   GET /api/sites/:id
// @access  Public
exports.getSite = asyncHandler(async (req, res, next) => {
  const site = await Site.findById(req.params.id);

  if (!site) {
    return next(
      new ErrorResponse(`Site not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: site
  });
});

// @desc    Create new site
// @route   POST /api/sites
// @access  Private (Admin only)
exports.createSite = asyncHandler(async (req, res, next) => {
  // Make sure location is formatted correctly
  if (req.body.location && !req.body.location.type) {
    req.body.location = {
      type: 'Point',
      coordinates: req.body.location.coordinates || [0, 0]
    };
  }
  
  const site = await Site.create(req.body);

  res.status(201).json({
    success: true,
    data: site
  });
});

// @desc    Update site
// @route   PUT /api/sites/:id
// @access  Private (Admin only)
exports.updateSite = asyncHandler(async (req, res, next) => {
  // Make sure location is formatted correctly if included
  if (req.body.location && !req.body.location.type) {
    req.body.location = {
      type: 'Point',
      coordinates: req.body.location.coordinates || [0, 0]
    };
  }
  
  let site = await Site.findById(req.params.id);

  if (!site) {
    return next(
      new ErrorResponse(`Site not found with id of ${req.params.id}`, 404)
    );
  }

  site = await Site.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: site
  });
});

// @desc    Delete site
// @route   DELETE /api/sites/:id
// @access  Private (Admin only)
exports.deleteSite = asyncHandler(async (req, res, next) => {
  const site = await Site.findById(req.params.id);

  if (!site) {
    return next(
      new ErrorResponse(`Site not found with id of ${req.params.id}`, 404)
    );
  }

  await site.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get sites within radius
// @route   GET /api/sites/radius/:zipcode/:distance
// @access  Public
exports.getSitesInRadius = asyncHandler(async (req, res, next) => {
  const { longitude, latitude, distance } = req.query;

  // Check if coordinates are provided
  if (!longitude || !latitude) {
    return next(
      new ErrorResponse('Please provide longitude and latitude coordinates', 400)
    );
  }

  // Convert distance to radians - divide distance by radius of Earth
  // Earth radius = 6,378 km
  const radius = distance / 6378;

  const sites = await Site.find({
    location: {
      $geoWithin: { $centerSphere: [[longitude, latitude], radius] }
    }
  });

  res.status(200).json({
    success: true,
    count: sites.length,
    data: sites
  });
});

// @desc    Get sites by type
// @route   GET /api/sites/type/:type
// @access  Public
exports.getSitesByType = asyncHandler(async (req, res, next) => {
  const sites = await Site.find({ type: req.params.type });

  res.status(200).json({
    success: true,
    count: sites.length,
    data: sites
  });
});

// @desc    Upload site photo
// @route   PUT /api/sites/:id/photo
// @access  Private (Admin only)
exports.sitePhotoUpload = asyncHandler(async (req, res, next) => {
  const site = await Site.findById(req.params.id);

  if (!site) {
    return next(
      new ErrorResponse(`Site not found with id of ${req.params.id}`, 404)
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `photo_${site._id}${path.parse(file.name).ext}`;

  // Upload file to AWS S3 (implementation would be needed here)
  // For now, we'll assume it's uploaded to a local path
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Site.findByIdAndUpdate(req.params.id, { image_url: file.name });

    res.status(200).json({
      success: true,
      data: file.name
    });
  });
});

// middleware/advancedResults.js
const advancedResults = (model, populate) => async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `${match}`);

  // Finding resource
  query = model.find(JSON.parse(queryStr));

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  if (populate) {
    query = query.populate(populate);
  }

  // Executing query
  const results = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.advancedResults = {
    success: true,
    count: results.length,
    pagination,
    data: results
  };

  next();
};