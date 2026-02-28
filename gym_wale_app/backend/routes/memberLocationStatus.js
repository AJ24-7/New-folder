const express = require('express');
const router = express.Router();
const memberLocationStatusController = require('../controllers/memberLocationStatusController');
const authenticateToken = require('../middleware/authenticateToken');
const authenticateAdmin = require('../middleware/authenticateAdmin');

/**
 * Member Location Status Routes
 * Handles real-time location tracking for geofence-based attendance
 */

// Member routes (require member authentication)
router.post('/location-status', 
  authenticateToken, 
  memberLocationStatusController.updateLocationStatus
);

router.get('/location-status/:memberId/:gymId', 
  authenticateToken, 
  memberLocationStatusController.getLocationStatus
);

router.post('/acknowledge-warning', 
  authenticateToken, 
  memberLocationStatusController.acknowledgeWarning
);

router.get('/geofence-requirements/:gymId', 
  authenticateToken, 
  memberLocationStatusController.getGeofenceRequirements
);

// Admin routes (require admin authentication)
router.get('/admin/members-location-status/:gymId', 
  authenticateAdmin, 
  memberLocationStatusController.getGymMembersLocationStatus
);

router.get('/admin/members-location-issues/:gymId', 
  authenticateAdmin, 
  memberLocationStatusController.getMembersWithLocationIssues
);

module.exports = router;
