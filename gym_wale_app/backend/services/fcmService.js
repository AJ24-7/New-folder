// services/fcmService.js
// ---------------------------------------------------------------------------
// Firebase Cloud Messaging Service
// Handles all push notification sending for both gym admin app and user app
// ---------------------------------------------------------------------------

const { getFirebaseMessaging } = require('../config/firebase');

class FCMService {
  constructor() {
    this._messaging = null;
    this._enabled = false;
    this._initAttempted = false;
  }

  /** Lazily initialize messaging */
  get messaging() {
    if (!this._initAttempted) {
      this._initAttempted = true;
      this._messaging = getFirebaseMessaging();
      this._enabled = !!this._messaging;
      if (this._enabled) {
        console.log('✅ [FCM] Service ready');
      } else {
        console.warn('⚠️  [FCM] Service disabled – no Firebase credentials found');
      }
    }
    return this._messaging;
  }

  get isEnabled() {
    // Trigger lazy init
    void this.messaging;
    return this._enabled;
  }

  // ---------------------------------------------------------------------------
  // Core send helpers
  // ---------------------------------------------------------------------------

  /**
   * Send a push notification to a single FCM token
   * @param {string} token - FCM device token
   * @param {object} notification - { title, body }
   * @param {object} data - key/value string map
   * @param {object} options - platform overrides
   */
  async sendToDevice(token, notification, data = {}, options = {}) {
    if (!this.isEnabled) {
      console.log(`📱 [FCM] (disabled) Would send "${notification?.title}" to token: ${token?.substring(0, 20)}...`);
      return { success: false, disabled: true };
    }

    if (!token || typeof token !== 'string') {
      console.warn('[FCM] sendToDevice: invalid token');
      return { success: false, error: 'Invalid token' };
    }

    try {
      const message = this._buildMessage({ token }, notification, data, options);
      const messageId = await this.messaging.send(message);
      console.log(`✅ [FCM] Sent to device: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      return this._handleSendError(error, token);
    }
  }

  /**
   * Send to multiple FCM tokens (batch)
   * @param {string[]} tokens - Array of FCM tokens
   * @param {object} notification - { title, body }
   * @param {object} data - key/value string map
   * @param {object} options - platform overrides
   * @returns {{ successCount, failureCount, results }}
   */
  async sendToMultipleDevices(tokens, notification, data = {}, options = {}) {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, results: [] };
    }

    if (!this.isEnabled) {
      console.log(`📱 [FCM] (disabled) Would send "${notification?.title}" to ${tokens.length} devices`);
      return { successCount: 0, failureCount: tokens.length, disabled: true, results: [] };
    }

    // Filter out invalid tokens
    const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0);
    if (validTokens.length === 0) {
      return { successCount: 0, failureCount: 0, results: [] };
    }

    // Firebase allows max 500 tokens per multicast
    const BATCH_SIZE = 500;
    const batches = [];
    for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
      batches.push(validTokens.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failureCount = 0;
    const results = [];
    const invalidTokens = [];

    for (const batch of batches) {
      try {
        const multicastMessage = this._buildMessage({ tokens: batch }, notification, data, options);
        const response = await this.messaging.sendEachForMulticast(multicastMessage);

        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp, idx) => {
          results.push({
            token: batch[idx].substring(0, 20) + '...',
            success: resp.success,
            messageId: resp.messageId,
            error: resp.error?.message,
          });

          // Collect invalid / unregistered tokens for cleanup
          if (!resp.success && resp.error) {
            const code = resp.error.code;
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(batch[idx]);
            }
          }
        });
      } catch (err) {
        console.error('[FCM] Batch send error:', err.message);
        failureCount += batch.length;
      }
    }

    console.log(`✅ [FCM] Multicast complete: ${successCount} ok / ${failureCount} failed of ${validTokens.length}`);
    return { successCount, failureCount, results, invalidTokens };
  }

  /**
   * Send to a Firebase topic
   * @param {string} topic - Topic name
   * @param {object} notification
   * @param {object} data
   */
  async sendToTopic(topic, notification, data = {}, options = {}) {
    if (!this.isEnabled) {
      console.log(`📱 [FCM] (disabled) Would send "${notification?.title}" to topic: ${topic}`);
      return { success: false, disabled: true };
    }

    try {
      const message = this._buildMessage({ topic }, notification, data, options);
      const messageId = await this.messaging.send(message);
      console.log(`✅ [FCM] Sent to topic "${topic}": ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      return this._handleSendError(error, `topic:${topic}`);
    }
  }

  // ---------------------------------------------------------------------------
  // High-level notification methods (typed for Gym-Wale domain)
  // ---------------------------------------------------------------------------

  /**
   * Notify gym admin app about a new member check-in
   */
  async notifyGymAdminCheckIn(adminFcmTokens, memberName, checkInTime) {
    const notification = {
      title: '🏋️ New Check-in',
      body: `${memberName} just checked in at ${checkInTime}`,
    };
    const data = {
      type: 'check-in',
      priority: 'normal',
      memberName,
      checkInTime,
      timestamp: new Date().toISOString(),
      channel: 'member_activity_channel',
    };
    return this.sendToMultipleDevices(adminFcmTokens, notification, data);
  }

  /**
   * Notify gym admin about a new payment received
   */
  async notifyGymAdminPayment(adminFcmTokens, memberName, amount, planName) {
    const notification = {
      title: '💰 Payment Received',
      body: `${memberName} paid ₹${amount} for ${planName}`,
    };
    const data = {
      type: 'payment',
      priority: 'normal',
      memberName,
      amount: String(amount),
      planName,
      timestamp: new Date().toISOString(),
      channel: 'member_activity_channel',
    };
    return this.sendToMultipleDevices(adminFcmTokens, notification, data);
  }

  /**
   * Notify gym admin about membership expiry coming up
   */
  async notifyGymAdminMemberExpiry(adminFcmTokens, memberName, daysLeft) {
    const notification = {
      title: '⚠️ Membership Expiring',
      body: `${memberName}'s membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    };
    const data = {
      type: 'member-expiry',
      priority: daysLeft <= 1 ? 'high' : 'normal',
      memberName,
      daysLeft: String(daysLeft),
      timestamp: new Date().toISOString(),
      channel: 'member_activity_channel',
    };
    return this.sendToMultipleDevices(adminFcmTokens, notification, data);
  }

  /**
   * Send a generic notification to gym admin app
   */
  async notifyGymAdmin(adminFcmTokens, title, body, extraData = {}) {
    const notification = { title, body };
    const data = {
      type: extraData.type || 'general',
      priority: extraData.priority || 'normal',
      timestamp: new Date().toISOString(),
      channel: extraData.channel || 'default_channel',
      ...this._stringifyValues(extraData),
    };
    return this.sendToMultipleDevices(adminFcmTokens, notification, data);
  }

  /**
   * Send push notification to user app members
   * @param {string[]} userFcmTokens
   * @param {string} title
   * @param {string} body
   * @param {object} extraData
   */
  async notifyUser(userFcmTokens, title, body, extraData = {}) {
    const notification = { title, body };
    const data = {
      type: extraData.type || 'general',
      priority: extraData.priority || 'normal',
      gymId: String(extraData.gymId || ''),
      timestamp: new Date().toISOString(),
      ...this._stringifyValues(extraData),
    };

    const options = {
      android: {
        channelId: this._mapTypeToChannel(extraData.type),
        priority: 'high',
      },
      apns: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    };

    return this.sendToMultipleDevices(userFcmTokens, notification, data, options);
  }

  /**
   * Notify a single user about a direct message from gym
   */
  async notifyUserDirect(userFcmToken, title, body, extraData = {}) {
    return this.notifyUser([userFcmToken], title, body, extraData);
  }

  // ---------------------------------------------------------------------------
  // Token management helpers
  // ---------------------------------------------------------------------------

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens, topic) {
    if (!this.isEnabled) return { success: false, disabled: true };
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      console.log(`✅ [FCM] Subscribed ${response.successCount} tokens to topic "${topic}"`);
      return response;
    } catch (err) {
      console.error(`❌ [FCM] subscribeToTopic error:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens, topic) {
    if (!this.isEnabled) return { success: false, disabled: true };
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      console.log(`✅ [FCM] Unsubscribed ${response.successCount} tokens from topic "${topic}"`);
      return response;
    } catch (err) {
      console.error(`❌ [FCM] unsubscribeFromTopic error:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _buildMessage(target, notification, data = {}, options = {}) {
    const stringData = this._stringifyValues(data);

    const message = {
      ...target,
      notification: {
        title: notification?.title || 'Gym-Wale',
        body: notification?.body || '',
      },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId: stringData.channel || 'default_channel',
          sound: 'default',
          priority: 'high',
          defaultVibrateTimings: true,
          ...(options.android?.notification || {}),
        },
        ...(options.android || {}),
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            ...(options.apns?.aps || {}),
          },
        },
        ...(options.apns || {}),
      },
    };

    return message;
  }

  /** Convert all data values to strings (FCM requirement) */
  _stringifyValues(obj) {
    const result = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (v !== null && v !== undefined) {
        result[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    }
    return result;
  }

  _mapTypeToChannel(type) {
    switch (type) {
      case 'check-in':
      case 'payment':
      case 'renewal':
      case 'member-activity':
        return 'member_activity_channel';
      case 'alert':
      case 'warning':
      case 'system':
        return 'system_alerts_channel';
      default:
        return 'default_channel';
    }
  }

  _handleSendError(error, target) {
    const code = error.code || '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      console.warn(`[FCM] Token no longer valid: ${target}`);
      return { success: false, invalidToken: true, error: error.message };
    }
    console.error(`❌ [FCM] Send error to ${target}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = new FCMService();
