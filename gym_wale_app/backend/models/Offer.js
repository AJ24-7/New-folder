const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['percentage', 'fixed', 'bogo', 'free_trial', 'special'], 
    required: true 
  },
  value: { 
    type: Number, 
    required: true,
    min: 0
  },
  category: { 
    type: String, 
    enum: ['membership', 'training', 'trial', 'equipment', 'all'], 
    default: 'membership' 
  },
  
  // Validity and usage
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  maxUses: { 
    type: Number, 
    default: null // null means unlimited
  },
  usageCount: { 
    type: Number, 
    default: 0 
  },
  minAmount: { 
    type: Number, 
    default: 0 
  },
  
  // Association
  gymId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gym', 
    required: true 
  },
  
  // Template information
  templateId: { 
    type: String // Reference to predefined templates
  },
  features: [{ 
    type: String 
  }],
  
  // Status and tracking
  status: { 
    type: String, 
    enum: ['active', 'paused', 'expired', 'deleted'], 
    default: 'active' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Analytics
  revenue: { 
    type: Number, 
    default: 0 
  },
  conversionRate: { 
    type: Number, 
    default: 0 
  },
  
  // Auto-generated coupon
  couponCode: { 
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  
  // Display settings
  displayOnWebsite: { 
    type: Boolean, 
    default: true 
  },
  highlightOffer: { 
    type: Boolean, 
    default: false 
  },
  
  // Timestamps
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
  },
  // Notification tracking
  offerNotificationSent: { 
    type: Boolean, 
    default: false 
  },
  discount: { type: Number } // Alternative field for discount percentage
}, {
  timestamps: true
});

// Indexes for better performance
offerSchema.index({ gymId: 1, status: 1 });
offerSchema.index({ endDate: 1 });
offerSchema.index({ couponCode: 1 });
offerSchema.index({ templateId: 1 });

// Virtual for checking if offer is currently valid
offerSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.startDate <= now && 
         this.endDate >= now && 
         this.status === 'active' && 
         (this.maxUses === null || this.usageCount < this.maxUses);
});

// Method to check if offer can be used
offerSchema.methods.canBeUsed = function(purchaseAmount = 0) {
  return this.isValid && 
         purchaseAmount >= this.minAmount;
};

// Method to apply the offer
offerSchema.methods.apply = function(originalAmount) {
  if (!this.canBeUsed(originalAmount)) {
    throw new Error('Offer cannot be applied');
  }
  
  let discountAmount = 0;
  
  switch (this.type) {
    case 'percentage':
      discountAmount = (originalAmount * this.value) / 100;
      break;
    case 'fixed':
      discountAmount = Math.min(this.value, originalAmount);
      break;
    case 'bogo':
      // Buy one get one - 50% discount
      discountAmount = originalAmount * 0.5;
      break;
    default:
      discountAmount = 0;
  }
  
  return {
    originalAmount,
    discountAmount,
    finalAmount: originalAmount - discountAmount,
    offerType: this.type,
    offerValue: this.value
  };
};

// Method to increment usage
offerSchema.methods.incrementUsage = async function(revenue = 0) {
  this.usageCount += 1;
  this.revenue += revenue;
  this.updatedAt = new Date();
  
  // Calculate conversion rate (assuming we track views somewhere)
  // This would need to be implemented based on your tracking system
  
  return this.save();
};

// Pre-save middleware to update timestamps
offerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to auto-expire offers
offerSchema.pre('save', function(next) {
  if (new Date() > this.endDate && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Static method to find valid offers for a gym
offerSchema.statics.findValidOffers = function(gymId, category = null) {
  const query = {
    gymId: gymId,
    status: 'active',
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
    $or: [
      { maxUses: null },
      { $expr: { $lt: ['$usageCount', '$maxUses'] } }
    ]
  };
  
  if (category) {
    query.$or = [
      { category: category },
      { category: 'all' }
    ];
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find offers by template
offerSchema.statics.findByTemplate = function(templateId) {
  return this.find({ templateId: templateId });
};

module.exports = mongoose.model('Offer', offerSchema);