const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Gym = require('../models/gym');
const sendEmail = require('../utils/sendEmail');

// In-memory store for cash validation requests (in production, use Redis or database)
const cashValidationStore = new Map();

// Create a new cash validation request
const createCashValidation = async (req, res) => {
  try {
    const {
      memberName,
      email,
      phone,
      planName,
      duration,
      amount,
      gymId
    } = req.body;

    // Generate unique validation code
    const validationCode = generateValidationCode();
    
    // Set expiry time (2 minutes from now)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    const validationData = {
      validationCode,
      memberName,
      email,
      phone,
      planName,
      duration,
      amount,
      gymId: gymId || 'default_gym',
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    };

    // Store validation request
    cashValidationStore.set(validationCode, validationData);

    // Auto-expire after 2 minutes
    setTimeout(() => {
      if (cashValidationStore.has(validationCode)) {
        const validation = cashValidationStore.get(validationCode);
        if (validation.status === 'pending') {
          validation.status = 'expired';
          console.log(`💰 Validation ${validationCode} expired`);
        }
      }
    }, 2 * 60 * 1000);

    res.json({
      success: true,
      validationCode,
      expiresAt: expiresAt.toISOString(),
      message: 'Cash validation request created successfully'
    });

    console.log(`💰 Created cash validation: ${validationCode} for ${memberName}`);

  } catch (error) {
    console.error('Error creating cash validation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cash validation request'
    });
  }
};

// Get all pending cash validation requests
const getPendingValidations = async (req, res) => {
  try {
    const pendingValidations = Array.from(cashValidationStore.values())
      .filter(validation => validation.status === 'pending' && new Date() < new Date(validation.expiresAt))
      .map(validation => ({
        ...validation,
        timeLeft: Math.max(0, Math.floor((new Date(validation.expiresAt) - new Date()) / 1000))
      }));

    res.json(pendingValidations);

  } catch (error) {
    console.error('Error fetching pending validations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending validations'
    });
  }
};

// Check validation status
const checkValidationStatus = async (req, res) => {
  try {
    const { validationCode } = req.params;
    
    const validation = cashValidationStore.get(validationCode);
    
    if (!validation) {
      return res.status(404).json({
        success: false,
        error: 'Validation code not found'
      });
    }

    // Check if expired
    if (new Date() > new Date(validation.expiresAt) && validation.status === 'pending') {
      validation.status = 'expired';
    }

    res.json({
      success: true,
      status: validation.status,
      expiresAt: validation.expiresAt,
      timeLeft: Math.max(0, Math.floor((new Date(validation.expiresAt) - new Date()) / 1000))
    });

  } catch (error) {
    console.error('Error checking validation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check validation status'
    });
  }
};

// Confirm cash payment (called by admin)
const confirmCashPayment = async (req, res) => {
  try {
    const { validationCode } = req.params;
    
    const validation = cashValidationStore.get(validationCode);
    
    if (!validation) {
      return res.status(404).json({
        success: false,
        error: 'Validation code not found'
      });
    }

    if (validation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Validation is ${validation.status}, cannot confirm`
      });
    }

    if (new Date() > new Date(validation.expiresAt)) {
      validation.status = 'expired';
      return res.status(400).json({
        success: false,
        error: 'Validation code has expired'
      });
    }

    // Get gym information
    const gym = await Gym.findById(validation.gymId) || await Gym.findOne();
    if (!gym) {
      return res.status(404).json({
        success: false,
        error: 'Gym not found'
      });
    }

    // Create member with confirmed payment
    const memberData = {
      gym: validation.gymId,
      memberName: validation.memberName,
      age: validation.registrationData?.age || 25,
      gender: validation.registrationData?.gender || 'Other',
      phone: validation.phone,
      email: validation.email,
      paymentMode: 'Cash',
      paymentAmount: parseFloat(validation.amount),
      planSelected: validation.planName,
      monthlyPlan: validation.duration,
      activityPreference: validation.registrationData?.activityPreference || 'General fitness',
      address: validation.registrationData?.address || '',
      joinDate: new Date(),
      membershipId: `${(gym.gymName || gym.name || 'GYM').substring(0,3).toUpperCase()}${Date.now()}`,
      paymentStatus: 'paid' // Mark as paid since cash is confirmed
    };

    console.log('💰 Creating confirmed member with data:', memberData);

    const newMember = new Member(memberData);
    await newMember.save();

    // Send welcome email
    try {
      await sendWelcomeEmailForCash(newMember, gym);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail confirmation if email fails
    }

    // Mark validation as confirmed
    validation.status = 'confirmed';
    validation.confirmedAt = new Date();
    validation.memberId = newMember._id;

    res.json({
      success: true,
      message: 'NEW CONTROLLER - Cash payment confirmed and member created successfully',
      member: {
        id: newMember._id,
        membershipId: newMember.membershipId,
        name: newMember.memberName,
        memberName: newMember.memberName,
        email: newMember.email,
        phone: newMember.phone,
        planSelected: newMember.planSelected,
        membershipPlan: newMember.planSelected, // Map to existing field for compatibility
        monthlyPlan: newMember.monthlyPlan,
        duration: newMember.monthlyPlan, // Map to existing field for compatibility
        paymentAmount: newMember.paymentAmount,
        paymentStatus: newMember.paymentStatus,
        joinDate: newMember.joinDate
      },
      gym: {
        name: gym.gymName || gym.name,
        address: gym.address,
        contact: gym.contact
      },
      validation: {
        validationCode: validationCode,
        confirmedAt: new Date(),
        amount: validation.amount,
        planName: validation.planName,
        duration: validation.duration
      }
    });

    console.log(`✅ NEW CONTROLLER - Member created and cash validation confirmed: ${validationCode} for ${validation.memberName}`);

  } catch (error) {
    console.error('Error confirming cash payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm cash payment'
    });
  }
};

// Send welcome email for cash payment confirmation
const sendWelcomeEmailForCash = async (member, gym) => {
  try {
    const subject = `Welcome to ${gym.name}! Your Cash Payment is Confirmed`;
    
    await sendEmail({
      to: member.email,
      subject,
      title: `Welcome to ${gym.name}!`,
      preheader: 'Your cash payment has been confirmed and membership is active',
      bodyHtml: `
        <p>Hello ${member.memberName},</p>
        <p>Great news! Your cash payment has been successfully processed and your gym membership is now <strong style="color:#10b981;">active</strong>.</p>
        
        <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
          <h3 style="margin:0 0 12px;color:#e2e8f0;">Your Membership Details:</h3>
          <table style="width:100%;font-size:13px;">
            <tr><td style="padding:4px 0;color:#94a3b8;width:120px;"><strong>Member ID:</strong></td><td style="padding:4px 0;">${member.membershipId}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8;"><strong>Name:</strong></td><td style="padding:4px 0;">${member.memberName}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8;"><strong>Plan:</strong></td><td style="padding:4px 0;">${member.planSelected}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8;"><strong>Duration:</strong></td><td style="padding:4px 0;">${member.monthlyPlan} Month(s)</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8;"><strong>Payment:</strong></td><td style="padding:4px 0;">₹${member.paymentAmount} (Cash)</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8;"><strong>Status:</strong></td><td style="padding:4px 0;"><span style="background:#10b981;color:#ffffff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">ACTIVE</span></td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8;"><strong>Join Date:</strong></td><td style="padding:4px 0;">${new Date(member.joinDate).toLocaleDateString()}</td></tr>
          </table>
        </div>
        
        <h3 style="margin:20px 0 8px;">Next Steps:</h3>
        <ul style="margin:0 0 18px 20px;padding:0;">
          <li>Visit the gym with a valid ID</li>
          <li>Your Member ID: <strong>${member.membershipId}</strong></li>
          <li>Start your fitness journey today!</li>
        </ul>
        
        <p style="margin-top:20px;font-size:13px;color:#94a3b8;"><strong>${gym.name}</strong><br/>
        ${gym.address}<br/>
        Contact: ${gym.contact}</p>
        <p>Welcome to your fitness family! 💪</p>
      `,
      action: {
        label: 'Contact Gym',
        url: `tel:${gym.contact}` 
      }
    });
    console.log(`✅ Welcome email sent to ${member.email}`);
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Reject cash payment
const rejectCashPayment = async (req, res) => {
  try {
    const { validationCode } = req.params;
    
    const validation = cashValidationStore.get(validationCode);
    
    if (!validation) {
      return res.status(404).json({
        success: false,
        error: 'Validation code not found'
      });
    }

    if (validation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Validation is ${validation.status}, cannot reject`
      });
    }

    // Mark as rejected
    validation.status = 'rejected';
    validation.rejectedAt = new Date();

    res.json({
      success: true,
      message: 'Cash payment rejected successfully'
    });

    console.log(`💰 Rejected cash validation: ${validationCode} for ${validation.memberName}`);

  } catch (error) {
    console.error('Error rejecting cash payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject cash payment'
    });
  }
};

// Generate unique validation code
function generateValidationCode() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CV${timestamp.substr(-6)}${random}`;
}

// Helper function to create cash validation request programmatically (for use by other controllers)
const createCashValidationRequest = (validationData) => {
  const validationCode = generateValidationCode();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  const fullValidationData = {
    ...validationData,
    validationCode,
    status: 'pending',
    createdAt: new Date(),
    expiresAt
  };

  cashValidationStore.set(validationCode, fullValidationData);

  // Set up automatic expiry cleanup
  setTimeout(() => {
    const validation = cashValidationStore.get(validationCode);
    if (validation && validation.status === 'pending') {
      validation.status = 'expired';
      console.log(`💰 Validation ${validationCode} expired`);
    }
  }, 2 * 60 * 1000);

  console.log(`💰 Created cash validation: ${validationCode} for ${validationData.memberName}`);
  
  return { validationCode, expiresAt };
};

// Cleanup expired validations periodically
const cleanupExpiredValidations = () => {
  const now = new Date();
  for (const [code, validation] of cashValidationStore.entries()) {
    if (now > new Date(validation.expiresAt) && validation.status === 'pending') {
      validation.status = 'expired';
      // Remove after 1 hour to keep some history
      setTimeout(() => {
        cashValidationStore.delete(code);
      }, 60 * 60 * 1000);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredValidations, 5 * 60 * 1000);

module.exports = {
  createCashValidation,
  createCashValidationRequest,
  getPendingValidations,
  checkValidationStatus,
  confirmCashPayment,
  rejectCashPayment,
  cleanupExpiredValidations
};
