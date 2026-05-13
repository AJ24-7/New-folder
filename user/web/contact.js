/**
 * Contact Page - Gym Wale User Web
 * Integrates with backend contact/support system.
 *
 * API priority: query param (?apiBase=...) → window.GYM_WALE_API_BASE_URL → default
 */

(function () {
    'use strict';

    // ===================== API CONFIG =====================
    const urlParams = new URLSearchParams(window.location.search);
    const resolvedBase =
        urlParams.get('apiBase') ||
        urlParams.get('api') ||
        (typeof window.GYM_WALE_API_BASE_URL !== 'undefined' && window.GYM_WALE_API_BASE_URL) ||
        'https://gym-wale.onrender.com/api';

    const API_BASE = resolvedBase.replace(/\/+$/, '').endsWith('/api')
        ? resolvedBase.replace(/\/+$/, '')
        : `${resolvedBase.replace(/\/+$/, '')}/api`;

    // ===================== STATE =====================
    let selectedQuickMessage = null;
    let userProfile = null;
    let formRetryData = null;

    // ===================== DOM REFS =====================
    const contactForm    = document.getElementById('contactForm');
    const submitBtn      = document.getElementById('submitBtn');
    const btnText        = submitBtn.querySelector('.btn-text');
    const btnLoading     = document.getElementById('btnLoading');
    const loginHint      = document.getElementById('loginHint');
    const categorySelect = document.getElementById('category');
    const activitiesSection = document.getElementById('activitiesSection');

    // ===================== INIT =====================
    document.addEventListener('DOMContentLoaded', async () => {
        await loadQuickMessages();
        await loadUserProfile();
        checkLoginHint();
        bindCategoryChange();
        bindFormSubmit();
        bindModalActions();
    });

    // ===================== QUICK MESSAGES =====================
    async function loadQuickMessages() {
        const grid = document.getElementById('quickMessagesGrid');
        try {
            const res = await fetch(`${API_BASE}/admin/communication/contact/quick-messages`);
            if (!res.ok) throw new Error('Non-200 response');
            const result = await res.json();
            const messages = result.data || [];
            if (messages.length > 0) {
                renderQuickMessages(grid, messages);
            } else {
                renderQuickMessages(grid, getFallbackQuickMessages());
            }
        } catch {
            renderQuickMessages(grid, getFallbackQuickMessages());
        }
    }

    function getFallbackQuickMessages() {
        return [
            { id: 'membership_info',   title: 'Membership Information',  message: 'I would like to know more about your membership plans and pricing.',              category: 'membership' },
            { id: 'gym_locations',     title: 'Gym Locations',           message: 'Can you provide information about your gym locations near me?',                  category: 'general'    },
            { id: 'personal_training', title: 'Personal Training',       message: 'I am interested in personal training services. Please provide details.',          category: 'service'    },
            { id: 'diet_plans',        title: 'Diet Plans',              message: 'I would like to know about available diet plans and nutrition guidance.',          category: 'service'    },
            { id: 'equipment_info',    title: 'Equipment & Facilities',  message: 'What equipment and facilities are available at your gyms?',                       category: 'general'    },
            { id: 'technical_support', title: 'Technical Support',       message: 'I am experiencing technical issues with the website or app.',                     category: 'technical'  },
            { id: 'complaint',         title: 'Complaint / Feedback',    message: 'I have a complaint or feedback about your services.',                             category: 'complaint'  },
            { id: 'partnership',       title: 'Business Partnership',    message: 'I am interested in a business partnership or gym listing opportunity.',           category: 'partnership'}
        ];
    }

    function renderQuickMessages(grid, messages) {
        grid.innerHTML = messages.map(msg => {
            const safeMsg = JSON.stringify(msg).replace(/'/g, '&#39;');
            return `
                <div class="quick-msg-btn" data-message='${safeMsg}' role="button" tabindex="0" aria-label="${escapeHtml(msg.title)}">
                    <div class="qm-title">${escapeHtml(msg.title)}</div>
                    <div class="qm-preview">${escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.quick-msg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const data = JSON.parse(btn.dataset.message);
                    selectQuickMessage(data, btn);
                } catch {
                    // ignore malformed data
                }
            });
            btn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
    }

    function selectQuickMessage(data, btnEl) {
        // Deselect all
        document.querySelectorAll('.quick-msg-btn').forEach(b => b.classList.remove('selected'));
        btnEl.classList.add('selected');

        selectedQuickMessage = data;

        // Auto-fill subject, category, message
        const subjectField  = document.getElementById('subject');
        const messageField  = document.getElementById('message');

        if (!subjectField.disabled)  subjectField.value  = data.title;
        if (!messageField.disabled)  messageField.value  = data.message;

        // Set category if it matches a valid option
        const opt = categorySelect.querySelector(`option[value="${data.category}"]`);
        if (opt) categorySelect.value = data.category;

        toggleActivitiesSection(data.category);
    }

    // ===================== USER PROFILE =====================
    async function loadUserProfile() {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/users/profile`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Profile fetch failed');

            userProfile = await res.json();

            // Pre-fill and lock fields
            const nameField  = document.getElementById('name');
            const emailField = document.getElementById('email');
            const phoneField = document.getElementById('phone');

            if (userProfile.name)  lockField(nameField,  userProfile.name);
            if (userProfile.email) lockField(emailField, userProfile.email);
            if (userProfile.phone) lockField(phoneField, userProfile.phone);

        } catch {
            // Profile fetch failed — user can fill manually
        }
    }

    function lockField(field, value) {
        field.value    = value;
        field.disabled = true;

        // Add locked hint if not already present
        const parent = field.parentElement;
        if (!parent.querySelector('.field-locked-hint')) {
            const hint = document.createElement('small');
            hint.className = 'field-locked-hint';
            hint.innerHTML = '<i class="fas fa-lock"></i> Auto-filled from your profile';
            parent.appendChild(hint);
        }
    }

    function checkLoginHint() {
        if (!getToken() && loginHint) {
            loginHint.style.display = 'flex';
            // Pass return URL so login page can redirect back
            const loginLinkEl = document.getElementById('loginLink');
            if (loginLinkEl) {
                loginLinkEl.href = `index.html?redirect=${encodeURIComponent(window.location.href)}`;
            }
        }
    }

    // ===================== CATEGORY / ACTIVITIES =====================
    function bindCategoryChange() {
        categorySelect.addEventListener('change', () => {
            toggleActivitiesSection(categorySelect.value);
        });
    }

    function toggleActivitiesSection(category) {
        const showFor = ['membership', 'service', 'general'];
        const qmShowFor = ['membership_info', 'gym_locations', 'personal_training'];
        const show = showFor.includes(category) ||
            (selectedQuickMessage && qmShowFor.includes(selectedQuickMessage.id));

        if (show) {
            activitiesSection.classList.add('show');
        } else {
            activitiesSection.classList.remove('show');
            document.querySelectorAll('input[name="activities"]:checked')
                .forEach(cb => { cb.checked = false; });
        }
    }

    // ===================== FORM SUBMISSION =====================
    function bindFormSubmit() {
        contactForm.addEventListener('submit', async e => {
            e.preventDefault();
            await submitContactForm();
        });
    }

    async function submitContactForm() {
        if (!validateForm()) return;

        setSubmitting(true);
        formRetryData = null;

        const payload = buildPayload();
        formRetryData = payload; // store for retry

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token   = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/admin/communication/public/contact`, {
                method:  'POST',
                headers: headers,
                body:    JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok && result.success) {
                showSuccessModal(
                    result.message || 'Your message has been sent successfully!',
                    result.data?.ticketId || result.ticketId,
                    payload.email
                );
                resetForm();
            } else {
                throw new Error(result.message || 'Failed to send message.');
            }

        } catch (err) {
            showErrorModal(err.message || 'Failed to send message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    function buildPayload() {
        const activities = Array.from(
            document.querySelectorAll('input[name="activities"]:checked')
        ).map(cb => cb.value);

        return {
            name:                 document.getElementById('name').value.trim(),
            email:                document.getElementById('email').value.trim(),
            phone:                document.getElementById('phone').value.trim(),
            subject:              document.getElementById('subject').value.trim(),
            category:             categorySelect.value,
            message:              document.getElementById('message').value.trim(),
            quickMessage:         selectedQuickMessage ? selectedQuickMessage.id : null,
            interestedActivities: activities
        };
    }

    function validateForm() {
        const required = ['name', 'email', 'subject', 'category', 'message'];
        for (const id of required) {
            const el = document.getElementById(id);
            const val = el.value.trim();
            if (!val) {
                el.focus();
                el.style.borderColor = 'var(--error-color)';
                el.addEventListener('input', () => {
                    el.style.borderColor = '';
                }, { once: true });
                return false;
            }
        }
        // Basic email format
        const email = document.getElementById('email').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const el = document.getElementById('email');
            el.focus();
            el.style.borderColor = 'var(--error-color)';
            el.addEventListener('input', () => { el.style.borderColor = ''; }, { once: true });
            return false;
        }
        return true;
    }

    function setSubmitting(isSubmitting) {
        submitBtn.disabled  = isSubmitting;
        btnText.style.display    = isSubmitting ? 'none' : 'flex';
        btnLoading.style.display = isSubmitting ? 'flex' : 'none';
    }

    function resetForm() {
        // Preserve locked (user profile) values
        const nameField  = document.getElementById('name');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');

        const savedName  = nameField.disabled  ? nameField.value  : '';
        const savedEmail = emailField.disabled ? emailField.value : '';
        const savedPhone = phoneField.disabled ? phoneField.value : '';

        contactForm.reset();

        if (savedName)  nameField.value  = savedName;
        if (savedEmail) emailField.value = savedEmail;
        if (savedPhone) phoneField.value = savedPhone;

        selectedQuickMessage = null;
        document.querySelectorAll('.quick-msg-btn').forEach(b => b.classList.remove('selected'));
        activitiesSection.classList.remove('show');
    }

    // ===================== MODALS =====================
    function showSuccessModal(message, ticketId, email) {
        document.getElementById('successModalMessage').textContent = message;
        document.getElementById('ticketIdDisplay').textContent     = ticketId || '—';
        document.getElementById('emailDisplay').textContent        =
            email || document.getElementById('email').value || '—';

        openModal('successModal');

        // Auto-close after 12 s
        setTimeout(() => closeModal('successModal'), 12000);
    }

    function showErrorModal(message) {
        document.getElementById('errorModalMessage').textContent = message;
        openModal('errorModal');
    }

    function openModal(id) {
        const m = document.getElementById(id);
        if (m) { m.style.display = 'flex'; requestAnimationFrame(() => m.classList.add('show')); }
    }

    function closeModal(id) {
        const m = document.getElementById(id);
        if (!m) return;
        m.classList.remove('show');
        setTimeout(() => { m.style.display = 'none'; }, 300);
    }

    function bindModalActions() {
        document.getElementById('closeSuccessModal')?.addEventListener('click', () => closeModal('successModal'));
        document.getElementById('okSuccessModal')?.addEventListener('click',    () => closeModal('successModal'));
        document.getElementById('closeErrorModal')?.addEventListener('click',   () => closeModal('errorModal'));
        document.getElementById('okErrorModal')?.addEventListener('click',      () => closeModal('errorModal'));

        document.getElementById('retryErrorModal')?.addEventListener('click', () => {
            closeModal('errorModal');
            // Re-submit with stored payload
            if (formRetryData) {
                setTimeout(() => submitContactForm(), 300);
            }
        });

        // Close on backdrop click
        ['successModal', 'errorModal'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', e => {
                if (e.target === e.currentTarget) closeModal(id);
            });
        });
    }

    // ===================== HELPERS =====================
    function getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

})();
