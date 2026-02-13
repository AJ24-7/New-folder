// --- Activities API ---
const express = require('express');
const upload = require('../middleware/upload');
const { optionalSingleUpload } = require('../middleware/optionalUpload');
const path = require('path');
const jwt = require('jsonwebtoken');
const router = express.Router();
const sendEmail = require('../utils/sendEmail');

// Import controllers
const gymController = require('../controllers/gymController');
const membershipPlanController = require('../controllers/membershipPlanController');
const { getGymInfo } = require('../controllers/qrRegistrationController');

// Import middleware
const gymadminAuth = require('../middleware/gymadminAuth');
const tempAuth = require('../middleware/tempAuth');

// Import models
const Gym = require('../models/gym');
const LoginAttempt = require('../models/LoginAttempt');
const SecuritySettings = require('../models/SecuritySettings');
const User = require('../models/User');
const Payment = require('../models/Payment');
const TrialBooking = require('../models/TrialBooking');
const Trainer = require('../models/trainerModel');

// Import controller functions
const { registerGym, loginGym, updateMyProfile, getMyProfile, getGymsByCities } = require('../controllers/gymController'); 

// Debug: Check if tempAuth is properly imported
console.log('tempAuth imported:', typeof tempAuth);
if (typeof tempAuth !== 'function') {
  console.error('ERROR: tempAuth is not a function!', tempAuth);
}

// --- Membership Plans API ---
// Get all membership plans for the logged-in gym admin
router.get('/membership-plans', gymadminAuth, membershipPlanController.getMembershipPlans);

// Update all membership plans for the logged-in gym admin
router.put('/membership-plans', gymadminAuth, membershipPlanController.updateMembershipPlans);

// --- QR Code Registration API ---
// Get gym info for QR code registration (public endpoint)
router.get('/info/:gymId', getGymInfo);

// Get membership plans for a specific gym (public endpoint for QR registration)
router.get('/:gymId/membership-plans', membershipPlanController.getGymMembershipPlansPublic);

// ✅ Register Gym [POST] /register
router.options('/register', (req, res) => {
  console.log('<<<< OPTIONS request to /register received >>>>');
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500'); // Or your specific client origin
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Origin, Accept'); // Add common headers
  res.sendStatus(204); // No Content - standard for successful OPTIONS
});

router.post('/register',  upload.fields([
  { name: 'gymImages', maxCount: 5 },
  { name: 'logo', maxCount: 1 },
]), registerGym);

// ✅ Get All Gyms [GET] / (Admin only)
router.get('/', gymadminAuth, async (req, res) => {
  try {
    const gyms = await Gym.find();
    console.log("📦 All gyms fetched:", gyms);
    res.status(200).json(gyms);
  } catch (error) {
    console.error('❌ Failed to fetch gyms:', error);
    res.status(500).json({ message: 'Server error while fetching gyms' });
  }
});

// ✅ Public Gym Search [GET] /search
router.get('/search', async (req, res) => {
  try {
    const { search, city, state, pincode } = req.query;
    const query = { status: 'approved' };

    if (search) {
      query.$or = [
        { gymName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (state) query['location.state'] = { $regex: state, $options: 'i' };
    if (pincode) query['location.pincode'] = pincode;

    const gyms = await Gym.find(query)
      .select('gymName email phone location description gymPhotos logoUrl openingTime closingTime membersCount createdAt')
      .lean();

    console.log(`📦 Found ${gyms.length} gyms matching criteria`);
    
    const Review = require('../models/Review');
    
    // Transform to match frontend expectations
    const transformedGyms = await Promise.all(gyms.map(async gym => {
      const reviews = await Review.find({ gym: gym._id, isActive: true });
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      return {
        _id: gym._id,
        id: gym._id.toString(),
        gymName: gym.gymName,
        name: gym.gymName,
        email: gym.email,
        phone: gym.phone,
        description: gym.description || '',
        location: gym.location,
        address: gym.location?.address || '',
        city: gym.location?.city,
        state: gym.location?.state,
        pincode: gym.location?.pincode,
        latitude: gym.location?.lat || 0,
        longitude: gym.location?.lng || 0,
        gymPhotos: gym.gymPhotos || [],
        images: (gym.gymPhotos || []).map(p => p.imageUrl).filter(Boolean),
        logoUrl: gym.logoUrl,
        openingTime: gym.openingTime,
        closingTime: gym.closingTime,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
        amenities: [],
        createdAt: gym.createdAt
      };
    }));

    res.json(transformedGyms);
  } catch (error) {
    console.error('❌ Gym search error:', error);
    res.status(500).json({ success: false, message: 'Error searching gyms', error: error.message });
  }
});

// ✅ Get Gym Membership Plans [GET] /:id/membership-plans (Public)
// IMPORTANT: Must come BEFORE /:id route to avoid being caught by it
router.get('/:id/membership-plans', async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id).select('membershipPlans gymName');
    
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    // Return membership plans with proper structure
    let plans = gym.membershipPlans || [];
    
    // Ensure we have default plans if none exist
    if (plans.length === 0) {
      plans = [
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

    // Transform to match frontend Membership model
    const memberships = plans.map((plan, index) => ({
      id: `${req.params.id}_${plan.name}`,
      _id: `${req.params.id}_${plan.name}`,
      gymId: req.params.id,
      name: plan.name,
      description: plan.note || `${plan.name} membership plan`,
      price: plan.price,
      duration: plan.discountMonths > 0 ? plan.discountMonths * 30 : 30, // days
      durationType: plan.discountMonths > 0 ? 'month' : 'month',
      features: plan.benefits || [],
      isPopular: plan.name === 'Standard',
      createdAt: new Date().toISOString()
    }));

    res.json({ 
      success: true, 
      memberships,
      data: memberships
    });
  } catch (error) {
    console.error('❌ Get membership plans error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching membership plans', 
      error: error.message 
    });
  }
});

// ⭐ Password Reset Routes (MUST be before /:id route to avoid conflicts)
router.post('/request-password-otp', require('../controllers/gymController').requestPasswordChangeOTP);
router.post('/verify-password-otp', require('../controllers/gymController').verifyPasswordChangeOTP);

// OPTIONS preflight for password reset endpoints
router.options('/request-password-otp', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.options('/verify-password-otp', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// ✅ Gym Admin Dashboard Stats [GET] /dashboard
router.get('/dashboard', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Gym ID not found' 
      });
    }

    // Import Member model
    const Member = require('../models/Member');

    // Get all members for this gym to calculate active subscriptions
    const allMembers = await Member.find({ gym: gymId });
    
    // Calculate active subscriptions by checking membershipValidUntil string date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeSubscriptions = allMembers.filter(member => {
      if (!member.membershipValidUntil) return false;
      try {
        const validUntil = new Date(member.membershipValidUntil);
        return validUntil >= today;
      } catch (e) {
        return false;
      }
    }).length;

    // Get other stats in parallel
    const [
      payments,
      trialBookings,
      trainers,
      gym
    ] = await Promise.all([
      Payment.find({ gymId: gymId }),
      TrialBooking.countDocuments({ gymId: gymId }),
      Trainer.countDocuments({ gym: gymId, status: 'approved' }),
      Gym.findById(gymId)
    ]);

    // Calculate revenue
    const combinedTotalRevenue = payments.reduce((sum, payment) => {
      return sum + (payment.amount || 0);
    }, 0);

    // Calculate growth percentages (simplified - you can enhance this)
    const usersGrowthPercentage = 5.2; // You can calculate this from historical data
    const revenueGrowthPercentage = 12.5;

    res.json({
      success: true,
      totalUsers: allMembers.length,
      activeSubscriptions,
      combinedTotalRevenue,
      totalPayments: payments.length,
      totalTrialBookings: trialBookings,
      activeTrainers: trainers,
      usersGrowthPercentage,
      revenueGrowthPercentage,
      gymName: gym?.gymName || 'Your Gym',
      gymId: gymId
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard stats', 
      error: error.message 
    });
  }
});

// ✅ Get Recent Activities for Gym Admin [GET] /activities
router.get('/activities', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin.gym;
    const limit = parseInt(req.query.limit) || 10;

    const Activity = require('../models/Activity');
    
    const activities = await Activity.find({ gym: gymId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
});

// ⭐ Gym Photos Routes - Must come before /:id route
// Using optionalSingleUpload to support both Cloudinary URL (JSON) and file uploads
router.post('/photos', gymadminAuth, optionalSingleUpload('photo'), require('../controllers/gymController').uploadGymPhoto);
router.get('/photos', gymadminAuth, require('../controllers/gymController').getAllGymPhotos);
router.patch('/photos/:photoId', gymadminAuth, optionalSingleUpload('photo'), require('../controllers/gymController').updateGymPhoto);
router.delete('/photos/:photoId', gymadminAuth, require('../controllers/gymController').deleteGymPhoto);

// ✅ Get Gym by ID [GET] /:id (Public)
router.get('/:id', async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id)
      .select('gymName email phone location description gymPhotos logoUrl openingTime closingTime membersCount equipment activities membershipPlans createdAt')
      .lean();

    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    // Get review stats
    const Review = require('../models/Review');
    const reviews = await Review.find({ gym: gym._id, isActive: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    const transformed = {
      _id: gym._id,
      id: gym._id.toString(),
      gymName: gym.gymName,
      name: gym.gymName,
      email: gym.email,
      phone: gym.phone,
      description: gym.description || '',
      location: gym.location,
      address: gym.location?.address || '',
      city: gym.location?.city,
      state: gym.location?.state,
      pincode: gym.location?.pincode,
      latitude: gym.location?.lat || 0,
      longitude: gym.location?.lng || 0,
      gymPhotos: gym.gymPhotos || [],
      images: (gym.gymPhotos || []).map(p => p.imageUrl).filter(Boolean),
      logoUrl: gym.logoUrl,
      openingTime: gym.openingTime,
      closingTime: gym.closingTime,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      amenities: (gym.activities || []).map(a => a.name),
      equipment: gym.equipment || [],
      membershipPlans: gym.membershipPlans || [],
      createdAt: gym.createdAt
    };

    console.log(`📊 Fetching gym ${gym._id}: Equipment count = ${(gym.equipment || []).length}`);
    
    res.json({ success: true, gym: transformed, data: transformed });
  } catch (error) {
    console.error('❌ Get gym error:', error);
    res.status(500).json({ success: false, message: 'Error fetching gym', error: error.message });
  }
});

// 🔒 Get My Profile [GET] /profile/me
// ⭐ Gym Admin Login [POST] /login
router.post('/login', require('../controllers/gymController').login);

// � Validate Token [POST] /validate-token
router.post('/validate-token', require('../controllers/gymController').validateToken);

// �📍 Update location info after login [POST] /update-location
router.post('/update-location', async (req, res) => {
  try {
    const { token, locationInfo } = req.body;
    
    if (!token || !locationInfo) {
      return res.status(400).json({ success: false, message: 'Token and location info required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const gymId = decoded.admin?.id;

    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    console.log(`📍 Location update for gym ${gymId}:`, locationInfo);
    
    // You can store this in database if needed, for now just log it
    res.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

// 📧 Test email functionality [POST] /test-email
router.post('/test-email', gymadminAuth, async (req, res) => {
  try {
    const { testType = 'login' } = req.body;
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }

    const EmailService = require('../services/emailService');
    const emailService = new EmailService();

    if (testType === 'login') {
      const testLoginDetails = {
        timestamp: new Date().toLocaleString('en-US', { 
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        ip: req.ip || 'Test IP',
        device: 'Windows - Chrome 118.0',
        browser: 'Chrome 118.0',
        os: 'Windows 10',
        userAgent: 'Test User Agent',
        screen: '1920x1080',
        timezone: 'Asia/Kolkata',
        location: 'Mumbai, Maharashtra, India',
        city: 'Mumbai',
        country: 'India',
        coordinates: { lat: 19.0760, lng: 72.8777 },
        method: 'test'
      };

      await emailService.sendLoginAlert(
        gym.email,
        gym.contactPerson || gym.gymName,
        testLoginDetails
      );

      res.json({ 
        success: true, 
        message: `Test login notification email sent to ${gym.email}` 
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid test type' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
});

// ⭐ Get and Update Logged-in Gym's Profile [GET, PUT] /profile/me
router.get('/profile/me', gymadminAuth, require('../controllers/gymController').getMyProfile);
router.put('/profile/me', gymadminAuth, upload.single('gymLogo'), require('../controllers/gymController').updateMyProfile);

// ⭐ Change Password for Logged-in Gym Admin [POST] /change-password
router.post('/change-password', gymadminAuth, require('../controllers/gymController').changePassword);



// 🔐 2FA Management Routes (placed early to avoid conflicts with /:id route)

// Enable Email-based 2FA for gym admin
router.post('/enable-email-2fa', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    console.log(`🔐 Enable Email 2FA request from gym ID: ${gymId}`);
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    // Find or create SecuritySettings for this gym
    let securitySettings = await SecuritySettings.findOne({ gymId });
    if (!securitySettings) {
      securitySettings = new SecuritySettings({ 
        gymId,
        twoFactorEnabled: true,
        loginNotifications: { enabled: false }
      });
    } else {
      // Enable 2FA in SecuritySettings
      securitySettings.twoFactorEnabled = true;
    }
    await securitySettings.save();

    // Also update gym model for backward compatibility
    const gym = await Gym.findById(gymId);
    if (gym) {
      gym.twoFactorEnabled = true;
      gym.twoFactorType = 'email';
      await gym.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Email-based 2FA enabled successfully',
      twoFactorEnabled: true,
      twoFactorType: 'email'
    });
  } catch (error) {
    console.error('❌ Error enabling email 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
});

// Disable 2FA for gym admin
router.post('/disable-2fa', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    // Find or create SecuritySettings for this gym
    let securitySettings = await SecuritySettings.findOne({ gymId });
    if (!securitySettings) {
      securitySettings = new SecuritySettings({ 
        gymId,
        twoFactorEnabled: false,
        loginNotifications: { enabled: false }
      });
    } else {
      // Disable 2FA in SecuritySettings
      securitySettings.twoFactorEnabled = false;
    }
    await securitySettings.save();

    // Also update gym model for backward compatibility
    const gym = await Gym.findById(gymId);
    if (gym) {
      gym.twoFactorEnabled = false;
      gym.twoFactorType = null;
      gym.twoFactorOTP = null;
      gym.twoFactorOTPExpiry = null;
      await gym.save();
    }
    
    res.json({ 
      success: true, 
      message: '2FA disabled successfully',
      twoFactorEnabled: false
    });
  } catch (error) {
    console.error('❌ Error disabling 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// Get 2FA status for gym admin
router.get('/2fa-status', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    // Check SecuritySettings first
    let securitySettings = await SecuritySettings.findOne({ gymId });
    if (!securitySettings) {
      // Create default settings if they don't exist
      securitySettings = new SecuritySettings({ 
        gymId,
        twoFactorEnabled: false,
        loginNotifications: { enabled: false }
      });
      await securitySettings.save();
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    res.json({ 
      success: true,
      data: {
        enabled: securitySettings.twoFactorEnabled || false,
        twoFactorEnabled: securitySettings.twoFactorEnabled || false,
        twoFactorType: gym.twoFactorType || null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching 2FA status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch 2FA status' });
  }
});

// Verify 2FA code during login (uses temp token) - TEMPORARILY DISABLED

router.post('/verify-login-2fa', tempAuth, async (req, res) => {
  try {
    const { otp } = req.body;
    const gymId = req.admin?.id;
    
    console.log('🔐 2FA verification attempt for gym ID:', gymId);
    console.log('📋 Request body:', { otp: otp ? '******' : 'missing' });
    
    if (!gymId) {
      console.log('❌ Invalid temporary token - no gymId');
      return res.status(401).json({ success: false, message: 'Invalid temporary token' });
    }
    
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }
    
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    // Check if OTP is valid and not expired
    if (!gym.twoFactorOTP || gym.twoFactorOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    if (!gym.twoFactorOTPExpiry || gym.twoFactorOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    // Clear the OTP after successful verification
    gym.twoFactorOTP = null;
    gym.twoFactorOTPExpiry = null;
    await gym.save();
    
    // Create final login token
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
    
    console.log('✅ 2FA verification successful for:', gym.email);
    
    // Prepare gym/admin data for response
    const adminData = {
      id: gym.id,
      name: gym.gymName,
      email: gym.email,
      role: 'gym_admin',
      gymId: gym.id
    };
    
    res.json({ 
      success: true, 
      message: 'Login successful!',
      token,
      gymId: gym.id,
      admin: adminData
    });
  } catch (error) {
    console.error('❌ Error verifying login 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
  }
});


// Verify 2FA code for email-based authentication (settings management)
router.post('/verify-2fa-email', gymadminAuth, async (req, res) => {
  try {
    const { otp } = req.body;
    const gymId = req.admin?.id;
    
    console.log(`🔐 Verify Email 2FA request from gym ID: ${gymId}`);
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }
    
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    // Check if OTP is valid and not expired
    if (!gym.twoFactorOTP || gym.twoFactorOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    if (!gym.twoFactorOTPExpiry || gym.twoFactorOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    // Clear the OTP after successful verification
    gym.twoFactorOTP = null;
    gym.twoFactorOTPExpiry = null;
    await gym.save();
    
    console.log(`✅ Email 2FA verified successfully for gym: ${gym.gymName}`);
    res.json({ 
      success: true, 
      message: '2FA verification successful' 
    });
  } catch (error) {
    console.error('❌ Error verifying email 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
  }
});

// Resend 2FA OTP
router.post('/resend-2fa-email', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    const gymEmail = req.admin?.email;
    
    console.log(`🔐 Resend Email 2FA request from gym ID: ${gymId}`);
    
    if (!gymId || !gymEmail) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: 'Gym not found' });
    }
    
    // Generate new OTP
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const newOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Save new OTP to database
    gym.twoFactorOTP = newOTP;
    gym.twoFactorOTPExpiry = newOTPExpiry;
    await gym.save();
    
    // Send OTP via email
    const result = await gymController.send2FAEmail(gymEmail, newOTP, gym.gymName);
    
    if (result.success) {
      console.log(`✅ 2FA OTP resent successfully to gym: ${gym.gymName}`);
      res.json({ 
        success: true, 
        message: 'OTP resent successfully to your email' 
      });
    } else {
      console.error('❌ Failed to resend OTP email:', result.error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send OTP email' 
      });
    }
  } catch (error) {
    console.error('❌ Error resending email 2FA:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
});

// Toggle login notifications (moved before parametric routes)
router.post('/toggle-login-notifications', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    const { enabled } = req.body;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    const SecuritySettings = require('../models/SecuritySettings');
    let settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      // Create new settings document
      settings = new SecuritySettings({
        gymId,
        loginNotifications: {
          enabled: enabled || false,
          preferences: {
            email: enabled || false,
            browser: false,
            suspiciousOnly: false,
            newLocation: enabled || false
          }
        }
      });
    } else {
      // Update existing settings
      settings.loginNotifications = settings.loginNotifications || {};
      settings.loginNotifications.enabled = enabled || false;
      
      if (!settings.loginNotifications.preferences) {
        settings.loginNotifications.preferences = {
          email: enabled || false,
          browser: false,
          suspiciousOnly: false,
          newLocation: enabled || false
        };
      }
    }
    
    await settings.save();
    
    console.log(`✅ Login notifications ${enabled ? 'enabled' : 'disabled'} for gym ID: ${gymId}`);
    
    res.json({
      success: true,
      message: `Login notifications ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        enabled: settings.loginNotifications.enabled,
        preferences: settings.loginNotifications.preferences
      }
    });
  } catch (error) {
    console.error('Error toggling login notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification settings' });
  }
});

// Get recent login attempts
router.get('/recent-logins', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
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

// Get login notification settings
router.get('/login-notification-status', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    const SecuritySettings = require('../models/SecuritySettings');
    const settings = await SecuritySettings.findOne({ gymId });
    
    // If no settings exist, return default (disabled)
    if (!settings) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          preferences: {
            email: false,
            browser: false,
            suspiciousOnly: false,
            newLocation: false
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        enabled: settings.loginNotifications?.enabled || false,
        preferences: settings.loginNotifications?.preferences || {
          email: false,
          browser: false,
          suspiciousOnly: false,
          newLocation: false
        }
      }
    });
  } catch (error) {
    console.error('Error getting login notification status:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification status' });
  }
});

// ✅ Get Gyms with Pending Status [GET] /status/pending
router.get('/status/pending', async (req, res) => {
  try {
    const pendingGyms = await Gym.find({ status: 'pending' }); // Adjust the query if needed
    res.status(200).json(pendingGyms); // Respond with pending gyms
  } catch (error) {
    console.error('❌ Error fetching pending gyms:', error);
    res.status(500).json({ message: 'Error fetching pending gyms' });
  }
});
// ✅ Get Gyms with Approved Status [GET] /status/approved
router.get('/status/approved', async (req, res) => {
  try {
    const approvedGyms = await Gym.find({ status: 'approved' }); // Query for gyms with status 'approved'
    res.status(200).json(approvedGyms); // Respond with approved gyms
  } catch (error) {
    console.error('❌ Error fetching approved gyms:', error);
    res.status(500).json({ message: 'Error fetching approved gyms' });
  }
});

// ✅ Get Gyms with Rejected Status [GET] /status/rejected
router.get('/status/rejected', async (req, res) => {
  try {
    const rejectedGyms = await Gym.find({ status: 'rejected' }); // Query for gyms with status 'rejected'
    res.status(200).json(rejectedGyms); // Respond with rejected gyms
  } catch (error) {
    console.error('❌ Error fetching rejected gyms:', error);
    res.status(500).json({ message: 'Error fetching rejected gyms' });
  }
});
// ✅ Get Gyms by selected cities [POST] /by-cities
router.post('/by-cities', getGymsByCities);

// ✅ Search Gyms [GET] /search
// Helper to normalize activities from query
function normalizeActivities(activities) {
  if (Array.isArray(activities)) {
    return activities.filter(a => typeof a === 'string' && a.trim() !== '');
  } else if (typeof activities === 'string' && activities.trim() !== '') {
    return [activities.trim()];
  }
  return [];
}

// Helper to build filter object
function buildGymFilter({ city, pincode, activities }) {
  const filter = { status: 'approved' };
  if (city && typeof city === 'string' && city.trim() !== '') {
    filter['location.city'] = { $regex: new RegExp(city.trim(), 'i') };
  }
  if (pincode) {
    filter['location.pincode'] = pincode;
  }
  if (activities.length > 0) {
    const cleanedActivities = activities
      .filter(a => typeof a === 'string' && a.trim() !== '')
      .map(a => new RegExp(a.trim(), 'i'));
    if (cleanedActivities.length > 0) {
      // Search in activities.name field since activities are stored as objects
      filter['activities.name'] = { $in: cleanedActivities };
    }
  }
  return filter;
}

// Helper to aggregate gyms by price
async function aggregateGymsByPrice(filter, price) {
  return Gym.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'gym',
        as: 'reviews'
      }
    },
    { $addFields: {
        minPlanPrice: {
          $let: {
            vars: {
              plansArray: {
                $cond: [
                  { $isArray: "$membershipPlans" },
                  "$membershipPlans",
                  []
                ]
              }
            },
            in: {
              $cond: [
                { $gt: [{ $size: "$$plansArray" }, 0] },
                {
                  $min: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$$plansArray",
                          as: "plan",
                          cond: { $ne: ["$$plan.price", null] }
                        }
                      },
                      as: "plan",
                      in: { $toDouble: "$$plan.price" }
                    }
                  }
                },
                null
              ]
            }
          }
        }
      }
    },
    { $match: { minPlanPrice: { $lte: price } } }
  ]);
}

router.get('/search', async (req, res) => {
  try {
    const { city, pincode, maxPrice, limit } = req.query;
    const activities = normalizeActivities(req.query.activities);

    console.log('Received activities from query:', req.query.activities);
    console.log('Normalized activityArray:', activities);

    const filter = buildGymFilter({ city, pincode, activities });

    let gyms;
    if (maxPrice && !isNaN(Number(maxPrice))) {
      gyms = await aggregateGymsByPrice(filter, Number(maxPrice));
    } else {
      // Build aggregation pipeline to include reviews
      const aggregationPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'gym',
            as: 'reviews'
          }
        }
      ];

      // Apply limit if specified
      if (limit && !isNaN(Number(limit))) {
        aggregationPipeline.push({ $limit: Number(limit) });
      }

      gyms = await Gym.aggregate(aggregationPipeline);
    }

    console.log(`✅ Found gyms: ${gyms.length}`);
    res.status(200).json(gyms);

  } catch (error) {
    console.error('❌ Error in /search:', error);
    if (error?.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    if (error?.errors) {
      console.error('❌ Mongoose errors:', error.errors);
    }
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Server error during gym search',
        error: error.message,
        stack: error.stack,
        raw: error
      });
    }
  }
});

// ✅ Get Single Gym by ID [GET] /:id
router.get('/:id', async (req, res) => {
  try {
    // Return gym regardless of status (for admin panel detail view)
    const gym = await Gym.findOne({ _id: req.params.id });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    res.status(200).json(gym);
  } catch (error) {
    console.error('❌ Failed to fetch gym with ID', req.params.id + ':', error);
    // Handle invalid ObjectId error
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid Gym ID format' });
    }
    res.status(500).json({ message: 'Error fetching gym', error: error.message });
  }
});

router.put('/activities', gymadminAuth, gymController.updateActivities);

// Session timeout settings
router.get('/security/session-timeout', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    const SecuritySettings = require('../models/SecuritySettings');
    const settings = await SecuritySettings.findOne({ gymId });
    
    const sessionSettings = settings?.sessionTimeout || { timeoutMinutes: 60, enabled: true };
    
    res.json({
      success: true,
      data: sessionSettings
    });
  } catch (error) {
    console.error('Error getting session timeout settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get session timeout settings' });
  }
});

router.post('/security/session-timeout', gymadminAuth, async (req, res) => {
  try {
    const gymId = req.admin?.id;
    const { timeoutMinutes, enabled } = req.body;
    
    if (!gymId) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    
    // Validate timeout: 5 minutes to 30 days (43200 minutes)
    if (timeoutMinutes && (timeoutMinutes < 5 || timeoutMinutes > 43200)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session timeout must be between 5 minutes and 30 days' 
      });
    }
    
    const SecuritySettings = require('../models/SecuritySettings');
    let settings = await SecuritySettings.findOne({ gymId });
    
    if (!settings) {
      settings = new SecuritySettings({
        gymId,
        sessionTimeout: {
          timeoutMinutes: timeoutMinutes || 60,
          enabled: enabled !== false
        }
      });
    } else {
      settings.sessionTimeout = {
        timeoutMinutes: timeoutMinutes || settings.sessionTimeout?.timeoutMinutes || 60,
        enabled: enabled !== false
      };
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: `Session timeout ${enabled === false ? 'disabled' : `set to ${timeoutMinutes} minutes`}`,
      data: settings.sessionTimeout
    });
  } catch (error) {
    console.error('Error updating session timeout settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update session timeout settings' });
  }
});




// Get trial bookings for a specific gym
router.get('/trial-bookings/:gymId', gymadminAuth, async (req, res) => {
  try {
    const { gymId } = req.params;
    const requestingGymId = req.admin?.id;
    
    // Ensure gym admin can only access their own gym's trial bookings
    if (gymId !== requestingGymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own gym\'s trial bookings.'
      });
    }

    const { page = 1, limit = 50, status, dateFilter, search } = req.query;
    
    // Build filter for trial bookings
    let filter = { gymId };
    
    if (status && status !== '') {
      filter.status = status;
    }
    
    // Date filtering
    if (dateFilter && dateFilter !== '') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'today':
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          filter.trialDate = { $gte: today, $lte: todayEnd };
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const tomorrowEnd = new Date(tomorrow);
          tomorrowEnd.setHours(23, 59, 59, 999);
          filter.trialDate = { $gte: tomorrow, $lte: tomorrowEnd };
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          filter.trialDate = { $gte: startOfWeek, $lte: endOfWeek };
          break;
        case 'next-week':
          const startOfNextWeek = new Date(today);
          startOfNextWeek.setDate(today.getDate() - today.getDay() + 7);
          const endOfNextWeek = new Date(startOfNextWeek);
          endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
          endOfNextWeek.setHours(23, 59, 59, 999);
          filter.trialDate = { $gte: startOfNextWeek, $lte: endOfNextWeek };
          break;
        case 'this-month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          filter.trialDate = { $gte: startOfMonth, $lte: endOfMonth };
          break;
      }
    }
    
    // Search filtering
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { preferredActivity: searchRegex }
      ];
    }

    const bookings = await TrialBooking.find(filter)
      .populate('userId', 'firstName lastName profileImage email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('name email phone trialDate trialTime preferredActivity status createdAt message bookingDate userId');

    const total = await TrialBooking.countDocuments(filter);

    // Map the data to match frontend expectations with user profile data
    const formattedBookings = bookings.map(booking => {
      const user = booking.userId;
      return {
        _id: booking._id,
        customerName: booking.name,
        email: booking.email,
        phone: booking.phone,
        preferredDate: booking.trialDate,
        preferredTime: booking.trialTime,
        fitnessGoal: booking.preferredActivity,
        status: booking.status,
        createdAt: booking.createdAt,
        message: booking.message,
        bookingDate: booking.bookingDate,
        // Add user profile data if available
        userProfile: user ? {
          profilePicture: user.profileImage,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          phone: user.phone
        } : null
      };
    });

    res.status(200).json({
      success: true,
      bookings: formattedBookings,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching trial bookings for gym:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trial bookings',
      error: error.message
    });
  }
});

// Update trial booking status for gym admin
router.put('/trial-bookings/:bookingId/status', gymadminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const gymId = req.admin?.id;

    const validStatuses = ['pending', 'confirmed', 'contacted', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const booking = await TrialBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure gym admin can only update their own gym's bookings
    if (booking.gymId.toString() !== gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own gym\'s bookings.'
      });
    }

    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking: {
        _id: booking._id,
        customerName: booking.name,
        email: booking.email,
        phone: booking.phone,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        fitnessGoal: booking.fitnessGoals,
        status: booking.status,
        createdAt: booking.createdAt,
        message: booking.message,
        age: booking.age
      }
    });
  } catch (error) {
    console.error('Error updating trial booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
});

// Confirm trial booking and send email/WhatsApp
router.put('/trial-bookings/:bookingId/confirm', gymadminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { sendEmail = true, sendWhatsApp = false, additionalMessage = '' } = req.body;
    const gymId = req.admin?.id;

    const booking = await TrialBooking.findById(bookingId).populate('userId', 'firstName lastName email');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure gym admin can only confirm their own gym's bookings
    if (booking.gymId.toString() !== gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only confirm your own gym\'s bookings.'
      });
    }

    // Get gym details for notifications
    const gym = await Gym.findById(gymId).select('gymName address phone email logoUrl');
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    // Update booking status
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    booking.updatedAt = new Date();
    if (additionalMessage) {
      booking.adminMessage = additionalMessage;
    }
    await booking.save();

    const customerEmail = booking.email;
    const customerName = booking.name;
    const customerPhone = booking.phone;
    
    let emailSent = false;
    let whatsappSent = false;
    let notifications = [];

    // Send Email Confirmation
    if (sendEmail && customerEmail) {
      const emailSubject = `🎉 Trial Booking Confirmed - ${gym.gymName} | Gym-Wale`;
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trial Booking Confirmed - Gym-Wale</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            
            <!-- Header with Gym-Wale Branding -->
            <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 40px 20px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); padding: 16px; border-radius: 50%; margin-bottom: 20px;">
                <div style="font-size: 2.5rem;">
                  <i class="fas fa-dumbbell"></i>
                </div>
              </div>
              <h1 style="margin: 0; font-size: 2.2rem; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">Gym-Wale</h1>
              <p style="margin: 0; font-size: 1.1rem; opacity: 0.9; font-weight: 500;">Your Fitness Journey Starts Here</p>
              <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                <h2 style="margin: 0; font-size: 1.6rem; font-weight: 700;">🎉 Trial Booking Confirmed!</h2>
                <p style="margin: 8px 0 0 0; font-size: 1rem; opacity: 0.95;">Get ready to transform your fitness journey</p>
              </div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              
              <!-- Personal Greeting -->
              <div style="margin-bottom: 32px;">
                <h3 style="color: #1976d2; margin: 0 0 12px 0; font-size: 1.4rem; font-weight: 600;">
                  Dear ${customerName},
                </h3>
                <p style="margin: 0; color: #374151; font-size: 1.1rem; line-height: 1.7;">
                  Congratulations! Your trial session at <strong style="color: #1976d2;">${gym.gymName}</strong> has been officially confirmed. 
                  We're thrilled to welcome you to our fitness community and can't wait to help you achieve your goals!
                </p>
              </div>

              <!-- Trial Session Details -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 24px; border-radius: 16px; margin-bottom: 32px; border-left: 6px solid #1976d2;">
                <h4 style="margin: 0 0 20px 0; color: #1976d2; font-size: 1.3rem; font-weight: 700; display: flex; align-items: center;">
                  <span style="background: #1976d2; color: white; padding: 8px; border-radius: 8px; margin-right: 12px; font-size: 1.2rem;">📅</span>
                  Your Trial Session Details
                </h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="color: #6b7280; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Date</div>
                    <div style="color: #1f2937; font-size: 1.1rem; font-weight: 700;">${booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be scheduled'}</div>
                  </div>
                  <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="color: #6b7280; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Time</div>
                    <div style="color: #1f2937; font-size: 1.1rem; font-weight: 700;">${booking.preferredTime || 'Flexible timing'}</div>
                  </div>
                  <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="color: #6b7280; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Duration</div>
                    <div style="color: #1f2937; font-size: 1.1rem; font-weight: 700;">60 minutes</div>
                  </div>
                  <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="color: #6b7280; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Activity</div>
                    <div style="color: #1f2937; font-size: 1.1rem; font-weight: 700;">${booking.activityPreference || booking.fitnessGoals || 'General Fitness'}</div>
                  </div>
                </div>
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
                  <div style="display: flex; align-items: center; color: #059669; font-weight: 700;">
                    <span style="margin-right: 8px; font-size: 1.2rem;">✅</span>
                    Status: Confirmed & Ready to Go!
                  </div>
                </div>
              </div>

              <!-- Gym Information -->
              <div style="background: white; border: 2px solid #e5e7eb; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
                <h4 style="margin: 0 0 20px 0; color: #1976d2; font-size: 1.3rem; font-weight: 700; display: flex; align-items: center;">
                  <span style="background: #1976d2; color: white; padding: 8px; border-radius: 8px; margin-right: 12px; font-size: 1.2rem;">🏋️</span>
                  Gym Information
                </h4>
                <div style="space-y: 12px;">
                  <div style="margin-bottom: 12px;"><strong style="color: #1f2937;">Name:</strong> <span style="color: #6b7280;">${gym.gymName}</span></div>
                  <div style="margin-bottom: 12px;"><strong style="color: #1f2937;">Address:</strong> <span style="color: #6b7280;">${gym.address || 'Please contact the gym for address details'}</span></div>
                  <div style="margin-bottom: 12px;"><strong style="color: #1f2937;">Phone:</strong> <span style="color: #6b7280;">${gym.phone || 'Available on website'}</span></div>
                  ${gym.email ? `<div style="margin-bottom: 12px;"><strong style="color: #1f2937;">Email:</strong> <span style="color: #6b7280;">${gym.email}</span></div>` : ''}
                </div>
              </div>

              <!-- What to Bring -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 24px; border-radius: 16px; margin-bottom: 32px; border-left: 6px solid #059669;">
                <h4 style="margin: 0 0 16px 0; color: #059669; font-size: 1.3rem; font-weight: 700; display: flex; align-items: center;">
                  <span style="background: #059669; color: white; padding: 8px; border-radius: 8px; margin-right: 12px; font-size: 1.2rem;">🎒</span>
                  What to Bring
                </h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div style="display: flex; align-items: center; color: #065f46; font-weight: 600;">
                    <span style="color: #059669; margin-right: 8px; font-size: 1.1rem;">✓</span>
                    Comfortable workout clothes
                  </div>
                  <div style="display: flex; align-items: center; color: #065f46; font-weight: 600;">
                    <span style="color: #059669; margin-right: 8px; font-size: 1.1rem;">✓</span>
                    Water bottle
                  </div>
                  <div style="display: flex; align-items: center; color: #065f46; font-weight: 600;">
                    <span style="color: #059669; margin-right: 8px; font-size: 1.1rem;">✓</span>
                    Clean towel
                  </div>
                  <div style="display: flex; align-items: center; color: #065f46; font-weight: 600;">
                    <span style="color: #059669; margin-right: 8px; font-size: 1.1rem;">✓</span>
                    Valid ID proof
                  </div>
                  <div style="display: flex; align-items: center; color: #065f46; font-weight: 600;">
                    <span style="color: #059669; margin-right: 8px; font-size: 1.1rem;">✓</span>
                    Positive attitude!
                  </div>
                  <div style="display: flex; align-items: center; color: #065f46; font-weight: 600;">
                    <span style="color: #059669; margin-right: 8px; font-size: 1.1rem;">✓</span>
                    Motivation to succeed
                  </div>
                </div>
              </div>

              ${additionalMessage ? `
              <!-- Additional Message from Gym -->
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
                <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center;">
                  <span style="margin-right: 8px; font-size: 1.2rem;">💬</span>
                  Special Message from ${gym.gymName}
                </h4>
                <p style="margin: 0; color: #78350f; font-size: 1rem; line-height: 1.6; font-style: italic;">
                  "${additionalMessage}"
                </p>
              </div>
              ` : ''}

              <!-- Call to Action -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 24px; border-radius: 16px; display: inline-block; max-width: 400px;">
                  <div style="font-size: 1.5rem; margin-bottom: 8px;">🚀</div>
                  <h3 style="margin: 0 0 8px 0; font-size: 1.4rem; font-weight: 700;">Ready to Transform?</h3>
                  <p style="margin: 0; font-size: 1rem; opacity: 0.95;">Your fitness journey begins now!</p>
                </div>
              </div>

              <!-- Support Information -->
              <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <p style="margin: 0 0 12px 0; color: #374151; font-size: 1rem; line-height: 1.6;">
                  <strong>Need to reschedule or have questions?</strong> No worries! Contact the gym directly using the information provided above, 
                  or reach out to our support team.
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">
                  We're here to help make your fitness journey as smooth as possible.
                </p>
              </div>

            </div>
            
            <!-- Footer -->
            <div style="background: #374151; color: #d1d5db; padding: 30px 20px; text-align: center;">
              <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; color: white; font-size: 1.2rem; font-weight: 700;">Thank you for choosing Gym-Wale!</h4>
                <p style="margin: 0; font-size: 1rem; opacity: 0.9;">Empowering your fitness journey, one workout at a time.</p>
              </div>
              <div style="border-top: 1px solid #4b5563; padding-top: 16px; margin-top: 16px;">
                <p style="margin: 0; font-size: 0.85rem; opacity: 0.8;">
                  This email was sent by Gym-Wale fitness management platform.<br>
                  © 2024 Gym-Wale. All rights reserved.
                </p>
              </div>
            </div>
            
          </div>
        </body>
        </html>
      `;

      try {
        // Send email confirmation
        await sendEmail(customerEmail, emailSubject, emailContent);
        emailSent = true;
        notifications.push('Email confirmation sent successfully');
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        notifications.push('Failed to send email confirmation');
      }
    }

    // Send WhatsApp Confirmation
    if (sendWhatsApp && customerPhone) {
      try {
        // WhatsApp message content
        const whatsappMessage = `🎉 *Trial Booking Confirmed!*

Hi ${customerName}! 👋

Your trial session at *${gym.gymName}* has been confirmed through Gym-Wale! 

📅 *Session Details:*
• Date: ${booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString() : 'To be scheduled'}
• Time: ${booking.preferredTime || 'Flexible timing'}
• Activity: ${booking.activityPreference || booking.fitnessGoals || 'General Fitness'}

🏋️ *Gym Information:*
• Name: ${gym.gymName}
• Address: ${gym.address || 'Contact gym for details'}
• Phone: ${gym.phone || 'Available on website'}

🎒 *What to bring:*
✓ Comfortable workout clothes
✓ Water bottle & towel
✓ Valid ID proof
✓ Positive attitude!

${additionalMessage ? `\n💬 *Special message from ${gym.gymName}:*\n"${additionalMessage}"\n` : ''}

Ready to transform your fitness journey? We can't wait to see you! 💪

Questions? Contact the gym directly or visit Gym-Wale for support.

---
*Powered by Gym-Wale - Your Fitness Journey Starts Here* 🚀`;

        // Here you would integrate with WhatsApp Business API
        // For demonstration, we'll log the message that would be sent
        console.log('WhatsApp message prepared for:', customerPhone);
        console.log('Message content:', whatsappMessage);
        
        // In a real implementation, you would use WhatsApp Business API:
        // const whatsappResult = await sendWhatsAppMessage(customerPhone, whatsappMessage);
        
        whatsappSent = true;
        notifications.push('WhatsApp confirmation prepared (integration required)');
      } catch (whatsappError) {
        console.error('Error preparing WhatsApp message:', whatsappError);
        notifications.push('Failed to prepare WhatsApp confirmation');
      }
    }

    // Prepare comprehensive response
    res.status(200).json({
      success: true,
      message: `Booking confirmed successfully! ${notifications.join('. ')}`,
      booking: {
        _id: booking._id,
        customerName: booking.name,
        email: booking.email,
        phone: booking.phone,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        fitnessGoals: booking.fitnessGoals,
        status: booking.status,
        confirmedAt: booking.confirmedAt,
        createdAt: booking.createdAt,
        adminMessage: booking.adminMessage
      },
      notifications: {
        sent: notifications,
        emailSent,
        whatsappSent,
        details: {
          emailRequested: sendEmail,
          whatsappRequested: sendWhatsApp,
          hasAdditionalMessage: !!additionalMessage
        }
      }
    });

  } catch (error) {
    console.error('Error confirming trial booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming booking',
      error: error.message
    });
  }
});

// Get trial booking statistics for gym admin dashboard
router.get('/trial-bookings/:gymId/stats', gymadminAuth, async (req, res) => {
  try {
    const { gymId } = req.params;
    const requestingGymId = req.admin?.id;
    
    // Ensure gym admin can only access their own gym's statistics
    if (gymId !== requestingGymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own gym\'s statistics.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get various statistics
    const totalBookings = await TrialBooking.countDocuments({ gymId });
    const pendingBookings = await TrialBooking.countDocuments({ gymId, status: 'pending' });
    const confirmedBookings = await TrialBooking.countDocuments({ gymId, status: 'confirmed' });
    const thisWeekBookings = await TrialBooking.countDocuments({ 
      gymId, 
      createdAt: { $gte: startOfWeek, $lte: endOfWeek }
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        thisWeek: thisWeekBookings
      }
    });
  } catch (error) {
    console.error('Error fetching trial booking statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;
