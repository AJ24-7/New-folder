const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const IDPassGenerator = require('../services/idPassGenerator');
const path = require('path');
const fs = require('fs');

// Ensure passes directory exists
const passesDir = path.join(__dirname, '../../uploads/member-passes');
if (!fs.existsSync(passesDir)) {
  fs.mkdirSync(passesDir, { recursive: true });
}

/**
 * @route   GET /api/id-pass/test
 * @desc    Test endpoint to verify routes are working
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'ID Pass routes are working correctly!',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/id-pass/generate/:memberId
 * @desc    Generate ID pass for a member
 * @access  Public (can be restricted with auth middleware)
 */
router.get('/generate/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Find member by membershipId
    const member = await Member.findOne({ membershipId: memberId }).populate('gym');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if member is active
    const isActive = member.membershipValidUntil ? 
      new Date(member.membershipValidUntil) >= new Date() : false;

    // Generate pass ID if not exists
    if (!member.passId) {
      member.passId = IDPassGenerator.generatePassId();
    }

    // Prepare member data for pass generation
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
      isActive,
      gym: member.gym ? {
        _id: member.gym._id,
        name: member.gym.name,
        city: member.gym.city,
        state: member.gym.state
      } : null,
      profileImage: member.profileImage ? 
        path.join(__dirname, '../../', member.profileImage) : null
    };

    // Generate QR code
    const qrCodeDataUrl = await IDPassGenerator.generateQRCode(memberData);
    
    // Generate PDF pass
    const passFileName = `${member.passId}.pdf`;
    const passFilePath = path.join(passesDir, passFileName);
    
    await IDPassGenerator.generatePass(memberData, passFilePath);

    // Update member with pass information
    member.passQRCode = qrCodeDataUrl;
    member.passFilePath = `/uploads/member-passes/${passFileName}`;
    member.passGeneratedDate = new Date();
    await member.save();

    res.json({
      success: true,
      message: 'ID pass generated successfully',
      pass: {
        passId: member.passId,
        qrCode: qrCodeDataUrl,
        downloadUrl: member.passFilePath,
        generatedDate: member.passGeneratedDate
      }
    });

  } catch (error) {
    console.error('Error generating ID pass:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate ID pass',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/id-pass/by-email/:email
 * @desc    Generate ID pass for a member by email
 * @access  Public (can be restricted with auth middleware)
 */
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find member by email
    const member = await Member.findOne({ 
      email: email.toLowerCase().trim() 
    }).populate('gym');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found with this email'
      });
    }

    // Check if member is active
    const isActive = member.membershipValidUntil ? 
      new Date(member.membershipValidUntil) >= new Date() : false;

    // Generate pass ID if not exists
    if (!member.passId) {
      member.passId = IDPassGenerator.generatePassId();
    }

    // Prepare member data for pass generation
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
      isActive,
      gym: member.gym ? {
        _id: member.gym._id,
        name: member.gym.name,
        city: member.gym.city,
        state: member.gym.state
      } : null,
      profileImage: member.profileImage ? 
        path.join(__dirname, '../../', member.profileImage) : null
    };

    // Generate QR code
    const qrCodeDataUrl = await IDPassGenerator.generateQRCode(memberData);
    
    // Generate PDF pass
    const passFileName = `${member.passId}.pdf`;
    const passFilePath = path.join(passesDir, passFileName);
    
    await IDPassGenerator.generatePass(memberData, passFilePath);

    // Update member with pass information
    member.passQRCode = qrCodeDataUrl;
    member.passFilePath = `/uploads/member-passes/${passFileName}`;
    member.passGeneratedDate = new Date();
    await member.save();

    res.json({
      success: true,
      message: 'ID pass generated successfully',
      member: {
        membershipId: member.membershipId,
        memberName: member.memberName,
        email: member.email,
        planSelected: member.planSelected,
        isActive
      },
      pass: {
        passId: member.passId,
        qrCode: qrCodeDataUrl,
        downloadUrl: member.passFilePath,
        generatedDate: member.passGeneratedDate
      }
    });

  } catch (error) {
    console.error('Error generating ID pass:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate ID pass',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/id-pass/download/:passId
 * @desc    Download ID pass PDF
 * @access  Public
 */
router.get('/download/:passId', async (req, res) => {
  try {
    const { passId } = req.params;
    
    const passFilePath = path.join(passesDir, `${passId}.pdf`);
    
    if (!fs.existsSync(passFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Pass file not found'
      });
    }

    res.download(passFilePath, `Gym-Wale-Member-Pass-${passId}.pdf`, (err) => {
      if (err) {
        console.error('Error downloading pass:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download pass'
        });
      }
    });

  } catch (error) {
    console.error('Error downloading pass:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download pass',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/id-pass/verify/:qrData
 * @desc    Verify member by scanning QR code
 * @access  Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR data is required'
      });
    }

    // Parse QR data
    const memberInfo = JSON.parse(qrData);
    
    // Verify it's a Gym-Wale pass
    if (memberInfo.type !== 'gym-wale-member-pass') {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code'
      });
    }

    // Find member in database
    const member = await Member.findOne({ 
      membershipId: memberInfo.memberId 
    }).populate('gym');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
        verified: false
      });
    }

    // Check if membership is still active
    const isActive = member.membershipValidUntil ? 
      new Date(member.membershipValidUntil) >= new Date() : false;

    res.json({
      success: true,
      verified: true,
      message: isActive ? 'Member verified successfully' : 'Membership has expired',
      member: {
        membershipId: member.membershipId,
        memberName: member.memberName,
        email: member.email,
        phone: member.phone,
        planSelected: member.planSelected,
        monthlyPlan: member.monthlyPlan,
        isActive,
        validUntil: member.membershipValidUntil,
        gym: member.gym ? {
          name: member.gym.name,
          city: member.gym.city,
          state: member.gym.state
        } : null
      }
    });

  } catch (error) {
    console.error('Error verifying member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify member',
      error: error.message,
      verified: false
    });
  }
});

/**
 * @route   GET /api/id-pass/regenerate/:memberId
 * @desc    Regenerate ID pass for a member (e.g., after membership renewal)
 * @access  Public
 */
router.get('/regenerate/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    const member = await Member.findOne({ membershipId: memberId }).populate('gym');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Delete old pass file if exists
    if (member.passFilePath) {
      const oldPassPath = path.join(__dirname, '../../', member.passFilePath);
      if (fs.existsSync(oldPassPath)) {
        fs.unlinkSync(oldPassPath);
      }
    }

    // Generate new pass ID
    member.passId = IDPassGenerator.generatePassId();

    // Check if member is active
    const isActive = member.membershipValidUntil ? 
      new Date(member.membershipValidUntil) >= new Date() : false;

    // Prepare member data
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
      isActive,
      gym: member.gym ? {
        _id: member.gym._id,
        name: member.gym.name,
        city: member.gym.city,
        state: member.gym.state
      } : null,
      profileImage: member.profileImage ? 
        path.join(__dirname, '../../', member.profileImage) : null
    };

    // Generate new QR code and pass
    const qrCodeDataUrl = await IDPassGenerator.generateQRCode(memberData);
    const passFileName = `${member.passId}.pdf`;
    const passFilePath = path.join(passesDir, passFileName);
    
    await IDPassGenerator.generatePass(memberData, passFilePath);

    // Update member
    member.passQRCode = qrCodeDataUrl;
    member.passFilePath = `/uploads/member-passes/${passFileName}`;
    member.passGeneratedDate = new Date();
    await member.save();

    res.json({
      success: true,
      message: 'ID pass regenerated successfully',
      pass: {
        passId: member.passId,
        qrCode: qrCodeDataUrl,
        downloadUrl: member.passFilePath,
        generatedDate: member.passGeneratedDate
      }
    });

  } catch (error) {
    console.error('Error regenerating ID pass:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate ID pass',
      error: error.message
    });
  }
});

module.exports = router;
