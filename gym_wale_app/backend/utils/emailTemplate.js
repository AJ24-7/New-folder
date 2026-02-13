// Unified Gym-Wale branded email template utility
// Provides a single wrapper for all outgoing HTML emails.
// Supports dark-mode friendly colors and mobile responsiveness.

const { getBase64Logo } = require('./logoUtils');
const path = require('path');

const DEFAULT_BRAND = {
  name: process.env.BRAND_NAME || 'Gym-Wale',
  portalUrl: process.env.BRAND_PORTAL_URL || 'https://gym-wale.example',
  supportUrl: process.env.BRAND_SUPPORT_URL || 'https://gym-wale.example/support',
  primary: process.env.BRAND_PRIMARY_COLOR || '#0d4d89',
  accent: process.env.BRAND_ACCENT_COLOR || '#38bdf8',
  bg: '#0a0f1e',
  cardBg: '#142036',
  // Try to use local logo file, fallback to placeholder
  logo: (() => {
    // First, check if a hosted logo URL is provided via environment variable
    if (process.env.BRAND_LOGO_URL && process.env.BRAND_LOGO_URL.startsWith('http')) {
      return process.env.BRAND_LOGO_URL;
    }
    
    try {
      // Try different possible logo paths
      const possibleLogoPaths = [
        path.join(__dirname, '../../frontend/gymadmin/public/Gym-Wale.png'),
        path.join(__dirname, '../../uploads/gym-logos/Gym-Wale.png'),
        path.join(__dirname, '../../frontend/public/Gym-Wale.png'),
        path.join(__dirname, '../assets/Gym-Wale.png')
      ];
      
      for (const logoPath of possibleLogoPaths) {
        try {
          return getBase64Logo(logoPath);
        } catch (error) {
          continue;
        }
      }
      
      // If no local logo found, return fallback SVG
      return getBase64Logo(null);
    } catch (error) {
      console.warn('Could not load Gym-Wale logo, using fallback');
      return getBase64Logo(null);
    }
  })(),
  emailFromName: process.env.BRAND_FROM_NAME || 'Gym-Wale Team'
};

// Escape minimal HTML to avoid accidental injection in simple text props
const escapeHtml = (str = '') => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Wrap provided bodyHtml inside branded email layout.
 * Optimized for Gmail compatibility to prevent message clipping
 * @param {Object} opts
 * @param {String} opts.title - Heading title displayed near logo
 * @param {String} opts.preheader - Hidden preheader text for inbox preview
 * @param {String} opts.bodyHtml - Main inner HTML (already sanitized / trusted)
 * @param {Object} [opts.action] - Optional CTA button { label, url }
 * @param {String} [opts.footerNote] - Custom footer note override
 * @param {Object} [opts.brand] - Brand override object
 * @param {Boolean} [opts.minimal] - If true, reduces chrome
 */
function wrapEmail(opts = {}) {
  const {
    title = DEFAULT_BRAND.name,
    preheader = '',
    bodyHtml = '',
    action,
    footerNote,
    brand = {},
    minimal = false
  } = opts;

  const b = { ...DEFAULT_BRAND, ...brand };
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader).slice(0, 150); // Shorter preheader

  const actionButton = action && action.url && action.label ? `
    <tr>
      <td style="padding:20px 0;text-align:center;">
        <a href="${action.url}" style="background:${b.accent};color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;display:inline-block;">
          ${escapeHtml(action.label)}
        </a>
      </td>
    </tr>` : '';

  const effectiveFooterNote = footerNote || `This is an automated message from ${b.name}.`;

  // Simplified, Gmail-optimized template (under 102KB)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;color:#333333;">
<div style="display:none;font-size:1px;color:transparent;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f4;">
<tr>
<td align="center" style="padding:20px 15px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
<tr>
<td style="padding:30px 40px 20px;text-align:center;background:linear-gradient(135deg,${b.primary} 0%,${b.accent} 100%);border-radius:8px 8px 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="text-align:center;">
<div style="display:inline-block;background:rgba(255,255,255,0.2);padding:8px;border-radius:8px;margin-bottom:10px;">
<div style="width:40px;height:40px;background:${b.accent};border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:16px;">GW</div>
</div>
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${b.name}</h1>
<p style="margin:5px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${minimal ? '' : 'Fitness Management Platform'}</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:30px 40px;">
<h2 style="margin:0 0 20px;color:#333;font-size:20px;font-weight:600;">${safeTitle}</h2>
<div style="color:#555;font-size:15px;line-height:1.6;">
${bodyHtml}
</div>
${actionButton}
</td>
</tr>
<tr>
<td style="padding:20px 40px;background-color:#f8f9fa;border-radius:0 0 8px 8px;border-top:1px solid #dee2e6;">
<p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">${effectiveFooterNote}</p>
<p style="margin:8px 0 0;color:#6c757d;font-size:12px;text-align:center;">© 2025 ${b.name}. All rights reserved.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

module.exports = { wrapEmail, DEFAULT_BRAND };
