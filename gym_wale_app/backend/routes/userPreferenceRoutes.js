const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

// Get user preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('preferences notifications privacy');
    
    // Default preferences if not set
    const defaultPreferences = {
      notifications: {
        email: {
          bookings: true,
          promotions: false,
          reminders: true
        },
        sms: {
          bookings: true,
          reminders: false
        },
        push: {
          enabled: true
        }
      },
      privacy: {
        profileVisibility: 'public',
        shareWorkoutData: false,
        shareProgress: true
      }
    };
    
    const preferences = user?.preferences || defaultPreferences;
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ message: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
router.put('/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const notificationSettings = req.body;
    
    // Update user's notification preferences
    await User.findByIdAndUpdate(userId, {
      $set: {
        'preferences.notifications': notificationSettings
      }
    });
    
    res.json({ success: true, message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
});

// Update privacy preferences
router.put('/privacy', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const privacySettings = req.body;
    
    // Update user's privacy preferences
    await User.findByIdAndUpdate(userId, {
      $set: {
        'preferences.privacy': privacySettings
      }
    });
    
    res.json({ success: true, message: 'Privacy preferences updated successfully' });
  } catch (error) {
    console.error('Error updating privacy preferences:', error);
    res.status(500).json({ message: 'Failed to update privacy preferences' });
  }
});

// Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is Google user
    if (user.authProvider === 'google') {
      return res.status(400).json({ message: 'Cannot change password for Google accounts' });
    }
    
    // Verify current password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Enable/disable two-factor authentication
router.put('/two-factor', authMiddleware, async (req, res) => {
  try {
    const { enabled, verificationCode } = req.body;
    const userId = req.userId;
    
    // In a real application, you would verify the 2FA code here
    if (enabled && !verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }
    
    await User.findByIdAndUpdate(userId, { twoFactorEnabled: enabled });
    
    const message = enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled';
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error updating 2FA:', error);
    res.status(500).json({ message: 'Failed to update two-factor authentication' });
  }
});

// Get user login history (mock data)
router.get('/login-history', authMiddleware, async (req, res) => {
  try {
    // For demo purposes, return mock login history
    // In a real application, you would track actual login sessions
    const mockLoginHistory = [
      {
        id: 1,
        browser: 'Chrome on Windows',
        location: 'New Delhi, India',
        timestamp: new Date(),
        current: true
      },
      {
        id: 2,
        browser: 'Chrome on Windows',
        location: 'New Delhi, India',
        timestamp: new Date(Date.now() - 86400000),
        current: false
      },
      {
        id: 3,
        browser: 'Firefox on Windows',
        location: 'Mumbai, India',
        timestamp: new Date(Date.now() - 172800000),
        current: false
      }
    ];
    
    res.json(mockLoginHistory);
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({ message: 'Failed to fetch login history' });
  }
});

// Export user data
router.post('/export-data', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // In a real application, you would gather all user data and create an export
    // For demo purposes, just return success
    
    res.json({ 
      success: true, 
      message: 'Data export request submitted. You will receive an email when ready.' 
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ message: 'Failed to export user data' });
  }
});

// Request data deletion
router.post('/request-deletion', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.userId;
    
    // In a real application, you would start the data deletion process
    // For demo purposes, just return success
    
    res.json({ 
      success: true, 
      message: 'Data deletion request submitted. You will receive a confirmation email.' 
    });
  } catch (error) {
    console.error('Error requesting data deletion:', error);
    res.status(500).json({ message: 'Failed to request data deletion' });
  }
});

// Deactivate account
router.put('/deactivate', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Mark account as deactivated
    await User.findByIdAndUpdate(userId, { 
      accountStatus: 'deactivated',
      deactivatedAt: new Date()
    });
    
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({ message: 'Failed to deactivate account' });
  }
});

// Delete account
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const { confirmation } = req.body;
    const userId = req.userId;
    
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ message: 'Invalid confirmation' });
    }
    
    // In a real application, you would properly delete all user data
    // For demo purposes, just mark as deleted
    await User.findByIdAndUpdate(userId, { 
      accountStatus: 'deleted',
      deletedAt: new Date()
    });
    
    res.json({ success: true, message: 'Account deletion initiated' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

module.exports = router;
