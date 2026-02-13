document.addEventListener('DOMContentLoaded', function() {
    
    // --- UTILITY FUNCTIONS ---

    /**
     * Clears all known authentication-related keys from localStorage and sessionStorage.
     */
    function clearAuthStorage() {
        const keysToClear = ['gymAdminToken', 'token', 'authToken', 'gymAuthToken', 'adminToken', 'gymId', 'currentGymId', 'gym_id'];
        keysToClear.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        console.log('🧹 Cleared all authentication storage.');
    }

    /**
     * Displays a toast notification.
     * @param {'success'|'error'|'info'|'warning'} type - The type of notification.
     * @param {string} title - The title of the notification.
     * @param {string} message - The main message content.
     * @param {number} duration - How long the notification should be visible in ms.
     */
    function showNotification(type, title, message, duration = 5000) {
        // Remove any existing notifications to prevent stacking
        const existingNotifications = document.querySelectorAll('.toast-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `toast-notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">
                    <i class="${iconMap[type] || iconMap.info}" aria-hidden="true"></i>
                    <span>${title}</span>
                </div>
                <button class="toast-close" aria-label="Close">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
            <div class="toast-progress"></div>
        `;

        document.body.appendChild(notification);

        const progress = notification.querySelector('.toast-progress');
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Set timeout to animate out and remove
        if (duration > 0) {
            progress.style.animation = `progress ${duration / 1000}s linear forwards`;
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500); // Remove from DOM after transition
            }, duration);
        }

        // Close button functionality
        notification.querySelector('.toast-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        });
    }    /**
     * Redirects the user to the admin dashboard after a successful login.
     * @param {string} token - The JWT token.
     * @param {string} gymId - The ID of the gym.
     */
    function redirectToDashboard(token, gymId) {
        // Store token and gymId securely
        clearAuthStorage(); // Clear old data before setting new
        localStorage.setItem('gymAdminToken', token);
        localStorage.setItem('gymId', gymId);
        sessionStorage.setItem('gymAdminToken', token); // Redundancy for session-only cases
        sessionStorage.setItem('gymId', gymId);

        console.log('✅ Token and GymId stored. Redirecting...');
        
        // Disable form to prevent further interaction
        loginButton.disabled = true;
        emailInput.disabled = true;
        passwordInput.disabled = true;

        showNotification('success', 'Login Successful!', 'Welcome back! Redirecting to your dashboard...');

        setTimeout(() => {
            const dashboardUrl = '../gymadmin/gymadmin.html';
            window.location.href = dashboardUrl;
        }, 1000); // Delay to allow user to see success message
    }


    // --- INITIALIZATION ---

    // Form elements
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');

    // Forgot password elements
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModal = document.getElementById('closeModal');
    const resetEmailInput = document.getElementById('resetEmail');
    const resetEmailError = document.getElementById('reset-email-error');
    const resetSuccess = document.getElementById('reset-success');
    const resetButton = document.getElementById('resetButton');
    const submitNewPasswordButton = document.getElementById('submitNewPassword');
    const otpGroup = document.getElementById('otp-group');
    const newpassGroup = document.getElementById('newpass-group');
    const resetOtpInput = document.getElementById('resetOtp');
    const resetOtpError = document.getElementById('reset-otp-error');
    const resetNewPasswordInput = document.getElementById('resetNewPassword');
    const resetNewPassError = document.getElementById('reset-newpass-error');

    if (!loginForm) {
        console.error('❌ Login form not found! Application cannot start.');
        return;
    }

    // --- TOKEN VALIDATION ON LOAD ---
    /* (async function validateExistingToken() {
        const existingToken = localStorage.getItem('gymAdminToken') || localStorage.getItem('token');
        const existingGymId = localStorage.getItem('gymId');

        if (existingToken && existingGymId) {
            console.log('🔄 User already authenticated, checking token validity...');
            
            try {
                const response = await fetch('${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/gyms/validate-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${existingToken}`
                    },
                    body: JSON.stringify({ gymId: existingGymId })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success || data.valid) {
                        console.log('✅ Token still valid, redirecting to dashboard...');
                        window.location.href = '/frontend/gymadmin/gymadmin.html';
                        return;
                    }
                }
                
                // If we reach here, token is invalid
                console.log('❌ Token invalid, clearing storage.');
                clearAuthStorage();
                
            } catch (error) {
                console.log('🔍 Token validation request failed:', error.message);
                // On network error, clear storage to be safe
                clearAuthStorage();
            }
        } else {
            console.log('ℹ️ No existing authentication found.');
        }
    })(); */


    // --- EVENT LISTENERS ---

    loginForm.addEventListener('submit', handleLogin);
    
    if (forgotPasswordLink && forgotPasswordModal) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordModal.classList.add('active');
      });
    }
    if (closeModal && forgotPasswordModal) {
      closeModal.addEventListener('click', () => forgotPasswordModal.classList.remove('active'));
    }
    
    if (resetButton) {
      resetButton.addEventListener('click', handleSendOtp);
    } else {
      console.warn('⚠️ Reset button not found in DOM');
    }
    
    if (submitNewPasswordButton) {
      submitNewPasswordButton.addEventListener('click', handlePasswordReset);
    } else {
      console.warn('⚠️ Submit new password button not found in DOM');
    }

    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
      togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
      });
    }

    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);


    // --- VALIDATION FUNCTIONS ---

    function validateEmail() {
        const emailValue = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailValue) {
            emailError.textContent = 'Email is required';
            emailError.style.display = 'block';
            return false;
        } else if (!emailRegex.test(emailValue)) {
            emailError.textContent = 'Please enter a valid email address';
            emailError.style.display = 'block';
            return false;
        }
        emailError.style.display = 'none';
        return true;
    }

    function validatePassword() {
        const passwordValue = passwordInput.value;
        if (!passwordValue) {
            passwordError.textContent = 'Password is required';
            passwordError.style.display = 'block';
            return false;
        } else if (passwordValue.length < 8) {
            passwordError.textContent = 'Password must be at least 8 characters';
            passwordError.style.display = 'block';
            return false;
        }
        passwordError.style.display = 'none';
        return true;
    }


    // --- DATA COLLECTION ---

    function getDeviceInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';

        let os = 'Unknown';
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac OS X')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iPhone')) os = 'iOS';

        const deviceInfo = {
            userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            browser,
            os,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        const fingerprint = btoa(JSON.stringify(deviceInfo));
        return { ...deviceInfo, fingerprint };
    }

    async function getLocationInfo() {
        const ipApiPromise = fetch('https://ipapi.co/json/')
            .then(res => res.ok ? res.json() : Promise.reject('IP API failed'))
            .then(data => ({
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city || 'Unknown',
                country: data.country_name || 'Unknown',
                method: 'ip-api'
            }));

        const geoPromise = new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject('Geolocation not supported');
            }
            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    city: 'GPS Location',
                    country: 'Unknown',
                    method: 'gps'
                }),
                error => reject(error.message),
                { timeout: 1500, enableHighAccuracy: false }
            );
        });

        const fallbackPromise = new Promise(resolve => 
            setTimeout(() => resolve({
                latitude: null, longitude: null, city: 'Unknown', country: 'Unknown', method: 'timeout'
            }), 2000)
        );

        try {
            const result = await Promise.race([geoPromise, ipApiPromise, fallbackPromise]);
            return result;
        } catch (error) {
            console.warn("Location detection error:", error);
            return await Promise.race([ipApiPromise, fallbackPromise]);
        }
    }
    

    // --- CORE LOGIC ---

    async function handleLogin(e) {
        e.preventDefault();
        if (!validateEmail() || !validatePassword()) {
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
            return;
        }

        buttonText.style.display = 'none';
        spinner.style.display = 'block';
        loginButton.disabled = true;

        try {
            const [deviceInfo, locationInfo] = await Promise.all([
                getDeviceInfo(),
                getLocationInfo()
            ]);

            const loginPayload = {
                email: emailInput.value,
                password: passwordInput.value,
                deviceInfo: { userAgent: deviceInfo.userAgent, browser: deviceInfo.browser, os: deviceInfo.os, timezone: deviceInfo.timezone },
                locationInfo: { latitude: locationInfo.latitude, longitude: locationInfo.longitude, city: locationInfo.city, country: locationInfo.country },
                deviceFingerprint: deviceInfo.fingerprint,
            };

            const response = await fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/gyms/login`, {
                method: 'POST',
                body: JSON.stringify(loginPayload),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (data.requires2FA) {
                    show2FAModal(data.tempToken, loginPayload.email);
                } else {
                    redirectToDashboard(data.token, data.gymId);
                }
            } else {
                showNotification('error', 'Login Failed', data.message || 'Invalid credentials.');
                loginForm.classList.add('shake');
                setTimeout(() => loginForm.classList.remove('shake'), 500);
            }
        } catch (error) {
            showNotification('error', 'Network Error', 'Could not connect to the server.');
            console.error('Login error:', error);
        } finally {
            if (!document.getElementById('twoFAModal')) { // Don't re-enable if 2FA modal is open
                buttonText.style.display = 'block';
                spinner.style.display = 'none';
                loginButton.disabled = false;
            }
        }
    }

    async function handleSendOtp() {
        const email = resetEmailInput.value.trim();
        if (!email) {
            resetEmailError.textContent = "Please enter your email";
            resetEmailError.classList.add('show');
            return;
        }
        resetEmailError.classList.remove('show');

        resetButton.disabled = true;
        resetButton.textContent = "Sending...";

        try {
            const apiUrl = `${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/gyms/request-password-otp`;
            console.log('Sending OTP request to:', apiUrl);
            
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            console.log('Response status:', res.status);
            
            if (!res.ok) {
                let errorMessage = 'Failed to send OTP';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If response is not JSON, check status
                    if (res.status === 502) {
                        errorMessage = 'Server is starting up, please wait and try again in a moment';
                    } else if (res.status === 504) {
                        errorMessage = 'Request timed out, please try again';
                    } else {
                        errorMessage = `Server error (${res.status}), please try again`;
                    }
                }
                throw new Error(errorMessage);
            }
            
            const data = await res.json();
            
            if (data.success) {
                resetSuccess.textContent = `OTP sent to ${email}`;
                resetSuccess.style.display = "block";
                document.getElementById('email-group').style.display = 'none';
                otpGroup.style.display = 'block';
                newpassGroup.style.display = 'block';
                resetButton.style.display = 'none';
                submitNewPasswordButton.style.display = 'block';
                document.getElementById('otp-instruction').textContent = `An OTP has been sent to ${email}. Please enter it below along with your new password.`;
            } else {
                resetEmailError.textContent = data.message || "Failed to send OTP";
                resetEmailError.classList.add('show');
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            resetEmailError.textContent = error.message || "Network error. Please try again.";
            resetEmailError.classList.add('show');
        } finally {
            resetButton.disabled = false;
            resetButton.textContent = "Send OTP";
        }
    }

    async function handlePasswordReset() {
        const email = resetEmailInput.value.trim();
        const otp = resetOtpInput.value.trim();
        const newPassword = resetNewPasswordInput.value.trim();

        if (!otp || otp.length !== 6) {
            resetOtpError.textContent = "Please enter a valid 6-digit OTP";
            resetOtpError.style.display = "block";
            return;
        }
        resetOtpError.style.display = "none";
        
        if (!newPassword || newPassword.length < 8) {
            resetNewPassError.textContent = "Password must be at least 8 characters";
            resetNewPassError.style.display = "block";
            return;
        }
        resetNewPassError.style.display = "none";

        submitNewPasswordButton.disabled = true;
        submitNewPasswordButton.textContent = "Resetting...";

        try {
            const apiUrl = `${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/gyms/verify-password-otp`;
            console.log('Verifying OTP request to:', apiUrl);
            
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, otp, newPassword })
            });
            
            console.log('Response status:', res.status);
            
            if (!res.ok) {
                let errorMessage = 'Failed to reset password';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    if (res.status === 502) {
                        errorMessage = 'Server is starting up, please wait and try again in a moment';
                    } else if (res.status === 504) {
                        errorMessage = 'Request timed out, please try again';
                    } else {
                        errorMessage = `Server error (${res.status}), please try again`;
                    }
                }
                throw new Error(errorMessage);
            }
            
            const data = await res.json();
            
            if (data.success) {
                forgotPasswordModal.classList.remove('active');
                showNotification('success', 'Password Reset!', 'You can now log in with your new password.');
                setTimeout(() => {
                    resetEmailInput.value = '';
                    resetOtpInput.value = '';
                    resetNewPasswordInput.value = '';
                    document.getElementById('email-group').style.display = 'block';
                    otpGroup.style.display = 'none';
                    newpassGroup.style.display = 'none';
                    resetButton.style.display = 'block';
                    submitNewPasswordButton.style.display = 'none';
                }, 500);
            } else {
                resetNewPassError.textContent = data.message || "Failed to reset password. The OTP may be incorrect.";
                resetNewPassError.style.display = "block";
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            resetNewPassError.textContent = error.message || "Network error. Please try again.";
            resetNewPassError.style.display = "block";
        } finally {
            submitNewPasswordButton.disabled = false;
            submitNewPasswordButton.textContent = "Reset Password";
        }
    }
    
    // --- 2FA MODAL FUNCTIONS ---
    
    function show2FAModal(tempToken, email) {
        close2FAModal(); // Close any existing modal first
        const modal2FA = document.createElement('div');
        modal2FA.id = 'twoFAModal';
        modal2FA.className = 'forgot-password-modal active';
        modal2FA.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2><i class="fas fa-shield-alt"></i> Two-Factor Authentication</h2>
                <p>We've sent a 6-digit code to <strong>${email}</strong>. Please enter it below.</p>
                <div class="form-group">
                    <input type="text" id="twoFACode" placeholder="000000" maxlength="6" style="text-align: center; font-size: 1.4em; letter-spacing: 0.5em;" />
                </div>
                <button type="button" id="verify2FAButton" class="login-btn">Verify Code</button>
                <button type="button" id="resend2FAButton" style="background: none; border: none; color: var(--primary-color); cursor: pointer; display: block; margin: 10px auto 0;">Resend Code</button>
            </div>`;
        document.body.appendChild(modal2FA);

        const codeInput = document.getElementById('twoFACode');
        const verifyButton = document.getElementById('verify2FAButton');
        const resendButton = document.getElementById('resend2FAButton');
        const closeButton = modal2FA.querySelector('.close-modal');

        closeButton.addEventListener('click', close2FAModal);
        verifyButton.addEventListener('click', () => verify2FA(tempToken));
        resendButton.addEventListener('click', () => resend2FA(email));
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verify2FA(tempToken);
        });
        codeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });

        setTimeout(() => codeInput.focus(), 100);
    }

    async function verify2FA(tempToken) {
        const code = document.getElementById('twoFACode').value.trim();
        const verifyButton = document.getElementById('verify2FAButton');
        if (!code || code.length !== 6) {
            return showNotification('error', 'Invalid Code', 'Please enter the 6-digit code.');
        }

        verifyButton.disabled = true;
        verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        try {
            const response = await fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/gyms/verify-login-2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempToken}` },
                body: JSON.stringify({ otp: code })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                close2FAModal();
                redirectToDashboard(data.token, data.gymId);
            } else {
                showNotification('error', 'Verification Failed', data.message || 'Invalid code.');
            }
        } catch (error) {
            console.error('Error verifying 2FA:', error);
            showNotification('error', 'Network Error', 'Could not verify the code.');
        } finally {
            verifyButton.disabled = false;
            verifyButton.innerHTML = 'Verify Code';
        }
    }

    async function resend2FA(email) {
        const resendButton = document.getElementById('resend2FAButton');
        resendButton.disabled = true;
        resendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            // Note: Your backend needs an endpoint to resend 2FA code based on email/temp state
            // This assumes an endpoint like '/resend-2fa' exists.
            const response = await fetch(`${window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000'}/api/gyms/resend-2fa-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showNotification('success', 'Code Sent', 'A new verification code has been sent.');
            } else {
                showNotification('error', 'Resend Failed', data.message || 'Could not resend code.');
            }
        } catch (error) {
            console.error('Error resending 2FA:', error);
            showNotification('error', 'Network Error', 'Could not connect to the server.');
        } finally {
            setTimeout(() => {
                resendButton.disabled = false;
                resendButton.innerHTML = 'Resend Code';
            }, 30000); // Prevent spamming resend button
        }
    }

    function close2FAModal() {
        const modal = document.getElementById('twoFAModal');
        if (modal) {
            modal.remove();
        }
        // Reset main login button state
        buttonText.style.display = 'block';
        spinner.style.display = 'none';
        loginButton.disabled = false;
    }
});