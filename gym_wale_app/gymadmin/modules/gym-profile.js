/**
 * Gym Profile Management System
 * Handles gym profile viewing, editing, logo management, and password changes
 */

class GymProfileManager {
    constructor() {
    this.BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
        this.isEditMode = false;
        this.originalData = {};
        this.currentGymData = {};
        
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.loadGymProfile();
    }

    bindEventListeners() {
        // Profile dropdown menu events
        document.getElementById('gymProfileLink')?.addEventListener('click', () => {
            this.openGymProfileModal();
        });

        document.getElementById('changePasswordLink')?.addEventListener('click', () => {
            this.openChangePasswordModal();
        });

        // Gym Profile Modal events
        document.getElementById('closeGymProfileModal')?.addEventListener('click', () => {
            this.closeGymProfileModal();
        });

        document.getElementById('toggleEditModeBtn')?.addEventListener('click', () => {
            this.toggleEditMode();
        });

        document.getElementById('cancelGymProfileBtn')?.addEventListener('click', () => {
            this.cancelEdit();
        });

        document.getElementById('gymProfileForm')?.addEventListener('submit', (e) => {
            this.handleGymProfileSave(e);
        });

        // Gym Logo events
        document.getElementById('logoUploadOverlay')?.addEventListener('click', () => {
            if (this.isEditMode) {
                document.getElementById('gymLogoInput').click();
            }
        });

        document.getElementById('gymLogoInput')?.addEventListener('change', (e) => {
            this.handleLogoUpload(e);
        });

        // Change Password Modal events
        document.getElementById('closeChangePasswordModal')?.addEventListener('click', () => {
            this.closeChangePasswordModal();
        });

        document.getElementById('cancelPasswordChangeBtn')?.addEventListener('click', () => {
            this.closeChangePasswordModal();
        });

        document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
            this.handlePasswordChange(e);
        });

        // Password visibility toggles
        document.querySelectorAll('.toggle-password').forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.togglePasswordVisibility(toggle);
            });
        });

        // Password strength checker
        document.getElementById('newPassword')?.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Password confirmation validation
        document.getElementById('confirmPassword')?.addEventListener('input', () => {
            this.validatePasswordConfirmation();
        });

        // Mode indicators
        document.getElementById('viewModeTab')?.addEventListener('click', () => {
            if (this.isEditMode) this.toggleEditMode();
        });

        document.getElementById('editModeTab')?.addEventListener('click', () => {
            if (!this.isEditMode) this.toggleEditMode();
        });
    }

    async loadGymProfile() {
        try {
            // Use the globally available gym profile if it exists
            if (window.currentGymProfile && Object.keys(window.currentGymProfile).length > 0) {
                this.currentGymData = window.currentGymProfile;
                this.originalData = { ...this.currentGymData };
                this.populateProfileData();
                return;
            }

            // Direct API call
            const response = await fetch(`${this.BASE_URL}/api/gyms/profile/me`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                }
            });

            if (response.ok) {
                this.currentGymData = await response.json();
                this.originalData = { ...this.currentGymData };
                
                // Store in global variable for other parts of the app
                window.currentGymProfile = this.currentGymData;
                
                this.populateProfileData();
            } else {
                throw new Error('Failed to load gym profile');
            }
        } catch (error) {
            console.error('Error loading gym profile:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Failed to load gym profile', 'error');
            } else {
                this.showNotification('Failed to load gym profile', 'error');
            }
        }
    }

    populateProfileData() {
        const data = this.currentGymData;

        // Basic Information - add null checks
        const gymNameEl = document.getElementById('gymName');
        if (gymNameEl) gymNameEl.value = data.gymName || '';
        
        const ownerNameEl = document.getElementById('ownerName');
        if (ownerNameEl) ownerNameEl.value = data.contactPerson || '';
        
        const gymEmailEl = document.getElementById('gymEmail');
        if (gymEmailEl) gymEmailEl.value = data.email || '';
        
        const gymPhoneEl = document.getElementById('gymPhone');
        if (gymPhoneEl) gymPhoneEl.value = data.phone || '';
        
        const supportEmailEl = document.getElementById('supportEmail');
        if (supportEmailEl) supportEmailEl.value = data.supportEmail || '';
        
        const supportPhoneEl = document.getElementById('supportPhone');
        if (supportPhoneEl) supportPhoneEl.value = data.supportPhone || '';

        // Location Information
        const gymAddressEl = document.getElementById('gymAddress');
        if (gymAddressEl) gymAddressEl.value = data.location?.address || '';
        
        const gymCityEl = document.getElementById('gymCity');
        if (gymCityEl) gymCityEl.value = data.location?.city || '';
        
        const gymStateEl = document.getElementById('gymState');
        if (gymStateEl) gymStateEl.value = data.location?.state || '';
        
        const gymPincodeEl = document.getElementById('gymPincode');
        if (gymPincodeEl) gymPincodeEl.value = data.location?.pincode || '';
        
        const gymLandmarkEl = document.getElementById('gymLandmark');
        if (gymLandmarkEl) gymLandmarkEl.value = data.location?.landmark || '';

        // Operational Information
        const openingTimeEl = document.getElementById('openingTime');
        if (openingTimeEl) openingTimeEl.value = data.openingTime || '';
        
        const closingTimeEl = document.getElementById('closingTime');
        if (closingTimeEl) closingTimeEl.value = data.closingTime || '';
        
        const currentMembersEl = document.getElementById('currentMembers');
        if (currentMembersEl) currentMembersEl.value = data.membersCount || '0';

        // Description
        const gymDescriptionEl = document.getElementById('gymDescription');
        if (gymDescriptionEl) gymDescriptionEl.value = data.description || '';

        // Gym Logo
        const gymLogoImageEl = document.getElementById('gymLogoImage');
        if (gymLogoImageEl && data.logoUrl) {
            let logoUrl = data.logoUrl;
            if (!logoUrl.startsWith('http')) {
                logoUrl = `${this.BASE_URL}${logoUrl.startsWith('/') ? logoUrl : '/' + logoUrl}`;
            }
            gymLogoImageEl.src = logoUrl;
        }
    }

    openGymProfileModal() {
        document.getElementById('gymProfileModal').style.display = 'flex';
        this.loadGymProfile();
    }

    closeGymProfileModal() {
        document.getElementById('gymProfileModal').style.display = 'none';
        if (this.isEditMode) {
            this.toggleEditMode();
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        
        const toggleBtn = document.getElementById('toggleEditModeBtn');
        const cancelBtn = document.getElementById('cancelGymProfileBtn');
        const saveBtn = document.getElementById('saveGymProfileBtn');
        const logoOverlay = document.getElementById('logoUploadOverlay');
        const viewModeTab = document.getElementById('viewModeTab');
        const editModeTab = document.getElementById('editModeTab');

        // Get all form inputs
        const inputs = document.querySelectorAll('#gymProfileForm input, #gymProfileForm textarea, #gymProfileForm select');

        if (this.isEditMode) {
            // Enable edit mode
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> View Mode';
            toggleBtn.className = 'btn btn-secondary';
            cancelBtn.style.display = 'inline-block';
            saveBtn.style.display = 'inline-block';
            logoOverlay.style.display = 'flex';

            // Enable form fields
            inputs.forEach(input => {
                if (input && input.id !== 'currentMembers') { // Keep current members readonly
                    input.removeAttribute('readonly');
                    input.removeAttribute('disabled');
                }
            });

            // Update mode indicators
            viewModeTab.classList.remove('active');
            editModeTab.classList.add('active');

        } else {
            // Enable view mode
            toggleBtn.innerHTML = '<i class="fas fa-edit"></i> Enable Edit Mode';
            toggleBtn.className = 'btn btn-primary';
            cancelBtn.style.display = 'none';
            saveBtn.style.display = 'none';
            logoOverlay.style.display = 'none';

            // Disable form fields
            inputs.forEach(input => {
                if (input) {
                    input.setAttribute('readonly', 'readonly');
                    if (input.tagName === 'SELECT') {
                        input.setAttribute('disabled', 'disabled');
                    }
                }
            });

            // Update mode indicators
            editModeTab.classList.remove('active');
            viewModeTab.classList.add('active');

            // Restore original data if cancelling
            this.populateProfileData();
        }
    }

    cancelEdit() {
        this.populateProfileData();
        this.toggleEditMode();
    }

    async handleGymProfileSave(e) {
        e.preventDefault();

        if (!this.isEditMode) return;

        try {
            const formData = new FormData(e.target);
            
            // Add logo file if uploaded
            const logoInput = document.getElementById('gymLogoInput');
            if (logoInput.files[0]) {
                formData.append('gymLogo', logoInput.files[0]);
            }

            const response = await fetch(`${this.BASE_URL}/api/gyms/profile/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                },
                body: formData
            });

            if (response.ok) {
                const updatedData = await response.json();
                this.currentGymData = updatedData;
                this.originalData = { ...updatedData };
                
                // Update the global profile
                window.currentGymProfile = updatedData;
                
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Gym profile updated successfully', 'success');
                } else {
                    this.showNotification('Gym profile updated successfully', 'success');
                }
                this.toggleEditMode();
                
                // Update any dashboard elements that show gym info
                this.updateDashboardGymInfo();
            } else {
                throw new Error('Failed to update gym profile');
            }
        } catch (error) {
            console.error('Error updating gym profile:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Failed to update gym profile', 'error');
            } else {
                this.showNotification('Failed to update gym profile', 'error');
            }
        }
    }

    handleLogoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Please select a valid image file', 'error');
            } else {
                this.showNotification('Please select a valid image file', 'error');
            }
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Image size should be less than 2MB', 'error');
            } else {
                this.showNotification('Image size should be less than 2MB', 'error');
            }
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('gymLogoImage').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    openChangePasswordModal() {
        document.getElementById('changePasswordModal').style.display = 'flex';
        document.getElementById('changePasswordForm').reset();
        this.resetPasswordStrength();
    }

    closeChangePasswordModal() {
        document.getElementById('changePasswordModal').style.display = 'none';
        document.getElementById('changePasswordForm').reset();
        this.resetPasswordStrength();
    }

    async handlePasswordChange(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('New passwords do not match', 'error');
            } else {
                this.showNotification('New passwords do not match', 'error');
            }
            return;
        }

        // Validate password strength
        if (newPassword.length < 8) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Password must be at least 8 characters long', 'error');
            } else {
                this.showNotification('Password must be at least 8 characters long', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`${this.BASE_URL}/api/gyms/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.ok) {
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Password changed successfully', 'success');
                } else {
                    this.showNotification('Password changed successfully', 'success');
                }
                this.closeChangePasswordModal();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(error.message || 'Failed to change password', 'error');
            } else {
                this.showNotification(error.message || 'Failed to change password', 'error');
            }
        }
    }

    togglePasswordVisibility(toggle) {
        const targetId = toggle.getAttribute('data-target');
        const input = document.getElementById(targetId);
        
        if (input.type === 'password') {
            input.type = 'text';
            toggle.classList.remove('fa-eye');
            toggle.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            toggle.classList.remove('fa-eye-slash');
            toggle.classList.add('fa-eye');
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
        
        let score = 0;
        let feedback = 'Weak';
        let color = '#dc3545';

        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 10;
        if (/[a-z]/.test(password)) score += 15;
        if (/[A-Z]/.test(password)) score += 15;
        if (/[0-9]/.test(password)) score += 20;
        if (/[^A-Za-z0-9]/.test(password)) score += 20;

        if (score >= 80) {
            feedback = 'Strong';
            color = '#28a745';
        } else if (score >= 60) {
            feedback = 'Good';
            color = '#ffc107';
        } else if (score >= 40) {
            feedback = 'Fair';
            color = '#fd7e14';
        }

        strengthBar.style.width = `${score}%`;
        strengthBar.style.background = color;
        strengthText.textContent = feedback;
        strengthText.style.color = color;
    }

    validatePasswordConfirmation() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmInput.style.borderColor = '#dc3545';
        } else {
            confirmInput.style.borderColor = '#ddd';
        }
    }

    resetPasswordStrength() {
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
        
        strengthBar.style.width = '0%';
        strengthBar.style.background = '#dc3545';
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#dc3545';
    }

    updateDashboardGymInfo() {
        // Update any gym info displayed in the dashboard
        const data = this.currentGymData;
        
        // Update admin name if needed
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl && data.contactPerson) {
            adminNameEl.textContent = data.contactPerson;
        }

        // Update any other dashboard elements that show gym info
        // This can be expanded based on what gym info is shown in the dashboard
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
}

// CSS Styles for the gym profile system
const gymProfileStyles = `
    .mode-indicator {
        display: flex;
        background: #f8f9fa;
        border-radius: 25px;
        padding: 3px;
        border: 1px solid #dee2e6;
    }

    .mode-indicator span {
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .mode-indicator span:hover {
        background: rgba(0,123,255,0.1);
    }

    .mode-indicator span.active {
        background: var(--primary);
        color: white;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group label {
        font-weight: 600;
        margin-bottom: 5px;
        color: #333;
        font-size: 14px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
    }

    .form-group input[readonly],
    .form-group select[disabled],
    .form-group textarea[readonly] {
        background-color: #f8f9fa;
        cursor: not-allowed;
    }

    .info-section {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid var(--primary);
    }

    .logo-upload-overlay {
        cursor: pointer;
    }

    .logo-upload-overlay:hover {
        background: rgba(0,0,0,0.8) !important;
    }

    @media (max-width: 768px) {
        .form-grid {
            grid-template-columns: 1fr;
        }
        
        .modal-content {
            max-width: 95% !important;
            margin: 10px !important;
        }
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = gymProfileStyles;
document.head.appendChild(styleSheet);

// Initialize the gym profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GymProfileManager();
});
