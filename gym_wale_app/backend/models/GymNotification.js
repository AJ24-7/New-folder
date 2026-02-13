// models/GymNotification.js
const mongoose = require('mongoose');

const gymNotificationSchema = new mongoose.Schema({
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true
  },
  type: {
    type: String,
    enum: ['grievance-reply', 'support-reply', 'system-alert', 'general'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  metadata: {
    ticketId: String,
    adminMessage: String,
    ticketSubject: String,
    ticketStatus: String,
    ticketPriority: String,
    adminId: String,
    source: {
      type: String,
      default: 'admin-reply'
    }
  },
  actions: [{
    type: {
      type: String,
      enum: ['view-ticket', 'reply', 'acknowledge', 'contact-support']
    },
    label: String,
    url: String,
    data: mongoose.Schema.Types.Mixed
  }],
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
}, {
  timestamps: true
});

// Index for better performance
gymNotificationSchema.index({ gymId: 1, createdAt: -1 });
gymNotificationSchema.index({ gymId: 1, read: 1 });
gymNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Helper methods
gymNotificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

gymNotificationSchema.statics.createGrievanceReply = async function(data) {
  const notification = new this({
    gymId: data.gymId,
    type: 'grievance-reply',
    title: 'Admin Reply to Your Grievance',
    message: `Admin has responded to your grievance ticket #${data.ticketId}`,
    priority: data.priority || 'high',
    metadata: {
      ticketId: data.ticketId,
      adminMessage: data.adminMessage,
      ticketSubject: data.ticketSubject,
      ticketStatus: data.ticketStatus,
      ticketPriority: data.ticketPriority,
      adminId: data.adminId,
      source: 'admin-reply'
    },
    actions: [
      {
        type: 'view-ticket',
        label: 'View Ticket',
        url: `/support/tickets/${data.ticketId}`,
        data: { ticketId: data.ticketId }
      },
      {
        type: 'reply',
        label: 'Reply to Admin',
        url: `/support/tickets/${data.ticketId}/reply`,
        data: { ticketId: data.ticketId }
      },
      {
        type: 'acknowledge',
        label: 'Acknowledge',
        data: { ticketId: data.ticketId }
      }
    ]
  });
  
  return notification.save();
};

gymNotificationSchema.statics.getUnreadCount = function(gymId) {
  return this.countDocuments({ gymId: gymId, read: false });
};

gymNotificationSchema.statics.getRecentNotifications = function(gymId, limit = 10) {
  return this.find({ gymId: gymId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('GymNotification', gymNotificationSchema);
