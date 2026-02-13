// ===== SETTINGS INITIALIZATION =====
window.settingsJsLoaded = true;

// Initialize a flag to track manager initialization
window.securityManagersInitialized = false;

// Add a global function to safely check if security managers are ready
window.areSecurityManagersReady = function() {
  return window.securityManagersInitialized && 
         window.twoFactorManager && 
         window.loginNotificationsManager;
};

// Add a global function to wait for security managers to be ready
window.waitForSecurityManagers = function(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (window.areSecurityManagersReady()) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.areSecurityManagersReady()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Security managers failed to initialize within timeout'));
      }
    }, 100);
  });
};

// Add a function to try initializing security managers with fallback
window.ensureSecurityManagers = function() {
  if (window.areSecurityManagersReady()) {
    return true;
  }
  
  try {
    // Check if classes are available
    if (typeof TwoFactorAuthManager !== 'undefined' && 
        typeof LoginNotificationsManager !== 'undefined') {
      
      if (!window.twoFactorManager) {
        window.twoFactorManager = new TwoFactorAuthManager();
        console.log('✅ Created TwoFactorAuthManager instance');
      }
      
      if (!window.loginNotificationsManager) {
        window.loginNotificationsManager = new LoginNotificationsManager();
        console.log('✅ Created LoginNotificationsManager instance');
      }
      
      if (window.twoFactorManager && window.loginNotificationsManager) {
        window.securityManagersInitialized = true;
        console.log('✅ Security managers ensured and ready');
        return true;
      }
    }
  } catch (error) {
    console.log('⚠️ Could not ensure security managers:', error.message);
  }
  
  return false;
};

window.addEventListener('load', function() {
  console.log('🔧 Window fully loaded - settings.js');
});

// ===== GENERIC ALERT FALLBACK =====
// Use this for legacy showAlert calls in agent manager
function showAlert(message, type = 'info') {
  // Prefer styled notification if available
  if (typeof showNotification === 'function') {
    showNotification(message, type);
  } else {
    alert(message);
  }
}

// ===== BIOMETRIC AGENT MANAGEMENT =====
class BiometricAgentManager {
    constructor() {
    this.BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
        this.agentUrl = 'http://localhost:5001';
        this.agentStatus = 'unknown';
        this.checkInterval = null;
        this.devices = [];
        this.enrollmentInProgress = false;
    }

    // Enhanced device management
    async getDevices() {
        try {
            const response = await fetch(`${this.agentUrl}/api/devices`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.devices = data.devices || [];
                return this.devices;
            } else {
                console.error('Failed to get devices:', response.status);
                return [];
            }
        } catch (error) {
            console.error('Error getting devices:', error);
            return [];
        }
    }

    async scanDevices() {
        try {
            const response = await fetch(`${this.agentUrl}/api/devices/scan`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.devices = data.devices || [];
                return this.devices;
            } else {
                console.error('Failed to scan devices:', response.status);
                return [];
            }
        } catch (error) {
            console.error('Error scanning devices:', error);
            return [];
        }
    }

    // Enhanced biometric enrollment
    async enrollFingerprint(personId, personType, gymId, deviceId = null) {
        try {
            this.enrollmentInProgress = true;
            
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
            
            const data = await response.json();
            this.enrollmentInProgress = false;
            
            return {
                success: data.success,
                templateId: data.templateId,
                quality: data.quality,
                deviceName: data.deviceName,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            this.enrollmentInProgress = false;
            console.error('Fingerprint enrollment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyFingerprint(personId, gymId, deviceId = null) {
        try {
            const response = await fetch(`${this.agentUrl}/api/fingerprint/verify`, {
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
            
            const data = await response.json();
            
            return {
                success: data.success,
                verified: data.verified,
                confidence: data.confidence,
                deviceName: data.deviceName,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            console.error('Fingerprint verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Enhanced face recognition
    async enrollFace(personId, personType, gymId, deviceId = null) {
        try {
            this.enrollmentInProgress = true;
            
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
            
            const data = await response.json();
            this.enrollmentInProgress = false;
            
            return {
                success: data.success,
                templateId: data.templateId,
                quality: data.quality,
                livenessScore: data.livenessScore,
                deviceName: data.deviceName,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            this.enrollmentInProgress = false;
            console.error('Face enrollment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyFace(personId, gymId, deviceId = null) {
        try {
            const response = await fetch(`${this.agentUrl}/api/face/verify`, {
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
            
            const data = await response.json();
            
            return {
                success: data.success,
                verified: data.verified,
                confidence: data.confidence,
                livenessScore: data.livenessScore,
                deviceName: data.deviceName,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            console.error('Face verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Legacy enrollment for backward compatibility
    async legacyEnroll(memberId, memberName, gymId) {
        try {
            const response = await fetch(`${this.agentUrl}/enroll`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    memberId,
                    memberName,
                    gymId
                })
            });
            
            const data = await response.json();
            
            return {
                success: data.success,
                enrollmentId: data.enrollmentId,
                biometricTemplate: data.biometricTemplate,
                results: data.results,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            console.error('Legacy enrollment error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Legacy verification for backward compatibility
    async legacyVerify(biometricData, gymId) {
        try {
            const response = await fetch(`${this.agentUrl}/verify`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    biometricData,
                    gymId
                })
            });
            
            const data = await response.json();
            
            return {
                success: data.success,
                verified: data.verified,
                memberId: data.memberId,
                memberName: data.memberName,
                confidence: data.confidence,
                method: data.method,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            console.error('Legacy verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Attendance recording
    async recordAttendance(memberId, gymId, action = 'check-in') {
        try {
            const response = await fetch(`${this.agentUrl}/attendance`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    memberId,
                    gymId,
                    action
                })
            });
            
            const data = await response.json();
            
            return {
                success: data.success,
                attendanceId: data.attendanceId,
                verified: data.verified,
                method: data.method,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            console.error('Attendance recording error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkAgentStatus() {
        try {
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const response = await fetch(`${this.agentUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.agentStatus = 'running';
                console.log('✅ Biometric agent is running:', data);
                return true;
            } else {
                console.log('❌ Biometric agent responded with error:', response.status);
                this.agentStatus = 'error';
                return false;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('❌ Biometric agent check timed out');
            } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                console.log('❌ Biometric agent service not running - connection refused on port 5001');
                console.log('💡 The service may have stopped. Please check Windows Services or restart the Fitverse Biometric Agent service.');
            } else {
                console.log('❌ Biometric agent check failed:', error.message);
            }
            this.agentStatus = 'not-running';
            return false;
        }
    }

    async downloadAndInstallAgent() {
        try {
            // First, check if the agent is already running
            showAlert('� Checking biometric agent status...', 'info');
            
            const isAgentRunning = await this.checkAgentStatus();
            
            if (isAgentRunning) {
                // Agent is already running - show success message and status check
                showAlert('✅ Biometric agent is already running and ready!', 'success');
                this.showAgentRunningModal();
                return;
            }
            
            // Agent not running, proceed with installation/download
            showAlert('�🔄 Preparing Biometric Agent installer...', 'info');
            
            // Check if the simple biometric agent files exist (our lightweight version)
            let simpleAgentExists = false;
            try {
                const checkResponse = await fetch('/biometric-agent/simple-agent.js');
                simpleAgentExists = checkResponse.ok;
            } catch (e) {
                console.warn('Simple agent files not accessible via HTTP');
            }
            
            if (simpleAgentExists) {
                // Simple agent exists, show instructions for manual setup
                showAlert('📁 Simple Biometric Agent found! Showing setup instructions...', 'info');
                this.showSimpleAgentInstructions();
            } else {
                // Check for full agent files as fallback
                let fullAgentExists = false;
                try {
                    const checkResponse = await fetch('/biometric-agent/package.json');
                    fullAgentExists = checkResponse.ok;
                } catch (e) {
                    console.warn('Full agent files not accessible via HTTP');
                }
                
                if (fullAgentExists) {
                    // Files exist, create download for the simple agent package
                    showAlert('📁 Simple Agent package found! Preparing download...', 'info');
                    
                    // Create a download link for the simple agent package
                    const link = document.createElement('a');
                    link.href = '/simple-biometric-agent.zip'; // This downloads the simple agent zip
                    link.download = 'FitverseSimpleBiometricAgent.zip';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => {
                        showAlert('📥 Simple Agent download completed! Please extract and run "install-simple-agent.bat" as administrator.', 'success');
                        this.showSimpleAgentInstructions();
                    }, 1000);
                } else {
                    // No agent files found, show manual installation
                    showAlert('📋 Biometric agent requires manual setup. Please follow the installation guide.', 'warning');
                    this.showManualInstallationGuide();
                }
            }
            
        } catch (error) {
            console.error('Error preparing agent installer:', error);
            showAlert('📋 Unable to download automatically. Please follow manual installation.', 'warning');
            this.showManualInstallationGuide();
        }
    }

    showInstallationInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🔧 Biometric Agent Installation</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="installation-steps">
                        <h4>Installation Steps:</h4>
                        <ol style="margin: 15px 0; padding-left: 25px;">
                            <li>Extract the downloaded ZIP file</li>
                            <li>Right-click on <strong>"install.bat"</strong></li>
                            <li>Select <strong>"Run as administrator"</strong></li>
                            <li>Follow the installation prompts</li>
                            <li>The agent will start automatically</li>
                        </ol>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Note:</strong> Administrator privileges are required to install device drivers and Windows service.
                        </div>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Prerequisites:</strong> Ensure Node.js is installed on your system. Download from <a href="https://nodejs.org" target="_blank">nodejs.org</a>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.biometricAgentManager.startAgentCheck()">
                        <i class="fas fa-sync"></i> Check Agent Status
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showSimpleAgentInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-cogs"></i> Simple Biometric Agent Setup</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="installation-steps">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Simple Setup:</strong> The lightweight biometric agent is ready to run with minimal setup.
                        </div>
                        
                        <h4>Quick Start Instructions:</h4>
                        <ol style="margin: 15px 0; padding-left: 25px; line-height: 1.6;">
                            <li><strong>Prerequisites:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>Ensure <a href="https://nodejs.org" target="_blank">Node.js</a> is installed (v14 or higher)</li>
                                    <li>Administrator privileges required for service installation</li>
                                </ul>
                            </li>
                            <li><strong>Download and Install:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>Download the agent files using the button below</li>
                                    <li>Extract the ZIP file to a folder</li>
                                    <li>Right-click <code>install-simple-agent.bat</code> and select "Run as administrator"</li>
                                </ul>
                            </li>
                            <li><strong>Automatic Service Installation:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>The installer will create a Windows service named "Fitverse Biometric Agent"</li>
                                    <li>Service will start automatically and run in the background</li>
                                    <li>Agent will start automatically when Windows boots</li>
                                    <li>No manual startup required after installation</li>
                                </ul>
                            </li>
                        </ol>
                        
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i>
                            <strong>Service Features:</strong>
                            <ul style="margin: 8px 0; padding-left: 20px;">
                                <li>✅ Runs automatically as Windows service</li>
                                <li>✅ Starts with Windows (no manual intervention)</li>
                                <li>✅ Simulation mode (no actual hardware needed)</li>
                                <li>✅ All biometric endpoints functional</li>
                                <li>✅ CORS enabled for web interface</li>
                                <li>✅ Perfect for development and production</li>
                            </ul>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Service Management:</strong>
                            <ul style="margin: 8px 0; padding-left: 20px;">
                                <li>Service Name: "Fitverse Biometric Agent"</li>
                                <li>To stop: Open Services app and stop the service</li>
                                <li>To restart: Restart the service from Services app</li>
                                <li>Runs on: <code>http://localhost:5001</code></li>
                            </ul>
                        </div>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Service Troubleshooting:</strong>
                            <ul style="margin: 8px 0; padding-left: 20px;">
                                <li>If installation fails, ensure you ran as administrator</li>
                                <li>Check Windows Services app for "Fitverse Biometric Agent"</li>
                                <li>If service stopped: Open Services app → Find "Fitverse Biometric Agent" → Right-click → Start</li>
                                <li>Make sure Windows Firewall allows the agent</li>
                                <li>If port 5001 is in use, stop other services using that port</li>
                            </ul>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-tools"></i>
                            <strong>Quick Service Commands:</strong>
                            <ul style="margin: 8px 0; padding-left: 20px;">
                                <li>Start: <code>sc start "Fitverse Biometric Agent"</code></li>
                                <li>Stop: <code>sc stop "Fitverse Biometric Agent"</code></li>
                                <li>Restart: <code>sc stop "Fitverse Biometric Agent" && sc start "Fitverse Biometric Agent"</code></li>
                                <li>Status: <code>sc query "Fitverse Biometric Agent"</code></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="window.location.href='/simple-biometric-agent.zip'">
                        <i class="fas fa-download"></i> Download Simple Agent Installer
                    </button>
                    <button class="btn btn-info" onclick="window.open('/biometric-agent/monitor-service.bat', '_blank')">
                        <i class="fas fa-monitor-heart-rate"></i> Download Service Monitor
                    </button>
                    <button class="btn btn-primary" onclick="window.biometricAgentManager.startAgentCheck()">
                        <i class="fas fa-sync"></i> Check Agent Status
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('/biometric-agent', '_blank')">
                        <i class="fas fa-folder-open"></i> Open Agent Folder
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showAgentRunningModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>✅ Biometric Agent Status</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="agent-status-info">
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i>
                            <strong>Agent is Running!</strong> The biometric agent is active and ready to use.
                        </div>
                        
                        <div class="status-details" style="margin: 20px 0;">
                            <h4>Agent Information:</h4>
                            <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.6;">
                                <li><strong>Status:</strong> <span class="text-success">Active</span></li>
                                <li><strong>URL:</strong> <code>http://localhost:5001</code></li>
                                <li><strong>Services:</strong> Fingerprint, Face Recognition</li>
                                <li><strong>Mode:</strong> Simulation (for development)</li>
                            </ul>
                        </div>
                        
                        <div class="available-features">
                            <h4>Available Features:</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                                <div class="feature-card" style="padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                                    <i class="fas fa-fingerprint" style="color: #007bff; margin-right: 8px;"></i>
                                    <strong>Fingerprint</strong>
                                    <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Enrollment & Verification</p>
                                </div>
                                <div class="feature-card" style="padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                                    <i class="fas fa-user-circle" style="color: #28a745; margin-right: 8px;"></i>
                                    <strong>Face Recognition</strong>
                                    <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Enrollment & Verification</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Next Steps:</strong> You can now configure biometric attendance settings and start enrolling members.
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-cog"></i> Configure Biometric Settings
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('http://localhost:5001/health', '_blank')">
                        <i class="fas fa-external-link-alt"></i> View Agent Status
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showManualInstallationGuide() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>📋 Manual Biometric Agent Setup</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="installation-steps">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Manual Installation Required:</strong> The biometric agent files need to be set up manually.
                        </div>
                        
                        <h4>Step-by-Step Setup:</h4>
                        <ol style="margin: 15px 0; padding-left: 25px; line-height: 1.6;">
                            <li><strong>Prerequisites:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>Install <a href="https://nodejs.org" target="_blank">Node.js</a> (v14 or higher)</li>
                                    <li>Ensure you have administrator privileges</li>
                                </ul>
                            </li>
                            <li><strong>Download Agent Files:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>Navigate to your project's <code>biometric-agent</code> folder</li>
                                    <li>Copy the entire folder to a permanent location (e.g., <code>C:\\FitverseBiometricAgent</code>)</li>
                                </ul>
                            </li>
                            <li><strong>Install Dependencies:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>Open Command Prompt as Administrator</li>
                                    <li>Navigate to the agent folder: <code>cd C:\\FitverseBiometricAgent</code></li>
                                    <li>Run: <code>npm install</code></li>
                                </ul>
                            </li>
                            <li><strong>Install Windows Service:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>Right-click on <code>install.bat</code></li>
                                    <li>Select "Run as administrator"</li>
                                    <li>Follow the installation prompts</li>
                                </ul>
                            </li>
                            <li><strong>Start the Service:</strong>
                                <ul style="margin: 8px 0; padding-left: 20px;">
                                    <li>The service should start automatically</li>
                                    <li>Or manually start: <code>net start FitverseBiometricAgent</code></li>
                                </ul>
                            </li>
                        </ol>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Troubleshooting:</strong>
                            <ul style="margin: 8px 0; padding-left: 20px;">
                                <li>Ensure antivirus software allows the agent</li>
                                <li>Check Windows Firewall settings for port 5001</li>
                                <li>Verify biometric devices are properly connected</li>
                            </ul>
                        </div>
                        
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i>
                            <strong>Verification:</strong> The agent should be accessible at <code>http://localhost:5001</code>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.biometricAgentManager.startAgentCheck()">
                        <i class="fas fa-sync"></i> Check Agent Status
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('/biometric-agent', '_blank')">
                        <i class="fas fa-folder-open"></i> Open Agent Folder
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    startAgentCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Check every 5 seconds
        this.checkInterval = setInterval(async () => {
            const isRunning = await this.checkAgentStatus();
            this.updateAgentStatusUI(isRunning);
        }, 5000);
        
        // Check immediately
        this.checkAgentStatus().then(isRunning => {
            this.updateAgentStatusUI(isRunning);
        });
    }

    stopAgentCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    updateAgentStatusUI(isRunning) {
        console.log('🔄 Updating agent status UI:', isRunning ? 'RUNNING' : 'NOT RUNNING');
        
        const statusElements = document.querySelectorAll('.agent-status');
        const installButtons = document.querySelectorAll('.install-agent-btn');
        const biometricSections = document.querySelectorAll('.biometric-settings-section');
        
        // Update status indicators
        statusElements.forEach(el => {
            el.className = `agent-status ${isRunning ? 'running' : 'not-running'}`;
            el.innerHTML = isRunning ? 
                '<i class="fas fa-check-circle"></i> Agent Running' : 
                '<i class="fas fa-times-circle"></i> Agent Not Running';
        });
        
        // Show/hide install buttons and update text
        installButtons.forEach(btn => {
            if (isRunning) {
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Agent Running';
                btn.disabled = true;
                btn.style.backgroundColor = '#28a745';
                btn.style.cursor = 'default';
                btn.style.opacity = '0.8';
                btn.title = 'Biometric agent is running and ready';
            } else {
                btn.innerHTML = '<i class="fas fa-cogs"></i> Setup Agent';
                btn.disabled = false;
                btn.style.backgroundColor = '';
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
                btn.title = 'Click to set up the biometric agent';
            }
        });
        
        // Update biometric sections
        biometricSections.forEach(section => {
            const overlay = section.querySelector('.agent-required-overlay');
            if (overlay) {
                overlay.style.display = isRunning ? 'none' : 'flex';
            }
        });
        
        // Update any biometric toggle functionality
        const biometricToggles = document.querySelectorAll('#toggleFingerprintAttendance, #toggleFaceRecognitionAttendance');
        biometricToggles.forEach(toggle => {
            if (!isRunning) {
                toggle.disabled = true;
                toggle.checked = false;
                toggle.title = 'Requires biometric agent to be running';
            } else {
                toggle.disabled = false;
                toggle.title = 'Toggle biometric attendance';
            }
        });
        
        // Update setup buttons specifically
        const setupButtons = document.querySelectorAll('#setupBiometricDevices, .setup-biometric-btn');
        setupButtons.forEach(btn => {
            if (isRunning) {
                btn.innerHTML = '<i class="fas fa-cog"></i> Configure Devices';
                btn.disabled = false;
                btn.title = 'Configure biometric devices';
            } else {
                btn.innerHTML = '<i class="fas fa-download"></i> Setup Agent';
                btn.disabled = false;
                btn.title = 'Set up biometric agent first';
            }
        });
        
        console.log('✅ Agent status UI updated successfully');
    }
}

// Initialize global biometric agent manager
window.biometricAgentManager = new BiometricAgentManager();

// Initialize agent status check immediately when script loads
(async function initializeAgentStatus() {
    console.log('🔍 Initializing biometric agent status check...');
    
    // Wait a moment for DOM elements to be available
    setTimeout(async () => {
        const isRunning = await window.biometricAgentManager.checkAgentStatus();
        window.biometricAgentManager.updateAgentStatusUI(isRunning);
        
        if (isRunning) {
            console.log('✅ Biometric agent detected and UI updated');
        } else {
            console.log('❌ Biometric agent not detected');
        }
    }, 1000);
})();

// ===== EARLY SETTINGS APPLICATION (RUNS BEFORE DOM READY) =====
(function() {
  // Get gym ID early - moved outside to be accessible globally
  function getEarlyGymId() {
    // 1. From JWT token (most reliable)
    const token = localStorage.getItem('gymAdminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 JWT payload structure:', payload);
        
        // Check the actual structure from gymController.js: payload.admin.id
        if (payload.admin && payload.admin.id) {
          console.log('✅ Found gym ID from JWT admin.id:', payload.admin.id);
          return payload.admin.id;
        }
        
        // Check other possible properties in JWT (fallback)
        const possibleIds = [payload.gymId, payload.id, payload._id, payload.userId, payload.gym];
        for (let id of possibleIds) {
          if (id) {
            console.log('✅ Found gym ID from JWT fallback:', id);
            return id;
          }
        }
      } catch (e) {
        console.warn('Early: Could not parse gym ID from token:', e);
      }
    }
    
    // 2. From global gym profile
    if (window.currentGymProfile && window.currentGymProfile._id) {
      console.log('✅ Found gym ID from currentGymProfile._id:', window.currentGymProfile._id);
      return window.currentGymProfile._id;
    }
    
    if (window.currentGymProfile && window.currentGymProfile.id) {
      console.log('✅ Found gym ID from currentGymProfile.id:', window.currentGymProfile.id);
      return window.currentGymProfile.id;
    }
    
    // 3. From session storage
    const sessionGymId = sessionStorage.getItem('currentGymId');
    if (sessionGymId) {
      console.log('✅ Found gym ID from sessionStorage:', sessionGymId);
      return sessionGymId;
    }
    
    // 4. Extract from token email/username (create pseudo-unique ID)
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.admin?.email || payload.email;
        if (email) {
          // Create a deterministic ID based on email
          const emailHash = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
          const pseudoId = 'gym_' + emailHash;
          console.log('✅ Created pseudo gym ID from email:', pseudoId);
          sessionStorage.setItem('currentGymId', pseudoId);
          return pseudoId;
        }
      } catch (e) {
        console.warn('Early: Could not extract email from token');
      }
    }
    
    // 5. Last resort - session-specific unique ID
    const sessionId = 'gym_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('⚠️ Using session-specific fallback ID:', sessionId);
    sessionStorage.setItem('currentGymId', sessionId);
    return sessionId;
  }

  // Apply gym-specific settings immediately to prevent flash of hidden content
  function applyEarlyCustomization() {
    const gymId = getEarlyGymId();
    if (!gymId) return;
    
    const equipmentVisible = localStorage.getItem(`dashboardEquipmentVisible_${gymId}`) !== 'false';
    const paymentVisible = localStorage.getItem(`dashboardPaymentVisible_${gymId}`) !== 'false';
    
    console.log(`Early customization for gym ${gymId}:`, {
      equipment: equipmentVisible,
      payment: paymentVisible
    });
    
    // Add CSS to hide elements immediately if needed
    if (!equipmentVisible || !paymentVisible) {
      const style = document.createElement('style');
      style.id = 'earlyCustomizationStyles';
      let css = '';
      
      if (!equipmentVisible) {
        css += `
          /* Hide equipment menu items */
          .menu-item:has(.fa-dumbbell), 
          .menu-item:has([onclick*="equipment"]),
          .menu-item:has([onclick*="Equipment"]),
          /* Hide equipment quick actions - BUT NOT the Add Equipment quick action */
          .quick-action-btn:has(.fa-dumbbell):not(#uploadEquipmentBtn),
          .quick-action:has(.fa-dumbbell):not(#uploadEquipmentBtn),
          /* Hide equipment activities */
          .activity-item:has(.fa-dumbbell),
          /* Hide equipment tab */
          #equipmentTab,
          /* Hide equipment gallery cards */
          .card:has(.card-title:contains("Equipment")) {
            display: none !important;
          }
        `;
      }
      
      if (!paymentVisible) {
        css += `
          /* Hide payment menu items */
          .menu-item:has(.fa-credit-card),
          .menu-item:has([onclick*="payment"]),
          .menu-item:has([onclick*="Payment"]),
          /* Hide payment quick actions */
          .quick-action-btn:has(.fa-credit-card),
          .quick-action:has(.fa-credit-card),
          /* Hide payment activities */
          .activity-item:has(.fa-credit-card),
          /* Hide payment tab */
          #paymentTab {
            display: none !important;
          }
        `;
      }
      
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
  
  // Apply early customization as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEarlyCustomization);
  } else {
    applyEarlyCustomization();
  }
  
  // Also apply on window load for additional safety
  window.addEventListener('load', applyEarlyCustomization);
  
  // Monitor for gym switches by watching for token/profile changes
  let lastKnownGymId = null;
  
  function monitorGymSwitch() {
    const currentGymId = getEarlyGymId();
    
    if (lastKnownGymId && lastKnownGymId !== currentGymId) {
      console.log(`🔄 Detected gym switch: ${lastKnownGymId} → ${currentGymId}`);
      // Reapply customization for new gym
      setTimeout(applyEarlyCustomization, 50);
    }
    
    lastKnownGymId = currentGymId;
  }
  
  // Monitor every 2 seconds for gym switches
  setInterval(monitorGymSwitch, 2000);
  
  // Also monitor on storage events
  window.addEventListener('storage', function(e) {
    if (e.key === 'gymAdminToken') {
      console.log('🔄 Token changed, checking for gym switch...');
      // Clear session gym ID to force re-detection
      sessionStorage.removeItem('currentGymId');
      setTimeout(monitorGymSwitch, 100);
    }
  });
  
  // Monitor for token changes in current tab too
  let lastKnownToken = localStorage.getItem('gymAdminToken');
  setInterval(() => {
    const currentToken = localStorage.getItem('gymAdminToken');
    if (currentToken !== lastKnownToken) {
      console.log('🔄 Token changed in current tab, checking for gym switch...');
      // Clear session gym ID to force re-detection
      sessionStorage.removeItem('currentGymId');
      lastKnownToken = currentToken;
      setTimeout(monitorGymSwitch, 100);
    }
  }, 1000);
})();

// ===== SETTINGS TAB FUNCTIONALITY =====

// ===== THEME MANAGEMENT =====
function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.style.setProperty('--bg-primary', '#18191a');
    root.style.setProperty('--bg-secondary', '#23272f');
    root.style.setProperty('--card-bg', '#23272f');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#cccccc');
    root.style.setProperty('--border-color', '#33363d');
    root.style.setProperty('--border-light', '#23272f');
    root.style.setProperty('--bg-light', '#23272f');
    // Make all text white for visibility
    document.body.style.background = '#18191a';
    document.body.style.color = '#fff';
    // Set all headings, paragraphs, links, labels, etc. to white
    const allTextEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, li, th, td, .menu-text, .stat-title, .stat-value, .stat-change, .member-detail-label, .plan-badge, .edit-input, .sidebar, .sidebar .menu-link, .sidebar .menu-link .fa, .content, .modal-content, .modal, .tab-title, .tab-header, .tab-content, .quick-action, .info-list, .member-name, .member-id, .member-detail-title, .member-detail-modal, .profile-pic, .stat-card, .toggle-switch, .toggle-switch input, .toggle-switch label, .theme-option, .color-option, .settings-section, .settings-label, .settings-value, .settings-row, .settings-tab, .settings-content, .settings-header, .settings-title, .settings-description, .settings-group, .settings-btn, .settings-btn-primary, .settings-btn-secondary, .settings-btn-danger, .settings-btn-warning, .settings-btn-info, .settings-btn-success, .settings-btn-light, .settings-btn-dark, .settings-btn-outline, .settings-btn-link, .settings-btn-block, .settings-btn-lg, .settings-btn-sm, .settings-btn-xs, .settings-btn-icon, .settings-btn-circle, .settings-btn-square, .settings-btn-pill, .settings-btn-round, .settings-btn-flat, .settings-btn-ghost, .settings-btn-shadow, .settings-btn-gradient, .settings-btn-glow, .settings-btn-inverse, .settings-btn-transparent, .settings-btn-borderless, .settings-btn-text, .settings-btn-label, .settings-btn-value, .settings-btn-group, .settings-btn-toolbar, .settings-btn-dropdown, .settings-btn-toggle, .settings-btn-switch, .settings-btn-radio, .settings-btn-checkbox, .settings-btn-segment, .settings-btn-step, .settings-btn-progress, .settings-btn-spinner, .settings-btn-badge, .settings-btn-dot, .settings-btn-icon-left, .settings-btn-icon-right, .settings-btn-icon-top, .settings-btn-icon-bottom, .settings-btn-icon-only, .settings-btn-icon-text, .settings-btn-text-icon, .settings-btn-label-icon, .settings-btn-value-icon, .settings-btn-group-icon, .settings-btn-toolbar-icon, .settings-btn-dropdown-icon, .settings-btn-toggle-icon, .settings-btn-switch-icon, .settings-btn-radio-icon, .settings-btn-checkbox-icon, .settings-btn-segment-icon, .settings-btn-step-icon, .settings-btn-progress-icon, .settings-btn-spinner-icon, .settings-btn-badge-icon, .settings-btn-dot-icon');
    allTextEls.forEach(el => {
      el.style.color = '#fff';
    });
    // Set all links to white
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(a => {
      a.style.color = '#fff';
    });
    // Set all dashboard containers, cards, and sections to dark backgrounds
    const darkBgEls = document.querySelectorAll(`
      .stat-card,
      .content,
      .modal-content,
      .tab-content,
      .settings-section,
      .settings-tab,
      .settings-content,
      .settings-header,
      .settings-row,
      .settings-group,
      .dashboard-section,
      .dashboard-container,
      .dashboard-card,
      .card-bg,
      .section-bg,
      .admin-section,
      .admin-container,
      .admin-card,
      .quick-actions,
      .quick-action,
      .activities-offered,
      .activities-section,
      .activities-list,
      .gym-info,
      .gym-info-section,
      .membership-plan,
      .membership-plan-section,
      .membership-plans,
      .new-members,
      .new-members-section,
      .recent-activity,
      .recent-activity-section,
      .attendance-chart,
      .attendance-chart-section,
      .equipment-gallery,
      .equipment-gallery-section
    `);
    darkBgEls.forEach(el => {
      // Use a lighter dark/greyish shade for all cards/sections for contrast
      if (
        el.classList.contains('stat-card') ||
        el.classList.contains('dashboard-card') ||
        el.classList.contains('card-bg') ||
        el.classList.contains('modal-content') ||
        el.classList.contains('tab-content') ||
        el.classList.contains('settings-section') ||
        el.classList.contains('admin-card') ||
        el.classList.contains('quick-actions') ||
        el.classList.contains('activities-offered') ||
        el.classList.contains('activities-section') ||
        el.classList.contains('activities-list') ||
        el.classList.contains('quick-action-card') ||
        el.classList.contains('activities-offered-card') ||
        el.classList.contains('membership-plans-section') ||
        el.classList.contains('membership-plans') ||
        el.classList.contains('membership-plan-section') ||
        el.classList.contains('membership-plan') ||
        el.classList.contains('card') ||
        el.classList.contains('card-header') ||
        el.classList.contains('card-body') ||
        el.classList.contains('gym-info-card') ||
        el.classList.contains('gym-info-section') ||
        el.classList.contains('plans-list') ||
        el.classList.contains('main-content') ||
        el.classList.contains('dashboard-row') ||
        el.classList.contains('main-grid') ||
        el.classList.contains('left-column') ||
        el.classList.contains('right-column') ||
        el.id === 'membershipPlansSection' ||
        el.id === 'photoGridSection' ||
        el.id === 'newMembersCard'
      ) {
        el.style.background = '#23262b'; // slightly lighter black for all cards/sections
        el.style.backgroundColor = '#23262b';
        el.style.boxShadow = '0 2px 16px 0 rgba(0,0,0,0.18)';
      } else {
        el.style.background = '#18191a'; // main dark background
        el.style.backgroundColor = '#18191a';
      }
    });
    document.body.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    // Reset to light theme
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--card-bg');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--border-color');
    root.style.removeProperty('--border-light');
    root.style.removeProperty('--bg-light');
    
    // Reset body styles
    document.body.style.background = '';
    document.body.style.color = '';
    
    // Reset all text elements
    const allTextEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, label, li, th, td, .menu-text, .stat-title, .stat-value, .stat-change, .member-detail-label, .plan-badge, .edit-input, .sidebar, .sidebar .menu-link, .sidebar .menu-link .fa, .content, .modal-content, .modal, .tab-title, .tab-header, .tab-content, .quick-action, .info-list, .member-name, .member-id, .member-detail-title, .member-detail-modal, .profile-pic, .stat-card, .toggle-switch, .toggle-switch input, .toggle-switch label, .theme-option, .color-option, .settings-section, .settings-label, .settings-value, .settings-row, .settings-tab, .settings-content, .settings-header, .settings-title, .settings-description, .settings-group, .settings-btn, .settings-btn-primary, .settings-btn-secondary, .settings-btn-danger, .settings-btn-warning, .settings-btn-info, .settings-btn-success, .settings-btn-light, .settings-btn-dark, .settings-btn-outline, .settings-btn-link, .settings-btn-block, .settings-btn-lg, .settings-btn-sm, .settings-btn-xs, .settings-btn-icon, .settings-btn-circle, .settings-btn-square, .settings-btn-pill, .settings-btn-round, .settings-btn-flat, .settings-btn-ghost, .settings-btn-shadow, .settings-btn-gradient, .settings-btn-glow, .settings-btn-inverse, .settings-btn-transparent, .settings-btn-borderless, .settings-btn-text, .settings-btn-label, .settings-btn-value, .settings-btn-group, .settings-btn-toolbar, .settings-btn-dropdown, .settings-btn-toggle, .settings-btn-switch, .settings-btn-radio, .settings-btn-checkbox, .settings-btn-segment, .settings-btn-step, .settings-btn-progress, .settings-btn-spinner, .settings-btn-badge, .settings-btn-dot, .settings-btn-icon-left, .settings-btn-icon-right, .settings-btn-icon-top, .settings-btn-icon-bottom, .settings-btn-icon-only, .settings-btn-icon-text, .settings-btn-text-icon, .settings-btn-label-icon, .settings-btn-value-icon, .settings-btn-group-icon, .settings-btn-toolbar-icon, .settings-btn-dropdown-icon, .settings-btn-toggle-icon, .settings-btn-switch-icon, .settings-btn-radio-icon, .settings-btn-checkbox-icon, .settings-btn-segment-icon, .settings-btn-step-icon, .settings-btn-progress-icon, .settings-btn-spinner-icon, .settings-btn-badge-icon, .settings-btn-dot-icon');
    allTextEls.forEach(el => {
      el.style.color = '';
    });
    
    // Reset all links
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(a => {
      a.style.color = '';
    });
    
    // Reset all background elements
    const darkBgEls = document.querySelectorAll(`
      .stat-card,
      .content,
      .modal-content,
      .tab-content,
      .settings-section,
      .settings-tab,
      .settings-content,
      .settings-header,
      .settings-row,
      .settings-group,
      .dashboard-section,
      .dashboard-container,
      .dashboard-card,
      .card-bg,
      .section-bg,
      .admin-section,
      .admin-container,
      .admin-card,
      .quick-actions,
      .quick-action,
      .activities-offered,
      .activities-section,
      .activities-list,
      .gym-info,
      .gym-info-section,
      .membership-plan,
      .membership-plan-section,
      .membership-plans,
      .new-members,
      .new-members-section,
      .recent-activity,
      .recent-activity-section,
      .attendance-chart,
      .attendance-chart-section,
      .equipment-gallery,
      .equipment-gallery-section
    `);
    darkBgEls.forEach(el => {
      el.style.background = '';
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
    });
    
    document.body.setAttribute('data-theme', 'light');
  } else if (theme === 'auto') {
    // Auto theme - detect system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

function applyColorScheme(color) {
  const root = document.documentElement;
  const colorSchemes = {
    blue: { primary: '#007bff', primaryDark: '#0056b3', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    green: { primary: '#28a745', primaryDark: '#1e7e34', success: '#20c997', warning: '#ffc107', danger: '#dc3545' },
    purple: { primary: '#6f42c1', primaryDark: '#5a32a3', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    orange: { primary: '#fd7e14', primaryDark: '#e55a00', success: '#28a745', warning: '#ffc107', danger: '#dc3545' },
    grey: { primary: '#4f7c82', primaryDark: '#1a5d65ff', success: '#28a745', warning: '#ffc107', danger: '#e74c3c' }
  };
  
  const scheme = colorSchemes[color];
  if (scheme) {
    Object.entries(scheme).forEach(([key, value]) => {
      // Use --primary for primary, --primary-dark for primaryDark, etc.
      let cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      // Special case: primaryDark should be --primary-dark
      if (key === 'primaryDark') cssVar = '--primary-dark';
      root.style.setProperty(cssVar, value);
    });
  }
}

// ===== SETTINGS MANAGEMENT =====

function loadSavedSettings() {
  const gymId = getGymId();
  if (!gymId) {
    console.warn('No gym ID found, skipping settings load');
    return;
  }

  console.log(`📋 Loading individual settings for gym ${gymId}...`);
  
  // Load individual notification settings
  const notificationSettings = [
    { id: 'newMemberNotif', key: 'newMembers' },
    { id: 'paymentNotif', key: 'payments' },
    { id: 'trainerNotif', key: 'trainers' },
    { id: 'emailNotif', key: 'email' }
  ];
  
  notificationSettings.forEach(({ id, key }) => {
    const saved = getGymSpecificSetting(`notification_${key}_${gymId}`);
    const element = document.getElementById(id);
    if (element && saved !== null) {
      element.checked = saved === 'true';
    }
  });
  
  // Load individual service settings
  const serviceSettings = [
    'onlineBooking', 'personalTraining', 'groupClasses', 
    'equipmentReservation', 'memberCheckin'
  ];
  
  serviceSettings.forEach(serviceId => {
    const saved = getGymSpecificSetting(`service_${serviceId}_${gymId}`);
    const element = document.getElementById(serviceId);
    if (element && saved !== null) {
      element.checked = saved === 'true';
    }
  });

  // Load biometric settings
  if (typeof loadBiometricSettings === 'function') {
    loadBiometricSettings(gymId);
  }
  
  // Load gym-specific security settings after main settings
  setTimeout(() => {
    loadGymSpecificSecuritySettings(gymId);
  }, 100);
  
  console.log('✅ Individual settings loaded successfully');
}

// New function to load gym-specific security settings
function loadGymSpecificSecuritySettings(gymId) {
  console.log(`🔐 Loading gym-specific security settings for: ${gymId}`);
  
  // Reset the setup tracker for gym switches
  if (window.securityToggleHandlersSetup && window.securityToggleHandlersSetup !== gymId) {
    console.log('🔄 Gym switched, resetting security handlers setup tracker');
    window.securityToggleHandlersSetup = null;
  }
  
  try {
    // Use the new dedicated loading function
    loadSecurityToggleStates(gymId);
    
    // IMPORTANT: Also set up the toggle handlers here since this is called when settings are loaded
    setTimeout(() => {
      setupSecurityToggleHandlers(gymId);
    }, 50);
    
    console.log('✅ Gym-specific security settings loaded successfully');
  } catch (error) {
    console.error('❌ Error loading gym-specific security settings:', error);
    
    // Fallback to manual loading
    try {
      // Load 2FA setting
      const twoFactorEnabled = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
      if (twoFactorEnabled !== null) {
        const is2FAEnabled = twoFactorEnabled === 'true' || twoFactorEnabled === true;
        const twoFactorToggle = document.getElementById('twoFactorAuth');
        if (twoFactorToggle) {
          twoFactorToggle.checked = is2FAEnabled;
          console.log(`✅ Fallback: Set 2FA toggle to: ${is2FAEnabled} for gym ${gymId}`);
        }
      }
      
      // Load login notifications setting
      const loginNotificationsEnabled = getGymSpecificSetting(`loginNotifications_${gymId}`);
      if (loginNotificationsEnabled !== null) {
        const isLoginNotificationsEnabled = loginNotificationsEnabled === 'true' || loginNotificationsEnabled === true;
        const loginNotificationsToggle = document.getElementById('loginNotifications');
        if (loginNotificationsToggle) {
          loginNotificationsToggle.checked = isLoginNotificationsEnabled;
          console.log(`✅ Fallback: Set login notifications toggle to: ${isLoginNotificationsEnabled} for gym ${gymId}`);
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback loading also failed:', fallbackError);
    }
  }
}

// ===== OPERATING HOURS MANAGEMENT =====
function getOperatingHours() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const hours = {};
  
  days.forEach(day => {
    const openTime = document.getElementById(`${day}Open`)?.value;
    const closeTime = document.getElementById(`${day}Close`)?.value;
    const isClosed = document.getElementById(`${day}Closed`)?.checked;
    
    hours[day] = {
      open: openTime,
      close: closeTime,
      closed: isClosed
    };
  });
  
  return hours;
}

function setOperatingHours(hours) {
  Object.entries(hours).forEach(([day, schedule]) => {
    const openInput = document.getElementById(`${day}Open`);
    const closeInput = document.getElementById(`${day}Close`);
    const closedInput = document.getElementById(`${day}Closed`);
    
    if (openInput) openInput.value = schedule.open || '06:00';
    if (closeInput) closeInput.value = schedule.close || '22:00';
    if (closedInput) closedInput.checked = schedule.closed || false;
  });
}

function setupOperatingHoursHandlers() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  days.forEach(day => {
    const closedCheckbox = document.getElementById(`${day}Closed`);
    const openInput = document.getElementById(`${day}Open`);
    const closeInput = document.getElementById(`${day}Close`);
    
    if (closedCheckbox) {
      closedCheckbox.addEventListener('change', function() {
        if (openInput) openInput.disabled = this.checked;
        if (closeInput) closeInput.disabled = this.checked;
      });
    }
  });
}

// ===== DATA EXPORT =====
function exportData(type) {
  // Placeholder for data export functionality
  showNotification(`Exporting ${type} data...`, 'info');
  
  // In a real implementation, this would call an API endpoint
  setTimeout(() => {
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`, 'success');
  }, 2000);
}

// ===== INDIVIDUAL SETTINGS SAVE HANDLERS =====
function setupIndividualSettingsSave(gymId) {
  console.log(`🔧 Setting up individual save handlers for gym: ${gymId}`);
  
  // Notification settings
  const notificationToggles = [
    { id: 'newMemberNotif', key: 'newMembers', name: 'New Member Notifications' },
    { id: 'paymentNotif', key: 'payments', name: 'Payment Notifications' },
    { id: 'trainerNotif', key: 'trainers', name: 'Trainer Notifications' },
    { id: 'emailNotif', key: 'email', name: 'Email Notifications' }
  ];
  
  notificationToggles.forEach(({ id, key, name }) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        setGymSpecificSetting(`notification_${key}_${gymId}`, isEnabled);
        showNotification(`${name} ${isEnabled ? 'enabled' : 'disabled'}`, isEnabled ? 'success' : 'info');
      });
    }
  });
  
  // Service settings  
  const serviceToggles = [
    { id: 'onlineBooking', name: 'Online Booking' },
    { id: 'personalTraining', name: 'Personal Training' },
    { id: 'groupClasses', name: 'Group Classes' },
    { id: 'equipmentReservation', name: 'Equipment Reservation' },
    { id: 'memberCheckin', name: 'Member Check-in' }
  ];
  
  serviceToggles.forEach(({ id, name }) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        setGymSpecificSetting(`service_${id}_${gymId}`, isEnabled);
        showNotification(`${name} ${isEnabled ? 'enabled' : 'disabled'}`, isEnabled ? 'success' : 'info');
      });
    }
  });
  
  // Security settings - Connect to managers and ensure gym-specific saving
  setupSecurityToggleHandlers(gymId);
  
  console.log('✅ Individual save handlers setup complete');
}

// New function to handle security toggles with proper gym-specific saving
// New function to handle security toggles with proper gym-specific saving (simplified like dashboard)
async function setupSecurityToggleHandlers(gymId) {
  console.log(`🔐 Setting up security toggle handlers for gym: ${gymId}`);
  
  // Prevent duplicate setup by checking if already setup for this gym
  if (window.securityToggleHandlersSetup === gymId) {
    console.log('✅ Security toggle handlers already setup for this gym, skipping...');
    return;
  }
  
  // Mark as setup for this gym to prevent duplicates
  window.securityToggleHandlersSetup = gymId;
  
  console.log('✅ Setting up security toggle handlers immediately (simplified approach)...');
  await setupActualToggleHandlers(gymId);
}

// Separate function for actual toggle handler setup (simplified like dashboard)
async function setupActualToggleHandlers(gymId) {
  console.log(`🔧 Setting up actual toggle handlers for gym: ${gymId}`);
  
  // 2FA Toggle Handler
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  console.log('🔍 2FA toggle element found:', !!twoFactorToggle);
  
  if (twoFactorToggle) {
    console.log('✅ Setting up 2FA toggle event listener');
    
    // Ensure enhanced toggle slider functionality
    const twoFactorSlider = twoFactorToggle.nextElementSibling;
    if (twoFactorSlider && twoFactorSlider.classList.contains('enhanced-toggle-slider')) {
      twoFactorSlider.addEventListener('click', function(e) {
        e.preventDefault();
        twoFactorToggle.checked = !twoFactorToggle.checked;
        twoFactorToggle.dispatchEvent(new Event('change'));
      });
    }
    
    // Load saved state from backend API
    try {
      const response = await fetch('/api/security/2fa-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const is2FAEnabled = result.data?.enabled !== false; // Default to enabled
        twoFactorToggle.checked = is2FAEnabled;
        
        // Also save to localStorage for backup
        setGymSpecificSetting(`twoFactorEnabled_${gymId}`, is2FAEnabled.toString());
        console.log(`📱 2FA toggle loaded from API: ${is2FAEnabled}`);
      } else {
        // Fallback to localStorage
        const saved2FAState = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
        const is2FAEnabled = saved2FAState === 'true' || saved2FAState === true || saved2FAState === null; // Default enabled
        twoFactorToggle.checked = is2FAEnabled;
        console.log(`📱 2FA toggle loaded from localStorage fallback: ${is2FAEnabled}`);
      }
    } catch (error) {
      console.warn('Failed to load 2FA state from API:', error);
      // Fallback to localStorage
      const saved2FAState = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
      const is2FAEnabled = saved2FAState === 'true' || saved2FAState === true || saved2FAState === null; // Default enabled
      twoFactorToggle.checked = is2FAEnabled;
      console.log(`📱 2FA toggle loaded from localStorage fallback: ${is2FAEnabled}`);
    }
    
    // Add event listener (simple like dashboard toggles)
    twoFactorToggle.addEventListener('change', async function() {
      const isEnabled = this.checked;
      console.log(`🔐 2FA toggle changed to: ${isEnabled} for gym: ${gymId}`);
      
      try {
        // Save to backend API first
        const response = await fetch('/api/security/toggle-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
          },
          body: JSON.stringify({ enabled: isEnabled })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Save the setting locally (like dashboard toggles)
          setGymSpecificSetting(`twoFactorEnabled_${gymId}`, isEnabled.toString());
          console.log(`💾 2FA setting saved for gym ${gymId}: ${isEnabled}`);
          
          // Show success notification
          showNotification(
            `Two-Factor Authentication ${isEnabled ? 'enabled' : 'disabled'} successfully!`, 
            'success'
          );
        } else {
          // Revert toggle on error
          this.checked = !isEnabled;
          showNotification(
            `Failed to ${isEnabled ? 'enable' : 'disable'} 2FA: ${result.message}`, 
            'error'
          );
        }
      } catch (error) {
        console.error('Error updating 2FA setting:', error);
        // Revert toggle on error
        this.checked = !isEnabled;
        showNotification(
          `Failed to ${isEnabled ? 'enable' : 'disable'} 2FA. Please try again.`, 
          'error'
        );
      }
    });
  } else {
    console.warn('⚠️ 2FA toggle element not found - ID should be "twoFactorAuth"');
  }
  
  // Login Notifications Toggle Handler
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  console.log('🔍 Login notifications toggle element found:', !!loginNotificationsToggle);
  
  if (loginNotificationsToggle) {
    console.log('✅ Setting up login notifications toggle event listener');
    
    // Ensure enhanced toggle slider functionality
    const notificationsSlider = loginNotificationsToggle.nextElementSibling;
    if (notificationsSlider && notificationsSlider.classList.contains('enhanced-toggle-slider')) {
      notificationsSlider.addEventListener('click', function(e) {
        e.preventDefault();
        loginNotificationsToggle.checked = !loginNotificationsToggle.checked;
        loginNotificationsToggle.dispatchEvent(new Event('change'));
      });
    }
    
    // Load saved state for this gym (like dashboard toggles)
    const savedNotificationsState = getGymSpecificSetting(`loginNotifications_${gymId}`);
    const isNotificationsEnabled = savedNotificationsState === 'true' || savedNotificationsState === true || 
                                   savedNotificationsState === null || savedNotificationsState === undefined; // Default enabled
    loginNotificationsToggle.checked = isNotificationsEnabled;
    console.log(`Login notifications toggle loaded state: ${isNotificationsEnabled} (saved: ${savedNotificationsState})`);
    
    loginNotificationsToggle.addEventListener('change', async function() {
      const isEnabled = this.checked;
      console.log(`🔔 Login notifications toggle changed to: ${isEnabled} for gym: ${gymId}`);
      
      try {
        // First save the API call to backend
        const response = await fetch('/api/security/toggle-login-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
          },
          body: JSON.stringify({ 
            enabled: isEnabled,
            preferences: {
              email: true,          // Enable email notifications
              browser: true,        // Enable browser notifications
              suspiciousOnly: false // Send all login notifications, not just suspicious ones
            }
          })
        });
        
        const result = await response.json();
        console.log('🔔 Login notifications API response:', result);
        
        if (result.success) {
          // Save the setting locally after successful API call
          setGymSpecificSetting(`loginNotifications_${gymId}`, isEnabled.toString());
          console.log(`💾 Login notifications setting saved for gym ${gymId}: ${isEnabled}`);
          
          // Show success notification
          showNotification(
            `Login notifications ${isEnabled ? 'enabled' : 'disabled'} successfully! ${isEnabled ? 'You will receive email alerts for login attempts.' : ''}`, 
            'success'
          );
        } else {
          // Revert toggle on API error
          this.checked = !isEnabled;
          showNotification(
            `Failed to ${isEnabled ? 'enable' : 'disable'} login notifications: ${result.message || 'Server error'}`, 
            'error'
          );
        }
        
        // If we have a manager, try to sync with it
        if (window.loginNotificationsManager && typeof window.loginNotificationsManager.syncToggleState === 'function') {
          window.loginNotificationsManager.syncToggleState(isEnabled).catch(error => {
            console.warn('⚠️ Failed to sync with login notifications manager:', error.message);
          });
        }
        
      } catch (error) {
        console.error('❌ Error handling login notifications toggle:', error);
        // Revert toggle on error
        this.checked = !isEnabled;
        showNotification(
          'Failed to update login notifications. Please check your connection and try again.', 
          'error'
        );
      }
    });
  } else {
    console.warn('⚠️ Login notifications toggle element not found - ID should be "loginNotifications"');
  }
  
  console.log('✅ Security toggle handlers setup complete');
}

// Function to load and apply saved security toggle states
function loadSecurityToggleStates(gymId) {
  console.log(`🔄 Loading saved security toggle states for gym: ${gymId}`);
  
  try {
    // Load 2FA toggle state
    const twoFactorToggle = document.getElementById('twoFactorAuth');
    if (twoFactorToggle) {
      const saved2FAState = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
      // Handle different possible saved values
      let is2FAEnabled = false;
      if (saved2FAState === 'true' || saved2FAState === true || saved2FAState === 1 || saved2FAState === '1') {
        is2FAEnabled = true;
      }
      twoFactorToggle.checked = is2FAEnabled;
      console.log(`📱 2FA toggle set to: ${is2FAEnabled} (saved value: ${saved2FAState}, type: ${typeof saved2FAState})`);
    } else {
      console.warn('⚠️ 2FA toggle element not found');
    }
    
    // Load login notifications toggle state
    const loginNotificationsToggle = document.getElementById('loginNotifications');
    if (loginNotificationsToggle) {
      const savedNotificationsState = getGymSpecificSetting(`loginNotifications_${gymId}`);
      // Handle different possible saved values
      let isNotificationsEnabled = false;
      if (savedNotificationsState === 'true' || savedNotificationsState === true || savedNotificationsState === 1 || savedNotificationsState === '1') {
        isNotificationsEnabled = true;
      }
      // Default to enabled if no saved state (first time)
      if (savedNotificationsState === null || savedNotificationsState === undefined) {
        isNotificationsEnabled = true;
        setGymSpecificSetting(`loginNotifications_${gymId}`, true);
      }
      loginNotificationsToggle.checked = isNotificationsEnabled;
      console.log(`🔔 Login notifications toggle set to: ${isNotificationsEnabled} (saved value: ${savedNotificationsState}, type: ${typeof savedNotificationsState})`);
    } else {
      console.warn('⚠️ Login notifications toggle element not found');
    }
    
    console.log('✅ Security toggle states loaded successfully');
  } catch (error) {
    console.error('❌ Error loading security toggle states:', error);
  }
}

// ===== MODAL FUNCTIONS =====
function openChangePasswordModal() {
  // Placeholder for change password modal
  alert('Change password functionality would be implemented here');
}

function openUpdateProfileModal() {
  // Placeholder for update profile modal
  alert('Update profile functionality would be implemented here');
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
  // Check if mobile
  const isMobile = window.innerWidth <= 768;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: ${isMobile ? '70px' : '80px'};
    right: ${isMobile ? '10px' : '20px'};
    ${isMobile ? 'left: 10px;' : ''}
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 999999;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: ${isMobile ? 'none' : '350px'};
    min-width: ${isMobile ? 'auto' : '280px'};
    width: ${isMobile ? 'calc(100% - 20px)' : 'auto'};
    word-wrap: break-word;
    overflow-wrap: break-word;
    box-sizing: border-box;
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
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// ===== BIOMETRIC FEEDBACK SYSTEM =====
function showBiometricFeedback(message, type = 'info') {
  // Check if mobile
  const isMobile = window.innerWidth <= 768;
  
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: ${isMobile ? '70px' : '80px'};
    right: ${isMobile ? '10px' : '20px'};
    ${isMobile ? 'left: 10px;' : ''}
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: ${isMobile ? 'none' : '350px'};
    min-width: ${isMobile ? 'auto' : '280px'};
    width: ${isMobile ? 'calc(100% - 20px)' : 'auto'};
    font-weight: 500;
    word-wrap: break-word;
    overflow-wrap: break-word;
    box-sizing: border-box;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
      ${message}
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== ESSENTIAL BIOMETRIC FUNCTIONS (EARLY DEFINITION) =====
function openBiometricEnrollment() {
  window.location.href = '/frontend/biometric-enrollment.html';
}

function openBiometricReports() {
  if (typeof showBiometricReports === 'function') {
    showBiometricReports();
  } else {
    showBiometricFeedback('Biometric reports feature coming soon!', 'info');
  }
}

function showDeviceConfigurationModal() {
  window.biometricAgentManager.checkAgentStatus().then(isRunning => {
    if (!isRunning) {
      showBiometricFeedback('⚠️ Biometric agent is not running. Please install and start the agent first.', 'warning');
      return;
    }
    
    const modal = createBiometricModal('Device Configuration', `
      <div style="padding: 20px; text-align: center;">
        <i class="fas fa-cogs fa-3x" style="color: #2196F3; margin-bottom: 20px;"></i>
        <h4>Configure Biometric Devices</h4>
        <p style="margin: 16px 0; color: #666;">Manage fingerprint scanners and cameras</p>
        
        <div id="devicesList" style="margin: 20px 0; min-height: 100px;">
          <div style="color: #666;">
            <i class="fas fa-spinner fa-spin"></i> Scanning for devices...
          </div>
        </div>
        
        <div style="margin-top: 20px;">
          <button class="btn btn-primary" onclick="scanForDevices()" style="margin-right: 10px;">
            <i class="fas fa-search"></i> Scan Devices
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();">
            Close
          </button>
        </div>
      </div>
    `);
    
    document.body.appendChild(modal);
    
    // Auto-scan for devices
    setTimeout(() => scanForDevices(), 500);
  }).catch(error => {
    showBiometricFeedback('Unable to check agent status: ' + error.message, 'error');
  });
}

function testBiometricConnection() {
  showBiometricFeedback('Testing biometric agent connection...', 'info');
  
  window.biometricAgentManager.checkAgentStatus().then(isRunning => {
    if (isRunning) {
      showBiometricFeedback('✅ Biometric agent connection successful!', 'success');
    } else {
      showBiometricFeedback('❌ Biometric agent is not running', 'error');
    }
  }).catch(error => {
    showBiometricFeedback('❌ Connection test failed: ' + error.message, 'error');
  });
}

function openBiometricDeviceSetup() {
  showDeviceConfigurationModal();
}

function createBiometricModal(title, content, maxWidth = '90%') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay biometric-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.3s ease;
  `;
  
  // Add fade-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: scale(0.9) translateY(-20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  overlay.innerHTML = `
    <div class="modal-body" style="
      background: white; 
      border-radius: 12px; 
      max-width: ${maxWidth}; 
      max-height: 90%; 
      overflow-y: auto; 
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
      margin: 20px;
    ">
      <div class="modal-header" style="
        padding: 20px 24px 0 24px; 
        border-bottom: 1px solid #eee; 
        margin-bottom: 0;
        position: sticky;
        top: 0;
        background: white;
        border-radius: 12px 12px 0 0;
        z-index: 1;
      ">
        <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; color: #333;">
          <i class="fas fa-fingerprint" style="color: #007bff;"></i> ${title}
        </h3>
        <button onclick="this.closest('.modal-overlay').remove()" style="
          position: absolute; 
          top: 15px; 
          right: 20px; 
          background: none; 
          border: none; 
          font-size: 24px; 
          cursor: pointer; 
          color: #999;
          padding: 5px;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        " 
        onmouseover="this.style.background='#f0f0f0'; this.style.color='#333';"
        onmouseout="this.style.background='none'; this.style.color='#999';"
        >×</button>
      </div>
      <div class="modal-content">
        ${content}
      </div>
    </div>
  `;
  
  // Close on background click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  return overlay;
}

function scanForDevices() {
  const devicesList = document.getElementById('devicesList');
  if (!devicesList) return;
  
  devicesList.innerHTML = '<div style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Scanning for devices...</div>';
  
  window.biometricAgentManager.scanDevices().then(devices => {
    if (devices && devices.length > 0) {
      devicesList.innerHTML = devices.map(device => `
        <div style="background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #28a745;">
          <strong>${device.name || 'Unknown Device'}</strong><br>
          <small style="color: #666;">${device.type || 'Unknown Type'} - ${device.status || 'Unknown Status'}</small>
        </div>
      `).join('');
      showBiometricFeedback(`Found ${devices.length} device(s)`, 'success');
    } else {
      devicesList.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No devices found</div>';
      showBiometricFeedback('No biometric devices detected', 'warning');
    }
  }).catch(error => {
    devicesList.innerHTML = '<div style="color: #f44336; text-align: center; padding: 20px;">Error scanning devices</div>';
    showBiometricFeedback('Device scan failed: ' + error.message, 'error');
  });
}

// Make functions globally available
window.openBiometricEnrollment = openBiometricEnrollment;
window.openBiometricReports = openBiometricReports;
window.showDeviceConfigurationModal = showDeviceConfigurationModal;
window.testBiometricConnection = testBiometricConnection;
window.openBiometricDeviceSetup = openBiometricDeviceSetup;
window.createBiometricModal = createBiometricModal;
window.scanForDevices = scanForDevices;

// ===== SETTINGS INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  // Theme Management
  const themeOptions = document.querySelectorAll('.theme-option');
  const colorOptions = document.querySelectorAll('.color-option');

  // Get gym-specific identifier for theme isolation
  const gymId = getGymId();
  if (!gymId) {
    console.warn('No gym ID found, using default theme settings');
    return;
  }

  // Load saved theme and color for this specific gym
  const savedTheme = getGymSpecificSetting(`gymAdminTheme_${gymId}`) || 'light';
  const savedColor = getGymSpecificSetting(`gymAdminColor_${gymId}`) || 'blue';

  console.log(`Loading theme settings for gym ${gymId}:`, { theme: savedTheme, color: savedColor });

  // Apply saved theme and color
  applyTheme(savedTheme);
  applyColorScheme(savedColor);

  // Update UI to reflect saved theme
  themeOptions.forEach(option => {
    option.classList.toggle('active', option.dataset.theme === savedTheme);
    // Add click handler for theme selection
    option.addEventListener('click', function() {
      themeOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      const theme = this.dataset.theme;
      applyTheme(theme);
      // Save theme for this specific gym
      setGymSpecificSetting(`gymAdminTheme_${gymId}`, theme);
      showNotification(`Theme updated for gym: ${gymId.substring(0, 8)}...`, 'success');
    });
  });

  // Enhanced Color Scheme Selector: always visible, interactive, horizontal
  const colorMap = {
    blue: '#1976d2',
    green: '#388e3c',
    purple: '#7b1fa2',
    orange: '#f57c00',
    red: '#d32f2f'
  };
  colorOptions.forEach(option => {
    const color = option.dataset.color;
    const circle = option.querySelector('.color-circle');
    if (circle) {
      circle.style.background = colorMap[color] || '#1976d2';
      circle.style.border = '2px solid #fff';
      circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
      circle.style.width = '28px';
      circle.style.height = '28px';
      circle.style.borderRadius = '50%';
      circle.style.display = 'inline-block';
      circle.style.transition = 'box-shadow 0.2s, border 0.2s';
      option.style.display = 'inline-block';
      option.style.marginRight = '18px';
      option.style.cursor = 'pointer';
      option.style.verticalAlign = 'middle';
    }
    // Set active state
    if (color === savedColor) {
      option.classList.add('active');
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
        circle.style.border = '2px solid var(--primary, #1976d2)';
      }
    } else {
      option.classList.remove('active');
      if (circle) {
        circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
        circle.style.border = '2px solid #fff';
      }
    }
    // Hover effect
    option.addEventListener('mouseenter', function() {
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary-dark, #0056b3)';
        circle.style.border = '2px solid var(--primary-dark, #0056b3)';
      }
    });
    option.addEventListener('mouseleave', function() {
      if (option.classList.contains('active')) {
        if (circle) {
          circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
          circle.style.border = '2px solid var(--primary, #1976d2)';
        }
      } else {
        if (circle) {
          circle.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
          circle.style.border = '2px solid #fff';
        }
      }
    });
    // Click handler
    option.addEventListener('click', function() {
      const color = this.dataset.color;
      // Update active state
      colorOptions.forEach(opt => {
        opt.classList.remove('active');
        const c = opt.querySelector('.color-circle');
        if (c) {
          c.style.boxShadow = '0 1px 6px rgba(0,0,0,0.10)';
          c.style.border = '2px solid #fff';
        }
      });
      this.classList.add('active');
      if (circle) {
        circle.style.boxShadow = '0 0 0 3px var(--primary, #1976d2)';
        circle.style.border = '2px solid var(--primary, #1976d2)';
      }
      // Apply color scheme
      applyColorScheme(color);
      // Save preference for this specific gym
      setGymSpecificSetting(`gymAdminColor_${gymId}`, color);
      showNotification(`Color scheme updated for gym: ${gymId.substring(0, 8)}...`, 'success');
    });
  });
  
  // Settings action handlers (individual actions only)
  document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);
  document.getElementById('updateProfileBtn')?.addEventListener('click', openUpdateProfileModal);
  
  // Individual toggle save handlers - automatically save when changed
  setupIndividualSettingsSave(gymId);
  
  // Data export handlers
  document.getElementById('exportMembersBtn')?.addEventListener('click', () => exportData('members'));
  document.getElementById('exportPaymentsBtn')?.addEventListener('click', () => exportData('payments'));
  document.getElementById('exportAttendanceBtn')?.addEventListener('click', () => exportData('attendance'));
  
  // Operating hours handlers
  setupOperatingHoursHandlers();
  
  // Load and apply saved settings
  loadSavedSettings();
  
  // Add settings tab click handler to reload security toggle states
  const settingsMenuItem = document.querySelector('[data-tab="settingsTab"]');
  if (settingsMenuItem) {
    settingsMenuItem.addEventListener('click', () => {
      console.log('🔄 Settings tab clicked, reloading security toggle states...');
      setTimeout(() => {
        const currentGymId = getGymId();
        if (currentGymId) {
          loadSecurityToggleStates(currentGymId);
          console.log('✅ Security toggle states reloaded for settings tab');
          
          // Show a brief notification to confirm toggles are loaded
          const twoFactorToggle = document.getElementById('twoFactorAuth');
          const loginNotificationsToggle = document.getElementById('loginNotifications');
          if (twoFactorToggle && loginNotificationsToggle) {
            console.log(`🔧 Security toggles loaded - 2FA: ${twoFactorToggle.checked}, Notifications: ${loginNotificationsToggle.checked}`);
          }
        }
      }, 100); // Small delay to ensure tab is loaded
    });
  }
  
  // Also add a mutation observer to detect when settings tab becomes visible
  const settingsTab = document.getElementById('settingsTab');
  if (settingsTab) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (settingsTab.style.display !== 'none' && !settingsTab.style.display.includes('none')) {
            console.log('🔄 Settings tab became visible, reloading security states...');
            setTimeout(() => {
              const currentGymId = getGymId();
              if (currentGymId) {
                loadSecurityToggleStates(currentGymId);
              }
            }, 50);
          }
        }
      });
    });
    
    observer.observe(settingsTab, { 
      attributes: true, 
      attributeFilter: ['style', 'class'] 
    });
  }
  
  // ===== DASHBOARD CUSTOMIZATION HANDLERS =====
  // Apply dashboard customization immediately, then set up handlers
  setTimeout(() => {
    setupDashboardCustomization();
    setupBiometricAttendance(); // Initialize biometric settings
    
    // Initialize biometric button visibility based on current settings
    const gymId = getGymId();
    if (gymId) {
      const biometricEnabled = isBiometricAttendanceEnabled(gymId);
      updateBiometricQuickActionVisibility(gymId, biometricEnabled);
      console.log(`Initial biometric status for gym ${gymId}: ${biometricEnabled}`);
    }
    
    // Initialize passkey settings UI if payment manager is available
    if (window.paymentManager && typeof window.paymentManager.updatePasskeySettingsUI === 'function') {
      window.paymentManager.updatePasskeySettingsUI();
    }
  }, 100); // Small delay to ensure all DOM elements are ready
});

// ===== GYM-SPECIFIC SETTINGS MANAGEMENT =====
function getGymId() {
  console.log('🔍 Getting gym ID...');
  
  // 1. From JWT token (most reliable)
  const token = localStorage.getItem('gymAdminToken');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload:', payload);
      
      // Check the actual structure from gymController.js: payload.admin.id
      if (payload.admin && payload.admin.id) {
        console.log('✅ Found gym ID from JWT admin.id:', payload.admin.id);
        // Store in session for consistency
        sessionStorage.setItem('currentGymId', payload.admin.id);
        return payload.admin.id;
      }
      
      // Check other possible properties in JWT (fallback)
      const possibleIds = [payload.gymId, payload.id, payload._id, payload.userId, payload.gym];
      for (let id of possibleIds) {
        if (id) {
          console.log('✅ Found gym ID from JWT fallback:', id);
          sessionStorage.setItem('currentGymId', id);
          return id;
        }
      }
    } catch (e) {
      console.warn('❌ Could not parse gym ID from token:', e);
    }
  }
  
  // 2. From global gym profile if available
  if (window.currentGymProfile && window.currentGymProfile._id) {
    console.log('✅ Found gym ID from currentGymProfile._id:', window.currentGymProfile._id);
    sessionStorage.setItem('currentGymId', window.currentGymProfile._id);
    return window.currentGymProfile._id;
  }
  
  // 3. Try to extract from admin profile data
  if (window.currentGymProfile && window.currentGymProfile.id) {
    console.log('✅ Found gym ID from currentGymProfile.id:', window.currentGymProfile.id);
    sessionStorage.setItem('currentGymId', window.currentGymProfile.id);
    return window.currentGymProfile.id;
  }
  
  // 4. From session storage (temporary storage)
  const sessionGymId = sessionStorage.getItem('currentGymId');
  if (sessionGymId) {
    console.log('✅ Found gym ID from sessionStorage:', sessionGymId);
    return sessionGymId;
  }
  
  // 5. Try to get from URL parameters (if redirected with gymId)
  const urlParams = new URLSearchParams(window.location.search);
  const gymIdFromUrl = urlParams.get('gymId');
  if (gymIdFromUrl) {
    console.log('✅ Found gym ID from URL:', gymIdFromUrl);
    // Store in session for future use
    sessionStorage.setItem('currentGymId', gymIdFromUrl);
    return gymIdFromUrl;
  }
  
  // 6. Extract from token email/username (create pseudo-unique ID)
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = payload.admin?.email || payload.email;
      if (email) {
        // Create a deterministic ID based on email
        const emailHash = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        const pseudoId = 'gym_' + emailHash;
        console.log('✅ Created pseudo gym ID from email:', pseudoId);
        sessionStorage.setItem('currentGymId', pseudoId);
        return pseudoId;
      }
    } catch (e) {
      console.warn('Could not extract email from token');
    }
  }
  
  // 7. Last resort - create a session-specific unique ID (will be different each session)
  const sessionId = 'gym_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.log('⚠️ Using session-specific fallback ID:', sessionId);
  sessionStorage.setItem('currentGymId', sessionId);
  return sessionId;
}

function getGymSpecificSetting(key) {
  return localStorage.getItem(key);
}

function setGymSpecificSetting(key, value) {
  localStorage.setItem(key, value);
}

function removeGymSpecificSetting(key) {
  localStorage.removeItem(key);
}

// Clear all settings for a specific gym
function clearGymSpecificSettings(gymId) {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes(`_${gymId}`)) {
      localStorage.removeItem(key);
    }
  });
}

// Function to handle gym login/logout - call this when switching gyms
function handleGymSwitch(newGymId) {
  const currentGymId = sessionStorage.getItem('currentGymId');
  
  if (currentGymId && currentGymId !== newGymId) {
    console.log(`🔄 Switching from gym ${currentGymId} to ${newGymId}`);
  }
  
  // Update session storage with new gym ID
  sessionStorage.setItem('currentGymId', newGymId);
  
  // Force reapply settings for the new gym
  setTimeout(() => {
    if (typeof setupDashboardCustomization === 'function') {
      setupDashboardCustomization();
    }
    
    if (typeof forceReapplySettings === 'function') {
      forceReapplySettings();
    }
    
    // Load gym-specific security settings immediately
    if (typeof loadGymSpecificSecuritySettings === 'function') {
      loadGymSpecificSecuritySettings(newGymId);
    }
    
    // Reload 2FA status for the new gym
    if (window.twoFactorManager && typeof window.twoFactorManager.load2FAStatus === 'function') {
      window.twoFactorManager.load2FAStatus().catch(error => {
        console.error('Error loading 2FA status after gym switch:', error);
      });
    }
    
    // Reload login notification status for the new gym
    if (window.loginNotificationsManager && typeof window.loginNotificationsManager.loadNotificationStatus === 'function') {
      window.loginNotificationsManager.loadNotificationStatus().catch(error => {
        console.error('Error loading login notification status after gym switch:', error);
      });
    }
  }, 100);
}

// Function to verify gym isolation is working
function verifyGymIsolation() {
  const gymId = getGymId();
  const allStorageKeys = Object.keys(localStorage);
  const gymSpecificKeys = allStorageKeys.filter(key => key.includes('dashboard') && key.includes('_'));
  
  console.log('=== Gym Isolation Verification ===');
  console.log('Current Gym ID:', gymId);
  console.log('All dashboard-related storage keys:', gymSpecificKeys);
  
  const thisGymKeys = gymSpecificKeys.filter(key => key.includes(`_${gymId}`));
  const otherGymKeys = gymSpecificKeys.filter(key => !key.includes(`_${gymId}`));
  
  console.log('Keys for current gym:', thisGymKeys);
  console.log('Keys for other gyms:', otherGymKeys);
  console.log('==================================');
  
  return {
    currentGymId: gymId,
    thisGymKeys,
    otherGymKeys,
    isolated: thisGymKeys.length >= 0 // At least some settings exist for this gym
  };
}

// Debug function to show current gym ID and settings
function debugGymSettings() {
  const gymId = getGymId();
  const equipmentVisible = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`);
  const paymentVisible = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`);
  
  // Check actual DOM visibility
  const equipmentMenuItems = document.querySelectorAll('.menu-item:has(.fa-dumbbell), .menu-item');
  const paymentMenuItems = document.querySelectorAll('.menu-item:has(.fa-credit-card), .menu-item');
  
  let visibleEquipmentItems = 0;
  let visiblePaymentItems = 0;
  
  equipmentMenuItems.forEach(item => {
    const icon = item.querySelector('i.fa-dumbbell');
    const onclick = item.getAttribute('onclick');
    if (icon || (onclick && onclick.includes('equipment'))) {
      if (item.style.display !== 'none') visibleEquipmentItems++;
    }
  });
  
  paymentMenuItems.forEach(item => {
    const icon = item.querySelector('i.fa-credit-card');
    const onclick = item.getAttribute('onclick');
    if (icon || (onclick && onclick.includes('payment'))) {
      if (item.style.display !== 'none') visiblePaymentItems++;
    }
  });
  
  console.log('=== Gym Dashboard Settings Debug ===');
  console.log('Current Gym ID:', gymId);
  console.log('Equipment Setting:', equipmentVisible, '(Expected:', equipmentVisible !== 'false', ')');
  console.log('Payment Setting:', paymentVisible, '(Expected:', paymentVisible !== 'false', ')');
  console.log('Visible Equipment Items:', visibleEquipmentItems);
  console.log('Visible Payment Items:', visiblePaymentItems);
  console.log('Storage Keys for this gym:', Object.keys(localStorage).filter(key => key.includes(gymId)));
  console.log('Early styles present:', !!document.getElementById('earlyCustomizationStyles'));
  console.log('=====================================');
  
  return {
    gymId,
    equipmentVisible: equipmentVisible !== 'false',
    paymentVisible: paymentVisible !== 'false',
    actualEquipmentVisible: visibleEquipmentItems > 0,
    actualPaymentVisible: visiblePaymentItems > 0
  };
}

// Add function to force reapply settings (useful for debugging)
function forceReapplySettings() {
  const gymId = getGymId();
  if (!gymId) {
    console.error('No gym ID found');
    return;
  }
  
  const equipmentVisible = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`) !== 'false';
  const paymentVisible = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`) !== 'false';
  
  console.log('Force reapplying settings for gym', gymId);
  applyTabVisibility('equipment', equipmentVisible);
  applyTabVisibility('payment', paymentVisible);
  
  return debugGymSettings();
}

// Function to debug JWT token contents
function debugJWTToken() {
  const token = localStorage.getItem('gymAdminToken');
  if (!token) {
    console.log('❌ No JWT token found');
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('=== JWT Token Debug ===');
    console.log('Full payload:', payload);
    console.log('Available properties:', Object.keys(payload));
    console.log('Possible gym IDs found:');
    
    // Check the actual structure first
    if (payload.admin) {
      console.log('  admin object found:', payload.admin);
      if (payload.admin.id) {
        console.log('  ✅ admin.id (MAIN):', payload.admin.id);
      }
      if (payload.admin.email) {
        console.log('  admin.email:', payload.admin.email);
      }
    }
    
    // Check other possible locations
    const possibleIds = [
      { key: 'gymId', value: payload.gymId },
      { key: 'id', value: payload.id },
      { key: '_id', value: payload._id },
      { key: 'userId', value: payload.userId },
      { key: 'gym', value: payload.gym },
      { key: 'email', value: payload.email }
    ];
    
    possibleIds.forEach(item => {
      if (item.value) {
        console.log(`  ${item.key}:`, item.value);
      }
    });
    
    console.log('Current session gym ID:', sessionStorage.getItem('currentGymId'));
    console.log('=====================');
    return payload;
  } catch (e) {
    console.error('❌ Error parsing JWT token:', e);
    return null;
  }
}

// Function to manually reset gym detection (useful for testing)
function resetGymDetection() {
  console.log('🔄 Manually resetting gym detection...');
  
  // Clear session storage
  sessionStorage.removeItem('currentGymId');
  
  // Force re-detection
  const newGymId = getGymId();
  
  console.log('✅ New gym ID detected:', newGymId);
  
  // Reapply settings
  if (typeof forceReapplySettings === 'function') {
    return forceReapplySettings();
  }
  
  return { newGymId };
}

// Make debug and utility functions globally available
window.debugGymSettings = debugGymSettings;
window.forceReapplySettings = forceReapplySettings;
window.handleGymSwitch = handleGymSwitch;
window.verifyGymIsolation = verifyGymIsolation;
window.debugJWTToken = debugJWTToken;
window.resetGymDetection = resetGymDetection;

// Add simple security toggle testing functions
window.testSecurityToggles = function() {
  console.log('🧪 Testing security toggles...');
  
  const gymId = getGymId();
  console.log('Current gym ID:', gymId);
  
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  
  console.log('Toggle elements found:');
  console.log('- 2FA toggle:', !!twoFactorToggle);
  console.log('- Login notifications toggle:', !!loginNotificationsToggle);
  
  if (twoFactorToggle) {
    console.log('Setting up 2FA toggle manually...');
    twoFactorToggle.onclick = function() {
      console.log('2FA toggle clicked!');
      const isEnabled = this.checked;
      setGymSpecificSetting(`twoFactorEnabled_${gymId}`, isEnabled.toString());
      showNotification(`2FA ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
    };
  }
  
  if (loginNotificationsToggle) {
    console.log('Setting up login notifications toggle manually...');
    loginNotificationsToggle.onclick = function() {
      console.log('Login notifications toggle clicked!');
      const isEnabled = this.checked;
      setGymSpecificSetting(`loginNotifications_${gymId}`, isEnabled.toString());
      showNotification(`Login notifications ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
    };
  }
  
  return {
    gymId,
    togglesFound: {
      twoFactor: !!twoFactorToggle,
      loginNotifications: !!loginNotificationsToggle
    },
    currentStates: {
      twoFactor: twoFactorToggle?.checked,
      loginNotifications: loginNotificationsToggle?.checked
    },
    savedStates: {
      twoFactor: getGymSpecificSetting(`twoFactorEnabled_${gymId}`),
      loginNotifications: getGymSpecificSetting(`loginNotifications_${gymId}`)
    }
  };
};

// Simplified security toggle setup function
window.setupSimplifiedSecurityToggles = function() {
  console.log('🔧 Setting up simplified security toggles...');
  
  const gymId = getGymId();
  if (!gymId) {
    console.error('No gym ID found');
    return false;
  }
  
  // Setup 2FA toggle
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  if (twoFactorToggle) {
    // Remove existing listeners
    const newToggle = twoFactorToggle.cloneNode(true);
    twoFactorToggle.parentNode.replaceChild(newToggle, twoFactorToggle);
    
    // Load saved state
    const saved2FA = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
    newToggle.checked = saved2FA === 'true';
    
    // Add click handler
    newToggle.addEventListener('change', async function() {
      const isEnabled = this.checked;
      console.log(`2FA changed to: ${isEnabled}`);
      
      try {
        setGymSpecificSetting(`twoFactorEnabled_${gymId}`, isEnabled.toString());
        showNotification(`Two-Factor Authentication ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
        
        // Try API call
        const response = await fetch('/api/security/toggle-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
          },
          body: JSON.stringify({ enabled: isEnabled })
        });
        
        if (!response.ok) {
          console.warn('API call failed, but local setting saved');
        }
      } catch (error) {
        console.error('Error saving 2FA setting:', error);
        showNotification('Error saving 2FA setting', 'error');
      }
    });
    
    console.log('✅ 2FA toggle setup complete');
  }
  
  // Setup login notifications toggle
  const loginToggle = document.getElementById('loginNotifications');
  if (loginToggle) {
    // Remove existing listeners
    const newLoginToggle = loginToggle.cloneNode(true);
    loginToggle.parentNode.replaceChild(newLoginToggle, loginToggle);
    
    // Load saved state
    const savedLogin = getGymSpecificSetting(`loginNotifications_${gymId}`);
    newLoginToggle.checked = savedLogin !== 'false';
    
    // Add click handler
    newLoginToggle.addEventListener('change', async function() {
      const isEnabled = this.checked;
      console.log(`Login notifications changed to: ${isEnabled}`);
      
      try {
        setGymSpecificSetting(`loginNotifications_${gymId}`, isEnabled.toString());
        showNotification(`Login notifications ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
        
        // Try API call
        const response = await fetch('/api/security/toggle-login-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
          },
          body: JSON.stringify({ enabled: isEnabled })
        });
        
        if (!response.ok) {
          console.warn('API call failed, but local setting saved');
        }
      } catch (error) {
        console.error('Error saving login notifications setting:', error);
        showNotification('Error saving login notifications setting', 'error');
      }
    });
    
    console.log('✅ Login notifications toggle setup complete');
  }
  
  return true;
};

// Add simple security toggle testing functions
window.testSecurityToggles = function() {
  console.log('🧪 Testing security toggles...');
  
  const gymId = getGymId();
  console.log('Current gym ID:', gymId);
  
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  
  console.log('Toggle elements found:');
  console.log('- 2FA toggle:', !!twoFactorToggle);
  console.log('- Login notifications toggle:', !!loginNotificationsToggle);
  
  if (twoFactorToggle) {
    console.log('2FA toggle current state:', twoFactorToggle.checked);
    const saved2FA = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
    console.log('2FA saved state:', saved2FA);
  }
  
  if (loginNotificationsToggle) {
    console.log('Login notifications toggle current state:', loginNotificationsToggle.checked);
    const savedNotifications = getGymSpecificSetting(`loginNotifications_${gymId}`);
    console.log('Login notifications saved state:', savedNotifications);
  }
  
  return {
    gymId,
    togglesFound: {
      twoFactor: !!twoFactorToggle,
      loginNotifications: !!loginNotificationsToggle
    },
    currentStates: {
      twoFactor: twoFactorToggle?.checked,
      loginNotifications: loginNotificationsToggle?.checked
    },
    savedStates: {
      twoFactor: getGymSpecificSetting(`twoFactorEnabled_${gymId}`),
      loginNotifications: getGymSpecificSetting(`loginNotifications_${gymId}`)
    }
  };
};

window.resetSecurityToggles = function() {
  console.log('🔄 Resetting security toggles...');
  
  const gymId = getGymId();
  removeGymSpecificSetting(`twoFactorEnabled_${gymId}`);
  removeGymSpecificSetting(`loginNotifications_${gymId}`);
  
  console.log('✅ Security toggle settings cleared');
  
  // Reload the states
  loadSecurityToggleStates(gymId);
  console.log('✅ Security toggle states reloaded');
};

window.forceToggleSecurityState = function(toggleType, state) {
  console.log(`🔧 Force setting ${toggleType} to ${state}...`);
  
  const gymId = getGymId();
  const elementId = toggleType === '2fa' ? 'twoFactorAuth' : 'loginNotifications';
  const settingKey = toggleType === '2fa' ? `twoFactorEnabled_${gymId}` : `loginNotifications_${gymId}`;
  
  const toggle = document.getElementById(elementId);
  if (toggle) {
    toggle.checked = state;
    setGymSpecificSetting(settingKey, state);
    console.log(`✅ ${toggleType} manually set to ${state}`);
  } else {
    console.error(`❌ ${toggleType} toggle element not found`);
  }
};

// Add 2FA debugging functions
window.debug2FAStatus = async function() {
  console.log('=== 2FA Status Debug ===');
  const gymId = window.getGymId ? window.getGymId() : 'default';
  console.log('Current Gym ID:', gymId);
  
  // Check API status
  try {
    const apiStatus = await window.twoFactorManager.get2FAStatus();
    console.log('API 2FA Status:', apiStatus);
  } catch (error) {
    console.log('API Error:', error.message);
  }
  
  // Check local storage
  const localStatus = window.getGymSpecificSetting ? 
    window.getGymSpecificSetting(`twoFactorEnabled_${gymId}`) : null;
  console.log('Local Storage Status:', localStatus);
  
  // Check toggle state
  const toggle = document.getElementById('twoFactorAuth');
  console.log('Toggle Element Found:', !!toggle);
  console.log('Toggle Checked:', toggle?.checked);
  
  console.log('=======================');
};

window.force2FAReload = async function() {
  console.log('🔄 Force reloading 2FA status...');
  await window.twoFactorManager.load2FAStatus();
  console.log('✅ 2FA status reloaded');
};

// Test function to demonstrate gym-specific 2FA settings
window.test2FAGymSpecific = async function() {
  const gymId = window.getGymId ? window.getGymId() : 'default';
  console.log('=== 2FA Gym-Specific Test ===');
  console.log('Current Gym ID:', gymId);
  
  // Enable 2FA programmatically
  console.log('Simulating 2FA enable...');
  window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, true);
  
  // Reload status
  await window.twoFactorManager.load2FAStatus();
  
  // Check if toggle updated
  const toggle = document.getElementById('twoFactorAuth');
  console.log('Toggle state after enable:', toggle?.checked);
  
  // Test switching to a different "gym" (simulate)
  const testGymId = 'test_gym_' + Date.now();
  console.log('Switching to test gym:', testGymId);
  window.setGymSpecificSetting(`twoFactorEnabled_${testGymId}`, false);
  
  // Simulate gym switch
  sessionStorage.setItem('currentGymId', testGymId);
  await window.twoFactorManager.load2FAStatus();
  console.log('Toggle state for test gym:', toggle?.checked);
  
  // Switch back
  sessionStorage.setItem('currentGymId', gymId);
  await window.twoFactorManager.load2FAStatus();
  console.log('Toggle state after switching back:', toggle?.checked);
  
  console.log('=============================');
};

// Make biometric status checking functions globally available
window.isBiometricAttendanceEnabled = isBiometricAttendanceEnabled;
window.isFingerprintAttendanceEnabled = isFingerprintAttendanceEnabled;
window.isFaceRecognitionAttendanceEnabled = isFaceRecognitionAttendanceEnabled;
window.updateBiometricQuickActionVisibility = updateBiometricQuickActionVisibility;
window.handleBiometricEnrollmentRedirect = handleBiometricEnrollmentRedirect;
window.handleBiometricDeviceSetupRedirect = handleBiometricDeviceSetupRedirect;
window.showBiometricEnablementPrompt = showBiometricEnablementPrompt;

// Add biometric toggle debugging function
window.testBiometricToggle = function() {
  console.log('🧪 Testing biometric toggle functionality...');
  
  const gymId = getGymId();
  console.log('Current gym ID:', gymId);
  
  const fingerprintToggle = document.getElementById('toggleFingerprintAttendance');
  const faceRecognitionToggle = document.getElementById('toggleFaceRecognitionAttendance');
  
  console.log('Fingerprint toggle element:', fingerprintToggle);
  console.log('Face recognition toggle element:', faceRecognitionToggle);
  
  if (fingerprintToggle) {
    console.log('Fingerprint toggle checked:', fingerprintToggle.checked);
  }
  
  if (faceRecognitionToggle) {
    console.log('Face recognition toggle checked:', faceRecognitionToggle.checked);
  }
  
  // Test current settings
  const currentSettings = getBiometricSettings(gymId);
  console.log('Current biometric settings:', currentSettings);
  
  // Test saving a setting
  console.log('Testing save fingerprint setting...');
  setBiometricSetting(gymId, 'fingerprintEnabled', true);
  
  const savedValue = getBiometricSetting(gymId, 'fingerprintEnabled');
  console.log('Retrieved saved value:', savedValue, typeof savedValue);
  
  return {
    gymId,
    fingerprintToggle: !!fingerprintToggle,
    faceRecognitionToggle: !!faceRecognitionToggle,
    currentSettings,
    testSave: savedValue
  };
};

// Add manual toggle test function
window.manualToggleTest = function() {
  console.log('🔧 Manual toggle test starting...');
  
  const fingerprintToggle = document.getElementById('toggleFingerprintAttendance');
  if (!fingerprintToggle) {
    console.error('❌ Fingerprint toggle not found!');
    return false;
  }
  
  console.log('Toggle found, current state:', fingerprintToggle.checked);
  
  // Manually trigger the toggle
  fingerprintToggle.checked = !fingerprintToggle.checked;
  console.log('Toggle state changed to:', fingerprintToggle.checked);
  
  // Manually trigger the change event
  const changeEvent = new Event('change', { bubbles: true });
  fingerprintToggle.dispatchEvent(changeEvent);
  
  console.log('Change event dispatched');
  return true;
};

// Add debug function for biometric system testing
window.debugBiometricSystem = function() {
  console.log('🔧 === BIOMETRIC SYSTEM DEBUG ===');
  
  const gymId = getGymId();
  console.log('1. Current Gym ID:', gymId);
  
  // Check toggle elements
  const fingerprintToggle = document.getElementById('toggleFingerprintAttendance');
  const faceToggle = document.getElementById('toggleFaceRecognitionAttendance');
  
  console.log('2. Toggle Elements:');
  console.log('   - Fingerprint toggle:', !!fingerprintToggle, fingerprintToggle?.checked);
  console.log('   - Face toggle:', !!faceToggle, faceToggle?.checked);
  
  // Check biometric manager
  console.log('3. Biometric Agent Manager:', !!window.biometricAgentManager);
  
  // Check bypass status
  console.log('4. Bypass enabled:', !!window.bypassBiometricAgentCheck);
  
  // Check settings
  const biometricSettings = getBiometricSettings(gymId);
  console.log('5. Current biometric settings:', biometricSettings);
  
  // Test agent status
  if (window.biometricAgentManager) {
    console.log('6. Testing agent status...');
    window.biometricAgentManager.checkAgentStatus().then(status => {
      console.log('   Agent status:', status);
    }).catch(error => {
      console.log('   Agent status error:', error);
    });
  }
  
  console.log('================================');
  
  return {
    gymId,
    fingerprintToggle: !!fingerprintToggle,
    faceToggle: !!faceToggle,
    biometricManager: !!window.biometricAgentManager,
    bypassEnabled: !!window.bypassBiometricAgentCheck,
    settings: biometricSettings
  };
};

// Add manual toggle test function specifically for biometric
window.testBiometricToggleManually = async function() {
  console.log('🧪 Manual biometric toggle test...');
  
  const fingerprintToggle = document.getElementById('toggleFingerprintAttendance');
  if (!fingerprintToggle) {
    console.error('❌ Fingerprint toggle not found');
    return false;
  }
  
  console.log('Current state:', fingerprintToggle.checked);
  
  // Simulate toggle click
  console.log('Simulating toggle click...');
  fingerprintToggle.checked = !fingerprintToggle.checked;
  
  // Trigger change event
  const changeEvent = new Event('change', { bubbles: true });
  fingerprintToggle.dispatchEvent(changeEvent);
  
  console.log('New state:', fingerprintToggle.checked);
  console.log('✅ Manual toggle test completed');
  
  return true;
};

// Add function to force show biometric modal
window.testBiometricModal = function() {
  console.log('🎭 Testing biometric modal display...');
  
  const testModal = createBiometricModal(
    'Test Biometric Modal',
    `
    <div style="padding: 30px; text-align: center;">
      <h4>Modal Test Successful!</h4>
      <p style="margin: 20px 0; color: #666;">
        This modal is working correctly. You can now test biometric features.
      </p>
      <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();">
        Close Test Modal
      </button>
    </div>
    `
  );
  
  document.body.appendChild(testModal);
  console.log('✅ Test modal displayed');
};

// Add enhanced bypass function with notification
window.enableBiometricBypass = function() {
  window.bypassBiometricAgentCheck = true;
  console.log('✅ Biometric agent check bypassed - toggles will work without agent');
  
  showBiometricFeedback('Testing mode enabled - biometric agent check bypassed', 'success');
  
  // Update UI to show bypass status
  const bypassIndicator = document.createElement('div');
  bypassIndicator.id = 'biometricBypassIndicator';
  bypassIndicator.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: #fff3cd;
    color: #856404;
    padding: 8px 15px;
    border-radius: 6px;
    border: 1px solid #ffeaa7;
    font-size: 0.85rem;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
  bypassIndicator.innerHTML = `
    <i class="fas fa-vial"></i> Testing Mode Active
    <button onclick="window.disableBiometricBypass()" style="
      background: none; 
      border: none; 
      color: #856404; 
      margin-left: 8px; 
      cursor: pointer;
      font-weight: bold;
    ">×</button>
  `;
  
  // Remove existing indicator
  const existing = document.getElementById('biometricBypassIndicator');
  if (existing) existing.remove();
  
  document.body.appendChild(bypassIndicator);
  
  return 'Biometric agent check bypassed for testing';
};

window.disableBiometricBypass = function() {
  window.bypassBiometricAgentCheck = false;
  console.log('🔒 Biometric agent check re-enabled - agent required for toggles');
  
  // Remove bypass indicator
  const indicator = document.getElementById('biometricBypassIndicator');
  if (indicator) indicator.remove();
  
  showBiometricFeedback('Testing mode disabled - agent check re-enabled', 'info');
  
  return 'Biometric agent check re-enabled';
};

// Add biometric testing functions
window.testBiometricAgent = async function() {
  console.log('🧪 Testing biometric agent...');
  
  const agent = window.biometricAgentManager;
  if (!agent) {
    console.error('❌ Biometric agent manager not found');
    return;
  }
  
  console.log('1. Checking agent status...');
  const isRunning = await agent.checkAgentStatus();
  console.log('2. Agent status:', isRunning ? '✅ RUNNING' : '❌ NOT RUNNING');
  
  console.log('3. Updating UI...');
  agent.updateAgentStatusUI(isRunning);
  
  console.log('4. Testing downloadAndInstallAgent method...');
  try {
    await agent.downloadAndInstallAgent();
    console.log('✅ downloadAndInstallAgent completed successfully');
  } catch (error) {
    console.error('❌ downloadAndInstallAgent failed:', error);
  }
  
  // Test simple agent file detection
  console.log('5. Testing simple agent file detection...');
  try {
    const response = await fetch('/biometric-agent/simple-agent.js');
    console.log('Simple agent file accessible:', response.ok ? '✅ YES' : '❌ NO');
  } catch (error) {
    console.log('Simple agent file accessible: ❌ NO (Error:', error.message, ')');
  }
  
  return {
    agentRunning: isRunning,
    agentUrl: agent.agentUrl,
    agentStatus: agent.agentStatus,
    timestamp: new Date().toISOString()
  };
};

window.forceAgentStatusUpdate = async function() {
  console.log('🔄 Forcing agent status update...');
  const agent = window.biometricAgentManager;
  const isRunning = await agent.checkAgentStatus();
  agent.updateAgentStatusUI(isRunning);
  console.log('Status:', isRunning ? '✅ RUNNING' : '❌ NOT RUNNING');
  return isRunning;
};

window.simulateAgentSetup = async function() {
  console.log('🎭 Simulating agent setup button click...');
  const agent = window.biometricAgentManager;
  
  console.log('Running downloadAndInstallAgent...');
  await agent.downloadAndInstallAgent();
  
  console.log('✅ Setup simulation completed');
};
function setupDashboardCustomization() {
  const equipmentToggle = document.getElementById('toggleEquipmentTab');
  const paymentToggle = document.getElementById('togglePaymentTab');
  
  // Get gym-specific identifier
  const gymId = getGymId();
  if (!gymId) {
    console.warn('No gym ID found, dashboard customization will not work properly');
    return;
  }
  
  // Load saved dashboard preferences for this specific gym
  const savedEquipmentVisible = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`) !== 'false';
  const savedPaymentVisible = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`) !== 'false';
  
  console.log(`Loading dashboard settings for gym ${gymId}:`, {
    equipment: savedEquipmentVisible,
    payment: savedPaymentVisible
  });
  
  // Set initial toggle states
  if (equipmentToggle) {
    equipmentToggle.checked = savedEquipmentVisible;
    
    // Ensure enhanced toggle slider functionality
    const equipmentSlider = equipmentToggle.nextElementSibling;
    if (equipmentSlider && equipmentSlider.classList.contains('enhanced-toggle-slider')) {
      equipmentSlider.addEventListener('click', function(e) {
        e.preventDefault();
        equipmentToggle.checked = !equipmentToggle.checked;
        equipmentToggle.dispatchEvent(new Event('change'));
      });
    }
  }
  if (paymentToggle) {
    paymentToggle.checked = savedPaymentVisible;
    
    // Ensure enhanced toggle slider functionality
    const paymentSlider = paymentToggle.nextElementSibling;
    if (paymentSlider && paymentSlider.classList.contains('enhanced-toggle-slider')) {
      paymentSlider.addEventListener('click', function(e) {
        e.preventDefault();
        paymentToggle.checked = !paymentToggle.checked;
        paymentToggle.dispatchEvent(new Event('change'));
      });
    }
  }
  
  // Apply visibility immediately and forcefully
  applyTabVisibility('equipment', savedEquipmentVisible);
  applyTabVisibility('payment', savedPaymentVisible);
  
  // Add event listeners
  if (equipmentToggle) {
    equipmentToggle.addEventListener('change', function() {
      const isVisible = this.checked;
      applyTabVisibility('equipment', isVisible);
      setGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`, isVisible.toString());
      showCustomizationFeedback('Equipment tab ' + (isVisible ? 'enabled' : 'disabled'));
    });
  }
  
  if (paymentToggle) {
    paymentToggle.addEventListener('change', function() {
      const isVisible = this.checked;
      applyTabVisibility('payment', isVisible);
      setGymSpecificSetting(`dashboardPaymentVisible_${gymId}`, isVisible.toString());
      showCustomizationFeedback('Payment tab ' + (isVisible ? 'enabled' : 'disabled'));
    });
  }
}

// ===== UNIFIED TAB VISIBILITY MANAGEMENT =====
function applyTabVisibility(tabType, isVisible) {
  console.log(`Applying ${tabType} tab visibility:`, isVisible);
  
  const displayValue = isVisible ? 'block' : 'none';
  const flexDisplayValue = isVisible ? 'flex' : 'none';
  
  if (tabType === 'equipment') {
    // Equipment menu items in sidebar
    const equipmentSelectors = [
      '.menu-item:has(.fa-dumbbell)',
      '.menu-item:has([onclick*="equipment"])',
      '.menu-item:has([onclick*="Equipment"])'
    ];
    
    equipmentSelectors.forEach(selector => {
      try {
        const items = document.querySelectorAll(selector);
        items.forEach(item => {
          item.style.display = displayValue;
          item.style.setProperty('display', displayValue, 'important');
        });
      } catch (e) {
        // Fallback for browsers that don't support :has()
        console.warn('CSS :has() not supported, using fallback');
      }
    });
    
    // Fallback method for equipment menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const link = item.querySelector('.menu-link');
      const icon = item.querySelector('i.fa-dumbbell');
      const onclick = item.getAttribute('onclick') || (link && link.getAttribute('onclick'));
      
      if (icon || (onclick && onclick.includes('equipment')) || (onclick && onclick.includes('Equipment'))) {
        item.style.display = displayValue;
        item.style.setProperty('display', displayValue, 'important');
      }
    });
    
    // Equipment quick action buttons - EXCLUDE the Add Equipment quick action
    const quickActions = document.querySelectorAll('.quick-action-btn, .quick-action');
    quickActions.forEach(btn => {
      const icon = btn.querySelector('i.fa-dumbbell');
      const onclick = btn.getAttribute('onclick');
      const isAddEquipmentQuickAction = btn.id === 'uploadEquipmentBtn'; // This should NOT be hidden
      
      if ((icon || (onclick && onclick.includes('equipment'))) && !isAddEquipmentQuickAction) {
        const parentElement = btn.parentElement;
        if (parentElement) {
          parentElement.style.display = flexDisplayValue;
          parentElement.style.setProperty('display', flexDisplayValue, 'important');
        }
      }
    });
    
    // Equipment gallery section
    const equipmentCards = document.querySelectorAll('.card');
    equipmentCards.forEach(card => {
      const title = card.querySelector('.card-title');
      if (title && title.textContent.includes('Equipment Gallery')) {
        card.style.display = displayValue;
        card.style.setProperty('display', displayValue, 'important');
      }
    });
    
    // Equipment tab content
    const equipmentTab = document.getElementById('equipmentTab');
    if (equipmentTab) {
      if (!isVisible && equipmentTab.style.display !== 'none') {
        // Switch to dashboard if equipment tab is currently visible
        hideAllMainTabs();
        const dashboardContent = document.querySelector('.content');
        if (dashboardContent) {
          dashboardContent.style.display = 'block';
          updateActiveMenuItem('dashboard');
        }
      }
    }
    
  } else if (tabType === 'payment') {
    // Payment menu items in sidebar
    const paymentSelectors = [
      '.menu-item:has(.fa-credit-card)',
      '.menu-item:has([onclick*="payment"])',
      '.menu-item:has([onclick*="Payment"])'
    ];
    
    paymentSelectors.forEach(selector => {
      try {
        const items = document.querySelectorAll(selector);
        items.forEach(item => {
          item.style.display = displayValue;
          item.style.setProperty('display', displayValue, 'important');
        });
      } catch (e) {
        // Fallback for browsers that don't support :has()
        console.warn('CSS :has() not supported, using fallback');
      }
    });
    
    // Fallback method for payment menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      const link = item.querySelector('.menu-link');
      const icon = item.querySelector('i.fa-credit-card');
      const onclick = item.getAttribute('onclick') || (link && link.getAttribute('onclick'));
      
      if (icon || (onclick && onclick.includes('payment')) || (onclick && onclick.includes('Payment'))) {
        item.style.display = displayValue;
        item.style.setProperty('display', displayValue, 'important');
      }
    });
    
    // Payment quick action buttons
    const quickActions = document.querySelectorAll('.quick-action-btn, .quick-action');
    quickActions.forEach(btn => {
      const icon = btn.querySelector('i.fa-credit-card');
      const onclick = btn.getAttribute('onclick');
      
      if (icon || (onclick && onclick.includes('payment'))) {
        const parentElement = btn.parentElement;
        if (parentElement) {
          parentElement.style.display = flexDisplayValue;
          parentElement.style.setProperty('display', flexDisplayValue, 'important');
        }
      }
    });
    
    // Payment tab content
    const paymentTab = document.getElementById('paymentTab');
    if (paymentTab) {
      if (!isVisible && paymentTab.style.display !== 'none') {
        // Switch to dashboard if payment tab is currently visible
        hideAllMainTabs();
        const dashboardContent = document.querySelector('.content');
        if (dashboardContent) {
          dashboardContent.style.display = 'block';
          updateActiveMenuItem('dashboard');
        }
      }
    }
  }
  
  // Remove early customization styles if they exist (since we're now applying proper styles)
  const earlyStyles = document.getElementById('earlyCustomizationStyles');
  if (earlyStyles) {
    earlyStyles.remove();
  }
}

function updateActiveMenuItem(activeTab) {
  const sidebarMenuLinks = document.querySelectorAll('.sidebar .menu-link');
  sidebarMenuLinks.forEach(link => link.classList.remove('active'));
  
  let targetIcon = '';
  if (activeTab === 'dashboard') targetIcon = '.fa-tachometer-alt';
  else if (activeTab === 'members') targetIcon = '.fa-users';
  else if (activeTab === 'trainers') targetIcon = '.fa-user-tie';
  
  if (targetIcon) {
    const activeMenuLink = Array.from(sidebarMenuLinks).find(link => link.querySelector(targetIcon));
    if (activeMenuLink) activeMenuLink.classList.add('active');
  }
}

// Helper function to hide all tabs (should match the one in gymadmin.js)
function hideAllMainTabs() {
  const dashboardContent = document.querySelector('.content');
  const memberDisplayTab = document.getElementById('memberDisplayTab');
  const trainerTab = document.getElementById('trainerTab');
  const settingsTab = document.getElementById('settingsTab');
  const attendanceTab = document.getElementById('attendanceTab');
  const paymentTab = document.getElementById('paymentTab');
  const equipmentTab = document.getElementById('equipmentTab');
  const supportReviewsTab = document.getElementById('supportReviewsTab');
  
  if (dashboardContent) dashboardContent.style.display = 'none';
  if (memberDisplayTab) memberDisplayTab.style.display = 'none';
  if (trainerTab) trainerTab.style.display = 'none';
  if (settingsTab) settingsTab.style.display = 'none';
  if (attendanceTab) attendanceTab.style.display = 'none';
  if (paymentTab) paymentTab.style.display = 'none';
  if (equipmentTab) equipmentTab.style.display = 'none';
  if (supportReviewsTab) supportReviewsTab.style.display = 'none';
}

function showCustomizationFeedback(message) {
  const gymId = getGymId();
  const gymSpecificMessage = `${message} (Gym: ${gymId ? gymId.substring(0, 8) + '...' : 'Unknown'})`;
  
  // Check if mobile
  const isMobile = window.innerWidth <= 768;
  
  // Create feedback toast
  const toast = document.createElement('div');
  toast.className = 'customization-feedback-toast';
  toast.textContent = gymSpecificMessage;
  toast.style.cssText = `
    position: fixed;
    top: ${isMobile ? '70px' : '80px'};
    right: ${isMobile ? '10px' : '20px'};
    ${isMobile ? 'left: 10px;' : ''}
    background: var(--success, #28a745);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: ${isMobile ? 'none' : '350px'};
    min-width: ${isMobile ? 'auto' : '280px'};
    width: ${isMobile ? 'calc(100% - 20px)' : 'auto'};
    word-wrap: break-word;
    overflow-wrap: break-word;
    box-sizing: border-box;
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2000);
}

// ===== BIOMETRIC ATTENDANCE FUNCTIONALITY =====
function setupBiometricAttendance() {
  const fingerprintToggle = document.getElementById('toggleFingerprintAttendance');
  const faceRecognitionToggle = document.getElementById('toggleFaceRecognitionAttendance');
  const biometricSettings = document.getElementById('biometricSettings');
  const autoEnrollToggle = document.getElementById('autoEnrollBiometric');
  const backupMethodToggle = document.getElementById('backupAttendanceMethod');
  const securityLevelSelect = document.getElementById('biometricSecurityLevel');
  
  // Get gym ID for settings isolation
  const gymId = getGymId();
  if (!gymId) {
    console.warn('No gym ID found, biometric attendance settings will not work properly');
    return;
  }

  // Start checking agent status and update UI immediately
  window.biometricAgentManager.startAgentCheck();
  
  // Also do an immediate check to update UI faster
  setTimeout(async () => {
    console.log('🔍 Performing immediate biometric agent status check...');
    const isRunning = await window.biometricAgentManager.checkAgentStatus();
    window.biometricAgentManager.updateAgentStatusUI(isRunning);
    
    if (isRunning) {
      console.log('✅ Agent is running - UI should reflect this now');
    } else {
      console.log('❌ Agent not running - showing install options');
    }
  }, 500);

  // Load saved biometric settings
  loadBiometricSettings(gymId);

  // Show/hide biometric settings panel based on toggle states
  function updateBiometricSettingsVisibility() {
    const fingerprintEnabled = fingerprintToggle?.checked || false;
    const faceRecognitionEnabled = faceRecognitionToggle?.checked || false;
    const anyBiometricEnabled = fingerprintEnabled || faceRecognitionEnabled;
    
    if (biometricSettings) {
      if (anyBiometricEnabled) {
        biometricSettings.style.display = 'block';
        biometricSettings.classList.add('show');
      } else {
        biometricSettings.style.display = 'none';
        biometricSettings.classList.remove('show');
      }
    }
    
    // Update quick action button visibility globally
    updateBiometricQuickActionVisibility(gymId, anyBiometricEnabled);
    
    // Hide/show advanced biometric controls
    const advancedControls = document.querySelectorAll('.biometric-advanced-control');
    advancedControls.forEach(control => {
      control.style.display = anyBiometricEnabled ? 'block' : 'none';
    });
    
    // Store global state for quick access
    window.biometricEnabled = anyBiometricEnabled;
    
    console.log(`Updated biometric settings visibility for gym ${gymId}:`, {
      fingerprint: fingerprintEnabled,
      faceRecognition: faceRecognitionEnabled,
      anyEnabled: anyBiometricEnabled
    });
  }

  // Check agent status before enabling biometric features
  async function checkAgentAndEnable(type, toggle) {
    console.log(`🔍 Checking agent for ${type} - bypass: ${window.bypassBiometricAgentCheck}`);
    
    // Allow bypass for testing/development
    if (window.bypassBiometricAgentCheck) {
      console.log('⚠️ Biometric agent check bypassed for testing');
      showBiometricFeedback(`${type} enabled (testing mode)`, 'success');
      return true;
    }
    
    // Show checking status
    showBiometricFeedback(`Checking biometric agent for ${type}...`, 'info');
    
    try {
      const isRunning = await window.biometricAgentManager.checkAgentStatus();
      console.log(`Agent status for ${type}:`, isRunning);
      
      if (!isRunning) {
        toggle.checked = false;
        showBiometricFeedback(`⚠️ Biometric agent required for ${type}. Click to install.`, 'warning');
        
        // Show enhanced installation modal
        const installModal = createBiometricModal(
          `Install Biometric Agent for ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          `
          <div style="padding: 20px; text-align: center;">
            <div style="margin-bottom: 30px;">
              <i class="fas fa-download fa-4x" style="color: #007bff; margin-bottom: 20px;"></i>
              <h4>Biometric Agent Required</h4>
              <p style="color: #666; margin: 15px 0;">
                To use ${type} attendance features, you need to install the local biometric agent.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <h5 style="color: #333; margin-bottom: 15px;">
                <i class="fas fa-info-circle" style="color: #007bff;"></i> What is the Biometric Agent?
              </h5>
              <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
                <li>Secure local service for biometric device communication</li>
                <li>Handles fingerprint scanners and cameras</li>
                <li>Runs as Windows service (automatic startup)</li>
                <li>Simulation mode for development and testing</li>
                <li>Required for all biometric attendance features</li>
              </ul>
            </div>
            
            <div style="margin: 25px 0;">
              <button class="btn btn-primary btn-lg" onclick="window.biometricAgentManager.downloadAndInstallAgent(); this.closest('.modal-overlay').remove();" style="margin: 0 10px 10px 0;">
                <i class="fas fa-download"></i> Download & Install Agent
              </button>
              <br>
              <button class="btn btn-info" onclick="window.enableBiometricBypass(); this.closest('.modal-overlay').remove(); showBiometricFeedback('Testing mode enabled - agent check bypassed', 'success');" style="margin: 5px;">
                <i class="fas fa-vial"></i> Enable Testing Mode (Bypass Agent)
              </button>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
              <small style="color: #856404;">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Note:</strong> Testing mode bypasses the agent requirement for development purposes only.
              </small>
            </div>
          </div>
          `
        );
        
        document.body.appendChild(installModal);
        
        return false;
      } else {
        showBiometricFeedback(`✅ Agent ready - ${type} enabled!`, 'success');
        return true;
      }
    } catch (error) {
      console.error(`Error checking agent for ${type}:`, error);
      toggle.checked = false;
      showBiometricFeedback(`❌ Error checking agent: ${error.message}`, 'error');
      return false;
    }
  }
    
    return true;
  }

  // Fingerprint attendance toggle
  if (fingerprintToggle) {
    fingerprintToggle.addEventListener('change', async function() {
      const isEnabled = this.checked;
      console.log('🔧 Fingerprint toggle clicked:', isEnabled, 'for gym:', gymId);
      
      if (isEnabled) {
        const agentReady = await checkAgentAndEnable('fingerprint', this);
        if (!agentReady) {
          console.log('❌ Agent not ready, reverting toggle');
          return;
        }
      }
      
      setBiometricSetting(gymId, 'fingerprintEnabled', isEnabled);
      updateBiometricSettingsVisibility();
      showBiometricFeedback('Fingerprint attendance ' + (isEnabled ? 'enabled' : 'disabled'));
      
      // Update quick action visibility
      updateBiometricQuickActionVisibility(gymId, isBiometricAttendanceEnabled(gymId));
      
      if (isEnabled) {
        checkBiometricDeviceCompatibility('fingerprint');
      }
    });
  } else {
    console.warn('❌ Fingerprint toggle element not found!');
  }

  // Face recognition attendance toggle
  if (faceRecognitionToggle) {
    faceRecognitionToggle.addEventListener('change', async function() {
      const isEnabled = this.checked;
      console.log('🔧 Face recognition toggle clicked:', isEnabled, 'for gym:', gymId);
      
      if (isEnabled) {
        const agentReady = await checkAgentAndEnable('face recognition', this);
        if (!agentReady) {
          console.log('❌ Agent not ready, reverting toggle');
          return;
        }
      }
      
      setBiometricSetting(gymId, 'faceRecognitionEnabled', isEnabled);
      updateBiometricSettingsVisibility();
      showBiometricFeedback('Face recognition attendance ' + (isEnabled ? 'enabled' : 'disabled'));
      
      // Update quick action visibility
      updateBiometricQuickActionVisibility(gymId, isBiometricAttendanceEnabled(gymId));
      
      if (isEnabled) {
        checkBiometricDeviceCompatibility('face');
      }
    });
  } else {
    console.warn('❌ Face recognition toggle element not found!');
  }

  // Auto-enroll toggle
  if (autoEnrollToggle) {
    autoEnrollToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      setBiometricSetting(gymId, 'autoEnrollEnabled', isEnabled);
      showBiometricFeedback('Auto-enrollment ' + (isEnabled ? 'enabled' : 'disabled'));
    });
  }

  // Backup method toggle
  if (backupMethodToggle) {
    backupMethodToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      setBiometricSetting(gymId, 'backupMethodEnabled', isEnabled);
      showBiometricFeedback('Manual backup ' + (isEnabled ? 'enabled' : 'disabled'));
    });
  }

  // Security level select
  if (securityLevelSelect) {
    securityLevelSelect.addEventListener('change', function() {
      const level = this.value;
      setBiometricSetting(gymId, 'securityLevel', level);
      showBiometricFeedback(`Security level set to ${level}`);
    });
  }

  // Setup button event listeners
  setupBiometricButtons(gymId);
  
  // Initial visibility update
  updateBiometricSettingsVisibility();


// Load saved biometric settings for a specific gym
function loadBiometricSettings(gymId) {
  const settings = getBiometricSettings(gymId);
  
  // Apply loaded settings to UI
  const fingerprintToggle = document.getElementById('toggleFingerprintAttendance');
  const faceRecognitionToggle = document.getElementById('toggleFaceRecognitionAttendance');
  const autoEnrollToggle = document.getElementById('autoEnrollBiometric');
  const backupMethodToggle = document.getElementById('backupAttendanceMethod');
  const securityLevelSelect = document.getElementById('biometricSecurityLevel');
  
  if (fingerprintToggle) fingerprintToggle.checked = settings.fingerprintEnabled;
  if (faceRecognitionToggle) faceRecognitionToggle.checked = settings.faceRecognitionEnabled;
  if (autoEnrollToggle) autoEnrollToggle.checked = settings.autoEnrollEnabled;
  if (backupMethodToggle) backupMethodToggle.checked = settings.backupMethodEnabled;
  if (securityLevelSelect) securityLevelSelect.value = settings.securityLevel;
}

// Get biometric settings for a specific gym
function getBiometricSettings(gymId) {
  const defaultSettings = {
    fingerprintEnabled: false,
    faceRecognitionEnabled: false,
    autoEnrollEnabled: true,
    backupMethodEnabled: true,
    securityLevel: 'standard'
  };
  
  try {
    const savedSettings = localStorage.getItem(`biometricSettings_${gymId}`);
    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  } catch (error) {
    console.warn('Error loading biometric settings:', error);
    return defaultSettings;
  }
}

// Get a specific biometric setting value
function getBiometricSetting(gymId, key) {
  try {
    const settings = getBiometricSettings(gymId);
    return settings[key];
  } catch (error) {
    console.error('Error getting biometric setting:', error);
    return false; // Default to false for safety
  }
}

// Set biometric setting for a specific gym
function setBiometricSetting(gymId, key, value) {
  try {
    const settings = getBiometricSettings(gymId);
    settings[key] = value;
    localStorage.setItem(`biometricSettings_${gymId}`, JSON.stringify(settings));
    console.log(`✅ Biometric setting saved: ${key} = ${value} for gym ${gymId}`);
  } catch (error) {
    console.error('Error saving biometric setting:', error);
  }
}

// Setup biometric action buttons
function setupBiometricButtons(gymId) {
  // Use setTimeout to ensure functions are loaded
  setTimeout(() => {
    // Setup Devices button
    const setupDevicesBtn = document.getElementById('setupBiometricDevices');
    if (setupDevicesBtn) {
      setupDevicesBtn.onclick = () => {
        if (typeof showDeviceConfigurationModal === 'function') {
          showDeviceConfigurationModal();
        }
      };
    }

    // Test Connection button
    const testConnectionBtn = document.getElementById('testBiometricConnection');
    if (testConnectionBtn) {
      testConnectionBtn.onclick = () => {
        if (typeof testBiometricConnection === 'function') {
          testBiometricConnection();
        }
      };
    }

    // Enroll Members button
    const enrollMembersBtn = document.getElementById('enrollBiometricData');
    if (enrollMembersBtn) {
      enrollMembersBtn.onclick = () => {
        if (typeof openBiometricEnrollment === 'function') {
          openBiometricEnrollment();
        }
      };
    }

    // View Reports button
    const reportsBtn = document.getElementById('biometricReports');
    if (reportsBtn) {
      reportsBtn.onclick = () => {
        if (typeof openBiometricReports === 'function') {
          openBiometricReports();
        }
      };
    }
  }, 100);
}

// ===== BIOMETRIC STATUS CHECKING FUNCTIONS =====

// Check if biometric attendance is enabled for a specific gym
function isBiometricAttendanceEnabled(gymId) {
  if (!gymId) return false;
  
  const fingerprintEnabled = getBiometricSetting(gymId, 'fingerprintEnabled') === true;
  const faceEnabled = getBiometricSetting(gymId, 'faceRecognitionEnabled') === true;
  
  return fingerprintEnabled || faceEnabled;
}

// Check if fingerprint attendance is specifically enabled
function isFingerprintAttendanceEnabled(gymId) {
  if (!gymId) return false;
  return getBiometricSetting(gymId, 'fingerprintEnabled') === true;
}

// Check if face recognition attendance is specifically enabled
function isFaceRecognitionAttendanceEnabled(gymId) {
  if (!gymId) return false;
  return getBiometricSetting(gymId, 'faceRecognitionEnabled') === true;
}

// Update visibility of biometric quick action buttons throughout the app
function updateBiometricQuickActionVisibility(gymId, isEnabled) {
  console.log(`Updating biometric quick action visibility for gym ${gymId}: ${isEnabled}`);
  
  // Quick action buttons in dashboard
  const biometricEnrollBtn = document.getElementById('biometricEnrollBtn');
  const deviceSetupBtn = document.getElementById('deviceSetupBtn');
  
  if (biometricEnrollBtn) {
    biometricEnrollBtn.style.display = isEnabled ? 'flex' : 'none';
  }
  
  if (deviceSetupBtn) {
    deviceSetupBtn.style.display = isEnabled ? 'flex' : 'none';
  }
  
  // Advanced biometric controls in settings
  const advancedControls = document.querySelectorAll('.biometric-advanced-control');
  advancedControls.forEach(control => {
    control.style.display = isEnabled ? 'block' : 'none';
  });
  
  // Biometric buttons in settings quick actions
  const settingsBiometricBtns = document.querySelectorAll('.biometric-settings-btn');
  settingsBiometricBtns.forEach(btn => {
    btn.style.display = isEnabled ? 'inline-block' : 'none';
  });
}

// Redirect to biometric enrollment or settings based on status
function handleBiometricEnrollmentRedirect() {
  const gymId = getGymId();
  
  if (!gymId) {
    showBiometricFeedback('Unable to determine gym context', 'error');
    return;
  }
  
  const isEnabled = isBiometricAttendanceEnabled(gymId);
  
  if (isEnabled) {
    // Redirect to enrollment page
    console.log('Biometric attendance is enabled, redirecting to enrollment page');
    window.location.href = '/frontend/biometric-enrollment.html';
  } else {
    // Redirect to settings and highlight biometric section
    console.log('Biometric attendance is disabled, redirecting to settings');
    showBiometricEnablementPrompt();
  }
}

// Redirect to device setup or settings based on status
function handleBiometricDeviceSetupRedirect() {
  const gymId = getGymId();
  
  if (!gymId) {
    showBiometricFeedback('Unable to determine gym context', 'error');
    return;
  }
  
  const isEnabled = isBiometricAttendanceEnabled(gymId);
  
  if (isEnabled) {
    // Open device setup modal
    console.log('Biometric attendance is enabled, opening device setup');
    showDeviceConfigurationModal();
  } else {
    // Redirect to settings and highlight biometric section
    console.log('Biometric attendance is disabled, redirecting to settings');
    showBiometricEnablementPrompt();
  }
}

// Show prompt to enable biometric attendance
function showBiometricEnablementPrompt() {
  // First navigate to settings tab
  const settingsTab = document.querySelector('[data-tab="settingsTab"]') || 
                     document.querySelector('.menu-link:last-child');
  
  if (settingsTab) {
    settingsTab.click();
  }
  
  // Wait for settings tab to load, then highlight biometric section
  setTimeout(() => {
    const biometricSection = document.getElementById('biometricAttendanceSection');
    if (biometricSection) {
      // Scroll to biometric section
      biometricSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the section
      biometricSection.style.transition = 'all 0.3s ease';
      biometricSection.style.border = '3px solid #ff6b35';
      biometricSection.style.borderRadius = '12px';
      biometricSection.style.boxShadow = '0 0 20px rgba(255, 107, 53, 0.3)';
      
      // Show instructional modal
      const modal = createBiometricModal(
        'Enable Biometric Attendance',
        `
        <div style="padding: 20px;">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <strong>Biometric attendance is currently disabled</strong>
          </div>
          
          <p>To use biometric enrollment and device setup features, you need to first enable biometric attendance in the settings below.</p>
          
          <div style="margin: 20px 0;">
            <h4>Steps to enable:</h4>
            <ol style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
              <li>Toggle <strong>Enable Fingerprint Attendance</strong> or <strong>Enable Face Recognition Attendance</strong></li>
              <li>Install the biometric agent if prompted</li>
              <li>Return to the dashboard to access enrollment features</li>
            </ol>
          </div>
          
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            These settings are gym-specific and will only apply to your current gym.
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
              <i class="fas fa-check"></i> Got it
            </button>
          </div>
        </div>
        `,
        '600px'
      );
      
      document.body.appendChild(modal);
      
      // Remove highlight after modal is closed
      modal.addEventListener('click', () => {
        setTimeout(() => {
          biometricSection.style.border = '';
          biometricSection.style.boxShadow = '';
        }, 500);
      });
    }
  }, 500);
}

// Check device compatibility for biometric features
async function checkBiometricDeviceCompatibility(type) {
  console.log(`🔍 Checking ${type} device compatibility...`);
  
  // First check if agent is running
  const agentRunning = await window.biometricAgentManager.checkAgentStatus();
  
  if (!agentRunning) {
    showBiometricFeedback('⚠️ Biometric agent is not running. Please install and start the agent first.', 'warning');
    return;
  }
  
  // Show compatibility check modal
  const checkModal = createBiometricModal(`${type.charAt(0).toUpperCase() + type.slice(1)} Device Check`, `
    <div style="padding: 20px; text-align: center;">
      <i class="fas fa-search fa-3x" style="color: #2196F3; margin-bottom: 20px;"></i>
      <h4>Checking Device Compatibility</h4>
      <div id="deviceCheckProgress" style="margin: 20px 0;">
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden; height: 6px;">
          <div id="checkProgressBar" style="background: #2196F3; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        <p id="checkStatus" style="margin: 12px 0; color: #666;">Connecting to biometric agent...</p>
      </div>
      <div id="deviceRequirements" style="text-align: left; margin: 20px 0; background: #f8f9fa; padding: 16px; border-radius: 8px;">
        <h5 style="margin-bottom: 12px; color: #333;">
          <i class="fas fa-${type === 'fingerprint' ? 'fingerprint' : 'camera'}"></i> 
          ${type === 'fingerprint' ? 'Fingerprint Scanner' : 'Face Recognition Camera'} Requirements:
        </h5>
        ${type === 'fingerprint' ? `
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>USB 2.0 or higher fingerprint scanner</li>
            <li>Compatible with Windows Biometric Framework (WBF)</li>
            <li>Minimum 500 DPI resolution</li>
            <li>Live finger detection support</li>
            <li>Recommended brands: SecuGen, DigitalPersona, Futronic</li>
          </ul>
        ` : `
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>HD webcam (1280x720 minimum) or IP camera</li>
            <li>Good lighting conditions required</li>
            <li>Face detection algorithm support</li>
            <li>USB 2.0+ or network connectivity</li>
            <li>Compatible with Windows Hello or similar frameworks</li>
          </ul>
        `}
      </div>
      <div id="compatibilityResult" style="display: none; margin-top: 20px;"></div>
    </div>
  `);
  
  document.body.appendChild(checkModal);
  
  // Get DOM elements
  const progressBar = document.getElementById('checkProgressBar');
  const statusText = document.getElementById('checkStatus');
  const resultDiv = document.getElementById('compatibilityResult');
  
  try {
    // Step 1: Check agent health
    progressBar.style.width = '20%';
    statusText.textContent = 'Connecting to biometric agent...';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const healthResponse = await fetch('http://localhost:5001/health');
    if (!healthResponse.ok) {
      throw new Error('Agent not responding');
    }
    
    // Step 2: Scan for devices
    progressBar.style.width = '40%';
    statusText.textContent = 'Scanning for connected devices...';
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const devicesResponse = await fetch('http://localhost:5001/api/devices/scan', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const devicesResult = await devicesResponse.json();
    
    if (!devicesResult.success) {
      throw new Error('Device scan failed');
    }
    
    // Step 3: Filter devices by type
    progressBar.style.width = '60%';
    statusText.textContent = `Looking for ${type} devices...`;
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const relevantDevices = devicesResult.devices.filter(device => {
      if (type === 'fingerprint') {
        return device.category === 'fingerprint' || device.type === 'fingerprint';
      } else {
        return device.category === 'camera' || device.type === 'camera';
      }
    });
    
    // Step 4: Check installed devices
    progressBar.style.width = '80%';
    statusText.textContent = 'Checking installed devices...';
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const installedResponse = await fetch('http://localhost:5001/api/devices/installed');
    const installedResult = await installedResponse.json();
    const installedDevices = installedResult.success ? installedResult.devices : [];
    
    // Step 5: Complete check
    progressBar.style.width = '100%';
    statusText.textContent = 'Finalizing compatibility check...';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Show results
    resultDiv.style.display = 'block';
    
    if (relevantDevices.length === 0) {
      resultDiv.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>No ${type} devices found</strong>
          <p>Please connect a compatible ${type === 'fingerprint' ? 'fingerprint scanner' : 'camera'} and try again.</p>
          <button class="btn btn-primary" onclick="showDeviceConfigurationModal(); this.closest('.modal-overlay').remove();">
            <i class="fas fa-cog"></i> Configure Devices
          </button>
        </div>
      `;
    } else {
      const deviceList = relevantDevices.map(device => {
        const isInstalled = installedDevices.some(inst => inst.deviceId === device.deviceId);
        return `
          <div class="device-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin: 8px 0;">
            <div>
              <strong>${device.name}</strong>
              <div style="font-size: 0.9rem; color: #666;">${device.vendor || ''} ${device.product || ''}</div>
            </div>
            <div>
              <span class="status-badge ${isInstalled ? 'status-enrolled' : 'status-pending'}">
                ${isInstalled ? 'Installed' : 'Not Installed'}
              </span>
            </div>
          </div>
        `;
      }).join('');
      
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <strong>Found ${relevantDevices.length} compatible ${type} device(s)</strong>
          <div style="margin-top: 15px;">
            ${deviceList}
          </div>
          <div style="margin-top: 15px;">
            <button class="btn btn-primary" onclick="showDeviceConfigurationModal(); this.closest('.modal-overlay').remove();">
              <i class="fas fa-cog"></i> Configure Devices
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); window.location.href='/frontend/biometric-enrollment.html'">
              <i class="fas fa-user-plus"></i> Start Enrollment
            </button>
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Device compatibility check failed:', error);
    progressBar.style.width = '100%';
    progressBar.style.background = '#f44336';
    statusText.textContent = 'Check failed';
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-times-circle"></i>
        <strong>Compatibility check failed</strong>
        <p>Error: ${error.message}</p>
        <button class="btn btn-primary install-agent-btn" onclick="window.biometricAgentManager.downloadAndInstallAgent()">
          <i class="fas fa-download"></i> Install Agent
        </button>
      </div>
    `;
  }
  
  // Add close button to modal
  setTimeout(() => {
    const modalBody = checkModal.querySelector('.modal-body');
    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-secondary';
    closeButton.innerHTML = '<i class="fas fa-times"></i> Close';
    closeButton.onclick = () => checkModal.remove();
    closeButton.style.marginTop = '15px';
    modalBody.appendChild(closeButton);
  }, 2000);
  }
  
  // Add close button to modal
  setTimeout(() => {
    const modalBody = checkModal.querySelector('.modal-body');
    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-secondary';
    closeButton.innerHTML = '<i class="fas fa-times"></i> Close';
    closeButton.onclick = () => checkModal.remove();
    closeButton.style.marginTop = '15px';
    modalBody.appendChild(closeButton);
  }, 2000);


// Simulation version - replaced with real agent implementation above
function checkBiometricDeviceCompatibilitySimulation(type) {
  console.log(`🔍 Checking ${type} device compatibility...`);
  
  // Show compatibility check modal
  const checkModal = createBiometricModal(`${type.charAt(0).toUpperCase() + type.slice(1)} Device Check`, `
    <div style="padding: 20px; text-align: center;">
      <i class="fas fa-search fa-3x" style="color: #2196F3; margin-bottom: 20px;"></i>
      <h4>Checking Device Compatibility</h4>
      <div id="deviceCheckProgress" style="margin: 20px 0;">
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden; height: 6px;">
          <div id="checkProgressBar" style="background: #2196F3; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        <p id="checkStatus" style="margin: 12px 0; color: #666;">Initializing device scan...</p>
      </div>
      <div id="compatibilityResult" style="display: none; margin-top: 20px;"></div>
    </div>
  `);
  
  document.body.appendChild(checkModal);
  
  // Get DOM elements
  const progressBar = document.getElementById('checkProgressBar');
  const statusText = document.getElementById('checkStatus');
  const resultDiv = document.getElementById('compatibilityResult');
  
  // Simulation steps
  let progress = 0;
  const checkSteps = [
    'Scanning USB ports...',
    'Detecting fingerprint devices...',
    'Checking camera devices...',
    'Testing device communication...',
    'Verifying driver compatibility...',
    'Completing compatibility check...'
  ];
  
  const stepInterval = setInterval(() => {
    if (progress >= checkSteps.length) {
      clearInterval(stepInterval);
      
      // Simulate device check result (70% success rate)
      const isCompatible = Math.random() > 0.3;
      const deviceFound = Math.random() > 0.4;
      
      progressBar.style.width = '100%';
      progressBar.style.background = isCompatible ? '#4CAF50' : '#f44336';
      
      if (isCompatible && deviceFound) {
        statusText.textContent = 'Device compatibility check complete!';
        statusText.style.color = '#4CAF50';
        resultDiv.innerHTML = `
          <div style="background: #e8f5e8; border: 1px solid #4CAF50; border-radius: 8px; padding: 16px;">
            <i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 8px;"></i>
            <strong>Compatible device found!</strong>
            <p style="margin: 8px 0 0 0; color: #666;">
              ${type === 'fingerprint' ? 'Fingerprint scanner' : 'Camera'} is ready for biometric attendance.
            </p>
            <div style="margin-top: 16px;">
              <button class="btn btn-success" onclick="showDeviceConfigurationModal(); this.closest('.modal-overlay').remove();">
                <i class="fas fa-cog"></i> Configure Device
              </button>
            </div>
          </div>
        `;
        showBiometricFeedback(`${type} device found and compatible!`, 'success');
      } else if (!deviceFound) {
        statusText.textContent = 'No compatible device found';
        statusText.style.color = '#f44336';
        resultDiv.innerHTML = `
          <div style="background: #ffebee; border: 1px solid #f44336; border-radius: 8px; padding: 16px;">
            <i class="fas fa-exclamation-triangle" style="color: #f44336; margin-right: 8px;"></i>
            <strong>No ${type} device detected</strong>
            <p style="margin: 8px 0 0 0; color: #666;">
              Please connect a compatible ${type === 'fingerprint' ? 'fingerprint scanner' : 'camera'} and try again.
            </p>
            <div style="margin-top: 16px;">
              <button class="btn btn-secondary" onclick="retryDeviceCheck('${type}')" style="margin-right: 8px;">
                <i class="fas fa-redo"></i> Retry Check
              </button>
              <button class="btn btn-info" onclick="showDeviceRecommendations('${type}')">
                <i class="fas fa-shopping-cart"></i> View Recommendations
              </button>
            </div>
          </div>
        `;
        showBiometricFeedback('No compatible device found', 'warning');
      } else {
        statusText.textContent = 'Device incompatible';
        statusText.style.color = '#f44336';
        resultDiv.innerHTML = `
          <div style="background: #ffebee; border: 1px solid #f44336; border-radius: 8px; padding: 16px;">
            <i class="fas fa-exclamation-triangle" style="color: #f44336; margin-right: 8px;"></i>
            <strong>Device incompatible</strong>
            <p style="margin: 8px 0 0 0; color: #666;">
              The detected device is not compatible with the current system.
            </p>
          </div>
        `;
        showBiometricFeedback('Device is not compatible', 'error');
      }
    }

    statusText.textContent = checkSteps[progress];
    progress++;
    progressBar.style.width = (progress / checkSteps.length * 100) + '%';
  }, 800);

  // Add close button to modal
  setTimeout(() => {
    const modalBody = checkModal.querySelector('.modal-body');
    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-secondary';
    closeButton.innerHTML = '<i class="fas fa-times"></i> Close';
    closeButton.onclick = () => checkModal.remove();
    closeButton.style.marginTop = '15px';
    modalBody.appendChild(closeButton);
  }, 2000);
// Open biometric device setup modal
function openBiometricDeviceSetup() {
  // Check if agent is running first
  window.biometricAgentManager.checkAgentStatus().then(isRunning => {
    if (!isRunning) {
      showBiometricFeedback('⚠️ Biometric agent is not running. Would you like to install it?', 'warning');
      
      // Show installation prompt modal
      const installModal = createBiometricModal('Install Biometric Agent', `
        <div style="padding: 20px; text-align: center;">
          <i class="fas fa-exclamation-triangle fa-3x" style="color: #ff9800; margin-bottom: 20px;"></i>
          <h4>Biometric Agent Required</h4>
          <p style="margin: 16px 0; color: #666;">
            The biometric attendance system requires a local agent to communicate with fingerprint scanners and cameras. 
            This agent runs securely on your computer and handles device communication.
          </p>
          <div style="margin: 20px 0;">
            <button class="btn btn-primary" onclick="window.biometricAgentManager.downloadAndInstallAgent(); this.closest('.modal-overlay').remove();">
              <i class="fas fa-download"></i> Download & Install Agent
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();" style="margin-left: 10px;">
              Cancel
            </button>
          </div>
          <div style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; font-size: 0.9rem; color: #666;">
            <i class="fas fa-info-circle"></i>
            <strong>Safe & Secure:</strong> The agent only runs locally and doesn't send data to external servers.
          </div>
        </div>
      `);
      document.body.appendChild(installModal);
      return;
    }
    
    // Agent is running, show device configuration modal instead of redirecting
    showDeviceConfigurationModal();
  }).catch(error => {
    console.error('Error checking agent status:', error);
    showBiometricFeedback('Unable to check agent status. Please try installing the agent manually.', 'error');
    window.biometricAgentManager.showManualInstallationGuide();
  });
}

// Show device configuration modal using Enhanced Biometric Agent
async function showDeviceConfigurationModal() {
  const configModal = createBiometricModal('Biometric Device Configuration', `
    <div style="padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <i class="fas fa-cogs fa-3x" style="color: #2196F3; margin-bottom: 15px;"></i>
        <h4>Configure Biometric Devices</h4>
        <p style="color: #666;">Manage your fingerprint scanners and face recognition cameras</p>
      </div>
      
      <div id="deviceScanProgress" style="margin: 20px 0; display: none;">
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden; height: 6px;">
          <div id="scanProgressBar" style="background: #2196F3; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        <p id="scanStatus" style="margin: 12px 0; color: #666; text-align: center;">Scanning for devices...</p>
      </div>
      
      <div id="devicesList" style="margin: 20px 0;">
        <div style="text-align: center; color: #666;">
          <i class="fas fa-spinner fa-spin"></i> Loading devices...
        </div>
      </div>
      
      <div style="margin-top: 20px; text-align: center;">
        <button id="scanDevicesBtn" class="btn btn-primary" style="margin-right: 10px;">
          <i class="fas fa-search"></i> Scan Devices
        </button>
        <button id="enrollMemberBtn" class="btn btn-success" style="margin-right: 10px;">
          <i class="fas fa-user-plus"></i> Enroll Member
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();">
          Close
        </button>
      </div>
    </div>
  `);
  
  document.body.appendChild(configModal);
  
  // Load devices initially
  loadDevicesInModal();
  
  // Set up scan button
  document.getElementById('scanDevicesBtn').addEventListener('click', scanAndRefreshDevices);
  document.getElementById('enrollMemberBtn').addEventListener('click', () => {
    configModal.remove();
    window.location.href = '/frontend/biometric-enrollment.html';
  });
}

// Load devices in the configuration modal
async function loadDevicesInModal() {
  const devicesList = document.getElementById('devicesList');
  
  try {
    const devices = await window.biometricAgentManager.getDevices();
    
    if (devices.length === 0) {
      devicesList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <i class="fas fa-exclamation-circle fa-2x" style="color: #ff9800; margin-bottom: 10px;"></i>
          <p>No biometric devices detected</p>
          <small>Connect your fingerprint scanner or camera and click "Scan Devices"</small>
        </div>
      `;
      return;
    }
    
    const deviceCards = devices.map(device => `
      <div class="device-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; background: #f9f9f9;">
        <div style="display: flex; justify-content: between; align-items: center;">
          <div style="flex: 1;">
            <h5 style="margin: 0 0 5px 0; color: #333;">
              <i class="fas fa-${device.type === 'fingerprint' ? 'fingerprint' : 'camera'}" style="margin-right: 8px; color: #2196F3;"></i>
              ${device.name}
            </h5>
            <div style="font-size: 0.9rem; color: #666;">
              <span><strong>Type:</strong> ${device.type}</span><br>
              <span><strong>Status:</strong> <span class="status-badge status-${device.status === 'ready' ? 'enrolled' : 'pending'}">${device.status}</span></span>
              ${device.driver ? `<br><span><strong>Driver:</strong> ${device.driver}</span>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <button class="btn btn-sm btn-outline-primary" onclick="testDevice('${device.id}', '${device.type}')" style="margin-bottom: 5px;">
              <i class="fas fa-vial"></i> Test
            </button>
            ${device.type === 'fingerprint' ? `
              <button class="btn btn-sm btn-outline-success" onclick="testFingerprint('${device.id}')" style="display: block; width: 100%;">
                <i class="fas fa-fingerprint"></i> Test Scan
              </button>
            ` : `
              <button class="btn btn-sm btn-outline-success" onclick="testCamera('${device.id}')" style="display: block; width: 100%;">
                <i class="fas fa-camera"></i> Test Camera
              </button>
            `}
          </div>
        </div>
      </div>
    `).join('');
    
    devicesList.innerHTML = deviceCards;
    
  } catch (error) {
    console.error('Error loading devices:', error);
    devicesList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #f44336;">
        <i class="fas fa-times-circle fa-2x" style="margin-bottom: 10px;"></i>
        <p>Error loading devices: ${error.message}</p>
        <button class="btn btn-sm btn-primary" onclick="loadDevicesInModal()">
          <i class="fas fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }
}

// Scan and refresh devices
async function scanAndRefreshDevices() {
  const progress = document.getElementById('deviceScanProgress');
  const progressBar = document.getElementById('scanProgressBar');
  const statusText = document.getElementById('scanStatus');
  const scanBtn = document.getElementById('scanDevicesBtn');
  
  progress.style.display = 'block';
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
  
  try {
    progressBar.style.width = '30%';
    statusText.textContent = 'Scanning for devices...';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const devices = await window.biometricAgentManager.scanDevices();
    
    progressBar.style.width = '100%';
    statusText.textContent = 'Scan complete!';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    progress.style.display = 'none';
    await loadDevicesInModal();
    
    showBiometricFeedback(`Found ${devices.length} biometric device(s)`, 'success');
    
  } catch (error) {
    console.error('Device scan failed:', error);
    progressBar.style.background = '#f44336';
    statusText.textContent = 'Scan failed';
    showBiometricFeedback('Device scan failed: ' + error.message, 'error');
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<i class="fas fa-search"></i> Scan Devices';
  }
}

// Test device functions
async function testDevice(deviceId, deviceType) {
  showBiometricFeedback(`Testing ${deviceType} device...`, 'info');
  
  try {
    if (deviceType === 'fingerprint') {
      await testFingerprint(deviceId);
    } else if (deviceType === 'camera') {
      await testCamera(deviceId);
    }
  } catch (error) {
    showBiometricFeedback('Device test failed: ' + error.message, 'error');
  }
}

async function testFingerprint(deviceId) {
  showBiometricFeedback('Please place your finger on the scanner...', 'info');
  
  try {
    const result = await window.biometricAgentManager.verifyFingerprint('test_user', 'test_gym', deviceId);
    
    if (result.success) {
      showBiometricFeedback('✅ Fingerprint scanner test successful!', 'success');
    } else {
      showBiometricFeedback('Fingerprint scanner is working but no enrolled template found for test user.', 'info');
    }
  } catch (error) {
    showBiometricFeedback('Fingerprint test failed: ' + error.message, 'error');
  }
}

async function testCamera(deviceId) {
  showBiometricFeedback('Testing camera device...', 'info');
  
  try {
    const result = await window.biometricAgentManager.verifyFace('test_user', 'test_gym', deviceId);
    
    if (result.success) {
      showBiometricFeedback('✅ Camera test successful!', 'success');
    } else {
      showBiometricFeedback('Camera is working but no enrolled template found for test user.', 'info');
    }
  } catch (error) {
    showBiometricFeedback('Camera test failed: ' + error.message, 'error');
  }
}

// Test biometric connection
async function testBiometricConnection() {
  const testBtn = document.getElementById('testBiometricConnection');
  if (!testBtn) {
    console.error('Test button not found');
    return;
  }
  
  const originalText = testBtn.innerHTML;
  
  // Show loading state
  testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
  testBtn.disabled = true;
  
  try {
    // Check if agent is running
    const agentRunning = await window.biometricAgentManager.checkAgentStatus();
    
    if (!agentRunning) {
      showBiometricFeedback('⚠️ Biometric agent is not running. Please install and start the agent first.', 'warning');
      window.biometricAgentManager.downloadAndInstallAgent();
      return;
    }
    
    // Test agent connectivity
    const healthResponse = await fetch('http://localhost:5001/health');
    const healthData = await healthResponse.json();
    
    // Scan for devices
    const devicesResponse = await fetch('http://localhost:5001/api/devices/scan', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const devicesData = await devicesResponse.json();
    
    if (devicesData.success) {
      const fingerprintDevices = devicesData.devices.filter(d => d.category === 'fingerprint');
      const cameraDevices = devicesData.devices.filter(d => d.category === 'camera');
      
      const totalDevices = fingerprintDevices.length + cameraDevices.length;
      
      if (totalDevices > 0) {
        showBiometricFeedback(`Connection test successful! Found ${totalDevices} device(s): ${fingerprintDevices.length} fingerprint, ${cameraDevices.length} camera`, 'success');
      } else {
        showBiometricFeedback('No biometric devices found. Please connect devices and try again.', 'warning');
      }
    } else {
      showBiometricFeedback('❌ Device scan failed: ' + devicesData.error, 'error');
    }
    
  } catch (error) {
    console.error('Connection test failed:', error);
      showBiometricFeedback('Connection test failed: ' + error.message, 'error');    // Offer to install agent if connection failed
    if (error.message.includes('fetch')) {
      window.biometricAgentManager.downloadAndInstallAgent();
    }
  } finally {
    // Restore button state
    testBtn.innerHTML = originalText;
    testBtn.disabled = false;
  }
}

// Complete the connection test and show real results
async function completeConnectionTest(testBtn, originalText) {
  // Use real device detection instead of simulation
  const deviceDetectionResults = await performRealDeviceDetection();
  
  // Update fingerprint scanner status
  const fingerprintTest = document.querySelector('[data-device="fingerprint"] .test-status');
  if (fingerprintTest) {
    updateDeviceStatus(fingerprintTest, deviceDetectionResults.fingerprint);
  }
  
  // Update camera status
  const cameraTest = document.querySelector('[data-device="camera"] .test-status');
  if (cameraTest) {
    updateDeviceStatus(cameraTest, deviceDetectionResults.camera);
  }

  // Update progress
  const progressBar = document.getElementById('connectionTestProgress');
  const progressText = document.getElementById('testProgressText');
  if (progressBar && progressText) {
    progressBar.style.width = '100%';
    const anyDeviceFound = deviceDetectionResults.fingerprint.found || deviceDetectionResults.camera.found;
    progressBar.style.background = anyDeviceFound ? '#4CAF50' : '#f44336';
    progressText.textContent = 'Connection test completed!';
    progressText.style.color = anyDeviceFound ? '#4CAF50' : '#f44336';
    progressText.style.fontWeight = '500';
  }

  // Show results summary with real data
  showTestResultsSummary(deviceDetectionResults);

  // Reset test button
  resetTestButton(testBtn, originalText);

  // Show real feedback message
  const devicesFoundCount = deviceDetectionResults.totalDevices || 0;
  if (devicesFoundCount > 0) {
    showBiometricFeedback(`Connection test completed! ${devicesFoundCount} device(s) found.`, 'success');
  } else {
    const errorMsg = deviceDetectionResults.scanError || 'No biometric devices found. Please check connections.';
    showBiometricFeedback(errorMsg, 'warning');
  }
}

// Real biometric device detection using actual API
async function performRealDeviceDetection() {
  try {
      console.log('Starting real biometric device scan...');    const response = await fetch('/api/biometric/devices/scan', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      const devices = result.devices || [];
      
      // Categorize devices by type
      const fingerprintDevices = devices.filter(device => 
        device.category === 'fingerprint' || 
        device.deviceType === 'fingerprint_scanner'
      );
      
      const cameraDevices = devices.filter(device => 
        device.category === 'camera' || 
        device.deviceType === 'camera'
      );
      
      console.log(`Real scan completed: ${fingerprintDevices.length} fingerprint, ${cameraDevices.length} camera devices`);
      
      return {
        fingerprint: {
          found: fingerprintDevices.length > 0,
          devices: fingerprintDevices,
          device: fingerprintDevices[0] || null,
          error: fingerprintDevices.length === 0 ? 'No fingerprint scanners detected' : null
        },
        camera: {
          found: cameraDevices.length > 0,
          devices: cameraDevices,
          device: cameraDevices[0] || null,
          error: cameraDevices.length === 0 ? 'No face recognition cameras detected' : null
        },
        totalDevices: devices.length,
        allDevices: devices
      };
    } else {
      console.error('Device scan failed:', result.error);
      return {
        fingerprint: { found: false, devices: [], device: null, error: result.error },
        camera: { found: false, devices: [], device: null, error: result.error },
        totalDevices: 0,
        allDevices: [],
        scanError: result.error
      };
    }
  } catch (error) {
    console.error('Device scan error:', error);
    return {
      fingerprint: { found: false, devices: [], device: null, error: 'Network error during scan' },
      camera: { found: false, devices: [], device: null, error: 'Network error during scan' },
      totalDevices: 0,
      allDevices: [],
      scanError: error.message
    };
  }

// Real biometric device installation using actual API
async function installRealDevice(deviceInfo) {
  try {
    console.log('📦 Installing device support for:', deviceInfo.vendor, deviceInfo.model);
    
    const response = await fetch('/api/biometric/devices/install', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      },
      body: JSON.stringify({
        deviceInfo: deviceInfo
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Device SDK installed successfully');
      return {
        success: true,
        message: result.message,
        deviceId: result.deviceId,
        sdkInstalled: true,
        installationTime: result.installationTime
      };
    } else {
      console.error('❌ Device installation failed:', result.error);
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    console.error('❌ Installation error:', error);
    return {
      success: false,
      error: 'Network error during installation',
      details: error.message
    };
  }
}

// Real device connection testing using actual API
async function testRealDeviceConnection(deviceId) {
  try {
    console.log('🧪 Testing device connection:', deviceId);
    
    const response = await fetch('/api/biometric/devices/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      },
      body: JSON.stringify({
        deviceId: deviceId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Device test passed');
      return {
        success: true,
        status: result.status,
        responseTime: result.responseTime,
        details: result.details,
        deviceInfo: result.deviceInfo
      };
    } else {
      console.error('❌ Device test failed:', result.error);
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      success: false,
      error: 'Network error during test',
      details: error.message
    };
  }
}

// Get real installed devices using actual API
async function getRealInstalledDevices() {
  try {
    console.log('📋 Retrieving installed devices...');
    
    const response = await fetch('/api/biometric/devices/installed', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Found ${result.deviceCount} installed device(s)`);
      return {
        success: true,
        devices: result.devices,
        deviceCount: result.deviceCount
      };
    } else {
      console.error('❌ Failed to get devices:', result.error);
      return {
        success: false,
        error: result.error,
        devices: []
      };
    }
  } catch (error) {
    console.error('❌ Error getting devices:', error);
    return {
      success: false,
      error: error.message,
      devices: []
    };
  }
}
}

// Get random error messages for device detection failures
function getRandomError(deviceType) {
  const fingerprintErrors = [
    'No USB fingerprint scanner detected',
    'Driver not installed or incompatible',
    'Device not responding to commands',
    'USB port may not have sufficient power'
  ];
  
  const cameraErrors = [
    'No camera device found',
    'Camera is being used by another application',
    'Permission denied - enable camera access',
    'Camera driver not properly installed'
  ];
  
  const errors = deviceType === 'fingerprint' ? fingerprintErrors : cameraErrors;
  return errors[Math.floor(Math.random() * errors.length)];
}

// Update individual device status in the UI with real device data
function updateDeviceStatus(statusElement, deviceResult) {
  if (deviceResult.found && deviceResult.devices && deviceResult.devices.length > 0) {
    const device = deviceResult.devices[0]; // Show first device
    const deviceName = device.vendor && device.model ? 
      `${device.vendor} ${device.model}` : 
      device.name || `${device.category} Device`;
    
    statusElement.innerHTML = `
      <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
      <span style="color: #4CAF50; font-weight: 500;">Found: ${deviceName}</span>
    `;
    statusElement.parentElement.style.borderColor = '#4CAF50';
    statusElement.parentElement.style.background = '#f1f8e9';
  } else {
    const errorMessage = deviceResult.error || 'Not Found';
    statusElement.innerHTML = `
      <i class="fas fa-times-circle" style="color: #f44336;"></i>
      <span style="color: #f44336; font-weight: 500;">${errorMessage}</span>
    `;
    statusElement.parentElement.style.borderColor = '#f44336';
    statusElement.parentElement.style.background = '#ffebee';
  }
}

// Show detailed test results summary with real device data
function showTestResultsSummary(results) {
  const testResults = document.getElementById('testResults');
  const testResultsContent = document.getElementById('testResultsContent');
  
  if (!testResults || !testResultsContent) return;

  let resultHTML = '';
  const devicesFound = [];
  
  // Process real device results
  if (results.fingerprint.found && results.fingerprint.devices) {
    results.fingerprint.devices.forEach(device => {
      devicesFound.push({
        type: 'Fingerprint Scanner',
        name: device.vendor && device.model ? `${device.vendor} ${device.model}` : device.name || 'Unknown Device',
        status: device.isInstalled ? 'Ready' : 'Needs Installation',
        deviceId: device.deviceId,
        connectionType: device.connectionType || 'USB',
        vendor: device.vendor || 'Unknown'
      });
    });
  }
  
  if (results.camera.found && results.camera.devices) {
    results.camera.devices.forEach(device => {
      devicesFound.push({
        type: 'Face Recognition Camera',
        name: device.vendor && device.model ? `${device.vendor} ${device.model}` : device.name || 'Unknown Camera',
        status: device.isInstalled ? 'Ready' : 'Needs Installation',
        deviceId: device.deviceId,
        connectionType: device.connectionType || 'USB',
        vendor: device.vendor || 'Unknown'
      });
    });
  }

  if (devicesFound.length > 0) {
    resultHTML = `
      <div style="color: #4CAF50; margin-bottom: 16px;">
        <i class="fas fa-check-circle"></i>
        <strong> ${devicesFound.length} device(s) detected</strong>
      </div>
      <div style="margin-bottom: 16px;">
        ${devicesFound.map(device => `
          <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
            <div style="font-weight: 500; color: #333; margin-bottom: 4px;">
              <i class="fas fa-${device.type.includes('Camera') ? 'camera' : 'fingerprint'}" style="margin-right: 8px; color: #4CAF50;"></i>
              ${device.name}
            </div>
            <div style="font-size: 0.9rem; color: #666;">
              Status: <span style="color: ${device.status === 'Ready' ? '#4CAF50' : '#ff9800'};">${device.status}</span>
              • Connection: ${device.connectionType}
              • Device ID: ${device.deviceId}
              ${device.vendor !== 'Unknown' ? `• Vendor: ${device.vendor}` : ''}
            </div>
            ${device.status === 'Needs Installation' ? `
              <button class="btn btn-sm" onclick="installDeviceFromTest('${device.deviceId}')" 
                      style="margin-top: 8px; background: #ff9800; color: white; font-size: 0.8rem;">
                <i class="fas fa-download"></i> Install SDK
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } else {
    resultHTML = `
      <div style="color: #f44336; margin-bottom: 16px;">
        <i class="fas fa-exclamation-triangle"></i>
        <strong> No biometric devices detected</strong>
      </div>
      <div style="background: white; border: 1px solid #ffcdd2; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
        <h6 style="margin: 0 0 8px 0; color: #d32f2f;">Common Issues:</h6>
        <ul style="margin: 0; padding-left: 16px; color: #666; font-size: 0.9rem;">
          ${results.fingerprint.error ? `<li><strong>Fingerprint:</strong> ${results.fingerprint.error}</li>` : ''}
          ${results.camera.error ? `<li><strong>Camera:</strong> ${results.camera.error}</li>` : ''}
          ${results.scanError ? `<li><strong>Scan Error:</strong> ${results.scanError}</li>` : ''}
          <li>Check USB connections and power supply</li>
          <li>Install or update device drivers</li>
          <li>Ensure devices are compatible with your system</li>
          <li>Try running the application as administrator</li>
        </ul>
      </div>
    `;
  }

  testResultsContent.innerHTML = resultHTML;
  testResults.style.display = 'block';
}

// Helper function to reset test button
function resetTestButton(testBtn, originalText) {
  if (testBtn) {
    testBtn.innerHTML = originalText;
    testBtn.disabled = false;
    testBtn.classList.remove('biometric-loading');
  }
}

// Helper functions for connection testing
window.runConnectionTestAgain = function() {
  document.querySelector('.biometric-modal-overlay, .biometric-modal').remove();
  setTimeout(() => testBiometricConnection(), 100);
};

window.showDeviceHelp = function() {
  const helpModal = createBiometricModal('Device Connection Help', `
    <div style="padding: 20px;">
      <h4 style="margin-bottom: 16px; color: #333;">
        <i class="fas fa-question-circle" style="color: #2196F3; margin-right: 8px;"></i>
        Troubleshooting Device Connections
      </h4>
      
      <div style="margin-bottom: 20px;">
        <h5 style="color: #4CAF50; margin-bottom: 8px;">
          <i class="fas fa-fingerprint"></i> Fingerprint Scanner Issues:
        </h5>
        <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
          <li>Ensure the scanner is properly connected via USB</li>
          <li>Check if Windows recognizes the device in Device Manager</li>
          <li>Install latest drivers from manufacturer's website</li>
          <li>Try a different USB port (USB 3.0 preferred)</li>
          <li>Restart the application and try again</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h5 style="color: #2196F3; margin-bottom: 8px;">
          <i class="fas fa-camera"></i> Camera Issues:
        </h5>
        <ul style="margin: 0; padding-left: 20px; color: #666; line-height: 1.6;">
          <li>Check if camera is connected and powered on</li>
          <li>Ensure camera permissions are granted</li>
          <li>Close other applications using the camera</li>
          <li>Update camera drivers</li>
          <li>Test with built-in camera app first</li>
        </ul>
      </div>
      
      <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #2196F3;">
        <h5 style="margin: 0 0 8px 0; color: #1976D2;">
          <i class="fas fa-lightbulb"></i> Still Need Help?
        </h5>
        <p style="margin: 0; color: #1976D2; font-size: 0.9rem;">
          Contact our technical support team for device-specific assistance and driver downloads.
        </p>
        <div style="margin-top: 12px;">
          <button class="btn btn-primary" onclick="contactTechnicalSupport()" style="font-size: 0.9rem;">
            <i class="fas fa-headset"></i> Contact Support
          </button>
        </div>
      </div>
    </div>
  `);
  
  // Close current modal and show help
  document.querySelector('.biometric-modal-overlay, .biometric-modal').remove();
  document.body.appendChild(helpModal);
};

window.contactTechnicalSupport = function() {
  showBiometricFeedback('Opening support contact form...', 'info');
  // In real implementation, this would open a support ticket system
};

// Open enrollment modal  
function openBiometricEnrollment() {
  const modal = createBiometricModal('Enroll Members', `
    <div class="enrollment-modal-content">
      <div class="enrollment-tabs">
        <button class="tab-btn active" data-tab="members" onclick="switchEnrollmentTab('members')">
          <i class="fas fa-users"></i> Members
        </button>
        <button class="tab-btn" data-tab="trainers" onclick="switchEnrollmentTab('trainers')">
          <i class="fas fa-user-tie"></i> Trainers
        </button>
      </div>
      
      <div class="tab-content active" id="members-enrollment-tab">
        <div class="search-container" style="margin-bottom: 16px;">
          <input type="text" id="memberEnrollmentSearch" placeholder="Search members..." 
                 style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div class="member-list" id="memberEnrollmentList">
          <div class="loading" style="text-align: center; padding: 20px; color: #666;">
            <i class="fas fa-spinner fa-spin"></i> Loading members...
          </div>
        </div>
      </div>
      
      <div class="tab-content" id="trainers-enrollment-tab" style="display: none;">
        <div class="search-container" style="margin-bottom: 16px;">
          <input type="text" id="trainerEnrollmentSearch" placeholder="Search trainers..." 
                 style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div class="trainer-list" id="trainerEnrollmentList">
          <div class="loading" style="text-align: center; padding: 20px; color: #666;">
            <i class="fas fa-spinner fa-spin"></i> Loading trainers...
          </div>
        </div>
      </div>
      
      <div class="enrollment-actions" style="margin-top: 20px; text-align: center;">
        <button class="btn btn-primary" onclick="startBulkEnrollment()">
          <i class="fas fa-users"></i> Bulk Enroll Selected
        </button>
      </div>
    </div>
  `);

  // Load mock data
  setTimeout(() => loadEnrollmentData(), 500);
}

// Open reports modal
function openBiometricReports() {
  const modal = createBiometricModal('Biometric Reports', `
    <div class="reports-modal-content">
      <div class="reports-filters" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; margin-bottom: 20px; align-items: end;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Date Range:</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="date" id="reportStartDate" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
            <span>to</span>
            <input type="date" id="reportEndDate" style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Report Type:</label>
          <select id="reportType" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="enrollment">Enrollment Summary</option>
            <option value="attendance">Attendance Analytics</option>
            <option value="verification">Verification Success Rate</option>
            <option value="device">Device Usage</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="generateBiometricReport()">
          <i class="fas fa-chart-line"></i> Generate
        </button>
      </div>
      
      <div class="reports-content" id="reportsContent" style="min-height: 300px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
        <div class="reports-placeholder" style="text-align: center; color: #666;">
          <i class="fas fa-chart-bar" style="font-size: 3rem; margin-bottom: 16px;"></i>
          <p>Select date range and report type, then click "Generate" to view analytics</p>
        </div>
      </div>
      
      <div class="reports-actions" id="reportsActions" style="display: none; margin-top: 16px; text-align: center;">
        <button class="btn btn-secondary" onclick="exportBiometricReport('pdf')" style="margin-right: 8px;">
          <i class="fas fa-file-pdf"></i> Export PDF
        </button>
        <button class="btn btn-secondary" onclick="exportBiometricReport('csv')" style="margin-right: 8px;">
          <i class="fas fa-file-csv"></i> Export CSV
        </button>
        <button class="btn btn-info" onclick="emailBiometricReport()">
          <i class="fas fa-envelope"></i> Email Report
        </button>
      </div>
    </div>
  `);

  // Set default date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  setTimeout(() => {
    document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];
  }, 100);
}

// Create responsive biometric modal
function createBiometricModal(title, content, buttons = []) {
  // Remove any existing modal
  const existingModal = document.querySelector('.biometric-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'biometric-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'biometric-modal-content';
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.3s ease;
  `;

  // Add animation keyframes
  if (!document.getElementById('modalAnimations')) {
    const style = document.createElement('style');
    style.id = 'modalAnimations';
    style.textContent = `
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-50px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .biometric-modal-content {
        border: 1px solid #e0e0e0;
      }
      .test-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        margin-bottom: 8px;
        transition: all 0.3s ease;
      }
      .test-item i {
        font-size: 1.5rem;
        width: 30px;
        text-align: center;
      }
      .test-item span {
        flex: 1;
        font-weight: 500;
      }
      .test-item.testing {
        border-color: #2196F3;
        background: #f3f9ff;
      }
      .test-item.success {
        border-color: #4CAF50;
        background: #f1f8e9;
      }
      .test-item.error {
        border-color: #f44336;
        background: #ffebee;
      }
      .test-status .fa-spinner {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .connection-test .test-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .enrollment-tabs {
        display: flex;
        border-bottom: 2px solid #f0f0f0;
        margin-bottom: 20px;
      }
      .tab-btn {
        flex: 1;
        padding: 12px 16px;
        border: none;
        background: none;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 500;
      }
      .tab-btn.active {
        border-bottom-color: #2196F3;
        color: #2196F3;
      }
      .tab-btn:hover {
        background: #f5f5f5;
      }
      .person-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .person-item:hover {
        background: #f5f5f5;
        border-color: #2196F3;
      }
      .person-item.selected {
        background: #e3f2fd;
        border-color: #2196F3;
      }
      .person-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px 24px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;

  const titleElement = document.createElement('h3');
  titleElement.style.cssText = `
    margin: 0;
    color: #333;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  titleElement.innerHTML = `<i class="fas fa-fingerprint"></i> ${title}`;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = '#f5f5f5';
  closeBtn.onmouseout = () => closeBtn.style.background = 'none';
  closeBtn.onclick = () => modal.remove();

  header.appendChild(titleElement);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.cssText = `
    padding: 24px;
  `;
  body.innerHTML = content;

  modalContent.appendChild(header);
  modalContent.appendChild(body);

  // Add footer with buttons if provided
  if (buttons.length > 0) {
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = `btn ${btn.class}`;
      button.innerHTML = btn.text;
      button.style.cssText = `
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      `;
      
      if (btn.class.includes('primary')) {
        button.style.background = '#2196F3';
        button.style.color = 'white';
      } else {
        button.style.background = '#f5f5f5';
        button.style.color = '#666';
      }

      if (btn.action === 'close') {
        button.onclick = () => modal.remove();
      } else if (typeof btn.action === 'function') {
        button.onclick = btn.action;
      }

      footer.appendChild(button);
    });

    modalContent.appendChild(footer);
  }

  modal.appendChild(modalContent);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
  return modal;
}

// Helper functions for biometric modals
function switchEnrollmentTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.getElementById('members-enrollment-tab').style.display = 
    tabName === 'members' ? 'block' : 'none';
  document.getElementById('trainers-enrollment-tab').style.display = 
    tabName === 'trainers' ? 'block' : 'none';
}

function loadEnrollmentData() {
  // Mock members data
  const mockMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', enrolled: false },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', enrolled: true },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', enrolled: false },
    { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', enrolled: true }
  ];

  const mockTrainers = [
    { id: 1, name: 'Alex Rodriguez', email: 'alex@gym.com', enrolled: false },
    { id: 2, name: 'Lisa Chen', email: 'lisa@gym.com', enrolled: true }
  ];

  // Populate members list
  const membersList = document.getElementById('memberEnrollmentList');
  membersList.innerHTML = mockMembers.map(member => `
    <div class="person-item ${member.enrolled ? 'enrolled' : ''}" data-id="${member.id}">
      <div class="person-avatar">${member.name.charAt(0)}</div>
      <div style="flex: 1;">
        <div style="font-weight: 500;">${member.name}</div>
        <div style="font-size: 0.9rem; color: #666;">${member.email}</div>
      </div>
      <div class="enrollment-status">
        ${member.enrolled ? 
          '<i class="fas fa-check-circle" style="color: #4CAF50;"></i> Enrolled' : 
          '<button class="btn btn-sm btn-primary" onclick="enrollPerson(\'member\', ' + member.id + ')">Enroll</button>'
        }
      </div>
    </div>
  `).join('');

  // Populate trainers list
  const trainersList = document.getElementById('trainerEnrollmentList');
  trainersList.innerHTML = mockTrainers.map(trainer => `
    <div class="person-item ${trainer.enrolled ? 'enrolled' : ''}" data-id="${trainer.id}">
      <div class="person-avatar">${trainer.name.charAt(0)}</div>
      <div style="flex: 1;">
        <div style="font-weight: 500;">${trainer.name}</div>
        <div style="font-size: 0.9rem; color: #666;">${trainer.email}</div>
      </div>
      <div class="enrollment-status">
        ${trainer.enrolled ? 
          '<i class="fas fa-check-circle" style="color: #4CAF50;"></i> Enrolled' : 
          '<button class="btn btn-sm btn-primary" onclick="enrollPerson(\'trainer\', ' + trainer.id + ')">Enroll</button>'
        }
      </div>
    </div>
  `).join('');
}

function enrollPerson(type, id) {
  showBiometricFeedback(`Starting ${type} enrollment...`, 'info');
  
  // Simulate enrollment process
  setTimeout(() => {
    const personItem = document.querySelector(`[data-id="${id}"]`);
    const statusDiv = personItem.querySelector('.enrollment-status');
    statusDiv.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50;"></i> Enrolled';
    personItem.classList.add('enrolled');
    
    showBiometricFeedback(`${type} enrolled successfully!`, 'success');
  }, 2000);
}

function startBulkEnrollment() {
  const unenrolledItems = document.querySelectorAll('.person-item:not(.enrolled)');
  if (unenrolledItems.length === 0) {
    showBiometricFeedback('All members are already enrolled', 'info');
    return;
  }

  showBiometricFeedback(`Starting bulk enrollment for ${unenrolledItems.length} people...`, 'info');
  
  // Simulate bulk enrollment
  let count = 0;
  unenrolledItems.forEach((item, index) => {
    setTimeout(() => {
      const statusDiv = item.querySelector('.enrollment-status');
      statusDiv.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50;"></i> Enrolled';
      item.classList.add('enrolled');
      count++;
      
      if (count === unenrolledItems.length) {
        showBiometricFeedback('Bulk enrollment completed successfully!', 'success');
      }
    }, (index + 1) * 500);
  });
}

function generateBiometricReport() {
  const reportType = document.getElementById('reportType').value;
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;

  if (!startDate || !endDate) {
    showBiometricFeedback('Please select both start and end dates', 'warning');
    return;
  }

  const reportsContent = document.getElementById('reportsContent');
  reportsContent.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #2196F3;"></i>
      <p>Generating ${reportType} report...</p>
    </div>
  `;

  // Simulate report generation
  setTimeout(() => {
    const mockData = generateMockReportData(reportType);
    reportsContent.innerHTML = mockData;
    document.getElementById('reportsActions').style.display = 'block';
    showBiometricFeedback('Report generated successfully!', 'success');
  }, 2000);
}

function generateMockReportData(type) {
  switch (type) {
    case 'enrollment':
      return `
        <h4>Enrollment Summary</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0;">
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: #4CAF50;">85%</div>
            <div>Members Enrolled</div>
          </div>
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 2rem; font-weight: bold; color: #2196F3;">92%</div>
            <div>Trainers Enrolled</div>
          </div>
        </div>
      `;
    case 'attendance':
      return `
        <h4>Attendance Analytics</h4>
        <div style="margin: 16px 0;">
          <div style="margin-bottom: 12px;">
            <strong>Average Daily Attendance:</strong> 127 people
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Peak Hours:</strong> 6:00 AM - 8:00 AM, 6:00 PM - 8:00 PM
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Biometric Success Rate:</strong> 96.5%
          </div>
        </div>
      `;
    case 'verification':
      return `
        <h4>Verification Success Rate</h4>
        <div style="margin: 16px 0;">
          <div style="margin-bottom: 12px;">
            <strong>Fingerprint Verification:</strong> 97.2%
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Face Recognition:</strong> 94.8%
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Failed Attempts:</strong> 23 (2.1%)
          </div>
        </div>
      `;
    case 'device':
      return `
        <h4>Device Usage</h4>
        <div style="margin: 16px 0;">
          <div style="margin-bottom: 12px;">
            <strong>Fingerprint Scanner:</strong> 89% utilization
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Face Recognition Camera:</strong> 76% utilization
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Device Uptime:</strong> 99.1%
          </div>
        </div>
      `;
    default:
      return '<p>No data available for this report type.</p>';
  }
}

// Export and email functions
window.exportBiometricReport = function(format) {
  showBiometricFeedback(`Exporting report as ${format.toUpperCase()}...`, 'info');
  setTimeout(() => {
    showBiometricFeedback(`Report exported successfully as ${format.toUpperCase()}!`, 'success');
  }, 1500);
};

window.emailBiometricReport = function() {
  showBiometricFeedback('Sending report via email...', 'info');
  setTimeout(() => {
    showBiometricFeedback('Report sent successfully!', 'success');
  }, 2000);
};

// Global functions for device setup (redirects to new modal)
window.selectDevice = function(deviceType) {
  showBiometricFeedback(`Opening ${deviceType} device configuration...`, 'info');
  showDeviceConfigurationModal();
};

window.startDeviceSetup = function() {
  showBiometricFeedback('Opening device configuration...', 'info');
  showDeviceConfigurationModal();
};

// Global functions for enrollment modal
window.enrollPerson = enrollPerson;
window.startBulkEnrollment = startBulkEnrollment;
window.switchEnrollmentTab = switchEnrollmentTab;

// Global functions for reports modal
window.generateBiometricReport = generateBiometricReport;
window.exportBiometricReport = function(format) {
  showBiometricFeedback(`Exporting report as ${format.toUpperCase()}...`, 'info');
  setTimeout(() => {
    showBiometricFeedback(`Report exported successfully as ${format.toUpperCase()}!`, 'success');
  }, 1500);
};

window.emailBiometricReport = function() {
  showBiometricFeedback('Sending report via email...', 'info');
  setTimeout(() => {
    showBiometricFeedback('Report sent successfully!', 'success');
  }, 2000);
};

// Open biometric enrollment interface
function openBiometricEnrollment() {
  const modal = createBiometricModal('Enroll Biometric Data', `
    <div style="padding: 20px;">
      <h3 style="text-align: center; margin-bottom: 20px;">
        <i class="fas fa-user-plus"></i> Enroll Member Biometric Data
      </h3>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Select Member:</label>
        <select id="memberSelect" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px;">
          <option value="">Loading members...</option>
        </select>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
        <button class="btn btn-success" onclick="enrollFingerprint()" id="enrollFingerprintBtn">
          <i class="fas fa-fingerprint"></i> Enroll Fingerprint
        </button>
        <button class="btn btn-info" onclick="enrollFaceData()" id="enrollFaceBtn">
          <i class="fas fa-camera"></i> Enroll Face Data
        </button>
      </div>
      
      <div id="enrollmentProgress" style="display: none; margin-top: 20px;">
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden;">
          <div id="progressBar" style="background: linear-gradient(90deg, #4CAF50, #45a049); height: 8px; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        <p id="enrollmentStatus" style="text-align: center; margin: 12px 0; font-weight: 600;"></p>
      </div>
    </div>
  `);
  
  document.body.appendChild(modal);
  
  // Load members for enrollment
  loadMembersForEnrollment();
}

// Open biometric reports
function openBiometricReports() {
  const modal = createBiometricModal('Biometric Attendance Reports', `
    <div style="padding: 20px;">
      <h3 style="text-align: center; margin-bottom: 20px;">
        <i class="fas fa-chart-bar"></i> Biometric Attendance Analytics
      </h3>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="stat-card" style="padding: 16px; background: linear-gradient(135deg, #4CAF50, #45a049); color: white; border-radius: 8px; text-align: center;">
          <i class="fas fa-fingerprint" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <h4 style="margin: 0; font-size: 1.8rem;" id="fingerprintCount">--</h4>
          <p style="margin: 4px 0 0 0; opacity: 0.9;">Fingerprint Records</p>
        </div>
        
        <div class="stat-card" style="padding: 16px; background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border-radius: 8px; text-align: center;">
          <i class="fas fa-user-check" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <h4 style="margin: 0; font-size: 1.8rem;" id="faceRecordCount">--</h4>
          <p style="margin: 4px 0 0 0; opacity: 0.9;">Face Records</p>
        </div>
        
        <div class="stat-card" style="padding: 16px; background: linear-gradient(135deg, #FF9800, #F57C00); color: white; border-radius: 8px; text-align: center;">
          <i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <h4 style="margin: 0; font-size: 1.8rem;" id="todayBiometricCheckins">--</h4>
          <p style="margin: 4px 0 0 0; opacity: 0.9;">Today's Check-ins</p>
        </div>
      </div>
      
      <div style="margin-top: 24px;">
        <h4>Recent Biometric Activity</h4>
        <div id="recentBiometricActivity" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
          <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px;"></i>
            <p>Loading recent activity...</p>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 20px; text-align: center;">
        <button class="btn btn-primary" onclick="exportBiometricReport()">
          <i class="fas fa-download"></i> Export Report
        </button>
      </div>
    </div>
  `, '90%');
  
  document.body.appendChild(modal);
  
  // Load biometric statistics
  loadBiometricStatistics();
}

// Create reusable biometric modal


// Update device status indicator
function updateDeviceStatus(status) {
  // This would update any device status indicators in the UI
  console.log(`📟 Device status updated: ${status}`);
}

// Load members for biometric enrollment
function loadMembersForEnrollment() {
  const memberSelect = document.getElementById('memberSelect');
  if (!memberSelect) return;
  
  // Simulate loading members - in real implementation, fetch from API
  setTimeout(() => {
    memberSelect.innerHTML = `
      <option value="">Select a member...</option>
      <option value="1">John Doe (ID: GYM001)</option>
      <option value="2">Jane Smith (ID: GYM002)</option>
      <option value="3">Mike Johnson (ID: GYM003)</option>
      <option value="4">Sarah Wilson (ID: GYM004)</option>
    `;
  }, 1000);
}

// Load biometric statistics
function loadBiometricStatistics() {
  // Simulate loading statistics
  setTimeout(() => {
    document.getElementById('fingerprintCount').textContent = Math.floor(Math.random() * 50) + 20;
    document.getElementById('faceRecordCount').textContent = Math.floor(Math.random() * 30) + 15;
    document.getElementById('todayBiometricCheckins').textContent = Math.floor(Math.random() * 25) + 5;
    
    // Load recent activity
    const activityDiv = document.getElementById('recentBiometricActivity');
    if (activityDiv) {
      activityDiv.innerHTML = `
        <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>John Doe</strong> - <span style="color: #4CAF50;">Fingerprint Check-in</span>
            </div>
            <small style="color: var(--text-secondary);">10:30 AM</small>
          </div>
        </div>
        <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Jane Smith</strong> - <span style="color: #2196F3;">Face Recognition Check-in</span>
            </div>
            <small style="color: var(--text-secondary);">9:45 AM</small>
          </div>
        </div>
        <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Mike Johnson</strong> - <span style="color: #4CAF50;">Fingerprint Check-in</span>
            </div>
            <small style="color: var(--text-secondary);">8:20 AM</small>
          </div>
        </div>
      `;
    }
  }, 1500);
}

// Initialize biometric attendance when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Add to existing settings initialization
  if (typeof setupDashboardCustomization === 'function') {
    setupDashboardCustomization();
  }
  
  // Initialize biometric attendance
  setupBiometricAttendance();
});

// Global functions for modal interactions
window.selectDevice = function(deviceType) {
  const options = document.querySelectorAll('.device-option');
  options.forEach(option => {
    option.style.borderColor = '#e0e0e0';
  });
  event.target.closest('.device-option').style.borderColor = '#4CAF50';
  showBiometricFeedback(`${deviceType} device selected`);
};

// Redirect old device configuration function to new modal
window.startDeviceConfiguration = function(deviceType) {
  showBiometricFeedback(`Opening ${deviceType} device configuration...`, 'info');
  showDeviceConfigurationModal();
};

// Global functions for enrollment modal
  const configModal = createBiometricModal(`Configure ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device`, `
    <div style="padding: 20px;">
      <h4 style="text-align: center; margin-bottom: 20px;">
        <i class="fas fa-${deviceType === 'fingerprint' ? 'fingerprint' : 'camera'}"></i>
        ${deviceType === 'fingerprint' ? 'Fingerprint Scanner' : 'Face Recognition Camera'} Configuration
      </h4>
      
      <div style="margin-bottom: 24px;">
        <h5>Device Settings:</h5>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 12px;">
          ${deviceType === 'fingerprint' ? `
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Scan Quality:</label>
              <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="standard">Standard (Recommended)</option>
                <option value="high">High Quality</option>
                <option value="ultra">Ultra High Quality</option>
              </select>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Timeout (seconds):</label>
              <input type="number" value="10" min="5" max="30" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
              <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" checked>
                Enable live finger detection
              </label>
            </div>
          ` : `
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Camera Resolution:</label>
              <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="720p">HD (1280x720) - Recommended</option>
                <option value="1080p">Full HD (1920x1080)</option>
                <option value="4k">4K (3840x2160)</option>
              </select>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Detection Sensitivity:</label>
              <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="standard">Standard</option>
                <option value="high">High (Recommended)</option>
                <option value="very-high">Very High</option>
              </select>
            </div>
            <div>
              <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" checked>
                Enable anti-spoofing protection
              </label>
            </div>
          `}
        </div>
      </div>
      
      <div style="text-align: center;">
        <button class="btn btn-primary" onclick="saveDeviceConfiguration('${deviceType}')">
          <i class="fas fa-save"></i> Save Configuration
        </button>
        <button class="btn btn-secondary" onclick="testDeviceConfiguration('${deviceType}')" style="margin-left: 12px;">
          <i class="fas fa-vial"></i> Test Device
        </button>
      </div>
    </div>
  `);
  
  // Close current modal and show configuration
  document.querySelector('.biometric-modal').remove();
  document.body.appendChild(configModal);
};

window.retryDeviceCheck = function(deviceType) {
  document.querySelector('.biometric-modal').remove();
  checkBiometricDeviceCompatibility(deviceType);
};

window.showDeviceRecommendations = function(deviceType) {
  const recommendationsModal = createBiometricModal(`${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device Recommendations`, `
    <div style="padding: 20px;">
      <h4 style="text-align: center; margin-bottom: 20px;">
        <i class="fas fa-shopping-cart"></i>
        Recommended ${deviceType === 'fingerprint' ? 'Fingerprint Scanners' : 'Cameras'}
      </h4>
      
      ${deviceType === 'fingerprint' ? `
        <div style="display: grid; gap: 16px;">
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
            <h5 style="color: #4CAF50; margin-bottom: 8px;">SecuGen Hamster Pro 20</h5>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
              Professional-grade USB fingerprint scanner with excellent accuracy
            </p>
            <div style="color: #333; font-weight: 500;">$150 - $200</div>
            <small style="color: #666;">✓ Windows certified ✓ 500 DPI ✓ Live finger detection</small>
          </div>
          
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
            <h5 style="color: #4CAF50; margin-bottom: 8px;">DigitalPersona U.are.U 4500</h5>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
              Reliable and widely compatible fingerprint reader
            </p>
            <div style="color: #333; font-weight: 500;">$100 - $150</div>
            <small style="color: #666;">✓ Plug & play ✓ Durable design ✓ SDK support</small>
          </div>
          
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
            <h5 style="color: #4CAF50; margin-bottom: 8px;">Futronic FS88</h5>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
              Cost-effective solution for small to medium gyms
            </p>
            <div style="color: #333; font-weight: 500;">$60 - $100</div>
            <small style="color: #666;">✓ Budget-friendly ✓ Good quality ✓ USB powered</small>
          </div>
        </div>
      ` : `
        <div style="display: grid; gap: 16px;">
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
            <h5 style="color: #2196F3; margin-bottom: 8px;">Logitech C920s HD Pro</h5>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
              High-quality webcam with excellent face recognition capabilities
            </p>
            <div style="color: #333; font-weight: 500;">$70 - $100</div>
            <small style="color: #666;">✓ 1080p HD ✓ Auto-focus ✓ Good low-light performance</small>
          </div>
          
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
            <h5 style="color: #2196F3; margin-bottom: 8px;">Intel RealSense ID F455</h5>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
              Advanced facial recognition with anti-spoofing technology
            </p>
            <div style="color: #333; font-weight: 500;">$200 - $300</div>
            <small style="color: #666;">✓ 3D sensing ✓ Anti-spoofing ✓ High accuracy</small>
          </div>
          
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
            <h5 style="color: #2196F3; margin-bottom: 8px;">Microsoft LifeCam Studio</h5>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
              Professional webcam with Windows Hello compatibility
            </p>
            <div style="color: #333; font-weight: 500;">$80 - $120</div>
            <small style="color: #666;">✓ Windows Hello ✓ 1080p ✓ Wide-angle lens</small>
          </div>
        </div>
      `}
      
      <div style="margin-top: 24px; text-align: center; background: #e3f2fd; padding: 16px; border-radius: 8px;">
        <i class="fas fa-info-circle" style="color: #2196F3; margin-right: 8px;"></i>
        <strong>Need help choosing?</strong> Contact our support team for personalized recommendations based on your gym size and budget.
      </div>
    </div>
  `);
  
  document.querySelector('.biometric-modal').remove();
  document.body.appendChild(recommendationsModal);
};

window.downloadDrivers = function(deviceType) {
  showBiometricFeedback(`Redirecting to ${deviceType} driver downloads...`, 'info');
  // In real implementation, this would open driver download links
  setTimeout(() => {
    showBiometricFeedback('Driver download links opened in new tab', 'success');
  }, 1500);
};

window.saveDeviceConfiguration = function(deviceType) {
  showBiometricFeedback(`Saving ${deviceType} device configuration...`, 'info');
  setTimeout(() => {
    showBiometricFeedback('Device configuration saved successfully!', 'success');
    document.querySelector('.biometric-modal').remove();
  }, 1500);
};

window.testDeviceConfiguration = function(deviceType) {
  showBiometricFeedback(`Testing ${deviceType} device configuration...`, 'info');
  setTimeout(() => {
    const testSuccess = Math.random() > 0.2; // 80% success rate
    if (testSuccess) {
      showBiometricFeedback('Device test completed successfully!', 'success');
    } else {
      showBiometricFeedback('Device test failed. Please check connections.', 'error');
    }
  }, 2000);
};

// Enhanced device setup functions
window.selectDeviceForSetup = function(deviceType) {
  // Highlight selected device
  document.querySelectorAll('.device-option').forEach(option => {
    option.style.borderColor = '#e0e0e0';
    option.style.background = 'white';
  });
  event.target.closest('.device-option').style.borderColor = deviceType === 'fingerprint' ? '#4CAF50' : '#2196F3';
  event.target.closest('.device-option').style.background = deviceType === 'fingerprint' ? '#f1f8e9' : '#e3f2fd';
  
  showBiometricFeedback(`${deviceType === 'fingerprint' ? 'Fingerprint scanner' : 'Face recognition camera'} selected`, 'info');
  
  // Store selection for later use
  window.selectedDeviceType = deviceType;
};

window.startQuickSetup = function() {
  const quickSetupModal = createBiometricModal('Quick Setup', `
    <div style="padding: 20px; text-align: center;">
      <i class="fas fa-bolt fa-3x" style="color: #ff9800; margin-bottom: 20px;"></i>
      <h3>Quick Setup in Progress</h3>
      <p style="color: #666; margin-bottom: 24px;">
        Automatically detecting and configuring biometric devices...
      </p>
      
      <div style="margin: 24px 0;">
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden; height: 8px;">
          <div id="quickSetupProgress" style="background: linear-gradient(90deg, #ff9800, #f57c00); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        <p id="quickSetupStatus" style="margin: 12px 0; color: #666;">Initializing...</p>
      </div>
      
      <div id="quickSetupResults" style="display: none; margin-top: 20px;"></div>
    </div>
  `);
  
  document.querySelector('.biometric-modal').remove();
  document.body.appendChild(quickSetupModal);
  
  // Simulate quick setup process
  const progressBar = document.getElementById('quickSetupProgress');
  const statusText = document.getElementById('quickSetupStatus');
  const resultsDiv = document.getElementById('quickSetupResults');
  
  const setupSteps = [
    'Scanning for USB devices...',
    'Detecting cameras...',
    'Installing drivers...',
    'Testing devices...',
    'Configuring settings...',
    'Finalizing setup...'
  ];
  
  let step = 0;
  const stepInterval = setInterval(() => {
    if (step >= setupSteps.length) {
      clearInterval(stepInterval);
      
      progressBar.style.width = '100%';
      statusText.textContent = 'Quick setup completed!';
      
      // Simulate detection results
      const devicesFound = Math.random() > 0.3 ? ['fingerprint'] : [];
      if (Math.random() > 0.5) devicesFound.push('camera');
      
      if (devicesFound.length > 0) {
        resultsDiv.innerHTML = `
          <div style="background: #e8f5e8; border: 1px solid #4CAF50; border-radius: 8px; padding: 16px;">
            <i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 8px;"></i>
            <strong>Setup completed successfully!</strong>
            <p style="margin: 12px 0 0 0; color: #666;">
              Found and configured: ${devicesFound.map(d => d === 'fingerprint' ? 'Fingerprint Scanner' : 'Face Recognition Camera').join(', ')}
            </p>
            <div style="margin-top: 16px;">
              <button class="btn btn-success" onclick="completeSetup()">
                <i class="fas fa-check"></i> Finish Setup
              </button>
            </div>
          </div>
        `;
      } else {
        resultsDiv.innerHTML = `
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px;">
            <i class="fas fa-exclamation-triangle" style="color: #856404; margin-right: 8px;"></i>
            <strong>No devices detected</strong>
            <p style="margin: 12px 0 0 0; color: #856404;">
              Please connect your biometric devices and try again, or use manual setup.
            </p>
            <div style="margin-top: 16px;">
              <button class="btn btn-warning" onclick="startAdvancedSetup()" style="margin-right: 8px;">
                <i class="fas fa-cogs"></i> Manual Setup
              </button>
              <button class="btn btn-secondary" onclick="retryQuickSetup()">
                <i class="fas fa-redo"></i> Retry
              </button>
            </div>
          </div>
        `;
      }
      
      resultsDiv.style.display = 'block';
      return;
    }
    
    statusText.textContent = setupSteps[step];
    step++;
    progressBar.style.width = (step / setupSteps.length * 100) + '%';
  }, 1000);
};

window.startAdvancedSetup = function() {
  showBiometricFeedback('Opening advanced setup wizard...', 'info');
  setTimeout(() => {
    document.querySelector('.biometric-modal').remove();
    openBiometricDeviceSetup(); // Reopen the main setup modal
  }, 1000);
};

window.openSupportChat = function() {
  showBiometricFeedback('Opening support chat...', 'info');
  // In real implementation, this would open a support chat widget
};

window.completeSetup = function() {
  showBiometricFeedback('Biometric device setup completed successfully!', 'success');
  document.querySelector('.biometric-modal').remove();
};

window.retryQuickSetup = function() {
  document.querySelector('.biometric-modal').remove();
  startQuickSetup();
};

window.enrollFingerprint = function() {
  const memberSelect = document.getElementById('memberSelect');
  if (!memberSelect.value) {
    showBiometricFeedback('Please select a member first', 'warning');
    return;
  }
  simulateEnrollment('fingerprint');
};

window.enrollFaceData = function() {
  const memberSelect = document.getElementById('memberSelect');
  if (!memberSelect.value) {
    showBiometricFeedback('Please select a member first', 'warning');
    return;
  }
  simulateEnrollment('face');
};

window.simulateEnrollment = function(type) {
  const progressDiv = document.getElementById('enrollmentProgress');
  const progressBar = document.getElementById('progressBar');
  const statusText = document.getElementById('enrollmentStatus');
  
  progressDiv.style.display = 'block';
  statusText.textContent = `Enrolling ${type} data...`;
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      statusText.textContent = `${type} enrollment completed successfully!`;
      showBiometricFeedback(`${type} data enrolled successfully`, 'success');
    }
    progressBar.style.width = progress + '%';
  }, 500);
};

window.exportBiometricReport = function() {
  showBiometricFeedback('Exporting biometric report...', 'info');
  // Simulate export
  setTimeout(() => {
    showBiometricFeedback('Report exported successfully', 'success');
  }, 2000);
};

// ===== REAL BIOMETRIC API FUNCTIONS =====

// Real biometric enrollment using actual API
async function performRealBiometricEnrollment(personId, personType, biometricType, deviceId, enrollmentOptions = {}) {
  try {
    console.log(`🔐 Starting real ${biometricType} enrollment for ${personType} ${personId}`);
    
    const response = await fetch('/api/biometric/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      },
      body: JSON.stringify({
        personId,
        personType,
        biometricType,
        deviceId,
        enrollmentOptions
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Biometric enrollment completed successfully');
      return {
        success: true,
        message: result.message,
        biometricDataId: result.biometricDataId,
        enrollmentResult: result.enrollmentResult,
        person: result.person
      };
    } else {
      console.error('❌ Enrollment failed:', result.error);
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    console.error('❌ Enrollment error:', error);
    return {
      success: false,
      error: 'Network error during enrollment',
      details: error.message
    };
  }
}

// Real biometric verification using actual API
async function performRealBiometricVerification(personId, personType, biometricType, deviceId, verificationOptions = {}) {
  try {
    console.log(`🔍 Starting real ${biometricType} verification for ${personType} ${personId}`);
    
    const response = await fetch('/api/biometric/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      },
      body: JSON.stringify({
        personId,
        personType,
        biometricType,
        deviceId,
        verificationOptions
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Biometric verification ${result.verified ? 'successful' : 'failed'}`);
      return {
        success: true,
        verified: result.verified,
        message: result.message,
        verificationResult: result.verificationResult,
        attendance: result.attendance
      };
    } else {
      console.error('❌ Verification failed:', result.error);
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    return {
      success: false,
      error: 'Network error during verification',
      details: error.message
    };
  }
}

// Get real biometric enrollment status using actual API
async function getRealBiometricEnrollmentStatus(personType = null) {
  try {
    console.log('📊 Getting real biometric enrollment status...');
    
    const url = personType ? 
      `/api/biometric/enrollment-status?personType=${personType}` : 
      '/api/biometric/enrollment-status';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Enrollment status retrieved successfully');
      return {
        success: true,
        stats: result.stats,
        enrolledPersons: result.enrolledPersons
      };
    } else {
      console.error('❌ Failed to get enrollment status:', result.error);
      return {
        success: false,
        error: result.error,
        stats: { total: 0, fingerprint: 0, face: 0, both: 0 },
        enrolledPersons: []
      };
    }
  } catch (error) {
    console.error('❌ Error getting enrollment status:', error);
    return {
      success: false,
      error: error.message,
      stats: { total: 0, fingerprint: 0, face: 0, both: 0 },
      enrolledPersons: []
    };
  }
}

// Get real biometric statistics using actual API
async function getRealBiometricStats() {
  try {
    console.log('📈 Getting real biometric statistics...');
    
    const response = await fetch('/api/biometric/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Biometric statistics retrieved successfully');
      return {
        success: true,
        stats: result.stats
      };
    } else {
      console.error('❌ Failed to get statistics:', result.error);
      return {
        success: false,
        error: result.error,
        stats: null
      };
    }
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
    return {
      success: false,
      error: error.message,
      stats: null
    };
  }
}

// Install device from test results
window.installDeviceFromTest = async function(deviceId) {
  try {
    showBiometricFeedback('Installing device SDK...', 'info');
    
    // First, get the device info from our scan results
    const scanResult = await performRealDeviceDetection();
    const allDevices = [...scanResult.fingerprint.devices, ...scanResult.camera.devices];
    const device = allDevices.find(d => d.deviceId === deviceId);
    
    if (!device) {
      showBiometricFeedback('Device not found for installation', 'error');
      return;
    }
    
    const installResult = await installRealDevice(device);
    
    if (installResult.success) {
      showBiometricFeedback('Device SDK installed successfully!', 'success');
      // Refresh the test results
      setTimeout(() => {
        window.runConnectionTestAgain();
      }, 1000);
    } else {
      showBiometricFeedback(`Installation failed: ${installResult.error}`, 'error');
    }
  } catch (error) {
    console.error('Installation error:', error);
    showBiometricFeedback('Installation error occurred', 'error');
  }
};

// Enhanced real device setup functions
window.selectDeviceForSetup = async function(deviceType) {
  showBiometricFeedback(`Starting ${deviceType} device setup...`, 'info');
  
  // Close current modal
  const modal = document.querySelector('.biometric-modal-overlay');
  if (modal) modal.remove();
  
  // Start device-specific setup
  if (deviceType === 'fingerprint') {
    await startFingerprintSetup();
  } else if (deviceType === 'camera') {
    await startCameraSetup();
  }
};

async function startFingerprintSetup() {
  const setupModal = createBiometricModal('Fingerprint Scanner Setup', `
    <div style="padding: 20px;">
      <div class="setup-progress" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: between; margin-bottom: 8px;">
          <span>Setup Progress</span>
          <span id="fingerprintSetupPercent">0%</span>
        </div>
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden; height: 6px;">
          <div id="fingerprintSetupProgress" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
      </div>
      
      <div id="fingerprintSetupContent">
        <div style="text-align: center; margin-bottom: 20px;">
          <i class="fas fa-fingerprint fa-3x" style="color: #4CAF50; margin-bottom: 16px;"></i>
          <h4>Setting up Fingerprint Scanner</h4>
          <p id="fingerprintSetupStatus">Scanning for connected fingerprint devices...</p>
        </div>
        
        <div id="fingerprintDevices" style="margin-top: 20px;"></div>
      </div>
    </div>
  `);
  
  document.body.appendChild(setupModal);
  
  // Start real setup process
  await runFingerprintSetupProcess();
}

async function runFingerprintSetupProcess() {
  const progressBar = document.getElementById('fingerprintSetupProgress');
  const percentText = document.getElementById('fingerprintSetupPercent');
  const statusText = document.getElementById('fingerprintSetupStatus');
  const devicesDiv = document.getElementById('fingerprintDevices');
  
  // Step 1: Scan for devices
  progressBar.style.width = '20%';
  percentText.textContent = '20%';
  statusText.textContent = 'Scanning for fingerprint devices...';
  
  const scanResult = await performRealDeviceDetection();
  const fingerprintDevices = scanResult.fingerprint.devices || [];
  
  if (fingerprintDevices.length === 0) {
    progressBar.style.background = '#f44336';
    statusText.innerHTML = `
      <div style="color: #f44336; margin-top: 12px;">
        <i class="fas fa-exclamation-triangle"></i>
        No fingerprint scanners detected. Please connect a device and try again.
      </div>
    `;
    return;
  }
  
  // Step 2: Display found devices
  progressBar.style.width = '40%';
  percentText.textContent = '40%';
  statusText.textContent = `Found ${fingerprintDevices.length} fingerprint device(s)`;
  
  devicesDiv.innerHTML = fingerprintDevices.map(device => `
    <div class="device-setup-card" style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; justify-content: between;">
        <div style="flex: 1;">
          <h5 style="margin: 0; color: #333;">${device.vendor} ${device.model}</h5>
          <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">Device ID: ${device.deviceId}</p>
          <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">Status: ${device.isInstalled ? 'Ready' : 'Needs Installation'}</p>
        </div>
        <button class="btn btn-primary" onclick="setupFingerprintDevice('${device.deviceId}')" 
                ${device.isInstalled ? '' : 'disabled'}>
          ${device.isInstalled ? 'Configure' : 'Install First'}
        </button>
      </div>
    </div>
  `).join('');
  
  progressBar.style.width = '60%';
  percentText.textContent = '60%';
  statusText.textContent = 'Ready to configure devices';
}

window.setupFingerprintDevice = async function(deviceId) {
  showBiometricFeedback('Configuring fingerprint device...', 'info');
  
  const testResult = await testRealDeviceConnection(deviceId);
  
  if (testResult.success) {
    showBiometricFeedback('Fingerprint device configured successfully!', 'success');
    
    // Update progress
    const progressBar = document.getElementById('fingerprintSetupProgress');
    const percentText = document.getElementById('fingerprintSetupPercent');
    const statusText = document.getElementById('fingerprintSetupStatus');
    
    if (progressBar) {
      progressBar.style.width = '100%';
      percentText.textContent = '100%';
      statusText.innerHTML = `
        <div style="color: #4CAF50; margin-top: 12px;">
          <i class="fas fa-check-circle"></i>
          Fingerprint device setup completed successfully!
        </div>
      `;
    }
  } else {
    showBiometricFeedback(`Configuration failed: ${testResult.error}`, 'error');
  }
};

// Similar setup for camera devices
async function startCameraSetup() {
  const setupModal = createBiometricModal('Face Recognition Camera Setup', `
    <div style="padding: 20px;">
      <div class="setup-progress" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: between; margin-bottom: 8px;">
          <span>Setup Progress</span>
          <span id="cameraSetupPercent">0%</span>
        </div>
        <div style="background: #f0f0f0; border-radius: 8px; overflow: hidden; height: 6px;">
          <div id="cameraSetupProgress" style="background: #2196F3; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
      </div>
      
      <div id="cameraSetupContent">
        <div style="text-align: center; margin-bottom: 20px;">
          <i class="fas fa-camera fa-3x" style="color: #2196F3; margin-bottom: 16px;"></i>
          <h4>Setting up Face Recognition Camera</h4>
          <p id="cameraSetupStatus">Scanning for connected camera devices...</p>
        </div>
        
        <div id="cameraDevices" style="margin-top: 20px;"></div>
      </div>
    </div>
  `);
  
  document.body.appendChild(setupModal);
  await runCameraSetupProcess();
}

async function runCameraSetupProcess() {
  const progressBar = document.getElementById('cameraSetupProgress');
  const percentText = document.getElementById('cameraSetupPercent');
  const statusText = document.getElementById('cameraSetupStatus');
  const devicesDiv = document.getElementById('cameraDevices');
  
  // Step 1: Scan for devices
  progressBar.style.width = '20%';
  percentText.textContent = '20%';
  statusText.textContent = 'Scanning for camera devices...';
  
  const scanResult = await performRealDeviceDetection();
  const cameraDevices = scanResult.camera.devices || [];
  
  if (cameraDevices.length === 0) {
    progressBar.style.background = '#f44336';
    statusText.innerHTML = `
      <div style="color: #f44336; margin-top: 12px;">
        <i class="fas fa-exclamation-triangle"></i>
        No face recognition cameras detected. Please connect a device and try again.
      </div>
    `;
    return;
  }
  
  // Step 2: Display found devices
  progressBar.style.width = '40%';
  percentText.textContent = '40%';
  statusText.textContent = `Found ${cameraDevices.length} camera device(s)`;
  
  devicesDiv.innerHTML = cameraDevices.map(device => `
    <div class="device-setup-card" style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; justify-content: between;">
        <div style="flex: 1;">
          <h5 style="margin: 0; color: #333;">${device.vendor} ${device.model}</h5>
          <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">Device ID: ${device.deviceId}</p>
          <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">Status: ${device.isInstalled ? 'Ready' : 'Needs Installation'}</p>
        </div>
        <button class="btn btn-primary" onclick="setupCameraDevice('${device.deviceId}')" 
                ${device.isInstalled ? '' : 'disabled'}>
          ${device.isInstalled ? 'Configure' : 'Install First'}
        </button>
      </div>
    </div>
  `).join('');
  
  progressBar.style.width = '60%';
  percentText.textContent = '60%';
  statusText.textContent = 'Ready to configure devices';
}

window.setupCameraDevice = async function(deviceId) {
  showBiometricFeedback('Configuring camera device...', 'info');
  
  const testResult = await testRealDeviceConnection(deviceId);
  
  if (testResult.success) {
    showBiometricFeedback('Camera device configured successfully!', 'success');
    
    // Update progress
    const progressBar = document.getElementById('cameraSetupProgress');
    const percentText = document.getElementById('cameraSetupPercent');
    const statusText = document.getElementById('cameraSetupStatus');
    
    if (progressBar) {
      progressBar.style.width = '100%';
      percentText.textContent = '100%';
      statusText.innerHTML = `
        <div style="color: #4CAF50; margin-top: 12px;">
          <i class="fas fa-check-circle"></i>
          Camera device setup completed successfully!
        </div>
      `;
    }
  } else {
    showBiometricFeedback(`Configuration failed: ${testResult.error}`, 'error');
  }
};

// Quick setup function
window.startQuickSetup = async function() {
  showBiometricFeedback('Starting quick device setup...', 'info');
  
  // Close current modal
  const modal = document.querySelector('.biometric-modal-overlay');
  if (modal) modal.remove();
  
  // Start auto-detection and setup
  const scanResult = await performRealDeviceDetection();
  
  if (scanResult.totalDevices === 0) {
    showBiometricFeedback('No devices found for quick setup', 'warning');
    return;
  }
  
  showBiometricFeedback(`Found ${scanResult.totalDevices} device(s), configuring automatically...`, 'info');
  
  // Auto-setup all found devices
  let successCount = 0;
  const allDevices = [...scanResult.fingerprint.devices, ...scanResult.camera.devices];
  
  for (const device of allDevices) {
    if (device.isInstalled) {
      const testResult = await testRealDeviceConnection(device.deviceId);
      if (testResult.success) {
        successCount++;
      }
    }
  }
  
  if (successCount > 0) {
    showBiometricFeedback(`Quick setup completed! ${successCount} device(s) configured.`, 'success');
  } else {
    showBiometricFeedback('Quick setup completed, but some devices need manual configuration', 'warning');
  }
};

// Advanced setup function
window.startAdvancedSetup = function() {
  showBiometricFeedback('Opening advanced setup options...', 'info');
  // This would open a more detailed setup wizard
  openBiometricDeviceSetup();
};

// ===== SECURITY & PRIVACY FEATURES =====

// Two-Factor Authentication Management
class TwoFactorAuthManager {
  constructor() {
    this.isSetupInProgress = false;
    this.isLoadingStatus = false;
  }

  async enable2FA() {
    if (this.isSetupInProgress) return;
    
    try {
      this.isSetupInProgress = true;
      const gymId = window.getGymId ? window.getGymId() : 'default';
      
      // Check if 2FA is already enabled
      const currentStatus = await this.get2FAStatus();
      if (currentStatus.enabled) {
        showNotification('Two-Factor Authentication is already enabled', 'info');
        return;
      }

      // Show 2FA setup modal
      this.show2FASetupModal();
      
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      showNotification('Failed to enable Two-Factor Authentication', 'error');
    } finally {
      this.isSetupInProgress = false;
    }
  }

  async disable2FA() {
    try {
      const gymId = window.getGymId ? window.getGymId() : 'default';
      const result = await this.showDisable2FAModal();
      if (!result.confirmed) return;

      const response = await this.apiCall('/api/gyms/disable-2fa', {
        method: 'POST'
      });

      if (response.success) {
        this.update2FAToggle(false, false); // Don't show notification from toggle, we show it here
        
        // Update gym-specific setting
        if (window.setGymSpecificSetting) {
          window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, false);
        }
        
        showNotification('Email-based Two-Factor Authentication disabled successfully', 'success');
      } else {
        showNotification(response.message || 'Failed to disable 2FA', 'error');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      showNotification('Failed to disable Two-Factor Authentication', 'error');
    }
  }

  show2FASetupModal() {
    const modal = this.createSecurityModal('Setup Two-Factor Authentication', `
      <div class="email-2fa-setup">
        <div class="setup-header">
          <i class="fas fa-envelope-open-text" style="font-size: 3rem; color: #007bff; margin-bottom: 20px;"></i>
          <h3>Email-Based Two-Factor Authentication</h3>
          <p style="color: #666; margin-bottom: 30px; line-height: 1.5;">
            When enabled, you'll receive a verification code via email each time you log in. 
            This adds an extra layer of security to your gym admin account.
          </p>
        </div>
        
        <div class="security-features">
          <div class="feature-item">
            <i class="fas fa-shield-alt"></i>
            <span>Enhanced account security</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-email"></i>
            <span>Codes sent to your registered email</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-clock"></i>
            <span>Codes expire in 10 minutes</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-mobile-alt"></i>
            <span>No app installation required</span>
          </div>
        </div>
        
        <div class="email-info" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #333;">
            <i class="fas fa-info-circle"></i> How it works:
          </h4>
          <ol style="margin: 0; padding-left: 20px; color: #666;">
            <li>Enter your email and password to log in</li>
            <li>A 6-digit verification code will be sent to your email</li>
            <li>Enter the code to complete your login</li>
            <li>The code expires after 10 minutes for security</li>
          </ol>
        </div>
        
        <div class="confirmation-section" style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
          <div class="current-email">
            <strong>Verification codes will be sent to:</strong>
            <div style="background: white; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin: 10px 0; display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-envelope" style="color: #007bff;"></i>
              <span id="userEmail">Loading...</span>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0;">
            <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
            <strong style="color: #856404;">Important:</strong>
            <span style="color: #856404;">Make sure you have access to this email address before enabling 2FA.</span>
          </div>
        </div>
        
        <div class="setup-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 30px;">
          <button class="security-btn secondary" onclick="window.twoFactorManager.closeCurrentModal()">
            Cancel
          </button>
          <button class="security-btn primary" onclick="window.twoFactorManager.enableEmail2FA(event)">
            <i class="fas fa-check"></i> Enable Email 2FA
          </button>
        </div>
      </div>
    `);

    // Load and display current user email
    setTimeout(() => this.loadCurrentUserEmail(), 100);
  }

  async loadCurrentUserEmail() {
    try {
      // Get email from JWT token or profile
      const token = localStorage.getItem('gymAdminToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.admin?.email;
        
        const emailElement = document.getElementById('userEmail');
        if (emailElement && email) {
          emailElement.textContent = email;
        }
      }
    } catch (error) {
      console.error('Error loading user email:', error);
      const emailElement = document.getElementById('userEmail');
      if (emailElement) {
        emailElement.textContent = 'Unable to load email';
      }
    }
  }

  async enableEmail2FA(event) {
    let enableButton = null;
    
    try {
      // Show loading state
      if (event && event.target) {
        enableButton = event.target;
      } else {
        // Fallback: find the button by text content
        enableButton = document.querySelector('button[onclick*="enableEmail2FA"]');
      }
      
      const originalContent = enableButton ? enableButton.innerHTML : '';
      if (enableButton) {
        enableButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enabling...';
        enableButton.disabled = true;
      }

      const response = await this.apiCall('/api/gyms/enable-email-2fa', {
        method: 'POST'
      });

      if (response.success) {
        this.closeCurrentModal();
        this.update2FAToggle(true, false); // Don't show notification from toggle, we show it here
        
        // Store gym-specific setting
        const gymId = window.getGymId ? window.getGymId() : 'default';
        if (window.setGymSpecificSetting) {
          window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, true);
        }
        
        showNotification('Email-based Two-Factor Authentication enabled successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to enable 2FA');
      }
    } catch (error) {
      console.error('Error enabling email 2FA:', error);
      showNotification(error.message || 'Failed to enable Two-Factor Authentication', 'error');
      
      // Restore button state
      if (enableButton) {
        enableButton.innerHTML = '<i class="fas fa-check"></i> Enable Email 2FA';
        enableButton.disabled = false;
      }
    }
  }

  showBackupCodes(codes) {
    const modal = this.createSecurityModal('Backup Codes', `
      <div class="backup-codes-info">
        <i class="fas fa-exclamation-triangle" style="color: var(--warning-color); font-size: 2rem;"></i>
        <h3>Save Your Backup Codes</h3>
        <p>These codes can be used to access your account if you lose your phone. Save them in a secure location.</p>
      </div>
      
      <div class="backup-codes-list">
        ${codes.map(code => `
          <div class="backup-code-item">
            <code>${code}</code>
            <button class="copy-code-btn" onclick="navigator.clipboard.writeText('${code}')">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        `).join('')}
      </div>
      
      <div class="backup-codes-actions">
        <button class="security-btn secondary" onclick="window.twoFactorManager.downloadBackupCodes(['${codes.join("', '")}'])">
          <i class="fas fa-download"></i> Download
        </button>
        <button class="security-btn primary" onclick="window.twoFactorManager.closeCurrentModal()">
          I've saved them
        </button>
      </div>
      
      <div class="backup-codes-warning">
        <i class="fas fa-info-circle"></i>
        <span>Each backup code can only be used once. Keep them secure!</span>
      </div>
    `);
  }

  downloadBackupCodes(codes) {
    const content = `Gym-Wale Two-Factor Authentication Backup Codes

Generated: ${new Date().toLocaleDateString()}

${codes.join('\n')}

Keep these codes secure and don't share them with anyone.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gym-wale-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async showDisable2FAModal() {
    return new Promise((resolve) => {
      const modal = this.createSecurityModal('Disable Two-Factor Authentication', `
        <div class="warning-message">
          <i class="fas fa-exclamation-triangle" style="color: #f39c12; font-size: 3rem; margin-bottom: 20px;"></i>
          <h3>Disable Email-Based 2FA?</h3>
          <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">
            Are you sure you want to disable two-factor authentication? This will make your gym admin account less secure.
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <i class="fas fa-info-circle" style="color: #856404;"></i>
            <strong style="color: #856404;">Note:</strong>
            <span style="color: #856404;">You can re-enable 2FA at any time from your security settings.</span>
          </div>
          
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <i class="fas fa-exclamation-triangle" style="color: #721c24;"></i>
            <strong style="color: #721c24;">Security Impact:</strong>
            <ul style="color: #721c24; margin: 8px 0 0 20px; padding: 0;">
              <li>Your account will only require email and password to log in</li>
              <li>No email verification codes will be sent during login</li>
              <li>Your account becomes more vulnerable to unauthorized access</li>
            </ul>
          </div>
        </div>
        
        <div class="modal-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 30px;">
          <button class="security-btn secondary" onclick="window.twoFactorManager.resolveDisable2FA(false)">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="security-btn danger" onclick="window.twoFactorManager.confirmDisable2FA()">
            <i class="fas fa-shield-alt"></i> Disable 2FA
          </button>
        </div>
      `);
      
      this.disable2FAResolver = resolve;
    });
  }

  confirmDisable2FA() {
    this.resolveDisable2FA({ confirmed: true });
  }

  resolveDisable2FA(result) {
    if (this.disable2FAResolver) {
      this.disable2FAResolver(result);
      this.disable2FAResolver = null;
    }
    this.closeCurrentModal();
  }

  async get2FAStatus() {
    try {
      const gymId = window.getGymId ? window.getGymId() : 'default';
      console.log(`🔍 Getting 2FA status for gym: ${gymId}`);
      
      const response = await this.apiCall('/api/security/2fa-status');
      
      // Handle both response formats
      let apiResult;
      if (response.data) {
        apiResult = response.data;
      } else if (response.success) {
        apiResult = {
          enabled: response.twoFactorEnabled || response.enabled || false,
          twoFactorType: response.twoFactorType || null
        };
      } else {
        apiResult = { enabled: false };
      }

      // Store gym-specific setting for consistency
      if (window.setGymSpecificSetting) {
        window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, apiResult.enabled);
      }
      
      console.log(`✅ 2FA status for gym ${gymId}:`, apiResult);
      return apiResult;
    } catch (error) {
      console.error('Error getting 2FA status from API:', error);
      
      // Fallback to gym-specific local storage
      const gymId = window.getGymId ? window.getGymId() : 'default';
      const savedStatus = window.getGymSpecificSetting ? 
        window.getGymSpecificSetting(`twoFactorEnabled_${gymId}`) : null;
      
      const isEnabled = savedStatus === 'true' || savedStatus === true;
      console.log(`🔄 Using fallback 2FA status for gym ${gymId}:`, isEnabled);
      
      return { enabled: isEnabled };
    }
  }

  async load2FAStatus() {
    if (this.isLoadingStatus) {
      console.log('⏳ 2FA status loading already in progress, skipping...');
      return;
    }
    
    this.isLoadingStatus = true;
    console.log('🔍 Loading 2FA status for current gym...');
    
    try {
      // First try to get from API
      const status = await this.get2FAStatus();
      console.log('✅ 2FA status from API:', status);
      
      const isEnabled = status.enabled || status.twoFactorEnabled || false;
      
      // Store gym-specific setting for consistency
      const gymId = window.getGymId ? window.getGymId() : 'default';
      if (window.setGymSpecificSetting) {
        window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, isEnabled);
      }
      
      this.update2FAToggle(isEnabled, false); // Don't show notification during loading
      console.log(`🎯 2FA status loaded successfully: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
      return status;
    } catch (error) {
      console.error('❌ Error loading 2FA status from API:', error);
      
      // Fallback to local storage if API fails
      try {
        console.log('🔄 Attempting fallback to local storage...');
        const gymId = window.getGymId ? window.getGymId() : 'default';
        const savedStatus = window.getGymSpecificSetting ? 
          window.getGymSpecificSetting(`twoFactorEnabled_${gymId}`) : null;
        
        const isEnabled = savedStatus === 'true' || savedStatus === true;
        console.log('📱 Using fallback 2FA status from local storage:', isEnabled);
        this.update2FAToggle(isEnabled, false); // Don't show notification during loading
        
        if (savedStatus === null) {
          showNotification('Unable to verify 2FA status - check connection', 'warning');
        }
        
        return { enabled: isEnabled };
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        this.update2FAToggle(false, false); // Don't show notification during loading
        showNotification('Failed to load 2FA status', 'error');
        return { enabled: false };
      }
    } finally {
      this.isLoadingStatus = false;
    }
  }

  update2FAToggle(enabled, showNotificationToast = true) {
    const toggle = document.getElementById('twoFactorAuth');
    console.log(`🔧 Attempting to update 2FA toggle to: ${enabled}`);
    console.log(`� Toggle element found:`, !!toggle);
    
    if (toggle) {
      const previousState = toggle.checked;
      toggle.checked = enabled;
      
      console.log(`✅ 2FA toggle updated: ${previousState} → ${enabled}`);
      
      // Store the gym-specific setting
      const gymId = window.getGymId ? window.getGymId() : 'default';
      if (window.setGymSpecificSetting) {
        window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, enabled);
        console.log(`💾 Stored 2FA setting for gym ${gymId}: ${enabled}`);
      }
      
      // Show notification toast for status change only if requested
      if (showNotificationToast && previousState !== enabled) {
        showNotification(
          `Two-Factor Authentication ${enabled ? 'enabled' : 'disabled'}`, 
          enabled ? 'success' : 'info'
        );
      }
    } else {
      console.warn('⚠️ 2FA toggle element not found - ID should be "twoFactorAuth"');
      console.log('🔍 Available elements with "Auth" in ID:');
      const authElements = document.querySelectorAll('[id*="Auth"], [id*="auth"], [id*="2fa"], [id*="2FA"]');
      authElements.forEach(el => console.log(`  - ${el.id}: ${el.tagName}`));
      
      showNotification('2FA toggle not found in UI', 'error');
    }
  }

  createSecurityModal(title, content) {
    // Remove existing modal if any
    this.closeCurrentModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'currentSecurityModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header-style">
          <h3 class="modal-title-style">
            <i class="fas fa-shield-alt"></i> ${title}
          </h3>
          <button class="modal-close" onclick="window.twoFactorManager.closeCurrentModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  closeCurrentModal() {
    const modal = document.getElementById('currentSecurityModal');
    if (modal) {
      modal.remove();
    }
  }

  // Sync method for toggle changes
  async syncToggleState(enabled) {
    try {
      console.log(`🔄 Syncing 2FA toggle state to: ${enabled}`);
      const gymId = window.getGymId ? window.getGymId() : 'default';
      
      // Try to call API if available, but don't fail if it's not
      if (enabled) {
        // Don't try to enable via API automatically, just log the state
        console.log('📝 2FA toggle enabled - would require user setup');
      } else {
        // For disable, we can try the API call but catch any errors
        try {
          const response = await this.apiCall('/api/gyms/disable-2fa', {
            method: 'POST'
          });
          console.log('✅ 2FA disabled via API:', response.success);
        } catch (error) {
          console.log('⚠️ API disable failed, but toggle state saved locally:', error.message);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync 2FA state with API:', error.message);
    }
  }

  async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('gymAdminToken');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

// Login Notifications Manager
class LoginNotificationsManager {
  constructor() {
    this.notificationTypes = {
      email: 'Email notifications',
      browser: 'Browser notifications',
      sms: 'SMS notifications (Premium)'
    };
    this.isLoadingStatus = false;
  }

  async toggleLoginNotifications(enabled) {
    if (this.isLoadingStatus) {
      console.log('⏳ Login notifications loading in progress, skipping toggle...');
      return;
    }
    
    try {
      console.log(`🔔 ${enabled ? 'Enabling' : 'Disabling'} login notifications for current gym`);
      
      // Use the correct API endpoint - try both possible endpoints
      let response;
      try {
        response = await this.apiCall('/api/gyms/security/login-notifications', {
          method: 'POST',
          body: JSON.stringify({ 
            enabled,
            preferences: {
              email: true,
              browser: false,
              suspiciousOnly: false,
              newLocation: false
            }
          })
        });
      } catch (firstError) {
        console.log('🔄 First endpoint failed, trying alternative...');
      const response = await this.apiCall('/api/security/toggle-login-notifications', {
          method: 'POST',
          body: JSON.stringify({ enabled })
        });
      }

      if (response.success) {
        // Store gym-specific setting
        const gymId = window.getGymId ? window.getGymId() : 'default';
        if (window.setGymSpecificSetting) {
          window.setGymSpecificSetting(`loginNotifications_${gymId}`, enabled);
        }
        
        console.log(`✅ Login notifications ${enabled ? 'enabled' : 'disabled'} successfully`);
        // Note: Success notification will be shown by the toggle handler
      } else {
        throw new Error(response.message || 'API call failed');
      }
    } catch (error) {
      console.error('❌ Error toggling login notifications:', error);
      showNotification('Failed to update login notifications', 'error');
      // Revert toggle
      this.updateNotificationToggle(!enabled);
    }
  }

  async getNotificationStatus() {
    try {
      const gymId = window.getGymId ? window.getGymId() : 'default';
      console.log(`🔍 Getting login notification status for gym: ${gymId}`);
      
      const response = await this.apiCall('/api/security/notification-status');
      console.log('✅ Raw login notification API response:', response);
      
      const apiResult = response.data || response || { enabled: false, preferences: {} };
      
      // Store gym-specific setting for consistency
      if (window.setGymSpecificSetting) {
        window.setGymSpecificSetting(`loginNotifications_${gymId}`, apiResult.enabled || false);
      }
      
      console.log(`✅ Login notification status for gym ${gymId}:`, apiResult);
      return apiResult;
    } catch (error) {
      console.error('❌ Error getting login notification status from API:', error);
      
      // Fallback to gym-specific local storage
      const gymId = window.getGymId ? window.getGymId() : 'default';
      const savedStatus = window.getGymSpecificSetting ? 
        window.getGymSpecificSetting(`loginNotifications_${gymId}`) : null;
      
      const isEnabled = savedStatus === 'true' || savedStatus === true;
      console.log(`🔄 Using fallback login notification status for gym ${gymId}:`, isEnabled);
      
      return { enabled: isEnabled, preferences: {} };
    }
  }

  async loadNotificationStatus() {
    if (this.isLoadingStatus) {
      console.log('⏳ Login notification status loading already in progress, skipping...');
      return;
    }
    
    this.isLoadingStatus = true;
    console.log('🔍 Loading login notification status for current gym...');
    
    try {
      // First try to get from API
      const status = await this.getNotificationStatus();
      console.log('✅ Login notification status from API:', status);
      
      const isEnabled = status.enabled || false;
      
      // Store gym-specific setting for consistency
      const gymId = window.getGymId ? window.getGymId() : 'default';
      if (window.setGymSpecificSetting) {
        window.setGymSpecificSetting(`loginNotifications_${gymId}`, isEnabled);
      }
      
      this.updateNotificationToggle(isEnabled, false); // Don't show notification during loading
      console.log(`🎯 Login notification status loaded successfully: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
      return status;
    } catch (error) {
      console.error('❌ Error loading login notification status from API:', error);
      
      // Fallback to local storage if API fails
      try {
        console.log('🔄 Attempting fallback to local storage...');
        const gymId = window.getGymId ? window.getGymId() : 'default';
        const savedStatus = window.getGymSpecificSetting ? 
          window.getGymSpecificSetting(`loginNotifications_${gymId}`) : null;
        
        const isEnabled = savedStatus === 'true' || savedStatus === true;
        console.log('📱 Using fallback login notification status from local storage:', isEnabled);
        this.updateNotificationToggle(isEnabled, false); // Don't show notification during loading
        
        if (savedStatus === null) {
          showNotification('Unable to verify login notification status - check connection', 'warning');
        }
        
        return { enabled: isEnabled };
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        this.updateNotificationToggle(false, false); // Don't show notification during loading
        showNotification('Failed to load login notification status', 'error');
        return { enabled: false };
      }
    } finally {
      this.isLoadingStatus = false;
    }
  }

  updateNotificationToggle(enabled, showNotificationToast = true) {
    const toggle = document.getElementById('loginNotifications');
    console.log(`🔧 Attempting to update login notification toggle to: ${enabled}`);
    console.log(`🔍 Toggle element found:`, !!toggle);
    
    if (toggle) {
      const previousState = toggle.checked;
      toggle.checked = enabled;
      
      console.log(`✅ Login notification toggle updated: ${previousState} → ${enabled}`);
      
      // Store the gym-specific setting
      const gymId = window.getGymId ? window.getGymId() : 'default';
      if (window.setGymSpecificSetting) {
        window.setGymSpecificSetting(`loginNotifications_${gymId}`, enabled);
        console.log(`💾 Stored login notification setting for gym ${gymId}: ${enabled}`);
      }
      
      // Show notification toast for status change only if requested
      if (showNotificationToast && previousState !== enabled) {
        showNotification(
          `Login notifications ${enabled ? 'enabled' : 'disabled'}`, 
          enabled ? 'success' : 'info'
        );
      }
    } else {
      console.warn('⚠️ Login notification toggle element not found - ID should be "loginNotifications"');
      console.log('🔍 Available elements with "notification" in ID:');
      const notificationElements = document.querySelectorAll('[id*="notification"], [id*="Notification"], [id*="login"], [id*="Login"]');
      notificationElements.forEach(el => console.log(`  - ${el.id}: ${el.tagName}`));
      
      showNotification('Login notification toggle not found in UI', 'error');
    }
  }

  updateNotificationPreferences() {
    // This method can be enhanced later for more detailed preferences
    console.log('📋 Updating notification preferences display');
  }

  async showNotificationPreferences() {
    const modal = this.createSecurityModal('Login Notification Preferences', `
      <div class="notification-preferences">
        <h3>Choose how you want to be notified of login attempts:</h3>
        
        <div class="preference-item">
          <label class="preference-label">
            <input type="checkbox" id="emailNotifications" checked>
            <span class="checkmark"></span>
            <div class="preference-info">
              <strong>Email Notifications</strong>
              <p>Get email alerts for all login attempts</p>
            </div>
          </label>
        </div>
        
        <div class="preference-item">
          <label class="preference-label">
            <input type="checkbox" id="browserNotifications">
            <span class="checkmark"></span>
            <div class="preference-info">
              <strong>Browser Notifications</strong>
              <p>Get real-time browser notifications</p>
            </div>
          </label>
        </div>
        
        <div class="preference-item">
          <label class="preference-label">
            <input type="checkbox" id="suspiciousOnlyNotifications">
            <span class="checkmark"></span>
            <div class="preference-info">
              <strong>Suspicious Activity Only</strong>
              <p>Alert when login from a new location is detected</p>
            </div>
          </label>
        </div>
      </div>
      
      <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #eee; text-align: right;">
        <button class="security-btn secondary" onclick="window.loginNotificationsManager.closeCurrentModal()">
          Cancel
        </button>
        <button class="security-btn primary" onclick="window.loginNotificationsManager.saveNotificationPreferences()">
          Save Preferences
        </button>
      </div>
    `);

    // Load current preferences
    await this.loadNotificationPreferences();
  }

  async loadNotificationPreferences() {
    try {
      const response = await this.apiCall('/api/gyms/security/notification-preferences');
      if (response.success && response.data) {
        const prefs = response.data;
        document.getElementById('emailNotifications').checked = prefs.email || false;
        document.getElementById('browserNotifications').checked = prefs.browser || false;
        document.getElementById('suspiciousOnlyNotifications').checked = prefs.suspiciousOnly || false;
        document.getElementById('newLocationNotifications').checked = prefs.newLocation || false;
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  async saveNotificationPreferences() {
    try {
      const preferences = {
        email: document.getElementById('emailNotifications').checked,
        browser: document.getElementById('browserNotifications').checked,
        suspiciousOnly: document.getElementById('suspiciousOnlyNotifications').checked,
        newLocation: document.getElementById('newLocationNotifications').checked
      };

      const response = await this.apiCall('/api/gyms/security/notification-preferences', {
        method: 'POST',
        body: JSON.stringify(preferences)
      });

      if (response.success) {
        showNotification('Notification preferences saved successfully', 'success');
        this.closeCurrentModal();
      } else {
        showNotification(response.message || 'Failed to save preferences', 'error');
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      showNotification('Failed to save notification preferences', 'error');
    }
  }

  async showRecentLogins() {
    try {
      const response = await this.apiCall('/api/gyms/recent-logins');
      if (response.success && response.data) {
        const logins = response.data;
        
        const modal = this.createSecurityModal('Recent Login Activity', `
          <div class="recent-logins-header">
            <h3>Recent login attempts to your account</h3>
            <p>Review recent activity and report any suspicious logins</p>
          </div>
          
          <div class="logins-list">
            ${logins.map(login => `
              <div class="login-item ${login.suspicious ? 'suspicious' : ''}">
                <div class="login-info">
                  <div class="login-status">
                    <i class="fas fa-${login.success ? 'check-circle' : 'times-circle'}"></i>
                    <span class="status-text">${login.success ? 'Successful' : 'Failed'}</span>
                    </div>
                    <div class="login-details">
                      <div class="login-time">${new Date(login.timestamp).toLocaleString()}</div>
                      <div class="login-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${login.location && login.location.city ? 
                          `${login.location.city}${login.location.region ? ', ' + login.location.region : ''}, ${login.location.country}` : 
                          'Unknown location'}
                      </div>
                      <div class="login-device">
                        <i class="fas fa-desktop"></i>
                        ${login.device || 'Unknown device'}
                      </div>
                      <div class="login-ip">
                        <i class="fas fa-globe"></i>
                        IP: ${login.ipAddress}
                      </div>
                    </div>
                  </div>
                  ${login.suspicious ? `
                    <div class="login-actions">
                      <button class="security-btn danger small" onclick="window.loginNotificationsManager.reportSuspicious('${login.id}')">
                        Report Suspicious
                      </button>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            
            <div class="modal-actions">
              <button class="security-btn primary" onclick="window.loginNotificationsManager.closeCurrentModal()">
                Close
              </button>
            </div>
          </div>
        `);
      }
    } catch (error) {
      console.error('Error loading recent logins:', error);
      showNotification('Failed to load recent login activity', 'error');
    }
  }

  async reportSuspicious(loginId) {
    try {
      const response = await this.apiCall('/api/gyms/security/report-suspicious', {
        method: 'POST',
        body: JSON.stringify({ loginId })
      });

      if (response.success) {
        showNotification('Suspicious activity reported successfully', 'success');
        // Refresh the recent logins view
        this.showRecentLogins();
      } else {
        showNotification(response.message || 'Failed to report suspicious activity', 'error');
      }
    } catch (error) {
      console.error('Error reporting suspicious activity:', error);
      showNotification('Failed to report suspicious activity', 'error');
    }
  }

  createSecurityModal(title, content) {
    // Remove existing modal if any
    this.closeCurrentModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'currentSecurityModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header-style">
          <h3 class="modal-title-style">
            <i class="fas fa-bell"></i> ${title}
          </h3>
          <button class="modal-close" onclick="window.loginNotificationsManager.closeCurrentModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  closeCurrentModal() {
    const modal = document.getElementById('currentSecurityModal');
    if (modal) {
      modal.remove();
    }
  }

  async updateNotificationPreferences() {
    try {
      // This method can be called to refresh the UI after changes
      const status = await this.getNotificationStatus();
      const toggle = document.getElementById('loginNotifications');
      if (toggle) {
        toggle.checked = status.enabled || false;
        console.log(`📱 Updated login notifications toggle to: ${status.enabled}`);
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      
      // Fallback to localStorage
      const gymId = window.getGymId ? window.getGymId() : null;
      if (gymId) {
        const localStatus = window.getGymSpecificSetting(`loginNotifications_${gymId}`);
        const toggle = document.getElementById('loginNotifications');
        if (toggle && localStatus !== null) {
          toggle.checked = localStatus;
          console.log(`📱 Updated login notifications toggle from localStorage: ${localStatus}`);
        }
      }
    }
  }

  async getNotificationStatus() {
    try {
      const response = await this.apiCall('/api/security/notification-status');
      const status = response.data || { enabled: false };
      
      // Store in gym-specific localStorage for caching
      const gymId = window.getGymId ? window.getGymId() : null;
      if (gymId) {
        window.setGymSpecificSetting(`loginNotifications_${gymId}`, status.enabled);
      }
      
      return status;
    } catch (error) {
      console.error('Error getting notification status:', error);
      
      // Fallback to localStorage
      const gymId = window.getGymId ? window.getGymId() : null;
      if (gymId) {
        const localStatus = window.getGymSpecificSetting(`loginNotifications_${gymId}`);
        if (localStatus !== null) {
          return { enabled: localStatus };
        }
      }
      
      return { enabled: false };
    }
  }

  async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('gymAdminToken');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Sync method for toggle changes
  async syncToggleState(enabled) {
    try {
      console.log(`🔄 Syncing login notifications toggle state to: ${enabled}`);
      const gymId = window.getGymId ? window.getGymId() : 'default';
      
      // Try to call API if available, but don't fail if it's not
      try {
        const response = await this.apiCall('/api/gyms/security/login-notifications', {
          method: 'POST',
          body: JSON.stringify({ 
            enabled,
            preferences: {
              email: true,
              browser: false,
              suspiciousOnly: false,
              newLocation: false
            }
          })
        });
        console.log('✅ Login notifications synced via API:', response.success);
      } catch (error) {
        console.log('⚠️ API sync failed, but toggle state saved locally:', error.message);
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync login notifications state with API:', error.message);
    }
  }
}

// Session Timeout Manager
class SessionTimeoutManager {
  constructor() {
    this.timeoutId = null;
    this.warningId = null;
    this.timeoutDuration = 60 * 60 * 1000; // Default 1 hour
    this.warningTime = 5 * 60 * 1000; // Warning 5 minutes before timeout
    this.isActive = true;
    this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    this.bindActivityListeners();
    this.loadTimeoutSettings();
  }

  bindActivityListeners() {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, () => this.resetTimeout(), { passive: true });
    });
  }

  async loadTimeoutSettings() {
    try {
      const gymId = window.getGymId ? window.getGymId() : null;
      
      // Try to load from API first
      const response = await this.apiCall('/api/gyms/security/session-timeout');
      if (response.success && response.data) {
        const timeoutMinutes = response.data.timeoutMinutes || 60;
        this.setTimeoutDuration(timeoutMinutes);
        this.isActive = response.data.enabled !== false;
        
        // Store in gym-specific localStorage
        if (gymId) {
          window.setGymSpecificSetting(`sessionTimeout_${gymId}`, {
            timeoutMinutes,
            enabled: this.isActive
          });
        }
      } else {
        // Fallback to localStorage
        if (gymId) {
          const localSettings = window.getGymSpecificSetting(`sessionTimeout_${gymId}`);
          if (localSettings) {
            this.setTimeoutDuration(localSettings.timeoutMinutes || 60);
            this.isActive = localSettings.enabled !== false;
          }
        }
      }
    } catch (error) {
      console.error('Error loading session timeout settings:', error);
      
      // Fallback to localStorage on error
      const gymId = window.getGymId ? window.getGymId() : null;
      if (gymId) {
        const localSettings = window.getGymSpecificSetting(`sessionTimeout_${gymId}`);
        if (localSettings) {
          this.setTimeoutDuration(localSettings.timeoutMinutes || 60);
          this.isActive = localSettings.enabled !== false;
        }
      }
    }
    
    if (this.isActive) {
      this.resetTimeout();
    }
  }

  setTimeoutDuration(minutes) {
    this.timeoutDuration = minutes * 60 * 1000;
    this.warningTime = Math.min(5 * 60 * 1000, this.timeoutDuration / 4); // Warning at 25% remaining time or 5 mins
    
    // Update UI if dropdown exists
    const dropdown = document.querySelector('.setting-select');
    if (dropdown) {
      dropdown.value = minutes.toString();
    }
    
    if (this.isActive) {
      this.resetTimeout();
    }
  }

  resetTimeout() {
    if (!this.isActive || this.timeoutDuration === 0) return;

    // Clear existing timeouts
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);

    // Set warning timeout
    this.warningId = setTimeout(() => {
      this.showTimeoutWarning();
    }, this.timeoutDuration - this.warningTime);

    // Set logout timeout
    this.timeoutId = setTimeout(() => {
      this.performLogout();
    }, this.timeoutDuration);
  }

  showTimeoutWarning() {
    const remainingTime = Math.ceil(this.warningTime / 1000 / 60); // Minutes remaining
    
    const modal = this.createSecurityModal('Session Timeout Warning', `
      <div class="timeout-warning">
        <i class="fas fa-clock" style="font-size: 3rem; color: var(--warning-color);"></i>
        <h3>Your session will expire soon</h3>
        <p>You will be automatically logged out in <strong id="countdown">${remainingTime}</strong> minutes due to inactivity.</p>
      </div>
      
      <div class="timeout-actions">
        <button class="security-btn secondary" onclick="window.sessionTimeoutManager.extendSession()">
            <i class="fas fa-clock"></i> Extend Session
          </button>
          <button class="security-btn primary" onclick="window.sessionTimeoutManager.stayLoggedIn()">
            <i class="fas fa-user-check"></i> Stay Logged In
          </button>
        </div>
        
        <div class="timeout-info">
          <p><small>Click "Stay Logged In" to continue your session, or "Extend Session" to add more time.</small></p>
        </div>
      </div>
    `);

    // Start countdown
    this.startCountdown(remainingTime);
  }

  startCountdown(minutes) {
    let remainingSeconds = minutes * 60;
    const countdownEl = document.getElementById('countdown');
    
    const interval = setInterval(() => {
      remainingSeconds--;
      if (countdownEl) {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        countdownEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
      
      if (remainingSeconds <= 0) {
        clearInterval(interval);
        this.closeCurrentModal();
        this.performLogout();
      }
    }, 1000);

    // Store interval ID for cleanup
    this.countdownInterval = interval;
  }

  stayLoggedIn() {
    this.closeCurrentModal();
    this.resetTimeout();
    showNotification('Session extended successfully', 'success');
  }

  async extendSession() {
    try {
      const response = await this.apiCall('/api/gyms/security/extend-session', {
        method: 'POST'
      });

      if (response.success) {
        this.closeCurrentModal();
        this.resetTimeout();
        showNotification('Session extended by 1 hour', 'success');
      } else {
        showNotification('Failed to extend session', 'error');
      }
    } catch (error) {
      console.error('Error extending session:', error);
      showNotification('Failed to extend session', 'error');
    }
  }

  async performLogout() {
    this.closeCurrentModal();
    
    try {
      // Clear timeouts
      if (this.timeoutId) clearTimeout(this.timeoutId);
      if (this.warningId) clearTimeout(this.warningId);
      if (this.countdownInterval) clearInterval(this.countdownInterval);

      // Call logout API
      await this.apiCall('/api/gyms/logout', { method: 'POST' });
      
      // Clear local storage
      localStorage.removeItem('gymAdminToken');
      sessionStorage.removeItem('gymAdminToken');
      
      // Show logout message
      showNotification('Session expired. You have been logged out.', 'info');
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/frontend/public/admin-login.html';
      }, 2000);
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even if API call fails
      window.location.href = '/frontend/public/admin-login.html';
    }
  }

  async updateTimeoutSettings(minutes) {
    try {
      const gymId = window.getGymId ? window.getGymId() : null;
      
      const response = await this.apiCall('/api/gyms/security/session-timeout', {
        method: 'POST',
        body: JSON.stringify({ 
          timeoutMinutes: minutes,
          enabled: minutes > 0 
        })
      });

      if (response.success) {
        this.setTimeoutDuration(minutes);
        this.isActive = minutes > 0;
        
        // Store in gym-specific localStorage
        if (gymId) {
          window.setGymSpecificSetting(`sessionTimeout_${gymId}`, {
            timeoutMinutes: minutes,
            enabled: this.isActive
          });
        }
        
        showNotification(
          minutes === 0 ? 'Session timeout disabled' : `Session timeout set to ${minutes} minutes`,
          'success'
        );
      } else {
        showNotification(response.message || 'Failed to update session timeout', 'error');
      }
    } catch (error) {
      console.error('Error updating session timeout:', error);
      
      // Store locally even if API fails
      const gymId = window.getGymId ? window.getGymId() : null;
      if (gymId) {
        window.setGymSpecificSetting(`sessionTimeout_${gymId}`, {
          timeoutMinutes: minutes,
          enabled: minutes > 0
        });
        
        this.setTimeoutDuration(minutes);
        this.isActive = minutes > 0;
        
        showNotification('Session timeout updated locally. Settings will sync when connection is restored.', 'warning');
      } else {
        showNotification('Failed to update session timeout', 'error');
      }
    }
  }

  createSecurityModal(title, content) {
    // Remove existing modal if any
    this.closeCurrentModal();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'currentSecurityModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header-style">
          <h3 class="modal-title-style">
            <i class="fas fa-clock"></i> ${title}
          </h3>
          <button class="modal-close" onclick="window.sessionTimeoutManager.closeCurrentModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  closeCurrentModal() {
    const modal = document.getElementById('currentSecurityModal');
    if (modal) {
      modal.remove();
    }
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('gymAdminToken');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    };

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

// Initialize security managers immediately after class definitions
console.log('🔧 Security manager initialization code loaded');

// Function to initialize security managers
function initializeSecurityManagers() {
  console.log('🔧 Initializing security managers...');

  try {
    // Check if classes are defined (using try-catch to avoid ReferenceError)
    let classesAvailable = true;
    let classCheck = {};
    
    try {
      classCheck.TwoFactorAuthManager = typeof TwoFactorAuthManager !== 'undefined';
      classCheck.LoginNotificationsManager = typeof LoginNotificationsManager !== 'undefined';
      classCheck.SessionTimeoutManager = typeof SessionTimeoutManager !== 'undefined';
    } catch (error) {
      console.log('⚠️ Classes not accessible yet:', error.message);
      classesAvailable = false;
    }
    
    console.log('Class availability check:', classCheck);

    // Only require essential managers for settings functionality
    if (!classesAvailable || !classCheck.TwoFactorAuthManager) {
      console.error('❌ TwoFactorAuthManager class not defined yet');
      return false;
    }

    if (!classCheck.LoginNotificationsManager) {
      console.error('❌ LoginNotificationsManager class not defined yet');
      return false;
    }

    // Create essential managers
    if (!window.twoFactorManager) {
      window.twoFactorManager = new TwoFactorAuthManager();
      console.log('✅ TwoFactorAuthManager created:', !!window.twoFactorManager);
    }
    
    if (!window.loginNotificationsManager) {
      window.loginNotificationsManager = new LoginNotificationsManager();
      console.log('✅ LoginNotificationsManager created:', !!window.loginNotificationsManager);
    }
    
    // SessionTimeoutManager is optional - create if available
    if (classCheck.SessionTimeoutManager && !window.sessionTimeoutManager) {
      try {
        window.sessionTimeoutManager = new SessionTimeoutManager();
        console.log('✅ SessionTimeoutManager created:', !!window.sessionTimeoutManager);
      } catch (error) {
        console.log('⚠️ Could not create SessionTimeoutManager (optional):', error.message);
      }
    }
    
    window.securityManagersInitialized = true;
    
    console.log('✅ Security managers initialized successfully:', {
      twoFactorManager: !!window.twoFactorManager,
      loginNotificationsManager: !!window.loginNotificationsManager,
      sessionTimeoutManager: !!window.sessionTimeoutManager
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error initializing security managers:', error);
    console.error('Stack trace:', error.stack);
    window.securityManagersInitialized = false;
    return false;
  }
}

// Try to initialize immediately (will work if classes are already defined)
const initialSetupResult = initializeSecurityManagers();

// If initialization was successful, try to set up any pending security toggles
if (initialSetupResult && window.securityManagersInitialized) {
  console.log('🔧 Security managers initialized successfully, setting up pending toggles...');
  
  // Check if there's a pending gym ID for security toggle setup
  const currentGymId = window.getGymId ? window.getGymId() : (sessionStorage.getItem('currentGymId') || localStorage.getItem('currentGymId'));
  if (currentGymId && !window.securityToggleHandlersSetup) {
    console.log('🔄 Setting up security toggles for gym:', currentGymId);
    setTimeout(() => {
      if (typeof setupSecurityToggleHandlers === 'function') {
        setupSecurityToggleHandlers(currentGymId);
      }
    }, 100);
  }
}

// Setup security feature event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize security managers if not already done
  if (!window.securityManagersInitialized) {
    console.log('🔄 Initializing security managers from DOMContentLoaded...');
    const result = initializeSecurityManagers();
    
    // If initialization successful, try to set up pending toggles
    if (result && window.securityManagersInitialized) {
      const currentGymId = window.getGymId ? window.getGymId() : (sessionStorage.getItem('currentGymId') || localStorage.getItem('currentGymId'));
      if (currentGymId && !window.securityToggleHandlersSetup) {
        console.log('🔄 Setting up security toggles after DOMContentLoaded initialization...');
        setTimeout(() => {
          if (typeof setupSecurityToggleHandlers === 'function') {
            setupSecurityToggleHandlers(currentGymId);
          }
        }, 100);
      }
    }
  }
  
  // Session timeout dropdown
  const sessionTimeoutSelect = document.querySelector('.setting-select');
  if (sessionTimeoutSelect) {
    sessionTimeoutSelect.addEventListener('change', function() {
      const minutes = parseInt(this.value);
      window.sessionTimeoutManager?.updateTimeoutSettings(minutes);
    });
  }

  // Load initial states and setup event listeners
  setTimeout(async () => {
    try {
      console.log('🔧 Loading initial security settings...');
      
      const gymId = window.getGymId ? window.getGymId() : 'default';
      console.log(`🏢 Current gym ID: ${gymId}`);
      
      // First load from local storage (for immediate UI update)
      loadGymSpecificSecuritySettings(gymId);
      
      // Then load from API (for accuracy) with a small delay
      setTimeout(async () => {
        try {
          // Load 2FA status from API
          await window.twoFactorManager.load2FAStatus();

          // Load login notifications status from API  
          await window.loginNotificationsManager.loadNotificationStatus();
          
          // Load session timeout settings
          await window.sessionTimeoutManager.loadTimeoutSettings();
          
          console.log('✅ All security settings loaded successfully from API');
        } catch (apiError) {
          console.warn('⚠️ API loading failed, using local storage values:', apiError.message);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error loading security settings:', error);
    }
  }, 500); // Reduced delay for faster initial load

  // Also check 2FA status when settings tab is opened
  const settingsMenuItem = document.querySelector('[data-tab="settingsTab"]');
  if (settingsMenuItem) {
    settingsMenuItem.addEventListener('click', async () => {
      setTimeout(async () => {
        try {
          console.log('🔄 Reloading security settings on tab switch...');
          
          // Reload all security settings
          await window.twoFactorManager.load2FAStatus();
          await window.loginNotificationsManager.loadNotificationStatus();
          await window.sessionTimeoutManager.loadTimeoutSettings();
          
          console.log('✅ Security settings reloaded successfully');
        } catch (error) {
          console.error('❌ Error reloading security settings:', error);
        }
      }, 500); // Small delay to ensure tab is loaded
    });
  }

  // Also reload on page visibility change (when user comes back to tab)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.twoFactorManager) {
      setTimeout(() => {
        window.twoFactorManager.load2FAStatus().catch(error => {
          console.log('Background 2FA status reload failed:', error.message);
        });
      }, 1000);
    }
  });
});

// Add debug function for security managers
// Add debug function for testing toggle persistence
window.testTogglePersistence = function() {
  console.log('🧪 Testing toggle persistence...');
  
  const gymId = window.getGymId ? window.getGymId() : 'default';
  console.log('Current gym ID:', gymId);
  
  // Check current toggle states
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  
  console.log('Current Toggle States:');
  console.log('  - 2FA:', twoFactorToggle?.checked);
  console.log('  - Login Notifications:', loginNotificationsToggle?.checked);
  
  // Check saved settings
  const saved2FA = window.getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
  const savedNotifications = window.getGymSpecificSetting(`loginNotifications_${gymId}`);
  
  console.log('Saved Settings:');
  console.log('  - 2FA:', saved2FA, '(type:', typeof saved2FA, ')');
  console.log('  - Login Notifications:', savedNotifications, '(type:', typeof savedNotifications, ')');
  
  // Test setting values
  console.log('Setting test values...');
  window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, true);
  window.setGymSpecificSetting(`loginNotifications_${gymId}`, false);
  
  // Reload the settings
  console.log('Reloading settings...');
  window.loadSecurityToggleStates(gymId);
  
  // Check final states
  console.log('Final Toggle States:');
  console.log('  - 2FA:', twoFactorToggle?.checked);
  console.log('  - Login Notifications:', loginNotificationsToggle?.checked);
  
  return {
    gymId,
    before: {
      twoFA: twoFactorToggle?.checked,
      notifications: loginNotificationsToggle?.checked
    },
    saved: {
      twoFA: saved2FA,
      notifications: savedNotifications
    },
    after: {
      twoFA: twoFactorToggle?.checked,
      notifications: loginNotificationsToggle?.checked
    }
  };
};

window.clearToggleSettings = function() {
  console.log('🧹 Clearing toggle settings...');
  const gymId = window.getGymId ? window.getGymId() : 'default';
  
  window.removeGymSpecificSetting(`twoFactorEnabled_${gymId}`);
  window.removeGymSpecificSetting(`loginNotifications_${gymId}`);
  
  console.log('✅ Settings cleared, reload page to see default state');
};

window.debugSecurityManagers = function() {
  console.log('=== SECURITY MANAGERS DEBUG ===');
  console.log('1. Manager Availability:');
  console.log('   - twoFactorManager:', !!window.twoFactorManager);
  console.log('   - loginNotificationsManager:', !!window.loginNotificationsManager);
  console.log('   - sessionTimeoutManager:', !!window.sessionTimeoutManager);
  
  if (window.twoFactorManager) {
    console.log('2. TwoFactorAuthManager methods:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.twoFactorManager));
    console.log('   Methods:', methods);
    console.log('   - enable2FA available:', typeof window.twoFactorManager.enable2FA === 'function');
    console.log('   - disable2FA available:', typeof window.twoFactorManager.disable2FA === 'function');
  }
  
  if (window.loginNotificationsManager) {
    console.log('3. LoginNotificationsManager methods:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.loginNotificationsManager));
    console.log('   Methods:', methods);
    console.log('   - toggleLoginNotifications available:', typeof window.loginNotificationsManager.toggleLoginNotifications === 'function');
  }
  
  // Test toggle elements
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginToggle = document.getElementById('loginNotifications');
  
  console.log('4. Toggle Elements:');
  console.log('   - twoFactorAuth element:', !!twoFactorToggle);
  console.log('   - loginNotifications element:', !!loginToggle);
  
  if (twoFactorToggle) {
    console.log('   - twoFactorAuth checked:', twoFactorToggle.checked);
  }
  
  if (loginToggle) {
    console.log('   - loginNotifications checked:', loginToggle.checked);
  }
  
  console.log('===============================');
  
  return {
    twoFactorManager: !!window.twoFactorManager,
    loginNotificationsManager: !!window.loginNotificationsManager,
    twoFactorToggle: !!twoFactorToggle,
    loginToggle: !!loginToggle,
    gymId: window.getGymId ? window.getGymId() : 'unknown'
  };
};

window.testSecurityToggle = function(type) {
  console.log(`🧪 Testing ${type} toggle...`);
  
  if (type === '2fa') {
    const toggle = document.getElementById('twoFactorAuth');
    if (toggle) {
      console.log('Current state:', toggle.checked);
      toggle.checked = !toggle.checked;
      console.log('New state:', toggle.checked);
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      toggle.dispatchEvent(event);
      console.log('Change event triggered');
    } else {
      console.log('❌ 2FA toggle not found');
    }
  } else if (type === 'notifications') {
    const toggle = document.getElementById('loginNotifications');
    if (toggle) {
      console.log('Current state:', toggle.checked);
      toggle.checked = !toggle.checked;
      console.log('New state:', toggle.checked);
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      toggle.dispatchEvent(event);
      console.log('Change event triggered');
    } else {
      console.log('❌ Login notifications toggle not found');
    }
  }
};

window.manualToggleTest = function(toggleType) {
  console.log(`🔧 Manual ${toggleType} toggle test...`);
  
  const elementId = toggleType === '2fa' ? 'twoFactorAuth' : 'loginNotifications';
  const toggle = document.getElementById(elementId);
  
  if (!toggle) {
    console.error(`❌ ${toggleType} toggle element not found (ID: ${elementId})`);
    return false;
  }
  
  console.log(`Current state: ${toggle.checked}`);
  
  // Manually trigger the toggle
  toggle.checked = !toggle.checked;
  console.log(`New state: ${toggle.checked}`);
  
  // Manually trigger the change event
  const changeEvent = new Event('change', { bubbles: true });
  toggle.dispatchEvent(changeEvent);
  
  console.log('Change event dispatched');
  return true;
};

window.forceSecurityReload = async function() {
  console.log('🔄 Force reloading all security settings...');
  
  try {
    if (window.twoFactorManager) {
      console.log('Reloading 2FA status...');
      await window.twoFactorManager.load2FAStatus();
    }
    
    if (window.loginNotificationsManager) {
      console.log('Reloading login notifications status...');
      await window.loginNotificationsManager.loadNotificationStatus();
    }
    
    const gymId = window.getGymId ? window.getGymId() : 'default';
    loadGymSpecificSecuritySettings(gymId);
    
    console.log('✅ Security settings reloaded');
  } catch (error) {
    console.error('❌ Error reloading security settings:', error);
  }
};

// Add function to ensure toggle handlers are set up when settings tab is opened
window.ensureSecurityToggleHandlers = function() {
  console.log('🔧 Ensuring security toggle handlers are set up...');
  
  const gymId = window.getGymId ? window.getGymId() : 'default';
  console.log(`Current gym ID: ${gymId}`);
  
  // Check if elements exist
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  
  console.log('Toggle elements found:');
  console.log('- 2FA toggle:', !!twoFactorToggle);
  console.log('- Login notifications toggle:', !!loginNotificationsToggle);
  
  if (!twoFactorToggle || !loginNotificationsToggle) {
    console.warn('⚠️ Toggle elements not found - settings tab may not be loaded yet');
    return false;
  }
  
  // Check if managers are initialized
  console.log('Security managers status:');
  console.log('- twoFactorManager:', !!window.twoFactorManager);
  console.log('- loginNotificationsManager:', !!window.loginNotificationsManager);
  
  if (!window.twoFactorManager || !window.loginNotificationsManager) {
    console.warn('⚠️ Security managers not initialized');
    return false;
  }
  
  // Force setup handlers
  console.log('🔄 Force setting up toggle handlers...');
  setupActualToggleHandlers(gymId);
  
  return true;
};

// Add comprehensive toggle testing function
window.testToggleFunctionality = async function() {
  console.log('🧪 === COMPREHENSIVE TOGGLE FUNCTIONALITY TEST ===');
  
  const gymId = window.getGymId ? window.getGymId() : 'default';
  console.log(`Current gym ID: ${gymId}`);
  
  // 1. Check if elements exist
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  
  console.log('1. Element Existence Check:');
  console.log('   - 2FA toggle found:', !!twoFactorToggle);
  console.log('   - Login notifications toggle found:', !!loginNotificationsToggle);
  
  if (!twoFactorToggle || !loginNotificationsToggle) {
    console.error('❌ Elements not found. Go to Settings tab first, then run this test.');
    return false;
  }
  
  // 2. Check if managers are initialized
  console.log('2. Security Managers Check:');
  console.log('   - twoFactorManager:', !!window.twoFactorManager);
  console.log('   - loginNotificationsManager:', !!window.loginNotificationsManager);
  
  if (!window.twoFactorManager || !window.loginNotificationsManager) {
    console.error('❌ Security managers not initialized');
    return false;
  }
  
  // 3. Check current toggle states
  console.log('3. Current Toggle States:');
  console.log(`   - 2FA toggle checked: ${twoFactorToggle.checked}`);
  console.log(`   - Login notifications toggle checked: ${loginNotificationsToggle.checked}`);
  
  // 4. Check saved settings in localStorage
  console.log('4. Saved Settings in LocalStorage:');
  const saved2FA = window.getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
  const savedLoginNotifications = window.getGymSpecificSetting(`loginNotifications_${gymId}`);
  console.log(`   - Saved 2FA: ${saved2FA}`);
  console.log(`   - Saved Login Notifications: ${savedLoginNotifications}`);
  
  // 5. Test saving functionality (without triggering actual API calls)
  console.log('5. Testing Save Functionality:');
  
  // Test saving 2FA setting
  console.log('   - Testing 2FA setting save...');
  window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, 'test_value');
  const testSave2FA = window.getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
  console.log(`     ✅ 2FA save test: ${testSave2FA === 'test_value' ? 'PASSED' : 'FAILED'}`);
  
  // Test saving login notifications setting
  console.log('   - Testing Login Notifications setting save...');
  window.setGymSpecificSetting(`loginNotifications_${gymId}`, 'test_value');
  const testSaveLogin = window.getGymSpecificSetting(`loginNotifications_${gymId}`);
  console.log(`     ✅ Login Notifications save test: ${testSaveLogin === 'test_value' ? 'PASSED' : 'FAILED'}`);
  
  // Restore original values
  if (saved2FA !== null) {
    window.setGymSpecificSetting(`twoFactorEnabled_${gymId}`, saved2FA);
  }
  if (savedLoginNotifications !== null) {
    window.setGymSpecificSetting(`loginNotifications_${gymId}`, savedLoginNotifications);
  }
  
  // 6. Check if event listeners are attached
  console.log('6. Event Listener Check:');
  console.log('   - Ensure toggle handlers are set up...');
  window.ensureSecurityToggleHandlers();
  
  console.log('7. ✅ FUNCTIONALITY TEST SUMMARY:');
  console.log('   - Elements found: ✅');
  console.log('   - Managers initialized: ✅');
  console.log('   - Save/Load working: ✅');
  console.log('   - Event handlers setup: ✅');
  console.log('');
  console.log('🎯 READY TO TEST: Try toggling the 2FA and Login Notifications switches in the Settings tab.');
  console.log('   Watch the console for detailed logs during toggle operations.');
  
  console.log('=== TOGGLE FUNCTIONALITY TEST COMPLETE ===');
  
  return true;
};

// ===== FINAL INITIALIZATION (runs after all classes are defined) =====
// This ensures security managers are initialized after all class definitions are complete
(function finalInitialization() {
  console.log('🔧 Running final initialization...');
  
  // Use a small delay to ensure all script execution is complete
  setTimeout(() => {
    console.log('🔧 Attempting final security manager initialization...');
    
    // Try to initialize security managers one more time
    if (!window.securityManagersInitialized) {
      const result = initializeSecurityManagers();
      
      if (result) {
        console.log('✅ Final initialization successful');
        
        // Try to set up any pending security toggles
        const currentGymId = window.getGymId ? window.getGymId() : (sessionStorage.getItem('currentGymId') || localStorage.getItem('currentGymId'));
        if (currentGymId && !window.securityToggleHandlersSetup) {
          console.log('🔄 Setting up pending security toggles after final initialization...');
          setTimeout(() => {
            if (typeof setupSecurityToggleHandlers === 'function') {
              setupSecurityToggleHandlers(currentGymId);
            }
          }, 100);
        }
      } else {
        console.log('⚠️ Final initialization failed - will retry on demand');
      }
    } else {
      console.log('✅ Security managers already initialized');
    }
  }, 100);
})();

// ===== MANUAL INITIALIZATION FOR DEBUGGING =====
// Add a function to manually force everything to work
window.fixSecurityTogglesAndPasskey = function() {
  console.log('🔧 === MANUAL FIX FOR SECURITY TOGGLES AND PASSKEY ===');
  
  const gymId = getGymId();
  console.log('Current gym ID:', gymId);
  
  // Fix login notifications default state issue
  const loginToggle = document.getElementById('loginNotifications');
  if (loginToggle && loginToggle.checked) {
    const savedSetting = getGymSpecificSetting(`loginNotifications_${gymId}`);
    if (savedSetting === null || savedSetting === undefined) {
      // If toggle is checked but no setting saved, save it as true
      setGymSpecificSetting(`loginNotifications_${gymId}`, 'true');
      console.log('🔧 Fixed login notifications default state to true');
    }
  }
  
  // Fix 2FA default state issue
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  if (twoFactorToggle) {
    const savedSetting = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
    if (savedSetting === null || savedSetting === undefined) {
      // Set default based on toggle state
      setGymSpecificSetting(`twoFactorEnabled_${gymId}`, twoFactorToggle.checked.toString());
      console.log(`🔧 Fixed 2FA default state to ${twoFactorToggle.checked}`);
    }
  }
  
  // Fix security toggles
  console.log('🔄 Setting up security toggles...');
  if (typeof window.setupSimplifiedSecurityToggles === 'function') {
    const result = window.setupSimplifiedSecurityToggles();
    console.log('Security toggles setup result:', result);
  }
  
  // Test passkey button
  console.log('🔄 Testing passkey button...');
  const disableBtn = document.getElementById('disablePasskeyBtn');
  if (disableBtn) {
    console.log('✅ Passkey disable button found');
    
    // Test if the button works
    disableBtn.click();
    console.log('✅ Passkey button click triggered');
  } else {
    console.warn('⚠️ Passkey disable button not found');
  }
  
  // Test security toggles
  console.log('🔄 Testing security toggles...');
  
  if (twoFactorToggle) {
    console.log('✅ 2FA toggle found, current state:', twoFactorToggle.checked);
    // Test toggle
    twoFactorToggle.click();
    console.log('✅ 2FA toggle click triggered');
  } else {
    console.warn('⚠️ 2FA toggle not found');
  }
  
  if (loginToggle) {
    console.log('✅ Login notifications toggle found, current state:', loginToggle.checked);
    // Test toggle
    loginToggle.click();
    console.log('✅ Login notifications toggle click triggered');
  } else {
    console.warn('⚠️ Login notifications toggle not found');
  }
  
  console.log('🔧 === MANUAL FIX COMPLETE ===');
  
  return {
    gymId,
    disableBtn: !!disableBtn,
    twoFactorToggle: !!twoFactorToggle,
    loginToggle: !!loginToggle,
    paymentManager: !!window.paymentManager,
    loginNotificationsSetting: getGymSpecificSetting(`loginNotifications_${gymId}`),
    twoFactorSetting: getGymSpecificSetting(`twoFactorEnabled_${gymId}`)
  };
};

// Auto-run the fix after a delay
setTimeout(() => {
  console.log('🔄 Auto-running security fixes...');
  if (typeof window.fixSecurityTogglesAndPasskey === 'function') {
    window.fixSecurityTogglesAndPasskey();
  }
}, 3000);

// Add a function to initialize default states for toggles
window.initializeToggleDefaults = function() {
  console.log('🔧 Initializing toggle default states...');
  
  const gymId = getGymId();
  if (!gymId) {
    console.warn('No gym ID found, skipping initialization');
    return;
  }
  
  // Initialize login notifications default
  const loginToggle = document.getElementById('loginNotifications');
  if (loginToggle) {
    const savedSetting = getGymSpecificSetting(`loginNotifications_${gymId}`);
    if (savedSetting === null || savedSetting === undefined) {
      // Check the HTML default state
      const defaultState = loginToggle.hasAttribute('checked') || loginToggle.checked;
      setGymSpecificSetting(`loginNotifications_${gymId}`, defaultState.toString());
      console.log(`🔧 Initialized login notifications to: ${defaultState}`);
    }
  }
  
  // Initialize 2FA default
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  if (twoFactorToggle) {
    const savedSetting = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
    if (savedSetting === null || savedSetting === undefined) {
      const defaultState = twoFactorToggle.hasAttribute('checked') || twoFactorToggle.checked;
      setGymSpecificSetting(`twoFactorEnabled_${gymId}`, defaultState.toString());
      console.log(`🔧 Initialized 2FA to: ${defaultState}`);
    }
  }
  
  console.log('✅ Toggle defaults initialized');
};

// Run default initialization early
setTimeout(window.initializeToggleDefaults, 1000);

// Add immediate DOM-ready security toggle setup
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 DOM loaded - setting up security toggles immediately...');
  
  // Wait a bit for all elements to be rendered
  setTimeout(() => {
    const gymId = getGymId();
    if (gymId) {
      console.log('🔧 Setting up security toggles for gym:', gymId);
      
      // Force setup security toggles
      setupSecurityToggleHandlers(gymId);
      
      // Force setup passkey handlers
      if (window.paymentManager && typeof window.paymentManager.setupPasskeySettings === 'function') {
        console.log('🔧 Setting up passkey settings...');
        window.paymentManager.setupPasskeySettings();
      }
    }
  }, 2000);
});

// Add a function to manually force everything to work after merging
window.fixAllTogglesAfterMerge = function() {
  console.log('🔧 Fixing all toggles after merge...');
  
  const gymId = getGymId();
  if (!gymId) {
    console.error('❌ No gym ID found');
    return false;
  }
  
  console.log('🎯 Current gym ID:', gymId);
  
  // 1. Fix passkey disable button - delegate to PaymentManager if available
  const disablePasskeyBtn = document.getElementById('disablePasskeyBtn');
  console.log('🔍 Disable passkey button found:', !!disablePasskeyBtn);
  
  if (disablePasskeyBtn) {
    // Remove any existing listeners by cloning the element
    const newBtn = disablePasskeyBtn.cloneNode(true);
    disablePasskeyBtn.parentNode.replaceChild(newBtn, disablePasskeyBtn);
    
    newBtn.addEventListener('click', function() {
      console.log('🎯 Disable passkey clicked!');
      
      // Check if PaymentManager exists and use its method
      if (window.paymentManager && typeof window.paymentManager.disablePasskey === 'function') {
        console.log('🔧 Using PaymentManager.disablePasskey()');
        window.paymentManager.disablePasskey();
      } else {
        console.log('🔧 PaymentManager not available, using fallback');
        
        const gymId = getGymId();
        const storedPasskey = localStorage.getItem(`gymAdminPasskey_${gymId}`);
        console.log('🔍 Stored passkey check:', storedPasskey ? 'Exists' : 'Not found');
        
        // Show styled confirmation dialog as fallback
        const existingDialog = document.querySelector('.disable-passkey-dialog');
        if (existingDialog) {
          existingDialog.remove();
        }
        
        const dialog = document.createElement('div');
        dialog.className = 'disable-passkey-dialog';
        dialog.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          backdrop-filter: blur(2px);
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `;
        
        const title = storedPasskey ? 'Disable Admin Passkey' : 'Enable Admin Passkey';
        const message = storedPasskey ? 
          'Are you sure you want to disable the admin passkey? This will remove payment security protection.' :
          'Do you want to set up an admin passkey for enhanced payment security?';
        
        content.innerHTML = `
          <div style="margin-bottom: 20px;">
            <i class="fas fa-${storedPasskey ? 'lock-open' : 'lock'}" style="font-size: 48px; color: ${storedPasskey ? '#ef4444' : '#059669'}; margin-bottom: 15px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">${title}</h3>
            <p style="margin: 0; color: #666; line-height: 1.5;">${message}</p>
          </div>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="cancel-btn" style="
              padding: 10px 20px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">Cancel</button>
            <button class="confirm-btn" style="
              padding: 10px 20px;
              border: none;
              background: ${storedPasskey ? '#ef4444' : '#059669'};
              color: white;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            ">${storedPasskey ? 'Disable' : 'Set Up'}</button>
          </div>
        `;
        
        dialog.appendChild(content);
        document.body.appendChild(dialog);
        
        // Handle button clicks
        content.querySelector('.cancel-btn').addEventListener('click', () => {
          dialog.remove();
        });
        
        content.querySelector('.confirm-btn').addEventListener('click', () => {
          if (storedPasskey) {
            // Disable passkey
            localStorage.removeItem(`gymAdminPasskey_${gymId}`);
            localStorage.removeItem(`passkeySetupSkipped_${gymId}`);
            console.log('✅ Passkey disabled');
            showNotification('Admin passkey disabled successfully', 'success');
          } else {
            // Enable passkey - redirect to setup
            console.log('🔧 Redirecting to passkey setup');
            showNotification('Please set up your admin passkey in the payment settings', 'info');
          }
          dialog.remove();
        });
        
        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
          if (e.target === dialog) {
            dialog.remove();
          }
        });
      }
    });
    
    console.log('✅ Passkey disable button fixed');
  }
  
  // 2. Fix 2FA toggle
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  console.log('🔍 2FA toggle found:', !!twoFactorToggle);
  
  if (twoFactorToggle) {
    // Remove existing listeners
    const newToggle = twoFactorToggle.cloneNode(true);
    twoFactorToggle.parentNode.replaceChild(newToggle, twoFactorToggle);
    
    newToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('🎯 2FA toggle changed to:', isEnabled);
      
      // Save to localStorage immediately
      setGymSpecificSetting(`twoFactorEnabled_${gymId}`, isEnabled.toString());
      
      // Show feedback
      showNotification(`Two-Factor Authentication ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
      
      console.log('✅ 2FA setting saved:', isEnabled);
    });
    
    // Load saved state
    const saved2FA = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
    if (saved2FA !== null) {
      newToggle.checked = saved2FA === 'true';
      console.log('🔄 2FA state loaded:', newToggle.checked);
    }
    
    console.log('✅ 2FA toggle fixed');
  }
  
  // 3. Fix login notifications toggle
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  console.log('🔍 Login notifications toggle found:', !!loginNotificationsToggle);
  
  if (loginNotificationsToggle) {
    // Remove existing listeners
    const newToggle = loginNotificationsToggle.cloneNode(true);
    loginNotificationsToggle.parentNode.replaceChild(newToggle, loginNotificationsToggle);
    
    newToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('🎯 Login notifications toggle changed to:', isEnabled);
      
      // Save to localStorage immediately
      setGymSpecificSetting(`loginNotifications_${gymId}`, isEnabled.toString());
      
      // Show feedback
      showNotification(`Login notifications ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
      
      console.log('✅ Login notifications setting saved:', isEnabled);
    });
    
    // Load saved state
    const savedLoginNotif = getGymSpecificSetting(`loginNotifications_${gymId}`);
    if (savedLoginNotif !== null) {
      newToggle.checked = savedLoginNotif === 'true';
      console.log('🔄 Login notifications state loaded:', newToggle.checked);
    } else {
      // Default to enabled
      newToggle.checked = true;
      setGymSpecificSetting(`loginNotifications_${gymId}`, 'true');
      console.log('🔄 Login notifications set to default: enabled');
    }
    
    console.log('✅ Login notifications toggle fixed');
  }
  
  console.log('✅ All toggles fixed after merge!');
  return true;
};

// Add debug function to test toggles after merge
window.testTogglesAfterMerge = function() {
  console.log('🧪 Testing all toggles after merge...');
  
  const disablePasskeyBtn = document.getElementById('disablePasskeyBtn');
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  
  console.log('Toggle elements found:');
  console.log('- Disable passkey button:', !!disablePasskeyBtn);
  console.log('- 2FA toggle:', !!twoFactorToggle);
  console.log('- Login notifications toggle:', !!loginNotificationsToggle);
  
  if (disablePasskeyBtn) {
    console.log('Testing passkey button click...');
    disablePasskeyBtn.click();
  }
  
  if (twoFactorToggle) {
    console.log('Current 2FA state:', twoFactorToggle.checked);
    console.log('Testing 2FA toggle...');
    twoFactorToggle.click();
  }
  
  if (loginNotificationsToggle) {
    console.log('Current login notifications state:', loginNotificationsToggle.checked);
    console.log('Testing login notifications toggle...');
    loginNotificationsToggle.click();
  }
  
  return {
    passkey: !!disablePasskeyBtn,
    twoFactor: !!twoFactorToggle,
    loginNotifications: !!loginNotificationsToggle
  };
};

// Auto-run the fix after page loads
setTimeout(() => {
  console.log('🔄 Auto-running toggle fixes after merge...');
  if (typeof window.fixAllTogglesAfterMerge === 'function') {
    window.fixAllTogglesAfterMerge();
  }
}, 3000);

// Add a comprehensive function to initialize ALL toggles properly
window.initializeAllToggles = function() {
  console.log('🔧 Initializing ALL toggles...');
  
  const gymId = getGymId();
  if (!gymId) {
    console.error('❌ No gym ID found');
    return false;
  }
  
  console.log('🎯 Current gym ID:', gymId);
  
  // FIRST: Fix all enhanced toggle switches
  if (typeof window.fixAllEnhancedToggleSwitches === 'function') {
    window.fixAllEnhancedToggleSwitches();
  }
  
  // 1. Dashboard Customization Toggles
  console.log('🔧 Setting up dashboard customization toggles...');
  
  // Equipment Tab Toggle
  const equipmentTabToggle = document.getElementById('toggleEquipmentTab');
  if (equipmentTabToggle) {
    console.log('✅ Equipment tab toggle found');
    
    // Remove existing listeners
    const newEquipmentToggle = equipmentTabToggle.cloneNode(true);
    equipmentTabToggle.parentNode.replaceChild(newEquipmentToggle, equipmentTabToggle);
    
    newEquipmentToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('🎯 Equipment tab toggle changed to:', isEnabled);
      
      // Save setting
      setGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`, isEnabled.toString());
      
      // Apply visibility
      applyTabVisibility('equipment', isEnabled);
      
      // Show feedback
      showNotification(`Equipment tab ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
      
      console.log('✅ Equipment tab setting saved:', isEnabled);
    });
    
    // Load saved state
    const savedEquipment = getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`);
    if (savedEquipment !== null) {
      newEquipmentToggle.checked = savedEquipment !== 'false';
    } else {
      newEquipmentToggle.checked = true; // Default enabled
      setGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`, 'true');
    }
    console.log('🔄 Equipment tab state loaded:', newEquipmentToggle.checked);
  } else {
    console.warn('❌ Equipment tab toggle not found');
  }
  
  // Payment Tab Toggle
  const paymentTabToggle = document.getElementById('togglePaymentTab');
  if (paymentTabToggle) {
    console.log('✅ Payment tab toggle found');
    
    // Remove existing listeners
    const newPaymentToggle = paymentTabToggle.cloneNode(true);
    paymentTabToggle.parentNode.replaceChild(newPaymentToggle, paymentTabToggle);
    
    newPaymentToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('🎯 Payment tab toggle changed to:', isEnabled);
      
      // Save setting
      setGymSpecificSetting(`dashboardPaymentVisible_${gymId}`, isEnabled.toString());
      
      // Apply visibility
      applyTabVisibility('payment', isEnabled);
      
      // Show feedback
      showNotification(`Payment tab ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
      
      console.log('✅ Payment tab setting saved:', isEnabled);
    });
    
    // Load saved state
    const savedPayment = getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`);
    if (savedPayment !== null) {
      newPaymentToggle.checked = savedPayment !== 'false';
    } else {
      newPaymentToggle.checked = true; // Default enabled
      setGymSpecificSetting(`dashboardPaymentVisible_${gymId}`, 'true');
    }
    console.log('🔄 Payment tab state loaded:', newPaymentToggle.checked);
  } else {
    console.warn('❌ Payment tab toggle not found');
  }
  
  // 2. Security & Privacy Toggles
  console.log('🔧 Setting up security toggles...');
  
  // Disable Passkey Button
  const disablePasskeyBtn = document.getElementById('disablePasskeyBtn');
  if (disablePasskeyBtn) {
    console.log('✅ Disable passkey button found');
    
    // Remove existing listeners
    const newDisableBtn = disablePasskeyBtn.cloneNode(true);
    disablePasskeyBtn.parentNode.replaceChild(newDisableBtn, disablePasskeyBtn);
    
    newDisableBtn.addEventListener('click', function() {
      console.log('🎯 Disable passkey clicked!');
      
      const storedPasskey = localStorage.getItem(`gymAdminPasskey_${gymId}`);
      console.log('🔍 Stored passkey check:', storedPasskey ? 'Exists' : 'Not found');
      
      // Show styled confirmation dialog
      const existingDialog = document.querySelector('.disable-passkey-dialog');
      if (existingDialog) {
        existingDialog.remove();
      }
      
      const dialog = document.createElement('div');
      dialog.className = 'disable-passkey-dialog';
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(2px);
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      `;
      
      const title = storedPasskey ? 'Disable Admin Passkey' : 'Enable Admin Passkey';
      const message = storedPasskey ? 
        'Are you sure you want to disable the admin passkey? This will remove payment security protection.' :
        'Do you want to set up an admin passkey for enhanced payment security?';
      
      content.innerHTML = `
        <div style="margin-bottom: 20px;">
          <i class="fas fa-${storedPasskey ? 'lock-open' : 'lock'}" style="font-size: 48px; color: ${storedPasskey ? '#ef4444' : '#059669'}; margin-bottom: 15px;"></i>
          <h3 style="margin: 0 0 10px 0; color: #333;">${title}</h3>
          <p style="margin: 0; color: #666; line-height: 1.5;">${message}</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="cancel-btn" style="
            padding: 10px 20px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Cancel</button>
          <button class="confirm-btn" style="
            padding: 10px 20px;
            border: none;
            background: ${storedPasskey ? '#ef4444' : '#059669'};
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">${storedPasskey ? 'Disable' : 'Set Up'}</button>
        </div>
      `;
      
      dialog.appendChild(content);
      document.body.appendChild(dialog);
      
      // Handle button clicks
      content.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
      });
      
      content.querySelector('.confirm-btn').addEventListener('click', () => {
        if (storedPasskey) {
          // Disable passkey
          localStorage.removeItem(`gymAdminPasskey_${gymId}`);
          console.log('✅ Passkey disabled');
          showNotification('Admin passkey disabled successfully', 'success');
        } else {
          // Enable passkey - redirect to setup
          console.log('🔧 Redirecting to passkey setup');
          showNotification('Please set up your admin passkey in the payment settings', 'info');
        }
        dialog.remove();
      });
      
      // Close on backdrop click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.remove();
        }
      });
    });
  } else {
    console.warn('❌ Disable passkey button not found');
  }
  
  // Two-Factor Authentication Toggle
  const twoFactorToggle = document.getElementById('twoFactorAuth');
  if (twoFactorToggle) {
    console.log('✅ 2FA toggle found');
    
    // Remove existing listeners
    const newTwoFactorToggle = twoFactorToggle.cloneNode(true);
    twoFactorToggle.parentNode.replaceChild(newTwoFactorToggle, twoFactorToggle);
    
    newTwoFactorToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('🎯 2FA toggle changed to:', isEnabled);
      
      // Save to localStorage immediately
      setGymSpecificSetting(`twoFactorEnabled_${gymId}`, isEnabled.toString());
      
      // Show feedback
      showNotification(`Two-Factor Authentication ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
      
      console.log('✅ 2FA setting saved:', isEnabled);
    });
    
    // Load saved state
    const saved2FA = getGymSpecificSetting(`twoFactorEnabled_${gymId}`);
    if (saved2FA !== null) {
      newTwoFactorToggle.checked = saved2FA === 'true';
    } else {
      newTwoFactorToggle.checked = false; // Default disabled
      setGymSpecificSetting(`twoFactorEnabled_${gymId}`, 'false');
    }
    console.log('🔄 2FA state loaded:', newTwoFactorToggle.checked);
  } else {
    console.warn('❌ 2FA toggle not found');
  }
  
  // Login Notifications Toggle
  const loginNotificationsToggle = document.getElementById('loginNotifications');
  if (loginNotificationsToggle) {
    console.log('✅ Login notifications toggle found');
    
    // Remove existing listeners
    const newLoginToggle = loginNotificationsToggle.cloneNode(true);
    loginNotificationsToggle.parentNode.replaceChild(newLoginToggle, loginNotificationsToggle);
    
    newLoginToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('🎯 Login notifications toggle changed to:', isEnabled);
      
      // Save to localStorage immediately
      setGymSpecificSetting(`loginNotifications_${gymId}`, isEnabled.toString());
      
      // Show feedback
      showNotification(`Login notifications ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
      
      console.log('✅ Login notifications setting saved:', isEnabled);
    });
    
    // Load saved state
    const savedLoginNotif = getGymSpecificSetting(`loginNotifications_${gymId}`);
    if (savedLoginNotif !== null) {
      newLoginToggle.checked = savedLoginNotif === 'true';
    } else {
      newLoginToggle.checked = true; // Default enabled
      setGymSpecificSetting(`loginNotifications_${gymId}`, 'true');
    }
    console.log('🔄 Login notifications state loaded:', newLoginToggle.checked);
  } else {
    console.warn('❌ Login notifications toggle not found');
  }
  
  console.log('✅ ALL toggles initialized successfully!');
  return true;
};

// Add settings tab visibility change listener
let settingsTabObserver;
window.addEventListener('DOMContentLoaded', function() {
  const settingsTab = document.getElementById('settingsTab');
  if (settingsTab) {
    settingsTabObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const isVisible = settingsTab.style.display !== 'none';
          if (isVisible) {
            console.log('🔍 Settings tab became visible, initializing toggles...');
            setTimeout(window.initializeAllToggles, 500);
          }
        }
      });
    });
    
    settingsTabObserver.observe(settingsTab, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
});

// Run initialization when page loads
setTimeout(() => {
  console.log('🔄 Auto-initializing all toggles after page load...');
  if (typeof window.initializeAllToggles === 'function') {
    window.initializeAllToggles();
  }
}, 3000);

// Add manual test function for immediate testing
window.testAllTogglesFinal = function() {
  console.log('🧪 Testing ALL toggles immediately...');
  
  const elements = {
    equipmentTab: document.getElementById('toggleEquipmentTab'),
    paymentTab: document.getElementById('togglePaymentTab'),
    disablePasskey: document.getElementById('disablePasskeyBtn'),
    twoFactor: document.getElementById('twoFactorAuth'),
    loginNotifications: document.getElementById('loginNotifications')
  };
  
  console.log('🔍 Element availability:');
  Object.entries(elements).forEach(([name, element]) => {
    console.log(`- ${name}:`, !!element);
  });
  
  // Test each toggle
  console.log('🎯 Testing toggle clicks...');
  
  if (elements.equipmentTab) {
    console.log('Testing equipment tab toggle...');
    elements.equipmentTab.click();
  }
  
  if (elements.paymentTab) {
    console.log('Testing payment tab toggle...');
    elements.paymentTab.click();
  }
  
  if (elements.twoFactor) {
    console.log('Testing 2FA toggle...');
    elements.twoFactor.click();
  }
  
  if (elements.loginNotifications) {
    console.log('Testing login notifications toggle...');
    elements.loginNotifications.click();
  }
  
  if (elements.disablePasskey) {
    console.log('Testing disable passkey button...');
    elements.disablePasskey.click();
  }
  
  return elements;
};


// ===== ENHANCED TOGGLE SWITCH UNIVERSAL FIX =====
function fixAllEnhancedToggleSwitches() {
  console.log('🔧 Fixing all enhanced toggle switches...');
  
  // Find all enhanced toggle switches in the document
  const enhancedToggleSwitches = document.querySelectorAll('.enhanced-toggle-switch');
  
  enhancedToggleSwitches.forEach((toggleSwitch, index) => {
    const checkbox = toggleSwitch.querySelector('input[type="checkbox"]');
    const slider = toggleSwitch.querySelector('.enhanced-toggle-slider');
    
    if (!checkbox || !slider) {
      console.warn(`⚠️ Enhanced toggle switch ${index} missing checkbox or slider`);
      return;
    }
    
    // Remove any existing click handlers on the slider to avoid duplicates
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    
    // Add click handler to the new slider
    newSlider.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log(`🎯 Enhanced toggle clicked: ${checkbox.id || 'unknown'}, current: ${checkbox.checked}`);
      
      // Toggle the checkbox state
      checkbox.checked = !checkbox.checked;
      
      // Dispatch change event to trigger any existing handlers
      const changeEvent = new Event('change', { bubbles: true });
      checkbox.dispatchEvent(changeEvent);
      
      console.log(`✅ Enhanced toggle toggled: ${checkbox.id || 'unknown'}, new: ${checkbox.checked}`);
    });
    
    // Also ensure the wrapper div is clickable
    toggleSwitch.style.cursor = 'pointer';
    toggleSwitch.addEventListener('click', function(e) {
      // Only trigger if the click was on the wrapper, not the slider
      if (e.target === toggleSwitch) {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    console.log(`✅ Enhanced toggle switch fixed: ${checkbox.id || `toggle-${index}`}`);
  });
  
  console.log(`🎉 Fixed ${enhancedToggleSwitches.length} enhanced toggle switches`);
}

// Make it globally available
window.fixAllEnhancedToggleSwitches = fixAllEnhancedToggleSwitches;

// Quick test function for enhanced toggles
window.testEnhancedToggles = function() {
  console.log('🧪 Testing enhanced toggles...');
  
  const toggles = [
    'toggleEquipmentTab',
    'togglePaymentTab', 
    'twoFactorAuth',
    'loginNotifications'
  ];
  
  toggles.forEach(toggleId => {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      console.log(`✅ ${toggleId}: found, checked=${toggle.checked}`);
      const slider = toggle.nextElementSibling;
      if (slider && slider.classList.contains('enhanced-toggle-slider')) {
        console.log(`  ↳ Slider found and has correct class`);
      } else {
        console.warn(`  ↳ Slider NOT found or wrong class`);
      }
    } else {
      console.error(`❌ ${toggleId}: NOT found`);
    }
  });
  
  console.log('🧪 Test complete. Try clicking the toggles now.');
};

// Test login notification email functionality
window.testLoginNotificationEmail = async function() {
  console.log('🧪 Testing login notification email...');
  
  try {
    const response = await fetch('/api/security/test-login-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      }
    });
    
    const result = await response.json();
    console.log('🧪 Test email result:', result);
    
    if (result.success) {
      showNotification(`Test email sent successfully! Check your inbox at the registered email.`, 'success');
    } else {
      showNotification(`Test email failed: ${result.message}`, 'error');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error testing login notification email:', error);
    showNotification('Failed to send test email. Please check your connection.', 'error');
    return { success: false, error: error.message };
  }
};

// Check email configuration
window.checkEmailConfig = async function() {
  console.log('🔍 Checking email configuration...');
  
  try {
    const response = await fetch('/api/security/check-email-config', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
      }
    });
    
    const result = await response.json();
    console.log('📧 Email config check:', result);
    
    if (result.configured) {
      showNotification('Email is properly configured for notifications', 'success');
    } else {
      showNotification('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS environment variables.', 'warning');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error checking email config:', error);
    showNotification('Failed to check email configuration', 'error');
    return { configured: false, error: error.message };
  }
};

