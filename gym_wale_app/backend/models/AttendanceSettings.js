const mongoose = require('mongoose');

const attendanceSettingsSchema = new mongoose.Schema({
  gym: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    unique: true
  },
  mode: {
    type: String,
    enum: ['manual', 'geofence', 'biometric', 'qr', 'hybrid'],
    default: 'manual'
  },
  autoMarkEnabled: {
    type: Boolean,
    default: false
  },
  requireCheckOut: {
    type: Boolean,
    default: false
  },
  allowLateCheckIn: {
    type: Boolean,
    default: true
  },
  lateThresholdMinutes: {
    type: Number,
    default: 15,
    min: 0,
    max: 120
  },
  sendNotifications: {
    type: Boolean,
    default: false
  },
  trackDuration: {
    type: Boolean,
    default: true
  },
  geofenceSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    radius: {
      type: Number,
      default: 100
    },
    autoMarkEntry: {
      type: Boolean,
      default: true
    },
    autoMarkExit: {
      type: Boolean,
      default: true
    },
    allowMockLocation: {
      type: Boolean,
      default: false
    },
    minAccuracyMeters: {
      type: Number,
      default: 20
    }
  },
  manualSettings: {
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowBulkMark: {
      type: Boolean,
      default: true
    },
    enableNotes: {
      type: Boolean,
      default: true
    },
    allowedStatuses: [{
      type: String,
      enum: ['present', 'absent', 'late', 'leave', 'half-day']
    }]
  }
}, {
  timestamps: true
});

// Index for faster queries
attendanceSettingsSchema.index({ gym: 1 });

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);
