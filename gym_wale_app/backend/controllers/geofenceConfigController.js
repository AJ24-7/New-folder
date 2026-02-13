const GeofenceConfig = require('../models/GeofenceConfig');
const Gym = require('../models/gym');

/**
 * Get geofence configuration for a gym
 * GET /api/geofence/config?gymId=xxx
 */
exports.getGeofenceConfig = async (req, res) => {
    try {
        const { gymId } = req.query;

        if (!gymId) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID is required'
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

        // Find geofence config
        let config = await GeofenceConfig.findOne({ gym: gymId });

        // If no config exists, create a default circular geofence
        if (!config) {
            const defaultCenter = {
                lat: gym.location?.lat || 28.6139,
                lng: gym.location?.lng || 77.2090
            };

            config = new GeofenceConfig({
                gym: gymId,
                type: 'circular',
                center: defaultCenter,
                radius: gym.location?.geofenceRadius || 100,
                enabled: true,
                autoMarkEntry: true,
                autoMarkExit: true,
                allowMockLocation: false,
                minimumAccuracy: 20,
                minimumStayDuration: 5
            });

            await config.save();
        }

        res.json({
            success: true,
            config: config
        });

    } catch (error) {
        console.error('[GET GEOFENCE CONFIG ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching geofence configuration',
            error: error.message
        });
    }
};

/**
 * Save/Update geofence configuration
 * POST /api/geofence/config
 */
exports.saveGeofenceConfig = async (req, res) => {
    try {
        const {
            gymId,
            type,
            center,
            radius,
            polygonCoordinates,
            enabled,
            autoMarkEntry,
            autoMarkExit,
            allowMockLocation,
            minimumAccuracy,
            minimumStayDuration,
            operatingHoursStart,
            operatingHoursEnd
        } = req.body;

        // Validation
        if (!gymId) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID is required'
            });
        }

        if (!type || !['circular', 'polygon'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid geofence type. Must be "circular" or "polygon"'
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

        // Validate based on type
        if (type === 'circular') {
            if (!center || !center.lat || !center.lng) {
                return res.status(400).json({
                    success: false,
                    message: 'Center coordinates (lat, lng) are required for circular geofence'
                });
            }
            if (!radius || radius < 50 || radius > 500) {
                return res.status(400).json({
                    success: false,
                    message: 'Radius must be between 50 and 500 meters'
                });
            }
        } else if (type === 'polygon') {
            if (!polygonCoordinates || !Array.isArray(polygonCoordinates) || polygonCoordinates.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'At least 3 coordinates are required for polygon geofence'
                });
            }
            // Validate each coordinate
            for (const coord of polygonCoordinates) {
                if (!coord.lat || !coord.lng) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each coordinate must have lat and lng properties'
                    });
                }
            }
        }

        // Find existing config or create new one
        let config = await GeofenceConfig.findOne({ gym: gymId });

        const configData = {
            gym: gymId,
            type: type,
            enabled: enabled !== undefined ? enabled : true,
            autoMarkEntry: autoMarkEntry !== undefined ? autoMarkEntry : true,
            autoMarkExit: autoMarkExit !== undefined ? autoMarkExit : true,
            allowMockLocation: allowMockLocation !== undefined ? allowMockLocation : false,
            minimumAccuracy: minimumAccuracy || 20,
            minimumStayDuration: minimumStayDuration || 5,
            operatingHoursStart: operatingHoursStart || '06:00',
            operatingHoursEnd: operatingHoursEnd || '22:00'
        };

        if (type === 'circular') {
            configData.center = center;
            configData.radius = radius;
            configData.polygonCoordinates = []; // Clear polygon data
        } else {
            configData.polygonCoordinates = polygonCoordinates;
            configData.center = null; // Clear circular data
            configData.radius = null;
        }

        if (config) {
            // Update existing config
            Object.assign(config, configData);
            await config.save();
        } else {
            // Create new config
            config = new GeofenceConfig(configData);
            await config.save();
        }

        // Also update gym's basic location data if circular geofence
        if (type === 'circular') {
            gym.location = gym.location || {};
            gym.location.lat = center.lat;
            gym.location.lng = center.lng;
            gym.location.geofenceRadius = radius;
            await gym.save();
        }

        res.json({
            success: true,
            message: 'Geofence configuration saved successfully',
            config: config
        });

    } catch (error) {
        console.error('[SAVE GEOFENCE CONFIG ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error saving geofence configuration',
            error: error.message
        });
    }
};

/**
 * Delete geofence configuration
 * DELETE /api/geofence/config?gymId=xxx
 */
exports.deleteGeofenceConfig = async (req, res) => {
    try {
        const { gymId } = req.query;

        if (!gymId) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID is required'
            });
        }

        const result = await GeofenceConfig.findOneAndDelete({ gym: gymId });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Geofence configuration not found'
            });
        }

        res.json({
            success: true,
            message: 'Geofence configuration deleted successfully'
        });

    } catch (error) {
        console.error('[DELETE GEOFENCE CONFIG ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting geofence configuration',
            error: error.message
        });
    }
};

/**
 * Verify if a location is within the geofence
 * POST /api/geofence/verify
 */
exports.verifyLocation = async (req, res) => {
    try {
        const { gymId, latitude, longitude } = req.body;

        if (!gymId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'gymId, latitude, and longitude are required'
            });
        }

        const config = await GeofenceConfig.findOne({ gym: gymId });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Geofence configuration not found for this gym'
            });
        }

        if (!config.enabled) {
            return res.json({
                success: true,
                isWithinGeofence: false,
                message: 'Geofence is disabled for this gym'
            });
        }

        const isInside = config.containsPoint(latitude, longitude);
        const isWithinHours = config.isWithinOperatingHours();

        res.json({
            success: true,
            isWithinGeofence: isInside,
            isWithinOperatingHours: isWithinHours,
            canMarkAttendance: isInside && isWithinHours,
            message: isInside 
                ? (isWithinHours ? 'Location verified successfully' : 'Outside operating hours')
                : 'Location is outside the geofence area'
        });

    } catch (error) {
        console.error('[VERIFY LOCATION ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying location',
            error: error.message
        });
    }
};
