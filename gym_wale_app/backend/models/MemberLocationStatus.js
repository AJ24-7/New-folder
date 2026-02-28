const mongoose = require('mongoose');

/**
 * Member Location Status Model
 * Tracks real-time location services status for members
 * Used for geofence-based attendance monitoring
 */
const memberLocationStatusSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    index: true
  },
  // Location services status
  locationEnabled: {
    type: Boolean,
    default: false
  },
  locationPermission: {
    type: String,
    enum: ['granted', 'denied', 'restricted', 'notDetermined', 'deniedForever'],
    default: 'notDetermined'
  },
  // Background location permission (required for geofencing)
  backgroundLocationEnabled: {
    type: Boolean,
    default: false
  },
  backgroundLocationPermission: {
    type: String,
    enum: ['granted', 'denied', 'restricted', 'notDetermined', 'deniedForever'],
    default: 'notDetermined'
  },
  // GPS accuracy
  locationAccuracy: {
    type: String,
    enum: ['high', 'medium', 'low', 'unknown'],
    default: 'unknown'
  },
  // Device info
  deviceInfo: {
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown'
    },
    deviceModel: String,
    osVersion: String,
    appVersion: String
  },
  // Geofence setup status
  geofenceSetup: {
    isSetup: {
      type: Boolean,
      default: false
    },
    lastSetupDate: Date,
    geofenceId: String
  },
  // Status tracking
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  },
  lastLocationUpdate: {
    type: Date
  },
  // Current location (latest)
  currentLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  // Warnings and alerts
  warnings: [{
    type: {
      type: String,
      enum: ['location_disabled', 'permission_denied', 'low_accuracy', 'mock_location', 'geofence_failed']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],
  // App active status
  appActive: {
    type: Boolean,
    default: false
  },
  lastAppOpen: {
    type: Date
  },
  lastAppClose: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient querying
memberLocationStatusSchema.index({ gymId: 1, memberId: 1 }, { unique: true });
memberLocationStatusSchema.index({ gymId: 1, locationEnabled: 1 });
memberLocationStatusSchema.index({ lastStatusUpdate: 1 });

// Pre-save middleware
memberLocationStatusSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if status is stale (no update in last 30 minutes)
memberLocationStatusSchema.methods.isStale = function() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return this.lastStatusUpdate < thirtyMinutesAgo;
};

// Method to check if geofence requirements are met
memberLocationStatusSchema.methods.meetsGeofenceRequirements = function() {
  return (
    this.locationEnabled &&
    this.locationPermission === 'granted' &&
    this.backgroundLocationEnabled &&
    this.backgroundLocationPermission === 'granted' &&
    this.geofenceSetup.isSetup &&
    !this.isStale()
  );
};

// Static method to get members with location issues for a gym
memberLocationStatusSchema.statics.getMembersWithIssues = async function(gymId) {
  return await this.find({
    gymId: new mongoose.Types.ObjectId(gymId),
    $or: [
      { locationEnabled: false },
      { locationPermission: { $in: ['denied', 'deniedForever', 'restricted'] } },
      { backgroundLocationEnabled: false },
      { backgroundLocationPermission: { $in: ['denied', 'deniedForever', 'restricted'] } }
    ]
  }).populate('memberId', 'memberName phone email');
};

// Static method to update or create status
memberLocationStatusSchema.statics.updateStatus = async function(memberId, gymId, statusData) {
  return await this.findOneAndUpdate(
    { memberId, gymId },
    {
      ...statusData,
      lastStatusUpdate: new Date(),
      updatedAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

module.exports = mongoose.model('MemberLocationStatus', memberLocationStatusSchema);
