/**
 * Gym Admin Subscription Management
 * Handles subscription status, renewals, plan changes, and payment history
 */

class SubscriptionManager {
    constructor() {
        this.currentSubscription = null;
        this.paymentHistory = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSubscriptionData();
    }

    bindEvents() {
        // Subscription action buttons
        document.getElementById('renewSubscriptionBtn')?.addEventListener('click', () => this.showRenewModal());
        document.getElementById('changePlanBtn')?.addEventListener('click', () => this.showChangePlanModal());
        document.getElementById('viewPaymentHistoryBtn')?.addEventListener('click', () => this.showPaymentHistoryModal());
        document.getElementById('downloadInvoiceBtn')?.addEventListener('click', () => this.downloadLatestInvoice());

        // Modal close buttons
        document.getElementById('closeRenewSubscriptionModal')?.addEventListener('click', () => this.closeModal('renewSubscriptionModal'));
        document.getElementById('closeChangePlanModal')?.addEventListener('click', () => this.closeModal('changePlanModal'));
        document.getElementById('closePaymentHistoryModal')?.addEventListener('click', () => this.closeModal('paymentHistoryModal'));

        // Renewal modal actions
        document.getElementById('cancelRenewalBtn')?.addEventListener('click', () => this.closeModal('renewSubscriptionModal'));
        document.getElementById('proceedRenewalBtn')?.addEventListener('click', () => this.processRenewal());

        // Change plan modal actions
        document.getElementById('cancelChangePlanBtn')?.addEventListener('click', () => this.closeModal('changePlanModal'));
        document.getElementById('confirmChangePlanBtn')?.addEventListener('click', () => this.changePlan());

        // Plan card selection
        document.querySelectorAll('.plan-card').forEach(card => {
            card.addEventListener('click', () => this.selectPlan(card));
        });

        // Renewal option selection
        document.querySelectorAll('input[name="renewalPlan"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateRenewalTotal());
        });

        // Payment method selection
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', () => this.updatePaymentMethod());
        });

        // Emergency actions
        document.getElementById('contactSupportBtn')?.addEventListener('click', () => this.contactSupport());
        document.getElementById('reportIssueBtn')?.addEventListener('click', () => this.reportIssue());
    }

    async loadSubscriptionData() {
        try {
            // Show loading state
            this.showLoadingState();

            // Get subscription data from API
            const response = await this.makeAPICall('/api/subscriptions/gym/my-subscription');
            
            if (response.success) {
                this.currentSubscription = response.data;
                this.updateSubscriptionDisplay();
                this.loadUsageStatistics();
            } else {
                this.showNoSubscriptionState();
            }
        } catch (error) {
            console.error('Error loading subscription data:', error);
            this.showErrorState();
        }
    }

    async makeAPICall(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('gymAdminToken');
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            const mergedOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            };

            const response = await fetch(endpoint, mergedOptions);
            
            // Check if response is actually JSON before parsing
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'API request failed');
                }
                
                return data;
            } else {
                // Response is not JSON, probably an HTML error page
                const text = await response.text();
                console.error('API returned non-JSON response:', text.substring(0, 200) + '...');
                throw new Error('API returned non-JSON response (likely HTML error page)');
            }
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    showLoadingState() {
        document.getElementById('currentPlanName').textContent = 'Loading...';
        document.getElementById('currentPlanDescription').textContent = 'Checking subscription status...';
        document.getElementById('subscriptionStatus').textContent = 'Loading...';
        document.getElementById('subscriptionAmount').textContent = '₹--';
        document.getElementById('daysRemaining').textContent = '--';
        document.getElementById('nextPaymentDate').textContent = '--';
    }

    updateSubscriptionDisplay() {
        if (!this.currentSubscription) return;

        const { plan, planDisplayName, status, pricing, activePeriod, paymentDetails, features } = this.currentSubscription;

        // Update status card
        document.getElementById('currentPlanName').textContent = planDisplayName;
        document.getElementById('currentPlanDescription').textContent = `${this.getPlanDescription(plan)} - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        document.getElementById('subscriptionStatus').textContent = status === 'active' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1);
        document.getElementById('subscriptionStatus').style.background = status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)';

        // Update pricing and dates
        const monthlyAmount = this.getMonthlyAmount(pricing.amount, plan);
        document.getElementById('subscriptionAmount').textContent = `₹${monthlyAmount}`;
        
        const daysRemaining = this.calculateDaysRemaining(activePeriod.endDate);
        document.getElementById('daysRemaining').textContent = daysRemaining;
        
        const nextPayment = new Date(paymentDetails.nextPaymentDate);
        document.getElementById('nextPaymentDate').textContent = nextPayment.toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short' 
        });

        // Update features list
        this.updateFeaturesList(features);

        // Update action buttons based on status
        this.updateActionButtons(status);
    }

    getPlanDescription(plan) {
        const descriptions = {
            '1month': 'Monthly subscription with all basic features',
            '3month': 'Quarterly subscription with advanced features and 15% savings',
            '6month': 'Half-yearly subscription with premium features and 25% savings'
        };
        return descriptions[plan] || 'Subscription plan';
    }

    getMonthlyAmount(totalAmount, plan) {
        const monthlyAmounts = {
            '1month': totalAmount,
            '3month': Math.round(totalAmount / 3),
            '6month': Math.round(totalAmount / 6)
        };
        return monthlyAmounts[plan] || totalAmount;
    }

    calculateDaysRemaining(endDate) {
        const today = new Date();
        const end = new Date(endDate);
        const timeDiff = end.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return Math.max(0, daysDiff);
    }

    updateFeaturesList(features) {
        const container = document.getElementById('subscriptionFeaturesList');
        if (!container) return;

        container.innerHTML = features.map(feature => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border-radius: 4px;">
                <i class="fas fa-${feature.enabled ? 'check-circle' : 'times-circle'}" 
                   style="color: ${feature.enabled ? '#4CAF50' : '#f44336'};"></i>
                <span style="color: ${feature.enabled ? '#333' : '#999'};">${feature.name}</span>
            </div>
        `).join('');
    }

    updateActionButtons(status) {
        const renewBtn = document.getElementById('renewSubscriptionBtn');
        const changePlanBtn = document.getElementById('changePlanBtn');
        
        if (status === 'expired' || status === 'cancelled') {
            renewBtn.style.background = '#f44336';
            renewBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Reactivate Subscription';
            changePlanBtn.disabled = true;
            changePlanBtn.style.opacity = '0.5';
        } else {
            renewBtn.style.background = '#4CAF50';
            renewBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Renew Subscription';
            changePlanBtn.disabled = false;
            changePlanBtn.style.opacity = '1';
        }
    }

    async loadUsageStatistics() {
        try {
            // Load usage statistics from API
            const response = await this.makeAPICall('/api/subscriptions/gym/usage-stats');
            
            if (response.success) {
                const stats = response.data;
                document.getElementById('totalMembers').textContent = stats.totalMembers || '--';
                document.getElementById('totalPayments').textContent = stats.totalPayments || '--';
                document.getElementById('storageUsed').textContent = stats.storageUsed || '--';
            } else {
                // Fallback to default values
                document.getElementById('totalMembers').textContent = '--';
                document.getElementById('totalPayments').textContent = '--';
                document.getElementById('storageUsed').textContent = '--';
            }
        } catch (error) {
            console.error('Error loading usage statistics:', error);
            // Show fallback values
            document.getElementById('totalMembers').textContent = '--';
            document.getElementById('totalPayments').textContent = '--';
            document.getElementById('storageUsed').textContent = '--';
        }
    }

    showRenewModal() {
        if (!this.currentSubscription) return;

        // Update renewal modal with current plan info
        document.getElementById('currentPlanNameRenew').textContent = this.currentSubscription.planDisplayName;
        document.getElementById('currentPlanAmountRenew').textContent = `₹${this.currentSubscription.pricing.amount}/${this.currentSubscription.pricing.billingCycle}`;
        document.getElementById('currentExpiryDateRenew').textContent = new Date(this.currentSubscription.activePeriod.endDate).toLocaleDateString('en-IN');

        // Reset form
        document.querySelectorAll('input[name="renewalPlan"]').forEach(radio => radio.checked = false);
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => radio.checked = false);

        this.showModal('renewSubscriptionModal');
    }

    showChangePlanModal() {
        // Reset plan selection
        document.querySelectorAll('.plan-card').forEach(card => {
            card.style.borderColor = '#e0e0e0';
            card.style.background = 'white';
        });

        // Disable confirm button initially
        document.getElementById('confirmChangePlanBtn').disabled = true;

        this.showModal('changePlanModal');
    }

    showPaymentHistoryModal() {
        this.showModal('paymentHistoryModal');
        this.loadPaymentHistory();
    }

    async loadPaymentHistory() {
        const tbody = document.getElementById('paymentHistoryTableBody');
        
        // Show loading
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 40px; text-align: center; color: #666;">
                    <i class="fas fa-spinner fa-spin"></i> Loading payment history...
                </td>
            </tr>
        `;

        try {
            // Use billing history from current subscription
            const history = this.currentSubscription?.billingHistory || [];
            
            if (history.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="padding: 40px; text-align: center; color: #666;">
                            <i class="fas fa-inbox"></i><br>No payment history found
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = history.map(payment => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${new Date(payment.date).toLocaleDateString('en-IN')}</td>
                    <td style="padding: 12px; font-weight: 600; color: #4CAF50;">₹${payment.amount}</td>
                    <td style="padding: 12px;">${payment.description}</td>
                    <td style="padding: 12px;">
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fab fa-${this.getPaymentIcon(payment.paymentMethod)}"></i>
                            ${payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <span class="status-badge ${payment.status}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; 
                               background: ${this.getStatusColor(payment.status)}; color: ${this.getStatusTextColor(payment.status)};">
                            ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                    </td>
                    <td style="padding: 12px; font-family: monospace; font-size: 0.9rem;">${payment.transactionId}</td>
                    <td style="padding: 12px;">
                        <button onclick="subscriptionManager.downloadInvoice('${payment.transactionId}')" 
                                style="background: none; border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px; cursor: pointer; color: #666;">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error loading payment history:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 40px; text-align: center; color: #f44336;">
                        <i class="fas fa-exclamation-triangle"></i><br>Error loading payment history
                    </td>
                </tr>
            `;
        }
    }

    getPaymentIcon(method) {
        const icons = {
            'razorpay': 'cc-visa',
            'stripe': 'stripe',
            'paypal': 'paypal'
        };
        return icons[method] || 'credit-card';
    }

    getStatusColor(status) {
        const colors = {
            'success': '#d4edda',
            'pending': '#fff3cd',
            'failed': '#f8d7da'
        };
        return colors[status] || '#e2e3e5';
    }

    getStatusTextColor(status) {
        const colors = {
            'success': '#155724',
            'pending': '#856404',
            'failed': '#721c24'
        };
        return colors[status] || '#6c757d';
    }

    selectPlan(selectedCard) {
        // Reset all plan cards
        document.querySelectorAll('.plan-card').forEach(card => {
            card.style.borderColor = '#e0e0e0';
            card.style.background = 'white';
        });

        // Highlight selected plan
        selectedCard.style.borderColor = '#2196F3';
        selectedCard.style.background = '#f3f7ff';

        // Show plan change note
        document.getElementById('planChangeNote').style.display = 'block';

        // Enable confirm button
        document.getElementById('confirmChangePlanBtn').disabled = false;
    }

    updateRenewalTotal() {
        const selectedPlan = document.querySelector('input[name="renewalPlan"]:checked');
        if (selectedPlan) {
            // Highlight selected renewal option
            document.querySelectorAll('.renewal-option').forEach(option => {
                option.style.borderColor = '#e0e0e0';
                option.style.background = 'white';
            });
            
            selectedPlan.closest('.renewal-option').style.borderColor = '#2196F3';
            selectedPlan.closest('.renewal-option').style.background = '#f3f7ff';
        }
    }

    updatePaymentMethod() {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (selectedMethod) {
            // Highlight selected payment method
            document.querySelectorAll('label[style*="border"]').forEach(label => {
                if (label.querySelector('input[name="paymentMethod"]')) {
                    label.style.borderColor = '#e0e0e0';
                    label.style.background = 'white';
                }
            });
            
            selectedMethod.closest('label').style.borderColor = '#2196F3';
            selectedMethod.closest('label').style.background = '#f3f7ff';
        }
    }

    async processRenewal() {
        const selectedPlan = document.querySelector('input[name="renewalPlan"]:checked');
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');

        if (!selectedPlan || !selectedMethod) {
            this.showNotification('Please select a renewal plan and payment method', 'warning');
            return;
        }

        const renewalData = {
            plan: selectedPlan.value,
            paymentMethod: selectedMethod.value
        };

        try {
            // Show processing state
            document.getElementById('proceedRenewalBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            document.getElementById('proceedRenewalBtn').disabled = true;

            // Call renewal API
            const response = await this.makeAPICall('/api/subscriptions/gym/renew', {
                method: 'POST',
                body: JSON.stringify(renewalData)
            });

            if (response.success) {
                this.showNotification('Subscription renewed successfully!', 'success');
                this.closeModal('renewSubscriptionModal');
                this.loadSubscriptionData(); // Refresh subscription data
            } else {
                throw new Error(response.message || 'Renewal failed');
            }

        } catch (error) {
            console.error('Error processing renewal:', error);
            this.showNotification(`Payment processing failed: ${error.message}`, 'error');
        } finally {
            // Reset button
            document.getElementById('proceedRenewalBtn').innerHTML = '<i class="fas fa-credit-card"></i> Proceed to Payment';
            document.getElementById('proceedRenewalBtn').disabled = false;
        }
    }

    async changePlan() {
        const selectedCard = document.querySelector('.plan-card[style*="rgb(33, 150, 243)"]');
        if (!selectedCard) return;

        const newPlan = selectedCard.dataset.plan;

        try {
            // Show processing state
            document.getElementById('confirmChangePlanBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
            document.getElementById('confirmChangePlanBtn').disabled = true;

            // Call plan change API
            const response = await this.makeAPICall('/api/subscriptions/gym/change-plan', {
                method: 'PUT',
                body: JSON.stringify({ newPlan })
            });

            if (response.success) {
                this.showNotification('Plan changed successfully!', 'success');
                this.closeModal('changePlanModal');
                this.loadSubscriptionData(); // Refresh subscription data
            } else {
                throw new Error(response.message || 'Plan change failed');
            }

        } catch (error) {
            console.error('Error changing plan:', error);
            this.showNotification(`Failed to change plan: ${error.message}`, 'error');
        } finally {
            // Reset button
            document.getElementById('confirmChangePlanBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Change Plan';
            document.getElementById('confirmChangePlanBtn').disabled = false;
        }
    }

    downloadLatestInvoice() {
        const latestPayment = this.currentSubscription?.billingHistory?.[0];
        if (latestPayment) {
            this.downloadInvoice(latestPayment.transactionId);
        } else {
            this.showNotification('No invoices available for download', 'warning');
        }
    }

    async downloadInvoice(transactionId) {
        try {
            const response = await this.makeAPICall(`/api/subscriptions/gym/invoice/${transactionId}`);
            
            if (response.success) {
                const invoiceData = response.data;
                
                // Create invoice content
                const invoiceContent = `
INVOICE - ${invoiceData.invoiceNumber}
================================

Date: ${new Date(invoiceData.date).toLocaleDateString('en-IN')}
Transaction ID: ${invoiceData.transactionId}

Billed To:
${invoiceData.gymName}
${invoiceData.gymDetails.email}
${invoiceData.gymDetails.phone}
${invoiceData.gymDetails.address}
${invoiceData.gymDetails.city}, ${invoiceData.gymDetails.state}

Service Details:
${invoiceData.description}

Amount: ${invoiceData.currency} ${invoiceData.amount}
Payment Method: ${invoiceData.paymentMethod.charAt(0).toUpperCase() + invoiceData.paymentMethod.slice(1)}
Status: ${invoiceData.status.charAt(0).toUpperCase() + invoiceData.status.slice(1)}

Thank you for your subscription to Gym-Wale!
                `;
                
                // Download the invoice
                const blob = new Blob([invoiceContent], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${invoiceData.invoiceNumber}.txt`;
                link.click();
                window.URL.revokeObjectURL(url);
                
                this.showNotification('Invoice downloaded successfully!', 'success');
            } else {
                throw new Error(response.message || 'Failed to fetch invoice');
            }
        } catch (error) {
            console.error('Error downloading invoice:', error);
            this.showNotification(`Failed to download invoice: ${error.message}`, 'error');
        }
    }

    contactSupport() {
        // Open support contact method
        const email = 'support@gym-wale.com';
        const subject = 'Subscription Support Request';
        const body = `Dear Support Team,\n\nI need assistance with my subscription.\n\nGym ID: ${localStorage.getItem('gymId') || 'N/A'}\nCurrent Plan: ${this.currentSubscription?.planDisplayName || 'N/A'}\n\nPlease describe your issue below:\n\n`;
        
        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }

    reportIssue() {
        // Open issue reporting form or modal
        const issueUrl = 'https://gym-wale.com/support/report-issue';
        window.open(issueUrl, '_blank');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    showErrorState() {
        document.getElementById('currentPlanName').textContent = 'Error Loading';
        document.getElementById('currentPlanDescription').textContent = 'Unable to load subscription data';
        document.getElementById('subscriptionStatus').textContent = 'Error';
        document.getElementById('subscriptionStatus').style.background = 'rgba(244, 67, 54, 0.2)';
    }

    showNoSubscriptionState() {
        document.getElementById('currentPlanName').textContent = 'No Active Subscription';
        document.getElementById('currentPlanDescription').textContent = 'Please contact admin to activate subscription';
        document.getElementById('subscriptionStatus').textContent = 'Inactive';
        document.getElementById('subscriptionStatus').style.background = 'rgba(158, 158, 158, 0.2)';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `subscription-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .subscription-action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .plan-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }
    
    .renewal-option:hover {
        background: #f8f9fa !important;
    }
`;
document.head.appendChild(style);

// Initialize subscription manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.subscriptionManager = new SubscriptionManager();
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionManager;
}
