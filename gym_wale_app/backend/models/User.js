const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  username: { type: String, unique: true },
  birthdate: Date,
  phone: String,
  email: { type: String, unique: true },
  profileImage: {
    type: String,
    default: "/uploads/profile-pics/default.png"
  },
  createdAt: { type: Date, default: Date.now },
  
  // Fitness
  height: {
    feet: Number,
    inches: Number,
  },
  weight: Number,
  fitnessLevel: String,
  primaryGoal: String,
  workoutPreferences: [String],
  
  // Preferences
  theme: String,
  measurementSystem: String,
  notifications: String,
  twoFactorEnabled: { type: Boolean, default: false },
  
  // User preferences for settings
  preferences: {
    // App Appearance
    theme: { type: String, default: 'system', enum: ['light', 'dark', 'system'] },
    language: { type: String, default: 'en', enum: ['en', 'hi'] },
    
    // Notification Preferences
    notifications: {
      email: {
        bookings: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        reminders: { type: Boolean, default: true }
      },
      sms: {
        bookings: { type: Boolean, default: true },
        reminders: { type: Boolean, default: false }
      },
      push: {
        enabled: { type: Boolean, default: true }
      }
    },
    
    // Privacy Settings
    privacy: {
      profileVisibility: { type: String, default: 'public', enum: ['public', 'friends', 'private'] },
      shareWorkoutData: { type: Boolean, default: false },
      shareProgress: { type: Boolean, default: true }
    },
    
    // App Settings
    appSettings: {
      notificationsEnabled: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true },
      autoPlayVideos: { type: Boolean, default: false },
      dataSaverMode: { type: Boolean, default: false },
      fontSize: { type: Number, default: 14.0 },
      showAnimations: { type: Boolean, default: true },
      measurementSystem: { type: String, default: 'metric', enum: ['metric', 'imperial'] },
      distanceUnit: { type: String, default: 'km' },
      weightUnit: { type: String, default: 'kg' }
    }
  },
  
  // Account status
  accountStatus: { type: String, default: 'active', enum: ['active', 'deactivated', 'deleted'] },
  deactivatedAt: Date,
  deletedAt: Date,

  // Trial tracking system
  trialLimits: {
    totalTrials: { type: Number, default: 3 }, // Total free trials per month
    lastResetDate: { type: Date, default: Date.now }, // Last monthly reset date
    trialHistory: [{
      gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym' },
      gymName: String,
      bookingDate: Date,
      trialDate: Date,
      trialBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrialBooking' },
      status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' }
    }]
  },

  // Auth
   password: String,
  // Forgot password support
  passwordResetOTP: String,
  passwordResetOTPExpiry: Date,

  // Authentication provider
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  workoutSchedule: {
  type: Object, // or Map, or Mixed
  default: {}
}
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
