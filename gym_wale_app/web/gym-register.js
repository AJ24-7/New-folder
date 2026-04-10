// Gym Wale Registration Page JavaScript
// API Configuration
const API_BASE_URL = window.GYM_WALE_API_BASE_URL || 'https://api.gym-wale.com/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

// Global State
let currentStep = 1;
let registrationType = '';
let gymId = '';
let qrToken = '';
let gymData = {};
let membershipPlans = [];
let selectedPlan = null;
let memberData = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    gymId = urlParams.get('gymId') || urlParams.get('gym') || '';
    qrToken = urlParams.get('token') || urlParams.get('qrToken') || '';

    if (!gymId && !qrToken) {
        showError('Invalid registration link. Please scan the QR code again.');
        return;
    }

    setupPaymentMethodListener();

    if (qrToken) {
        loadQRCodeContext();
    } else {
        loadGymInfo();
    }
});

// Load QR token context and derive gym details
async function loadQRCodeContext() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/qr-codes/validate/${encodeURIComponent(qrToken)}`);
        if (!response.ok) {
            throw new Error('QR code is invalid or has expired');
        }

        const data = await response.json();
        if (!data.valid || !data.gym || !data.gym.id) {
            throw new Error(data.message || 'Invalid QR code');
        }

        gymId = data.gym.id;
        gymData = {
            id: data.gym.id,
            name: data.gym.name || 'Gym Registration',
            logoUrl: resolveAssetUrl(data.gym.logo)
        };

        applyGymBranding();
        showLoading(false);
    } catch (error) {
        console.error('Error validating QR code:', error);
        showLoading(false);

        // Fallback to gym-based flow if gymId is present in query params.
        if (gymId) {
            loadGymInfo();
            return;
        }

        showError(error.message || 'Invalid QR code. Please scan again.');
    }
}

// Load Gym Information
async function loadGymInfo() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/gyms/info/${gymId}`);
        if (!response.ok) throw new Error('Failed to load gym information');

        gymData = await response.json();

        if (gymData.logoUrl) {
            gymData.logoUrl = resolveAssetUrl(gymData.logoUrl);
        }

        applyGymBranding();
        showLoading(false);
    } catch (error) {
        console.error('Error loading gym info:', error);
        showLoading(false);

        document.getElementById('gymName').textContent = 'Gym Registration';
    }
}

function applyGymBranding() {
    document.getElementById('gymName').textContent = gymData.name || 'Gym Registration';

    const gymLogo = document.getElementById('gymLogo');
    if (gymData.logoUrl) {
        gymLogo.src = gymData.logoUrl;
        gymLogo.classList.remove('hidden');
    } else {
        gymLogo.classList.add('hidden');
    }
}

function resolveAssetUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Registration Type Selection
function selectType(type) {
    registrationType = type;
    
    // Hide type selection
    document.getElementById('typeSelection').classList.remove('active');
    
    // Show appropriate form
    if (type === 'previous') {
        document.getElementById('previousMemberForm').classList.add('active');
        updateStepIndicator(2);
    } else {
        document.getElementById('newMemberForm').classList.add('active');
        updateStepIndicator(2);
        loadMembershipPlans();
    }
}

// Go Back to Type Selection
function goBack() {
    // Hide all forms
    document.getElementById('previousMemberForm').classList.remove('active');
    document.getElementById('newMemberForm').classList.remove('active');
    
    // Show type selection
    document.getElementById('typeSelection').classList.add('active');
    
    // Reset step indicator
    updateStepIndicator(1);
    currentStep = 1;
    
    // Reset selected plan
    selectedPlan = null;
}

// Update Step Indicator
function updateStepIndicator(step) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });
}

// Load Membership Plans
async function loadMembershipPlans() {
    try {
        const response = await fetch(`${API_BASE_URL}/gyms/${gymId}/membership-plans`);
        if (!response.ok) throw new Error('Failed to load membership plans');

        const data = await response.json();
        membershipPlans = data.monthlyOptions || [];

        displayMembershipPlans();
    } catch (error) {
        console.error('Error loading membership plans:', error);
        document.getElementById('membershipPlans').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load membership plans. Please contact the gym.</p>
            </div>
        `;
    }
}

// Display Membership Plans
function displayMembershipPlans() {
    const container = document.getElementById('membershipPlans');
    
    if (!membershipPlans || membershipPlans.length === 0) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-info-circle"></i>
                <p>No membership plans available. Please contact the gym.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = membershipPlans.map((plan, index) => {
        const discount = plan.discount || 0;
        const originalPrice = discount > 0 ? Math.round(plan.price / (1 - discount / 100)) : null;
        
        return `
            <div class="plan-card ${plan.isPopular ? 'popular' : ''}" onclick="selectPlan(${index})">
                <div class="plan-duration">${plan.months} Month${plan.months > 1 ? 's' : ''}</div>
                <div class="plan-price">
                    ₹${plan.price.toLocaleString('en-IN')}
                    ${originalPrice ? `<span class="plan-original-price">₹${originalPrice.toLocaleString('en-IN')}</span>` : ''}
                </div>
                ${discount > 0 ? `<div class="plan-discount">Save ${discount}%</div>` : ''}
            </div>
        `;
    }).join('');
}

// Select Membership Plan
function selectPlan(index) {
    selectedPlan = membershipPlans[index];
    
    // Update UI - highlight selected plan
    document.querySelectorAll('.plan-card').forEach((card, i) => {
        if (i === index) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Form Navigation
function nextStep(step) {
    if (step === 2) {
        // Validate personal details
        const form = document.getElementById('personalDetails');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Store personal details
        const formData = new FormData(form);
        memberData = Object.fromEntries(formData.entries());
    }
    
    if (step === 3) {
        // Validate membership plan selection
        if (!selectedPlan) {
            alert('Please select a membership plan');
            return;
        }
        
        // Store selected activities
        const activities = Array.from(document.querySelectorAll('input[name="newActivities"]:checked'))
            .map(cb => cb.value);
        memberData.preferredActivities = activities;
        
        // Update payment summary
        updatePaymentSummary();
    }
    
    // Hide current step
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    
    // Show next step
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
    
    // Update step indicator
    updateStepIndicator(step + 1);
}

function previousStep(step) {
    // Hide current step
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    
    // Show previous step
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
    
    // Update step indicator
    updateStepIndicator(step + 1);
}

// Update Payment Summary
function updatePaymentSummary() {
    document.getElementById('summaryName').textContent = memberData.name || '-';
    document.getElementById('summaryPlan').textContent = resolvePlanTier(selectedPlan.months);
    document.getElementById('summaryDuration').textContent = `${selectedPlan.months} Month${selectedPlan.months > 1 ? 's' : ''}`;
    document.getElementById('summaryAmount').textContent = `₹${selectedPlan.price.toLocaleString('en-IN')}`;
}

function resolvePlanTier(months) {
    if (months >= 6) return 'Premium';
    if (months >= 3) return 'Standard';
    return 'Basic';
}

function normalizePaymentMode(mode) {
    if (mode === 'Cash') return 'Cash';
    if (mode === 'Card') return 'Card';
    if (mode === 'UPI') return 'UPI';
    return 'Online';
}

// Setup Payment Method Listener
function setupPaymentMethodListener() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const transactionIdGroup = document.getElementById('transactionIdGroup');
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'Cash') {
                transactionIdGroup.style.display = 'none';
                document.getElementById('transactionId').required = false;
            } else {
                transactionIdGroup.style.display = 'block';
                document.getElementById('transactionId').required = true;
            }
        });
    });
}

// Submit Previous Member Registration
async function submitPreviousMember() {
    const form = document.getElementById('prevMemberFormData');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    showLoading(true);
    
    try {
        const formData = new FormData(form);
        const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked'))
            .map(cb => cb.value);
        
        const data = {
            gymId: gymId,
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            preferredActivities: activities,
            registrationType: 'previous'
        };
        
        const response = await fetch(`${API_BASE_URL}/members/qr-register-previous`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
        
        const result = await response.json();
        
        showLoading(false);
        showSuccess('Previous Member', result);
        
    } catch (error) {
        console.error('Error submitting registration:', error);
        showLoading(false);
        showError(error.message || 'Registration failed. Please try again.');
    }
}

// Submit New Member Registration
async function submitNewMember() {
    const paymentForm = document.getElementById('paymentForm');
    
    if (!paymentForm.checkValidity()) {
        paymentForm.reportValidity();
        return;
    }
    
    if (!document.getElementById('termsAccept').checked) {
        alert('Please accept the terms and conditions');
        return;
    }
    
    showLoading(true);

    try {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const transactionId = document.getElementById('transactionId').value;
        const activities = Array.from(document.querySelectorAll('input[name="newActivities"]:checked'))
            .map(cb => cb.value);

        if (activities.length === 0) {
            showLoading(false);
            alert('Please select at least one preferred activity');
            return;
        }

        const monthlyPlan = `${selectedPlan.months} Month${selectedPlan.months > 1 ? 's' : ''}`;
        const paymentMode = normalizePaymentMode(paymentMethod);

        const data = {
            gymId: gymId,
            name: memberData.name,
            age: Number(memberData.age),
            gender: memberData.gender,
            phone: memberData.phone,
            email: memberData.email,
            address: memberData.address || '',
            preferredActivities: activities,
            activityPreference: activities.join(', '),
            planSelected: resolvePlanTier(selectedPlan.months),
            monthlyPlan,
            paymentMode,
            paymentAmount: selectedPlan.price,
            membershipPlan: {
                months: selectedPlan.months,
                price: selectedPlan.price,
                discount: selectedPlan.discount || 0,
                tier: resolvePlanTier(selectedPlan.months)
            },
            payment: {
                method: paymentMode,
                amount: selectedPlan.price,
                transactionId: transactionId || null
            }
        };

        if (qrToken) {
            data.qrToken = qrToken;
            data.registrationType = 'standard';
        }

        const response = await fetch(`${API_BASE_URL}/members/qr-register-new`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        const result = await response.json();

        showLoading(false);
        showSuccess('New Member', result);

    } catch (error) {
        console.error('Error submitting registration:', error);
        showLoading(false);
        showError(error.message || 'Registration failed. Please try again.');
    }
}

// Show Loading Overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Show Success Message
function showSuccess(type, result) {
    // Hide all other sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Update success message
    document.getElementById('successText').textContent = 
        `Your registration as a ${type} has been completed successfully!`;
    
    // Build success details
    let detailsHTML = '';
    if (result.memberId) {
        detailsHTML += `
            <div class="detail-row">
                <span>Member ID:</span>
                <strong>${result.memberId}</strong>
            </div>
        `;
    }
    if (result.name) {
        detailsHTML += `
            <div class="detail-row">
                <span>Name:</span>
                <strong>${result.name}</strong>
            </div>
        `;
    }
    if (result.phone) {
        detailsHTML += `
            <div class="detail-row">
                <span>Phone:</span>
                <strong>${result.phone}</strong>
            </div>
        `;
    }
    if (result.membershipExpiry) {
        detailsHTML += `
            <div class="detail-row">
                <span>Membership Valid Until:</span>
                <strong>${new Date(result.membershipExpiry).toLocaleDateString()}</strong>
            </div>
        `;
    }
    
    document.getElementById('successDetails').innerHTML = detailsHTML;
    
    // Show success section
    document.getElementById('successMessage').classList.add('active');
    updateStepIndicator(3);
}

// Show Error Message
function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').classList.remove('hidden');
}

// Hide Error Message
function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}

// Utility Functions
function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}
