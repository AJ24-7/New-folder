const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 300000; // 5 minutes
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const SESSION_TIMEOUT = 1800000; // 30 minutes

// Simple security logger
const logSecurityEvent = async (event, details = {}) => {
    console.log(`[SECURITY] ${event}:`, details);
};

// Rate limiting middleware
const createRateLimiter = (windowMs = 900000, max = 5) => { // 15 minutes, 5 attempts
    return rateLimit({
        windowMs,
        max,
        message: { 
            success: false, 
            message: 'Too many login attempts. Please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: async (req, res) => {
            await logSecurityEvent('rate_limit_exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            res.status(429).json({
                success: false,
                message: 'Too many login attempts. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

// Generate JWT token
const generateTokens = (adminId) => {
    const accessToken = jwt.sign(
        { 
            adminId, 
            type: 'access',
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '30m' }
    );

    const refreshToken = jwt.sign(
        { 
            adminId, 
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

// Admin login
const login = async (req, res) => {
    try {
        const { email, password, deviceFingerprint, trustDevice = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find admin by email
        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            await logSecurityEvent('login_attempt_invalid_user', {
                email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (admin.lockoutUntil && admin.lockoutUntil > Date.now()) {
            await logSecurityEvent('login_attempt_locked_account', {
                adminId: admin._id,
                email,
                ip: req.ip,
                lockoutUntil: admin.lockoutUntil
            });
            return res.status(423).json({
                success: false,
                message: 'Account is temporarily locked due to too many failed attempts',
                lockoutTime: admin.lockoutUntil
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            // Increment failed attempts
            admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
            
            if (admin.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
                admin.lockoutUntil = Date.now() + LOCKOUT_DURATION;
            }
            
            await admin.save();

            await logSecurityEvent('login_attempt_invalid_password', {
                adminId: admin._id,
                email,
                ip: req.ip,
                failedAttempts: admin.failedLoginAttempts
            });

            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - admin.failedLoginAttempts)
            });
        }

        // Reset failed attempts on successful password verification
        admin.failedLoginAttempts = 0;
        admin.lockoutUntil = undefined;

        // Check if account is active
        if (admin.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active. Please contact support.'
            });
        }

        // For this simplified version, we'll skip 2FA and proceed with login
        const { accessToken, refreshToken } = generateTokens(admin._id);

        // Update admin login info
        admin.lastLogin = new Date();
        admin.lastLoginIP = req.ip;
        
        // Handle device trust
        if (trustDevice && deviceFingerprint) {
            const trustedDevice = {
                fingerprint: deviceFingerprint,
                name: `${req.get('User-Agent')?.substring(0, 50) || 'Unknown Device'}`,
                ip: req.ip,
                trustedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            };
            
            admin.trustedDevices = admin.trustedDevices || [];
            
            // Remove existing device with same fingerprint
            admin.trustedDevices = admin.trustedDevices.filter(
                device => device.fingerprint !== deviceFingerprint
            );
            
            admin.trustedDevices.push(trustedDevice);
        }

        // Store refresh token
        admin.refreshTokens = admin.refreshTokens || [];
        admin.refreshTokens.push({
            token: refreshToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            deviceFingerprint
        });

        // Limit refresh tokens (keep only last 5)
        if (admin.refreshTokens.length > 5) {
            admin.refreshTokens = admin.refreshTokens.slice(-5);
        }

        await admin.save();

        await logSecurityEvent('login_success', {
            adminId: admin._id,
            email: admin.email,
            ip: req.ip,
            deviceTrusted: trustDevice
        });

        // Return success response
        res.json({
            success: true,
            message: 'Login successful',
            token: accessToken,
            refreshToken,
            sessionTimeout: SESSION_TIMEOUT,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        await logSecurityEvent('login_error', {
            error: error.message,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
};

// Verify 2FA (simplified - will return success for now)
const verify2FA = async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        
        // For now, accept any 6-digit code
        if (!code || code.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid 2FA code format'
            });
        }

        // In a real implementation, you'd verify the code here
        res.json({
            success: true,
            message: '2FA verification successful',
            token: 'verified-token',
            admin: { name: 'Admin User' }
        });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during 2FA verification'
        });
    }
};

// Refresh token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        const admin = await Admin.findById(decoded.adminId);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if refresh token exists in database
        const tokenExists = admin.refreshTokens.some(rt => rt.token === token);
        if (!tokenExists) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token not found'
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(admin._id);

        // Replace old refresh token with new one
        admin.refreshTokens = admin.refreshTokens.filter(rt => rt.token !== token);
        admin.refreshTokens.push({
            token: newRefreshToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await admin.save();

        res.json({
            success: true,
            token: accessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token'
        });
    }
};

// Forgot password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        
        // Always return success for security (don't reveal if email exists)
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

        if (admin) {
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            admin.passwordResetToken = resetToken;
            admin.passwordResetExpires = Date.now() + 3600000; // 1 hour
            await admin.save();

            await logSecurityEvent('password_reset_requested', {
                adminId: admin._id,
                email: admin.email,
                ip: req.ip
            });

            // In a real implementation, you'd send an email here
            console.log(`Password reset token for ${email}: ${resetToken}`);
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        const admin = await Admin.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Update password
        admin.password = newPassword; // Will be hashed by pre-save middleware
        admin.passwordResetToken = undefined;
        admin.passwordResetExpires = undefined;
        admin.passwordChangedAt = new Date();

        await admin.save();

        await logSecurityEvent('password_reset_completed', {
            adminId: admin._id,
            email: admin.email,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        const adminId = req.admin?.id;

        if (adminId && token) {
            const admin = await Admin.findById(adminId);
            if (admin) {
                admin.refreshTokens = admin.refreshTokens.filter(rt => rt.token !== token);
                await admin.save();
            }
        }

        await logSecurityEvent('logout', {
            adminId,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createRateLimiter,
    login,
    verify2FA,
    refreshToken,
    forgotPassword,
    resetPassword,
    logout
};
