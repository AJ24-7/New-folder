// 7-Day Allowance Management System
class SevenDayAllowanceManager {
  constructor() {
    this.currentMemberData = null;
    this.plansCache = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.fetchPlans();
  }

  async fetchPlans() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        console.error('[7DayAllowance] No token available');
        return;
      }

      const response = await fetch(`${this.BASE_URL}/api/gyms/membership-plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        this.plansCache = data;
      } else if (data.plans && Array.isArray(data.plans)) {
        this.plansCache = data.plans;
      } else {
        this.plansCache = [];
      }
    } catch (error) {
      console.error('[7DayAllowance] Error fetching plans:', error);
      this.plansCache = [];
    }
  }

  setupEventListeners() {
    // Listen for 7-day allowance button clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('seven-day-allowance-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const memberId = e.target.dataset.memberId;
        this.openAllowanceModal(memberId);
      }
    });

    // Modal close listeners
    const modal = document.getElementById('sevenDayAllowanceModal');
    const closeBtn = document.getElementById('closeSevenDayAllowanceModal');
    const cancelBtn = document.getElementById('cancelSevenDayAllowance');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }
    
    if (modal) {
      modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }

    // Form submission
    const form = document.getElementById('sevenDayAllowanceForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAllowanceSubmit();
      });
    }

    // Plan and duration change listeners
    document.addEventListener('change', (e) => {
      if (e.target.id === 'allowancePlanSelected' || e.target.id === 'allowanceMonthlyPlan') {
        this.updatePaymentAmount();
      }
    });

    // Mark as paid button listeners
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('mark-paid-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const memberId = e.target.dataset.memberId;
        const source = e.target.dataset.source || 'unknown';
        this.showMarkAsPaidModal(memberId, source);
      }
    });

    // Mark as paid form submission
    const markPaidForm = document.getElementById('markAsPaidForm');
    if (markPaidForm) {
      markPaidForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleMarkAsPaid();
      });
    }

    // Add interactive behavior to amount input field
    document.addEventListener('input', (e) => {
      if (e.target.id === 'paidAmountReceived') {
        const input = e.target;
        const pendingAmountText = document.getElementById('paidPendingAmount').textContent;
        const pendingAmount = parseFloat(pendingAmountText) || 0;
        
        // Validate and style the input
        const validationType = this.validateAmountInput(input, pendingAmount);
        
        // Show helpful hint
        setTimeout(() => {
          this.showAmountHint(validationType, pendingAmount);
        }, 300);
      }
    });

    // Reset input styling and remove hints on focus
    document.addEventListener('focus', (e) => {
      if (e.target.id === 'paidAmountReceived') {
        // Remove any existing hints
        const existingHint = document.getElementById('amountHint');
        if (existingHint) {
          existingHint.remove();
        }
      }
    }, true);

    // Mark as paid modal close
    const markPaidModal = document.getElementById('markAsPaidModal');
    const closeMarkPaidBtn = document.getElementById('closeMarkAsPaidModal');
    const cancelMarkPaidBtn = document.getElementById('cancelMarkAsPaid');
    
    if (closeMarkPaidBtn) {
      closeMarkPaidBtn.addEventListener('click', () => this.closeMarkAsPaidModal());
    }
    
    if (cancelMarkPaidBtn) {
      cancelMarkPaidBtn.addEventListener('click', () => this.closeMarkAsPaidModal());
    }
    
    if (markPaidModal) {
      markPaidModal.addEventListener('mousedown', (e) => {
        if (e.target === markPaidModal) this.closeMarkAsPaidModal();
      });
    }
  }

  async openAllowanceModal(memberId) {
    try {
      // Fetch member data
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        this.showNotification('Authentication token not found', 'error');
        return;
      }

      const response = await fetch(`${this.BASE_URL}/api/members/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch member data: ${response.status}`);
      }

      const memberData = await response.json();
      this.currentMemberData = memberData;

      // Show modal
      const modal = document.getElementById('sevenDayAllowanceModal');
      if (modal) {
        modal.style.display = 'flex';
        this.populateModal(memberData);
      }

    } catch (error) {
      console.error('[7DayAllowance] Error opening modal:', error);
      this.showNotification('Failed to load member data', 'error');
    }
  }

  populateModal(memberData) {
    // Reset form
    const form = document.getElementById('sevenDayAllowanceForm');
    if (form) form.reset();

    // Populate member info
    document.getElementById('allowanceMemberName').textContent = memberData.memberName || '';
    document.getElementById('allowanceMembershipId').textContent = memberData.membershipId || '';
    document.getElementById('allowanceCurrentPlan').textContent = `${memberData.planSelected || ''} - ${memberData.monthlyPlan || ''}`;
    
    const expiryDate = memberData.membershipValidUntil ? new Date(memberData.membershipValidUntil).toLocaleDateString() : 'N/A';
    const today = new Date();
    const expiry = new Date(memberData.membershipValidUntil);
    const isExpired = expiry < today;
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    let expiryText = expiryDate;
    if (isExpired) {
      expiryText += ` <span style="color:#e53935;font-weight:600;">(Expired)</span>`;
    } else if (daysLeft <= 3) {
      expiryText += ` <span style="color:#ff9800;font-weight:600;">(${daysLeft} day${daysLeft === 1 ? '' : 's'} left)</span>`;
    }
    
    document.getElementById('allowanceExpiryDate').innerHTML = expiryText;

    // Set hidden member ID
    document.getElementById('allowanceMemberId').value = memberData._id || '';

    // Populate plan dropdown
    const planSelect = document.getElementById('allowancePlanSelected');
    if (planSelect && this.plansCache.length > 0) {
      planSelect.innerHTML = '<option value="">Select Plan</option>' + 
        this.plansCache.map(plan => 
          `<option value="${plan.name}" ${plan.name === memberData.planSelected ? 'selected' : ''}>${plan.name} - ₹${plan.price}/month</option>`
        ).join('');
    }

    // Pre-fill current values
    document.getElementById('allowancePlanSelected').value = memberData.planSelected || '';
    document.getElementById('allowanceMonthlyPlan').value = memberData.monthlyPlan || '';
    document.getElementById('allowanceActivityPreference').value = memberData.activityPreference || '';

    // Update payment amount
    this.updatePaymentAmount();
  }

  updatePaymentAmount() {
    const planSelect = document.getElementById('allowancePlanSelected');
    const durationSelect = document.getElementById('allowanceMonthlyPlan');
    const amountInput = document.getElementById('allowancePaymentAmount');
    const discountInfo = document.getElementById('allowanceDiscountInfo');
    const discountText = document.getElementById('allowanceDiscountText');

    if (!planSelect || !durationSelect || !amountInput) return;

    const selectedPlan = planSelect.value;
    const selectedDuration = durationSelect.value;

    if (!selectedPlan || !selectedDuration) {
      amountInput.value = '';
      if (discountInfo) discountInfo.style.display = 'none';
      return;
    }

    // Extract months from duration
    const monthsMatch = selectedDuration.match(/(\d+)\s*Months?/i);
    const months = monthsMatch ? parseInt(monthsMatch[1]) : 1;

    // Find plan in cache
    const plan = this.plansCache.find(p => p.name === selectedPlan);
    
    if (!plan) {
      console.warn('[7DayAllowance] Plan not found in cache:', selectedPlan);
      amountInput.value = '';
      if (discountInfo) discountInfo.style.display = 'none';
      return;
    }

    // Calculate amount
    const baseAmount = plan.price * months;
    let finalAmount = baseAmount;
    let discountAmount = 0;
    let discountPercentage = 0;
    
    // Check if discount applies
    let discountApplies = false;
    if (plan.discount > 0 && plan.discountMonths) {
      if (Array.isArray(plan.discountMonths)) {
        discountApplies = plan.discountMonths.includes(months);
      } else {
        discountApplies = months >= plan.discountMonths;
      }
    }
    
    if (discountApplies) {
      discountPercentage = plan.discount;
      discountAmount = Math.round(baseAmount * (plan.discount / 100));
      finalAmount = baseAmount - discountAmount;
    }

    // Update UI
    amountInput.value = finalAmount;
    
    // Update discount information
    if (discountInfo && discountText) {
      if (discountApplies && discountAmount > 0) {
        discountText.innerHTML = `${discountPercentage}% discount applied - You save ₹${discountAmount}`;
        discountInfo.style.display = 'block';
        discountInfo.style.backgroundColor = '#d4edda';
        discountInfo.style.color = '#155724';
        discountInfo.style.border = '1px solid #c3e6cb';
      } else {
        discountText.innerHTML = 'No discount applied';
        discountInfo.style.display = 'block';
        discountInfo.style.backgroundColor = '#f8f9fa';
        discountInfo.style.color = '#6c757d';
        discountInfo.style.border = '1px solid #dee2e6';
      }
    }
  }

  async handleAllowanceSubmit() {
    try {
      const form = document.getElementById('sevenDayAllowanceForm');
      const formData = new FormData(form);
      
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        this.showNotification('Authentication token not found', 'error');
        return;
      }

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Processing...';
      submitBtn.disabled = true;

      const response = await fetch(`${this.BASE_URL}/api/members/seven-day-allowance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        this.showNotification('7-day allowance granted successfully!', 'success');
        this.closeModal();
        
        // Refresh the members table and stats
        if (typeof fetchAndDisplayMembers === 'function') {
          fetchAndDisplayMembers();
        }
        if (typeof updateMembersStatsCard === 'function') {
          updateMembersStatsCard();
        }
        if (typeof updatePaymentsStatsCard === 'function') {
          updatePaymentsStatsCard();
        }
        
        // Refresh payment tab if available - seven day allowance should update pending amounts
        if (window.paymentManager && typeof window.paymentManager.refreshPaymentData === 'function') {
          window.paymentManager.refreshPaymentData();
        }
        
        // Update member pending payment in the dedicated section
        this.updateMemberPendingPaymentStatus(formData.get('memberId'), 'allowance_granted');
        
      } else {
        throw new Error(result.message || 'Failed to grant allowance');
      }

    } catch (error) {
      console.error('[7DayAllowance] Error submitting allowance:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      // Reset button state
      const submitBtn = document.querySelector('#sevenDayAllowanceForm button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
  }

  closeModal() {
    const modal = document.getElementById('sevenDayAllowanceModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentMemberData = null;
  }

  async showMarkAsPaidModal(memberId, source = 'unknown', prefilledAmount = null) {
    try {
      // Fetch member data
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        this.showNotification('Authentication token not found', 'error');
        return;
      }

      const response = await fetch(`${this.BASE_URL}/api/members/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch member data: ${response.status}`);
      }

      const memberData = await response.json();

      // Show modal
      const modal = document.getElementById('markAsPaidModal');
      if (modal) {
        modal.style.display = 'flex';
        
        // Populate member info
        document.getElementById('paidMemberName').textContent = memberData.memberName || '';
        document.getElementById('paidMembershipId').textContent = memberData.membershipId || '';
        
        // Determine the amount to show - priority: prefilledAmount > pendingPaymentAmount > calculated amount
        let amountToShow = '0';
        
        if (prefilledAmount !== null && prefilledAmount !== undefined) {
          amountToShow = prefilledAmount.toString();
        } else if (memberData.pendingPaymentAmount && memberData.pendingPaymentAmount > 0) {
          amountToShow = memberData.pendingPaymentAmount.toString();
        } else {
          // Calculate expected payment based on current plan
          const plan = this.plansCache.find(p => p.name === memberData.planSelected);
          if (plan && memberData.monthlyPlan) {
            const monthsMatch = memberData.monthlyPlan.match(/(\d+)\s*Months?/i);
            const months = monthsMatch ? parseInt(monthsMatch[1]) : 1;
            let calculatedAmount = plan.price * months;
            
            // Apply discount if applicable
            if (plan.discount > 0 && plan.discountMonths) {
              let discountApplies = false;
              if (Array.isArray(plan.discountMonths)) {
                discountApplies = plan.discountMonths.includes(months);
              } else {
                discountApplies = months >= plan.discountMonths;
              }
              
              if (discountApplies) {
                const discountAmount = Math.round(calculatedAmount * (plan.discount / 100));
                calculatedAmount = calculatedAmount - discountAmount;
              }
            }
            
            amountToShow = calculatedAmount.toString();
          }
        }
        
        document.getElementById('paidPendingAmount').textContent = amountToShow;
        
        // Auto-fill the amount input field with animation
        const amountInput = document.getElementById('paidAmountReceived');
        if (amountInput) {
          // Clear the field first
          amountInput.value = '';
          // Add a subtle animation by filling it after a short delay
          setTimeout(() => {
            amountInput.value = amountToShow;
            amountInput.classList.add('autofill-animation');
            
            // Remove animation class after it completes
            setTimeout(() => {
              amountInput.classList.remove('autofill-animation');
            }, 600);
          }, 100);
          
          // Focus the amount input for better UX
          setTimeout(() => {
            amountInput.focus();
            amountInput.select();
          }, 200);
        }
        
        document.getElementById('paidMemberId').value = memberId;
        document.getElementById('paidSource').value = source;

        // Set current date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('paidDate').value = today;
      }

    } catch (error) {
      console.error('[7DayAllowance] Error opening mark as paid modal:', error);
      this.showNotification('Failed to load member data', 'error');
    }
  }

  async handleMarkAsPaid() {
    try {
      const form = document.getElementById('markAsPaidForm');
      const formData = new FormData(form);
      
      const token = localStorage.getItem('gymAdminToken');
      if (!token) {
        this.showNotification('Authentication token not found', 'error');
        return;
      }

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Processing...';
      submitBtn.disabled = true;

      // Get member ID from form
      const memberId = formData.get('memberId');
      if (!memberId) {
        throw new Error('Member ID not found');
      }

      // Get member details first to calculate amounts and dates
      const memberResponse = await fetch(`${this.BASE_URL}/api/members/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!memberResponse.ok) {
        throw new Error('Failed to fetch member details');
      }

      const member = await memberResponse.json();
      
      // Calculate new membership dates (same logic as payment.js)
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

      // Calculate pending amount (same logic as payment.js)
      const calculateMemberPendingAmount = (member) => {
        if (member.paymentAmount && member.paymentAmount > 0) {
          return member.paymentAmount;
        }
        if (member.pendingPaymentAmount && member.pendingPaymentAmount > 0) {
          return member.pendingPaymentAmount;
        }
        if (member.renewalAmount && member.renewalAmount > 0) {
          return member.renewalAmount;
        }
        
        // Fallback calculation based on plan and duration
        const plan = (member.planSelected || '').toLowerCase();
        const duration = (member.monthlyPlan || '').toLowerCase();
        
        let baseAmount = 1200; // Default amount
        
        if (plan.includes('premium') || plan.includes('vip')) {
          if (duration.includes('12') || duration.includes('year')) {
            baseAmount = 18000;
          } else if (duration.includes('6')) {
            baseAmount = 9000;
          } else if (duration.includes('3')) {
            baseAmount = 4500;
          } else {
            baseAmount = 1500;
          }
        } else if (plan.includes('basic') || plan.includes('standard')) {
          if (duration.includes('12') || duration.includes('year')) {
            baseAmount = 12000;
          } else if (duration.includes('6')) {
            baseAmount = 6000;
          } else if (duration.includes('3')) {
            baseAmount = 3000;
          } else {
            baseAmount = 1000;
          }
        } else if (plan.includes('student') || plan.includes('discount')) {
          if (duration.includes('12') || duration.includes('year')) {
            baseAmount = 9600;
          } else if (duration.includes('6')) {
            baseAmount = 4800;
          } else if (duration.includes('3')) {
            baseAmount = 2400;
          } else {
            baseAmount = 800;
          }
        } else {
          if (duration.includes('12') || duration.includes('year')) {
            baseAmount = 14400;
          } else if (duration.includes('6')) {
            baseAmount = 7200;
          } else if (duration.includes('3')) {
            baseAmount = 3600;
          } else {
            baseAmount = 1200;
          }
        }
        
        return baseAmount;
      };

      // Update member payment status and renewal dates using the correct endpoint
      const updateResponse = await fetch(`${this.BASE_URL}/api/members/${memberId}/renew-membership`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          membershipValidUntil: endDate.toISOString(),
          membershipStartDate: startDate.toISOString(),
          pendingPaymentAmount: 0,
          paymentAmount: calculateMemberPendingAmount(member),
          lastPaymentDate: new Date().toISOString()
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
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            memberId: memberId,
            memberEmail: member.email,
            memberName: member.memberName,
            planSelected: member.planSelected,
            monthlyPlan: member.monthlyPlan,
            amount: calculateMemberPendingAmount(member),
            validUntil: endDate.toISOString(),
            startDate: startDate.toISOString()
          })
        });
      } catch (emailError) {
        console.warn('Email notification failed:', emailError);
        // Don't fail the whole operation if email fails
      }

      // Record the payment in the payment system with today's date and full amount
      const paymentAmount = calculateMemberPendingAmount(member);
      const paymentData = {
        type: 'received',
        category: 'membership',
        amount: paymentAmount,
        description: `Membership payment - ${member.planSelected || 'Plan'} (${member.monthlyPlan || 'Duration'})`,
        memberName: member.memberName || 'Unknown Member',
        memberId: memberId,
        paymentMethod: 'cash', // Default payment method
        isRecurring: false,
        paymentDate: new Date().toISOString().split('T')[0], // Today's date
        notes: `Payment marked as paid for ${member.memberName} - Membership renewed until ${endDate.toLocaleDateString()}`
      };

      try {
        const paymentResponse = await fetch(`${this.BASE_URL}/api/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(paymentData)
        });

        if (paymentResponse.ok) {
          console.log('Payment recorded successfully in payment system');
        } else {
          console.warn('Failed to record payment in payment system, but member payment was marked as paid');
        }
      } catch (paymentError) {
        console.warn('Error recording payment in payment system:', paymentError);
        // Don't fail the entire operation if payment recording fails
      }

      this.showNotification(`Membership renewed successfully! New expiry: ${endDate.toLocaleDateString()}`, 'success');
      this.closeMarkAsPaidModal();
      
      // Refresh the UI components
      if (typeof fetchAndDisplayMembers === 'function') {
        fetchAndDisplayMembers();
      }
      if (typeof updateMembersStatsCard === 'function') {
        updateMembersStatsCard();
      }
      if (typeof updatePaymentsStatsCard === 'function') {
        updatePaymentsStatsCard();
      }
      
      // Refresh notifications if available
      if (window.notificationSystem && typeof window.notificationSystem.loadNotifications === 'function') {
        window.notificationSystem.loadNotifications();
      }
      
      // Refresh payment tab if available
      if (window.paymentManager && typeof window.paymentManager.refreshPaymentData === 'function') {
        window.paymentManager.refreshPaymentData();
        
        // Also remove the specific member pending payment that was just paid
        if (window.paymentManager.removeMemberPendingPayment && memberId) {
          window.paymentManager.removeMemberPendingPayment(memberId);
        }
        
        // Force refresh payment statistics to ensure they're updated
        if (window.paymentManager.forceRefreshStats) {
          setTimeout(() => {
            window.paymentManager.forceRefreshStats();
          }, 1000); // Small delay to allow backend to process
        }
      } else if (window.paymentManager && typeof window.paymentManager.loadPaymentData === 'function') {
        window.paymentManager.loadPaymentData();
      }
      
      // Update member pending payment status
      this.updateMemberPendingPaymentStatus(memberId, 'payment_completed');

      // Trigger payment received notification
      try {
        if (window.notificationSystem && member) {
          window.notificationSystem.notifyPaymentReceived({
            amount: paymentAmount,
            memberName: member.memberName,
            plan: `${member.planSelected || 'Plan'} (${member.monthlyPlan || 'Duration'})`
          });
        }
      } catch (notificationError) {
        console.warn('Error showing payment notification:', notificationError);
      }

    } catch (error) {
      console.error('[7DayAllowance] Error marking payment as paid:', error);
      this.showNotification(`Error: ${error.message}`, 'error');
    } finally {
      // Reset button state
      const submitBtn = document.querySelector('#markAsPaidForm button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Mark as Paid';
        submitBtn.disabled = false;
      }
    }
  }

  closeMarkAsPaidModal() {
    const modal = document.getElementById('markAsPaidModal');
    if (modal) {
      modal.style.display = 'none';
    }
    
    // Reset any input styling
    const amountInput = document.getElementById('paidAmountReceived');
    if (amountInput) {
      amountInput.style.borderColor = '';
      amountInput.style.background = '';
    }
  }

  // Helper function to validate and style amount input
  validateAmountInput(input, pendingAmount) {
    const value = parseFloat(input.value) || 0;
    const pending = parseFloat(pendingAmount) || 0;
    
    // Remove existing validation classes
    input.classList.remove('amount-valid', 'amount-overpay', 'amount-underpay', 'amount-invalid');
    
    if (value === pending && value > 0) {
      input.classList.add('amount-valid');
      return 'exact';
    } else if (value > pending && value > 0) {
      input.classList.add('amount-overpay');
      return 'overpay';
    } else if (value < pending && value > 0) {
      input.classList.add('amount-underpay');
      return 'underpay';
    } else {
      input.classList.add('amount-invalid');
      return 'invalid';
    }
  }

  // Helper function to show amount hint
  showAmountHint(type, amount) {
    const existingHint = document.getElementById('amountHint');
    if (existingHint) {
      existingHint.remove();
    }
    
    const amountInput = document.getElementById('paidAmountReceived');
    if (!amountInput) return;
    
    const hint = document.createElement('div');
    hint.id = 'amountHint';
    hint.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 6px 6px;
      padding: 8px 12px;
      font-size: 0.85rem;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    let message = '';
    let color = '';
    
    switch (type) {
      case 'exact':
        message = '✓ Exact pending amount';
        color = '#22c55e';
        break;
      case 'overpay':
        message = `↑ ₹${(parseFloat(amountInput.value) - amount).toFixed(2)} overpayment`;
        color = '#3b82f6';
        break;
      case 'underpay':
        message = `↓ ₹${(amount - parseFloat(amountInput.value)).toFixed(2)} remaining`;
        color = '#f59e0b';
        break;
      case 'invalid':
        message = '⚠ Please enter a valid amount';
        color = '#ef4444';
        break;
    }
    
    hint.textContent = message;
    hint.style.color = color;
    hint.style.borderColor = color;
    
    const container = amountInput.parentElement;
    container.style.position = 'relative';
    container.appendChild(hint);
    
    // Auto-remove hint after 3 seconds
    setTimeout(() => {
      if (hint.parentElement) {
        hint.parentElement.removeChild(hint);
      }
    }, 3000);
  }

  showNotification(message, type = 'info') {
    // Try to use the existing notification system
    if (window.notificationSystem && typeof window.notificationSystem.showNotification === 'function') {
      window.notificationSystem.showNotification(message, type);
      return;
    }

    // Fallback notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      transform: translateX(400px);
      transition: transform 0.3s ease;
    `;
    
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#007bff'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  updateMemberPendingPaymentStatus(memberId, action) {
    // Update member pending payment status in the payment tab
    if (window.paymentManager) {
      if (action === 'payment_completed') {
        // Remove the member from pending payments list
        if (typeof window.paymentManager.removeMemberPendingPayment === 'function') {
          window.paymentManager.removeMemberPendingPayment(memberId);
        }
      } else if (action === 'allowance_granted') {
        // Update the display to show allowance granted status
        const memberContainer = document.getElementById('memberPendingPaymentsList');
        if (memberContainer) {
          const memberItem = memberContainer.querySelector(`[data-member-id="${memberId}"]`);
          if (memberItem) {
            const statusBadge = memberItem.querySelector('.member-payment-badge');
            if (statusBadge) {
              statusBadge.className = 'member-payment-badge allowance';
              statusBadge.innerHTML = '<i class="fas fa-calendar-check"></i> 7-Day Allowance Granted';
              statusBadge.style.background = '#d1ecf1';
              statusBadge.style.color = '#0c5460';
            }
            
            // Disable action buttons
            const actionButtons = memberItem.querySelectorAll('.payment-action-btn');
            actionButtons.forEach(btn => {
              btn.disabled = true;
              btn.style.opacity = '0.5';
              btn.style.cursor = 'not-allowed';
            });
          }
        }
      }
    }
  }
}

// Initialize the 7-day allowance manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.sevenDayAllowanceManager = new SevenDayAllowanceManager();
});
