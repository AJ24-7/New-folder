
const mongoose = require('mongoose');
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const TrialBooking = require('../models/TrialBooking');
const LoginAttempt = require('../models/LoginAttempt');
const SecuritySettings = require('../models/SecuritySettings');
const sendEmail = require('../utils/sendEmail');
const adminNotificationService = require('../services/adminNotificationService');
const EmailService = require('../services/emailService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Added jsonwebtoken
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');

// Geocoding function to get lat/lng from address
const geocodeAddress = async (address, city, state, pincode) => {
  try {
    const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');
    const encodedAddress = encodeURIComponent(fullAddress);
    
    
    // Using Nominatim (free geocoding service)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=in`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Geocoding failed:', error);
    return null;
  }
};

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email with enhanced HTML template
const sendOTPEmail = async (email, otp, gymName = 'Gym Admin') => {
    try {
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
            subject: 'Password Reset OTP - Gym Admin',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #2c4ee8ff 0%, #871df2ff 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;"><i class="fas fa-key"></i> Password Reset Request</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Hello from <strong>${gymName}</strong>,
                        </p>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            We received a request to reset your password. To complete the password reset process, please enter the verification code below:
                        </p>
                        
                        <div style="background: white; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                            <h1 style="color: #28a745; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            <strong><i class="fas fa-clock"></i> This code will expire in 10 minutes.</strong>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            If you didn't request a password reset, please ignore this email and your password will remain unchanged. For security, consider changing your password if you didn't make this request.
                        </p>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your OTP.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return { success: false, error: error.message };
    }
};

// Send 2FA OTP via email
const send2FAEmail = async (email, otp, gymName) => {
    try {
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
                    <div style="background: linear-gradient(135deg, #2c4ee8ff 0%, #871df2ff 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;"><i class="fas fa-lock"></i> Security Verification</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <h2 style="color: #333; margin-top: 0;">Two-Factor Authentication</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Hello from <strong>${gymName || 'Gym Admin'}</strong>,
                        </p>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Someone is trying to log in to your gym admin account. To complete the login process, please enter the verification code below:
                        </p>
                        
                        <div style="background: white; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                            <h1 style="color: #007bff; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            <strong><i class="fas fa-clock"></i> This code will expire in 10 minutes.</strong>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            If you didn't request this login, please ignore this email and consider changing your password.
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending 2FA email:', error);
        return { success: false, error: error.message };
    }
};


// Unified Gym/Admin Login (use for both gym and admin dashboard)
exports.login = async (req, res) => {
  const { 
    email, 
    password, 
    twoFactorCode, 
    deviceInfo, 
    locationInfo, 
    deviceFingerprint, 
    userAgent, 
    timezone 
  } = req.body;
  
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
  const requestUserAgent = userAgent || req.get('User-Agent') || 'Unknown';
  
  console.log('🔐 Login attempt for email:', email);
  
  try {
    // Find gym by email - FIRST (case-insensitive)
    const gym = await Gym.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).select('+password');
    
    console.log('📋 Gym found:', gym ? `Yes - ${gym.gymName}` : 'No');
    
    if (!gym) {
      console.log('❌ No gym found with email:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials or gym not found.' });
    }
        
    // Check password - SECOND (fail fast if password is wrong)
    console.log('🔑 Checking password...');
    const isMatch = await bcrypt.compare(password, gym.password);
    console.log('🔑 Password match:', isMatch);
    
    if (!isMatch) {
      // Record failed attempt asynchronously (don't wait)
      setImmediate(() => {
        recordLoginAttempt(gym._id, false, 'Invalid password', ipAddress, requestUserAgent, deviceInfo, locationInfo).catch(console.error);
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials or gym not found.' });
    }
    
    // Check approval status - THIRD
    console.log('✅ Gym status:', gym.status);
    if (gym.status !== 'approved') {
      setImmediate(() => {
        recordLoginAttempt(gym._id, false, `Account status: ${gym.status}`, ipAddress, requestUserAgent, deviceInfo, locationInfo).catch(console.error);
      });
      if (gym.status === 'pending') {
        return res.status(403).json({ success: false, message: 'Your gym registration is pending approval. Please wait for the admin to review your application.' });
      } else if (gym.status === 'rejected') {
        return res.status(403).json({ success: false, message: 'Your gym registration has been rejected. Please contact support for more information.' });
      } else {
        return res.status(403).json({ success: false, message: 'Your gym registration is not approved.' });
      }
    }
    
    // Check if 2FA is enabled - FOURTH
    console.log('🔒 Checking 2FA settings...');
    let securitySettings = await SecuritySettings.findOne({ gymId: gym._id }).lean();
    console.log('🔒 Security settings found:', !!securitySettings);
    
    if (!securitySettings) {
      // Create default settings asynchronously (don't wait)
      setImmediate(() => {
        new SecuritySettings({ 
          gymId: gym._id,
          twoFactorEnabled: false,
          loginNotifications: { enabled: false }
        }).save().catch(console.error);
      });
      securitySettings = { twoFactorEnabled: false };
    }

    const twoFactorRequired = securitySettings.twoFactorEnabled;
    console.log('🔒 2FA required:', twoFactorRequired);
    
    if (twoFactorRequired) {
      if (!twoFactorCode) {
        // Generate OTP and send via email
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        
        // Save OTP to database
        gym.twoFactorOTP = otp;
        gym.twoFactorOTPExpiry = otpExpiry;
        await gym.save();
        
        // Send OTP via email asynchronously
        send2FAEmail(email, otp, gym.gymName).catch(err => {
          console.error('Error sending 2FA email:', err);
        });
        
        // Generate temporary token for 2FA verification
        const tempPayload = {
          admin: {
            id: gym.id,
            email: gym.email,
            temp: true
          }
        };
        const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        return res.status(200).json({ 
          success: true, 
          requires2FA: true,
          tempToken,
          message: 'Verification code sent to your email' 
        });
      }
      
      if (twoFactorCode) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please use the email verification process' 
        });
      }
    }
        
    // Create and assign a token with dynamic expiration
    console.log('🎫 Creating JWT token...');
    
    // Get session timeout settings
    let sessionTimeout = 60; // Default 60 minutes
    try {
      const settings = await SecuritySettings.findOne({ gymId: gym._id });
      if (settings?.sessionTimeout?.enabled && settings.sessionTimeout.timeoutMinutes) {
        sessionTimeout = settings.sessionTimeout.timeoutMinutes;
      }
    } catch (err) {
      console.log('⚠️ Could not fetch session timeout, using default:', err.message);
    }
    
    console.log('⏱️ JWT Token expiration set to:', sessionTimeout, 'minutes');
    
    const payload = {
      admin: {
        id: gym.id,
        email: gym.email
      }
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${sessionTimeout}m` });
    console.log('🎫 Token created successfully');
    
    // Update lastLogin and record attempt asynchronously (don't wait)
    setImmediate(() => {
      gym.lastLogin = new Date();
      gym.save().catch(console.error);
      
      recordLoginAttempt(gym._id, true, null, ipAddress, requestUserAgent, deviceInfo, locationInfo).catch(console.error);
      
      // Send login notification if enabled (async)
      if (securitySettings.loginNotifications && securitySettings.loginNotifications.enabled) {
        sendLoginNotificationAsync(gym, ipAddress, requestUserAgent, deviceInfo, locationInfo).catch(console.error);
      }
    });
    
    console.log('✅ Login successful for:', email);
    
    // Prepare gym/admin data for response
    const adminData = {
      id: gym.id,
      name: gym.gymName,
      email: gym.email,
      role: 'gym_admin',
      gymId: gym.id
    };
    
    // Calculate token expiration timestamp
    const tokenExpiresAt = new Date(Date.now() + sessionTimeout * 60 * 1000);
    
    res.status(200).json({
      success: true,
      message: 'Login successful! Redirecting...',
      token,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
      tokenExpiresInMinutes: sessionTimeout,
      gymId: gym.id,
      admin: adminData
    });
  } catch (error) {
    console.error('❌ Unified gym login error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// Helper function to record login attempt (optimized, async)
const recordLoginAttempt = async (gymId, success, failureReason, ipAddress, requestUserAgent, deviceInfo, locationInfo) => {
  try {
    const formattedDeviceInfo = formatDeviceInfo(deviceInfo, requestUserAgent);
    const formattedLocationInfo = formatLocationInfo(locationInfo, ipAddress);
    
    const loginAttempt = new LoginAttempt({
      gymId,
      ipAddress,
      userAgent: requestUserAgent,
      success,
      failureReason,
      device: formattedDeviceInfo.device,
      browser: formattedDeviceInfo.browser,
      suspicious: false, // Skip suspicious check for speed
      location: formattedLocationInfo || { city: 'Unknown', country: 'Unknown', coordinates: { lat: 0, lng: 0 } },
      deviceDetails: formattedDeviceInfo
    });
    await loginAttempt.save();
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
};

// Async login notification sender
const sendLoginNotificationAsync = async (gym, ipAddress, requestUserAgent, deviceInfo, locationInfo) => {
  try {
    const formattedDeviceInfo = formatDeviceInfo(deviceInfo, requestUserAgent);
    const formattedLocationInfo = formatLocationInfo(locationInfo, ipAddress);
    
    const locationData = formattedLocationInfo || { city: 'Unknown', country: 'Unknown', coordinates: { lat: 0, lng: 0 } };
    
    const loginDetails = {
      timestamp: new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      ip: ipAddress,
      device: formattedDeviceInfo.device,
      browser: formattedDeviceInfo.browser,
      os: formattedDeviceInfo.os,
      userAgent: formattedDeviceInfo.userAgent,
      screen: formattedDeviceInfo.screen,
      timezone: formattedDeviceInfo.timezone,
      location: locationData.location || `${locationData.city}, ${locationData.country}`,
      city: locationData.city,
      country: locationData.country,
      coordinates: locationData.coordinates,
      method: locationData.method || 'ip'
    };
    
    const emailService = new EmailService();
    await emailService.sendLoginAlert(
      gym.email, 
      gym.contactPerson || gym.gymName, 
      loginDetails
    );
  } catch (error) {
    console.error('Error sending login notification:', error);
  }
};

// Helper function to format device information properly
const formatDeviceInfo = (deviceInfo, userAgent) => {
  if (deviceInfo && typeof deviceInfo === 'object') {
    return {
      device: `${deviceInfo.os || 'Unknown'} - ${deviceInfo.browser || 'Unknown'}`,
      browser: deviceInfo.browser || extractBrowserInfo(userAgent),
      os: deviceInfo.os || 'Unknown',
      platform: deviceInfo.platform || 'Unknown',
      userAgent: deviceInfo.userAgent || userAgent,
      screen: deviceInfo.screen ? `${deviceInfo.screen.width}x${deviceInfo.screen.height}` : 'Unknown',
      language: deviceInfo.language || 'Unknown',
      timezone: deviceInfo.timezone || 'Unknown'
    };
  } else {
    return {
      device: extractDeviceInfo(userAgent),
      browser: extractBrowserInfo(userAgent),
      os: 'Unknown',
      platform: 'Unknown',
      userAgent: userAgent,
      screen: 'Unknown',
      language: 'Unknown',
      timezone: 'Unknown'
    };
  }
};

// Helper function to format location information properly
const formatLocationInfo = (locationInfo, ipAddress) => {
  if (locationInfo && typeof locationInfo === 'object') {
    const locationParts = [];
    
    const isValidLocation = (value) => {
      return value && 
             value !== 'Unknown' && 
             value !== 'Detecting...' && 
             value !== 'pending' && 
             !value.includes('Detecting');
    };
    
    if (isValidLocation(locationInfo.city)) {
      locationParts.push(locationInfo.city);
    }
    if (isValidLocation(locationInfo.region) && locationInfo.region !== locationInfo.city) {
      locationParts.push(locationInfo.region);
    }
    if (isValidLocation(locationInfo.country)) {
      locationParts.push(locationInfo.country);
    }

    return {
      location: locationParts.length > 0 ? locationParts.join(', ') : 'Unknown',
      city: isValidLocation(locationInfo.city) ? locationInfo.city : 'Unknown',
      country: isValidLocation(locationInfo.country) ? locationInfo.country : 'Unknown',
      region: isValidLocation(locationInfo.region) ? locationInfo.region : 'Unknown',
      coordinates: (locationInfo.latitude && locationInfo.longitude) 
        ? { lat: locationInfo.latitude, lng: locationInfo.longitude }
        : { lat: 0, lng: 0 },
      method: locationInfo.method || 'unknown',
      ipAddress: ipAddress
    };
  }
  return null;
};

// Token validation endpoint to check if user is already authenticated
exports.validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { gymId } = req.body;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.admin || !decoded.admin.id) {
      return res.status(401).json({ success: false, message: 'Invalid token structure' });
    }
    
    // Check if gym exists and is approved
    const gym = await Gym.findById(decoded.admin.id);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    if (gym.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Gym not approved' });
    }
    
    // Verify gymId matches
    if (gymId && gym.id !== gymId) {
      return res.status(401).json({ success: false, message: 'GymId mismatch' });
    }
    
    // Token is valid
    return res.status(200).json({ 
      success: true, 
      message: 'Token valid',
      gymId: gym.id,
      gymName: gym.gymName 
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    } else {
      return res.status(500).json({ success: false, message: 'Server error during validation' });
    }
  }
};

// Request Password Change OTP (moved from gymadminController)
exports.requestPasswordChangeOTP = async (req, res) => {
    const { email } = req.body;
    console.log('🔍 OTP Request - Email:', email);
    console.log('🔍 Database:', mongoose.connection.name);
    console.log('🔍 Collection:', mongoose.connection.collections.gyms ? 'gyms exists' : 'gyms NOT FOUND');
    
    try {
        // First, let's see all gyms in the database
        const allGyms = await Gym.find({}, 'email gymName').limit(5);
        console.log('📋 Sample gyms in database:', allGyms.map(g => ({ email: g.email, name: g.gymName })));
        
        // Case-insensitive email search
        const adminUser = await Gym.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') } 
        });
        
        if (!adminUser) {
            console.log('❌ No gym found for email:', email);
            return res.status(404).json({ success: false, message: 'No account found with this email address.' });
        }
        
        console.log('✅ Gym found:', adminUser.gymName, '| Email:', adminUser.email);
        
        // Generate and store OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        adminUser.passwordResetOTP = otp;
        adminUser.passwordResetOTPExpiry = otpExpiry;
        await adminUser.save();
        
        console.log('✅ OTP generated:', otp, '| Expires:', otpExpiry);
        
        // Send OTP via email with gym name
        const emailResult = await sendOTPEmail(adminUser.email, otp, adminUser.gymName || 'Gym Admin');
        
        if (emailResult.success) {
            console.log('✅ OTP email sent successfully to:', adminUser.email);
            res.json({ success: true, message: 'OTP sent to your email. Please check your inbox.', email: adminUser.email });
        } else {
            console.error('❌ Failed to send OTP email:', emailResult.error);
            res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
        }
    } catch (err) {
        console.error('❌ OTP request error:', err);
        res.status(500).json({ success: false, message: 'Server error during OTP generation.' });
    }
};

// Verify Password Change OTP (moved from gymadminController)
exports.verifyPasswordChangeOTP = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        console.error('Incomplete password change request', { email, otpProvided: !!otp, passwordProvided: !!newPassword });
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }
    // Password complexity check
    if (newPassword.length < 8) {
        console.warn('Password too short', { email, passwordLength: newPassword.length });
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }
    try {
        // Case-insensitive email search with OTP validation
        const adminUser = await Gym.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') },
            passwordResetOTP: otp,
            passwordResetOTPExpiry: { $gt: new Date() } 
        });
        if (!adminUser) {
            // More specific error checking (case-insensitive)
            const userWithEmail = await Gym.findOne({ 
                email: { $regex: new RegExp(`^${email}$`, 'i') } 
            });
            if (!userWithEmail) {
                return res.status(404).json({ success: false, message: 'No account found with this email.' });
            }
            const userWithOTP = await Gym.findOne({ 
                email: { $regex: new RegExp(`^${email}$`, 'i') },
                passwordResetOTP: otp 
            });
            if (userWithOTP && userWithOTP.passwordResetOTPExpiry < new Date()) {
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
            }
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }
        // Prevent using the same password
        const isOldPassword = await bcrypt.compare(newPassword, adminUser.password);
        if (isOldPassword) {
            return res.status(400).json({ success: false, message: 'New password cannot be the same as the old password.' });
        }
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        // Update password and clear OTP fields
        adminUser.password = hashedPassword;
        adminUser.passwordResetOTP = undefined;
        adminUser.passwordResetOTPExpiry = undefined;
        await adminUser.save();
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ success: false, message: 'Server error during password change.' });
    }
};

// Get Admin Profile (moved from gymadminController)
exports.getAdminProfile = async (req, res) => {
   
    try {
        if (!req.admin || !req.admin.id) {
            console.warn('Invalid admin object in request');
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const admin = await Gym.findById(req.admin.id).select('-password');
        if (!admin) {
            console.warn(`No admin found with ID: ${req.admin.id}`);
            return res.status(404).json({ message: 'Admin profile not found' });
        }
        const logoUrl = admin.logoUrl ? 
            (admin.logoUrl.startsWith('http') ? admin.logoUrl : 
                (admin.logoUrl.startsWith('uploads/') ? `/${admin.logoUrl}` : `/uploads/gym-logos/${admin.logoUrl}`)) : 
            null;
        const profileResponse = {
            gymName: admin.gymName || 'Gym Admin',
            email: admin.email,
            logoUrl: logoUrl,
            phone: admin.phone || '',
            address: admin.address || '',
            description: admin.description || ''
        };
        res.json(profileResponse);
    } catch (error) {
        console.error('Comprehensive error fetching admin profile:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
};

// Request OTP for Password Reset (moved from gymadminController)
exports.requestOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const gymAdmin = await Gym.findOne({ email });
    if (!gymAdmin) {
      return res.status(404).json({ message: 'Admin with this email not found.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    gymAdmin.passwordResetToken = otp; 
    gymAdmin.passwordResetExpires = Date.now() + 10 * 60 * 1000; 
    await gymAdmin.save();
    // Send OTP email
    const emailSubject = '🔐 Password Reset Code';
    const bodyHtml = `
      <p>Hello ${gymAdmin.contactPerson || gymAdmin.gymName},</p>
      <p>We received a request to reset the password for your admin account.</p>
      <p style="font-size:14px;margin-top:14px;">Use the One-Time Password (OTP) below to continue:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:18px 0 10px;color:#38bdf8;">${otp}</div>
      <p style="margin:0 0 14px;">This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email. Your account remains secure.</p>
    `;
    try {
      await sendEmail({
        to: gymAdmin.email,
        subject: emailSubject,
        title: 'Password Reset Verification',
        preheader: 'Your password reset security code',
        bodyHtml,
        action: {
          label: 'Reset Password',
          url: process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/login.html'
        }
      });
      res.status(200).json({ success: true, message: 'OTP sent to your email address. Please check your inbox (and spam folder).' });
    } catch (emailError) {
      console.error('[requestOtp] Error sending OTP email:', emailError.message, emailError.stack);
      res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later or contact support if the issue persists.' });
    }
  } catch (error) {
    console.error('[requestOtp] An error occurred during OTP request:', error.message, error.stack);
    res.status(500).json({ message: 'Server error while requesting OTP. Please try again later.' });
  }
};

// Reset Password with OTP (moved from gymadminController)
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
  }
  if (newPassword.length < 6) { // Example: Minimum password length, align with your policy
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }
  try {
    const admin = await Gym.findOne({
      email,
      passwordResetToken: otp, // Assuming plain OTP is stored for now
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
    }
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.passwordResetToken = undefined; // Clear OTP token
    admin.passwordResetExpires = undefined; // Clear OTP expiry
    await admin.save();
    // await sendEmail(admin.email, 'Your Password Has Been Reset', '<p>Your password was successfully reset.</p>');
    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('[resetPassword] Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error resetting password. Please try again.' });
  }
};

exports.registerGym = async (req, res) => {
  try {

    // Password check
    const plainPassword = req.body.password;
    if (!plainPassword) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Duplicate check (by email or phone)
    const existingGym = await Gym.findOne({
      $or: [{ email: req.body.email }, { phone: req.body.phone }]
    });

    if (existingGym) {
      return res.status(400).json({ message: 'Gym with this email or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);


    // File handling for registration: gymImages (multiple) and logo (single)
    let gymPhotos = [];
    if (req.files && req.files.gymImages) {
      // Parse meta fields for gymImages
      let metaArr = [];
      // Find max index for meta fields
      let maxIdx = -1;
      Object.keys(req.body).forEach(key => {
        const match = key.match(/^gymImagesMeta\[(\d+)\]\[(title|description|category)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (idx > maxIdx) maxIdx = idx;
        }
      });
      for (let i = 0; i <= maxIdx; i++) {
        metaArr[i] = {
          title: req.body[`gymImagesMeta[${i}][title]`] || '',
          description: req.body[`gymImagesMeta[${i}][description]`] || '',
          category: req.body[`gymImagesMeta[${i}][category]`] || ''
        };
      }
      const files = req.files.gymImages;
      // Only include photos with all required fields
      gymPhotos = files.map((file, i) => ({
        title: metaArr[i]?.title || '',
        description: metaArr[i]?.description || '',
        category: metaArr[i]?.category || '',
        imageUrl: `uploads/gymPhotos/${file.filename}`,
        uploadedAt: new Date()
      })).filter(photo => photo.title && photo.description && photo.category);
    }

    // Handle gym logo upload (single file, field name: 'logo')
    let logoUrl = '';
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      logoUrl = `/uploads/gym-logos/${req.files.logo[0].filename}`;
    } else {
      logoUrl = '';
    }


    // Parse activities as array of objects: [{ name, icon, description }]
    let activities = [];
    if (Array.isArray(req.body.activities)) {
      activities = req.body.activities.map(a => {
        if (typeof a === 'string') {
          // Check if string is JSON
          try {
            const parsed = JSON.parse(a);
            return {
              name: parsed.name || '',
              icon: parsed.icon || 'fa-dumbbell',
              description: parsed.description || ''
            };
          } catch {
            // If not JSON, treat as plain name
            return { name: a, icon: 'fa-dumbbell', description: '' };
          }
        } else if (typeof a === 'object' && a !== null && a.name) {
          // Already correct format
          return {
            name: a.name,
            icon: a.icon || 'fa-dumbbell',
            description: a.description || ''
          };
        }
        return null;
      }).filter(Boolean);
    } else if (typeof req.body.activities === 'string') {
      // Accept JSON string or comma-separated
      try {
        const arr = JSON.parse(req.body.activities);
        if (Array.isArray(arr)) {
          activities = arr.map(a =>
            typeof a === 'object' && a !== null
              ? { name: a.name || '', icon: a.icon || 'fa-dumbbell', description: a.description || '' }
              : { name: a, icon: 'fa-dumbbell', description: '' }
          ).filter(Boolean);
        }
      } catch {
        // fallback: comma-separated string
        activities = req.body.activities.split(',').map(s => ({ name: s.trim(), icon: 'fa-dumbbell', description: '' }));
      }
    }


    // Parse membership plans robustly (handle indexed fields from FormData)
    let membershipPlans = [];
    // Collect all membership plan fields by index
    const planFieldRegex = /^membershipPlans\[(\d+)\]\[(\w+)\]$/;
    const planMap = {};
    Object.keys(req.body).forEach(key => {
      const match = key.match(planFieldRegex);
      if (match) {
        const idx = parseInt(match[1], 10);
        const field = match[2];
        if (!planMap[idx]) planMap[idx] = {};
        planMap[idx][field] = req.body[key];
      }
    });
    // Convert planMap to array, parse benefits as array, ensure proper data types
    membershipPlans = Object.keys(planMap).sort((a,b)=>a-b).map(idx => {
      const plan = planMap[idx];
      return {
        name: plan.name || '',
        price: parseFloat(plan.price) || 0,
        discount: parseFloat(plan.discount) || 0,
        discountMonths: parseInt(plan.discountMonths) || 0,
        benefits: plan.benefits ? plan.benefits.split(',').map(b => b.trim()).filter(Boolean) : [],
        note: plan.note || '',
        icon: plan.icon || 'fa-leaf',
        color: plan.color || '#38b000'
      };
    });
    // Fallback: legacy array style (for backward compatibility)
    if (membershipPlans.length === 0 && Array.isArray(req.body.planName)) {
      for (let i = 0; i < req.body.planName.length; i++) {
        membershipPlans.push({
          name: req.body.planName[i] || '',
          price: parseFloat(req.body.planPrice[i]) || 0,
          discount: parseFloat(req.body.planDiscount[i]) || 0,
          discountMonths: parseInt(req.body.planDiscountMonths[i]) || 0,
          benefits: req.body.planBenefits[i]?.split(',').map(b => b.trim()).filter(Boolean) || [],
          note: req.body.planNote[i] || '',
          icon: req.body.planIcon[i] || 'fa-leaf',
          color: req.body.planColor[i] || '#38b000'
        });
      }
    }
    
    // Ensure we have default membership plans if none were provided
    if (membershipPlans.length === 0) {
      membershipPlans = [
        { 
          name: 'Basic', 
          price: 800, 
          discount: 0, 
          discountMonths: 0, 
          benefits: ['Gym Access', 'Group Classes'], 
          note: 'Best for beginners', 
          icon: 'fa-leaf', 
          color: '#38b000' 
        },
        { 
          name: 'Standard', 
          price: 1200, 
          discount: 10, 
          discountMonths: 6, 
          benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], 
          note: 'Most Popular', 
          icon: 'fa-star', 
          color: '#3a86ff' 
        },
        { 
          name: 'Premium', 
          price: 1800, 
          discount: 15, 
          discountMonths: 12, 
          benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], 
          note: 'For serious fitness', 
          icon: 'fa-gem', 
          color: '#8338ec' 
        }
      ];
    }

    // Try to geocode the address to get lat/lng coordinates
    let coordinates = null;
    try {
      coordinates = await geocodeAddress(
        req.body.address,
        req.body.city,
        req.body.state,
        req.body.pincode
      );
      if (coordinates) {
      } else {
      }
    } catch (geocodeError) {
      console.error('Geocoding error during registration:', geocodeError);
    }

    const newGym = new Gym({
      gymName: req.body.gymName,
      admin: req.admin ? req.admin.id : null,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      location: {
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        landmark: req.body.landmark,
        lat: coordinates?.lat || null,
        lng: coordinates?.lng || null
      },
      description: req.body.description,
      gymPhotos,
      logoUrl,
      equipment: Array.isArray(req.body.equipment) ? req.body.equipment : (typeof req.body.equipment === 'string' ? req.body.equipment.split(',').map(e => e.trim()) : []),
      activities,
      membershipPlans,
      contactPerson: req.body.contactPerson,
      supportEmail: req.body.supportEmail,
      supportPhone: req.body.supportPhone,
      openingTime: req.body.openingTime,
      closingTime: req.body.closingTime,
      membersCount: req.body.currentMembers,
      status: 'pending',
    });

    await newGym.save();

    // Create subscription for the gym
    try {
      const subscriptionController = require('./subscriptionController');
      const subscriptionReq = {
        body: {
          gymId: newGym._id,
          plan: req.body.subscriptionPlan || '1month',
          paymentMethod: req.body.paymentMethod || 'razorpay'
        }
      };
      
      // Create a mock response object to capture the subscription result
      let subscriptionCreated = false;
      const mockRes = {
        status: () => mockRes,
        json: (data) => {
          if (data.success) {
            subscriptionCreated = true;
          }
          return mockRes;
        }
      };
      
      await subscriptionController.createSubscription(subscriptionReq, mockRes);
      
      if (!subscriptionCreated) {
        console.warn('⚠️ Subscription creation may have failed for gym:', newGym.gymName);
      }
    } catch (subscriptionError) {
      console.error('Error creating subscription for gym:', subscriptionError);
      // Don't fail the registration if subscription creation fails
    }

    // Create admin notification for new gym registration
    try {
      await adminNotificationService.notifyGymRegistration(newGym);
    } catch (notificationError) {
      console.error('Error creating admin notification:', notificationError);
    }

    // Send confirmation email with subscription information
    try {
      const subscriptionPlan = req.body.subscriptionPlan || '1month';
      const planNames = {
        '1month': 'Monthly',
        '3month': 'Quarterly', 
        '6month': 'Half-Yearly',
        '12month': 'Annual'
      };
      
      await sendEmail({
        to: newGym.email,
        subject: 'Your Gym Registration is Received - Gym-Wale',
        title: 'Welcome to Gym-Wale!',
        preheader: 'Your gym registration has been received and is under review',
        bodyHtml: `
          <p>Dear <strong style="color:#10b981;">${newGym.contactPerson || newGym.gymName}</strong>,</p>
          <p>🎉 Thank you for registering your gym on <strong>Gym-Wale</strong>!</p>
          <p>Your registration has been received and is under review. Our team will contact you soon.</p>
          
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <h4 style="color:#38bdf8;margin:0 0 12px 0;">📋 Your Subscription Plan</h4>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:6px 0;color:#94a3b8;width:120px;"><strong>Plan:</strong></td><td style="padding:6px 0;">${planNames[subscriptionPlan] || 'Monthly'}</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Trial Period:</strong></td><td style="padding:6px 0;color:#10b981;">1 Month FREE</td></tr>
            </table>
            <p style="color:#cbd5e1;font-size:13px;margin:12px 0 0 0;">Your free trial will begin once your gym is approved by our admin team.</p>
          </div>
          
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <h4 style="color:#38bdf8;margin:0 0 12px 0;">✨ Features You'll Get:</h4>
            <ul style="margin:0;padding-left:16px;color:#cbd5e1;font-size:14px;">
              <li style="margin-bottom:6px;">Customizable Dashboard</li>
              <li style="margin-bottom:6px;">Full Payment Management</li>
              <li style="margin-bottom:6px;">Enhanced Membership Handler</li>
              <li style="margin-bottom:6px;">Fingerprint & Face Recognition</li>
              <li style="margin-bottom:6px;">Advanced Analytics & Reports</li>
              <li>And much more!</li>
            </ul>
          </div>
          
          <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
            Welcome to the Gym-Wale family! 🏋️‍♂️
          </p>
        `,
        action: {
          label: 'Track Status',
          url: process.env.BRAND_PORTAL_URL || 'https://gym-wale.com/status'
        }
      });
    } catch (mailErr) {
      console.error('Error sending registration email:', mailErr);
    }

    res.status(201).json({
      status: "pending",
      message: "✅ Gym registered successfully! Pending admin approval.",
      subscriptionIncluded: true,
      trialPeriod: "1 month free trial included"
    });

  } catch (error) {
    console.error("❌ Error during gym registration:", error);
    res.status(500).json({ message: "Server error while registering gym" });
  }
};


// Get Gym Profile for Logged-in Admin
exports.getMyProfile = async (req, res) => {
  
  
  const adminId = req.admin && req.admin.id;
  
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized, no admin ID found' });
  }
  
  try {
    // Find gym by its own ID, since the gym admin is the gym itself
    const gym = await Gym.findById(adminId).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym profile not found for this admin' });
    }
        
    // Ensure proper data formatting for frontend
    const gymProfile = gym.toObject();
    
    // Ensure logoUrl is properly formatted
    if (gymProfile.logoUrl && !gymProfile.logoUrl.startsWith('http')) {
      gymProfile.logoUrl = gymProfile.logoUrl.startsWith('/') ? gymProfile.logoUrl : `/${gymProfile.logoUrl}`;
    }
    
    // Ensure activities are properly structured
    if (Array.isArray(gymProfile.activities)) {
      gymProfile.activities = gymProfile.activities.map(activity => {
        if (typeof activity === 'string') {
          return { name: activity, icon: 'fa-dumbbell', description: '' };
        } else if (typeof activity === 'object' && activity !== null) {
          return {
            name: activity.name || '',
            icon: activity.icon || 'fa-dumbbell',
            description: activity.description || ''
          };
        }
        return null;
      }).filter(Boolean);
    } else {
      gymProfile.activities = [];
    }
    
    res.status(200).json(gymProfile);
  } catch (error) {
    console.error('❌ Error fetching gym profile for admin:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// Helper: Validate current password
async function validateCurrentPassword(gym, currentPassword) {
  if (typeof currentPassword !== 'string' || currentPassword.trim().length === 0) {
    return { valid: false, message: 'Current password is required to update profile.' };
  }
  const isMatch = await bcrypt.compare(currentPassword, gym.password);
  if (!isMatch) {
    return { valid: false, message: 'Invalid current password.' };
  }
  return { valid: true };
}

// Helper: Handle password change
async function handlePasswordChange(gym, newPassword) {
  if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
    if (newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }
    if (await bcrypt.compare(newPassword, gym.password)) {
      return { error: 'New password cannot be the same as the old password.' };
    }
    gym.password = await bcrypt.hash(newPassword, 10);
  }
  return {};
}

// Helper: Update location fields
function updateLocation(gym, { address, city, state, pincode, landmark }) {
  if (!gym.location) gym.location = {};
  if (address) gym.location.address = address;
  if (city) gym.location.city = city;
  if (state) gym.location.state = state;
  if (pincode) gym.location.pincode = pincode;
  if (landmark) gym.location.landmark = landmark;
}

// Helper: Handle logo upload
function handleLogoUpload(gym, file, gymLogo) {
  if (file?.filename) {
    gym.logoUrl = `uploads/gym-logos/${file.filename}`;
  } else if (gymLogo === null) {
    gym.logoUrl = undefined;
  }
}

exports.updateMyProfile = async (req, res) => {
  const adminId = req.admin?.id;
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const { 
    gymName, email, phone, address, city, state, pincode, landmark, 
    description, contactPerson, supportEmail, supportPhone, 
    morningOpening, morningClosing, eveningOpening, eveningClosing,
    activeDays,
    openingTime, closingTime, // Legacy support
    status, currentPassword, newPassword, gymLogo 
  } = req.body;

  try {
    const gym = await Gym.findById(adminId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin' });
    }

    // Prepare fields to update
    if (gymName) gym.gymName = gymName;
    if (email) gym.email = email;
    if (phone) gym.phone = phone;
    if (description) gym.description = description;
    if (contactPerson) gym.contactPerson = contactPerson;
    if (supportEmail) gym.supportEmail = supportEmail;
    if (supportPhone) gym.supportPhone = supportPhone;
    if (status) gym.status = status;

    // Handle operating hours (morning and evening slots)
    if (morningOpening || morningClosing || eveningOpening || eveningClosing) {
      if (!gym.operatingHours) gym.operatingHours = { morning: {}, evening: {} };
      if (!gym.operatingHours.morning) gym.operatingHours.morning = {};
      if (!gym.operatingHours.evening) gym.operatingHours.evening = {};
      if (morningOpening) gym.operatingHours.morning.opening = morningOpening;
      if (morningClosing) gym.operatingHours.morning.closing = morningClosing;
      if (eveningOpening) gym.operatingHours.evening.opening = eveningOpening;
      if (eveningClosing) gym.operatingHours.evening.closing = eveningClosing;
    }

    // Handle active days (days of week the gym is open)
    if (activeDays !== undefined) {
      const validDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      if (Array.isArray(activeDays)) {
        gym.activeDays = activeDays.filter(d => validDays.includes(d.toLowerCase())).map(d => d.toLowerCase());
      }
    }

    // Legacy support for old single time slot
    if (openingTime) gym.openingTime = openingTime;
    if (closingTime) gym.closingTime = closingTime;

    updateLocation(gym, { address, city, state, pincode, landmark });

    // Secure Current Password Check
    const passwordValidation = await validateCurrentPassword(gym, currentPassword);
    if (!passwordValidation.valid) {
      return res.status(401).json({ message: passwordValidation.message });
    }

    // Secure Password Change Logic
    const passwordChangeResult = await handlePasswordChange(gym, newPassword);
    if (passwordChangeResult.error) {
      return res.status(400).json({ message: passwordChangeResult.error });
    }

    // Handle logo upload - now supports Cloudinary URL directly
    if (req.file?.filename) {
      gym.logoUrl = `uploads/gym-logos/${req.file.filename}`;
    } else if (gymLogo && gymLogo.startsWith('http')) {
      // Cloudinary URL passed directly
      gym.logoUrl = gymLogo;
    } else if (gymLogo === null) {
      gym.logoUrl = undefined;
    }

    await gym.save();
    const profileData = gym.toObject();
    delete profileData.password;

    res.status(200).json({
      message: 'Profile updated successfully',
      gym: profileData
    });

  } catch (error) {
    console.error("Error updating gym profile:", error);
    if (error.code === 11000) {
      let field = 'unknown';
      if (error.message.includes('email')) field = 'email';
      else if (error.message.includes('phone')) field = 'phone';
      return res.status(400).json({ message: `This ${field} is already in use by another gym.` });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// Change password for logged-in gym admin
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    // Get the gym from the database
    const gym = await Gym.findById(req.gym.id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, gym.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, gym.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the current password.' });
    }

    // Hash and save new password
    gym.password = await bcrypt.hash(newPassword, 10);
    await gym.save();

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error while changing password.' });
  }
};

// Fetch gyms by a list of cities
exports.getGymsByCities = async (req, res) => {
  try {
    const { cities } = req.body; // Expect an array of city names in the request body

    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({ message: 'Please provide a list of cities.' });
    }

   
    const cityRegexes = cities.map(city => new RegExp(`^${city}$`, 'i'));

    const gyms = await Gym.find({
      'location.city': { $in: cityRegexes },
      status: 'approved' // Only show approved gyms
    }).select('-password'); // Exclude sensitive data like passwords

    if (!gyms || gyms.length === 0) {
      
      return res.status(200).json([]);
    }

    // Optional: Transform data if needed, for example, to construct full image URLs
    const processedGyms = gyms.map(gym => {
      // Support older fields if they ever existed (defensive coding)
      const rawLogo = gym.logoUrl || gym.logo || gym.logoURL || gym.logo_path || gym.logoFile || '';
      return {
        _id: gym._id,
        id: gym._id, // for frontend compatibility if using 'id'
        name: gym.gymName,
        city: gym.location.city,
        logoUrl: rawLogo // expose logo so trainer registration picker can display logos
      };
    });

    res.status(200).json(processedGyms);

  } catch (error) {
    console.error('Error fetching gyms by cities:', error);
    res.status(500).json({ message: 'Server error while fetching gyms by cities.' });
  }
};

exports.uploadGymPhoto = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
   
    const { title, description, category, imageUrl } = req.body;
    
    console.log('[uploadGymPhoto] Request body:', { title, description, category, imageUrl: imageUrl ? 'present' : 'missing' });
    console.log('[uploadGymPhoto] File upload:', req.file ? 'present' : 'none');
    
    // Accept imageUrl from request body (Cloudinary URL from Flutter app)
    // OR fall back to local file upload for backward compatibility
    let finalImageUrl = imageUrl;
    
    if (!finalImageUrl && req.file) {
      // Legacy: local file upload
      finalImageUrl = `/uploads/gymPhotos/${req.file.filename}`;
    }
    
    if (!finalImageUrl) {
      console.error('[uploadGymPhoto] ERROR: No photo URL or file provided');
      return res.status(400).json({ success: false, message: 'No photo URL or file provided.' });
    }
    
    if (!title || !description || !category) {
      console.error('[uploadGymPhoto] ERROR: Missing required fields');
      return res.status(400).json({ success: false, message: 'Title, description, and category are required.' });
    }
    
    const imageObj = { title, description, category, imageUrl: finalImageUrl, uploadedAt: new Date() };
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $push: { gymPhotos: imageObj } },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found for this admin.' });
    }
    
    console.log('[uploadGymPhoto] SUCCESS: Photo uploaded');
    res.json({ success: true, gymImage: imageObj, gym });
  } catch (err) {
    console.error('Gym Photo Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload gym photo', error: err.message });
  }
};

// Update a gym photo by ID for the logged-in admin
exports.updateGymPhoto = async (req, res) => {
  try {

    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    const { photoId } = req.params;
    const { title, description, imageUrl } = req.body;
    let updateFields = {};
    if (title) updateFields['gymPhotos.$.title'] = title;
    if (description) updateFields['gymPhotos.$.description'] = description;
    
    // Accept imageUrl from request body (Cloudinary URL from Flutter app)
    // OR fall back to local file upload for backward compatibility
    if (imageUrl) {
      updateFields['gymPhotos.$.imageUrl'] = imageUrl;
    } else if (req.file) {
      updateFields['gymPhotos.$.imageUrl'] = `/uploads/gymPhotos/${req.file.filename}`;
    }
    
    // Find and update the photo in gymPhotos array
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId, 'gymPhotos._id': photoId },
      { $set: updateFields },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found or not authorized.' });
    }
    const updatedPhoto = gym.gymPhotos.id(photoId);
    if (!updatedPhoto) {
      return res.status(404).json({ success: false, message: 'Photo not found in this gym.' });
    }
    res.json({ success: true, photo: updatedPhoto });
  } catch (err) {
    console.error('Update Gym Photo Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update gym photo', error: err.message });
  }
};
// Delete a gym photo by ID for the logged-in admin
exports.deleteGymPhoto = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    const { photoId } = req.params;
    // Remove the photo from the gymPhotos array
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $pull: { gymPhotos: { _id: photoId } } },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found or not authorized.' });
    }
    res.json({ success: true, message: 'Photo removed successfully.' });
  } catch (err) {
    console.error('Delete Gym Photo Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete gym photo', error: err.message });
  }
};
// Get all gym photos for the logged-in admin
exports.getAllGymPhotos = async (req, res) => {
  try {
   
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authorized, no admin ID found' });
    }
    
    // Look for gym by its own ID (adminId is actually the gym's ID from JWT token)
    const gym = await Gym.findById(adminId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found for this admin.' });
    }
    
    res.json({ success: true, photos: gym.gymPhotos || [] });
  } catch (err) {
    console.error('Get Gym Photos Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch gym photos', error: err.message });
  }
};



// Public: Get gym details by ID (for details page)
exports.getGymById = async (req, res) => {
  try {
    const gym = await Gym.findOne({ _id: req.params.id, status: 'approved' }).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found or not approved' });
    }
    res.status(200).json(gym);
  } catch (error) {
    console.error("Error fetching gym by ID:", error);
    res.status(500).json({ message: 'Server error while fetching gym details' });
  }
};
// Update Activities for the logged-in gym admin
exports.updateActivities = async (req, res) => {
  const adminId = req.admin && req.admin.id;
  if (!adminId) {
    return res.status(401).json({ message: 'Not authorized, no admin ID found' });
  }
  try {
    const { activities } = req.body;
    if (!Array.isArray(activities)) {
      return res.status(400).json({ message: 'Activities must be an array.' });
    }
    // Validate each activity object
    for (const act of activities) {
      if (!act.name || !act.icon || !act.description) {
        return res.status(400).json({ message: 'Each activity must have name, icon, and description.' });
      }
    }
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $set: { activities } },
      { new: true }
    );
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin.' });
    }
    res.status(200).json({ message: 'Activities updated successfully.', activities: gym.activities });
  } catch (error) {
    console.error('Error updating activities:', error);
    res.status(500).json({ message: 'Server error while updating activities.' });
  }
};

// Get membership plans for the logged-in gym admin
exports.getMembershipPlans = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ message: 'Not authorized, no admin ID found' });
    }
    
    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin.' });
    }
    
    // Return membership plans or default plans if none exist
    let membershipPlans = gym.membershipPlans || [];
    
    // If no membership plans exist, return default plans
    if (membershipPlans.length === 0) {
      membershipPlans = [
        { 
          name: 'Basic', 
          price: 800, 
          discount: 0, 
          discountMonths: 0, 
          benefits: ['Gym Access', 'Group Classes'], 
          note: 'Best for beginners', 
          icon: 'fa-leaf', 
          color: '#38b000' 
        },
        { 
          name: 'Standard', 
          price: 1200, 
          discount: 10, 
          discountMonths: 6, 
          benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], 
          note: 'Most Popular', 
          icon: 'fa-star', 
          color: '#3a86ff' 
        },
        { 
          name: 'Premium', 
          price: 1800, 
          discount: 15, 
          discountMonths: 12, 
          benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], 
          note: 'For serious fitness', 
          icon: 'fa-gem', 
          color: '#8338ec' 
        }
      ];
    }
    
    res.status(200).json(membershipPlans);
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    res.status(500).json({ message: 'Server error while fetching membership plans' });
  }
};

// Update membership plans for the logged-in gym admin
exports.updateMembershipPlans = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) {
      return res.status(401).json({ message: 'Not authorized, no admin ID found' });
    }
    
    const membershipPlans = req.body;
    
    // Validate membership plans structure
    if (!Array.isArray(membershipPlans) || membershipPlans.length !== 3) {
      return res.status(400).json({ message: 'Membership plans must be an array of 3 plans.' });
    }
    
    // Validate each plan
    for (const plan of membershipPlans) {
      if (!plan.name || typeof plan.price !== 'number' || !Array.isArray(plan.benefits)) {
        return res.status(400).json({ message: 'Each plan must have name, price, and benefits array.' });
      }
    }
    
    // Ensure proper data types and structure
    const processedPlans = membershipPlans.map(plan => ({
      name: plan.name,
      price: parseFloat(plan.price) || 0,
      discount: parseFloat(plan.discount) || 0,
      discountMonths: parseInt(plan.discountMonths) || 0,
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      note: plan.note || '',
      icon: plan.icon || 'fa-leaf',
      color: plan.color || '#38b000'
    }));
    
    const gym = await Gym.findOneAndUpdate(
      { admin: adminId },
      { $set: { membershipPlans: processedPlans } },
      { new: true }
    );
    
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for this admin.' });
    }
    
    res.status(200).json({ 
      message: 'Membership plans updated successfully.', 
      membershipPlans: gym.membershipPlans 
    });
  } catch (error) {
    console.error('Error updating membership plans:', error);
    res.status(500).json({ message: 'Server error while updating membership plans' });
  }
};

// ===== SECURITY HELPER FUNCTIONS =====

// Extract device info from user agent
const extractDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown device';
  
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  
  return 'Unknown device';
};

// Extract browser info from user agent
const extractBrowserInfo = (userAgent) => {
  if (!userAgent) return 'Unknown browser';
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  
  return 'Unknown browser';
};

// Check if login is suspicious based on patterns
const isSuspiciousLogin = async (gymId, ipAddress) => {
  try {
    if (!gymId) return false;
    
    // Check for multiple failed attempts from same IP in last hour
    const recentFailures = await LoginAttempt.countDocuments({
      gymId,
      ipAddress,
      success: false,
      timestamp: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    
    if (recentFailures >= 3) return true;
    
    // Check if this is a new IP for this gym
    const previousLogins = await LoginAttempt.countDocuments({
      gymId,
      ipAddress,
      success: true
    });
    
    // If no previous successful logins from this IP, mark as suspicious
    if (previousLogins === 0) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking suspicious login:', error);
    return false;
  }
};

// Get location from IP address using a free geolocation service
const getLocationFromIP = async (ipAddress) => {
  try {
    console.log(`🌍 Getting location for IP: ${ipAddress}`);
    
    // Handle local/private IP addresses
    if (ipAddress === '127.0.0.1' || 
        ipAddress === '::1' || 
        ipAddress.startsWith('192.168.') || 
        ipAddress.startsWith('10.') || 
        ipAddress.startsWith('172.')) {
      console.log('📍 Local IP detected, returning Local Network');
      return {
        city: 'Local Network',
        country: 'Local',
        coordinates: { lat: 0, lng: 0 }
      };
    }

    // Use a free geolocation service (ip-api.com allows 1000 requests/month for free)
    console.log(`🔍 Querying geolocation service for IP: ${ipAddress}`);
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,country,city,lat,lon,regionName`, {
      timeout: 5000 // 5 second timeout
    });
    
    if (response.data && response.data.status === 'success') {
      const locationData = {
        city: response.data.city || 'Unknown',
        country: response.data.country || 'Unknown',
        region: response.data.regionName || '',
        coordinates: { 
          lat: response.data.lat || 0, 
          lng: response.data.lon || 0 
        }
      };
      console.log('✅ Location found:', locationData);
      return locationData;
    } else {
      console.log('⚠️ Geolocation service returned unsuccessful status');
    }
    
    // Fallback for failed requests or invalid IPs
    console.log('📍 Using fallback location');
    return {
      city: 'Unknown',
      country: 'Unknown',
      coordinates: { lat: 0, lng: 0 }
    };
  } catch (error) {
    console.error('❌ Error getting location from IP:', error.message);
    // Return fallback location on error
    return {
      city: 'Unknown',
      country: 'Unknown',
      coordinates: { lat: 0, lng: 0 }
    };
  }
};

// Check if failed login should trigger notification
const shouldNotifyFailedLogin = async (gymId) => {
  try {
    const settings = await SecuritySettings.findOne({ gymId });
    // Only return true if settings exist AND notifications are enabled
    return settings && settings.loginNotifications && settings.loginNotifications.enabled;
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false;
  }
};

// Send login notification
const sendLoginNotification = async (gymId, loginAttempt) => {
  try {
    const gym = await Gym.findById(gymId);
    const settings = await SecuritySettings.findOne({ gymId });
    
    // Only send notifications if SecuritySettings exist AND notifications are enabled
    if (!gym || !settings || !settings.loginNotifications || !settings.loginNotifications.enabled) {
      return;
    }
    
    const preferences = settings.loginNotifications.preferences;
    
    // Only send notification if preferences allow it
    if (preferences.suspiciousOnly && !loginAttempt.suspicious) {
      return;
    }
    
    const subject = loginAttempt.success ? 
      'Successful Login to Your Gym Account' : 
      'Failed Login Attempt on Your Gym Account';
    
    const message = `
      ${loginAttempt.success ? 'Successful' : 'Failed'} login attempt for ${gym.gymName}
      
      Time: ${loginAttempt.timestamp.toLocaleString()}
      IP Address: ${loginAttempt.ipAddress}
      Device: ${loginAttempt.device}
      Browser: ${loginAttempt.browser}
      Location: ${loginAttempt.location?.city || 'Unknown'}${loginAttempt.location?.region ? ', ' + loginAttempt.location.region : ''}, ${loginAttempt.location?.country || 'Unknown'}
      
      ${loginAttempt.suspicious ? '⚠️ This login attempt has been marked as suspicious.' : ''}
      ${!loginAttempt.success ? `Failure reason: ${loginAttempt.failureReason}` : ''}
      
      If this wasn't you, please secure your account immediately.
    `;
    
    if (preferences.email) {
      console.log(`📤 Attempting to send email notification to: ${gym.email}`, {
        subject,
        hasEmailFunction: typeof sendEmail === 'function',
        preferences
      });
      
      try {
        await sendEmail({
          to: gym.email,
          subject,
          title: 'Login Alert',
          preheader: loginAttempt.success ? 'Successful login detected' : 'Failed login attempt detected',
          bodyHtml: `
            <p>Hi <strong style="color:#10b981;">${gym.contactPerson || gym.gymName}</strong>,</p>
            <p>${loginAttempt.success ? '✅' : '❌'} A login attempt was detected for your gym account.</p>
            
            <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
              <table style="width:100%;font-size:13px;">
                <tr><td style="padding:6px 0;color:#94a3b8;width:120px;"><strong>Status:</strong></td><td style="padding:6px 0;color:${loginAttempt.success ? '#10b981' : '#ef4444'};">${loginAttempt.success ? 'Successful' : 'Failed'}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Time:</strong></td><td style="padding:6px 0;">${new Date(loginAttempt.timestamp).toLocaleString()}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;"><strong>IP Address:</strong></td><td style="padding:6px 0;">${loginAttempt.ip}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Location:</strong></td><td style="padding:6px 0;">${loginAttempt.location || 'Unknown'}</td></tr>
                ${loginAttempt.userAgent ? `<tr><td style="padding:6px 0;color:#94a3b8;"><strong>Device:</strong></td><td style="padding:6px 0;font-size:12px;">${loginAttempt.userAgent}</td></tr>` : ''}
              </table>
            </div>
            
            ${loginAttempt.suspicious ? '<p style="color:#ef4444;">⚠️ <strong>Warning:</strong> This login attempt has been marked as suspicious.</p>' : ''}
            ${!loginAttempt.success ? `<p style="color:#ef4444;"><strong>Failure reason:</strong> ${loginAttempt.failureReason}</p>` : ''}
            
            <p style="color:#cbd5e1;font-size:14px;">
              If this wasn't you, please secure your account immediately.
            </p>
          `,
          action: {
            label: 'Secure Account',
            url: process.env.BRAND_PORTAL_URL || 'https://gym-wale.com/security'
          }
        });
        console.log(`✅ Email notification sent successfully to: ${gym.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email notification to: ${gym.email}`, emailError);
      }
    } else {
      console.log(`🔕 Email notifications disabled in preferences for gym ID: ${gymId}`);
    }
    
    // You can add browser notification logic here if needed
    
  } catch (error) {
    console.error('Error sending login notification:', error);
  }
};

// Verify backup code for 2FA
const verifyBackupCode = async (gym, code) => {
  try {
    if (!gym.twoFactorBackupCodes || gym.twoFactorBackupCodes.length === 0) {
      return false;
    }
    
    // Check if any of the hashed backup codes match
    for (let i = 0; i < gym.twoFactorBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(code, gym.twoFactorBackupCodes[i]);
      if (isMatch) {
        // Remove the used backup code
        gym.twoFactorBackupCodes.splice(i, 1);
        await gym.save();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
};

// Export the send2FAEmail function for use in routes
module.exports.send2FAEmail = send2FAEmail;

