const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Gym = require('../models/gym');
const LoginAttempt = require('../models/LoginAttempt');
const SecuritySettings = require('../models/SecuritySettings');
const authenticateGymToken = require('../middleware/gymadminAuth');
const router = express.Router();

// ===== TEST ENDPOINTS =====

// Test endpoint to check if routes are working
router.get('/test', (req, res) => {
  console.log('🧪 Security routes test endpoint hit');
  res.json({ success: true, message: 'Security routes are working!' });
});

// Test endpoint with auth
router.get('/test-auth', authenticateGymToken, (req, res) => {
  console.log('🔐 Security routes authenticated test endpoint hit');
  console.log('Admin ID:', req.admin?.id);
  res.json({ 
    success: true, 
    message: 'Authenticated security routes are working!',
    adminId: req.admin?.id 
  });
});

// ===== TWO-FACTOR AUTHENTICATION ROUTES =====

// Generate 2FA secret and QR code
router.post('/generate-2fa-secret', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const gym = await Gym.findById(gymId);
    
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Gym-Wale (${gym.gymName})`,
      issuer: 'Gym-Wale',
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Store temp secret in gym document (don't enable 2FA yet)
    gym.twoFactorTempSecret = secret.base32;
    await gym.save();

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCode
      }
    });
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    res.status(500).json({ success: false, message: 'Failed to generate 2FA secret' });
  }
});

// Enable email-based 2FA
router.post('/enable-email-2fa', authenticateGymToken, async (req, res) => {
  console.log('📧 Enable email 2FA endpoint hit');
  console.log('Admin ID:', req.admin?.id);
  
  try {
    const gymId = req.admin.id;
    const gym = await Gym.findById(gymId);

    if (!gym) {
      console.log('❌ Gym not found for ID:', gymId);
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    console.log('🏋️ Found gym:', gym.gymName);

    // Enable 2FA
    gym.twoFactorEnabled = true;
    
    // Clear any old app-based 2FA data (if migrating from old system)
    gym.twoFactorSecret = undefined;
    gym.twoFactorTempSecret = undefined;
    gym.twoFactorBackupCodes = [];
    
    // Clear any existing OTP
    gym.twoFactorOTP = undefined;
    gym.twoFactorOTPExpiry = undefined;

    await gym.save();
    console.log('✅ Email 2FA enabled successfully for gym:', gym.gymName);

    res.json({
      success: true,
      message: 'Email-based two-factor authentication enabled successfully'
    });
  } catch (error) {
    console.error('❌ Error enabling email 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
});

// Disable 2FA
router.post('/disable-2fa', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const gym = await Gym.findById(gymId);

    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    // Disable 2FA and clear all related data
    gym.twoFactorEnabled = false;
    gym.twoFactorSecret = undefined;
    gym.twoFactorTempSecret = undefined;
    gym.twoFactorBackupCodes = [];
    gym.twoFactorOTP = undefined;
    gym.twoFactorOTPExpiry = undefined;

    await gym.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// Disable 2FA
router.post('/disable-2fa', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const gym = await Gym.findById(gymId);
    
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    // Disable 2FA and clear all related data
    gym.twoFactorEnabled = false;
    gym.twoFactorSecret = undefined;
    gym.twoFactorTempSecret = undefined;
    gym.twoFactorBackupCodes = [];
    gym.twoFactorOTP = undefined;
    gym.twoFactorOTPExpiry = undefined;

    await gym.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// Verify 2FA email OTP during login
router.post('/verify-2fa-email', async (req, res) => {
  try {
    const { tempToken, code, email } = req.body;
    
    // Verify temporary token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.admin.temp) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const gymId = decoded.admin.id;
    const gym = await Gym.findById(gymId);
    
    if (!gym || gym.email !== email) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    // Check if OTP exists and not expired
    if (!gym.twoFactorOTP || !gym.twoFactorOTPExpiry) {
      return res.status(401).json({ success: false, message: 'No verification code found. Please request a new one.' });
    }
    
    if (new Date() > gym.twoFactorOTPExpiry) {
      // Clear expired OTP
      gym.twoFactorOTP = undefined;
      gym.twoFactorOTPExpiry = undefined;
      await gym.save();
      return res.status(401).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }
    
    // Verify OTP
    if (gym.twoFactorOTP !== code) {
      return res.status(401).json({ success: false, message: 'Invalid verification code' });
    }
    
    // Clear used OTP
    gym.twoFactorOTP = undefined;
    gym.twoFactorOTPExpiry = undefined;
    
    // Generate new permanent token
    const payload = {
      admin: {
        id: gym.id,
        email: gym.email
      }
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Update lastLogin field
    gym.lastLogin = new Date();
    await gym.save();
    
    res.json({
      success: true,
      message: '2FA verification successful',
      token,
      gymId: gym.id
    });
  } catch (error) {
    console.error('Error verifying 2FA email:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
  }
});

// Resend 2FA email OTP
router.post('/resend-2fa-email', async (req, res) => {
  try {
    const { tempToken, email } = req.body;
    
    // Verify temporary token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.admin.temp) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const gymId = decoded.admin.id;
    const gym = await Gym.findById(gymId);
    
    if (!gym || gym.email !== email) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Save new OTP to database
    gym.twoFactorOTP = otp;
    gym.twoFactorOTPExpiry = otpExpiry;
    await gym.save();
    
    // Send OTP via email (use the same function from gymController)
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Two-Factor Authentication Code - Gym Admin Login',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Security Verification</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #333; margin-top: 0;">Two-Factor Authentication</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Hello from <strong>${gym.gymName || 'Gym Admin'}</strong>,
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Here's your new verification code for login:
            </p>
            
            <div style="background: white; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
              <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              <strong>⏰ This code will expire in 10 minutes.</strong>
            </p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'New verification code sent to your email'
    });
  } catch (error) {
    console.error('Error resending 2FA email:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    res.status(500).json({ success: false, message: 'Failed to resend verification code' });
  }
});

// Verify 2FA code during login (keep for backward compatibility)
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code, email } = req.body;
    
    // Verify temporary token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.admin.temp) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const gymId = decoded.admin.id;
    const gym = await Gym.findById(gymId);
    
    if (!gym || gym.email !== email) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    // Check if this is email-based 2FA
    if (gym.twoFactorOTP && gym.twoFactorOTPExpiry) {
      // Redirect to email verification
      return res.status(400).json({ 
        success: false, 
        message: 'Please use email verification for 2FA',
        useEmailVerification: true 
      });
    }
    
    // Legacy app-based verification (kept for compatibility)
    const verified = speakeasy.totp.verify({
      secret: gym.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });
    
    if (!verified) {
      // Check if it's a backup code
      let isBackupCode = false;
      if (gym.twoFactorBackupCodes && gym.twoFactorBackupCodes.length > 0) {
        for (let i = 0; i < gym.twoFactorBackupCodes.length; i++) {
          const isMatch = await bcrypt.compare(code, gym.twoFactorBackupCodes[i]);
          if (isMatch) {
            // Remove used backup code
            gym.twoFactorBackupCodes.splice(i, 1);
            await gym.save();
            isBackupCode = true;
            break;
          }
        }
      }
      
      if (!isBackupCode) {
        return res.status(401).json({ success: false, message: 'Invalid verification code' });
      }
    }
    
    // Generate new permanent token
    const payload = {
      admin: {
        id: gym.id,
        email: gym.email
      }
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Update lastLogin field
    gym.lastLogin = new Date();
    await gym.save();
    
    res.json({
      success: true,
      message: '2FA verification successful',
      token,
      gymId: gym.id
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
  }
});

// ===== TWO-FACTOR AUTHENTICATION TOGGLE ROUTES =====

// Toggle 2FA (enable/disable)
router.post('/toggle-2fa', authenticateGymToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    const gymId = req.admin.id;
    
    let settings = await SecuritySettings.findOne({ gymId });
    if (!settings) {
      settings = new SecuritySettings({ gymId });
    }
    
    // Set the twoFactorEnabled field
    settings.twoFactorEnabled = enabled;
    
    await settings.save();

    console.log(`🔐 2FA ${enabled ? 'enabled' : 'disabled'} for gym: ${gymId}`);

    res.json({ 
      success: true, 
      message: `Two-Factor Authentication ${enabled ? 'enabled' : 'disabled'}`,
      twoFactorEnabled: enabled
    });
  } catch (error) {
    console.error('Error toggling 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to update 2FA setting' });
  }
});

// Get 2FA status from security settings
router.get('/2fa-status', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    let settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      settings = new SecuritySettings({ gymId });
      await settings.save();
    }

    // Use the actual value from database, default to false if not set
    const twoFactorEnabled = settings.twoFactorEnabled === true;

    res.json({
      success: true,
      data: {
        enabled: twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Error getting 2FA status from security settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get 2FA status' });
  }
});

// ===== LOGIN NOTIFICATIONS ROUTES =====

// Toggle login notifications
router.post('/toggle-login-notifications', authenticateGymToken, async (req, res) => {
  try {
    const { enabled, preferences = {} } = req.body;
    const gymId = req.admin.id;
    
    console.log('🔔 Toggle login notifications request:', { gymId, enabled, preferences });
    
    let settings = await SecuritySettings.findOne({ gymId });
    if (!settings) {
      console.log('🔔 Creating new SecuritySettings for gym:', gymId);
      settings = new SecuritySettings({ 
        gymId,
        loginNotifications: {
          enabled: false,
          preferences: {
            email: true,
            browser: true,
            suspiciousOnly: false
          }
        }
      });
    }
    
    // Update login notifications settings
    settings.loginNotifications.enabled = enabled;
    
    // Update preferences if provided
    if (preferences.email !== undefined) {
      settings.loginNotifications.preferences.email = preferences.email;
    }
    if (preferences.browser !== undefined) {
      settings.loginNotifications.preferences.browser = preferences.browser;
    }
    if (preferences.suspiciousOnly !== undefined) {
      settings.loginNotifications.preferences.suspiciousOnly = preferences.suspiciousOnly;
    }
    
    await settings.save();
    
    console.log('🔔 Login notifications updated:', {
      gymId,
      enabled,
      preferences: settings.loginNotifications.preferences
    });

    res.json({ 
      success: true, 
      message: `Login notifications ${enabled ? 'enabled' : 'disabled'}`,
      settings: {
        enabled: settings.loginNotifications.enabled,
        preferences: settings.loginNotifications.preferences
      }
    });
  } catch (error) {
    console.error('Error toggling login notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to update login notifications' });
  }
});

// Get/Set notification preferences
router.get('/login-notification-status', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      return res.json({ 
        success: true, 
        enabled: false,
        preferences: {
          email: true,
          browser: true,
          suspiciousOnly: false
        }
      });
    }
    
    res.json({ 
      success: true, 
      enabled: settings.loginNotifications.enabled,
      preferences: settings.loginNotifications.preferences
    });
  } catch (error) {
    console.error('Error getting login notification status:', error);
    res.status(500).json({ success: false, message: 'Failed to get login notification status' });
  }
});

// Test login notification email (debugging route)
router.post('/test-login-notification', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const gym = await Gym.findById(gymId);
    
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    console.log('🧪 Testing login notification email for gym:', gym.gymName);
    
    // Check if SecuritySettings exist and notifications are enabled
    const settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings || !settings.loginNotifications.enabled) {
      return res.json({ 
        success: false, 
        message: 'Login notifications are not enabled for this gym',
        currentSettings: settings ? settings.loginNotifications : null
      });
    }
    
    // Create a test login attempt
    const testLoginAttempt = {
      success: true,
      timestamp: new Date(),
      ipAddress: req.ip || '127.0.0.1',
      device: 'Test Device',
      browser: 'Test Browser',
      location: {
        city: 'Test City',
        region: 'Test Region',
        country: 'Test Country'
      },
      suspicious: false
    };
    
    // Import sendLoginNotification function (we need to make it available)
    const sendEmail = require('../utils/sendEmail');
    
    // Send test email
    const subject = 'Test: Successful Login to Your Gym Account';
    const message = `
      TEST LOGIN NOTIFICATION for ${gym.gymName}
      
      Time: ${testLoginAttempt.timestamp.toLocaleString()}
      IP Address: ${testLoginAttempt.ipAddress}
      Device: ${testLoginAttempt.device}
      Browser: ${testLoginAttempt.browser}
      Location: ${testLoginAttempt.location.city}, ${testLoginAttempt.location.region}, ${testLoginAttempt.location.country}
      
      This is a test email to verify login notifications are working.
    `;
    
    if (settings.loginNotifications.preferences.email) {
      await sendEmail(gym.email, subject, message);
      console.log('✅ Test login notification email sent to:', gym.email);
      
      res.json({ 
        success: true, 
        message: `Test login notification sent to ${gym.email}`,
        emailSent: true,
        settings: settings.loginNotifications
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Email notifications are disabled in preferences',
        emailSent: false,
        settings: settings.loginNotifications
      });
    }
    
  } catch (error) {
    console.error('Error testing login notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Check email configuration
router.get('/check-email-config', authenticateGymToken, async (req, res) => {
  try {
    const hasEmailUser = !!process.env.EMAIL_USER;
    const hasEmailPass = !!process.env.EMAIL_PASS;
    const configured = hasEmailUser && hasEmailPass;
    
    console.log('📧 Email configuration check:', {
      hasEmailUser,
      hasEmailPass,
      configured,
      emailUser: process.env.EMAIL_USER
    });
    
    res.json({
      success: true,
      configured,
      details: {
        hasEmailUser,
        hasEmailPass,
        emailUser: process.env.EMAIL_USER || 'Not set'
      }
    });
  } catch (error) {
    console.error('Error checking email configuration:', error);
    res.status(500).json({ success: false, message: 'Failed to check email configuration' });
  }
});

// Get/Set notification preferences
router.get('/notification-preferences', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    let settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      settings = new SecuritySettings({ gymId });
      await settings.save();
    }

    res.json({
      success: true,
      data: settings.loginNotifications.preferences
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification preferences' });
  }
});

router.post('/notification-preferences', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const preferences = req.body;
    
    let settings = await SecuritySettings.findOne({ gymId });
    if (!settings) {
      settings = new SecuritySettings({ gymId });
    }
    
    settings.loginNotifications.preferences = preferences;
    await settings.save();

    res.json({ success: true, message: 'Notification preferences saved' });
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to save notification preferences' });
  }
});

// Get recent login attempts
router.get('/recent-logins', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    
    const recentLogins = await LoginAttempt.find({ gymId })
      .sort({ timestamp: -1 })
      .limit(20)
      .select('-gymId');

    res.json({
      success: true,
      data: recentLogins
    });
  } catch (error) {
    console.error('Error getting recent logins:', error);
    res.status(500).json({ success: false, message: 'Failed to get recent login attempts' });
  }
});

// Report suspicious activity
router.post('/report-suspicious', authenticateGymToken, async (req, res) => {
  try {
    const { loginId } = req.body;
    
    await LoginAttempt.findByIdAndUpdate(loginId, {
      reported: true,
      reportedAt: new Date()
    });

    // Here you could add logic to send alerts to admins, block IPs, etc.
    
    res.json({ success: true, message: 'Suspicious activity reported' });
  } catch (error) {
    console.error('Error reporting suspicious activity:', error);
    res.status(500).json({ success: false, message: 'Failed to report suspicious activity' });
  }
});

// Get notification status
router.get('/notification-status', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    let settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      settings = new SecuritySettings({ gymId });
      await settings.save();
    }

    res.json({
      success: true,
      data: {
        enabled: settings.loginNotifications.enabled
      }
    });
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification status' });
  }
});

// ===== SESSION TIMEOUT ROUTES =====

// Get session timeout settings
router.get('/session-timeout', authenticateGymToken, async (req, res) => {
  try {
    const gymId = req.admin.id;
    let settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      settings = new SecuritySettings({ gymId });
      await settings.save();
    }

    res.json({
      success: true,
      data: {
        timeoutMinutes: settings.sessionTimeout.timeoutMinutes,
        enabled: settings.sessionTimeout.enabled
      }
    });
  } catch (error) {
    console.error('Error getting session timeout settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get session timeout settings' });
  }
});

// Update session timeout settings
router.post('/session-timeout', authenticateGymToken, async (req, res) => {
  try {
    const { timeoutMinutes, enabled } = req.body;
    const gymId = req.admin.id;
    
    let settings = await SecuritySettings.findOne({ gymId });
    if (!settings) {
      settings = new SecuritySettings({ gymId });
    }
    
    settings.sessionTimeout.timeoutMinutes = timeoutMinutes;
    settings.sessionTimeout.enabled = enabled;
    await settings.save();

    res.json({ success: true, message: 'Session timeout settings updated' });
  } catch (error) {
    console.error('Error updating session timeout settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update session timeout settings' });
  }
});

// Extend session
router.post('/extend-session', authenticateGymToken, async (req, res) => {
  try {
    // In a real implementation, you might update the JWT token expiry
    // or store session extension info in the database
    
    res.json({ 
      success: true, 
      message: 'Session extended',
      extendedUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    });
  } catch (error) {
    console.error('Error extending session:', error);
    res.status(500).json({ success: false, message: 'Failed to extend session' });
  }
});

module.exports = router;
