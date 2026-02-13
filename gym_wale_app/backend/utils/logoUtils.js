// Logo embedding utility for emails
const fs = require('fs');
const path = require('path');

/**
 * Convert local image to base64 data URL for email embedding
 * @param {string} imagePath - Path to local image file
 * @returns {string} - Base64 data URL
 */
function getBase64Logo(imagePath) {
  try {
    if (!imagePath || !fs.existsSync(imagePath)) {
      console.log(`Logo file not found at: ${imagePath}, using fallback SVG`);
      // Return an enhanced SVG logo as fallback
      const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
        <defs>
          <linearGradient id="gymGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0d4d89;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#38bdf8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="56" height="56" rx="16" fill="url(#gymGradient)"/>
        <circle cx="28" cy="20" r="6" fill="white" opacity="0.9"/>
        <rect x="20" y="30" width="16" height="4" rx="2" fill="white" opacity="0.9"/>
        <rect x="22" y="37" width="12" height="3" rx="1.5" fill="white" opacity="0.8"/>
        <text x="28" y="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8" font-weight="bold" opacity="0.9">GYM-WALE</text>
      </svg>`;
      return `data:image/svg+xml;base64,${Buffer.from(svgLogo).toString('base64')}`;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const imageExt = path.extname(imagePath).slice(1).toLowerCase();
    const mimeType = imageExt === 'png' ? 'image/png' : 
                     imageExt === 'jpg' || imageExt === 'jpeg' ? 'image/jpeg' :
                     imageExt === 'svg' ? 'image/svg+xml' : 'image/png';
    
    console.log(`Successfully loaded logo from: ${imagePath}`);
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting logo to base64:', error);
    // Enhanced fallback SVG with gym theme
    const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <defs>
        <linearGradient id="gymGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0d4d89;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#38bdf8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="16" fill="url(#gymGradient)"/>
      <circle cx="28" cy="20" r="6" fill="white" opacity="0.9"/>
      <rect x="20" y="30" width="16" height="4" rx="2" fill="white" opacity="0.9"/>
      <rect x="22" y="37" width="12" height="3" rx="1.5" fill="white" opacity="0.8"/>
      <text x="28" y="48" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8" font-weight="bold" opacity="0.9">GYM-WALE</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svgLogo).toString('base64')}`;
  }
}

module.exports = { getBase64Logo };