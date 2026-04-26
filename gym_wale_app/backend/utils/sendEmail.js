const nodemailer = require('nodemailer');
const { wrapEmail, DEFAULT_BRAND } = require('./emailTemplate');

const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpUser = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER || 'Support@gym-wale.com';
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const senderEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || smtpUser;

// Create transporter only once
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

// Generate simple text version of email content
function generateTextVersion(options) {
  const {
    title = '',
    bodyHtml = '',
    action
  } = options;

  // Strip HTML tags and create simple text version
  let textContent = `${title}\n\n`;
  
  // Simple HTML to text conversion
  const cleanText = bodyHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/td>/gi, ' ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  textContent += cleanText + '\n\n';

  if (action && action.url) {
    textContent += `${action.label}: ${action.url}\n\n`;
  }

  textContent += `\nBest regards,\nGym-Wale Team\n\n`;
  textContent += `© 2025 Gym-Wale. All rights reserved.`;

  return textContent;
}

/**
 * Flexible sendEmail signature supporting legacy and new object form.
 * Legacy: sendEmail(to, subject, html)
 * New: sendEmail({ to, subject, title, preheader, bodyHtml, action, footerNote, brand, html, skipWrap })
 */
async function sendEmail(arg1, subjectLegacy, htmlLegacy) {
  let options = {};
  if (typeof arg1 === 'object' && !Array.isArray(arg1)) {
    options = { ...arg1 };
  } else {
    options = { to: arg1, subject: subjectLegacy, html: htmlLegacy };
  }

  const {
    to,
    subject,
    title = options.title || subject || DEFAULT_BRAND.name,
    preheader = options.preheader || '',
    bodyHtml = options.bodyHtml || options.html || '',
    action,
    footerNote,
    brand,
    skipWrap = false,
    headers = {}
  } = options;

  if (!to) throw new Error('sendEmail: `to` is required');
  if (!subject) throw new Error('sendEmail: `subject` is required');

  // Determine final HTML
  const finalHtml = skipWrap ? bodyHtml : wrapEmail({
    title,
    preheader,
    bodyHtml,
    action,
    footerNote,
    brand
  });

  console.log('[SendEmail] Prepared email', { to, subject, wrapped: !skipWrap });
  console.log('[SendEmail] Sender configured:', !!senderEmail);
  
  // Debug: Log the HTML content length
  console.log('[SendEmail] HTML content length:', finalHtml.length);
  
  // Check if content is too large for Gmail (Gmail clips at ~102KB)
  if (finalHtml.length > 100000) {
    console.warn('[SendEmail] WARNING: Email content is large and may be clipped by Gmail');
  }
  
  // Debug: Log first 200 characters of HTML for verification
  if (finalHtml.length > 200) {
    console.log('[SendEmail] HTML preview:', finalHtml.substring(0, 200) + '...');
  }

  // Generate a simple text version as fallback
  const textContent = generateTextVersion(options);

  try {
    const fromAddress = senderEmail
      ? `${process.env.BRAND_FROM_NAME || DEFAULT_BRAND.name} <${senderEmail}>`
      : process.env.BRAND_FROM_NAME || DEFAULT_BRAND.name;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html: finalHtml,
      text: textContent, // Add text version for better compatibility
      headers: {
        ...headers,
        'X-Priority': '1', // High priority
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'X-Mailer': 'Gym-Wale System'
      }
    };
    
    console.log('[SendEmail] Mail options prepared:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHTML: !!mailOptions.html,
      htmlLength: mailOptions.html.length
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [SendEmail] Email sent to ${to} - Message ID: ${info.messageId}`);
    console.log(`✅ [SendEmail] Accepted: ${info.accepted?.join(', ') || 'N/A'}`);
    console.log(`✅ [SendEmail] Response: ${info.response || 'N/A'}`);
    return info;
  } catch (error) {
    console.error(`❌ [SendEmail] Error sending email to ${to}:`, error);
    throw error;
  }
}

module.exports = sendEmail;
