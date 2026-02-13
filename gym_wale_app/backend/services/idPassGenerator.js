const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class IDPassGenerator {
  /**
   * Generate a professional ID Pass for a gym member
   * @param {Object} memberData - Member information
   * @param {String} outputPath - Path to save the PDF
   * @returns {Promise<String>} - Path to generated PDF
   */
  static async generatePass(memberData, outputPath) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create PDF document (ID card size: 85.6mm x 53.98mm or 242.65 x 153 points)
        const doc = new PDFDocument({
          size: [340, 215], // Slightly larger for better readability
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        // Create write stream
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Background gradient (Professional blue-to-dark gradient)
        doc.rect(0, 0, 340, 215)
           .fill('#0a1929');

        // Top accent bar with Gym-Wale branding color
        doc.rect(0, 0, 340, 50)
           .fill('#f44336');

        // Gym-Wale Logo/Branding Area
        doc.fontSize(20)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text('Gym', 20, 15, { continued: true })
           .fillColor('#ffeb3b')
           .text('-Wale', { continued: false });

        // Tagline
        doc.fontSize(8)
           .fillColor('#ffffff')
           .font('Helvetica')
           .text('Your Fitness Partner', 20, 37);

        // Member ID Badge
        doc.roundedRect(220, 10, 110, 30, 5)
           .fill('#1e293b');
        
        doc.fontSize(7)
           .fillColor('#94a3b8')
           .font('Helvetica')
           .text('MEMBER ID', 230, 15);
        
        doc.fontSize(11)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(memberData.membershipId || 'N/A', 230, 27, { width: 90, align: 'left' });

        // Profile Picture Section (Left side)
        const imageX = 20;
        const imageY = 60;
        const imageSize = 80;

        // Profile photo border (Professional frame)
        doc.roundedRect(imageX - 3, imageY - 3, imageSize + 6, imageSize + 6, 8)
           .fill('#475569');

        // Try to add profile image
        try {
          if (memberData.profileImage && fs.existsSync(memberData.profileImage)) {
            doc.image(memberData.profileImage, imageX, imageY, {
              width: imageSize,
              height: imageSize,
              fit: [imageSize, imageSize],
              align: 'center',
              valign: 'center'
            });
          } else {
            // Default avatar placeholder
            doc.roundedRect(imageX, imageY, imageSize, imageSize, 5)
               .fill('#334155');
            
            doc.fontSize(40)
               .fillColor('#64748b')
               .font('Helvetica-Bold')
               .text(memberData.memberName ? memberData.memberName.charAt(0).toUpperCase() : '?', 
                     imageX, imageY + 20, { width: imageSize, align: 'center' });
          }
        } catch (err) {
          console.error('Error adding profile image:', err);
          // Fallback placeholder
          doc.roundedRect(imageX, imageY, imageSize, imageSize, 5)
             .fill('#334155');
        }

        // Member Information Section (Right side)
        const infoX = 115;
        let infoY = 65;

        // Member Name (Prominent)
        doc.fontSize(14)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(memberData.memberName || 'N/A', infoX, infoY, { width: 200 });

        infoY += 25;

        // Membership Plan Badge
        doc.roundedRect(infoX, infoY, 80, 18, 4)
           .fill('#22c55e');
        
        doc.fontSize(9)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(memberData.planSelected || 'Basic', infoX + 5, infoY + 4, { width: 70, align: 'center' });

        // Membership Duration
        doc.roundedRect(infoX + 85, infoY, 60, 18, 4)
           .fill('#3b82f6');
        
        doc.fontSize(9)
           .fillColor('#ffffff')
           .text(memberData.monthlyPlan || '1 Month', infoX + 90, infoY + 4, { width: 50, align: 'center' });

        infoY += 28;

        // Contact Information (Compact)
        const detailsData = [
          { icon: '📧', label: 'Email', value: memberData.email || 'N/A' },
          { icon: '📱', label: 'Phone', value: memberData.phone || 'N/A' },
          { icon: '🏋️', label: 'Activity', value: memberData.activityPreference || 'General' },
        ];

        doc.fontSize(8)
           .fillColor('#94a3b8')
           .font('Helvetica');

        detailsData.forEach((detail, index) => {
          const y = infoY + (index * 12);
          doc.fillColor('#64748b')
             .text(detail.icon, infoX, y)
             .fillColor('#cbd5e1')
             .text(detail.value, infoX + 15, y, { width: 200, ellipsis: true });
        });

        infoY += 48;

        // Validity Information Bar
        doc.roundedRect(115, 155, 205, 45, 6)
           .fill('#1e293b');

        // Valid From
        doc.fontSize(7)
           .fillColor('#94a3b8')
           .font('Helvetica')
           .text('VALID FROM', 125, 162);
        
        const joinDate = memberData.joinDate ? new Date(memberData.joinDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) : 'N/A';
        
        doc.fontSize(9)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(joinDate, 125, 173);

        // Valid Until
        doc.fontSize(7)
           .fillColor('#94a3b8')
           .font('Helvetica')
           .text('VALID UNTIL', 220, 162);
        
        const validUntil = memberData.membershipValidUntil ? new Date(memberData.membershipValidUntil).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }) : 'N/A';
        
        doc.fontSize(9)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(validUntil, 220, 173);

        // Status Indicator
        const isActive = memberData.isActive !== undefined ? memberData.isActive : true;
        const statusColor = isActive ? '#22c55e' : '#ef4444';
        const statusText = isActive ? 'ACTIVE' : 'EXPIRED';
        
        doc.fontSize(7)
           .fillColor('#94a3b8')
           .font('Helvetica')
           .text('STATUS', 125, 188);
        
        doc.roundedRect(167, 186, 45, 12, 3)
           .fill(statusColor);
        
        doc.fontSize(8)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(statusText, 172, 189);

        // Gym Information (if available)
        if (memberData.gym && memberData.gym.name) {
          doc.fontSize(7)
             .fillColor('#94a3b8')
             .font('Helvetica')
             .text('GYM', 230, 188);
          
          doc.fontSize(8)
             .fillColor('#ffffff')
             .font('Helvetica')
             .text(memberData.gym.name, 255, 188, { width: 60, ellipsis: true });
        }

        // QR Code Section (Bottom Left)
        const qrData = JSON.stringify({
          memberId: memberData.membershipId || 'N/A',
          name: memberData.memberName || 'N/A',
          email: memberData.email || 'N/A',
          phone: memberData.phone || 'N/A',
          plan: memberData.planSelected || 'Basic',
          duration: memberData.monthlyPlan || '1 Month',
          validUntil: memberData.membershipValidUntil || 'N/A',
          isActive: isActive,
          gymId: memberData.gym?._id || 'N/A',
          generatedAt: new Date().toISOString(),
          type: 'gym-wale-member-pass'
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 1,
          margin: 1,
          width: 200,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        // QR Code background
        doc.roundedRect(15, 150, 90, 50, 6)
           .fill('#ffffff');

        // Add QR code
        const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, 20, 155, { width: 40, height: 40 });

        // QR Code Label
        doc.fontSize(6)
           .fillColor('#475569')
           .font('Helvetica-Bold')
           .text('SCAN FOR', 65, 162, { width: 35, align: 'center' })
           .text('MEMBER INFO', 65, 170, { width: 35, align: 'center' });

        // Security watermark
        doc.fontSize(6)
           .fillColor('#1e293b')
           .font('Helvetica')
           .text('GYM-WALE VERIFIED', 65, 185, { width: 35, align: 'center' });

        // Footer note
        doc.fontSize(5)
           .fillColor('#475569')
           .font('Helvetica')
           .text('This is a digital member pass. Please carry it during gym visits.', 10, 207, { 
             width: 320, 
             align: 'center' 
           });

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          console.log('✅ ID Pass generated successfully:', outputPath);
          resolve(outputPath);
        });

        stream.on('error', (err) => {
          console.error('❌ Error writing PDF:', err);
          reject(err);
        });

      } catch (error) {
        console.error('❌ Error generating ID pass:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate QR Code data URL for member
   * @param {Object} memberData - Member information
   * @returns {Promise<String>} - QR code data URL
   */
  static async generateQRCode(memberData) {
    try {
      const isActive = memberData.isActive !== undefined ? memberData.isActive : true;
      
      const qrData = JSON.stringify({
        memberId: memberData.membershipId || 'N/A',
        name: memberData.memberName || 'N/A',
        email: memberData.email || 'N/A',
        phone: memberData.phone || 'N/A',
        plan: memberData.planSelected || 'Basic',
        duration: memberData.monthlyPlan || '1 Month',
        validUntil: memberData.membershipValidUntil || 'N/A',
        isActive: isActive,
        gymId: memberData.gym?._id || 'N/A',
        generatedAt: new Date().toISOString(),
        type: 'gym-wale-member-pass'
      });

      return await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 1,
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Generate unique pass ID for member
   * @returns {String} - Unique pass ID
   */
  static generatePassId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GW-${timestamp}-${randomStr}`;
  }
}

module.exports = IDPassGenerator;
