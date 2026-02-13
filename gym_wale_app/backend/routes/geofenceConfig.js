const express = require('express');
const router = express.Router();
const geofenceConfigController = require('../controllers/geofenceConfigController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/geofence/config
 * @desc    Get geofence configuration for a gym
 * @access  Private (Gym Admin)
 * @query   gymId - Gym ID
 */
router.get('/config', geofenceConfigController.getGeofenceConfig);

/**
 * @route   POST /api/geofence/config
 * @desc    Save/Update geofence configuration
 * @access  Private (Gym Admin)
 * @body    { gymId, type, center, radius, polygonCoordinates, settings... }
 */
router.post('/config', geofenceConfigController.saveGeofenceConfig);

/**
 * @route   DELETE /api/geofence/config
 * @desc    Delete geofence configuration
 * @access  Private (Gym Admin)
 * @query   gymId - Gym ID
 */
router.delete('/config', geofenceConfigController.deleteGeofenceConfig);

/**
 * @route   POST /api/geofence/verify
 * @desc    Verify if a location is within the geofence
 * @access  Private
 * @body    { gymId, latitude, longitude }
 */
router.post('/verify', geofenceConfigController.verifyLocation);

module.exports = router;
