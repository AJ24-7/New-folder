const Admin = require('../models/admin');
const SecuritySettings = require('../models/SecuritySettings');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Security and logging utilities
const SecurityLogger = require('../utils/securityLogger');
const EmailService = require('../services/emailService');

class AdminAuthController {
    constructor() {
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 300000; // 5 minutes
        this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
        this.sessionTimeout = 1800000; // 30 minutes
        
        // Initialize services with error handling
        try {
            this.emailService = new EmailService();
            this.securityLogger = new SecurityLogger();
        } catch (error) {
            console.error('Error initializing AdminAuthController services:', error);
            // Create minimal fallback services
            this.securityLogger = {
                log: async (event, details) => {
                    console.log(`[SECURITY] ${event}:`, details);
                }
            };
            this.emailService = {
                send2FACode: async () => ({ success: false, message: 'Email service unavailable' }),
                sendPasswordReset: async () => ({ success: false, message: 'Email service unavailable' })
            };
        }
    }

    // Rate limiting middleware
    createRateLimiter(windowMs = 900000, max = 5) { // 15 minutes, 5 attempts
        return rateLimit({
            windowMs,
            max,
            message: {
                success: false,
                message: 'Too many login attempts. Please try again later.',
                retryAfter: windowMs / 1000
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.securityLogger.log('rate_limit_exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    email: req.body?.email
                });
                res.status(429).json({
                    success: false,
                    message: 'Too many login attempts. Please try again later.',
                    retryAfter: Math.ceil(windowMs / 1000)
                });
            }
        });
    }

    // Admin login with enhanced security
    async login(req, res) {
        try {
            const { 
                email, 
                password, 
                deviceFingerprint, 
                rememberMe = false,
                userAgent,
                timezone,
                deviceInfo,
                locationInfo
            } = req.body;

            // Input validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            if (!deviceFingerprint) {
                return res.status(400).json({
                    success: false,
                    message: 'Device verification required'
                });
            }

            // Parse and format device information
            const formattedDeviceInfo = this.formatDeviceInfo(deviceInfo, req);
            const formattedLocationInfo = this.formatLocationInfo(locationInfo);

            // Find admin by email (not locked)
            const admin = await Admin.findByEmailNotLocked(email);
            
            if (!admin) {
                // Log failed attempt
                await this.securityLogger.log('login_attempt_invalid_user', {
                    email,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    deviceFingerprint
                });
                
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check if account is locked
            if (admin.isLocked) {
                await this.securityLogger.log('login_attempt_locked_account', {
                    adminId: admin._id,
                    email,
                    ip: req.ip,
                    lockUntil: admin.lockUntil
                });
                
                return res.status(423).json({
                    success: false,
                    message: 'Account temporarily locked due to too many failed attempts',
                    lockUntil: admin.lockUntil
                });
            }

            // Verify password
            const isPasswordValid = await admin.comparePassword(password);
            
            if (!isPasswordValid) {
                // Increment login attempts
                await admin.incLoginAttempts();
                
                await this.securityLogger.log('login_attempt_invalid_password', {
                    adminId: admin._id,
                    email,
                    ip: req.ip,
                    attempts: admin.loginAttempts + 1
                });
                
                const remainingAttempts = this.maxLoginAttempts - (admin.loginAttempts + 1);
                
                return res.status(401).json({
                    success: false,
                    message: remainingAttempts > 0 
                        ? `Invalid password. ${remainingAttempts} attempts remaining.`
                        : 'Account has been temporarily locked'
                });
            }

            // Password is correct, reset login attempts
            await admin.resetLoginAttempts();

            // Check if device is trusted or if 2FA is required
            const isTrustedDevice = admin.isTrustedDevice(deviceFingerprint);
            const requires2FA = admin.twoFactorEnabled && !isTrustedDevice;

            if (requires2FA) {
                // Generate and send 2FA code
                const twoFACode = this.generate2FACode();
                const tempToken = this.generateTempToken(admin._id, deviceFingerprint);
                
                // Store 2FA code temporarily (in production, use Redis)
                admin.pendingTwoFACode = {
                    code: await bcrypt.hash(twoFACode, 10),
                    expiresAt: new Date(Date.now() + 300000), // 5 minutes
                    deviceFingerprint
                };
                await admin.save();

                // Send 2FA code via email
                await this.emailService.send2FACode(admin.email, admin.name, twoFACode);

                await this.securityLogger.log('2fa_code_sent', {
                    adminId: admin._id,
                    email,
                    ip: req.ip,
                    deviceFingerprint
                });

                return res.json({
                    success: true,
                    requiresTwoFA: true,
                    tempToken,
                    email: admin.email,
                    message: 'Verification code sent to your email'
                });
            }

            // Complete login without 2FA
            return await this.completeLogin(admin, deviceFingerprint, rememberMe, req, res);

        } catch (error) {
            console.error('Login error:', error);
            await this.securityLogger.log('login_error', {
                error: error.message,
                ip: req.ip,
                email: req.body?.email
            });
            
            return res.status(500).json({
                success: false,
                message: 'Internal server error during authentication'
            });
        }
    }

    // Verify 2FA code
    async verify2FA(req, res) {
        try {
            const { code, deviceFingerprint } = req.body;
            const tempToken = req.headers.authorization?.replace('Bearer ', '');

            if (!code || !tempToken || !deviceFingerprint) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification code and device information required'
                });
            }

            // Verify temp token
            let decoded;
            try {
                decoded = jwt.verify(tempToken, this.jwtSecret + 'temp');
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session'
                });
            }

            if (decoded.deviceFingerprint !== deviceFingerprint) {
                return res.status(401).json({
                    success: false,
                    message: 'Device verification failed'
                });
            }

            // Find admin and verify 2FA code
            const admin = await Admin.findById(decoded.adminId);
            if (!admin || !admin.pendingTwoFACode) {
                return res.status(401).json({
                    success: false,
                    message: 'No pending verification found'
                });
            }

            // Check if 2FA code is expired
            if (admin.pendingTwoFACode.expiresAt < new Date()) {
                admin.pendingTwoFACode = undefined;
                await admin.save();
                
                return res.status(401).json({
                    success: false,
                    message: 'Verification code has expired'
                });
            }

            // Verify the code
            const isCodeValid = await bcrypt.compare(code, admin.pendingTwoFACode.code);
            
            if (!isCodeValid) {
                await this.securityLogger.log('2fa_verification_failed', {
                    adminId: admin._id,
                    ip: req.ip,
                    deviceFingerprint
                });
                
                return res.status(401).json({
                    success: false,
                    message: 'Invalid verification code',
                    attemptsRemaining: 2 // Could implement attempt tracking
                });
            }

            // Clear pending 2FA
            admin.pendingTwoFACode = undefined;
            await admin.save();

            // Add device to trusted devices if verification successful
            await admin.addTrustedDevice(deviceFingerprint, req.get('User-Agent'));

            await this.securityLogger.log('2fa_verification_success', {
                adminId: admin._id,
                ip: req.ip,
                deviceFingerprint
            });

            // Complete login
            return await this.completeLogin(admin, deviceFingerprint, false, req, res);

        } catch (error) {
            console.error('2FA verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error during verification'
            });
        }
    }

    // Complete login process
    async completeLogin(admin, deviceFingerprint, rememberMe, req, res) {
        try {
            // Generate tokens
            const accessToken = this.generateAccessToken(admin._id, admin.email, admin.role);
            const refreshToken = this.generateRefreshToken(admin._id, deviceFingerprint);

            // Store refresh token
            const refreshTokenExpiry = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
            await admin.addRefreshToken(refreshToken, deviceFingerprint, refreshTokenExpiry);

            // Update last login info
            admin.lastLogin = new Date();
            admin.lastLoginIP = req.ip;
            await admin.save();

            await this.securityLogger.log('login_success', {
                adminId: admin._id,
                email: admin.email,
                ip: req.ip,
                deviceFingerprint,
                rememberMe
            });

            // Prepare safe admin data
            const adminData = {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin,
                twoFactorEnabled: admin.twoFactorEnabled
            };

            return res.json({
                success: true,
                message: 'Login successful',
                token: accessToken,
                refreshToken,
                admin: adminData,
                sessionTimeout: admin.sessionTimeout,
                expiresIn: 1800 // 30 minutes
            });

        } catch (error) {
            console.error('Complete login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error completing authentication'
            });
        }
    }

    // Resend 2FA code
    async resend2FA(req, res) {
        try {
            const tempToken = req.headers.authorization?.replace('Bearer ', '');
            
            if (!tempToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid session'
                });
            }

            // Verify temp token
            let decoded;
            try {
                decoded = jwt.verify(tempToken, this.jwtSecret + 'temp');
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Session expired'
                });
            }

            const admin = await Admin.findById(decoded.adminId);
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
            }

            // Generate new 2FA code
            const twoFACode = this.generate2FACode();
            
            admin.pendingTwoFACode = {
                code: await bcrypt.hash(twoFACode, 10),
                expiresAt: new Date(Date.now() + 300000), // 5 minutes
                deviceFingerprint: decoded.deviceFingerprint
            };
            await admin.save();

            // Send new code
            await this.emailService.send2FACode(admin.email, admin.name, twoFACode);

            await this.securityLogger.log('2fa_code_resent', {
                adminId: admin._id,
                ip: req.ip
            });

            return res.json({
                success: true,
                message: 'New verification code sent'
            });

        } catch (error) {
            console.error('Resend 2FA error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error resending verification code'
            });
        }
    }

    // Forgot password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const admin = await Admin.findOne({ email, status: 'active' });
            
            // Always return success to prevent email enumeration
            if (!admin) {
                await this.securityLogger.log('forgot_password_invalid_email', {
                    email,
                    ip: req.ip
                });
                
                return res.json({
                    success: true,
                    message: 'If this email is registered, you will receive reset instructions'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            
            admin.passwordResetToken = resetTokenHash;
            admin.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
            await admin.save();

            // Send reset email
            await this.emailService.sendPasswordReset(admin.email, admin.name, resetToken);

            await this.securityLogger.log('password_reset_requested', {
                adminId: admin._id,
                email,
                ip: req.ip
            });

            return res.json({
                success: true,
                message: 'Password reset instructions sent to your email'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error processing password reset'
            });
        }
    }

    // Reset password with token
    async resetPassword(req, res) {
        try {
            const { token, password } = req.body;

            if (!token || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Reset token and new password are required'
                });
            }

            // Validate password strength
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                });
            }

            // Hash the token to match stored version
            const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

            // Find admin with valid reset token
            const admin = await Admin.findOne({
                passwordResetToken: resetTokenHash,
                passwordResetExpires: { $gt: Date.now() },
                status: 'active'
            });

            if (!admin) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            // Update password and clear reset token
            admin.password = password; // Will be hashed by pre-save middleware
            admin.passwordResetToken = undefined;
            admin.passwordResetExpires = undefined;
            
            // Invalidate all existing refresh tokens for security
            admin.refreshTokens = [];
            
            await admin.save();

            await this.securityLogger.log('password_reset_completed', {
                adminId: admin._id,
                email: admin.email,
                ip: req.ip
            });

            return res.json({
                success: true,
                message: 'Password reset successfully. Please login with your new password.'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error resetting password'
            });
        }
    }

    // Refresh token
    async refreshToken(req, res) {
        try {
            const { refreshToken, deviceFingerprint } = req.body;

            if (!refreshToken || !deviceFingerprint) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token and device fingerprint required'
                });
            }

            // Verify refresh token
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token'
                });
            }

            // Find admin and validate refresh token
            const admin = await Admin.findById(decoded.adminId);
            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
            }

            const storedToken = admin.refreshTokens.find(
                rt => rt.token === refreshToken && rt.deviceFingerprint === deviceFingerprint
            );

            if (!storedToken || storedToken.expiresAt < new Date()) {
                await admin.removeRefreshToken(refreshToken);
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token expired or invalid'
                });
            }

            // Generate new access token
            const newAccessToken = this.generateAccessToken(admin._id, admin.email, admin.role);

            return res.json({
                success: true,
                token: newAccessToken,
                expiresIn: 1800
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error refreshing token'
            });
        }
    }

    // Logout
    async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const adminId = req.admin?.id;

            if (adminId && refreshToken) {
                const admin = await Admin.findById(adminId);
                if (admin) {
                    await admin.removeRefreshToken(refreshToken);
                }

                await this.securityLogger.log('logout', {
                    adminId,
                    ip: req.ip
                });
            }

            return res.json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error during logout'
            });
        }
    }

    // Security log endpoint
    async logSecurityEvent(req, res) {
        try {
            const { event, details } = req.body;
            
            await this.securityLogger.log(event, {
                ...details,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(204).send();
        } catch (error) {
            console.error('Security log error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error logging security event'
            });
        }
    }

    // Helper methods
    generateAccessToken(adminId, email, role) {
        return jwt.sign(
            { 
                adminId, 
                email, 
                role,
                type: 'access'
            },
            this.jwtSecret,
            { 
                expiresIn: '30m',
                issuer: 'gym-wale-admin',
                audience: 'gym-wale-admin'
            }
        );
    }

    generateRefreshToken(adminId, deviceFingerprint) {
        return jwt.sign(
            { 
                adminId, 
                deviceFingerprint,
                type: 'refresh'
            },
            this.jwtRefreshSecret,
            { 
                expiresIn: '7d',
                issuer: 'gym-wale-admin',
                audience: 'gym-wale-admin'
            }
        );
    }

    generateTempToken(adminId, deviceFingerprint) {
        return jwt.sign(
            { 
                adminId, 
                deviceFingerprint,
                type: 'temp'
            },
            this.jwtSecret + 'temp',
            { 
                expiresIn: '5m',
                issuer: 'gym-wale-admin'
            }
        );
    }

    generate2FACode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}

module.exports = new AdminAuthController();
