// config/config.js
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'velora_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || 30,
  FILE_UPLOAD_PATH: process.env.FILE_UPLOAD_PATH || './public/uploads',
  MAX_FILE_UPLOAD: process.env.MAX_FILE_UPLOAD || 1000000, // 1MB
  GEOCODER_PROVIDER: process.env.GEOCODER_PROVIDER || 'mapquest',
  GEOCODER_API_KEY: process.env.GEOCODER_API_KEY
};

// config/db.js
const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  const conn = await mongoose.connect(config.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

module.exports = connectDB;

// middleware/error.js
const ErrorResponse = require('../utils/errorResponse');
const config = require('../config/config');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;

// app.js
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const config = require('./config/config');

// Connect to database
connectDB();

// Route files
const auth = require('./routes/auth');
const users = require('./routes/users');
const guides = require('./routes/guides');
const sites = require('./routes/sites');
const trips = require('./routes/trips');
const reviews = require('./routes/reviews');

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// File uploading
app.use(fileupload());

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/guides', guides);
app.use('/api/sites', sites);
app.use('/api/trips', trips);
app.use('/api/reviews', reviews);

// Error handler
app.use(errorHandler);

module.exports = app;

// server.js
const app = require('./app');
const config = require('./config/config');

const server = app.listen(
  config.PORT,
  console.log(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// config/config.env (example - would need to be filled in with actual values)
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/velora?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
FILE_UPLOAD_PATH=./public/uploads
MAX_FILE_UPLOAD=1000000
GEOCODER_PROVIDER=mapquest
GEOCODER_API_KEY=your_geocoder_api_key