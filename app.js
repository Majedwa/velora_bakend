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
const profile = require('./routes/profile');
const search = require('./routes/search');
const stats = require('./routes/stats');

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
app.use('/api/profile', profile);
app.use('/api/search', search);
app.use('/api/stats', stats);

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Velora API Server',
    version: '1.0.0'
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;