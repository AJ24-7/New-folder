// backend/services/adminNotificationService.js
const Notification = require('../models/Notification');

class AdminNotificationService {
  constructor() {
    this.defaultAdminId = '507f1f77bcf86cd799439011'; // Default admin ID
  }

  async createNotification(title, message, type, icon = 'fa-bell', color = '#2563eb', metadata = {}, priority = 'normal') {
    try {
      const notification = new Notification({
        title,
        message,
        type,
        icon,
        color,
        user: this.defaultAdminId,
        metadata,
        priority
      });
      
      await notification.save();
      console.log(`✅ Admin notification created: ${title}`);
      return notification;
    } catch (error) {
      console.error('❌ Error creating admin notification:', error);
      throw error;
    }
  }

  // Specific notification methods for different events
  async notifyGymRegistration(gymData) {
    return this.createNotification(
      'New Gym Registration',
      `${gymData.gymName} from ${gymData.location?.city || 'Unknown City'} has registered and is pending approval.`,
      'gym-registration',
      'fa-dumbbell',
      '#f59e0b',
      {
        gymId: gymData._id,
        gymName: gymData.gymName,
        location: `${gymData.location?.city || ''}, ${gymData.location?.state || ''}`,
        contactPerson: gymData.contactPerson,
        email: gymData.email,
        action: 'registration'
      },
      'high'
    );
  }

  async notifyGymApproval(gymData) {
    return this.createNotification(
      'Gym Approved',
      `${gymData.gymName} has been successfully approved and is now active.`,
      'gym-registration',
      'fa-check-circle',
      '#10b981',
      {
        gymId: gymData._id,
        gymName: gymData.gymName,
        action: 'approved'
      },
      'normal'
    );
  }

  async notifyGymRejection(gymData, reason) {
    return this.createNotification(
      'Gym Rejected',
      `${gymData.gymName} has been rejected. Reason: ${reason}`,
      'gym-registration',
      'fa-times-circle',
      '#ef4444',
      {
        gymId: gymData._id,
        gymName: gymData.gymName,
        action: 'rejected',
        reason
      },
      'normal'
    );
  }

  async notifyTrainerRegistration(trainerData) {
    const trainerName = this.getTrainerDisplayName(trainerData);
    return this.createNotification(
      'New Trainer Registration',
      `${trainerName} has registered as a trainer and is pending approval.`,
      'trainer-approval',
      'fa-user-plus',
      '#f59e0b',
      {
        trainerId: trainerData._id,
        trainerName: trainerName,
        email: trainerData.email,
        action: 'registration'
      },
      'high'
    );
  }

  async notifyTrainerApproval(trainerData) {
    const trainerName = this.getTrainerDisplayName(trainerData);
    return this.createNotification(
      'Trainer Approved',
      `${trainerName} has been approved as a trainer and is now active.`,
      'trainer-approval',
      'fa-user-check',
      '#10b981',
      {
        trainerId: trainerData._id,
        trainerName: trainerName,
        email: trainerData.email,
        action: 'approved'
      },
      'normal'
    );
  }

  async notifyTrainerRejection(trainerData, reason) {
    const trainerName = this.getTrainerDisplayName(trainerData);
    return this.createNotification(
      'Trainer Rejected',
      `${trainerName}'s trainer application has been rejected. Reason: ${reason}`,
      'trainer-approval',
      'fa-user-times',
      '#ef4444',
      {
        trainerId: trainerData._id,
        trainerName: trainerName,
        action: 'rejected',
        reason
      },
      'normal'
    );
  }

  async notifyTrialBooking(bookingData) {
    return this.createNotification(
      'New Trial Booking',
      `${bookingData.name} has booked a trial session at ${bookingData.gymName} for ${new Date(bookingData.trialDate).toLocaleDateString()}.`,
      'trial-booking',
      'fa-calendar-check',
      '#3b82f6',
      {
        bookingId: bookingData._id,
        clientName: bookingData.name,
        clientEmail: bookingData.email,
        gymName: bookingData.gymName,
        gymId: bookingData.gymId,
        trialDate: bookingData.trialDate,
        action: 'booking'
      },
      'normal'
    );
  }

  async notifyTrialApproval(bookingData) {
    return this.createNotification(
      'Trial Booking Approved',
      `${bookingData.name}'s trial session at ${bookingData.gymName} has been approved.`,
      'trial-booking',
      'fa-calendar-check',
      '#10b981',
      {
        bookingId: bookingData._id,
        clientName: bookingData.name,
        gymName: bookingData.gymName,
        action: 'approved'
      },
      'normal'
    );
  }

  async notifyPayment(paymentData) {
    return this.createNotification(
      'Payment Received',
      `Payment of ₹${paymentData.amount} received from ${paymentData.userEmail} for ${paymentData.description}.`,
      'payment',
      'fa-credit-card',
      '#059669',
      {
        paymentId: paymentData._id,
        amount: paymentData.amount,
        userEmail: paymentData.userEmail,
        description: paymentData.description,
        action: 'payment'
      },
      'normal'
    );
  }

  async notifySystemAlert(title, message, metadata = {}) {
    return this.createNotification(
      title,
      message,
      'system',
      'fa-exclamation-triangle',
      '#f59e0b',
      metadata,
      'high'
    );
  }

  // Handle gym admin replies
  async notifyGymAdminReply(replyData, gymData) {
    return this.createNotification(
      `Reply from ${gymData.gymName || 'Gym Admin'}`,
      replyData.message,
      'gym-admin-reply',
      'fa-reply',
      '#1976d2',
      {
        originalNotificationId: replyData.originalNotificationId,
        gymId: gymData.gymId,
        gymName: gymData.gymName,
        replyTimestamp: new Date().toISOString(),
        status: replyData.status,
        priority: replyData.priority,
        source: 'gym-admin-reply'
      },
      replyData.priority || 'medium'
    );
  }

  // Handle gym admin messages to main admin
  async notifyGymAdminMessage(messageData, gymData) {
    return this.createNotification(
      messageData.title,
      messageData.message,
      'gym-admin-message',
      'fa-comment',
      '#1976d2',
      {
        gymId: gymData.gymId,
        gymName: gymData.gymName,
        messageTimestamp: new Date().toISOString(),
        messageType: messageData.type,
        source: 'gym-admin-message'
      },
      messageData.priority || 'medium'
    );
  }

  // Helper method to get trainer display name
  getTrainerDisplayName(trainerData) {
    const firstName = trainerData.firstName || '';
    const lastName = trainerData.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Trainer';
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const total = await Notification.countDocuments({ user: this.defaultAdminId });
      const unread = await Notification.countDocuments({ user: this.defaultAdminId, read: false });
      
      // Get counts by type
      const typeStats = await Notification.aggregate([
        { $match: { user: this.defaultAdminId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      return {
        total,
        unread,
        typeStats: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, typeStats: {} };
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        user: this.defaultAdminId,
        timestamp: { $lt: thirtyDaysAgo },
        read: true
      });

      console.log(`✅ Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = new AdminNotificationService();
