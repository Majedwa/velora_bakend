// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries
  },
  role: {
    type: String,
    enum: ['Tourist', 'Local', 'Guide', 'Admin'],
    default: 'Tourist'
  },
  language: {
    type: String,
    default: 'en' // Default language is English
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

// models/Guide.js
const mongoose = require('mongoose');

const GuideSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bio: {
    type: String,
    required: [true, 'Please provide a bio'],
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  languages: {
    type: [String],
    required: [true, 'Please provide at least one language']
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number']
  }
}, {
  timestamps: true
});

// Ensure the referenced User exists and has role 'Guide'
GuideSchema.pre('save', async function(next) {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(this.user_id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.role !== 'Guide') {
      throw new Error('User must have Guide role to create guide profile');
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Guide', GuideSchema);

// models/Site.js
const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a site name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  type: {
    type: String,
    enum: ['Cultural', 'Religious', 'Natural'],
    required: true
  },
  image_url: {
    type: String,
    required: [true, 'Please provide an image URL']
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
SiteSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Site', SiteSchema);

// models/Trip.js
const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trip_name: {
    type: String,
    required: [true, 'Please provide a trip name'],
    trim: true,
    maxlength: [100, 'Trip name cannot be more than 100 characters']
  },
  start_date: {
    type: Date,
    required: [true, 'Please provide a start date']
  },
  end_date: {
    type: Date,
    required: [true, 'Please provide an end date']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field to get sites in this trip
TripSchema.virtual('sites', {
  ref: 'TripSite',
  localField: '_id',
  foreignField: 'trip_id',
  justOne: false
});

// Validate end date is after start date
TripSchema.pre('save', function(next) {
  if (this.end_date < this.start_date) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Trip', TripSchema);

// models/TripSite.js
const mongoose = require('mongoose');

const TripSiteSchema = new mongoose.Schema({
  trip_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  site_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true
  },
  visit_order: {
    type: Number,
    required: true,
    min: [1, 'Visit order must be at least 1']
  }
}, {
  timestamps: true
});

// Create compound index for unique trip-site combinations
TripSiteSchema.index({ trip_id: 1, site_id: 1 }, { unique: true });

module.exports = mongoose.model('TripSite', TripSiteSchema);

// models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  site_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    required: [true, 'Please provide a comment'],
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Prevent user from submitting more than one review per site
ReviewSchema.index({ user_id: 1, site_id: 1 }, { unique: true });

// Static method to get average rating of a site
ReviewSchema.statics.getAverageRating = async function(siteId) {
  const obj = await this.aggregate([
    {
      $match: { site_id: siteId }
    },
    {
      $group: {
        _id: '$site_id',
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  try {
    const Site = mongoose.model('Site');
    await Site.findByIdAndUpdate(siteId, {
      averageRating: obj[0] ? obj[0].averageRating : 0
    });
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageRating after save
ReviewSchema.post('save', function() {
  this.constructor.getAverageRating(this.site_id);
});

// Call getAverageRating after remove
ReviewSchema.post('remove', function() {
  this.constructor.getAverageRating(this.site_id);
});

module.exports = mongoose.model('Review', ReviewSchema);