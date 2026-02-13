// Test email template with logo
const { wrapEmail } = require('./utils/emailTemplate');
const sendEmail = require('./utils/sendEmail');

// Test function to verify logo displays
async function testEmailWithLogo() {
  try {
    const testEmail = await sendEmail({
      to: 'test@example.com', // Replace with your test email
      subject: 'Logo Test - Gym-Wale',
      title: 'Logo Display Test',
      preheader: 'Testing if logo appears correctly',
      bodyHtml: `
        <p>Hi there,</p>
        <p>This is a test email to verify that the Gym-Wale logo displays correctly.</p>
        <p>If you can see the logo in the header, the fix is working! ✅</p>
      `,
      action: {
        label: 'Visit Website',
        url: 'https://gym-wale.com'
      }
    });
    
    console.log('✅ Test email sent successfully!');
    return testEmail;
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    throw error;
  }
}

module.exports = { testEmailWithLogo };