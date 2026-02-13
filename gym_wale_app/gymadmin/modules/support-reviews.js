// === Enhanced Support & Reviews Management System ===
// Comprehensive system for notifications, reviews, grievances, and communications
// Designed with modern UI/UX patterns similar to the payment tab

class SupportReviewsManager {
    constructor() {
        this.currentTab = 'notifications';
        this.notifications = [];
        this.reviews = [];
        this.grievances = [];
        this.communications = [];
        this.currentGymId = null;
        this.gymProfile = null;
        this.BASE_URL = window.API_CONFIG.BASE_URL; // Use centralized config
        this.autoRefreshInterval = null;
        this.activeChatId = null;
        this.stats = {
            notifications: { total: 0, unread: 0, system: 0, priority: 0 },
            reviews: { total: 0, average: 0, pending: 0, recent: 0 },
            grievances: { total: 0, open: 0, resolved: 0, urgent: 0 },
            communications: { total: 0, unread: 0, active: 0, responseTime: 0 }
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.fetchGymId();
        this.initializeModalEnhancements();
        this.performSystemDiagnostics();
        this.setupUnifiedNotificationSync();
    }
    
    // Setup synchronization with unified notification system
    setupUnifiedNotificationSync() {
        // Check if unified notification system is available
        if (window.unifiedNotificationSystem) {
            
            // Initial sync
            this.syncWithUnifiedNotifications();
            
            // Setup periodic sync every 30 seconds
            setInterval(() => {
                this.syncWithUnifiedNotifications();
            }, 30000);
            
            // Listen for new notifications from unified system
            document.addEventListener('newUnifiedNotification', (event) => {
                this.handleNewUnifiedNotification(event.detail);
            });
        } else {
            console.warn('⚠️ Unified notification system not available');
        }
    }
    
    // Sync notifications with unified system
    syncWithUnifiedNotifications() {
        if (!window.unifiedNotificationSystem) return;
        
        const unifiedNotifications = window.unifiedNotificationSystem.notifications || [];
        
        // Only sync if there are new notifications
        if (unifiedNotifications.length > this.notifications.length) {
            this.loadNotifications();
            
            // Update UI if we're on the notifications tab
            if (this.currentTab === 'notifications') {
                this.renderNotifications();
            }
        }
    }
    
    // Handle new notification from unified system
    handleNewUnifiedNotification(notification) {
        // Convert to support tab format
        const supportNotification = {
            _id: notification.id,
            id: notification.id,
            type: notification.type || 'system',
            title: notification.title,
            message: notification.message,
            priority: this.determinePriority(notification.type),
            read: notification.read || false,
            createdAt: notification.timestamp,
            metadata: notification.metadata || {}
        };
        
        // Add to beginning of notifications array
        this.notifications.unshift(supportNotification);
        
        // Update stats and UI
        this.updateNotificationStats();
        
        // Re-render if we're on notifications tab
        if (this.currentTab === 'notifications') {
            this.renderNotifications();
        }
    }

    // System diagnostics to identify issues
    async performSystemDiagnostics() {
        
        const diagnostics = {
            tokenStatus: 'checking',
            gymAuthStatus: 'checking',
            apiConnectivity: 'checking',
            enhancedIntegrationStatus: 'checking'
        };
        
        // Check tokens
        const tokens = {
            gymAdminToken: localStorage.getItem('gymAdminToken'),
            gymAuthToken: localStorage.getItem('gymAuthToken'),
            token: localStorage.getItem('token')
        };
        
        diagnostics.tokenStatus = Object.values(tokens).some(t => t) ? 'available' : 'missing';
        
        // Check enhanced integration
        diagnostics.enhancedIntegrationStatus = window.enhancedSupportIntegration ? 'available' : 'missing';
        
        // Check API connectivity
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/gym/communication/test`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            diagnostics.apiConnectivity = response.ok ? 'connected' : `error_${response.status}`;
        } catch (error) {
            diagnostics.apiConnectivity = `network_error: ${error.message}`;
        }
        
        
        // Show status in UI if there are issues
        if (diagnostics.tokenStatus === 'missing' || 
            diagnostics.apiConnectivity.startsWith('error') || 
            diagnostics.apiConnectivity.startsWith('network_error')) {
            this.showSystemStatusWarning(diagnostics);
        }
    }

    showSystemStatusWarning(diagnostics) {
        const warning = `
            ⚠️ Support System Status Issues Detected:
            - Token: ${diagnostics.tokenStatus}
            - API: ${diagnostics.apiConnectivity}
            - Enhanced Integration: ${diagnostics.enhancedIntegrationStatus}
            
            Some features may work in limited mode.
        `;
        console.warn(warning);
    }

    // Initialize modal enhancements
    initializeModalEnhancements() {
        // Ensure all support modals have proper event handlers
        const modals = ['reviewReplyModal', 'raiseGrievanceModal', 'sendNotificationModal', 'grievanceDetailsModal', 'chatModal'];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                // Add click outside to close functionality
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal();
                    }
                });
                
                // Add escape key to close functionality
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && modal.classList.contains('active')) {
                        this.closeModal();
                    }
                });
                
            }
        });
    }

    async fetchGymId() {
        try {
            // Try multiple token storage keys for compatibility
            const token = localStorage.getItem('gymAdminToken') || 
                         localStorage.getItem('gymAuthToken') || 
                         localStorage.getItem('token');
            
            if (!token) {
                console.error('❌ No gym admin token found');
                return;
            }

            // Enhanced token validation with detailed logging
            const response = await fetch(`${this.BASE_URL}/api/gyms/profile/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.gymProfile = data;
                this.currentGymId = data._id;
                this.loadInitialData();
            } else {
                console.error('❌ Failed to fetch gym profile:', response.status, response.statusText);
                // Try alternative endpoint for gym authentication
                await this.tryAlternativeAuth(token);
            }
        } catch (error) {
            console.error('❌ Error fetching gym profile:', error);
        }
    }

    async tryAlternativeAuth(token) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/gym/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.gymProfile = data;
                this.currentGymId = data._id || data.id;
                this.loadInitialData();
            } else {
                console.error('❌ Alternative auth also failed:', response.status);
                this.handleAuthFailure();
            }
        } catch (error) {
            console.error('❌ Alternative auth error:', error);
            this.handleAuthFailure();
        }
    }

    handleAuthFailure() {
        console.warn('⚠️ Authentication failed, using mock data for development');
        // Set mock gym data for development
        this.currentGymId = '6808bc380d3a005a225fc891'; // From the console log
        this.gymProfile = {
            _id: this.currentGymId,
            name: 'Demo Gym',
            email: 'demo@gym.com'
        };
        this.loadInitialData();
    }

    bindEvents() {
        
        // Tab navigation - Enhanced with better event handling and debugging
        document.addEventListener('click', (e) => {
            if (e.target.matches('.support-tab-btn') || e.target.closest('.support-tab-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const tabBtn = e.target.closest('.support-tab-btn') || e.target;
                const tabName = tabBtn.dataset.tab;
                if (tabName && this.currentTab !== tabName) {
                    this.switchTab(tabName);
                }
                return false;
            }
        });

        // Header action buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('#supportSendNotificationBtn') || e.target.closest('#supportSendNotificationBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openSendNotificationModal();
            }
            if (e.target.matches('#supportRaiseGrievanceBtn') || e.target.closest('#supportRaiseGrievanceBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openRaiseGrievanceModal();
            }
            if (e.target.matches('#startCommunicationBtn') || e.target.closest('#startCommunicationBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.openStartCommunicationModal();
            }
            
            // Stat card clicks - Navigate to respective tabs
            const statCard = e.target.closest('.stat-card[id^="support"]');
            if (statCard) {
                const cardId = statCard.id;
                let targetTab = '';
                
                if (cardId === 'supportNotificationsStatCard') targetTab = 'notifications';
                else if (cardId === 'supportReviewsStatCard') targetTab = 'reviews';
                else if (cardId === 'supportGrievancesStatCard') targetTab = 'grievances';
                else if (cardId === 'supportChatsStatCard') targetTab = 'communications';
                
                if (targetTab && this.currentTab !== targetTab) {
                    console.log('📊 Stat card clicked, navigating to:', targetTab);
                    this.switchTab(targetTab);
                }
            }
        });

        // Modal controls with enhanced event handling
        document.addEventListener('click', (e) => {
            // Check for modal close buttons
            if (e.target.matches('.support-modal-close') || e.target.closest('.support-modal-close')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
            
            // Check for clicking outside modal content
            if (e.target.matches('.support-modal') && !e.target.closest('.support-modal-content')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
            
            // Check for cancel buttons
            if (e.target.matches('#cancelNotification') || e.target.matches('#cancelGrievance')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
                return;
            }
        });

        // Review reply buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.review-action[data-action="reply"]') || e.target.closest('.review-action[data-action="reply"]')) {
                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                this.openReplyModal(reviewId);
            }
            
            // Feature/Unfeature review
            if (e.target.matches('.review-action[data-action="feature"]') || e.target.closest('.review-action[data-action="feature"]')) {
                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                const review = this.reviews.find(r => (r._id || r.id) === reviewId);
                const action = review?.isFeatured ? 'Unfeature' : 'Feature';
                
                this.showDialog({
                    title: `${action} Review`,
                    message: `Are you sure you want to ${action.toLowerCase()} this review?${action === 'Feature' ? '\n\nFeatured reviews will appear as badges on your gym details page.' : ''}`,
                    confirmText: action,
                    cancelText: 'Cancel',
                    iconHtml: `<div style="width:50px;height:50px;background:${action === 'Feature' ? '#FFD700' : '#6c757d'};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;"><i class="fas fa-star" style="color:white;font-size:24px;"></i></div>`,
                    onConfirm: () => {
                        this.toggleFeatureReview(reviewId);
                    }
                });
                return;
            }
            
            // Delete review
            if (e.target.matches('.review-action[data-action="delete"]') || e.target.closest('.review-action[data-action="delete"]')) {
                const reviewId = e.target.closest('.review-item').dataset.reviewId;
                const review = this.reviews.find(r => (r._id || r.id) === reviewId);
                const userName = this.getUserName(review);
                
                this.showDialog({
                    title: 'Delete Review',
                    message: `Are you sure you want to delete this review by ${userName}?\n\nThis action cannot be undone and the review will be permanently removed.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    iconHtml: '<div style="width:50px;height:50px;background:#dc3545;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;"><i class="fas fa-trash" style="color:white;font-size:24px;"></i></div>',
                    onConfirm: () => {
                        this.deleteReview(reviewId);
                    }
                });
                return;
            }
        });

        // Notification actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.notification-action')) {
                const action = e.target.dataset.action;
                const notificationId = e.target.closest('.notification-item').dataset.notificationId;
                this.handleNotificationAction(action, notificationId);
            }
        });

        // Grievance actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.grievance-item')) {
                const grievanceId = e.target.dataset.grievanceId;
                this.openGrievanceDetails(grievanceId);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#sendNotificationForm')) {
                e.preventDefault();
                this.handleSendNotification(e.target);
            }
            if (e.target.matches('#raiseGrievanceForm')) {
                e.preventDefault();
                this.handleRaiseGrievance(e.target);
            }
            if (e.target.matches('#replyForm')) {
                e.preventDefault();
                this.handleReplySubmission(e.target);
            }
            if (e.target.matches('#notificationReplyForm')) {
                e.preventDefault();
                this.handleNotificationReplySubmission(e.target);
            }
            if (e.target.matches('#urgentResponseForm')) {
                e.preventDefault();
                this.handleUrgentResponseSubmission(e.target);
            }
            if (e.target.matches('#escalationForm')) {
                e.preventDefault();
                this.handleEscalationFormSubmission(e.target);
            }
        });

        // Search and filters
        document.addEventListener('input', (e) => {
            if (e.target.matches('.support-search')) {
                this.handleSearch(e.target.value, this.currentTab);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.support-filter')) {
                this.handleFilter(e.target.value, this.currentTab);
            }
        });
    }

    switchTab(tabName) {
        if (!tabName || this.currentTab === tabName) return;
        
        
        // Update tab buttons with forced refresh
        document.querySelectorAll('.support-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.pointerEvents = 'auto'; // Ensure buttons are clickable
        });
        
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update tab content with animation
        document.querySelectorAll('.support-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        const targetSection = document.getElementById(`${tabName}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            // Force reflow before adding active class for smooth animation
            targetSection.offsetHeight;
            targetSection.classList.add('active');
        }

        this.currentTab = tabName;
        this.loadTabData(tabName);
        
    }

    async loadInitialData() {
        await Promise.all([
            this.loadNotifications(),
            this.loadReviews(),
            this.loadGrievances(),
            this.loadCommunications()
        ]);
        this.updateStats();
        // Ensure notifications tab is active by default
        this.switchTab('notifications');
    }

    async loadTabData(tabName) {
        // Stop auto-refresh when switching tabs
        this.stopAutoRefresh();
        
        switch (tabName) {
            case 'notifications':
                this.renderNotifications();
                break;
            case 'reviews':
                this.renderReviews();
                break;
            case 'grievances':
                this.renderGrievances();
                break;
            case 'communications':
                this.renderCommunications();
                // Start auto-refresh for communications
                this.startAutoRefresh();
                break;
        }
    }

    startAutoRefresh() {
        
        // Clear any existing interval
        this.stopAutoRefresh();
        
        // Refresh every 3 seconds for instant message delivery
        this.autoRefreshInterval = setInterval(async () => {
            if (this.currentTab !== 'communications') return;

            // If user is typing in chat input, skip this refresh cycle to avoid losing focus/content
            const activeEl = document.activeElement;
            const isTyping = activeEl && activeEl.id === 'chatReplyInput';
            if (isTyping) {
                return;
            }


            const messageArea = document.querySelector('.chat-messages');
            const wasAtBottom = messageArea ? (messageArea.scrollTop + messageArea.clientHeight >= messageArea.scrollHeight - 10) : true;
            const prevScrollTop = messageArea ? messageArea.scrollTop : 0;

            // Reload communications WITHOUT re-rendering the entire layout
            await this.loadCommunications({ skipRender: true });

            // If there's an active chat, refresh only its messages to preserve the UI
            if (this.activeChatId) {
                this.refreshActiveChatMessages(this.activeChatId, { preserveScrollTop: !wasAtBottom, prevScrollTop });
            } else {
                // No active chat, safe to re-render the conversations list
                this.renderCommunications();
            }
        }, 3000); // 3 seconds for instant message delivery
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    async loadNotifications() {
        try {
            // First, check if unified notification system is available
            if (window.unifiedNotificationSystem) {
                const unifiedNotifications = window.unifiedNotificationSystem.notifications || [];
                
                // Convert unified notifications to support tab format
                this.notifications = unifiedNotifications.map(notif => ({
                    _id: notif.id,
                    id: notif.id,
                    type: notif.type || 'system',
                    title: notif.title,
                    message: notif.message,
                    priority: this.determinePriority(notif.type),
                    read: notif.read || false,
                    createdAt: notif.timestamp,
                    metadata: notif.metadata || {}
                }));
                
                this.updateNotificationStats();
                this.renderNotifications();
                return;
            }
            
            // Fallback to API fetch
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/gym/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications || [];
                this.updateNotificationStats();
            } else {
                console.error('Failed to load notifications:', response.status);
                this.notifications = this.getMockNotifications();
                this.updateNotificationStats();
            }
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.notifications = this.getMockNotifications();
            this.updateNotificationStats();
            this.renderNotifications();
        }
    }
    
    // Helper method to determine priority based on notification type
    determinePriority(type) {
        const highPriorityTypes = ['payment_failed', 'alert', 'error', 'admin_action', 'membership_expiry'];
        const urgentPriorityTypes = ['admin', 'system'];
        const normalPriorityTypes = ['payment_pending', 'warning', 'trial_booking'];
        
        if (urgentPriorityTypes.includes(type)) return 'urgent';
        if (highPriorityTypes.includes(type)) return 'high';
        if (normalPriorityTypes.includes(type)) return 'normal';
        return 'low';
    }

    async loadReviews() {
        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            if (!this.currentGymId) {
                console.error('No gym ID available for loading reviews');
                this.reviews = this.getMockReviews();
                this.updateReviewStats();
                return;
            }

            const response = await fetch(`${this.BASE_URL}/api/reviews/gym/${this.currentGymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.reviews = data.reviews || data; // Handle both response formats
                
                // Enhanced debugging: Log the first review with better formatting
                if (this.reviews.length > 0) {
                    const firstReview = this.reviews[0];
                  
                    
                  
                }
                
                this.updateReviewStats();
            } else {
                console.error('Failed to load reviews:', response.status, response.statusText);
                const errorData = await response.text();
                console.error('Error response:', errorData);
                this.reviews = this.getMockReviews();
                this.updateReviewStats();
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.reviews = this.getMockReviews();
            this.updateReviewStats();
        }
    }

    async loadGrievances() {
        try {
            const token = this.getAuthToken();
            
            // First try to load from integrated support system
            if (window.enhancedSupportIntegration) {
                const supportTickets = await window.enhancedSupportIntegration.fetchSupportTickets({
                    category: 'complaint',
                    status: 'all'
                });
                
                if (supportTickets && supportTickets.length > 0) {
                    this.grievances = supportTickets.map(ticket => ({
                        _id: ticket.ticketId,
                        id: ticket.ticketId,
                        title: ticket.subject || ticket.title,
                        description: ticket.description || ticket.message,
                        priority: ticket.priority || 'medium',
                        status: ticket.status || 'open',
                        createdAt: ticket.createdAt,
                        member: ticket.userDetails || { name: 'Member' },
                        metadata: ticket.metadata || {}
                    }));
                    this.updateGrievanceStats();
                    // Update grievance handler if available
                    if (window.grievanceHandler) {
                        window.grievanceHandler.updateGrievances(this.grievances);
                    }
                    console.log('✅ Loaded grievances from enhanced support:', this.grievances.length);
                    return;
                }
            }
            
            // Try gym communication routes first
            try {
                console.log('📡 Fetching grievances from:', `${this.BASE_URL}/api/gym/communication/grievances/${this.currentGymId}`);
                const commResponse = await fetch(`${this.BASE_URL}/api/gym/communication/grievances/${this.currentGymId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (commResponse.ok) {
                    const data = await commResponse.json();
                    console.log('✅ Grievances response:', data);
                    this.grievances = data.grievances || data.tickets || [];
                    this.updateGrievanceStats();
                    // Update grievance handler if available
                    if (window.grievanceHandler) {
                        window.grievanceHandler.updateGrievances(this.grievances);
                    }
                    console.log('✅ Loaded grievances from gym communication:', this.grievances.length);
                    return;
                } else {
                    console.warn('⚠️ Gym communication API returned:', commResponse.status, commResponse.statusText);
                }
            } catch (commError) {
                console.error('❌ Error with gym communication API:', commError);
            }
            
            // Fallback to direct support API call
            console.log('📡 Trying fallback support API');
            const response = await fetch(`${this.BASE_URL}/api/support/grievances/gym/${this.currentGymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.grievances = data.tickets || data.grievances || [];
                this.updateGrievanceStats();
                // Update grievance handler if available
                if (window.grievanceHandler) {
                    window.grievanceHandler.updateGrievances(this.grievances);
                }
                console.log('✅ Loaded grievances from support API:', this.grievances.length);
            } else if (response.status === 401) {
                console.warn('⚠️ Authentication failed for grievances, using mock data');
                this.grievances = this.getMockGrievances();
                this.updateGrievanceStats();
            } else {
                console.error('Failed to load grievances:', response.status, response.statusText);
                this.grievances = this.getMockGrievances();
                this.updateGrievanceStats();
            }
        } catch (error) {
            console.error('❌ Error loading grievances:', error);
            this.grievances = this.getMockGrievances();
            this.updateGrievanceStats();
        }
    }

    async loadCommunications(options = {}) {
        try {
            const token = this.getAuthToken();
            
            // Use the new gym-specific chat endpoint
            const response = await fetch(`${this.BASE_URL}/api/chat/gym/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.communications = data.conversations || [];
                this.updateCommunicationStats();
                if (!options.skipRender) this.renderCommunications();
            } else if (response.status === 401) {
                console.warn('⚠️ Authentication failed for communications');
                this.communications = [];
                this.updateCommunicationStats();
                if (!options.skipRender) this.renderCommunications();
            } else {
                console.error('Failed to load communications:', response.status, response.statusText);
                this.communications = [];
                this.updateCommunicationStats();
                if (!options.skipRender) this.renderCommunications();
            }
        } catch (error) {
            console.error('❌ Error loading communications:', error);
            this.communications = [];
            this.updateCommunicationStats();
            if (!options.skipRender) this.renderCommunications();
        }
    }

    // Helper method to get authentication token
    getAuthToken() {
        return localStorage.getItem('gymAdminToken') || 
               localStorage.getItem('gymAuthToken') || 
               localStorage.getItem('token');
    }

    updateStats() {
        // Update stat cards
        this.updateStatCards();
        
        // Update tab counters only
        const notificationCounter = document.querySelector('[data-tab="notifications"] .tab-counter');
        const reviewCounter = document.querySelector('[data-tab="reviews"] .tab-counter');
        const grievanceCounter = document.querySelector('[data-tab="grievances"] .tab-counter');
        const communicationCounter = document.querySelector('[data-tab="communications"] .tab-counter');

        if (notificationCounter) notificationCounter.textContent = this.stats.notifications.unread;
        if (reviewCounter) reviewCounter.textContent = this.stats.reviews.pending;
        if (grievanceCounter) grievanceCounter.textContent = this.stats.grievances.open;
        if (communicationCounter) communicationCounter.textContent = this.stats.communications.unread;
    }

    updateStatCards() {
        // Update Notifications Stat Card
        const notificationsCard = document.getElementById('supportNotificationsStatCard');
        if (notificationsCard) {
            const valueEl = notificationsCard.querySelector('.stat-number');
            const totalEl = notificationsCard.querySelector('#supportNotificationsTotal');
            const changeEl = notificationsCard.querySelector('.stat-change');
            
            if (valueEl) valueEl.textContent = this.stats.notifications.unread;
            if (totalEl) totalEl.textContent = `${this.stats.notifications.total} Total`;
            
            // Update change indicator based on priority
            if (changeEl) {
                if (this.stats.notifications.priority > 0) {
                    changeEl.className = 'stat-change negative';
                    changeEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${this.stats.notifications.priority} High Priority</span>`;
                } else {
                    changeEl.className = 'stat-change positive';
                    changeEl.innerHTML = `<i class="fas fa-inbox"></i> <span>${this.stats.notifications.total} Total</span>`;
                }
            }
        }

        // Update Reviews Stat Card
        const reviewsCard = document.getElementById('supportReviewsStatCard');
        if (reviewsCard) {
            const valueEl = reviewsCard.querySelector('.stat-number');
            const totalEl = reviewsCard.querySelector('#supportReviewsTotal');
            const changeEl = reviewsCard.querySelector('.stat-change');
            
            // Display average rating as the main value
            const avgRating = this.stats.reviews.average.toFixed(1);
            if (valueEl) valueEl.textContent = avgRating;
            
            // Display reviewer count in the total
            if (totalEl) totalEl.textContent = `${this.stats.reviews.total} Reviewers`;
            
            // Update change indicator based on rating quality
            if (changeEl) {
                const rating = parseFloat(avgRating);
                if (rating >= 4.0) {
                    changeEl.className = 'stat-change positive';
                    changeEl.innerHTML = `<i class="fas fa-star"></i> <span>Excellent Rating</span>`;
                } else if (rating >= 3.0) {
                    changeEl.className = 'stat-change positive';
                    changeEl.innerHTML = `<i class="fas fa-star-half-alt"></i> <span>Good Rating</span>`;
                } else if (rating > 0) {
                    changeEl.className = 'stat-change negative';
                    changeEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>Needs Attention</span>`;
                } else {
                    changeEl.className = 'stat-change positive';
                    changeEl.innerHTML = `<i class="fas fa-users"></i> <span>No Reviews Yet</span>`;
                }
            }
        }

        // Update Grievances Stat Card
        const grievancesCard = document.getElementById('supportGrievancesStatCard');
        if (grievancesCard) {
            const valueEl = grievancesCard.querySelector('.stat-number');
            const totalEl = grievancesCard.querySelector('#supportGrievancesTotal');
            const changeEl = grievancesCard.querySelector('.stat-change');
            
            if (valueEl) valueEl.textContent = this.stats.grievances.open;
            if (totalEl) totalEl.textContent = `${this.stats.grievances.total} Total`;
            
            // Update change indicator based on urgent grievances
            if (changeEl) {
                if (this.stats.grievances.urgent > 0) {
                    changeEl.className = 'stat-change negative';
                    changeEl.innerHTML = `<i class="fas fa-fire"></i> <span>${this.stats.grievances.urgent} Urgent</span>`;
                } else {
                    changeEl.className = 'stat-change positive';
                    changeEl.innerHTML = `<i class="fas fa-check-circle"></i> <span>${this.stats.grievances.resolved} Resolved</span>`;
                }
            }
        }

        // Update Chats Stat Card
        const chatsCard = document.getElementById('supportChatsStatCard');
        if (chatsCard) {
            const valueEl = chatsCard.querySelector('.stat-number');
            const totalEl = chatsCard.querySelector('#supportChatsTotal');
            const changeEl = chatsCard.querySelector('.stat-change');
            
            if (valueEl) valueEl.textContent = this.stats.communications.unread;
            if (totalEl) totalEl.textContent = `${this.stats.communications.total} Total`;
            
            // Update change indicator with active chats
            if (changeEl) {
                if (this.stats.communications.unread > 0) {
                    changeEl.className = 'stat-change negative';
                    changeEl.innerHTML = `<i class="fas fa-reply"></i> <span>${this.stats.communications.unread} Need Reply</span>`;
                } else {
                    changeEl.className = 'stat-change positive';
                    changeEl.innerHTML = `<i class="fas fa-check"></i> <span>All Replied</span>`;
                }
            }
        }

        console.log('📊 Stat cards updated:', this.stats);
    }

    updateNotificationStats() {
        this.stats.notifications.total = this.notifications.length;
        this.stats.notifications.unread = this.notifications.filter(n => !n.read).length;
        this.stats.notifications.system = this.notifications.filter(n => n.type === 'system').length;
        this.stats.notifications.priority = this.notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length;
        
        // Update stat card immediately
        this.updateStatCards();
    }

    updateReviewStats() {
        this.stats.reviews.total = this.reviews.length;
        this.stats.reviews.average = this.reviews.length > 0 
            ? this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length 
            : 0;
        this.stats.reviews.pending = this.reviews.filter(r => !r.adminReply).length;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        this.stats.reviews.recent = this.reviews.filter(r => new Date(r.createdAt) > weekAgo).length;
        
        // Update stat card immediately
        this.updateStatCards();
    }

    updateGrievanceStats() {
        this.stats.grievances.total = this.grievances.length;
        this.stats.grievances.open = this.grievances.filter(g => g.status === 'open' || g.status === 'in-progress').length;
        this.stats.grievances.resolved = this.grievances.filter(g => g.status === 'resolved').length;
        this.stats.grievances.urgent = this.grievances.filter(g => g.priority === 'urgent').length;
        
        // Update stat card immediately
        this.updateStatCards();
    }

    updateCommunicationStats() {
        this.stats.communications.total = this.communications.length;
        this.stats.communications.unread = this.communications.filter(c => c.unreadCount > 0).length;
        this.stats.communications.active = this.communications.filter(c => c.status === 'active').length;
        this.stats.communications.responseTime = 2; // Mock average response time
        
        // Update stat card immediately
        this.updateStatCards();
    }

    renderNotifications() {
        const container = document.querySelector('#notificationsSection .notifications-list');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = this.getEmptyState('notifications', 'No notifications yet', 'You\'ll see all gym notifications here');
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 data-notification-id="${notification._id || notification.id}"
                 data-type="${notification.type}"
                 onclick="window.supportManager.openNotificationDetailsModal('${notification._id || notification.id}')"
                 style="cursor: pointer;">
                <div class="notification-header">
                    <div class="notification-title-section">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="notification-icon">
                                <i class="fas ${this.getNotificationIcon(notification.type, notification.priority)}"></i>
                            </div>
                            <div class="notification-title-content">
                                <h4 class="notification-title">
                                    ${notification.title}
                                    ${notification.metadata?.ticketId ? `<span class="ticket-id">#${notification.metadata.ticketId}</span>` : ''}
                                </h4>
                            </div>
                        </div>
                    </div>
                    <div class="notification-meta">
                        <span class="notification-priority priority-${notification.priority}">${notification.priority}</span>
                        <span class="notification-time"><i class="fas fa-clock"></i> ${this.formatDate(notification.createdAt)}</span>
                    </div>
                </div>
                ${notification.metadata?.adminMessage ? `
                    <p class="notification-message admin-main-message">${notification.metadata.adminMessage}</p>
                ` : `
                    <p class="notification-message">${notification.message}</p>
                `}
                <div class="notification-actions" onclick="event.stopPropagation();">
                    ${!notification.read ? `<button class="notification-action primary" data-action="mark-read" onclick="event.stopPropagation(); window.supportManager.handleNotificationAction('mark-read', '${notification._id || notification.id}')">
                        <i class="fas fa-check"></i> Mark as Read
                    </button>` : ''}
                    ${this.canReplyToNotification(notification) ? `<button class="notification-action reply" data-action="reply" onclick="event.stopPropagation(); window.supportManager.openNotificationReplyModal('${notification._id || notification.id}')">
                        <i class="fas fa-reply"></i> Reply
                    </button>` : ''}
                    ${notification.priority === 'high' || notification.priority === 'urgent' ? `<button class="notification-action urgent" data-action="respond" onclick="event.stopPropagation(); window.supportManager.openNotificationResponseModal('${notification._id || notification.id}')">
                        <i class="fas fa-exclamation-triangle"></i> Respond
                    </button>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderReviews() {
        const container = document.querySelector('#reviewsSection .reviews-list');
        if (!container) return;

        if (this.reviews.length === 0) {
            container.innerHTML = this.getEmptyState('reviews', 'No reviews yet', 'Member reviews will appear here');
            return;
        }

        container.innerHTML = this.reviews.map(review => `
            <div class="review-item" data-review-id="${review._id || review.id}">
                <div class="review-header">
                    <div class="review-user">
                        <img src="${this.getUserImage(review)}" 
                             alt="Member" 
                             class="review-avatar"
                             onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'; this.style.border='2px solid #ccc';">
                        <div class="review-user-info">
                            <h4>${this.getUserName(review)}</h4>
                            <p>${this.formatDate(review.createdAt)}</p>
                        </div>
                    </div>
                    <div class="review-rating-section">
                        <div class="review-rating">
                            ${this.renderStars(review.rating)}
                        </div>
                        ${review.isFeatured ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>' : ''}
                    </div>
                </div>
                <div class="review-content">${review.comment}</div>
                ${this.renderAdminReply(review)}
                <div class="review-actions">
                    ${!review.adminReply ? `<button class="review-action primary" data-action="reply"><i class="fas fa-reply"></i> Reply</button>` : ''}
                    <button class="review-action ${review.isFeatured ? 'featured' : ''}" data-action="feature">
                        <i class="fas fa-star"></i> ${review.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button class="review-action danger" data-action="delete"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
    }

    renderGrievances() {
        console.log('🎨 Rendering grievances, count:', this.grievances.length);
        const container = document.querySelector('#grievancesSection .grievances-list');
        if (!container) {
            console.error('❌ Grievances container not found!');
            return;
        }

        if (this.grievances.length === 0) {
            console.log('ℹ️ No grievances to display, showing empty state');
            container.innerHTML = this.getEmptyState('grievances', 'No grievances yet', 'Member grievances and complaints will appear here');
            return;
        }

        console.log('✅ Rendering', this.grievances.length, 'grievances');
        container.innerHTML = this.grievances.map(grievance => {
            const ticketId = grievance.ticketId || grievance._id || grievance.id;
            const categoryIcons = {
                equipment: 'fa-dumbbell',
                cleanliness: 'fa-broom',
                staff: 'fa-user-tie',
                safety: 'fa-shield-alt',
                billing: 'fa-credit-card',
                facilities: 'fa-building',
                timing: 'fa-clock',
                complaint: 'fa-exclamation-circle',
                general: 'fa-comment',
                other: 'fa-question-circle'
            };
            
            return `
            <div class="grievance-item ${grievance.status === 'escalated' ? 'escalated' : ''}" data-grievance-id="${grievance._id || grievance.id}">
                <div class="grievance-header">
                    <div class="grievance-title-section">
                        <div class="category-icon ${grievance.category || 'other'}">
                            <i class="fas ${categoryIcons[grievance.category] || categoryIcons.other}"></i>
                        </div>
                        <div>
                            <h4 class="grievance-title">${grievance.subject || grievance.title || 'No subject'}</h4>
                            <span class="ticket-id">Ticket: ${ticketId}</span>
                        </div>
                    </div>
                    <div class="grievance-meta">
                        <span class="priority-badge ${grievance.priority || 'normal'}">${grievance.priority || 'normal'}</span>
                        <span class="grievance-status ${grievance.status || 'open'}">${grievance.status || 'open'}</span>
                    </div>
                </div>
                
                <p class="grievance-description">${grievance.description || 'No description'}</p>
                
                ${grievance.responses && grievance.responses.length > 0 ? `
                    <div class="grievance-responses">
                        <strong><i class="fas fa-reply"></i> ${grievance.responses.length} Response(s)</strong>
                    </div>
                ` : ''}
                
                <div class="grievance-footer">
                    <div class="grievance-details">
                        <span><i class="fas fa-user"></i> ${grievance.userName || grievance.member?.name || 'Anonymous'}</span>
                        <span><i class="fas fa-calendar"></i> ${this.formatDate(grievance.createdAt)}</span>
                        ${grievance.userPhone || grievance.contactNumber ? `<span><i class="fas fa-phone"></i> ${grievance.userPhone || grievance.contactNumber}</span>` : ''}
                        ${grievance.userEmail || grievance.email ? `<span><i class="fas fa-envelope"></i> ${grievance.userEmail || grievance.email}</span>` : ''}
                    </div>
                    
                    <div class="grievance-actions">
                        <button class="grievance-quick-reply-btn" data-grievance-id="${grievance._id || grievance.id}" title="Quick Reply">
                            <i class="fas fa-bolt"></i> Quick Reply
                        </button>
                        <button class="grievance-details-btn" data-grievance-id="${grievance._id || grievance.id}" title="View Details">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        <button class="grievance-chat-btn" data-grievance-id="${grievance._id || grievance.id}" title="Start Chat">
                            <i class="fas fa-comments"></i> Chat
                        </button>
                        ${(grievance.status === 'open' || grievance.status === 'in-progress') ? `
                            <button class="grievance-resolve-btn" data-grievance-id="${grievance._id || grievance.id}" title="Mark as Resolved">
                                <i class="fas fa-check"></i> Resolve
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');

        // Update grievance handler's data
        if (window.grievanceHandler) {
            window.grievanceHandler.updateGrievances(this.grievances);
            window.grievanceHandler.setGymId(this.currentGymId);
        }
    }

    async handleGrievanceActions(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const grievanceItem = button.closest('.grievance-item');
        const grievanceId = grievanceItem?.dataset.grievanceId;
        const action = button.dataset.action;
        const status = button.dataset.status;

        if (!grievanceId) return;

        switch (action) {
            case 'view-details':
                this.openGrievanceDetails(grievanceId);
                break;
            
            case 'escalate':
                this.openEscalationModal(grievanceId);
                break;
            
            case 'update-status':
                await this.updateGrievanceStatus(grievanceId, status);
                break;
        }
    }

    openEscalationModal(grievanceId) {
        const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
        if (!grievance) return;

        const modal = document.getElementById('escalationModal') || this.createEscalationModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');

        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas fa-arrow-up"></i> Escalate Grievance to Main Admin`;
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div class="escalation-form-container">
                    <div class="grievance-summary">
                        <h4>${grievance.title}</h4>
                        <p><strong>Current Status:</strong> ${grievance.status}</p>
                        <p><strong>Priority:</strong> ${grievance.priority}</p>
                        <p><strong>Description:</strong> ${grievance.description}</p>
                    </div>
                    
                    <form id="escalationForm" data-grievance-id="${grievanceId}">
                        <div class="form-group">
                            <label for="escalationReason">Reason for Escalation:</label>
                            <textarea id="escalationReason" name="escalationReason" required rows="3" 
                                placeholder="Explain why this grievance needs admin attention..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="escalationPriority">Escalation Priority:</label>
                            <select id="escalationPriority" name="escalationPriority" required>
                                <option value="medium">Medium - Standard escalation</option>
                                <option value="high">High - Urgent attention needed</option>
                                <option value="urgent">Urgent - Critical issue</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="requestCallback" checked>
                                <span class="checkmark"></span>
                                Request callback from main admin
                            </label>
                        </div>

                        <div class="escalation-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Escalating this grievance will notify the main admin team and may result in direct intervention. Please ensure you have attempted to resolve this issue at the gym level first.</p>
                        </div>
                        
                        <div class="support-modal-footer">
                            <button type="button" class="btn-secondary" onclick="supportManager.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary escalate">
                                <i class="fas fa-arrow-up"></i> Escalate to Admin
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        modal.classList.add('active');
    }

    createEscalationModal() {
        const modal = document.createElement('div');
        modal.id = 'escalationModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content large">
                <div class="support-modal-header">
                    <h3><i class="fas fa-arrow-up"></i> Escalate to Admin</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    renderCommunications() {
        const container = document.querySelector('#communicationsSection .communications-layout');
        if (!container) return;

        // Filter for chat messages only
        const chatMessages = this.communications.filter(comm => 
            comm.category === 'chat' || comm.metadata?.isChat
        );

        if (chatMessages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-comments"></i>
                        <h3>No Chat Messages Yet</h3>
                        <p>User chat messages will appear here when they contact your gym</p>
                    </div>
                </div>
            `;
            return;
        }

        // Sort by most recent message
        chatMessages.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        container.innerHTML = `
            <div class="chat-conversations-sidebar">
                <div class="conversations-header">
                    <h3><i class="fas fa-inbox"></i> Conversations</h3>
                    <span class="conversation-count">${chatMessages.length}</span>
                </div>
                <div class="conversations-list">
                    ${chatMessages.map(comm => {
                        const lastMessage = comm.messages && comm.messages.length > 0 
                            ? comm.messages[comm.messages.length - 1] 
                            : null;
                        const userAvatar = comm.metadata?.userProfileImage || '/uploads/profile-pics/default.png';
                        const userName = comm.userName || 'Unknown User';
                        const unreadCount = comm.messages?.filter(m => m.sender === 'user' && !m.read).length || 0;
                        
                        return `
                            <div class="conversation-card ${unreadCount > 0 ? 'has-unread' : ''}" 
                                 data-conversation-id="${comm._id}"
                                 onclick="supportManager.openChatConversation('${comm._id}')">
                                <div class="conversation-avatar">
                                    <img src="${this.BASE_URL}${userAvatar}" 
                                         alt="${userName}"
                                         onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'">
                                    ${unreadCount > 0 ? `<span class="avatar-badge">${unreadCount}</span>` : ''}
                                </div>
                                <div class="conversation-details">
                                    <div class="conversation-top">
                                        <h4 class="conversation-name">${userName}</h4>
                                        <span class="conversation-time">${this.formatTime(comm.updatedAt || comm.createdAt)}</span>
                                    </div>
                                    <div class="conversation-bottom">
                                        <p class="conversation-preview">${lastMessage ? lastMessage.message.substring(0, 50) + (lastMessage.message.length > 50 ? '...' : '') : 'Start conversation'}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="chat-conversation-area">
                <div class="chat-placeholder-content">
                    <i class="fas fa-comment-dots"></i>
                    <h3>Select a Conversation</h3>
                    <p>Choose a conversation from the sidebar to view and reply to messages</p>
                </div>
            </div>
        `;

        // Add enhanced CSS for new design
        this.addEnhancedChatStyles();
    }

    // Open chat conversation and display messages with reply interface
    async openChatConversation(conversationId) {
        
        // Set active chat ID for auto-refresh
        this.activeChatId = conversationId;
        
        const conversation = this.communications.find(c => c._id === conversationId);
        if (!conversation) {
            console.error('❌ Conversation not found');
            return;
        }

        const chatContainer = document.querySelector('.chat-conversation-area');
        if (!chatContainer) return;

        // Highlight selected conversation
        document.querySelectorAll('.conversation-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-conversation-id="${conversationId}"]`)?.classList.add('active');

    const userAvatar = conversation.metadata?.userProfileImage || '/uploads/profile-pics/default.png';
        const userName = conversation.userName || 'Unknown User';
        const userEmail = conversation.userEmail || '';
    // Resolve gym admin logo URL
    const gymLogoUrl = this.getGymLogoUrl();

        // Render chat interface
        chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-user">
                    <img src="${this.BASE_URL}${userAvatar}" 
                         alt="${userName}"
                         class="chat-user-avatar"
                         onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'">
                    <div class="chat-user-info">
                        <h3>${userName}</h3>
                        <p>${userEmail}</p>
                    </div>
                </div>
                <button class="chat-close-btn" onclick="supportManager.closeChatConversation()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                ${conversation.messages && conversation.messages.length > 0 
                    ? conversation.messages.map(msg => `
                        <div class="chat-message ${msg.sender === 'user' ? 'message-user' : 'message-admin'}">
                            <div class="message-avatar">
                          <img src="${msg.sender === 'user' ? (this.BASE_URL + (userAvatar.startsWith('/') ? userAvatar : '/' + userAvatar)) : gymLogoUrl}" 
                              alt="${msg.senderName || msg.sender}"
                              onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'">
                            </div>
                            <div class="message-content">
                                <div class="message-header">
                                    <span class="message-sender">${msg.senderName || (msg.sender === 'user' ? userName : 'You')}</span>
                                    <span class="message-time">${new Date(msg.timestamp).toLocaleString('en-IN', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        day: 'numeric',
                                        month: 'short'
                                    })}</span>
                                </div>
                                <div class="message-text">${msg.message}</div>
                            </div>
                        </div>
                    `).join('')
                    : '<div class="no-messages">No messages yet</div>'
                }
            </div>
            
            <div class="chat-input-area">
                <button class="chat-quick-msg-btn" onclick="supportManager.openQuickMessageModal('${conversationId}')" title="Quick Messages">
                    <i class="fas fa-bolt"></i>
                </button>
                <textarea 
                    id="chatReplyInput" 
                    placeholder="Type your message here..."
                    rows="3"
                ></textarea>
                <button class="chat-send-btn" onclick="supportManager.sendChatReply('${conversationId}')">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            </div>
        `;

        // Scroll to bottom of messages
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }

        // Mark messages as read
        await this.markChatMessagesAsRead(conversationId);
    }

    // Update only the active chat's messages without re-rendering the container
    refreshActiveChatMessages(conversationId, options = {}) {
        const conversation = this.communications.find(c => (c._id || c.id) === conversationId);
        const chatMessagesEl = document.getElementById('chatMessages');
        const replyInput = document.getElementById('chatReplyInput');
        if (!conversation || !chatMessagesEl) return;

        const userAvatar = conversation.metadata?.userProfileImage || '/uploads/profile-pics/default.png';
        const userName = conversation.userName || 'Unknown User';
        const gymLogoUrl = this.getGymLogoUrl();

        const preserveScrollTop = options.preserveScrollTop;
        const prevScrollTop = options.prevScrollTop || 0;

        const wasAtBottom = chatMessagesEl.scrollTop + chatMessagesEl.clientHeight >= chatMessagesEl.scrollHeight - 10;

        chatMessagesEl.innerHTML = (conversation.messages && conversation.messages.length > 0)
            ? conversation.messages.map(msg => `
                <div class="chat-message ${msg.sender === 'user' ? 'message-user' : 'message-admin'}">
                    <div class="message-avatar">
                    <img src="${msg.sender === 'user' ? (this.BASE_URL + (userAvatar.startsWith('/') ? userAvatar : '/' + userAvatar)) : gymLogoUrl}" 
                        alt="${msg.senderName || msg.sender}"
                        onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'">
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-sender">${msg.senderName || (msg.sender === 'user' ? userName : 'You')}</span>
                            <span class="message-time">${new Date(msg.timestamp).toLocaleString('en-IN', { 
                                hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
                            })}</span>
                        </div>
                        <div class="message-text">${msg.message}</div>
                    </div>
                </div>
            `).join('') : '<div class="no-messages">No messages yet</div>';

        // Restore scroll position intelligently
        if (preserveScrollTop) {
            chatMessagesEl.scrollTop = prevScrollTop;
        } else if (wasAtBottom) {
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        // Preserve focus in reply input if it existed
        if (replyInput && document.activeElement !== replyInput) {
            // do nothing; keep current focus
        }
    }

    closeChatConversation() {
        // Clear active chat ID
        this.activeChatId = null;
        
        const chatContainer = document.querySelector('.chat-conversation-area');
        if (chatContainer) {
            chatContainer.innerHTML = `
                <div class="chat-placeholder-content">
                    <i class="fas fa-comment-dots"></i>
                    <h3>Select a Conversation</h3>
                    <p>Choose a conversation from the sidebar to view and reply to messages</p>
                </div>
            `;
        }

        // Remove active state from conversations
        document.querySelectorAll('.conversation-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    async sendChatReply(conversationId) {
        const replyInput = document.getElementById('chatReplyInput');
        if (!replyInput) return;

        const message = replyInput.value.trim();
        if (!message) {
            alert('Please enter a message');
            return;
        }

        try {
            const token = this.getAuthToken();
            
            // Send reply via new gym chat API
            const response = await fetch(`${this.BASE_URL}/api/chat/gym/reply/${conversationId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (response.ok) {
                replyInput.value = '';
                
                // Reload communications to show new message
                await this.loadCommunications();
                await this.openChatConversation(conversationId);
                
                // Show success message
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Reply sent successfully', 'success');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send reply');
            }
        } catch (error) {
            console.error('❌ Error sending reply:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(error.message || 'Failed to send reply', 'error');
            } else {
                alert(error.message || 'Failed to send reply');
            }
        }
    }

    async markChatMessagesAsRead(conversationId) {
        // Mark all user messages as read in this conversation
        const conversation = this.communications.find(c => c._id === conversationId);
        if (!conversation) return;

        conversation.messages?.forEach(msg => {
            if (msg.sender === 'user') {
                msg.read = true;
            }
        });

        // Update stats
        this.updateCommunicationStats();
        this.updateStats();
    }

    addChatStyles() {
        // Legacy method - now calls addEnhancedChatStyles
        this.addEnhancedChatStyles();
    }

    addEnhancedChatStyles() {
        // Add custom styles for chat interface if not already added
        if (document.getElementById('enhancedChatInterfaceStyles')) return;

        const style = document.createElement('style');
        style.id = 'enhancedChatInterfaceStyles';
        style.textContent = `
            /* Communications Layout */
            .communications-layout {
                display: grid;
                grid-template-columns: 380px 1fr;
                height: calc(100vh - 250px);
                min-height: 600px;
                background: #fff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            }

            /* Empty State */
            .chat-empty-state {
                grid-column: 1 / -1;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
            }

            .empty-state-content {
                text-align: center;
                color: #64748b;
            }

            .empty-state-content i {
                font-size: 64px;
                color: #cbd5e1;
                margin-bottom: 20px;
            }

            .empty-state-content h3 {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 8px;
                color: #475569;
            }

            .empty-state-content p {
                font-size: 14px;
                color: #94a3b8;
            }

            /* Conversations Sidebar */
            .chat-conversations-sidebar {
                background: #f8fafc;
                border-right: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .conversations-header {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
                background: #fff;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .conversations-header h3 {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 0;
            }

            .conversations-header i {
                color: #3b82f6;
            }

            .conversation-count {
                background: #3b82f6;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
            }

            .conversations-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }

            /* Conversation Card */
            .conversation-card {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px;
                background: white;
                border-radius: 10px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid transparent;
            }

            .conversation-card:hover {
                background: #f1f5f9;
                transform: translateX(4px);
            }

            .conversation-card.active {
                background: #eff6ff;
                border-color: #3b82f6;
            }

            .conversation-card.has-unread {
                background: #fef3c7;
            }

            .conversation-card.has-unread:hover {
                background: #fef08a;
            }

            .conversation-avatar {
                position: relative;
                flex-shrink: 0;
            }

            .conversation-avatar img {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #e2e8f0;
            }

            .avatar-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }

            .conversation-details {
                flex: 1;
                min-width: 0;
            }

            .conversation-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }

            .conversation-name {
                font-size: 15px;
                font-weight: 600;
                color: #1e293b;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .conversation-time {
                font-size: 12px;
                color: #94a3b8;
                flex-shrink: 0;
                margin-left: 8px;
            }

            .conversation-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .conversation-preview {
                font-size: 13px;
                color: #64748b;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
            }

            .unread-indicator {
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                flex-shrink: 0;
                margin-left: 8px;
            }

            /* Chat Conversation Area */
            .chat-conversation-area {
                display: flex;
                flex-direction: column;
                background: white;
                overflow: hidden;
            }

            .chat-placeholder-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
            }

            .chat-placeholder-content i {
                font-size: 64px;
                color: #cbd5e1;
                margin-bottom: 20px;
            }

            .chat-placeholder-content h3 {
                font-size: 20px;
                font-weight: 600;
                color: #475569;
                margin-bottom: 8px;
            }

            .chat-placeholder-content p {
                font-size: 14px;
                color: #94a3b8;
            }

            /* Chat Header */
            .chat-header {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
                background: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .chat-header-user {
                display: flex;
                align-items: center;
                gap: 14px;
            }

            .chat-user-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #e2e8f0;
            }

            .chat-user-info h3 {
                font-size: 17px;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 4px 0;
            }

            .chat-user-info p {
                font-size: 13px;
                color: #64748b;
                margin: 0;
            }

            .chat-close-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: none;
                background: #f1f5f9;
                color: #64748b;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .chat-close-btn:hover {
                background: #fee2e2;
                color: #ef4444;
            }

            /* Chat Messages */
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
                background: #f8fafc;
            }

            .chat-message {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                animation: messageSlideIn 0.3s ease;
            }

            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .message-admin {
                flex-direction: row-reverse;
            }

            .message-avatar {
                flex-shrink: 0;
            }

            .message-avatar img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .message-content {
                max-width: 65%;
            }

            .message-admin .message-content {
                text-align: right;
            }

            .message-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
                font-size: 12px;
            }

            .message-admin .message-header {
                justify-content: flex-end;
            }

            .message-sender {
                font-weight: 600;
                color: #475569;
            }

            .message-time {
                color: #94a3b8;
            }

            .message-text {
                background: white;
                padding: 12px 16px;
                border-radius: 12px;
                color: #1e293b;
                line-height: 1.5;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                word-wrap: break-word;
            }

            .message-admin .message-text {
                background: #3b82f6;
                color: white;
            }

            .no-messages {
                text-align: center;
                color: #94a3b8;
                padding: 40px;
                font-size: 14px;
            }

            /* Chat Input Area */
            .chat-input-area {
                padding: 20px;
                border-top: 1px solid #e2e8f0;
                background: white;
                display: flex;
                gap: 12px;
                align-items: flex-end;
            }

            #chatReplyInput {
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 14px;
                font-family: inherit;
                resize: none;
                transition: all 0.2s;
            }

            #chatReplyInput:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .chat-send-btn {
                padding: 12px 24px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
                height: fit-content;
            }

            .chat-send-btn:hover {
                background: #2563eb;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            .chat-send-btn:active {
                transform: translateY(0);
            }

            /* Quick Message Button */
            .chat-quick-msg-btn {
                padding: 12px 16px;
                background: #f59e0b;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
                height: fit-content;
                min-width: 48px;
            }

            .chat-quick-msg-btn:hover {
                background: #d97706;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }

            .chat-quick-msg-btn:active {
                transform: translateY(0);
            }

            .chat-quick-msg-btn i {
                font-size: 16px;
            }

            /* Responsive Design */
            @media (max-width: 968px) {
                .communications-layout {
                    grid-template-columns: 1fr;
                }

                .chat-conversations-sidebar {
                    display: none;
                }

                .chat-conversation-area {
                    display: flex !important;
                }
            }

            /* Scrollbar Styling */
            .conversations-list::-webkit-scrollbar,
            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .conversations-list::-webkit-scrollbar-track,
            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }

            .conversations-list::-webkit-scrollbar-thumb,
            .chat-messages::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 10px;
            }

            .conversations-list::-webkit-scrollbar-thumb:hover,
            .chat-messages::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Modal Functions - Enhanced with consistent styling
    openSendNotificationModal() {
        this.openModal('sendNotificationModal');
    }

    openRaiseGrievanceModal() {
        this.openModal('raiseGrievanceModal');
    }

    openStartCommunicationModal() {
        this.openModal('startCommunicationModal');
    }

    openReplyModal(reviewId) {
        const modal = document.getElementById('reviewReplyModal');
        const review = this.reviews.find(r => (r._id || r.id) === reviewId);
        
        if (review && modal) {
            // Populate review details in modal
            const reviewDetails = modal.querySelector('.review-details, #reviewDetailsDisplay');
            if (reviewDetails) {
                reviewDetails.innerHTML = `
                    <div class="review-header">
                        <div class="review-user">
                            <img src="${this.getUserImage(review)}" 
                                 alt="Member" 
                                 class="review-avatar"
                                 onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'; this.style.border='2px solid #ccc';">
                            <div class="review-user-info">
                                <h4>${this.getUserName(review)}</h4>
                                <div class="review-rating">${this.renderStars(review.rating)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="review-content">${review.comment}</div>
                `;
            }
            
            const replyForm = modal.querySelector('#replyForm, form');
            const replyTextarea = modal.querySelector('#adminReplyText, textarea[name="reply"]');
            
            if (replyForm) {
                replyForm.dataset.reviewId = reviewId;
            }
            
            if (replyTextarea) {
                replyTextarea.value = '';
                replyTextarea.placeholder = 'Write your professional reply to this review...';
            }
            
            // Use enhanced modal opening
            this.openModal('reviewReplyModal');
        }
    }

    openGrievanceDetails(grievanceId) {
        const modal = document.getElementById('grievanceDetailsModal');
        const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
        
        if (grievance && modal) {
            const modalHeader = modal.querySelector('.support-modal-header h3');
            const modalBody = modal.querySelector('.support-modal-body');
            
            if (modalHeader) {
                modalHeader.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${grievance.title}`;
            }
            
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="grievance-details">
                        <div class="detail-row">
                            <label>Status:</label>
                            <span class="grievance-status ${grievance.status}">${grievance.status}</span>
                        </div>
                        <div class="detail-row">
                            <label>Priority:</label>
                            <span class="grievance-priority ${grievance.priority}">${grievance.priority}</span>
                        </div>
                        <div class="detail-row">
                            <label>Submitted by:</label>
                            <span>${grievance.member?.name || 'Anonymous'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Date:</label>
                            <span>${this.formatDate(grievance.createdAt)}</span>
                        </div>
                        <div class="detail-section">
                            <label>Description:</label>
                            <p>${grievance.description}</p>
                        </div>
                        ${grievance.evidence ? `
                            <div class="detail-section">
                                <label>Evidence:</label>
                                <div class="evidence-files">
                                    ${grievance.evidence.map(file => `<a href="${file.url}" target="_blank">${file.name}</a>`).join(', ')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="grievance-actions" style="margin-top: 24px;">
                        <button class="btn-primary" onclick="supportManager.updateGrievanceStatus('${grievanceId}', 'in-progress')">
                            <i class="fas fa-play"></i> Start Processing
                        </button>
                        <button class="btn-primary" onclick="supportManager.updateGrievanceStatus('${grievanceId}', 'resolved')">
                            <i class="fas fa-check"></i> Mark Resolved
                        </button>
                        <button class="btn-secondary" onclick="supportManager.respondToGrievance('${grievanceId}')">
                            <i class="fas fa-reply"></i> Respond
                        </button>
                    </div>
                `;
            }
            modal.classList.add('active');
        }
    }

    closeModal() {
        // Close all support modals with smooth transition
        document.querySelectorAll('.support-modal, .modal').forEach(modal => {
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
                // Add fade-out effect
                modal.style.transition = 'all 0.3s ease';
                modal.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.style.opacity = '';
                    modal.style.transform = '';
                }, 300);
            }
        });
    }

    // Enhanced modal opening with consistent styling
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            modal.classList.add('active');
            
            // Force reflow and add smooth entrance
            requestAnimationFrame(() => {
                modal.style.transition = 'all 0.3s ease';
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
            
            // Ensure modal content is properly styled
            const modalContent = modal.querySelector('.support-modal-content, .modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
            }
        }
    }

    // Form Handlers
    async handleSendNotification(form) {
        const formData = new FormData(form);
        const notificationData = {
            title: formData.get('title'),
            message: formData.get('message'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            targetType: formData.get('targetType'),
            recipients: formData.get('recipients')?.split(',').map(r => r.trim()) || []
        };

        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            
            // Check if this is for main admin
            if (notificationData.targetType === 'admin' || notificationData.targetType === 'main-admin') {
                const gymProfile = window.currentGymProfile || this.gymProfile || {};
                
                // Send to main admin notification system
                const response = await fetch(`${this.BASE_URL}/api/admin/notifications/send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: notificationData.title,
                        message: notificationData.message,
                        type: notificationData.type || 'gym-admin-message',
                        priority: notificationData.priority || 'medium',
                        icon: this.getNotificationIcon(notificationData.type, notificationData.priority),
                        color: this.getNotificationColor(notificationData.type, notificationData.priority),
                        metadata: {
                            source: 'gym-admin',
                            timestamp: new Date().toISOString(),
                            originalType: notificationData.type
                        },
                        gym: {
                            gymId: gymProfile._id || gymProfile.gymId || this.currentGymId,
                            gymName: gymProfile.gymName || 'Unknown Gym',
                            address: gymProfile.address || '',
                            email: gymProfile.email || '',
                            phone: gymProfile.phone || ''
                        }
                    })
                });

                if (response.ok) {
                    this.showSuccessMessage('Notification sent to main admin successfully!');
                } else {
                    throw new Error('Failed to send notification to main admin');
                }
            } else {
                // Send to gym members/trainers (existing logic)
                this.showSuccessMessage('Notification sent successfully!');
            }
            
            this.closeModal();
            form.reset();
            
            // Refresh notifications
            await this.loadNotifications();
            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error('Error sending notification:', error);
            this.showErrorMessage('Failed to send notification. Please try again.');
        }
    }

    async handleRaiseGrievance(form) {
        const formData = new FormData(form);
        const grievanceData = {
            title: formData.get('title'),
            subject: formData.get('title'), // Ensure both title and subject are set
            description: formData.get('description'),
            category: 'complaint', // Always set as complaint for grievances
            priority: formData.get('priority') || 'medium',
            affectedMembers: formData.get('affectedMembers')?.split(',').map(m => m.trim()) || [],
            metadata: {
                gymId: this.currentGymId,
                gymName: this.gymProfile?.name || this.gymProfile?.gymName || 'Unknown Gym',
                submittedBy: 'gym-admin',
                escalationLevel: 'gym-initiated',
                requiresAdminReview: true
            }
        };

        try {
            
            // Use integrated support system if available
            if (window.enhancedSupportIntegration) {
                const ticket = await window.enhancedSupportIntegration.createSupportTicket(grievanceData);
                if (ticket) {
                    this.showSuccessMessage('Grievance raised and sent to main admin successfully!');
                    
                    // Add to local grievances list
                    this.grievances.unshift({
                        _id: ticket.ticketId,
                        id: ticket.ticketId,
                        title: grievanceData.title,
                        description: grievanceData.description,
                        priority: grievanceData.priority,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        member: { name: 'Gym Admin' },
                        metadata: grievanceData.metadata
                    });
                    
                    this.closeModal();
                    form.reset();
                    this.renderGrievances();
                    this.updateStats();
                    return { success: true, grievanceData, ticket };
                }
            }
            
            // Try enhanced gym communication API first
            const token = this.getAuthToken();
            try {
                const response = await fetch(`${this.BASE_URL}/api/gym/communication/support/create`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(grievanceData)
                });

                if (response.ok) {
                    const result = await response.json();
                    this.showSuccessMessage('Grievance raised and sent to main admin successfully!');
                    
                    // Add to local grievances list
                    this.grievances.unshift({
                        _id: result.supportTicket?.ticketId,
                        id: result.supportTicket?.ticketId,
                        title: grievanceData.title,
                        description: grievanceData.description,
                        priority: grievanceData.priority,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        member: { name: 'Gym Admin' },
                        metadata: grievanceData.metadata
                    });
                    
                    this.closeModal();
                    form.reset();
                    this.renderGrievances();
                    this.updateStats();
                    return { success: true, result };
                } else {
                    console.warn('⚠️ Gym communication API failed, trying fallback');
                }
            } catch (commError) {
                console.warn('⚠️ Gym communication API error, trying fallback:', commError.message);
            }
            
            // Fallback to direct support API
            const response = await fetch(`${this.BASE_URL}/api/support/tickets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...grievanceData,
                    userType: 'Gym',
                    userId: this.currentGymId,
                    source: 'gym-admin-portal'
                })
            });

            if (response.ok) {
                const ticket = await response.json();
                this.showSuccessMessage('Grievance raised successfully!');
                
                // Add to local grievances list
                this.grievances.unshift({
                    _id: ticket.ticketId || ticket._id,
                    id: ticket.ticketId || ticket._id,
                    title: grievanceData.title,
                    description: grievanceData.description,
                    priority: grievanceData.priority,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    member: { name: 'Gym Admin' },
                    metadata: grievanceData.metadata
                });
                
                this.closeModal();
                form.reset();
                this.renderGrievances();
                this.updateStats();
                return { success: true, grievanceData, ticket };
            } else {
                throw new Error('Failed to create grievance');
            }
            
        } catch (error) {
            console.error('Error raising grievance:', error);
            this.showErrorMessage('Failed to raise grievance. Please try again.');
            return { success: false, error: error.message };
        }
    }

    // Enhanced grievance management with escalation
    async escalateGrievanceToAdmin(grievanceId, reason, priority = 'high') {
        try {
            if (window.enhancedSupportIntegration) {
                const success = await window.enhancedSupportIntegration.escalateTicket(grievanceId, reason, priority);
                if (success) {
                    const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
                    if (grievance) {
                        grievance.status = 'escalated';
                        grievance.priority = priority;
                        grievance.escalatedAt = new Date().toISOString();
                        grievance.escalationReason = reason;
                    }
                    
                    this.showSuccessMessage('Grievance escalated to main admin successfully!');
                    this.renderGrievances();
                    this.updateStats();
                    return true;
                }
            }
            
            // Fallback escalation
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/support/tickets/${grievanceId}/escalate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: reason,
                    priority: priority,
                    escalateTo: 'main-admin'
                })
            });

            if (response.ok) {
                await response.json(); // data not currently used; discard to avoid unused variable
                const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
                if (grievance) {
                    grievance.status = 'escalated';
                    grievance.priority = priority;
                    grievance.escalatedAt = new Date().toISOString();
                    grievance.escalationReason = reason;
                }
                
                this.showSuccessMessage('Grievance escalated successfully!');
                this.renderGrievances();
                this.updateStats();
                return true;
            }
        } catch (error) {
            console.error('Error escalating grievance:', error);
            this.showErrorMessage('Failed to escalate grievance. Please try again.');
        }
        return false;
    }

    async handleReplySubmission(form) {
        const formData = new FormData(form);
        const reviewId = form.dataset.reviewId;
        const replyData = {
            message: formData.get('message'),
            isPublic: formData.get('isPublic') === 'on'
        };

        try {
            // API call would go here
            
            // Mock success - update the review with reply
            const review = this.reviews.find(r => (r._id || r.id) === reviewId);
            if (review) {
                review.adminReply = replyData.message;
            }
            
            this.showSuccessMessage('Reply sent successfully!');
            this.closeModal();
            form.reset();
            
            // Refresh reviews
            this.renderReviews();
            this.updateStats();
            
        } catch (error) {
            console.error('Error sending reply:', error);
            this.showErrorMessage('Failed to send reply. Please try again.');
        }
    }

    async handleNotificationAction(action, notificationId) {
        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            if (!notification) return;

            switch (action) {
                case 'mark-read': {
                    const resp = await fetch(`${this.BASE_URL}/api/gym/notifications/${notificationId}/read`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (resp.ok) {
                        notification.read = true;
                        this.showSuccessMessage('Notification marked as read');
                    } else {
                        this.showErrorMessage('Failed to mark notification as read');
                    }
                    break;
                }
                    
                case 'reply': {
                    this.openNotificationReplyModal(notificationId);
                    return; // Don't re-render yet
                }
                    
                case 'respond': {
                    this.openNotificationResponseModal(notificationId);
                    return; // Don't re-render yet
                }
                    
                case 'view-details': {
                    this.openNotificationDetailsModal(notificationId);
                    return; // Don't re-render yet
                }
            }

            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error(`Error ${action} notification:`, error);
            this.showErrorMessage(`Failed to ${action} notification`);
        }
    }

    // Removed duplicate handleReplySubmission implementation (merged earlier version)

    async updateGrievanceStatus(grievanceId, newStatus) {
        try {
            const grievance = this.grievances.find(g => (g._id || g.id) === grievanceId);
            if (grievance) {
                grievance.status = newStatus;
                // API call would go here for grievance status update
                
                this.showSuccessMessage(`Grievance ${newStatus} successfully!`);
                this.closeModal();
                this.renderGrievances();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error updating grievance status:', error);
        }
    }

    // Search and Filter
    handleSearch(query, tabName) {
        // Implement search functionality based on current tab
    }

    handleFilter(filterValue, tabName) {
        // Implement filter functionality based on current tab
    }

    async handleNotificationReplySubmission(form) {
        const formData = new FormData(form);
        const notificationId = form.dataset.notificationId;
        const replyData = {
            message: formData.get('replyMessage'),
            priority: formData.get('replyPriority'),
            status: formData.get('replyStatus'),
            notifyMember: formData.get('notifyMember') === 'on'
        };

        try {
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            
            if (notification?.metadata?.ticketId) {
                // Send reply to the ticket system
                const response = await fetch(`${this.BASE_URL}/api/support/tickets/${notification.metadata.ticketId}/reply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: replyData.message,
                        priority: replyData.priority,
                        status: replyData.status,
                        source: 'gym-admin',
                        notifyMember: replyData.notifyMember
                    })
                });

                if (response.ok) {
                    this.showSuccessMessage('Reply sent successfully!');
                    // Mark notification as read
                    notification.read = true;
                } else {
                    throw new Error('Failed to submit reply');
                }
            } else {
                // Send reply to main admin notification system using dedicated endpoint
                const gymProfile = window.currentGymProfile || this.gymProfile || {};
                
                const adminReplyResponse = await fetch(`${this.BASE_URL}/api/admin/notifications/reply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        originalNotificationId: notificationId,
                        replyMessage: replyData.message,
                        priority: replyData.priority || 'medium',
                        status: replyData.status || 'replied',
                        gym: {
                            gymId: gymProfile._id || gymProfile.gymId || this.currentGymId,
                            gymName: gymProfile.gymName || 'Unknown Gym',
                            address: gymProfile.address || '',
                            email: gymProfile.email || '',
                            phone: gymProfile.phone || ''
                        }
                    })
                });

                if (adminReplyResponse.ok) {
                    const result = await adminReplyResponse.json();
                    this.showSuccessMessage('Reply sent to main admin successfully!');
                    notification.read = true;
                } else {
                    const error = await adminReplyResponse.json();
                    throw new Error(error.message || 'Failed to send reply to main admin');
                }
            }
            
            this.closeModal();
            form.reset();
            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error('Error sending notification reply:', error);
            this.showErrorMessage('Failed to send reply. Please try again.');
        }
    }

    openNotificationDetailsModal(notificationId) {
        const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
        if (!notification) {
            console.warn('Notification not found:', notificationId);
            return;
        }

        const modal = document.getElementById('notificationDetailsModal') || this.createNotificationDetailsModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');
        
        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas ${this.getNotificationIcon(notification.type, notification.priority)}"></i> ${notification.title}`;
        }
        
        if (modalBody) {
            const hasMetadata = notification.metadata && Object.keys(notification.metadata).length > 0;
            const hasTicketId = notification.metadata?.ticketId;
            const hasAdminMessage = notification.metadata?.adminMessage;
            
            modalBody.innerHTML = `
                <div class="notification-details" style="padding: 20px;">
                    <div class="detail-grid" style="display: grid; grid-template-columns: 140px 1fr; gap: 16px; margin-bottom: 24px;">
                        <div class="detail-row" style="display: contents;">
                            <label style="font-weight: 600; color: #64748b;">Type:</label>
                            <span class="notification-badge ${notification.type}" style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">${notification.type}</span>
                        </div>
                        <div class="detail-row" style="display: contents;">
                            <label style="font-weight: 600; color: #64748b;">Priority:</label>
                            <span class="notification-priority priority-${notification.priority}" style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; text-transform: uppercase;">${notification.priority}</span>
                        </div>
                        <div class="detail-row" style="display: contents;">
                            <label style="font-weight: 600; color: #64748b;">Status:</label>
                            <span class="notification-status ${notification.read ? 'read' : 'unread'}" style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px;">${notification.read ? '✓ Read' : '● Unread'}</span>
                        </div>
                        <div class="detail-row" style="display: contents;">
                            <label style="font-weight: 600; color: #64748b;">Created:</label>
                            <span style="color: #334155;">${this.formatDate(notification.createdAt)}</span>
                        </div>
                        ${hasTicketId ? `
                        <div class="detail-row" style="display: contents;">
                            <label style="font-weight: 600; color: #64748b;">Ticket ID:</label>
                            <span style="color: var(--primary); font-weight: 500;">#${notification.metadata.ticketId}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="notification-message-section" style="margin-bottom: 24px;">
                        <h4 style="color: #1e293b; margin-bottom: 12px; font-size: 16px;">Message</h4>
                        <div class="notification-message-content" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary); color: #334155; line-height: 1.6;">
                            ${notification.message}
                        </div>
                    </div>
                    
                    ${hasAdminMessage ? `
                    <div class="admin-message-section" style="margin-bottom: 24px;">
                        <h4 style="color: #dc2626; margin-bottom: 12px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-user-shield"></i> Admin Message
                        </h4>
                        <div class="admin-message-content" style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; color: #7f1d1d; line-height: 1.6;">
                            ${notification.metadata.adminMessage}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasMetadata ? `
                    <div class="metadata-section" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                        <h4 style="color: #64748b; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Additional Information</h4>
                        <div class="metadata-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                            ${Object.entries(notification.metadata)
                                .filter(([key]) => !['adminMessage', 'ticketId'].includes(key))
                                .map(([key, value]) => `
                                    <div class="metadata-item" style="background: #f1f5f9; padding: 12px; border-radius: 6px;">
                                        <div style="font-size: 12px; color: #64748b; text-transform: capitalize; margin-bottom: 4px;">${key.replace(/_/g, ' ')}</div>
                                        <div style="font-size: 14px; color: #1e293b; font-weight: 500;">${typeof value === 'object' ? JSON.stringify(value) : value}</div>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="notification-actions-section" style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
                        ${!notification.read ? `
                            <button onclick="window.supportManager.handleNotificationAction('mark-read', '${notification._id || notification.id}')" 
                                    class="btn btn-primary" 
                                    style="padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-check"></i> Mark as Read
                            </button>
                        ` : ''}
                        ${this.canReplyToNotification(notification) ? `
                            <button onclick="window.supportManager.openNotificationReplyModal('${notification._id || notification.id}')" 
                                    class="btn btn-secondary" 
                                    style="padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-reply"></i> Reply
                            </button>
                        ` : ''}
                        ${notification.priority === 'high' || notification.priority === 'urgent' ? `
                            <button onclick="window.supportManager.openNotificationResponseModal('${notification._id || notification.id}')" 
                                    class="btn btn-warning" 
                                    style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-triangle"></i> Respond Urgently
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        modal.style.display = 'flex';
        
        // Mark as read after viewing (auto-read)
        if (!notification.read) {
            setTimeout(() => {
                this.handleNotificationAction('mark-read', notification._id || notification.id);
            }, 2000);
        }
    }

    openNotificationResponseModal(notificationId) {
        const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
        if (!notification) return;

        const modal = document.getElementById('notificationResponseModal') || this.createNotificationResponseModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');
        
        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Urgent Response Required`;
        }
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="urgent-notification-response">
                    <div class="urgent-alert">
                        <i class="fas fa-fire"></i>
                        <span>This notification requires immediate attention</span>
                    </div>
                    <div class="notification-summary">
                        <h4>${notification.title}</h4>
                        <p>${notification.message}</p>
                    </div>
                    <form id="urgentResponseForm" data-notification-id="${notificationId}">
                        <div class="form-group">
                            <label for="urgentAction">Immediate Action:</label>
                            <select id="urgentAction" name="urgentAction" required>
                                <option value="">Select action...</option>
                                <option value="escalate">Escalate to Management</option>
                                <option value="investigate">Start Investigation</option>
                                <option value="contact-member">Contact Member Directly</option>
                                <option value="system-check">Perform System Check</option>
                                <option value="emergency-response">Emergency Response</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="urgentNotes">Action Notes:</label>
                            <textarea id="urgentNotes" name="urgentNotes" required rows="3" 
                                placeholder="Describe the actions you are taking..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="followUpTime">Follow-up Required:</label>
                            <select id="followUpTime" name="followUpTime">
                                <option value="15-minutes">15 minutes</option>
                                <option value="1-hour">1 hour</option>
                                <option value="4-hours">4 hours</option>
                                <option value="24-hours">24 hours</option>
                            </select>
                        </div>
                        <div class="support-modal-footer">
                            <button type="button" class="btn-secondary" onclick="supportManager.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary urgent">
                                <i class="fas fa-bolt"></i> Take Action
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    createNotificationDetailsModal() {
        const modal = document.createElement('div');
        modal.id = 'notificationDetailsModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content">
                <div class="support-modal-header">
                    <h3><i class="fas fa-bell"></i> Notification Details</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    createNotificationResponseModal() {
        const modal = document.createElement('div');
        modal.id = 'notificationResponseModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content">
                <div class="support-modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Urgent Response</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    async handleUrgentResponseSubmission(form) {
        const formData = new FormData(form);
        const notificationId = form.dataset.notificationId;
        const responseData = {
            action: formData.get('urgentAction'),
            notes: formData.get('urgentNotes'),
            followUpTime: formData.get('followUpTime')
        };

        try {
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            
          
            
            // Mark notification as read and add response metadata
            if (notification) {
                notification.read = true;
                notification.urgentResponse = {
                    action: responseData.action,
                    notes: responseData.notes,
                    followUpTime: responseData.followUpTime,
                    timestamp: new Date().toISOString()
                };
            }
            
            this.showSuccessMessage(`Urgent action "${responseData.action}" has been logged successfully!`);
            this.closeModal();
            form.reset();
            this.renderNotifications();
            this.updateStats();
            
        } catch (error) {
            console.error('Error handling urgent response:', error);
            this.showErrorMessage('Failed to log urgent response. Please try again.');
        }
    }

    // Utility Functions
    getNotificationIcon(type, priority) {
        const iconMap = {
            'system-alert': priority === 'urgent' ? 'fa-exclamation-triangle' : 'fa-cog',
            'grievance-reply': 'fa-reply',
            'support-reply': 'fa-headset',
            'general': 'fa-bell',
            'emergency': 'fa-fire',
            'maintenance': 'fa-tools',
            'update': 'fa-sync-alt',
            'billing': 'fa-credit-card',
            'security': 'fa-shield-alt',
            'gym-admin-message': 'fa-comment',
            'gym-admin-reply': 'fa-reply'
        };
        return iconMap[type] || 'fa-bell';
    }

    getNotificationColor(type, priority) {
        const colorMap = {
            'urgent': '#ef4444',
            'high': '#f59e0b',
            'medium': '#1976d2',
            'low': '#10b981',
            'system-alert': priority === 'urgent' ? '#ef4444' : '#f59e0b',
            'grievance-reply': '#8b5cf6',
            'support-reply': '#06b6d4',
            'emergency': '#dc2626',
            'maintenance': '#f59e0b',
            'security': '#ef4444',
            'gym-admin-message': '#1976d2',
            'gym-admin-reply': '#1976d2'
        };
        return colorMap[type] || colorMap[priority] || '#1976d2';
    }

    // Resolve a fully-qualified gym logo URL for admin messages/avatars
    getGymLogoUrl() {
        try {
            let logo = this.gymProfile?.logoUrl || this.gymProfile?.logo || '/uploads/gym-logos/default.png';
            if (typeof logo !== 'string') logo = '/uploads/gym-logos/default.png';
            if (logo.startsWith('http')) return logo;
            return `${this.BASE_URL}${logo.startsWith('/') ? logo : '/' + logo}`;
        } catch {
            return `${this.BASE_URL}/uploads/gym-logos/default.png`;
        }
    }

    canReplyToNotification(notification) {
        const replyableTypes = ['grievance-reply', 'support-reply', 'system-alert', 'emergency', 'general'];
        const isReplyable = replyableTypes.includes(notification.type) || notification.metadata?.ticketId;
        return isReplyable;
    }

    openNotificationReplyModal(notificationId) {
        const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
        if (!notification) return;

        const modal = document.getElementById('notificationReplyModal') || this.createNotificationReplyModal();
        const modalHeader = modal.querySelector('.support-modal-header h3');
        const modalBody = modal.querySelector('.support-modal-body');
        
        if (modalHeader) {
            modalHeader.innerHTML = `<i class="fas fa-reply"></i> Reply to: ${notification.title}`;
        }
        
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="notification-reply-details">
                    <div class="original-notification">
                        <h4>Original Notification:</h4>
                        <div class="notification-content">
                            <p><strong>Type:</strong> ${notification.type}</p>
                            <p><strong>Priority:</strong> ${notification.priority}</p>
                            <p><strong>Message:</strong> ${notification.message}</p>
                            ${notification.metadata?.ticketId ? `<p><strong>Ticket ID:</strong> ${notification.metadata.ticketId}</p>` : ''}
                        </div>
                    </div>
                    <form id="notificationReplyForm" data-notification-id="${notificationId}">
                        <div class="form-group">
                            <label for="replyMessage">Your Reply:</label>
                            <textarea id="replyMessage" name="replyMessage" required rows="4" 
                                placeholder="Type your reply message here..."></textarea>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="notifyMember" checked>
                                <span class="checkmark"></span>
                                Notify the member about this reply
                            </label>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="replyPriority">Reply Priority:</label>
                                <select id="replyPriority" name="replyPriority">
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="replyStatus">Update Status:</label>
                                <select id="replyStatus" name="replyStatus">
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>
                        <div class="support-modal-footer">
                            <button type="button" class="btn-secondary" onclick="supportManager.closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-paper-plane"></i> Send Reply
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    createNotificationReplyModal() {
        const modal = document.createElement('div');
        modal.id = 'notificationReplyModal';
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content large">
                <div class="support-modal-header">
                    <h3><i class="fas fa-reply"></i> Reply to Notification</h3>
                    <button class="support-modal-close">&times;</button>
                </div>
                <div class="support-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
        }
        return stars;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) return 'Now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
        return date.toLocaleDateString();
    }

    getEmptyState(type, title, description) {
        const icons = {
            notifications: 'bell-slash',
            reviews: 'star',
            grievances: 'exclamation-triangle',
            communications: 'comments'
        };
        
        return `
            <div class="empty-state">
                <i class="fas fa-${icons[type]}"></i>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;
    }

    showSuccessMessage(message) {
        // Implementation for success notifications
        
        // Create a visual notification
        const container = document.createElement('div');
        container.className = 'support-message success';
        container.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #28a745; color: white; padding: 12px 16px;
            border-radius: 8px; display: flex; align-items: center; gap: 8px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        `;
        document.body.appendChild(container);
        
        setTimeout(() => {
            container.remove();
        }, 4000);
    }

    showErrorMessage(message) {
        // Implementation for error notifications
        // You could integrate with existing notification system
        
        // Create a visual notification
        const container = document.createElement('div');
        container.className = 'support-message error';
        container.innerHTML = `
            <i class="fas fa-times-circle"></i>
            <span>${message}</span>
        `;
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #dc3545; color: white; padding: 12px 16px;
            border-radius: 8px; display: flex; align-items: center; gap: 8px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        `;
        document.body.appendChild(container);
        
        setTimeout(() => {
            container.remove();
        }, 4000);
    }

    // Helper functions for user data handling
    getUserImage(review) {
        try {
            // Primary: Check user field (populated from backend) - similar to index.html pattern
            if (review.user && review.user.profileImage) {
                // Handle different URL formats like in script.js
                if (review.user.profileImage.startsWith('http')) {
                    return review.user.profileImage;
                } else {
                    // Ensure proper BASE_URL prefix
                    return `${this.BASE_URL}${review.user.profileImage}`;
                }
            }
            
            // Fallback: Check userId field if user is not populated (legacy support)
            if (review.userId && review.userId.profileImage) {
                if (review.userId.profileImage.startsWith('http')) {
                    return review.userId.profileImage;
                } else {
                    return `${this.BASE_URL}${review.userId.profileImage}`;
                }
            }
            
            // Default fallback
            return `${this.BASE_URL}/uploads/profile-pics/default.png`;
        } catch (error) {
            console.error('Error getting user image:', error);
            return `${this.BASE_URL}/uploads/profile-pics/default.png`;
        }
    }

    getUserName(review) {
        try {
            // Primary: Check user field (populated from backend) - similar to frontend pattern
            if (review.user) {
                // Combine first and last name if available
                if (review.user.firstName || review.user.lastName) {
                    const firstName = review.user.firstName || '';
                    const lastName = review.user.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (fullName) return fullName;
                }
                // Fallback to name field if available
                if (review.user.name) {
                    return review.user.name;
                }
            }
            
            // Fallback: Check userId field if user is not populated (legacy support)
            if (review.userId) {
                if (review.userId.firstName || review.userId.lastName) {
                    const firstName = review.userId.firstName || '';
                    const lastName = review.userId.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (fullName) return fullName;
                }
                if (review.userId.name) {
                    return review.userId.name;
                }
            }
            
            // Final fallback to reviewerName
            return review.reviewerName || 'Anonymous Member';
        } catch (error) {
            console.error('Error getting user name:', error);
            return 'Anonymous Member';
        }
    }

    renderAdminReply(review) {
        if (!review.adminReply || !review.adminReply.reply) {
            return '';
        }

        const replyDate = new Date(review.adminReply.repliedAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Get gym logo and name
        let gymLogo = '/frontend/gymadmin/admin.png'; // Default fallback
        let gymName = 'Gym Admin'; // Default fallback
        
        if (this.gymProfile) {
            if (this.gymProfile.logoUrl) {
                if (this.gymProfile.logoUrl.startsWith('http')) {
                    gymLogo = this.gymProfile.logoUrl;
                } else {
                    gymLogo = this.gymProfile.logoUrl.startsWith('/') ? 
                        `${this.BASE_URL}${this.gymProfile.logoUrl}` : 
                        `${this.BASE_URL}/${this.gymProfile.logoUrl}`;
                }
            }
            gymName = this.gymProfile.gymName || this.gymProfile.name || 'Gym Admin';
        }

        return `
            <div class="admin-reply" style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-top: 12px; border-left: 3px solid #1976d2;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <img src="${gymLogo}" alt="Gym Admin" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:2px solid #1976d2;" 
                         onerror="this.src='/frontend/gymadmin/admin.png';" />
                    <strong style="color: #1976d2; font-size: 13px;">${gymName}</strong>
                    <span style="font-size: 12px; color: #999;">${replyDate}</span>
                </div>
                <p style="margin: 0; color: #444; font-size: 13px; line-height: 1.4;">${review.adminReply.reply}</p>
            </div>
        `;
    }

    // Feature/Unfeature review functionality
    async toggleFeatureReview(reviewId) {
        try {
            const review = this.reviews.find(r => (r._id || r.id) === reviewId);
            if (!review) return;

            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/reviews/${reviewId}/feature`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Update the review in our local array
                review.isFeatured = !review.isFeatured;
                review.featuredAt = review.isFeatured ? new Date().toISOString() : null;
                
                this.showSuccessMessage(data.message);
                this.renderReviews();
                this.updateStats();
            } else {
                throw new Error('Failed to update review feature status');
            }
        } catch (error) {
            console.error('Error toggling review feature:', error);
            this.showErrorMessage('Failed to update review. Please try again.');
        }
    }

    // Delete review functionality
    async deleteReview(reviewId) {
        try {
            const review = this.reviews.find(r => (r._id || r.id) === reviewId);
            if (!review) return;

            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/reviews/${reviewId}/gym-delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Remove the review from our local array
                this.reviews = this.reviews.filter(r => (r._id || r.id) !== reviewId);
                
                this.showSuccessMessage('Review deleted successfully');
                this.renderReviews();
                this.updateStats();
            } else {
                throw new Error('Failed to delete review');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            this.showErrorMessage('Failed to delete review. Please try again.');
        }
    }

    // === Consistent UI Dialog System ===
    showDialog({ title = '', message = '', confirmText = 'OK', cancelText = '', iconHtml = '', onConfirm = null, onCancel = null }) {
        let dialog = document.getElementById('customDialogBox');
        if (dialog) dialog.remove();
        
        dialog = document.createElement('div');
        dialog.id = 'customDialogBox';
        dialog.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.35); display: flex; align-items: center; 
            justify-content: center; z-index: 99999; backdrop-filter: blur(2px);
        `;
        
        const buttonsHtml = cancelText ? 
            `<div style="display:flex;gap:12px;justify-content:center;">
              <button id="dialogCancelBtn" style="background:#6c757d;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${cancelText}</button>
              <button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>
            </div>` :
            `<button id="dialogConfirmBtn" style="background:#1976d2;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>`;
            
        dialog.innerHTML = `
            <div style="background:#fff;max-width:450px;width:90vw;padding:30px 24px 20px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);text-align:center;position:relative;animation:dialogSlideIn 0.3s ease-out;">
              <div style="margin-bottom:16px;">${iconHtml || ''}</div>
              <div style="font-size:1.25em;font-weight:700;margin-bottom:12px;color:#333;">${title}</div>
              <div style="font-size:1em;color:#555;margin-bottom:24px;line-height:1.5;white-space:pre-line;">${message}</div>
              ${buttonsHtml}
            </div>
            <style>
              @keyframes dialogSlideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              #dialogConfirmBtn:hover { background: #1565c0 !important; }
              #dialogCancelBtn:hover { background: #5a6268 !important; }
            </style>
        `;
        
        document.body.appendChild(dialog);
        document.body.style.overflow = 'hidden';
        
        // Confirm button handler
        dialog.querySelector('#dialogConfirmBtn').onclick = function() {
            dialog.remove();
            document.body.style.overflow = '';
            if (onConfirm) onConfirm();
        };
        
        // Cancel button handler
        const cancelBtn = dialog.querySelector('#dialogCancelBtn');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                dialog.remove();
                document.body.style.overflow = '';
                if (onCancel) onCancel();
            };
        }
        
        // Click outside to close (only if no cancel button)
        if (!cancelText) {
            dialog.onclick = function(e) {
                if (e.target === dialog) {
                    dialog.remove();
                    document.body.style.overflow = '';
                    if (onConfirm) onConfirm();
                }
            };
        }
    }

    // Mock Data Functions (for development/testing)
    getMockNotifications() {
        return [
            {
                _id: '1',
                title: 'Emergency: Equipment Malfunction',
                message: 'Critical safety issue reported with treadmill #3. Immediate inspection required.',
                type: 'emergency',
                priority: 'urgent',
                read: false,
                createdAt: new Date().toISOString(),
                metadata: {
                    ticketId: 'TKT-001',
                    source: 'member-report',
                    equipmentId: 'TREAD-003'
                }
            },
            {
                _id: '2',
                title: 'Support Ticket Reply Required',
                message: 'Member John Doe has replied to ticket about membership billing issue.',
                type: 'support-reply',
                priority: 'high',
                read: false,
                createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
                metadata: {
                    ticketId: 'TKT-002',
                    adminMessage: 'We have processed your refund request for the duplicate charge of $59.99. The refund should appear in your account within 3-5 business days.',
                    ticketSubject: 'Billing Issue - Duplicate Charge',
                    source: 'member-reply'
                }
            },
            {
                _id: '3',
                title: 'Grievance Resolution Update',
                message: 'Member Sarah Wilson has responded to your resolution for locker room complaint.',
                type: 'grievance-reply',
                priority: 'medium',
                read: false,
                createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                metadata: {
                    ticketId: 'GRV-001',
                    adminMessage: 'Thank you for your patience. We have thoroughly cleaned the locker room and implemented a new daily cleaning schedule. We have also installed additional hand sanitizer stations.',
                    ticketSubject: 'Locker Room Cleanliness Issue',
                    source: 'grievance-follow-up'
                }
            },
            {
                _id: '4',
                title: 'New Member Support Request',
                message: 'Sarah Wilson has submitted a new support ticket regarding locker room access.',
                type: 'general',
                priority: 'medium',
                read: false,
                createdAt: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
                metadata: {
                    ticketId: 'SUP-001',
                    adminMessage: 'Your digital locker has been assigned (#247). Please use your membership card to access it. If you need assistance, our staff will help you during your next visit.',
                    ticketSubject: 'Locker Room Access Issue',
                    source: 'new-ticket'
                }
            },
            {
                _id: '5',
                title: 'System Maintenance Completed',
                message: 'Scheduled maintenance for the gym access system has been completed successfully.',
                type: 'system-alert',
                priority: 'low',
                read: true,
                createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                metadata: {
                    source: 'system',
                    maintenanceType: 'access-system'
                }
            },
            {
                _id: '6',
                title: 'New Member Registration',
                message: 'New premium member Alex Johnson has completed registration and requires welcome orientation.',
                type: 'general',
                priority: 'medium',
                read: false,
                createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
                metadata: {
                    memberId: 'MEM-2025-001',
                    membershipType: 'premium',
                    source: 'registration',
                    adminMessage: 'Welcome to our gym! Your orientation session is scheduled for tomorrow at 10 AM. Please bring your ID and membership card.'
                }
            }
        ];
    }

    getMockReviews() {
        return [
            {
                _id: '1',
                rating: 5,
                comment: 'Excellent gym with great equipment and friendly staff! The new cardio machines are fantastic.',
                user: { 
                    firstName: 'John',
                    lastName: 'Doe',
                    profileImage: `${this.BASE_URL}/uploads/profile-pics/default.png`
                },
                reviewerName: 'John Doe',
                adminReply: null,
                isActive: true,
                isFeatured: true,
                featuredAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            },
            {
                _id: '2',
                rating: 4,
                comment: 'Good facilities but could use more parking space. Otherwise, great experience!',
                user: { 
                    firstName: 'Jane',
                    lastName: 'Smith',
                    profileImage: `${this.BASE_URL}/uploads/profile-pics/default.png`
                },
                reviewerName: 'Jane Smith',
                adminReply: {
                    reply: 'Thank you for the feedback! We are working on expanding our parking area.',
                    repliedAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
                    repliedBy: this.currentGymId
                },
                isActive: true,
                isFeatured: false,
                createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                _id: '3',
                rating: 3,
                comment: 'Average gym. Equipment is okay but some machines need maintenance.',
                user: { 
                    firstName: 'Mike',
                    lastName: 'Johnson',
                    profileImage: `${this.BASE_URL}/uploads/profile-pics/default.png`
                },
                reviewerName: 'Mike Johnson',
                adminReply: null,
                isActive: true,
                isFeatured: false,
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getMockGrievances() {
        return [
            {
                _id: '1',
                title: 'Equipment Not Working',
                description: 'The treadmill on the second floor has been broken for a week',
                priority: 'high',
                status: 'open',
                member: { name: 'Mike Johnson' },
                createdAt: new Date().toISOString()
            },
            {
                _id: '2',
                title: 'Billing Issue',
                description: 'Charged twice for the same month membership',
                priority: 'urgent',
                status: 'in-progress',
                member: { name: 'Sarah Wilson' },
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getMockCommunications() {
        return [
            {
                _id: '1',
                member: { name: 'Alex Brown' },
                lastMessage: { content: 'Hello, I have a question about my membership', createdAt: new Date().toISOString() },
                unreadCount: 2,
                status: 'active'
            },
            {
                _id: '2',
                member: { name: 'Emma Davis' },
                lastMessage: { content: 'Thank you for the quick response!', createdAt: new Date(Date.now() - 86400000).toISOString() },
                unreadCount: 0,
                status: 'active'
            }
        ];
    }

    // Escalation Form Submission Handler
    async handleEscalationFormSubmission(form) {
        const formData = new FormData(form);
        const grievanceId = form.dataset.grievanceId;
        const escalationData = {
            reason: formData.get('escalationReason'),
            priority: formData.get('escalationPriority'),
            requestCallback: formData.get('requestCallback') === 'on'
        };

        try {
            const success = await this.escalateGrievanceToAdmin(grievanceId, escalationData.reason, escalationData.priority);
            
            if (success) {
                // Send additional admin notification if callback requested
                if (escalationData.requestCallback) {
                    await this.requestAdminCallback(grievanceId, escalationData);
                }
                
                this.closeModal();
                form.reset();
            }
        } catch (error) {
            console.error('❌ Error in escalation form submission:', error);
            this.showErrorMessage('Failed to escalate grievance. Please try again.');
        }
    }

    async requestAdminCallback(grievanceId, escalationData) {
        try {
            const gymProfile = window.currentGymProfile || this.gymProfile || {};
            
            // Send callback request to admin
            const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('gymAuthToken');
            const response = await fetch(`${this.BASE_URL}/api/admin/notifications/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: `📞 Callback Request: ${gymProfile.gymName || 'Gym Admin'}`,
                    message: `Urgent callback requested for escalated grievance #${grievanceId}. Reason: ${escalationData.reason}`,
                    type: 'callback-request',
                    priority: 'urgent',
                    metadata: {
                        grievanceId: grievanceId,
                        gymId: this.currentGymId,
                        gymName: gymProfile.gymName || 'Unknown Gym',
                        callbackRequested: true,
                        escalationReason: escalationData.reason,
                        timestamp: new Date().toISOString()
                    },
                    gym: {
                        gymId: this.currentGymId,
                        gymName: gymProfile.gymName || 'Unknown Gym',
                        phone: gymProfile.phone || '',
                        email: gymProfile.email || ''
                    }
                })
            });

            if (response.ok) {
            }
        } catch (error) {
            console.error('❌ Error requesting admin callback:', error);
        }
    }

    // === Quick Message Templates System ===
    
    // Get quick message templates with real gym data
    getQuickMessageTemplates(conversationId) {
        const conversation = this.communications.find(c => (c._id || c.id) === conversationId);
        const userName = conversation?.userName || 'Member';
        
        // Get gym data
        const gymName = this.gymProfile?.gymName || this.gymProfile?.name || 'Our Gym';
        const gymPhone = this.gymProfile?.phone || this.gymProfile?.contactNumber || 'N/A';
        const gymEmail = this.gymProfile?.email || 'N/A';
        const gymAddress = this.gymProfile?.address || 'N/A';
        
        // Parse operating hours
        const operatingHours = this.gymProfile?.operatingHours || this.gymProfile?.hours || {};
        const hoursText = this.formatOperatingHours(operatingHours);
        
        // Get membership plans
        const plans = this.gymProfile?.membershipPlans || [];
        const plansText = this.formatMembershipPlans(plans);
        
        // Get amenities
        const amenities = this.gymProfile?.amenities || [];
        const amenitiesText = amenities.length > 0 ? amenities.join(', ') : 'Various amenities available';
        
        return [
            {
                id: 'welcome',
                title: 'Welcome Message',
                icon: 'fa-hand-wave',
                category: 'greeting',
                template: `Hello ${userName}! 👋\n\nWelcome to ${gymName}! I'm here to help you with any questions about our gym, membership plans, or facilities.\n\nHow can I assist you today?`
            },
            {
                id: 'hours',
                title: 'Operating Hours',
                icon: 'fa-clock',
                category: 'info',
                template: `Hi ${userName}! 🕒\n\nOur gym operating hours are:\n\n${hoursText}\n\nFeel free to visit us during these hours. Looking forward to seeing you!`
            },
            {
                id: 'membership_plans',
                title: 'Membership Plans',
                icon: 'fa-id-card',
                category: 'plans',
                template: `Hi ${userName}! 💪\n\nHere are our current membership plans:\n\n${plansText}\n\nAll plans include access to our facilities and basic amenities. Would you like more details about any specific plan?`
            },
            {
                id: 'trial',
                title: 'Trial Session',
                icon: 'fa-dumbbell',
                category: 'trial',
                template: `Hi ${userName}! 🎯\n\nWe offer a FREE trial session for new members!\n\nYou can:\n✅ Experience our facilities\n✅ Try our equipment\n✅ Meet our trainers\n✅ Get a personalized fitness assessment\n\nWould you like to schedule your trial session? Just let me know your preferred date and time!`
            },
            {
                id: 'amenities',
                title: 'Facilities & Amenities',
                icon: 'fa-star',
                category: 'info',
                template: `Hi ${userName}! ⭐\n\n${gymName} offers:\n\n${amenitiesText}\n\nWe're committed to providing you with the best fitness experience. Would you like to know more about any specific facility?`
            },
            {
                id: 'contact',
                title: 'Contact Information',
                icon: 'fa-address-card',
                category: 'info',
                template: `Hi ${userName}! 📞\n\nYou can reach us at:\n\n📍 Address: ${gymAddress}\n📞 Phone: ${gymPhone}\n📧 Email: ${gymEmail}\n\nOur hours: ${hoursText}\n\nFeel free to visit us or call anytime during operating hours!`
            },
            {
                id: 'payment',
                title: 'Payment Methods',
                icon: 'fa-credit-card',
                category: 'payment',
                template: `Hi ${userName}! 💳\n\nWe accept the following payment methods:\n\n✅ Credit/Debit Cards\n✅ UPI\n✅ Net Banking\n✅ Cash (at gym)\n\nWe also offer EMI options for annual memberships. Let me know if you need help with payment!`
            },
            {
                id: 'trainers',
                title: 'Personal Training',
                icon: 'fa-user-tie',
                category: 'services',
                template: `Hi ${userName}! 🏋️\n\nWe have certified personal trainers available for:\n\n✅ One-on-one training\n✅ Customized workout plans\n✅ Diet consultation\n✅ Progress tracking\n\nPersonal training sessions can be added to any membership plan. Would you like to know more about our trainers or pricing?`
            },
            {
                id: 'diet',
                title: 'Diet Plans',
                icon: 'fa-utensils',
                category: 'services',
                template: `Hi ${userName}! 🥗\n\nWe offer professional diet consultation and customized nutrition plans:\n\n✅ Personalized meal plans\n✅ Calorie tracking\n✅ Supplement guidance\n✅ Regular progress monitoring\n\nOur nutrition experts can help you achieve your fitness goals faster. Interested in learning more?`
            },
            {
                id: 'thank_you',
                title: 'Thank You',
                icon: 'fa-heart',
                category: 'closing',
                template: `Thank you for contacting ${gymName}, ${userName}! 🙏\n\nIf you have any other questions, feel free to reach out anytime. We're here to help!\n\nStay fit and healthy! 💪`
            }
        ];
    }

    formatOperatingHours(hours) {
        if (!hours || Object.keys(hours).length === 0) {
            return 'Monday - Sunday: 6:00 AM - 10:00 PM (Please contact us for exact timings)';
        }
        
        const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let formatted = [];
        
        daysOrder.forEach(day => {
            const dayHours = hours[day] || hours[day.toLowerCase()];
            if (dayHours && dayHours.open && dayHours.close) {
                const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                formatted.push(`${dayName}: ${dayHours.open} - ${dayHours.close}`);
            }
        });
        
        return formatted.length > 0 ? formatted.join('\n') : 'Please contact us for operating hours';
    }

    formatMembershipPlans(plans) {
        if (!plans || plans.length === 0) {
            return '• Monthly Plan\n• Quarterly Plan\n• Annual Plan\n\n(Please contact us for current pricing and details)';
        }
        
        return plans.map(plan => {
            const name = plan.name || plan.planName || 'Plan';
            const duration = plan.duration || plan.durationMonths ? `${plan.durationMonths} month${plan.durationMonths > 1 ? 's' : ''}` : '';
            const price = plan.price || plan.amount ? `₹${plan.price || plan.amount}` : '';
            return `• ${name}${duration ? ` (${duration})` : ''}${price ? ` - ${price}` : ''}`;
        }).join('\n');
    }

    // Open quick message modal
    async openQuickMessageModal(conversationId) {
        
        // Ensure we have latest gym profile data
        if (!this.gymProfile || !this.gymProfile.membershipPlans) {
            await this.fetchDetailedGymProfile();
        }
        
        const templates = this.getQuickMessageTemplates(conversationId);
        
        const modal = document.getElementById('quickMessageModal') || this.createQuickMessageModal();
        const modalBody = modal.querySelector('.quick-msg-modal-body');
        
        if (modalBody) {
            // Group templates by category
            const categories = {
                greeting: { title: 'Greetings', icon: 'fa-hand-wave', templates: [] },
                info: { title: 'Information', icon: 'fa-info-circle', templates: [] },
                plans: { title: 'Plans & Pricing', icon: 'fa-tags', templates: [] },
                trial: { title: 'Trial & Demo', icon: 'fa-star', templates: [] },
                services: { title: 'Services', icon: 'fa-concierge-bell', templates: [] },
                payment: { title: 'Payment', icon: 'fa-credit-card', templates: [] },
                closing: { title: 'Closing', icon: 'fa-check-circle', templates: [] }
            };
            
            templates.forEach(template => {
                if (categories[template.category]) {
                    categories[template.category].templates.push(template);
                }
            });
            
            modalBody.innerHTML = `
                <div class="quick-msg-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="quickMsgSearch" placeholder="Search templates..." onkeyup="supportManager.filterQuickMessages(event.target.value)">
                </div>
                
                <div class="quick-msg-categories">
                    ${Object.entries(categories).map(([key, cat]) => {
                        if (cat.templates.length === 0) return '';
                        return `
                            <div class="quick-msg-category" data-category="${key}">
                                <div class="category-header">
                                    <i class="fas ${cat.icon}"></i>
                                    <h4>${cat.title}</h4>
                                    <span class="category-count">${cat.templates.length}</span>
                                </div>
                                <div class="category-templates">
                                    ${cat.templates.map(template => `
                                        <div class="quick-msg-template" data-template-id="${template.id}" onclick="supportManager.selectQuickMessage('${conversationId}', '${template.id}')">
                                            <div class="template-header">
                                                <i class="fas ${template.icon}"></i>
                                                <span class="template-title">${template.title}</span>
                                            </div>
                                            <div class="template-preview">${template.template.substring(0, 100)}...</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Store templates for filtering
        this._currentTemplates = templates;
        this._currentConversationId = conversationId;
    }

    createQuickMessageModal() {
        const modal = document.createElement('div');
        modal.id = 'quickMessageModal';
        modal.className = 'support-modal quick-msg-modal';
        modal.innerHTML = `
            <div class="support-modal-content large">
                <div class="support-modal-header">
                    <h3><i class="fas fa-bolt"></i> Quick Messages</h3>
                    <button class="support-modal-close" onclick="supportManager.closeModal()">&times;</button>
                </div>
                <div class="quick-msg-modal-body">
                    <!-- Content will be populated dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add custom styles for quick message modal
        this.addQuickMessageStyles();
        
        return modal;
    }

    addQuickMessageStyles() {
        if (document.getElementById('quickMessageStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'quickMessageStyles';
        style.textContent = `
            .quick-msg-modal .support-modal-content {
                max-width: 800px;
                max-height: 80vh;
            }
            
            .quick-msg-modal-body {
                padding: 0;
                max-height: 600px;
                overflow-y: auto;
            }
            
            .quick-msg-search {
                position: sticky;
                top: 0;
                background: white;
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10;
            }
            
            .quick-msg-search i {
                color: #94a3b8;
                font-size: 16px;
            }
            
            .quick-msg-search input {
                flex: 1;
                padding: 10px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .quick-msg-search input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .quick-msg-categories {
                padding: 20px;
            }
            
            .quick-msg-category {
                margin-bottom: 24px;
            }
            
            .category-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
            }
            
            .category-header i {
                color: #3b82f6;
                font-size: 18px;
            }
            
            .category-header h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1e293b;
                flex: 1;
            }
            
            .category-count {
                background: #e0f2fe;
                color: #0284c7;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .category-templates {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 12px;
            }
            
            .quick-msg-template {
                padding: 16px;
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .quick-msg-template:hover {
                background: #eff6ff;
                border-color: #3b82f6;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            
            .template-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }
            
            .template-header i {
                color: #f59e0b;
                font-size: 16px;
            }
            
            .template-title {
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
            }
            
            .template-preview {
                font-size: 12px;
                color: #64748b;
                line-height: 1.5;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .quick-msg-category.hidden {
                display: none;
            }
        `;
        
        document.head.appendChild(style);
    }

    filterQuickMessages(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const categories = document.querySelectorAll('.quick-msg-category');
        
        if (!term) {
            categories.forEach(cat => cat.classList.remove('hidden'));
            document.querySelectorAll('.quick-msg-template').forEach(tpl => tpl.style.display = '');
            return;
        }
        
        categories.forEach(category => {
            const templates = category.querySelectorAll('.quick-msg-template');
            let hasVisibleTemplates = false;
            
            templates.forEach(template => {
                const title = template.querySelector('.template-title').textContent.toLowerCase();
                const preview = template.querySelector('.template-preview').textContent.toLowerCase();
                
                if (title.includes(term) || preview.includes(term)) {
                    template.style.display = '';
                    hasVisibleTemplates = true;
                } else {
                    template.style.display = 'none';
                }
            });
            
            if (hasVisibleTemplates) {
                category.classList.remove('hidden');
            } else {
                category.classList.add('hidden');
            }
        });
    }

    selectQuickMessage(conversationId, templateId) {
        const templates = this._currentTemplates || this.getQuickMessageTemplates(conversationId);
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            console.error('Template not found:', templateId);
            return;
        }
        
        // Insert template into chat input
        const chatInput = document.getElementById('chatReplyInput');
        if (chatInput) {
            chatInput.value = template.template;
            chatInput.focus();
            
            // Auto-resize textarea if needed
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
        }
        
        // Close modal
        this.closeModal();
        
        // Show success feedback
        this.showSuccessMessage(`Template "${template.title}" inserted!`);
        
    }

    async fetchDetailedGymProfile() {
        try {
            const token = this.getAuthToken();
            const response = await fetch(`${this.BASE_URL}/api/gyms/profile/me?detailed=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.gymProfile = { ...this.gymProfile, ...data };
                return this.gymProfile;
            } else {
                console.warn('⚠️ Could not fetch detailed gym profile');
                return this.gymProfile;
            }
        } catch (error) {
            console.error('❌ Error fetching detailed gym profile:', error);
            return this.gymProfile;
        }
    }
}

// Initialize the Support & Reviews Manager
let supportManager;
document.addEventListener('DOMContentLoaded', () => {
    supportManager = new SupportReviewsManager();
});

// Export for global access
window.supportManager = supportManager;
