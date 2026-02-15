// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Member = require('../models/Member');
const User = require('../models/User');
const Gym = require('../models/gym');
const TrialBooking = require('../models/TrialBooking');
const authMiddleware = require('../middleware/authMiddleware');
const gymadminAuth = require('../middleware/gymadminAuth');

// ============ GYM ADMIN NOTIFICATION ROUTES ============
// IMPORTANT: These routes must be defined BEFORE user routes to prevent conflicts

// Get all notifications for the authenticated gym admin
// Unified endpoint used by both Dashboard and Support Tab
router.get('/all', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Filters
    const query = { user: gymId };
    
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }
    
    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }
    
    if (req.query.read && req.query.read !== 'all') {
      const isRead = req.query.read === 'true';
      query.$or = [
        { read: isRead },
        { isRead: isRead }
      ];
    }
    
    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get unread count (check both read and isRead fields)
    const unreadCount = await Notification.countDocuments({
      user: gymId,
      $and: [
        { $or: [{ read: false }, { read: { $exists: false } }] },
        { $or: [{ isRead: false }, { isRead: { $exists: false } }] }
      ]
    });
    
    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

// Get unread notifications for the authenticated gym admin
// Unified endpoint used by both Dashboard and Support Tab
router.get('/unread', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Query for unread notifications (check both read and isRead fields)
    const notifications = await Notification.find({ 
      user: gymId,
      $and: [
        { $or: [{ read: false }, { read: { $exists: false } }] },
        { $or: [{ isRead: false }, { isRead: { $exists: false } }] }
      ]
    }).sort({ timestamp: -1 });
    
    res.json({
      success: true,
      notifications,
      count: notifications.length,
      unreadCount: notifications.length  // Add unreadCount for compatibility
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread notifications'
    });
  }
});

// Mark all notifications as read
// Unified endpoint used by both Dashboard and Support Tab
// Support both PATCH and PUT for backward compatibility
router.patch('/mark-all-read', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Update all unread notifications (check both read and isRead fields)
    await Notification.updateMany(
      { 
        user: gymId,
        $and: [
          { $or: [{ read: false }, { read: { $exists: false } }] },
          { $or: [{ isRead: false }, { isRead: { $exists: false } }] }
        ]
      },
      { 
        read: true,
        isRead: true,  // Set both fields for backward compatibility
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

// PUT endpoint for backward compatibility (same as PATCH)
router.put('/mark-all-read', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Update all unread notifications (check both read and isRead fields)
    await Notification.updateMany(
      { 
        user: gymId,
        $and: [
          { $or: [{ read: false }, { read: { $exists: false } }] },
          { $or: [{ isRead: false }, { isRead: { $exists: false } }] }
        ]
      },
      { 
        read: true,
        isRead: true,  // Set both fields for backward compatibility
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

// Mark notification as read
// Unified endpoint used by both Dashboard and Support Tab
// Support both PATCH and PUT for backward compatibility
router.patch('/:id/read', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: gymId },
      { 
        read: true,
        isRead: true,  // Set both fields for backward compatibility
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

// PUT endpoint for backward compatibility (same as PATCH)
router.put('/:id/read', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: gymId },
      { 
        read: true,
        isRead: true,  // Set both fields for backward compatibility
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

// Delete notification (for gym admin)
router.delete('/:id', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: gymId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
});

// ============ USER NOTIFICATION ROUTES ============

// Get user notifications (for regular app users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const query = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
});

// Get unread notification count (for regular app users)
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
});

// Poll for new notifications since a specific timestamp (for regular app users)
// This endpoint supports real-time notification checking
router.get('/poll', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const since = req.query.since; // ISO timestamp
    
    const query = { userId };
    
    // If 'since' parameter is provided, only get notifications newer than that
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    // Get new notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100); // Limit to prevent excessive data transfer

    // Get current unread count
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      count: notifications.length,
      timestamp: new Date().toISOString() // Server timestamp for next poll
    });
  } catch (error) {
    console.error('Error polling notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to poll notifications',
    });
  }
});

// Mark notification as read (for regular app users)
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
});

// Mark all notifications as read (for regular app users)
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
    });
  }
});

// Delete notification (for regular app users)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
});

// ============ GYM ADMIN NOTIFICATION ROUTES ============

// Get all notifications for the authenticated gym admin
// Unified endpoint used by both Dashboard and Support Tab
router.get('/all', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Filters
    const query = { user: gymId };
    
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }
    
    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }
    
    if (req.query.read && req.query.read !== 'all') {
      const isRead = req.query.read === 'true';
      query.$or = [
        { read: isRead },
        { isRead: isRead }
      ];
    }
    
    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get unread count (check both read and isRead fields)
    const unreadCount = await Notification.countDocuments({
      user: gymId,
      $and: [
        { $or: [{ read: false }, { read: { $exists: false } }] },
        { $or: [{ isRead: false }, { isRead: { $exists: false } }] }
      ]
    });
    
    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

// Get unread notifications for the authenticated gym admin
// Unified endpoint used by both Dashboard and Support Tab
router.get('/unread', gymadminAuth, async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Query for unread notifications (check both read and isRead fields)
    const notifications = await Notification.find({ 
      user: gymId,
      $and: [
        { $or: [{ read: false }, { read: { $exists: false } }] },
        { $or: [{ isRead: false }, { isRead: { $exists: false } }] }
      ]
    }).sort({ timestamp: -1 });
    
    res.json({
      success: true,
      notifications,
      count: notifications.length,
      unreadCount: notifications.length  // Add unreadCount for compatibility
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread notifications'
    });
  }
});

// Create a new notification (for system use)
router.post('/', gymadminAuth, async (req, res) => {
  try {
    const { title, message, type, priority } = req.body;
    
    const notification = new Notification({
      title,
      message,
      type,
      priority: priority || 'normal',
      user: req.gymId
    });
    
    await notification.save();
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification'
    });
  }
});

// Get members with expiring memberships
router.get('/expiring-memberships', gymadminAuth, async (req, res) => {
  try {
    const { days = 3 } = req.query;
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parseInt(days));
    
    const expiringMembers = await Member.find({
      gymId: req.gymId,
      membershipValidUntil: {
        $lte: daysFromNow,
        $gte: new Date()
      }
    }).select('name email phone membershipValidUntil planSelected');
    
    res.json({
      success: true,
      members: expiringMembers,
      count: expiringMembers.length
    });
  } catch (error) {
    console.error('Error fetching expiring memberships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring memberships'
    });
  }
});

// Utility function to create notifications (exported for use in other routes)
const createNotification = async (gymId, title, message, type, priority = 'normal', metadata = {}) => {
  try {
    const notification = new Notification({
      title,
      message,
      type,
      priority,
      user: gymId,
      metadata
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Export the utility function
router.createNotification = createNotification;

// Send notification via email
router.post('/send-email', gymadminAuth, async (req, res) => {
  try {
    const { title, message, recipients } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym ID is required.' 
      });
    }
    
    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and recipients are required.' 
      });
    }

    const sendEmail = require('../utils/sendEmail');
    const successCount = [];
    const failedCount = [];

    // Send emails to all recipients
    for (const email of recipients) {
      try {
        await sendEmail(email, title, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #1976d2, #42a5f5); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">
                <i class="fas fa-dumbbell"></i> Gym-Wale
              </h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1976d2; margin-top: 0;">${title}</h2>
              <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #1976d2;">
                <p style="margin: 0; line-height: 1.6; color: #333; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 6px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #1976d2;">Gym-Wale Team</strong>
                </p>
              </div>
            </div>
          </div>
        `);
        successCount.push(email);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        failedCount.push(email);
      }
    }

    // Log email notification in the database
    const notification = new Notification({
      user: gymId,
      title: `Email: ${title}`,
      message: `Sent to ${successCount.length} recipients. ${failedCount.length} failed.`,
      type: 'email',
      metadata: {
        successCount: successCount.length,
        failedCount: failedCount.length,
        successEmails: successCount,
        failedEmails: failedCount
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: `Email sent successfully to ${successCount.length} recipients. ${failedCount.length} failed.`,
      successCount: successCount.length,
      failedCount: failedCount.length
    });
  } catch (error) {
    console.error('Error sending email notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending email notifications'
    });
  }
});

// Send notification via WhatsApp
router.post('/send-whatsapp', gymadminAuth, async (req, res) => {
  try {
    const { title, message, recipients } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym ID is required.' 
      });
    }
    
    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and recipients are required.' 
      });
    }

    const WhatsAppService = require('../services/whatsappService');
    const whatsappService = new WhatsAppService();
    
    // Check if WhatsApp service is configured
    const serviceStatus = whatsappService.getStatus();
    
    // Send WhatsApp messages to all recipients
    const results = await whatsappService.sendBulkMessages(recipients, title, message);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    // Log WhatsApp notification in the database
    const notification = new Notification({
      user: gymId,
      title: `WhatsApp: ${title}`,
      message: `Sent to ${successCount} recipients. ${failedCount} failed.`,
      type: 'whatsapp',
      metadata: {
        successCount,
        failedCount,
        provider: serviceStatus.provider,
        configured: serviceStatus.configured,
        results: results.map(r => ({
          phoneNumber: r.phoneNumber,
          success: r.success,
          messageId: r.messageId,
          status: r.status,
          error: r.error
        }))
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: `WhatsApp message sent successfully to ${successCount} recipients. ${failedCount} failed.`,
      successCount,
      failedCount,
      provider: serviceStatus.provider,
      configured: serviceStatus.configured,
      results: results
    });
  } catch (error) {
    console.error('Error sending WhatsApp notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending WhatsApp notifications',
      error: error.message
    });
  }
});

// Send system notification
router.post('/send', gymadminAuth, async (req, res) => {
  try {
    const { title, message, recipients, type = 'system' } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gym ID is required.' 
      });
    }
    
    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and recipients are required.' 
      });
    }

    const notifications = [];
    
    // Create system notifications for each recipient
    for (const recipientId of recipients) {
      const notification = new Notification({
        user: gymId,
        recipient: recipientId,
        title,
        message,
        type,
        read: false,
        timestamp: new Date()
      });
      notifications.push(notification);
    }

    // Save all notifications
    await Notification.insertMany(notifications);

    res.json({
      success: true,
      message: `System notification sent successfully to ${recipients.length} recipients.`,
      count: recipients.length
    });
  } catch (error) {
    console.error('Error sending system notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending system notifications'
    });
  }
});

// ============ ENHANCED NOTIFICATION SYSTEM ============
// Integration with new notificationController

const notificationController = require('../controllers/notificationController');

// Admin notification retrieval
router.get('/admin/all', gymadminAuth, notificationController.getAdminNotifications);
router.get('/admin/unread-count', gymadminAuth, notificationController.getUnreadCount);
router.get('/admin/stats', gymadminAuth, notificationController.getNotificationStats);

// Admin notification actions
router.put('/admin/:notificationId/read', gymadminAuth, notificationController.markAsRead);
router.put('/admin/read-all', gymadminAuth, notificationController.markAllAsRead);
router.delete('/admin/:notificationId', gymadminAuth, notificationController.deleteNotification);

// Sending notifications (gym admin only)
router.post('/send-to-members', gymadminAuth, notificationController.sendToMembers);
router.post('/send-to-super-admin', gymadminAuth, notificationController.sendToSuperAdmin);
router.post('/renewal-reminders', gymadminAuth, notificationController.sendRenewalReminders);
router.post('/holiday-notice', gymadminAuth, notificationController.sendHolidayNotice);

module.exports = router;
