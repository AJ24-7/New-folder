const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String 
  },
  
  // Discount details
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: true 
  },
  discountValue: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Usage restrictions
  minAmount: { 
    type: Number, 
    default: 0 
  },
  maxDiscountAmount: { 
    type: Number // For percentage discounts
  },
  usageLimit: { 
    type: Number, 
    default: null // null means unlimited
  },
  usageCount: { 
    type: Number, 
    default: 0 
  },
  userUsageLimit: { 
    type: Number, 
    default: 1 // How many times one user can use this coupon
  },
  
  // Validity
  expiryDate: { 
    type: Date, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Association
  gymId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gym', 
    required: true 
  },
  offerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Offer' // Optional: link to an offer
  },
  
  // Applicable to
  applicableCategories: [{ 
    type: String, 
    enum: ['membership', 'training', 'trial', 'equipment', 'all']
  }],
  applicablePlans: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gym.membershipPlans' // Reference to specific membership plans
  }],
  
  // User restrictions
  newUsersOnly: { 
    type: Boolean, 
    default: false 
  },
  excludedUsers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Analytics
  totalRevenue: { 
    type: Number, 
    default: 0 
  },
  totalSavings: { 
    type: Number, 
    default: 0 
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['active', 'expired', 'disabled', 'draft'], 
    default: 'active' 
  },
  
  // Auto-disable conditions
  autoDisableDate: { 
    type: Date 
  },
  autoDisableAfterUses: { 
    type: Number 
  },
  
  // Creation tracking
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'GymAdmin' 
  }
}, {
  timestamps: true
});

// Indexes for better performance
couponSchema.index({ code: 1 });
couponSchema.index({ gymId: 1, status: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ offerId: 1 });

// Virtual for checking if coupon is currently valid
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.expiryDate >= now && 
         this.isActive && 
         this.status === 'active' && 
         (this.usageLimit === null || this.usageCount < this.usageLimit);
});

// Method to check if coupon can be used by a specific user
couponSchema.methods.canBeUsedBy = function(userId, purchaseAmount = 0, isNewUser = false) {
  // Check basic validity
  if (!this.isValid) {
    return { valid: false, reason: 'Coupon is not valid or has expired' };
  }
  
  // Check minimum amount
  if (purchaseAmount < this.minAmount) {
    return { valid: false, reason: `Minimum purchase amount is ₹${this.minAmount}` };
  }
  
  // Check if new users only
  if (this.newUsersOnly && !isNewUser) {
    return { valid: false, reason: 'This coupon is only for new users' };
  }
  
  // Check if user is excluded
  if (this.excludedUsers.includes(userId)) {
    return { valid: false, reason: 'You are not eligible for this coupon' };
  }
  
  return { valid: true, reason: 'Coupon can be applied' };
};

// Method to apply the coupon
couponSchema.methods.apply = function(originalAmount) {
  if (!this.isValid) {
    throw new Error('Coupon is not valid');
  }
  
  if (originalAmount < this.minAmount) {
    throw new Error(`Minimum purchase amount is ₹${this.minAmount}`);
  }
  
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = (originalAmount * this.discountValue) / 100;
    
    // Apply max discount limit if set
    if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount;
    }
  } else if (this.discountType === 'fixed') {
    discountAmount = Math.min(this.discountValue, originalAmount);
  }
  
  return {
    originalAmount,
    discountAmount,
    finalAmount: originalAmount - discountAmount,
    couponCode: this.code,
    discountType: this.discountType,
    discountValue: this.discountValue
  };
};

// Method to increment usage
couponSchema.methods.incrementUsage = async function(revenue = 0, savings = 0) {
  this.usageCount += 1;
  this.totalRevenue += revenue;
  this.totalSavings += savings;
  this.updatedAt = new Date();
  
  // Auto-disable if usage limit reached
  if (this.autoDisableAfterUses && this.usageCount >= this.autoDisableAfterUses) {
    this.status = 'disabled';
  }
  
  return this.save();
};

// Pre-save middleware to update timestamps
couponSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to auto-expire coupons
couponSchema.pre('save', function(next) {
  const now = new Date();
  
  // Auto-expire if past expiry date
  if (now > this.expiryDate && this.status === 'active') {
    this.status = 'expired';
  }
  
  // Auto-disable if past auto-disable date
  if (this.autoDisableDate && now > this.autoDisableDate && this.status === 'active') {
    this.status = 'disabled';
  }
  
  next();
});

// Static method to find valid coupons for a gym
couponSchema.statics.findValidCoupons = function(gymId, category = null) {
  const query = {
    gymId: gymId,
    status: 'active',
    isActive: true,
    expiryDate: { $gte: new Date() },
    $or: [
      { usageLimit: null },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ]
  };
  
  if (category) {
    query.$or = [
      { applicableCategories: { $in: [category, 'all'] } },
      { applicableCategories: { $size: 0 } } // Empty array means applicable to all
    ];
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find coupon by code
couponSchema.statics.findByCode = function(code, gymId = null) {
  const query = { code: code.toUpperCase() };
  if (gymId) {
    query.gymId = gymId;
  }
  return this.findOne(query);
};

// Static method to validate coupon usage by user
couponSchema.statics.validateUserUsage = async function(couponCode, userId, gymId) {
  const coupon = await this.findByCode(couponCode, gymId);
  if (!coupon) {
    return { valid: false, reason: 'Coupon not found' };
  }
  
  // Check how many times this user has used this coupon
  const CouponUsage = mongoose.model('CouponUsage');
  const userUsageCount = await CouponUsage.countDocuments({
    couponId: coupon._id,
    userId: userId
  });
  
  if (userUsageCount >= coupon.userUsageLimit) {
    return { valid: false, reason: 'You have already used this coupon the maximum number of times' };
  }
  
  return { valid: true, coupon: coupon };
};

module.exports = mongoose.model('Coupon', couponSchema);