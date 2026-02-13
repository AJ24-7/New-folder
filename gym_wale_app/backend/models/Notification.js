// models/Notification.js
const mongoose = require('mongoose');

// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String, // e.g., "new-member", "payment", "trainer-approved", "membership-expiry", "offer", "trial_booking", "ticket_update"
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'medium', 'high'],
    default: 'normal'
  },
  icon: {
    type: String,
    default: 'fa-bell'
  },
  color: {
    type: String,
    default: '#1976d2'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',  // This will reference the Admin model for notifications
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // For app user notifications
    required: false
  },
  readAt: {
    type: Date
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  imageUrl: {
    type: String
  },
  actionType: {
    type: String,
    enum: ['navigate', 'external_link', 'none'],
    default: 'none'
  },
  actionData: {
    type: String
  }
});

// Helper methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static methods
notificationSchema.statics.getUnreadNotifications = function(adminId) {
  return this.find({ user: adminId, isRead: false });
};

notificationSchema.statics.getAllNotifications = function(adminId) {
  return this.find({ user: adminId });
};

// Middleware to sync read and isRead fields
notificationSchema.pre('save', function(next) {
  // Sync isRead with read field for backwards compatibility
  if (this.isModified('isRead')) {
    this.read = this.isRead;
  } else if (this.isModified('read')) {
    this.isRead = this.read;
  }
  next();
});

// Model export
const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
