// controllers/memberProblemReportController.js
const MemberProblemReport = require('../models/MemberProblemReport');
const Member = require('../models/Member');
const Gym = require('../models/gym');
const Notification = require('../models/Notification');
const gymNotificationService = require('../services/gymNotificationService');
const fcmService = require('../services/fcmService');

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

    // Create notification for gym admin + send FCM push
    try {
      const notifPriority = priority || 'normal';
      const notifTitle = `⚠️ New Problem Report: ${category}`;
      const notifMessage = `${activeMember.memberName} (${activeMember.membershipId}) reported: ${subject}`;
      const notifMetadata = {
        reportId: problemReport.reportId,
        memberId: activeMember._id.toString(),
        membershipId: activeMember.membershipId,
        memberName: activeMember.memberName,
        category,
        subject,
        hasImages: images.length > 0,
        imageCount: images.length,
        source: 'member-problem-report'
      };

      // 1. Save to Notification model (used by notificationRoutes /all endpoint)
      const notification = new Notification({
        title: notifTitle,
        message: notifMessage,
        type: 'grievance',          // matches icon case in gym admin app
        priority: notifPriority,
        icon: 'fa-exclamation-triangle',
        color: '#ff5722',
        user: gymId,
        metadata: notifMetadata,
        actionType: 'navigate',
        actionData: '/support'
      });
      await notification.save();
      console.log('✅ Gym Notification doc saved:', notification._id);

      // 2. Send FCM push notification to gym admin app
      const adminFcmTokens = await gymNotificationService.getGymAdminFCMTokens(gymId);
      if (adminFcmTokens.length > 0) {
        const fcmResult = await fcmService.notifyGymAdmin(
          adminFcmTokens,
          notifTitle,
          notifMessage,
          {
            type: 'grievance',
            priority: notifPriority,
            notificationId: notification._id.toString(),
            gymId: gymId.toString(),
            reportId: problemReport.reportId,
            category,
            memberName: activeMember.memberName,
            membershipId: activeMember.membershipId,
            channel: 'high_importance_channel',
          }
        );
        console.log(`📲 FCM push sent to ${adminFcmTokens.length} gym admin device(s)`);
        // Clean up stale tokens
        if (fcmResult?.invalidTokens?.length) {
          await gymNotificationService.removeStaleGymToken(gymId, fcmResult.invalidTokens);
        }
      } else {
        console.log('⚠️ No FCM tokens found for gym admin – push skipped');
      }
    } catch (notifError) {
      console.error('⚠️ Error creating gym notification:', notifError.message);
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
      .populate('userId', 'name email fcmToken');

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

      // FCM push to user device
      try {
        const userFcmToken = report.userId?.fcmToken?.token;
        if (userFcmToken) {
          await fcmService.sendToDevice(
            userFcmToken,
            { title: 'Response to Your Problem Report', body: message.substring(0, 100) },
            {
              type: 'problem-report-response',
              reportId: report.reportId,
              category: report.category,
              status: report.status,
            }
          );
          console.log('📲 FCM push sent to user for report reply');
        }
      } catch (fcmErr) {
        console.error('⚠️ FCM push failed for report reply:', fcmErr.message);
      }
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
