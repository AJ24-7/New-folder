const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Trainer = require('../models/trainerModel');
const sendEmail = require('../utils/sendEmail');

function signTrainerToken(trainer) {
  const payload = { trainerId: trainer._id, type: 'trainer_access' };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production', { expiresIn: '2h' });
}

exports.login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if ((!email && !phone) || !password) {
      return res.status(400).json({ success: false, message: 'Email or phone and password required' });
    }
    const query = email ? { email } : { phone };
    const trainer = await Trainer.findOne(query).select('+password');
    if (!trainer) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // If legacy trainer document missing password (created before auth feature)
    if (!trainer.password) {
      return res.status(400).json({
        success: false,
        code: 'PASSWORD_NOT_SET',
        message: 'Password not set for this trainer account. Use Forgot Password to create one.'
      });
    }

    let match = false;
    try {
      match = await bcrypt.compare(password, trainer.password);
    } catch (cmpErr) {
      console.error('bcrypt compare error (trainer login):', cmpErr);
      return res.status(500).json({ success:false, message: 'Authentication error' });
    }
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Enforce dual approval (status + verification)
    if (trainer.status !== 'approved' || trainer.verificationStatus !== 'verified') {
      // Provide clearer messaging but avoid leaking which part failed for security.
      let detail = '';
      if (trainer.status !== 'approved') {
        detail = trainer.status === 'pending' ? 'Awaiting admin approval.' : `Status: ${trainer.status}.`;
      } else if (trainer.verificationStatus !== 'verified') {
        detail = trainer.verificationStatus === 'pending' ? 'Awaiting identity verification.' : `Verification: ${trainer.verificationStatus}.`;
      }
      return res.status(403).json({
        success: false,
        code: 'TRAINER_NOT_APPROVED',
        message: 'Not a valid trainer id or approval pending',
        detail
      });
    }

    const token = signTrainerToken(trainer);
    res.json({
      success: true,
      token,
      trainer: {
        id: trainer._id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        specialty: trainer.specialty,
        trainerType: trainer.trainerType,
        gym: trainer.gym,
        rateTypes: trainer.rateTypes,
        hourlyRate: trainer.hourlyRate,
        monthlyRate: trainer.monthlyRate
      }
    });
  } catch (err) {
    console.error('Trainer login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer.id);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
    res.json({
      success: true,
      trainer: {
        id: trainer._id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        specialty: trainer.specialty,
        experience: trainer.experience,
        bio: trainer.bio,
        availability: trainer.availability,
        locations: trainer.locations,
        serviceArea: trainer.serviceArea,
        rateTypes: trainer.rateTypes,
        hourlyRate: trainer.hourlyRate,
        monthlyRate: trainer.monthlyRate,
        photo: trainer.photo ? `/uploads/trainers/${trainer.photo}` : null,
        trainerType: trainer.trainerType,
        gym: trainer.gym,
        status: trainer.status,
        verificationStatus: trainer.verificationStatus
      }
    });
  } catch (err) {
    console.error('Trainer profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['firstName','lastName','specialty','bio','availability','locations','hourlyRate','monthlyRate'];
    const update = {};
    for (const key of allowed) {
      if (key in req.body) update[key] = req.body[key];
    }
    const trainer = await Trainer.findByIdAndUpdate(req.trainer.id, update, { new: true });
    res.json({ success: true, trainer });
  } catch (err) {
    console.error('Trainer update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ========== Password Reset (Trainer) ============= //
function generateOTP() { return Math.floor(100000 + Math.random()*900000).toString(); }

exports.forgotPassword = async (req,res) => {
  try {
    const { email, phone } = req.body || {};
    if (!email && !phone) return res.status(400).json({ success:false, message:'Email or phone required'});
    const query = email ? { email } : { phone };
    const trainer = await Trainer.findOne(query).select('+resetPasswordOTP +resetPasswordOTPExpiry rateTypes hourlyRate monthlyRate');
    if (!trainer) return res.status(200).json({ success:true, message:'If the account exists, an OTP was sent.'});
    const otp = generateOTP();
    trainer.resetPasswordOTP = otp;
    trainer.resetPasswordOTPExpiry = new Date(Date.now() + 10*60*1000);
    // Legacy data fix: some older trainer docs may be missing required hourlyRate/monthlyRate per rateTypes.
    // We don't want password reset to fail due to legacy incomplete pricing fields.
    let legacyRatePatched = false;
    try {
      if (Array.isArray(trainer.rateTypes)) {
        if (trainer.rateTypes.includes('hourly') && (trainer.hourlyRate == null || trainer.hourlyRate === '')) {
          trainer.hourlyRate = 100; // sensible minimum fallback
          legacyRatePatched = true;
        }
        if (trainer.rateTypes.includes('monthly') && (trainer.monthlyRate == null || trainer.monthlyRate === '')) {
          trainer.monthlyRate = 2000; // sensible minimum fallback
          legacyRatePatched = true;
        }
      }
      // Save without triggering full validation if legacy issues remain
      await trainer.save({ validateBeforeSave: !legacyRatePatched });
    } catch (saveErr) {
      console.warn('[forgotPassword] primary save failed, attempting validation bypass updateOne', saveErr.message);
      try {
        await Trainer.updateOne({ _id: trainer._id }, { $set: { resetPasswordOTP: trainer.resetPasswordOTP, resetPasswordOTPExpiry: trainer.resetPasswordOTPExpiry, hourlyRate: trainer.hourlyRate ?? undefined, monthlyRate: trainer.monthlyRate ?? undefined } });
      } catch (updErr) {
        console.error('[forgotPassword] failed to persist OTP update', updErr);
        return res.status(500).json({ success:false, message:'Unable to initiate password reset at this time' });
      }
    }
    // Send email if email exists
    if (trainer.email) {
      try {
        await sendEmail({
          to: trainer.email,
          subject: 'Trainer Password Reset OTP',
          title: 'Password Reset Request',
            bodyHtml: `<p>Your OTP for resetting your Gym-Wale trainer password is:</p>
              <div style='font-size:24px;font-weight:700;letter-spacing:4px;margin:12px 0 18px;color:#3a86ff;'>${otp}</div>
              <p>This code is valid for 10 minutes. If you did not request this, you can ignore this email.</p>`
        });
      } catch(emailErr){ console.error('Trainer reset email failed', emailErr.message); }
    }
    res.json({ success:true, message:'OTP sent if account exists' });
  } catch(err){
    console.error('Trainer forgotPassword error', err);
    res.status(500).json({ success:false, message:'Server error'});
  }
};

exports.verifyOTP = async (req,res) => {
  try {
    const { email, phone, otp } = req.body || {};
    if ((!email && !phone) || !otp) return res.status(400).json({ success:false, message:'Identifier and OTP required'});
    const query = email ? { email } : { phone };
    const trainer = await Trainer.findOne(query).select('+resetPasswordOTP +resetPasswordOTPExpiry');
    if (!trainer || !trainer.resetPasswordOTP || !trainer.resetPasswordOTPExpiry) {
      return res.status(400).json({ success:false, message:'Invalid or expired OTP'});
    }
    if (trainer.resetPasswordOTP !== otp) return res.status(400).json({ success:false, message:'Invalid OTP'});
    if (trainer.resetPasswordOTPExpiry < new Date()) return res.status(400).json({ success:false, message:'OTP expired'});
    // Issue short-lived token for password reset
    const resetToken = jwt.sign({ trainerId: trainer._id, type:'trainer_password_reset' }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production', { expiresIn:'15m' });
    res.json({ success:true, message:'OTP verified', resetToken });
  } catch(err){
    console.error('Trainer verifyOTP error', err);
    res.status(500).json({ success:false, message:'Server error'});
  }
};

exports.resetPassword = async (req,res) => {
  try {
    let { resetToken, newPassword } = req.body || {};
    // Support token via Authorization header: Bearer <token>
    if (!resetToken && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        resetToken = parts[1];
      }
    }
    // Accept alternate keys for safety (frontend might send password/newPwd)
    if (!newPassword) {
      if (req.body?.password) newPassword = req.body.password;
      else if (req.body?.newPwd) newPassword = req.body.newPwd;
    }

    if (!resetToken || !newPassword) {
      console.warn('[trainer resetPassword] Missing data', { hasToken: !!resetToken, hasNewPassword: !!newPassword, bodyKeys: Object.keys(req.body||{}) });
      return res.status(400).json({ success:false, message:'resetToken and newPassword required'});
    }
    if (newPassword.length < 6) return res.status(400).json({ success:false, message:'Password must be at least 6 characters'});
    let decoded;
    try { decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'); }
    catch(e){
      console.warn('[trainer resetPassword] token verify failed', e.message);
      return res.status(400).json({ success:false, message:'Invalid or expired reset token'});
    }
    if (decoded.type !== 'trainer_password_reset') return res.status(400).json({ success:false, message:'Invalid token type'});
    const trainer = await Trainer.findById(decoded.trainerId).select('+password +resetPasswordOTP +resetPasswordOTPExpiry');
    if (!trainer) return res.status(404).json({ success:false, message:'Trainer not found'});
    trainer.password = newPassword; // pre-save hook will hash
    trainer.resetPasswordOTP = undefined;
    trainer.resetPasswordOTPExpiry = undefined;
    await trainer.save();
    console.log('[trainer resetPassword] success for trainer', trainer._id.toString());
    res.json({ success:true, message:'Password reset successful'});
  } catch(err){
    console.error('Trainer resetPassword error', err);
    res.status(500).json({ success:false, message:'Server error'});
  }
};
