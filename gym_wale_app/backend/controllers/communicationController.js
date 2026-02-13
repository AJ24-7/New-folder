// ============= ADMIN COMMUNICATION & SUPPORT CONTROLLER =============
// Comprehensive communication system for admin dashboard

const Support = require('../models/Support');
const Admin = require('../models/admin');
const Gym = require('../models/gym');
const User = require('../models/User');
const Trainer = require('../models/trainerModel');
const GymNotification = require('../models/GymNotification');
const Notification = require('../models/Notification');

class CommunicationController {
    // ========== SUPPORT TICKET MANAGEMENT ==========
    
    // Get support statistics for dashboard
    async getSupportStats(req, res) {
        try {
            const stats = await Support.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const priorityStats = await Support.aggregate([
                {
                    $match: { status: { $ne: 'closed' } }
                },
                {
                    $group: {
                        _id: '$priority',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const userTypeStats = await Support.aggregate([
                {
                    $group: {
                        _id: '$userType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Calculate average response time
            const avgResponseTime = await this.calculateAverageResponseTime();

            const formattedStats = {
                open: stats.find(s => s._id === 'open')?.count || 0,
                inProgress: stats.find(s => s._id === 'in-progress')?.count || 0,
                resolved: stats.find(s => s._id === 'resolved')?.count || 0,
                closed: stats.find(s => s._id === 'closed')?.count || 0,
                priority: {
                    low: priorityStats.find(s => s._id === 'low')?.count || 0,
                    medium: priorityStats.find(s => s._id === 'medium')?.count || 0,
                    high: priorityStats.find(s => s._id === 'high')?.count || 0,
                    urgent: priorityStats.find(s => s._id === 'urgent')?.count || 0
                },
                userTypes: {
                    users: userTypeStats.find(s => s._id === 'User')?.count || 0,
                    gyms: userTypeStats.find(s => s._id === 'Gym')?.count || 0,
                    trainers: userTypeStats.find(s => s._id === 'Trainer')?.count || 0
                },
                avgResponseTime: avgResponseTime
            };

            res.json({
                success: true,
                stats: formattedStats
            });

        } catch (error) {
            console.error('Error fetching support stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching support statistics'
            });
        }
    }

    // Get support tickets with filtering and pagination
    async getSupportTickets(req, res) {
        try {
            const {
                userType = 'all',
                status = 'all',
                priority = 'all',
                category = 'all',
                search = '',
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Build filter object
            const filter = {};
            
            if (userType !== 'all') {
                const userTypeMap = {
                    'users': 'User',
                    'gym-admins': 'Gym',
                    'trainers': 'Trainer'
                };
                filter.userType = userTypeMap[userType] || userType;
            }

            if (status !== 'all') filter.status = status;
            if (priority !== 'all') filter.priority = priority;
            if (category !== 'all') filter.category = category;

            if (search) {
                filter.$or = [
                    { subject: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { userName: { $regex: search, $options: 'i' } },
                    { userEmail: { $regex: search, $options: 'i' } },
                    { ticketId: { $regex: search, $options: 'i' } }
                ];
            }

            // Sorting
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Pagination
            const skip = (page - 1) * limit;

            const tickets = await Support.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('assignedTo', 'name email')
                .lean();

            const totalTickets = await Support.countDocuments(filter);

            res.json({
                success: true,
                tickets: tickets,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalTickets / limit),
                    totalItems: totalTickets,
                    itemsPerPage: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching support tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching support tickets'
            });
        }
    }

    // Get specific ticket details
    async getTicketDetails(req, res) {
        try {
            const { ticketId } = req.params;

            const ticket = await Support.findOne({ ticketId })
                .populate('assignedTo', 'name email')
                .populate('userId')
                .lean();

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            res.json({
                success: true,
                ticket: ticket
            });

        } catch (error) {
            console.error('Error fetching ticket details:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching ticket details'
            });
        }
    }

    // Reply to support ticket
    async replyToTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const { message, status, priority, sendVia = ['notification'] } = req.body;
            const adminId = req.admin.id;

            const ticket = await Support.findOne({ ticketId });
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            // Add reply message
            const replyMessage = {
                sender: 'admin',
                message: message,
                timestamp: new Date(),
                sentVia: sendVia
            };

            ticket.messages.push(replyMessage);

            // Update ticket status and priority if provided
            if (status) ticket.status = status;
            if (priority) ticket.priority = priority;
            
            // Assign ticket to current admin if not already assigned
            if (!ticket.assignedTo) {
                ticket.assignedTo = adminId;
            }

            ticket.lastAdminReply = new Date();
            ticket.updatedAt = new Date();

            await ticket.save();

            // Send notifications based on sendVia channels
            await this.sendTicketReplyNotifications(ticket, replyMessage, sendVia);

            res.json({
                success: true,
                message: 'Reply sent successfully',
                ticket: ticket
            });

        } catch (error) {
            console.error('Error replying to ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending reply'
            });
        }
    }

    // Update ticket status
    async updateTicketStatus(req, res) {
        try {
            const { ticketId } = req.params;
            const { status, priority, assignedTo } = req.body;
            const adminId = req.admin.id;

            const ticket = await Support.findOne({ ticketId });
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            const oldStatus = ticket.status;

            // Update fields
            if (status) ticket.status = status;
            if (priority) ticket.priority = priority;
            if (assignedTo) ticket.assignedTo = assignedTo;

            ticket.updatedAt = new Date();

            // Add system message for status change
            if (status && status !== oldStatus) {
                const statusMessage = {
                    sender: 'admin',
                    message: `Ticket status changed from "${oldStatus}" to "${status}"`,
                    timestamp: new Date(),
                    sentVia: ['notification']
                };
                ticket.messages.push(statusMessage);
            }

            await ticket.save();

            // Notify user about status change
            if (status && status !== oldStatus) {
                await this.sendStatusChangeNotification(ticket, oldStatus, status);
            }

            res.json({
                success: true,
                message: 'Ticket updated successfully',
                ticket: ticket
            });

        } catch (error) {
            console.error('Error updating ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating ticket'
            });
        }
    }

    // ========== COMMUNICATION CHANNELS ==========

    // Send bulk notifications to users/gyms/trainers
    async sendBulkNotification(req, res) {
        try {
            const {
                recipients, // 'all', 'users', 'gyms', 'trainers', or array of IDs
                title,
                message,
                priority = 'medium',
                sendVia = ['notification'],
                scheduledFor = null
            } = req.body;
            const adminId = req.admin.id;

            // Validate required fields
            if (!recipients || !title || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipients, title, and message are required'
                });
            }

            // Get recipient list
            const recipientList = await this.getRecipientList(recipients);

            // Create notifications
            const notifications = [];
            for (const recipient of recipientList) {
                const notification = {
                    title,
                    message,
                    recipient: recipient._id,
                    recipientType: recipient.type,
                    sender: adminId,
                    senderType: 'Admin',
                    priority,
                    channels: sendVia,
                    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
                    createdAt: new Date()
                };
                notifications.push(notification);
            }

            // Save notifications
            await Notification.insertMany(notifications);

            // Send immediate notifications if not scheduled
            if (!scheduledFor) {
                for (const notification of notifications) {
                    await this.sendNotificationViaChannels(notification, sendVia);
                }
            }

            res.json({
                success: true,
                message: `Notification sent to ${recipientList.length} recipients`,
                recipientCount: recipientList.length
            });

        } catch (error) {
            console.error('Error sending bulk notification:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending notification'
            });
        }
    }

    // Send direct message to specific user/gym/trainer
    async sendDirectMessage(req, res) {
        try {
            const {
                recipientId,
                recipientType,
                title,
                message,
                priority = 'medium',
                sendVia = ['notification']
            } = req.body;
            const adminId = req.admin.id;

            // Validate recipient exists
            const recipient = await this.validateRecipient(recipientId, recipientType);
            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Recipient not found'
                });
            }

            // Create notification
            const notification = new Notification({
                title,
                message,
                recipient: recipientId,
                recipientType,
                sender: adminId,
                senderType: 'Admin',
                priority,
                channels: sendVia,
                isDirectMessage: true,
                createdAt: new Date()
            });

            await notification.save();

            // Send via specified channels
            await this.sendNotificationViaChannels(notification, sendVia);

            res.json({
                success: true,
                message: 'Direct message sent successfully',
                notification: notification
            });

        } catch (error) {
            console.error('Error sending direct message:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending direct message'
            });
        }
    }

    // ========== GRIEVANCE MANAGEMENT ==========

    // Get grievances with filtering
    async getGrievances(req, res) {
        try {
            const {
                status = 'all',
                priority = 'all',
                userType = 'all',
                page = 1,
                limit = 20
            } = req.query;

            const filter = { category: 'complaint' };
            if (status !== 'all') filter.status = status;
            if (priority !== 'all') filter.priority = priority;
            if (userType !== 'all') {
                const userTypeMap = {
                    'users': 'User',
                    'gyms': 'Gym',
                    'trainers': 'Trainer'
                };
                filter.userType = userTypeMap[userType] || userType;
            }

            const skip = (page - 1) * limit;

            const grievances = await Support.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('assignedTo', 'name email')
                .lean();

            const totalGrievances = await Support.countDocuments(filter);

            res.json({
                success: true,
                grievances: grievances,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalGrievances / limit),
                    totalItems: totalGrievances,
                    itemsPerPage: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching grievances:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching grievances'
            });
        }
    }

    // Escalate grievance
    async escalateGrievance(req, res) {
        try {
            const { ticketId } = req.params;
            const { reason, escalateTo } = req.body;
            const adminId = req.admin.id;

            const grievance = await Support.findOne({ ticketId });
            if (!grievance) {
                return res.status(404).json({
                    success: false,
                    message: 'Grievance not found'
                });
            }

            // Update escalation
            grievance.escalationLevel = (grievance.escalationLevel || 0) + 1;
            grievance.priority = 'urgent';
            grievance.assignedTo = escalateTo || null;

            // Add escalation message
            const escalationMessage = {
                sender: 'admin',
                message: `Grievance escalated to level ${grievance.escalationLevel}. Reason: ${reason}`,
                timestamp: new Date(),
                sentVia: ['notification']
            };
            grievance.messages.push(escalationMessage);

            await grievance.save();

            // Notify relevant parties
            await this.sendEscalationNotifications(grievance, reason);

            res.json({
                success: true,
                message: 'Grievance escalated successfully',
                grievance: grievance
            });

        } catch (error) {
            console.error('Error escalating grievance:', error);
            res.status(500).json({
                success: false,
                message: 'Error escalating grievance'
            });
        }
    }

    // ========== HELPER METHODS ==========

    // Calculate average response time
    async calculateAverageResponseTime() {
        try {
            const tickets = await Support.find({
                status: { $in: ['resolved', 'closed'] },
                lastAdminReply: { $exists: true }
            }).select('createdAt lastAdminReply');

            if (tickets.length === 0) return '0h 0m';

            const totalTime = tickets.reduce((sum, ticket) => {
                const responseTime = ticket.lastAdminReply - ticket.createdAt;
                return sum + responseTime;
            }, 0);

            const avgTime = totalTime / tickets.length;
            const hours = Math.floor(avgTime / (1000 * 60 * 60));
            const minutes = Math.floor((avgTime % (1000 * 60 * 60)) / (1000 * 60));

            return `${hours}h ${minutes}m`;
        } catch (error) {
            console.error('Error calculating response time:', error);
            return '0h 0m';
        }
    }

    // Send ticket reply notifications
    async sendTicketReplyNotifications(ticket, replyMessage, sendVia) {
        try {
            const notification = {
                title: `Reply to Ticket #${ticket.ticketId}`,
                message: replyMessage.message.substring(0, 100) + (replyMessage.message.length > 100 ? '...' : ''),
                recipient: ticket.userId,
                recipientType: ticket.userType,
                type: 'support-reply',
                metadata: {
                    ticketId: ticket.ticketId,
                    originalSubject: ticket.subject
                }
            };

            await this.sendNotificationViaChannels(notification, sendVia);
        } catch (error) {
            console.error('Error sending ticket reply notifications:', error);
        }
    }

    // Send status change notification
    async sendStatusChangeNotification(ticket, oldStatus, newStatus) {
        try {
            const notification = {
                title: `Ticket Status Updated`,
                message: `Your ticket #${ticket.ticketId} status has been updated from "${oldStatus}" to "${newStatus}"`,
                recipient: ticket.userId,
                recipientType: ticket.userType,
                type: 'status-change',
                metadata: {
                    ticketId: ticket.ticketId,
                    oldStatus,
                    newStatus
                }
            };

            await this.sendNotificationViaChannels(notification, ['notification']);
        } catch (error) {
            console.error('Error sending status change notification:', error);
        }
    }

    // Send escalation notifications
    async sendEscalationNotifications(grievance, reason) {
        try {
            // Notify user about escalation
            const userNotification = {
                title: 'Grievance Escalated',
                message: `Your grievance #${grievance.ticketId} has been escalated for priority resolution.`,
                recipient: grievance.userId,
                recipientType: grievance.userType,
                type: 'escalation',
                metadata: {
                    ticketId: grievance.ticketId,
                    escalationLevel: grievance.escalationLevel,
                    reason
                }
            };

            await this.sendNotificationViaChannels(userNotification, ['notification']);

            // Notify senior admin if assigned
            if (grievance.assignedTo) {
                const adminNotification = {
                    title: 'Grievance Escalated to You',
                    message: `Grievance #${grievance.ticketId} has been escalated to your attention.`,
                    recipient: grievance.assignedTo,
                    recipientType: 'Admin',
                    type: 'escalation-assignment',
                    metadata: {
                        ticketId: grievance.ticketId,
                        escalationLevel: grievance.escalationLevel,
                        reason
                    }
                };

                await this.sendNotificationViaChannels(adminNotification, ['notification']);
            }
        } catch (error) {
            console.error('Error sending escalation notifications:', error);
        }
    }

    // Get recipient list based on criteria
    async getRecipientList(recipients) {
        try {
            let recipientList = [];

            if (Array.isArray(recipients)) {
                // Specific recipient IDs provided
                for (const recipientData of recipients) {
                    const recipient = await this.validateRecipient(recipientData.id, recipientData.type);
                    if (recipient) {
                        recipientList.push({ ...recipient, type: recipientData.type });
                    }
                }
            } else {
                // Bulk recipients
                switch (recipients) {
                    case 'all':
                        const users = await User.find({ status: 'active' }).select('_id name email').lean();
                        const gyms = await Gym.find({ status: 'approved' }).select('_id gymName email').lean();
                        const trainers = await Trainer.find({ status: 'approved' }).select('_id name email').lean();
                        
                        recipientList = [
                            ...users.map(u => ({ ...u, type: 'User' })),
                            ...gyms.map(g => ({ ...g, type: 'Gym' })),
                            ...trainers.map(t => ({ ...t, type: 'Trainer' }))
                        ];
                        break;
                    case 'users':
                        const allUsers = await User.find({ status: 'active' }).select('_id name email').lean();
                        recipientList = allUsers.map(u => ({ ...u, type: 'User' }));
                        break;
                    case 'gyms':
                        const allGyms = await Gym.find({ status: 'approved' }).select('_id gymName email').lean();
                        recipientList = allGyms.map(g => ({ ...g, type: 'Gym' }));
                        break;
                    case 'trainers':
                        const allTrainers = await Trainer.find({ status: 'approved' }).select('_id name email').lean();
                        recipientList = allTrainers.map(t => ({ ...t, type: 'Trainer' }));
                        break;
                }
            }

            return recipientList;
        } catch (error) {
            console.error('Error getting recipient list:', error);
            return [];
        }
    }

    // Validate recipient exists
    async validateRecipient(recipientId, recipientType) {
        try {
            let recipient = null;
            switch (recipientType) {
                case 'User':
                    recipient = await User.findById(recipientId).select('_id name email').lean();
                    break;
                case 'Gym':
                    recipient = await Gym.findById(recipientId).select('_id gymName email').lean();
                    break;
                case 'Trainer':
                    recipient = await Trainer.findById(recipientId).select('_id name email').lean();
                    break;
                case 'Admin':
                    recipient = await Admin.findById(recipientId).select('_id name email').lean();
                    break;
            }
            return recipient;
        } catch (error) {
            console.error('Error validating recipient:', error);
            return null;
        }
    }

    // Send notification via multiple channels
    async sendNotificationViaChannels(notification, channels) {
        try {
            const promises = [];

            for (const channel of channels) {
                switch (channel) {
                    case 'notification':
                        promises.push(this.sendInAppNotification(notification));
                        break;
                    case 'email':
                        promises.push(this.sendEmailNotification(notification));
                        break;
                    case 'whatsapp':
                        promises.push(this.sendWhatsAppNotification(notification));
                        break;
                }
            }

            await Promise.allSettled(promises);
        } catch (error) {
            console.error('Error sending notification via channels:', error);
        }
    }

    // Send in-app notification
    async sendInAppNotification(notification) {
        try {
            // Create notification record
            const notificationRecord = new Notification({
                title: notification.title,
                message: notification.message,
                recipient: notification.recipient,
                recipientType: notification.recipientType,
                sender: notification.sender,
                senderType: notification.senderType || 'Admin',
                type: notification.type || 'general',
                metadata: notification.metadata || {},
                read: false,
                createdAt: new Date()
            });

            await notificationRecord.save();
            console.log(`✅ In-app notification sent to ${notification.recipientType} ${notification.recipient}`);
        } catch (error) {
            console.error('Error sending in-app notification:', error);
        }
    }

    // Send email notification
    async sendEmailNotification(notification) {
        try {
            // Implement email sending logic here
            // This would integrate with your email service (SendGrid, AWS SES, etc.)
            console.log(`📧 Email notification would be sent: ${notification.title}`);
        } catch (error) {
            console.error('Error sending email notification:', error);
        }
    }

    // Send WhatsApp notification
    async sendWhatsAppNotification(notification) {
        try {
            // Implement WhatsApp sending logic here
            // This would integrate with WhatsApp Business API
            console.log(`📱 WhatsApp notification would be sent: ${notification.title}`);
        } catch (error) {
            console.error('Error sending WhatsApp notification:', error);
        }
    }

    // ========== GYM ADMIN COMMUNICATION ==========
    
    // Get gym admin communications for main admin
    async getGymAdminCommunications(req, res) {
        try {
            const { page = 1, limit = 50, gymId } = req.query;
            
            const filter = { type: 'gym-admin-communication' };
            if (gymId) filter.gymId = gymId;

            const communications = await Support.find(filter)
                .populate('userId', 'name email')
                .populate('gymId', 'gymName email phone')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();

            const total = await Support.countDocuments(filter);

            res.json({
                success: true,
                messages: communications.map(comm => ({
                    communicationId: comm._id,
                    gymId: comm.gymId?._id,
                    gymName: comm.gymId?.gymName,
                    message: comm.description,
                    type: comm.category,
                    priority: comm.priority,
                    status: comm.status,
                    createdAt: comm.createdAt,
                    metadata: comm.metadata
                })),
                pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    count: communications.length,
                    totalItems: total
                }
            });
        } catch (error) {
            console.error('Error getting gym admin communications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get gym admin communications'
            });
        }
    }

    // Send notification to specific gym admin
    async notifyGymAdmin(req, res) {
        try {
            const { gymId, notification } = req.body;

            if (!gymId || !notification) {
                return res.status(400).json({
                    success: false,
                    message: 'Gym ID and notification data are required'
                });
            }

            // Create notification in gym notifications table
            const gymNotification = new GymNotification({
                gymId,
                title: notification.title,
                message: notification.message,
                type: notification.type || 'admin-message',
                priority: notification.priority || 'medium',
                status: 'unread',
                metadata: {
                    ...notification.metadata,
                    sentByAdmin: req.admin.id,
                    sentAt: new Date()
                }
            });

            await gymNotification.save();

            // Also create a support record for tracking
            const supportRecord = new Support({
                ticketId: `ADMIN-${Date.now()}`,
                gymId,
                userType: 'gym',
                category: 'admin-communication',
                subject: notification.title,
                description: notification.message,
                priority: notification.priority || 'medium',
                status: 'open',
                metadata: {
                    sentByAdmin: req.admin.id,
                    communicationType: 'admin-to-gym'
                }
            });

            await supportRecord.save();

            console.log(`📤 Notification sent to gym admin: ${gymId}`);

            res.json({
                success: true,
                message: 'Notification sent to gym admin successfully',
                notificationId: gymNotification._id,
                supportTicketId: supportRecord._id
            });

        } catch (error) {
            console.error('Error sending notification to gym admin:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send notification to gym admin'
            });
        }
    }

    // Send message to gym admin
    async sendMessageToGym(req, res) {
        try {
            const { gymId, message, priority = 'medium', type = 'admin-message' } = req.body;

            if (!gymId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Gym ID and message are required'
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

            // Create communication record
            const communication = new Support({
                ticketId: `COMM-${Date.now()}`,
                gymId,
                userType: 'gym',
                category: 'admin-communication',
                subject: `Message from Main Admin`,
                description: message,
                priority,
                status: 'open',
                metadata: {
                    sentByAdmin: req.admin.id,
                    communicationType: 'admin-to-gym',
                    messageType: type
                }
            });

            await communication.save();

            // Send notification to gym
            const gymNotification = new GymNotification({
                gymId,
                title: 'New Message from Main Admin',
                message: message,
                type: 'admin-message',
                priority,
                status: 'unread',
                metadata: {
                    communicationId: communication._id,
                    sentByAdmin: req.admin.id
                }
            });

            await gymNotification.save();

            console.log(`💬 Message sent to gym: ${gym.gymName}`);

            res.json({
                success: true,
                message: 'Message sent to gym successfully',
                communicationId: communication._id
            });

        } catch (error) {
            console.error('Error sending message to gym:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send message to gym'
            });
        }
    }

    // Get communication history with specific gym
    async getCommunicationHistory(req, res) {
        try {
            const { gymId } = req.params;
            const { page = 1, limit = 50 } = req.query;

            if (!gymId) {
                return res.status(400).json({
                    success: false,
                    message: 'Gym ID is required'
                });
            }

            // Get communications from both directions
            const communications = await Support.find({
                gymId,
                category: 'admin-communication'
            })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

            const total = await Support.countDocuments({
                gymId,
                category: 'admin-communication'
            });

            res.json({
                success: true,
                communications: communications.map(comm => ({
                    id: comm._id,
                    from: comm.metadata?.communicationType === 'admin-to-gym' ? 'admin' : 'gym',
                    message: comm.description,
                    priority: comm.priority,
                    timestamp: comm.createdAt,
                    status: comm.status,
                    metadata: comm.metadata
                })),
                pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    count: communications.length,
                    totalItems: total
                }
            });

        } catch (error) {
            console.error('Error getting communication history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get communication history'
            });
        }
    }

    // Handle incoming message from gym admin
    async receiveGymAdminMessage(req, res) {
        try {
            const { gymId, message, subject, priority = 'medium', category = 'general' } = req.body;

            if (!gymId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Gym ID and message are required'
                });
            }

            // Create support ticket for gym admin message
            const supportTicket = new Support({
                ticketId: `GYM-${Date.now()}`,
                gymId,
                userType: 'gym',
                category,
                subject: subject || 'Message from Gym Admin',
                description: message,
                priority,
                status: 'open',
                metadata: {
                    communicationType: 'gym-to-admin',
                    receivedAt: new Date()
                }
            });

            await supportTicket.save();

            console.log(`📨 Received message from gym admin: ${gymId}`);

            // Notify main admin (this would trigger real-time notifications)
            // In a real implementation, you'd use WebSockets or Server-Sent Events
            
            res.json({
                success: true,
                message: 'Message received successfully',
                ticketId: supportTicket.ticketId,
                supportId: supportTicket._id
            });

        } catch (error) {
            console.error('Error receiving gym admin message:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to receive gym admin message'
            });
        }
    }

    // ========== ADDITIONAL METHODS FOR ROUTES ==========

    // Get support ticket details (alias for getTicketDetails)
    async getSupportTicketDetails(req, res) {
        return this.getTicketDetails(req, res);
    }

    // Add response to support ticket (alias for replyToTicket)
    async addTicketResponse(req, res) {
        return this.replyToTicket(req, res);
    }

    // Escalate support ticket
    async escalateTicket(req, res) {
        try {
            const { ticketId } = req.params;
            const { reason, escalationLevel = 'high' } = req.body;
            const adminId = req.admin.id;

            const ticket = await Support.findOne({ ticketId });
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            // Update ticket with escalation
            ticket.priority = 'urgent';
            ticket.status = 'escalated';
            ticket.escalationHistory.push({
                escalatedBy: adminId,
                reason: reason,
                level: escalationLevel,
                timestamp: new Date()
            });

            await ticket.save();

            res.json({
                success: true,
                message: 'Ticket escalated successfully',
                ticket: ticket
            });

        } catch (error) {
            console.error('Error escalating ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error escalating ticket'
            });
        }
    }

    // Send notification to gym admin
    async sendGymNotification(req, res) {
        return this.notifyGymAdmin(req, res);
    }

    // Get communication history with gym admin
    async getGymCommunications(req, res) {
        return this.getCommunicationHistory(req, res);
    }

    // Get messages from gym admins
    async getGymMessages(req, res) {
        return this.getGymAdminCommunications(req, res);
    }

    // Mark gym message as read
    async markGymMessageRead(req, res) {
        try {
            const { messageId } = req.params;
            
            // Update the message as read
            // This would depend on your message model structure
            
            res.json({
                success: true,
                message: 'Message marked as read'
            });

        } catch (error) {
            console.error('Error marking message as read:', error);
            res.status(500).json({
                success: false,
                message: 'Error marking message as read'
            });
        }
    }

    // Get admin notifications
    async getAdminNotifications(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;

            const notifications = await Notification.find({ userType: 'admin' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const unreadCount = await Notification.countDocuments({ 
                userType: 'admin', 
                read: false 
            });

            res.json({
                success: true,
                notifications: notifications,
                unreadCount: unreadCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil((await Notification.countDocuments({ userType: 'admin' })) / limit)
            });

        } catch (error) {
            console.error('Error fetching admin notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching notifications'
            });
        }
    }

    // Mark notification as read
    async markNotificationRead(req, res) {
        try {
            const { notificationId } = req.params;

            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { read: true, readAt: new Date() },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification marked as read',
                notification: notification
            });

        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                message: 'Error marking notification as read'
            });
        }
    }

    // Mark all notifications as read
    async markAllNotificationsRead(req, res) {
        try {
            const result = await Notification.updateMany(
                { userType: 'admin', read: false },
                { read: true, readAt: new Date() }
            );

            res.json({
                success: true,
                message: 'All notifications marked as read',
                modifiedCount: result.modifiedCount
            });

        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                message: 'Error marking notifications as read'
            });
        }
    }

    // Delete notification
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;

            const notification = await Notification.findByIdAndDelete(notificationId);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting notification'
            });
        }
    }

    // Bulk update ticket statuses
    async bulkUpdateTicketStatus(req, res) {
        try {
            const { ticketIds, status } = req.body;

            if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid ticket IDs are required'
                });
            }

            const result = await Support.updateMany(
                { ticketId: { $in: ticketIds } },
                { status: status, updatedAt: new Date() }
            );

            res.json({
                success: true,
                message: 'Tickets updated successfully',
                modifiedCount: result.modifiedCount
            });

        } catch (error) {
            console.error('Error bulk updating tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating tickets'
            });
        }
    }

    // Export support data
    async exportSupportData(req, res) {
        try {
            const { format = 'json', startDate, endDate } = req.query;

            let filter = {};
            if (startDate && endDate) {
                filter.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const tickets = await Support.find(filter)
                .populate('userId', 'name email')
                .populate('assignedTo', 'name email')
                .lean();

            if (format === 'csv') {
                // Convert to CSV format
                const csv = this.convertToCSV(tickets);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=support_data.csv');
                res.send(csv);
            } else {
                res.json({
                    success: true,
                    data: tickets,
                    totalRecords: tickets.length
                });
            }

        } catch (error) {
            console.error('Error exporting support data:', error);
            res.status(500).json({
                success: false,
                message: 'Error exporting data'
            });
        }
    }

    // Get communication analytics
    async getCommunicationAnalytics(req, res) {
        try {
            const { period = '30d' } = req.query;
            
            // Calculate date range based on period
            const endDate = new Date();
            const startDate = new Date();
            
            if (period === '7d') {
                startDate.setDate(endDate.getDate() - 7);
            } else if (period === '30d') {
                startDate.setDate(endDate.getDate() - 30);
            } else if (period === '90d') {
                startDate.setDate(endDate.getDate() - 90);
            }

            const analytics = await Support.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            status: "$status"
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.date": 1 }
                }
            ]);

            res.json({
                success: true,
                analytics: analytics,
                period: period
            });

        } catch (error) {
            console.error('Error fetching communication analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching analytics'
            });
        }
    }

    // Get support ticket trends
    async getSupportTrends(req, res) {
        try {
            const trends = await Support.aggregate([
                {
                    $group: {
                        _id: {
                            month: { $month: "$createdAt" },
                            year: { $year: "$createdAt" },
                            priority: "$priority"
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1 }
                }
            ]);

            res.json({
                success: true,
                trends: trends
            });

        } catch (error) {
            console.error('Error fetching support trends:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching trends'
            });
        }
    }

    // Helper method to convert data to CSV
    convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => {
            return Object.values(item).map(value => {
                if (typeof value === 'object' && value !== null) {
                    return JSON.stringify(value).replace(/"/g, '""');
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });

        return [headers, ...rows].join('\n');
    }
}

const communicationController = new CommunicationController();

// Export both the class and individual methods for flexibility
module.exports = CommunicationController;
module.exports.communicationController = communicationController;

// Export individual methods as well
module.exports.getSupportStats = communicationController.getSupportStats.bind(communicationController);
module.exports.getSupportTickets = communicationController.getSupportTickets.bind(communicationController);
module.exports.getTicketDetails = communicationController.getTicketDetails.bind(communicationController);
module.exports.getSupportTicketDetails = communicationController.getSupportTicketDetails.bind(communicationController);
module.exports.replyToTicket = communicationController.replyToTicket.bind(communicationController);
module.exports.addTicketResponse = communicationController.addTicketResponse.bind(communicationController);
module.exports.updateTicketStatus = communicationController.updateTicketStatus.bind(communicationController);
module.exports.escalateTicket = communicationController.escalateTicket.bind(communicationController);
module.exports.sendBulkNotification = communicationController.sendBulkNotification.bind(communicationController);
module.exports.sendDirectMessage = communicationController.sendDirectMessage.bind(communicationController);
module.exports.getGrievances = communicationController.getGrievances.bind(communicationController);
module.exports.escalateGrievance = communicationController.escalateGrievance.bind(communicationController);

// Gym Admin Communication Methods
module.exports.getGymAdminCommunications = communicationController.getGymAdminCommunications.bind(communicationController);
module.exports.notifyGymAdmin = communicationController.notifyGymAdmin.bind(communicationController);
module.exports.sendGymNotification = communicationController.sendGymNotification.bind(communicationController);
module.exports.sendMessageToGym = communicationController.sendMessageToGym.bind(communicationController);
module.exports.getCommunicationHistory = communicationController.getCommunicationHistory.bind(communicationController);
module.exports.getGymCommunications = communicationController.getGymCommunications.bind(communicationController);
module.exports.getGymMessages = communicationController.getGymMessages.bind(communicationController);
module.exports.markGymMessageRead = communicationController.markGymMessageRead.bind(communicationController);
module.exports.receiveGymAdminMessage = communicationController.receiveGymAdminMessage.bind(communicationController);

// Notification Methods
module.exports.getAdminNotifications = communicationController.getAdminNotifications.bind(communicationController);
module.exports.markNotificationRead = communicationController.markNotificationRead.bind(communicationController);
module.exports.markAllNotificationsRead = communicationController.markAllNotificationsRead.bind(communicationController);
module.exports.deleteNotification = communicationController.deleteNotification.bind(communicationController);

// Bulk Operations
module.exports.bulkUpdateTicketStatus = communicationController.bulkUpdateTicketStatus.bind(communicationController);
module.exports.exportSupportData = communicationController.exportSupportData.bind(communicationController);

// Analytics
module.exports.getCommunicationAnalytics = communicationController.getCommunicationAnalytics.bind(communicationController);
module.exports.getSupportTrends = communicationController.getSupportTrends.bind(communicationController);
