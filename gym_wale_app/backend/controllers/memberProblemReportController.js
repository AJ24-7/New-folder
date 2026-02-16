// controllers/memberProblemReportController.js
const MemberProblemReport = require('../models/MemberProblemReport');
const Member = require('../models/Member');
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const GymNotification = require('../models/GymNotification');

// Submit a problem report from active gym member
exports.submitMemberProblemReport = async (req, res) => {
  try {
    const { gymId, category, subject, description, priority } = req.body;
    const userId = req.user._id;
    
    // Get uploaded image URLs from Cloudinary
    const images = req.files ? req.files.map(file => file.path) : [];

    console.log('📝 Member Problem Report Submission:', {
      userId,
      gymId,
      category,
      subject,
      imagesCount: images.length,
      userEmail: req.user.email
    });

    // Verify the user has an active membership at this gym
    const activeMember = await Member.findOne({
      gym: gymId,
      email: req.user.email,
      membershipValidUntil: { $gte: new Date().toISOString().split('T')[0] }
    });

    if (!activeMember) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active membership at this gym to report problems'
      });
    }

    // Get gym details
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    // Create the problem report
    const problemReport = new MemberProblemReport({
      memberId: activeMember._id,
      gymId,
      userId,
      membershipId: activeMember.membershipId,
      category,
      subject,
      description,
      priority: priority || 'normal',
      images
    });

    await problemReport.save();

    console.log('✅ Problem report created:', problemReport.reportId);

    // Create notification for gym admin
    try {
      const gymNotification = new GymNotification({
        gym: gymId,
        title: `New Member Problem Report: ${category}`,
        message: `${activeMember.memberName} (${activeMember.membershipId}) reported: ${subject}`,
        type: 'member-problem-report',
        priority: priority || 'normal',
        metadata: {
          reportId: problemReport.reportId,
          memberId: activeMember._id,
          membershipId: activeMember.membershipId,
          category,
          subject,
          hasImages: images.length > 0,
          imageCount: images.length
        }
      });

      await gymNotification.save();
      console.log('✅ Gym notification created for problem report');
    } catch (notifError) {
      console.error('⚠️ Error creating gym notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Problem report submitted successfully',
      reportId: problemReport.reportId,
      report: {
        reportId: problemReport.reportId,
        category,
        subject,
        status: problemReport.status,
        images,
        createdAt: problemReport.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error submitting member problem report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit problem report',
      error: error.message
    });
  }
};

// Get member's problem reports for a specific gym
exports.getMemberProblemReports = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userId = req.user._id;

    const reports = await MemberProblemReport.find({
      userId,
      gymId
    })
    .populate('gymId', 'gymName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      reports
    });

  } catch (error) {
    console.error('Error fetching member problem reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem reports',
      error: error.message
    });
  }
};

// Admin: Get all problem reports for their gym
exports.getGymProblemReports = async (req, res) => {
  try {
    // Extract gymId from various possible locations in req.admin
    const gymIdRaw = req.admin.gymId || req.admin.id || req.admin._id;
    
    // Convert to ObjectId if it's a string
    const mongoose = require('mongoose');
    const gymId = mongoose.Types.ObjectId.isValid(gymIdRaw) 
      ? new mongoose.Types.ObjectId(gymIdRaw) 
      : gymIdRaw;
    
    console.log('📋 Fetching problem reports for gym:', {
      gymIdRaw,
      gymId,
      adminData: { id: req.admin.id, gymId: req.admin.gymId, email: req.admin.email },
      filters: req.query
    });

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: 'Gym ID not found in authentication data'
      });
    }

    const { status, category, priority } = req.query;

    const filter = { gymId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const reports = await MemberProblemReport.find(filter)
      .populate('memberId', 'memberName membershipId phone email')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${reports.length} problem reports for gym ${gymId}`);

    res.json({
      success: true,
      reports
    });

  } catch (error) {
    console.error('Error fetching gym problem reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem reports',
      error: error.message
    });
  }
};

// Admin: Respond to a problem report
exports.respondToMemberProblem = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { message, status } = req.body;
    const adminId = req.admin._id || req.admin.id;

    const report = await MemberProblemReport.findById(reportId)
      .populate('userId', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Problem report not found'
      });
    }

    // Update the report with admin response
    report.adminResponse = {
      message,
      respondedBy: adminId,
      respondedAt: new Date()
    };

    if (status) {
      report.status = status;
      if (status === 'resolved' || status === 'closed') {
        report.resolvedAt = new Date();
      }
    } else {
      report.status = 'acknowledged';
    }

    await report.save();

    console.log('✅ Admin responded to problem report:', report.reportId);

    // Create notification for the user
    try {
      const notification = new Notification({
        userId: report.userId,
        title: `Response to Your Problem Report`,
        message: `The gym has responded to your report: "${report.subject}". ${message}`,
        type: 'problem-report-response',
        priority: 'high',
        metadata: {
          reportId: report.reportId,
          category: report.category,
          status: report.status,
          adminMessage: message
        }
      });

      await notification.save();
      report.notificationSent = true;
      await report.save();

      console.log('✅ User notification created for admin response');
    } catch (notifError) {
      console.error('⚠️ Error creating user notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      report
    });

  } catch (error) {
    console.error('Error responding to member problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send response',
      error: error.message
    });
  }
};

// Admin: Update problem report status
exports.updateProblemReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, resolutionNotes } = req.body;

    const report = await MemberProblemReport.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Problem report not found'
      });
    }

    report.status = status;
    if (resolutionNotes) {
      report.resolutionNotes = resolutionNotes;
    }

    if (status === 'resolved' || status === 'closed') {
      report.resolvedAt = new Date();
    }

    await report.save();

    res.json({
      success: true,
      message: 'Report status updated successfully',
      report
    });

  } catch (error) {
    console.error('Error updating problem report status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// Get problem report by ID (for user to track their report)
exports.getProblemReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user._id;

    const report = await MemberProblemReport.findOne({
      _id: reportId,
      userId
    }).populate('gymId', 'gymName gymLogo');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Problem report not found'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error fetching problem report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem report',
      error: error.message
    });
  }
};
