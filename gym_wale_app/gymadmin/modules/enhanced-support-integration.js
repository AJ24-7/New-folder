/**
 * Enhanced Support Integration System
 * Seamless communication between Gym Admins and Main Admin
 * Version 2.0 - Production Ready
 */

class EnhancedSupportIntegration {
    constructor() {
        this.BASE_URL = window.API_CONFIG.BASE_URL;
        this.currentGymId = localStorage.getItem('gymId');
        this.gymProfile = JSON.parse(localStorage.getItem('gymProfile') || '{}');
        this.supportTickets = new Map();
        this.adminMessages = [];
        this.pollingInterval = null;
        this.lastFetchTime = new Date();
        this.initialized = false;
        this.notificationQueue = [];
        
        console.log('🚀 Enhanced Support Integration v2.0 initialized for gym:', this.gymProfile.name);
    }

    // Initialize the support system
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('🔧 Initializing Enhanced Support Integration...');
            
            // Verify gym authentication
            if (!this.currentGymId || !localStorage.getItem('gymToken')) {
                console.warn('⚠️ No gym authentication found');
                return;
            }
            
            // Setup UI components
            this.setupNotificationContainer();
            
            // Start real-time polling
            this.setupRealTimeUpdates();
            
            // Initialize admin communication channel
            await this.initializeAdminCommunication();
            
            // Load existing tickets
            await this.fetchSupportTickets();
            
            this.initialized = true;
            console.log('✅ Enhanced Support Integration ready!');
            
            // Show initialization success
            this.showNotification('Support system connected successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Support Integration:', error);
            this.showNotification('Failed to connect to support system. Some features may be limited.', 'warning');
        }
    }

    // Setup notification container in DOM
    setupNotificationContainer() {
        if (!document.getElementById('support-notifications')) {
            const container = document.createElement('div');
            container.id = 'support-notifications';
            container.className = 'support-notifications-container';
            document.body.appendChild(container);
        }
    }

    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('gymToken');
        if (!token) {
            throw new Error('No authentication token found');
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Submit a new support ticket or grievance
    async submitGrievance(grievanceData) {
        try {
            console.log('📝 Submitting grievance:', grievanceData);
            
            // Validate required fields
            if (!grievanceData.title && !grievanceData.subject) {
                throw new Error('Title or subject is required');
            }
            if (!grievanceData.description) {
                throw new Error('Description is required');
            }
            
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/support/create`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...grievanceData,
                    title: grievanceData.title || grievanceData.subject,
                    userType: 'Gym',
                    userId: this.currentGymId,
                    gymId: this.currentGymId,
                    gymName: this.gymProfile.name,
                    category: grievanceData.category || 'complaint',
                    priority: grievanceData.priority || 'normal',
                    source: 'gym-admin-portal',
                    metadata: {
                        gymId: this.currentGymId,
                        gymName: this.gymProfile.name,
                        submittedBy: 'gym-admin',
                        escalationLevel: 'gym-to-admin',
                        requiresAdminReview: true,
                        submissionTime: new Date().toISOString(),
                        ...grievanceData.metadata
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                const ticket = result.ticket || result;
                console.log('✅ Grievance created successfully:', ticket.ticketId || ticket.id);
                
                // Cache locally
                this.supportTickets.set(ticket.ticketId || ticket.id, ticket);
                
                // Show success notification
                this.showNotification(
                    `Support ticket #${ticket.ticketId || ticket.id} created successfully!`,
                    'success'
                );
                
                // Refresh tickets display if container exists
                this.renderSupportTickets();
                
                // Trigger custom event
                document.dispatchEvent(new CustomEvent('supportTicketCreated', {
                    detail: { ticket }
                }));
                
                return ticket;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to submit grievance:', error);
            this.showNotification(`Failed to submit support ticket: ${error.message}`, 'error');
            throw error;
        }
    }

    // Escalate a grievance to admin with high priority
    async escalateGrievanceToAdmin(ticketId, escalationReason, priority = 'high') {
        try {
            console.log(`⬆️ Escalating ticket ${ticketId} to admin...`);
            
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/escalate/${ticketId}`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    escalationReason,
                    newPriority: priority,
                    escalatedBy: 'gym-admin',
                    gymId: this.currentGymId,
                    gymName: this.gymProfile.name,
                    escalationLevel: 'urgent-admin-review',
                    metadata: {
                        originalTicketId: ticketId,
                        escalationTimestamp: new Date().toISOString(),
                        gymContext: this.gymProfile,
                        escalationReason
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Update local cache
                const ticket = this.supportTickets.get(ticketId);
                if (ticket) {
                    ticket.priority = priority;
                    ticket.status = 'escalated';
                    ticket.escalationHistory = ticket.escalationHistory || [];
                    ticket.escalationHistory.push({
                        timestamp: new Date(),
                        reason: escalationReason,
                        escalatedBy: 'gym-admin',
                        newPriority: priority
                    });
                }
                
                this.showNotification(
                    `Ticket #${ticketId} escalated to admin with ${priority} priority!`,
                    'success'
                );
                
                this.renderSupportTickets();
                
                // Trigger custom event
                document.dispatchEvent(new CustomEvent('ticketEscalated', {
                    detail: { ticketId, result }
                }));
                
                return result;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to escalate ticket: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to escalate grievance:', error);
            this.showNotification(`Failed to escalate ticket: ${error.message}`, 'error');
            throw error;
        }
    }

    // Initialize direct communication channel with admin
    async initializeAdminCommunication() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/gym/initialize`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    gymId: this.currentGymId,
                    gymName: this.gymProfile.name,
                    communicationType: 'support-channel',
                    metadata: {
                        gymProfile: this.gymProfile,
                        initializationTime: new Date().toISOString(),
                        version: '2.0'
                    }
                })
            });

            if (response.ok) {
                console.log('✅ Admin communication channel initialized');
                // Start polling for admin responses
                this.pollAdminResponses();
            } else {
                console.warn('⚠️ Failed to initialize admin communication channel');
            }
        } catch (error) {
            console.error('❌ Failed to initialize admin communication:', error);
        }
    }

    // Send direct message to admin
    async sendMessageToAdmin(messageData) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/admin/message`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...messageData,
                    fromGymId: this.currentGymId,
                    fromGymName: this.gymProfile.name,
                    messageType: 'gym-to-admin',
                    timestamp: new Date().toISOString(),
                    priority: messageData.priority || 'normal',
                    category: messageData.category || 'general',
                    metadata: {
                        gymContext: this.gymProfile,
                        senderType: 'gym-admin'
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Message sent to admin:', result.messageId);
                
                this.showNotification('Message sent to admin successfully!', 'success');
                
                // Add to local message history
                this.adminMessages.push({
                    id: result.messageId,
                    ...messageData,
                    timestamp: new Date(),
                    type: 'sent',
                    status: 'delivered'
                });
                
                this.renderAdminMessages();
                return result;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to send message: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to send message to admin:', error);
            this.showNotification(`Failed to send message: ${error.message}`, 'error');
            throw error;
        }
    }

    // Poll for admin responses
    async pollAdminResponses() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/admin/responses?gymId=${this.currentGymId}&since=${this.lastFetchTime.toISOString()}`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const messages = await response.json();
                
                if (messages && messages.length > 0) {
                    console.log(`📨 Received ${messages.length} new admin messages`);
                    
                    messages.forEach(message => {
                        this.handleAdminResponse(message);
                    });
                    
                    this.lastFetchTime = new Date();
                    this.renderAdminMessages();
                }
            }
        } catch (error) {
            console.error('❌ Error polling admin responses:', error);
        }
    }

    // Handle incoming admin response
    handleAdminResponse(message) {
        console.log('📨 Admin response received:', message);
        
        // Add to message history
        this.adminMessages.push({
            ...message,
            type: 'received',
            timestamp: new Date(message.timestamp)
        });
        
        // Show notification based on priority
        if (message.priority === 'high' || message.priority === 'urgent') {
            this.showNotification(
                `🚨 Urgent message from admin: ${message.subject || 'New Message'}`,
                'warning',
                10000 // Show for 10 seconds
            );
        } else {
            this.showNotification(
                `📨 New message from admin: ${message.subject || 'New Message'}`,
                'info'
            );
        }
        
        // Update related support ticket if exists
        if (message.relatedTicketId) {
            const ticket = this.supportTickets.get(message.relatedTicketId);
            if (ticket) {
                ticket.adminResponses = ticket.adminResponses || [];
                ticket.adminResponses.push(message);
                ticket.lastAdminResponse = new Date();
                ticket.status = message.ticketStatusUpdate || ticket.status;
            }
        }
        
        // Play notification sound
        this.playNotificationSound();
        
        // Trigger custom event
        document.dispatchEvent(new CustomEvent('adminMessageReceived', {
            detail: { message }
        }));
    }

    // Fetch all support tickets for the gym
    async fetchSupportTickets(filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                gymId: this.currentGymId,
                ...filters
            });
            
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/tickets?${queryParams}`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const tickets = await response.json();
                console.log(`📋 Fetched ${tickets.length} support tickets`);
                
                // Update local cache
                tickets.forEach(ticket => {
                    this.supportTickets.set(ticket.ticketId || ticket.id, ticket);
                });
                
                this.renderSupportTickets();
                return tickets;
            } else {
                console.warn('⚠️ Failed to fetch support tickets:', response.status);
                return [];
            }
        } catch (error) {
            console.error('❌ Failed to fetch support tickets:', error);
            this.showNotification('Failed to load support tickets', 'error');
            return [];
        }
    }

    // Update ticket status
    async updateTicketStatus(ticketId, newStatus, notes = '') {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/ticket/${ticketId}/status`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    status: newStatus,
                    notes,
                    updatedBy: 'gym-admin',
                    gymId: this.currentGymId,
                    updateTimestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Update local cache
                const ticket = this.supportTickets.get(ticketId);
                if (ticket) {
                    ticket.status = newStatus;
                    ticket.lastUpdate = new Date();
                    ticket.statusHistory = ticket.statusHistory || [];
                    ticket.statusHistory.push({
                        status: newStatus,
                        timestamp: new Date(),
                        updatedBy: 'gym-admin',
                        notes
                    });
                }
                
                this.showNotification(`Ticket #${ticketId} status updated to ${newStatus}`, 'success');
                this.renderSupportTickets();
                
                return result;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to update status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to update ticket status:', error);
            this.showNotification(`Failed to update ticket status: ${error.message}`, 'error');
            throw error;
        }
    }

    // Setup real-time updates
    setupRealTimeUpdates() {
        // Clear any existing interval
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll every 30 seconds for updates
        this.pollingInterval = setInterval(() => {
            if (this.initialized) {
                this.pollAdminResponses();
                this.checkTicketUpdates();
            }
        }, 30000);
        
        console.log('🔄 Real-time polling started (30s intervals)');
    }

    // Check for ticket updates
    async checkTicketUpdates() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/tickets/updates?gymId=${this.currentGymId}&since=${this.lastFetchTime.toISOString()}`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const updates = await response.json();
                
                if (updates && updates.length > 0) {
                    console.log(`🔄 ${updates.length} ticket updates received`);
                    
                    updates.forEach(update => {
                        const ticket = this.supportTickets.get(update.ticketId);
                        if (ticket) {
                            Object.assign(ticket, update.changes);
                            ticket.lastUpdate = new Date(update.timestamp);
                        }
                    });
                    
                    this.renderSupportTickets();
                    
                    // Show notification for important updates
                    const importantUpdates = updates.filter(u => 
                        u.changes.status === 'resolved' || 
                        u.changes.priority === 'high' ||
                        u.changes.adminAssigned
                    );
                    
                    if (importantUpdates.length > 0) {
                        this.showNotification(
                            `${importantUpdates.length} important ticket updates received`,
                            'info'
                        );
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking ticket updates:', error);
        }
    }

    // Request callback from admin
    async requestAdminCallback(callbackData) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/callback/request`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...callbackData,
                    gymId: this.currentGymId,
                    gymName: this.gymProfile.name,
                    requestedBy: 'gym-admin',
                    urgency: callbackData.urgency || 'normal',
                    requestTimestamp: new Date().toISOString(),
                    contactInfo: {
                        phone: this.gymProfile.phone,
                        email: this.gymProfile.email,
                        preferredTime: callbackData.preferredTime
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('📞 Callback requested:', result.callbackId);
                
                this.showNotification(
                    'Callback request submitted successfully! Admin will contact you soon.',
                    'success'
                );
                
                return result;
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to request callback: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to request callback:', error);
            this.showNotification(`Failed to request callback: ${error.message}`, 'error');
            throw error;
        }
    }

    // Render support tickets in UI
    renderSupportTickets() {
        const container = document.getElementById('support-tickets-container');
        if (!container) return;

        const tickets = Array.from(this.supportTickets.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = `
            <div class="support-tickets-header">
                <h3>Support Tickets (${tickets.length})</h3>
                <button onclick="supportSystem.showCreateTicketForm()" class="btn-primary">
                    <i class="fas fa-plus"></i> New Ticket
                </button>
            </div>
            
            <div class="tickets-list">
                ${tickets.map(ticket => this.renderTicketCard(ticket)).join('')}
                ${tickets.length === 0 ? '<div class="no-tickets">No support tickets found</div>' : ''}
            </div>
        `;
    }

    // Render individual ticket card
    renderTicketCard(ticket) {
        const statusClass = {
            'open': 'status-open',
            'in-progress': 'status-progress',
            'escalated': 'status-escalated', 
            'resolved': 'status-resolved',
            'closed': 'status-closed'
        }[ticket.status] || 'status-default';

        const priorityClass = {
            'low': 'priority-low',
            'normal': 'priority-normal',
            'high': 'priority-high',
            'urgent': 'priority-urgent'
        }[ticket.priority] || 'priority-normal';

        const ticketId = ticket.ticketId || ticket.id;
        const title = ticket.subject || ticket.title || 'No Title';
        const description = ticket.description || '';

        return `
            <div class="ticket-card ${statusClass}" data-ticket-id="${ticketId}">
                <div class="ticket-header">
                    <div class="ticket-id">#${ticketId}</div>
                    <div class="ticket-meta">
                        <span class="ticket-status ${statusClass}">${ticket.status}</span>
                        <span class="ticket-priority ${priorityClass}">${ticket.priority}</span>
                    </div>
                </div>
                
                <div class="ticket-content">
                    <h4 class="ticket-title">${title}</h4>
                    <p class="ticket-description">${description.substring(0, 150)}${description.length > 150 ? '...' : ''}</p>
                    
                    <div class="ticket-details">
                        <span class="ticket-category">
                            <i class="fas fa-tag"></i> ${ticket.category || 'General'}
                        </span>
                        <span class="ticket-date">
                            <i class="fas fa-clock"></i> ${new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                        ${ticket.adminResponses && ticket.adminResponses.length > 0 ? 
                            `<span class="admin-responses">
                                <i class="fas fa-reply"></i> ${ticket.adminResponses.length} Admin Response${ticket.adminResponses.length > 1 ? 's' : ''}
                            </span>` : ''
                        }
                    </div>
                </div>
                
                <div class="ticket-actions">
                    <button onclick="supportSystem.viewTicketDetails('${ticketId}')" class="btn-secondary">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    
                    ${ticket.status !== 'resolved' && ticket.status !== 'closed' ? 
                        `<button onclick="supportSystem.escalateGrievanceToAdmin('${ticketId}', 'Requires urgent attention')" class="btn-warning">
                            <i class="fas fa-arrow-up"></i> Escalate
                        </button>` : ''
                    }
                    
                    ${ticket.status === 'resolved' ? 
                        `<button onclick="supportSystem.updateTicketStatus('${ticketId}', 'closed', 'Satisfied with resolution')" class="btn-success">
                            <i class="fas fa-check"></i> Mark Closed
                        </button>` : ''
                    }
                </div>
            </div>
        `;
    }

    // Render admin messages
    renderAdminMessages() {
        const container = document.getElementById('admin-messages-container');
        if (!container) return;

        const messages = this.adminMessages
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10); // Show last 10 messages

        container.innerHTML = `
            <div class="admin-messages-header">
                <h3>Admin Communications (${messages.length})</h3>
                <button onclick="supportSystem.showMessageForm()" class="btn-primary">
                    <i class="fas fa-envelope"></i> Send Message
                </button>
            </div>
            
            <div class="messages-list">
                ${messages.map(message => this.renderMessageCard(message)).join('')}
                ${messages.length === 0 ? '<div class="no-messages">No messages yet</div>' : ''}
            </div>
        `;
    }

    // Render individual message card  
    renderMessageCard(message) {
        const messageClass = message.type === 'sent' ? 'message-sent' : 'message-received';
        const priorityClass = message.priority === 'high' ? 'priority-high' : '';

        return `
            <div class="message-card ${messageClass} ${priorityClass}">
                <div class="message-header">
                    <div class="message-meta">
                        <span class="message-type">${message.type === 'sent' ? 'To Admin' : 'From Admin'}</span>
                        <span class="message-time">${new Date(message.timestamp).toLocaleString()}</span>
                    </div>
                    ${message.priority === 'high' ? '<span class="priority-badge">High Priority</span>' : ''}
                </div>
                
                <div class="message-content">
                    <h4 class="message-subject">${message.subject || 'No Subject'}</h4>
                    <p class="message-body">${message.message || message.body || ''}</p>
                    
                    ${message.relatedTicketId ? 
                        `<div class="related-ticket">
                            <i class="fas fa-link"></i> Related to ticket #${message.relatedTicketId}
                        </div>` : ''
                    }
                </div>
            </div>
        `;
    }

    // Show notification
    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `support-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        const container = document.getElementById('support-notifications') || document.body;
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
        
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        // Add to notification queue for potential replay
        this.notificationQueue.push({
            message,
            type,
            timestamp: new Date()
        });
        
        // Keep only last 50 notifications
        if (this.notificationQueue.length > 50) {
            this.notificationQueue.shift();
        }
    }

    // Get notification icon based on type
    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'bell';
    }

    // Play notification sound
    playNotificationSound() {
        try {
            // Create audio context if it doesn't exist
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Try to play notification sound file
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Fallback to programmatic beep
                this.generateNotificationBeep();
            });
        } catch (error) {
            // Silent fallback
        }
    }

    // Generate programmatic notification beep
    generateNotificationBeep() {
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (error) {
            // Silent fallback
        }
    }

    // Show create ticket form
    showCreateTicketForm() {
        console.log('🎫 Opening create ticket form...');
        // Trigger custom event for other components to handle
        document.dispatchEvent(new CustomEvent('showCreateTicketForm'));
    }

    // Show message form
    showMessageForm() {
        console.log('📨 Opening message form...');
        // Trigger custom event for other components to handle
        document.dispatchEvent(new CustomEvent('showMessageForm'));
    }

    // View ticket details
    viewTicketDetails(ticketId) {
        const ticket = this.supportTickets.get(ticketId);
        if (ticket) {
            console.log('👀 Viewing ticket details:', ticket);
            // Trigger custom event for other components to handle
            document.dispatchEvent(new CustomEvent('viewTicketDetails', {
                detail: { ticket }
            }));
        }
    }

    // Get support statistics
    getSupportStats() {
        const tickets = Array.from(this.supportTickets.values());
        
        return {
            totalTickets: tickets.length,
            openTickets: tickets.filter(t => t.status === 'open').length,
            inProgressTickets: tickets.filter(t => t.status === 'in-progress').length,
            escalatedTickets: tickets.filter(t => t.status === 'escalated').length,
            resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
            closedTickets: tickets.filter(t => t.status === 'closed').length,
            averageResponseTime: this.calculateAverageResponseTime(tickets),
            adminMessages: this.adminMessages.length,
            lastCommunication: this.adminMessages.length > 0 ? 
                new Date(Math.max(...this.adminMessages.map(m => new Date(m.timestamp)))) : null
        };
    }

    // Calculate average response time
    calculateAverageResponseTime(tickets) {
        const respondedTickets = tickets.filter(t => t.adminResponses && t.adminResponses.length > 0);
        
        if (respondedTickets.length === 0) return null;
        
        const totalResponseTime = respondedTickets.reduce((sum, ticket) => {
            const createdAt = new Date(ticket.createdAt);
            const firstResponse = new Date(ticket.adminResponses[0].timestamp);
            return sum + (firstResponse - createdAt);
        }, 0);
        
        const averageMs = totalResponseTime / respondedTickets.length;
        const averageHours = Math.round(averageMs / (1000 * 60 * 60));
        
        return averageHours;
    }

    // Cleanup resources
    cleanup() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.supportTickets.clear();
        this.adminMessages = [];
        this.notificationQueue = [];
        this.initialized = false;
        
        console.log('🧹 Enhanced Support Integration cleaned up');
    }

    // Public API methods for external integration
    isInitialized() {
        return this.initialized;
    }

    getTickets() {
        return Array.from(this.supportTickets.values());
    }

    getMessages() {
        return [...this.adminMessages];
    }

    getNotifications() {
        return [...this.notificationQueue];
    }
}

// Global instance
let supportSystem = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Initializing Enhanced Support Integration System...');
        
        supportSystem = new EnhancedSupportIntegration();
        await supportSystem.initialize();
        
        console.log('✅ Enhanced Support Integration ready for use!');
        
        // Make it globally available
        window.supportSystem = supportSystem;
        
    } catch (error) {
        console.error('❌ Failed to initialize support system:', error);
        
        // Show error notification if possible
        if (supportSystem && supportSystem.showNotification) {
            supportSystem.showNotification('Support system initialization failed', 'error');
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (supportSystem) {
        supportSystem.cleanup();
    }
});

// Handle visibility change to pause/resume polling
document.addEventListener('visibilitychange', () => {
    if (supportSystem && supportSystem.initialized) {
        if (document.hidden) {
            // Page is hidden, reduce polling frequency
            if (supportSystem.pollingInterval) {
                clearInterval(supportSystem.pollingInterval);
                supportSystem.pollingInterval = setInterval(() => {
                    supportSystem.pollAdminResponses();
                    supportSystem.checkTicketUpdates();
                }, 60000); // Poll every minute when hidden
            }
        } else {
            // Page is visible, restore normal polling
            supportSystem.setupRealTimeUpdates();
        }
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSupportIntegration;
}

// Global integration hooks
window.EnhancedSupportIntegration = EnhancedSupportIntegration;
