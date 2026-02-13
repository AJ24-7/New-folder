const BiometricData = require('../models/BiometricData');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Trainer = require('../models/trainerModel');
const Gym = require('../models/gym');
const BiometricDeviceService = require('../services/biometricDeviceService');
const FingerprintService = require('../services/fingerprintService');
const FaceRecognitionService = require('../services/faceRecognitionService');
const mongoose = require('mongoose');

// Initialize services
const deviceService = new BiometricDeviceService();
const fingerprintService = new FingerprintService();
const faceRecognitionService = new FaceRecognitionService();

// Device setup and management endpoints
exports.scanForDevices = async (req, res) => {
    try {
        console.log('🔍 Scanning for biometric devices...');
        const devices = await deviceService.scanForDevices();
        
        res.json({
            success: true,
            devices,
            deviceCount: devices.length,
            message: `Found ${devices.length} biometric device(s)`
        });
    } catch (error) {
        console.error('Error scanning devices:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to scan for devices',
            details: error.message 
        });
    }
};

exports.installDeviceSupport = async (req, res) => {
    try {
        const { deviceInfo } = req.body;
        
        console.log('📦 Installing device support for:', deviceInfo.vendor, deviceInfo.model);
        const installResult = await deviceService.installDeviceSupport(deviceInfo);
        
        if (installResult.success) {
            // Initialize device in appropriate service
            if (deviceInfo.category === 'fingerprint') {
                await fingerprintService.initializeDevice(deviceInfo);
            } else if (deviceInfo.category === 'camera') {
                await faceRecognitionService.initializeDevice(deviceInfo);
            }
        }
        
        res.json(installResult);
    } catch (error) {
        console.error('Error installing device support:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to install device support',
            details: error.message 
        });
    }
};

exports.testDeviceConnection = async (req, res) => {
    try {
        const { deviceId } = req.body;
        
        console.log('🧪 Testing device connection:', deviceId);
        const testResult = await deviceService.testDeviceConnection(deviceId);
        
        res.json(testResult);
    } catch (error) {
        console.error('Error testing device:', error);
        res.status(500).json({ 
            success: false,
            error: 'Device test failed',
            details: error.message 
        });
    }
};

exports.getInstalledDevices = async (req, res) => {
    try {
        const devices = deviceService.getInstalledDevices();
        
        // Add service status for each device
        const devicesWithStatus = devices.map(device => ({
            ...device,
            serviceStatus: {
                fingerprint: device.category === 'fingerprint' ? 
                    fingerprintService.getDeviceStatus(device.deviceId) : null,
                faceRecognition: device.category === 'camera' ? 
                    faceRecognitionService.getDeviceStatus(device.deviceId) : null
            }
        }));
        
        res.json({
            success: true,
            devices: devicesWithStatus,
            deviceCount: devices.length
        });
    } catch (error) {
        console.error('Error getting devices:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get devices',
            details: error.message 
        });
    }
};

// Biometric enrollment with real device integration
exports.enrollBiometricData = async (req, res) => {
    try {
        const { 
            personId, 
            personType, 
            biometricType, 
            deviceId,
            enrollmentOptions = {}
        } = req.body;
        
        const gymId = req.admin.id;

        // Validate person exists and belongs to this gym
        let person;
        if (personType === 'Member') {
            person = await Member.findById(personId);
            if (!person || person.gym.toString() !== gymId.toString()) {
                return res.status(404).json({ error: 'Member not found or not authorized' });
            }
        } else if (personType === 'Trainer') {
            person = await Trainer.findById(personId);
            if (!person || person.gym.toString() !== gymId.toString()) {
                return res.status(404).json({ error: 'Trainer not found or not authorized' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid person type' });
        }

        let enrollmentResult;
        
        // Perform actual biometric enrollment based on type
        if (biometricType === 'fingerprint') {
            console.log(`🔐 Starting fingerprint enrollment for ${person.name || person.memberName} on device ${deviceId}`);
            enrollmentResult = await fingerprintService.enrollFingerprint(deviceId, personId, enrollmentOptions);
        } else if (biometricType === 'face') {
            console.log(`📷 Starting face enrollment for ${person.name || person.memberName} on device ${deviceId}`);
            enrollmentResult = await faceRecognitionService.enrollFace(deviceId, personId, enrollmentOptions);
        } else {
            return res.status(400).json({ error: 'Invalid biometric type' });
        }

        if (!enrollmentResult.success) {
            return res.status(400).json({ 
                error: 'Enrollment failed',
                details: enrollmentResult.error 
            });
        }

        // Check if biometric data already exists
        let biometricData = await BiometricData.findOne({
            gymId,
            personId,
            personType,
            isActive: true
        });

        const deviceInfo = deviceService.getDevice(deviceId);
        const enrollmentDevice = {
            deviceId,
            deviceType: biometricType === 'fingerprint' ? 'fingerprint_scanner' : 'camera',
            deviceModel: deviceInfo ? `${deviceInfo.vendor} ${deviceInfo.model}` : 'Unknown'
        };

        if (biometricData) {
            // Update existing biometric data
            if (biometricType === 'fingerprint') {
                biometricData.fingerprintData = {
                    template: JSON.stringify(enrollmentResult.template || enrollmentResult.templateId),
                    quality: enrollmentResult.quality,
                    enrollmentDate: new Date(),
                    templateId: enrollmentResult.templateId
                };
                if (biometricData.biometricType === 'face') {
                    biometricData.biometricType = 'both';
                } else {
                    biometricData.biometricType = 'fingerprint';
                }
            }

            if (biometricType === 'face') {
                biometricData.faceData = {
                    template: JSON.stringify(enrollmentResult.template || enrollmentResult.templateId),
                    confidence: enrollmentResult.quality,
                    enrollmentDate: new Date(),
                    templateId: enrollmentResult.templateId,
                    sampleCount: enrollmentResult.samples
                };
                if (biometricData.biometricType === 'fingerprint') {
                    biometricData.biometricType = 'both';
                } else {
                    biometricData.biometricType = 'face';
                }
            }

            biometricData.enrollmentDevice = enrollmentDevice;
            await biometricData.save();
        } else {
            // Create new biometric data
            const biometricDataObj = {
                gymId,
                personId,
                personType,
                biometricType,
                enrolledBy: gymId,
                enrollmentDevice
            };

            if (biometricType === 'fingerprint') {
                biometricDataObj.fingerprintData = {
                    template: JSON.stringify(enrollmentResult.template || enrollmentResult.templateId),
                    quality: enrollmentResult.quality,
                    enrollmentDate: new Date(),
                    templateId: enrollmentResult.templateId
                };
            }

            if (biometricType === 'face') {
                biometricDataObj.faceData = {
                    template: JSON.stringify(enrollmentResult.template || enrollmentResult.templateId),
                    confidence: enrollmentResult.quality,
                    enrollmentDate: new Date(),
                    templateId: enrollmentResult.templateId,
                    sampleCount: enrollmentResult.samples
                };
            }

            biometricData = new BiometricData(biometricDataObj);
            await biometricData.save();
        }

        console.log(`✅ Biometric enrollment completed for ${person.name || person.memberName} (${biometricType})`);

        res.json({
            success: true,
            message: `${biometricType} enrollment completed successfully`,
            biometricDataId: biometricData._id,
            enrollmentResult: {
                templateId: enrollmentResult.templateId,
                quality: enrollmentResult.quality,
                enrollmentTime: enrollmentResult.enrollmentTime,
                attempts: enrollmentResult.attempts || enrollmentResult.samples
            },
            person: {
                id: person._id,
                name: person.name || person.memberName,
                type: personType
            }
        });

    } catch (error) {
        console.error('Error enrolling biometric data:', error);
        res.status(500).json({ 
            error: 'Failed to enroll biometric data',
            details: error.message 
        });
    }
};

// Biometric verification and attendance marking with real device integration
exports.verifyBiometricAttendance = async (req, res) => {
    try {
        const {
            personId,
            personType,
            biometricType,
            deviceId,
            verificationOptions = {}
        } = req.body;

        let verificationResult;
        
        // Perform actual biometric verification based on type
        if (biometricType === 'fingerprint') {
            console.log(`🔐 Verifying fingerprint for person ${personId} on device ${deviceId}`);
            verificationResult = await fingerprintService.verifyFingerprint(deviceId, personId, verificationOptions);
        } else if (biometricType === 'face') {
            console.log(`📷 Verifying face for person ${personId} on device ${deviceId}`);
            verificationResult = await faceRecognitionService.verifyFace(deviceId, personId, verificationOptions);
        } else {
            return res.status(400).json({ error: 'Invalid biometric type' });
        }

        if (!verificationResult.success) {
            return res.status(400).json({ 
                error: 'Verification failed',
                details: verificationResult.error 
            });
        }

        // If verification passed, create attendance record
        if (verificationResult.verified) {
            const attendanceData = {
                gymId: req.admin?.id || req.body.gymId,
                personId,
                personType,
                date: new Date(),
                checkInTime: new Date(),
                status: 'present',
                authenticationMethod: biometricType,
                biometricData: {
                    biometricType,
                    confidence: verificationResult.confidence,
                    deviceId,
                    templateMatched: true,
                    verificationTime: verificationResult.verificationTime || 100
                }
            };

            const attendance = new Attendance(attendanceData);
            await attendance.save();

            console.log(`✅ Attendance marked for person ${personId} using ${biometricType}`);

            res.json({
                success: true,
                verified: true,
                message: 'Biometric verification successful and attendance marked',
                attendanceId: attendance._id,
                verificationResult: {
                    confidence: verificationResult.confidence,
                    matchScore: verificationResult.matchScore || verificationResult.distance,
                    deviceId,
                    vendor: verificationResult.vendor,
                    verificationTime: verificationResult.verificationTime
                },
                attendance: {
                    checkInTime: attendance.checkInTime,
                    authenticationMethod: attendance.authenticationMethod
                }
            });
        } else {
            res.status(401).json({
                success: false,
                verified: false,
                message: 'Biometric verification failed',
                verificationResult: {
                    confidence: verificationResult.confidence,
                    matchScore: verificationResult.matchScore || verificationResult.distance,
                    threshold: verificationResult.threshold,
                    deviceId,
                    vendor: verificationResult.vendor
                }
            });
        }

    } catch (error) {
        console.error('Error verifying biometric attendance:', error);
        res.status(500).json({ 
            error: 'Failed to verify biometric attendance',
            details: error.message 
        });
    }
};

// Get biometric enrollment status
exports.getBiometricEnrollmentStatus = async (req, res) => {
    try {
        const gymId = req.admin.id;
        const { personType } = req.query;
        
        // Build query
        const query = { gymId, isActive: true };
        if (personType) {
            query.personType = personType;
        }
        
        const enrolledData = await BiometricData.find(query)
            .populate('personId', 'memberName firstName lastName name')
            .sort({ createdAt: -1 });
            
        // Get statistics
        const stats = {
            total: enrolledData.length,
            fingerprint: enrolledData.filter(d => d.biometricType === 'fingerprint' || d.biometricType === 'both').length,
            face: enrolledData.filter(d => d.biometricType === 'face' || d.biometricType === 'both').length,
            both: enrolledData.filter(d => d.biometricType === 'both').length
        };
        
        res.json({
            success: true,
            stats,
            enrolledPersons: enrolledData.map(data => ({
                personId: data.personId._id,
                personName: data.personId.memberName || data.personId.name || 
                           `${data.personId.firstName} ${data.personId.lastName}`,
                personType: data.personType,
                biometricType: data.biometricType,
                enrollmentDate: data.createdAt,
                lastVerification: data.lastVerificationDate,
                verificationCount: data.verificationCount,
                devices: {
                    fingerprint: data.fingerprintData?.templateId || null,
                    face: data.faceData?.templateId || null
                }
            }))
        });
        
    } catch (error) {
        console.error('Error getting enrollment status:', error);
        res.status(500).json({ 
            error: 'Failed to get enrollment status',
            details: error.message 
        });
    }
};

// Get biometric statistics
exports.getBiometricStats = async (req, res) => {
    try {
        const gymId = req.admin.id;

        // Get total enrolled users
        const totalEnrolled = await BiometricData.countDocuments({
            gymId,
            isActive: true
        });

        // Get statistics by biometric type
        const statsByType = await BiometricData.aggregate([
            { $match: { gymId: mongoose.Types.ObjectId(gymId), isActive: true } },
            {
                $group: {
                    _id: '$biometricType',
                    count: { $sum: 1 },
                    avgFingerprintQuality: { $avg: '$fingerprintData.quality' },
                    avgFaceConfidence: { $avg: '$faceData.confidence' }
                }
            }
        ]);

        // Get recent verification activity
        const recentActivity = await Attendance.find({
            gymId,
            authenticationMethod: { $in: ['fingerprint', 'face'] }
        })
        .populate('personId', 'memberName firstName lastName name')
        .sort({ checkInTime: -1 })
        .limit(20);

        res.json({
            success: true,
            stats: {
                totalEnrolled,
                byType: statsByType,
                recentActivity: recentActivity.map(activity => ({
                    personName: activity.personId?.memberName || activity.personId?.name || 
                               `${activity.personId?.firstName} ${activity.personId?.lastName}`,
                    method: activity.authenticationMethod,
                    time: activity.checkInTime,
                    confidence: activity.biometricData?.confidence
                }))
            }
        });

    } catch (error) {
        console.error('Error getting biometric stats:', error);
        res.status(500).json({ 
            error: 'Failed to get biometric statistics',
            details: error.message 
        });
    }
};

// Delete biometric data
exports.deleteBiometricData = async (req, res) => {
    try {
        const { biometricId } = req.params;
        const gymId = req.admin.id;
        
        const biometricData = await BiometricData.findOne({
            _id: biometricId,
            gymId
        });
        
        if (!biometricData) {
            return res.status(404).json({ error: 'Biometric data not found' });
        }
        
        // Delete templates from services
        if (biometricData.fingerprintData?.templateId) {
            fingerprintService.deleteTemplate(biometricData.fingerprintData.templateId);
        }
        
        if (biometricData.faceData?.templateId) {
            faceRecognitionService.deleteTemplate(biometricData.faceData.templateId);
        }
        
        // Mark as inactive instead of deleting
        biometricData.isActive = false;
        await biometricData.save();
        
        console.log(`🗑️ Biometric data deleted for ${biometricData.personType} ${biometricData.personId}`);
        
        res.json({
            success: true,
            message: 'Biometric data deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting biometric data:', error);
        res.status(500).json({ 
            error: 'Failed to delete biometric data',
            details: error.message 
        });
    }
};
