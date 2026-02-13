const Subscription = require('../models/Subscription');
const Gym = require('../models/gym');
const GymNotification = require('../models/GymNotification');
const sendEmail = require('../utils/sendEmail');
const cron = require('node-cron');

class SubscriptionService {
  
  // Initialize cron jobs for subscription management
  static initializeCronJobs() {
    // Check for expiring trials daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily subscription check...');
      await this.checkExpiringTrials();
      await this.checkExpiredSubscriptions();
      await this.sendRenewalReminders();
    });
    
    // Check for failed payments every hour
    cron.schedule('0 * * * *', async () => {
      await this.handleFailedPayments();
    });
    
    console.log('Subscription cron jobs initialized');
  }
  
  // Check for trials expiring in the next 7, 3, and 1 days
  static async checkExpiringTrials() {
    try {
      const now = new Date();
      
      // Trials expiring in 7 days
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const trialsExpiring7Days = await Subscription.find({
        status: 'trial',
        'trialPeriod.isActive': true,
        'trialPeriod.endDate': {
          $gte: now,
          $lte: sevenDaysFromNow
        },
        'notifications.trialEnding.sent': false
      }).populate('gymId');
      
      for (const subscription of trialsExpiring7Days) {
        await this.sendTrialExpiringNotification(subscription, 7);
        subscription.notifications.trialEnding.sent = true;
        subscription.notifications.trialEnding.sentDate = new Date();
        await subscription.save();
      }
      
      // Trials expiring in 3 days
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const trialsExpiring3Days = await Subscription.find({
        status: 'trial',
        'trialPeriod.isActive': true,
        'trialPeriod.endDate': {
          $gte: now,
          $lte: threeDaysFromNow
        }
      }).populate('gymId');
      
      for (const subscription of trialsExpiring3Days) {
        await this.sendTrialExpiringNotification(subscription, 3);
      }
      
      // Trials expiring in 1 day
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const trialsExpiring1Day = await Subscription.find({
        status: 'trial',
        'trialPeriod.isActive': true,
        'trialPeriod.endDate': {
          $gte: now,
          $lte: oneDayFromNow
        }
      }).populate('gymId');
      
      for (const subscription of trialsExpiring1Day) {
        await this.sendTrialExpiringNotification(subscription, 1);
      }
      
      console.log(`Trial expiration notifications sent: 7 days: ${trialsExpiring7Days.length}, 3 days: ${trialsExpiring3Days.length}, 1 day: ${trialsExpiring1Day.length}`);
    } catch (error) {
      console.error('Error checking expiring trials:', error);
    }
  }
  
  // Check for expired subscriptions and trials
  static async checkExpiredSubscriptions() {
    try {
      const now = new Date();
      
      // Expire trials
      const expiredTrials = await Subscription.find({
        status: 'trial',
        'trialPeriod.endDate': { $lt: now }
      });
      
      for (const subscription of expiredTrials) {
        subscription.status = 'pending_payment';
        subscription.trialPeriod.isActive = false;
        await subscription.save();
      }
      
      // Expire active subscriptions
      const expiredSubscriptions = await Subscription.find({
        status: 'active',
        'activePeriod.endDate': { $lt: now }
      });
      
      for (const subscription of expiredSubscriptions) {
        subscription.status = 'expired';
        await subscription.save();
      }
      
      console.log(`Expired: ${expiredTrials.length} trials, ${expiredSubscriptions.length} subscriptions`);
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
    }
  }
  
  // Send renewal reminders for active subscriptions
  static async sendRenewalReminders() {
    try {
      const now = new Date();
      const reminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const subscriptionsExpiringSoon = await Subscription.find({
        status: 'active',
        'activePeriod.endDate': {
          $gte: now,
          $lte: reminderDate
        },
        'notifications.subscriptionExpiring.sent': false
      }).populate('gymId');
      
      for (const subscription of subscriptionsExpiringSoon) {
        await this.sendRenewalReminderNotification(subscription);
        subscription.notifications.subscriptionExpiring.sent = true;
        subscription.notifications.subscriptionExpiring.sentDate = new Date();
        await subscription.save();
      }
      
      console.log(`Renewal reminders sent: ${subscriptionsExpiringSoon.length}`);
    } catch (error) {
      console.error('Error sending renewal reminders:', error);
    }
  }
  
  // Handle failed payments
  static async handleFailedPayments() {
    try {
      const subscriptionsWithFailedPayments = await Subscription.find({
        status: 'pending_payment',
        'paymentDetails.nextPaymentDate': { $lt: new Date() }
      }).populate('gymId');
      
      for (const subscription of subscriptionsWithFailedPayments) {
        // If it's been more than 3 days since payment failure, suspend the gym
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        if (subscription.paymentDetails.nextPaymentDate < threeDaysAgo) {
          // Suspend gym access
          await Gym.findByIdAndUpdate(subscription.gymId._id, { 
            status: 'suspended',
            suspensionReason: 'Payment overdue'
          });
          
          await this.sendSuspensionNotification(subscription);
        } else {
          // Send payment reminder
          await this.sendPaymentFailedNotification(subscription);
        }
      }
      
      console.log(`Handled failed payments: ${subscriptionsWithFailedPayments.length}`);
    } catch (error) {
      console.error('Error handling failed payments:', error);
    }
  }
  
  // Send trial expiring notification
  static async sendTrialExpiringNotification(subscription, daysRemaining) {
    try {
      const emailContent = {
        to: subscription.gymId.email,
        subject: `Trial Period Ending ${daysRemaining === 1 ? 'Tomorrow' : `in ${daysRemaining} Days`} - Gym-Wale`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1976d2;">Trial Period Ending Soon</h2>
            <p>Dear ${subscription.gymId.name},</p>
            <p>Your free trial period will end ${daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`} on <strong>${subscription.trialPeriod.endDate.toDateString()}</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">Your Current Plan</h3>
              <p style="margin: 5px 0;"><strong>Plan:</strong> ${subscription.planDisplayName}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> ₹${subscription.pricing.amount}/${subscription.pricing.billingCycle}</p>
            </div>
            
            <p>To continue enjoying uninterrupted access to all Gym-Wale features, please complete your payment before the trial expires.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.GYM_DASHBOARD_URL}/billing" style="background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Payment</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br>The Gym-Wale Team</p>
          </div>
        `
      };
      
      await sendEmail(emailContent);
      
      // Create gym notification
      await GymNotification.create({
        gymId: subscription.gymId._id,
        title: `Trial ending ${daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`}`,
        message: `Your trial period will end on ${subscription.trialPeriod.endDate.toDateString()}. Complete your payment to continue using our services.`,
        type: 'billing',
        priority: daysRemaining <= 1 ? 'urgent' : 'high',
        actionRequired: true,
        actionUrl: '/billing'
      });
      
    } catch (error) {
      console.error('Error sending trial expiring notification:', error);
    }
  }
  
  // Send renewal reminder notification
  static async sendRenewalReminderNotification(subscription) {
    try {
      const daysRemaining = Math.ceil((subscription.activePeriod.endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      const emailContent = {
        to: subscription.gymId.email,
        subject: `Subscription Renewal Reminder - Gym-Wale`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1976d2;">Subscription Renewal Reminder</h2>
            <p>Dear ${subscription.gymId.name},</p>
            <p>Your subscription will expire in <strong>${daysRemaining} days</strong> on <strong>${subscription.activePeriod.endDate.toDateString()}</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">Current Subscription</h3>
              <p style="margin: 5px 0;"><strong>Plan:</strong> ${subscription.planDisplayName}</p>
              <p style="margin: 5px 0;"><strong>Renewal Amount:</strong> ₹${subscription.pricing.amount}</p>
              <p style="margin: 5px 0;"><strong>Auto-Renewal:</strong> ${subscription.autoRenewal ? 'Enabled' : 'Disabled'}</p>
            </div>
            
            ${subscription.autoRenewal ? 
              '<p>Your subscription will automatically renew. Please ensure your payment method is up to date.</p>' :
              '<p>Please renew your subscription to continue using our services without interruption.</p>'
            }
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.GYM_DASHBOARD_URL}/billing" style="background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Billing</a>
            </div>
            
            <p>Best regards,<br>The Gym-Wale Team</p>
          </div>
        `
      };
      
      await sendEmail(emailContent);
      
      // Create gym notification
      await GymNotification.create({
        gymId: subscription.gymId._id,
        title: `Subscription expiring in ${daysRemaining} days`,
        message: `Your subscription will expire on ${subscription.activePeriod.endDate.toDateString()}. ${subscription.autoRenewal ? 'Auto-renewal is enabled.' : 'Please renew to continue service.'}`,
        type: 'billing',
        priority: 'medium',
        actionRequired: !subscription.autoRenewal,
        actionUrl: '/billing'
      });
      
    } catch (error) {
      console.error('Error sending renewal reminder:', error);
    }
  }
  
  // Send payment failed notification
  static async sendPaymentFailedNotification(subscription) {
    try {
      const emailContent = {
        to: subscription.gymId.email,
        subject: 'Payment Failed - Action Required - Gym-Wale',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Payment Failed</h2>
            <p>Dear ${subscription.gymId.name},</p>
            <p>We were unable to process your payment for the ${subscription.planDisplayName} plan.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #856404;">Action Required</h3>
              <p style="margin: 5px 0;"><strong>Amount Due:</strong> ₹${subscription.pricing.amount}</p>
              <p style="margin: 5px 0;">Please update your payment method and retry the payment to avoid service interruption.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.GYM_DASHBOARD_URL}/billing" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
            
            <p><strong>Note:</strong> If payment is not completed within 3 days, your access may be temporarily suspended.</p>
            
            <p>If you need assistance, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The Gym-Wale Team</p>
          </div>
        `
      };
      
      await sendEmail(emailContent);
      
      // Create gym notification
      await GymNotification.create({
        gymId: subscription.gymId._id,
        title: 'Payment Failed - Action Required',
        message: `Payment for your ${subscription.planDisplayName} plan failed. Please update your payment method to avoid service interruption.`,
        type: 'billing',
        priority: 'urgent',
        actionRequired: true,
        actionUrl: '/billing'
      });
      
      // Mark notification as sent
      subscription.notifications.paymentFailed.sent = true;
      subscription.notifications.paymentFailed.sentDate = new Date();
      await subscription.save();
      
    } catch (error) {
      console.error('Error sending payment failed notification:', error);
    }
  }
  
  // Send suspension notification
  static async sendSuspensionNotification(subscription) {
    try {
      const emailContent = {
        to: subscription.gymId.email,
        subject: 'Account Suspended - Immediate Action Required - Gym-Wale',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Account Suspended</h2>
            <p>Dear ${subscription.gymId.name},</p>
            <p>Your account has been temporarily suspended due to overdue payment.</p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #721c24;">Immediate Action Required</h3>
              <p style="margin: 5px 0;"><strong>Amount Due:</strong> ₹${subscription.pricing.amount}</p>
              <p style="margin: 5px 0;">Your dashboard access has been temporarily disabled. Complete the payment to restore full access.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.GYM_DASHBOARD_URL}/billing" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now to Restore Access</a>
            </div>
            
            <p>Contact our support team immediately if you believe this is an error or if you need payment assistance.</p>
            
            <p>Best regards,<br>The Gym-Wale Team</p>
          </div>
        `
      };
      
      await sendEmail(emailContent);
      
      // Create gym notification
      await GymNotification.create({
        gymId: subscription.gymId._id,
        title: 'Account Suspended - Payment Overdue',
        message: 'Your account has been suspended due to overdue payment. Complete the payment to restore access.',
        type: 'billing',
        priority: 'urgent',
        actionRequired: true,
        actionUrl: '/billing'
      });
      
    } catch (error) {
      console.error('Error sending suspension notification:', error);
    }
  }
  
  // Update subscription usage statistics
  static async updateUsageStats(gymId, usageType, increment = 1) {
    try {
      const subscription = await Subscription.findOne({ gymId });
      if (!subscription) return;
      
      if (!subscription.usage[usageType]) {
        subscription.usage[usageType] = 0;
      }
      
      subscription.usage[usageType] += increment;
      await subscription.save();
    } catch (error) {
      console.error('Error updating usage stats:', error);
    }
  }
  
  // Generate subscription report
  static async generateSubscriptionReport(startDate, endDate) {
    try {
      const subscriptions = await Subscription.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('gymId', 'name city state');
      
      const report = {
        totalSubscriptions: subscriptions.length,
        planBreakdown: {},
        statusBreakdown: {},
        revenueBreakdown: {},
        locationBreakdown: {},
        totalRevenue: 0
      };
      
      subscriptions.forEach(sub => {
        // Plan breakdown
        report.planBreakdown[sub.plan] = (report.planBreakdown[sub.plan] || 0) + 1;
        
        // Status breakdown
        report.statusBreakdown[sub.status] = (report.statusBreakdown[sub.status] || 0) + 1;
        
        // Location breakdown
        const location = `${sub.gymId.city}, ${sub.gymId.state}`;
        report.locationBreakdown[location] = (report.locationBreakdown[location] || 0) + 1;
        
        // Revenue calculation
        const successfulPayments = sub.billingHistory.filter(payment => 
          payment.status === 'success' && 
          payment.date >= startDate && 
          payment.date <= endDate
        );
        
        const subRevenue = successfulPayments.reduce((total, payment) => total + payment.amount, 0);
        report.totalRevenue += subRevenue;
        report.revenueBreakdown[sub.plan] = (report.revenueBreakdown[sub.plan] || 0) + subRevenue;
      });
      
      return report;
    } catch (error) {
      console.error('Error generating subscription report:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;
