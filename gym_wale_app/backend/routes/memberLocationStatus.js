const express = require('express');
const router = express.Router();
const memberLocationStatusController = require('../controllers/memberLocationStatusController');
const authMiddleware = require('../middleware/authMiddleware');
const gymadminAuth = require('../middleware/gymadminAuth');

/**
 * Member Location Status Routes
 * Handles real-time location tracking for geofence-based attendance
 */

// Member routes (require member authentication)
router.post('/location-status', 
  authMiddleware, 
  memberLocationStatusController.updateLocationStatus
);

router.get('/location-status/:memberId/:gymId', 
  authMiddleware, 
  memberLocationStatusController.getLocationStatus
);

router.post('/acknowledge-warning', 
  authMiddleware, 
  memberLocationStatusController.acknowledgeWarning
);

router.get('/geofence-requirements/:gymId', 
  authMiddleware, 
  memberLocationStatusController.getGeofenceRequirements
);

// Admin routes (require admin authentication)
router.get('/admin/members-location-status/:gymId', 
  gymadminAuth, 
  memberLocationStatusController.getGymMembersLocationStatus
);

router.get('/admin/members-location-issues/:gymId', 
  gymadminAuth, 
  memberLocationStatusController.getMembersWithLocationIssues
);

module.exports = router;
