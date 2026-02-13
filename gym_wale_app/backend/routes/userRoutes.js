const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const { googleAuth } = require('../controllers/userController');
const { saveWorkoutSchedule, getWorkoutSchedule, getUserCoupons, saveOfferToProfile, checkCouponValidity } = require('../controllers/userController');

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { registerUser, loginUser, updateProfile, requestPasswordResetOTP, verifyPasswordResetOTP, changePassword, getUserProfile } = require('../controllers/userController');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ======================
// ✅ Upload Config for Profile Images with Cloudinary
// ======================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym_wale_app/profile_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Check mimetype and file extension
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExt = file.originalname ? file.originalname.toLowerCase().match(/\.[^.]+$/) : null;
    
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      console.log('✅ File accepted by mimetype:', file.mimetype);
      cb(null, true);
    } else if (fileExt && allowedExts.includes(fileExt[0])) {
      console.log('✅ File accepted by extension:', fileExt[0]);
      cb(null, true);
    } else {
      console.log('❌ File rejected - mimetype:', file.mimetype, 'extension:', fileExt);
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ======================
// ✅ Auth Routes
// ======================
// OPTIONS handlers for CORS preflight
router.options('/signup', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.options('/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.options('/google-auth', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/google-auth', googleAuth);

//Workout scheduler
router.post('/workout-schedule', authMiddleware, saveWorkoutSchedule);
router.get('/workout-schedule', authMiddleware, getWorkoutSchedule);

// ======================
// ✅ Forgot Password Routes
// ======================
router.post('/request-password-reset-otp', requestPasswordResetOTP);
router.post('/verify-password-reset-otp', verifyPasswordResetOTP);
router.post('/reset-password-with-otp', verifyPasswordResetOTP); // Alias for backward compatibility

// ======================
// ✅ Profile Routes
// ======================
router.get('/profile', authMiddleware, getUserProfile); // Use the proper controller function

// ======================
// ✅ Update Profile Route with controller
// ======================
router.put('/update-profile', authMiddleware, upload.single('profileImage'), updateProfile);

// ======================
// ✅ Change Password Route
// ======================
router.put('/change-password', authMiddleware, changePassword);

// ======================
// ✅ User Coupons Routes
// ======================
router.get('/:userId/coupons', authMiddleware, getUserCoupons);
router.post('/:userId/coupons', authMiddleware, saveOfferToProfile);
router.get('/:userId/coupons/:couponId/check', authMiddleware, checkCouponValidity);

module.exports = router;
