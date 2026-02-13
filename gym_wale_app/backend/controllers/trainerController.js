
// backend/controllers/trainerController.js
const Trainer = require('../models/trainerModel');
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail'); 
const adminNotificationService = require('../services/adminNotificationService');
const nodemailer = require('nodemailer'); 
const adminAuth = require('../middleware/adminAuth');

// HTML escape utility for safety
function escapeHtml(str=''){ return str.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
// Legacy local email wrapper removed in favor of global brand wrapper (sendEmail handles layout)
// GET /api/trainers/all?status=pending|approved|rejected
exports.getAllTrainersForAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = new RegExp(`^${status}$`, 'i');
    }
    const trainers = await Trainer.find(query)
      .populate({ path: 'gym', select: 'gymName' })
      .lean();
    const formatted = trainers.map(tr => {
      let gymNames = [];
      if (Array.isArray(tr.gym)) {
        gymNames = tr.gym.map(g => g?.gymName || '');
      } else if (tr.gym && tr.gym.gymName) {
        gymNames = [tr.gym.gymName];
      }
      let image = tr.image || tr.photo || '';
      if (image && !/^https?:\/\//.test(image)) {
        image = `/uploads/trainers/${image}`;
      }

      // Enhanced rate display
      const rateDisplay = [];
      if (tr.hourlyRate) rateDisplay.push(`₹${tr.hourlyRate}/hr`);
      if (tr.monthlyRate) rateDisplay.push(`₹${tr.monthlyRate}/mo`);
      const formattedRate = rateDisplay.length > 0 ? rateDisplay.join(' • ') : `₹${tr.rate || 0}`;

      return {
        ...tr,
        gym: gymNames,
        image,
        rateDisplay: formattedRate,
        rateTypes: tr.rateTypes || ['hourly'], // Default for backward compatibility
        hourlyRate: tr.hourlyRate || null,
        monthlyRate: tr.monthlyRate || null
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('[getAllTrainersForAdmin] Error:', err);
    res.status(500).json({ message: 'Failed to fetch trainers' });
  }
};
// Get all approved trainers
exports.getAllApprovedTrainers = async (req, res) => {
  try {
    // Fetch only approved trainers and populate gym details
    const trainers = await Trainer.find({ status: 'approved' })
      .populate('gym')
      .select('-password'); // Exclude password or sensitive data

    const processedTrainers = trainers.map(trainer => {
      // Enhanced rate display
      const rateDisplay = [];
      if (trainer.hourlyRate) rateDisplay.push(`₹${trainer.hourlyRate}/hr`);
      if (trainer.monthlyRate) rateDisplay.push(`₹${trainer.monthlyRate}/mo`);
      const formattedRate = rateDisplay.length > 0 ? rateDisplay.join(' • ') : `₹${trainer.rate || 0}`;

      return {
        _id: trainer._id,
        id: trainer._id, // for frontend compatibility if using 'id'
        name: `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim(),
        email: trainer.email,
        phone: trainer.phone,
        specialties: trainer.specialty ? [trainer.specialty] : [],
        experience: trainer.experience,
        locations: trainer.locations,
        availability: trainer.availability,
        bio: trainer.bio,
        shortBio: trainer.bio ? trainer.bio.substring(0, 100) + (trainer.bio.length > 100 ? '...' : '') : 'No bio available.',
        rate: trainer.rate,
        rateDisplay: formattedRate,
        rateTypes: trainer.rateTypes || ['hourly'],
        hourlyRate: trainer.hourlyRate || null,
        monthlyRate: trainer.monthlyRate || null,
        image: trainer.photo ? `/uploads/trainers/${trainer.photo}` : null,
        gym: trainer.gym ? {
          _id: trainer.gym._id,
          gymName: trainer.gym.gymName,
          address: trainer.gym.location?.address || '',
          city: trainer.gym.location?.city || '',
          logoUrl: trainer.gym.logoUrl || null
        } : null,
      };
    });

    res.status(200).json(processedTrainers);
  } catch (error) {
    console.error('Error fetching approved trainers:', error);
    res.status(500).json({ message: 'Server error while fetching trainers.' });
  }
};

// Get all trainers (for admin dashboard, all statuses)
exports.getAllTrainers = async (req, res) => {
  try {
    // Populate gym field to get gym details
    const trainers = await Trainer.find().populate('gym').select('-password');
    const processedTrainers = trainers.map(trainer => {
      return {
        _id: trainer._id,
        id: trainer._id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        specialty: trainer.specialty,
        status: trainer.status,
        experience: trainer.experience,
        certifications: trainer.certifications,
        availability: trainer.availability,
        locations: trainer.locations,
        bio: trainer.bio,
        rate: trainer.rate,
        // Always provide full image URL for frontend
        image: trainer.photo ? `/uploads/trainers/${trainer.photo}` : null,
        gym: trainer.gym ? {
          _id: trainer.gym._id,
          gymName: trainer.gym.gymName,
          address: trainer.gym.location?.address || '',
          city: trainer.gym.location?.city || '',
          logoUrl: trainer.gym.logoUrl || null
        } : null,
      };
    });
    res.status(200).json(processedTrainers);
  } catch (error) {
    console.error('Error fetching all trainers:', error);
    res.status(500).json({ message: 'Server error while fetching trainers.' });
  }
};

// Approve a trainer
exports.approveTrainer = async (req, res) => {
  console.log('[DEBUG] approveTrainer called. Params:', req.params);

  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

    // Enforce dual flow: gym-based must be approved by gymAdmin (or super_admin), independent by main/super admin
    // Support gymadminAuth (may not set role) by inferring a default 'admin' role if gym context present
    let approverRole = req.admin?.role;
    if (!approverRole && req.gym) {
      approverRole = 'admin';
      // Ensure req.admin has minimal shape for downstream usage
      if(!req.admin) req.admin = { _id: req.gym.id || req.gym._id, role: 'admin' };
    }
    if (!approverRole) {
      return res.status(401).json({ message: 'Unauthorized: admin context missing' });
    }
    const isGymTrainer = trainer.trainerType === 'gym';
    if (isGymTrainer) {
      // Allowed roles: gym admin for the gym (role 'admin'?) or super_admin
      // If we had gym ownership relation we would check it; placeholder check here
      if (!['super_admin','admin'].includes(approverRole)) {
        return res.status(403).json({ message: 'Only gym admin or super admin can approve gym-based trainer' });
      }
    } else { // independent
      if (!['super_admin','admin'].includes(approverRole)) {
        return res.status(403).json({ message: 'Only main admin or super admin can approve independent trainer' });
      }
    }

    // --- Pre-validation diagnostics & auto-heal for legacy incomplete docs ---
    const originalIssues = trainer.validateSync();
    if (originalIssues) {
      console.warn('[VALIDATION_BEFORE_APPROVE] Found issues before modifications', Object.keys(originalIssues.errors));
    }

    // Auto-fill missing rate fields if required (legacy data fix)
    if (Array.isArray(trainer.rateTypes)) {
      if (trainer.rateTypes.includes('hourly') && (trainer.hourlyRate == null || Number.isNaN(trainer.hourlyRate))) {
        const fallback = trainer.rate && trainer.rate >= 100 ? trainer.rate : 100;
        console.warn('[AUTO_FIX] Setting missing hourlyRate to', fallback);
        trainer.hourlyRate = fallback;
      }
      if (trainer.rateTypes.includes('monthly') && (trainer.monthlyRate == null || Number.isNaN(trainer.monthlyRate))) {
        const fallbackM = trainer.rate && trainer.rate >= 2000 ? trainer.rate : 2000;
        console.warn('[AUTO_FIX] Setting missing monthlyRate to', fallbackM);
        trainer.monthlyRate = fallbackM;
      }
    }

    // Force numeric coercion & final fallback if still undefined while required
    if (trainer.rateTypes && trainer.rateTypes.includes('hourly')) {
      if (trainer.hourlyRate == null || trainer.hourlyRate === '' || Number.isNaN(Number(trainer.hourlyRate))) {
        console.warn('[AUTO_FIX] Forcing hourlyRate numeric fallback 100');
        trainer.hourlyRate = 100;
      } else {
        trainer.hourlyRate = Number(trainer.hourlyRate);
      }
    }
    if (trainer.rateTypes && trainer.rateTypes.includes('monthly')) {
      if (trainer.monthlyRate == null || trainer.monthlyRate === '' || Number.isNaN(Number(trainer.monthlyRate))) {
        console.warn('[AUTO_FIX] Forcing monthlyRate numeric fallback 2000');
        trainer.monthlyRate = 2000;
      } else {
        trainer.monthlyRate = Number(trainer.monthlyRate);
      }
    }

    // If rateTypes empty (legacy), derive from existing numeric fields
    if (!trainer.rateTypes || !trainer.rateTypes.length) {
      trainer.rateTypes = [];
      if (trainer.hourlyRate) trainer.rateTypes.push('hourly');
      if (trainer.monthlyRate) trainer.rateTypes.push('monthly');
      if (!trainer.rateTypes.length) {
        trainer.rateTypes = ['hourly'];
        if (trainer.hourlyRate == null) trainer.hourlyRate = 100;
      }
      console.warn('[AUTO_FIX] Reconstructed rateTypes:', trainer.rateTypes);
    }

    // Final pre-save validation check (silent heal attempt)
    const postFixIssues = trainer.validateSync();
    if (postFixIssues && postFixIssues.errors?.hourlyRate) {
      console.warn('[FINAL_HEAL] hourlyRate still invalid, forcing 100');
      trainer.hourlyRate = 100;
    }

    trainer.status = 'approved';
    trainer.reviewedBy = req.admin._id;
    trainer.reviewedAt = new Date();
    trainer.reviewNotes = req.body?.notes || trainer.reviewNotes;
    trainer.verificationStatus = 'verified';

    try {
      await trainer.save();
    } catch (saveErr) {
      if (saveErr.name === 'ValidationError') {
        console.error('[VALIDATION_ERROR_APPROVE]', Object.keys(saveErr.errors));
        return res.status(422).json({
          message: 'Validation failed when approving trainer',
            errors: Object.fromEntries(Object.entries(saveErr.errors).map(([k,v])=>[k,{ message: v.message }]))
        });
      }
      throw saveErr; // rethrow other errors
    }

    // Create notification for trainer approval (for gym admin)
    try {
      const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
      const trainerName = displayName.trim() || 'Trainer';
      
      // Get gym admin for notification
      const gymId = trainer.gym;
      if (gymId) {
        const notification = new Notification({
          title: 'Trainer Approved',
          message: `${trainerName}'s trainer application has been approved`,
          type: 'trainer-approved',
          priority: 'normal',
          icon: 'fa-check-circle',
          color: '#4caf50',
          user: gymId,
          metadata: {
            trainerId: trainer._id,
            trainerName: trainerName,
            trainerEmail: trainer.email
          }
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Error creating gym admin notification:', notifError);
    }

    // Create notification for admin dashboard
    try {
      await adminNotificationService.notifyTrainerApproval(trainer);
    } catch (adminNotificationError) {
      console.error('Error creating admin notification:', adminNotificationError);
    }

    // Send approval email
    const subject = 'Trainer Approval - Gym-Wale';
    // Use firstName and lastName for greeting, fallback to 'Trainer' if both missing
    const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
    const greetingName = displayName.trim() || 'Trainer';
    const html = `
      <h3>Hello ${greetingName},</h3>
      <p>Congratulations! Your trainer registration has been <strong>approved</strong> by the Gym-Wale admin team.</p>
      <p>You can now login and access your trainer dashboard.</p>
      <br>
      <p>Best regards,<br/>Gym-Wale Team</p>
    `;

    // Email to trainer (themed)
    try {
      await sendEmail({
        to: trainer.email,
        subject: '🎉 Trainer Registration Approved – Gym-Wale',
        title: 'Trainer Registration Approved',
        preheader: 'Your trainer profile is now approved',
        bodyHtml: `<p>Great news! Your trainer application has been <strong style='color:#10b981;'>approved</strong> and your profile is being prepared.</p>
          <ul style='margin:0 0 16px 20px;padding:0;'>
            <li>Access your dashboard to refine your profile</li>
            <li>Ensure availability & rates are accurate</li>
            <li>Start responding to booking interest soon</li>
          </ul>`,
        action: {
          label: 'Open Trainer Dashboard',
          url: process.env.TRAINER_PORTAL_URL || 'http://localhost:5000/trainer-login'
        }
      });
    } catch (emailErr) {
      console.error('❌ Failed to send approval email to trainer:', emailErr.message);
    }

    // Email to gym admin if gym-based
    try {
      if (trainer.trainerType === 'gym' && trainer.gym) {
        const gymDoc = await Gym.findById(trainer.gym).select('gymName contactEmail adminEmail');
        const adminEmail = gymDoc?.adminEmail || gymDoc?.contactEmail || process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: '✅ Trainer Approved for Your Gym – Gym-Wale',
            title: 'Trainer Approved',
            preheader: 'A trainer linked to your gym is now active',
            bodyHtml: `<p>A trainer associated with your gym has just been <strong style='color:#10b981;'>approved</strong>.</p>
              <table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;'>
                <tr><td style='padding:6px 8px;background:#1e293b;font-weight:600;color:#e2e8f0;width:140px;'>Name</td><td style='padding:6px 8px;'>${greetingName}</td></tr>
                <tr><td style='padding:6px 8px;background:#1e293b;font-weight:600;color:#e2e8f0;'>Email</td><td style='padding:6px 8px;'>${trainer.email}</td></tr>
                <tr><td style='padding:6px 8px;background:#1e293b;font-weight:600;color:#e2e8f0;'>Specialty</td><td style='padding:6px 8px;'>${trainer.specialty||'—'}</td></tr>
                <tr><td style='padding:6px 8px;background:#1e293b;font-weight:600;color:#e2e8f0;'>Experience</td><td style='padding:6px 8px;'>${trainer.experience||0} yrs</td></tr>
              </table>
              <p style='margin:12px 0 0 0;'>You can review trainer performance and assign sessions from your dashboard.</p>`,
            action: {
              label: 'Open Admin Dashboard',
              url: process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/login.html'
            }
          });
        }
      }
    } catch (gymEmailErr) {
      console.error('Failed to send gym admin approval email:', gymEmailErr.message);
    }

    res.status(200).json({ message: 'Trainer approved successfully and email sent', trainer });
  } catch (error) {
    console.error('Error approving trainer:', error);
    // Extended diagnostics
    try {
      console.error('[APPROVE_DIAG]', {
        trainerId: req.params.id,
        hasAdmin: !!req.admin,
        adminRole: req.admin?.role,
        hasGym: !!req.gym,
        tokenHeaderPresent: !!req.headers.authorization,
        body: req.body
      });
    } catch(_){}
    res.status(500).json({ message: 'Error approving trainer', error: error.message });
  }
};
// Reject a trainer
exports.rejectTrainer = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    let approverRole = req.admin?.role;
    if (!approverRole && req.gym) {
      approverRole = 'admin';
      if(!req.admin) req.admin = { _id: req.gym.id || req.gym._id, role: 'admin' };
    }
    if (!approverRole) return res.status(401).json({ message: 'Unauthorized: admin context missing' });
    if (trainer.trainerType === 'gym') {
      if (!['super_admin','admin'].includes(approverRole)) {
        return res.status(403).json({ message: 'Only gym admin or super admin can reject gym-based trainer' });
      }
    } else {
      if (!['super_admin','admin'].includes(approverRole)) {
        return res.status(403).json({ message: 'Only main admin or super admin can reject independent trainer' });
      }
    }
    trainer.status = 'rejected';
    // Store the rejection reason if supported in schema (not present by default)
    if ('rejectionReason' in trainer) {
      trainer.rejectionReason = reason || '';
    }
    trainer.reviewedBy = req.admin._id;
    trainer.reviewedAt = new Date();
    trainer.reviewNotes = reason || trainer.reviewNotes;
    trainer.verificationStatus = 'rejected';
    try {
      await trainer.save();
    } catch (saveErr) {
      if (saveErr.name === 'ValidationError') {
        console.error('[VALIDATION_ERROR_REJECT]', Object.keys(saveErr.errors));
        return res.status(422).json({
          message: 'Validation failed when rejecting trainer',
          errors: Object.fromEntries(Object.entries(saveErr.errors).map(([k,v])=>[k,{ message: v.message }]))
        });
      }
      throw saveErr;
    }

    // Create notification for trainer rejection
    try {
      const Notification = require('../models/Notification');
      const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
      const trainerName = displayName.trim() || 'Trainer';
      
      // Get gym admin for notification
      const gymId = trainer.gym;
      if (gymId) {
        const notification = new Notification({
          title: 'Trainer Rejected',
          message: `${trainerName}'s trainer application has been rejected`,
          type: 'trainer-rejected',
          priority: 'normal',
          icon: 'fa-times-circle',
          color: '#f44336',
          user: gymId,
          metadata: {
            trainerId: trainer._id,
            trainerName: trainerName,
            trainerEmail: trainer.email,
            rejectionReason: reason || 'No reason provided'
          }
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't block trainer rejection if notification fails
    }

    // Send rejection email (themed) to trainer
    try {
      const displayName = (trainer.firstName || '') + (trainer.lastName ? ' ' + trainer.lastName : '');
      await sendEmail({
        to: trainer.email,
        subject: '❌ Trainer Application Rejected – Gym-Wale',
        title: 'Trainer Application Rejected',
        preheader: 'Your trainer application status update',
        bodyHtml: `<p>Your trainer application was <strong style='color:#dc2626;'>rejected</strong>.</p>
          <p style='margin:12px 0 6px;'>Reason (if provided):</p>
          <div style='margin:0 0 18px;padding:14px 16px;background:#1e293b;border:1px solid #334155;border-radius:12px;font-size:13px;color:#e2e8f0;'>${reason ? escapeHtml(reason) : 'No specific reason provided.'}</div>
          <p>You may update documents and reapply if eligible. Reach out to support for clarification.</p>`,
        action: {
          label: 'View Requirements',
          url: process.env.TRAINER_REQUIREMENTS_URL || 'http://localhost:5000/trainer-login'
        }
      });
    } catch (emailErr) {
      console.error('❌ Failed to send rejection email to trainer:', emailErr.message);
    }

    // Gym admin notification email on rejection (if gym-based)
    try {
      if (trainer.trainerType === 'gym' && trainer.gym) {
        const gymDoc = await Gym.findById(trainer.gym).select('gymName contactEmail adminEmail');
        const adminEmail = gymDoc?.adminEmail || gymDoc?.contactEmail || process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: '⚠️ Trainer Application Rejected – Gym-Wale',
            title: 'Trainer Application Rejected',
            preheader: 'Trainer status update for your gym',
            bodyHtml: `<p>A trainer associated with your gym was <strong style='color:#dc2626;'>rejected</strong>.</p>
              <p style='margin:12px 0 6px;font-size:13px;'>Details:</p>
              <table style='width:100%;border-collapse:collapse;margin:0 0 16px;font-size:12px;'>
                <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;width:140px;'>Name</td><td style='padding:6px 8px;'>${displayName || 'Trainer'}</td></tr>
                <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;'>Email</td><td style='padding:6px 8px;'>${trainer.email}</td></tr>
                <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;'>Specialty</td><td style='padding:6px 8px;'>${trainer.specialty||'—'}</td></tr>
                <tr><td style='padding:6px 8px;background:#1e293b;color:#e2e8f0;font-weight:600;'>Experience</td><td style='padding:6px 8px;'>${trainer.experience||0} yrs</td></tr>
              </table>
              <p style='margin:0 0 6px;'>Reason:</p>
              <div style='padding:12px 14px;background:#1e293b;border:1px solid #334155;border-radius:12px;font-size:12px;color:#e2e8f0;'>${escapeHtml(reason||'No reason provided')}</div>`,
            action: {
              label: 'Review Trainers',
              url: process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/login.html'
            }
          });
        }
      }
    } catch (gymRejectEmailErr) {
      console.error('Failed to send gym admin rejection email:', gymRejectEmailErr.message);
    }

    res.status(200).json({ message: 'Trainer rejected successfully and email sent', trainer, reason });
  } catch (error) {
    console.error('Error rejecting trainer:', error);
    try {
      console.error('[REJECT_DIAG]', {
        trainerId: req.params.id,
        hasAdmin: !!req.admin,
        adminRole: req.admin?.role,
        hasGym: !!req.gym,
        tokenHeaderPresent: !!req.headers.authorization,
        body: req.body
      });
    } catch(_){}
    res.status(500).json({ message: 'Error rejecting trainer', error: error.message });
  }
};

// Delete a trainer
exports.deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    res.status(200).json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Error deleting trainer:', error);
    res.status(500).json({ message: 'Error deleting trainer' });
  }
};

// Controller function for trainer registration (moved from trainerRoutes.js for consistency)
exports.registerTrainer = async (req, res) => {
  try {
    // Debug: log incoming files and body
    console.log('DEBUG Multer req.files:', req.files);
    console.log('DEBUG Multer req.body:', req.body);
    
    const {
      firstName, lastName, email, phone,
      specialty, experience, bio, 
      trainerType = 'gym',
      password,
      // Enhanced rate structure
      rateTypes, hourlyRateValue, monthlyRateValue
    } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password (min 6 chars) is required' });
    }

    // Validate rate structure
    let processedRateTypes = [];
    if (typeof rateTypes === 'string') {
      processedRateTypes = [rateTypes];
    } else if (Array.isArray(rateTypes)) {
      processedRateTypes = rateTypes;
    }

    if (processedRateTypes.length === 0) {
      return res.status(400).json({ 
        message: 'At least one rate type (hourly or monthly) must be selected' 
      });
    }

    // Validate required rate values
    const hourlyRate = processedRateTypes.includes('hourly') ? Number(hourlyRateValue) : null;
    const monthlyRate = processedRateTypes.includes('monthly') ? Number(monthlyRateValue) : null;

    if (processedRateTypes.includes('hourly') && (!hourlyRate || hourlyRate < 100)) {
      return res.status(400).json({ 
        message: 'Valid hourly rate (minimum ₹100) is required when hourly rate type is selected' 
      });
    }

    if (processedRateTypes.includes('monthly') && (!monthlyRate || monthlyRate < 2000)) {
      return res.status(400).json({ 
        message: 'Valid monthly rate (minimum ₹2000) is required when monthly rate type is selected' 
      });
    }

    // Handle availability - can be structured object or simple string
    let availability = req.body.availability;
    if (typeof availability === 'string') {
      try {
        availability = JSON.parse(availability);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    // Ensure locations is an array
    let locations = req.body.locations || req.body.serviceArea;
    if (locations && !Array.isArray(locations)) {
        locations = [locations];
    } else if (!locations) {
        locations = [];
    }

    // Support both 'photo' and 'profileImage' for backward/forward compatibility
    let photo = null;
    if (req.files?.profileImageInput?.[0]) {
      photo = req.files.profileImageInput[0].filename;
    } else if (req.files?.photo?.[0]) {
      photo = req.files.photo[0].filename;
    }
    
    const certifications = req.files?.certifications?.map(f => `trainers/certifications/${f.filename}`) || [];

    // Handle gym assignment
    let gym = null;
    let serviceArea = [];
    
    if (trainerType === 'gym') {
      gym = req.body.gym || null;
      if (!gym) {
        return res.status(400).json({ 
          message: 'Gym selection is required for gym-based trainers' 
        });
      }
    } else if (trainerType === 'independent') {
      serviceArea = locations;
      if (serviceArea.length === 0) {
        return res.status(400).json({ 
          message: 'Service area is required for independent trainers' 
        });
      }
    }

    // Independent trainer specific validations
    const hasInsurance = trainerType === 'independent' ? 
      (req.body.agreeInsurance === 'on' || req.body.hasInsurance === 'true') : false;

    if (trainerType === 'independent' && !hasInsurance) {
      return res.status(400).json({ 
        message: 'Professional liability insurance confirmation is required for independent trainers' 
      });
    }

    // Create trainer object
    const trainerData = {
      firstName, 
      lastName, 
      email, 
      phone,
      password,
      specialty, 
      experience: Number(experience) || 0, 
      availability,
      locations: trainerType === 'gym' ? locations : [],
      serviceArea: trainerType === 'independent' ? serviceArea : [],
      bio, 
      // Enhanced rate structure
      rateTypes: processedRateTypes,
      hourlyRate,
      monthlyRate,
      rate: hourlyRate || monthlyRate || 0, // Legacy field for backward compatibility
      certifications, 
      photo,
      trainerType,
      gym: trainerType === 'gym' ? gym : null,
      isIndependent: trainerType === 'independent',
      hasInsurance,
      status: 'pending', // Default status
      reviewTarget: trainerType === 'gym' ? 'gymAdmin' : 'mainAdmin'
    };

    const newTrainer = new Trainer(trainerData);
    await newTrainer.save();

    // Send notification email to admin
    try {
      const trainerTypeText = trainerType === 'independent' ? 'Independent Trainer' : 'Gym-Based Trainer';
      const locationText = trainerType === 'independent' ? 
        `Service Areas: ${serviceArea.join(', ')}` : 
        `Gym: ${gym}`;

      // Format rate display
      const rateDisplay = [];
      if (hourlyRate) rateDisplay.push(`₹${hourlyRate}/hour`);
      if (monthlyRate) rateDisplay.push(`₹${monthlyRate}/month`);
      const rateText = rateDisplay.join(' • ');

      await sendEmail(
        process.env.ADMIN_EMAIL || 'admin@gym-wale.com',
        `New ${trainerTypeText} Registration Pending Approval`,
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2a9d8f;">New Trainer Registration</h2>
          <p>A new ${trainerTypeText.toLowerCase()} registration has been submitted and is pending approval:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Trainer Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Name:</strong> ${firstName} ${lastName}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone}</li>
              <li><strong>Specialty:</strong> ${specialty}</li>
              <li><strong>Experience:</strong> ${experience} years</li>
              <li><strong>Type:</strong> ${trainerTypeText}</li>
              <li><strong>${trainerType === 'independent' ? 'Service Areas' : 'Preferred Locations'}:</strong> ${locationText}</li>
              <li><strong>Rate Types:</strong> ${processedRateTypes.join(', ')}</li>
              <li><strong>Rates:</strong> ${rateText}</li>
              ${trainerType === 'independent' ? `<li><strong>Insurance:</strong> ${hasInsurance ? 'Confirmed' : 'Not confirmed'}</li>` : ''}
            </ul>
          </div>
          <p>Please review and approve/reject this application in the admin dashboard.</p>
        </div>`
      );
    } catch (err) {
      console.error('Failed to send admin notification email:', err.message);
    }

    // Send confirmation email to trainer
    try {
      const trainerTypeText = trainerType === 'independent' ? 'independent trainer' : 'gym-based trainer';
      
      await sendEmail(
        email,
        '✅ Trainer Registration Received - Under Review',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2a9d8f;">Registration Received!</h2>
          <p>Dear ${firstName},</p>
          <p>Thank you for your interest in joining Gym-Wale as an ${trainerTypeText}!</p>
          <p>We have received your registration and it is now under review by our team.</p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>What happens next?</h3>
            <ul>
              <li>Our team will review your application and certifications</li>
              <li>We may contact you for additional information if needed</li>
              <li>You'll receive an email notification once your application is approved</li>
              <li>Review process typically takes 2-3 business days</li>
            </ul>
          </div>
          
          ${trainerType === 'independent' ? 
            `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>Independent Trainer Benefits:</h4>
              <ul>
                <li>Direct client access through our platform</li>
                <li>Flexible scheduling and location options</li>
                <li>Professional profile showcase</li>
                <li>Secure payment processing</li>
              </ul>
            </div>` : ''
          }
          
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br/>The Gym-Wale Team</p>
        </div>`
      );
    } catch (err) {
      console.error('Failed to send confirmation email to trainer:', err.message);
    }

    res.status(201).json({ 
      message: 'Trainer registration submitted successfully! You will receive an email once your application is reviewed.',
      trainer: {
        id: newTrainer._id,
        name: `${firstName} ${lastName}`,
        email,
        trainerType,
        status: 'pending',
        reviewTarget: newTrainer.reviewTarget
      }
    });

  } catch (error) {
    console.error('Error registering trainer:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email' ? 
        'Email address is already registered' : 
        'Phone number is already registered';
      return res.status(400).json({ message });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ 
      message: 'Error processing trainer registration. Please try again.' 
    });
  }
};

// List pending trainers for gym admin (gym-based only)
exports.getPendingGymBasedTrainers = async (req, res) => {
  try {
    const role = req.admin?.role;
    if (!role) return res.status(401).json({ message: 'Unauthorized' });
    if (!['super_admin','admin'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Find trainers that are either explicitly gym-based or have a gym assigned
    const query = {
      status: 'pending',
      $or: [
        { trainerType: 'gym' },
        { gym: { $ne: null, $exists: true } }
      ]
    };
    const trainers = await Trainer.find(query).populate('gym','gymName');
    res.json(trainers);
  } catch (e) {
    console.error('Error listing pending gym trainers', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// List pending independent trainers for main admin
exports.getPendingIndependentTrainers = async (req, res) => {
  try {
    const role = req.admin?.role;
    if (!role) return res.status(401).json({ message: 'Unauthorized' });
    if (!['super_admin','admin'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Find trainers that are either explicitly independent or have no gym assigned
    const query = {
      status: 'pending',
      $or: [
        { trainerType: 'independent' },
        { gym: null },
        { gym: { $exists: false } }
      ]
    };
    const trainers = await Trainer.find(query);
    res.json(trainers);
  } catch (e) {
    console.error('Error listing pending independent trainers', e);
    res.status(500).json({ message: 'Server error' });
  }
};
