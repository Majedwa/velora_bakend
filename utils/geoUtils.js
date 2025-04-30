// utils/geoUtils.js
const NodeGeocoder = require('node-geocoder');
const config = require('../config/config');

// Setup geocoder options
const options = {
  provider: config.GEOCODER_PROVIDER,
  httpAdapter: 'https',
  apiKey: config.GEOCODER_API_KEY,
  formatter: null
};

const geocoder = NodeGeocoder(options);

/**
 * Geocode an address to coordinates
 * @param {string} address - The address to geocode
 * @returns {Promise<Array>} - Array containing longitude and latitude
 */
const geocodeAddress = async (address) => {
  try {
    const result = await geocoder.geocode(address);
    
    if (result.length === 0) {
      throw new Error('Address not found');
    }
    
    const { longitude, latitude } = result[0];
    return [longitude, latitude];
  } catch (err) {
    console.error('Geocoding error:', err);
    throw err;
  }
};

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} - Object with address information
 */
const reverseGeocode = async (lat, lon) => {
  try {
    const result = await geocoder.reverse({ lat, lon });
    
    if (result.length === 0) {
      throw new Error('Location not found');
    }
    
    return result[0];
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    throw err;
  }
};

/**
 * Calculate distance between two points in kilometers
 * @param {Array} start - [longitude, latitude] of starting point
 * @param {Array} end - [longitude, latitude] of ending point
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (start, end) => {
  // Convert coordinates from degrees to radians
  const startLat = toRadians(start[1]);
  const startLng = toRadians(start[0]);
  const endLat = toRadians(end[1]);
  const endLng = toRadians(end[0]);

  // Haversine formula
  const dLat = endLat - startLat;
  const dLng = endLng - startLng;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(startLat) * Math.cos(endLat) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in kilometers
  const radius = 6371;
  
  // Distance in kilometers
  return radius * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} - Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Find locations within a given radius
 * @param {Array} center - [longitude, latitude] of center point
 * @param {number} radiusKm - Radius in kilometers
 * @param {Array} locations - Array of [longitude, latitude] points to check
 * @returns {Array} - Array of locations within the radius
 */
const locationsWithinRadius = (center, radiusKm, locations) => {
  return locations.filter(location => {
    const distance = calculateDistance(center, location);
    return distance <= radiusKm;
  });
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  locationsWithinRadius
};

// utils/fileUpload.js
const aws = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Configure AWS SDK
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new aws.S3();

/**
 * Upload file to S3
 * @param {Object} file - File object from express-fileupload
 * @param {string} folder - Destination folder in S3 bucket
 * @returns {Promise<string>} - URL of uploaded file
 */
const uploadToS3 = async (file, folder = 'images') => {
  try {
    // Create custom filename to prevent collisions
    const filename = `${folder}/${Date.now()}-${path.parse(file.name).name}${path.parse(file.name).ext}`;
    
    // Upload to S3
    const result = await s3.upload({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filename,
      Body: file.data,
      ContentType: file.mimetype,
      ACL: 'public-read'
    }).promise();
    
    return result.Location;
  } catch (err) {
    console.error('S3 upload error:', err);
    throw err;
  }
};

/**
 * Delete file from S3
 * @param {string} fileUrl - S3 URL of file to delete
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key from URL
    const key = fileUrl.split('/').slice(3).join('/');
    
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    }).promise();
  } catch (err) {
    console.error('S3 delete error:', err);
    throw err;
  }
};

/**
 * Upload file to local storage
 * @param {Object} file - File object from express-fileupload
 * @param {string} folder - Destination folder
 * @returns {Promise<string>} - Path of uploaded file
 */
const uploadToLocal = async (file, folder = 'images') => {
  try {
    // Create folder if it doesn't exist
    const uploadPath = path.join(config.FILE_UPLOAD_PATH, folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Create custom filename to prevent collisions
    const filename = `${Date.now()}-${path.parse(file.name).name}${path.parse(file.name).ext}`;
    const filePath = path.join(uploadPath, filename);
    
    // Move file to upload directory
    await file.mv(filePath);
    
    // Return relative path
    return path.join(folder, filename).replace(/\\/g, '/');
  } catch (err) {
    console.error('Local upload error:', err);
    throw err;
  }
};

/**
 * Delete file from local storage
 * @param {string} filePath - Path of file to delete
 * @returns {Promise<void>}
 */
const deleteFromLocal = async (filePath) => {
  try {
    const fullPath = path.join(config.FILE_UPLOAD_PATH, filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Local delete error:', err);
    throw err;
  }
};

/**
 * Upload file to storage (S3 in production, local in development)
 * @param {Object} file - File object from express-fileupload
 * @param {string} folder - Destination folder
 * @returns {Promise<string>} - URL or path of uploaded file
 */
const uploadFile = async (file, folder = 'images') => {
  if (config.NODE_ENV === 'production' && process.env.AWS_S3_BUCKET_NAME) {
    return await uploadToS3(file, folder);
  } else {
    return await uploadToLocal(file, folder);
  }
};

/**
 * Delete file from storage (S3 in production, local in development)
 * @param {string} filePathOrUrl - Path or URL of file to delete
 * @returns {Promise<void>}
 */
const deleteFile = async (filePathOrUrl) => {
  if (config.NODE_ENV === 'production' && process.env.AWS_S3_BUCKET_NAME && filePathOrUrl.includes('amazonaws.com')) {
    await deleteFromS3(filePathOrUrl);
  } else {
    await deleteFromLocal(filePathOrUrl);
  }
};

module.exports = {
  uploadFile,
  deleteFile
};

// utils/validation.js
/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidEmail = (email) => {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isStrongPassword = (password) => {
  // Require at least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhone = (phone) => {
  // Simple international format check
  const regex = /^\+?[0-9]{10,15}$/;
  return regex.test(phone);
};

/**
 * Validate coordinates
 * @param {number} longitude - Longitude
 * @param {number} latitude - Latitude
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidCoordinates = (longitude, latitude) => {
  return (
    longitude >= -180 && longitude <= 180 &&
    latitude >= -90 && latitude <= 90
  );
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (!input) return input;
  
  // Replace potentially dangerous characters
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidPhone,
  isValidCoordinates,
  sanitizeInput
};