const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const execAsync = util.promisify(exec);

class FingerprintService {
    constructor() {
        this.activeDevices = new Map();
        this.templates = new Map();
        this.enrollmentSessions = new Map();
    }

    // Initialize fingerprint device
    async initializeDevice(deviceInfo) {
        try {
            const { vendor, model, deviceId } = deviceInfo;
            
            switch (vendor.toLowerCase()) {
                case 'secugen':
                    return await this.initializeSecuGenDevice(deviceInfo);
                case 'digitalpersona':
                    return await this.initializeDigitalPersonaDevice(deviceInfo);
                case 'futronic':
                    return await this.initializeFutronicDevice(deviceInfo);
                case 'morpho':
                    return await this.initializeMorphoDevice(deviceInfo);
                default:
                    throw new Error(`Unsupported fingerprint device vendor: ${vendor}`);
            }
        } catch (error) {
            console.error('Error initializing fingerprint device:', error);
            throw error;
        }
    }

    // Initialize SecuGen device
    async initializeSecuGenDevice(deviceInfo) {
        const dllPath = path.join(__dirname, '..', 'sdks', 'fingerprint', 'secugen', 'SGFPLib.dll');
        
        // Create mock SecuGen wrapper
        const secugenWrapper = {
            deviceId: deviceInfo.deviceId,
            vendor: 'SecuGen',
            model: deviceInfo.model,
            initialized: true,
            capabilities: {
                imageWidth: 300,
                imageHeight: 400,
                resolution: 500, // DPI
                imageFormat: 'RAW',
                templateFormat: 'ANSI-378'
            },
            
            // Simulate device operations
            async captureImage() {
                // Simulate image capture delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Return mock fingerprint image data
                return {
                    success: true,
                    imageData: Buffer.alloc(120000), // 300x400 grayscale
                    quality: Math.floor(Math.random() * 40) + 60, // 60-100
                    width: 300,
                    height: 400
                };
            },
            
            async extractTemplate(imageData) {
                // Simulate template extraction
                await new Promise(resolve => setTimeout(resolve, 800));
                
                return {
                    success: true,
                    template: this.generateMockTemplate(),
                    quality: Math.floor(Math.random() * 30) + 70
                };
            },
            
            async verifyTemplate(template1, template2) {
                // Simulate template matching
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const matchScore = Math.random() * 100;
                return {
                    success: true,
                    matched: matchScore > 75,
                    confidence: Math.floor(matchScore),
                    matchScore
                };
            },
            
            generateMockTemplate() {
                // Generate mock ANSI-378 template
                const minutiae = [];
                const minutiaeCount = Math.floor(Math.random() * 30) + 20; // 20-50 minutiae
                
                for (let i = 0; i < minutiaeCount; i++) {
                    minutiae.push({
                        x: Math.floor(Math.random() * 300),
                        y: Math.floor(Math.random() * 400),
                        angle: Math.floor(Math.random() * 360),
                        type: Math.random() > 0.5 ? 'ridge_ending' : 'bifurcation',
                        quality: Math.floor(Math.random() * 40) + 60
                    });
                }
                
                return {
                    format: 'ANSI-378',
                    minutiae,
                    imageInfo: {
                        width: 300,
                        height: 400,
                        resolution: 500
                    }
                };
            }
        };
        
        this.activeDevices.set(deviceInfo.deviceId, secugenWrapper);
        return secugenWrapper;
    }

    // Initialize DigitalPersona device
    async initializeDigitalPersonaDevice(deviceInfo) {
        const digitalPersonaWrapper = {
            deviceId: deviceInfo.deviceId,
            vendor: 'DigitalPersona',
            model: deviceInfo.model,
            initialized: true,
            capabilities: {
                imageWidth: 355,
                imageHeight: 391,
                resolution: 512, // DPI
                imageFormat: 'BMP',
                templateFormat: 'DigitalPersona'
            },
            
            async captureImage() {
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                return {
                    success: true,
                    imageData: Buffer.alloc(138805), // 355x391 grayscale
                    quality: Math.floor(Math.random() * 35) + 65,
                    width: 355,
                    height: 391
                };
            },
            
            async extractTemplate(imageData) {
                await new Promise(resolve => setTimeout(resolve, 600));
                
                return {
                    success: true,
                    template: this.generateDigitalPersonaTemplate(),
                    quality: Math.floor(Math.random() * 25) + 75
                };
            },
            
            async verifyTemplate(template1, template2) {
                await new Promise(resolve => setTimeout(resolve, 150));
                
                const matchScore = Math.random() * 100;
                return {
                    success: true,
                    matched: matchScore > 80,
                    confidence: Math.floor(matchScore),
                    matchScore
                };
            },
            
            generateDigitalPersonaTemplate() {
                return {
                    format: 'DigitalPersona',
                    data: Buffer.alloc(1024).toString('base64'),
                    features: Math.floor(Math.random() * 40) + 25,
                    imageInfo: {
                        width: 355,
                        height: 391,
                        resolution: 512
                    }
                };
            }
        };
        
        this.activeDevices.set(deviceInfo.deviceId, digitalPersonaWrapper);
        return digitalPersonaWrapper;
    }

    // Initialize Futronic device
    async initializeFutronicDevice(deviceInfo) {
        const futronicWrapper = {
            deviceId: deviceInfo.deviceId,
            vendor: 'Futronic',
            model: deviceInfo.model,
            initialized: true,
            capabilities: {
                imageWidth: 320,
                imageHeight: 480,
                resolution: 500, // DPI
                imageFormat: 'RAW',
                templateFormat: 'ISO-19794-2'
            },
            
            async captureImage() {
                await new Promise(resolve => setTimeout(resolve, 1800));
                
                return {
                    success: true,
                    imageData: Buffer.alloc(153600), // 320x480 grayscale
                    quality: Math.floor(Math.random() * 35) + 55,
                    width: 320,
                    height: 480
                };
            },
            
            async extractTemplate(imageData) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                return {
                    success: true,
                    template: this.generateISO19794Template(),
                    quality: Math.floor(Math.random() * 30) + 65
                };
            },
            
            async verifyTemplate(template1, template2) {
                await new Promise(resolve => setTimeout(resolve, 250));
                
                const matchScore = Math.random() * 100;
                return {
                    success: true,
                    matched: matchScore > 70,
                    confidence: Math.floor(matchScore),
                    matchScore
                };
            },
            
            generateISO19794Template() {
                return {
                    format: 'ISO-19794-2',
                    data: Buffer.alloc(512).toString('base64'),
                    minutiaeCount: Math.floor(Math.random() * 35) + 15,
                    imageInfo: {
                        width: 320,
                        height: 480,
                        resolution: 500
                    }
                };
            }
        };
        
        this.activeDevices.set(deviceInfo.deviceId, futronicWrapper);
        return futronicWrapper;
    }

    // Initialize Morpho device
    async initializeMorphoDevice(deviceInfo) {
        const morphoWrapper = {
            deviceId: deviceInfo.deviceId,
            vendor: 'Morpho',
            model: deviceInfo.model,
            initialized: true,
            capabilities: {
                imageWidth: 256,
                imageHeight: 360,
                resolution: 500, // DPI
                imageFormat: 'WSQ',
                templateFormat: 'Morpho'
            },
            
            async captureImage() {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                return {
                    success: true,
                    imageData: Buffer.alloc(92160), // 256x360 grayscale
                    quality: Math.floor(Math.random() * 40) + 60,
                    width: 256,
                    height: 360
                };
            },
            
            async extractTemplate(imageData) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                return {
                    success: true,
                    template: this.generateMorphoTemplate(),
                    quality: Math.floor(Math.random() * 35) + 65
                };
            },
            
            async verifyTemplate(template1, template2) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const matchScore = Math.random() * 100;
                return {
                    success: true,
                    matched: matchScore > 85,
                    confidence: Math.floor(matchScore),
                    matchScore
                };
            },
            
            generateMorphoTemplate() {
                return {
                    format: 'Morpho',
                    data: Buffer.alloc(768).toString('base64'),
                    features: Math.floor(Math.random() * 50) + 30,
                    imageInfo: {
                        width: 256,
                        height: 360,
                        resolution: 500
                    }
                };
            }
        };
        
        this.activeDevices.set(deviceInfo.deviceId, morphoWrapper);
        return morphoWrapper;
    }

    // Enroll fingerprint
    async enrollFingerprint(deviceId, personId, enrollmentOptions = {}) {
        const device = this.activeDevices.get(deviceId);
        if (!device) {
            throw new Error('Device not initialized');
        }
        
        const sessionId = `enrollment_${personId}_${Date.now()}`;
        const enrollmentSession = {
            sessionId,
            personId,
            deviceId,
            attempts: 0,
            maxAttempts: enrollmentOptions.maxAttempts || 3,
            templates: [],
            startTime: new Date()
        };
        
        this.enrollmentSessions.set(sessionId, enrollmentSession);
        
        try {
            // Capture multiple fingerprint samples
            for (let attempt = 0; attempt < enrollmentSession.maxAttempts; attempt++) {
                console.log(`Enrollment attempt ${attempt + 1}/${enrollmentSession.maxAttempts}`);
                
                // Capture fingerprint image
                const imageResult = await device.captureImage();
                if (!imageResult.success) {
                    throw new Error('Failed to capture fingerprint image');
                }
                
                // Extract template from image
                const templateResult = await device.extractTemplate(imageResult.imageData);
                if (!templateResult.success) {
                    throw new Error('Failed to extract fingerprint template');
                }
                
                enrollmentSession.templates.push({
                    attempt: attempt + 1,
                    template: templateResult.template,
                    quality: templateResult.quality,
                    imageQuality: imageResult.quality,
                    timestamp: new Date()
                });
                
                enrollmentSession.attempts++;
            }
            
            // Select best quality template
            const bestTemplate = enrollmentSession.templates.reduce((best, current) => 
                current.quality > best.quality ? current : best
            );
            
            // Store template
            const templateId = `fp_${personId}_${deviceId}_${Date.now()}`;
            this.templates.set(templateId, {
                templateId,
                personId,
                deviceId,
                vendor: device.vendor,
                template: bestTemplate.template,
                quality: bestTemplate.quality,
                enrollmentDate: new Date(),
                enrollmentSession: sessionId
            });
            
            // Clean up session
            this.enrollmentSessions.delete(sessionId);
            
            return {
                success: true,
                templateId,
                quality: bestTemplate.quality,
                attempts: enrollmentSession.attempts,
                enrollmentTime: new Date() - enrollmentSession.startTime
            };
            
        } catch (error) {
            this.enrollmentSessions.delete(sessionId);
            throw error;
        }
    }

    // Verify fingerprint
    async verifyFingerprint(deviceId, personId, verificationOptions = {}) {
        const device = this.activeDevices.get(deviceId);
        if (!device) {
            throw new Error('Device not initialized');
        }
        
        // Find enrolled template for person
        const enrolledTemplate = Array.from(this.templates.values())
            .find(t => t.personId === personId && t.deviceId === deviceId);
        
        if (!enrolledTemplate) {
            throw new Error('No enrolled template found for this person');
        }
        
        try {
            // Capture live fingerprint
            const imageResult = await device.captureImage();
            if (!imageResult.success) {
                throw new Error('Failed to capture fingerprint image');
            }
            
            // Extract template from captured image
            const templateResult = await device.extractTemplate(imageResult.imageData);
            if (!templateResult.success) {
                throw new Error('Failed to extract fingerprint template');
            }
            
            // Verify template against enrolled template
            const verificationResult = await device.verifyTemplate(
                enrolledTemplate.template,
                templateResult.template
            );
            
            const result = {
                success: true,
                verified: verificationResult.matched,
                confidence: verificationResult.confidence,
                matchScore: verificationResult.matchScore,
                personId,
                templateId: enrolledTemplate.templateId,
                deviceId,
                vendor: device.vendor,
                verificationTime: new Date(),
                imageQuality: imageResult.quality,
                templateQuality: templateResult.quality
            };
            
            // Update template usage
            enrolledTemplate.lastUsed = new Date();
            enrolledTemplate.usageCount = (enrolledTemplate.usageCount || 0) + 1;
            
            return result;
            
        } catch (error) {
            throw error;
        }
    }

    // Get device status
    getDeviceStatus(deviceId) {
        const device = this.activeDevices.get(deviceId);
        if (!device) {
            return null;
        }
        
        return {
            deviceId,
            vendor: device.vendor,
            model: device.model,
            status: 'connected',
            capabilities: device.capabilities,
            initialized: device.initialized
        };
    }

    // Get all device statuses
    getAllDeviceStatuses() {
        return Array.from(this.activeDevices.values()).map(device => ({
            deviceId: device.deviceId,
            vendor: device.vendor,
            model: device.model,
            status: 'connected',
            capabilities: device.capabilities,
            initialized: device.initialized
        }));
    }

    // Get enrolled templates for a person
    getPersonTemplates(personId) {
        return Array.from(this.templates.values())
            .filter(template => template.personId === personId)
            .map(template => ({
                templateId: template.templateId,
                deviceId: template.deviceId,
                vendor: template.vendor,
                quality: template.quality,
                enrollmentDate: template.enrollmentDate,
                lastUsed: template.lastUsed,
                usageCount: template.usageCount || 0
            }));
    }

    // Delete template
    deleteTemplate(templateId) {
        return this.templates.delete(templateId);
    }

    // Clean up device
    async cleanupDevice(deviceId) {
        this.activeDevices.delete(deviceId);
        
        // Remove templates for this device
        for (const [templateId, template] of this.templates.entries()) {
            if (template.deviceId === deviceId) {
                this.templates.delete(templateId);
            }
        }
        
        return true;
    }

    // Get enrollment session status
    getEnrollmentSessionStatus(sessionId) {
        return this.enrollmentSessions.get(sessionId);
    }

    // Cancel enrollment session
    cancelEnrollmentSession(sessionId) {
        return this.enrollmentSessions.delete(sessionId);
    }
}

module.exports = FingerprintService;
