const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Member = require('../models/Member');
const TrialBooking = require('../models/TrialBooking');
const Notification = require('../models/Notification');
const Gym = require('../models/gym');

// ============ USER PREFERENCES ============

// Get all user preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('preferences notifications privacy');
    
    const defaultPreferences = {
      notifications: {
        email: {
          bookingConfirm: true,
          membershipExpiry: true,
          offers: false,
        },
        sms: {
          bookingReminder: true,
          paymentConfirm: false,
        },
        push: {
          enabled: true,
        }
      },
      privacy: {
        profileVisibility: 'public',
        dataSharing: 'yes',
      }
    };
    
    res.json({
      success: true,
      preferences: user?.preferences || defaultPreferences
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch preferences' 
    });
  }
});

// Update notification preferences
router.put('/preferences/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const notificationSettings = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'preferences.notifications': notificationSettings
        }
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update preferences' 
    });
  }
});

// Update privacy preferences
router.put('/preferences/privacy', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const privacySettings = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'preferences.privacy': privacySettings
        }
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Privacy preferences updated',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating privacy preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update preferences' 
    });
  }
});

// Update user settings (theme, language, app settings)
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;
    const updateObject = {};
    
    // Handle theme update
    if (updates.theme) {
      updateObject['preferences.theme'] = updates.theme;
    }
    
    // Handle language update
    if (updates.language) {
      updateObject['preferences.language'] = updates.language;
    }
    
    // Handle app settings update
    if (updates.appSettings) {
      Object.keys(updates.appSettings).forEach(key => {
        updateObject[`preferences.appSettings.${key}`] = updates.appSettings[key];
      });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateObject },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings' 
    });
  }
});

// Get all user settings (theme, language, app settings)
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('preferences');
    
    res.json({
      success: true,
      theme: user?.preferences?.theme || 'system',
      language: user?.preferences?.language || 'en',
      appSettings: user?.preferences?.appSettings || {},
      preferences: user?.preferences || {}
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch settings' 
    });
  }
});

// ============ USER BOOKINGS ============

// Get all user bookings (gym memberships)
router.get('/bookings/gym', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const Gym = require('../models/gym');
    
    const memberships = await Member.find({ 
      email: user.email 
    })
    .sort({ joinDate: -1 });
    
    const formattedBookings = await Promise.all(memberships.map(async (membership) => {
      let gym = null;
      if (membership.gym) {
        try {
          gym = await Gym.findById(membership.gym);
        } catch (err) {
          console.error('Error fetching gym for membership:', err);
        }
      }
      
      // Calculate end date if not available
      let endDate = membership.validUntil;
      if (!endDate && membership.joinDate && membership.monthlyPlan) {
        const startDate = new Date(membership.joinDate);
        const months = parseInt(membership.monthlyPlan.split(' ')[0]) || 1;
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
      }
      
      // Determine status based on end date
      let status = membership.paymentStatus === 'paid' ? 'active' : membership.paymentStatus;
      if (endDate) {
        const now = new Date();
        if (new Date(endDate) < now) {
          status = 'expired';
        }
      }
      
      return {
        id: membership._id,
        type: 'gym',
        gymId: membership.gym,
        gymName: gym?.gymName || 'Unknown Gym',
        gymLogo: gym?.logoUrl,
        membershipId: membership.membershipId || membership.passId || membership._id.toString().slice(-8).toUpperCase(),
        membershipName: membership.membershipPlan || membership.planSelected || 'Standard Plan',
        startDate: membership.joinDate,
        endDate: endDate,
        status: status,
        amount: membership.amount || membership.paymentAmount,
        duration: membership.validity || membership.monthlyPlan,
        address: gym?.address || membership.address,
        city: gym?.city,
        state: gym?.state,
      };
    }));
    
    res.json({
      success: true,
      bookings: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching gym bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bookings' 
    });
  }
});

// Get trial bookings
router.get('/bookings/trial', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const Gym = require('../models/gym');
    
    const trialBookings = await TrialBooking.find({ 
      email: user.email 
    })
    .sort({ createdAt: -1 });
    
    const formattedBookings = await Promise.all(trialBookings.map(async (booking) => {
      let gym = null;
      if (booking.gymId) {
        try {
          gym = await Gym.findById(booking.gymId);
        } catch (err) {
          console.error('Error fetching gym for trial booking:', err);
        }
      }
      
      return {
        id: booking._id,
        type: 'trial',
        gymId: booking.gymId,
        gymName: gym?.gymName || booking.gymName || 'Unknown Gym',
        gymLogo: gym?.logoUrl || null,
        trialDate: booking.trialDate,
        startTime: booking.trialTime || '09:00 AM',
        endTime: booking.trialTime ? '10:00 AM' : '10:00 AM',
        status: booking.status,
        address: gym?.address || '',
        city: gym?.city || '',
        state: gym?.state || '',
        createdAt: booking.createdAt
      };
    }));
    
    res.json({
      success: true,
      bookings: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching trial bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch trial bookings' 
    });
  }
});

// Check if user can book trial at specific gym
router.get('/bookings/can-book-trial/:gymId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { gymId } = req.params;
    const user = await User.findById(userId);
    const Member = require('../models/Member');
    
    // Check if user has ever been or is currently a member of this gym
    const membershipExists = await Member.findOne({
      email: user.email,
      gym: gymId
    });
    
    if (membershipExists) {
      return res.json({
        success: true,
        canBook: false,
        reason: 'membership_exists',
        message: 'Trial booking is not available as you have been or are currently a member of this gym.'
      });
    }
    
    // Check monthly trial limit
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const trialsThisMonth = await TrialBooking.countDocuments({ 
      email: user.email,
      createdAt: { $gte: startOfMonth }
    });
    
    const trialLimit = 3;
    
    if (trialsThisMonth >= trialLimit) {
      return res.json({
        success: true,
        canBook: false,
        reason: 'limit_reached',
        message: `You have used all ${trialLimit} trial sessions for this month.`,
        used: trialsThisMonth,
        limit: trialLimit
      });
    }
    
    res.json({
      success: true,
      canBook: true,
      remaining: trialLimit - trialsThisMonth,
      used: trialsThisMonth,
      limit: trialLimit
    });
  } catch (error) {
    console.error('Error checking trial eligibility:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check trial eligibility' 
    });
  }
});

// Get trial limits
router.get('/bookings/trial-limits', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count trials only for current month
    const totalTrials = await TrialBooking.countDocuments({ 
      email: user.email,
      createdAt: { $gte: startOfMonth }
    });
    
    const completedTrials = await TrialBooking.countDocuments({ 
      email: user.email,
      status: 'completed',
      createdAt: { $gte: startOfMonth }
    });
    
    const pendingTrials = await TrialBooking.countDocuments({ 
      email: user.email,
      status: { $in: ['pending', 'confirmed'] },
      createdAt: { $gte: startOfMonth }
    });
    
    const trialLimit = 3; // Default trial limit (3 per month)
    
    res.json({
      success: true,
      limits: {
        used: totalTrials,
        total: trialLimit,
        remaining: Math.max(0, trialLimit - totalTrials),
        completed: completedTrials,
        pending: pendingTrials
      }
    });
  } catch (error) {
    console.error('Error fetching trial limits:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch trial limits' 
    });
  }
});

// ============ ACTIVE MEMBERSHIPS ============

// Get active memberships with full details
router.get('/memberships/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    console.log('Fetching active memberships for user:', user.email);
    
    // First check all memberships for this user
    const allMemberships = await Member.find({ email: user.email });
    console.log(`Total memberships for ${user.email}: ${allMemberships.length}`);
    
    const now = new Date();
    const memberships = await Member.find({ 
      email: user.email,
      validUntil: { $gte: now },
      paymentStatus: 'paid'
    })
    .populate('gym', 'gymName logoUrl location address city state phone openingTime closingTime rating amenities')
    .sort({ joinDate: -1 });
    
    console.log(`Found ${memberships.length} active (paid & not expired) memberships`);
    
    const formattedMemberships = memberships.map(membership => {
      // Parse validity - it might be a number or a string like "6 Months"
      let validityDays = 30; // default
      let durationType = 'month';
      let duration = 1;
      
      if (typeof membership.validity === 'number') {
        validityDays = membership.validity;
      } else if (typeof membership.validity === 'string') {
        // Parse strings like "6 Months", "1 Year", etc.
        const match = membership.validity.match(/(\d+)\s*(day|month|year|quarter)/i);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          if (unit === 'year') {
            validityDays = num * 365;
          } else if (unit === 'quarter') {
            validityDays = num * 90;
          } else if (unit === 'month') {
            validityDays = num * 30;
          } else {
            validityDays = num;
          }
        }
      }
      
      // Determine duration type and value for display
      if (validityDays >= 365) {
        durationType = 'year';
        duration = Math.floor(validityDays / 365);
      } else if (validityDays >= 90) {
        durationType = 'quarter';
        duration = 1;
      } else if (validityDays >= 30) {
        durationType = 'month';
        duration = Math.floor(validityDays / 30);
      } else {
        durationType = 'days';
        duration = validityDays;
      }
      
      return {
        id: membership._id,
        membershipId: membership._id,
        gym: {
          id: membership.gym?._id,
          name: membership.gym?.gymName || 'Unknown Gym',
          logo: membership.gym?.logoUrl,
          address: membership.gym?.address,
          city: membership.gym?.city,
          state: membership.gym?.state,
          phone: membership.gym?.phone,
          openingTime: membership.gym?.openingTime,
          closingTime: membership.gym?.closingTime,
          rating: membership.gym?.rating,
          amenities: membership.gym?.amenities || [],
        },
        plan: {
          name: membership.membershipPlan || 'Standard Plan',
          duration: duration,
          durationType: durationType,
          price: membership.amount,
        },
        planType: membership.planSelected || 'Standard',
        planSelected: membership.planSelected || 'Standard',
        duration: duration,
        monthlyPlan: membership.monthlyPlan,
        startDate: membership.joinDate,
        endDate: membership.validUntil,
        validUntil: membership.validUntil,
        // membershipValidUntil is extended by freeze; use it as the authoritative expiry date
        membershipValidUntil: membership.membershipValidUntil || null,
        // Use the human-readable membershipId; fall back to MongoDB _id as string
        membershipId: membership.membershipId || membership._id.toString(),
        daysRemaining: Math.ceil((new Date(membership.validUntil) - now) / (1000 * 60 * 60 * 24)),
        status: 'active',
        benefits: membership.benefits || [],
        // Freeze information
        currentlyFrozen: membership.currentlyFrozen || false,
        freezeStartDate: membership.freezeStartDate,
        freezeEndDate: membership.freezeEndDate,
        freezeDays: membership.freezeHistory ? 
          membership.freezeHistory.reduce((total, freeze) => total + (freeze.freezeDays || 0), 0) : 0,
        totalFreezeCount: membership.totalFreezeCount || 0,
      };
    });
    
    res.json({
      success: true,
      memberships: formattedMemberships,
      count: formattedMemberships.length
    });
  } catch (error) {
    console.error('Error fetching active memberships:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active memberships' 
    });
  }
});

// ============ USER NOTIFICATIONS ============

// Get user notifications
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20, unreadOnly = false } = req.query;
    
    const query = { userId: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ 
      userId: userId,
      read: false 
    });
    
    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notifications' 
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.userId;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: userId },
      { read: true, readAt: new Date() },
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
      message: 'Failed to update notification' 
    });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    await Notification.updateMany(
      { userId: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update notifications' 
    });
  }
});

// ============ ACCOUNT DATA ============

// Get account data export
router.get('/account/export-data', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select('-password');
    
    const memberships = await Member.find({ email: user.email });
    const trials = await TrialBooking.find({ email: user.email });
    const notifications = await Notification.find({ userId: userId });
    
    const exportData = {
      user: user,
      memberships: memberships,
      trialBookings: trials,
      notifications: notifications,
      exportDate: new Date(),
    };
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export data' 
    });
  }
});

// Request account deletion
router.post('/account/delete-request', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { reason } = req.body;
    
    // Mark user for deletion (in production, this should go through a review process)
    await User.findByIdAndUpdate(userId, {
      deletionRequested: true,
      deletionReason: reason,
      deletionRequestedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Account deletion request submitted. Your account will be deleted within 30 days.'
    });
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit deletion request' 
    });
  }
});

// ============ PAYMENT HISTORY / TRANSACTIONS ============

// Get payment history (transactions) for user
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    // Get all membership bookings for this user
    const memberships = await Member.find({ 
      email: user.email 
    })
    .populate('gym', 'gymName logoUrl')
    .sort({ joinDate: -1 })
    .limit(50);
    
    const transactions = memberships.map(membership => ({
      id: membership._id,
      type: 'membership',
      gymName: membership.gym?.gymName || 'Unknown Gym',
      gymLogo: membership.gym?.logoUrl,
      planName: membership.membershipPlan || membership.planSelected || 'Standard Plan',
      amount: membership.paymentAmount || membership.amount || 0,
      paymentMode: membership.paymentMode || 'Cash',
      paymentStatus: membership.paymentStatus || 'pending',
      date: membership.joinDate || membership.createdAt,
      membershipId: membership.membershipId,
      duration: membership.monthlyPlan || membership.validity || '1 Month',
    }));
    
    res.json({
      success: true,
      transactions,
      totalTransactions: transactions.length,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch transactions' 
    });
  }
});

module.exports = router;
