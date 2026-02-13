// Cash Validation Dialog System for Gym Admin
// Instant popup dialog for cash payment validation requests

class CashValidationDialog {
  constructor() {
    this.activeDialogs = new Map();
    this.processedValidations = new Set(); // Track processed validations
    this.initializeSystem();
    this.startPolling();
  }

  initializeSystem() {
    this.createDialogStyles();
    this.bindEventListeners();
    console.log('💰 Cash Validation Dialog System initialized');
  }

  createDialogStyles() {
    // Check if styles already exist
    if (document.getElementById('cashValidationDialogStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'cashValidationDialogStyles';
    style.textContent = `
      .cash-validation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        backdrop-filter: blur(8px);
        animation: fadeInBackdrop 0.3s ease-out;
      }

      @keyframes fadeInBackdrop {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .cash-validation-dialog {
        background: var(--card-bg, #ffffff);
        border-radius: 20px;
        padding: 32px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        animation: slideInDialog 0.4s ease-out;
        border: 1px solid var(--border-color, #e2e8f0);
        margin: 20px;
        position: relative;
      }

      @keyframes slideInDialog {
        from {
          transform: translateY(-30px) scale(0.95);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .validation-dialog-icon {
        font-size: 4rem;
        color: var(--primary, #1976d2);
        margin-bottom: 20px;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .validation-dialog-title {
        color: var(--primary, #1976d2);
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 16px;
      }

      .validation-dialog-subtitle {
        color: var(--text-secondary, #718096);
        font-size: 1.1rem;
        margin-bottom: 24px;
        line-height: 1.6;
      }

      .validation-details-grid {
        background: linear-gradient(135deg, var(--light, #f8f9fa) 0%, #fff 100%);
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        text-align: left;
        border: 1px solid var(--border-color, #e2e8f0);
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .validation-detail-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .validation-detail-label {
        font-weight: 600;
        color: var(--text-secondary, #718096);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .validation-detail-value {
        color: var(--text-primary, #2d3748);
        font-size: 1.1rem;
        font-weight: 500;
        word-break: break-word;
      }

      .validation-code-display {
        grid-column: 1 / -1;
        text-align: center;
        background: var(--primary, #1976d2);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-top: 16px;
      }

      .validation-code-label {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-bottom: 8px;
      }

      .validation-code-value {
        font-size: 2rem;
        font-weight: 700;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        letter-spacing: 3px;
        word-break: break-all;
      }

      .validation-amount-highlight {
        color: var(--primary, #1976d2) !important;
        font-size: 1.3rem !important;
        font-weight: 700 !important;
      }

      .validation-dialog-actions {
        display: flex;
        gap: 16px;
        justify-content: center;
        margin-top: 32px;
        flex-wrap: wrap;
      }

      .validation-btn {
        padding: 14px 28px;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 160px;
        justify-content: center;
      }

      .validation-btn-confirm {
        background: linear-gradient(135deg, var(--success, #4caf50) 0%, #45a049 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
      }

      .validation-btn-confirm:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
      }

      .validation-btn-reject {
        background: linear-gradient(135deg, var(--secondary, #f44336) 0%, #d32f2f 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
      }

      .validation-btn-reject:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
      }

      .validation-status-indicator {
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-pending {
        background: linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%);
        color: var(--warning, #ff9800);
        border: 1px solid var(--warning, #ff9800);
      }

      .status-processing {
        background: linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%);
        color: var(--info, #2196f3);
        border: 1px solid var(--info, #2196f3);
      }

      .validation-timer {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--warning, #ff9800);
        margin: 16px 0;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }

      .validation-timer.urgent {
        color: var(--secondary, #f44336);
        animation: pulse 1s infinite;
      }

      @media (max-width: 768px) {
        .cash-validation-dialog {
          width: 95%;
          margin: 10px;
          padding: 24px 20px;
        }
        
        .validation-details-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .validation-code-value {
          font-size: 1.5rem;
          letter-spacing: 2px;
        }
        
        .validation-dialog-actions {
          flex-direction: column;
        }
        
        .validation-btn {
          width: 100%;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  bindEventListeners() {
    // Listen for ESC key to close dialog
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllDialogs();
      }
    });
  }

  startPolling() {
    // Poll for new cash validation requests every 10 seconds
    this.pollingInterval = setInterval(() => {
      this.checkForValidationRequests();
    }, 10000);
    
    // Initial check
    setTimeout(() => {
      this.checkForValidationRequests();
    }, 2000);
  }

  async checkForValidationRequests() {
    try {
      const response = await fetch('/api/payments/pending-validations');
      if (response.ok) {
        const validations = await response.json();
        validations.forEach(validation => {
          // Skip if already processed or active
          if (!this.processedValidations.has(validation.validationCode) && 
              !this.activeDialogs.has(validation.validationCode)) {
            this.showValidationDialog(validation);
          }
        });
      }
    } catch (error) {
      console.error('Error checking for validation requests:', error);
    }
  }

  showValidationDialog(validationData) {
    // Prevent duplicate dialogs
    if (this.activeDialogs.has(validationData.validationCode)) return;

    const dialog = this.createDialogElement(validationData);
    document.body.appendChild(dialog);
    
    this.activeDialogs.set(validationData.validationCode, {
      element: dialog,
      data: validationData,
      startTime: Date.now()
    });

    // Start countdown timer
    this.startTimer(validationData.validationCode, validationData.expiresAt);

    console.log('💰 Showing cash validation dialog:', validationData.validationCode);
  }

  createDialogElement(validationData) {
    const overlay = document.createElement('div');
    overlay.className = 'cash-validation-overlay';
    overlay.id = `cashValidation_${validationData.validationCode}`;

    const expiresAt = new Date(validationData.expiresAt);
    const timeLeft = Math.max(0, Math.floor((expiresAt - new Date()) / 1000));

    overlay.innerHTML = `
      <div class="cash-validation-dialog">
        <div class="validation-status-indicator status-pending">
          <i class="fas fa-clock"></i> Pending
        </div>
        
        <div class="validation-dialog-icon">
          <i class="fas fa-money-bill-wave"></i>
        </div>
        
        <h2 class="validation-dialog-title">
          Cash Payment Validation
        </h2>
        
        <p class="validation-dialog-subtitle">
          A member is requesting cash payment validation at the counter
        </p>

        <div class="validation-timer" id="timer_${validationData.validationCode}">
          ${this.formatTime(timeLeft)}
        </div>

        <div class="validation-details-grid">
          <div class="validation-detail-item">
            <span class="validation-detail-label">Member Name</span>
            <span class="validation-detail-value">${validationData.memberName || 'N/A'}</span>
          </div>
          
          <div class="validation-detail-item">
            <span class="validation-detail-label">Email</span>
            <span class="validation-detail-value">${validationData.email || 'N/A'}</span>
          </div>
          
          <div class="validation-detail-item">
            <span class="validation-detail-label">Phone</span>
            <span class="validation-detail-value">${validationData.phone || 'N/A'}</span>
          </div>
          
          <div class="validation-detail-item">
            <span class="validation-detail-label">Plan Selected</span>
            <span class="validation-detail-value">${validationData.planName || 'N/A'}</span>
          </div>
          
          <div class="validation-detail-item">
            <span class="validation-detail-label">Duration</span>
            <span class="validation-detail-value">${validationData.duration || 'N/A'}</span>
          </div>
          
          <div class="validation-detail-item">
            <span class="validation-detail-label">Payment Amount</span>
            <span class="validation-detail-value validation-amount-highlight">₹${validationData.amount || '0'}</span>
          </div>
          
          <div class="validation-code-display">
            <div class="validation-code-label">Validation Code</div>
            <div class="validation-code-value">${validationData.validationCode}</div>
          </div>
        </div>

        <div class="validation-dialog-actions">
          <button class="validation-btn validation-btn-confirm" onclick="cashValidationDialog.confirmPayment('${validationData.validationCode}')">
            <i class="fas fa-check"></i>
            Confirm Payment & Add Member
          </button>
          
          <button class="validation-btn validation-btn-reject" onclick="cashValidationDialog.rejectPayment('${validationData.validationCode}')">
            <i class="fas fa-times"></i>
            Reject Payment
          </button>
        </div>
      </div>
    `;

    return overlay;
  }

  startTimer(validationCode, expiresAt) {
    const timer = setInterval(() => {
      const timeLeft = Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000));
      const timerElement = document.getElementById(`timer_${validationCode}`);
      
      if (timerElement) {
        timerElement.textContent = this.formatTime(timeLeft);
        
        if (timeLeft <= 30) {
          timerElement.classList.add('urgent');
        }
        
        if (timeLeft <= 0) {
          clearInterval(timer);
          this.expireValidation(validationCode);
        }
      } else {
        clearInterval(timer);
      }
    }, 1000);

    // Store timer reference
    if (this.activeDialogs.has(validationCode)) {
      this.activeDialogs.get(validationCode).timer = timer;
    }
  }

  async confirmPayment(validationCode) {
    const dialogData = this.activeDialogs.get(validationCode);
    if (!dialogData) return;

    // Prevent multiple clicks
    if (dialogData.processing) {
      console.log('Payment confirmation already in progress');
      return;
    }

    // First check validation status to avoid unnecessary API calls
    try {
      const statusCheck = await this.checkValidationStatus(validationCode);
      if (statusCheck && statusCheck.status === 'confirmed') {
        this.showSuccessMessage(validationCode, `✅ This validation has already been confirmed! Member is already registered.`);
        
        if (window.notificationSystem) {
          window.notificationSystem.addNotificationUnified(
            'Already Confirmed',
            'This payment validation has already been processed successfully',
            'info'
          );
        }
        
        this.removeFromPolling(validationCode);
        setTimeout(() => {
          this.closeDialog(validationCode);
        }, 3000);
        
        return;
      }
    } catch (statusError) {
      console.log('Status check failed, proceeding with confirmation:', statusError.message);
    }

    try {
      // Mark as processing and disable buttons
      dialogData.processing = true;
      this.updateDialogStatus(validationCode, 'processing', 'Processing...');
      this.disableDialogButtons(validationCode);

      console.log('Confirming cash validation:', validationCode);

      // Step 1: Confirm the cash validation first
      const validationResponse = await fetch(`/api/payments/confirm-cash-validation/${validationCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!validationResponse.ok) {
        const errorText = await validationResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }

        // Handle specific validation errors
        if (validationResponse.status === 400) {
          if (errorData.error && errorData.error.includes('confirmed, cannot confirm')) {
            // This validation has already been confirmed
            this.showSuccessMessage(validationCode, `✅ This validation has already been confirmed! Member is already registered.`);
            
            if (window.notificationSystem) {
              window.notificationSystem.addNotificationUnified(
                'Already Confirmed',
                'This payment validation has already been processed successfully',
                'info'
              );
            }
            
            // Remove from polling and close dialog after delay
            this.removeFromPolling(validationCode);
            setTimeout(() => {
              this.closeDialog(validationCode);
            }, 3000);
            
            return; // Exit early, no need to process further
          } else if (errorData.error && errorData.error.includes('expired')) {
            throw new Error('Validation code has expired. Please create a new validation.');
          }
        }
        
        throw new Error(`Failed to confirm validation: ${validationResponse.status} - ${errorData.error || errorText}`);
      }

      const validationResult = await validationResponse.json();
      console.log('Validation confirmed and member created:', validationResult);

      // Handle different response formats (member vs memberData)
      const memberInfo = validationResult.member || validationResult.memberData;
      const memberName = memberInfo?.name || memberInfo?.memberName || 'Member';
      const membershipId = memberInfo?.membershipId || memberInfo?.id || 'N/A';
      const planName = memberInfo?.planSelected || memberInfo?.membershipPlan || memberInfo?.planName || '';
      const duration = memberInfo?.monthlyPlan || memberInfo?.duration || '';

      // Show detailed success dialog instead of redirect
      this.showDetailedSuccessDialog(validationCode, {
        memberName,
        membershipId,
        planName,
        duration,
        amount: validationResult.validation?.amount || memberInfo?.paymentAmount || 0,
        email: memberInfo?.email || '',
        phone: memberInfo?.phone || '',
        gymName: validationResult.gym?.name || 'Your Gym',
        validationCode: validationResult.validation?.validationCode || validationCode
      });

      // Stop polling for this validation to prevent duplicates
      this.removeFromPolling(validationCode);
      
      // Close the validation dialog after showing success
      setTimeout(() => {
        this.closeDialog(validationCode);
      }, 1000);

    } catch (error) {
      console.error('Error confirming payment:', error);
      
      // Re-enable buttons and reset processing flag
      dialogData.processing = false;
      this.enableDialogButtons(validationCode);
      
      // Determine error message based on error type
      let errorMessage = 'Failed to confirm payment. Please try again.';
      
      if (error.message.includes('expired')) {
        errorMessage = '⏰ Validation code has expired. Please create a new validation.';
      } else if (error.message.includes('confirmed')) {
        errorMessage = '✅ This validation has already been confirmed.';
      } else if (error.message.includes('not found')) {
        errorMessage = '❌ Validation code not found. Please check the code.';
      } else if (error.message.includes('duplicate member')) {
        errorMessage = '⚠️ Member already exists. Using duplicate resolution dialog.';
      }
      
      // Show specific error message
      this.showErrorMessage(validationCode, errorMessage);
      
      // If validation is expired or not found, remove from polling
      if (error.message.includes('expired') || error.message.includes('not found')) {
        this.removeFromPolling(validationCode);
        setTimeout(() => {
          this.closeDialog(validationCode);
        }, 5000);
      } else {
        // Reset dialog status after 3 seconds for retryable errors
        setTimeout(() => {
          this.updateDialogStatus(validationCode, 'pending', 'Pending');
        }, 3000);
      }
    }
  }

  async checkValidationStatus(validationCode) {
    try {
      const response = await fetch(`/api/payments/validation-status/${validationCode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Status check failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error checking validation status:', error);
      throw error;
    }
  }

  async rejectPayment(validationCode) {
    const dialogData = this.activeDialogs.get(validationCode);
    if (!dialogData) return;

    // Prevent multiple clicks
    if (dialogData.processing) {
      console.log('Payment rejection already in progress');
      return;
    }

    try {
      // Mark as processing and disable buttons
      dialogData.processing = true;
      this.updateDialogStatus(validationCode, 'processing', 'Rejecting...');
      this.disableDialogButtons(validationCode);

      // Reject the validation
      const response = await fetch(`/api/payments/reject-cash-validation/${validationCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (response.ok) {
        // Show rejection message
        this.showErrorMessage(validationCode, '❌ Payment rejected. Member was not registered.');
        
        // Notify notification system if available
        if (window.notificationSystem) {
          window.notificationSystem.addNotificationUnified(
            'Cash Payment Rejected',
            `Cash payment validation ${validationCode} was rejected`,
            'warning'
          );
        }

        // Stop polling for this validation to prevent duplicates
        this.removeFromPolling(validationCode);

        // Close dialog after 3 seconds
        setTimeout(() => {
          this.closeDialog(validationCode);
        }, 3000);

      } else {
        throw new Error('Failed to reject payment');
      }

    } catch (error) {
      console.error('Error rejecting payment:', error);
      
      // Re-enable buttons and reset processing flag
      dialogData.processing = false;
      this.enableDialogButtons(validationCode);
      
      // Show error message
      this.showErrorMessage(validationCode, 'Failed to reject payment. Please try again.');
      
      // Reset dialog status after 3 seconds
      setTimeout(() => {
        this.updateDialogStatus(validationCode, 'pending', 'Pending');
      }, 3000);
    }
  }

  updateDialogStatus(validationCode, status, text) {
    const dialog = document.getElementById(`cashValidation_${validationCode}`);
    if (!dialog) return;

    const statusIndicator = dialog.querySelector('.validation-status-indicator');
    if (statusIndicator) {
      statusIndicator.className = `validation-status-indicator status-${status}`;
      statusIndicator.innerHTML = `<i class="fas fa-${status === 'processing' ? 'spinner fa-spin' : 'clock'}"></i> ${text}`;
    }
  }

  showSuccessMessage(validationCode, message) {
    const dialog = document.getElementById(`cashValidation_${validationCode}`);
    if (!dialog) return;

    const actionsContainer = dialog.querySelector('.validation-dialog-actions');
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #e8f5e8 0%, #a5d6a7 100%); color: #2e7d32; padding: 16px 24px; border-radius: 12px; font-weight: 600; text-align: center; width: 100%;">
          ${message}
        </div>
      `;
    }
  }

  showErrorMessage(validationCode, message) {
    const dialog = document.getElementById(`cashValidation_${validationCode}`);
    if (!dialog) return;

    const actionsContainer = dialog.querySelector('.validation-dialog-actions');
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #ffebee 0%, #ef9a9a 100%); color: #c62828; padding: 16px 24px; border-radius: 12px; font-weight: 600; text-align: center; width: 100%;">
          ${message}
        </div>
      `;
    }
  }

  expireValidation(validationCode) {
    this.showErrorMessage(validationCode, '⏰ Validation expired. Time limit exceeded.');
    
    setTimeout(() => {
      this.closeDialog(validationCode);
    }, 3000);
  }

  disableDialogButtons(validationCode) {
    const dialog = document.getElementById(`cash-validation-dialog-${validationCode}`);
    if (dialog) {
      const buttons = dialog.querySelectorAll('.validation-btn');
      buttons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
      });
    }
  }

  enableDialogButtons(validationCode) {
    const dialog = document.getElementById(`cash-validation-dialog-${validationCode}`);
    if (dialog) {
      const buttons = dialog.querySelectorAll('.validation-btn');
      buttons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
      });
    }
  }

  removeFromPolling(validationCode) {
    // Mark as processed to prevent showing again
    this.processedValidations.add(validationCode);
    console.log('💰 Removed from polling:', validationCode);
  }

  closeDialog(validationCode) {
    const dialogData = this.activeDialogs.get(validationCode);
    if (!dialogData) return;

    // Clear timer
    if (dialogData.timer) {
      clearInterval(dialogData.timer);
    }

    // Remove dialog element
    if (dialogData.element && dialogData.element.parentNode) {
      dialogData.element.style.animation = 'fadeOutBackdrop 0.3s ease-out';
      setTimeout(() => {
        if (dialogData.element.parentNode) {
          dialogData.element.parentNode.removeChild(dialogData.element);
        }
      }, 300);
    }

    // Remove from active dialogs
    this.activeDialogs.delete(validationCode);

    console.log('💰 Closed cash validation dialog:', validationCode);
  }

  closeAllDialogs() {
    this.activeDialogs.forEach((_, validationCode) => {
      this.closeDialog(validationCode);
    });
  }

  formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  handleDuplicateMember(validationCode, existingMember, newMemberData) {
    const dialogData = this.activeDialogs.get(validationCode);
    if (!dialogData) return;

    // Create duplicate member resolution dialog
    const duplicateDialog = document.createElement('div');
    duplicateDialog.className = 'duplicate-member-overlay';
    duplicateDialog.innerHTML = `
      <div class="duplicate-member-dialog">
        <div class="duplicate-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Member Already Exists</h3>
        </div>
        
        <div class="duplicate-content">
          <div class="existing-member-info">
            <h4>📋 Existing Member Details</h4>
            <div class="member-details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${existingMember.memberName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${existingMember.email}</span>
              </div>
              <div class="detail-row">
                <span class="label">Phone:</span>
                <span class="value">${existingMember.phone}</span>
              </div>
              <div class="detail-row">
                <span class="label">Member ID:</span>
                <span class="value highlight">${existingMember.membershipId}</span>
              </div>
            </div>
          </div>

          <div class="new-member-info">
            <h4>🆕 New Registration Details</h4>
            <div class="member-details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${newMemberData.memberName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${newMemberData.email}</span>
              </div>
              <div class="detail-row">
                <span class="label">Phone:</span>
                <span class="value">${newMemberData.phone}</span>
              </div>
              <div class="detail-row">
                <span class="label">Plan:</span>
                <span class="value">${newMemberData.membershipPlan}</span>
              </div>
            </div>
          </div>

          <div class="resolution-options">
            <h4>⚡ Choose Action</h4>
            <p>A member with this email or phone number already exists. How would you like to proceed?</p>
            
            <div class="option-buttons">
              <button class="option-btn primary" onclick="window.cashValidationDialog.updateExistingMember('${validationCode}', '${existingMember.membershipId}', '${newMemberData.membershipPlan}')">
                <i class="fas fa-sync-alt"></i>
                Update Existing Member
                <small>Add new membership plan to existing member</small>
              </button>
              
              <button class="option-btn secondary" onclick="window.cashValidationDialog.editMemberDetails('${validationCode}')">
                <i class="fas fa-edit"></i>
                Edit Details
                <small>Modify email or phone number</small>
              </button>
              
              <button class="option-btn warning" onclick="window.cashValidationDialog.cancelDuplicateRegistration('${validationCode}')">
                <i class="fas fa-times"></i>
                Cancel Registration
                <small>Cancel this registration attempt</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles for duplicate dialog
    const styles = `
      <style>
        .duplicate-member-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 20000;
          animation: fadeIn 0.3s ease-out;
        }

        .duplicate-member-dialog {
          background: white;
          border-radius: 16px;
          max-width: 700px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          animation: slideInUp 0.4s ease-out;
        }

        .duplicate-header {
          background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
          color: white;
          padding: 24px;
          text-align: center;
          border-radius: 16px 16px 0 0;
        }

        .duplicate-header i {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .duplicate-header h3 {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .duplicate-content {
          padding: 24px;
        }

        .existing-member-info, .new-member-info, .resolution-options {
          margin-bottom: 24px;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .existing-member-info {
          background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
          border-color: #fca5a5;
        }

        .new-member-info {
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
          border-color: #90caf9;
        }

        .resolution-options {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-color: #0ea5e9;
        }

        .duplicate-content h4 {
          color: #1f2937;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .member-details {
          display: grid;
          gap: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .detail-row .label {
          font-weight: 600;
          color: #4b5563;
        }

        .detail-row .value {
          font-weight: 500;
          color: #1f2937;
        }

        .detail-row .value.highlight {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .option-buttons {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }

        .option-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s ease;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .option-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .option-btn:hover::before {
          left: 100%;
        }

        .option-btn.primary {
          background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .option-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        }

        .option-btn.secondary {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);
        }

        .option-btn.secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(25, 118, 210, 0.4);
        }

        .option-btn.warning {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
        }

        .option-btn.warning:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(244, 67, 54, 0.4);
        }

        .option-btn small {
          display: block;
          font-size: 0.8rem;
          font-weight: 400;
          opacity: 0.9;
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .duplicate-member-dialog {
            width: 95%;
            margin: 10px;
          }
          
          .duplicate-content {
            padding: 16px;
          }
          
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      </style>
    `;

    // Add styles to document head
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = styles;
    document.head.appendChild(styleSheet);

    // Add dialog to document
    document.body.appendChild(duplicateDialog);

    // Re-enable buttons on original dialog
    dialogData.processing = false;
    this.enableDialogButtons(validationCode);
  }

  showDetailedSuccessDialog(validationCode, memberData) {
    // Create detailed success modal
    const successModal = document.createElement('div');
    successModal.className = 'cash-validation-success-modal';
    successModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    `;

    successModal.innerHTML = `
      <div class="success-dialog" style="
        background: white;
        border-radius: 20px;
        padding: 0;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        overflow: hidden;
      ">
        <div class="success-header" style="
          background: linear-gradient(135deg, #4caf50, #2e7d32);
          color: white;
          padding: 30px;
          text-align: center;
        ">
          <div style="font-size: 4rem; margin-bottom: 15px;">🎉</div>
          <h2 style="margin: 0; font-size: 1.8rem;">Payment Confirmed!</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Member successfully registered</p>
        </div>
        
        <div class="success-content" style="padding: 30px;">
          <div class="member-details" style="
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
          ">
            <div class="detail-row" style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            ">
              <span style="color: #666; font-weight: 500;">Member Name:</span>
              <span style="font-weight: 600; color: #333;">${memberData.memberName}</span>
            </div>
            
            <div class="detail-row" style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            ">
              <span style="color: #666; font-weight: 500;">Member ID:</span>
              <span style="font-weight: 600; color: #2196f3;">${memberData.membershipId}</span>
            </div>
            
            <div class="detail-row" style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            ">
              <span style="color: #666; font-weight: 500;">Plan:</span>
              <span style="font-weight: 600; color: #333;">${memberData.planName}</span>
            </div>
            
            <div class="detail-row" style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            ">
              <span style="color: #666; font-weight: 500;">Duration:</span>
              <span style="font-weight: 600; color: #333;">${memberData.duration} Month(s)</span>
            </div>
            
            <div class="detail-row" style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            ">
              <span style="color: #666; font-weight: 500;">Amount:</span>
              <span style="font-weight: 600; color: #4caf50; font-size: 1.1rem;">₹${memberData.amount}</span>
            </div>
            
            <div class="detail-row" style="
              display: flex;
              justify-content: space-between;
              margin-bottom: 0;
            ">
              <span style="color: #666; font-weight: 500;">Status:</span>
              <span style="
                background: #4caf50;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
              ">ACTIVE</span>
            </div>
          </div>
          
          <div class="success-actions" style="
            display: flex;
            gap: 15px;
            justify-content: center;
          ">
            <button onclick="this.closest('.cash-validation-success-modal').remove()" style="
              background: #2196f3;
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 10px;
              cursor: pointer;
              font-weight: 600;
              font-size: 1rem;
              transition: all 0.3s ease;
            " onmouseover="this.style.background='#1976d2'" onmouseout="this.style.background='#2196f3'">
              <i class="fas fa-check" style="margin-right: 8px;"></i>
              Done
            </button>
            
            <button onclick="window.open('/frontend/gymadmin/members.html', '_blank')" style="
              background: white;
              color: #2196f3;
              border: 2px solid #2196f3;
              padding: 15px 30px;
              border-radius: 10px;
              cursor: pointer;
              font-weight: 600;
              font-size: 1rem;
              transition: all 0.3s ease;
            " onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
              <i class="fas fa-users" style="margin-right: 8px;"></i>
              View Members
            </button>
          </div>
        </div>
      </div>
    `;

    // Add animation CSS
    if (!document.getElementById('successAnimations')) {
      const style = document.createElement('style');
      style.id = 'successAnimations';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(-50px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(successModal);

    // Send proper notification to gym admin system - only success notifications, no pending payment alerts
    if (window.notificationSystem) {
      window.notificationSystem.addNotificationUnified(
        'Cash Payment Confirmed',
        `${memberData.memberName} (${memberData.membershipId}) successfully registered with ${memberData.planName} plan`,
        'success'
      );
    }

    // Remove modal when clicking outside
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.remove();
      }
    });
  }

  async updateExistingMember(validationCode, existingMemberId, newPlan) {
    try {
      console.log('Updating existing member:', existingMemberId, 'with new plan:', newPlan);
      
      const response = await fetch('/api/members/add-membership-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify({
          memberId: existingMemberId,
          newPlan: newPlan,
          paymentMethod: 'cash',
          paymentStatus: 'paid'
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success and close dialogs
        this.showSuccessMessage(validationCode, `✅ Membership plan updated successfully! Redirecting to completion page...`);
        this.closeDuplicateDialog();
        
        // Notify
        if (window.notificationSystem) {
          window.notificationSystem.addNotificationUnified(
            'Membership Updated',
            `New plan added to existing member successfully`,
            'success'
          );
        }
        
        // Prepare data for registration complete page
        const completionData = {
          memberId: result.member.membershipId,
          memberName: result.member.name,
          email: result.member.email,
          phone: result.member.phone,
          gymName: 'Your Gym', // This should come from gym data
          membershipPlan: result.member.membershipPlan,
          paymentStatus: 'paid',
          status: 'active',
          date: new Date().toISOString(),
          isUpdate: true
        };
        
        // Close dialog and redirect after short delay
        setTimeout(() => {
          this.closeDialog(validationCode);
          
          // Build registration complete URL with update flag
          const params = new URLSearchParams({
            memberId: completionData.memberId,
            memberName: completionData.memberName,
            email: completionData.email,
            phone: completionData.phone,
            gymName: completionData.gymName,
            membershipPlan: completionData.membershipPlan,
            paymentStatus: completionData.paymentStatus,
            date: completionData.date,
            membershipUpdate: 'true',
            update: 'true'
          });
          
          // Redirect to registration complete page with update flag
          const completionUrl = `/frontend/registration-complete.html?${params.toString()}`;
          console.log('🎉 Redirecting to completion page:', completionUrl);
          
          // Open in new tab for gym admin convenience
          window.open(completionUrl, '_blank');
        }, 2000);
        
      } else {
        throw new Error('Failed to update existing member');
      }
      
    } catch (error) {
      console.error('Error updating existing member:', error);
      this.showErrorMessage(validationCode, `❌ Error updating member: ${error.message}`);
      
      if (window.notificationSystem) {
        window.notificationSystem.addNotificationUnified(
          'Update Failed',
          'Failed to update existing member. Please try again.',
          'error'
        );
      }
    }
  }

  editMemberDetails(validationCode) {
    alert('Edit Details feature coming soon! For now, please use different email/phone or update the existing member.');
    this.closeDuplicateDialog();
  }

  cancelDuplicateRegistration(validationCode) {
    // Close duplicate dialog
    this.closeDuplicateDialog();
    
    // Show cancelled message on original dialog
    this.showErrorMessage(validationCode, 'Registration cancelled due to duplicate member.');
    
    // Close original dialog after 3 seconds
    setTimeout(() => {
      this.closeDialog(validationCode);
    }, 3000);
  }

  closeDuplicateDialog() {
    const duplicateOverlay = document.querySelector('.duplicate-member-overlay');
    if (duplicateOverlay) {
      duplicateOverlay.style.opacity = '0';
      setTimeout(() => {
        duplicateOverlay.remove();
      }, 300);
    }
  }

  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.closeAllDialogs();
  }
}

// Initialize cash validation dialog system
let cashValidationDialog = null;

document.addEventListener('DOMContentLoaded', function() {
  // Wait for the main profile to load
  setTimeout(() => {
    if (window.location.pathname.includes('gymadmin')) {
      cashValidationDialog = new CashValidationDialog();
      window.cashValidationDialog = cashValidationDialog;
      console.log('💰 Cash Validation Dialog System ready');
    }
  }, 2000);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CashValidationDialog };
}
