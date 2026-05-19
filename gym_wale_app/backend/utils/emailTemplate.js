// Unified Gym-Wale branded email template utility
// Provides a single wrapper for all outgoing HTML emails.
// Supports dark-mode friendly colors and mobile responsiveness.
//
// IMPORTANT: Never embed large local images (PNG/JPEG) as base64 in email HTML.
// Gmail clips emails > 102KB. Use BRAND_LOGO_URL (hosted) or the inline SVG fallback.

// Compact inline SVG dumbbell logo (~500 bytes) used when no hosted URL is set.
// This keeps every email well under Gmail's 102KB clipping threshold.
const INLINE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#0d4d89"/>
  <rect x="28" y="10" width="8" height="44" rx="4" fill="white" opacity="0.9"/>
  <rect x="10" y="22" width="44" height="8" rx="4" fill="white" opacity="0.85"/>
  <rect x="8" y="18" width="10" height="16" rx="5" fill="white"/>
  <rect x="46" y="18" width="10" height="16" rx="5" fill="white"/>
  <rect x="8" y="30" width="10" height="16" rx="5" fill="white"/>
  <rect x="46" y="30" width="10" height="16" rx="5" fill="white"/>
</svg>`;

const DEFAULT_BRAND = {
  name: process.env.BRAND_NAME || 'Gym-Wale',
  portalUrl: process.env.BRAND_PORTAL_URL || 'https://gym-wale.example',
  supportUrl: process.env.BRAND_SUPPORT_URL || 'https://gym-wale.example/support',
  primary: process.env.BRAND_PRIMARY_COLOR || '#0d4d89',
  accent: process.env.BRAND_ACCENT_COLOR || '#38bdf8',
  bg: '#0a0f1e',
  cardBg: '#142036',
  // Use a hosted URL (set BRAND_LOGO_URL env var to an https:// URL) for the best
  // cross-client experience. Falls back to a compact inline SVG that keeps the
  // email well under Gmail's 102KB clip limit.
  logo: (process.env.BRAND_LOGO_URL && process.env.BRAND_LOGO_URL.startsWith('http'))
    ? process.env.BRAND_LOGO_URL
    : `data:image/svg+xml;base64,${Buffer.from(INLINE_LOGO_SVG).toString('base64')}`,
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

  // Gmail-safe template — kept under 102 KB. No base64-embedded images.
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
<div style="display:inline-block;margin-bottom:12px;">
<img src="${b.logo}" alt="${b.name}" width="64" height="64" style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto;" />
</div>
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">${b.name}</h1>
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
