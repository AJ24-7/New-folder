// Gym Wale Registration Page JavaScript
// API Configuration
// Priority: query param -> global override -> default.
const urlParams = new URLSearchParams(window.location.search);
const resolvedApiBase =
    urlParams.get('apiBase') ||
    urlParams.get('api') ||
    window.GYM_WALE_API_BASE_URL ||
    'https://gym-wale.onrender.com/api';

const API_BASE_URL = resolvedApiBase.replace(/\/+$/, '').endsWith('/api')
    ? resolvedApiBase.replace(/\/+$/, '')
    : `${resolvedApiBase.replace(/\/+$/, '')}/api`;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const RAZORPAY_PAYMENT_LINK = window.GYM_WALE_RAZORPAY_PAYMENT_LINK || '';
const FALLBACK_ACTIVITIES = [
    'Cardio',
    'Weight Training',
    'Yoga',
    'CrossFit',
    'Zumba',
    'Swimming'
];

// Global State
let currentStep = 1;
let registrationType = '';
let gymId = '';
let qrToken = '';
let gymData = {};
let gymActivities = [];
let membershipPlans = [];
let selectedPlan = null;
let memberData = {};

// Coupon state
let _appliedCoupon = null;       // { _id, code, title, description, discountType, discountValue }
let _couponDiscountAmount = 0;   // computed discount in ₹

// Prev-member renewal coupon state
let _prevAppliedCoupon = null;
let _prevCouponDiscountAmount = 0;

// Previous member lookup state
let _prevLookupTimer = null;
let _prevFoundMember = null;
let _prevRenewalMode = false;
let _prevSelectedRenewalPlan = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    gymId = urlParams.get('gymId') || urlParams.get('gym') || '';
    qrToken = urlParams.get('token') || urlParams.get('qrToken') || '';

    if (!gymId && !qrToken) {
        showError('Invalid registration link. Please scan the QR code again.');
        return;
    }

    setupPaymentMethodListener();

    // Lookup existing member whenever phone or email loses focus (new member form)
    document.getElementById('newPhone').addEventListener('blur', scheduleMemberLookup);
    document.getElementById('newEmail').addEventListener('blur', scheduleMemberLookup);

    // Lookup previous member record whenever phone or email loses focus (prev member form)
    document.getElementById('prevPhone').addEventListener('blur', schedulePreviousMemberLookup);
    document.getElementById('prevEmail').addEventListener('blur', schedulePreviousMemberLookup);

    setupPrevPaymentMethodListener();

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
            name: data.gym.name || data.gym.gymName || 'Gym Registration',
            logoUrl: resolveAssetUrl(data.gym.logoUrl || data.gym.logo)
        };

        applyGymBranding();
        await loadGymInfo(false);
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
async function loadGymInfo(manageLoader = true) {
    return loadGymInfoInternal(manageLoader);
}

async function loadGymInfoInternal(manageLoader) {
    if (manageLoader) {
        showLoading(true);
    }

    try {
        const [infoResponse, profileResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/gyms/info/${gymId}`),
            fetch(`${API_BASE_URL}/gyms/${gymId}`)
        ]);

        let infoPayload = null;
        let profilePayload = null;

        if (infoResponse.ok) {
            infoPayload = await infoResponse.json();
        }

        if (profileResponse.ok) {
            profilePayload = await profileResponse.json();
        }

        if (!infoPayload && !profilePayload) {
            throw new Error('Failed to load gym information');
        }

        const profileGym = profilePayload?.gym || profilePayload?.data || profilePayload || {};
        gymData = {
            ...gymData,
            ...(infoPayload || {}),
            ...(profileGym || {}),
            id: gymId,
            name:
                (profileGym && (profileGym.name || profileGym.gymName)) ||
                (infoPayload && (infoPayload.name || infoPayload.gymName)) ||
                gymData.name ||
                'Gym Registration',
            logoUrl: resolveAssetUrl(
                (profileGym && profileGym.logoUrl) ||
                (infoPayload && (infoPayload.logoUrl || infoPayload.logo)) ||
                gymData.logoUrl
            )
        };

        gymActivities = normalizeActivities(profileGym?.activities || infoPayload?.activities || []);

        applyGymBranding();
        renderActivityOptions();

        if (manageLoader) {
            showLoading(false);
        }
    } catch (error) {
        console.error('Error loading gym info:', error);
        gymActivities = normalizeActivities([]);
        renderActivityOptions();

        if (manageLoader) {
            showLoading(false);
        }

        document.getElementById('gymName').textContent = 'Gym Registration';
    }
}

function applyGymBranding() {
    document.getElementById('gymName').textContent = gymData.name || 'Gym Registration';

    const gymLogo = document.getElementById('gymLogo');
    if (gymData.logoUrl) {
        gymLogo.src = gymData.logoUrl;
        gymLogo.onerror = () => {
            gymLogo.classList.add('hidden');
        };
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
        loadMembershipPlans(); // pre-fetch plans so renewal section has data
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
        membershipPlans = normalizeMembershipPlans(data);

        displayMembershipPlans();
    } catch (error) {
        console.error('Error loading membership plans:', error);
        const container = document.getElementById('membershipPlans');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load membership plans. Please contact the gym.</p>
                </div>
            `;
        }
    }
}

// Display Membership Plans
function displayMembershipPlans() {
    const container = document.getElementById('membershipPlans');
    if (!container) return; // not in new-member view — plans are cached for later use

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
        const discount = normalizeDiscount(plan.discount);
        const finalPrice = resolvePlanFinalPrice(plan);
        const originalPrice = Number.isFinite(plan.originalPrice) && plan.originalPrice > finalPrice
            ? plan.originalPrice
            : (discount > 0 ? plan.price : null);
        const tierName = plan.tierName ? `<div class="plan-tier">${escapeHtml(plan.tierName)}</div>` : '';
        const popularBadge = plan.isPopular ? '<div class="plan-popular-tag">Most Popular</div>' : '';
        
        return `
            <div class="plan-card ${plan.isPopular ? 'popular' : ''}" onclick="selectPlan(${index})">
                ${popularBadge}
                ${tierName}
                <div class="plan-duration">${plan.months} Month${plan.months > 1 ? 's' : ''}</div>
                <div class="plan-price">
                    ₹${finalPrice.toLocaleString('en-IN')}
                    ${originalPrice ? `<span class="plan-original-price">₹${originalPrice.toLocaleString('en-IN')}</span>` : ''}
                </div>
                ${discount > 0 ? `<div class="plan-discount">Save ${discount}%</div>` : ''}
            </div>
        `;
    }).join('');
}

function normalizeMembershipPlans(data) {
    const plans = [];

    if (Array.isArray(data?.memberships) && data.memberships.length > 0) {
        data.memberships.forEach((item) => {
            const durationDays = Number(item?.duration || 0);
            const months = durationDays > 0 ? Math.max(1, Math.round(durationDays / 30)) : 1;
            const price = Number(item?.price);
            const discount = normalizeDiscount(item?.discount);
            const pricing = calculatePlanPricing(price, discount, item?.finalPrice, item?.originalPrice);

            if (!Number.isFinite(price) || price <= 0) {
                return;
            }

            plans.push({
                months,
                price,
                discount,
                finalPrice: pricing.finalPrice,
                originalPrice: pricing.originalPrice,
                isPopular: Boolean(item?.isPopular),
                tierName: item?.name || null
            });
        });
    }

    if (Array.isArray(data?.monthlyOptions) && data.monthlyOptions.length > 0) {
        data.monthlyOptions.forEach((option) => {
            const normalized = normalizeMonthlyOption(option, data?.name || null);
            if (normalized) {
                plans.push(normalized);
            }
        });
    }

    if (Array.isArray(data?.tiers) && data.tiers.length > 0) {
        data.tiers.forEach((tier) => {
            if (!Array.isArray(tier?.monthlyOptions)) {
                return;
            }

            tier.monthlyOptions.forEach((option) => {
                const normalized = normalizeMonthlyOption(option, tier?.name || null);
                if (normalized) {
                    plans.push(normalized);
                }
            });
        });
    }

    return plans.sort((a, b) => {
        if (a.months !== b.months) {
            return a.months - b.months;
        }
        return a.price - b.price;
    });
}

function normalizeMonthlyOption(option, tierName) {
    const months = Number(option?.months);
    const price = Number(option?.price ?? option?.originalPrice ?? option?.finalPrice);
    const discount = normalizeDiscount(option?.discount);
    const pricing = calculatePlanPricing(price, discount, option?.finalPrice, option?.originalPrice);

    if (!Number.isFinite(months) || months <= 0 || !Number.isFinite(price) || price <= 0) {
        return null;
    }

    return {
        months,
        price,
        discount,
        finalPrice: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        isPopular: Boolean(option?.isPopular),
        tierName: tierName || null
    };
}

function normalizeDiscount(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
        return 0;
    }
    return Math.min(100, Math.max(0, numberValue));
}

function calculatePlanPricing(price, discount, finalPrice, originalPrice) {
    const resolvedPrice = Number(price);
    const resolvedFinal = Number(finalPrice);
    const resolvedOriginal = Number(originalPrice);

    if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
        return { finalPrice: null, originalPrice: null };
    }

    if (Number.isFinite(resolvedFinal) && resolvedFinal > 0) {
        return {
            finalPrice: resolvedFinal,
            originalPrice: Number.isFinite(resolvedOriginal) && resolvedOriginal > resolvedFinal ? resolvedOriginal : null
        };
    }

    if (discount > 0) {
        const discounted = Math.max(0, Math.round(resolvedPrice - (resolvedPrice * discount) / 100));
        return {
            finalPrice: discounted,
            originalPrice: resolvedPrice
        };
    }

    return { finalPrice: resolvedPrice, originalPrice: null };
}

function resolvePlanFinalPrice(plan) {
    if (!plan) {
        return 0;
    }

    const value = Number(plan.finalPrice ?? plan.price);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeActivities(activities) {
    if (!Array.isArray(activities) || activities.length === 0) {
        return FALLBACK_ACTIVITIES.map((name) => ({ name }));
    }

    return activities
        .map((activity) => {
            if (typeof activity === 'string') {
                return { name: activity };
            }

            if (activity && typeof activity === 'object' && activity.name) {
                return {
                    name: activity.name,
                    icon: activity.icon || null
                };
            }

            return null;
        })
        .filter(Boolean);
}

function renderActivityOptions() {
    renderActivitiesIntoContainer('previousActivities', 'activities');
    renderActivitiesIntoContainer('newActivities', 'newActivities');
}

function renderActivitiesIntoContainer(containerId, inputName) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    const activities = gymActivities.length > 0
        ? gymActivities
        : FALLBACK_ACTIVITIES.map((name) => ({ name }));

    container.innerHTML = activities.map((activity, index) => {
        const value = String(activity.name || '').trim();
        if (!value) {
            return '';
        }

        const iconClass = resolveActivityIconClass(activity.icon);
        const iconMarkup = iconClass
            ? `<span class="activity-icon"><i class="${escapeHtml(iconClass)}"></i></span>`
            : '<span class="activity-icon activity-icon-fallback"></span>';

        const safeId = `${containerId}-${index}`;
        return `
            <label class="checkbox-label activity-chip" for="${safeId}">
                <input type="checkbox" id="${safeId}" name="${inputName}" value="${escapeHtml(value)}">
                ${iconMarkup}
                <span>${escapeHtml(value)}</span>
            </label>
        `;
    }).join('');
}

function resolveActivityIconClass(icon) {
    if (!icon) {
        return '';
    }

    const trimmed = String(icon).trim();
    if (!trimmed) {
        return '';
    }

    const hasPrefix = /(^|\s)(fa|fas|far|fal|fab|fa-solid|fa-regular|fa-light|fa-brands)\s/.test(trimmed);
    if (hasPrefix) {
        return trimmed;
    }

    return `fa-solid ${trimmed}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
async function nextStep(step) {
    if (step === 2) {
        // Validate personal details first
        const form = document.getElementById('personalDetails');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Block if an unresolved duplicate exists
        if (document.getElementById('existingMemberBanner') &&
            !document.getElementById('existingMemberBanner').classList.contains('hidden') &&
            !_memberBannerDismissed) {
            document.getElementById('existingMemberBanner').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Run a fresh lookup in case the user didn't blur both fields
        const blocked = await checkForDuplicateAndBlock();
        if (blocked) return;

        // Validate profile photo (required for new member)
        const profileImageInput = document.getElementById('profileImageInput');
        if (!profileImageInput || !profileImageInput.files || !profileImageInput.files[0]) {
            alert('Please upload a profile photo to continue.');
            document.getElementById('photoUploadCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    const basePrice = resolvePlanFinalPrice(selectedPlan);
    const discountRow = document.getElementById('summaryDiscountRow');
    const discountEl = document.getElementById('summaryDiscount');

    document.getElementById('summaryName').textContent = memberData.name || '-';
    document.getElementById('summaryPlan').textContent = resolvePlanTier(selectedPlan.months);
    document.getElementById('summaryDuration').textContent = `${selectedPlan.months} Month${selectedPlan.months > 1 ? 's' : ''}`;

    if (_appliedCoupon && _couponDiscountAmount > 0) {
        discountRow.style.display = '';
        discountEl.textContent = `-₹${_couponDiscountAmount.toLocaleString('en-IN')}`;
        document.getElementById('summaryAmount').textContent = `₹${Math.max(0, basePrice - _couponDiscountAmount).toLocaleString('en-IN')}`;
    } else {
        discountRow.style.display = 'none';
        document.getElementById('summaryAmount').textContent = `₹${basePrice.toLocaleString('en-IN')}`;
    }
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

function openRazorpayPaymentLink() {
    if (!RAZORPAY_PAYMENT_LINK) {
        alert('Payment link is not configured. Please contact support.');
        return false;
    }
    const paymentWindow = window.open(RAZORPAY_PAYMENT_LINK, '_blank', 'noopener');
    if (!paymentWindow) {
        alert('Unable to open payment link. Please allow popups and try again.');
        return false;
    }
    return true;
}

// Setup Payment Method Listener
function setupPaymentMethodListener() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const transactionIdGroup = document.getElementById('transactionIdGroup');
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'Bank Transfer') {
                transactionIdGroup.style.display = 'block';
                document.getElementById('transactionId').required = true;
            } else {
                transactionIdGroup.style.display = 'none';
                document.getElementById('transactionId').required = false;
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

    // ── Renewal mode ──────────────────────────────────────────────────────────
    if (_prevRenewalMode) {
        if (!_prevSelectedRenewalPlan) {
            alert('Please select a membership plan to renew.');
            document.getElementById('prevMembershipPlans').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        const prevPaymentMethodEl = document.querySelector('input[name="prevPaymentMethod"]:checked');
        if (!prevPaymentMethodEl) {
            alert('Please select a payment method.');
            document.getElementById('prevRenewalSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        const method = prevPaymentMethodEl.value;
        if ((method === 'Card' || method === 'UPI' || method === 'Bank Transfer') &&
            !document.getElementById('prevTransactionId').value.trim()) {
            alert('Please enter the transaction ID for your payment.');
            document.getElementById('prevTransactionId').focus();
            return;
        }
        await submitRenewal(form, method);
        return;
    }

    // ── Basic registration mode ───────────────────────────────────────────────
    showLoading(true);
    
    try {
        const formData = new FormData(form);
        const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked'))
            .map(cb => cb.value);

        const submission = new FormData();
        submission.append('gymId', gymId);
        submission.append('name', formData.get('name'));
        submission.append('phone', formData.get('phone'));
        submission.append('email', formData.get('email'));
        submission.append('preferredActivities', JSON.stringify(activities));
        submission.append('registrationType', 'previous');

        const prevImageInput = document.getElementById('prevProfileImageInput');
        if (prevImageInput && prevImageInput.files && prevImageInput.files[0]) {
            submission.append('profileImage', prevImageInput.files[0]);
        }

        const response = await fetch(`${API_BASE_URL}/members/qr-register-previous`, {
            method: 'POST',
            body: submission
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

// ─────────────────────────────────────────────────────────────
// Previous Member Lookup
// ─────────────────────────────────────────────────────────────

function schedulePreviousMemberLookup() {
    clearTimeout(_prevLookupTimer);
    _prevLookupTimer = setTimeout(runPreviousMemberLookup, 600);
}

async function runPreviousMemberLookup() {
    if (!gymId) return;

    const rawPhone = (document.getElementById('prevPhone').value || '').replace(/\D/g, '');
    const rawEmail = (document.getElementById('prevEmail').value || '').trim().toLowerCase();
    const phoneOk = /^[0-9]{10}$/.test(rawPhone);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

    if (!phoneOk && !emailOk) return;

    try {
        const params = new URLSearchParams({ gymId });
        if (phoneOk) params.set('phone', rawPhone);
        if (emailOk) params.set('email', rawEmail);

        const resp = await fetch(`${API_BASE_URL}/members/qr-lookup?${params.toString()}`);
        if (!resp.ok) return;

        const data = await resp.json();
        if (data.found) {
            _prevFoundMember = data.member;
            showPrevMemberStatus(data.member);
        } else {
            _prevFoundMember = null;
            resetPrevMemberStatus(false); // valid identifiers but no record
        }
    } catch (_) {
        // silently ignore network errors during lookup
    }
}

function showPrevMemberStatus(member) {
    const card = document.getElementById('prevMemberStatusCard');
    const renewalSection = document.getElementById('prevRenewalSection');
    const submitBtn = document.getElementById('prevSubmitBtn');

    const isActive = member.validUntil
        ? new Date(member.validUntil) > new Date()
        : Boolean(member.isActive);
    const expiry = member.validUntil ? new Date(member.validUntil).toLocaleDateString('en-IN') : null;
    const name = escapeHtml(member.name || '');
    const plan = escapeHtml(member.planSelected || '');

    card.style.display = 'block';

    if (isActive) {
        _prevRenewalMode = false;
        card.className = 'prev-member-status-card prev-member-active';
        card.innerHTML = `
            <div class="pms-icon"><i class="fas fa-check-circle"></i></div>
            <div class="pms-body">
                <strong>Welcome back, ${name}!</strong>
                <p>Your membership is <span class="pms-badge pms-active">Active</span></p>
                ${expiry ? `<p class="pms-detail">Valid until <strong>${expiry}</strong></p>` : ''}
                ${plan ? `<p class="pms-detail">Current plan: <strong>${plan}</strong></p>` : ''}
                <p class="pms-hint">You can update your contact details and preferred activities below.</p>
            </div>
        `;
        renewalSection.style.display = 'none';
        submitBtn.innerHTML = 'Update Details <i class="fas fa-save"></i>';
    } else {
        _prevRenewalMode = true;
        card.className = 'prev-member-status-card prev-member-expired';
        card.innerHTML = `
            <div class="pms-icon"><i class="fas fa-clock"></i></div>
            <div class="pms-body">
                <strong>Welcome back, ${name}!</strong>
                <p>Your membership has <span class="pms-badge pms-expired">Expired</span></p>
                ${expiry ? `<p class="pms-detail">Last valid until <strong>${expiry}</strong></p>` : ''}
                ${plan ? `<p class="pms-detail">Previous plan: <strong>${plan}</strong></p>` : ''}
                <p class="pms-hint">Choose a plan below to renew your membership.</p>
            </div>
        `;
        renewalSection.style.display = 'block';
        renderPrevMembershipPlans();
        submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Renew Membership';
    }
}

function resetPrevMemberStatus(notFound) {
    _prevRenewalMode = false;
    _prevFoundMember = null;
    _prevSelectedRenewalPlan = null;

    const card = document.getElementById('prevMemberStatusCard');
    const renewalSection = document.getElementById('prevRenewalSection');
    const submitBtn = document.getElementById('prevSubmitBtn');

    renewalSection.style.display = 'none';

    if (notFound === false) {
        card.style.display = 'block';
        card.className = 'prev-member-status-card prev-member-not-found';
        card.innerHTML = `
            <div class="pms-icon"><i class="fas fa-user-plus"></i></div>
            <div class="pms-body">
                <strong>No record found</strong>
                <p class="pms-hint">You're not yet in this gym's database. Fill in your details below to register your basic information and the gym staff will set up your membership.</p>
            </div>
        `;
    } else {
        card.style.display = 'none';
    }

    submitBtn.innerHTML = 'Submit Registration <i class="fas fa-arrow-right"></i>';
}

function renderPrevMembershipPlans() {
    const container = document.getElementById('prevMembershipPlans');
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
        const discount = normalizeDiscount(plan.discount);
        const finalPrice = resolvePlanFinalPrice(plan);
        const originalPrice = Number.isFinite(plan.originalPrice) && plan.originalPrice > finalPrice
            ? plan.originalPrice
            : (discount > 0 ? plan.price : null);
        const tierName = plan.tierName ? `<div class="plan-tier">${escapeHtml(plan.tierName)}</div>` : '';
        const popularBadge = plan.isPopular ? '<div class="plan-popular-tag">Most Popular</div>' : '';

        return `
            <div class="plan-card ${plan.isPopular ? 'popular' : ''}" onclick="selectRenewalPlan(${index})">
                ${popularBadge}
                ${tierName}
                <div class="plan-duration">${plan.months} Month${plan.months > 1 ? 's' : ''}</div>
                <div class="plan-price">
                    ₹${finalPrice.toLocaleString('en-IN')}
                    ${originalPrice ? `<span class="plan-original-price">₹${originalPrice.toLocaleString('en-IN')}</span>` : ''}
                </div>
                ${discount > 0 ? `<div class="plan-discount">Save ${discount}%</div>` : ''}
            </div>
        `;
    }).join('');
}

function selectRenewalPlan(index) {
    _prevSelectedRenewalPlan = membershipPlans[index];
    document.querySelectorAll('#prevMembershipPlans .plan-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
    updatePrevRenewalSummary();
}

function updatePrevRenewalSummary() {
    const summaryEl = document.getElementById('prevRenewalSummary');
    if (!_prevSelectedRenewalPlan) {
        summaryEl.style.display = 'none';
        return;
    }
    const finalPrice = resolvePlanFinalPrice(_prevSelectedRenewalPlan);
    document.getElementById('prevSummaryPlan').textContent = resolvePlanTier(_prevSelectedRenewalPlan.months);
    document.getElementById('prevSummaryDuration').textContent =
        `${_prevSelectedRenewalPlan.months} Month${_prevSelectedRenewalPlan.months > 1 ? 's' : ''}`;
    document.getElementById('prevSummaryAmount').textContent = `₹${finalPrice.toLocaleString('en-IN')}`;
    summaryEl.style.display = 'block';
}

function setupPrevPaymentMethodListener() {
    document.querySelectorAll('input[name="prevPaymentMethod"]').forEach(method => {
        method.addEventListener('change', () => {
            const txnGroup = document.getElementById('prevTransactionIdGroup');
            const val = document.querySelector('input[name="prevPaymentMethod"]:checked')?.value;
            if (val === 'Card' || val === 'UPI' || val === 'Bank Transfer') {
                txnGroup.style.display = 'block';
            } else {
                txnGroup.style.display = 'none';
            }
            updatePrevRenewalSummary();
        });
    });
}

// ─────────────────────────────────────────────────────────────
// Coupon UI helpers — new member (step 3)
// ─────────────────────────────────────────────────────────────

function toggleCouponInput() {
    const wrap = document.getElementById('couponInputWrap');
    const btn  = document.getElementById('couponToggleBtn');
    const hidden = wrap.classList.toggle('hidden');
    btn.textContent = hidden ? 'Apply' : 'Close';
    if (hidden) {
        // Reset state when collapsed
        removeCoupon();
    }
}

async function applyCoupon() {
    const code = (document.getElementById('couponCodeInput').value || '').trim().toUpperCase();
    if (!code) { _showCouponFeedback('couponFeedback', 'Please enter a coupon code.', 'error'); return; }

    const purchaseAmount = selectedPlan ? resolvePlanFinalPrice(selectedPlan) : 0;

    _showCouponFeedback('couponFeedback', '<i class="fas fa-spinner fa-spin"></i> Validating…', 'info');
    document.getElementById('applyCouponBtn').disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/offers/coupons/validate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, gymId, purchaseAmount })
        });
        const json = await res.json();

        if (res.ok && json.valid) {
            _appliedCoupon = json.coupon;
            _couponDiscountAmount = json.discountDetails?.discountAmount || 0;

            _showCouponFeedback('couponFeedback', '', 'clear');
            _renderCouponApplied(
                'couponAppliedCard', 'caTitle', 'caDesc', 'caSavings',
                json.coupon, _couponDiscountAmount
            );
            document.getElementById('couponToggleBtn').textContent = '✓ Applied';
            updatePaymentSummary();
        } else {
            _appliedCoupon = null;
            _couponDiscountAmount = 0;
            document.getElementById('couponAppliedCard').classList.add('hidden');
            _showCouponFeedback('couponFeedback', json.message || 'Invalid or expired coupon.', 'error');
            updatePaymentSummary();
        }
    } catch (_) {
        _showCouponFeedback('couponFeedback', 'Could not validate coupon. Please try again.', 'error');
    } finally {
        document.getElementById('applyCouponBtn').disabled = false;
    }
}

function removeCoupon() {
    _appliedCoupon = null;
    _couponDiscountAmount = 0;
    document.getElementById('couponCodeInput').value = '';
    document.getElementById('couponAppliedCard').classList.add('hidden');
    _showCouponFeedback('couponFeedback', '', 'clear');
    document.getElementById('couponToggleBtn').textContent = 'Close';
    if (selectedPlan) updatePaymentSummary();
}

// ─────────────────────────────────────────────────────────────
// Coupon UI helpers — prev member renewal
// ─────────────────────────────────────────────────────────────

function togglePrevCouponInput() {
    const wrap = document.getElementById('prevCouponInputWrap');
    const btn  = document.getElementById('prevCouponToggleBtn');
    const hidden = wrap.classList.toggle('hidden');
    btn.textContent = hidden ? 'Apply' : 'Close';
    if (hidden) removePrevCoupon();
}

async function applyPrevCoupon() {
    const code = (document.getElementById('prevCouponCodeInput').value || '').trim().toUpperCase();
    if (!code) { _showCouponFeedback('prevCouponFeedback', 'Please enter a coupon code.', 'error'); return; }

    const purchaseAmount = _prevSelectedRenewalPlan ? resolvePlanFinalPrice(_prevSelectedRenewalPlan) : 0;

    _showCouponFeedback('prevCouponFeedback', '<i class="fas fa-spinner fa-spin"></i> Validating…', 'info');

    try {
        const res = await fetch(`${API_BASE_URL}/offers/coupons/validate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, gymId, purchaseAmount })
        });
        const json = await res.json();

        if (res.ok && json.valid) {
            _prevAppliedCoupon = json.coupon;
            _prevCouponDiscountAmount = json.discountDetails?.discountAmount || 0;

            _showCouponFeedback('prevCouponFeedback', '', 'clear');
            _renderCouponApplied(
                'prevCouponAppliedCard', 'prevCaTitle', 'prevCaDesc', 'prevCaSavings',
                json.coupon, _prevCouponDiscountAmount
            );
            document.getElementById('prevCouponToggleBtn').textContent = '✓ Applied';
            _updatePrevRenewalSummary();
        } else {
            _prevAppliedCoupon = null;
            _prevCouponDiscountAmount = 0;
            document.getElementById('prevCouponAppliedCard').classList.add('hidden');
            _showCouponFeedback('prevCouponFeedback', json.message || 'Invalid or expired coupon.', 'error');
            _updatePrevRenewalSummary();
        }
    } catch (_) {
        _showCouponFeedback('prevCouponFeedback', 'Could not validate coupon. Please try again.', 'error');
    }
}

function removePrevCoupon() {
    _prevAppliedCoupon = null;
    _prevCouponDiscountAmount = 0;
    document.getElementById('prevCouponCodeInput').value = '';
    document.getElementById('prevCouponAppliedCard').classList.add('hidden');
    _showCouponFeedback('prevCouponFeedback', '', 'clear');
    document.getElementById('prevCouponToggleBtn').textContent = 'Close';
    _updatePrevRenewalSummary();
}

function _updatePrevRenewalSummary() {
    if (!_prevSelectedRenewalPlan) return;
    const basePrice = resolvePlanFinalPrice(_prevSelectedRenewalPlan);
    const discountRow = document.getElementById('prevSummaryDiscountRow');
    const discountEl  = document.getElementById('prevSummaryDiscount');
    const amountEl    = document.getElementById('prevSummaryAmount');
    if (!amountEl) return;

    if (_prevAppliedCoupon && _prevCouponDiscountAmount > 0) {
        discountRow.style.display = '';
        discountEl.textContent = `-₹${_prevCouponDiscountAmount.toLocaleString('en-IN')}`;
        amountEl.textContent = `₹${Math.max(0, basePrice - _prevCouponDiscountAmount).toLocaleString('en-IN')}`;
    } else {
        discountRow.style.display = 'none';
        amountEl.textContent = `₹${basePrice.toLocaleString('en-IN')}`;
    }
}

// Shared rendering helpers
function _showCouponFeedback(elId, html, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (type === 'clear' || !html) { el.innerHTML = ''; el.className = 'coupon-feedback'; return; }
    el.innerHTML = html;
    el.className = `coupon-feedback coupon-feedback--${type}`;
}

function _renderCouponApplied(cardId, titleId, descId, savingsId, coupon, discountAmt) {
    const card = document.getElementById(cardId);
    if (!card) return;
    document.getElementById(titleId).textContent = coupon.title || 'Coupon Applied!';
    document.getElementById(descId).textContent = coupon.description || '';
    document.getElementById(savingsId).textContent = `₹${discountAmt.toLocaleString('en-IN')}`;
    card.classList.remove('hidden');
}

async function submitRenewal(form, paymentMethod) {
    showLoading(true);
    try {
        const formData = new FormData(form);
        const baseRenewalPrice = resolvePlanFinalPrice(_prevSelectedRenewalPlan);
        const finalPrice = Math.max(0, baseRenewalPrice - _prevCouponDiscountAmount);

        // For Card/UPI, open Razorpay then ask for transaction ID
        if (paymentMethod === 'Card' || paymentMethod === 'UPI') {
            showLoading(false);
            const opened = openRazorpayPaymentLink();
            if (!opened) return;
            const txnRef = window.prompt(
                'Your Razorpay payment page has opened in a new tab.\n\nAfter completing payment, enter the transaction reference below.',
                ''
            );
            if (txnRef === null) return; // user cancelled
            if (txnRef.trim()) document.getElementById('prevTransactionId').value = txnRef.trim();
            showLoading(true);
        }

        const submission = new FormData();
        submission.append('gymId', gymId);
        submission.append('name', formData.get('name'));
        submission.append('phone', formData.get('phone'));
        submission.append('email', formData.get('email'));
        submission.append('planSelected', resolvePlanTier(_prevSelectedRenewalPlan.months));
        submission.append('months', _prevSelectedRenewalPlan.months);
        submission.append('paymentMode', paymentMethod);
        submission.append('paymentAmount', finalPrice);

        if (_prevAppliedCoupon) {
            submission.append('couponCode', _prevAppliedCoupon.code);
        }

        const txnId = document.getElementById('prevTransactionId').value.trim();
        if (txnId) submission.append('transactionId', txnId);

        const prevImageInput = document.getElementById('prevProfileImageInput');
        if (prevImageInput && prevImageInput.files && prevImageInput.files[0]) {
            submission.append('profileImage', prevImageInput.files[0]);
        }

        const response = await fetch(`${API_BASE_URL}/members/qr-renew`, {
            method: 'POST',
            body: submission
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Renewal failed');
        }

        const result = await response.json();
        showLoading(false);

        if (result.requiresCashValidation) {
            showCashPending(result, 'Renewed Member');
            return;
        }

        showSuccess('Renewed Member', result);

    } catch (error) {
        console.error('Error renewing membership:', error);
        showLoading(false);
        showError(error.message || 'Renewal failed. Please try again.');
    }
}

// Submit New Member Registration
// ─────────────────────────────────────────────────────────────
// Profile Photo Upload
// ─────────────────────────────────────────────────────────────

function getPhotoIds(context) {
    if (context === 'prev') {
        return {
            input: 'prevProfileImageInput',
            preview: 'prevPhotoPreview',
            placeholder: 'prevPhotoPlaceholder',
            removeBtn: 'prevPhotoRemoveBtn',
            fileName: 'prevPhotoFileName'
        };
    }
    return {
        input: 'profileImageInput',
        preview: 'photoPreview',
        placeholder: 'photoPlaceholder',
        removeBtn: 'photoRemoveBtn',
        fileName: 'photoFileName'
    };
}

function handlePhotoChange(input, context) {
    const file = input.files && input.files[0];
    if (!file) return;

    // Validate type and size (max 5 MB)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Only JPG, PNG or WEBP images are allowed.');
        input.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5 MB.');
        input.value = '';
        return;
    }

    const ids = getPhotoIds(context);
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(ids.preview);
        const placeholder = document.getElementById(ids.placeholder);
        const removeBtn = document.getElementById(ids.removeBtn);
        const fileName = document.getElementById(ids.fileName);
        preview.src = e.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        removeBtn.style.display = '';
        if (fileName) fileName.textContent = file.name;
    };
    reader.readAsDataURL(file);
}

function removeProfilePhoto(context) {
    const ids = getPhotoIds(context);
    const input = document.getElementById(ids.input);
    const preview = document.getElementById(ids.preview);
    const placeholder = document.getElementById(ids.placeholder);
    const removeBtn = document.getElementById(ids.removeBtn);
    const fileName = document.getElementById(ids.fileName);
    input.value = '';
    preview.src = '';
    preview.style.display = 'none';
    placeholder.style.display = '';
    removeBtn.style.display = 'none';
    if (fileName) fileName.textContent = 'No photo selected';
}

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

        if (paymentMethod === 'Card' || paymentMethod === 'UPI') {
            const opened = openRazorpayPaymentLink();
            if (!opened) {
                showLoading(false);
                return;
            }
            showLoading(false);

            // Require user to confirm they completed payment before submitting.
            // window.prompt returns null on Cancel and the entered string on OK.
            const txnRef = window.prompt(
                'Your Razorpay payment page has opened in a new tab.\n\n' +
                'After completing your payment, enter the Razorpay transaction or UTR ' +
                'reference below (optional — helps the gym verify faster).\n\n' +
                'Click OK to confirm payment and complete registration, or Cancel to abort.',
                ''
            );

            if (txnRef === null) {
                // User cancelled — do not submit registration
                return;
            }

            const txnInput = document.getElementById('transactionId');
            if (txnInput && txnRef.trim().length > 0) {
                txnInput.value = txnRef.trim();
            }
            showLoading(true);
        }

        const monthlyPlan = `${selectedPlan.months} Month${selectedPlan.months > 1 ? 's' : ''}`;
        const paymentMode = normalizePaymentMode(paymentMethod);
        const basePrice = resolvePlanFinalPrice(selectedPlan);
        const finalPrice = Math.max(0, basePrice - _couponDiscountAmount);

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
            paymentAmount: finalPrice,
            paymentStatus: (paymentMethod === 'Card' || paymentMethod === 'UPI')
                ? 'pending_verification'
                : 'paid',
            membershipPlan: {
                months: selectedPlan.months,
                price: selectedPlan.price,
                finalPrice,
                discount: selectedPlan.discount || 0,
                tier: resolvePlanTier(selectedPlan.months)
            },
            payment: {
                method: paymentMode,
                amount: finalPrice,
                transactionId: document.getElementById('transactionId').value || null
            }
        };

        if (qrToken) {
            data.qrToken = qrToken;
            data.registrationType = 'standard';
        }

        // Build FormData so the profile photo file can be included
        const formData = new FormData();
        const profileImageInput = document.getElementById('profileImageInput');
        if (profileImageInput && profileImageInput.files && profileImageInput.files[0]) {
            formData.append('profileImage', profileImageInput.files[0]);
        }
        // Append all scalar fields
        const scalarFields = [
            'gymId', 'name', 'age', 'gender', 'phone', 'email', 'address',
            'activityPreference', 'planSelected', 'monthlyPlan', 'paymentMode',
            'paymentAmount', 'paymentStatus', 'qrToken', 'registrationType'
        ];
        scalarFields.forEach((key) => {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });
        // Stringify arrays and nested objects
        if (data.preferredActivities) {
            formData.append('preferredActivities', JSON.stringify(data.preferredActivities));
        }
        formData.append('membershipPlan', JSON.stringify(data.membershipPlan));
        formData.append('payment', JSON.stringify(data.payment));

        if (_appliedCoupon) {
            formData.append('couponCode', _appliedCoupon.code);
        }

        const response = await fetch(`${API_BASE_URL}/members/qr-register-new`, {
            method: 'POST',
            body: formData
            // Note: do NOT set Content-Type — the browser sets multipart/form-data with the boundary automatically
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        const result = await response.json();

        showLoading(false);
        // Cash payments: show pending screen and poll for admin confirmation
        if (result.requiresCashValidation) {
            showCashPending(result);
            return;
        }
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

// ─────────────────────────────────────────────────────────────
// Existing Member Lookup & Duplicate Block
// ─────────────────────────────────────────────────────────────

let _lookupTimer = null;
let _memberBannerDismissed = false;

function scheduleMemberLookup() {
    clearTimeout(_lookupTimer);
    _lookupTimer = setTimeout(runMemberLookup, 500);
}

async function runMemberLookup() {
    if (!gymId) return;
    const rawPhone = (document.getElementById('newPhone').value || '').replace(/\D/g, '');
    const rawEmail = (document.getElementById('newEmail').value || '').trim().toLowerCase();
    const phoneOk = /^[0-9]{10}$/.test(rawPhone);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
    if (!phoneOk && !emailOk) { hideMemberBanner(); return; }

    try {
        const params = new URLSearchParams({ gymId });
        if (phoneOk) params.set('phone', rawPhone);
        if (emailOk) params.set('email', rawEmail);
        const res = await fetch(`${API_BASE_URL}/members/qr-lookup?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.found && data.member) {
            _memberBannerDismissed = false;
            showMemberBanner(data.member);
        } else {
            hideMemberBanner();
        }
    } catch (_) { /* silently ignore – don't block the user for a network glitch */ }
}

// Call this before navigating to step 2; returns true if the user should be blocked.
async function checkForDuplicateAndBlock() {
    if (!gymId) return false;
    const rawPhone = (document.getElementById('newPhone').value || '').replace(/\D/g, '');
    const rawEmail = (document.getElementById('newEmail').value || '').trim().toLowerCase();
    const phoneOk = /^[0-9]{10}$/.test(rawPhone);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
    if (!phoneOk && !emailOk) return false;

    try {
        const params = new URLSearchParams({ gymId });
        if (phoneOk) params.set('phone', rawPhone);
        if (emailOk) params.set('email', rawEmail);
        const res = await fetch(`${API_BASE_URL}/members/qr-lookup?${params}`);
        if (!res.ok) return false;
        const data = await res.json();
        if (data.found && data.member && !_memberBannerDismissed) {
            showMemberBanner(data.member);
            document.getElementById('existingMemberBanner').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true; // blocked
        }
    } catch (_) { /* ignore */ }
    return false;
}

function showMemberBanner(member) {
    const isMemberActive = member.validUntil
        ? new Date(member.validUntil) > new Date()
        : Boolean(member.isActive);
    let details = `<p class="em-name">${escapeHtml(member.name || 'Unknown')}</p>`;
    if (member.planSelected) details += `<span class="em-badge em-plan">${escapeHtml(member.planSelected)}</span>`;
    if (isMemberActive) {
        details += `<span class="em-badge em-active">Active</span>`;
        if (member.validUntil) details += `<span class="em-valid"> Valid until <strong>${new Date(member.validUntil).toLocaleDateString()}</strong></span>`;
    } else {
        details += `<span class="em-badge em-expired">Expired / Inactive</span>`;
    }
    document.getElementById('emBannerDetails').innerHTML = details;
    document.getElementById('existingMemberBanner').classList.remove('hidden');
}

function hideMemberBanner() {
    document.getElementById('existingMemberBanner').classList.add('hidden');
}

function dismissMemberBanner() {
    _memberBannerDismissed = true;
    hideMemberBanner();
}

function switchToPreviousMemberFlow() {
    const name  = (document.getElementById('newName').value  || '').trim();
    const phone = (document.getElementById('newPhone').value || '').trim();
    const email = (document.getElementById('newEmail').value || '').trim();
    goBack();
    selectType('previous');
    if (name)  document.getElementById('prevName').value  = name;
    if (phone) document.getElementById('prevPhone').value = phone;
    if (email) document.getElementById('prevEmail').value = email;
}

// ─────────────────────────────────────────────────────────────
// Cash Payment Pending Screen + Status Polling
// ─────────────────────────────────────────────────────────────

let _cashCountdownTimer = null;
let _cashPollingTimer   = null;

function showCashPending(result, successType) {
    clearInterval(_cashCountdownTimer);
    clearInterval(_cashPollingTimer);

    // Hide all sections, show pending
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('cashPendingSection').classList.add('active');
    updateStepIndicator(3);

    document.getElementById('cashValidationCode').textContent = result.validationCode || '----';
    document.getElementById('cashExpiredBox').classList.add('hidden');
    document.getElementById('cashStatusMsg').textContent = '';

    // Member detail rows
    let details = '';
    if (result.name)  details += `<div class="detail-row"><span>Name:</span><strong>${escapeHtml(result.name)}</strong></div>`;
    if (result.phone) details += `<div class="detail-row"><span>Phone:</span><strong>${escapeHtml(result.phone)}</strong></div>`;
    document.getElementById('cashPendingDetails').innerHTML = details;

    // Countdown
    let timeLeft = Number(result.timeLeft) || 120;
    const countdownEl = document.getElementById('cashCountdown');
    const ringEl      = document.getElementById('cashCountdownRing');

    function renderCountdown(s) {
        const m = Math.floor(s / 60);
        return `${m}:${String(s % 60).padStart(2, '0')}`;
    }
    countdownEl.textContent = renderCountdown(timeLeft);

    _cashCountdownTimer = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        countdownEl.textContent = renderCountdown(timeLeft);
        if (timeLeft <= 30) ringEl.classList.add('urgent');
        if (timeLeft === 0) {
            clearInterval(_cashCountdownTimer);
            clearInterval(_cashPollingTimer);
            document.getElementById('cashExpiredBox').classList.remove('hidden');
        }
    }, 1000);

    // Poll for admin decision every 4 seconds
    const code = result.validationCode;
    _cashPollingTimer = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/cash-validation/validation-status/${encodeURIComponent(code)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === 'confirmed') {
                clearInterval(_cashCountdownTimer);
                clearInterval(_cashPollingTimer);
                document.getElementById('cashStatusMsg').innerHTML =
                    '<span class="cash-confirmed">✅ Payment confirmed by gym admin! Your membership is now active.</span>';
                // Show success after a short delay so the user reads the message
                setTimeout(() => showSuccess(successType || 'New Member', {
                    name: result.name,
                    phone: result.phone,
                    memberId: data.member?.membershipId || data.membershipId || null,
                    membershipExpiry: data.member?.validUntil || null
                }), 2500);
            } else if (data.status === 'rejected') {
                clearInterval(_cashCountdownTimer);
                clearInterval(_cashPollingTimer);
                document.getElementById('cashStatusMsg').innerHTML =
                    '<span class="cash-rejected">❌ Cash payment was rejected by the gym admin. Please visit the counter for assistance.</span>';
                document.getElementById('cashExpiredBox').classList.remove('hidden');
            }
        } catch (_) { /* ignore transient network errors */ }
    }, 4000);
}

// Utility Functions
function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}
