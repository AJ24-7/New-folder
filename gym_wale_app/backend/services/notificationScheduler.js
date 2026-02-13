// Scheduled notification service for automatic membership expiry checks
const cron = require('node-cron');
const Member = require('../models/Member');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Gym = require('../models/gym');
const TrialBooking = require('../models/TrialBooking');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
    this.init();
  }

  init() {
    console.log('🔔 Notification Scheduler initialized');
    
    // Check for expiring memberships every day at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.checkMembershipExpiry();
      this.sendUserMembershipExpiryNotifications();
    });

    // Check for expiring memberships every 6 hours for urgent notifications
    cron.schedule('0 */6 * * *', () => {
      this.checkUrgentMembershipExpiry();
    });

    // Check for new offers and send notifications (run every day at 10 AM)
    cron.schedule('0 10 * * *', () => {
      this.checkNewOffers();
    });

    // Trial booking reminders (run every day at 6 PM)
    cron.schedule('0 18 * * *', () => {
      this.sendTrialBookingReminders();
    });

    // Nearby gym offers (run every Monday and Thursday at 10 AM)
    cron.schedule('0 10 * * 1,4', () => {
      this.sendNearbyGymOffers();
    });

    // Payment reminders (run every day at 11 AM)
    cron.schedule('0 11 * * *', () => {
      this.sendPaymentReminders();
    });

    // Run initial check after 5 minutes of server start
    setTimeout(() => {
      this.checkMembershipExpiry();
      this.sendUserMembershipExpiryNotifications();
    }, 5 * 60 * 1000);
  }

  async checkMembershipExpiry() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      console.log('🔍 Checking for expiring memberships...');

      // Check for memberships expiring in 3 days
      await this.createExpiryNotifications(3);
      
      // Check for memberships expiring in 1 day
      await this.createExpiryNotifications(1);

      // Check for expired payment allowances
      await this.checkExpiredPaymentAllowances();

      console.log('✅ Membership expiry check completed');
    } catch (error) {
      console.error('❌ Error checking membership expiry:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async checkUrgentMembershipExpiry() {
    try {
      console.log('🚨 Checking for urgent membership expiry...');
      
      // Only check for memberships expiring in 1 day for urgent notifications
      await this.createExpiryNotifications(1, true);
      
    } catch (error) {
      console.error('❌ Error checking urgent membership expiry:', error);
    }
  }

  async createExpiryNotifications(days, urgentOnly = false) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(23, 59, 59, 999); // End of the target day

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + days);
      startDate.setHours(0, 0, 0, 0); // Start of the target day

      // Find members with memberships expiring on the target day
      const expiringMembers = await Member.find({
        membershipValidUntil: {
          $gte: startDate,
          $lte: targetDate
        }
      }).populate('gym', 'name _id');

      if (expiringMembers.length === 0) {
        console.log(`ℹ️ No memberships expiring in ${days} day(s)`);
        return;
      }

      // Group members by gym
      const membersByGym = {};
      expiringMembers.forEach(member => {
        const gymId = member.gym._id.toString();
        if (!membersByGym[gymId]) {
          membersByGym[gymId] = {
            gym: member.gym,
            members: []
          };
        }
        membersByGym[gymId].members.push(member);
      });

      // Create notifications for each gym
      for (const gymId in membersByGym) {
        const { gym, members } = membersByGym[gymId];
        
        // Check if we already sent a notification for this gym and day combination today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await Notification.findOne({
          user: gymId,
          type: 'membership-expiry',
          timestamp: { $gte: today },
          'metadata.expiryDays': days
        });

        if (existingNotification && !urgentOnly) {
          console.log(`ℹ️ Notification already sent for gym ${gym.name} for ${days} day(s) expiry`);
          continue;
        }

        const priority = days === 1 ? 'high' : 'medium';
        const color = days === 1 ? '#ff6b35' : '#ffa726';
        
        const notification = new Notification({
          title: `Membership${members.length > 1 ? 's' : ''} Expiring ${days === 1 ? 'Tomorrow' : `in ${days} Days`}`,
          message: `${members.length} member${members.length > 1 ? 's have' : ' has'} membership${members.length > 1 ? 's' : ''} expiring ${days === 1 ? 'tomorrow' : `in ${days} days`}`,
          type: 'membership-expiry',
          priority: priority,
          icon: 'fa-exclamation-triangle',
          color: color,
          user: gymId,
          metadata: {
            expiryDays: days,
            memberCount: members.length,
            memberIds: members.map(m => m._id),
            members: members.map(m => ({
              id: m._id,
              name: m.memberName,
              email: m.email,
              phone: m.phone,
              membershipId: m.membershipId,
              membershipValidUntil: m.membershipValidUntil
            }))
          }
        });

        await notification.save();
        
        console.log(`✅ Created expiry notification for gym ${gym.name}: ${members.length} member(s) expiring in ${days} day(s)`);
      }

    } catch (error) {
      console.error(`❌ Error creating expiry notifications for ${days} day(s):`, error);
    }
  }

  async checkExpiredPaymentAllowances() {
    try {
      console.log('🔍 Checking for expired payment allowances...');
      const today = new Date();
      
      // Find members with expired payment allowances (allowanceExpiryDate < today)
      const expiredAllowanceMembers = await Member.find({
        paymentStatus: 'pending',
        allowanceExpiryDate: { $lt: today }
      }).populate('gym');

      let updatedCount = 0;
      
      for (const member of expiredAllowanceMembers) {
        // Update payment status to overdue
        member.paymentStatus = 'overdue';
        await member.save();
        
        console.log(`⚠️ Updated member ${member.memberName} (${member.membershipId}) to overdue status`);
        
        // Create notification for gym admin
        if (member.gym) {
          const notification = new Notification({
            gymId: member.gym._id,
            title: 'Payment Allowance Expired',
            message: `Payment allowance has expired for ${member.memberName} (${member.membershipId}). Member status changed to overdue.`,
            type: 'payment',
            priority: 'high',
            relatedData: {
              memberId: member._id,
              memberName: member.memberName,
              membershipId: member.membershipId,
              pendingAmount: member.pendingPaymentAmount,
              allowanceExpiredDate: today
            }
          });
          
          await notification.save();
        }
        
        updatedCount++;
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} member(s) from pending to overdue status`);
      } else {
        console.log('✅ No expired payment allowances found');
      }
      
    } catch (error) {
      console.error('❌ Error checking expired payment allowances:', error);
    }
  }

  async checkNewOffers() {
    try {
      console.log('🎁 Checking for new offers...');
      const Offer = require('../models/Offer');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find offers created in the last 24 hours
      const newOffers = await Offer.find({
        createdAt: { $gte: yesterday },
        status: 'active',
        offerNotificationSent: { $ne: true }
      }).populate('gymId', 'gymName');
      
      if (newOffers.length === 0) {
        console.log('No new offers to notify');
        return;
      }
      
      // Get all users who have offers notifications enabled
      const users = await User.find({
        'preferences.notifications.email.offers': true
      });
      
      for (const offer of newOffers) {
        for (const user of users) {
          await Notification.create({
            userId: user._id,
            type: 'offer',
            title: 'New Offer Available!',
            message: `${offer.title} - ${offer.description}. ${offer.discount}% off!`,
            priority: 'low',
            icon: 'fa-gift',
            color: '#4caf50',
            metadata: {
              offerId: offer._id,
              gymId: offer.gymId?._id,
              gymName: offer.gymId?.gymName,
              discount: offer.discount,
              validUntil: offer.validUntil
            }
          });
        }
        
        offer.offerNotificationSent = true;
        await offer.save();
      }
      
      const totalNotifications = newOffers.length * users.length;
      console.log(`✅ Sent ${totalNotifications} offer notifications for ${newOffers.length} new offers`);
      
    } catch (error) {
      console.error('❌ Error in offer notification:', error);
    }
  }

  // Send user-side membership expiry notifications
  async sendUserMembershipExpiryNotifications() {
    try {
      console.log('🔔 Sending user membership expiry notifications...');
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      // Find memberships expiring within 7 days
      const expiringMemberships = await Member.find({
        validUntil: {
          $gte: today,
          $lte: sevenDays,
        },
        paymentStatus: 'paid',
      }).populate('gym', 'gymName logoUrl');

      let notificationsSent = 0;

      for (const membership of expiringMemberships) {
        const user = await User.findOne({ email: membership.email });
        if (!user) continue;

        const daysRemaining = Math.ceil((membership.validUntil - now) / (1000 * 60 * 60 * 24));
        const gymName = membership.gym?.gymName || 'Your gym';

        let title, message, sendNotification = false;

        if (daysRemaining <= 0) {
          title = '⏰ Membership Expired!';
          message = `Your membership at ${gymName} has expired today. Renew now to continue enjoying premium facilities!`;
          sendNotification = true;
        } else if (daysRemaining === 3) {
          title = '⚠️ Only 3 Days Left!';
          message = `Your membership at ${gymName} expires in 3 days. Renew now to avoid any interruption in your fitness journey!`;
          sendNotification = true;
        } else if (daysRemaining === 7) {
          title = '📅 Membership Expiring Soon';
          message = `Your membership at ${gymName} expires in 7 days. Don't forget to renew and keep your fitness momentum going!`;
          sendNotification = true;
        }

        if (!sendNotification) continue;

        // Check if notification already sent today for this membership and type
        const existingNotification = await Notification.findOne({
          userId: user._id,
          type: 'membership_expiry',
          'data.membershipId': membership._id.toString(),
          'data.daysRemaining': daysRemaining,
          createdAt: { $gte: today, $lt: tomorrow },
        });

        if (!existingNotification) {
          await Notification.create({
            userId: user._id,
            title,
            message,
            type: 'membership_expiry',
            imageUrl: membership.gym?.logoUrl,
            data: {
              membershipId: membership._id.toString(),
              gymId: membership.gym?._id?.toString(),
              expiryDate: membership.validUntil,
              daysRemaining,
            },
            actionType: 'navigate',
            actionData: '/settings',
          });
          notificationsSent++;
        }
      }

      console.log(`✅ Sent ${notificationsSent} user membership expiry notifications`);
    } catch (error) {
      console.error('❌ Error sending user membership expiry notifications:', error);
    }
  }

  // Send trial booking reminders (1 day before)
  async sendTrialBookingReminders() {
    try {
      console.log('🔔 Sending trial booking reminders...');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

      // Find trial bookings for tomorrow
      const upcomingTrials = await TrialBooking.find({
        trialDate: {
          $gte: tomorrowStart,
          $lt: tomorrowEnd,
        },
        status: 'confirmed',
      }).populate('gym', 'gymName logoUrl address');

      let remindersSent = 0;

      for (const trial of upcomingTrials) {
        const user = await User.findOne({ email: trial.email });
        if (!user) continue;

        const gymName = trial.gym?.gymName || 'the gym';
        const trialTime = trial.trialTime || 'your scheduled time';
        const address = trial.gym?.address || '';

        // Check if reminder already sent
        const existingNotification = await Notification.findOne({
          userId: user._id,
          type: 'reminder',
          'data.trialBookingId': trial._id.toString(),
          'data.reminderType': 'trial',
        });

        if (!existingNotification) {
          await Notification.create({
            userId: user._id,
            title: '⏰ Trial Session Tomorrow!',
            message: `Reminder: Your trial session at ${gymName} is tomorrow at ${trialTime}. ${address ? `Location: ${address}.` : ''} We can't wait to see you!`,
            type: 'reminder',
            imageUrl: trial.gym?.logoUrl,
            data: {
              trialBookingId: trial._id.toString(),
              gymId: trial.gym?._id?.toString(),
              trialDate: trial.trialDate,
              trialTime: trial.trialTime,
              reminderType: 'trial',
            },
            actionType: 'navigate',
            actionData: '/settings',
          });
          remindersSent++;
        }
      }

      console.log(`✅ Sent ${remindersSent} trial booking reminders`);
    } catch (error) {
      console.error('❌ Error sending trial booking reminders:', error);
    }
  }

  // Send nearby gym offers based on user location
  async sendNearbyGymOffers() {
    try {
      console.log('🔔 Sending nearby gym offers...');
      const users = await User.find({
        location: { $exists: true, $ne: null },
      });

      let offersSent = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const user of users) {
        // Check if user already got nearby offers notification in last 3 days
        const recentNotification = await Notification.findOne({
          userId: user._id,
          type: 'offer',
          'data.offerType': 'nearby_gyms',
          createdAt: { $gte: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) },
        });

        if (recentNotification) continue;

        // Find nearby gyms (within 10km)
        const nearbyGyms = await Gym.find({
          location: {
            $near: {
              $geometry: user.location,
              $maxDistance: 10000, // 10km in meters
            },
          },
          isActive: true,
        }).limit(5);

        if (nearbyGyms.length === 0) continue;

        // 30% chance to send to avoid spam
        if (Math.random() < 0.3) {
          const gymNames = nearbyGyms.map(g => g.gymName).slice(0, 3).join(', ');
          const moreCount = nearbyGyms.length > 3 ? ` and ${nearbyGyms.length - 3} more` : '';

          await Notification.create({
            userId: user._id,
            title: '🏋️ Gyms Near You!',
            message: `Discover ${gymNames}${moreCount} in your area. Special offers and trial sessions available now!`,
            type: 'offer',
            data: {
              offerType: 'nearby_gyms',
              gymIds: nearbyGyms.map(g => g._id.toString()),
            },
            actionType: 'navigate',
            actionData: '/gyms',
          });
          offersSent++;
        }
      }

      console.log(`✅ Sent ${offersSent} nearby gym offer notifications`);
    } catch (error) {
      console.error('❌ Error sending nearby gym offers:', error);
    }
  }

  // Send payment reminders for pending memberships
  async sendPaymentReminders() {
    try {
      console.log('🔔 Sending payment reminders...');
      const pendingMembers = await Member.find({
        paymentStatus: 'pending',
      }).populate('gym', 'gymName logoUrl');

      let remindersSent = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      for (const membership of pendingMembers) {
        const user = await User.findOne({ email: membership.email });
        if (!user) continue;

        // Check if reminder sent today
        const existingNotification = await Notification.findOne({
          userId: user._id,
          type: 'payment',
          'data.membershipId': membership._id.toString(),
          createdAt: { $gte: today, $lt: tomorrow },
        });

        if (!existingNotification) {
          const gymName = membership.gym?.gymName || 'Your gym';
          
          await Notification.create({
            userId: user._id,
            title: '💳 Payment Pending',
            message: `Complete your payment for ${gymName} membership to start your fitness journey immediately!`,
            type: 'payment',
            imageUrl: membership.gym?.logoUrl,
            data: {
              membershipId: membership._id.toString(),
              gymId: membership.gym?._id?.toString(),
              amount: membership.amount,
            },
            actionType: 'navigate',
            actionData: '/settings',
          });
          remindersSent++;
        }
      }

      console.log(`✅ Sent ${remindersSent} payment reminders`);
    } catch (error) {
      console.error('❌ Error sending payment reminders:', error);
    }
  }

  // Create trial booking success notification (called by trial booking controller)
  async sendTrialBookingSuccessNotification(trialBooking) {
    try {
      const user = await User.findOne({ email: trialBooking.email });
      if (!user) return;

      const gym = await Gym.findById(trialBooking.gym);
      if (!gym) return;

      const trialDate = new Date(trialBooking.trialDate);
      const formattedDate = `${trialDate.getDate()}/${trialDate.getMonth() + 1}/${trialDate.getFullYear()}`;

      await Notification.create({
        userId: user._id,
        title: '🎉 Trial Booking Confirmed!',
        message: `Your trial session at ${gym.gymName} has been successfully booked for ${formattedDate}. Get ready for an amazing fitness experience!`,
        type: 'trial_booking',
        imageUrl: gym.logoUrl,
        data: {
          trialBookingId: trialBooking._id.toString(),
          gymId: gym._id.toString(),
          trialDate: trialBooking.trialDate,
          trialTime: trialBooking.trialTime,
        },
        actionType: 'navigate',
        actionData: '/settings',
      });

      console.log(`✅ Sent trial booking success notification to ${user.email}`);
    } catch (error) {
      console.error('❌ Error sending trial booking success notification:', error);
    }
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔧 Manual expiry check triggered');
    await this.checkMembershipExpiry();
    await this.sendUserMembershipExpiryNotifications();
  }

  // Stop scheduler
  stop() {
    console.log('🛑 Notification Scheduler stopped');
    // Note: node-cron tasks can't be easily stopped once started
    // In a production environment, you might want to track task references
  }
}

module.exports = NotificationScheduler;
