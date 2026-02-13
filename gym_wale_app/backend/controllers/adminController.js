const User = require('../models/User');
const Gym = require('../models/gym');
const Trainer = require('../models/trainerModel');
const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const TrialBooking = require('../models/TrialBooking');
const sendEmail = require('../utils/sendEmail');
const adminNotificationService = require('../services/adminNotificationService');


exports.getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total Users
    const totalUsers = await User.countDocuments();
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
    });
    const thisMonthUsers = await User.countDocuments({
      createdAt: { $gte: firstDayOfThisMonth }
    });

    // Active Members
    const activeMembers = await Membership.countDocuments({ active: true });
    const lastMonthMembers = await Membership.countDocuments({
      createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }, active: true
    });
    const thisMonthMembers = await Membership.countDocuments({
      createdAt: { $gte: firstDayOfThisMonth }, active: true
    });

    // Pending Approvals
    const pendingGyms = await Gym.countDocuments({ status: 'pending' });
    const pendingTrainers = await Trainer.countDocuments({ status: 'pending' });

    // Revenue from subscriptions
    const subscriptionRevenue = await Subscription.aggregate([
      {
        $unwind: '$billingHistory'
      },
      {
        $match: {
          'billingHistory.status': 'success'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$billingHistory.amount' }
        }
      }
    ]);

    const thisMonthSubscriptionRevenue = await Subscription.aggregate([
      {
        $unwind: '$billingHistory'
      },
      {
        $match: {
          'billingHistory.status': 'success',
          'billingHistory.date': { $gte: firstDayOfThisMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$billingHistory.amount' }
        }
      }
    ]);

    // Combine gym revenue with subscription revenue
    const totalRevenue = await Gym.aggregate([{ $group: { _id: null, total: { $sum: '$revenue' } } }]);
    const combinedTotalRevenue = (totalRevenue[0]?.total || 0) + (subscriptionRevenue[0]?.total || 0);
    const combinedThisMonthRevenue = (thisMonthSubscriptionRevenue[0]?.total || 0);
    
    const thisMonthRevenue = await Gym.aggregate([
      { $match: { createdAt: { $gte: firstDayOfThisMonth } } },
      { $group: { _id: null, total: { $sum: '$revenue' } } }
    ]);
    const lastMonthRevenue = await Gym.aggregate([
      { $match: { createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$revenue' } } }
    ]);

    // Subscription analytics
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const trialSubscriptions = await Subscription.countDocuments({ status: 'trial' });
    const expiredSubscriptions = await Subscription.countDocuments({ 
      $or: [{ status: 'expired' }, { status: 'cancelled' }] 
    });

    const percent = (curr, prev) =>
      prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

    // Trial Bookings
    const totalTrialBookings = await TrialBooking.countDocuments();
    const pendingTrialApprovals = await TrialBooking.countDocuments({ status: 'pending' });

    // Total gyms registered
    const totalGymsRegistered = await Gym.countDocuments();
    // Gyms using dashboard: status 'approved' and lastLogin within last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const gymsUsingDashboard = await Gym.countDocuments({ status: 'approved', lastLogin: { $gte: sevenDaysAgo } });

    res.json({
      totalUsers,
      activeMembers,
      pendingGyms,
      pendingTrainers,
      totalRevenue: combinedTotalRevenue,
      subscriptionRevenue: combinedThisMonthRevenue,
      totalTrialBookings,
      pendingTrialApprovals,
      totalGymsRegistered,
      gymsUsingDashboard,
      // Subscription metrics
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      changes: {
        users: percent(thisMonthUsers, lastMonthUsers),
        members: percent(thisMonthMembers, lastMonthMembers),
        revenue: percent((thisMonthRevenue[0]?.total || 0) + combinedThisMonthRevenue, lastMonthRevenue[0]?.total || 0),
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve a gym
exports.approveGym = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id);

    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    // Set the gym as approved - the gym will use its own ID for authentication
    gym.status = 'approved';
    gym.approvedAt = new Date();
    await gym.save();

    // Create notification for gym approval
    await adminNotificationService.notifyGymApproval(gym);

    try {
      await sendEmail({
        to: gym.email,
        subject: '🎉 Gym Registration Approved',
        title: 'Your Gym is Approved!',
        preheader: `Welcome aboard ${gym.gymName}`,
        bodyHtml: `
          <p>Hello ${gym.contactPerson || gym.gymName || 'Gym Owner'},</p>
          <p>Your gym <strong>${gym.gymName}</strong> has been <strong>approved</strong>. You can now log in and complete your profile details, manage trainers, and onboard members.</p>
          <ul style="margin:16px 0 20px;padding-left:20px;">
            <li><strong>Portal Access:</strong> Use the email you registered with</li>
            <li><strong>Security:</strong> Update your password after first login</li>
            <li><strong>Next Steps:</strong> Upload logo, set membership plans, invite trainers</li>
          </ul>
          <p style="margin-top:0;">Need help? Visit our support center anytime.</p>
          <p style="margin-top:26px;font-size:14px;color:#cbd5e1;">If you did not request this registration, please ignore this email or contact support.</p>
        `,
        action: {
          label: 'Access Admin Portal',
          url: process.env.ADMIN_PORTAL_URL || 'http://localhost:5000/frontend/public/login.html'
        }
      });
      console.log(`✅ Approval email sent to ${gym.email}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send approval email to ${gym.email}:`, emailErr.message);
    }

    res.json({ message: 'Gym approved successfully', gym });
  } catch (error) {
    console.error('Error approving gym:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reject a gym
exports.rejectGym = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }
    const gym = await Gym.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date()
      },
      { new: true }
    );
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    
    // Create notification for gym rejection
    await adminNotificationService.notifyGymRejection(gym, reason);
    
    try {
      await sendEmail({
        to: gym.email,
        subject: '❌ Gym Registration Review Result',
        title: 'Registration Not Approved',
        preheader: 'Your submission needs updates',
        bodyHtml: `
          <p>Hello ${gym.ownerName || gym.gymName || 'Gym Owner'},</p>
          <p>We reviewed the registration for <strong>${gym.gymName || gym.name || 'your gym'}</strong>, and at this time it <strong>was not approved</strong>.</p>
          <p><strong>Reason Provided:</strong></p>
          <blockquote style="margin:14px 0;padding:14px 18px;background:#1e293b;border-left:4px solid #e11d48;border-radius:10px;color:#f1f5f9;">${reason}</blockquote>
          <p>You can revise the required details and resubmit your application. Common issues include missing documents, unverifiable address, or incomplete profile data.</p>
          <p style="margin-top:24px;">If you believe this decision was in error, please reach out through the support channel.</p>
        `,
        action: {
          label: 'Review Requirements',
          url: process.env.GYM_REQUIREMENTS_URL || 'http://localhost:5000/frontend/public/gym-register.html'
        }
      });
      console.log(`✅ Rejection email sent to ${gym.email}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send rejection email to ${gym.email}:`, emailErr.message);
    }
    res.json({ message: 'Gym rejected successfully and email attempt made.', gym });
  } catch (error) {
    console.error('Error rejecting gym:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


// Revoke approval
exports.revokeGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.id, { status: 'pending' }, { new: true });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ message: 'Gym approval revoked', gym });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reconsider rejection
exports.reconsiderGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.id, { status: 'pending', $unset: { rejectionReason: 1 } }, { new: true });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json({ message: 'Gym sent back to pending', gym });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
// delete a gym
exports.deleteGym = async (req, res) => {
  try {
    const gymId = req.params.id;
    const deletedGym = await Gym.findByIdAndDelete(gymId);

    if (!deletedGym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Create notification for gym deletion
    await adminNotificationService.createNotification(
      'Gym Deleted',
      `The gym "${deletedGym.gymName || deletedGym.name || 'Unknown Gym'}" has been deleted by the admin.`,
      'gym-deleted',
      'fa-trash',
      '#dc3545',
      {
        gymId: deletedGym._id,
        gymName: deletedGym.gymName || deletedGym.name,
        action: 'deleted'
      },
      'high'
    );

    res.status(200).json({ message: 'Gym deleted successfully' });
  } catch (error) {
    console.error('Delete gym error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// Get all notifications for the admin
exports.getNotifications = async (req, res) => {
  try {
    console.log('req.admin:', req.admin);
    console.log('req.admin._id:', req.admin._id);
    
    const notifications = await Notification.find({ user: req.admin._id })
      .sort({ timestamp: -1 })
      .limit(50);
    
    console.log('Found notifications:', notifications.length);
    
    const unreadCount = await Notification.countDocuments({ 
      user: req.admin._id, 
      read: false 
    });
    
    console.log('Unread count:', unreadCount);
    
    res.json({
      notifications,
      unreadCount,
      success: true
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await notification.markAsRead();
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking notification as read' 
    });
  }
};

// Mark all notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.admin._id, read: false },
      { read: true }
    );
    
    res.json({ 
      success: true, 
      message: 'All notifications marked as read' 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking all notifications as read' 
    });
  }
};

// Helper function to create admin notification
const createAdminNotification = async (title, message, type, icon = 'fa-bell', color = '#2563eb', metadata = {}) => {
  try {
    // Try to get the admin ID from the request context if available
    // For now, we'll use a default admin ID - in production, this should be more dynamic
    const adminId = '507f1f77bcf86cd799439011'; // Default admin ID
    
    const notification = new Notification({
      title,
      message,
      type,
      icon,
      color,
      user: adminId,
      metadata
    });
    
    await notification.save();
    console.log(`Admin notification created: ${title}`);
    return notification;
  } catch (error) {
    console.error('Error creating admin notification:', error);
  }
};

// Export the helper function for use in other controllers
module.exports.createAdminNotification = createAdminNotification;

// Admin-specific: Get gym details by ID (regardless of status)
exports.getGymById = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id).select('-password');
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    console.log('[DEBUG] Admin getGymById - returning gym:', gym.gymName);
    console.log('[DEBUG] Admin getGymById - gymPhotos:', gym.gymPhotos);
    res.status(200).json(gym);
  } catch (error) {
    console.error("Error fetching gym by ID for admin:", error);
    res.status(500).json({ message: 'Server error while fetching gym details' });
  }
};

// Admin-specific: Get all gyms (regardless of status)
exports.getAllGyms = async (req, res) => {
  try {
    const gyms = await Gym.find({}).select('-password');
    console.log('[DEBUG] Admin getAllGyms - returning', gyms.length, 'gyms');
    res.status(200).json(gyms);
  } catch (error) {
    console.error("Error fetching all gyms for admin:", error);
    res.status(500).json({ message: 'Server error while fetching gyms' });
  }
};

// Admin-specific: Get gyms by status
exports.getGymsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const gyms = await Gym.find({ status }).select('-password');
    console.log('[DEBUG] Admin getGymsByStatus - returning', gyms.length, 'gyms with status:', status);
    res.status(200).json(gyms);
  } catch (error) {
    console.error("Error fetching gyms by status for admin:", error);
    res.status(500).json({ message: 'Server error while fetching gyms' });
  }
};