const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const unifiedAdminAuth = require('../controllers/unifiedAdminAuth');
const communicationController = require('../controllers/communicationController');
const sendEmail = require('../utils/sendEmail');
const Notification = require('../models/Notification'); // Import Notification model
const Admin = require('../models/admin'); 

// Authentication Routes (Public) - Using Unified Admin Auth Controller
router.post('/auth/login', unifiedAdminAuth.createRateLimiter(), unifiedAdminAuth.login.bind(unifiedAdminAuth));
router.post('/auth/verify-2fa', unifiedAdminAuth.verify2FA.bind(unifiedAdminAuth));
router.post('/auth/forgot-password', unifiedAdminAuth.forgotPassword.bind(unifiedAdminAuth));
router.post('/auth/reset-password', unifiedAdminAuth.resetPassword.bind(unifiedAdminAuth));
router.post('/auth/refresh-token', unifiedAdminAuth.refreshToken.bind(unifiedAdminAuth));
router.post('/auth/logout', unifiedAdminAuth.logout.bind(unifiedAdminAuth));

// Setup Routes (Public)
router.get('/check-database', async (req, res) => {
  try {
    // Simple database connectivity check
    const adminCount = await Admin.countDocuments({});
    res.json({ 
      success: true, 
      message: 'Database connection successful',
      adminCount 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

router.get('/check-admin-exists', async (req, res) => {
  try {
    const adminExists = await Admin.findOne({});
    res.json({ 
      adminExists: !!adminExists,
      message: adminExists ? 'Admin account found' : 'No admin account exists'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error checking admin status',
      error: error.message 
    });
  }
});

router.post('/setup-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin account already exists. Please use the login page.'
      });
    }

    const { name, email, phone, password, role, permissions } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      password, // Will be hashed by pre-save middleware
      role: role || 'super_admin',
      permissions: permissions || [
        'manage_gyms',
        'manage_users',
        'manage_subscriptions',
        'manage_payments',
        'manage_support',
        'manage_trainers',
        'view_analytics',
        'system_settings',
        'security_logs'
      ],
      status: 'active',
      twoFactorEnabled: false,
      setupCompleted: true,
      setupDate: new Date()
    });

    await newAdmin.save();

    res.json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error('Setup admin error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating admin account',
      error: error.message
    });
  }
});

// Helper route to create default admin for development
router.post('/create-default-admin', async (req, res) => {
  try {
    // Check if any admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.json({ 
        message: 'Admin already exists', 
        adminId: existingAdmin._id,
        email: existingAdmin.email 
      });
    }

    // Create default super admin
    const defaultAdmin = new Admin({
      name: 'Super Admin',
      email: 'admin@gym-wale.com',
      password: 'SecureAdmin@2024', // This will be hashed by the pre-save middleware
      role: 'super_admin',
      permissions: [
        'manage_gyms',
        'manage_users', 
        'manage_subscriptions',
        'manage_payments',
        'manage_support',
        'manage_trainers',
        'view_analytics',
        'system_settings',
        'security_logs'
      ],
      twoFactorEnabled: false, // Disable 2FA for easier testing
      status: 'active'
    });

    await defaultAdmin.save();
    
    res.json({ 
      message: 'Default super admin created successfully', 
      adminId: defaultAdmin._id,
      email: defaultAdmin.email,
      note: 'Please change the default password after first login'
    });
  } catch (error) {
    console.error('Error creating default admin:', error);
    res.status(500).json({ message: 'Error creating default admin', error: error.message });
  }
});

// Helper route to reset admin for development
router.post('/reset-admin-dev', async (req, res) => {
  try {
    // Remove all existing admins
    await Admin.deleteMany({});
    
    // Create new default admin
    const defaultAdmin = new Admin({
      name: 'Super Admin',
      email: 'admin@gym-wale.com',
      password: 'SecureAdmin@2024',
      role: 'super_admin',
      permissions: [
        'manage_gyms',
        'manage_users', 
        'manage_subscriptions',
        'manage_payments',
        'manage_support',
        'manage_trainers',
        'view_analytics',
        'system_settings',
        'security_logs'
      ],
      twoFactorEnabled: false,
      status: 'active'
    });

    await defaultAdmin.save();
    
    res.json({ 
      message: 'Admin reset and created successfully', 
      adminId: defaultAdmin._id,
      email: defaultAdmin.email,
      password: 'SecureAdmin@2024'
    });
  } catch (error) {
    console.error('Error resetting admin:', error);
    res.status(500).json({ message: 'Error resetting admin', error: error.message });
  }
});

// Protected Routes (Require Authentication)
const { getDashboardData } = require('../controllers/adminController');

// Dashboard route
router.get('/dashboard', adminAuth, adminController.getDashboardData);

// Profile routes
router.get('/profile', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password -refreshTokens');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        profilePicture: admin.profilePicture,
        role: admin.role,
        permissions: admin.permissions,
        status: admin.status,
        twoFactorEnabled: admin.twoFactorEnabled,
        lastLogin: admin.lastLogin,
        lastLoginIP: admin.lastLoginIP,
        createdAt: admin.createdAt,
        passwordChangedAt: admin.passwordChangedAt,
        loginCount: admin.loginCount || 0
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

router.put('/profile', adminAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const adminId = req.admin.id;

    const updateData = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || null;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, select: '-password -refreshTokens' }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        profilePicture: admin.profilePicture,
        role: admin.role,
        permissions: admin.permissions,
        status: admin.status,
        twoFactorEnabled: admin.twoFactorEnabled,
        lastLogin: admin.lastLogin,
        lastLoginIP: admin.lastLoginIP,
        createdAt: admin.createdAt,
        passwordChangedAt: admin.passwordChangedAt,
        loginCount: admin.loginCount || 0
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// Profile Picture Upload Route
router.post('/profile/upload-picture', adminAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const adminId = req.admin.id;
    
    // Cloudinary provides secure_url through file.path
    const profilePictureUrl = req.file.path;

    // Update admin with new profile picture
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { profilePicture: profilePictureUrl },
      { new: true, select: '-password -refreshTokens' }
    );

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: profilePictureUrl,
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone,
        profilePicture: updatedAdmin.profilePicture,
        role: updatedAdmin.role,
        permissions: updatedAdmin.permissions,
        status: updatedAdmin.status,
        twoFactorEnabled: updatedAdmin.twoFactorEnabled,
        lastLogin: updatedAdmin.lastLogin,
        lastLoginIP: updatedAdmin.lastLoginIP,
        createdAt: updatedAdmin.createdAt,
        passwordChangedAt: updatedAdmin.passwordChangedAt,
        loginCount: updatedAdmin.loginCount || 0
      }
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    
    // Delete uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.error('Error deleting uploaded file after error:', deleteError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading profile picture'
    });
  }
});

router.put('/change-password', adminAuth, async (req, res) => {
  try {
    let { currentPassword, newPassword } = req.body || {};
    const adminId = req.admin.id;

    // Simple in-memory rate limit per admin (reset every 10 minutes)
    if (!global.__adminPwdChangeAttempts) global.__adminPwdChangeAttempts = new Map();
    const attemptInfo = global.__adminPwdChangeAttempts.get(adminId) || { count: 0, first: Date.now() };
    if (Date.now() - attemptInfo.first > 10 * 60 * 1000) {
      attemptInfo.count = 0; attemptInfo.first = Date.now();
    }
    attemptInfo.count += 1;
    global.__adminPwdChangeAttempts.set(adminId, attemptInfo);
    if (attemptInfo.count > 5) {
      return res.status(429).json({ success: false, message: 'Too many password change attempts. Please wait a few minutes.' });
    }

  // Keep originals for legacy/trailing-space scenarios
  const originalCurrent = (currentPassword || '').toString();
  const originalNew = (newPassword || '').toString();
  currentPassword = originalCurrent.trim();
  newPassword = originalNew.trim();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    // MUST fetch password hash explicitly if any upstream code ever excluded it
    const admin = await Admin.findById(adminId); // password included by default in this schema
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

  const storedHash = admin.password;
    const isBcrypt = typeof storedHash === 'string' && storedHash.startsWith('$2');

    // First verify current password (supports legacy clear-text storage migration if any)
    let currentValid = false;
    if (isBcrypt) {
      // Try trimmed first, then original (to cover cases where original had intentional spaces)
      currentValid = await admin.comparePassword(currentPassword) || (originalCurrent !== currentPassword && await admin.comparePassword(originalCurrent));
    } else if (storedHash === currentPassword || storedHash === originalCurrent) {
      currentValid = true;
    }

    if (!currentValid) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CHANGE-PASSWORD][MISMATCH-DETAIL]', {
          adminId,
          receivedCurrentPreview: originalCurrent.slice(0,3) + '...' + originalCurrent.slice(-2),
          receivedLength: originalCurrent.length,
          trimmedChanged: originalCurrent.length !== currentPassword.length,
          isBcrypt,
          attemptCount: attemptInfo.count
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT',
        ...(process.env.NODE_ENV !== 'production' ? {
          debug: {
            isBcrypt,
            receivedLength: originalCurrent.length,
            trimmedChanged: originalCurrent.length !== currentPassword.length,
            attemptCount: attemptInfo.count
          }
        } : {})
      });
    }

    // Prevent same password reuse (compare depending on legacy or bcrypt)
    let sameAsOld = false;
    if (isBcrypt) {
      sameAsOld = await admin.comparePassword(newPassword) || (originalNew !== newPassword && await admin.comparePassword(originalNew));
    } else if (storedHash === newPassword || storedHash === originalNew) {
      sameAsOld = true;
    }
    if (sameAsOld) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    // Update password (will hash via pre-save if we just assign plain)
    admin.password = newPassword;
    admin.passwordChangedAt = new Date();
    await admin.save();

    // If legacy plaintext migrated, note it
    const migrated = !isBcrypt;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CHANGE-PASSWORD][DEBUG]', {
        adminId,
        isBcrypt,
        migrated,
        attemptCount: attemptInfo.count
      });
    }

    return res.json({ success: true, message: 'Password changed successfully', migrated });
  } catch (error) {
    console.error('Change password error:', error);
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

// Gym Management Routes
router.get('/gyms', adminAuth, adminController.getAllGyms);  // Get all gyms for admin
router.get('/gyms/status/:status', adminAuth, adminController.getGymsByStatus);  // Get gyms by status for admin
router.get('/gyms/:id', adminAuth, adminController.getGymById);  // Admin-specific gym details

// Gym Approval Routes
router.patch('/gyms/:id/approve', adminAuth, adminController.approveGym);
router.patch('/gyms/:id/reject', adminAuth, adminController.rejectGym);
router.patch('/gyms/:id/revoke', adminAuth, adminController.revokeGym);
router.patch('/gyms/:id/reconsider', adminAuth, adminController.reconsiderGym);

// Delete gym route
router.delete('/gyms/:id', adminAuth, adminController.deleteGym);

// Notification Routes
router.get('/notifications', adminAuth, adminController.getNotifications);  // Get all notifications for admin
router.put('/notifications/:id/read', adminAuth, adminController.markNotificationRead);  // Mark a notification as read
router.put('/notifications/mark-all-read', adminAuth, adminController.markAllNotificationsRead);  // Mark all notifications as read

// Admin Management Routes (Super Admin only)
router.get('/admins', adminAuth, adminAuth.requireRole('super_admin'), async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password -refreshTokens -pendingTwoFACode');
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching admins' });
  }
});

router.post('/admins', adminAuth, adminAuth.requireRole('super_admin'), async (req, res) => {
  try {
    const { name, email, role, permissions } = req.body;
    
    const admin = new Admin({
      name,
      email,
      password: 'TempPassword123!', // Temporary password
      role,
      permissions,
      createdBy: req.admin.id
    });
    
    await admin.save();
    
    // Send welcome email with password reset link
    // Implementation here...
    
    res.json({ success: true, message: 'Admin created successfully', adminId: admin._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating admin' });
  }
});

// Security & Audit Routes
router.get('/security/logs', adminAuth, adminAuth.requirePermission('security_logs'), async (req, res) => {
  try {
    const { hours = 24, event } = req.query;
    const SecurityLogger = require('../utils/securityLogger');
    const logger = new SecurityLogger();
    
    const logs = await logger.getRecentLogs(parseInt(hours), event ? [event] : []);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching security logs' });
  }
});

router.get('/security/report', adminAuth, adminAuth.requirePermission('security_logs'), async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const SecurityLogger = require('../utils/securityLogger');
    const logger = new SecurityLogger();
    
    const report = await logger.generateSecurityReport(parseInt(hours));
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating security report' });
  }
});

// ============= DUPLICATE ROUTES REMOVED =============
// The duplicate profile routes have been removed to prevent conflicts.
// The comprehensive profile routes are defined earlier in this file (lines 226-312).

// 2FA Management
router.post('/enable-2fa', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    admin.twoFactorEnabled = true;
    await admin.save();
    
    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error enabling 2FA' });
  }
});

router.post('/disable-2fa', adminAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const admin = await Admin.findById(req.admin.id);
    
    // Verify password for security
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Password verification required' });
    }
    
    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    await admin.save();
    
    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error disabling 2FA' });
  }
});

// Admin Settings Management
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('settings preferences notifications');
    
    const defaultSettings = {
      emailNotifications: true,
      smsNotifications: true,
      autoLogoutTime: 60,
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    };

    res.json({
      success: true,
      settings: admin.settings || defaultSettings,
      preferences: admin.preferences || {},
      notifications: admin.notifications || {}
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

router.put('/settings', adminAuth, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, autoLogoutTime, theme, language, timezone } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin.settings) admin.settings = {};

    // Update settings
    if (emailNotifications !== undefined) admin.settings.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) admin.settings.smsNotifications = smsNotifications;
    if (autoLogoutTime !== undefined) admin.settings.autoLogoutTime = parseInt(autoLogoutTime);
    if (theme !== undefined) admin.settings.theme = theme;
    if (language !== undefined) admin.settings.language = language;
    if (timezone !== undefined) admin.settings.timezone = timezone;

    admin.markModified('settings');
    await admin.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: admin.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
});

// Activity Log
router.get('/activity-log', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const admin = await Admin.findById(req.admin.id);

    // Generate sample activity log (you can implement actual logging)
    const activities = [
      {
        action: 'Profile viewed',
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'profile'
      },
      {
        action: 'Dashboard accessed',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'navigation'
      },
      {
        action: 'Settings updated',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'settings'
      }
    ];

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedActivities = activities.slice(startIndex, endIndex);

    res.json({
      success: true,
      activities: paginatedActivities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(activities.length / limit),
        totalItems: activities.length,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ success: false, message: 'Error fetching activity log' });
  }
});

// Session Management
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    
    // Generate sample session data (you can implement actual session tracking)
    const sessions = [
      {
        id: 'current',
        device: 'Desktop - Chrome',
        location: 'Current Session',
        ip: req.ip,
        lastActive: new Date(),
        isCurrent: true
      },
      {
        id: 'session-2',
        device: 'Mobile - Safari',
        location: 'Previous Session',
        ip: '192.168.1.100',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isCurrent: false
      }
    ];

    res.json({
      success: true,
      sessions: sessions,
      currentSessionId: 'current'
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Error fetching sessions' });
  }
});

router.delete('/sessions/:sessionId', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (sessionId === 'current') {
      return res.status(400).json({ success: false, message: 'Cannot terminate current session' });
    }

    // Here you would implement actual session termination
    console.log(`Terminating session: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ success: false, message: 'Error terminating session' });
  }
});

// ========== COMMUNICATION & SUPPORT ROUTES ==========

// Support ticket management
router.get('/support/stats', adminAuth, communicationController.getSupportStats);
router.get('/support/tickets', adminAuth, communicationController.getSupportTickets);
router.get('/support/tickets/:ticketId', adminAuth, communicationController.getTicketDetails);
router.post('/support/tickets/:ticketId/reply', adminAuth, communicationController.replyToTicket);
router.put('/support/tickets/:ticketId/status', adminAuth, communicationController.updateTicketStatus);

// Grievance management
router.get('/grievances', adminAuth, communicationController.getGrievances);
router.post('/grievances/:ticketId/escalate', adminAuth, communicationController.escalateGrievance);

// Communication channels
router.post('/communication/bulk-notification', adminAuth, communicationController.sendBulkNotification);
router.post('/communication/direct-message', adminAuth, communicationController.sendDirectMessage);

// Gym Admin Communication Routes
router.get('/support/gym-admin-communications', adminAuth, communicationController.getGymAdminCommunications);
router.post('/communication/notify-gym-admin', adminAuth, communicationController.notifyGymAdmin);
router.post('/communication/send-to-gym', adminAuth, communicationController.sendMessageToGym);
router.get('/communication/history/:gymId', adminAuth, communicationController.getCommunicationHistory);
router.post('/communication/receive-gym-message', communicationController.receiveGymAdminMessage); // Public route for gym admins

// Enhanced notification management with deduplication
router.get('/notifications/admin', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all', read = 'all' } = req.query;
    const adminId = req.admin.id;

    const filter = {
      $or: [
        { recipient: adminId, recipientType: 'Admin' },
        { type: { $in: ['system', 'escalation', 'high-priority'] } }
      ]
    };

    if (type !== 'all') filter.type = type;
    if (read !== 'all') filter.read = read === 'true';

    const skip = (page - 1) * limit;

    // Deduplicate notifications by grouping similar ones
    const notifications = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            type: '$type',
            title: '$title',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          latestNotification: { $first: '$$ROOT' },
          notifications: { $push: '$$ROOT' }
        }
      },
      { $sort: { 'latestNotification.createdAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Format notifications for frontend
    const formattedNotifications = notifications.map(group => ({
      ...group.latestNotification,
      count: group.count,
      isGrouped: group.count > 1,
      groupedNotifications: group.count > 1 ? group.notifications : []
    }));

    const totalNotifications = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, read: false });

    res.json({
      success: true,
      notifications: formattedNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalItems: totalNotifications,
        itemsPerPage: parseInt(limit)
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Mark notifications as read (bulk)
router.put('/notifications/mark-read', adminAuth, async (req, res) => {
  try {
    const { notificationIds = [], markAll = false } = req.body;
    const adminId = req.admin.id;

    let updateFilter = {};

    if (markAll) {
      updateFilter = {
        $or: [
          { recipient: adminId, recipientType: 'Admin' },
          { type: { $in: ['system', 'escalation', 'high-priority'] } }
        ],
        read: false
      };
    } else if (notificationIds.length > 0) {
      updateFilter = {
        _id: { $in: notificationIds },
        read: false
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'No notifications specified to mark as read'
      });
    }

    const result = await Notification.updateMany(
      updateFilter,
      { 
        $set: { 
          read: true, 
          readAt: new Date() 
        } 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Error updating notifications' });
  }
});

// Create admin broadcast notification
router.post('/notifications/broadcast', adminAuth, async (req, res) => {
  try {
    const { title, message, recipients, priority = 'medium', channels = ['notification'] } = req.body;
    const adminId = req.admin.id;

    // Validate input
    if (!title || !message || !recipients) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and recipients are required'
      });
    }

    // Use communication controller for sending
    req.body.sendVia = channels;
    await communicationController.sendBulkNotification(req, res);

  } catch (error) {
    console.error('Error creating broadcast notification:', error);
    res.status(500).json({ success: false, message: 'Error sending broadcast' });
  }
});

// Session Management Routes
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('refreshTokens');
    const activeSessions = admin.refreshTokens || [];
    
    const sessionsWithMetadata = activeSessions.map((token, index) => ({
      id: index,
      device: 'Unknown Device',
      location: 'Unknown Location',
      lastActivity: new Date(),
      current: index === 0, // Assume first token is current session
      ipAddress: 'Unknown IP'
    }));
    
    res.json({ 
      success: true, 
      sessions: sessionsWithMetadata,
      totalSessions: sessionsWithMetadata.length 
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, message: 'Error fetching sessions' });
  }
});

router.delete('/sessions/:sessionId', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const admin = await Admin.findById(req.admin.id);
    
    if (admin.refreshTokens && admin.refreshTokens.length > parseInt(sessionId)) {
      admin.refreshTokens.splice(parseInt(sessionId), 1);
      await admin.save();
      
      res.json({ success: true, message: 'Session terminated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Session not found' });
    }
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ success: false, message: 'Error terminating session' });
  }
});

router.delete('/sessions/all', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    admin.refreshTokens = []; // Clear all refresh tokens
    await admin.save();
    
    res.json({ success: true, message: 'All sessions terminated successfully' });
  } catch (error) {
    console.error('Error terminating all sessions:', error);
    res.status(500).json({ success: false, message: 'Error terminating all sessions' });
  }
});

// Data Export Routes
router.get('/export/profile', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password -refreshTokens -twoFactorSecret');
    
    const exportData = {
      profile: admin,
      exportDate: new Date(),
      exportType: 'profile_data'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-profile-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting profile:', error);
    res.status(500).json({ success: false, message: 'Error exporting profile data' });
  }
});

router.get('/export/activity', adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const SecurityLogger = require('../utils/securityLogger');
    const logger = new SecurityLogger();
    
    const logs = await logger.getRecentLogs(parseInt(days) * 24, []);
    
    const exportData = {
      activityLogs: logs,
      exportDate: new Date(),
      exportType: 'activity_data',
      timeRange: `${days} days`
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-activity-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting activity:', error);
    res.status(500).json({ success: false, message: 'Error exporting activity data' });
  }
});

router.get('/export/full', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password -refreshTokens -twoFactorSecret');
    
    // Get activity logs
    const SecurityLogger = require('../utils/securityLogger');
    const logger = new SecurityLogger();
    const logs = await logger.getRecentLogs(30 * 24, []);
    
    // Get notifications
    const notifications = await Notification.find({ adminId: req.admin.id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    const exportData = {
      profile: admin,
      activityLogs: logs,
      notifications: notifications,
      exportDate: new Date(),
      exportType: 'full_data'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-full-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting full data:', error);
    res.status(500).json({ success: false, message: 'Error exporting full data' });
  }
});

module.exports = router;
