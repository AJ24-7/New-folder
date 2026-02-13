const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const gymadminAuth = require('../middleware/gymadminAuth');
const subscriptionController = require('../controllers/subscriptionController');

// Admin routes (full subscription management)
router.get('/admin/all', adminAuth, subscriptionController.getAllSubscriptions);
router.get('/admin/analytics', adminAuth, subscriptionController.getSubscriptionAnalytics);
router.get('/admin/expiring-soon', adminAuth, subscriptionController.getExpiringSoon);
router.get('/admin/:id', adminAuth, subscriptionController.getSubscriptionById);
router.post('/admin/create', adminAuth, subscriptionController.createSubscription);
router.put('/admin/:id/plan', adminAuth, subscriptionController.updateSubscriptionPlan);
router.put('/admin/:id/cancel', adminAuth, subscriptionController.cancelSubscription);
router.put('/admin/:id/reactivate', adminAuth, subscriptionController.reactivateSubscription);
router.post('/admin/:id/manual-payment', adminAuth, subscriptionController.processManualPayment);
router.post('/admin/:id/notify', adminAuth, subscriptionController.sendSubscriptionNotification);

// Gym admin routes (limited access - own subscription only)
router.get('/gym/my-subscription', gymadminAuth, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ gymId: req.admin.id })
      .populate('gymId', 'name email phone address city state');
    
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
    console.error('Error fetching gym subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message
    });
  }
});

router.get('/gym/billing-history', gymadminAuth, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ gymId: req.admin.id });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    res.json({
      success: true,
      data: subscription.billingHistory.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing history',
      error: error.message
    });
  }
});

router.get('/gym/usage-stats', gymadminAuth, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ gymId: req.admin.id });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    res.json({
      success: true,
      data: subscription.usage
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage stats',
      error: error.message
    });
  }
});

// Gym subscription renewal endpoint
router.post('/gym/renew', gymadminAuth, async (req, res) => {
  try {
    const { plan, paymentMethod } = req.body;
    
    if (!plan || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Plan and payment method are required'
      });
    }
    
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ gymId: req.admin.id });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Calculate new dates and pricing
    const planPricing = {
      '1month': { amount: 999, displayName: 'Monthly', billingCycle: 'monthly', duration: 30 },
      '3month': { amount: 1699, displayName: 'Quarterly', billingCycle: 'quarterly', duration: 90 },
      '6month': { amount: 3299, displayName: 'Half-Yearly', billingCycle: 'half-yearly', duration: 180 }
    };
    
    const pricing = planPricing[plan];
    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Simulate payment processing (replace with actual payment gateway integration)
    const transactionId = 'txn_' + Math.random().toString(36).substr(2, 9);
    
    // Update subscription
    const currentEndDate = new Date(subscription.activePeriod.endDate);
    const newStartDate = currentEndDate > new Date() ? currentEndDate : new Date();
    const newEndDate = new Date(newStartDate.getTime() + pricing.duration * 24 * 60 * 60 * 1000);
    
    subscription.plan = plan;
    subscription.planDisplayName = pricing.displayName;
    subscription.pricing = {
      amount: pricing.amount,
      currency: 'INR',
      billingCycle: pricing.billingCycle
    };
    subscription.activePeriod = {
      startDate: newStartDate,
      endDate: newEndDate
    };
    subscription.paymentDetails.lastPaymentDate = new Date();
    subscription.paymentDetails.nextPaymentDate = newEndDate;
    subscription.paymentDetails.paymentMethod = paymentMethod;
    subscription.status = 'active';
    
    // Add to billing history
    subscription.billingHistory.push({
      date: new Date(),
      amount: pricing.amount,
      status: 'success',
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      description: `Subscription renewal - ${pricing.displayName} plan`
    });
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        subscription,
        transactionId
      }
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error renewing subscription',
      error: error.message
    });
  }
});

// Gym subscription plan change endpoint
router.put('/gym/change-plan', gymadminAuth, async (req, res) => {
  try {
    const { newPlan } = req.body;
    
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: 'New plan is required'
      });
    }
    
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ gymId: req.admin.id });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.plan === newPlan) {
      return res.status(400).json({
        success: false,
        message: 'You are already on this plan'
      });
    }
    
    // Calculate new pricing
    const planPricing = {
      '1month': { amount: 999, displayName: 'Monthly', billingCycle: 'monthly', duration: 30 },
      '3month': { amount: 1699, displayName: 'Quarterly', billingCycle: 'quarterly', duration: 90 },
      '6month': { amount: 3299, displayName: 'Half-Yearly', billingCycle: 'half-yearly', duration: 180 }
    };
    
    const newPricing = planPricing[newPlan];
    if (!newPricing) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Update subscription plan
    const oldPlan = subscription.planDisplayName;
    subscription.plan = newPlan;
    subscription.planDisplayName = newPricing.displayName;
    subscription.pricing = {
      amount: newPricing.amount,
      currency: 'INR',
      billingCycle: newPricing.billingCycle
    };
    
    // Adjust features based on new plan
    const planFeatures = {
      '1month': [
        { name: 'Customizable Dashboard', enabled: true },
        { name: 'Basic Payment Management', enabled: true },
        { name: 'Standard Data Protection', enabled: true },
        { name: 'Email Support', enabled: true },
        { name: 'Basic Membership Handler', enabled: true },
        { name: 'Fingerprint & Face Recognition', enabled: false },
        { name: 'Advanced Analytics & Reports', enabled: false },
        { name: 'Multi-Location Management', enabled: false }
      ],
      '3month': [
        { name: 'Customizable Dashboard', enabled: true },
        { name: 'Full Payment Management', enabled: true },
        { name: 'Enhanced Data Protection', enabled: true },
        { name: 'Priority Support', enabled: true },
        { name: 'Enhanced Membership Handler', enabled: true },
        { name: 'Fingerprint & Face Recognition', enabled: true },
        { name: 'Advanced Analytics & Reports', enabled: true },
        { name: 'Multi-Location Management', enabled: false }
      ],
      '6month': [
        { name: 'Customizable Dashboard', enabled: true },
        { name: 'Full Payment Management', enabled: true },
        { name: 'Premium Data Protection', enabled: true },
        { name: 'Premium Support', enabled: true },
        { name: 'Enhanced Membership Handler', enabled: true },
        { name: 'Fingerprint & Face Recognition', enabled: true },
        { name: 'Advanced Analytics & Reports', enabled: true },
        { name: 'Multi-Location Management', enabled: true }
      ]
    };
    
    subscription.features = planFeatures[newPlan];
    
    await subscription.save();
    
    res.json({
      success: true,
      message: `Plan changed from ${oldPlan} to ${newPricing.displayName} successfully`,
      data: subscription
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing plan',
      error: error.message
    });
  }
});

// Gym invoice download endpoint
router.get('/gym/invoice/:transactionId', gymadminAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const Subscription = require('../models/Subscription');
    
    const subscription = await Subscription.findOne({ 
      gymId: req.admin.id,
      'billingHistory.transactionId': transactionId 
    }).populate('gymId', 'gymName email phone address city state');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const payment = subscription.billingHistory.find(p => p.transactionId === transactionId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }
    
    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${transactionId}`,
      date: payment.date,
      gymName: subscription.gymId.gymName,
      gymDetails: {
        email: subscription.gymId.email,
        phone: subscription.gymId.phone,
        address: subscription.gymId.address,
        city: subscription.gymId.city,
        state: subscription.gymId.state
      },
      amount: payment.amount,
      currency: 'INR',
      description: payment.description,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      status: payment.status
    };
    
    res.json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
});

// Public route for creating subscription during gym registration
router.post('/create-for-gym', async (req, res) => {
  try {
    const { gymId, plan, paymentMethod } = req.body;
    
    if (!gymId || !plan || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: gymId, plan, paymentMethod'
      });
    }
    
    // Call the controller function
    await subscriptionController.createSubscription(req, res);
  } catch (error) {
    console.error('Error in subscription creation route:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
});

// Payment webhook handlers (for payment gateway integration)
router.post('/webhook/razorpay', async (req, res) => {
  try {
    const crypto = require('crypto');
    const Subscription = require('../models/Subscription');
    
    // Verify Razorpay signature
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }
    
    const { event, payload } = req.body;
    
    if (event === 'payment.captured') {
      const { payment } = payload;
      
      // Find subscription by order ID or payment ID
      const subscription = await Subscription.findOne({
        $or: [
          { 'paymentDetails.orderId': payment.order_id },
          { 'paymentDetails.paymentId': payment.id }
        ]
      });
      
      if (subscription) {
        // Update payment details
        subscription.paymentDetails.paymentId = payment.id;
        subscription.paymentDetails.transactionId = payment.id;
        subscription.paymentDetails.lastPaymentDate = new Date();
        
        // Add to billing history
        subscription.billingHistory.push({
          date: new Date(),
          amount: payment.amount / 100, // Razorpay amount is in paise
          status: 'success',
          paymentMethod: 'razorpay',
          transactionId: payment.id,
          description: `Payment for ${subscription.planDisplayName} plan`
        });
        
        // Activate subscription if it was in trial
        if (subscription.status === 'trial') {
          await subscription.activateSubscription();
        }
        
        await subscription.save();
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook/stripe', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const Subscription = require('../models/Subscription');
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      event = req.body;
    }
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Find subscription by payment intent ID or session ID
      const subscription = await Subscription.findOne({
        'paymentDetails.paymentId': session.payment_intent
      });
      
      if (subscription) {
        // Update payment details
        subscription.paymentDetails.transactionId = session.payment_intent;
        subscription.paymentDetails.lastPaymentDate = new Date();
        
        // Add to billing history
        subscription.billingHistory.push({
          date: new Date(),
          amount: session.amount_total / 100, // Stripe amount is in cents
          status: 'success',
          paymentMethod: 'stripe',
          transactionId: session.payment_intent,
          description: `Payment for ${subscription.planDisplayName} plan`
        });
        
        // Activate subscription if it was in trial
        if (subscription.status === 'trial') {
          await subscription.activateSubscription();
        }
        
        await subscription.save();
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
