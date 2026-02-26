// services/gymNotificationService.js
// ---------------------------------------------------------------------------
// Gym Notification Service
// Creates DB records AND sends FCM push to gym admin app and user app
// ---------------------------------------------------------------------------

const GymNotification = require('../models/GymNotification');
const Notification = require('../models/Notification');
const Gym = require('../models/gym');
const User = require('../models/User');
const fcmService = require('./fcmService');

class GymNotificationService {
  // ---------------------------------------------------------------------------
  // FCM Token helpers
  // ---------------------------------------------------------------------------

  /**
   * Get all active FCM tokens for a gym admin
   * @param {string|ObjectId} gymId
   * @returns {string[]}
   */
  async getGymAdminFCMTokens(gymId) {
    try {
      const gym = await Gym.findById(gymId).select('fcmTokens').lean();
      if (!gym || !gym.fcmTokens) return [];
      return gym.fcmTokens.map(t => t.token).filter(Boolean);
    } catch (err) {
      console.error('[GymNotifSvc] Error fetching gym FCM tokens:', err.message);
      return [];
    }
  }

  /**
   * Get FCM tokens for an array of user IDs
   * @param {string[]|ObjectId[]} userIds
   * @returns {string[]}
   */
  async getUserFCMTokens(userIds) {
    try {
      if (!userIds || userIds.length === 0) return [];
      const users = await User.find({
        _id: { $in: userIds },
        'fcmToken.token': { $ne: null, $exists: true },
      }).select('fcmToken').lean();

      return users.map(u => u.fcmToken?.token).filter(Boolean);
    } catch (err) {
      console.error('[GymNotifSvc] Error fetching user FCM tokens:', err.message);
      return [];
    }
  }

  /**
   * Remove a stale/invalid FCM token from the gym document
   */
  async removeStaleGymToken(gymId, invalidTokens = []) {
    if (!invalidTokens.length) return;
    try {
      await Gym.updateOne(
        { _id: gymId },
        { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }
      );
      console.log(`[GymNotifSvc] Removed ${invalidTokens.length} stale token(s) from gym ${gymId}`);
    } catch (err) {
      console.error('[GymNotifSvc] Error removing stale tokens:', err.message);
    }
  }

  /**
   * Remove stale FCM tokens from user documents
   */
  async removeStaleUserTokens(invalidTokens = []) {
    if (!invalidTokens.length) return;
    try {
      await User.updateMany(
        { 'fcmToken.token': { $in: invalidTokens } },
        { $set: { 'fcmToken.token': null } }
      );
      console.log(`[GymNotifSvc] Cleaned ${invalidTokens.length} stale user tokens`);
    } catch (err) {
      console.error('[GymNotifSvc] Error removing stale user tokens:', err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Gym Admin Notifications (GymNotification model → gym admin FCM)
  // ---------------------------------------------------------------------------

  /**
   * Create a GymNotification record and send FCM push to the gym admin app
   */
  async notifyGymAdmin({
    gymId,
    title,
    message,
    type = 'general',
    priority = 'medium',
    metadata = {},
    actions = [],
  }) {
    // 1. Save to DB
    let dbNotification = null;
    try {
      dbNotification = await GymNotification.create({
        gymId,
        title,
        message,
        type,
        priority,
        metadata,
        actions,
      });
      console.log(`✅ [GymNotifSvc] GymNotification saved: ${dbNotification._id}`);
    } catch (err) {
      console.error('[GymNotifSvc] Error saving GymNotification:', err.message);
    }

    // 2. Send FCM push
    const tokens = await this.getGymAdminFCMTokens(gymId);
    let fcmResult = null;

    if (tokens.length > 0) {
      fcmResult = await fcmService.notifyGymAdmin(tokens, title, message, {
        type,
        priority,
        notificationId: dbNotification?._id?.toString(),
        gymId: gymId.toString(),
        channel: this._priorityToChannel(priority),
        ...metadata,
      });

      // Clean up invalid tokens
      if (fcmResult?.invalidTokens?.length) {
        await this.removeStaleGymToken(gymId, fcmResult.invalidTokens);
      }
    } else {
      console.log(`[GymNotifSvc] No FCM tokens for gym ${gymId} – push skipped`);
    }

    return { dbNotification, fcmResult };
  }

  // ---------------------------------------------------------------------------
  // User App Notifications (Notification model → user FCM)
  // ---------------------------------------------------------------------------

  /**
   * Send a notification to a list of user IDs (DB + FCM)
   */
  async notifyUsers({
    userIds,
    title,
    message,
    type = 'general',
    priority = 'normal',
    gymId = null,
    metadata = {},
  }) {
    if (!userIds || userIds.length === 0) {
      console.warn('[GymNotifSvc] notifyUsers called with empty userIds');
      return { dbCount: 0, fcmResult: null };
    }

    // 1. Save to DB for each user
    let dbCount = 0;
    try {
      const docs = userIds.map(uid => ({
        title,
        message,
        type,
        priority,
        userId: uid,
        user: uid,
        read: false,
        isRead: false,
        timestamp: new Date(),
        createdAt: new Date(),
        metadata: {
          source: 'gym-admin',
          gymId: gymId?.toString(),
          ...metadata,
        },
      }));
      const result = await Notification.insertMany(docs, { ordered: false });
      dbCount = result.length;
      console.log(`✅ [GymNotifSvc] ${dbCount} user notifications saved to DB`);
    } catch (err) {
      if (err.writeErrors) {
        dbCount = userIds.length - err.writeErrors.length;
        console.warn(`[GymNotifSvc] Partial DB insert: ${dbCount}/${userIds.length} saved`);
      } else {
        console.error('[GymNotifSvc] Error saving user notifications:', err.message);
      }
    }

    // 2. Send FCM push
    const tokens = await this.getUserFCMTokens(userIds);
    let fcmResult = null;

    if (tokens.length > 0) {
      fcmResult = await fcmService.notifyUser(tokens, title, message, {
        type,
        priority,
        gymId: gymId?.toString(),
        ...metadata,
      });

      // Clean up invalid tokens
      if (fcmResult?.invalidTokens?.length) {
        await this.removeStaleUserTokens(fcmResult.invalidTokens);
      }
    } else {
      console.log('[GymNotifSvc] No user FCM tokens found – push skipped');
    }

    return { dbCount, fcmResult };
  }

  /**
   * Send a notification to a single user (DB + FCM)
   */
  async notifyUser({ userId, title, message, type = 'general', priority = 'normal', gymId = null, metadata = {} }) {
    return this.notifyUsers({ userIds: [userId], title, message, type, priority, gymId, metadata });
  }

  // ---------------------------------------------------------------------------
  // Domain-specific helpers
  // ---------------------------------------------------------------------------

  /** Notify gym admin of a brand-new member registration */
  async onNewMemberRegistered({ gymId, memberName, email, phone }) {
    return this.notifyGymAdmin({
      gymId,
      title: '🆕 New Member Registered',
      message: `${memberName} has joined your gym.`,
      type: 'general',
      priority: 'high',
      metadata: { memberName, email, phone, action: 'new-member' },
    });
  }

  /** Notify gym admin of a member check-in via geofence/QR */
  async onMemberCheckIn({ gymId, memberName, checkInTime }) {
    return this.notifyGymAdmin({
      gymId,
      title: '🏋️ Member Check-in',
      message: `${memberName} checked in at ${checkInTime || new Date().toLocaleTimeString()}`,
      type: 'general',
      priority: 'medium',
      metadata: { memberName, checkInTime, action: 'check-in' },
    });
  }

  /** Notify gym admin of a payment */
  async onPaymentReceived({ gymId, memberName, amount, planName }) {
    return this.notifyGymAdmin({
      gymId,
      title: '💰 Payment Received',
      message: `${memberName} paid ₹${amount} for ${planName}`,
      type: 'payment-reminder',
      priority: 'high',
      metadata: { memberName, amount, planName, action: 'payment' },
    });
  }

  /** Notify gym admin of a membership expiry */
  async onMembershipExpiring({ gymId, memberName, daysLeft }) {
    return this.notifyGymAdmin({
      gymId,
      title: '⚠️ Membership Expiring',
      message: `${memberName}'s membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      type: 'membership-expiry',
      priority: daysLeft <= 1 ? 'urgent' : 'medium',
      metadata: { memberName, daysLeft, action: 'expiry-warning' },
    });
  }

  /** Notify gym admin of a support/grievance reply from super admin */
  async onSupportReply({ gymId, ticketId, ticketSubject, replyMessage, ticketStatus }) {
    return this.notifyGymAdmin({
      gymId,
      title: '💬 Support Reply Received',
      message: replyMessage,
      type: 'grievance-reply',
      priority: 'high',
      metadata: { ticketId, ticketSubject, ticketStatus, source: 'admin-reply' },
      actions: [{ type: 'view-ticket', label: 'View Ticket', data: { ticketId } }],
    });
  }

  /** Notify a user about membership renewal */
  async onMembershipRenewalReminder({ userId, gymId, daysLeft, gymName }) {
    return this.notifyUser({
      userId,
      title: '🔔 Membership Renewal Reminder',
      message: `Your ${gymName || 'gym'} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now!`,
      type: 'general',
      priority: daysLeft <= 3 ? 'high' : 'normal',
      gymId,
      metadata: { daysLeft, gymName, action: 'renewal-reminder' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _priorityToChannel(priority) {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'high_priority_channel';
      case 'medium':
        return 'default_channel';
      default:
        return 'default_channel';
    }
  }
}

module.exports = new GymNotificationService();
