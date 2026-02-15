const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema({
  gymName: { type: String, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'GymAdmin', required: false },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  passwordResetOTP: { type: String },
  passwordResetOTPExpiry: { type: Date },
  
  // Two-Factor Authentication fields
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorOTP: { type: String }, // Current OTP for email-based 2FA
  twoFactorOTPExpiry: { type: Date }, // OTP expiry time
  twoFactorSecret: { type: String }, // Keep for backward compatibility
  twoFactorTempSecret: { type: String }, // Temporary secret during setup
  twoFactorBackupCodes: [{ type: String }], // Hashed backup codes
   
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: { type: String },
    lat: { type: Number }, // Latitude coordinate
    lng: { type: Number },  // Longitude coordinate
    geofenceRadius: { type: Number, default: 100 } // Radius in meters for geofencing, default 100m
  },

  description: { type: String, required: true },
  gymPhotos: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      required: true,
      enum: ['facilities', 'equipment', 'classes', 'exterior', 'amenities', 'general'],
      default: 'general'
    },
    imageUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  logoUrl: { type: String },

  equipment: [{
    id: { type: String, default: () => new Date().getTime().toString() },
    name: { type: String, required: false }, // Made optional for backward compatibility
    brand: { type: String },
    category: { type: String, enum: ['cardio', 'strength', 'functional', 'flexibility', 'accessories', 'other'], default: 'other' },
    model: { type: String },
    quantity: { type: Number, default: 1 },
    status: { type: String, enum: ['available', 'maintenance', 'out-of-order'], default: 'available' },
    purchaseDate: { type: Date },
    price: { type: Number },
    warranty: { type: Number }, // warranty period in months
    location: { type: String }, // location within gym
    description: { type: String },
    specifications: { type: String },
    photos: [{ type: String }], // Array of photo URLs
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  activities: [{
    name: { type: String, required: true },
    icon: { type: String, default: 'fa-dumbbell' }, // FontAwesome icon class
    description: { type: String, default: '' }
  }],

  membershipPlan: {
    name: { type: String, default: 'Standard' },
    icon: { type: String, default: 'fa-star' },
    color: { type: String, default: '#3a86ff' },
    benefits: [{ type: String }],
    note: { type: String, default: 'Flexible membership options' },
    monthlyOptions: [
      {
        months: { type: Number, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        isPopular: { type: Boolean, default: false }
      }
    ]
  },

  contactPerson: { type: String, required: true },  // Use contactPerson for the owner's name
  supportEmail: { type: String, required: true },
  supportPhone: { type: String, required: true },
  
  // Operating hours with morning and evening slots
  operatingHours: {
    morning: {
      opening: { type: String }, // e.g., "06:00"
      closing: { type: String }  // e.g., "12:00"
    },
    evening: {
      opening: { type: String }, // e.g., "16:00"
      closing: { type: String }  // e.g., "22:00"
    }
  },
  
  // Legacy fields for backward compatibility
  openingTime: { type: String },
  closingTime: { type: String },

  membersCount: { type: Number, required: true, default: 0 }, // added new field
  status: { type: String, default: 'pending' },
  rejectionReason: { type: String },

  lastLogin: { type: Date }, // Track last login for dashboard usage

  // Membership Settings
  allowMembershipFreezing: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  approvedAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date
  }
});

// Automatically update `updatedAt` on save
gymSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  
  // Convert old string equipment format to new object format
  if (this.equipment && this.equipment.length > 0) {
    this.equipment = this.equipment.map(item => {
      // If item is a string, convert to object
      if (typeof item === 'string') {
        return {
          id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
          name: item,
          category: 'other',
          quantity: 1,
          status: 'available',
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      // If item is already an object but missing required fields, add them
      if (typeof item === 'object' && item !== null) {
        if (!item.name && typeof item === 'string') {
          item.name = item.toString();
        }
        if (!item.id) {
          item.id = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
        }
        if (!item.category) {
          item.category = 'other';
        }
        if (!item.quantity) {
          item.quantity = 1;
        }
        if (!item.status) {
          item.status = 'available';
        }
        if (!item.photos) {
          item.photos = [];
        }
        if (!item.createdAt) {
          item.createdAt = new Date();
        }
        item.updatedAt = new Date();
      }
      return item;
    });
  }
  
  next();
});

// Explicitly specify the collection name to ensure it matches MongoDB
module.exports = mongoose.models.Gym || mongoose.model('Gym', gymSchema, 'gyms');
