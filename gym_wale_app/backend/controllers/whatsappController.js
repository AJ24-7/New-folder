// ============= WHATSAPP CONTROLLER =============
// Controller for WhatsApp integration with admin system

const WhatsAppService = require('../services/whatsappService');

class WhatsAppController {
    constructor() {
        this.whatsappService = new WhatsAppService();
    }

    // ========== ADMIN PANEL INTEGRATION ==========

    // Get WhatsApp service status
    async getStatus(req, res) {
        try {
            const status = this.whatsappService.getServiceStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Error getting WhatsApp status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get WhatsApp status',
                error: error.message
            });
        }
    }

    // Test WhatsApp connection
    async testConnection(req, res) {
        try {
            const result = await this.whatsappService.testConnection();
            res.json({
                success: result.success,
                message: result.message,
                data: result
            });
        } catch (error) {
            console.error('Error testing WhatsApp connection:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to test WhatsApp connection',
                error: error.message
            });
        }
    }

    // Send test message
    async sendTestMessage(req, res) {
        try {
            const { phoneNumber, message } = req.body;

            if (!phoneNumber || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number and message are required'
                });
            }

            const result = await this.whatsappService.sendMessage(phoneNumber, message);
            
            res.json({
                success: result.success,
                message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
                data: result
            });

        } catch (error) {
            console.error('Error sending test message:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send test message',
                error: error.message
            });
        }
    }

    // Send notification via WhatsApp
    async sendNotification(req, res) {
        try {
            const { 
                phoneNumber, 
                type, 
                data = {} 
            } = req.body;

            if (!phoneNumber || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number and notification type are required'
                });
            }

            let result;

            switch (type) {
                case 'welcome':
                    result = await this.whatsappService.sendWelcomeMessage(
                        phoneNumber, 
                        data.userName || 'User'
                    );
                    break;

                case 'membership_confirmation':
                    result = await this.whatsappService.sendMembershipConfirmation(
                        phoneNumber,
                        data.userName || 'User',
                        data.membershipPlan || 'Basic',
                        data.validTill || 'N/A'
                    );
                    break;

                case 'payment_reminder':
                    result = await this.whatsappService.sendPaymentReminder(
                        phoneNumber,
                        data.userName || 'User',
                        data.amount || '0',
                        data.dueDate || 'N/A'
                    );
                    break;

                case 'class_reminder':
                    result = await this.whatsappService.sendClassReminder(
                        phoneNumber,
                        data.userName || 'User',
                        data.className || 'Class',
                        data.classTime || 'N/A',
                        data.instructor || 'Instructor'
                    );
                    break;

                case 'support_response':
                    result = await this.whatsappService.sendSupportResponse(
                        phoneNumber,
                        data.userName || 'User',
                        data.ticketId || 'N/A',
                        data.response || 'Thank you for contacting us.'
                    );
                    break;

                case 'general_notification':
                    result = await this.whatsappService.sendGeneralNotification(
                        phoneNumber,
                        data.userName || 'User',
                        data.title || 'Notification',
                        data.content || 'Thank you for being part of Gym-Wale!'
                    );
                    break;

                case 'admin_alert':
                    result = await this.whatsappService.sendAdminAlert(
                        phoneNumber,
                        data.alertType || 'System Alert',
                        data.details || 'Please check the admin dashboard.'
                    );
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid notification type'
                    });
            }

            res.json({
                success: result.success,
                message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
                data: result
            });

        } catch (error) {
            console.error('Error sending notification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send notification',
                error: error.message
            });
        }
    }

    // Send bulk notifications
    async sendBulkNotifications(req, res) {
        try {
            const { recipients, type, data = {} } = req.body;

            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Recipients array is required'
                });
            }

            if (!type) {
                return res.status(400).json({
                    success: false,
                    message: 'Notification type is required'
                });
            }

            // Queue all messages
            const messages = recipients.map(recipient => ({
                phoneNumber: recipient.phoneNumber,
                message: this.formatBulkMessage(type, { ...data, userName: recipient.userName || 'User' }),
                type: 'text'
            }));

            const results = await this.whatsappService.sendBulkMessages(messages);

            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;

            res.json({
                success: true,
                message: `Bulk notification completed. ${successCount} sent, ${failureCount} failed.`,
                data: {
                    total: results.length,
                    successful: successCount,
                    failed: failureCount,
                    results: results
                }
            });

        } catch (error) {
            console.error('Error sending bulk notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send bulk notifications',
                error: error.message
            });
        }
    }

    // Process message queue
    async processQueue(req, res) {
        try {
            const results = await this.whatsappService.processMessageQueue();
            
            res.json({
                success: true,
                message: 'Message queue processed successfully',
                data: {
                    processed: results ? results.length : 0,
                    results: results || []
                }
            });

        } catch (error) {
            console.error('Error processing message queue:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process message queue',
                error: error.message
            });
        }
    }

    // ========== WEBHOOK HANDLING ==========

    // WhatsApp webhook verification
    webhookVerification(req, res) {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            console.log('WhatsApp webhook verification:', { mode, token, challenge });

            const result = this.whatsappService.verifyWebhook(mode, token, challenge);
            
            if (result) {
                res.status(200).send(result);
            } else {
                res.status(403).send('Forbidden');
            }

        } catch (error) {
            console.error('Error in webhook verification:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    // Handle incoming webhooks
    webhookHandler(req, res) {
        try {
            const body = req.body;
            console.log('Incoming WhatsApp webhook:', JSON.stringify(body, null, 2));

            const result = this.whatsappService.processWebhook(body);
            
            res.status(200).json(result);

        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ========== ADMIN INTEGRATION HELPERS ==========

    // Integrate with support system
    async notifySupport(ticketId, userPhone, userName, response) {
        try {
            return await this.whatsappService.sendSupportResponse(
                userPhone, 
                userName, 
                ticketId, 
                response
            );
        } catch (error) {
            console.error('Error sending support notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Integrate with membership system
    async notifyMembership(userPhone, userName, membershipPlan, validTill) {
        try {
            return await this.whatsappService.sendMembershipConfirmation(
                userPhone,
                userName,
                membershipPlan,
                validTill
            );
        } catch (error) {
            console.error('Error sending membership notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Integrate with payment system
    async notifyPayment(userPhone, userName, amount, dueDate) {
        try {
            return await this.whatsappService.sendPaymentReminder(
                userPhone,
                userName,
                amount,
                dueDate
            );
        } catch (error) {
            console.error('Error sending payment notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Integrate with class booking system
    async notifyClass(userPhone, userName, className, classTime, instructor) {
        try {
            return await this.whatsappService.sendClassReminder(
                userPhone,
                userName,
                className,
                classTime,
                instructor
            );
        } catch (error) {
            console.error('Error sending class notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send admin alerts
    async sendAdminAlert(adminPhone, alertType, details) {
        try {
            return await this.whatsappService.sendAdminAlert(
                adminPhone,
                alertType,
                details
            );
        } catch (error) {
            console.error('Error sending admin alert:', error);
            return { success: false, error: error.message };
        }
    }

    // ========== UTILITY METHODS ==========

    // Format message for bulk sending
    formatBulkMessage(type, data) {
        switch (type) {
            case 'welcome':
                return `🎉 Welcome to Gym-Wale, ${data.userName}!\n\nWe're excited to have you join our fitness community!`;
            
            case 'general_notification':
                return `📢 ${data.title}\n\nHi ${data.userName},\n\n${data.content}`;
            
            case 'payment_reminder':
                return `💳 Payment Reminder\n\nHi ${data.userName},\n\nAmount: ₹${data.amount}\nDue: ${data.dueDate}`;
            
            default:
                return `Hi ${data.userName},\n\n${data.content || 'Thank you for being part of Gym-Wale!'}`;
        }
    }

    // Get notification statistics
    async getNotificationStats(req, res) {
        try {
            const status = this.whatsappService.getServiceStatus();
            
            // You can extend this with database queries for actual stats
            const stats = {
                service: status,
                todaysSent: 0, // Implement with database
                thisWeekSent: 0, // Implement with database
                thisMonthSent: 0, // Implement with database
                queueSize: status.queueSize,
                lastActivity: new Date().toISOString()
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error getting notification stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get notification statistics',
                error: error.message
            });
        }
    }
}

// Export singleton instance
const whatsappController = new WhatsAppController();
module.exports = whatsappController;
