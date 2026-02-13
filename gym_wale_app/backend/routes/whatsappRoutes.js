// ============= WHATSAPP ROUTES =============
// API routes for WhatsApp integration with admin system

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const adminAuth = require('../middleware/adminAuth');

// ========== ADMIN PROTECTED ROUTES ==========

// Get WhatsApp service status
router.get('/status', adminAuth, (req, res) => {
    whatsappController.getStatus(req, res);
});

// Test WhatsApp connection
router.post('/test-connection', adminAuth, (req, res) => {
    whatsappController.testConnection(req, res);
});

// Send test message
router.post('/test-message', adminAuth, (req, res) => {
    whatsappController.sendTestMessage(req, res);
});

// Send single notification
router.post('/notify', adminAuth, (req, res) => {
    whatsappController.sendNotification(req, res);
});

// Send bulk notifications
router.post('/bulk-notify', adminAuth, (req, res) => {
    whatsappController.sendBulkNotifications(req, res);
});

// Process message queue
router.post('/process-queue', adminAuth, (req, res) => {
    whatsappController.processQueue(req, res);
});

// Get notification statistics
router.get('/stats', adminAuth, (req, res) => {
    whatsappController.getNotificationStats(req, res);
});

// ========== WEBHOOK ROUTES (PUBLIC) ==========

// WhatsApp webhook verification (GET)
router.get('/webhook', (req, res) => {
    whatsappController.webhookVerification(req, res);
});

// WhatsApp webhook handler (POST)
router.post('/webhook', (req, res) => {
    whatsappController.webhookHandler(req, res);
});

// ========== INTEGRATION HELPER ROUTES ==========

// Support system integration
router.post('/support/notify', adminAuth, async (req, res) => {
    try {
        const { ticketId, userPhone, userName, response } = req.body;
        
        if (!ticketId || !userPhone || !response) {
            return res.status(400).json({
                success: false,
                message: 'ticketId, userPhone, and response are required'
            });
        }

        const result = await whatsappController.notifySupport(ticketId, userPhone, userName, response);
        
        res.json({
            success: result.success,
            message: result.success ? 'Support notification sent' : 'Failed to send support notification',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send support notification',
            error: error.message
        });
    }
});

// Membership system integration
router.post('/membership/notify', adminAuth, async (req, res) => {
    try {
        const { userPhone, userName, membershipPlan, validTill } = req.body;
        
        if (!userPhone || !membershipPlan) {
            return res.status(400).json({
                success: false,
                message: 'userPhone and membershipPlan are required'
            });
        }

        const result = await whatsappController.notifyMembership(userPhone, userName, membershipPlan, validTill);
        
        res.json({
            success: result.success,
            message: result.success ? 'Membership notification sent' : 'Failed to send membership notification',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send membership notification',
            error: error.message
        });
    }
});

// Payment system integration
router.post('/payment/notify', adminAuth, async (req, res) => {
    try {
        const { userPhone, userName, amount, dueDate } = req.body;
        
        if (!userPhone || !amount) {
            return res.status(400).json({
                success: false,
                message: 'userPhone and amount are required'
            });
        }

        const result = await whatsappController.notifyPayment(userPhone, userName, amount, dueDate);
        
        res.json({
            success: result.success,
            message: result.success ? 'Payment notification sent' : 'Failed to send payment notification',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send payment notification',
            error: error.message
        });
    }
});

// Class booking system integration
router.post('/class/notify', adminAuth, async (req, res) => {
    try {
        const { userPhone, userName, className, classTime, instructor } = req.body;
        
        if (!userPhone || !className) {
            return res.status(400).json({
                success: false,
                message: 'userPhone and className are required'
            });
        }

        const result = await whatsappController.notifyClass(userPhone, userName, className, classTime, instructor);
        
        res.json({
            success: result.success,
            message: result.success ? 'Class notification sent' : 'Failed to send class notification',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send class notification',
            error: error.message
        });
    }
});

// Admin alert integration
router.post('/admin/alert', adminAuth, async (req, res) => {
    try {
        const { adminPhone, alertType, details } = req.body;
        
        if (!adminPhone || !alertType) {
            return res.status(400).json({
                success: false,
                message: 'adminPhone and alertType are required'
            });
        }

        const result = await whatsappController.sendAdminAlert(adminPhone, alertType, details);
        
        res.json({
            success: result.success,
            message: result.success ? 'Admin alert sent' : 'Failed to send admin alert',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send admin alert',
            error: error.message
        });
    }
});

module.exports = router;
