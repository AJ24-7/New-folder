const MemberLocationStatus = require('../models/MemberLocationStatus');
const Member = require('../models/Member');
const AttendanceSettings = require('../models/AttendanceSettings');
const GeofenceConfig = require('../models/GeofenceConfig');

/**
 * Update member location status
 * POST /api/member/location-status
 * Called by user app to report location services status
 */
exports.updateLocationStatus = async (req, res) => {
  try {
    const { memberId, gymId } = req.body;

    if (!memberId || !gymId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID and Gym ID are required'
      });
    }

    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const {
      locationEnabled,
      locationPermission,
      backgroundLocationEnabled,
      backgroundLocationPermission,
      locationAccuracy,
      deviceInfo,
      currentLocation,
      geofenceSetup,
      appActive
    } = req.body;

    // Update or create location status
    const status = await MemberLocationStatus.updateStatus(memberId, gymId, {
      locationEnabled,
      locationPermission,
      backgroundLocationEnabled,
      backgroundLocationPermission,
      locationAccuracy,
      deviceInfo,
      currentLocation,
      geofenceSetup,
      appActive,
      lastLocationUpdate: currentLocation ? new Date() : undefined,
      lastAppOpen: appActive ? new Date() : undefined,
      lastAppClose: appActive === false ? new Date() : undefined
    });

    // Check if geofence is enabled for this gym
    const attendanceSettings = await AttendanceSettings.findOne({ gym: gymId });
    const geofenceEnabled = attendanceSettings?.geofenceSettings?.enabled ||
                           attendanceSettings?.mode === 'geofence' ||
                           attendanceSettings?.mode === 'hybrid';

    // Add warnings if geofence is enabled but location is not properly configured
    if (geofenceEnabled) {
      const warnings = [];

      if (!locationEnabled) {
        warnings.push({
          type: 'location_disabled',
          message: 'Location services are disabled. Please enable location to use automatic attendance.',
          timestamp: new Date()
        });
      }

      if (locationPermission !== 'granted') {
        warnings.push({
          type: 'permission_denied',
          message: 'Location permission not granted. Automatic attendance requires location access.',
          timestamp: new Date()
        });
      }

      if (!backgroundLocationEnabled || backgroundLocationPermission !== 'granted') {
        warnings.push({
          type: 'permission_denied',
          message: 'Background location access is required for automatic attendance. Please enable "Always Allow" location permission.',
          timestamp: new Date()
        });
      }

      if (locationAccuracy === 'low') {
        warnings.push({
          type: 'low_accuracy',
          message: 'Location accuracy is low. This may affect attendance tracking.',
          timestamp: new Date()
        });
      }

      if (!geofenceSetup?.isSetup) {
        warnings.push({
          type: 'geofence_failed',
          message: 'Geofence is not set up properly. Please restart the app or contact support.',
          timestamp: new Date()
        });
      }

      // Update warnings
      if (warnings.length > 0) {
        status.warnings = warnings;
        await status.save();
      }
    }

    res.json({
      success: true,
      message: 'Location status updated successfully',
      status: status,
      geofenceEnabled,
      hasWarnings: status.warnings.length > 0,
      warnings: status.warnings
    });

  } catch (error) {
    console.error('[UPDATE LOCATION STATUS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location status',
      error: error.message
    });
  }
};

/**
 * Get member location status
 * GET /api/member/location-status/:memberId/:gymId
 */
exports.getLocationStatus = async (req, res) => {
  try {
    const { memberId, gymId } = req.params;

    const status = await MemberLocationStatus.findOne({ memberId, gymId })
      .populate('memberId', 'memberName phone email');

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Location status not found'
      });
    }

    // Check if geofence is enabled
    const attendanceSettings = await AttendanceSettings.findOne({ gym: gymId });
    const geofenceEnabled = attendanceSettings?.geofenceSettings?.enabled ||
                           attendanceSettings?.mode === 'geofence' ||
                           attendanceSettings?.mode === 'hybrid';

    res.json({
      success: true,
      status: status,
      geofenceEnabled,
      meetsRequirements: status.meetsGeofenceRequirements(),
      isStale: status.isStale()
    });

  } catch (error) {
    console.error('[GET LOCATION STATUS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location status',
      error: error.message
    });
  }
};

/**
 * Get all members location status for a gym (Admin)
 * GET /api/admin/members-location-status/:gymId
 */
exports.getGymMembersLocationStatus = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Verify admin has access to this gym
    if (req.admin && req.admin.id !== gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all members location status
    const statuses = await MemberLocationStatus.find({ gymId })
      .populate('memberId', 'memberName phone email profileImage')
      .sort({ lastStatusUpdate: -1 });

    // Get attendance settings to check if geofence is enabled
    const attendanceSettings = await AttendanceSettings.findOne({ gym: gymId });
    const geofenceEnabled = attendanceSettings?.geofenceSettings?.enabled ||
                           attendanceSettings?.mode === 'geofence' ||
                           attendanceSettings?.mode === 'hybrid';

    // Categorize members
    const categorized = {
      fullyConfigured: [],
      locationDisabled: [],
      permissionDenied: [],
      backgroundPermissionIssue: [],
      lowAccuracy: [],
      stale: [],
      noData: []
    };

    statuses.forEach(status => {
      if (status.isStale()) {
        categorized.stale.push(status);
      } else if (status.meetsGeofenceRequirements()) {
        categorized.fullyConfigured.push(status);
      } else if (!status.locationEnabled) {
        categorized.locationDisabled.push(status);
      } else if (status.locationPermission !== 'granted') {
        categorized.permissionDenied.push(status);
      } else if (!status.backgroundLocationEnabled || status.backgroundLocationPermission !== 'granted') {
        categorized.backgroundPermissionIssue.push(status);
      } else if (status.locationAccuracy === 'low') {
        categorized.lowAccuracy.push(status);
      }
    });

    // Get members without any location status data
    const allMembers = await Member.find({ gym: gymId });
    const membersWithStatus = statuses.map(s => s.memberId._id.toString());
    const membersWithoutStatus = allMembers.filter(m => 
      !membersWithStatus.includes(m._id.toString())
    );

    categorized.noData = membersWithoutStatus;

    res.json({
      success: true,
      geofenceEnabled,
      statuses,
      categorized,
      summary: {
        total: allMembers.length,
        fullyConfigured: categorized.fullyConfigured.length,
        locationDisabled: categorized.locationDisabled.length,
        permissionDenied: categorized.permissionDenied.length,
        backgroundPermissionIssue: categorized.backgroundPermissionIssue.length,
        lowAccuracy: categorized.lowAccuracy.length,
        stale: categorized.stale.length,
        noData: categorized.noData.length
      }
    });

  } catch (error) {
    console.error('[GET GYM MEMBERS LOCATION STATUS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gym members location status',
      error: error.message
    });
  }
};

/**
 * Get members with location issues (Admin)
 * GET /api/admin/members-location-issues/:gymId
 */
exports.getMembersWithLocationIssues = async (req, res) => {
  try {
    const { gymId } = req.params;

    // Verify admin has access to this gym
    if (req.admin && req.admin.id !== gymId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const membersWithIssues = await MemberLocationStatus.getMembersWithIssues(gymId);

    res.json({
      success: true,
      count: membersWithIssues.length,
      members: membersWithIssues
    });

  } catch (error) {
    console.error('[GET MEMBERS WITH LOCATION ISSUES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching members with location issues',
      error: error.message
    });
  }
};

/**
 * Acknowledge warning (Member)
 * POST /api/member/acknowledge-warning
 */
exports.acknowledgeWarning = async (req, res) => {
  try {
    const { memberId, gymId, warningIndex } = req.body;

    const status = await MemberLocationStatus.findOne({ memberId, gymId });
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Location status not found'
      });
    }

    if (warningIndex >= 0 && warningIndex < status.warnings.length) {
      status.warnings[warningIndex].acknowledged = true;
      await status.save();
    }

    res.json({
      success: true,
      message: 'Warning acknowledged'
    });

  } catch (error) {
    console.error('[ACKNOWLEDGE WARNING ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging warning',
      error: error.message
    });
  }
};

/**
 * Get geofence requirements for a gym
 * GET /api/member/geofence-requirements/:gymId
 */
exports.getGeofenceRequirements = async (req, res) => {
  try {
    const { gymId } = req.params;

    const attendanceSettings = await AttendanceSettings.findOne({ gym: gymId });
    const geofenceConfig = await GeofenceConfig.findOne({ gymId });

    const geofenceEnabled = attendanceSettings?.geofenceSettings?.enabled ||
                           attendanceSettings?.mode === 'geofence' ||
                           attendanceSettings?.mode === 'hybrid';

    res.json({
      success: true,
      geofenceEnabled,
      requirements: {
        locationEnabled: true,
        locationPermission: 'granted',
        backgroundLocationEnabled: true,
        backgroundLocationPermission: 'granted',
        minAccuracy: attendanceSettings?.geofenceSettings?.minAccuracyMeters || 20
      },
      geofenceConfig: geofenceConfig ? {
        type: geofenceConfig.type,
        radius: geofenceConfig.radius,
        autoMarkEntry: geofenceConfig.autoMarkEntry,
        autoMarkExit: geofenceConfig.autoMarkExit,
        operatingHours: {
          start: geofenceConfig.operatingHoursStart,
          end: geofenceConfig.operatingHoursEnd
        }
      } : null,
      attendanceMode: attendanceSettings?.mode || 'manual'
    });

  } catch (error) {
    console.error('[GET GEOFENCE REQUIREMENTS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching geofence requirements',
      error: error.message
    });
  }
};

module.exports = exports;
