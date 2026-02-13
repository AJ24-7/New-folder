// models/trainerModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const trainerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  // Authentication fields
  password: { type: String, required: true, select: false },
  specialty: { type: String, required: true },
  experience: { type: Number, required: true },
  locations: { type: [String], default: [] },
  availability: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }, // Can be string or object for structured availability
  certifications: { type: [String], default: [] }, // filenames
  bio: { type: String, default: '' },
  // Enhanced rate structure
  rateTypes: {
    type: [String],
    enum: ['hourly', 'monthly'],
    default: ['hourly'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one rate type must be selected'
    }
  },
  hourlyRate: {
    type: Number,
    required: function() {
      return this.rateTypes && this.rateTypes.includes('hourly');
    },
    min: [100, 'Hourly rate must be at least ₹100']
  },
  monthlyRate: {
    type: Number,
    required: function() {
      return this.rateTypes && this.rateTypes.includes('monthly');
    },
    min: [2000, 'Monthly rate must be at least ₹2000']
  },
  // Legacy rate field for backward compatibility
  rate: { 
    type: Number, 
    default: function() {
      return this.hourlyRate || this.monthlyRate || 0;
    }
  },
  photo: { type: String, default: '' }, // profile photo filename
  trainerType: {
    type: String,
    enum: ['gym', 'independent'],
    default: 'gym',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true
  },
  gym: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gym', 
    required: function() {
      return this.trainerType === 'gym';
    }
  },
  // Independent trainer specific fields
  isIndependent: {
    type: Boolean,
    default: function() {
      return this.trainerType === 'independent';
    }
  },
  hasInsurance: {
    type: Boolean,
    default: false,
    required: function() {
      return this.trainerType === 'independent';
    }
  },
  serviceArea: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        if (this.trainerType === 'independent') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Service area is required for independent trainers'
    }
  },
  // Professional details
  profileVisibility: {
    type: String,
    enum: ['public', 'gym-only', 'private'],
    default: function() {
      return this.trainerType === 'independent' ? 'public' : 'gym-only';
    }
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  joinedAt: { type: Date, default: Date.now },
  rejectionReason: { type: String, default: '' },
  lastActiveAt: { type: Date, default: Date.now },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  // Password reset & security metadata
  resetPasswordOTP: { type: String, select: false },
  resetPasswordOTPExpiry: { type: Date, select: false },
  passwordChangedAt: { type: Date },
  // Review & approval workflow metadata
  reviewTarget: {
    type: String,
    enum: ['gymAdmin', 'mainAdmin'],
    default: function() {
      return this.trainerType === 'gym' ? 'gymAdmin' : 'mainAdmin';
    },
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  reviewedAt: { type: Date, default: null },
  reviewNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Index for better query performance
trainerSchema.index({ email: 1 });
trainerSchema.index({ phone: 1 });
trainerSchema.index({ trainerType: 1, status: 1 });
trainerSchema.index({ gym: 1, status: 1 });
trainerSchema.index({ locations: 1, status: 1 });
trainerSchema.index({ reviewTarget: 1, status: 1 });

// Virtual for full name
trainerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to check if trainer can accept new clients
trainerSchema.methods.canAcceptClients = function() {
  return this.status === 'approved' && this.verificationStatus === 'verified';
};

// Method to get trainer's display location
trainerSchema.methods.getDisplayLocation = function() {
  if (this.trainerType === 'independent') {
    return this.serviceArea.join(', ');
  } else if (this.gym) {
    return this.gym.location?.city || 'Gym Location';
  }
  return 'Not specified';
};

// Method to get formatted rate display
trainerSchema.methods.getRateDisplay = function() {
  const rates = [];
  if (this.rateTypes.includes('hourly') && this.hourlyRate) {
    rates.push(`₹${this.hourlyRate}/hour`);
  }
  if (this.rateTypes.includes('monthly') && this.monthlyRate) {
    rates.push(`₹${this.monthlyRate}/month`);
  }
  return rates.length > 0 ? rates.join(' • ') : 'Rate not specified';
};

// Method to get minimum rate for sorting/filtering
trainerSchema.methods.getMinRate = function() {
  const rates = [];
  if (this.hourlyRate) rates.push(this.hourlyRate);
  if (this.monthlyRate) rates.push(this.monthlyRate / 30); // Convert monthly to daily equivalent
  return rates.length > 0 ? Math.min(...rates) : 0;
};
// Hash password before save if modified (place before export)
trainerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (err) { next(err); }
});

// Compare password
trainerSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Trainer', trainerSchema);
