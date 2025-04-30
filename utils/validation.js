// utils/validation.js

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid, false otherwise
 */
const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailPattern.test(String(email).toLowerCase());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with status and message
 */
const validatePasswordStrength = (password, options = {}) => {
  const defaultOptions = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  };
  
  const opts = {...defaultOptions, ...options};
  
  if (!password) {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }
  
  // Check length
  if (password.length < opts.minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${opts.minLength} characters long`
    };
  }
  
  // Check for uppercase letters
  if (opts.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  // Check for lowercase letters
  if (opts.requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  // Check for numbers
  if (opts.requireNumbers && !/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  // Check for special characters
  if (opts.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character'
    };
  }
  
  return {
    isValid: true,
    message: 'Password is valid'
  };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {boolean} international - Whether to validate as international format
 * @returns {boolean} - True if phone number is valid, false otherwise
 */
const isValidPhone = (phone, international = true) => {
  if (!phone) return false;
  
  // Clean the phone number
  const cleaned = phone.replace(/\s+/g, '').replace(/[()-]/g, '');
  
  if (international) {
    // International format validation (starts with + and has 8-15 digits)
    return /^\+?[0-9]{8,15}$/.test(cleaned);
  } else {
    // Simple format validation (8-12 digits)
    return /^[0-9]{8,12}$/.test(cleaned);
  }
};

/**
 * Validate date format and value
 * @param {string} date - Date string to validate
 * @param {string} format - Expected format (ISO, MM/DD/YYYY, etc.)
 * @returns {boolean} - True if date is valid, false otherwise
 */
const isValidDate = (date, format = 'ISO') => {
  if (!date) return false;
  
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return false;
  }
  
  // Additional format-specific validation
  if (format === 'ISO') {
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/.test(date);
  } else if (format === 'MM/DD/YYYY') {
    return /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/.test(date);
  } else if (format === 'DD/MM/YYYY') {
    return /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(date);
  }
  
  return true;
};

/**
 * Check if a date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is in the future, false otherwise
 */
const isFutureDate = (date) => {
  const parsed = new Date(date);
  const now = new Date();
  
  return parsed > now;
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} - True if coordinates are valid, false otherwise
 */
const areValidCoordinates = (latitude, longitude) => {
  if (latitude === undefined || longitude === undefined) return false;
  
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng)) return false;
  
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Validate that a string is not empty
 * @param {string} str - String to validate
 * @returns {boolean} - True if string is not empty, false otherwise
 */
const isNotEmpty = (str) => {
  if (str === undefined || str === null) return false;
  return str.trim() !== '';
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is valid, false otherwise
 */
const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
};

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeString = (input) => {
  if (!input) return '';
  
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validate integer
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateInteger = (value, options = {}) => {
  const defaultOptions = {
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
    required: true
  };
  
  const opts = {...defaultOptions, ...options};
  
  // Check if value is required and exists
  if (opts.required && (value === undefined || value === null || value === '')) {
    return {
      isValid: false,
      message: 'Value is required'
    };
  }
  
  // If not required and empty, it's valid
  if (!opts.required && (value === undefined || value === null || value === '')) {
    return {
      isValid: true,
      message: 'Value is valid'
    };
  }
  
  // Convert to number if string
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  // Check if it's a valid integer
  if (isNaN(num) || !Number.isInteger(num)) {
    return {
      isValid: false,
      message: 'Value must be an integer'
    };
  }
  
  // Check min value
  if (num < opts.min) {
    return {
      isValid: false,
      message: `Value must be greater than or equal to ${opts.min}`
    };
  }
  
  // Check max value
  if (num > opts.max) {
    return {
      isValid: false,
      message: `Value must be less than or equal to ${opts.max}`
    };
  }
  
  return {
    isValid: true,
    message: 'Value is valid'
  };
};

/**
 * Validate rating (1-5)
 * @param {number} rating - Rating to validate
 * @returns {boolean} - True if rating is valid, false otherwise
 */
const isValidRating = (rating) => {
  const num = parseInt(rating, 10);
  return !isNaN(num) && num >= 1 && num <= 5;
};

module.exports = {
  isValidEmail,
  validatePasswordStrength,
  isValidPhone,
  isValidDate,
  isFutureDate,
  areValidCoordinates,
  isNotEmpty,
  isValidUrl,
  sanitizeString,
  validateInteger,
  isValidRating
};