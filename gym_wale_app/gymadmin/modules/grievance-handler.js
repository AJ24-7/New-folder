// ===============================================
// ENHANCED GRIEVANCE HANDLING SYSTEM
// Integrates with support-reviews.js for comprehensive grievance management
// ===============================================

class GrievanceHandler {
    constructor() {
        this.BASE_URL = window.API_CONFIG.BASE_URL; // Use centralized config
        this.grievances = [];
        this.currentGymId = null;
        this.quickMessageTemplates = this.initializeQuickMessages();
        this.init();
    }

    init() {
        console.log('🎫 Initializing Grievance Handler');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for grievance-related events
        document.addEventListener('click', (e) => {
            // Quick reply button
            if (e.target.closest('.grievance-quick-reply-btn')) {
                const grievanceId = e.target.closest('.grievance-quick-reply-btn').dataset.grievanceId;
                this.showQuickReplyModal(grievanceId);
            }

            // Resolve grievance button
            if (e.target.closest('.grievance-resolve-btn')) {
                const grievanceId = e.target.closest('.grievance-resolve-btn').dataset.grievanceId;
                this.resolveGrievance(grievanceId);
            }

            // View details button
            if (e.target.closest('.grievance-details-btn')) {
                const grievanceId = e.target.closest('.grievance-details-btn').dataset.grievanceId;
                this.showGrievanceDetails(grievanceId);
            }

            // Start chat button
            if (e.target.closest('.grievance-chat-btn')) {
                const grievanceId = e.target.closest('.grievance-chat-btn').dataset.grievanceId;
                this.startGrievanceChat(grievanceId);
            }
        });
    }

    // Initialize Quick Message Templates
    initializeQuickMessages() {
        return {
            equipment: [
                {
                    id: 'eq_1',
                    title: 'Equipment Under Maintenance',
                    message: 'Thank you for reporting this issue. Our team is aware and the equipment is currently under maintenance. It will be operational within 24-48 hours.'
                },
                {
                    id: 'eq_2',
                    title: 'Equipment Replaced',
                    message: 'We have replaced the faulty equipment. Please let us know if you face any further issues. Thank you for bringing this to our attention.'
                },
                {
                    id: 'eq_3',
                    title: 'Scheduled for Repair',
                    message: 'Your concern has been noted. The equipment has been scheduled for repair/replacement within the next 3-5 business days.'
                }
            ],
            cleanliness: [
                {
                    id: 'cl_1',
                    title: 'Immediate Action Taken',
                    message: 'Thank you for your feedback. Our cleaning staff has been notified and the area has been thoroughly cleaned. We appreciate your vigilance.'
                },
                {
                    id: 'cl_2',
                    title: 'Enhanced Cleaning Schedule',
                    message: 'We have increased the frequency of cleaning for this area. Our staff will now clean every 2 hours to maintain hygiene standards.'
                },
                {
                    id: 'cl_3',
                    title: 'Hygiene Standards Review',
                    message: 'Your feedback is valuable. We are conducting a review of our hygiene protocols and will implement improvements within the week.'
                }
            ],
            staff: [
                {
                    id: 'st_1',
                    title: 'Staff Training Initiated',
                    message: 'We sincerely apologize for the inconvenience. The staff member has been counseled and additional training will be provided to ensure better service.'
                },
                {
                    id: 'st_2',
                    title: 'Management Review',
                    message: 'Thank you for bringing this to our attention. The matter has been escalated to management for review and appropriate action.'
                },
                {
                    id: 'st_3',
                    title: 'Apology & Resolution',
                    message: 'We deeply regret this experience. Steps have been taken to prevent such incidents. Please contact us directly if you have further concerns.'
                }
            ],
            safety: [
                {
                    id: 'sf_1',
                    title: 'Immediate Safety Check',
                    message: 'Your safety is our priority. We have conducted an immediate inspection and taken corrective measures. The area is now secure.'
                },
                {
                    id: 'sf_2',
                    title: 'Safety Protocol Enhanced',
                    message: 'Thank you for reporting this safety concern. We have enhanced our safety protocols and installed additional safety measures.'
                },
                {
                    id: 'sf_3',
                    title: 'Emergency Response',
                    message: 'This has been treated as a priority. Our safety team has responded and implemented immediate fixes. Thank you for your vigilance.'
                }
            ],
            billing: [
                {
                    id: 'bl_1',
                    title: 'Billing Correction',
                    message: 'We apologize for the billing error. The correction has been made and you will see the adjusted amount in your next statement.'
                },
                {
                    id: 'bl_2',
                    title: 'Refund Processed',
                    message: 'Your refund request has been approved and processed. The amount will be credited to your account within 5-7 business days.'
                },
                {
                    id: 'bl_3',
                    title: 'Payment Plan Arranged',
                    message: 'We understand your concern. A flexible payment plan has been arranged for you. Please check your email for details.'
                }
            ],
            facilities: [
                {
                    id: 'fc_1',
                    title: 'Facility Upgrade Scheduled',
                    message: 'Thank you for your feedback. We have scheduled an upgrade for this facility. Work will begin within the next week.'
                },
                {
                    id: 'fc_2',
                    title: 'Maintenance Completed',
                    message: 'The facility has been serviced and is now fully operational. Please let us know if you need any further assistance.'
                },
                {
                    id: 'fc_3',
                    title: 'Alternative Arrangement',
                    message: 'While we work on this facility, we have arranged alternative arrangements. Please contact our front desk for details.'
                }
            ],
            timing: [
                {
                    id: 'tm_1',
                    title: 'Schedule Updated',
                    message: 'Thank you for your suggestion. We have reviewed and updated our operating hours. Please check the new schedule on our website.'
                },
                {
                    id: 'tm_2',
                    title: 'Extended Hours',
                    message: 'Based on member feedback, we are extending our operating hours. The new timings will be effective from next week.'
                },
                {
                    id: 'tm_3',
                    title: 'Class Schedule Revised',
                    message: 'We have revised the class schedule based on your input. The updated schedule is now available at reception and online.'
                }
            ],
            general: [
                {
                    id: 'gn_1',
                    title: 'Acknowledgment',
                    message: 'Thank you for contacting us. We have received your concern and our team is reviewing it. We will respond within 24 hours.'
                },
                {
                    id: 'gn_2',
                    title: 'Under Investigation',
                    message: 'Your issue is being thoroughly investigated. We will update you with our findings and action plan within 48 hours.'
                },
                {
                    id: 'gn_3',
                    title: 'Feedback Appreciated',
                    message: 'We appreciate your feedback. It helps us improve our services. We will keep you updated on the actions taken.'
                }
            ]
        };
    }

    // Show Quick Reply Modal with Templates
    async showQuickReplyModal(grievanceId) {
        const grievance = this.grievances.find(g => g._id === grievanceId || g.id === grievanceId);
        if (!grievance) {
            console.error('Grievance not found:', grievanceId);
            return;
        }

        const category = grievance.category || 'general';
        const templates = this.quickMessageTemplates[category] || this.quickMessageTemplates.general;

        const modalHtml = `
            <div class="quick-reply-modal" id="quickReplyModal" style="display: flex;">
                <div class="quick-reply-modal-content">
                    <div class="quick-reply-header">
                        <h3><i class="fas fa-bolt"></i> Quick Reply</h3>
                        <button class="close-btn" onclick="grievanceHandler.closeQuickReplyModal()">&times;</button>
                    </div>
                    <div class="quick-reply-body">
                        <div class="grievance-summary">
                            <strong>Ticket:</strong> ${grievance.ticketId || grievance._id}<br>
                            <strong>Subject:</strong> ${grievance.subject || 'No subject'}<br>
                            <strong>User:</strong> ${grievance.userName || 'Anonymous'}
                        </div>
                        
                        <div class="quick-templates">
                            <h4>Select a Template:</h4>
                            <div class="template-grid">
                                ${templates.map(template => `
                                    <button class="template-btn" onclick="grievanceHandler.selectTemplate('${template.id}', '${grievanceId}')">
                                        <i class="fas fa-comment-dots"></i>
                                        <span>${template.title}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="custom-reply-section">
                            <h4>Or write a custom reply:</h4>
                            <textarea id="customReplyText" rows="5" placeholder="Type your response here..."></textarea>
                        </div>
                        
                        <div class="reply-actions">
                            <button class="btn-secondary" onclick="grievanceHandler.closeQuickReplyModal()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button class="btn-primary" onclick="grievanceHandler.sendQuickReply('${grievanceId}')">
                                <i class="fas fa-paper-plane"></i> Send Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existing = document.getElementById('quickReplyModal');
        if (existing) existing.remove();

        // Add to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    selectTemplate(templateId, grievanceId) {
        // Find template across all categories
        let selectedTemplate = null;
        for (const category in this.quickMessageTemplates) {
            const template = this.quickMessageTemplates[category].find(t => t.id === templateId);
            if (template) {
                selectedTemplate = template;
                break;
            }
        }

        if (selectedTemplate) {
            const textarea = document.getElementById('customReplyText');
            if (textarea) {
                textarea.value = selectedTemplate.message;
            }
        }
    }

    async sendQuickReply(grievanceId) {
        const textarea = document.getElementById('customReplyText');
        const message = textarea?.value?.trim();

        if (!message) {
            alert('Please enter a reply message');
            return;
        }

        const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
        if (!token) {
            alert('Authentication required');
            return;
        }

        try {
            // Use the correct endpoint for gym admin responses
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/grievances/${grievanceId}/response`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Reply sent successfully');
                this.closeQuickReplyModal();
                
                // Refresh grievances if support manager exists
                if (window.supportManager) {
                    window.supportManager.loadGrievances();
                }
                
                // Show success notification
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.show({
                        type: 'success',
                        title: 'Reply Sent',
                        message: 'Your response has been sent to the user'
                    });
                }
            } else {
                throw new Error(data.message || 'Failed to send reply');
            }
        } catch (error) {
            console.error('❌ Error sending reply:', error);
            alert('Failed to send reply. Please try again.');
        }
    }

    closeQuickReplyModal() {
        const modal = document.getElementById('quickReplyModal');
        if (modal) modal.remove();
    }

    async resolveGrievance(grievanceId) {
        const confirmed = confirm('Are you sure you want to mark this grievance as resolved?');
        if (!confirmed) return;

        const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
        if (!token) {
            alert('Authentication required');
            return;
        }

        try {
            // Use the correct endpoint for gym admin status updates
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/grievances/${grievanceId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'resolved'
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Grievance resolved');
                
                // Refresh grievances
                if (window.supportManager) {
                    window.supportManager.loadGrievances();
                }
                
                // Show success notification
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.show({
                        type: 'success',
                        title: 'Grievance Resolved',
                        message: 'The issue has been marked as resolved'
                    });
                }
            } else {
                throw new Error(data.message || 'Failed to resolve grievance');
            }
        } catch (error) {
            console.error('❌ Error resolving grievance:', error);
            alert('Failed to resolve grievance. Please try again.');
        }
    }

    async showGrievanceDetails(grievanceId) {
        const grievance = this.grievances.find(g => g._id === grievanceId || g.id === grievanceId);
        if (!grievance) {
            console.error('Grievance not found:', grievanceId);
            return;
        }

        // Use support manager's openGrievanceDetails if available
        if (window.supportManager && typeof window.supportManager.openGrievanceDetails === 'function') {
            window.supportManager.openGrievanceDetails(grievanceId);
        }
    }

    async startGrievanceChat(grievanceId) {
        const grievance = this.grievances.find(g => g._id === grievanceId || g.id === grievanceId);
        if (!grievance) {
            console.error('Grievance not found:', grievanceId);
            return;
        }

        // Create or find existing chat conversation for this grievance
        const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
        if (!token) {
            alert('Authentication required');
            return;
        }

        try {
            // Try to find existing conversation
            const response = await fetch(`${this.BASE_URL}/api/chat/grievance/${grievanceId}/conversation`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: grievance.user?._id || grievance.userId,
                    subject: `Grievance: ${grievance.subject}`
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const conversationId = data.conversation._id || data.conversationId;
                
                // Open chat with support manager
                if (window.supportManager && typeof window.supportManager.openChatConversation === 'function') {
                    window.supportManager.openChatConversation(conversationId);
                }
            } else {
                throw new Error(data.message || 'Failed to start chat');
            }
        } catch (error) {
            console.error('❌ Error starting chat:', error);
            alert('Failed to start chat. Please try again.');
        }
    }

    // Update grievances data
    updateGrievances(grievances) {
        this.grievances = grievances;
    }

    // Set current gym ID
    setGymId(gymId) {
        this.currentGymId = gymId;
    }
}

// Initialize and export
const grievanceHandler = new GrievanceHandler();
window.grievanceHandler = grievanceHandler;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GrievanceHandler;
}
