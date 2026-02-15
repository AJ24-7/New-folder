// ============= ENHANCED NOTIFICATION CONTROLLER =============
// Unified notification system for admin-member and admin-super admin communications

const Notification = require('../models/Notification');
const GymNotification = require('../models/GymNotification');
const User = require('../models/User');
const Gym = require('../models/gym');
const Member = require('../models/Member');
const Trainer = require('../models/trainerModel');
const Admin = require('../models/admin');

class NotificationController {
    // ========== ADMIN NOTIFICATIONS ==========

    /**
     * Get all notifications for admin with filters
     */
    async getAdminNotifications(req, res) {
        try {
            const {
                type = 'all',
                priority = 'all',
                read = 'all',
                page = 1,
                limit = 50,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            const adminId = req.admin?.id || req.gym?.id;
            
            const filter = {};
            
            // Support both admin notifications and gym notifications
            if (req.admin) {
                filter.user = adminId;
            } else if (req.gym) {
                filter.gymId = adminId;
            }

            if (type !== 'all') filter.type = type;
            if (priority !== 'all') filter.priority = priority;
            if (read !== 'all') filter.read = read === 'true';

            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const skip = (page - 1) * limit;

            // Try to find notifications in both collections
            let notifications = [];
            
            if (req.admin) {
                notifications = await Notification.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean();
            } else if (req.gym) {
                notifications = await GymNotification.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean();
            }

            const total = req.admin 
                ? await Notification.countDocuments(filter)
                : await GymNotification.countDocuments(filter);

            const unreadCount = req.admin
                ? await Notification.countDocuments({ ...filter, read: false })
                : await GymNotification.countDocuments({ ...filter, read: false });

            res.json({
                success: true,
                notifications,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                },
                unreadCount
            });

        } catch (error) {
            console.error('Error fetching admin notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching notifications',
                error: error.message
            });
        }
    }

    /**
     * Get unread count for admin
     */
    async getUnreadCount(req, res) {
        try {
            const adminId = req.admin?.id || req.gym?.id;
            
            let unreadCount = 0;
            
            if (req.admin) {
                unreadCount = await Notification.countDocuments({
                    user: adminId,
                    read: false
                });
            } else if (req.gym) {
                unreadCount = await GymNotification.countDocuments({
                    gymId: adminId,
                    read: false
                });
            }

            res.json({
                success: true,
                unreadCount
            });

        } catch (error) {
            console.error('Error getting unread count:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting unread count',
                error: error.message
            });
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const adminId = req.admin?.id || req.gym?.id;

            let notification = null;
            
            if (req.admin) {
                notification = await Notification.findOneAndUpdate(
                    { _id: notificationId, user: adminId },
                    { read: true, isRead: true, readAt: new Date() },
                    { new: true }
                );
            } else if (req.gym) {
                notification = await GymNotification.findOneAndUpdate(
                    { _id: notificationId, gymId: adminId },
                    { read: true, readAt: new Date() },
                    { new: true }
                );
            }

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification marked as read',
                notification
            });

        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                message: 'Error marking notification as read',
                error: error.message
            });
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(req, res) {
        try {
            const adminId = req.admin?.id || req.gym?.id;

            let result = null;
            
            if (req.admin) {
                result = await Notification.updateMany(
                    { user: adminId, read: false },
                    { read: true, isRead: true, readAt: new Date() }
                );
            } else if (req.gym) {
                result = await GymNotification.updateMany(
                    { gymId: adminId, read: false },
                    { read: true, readAt: new Date() }
                );
            }

            res.json({
                success: true,
                message: 'All notifications marked as read',
                modifiedCount: result?.modifiedCount || 0
            });

        } catch (error) {
            console.error('Error marking all as read:', error);
            res.status(500).json({
                success: false,
                message: 'Error marking all as read',
                error: error.message
            });
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const adminId = req.admin?.id || req.gym?.id;

            let result = null;
            
            if (req.admin) {
                result = await Notification.findOneAndDelete({
                    _id: notificationId,
                    user: adminId
                });
            } else if (req.gym) {
                result = await GymNotification.findOneAndDelete({
                    _id: notificationId,
                    gymId: adminId
                });
            }

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification deleted'
            });

        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting notification',
                error: error.message
            });
        }
    }

    // ========== SENDING NOTIFICATIONS ==========

    /**
     * Send notification to members with filters
     */
    async sendToMembers(req, res) {
        try {
            const {
                title,
                message,
                priority = 'normal',
                type = 'general',
                filters = {},
                scheduleFor = null
            } = req.body;

            const gymId = req.gym?.id;

            if (!title || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and message are required'
                });
            }

            // Build member filter
            const memberFilter = { gym: gymId };
            
            // Note: membershipStatus filtering is done after fetching members
            // because it's calculated based on membershipValidUntil
            
            if (filters.planSelected) {
                memberFilter.planSelected = filters.planSelected;
            }
            
            if (filters.ageRange) {
                if (filters.ageRange.min) {
                    memberFilter.age = { ...memberFilter.age, $gte: filters.ageRange.min };
                }
                if (filters.ageRange.max) {
                    memberFilter.age = { ...memberFilter.age, $lte: filters.ageRange.max };
                }
            }
            
            if (filters.gender) {
                // Capitalize first letter to match Member model enum
                const genderCapitalized = filters.gender.charAt(0).toUpperCase() + filters.gender.slice(1).toLowerCase();
                memberFilter.gender = genderCapitalized;
            }

            if (filters.specificMembers && filters.specificMembers.length > 0) {
                memberFilter._id = { $in: filters.specificMembers };
            }

            // Get matching members
            let members = await Member.find(memberFilter)
                .select('memberName email phone membershipValidUntil paymentStatus')
                .lean();
            
            console.log(`📋 Found ${members.length} members matching initial filter for gym ${gymId}`);
            
            // Filter by membership status if specified
            if (filters.membershipStatus) {
                const now = new Date();
                const beforeFilterCount = members.length;
                if (filters.membershipStatus === 'active') {
                    members = members.filter(m => {
                        if (!m.membershipValidUntil) return false;
                        const validDate = new Date(m.membershipValidUntil);
                        return validDate >= now;
                    });
                } else if (filters.membershipStatus === 'expired') {
                    members = members.filter(m => {
                        if (!m.membershipValidUntil) return true;
                        const validDate = new Date(m.membershipValidUntil);
                        return validDate < now;
                    });
                } else if (filters.membershipStatus === 'pending') {
                    members = members.filter(m => m.paymentStatus === 'pending');
                }
                console.log(`🔍 Filtered from ${beforeFilterCount} to ${members.length} members by status '${filters.membershipStatus}'`);
            }
            
            // Find matching users by email for notification delivery
            const memberEmails = members.map(m => m.email);
            const users = await User.find({ email: { $in: memberEmails } })
                .select('_id email')
                .lean();
            
            console.log(`👥 Found ${users.length} user accounts matching ${memberEmails.length} member emails`);
            
            // Create email to userId map
            const emailToUserId = {};
            users.forEach(user => {
                emailToUserId[user.email] = user._id;
            });

            // Track stats
            let successCount = 0;
            let failureCount = 0;
            const failedRecipients = [];

            // Create notifications for each member
            const notifications = [];
            for (const member of members) {
                const userId = emailToUserId[member.email];
                
                if (!userId) {
                    failureCount++;
                    failedRecipients.push({
                        memberId: member._id,
                        name: member.memberName,
                        email: member.email,
                        reason: 'No linked user account found'
                    });
                    continue;
                }

                notifications.push({
                    title,
                    message,
                    type,
                    priority,
                    userId,
                    user: userId,
                    read: false,
                    isRead: false,
                    timestamp: scheduleFor ? new Date(scheduleFor) : new Date(),
                    createdAt: new Date(),
                    metadata: {
                        source: 'gym-admin',
                        gymId,
                        filters,
                        sentAt: new Date().toISOString(),
                        memberName: member.memberName
                    }
                });
            }

            if (notifications.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No members match the specified filters or have valid user accounts',
                    stats: {
                        totalQueried: members.length,
                        membersWithUserAccounts: users.length,
                        successCount: 0,
                        failureCount: failureCount,
                        failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined
                    }
                });
            }

            // Save notifications with error handling
            try {
                const result = await Notification.insertMany(notifications, { ordered: false });
                successCount = result.length;
            } catch (insertError) {
                // Handle partial success in bulk insert
                if (insertError.writeErrors) {
                    successCount = notifications.length - insertError.writeErrors.length;
                    failureCount += insertError.writeErrors.length;
                    
                    insertError.writeErrors.forEach(err => {
                        failedRecipients.push({
                            reason: err.errmsg || 'Database insert error'
                        });
                    });
                } else {
                    throw insertError;
                }
            }

            // Prepare detailed response
            const response = {
                success: true,
                message: `Notification sent successfully to ${successCount} member${successCount !== 1 ? 's' : ''}`,
                stats: {
                    totalMembers: members.length,
                    membersWithUserAccounts: users.length,
                    successCount,
                    failureCount,
                    deliveryRate: members.length > 0 ? ((successCount / members.length) * 100).toFixed(2) + '%' : '0%'
                },
                notification: {
                    title,
                    type,
                    priority,
                    scheduledFor: scheduleFor,
                    sentAt: new Date().toISOString()
                }
            };

            // Include failure details if any
            if (failureCount > 0) {
                response.stats.failedRecipients = failedRecipients;
                response.message += ` (${failureCount} failed)`;
            }

            console.log(`✅ Notification sent: ${successCount} succeeded, ${failureCount} failed out of ${members.length} members`);

            res.json(response);

        } catch (error) {
            console.error('❌ Error sending notification to members:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending notification',
                error: error.message
            });
        }
    }

    /**
     * Send notification to super admin (bug report/escalation)
     */
    async sendToSuperAdmin(req, res) {
        try {
            const {
                title,
                message,
                type = 'bug-report',
                priority = 'high',
                metadata = {}
            } = req.body;

            const gymId = req.gym?.id;
            const gymData = await Gym.findById(gymId).select('gymName email').lean();

            if (!title || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and message are required'
                });
            }

            // Find super admin
            const superAdmin = await Admin.findOne({ role: 'super-admin' });
            
            if (!superAdmin) {
                return res.status(404).json({
                    success: false,
                    message: 'Super admin not found'
                });
            }

            // Create notification for super admin
            const notification = new Notification({
                title: `[${gymData?.gymName || 'Gym'}] ${title}`,
                message,
                type,
                priority,
                user: superAdmin._id,
                read: false,
                isRead: false,
                timestamp: new Date(),
                createdAt: new Date(),
                metadata: {
                    source: 'gym-admin',
                    gymId,
                    gymName: gymData?.gymName,
                    gymEmail: gymData?.email,
                    ...metadata
                }
            });

            await notification.save();

            // TODO: Send real-time notification via WebSocket/FCM for faster communication

            res.json({
                success: true,
                message: 'Report sent to super admin',
                notification
            });

        } catch (error) {
            console.error('Error sending to super admin:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending report',
                error: error.message
            });
        }
    }

    /**
     * Send membership renewal reminders
     */
    async sendRenewalReminders(req, res) {
        try {
            const {
                daysBeforeExpiry = 7,
                customMessage = null
            } = req.body;

            const gymId = req.gym?.id;

            // Find members whose membership expires in the specified days
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

            const members = await Member.find({
                gymId,
                membershipStatus: 'active',
                membershipEndDate: {
                    $gte: new Date(),
                    $lte: expiryDate
                }
            }).populate('userId').lean();

            const notifications = [];
            
            for (const member of members) {
                if (!member.userId) continue;

                const daysLeft = Math.ceil((new Date(member.membershipEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                
                const notification = {
                    title: 'Membership Renewal Reminder',
                    message: customMessage || `Your membership expires in ${daysLeft} days. Please renew to continue enjoying our services.`,
                    type: 'membership-renewal',
                    priority: daysLeft <= 3 ? 'high' : 'normal',
                    userId: member.userId._id || member.userId,
                    user: member.userId._id || member.userId,
                    read: false,
                    isRead: false,
                    timestamp: new Date(),
                    createdAt: new Date(),
                    metadata: {
                        source: 'gym-admin',
                        gymId,
                        memberId: member._id,
                        membershipEndDate: member.membershipEndDate,
                        daysUntilExpiry: daysLeft
                    }
                };

                notifications.push(notification);
            }

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }

            res.json({
                success: true,
                message: `Renewal reminders sent to ${notifications.length} members`,
                recipientCount: notifications.length
            });

        } catch (error) {
            console.error('Error sending renewal reminders:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending renewal reminders',
                error: error.message
            });
        }
    }

    /**
     * Send holiday/closure notice
     */
    async sendHolidayNotice(req, res) {
        try {
            const {
                title,
                message,
                holidayDate,
                resumeDate
            } = req.body;

            const gymId = req.gym?.id;

            if (!title || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and message are required'
                });
            }

            // Get all active members
            const members = await Member.find({
                gymId,
                membershipStatus: 'active'
            }).select('userId').lean();

            const userIds = members.map(m => m.userId).filter(id => id);

            const notifications = userIds.map(userId => ({
                title,
                message,
                type: 'holiday-notice',
                priority: 'high',
                userId,
                user: userId,
                read: false,
                isRead: false,
                timestamp: new Date(),
                createdAt: new Date(),
                metadata: {
                    source: 'gym-admin',
                    gymId,
                    holidayDate,
                    resumeDate
                }
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }

            res.json({
                success: true,
                message: `Holiday notice sent to ${notifications.length} members`,
                recipientCount: notifications.length
            });

        } catch (error) {
            console.error('Error sending holiday notice:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending holiday notice',
                error: error.message
            });
        }
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats(req, res) {
        try {
            const gymId = req.gym?.id;
            const adminId = req.admin?.id;

            const filter = {};
            if (gymId) {
                filter['metadata.gymId'] = gymId;
            } else if (adminId) {
                filter.user = adminId;
            }

            // Get stats by type
            const typeStats = await Notification.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        unread: {
                            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
                        }
                    }
                }
            ]);

            // Get stats by priority
            const priorityStats = await Notification.aggregate([
                { $match: { ...filter, read: false } },
                {
                    $group: {
                        _id: '$priority',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentCount = await Notification.countDocuments({
                ...filter,
                createdAt: { $gte: sevenDaysAgo }
            });

            res.json({
                success: true,
                stats: {
                    byType: typeStats,
                    byPriority: priorityStats,
                    recentCount,
                    totalUnread: typeStats.reduce((sum, stat) => sum + stat.unread, 0)
                }
            });

        } catch (error) {
            console.error('Error getting notification stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting notification stats',
                error: error.message
            });
        }
    }
}

module.exports = new NotificationController();
