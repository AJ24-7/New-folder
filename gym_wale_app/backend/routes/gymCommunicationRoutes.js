// ============= GYM ADMIN COMMUNICATION ROUTES =============
// Enhanced routes for seamless gym admin to main admin communication

const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const Admin = require('../models/admin');
const Gym = require('../models/gym');
const GymNotification = require('../models/GymNotification');
const gymadminAuth = require('../middleware/gymadminAuth');
const sendEmail = require('../utils/sendEmail');
const whatsappService = require('../services/whatsappService');

// ========== GRIEVANCE & SUPPORT TICKET MANAGEMENT ==========

// Create support ticket / grievance from gym admin
router.post('/support/create', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.gym.id;
        const gymName = req.gym.gymName || 'Unknown Gym';
        
        const {
            title,
            subject,
            description,
            category = 'complaint',
            priority = 'medium',
            affectedMembers = [],
            metadata = {}
        } = req.body;

        // Create support ticket
        const supportTicket = new Support({
            ticketId: `GYM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            subject: subject || title,
            description,
            category,
            priority,
            status: 'open',
            userType: 'Gym',
            userId: gymId,
            userDetails: {
                gymId: gymId,
                gymName: gymName,
                email: req.gym.email,
                phone: req.gym.phone
            },
            source: 'gym-admin-portal',
            metadata: {
                ...metadata,
                gymId,
                gymName,
                submittedBy: 'gym-admin',
                escalationLevel: 'gym-to-admin',
                requiresAdminReview: true,
                affectedMembers
            }
        });

        await supportTicket.save();

        // Notify main admin about new grievance
        await sendAdminNotification({
            title: `New Grievance from ${gymName}`,
            message: `Ticket #${supportTicket.ticketId}: ${title || subject}`,
            type: 'grievance-notification',
            priority: priority,
            metadata: {
                ticketId: supportTicket.ticketId,
                gymId: gymId,
                gymName: gymName,
                category: category,
                requiresAction: true
            }
        });

        console.log(`✅ Support ticket created: ${supportTicket.ticketId} from gym: ${gymName}`);

        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            ticket: {
                ticketId: supportTicket.ticketId,
                subject: supportTicket.subject,
                status: supportTicket.status,
                priority: supportTicket.priority,
                createdAt: supportTicket.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create support ticket'
        });
    }
});

// Get support tickets for gym admin
router.get('/support/tickets', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.gym.id;
        const {
            status = 'all',
            priority = 'all',
            category = 'all',
            page = 1,
            limit = 20
        } = req.query;

        const filter = { userId: gymId, userType: 'Gym' };
        
        if (status !== 'all') filter.status = status;
        if (priority !== 'all') filter.priority = priority;
        if (category !== 'all') filter.category = category;

        const skip = (page - 1) * limit;

        const tickets = await Support.find(filter)
            .sort({ createdAt: -1 })
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
            message: 'Failed to fetch support tickets'
        });
    }
});

// Escalate ticket to main admin
router.post('/support/tickets/:ticketId/escalate', gymadminAuth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const gymId = req.gym.id;
        const gymName = req.gym.gymName || 'Unknown Gym';
        const { reason, priority = 'high' } = req.body;

        const ticket = await Support.findOne({ ticketId, userId: gymId });
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        // Update ticket with escalation
        ticket.status = 'escalated';
        ticket.priority = priority;
        ticket.escalatedAt = new Date();
        ticket.escalationReason = reason;
        ticket.metadata.escalationLevel = 'admin';
        ticket.metadata.requiresAdminIntervention = true;
        ticket.metadata.urgencyLevel = priority;

        await ticket.save();

        // Send urgent notification to main admin
        await sendAdminNotification({
            title: `🚨 ESCALATED: ${gymName}`,
            message: `Ticket #${ticketId} has been escalated. Reason: ${reason}`,
            type: 'escalation-alert',
            priority: 'urgent',
            metadata: {
                ticketId: ticketId,
                gymId: gymId,
                gymName: gymName,
                escalationReason: reason,
                requiresImmediateAction: true
            }
        });

        console.log(`🚨 Ticket escalated: ${ticketId} from gym: ${gymName}`);

        res.json({
            success: true,
            message: 'Ticket escalated successfully',
            ticket: {
                ticketId: ticket.ticketId,
                status: ticket.status,
                priority: ticket.priority,
                escalatedAt: ticket.escalatedAt
            }
        });

    } catch (error) {
        console.error('Error escalating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to escalate ticket'
        });
    }
});

// ========== DIRECT ADMIN COMMUNICATION ==========

// Send message to main admin
router.post('/admin/message', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.gym.id;
        const gymName = req.gym.gymName || 'Unknown Gym';
        
        const {
            title,
            message,
            priority = 'medium',
            type = 'gym-admin-message',
            urgent = false,
            requestCallback = false
        } = req.body;

        // Send notification to main admin
        await sendAdminNotification({
            title: title || `Message from ${gymName}`,
            message: message,
            type: type,
            priority: urgent ? 'urgent' : priority,
            metadata: {
                source: 'gym-admin',
                gymId: gymId,
                gymName: gymName,
                requestCallback: requestCallback,
                timestamp: new Date().toISOString()
            },
            gym: {
                gymId: gymId,
                gymName: gymName,
                email: req.gym.email,
                phone: req.gym.phone,
                address: req.gym.address
            }
        });

        console.log(`💬 Message sent to admin from gym: ${gymName}`);

        res.json({
            success: true,
            message: 'Message sent to main admin successfully'
        });

    } catch (error) {
        console.error('Error sending message to admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message to admin'
        });
    }
});

// Request admin callback
router.post('/admin/callback', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.gym.id;
        const gymName = req.gym.gymName || 'Unknown Gym';
        
        const {
            reason,
            urgency = 'high',
            preferredTime,
            contactMethod = 'phone'
        } = req.body;

        // Send urgent callback request to main admin
        await sendAdminNotification({
            title: `📞 Callback Request: ${gymName}`,
            message: `Urgent callback requested. Reason: ${reason}`,
            type: 'callback-request',
            priority: 'urgent',
            metadata: {
                gymId: gymId,
                gymName: gymName,
                callbackReason: reason,
                urgency: urgency,
                preferredTime: preferredTime,
                contactMethod: contactMethod,
                callbackRequested: true,
                timestamp: new Date().toISOString()
            },
            gym: {
                gymId: gymId,
                gymName: gymName,
                phone: req.gym.phone,
                email: req.gym.email,
                preferredContact: contactMethod
            }
        });

        console.log(`📞 Callback requested from gym: ${gymName}`);

        res.json({
            success: true,
            message: 'Callback request sent to main admin successfully'
        });

    } catch (error) {
        console.error('Error requesting callback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to request callback'
        });
    }
});

// ========== GYM COMMUNICATION ENDPOINTS ==========

// Test endpoint for connectivity verification
router.get('/test', gymadminAuth, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Gym communication system is operational',
            gymId: req.gym.id || req.admin.id,
            timestamp: new Date().toISOString(),
            endpoints: [
                'GET /messages/:gymId',
                'GET /grievances/:gymId', 
                'POST /support/create',
                'GET /admin/messages',
                'POST /notifications/send'
            ]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Test endpoint error',
            error: error.message
        });
    }
});

// Get all messages/communications for a specific gym
router.get('/messages/:gymId', gymadminAuth, async (req, res) => {
    try {
        const { gymId } = req.params;
        const currentGymId = req.gym.id || req.admin.id;
        
        // Verify gym access
        if (currentGymId !== gymId) {
            console.warn(`⚠️ Gym access denied: ${currentGymId} tried to access ${gymId}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied: Cannot access other gym\'s communications'
            });
        }
        
        console.log('💬 Fetching communications for gym:', gymId);
        
        // Get support tickets as communications
        const supportTickets = await Support.find({
            userId: gymId,
            userType: 'Gym'
        }).populate('user', 'name email').sort({ createdAt: -1 }).limit(50);
        
        // Get gym notifications as messages
        const notifications = await GymNotification.find({
            gymId: gymId
        }).sort({ createdAt: -1 }).limit(50);
        
        // Combine and format communications
        const communications = [
            ...supportTickets.map(ticket => ({
                id: ticket.ticketId,
                type: 'support_ticket',
                title: ticket.subject,
                message: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                createdAt: ticket.createdAt,
                responses: ticket.responses || []
            })),
            ...notifications.map(notification => ({
                id: notification._id,
                type: 'admin_message',
                title: notification.title,
                message: notification.message,
                status: notification.read ? 'read' : 'unread',
                priority: notification.priority || 'normal',
                createdAt: notification.createdAt
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log(`✅ Found ${communications.length} communications for gym ${gymId}`);
        
        res.json({
            success: true,
            messages: communications,
            totalCount: communications.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching gym communications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch communications',
            error: error.message
        });
    }
});

// Get grievances for a specific gym
router.get('/grievances/:gymId', gymadminAuth, async (req, res) => {
    try {
        const { gymId } = req.params;
        const currentGymId = req.gym.id || req.admin.id;
        
        console.log('🔍 Grievance access check:', {
            requestedGymId: gymId,
            currentGymId: currentGymId,
            gymObject: req.gym
        });
        
        // Verify gym access (compare as strings)
        if (currentGymId.toString() !== gymId.toString()) {
            console.warn(`⚠️ Gym grievance access denied: ${currentGymId} tried to access ${gymId}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied: Cannot access other gym\'s grievances'
            });
        }
        
        console.log('📋 Fetching grievances for gym:', gymId);
        
        // Convert to ObjectId for proper MongoDB query
        const mongoose = require('mongoose');
        const gymObjectId = mongoose.Types.ObjectId(gymId);
        
        // Fetch grievances submitted ABOUT this gym (by users)
        const query = {
            gymId: gymObjectId,
            'metadata.isGrievance': true
        };
        
        console.log('🔎 Query filter:', JSON.stringify(query));
        
        const grievances = await Support.find(query).sort({ createdAt: -1 });

        console.log(`✅ Found ${grievances.length} grievances for gym ${gymId}`);
        
        if (grievances.length > 0) {
            console.log('📄 Sample grievance:', {
                ticketId: grievances[0].ticketId,
                gymId: grievances[0].gymId,
                subject: grievances[0].subject,
                metadata: grievances[0].metadata
            });
        }

        res.json({
            success: true,
            grievances: grievances.map(ticket => ({
                _id: ticket._id,
                ticketId: ticket.ticketId,
                id: ticket.ticketId,
                title: ticket.subject,
                subject: ticket.subject,
                description: ticket.description,
                category: ticket.metadata?.originalCategory || ticket.category,
                priority: ticket.metadata?.originalPriority || ticket.priority,
                status: ticket.status,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                member: { 
                    name: ticket.userName || 'Anonymous User',
                    email: ticket.userEmail,
                    phone: ticket.userPhone
                },
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                userPhone: ticket.userPhone,
                contactNumber: ticket.metadata?.contactNumber,
                metadata: ticket.metadata || {}
            })),
            totalCount: grievances.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching gym grievances:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grievances',
            error: error.message
        });
    }
});

// Update grievance status (gym admin can respond/update)
router.patch('/grievances/:ticketId/status', gymadminAuth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, response } = req.body;
        const gymId = req.gym.id;

        console.log(`🔄 Updating grievance status: ${ticketId} to ${status}`);

        // Find the grievance
        const grievance = await Support.findOne({ 
            $or: [
                { ticketId: ticketId },
                { _id: ticketId }
            ],
            gymId: gymId
        });

        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found or access denied'
            });
        }

        // Update status
        if (status) {
            grievance.status = status;
        }

        // Add gym's response if provided
        if (response) {
            grievance.messages.push({
                sender: 'admin',
                senderName: req.gym.gymName || 'Gym Admin',
                message: response,
                timestamp: new Date(),
                sentVia: ['notification']
            });
        }

        grievance.updatedAt = new Date();
        await grievance.save();

        console.log(`✅ Grievance ${ticketId} updated successfully`);

        res.json({
            success: true,
            message: 'Grievance updated successfully',
            grievance: {
                ticketId: grievance.ticketId,
                status: grievance.status,
                updatedAt: grievance.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Error updating grievance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update grievance',
            error: error.message
        });
    }
});

// Add response to grievance
router.post('/grievances/:ticketId/response', gymadminAuth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;
        const gymId = req.gym.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        console.log(`💬 Adding response to grievance: ${ticketId}`);

        // Find the grievance
        const grievance = await Support.findOne({ 
            $or: [
                { ticketId: ticketId },
                { _id: ticketId }
            ],
            gymId: gymId
        });

        if (!grievance) {
            return res.status(404).json({
                success: false,
                message: 'Grievance not found or access denied'
            });
        }

        // Add response
        grievance.messages.push({
            sender: 'admin',
            senderName: req.gym.gymName || 'Gym Admin',
            message: message,
            timestamp: new Date(),
            sentVia: ['notification']
        });

        // Update status if it's still open
        if (grievance.status === 'open') {
            grievance.status = 'in-progress';
        }

        grievance.updatedAt = new Date();
        await grievance.save();

        console.log(`✅ Response added to grievance ${ticketId}`);

        // TODO: Notify the user about the response

        res.json({
            success: true,
            message: 'Response added successfully',
            grievance: {
                ticketId: grievance.ticketId,
                status: grievance.status,
                messages: grievance.messages
            }
        });

    } catch (error) {
        console.error('❌ Error adding response to grievance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add response',
            error: error.message
        });
    }
});

// ========== ADMIN RESPONSES ==========

// Get messages from main admin
router.get('/admin/messages', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.gym.id;
        
        // Get gym notifications that are responses from admin
        const notifications = await GymNotification.find({
            gymId: gymId,
            type: { $in: ['admin-response', 'admin-reply', 'grievance-response', 'support-update'] }
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

        res.json({
            success: true,
            messages: notifications
        });

    } catch (error) {
        console.error('Error fetching admin messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin messages'
        });
    }
});

// Mark admin message as read
router.put('/admin/messages/:messageId/read', gymadminAuth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const gymId = req.gym.id;

        const notification = await GymNotification.findOneAndUpdate(
            { _id: messageId, gymId: gymId },
            { read: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read'
        });
    }
});

// ========== UTILITY FUNCTIONS ==========

// Helper function to send notification to main admin
async function sendAdminNotification(notificationData) {
    try {
        // This would integrate with your admin notification system
        // For now, we'll use the existing notification routes
        const adminNotificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/admin/notifications/send`;
        
        const response = await fetch(adminNotificationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });

        if (!response.ok) {
            console.error('Failed to send admin notification');
        }

        return response.ok;
    } catch (error) {
        console.error('Error sending admin notification:', error);
        return false;
    }
}

// Helper function to get gym communication history
router.get('/communication/history', gymadminAuth, async (req, res) => {
    try {
        const gymId = req.gym.id;
        
        // Get both support tickets and notifications for full history
        const supportTickets = await Support.find({ userId: gymId, userType: 'Gym' })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const notifications = await GymNotification.find({ gymId: gymId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        // Combine and sort by date
        const history = [
            ...supportTickets.map(ticket => ({
                type: 'support-ticket',
                id: ticket.ticketId,
                title: ticket.subject,
                content: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                createdAt: ticket.createdAt,
                direction: 'outgoing'
            })),
            ...notifications.map(notification => ({
                type: 'notification',
                id: notification._id,
                title: notification.title,
                content: notification.message,
                read: notification.read,
                priority: notification.priority || 'medium',
                createdAt: notification.createdAt,
                direction: 'incoming'
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            history: history.slice(0, 50) // Limit to 50 most recent items
        });

    } catch (error) {
        console.error('Error fetching communication history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch communication history'
        });
    }
});

module.exports = router;
