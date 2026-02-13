const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  location: {
    city: String,
    country: String,
    region: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  device: {
    type: String,
    default: 'Unknown device'
  },
  browser: {
    type: String,
    default: 'Unknown browser'
  },
  suspicious: {
    type: Boolean,
    default: false
  },
  reported: {
    type: Boolean,
    default: false
  },
  reportedAt: Date,
  timestamp: {
    type: Date,
    default: Date.now
  },
  failureReason: String
}, {
  timestamps: true
});

// Index for efficient querying
loginAttemptSchema.index({ gymId: 1, timestamp: -1 });
loginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
