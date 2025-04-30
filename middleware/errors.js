// middleware/errors.js
const ErrorResponse = require('../utils/errorResponse');
const config = require('../config/config');

/**
 * Custom error handler for handling all exceptions
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (config.NODE_ENV === 'development') {
    console.log(err.stack.red);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: ${field} with value: ${value}. Please use another value.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Multer file size limit exceeded
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = `File size exceeds the limit of ${config.MAX_FILE_UPLOAD / 1000000} MB`;
    error = new ErrorResponse(message, 400);
  }

  // JWT Token errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Not authorized to access this route';
    error = new ErrorResponse(message, 401);
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again';
    error = new ErrorResponse(message, 401);
  }

  // Default error status and message
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    stack: config.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;