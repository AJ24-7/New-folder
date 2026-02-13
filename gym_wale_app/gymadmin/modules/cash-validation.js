// Cash Payment Validation System for Gym Admin Dashboard
class CashValidationSystem {
    constructor() {
        this.pendingValidations = [];
        this.pollingInterval = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        this.createValidationModal();
        this.createNotificationBell();
        this.startPolling();
        this.bindEvents();
        this.isInitialized = true;
        console.log('Cash Validation System initialized');
    }

    createNotificationBell() {
        // Check if notification bell already exists
        let existingBell = document.getElementById('cashValidationBell');
        if (existingBell) {
            return;
        }

        // Find the header or top bar to add the notification bell
        const header = document.querySelector('.header') || 
                      document.querySelector('.page-actions') || 
                      document.querySelector('.user-actions');
        
        if (header) {
            const bellHTML = `
                <div class="cash-validation-bell" id="cashValidationBell" style="
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    margin-left: 15px;
                    cursor: pointer;
                    padding: 8px 12px;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                ">
                    <i class="fas fa-money-bill-wave" style="
                        font-size: 1.2rem;
                        color: #2196f3;
                        margin-right: 8px;
                    "></i>
                    <span style="
                        font-size: 0.9rem;
                        color: #333;
                        font-weight: 500;
                    ">Cash Payments</span>
                    <span class="validation-count" id="validationCount" style="
                        position: absolute;
                        top: -5px;
                        right: -5px;
                        background: #ff5722;
                        color: white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        font-size: 0.7rem;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                    ">0</span>
                </div>
            `;
            
            header.insertAdjacentHTML('beforeend', bellHTML);
            
            // Add click event with enhanced handling
            document.getElementById('cashValidationBell').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cash validation bell clicked');
                this.showValidationModal();
            });
        }
    }

    createValidationModal() {
        // Check if modal already exists
        if (document.getElementById('cashValidationModal')) {
            return;
        }

        const modalHTML = `
            <div class="cash-validation-modal-overlay" id="cashValidationModal" style="
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                backdrop-filter: blur(5px);
            ">
                <div class="cash-validation-modal" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border-radius: 15px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 80vh;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #2196f3, #1976d2);
                        color: white;
                        padding: 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 1.5rem;">
                                <i class="fas fa-money-bill-wave" style="margin-right: 10px;"></i>
                                Cash Payment Validations
                            </h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9rem;">
                                Pending cash payments requiring approval
                            </p>
                        </div>
                        <button class="close-modal" id="closeCashModal" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 1.5rem;
                            cursor: pointer;
                            padding: 5px;
                            border-radius: 4px;
                            transition: background 0.3s;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-content" style="
                        padding: 20px;
                        max-height: 60vh;
                        overflow-y: auto;
                    ">
                        <div id="validationsList" class="validations-list">
                            <div class="loading-message" style="
                                text-align: center;
                                padding: 40px;
                                color: #666;
                            ">
                                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i>
                                <div>Loading pending validations...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        // Close modal events
        const modal = document.getElementById('cashValidationModal');
        const closeBtn = document.getElementById('closeCashModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideValidationModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideValidationModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
                this.hideValidationModal();
            }
        });
    }

    showValidationModal() {
        const modal = document.getElementById('cashValidationModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadPendingValidations();
        }
    }

    hideValidationModal() {
        const modal = document.getElementById('cashValidationModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async loadPendingValidations() {
        try {
            const response = await fetch('/api/payments/pending-validations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed - please login again');
                    window.location.href = '/frontend/gymadmin/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (response.ok) {
                this.pendingValidations = result.validations || [];
                this.renderValidations();
                this.updateNotificationCount();
            } else {
                throw new Error(result.message || 'Failed to load validations');
            }
        } catch (error) {
            console.error('Error loading pending validations:', error);
            this.renderError('Failed to load pending validations. Please try again.');
        }
    }

    renderValidations() {
        const validationsList = document.getElementById('validationsList');
        
        if (!validationsList) return;

        if (this.pendingValidations.length === 0) {
            validationsList.innerHTML = `
                <div class="no-validations" style="
                    text-align: center;
                    padding: 40px;
                    color: #666;
                ">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #4caf50; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #333;">All Caught Up!</h3>
                    <p style="margin: 0;">No pending cash payment validations at the moment.</p>
                </div>
            `;
            return;
        }

        const validationsHTML = this.pendingValidations.map(validation => {
            const timeLeft = this.getTimeLeft(validation.expiresAt);
            const isExpiring = timeLeft.total < 120; // Less than 2 minutes
            
            return `
                <div class="validation-card" data-validation-id="${validation._id}" style="
                    background: white;
                    border: 2px solid ${isExpiring ? '#ff5722' : '#e2e8f0'};
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 15px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    ${isExpiring ? 'animation: pulse 2s infinite;' : ''}
                ">
                    <div class="validation-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                    ">
                        <div class="validation-code" style="
                            background: #e3f2fd;
                            color: #1976d2;
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-size: 1.5rem;
                            font-weight: bold;
                            letter-spacing: 2px;
                        ">
                            ${validation.validationCode}
                        </div>
                        <div class="time-left" style="
                            text-align: right;
                            color: ${isExpiring ? '#ff5722' : '#666'};
                            font-weight: 500;
                        ">
                            <div style="font-size: 0.8rem; text-transform: uppercase; margin-bottom: 2px;">
                                ${isExpiring ? 'EXPIRES SOON' : 'TIME LEFT'}
                            </div>
                            <div style="font-size: 1.1rem; font-weight: bold;">
                                ${this.formatTimeLeft(timeLeft)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="validation-details" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-bottom: 20px;
                    ">
                        <div class="detail-item">
                            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">Member ID</div>
                            <div style="font-weight: 600; color: #333;">${validation.memberId}</div>
                        </div>
                        <div class="detail-item">
                            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">Plan</div>
                            <div style="font-weight: 600; color: #333;">${validation.planName}</div>
                        </div>
                        <div class="detail-item">
                            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">Duration</div>
                            <div style="font-weight: 600; color: #333;">${validation.duration} Month(s)</div>
                        </div>
                        <div class="detail-item">
                            <div style="font-size: 0.8rem; color: #666; margin-bottom: 2px;">Amount</div>
                            <div style="font-weight: 600; color: #2e7d32; font-size: 1.1rem;">₹${validation.amount}</div>
                        </div>
                    </div>
                    
                    <div class="validation-actions" style="
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    ">
                        <button class="approve-btn" onclick="cashValidationSystem.approveValidation('${validation.validationCode}')" style="
                            background: linear-gradient(135deg, #4caf50, #2e7d32);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-check"></i>
                            Approve Payment
                        </button>
                        <button class="reject-btn" onclick="cashValidationSystem.rejectValidation('${validation.validationCode}')" style="
                            background: linear-gradient(135deg, #f44336, #c62828);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        validationsList.innerHTML = validationsHTML;

        // Add pulse animation CSS if not already added
        if (!document.getElementById('pulseAnimation')) {
            const style = document.createElement('style');
            style.id = 'pulseAnimation';
            style.textContent = `
                @keyframes pulse {
                    0% { box-shadow: 0 2px 8px rgba(255, 87, 34, 0.3); }
                    50% { box-shadow: 0 4px 16px rgba(255, 87, 34, 0.6); }
                    100% { box-shadow: 0 2px 8px rgba(255, 87, 34, 0.3); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    renderError(message) {
        const validationsList = document.getElementById('validationsList');
        if (validationsList) {
            validationsList.innerHTML = `
                <div class="error-message" style="
                    text-align: center;
                    padding: 40px;
                    color: #c62828;
                ">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <div>${message}</div>
                    <button onclick="cashValidationSystem.loadPendingValidations()" style="
                        background: #2196f3;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Try Again</button>
                </div>
            `;
        }
    }

    async approveValidation(validationCode) {
        try {
            const approveBtn = event.target;
            const originalHTML = approveBtn.innerHTML;
            
            // Show loading state
            approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
            approveBtn.disabled = true;

            const response = await fetch(`/api/payments/approve-cash-validation/${validationCode}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                // Show success message
                this.showNotification('Payment approved successfully!', 'success');
                
                // Remove the validation card from the list
                const validationCard = document.querySelector(`[data-validation-id="${validationCode}"]`);
                if (validationCard) {
                    validationCard.style.transition = 'all 0.3s ease';
                    validationCard.style.transform = 'scale(0.8)';
                    validationCard.style.opacity = '0';
                    
                    setTimeout(() => {
                        validationCard.remove();
                        this.updateNotificationCount();
                        
                        // Reload if no more validations
                        if (document.querySelectorAll('.validation-card').length === 0) {
                            this.loadPendingValidations();
                        }
                    }, 300);
                }
            } else {
                throw new Error(result.message || 'Failed to approve payment');
            }
        } catch (error) {
            console.error('Error approving validation:', error);
            this.showNotification('Failed to approve payment. Please try again.', 'error');
            
            // Restore button state
            if (approveBtn) {
                approveBtn.innerHTML = originalHTML;
                approveBtn.disabled = false;
            }
        }
    }

    async rejectValidation(validationCode) {
        // For now, just remove from pending list
        const validationCard = document.querySelector(`[data-validation-id="${validationCode}"]`);
        if (validationCard) {
            validationCard.style.transition = 'all 0.3s ease';
            validationCard.style.transform = 'scale(0.8)';
            validationCard.style.opacity = '0';
            
            setTimeout(() => {
                validationCard.remove();
                this.updateNotificationCount();
                
                if (document.querySelectorAll('.validation-card').length === 0) {
                    this.loadPendingValidations();
                }
            }, 300);
        }
        
        this.showNotification('Payment validation rejected', 'info');
    }

    updateNotificationCount() {
        const countElement = document.getElementById('validationCount');
        const validationCards = document.querySelectorAll('.validation-card');
        const count = validationCards.length;
        
        if (countElement) {
            if (count > 0) {
                countElement.textContent = count;
                countElement.style.display = 'flex';
            } else {
                countElement.style.display = 'none';
            }
        }
    }

    startPolling() {
        // Poll for new validations every 30 seconds
        this.pollingInterval = setInterval(() => {
            this.checkForNewValidations();
        }, 30000);
    }

    async checkForNewValidations() {
        try {
            const response = await fetch('/api/payments/pending-validations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed - please login again');
                    // Redirect to login or show login prompt
                    window.location.href = '/frontend/gymadmin/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const newValidations = result.validations || [];
            const currentCount = this.pendingValidations.length;
            const newCount = newValidations.length;

            if (newCount > currentCount) {
                // New validation received
                this.showNotification(`${newCount - currentCount} new cash payment validation(s) received!`, 'info');
                this.playNotificationSound();
            }

            this.pendingValidations = newValidations;
            this.updateNotificationCount();
            
        } catch (error) {
            console.error('Error checking for new validations:', error);
            // Don't spam console with frequent polling errors
            if (error.message.includes('Failed to fetch')) {
                console.log('Network error while checking validations - server may be down');
            }
        }
    }

    playNotificationSound() {
        // Create a simple notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add slide animation
        if (!document.getElementById('slideAnimation')) {
            const style = document.createElement('style');
            style.id = 'slideAnimation';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    getTimeLeft(expiresAt) {
        const now = new Date().getTime();
        const expiration = new Date(expiresAt).getTime();
        const difference = expiration - now;
        
        return {
            total: difference,
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000)
        };
    }

    formatTimeLeft(timeLeft) {
        if (timeLeft.total <= 0) {
            return 'EXPIRED';
        }
        
        const minutes = Math.max(0, timeLeft.minutes);
        const seconds = Math.max(0, timeLeft.seconds);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

// Initialize the cash validation system when the page loads
let cashValidationSystem;

document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other systems are loaded
    setTimeout(() => {
        cashValidationSystem = new CashValidationSystem();
    }, 1000);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (cashValidationSystem) {
        cashValidationSystem.destroy();
    }
});
