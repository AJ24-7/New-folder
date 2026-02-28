const AttendanceSettings = require('../models/AttendanceSettings');
const Gym = require('../models/gym');

/**
 * Get attendance settings for a gym
 * GET /api/attendance/settings
 */
exports.getAttendanceSettings = async (req, res) => {
  try {
    const gymId = req.gym?.id || req.admin?.id;

    if (!gymId) {
      return res.status(401).json({
        success: false,
        message: 'Gym ID not found in request'
      });
    }

    // Verify gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    // Find or create default settings
    let settings = await AttendanceSettings.findOne({ gym: gymId });

    if (!settings) {
      // Create default settings
      settings = new AttendanceSettings({
        gym: gymId,
        mode: 'manual',
        autoMarkEnabled: false,
        requireCheckOut: false,
        allowLateCheckIn: true,
        lateThresholdMinutes: 15,
        sendNotifications: false,
        trackDuration: true,
        geofenceSettings: {
          enabled: false,
          radius: 100,
          autoMarkEntry: true,
          autoMarkExit: true,
          allowMockLocation: false,
          minAccuracyMeters: 20
        },
        manualSettings: {
          requireApproval: false,
          allowBulkMark: true,
          enableNotes: true,
          allowedStatuses: ['present', 'absent', 'late', 'leave']
        }
      });

      await settings.save();
    }

    res.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('[GET ATTENDANCE SETTINGS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance settings',
      error: error.message
    });
  }
};

/**
 * Update attendance settings
 * PUT /api/attendance/settings
 */
exports.updateAttendanceSettings = async (req, res) => {
  try {
    const gymId = req.gym?.id || req.admin?.id;

    if (!gymId) {
      return res.status(401).json({
        success: false,
        message: 'Gym ID not found in request'
      });
    }

    const {
      mode,
      autoMarkEnabled,
      requireCheckOut,
      allowLateCheckIn,
      lateThresholdMinutes,
      sendNotifications,
      trackDuration,
      geofenceSettings,
      manualSettings
    } = req.body;

    // Find or create settings
    let settings = await AttendanceSettings.findOne({ gym: gymId });

    if (!settings) {
      settings = new AttendanceSettings({ gym: gymId });
    }

    // Update fields
    if (mode !== undefined) settings.mode = mode;
    if (autoMarkEnabled !== undefined) settings.autoMarkEnabled = autoMarkEnabled;
    if (requireCheckOut !== undefined) settings.requireCheckOut = requireCheckOut;
    if (allowLateCheckIn !== undefined) settings.allowLateCheckIn = allowLateCheckIn;
    if (lateThresholdMinutes !== undefined) settings.lateThresholdMinutes = lateThresholdMinutes;
    if (sendNotifications !== undefined) settings.sendNotifications = sendNotifications;
    if (trackDuration !== undefined) settings.trackDuration = trackDuration;

    // Update geofence settings
    if (geofenceSettings) {
      if (!settings.geofenceSettings) {
        settings.geofenceSettings = {};
      }
      Object.assign(settings.geofenceSettings, geofenceSettings);
    }

    // Update manual settings
    if (manualSettings) {
      if (!settings.manualSettings) {
        settings.manualSettings = {};
      }
      Object.assign(settings.manualSettings, manualSettings);
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Attendance settings updated successfully',
      settings: settings
    });

  } catch (error) {
    console.error('[UPDATE ATTENDANCE SETTINGS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance settings',
      error: error.message
    });
  }
};

/**
 * Reset attendance settings to default
 * POST /api/attendance/settings/reset
 */
exports.resetAttendanceSettings = async (req, res) => {
  try {
    const gymId = req.gym?.id || req.admin?.id;

    if (!gymId) {
      return res.status(401).json({
        success: false,
        message: 'Gym ID not found in request'
      });
    }

    // Delete existing settings
    await AttendanceSettings.findOneAndDelete({ gym: gymId });

    // Create default settings
    const settings = new AttendanceSettings({
      gym: gymId,
      mode: 'manual',
      autoMarkEnabled: false,
      requireCheckOut: false,
      allowLateCheckIn: true,
      lateThresholdMinutes: 15,
      sendNotifications: false,
      trackDuration: true
    });

    await settings.save();

    res.json({
      success: true,
      message: 'Attendance settings reset to default',
      settings: settings
    });

  } catch (error) {
    console.error('[RESET ATTENDANCE SETTINGS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting attendance settings',
      error: error.message
    });
  }
};

/**
 * Get attendance settings for member (public endpoint)
 * Only returns necessary info for member app
 * GET /api/gym/:gymId/attendance-settings
 */
exports.getAttendanceSettingsForMember = async (req, res) => {
  try {
    const { gymId } = req.params;

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: 'Gym ID is required'
      });
    }

    // Find gym to verify it exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    // Get attendance settings
    let settings = await AttendanceSettings.findOne({ gym: gymId });

    if (!settings) {
      // Return default settings
      return res.json({
        success: true,
        settings: {
          gymId: gymId,
          mode: 'manual',
          geofenceEnabled: false,
          requiresBackgroundLocation: false,
          autoMarkEnabled: false,
          geofenceSettings: null
        }
      });
    }

    // Return only necessary fields for member app
    const memberSettings = {
      gymId: gymId,
      mode: settings.mode,
      geofenceEnabled: settings.geofenceSettings?.enabled || false,
      requiresBackgroundLocation: settings.geofenceSettings?.enabled || false,
      autoMarkEnabled: settings.autoMarkEnabled || false,
      geofenceSettings: settings.geofenceSettings?.enabled ? {
        enabled: settings.geofenceSettings.enabled,
        latitude: settings.geofenceSettings.latitude,
        longitude: settings.geofenceSettings.longitude,
        radius: settings.geofenceSettings.radius,
        autoMarkEntry: settings.geofenceSettings.autoMarkEntry,
        autoMarkExit: settings.geofenceSettings.autoMarkExit,
        allowMockLocation: settings.geofenceSettings.allowMockLocation,
        minAccuracyMeters: settings.geofenceSettings.minAccuracyMeters
      } : null
    };

    res.json({
      success: true,
      settings: memberSettings
    });

  } catch (error) {
    console.error('[GET ATTENDANCE SETTINGS FOR MEMBER ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance settings',
      error: error.message
    });
  }
};

/**
 * Validate geofence coordinates
 * POST /api/attendance/settings/validate-geofence
 */
exports.validateGeofenceCoordinates = async (req, res) => {
  try {
    const gymId = req.gym?.id || req.admin?.id;
    const { latitude, longitude, radius } = req.body;

    if (!gymId) {
      return res.status(401).json({
        success: false,
        message: 'Gym ID not found in request'
      });
    }

    // Validate coordinates
    if (!latitude || !longitude || !radius) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and radius are required'
      });
    }

    // Validate latitude range (-90 to 90)
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be between -90 and 90'
      });
    }

    // Validate longitude range (-180 to 180)
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be between -180 and 180'
      });
    }

    // Validate radius (minimum 10 meters, maximum 1000 meters)
    if (radius < 10 || radius > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid radius. Must be between 10 and 1000 meters'
      });
    }

    res.json({
      success: true,
      message: 'Geofence coordinates are valid',
      coordinates: {
        latitude,
        longitude,
        radius
      }
    });

  } catch (error) {
    console.error('[VALIDATE GEOFENCE ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error validating geofence coordinates',
      error: error.message
    });
  }
};

/**
 * Check if attendance settings are configured
 * GET /api/attendance/settings/status
 */
exports.getAttendanceSettingsStatus = async (req, res) => {
  try {
    const gymId = req.gym?.id || req.admin?.id;

    if (!gymId) {
      return res.status(401).json({
        success: false,
        message: 'Gym ID not found in request'
      });
    }

    const settings = await AttendanceSettings.findOne({ gym: gymId });

    if (!settings) {
      return res.json({
        success: true,
        status: {
          configured: false,
          mode: 'manual',
          geofenceConfigured: false,
          requiresSetup: true
        }
      });
    }

    const geofenceConfigured = Boolean(
      settings.geofenceSettings?.enabled &&
      settings.geofenceSettings?.latitude &&
      settings.geofenceSettings?.longitude &&
      settings.geofenceSettings?.radius
    );

    res.json({
      success: true,
      status: {
        configured: true,
        mode: settings.mode,
        geofenceConfigured,
        requiresSetup: settings.mode === 'geofence' && !geofenceConfigured,
        autoMarkEnabled: settings.autoMarkEnabled
      }
    });

  } catch (error) {
    console.error('[GET ATTENDANCE SETTINGS STATUS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance settings status',
      error: error.message
    });
  }
};
