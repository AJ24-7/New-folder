const Attendance = require('../models/Attendance');
const Gym = require('../models/gym');
const Member = require('../models/Member');
const Membership = require('../models/Membership');
const Notification = require('../models/Notification');

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// Helper function to check if time is within allowed window
const isWithinTimeWindow = (openingTime, closingTime) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

    // Parse opening and closing times (format: "HH:MM" or "HH:MM AM/PM")
    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        
        // Handle 24-hour format (HH:MM)
        if (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        }
        
        // Handle 12-hour format (HH:MM AM/PM)
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return null;
        
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
    };

    const openTime = parseTime(openingTime);
    const closeTime = parseTime(closingTime);

    if (openTime === null || closeTime === null) {
        // If times are not set, allow 5 AM to 11 PM by default
        const defaultOpen = 5 * 60; // 5 AM
        const defaultClose = 23 * 60; // 11 PM
        return currentTime >= defaultOpen && currentTime <= defaultClose;
    }

    // Handle overnight hours (e.g., 10 PM to 2 AM)
    if (closeTime < openTime) {
        return currentTime >= openTime || currentTime <= closeTime;
    }

    return currentTime >= openTime && currentTime <= closeTime;
};

// Auto-mark attendance on geofence ENTER event
exports.autoMarkEntry = async (req, res) => {
    try {
        const { gymId, latitude, longitude, accuracy, isMockLocation } = req.body;
        const memberId = req.user.id; // Assuming JWT middleware sets req.user

        // Validation
        if (!gymId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: gymId, latitude, longitude'
            });
        }

        // Anti-fraud check: Reject mock locations
        if (isMockLocation === true) {
            console.log(`[GEOFENCE] Mock location detected for member ${memberId}`);
            return res.status(403).json({
                success: false,
                message: 'Mock locations are not allowed for attendance marking'
            });
        }

        // Fetch gym details
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({
                success: false,
                message: 'Gym not found'
            });
        }

        // Check if gym has location set
        if (!gym.location || !gym.location.lat || !gym.location.lng) {
            return res.status(400).json({
                success: false,
                message: 'Gym location not configured for geofencing'
            });
        }

        // Calculate distance from gym
        const distance = calculateDistance(
            latitude,
            longitude,
            gym.location.lat,
            gym.location.lng
        );

        const geofenceRadius = gym.location.geofenceRadius || 100;

        // Verify user is within geofence
        if (distance > geofenceRadius) {
            return res.status(403).json({
                success: false,
                message: `You are ${Math.round(distance)}m away from the gym. Must be within ${geofenceRadius}m.`,
                distance: Math.round(distance),
                requiredRadius: geofenceRadius
            });
        }

        // Check if member exists and is active
        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Check if member has an active membership
        const activeMembership = await Membership.findOne({
            memberId: memberId,
            gymId: gymId,
            status: 'active',
            endDate: { $gte: new Date() }
        });

        if (!activeMembership) {
            return res.status(403).json({
                success: false,
                message: 'No active membership found. Please renew your membership.'
            });
        }

        // Check time window
        if (!isWithinTimeWindow(gym.openingTime, gym.closingTime)) {
            return res.status(403).json({
                success: false,
                message: 'Attendance can only be marked during gym operating hours'
            });
        }

        // Get today's date at midnight for consistent date comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if attendance already marked today
        const existingAttendance = await Attendance.findOne({
            gymId: gymId,
            personId: memberId,
            personType: 'Member',
            date: today
        });

        if (existingAttendance) {
            // If already marked, update the entry time if this is a re-entry
            if (existingAttendance.geofenceEntry && existingAttendance.geofenceEntry.timestamp) {
                return res.status(200).json({
                    success: true,
                    message: 'Attendance already marked for today',
                    attendance: existingAttendance,
                    alreadyMarked: true
                });
            }

            // Update existing record with geofence entry
            existingAttendance.geofenceEntry = {
                timestamp: new Date(),
                latitude,
                longitude,
                accuracy,
                isMockLocation: isMockLocation || false,
                distanceFromGym: Math.round(distance)
            };
            existingAttendance.isGeofenceAttendance = true;
            existingAttendance.status = 'present';
            existingAttendance.checkInTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
            existingAttendance.authenticationMethod = 'geofence';

            await existingAttendance.save();

            // Send notification for updated entry
            try {
                const notification = new Notification({
                    title: '✅ Attendance Updated',
                    message: `Your attendance has been updated at ${existingAttendance.checkInTime}. Welcome back!`,
                    recipient: memberId,
                    recipientType: 'Member',
                    type: 'attendance',
                    metadata: {
                        attendanceId: existingAttendance._id,
                        gymId: gymId,
                        checkInTime: existingAttendance.checkInTime,
                        authenticationMethod: 'geofence'
                    },
                    read: false,
                    createdAt: new Date()
                });
                await notification.save();
                console.log(`📲 Attendance update notification sent to member ${memberId}`);
            } catch (notifError) {
                console.error('Failed to send attendance update notification:', notifError);
            }

            return res.status(200).json({
                success: true,
                message: 'Attendance entry recorded successfully',
                attendance: existingAttendance,
                notification: {
                    title: '✅ Attendance Updated',
                    message: 'Your attendance has been recorded. Welcome back!'
                }
            });
        }

        // Create new attendance record
        const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

        const newAttendance = new Attendance({
            gymId,
            personId: memberId,
            personType: 'Member',
            date: today,
            status: 'present',
            checkInTime: currentTime,
            authenticationMethod: 'geofence',
            isGeofenceAttendance: true,
            geofenceEntry: {
                timestamp: new Date(),
                latitude,
                longitude,
                accuracy,
                isMockLocation: isMockLocation || false,
                distanceFromGym: Math.round(distance)
            },
            deviceInfo: {
                deviceType: 'mobile',
                userAgent: req.headers['user-agent']
            }
        });

        await newAttendance.save();

        // Deduct session from membership if applicable
        if (activeMembership.sessionsRemaining && activeMembership.sessionsRemaining > 0) {
            activeMembership.sessionsRemaining -= 1;
            activeMembership.sessionsUsed = (activeMembership.sessionsUsed || 0) + 1;
            await activeMembership.save();
        }

        // Send notification to member about attendance mark
        try {
            const notification = new Notification({
                title: '✅ Attendance Marked',
                message: `Welcome to ${gym.name || 'the gym'}! Your attendance has been automatically recorded at ${currentTime}.`,
                recipient: memberId,
                recipientType: 'Member',
                type: 'attendance',
                metadata: {
                    attendanceId: newAttendance._id,
                    gymId: gymId,
                    checkInTime: currentTime,
                    authenticationMethod: 'geofence',
                    sessionsRemaining: activeMembership.sessionsRemaining
                },
                read: false,
                createdAt: new Date()
            });
            await notification.save();
            console.log(`📲 Attendance entry notification sent to member ${memberId}`);
        } catch (notifError) {
            console.error('Failed to send attendance entry notification:', notifError);
            // Don't fail the attendance marking if notification fails
        }

        return res.status(201).json({
            success: true,
            message: 'Attendance marked successfully via geofence',
            attendance: newAttendance,
            sessionsRemaining: activeMembership.sessionsRemaining,
            notification: {
                title: '✅ Attendance Marked',
                message: `Welcome! Your attendance has been automatically recorded.`
            }
        });

    } catch (error) {
        console.error('[GEOFENCE ENTRY ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark attendance',
            error: error.message
        });
    }
};

// Auto-mark exit on geofence EXIT event
exports.autoMarkExit = async (req, res) => {
    try {
        const { gymId, latitude, longitude, accuracy } = req.body;
        const memberId = req.user.id;

        // Validation
        if (!gymId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: gymId, latitude, longitude'
            });
        }

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's attendance record
        const attendance = await Attendance.findOne({
            gymId: gymId,
            personId: memberId,
            personType: 'Member',
            date: today
        });

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'No attendance entry found for today'
            });
        }

        if (!attendance.geofenceEntry || !attendance.geofenceEntry.timestamp) {
            return res.status(400).json({
                success: false,
                message: 'No geofence entry found for today'
            });
        }

        // Calculate duration inside gym
        const entryTime = new Date(attendance.geofenceEntry.timestamp);
        const exitTime = new Date();
        const durationInMinutes = Math.round((exitTime - entryTime) / (1000 * 60));

        // Minimum stay validation (prevent quick in/out fraud)
        const minimumStayMinutes = 5;
        if (durationInMinutes < minimumStayMinutes) {
            return res.status(403).json({
                success: false,
                message: `Minimum stay time is ${minimumStayMinutes} minutes. Current duration: ${durationInMinutes} minutes.`,
                durationInMinutes
            });
        }

        // Update attendance with exit information
        attendance.geofenceExit = {
            timestamp: exitTime,
            latitude,
            longitude,
            accuracy,
            durationInside: durationInMinutes
        };
        attendance.checkOutTime = exitTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

        await attendance.save();

        // Send notification to member about exit
        try {
            const gym = await Gym.findById(gymId);
            const gymName = gym ? gym.name : 'the gym';
            
            const notification = new Notification({
                title: '👋 Gym Exit Recorded',
                message: `You checked out from ${gymName} at ${attendance.checkOutTime}. Workout duration: ${durationInMinutes} minutes. Great session!`,
                recipient: memberId,
                recipientType: 'Member',
                type: 'attendance',
                metadata: {
                    attendanceId: attendance._id,
                    gymId: gymId,
                    checkOutTime: attendance.checkOutTime,
                    durationInMinutes: durationInMinutes,
                    authenticationMethod: 'geofence'
                },
                read: false,
                createdAt: new Date()
            });
            await notification.save();
            console.log(`📲 Attendance exit notification sent to member ${memberId}`);
        } catch (notifError) {
            console.error('Failed to send attendance exit notification:', notifError);
        }

        return res.status(200).json({
            success: true,
            message: 'Gym exit recorded successfully',
            attendance: attendance,
            durationInMinutes,
            notification: {
                title: '👋 Gym Exit Recorded',
                message: `Workout duration: ${durationInMinutes} minutes. Great session!`
            }
        });

    } catch (error) {
        console.error('[GEOFENCE EXIT ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to record exit',
            error: error.message
        });
    }
};

// Get attendance history for a member
exports.getAttendanceHistory = async (req, res) => {
    try {
        const { gymId } = req.params;
        const memberId = req.user.id;
        const { startDate, endDate, limit = 30 } = req.query;

        const query = {
            gymId,
            personId: memberId,
            personType: 'Member'
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendanceRecords = await Attendance.find(query)
            .sort({ date: -1 })
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            count: attendanceRecords.length,
            attendance: attendanceRecords
        });

    } catch (error) {
        console.error('[GET ATTENDANCE HISTORY ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance history',
            error: error.message
        });
    }
};

// Get today's attendance status
exports.getTodayAttendance = async (req, res) => {
    try {
        const { gymId } = req.params;
        const memberId = req.user.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            gymId,
            personId: memberId,
            personType: 'Member',
            date: today
        });

        return res.status(200).json({
            success: true,
            attendance: attendance,
            isMarked: !!attendance,
            hasCheckedOut: !!(attendance && attendance.geofenceExit)
        });

    } catch (error) {
        console.error('[GET TODAY ATTENDANCE ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve today\'s attendance',
            error: error.message
        });
    }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
    try {
        const { gymId } = req.params;
        const memberId = req.user.id;
        const { month, year } = req.query;

        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);

        const attendanceRecords = await Attendance.find({
            gymId,
            personId: memberId,
            personType: 'Member',
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const totalDays = endDate.getDate();
        const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
        const geofenceDays = attendanceRecords.filter(a => a.isGeofenceAttendance).length;
        const attendanceRate = ((presentDays / totalDays) * 100).toFixed(2);

        // Calculate average workout duration
        const durationsWithData = attendanceRecords
            .filter(a => a.geofenceExit && a.geofenceExit.durationInside)
            .map(a => a.geofenceExit.durationInside);
        
        const averageDuration = durationsWithData.length > 0
            ? Math.round(durationsWithData.reduce((sum, d) => sum + d, 0) / durationsWithData.length)
            : 0;

        return res.status(200).json({
            success: true,
            stats: {
                month: targetMonth,
                year: targetYear,
                totalDays,
                presentDays,
                geofenceDays,
                attendanceRate: parseFloat(attendanceRate),
                averageDurationMinutes: averageDuration
            }
        });

    } catch (error) {
        console.error('[GET ATTENDANCE STATS ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance statistics',
            error: error.message
        });
    }
};

// Verify geofence coordinates (for testing/debugging)
exports.verifyGeofence = async (req, res) => {
    try {
        const { gymId, latitude, longitude } = req.body;

        if (!gymId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({
                success: false,
                message: 'Gym not found'
            });
        }

        if (!gym.location || !gym.location.lat || !gym.location.lng) {
            return res.status(400).json({
                success: false,
                message: 'Gym location not configured'
            });
        }

        const distance = calculateDistance(
            latitude,
            longitude,
            gym.location.lat,
            gym.location.lng
        );

        const geofenceRadius = gym.location.geofenceRadius || 100;
        const isInsideGeofence = distance <= geofenceRadius;

        return res.status(200).json({
            success: true,
            gymLocation: {
                lat: gym.location.lat,
                lng: gym.location.lng,
                radius: geofenceRadius
            },
            userLocation: {
                lat: latitude,
                lng: longitude
            },
            distance: Math.round(distance),
            isInsideGeofence,
            message: isInsideGeofence
                ? 'You are inside the geofence'
                : `You are ${Math.round(distance - geofenceRadius)}m outside the geofence`
        });

    } catch (error) {
        console.error('[VERIFY GEOFENCE ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify geofence',
            error: error.message
        });
    }
};

module.exports = exports;
