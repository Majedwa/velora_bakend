// middleware/upload.js
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ErrorResponse = require('../utils/errorResponse');
const config = require('../config/config');

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Set upload destination based on file type
    let uploadPath = config.FILE_UPLOAD_PATH;
    
    if (file.fieldname === 'site_image') {
      uploadPath = path.join(uploadPath, 'sites');
    } else if (file.fieldname === 'profile_image') {
      uploadPath = path.join(uploadPath, 'profiles');
    } else {
      uploadPath = path.join(uploadPath, 'misc');
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Generate unique filename to prevent collisions
    const uniqueSuffix = uuidv4();
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_UPLOAD // 1MB default
  },
  fileFilter: fileFilter
});

// Wrapper for multer to use with express-async-handler
const uploadSingle = (fieldName) => {
  return function(req, res, next) {
    upload.single(fieldName)(req, res, function(err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ErrorResponse(
                `File size should be less than ${config.MAX_FILE_UPLOAD / 1000000} MB`,
                400
              )
            );
          }
        }
        return next(new ErrorResponse(err.message, 400));
      }
      // Everything went fine
      next();
    });
  };
};

// Wrapper for multiple file uploads
const uploadMultiple = (fieldName, maxCount) => {
  return function(req, res, next) {
    upload.array(fieldName, maxCount)(req, res, function(err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ErrorResponse(
                `File size should be less than ${config.MAX_FILE_UPLOAD / 1000000} MB`,
                400
              )
            );
          }
        }
        return next(new ErrorResponse(err.message, 400));
      }
      // Everything went fine
      next();
    });
  };
};

// Wrapper for multiple fields
const uploadFields = (fields) => {
  return function(req, res, next) {
    upload.fields(fields)(req, res, function(err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ErrorResponse(
                `File size should be less than ${config.MAX_FILE_UPLOAD / 1000000} MB`,
                400
              )
            );
          }
        }
        return next(new ErrorResponse(err.message, 400));
      }
      // Everything went fine
      next();
    });
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields
};