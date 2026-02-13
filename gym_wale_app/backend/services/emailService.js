const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'your-email@gmail.com',
                pass: process.env.SMTP_PASS || 'your-app-password'
            }
        });
    }

    async send2FACode(email, name, code) {
        try {
            await sendEmail({
                to: email,
                subject: 'Gym-Wale - Your Security Code',
                title: 'Security Verification',
                preheader: `Your verification code: ${code}`,
                bodyHtml: `<p>Hello <strong>${name}</strong>,</p>
                  <p>Someone is trying to sign in to your gym admin account. Use this verification code:</p>
                  
                  <div style="text-align:center;margin:25px 0;">
                    <div style="display:inline-block;background:#e3f2fd;padding:20px 30px;border-radius:8px;border:2px dashed #2196f3;">
                      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1976d2;font-family:monospace;">${code}</div>
                    </div>
                  </div>
                  
                  <p style="text-align:center;color:#666;font-size:14px;"><strong>This code expires in 5 minutes.</strong></p>
                  
                  <div style="background:#fff3cd;padding:12px;border-radius:4px;border-left:4px solid #ffc107;margin:20px 0;">
                    <p style="margin:0;font-size:14px;"><strong>⚠️ Security Notice:</strong> If you didn't request this code, ignore this email and consider changing your password.</p>
                  </div>
                  
                  <p>Never share this code with anyone.</p>`,
                action: {
                    label: 'Return to Login',
                    url: process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/admin-login.html'
                }
            });
            console.log('✅ 2FA code sent to:', email);
        } catch (error) {
            console.error('❌ Error sending 2FA email:', error);
            throw new Error('Failed to send verification code');
        }
    }

    async sendPasswordReset(email, name, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;
        
        try {
            await sendEmail({
                to: email,
                subject: 'Gym-Wale Admin - Password Reset Request',
                title: 'Password Reset Request',
                preheader: 'Reset your admin account password securely',
                bodyHtml: `<p>Hello ${name},</p>
                  <p>We received a request to reset your admin account password. Click the button below to create a new password:</p>
                  <p style="margin:16px 0;padding:12px 16px;background:#1e293b;border:1px solid #334155;border-radius:12px;font-size:13px;color:#e2e8f0;">
                    Reset link: <code style="color:#38bdf8;word-break:break-all;">${resetUrl}</code>
                  </p>
                  <div style="background:#1e293b;border:1px solid #334155;padding:14px 18px;border-radius:14px;font-size:13px;line-height:1.5;color:#e2e8f0;">
                    <strong style="color:#fbbf24;">⚠ Security Information:</strong><br/>
                    • This reset link expires in <strong>1 hour</strong><br/>
                    • If you didn't request this reset, ignore this email<br/>
                    • Your password remains unchanged until you complete the reset<br/>
                    • Use a strong, unique password when resetting
                  </div>
                  <p style="margin-top:20px;">If you continue to have problems, contact our support team.</p>`,
                action: {
                    label: 'Reset My Password',
                    url: resetUrl
                }
            });
            console.log('Password reset email sent to:', email);
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    async sendLoginAlert(email, name, loginDetails) {
        try {
            // Format location properly
            let locationDisplay = 'Unknown';
            if (loginDetails.location && loginDetails.location !== 'Unknown') {
                locationDisplay = loginDetails.location;
            } else if (loginDetails.city && loginDetails.country) {
                const locationParts = [];
                if (loginDetails.city !== 'Unknown') locationParts.push(loginDetails.city);
                if (loginDetails.country !== 'Unknown') locationParts.push(loginDetails.country);
                locationDisplay = locationParts.join(', ') || 'Unknown';
            }

            // Format device info properly
            let deviceDisplay = 'Unknown Device';
            if (loginDetails.device && loginDetails.device !== 'Unknown') {
                deviceDisplay = loginDetails.device;
            } else if (loginDetails.browser && loginDetails.os) {
                deviceDisplay = `${loginDetails.os} - ${loginDetails.browser}`;
            }

            // Create concise email content to prevent Gmail clipping
            await sendEmail({
                to: email,
                subject: 'Gym-Wale - New Admin Login',
                title: 'New Login Detected',
                preheader: `Login from ${deviceDisplay} at ${locationDisplay}`,
                bodyHtml: `<p>Hello <strong>${name}</strong>,</p>
                  <p>A new login to your gym admin account was detected.</p>
                  
                  <table style="width:100%;border-collapse:collapse;margin:15px 0;background:#f8f9fa;border-radius:6px;">
                    <tr><td style="padding:8px 12px;font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">Time:</td><td style="padding:8px 12px;border-bottom:1px solid #dee2e6;">${loginDetails.timestamp}</td></tr>
                    <tr><td style="padding:8px 12px;font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">Device:</td><td style="padding:8px 12px;border-bottom:1px solid #dee2e6;">${deviceDisplay}</td></tr>
                    <tr><td style="padding:8px 12px;font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">Location:</td><td style="padding:8px 12px;border-bottom:1px solid #dee2e6;">${locationDisplay}</td></tr>
                    <tr><td style="padding:8px 12px;font-weight:bold;color:#495057;">IP Address:</td><td style="padding:8px 12px;">${loginDetails.ip || 'Unknown'}</td></tr>
                  </table>
                  
                  <p><strong>If this was you:</strong> No action needed.</p>
                  <p><strong>If this wasn't you:</strong> Please change your password immediately and contact support.</p>
                  
                  <div style="background:#e3f2fd;padding:12px;border-radius:4px;border-left:4px solid #2196f3;margin:20px 0;">
                    <p style="margin:0;font-size:14px;"><strong>� Security Tip:</strong> Enable two-factor authentication for better security.</p>
                  </div>`,
                action: {
                    label: 'Secure My Account',
                    url: process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/admin-login.html'
                }
            });
            console.log('✅ Login alert sent to:', email);
        } catch (error) {
            console.error('❌ Error sending login alert:', error);
        }
    }
}

module.exports = EmailService;
