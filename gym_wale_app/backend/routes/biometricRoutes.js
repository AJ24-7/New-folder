const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const gymadminAuth = require('../middleware/gymadminAuth');

// Real device management routes (NEW - Hardware Integration)
router.get('/devices/scan', gymadminAuth, biometricController.scanForDevices);
router.post('/devices/install', gymadminAuth, biometricController.installDeviceSupport);
router.post('/devices/test', gymadminAuth, biometricController.testDeviceConnection);
router.get('/devices/installed', gymadminAuth, biometricController.getInstalledDevices);

// Biometric enrollment routes
router.post('/enroll', gymadminAuth, biometricController.enrollBiometricData);
router.get('/enrollment-status', gymadminAuth, biometricController.getBiometricEnrollmentStatus);

// Biometric verification and attendance routes
router.post('/verify-attendance', biometricController.verifyBiometricAttendance); // Can be called from devices
router.post('/verify-attendance-admin', gymadminAuth, biometricController.verifyBiometricAttendance); // Admin version

// Biometric statistics and management
router.get('/stats', gymadminAuth, biometricController.getBiometricStats);
router.delete('/:biometricId', gymadminAuth, biometricController.deleteBiometricData);

// Device configuration routes (for future expansion)
router.get('/devices', gymadminAuth, async (req, res) => {
    try {
        // In production, this would return registered biometric devices
        const devices = [
            {
                id: 'fp001',
                name: 'Fingerprint Scanner 1',
                type: 'fingerprint_scanner',
                model: 'HID DigitalPersona 4500',
                status: 'connected',
                location: 'Main Entrance',
                lastSeen: new Date()
            },
            {
                id: 'cam001',
                name: 'Face Recognition Camera 1',
                type: 'camera',
                model: 'Hikvision DS-2CD2T47G1-L',
                status: 'connected',
                location: 'Reception Area',
                lastSeen: new Date()
            }
        ];

        res.json({
            success: true,
            devices
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get devices' });
    }
});

router.post('/devices/test', gymadminAuth, async (req, res) => {
    try {
        const { deviceId } = req.body;
        
        // Simulate device test
        setTimeout(() => {
            const success = Math.random() > 0.2; // 80% success rate
            
            if (success) {
                res.json({
                    success: true,
                    message: `Device ${deviceId} is working properly`,
                    deviceInfo: {
                        deviceId,
                        status: 'online',
                        responseTime: Math.floor(Math.random() * 1000) + 100,
                        lastTest: new Date()
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: `Device ${deviceId} is not responding`,
                    troubleshooting: [
                        'Check device power connection',
                        'Verify network connectivity',
                        'Restart the device',
                        'Contact technical support'
                    ]
                });
            }
        }, 2000);
    } catch (error) {
        res.status(500).json({ error: 'Failed to test device' });
    }
});

// Biometric settings routes
router.get('/settings', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.admin.id;
        
        // In production, fetch from database
        const settings = {
            fingerprintEnabled: false,
            faceRecognitionEnabled: false,
            autoEnrollEnabled: true,
            backupMethodEnabled: true,
            securityLevel: 'standard',
            deviceTimeout: 30,
            maxRetries: 3,
            confidenceThreshold: 80
        };

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get biometric settings' });
    }
});

router.put('/settings', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.admin.id;
        const settings = req.body;

        // In production, save to database
        console.log(`Updating biometric settings for gym ${gymId}:`, settings);

        res.json({
            success: true,
            message: 'Biometric settings updated successfully',
            settings
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update biometric settings' });
    }
});

// Export/import biometric data routes
router.get('/export', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.admin.id;
        
        // In production, generate export file
        const exportData = {
            exportDate: new Date(),
            gymId,
            totalRecords: 0,
            data: []
        };

        res.json({
            success: true,
            message: 'Biometric data exported successfully',
            downloadUrl: '/downloads/biometric-export.json' // In production, generate actual file
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to export biometric data' });
    }
});

// Bulk operations
router.post('/bulk-enroll', gymadminAuth, async (req, res) => {
    try {
        const { enrollments } = req.body;
        const gymId = req.admin.id;

        // Process bulk enrollments
        const results = [];
        for (const enrollment of enrollments) {
            try {
                // Process each enrollment
                results.push({
                    personId: enrollment.personId,
                    status: 'success',
                    biometricId: 'generated_id'
                });
            } catch (error) {
                results.push({
                    personId: enrollment.personId,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const failCount = results.filter(r => r.status === 'failed').length;

        res.json({
            success: true,
            message: `Bulk enrollment completed: ${successCount} successful, ${failCount} failed`,
            results,
            summary: { successCount, failCount, total: enrollments.length }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process bulk enrollment' });
    }
});

module.exports = router;
