const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    index: true
  },
  registrationType: {
    type: String,
    enum: ['standard', 'trial', 'premium'],
    default: 'standard',
    required: true
  },
  defaultPlan: {
    type: String,
    enum: ['basic', 'standard', 'premium', ''],
    default: ''
  },
  usageLimit: {
    type: String,
    default: '1',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  specialOffer: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastUsedAt: {
    type: Date
  },
  registrations: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
qrCodeSchema.index({ gymId: 1, isActive: 1, expiryDate: 1 });
qrCodeSchema.index({ token: 1, isActive: 1 });

// Middleware to check if QR code is expired or usage limit reached
qrCodeSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (new Date() > this.expiryDate) return false;
  if (this.usageLimit !== 'unlimited' && this.usageCount >= parseInt(this.usageLimit)) return false;
  return true;
};

// Method to increment usage count
qrCodeSchema.methods.incrementUsage = function(memberData = {}) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  if (memberData.memberId) {
    this.registrations.push({
      memberId: memberData.memberId,
      registeredAt: new Date(),
      ipAddress: memberData.ipAddress,
      userAgent: memberData.userAgent
    });
  }
  
  // Deactivate if usage limit reached
  if (this.usageLimit !== 'unlimited' && this.usageCount >= parseInt(this.usageLimit)) {
    this.isActive = false;
  }
  
  return this.save();
};

// Static method to get valid QR code by token
qrCodeSchema.statics.getValidQRCode = async function(token) {
  const qrCode = await this.findOne({ 
    token, 
    isActive: true,
    expiryDate: { $gt: new Date() }
  }).populate('gymId', 'name address contact email');
  
  if (!qrCode) return null;
  
  // Check usage limit
  if (qrCode.usageLimit !== 'unlimited' && qrCode.usageCount >= parseInt(qrCode.usageLimit)) {
    return null;
  }
  
  return qrCode;
};

// Static method to cleanup expired QR codes
qrCodeSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    { 
      isActive: true,
      expiryDate: { $lt: new Date() }
    },
    { 
      isActive: false 
    }
  );
  
  return result;
};

// Auto-cleanup expired QR codes daily
qrCodeSchema.statics.scheduleCleanup = function() {
  setInterval(async () => {
    try {
      await this.cleanupExpired();
      console.log('QR codes cleanup completed');
    } catch (error) {
      console.error('QR codes cleanup error:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
};

module.exports = mongoose.model('QRCode', qrCodeSchema);
