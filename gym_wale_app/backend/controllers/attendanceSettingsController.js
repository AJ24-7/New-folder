const AttendanceSettings = require('../models/AttendanceSettings');
const Gym = require('../models/gym');
const GeofenceConfig = require('../models/GeofenceConfig');

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

    // ── Also load GeofenceConfig (the source-of-truth for geofence geometry) ──
    const geofenceConfig = await GeofenceConfig.findOne({ gym: gymId });

    // ── Build gym operating hours & active days for member app ──────────────
    const gymOperatingHours = gym.operatingHours || {};
    const gymActiveDays = (gym.activeDays && gym.activeDays.length > 0)
      ? gym.activeDays
      : ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

    if (!settings) {
      // Return default settings, but still include GeofenceConfig data if present
      const fallbackGeoSettings = _buildGeofenceSettingsFromConfig(geofenceConfig, gymOperatingHours);
      return res.json({
        success: true,
        settings: {
          gymId: gymId,
          mode: geofenceConfig?.enabled ? 'geofence' : 'manual',
          geofenceEnabled: geofenceConfig?.enabled || false,
          requiresBackgroundLocation: geofenceConfig?.enabled || false,
          autoMarkEnabled: geofenceConfig?.autoMarkEntry || false,
          geofenceSettings: fallbackGeoSettings,
          activeDays: gymActiveDays,
          operatingHours: {
            morning: gymOperatingHours.morning || null,
            evening: gymOperatingHours.evening || null,
          },
        }
      });
    }

    // ── Build geofenceSettings: prefer GeofenceConfig (covers polygon+circular),
    //    fall back to AttendanceSettings.geofenceSettings if no GeofenceConfig ──
    const resolvedGeoSettings = _buildGeofenceSettingsFromConfig(geofenceConfig, gymOperatingHours)
      || (settings.geofenceSettings?.enabled ? {
          enabled: settings.geofenceSettings.enabled,
          latitude: settings.geofenceSettings.latitude,
          longitude: settings.geofenceSettings.longitude,
          radius: settings.geofenceSettings.radius,
          autoMarkEntry: settings.geofenceSettings.autoMarkEntry,
          autoMarkExit: settings.geofenceSettings.autoMarkExit,
          allowMockLocation: settings.geofenceSettings.allowMockLocation,
          minAccuracyMeters: settings.geofenceSettings.minAccuracyMeters,
          type: 'circular',
          polygonCoordinates: [],
          morningShift: gymOperatingHours.morning || null,
          eveningShift: gymOperatingHours.evening || null,
        } : null);

    // Return only necessary fields for member app
    const memberSettings = {
      gymId: gymId,
      mode: settings.mode,
      geofenceEnabled: resolvedGeoSettings?.enabled || false,
      requiresBackgroundLocation: resolvedGeoSettings?.enabled || false,
      autoMarkEnabled: settings.autoMarkEnabled || resolvedGeoSettings?.autoMarkEntry || false,
      geofenceSettings: resolvedGeoSettings,
      activeDays: gymActiveDays,
      operatingHours: {
        morning: gymOperatingHours.morning || null,
        evening: gymOperatingHours.evening || null,
      },
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

// ── Helper: build member-facing geofenceSettings object from a GeofenceConfig doc
// Returns null when no config exists or config is disabled.
// gymOperatingHours is the gym.operatingHours object with morning and evening slots.
function _buildGeofenceSettingsFromConfig(config, gymOperatingHours = {}) {
  if (!config || !config.enabled) return null;

  const morningShift = gymOperatingHours?.morning || null;
  const eveningShift = gymOperatingHours?.evening || null;

  const base = {
    enabled: true,
    autoMarkEntry: config.autoMarkEntry !== false,
    autoMarkExit: config.autoMarkExit !== false,
    allowMockLocation: config.allowMockLocation || false,
    minAccuracyMeters: config.minimumAccuracy || 20,
    type: config.type || 'circular',
    polygonCoordinates: config.polygonCoordinates || [],
    // Morning & evening operating slots from the gym profile
    morningShift: morningShift,
    eveningShift: eveningShift,
    // Legacy single-window fields (keep for backward compat)
    operatingHoursStart: config.operatingHoursStart || (morningShift?.opening) || null,
    operatingHoursEnd: config.operatingHoursEnd || (eveningShift?.closing) || null,
  };

  if (config.type === 'polygon') {
    // For polygon: compute centroid as lat/lng and max vertex distance as radius
    const coords = config.polygonCoordinates || [];
    if (coords.length >= 3) {
      const sumLat = coords.reduce((s, c) => s + c.lat, 0);
      const sumLng = coords.reduce((s, c) => s + c.lng, 0);
      base.latitude = sumLat / coords.length;
      base.longitude = sumLng / coords.length;

      // Max distance from centroid to any vertex (used as bounding-circle radius)
      let maxDist = 0;
      for (const c of coords) {
        const R = 6371000;
        const dLat = (c.lat - base.latitude) * Math.PI / 180;
        const dLng = (c.lng - base.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(base.latitude * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (d > maxDist) maxDist = d;
      }
      base.radius = Math.ceil(maxDist + 20); // +20 m buffer
    }
  } else {
    // Circular
    base.latitude = config.center?.lat || null;
    base.longitude = config.center?.lng || null;
    base.radius = config.radius || 100;
  }

  return (base.latitude && base.longitude) ? base : null;
}
