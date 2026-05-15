const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Gym = require('../models/gym');
const sendEmail = require('../utils/sendEmail');

// In-memory store for cash validation requests (in production, use Redis or database)
const cashValidationStore = new Map();

function generateStandardMembershipId(gymName, planSelected) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gymShort = (gymName || 'GYM').replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
  const planShort = (planSelected || 'PLAN').replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
  return `${gymShort}-${ym}-${planShort}-${random}`;
}

async function createPaymentNotification(gymId, paymentData) {
  try {
    const notification = {
      user: gymId,
      title: '💰 Cash Payment Confirmed',
      message: `₹${Number(paymentData.amount || 0).toLocaleString('en-IN')} received from ${paymentData.memberName || 'Member'} via cash validation`,
      type: 'payment',
      priority: 'normal',
      read: false,
      isRead: false,
      metadata: {
        paymentId: paymentData._id,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        registrationSource: paymentData.registrationSource,
        memberName: paymentData.memberName,
        memberId: paymentData.memberId,
        category: paymentData.category
      }
    };

    const Notification = require('../models/Notification');
    await new Notification(notification).save();
  } catch (error) {
    console.error('❌ Error creating cash payment notification:', error.message);
  }
}

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

    let member = null;
    const existingMemberId = validation.registrationData?.memberId;

    if (existingMemberId) {
      member = await Member.findOne({
        _id: existingMemberId,
        gym: validation.gymId,
      });
    }

    if (member) {
      member.memberName = validation.memberName || member.memberName;
      member.phone = validation.phone || member.phone;
      member.email = validation.email || member.email;
      member.planSelected = validation.planName || member.planSelected;
      member.monthlyPlan = validation.duration || member.monthlyPlan;
      member.paymentMode = 'Cash';
      member.paymentAmount = parseFloat(validation.amount) || member.paymentAmount;
      member.paymentStatus = 'paid';
      member.activityPreference =
        validation.registrationData?.activityPreference || member.activityPreference || 'General fitness';
      member.address = validation.registrationData?.address || member.address || '';
      if (validation.registrationData?.profileImageUrl) {
        member.profileImage = validation.registrationData.profileImageUrl;
      }

      if (!member.membershipId) {
        member.membershipId = generateStandardMembershipId(
          gym.gymName || gym.name || 'GYM',
          validation.planName || member.planSelected || 'PLAN'
        );
      }

      await member.save();
      console.log(`✅ Confirmed cash payment for existing pending member: ${member._id}`);
    } else {
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
        profileImage: validation.registrationData?.profileImageUrl || '',
        joinDate: new Date(),
        membershipId: generateStandardMembershipId(
          gym.gymName || gym.name || 'GYM',
          validation.planName || 'PLAN'
        ),
        paymentStatus: 'paid'
      };

      console.log('💰 Creating confirmed member with data:', memberData);

      member = new Member(memberData);
      await member.save();
      console.log(`✅ Created new member during cash confirm fallback: ${member._id}`);
    }

    const paymentAmount = Number(validation.amount || 0);
    const resolvedGymId = gym?._id || validation.gymId;
    const createdBy = (req.admin && (req.admin.id || req.admin._id)) || resolvedGymId;

    // Create payment entry so dashboard stats include this confirmation.
    let paymentRecord = null;
    try {
      paymentRecord = await new Payment({
        gymId: resolvedGymId,
        type: 'received',
        category: 'membership',
        amount: paymentAmount,
        description: `Cash validation payment - ${validation.planName || member.planSelected || 'Membership Plan'}`,
        memberName: member.memberName,
        memberId: member._id,
        paymentMethod: 'cash',
        status: 'completed',
        registrationSource: 'cash_validation',
        planSelected: validation.planName || member.planSelected,
        monthlyPlan: validation.duration || member.monthlyPlan,
        transactionId: validation.validationCode,
        paidDate: new Date(),
        createdBy
      }).save();

      await createPaymentNotification(resolvedGymId, paymentRecord);
      console.log('✅ Payment record created for cash confirmation:', paymentRecord._id);
    } catch (paymentError) {
      console.error('❌ Failed to create payment record for cash confirmation:', paymentError);
    }

    // Send welcome email
    try {
      await sendWelcomeEmailForCash(member, gym);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail confirmation if email fails
    }

    // Mark validation as confirmed
    validation.status = 'confirmed';
    validation.confirmedAt = new Date();
    validation.memberId = member._id;

    res.json({
      success: true,
      message: 'Cash payment confirmed and member updated successfully',
      member: {
        id: member._id,
        membershipId: member.membershipId,
        name: member.memberName,
        memberName: member.memberName,
        email: member.email,
        phone: member.phone,
        planSelected: member.planSelected,
        membershipPlan: member.planSelected,
        monthlyPlan: member.monthlyPlan,
        duration: member.monthlyPlan,
        paymentAmount: member.paymentAmount,
        paymentStatus: member.paymentStatus,
        joinDate: member.joinDate
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
      },
      payment: paymentRecord
        ? {
            id: paymentRecord._id,
            amount: paymentRecord.amount,
            status: paymentRecord.status,
            type: paymentRecord.type
          }
        : null
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
    const gymName = gym.gymName || gym.name || 'Gym Wale';
    const memberName = member.memberName || 'Member';
    const membershipId = member.membershipId || '';
    const planSelected = member.planSelected || '';
    const monthlyPlan = member.monthlyPlan || '';
    const membershipValidUntil = member.membershipValidUntil
      ? new Date(member.membershipValidUntil).toLocaleDateString()
      : 'N/A';
    const joinDate = member.joinDate
      ? new Date(member.joinDate).toLocaleDateString()
      : new Date().toLocaleDateString();

    await sendEmail({
      to: member.email,
      subject: `Welcome to ${gymName} - Your Membership is Active!`,
      title: `Welcome to ${gymName}!`,
      preheader: 'Your cash payment is confirmed and membership is now active',
      bodyHtml: `
        <p>Hi <strong style="color:#10b981;">${memberName}</strong>,</p>
        <p>🎉 Welcome to <strong>${gymName}</strong>! Your cash payment has been confirmed by the gym admin and your membership is now <strong style="color:#10b981;">active</strong>.</p>

        <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
          <h3 style="color:#38bdf8;margin:0 0 14px 0;font-size:15px;">📋 Membership Details</h3>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#94a3b8;width:150px;vertical-align:top;"><strong>Membership ID:</strong></td>
              <td style="padding:8px 0;"><span style="background:#0d4d89;color:#ffffff;padding:4px 12px;border-radius:6px;font-weight:700;letter-spacing:1px;font-size:12px;">${membershipId}</span></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;vertical-align:top;"><strong>Member Name:</strong></td>
              <td style="padding:8px 0;color:#f1f5f9;">${memberName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;vertical-align:top;"><strong>Plan:</strong></td>
              <td style="padding:8px 0;color:#f1f5f9;">${planSelected} &bull; ${monthlyPlan} month(s)</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;vertical-align:top;"><strong>Amount Paid:</strong></td>
              <td style="padding:8px 0;color:#f1f5f9;">&#8377;${Number(member.paymentAmount || 0).toLocaleString('en-IN')} <span style="color:#10b981;font-weight:600;">(Cash &mdash; Confirmed ✓)</span></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;vertical-align:top;"><strong>Join Date:</strong></td>
              <td style="padding:8px 0;color:#f1f5f9;">${joinDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;vertical-align:top;"><strong>Valid Until:</strong></td>
              <td style="padding:8px 0;color:#f1f5f9;">${membershipValidUntil}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;vertical-align:top;"><strong>Status:</strong></td>
              <td style="padding:8px 0;"><span style="background:#10b981;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:0.5px;">ACTIVE</span></td>
            </tr>
          </table>
        </div>

        <div style="background:#0d2137;border:1px solid #1e3a5f;padding:14px 18px;border-radius:10px;margin:18px 0;">
          <h3 style="color:#38bdf8;margin:0 0 8px 0;font-size:14px;">📍 Gym Contact</h3>
          <p style="margin:4px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#94a3b8;">Gym:</strong> ${gymName}</p>
          ${gym.address ? `<p style="margin:4px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#94a3b8;">Address:</strong> ${gym.address}</p>` : ''}
          ${gym.contact ? `<p style="margin:4px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#94a3b8;">Contact:</strong> ${gym.contact}</p>` : ''}
          ${gym.email ? `<p style="margin:4px 0;color:#cbd5e1;font-size:13px;"><strong style="color:#94a3b8;">Email:</strong> ${gym.email}</p>` : ''}
        </div>

        <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;line-height:1.6;">
          We're excited to have you on board! Show this email at the gym counter as proof of membership.<br>
          <strong style="color:#10b981;">Let's crush those fitness goals together! 💪</strong>
        </p>
      `,
      action: {
        label: 'Contact Gym',
        url: gym.contact ? `tel:${gym.contact}` : (gym.email ? `mailto:${gym.email}` : '#')
      },
      footerNote: `This email was sent because you registered as a new member at ${gymName} via cash payment.`
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
