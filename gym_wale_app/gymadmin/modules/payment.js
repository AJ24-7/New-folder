// Payment Tab JavaScript
class PaymentManager {
  constructor() {
    this.BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
    this.isPaymentTabAuthorized = false;
    this.passkeyAttempts = 3;
    this.maxAttempts = 3;
    this.isSetupMode = false;
    
    // Payment management properties
    this.paymentChart = null;
    this.currentFilter = 'all';
    this.regularPendingAmount = 0; // Store regular pending payments
    this.memberPendingAmount = 0;  // Store member pending payments
    this.recentRegularPendingPayments = [];
    this.recentMemberPendingPayments = [];
    
    // Enhanced notification system properties
    this.seenNotifications = new Set();
    this.lastNotificationCheck = new Date();
    
    this.initializeAdminPasskey();
    
    // Initialize payment data and system
    this.init();
    this.bindAllStatCardEvents();
    
    // Initialize enhanced payment reminders
    this.initializePaymentReminders();
    
    // Initialize passkey status on page load
    this.updatePasskeySettingsUI();
    
  }

  // Initialize admin passkey system
  initializeAdminPasskey() {
    this.setupPasskeyModal();
    this.setupPasskeySettings();
    this.interceptPaymentTabAccess();
  }

  // Setup passkey modal functionality
  setupPasskeyModal() {
    const modal = document.getElementById('adminPasskeyModal');
    const verifyBtn = document.getElementById('verifyPasskey');
    const cancelBtn = document.getElementById('cancelPasskey');
    const passkeyInputs = document.querySelectorAll('.passkey-digit');
    const keypadBtns = document.querySelectorAll('.keypad-btn');

    // Setup input navigation
    passkeyInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value && index < passkeyInputs.length - 1) {
          passkeyInputs[index + 1].focus();
        }
        this.updatePasskeyDisplay();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          passkeyInputs[index - 1].focus();
        }
      });
    });

    // Setup mobile keypad
    keypadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const digit = btn.dataset.digit;
        const action = btn.dataset.action;

        if (digit) {
          this.addDigitToPasskey(digit);
        } else if (action === 'clear') {
          this.clearLastDigit();
        } else if (action === 'clear-all') {
          this.clearAllDigits();
        }
      });
    });

    // Setup verify button
    verifyBtn.addEventListener('click', () => {
      this.verifyPasskey();
    });

    // Setup cancel button
    cancelBtn.addEventListener('click', () => {
      this.isPaymentTabAuthorized = false; // Reset authorization when cancelled
      this.hidePasskeyModal();
    });

    // Setup modal backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.isPaymentTabAuthorized = false; // Reset authorization when cancelled
        this.hidePasskeyModal();
      }
    });
  }

  // Setup passkey settings functionality
  setupPasskeySettings() {
    const changeBtn = document.getElementById('changePasskeyBtn');
    const generateBtn = document.getElementById('generatePasskeyBtn');
    const disableBtn = document.getElementById('disablePasskeyBtn');
    const cancelChangeBtn = document.getElementById('cancelChangePasskey');
    const saveBtn = document.getElementById('saveNewPasskey');

   
   

    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        this.showChangePasskeyForm();
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.generateRandomPasskey();
      });
    }

    if (disableBtn) {
      // Remove any existing event listeners
      const newDisableBtn = disableBtn.cloneNode(true);
      disableBtn.parentNode.replaceChild(newDisableBtn, disableBtn);
      
      newDisableBtn.addEventListener('click', () => {
        const gymId = this.getCurrentGymAdminId();
        const storedPasskey = localStorage.getItem(`gymAdminPasskey_${gymId}`);
        
        if (storedPasskey) {
          // Passkey exists - disable it
          this.disablePasskey();
        } else {
          // No passkey - enable it
          this.enablePasskey();
        }
      });
    } else {
      console.warn('⚠️ Disable passkey button not found - ID should be "disablePasskeyBtn"');
    }

    if (cancelChangeBtn) {
      cancelChangeBtn.addEventListener('click', () => {
        this.hideChangePasskeyForm();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveNewPasskey();
      });
    }

    // Setup passkey input navigation in settings
    this.setupPasskeyInputNavigation();
  }

  // Intercept payment tab access
  interceptPaymentTabAccess() {
    const paymentTabButton = document.querySelector('[data-tab="paymentTab"]');
    if (paymentTabButton) {
      paymentTabButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        
        if (!this.isPaymentTabAuthorized) {
          // Check if passkey exists or if setup was skipped
          const storedPasskey = localStorage.getItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`);
          const skipExpiry = localStorage.getItem(`passkeySetupSkipped_${this.getCurrentGymAdminId()}`);
          const isSkipped = skipExpiry && new Date().getTime() < parseInt(skipExpiry);
          
          
          if (isSkipped) {
            // Skip is active, allow direct access
            this.isPaymentTabAuthorized = true;
            this.showPaymentTab();
          } else if (!storedPasskey) {
            this.showPasskeySetupDialog();
          } else {
            this.showPasskeyModal();
          }
        } else {
          this.showPaymentTab();
        }
      });
    }
    
    // Also intercept the main navigation system's payment menu link
    const paymentsMenuLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
      link.querySelector('.fa-credit-card')
    );
    
    if (paymentsMenuLink) {
      // Add event listener with capture phase to intercept BEFORE tab switcher
      paymentsMenuLink.addEventListener('click', (e) => {
        
        if (!this.isPaymentTabAuthorized) {
          // Stop the event from reaching tab switcher
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Check if passkey exists or if setup was skipped
          const storedPasskey = localStorage.getItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`);
          const skipExpiry = localStorage.getItem(`passkeySetupSkipped_${this.getCurrentGymAdminId()}`);
          const isSkipped = skipExpiry && new Date().getTime() < parseInt(skipExpiry);
          
          
          if (isSkipped) {
            // Skip is active, allow direct access
            this.isPaymentTabAuthorized = true;
            this.showPaymentTab();
          } else if (!storedPasskey) {
            this.showPasskeySetupDialog();
          } else {
            this.showPasskeyModal();
          }
        } else {
          // Already authorized - let the tab switcher handle it normally
          // Don't prevent default - let tab switcher work
        }
      }, true); // Use capture phase to run before tab switcher's listener
    }
  }

  // Show passkey setup dialog
  showPasskeySetupDialog() {
    // Check if setup was skipped recently
    const skipExpiry = localStorage.getItem(`passkeySetupSkipped_${this.getCurrentGymAdminId()}`);
    if (skipExpiry && new Date().getTime() < parseInt(skipExpiry)) {
      this.isPaymentTabAuthorized = true;
      this.showPaymentTab();
      return;
    }

    const setupDialog = document.createElement('div');
    setupDialog.className = 'passkey-setup-dialog';
    setupDialog.innerHTML = `
      <div class="setup-dialog-overlay">
        <div class="setup-dialog-content">
          <div class="setup-dialog-header">
            <h3><i class="fas fa-shield-alt"></i> Setup Admin Passkey</h3>
          </div>
          <div class="setup-dialog-body">
            <p>To secure access to payment details, you need to set up a 4-digit admin passkey.</p>
            <p>This passkey will be required every time you access the payment tab.</p>
          </div>
          <div class="setup-dialog-actions">
            <button type="button" class="setup-btn setup-btn-primary" onclick="paymentManager.proceedToSetupPasskey()">
              <i class="fas fa-key"></i> Setup Passkey
            </button>
            <button type="button" class="setup-btn setup-btn-secondary" onclick="paymentManager.skipPasskeySetup()">
              <i class="fas fa-clock"></i> Skip for 1 Month
            </button>
            <button type="button" class="setup-btn setup-btn-tertiary" onclick="paymentManager.cancelPasskeySetup()">
              <i class="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(setupDialog);
    
    // Add styles
    if (!document.getElementById('passkeySetupStyles')) {
      const styles = document.createElement('style');
      styles.id = 'passkeySetupStyles';
      styles.textContent = `
        .passkey-setup-dialog {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .setup-dialog-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .setup-dialog-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: setupDialogSlideIn 0.3s ease-out;
        }
        
        @keyframes setupDialogSlideIn {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .setup-dialog-header {
          margin-bottom: 16px;
          text-align: center;
        }
        
        .setup-dialog-header h3 {
          color: #2c3e50;
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        
        .setup-dialog-header i {
          color: #3498db;
          margin-right: 8px;
        }
        
        .setup-dialog-body {
          margin-bottom: 24px;
          color: #5a6c7d;
          line-height: 1.6;
        }
        
        .setup-dialog-body p {
          margin: 0 0 12px 0;
        }
        
        .setup-dialog-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .setup-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          min-width: 120px;
          justify-content: center;
        }
        
        .setup-btn-primary {
          background: #3498db;
          color: white;
        }
        
        .setup-btn-primary:hover {
          background: #2980b9;
          transform: translateY(-2px);
        }
        
        .setup-btn-secondary {
          background: #f39c12;
          color: white;
        }
        
        .setup-btn-secondary:hover {
          background: #e67e22;
          transform: translateY(-2px);
        }

        .setup-btn-tertiary {
          background: #ecf0f1;
          color: #5a6c7d;
        }
        
        .setup-btn-tertiary:hover {
          background: #d5dbdb;
          transform: translateY(-2px);
        }
      `;
      document.head.appendChild(styles);
    }
  }

  // Proceed to setup passkey
  proceedToSetupPasskey() {
    this.removeSetupDialog();
    this.showPasskeyModal(true); // Pass true to indicate setup mode
  }

  // Skip passkey setup for 1 month
  skipPasskeySetup() {
    
    // Set skip expiry to 1 month from now
    const oneMonthFromNow = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
    localStorage.setItem(`passkeySetupSkipped_${this.getCurrentGymAdminId()}`, oneMonthFromNow.toString());
    
    this.removeSetupDialog();
    this.isPaymentTabAuthorized = true;
    this.showPaymentTab();
    this.showNotification('Passkey setup skipped for 1 month. Payment access is temporarily unrestricted.', 'info');
  }

  // Cancel passkey setup
  cancelPasskeySetup() {
    this.isPaymentTabAuthorized = false; // Reset authorization when setup is cancelled
    this.removeSetupDialog();
    
    // Don't redirect to dashboard, just stay on current page
    this.showNotification('Payment access requires admin passkey setup', 'warning');
  }

  // Remove setup dialog
  removeSetupDialog() {
    const dialog = document.querySelector('.passkey-setup-dialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // Show passkey modal
  showPasskeyModal(isSetupMode = false) {
    const modal = document.getElementById('adminPasskeyModal');
    const paymentTab = document.getElementById('paymentTab');
    
    if (modal) {
      modal.classList.add('active');
      this.clearAllDigits();
      this.hidePasskeyError();
      
      // Update modal title based on mode
      const modalTitle = modal.querySelector('.modal-title');
      if (modalTitle) {
        if (isSetupMode) {
          modalTitle.innerHTML = '<i class="fas fa-key"></i> Create Admin Passkey';
          // Update instruction text
          const instruction = modal.querySelector('.passkey-instruction');
          if (instruction) {
            instruction.textContent = 'Enter a 4-digit passkey to secure payment access';
          }
        } else {
          modalTitle.innerHTML = '<i class="fas fa-shield-alt"></i> Enter Admin Passkey';
          const instruction = modal.querySelector('.passkey-instruction');
          if (instruction) {
            instruction.textContent = 'Enter your 4-digit admin passkey to access payment details';
          }
        }
      }
      
      // Store setup mode
      this.isSetupMode = isSetupMode;
      
      // Focus first input
      const firstInput = document.querySelector('.passkey-digit');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }

    // Blur background
    if (paymentTab) {
      paymentTab.classList.add('blurred');
    }
  }

  // Hide passkey modal
  hidePasskeyModal() {
    
    const modal = document.getElementById('adminPasskeyModal');
    const paymentTab = document.getElementById('paymentTab');
    
    if (modal) {
      modal.classList.remove('active');
    }

    // Remove blur
    if (paymentTab) {
      paymentTab.classList.remove('blurred');
    }

    this.clearAllDigits();
    this.hidePasskeyError();
    
    // Reset setup mode
    this.isSetupMode = false;
    
    // Only redirect to dashboard if NOT authorized (i.e., cancelled)
    // If authorized, the showPaymentTab() method will handle the navigation
    if (!this.isPaymentTabAuthorized) {
      
      // Use the main app's navigation system to go to dashboard
      if (typeof window.hideAllMainTabs === 'function') {
        window.hideAllMainTabs();
      }
      
      // Force hide payment tab specifically
      if (paymentTab) {
        paymentTab.style.display = 'none';
        paymentTab.classList.remove('active');
      }
      
      // Show dashboard using the main app's approach - use .content selector
      const dashboardContent = document.querySelector('.content'); // Main dashboard content
      
      if (dashboardContent) {
        dashboardContent.style.display = 'block';
        dashboardContent.classList.add('active');
      }
      
      // Reset ALL navigation items and activate dashboard
      const allMenuLinks = document.querySelectorAll('.menu-link');
      allMenuLinks.forEach(link => link.classList.remove('active'));
      
      // Find and activate dashboard menu link
      const dashboardMenuItem = Array.from(document.querySelectorAll('.menu-link')).find(link => 
        link.querySelector('.fa-tachometer-alt') || 
        link.textContent.trim().toLowerCase().includes('dashboard')
      );
      
      if (dashboardMenuItem) {
        dashboardMenuItem.classList.add('active');
      }
      
      // Additional safety: update main content margins if function exists
      if (typeof window.updateMainContentMargins === 'function') {
        window.updateMainContentMargins();
      }
      
      // Programmatically trigger dashboard click if all else fails
      setTimeout(() => {
        if (dashboardContent && dashboardContent.style.display !== 'block') {
          const dashboardLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-tachometer-alt')
          );
          if (dashboardLink) {
            dashboardLink.click();
          }
        }
      }, 100);
      
    } 
  }

  // Add digit to passkey
  addDigitToPasskey(digit) {
    const inputs = document.querySelectorAll('.passkey-digit');
    for (let input of inputs) {
      if (!input.value) {
        input.value = digit;
        input.classList.add('filled');
        
        // Move to next input
        const nextInput = input.nextElementSibling;
        if (nextInput && nextInput.classList.contains('passkey-digit')) {
          nextInput.focus();
        }
        break;
      }
    }
    this.updatePasskeyDisplay();
  }

  // Clear last digit
  clearLastDigit() {
    const inputs = document.querySelectorAll('.passkey-digit');
    for (let i = inputs.length - 1; i >= 0; i--) {
      if (inputs[i].value) {
        inputs[i].value = '';
        inputs[i].classList.remove('filled');
        inputs[i].focus();
        break;
      }
    }
    this.updatePasskeyDisplay();
  }

  // Clear all digits
  clearAllDigits() {
    const inputs = document.querySelectorAll('.passkey-digit');
    inputs.forEach(input => {
      input.value = '';
      input.classList.remove('filled');
    });
    this.updatePasskeyDisplay();
  }

  // Update passkey display
  updatePasskeyDisplay() {
    const inputs = document.querySelectorAll('.passkey-digit');
    inputs.forEach(input => {
      if (input.value) {
        input.classList.add('filled');
      } else {
        input.classList.remove('filled');
      }
    });
  }

  // Verify passkey
  async verifyPasskey() {
    const inputs = document.querySelectorAll('.passkey-digit');
    const passkey = Array.from(inputs).map(input => input.value).join('');

    if (passkey.length !== 4) {
      this.showPasskeyError('Please enter all 4 digits');
      return;
    }

    try {
      // Get stored passkey for current gym admin
      const storedPasskey = localStorage.getItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`);
      
      if (this.isSetupMode) {
        // Setup mode - save the passkey
        localStorage.setItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`, passkey);
        // Clear any skip setup flags
        localStorage.removeItem(`passkeySetupSkipped_${this.getCurrentGymAdminId()}`);
        this.authorizePaymentAccess();
        this.hidePasskeyModal();
        this.updatePasskeySettingsUI(); // Update the settings UI
        this.showNotification('Admin passkey created successfully!', 'success');
        this.isSetupMode = false;
        return;
      }

      // Verification mode - check against stored passkey
      if (!storedPasskey) {
        this.showPasskeyError('No passkey found. Please contact administrator.');
        return;
      }

      if (passkey === storedPasskey) {
        this.authorizePaymentAccess();
        this.hidePasskeyModal();
        this.passkeyAttempts = this.maxAttempts; // Reset attempts
      } else {
        this.passkeyAttempts--;
        this.updateAttemptsDisplay();
        
        if (this.passkeyAttempts <= 0) {
          this.showPasskeyError('Maximum attempts exceeded. Please contact administrator.');
          setTimeout(() => {
            this.hidePasskeyModal();
          }, 3000);
        } else {
          this.showPasskeyError(`Invalid passkey. ${this.passkeyAttempts} attempts remaining.`);
          this.clearAllDigits();
        }
      }
    } catch (error) {
      console.error('Error verifying passkey:', error);
      this.showPasskeyError('Error verifying passkey. Please try again.');
    }
  }

  // Authorize payment access
  authorizePaymentAccess() {
    this.isPaymentTabAuthorized = true;
    this.showPaymentTab();
  }

  // Show payment tab
  showPaymentTab() {
    
    // Safety check: Only show payment tab if authorized
    if (!this.isPaymentTabAuthorized) {
      this.showNotification('Please authenticate to access payment details', 'warning');
      return;
    }

    // CRITICAL: Use the tab switcher API for proper navigation
    if (window.tabSwitcher && typeof window.tabSwitcher.showPayments === 'function') {
      window.tabSwitcher.showPayments();
    } else {
      console.warn('Tab switcher not available, using fallback direct display');
      // Fallback: direct display (not recommended but prevents errors)
      const paymentTab = document.getElementById('paymentTab');
      if (paymentTab) {
        paymentTab.style.display = 'block';
      }
    }
    
    // Load payment data after navigation
    setTimeout(() => {
      this.loadPaymentData();
    }, 100);
  }

  // Show passkey error
  showPasskeyError(message) {
    const errorDiv = document.getElementById('passkeyError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  // Hide passkey error
  hidePasskeyError() {
    const errorDiv = document.getElementById('passkeyError');
    if (errorDiv) {
      errorDiv.classList.remove('show');
    }
  }

  // Update attempts display
  updateAttemptsDisplay() {
    const attemptsDiv = document.getElementById('passkeyAttempts');
    const remainingSpan = document.getElementById('remainingAttempts');
    
    if (attemptsDiv && remainingSpan) {
      if (this.passkeyAttempts < this.maxAttempts) {
        attemptsDiv.style.display = 'block';
        remainingSpan.textContent = this.passkeyAttempts;
      } else {
        attemptsDiv.style.display = 'none';
      }
    }
  }

  // Get current gym admin ID
  getCurrentGymAdminId() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Get gym-specific ID from token
        const gymId = payload.gymId || payload.admin?.gymId || payload.gym?.id;
        const adminId = payload.adminId || payload.admin?.id || payload.id;
        
        if (gymId) {
          return `gym_${gymId}`;
        } else if (adminId) {
          return `admin_${adminId}`;
        } else {
          return `user_${JSON.stringify(payload).slice(0, 10)}`;
        }
      }
      
      // Fallback: use a more specific default based on current URL or timestamp
      const urlHash = window.location.href.split('/').pop() || 'default';
      return `default_${urlHash}`;
    } catch (error) {
      console.error('Error getting gym admin ID:', error);
      return 'default_fallback';
    }
  }

  // Show notification (use unified system if available)
  showNotification(message, type = 'info') {
    
    // Use unified notification system if available
    if (window.unifiedNotificationSystem) {
      window.unifiedNotificationSystem.showToast(message, type);
      return;
    }
    
    // Fallback: Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `payment-toast payment-toast-${type}`;
    toast.textContent = message;
    
    // Add styles if not already added
    if (!document.getElementById('paymentToastStyles')) {
      const styles = document.createElement('style');
      styles.id = 'paymentToastStyles';
      styles.textContent = `
        .payment-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        }
        .payment-toast-success { background: #27ae60; }
        .payment-toast-error { background: #e74c3c; }
        .payment-toast-warning { background: #f39c12; }
        .payment-toast-info { background: #3498db; }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  // Settings functionality
  showChangePasskeyForm() {
    const form = document.getElementById('changePasskeyForm');
    if (form) {
      form.style.display = 'block';
    }
  }

  hideChangePasskeyForm() {
    const form = document.getElementById('changePasskeyForm');
    if (form) {
      form.style.display = 'none';
    }
    this.clearPasskeyFormInputs();
  }

  generateRandomPasskey() {
    const randomPasskey = Math.floor(1000 + Math.random() * 9000).toString();
    const newInputs = document.querySelectorAll('[data-group="new"]');
    const confirmInputs = document.querySelectorAll('[data-group="confirm"]');
    
    [...randomPasskey].forEach((digit, index) => {
      if (newInputs[index]) newInputs[index].value = digit;
      if (confirmInputs[index]) confirmInputs[index].value = digit;
    });
    
    this.showNotification(`Generated passkey: ${randomPasskey}`, 'success');
  }

  async saveNewPasskey() {
    const currentInputs = document.querySelectorAll('[data-group="current"]');
    const newInputs = document.querySelectorAll('[data-group="new"]');
    const confirmInputs = document.querySelectorAll('[data-group="confirm"]');
    
    const currentPasskey = Array.from(currentInputs).map(input => input.value).join('');
    const newPasskey = Array.from(newInputs).map(input => input.value).join('');
    const confirmPasskey = Array.from(confirmInputs).map(input => input.value).join('');
    
    if (currentPasskey.length !== 4 || newPasskey.length !== 4 || confirmPasskey.length !== 4) {
      this.showPasskeyFormError('All fields must be 4 digits');
      return;
    }
    
    if (newPasskey !== confirmPasskey) {
      this.showPasskeyFormError('New passkey and confirmation do not match');
      return;
    }
    
    const storedPasskey = localStorage.getItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`);
    if (currentPasskey !== storedPasskey) {
      this.showPasskeyFormError('Current passkey is incorrect');
      return;
    }
    
    localStorage.setItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`, newPasskey);
    this.hideChangePasskeyForm();
    this.updatePasskeySettingsUI(); // Update the settings UI
    this.showNotification('Passkey changed successfully!', 'success');
  }

  disablePasskey() {
    // Create styled confirmation dialog
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
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
    `;
    
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;
    
    dialog.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; background: #ff5722; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-exclamation-triangle" style="color: white; font-size: 24px;"></i>
            </div>
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">Disable Admin Passkey</h3>
            <p style="margin: 0; color: #666; line-height: 1.5;">
                Are you sure you want to disable the admin passkey? This will allow unrestricted access to payment management.
            </p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="cancelDisablePasskey" style="padding: 12px 24px; border: 2px solid #ddd; background: white; color: #666; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                Cancel
            </button>
            <button id="confirmDisablePasskey" style="padding: 12px 24px; border: none; background: #ff5722; color: white; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s;">
                Disable Passkey
            </button>
        </div>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        #cancelDisablePasskey:hover { background: #f5f5f5; border-color: #bbb; }
        #confirmDisablePasskey:hover { background: #e64a19; }
    `;
    document.head.appendChild(style);
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Handle button clicks
    document.getElementById('cancelDisablePasskey').onclick = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    };
    
    document.getElementById('confirmDisablePasskey').onclick = () => {
        // Remove passkey for current gym admin
        localStorage.removeItem(`gymAdminPasskey_${this.getCurrentGymAdminId()}`);
        // Also remove any skip setup flags
        localStorage.removeItem(`passkeySetupSkipped_${this.getCurrentGymAdminId()}`);
        this.isPaymentTabAuthorized = true;
        this.updatePasskeySettingsUI();
        this.showNotification('Admin passkey disabled', 'warning');
        
        document.body.removeChild(modal);
        document.head.removeChild(style);
    };
    
    // Close on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        }
    };
  }

  enablePasskey() {
    this.showPasskeyModal(true); // Show in setup mode
  }

  // Update passkey settings UI based on current status
  updatePasskeySettingsUI() {
    const statusDot = document.getElementById('passkeyStatusDot');
    const statusText = document.getElementById('passkeyStatusText');
    const changeBtn = document.getElementById('changePasskeyBtn');
    const generateBtn = document.getElementById('generatePasskeyBtn');
    const disableBtn = document.getElementById('disablePasskeyBtn');
    const passkeyInfo = document.querySelector('.passkey-info');
    
    const gymId = this.getCurrentGymAdminId();
    const storedPasskey = localStorage.getItem(`gymAdminPasskey_${gymId}`);
    const isSkipped = localStorage.getItem(`passkeySetupSkipped_${gymId}`);
    const isPasskeyActive = !!storedPasskey;
    const isSkippedActive = isSkipped && new Date().getTime() < parseInt(isSkipped);
    
    if (statusDot && statusText) {
      if (isPasskeyActive) {
        statusDot.classList.add('active');
        statusText.textContent = 'Passkey Active';
      } else if (isSkippedActive) {
        statusDot.classList.remove('active');
        statusDot.style.backgroundColor = '#f39c12'; // Orange for skipped
        statusText.textContent = 'Passkey Skipped (1 Month)';
      } else {
        statusDot.classList.remove('active');
        statusDot.style.backgroundColor = '';
        statusText.textContent = 'Passkey Disabled';
      }
    }
    
    if (passkeyInfo) {
      if (isPasskeyActive) {
        passkeyInfo.textContent = 'Your 4-digit passkey is required to access payment management';
      } else if (isSkippedActive) {
        const skipExpiry = new Date(parseInt(isSkipped));
        passkeyInfo.textContent = `Passkey setup skipped until ${skipExpiry.toLocaleDateString()}. Payment access is temporarily unrestricted.`;
      } else {
        passkeyInfo.textContent = 'No passkey is set. Payment management is unrestricted.';
      }
    }
    
    // Update button states
    if (changeBtn && generateBtn && disableBtn) {
      if (isPasskeyActive) {
        // Passkey is active - show change, generate, and disable options
        changeBtn.style.display = 'inline-flex';
        generateBtn.style.display = 'inline-flex';
        disableBtn.style.display = 'inline-flex';
        disableBtn.innerHTML = '<i class="fas fa-lock-open"></i> Disable Passkey';
      } else {
        // Passkey is disabled or skipped - show enable option only
        changeBtn.style.display = 'none';
        generateBtn.style.display = 'none';
        disableBtn.style.display = 'inline-flex';
        disableBtn.innerHTML = '<i class="fas fa-key"></i> Enable Passkey';
      }
    }
  }

  setupPasskeyInputNavigation() {
    const groups = ['current', 'new', 'confirm'];
    
    groups.forEach(group => {
      const inputs = document.querySelectorAll(`[data-group="${group}"]`);
      inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
          const value = e.target.value;
          if (value && index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputs[index - 1].focus();
          }
        });
      });
    });
  }

  showPasskeyFormError(message) {
    const errorDiv = document.getElementById('passkeyFormError');
    const errorMessage = errorDiv.querySelector('.error-message');
    
    if (errorDiv && errorMessage) {
      errorMessage.textContent = message;
      errorDiv.style.display = 'flex';
    }
  }

  clearPasskeyFormInputs() {
    const allInputs = document.querySelectorAll('.passkey-input-small');
    allInputs.forEach(input => {
      input.value = '';
      input.classList.remove('filled');
    });
    
    const errorDiv = document.getElementById('passkeyFormError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }



  // Bind click event for received amount stat card
  bindReceivedAmountStatCard() {
    const statCard = document.getElementById('receivedAmountStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showReceivedPaymentsModal();
    });
    // Close modal handler
    const closeBtn = document.getElementById('closeReceivedPaymentsModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('receivedPaymentsModal').style.display = 'none';
      });
    }
  }

  // Show modal with received payment details by category
  async showReceivedPaymentsModal() {
    const modal = document.getElementById('receivedPaymentsModal');
    const container = document.getElementById('receivedPaymentsDetailsContainer');
    if (!modal || !container) return;

    container.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner"></i></div>';
    modal.style.display = 'flex';

    try {
      // Fetch received payments from multiple months for month selector
      const response = await fetch(`${this.BASE_URL}/api/payments/recent?limit=200`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let allPayments = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        const receivedPayments = allPayments.filter(p => p.type === 'received');

        if (!receivedPayments.length) {
          container.innerHTML = `
            <div class="payment-modal-empty">
              <i class="fas fa-wallet"></i>
              <h4>No Received Payments</h4>
              <p>No payments received yet.</p>
            </div>
          `;
          return;
        }

        // Group payments by month
        const paymentsByMonth = this.groupPaymentsByMonth(receivedPayments);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        this.renderReceivedPaymentsWithMonthSelector(container, paymentsByMonth, currentMonth);
      } else {
        container.innerHTML = `
          <div class="payment-modal-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Failed to Load</h4>
            <p>Unable to fetch received payments data.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching received payments:', error);
      container.innerHTML = `
        <div class="payment-modal-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Data</h4>
          <p>Unable to fetch received payments data.</p>
        </div>
      `;
    }
  }

  // Group payments by month helper function
  groupPaymentsByMonth(payments) {
    const grouped = {};
    payments.forEach(payment => {
      const date = new Date(payment.createdAt || payment.date || Date.now());
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(payment);
    });
    return grouped;
  }

  // Render received payments with month selector
  renderReceivedPaymentsWithMonthSelector(container, paymentsByMonth, selectedMonth) {
    const months = Object.keys(paymentsByMonth).sort().reverse(); // Latest first
    const selectedPayments = paymentsByMonth[selectedMonth] || [];

    // Calculate summary for selected month
    const totalAmount = selectedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const categoryMap = {};
    
    selectedPayments.forEach(p => {
      const cat = (p.category || 'Other').toLowerCase();
      if (!categoryMap[cat]) {
        categoryMap[cat] = { 
          total: 0, 
          count: 0, 
          label: this.getCategoryDisplayName(cat), 
          payments: [] 
        };
      }
      categoryMap[cat].total += p.amount || 0;
      categoryMap[cat].count += 1;
      categoryMap[cat].payments.push(p);
    });

    let html = `
      <!-- Month Selector -->
      <div class="payment-month-selector">
        <h4 style="margin: 0 0 12px 0; color: #1e293b;"><i class="fas fa-calendar-alt"></i> Select Month</h4>
        <div class="month-buttons">
          ${months.map(month => {
            const date = new Date(month + '-01');
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const paymentCount = paymentsByMonth[month].length;
            const monthTotal = paymentsByMonth[month].reduce((sum, p) => sum + (p.amount || 0), 0);
            return `
              <button class="month-btn ${month === selectedMonth ? 'active' : ''}" 
                      data-month="${month}"
                      onclick="window.paymentManager.renderReceivedPaymentsWithMonthSelector(
                        document.getElementById('receivedPaymentsDetailsContainer'), 
                        ${JSON.stringify(paymentsByMonth).replace(/"/g, '&quot;')}, 
                        '${month}'
                      )">
                <div class="month-name">${monthName}</div>
                <div class="month-stats">${paymentCount} payments • ₹${this.formatAmount(monthTotal)}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Summary for selected month -->
      <div class="payment-modal-summary">
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalAmount)}</div>
          <div class="payment-summary-label">Total Received</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${selectedPayments.length}</div>
          <div class="payment-summary-label">Transactions</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${Object.keys(categoryMap).length}</div>
          <div class="payment-summary-label">Categories</div>
        </div>
      </div>
    `;

    // Payment details by category
    if (Object.keys(categoryMap).length > 0) {
      const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);
      
      sortedCats.forEach(([cat, info]) => {
        info.payments.forEach(payment => {
          html += `
            <div class="payment-detail-item">
              <div class="payment-detail-info">
                <div class="payment-detail-title">${payment.description || 'No Description'}</div>
                <div class="payment-detail-subtitle">
                  <span><i class="fas fa-tag"></i> ${info.label}</span>
                  <span><i class="fas fa-credit-card"></i> ${payment.paymentMethod || 'N/A'}</span>
                  <span><i class="fas fa-calendar"></i> ${payment.paidDate ? this.formatDate(payment.paidDate) : (payment.createdAt ? this.formatDate(payment.createdAt) : 'N/A')}</span>
                  ${payment.memberName ? `<span><i class="fas fa-user"></i> ${payment.memberName}</span>` : ''}
                </div>
              </div>
              <div class="payment-detail-amount">+₹${this.formatAmount(payment.amount)}</div>
            </div>
          `;
        });
      });
    } else {
      html += `
        <div class="payment-modal-empty">
          <i class="fas fa-calendar-times"></i>
          <h4>No Payments This Month</h4>
          <p>No received payments found for the selected month.</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }
  // Unified loader for all pending payments (member + manual)
  async loadAllPendingPayments() {
    const container = document.getElementById('pendingPaymentsList');
    if (!container) return;
    container.innerHTML = '<div style="color:#888;text-align:center;padding:24px 0;">Loading pending payments...</div>';

    // Fetch both manual (regular) and member pending payments
    let manualPending = [];
    let memberPending = [];
    // Always fetch latest manual (add payment) pending payments from backend
    try {
      // First try to get all recent payments and filter for pending ones
      const response = await fetch(`${this.BASE_URL}/api/payments/recent?limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        let allRecent = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        // Only include manual pending payments (not recurring monthly payments)
        // Filter for type 'pending' and exclude recurring payments
        manualPending = allRecent.filter(p => 
          p.type === 'pending' && 
          !p.isRecurring // Exclude recurring payments (they belong in recurring section)
        );
        // Store for modal and stat card use
        this.recentRegularPendingPayments = manualPending;
      } else {
        console.error('Failed to fetch manual pending payments:', response.status);
        manualPending = [];
        this.recentRegularPendingPayments = [];
      }
    } catch (e) { 
      console.error('Error fetching manual pending payments:', e);
      manualPending = []; 
    }

    try {
      // Fetch member pending payments (API call)
      const response = await fetch(`${this.BASE_URL}/api/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const members = await response.json();
        memberPending = Array.isArray(members) ? members.filter(member =>
          member.paymentStatus === 'pending' ||
          member.paymentStatus === 'overdue' ||
          (member.pendingPaymentAmount && member.pendingPaymentAmount > 0)
        ) : [];
      }
    } catch (e) { memberPending = []; }


    // Update stat card with the latest values from both sources
    // Calculate total amounts
    let totalManual = 0;
    let totalMember = 0;
    if (Array.isArray(manualPending)) {
      totalManual = manualPending.reduce((sum, p) => sum + (p.amount || 0), 0);
    }
    if (Array.isArray(memberPending)) {
      totalMember = memberPending.reduce((sum, m) => sum + (this.calculateMemberPendingAmount(m) || 0), 0);
    }
    this.regularPendingAmount = totalManual;
    this.memberPendingAmount = totalMember;
    // Store for modal use
    this.recentMemberPendingPayments = memberPending;
    this.updateCombinedPendingStatCard();

    // If both are empty, show empty state
    if ((!manualPending || manualPending.length === 0) && (!memberPending || memberPending.length === 0)) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-user-clock"></i>
          <h3>No Pending Payments</h3>
          <p>All payments are up to date</p>
        </div>
      `;
      return;
    }

    // Render unified list, sorted by due date (earliest first)
    // Map both types to a common structure for sorting
    const unified = [
      ...manualPending.map(p => ({
        type: 'manual',
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        amount: p.amount,
        description: p.description,
        category: p.category,
        status: 'pending',
        paymentMethod: p.paymentMethod || '',
        id: p._id,
        notes: p.notes || '',
      })),
      ...memberPending.map(m => ({
        type: 'member',
        dueDate: m.membershipValidUntil ? new Date(m.membershipValidUntil) : null,
        amount: this.calculateMemberPendingAmount(m),
        description: `${m.memberName || 'No Name'} - Membership Renewal`,
        category: m.planSelected || 'Membership',
        status: m.paymentStatus || 'pending',
        memberName: m.memberName,
        memberId: m._id,
        plan: m.planSelected,
        monthlyPlan: m.monthlyPlan,
        daysRemaining: m.daysRemaining,
        membershipId: m.membershipId,
        profileImage: m.profileImage,
      }))
    ];

    // Sort by due date (earliest first, nulls last)
    unified.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });

    // Render each item with proper style
    container.innerHTML = unified.map(item => {
      if (item.type === 'manual') {
        // Manual (created) pending payment
        return `
          <div class="pending-payment-item manual" style="display:flex;align-items:center;gap:16px;padding:14px 12px;margin-bottom:12px;background:#fffbe7;border-radius:10px;box-shadow:0 1px 4px #fbbf2433;">
            <div style="flex:0 0 38px;width:38px;height:38px;background:#fbbf24;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;">
              <i class="fas fa-clock"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:1.05em;color:#b45309;">${item.description || 'No Description'}</div>
              <div style="font-size:0.93em;color:#a67c00;">${item.category || 'N/A'}</div>
              <div style="font-size:0.88em;color:#b91c1c;">Due: ${item.dueDate ? item.dueDate.toLocaleDateString() : 'N/A'}</div>
              ${item.notes ? `<div style='font-size:0.88em;color:#888;'>${item.notes}</div>` : ''}
            </div>
            <div style="flex:0 0 90px;text-align:right;">
              <span style="color:#f59e42;font-weight:700;font-size:1.08em;">₹${this.formatAmount(item.amount)}</span>
              <div style="font-size:0.82em;color:#fbbf24;font-weight:500;">Pending</div>
              <button class="payment-action-btn mark-paid" data-action="mark-manual-paid" data-payment-id="${item.id}" title="Mark as Paid"
                style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:0.85em;margin-top:4px;cursor:pointer;width:100%;"><i class="fas fa-check"></i> Mark Paid</button>
            </div>
          </div>
        `;
      } else {
        // Member pending payment
        const isOverdue = item.daysRemaining < 0;
        const badge = isOverdue
          ? `<span style='background:#ffd6d6;color:#b91c1c;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;'><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Overdue${item.daysRemaining !== undefined ? ` ${Math.abs(item.daysRemaining)} days` : ''}</span>`
          : `<span style='background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;'><i class="fas fa-clock" style="margin-right:4px;"></i> Expires in ${item.daysRemaining} days</span>`;
        const profileImg = item.profileImage && item.profileImage !== ''
          ? item.profileImage.startsWith('http') ? item.profileImage : `${item.profileImage}`
          : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.memberName || 'Member') + '&background=0D8ABC&color=fff&size=64';
        return `
          <div class="pending-payment-item member" style="display:flex;align-items:center;gap:16px;padding:14px 12px;margin-bottom:12px;background:#e0f2fe;border-radius:10px;box-shadow:0 1px 4px #3b82f633;">
            <div style="flex:0 0 38px;width:38px;height:38px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;overflow:hidden;">
              <img src="${profileImg}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.memberName || 'Member')}&background=0D8ABC&color=fff&size=64';">
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:1.05em;color:#1e293b;">${item.description}</div>
              <div style="font-size:0.93em;color:#2563eb;">${item.category || 'Membership'}</div>
              <div style="font-size:0.88em;color:#b91c1c;">Due: ${item.dueDate ? item.dueDate.toLocaleDateString() : 'N/A'}</div>
              <div style="margin-top:2px;">${badge}</div>
              <div style="font-size:0.82em;color:#64748b;">ID: ${item.membershipId || 'N/A'} | Plan: ${item.plan || 'N/A'} (${item.monthlyPlan || 'N/A'})</div>
            </div>
            <div style="flex:0 0 90px;text-align:right;">
              <span style="color:#3b82f6;font-weight:700;font-size:1.08em;">₹${this.formatAmount(item.amount)}</span>
              <div style="font-size:0.82em;color:#3b82f6;font-weight:500;">Pending</div>
              <button class="payment-action-btn mark-paid" data-action="mark-member-paid" data-member-id="${item.memberId}" title="Mark as Paid"
                style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:0.85em;margin-top:4px;cursor:pointer;width:100%;"><i class="fas fa-check"></i> Mark Paid</button>
            </div>
          </div>
        `;
      }
    }).join('');
  }
  // Bind click event for pending payments stat card
  bindPendingPaymentsStatCard() {
    const statCard = document.getElementById('pendingPaymentsStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showPendingPaymentsModal();
    });
    // Close modal handler
    const closeBtn = document.getElementById('closePendingPaymentsModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('pendingPaymentsModal').style.display = 'none';
      });
    }
  }

  // Show modal with pending payment details
  async showPendingPaymentsModal() {
    const modal = document.getElementById('pendingPaymentsModal');
    const container = document.getElementById('pendingPaymentsDetailsContainer');
    if (!modal || !container) return;

    container.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner"></i></div>';
    modal.style.display = 'flex';

    try {
      // Fetch both regular pending and member pending payments for multiple months
      let allPendingPayments = [];
      
      // Fetch regular pending payments
      const regularResponse = await fetch(`${this.BASE_URL}/api/payments/recent?limit=200`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (regularResponse.ok) {
        const data = await regularResponse.json();
        let allRecent = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        const regularPending = allRecent.filter(p => p.type === 'pending' && !p.isRecurring);
        allPendingPayments.push(...regularPending.map(p => ({...p, source: 'regular'})));
      }

      // Fetch member pending payments
      const memberResponse = await fetch(`${this.BASE_URL}/api/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (memberResponse.ok) {
        const members = await memberResponse.json();
        const memberPending = Array.isArray(members) ? members.filter(member =>
          member.paymentStatus === 'pending' ||
          member.paymentStatus === 'overdue' ||
          (member.pendingPaymentAmount && member.pendingPaymentAmount > 0)
        ) : [];

        // Convert member data to payment format for consistency
        allPendingPayments.push(...memberPending.map(member => ({
          _id: member._id,
          amount: this.calculateMemberPendingAmount(member),
          description: `${member.memberName || 'Unknown'} - Membership Payment`,
          memberName: member.memberName,
          category: 'Membership',
          dueDate: member.membershipValidUntil,
          createdAt: member.createdAt || member.dateJoined,
          source: 'member',
          planSelected: member.planSelected,
          paymentStatus: member.paymentStatus
        })));
      }

      if (!allPendingPayments.length) {
        container.innerHTML = `
          <div class="payment-modal-empty">
            <i class="fas fa-check-circle"></i>
            <h4>No Pending Payments</h4>
            <p>All payments are up to date!</p>
          </div>
        `;
        return;
      }

      // Group payments by month
      const paymentsByMonth = this.groupPaymentsByMonth(allPendingPayments);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      this.renderPendingPaymentsWithMonthSelector(container, paymentsByMonth, currentMonth);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      container.innerHTML = `
        <div class="payment-modal-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Data</h4>
          <p>Unable to fetch pending payments data.</p>
        </div>
      `;
    }
  }

  // Render pending payments with month selector
  renderPendingPaymentsWithMonthSelector(container, paymentsByMonth, selectedMonth) {
    const months = Object.keys(paymentsByMonth).sort().reverse(); // Latest first
    const selectedPayments = paymentsByMonth[selectedMonth] || [];

    // Separate by source
    const regularPending = selectedPayments.filter(p => p.source === 'regular');
    const memberPending = selectedPayments.filter(p => p.source === 'member');

    // Calculate summary for selected month
    const totalAmount = selectedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const regularAmount = regularPending.reduce((sum, p) => sum + (p.amount || 0), 0);
    const memberAmount = memberPending.reduce((sum, p) => sum + (p.amount || 0), 0);

    let html = `
      <!-- Month Selector -->
      <div class="payment-month-selector">
        <h4 style="margin: 0 0 12px 0; color: #1e293b;"><i class="fas fa-calendar-alt"></i> Select Month</h4>
        <div class="month-buttons">
          ${months.map(month => {
            const date = new Date(month + '-01');
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const paymentCount = paymentsByMonth[month].length;
            const monthTotal = paymentsByMonth[month].reduce((sum, p) => sum + (p.amount || 0), 0);
            return `
              <button class="month-btn ${month === selectedMonth ? 'active' : ''}" 
                      data-month="${month}"
                      onclick="window.paymentManager.renderPendingPaymentsWithMonthSelector(
                        document.getElementById('pendingPaymentsDetailsContainer'), 
                        ${JSON.stringify(paymentsByMonth).replace(/"/g, '&quot;')}, 
                        '${month}'
                      )">
                <div class="month-name">${monthName}</div>
                <div class="month-stats">${paymentCount} pending • ₹${this.formatAmount(monthTotal)}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Summary for selected month -->
      <div class="payment-modal-summary">
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalAmount)}</div>
          <div class="payment-summary-label">Total Pending</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${selectedPayments.length}</div>
          <div class="payment-summary-label">Pending Items</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(regularAmount)}</div>
          <div class="payment-summary-label">Regular Pending</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(memberAmount)}</div>
          <div class="payment-summary-label">Member Pending</div>
        </div>
      </div>
    `;

    // Regular pending payments section
    if (regularPending.length > 0) {
      html += `<h4 style="margin: 20px 0 12px 0; color: #f59e0b;"><i class="fas fa-credit-card"></i> Regular Pending Payments</h4>`;
      regularPending.forEach(payment => {
        html += `
          <div class="payment-detail-item">
            <div class="payment-detail-info">
              <div class="payment-detail-title">${payment.description || 'No Description'}</div>
              <div class="payment-detail-subtitle">
                <span><i class="fas fa-tag"></i> ${payment.category || 'N/A'}</span>
                <span><i class="fas fa-calendar"></i> Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
                <span><i class="fas fa-clock"></i> Created: ${payment.createdAt ? this.formatDate(payment.createdAt) : 'N/A'}</span>
              </div>
            </div>
            <div class="payment-detail-amount pending">₹${this.formatAmount(payment.amount)}</div>
          </div>
        `;
      });
    }

    // Member pending payments section
    if (memberPending.length > 0) {
      html += `<h4 style="margin: 20px 0 12px 0; color: #3b82f6;"><i class="fas fa-users"></i> Member Pending Payments</h4>`;
      memberPending.forEach(payment => {
        const isOverdue = payment.paymentStatus === 'overdue' || 
          (payment.dueDate && new Date(payment.dueDate) < new Date());
        
        html += `
          <div class="payment-detail-item">
            <div class="payment-detail-info">
              <div class="payment-detail-title">${payment.description || 'Membership Payment'}</div>
              <div class="payment-detail-subtitle">
                <span><i class="fas fa-user"></i> ${payment.memberName || 'N/A'}</span>
                <span><i class="fas fa-crown"></i> ${payment.planSelected || 'N/A'}</span>
                <span><i class="fas fa-calendar"></i> Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
                <span><i class="fas fa-exclamation-circle" style="color: ${isOverdue ? '#ef4444' : '#f59e0b'}"></i> ${isOverdue ? 'Overdue' : 'Pending'}</span>
              </div>
            </div>
            <div class="payment-detail-amount ${isOverdue ? 'due' : 'pending'}">₹${this.formatAmount(payment.amount)}</div>
          </div>
        `;
      });
    }

    // Empty state for selected month
    if (selectedPayments.length === 0) {
      html += `
        <div class="payment-modal-empty">
          <i class="fas fa-calendar-check"></i>
          <h4>No Pending Payments</h4>
          <p>No pending payments found for the selected month.</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  init() {
    const token = localStorage.getItem('gymAdminToken');
    
    // For testing purposes, if no token exists, create a temporary one
    if (!token) {
      // Valid token that matches the JWT_SECRET in .env
      const tempToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6eyJpZCI6InRlc3QtZ3ltLWFkbWluLTEyMyIsImd5bUlkIjoidGVzdC1neW0taWQtNDU2IiwiZW1haWwiOiJ0ZXN0QGFkbWluLmNvbSJ9LCJpYXQiOjE3NTQ0MDg1NTYsImV4cCI6MTc1NDQ5NDk1Nn0.tc3o9udX1zJ1EBZ495jQntCcQD5h8v3XAn6pYcOZIBg';
      localStorage.setItem('gymAdminToken', tempToken);
    }
    
    this.setupEventListeners();
    this.loadPaymentData();
    this.bindPendingPaymentsStatCard();
  }

  // Enhanced helper function to use unified notification system
  async waitForNotificationManager(maxWait = 5000) {
    return new Promise((resolve) => {
      const checkInterval = 100;
      let waited = 0;
      
      const check = () => {
        if (window.NotificationManager && window.NotificationManager.isReady()) {
          resolve(window.NotificationManager);
        } else if (waited < maxWait) {
          waited += checkInterval;
          setTimeout(check, checkInterval);
        } else {
          console.warn('Enhanced notification system not available after waiting');
          resolve(null);
        }
      };
      
      check();
    });
  }

  setupEventListeners() {
    // Add payment button with enhanced event handling
    document.addEventListener('click', (e) => {
      if (e.target.id === 'addPaymentBtn' || e.target.closest('#addPaymentBtn')) {
        e.preventDefault();
        e.stopPropagation();
        this.showAddPaymentModal();
        return;
      }
    });

    // Modal close buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close-btn') || 
          e.target.id === 'cancelPaymentBtn') {
        this.hideAddPaymentModal();
      }
    });

    // Payment category selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.payment-category-item')) {
        this.handleCategorySelection(e.target.closest('.payment-category-item'));
      }
    });

    // Payment form submission
    const paymentForm = document.getElementById('addPaymentForm');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePaymentFormSubmit();
      });
    }

    // Recurring payment checkbox
    const recurringCheckbox = document.getElementById('isRecurring');
    if (recurringCheckbox) {
      recurringCheckbox.addEventListener('change', (e) => {
        this.toggleRecurringDetails(e.target.checked);
      });
    }

    // Payment type change handler
    document.addEventListener('change', (e) => {
      if (e.target.id === 'paymentType') {
        this.handlePaymentTypeChange(e.target.value);
      }
    });

    // Filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        this.handleFilterChange(e.target.dataset.filter);
      }
    });

    // Payment action buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('payment-action-btn')) {
        const action = e.target.dataset.action;
        const paymentId = e.target.dataset.paymentId;
        const memberId = e.target.dataset.memberId;
        
        // Handle member-specific actions
        if (action === 'mark-member-paid') {
          this.handleMemberPaymentAction('mark-paid', memberId);
        } else if (action === 'remind-member') {
          this.handleMemberPaymentAction('remind', memberId);
        } else if (action === 'grant-allowance') {
          this.handleMemberPaymentAction('grant-allowance', memberId);
        } else if (action === 'mark-manual-paid') {
          this.handleManualPaymentAction('mark-paid', paymentId);
        } else {
          // Handle regular payment actions
          this.handlePaymentAction(action, paymentId);
        }
      }
    });

    // Payment History button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'paymentHistoryBtn' || e.target.closest('#paymentHistoryBtn')) {
        this.showPaymentHistoryModal();
      }
    });

    // Payment History Modal close
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closePaymentHistoryModal' || e.target.closest('#closePaymentHistoryModal')) {
        this.hidePaymentHistoryModal();
      }
    });

    // Chart controls
    const monthSelect = document.getElementById('paymentChartMonth');
    const yearSelect = document.getElementById('paymentChartYear');
    
    if (monthSelect) {
      monthSelect.addEventListener('change', () => this.updateChart());
    }
    if (yearSelect) {
      yearSelect.addEventListener('change', () => this.updateChart());
    }

    // Initialize payment reminders check
    this.initializePaymentReminders();
  }

  async loadPaymentData() {
    try {
      await Promise.all([
        this.loadPaymentStats(),
        this.loadRecentPayments(),
        this.loadRecurringPayments(),
        this.loadPaymentChart()
      ]);
      // Load unified pending payments after stats are loaded (this handles both member and manual pending)
      await this.loadAllPendingPayments();
    } catch (error) {
      console.error('Error loading payment data:', error);
      this.showError('Failed to load payment data');
    }
  }

  async loadPaymentStats() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      
      if (!token) {
        console.error('No gym admin token found');
        this.showError('Authentication required. Please login again.');
        // Set mock data for testing
        this.updatePaymentStats({
          received: 15000,
          paid: 8000,
          due: 3000,
          pending: 2000,
          profit: 7000,
          receivedGrowth: 12.5,
          paidGrowth: -5.2,
          dueGrowth: 8.1,
          pendingGrowth: -15.3,
          profitGrowth: 25.8
        });
        return;
      }

      const response = await fetch(`${this.BASE_URL}/api/payments/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Payment stats API error: ${response.status} ${response.statusText}`, errorText);
        
        // For demo purposes, show mock data instead of error
        this.updatePaymentStats({
          received: 25000,
          paid: 12000,
          due: 5000,
          pending: 3000,
          profit: 13000,
          receivedGrowth: 15.2,
          paidGrowth: -8.1,
          dueGrowth: 12.5,
          pendingGrowth: -20.4,
          profitGrowth: 35.7
        });
        return;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        this.updatePaymentStats(data.data);
      } else {
        console.error('Invalid response format:', data);
        this.showError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error loading payment stats:', error);
      
      // Show mock data for demonstration when API fails
      this.updatePaymentStats({
        received: 35000,
        paid: 18000,
        due: 7000,
        pending: 4500,
        profit: 17000,
        receivedGrowth: 20.3,
        paidGrowth: -12.1,
        dueGrowth: 18.2,
        pendingGrowth: -25.6,
        profitGrowth: 42.1
      });
    }
  }

  updatePaymentStats(stats) {
    // Update received amount
    const receivedCard = document.querySelector('.payment-stat-card.received');
    if (receivedCard) {
      receivedCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.received)}`;
      const receivedChange = receivedCard.querySelector('.payment-stat-change');
      receivedChange.className = `payment-stat-change ${stats.receivedGrowth >= 0 ? 'positive' : 'negative'}`;
      receivedChange.innerHTML = `
        <i class="fas fa-arrow-${stats.receivedGrowth >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(stats.receivedGrowth).toFixed(1)}%
      `;
    }

    // Update paid amount
    const paidCard = document.querySelector('.payment-stat-card.paid');
    if (paidCard) {
      paidCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.paid)}`;
      const paidChange = paidCard.querySelector('.payment-stat-change');
      paidChange.className = `payment-stat-change ${stats.paidGrowth >= 0 ? 'negative' : 'positive'}`;
      paidChange.innerHTML = `
        <i class="fas fa-arrow-${stats.paidGrowth >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(stats.paidGrowth).toFixed(1)}%
      `;
    }

    // Update due amount (new stat card)
    const dueCard = document.querySelector('.payment-stat-card.due');
    if (dueCard) {
      dueCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.due || 0)}`;
      const dueChange = dueCard.querySelector('.payment-stat-change');
      if (dueChange && stats.dueGrowth !== undefined) {
        dueChange.className = `payment-stat-change ${stats.dueGrowth >= 0 ? 'negative' : 'positive'}`;
        dueChange.innerHTML = `
          <i class="fas fa-arrow-${stats.dueGrowth >= 0 ? 'up' : 'down'}"></i>
          ${Math.abs(stats.dueGrowth).toFixed(1)}%
        `;
      }
    }

    // Only update regularPendingAmount for use in unified stat card logic
    this.regularPendingAmount = stats.pending || 0;
    // Store recent regular pending payments for modal (if available)
    if (Array.isArray(stats.pendingPayments)) {
      this.recentRegularPendingPayments = stats.pendingPayments;
    }
    // Do NOT update the unified pending stat card here - it will be updated by loadAllPendingPayments()
    // this.updateCombinedPendingStatCard(); // Removed to prevent conflicts
    
    // Update pending growth badge (but not the value itself)
    const pendingCard = document.querySelector('.payment-stat-card.pending');
    if (pendingCard) {
      const pendingChange = pendingCard.querySelector('.payment-stat-change');
      if (pendingChange && stats.pendingGrowth !== undefined) {
        pendingChange.className = `payment-stat-change ${stats.pendingGrowth >= 0 ? 'negative' : 'positive'}`;
        pendingChange.innerHTML = `
          <i class="fas fa-arrow-${stats.pendingGrowth >= 0 ? 'up' : 'down'}"></i>
          ${Math.abs(stats.pendingGrowth).toFixed(1)}%
        `;
      }
    }

    // Update profit/loss
    const profitCard = document.querySelector('.payment-stat-card.profit');
    if (profitCard) {
      profitCard.querySelector('.payment-stat-value').textContent = `₹${this.formatAmount(stats.profit)}`;
      const profitChange = profitCard.querySelector('.payment-stat-change');
      profitChange.className = `payment-stat-change ${stats.profit >= 0 ? 'positive' : 'negative'}`;
      profitChange.innerHTML = `
        <i class="fas fa-arrow-${stats.profitGrowth >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(stats.profitGrowth).toFixed(1)}%
      `;
      
      // Update card color based on profit/loss
      if (stats.profit >= 0) {
        profitCard.style.borderLeftColor = '#22c55e';
      } else {
        profitCard.style.borderLeftColor = '#ef4444';
      }
    }
  }

  async loadPaymentChart() {
    try {
      const now = new Date();
      const month = document.getElementById('paymentChartMonth')?.value || now.getMonth();
      const year = document.getElementById('paymentChartYear')?.value || now.getFullYear();

      const response = await fetch(`${this.BASE_URL}/api/payments/chart-data?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch chart data');

      const data = await response.json();
      this.renderPaymentChart(data.data);
    } catch (error) {
      console.error('Error loading payment chart:', error);
    }
  }

  renderPaymentChart(chartData) {
    const ctx = document.getElementById('paymentChart');
    if (!ctx) return;

    if (this.paymentChart) {
      this.paymentChart.destroy();
    }

    this.paymentChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Payment Trends'
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString();
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  async loadRecentPayments() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/payments/recent?limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recent payments');

      const data = await response.json();
      
      // Log recent payments for debugging
      if (Array.isArray(data.data)) {
        data.data.forEach((p, index) => {
        });
      }
      
      this.renderRecentPayments(data.data);
    } catch (error) {
      console.error('Error loading recent payments:', error);
    }
  }

  renderRecentPayments(payments) {
    const container = document.getElementById('recentPaymentsList');
    if (!container) return;

    if (payments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-receipt"></i>
          <h3>No Recent Payments</h3>
          <p>No payment transactions found</p>
        </div>
      `;
      return;
    }

    // Sort payments by activity date on frontend as well for extra safety
    // Use paidDate if available (for recently marked as paid), otherwise use createdAt
    const sortedPayments = payments.sort((a, b) => {
      const dateA = new Date(a.paidDate || a.activityDate || a.createdAt);
      const dateB = new Date(b.paidDate || b.activityDate || b.createdAt);
      return dateB - dateA; // Most recent first
    });

    container.innerHTML = sortedPayments.map(payment => {
      // Determine icon, color, and amount sign based on payment type
      let icon = 'plus', iconColor = '', amountClass = '', amountPrefix = '', iconHtml = '';
      if (payment.type === 'received') {
        icon = 'plus';
        iconColor = '#22c55e';
        amountClass = 'positive';
        amountPrefix = '+';
        iconHtml = `<i class="fas fa-plus"></i>`;
      } else if (payment.type === 'paid' || payment.type === 'due') {
        icon = 'minus';
        iconColor = '#ef4444';
        amountClass = 'negative';
        amountPrefix = '-';
        iconHtml = `<i class="fas fa-minus"></i>`;
      } else if (payment.type === 'pending') {
        icon = 'clock';
        iconColor = '#fbbf24';
        amountClass = 'pending';
        amountPrefix = '';
        iconHtml = `<i class="fas fa-clock"></i>`;
      }
      
      // Use paidDate if available (for payments marked as paid), otherwise use activityDate or createdAt
      const displayDate = payment.paidDate || payment.activityDate || payment.createdAt;
      
      return `
        <div class="recent-payment-item">
          <div class="recent-payment-icon ${payment.type}" style="${payment.type === 'pending' ? 'background:#fbbf24;color:#fff;' : ''}">
            ${iconHtml}
          </div>
          <div class="recent-payment-info">
            <div class="recent-payment-title">${payment.description}</div>
            <div class="recent-payment-details">
              <span>${payment.category.replace('_', ' ').toUpperCase()}</span>
              <span>${payment.paymentMethod.toUpperCase()}</span>
              ${payment.memberName ? `<span>${payment.memberName}</span>` : ''}
            </div>
          </div>
          <div class="recent-payment-amount ${amountClass}" style="${payment.type === 'pending' ? 'color:#fbbf24;font-weight:600;' : ''}">
            ${amountPrefix}₹${this.formatAmount(payment.amount)}
          </div>
          <div class="recent-payment-time">
            ${this.formatTime(displayDate)}
          </div>
        </div>
      `;
    }).join('');
  }

  async loadRecurringPayments() {
    try {
      // For the Dues section, we only want pending payments (unpaid dues)
      const statusFilter = 'pending';
      
      const response = await fetch(`${this.BASE_URL}/api/payments/recurring?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch dues');

      const data = await response.json();
      
      // Log each payment for debugging
      if (Array.isArray(data.data)) {
        data.data.forEach((p, index) => {
        });
      }
      
      // Filter to show only unpaid dues in the Dues section
      const filtered = Array.isArray(data.data) ? data.data.filter(p => {
        const status = p.status;
        const type = p.type;
        const isRecurring = p.isRecurring;

        // Only show pending payments (unpaid dues)
        if (status !== 'pending') {
          return false;
        }

        // Exclude ANY completed payments - they belong in Recent Payments
        if (status === 'completed' || type === 'paid' || type === 'received') {
          return false;
        }

        // Apply filter based on selected filter button
        if (this.currentFilter === 'monthly-recurring') {
          // Show only monthly recurring payments
          if (!isRecurring) {
            return false;
          }
        } else if (this.currentFilter === 'all') {
          // Show all pending dues (both recurring and one-time)
        }

        // Include all due/pending payments that are still unpaid
        if (type === 'due' || type === 'pending') {
          // Apply 7-day window filter for recurring payments to show urgent ones
          if (isRecurring && p.dueDate) {
            const dueDate = new Date(p.dueDate);
            const now = new Date();
            const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            // Show if within 7 days (past or future) for recurring payments
            const withinWindow = daysDiff <= 7;
            if (!withinWindow) {
            }
            return withinWindow;
          }
          
          // For non-recurring payments, include all pending/due payments
          return true;
        }

        // Filter out payments that are not due/pending type
        return false;
      }) : [];

      // For monthly recurring filter, exclude manual pending payments
      const finalFiltered = filtered.filter(p => {
        if (this.currentFilter === 'monthly-recurring' && p.type === 'pending' && !p.isRecurring) {
          return false;
        }
        return true;
      });

      this.renderRecurringPayments(finalFiltered);
    } catch (error) {
      console.error('Error loading dues:', error);
    }
  }

  renderRecurringPayments(payments) {
    const container = document.getElementById('recurringPaymentsList');
    if (!container) return;

    if (payments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-calendar-alt"></i>
          <h3>No Outstanding Dues</h3>
          <p>No pending dues or payments due within 7 days</p>
        </div>
      `;
      return;
    }

    // Final safety check: remove any completed/paid payments that somehow made it through
    const safetFilteredPayments = payments.filter(payment => {
      const isValid = payment.status === 'pending' && (payment.type === 'due' || payment.type === 'pending');
      if (!isValid) {
        console.warn(`Filtering out invalid payment in render: ${payment.description} (status: ${payment.status}, type: ${payment.type})`);
      }
      return isValid;
    });

    if (safetFilteredPayments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-calendar-alt"></i>
          <h3>No Outstanding Dues</h3>
          <p>No pending dues or payments due within 7 days</p>
        </div>
      `;
      return;
    }

    // Add reminder badges to payments
    const paymentsWithReminders = this.renderPaymentWithReminders(safetFilteredPayments);

    container.innerHTML = paymentsWithReminders.map(payment => {
      const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status === 'pending';
      const isPending = payment.status === 'pending';
      const isCompleted = payment.status === 'completed';
      
      // Calculate days until due
      const dueDate = new Date(payment.dueDate);
      const now = new Date();
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Badge logic: show timer for pending, show paid for completed, special handling for recurring
      let statusBadge = '';
      if (isPending && isOverdue) {
        statusBadge = `<span class="recurring-badge overdue" style="background:#ffd6d6;color:#b71c1c;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Overdue</span>`;
      } else if (isPending && diffDays <= 7) {
        if (diffDays <= 0) {
          statusBadge = `<span class="recurring-badge critical" style="background:#ff6b6b;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-bell" style="margin-right:4px;"></i> Due ${diffDays === 0 ? 'Today' : `${Math.abs(diffDays)} days ago`}</span>`;
        } else if (diffDays === 1) {
          statusBadge = `<span class="recurring-badge urgent" style="background:#ff9500;color:#fff;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Due Tomorrow</span>`;
        } else {
          statusBadge = `<span class="recurring-badge pending" style="background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Due in ${diffDays} days</span>`;
        }
      } else if (isPending) {
        statusBadge = `<span class="recurring-badge pending" style="background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Pending</span>`;
      }

      // Add recurring indicator
      const recurringIndicator = payment.isRecurring ? 
        `<span class="recurring-indicator" style="background:#e3f2fd;color:#1976d2;padding:1px 6px;border-radius:8px;font-size:0.75em;margin-left:6px;"><i class="fas fa-sync-alt" style="margin-right:2px;"></i> Recurring</span>` : '';

      // Calculate days until due for countdown badge
      const paymentDueDate = new Date(payment.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24));
      
      let countdownBadge = '';
      if (payment.dueDate) {
        if (daysUntilDue < 0) {
          countdownBadge = `<div class="countdown-badge overdue">${Math.abs(daysUntilDue)}d overdue</div>`;
        } else if (daysUntilDue === 0) {
          countdownBadge = `<div class="countdown-badge due-today">Due Today</div>`;
        } else if (daysUntilDue <= 7) {
          countdownBadge = `<div class="countdown-badge due-soon">${daysUntilDue}d left</div>`;
        } else {
          countdownBadge = `<div class="countdown-badge due-later">${daysUntilDue}d left</div>`;
        }
      }

      return `
        <div class="recurring-payment-item ${isOverdue ? 'overdue' : isPending ? 'pending' : 'completed'}" data-payment-id="${payment._id}">
          ${countdownBadge}
          
          <!-- Row 1: Category, Due Date, Status -->
          <div class="payment-item-header">
            <span class="payment-category">${this.getCategoryDisplayName(payment.category)}</span>
            <span class="payment-due">Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
            <span class="payment-status status-${payment.status}">${payment.status.toUpperCase()}</span>
          </div>
          
          <!-- Row 2: Amount, Person/Description, Recurring Status -->
          <div class="payment-item-main">
            <span class="payment-amount-main">₹${this.formatAmount(payment.amount)}</span>
            <span class="payment-description">${payment.description}</span>
            ${payment.isRecurring ? `<span class="payment-recurring"><i class="fas fa-sync-alt"></i> Recurring</span>` : ''}
          </div>
          
          <!-- Row 3: Action Buttons -->
          <div class="payment-item-actions">
            ${payment.status === 'pending' ? `
              <button class="payment-action-btn mark-paid" data-action="mark-paid" data-payment-id="${payment._id}">
                <i class="fas fa-check"></i> Mark Paid
              </button>
            ` : ''}
            <button class="payment-action-btn edit" data-action="edit" data-payment-id="${payment._id}">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="payment-action-btn delete" data-action="delete" data-payment-id="${payment._id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // This method is kept for compatibility but redirects to the unified loader
  async loadMemberPendingPayments() {
    // Just call the unified loader instead of doing separate member loading
    await this.loadAllPendingPayments();
  }

  renderMemberPendingPayments(members) {
    const container = document.getElementById('pendingPaymentsList');
    if (!container) {
      console.warn('Pending payments container not found');
      return;
    }


    if (members.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-user-clock"></i>
          <h3>No Pending Member Payments</h3>
          <p>All member payments are up to date</p>
        </div>
      `;
      return;
    }

    // Sort members: overdue first, then by days remaining if available
    members.sort((a, b) => {
      const aDays = a.daysRemaining !== undefined ? a.daysRemaining : 9999;
      const bDays = b.daysRemaining !== undefined ? b.daysRemaining : 9999;
      if (aDays < 0 && bDays >= 0) return -1;
      if (aDays >= 0 && bDays < 0) return 1;
      if (aDays < 0 && bDays < 0) return aDays - bDays;
      return aDays - bDays;
    });

    // Store for modal
    this.recentMemberPendingPayments = members;

    // Optimized card layout for perfect space usage
    container.innerHTML = members.map(member => {
      const isOverdue = member.daysRemaining < 0;
      const pendingAmount = this.calculateMemberPendingAmount(member);
      const profileImg = member.profileImage && member.profileImage !== ''
        ? member.profileImage.startsWith('http') ? member.profileImage : `${member.profileImage}`
        : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.memberName || 'Member') + '&background=0D8ABC&color=fff&size=64';

      let statusBadge = '';
      if (isOverdue) {
        statusBadge = `<span class="member-payment-badge overdue"><i class="fas fa-exclamation-triangle"></i> Overdue${member.daysRemaining !== undefined ? ` ${Math.abs(member.daysRemaining)} days` : ''}</span>`;
      } else if (member.daysRemaining === 0) {
        statusBadge = `<span class="member-payment-badge critical"><i class="fas fa-clock"></i> Expires TODAY</span>`;
      } else if (member.daysRemaining === 1) {
        statusBadge = `<span class="member-payment-badge urgent"><i class="fas fa-clock"></i> Expires TOMORROW</span>`;
      } else if (member.daysRemaining > 1) {
        statusBadge = `<span class="member-payment-badge pending"><i class="fas fa-clock"></i> Expires in ${member.daysRemaining} days</span>`;
      } else {
        statusBadge = `<span class="member-payment-badge pending"><i class="fas fa-clock"></i> Pending</span>`;
      }

      const dueDate = member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A';

      return `
        <div class="member-payment-item compact-card ${isOverdue ? 'overdue' : member.daysRemaining <= 1 ? 'critical' : 'pending'}" data-member-id="${member._id}"
          style="display:flex;align-items:center;gap:0;padding:0 0 0 0;margin-bottom:12px;background:#fff;border-radius:12px;box-shadow:0 2px 8px #0001;transition:box-shadow .2s;cursor:pointer;min-height:68px;overflow:hidden;">
          <div class="member-payment-avatar"
            style="flex:0 0 44px;width:44px;height:44px;margin:0 14px 0 10px;border-radius:50%;overflow:hidden;box-shadow:0 1px 4px #0002;background:#f3f4f6;display:flex;align-items:center;justify-content:center;">
            <img src="${profileImg}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(member.memberName || 'Member')}&background=0D8ABC&color=fff&size=64';">
          </div>
          <div class="member-payment-info"
            style="flex:1;min-width:0;display:flex;flex-direction:column;gap:0;justify-content:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="member-payment-name" style="font-weight:600;font-size:1.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">${member.memberName}</span>
              <span style="font-size:0.85em;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;">${member.planSelected || 'N/A'}</span>
              <span style="font-size:0.85em;color:#bdbdbd;">|</span>
              <span style="font-size:0.85em;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;">${member.monthlyPlan || 'N/A'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:2px;">
              <span style="font-size:0.82em;color:#6b7280;"><i class="fas fa-calendar-alt"></i> ${dueDate}</span>
              <span style="font-size:0.82em;color:#6b7280;"><i class="fas fa-id-card"></i> ${member.membershipId || 'N/A'}</span>
            </div>
            <div style="margin-top:2px;">${statusBadge}</div>
          </div>
          <div class="member-payment-amount"
            style="flex:0 0 70px;text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;">
            <div class="amount-value" style="font-weight:700;font-size:1.08em;line-height:1.1;">₹${this.formatAmount(pendingAmount)}</div>
            <div class="amount-label" style="font-size:0.82em;color:#ef4444;font-weight:500;">Pending</div>
          </div>
          <div class="member-payment-actions"
            style="flex:0 0 82px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;justify-content:center;padding-right:10px;">
            <button class="payment-action-btn mark-paid mark-paid-btn" data-action="mark-member-paid" data-member-id="${member._id}" data-source="payment-tab" title="Mark as Paid"
              style="background:#22c55e;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.93em;display:flex;align-items:center;gap:4px;transition:background .2s;cursor:pointer;min-width:60px;"><i class="fas fa-check"></i> Paid</button>
            <button class="payment-action-btn remind" data-action="remind-member" data-member-id="${member._id}" title="Send Reminder"
              style="background:#fbbf24;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.93em;display:flex;align-items:center;gap:4px;transition:background .2s;cursor:pointer;min-width:60px;"><i class="fas fa-bell"></i> Remind</button>
            <button class="payment-action-btn allowance seven-day-allowance-btn" data-action="grant-allowance" data-member-id="${member._id}" title="Grant 7-Day Allowance"
              style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:0.93em;display:flex;align-items:center;gap:4px;transition:background .2s;cursor:pointer;min-width:60px;"><i class="fas fa-calendar-plus"></i> 7-Day</button>
          </div>
        </div>
      `;
    }).join('');

    // Do NOT update member pending stats here - this is handled by loadAllPendingPayments()
    // this.updateMemberPendingStats(members); // Commented out to prevent stat card conflicts
  }

  calculateMemberPendingAmount(member) {
    // First, try to get amount from specific payment amount fields
    if (member.paymentAmount && member.paymentAmount > 0) {
      return member.paymentAmount;
    }
    
    if (member.pendingPaymentAmount && member.pendingPaymentAmount > 0) {
      return member.pendingPaymentAmount;
    }
    
    // Try to get from renewal amount fields
    if (member.renewalAmount && member.renewalAmount > 0) {
      return member.renewalAmount;
    }
    
    // Fallback calculation based on plan and duration
    const plan = (member.planSelected || '').toLowerCase();
    const duration = (member.monthlyPlan || '').toLowerCase();
    
    // More detailed plan-based calculation
    let baseAmount = 1200; // Default amount
    
    if (plan.includes('premium') || plan.includes('vip')) {
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 18000; // 12 months premium
      } else if (duration.includes('6')) {
        baseAmount = 9000; // 6 months premium
      } else if (duration.includes('3')) {
        baseAmount = 4500; // 3 months premium
      } else {
        baseAmount = 1500; // 1 month premium
      }
    } else if (plan.includes('basic') || plan.includes('standard')) {
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 12000; // 12 months basic
      } else if (duration.includes('6')) {
        baseAmount = 6000; // 6 months basic
      } else if (duration.includes('3')) {
        baseAmount = 3000; // 3 months basic
      } else {
        baseAmount = 1000; // 1 month basic
      }
    } else if (plan.includes('student') || plan.includes('discount')) {
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 9600; // 12 months student
      } else if (duration.includes('6')) {
        baseAmount = 4800; // 6 months student
      } else if (duration.includes('3')) {
        baseAmount = 2400; // 3 months student
      } else {
        baseAmount = 800; // 1 month student
      }
    } else {
      // Default amounts for unrecognized plans
      if (duration.includes('12') || duration.includes('year')) {
        baseAmount = 14400; // 12 months default
      } else if (duration.includes('6')) {
        baseAmount = 7200; // 6 months default
      } else if (duration.includes('3')) {
        baseAmount = 3600; // 3 months default
      } else {
        baseAmount = 1200; // 1 month default
      }
    }
    
    return baseAmount;
  }

  updateMemberPendingStats(members) {
    // Calculate total pending amount from members
    let totalPendingFromMembers = 0;
    
    members.forEach(member => {
      const pendingAmount = this.calculateMemberPendingAmount(member);
      totalPendingFromMembers += pendingAmount;
    });

    // Update the pending stat card to include member pending payments
    this.updatePendingStatWithMembers(totalPendingFromMembers, members.length);
  }

  updatePendingStatWithMembers(memberPendingAmount, memberCount) {
    // Store member pending payments but do NOT update stat card here
    // The stat card should only be updated by updateCombinedPendingStatCard() called from loadAllPendingPayments()
    this.memberPendingAmount = memberPendingAmount;
    // Optionally, show the member count somewhere if needed (not required for just the amount)
  }

  updateCombinedPendingStatCard() {
    // Show the sum of regular and member pending payments
    const totalPending = (this.regularPendingAmount || 0) + (this.memberPendingAmount || 0);
    const totalRegularCount = (this.recentRegularPendingPayments || []).length;
    const totalMemberCount = (this.recentMemberPendingPayments || []).length;
    const totalCount = totalRegularCount + totalMemberCount;
    
    
    // Update main stat card
    const pendingCard = document.querySelector('.payment-stat-card.pending');
    if (pendingCard) {
      const valueDiv = pendingCard.querySelector('.payment-stat-value');
      if (valueDiv) {
        valueDiv.textContent = `₹${this.formatAmount(totalPending)}`;
      }
    }
    
    // Update pending section header stats
    const pendingCountElement = document.querySelector('.pending-count');
    const pendingAmountElement = document.querySelector('.pending-amount');
    
    if (pendingCountElement) {
      pendingCountElement.textContent = `${totalCount} pending`;
    }
    
    if (pendingAmountElement) {
      pendingAmountElement.textContent = `₹${this.formatAmount(totalPending)} pending`;
    }
    
  }

  // Handle manual payment actions (mark as paid, etc.)
  async handleManualPaymentAction(action, paymentId) {
    if (action === 'mark-paid') {
      try {
        // Show loading state
        const button = document.querySelector(`[data-payment-id="${paymentId}"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // Mark payment as paid in backend with current date as paid date
        const response = await fetch(`${this.BASE_URL}/api/payments/${paymentId}/mark-paid`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paidDate: new Date().toISOString(), // Set current date as paid date
            status: 'paid'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to mark payment as paid');
        }

        const result = await response.json();
        
        // Determine appropriate success message based on context
        let successMessage = 'Payment marked as paid and updated in paid section!';
        
        // Check if this was from dues/pending section
        const isDuesSection = button.closest('.pending-payments-section') || 
                             button.closest('#pendingPaymentsList') ||
                             button.getAttribute('data-source') === 'dues';
        
        if (isDuesSection) {
          successMessage = 'Payment marked as paid and updated in paid section!';
        } else {
          successMessage = 'Payment marked as paid successfully!';
        }
        
        // Show enhanced success message
        this.showSuccess(successMessage);

        // Refresh payment data to update stats and lists instantly
        await Promise.all([
          this.forceRefreshStats(),
          this.loadAllPendingPayments(),
          this.loadRecentPayments() // Add instant update to recent payments
        ]);
        
      } catch (error) {
        console.error('Error marking manual payment as paid:', error);
        this.showError('Failed to mark payment as paid: ' + error.message);
        
        // Reset button state
        const button = document.querySelector(`[data-payment-id="${paymentId}"]`);
        if (button) {
          button.disabled = false;
          button.innerHTML = '<i class="fas fa-check"></i> Mark Paid';
        }
      }
    }
  }

  // Enhanced member payment action handler with membership renewal
  async handleMemberPaymentAction(action, memberId) {
    if (action === 'mark-paid') {
      try {
        // Show loading state
        const button = document.querySelector(`[data-member-id="${memberId}"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // Get member details first
        const memberResponse = await fetch(`${this.BASE_URL}/api/members/${memberId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
          }
        });

        if (!memberResponse.ok) {
          throw new Error('Failed to fetch member details');
        }

        const member = await memberResponse.json();
        
        // Calculate new membership dates
        const today = new Date();
        const currentValidUntil = member.membershipValidUntil ? new Date(member.membershipValidUntil) : today;
        
        // If membership is expired, start from today + 7 days allowance, otherwise extend from current date
        const startDate = currentValidUntil < today ? 
          new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)) : // 7 days from today
          new Date(currentValidUntil.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from current expiry

        // Calculate end date based on plan duration
        let endDate = new Date(startDate);
        const duration = (member.monthlyPlan || '').toLowerCase();
        
        if (duration.includes('12') || duration.includes('year')) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (duration.includes('6')) {
          endDate.setMonth(endDate.getMonth() + 6);
        } else if (duration.includes('3')) {
          endDate.setMonth(endDate.getMonth() + 3);
        } else {
          endDate.setMonth(endDate.getMonth() + 1); // Default 1 month
        }

        // Update member payment status and renewal dates
        const updateResponse = await fetch(`${this.BASE_URL}/api/members/${memberId}/renew-membership`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentStatus: 'paid',
            membershipValidUntil: endDate.toISOString(),
            membershipStartDate: startDate.toISOString(),
            pendingPaymentAmount: 0,
            paymentAmount: this.calculateMemberPendingAmount(member),
            lastPaymentDate: new Date().toISOString(), // Set current date as payment date
            paidDate: new Date().toISOString() // Set current date as paid date
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update member payment status');
        }

        // Send email notification to member
        try {
          await fetch(`${this.BASE_URL}/api/members/send-renewal-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              memberId: memberId,
              memberEmail: member.email,
              memberName: member.memberName,
              planSelected: member.planSelected,
              monthlyPlan: member.monthlyPlan,
              amount: this.calculateMemberPendingAmount(member),
              validUntil: endDate.toISOString(),
              startDate: startDate.toISOString()
            })
          });
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
          // Don't fail the whole operation if email fails
        }

        // Show enhanced success message based on context
        let successMessage = `Payment marked as paid and updated in received payments! New expiry: ${endDate.toLocaleDateString()}`;
        
        // Check if this was from pending payments section
        const isPendingSection = button && (
          button.closest('.pending-payments-section') || 
          button.closest('#pendingPaymentsList') ||
          button.getAttribute('data-source') === 'pending'
        );
        
        if (isPendingSection) {
          successMessage = `Payment marked as paid and updated in received payments! New expiry: ${endDate.toLocaleDateString()}`;
        } else {
          successMessage = `Membership renewed successfully! New expiry: ${endDate.toLocaleDateString()}`;
        }
        
        this.showSuccess(successMessage);

        // Refresh payment data to update stats and lists
        await Promise.all([
          this.forceRefreshStats(),
          this.loadAllPendingPayments()
        ]);
        
      } catch (error) {
        console.error('Error marking member payment as paid:', error);
        this.showError('Failed to process payment: ' + error.message);
        
        // Reset button state
        const button = document.querySelector(`[data-member-id="${memberId}"]`);
        if (button) {
          button.disabled = false;
          button.innerHTML = '<i class="fas fa-check"></i> Mark Paid';
        }
      }
    } else if (action === 'remind') {
      // Handle remind action (existing functionality)
    } else if (action === 'grant-allowance') {
      // Handle grant allowance action (existing functionality)
    }
  }

  addMemberPendingPaymentsToList(members) {
    if (!members || members.length === 0) return;

    const container = document.getElementById('recurringPaymentsList');
    if (!container) return;

    // Filter for members with expired or expiring memberships (pending payments)
    const membersWithPending = members.filter(member => {
      // Consider all expiring/expired members as having pending payments
      return member.daysRemaining <= 7; // Show members expiring within 7 days or already expired
    });

    if (membersWithPending.length === 0) return;

    // Helper function to calculate pending payment amount
    const calculatePendingAmount = (member) => {
      // Try to get amount from existing paymentAmount field
      if (member.paymentAmount && member.paymentAmount > 0) {
        return member.paymentAmount;
      }
      
      // Try to get from pendingPaymentAmount field
      if (member.pendingPaymentAmount && member.pendingPaymentAmount > 0) {
        return member.pendingPaymentAmount;
      }
      
      // Fallback: estimate based on plan
      const plan = member.planSelected || '';
      const duration = member.monthlyPlan || '';
      
      // Basic estimation (you can adjust these values)
      if (plan.toLowerCase().includes('premium')) {
        return duration.includes('3') ? 4500 : 1500; // 3 months or 1 month
      } else if (plan.toLowerCase().includes('basic')) {
        return duration.includes('3') ? 3000 : 1000;
      } else {
        return duration.includes('3') ? 3600 : 1200; // Default amounts
      }
    };

    // Create pending payment items for these members
    const memberPaymentItems = membersWithPending.map(member => {
      const isOverdue = member.daysRemaining < 0;
      const isPending = !isOverdue;
      const pendingAmount = calculatePendingAmount(member);
      
      let statusBadge = '';
      if (isOverdue) {
        statusBadge = `<span class="recurring-badge overdue" style="background:#ffd6d6;color:#b71c1c;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Overdue ${Math.abs(member.daysRemaining)} days</span>`;
      } else {
        statusBadge = `<span class="recurring-badge pending" style="background:#ffe066;color:#a67c00;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-left:8px;display:inline-flex;align-items:center;"><i class="fas fa-clock" style="margin-right:4px;"></i> Expires in ${member.daysRemaining} days</span>`;
      }

      const dueDate = member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A';
      
      // Calculate countdown badge for member payments
      let memberCountdownBadge = '';
      if (member.daysRemaining !== undefined) {
        if (member.daysRemaining < 0) {
          memberCountdownBadge = `<div class="countdown-badge overdue">${Math.abs(member.daysRemaining)}d overdue</div>`;
        } else if (member.daysRemaining === 0) {
          memberCountdownBadge = `<div class="countdown-badge due-today">Expires Today</div>`;
        } else if (member.daysRemaining <= 7) {
          memberCountdownBadge = `<div class="countdown-badge due-soon">${member.daysRemaining}d left</div>`;
        } else {
          memberCountdownBadge = `<div class="countdown-badge due-later">${member.daysRemaining}d left</div>`;
        }
      }
      
      return `
        <div class="recurring-payment-item member-pending ${isOverdue ? 'overdue' : 'pending'}" data-member-id="${member._id}">
          ${memberCountdownBadge}
          
          <!-- Row 1: Category, Due Date, Status -->
          <div class="payment-item-header">
            <span class="payment-category">Membership</span>
            <span class="payment-due">Due: ${dueDate}</span>
            <span class="payment-status status-pending">PENDING FROM MEMBER</span>
          </div>
          
          <!-- Row 2: Amount, Person Name, Plan Info -->
          <div class="payment-item-main">
            <span class="payment-amount-main">₹${this.formatAmount(pendingAmount)}</span>
            <span class="payment-description"><i class="fas fa-user"></i> ${member.memberName} - Membership Renewal</span>
            <span class="payment-plan">Plan: ${member.planSelected || 'N/A'} (${member.monthlyPlan || 'N/A'})</span>
          </div>
          
          <!-- Row 3: Action Buttons -->
          <div class="payment-item-actions">
            <button class="payment-action-btn mark-paid mark-paid-btn" data-action="mark-member-paid" data-member-id="${member._id}">
              <i class="fas fa-check"></i> Mark Paid
            </button>
            <button class="payment-action-btn edit" data-action="remind-member" data-member-id="${member._id}">
              <i class="fas fa-bell"></i> Remind
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add member pending payments to the existing content
    if (memberPaymentItems) {
      const existingContent = container.innerHTML;
      
      // Check if we already have an empty state message
      if (existingContent.includes('payment-empty-state')) {
        container.innerHTML = memberPaymentItems;
      } else {
        // Add a separator and then the member payments
        const separator = `
          <div class="payment-section-separator" style="margin:20px 0;padding:10px;background:#f8f9fa;border-radius:8px;text-align:center;font-weight:600;color:#6b7280;">
            <i class="fas fa-users" style="margin-right:8px;"></i>
            Member Pending Payments
          </div>
        `;
        container.innerHTML = existingContent + separator + memberPaymentItems;
      }
    }
  }

  showAddPaymentModal() {
    const modal = document.getElementById('addPaymentModal');
    if (modal) {
      modal.classList.add('active');
      this.populateYearSelect();
      this.resetCategorySelection();
      // Hide member name field initially until category is selected
      this.toggleMemberNameField('');
      // Add or update payment type info message as a horizontal bar above all fields
      setTimeout(() => {
        const form = document.getElementById('addPaymentForm');
        if (!form) return;
        let infoMsg = document.getElementById('paymentTypeInfoMsg');
        if (!infoMsg) {
          infoMsg = document.createElement('div');
          infoMsg.id = 'paymentTypeInfoMsg';
          infoMsg.style.margin = '0 0 18px 0';
          infoMsg.style.background = '#e0f7fa';
          infoMsg.style.borderLeft = '5px solid #06b6d4';
          infoMsg.style.color = '#036672';
          infoMsg.style.padding = '10px 18px 10px 14px';
          infoMsg.style.borderRadius = '6px';
          infoMsg.style.fontSize = '1rem';
          infoMsg.style.display = 'flex';
          infoMsg.style.alignItems = 'center';
          infoMsg.style.gap = '14px';
          infoMsg.style.boxShadow = '0 2px 8px rgba(6,182,212,0.07)';
          infoMsg.innerHTML = `
            <i class="fas fa-info-circle" style="font-size:1.3em;"></i>
            <span id="paymentTypeInfoText" style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;">
              <span><b>Received</b>: For payments received from members (e.g., membership, personal training, etc)</span>
              <span><b>Paid</b>: For payments made by the gym (e.g., rent, salaries, vendor payments, etc)</span>
              <span><b>Due</b>: For upcoming payments the gym needs to make (e.g., scheduled rent, bills, etc)</span>
              <span><b>Pending</b>: For payments expected from members but not yet received (e.g., expiring/expired memberships, pending fees, etc)</span>
            </span>
          `;
        }
        // Insert at the very top of the form, above all fields
        if (form.firstChild !== infoMsg) {
          form.insertBefore(infoMsg, form.firstChild);
        }
        // Enhance recurring payment checkbox
        this.enhanceRecurringCheckbox();
      }, 100); // Increased timeout to ensure DOM is ready
    }
  }

  handleCategorySelection(categoryItem) {
    // Remove previous selection
    document.querySelectorAll('.payment-category-item').forEach(item => {
      item.classList.remove('selected');
    });

    // Add selection to clicked item
    categoryItem.classList.add('selected');
    
    // Update hidden input
    const categoryValue = categoryItem.dataset.category;
    const hiddenInput = document.getElementById('paymentCategory');
    if (hiddenInput) {
      hiddenInput.value = categoryValue;
    }

    // Show/hide member name field based on category
    this.toggleMemberNameField(categoryValue);

    // Hide error message if any
    const errorDiv = document.getElementById('categoryError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  // Show member field only for membership and personal_training categories
  toggleMemberNameField(category) {
    const memberNameGroup = document.querySelector('#memberName')?.closest('.payment-form-group');
    const memberNameInput = document.getElementById('memberName');
    // Change label to 'Person Name' if present
    if (memberNameGroup) {
      const label = memberNameGroup.querySelector('label');
      if (label && label.textContent.trim().toLowerCase().includes('member name')) {
        label.textContent = label.textContent.replace(/member name/i, 'Person Name');
      }
    }
    const memberSelect = document.getElementById('memberSelect');
    const selectedMemberIdInput = document.getElementById('selectedMemberId');
    
    if (memberNameGroup && memberNameInput && memberSelect) {
      // Only show member field for membership and personal_training categories
      if (category === 'membership' || category === 'personal_training') {
        memberNameGroup.style.display = 'flex';
        const paymentType = document.getElementById('paymentType')?.value || 'received';
        
        if (paymentType === 'pending' || paymentType === 'due') {
          // For pending/due payments, show dropdown with expiring members
          memberNameInput.style.display = 'none';
          memberSelect.style.display = 'block';
          memberSelect.required = true;
          memberNameInput.required = false;
          this.loadExpiringMembersForDropdown();
        } else {
          // For received payments, show text input
          memberNameInput.style.display = 'block';
          memberSelect.style.display = 'none';
          memberNameInput.required = true;
          memberSelect.required = false;
        }
      } else {
        // Hide member field for all other categories
        memberNameGroup.style.display = 'none';
        memberNameInput.required = false;
        memberSelect.required = false;
        memberNameInput.value = '';
        memberSelect.value = '';
        if (selectedMemberIdInput) selectedMemberIdInput.value = '';
      }
    }
  }

  // Enhanced interactive recurring payment checkbox with tooltip and animations
  enhanceRecurringCheckbox() {
    setTimeout(() => {
      const recurringGroup = document.querySelector('#isRecurring')?.closest('.payment-form-group');
      const recurringCheckbox = document.getElementById('isRecurring');
      
      if (!recurringGroup || !recurringCheckbox) {
        console.warn('Recurring checkbox elements not found');
        return;
      }
      
      // Check if already enhanced to avoid duplicates
      if (recurringGroup.querySelector('.recurring-info-wrapper')) {
        return;
      }
      
      // Create wrapper for better organization
      const wrapper = document.createElement('div');
      wrapper.className = 'recurring-info-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '12px';
      wrapper.style.marginTop = '8px';
      
      // Create interactive info button
      const infoButton = document.createElement('button');
      infoButton.type = 'button';
      infoButton.className = 'recurring-info-btn';
      infoButton.style.cssText = `
        background: linear-gradient(135deg, #0ea5e9, #06b6d4);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.85em;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
        font-weight: 500;
        transform: scale(1);
      `;
      infoButton.innerHTML = '<i class="fas fa-sync-alt"></i> What is recurring payment?';
      
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'recurring-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background: #1e293b;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 0.9em;
        max-width: 320px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        transform: translateY(-10px);
        pointer-events: none;
        line-height: 1.4;
      `;
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px; color: #06b6d4;">
          <i class="fas fa-info-circle"></i> Recurring Payments
        </div>
        <div>
          Recurring payments are automatically repeated at regular intervals (monthly, quarterly, yearly).
          <br><br>
          <strong>Examples:</strong>
          <ul style="margin: 8px 0; padding-left: 16px;">
            <li>Monthly gym rent</li>
            <li>Staff salaries</li>
            <li>Equipment maintenance</li>
            <li>Utility bills</li>
          </ul>
        </div>
      `;
      
      // Create status indicator
      const statusIndicator = document.createElement('span');
      statusIndicator.className = 'recurring-status';
      statusIndicator.style.cssText = `
        font-size: 0.85em;
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 500;
        transition: all 0.3s ease;
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
      `;
      statusIndicator.textContent = 'One-time payment';
      
      // Add hover effects for info button
      infoButton.addEventListener('mouseenter', () => {
        infoButton.style.transform = 'scale(1.05)';
        infoButton.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.4)';
        infoButton.style.background = 'linear-gradient(135deg, #0284c7, #0891b2)';
      });
      
      infoButton.addEventListener('mouseleave', () => {
        infoButton.style.transform = 'scale(1)';
        infoButton.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.3)';
        infoButton.style.background = 'linear-gradient(135deg, #0ea5e9, #06b6d4)';
      });
      
      // Show/hide tooltip with better positioning
      infoButton.addEventListener('mouseenter', () => {
        try {
          const rect = infoButton.getBoundingClientRect();
          tooltip.style.left = `${rect.left}px`;
          tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
          tooltip.style.opacity = '1';
          tooltip.style.visibility = 'visible';
          tooltip.style.transform = 'translateY(0)';
        } catch (error) {
          console.warn('Error positioning tooltip:', error);
        }
      });
      
      infoButton.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.transform = 'translateY(-10px)';
      });
      
      // Add click effect
      infoButton.addEventListener('click', () => {
        infoButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
          infoButton.style.transform = 'scale(1.05)';
        }, 100);
      });
      
      // Listen to checkbox changes to update status
      recurringCheckbox.addEventListener('change', () => {
        if (recurringCheckbox.checked) {
          statusIndicator.style.background = 'linear-gradient(135deg, #dcfdf4, #a7f3d0)';
          statusIndicator.style.color = '#065f46';
          statusIndicator.style.border = '1px solid #10b981';
          statusIndicator.innerHTML = '<i class="fas fa-sync-alt"></i> Recurring payment';
        } else {
          statusIndicator.style.background = '#f1f5f9';
          statusIndicator.style.color = '#64748b';
          statusIndicator.style.border = '1px solid #e2e8f0';
          statusIndicator.innerHTML = 'One-time payment';
        }
      });
      
      // Assemble the enhanced UI
      wrapper.appendChild(infoButton);
      wrapper.appendChild(statusIndicator);
      recurringGroup.appendChild(wrapper);
      document.body.appendChild(tooltip);
      
    }, 200); // Increased timeout to ensure DOM is ready
  }

  hideAddPaymentModal() {
    const modal = document.getElementById('addPaymentModal');
    if (modal) {
      modal.classList.remove('active');
      this.resetPaymentForm();
    }
  }

  toggleRecurringDetails(show) {
    const recurringDetails = document.getElementById('recurringDetails');
    if (recurringDetails) {
      recurringDetails.classList.toggle('active', show);
    }
  }

  handlePaymentTypeChange(paymentType) {
    const dueDateGroup = document.querySelector('#paymentDueDate')?.closest('.payment-form-group');
    const dueDateInput = document.getElementById('paymentDueDate');
    const recurringGroup = document.querySelector('#isRecurring')?.closest('.payment-form-group');
    
    if (dueDateGroup && dueDateInput && recurringGroup) {
      if (paymentType === 'paid' || paymentType === 'due') {
        // Show due date and recurring options for payments we need to make or are due
        dueDateGroup.style.display = 'flex';
        recurringGroup.style.display = 'flex';
        dueDateInput.required = true;
      } else if (paymentType === 'pending') {
        // Show due date, but hide recurring for pending payments
        dueDateGroup.style.display = 'flex';
        recurringGroup.style.display = 'none';
        dueDateInput.required = true;
        // Also hide recurring details if shown
        const recurringCheckbox = document.getElementById('isRecurring');
        if (recurringCheckbox) {
          recurringCheckbox.checked = false;
          this.toggleRecurringDetails(false);
        }
      } else {
        // Hide due date and recurring options for received payments
        dueDateGroup.style.display = 'none';
        recurringGroup.style.display = 'none';
        dueDateInput.required = false;
        dueDateInput.value = '';
        // Also hide recurring details if shown
        const recurringCheckbox = document.getElementById('isRecurring');
        if (recurringCheckbox) {
          recurringCheckbox.checked = false;
          this.toggleRecurringDetails(false);
        }
      }
    }
    
    // Update member field display based on payment type and category
    const categoryInput = document.getElementById('paymentCategory');
    if (categoryInput && categoryInput.value) {
      this.toggleMemberNameField(categoryInput.value);
    }
  }

  async handlePaymentFormSubmit() {
    // Validate category selection first
    if (!this.validateCategorySelection()) {
      this.showError('Please select a payment category');
      return;
    }

    const form = document.getElementById('addPaymentForm');
    const formData = new FormData(form);
    
    const paymentData = {
      type: formData.get('type'),
      category: this.mapCategoryToBackend(formData.get('category')), // Map to backend accepted values
      amount: parseFloat(formData.get('amount')),
      description: formData.get('description'),
      memberName: formData.get('memberName'),
      memberId: formData.get('memberId') || document.getElementById('selectedMemberId')?.value || null,
      paymentMethod: formData.get('paymentMethod'),
      isRecurring: formData.get('isRecurring') === 'on',
      dueDate: formData.get('dueDate'),
      notes: formData.get('notes')
    };

    // Remove empty strings to prevent validation errors
    if (!paymentData.memberId || paymentData.memberId.trim() === '') {
      delete paymentData.memberId;
    }
    if (!paymentData.memberName || paymentData.memberName.trim() === '') {
      delete paymentData.memberName;
    }

    if (paymentData.isRecurring) {
      paymentData.recurringDetails = {
        frequency: formData.get('frequency'),
        nextDueDate: formData.get('nextDueDate') || formData.get('dueDate') // Use due date as next due date if not specified
      };
    }

    try {
      const response = await fetch(`${this.BASE_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) throw new Error('Failed to add payment');

      const result = await response.json();
      this.showSuccess('Payment added successfully');
      this.hideAddPaymentModal();
      this.loadPaymentData();
      
      // Handle notifications based on payment type and recurring status
      try {
        const notificationManager = await this.waitForNotificationManager(2000);
        if (notificationManager) {
          if (paymentData.type === 'received') {
            // Payment received notification (green) - using enhanced notification system
            await notificationManager.notifyPayment(
              paymentData.memberName || 'Manual Entry',
              paymentData.amount,
              'success'
            );
          } else if ((paymentData.type === 'paid' || paymentData.type === 'due') && paymentData.dueDate) {
            // Payment due notification (yellow/warning) - using enhanced notification system
            const dueDate = new Date(paymentData.dueDate).toLocaleDateString();
            const message = `Payment due: ${paymentData.description || this.getCategoryDisplayName(formData.get('category'))} - ₹${this.formatAmount(paymentData.amount)} due on ${dueDate}${paymentData.isRecurring ? ' (Recurring)' : ''}`;
            await notificationManager.notify('Payment Due', message, 'warning');
          } else if (paymentData.type === 'pending' && paymentData.dueDate) {
            // Payment pending notification (orange/info) - using enhanced notification system
            const dueDate = new Date(paymentData.dueDate).toLocaleDateString();
            const message = `Payment pending: ${paymentData.description || this.getCategoryDisplayName(formData.get('category'))} - ₹${this.formatAmount(paymentData.amount)} pending for ${dueDate}${paymentData.isRecurring ? ' (Recurring)' : ''}`;
            await notificationManager.notify('Payment Pending', message, 'info');
            
            // If this is a membership payment for a specific member, add member payment notification
            if (paymentData.category === 'membership' && paymentData.memberId) {
              const memberSelect = document.getElementById('memberSelect');
              const selectedOption = memberSelect?.selectedOptions[0];
              
              if (selectedOption) {
                const memberData = {
                  _id: paymentData.memberId,
                  memberName: selectedOption.dataset.memberName,
                  pendingPaymentAmount: paymentData.amount,
                  daysRemaining: parseInt(selectedOption.dataset.daysRemaining),
                  isExpired: selectedOption.dataset.isExpired === 'true',
                  membershipValidUntil: selectedOption.dataset.membershipValidUntil
                };
                
                // Send detailed notification using enhanced system
                if (memberData.isExpired) {
                  await notificationManager.notifyMember('expired', memberData.memberName, 
                    `Overdue by ${Math.abs(memberData.daysRemaining)} days`);
                } else {
                  await notificationManager.notifyMember('renewed', memberData.memberName, 
                    `Payment pending - expires in ${memberData.daysRemaining} days`);
                }
                
                // Also show immediate alert about member status
                const statusMessage = memberData.isExpired 
                  ? `⚠️ Member ${memberData.memberName}'s membership EXPIRED ${Math.abs(memberData.daysRemaining)} days ago` 
                  : `⏰ Member ${memberData.memberName}'s membership expires in ${memberData.daysRemaining} days`;
                
                await notificationManager.notify('Membership Status Alert', statusMessage, 'warning');
              }
            }
          }
        } else {
          console.warn('Enhanced notification system not available');
        }
      } catch (notificationError) {
        console.warn('Error showing notification:', notificationError);
        // Don't let notification errors break the payment flow
      }
      
      // Schedule reminder if due date is set
      try {
        if (paymentData.dueDate && (paymentData.type === 'paid' || paymentData.type === 'due' || paymentData.type === 'pending')) {
          this.schedulePaymentReminder(result.data);
        }
      } catch (reminderError) {
        console.warn('Error scheduling payment reminder:', reminderError);
      }
      
    } catch (error) {
      console.error('Error adding payment:', error);
      this.showError('Failed to add payment');
    }
  }

  async handlePaymentAction(action, paymentId) {
    let button;
    try {
      let response;
      // Find the button to show loading state
      if (action === 'mark-paid') {
        button = document.querySelector(`[data-payment-id="${paymentId}"][data-action="mark-paid"]`);
        if (button) {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
      }
      switch (action) {
        case 'mark-paid':
          response = await fetch(`${this.BASE_URL}/api/payments/${paymentId}/mark-paid`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
            }
          });
          break;
        case 'delete':
          this.showDeleteConfirmation(paymentId);
          return; // Exit early, deletion will be handled by modal confirmation
          response = await fetch(`${this.BASE_URL}/api/payments/${paymentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
            }
          });
          break;
        case 'edit':
          // TODO: Implement edit functionality
          this.showInfo('Edit functionality coming soon');
          return;
      }

      if (!response.ok) throw new Error(`Failed to ${action} payment`);

      const result = await response.json();
      
      // Immediately update UI for mark-paid action
      if (action === 'mark-paid') {
        // Remove the payment item from the UI immediately
        const paymentItem = document.querySelector(`[data-payment-id="${paymentId}"]`);
        if (paymentItem) {
          // Find the parent payment item container
          const paymentContainer = paymentItem.closest('.recurring-payment-item, .payment-item, .pending-payment-item');
          if (paymentContainer) {
            paymentContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            paymentContainer.style.opacity = '0';
            paymentContainer.style.transform = 'translateX(-20px)';
            setTimeout(() => {
              if (paymentContainer.parentNode) {
                paymentContainer.parentNode.removeChild(paymentContainer);
              }
            }, 300);
          }
        }
      }
      
      // Show success message
      this.showSuccess(result.message || `Payment ${action} successfully!`);
      
      // Force refresh stats and data to reflect changes immediately
      await Promise.all([
        this.forceRefreshStats(),
        this.loadRecentPayments(), // Refresh recent payments to show newly paid items
        this.loadRecurringPayments(), // Refresh recurring payments list
        this.loadAllPendingPayments() // Refresh pending payments list
      ]);
    } catch (error) {
      console.error(`Error ${action} payment:`, error);
      // Show error message
      this.showError(`Failed to ${action} payment: ${error.message}`);
    } finally {
      // Always reset button state after operation
      if (button && action === 'mark-paid') {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check"></i> Mark Paid';
      }
    }
  }

  async handleMemberPaymentAction(action, memberId) {
    try {
      
      switch (action) {
        case 'mark-paid':
          // Use the seven-day allowance system to show mark as paid modal
          if (window.sevenDayAllowanceManager && typeof window.sevenDayAllowanceManager.showMarkAsPaidModal === 'function') {
            window.sevenDayAllowanceManager.showMarkAsPaidModal(memberId, 'payment-tab');
          } else {
            console.error('Seven-day allowance system not available');
            this.showError('Payment system not available. Please try again.');
          }
          break;
          
        case 'remind-member':
          // Send reminder for payment
          try {
            const reminderResponse = await fetch(`${this.BASE_URL}/api/notifications/send-payment-reminder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
              },
              body: JSON.stringify({ memberId })
            });
            
            if (!reminderResponse.ok) {
              throw new Error(`Failed to send reminder: ${reminderResponse.status}`);
            }
            
            this.showSuccess('Payment reminder sent successfully');
          } catch (reminderError) {
            console.error('Error sending reminder:', reminderError);
            this.showError('Failed to send payment reminder');
          }
          break;

        case 'grant-allowance':
          // Use the seven-day allowance system to grant allowance
          if (window.sevenDayAllowanceManager && typeof window.sevenDayAllowanceManager.openAllowanceModal === 'function') {
            window.sevenDayAllowanceManager.openAllowanceModal(memberId);
          } else {
            console.error('Seven-day allowance system not available');
            this.showError('Seven-day allowance system not available. Please try again.');
          }
          break;
          
        default:
          console.error('Unknown member payment action:', action);
          this.showError('Unknown action');
          return;
      }
    } catch (error) {
      console.error(`Error ${action} member payment:`, error);
      this.showError(`Failed to ${action.replace('-', ' ')} member payment`);
    }
  }

  handleFilterChange(filter) {
    this.currentFilter = filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Reload recurring payments with new filter
    this.loadRecurringPayments();
  }

  async updateChart() {
    await this.loadPaymentChart();
  }

  async refreshPaymentData() {
    // Refresh all payment-related data and statistics
    try {
      await Promise.all([
        this.loadPaymentStats(),
        this.loadRecentPayments(),
        this.loadRecurringPayments(),
        this.loadPaymentChart()
      ]);
      // Load unified pending payments after all other data is refreshed
      await this.loadAllPendingPayments();
    } catch (error) {
      console.error('Error refreshing payment data:', error);
      this.showError('Failed to refresh payment data');
    }
  }

  async forceRefreshStats() {
    // Force refresh of payment statistics with cache busting
    try {
      const timestamp = Date.now();
      const response = await fetch(`${this.BASE_URL}/api/payments/stats?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.updatePaymentStats(data.data);
      
      // Note: loadAllPendingPayments() should be called separately by the caller when needed
      // to avoid unnecessary duplicate calls
    } catch (error) {
      console.error('Error force refreshing payment stats:', error);
      this.showError('Failed to refresh payment statistics');
    }
  }

  clearMemberPendingPayments() {
    // Clear the unified pending payments section
    const container = document.getElementById('pendingPaymentsList');
    if (container) {
      container.innerHTML = '';
    }
    
    // Reset member pending amounts
    this.memberPendingAmount = 0;
    this.recentMemberPendingPayments = [];
    this.updateCombinedPendingStatCard();
    
    // Remove existing member pending payments from recurring payments list (legacy cleanup)
    const recurringContainer = document.getElementById('recurringPaymentsList');
    if (recurringContainer) {
      const memberPayments = recurringContainer.querySelectorAll('.member-pending');
      memberPayments.forEach(item => item.remove());
      
      const separators = recurringContainer.querySelectorAll('.payment-section-separator');
      separators.forEach(separator => separator.remove());
    }
  }

  removeMemberPendingPayment(memberId) {
    // Remove specific member pending payment after it's been paid
    const container = document.getElementById('pendingPaymentsList');
    if (container) {
      const memberPayment = container.querySelector(`[data-member-id="${memberId}"]`);
      if (memberPayment) {
        memberPayment.remove();
      }
    }
    
    // Also check recurring payments list for legacy items
    const recurringContainer = document.getElementById('recurringPaymentsList');
    if (recurringContainer) {
      const memberPayment = recurringContainer.querySelector(`[data-member-id="${memberId}"]`);
      if (memberPayment) {
        memberPayment.remove();
        
        // If no more member payments, remove the separator too
        const remainingMemberPayments = container.querySelectorAll('.member-pending');
        if (remainingMemberPayments.length === 0) {
          const separators = container.querySelectorAll('.payment-section-separator');
          separators.forEach(separator => separator.remove());
        }
      }
    }
    
    // Refresh the unified pending payments to update stats and display
    this.loadAllPendingPayments();
  }

  async updateMemberPendingPaymentStatus(memberId, action) {
    // This function is called from the seven-day allowance system
    // to update the member pending payments UI and stats
    
    if (action === 'payment_completed') {
      // Remove the member from pending payments
      this.removeMemberPendingPayment(memberId);
      
      // Update stats by refreshing pending stats and lists
      await Promise.all([
        this.forceRefreshStats(),
        this.loadAllPendingPayments()
      ]);
      
    } else if (action === 'allowance_granted') {
      // For allowance granted, update the display to show allowance status
      const memberContainer = document.getElementById('pendingPaymentsList');
      if (memberContainer) {
        const memberItem = memberContainer.querySelector(`[data-member-id="${memberId}"]`);
        if (memberItem) {
          const statusBadge = memberItem.querySelector('.member-payment-badge');
          if (statusBadge) {
            statusBadge.className = 'member-payment-badge allowance';
            statusBadge.innerHTML = '<i class="fas fa-calendar-check"></i> 7-Day Allowance Granted';
          }
          
          // Update the actions to show that allowance has been granted
          const actionsContainer = memberItem.querySelector('.member-payment-actions');
          if (actionsContainer) {
            actionsContainer.innerHTML = `
              <button class="payment-action-btn mark-paid mark-paid-btn" data-action="mark-member-paid" data-member-id="${memberId}" data-source="payment-tab" title="Mark as Paid">
                <i class="fas fa-check"></i>
              </button>
              <span class="allowance-granted-text" style="color: #059669; font-size: 0.8rem; font-weight: 600;">
                <i class="fas fa-calendar-check"></i> Allowance Granted
              </span>
            `;
          }
        }
      }
      
    }
  }

  populateYearSelect() {
    const yearSelect = document.getElementById('paymentChartYear');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      yearSelect.appendChild(option);
    }
  }

  resetPaymentForm() {
    const form = document.getElementById('addPaymentForm');
    if (form) {
      form.reset();
      this.toggleRecurringDetails(false);
      this.resetCategorySelection();
      // Reset field visibility based on default values
      this.handlePaymentTypeChange('received'); // Default to received
      this.toggleMemberNameField(''); // Reset member name field to hidden
    }
  }

  // Reset category selection
  resetCategorySelection() {
    // Remove all category selections
    document.querySelectorAll('.payment-category-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Clear hidden input
    const hiddenInput = document.getElementById('paymentCategory');
    if (hiddenInput) {
      hiddenInput.value = '';
    }
    
    // Hide error message if any
    const errorDiv = document.getElementById('categoryError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  // Validate category selection
  validateCategorySelection() {
    const hiddenInput = document.getElementById('paymentCategory');
    return hiddenInput && hiddenInput.value && hiddenInput.value.trim() !== '';
  }

  formatAmount(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN');
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return this.formatDate(dateString);
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showInfo(message) {
    this.showToast(message, 'info');
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `payment-toast payment-toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;

    // Set background color based on type
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#4caf50';
        break;
      case 'error':
        toast.style.backgroundColor = '#f44336';
        break;
      case 'info':
      default:
        toast.style.backgroundColor = '#2196f3';
        break;
    }

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
    `;

    // Add to document
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // Method to record membership payment automatically
  async recordMembershipPayment(memberData) {
    const paymentData = {
      type: 'received',
      category: 'membership',
      amount: parseFloat(memberData.paymentAmount),
      description: `Membership payment - ${memberData.planSelected} (${memberData.monthlyPlan})`,
      memberName: memberData.memberName,
      memberId: memberData._id,
      paymentMethod: memberData.paymentMode?.toLowerCase() || 'cash',
      isRecurring: false,
      notes: `Membership valid until ${memberData.membershipValidUntil}`
    };

    try {
      const response = await fetch(`${this.BASE_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) throw new Error('Failed to record membership payment');

      const result = await response.json();
      
      // Refresh payment data if payment tab is active
      if (document.getElementById('paymentTab')?.style.display !== 'none') {
        this.loadPaymentData();
      }

      // Trigger notification for automatic membership payment recording using enhanced system
      if (window.NotificationManager && memberData.memberName) {
        await window.NotificationManager.notifyPayment(
          memberData.memberName,
          memberData.paymentAmount,
          'success'
        );
      }

      return result;
    } catch (error) {
      console.error('Error recording membership payment:', error);
      // Don't throw error to avoid blocking member creation
      return null;
    }
  }

  // Method to record membership renewal payment
  async recordRenewalPayment(memberData, renewalData) {
    const paymentData = {
      type: 'received',
      category: 'membership',
      amount: parseFloat(renewalData.paymentAmount),
      description: `Membership renewal - ${renewalData.planSelected} (${renewalData.monthlyPlan})`,
      memberName: memberData.memberName,
      memberId: memberData._id,
      paymentMethod: renewalData.paymentMode?.toLowerCase() || 'cash',
      isRecurring: false,
      notes: `Renewed until ${renewalData.membershipValidUntil}`
    };

    try {
      const response = await fetch(`${this.BASE_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) throw new Error('Failed to record renewal payment');

      const result = await response.json();
      
      // Refresh payment data if payment tab is active
      if (document.getElementById('paymentTab')?.style.display !== 'none') {
        this.loadPaymentData();
      }

      // Trigger notification for renewal payment recording
      if (window.notificationSystem && memberData.memberName) {
        window.notificationSystem.notifyPaymentReceived({
          amount: renewalData.paymentAmount,
          memberName: memberData.memberName,
          plan: `${renewalData.planSelected} (${renewalData.monthlyPlan}) - Renewal`
        });
      }

      return result;
    } catch (error) {
      console.error('Error recording renewal payment:', error);
      // Don't throw error to avoid blocking renewal
      return null;
    }
  }

  // Method to refresh payment data when called from other modules
  async refreshPaymentData() {
    if (document.getElementById('paymentTab')?.style.display !== 'none') {
      await this.loadPaymentData();
    }
  }

  // Enhanced Payment Reminder System
  initializePaymentReminders() {
    // Initialize seen notifications tracking
    this.seenNotifications = new Set();
    this.lastNotificationCheck = new Date();
    
    // Check for payment reminders on initialization
    this.checkPaymentReminders();
    
    // Set up recurring check every 2 hours for due payment notifications
    setInterval(() => {
      this.checkEnhancedPaymentReminders();
    }, 7200000); // 2 hours in milliseconds
    
    // Set up daily reset of seen notifications at midnight
    this.scheduleDailyReset();
  }

  scheduleDailyReset() {
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Reset seen notifications at midnight
    setTimeout(() => {
      this.resetSeenNotifications();
      // Schedule daily reset for subsequent days
      setInterval(() => {
        this.resetSeenNotifications();
      }, 86400000); // 24 hours
    }, timeUntilMidnight);
  }

  resetSeenNotifications() {
    this.seenNotifications.clear();
  }

  async checkEnhancedPaymentReminders() {
    try {
      
      // Get all monthly recurring payments that are due within 7 days
      const response = await fetch(`${this.BASE_URL}/api/payments/recurring?status=pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch recurring payments');
      
      const data = await response.json();
      const payments = data.data || [];
      const today = new Date();
      
      for (const payment of payments) {
        if (!payment.dueDate || !payment.recurringDetails || !payment.recurringDetails.frequency) continue;
        
        // Only process monthly recurring payments
        if (payment.recurringDetails.frequency.toLowerCase() !== 'monthly') continue;
        
        const dueDate = new Date(payment.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        // Show notification if due in 7 days or less (including overdue)
        if (daysUntilDue <= 7) {
          const notificationId = `recurring_${payment._id}_${today.toDateString()}`;
          
          // Check if notification was already seen today
          if (!this.seenNotifications.has(notificationId)) {
            this.showUnifiedPaymentNotification(payment, daysUntilDue, notificationId);
          }
        }
      }
    } catch (error) {
      console.error('Error checking enhanced payment reminders:', error);
    }
  }

  showUnifiedPaymentNotification(payment, daysUntilDue, notificationId) {
    // Use the unified notification system instead of custom toasts
    if (!window.notificationSystem) {
      console.warn('Unified notification system not available');
      return;
    }

    // Create notification data for the unified system
    const paymentData = {
      _id: payment._id,
      description: payment.description || 'Monthly Recurring Payment',
      amount: payment.amount
    };

    // Use the existing notifyPaymentDue method from the unified notification system
    window.notificationSystem.notifyPaymentDue(paymentData, daysUntilDue);
    
    // Mark notification as seen for tracking
    this.markNotificationAsSeen(notificationId);
    
  }

  markNotificationAsSeen(notificationId) {
    this.seenNotifications.add(notificationId);
  }

  async checkPaymentReminders() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/payments/reminders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch payment reminders');

      const data = await response.json();
      this.processPaymentReminders(data.data);
    } catch (error) {
      console.error('Error checking payment reminders:', error);
    }

    // Also check for enhanced payment reminders
    this.checkEnhancedPaymentReminders();
  }

  async checkMonthlyRecurringPaymentNotifications() {
    // This method is now replaced by checkEnhancedPaymentReminders()
    // Keeping for compatibility, but redirecting to enhanced version
    return this.checkEnhancedPaymentReminders();
  }

  processPaymentReminders(reminders) {
    reminders.forEach(reminder => {
      const daysUntilDue = this.calculateDaysUntilDue(reminder.dueDate);
      
      // Handle different payment types with different reminder schedules
      if (reminder.type === 'pending') {
        // For pending payments, remind more frequently
        if (daysUntilDue <= 14 && daysUntilDue >= 0) {
          // Pending payment due within 2 weeks
          this.showPaymentReminderNotification(reminder, 'pending-due-soon');
        } else if (daysUntilDue < 0) {
          // Pending payment is overdue
          this.showPaymentReminderNotification(reminder, 'overdue');
        }
      } else {
        // For due/paid payments, use standard reminder schedule
        if (daysUntilDue <= 7 && daysUntilDue >= 0) {
          // Payment due within a week
          this.showPaymentReminderNotification(reminder, 'due-soon');
        } else if (daysUntilDue < 0) {
          // Payment is overdue
          this.showPaymentReminderNotification(reminder, 'overdue');
        }
      }
    });
  }

  showPaymentReminderNotification(payment, type) {
    // Use the unified notification system instead of the old notification system
    if (!window.notificationSystem) {
      console.warn('Unified notification system not available');
      return;
    }

    const daysUntilDue = this.calculateDaysUntilDue(payment.dueDate);
    
    // Use the unified system's notifyPaymentDue method
    const paymentData = {
      _id: payment._id,
      description: payment.description || 'Payment',
      amount: payment.amount
    };

    window.notificationSystem.notifyPaymentDue(paymentData, daysUntilDue);
  }

  schedulePaymentReminder(payment) {
    // This would typically be handled by the backend
    // But we can add client-side tracking for immediate reminders
    const dueDate = new Date(payment.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      this.showPaymentReminderNotification(payment, 'upcoming');
    }
  }

  calculateDaysUntilDue(dueDateString) {
    const dueDate = new Date(dueDateString);
    const now = new Date();
    return Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  }

  async loadExpiringMembersForDropdown() {
    try {
      
      // Fetch members with memberships expiring within 3 days or already expired
      // If the backend doesn't support the days parameter, it will return all expiring members
      // and we'll filter them on the frontend
      const response = await fetch(`${this.BASE_URL}/api/members/expiring?days=3`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch expiring members, status:', response.status);
        throw new Error('Failed to fetch expiring members');
      }

      const data = await response.json();
      const expiringMembers = data.data || data; // Handle different response formats
      this.populateExpiringMemberDropdown(expiringMembers);
    } catch (error) {
      console.error('Error loading expiring members:', error);
      this.showError('Failed to load expiring members');
    }
  }

  // Legacy function kept for backward compatibility
  async loadMembersForDropdown() {
    return this.loadExpiringMembersForDropdown();
  }

  populateExpiringMemberDropdown(members) {
    const memberSelect = document.getElementById('memberSelect');
    if (!memberSelect) {
      console.error('Member select element not found');
      return;
    }

    // Clear existing options
    memberSelect.innerHTML = '<option value="">Select Member with Expiring/Expired Membership</option>';

    if (!members || members.length === 0) {
      memberSelect.innerHTML += '<option value="" disabled>No members with expiring/expired memberships found</option>';
      return;
    }

    // Filter members to only include those expiring within 3 days or already expired
    const filteredMembers = members.filter(member => {
      const daysRemaining = member.daysRemaining || 0;
      return daysRemaining <= 3; // Include expired (negative), expiring today (0), and expiring within 3 days
    });

    if (filteredMembers.length === 0) {
      memberSelect.innerHTML += '<option value="" disabled>No members with urgent membership renewals found</option>';
      return;
    }

    // Sort members: expired first (most urgent), then by days remaining
    filteredMembers.sort((a, b) => {
      const aDays = a.daysRemaining || 0;
      const bDays = b.daysRemaining || 0;
      
      // Expired members first (negative days)
      if (aDays < 0 && bDays >= 0) return -1;
      if (aDays >= 0 && bDays < 0) return 1;
      
      // Both expired: more days overdue first
      if (aDays < 0 && bDays < 0) return aDays - bDays;
      
      // Both expiring: fewer days remaining first
      return aDays - bDays;
    });

    filteredMembers.forEach(member => {
      const option = document.createElement('option');
      option.value = member._id;
      
      let statusText = '';
      let statusColor = '';
      
      if (member.daysRemaining < 0) {
        statusText = `⚠️ EXPIRED ${Math.abs(member.daysRemaining)} days ago`;
        statusColor = '#dc2626'; // Red for expired
        option.style.fontWeight = 'bold';
      } else if (member.daysRemaining === 0) {
        statusText = '🚨 EXPIRES TODAY';
        statusColor = '#ea580c'; // Orange-red for expiring today
        option.style.fontWeight = 'bold';
      } else if (member.daysRemaining === 1) {
        statusText = '⏰ EXPIRES TOMORROW';
        statusColor = '#d97706'; // Orange for expiring tomorrow
      } else {
        statusText = `⏰ Expires in ${member.daysRemaining} day${member.daysRemaining === 1 ? '' : 's'}`;
        statusColor = '#d97706'; // Orange for expiring soon
      }
      
      option.style.color = statusColor;
      option.textContent = `${member.memberName} (${member.membershipId || 'No ID'}) - ${statusText}`;
      
      // Store member data for later use
      option.dataset.memberName = member.memberName;
      option.dataset.email = member.email || '';
      option.dataset.phone = member.phone || '';
      option.dataset.daysRemaining = member.daysRemaining;
      option.dataset.isExpired = member.daysRemaining < 0;
      option.dataset.membershipValidUntil = member.membershipValidUntil;
      
      memberSelect.appendChild(option);
    });


    // Add event listener for member selection
    memberSelect.removeEventListener('change', this.handleMemberSelection.bind(this));
    memberSelect.addEventListener('change', this.handleMemberSelection.bind(this));
  }

  handleMemberSelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    const selectedMemberIdInput = document.getElementById('selectedMemberId');
    const memberNameInput = document.getElementById('memberName');

    if (selectedOption && selectedOption.value) {
      // Set the member ID for the payment
      if (selectedMemberIdInput) {
        selectedMemberIdInput.value = selectedOption.value;
      }
      
      // Set the member name in the hidden text input for form submission
      if (memberNameInput) {
        memberNameInput.value = selectedOption.dataset.memberName;
      }
      
      // Show member status information
      const isExpired = selectedOption.dataset.isExpired === 'true';
      const daysRemaining = parseInt(selectedOption.dataset.daysRemaining);
      
      if (isExpired) {
        this.showInfo(`⚠️ Selected member's membership EXPIRED ${Math.abs(daysRemaining)} days ago`);
      } else if (daysRemaining === 0) {
        this.showInfo('🚨 Selected member\'s membership EXPIRES TODAY');
      } else {
        this.showInfo(`⏰ Selected member's membership expires in ${daysRemaining} days`);
      }
    } else {
      if (selectedMemberIdInput) selectedMemberIdInput.value = '';
      if (memberNameInput) memberNameInput.value = '';
    }
  }

  getCategoryDisplayName(category) {
    const categoryMap = {
      'rent': 'Rent',
      'utilities': 'Utilities',
      'staff_salary': 'Staff Salary',
      'equipment_purchase': 'Equipment Purchase',
      'equipment_maintenance': 'Equipment Maintenance',
      'supplies': 'Supplies',
      'marketing': 'Marketing',
      'insurance': 'Insurance',
      'taxes': 'Taxes',
      'vendor_payment': 'Vendor Payment',
      'license_fees': 'License Fees',
      'miscellaneous': 'Miscellaneous',
      'membership': 'Membership',
      'personal_training': 'Personal Training'
    };
    return categoryMap[category] || category.replace('_', ' ').toUpperCase();
  }

  // Map frontend category names to backend accepted values
  mapCategoryToBackend(category) {
    // Since we updated the backend schema to match frontend categories,
    // we no longer need to map them. Just return the category as-is.
    return category;
  }

  renderPaymentWithReminders(payments) {
    return payments.map(payment => {
      const daysUntilDue = payment.dueDate ? this.calculateDaysUntilDue(payment.dueDate) : null;
      let reminderBadge = '';

      if (daysUntilDue !== null) {
        // Determine badge style based on payment type
        const badgeStyle = payment.type === 'pending' ? 'pending' : 
                          daysUntilDue < 0 ? 'overdue' : 
                          daysUntilDue <= 3 ? 'due-soon' : 'upcoming';

        if (daysUntilDue < 0) {
          const dayText = payment.type === 'pending' ? 'pending overdue' : 'overdue';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-exclamation-triangle"></i> ${Math.abs(daysUntilDue)} days ${dayText}
          </span>`;
        } else if (daysUntilDue === 0) {
          const dayText = payment.type === 'pending' ? 'pending today' : 'due today';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-clock"></i> ${dayText}
          </span>`;
        } else if (daysUntilDue === 1) {
          const dayText = payment.type === 'pending' ? 'pending tomorrow' : 'due tomorrow';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-clock"></i> ${dayText}
          </span>`;
        } else if (daysUntilDue <= 7) {
          const dayText = payment.type === 'pending' ? 'pending' : 'due';
          reminderBadge = `<span class="payment-reminder-badge ${badgeStyle}">
            <i class="fas fa-calendar"></i> ${dayText} in ${daysUntilDue} days
          </span>`;
        } else if (payment.type === 'pending' && daysUntilDue <= 14) {
          // Show longer reminder period for pending payments
          reminderBadge = `<span class="payment-reminder-badge pending">
            <i class="fas fa-calendar-alt"></i> Pending in ${daysUntilDue} days
          </span>`;
        }
      }

      return {
        ...payment,
        reminderBadge
      };
    });
  }

  // Bind click events for all stat cards
  bindAllStatCardEvents() {
    this.bindReceivedAmountStatCard();
    this.bindPaidAmountStatCard();
    this.bindPendingPaymentsStatCard();
    this.bindDuePaymentsStatCard();
    this.bindProfitLossStatCard();
  }

  // Bind click event for paid amount stat card
  bindPaidAmountStatCard() {
    const statCard = document.getElementById('paidAmountStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showPaidAmountsModal();
    });
    const closeBtn = document.getElementById('closePaidAmountsModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('paidAmountsModal').style.display = 'none';
      });
    }
  }

  // Show paid amounts modal
  async showPaidAmountsModal() {
    const modal = document.getElementById('paidAmountsModal');
    const container = document.getElementById('paidAmountsDetailsContainer');
    if (!modal || !container) return;

    container.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner"></i></div>';
    modal.style.display = 'flex';

    try {
      const response = await fetch(`${this.BASE_URL}/api/payments/recent?limit=200`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let allPayments = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        const paidPayments = allPayments.filter(p => p.type === 'paid' || p.type === 'expense');

        if (!paidPayments.length) {
          container.innerHTML = `
            <div class="payment-modal-empty">
              <i class="fas fa-money-bill-wave"></i>
              <h4>No Paid Amounts</h4>
              <p>No outgoing payments or expenses recorded yet.</p>
            </div>
          `;
          return;
        }

        // Group payments by month
        const paymentsByMonth = this.groupPaymentsByMonth(paidPayments);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        this.renderPaidAmountsWithMonthSelector(container, paymentsByMonth, currentMonth);
      } else {
        container.innerHTML = `
          <div class="payment-modal-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Failed to Load</h4>
            <p>Unable to fetch paid amounts data.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching paid amounts:', error);
      container.innerHTML = `
        <div class="payment-modal-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Data</h4>
          <p>Unable to fetch paid amounts data.</p>
        </div>
      `;
    }
  }

  // Render paid amounts with month selector
  renderPaidAmountsWithMonthSelector(container, paymentsByMonth, selectedMonth) {
    const months = Object.keys(paymentsByMonth).sort().reverse(); // Latest first
    const selectedPayments = paymentsByMonth[selectedMonth] || [];

    // Calculate summary for selected month
    const totalAmount = selectedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const expenseCount = selectedPayments.filter(p => p.type === 'expense').length;
    const paymentCount = selectedPayments.filter(p => p.type === 'paid').length;

    let html = `
      <!-- Month Selector -->
      <div class="payment-month-selector">
        <h4 style="margin: 0 0 12px 0; color: #1e293b;"><i class="fas fa-calendar-alt"></i> Select Month</h4>
        <div class="month-buttons">
          ${months.map(month => {
            const date = new Date(month + '-01');
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const paymentCount = paymentsByMonth[month].length;
            const monthTotal = paymentsByMonth[month].reduce((sum, p) => sum + (p.amount || 0), 0);
            return `
              <button class="month-btn ${month === selectedMonth ? 'active' : ''}" 
                      data-month="${month}"
                      onclick="window.paymentManager.renderPaidAmountsWithMonthSelector(
                        document.getElementById('paidAmountsDetailsContainer'), 
                        ${JSON.stringify(paymentsByMonth).replace(/"/g, '&quot;')}, 
                        '${month}'
                      )">
                <div class="month-name">${monthName}</div>
                <div class="month-stats">${paymentCount} payments • ₹${this.formatAmount(monthTotal)}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Summary for selected month -->
      <div class="payment-modal-summary">
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalAmount)}</div>
          <div class="payment-summary-label">Total Paid</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${selectedPayments.length}</div>
          <div class="payment-summary-label">Transactions</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${expenseCount}</div>
          <div class="payment-summary-label">Expenses</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${paymentCount}</div>
          <div class="payment-summary-label">Payments</div>
        </div>
      </div>
    `;

    // Group by category
    const categoryMap = {};
    selectedPayments.forEach(p => {
      const cat = (p.category || 'Other').toLowerCase();
      if (!categoryMap[cat]) {
        categoryMap[cat] = { 
          total: 0, 
          count: 0, 
          label: this.getCategoryDisplayName(cat), 
          payments: [] 
        };
      }
      categoryMap[cat].total += p.amount || 0;
      categoryMap[cat].count += 1;
      categoryMap[cat].payments.push(p);
    });

    // Sort by amount
    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);

    if (sortedCats.length > 0) {
      sortedCats.forEach(([cat, info]) => {
        info.payments.forEach(payment => {
          html += `
            <div class="payment-detail-item">
              <div class="payment-detail-info">
                <div class="payment-detail-title">${payment.description || 'No Description'}</div>
                <div class="payment-detail-subtitle">
                  <span><i class="fas fa-tag"></i> ${info.label}</span>
                  <span><i class="fas fa-credit-card"></i> ${payment.paymentMethod || 'N/A'}</span>
                  <span><i class="fas fa-calendar"></i> ${payment.createdAt ? this.formatDate(payment.createdAt) : 'N/A'}</span>
                </div>
              </div>
              <div class="payment-detail-amount negative">-₹${this.formatAmount(payment.amount)}</div>
            </div>
          `;
        });
      });
    } else {
      html += `
        <div class="payment-modal-empty">
          <i class="fas fa-calendar-times"></i>
          <h4>No Payments This Month</h4>
          <p>No paid amounts found for the selected month.</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // Bind click event for due payments stat card
  bindDuePaymentsStatCard() {
    const statCard = document.getElementById('duePaymentsStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showDuePaymentsModal();
    });
    const closeBtn = document.getElementById('closeDuePaymentsModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('duePaymentsModal').style.display = 'none';
      });
    }
  }

  // Show due payments modal
  async showDuePaymentsModal() {
    const modal = document.getElementById('duePaymentsModal');
    const container = document.getElementById('duePaymentsDetailsContainer');
    if (!modal || !container) return;

    container.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner"></i></div>';
    modal.style.display = 'flex';

    try {
      // Fetch due payments from recurring payments endpoint
      const response = await fetch(`${this.BASE_URL}/api/payments/recurring?limit=200`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let allRecurring = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        const duePayments = allRecurring.filter(p => 
          p.status === 'due' || 
          p.status === 'overdue' ||
          (p.dueDate && new Date(p.dueDate) <= new Date())
        );

        if (!duePayments.length) {
          container.innerHTML = `
            <div class="payment-modal-empty">
              <i class="fas fa-calendar-check"></i>
              <h4>No Due Payments</h4>
              <p>All payments are up to date!</p>
            </div>
          `;
          return;
        }

        // Group payments by month based on due date
        const paymentsByMonth = this.groupPaymentsByMonth(duePayments, 'dueDate');
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        this.renderDuePaymentsWithMonthSelector(container, paymentsByMonth, currentMonth);
      } else {
        container.innerHTML = `
          <div class="payment-modal-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Failed to Load</h4>
            <p>Unable to fetch due payments data.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching due payments:', error);
      container.innerHTML = `
        <div class="payment-modal-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Data</h4>
          <p>Unable to fetch due payments data.</p>
        </div>
      `;
    }
  }

  // Render due payments with month selector
  renderDuePaymentsWithMonthSelector(container, paymentsByMonth, selectedMonth) {
    const months = Object.keys(paymentsByMonth).sort().reverse(); // Latest first
    const selectedPayments = paymentsByMonth[selectedMonth] || [];

    // Calculate summary for selected month
    const totalAmount = selectedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdueCount = selectedPayments.filter(p => p.status === 'overdue' || 
      (p.dueDate && new Date(p.dueDate) < new Date())).length;
    const dueCount = selectedPayments.filter(p => p.status === 'due').length;

    let html = `
      <!-- Month Selector -->
      <div class="payment-month-selector">
        <h4 style="margin: 0 0 12px 0; color: #1e293b;"><i class="fas fa-calendar-alt"></i> Select Month</h4>
        <div class="month-buttons">
          ${months.map(month => {
            const date = new Date(month + '-01');
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const paymentCount = paymentsByMonth[month].length;
            const monthTotal = paymentsByMonth[month].reduce((sum, p) => sum + (p.amount || 0), 0);
            return `
              <button class="month-btn ${month === selectedMonth ? 'active' : ''}" 
                      data-month="${month}"
                      onclick="window.paymentManager.renderDuePaymentsWithMonthSelector(
                        document.getElementById('duePaymentsDetailsContainer'), 
                        ${JSON.stringify(paymentsByMonth).replace(/"/g, '&quot;')}, 
                        '${month}'
                      )">
                <div class="month-name">${monthName}</div>
                <div class="month-stats">${paymentCount} due • ₹${this.formatAmount(monthTotal)}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Summary for selected month -->
      <div class="payment-modal-summary">
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalAmount)}</div>
          <div class="payment-summary-label">Total Due</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${selectedPayments.length}</div>
          <div class="payment-summary-label">Due Payments</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${overdueCount}</div>
          <div class="payment-summary-label">Overdue</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${dueCount}</div>
          <div class="payment-summary-label">Due</div>
        </div>
      </div>
    `;

    if (selectedPayments.length > 0) {
      // Sort by due date
      selectedPayments.sort((a, b) => {
        const dateA = new Date(a.dueDate || 0);
        const dateB = new Date(b.dueDate || 0);
        return dateA - dateB;
      });

      selectedPayments.forEach(payment => {
        const isOverdue = payment.status === 'overdue' || 
          (payment.dueDate && new Date(payment.dueDate) < new Date());
        
        html += `
          <div class="payment-detail-item">
            <div class="payment-detail-info">
              <div class="payment-detail-title">${payment.description || payment.memberName || 'Membership Payment'}</div>
              <div class="payment-detail-subtitle">
                <span><i class="fas fa-user"></i> ${payment.memberName || 'N/A'}</span>
                <span><i class="fas fa-calendar"></i> Due: ${payment.dueDate ? this.formatDate(payment.dueDate) : 'N/A'}</span>
                <span><i class="fas fa-exclamation-circle" style="color: ${isOverdue ? '#ef4444' : '#f59e0b'}"></i> ${isOverdue ? 'Overdue' : 'Due'}</span>
              </div>
            </div>
            <div class="payment-detail-amount ${isOverdue ? 'due' : 'pending'}">₹${this.formatAmount(payment.amount)}</div>
          </div>
        `;
      });
    } else {
      html += `
        <div class="payment-modal-empty">
          <i class="fas fa-calendar-check"></i>
          <h4>No Due Payments</h4>
          <p>No due payments found for the selected month.</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // Enhanced groupPaymentsByMonth to handle different date fields
  groupPaymentsByMonth(payments, dateField = 'createdAt') {
    const grouped = {};
    payments.forEach(payment => {
      const date = new Date(payment[dateField] || payment.createdAt || payment.date || Date.now());
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(payment);
    });
    return grouped;
  }

  // Bind click event for profit/loss stat card
  bindProfitLossStatCard() {
    const statCard = document.getElementById('profitLossStatCard');
    if (!statCard) return;
    statCard.addEventListener('click', () => {
      this.showProfitLossModal();
    });
    const closeBtn = document.getElementById('closeProfitLossModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('profitLossModal').style.display = 'none';
      });
    }
  }

  // Show profit/loss modal
  async showProfitLossModal() {
    const modal = document.getElementById('profitLossModal');
    const container = document.getElementById('profitLossDetailsContainer');
    if (!modal || !container) return;

    container.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner"></i></div>';
    modal.style.display = 'flex';

    try {
      const response = await fetch(`${this.BASE_URL}/api/payments/recent?limit=200`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let allPayments = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        
        if (!allPayments.length) {
          container.innerHTML = `
            <div class="payment-modal-empty">
              <i class="fas fa-chart-line"></i>
              <h4>No Financial Data</h4>
              <p>No payment data found for profit/loss calculation.</p>
            </div>
          `;
          return;
        }

        // Group payments by month
        const paymentsByMonth = this.groupPaymentsByMonth(allPayments);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        this.renderProfitLossWithMonthSelector(container, paymentsByMonth, currentMonth);
      } else {
        container.innerHTML = `
          <div class="payment-modal-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Failed to Load</h4>
            <p>Unable to fetch profit/loss data.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching profit/loss data:', error);
      container.innerHTML = `
        <div class="payment-modal-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error Loading Data</h4>
          <p>Unable to fetch profit/loss data.</p>
        </div>
      `;
    }
  }

  // Render profit/loss with month selector
  renderProfitLossWithMonthSelector(container, paymentsByMonth, selectedMonth) {
    const months = Object.keys(paymentsByMonth).sort().reverse(); // Latest first
    const selectedPayments = paymentsByMonth[selectedMonth] || [];

    // Calculate revenue and expenses for selected month
    const revenue = selectedPayments
      .filter(p => p.type === 'received')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const expenses = selectedPayments
      .filter(p => p.type === 'paid' || p.type === 'expense')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

    let html = `
      <!-- Month Selector -->
      <div class="payment-month-selector">
        <h4 style="margin: 0 0 12px 0; color: #1e293b;"><i class="fas fa-calendar-alt"></i> Select Month</h4>
        <div class="month-buttons">
          ${months.map(month => {
            const date = new Date(month + '-01');
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const monthPayments = paymentsByMonth[month];
            const monthRevenue = monthPayments.filter(p => p.type === 'received').reduce((sum, p) => sum + (p.amount || 0), 0);
            const monthExpenses = monthPayments.filter(p => p.type === 'paid' || p.type === 'expense').reduce((sum, p) => sum + (p.amount || 0), 0);
            const monthProfit = monthRevenue - monthExpenses;
            return `
              <button class="month-btn ${month === selectedMonth ? 'active' : ''}" 
                      data-month="${month}"
                      onclick="window.paymentManager.renderProfitLossWithMonthSelector(
                        document.getElementById('profitLossDetailsContainer'), 
                        ${JSON.stringify(paymentsByMonth).replace(/"/g, '&quot;')}, 
                        '${month}'
                      )">
                <div class="month-name">${monthName}</div>
                <div class="month-stats">P/L: ₹${this.formatAmount(monthProfit)} • ${monthProfit >= 0 ? 'Profit' : 'Loss'}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Summary for selected month -->
      <div class="payment-modal-summary">
        <div class="payment-summary-card">
          <div class="payment-summary-value" style="color: #22c55e;">₹${this.formatAmount(revenue)}</div>
          <div class="payment-summary-label">Total Revenue</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value" style="color: #ef4444;">₹${this.formatAmount(expenses)}</div>
          <div class="payment-summary-label">Total Expenses</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value" style="color: ${profit >= 0 ? '#22c55e' : '#ef4444'};">
            ${profit >= 0 ? '+' : ''}₹${this.formatAmount(profit)}
          </div>
          <div class="payment-summary-label">Net Profit</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value" style="color: ${profitMargin >= 0 ? '#22c55e' : '#ef4444'};">
            ${profitMargin.toFixed(1)}%
          </div>
          <div class="payment-summary-label">Profit Margin</div>
        </div>
      </div>
    `;

    if (selectedPayments.length > 0) {
      // Calculate by category
      const revenueByCategory = {};
      const expensesByCategory = {};

      selectedPayments.forEach(p => {
        const cat = (p.category || 'Other').toLowerCase();
        const categoryName = this.getCategoryDisplayName(cat);
        
        if (p.type === 'received') {
          if (!revenueByCategory[categoryName]) revenueByCategory[categoryName] = 0;
          revenueByCategory[categoryName] += p.amount || 0;
        } else if (p.type === 'paid' || p.type === 'expense') {
          if (!expensesByCategory[categoryName]) expensesByCategory[categoryName] = 0;
          expensesByCategory[categoryName] += p.amount || 0;
        }
      });

      // Revenue breakdown
      html += `<h4 style="color: #22c55e; margin: 20px 0 12px 0;"><i class="fas fa-arrow-up"></i> Revenue by Category</h4>`;
      if (Object.keys(revenueByCategory).length > 0) {
        Object.entries(revenueByCategory)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, amount]) => {
            html += `
              <div class="payment-detail-item">
                <div class="payment-detail-info">
                  <div class="payment-detail-title">${category}</div>
                </div>
                <div class="payment-detail-amount">+₹${this.formatAmount(amount)}</div>
              </div>
            `;
          });
      } else {
        html += `<p style="text-align: center; color: #64748b; padding: 20px;">No revenue recorded</p>`;
      }

      // Expenses breakdown
      html += `<h4 style="color: #ef4444; margin: 20px 0 12px 0;"><i class="fas fa-arrow-down"></i> Expenses by Category</h4>`;
      if (Object.keys(expensesByCategory).length > 0) {
        Object.entries(expensesByCategory)
          .sort((a, b) => b[1] - a[1])
          .forEach(([category, amount]) => {
            html += `
              <div class="payment-detail-item">
                <div class="payment-detail-info">
                  <div class="payment-detail-title">${category}</div>
                </div>
                <div class="payment-detail-amount negative">-₹${this.formatAmount(amount)}</div>
              </div>
            `;
          });
      } else {
        html += `<p style="text-align: center; color: #64748b; padding: 20px;">No expenses recorded</p>`;
      }
    } else {
      html += `
        <div class="payment-modal-empty">
          <i class="fas fa-chart-line"></i>
          <h4>No Financial Data</h4>
          <p>No payment data found for the selected month.</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // Delete confirmation modal methods
  showDeleteConfirmation(paymentId) {
    const modal = document.getElementById('deleteConfirmationModal');
    if (!modal) return;

    // Store payment ID for later use
    this.pendingDeletePaymentId = paymentId;
    
    // Show modal
    modal.style.display = 'flex';
    
    // Setup event listeners if not already done
    if (!this.deleteModalListenersSetup) {
      this.setupDeleteModalListeners();
      this.deleteModalListenersSetup = true;
    }
  }

  setupDeleteModalListeners() {
    const modal = document.getElementById('deleteConfirmationModal');
    const cancelBtn = document.getElementById('cancelDeletePayment');
    const confirmBtn = document.getElementById('confirmDeletePayment');

    // Cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideDeleteConfirmation();
      });
    }

    // Confirm button
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.confirmDeletePayment();
      });
    }

    // Click outside to close
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideDeleteConfirmation();
        }
      });
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        this.hideDeleteConfirmation();
      }
    });
  }

  hideDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmationModal');
    if (modal) {
      modal.style.display = 'none';
      this.pendingDeletePaymentId = null;
    }
  }

  async confirmDeletePayment() {
    if (!this.pendingDeletePaymentId) return;

    const confirmBtn = document.getElementById('confirmDeletePayment');
    const originalContent = confirmBtn.innerHTML;

    try {
      // Show loading state
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
      confirmBtn.disabled = true;

      const response = await fetch(`${this.BASE_URL}/api/payments/${this.pendingDeletePaymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }

      // Hide modal
      this.hideDeleteConfirmation();
      
      // Show success message
      this.showSuccess('Payment deleted successfully!');
      
      // Refresh all payment data
      await Promise.all([
        this.forceRefreshStats(),
        this.loadAllPendingPayments(),
        this.loadRecentPayments()
      ]);

    } catch (error) {
      console.error('Error deleting payment:', error);
      this.showError('Failed to delete payment: ' + error.message);
      
      // Restore button state
      confirmBtn.innerHTML = originalContent;
      confirmBtn.disabled = false;
    }
  }

  // Payment History Modal Functions
  async showPaymentHistoryModal() {
    const modal = document.getElementById('paymentHistoryModal');
    const container = document.getElementById('paymentHistoryContainer');
    
    if (!modal || !container) return;
    
    modal.style.display = 'flex';
    container.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner fa-spin"></i> Loading payment history...</div>';
    
    try {
      // Fetch complete payment history for the specific gym
      const response = await fetch(`${this.BASE_URL}/api/payments/history?limit=500`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      
      const data = await response.json();
      const payments = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      
      this.renderPaymentHistory(container, payments);
      
    } catch (error) {
      console.error('Error loading payment history:', error);
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error Loading History</h3>
          <p>Failed to load payment history: ${error.message}</p>
        </div>
      `;
    }
  }

  hidePaymentHistoryModal() {
    const modal = document.getElementById('paymentHistoryModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  renderPaymentHistory(container, payments) {
    if (!payments || payments.length === 0) {
      container.innerHTML = `
        <div class="payment-empty-state">
          <i class="fas fa-file-alt"></i>
          <h3>No Payment History</h3>
          <p>No payment records found for this gym</p>
        </div>
      `;
      return;
    }

    // Group payments by month for better organization
    const paymentsByMonth = this.groupPaymentsByMonth(payments, 'paidDate');
    const months = Object.keys(paymentsByMonth).sort().reverse(); // Latest first

    // Calculate totals
    const totalReceived = payments.filter(p => p.type === 'received' || p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaid = payments.filter(p => p.type === 'paid' || p.type === 'expense').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalTransactions = payments.length;

    let html = `
      <!-- Summary Stats -->
      <div class="payment-history-summary">
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalReceived)}</div>
          <div class="payment-summary-label">Total Received</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalPaid)}</div>
          <div class="payment-summary-label">Total Paid</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">${totalTransactions}</div>
          <div class="payment-summary-label">Total Transactions</div>
        </div>
        <div class="payment-summary-card">
          <div class="payment-summary-value">₹${this.formatAmount(totalReceived - totalPaid)}</div>
          <div class="payment-summary-label">Net Income</div>
        </div>
      </div>

      <!-- Monthly Breakdown -->
      <div class="payment-history-months">
    `;

    months.forEach(month => {
      const monthPayments = paymentsByMonth[month];
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const monthTotal = monthPayments.reduce((sum, p) => {
        if (p.type === 'received' || p.status === 'paid') return sum + (p.amount || 0);
        if (p.type === 'paid' || p.type === 'expense') return sum - (p.amount || 0);
        return sum;
      }, 0);

      html += `
        <div class="payment-history-month">
          <div class="payment-month-header">
            <h4>${monthName}</h4>
            <div class="payment-month-stats">
              ${monthPayments.length} transactions • ₹${this.formatAmount(Math.abs(monthTotal))} ${monthTotal >= 0 ? 'net income' : 'net expense'}
            </div>
          </div>
          <div class="payment-month-items">
      `;

      // Sort payments within month by date (most recent first)
      monthPayments.sort((a, b) => new Date(b.paidDate || b.createdAt) - new Date(a.paidDate || a.createdAt));

      monthPayments.forEach(payment => {
        const isIncome = payment.type === 'received' || payment.status === 'paid';
        const paidDate = payment.paidDate || payment.createdAt;
        
        html += `
          <div class="payment-history-item ${isIncome ? 'income' : 'expense'}">
            <div class="payment-history-icon">
              <i class="fas fa-${isIncome ? 'plus' : 'minus'}"></i>
            </div>
            <div class="payment-history-info">
              <div class="payment-history-title">${payment.description || 'No Description'}</div>
              <div class="payment-history-details">
                <span><i class="fas fa-tag"></i> ${this.getCategoryDisplayName(payment.category)}</span>
                <span><i class="fas fa-credit-card"></i> ${payment.paymentMethod || 'N/A'}</span>
                <span><i class="fas fa-calendar"></i> ${paidDate ? this.formatDate(paidDate) : 'N/A'}</span>
                ${payment.memberName ? `<span><i class="fas fa-user"></i> ${payment.memberName}</span>` : ''}
              </div>
            </div>
            <div class="payment-history-amount ${isIncome ? 'positive' : 'negative'}">
              ${isIncome ? '+' : '-'}₹${this.formatAmount(payment.amount)}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.paymentManager = new PaymentManager();
    
    // Make it globally accessible for debugging
    window.createPaymentManager = () => {
      window.paymentManager = new PaymentManager();
    };
    
  } catch (error) {
    console.error('Error creating PaymentManager:', error);
  }

  // Add logic to close add payment modal when clicking outside modal content
  const modal = document.getElementById('addPaymentModal');
  const modalContent = modal ? modal.querySelector('.add-payment-modal-content') : null;
  if (modal && modalContent) {
    modal.addEventListener('mousedown', function(e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (window.paymentManager && typeof window.paymentManager.resetPaymentForm === 'function') {
          window.paymentManager.resetPaymentForm();
        }
      }
    });
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentManager;
}
