const Member = require('../models/Member');
const Gym = require('../models/gym');
const path = require('path');

const sendEmail = require('../utils/sendEmail');
const Payment = require('../models/Payment');

// Renew membership for an existing member
exports.renewMembership = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { planSelected, monthlyPlan, paymentAmount, paymentMode, activityPreference, paymentStatus, pendingPaymentAmount } = req.body;
    
    // Get gym ID from authenticated admin
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Debug admin structure
    console.log('🔍 Admin object:', req.admin);
    console.log('🔍 Admin ID field options:', {
      _id: req.admin?._id,
      id: req.admin?.id,
      gymId: req.admin?.gymId,
      adminId: req.admin?.adminId
    });
    
    // Determine the correct admin ID to use for createdBy
    let adminId = null;
    if (req.admin) {
      adminId = req.admin._id || req.admin.id || req.admin.adminId || req.admin.gymId;
    }
    
    // If no admin ID found, create a temporary ObjectId using mongoose
    if (!adminId) {
      const mongoose = require('mongoose');
      console.warn('⚠️ No admin ID found, creating temporary ObjectId for createdBy field');
      adminId = new mongoose.Types.ObjectId();
    }
    
    console.log('✅ Using admin ID for createdBy:', adminId);
    
    // Find the member
    const member = await Member.findOne({ _id: memberId, gym: gymId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }
    
    // Calculate new validity period
    let months = 1;
    if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
    else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
    else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
    
    // Always start renewal from today (renewal date), not from previous expiry or join date
    const today = new Date();
    today.setHours(0,0,0,0);
    const newExpiryDate = new Date(today);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + months);
    const membershipValidUntil = newExpiryDate.toISOString().split('T')[0];
    
    // Check if this is a 7-day allowance renewal
    const is7DayAllowance = paymentMode === 'pending' || paymentStatus === 'pending';
    
    // Prepare member update data
    const memberUpdateData = {
      planSelected,
      monthlyPlan,
      paymentAmount,
      paymentMode: is7DayAllowance ? 'pending' : paymentMode, // Store actual payment mode for allowance
      activityPreference,
      membershipValidUntil,
    };
    
    // Add payment status fields for 7-day allowance
    if (is7DayAllowance) {
      memberUpdateData.paymentStatus = 'pending';
      memberUpdateData.pendingPaymentAmount = pendingPaymentAmount || paymentAmount;
      memberUpdateData.allowanceGrantedDate = new Date();
      memberUpdateData.allowanceExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    } else {
      // Clear any previous payment pending status for regular payments
      memberUpdateData.paymentStatus = 'paid';
      memberUpdateData.pendingPaymentAmount = 0;
      memberUpdateData.allowanceGrantedDate = null;
      memberUpdateData.allowanceExpiryDate = null;
    }
    
    // Update member with new plan details
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      memberUpdateData,
      { new: true }
    );
    
    // Create payment record only for regular payments (not 7-day allowance)
    let paymentRecord = null;
    if (!is7DayAllowance) {
      paymentRecord = new Payment({
        gymId,
        memberId,
        memberName: member.memberName,
        type: 'received',
        category: 'membership',
        amount: paymentAmount,
        description: `Membership Renewal - ${planSelected} ${monthlyPlan}`,
        paymentMethod: paymentMode.toLowerCase(),
        status: 'completed',
        paidDate: new Date(),
        notes: `Renewed until ${membershipValidUntil}`,
        createdBy: adminId
      });
      await paymentRecord.save();
    } else {
      // For 7-day allowance, create a pending payment record
      paymentRecord = new Payment({
        gymId,
        memberId,
        memberName: member.memberName,
        type: 'due',
        category: 'membership',
        amount: paymentAmount,
        description: `Membership Renewal - ${planSelected} ${monthlyPlan} (7-Day Allowance)`,
        paymentMethod: 'cash', // Default payment method for pending payments
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: `Renewed until ${membershipValidUntil} - Payment due within 7 days`,
        createdBy: adminId
      });
      await paymentRecord.save();
    }
    
    // Get gym details for email
    const gym = await Gym.findById(gymId);
    
    res.status(200).json({
      success: true,
      message: 'Membership renewed successfully',
      member: updatedMember,
      payment: paymentRecord,
      newExpiryDate: membershipValidUntil
    });
    
    // Send renewal email (optional - async)
    if (member.email && gym) {
      try {
        await sendRenewalEmail({
          to: member.email,
          memberName: member.memberName,
          membershipId: member.membershipId,
          plan: planSelected,
          monthlyPlan,
          validUntil: membershipValidUntil,
          gymName: gym.gymName || gym.name || 'Gym',
          amount: paymentAmount
        });
      } catch (emailError) {
        console.error('Error sending renewal email:', emailError);
        // Don't fail the renewal if email fails
      }
    }
    
  } catch (error) {
    console.error('Error renewing membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew membership',
      error: error.message
    });
  }
};

// Helper function to send renewal email
async function sendRenewalEmail({ to, memberName, membershipId, plan, monthlyPlan, validUntil, gymName, amount }) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 32px 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🎉 Membership Renewed!</h1>
          <p style="color: #e8f5e8; margin: 8px 0 0 0; font-size: 16px;">Welcome back to ${gymName}</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: #333; margin: 0 0 24px 0;">Dear ${memberName},</p>
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
            Great news! Your gym membership has been successfully renewed. Thank you for continuing your fitness journey with us.
          </p>
          <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #333; margin: 0 0 16px 0; font-size: 18px;">📋 Renewal Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; font-weight: 500;">Membership ID:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${membershipId}</td></tr>
              <tr><td style="padding: 8px 0; color: #666; font-weight: 500;">Plan:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${plan}</td></tr>
              <tr><td style="padding: 8px 0; color: #666; font-weight: 500;">Duration:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${monthlyPlan}</td></tr>
              <tr><td style="padding: 8px 0; color: #666; font-weight: 500;">Amount Paid:</td><td style="padding: 8px 0; color: #4CAF50; font-weight: 600;">₹${amount}</td></tr>
              <tr><td style="padding: 8px 0; color: #666; font-weight: 500;">Valid Until:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${new Date(validUntil).toLocaleDateString()}</td></tr>
            </table>
          </div>
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 24px 0;">
            Your renewed membership is now active and ready to use. Continue achieving your fitness goals with us!
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none;">
              Welcome Back! 💪
            </div>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Thanks for choosing ${gymName}! Let's achieve your fitness goals together.
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail({
    to,
    subject: `🎉 Membership Renewed Successfully - ${gymName}`,
    title: `Welcome Back to ${gymName}!`,
    preheader: 'Your membership has been renewed successfully',
    bodyHtml: `
      <p>Hi <strong style="color:#10b981;">${memberName}</strong>,</p>
      <p>🎉 Great news! Your membership has been <strong style="color:#10b981;">renewed</strong> successfully!</p>
      
      <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
        <table style="width:100%;font-size:13px;">
          <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Membership ID:</strong></td><td style="padding:6px 0;background:#0d4d89;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:600;letter-spacing:1px;">${membershipId}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;"><strong>New Plan:</strong></td><td style="padding:6px 0;">${planSelected} (${duration})</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Valid Until:</strong></td><td style="padding:6px 0;">${validTill}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Amount:</strong></td><td style="padding:6px 0;">₹${paymentAmount} <span style="color:#10b981;">✓ Confirmed</span></td></tr>
        </table>
      </div>
      
      <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
        Your renewed membership is now active. Continue your fitness journey! 💪
      </p>
    `,
    action: {
      label: 'Visit Gym',
      url: `#gym-${gymId}` 
    }
  });
}

// Add a new member to a gym
exports.addMember = async (req, res) => {
  try {
    // Single duplicate check to prevent multiple validation runs
    const forceAdd = req.body.forceAdd === 'true' || req.body.forceAdd === true;
    const email = req.body.memberEmail;
    const phone = req.body.memberPhone;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Enhanced duplicate validation with single check
    if (!forceAdd && (email || phone) && !req._duplicateCheckDone) {
      req._duplicateCheckDone = true; // Prevent multiple validation runs
      
      const duplicateQuery = {
        gym: gymId,
        $or: []
      };
      
      if (email && email.trim()) duplicateQuery.$or.push({ email: email.trim().toLowerCase() });
      if (phone && phone.trim()) duplicateQuery.$or.push({ phone: phone.trim() });
      
      if (duplicateQuery.$or.length > 0) {
        const duplicate = await Member.findOne(duplicateQuery);
        if (duplicate) {
          const duplicateField = duplicate.email && duplicate.email.toLowerCase() === (email || '').toLowerCase() ? 'email' : 'phone number';
          return res.status(409).json({
            code: 'DUPLICATE_MEMBER',
            message: `A member with this ${duplicateField} already exists.`,
            existingMember: {
              memberName: duplicate.memberName,
              email: duplicate.email,
              phone: duplicate.phone,
              membershipId: duplicate.membershipId,
              planSelected: duplicate.planSelected,
              membershipValidUntil: duplicate.membershipValidUntil
            }
          });
        }
      }
    }
   
    for (const [key, value] of Object.entries(req.body)) {
    }
    
    // Get gym and validate
    const gym = await Gym.findById(gymId);
    if (!gym) return res.status(404).json({ message: 'Gym not found.' });
    

    let profileImagePath = '';
    if (req.file) {
      // Use Cloudinary secure URL
      profileImagePath = req.file.path;
    }

    // Helper function to extract string value from potential array
    const extractStringValue = (value) => {
      if (Array.isArray(value)) {
        return value[0]; // Take first value if array
      }
      return value;
    };

    // Extract membership fields from request body
    let membershipId = extractStringValue(req.body.membershipId);
    let membershipValidUntil = extractStringValue(req.body.membershipValidUntil);
    // FALLBACK: Generate membershipId if missing (frontend should send it, but backup)
    if (!membershipId) {
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const gymShort = (gym.gymName || 'GYM').replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const planShort = (req.body.planSelected || 'PLAN').replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      membershipId = `${gymShort}-${ym}-${planShort}-${random}`;
    }
    
    // FALLBACK: Generate membershipValidUntil if missing 
    if (!membershipValidUntil) {
      const now = new Date();
      let months = 1;
      const monthlyPlan = req.body.monthlyPlan || '';
      if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
      else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
      else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
      const validUntil = new Date(now);
      validUntil.setMonth(validUntil.getMonth() + months);
      membershipValidUntil = validUntil.toISOString().split('T')[0];
    }
    
   
    
   

    const member = new Member({
      gym: gymId,
      memberName: req.body.memberName,
      age: req.body.memberAge,
      gender: req.body.memberGender,
      phone: req.body.memberPhone,
      email: req.body.memberEmail,
      address: req.body.memberAddress,
      paymentMode: req.body.paymentMode,
      paymentAmount: req.body.paymentAmount,
      planSelected: req.body.planSelected,
      monthlyPlan: req.body.monthlyPlan,
      activityPreference: req.body.activityPreference,
      profileImage: profileImagePath,
      membershipId: membershipId,
      membershipValidUntil: membershipValidUntil
    });
    

    await member.save();

    // Generate ID Pass for new member
    try {
      const IDPassGenerator = require('../services/idPassGenerator');
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
            // Use Cloudinary URL directly if it starts with http, otherwise construct path
            profileImage: profileImagePath && profileImagePath.startsWith('http') 
              ? profileImagePath 
              : profileImagePath 
                ? path.join(__dirname, '../../', profileImagePath) 
                : null
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

          console.log('✅ ID Pass generated successfully for member:', member.membershipId);
        } catch (passErr) {
          console.error('❌ Error generating ID pass:', passErr);
        }
      }, 500);
    } catch (passError) {
      console.error('[MemberController] Error initiating ID pass generation:', passError);
      // Don't block member creation if pass generation fails
    }

    // Create payment record for membership
    try {
      const payment = new Payment({
        gymId: gymId,
        type: 'received',
        category: 'membership',
        amount: req.body.paymentAmount || 0,
        description: `Membership payment for ${req.body.memberName || 'Member'}`,
        memberName: req.body.memberName || '',
        memberId: member._id,
        paymentMethod: req.body.paymentMode || 'cash',
        status: 'completed',
        createdBy: (req.admin && req.admin.id) || gymId
      });
      await payment.save();
    } catch (paymentErr) {
      console.error('[MemberController] Error creating payment record:', paymentErr);
      // Do not block member creation if payment fails
    }

    // Create notification for new member
    try {
      const Notification = require('../models/Notification');
      const memberName = req.body.memberName || 'New Member';
      
      const notification = new Notification({
        title: 'New Member Added',
        message: `${memberName} has joined your gym with ${req.body.planSelected || 'Unknown'} plan`,
        type: 'new-member',
        priority: 'normal',
        icon: 'fa-user-plus',
        color: '#4caf50',
        user: gymId,
        metadata: {
          memberName: memberName,
          planSelected: req.body.planSelected,
          membershipId: membershipId  // Use the extracted membershipId
        }
      });
      await notification.save();
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't block member creation if notification fails
    }

    // Send membership email if all required fields are present
    try {
     
      if (req.body.memberEmail && req.body.memberName && membershipId && req.body.planSelected && req.body.monthlyPlan && membershipValidUntil && gym.gymName) {
        // Use gym logo from profile if available, otherwise fallback to default icon
        let gymLogoUrl = 'https://img.icons8.com/color/96/000000/gym.png';
        if (gym.logo && typeof gym.logo === 'string' && gym.logo.trim() !== '') {
          // If logo is a relative path, prepend server URL or use as is for absolute URLs
          if (/^https?:\/\//i.test(gym.logo)) {
            gymLogoUrl = gym.logo;
          } else {
            // Assuming logo is stored in /uploads/gymImages/ or similar
            gymLogoUrl = `http://localhost:5000${gym.logo.startsWith('/') ? '' : '/'}${gym.logo}`;
          }
        }
        const bodyHtml = `
          <p>Hi <strong style="color:#10b981;">${req.body.memberName}</strong>,</p>
          <p>🎉 Welcome to <strong>${gym.gymName}</strong>! Your membership has been <strong style="color:#10b981;">created</strong> successfully!</p>
          
          <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Membership ID:</strong></td><td style="padding:6px 0;background:#0d4d89;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:600;letter-spacing:1px;">${membershipId}</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Plan:</strong></td><td style="padding:6px 0;">${req.body.planSelected} (${req.body.monthlyPlan})</td></tr>
              <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Valid Until:</strong></td><td style="padding:6px 0;">${membershipValidUntil}</td></tr>
            </table>
          </div>
          
          <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
            We look forward to seeing you reach your fitness goals! 💪
          </p>
        `;
        
        await sendEmail({
          to: req.body.memberEmail,
          subject: `Welcome to ${gym.gymName} - Membership Created`,
          title: `Welcome to ${gym.gymName}!`,
          preheader: 'Your membership has been created successfully',
          bodyHtml,
          action: {
            label: 'View Profile',
            url: `#member-${membershipId}`
          }
        });
      } else {
       
      }
    } catch (emailErr) {
      console.error('[MemberController] Error sending membership email:', emailErr);
      // Don't block member creation if email fails
    }

    res.status(201).json({ message: 'Member added successfully', member });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ message: 'Server error while adding member' });
  }
};

// Update member details
exports.updateMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const updateFields = {};

    // Only allow updating specific fields
    if (req.body.phone) updateFields.phone = req.body.phone;
    if (req.body.email) updateFields.email = req.body.email;
    if (req.body.address) updateFields.address = req.body.address;
    if (req.body.activityPreference) updateFields.activityPreference = req.body.activityPreference;

    if (req.file) {
      updateFields.profileImage = req.file.path; // Cloudinary secure_url
    }

    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.status(200).json({ message: 'Member updated successfully', member: updatedMember });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ message: 'Server error while updating member' });
  }
};

// Get all members for a gym
exports.getMembers = async (req, res) => {
  try {
    // Get gym ID from various sources: query parameter, admin object, or request body
    const gymId = req.query.gym || 
                  (req.admin && (req.admin.gymId || req.admin.id)) || 
                  req.body.gymId;
                  
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required.' });
    }
    
    const members = await Member.find({ gym: gymId });
    res.status(200).json({ members });
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ message: 'Server error while fetching members' });
  }
};

// Remove members by their custom membership IDs (bulk delete)
exports.removeMembersByIds = async (req, res) => {
  try {
    const { membershipIds } = req.body; // Array of custom membership IDs
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    
    if (!membershipIds || membershipIds.length === 0) {
      return res.status(400).json({ message: 'No membership IDs provided.' });
    }
    
    const result = await Member.deleteMany({
      gym: gymId,
      membershipId: { $in: membershipIds }
    });
    
    res.status(200).json({ message: `Removed ${result.deletedCount} member(s).`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing members by IDs:', err);
    res.status(500).json({ message: 'Server error while removing members.' });
  }
};

// Remove all members whose membership expired more than 7 days ago
exports.removeExpiredMembers = async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id)) || req.body.gymId;
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await Member.deleteMany({
      gym: gymId,
      membershipValidUntil: { $lt: sevenDaysAgo }
    });
    
    res.status(200).json({ message: `Removed ${result.deletedCount} expired member(s).`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error removing expired members:', err);
    res.status(500).json({ message: 'Server error while removing expired members.' });
  }
};

// Update member payment status
exports.updateMemberPaymentStatus = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { paymentStatus, pendingPaymentAmount, nextPaymentDue } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const updateData = { paymentStatus };
    if (pendingPaymentAmount !== undefined) updateData.pendingPaymentAmount = pendingPaymentAmount;
    if (nextPaymentDue) updateData.nextPaymentDue = nextPaymentDue;
    if (paymentStatus === 'paid') {
      updateData.lastPaymentDate = new Date();
      updateData.pendingPaymentAmount = 0;
    }
    
    const member = await Member.findOneAndUpdate(
      { _id: memberId, gym: gymId },
      updateData,
      { new: true }
    );
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }
    
    res.status(200).json({ 
      message: 'Member payment status updated successfully', 
      member 
    });
  } catch (err) {
    console.error('Error updating member payment status:', err);
    res.status(500).json({ message: 'Server error while updating payment status.' });
  }
};

// Get members with pending payments
exports.getMembersWithPendingPayments = async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const members = await Member.find({ 
      gym: gymId,
      paymentStatus: { $in: ['pending', 'overdue'] }
    });
    
    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching members with pending payments:', err);
    res.status(500).json({ message: 'Server error while fetching members.' });
  }
};

// Get members whose membership is expiring within 3 days or already expired
exports.getExpiringMembers = async (req, res) => {
  try {
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate 3 days from today
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const members = await Member.find({ gym: gymId });
    
    // Filter members whose membership is expiring within 3 days or expired
    const expiringMembers = members.filter(member => {
      if (!member.membershipValidUntil) return false;
      
      const expiryDate = new Date(member.membershipValidUntil);
      expiryDate.setHours(0, 0, 0, 0);
      
      // Include if expired or expiring within 3 days
      return expiryDate <= threeDaysFromNow;
    });
    
    // Add days remaining for each member
    const membersWithDays = expiringMembers.map(member => {
      const expiryDate = new Date(member.membershipValidUntil);
      expiryDate.setHours(0, 0, 0, 0);
      
      const diffTime = expiryDate - today;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...member.toObject(),
        daysRemaining,
        isExpired: daysRemaining < 0,
        isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 3
      };
    });
    
    res.status(200).json(membersWithDays);
  } catch (err) {
    console.error('Error fetching expiring members:', err);
    res.status(500).json({ message: 'Server error while fetching expiring members.' });
  }
};

// Grant 7-day allowance for a member
exports.grantSevenDayAllowance = async (req, res) => {
  try {
    const { memberId, planSelected, monthlyPlan, paymentAmount, activityPreference } = req.body;
    
    // Get gym ID from authenticated admin
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Determine the correct admin ID to use for createdBy
    let adminId = null;
    if (req.admin) {
      adminId = req.admin._id || req.admin.id || req.admin.adminId || req.admin.gymId;
    }
    
    // If no admin ID found, create a temporary ObjectId
    if (!adminId) {
      const mongoose = require('mongoose');
      console.warn('⚠️ No admin ID found, creating temporary ObjectId for createdBy field');
      adminId = new mongoose.Types.ObjectId();
    }
    
    // Find the member
    const member = await Member.findOne({ _id: memberId, gym: gymId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }
    
    // Calculate new validity period based on selected plan
    let months = 1;
    if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
    else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
    else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
    
    const currentDate = new Date();
    const newValidityDate = new Date(currentDate);
    newValidityDate.setMonth(newValidityDate.getMonth() + months);
    
    // Update member with 7-day allowance
    const memberUpdateData = {
      planSelected,
      monthlyPlan,
      activityPreference,
      paymentStatus: 'pending',
      pendingPaymentAmount: paymentAmount,
      allowanceGrantedDate: currentDate,
      allowanceExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      planStartDate: currentDate, // Store when allowance was granted
      plannedValidityDate: newValidityDate, // Store planned validity date after payment
    };
    
    const updatedMember = await Member.findByIdAndUpdate(memberId, memberUpdateData, { new: true });
    
    // Create payment record for the 7-day allowance
    const paymentData = {
      gym: gymId,
      member: memberId,
      amount: paymentAmount,
      paymentMethod: 'pending',
      paymentMode: 'pending',
      description: `7-Day Allowance - ${planSelected} (${monthlyPlan})`,
      category: 'membership-renewal',
      type: 'allowance',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: adminId
    };
    
    await Payment.create(paymentData);
    
    console.log('✅ 7-day allowance granted successfully:', {
      member: updatedMember.memberName,
      plan: planSelected,
      amount: paymentAmount,
      allowanceExpiry: memberUpdateData.allowanceExpiryDate
    });
    
    res.status(200).json({
      message: '7-day allowance granted successfully',
      member: updatedMember
    });
    
  } catch (error) {
    console.error('❌ Error granting 7-day allowance:', error);
    res.status(500).json({ 
      message: 'Error granting 7-day allowance', 
      error: error.message 
    });
  }
};

// Mark payment as paid and activate membership
exports.markPaymentAsPaid = async (req, res) => {
  try {
    const { memberId, amountReceived, paymentMethod, paymentDate, notes, source } = req.body;
    
    // Get gym ID from authenticated admin
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    // Determine the correct admin ID to use for createdBy
    let adminId = null;
    if (req.admin) {
      adminId = req.admin._id || req.admin.id || req.admin.adminId || req.admin.gymId;
    }
    
    // If no admin ID found, create a temporary ObjectId
    if (!adminId) {
      const mongoose = require('mongoose');
      console.warn('⚠️ No admin ID found, creating temporary ObjectId for createdBy field');
      adminId = new mongoose.Types.ObjectId();
    }
    
    // Find the member
    const member = await Member.findOne({ _id: memberId, gym: gymId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found.' });
    }
    
    // Check if member has pending payments
    if (member.paymentStatus !== 'pending' || !member.pendingPaymentAmount) {
      return res.status(400).json({ message: 'No pending payment found for this member.' });
    }
    
    // Calculate the new membership validity date
    // Start from allowance granted date (when the plan was supposed to start)
    const startDate = member.planStartDate || member.allowanceGrantedDate || new Date();
    const newValidityDate = member.plannedValidityDate || new Date(startDate);
    
    // If planned validity date wasn't set, calculate it now
    if (!member.plannedValidityDate) {
      let months = 1;
      if (/3\s*Months?/i.test(member.monthlyPlan)) months = 3;
      else if (/6\s*Months?/i.test(member.monthlyPlan)) months = 6;
      else if (/12\s*Months?/i.test(member.monthlyPlan)) months = 12;
      
      newValidityDate.setMonth(newValidityDate.getMonth() + months);
    }
    
    // Update member status
    const memberUpdateData = {
      paymentStatus: 'paid',
      pendingPaymentAmount: 0,
      allowanceGrantedDate: null,
      allowanceExpiryDate: null,
      planStartDate: null,
      plannedValidityDate: null,
      membershipValidUntil: newValidityDate,
      paymentAmount: amountReceived,
      lastPaymentDate: new Date(paymentDate)
    };
    
    const updatedMember = await Member.findByIdAndUpdate(memberId, memberUpdateData, { new: true });
    
    // Update pending payment record to completed
    await Payment.findOneAndUpdate(
      { 
        gym: gymId, 
        member: memberId, 
        status: 'pending',
        type: 'allowance'
      },
      { 
        status: 'completed',
        paymentMethod,
        paymentMode: paymentMethod,
        actualAmount: amountReceived,
        paymentDate: new Date(paymentDate),
        notes: notes || `Payment received via ${source || 'admin panel'}`,
        completedBy: adminId,
        completedAt: new Date()
      }
    );
    
    // Create a new payment record for the completed payment
    const completedPaymentData = {
      gym: gymId,
      member: memberId,
      amount: amountReceived,
      paymentMethod,
      paymentMode: paymentMethod,
      description: `Membership Payment - ${member.planSelected} (${member.monthlyPlan})`,
      category: 'membership-payment',
      type: 'completed',
      status: 'completed',
      paymentDate: new Date(paymentDate),
      notes: notes || `Payment received via ${source || 'admin panel'}`,
      createdBy: adminId
    };
    
    await Payment.create(completedPaymentData);
    
    console.log('✅ Payment marked as paid successfully:', {
      member: updatedMember.memberName,
      amount: amountReceived,
      method: paymentMethod,
      newValidity: newValidityDate
    });
    
    res.status(200).json({
      message: 'Payment marked as paid successfully',
      member: updatedMember,
      newValidityDate
    });
    
  } catch (error) {
    console.error('❌ Error marking payment as paid:', error);
    res.status(500).json({ 
      message: 'Error marking payment as paid', 
      error: error.message 
    });
  }
};

// OLD CASH VALIDATION FUNCTION - DISABLED TO AVOID CONFLICTS
// This function has been replaced by cashValidationController.js

// OLD CASH VALIDATION FUNCTION - DISABLED TO AVOID CONFLICTS
// This function has been replaced by cashValidationController.js

// OLD QR REGISTRATION FUNCTION - REMOVED TO AVOID CONFLICTS  
// OLD QR REGISTRATION FUNCTION - REMOVED TO AVOID CONFLICTS
// This function has been moved to qrRegistrationController.js


// Add membership plan to existing member (for handling duplicate member scenario)
exports.addMembershipPlan = async (req, res) => {
  try {
    const { memberId, newPlan, paymentMethod = 'cash', paymentStatus = 'paid' } = req.body;
    
    // Get gym ID from authenticated admin
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));
    if (!gymId) return res.status(400).json({ message: 'Gym ID is required.' });
    
    console.log('🔄 Adding new membership plan to existing member:', memberId);
    
    // Find the existing member
    const member = await Member.findOne({ 
      $or: [
        { _id: memberId },
        { membershipId: memberId }
      ],
      gym: gymId 
    });
    
    if (!member) {
      return res.status(404).json({ 
        message: 'Member not found.',
        code: 'MEMBER_NOT_FOUND'
      });
    }
    
    // Calculate validity based on plan
    let months = 1;
    let planType = 'monthly';
    
    if (/3\s*month/i.test(newPlan)) {
      months = 3;
      planType = 'quarterly';
    } else if (/6\s*month/i.test(newPlan)) {
      months = 6;
      planType = 'half-yearly';
    } else if (/annual|yearly|12\s*month/i.test(newPlan)) {
      months = 12;
      planType = 'annual';
    }
    
    // Calculate new validity dates
    const currentDate = new Date();
    const newValidFrom = new Date(currentDate);
    const newValidTo = new Date(currentDate);
    newValidTo.setMonth(newValidTo.getMonth() + months);
    
    // Update member with new plan
    const updateData = {
      membershipPlan: newPlan,
      validFrom: newValidFrom,
      validTo: newValidTo,
      paymentStatus: paymentStatus,
      lastPaymentMethod: paymentMethod,
      lastPaymentDate: currentDate,
      updatedAt: currentDate
    };
    
    // If member was inactive, activate them
    if (member.status !== 'active') {
      updateData.status = 'active';
    }
    
    // Update the member
    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    // Create payment record
    try {
      const paymentData = {
        member: member._id,
        gym: gymId,
        amount: 0, // Default amount - should be updated based on actual plan pricing
        currency: 'INR',
        method: paymentMethod,
        status: paymentStatus,
        planName: newPlan,
        planType: planType,
        validityMonths: months,
        validFrom: newValidFrom,
        validTo: newValidTo,
        transactionId: `CASH_${member.membershipId}_${Date.now()}`,
        adminProcessed: req.admin?._id || req.admin?.id,
        processedAt: currentDate,
        notes: `Membership plan updated for existing member - ${newPlan}`
      };
      
      await Payment.create(paymentData);
      console.log('💳 Payment record created for membership update');
      
    } catch (paymentError) {
      console.error('⚠️ Error creating payment record:', paymentError);
      // Continue even if payment record creation fails
    }
    
    // Send confirmation email
    try {
      const gym = await Gym.findById(gymId);
      const gymName = gym ? gym.name : 'Your Gym';
      
      await sendMembershipUpdateConfirmationEmail({
        to: member.email,
        memberName: member.firstName ? `${member.firstName} ${member.lastName}` : member.memberName,
        memberId: member.membershipId,
        newPlan: newPlan,
        validFrom: newValidFrom.toLocaleDateString('en-IN'),
        validTo: newValidTo.toLocaleDateString('en-IN'),
        gymName: gymName
      });
      
      console.log('📧 Membership update confirmation email sent');
      
    } catch (emailError) {
      console.error('📧 Error sending confirmation email:', emailError);
      // Continue even if email fails
    }
    
    // Send success response
    res.status(200).json({
      success: true,
      message: 'Membership plan updated successfully',
      member: {
        id: updatedMember._id,
        membershipId: updatedMember.membershipId,
        name: updatedMember.firstName ? `${updatedMember.firstName} ${updatedMember.lastName}` : updatedMember.memberName,
        email: updatedMember.email,
        phone: updatedMember.phone,
        membershipPlan: updatedMember.planSelected, // Map to existing field
        planSelected: updatedMember.planSelected,
        monthlyPlan: updatedMember.monthlyPlan,
        status: updatedMember.status,
        validFrom: updatedMember.validFrom,
        validTo: updatedMember.validTo,
        paymentStatus: updatedMember.paymentStatus
      }
    });
    
  } catch (error) {
    console.error('❌ Error adding membership plan to existing member:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update membership plan',
      error: error.message,
      code: 'MEMBERSHIP_UPDATE_FAILED'
    });
  }
};

// Send membership update confirmation email
async function sendMembershipUpdateConfirmationEmail({ to, memberName, memberId, newPlan, validFrom, validTo, gymName }) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white; padding: 32px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Membership Updated!</h1>
        <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your membership plan has been successfully updated</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px;">📋 Updated Membership Details</h2>
          
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.1);">
              <span style="font-weight: 600; color: #4b5563;">Member ID:</span>
              <span style="color: #1f2937; background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">${memberId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.1);">
              <span style="font-weight: 600; color: #4b5563;">Name:</span>
              <span style="color: #1f2937;">${memberName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.1);">
              <span style="font-weight: 600; color: #4b5563;">New Plan:</span>
              <span style="color: #1f2937; font-weight: 600;">${newPlan}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.1);">
              <span style="font-weight: 600; color: #4b5563;">Valid From:</span>
              <span style="color: #1f2937;">${validFrom}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.1);">
              <span style="font-weight: 600; color: #4b5563;">Valid To:</span>
              <span style="color: #1f2937;">${validTo}</span>
            </div>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%); border: 1px solid #4caf50; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
          <h3 style="color: #388e3c; margin: 0 0 8px 0;">Payment Confirmed</h3>
          <p style="color: #2e7d32; margin: 0; font-size: 14px;">Your membership has been updated and is now active!</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%); border: 1px solid #2196f3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #1976d2; margin: 0 0 16px 0;">🎯 What's Next?</h3>
          <ul style="margin: 0; padding-left: 16px; color: #1565c0;">
            <li style="margin-bottom: 8px;">Visit the gym with your member ID</li>
            <li style="margin-bottom: 8px;">Your updated membership is now active</li>
            <li style="margin-bottom: 8px;">Access all facilities as per your new plan</li>
            <li>Contact us if you have any questions</li>
          </ul>
        </div>
        
        <div style="text-align: center; padding: 16px; background: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Need help?</strong> Contact <strong>${gymName}</strong> support team<br>
            This is an automated confirmation for your membership update.
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail({
    to,
    subject: `✅ Membership Updated - Welcome Back to ${gymName}!`,
    title: `Membership Updated Successfully`,
    preheader: 'Your membership details have been updated',
    bodyHtml: `
      <p>Hi <strong style="color:#10b981;">${memberName}</strong>,</p>
      <p>✅ Your membership at <strong>${gymName}</strong> has been <strong style="color:#10b981;">updated</strong> successfully!</p>
      
      <div style="background:#1e293b;border:1px solid #334155;padding:18px;border-radius:14px;margin:18px 0;">
        <table style="width:100%;font-size:13px;">
          <tr><td style="padding:6px 0;color:#94a3b8;width:140px;"><strong>Member ID:</strong></td><td style="padding:6px 0;background:#0d4d89;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:600;letter-spacing:1px;">${memberId}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Plan:</strong></td><td style="padding:6px 0;">${planSelected} (${duration})</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;"><strong>Valid Until:</strong></td><td style="padding:6px 0;">${validTill}</td></tr>
        </table>
      </div>
      
      <div style="background:#1e293b;border:1px solid #334155;padding:14px;border-radius:10px;margin:16px 0;">
        <h4 style="color:#38bdf8;margin:0 0 12px 0;">🎯 What's Next?</h4>
        <ul style="margin:0;padding-left:16px;color:#cbd5e1;font-size:14px;">
          <li style="margin-bottom:6px;">Visit the gym with your member ID</li>
          <li style="margin-bottom:6px;">Your updated membership is now active</li>
          <li style="margin-bottom:6px;">Access all facilities as per your new plan</li>
          <li>Contact us if you have any questions</li>
        </ul>
      </div>
      
      <p style="color:#cbd5e1;font-size:14px;text-align:center;margin-top:20px;">
        <strong>Need help?</strong> Contact <strong>${gymName}</strong> support team
      </p>
    `,
    action: {
      label: 'Contact Support',
      url: `#support-${gymId}`
    }
  });
}

// Check if user has active membership at a gym
exports.checkUserMembership = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userEmail = req.user.email;

    console.log('🔍 Checking membership for:', { gymId, userEmail });

    // Find active membership
    const activeMember = await Member.findOne({
      gym: gymId,
      email: userEmail,
      membershipValidUntil: { $gte: new Date().toISOString().split('T')[0] }
    });

    if (!activeMember) {
      return res.json({
        success: true,
        hasActiveMembership: false
      });
    }

    res.json({
      success: true,
      hasActiveMembership: true,
      membership: {
        membershipId: activeMember.membershipId,
        memberName: activeMember.memberName,
        planSelected: activeMember.planSelected,
        monthlyPlan: activeMember.monthlyPlan,
        joinDate: activeMember.joinDate,
        validUntil: activeMember.membershipValidUntil,
        activityPreference: activeMember.activityPreference,
        profileImage: activeMember.profileImage
      }
    });

  } catch (error) {
    console.error('Error checking user membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check membership status',
      error: error.message
    });
  }
};

// Freeze membership
exports.freezeMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { freezeDays, reason } = req.body;
    const userEmail = req.user.email;

    console.log('🔍 Freeze membership request:', { membershipId, freezeDays, userEmail });

    // Validate freeze days (7-15 days)
    if (!freezeDays || freezeDays < 7 || freezeDays > 15) {
      return res.status(400).json({
        success: false,
        message: 'Freeze duration must be between 7 and 15 days'
      });
    }

    // Find the membership
    const member = await Member.findOne({
      _id: membershipId,
      email: userEmail
    }).populate('gym');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    // Check if gym allows membership freezing
    if (member.gym && member.gym.allowMembershipFreezing === false) {
      return res.status(403).json({
        success: false,
        message: 'Membership freezing is not allowed by your gym'
      });
    }

    // Validate membershipValidUntil date
    if (!member.membershipValidUntil) {
      return res.status(400).json({
        success: false,
        message: 'Membership validity date is not set'
      });
    }

    // Check if membership is valid
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validUntil = new Date(member.membershipValidUntil);
    
    // Check if date is valid
    if (isNaN(validUntil.getTime())) {
      console.error('Invalid membership valid until date:', member.membershipValidUntil);
      return res.status(400).json({
        success: false,
        message: 'Invalid membership validity date format'
      });
    }
    
    if (validUntil < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot freeze expired membership'
      });
    }

    // Check if already frozen
    if (member.currentlyFrozen) {
      return res.status(400).json({
        success: false,
        message: 'Membership is already frozen'
      });
    }

    // Check if already used freeze in this membership period
    if (member.totalFreezeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'You can only freeze membership once per membership duration'
      });
    }

    // Calculate freeze period
    const freezeStartDate = new Date();
    const freezeEndDate = new Date(freezeStartDate);
    freezeEndDate.setDate(freezeEndDate.getDate() + freezeDays);

    // Extend membership validity by freeze days
    const newValidUntil = new Date(validUntil);
    newValidUntil.setDate(newValidUntil.getDate() + freezeDays);

    // Update member
    member.currentlyFrozen = true;
    member.freezeStartDate = freezeStartDate;
    member.freezeEndDate = freezeEndDate;
    member.totalFreezeCount = (member.totalFreezeCount || 0) + 1;
    member.membershipValidUntil = newValidUntil.toISOString().split('T')[0];

    // Add to freeze history
    if (!member.freezeHistory) {
      member.freezeHistory = [];
    }
    member.freezeHistory.push({
      freezeStartDate,
      freezeEndDate,
      freezeDays,
      reason: reason || 'User requested freeze',
      requestedAt: new Date()
    });

    await member.save();

    // Create notification for gym admin about the freeze
    try {
      const Notification = require('../models/Notification');
      
      const notification = new Notification({
        title: 'Membership Freeze Request',
        message: `${member.memberName} has frozen their membership for ${freezeDays} days${reason ? `. Reason: ${reason}` : ''}`,
        type: 'membership-freeze',
        priority: 'normal',
        icon: 'fa-pause-circle',
        color: '#2196f3',
        user: member.gym,
        metadata: {
          memberName: member.memberName,
          membershipId: member.membershipId,
          freezeDays,
          reason: reason || 'User requested freeze',
          freezeStartDate: freezeStartDate.toISOString(),
          freezeEndDate: freezeEndDate.toISOString(),
          memberId: member._id
        }
      });
      await notification.save();
      console.log('✅ Freeze notification created for gym admin');
    } catch (notifError) {
      console.error('Error creating freeze notification:', notifError);
      // Don't block freeze if notification fails
    }

    res.json({
      success: true,
      message: 'Membership frozen successfully',
      membership: {
        membershipId: member.membershipId,
        freezeStartDate: freezeStartDate.toISOString(),
        freezeEndDate: freezeEndDate.toISOString(),
        freezeDays,
        newValidUntil: newValidUntil.toISOString().split('T')[0],
        daysExtended: freezeDays
      }
    });

  } catch (error) {
    console.error('Error freezing membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to freeze membership',
      error: error.message
    });
  }
};

// Get membership details for pass
exports.getMembershipPass = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const userEmail = req.user.email;

    console.log('🔍 Get membership pass:', { membershipId, userEmail });

    const member = await Member.findOne({
      _id: membershipId,
      email: userEmail
    }).populate('gym', 'name gymName address city state logo');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membership not found'
      });
    }

    res.json({
      success: true,
      pass: {
        membershipId: member.membershipId,
        memberName: member.memberName,
        profileImage: member.profileImage,
        planSelected: member.planSelected,
        monthlyPlan: member.monthlyPlan,
        joinDate: member.joinDate,
        validUntil: member.membershipValidUntil,
        activityPreference: member.activityPreference,
        gym: member.gym,
        currentlyFrozen: member.currentlyFrozen,
        freezeStartDate: member.freezeStartDate,
        freezeEndDate: member.freezeEndDate,
        passId: member.passId,
        passQRCode: member.passQRCode
      }
    });

  } catch (error) {
    console.error('Error getting membership pass:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get membership pass',
      error: error.message
    });
  }
};

// Extend membership validity (Gym Admin only)
exports.extendMembership = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { days, reason } = req.body;
    const gymId = (req.admin && (req.admin.gymId || req.admin.id));

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: 'Gym ID is required'
      });
    }

    // Validate days (1-90 days)
    if (!days || days < 1 || days > 90) {
      return res.status(400).json({
        success: false,
        message: 'Extension days must be between 1 and 90'
      });
    }

    // Find the membership
    const member = await Member.findOne({
      _id: memberId,
      gym: gymId
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Get current valid until date
    const currentValidUntil = new Date(member.membershipValidUntil);
    
    // Extend membership by specified days
    const newValidUntil = new Date(currentValidUntil);
    newValidUntil.setDate(newValidUntil.getDate() + days);

    // Update member
    member.membershipValidUntil = newValidUntil.toISOString().split('T')[0];
    
    await member.save();

    // Create activity log for extension
    const Activity = require('../models/Activity');
    await Activity.create({
      gym: gymId,
      type: 'membership_extended',
      description: `Extended membership for ${member.memberName} by ${days} days${reason ? ': ' + reason : ''}`,
      metadata: {
        memberId: member._id,
        memberName: member.memberName,
        daysExtended: days,
        previousValidUntil: currentValidUntil.toISOString().split('T')[0],
        newValidUntil: newValidUntil.toISOString().split('T')[0],
        reason: reason || 'Admin extension'
      }
    });

    res.json({
      success: true,
      message: 'Membership extended successfully',
      data: {
        memberId: member._id,
        memberName: member.memberName,
        previousValidUntil: currentValidUntil.toISOString().split('T')[0],
        newValidUntil: newValidUntil.toISOString().split('T')[0],
        daysExtended: days
      }
    });

  } catch (error) {
    console.error('Error extending membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend membership',
      error: error.message
    });
  }
};

