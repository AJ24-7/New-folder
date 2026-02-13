const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
  couponId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Coupon', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  gymId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gym', 
    required: true 
  },
  
  // Usage details
  originalAmount: { 
    type: Number, 
    required: true 
  },
  discountAmount: { 
    type: Number, 
    required: true 
  },
  finalAmount: { 
    type: Number, 
    required: true 
  },
  
  // Transaction details
  transactionId: { 
    type: String // Payment gateway transaction ID
  },
  membershipId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Membership' // If used for membership purchase
  },
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment' // Link to payment record
  },
  
  // Context
  usageType: { 
    type: String, 
    enum: ['membership', 'training', 'trial', 'equipment', 'other'],
    required: true
  },
  usageDescription: { 
    type: String 
  },
  
  // Tracking
  ipAddress: { 
    type: String 
  },
  userAgent: { 
    type: String 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  
  // Timestamps
  usedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  },
  
  // Refund tracking
  refundedAt: { 
    type: Date 
  },
  refundReason: { 
    type: String 
  },
  refundAmount: { 
    type: Number 
  }
}, {
  timestamps: true
});

// Indexes for better performance
couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ gymId: 1, usedAt: -1 });
couponUsageSchema.index({ transactionId: 1 });
couponUsageSchema.index({ status: 1 });

// Method to mark usage as completed
couponUsageSchema.methods.markCompleted = function(transactionId = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionId) {
    this.transactionId = transactionId;
  }
  return this.save();
};

// Method to mark usage as failed
couponUsageSchema.methods.markFailed = function(reason = null) {
  this.status = 'failed';
  if (reason) {
    this.usageDescription = reason;
  }
  return this.save();
};

// Method to process refund
couponUsageSchema.methods.processRefund = function(amount, reason) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundAmount = amount;
  this.refundReason = reason;
  return this.save();
};

// Static method to get usage statistics for a coupon
couponUsageSchema.statics.getCouponStats = function(couponId) {
  return this.aggregate([
    { $match: { couponId: mongoose.Types.ObjectId(couponId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalOriginalAmount: { $sum: '$originalAmount' },
        totalDiscountAmount: { $sum: '$discountAmount' },
        totalFinalAmount: { $sum: '$finalAmount' }
      }
    }
  ]);
};

// Static method to get usage statistics for a gym
couponUsageSchema.statics.getGymStats = function(gymId, startDate = null, endDate = null) {
  const matchCondition = { gymId: mongoose.Types.ObjectId(gymId) };
  
  if (startDate && endDate) {
    matchCondition.usedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: {
          year: { $year: '$usedAt' },
          month: { $month: '$usedAt' },
          status: '$status'
        },
        count: { $sum: 1 },
        totalSavings: { $sum: '$discountAmount' },
        totalRevenue: { $sum: '$finalAmount' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);
};

// Static method to get top performing coupons
couponUsageSchema.statics.getTopCoupons = function(gymId, limit = 10) {
  return this.aggregate([
    { 
      $match: { 
        gymId: mongoose.Types.ObjectId(gymId),
        status: 'completed'
      } 
    },
    {
      $group: {
        _id: '$couponId',
        usageCount: { $sum: 1 },
        totalSavings: { $sum: '$discountAmount' },
        totalRevenue: { $sum: '$finalAmount' },
        avgOrderValue: { $avg: '$originalAmount' }
      }
    },
    {
      $lookup: {
        from: 'coupons',
        localField: '_id',
        foreignField: '_id',
        as: 'coupon'
      }
    },
    { $unwind: '$coupon' },
    { $sort: { usageCount: -1 } },
    { $limit: limit }
  ]);
};

// Static method to check user eligibility for new user coupons
couponUsageSchema.statics.isNewUser = function(userId, gymId) {
  return this.findOne({
    userId: mongoose.Types.ObjectId(userId),
    gymId: mongoose.Types.ObjectId(gymId),
    status: 'completed'
  }).then(usage => !usage); // Returns true if no completed usage found
};

module.exports = mongoose.model('CouponUsage', couponUsageSchema);