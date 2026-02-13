const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const sendEmail = require('../utils/sendEmail');

// ====== Generate JWT ======
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ====== Generate Welcome Email Template ======
const generateWelcomeEmailTemplate = (firstName, email) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header with brand gradient and logo -->
      <div style="background: linear-gradient(135deg, #1976d2 0%, #2c4ee8ff 50%, #871df2ff 100%); padding: 40px; border-radius: 15px 15px 0 0; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/frontend/public/Gym-Wale.png" 
               alt="Gym-Wale Logo" 
               style="width: 60px; height: 60px; border-radius: 12px; margin-right: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
               onerror="this.style.display='none';">
          <div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Gym-Wale</h1>
            <p style="color: #e3f2fd; margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">Be your own Gym-Wala</p>
          </div>
        </div>
        <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🏋️‍♂️ Welcome to the Family!</h2>
        <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 16px;">Your Fitness Journey Starts Here</p>
      </div>
      
      <!-- Main content -->
      <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 15px 15px; border: 1px solid #e9ecef;">
        <h2 style="color: #333; margin-top: 0; font-size: 24px;">Hello ${firstName}! 👋</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
          Thank you for joining <strong style="color: #1976d2;">Gym-Wale</strong> - your ultimate fitness companion! 
          We're excited to help you achieve your fitness goals and transform your lifestyle with our comprehensive platform.
        </p>
        
        <!-- Welcome benefits section -->
        <div style="background: white; border: 2px solid #1976d2; border-radius: 12px; padding: 25px; margin: 25px 0;">
          <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">🎉 What's Available for You:</h3>
          <ul style="color: #666; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>🏢 Explore Premium Gyms</strong> - Browse top-rated fitness centers near you with detailed facilities</li>
            <li><strong>💪 Personalized Training Plans</strong> - Get custom workout routines from certified trainers</li>
            <li><strong>🥗 Nutrition Guidance</strong> - Access expert diet plans and meal suggestions for your goals</li>
            <li><strong>📱 Real-time Attendance</strong> - Track your gym visits with our advanced biometric system</li>
            <li><strong>💳 Flexible Memberships</strong> - Choose plans that fit your schedule and budget perfectly</li>
            <li><strong>👨‍💼 Expert Trainers</strong> - Connect with certified fitness professionals in your area</li>
            <li><strong>📊 Progress Tracking</strong> - Monitor your fitness journey with detailed analytics</li>
            <li><strong>🏆 Achievement System</strong> - Earn rewards and unlock milestones as you progress</li>
          </ul>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/frontend/public/login.html" 
             style="display: inline-block; background: linear-gradient(135deg, #1976d2 0%, #2c4ee8ff 100%); 
                    color: white; padding: 15px 35px; text-decoration: none; border-radius: 25px; 
                    font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);">
            🚀 Start Your Fitness Journey
          </a>
        </div>
        
        <!-- Account details -->
        <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #1976d2; margin: 0 0 10px 0;">📧 Your Account Details:</h4>
          <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
          <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Platform:</strong> Gym-Wale Fitness Platform</p>
        </div>
        
        <!-- Features showcase -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #1976d2; margin: 0 0 15px 0;">🌟 Why Choose Gym-Wale?</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: #666;">
            <div>✅ Verified gym partners</div>
            <div>✅ Secure payment gateway</div>
            <div>✅ 24/7 customer support</div>
            <div>✅ Mobile app available</div>
            <div>✅ Biometric attendance</div>
            <div>✅ Progress analytics</div>
          </div>
        </div>
        
        <!-- Support section -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #1976d2; margin: 0 0 10px 0;">💬 Need Help Getting Started?</h4>
          <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0;">
            Our support team is here to help! If you have any questions or need assistance getting started with Gym-Wale, 
            don't hesitate to reach out to us. We're committed to making your fitness journey smooth and successful.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 25px; border-top: 2px solid #e9ecef; text-align: center;">
          <p style="color: #1976d2; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
            Welcome to the Gym-Wale Family! 💪
          </p>
          <p style="color: #ff9800; font-size: 14px; font-weight: 600; margin: 5px 0;">
            Be your own Gym-Wala
          </p>
          <p style="color: #999; font-size: 12px; margin: 15px 0 0 0;">
            This is an automated welcome message from Gym-Wale. For support, please contact our team.
          </p>
        </div>
      </div>
    </div>
  `;
};

// ====== Register User ======
const registerUser = async (req, res) => {
  const { username, email, phone, password } = req.body;

  // Split full name into first and last name
  let firstName = "";
  let lastName = "";
  if (username) {
    const nameParts = username.trim().split(" ");
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(" "); // Handles middle names too
  }

  console.log('📩 Received signup data:', { username, email, phone });

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      username, // keep for backward compatibility
      email,
      phone,
      password: hashedPassword,
    });

    const token = generateToken(newUser._id);

    // Send welcome email
    try {
      console.log('📧 Sending welcome email to:', email);
      const welcomeEmailHTML = generateWelcomeEmailTemplate(firstName || username, email);
      await sendEmail({
        to: email,
        subject: '🎉 Welcome to Gym-Wale - Your Fitness Journey Starts Now!',
        title: 'Welcome Aboard!',
        preheader: 'Your account has been created successfully',
        bodyHtml: welcomeEmailHTML.includes('<html') ? '<p>Your account is ready.</p>' : welcomeEmailHTML,
        action: {
          label: 'Get Started',
          url: process.env.PORTAL_LOGIN_URL || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/frontend/public/login.html` : 'http://localhost:5000/frontend/public/login.html')
        }
      });
      console.log('✅ Welcome email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError.message);
      // Don't fail registration if email fails - just log the error
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        profileImage: newUser.profileImage, // <-- ADD THIS LINE
      },
    });
  } catch (error) {
    console.error('❌ Error in registerUser:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// ====== Login User ======
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password' });

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage, // <-- ADD THIS LINE
      },
    });
  } catch (error) {
    console.error('❌ Error in loginUser:', error.message);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};
// ====== Google OAuth Sign-In/Sign-Up ======
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const googleAuth = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: "No credential provided" });

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      // Split name into first and last
      let firstName = "";
      let lastName = "";
      if (name) {
        const nameParts = name.trim().split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
      }
      user = await User.create({
        firstName,
        lastName,
        username: name,
        email,
        password: sub, // Not used for Google users, but required by schema
        profileImage: picture,
        authProvider: 'google',
        // You can add other default fields here
      });
    } else {
      // If user exists and has default image, update to Google image
      if (
        (!user.profileImage || user.profileImage === "/uploads/profile-pics/default.png") &&
        picture
      ) {
        user.profileImage = picture;
        await user.save();
      }
    }

    // Generate JWT
    const token = generateToken(user._id);

    res.status(200).json({
      message: "Google authentication successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("❌ Google Auth Error:", error);
    res.status(401).json({ message: "Google authentication failed" });
  }
};
//Update profile
const updateProfile = async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  try {
    const userId = req.user._id;
    const {
      // Support both old and new field names
      firstName, lastName, name, username, birthdate, phone, email,
      address, city, state, pincode,
      heightFeet, heightInches, weight, fitnessLevel, primaryGoal,
      workoutPreferences, removeProfileImage, confirmPassword
     
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if the user is a Google user
    const isGoogleUser =
      user.authProvider === 'google' ||
      (user.profileImage && user.profileImage.startsWith('http'));

    // Password confirmation for non-Google users (optional for simple updates)
    if (!isGoogleUser && confirmPassword) {
      const isMatch = await bcrypt.compare(confirmPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect password." });
      }
    }

    // Update basic profile fields - support both naming conventions
    if (name) user.name = name;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (username) user.username = username;
    if (birthdate) user.birthdate = birthdate;
    if (phone) user.phone = phone;
    if (email) user.email = email;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;
    
    // Update fitness details
    if (heightFeet || heightInches) {
      user.height = { feet: heightFeet, inches: heightInches };
    }
    if (weight) user.weight = weight;
    if (fitnessLevel) user.fitnessLevel = fitnessLevel;
    if (primaryGoal) user.primaryGoal = primaryGoal;
    if (workoutPreferences) {
      user.workoutPreferences = Array.isArray(workoutPreferences)
        ? workoutPreferences
        : workoutPreferences
          ? [workoutPreferences]
          : [];
    }

   
    // Remove profile image if requested
    if (removeProfileImage === "true") {
      // Only remove if it's not a Google profile image and not already the default
      if (user.profileImage && 
          !user.profileImage.startsWith('http') && 
          user.profileImage !== "/uploads/profile-pics/default.png") {
        console.log('Removing profile image:', user.profileImage);
      }
      user.profileImage = "/uploads/profile-pics/default.png";
    }

    // Profile image upload - Use Cloudinary URL from multer-storage-cloudinary
    if (req.file) {
      // req.file.path contains the Cloudinary secure URL
      user.profileImage = req.file.path;
      console.log('✅ Profile image uploaded to Cloudinary:', req.file.path);
    }

     try {
      await user.save();
      return res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  catch (error) {
    console.error('❌ Error in updateProfile:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// ✅ Export all controller functions
const crypto = require('crypto');

// === Forgot Password: Request OTP ===
const requestPasswordResetOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No user found with this email.' });

    // Generate 6-digit OTP
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    user.passwordResetOTP = otp;
    user.passwordResetOTPExpiry = expiry;
    await user.save();

    // Send OTP email
    await sendEmail({
      to: user.email,
      subject: 'Your Password Reset OTP',
      title: 'Password Reset Requested',
      preheader: 'Your OTP for password reset',
      bodyHtml: `
        <p>Hi there,</p>
        <p>🔒 You requested a password reset for your account.</p>
        
        <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;text-align:center;">
          <p style="color:#94a3b8;margin:0 0 8px 0;font-size:14px;">Your OTP Code:</p>
          <div style="background:#0d4d89;color:#ffffff;padding:12px 20px;border-radius:8px;font-weight:700;font-size:24px;letter-spacing:3px;margin:8px auto;display:inline-block;">${otp}</div>
          <p style="color:#94a3b8;margin:8px 0 0 0;font-size:13px;">Valid for 10 minutes</p>
        </div>
        
        <p style="color:#cbd5e1;font-size:14px;">
          ⚠️ <strong>Security Notice:</strong> If you didn't request this, please ignore this email.
        </p>
      `,
      action: {
        label: 'Reset Password',
        url: `#reset-password`
      }
    });

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Error in requestPasswordResetOTP:', err);
    res.status(500).json({ success: false, message: 'Error sending OTP. Please try again.' });
  }
};

// === Forgot Password: Verify OTP and Reset Password ===
const verifyPasswordResetOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No user found with this email.' });
    if (!user.passwordResetOTP || !user.passwordResetOTPExpiry) {
      return res.status(400).json({ success: false, message: 'No OTP requested or OTP expired.' });
    }
    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
    if (user.passwordResetOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpiry = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (err) {
    console.error('Error in verifyPasswordResetOTP:', err);
    res.status(500).json({ success: false, message: 'Error resetting password. Please try again.' });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Create combined name for auto-fill
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || user.username || '';
    
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      name: fullName, // Combined name for auto-fill
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      
      // Date of birth for auto-fill
      birthdate: user.birthdate,
      dateOfBirth: user.birthdate, // Alternative field name
      
      // Fitness information for auto-fill
      height: user.height,
      weight: user.weight,
      fitnessLevel: user.fitnessLevel,
      primaryGoal: user.primaryGoal,
      workoutPreferences: user.workoutPreferences,
      
      // Alternative field names for compatibility
      fitnessGoals: user.primaryGoal ? [user.primaryGoal] : [],
      fitnessGoal: user.primaryGoal,
      goals: user.primaryGoal ? [user.primaryGoal] : [],
      activityPreferences: user.workoutPreferences || [],
      activities: user.workoutPreferences || [],
      preferredActivities: user.workoutPreferences || [],
      activity: user.workoutPreferences && user.workoutPreferences.length > 0 ? user.workoutPreferences[0] : null,
      fitnessExperience: user.fitnessLevel,
      experience: user.fitnessLevel,
      experienceLevel: user.fitnessLevel,
      
      // User preferences
      theme: user.theme,
      measurementSystem: user.measurementSystem,
      notifications: user.notifications,
      twoFactorEnabled: user.twoFactorEnabled,
      preferences: user.preferences,
      
      // Trial tracking
      trialLimits: user.trialLimits,
      
      // Account status
      accountStatus: user.accountStatus,
      
      // Workout schedule
      workoutSchedule: user.workoutSchedule
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: "Server error" });
  }
};
// Save workout schedule
const saveWorkoutSchedule = async (req, res) => {
  try {
    const userId = req.user._id;
    const { schedule } = req.body;
    if (!schedule) return res.status(400).json({ message: "No schedule provided" });
    const user = await User.findById(userId);
    user.workoutSchedule = schedule;
    await user.save();
    res.status(200).json({ message: "Workout schedule saved", schedule: user.workoutSchedule });
  } catch (err) {
    res.status(500).json({ message: "Failed to save schedule" });
  }
};

// Get workout schedule
const getWorkoutSchedule = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ schedule: user.workoutSchedule || {} });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
};

// === Change Password for authenticated users ===
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is Google user
    if (user.authProvider === 'google' || (user.profileImage && user.profileImage.startsWith('http'))) {
      return res.status(400).json({ message: 'Cannot change password for Google accounts' });
    }
    
    // Verify current password
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
};

// ====== Get User's Claimed Coupons ======
const getUserCoupons = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    // Import Coupon model here to avoid circular dependency
    const Coupon = require('../models/Coupon');

    // Build query
    const query = { userId };
    if (status) query.status = status;

    // Pagination
    const skip = (page - 1) * limit;
    
    const coupons = await Coupon.find(query)
      .populate('offerId', 'title description category')
      .populate('gymId', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(query);

    // Filter expired coupons and update their status
    const now = new Date();
    const activeCoupons = [];
    const expiredCoupons = [];

    for (const coupon of coupons) {
      if (coupon.validTill < now && coupon.status === 'active') {
        // Update expired coupon status
        await Coupon.findByIdAndUpdate(coupon._id, { status: 'expired' });
        coupon.status = 'expired';
        expiredCoupons.push(coupon);
      } else {
        activeCoupons.push(coupon);
      }
    }

    res.json({
      success: true,
      coupons,
      activeCoupons: activeCoupons.length,
      expiredCoupons: expiredCoupons.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user coupons:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch coupons',
      error: error.message 
    });
  }
};

// ====== Save Offer to User Profile ======
const saveOfferToProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { offerId, offerData, claimedAt, expiresAt } = req.body;

    if (!userId || !offerId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID and Offer ID are required' 
      });
    }

    // Import models here
    const Coupon = require('../models/Coupon');
    const Offer = require('../models/Offer');

    // Check if offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: 'Offer not found' 
      });
    }

    // Check if user already has this coupon
    const existingCoupon = await Coupon.findOne({
      userId,
      offerId,
      status: { $in: ['active', 'pending'] }
    });

    if (existingCoupon) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already claimed this offer',
        couponId: existingCoupon._id
      });
    }

    // Generate unique coupon code
    const couponCode = `${offer.type.toUpperCase()}${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

    // Create new coupon
    const coupon = new Coupon({
      code: couponCode,
      type: offer.type,
      value: offer.value,
      minAmount: offer.minAmount || 0,
      gymId: offer.gymId,
      offerId: offerId,
      userId: userId,
      validFrom: offer.startDate || new Date(),
      validTill: expiresAt ? new Date(expiresAt) : offer.endDate,
      status: 'active',
      description: offer.title,
      claimedAt: claimedAt ? new Date(claimedAt) : new Date()
    });

    await coupon.save();

    // Update offer usage count
    await Offer.findByIdAndUpdate(offerId, {
      $inc: { usageCount: 1 }
    });

    res.json({
      success: true,
      message: 'Offer saved to profile successfully',
      coupon: {
        id: coupon._id,
        code: couponCode,
        type: offer.type,
        value: offer.value,
        validTill: coupon.validTill,
        description: offer.title,
        claimedAt: coupon.claimedAt
      }
    });

  } catch (error) {
    console.error('Error saving offer to profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save offer',
      error: error.message 
    });
  }
};

// ====== Check Coupon Validity ======
const checkCouponValidity = async (req, res) => {
  try {
    const { userId, couponId } = req.params;

    const Coupon = require('../models/Coupon');

    const coupon = await Coupon.findOne({
      _id: couponId,
      userId: userId
    }).populate('offerId', 'title description').populate('gymId', 'name');

    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }

    const now = new Date();
    let isValid = true;
    let reason = '';

    if (coupon.status !== 'active') {
      isValid = false;
      reason = `Coupon is ${coupon.status}`;
    } else if (coupon.validTill < now) {
      isValid = false;
      reason = 'Coupon has expired';
      
      // Update status to expired
      await Coupon.findByIdAndUpdate(couponId, { status: 'expired' });
    } else if (coupon.validFrom > now) {
      isValid = false;
      reason = 'Coupon is not yet valid';
    }

    res.json({
      success: true,
      isValid,
      reason,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        validTill: coupon.validTill,
        validFrom: coupon.validFrom,
        status: coupon.status,
        description: coupon.description,
        offer: coupon.offerId,
        gym: coupon.gymId
      }
    });

  } catch (error) {
    console.error('Error checking coupon validity:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to check coupon validity',
      error: error.message 
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
   updateProfile,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  changePassword,
  googleAuth,
  getUserProfile,
  saveWorkoutSchedule,
  getWorkoutSchedule,
  getUserCoupons,
  saveOfferToProfile,
  checkCouponValidity
};

