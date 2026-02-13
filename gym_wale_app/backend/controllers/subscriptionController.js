const Subscription = require('../models/Subscription');
const Gym = require('../models/gym');
const GymNotification = require('../models/GymNotification');
const sendEmail = require('../utils/sendEmail');

// Subscription Management for Admin Dashboard
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, plan, search } = req.query;
    const query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by plan
    if (plan) {
      query.plan = plan;
    }
    
    // Search functionality
    let gymIds = [];
    if (search) {
      const gyms = await Gym.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      gymIds = gyms.map(gym => gym._id);
      query.gymId = { $in: gymIds };
    }
    
    const subscriptions = await Subscription.find(query)
      .populate('gymId', 'name email phone city state status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Subscription.countDocuments(query);
    
    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

// Get subscription analytics for admin dashboard
exports.getSubscriptionAnalytics = async (req, res) => {
  try {
    const analytics = await Subscription.getAnalytics();
    
    // Additional metrics
    const trialEndingSoon = await Subscription.countDocuments({
      status: 'trial',
      'trialPeriod.endDate': {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    });
    
    const subscriptionExpiringSoon = await Subscription.countDocuments({
      status: 'active',
      'activePeriod.endDate': {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    });
    
    const monthlyRevenue = await Subscription.aggregate([
      {
        $unwind: '$billingHistory'
      },
      {
        $match: {
          'billingHistory.status': 'success',
          'billingHistory.date': {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$billingHistory.amount' }
        }
      }
    ]);
    
    const thisMonthRevenue = monthlyRevenue.length > 0 ? monthlyRevenue[0].revenue : 0;
    
    res.json({
      success: true,
      data: {
        ...analytics,
        trialEndingSoon,
        subscriptionExpiringSoon,
        thisMonthRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription analytics',
      error: error.message
    });
  }
};

// Get specific subscription details
exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findById(id)
      .populate('gymId', 'name email phone address city state pincode currentMembers status');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message
    });
  }
};

// Create subscription for a gym (used during gym registration)
exports.createSubscription = async (req, res) => {
  try {
    const { gymId, plan, paymentMethod } = req.body;
    
    // Validate gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }
    
    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({ gymId });
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Subscription already exists for this gym'
      });
    }
    
    // Plan pricing mapping
    const planPricing = {
      '1month': { amount: 999, displayName: 'Monthly', billingCycle: 'monthly' },
      '3month': { amount: 1699, displayName: 'Quarterly', billingCycle: 'quarterly' },
      '6month': { amount: 3299, displayName: 'Half-Yearly', billingCycle: 'half-yearly' },
      '12month': { amount: 5999, displayName: 'Annual', billingCycle: 'yearly' }
    };
    
    const pricing = planPricing[plan];
    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Create subscription with default features
    const subscription = new Subscription({
      gymId,
      plan,
      planDisplayName: pricing.displayName,
      pricing: {
        amount: pricing.amount,
        currency: 'INR',
        billingCycle: pricing.billingCycle
      },
      paymentDetails: {
        paymentMethod
      },
      features: [
        { name: 'Customizable Dashboard', enabled: true },
        { name: 'Full Payment Management', enabled: true },
        { name: 'Secure Data Protection', enabled: true },
        { name: 'Full Customer Support', enabled: true },
        { name: 'Enhanced Membership Handler', enabled: true },
        { name: 'Fingerprint & Face Recognition', enabled: true },
        { name: 'Advanced Analytics & Reports', enabled: true },
        { name: 'Multi-Location Management', enabled: true }
      ]
    });
    
    await subscription.save();
    
    // Send welcome email
    try {
      await sendEmail({
        to: gym.email,
        subject: 'Welcome to Gym-Wale - Your Trial Period Has Started!',
        html: `
          <h2>Welcome to Gym-Wale!</h2>
          <p>Dear ${gym.name},</p>
          <p>Your subscription has been successfully created with a 1-month free trial.</p>
          <p><strong>Plan:</strong> ${pricing.displayName}</p>
          <p><strong>Trial Period:</strong> Until ${subscription.trialPeriod.endDate.toDateString()}</p>
          <p>You can now access your dashboard and start managing your gym operations.</p>
          <p>Best regards,<br>Gym-Wale Team</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

// Update subscription plan (admin only)
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, customAmount } = req.body;
    
    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Plan pricing mapping
    const planPricing = {
      '1month': { amount: 999, displayName: 'Monthly', billingCycle: 'monthly' },
      '3month': { amount: 1699, displayName: 'Quarterly', billingCycle: 'quarterly' },
      '6month': { amount: 3299, displayName: 'Half-Yearly', billingCycle: 'half-yearly' },
      '12month': { amount: 5999, displayName: 'Annual', billingCycle: 'yearly' }
    };
    
    const pricing = planPricing[plan];
    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Use custom amount if provided (admin override)
    const finalAmount = customAmount || pricing.amount;
    
    await subscription.changePlan(plan, finalAmount);
    
    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription plan',
      error: error.message
    });
  }
};

// Cancel subscription (admin action)
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refundAmount } = req.body;
    
    const subscription = await Subscription.findById(id).populate('gymId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    await subscription.cancelSubscription(reason);
    
    // If refund amount is specified, mark it for processing
    if (refundAmount && refundAmount > 0) {
      subscription.cancellation.refundRequested = true;
      subscription.cancellation.refundAmount = refundAmount;
      await subscription.save();
    }
    
    // Send cancellation email
    try {
      await sendEmail({
        to: subscription.gymId.email,
        subject: 'Subscription Cancelled - Gym-Wale',
        html: `
          <h2>Subscription Cancelled</h2>
          <p>Dear ${subscription.gymId.name},</p>
          <p>Your subscription has been cancelled.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          ${refundAmount ? `<p>A refund of ₹${refundAmount} will be processed within 5-7 business days.</p>` : ''}
          <p>Thank you for using Gym-Wale.</p>
          <p>Best regards,<br>Gym-Wale Team</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

// Reactivate cancelled subscription
exports.reactivateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subscription = await Subscription.findById(id).populate('gymId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Only cancelled subscriptions can be reactivated'
      });
    }
    
    // Reactivate subscription
    subscription.status = 'active';
    subscription.autoRenewal = true;
    subscription.cancellation.isCancelled = false;
    subscription.cancellation.cancelledDate = null;
    subscription.cancellation.reason = '';
    
    // Extend subscription period
    const now = new Date();
    subscription.activePeriod.startDate = now;
    
    const planToMonths = {
      '1month': 1,
      '3month': 3,
      '6month': 6,
      '12month': 12
    };
    
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + planToMonths[subscription.plan]);
    subscription.activePeriod.endDate = endDate;
    subscription.paymentDetails.nextPaymentDate = endDate;
    
    await subscription.save();
    
    // Send reactivation email
    try {
      await sendEmail({
        to: subscription.gymId.email,
        subject: 'Subscription Reactivated - Gym-Wale',
        html: `
          <h2>Subscription Reactivated</h2>
          <p>Dear ${subscription.gymId.name},</p>
          <p>Your subscription has been successfully reactivated.</p>
          <p><strong>Plan:</strong> ${subscription.planDisplayName}</p>
          <p><strong>Valid Until:</strong> ${subscription.activePeriod.endDate.toDateString()}</p>
          <p>You can now access your dashboard and resume managing your gym operations.</p>
          <p>Best regards,<br>Gym-Wale Team</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending reactivation email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating subscription',
      error: error.message
    });
  }
};

// Process payment manually (admin override)
exports.processManualPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, description } = req.body;
    
    const subscription = await Subscription.findById(id).populate('gymId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Add payment to billing history
    const payment = {
      date: new Date(),
      amount: amount,
      status: 'success',
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      description: description || 'Manual payment processed by admin'
    };
    
    subscription.billingHistory.push(payment);
    subscription.paymentDetails.lastPaymentDate = new Date();
    
    // If subscription was expired or pending payment, reactivate it
    if (subscription.status === 'expired' || subscription.status === 'pending_payment') {
      await subscription.activateSubscription();
    }
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error processing manual payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing manual payment',
      error: error.message
    });
  }
};

// Get subscriptions expiring soon (for notifications)
exports.getExpiringSoon = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    
    const trialExpiring = await Subscription.find({
      status: 'trial',
      'trialPeriod.endDate': {
        $gte: new Date(),
        $lte: futureDate
      }
    }).populate('gymId', 'name email phone');
    
    const subscriptionExpiring = await Subscription.find({
      status: 'active',
      'activePeriod.endDate': {
        $gte: new Date(),
        $lte: futureDate
      }
    }).populate('gymId', 'name email phone');
    
    res.json({
      success: true,
      data: {
        trialExpiring,
        subscriptionExpiring
      }
    });
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring subscriptions',
      error: error.message
    });
  }
};

// Send notification to gym about subscription
exports.sendSubscriptionNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, customMessage } = req.body;
    
    const subscription = await Subscription.findById(id).populate('gymId');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    let subject, html;
    
    switch (type) {
      case 'trial_ending':
        subject = 'Trial Period Ending Soon - Gym-Wale';
        html = `
          <h2>Trial Period Ending Soon</h2>
          <p>Dear ${subscription.gymId.name},</p>
          <p>Your trial period will end on ${subscription.trialPeriod.endDate.toDateString()}.</p>
          <p>To continue using our services, please complete your payment.</p>
          <p><strong>Plan:</strong> ${subscription.planDisplayName}</p>
          <p><strong>Amount:</strong> ₹${subscription.pricing.amount}</p>
          ${customMessage ? `<p>${customMessage}</p>` : ''}
          <p>Best regards,<br>Gym-Wale Team</p>
        `;
        break;
      case 'payment_reminder':
        subject = 'Payment Reminder - Gym-Wale';
        html = `
          <h2>Payment Reminder</h2>
          <p>Dear ${subscription.gymId.name},</p>
          <p>This is a reminder that your payment is due.</p>
          <p><strong>Amount:</strong> ₹${subscription.pricing.amount}</p>
          <p><strong>Due Date:</strong> ${subscription.paymentDetails.nextPaymentDate.toDateString()}</p>
          ${customMessage ? `<p>${customMessage}</p>` : ''}
          <p>Please complete your payment to avoid service interruption.</p>
          <p>Best regards,<br>Gym-Wale Team</p>
        `;
        break;
      case 'custom':
        subject = 'Important Update - Gym-Wale';
        html = `
          <h2>Important Update</h2>
          <p>Dear ${subscription.gymId.name},</p>
          ${customMessage ? `<p>${customMessage}</p>` : '<p>We have an important update regarding your subscription.</p>'}
          <p>Best regards,<br>Gym-Wale Team</p>
        `;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
    }
    
    // Send email
    await sendEmail({
      to: subscription.gymId.email,
      subject,
      html
    });
    
    // Create gym notification
    await GymNotification.create({
      gymId: subscription.gymId._id,
      title: subject,
      message: customMessage || 'Please check your email for important subscription information.',
      type: 'subscription',
      priority: 'high'
    });
    
    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message
    });
  }
};

module.exports = exports;
