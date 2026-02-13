// ============= COMMUNICATION ROUTES =============
// Routes for admin communication and support system

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Support = require('../models/Support');
const Notification = require('../models/Notification');
const {
    getSupportStats,
    getSupportTickets,
    getSupportTicketDetails,
    addTicketResponse,
    updateTicketStatus,
    escalateTicket,
    sendGymNotification,
    getGymCommunications,
    sendMessageToGym,
    getGymMessages,
    markGymMessageRead,
    getAdminNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    bulkUpdateTicketStatus,
    exportSupportData,
    getCommunicationAnalytics,
    getSupportTrends
} = require('../controllers/communicationController');
const adminAuth = require('../middleware/adminAuth');

// Debug endpoint to test notification creation
router.post('/debug/test-notification', adminAuth, async (req, res) => {
    try {
        console.log('🔍 Debug endpoint hit');
        console.log('Admin object:', req.admin);
        
        const notification = new Notification({
            title: 'Test Notification',
            message: 'This is a test notification',
            type: 'test',
            user: req.admin.id,
            metadata: { test: true }
        });
        
        await notification.save();
        console.log('✅ Test notification created successfully');
        
        res.json({
            success: true,
            message: 'Test notification created',
            notificationId: notification._id
        });
    } catch (error) {
        console.error('❌ Test notification failed:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
});

// Simple test endpoint to verify route is reachable
router.post('/debug/test-simple', async (req, res) => {
    console.log('🧪 Simple test endpoint hit');
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    res.json({
        success: true,
        message: 'Simple test endpoint working',
        timestamp: new Date()
    });
});

// Test the exact reply route without auth for debugging
router.post('/debug/contact/messages/:messageId/reply', async (req, res) => {
    console.log('🧪 ========== DEBUG REPLY ENDPOINT HIT ==========');
    console.log('MessageId:', req.params.messageId);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    
    res.json({
        success: true,
        message: 'Debug reply endpoint working',
        messageId: req.params.messageId,
        body: req.body
    });
});

// ========== CONTACT FORM SUBMISSION (PUBLIC) ==========

// Public contact form submission (no auth required)
router.post('/public/contact', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            subject,
            category = 'general',
            message,
            quickMessage = null,
            interestedActivities = []
        } = req.body;

        // Get user info if authenticated
        let userId = null;
        let userDetails = { name, email, phone };
        
        // Check if user is authenticated
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const User = require('../models/User');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);
                if (user) {
                    userId = user._id;
                    userDetails = {
                        name: user.name || name,
                        email: user.email || email,
                        phone: user.phone || phone,
                        userId: user._id
                    };
                }
            } catch (error) {
                // Token invalid, continue as guest
            }
        }

        // Create support ticket
        const Support = require('../models/Support');
        
        // Map category to valid enum values
        const categoryMapping = {
            'general': 'general',
            'membership': 'membership', 
            'service': 'general',
            'technical': 'technical',
            'partnership': 'general',
            'complaint': 'complaint'
        };

        // For guest users without userId, create a placeholder
        const effectiveUserId = userId || new mongoose.Types.ObjectId();
        
        const supportTicket = new Support({
            ticketId: `CONTACT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            subject: quickMessage ? `Quick Message: ${quickMessage}` : subject,
            description: message,
            category: categoryMapping[category] || 'general',
            priority: 'medium',
            status: 'open',
            userType: 'User',
            userId: effectiveUserId,
            userEmail: userDetails.email,
            userName: userDetails.name,
            userPhone: userDetails.phone || null,
            metadata: {
                source: 'web',
                contactFormSubmission: true,
                quickMessage: quickMessage,
                interestedActivities: interestedActivities,
                contactMethod: phone ? 'phone' : 'email',
                isGuestUser: !userId
            },
            messages: [{
                sender: 'user',
                message: message,
                timestamp: new Date()
            }]
        });

        await supportTicket.save();

        // Notify admin about new contact
        try {
            const Admin = require('../models/admin');
            const Notification = require('../models/Notification');
            
            const admins = await Admin.find({ status: 'active' }).limit(5); // Get active admins
            
            for (const admin of admins) {
                // Create admin notification
                await Notification.create({
                    title: 'New Contact Form Submission',
                    message: `New contact from ${userDetails.name}: ${subject}`,
                    type: 'support_ticket',
                    priority: 'medium',
                    user: admin._id,
                    metadata: {
                        ticketId: supportTicket.ticketId,
                        category: category,
                        source: 'contact-form'
                    }
                });
            }
        } catch (notificationError) {
            console.error('Error creating admin notification:', notificationError);
            // Don't fail the whole request for notification errors
        }

        console.log(`✅ Contact ticket created: ${supportTicket.ticketId} from ${userDetails.name}`);

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully! We will get back to you soon.',
            data: {
                ticketId: supportTicket.ticketId,
                subject: supportTicket.subject,
                status: supportTicket.status,
                priority: supportTicket.priority,
                createdAt: supportTicket.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating contact ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send your message. Please try again later.'
        });
    }
});

// Get quick message templates
router.get('/contact/quick-messages', (req, res) => {
    const quickMessages = [
        {
            id: 'membership_info',
            title: 'Membership Information',
            message: 'I would like to know more about your membership plans and pricing.',
            category: 'membership'
        },
        {
            id: 'gym_locations',
            title: 'Gym Locations',
            message: 'Can you provide information about your gym locations near me?',
            category: 'general'
        },
        {
            id: 'personal_training',
            title: 'Personal Training',
            message: 'I am interested in personal training services. Please provide details.',
            category: 'service'
        },
        {
            id: 'diet_plans',
            title: 'Diet Plans',
            message: 'I would like to know about available diet plans and nutrition guidance.',
            category: 'service'
        },
        {
            id: 'equipment_info',
            title: 'Equipment & Facilities',
            message: 'What equipment and facilities are available at your gyms?',
            category: 'facilities'
        },
        {
            id: 'partnership',
            title: 'Business Partnership',
            message: 'I am interested in a business partnership or gym listing opportunity.',
            category: 'partnership'
        },
        {
            id: 'technical_support',
            title: 'Technical Support',
            message: 'I am experiencing technical issues with the website or app.',
            category: 'technical'
        },
        {
            id: 'complaint',
            title: 'Complaint/Feedback',
            message: 'I have a complaint or feedback about your services.',
            category: 'complaint'
        }
    ];

    res.json({
        success: true,
        data: quickMessages
    });
});

// ========== ADMIN CONTACT MESSAGE MANAGEMENT ==========

// Get all contact messages for admin
router.get('/contact/messages', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            category, 
            priority, 
            search 
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;
        
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const messages = await Support.find({
            'metadata.source': 'web',
            'metadata.contactFormSubmission': true,
            ...filter
        })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

        const total = await Support.countDocuments({
            'metadata.source': 'web',
            'metadata.contactFormSubmission': true,
            ...filter
        });

        res.json({
            success: true,
            messages: messages.map(msg => ({
                _id: msg._id,
                name: msg.userName,
                email: msg.userEmail,
                phone: msg.userPhone,
                subject: msg.subject,
                message: msg.description,
                category: msg.category,
                priority: msg.priority,
                status: msg.status,
                quickMessage: msg.metadata?.quickMessage,
                interestedActivities: msg.metadata?.interestedActivities,
                ticketId: msg.ticketId,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalMessages: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact messages'
        });
    }
});

// Get specific contact message details
router.get('/contact/messages/:messageId', adminAuth, async (req, res) => {
    try {
        const message = await Support.findById(req.params.messageId).lean();

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            message: {
                _id: message._id,
                name: message.userName,
                email: message.userEmail,
                phone: message.userPhone,
                subject: message.subject,
                message: message.description,
                category: message.category,
                priority: message.priority,
                status: message.status,
                quickMessage: message.metadata?.quickMessage,
                interestedActivities: message.metadata?.interestedActivities,
                ticketId: message.ticketId,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
                replies: message.messages?.filter(msg => msg.sender === 'admin') || []
            }
        });
    } catch (error) {
        console.error('Error fetching message details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch message details'
        });
    }
});

// Reply to contact message
router.post('/contact/messages/:messageId/reply', adminAuth, async (req, res) => {
    console.log('📝 ========== CONTACT MESSAGE REPLY HANDLER STARTED ==========');
    console.log('📋 Request details:', {
        messageId: req.params.messageId,
        body: req.body,
        adminId: req.admin?.id,
        adminEmail: req.admin?.email
    });
    
    // Add early return for debugging
    if (!req.body || !req.body.message) {
        console.error('❌ Missing message in request body');
        return res.status(400).json({
            success: false,
            message: 'Message is required'
        });
    }
    
    try {
        const { message, status, channels = ['email', 'notification'], createTicket = false } = req.body;
        const adminId = req.admin.id;

        console.log('🔍 Looking for message with ID:', req.params.messageId);
        
        // Validate messageId format
        if (!mongoose.Types.ObjectId.isValid(req.params.messageId)) {
            console.error('❌ Invalid messageId format:', req.params.messageId);
            return res.status(400).json({
                success: false,
                message: 'Invalid message ID format'
            });
        }
        
        const contactMessage = await Support.findById(req.params.messageId);
        if (!contactMessage) {
            console.error('❌ Message not found:', req.params.messageId);
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        console.log('✅ Found message:', {
            ticketId: contactMessage.ticketId,
            currentStatus: contactMessage.status,
            subject: contactMessage.subject
        });

        console.log('📨 Processing reply with channels:', channels);

        // Add admin reply to messages
        const replyMessage = {
            sender: 'admin',
            senderName: req.admin.name || 'Admin',
            message: message,
            timestamp: new Date(),
            sentVia: channels
        };

        console.log('➕ Adding reply to message history');
        contactMessage.messages.push(replyMessage);

        // Update status if provided
        if (status) {
            console.log('🏷️ Updating status from', contactMessage.status, 'to', status);
            contactMessage.status = status;
        } else if (contactMessage.status === 'open') {
            console.log('🏷️ Auto-updating status from open to replied');
            contactMessage.status = 'replied';
        }

        contactMessage.lastAdminReply = new Date();
        contactMessage.updatedAt = new Date();

        console.log('💾 Attempting to save message with status:', contactMessage.status);
        try {
            await contactMessage.save();
            console.log('✅ Message saved successfully');
        } catch (saveErr) {
            // Fallback: if 'replied' not accepted (enum mismatch) revert to 'open' and retry once
            const enumError = saveErr && saveErr.message && saveErr.message.includes('is not a valid enum value');
            if (enumError && contactMessage.status === 'replied') {
                console.warn('⚠️ [SupportReply] Enum mismatch for status "replied". Falling back to "open". Error:', saveErr.message);
                contactMessage.status = 'open';
                await contactMessage.save();
                console.log('✅ Message saved with fallback status: open');
            } else {
                console.error('❌ Save error (not enum-related):', saveErr);
                throw saveErr;
            }
        }

        console.log('✅ Contact message updated successfully');

        let ticketId = null;

        // Convert to support ticket if requested
        if (createTicket && !contactMessage.metadata?.convertedToTicket) {
            console.log('🎫 Converting to support ticket...');
            ticketId = contactMessage.ticketId;
            
            // Update metadata to mark as converted
            contactMessage.metadata = {
                ...contactMessage.metadata,
                convertedToTicket: true,
                convertedBy: adminId,
                convertedAt: new Date()
            };
            await contactMessage.save();
            console.log('✅ Converted to support ticket');
        }

        // TODO: Send notifications based on selected channels (temporarily disabled for debugging)
        // Notification creation was causing 500 errors - needs investigation
        console.log('� Notification sending temporarily disabled for debugging');

        console.log('📤 Sending successful response');
        res.json({
            success: true,
            message: 'Reply sent successfully',
            ticketId: ticketId,
            status: contactMessage.status
        });

    } catch (error) {
        console.error('❌ Error sending reply to contact message:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            messageId: req.params.messageId,
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            message: 'Failed to send reply',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Convert contact message to support ticket
router.post('/contact/messages/:messageId/convert-ticket', adminAuth, async (req, res) => {
    try {
        const contactMessage = await Support.findById(req.params.messageId);
        if (!contactMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (contactMessage.metadata?.convertedToTicket) {
            return res.json({
                success: true,
                message: 'Already converted to support ticket',
                ticketId: contactMessage.ticketId
            });
        }

        // Update metadata to mark as converted to ticket
        contactMessage.metadata = {
            ...contactMessage.metadata,
            convertedToTicket: true,
            convertedBy: req.admin.id,
            convertedAt: new Date(),
            source: 'contact-form-converted'
        };
        
        // Update status to indicate it's now a support ticket
        if (contactMessage.status === 'new') {
            contactMessage.status = 'open';
        }
        await contactMessage.save();

        // Create admin notification
        const notification = new Notification({
            recipient: 'admin',
            title: 'Contact Message Converted to Ticket',
            message: `Contact message from ${contactMessage.userName} converted to support ticket #${contactMessage.ticketId}`,
            type: 'support_ticket',
            metadata: {
                ticketId: contactMessage.ticketId,
                originalMessageId: contactMessage._id,
                convertedBy: req.admin.id
            }
        });

        await notification.save();

        res.json({
            success: true,
            message: 'Successfully converted to support ticket',
            ticketId: contactMessage.ticketId
        });

    } catch (error) {
        console.error('Error converting to support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert to support ticket'
        });
    }
});

// Update contact message status
router.patch('/contact/messages/:messageId/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        
        const contactMessage = await Support.findByIdAndUpdate(
            req.params.messageId,
            { 
                status: status,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!contactMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            status: contactMessage.status
        });

    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

// Get urgent contact messages count
router.get('/contact/urgent', adminAuth, async (req, res) => {
    try {
        const urgentCount = await Support.countDocuments({
            'metadata.source': 'contact-form',
            priority: { $in: ['urgent', 'high'] },
            status: { $in: ['open', 'new'] }
        });

        res.json({
            success: true,
            urgentCount: urgentCount
        });
    } catch (error) {
        console.error('Error checking urgent communications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check urgent communications'
        });
    }
});

// ========== SUPPORT SYSTEM ROUTES ==========

// Get support statistics for dashboard
router.get('/support/stats', adminAuth, getSupportStats);

// Get support tickets with filtering and pagination
router.get('/support/tickets', adminAuth, getSupportTickets);

// Get specific support ticket details
router.get('/support/tickets/:ticketId', adminAuth, getSupportTicketDetails);

// Update support ticket status
router.patch('/support/tickets/:ticketId/status', adminAuth, updateTicketStatus);

// Update support ticket priority  
router.patch('/support/tickets/:ticketId/priority', adminAuth, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { priority } = req.body;

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid priority value'
            });
        }

        const ticket = await Support.findOneAndUpdate(
            { ticketId: ticketId },
            { 
                priority: priority,
                updatedAt: new Date(),
                lastModifiedBy: req.admin.id
            },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.json({
            success: true,
            message: `Ticket priority updated to ${priority}`,
            ticket: ticket
        });

    } catch (error) {
        console.error('Error updating ticket priority:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket priority',
            error: error.message
        });
    }
});

// Add response to support ticket
router.post('/support/tickets/:ticketId/response', adminAuth, addTicketResponse);

// Convert contact message to support ticket
router.post('/convert-to-ticket', adminAuth, async (req, res) => {
    try {
        const { contactId, adminId } = req.body;

        // Find the contact message
        const contactMessage = await Support.findById(contactId);
        if (!contactMessage) {
            return res.status(404).json({
                success: false,
                message: 'Contact message not found'
            });
        }

        // Check if it's already a support ticket
        if (contactMessage.itemType === 'support_ticket') {
            return res.status(400).json({
                success: false,
                message: 'This is already a support ticket'
            });
        }

        // Update the contact message to be a support ticket
        contactMessage.itemType = 'support_ticket';
        contactMessage.ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        contactMessage.status = 'open';
        contactMessage.priority = 'medium';
        contactMessage.assignedTo = adminId;
        contactMessage.updatedAt = new Date();
        contactMessage.convertedAt = new Date();
        contactMessage.metadata = {
            ...contactMessage.metadata,
            convertedBy: adminId,
            originalType: 'contact_message'
        };

        await contactMessage.save();

        res.json({
            success: true,
            message: 'Contact message converted to support ticket successfully',
            ticket: {
                _id: contactMessage._id,
                ticketId: contactMessage.ticketId,
                subject: contactMessage.subject,
                status: contactMessage.status,
                priority: contactMessage.priority,
                itemType: contactMessage.itemType
            }
        });

    } catch (error) {
        console.error('Error converting to ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert to support ticket',
            error: error.message
        });
    }
});

// Escalate support ticket
router.post('/support/tickets/:ticketId/escalate', adminAuth, escalateTicket);

// ========== GYM ADMIN COMMUNICATION ROUTES ==========

// Send notification to gym admin
router.post('/gym/:gymId/notification', adminAuth, sendGymNotification);

// Get communication history with gym admin
router.get('/gym/:gymId/communications', adminAuth, getGymCommunications);

// Send message to gym admin
router.post('/gym/:gymId/message', adminAuth, sendMessageToGym);

// Get messages from gym admins
router.get('/gym-messages', adminAuth, getGymMessages);

// Mark gym message as read
router.patch('/gym-messages/:messageId/read', adminAuth, markGymMessageRead);

// ========== NOTIFICATION ROUTES ==========

// Get admin notifications
router.get('/notifications/admin', adminAuth, getAdminNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId/read', adminAuth, markNotificationRead);

// Mark all notifications as read
router.patch('/notifications/mark-all-read', adminAuth, markAllNotificationsRead);

// Delete notification
router.delete('/notifications/:notificationId', adminAuth, deleteNotification);

// ========== BULK OPERATIONS ==========

// Bulk update ticket statuses
router.patch('/support/tickets/bulk/status', adminAuth, bulkUpdateTicketStatus);

// Export support data
router.get('/support/export', adminAuth, exportSupportData);

// ========== GRIEVANCE ROUTES (USER-FACING) ==========

// Submit a grievance (public/authenticated users)
router.post('/grievances', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;
        let userEmail = '';
        let userName = 'Anonymous User';
        let userType = 'User';
        
        // Try to get user info if authenticated
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const User = require('../models/User');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);
                if (user) {
                    userId = user._id;
                    userEmail = user.email;
                    userName = user.name || 'User';
                }
            } catch (error) {
                console.log('Token invalid or user not found, proceeding as guest');
            }
        }
        
        const {
            gymId,
            category,
            priority = 'normal',
            subject,
            description,
            contactNumber,
            email
        } = req.body;

        console.log('📝 Creating grievance:', { gymId, category, priority, subject, userId });

        // Validate required fields
        if (!gymId || !category || !subject || !description) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: gymId, category, subject, description'
            });
        }

        // Get gym details
        const Gym = require('../models/gym');
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({
                success: false,
                message: 'Gym not found'
            });
        }

        // Use provided email or user email
        const effectiveEmail = email || userEmail || 'no-email@provided.com';
        const effectiveUserId = userId || new mongoose.Types.ObjectId();

        // Map priority values (frontend sends 'normal', 'high', 'urgent')
        const priorityMap = {
            'normal': 'medium',
            'high': 'high',
            'urgent': 'urgent',
            'medium': 'medium',
            'low': 'low'
        };
        const mappedPriority = priorityMap[priority] || 'medium';

        // Map category to valid Support schema categories
        const categoryMap = {
            'cleanliness': 'complaint',
            'equipment': 'equipment',
            'staff': 'complaint',
            'facilities': 'general',
            'safety': 'complaint',
            'other': 'general'
        };
        const mappedCategory = categoryMap[category] || 'complaint';

        // Create grievance as a support ticket
        const Support = require('../models/Support');
        const grievance = new Support({
            ticketId: `GRIEV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            userId: effectiveUserId,
            gymId: gymId,
            userType: userType,
            userEmail: effectiveEmail,
            userName: userName,
            userPhone: contactNumber || null,
            category: mappedCategory,
            priority: mappedPriority,
            status: 'open',
            subject: subject,
            description: description,
            messages: [{
                sender: 'user',
                message: description,
                timestamp: new Date()
            }],
            metadata: {
                source: 'web',
                isGrievance: true,
                originalCategory: category, // Store original category
                originalPriority: priority,
                gymName: gym.gymName || gym.name,
                contactNumber: contactNumber,
                submittedVia: 'gym-details-page'
            }
        });

        await grievance.save();
        console.log('✅ Grievance created successfully:', {
            ticketId: grievance.ticketId,
            gymId: grievance.gymId,
            gymName: gym.gymName,
            userName: grievance.userName,
            isGrievance: grievance.metadata.isGrievance
        });

        // Notify gym admin about the grievance
        try {
            const GymNotification = require('../models/GymNotification');
            await GymNotification.create({
                gymId: gymId,
                title: `New Grievance: ${category}`,
                message: `A new grievance has been submitted regarding ${category}. Subject: ${subject}`,
                type: 'grievance',
                priority: mappedPriority,
                status: 'unread',
                metadata: {
                    ticketId: grievance.ticketId,
                    category: category,
                    grievanceId: grievance._id
                }
            });
            console.log('📬 Gym admin notified about grievance');
        } catch (notifError) {
            console.error('Error creating gym notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            success: true,
            message: 'Grievance submitted successfully',
            grievance: {
                ticketId: grievance.ticketId,
                _id: grievance._id,
                category: grievance.category,
                priority: grievance.priority,
                subject: grievance.subject,
                status: grievance.status,
                createdAt: grievance.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error creating grievance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit grievance',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get grievances for a specific gym (for gym admin)
router.get('/grievances/gym/:gymId', async (req, res) => {
    try {
        const { gymId } = req.params;
        const { status, priority, page = 1, limit = 20 } = req.query;

        const filter = {
            gymId: gymId,
            'metadata.isGrievance': true
        };

        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const skip = (page - 1) * limit;

        const Support = require('../models/Support');
        const grievances = await Support.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Support.countDocuments(filter);

        res.json({
            success: true,
            grievances: grievances.map(g => ({
                _id: g._id,
                ticketId: g.ticketId,
                category: g.metadata?.originalCategory || g.category,
                priority: g.metadata?.originalPriority || g.priority,
                subject: g.subject,
                description: g.description,
                status: g.status,
                userName: g.userName,
                userEmail: g.userEmail,
                userPhone: g.userPhone,
                createdAt: g.createdAt,
                updatedAt: g.updatedAt
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total
            }
        });

    } catch (error) {
        console.error('Error fetching grievances:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grievances'
        });
    }
});

// ========== ANALYTICS ROUTES ==========

// Get communication analytics
router.get('/analytics/communication', adminAuth, getCommunicationAnalytics);

// Get support ticket trends
router.get('/analytics/support-trends', adminAuth, getSupportTrends);

module.exports = router;
