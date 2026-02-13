// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const User = require('../models/User');
const Gym = require('../models/gym');
const GymNotification = require('../models/GymNotification');
const authMiddleware = require('../middleware/authMiddleware');
const gymadminAuth = require('../middleware/gymadminAuth');

console.log('💬 Chat Routes loading...');

/**
 * Send a chat message from user to gym
 * POST /api/chat/send
 */
router.post('/send', authMiddleware, async (req, res) => {
    try {
        console.log('📨 User sending chat message to gym');
        const { gymId, message, quickMessage } = req.body;
        const userId = req.user._id;

        if (!gymId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID and message are required'
            });
        }

        // Validate gym exists
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({
                success: false,
                message: 'Gym not found'
            });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create or find existing chat conversation
        let chatTicket = await Support.findOne({
            userId: userId,
            gymId: gymId,
            category: 'chat',
            status: { $in: ['open', 'in-progress'] }
        });

        if (!chatTicket) {
            // Create new chat conversation
            const ticketCount = await Support.countDocuments();
            const ticketId = `CHAT-${Date.now()}-${ticketCount + 1}`;

            chatTicket = new Support({
                ticketId,
                userId: userId,
                gymId: gymId,
                userType: 'User',
                userEmail: user.email,
                userName: user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : (user.username || user.email || 'User'),
                userPhone: user.phone,
                category: 'chat',
                priority: 'medium',
                subject: `Chat with ${gym.gymName}`,
                description: message,
                status: 'open',
                messages: [],
                metadata: {
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip,
                    source: 'chat',
                    isChat: true,
                    userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
                    quickMessage: quickMessage || null
                }
            });
        }

        // Add message to conversation
        chatTicket.messages.push({
            sender: 'user',
            senderName: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : (user.username || user.email || 'User'),
            message: message,
            timestamp: new Date(),
            sentVia: ['notification'],
            metadata: {
                quickMessage: quickMessage || null,
                userProfileImage: user.profileImage || '/uploads/profile-pics/default.png'
            }
        });

        await chatTicket.save();

        // Create notification for gym admin
        try {
            const notification = new GymNotification({
                gymId: gymId,
                title: 'New Chat Message',
                message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                type: 'chat',
                priority: 'medium',
                status: 'unread',
                metadata: {
                    ticketId: chatTicket.ticketId,
                    userId: userId,
                    userName: user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : (user.username || user.email || 'User'),
                    userEmail: user.email,
                    userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
                    isChat: true,
                    messagePreview: message.substring(0, 50)
                }
            });

            await notification.save();
            console.log('✅ Gym notification created for chat message');
        } catch (notificationError) {
            console.error('Error creating gym notification:', notificationError);
        }

        res.json({
            success: true,
            message: 'Message sent successfully',
            chatId: chatTicket._id,
            ticketId: chatTicket.ticketId,
            messageCount: chatTicket.messages.length
        });

    } catch (error) {
        console.error('Error sending chat message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});

/**
 * Get chat history between user and gym
 * GET /api/chat/history/:gymId
 */
router.get('/history/:gymId', authMiddleware, async (req, res) => {
    try {
        const { gymId } = req.params;
        const userId = req.user._id;

        console.log('📜 Fetching chat history for user:', userId, 'gym:', gymId);

        // Get all chat conversations between user and gym
        const chatTickets = await Support.find({
            userId: userId,
            gymId: gymId,
            category: 'chat'
        })
        .sort({ updatedAt: -1 })
        .limit(10);

        // Get the most recent active conversation
        const activeChat = chatTickets.find(ticket => 
            ticket.status === 'open' || ticket.status === 'in-progress'
        );

        // Format messages
        const messages = activeChat ? activeChat.messages.map(msg => ({
            id: msg._id,
            sender: msg.sender,
            senderName: msg.senderName || (msg.sender === 'user' ? 'You' : 'Gym Admin'),
            message: msg.message,
            timestamp: msg.timestamp,
            read: msg.read || false,
            metadata: msg.metadata
        })) : [];

        res.json({
            success: true,
            chatId: activeChat?._id,
            ticketId: activeChat?.ticketId,
            status: activeChat?.status || 'new',
            messages: messages,
            hasActiveChat: !!activeChat,
            totalConversations: chatTickets.length
        });

    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chat history',
            error: error.message
        });
    }
});

/**
 * Mark chat messages as read
 * PUT /api/chat/read/:chatId
 */
router.put('/read/:chatId', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chatTicket = await Support.findOne({
            _id: chatId,
            userId: userId,
            category: 'chat'
        });

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Mark all admin messages as read
        let updatedCount = 0;
        chatTicket.messages.forEach(msg => {
            if (msg.sender === 'admin' && !msg.read) {
                msg.read = true;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await chatTicket.save();
        }

        res.json({
            success: true,
            message: 'Messages marked as read',
            markedCount: updatedCount
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read'
        });
    }
});

/**
 * Get gym chat conversations (for gym admin)
 * GET /api/chat/gym/conversations
 */
router.get('/gym/conversations', gymadminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        console.log('📋 Fetching gym admin conversations');
        
        // Get gymId from authenticated gym admin
        const gymId = req.admin?.id || req.gym?.id || req.gymId;
        
        console.log('🏢 Gym ID:', gymId);
        console.log('🔍 Auth data:', { admin: req.admin, gym: req.gym });
        
        if (!gymId) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID not found in authentication',
                debug: { admin: req.admin, gym: req.gym }
            });
        }
        
        // Find all chat tickets for this gym
        const chatTickets = await Support.find({
            gymId: gymId,
            category: 'chat'
        })
        .populate('userId', 'firstName lastName email profileImage username')
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

        const totalChats = await Support.countDocuments({
            gymId: gymId,
            category: 'chat'
        });

        // Load Member model to check membership status
        const Member = require('../models/Member');

        // Format conversations for gym admin
        const conversations = await Promise.all(chatTickets.map(async ticket => {
            const lastMessage = ticket.messages && ticket.messages.length > 0 
                ? ticket.messages[ticket.messages.length - 1] 
                : null;
            
            const unreadCount = ticket.messages?.filter(m => 
                m.sender === 'user' && !m.read
            ).length || 0;

            // Count admin replies
            const repliedCount = ticket.messages?.filter(m => 
                m.sender === 'admin'
            ).length || 0;

            // Check if user is a member of this gym
            let isMember = false;
            let memberData = null;
            if (ticket.userId?._id || ticket.userEmail) {
                try {
                    // Check if user email matches any member in this gym
                    const searchEmail = ticket.userId?.email || ticket.userEmail;
                    if (searchEmail) {
                        memberData = await Member.findOne({
                            gym: gymId,
                            email: searchEmail
                        });
                        isMember = !!memberData;
                    }
                } catch (memberError) {
                    console.error('Error checking membership:', memberError);
                }
            }

            return {
                _id: ticket._id,
                ticketId: ticket.ticketId,
                userId: ticket.userId?._id,
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                status: ticket.status,
                category: ticket.category,
                subject: ticket.subject,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                messages: ticket.messages,
                lastMessage: lastMessage,
                unreadCount: unreadCount,
                repliedCount: repliedCount,
                metadata: {
                    userProfileImage: ticket.userId?.profileImage || ticket.metadata?.userProfileImage || '/uploads/profile-pics/default.png',
                    isChat: true,
                    source: 'chat',
                    isMember: isMember,
                    memberBadge: isMember ? 'member' : null,
                    memberData: isMember ? {
                        memberName: memberData.memberName,
                        membershipId: memberData.membershipId,
                        joinDate: memberData.joinDate,
                        planSelected: memberData.planSelected,
                        membershipValidUntil: memberData.membershipValidUntil
                    } : null
                }
            };
        }));

        console.log(`✅ Found ${conversations.length} chat conversations for gym`);

        res.json({
            success: true,
            conversations: conversations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalChats / parseInt(limit)),
                totalItems: totalChats
            }
        });

    } catch (error) {
        console.error('Error fetching gym conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversations',
            error: error.message
        });
    }
});

/**
 * Gym admin reply to chat message
 * POST /api/chat/gym/reply/:chatId
 */
router.post('/gym/reply/:chatId', gymadminAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        
        console.log('💬 Gym admin replying to chat:', chatId);
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const gymId = req.admin?.id || req.gym?.id || req.gymId;

        // Find the chat ticket
        const chatTicket = await Support.findOne({
            _id: chatId,
            gymId: gymId,
            category: 'chat'
        }).populate('userId', 'firstName lastName email');

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat conversation not found'
            });
        }

        // Add gym admin reply to messages
        chatTicket.messages.push({
            sender: 'admin',
            senderName: 'Gym Admin',
            message: message.trim(),
            timestamp: new Date(),
            read: false,
            sentVia: ['notification'],
            metadata: {
                gymId: gymId,
                replyType: 'chat'
            }
        });

        // Update ticket status
        if (chatTicket.status === 'open') {
            chatTicket.status = 'in-progress';
        }

        await chatTicket.save();

        // Create notification for user
        try {
            const Notification = require('../models/Notification');
            
            const notification = new Notification({
                user: chatTicket.userId._id,
                title: 'New message from gym',
                message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                type: 'chat',
                priority: 'medium',
                metadata: {
                    chatId: chatTicket._id,
                    ticketId: chatTicket.ticketId,
                    gymId: gymId
                }
            });

            await notification.save();
            console.log('✅ User notification created for gym reply');
        } catch (notificationError) {
            console.error('Error creating user notification:', notificationError);
        }

        res.json({
            success: true,
            message: 'Reply sent successfully',
            messageCount: chatTicket.messages.length,
            chatStatus: chatTicket.status
        });

    } catch (error) {
        console.error('Error sending gym reply:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending reply',
            error: error.message
        });
    }
});

/**
 * Mark user messages as read (for gym admin)
 * PUT /api/chat/gym/read/:chatId
 */
router.put('/gym/read/:chatId', gymadminAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const gymId = req.admin?.id || req.gym?.id || req.gymId;

        console.log('✅ Marking chat messages as read:', chatId);

        const chatTicket = await Support.findOne({
            _id: chatId,
            gymId: gymId,
            category: 'chat'
        });

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Mark all user messages as read
        let updatedCount = 0;
        chatTicket.messages.forEach(msg => {
            if (msg.sender === 'user' && !msg.read) {
                msg.read = true;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await chatTicket.save();
        }

        console.log(`✅ Marked ${updatedCount} messages as read`);

        res.json({
            success: true,
            message: 'Messages marked as read',
            markedCount: updatedCount
        });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read',
            error: error.message
        });
    }
});

/**
 * Get messages for a specific chat conversation
 * GET /api/chat/:chatId/messages
 */
router.get('/:chatId/messages', gymadminAuth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const gymId = req.admin?.id || req.gym?.id || req.gymId;

        console.log('📨 Fetching messages for chat:', chatId);

        // Find the chat ticket
        const chatTicket = await Support.findOne({
            _id: chatId,
            gymId: gymId,
            category: 'chat'
        }).populate('userId', 'firstName lastName email profileImage username');

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat conversation not found'
            });
        }

        // Check if user is a member of this gym
        const Member = require('../models/Member');
        let isMember = false;
        let memberData = null;
        
        if (chatTicket.userId?._id) {
            try {
                memberData = await Member.findOne({
                    gym: gymId,
                    $or: [
                        { email: chatTicket.userId.email },
                        { phone: chatTicket.userId.phone }
                    ]
                });
                isMember = !!memberData;
            } catch (memberError) {
                console.error('Error checking membership:', memberError);
            }
        }

        // Format messages
        const messages = chatTicket.messages.map(msg => ({
            id: msg._id,
            sender: msg.sender,
            senderName: msg.senderName || (msg.sender === 'user' ? chatTicket.userName : 'Gym Admin'),
            message: msg.message,
            timestamp: msg.timestamp,
            read: msg.read || false,
            metadata: {
                ...msg.metadata,
                userProfileImage: chatTicket.userId?.profileImage || msg.metadata?.userProfileImage || '/uploads/profile-pics/default.png',
                isMember: msg.sender === 'user' ? isMember : undefined,
                memberBadge: (msg.sender === 'user' && isMember) ? 'member' : null
            }
        }));

        res.json({
            success: true,
            messages: messages,
            chatInfo: {
                userId: chatTicket.userId?._id,
                userName: chatTicket.userName,
                userEmail: chatTicket.userEmail,
                userProfileImage: chatTicket.userId?.profileImage || chatTicket.metadata?.userProfileImage || '/uploads/profile-pics/default.png',
                status: chatTicket.status,
                isMember: isMember,
                memberBadge: isMember ? 'member' : null,
                memberData: isMember ? {
                    memberName: memberData.memberName,
                    membershipId: memberData.membershipId,
                    joinDate: memberData.joinDate,
                    planSelected: memberData.planSelected,
                    membershipValidUntil: memberData.membershipValidUntil
                } : null
            }
        });

    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error: error.message
        });
    }
});

/**
 * Send a quick message and get automated response
 * POST /api/chat/quick-message
 */
router.post('/quick-message', authMiddleware, async (req, res) => {
    try {
        console.log('🤖 Handling quick message request');
        const { gymId, quickMessageType } = req.body;
        const userId = req.user._id;

        if (!gymId || !quickMessageType) {
            return res.status(400).json({
                success: false,
                message: 'Gym ID and quick message type are required'
            });
        }

        // Validate gym exists and get full details
        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({
                success: false,
                message: 'Gym not found'
            });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate user question and automated response based on type
        let userMessage = '';
        let automatedResponse = '';

        switch (quickMessageType) {
            case 'membership':
                userMessage = 'What are your membership plans?';
                automatedResponse = _generateMembershipResponse(gym);
                break;
            case 'timings':
                userMessage = 'What are your operating hours?';
                automatedResponse = _generateTimingsResponse(gym);
                break;
            case 'trainers':
                userMessage = 'Do you offer personal training?';
                automatedResponse = _generateTrainersResponse(gym);
                break;
            case 'trial':
                userMessage = 'Can I book a trial session?';
                automatedResponse = _generateTrialResponse(gym);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid quick message type'
                });
        }

        // Create or find existing chat conversation
        let chatTicket = await Support.findOne({
            userId: userId,
            gymId: gymId,
            category: 'chat',
            status: { $in: ['open', 'in-progress'] }
        });

        if (!chatTicket) {
            // Create new chat conversation
            const ticketCount = await Support.countDocuments();
            const ticketId = `CHAT-${Date.now()}-${ticketCount + 1}`;

            chatTicket = new Support({
                ticketId,
                userId: userId,
                gymId: gymId,
                userType: 'User',
                userEmail: user.email,
                userName: user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : (user.username || user.email || 'User'),
                userPhone: user.phone,
                category: 'chat',
                priority: 'medium',
                subject: `Chat with ${gym.gymName}`,
                description: userMessage,
                status: 'in-progress',
                messages: [],
                metadata: {
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip,
                    source: 'chat',
                    isChat: true,
                    userProfileImage: user.profileImage || '/uploads/profile-pics/default.png'
                }
            });
        }

        // Add user's quick message
        chatTicket.messages.push({
            sender: 'user',
            senderName: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : (user.username || user.email || 'User'),
            message: userMessage,
            timestamp: new Date(),
            sentVia: ['notification'],
            metadata: {
                quickMessage: quickMessageType,
                userProfileImage: user.profileImage || '/uploads/profile-pics/default.png'
            }
        });

        // Add automated response
        chatTicket.messages.push({
            sender: 'admin',
            senderName: gym.gymName,
            message: automatedResponse,
            timestamp: new Date(),
            sentVia: ['notification'],
            metadata: {
                isAutomated: true,
                automatedType: quickMessageType,
                gymLogo: gym.logoUrl || null
            }
        });

        await chatTicket.save();

        // Create notification for gym admin
        try {
            const notification = new GymNotification({
                gymId: gymId,
                title: 'Quick Message Response Sent',
                message: `Automated response sent for ${quickMessageType}`,
                type: 'chat',
                priority: 'low',
                status: 'unread',
                metadata: {
                    ticketId: chatTicket.ticketId,
                    userId: userId,
                    userName: user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : (user.username || user.email || 'User'),
                    userEmail: user.email,
                    userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
                    isChat: true,
                    isAutomated: true,
                    quickMessageType: quickMessageType
                }
            });

            await notification.save();
            console.log('✅ Gym notification created for quick message');
        } catch (notificationError) {
            console.error('Error creating gym notification:', notificationError);
        }

        res.json({
            success: true,
            message: 'Quick message sent and automated response received',
            chatId: chatTicket._id,
            ticketId: chatTicket.ticketId,
            messageCount: chatTicket.messages.length,
            automatedResponse: automatedResponse
        });

    } catch (error) {
        console.error('Error handling quick message:', error);
        res.status(500).json({
            success: false,
            message: 'Error handling quick message',
            error: error.message
        });
    }
});

// Helper functions to generate automated responses
function _generateMembershipResponse(gym) {
    if (!gym.membershipPlan || !gym.membershipPlan.monthlyOptions || gym.membershipPlan.monthlyOptions.length === 0) {
        return `Thank you for your interest in ${gym.gymName}! We offer flexible membership plans. Please contact us at ${gym.supportPhone} or ${gym.supportEmail} for detailed pricing and packages tailored to your needs.`;
    }

    const plan = gym.membershipPlan;
    let response = `🏋️ **${gym.gymName} Membership Plans**\n\n`;
    response += `**${plan.name} Plan**\n`;
    
    if (plan.benefits && plan.benefits.length > 0) {
        response += `\n✨ Benefits:\n`;
        plan.benefits.forEach(benefit => {
            response += `• ${benefit}\n`;
        });
    }

    response += `\n💰 Pricing Options:\n`;
    plan.monthlyOptions.sort((a, b) => a.months - b.months).forEach(option => {
        const label = option.isPopular ? '⭐ POPULAR' : '';
        const discount = option.discount > 0 ? ` (${option.discount}% off)` : '';
        response += `• ${option.months} Month${option.months > 1 ? 's' : ''}: ₹${option.price}${discount} ${label}\n`;
    });

    if (plan.note) {
        response += `\n📝 ${plan.note}\n`;
    }

    response += `\n📞 Contact us at ${gym.supportPhone} or visit us to sign up!`;
    return response;
}

function _generateTimingsResponse(gym) {
    let response = `⏰ **${gym.gymName} Operating Hours**\n\n`;

    if (gym.operatingHours && (gym.operatingHours.morning || gym.operatingHours.evening)) {
        if (gym.operatingHours.morning && gym.operatingHours.morning.opening && gym.operatingHours.morning.closing) {
            response += `🌅 Morning Shift: ${gym.operatingHours.morning.opening} - ${gym.operatingHours.morning.closing}\n`;
        }
        if (gym.operatingHours.evening && gym.operatingHours.evening.opening && gym.operatingHours.evening.closing) {
            response += `🌆 Evening Shift: ${gym.operatingHours.evening.opening} - ${gym.operatingHours.evening.closing}\n`;
        }
    } else if (gym.openingTime && gym.closingTime) {
        response += `🕐 Open: ${gym.openingTime} - ${gym.closingTime}\n`;
    } else {
        response += `We're open daily! Please contact us at ${gym.supportPhone} for specific timings.\n`;
    }

    response += `\n📍 Location: ${gym.location.address}, ${gym.location.city}\n`;
    response += `📞 Call us: ${gym.supportPhone}`;
    return response;
}

function _generateTrainersResponse(gym) {
    let response = `💪 **Training at ${gym.gymName}**\n\n`;

    if (gym.activities && gym.activities.length > 0) {
        response += `We offer the following training activities:\n\n`;
        gym.activities.forEach(activity => {
            response += `${activity.icon ? activity.icon + ' ' : '🏋️ '}**${activity.name}**\n`;
            if (activity.description) {
                response += `  ${activity.description}\n`;
            }
            response += `\n`;
        });
    } else {
        response += `We offer comprehensive training programs including:\n`;
        response += `• Personal Training Sessions\n`;
        response += `• Group Fitness Classes\n`;
        response += `• Customized Workout Plans\n\n`;
    }

    if (gym.equipment && gym.equipment.length > 0) {
        const categories = [...new Set(gym.equipment.map(e => e.category).filter(c => c))];
        if (categories.length > 0) {
            response += `🏆 Our facility includes:\n`;
            categories.forEach(cat => {
                response += `• ${cat.charAt(0).toUpperCase() + cat.slice(1)} equipment\n`;
            });
            response += `\n`;
        }
    }

    response += `📞 For personalized training programs, contact us at ${gym.supportPhone}\n`;
    response += `📧 Email: ${gym.supportEmail}`;
    return response;
}

function _generateTrialResponse(gym) {
    let response = `🎯 **Book Your Trial at ${gym.gymName}**\n\n`;
    response += `Yes! We offer trial sessions for new members.\n\n`;
    response += `✅ What's included:\n`;
    response += `• Free facility tour\n`;
    response += `• Access to all equipment\n`;
    response += `• Meet our trainers\n`;
    response += `• Understand our programs\n\n`;

    if (gym.operatingHours && (gym.operatingHours.morning || gym.operatingHours.evening)) {
        response += `⏰ Available during our operating hours:\n`;
        if (gym.operatingHours.morning && gym.operatingHours.morning.opening) {
            response += `• Morning: ${gym.operatingHours.morning.opening} - ${gym.operatingHours.morning.closing}\n`;
        }
        if (gym.operatingHours.evening && gym.operatingHours.evening.opening) {
            response += `• Evening: ${gym.operatingHours.evening.opening} - ${gym.operatingHours.evening.closing}\n`;
        }
        response += `\n`;
    }

    response += `📍 Location: ${gym.location.address}, ${gym.location.city}\n`;
    response += `📞 Call to book: ${gym.supportPhone}\n`;
    response += `📧 Email: ${gym.supportEmail}\n\n`;
    response += `We look forward to welcoming you! 💪`;
    return response;
}

/**
 * Close/end a chat conversation
 * PUT /api/chat/close/:chatId
 */
router.put('/close/:chatId', authMiddleware, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chatTicket = await Support.findOne({
            _id: chatId,
            userId: userId,
            category: 'chat'
        });

        if (!chatTicket) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        chatTicket.status = 'closed';
        chatTicket.resolvedAt = new Date();
        
        // Add system message
        chatTicket.messages.push({
            sender: 'system',
            message: 'Chat conversation ended by user',
            timestamp: new Date(),
            sentVia: ['notification']
        });

        await chatTicket.save();

        res.json({
            success: true,
            message: 'Chat conversation closed'
        });

    } catch (error) {
        console.error('Error closing chat:', error);
        res.status(500).json({
            success: false,
            message: 'Error closing chat'
        });
    }
});

console.log('✅ Chat Routes loaded successfully');

module.exports = router;
