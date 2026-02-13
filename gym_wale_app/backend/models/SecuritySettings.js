const mongoose = require('mongoose');

const securitySettingsSchema = new mongoose.Schema({
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    unique: true
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  loginNotifications: {
    enabled: {
      type: Boolean,
      default: false
    },
    preferences: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: false
      },
      suspiciousOnly: {
        type: Boolean,
        default: false
      },
      newLocation: {
        type: Boolean,
        default: true
      }
    }
  },
  sessionTimeout: {
    enabled: {
      type: Boolean,
      default: true
    },
    timeoutMinutes: {
      type: Number,
      default: 60 // 1 hour
    }
  },
  passwordPolicy: {
    minLength: {
      type: Number,
      default: 8
    },
    requireUppercase: {
      type: Boolean,
      default: false
    },
    requireLowercase: {
      type: Boolean,
      default: false
    },
    requireNumbers: {
      type: Boolean,
      default: false
    },
    requireSymbols: {
      type: Boolean,
      default: false
    }
  },
  accountLockout: {
    enabled: {
      type: Boolean,
      default: true
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 30 // minutes
    }
  },
  ipWhitelist: [{
    ip: String,
    description: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    lastUsed: Date,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
securitySettingsSchema.index({ gymId: 1 });

module.exports = mongoose.model('SecuritySettings', securitySettingsSchema);
