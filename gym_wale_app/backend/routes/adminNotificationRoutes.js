const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminNotificationService = require('../services/adminNotificationService');

// Endpoint for gym admin to send notification to main admin
router.post('/send', adminAuth, async (req, res) => {
  try {
    const { title, message, type = 'system', icon, color, metadata, priority, isGrievance, gym } = req.body;
    
    // Enhanced metadata for grievance notifications and replies
    const enhancedMetadata = {
      ...metadata,
      gym: gym || {},
      isGrievance: isGrievance || false,
      timestamp: new Date().toISOString(),
      source: metadata?.source || 'gym-admin'
    };

    // Set appropriate icon and color for different notification types
    let notificationIcon = icon;
    let notificationColor = color;
    let notificationPriority = priority;

    if (isGrievance) {
      notificationIcon = notificationIcon || 'fa-exclamation-triangle';
      notificationColor = notificationColor || '#dc3545';
      notificationPriority = 'high';
    } else if (type === 'gym-admin-reply') {
      notificationIcon = notificationIcon || 'fa-reply';
      notificationColor = notificationColor || '#1976d2';
      notificationPriority = notificationPriority || 'medium';
    } else {
      notificationIcon = notificationIcon || 'fa-bell';
      notificationColor = notificationColor || '#2563eb';
      notificationPriority = notificationPriority || 'medium';
    }

    // Use the service to create a notification for the default admin
    const notification = await adminNotificationService.createNotification(
      title,
      message,
      type,
      notificationIcon,
      notificationColor,
      enhancedMetadata,
      notificationPriority
    );
    
    console.log(`📧 Admin notification sent: ${title} ${isGrievance ? '(GRIEVANCE)' : ''} ${type === 'gym-admin-reply' ? '(REPLY)' : ''}`);
    res.json({ 
      success: true, 
      message: 'Notification sent to admin.',
      notificationId: notification._id
    });
  } catch (error) {
    console.error('Error sending notification to admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending notification to admin.',
      error: error.message
    });
  }
});

// Endpoint for gym admin to reply to main admin notifications
router.post('/reply', adminAuth, async (req, res) => {
  try {
    const { 
      originalNotificationId, 
      replyMessage, 
      priority = 'medium', 
      status, 
      gym 
    } = req.body;
    
    if (!originalNotificationId || !replyMessage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original notification ID and reply message are required.' 
      });
    }

    const gymData = gym || {};
    const replyTitle = `Reply from ${gymData.gymName || 'Gym Admin'}`;
    
    // Create reply notification for main admin
    const notification = await adminNotificationService.createNotification(
      replyTitle,
      replyMessage,
      'gym-admin-reply',
      'fa-reply',
      '#1976d2',
      {
        originalNotificationId,
        gymId: gymData.gymId,
        gymName: gymData.gymName,
        replyTimestamp: new Date().toISOString(),
        status: status || 'replied',
        source: 'gym-admin-reply'
      },
      priority
    );
    
    console.log(`📧 Reply notification sent to admin from gym: ${gymData.gymName || 'Unknown'}`);
    res.json({ 
      success: true, 
      message: 'Reply sent to admin successfully.',
      notificationId: notification._id
    });
  } catch (error) {
    console.error('Error sending reply to admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending reply to admin.',
      error: error.message
    });
  }
});

module.exports = router;
