const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Firebase Admin SDK (non-blocking — graceful if creds not set)
const { initializeFirebase } = require('./config/firebase');
initializeFirebase();

const app = express();

// Middleware - Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      // Production (Render)
      'https://gym-wale.onrender.com',
      'https://gym-wale-backend.onrender.com',
      'https://api.gym-wale.com',
      'https://gym-wale.com',
      'https://www.gym-wale.com',
      'https://admin.gym-wale.com',
      process.env.FRONTEND_URL,
      process.env.ADMIN_FRONTEND_URL,
      process.env.API_BASE_URL,
      // Development
      'http://localhost:5000',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://192.168.1.13:5000',
      'http://192.168.1.13:3000',
      'http://192.168.1.13:8080',
    ].filter(Boolean); // Remove undefined values
    
    // Check if origin starts with localhost, 127.0.0.1, or Render domain (for Flutter web debug)
    if (origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('192.168.1.13') ||
        origin.includes('onrender.com')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow all for development, restrict in production
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'));
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight for 10 minutes
}));

// Additional headers for better compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Image URL Transform Middleware - Removes local paths and keeps only Cloudinary URLs
const { imageUrlTransformMiddleware } = require('./middleware/imageUrlTransform');
app.use(imageUrlTransformMiddleware);

// NOTE: Static file serving removed - all images now served from Cloudinary
// Old local uploads are no longer accessible

// Initialize Notification Scheduler
const NotificationScheduler = require('./services/notificationScheduler');
const trialBookingController = require('./controllers/trialBookingController');
const { scheduleMealNotifications } = require('./services/mealNotificationScheduler');

let notificationSchedulerInstance = null;

// Database connection
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gymwale';
console.log('🔌 Attempting to connect to MongoDB...');
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
  
  // Initialize notification scheduler after DB connection
  notificationSchedulerInstance = new NotificationScheduler();
  trialBookingController.setNotificationScheduler(notificationSchedulerInstance);
  console.log('✅ Notification Scheduler initialized and connected to controllers');
  
  // Initialize meal notification scheduler
  scheduleMealNotifications();
  
  // Initialize offer scheduler for auto-expiry
  const { startOfferScheduler } = require('./services/offerScheduler');
  startOfferScheduler();
  console.log('✅ Offer Scheduler initialized for auto-expiry');
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('⚠️  Backend is running but database is not connected.');
  console.log('💡 You can still test the API but data will not be saved.');
});

// Routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const gymRoutes = require('./routes/gymRoutes');
const memberRoutes = require('./routes/memberRoutes');
const trialBookingRoutes = require('./routes/trialBookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const dietRoutes = require('./routes/dietRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userPaymentRoutes = require('./routes/userPaymentRoutes');
const offersRoutes = require('./routes/offersRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const userSettingsRoutes = require('./routes/userSettingsRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const memberProblemReportRoutes = require('./routes/memberProblemReportRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const geofenceAttendanceRoutes = require('./routes/geofenceAttendance');
const geofenceConfigRoutes = require('./routes/geofenceConfig');
const equipmentRoutes = require('./routes/equipmentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const memberLocationStatusRoutes = require('./routes/memberLocationStatus');
const qrCodeRoutes = require('./routes/qrCodeRoutes');

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/trial-bookings', trialBookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user-payments', userPaymentRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/grievances', supportRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/member-problems', memberProblemReportRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance/geofence', geofenceAttendanceRoutes);
app.use('/api/geofence-attendance', geofenceAttendanceRoutes); // Backward compatibility for member app
app.use('/api/geofence', geofenceConfigRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/member', memberLocationStatusRoutes);
app.use('/api/qr-codes', qrCodeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Gym-Wale Backend Server is running',
    timestamp: new Date().toISOString(),
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Start server


module.exports = app;
