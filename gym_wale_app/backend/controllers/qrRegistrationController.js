const QRCode = require('../models/QRCode');
const Member = require('../models/Member');
const Gym = require('../models/gym');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Coupon = require('../models/Coupon');
const sendEmail = require('../utils/sendEmail');
const gymNotificationService = require('../services/gymNotificationService');
const fcmService = require('../services/fcmService');

// Import cash validation functions
const { createCashValidationRequest } = require('./cashValidationController');

function generateStandardMembershipId(gymName, planSelected) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gymShort = (gymName || 'GYM').replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
  const planShort = (planSelected || 'PLAN').replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
  return `${gymShort}-${ym}-${planShort}-${random}`;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').trim();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseActivityList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch (error) {
      // Not JSON, continue with CSV fallback.
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function parseObjectValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}

function resolveProfileImageUrl(req) {
  if (req.file && req.file.path) {
    return req.file.path;
  }

  const bodyProfileImage = String(req.body?.profileImage || '').trim();
  if (/^https:\/\//i.test(bodyProfileImage)) {
    return bodyProfileImage;
  }

  return '';
}

async function findExistingMemberByIdentity(gymId, phone, email) {
  const conditions = [];

  if (phone) {
    conditions.push({ phone });
  }

  if (email) {
    conditions.push({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') });
  }

  if (conditions.length === 0) {
    return null;
  }

  return Member.findOne({
    gym: gymId,
    $or: conditions
  });
}

// Register member via QR code
const registerMemberViaQR = async (req, res) => {
  try {
    const {
      memberName,
      email,
      phone,
      age,
      gender,
      address,
      activityPreference,
      planSelected,
      monthlyPlan,
      paymentAmount,
      paymentMode,
      gymId,
      qrToken,
      registrationType,
      specialOffer,
      // Legacy field names for backward compatibility
      firstName,
      lastName,
      selectedPlan
    } = req.body;

    console.log('=== QR REGISTRATION REQUEST ===');
    console.log('Request body:', req.body);

    // Use memberName if provided, otherwise combine firstName and lastName
    const finalMemberName = memberName || (firstName && lastName ? `${firstName} ${lastName}` : '');
    const finalPlanSelected = planSelected || selectedPlan || '';

    // Validate required fields
    if (!finalMemberName || !email || !phone || !age || !gender || !activityPreference || !finalPlanSelected || !monthlyPlan || !paymentAmount || !paymentMode) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['memberName', 'email', 'phone', 'age', 'gender', 'activityPreference', 'planSelected', 'monthlyPlan', 'paymentAmount', 'paymentMode']
      });
    }

    // Validate QR code
    console.log('=== QR VALIDATION DEBUG ===');
    console.log('Received QR token:', qrToken);
    console.log('Received gym ID:', gymId);
    console.log('Token type:', typeof qrToken);
    console.log('Gym ID type:', typeof gymId);
    
    const qrCode = await QRCode.getValidQRCode(qrToken);
    console.log('QR code query result:', qrCode ? 'FOUND' : 'NOT FOUND');
    
    if (!qrCode) {
      // Let's also try to find ANY QR code with this token (even expired/inactive)
      const anyQRCode = await QRCode.findOne({ token: qrToken });
      console.log('Any QR code with token (including expired):', anyQRCode ? 'EXISTS' : 'DOES NOT EXIST');
      
      if (anyQRCode) {
        console.log('Found QR code details:');
        console.log('- ID:', anyQRCode._id);
        console.log('- Token:', anyQRCode.token);
        console.log('- Gym ID:', anyQRCode.gymId);
        console.log('- Is Active:', anyQRCode.isActive);
        console.log('- Expiry Date:', anyQRCode.expiryDate);
        console.log('- Usage Count:', anyQRCode.usageCount);
        console.log('- Usage Limit:', anyQRCode.usageLimit);
        console.log('- Current Time:', new Date());
        console.log('- Is Expired:', new Date() > anyQRCode.expiryDate);
      }
      
      console.log('QR code not found or invalid:', qrToken);
      return res.status(400).json({ 
        message: 'Invalid or expired QR code' 
      });
    }
    
    console.log('QR code found:', qrCode._id, 'for gym:', qrCode.gymId._id.toString());
    
    // Handle both ObjectId and string comparisons
    const qrGymId = qrCode.gymId._id ? qrCode.gymId._id.toString() : qrCode.gymId.toString();
    const providedGymId = gymId.toString();
    
    if (qrGymId !== providedGymId) {
      console.log('Gym ID mismatch. QR gym:', qrGymId, 'Provided gym:', providedGymId);
      return res.status(400).json({ 
        message: 'QR code is not valid for this gym' 
      });
    }

    // Check if email already exists for this gym
    const existingMember = await Member.findOne({ email, gym: gymId });
    if (existingMember) {
      return res.status(400).json({ 
        message: 'A member with this email already exists' 
      });
    }

    // Get gym details
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Calculate membership dates based on registration type
    let membershipStartDate = new Date();
    let membershipEndDate = new Date();
    let membershipStatus = 'pending'; // Will be 'active' after payment
    
    if (registrationType === 'trial') {
      membershipEndDate.setDate(membershipEndDate.getDate() + 3);
      membershipStatus = 'trial';
    } else {
      membershipEndDate.setMonth(membershipEndDate.getMonth() + 1);
    }

    // Create member record with correct field names for Member schema
    console.log('=== PAYMENT MODE CHECK ===');
    console.log('Payment mode:', paymentMode);
    console.log('Registration type:', registrationType);

    // For cash payments (except trials), create cash validation instead of member
    if (paymentMode === 'cash' && registrationType !== 'trial') {
      console.log('💰 Cash payment detected - creating cash validation request');
      
      // Create cash validation request using the dedicated system
      const validationData = {
        memberName: finalMemberName,
        email,
        phone,
        planName: finalPlanSelected,
        duration: monthlyPlan,
        amount: paymentAmount,
        gymId: gymId || 'default_gym',
        qrToken: qrToken,
        registrationData: {
          age: parseInt(age),
          gender,
          address: address || '',
          activityPreference
        }
      };

      const { validationCode, expiresAt } = createCashValidationRequest(validationData);
      
      return res.status(202).json({
        success: true,
        requiresCashValidation: true,
        validationCode,
        message: 'Cash validation request created. Please ask gym admin to confirm payment.',
        expiresAt: expiresAt.toISOString(),
        timeLeft: 120, // 2 minutes in seconds
        nextSteps: {
          message: 'Payment verification required',
          action: 'cash_validation',
          details: `Please provide this code to the gym admin: ${validationCode}`,
          validationCode: validationCode
        }
      });
    }

    // ONLY for trial registrations and online payments (NOT for cash payments)
    if (registrationType === 'trial' || paymentMode !== 'cash') {
      const memberData = {
        gym: gymId,
        memberName: finalMemberName,
        age: parseInt(age),
        gender,
        phone,
        email,
        paymentMode: paymentMode || 'pending',
        paymentAmount: parseFloat(paymentAmount),
        planSelected: finalPlanSelected.charAt(0).toUpperCase() + finalPlanSelected.slice(1).toLowerCase(), // Ensure proper case
        monthlyPlan: parseInt(monthlyPlan), // Convert to number
        activityPreference,
        address: address || '',
        joinDate: new Date(),
        membershipId: `${(gym.gymName || gym.name || 'GYM').substring(0,3).toUpperCase()}${Date.now()}`,
        paymentStatus: registrationType === 'trial' ? 'paid' : 'pending'
      };

      console.log('Creating member with data:', memberData);

      const newMember = new Member(memberData);
      await newMember.save();

      // Increment QR code usage
      await qrCode.incrementUsage({
        memberId: newMember._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(newMember, gym, registrationType, specialOffer);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail registration if email fails
      }

      // Determine next steps based on registration type
      let nextSteps = {};
      
      if (registrationType === 'trial') {
        nextSteps = {
          message: 'Trial membership activated! You can start using the gym immediately.',
          action: 'visit_gym',
          details: 'Your 3-day trial starts now. Visit the gym to begin your fitness journey!',
          redirectUrl: '/registration-complete?type=trial'
        };
      } else {
        // For paid memberships, prepare payment options
        const baseAmount = selectedPlan?.price || 1000; // Default amount if plan not found
        const duration = selectedPlan?.duration || 1;
        
        nextSteps = {
          message: 'Registration successful! Please complete payment to activate your membership.',
          action: 'payment_required',
          paymentOptions: {
            memberId: newMember._id,
            amount: baseAmount,
            duration: duration,
            planName: selectedPlan?.name || 'Membership Plan',
            supportedMethods: ['razorpay', 'stripe', 'upi', 'paypal']
          },
          paymentUrl: `/payment?member=${newMember._id}&plan=${selectedPlan}&amount=${baseAmount}`,
          details: 'Choose your preferred payment method to complete the registration.',
          redirectUrl: '/payment-gateway'
        };
      }

      res.status(201).json({
        message: 'Member registration successful',
        member: {
          id: newMember._id,
          name: newMember.memberName,
          email: newMember.email,
          membershipPlan: newMember.planSelected, // Map to existing field
          planSelected: newMember.planSelected,
          monthlyPlan: newMember.monthlyPlan,
          membershipId: newMember.membershipId,
          paymentStatus: newMember.paymentStatus
        },
        gym: {
          name: gym.gymName || gym.name,
          address: gym.address,
          contact: gym.contact
        },
        nextSteps
      });
    } else {
      // This should never happen because cash payments return early above
      return res.status(400).json({
        success: false,
        message: 'Invalid payment mode or registration type combination'
      });
    }

  } catch (error) {
    console.error('Error in QR member registration:', error);
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: error.message 
    });
  }
};

// Send welcome email to new member
const sendWelcomeEmail = async (member, gym, registrationType, specialOffer) => {
  try {
    let subject, htmlContent;
    const memberName = member.memberName || member.name || 'Member';
    const gymName = gym.name || gym.gymName || 'Gym Wale';
    const joinDate = member.joinDate || member.joinedDate || new Date();
    const startDate = member.membershipStartDate || member.joinDate || new Date();
    const endDate = member.membershipEndDate || member.validUntil || member.membershipValidUntil || new Date();

    if (registrationType === 'trial') {
      subject = `Welcome to ${gymName} - Your 3-Day Trial Starts Now! 🎉`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2.5rem;">🎉 Welcome to ${gymName}!</h1>
            <p style="margin: 10px 0 0 0; font-size: 1.2rem;">Your 3-Day Trial Starts Now</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${memberName}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Congratulations! Your 3-day trial membership at <strong>${gymName}</strong> is now active. 
              You can start your fitness journey immediately!
            </p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin: 0 0 10px 0; color: #2e7d32;">✅ Trial Details</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>Duration: 3 Days</li>
                <li>Plan: ${member.planSelected}</li>
                <li>Start Date: ${new Date(startDate).toLocaleDateString()}</li>
                <li>End Date: ${new Date(endDate).toLocaleDateString()}</li>
              </ul>
            </div>
            
            ${specialOffer ? `
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h3 style="margin: 0 0 10px 0; color: #ef6c00;">🎁 Special Offer</h3>
              <p style="margin: 0; color: #555; font-weight: 600;">${specialOffer}</p>
            </div>
            ` : ''}
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">📍 Gym Information</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Address:</strong> ${gym.address}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${gym.contact}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${gym.email}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
                Ready to start your fitness journey? Visit us today!
              </p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This email was sent because you registered via QR code at ${gym.name}</p>
          </div>
        </div>
      `;
    } else {
      subject = registrationType === 'instant'
        ? `Welcome to ${gymName} - Registration Complete! 🎉`
        : `Welcome to ${gymName} - Complete Your Membership! 🎉`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2.5rem;">🎉 Welcome to ${gymName}!</h1>
            <p style="margin: 10px 0 0 0; font-size: 1.2rem;">Your Registration is Almost Complete</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${memberName}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Thank you for registering at <strong>${gymName}</strong>! Your membership details have been recorded,
              and you're just one step away from starting your fitness journey.
            </p>
            
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h3 style="margin: 0 0 10px 0; color: #ef6c00;">⏳ Next Step Required</h3>
              <p style="margin: 0; color: #555; font-weight: 600;">
                Please complete your payment to activate your membership and start using our facilities.
              </p>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">📋 Membership Details</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>Plan: ${member.planSelected}</li>
                <li>Type: ${registrationType === 'premium' ? 'Premium Registration' : 'Standard Registration'}</li>
                <li>Registration Date: ${new Date(joinDate).toLocaleDateString()}</li>
                <li>Status: Pending Payment</li>
              </ul>
            </div>
            
            ${specialOffer ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h3 style="margin: 0 0 10px 0; color: #2e7d32;">🎁 Special Offer</h3>
              <p style="margin: 0; color: #555; font-weight: 600;">${specialOffer}</p>
            </div>
            ` : ''}
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">📍 Gym Information</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Address:</strong> ${gym.address}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> ${gym.contact}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${gym.email}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
                Once payment is completed, you'll receive your membership confirmation and can start using our facilities immediately.
              </p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This email was sent because you registered via QR code at ${gym.name}</p>
          </div>
        </div>
      `;
    }

    await sendEmail({
      to: member.email,
      subject,
      title: `Welcome to ${gymName}!`,
      preheader: registrationType === 'instant' ? 'Your membership is confirmed and active' : 'Complete your payment to activate membership',
      bodyHtml: `
        <p>Hi <strong style="color:#10b981;">${memberName}</strong>,</p>
        <p>🎉 Welcome to <strong>${gymName}</strong>! Your registration via QR code is complete.</p>
        
        <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
          <table style="width:100%;font-size:13px;">
            <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Member ID:</strong></td><td style="padding:6px 0;background:#0d4d89;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:600;letter-spacing:1px;">${member.membershipId}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Plan:</strong></td><td style="padding:6px 0;">${member.planSelected}</td></tr>
            <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Status:</strong></td><td style="padding:6px 0;color:${registrationType === 'instant' ? '#10b981' : '#f59e0b'};">${registrationType === 'instant' ? 'Active' : 'Pending Payment'}</td></tr>
            ${member.validUntil ? `<tr><td style="padding:6px 0;color:#94a3b8;"><strong>Valid Until:</strong></td><td style="padding:6px 0;">${new Date(member.validUntil).toLocaleDateString()}</td></tr>` : ''}
          </table>
        </div>
        
        ${registrationType === 'instant' 
          ? '<p style="color:#10b981;text-align:center;">✅ Your membership is confirmed and active!</p>'
          : '<p style="color:#f59e0b;text-align:center;">⏳ Complete your payment to activate your membership.</p>'
        }
        
        ${specialOffer ? `
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <h4 style="color:#38bdf8;margin:0 0 8px 0;">🎁 Special Offer</h4>
            <p style="color:#cbd5e1;margin:0;font-size:14px;">${specialOffer}</p>
          </div>
        ` : ''}
        
        <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
          ${registrationType === 'instant' 
            ? 'Start your fitness journey today! 💪'
            : 'Once payment is completed, you\'ll receive your membership confirmation.'
          }
        </p>
      `,
      action: {
        label: registrationType === 'instant' ? 'Visit Gym' : 'Complete Payment',
        url: registrationType === 'instant' 
          ? `#gym-${gym._id}` 
          : `${process.env.BRAND_PORTAL_URL || 'https://gym-wale.com'}/payment/${member.membershipId}`
      },
      footerNote: `This email was sent because you registered via QR code at ${gymName}`
    });

    console.log(`Welcome email sent to ${member.email}`);

  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Get gym information for QR code registration page
 * GET /api/gym/info/:gymId
 */
const getGymInfo = async (req, res) => {
  try {
    const { gymId } = req.params;

    const gym = await Gym.findById(gymId).select('name gymName logoUrl logo address location phone email');
    
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    
    res.json({
      id: gym._id,
      name: gym.name || gym.gymName,
      logoUrl: gym.logoUrl || (gym.logo ? `/uploads/gym-logos/${gym.logo}` : null),
      address: gym.address || gym.location?.address,
      phone: gym.phone,
      email: gym.email
    });
  } catch (error) {
    console.error('Error fetching gym info:', error);
    res.status(500).json({ message: 'Failed to fetch gym information', error: error.message });
  }
};

/**
 * Register previous member via QR code (limited fields)
 * POST /api/members/qr-register-previous
 */
const registerPreviousMember = async (req, res) => {
  try {
    const { gymId, preferredActivities } = req.body;
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhone(req.body?.phone);
    const email = normalizeEmail(req.body?.email);
    const selectedActivities = parseActivityList(preferredActivities);
    const profileImageUrl = resolveProfileImageUrl(req);
    
    // Validate required fields
    if (!gymId || !name || !phone || !email) {
      return res.status(400).json({ 
        message: 'Missing required fields: gymId, name, phone, email' 
      });
    }
    
    // Validate phone format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format. Must be 10 digits.' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Check if gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    const gymDisplayName = gym.gymName || gym.name || 'Gym';
    
    // Check if member already exists with this phone or email
    const existingMember = await findExistingMemberByIdentity(gymId, phone, email);
    
    if (existingMember) {
      // Update existing member information
      existingMember.memberName = name;
      existingMember.phone = phone;
      existingMember.email = email;
      if (selectedActivities.length > 0) {
        existingMember.activityPreference = selectedActivities.join(', ');
      }
      if (profileImageUrl) {
        existingMember.profileImage = profileImageUrl;
      }
      existingMember.updatedAt = new Date();
      
      await existingMember.save();
      
      // Send notification email (fire-and-forget — do not block the HTTP response)
      sendEmail({
        to: email,
        subject: `${gymDisplayName} - Information Updated`,
        title: 'Profile Updated',
        bodyHtml: `
          <p>Hi <strong style="color:#10b981;">${name}</strong>,</p>
          <p>Your information has been successfully updated at <strong>${gymDisplayName}</strong>.</p>
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <p style="color:#cbd5e1;margin:0;">Your profile is now up to date. Please contact the gym for any membership renewals or queries.</p>
          </div>
        `,
        footerNote: `This email was sent because you updated your information via QR code at ${gymDisplayName}`
      }).catch(err => console.error('Error sending update email:', err));
      
      return res.status(200).json({
        message: 'Member found and updated successfully (existing member flow applied)',
        memberId: existingMember.membershipId,
        name: existingMember.memberName,
        phone: existingMember.phone,
        email: existingMember.email,
        membershipExpiry: existingMember.validUntil
      });
    }
    
    // If member doesn't exist, create a pending record with safe defaults required by schema.
    const newMembershipId = generateStandardMembershipId(gym.gymName || gym.name || 'GYM', 'PENDING');
    const newMember = new Member({
      gym: gymId,
      membershipId: newMembershipId,
      memberName: name,
      age: 18,
      gender: 'Other',
      phone,
      email,
      activityPreference: selectedActivities.length > 0
        ? selectedActivities.join(', ')
        : 'General Fitness',
      paymentMode: 'pending',
      paymentAmount: 0,
      planSelected: 'Basic',
      monthlyPlan: '1 Month',
      paymentStatus: 'pending',
      joinDate: new Date(),
      profileImage: profileImageUrl || undefined
    });
    
    await newMember.save();
    
    // Send welcome email (fire-and-forget)
    sendEmail({
      to: email,
      subject: `Welcome Back to ${gymDisplayName}!`,
      title: 'Registration Received',
      bodyHtml: `
        <p>Hi <strong style="color:#10b981;">${name}</strong>,</p>
        <p>Thank you for registering at <strong>${gymDisplayName}</strong>!</p>
        <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
          <p style="color:#cbd5e1;margin:0;"><strong>Member ID:</strong> ${newMembershipId}</p>
        </div>
        <p style="color:#f59e0b;">Please visit the gym to complete your membership and payment.</p>
      `,
      footerNote: `This email was sent because you registered via QR code at ${gymDisplayName}`
    }).catch(err => console.error('Error sending welcome email:', err));
    
    res.status(201).json({
      message: 'Registration submitted successfully. Please visit the gym to complete your membership.',
      memberId: newMember.membershipId,
      name: newMember.memberName,
      phone: newMember.phone,
      email: newMember.email
    });
    
  } catch (error) {
    console.error('Error registering previous member:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

/**
 * Register new member via QR code with full details and payment
 * POST /api/members/qr-register-new
 */
const registerNewMember = async (req, res) => {
  try {
    const membershipPlan = parseObjectValue(req.body?.membershipPlan) || {};
    const payment = parseObjectValue(req.body?.payment) || {};
    const preferredActivities = parseActivityList(req.body?.preferredActivities);
    const {
      gymId,
      name,
      memberName,
      phone: rawPhone,
      email: rawEmail,
      gender,
      age,
      address,
      activityPreference,
      planSelected,
      monthlyPlan,
      paymentMode,
      paymentAmount
    } = req.body;

    const resolvedName = (memberName || name || '').trim();
    const phone = normalizePhone(rawPhone);
    const email = normalizeEmail(rawEmail);
    const resolvedAge = Number(age);
    const resolvedMonths = Number(membershipPlan?.months || parseInt(monthlyPlan, 10));
    const resolvedAmount = Number(payment?.amount || paymentAmount || membershipPlan?.price);
    const resolvedPaymentModeRaw = payment?.method || paymentMode;
    const resolvedPaymentMode = ['Cash', 'Card', 'UPI', 'Online', 'pending'].includes(resolvedPaymentModeRaw)
      ? resolvedPaymentModeRaw
      : 'Online';

    let resolvedPlan = planSelected;
    if (!resolvedPlan) {
      if (resolvedMonths >= 6) resolvedPlan = 'Premium';
      else if (resolvedMonths >= 3) resolvedPlan = 'Standard';
      else resolvedPlan = 'Basic';
    }

    const resolvedMonthlyPlan = [1, 3, 6, 12].includes(resolvedMonths)
      ? `${resolvedMonths} Month${resolvedMonths > 1 ? 's' : ''}`
      : '1 Month';

    const activitiesString = activityPreference ||
      (Array.isArray(preferredActivities) && preferredActivities.length > 0
        ? preferredActivities.join(', ')
        : 'General Fitness');
    const profileImageUrl = resolveProfileImageUrl(req);

    if (!gymId || !resolvedName || !phone || !email || !gender || !Number.isFinite(resolvedAge) || resolvedAge <= 0) {
      return res.status(400).json({
        message: 'Missing required fields: gymId, name, age, gender, phone, email'
      });
    }

    if (!resolvedAmount || resolvedAmount <= 0) {
      return res.status(400).json({
        message: 'Missing or invalid payment amount'
      });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format. Must be 10 digits.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if member already exists
    const existingMember = await findExistingMemberByIdentity(gymId, phone, email);

    // ── CASH PAYMENT: do NOT create a member record yet ────────────────────
    // The member is only saved to the database AFTER the gym admin confirms
    // the cash payment. This prevents phantom members appearing in the member
    // list when a validation is rejected or times out.
    if (resolvedPaymentMode === 'Cash') {
      try {
        const qrCouponCode = String(req.body?.couponCode || '').trim().toUpperCase() || undefined;
        const { validationCode, expiresAt } = createCashValidationRequest({
          memberName: resolvedName,
          email,
          phone,
          planName: resolvedPlan,
          duration: resolvedMonthlyPlan,
          amount: resolvedAmount,
          gymId,
          registrationData: {
            age: resolvedAge,
            gender,
            address: address || '',
            activityPreference: activitiesString,
            // Pass existing member _id so confirmCashPayment updates rather than duplicates
            memberId: existingMember ? existingMember._id : undefined,
            profileImageUrl: profileImageUrl || undefined,
            // Pass coupon code so it can be applied when cash is confirmed
            couponCode: qrCouponCode
          }
        });

        // Send FCM push notification to gym admin app
        try {
          const adminTokens = await gymNotificationService.getGymAdminFCMTokens(gymId);
          if (adminTokens.length > 0) {
            await fcmService.notifyGymAdminCashPayment(adminTokens, {
              memberName: resolvedName,
              amount: resolvedAmount,
              planName: resolvedPlan,
              duration: resolvedMonthlyPlan,
              validationCode,
              gymId: String(gymId),
              memberId: '',
              expiresAt: expiresAt.toISOString()
            });
            console.log(`✅ FCM cash payment alert sent to ${adminTokens.length} admin device(s)`);
          }
        } catch (fcmErr) {
          console.error('❌ Error sending FCM cash payment notification:', fcmErr.message);
        }

        // Notify member about cash payment pending (fire-and-forget)
        const gymDisplayName = gym.gymName || gym.name || 'Gym';
        sendEmail({
          to: email,
          subject: `${gymDisplayName} - Registration Pending Cash Payment`,
          title: 'Registration Submitted',
          bodyHtml: `
            <p>Hi <strong style="color:#10b981;">${resolvedName}</strong>,</p>
            <p>Your registration at <strong>${gymDisplayName}</strong> has been submitted!</p>
            <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
              <table style="width:100%;font-size:13px;">
                <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Plan:</strong></td><td style="padding:6px 0;color:#e2e8f0;">${resolvedPlan}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Duration:</strong></td><td style="padding:6px 0;color:#e2e8f0;">${resolvedMonthlyPlan}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Amount:</strong></td><td style="padding:6px 0;color:#e2e8f0;">&#8377;${resolvedAmount}</td></tr>
                <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Validation Code:</strong></td><td style="padding:6px 0;color:#38bdf8;font-weight:700;font-size:18px;letter-spacing:2px;">${validationCode}</td></tr>
              </table>
            </div>
            <p style="color:#f59e0b;text-align:center;">&#9203; Please show this code to the gym staff and pay &#8377;${resolvedAmount} at the counter to activate your membership.</p>
          `,
          footerNote: `This email was sent because you registered via QR code at ${gymDisplayName}`
        }).catch(err => console.error('Error sending cash registration email:', err));

        return res.status(202).json({
          message: 'Registration submitted! Please pay at the counter — your membership will be activated after the admin confirms your cash payment.',
          name: resolvedName,
          phone,
          email,
          paymentStatus: 'Pending Cash Confirmation',
          requiresCashValidation: true,
          validationCode,
          expiresAt: expiresAt.toISOString(),
          timeLeft: 120
        });
      } catch (cashError) {
        console.error('Error creating cash validation request:', cashError);
        return res.status(500).json({ message: 'Failed to create cash validation request. Please try again.' });
      }
    }

    // ── NON-CASH PAYMENT: save member record immediately ───────────────────
    const membershipEndDate = new Date();
    membershipEndDate.setMonth(membershipEndDate.getMonth() + resolvedMonths);

    const newMembershipId = generateStandardMembershipId(gym.gymName || gym.name || 'GYM', resolvedPlan);
    const memberRecord = existingMember || new Member({
      gym: gymId,
      membershipId: newMembershipId,
      joinDate: new Date()
    });

    memberRecord.memberName = resolvedName;
    memberRecord.phone = phone;
    memberRecord.email = email;
    memberRecord.gender = gender;
    memberRecord.age = resolvedAge;
    memberRecord.address = address || '';
    memberRecord.activityPreference = activitiesString;
    memberRecord.planSelected = resolvedPlan;
    memberRecord.monthlyPlan = resolvedMonthlyPlan;
    memberRecord.paymentAmount = resolvedAmount;
    memberRecord.paymentMode = resolvedPaymentMode;
    memberRecord.membershipValidUntil = membershipEndDate.toISOString().split('T')[0];
    memberRecord.validUntil = membershipEndDate;
    memberRecord.paymentStatus = 'paid';

    if (!memberRecord.membershipId) {
      memberRecord.membershipId = newMembershipId;
    }

    const transactionId = String(payment?.transactionId || req.body?.transactionId || '').trim();
    if (transactionId) {
      memberRecord.transactionId = transactionId;
    }

    if (profileImageUrl) {
      memberRecord.profileImage = profileImageUrl;
    }

    await memberRecord.save();

    // Create payment record
    try {
      const paymentRecord = new Payment({
        gymId,
        type: 'received',
        category: 'membership',
        amount: resolvedAmount,
        description: `QR Registration - ${resolvedMonthlyPlan} membership for ${resolvedName}`,
        memberName: resolvedName,
        memberId: memberRecord._id,
        paymentMethod: resolvedPaymentMode.toLowerCase(),
        status: 'completed',
        registrationSource: 'qr_registration',
        planSelected: resolvedPlan,
        monthlyPlan: resolvedMonthlyPlan,
        paidDate: new Date(),
        createdBy: gymId
      });
      await paymentRecord.save();

      const notification = new Notification({
        user: gymId,
        title: '💰 New QR Registration Payment',
        message: `₹${resolvedAmount.toLocaleString('en-IN')} received from ${resolvedName} via QR code registration`,
        type: 'payment',
        priority: 'normal',
        read: false,
        isRead: false,
        metadata: {
          paymentId: paymentRecord._id,
          amount: resolvedAmount,
          paymentMethod: resolvedPaymentMode,
          registrationSource: 'qr_registration',
          memberName: resolvedName,
          memberId: memberRecord._id,
          category: 'membership'
        }
      });
      await notification.save();
      console.log('✅ Payment record and notification created for QR registration');
    } catch (paymentError) {
      console.error('❌ Error creating payment record:', paymentError);
    }

    // Mark coupon as used (non-cash immediate registration only)
    const couponCode = String(req.body?.couponCode || '').trim().toUpperCase();
    if (couponCode) {
      try {
        const coupon = await Coupon.findOne({
          code: couponCode,
          gymId,
          status: 'active',
          isActive: true
        });
        if (coupon && (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit)) {
          await coupon.incrementUsage(resolvedAmount, 0);
        }
      } catch (couponError) {
        console.error('Error marking coupon as used:', couponError);
      }
    }

    try {
      await sendWelcomeEmail(memberRecord, gym, 'instant');
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    res.status(existingMember ? 200 : 201).json({
      message: existingMember
        ? 'Existing member updated with new plan and activities.'
        : 'Registration completed successfully!',
      memberId: memberRecord.membershipId,
      name: memberRecord.memberName,
      phone: memberRecord.phone,
      email: memberRecord.email,
      membershipExpiry: memberRecord.validUntil,
      wasExistingMember: Boolean(existingMember),
      paymentStatus: 'Completed'
    });
    
  } catch (error) {
    console.error('Error registering new member:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

/**
 * Public member lookup for QR registration duplicate check
 * GET /api/members/qr-lookup?gymId=XXX&phone=YYY&email=ZZZ
 * Returns minimal membership info if a matching member already exists.
 */
const lookupMemberForQR = async (req, res) => {
  try {
    const gymId = String(req.query.gymId || '').trim();
    const phone = normalizePhone(req.query.phone || '');
    const email = normalizeEmail(req.query.email || '');

    if (!gymId) {
      return res.status(400).json({ found: false, message: 'gymId is required' });
    }
    if (!phone && !email) {
      return res.json({ found: false });
    }

    const existing = await findExistingMemberByIdentity(gymId, phone || null, email || null);

    if (!existing) {
      return res.json({ found: false });
    }

    const now = new Date();

    // Resolve the canonical validity date from either storage field.
    // QR-registered members use `validUntil` (Date); offline-added and
    // Excel bulk-upload members use `membershipValidUntil` (String).
    // We must check both so every registration type is handled correctly.
    const rawValidity =
      existing.validUntil ||
      (existing.membershipValidUntil && existing.membershipValidUntil !== 'NA'
        ? existing.membershipValidUntil
        : null);
    const validUntilDate = rawValidity ? new Date(rawValidity) : null;
    const isValidDate = validUntilDate && !isNaN(validUntilDate.getTime());

    const allowanceDate = existing.allowanceExpiryDate ? new Date(existing.allowanceExpiryDate) : null;
    const isFrozen = !!existing.currentlyFrozen;
    const isActive = !isFrozen && (
      (isValidDate && validUntilDate > now) ||
      (allowanceDate && !isNaN(allowanceDate.getTime()) && allowanceDate > now)
    );

    return res.json({
      found: true,
      member: {
        name: existing.memberName,
        membershipId: existing.membershipId,
        planSelected: existing.planSelected,
        monthlyPlan: existing.monthlyPlan,
        paymentStatus: existing.paymentStatus,
        validUntil: isValidDate ? validUntilDate : null,
        isActive
      }
    });
  } catch (error) {
    console.error('Error in QR member lookup:', error);
    return res.status(500).json({ found: false });
  }
};

/**
 * Renew membership for an existing member via QR code (public endpoint)
 * POST /api/members/qr-renew
 */
const renewMemberViaQR = async (req, res) => {
  try {
    const { gymId, planSelected, months, paymentMode, paymentAmount, transactionId } = req.body;
    const phone = normalizePhone(req.body?.phone);
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || '').trim();

    if (!gymId || (!phone && !email)) {
      return res.status(400).json({ message: 'Missing required fields: gymId, and phone or email' });
    }
    if (!planSelected || !months || !paymentMode || paymentAmount === undefined) {
      return res.status(400).json({ message: 'Missing renewal fields: planSelected, months, paymentMode, paymentAmount' });
    }

    const gym = await Gym.findById(gymId);
    if (!gym) return res.status(404).json({ message: 'Gym not found' });

    const existingMember = await findExistingMemberByIdentity(gymId, phone || null, email || null);
    if (!existingMember) {
      return res.status(404).json({ message: 'Member not found in this gym. Please use the New Member flow.' });
    }

    const gymName = gym.gymName || gym.name || 'Gym';
    const monthsNum = Number(months);
    const amount = Number(paymentAmount);

    // Cash payment → create cash validation request
    if (paymentMode === 'Cash') {
      const validationData = {
        memberName: existingMember.memberName || name,
        email: existingMember.email || email,
        phone: existingMember.phone || phone,
        planName: planSelected,
        duration: `${monthsNum} Month${monthsNum > 1 ? 's' : ''}`,
        amount,
        gymId,
        registrationData: {
          memberId: existingMember._id.toString(),
          renewalFlow: true,
          months: monthsNum,
          planSelected
        }
      };
      const { validationCode, expiresAt } = createCashValidationRequest(validationData);
      return res.status(202).json({
        success: true,
        requiresCashValidation: true,
        validationCode,
        message: 'Cash validation request created. Please ask gym admin to confirm payment.',
        expiresAt: expiresAt.toISOString(),
        timeLeft: 120,
        name: existingMember.memberName,
        phone: existingMember.phone
      });
    }

    // Non-cash: extend membership directly
    const now = new Date();
    // Resolve existing expiry from either field (offline/bulk members only have
    // membershipValidUntil; QR members have validUntil).
    const rawExistingExpiry =
      existingMember.validUntil ||
      (existingMember.membershipValidUntil && existingMember.membershipValidUntil !== 'NA'
        ? existingMember.membershipValidUntil
        : null);
    const existingExpiry = rawExistingExpiry ? new Date(rawExistingExpiry) : null;
    const baseDate = existingExpiry && !isNaN(existingExpiry.getTime()) && existingExpiry > now
      ? existingExpiry
      : now;
    const newValidUntil = new Date(baseDate);
    newValidUntil.setMonth(newValidUntil.getMonth() + monthsNum);

    existingMember.planSelected = planSelected;
    existingMember.monthlyPlan = `${monthsNum} Month${monthsNum > 1 ? 's' : ''}`;
    existingMember.paymentMode = paymentMode;
    existingMember.paymentAmount = amount;
    existingMember.paymentStatus = 'paid';
    existingMember.validUntil = newValidUntil;
    if (name && !existingMember.memberName) existingMember.memberName = name;
    existingMember.updatedAt = now;

    await existingMember.save();

    // Mark coupon as used (non-cash renewal only)
    const renewCouponCode = String(req.body?.couponCode || '').trim().toUpperCase();
    if (renewCouponCode) {
      try {
        const coupon = await Coupon.findOne({
          code: renewCouponCode,
          gymId,
          status: 'active',
          isActive: true
        });
        if (coupon && (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit)) {
          await coupon.incrementUsage(amount, 0);
        }
      } catch (couponError) {
        console.error('Error marking renewal coupon as used:', couponError);
      }
    }

    // Send renewal confirmation email
    try {
      await sendEmail({
        to: existingMember.email,
        subject: `${gymName} – Membership Renewed Successfully`,
        template: 'gym-wale',
        heading: 'Membership Renewed',
        bodyHtml: `
          <p>Hi <strong style="color:#10b981;">${existingMember.memberName}</strong>,</p>
          <p>Great news! Your membership at <strong>${gymName}</strong> has been renewed.</p>
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <table style="width:100%;font-size:13px;color:#cbd5e1;">
              <tr><td style="padding:6px 0;width:140px;"><strong>Plan:</strong></td><td>${planSelected}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Duration:</strong></td><td>${monthsNum} Month${monthsNum > 1 ? 's' : ''}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Valid Until:</strong></td><td>${newValidUntil.toLocaleDateString('en-IN')}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Amount Paid:</strong></td><td>₹${amount.toLocaleString('en-IN')}</td></tr>
            </table>
          </div>
          <p style="color:#10b981;text-align:center;">✅ Your membership is now active. Start your fitness journey!</p>
        `,
        footerNote: `This email was sent because you renewed your membership via QR code at ${gymName}`
      });
    } catch (emailError) {
      console.error('Error sending renewal email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      memberId: existingMember.membershipId,
      name: existingMember.memberName,
      phone: existingMember.phone,
      email: existingMember.email,
      membershipExpiry: newValidUntil
    });

  } catch (error) {
    console.error('Error in QR membership renewal:', error);
    res.status(500).json({ message: 'Renewal failed. Please try again.', error: error.message });
  }
};

module.exports = {
  registerMemberViaQR,
  sendWelcomeEmail,
  getGymInfo,
  registerPreviousMember,
  registerNewMember,
  lookupMemberForQR,
  renewMemberViaQR
};
