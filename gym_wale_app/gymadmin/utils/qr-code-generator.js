// QR Code Generator for Member Registration
class QRCodeGenerator {
    constructor() {
        this.currentGymId = this.getGymId();
        console.log('🏢 QRCodeGenerator initialized for gym:', this.currentGymId);
        
        if (!this.currentGymId) {
            console.error('❌ No gym ID found! Checked localStorage, URL params, and global profile');
            this.showNotification('Unable to determine gym ID. Please refresh and try again.', 'error');
            return;
        }
        
        this.isQRLibraryReady = false;
        this.checkQRLibrary();
        
        // Listen for gym profile loaded event
        window.addEventListener('gymProfileLoaded', (event) => {
            console.log('🔄 Gym profile loaded event received, refreshing gym ID');
            this.refreshGymId();
        });
        
        // Store reference globally for other components
        window.qrGenerator = this;
    }

    // Method to refresh the gym ID after profile loads
    refreshGymId() {
        const newGymId = this.getGymId();
        if (newGymId && newGymId !== this.currentGymId) {
            console.log('🔄 Updating gym ID from', this.currentGymId, 'to', newGymId);
            this.currentGymId = newGymId;
        }
    }

    // Robust method to get gym ID from multiple sources
    getGymId() {
        // Method 1: Check localStorage (preferred)
        let gymId = localStorage.getItem('gymId');
        if (gymId) {
            console.log('✅ Found gymId in localStorage:', gymId);
            return gymId;
        }
        
        // Method 2: Check alternative localStorage keys
        gymId = localStorage.getItem('currentGymId');
        if (gymId) {
            console.log('✅ Found gymId in localStorage as currentGymId:', gymId);
            // Store it in the primary key for consistency
            localStorage.setItem('gymId', gymId);
            return gymId;
        }
        
        // Method 3: Check URL parameters (in case redirected with gymId)
        const urlParams = new URLSearchParams(window.location.search);
        gymId = urlParams.get('gymId');
        if (gymId) {
            console.log('✅ Found gymId in URL parameters:', gymId);
            // Store it in localStorage for future use
            localStorage.setItem('gymId', gymId);
            return gymId;
        }
        
        // Method 4: Check global gym profile
        if (window.currentGymProfile) {
            gymId = window.currentGymProfile._id || window.currentGymProfile.id;
            if (gymId) {
                console.log('✅ Found gymId from window.currentGymProfile:', gymId);
                // Store it in localStorage for future use
                localStorage.setItem('gymId', gymId);
                return gymId;
            }
        }
        
        // Method 5: Wait for gym profile to load and retry
        setTimeout(() => {
            if (window.currentGymProfile && !this.currentGymId) {
                gymId = window.currentGymProfile._id || window.currentGymProfile.id;
                if (gymId) {
                    console.log('✅ Found gymId after waiting for profile load:', gymId);
                    this.currentGymId = gymId;
                    localStorage.setItem('gymId', gymId);
                }
            }
        }, 1000);
        
        console.log('❌ No gymId found in any location');
        return null;
    }

    checkQRLibrary() {
        // Check if QRCode library is available
        if (typeof qrcode !== 'undefined') {
            console.log('QRCode library is available:', qrcode);
            this.isQRLibraryReady = true;
            this.init();
        } else {
            // Wait for library to load
            console.log('Waiting for QRCode library to load...');
            setTimeout(() => this.checkQRLibrary(), 100);
        }
    }

    init() {
        this.bindEvents();
        this.setDefaultExpiryDate();
        this.loadActiveQRCodes();
    }

    bindEvents() {
        // Note: The main generateQRCodeBtn click handler is in gymadmin.js
        // We only bind modal-specific events here
        
        console.log('🔧 Binding QR modal events...');
        
        // Close Modal
        const closeBtn = document.getElementById('closeQRCodeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('Close button clicked');
                this.closeQRCodeModal();
            });
        } else {
            console.error('❌ Close QR modal button not found');
        }

        // Generate QR Code (INSIDE modal)
        const generateBtn = document.getElementById('generateQRBtn');
        if (generateBtn) {
            console.log('✅ Generate QR button found, attaching listener');
            generateBtn.addEventListener('click', () => {
                console.log('🎯 Generate QR button clicked (inside modal)');
                this.generateQRCode();
            });
        } else {
            console.error('❌ Generate QR button not found in modal');
        }

        // Action Buttons
        document.getElementById('downloadQRBtn')?.addEventListener('click', () => {
            this.downloadQRCode();
        });

        document.getElementById('copyQRUrlBtn')?.addEventListener('click', () => {
            this.copyQRUrl();
        });

        document.getElementById('shareQRBtn')?.addEventListener('click', () => {
            this.shareQRCode();
        });

        document.getElementById('printQRBtn')?.addEventListener('click', () => {
            this.printQRCode();
        });

        // Close modal when clicking outside
        document.getElementById('qrCodeGeneratorModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'qrCodeGeneratorModal') {
                this.closeQRCodeModal();
            }
        });
    }

    setDefaultExpiryDate() {
        const expiryInput = document.getElementById('qrExpiryDate');
        if (!expiryInput) {
            console.warn('⚠️ Expiry date input not found');
            return;
        }
        
        const now = new Date();
        now.setDate(now.getDate() + 7); // Default 7 days from now
        const isoString = now.toISOString().slice(0, 16); // Format for datetime-local
        expiryInput.value = isoString;
        console.log('✅ Default expiry date set:', isoString);
    }

    openQRCodeModal() {
        if (!this.isQRLibraryReady) {
            this.showNotification('QR Code system is still initializing. Please try again in a moment.', 'error');
            return;
        }
        
        document.getElementById('qrCodeGeneratorModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.loadActiveQRCodes();
    }

    closeQRCodeModal() {
        document.getElementById('qrCodeGeneratorModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        this.resetForm();
    }

    resetForm() {
        document.getElementById('qrRegistrationType').value = 'standard';
        document.getElementById('qrDefaultPlan').value = '';
        document.getElementById('qrUsageLimit').value = '1';
        document.getElementById('qrSpecialOffer').value = '';
        document.getElementById('qrCodeDisplay').style.display = 'none';
        this.setDefaultExpiryDate();
    }

    async generateQRCode() {
        console.log('🚀 generateQRCode() method called');
        
        if (!this.isQRLibraryReady) {
            console.error('❌ QR library not ready');
            this.showNotification('QR Code library is still loading. Please try again in a moment.', 'error');
            return;
        }

        console.log('✅ QR library is ready');

        // Re-verify gym ID before generating QR code
        if (!this.currentGymId) {
            console.log('🔄 Gym ID not found, attempting to refresh...');
            this.currentGymId = this.getGymId();
        }
        
        if (!this.currentGymId) {
            console.error('❌ No gym ID found after refresh');
            this.showNotification('Unable to determine gym ID. Please refresh the page and try again.', 'error');
            return;
        }

        console.log('🏢 Generating QR code for gym ID:', this.currentGymId);

        try {
            const button = document.getElementById('generateQRBtn');
            if (!button) {
                console.error('❌ Generate button not found');
                return;
            }
            
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            button.disabled = true;

            console.log('📝 Collecting form data...');

            // Get form data
            const qrData = {
                gymId: this.currentGymId,
                registrationType: document.getElementById('qrRegistrationType')?.value || 'standard',
                defaultPlan: document.getElementById('qrDefaultPlan')?.value || '',
                usageLimit: document.getElementById('qrUsageLimit')?.value || '1',
                expiryDate: document.getElementById('qrExpiryDate')?.value || '',
                specialOffer: document.getElementById('qrSpecialOffer')?.value || '',
                createdAt: new Date().toISOString()
            };

            console.log('📋 Form data collected:', qrData);

            // Create unique token
            const token = this.generateUniqueToken();
            qrData.token = token;
            console.log('🔑 Generated token:', token);

            // Create registration URL - Fixed to point to correct frontend path
            const baseUrl = window.location.origin;
            const registrationUrl = `${baseUrl}/frontend/register.html?gym=${this.currentGymId}&token=${token}`;
            console.log('🔗 Generated QR URL for gym:', this.currentGymId, 'URL:', registrationUrl);

            // Save QR code data to backend
            console.log('💾 Saving QR code data...');
            await this.saveQRCodeData(qrData);
            console.log('✅ QR data saved');

            // Verify the QR data is for this gym
            if (qrData.gymId !== this.currentGymId) {
                console.error('QR code gym ID mismatch!', qrData.gymId, 'vs', this.currentGymId);
                throw new Error('QR code gym ID mismatch');
            }

            console.log('🎨 Generating QR code image...');
            
            // Check if qrcode library is available
            if (typeof qrcode === 'undefined') {
                console.error('❌ qrcode library is not defined');
                throw new Error('QR code library not loaded');
            }

            // Generate QR Code using qrcode-generator library
            const qr = qrcode(0, 'M');
            qr.addData(registrationUrl);
            qr.make();
            
            console.log('✅ QR data encoded, creating canvas...');
            
            // Create canvas and draw QR code
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const modules = qr.getModuleCount();
            const cellSize = 6;
            const margin = cellSize * 2;
            
            canvas.width = canvas.height = modules * cellSize + margin * 2;
            
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw QR modules
            ctx.fillStyle = '#1976d2';
            for (let row = 0; row < modules; row++) {
                for (let col = 0; col < modules; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            margin + col * cellSize,
                            margin + row * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }
            }

            console.log('✅ QR code canvas created');

            // Display QR Code
            this.displayQRCode(canvas, registrationUrl, qrData);

            button.innerHTML = originalText;
            button.disabled = false;

            // Refresh active QR codes list
            this.loadActiveQRCodes();

            this.showNotification('QR Code generated successfully!', 'success');
            console.log('🎉 QR code generation complete!');

        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            console.error('Error stack:', error.stack);
            this.showNotification('Failed to generate QR code: ' + error.message, 'error');
            
            const button = document.getElementById('generateQRBtn');
            if (button) {
                button.innerHTML = '<i class="fas fa-magic"></i> Generate QR Code';
                button.disabled = false;
            }
        }
    }

    generateUniqueToken() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const gymSpecific = this.currentGymId ? this.currentGymId.substr(-4) : 'gym';
        const token = `qr_${gymSpecific}_${timestamp}_${random}`;
        console.log('Generated unique token for gym', this.currentGymId, ':', token);
        return token;
    }

    async saveQRCodeData(qrData) {
        try {
            const response = await fetch('/api/qr-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(qrData)
            });

            if (!response.ok) {
                throw new Error('Failed to save QR code data');
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving QR code data:', error);
            // Store locally as fallback
            this.saveQRCodeLocally(qrData);
        }
    }

    saveQRCodeLocally(qrData) {
        const key = `gymQRCodes_${this.currentGymId}`;
        const qrCodes = JSON.parse(localStorage.getItem(key) || '[]');
        qrCodes.push(qrData);
        localStorage.setItem(key, JSON.stringify(qrCodes));
    }

    displayQRCode(canvas, url, qrData) {
        const qrCodeCanvas = document.getElementById('qrCodeCanvas');
        qrCodeCanvas.innerHTML = '';
        qrCodeCanvas.appendChild(canvas);

        // Update URL display
        document.getElementById('qrUrl').textContent = url;
        
        // Update expiry display
        const expiryDate = new Date(qrData.expiryDate);
        document.getElementById('qrExpiryDisplay').textContent = expiryDate.toLocaleString();
        
        // Update usage display
        const usageLimit = qrData.usageLimit === 'unlimited' ? 'Unlimited' : `${qrData.usageLimit} uses`;
        document.getElementById('qrUsageDisplay').textContent = usageLimit;
        
        // Store current QR data for actions
        this.currentQRData = { canvas, url, qrData };
        
        // Show QR code display
        document.getElementById('qrCodeDisplay').style.display = 'block';
        
        // Scroll to QR code
        document.getElementById('qrCodeDisplay').scrollIntoView({ behavior: 'smooth' });
    }

    async loadActiveQRCodes() {
        try {
            // Try to load from backend first
            const response = await fetch(`/api/qr-codes?gymId=${this.currentGymId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            let qrCodes = [];
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    qrCodes = await response.json();
                } else {
                    console.warn('QR codes API returned non-JSON response, using fallback');
                    // Fallback to local storage
                    const key = `gymQRCodes_${this.currentGymId}`;
                    qrCodes = JSON.parse(localStorage.getItem(key) || '[]');
                }
            } else {
                console.warn(`QR codes API returned ${response.status}, using fallback`);
                // Fallback to local storage (gym-specific)
                const key = `gymQRCodes_${this.currentGymId}`;
                qrCodes = JSON.parse(localStorage.getItem(key) || '[]');
            }

            this.renderActiveQRCodes(qrCodes);
        } catch (error) {
            console.warn('Error loading active QR codes, using fallback:', error.message);
            // Fallback to local storage (gym-specific)
            const key = `gymQRCodes_${this.currentGymId}`;
            const qrCodes = JSON.parse(localStorage.getItem(key) || '[]');
            this.renderActiveQRCodes(qrCodes);
        }
    }

    renderActiveQRCodes(qrCodes) {
        const container = document.getElementById('activeQRList');
        
        // Filter QR codes to ensure they belong to the current gym
        const gymSpecificQRCodes = qrCodes.filter(qr => qr.gymId === this.currentGymId);
        
        if (gymSpecificQRCodes.length === 0) {
            container.innerHTML = '<p style="color:#666;text-align:center;padding:20px;margin:0;">No active QR codes found for this gym.</p>';
            return;
        }

        console.log(`Rendering ${gymSpecificQRCodes.length} QR codes for gym ${this.currentGymId}`);

        const html = gymSpecificQRCodes.map(qr => {
            const expiryDate = new Date(qr.expiryDate);
            const isExpired = expiryDate < new Date();
            const statusColor = isExpired ? '#dc3545' : '#28a745';
            const statusText = isExpired ? 'Expired' : 'Active';

            return `
                <div class="qr-item" style="background:white;border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-weight:600;color:#333;margin-bottom:5px;">
                                ${qr.registrationType.charAt(0).toUpperCase() + qr.registrationType.slice(1)} Registration
                            </div>
                            <div style="font-size:12px;color:#666;">
                                Created: ${new Date(qr.createdAt).toLocaleDateString()}
                            </div>
                            <div style="font-size:12px;color:#666;">
                                Expires: ${expiryDate.toLocaleDateString()}
                            </div>
                            <div style="font-size:12px;color:#666;">
                                Usage: ${qr.usageCount || 0}/${qr.usageLimit === 'unlimited' ? '∞' : qr.usageLimit}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="color:${statusColor};font-weight:600;margin-bottom:10px;">${statusText}</div>
                            <button class="btn btn-sm btn-primary" onclick="qrGenerator.regenerateQR('${qr.token}')" style="font-size:12px;padding:5px 10px;">
                                <i class="fas fa-qrcode"></i> View
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    async regenerateQR(token) {
        try {
            // Get QR data by token
            const response = await fetch(`/api/qr-codes/${token}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            let qrData;
            if (response.ok) {
                qrData = await response.json();
            } else {
                // Fallback to local storage (gym-specific)
                const key = `gymQRCodes_${this.currentGymId}`;
                const gymQRCodes = JSON.parse(localStorage.getItem(key) || '[]');
                qrData = gymQRCodes.find(qr => qr.token === token);
            }

            if (!qrData) {
                this.showNotification('QR code not found', 'error');
                return;
            }

            // Generate QR Code using qrcode-generator library
            const baseUrl = window.location.origin;
            const registrationUrl = `${baseUrl}/frontend/register.html?gym=${this.currentGymId}&token=${token}`;
            console.log('Regenerated QR URL for gym:', this.currentGymId, 'URL:', registrationUrl);
            
            const qr = qrcode(0, 'M');
            qr.addData(registrationUrl);
            qr.make();
            
            // Create canvas and draw QR code
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const modules = qr.getModuleCount();
            const cellSize = 6;
            const margin = cellSize * 2;
            
            canvas.width = canvas.height = modules * cellSize + margin * 2;
            
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw QR modules
            ctx.fillStyle = '#1976d2';
            for (let row = 0; row < modules; row++) {
                for (let col = 0; col < modules; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            margin + col * cellSize,
                            margin + row * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }
            }

            this.displayQRCode(canvas, registrationUrl, qrData);

        } catch (error) {
            console.error('Error regenerating QR code:', error);
            this.showNotification('Failed to regenerate QR code', 'error');
        }
    }

    downloadQRCode() {
        if (!this.currentQRData) {
            this.showNotification('No QR code to download', 'error');
            return;
        }

        const canvas = this.currentQRData.canvas;
        const link = document.createElement('a');
        link.download = `gym-registration-qr-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();

        this.showNotification('QR code downloaded successfully!', 'success');
    }

    copyQRUrl() {
        if (!this.currentQRData) {
            this.showNotification('No QR URL to copy', 'error');
            return;
        }

        navigator.clipboard.writeText(this.currentQRData.url).then(() => {
            this.showNotification('QR URL copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Error copying URL:', err);
            this.showNotification('Failed to copy URL', 'error');
        });
    }

    shareQRCode() {
        if (!this.currentQRData) {
            this.showNotification('No QR code to share', 'error');
            return;
        }

        if (navigator.share) {
            navigator.share({
                title: 'Gym Registration QR Code',
                text: 'Scan this QR code to register for our gym!',
                url: this.currentQRData.url
            }).then(() => {
                this.showNotification('QR code shared successfully!', 'success');
            }).catch(err => {
                console.error('Error sharing:', err);
                this.fallbackShare();
            });
        } else {
            this.fallbackShare();
        }
    }

    fallbackShare() {
        // Create a temporary modal for sharing options
        const shareModal = document.createElement('div');
        shareModal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10005;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;padding:30px;border-radius:12px;max-width:400px;width:90%;">
                    <h3 style="margin:0 0 20px 0;text-align:center;">Share QR Code</h3>
                    <div style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-weight:600;">Registration URL:</label>
                        <input type="text" value="${this.currentQRData.url}" readonly style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                    </div>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button onclick="navigator.clipboard.writeText('${this.currentQRData.url}');this.parentElement.parentElement.parentElement.remove();qrGenerator.showNotification('URL copied!','success')" class="btn btn-primary">Copy URL</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(shareModal);
    }

    printQRCode() {
        if (!this.currentQRData) {
            this.showNotification('No QR code to print', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        const canvas = this.currentQRData.canvas;
        const dataUrl = canvas.toDataURL();
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Gym Registration QR Code</title>
                <style>
                    body { text-align: center; font-family: Arial, sans-serif; margin: 40px; }
                    .qr-container { margin: 20px 0; }
                    .info { margin: 10px 0; color: #666; }
                </style>
            </head>
            <body>
                <h1>Gym Member Registration</h1>
                <div class="qr-container">
                    <img src="${dataUrl}" alt="QR Code" style="max-width: 300px;">
                </div>
                <div class="info">Scan this QR code to register as a member</div>
                <div class="info">Generated on: ${new Date().toLocaleDateString()}</div>
                <div class="info">Expires: ${new Date(this.currentQRData.qrData.expiryDate).toLocaleDateString()}</div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);

        this.showNotification('Print dialog opened!', 'success');
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10010;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize QR Code Generator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing QR Code Generator...');
    
    // Wait a bit to ensure all scripts are loaded
    setTimeout(() => {
        if (typeof qrcode !== 'undefined') {
            console.log('QRCode library found, initializing generator...');
            window.qrGenerator = new QRCodeGenerator();
        } else {
            console.error('QRCode library not found. Retrying...');
            
            // Try loading the library dynamically if it's not available
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
            script.onload = function() {
                console.log('QRCode library loaded dynamically');
                window.qrGenerator = new QRCodeGenerator();
            };
            script.onerror = function() {
                console.error('Failed to load QRCode library');
            };
            document.head.appendChild(script);
        }
    }, 500);
});
