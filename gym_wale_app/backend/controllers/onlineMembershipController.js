const Member = require('../models/Member');
const Gym = require('../models/gym');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

// Register member after successful online payment
exports.registerOnlineMember = async (req, res) => {
  try {
    console.log('📝 Processing online member registration:', req.body);
    
    const {
      gymId, memberName, memberEmail, memberPhone, memberAge, memberGender,
      memberAddress, paymentMode, paymentAmount, planSelected, monthlyPlan,
      activityPreference, paymentStatus, paymentId, registrationType
    } = req.body;

    // Validate required fields
    if (!gymId || !memberName || !memberEmail || !paymentAmount || !planSelected) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for member registration'
      });
    }

    // Get and validate gym
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    // Check for duplicate members (email or phone)
    if (!req.body.forceAdd) {
      const duplicateQuery = {
        gym: gymId,
        $or: []
      };
      
      if (memberEmail) duplicateQuery.$or.push({ email: memberEmail.toLowerCase() });
      if (memberPhone) duplicateQuery.$or.push({ phone: memberPhone });
      
      if (duplicateQuery.$or.length > 0) {
        const duplicate = await Member.findOne(duplicateQuery);
        if (duplicate) {
          return res.status(409).json({
            success: false,
            code: 'DUPLICATE_MEMBER',
            message: 'A member with this email or phone already exists',
            existingMember: {
              memberName: duplicate.memberName,
              email: duplicate.email,
              phone: duplicate.phone,
              membershipId: duplicate.membershipId
            }
          });
        }
      }
    }

    // Generate membership ID
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gymShort = gym.gymName.replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
    const planShort = planSelected.replace(/[^A-Za-z0-9]/g, '').substring(0, 6).toUpperCase();
    const membershipId = `${gymShort}-${ym}-${planShort}-${random}`;

    // Calculate membership validity
    let months = 1;
    if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
    else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
    else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
    
    const joinDate = new Date();
    const validUntil = new Date(joinDate);
    validUntil.setMonth(validUntil.getMonth() + months);
    const membershipValidUntil = validUntil.toISOString().split('T')[0];

    // Create member record
    const member = new Member({
      gym: gymId,
      memberName,
      email: memberEmail,
      phone: memberPhone,
      age: memberAge || 25,
      gender: memberGender || 'Other',
      address: memberAddress || '',
      paymentMode: paymentMode || 'Online',
      paymentAmount: parseFloat(paymentAmount),
      planSelected,
      monthlyPlan,
      activityPreference: activityPreference || 'General Fitness',
      membershipId,
      membershipValidUntil,
      joinDate,
      registrationSource: registrationType || 'online_membership'
    });

    await member.save();
    console.log('✅ Member created successfully:', member.membershipId);

    // Generate ID Pass for new member
    try {
      const IDPassGenerator = require('../services/idPassGenerator');
      const path = require('path');
      const passId = IDPassGenerator.generatePassId();
      
      // Update member with pass ID
      member.passId = passId;
      member.passGeneratedDate = new Date();
      await member.save();

      // Generate QR code and PDF pass asynchronously (don't block response)
      setTimeout(async () => {
        try {
          const memberData = {
            membershipId: member.membershipId,
            memberName: member.memberName,
            email: member.email,
            phone: member.phone,
            planSelected: member.planSelected,
            monthlyPlan: member.monthlyPlan,
            activityPreference: member.activityPreference,
            joinDate: member.joinDate,
            membershipValidUntil: member.membershipValidUntil,
            isActive: true,
            gym: {
              _id: gym._id,
              name: gym.gymName,
              city: gym.city,
              state: gym.state
            },
            profileImage: null // Online members don't have profile image initially
          };

          const qrCodeDataUrl = await IDPassGenerator.generateQRCode(memberData);
          const passFileName = `${passId}.pdf`;
          const passesDir = path.join(__dirname, '../../uploads/member-passes');
          const fs = require('fs');
          if (!fs.existsSync(passesDir)) {
            fs.mkdirSync(passesDir, { recursive: true });
          }
          const passFilePath = path.join(passesDir, passFileName);
          
          await IDPassGenerator.generatePass(memberData, passFilePath);

          member.passQRCode = qrCodeDataUrl;
          member.passFilePath = `/uploads/member-passes/${passFileName}`;
          await member.save();

          console.log('✅ ID Pass generated successfully for online member:', member.membershipId);
        } catch (passErr) {
          console.error('❌ Error generating ID pass:', passErr);
        }
      }, 500);
    } catch (passError) {
      console.error('[OnlineMembership] Error initiating ID pass generation:', passError);
      // Don't block member creation if pass generation fails
    }

    // Create payment record
    try {
      const payment = new Payment({
        gymId,
        type: 'received',
        category: 'membership',
        amount: parseFloat(paymentAmount),
        description: `Online membership payment for ${memberName}`,
        memberName: memberName,
        memberId: member._id,
        paymentMethod: 'online',
        status: 'completed',
        externalPaymentId: paymentId,
        createdBy: gymId // Use gym ID as created by for online payments
      });
      await payment.save();
      console.log('✅ Payment record created');
    } catch (paymentErr) {
      console.error('❌ Error creating payment record:', paymentErr);
    }

    // Create notification for gym admin
    try {
      const notification = new Notification({
        title: 'New Online Member Registration',
        message: `${memberName} joined online with ${planSelected} plan (₹${paymentAmount})`,
        type: 'new-member',
        priority: 'normal',
        icon: 'fa-user-plus',
        color: '#4caf50',
        user: gymId,
        metadata: {
          memberName,
          planSelected,
          membershipId,
          paymentAmount,
          registrationSource: 'online'
        }
      });
      await notification.save();
      console.log('✅ Notification created for gym admin');
    } catch (notifError) {
      console.error('❌ Error creating notification:', notifError);
    }

    // Send membership confirmation email
    try {
      if (memberEmail && memberName) {
        let gymLogoUrl = 'https://img.icons8.com/color/96/000000/gym.png';
        if (gym.logo && typeof gym.logo === 'string' && gym.logo.trim() !== '') {
          if (/^https?:\/\//i.test(gym.logo)) {
            gymLogoUrl = gym.logo;
          } else {
            gymLogoUrl = `http://localhost:5000${gym.logo.startsWith('/') ? '' : '/'}${gym.logo}`;
          }
        }

        const html = `
          <p>Hi <strong style="color:#10b981;">${memberName}</strong>,</p>
          <p>🎉 Your online membership registration is <strong style="color:#10b981;">complete</strong>!</p>
          
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Membership ID:</strong></td><td style="padding:6px 0;background:#0d4d89;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:600;letter-spacing:1px;">${membershipId}</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Plan:</strong></td><td style="padding:6px 0;">${planSelected} (${monthlyPlan})</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Valid Until:</strong></td><td style="padding:6px 0;">${membershipValidUntil}</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Payment:</strong></td><td style="padding:6px 0;">₹${paymentAmount} <span style="color:#10b981;">✓ Confirmed</span></td></tr>
            </table>
          </div>
          
          <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
            Present your membership ID at the gym to start your fitness journey. 💪
          </p>
        `;
        
        await sendEmail({
          to: memberEmail,
          subject: `Welcome to ${gym.gymName} - Membership Confirmed`,
          title: `Welcome to ${gym.gymName}!`,
          preheader: 'Your online membership registration is complete',
          bodyHtml: html,
          action: {
            label: 'Contact Gym',
            url: `tel:${gym.phone || gym.contact}` 
          }
        });
        console.log('✅ Confirmation email sent');
      }
    } catch (emailErr) {
      console.error('❌ Error sending confirmation email:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Online member registration completed successfully',
      member: {
        id: member._id,
        membershipId,
        memberName,
        email: memberEmail,
        planSelected,
        monthlyPlan,
        paymentAmount,
        membershipValidUntil,
        joinDate: member.joinDate
      }
    });

  } catch (error) {
    console.error('❌ Error in online member registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register member',
      error: error.message
    });
  }
};

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
