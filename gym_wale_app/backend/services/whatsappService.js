// ============= ENHANCED WHATSAPP BUSINESS API SERVICE =============
// Comprehensive WhatsApp Business API integration for admin notifications

const axios = require('axios');

class WhatsAppService {
  constructor() {
    // Enhanced Configuration for WhatsApp Business API
    this.config = {
      // WhatsApp Business API Configuration (Primary)
      apiUrl: 'https://graph.facebook.com/v18.0',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID', // Replace with actual
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_WHATSAPP_BUSINESS_API_TOKEN', // Replace with actual
      businessPhoneNumber: process.env.WHATSAPP_BUSINESS_NUMBER || '+1234567890', // Replace with actual
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_webhook_verify_token',
      
      // Twilio Fallback Configuration
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      
      // Default provider
      provider: process.env.WHATSAPP_PROVIDER || 'business_api' // 'business_api' | 'twilio' | 'none'
    };

    // Pre-approved Message Templates
    this.templates = {
      welcome: 'gymwale_welcome',
      membership_confirmation: 'gymwale_membership_confirmed',
      payment_reminder: 'gymwale_payment_reminder',
      class_reminder: 'gymwale_class_reminder',
      support_response: 'gymwale_support_response',
      general_notification: 'gymwale_general_notification',
      admin_alert: 'gymwale_admin_alert'
    };

    // Rate limiting
    this.rateLimiter = {
      requests: [],
      maxRequests: 80, // WhatsApp Business API allows 80 requests per second
      timeWindow: 1000 // 1 second
    };

    // Message queue for bulk operations
    this.messageQueue = [];
    this.isProcessingQueue = false;
  }

  // Check rate limiting
  checkRateLimit() {
    const now = Date.now();
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => now - time < this.rateLimiter.timeWindow
    );
    
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      return false;
    }
    
    this.rateLimiter.requests.push(now);
    return true;
  }

  // Format phone number to international format
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91 as default)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  // Enhanced WhatsApp Business API Text Message
  async sendBusinessAPIMessage(to, message, context = null) {
    try {
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded - queuing message');
      }

      const phoneNumber = this.formatPhoneNumber(to);
      if (!phoneNumber) {
        throw new Error('Invalid phone number');
      }

      const url = `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      // Add context if replying to a message
      if (context && context.message_id) {
        payload.context = {
          message_id: context.message_id
        };
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp Business API message sent:', response.data);
      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data,
        provider: 'business_api'
      };

    } catch (error) {
      console.error('❌ WhatsApp Business API error:', error.response?.data || error.message);
      
      // Fallback to Twilio if Business API fails
      if (this.config.provider === 'business_api' && this.config.twilioAccountSid) {
        console.log('🔄 Falling back to Twilio...');
        return await this.sendViaTwilio(to, message);
      }
      
      return {
        success: false,
        error: error.response?.data || error.message,
        provider: 'business_api'
      };
    }
  }

  // Enhanced Twilio Integration with better error handling
  async sendViaTwilio(phoneNumber, message) {
    try {
      const accountSid = this.config.twilioAccountSid;
      const authToken = this.config.twilioAuthToken;
      
      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }
      
      const client = require('twilio')(accountSid, authToken);
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const result = await client.messages.create({
        body: message,
        from: this.config.twilioWhatsAppNumber,
        to: `whatsapp:+${formattedNumber}`
      });
      
      console.log('✅ Twilio WhatsApp message sent:', result.sid);
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        provider: 'twilio'
      };
    } catch (error) {
      console.error('❌ Twilio WhatsApp error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'twilio'
      };
    }
  }

  // Main send message method with provider selection
  async sendMessage(phoneNumber, message, options = {}) {
    try {
      // Skip if provider is disabled
      if (this.config.provider === 'none') {
        console.log('📵 WhatsApp provider disabled - message not sent');
        return { success: false, error: 'WhatsApp provider disabled' };
      }

      let result;
      
      // Try primary provider first
      if (this.config.provider === 'business_api') {
        result = await this.sendBusinessAPIMessage(phoneNumber, message, options.context);
      } else if (this.config.provider === 'twilio') {
        result = await this.sendViaTwilio(phoneNumber, message);
      }

      // Log the result
      if (result.success) {
        await this.logMessage(phoneNumber, message, result, 'outgoing');
      }

      return result;

    } catch (error) {
      console.error('❌ WhatsApp send message error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send template message (for WhatsApp Business API)
  async sendTemplateMessage(to, templateName, templateData = {}) {
    try {
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      const phoneNumber = this.formatPhoneNumber(to);
      const url = `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en_US'
          }
        }
      };

      // Add template parameters if provided
      if (templateData.parameters && templateData.parameters.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: templateData.parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }
        ];
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp template message sent:', response.data);
      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };

    } catch (error) {
      console.error('❌ WhatsApp template message failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // ========== NOTIFICATION METHODS FOR ADMIN INTEGRATION ==========

  // Welcome message for new users
  async sendWelcomeMessage(userPhone, userName) {
    const message = `🎉 Welcome to Gym-Wale, ${userName}!

We're excited to have you join our fitness community. Your journey to a healthier lifestyle starts here!

💪 Explore our facilities
🏃‍♂️ Book your classes  
📱 Track your progress
🎯 Achieve your goals

Need help? Just reply to this message or visit our website!

Welcome to the Gym-Wale family! 🌟`;

    return await this.sendMessage(userPhone, message);
  }

  // Membership confirmation
  async sendMembershipConfirmation(userPhone, userName, membershipPlan, validTill) {
    const message = `✅ Membership Confirmed!

Hi ${userName},

Your ${membershipPlan} membership is now active!
📅 Valid until: ${validTill}

🎯 What's next?
• Download our mobile app
• Book your first class  
• Complete your fitness assessment
• Explore our facilities

Welcome to Gym-Wale! 💪🌟`;

    return await this.sendMessage(userPhone, message);
  }

  // Payment reminder
  async sendPaymentReminder(userPhone, userName, amount, dueDate) {
    const message = `💳 Payment Reminder

Hi ${userName},

This is a friendly reminder about your upcoming payment:

💰 Amount: ₹${amount}
📅 Due Date: ${dueDate}

🏦 Payment Options:
• Online through our website
• Visit our facility
• UPI/Digital payment

Questions? Reply to this message!

Thank you for being part of Gym-Wale! 🏃‍♂️`;

    return await this.sendMessage(userPhone, message);
  }

  // Class reminder
  async sendClassReminder(userPhone, userName, className, classTime, instructor) {
    const message = `🏃‍♂️ Class Reminder

Hi ${userName},

Don't forget your upcoming class:

📋 Class: ${className}
⏰ Time: ${classTime}
👨‍🏫 Instructor: ${instructor}

🎒 What to bring:
• Water bottle
• Towel
• Workout clothes

See you there! 💪✨`;

    return await this.sendMessage(userPhone, message);
  }

  // Support response notification
  async sendSupportResponse(userPhone, userName, ticketId, response) {
    const message = `🎧 Support Update

Hi ${userName},

Update on your support ticket #${ticketId}:

📝 Response:
${response}

Need more help? Just reply to this message!

- Gym-Wale Support Team 🌟`;

    return await this.sendMessage(userPhone, message);
  }

  // General notification
  async sendGeneralNotification(userPhone, userName, title, content) {
    const message = `📢 ${title}

Hi ${userName},

${content}

Thank you for being part of Gym-Wale! 💪

Questions? Reply anytime! 🙋‍♂️`;

    return await this.sendMessage(userPhone, message);
  }

  // Admin alert notifications
  async sendAdminAlert(adminPhone, alertType, details) {
    const message = `🚨 Admin Alert: ${alertType}

${details}

Time: ${new Date().toLocaleString()}

Please check the admin dashboard for more details.

- FitVerse System 🏃‍♂️`;

    return await this.sendMessage(adminPhone, message);
  }

  // ========== BULK MESSAGING ==========

  // Add message to queue
  queueMessage(phoneNumber, message, type = 'text', options = {}) {
    this.messageQueue.push({
      phoneNumber,
      message,
      type,
      options,
      timestamp: Date.now()
    });
  }

  // Process message queue with rate limiting
  async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const results = [];
    const delayMs = 1200; // 1.2 second delay to respect rate limits

    console.log(`📮 Processing ${this.messageQueue.length} queued messages...`);

    while (this.messageQueue.length > 0) {
      const messageData = this.messageQueue.shift();
      
      try {
        let result;
        if (messageData.type === 'template') {
          result = await this.sendTemplateMessage(
            messageData.phoneNumber, 
            messageData.message, 
            messageData.options
          );
        } else {
          result = await this.sendMessage(
            messageData.phoneNumber, 
            messageData.message, 
            messageData.options
          );
        }

        results.push({
          ...result,
          recipient: messageData.phoneNumber
        });

        // Delay between messages
        if (this.messageQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          recipient: messageData.phoneNumber
        });
      }
    }

    this.isProcessingQueue = false;
    console.log(`✅ Processed ${results.length} messages from queue`);
    return results;
  }

  // Send bulk messages with automatic queuing
  async sendBulkMessages(messages) {
    // Add all messages to queue
    messages.forEach(msg => {
      this.queueMessage(msg.phoneNumber, msg.message, msg.type || 'text', msg.options || {});
    });

    // Process the queue
    return await this.processMessageQueue();
  }

  // ========== WEBHOOK HANDLING ==========

  // Verify webhook
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      console.log('✅ WhatsApp webhook verified');
      return challenge;
    } else {
      console.log('❌ WhatsApp webhook verification failed');
      return null;
    }
  }

  // Process incoming webhooks
  processWebhook(body) {
    try {
      if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(entry => {
          entry.changes.forEach(change => {
            if (change.field === 'messages') {
              const messages = change.value.messages;
              if (messages) {
                messages.forEach(message => {
                  this.handleIncomingMessage(message);
                });
              }

              const statuses = change.value.statuses;
              if (statuses) {
                statuses.forEach(status => {
                  this.handleMessageStatus(status);
                });
              }
            }
          });
        });
        return { success: true };
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle incoming messages
  async handleIncomingMessage(message) {
    const senderPhone = message.from;
    const messageText = message.text?.body || '';
    const messageType = message.type;

    console.log(`📨 Received ${messageType} message from ${senderPhone}: ${messageText}`);

    // Auto-reply logic
    const lowerText = messageText.toLowerCase();
    if (lowerText.includes('help') || lowerText.includes('support')) {
      await this.sendMessage(senderPhone, 
        "Thanks for contacting FitVerse! 🎧\n\nOur support team will get back to you soon.\n\n🌐 Website: [Your Website]\n📞 Phone: [Your Phone]\n\nHow can we help you today?"
      );
    } else if (lowerText.includes('hours') || lowerText.includes('timing')) {
      await this.sendMessage(senderPhone,
        "🕐 FitVerse Operating Hours:\n\nMonday - Friday: 5:00 AM - 11:00 PM\nSaturday - Sunday: 6:00 AM - 10:00 PM\n\nSee you at the gym! 💪"
      );
    }

    // Log incoming message
    await this.logMessage(senderPhone, messageText, { success: true, messageId: message.id }, 'incoming');
  }

  // Handle message status updates
  handleMessageStatus(status) {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    const timestamp = status.timestamp;

    console.log(`📊 Message ${messageId} status: ${statusType} at ${new Date(timestamp * 1000).toISOString()}`);
  }

  // ========== UTILITY METHODS ==========

  // Log messages (implement based on your database schema)
  async logMessage(phoneNumber, message, result, direction = 'outgoing') {
    try {
      // You can implement database logging here
      console.log(`📝 Logging ${direction} message:`, {
        phoneNumber,
        message: message.substring(0, 50) + '...',
        success: result.success,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error logging message:', error);
    }
  }

  // Test connection
  async testConnection() {
    try {
      const testMessage = "🧪 WhatsApp API Test - Connection Successful! ✅\n\nThis is a test message from FitVerse admin system.";
      
      // Send test message to configured business number
      const result = await this.sendMessage(this.config.businessPhoneNumber, testMessage);
      
      return {
        success: result.success,
        message: result.success ? 'WhatsApp API connection test successful' : 'WhatsApp API connection test failed',
        details: result,
        provider: result.provider || this.config.provider
      };
    } catch (error) {
      return {
        success: false,
        message: 'WhatsApp API connection test failed',
        error: error.message
      };
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      provider: this.config.provider,
      businessApiConfigured: !!(this.config.accessToken && this.config.phoneNumberId),
      twilioConfigured: !!(this.config.twilioAccountSid && this.config.twilioAuthToken),
      queueSize: this.messageQueue.length,
      isProcessingQueue: this.isProcessingQueue
    };
  }
}

module.exports = WhatsAppService;
