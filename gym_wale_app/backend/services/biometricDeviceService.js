const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class BiometricDeviceService {
    constructor() {
        this.supportedDevices = {
            fingerprint: {
                'SecuGen': {
                    models: ['Hamster Pro 20', 'Hamster IV', 'Unity 20'],
                    driver: 'securegen-sdk',
                    vendorId: '0483',
                    productIds: ['2016', '2015', '2017'],
                    sdk: {
                        name: 'SecuGen SDK',
                        version: '4.21',
                        downloadUrl: 'https://www.secugen.com/download/',
                        dllPath: 'SecuGen/SGFPLib.dll'
                    }
                },
                'DigitalPersona': {
                    models: ['U.are.U 4500', 'U.are.U 5160', 'U.are.U 4000B'],
                    driver: 'digitalpersona-sdk',
                    vendorId: '05BA',
                    productIds: ['0007', '0008', '000A'],
                    sdk: {
                        name: 'DigitalPersona SDK',
                        version: '2.2.4',
                        downloadUrl: 'https://www.crossmatch.com/company/support/developers/',
                        dllPath: 'DigitalPersona/dpfpdd.dll'
                    }
                },
                'Futronic': {
                    models: ['FS88', 'FS80', 'FS90'],
                    driver: 'futronic-sdk',
                    vendorId: '1491',
                    productIds: ['0088', '0080', '0090'],
                    sdk: {
                        name: 'Futronic SDK',
                        version: '4.2',
                        downloadUrl: 'http://www.futronic-tech.com/download.html',
                        dllPath: 'Futronic/ftrScanAPI.dll'
                    }
                },
                'Morpho': {
                    models: ['MSO 1300 E3', 'MSO 1350 E3', 'CBM-E3'],
                    driver: 'morpho-sdk',
                    vendorId: '079B',
                    productIds: ['0047', '0049', '004A'],
                    sdk: {
                        name: 'Morpho SDK',
                        version: '9.0',
                        downloadUrl: 'https://www.idemia.com/biometric-readers',
                        dllPath: 'Morpho/MorphoSmart.dll'
                    }
                }
            },
            camera: {
                'Logitech': {
                    models: ['C920s HD Pro', 'BRIO 4K', 'C930e'],
                    driver: 'opencv-face-recognition',
                    vendorId: '046D',
                    productIds: ['085B', '085E', '0843'],
                    sdk: {
                        name: 'OpenCV + face_recognition',
                        version: '4.8.0',
                        pythonPackages: ['opencv-python', 'face-recognition', 'dlib'],
                        nodePackages: ['@mediapipe/face_detection', 'opencv4nodejs']
                    }
                },
                'Intel': {
                    models: ['RealSense ID F455', 'RealSense D435i'],
                    driver: 'intel-realsense',
                    vendorId: '8086',
                    productIds: ['0B07', '0B3A'],
                    sdk: {
                        name: 'Intel RealSense SDK',
                        version: '2.54.1',
                        downloadUrl: 'https://github.com/IntelRealSense/librealsense',
                        nodePackages: ['librealsense']
                    }
                },
                'Microsoft': {
                    models: ['LifeCam Studio', 'LifeCam HD-3000'],
                    driver: 'windows-hello-face',
                    vendorId: '045E',
                    productIds: ['0772', '0779'],
                    sdk: {
                        name: 'Windows Hello Face API',
                        version: '10.0',
                        windowsFeature: 'Microsoft-Windows-Hello-Face'
                    }
                },
                'Hikvision': {
                    models: ['DS-2CD2T47G1-L', 'DS-K1T341AMF'],
                    driver: 'hikvision-sdk',
                    vendorId: '2E42',
                    productIds: ['1234', '5678'],
                    sdk: {
                        name: 'Hikvision Device Network SDK',
                        version: '6.1.9.4',
                        downloadUrl: 'https://www.hikvision.com/en/support/download/sdk/',
                        dllPath: 'Hikvision/HCNetSDK.dll'
                    }
                }
            }
        };
        
        this.installedDevices = new Map();
        this.deviceConnections = new Map();
    }

    // Scan for connected USB devices
    async scanForDevices() {
        try {
            let devices = [];
            
            if (process.platform === 'win32') {
                devices = await this.scanWindowsDevices();
            } else if (process.platform === 'linux') {
                devices = await this.scanLinuxDevices();
            } else if (process.platform === 'darwin') {
                devices = await this.scanMacDevices();
            }
            
            return await this.identifyBiometricDevices(devices);
        } catch (error) {
            console.error('Error scanning for devices:', error);
            return [];
        }
    }

    // Windows device scanning using PowerShell
    async scanWindowsDevices() {
        try {
            const command = `
                Get-WmiObject -Class Win32_PnPEntity | 
                Where-Object { $_.DeviceID -like "*USB*" -and $_.Status -eq "OK" } | 
                Select-Object Name, DeviceID, Manufacturer | 
                ConvertTo-Json
            `;
            
            const { stdout } = await execAsync(`powershell -Command "${command}"`);
            const devices = JSON.parse(stdout);
            return Array.isArray(devices) ? devices : [devices];
        } catch (error) {
            console.error('Error scanning Windows devices:', error);
            return [];
        }
    }

    // Linux device scanning using lsusb
    async scanLinuxDevices() {
        try {
            const { stdout } = await execAsync('lsusb -v');
            const devices = this.parseLsusbOutput(stdout);
            return devices;
        } catch (error) {
            console.error('Error scanning Linux devices:', error);
            return [];
        }
    }

    // macOS device scanning using system_profiler
    async scanMacDevices() {
        try {
            const { stdout } = await execAsync('system_profiler SPUSBDataType -json');
            const data = JSON.parse(stdout);
            return this.parseMacUSBData(data);
        } catch (error) {
            console.error('Error scanning Mac devices:', error);
            return [];
        }
    }

    // Identify biometric devices from scan results
    async identifyBiometricDevices(scannedDevices) {
        const biometricDevices = [];
        
        for (const device of scannedDevices) {
            const identified = this.matchDeviceToSupported(device);
            if (identified) {
                biometricDevices.push(identified);
            }
        }
        
        return biometricDevices;
    }

    // Match scanned device to supported biometric devices
    matchDeviceToSupported(device) {
        for (const [category, vendors] of Object.entries(this.supportedDevices)) {
            for (const [vendor, vendorInfo] of Object.entries(vendors)) {
                const vendorId = this.extractVendorId(device);
                const productId = this.extractProductId(device);
                
                if (vendorId === vendorInfo.vendorId.toLowerCase() && 
                    vendorInfo.productIds.includes(productId)) {
                    
                    return {
                        category,
                        vendor,
                        model: this.detectModel(device, vendorInfo.models),
                        deviceInfo: device,
                        sdkInfo: vendorInfo.sdk,
                        driverInfo: vendorInfo.driver,
                        status: 'detected',
                        capabilities: this.getDeviceCapabilities(category, vendor)
                    };
                }
            }
        }
        return null;
    }

    // Extract vendor ID from device information
    extractVendorId(device) {
        if (device.DeviceID) {
            const match = device.DeviceID.match(/VID_([A-F0-9]{4})/i);
            return match ? match[1].toLowerCase() : null;
        }
        return null;
    }

    // Extract product ID from device information
    extractProductId(device) {
        if (device.DeviceID) {
            const match = device.DeviceID.match(/PID_([A-F0-9]{4})/i);
            return match ? match[1].toLowerCase() : null;
        }
        return null;
    }

    // Detect specific model from device name
    detectModel(device, models) {
        const deviceName = device.Name || device.product || '';
        for (const model of models) {
            if (deviceName.toLowerCase().includes(model.toLowerCase())) {
                return model;
            }
        }
        return models[0]; // Default to first model
    }

    // Get device capabilities
    getDeviceCapabilities(category, vendor) {
        const capabilities = {
            fingerprint: {
                'SecuGen': {
                    resolution: '500 DPI',
                    imageFormat: 'WSQ, RAW',
                    templateFormat: 'ISO 19794-2, ANSI 378',
                    liveFingerDetection: true,
                    encryptionSupport: true
                },
                'DigitalPersona': {
                    resolution: '512 DPI',
                    imageFormat: 'BMP, PNG',
                    templateFormat: 'DigitalPersona proprietary',
                    liveFingerDetection: true,
                    encryptionSupport: true
                },
                'Futronic': {
                    resolution: '500 DPI',
                    imageFormat: 'BMP, RAW',
                    templateFormat: 'ISO 19794-2',
                    liveFingerDetection: false,
                    encryptionSupport: false
                },
                'Morpho': {
                    resolution: '500 DPI',
                    imageFormat: 'WSQ, BMP',
                    templateFormat: 'ISO 19794-2, ANSI 378',
                    liveFingerDetection: true,
                    encryptionSupport: true
                }
            },
            camera: {
                'Logitech': {
                    resolution: '1080p/4K',
                    frameRate: '30 FPS',
                    faceDetection: true,
                    antiSpoofing: false,
                    infraredSupport: false
                },
                'Intel': {
                    resolution: '1080p',
                    frameRate: '30 FPS',
                    faceDetection: true,
                    antiSpoofing: true,
                    infraredSupport: true,
                    depthSensing: true
                },
                'Microsoft': {
                    resolution: '720p/1080p',
                    frameRate: '30 FPS',
                    faceDetection: true,
                    antiSpoofing: false,
                    infraredSupport: true
                },
                'Hikvision': {
                    resolution: '2MP/4MP',
                    frameRate: '25 FPS',
                    faceDetection: true,
                    antiSpoofing: true,
                    infraredSupport: true,
                    networkConnectivity: true
                }
            }
        };
        
        return capabilities[category]?.[vendor] || {};
    }

    // Install device drivers and SDKs
    async installDeviceSupport(deviceInfo) {
        try {
            const installSteps = [];
            
            // Step 1: Download and install SDK
            if (deviceInfo.sdkInfo) {
                installSteps.push(await this.installSDK(deviceInfo));
            }
            
            // Step 2: Install Node.js packages if needed
            if (deviceInfo.sdkInfo.nodePackages) {
                installSteps.push(await this.installNodePackages(deviceInfo.sdkInfo.nodePackages));
            }
            
            // Step 3: Install Python packages if needed
            if (deviceInfo.sdkInfo.pythonPackages) {
                installSteps.push(await this.installPythonPackages(deviceInfo.sdkInfo.pythonPackages));
            }
            
            // Step 4: Register device
            await this.registerDevice(deviceInfo);
            
            return {
                success: true,
                deviceId: deviceInfo.deviceId,
                installSteps,
                message: 'Device support installed successfully'
            };
        } catch (error) {
            console.error('Error installing device support:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Install SDK for device
    async installSDK(deviceInfo) {
        const { category, vendor, sdkInfo } = deviceInfo;
        
        try {
            if (category === 'fingerprint') {
                return await this.installFingerprintSDK(vendor, sdkInfo);
            } else if (category === 'camera') {
                return await this.installCameraSDK(vendor, sdkInfo);
            }
        } catch (error) {
            throw new Error(`Failed to install ${vendor} SDK: ${error.message}`);
        }
    }

    // Install fingerprint SDK
    async installFingerprintSDK(vendor, sdkInfo) {
        const sdkPath = path.join(__dirname, '..', 'sdks', 'fingerprint', vendor.toLowerCase());
        
        // Create SDK directory
        await fs.mkdir(sdkPath, { recursive: true });
        
        // Download and extract SDK (simulation - in production, use actual download)
        const mockSDKFiles = {
            'SecuGen': ['SGFPLib.dll', 'SGFPLib.h', 'libSGFP.so'],
            'DigitalPersona': ['dpfpdd.dll', 'dpfpdd.h', 'libdpfpdd.so'],
            'Futronic': ['ftrScanAPI.dll', 'ftrScanAPI.h', 'libftrScanAPI.so'],
            'Morpho': ['MorphoSmart.dll', 'MorphoSmart.h', 'libMorphoSmart.so']
        };
        
        const files = mockSDKFiles[vendor] || [];
        for (const file of files) {
            const filePath = path.join(sdkPath, file);
            await fs.writeFile(filePath, `// Mock ${vendor} SDK file: ${file}\n`);
        }
        
        return {
            step: 'SDK Installation',
            vendor,
            version: sdkInfo.version,
            path: sdkPath,
            files: files.length
        };
    }

    // Install camera SDK
    async installCameraSDK(vendor, sdkInfo) {
        const sdkPath = path.join(__dirname, '..', 'sdks', 'camera', vendor.toLowerCase());
        
        // Create SDK directory
        await fs.mkdir(sdkPath, { recursive: true });
        
        if (vendor === 'Logitech') {
            // Install OpenCV and face recognition packages
            return {
                step: 'OpenCV Installation',
                vendor,
                packages: ['opencv-python', 'face-recognition'],
                path: sdkPath
            };
        } else if (vendor === 'Intel') {
            // Install Intel RealSense SDK
            return {
                step: 'Intel RealSense SDK',
                vendor,
                version: sdkInfo.version,
                path: sdkPath
            };
        }
        
        return {
            step: 'Camera SDK Installation',
            vendor,
            path: sdkPath
        };
    }

    // Install Node.js packages
    async installNodePackages(packages) {
        try {
            const packagePath = path.join(__dirname, '..');
            const command = `npm install ${packages.join(' ')}`;
            
            const { stdout, stderr } = await execAsync(command, { cwd: packagePath });
            
            return {
                step: 'Node.js Packages',
                packages,
                output: stdout,
                errors: stderr
            };
        } catch (error) {
            throw new Error(`Failed to install Node.js packages: ${error.message}`);
        }
    }

    // Install Python packages
    async installPythonPackages(packages) {
        try {
            const command = `pip install ${packages.join(' ')}`;
            const { stdout, stderr } = await execAsync(command);
            
            return {
                step: 'Python Packages',
                packages,
                output: stdout,
                errors: stderr
            };
        } catch (error) {
            throw new Error(`Failed to install Python packages: ${error.message}`);
        }
    }

    // Register device in system
    async registerDevice(deviceInfo) {
        const deviceId = `${deviceInfo.category}_${deviceInfo.vendor}_${Date.now()}`;
        
        this.installedDevices.set(deviceId, {
            ...deviceInfo,
            deviceId,
            installedAt: new Date(),
            status: 'ready'
        });
        
        return deviceId;
    }

    // Test device connection
    async testDeviceConnection(deviceId) {
        const device = this.installedDevices.get(deviceId);
        if (!device) {
            throw new Error('Device not found');
        }
        
        try {
            // Simulate device test based on category
            if (device.category === 'fingerprint') {
                return await this.testFingerprintDevice(device);
            } else if (device.category === 'camera') {
                return await this.testCameraDevice(device);
            }
        } catch (error) {
            throw new Error(`Device test failed: ${error.message}`);
        }
    }

    // Test fingerprint device
    async testFingerprintDevice(device) {
        // Simulate fingerprint device test
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
            return {
                success: true,
                deviceId: device.deviceId,
                vendor: device.vendor,
                model: device.model,
                responseTime: Math.floor(Math.random() * 500) + 100,
                capabilities: device.capabilities,
                testResults: {
                    communication: 'OK',
                    sensor: 'OK',
                    liveFingerDetection: device.capabilities.liveFingerDetection ? 'OK' : 'N/A',
                    encryption: device.capabilities.encryptionSupport ? 'OK' : 'N/A'
                }
            };
        } else {
            throw new Error('Device not responding');
        }
    }

    // Test camera device
    async testCameraDevice(device) {
        // Simulate camera device test
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const success = Math.random() > 0.15; // 85% success rate
        
        if (success) {
            return {
                success: true,
                deviceId: device.deviceId,
                vendor: device.vendor,
                model: device.model,
                responseTime: Math.floor(Math.random() * 300) + 50,
                capabilities: device.capabilities,
                testResults: {
                    videoStream: 'OK',
                    faceDetection: device.capabilities.faceDetection ? 'OK' : 'N/A',
                    antiSpoofing: device.capabilities.antiSpoofing ? 'OK' : 'N/A',
                    infrared: device.capabilities.infraredSupport ? 'OK' : 'N/A'
                }
            };
        } else {
            throw new Error('Camera not accessible');
        }
    }

    // Get all installed devices
    getInstalledDevices() {
        return Array.from(this.installedDevices.values());
    }

    // Get device by ID
    getDevice(deviceId) {
        return this.installedDevices.get(deviceId);
    }

    // Remove device
    async removeDevice(deviceId) {
        const device = this.installedDevices.get(deviceId);
        if (!device) {
            throw new Error('Device not found');
        }
        
        // Clean up SDK files
        const sdkPath = path.join(__dirname, '..', 'sdks', device.category, device.vendor.toLowerCase());
        try {
            await fs.rmdir(sdkPath, { recursive: true });
        } catch (error) {
            console.warn('Could not remove SDK files:', error.message);
        }
        
        this.installedDevices.delete(deviceId);
        this.deviceConnections.delete(deviceId);
        
        return true;
    }

    // Helper method to parse lsusb output (Linux)
    parseLsusbOutput(output) {
        const devices = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            const match = line.match(/Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4}) (.+)/);
            if (match) {
                devices.push({
                    bus: match[1],
                    device: match[2],
                    vendorId: match[3],
                    productId: match[4],
                    name: match[5].trim()
                });
            }
        }
        
        return devices;
    }

    // Helper method to parse macOS USB data
    parseMacUSBData(data) {
        const devices = [];
        
        function extractDevices(items) {
            for (const item of items) {
                if (item._name) {
                    devices.push({
                        name: item._name,
                        vendorId: item.vendor_id,
                        productId: item.product_id,
                        manufacturer: item.manufacturer
                    });
                }
                
                if (item._items) {
                    extractDevices(item._items);
                }
            }
        }
        
        if (data.SPUSBDataType) {
            extractDevices(data.SPUSBDataType);
        }
        
        return devices;
    }
}

module.exports = BiometricDeviceService;
