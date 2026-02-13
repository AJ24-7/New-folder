const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
    unique: true // One subscription per gym
  },
  plan: {
    type: String,
    enum: ['1month', '3month', '6month', '12month'],
    required: true
  },
  planDisplayName: {
    type: String,
    required: true
  },
  pricing: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'expired', 'cancelled', 'pending_payment'],
    default: 'trial'
  },
  trialPeriod: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        // Default trial period of 1 month
        const trialEnd = new Date();
        trialEnd.setMonth(trialEnd.getMonth() + 1);
        return trialEnd;
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  activePeriod: {
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  paymentDetails: {
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal'],
      required: true
    },
    paymentId: String,
    orderId: String,
    transactionId: String,
    lastPaymentDate: Date,
    nextPaymentDate: Date
  },
  autoRenewal: {
    type: Boolean,
    default: true
  },
  features: [{
    name: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  usage: {
    dashboardLogins: {
      type: Number,
      default: 0
    },
    membersManaged: {
      type: Number,
      default: 0
    },
    paymentsProcessed: {
      type: Number,
      default: 0
    },
    biometricScans: {
      type: Number,
      default: 0
    },
    reportsGenerated: {
      type: Number,
      default: 0
    }
  },
  billingHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: Number,
    status: {
      type: String,
      enum: ['success', 'failed', 'pending', 'refunded'],
      default: 'pending'
    },
    paymentMethod: String,
    transactionId: String,
    description: String,
    invoice: {
      invoiceNumber: String,
      invoiceUrl: String
    }
  }],
  notifications: {
    trialEnding: {
      sent: { type: Boolean, default: false },
      sentDate: Date
    },
    subscriptionExpiring: {
      sent: { type: Boolean, default: false },
      sentDate: Date
    },
    paymentFailed: {
      sent: { type: Boolean, default: false },
      sentDate: Date
    },
    subscriptionActivated: {
      sent: { type: Boolean, default: false },
      sentDate: Date
    }
  },
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false
    },
    cancelledDate: Date,
    reason: String,
    refundRequested: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'rejected'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'trialPeriod.endDate': 1 });
subscriptionSchema.index({ 'activePeriod.endDate': 1 });
subscriptionSchema.index({ 'paymentDetails.nextPaymentDate': 1 });

// Virtual for checking if trial is active
subscriptionSchema.virtual('isTrialActive').get(function() {
  return this.trialPeriod.isActive && new Date() <= this.trialPeriod.endDate;
});

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isSubscriptionActive').get(function() {
  return this.status === 'active' && 
         this.activePeriod.endDate && 
         new Date() <= this.activePeriod.endDate;
});

// Virtual for getting remaining trial days
subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.isTrialActive) return 0;
  const today = new Date();
  const trialEnd = new Date(this.trialPeriod.endDate);
  const diffTime = trialEnd - today;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual for getting remaining subscription days
subscriptionSchema.virtual('subscriptionDaysRemaining').get(function() {
  if (!this.isSubscriptionActive) return 0;
  const today = new Date();
  const subEnd = new Date(this.activePeriod.endDate);
  const diffTime = subEnd - today;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Method to upgrade/downgrade subscription
subscriptionSchema.methods.changePlan = function(newPlan, newAmount) {
  this.plan = newPlan;
  this.pricing.amount = newAmount;
  
  // Calculate new billing cycle
  const planToBillingCycle = {
    '1month': 'monthly',
    '3month': 'quarterly', 
    '6month': 'half-yearly',
    '12month': 'yearly'
  };
  this.pricing.billingCycle = planToBillingCycle[newPlan];
  
  // Update plan display name
  const planToDisplayName = {
    '1month': 'Monthly',
    '3month': 'Quarterly',
    '6month': 'Half-Yearly', 
    '12month': 'Annual'
  };
  this.planDisplayName = planToDisplayName[newPlan];
  
  return this.save();
};

// Method to activate subscription after trial
subscriptionSchema.methods.activateSubscription = function() {
  const now = new Date();
  this.status = 'active';
  this.trialPeriod.isActive = false;
  this.activePeriod.startDate = now;
  
  // Calculate end date based on plan
  const endDate = new Date(now);
  const planToMonths = {
    '1month': 1,
    '3month': 3,
    '6month': 6,
    '12month': 12
  };
  endDate.setMonth(endDate.getMonth() + planToMonths[this.plan]);
  this.activePeriod.endDate = endDate;
  
  // Set next payment date
  this.paymentDetails.nextPaymentDate = endDate;
  
  return this.save();
};

// Method to cancel subscription
subscriptionSchema.methods.cancelSubscription = function(reason = '') {
  this.status = 'cancelled';
  this.autoRenewal = false;
  this.cancellation.isCancelled = true;
  this.cancellation.cancelledDate = new Date();
  this.cancellation.reason = reason;
  
  return this.save();
};

// Static method to get subscription analytics
subscriptionSchema.statics.getAnalytics = async function() {
  const totalSubscriptions = await this.countDocuments();
  const activeSubscriptions = await this.countDocuments({ status: 'active' });
  const trialSubscriptions = await this.countDocuments({ status: 'trial' });
  const expiredSubscriptions = await this.countDocuments({ status: 'expired' });
  const cancelledSubscriptions = await this.countDocuments({ status: 'cancelled' });
  
  // Revenue calculation
  const revenueAggregation = await this.aggregate([
    {
      $match: {
        'billingHistory.status': 'success'
      }
    },
    {
      $unwind: '$billingHistory'
    },
    {
      $match: {
        'billingHistory.status': 'success'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$billingHistory.amount' },
        averageRevenue: { $avg: '$billingHistory.amount' }
      }
    }
  ]);
  
  const revenue = revenueAggregation.length > 0 ? revenueAggregation[0] : { totalRevenue: 0, averageRevenue: 0 };
  
  // Plan distribution
  const planDistribution = await this.aggregate([
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        revenue: { $sum: '$pricing.amount' }
      }
    }
  ]);
  
  return {
    total: totalSubscriptions,
    active: activeSubscriptions,
    trial: trialSubscriptions,
    expired: expiredSubscriptions,
    cancelled: cancelledSubscriptions,
    revenue,
    planDistribution
  };
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
