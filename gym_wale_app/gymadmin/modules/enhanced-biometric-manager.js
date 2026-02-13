/**
 * Enhanced Biometric Enrollment Manager for Gym-Wale
 * Works with the Enhanced Biometric Agent v2.0
 */

class EnhancedBiometricManager {
    constructor() {
        this.agentUrl = 'http://localhost:5001';
        this.devices = [];
        this.selectedPerson = null;
        this.selectedBiometricType = null;
        this.currentTab = 'members';
        this.enrollmentInProgress = false;
        
        this.init();
    }

    async init() {
        console.log('🔧 Initializing Enhanced Biometric Manager...');
        
        // Check if agent is running
        const agentRunning = await this.checkAgentStatus();
        if (!agentRunning) {
            this.showAlert('⚠️ Biometric agent is not running. Please start the agent first.', 'warning');
            return;
        }

        // Load devices and data
        await this.loadDevices();
        this.setupEventListeners();
        
        console.log('✅ Enhanced Biometric Manager initialized');
    }

    async checkAgentStatus() {
        try {
            const response = await fetch(`${this.agentUrl}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Biometric agent is running:', data.status);
                this.updateAgentStatusUI(true, data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Agent not responding:', error.message);
            this.updateAgentStatusUI(false);
            return false;
        }
    }

    async loadDevices() {
        try {
            console.log('🔍 Loading biometric devices...');
            
            const response = await fetch(`${this.agentUrl}/api/devices`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.devices = data.devices || [];
                this.updateDeviceSelectors();
                console.log(`✅ Loaded ${this.devices.length} devices`);
            } else {
                throw new Error(`Failed to load devices: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error loading devices:', error);
            this.showAlert('Failed to load biometric devices', 'error');
        }
    }

    async scanDevices() {
        try {
            console.log('🔍 Scanning for new biometric devices...');
            this.showAlert('🔍 Scanning for devices...', 'info');
            
            const response = await fetch(`${this.agentUrl}/api/devices/scan`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.devices = data.devices || [];
                this.updateDeviceSelectors();
                this.showAlert(`✅ Device scan completed. Found ${this.devices.length} devices.`, 'success');
                console.log(`✅ Scan completed: ${this.devices.length} devices found`);
            } else {
                throw new Error(`Device scan failed: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error scanning devices:', error);
            this.showAlert('Device scan failed', 'error');
        }
    }

    updateDeviceSelectors() {
        const deviceSelectors = document.querySelectorAll('#deviceSelect, #trainerDeviceSelect');
        
        deviceSelectors.forEach(selector => {
            let options = '<option value="">Select a device</option>';
            
            this.devices.forEach(device => {
                const deviceName = device.name || `${device.type} Device`;
                const deviceInfo = device.virtual ? ' (Virtual)' : '';
                options += `<option value="${device.id}">${deviceName}${deviceInfo}</option>`;
            });
            
            if (this.devices.length === 0) {
                options = '<option value="">No devices available</option>';
            }
            
            selector.innerHTML = options;
        });
    }

    updateAgentStatusUI(isRunning, agentData = null) {
        const statusIndicators = document.querySelectorAll('.agent-status-indicator');
        const deviceInfo = document.querySelector('.device-info-panel');
        
        statusIndicators.forEach(indicator => {
            if (isRunning) {
                indicator.innerHTML = '<i class="fas fa-check-circle" style="color: #28a745;"></i> Agent Running';
                indicator.className = 'agent-status-indicator status-running';
            } else {
                indicator.innerHTML = '<i class="fas fa-times-circle" style="color: #dc3545;"></i> Agent Not Running';
                indicator.className = 'agent-status-indicator status-stopped';
            }
        });

        if (deviceInfo && agentData) {
            deviceInfo.innerHTML = `
                <div class="agent-info">
                    <h4>📊 Agent Status</h4>
                    <div class="info-row">
                        <span>Status:</span>
                        <span class="status-${isRunning ? 'running' : 'stopped'}">${agentData.status || 'Unknown'}</span>
                    </div>
                    <div class="info-row">
                        <span>Uptime:</span>
                        <span>${Math.floor(agentData.uptime || 0)} seconds</span>
                    </div>
                    <div class="info-row">
                        <span>Devices:</span>
                        <span>${agentData.hardware?.total || 0} devices</span>
                    </div>
                    <div class="info-row">
                        <span>Memory:</span>
                        <span>${agentData.memory?.rss || 'Unknown'}</span>
                    </div>
                </div>
            `;
        }
    }

    // Enhanced fingerprint enrollment
    async enrollFingerprint(personId, personType, gymId, deviceId = null) {
        if (this.enrollmentInProgress) {
            this.showAlert('Enrollment already in progress', 'warning');
            return false;
        }

        try {
            this.enrollmentInProgress = true;
            this.showEnrollmentProgress('Fingerprint', 'Starting enrollment...');
            
            console.log(`🖐️ Starting fingerprint enrollment for ${personId}`);
            
            const response = await fetch(`${this.agentUrl}/api/fingerprint/enroll`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personId,
                    personType,
                    gymId,
                    deviceId
                })
            });
            
            this.updateEnrollmentProgress(50, 'Processing fingerprint data...');
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.updateEnrollmentProgress(100, 'Enrollment completed successfully!');
                    this.showAlert(`✅ Fingerprint enrolled successfully! Quality: ${data.quality}%`, 'success');
                    console.log(`✅ Fingerprint enrollment completed: ${data.templateId}`);
                    
                    setTimeout(() => this.hideEnrollmentProgress(), 2000);
                    return true;
                } else {
                    throw new Error(data.error || 'Enrollment failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Fingerprint enrollment error:', error);
            this.updateEnrollmentProgress(0, `Error: ${error.message}`, true);
            this.showAlert(`❌ Fingerprint enrollment failed: ${error.message}`, 'error');
            setTimeout(() => this.hideEnrollmentProgress(), 3000);
            return false;
        } finally {
            this.enrollmentInProgress = false;
        }
    }

    // Enhanced face enrollment
    async enrollFace(personId, personType, gymId, deviceId = null) {
        if (this.enrollmentInProgress) {
            this.showAlert('Enrollment already in progress', 'warning');
            return false;
        }

        try {
            this.enrollmentInProgress = true;
            this.showEnrollmentProgress('Face Recognition', 'Starting face enrollment...');
            
            console.log(`👤 Starting face enrollment for ${personId}`);
            
            const response = await fetch(`${this.agentUrl}/api/face/enroll`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personId,
                    personType,
                    gymId,
                    deviceId
                })
            });
            
            this.updateEnrollmentProgress(50, 'Processing facial data...');
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.updateEnrollmentProgress(100, 'Face enrollment completed successfully!');
                    this.showAlert(`✅ Face enrolled successfully! Quality: ${data.quality}%, Liveness: ${data.livenessScore}%`, 'success');
                    console.log(`✅ Face enrollment completed: ${data.templateId}`);
                    
                    setTimeout(() => this.hideEnrollmentProgress(), 2000);
                    return true;
                } else {
                    throw new Error(data.error || 'Face enrollment failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Face enrollment error:', error);
            this.updateEnrollmentProgress(0, `Error: ${error.message}`, true);
            this.showAlert(`❌ Face enrollment failed: ${error.message}`, 'error');
            setTimeout(() => this.hideEnrollmentProgress(), 3000);
            return false;
        } finally {
            this.enrollmentInProgress = false;
        }
    }

    // Enhanced verification
    async verifyBiometric(personId, gymId, biometricType, deviceId = null) {
        try {
            console.log(`🔍 Starting ${biometricType} verification for ${personId}`);
            this.showAlert(`🔍 Starting ${biometricType} verification...`, 'info');
            
            const endpoint = biometricType === 'fingerprint' ? 
                `${this.agentUrl}/api/fingerprint/verify` : 
                `${this.agentUrl}/api/face/verify`;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personId,
                    gymId,
                    deviceId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.verified) {
                    const confidenceText = `${(data.confidence * 100).toFixed(1)}%`;
                    const livenessText = data.livenessScore ? `, Liveness: ${(data.livenessScore * 100).toFixed(1)}%` : '';
                    this.showAlert(`✅ Verification successful! Confidence: ${confidenceText}${livenessText}`, 'success');
                    console.log(`✅ ${biometricType} verification successful: ${confidenceText}`);
                    return true;
                } else {
                    this.showAlert(`❌ Verification failed: ${data.error || 'No match found'}`, 'error');
                    console.log(`❌ ${biometricType} verification failed`);
                    return false;
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`❌ ${biometricType} verification error:`, error);
            this.showAlert(`❌ Verification error: ${error.message}`, 'error');
            return false;
        }
    }

    // UI Helper methods
    showEnrollmentProgress(type, status) {
        const progressDiv = document.getElementById('enrollmentProgress');
        const progressTitle = document.getElementById('progressTitle');
        const progressStatus = document.getElementById('progressStatus');
        const progressFill = document.getElementById('progressFill');
        
        if (progressDiv) {
            progressDiv.style.display = 'block';
            progressTitle.textContent = `${type} Enrollment`;
            progressStatus.textContent = status;
            progressFill.style.width = '10%';
            progressFill.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
        }
    }

    updateEnrollmentProgress(percentage, status, isError = false) {
        const progressStatus = document.getElementById('progressStatus');
        const progressFill = document.getElementById('progressFill');
        
        if (progressStatus && progressFill) {
            progressStatus.textContent = status;
            progressFill.style.width = `${percentage}%`;
            
            if (isError) {
                progressFill.style.background = '#dc3545';
            } else if (percentage === 100) {
                progressFill.style.background = '#28a745';
            }
        }
    }

    hideEnrollmentProgress() {
        const progressDiv = document.getElementById('enrollmentProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }

    showAlert(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `enhanced-notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(420px);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007bff'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(420px)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    setupEventListeners() {
        // Device scan button
        const scanButton = document.getElementById('scanDevicesBtn');
        if (scanButton) {
            scanButton.addEventListener('click', () => this.scanDevices());
        }

        // Device selectors
        const deviceSelects = document.querySelectorAll('#deviceSelect, #trainerDeviceSelect');
        deviceSelects.forEach(select => {
            select.addEventListener('change', () => this.updateEnrollmentButtons());
        });
    }

    updateEnrollmentButtons() {
        const enrollBtn = document.getElementById('enrollBtn');
        const verifyBtn = document.getElementById('verifyBtn');
        const trainerEnrollBtn = document.getElementById('trainerEnrollBtn');
        const trainerVerifyBtn = document.getElementById('trainerVerifyBtn');
        
        const hasSelection = this.selectedPerson && this.selectedBiometricType;
        const hasDevice = document.getElementById('deviceSelect')?.value || 
                         document.getElementById('trainerDeviceSelect')?.value;
        
        const canOperate = hasSelection && hasDevice && !this.enrollmentInProgress;
        
        if (enrollBtn) enrollBtn.disabled = !canOperate;
        if (verifyBtn) verifyBtn.disabled = !canOperate;
        if (trainerEnrollBtn) trainerEnrollBtn.disabled = !canOperate;
        if (trainerVerifyBtn) trainerVerifyBtn.disabled = !canOperate;
    }

    // Integration methods for existing enrollment page
    selectPerson(personId, personType) {
        this.selectedPerson = { id: personId, type: personType };
        this.updateEnrollmentButtons();
        console.log(`Selected person: ${personId} (${personType})`);
    }

    selectBiometricType(type) {
        this.selectedBiometricType = type;
        this.updateEnrollmentButtons();
        console.log(`Selected biometric type: ${type}`);
    }

    // Enhanced enrollment wrapper for existing UI
    async startEnrollment() {
        if (!this.selectedPerson || !this.selectedBiometricType) {
            this.showAlert('Please select a person and biometric type', 'error');
            return false;
        }
        
        const deviceId = document.getElementById('deviceSelect')?.value || 
                        document.getElementById('trainerDeviceSelect')?.value;
        
        if (!deviceId) {
            this.showAlert('Please select a device', 'error');
            return false;
        }

        // Get gym ID from token or current context
        const gymId = this.getGymId();
        if (!gymId) {
            this.showAlert('Gym ID not found. Please login again.', 'error');
            return false;
        }

        if (this.selectedBiometricType === 'fingerprint') {
            return await this.enrollFingerprint(
                this.selectedPerson.id, 
                this.selectedPerson.type, 
                gymId, 
                deviceId
            );
        } else if (this.selectedBiometricType === 'face') {
            return await this.enrollFace(
                this.selectedPerson.id, 
                this.selectedPerson.type, 
                gymId, 
                deviceId
            );
        }
        
        return false;
    }

    async startVerification() {
        if (!this.selectedPerson || !this.selectedBiometricType) {
            this.showAlert('Please select a person and biometric type', 'error');
            return false;
        }
        
        const deviceId = document.getElementById('deviceSelect')?.value || 
                        document.getElementById('trainerDeviceSelect')?.value;
        
        const gymId = this.getGymId();
        if (!gymId) {
            this.showAlert('Gym ID not found. Please login again.', 'error');
            return false;
        }

        return await this.verifyBiometric(
            this.selectedPerson.id, 
            gymId, 
            this.selectedBiometricType, 
            deviceId
        );
    }

    getGymId() {
        // Try to get gym ID from JWT token
        const token = localStorage.getItem('gymAdminToken');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.admin?.id || payload.gymId || payload.id;
            } catch (e) {
                console.warn('Could not parse gym ID from token');
            }
        }
        
        // Fallback to session or current profile
        return sessionStorage.getItem('currentGymId') || 
               window.currentGymProfile?._id || 
               'default_gym_001';
    }
}

// Initialize enhanced biometric manager when DOM is ready
let enhancedBiometricManager;

document.addEventListener('DOMContentLoaded', function() {
    enhancedBiometricManager = new EnhancedBiometricManager();
    
    // Make it globally available for existing enrollment page
    window.enhancedBiometricManager = enhancedBiometricManager;
    
    // Override existing functions to use enhanced manager
    if (typeof window.startEnrollment === 'function') {
        window.startEnrollment = () => enhancedBiometricManager.startEnrollment();
    }
    
    if (typeof window.verifyBiometric === 'function') {
        window.verifyBiometric = () => enhancedBiometricManager.startVerification();
    }
    
    if (typeof window.selectPerson === 'function') {
        const originalSelectPerson = window.selectPerson;
        window.selectPerson = (personId, personType) => {
            originalSelectPerson(personId, personType);
            enhancedBiometricManager.selectPerson(personId, personType);
        };
    }
    
    if (typeof window.selectBiometricType === 'function') {
        const originalSelectBiometricType = window.selectBiometricType;
        window.selectBiometricType = (type) => {
            originalSelectBiometricType(type);
            enhancedBiometricManager.selectBiometricType(type);
        };
    }
});
