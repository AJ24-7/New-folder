// routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const User = require('../models/User');
const Gym = require('../models/gym');
const Trainer = require('../models/trainerModel');
const Notification = require('../models/Notification');
const GymNotification = require('../models/GymNotification');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const gymadminAuth = require('../middleware/gymadminAuth');
const sendEmail = require('../utils/sendEmail');
const whatsappService = require('../services/whatsappService');

console.log('🎫 Support Routes loading...');

// Simple test endpoint without auth middleware
router.get('/ping', (req, res) => {
  console.log('=== SUPPORT PING ENDPOINT HIT ===');
  res.json({ message: 'Support routes are working!', timestamp: new Date().toISOString() });
});

// Test endpoint to verify auth middleware works on support routes
router.get('/test-auth', authMiddleware, async (req, res) => {
  console.log('=== SUPPORT AUTH TEST ENDPOINT ===');
  console.log('User ID:', req.user?._id);
  console.log('User email:', req.user?.email);
  res.json({
    success: true,
    message: 'Auth middleware working on support routes',
    user: {
      id: req.user._id,
      email: req.user.email
    }
  });
});

console.log('🎫 Support Routes loaded successfully');

// Get support statistics for admin dashboard
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await Support.aggregate([
      {
        $facet: {
          totalTickets: [{ $count: "count" }],
          openTickets: [{ $match: { status: { $in: ['open', 'in-progress'] } } }, { $count: "count" }],
          resolvedToday: [
            { $match: { resolvedAt: { $gte: today } } },
            { $count: "count" }
          ],
          averageResponseTime: [
            { $match: { responseTime: { $exists: true } } },
            { $group: { _id: null, avgTime: { $avg: "$responseTime" } } }
          ],
          byUserType: [
            { $group: { _id: "$userType", count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const result = {
      totalTickets: stats[0].totalTickets[0]?.count || 0,
      openTickets: stats[0].openTickets[0]?.count || 0,
      resolvedToday: stats[0].resolvedToday[0]?.count || 0,
      averageResponseTime: Math.round(stats[0].averageResponseTime[0]?.avgTime || 0),
      byUserType: stats[0].byUserType.reduce((acc, item) => {
        acc[item._id.toLowerCase()] = item.count;
        return acc;
      }, { user: 0, gym: 0, trainer: 0 }),
      byPriority: stats[0].byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byStatus: stats[0].byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support statistics'
    });
  }
});

// Get support tickets with filtering
router.get('/tickets', adminAuth, async (req, res) => {
  try {
    const {
      userType,
      status,
      priority,
      category,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};
    
    if (userType && userType !== 'all') {
      filter.userType = userType.charAt(0).toUpperCase() + userType.slice(1);
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Support.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalTickets = await Support.countDocuments(filter);

    res.json({
      success: true,
      tickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTickets / limit),
        totalTickets,
        hasNext: page * limit < totalTickets,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets'
    });
  }
});

// Get user's own support tickets - MUST come before /tickets/:ticketId route
router.get('/tickets/my', authMiddleware, async (req, res) => {
  try {
    console.log('=== SUPPORT TICKETS ROUTE HIT ===');
    console.log('User requesting tickets:', req.user?._id || 'No user found');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    const { page = 1, limit = 10, status, priority } = req.query;
    
    // Build filter query
    const filter = { userId: req.user._id };
    
    if (status) {
      filter.status = status;
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    // Get tickets with pagination
    const tickets = await Support.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('ticketId subject description category priority status createdAt updatedAt responseTime')
      .lean();
    
    // Transform the data to match frontend expectations
    const transformedTickets = tickets.map(ticket => ({
      ...ticket,
      message: ticket.description // Map description to message for frontend
    }));
    
    // Get total count for pagination
    const total = await Support.countDocuments(filter);
    
    res.json({
      success: true,
      tickets: transformedTickets,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: transformedTickets.length,
        totalTickets: total
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets'
    });
  }
});

// Get specific ticket details
router.get('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const ticket = await Support.findOne({ ticketId: req.params.ticketId })
      .populate('assignedTo', 'name email')
      .populate('relatedTickets', 'ticketId subject status');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket details'
    });
  }
});

// Create new support ticket (for users)
router.post('/tickets', authMiddleware, async (req, res) => {
  try {
    console.log('=== CREATING SUPPORT TICKET ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User from auth:', req.user);
    
    const {
      category,
      priority = 'medium',
      subject,
      message,
      phone,
      emailUpdates = true,
      attachments = []
    } = req.body;

    console.log('Extracted fields:', { category, priority, subject, message, phone });

    // Get user details from the authenticated user
    const user = await User.findById(req.user._id);
    console.log('Found user:', user ? user.email : 'NOT FOUND');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate ticket ID
    const ticketCount = await Support.countDocuments();
    const ticketId = `TKT-${Date.now()}-${ticketCount + 1}`;
    console.log('Generated ticket ID:', ticketId);

    // Extract metadata from request (for chat escalations with history)
    const metadata = req.body.metadata || {};
    const chatHistory = metadata.chatHistory || [];

    const ticketData = {
      ticketId,
      userId: user._id,
      gymId: req.body.gymId || metadata.gymId, // Include gymId if provided (for chat escalations)
      userType: 'User',
      userEmail: user.email,
      userName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || user.name,
      userPhone: phone || user.phone,
      category,
      priority,
      subject,
      description: message, // Frontend sends 'message', backend expects 'description'
      status: 'open',
      attachments,
      emailUpdates,
      messages: [],
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        source: metadata.source || 'web',
        isChat: category === 'chat',
        userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
        escalationType: metadata.escalationType,
        detectedCategory: metadata.detectedCategory,
        ...metadata
      }
    };

    // Add chat history if provided (for escalations from live chat)
    if (chatHistory && chatHistory.length > 0) {
      console.log(`Adding ${chatHistory.length} chat history messages to ticket`);
      ticketData.messages = chatHistory.map(msg => ({
        sender: msg.isUser ? 'user' : 'system',
        senderName: msg.isUser ? ticketData.userName : 'AI Assistant',
        message: msg.message,
        timestamp: new Date(msg.timestamp),
        metadata: {
          isAutomated: !msg.isUser,
          automatedTag: !msg.isUser ? 'automated msg' : undefined,
          originalTimestamp: msg.timestamp
        }
      }));
    }

    // Add the escalation message as the latest message
    ticketData.messages.push({
      sender: 'user',
      senderName: ticketData.userName,
      message: message,
      timestamp: new Date(),
      metadata: {
        isEscalation: true
      }
    });

    console.log('Ticket data to save:', JSON.stringify(ticketData, null, 2));

    const ticket = new Support(ticketData);

    await ticket.save();
    console.log('Ticket saved successfully:', ticket.ticketId);

    // Create notification for admin and gym admin if gymId is provided
    try {
      // If this is a gym-specific chat, notify the gym admin
      if (ticketData.gymId) {
        const gymNotification = new GymNotification({
          gymId: ticketData.gymId,
          title: 'New Chat Escalation',
          message: `${ticket.userName} needs assistance: ${subject}`,
          type: 'chat',
          priority: priority,
          status: 'unread',
          metadata: {
            ticketId: ticket.ticketId,
            userId: user._id,
            userName: ticket.userName,
            userEmail: ticket.userEmail,
            userProfileImage: user.profileImage || '/uploads/profile-pics/default.png',
            isChat: true,
            escalationType: metadata.escalationType || 'manual',
            messagePreview: message.substring(0, 100)
          }
        });

        await gymNotification.save();
        console.log('Gym admin notification created successfully');
      }

      // Find any main admin to notify (preferably super_admin)
      const Admin = require('../models/admin');
      const admin = await Admin.findOne({ 
        $or: [
          { role: 'super_admin' },
          { role: 'admin' }
        ]
      }).select('_id');

      if (admin) {
        const notification = new Notification({
          user: admin._id,  // Use admin ObjectId instead of 'recipient'
          title: 'New Support Ticket',
          message: `New ${priority} priority ticket from ${ticket.userName}: ${subject}`,
          type: 'support',
          metadata: {
            ticketId: ticket.ticketId,
            userType: 'User',
            priority,
            category
          }
        });

        await notification.save();
        console.log('Admin notification created successfully');
      } else {
        console.warn('No admin found for notification creation');
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the ticket creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticketId: ticket.ticketId,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket'
    });
  }
});

// Reply to support ticket
router.post('/tickets/:ticketId/reply', adminAuth, async (req, res) => {
  try {
    const {
      message,
      status,
      priority,
      channels = ['notification'] // email, notification, whatsapp
    } = req.body;

    const ticket = await Support.findOne({ ticketId: req.params.ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Add reply message
    ticket.messages.push({
      sender: 'admin',
      message,
      timestamp: new Date(),
      sentVia: channels
    });

    // Update ticket status and priority if provided
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    
    // Assign ticket to current admin if not already assigned
    if (!ticket.assignedTo) {
      ticket.assignedTo = req.admin.id;
    }

    await ticket.save();

    // Send notifications via selected channels
    const notificationPromises = [];

    if (channels.includes('email')) {
      notificationPromises.push(
        sendEmail(
          ticket.userEmail,
          `Re: ${ticket.subject} [Ticket #${ticket.ticketId}]`,
          `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <h2 style="color: #2563eb;">Support Team Reply</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Ticket Details</h3>
                <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Status:</strong> ${ticket.status.toUpperCase()}</p>
                <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
              </div>
              <div style="background: #ffffff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <h4>Admin Reply:</h4>
                <p>${message}</p>
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">
                  This is an automated message from Gym-Wale Support Team.
                  Please do not reply to this email directly.
                </p>
              </div>
            </div>
          `
        )
      );
    }

    if (channels.includes('notification')) {
      
      // If this is a grievance from a gym user, also notify the gym admin
      
      if (ticket.userType === 'Gym') {
        
        // Check for grievance keywords in both description and subject
        const grievanceKeywords = ['grievance', 'complaint', 'issue', 'problem', 'dissatisfied', 'unhappy', 'poor service', 'bad experience'];
        const textToCheck = (ticket.description + ' ' + ticket.subject).toLowerCase();
        const isGrievance = grievanceKeywords.some(keyword => textToCheck.includes(keyword));
        
        
        if (isGrievance) {
          try {
            // For gym tickets, userId is already the gym ID
            const gymId = ticket.userId;
            
            // Create notification for gym admin
            const notification = await GymNotification.createGrievanceReply({
              gymId: gymId,
              ticketId: ticket.ticketId,
              adminMessage: message,
              ticketSubject: ticket.subject,
              ticketStatus: ticket.status,
              ticketPriority: ticket.priority,
              adminId: req.admin.id,
              priority: ticket.priority === 'high' || ticket.priority === 'urgent' ? 'urgent' : ticket.priority
            });
            
            
            // Find gym details for logging
            const gym = await Gym.findById(gymId);
            if (gym) {
            }
          } catch (notificationError) {
          }
        } else {
        }
      } else {
      }
      
      // TODO: Implement user notification system for ticket replies
      // This should send a notification to the user's dashboard/app
    }

    if (channels.includes('whatsapp') && ticket.userPhone) {
      notificationPromises.push(
        whatsappService.sendMessage({
          to: ticket.userPhone,
          message: `🎯 *Support Team Reply*\n\n*Ticket:* ${ticket.ticketId}\n*Subject:* ${ticket.subject}\n\n*Reply:* ${message}\n\nStatus: ${ticket.status.toUpperCase()}\nPriority: ${ticket.priority.toUpperCase()}\n\n_Please check your Gym-Wale account for full details._`
        })
      );
    }

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: 'Reply sent successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        messagesCount: ticket.messages.length
      }
    });
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reply'
    });
  }
});

// User reply to their own support ticket
router.post('/tickets/:ticketId/reply-user', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Reply message required' });
    }
    const ticket = await Support.findOne({ ticketId: req.params.ticketId, userId: req.user._id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    ticket.messages.push({ sender: 'user', message: message.trim(), timestamp: new Date(), sentVia: ['notification'] });
    // If ticket was resolved/closed, reopen flow could be policy-based; here move resolved->open unless closed
    if (['resolved','replied'].includes(ticket.status)) {
      ticket.status = 'open';
    }
    await ticket.save();
    res.json({ success: true, message: 'Reply added', ticket: { ticketId: ticket.ticketId, status: ticket.status, messagesCount: ticket.messages.length } });
  } catch (error) {
    console.error('User reply error:', error);
    res.status(500).json({ success: false, message: 'Error adding reply' });
  }
});

// Update ticket status/priority
router.put('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const { status, priority, assignedTo, tags } = req.body;
    
    const ticket = await Support.findOne({ ticketId: req.params.ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (tags) ticket.tags = tags;

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo
      }
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket'
    });
  }
});

// Get quick reply templates
router.get('/templates', adminAuth, async (req, res) => {
  try {
    const templates = {
      acknowledge: {
        title: 'Acknowledge Receipt',
        message: 'Thank you for contacting us. We have received your support request and will respond within 24 hours. Your ticket number is #{ticketId}.'
      },
      investigating: {
        title: 'Investigating Issue',
        message: 'We are currently investigating your issue and will update you as soon as we have more information. Thank you for your patience.'
      },
      resolved: {
        title: 'Issue Resolved',
        message: 'Your issue has been resolved. If you continue to experience problems, please let us know and we will reopen this ticket.'
      },
      'more-info': {
        title: 'Need More Information',
        message: 'To better assist you, we need some additional information. Please provide more details about your issue.'
      },
      escalate: {
        title: 'Escalate to Team',
        message: 'Your request has been escalated to our specialized team. They will contact you within 2 business hours.'
      }
    };

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates'
    });
  }
});

// Delete support ticket
router.delete('/tickets/:ticketId', adminAuth, async (req, res) => {
  try {
    const ticket = await Support.findOneAndDelete({ ticketId: req.params.ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ticket'
    });
  }
});

// Admin-specific endpoint for creating support tickets (from grievance notifications)
router.post('/admin/tickets', adminAuth, async (req, res) => {
  try {
    const {
      category,
      priority = 'medium',
      subject,
      description,
      userType,
      gymId,
      gymName,
      gymEmail,
      gymPhone,
      attachments = []
    } = req.body;

   

    // Generate ticket ID
    const ticketCount = await Support.countDocuments();
    const ticketId = `TKT-${Date.now()}-${ticketCount + 1}`;

    // Create the support ticket
    const ticket = new Support({
      ticketId,
      userId: gymId || req.admin.id,
      userType: userType || 'Gym',
      userEmail: gymEmail || 'admin@gym-wale.com',
      userName: gymName || 'Gym Admin',
      userPhone: gymPhone || 'N/A',
      category,
      priority,
      subject,
      description,
      status: 'open',
      attachments,
      messages: [{
        sender: 'user',
        senderName: gymName || 'Gym Admin',
        message: description,
        timestamp: new Date()
      }],
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        source: 'admin',
        createdBy: 'admin'
      }
    });

    await ticket.save();


    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully by admin',
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating admin support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket',
      error: error.message
    });
  }
});

// Get support tickets for a specific gym (for gym admin dashboard)
router.get('/gym/:gymId', gymadminAuth, async (req, res) => {
  try {
    console.log('📋 Fetching support tickets for gym:', req.params.gymId);
    const { gymId } = req.params;
    const { status, priority, category, page = 1, limit = 50 } = req.query;

    // Validate gymId
    if (!gymId || gymId === 'undefined' || gymId === 'null') {
      console.warn('⚠️ Invalid gymId provided');
      return res.json({
        success: true,
        tickets: [],
        communications: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      });
    }

    // Build filter object - simplified to avoid complex queries that might fail
    const filter = {
      userId: gymId,
      userType: 'Gym'
    };

    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (category && category !== 'all') filter.category = category;

    console.log('🔍 Query filter:', JSON.stringify(filter));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use lean() for better performance and error handling
    const tickets = await Support.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .catch(err => {
        console.error('Database query error:', err);
        return [];
      });

    const totalCount = await Support.countDocuments(filter).catch(() => 0);

    console.log(`✅ Found ${tickets.length} tickets for gym ${gymId}`);

    res.json({
      success: true,
      tickets: tickets || [],
      communications: tickets || [], // Alias for compatibility
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching gym support tickets:', error);
    console.error('Error stack:', error.stack);
    
    // Return empty array instead of error to prevent frontend breaking
    res.json({
      success: true,
      tickets: [],
      communications: [],
      message: 'No tickets found or error occurred',
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: parseInt(req.query.limit || 50)
      }
    });
  }
});

// Respond to a support ticket (for gym admins)
router.post('/:ticketId/respond', gymadminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, closeAfter = false } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const ticket = await Support.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Add response
    const response = {
      message: message.trim(),
      isAdmin: true,
      timestamp: new Date(),
      userId: req.user?.id || 'admin'
    };

    ticket.responses = ticket.responses || [];
    ticket.responses.push(response);

    // Update status
    if (closeAfter) {
      ticket.status = 'closed';
      ticket.resolvedAt = new Date();
    } else if (ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    ticket.lastResponseAt = new Date();
    
    await ticket.save();

    // Send notification to the user if they have an email
    if (ticket.userEmail) {
      try {
        await sendEmail(
          ticket.userEmail,
          `Response to Your Support Request - ${ticket.ticketId}`,
          `
            <h2>Response to Your Support Request</h2>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <p><strong>Response:</strong></p>
            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #1976d2; margin: 15px 0;">
              ${message}
            </div>
            ${closeAfter ? '<p><strong>Status:</strong> This ticket has been closed.</p>' : ''}
            <p>Thank you for contacting us!</p>
          `
        );
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      ticket: await Support.findById(ticketId).populate('user', 'name email')
    });

  } catch (error) {
    console.error('Error responding to support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending response',
      error: error.message
    });
  }
});

// Close a support ticket
router.put('/:ticketId/close', gymadminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body;

    const ticket = await Support.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    ticket.status = 'closed';
    ticket.resolvedAt = new Date();
    
    if (reason) {
      const closeResponse = {
        message: `Ticket closed. Reason: ${reason}`,
        isAdmin: true,
        timestamp: new Date(),
        userId: req.user?.id || 'admin'
      };
      
      ticket.responses = ticket.responses || [];
      ticket.responses.push(closeResponse);
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      ticket: await Support.findById(ticketId).populate('user', 'name email')
    });

  } catch (error) {
    console.error('Error closing support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing ticket',
      error: error.message
    });
  }
});

// Get grievances for a specific gym (placeholder endpoint)
router.get('/grievances/gym/:gymId', gymadminAuth, async (req, res) => {
  try {
    const { gymId } = req.params;
    
    // For now, return an empty array since grievances aren't fully implemented
    // This can be expanded when the grievance system is built
    const grievances = await Support.find({
      userId: gymId,
      category: 'grievance',
      userType: 'Gym'
    }).populate('user', 'name email').sort({ createdAt: -1 });

    res.json({
      success: true,
      grievances,
      message: 'Grievance system will be fully implemented in the next phase'
    });
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grievances',
      error: error.message
    });
  }
});

module.exports = router;
