const express = require('express');
const router = express.Router();
const geofenceAttendanceController = require('../controllers/geofenceAttendanceController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Auto-mark attendance on geofence ENTER
router.post('/auto-mark/entry', geofenceAttendanceController.autoMarkEntry);

// Auto-mark exit on geofence EXIT
router.post('/auto-mark/exit', geofenceAttendanceController.autoMarkExit);

// Get attendance history
router.get('/history/:gymId', geofenceAttendanceController.getAttendanceHistory);

// Get today's attendance status
router.get('/today/:gymId', geofenceAttendanceController.getTodayAttendance);

// Get attendance statistics
router.get('/stats/:gymId', geofenceAttendanceController.getAttendanceStats);

// Verify geofence (for testing)
router.post('/verify', geofenceAttendanceController.verifyGeofence);

module.exports = router;
