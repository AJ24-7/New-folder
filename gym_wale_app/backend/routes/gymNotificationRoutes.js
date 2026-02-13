// routes/gymNotificationRoutes.js
const express = require('express');
const router = express.Router();
const GymNotification = require('../models/GymNotification');
const gymadminAuth = require('../middleware/gymadminAuth');

// Get all notifications for a gym admin
router.get('/', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin.id; // Use req.admin.id from current auth structure
    
    const notifications = await GymNotification.find({ 
      gymId: gymId 
    })
    .sort({ createdAt: -1 })
    .limit(50);

    const unreadCount = await GymNotification.countDocuments({
      gymId: gymId,
      read: false
    });

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching gym notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

// Mark notification as read
router.put('/:notificationId/read', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin.id; // Use req.admin.id from current auth structure
    
    const notification = await GymNotification.findOneAndUpdate(
      { 
        _id: req.params.notificationId,
        gymId: gymId 
      },
      { read: true },
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

// Mark all notifications as read
router.put('/mark-all-read', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin.id; // Use req.admin.id from current auth structure
    
    await GymNotification.updateMany(
      { 
        gymId: gymId,
        read: false 
      },
      { read: true }
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

// Delete notification
router.delete('/:notificationId', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin.id; // Use req.admin.id from current auth structure
    
    const notification = await GymNotification.findOneAndDelete({
      _id: req.params.notificationId,
      gymId: gymId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    console.log('✅ Notification deleted successfully:', req.params.notificationId);

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

module.exports = router;
