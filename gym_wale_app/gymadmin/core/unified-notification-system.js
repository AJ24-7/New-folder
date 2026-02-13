/**
 * Unified Notification System
 * Consolidates all notification functionality into a single, performance-optimized module
 * Integrates with performance managers for optimal resource usage
 */

class UnifiedNotificationSystem {
    constructor() {
        // Configuration must be set first before loading settings
        this.config = {
            endpoints: {
                system: '/api/notifications/send',
                email: '/api/notifications/send-email',
                whatsapp: '/api/notifications/send-whatsapp',
                members: '/api/members',
                trainers: '/api/trainers'
            },
            limits: {
                title: 100,
                message: 500,
                recipients: 1000
            },
            defaults: {
                channels: {
                    system: true,
                    email: false,
                    whatsapp: false
                },
                sendTo: 'all-members',
                deliveryTime: 'now'
            }
        };
        
        // Now load settings (depends on config.defaults)
        this.settings = this.loadSettings();
        this.notifications = [];
        this.unreadCount = 0;
        this.templates = new Map();
        
        // Performance optimizations
        this.notificationSignatures = new Map();
        this.suppressionCache = new Map();
        this.pollerManager = null;

        this.initializeSystem();
    }

    /**
     * Initialize the unified notification system
     */
    async initializeSystem() {
        console.log('🔔 Initializing Unified Notification System');
        
        try {
            // Create UI components
            this.createNotificationUI();
            
            // Setup event listeners with performance optimization
            this.bindEventListeners();
            
            // Initialize templates
            this.initializeTemplates();
            
            // Setup smart polling if manager is available
            this.setupSmartPolling();
            
            // Load existing notifications
            await this.loadExistingNotifications();
            
            // Setup debug functions
            this.setupDebugFunctions();
            
            console.log('✅ Unified Notification System initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize notification system:', error);
        }
    }

    /**
     * Create notification UI components
     */
    createNotificationUI() {
        // Find the user-actions container to insert the bell
        const userActions = document.querySelector('.user-actions');
        
        // Remove any existing notification bell
        const existingBell = document.getElementById('notificationBell');
        if (existingBell) {
            existingBell.remove();
        }
        
        if (userActions) {
            const bellContainer = document.createElement('div');
            bellContainer.id = 'notificationBell';
            bellContainer.className = 'notification-bell-container';
            bellContainer.innerHTML = `
                <div class="notification-bell" onclick="window.unifiedNotificationSystem.togglePanel()">
                    <i class="fas fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge">0</span>
                </div>
                <div class="notification-panel" id="notificationPanel">
                    <div class="notification-header">
                        <h3>Notifications</h3>
                        <button onclick="window.unifiedNotificationSystem.markAllAsRead()" class="mark-all-read">
                            Mark All Read
                        </button>
                    </div>
                    <div class="notification-list" id="notificationList">
                        <div class="no-notifications">No notifications yet</div>
                    </div>
                    <div class="notification-footer">
                        <button onclick="window.unifiedNotificationSystem.viewAllNotifications()" class="view-all-notifications" style="width: 100%; padding: 10px; background: transparent; color: var(--primary); border: 1px solid var(--primary); border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s ease;">
                            <i class="fas fa-external-link-alt"></i> View All in Support & Reviews
                        </button>
                        <button onclick="window.unifiedNotificationSystem.openComposer()" class="compose-notification">
                            <i class="fas fa-plus"></i> Send Notification
                        </button>
                    </div>
                </div>
            `;
            
            // Insert before the user profile element
            const userProfile = userActions.querySelector('.user-profile');
            if (userProfile) {
                userActions.insertBefore(bellContainer, userProfile);
            } else {
                userActions.appendChild(bellContainer);
            }
        }

        // Create notification composer modal
        this.createComposerModal();
        
        // Add notification styles
        this.addNotificationStyles();
    }

    /**
     * Create notification composer modal
     */
    createComposerModal() {
        if (document.getElementById('notificationComposerModal')) return;

        const modal = document.createElement('div');
        modal.id = 'notificationComposerModal';
        modal.className = 'modal notification-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-paper-plane"></i> Send Notification</h2>
                    <button class="modal-close" onclick="this.closest('.modal').style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="notification-composer">
                        <!-- Template Selection -->
                        <div class="form-group">
                            <label>Quick Templates</label>
                            <select id="notificationTemplate" onchange="window.unifiedNotificationSystem.applyTemplate(this.value)">
                                <option value="">Select a template...</option>
                                <option value="membership-expiry">Membership Expiry Reminder</option>
                                <option value="payment-reminder">Payment Reminder</option>
                                <option value="new-class">New Class Alert</option>
                                <option value="holiday-notice">Holiday Notice</option>
                                <option value="maintenance">Maintenance Notice</option>
                                <option value="achievement">Congratulations</option>
                            </select>
                        </div>

                        <!-- Title -->
                        <div class="form-group">
                            <label>Title <span class="required">*</span></label>
                            <input type="text" id="unifiedNotificationTitle" maxlength="100" required>
                            <small class="char-count"><span id="titleCharCount">0</span>/100</small>
                        </div>

                        <!-- Message -->
                        <div class="form-group">
                            <label>Message <span class="required">*</span></label>
                            <textarea id="notificationMessage" rows="5" maxlength="500" required></textarea>
                            <small class="char-count"><span id="messageCharCount">0</span>/500</small>
                        </div>

                        <!-- Recipients -->
                        <div class="form-group">
                            <label>Send To</label>
                            <select id="notificationRecipients">
                                <option value="all-members">All Members</option>
                                <option value="active-members">Active Members Only</option>
                                <option value="expired-members">Expired Members Only</option>
                                <option value="trainers">All Trainers</option>
                                <option value="custom">Custom Recipients</option>
                            </select>
                        </div>

                        <!-- Custom Recipients (hidden by default) -->
                        <div class="form-group" id="customRecipientsGroup" style="display: none;">
                            <label>Custom Recipients (comma-separated emails)</label>
                            <textarea id="customRecipients" rows="3" placeholder="email1@example.com, email2@example.com"></textarea>
                        </div>

                        <!-- Delivery Channels -->
                        <div class="form-group">
                            <label>Delivery Channels</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" id="systemNotification" checked> System Notification</label>
                                <label><input type="checkbox" id="emailNotification"> Email</label>
                                <label><input type="checkbox" id="whatsappNotification"> WhatsApp</label>
                            </div>
                        </div>

                        <!-- Delivery Time -->
                        <div class="form-group">
                            <label>Delivery Time</label>
                            <select id="deliveryTime">
                                <option value="now">Send Now</option>
                                <option value="schedule">Schedule for Later</option>
                            </select>
                        </div>

                        <!-- Scheduled Time (hidden by default) -->
                        <div class="form-group" id="scheduleGroup" style="display: none;">
                            <label>Schedule Date & Time</label>
                            <input type="datetime-local" id="scheduledTime">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').style.display='none'">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.unifiedNotificationSystem.sendNotification()">
                        <i class="fas fa-paper-plane"></i> Send Notification
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Initialize notification templates
     */
    initializeTemplates() {
        this.templates.set('membership-expiry', {
            title: 'Membership Expiry Reminder',
            message: 'Dear {name},\n\nYour membership is expiring soon. Please renew to continue enjoying our services.\n\nExpiry Date: {expiryDate}\n\nBest regards,\nFit-Verse Team'
        });

        this.templates.set('payment-reminder', {
            title: 'Payment Reminder',
            message: 'Dear {name},\n\nThis is a friendly reminder about your pending payment.\n\nAmount: ₹{amount}\nDue Date: {dueDate}\n\nPlease complete your payment to avoid service interruption.\n\nBest regards,\nFit-Verse Team'
        });

        this.templates.set('new-class', {
            title: 'New Class Alert',
            message: 'Exciting News! 🎉\n\nWe\'re introducing a new class: {className}\n\nSchedule: {schedule}\nInstructor: {instructor}\n\nLimited spots available. Book now!\n\nBest regards,\nFit-Verse Team'
        });

        this.templates.set('holiday-notice', {
            title: 'Holiday Notice',
            message: 'Dear Members,\n\nPlease note that our gym will be closed on {holidayDate} due to {reason}.\n\nWe will resume normal operations on {resumeDate}.\n\nThank you for your understanding.\n\nBest regards,\nFit-Verse Team'
        });

        this.templates.set('maintenance', {
            title: 'Maintenance Notice',
            message: 'Dear Members,\n\nWe will be conducting maintenance work on {maintenanceDate} from {startTime} to {endTime}.\n\nAffected areas: {areas}\n\nWe apologize for any inconvenience.\n\nBest regards,\nFit-Verse Team'
        });

        this.templates.set('achievement', {
            title: 'Congratulations!',
            message: 'Dear {name},\n\nCongratulations on your amazing achievement! 🏆\n\n{achievementDescription}\n\nKeep up the great work!\n\nBest regards,\nFit-Verse Team'
        });
    }

    /**
     * Setup smart polling using SmartPollingManager
     */
    setupSmartPolling() {
        if (window.smartPollingManager) {
            this.pollerManager = window.smartPollingManager.createPoller('notifications', 
                () => this.pollForNotifications(), {
                interval: 30000, // 30 seconds
                pauseWhenHidden: true,
                priority: 'normal'
            });
            console.log('📡 Smart polling enabled for notifications');
        } else {
            // Fallback to regular polling
            this.pollingInterval = setInterval(() => this.pollForNotifications(), 30000);
            console.log('📡 Regular polling enabled for notifications');
        }
    }

    /**
     * Poll for new notifications
     */
    async pollForNotifications() {
        try {
            const fetchFunction = window.cachedFetch || fetch;
            const apiURL = window.API_CONFIG ? window.API_CONFIG.getURL('/api/notifications/all') : '/api/notifications/all';
            const response = await fetchFunction(apiURL, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.processNewNotifications(data.notifications || []);
            }
        } catch (error) {
            console.warn('Failed to poll notifications:', error);
        }
    }

    /**
     * Process new notifications with deduplication
     */
    processNewNotifications(newNotifications) {
        let addedCount = 0;

        newNotifications.forEach(notification => {
            const signature = this.generateNotificationSignature(notification);
            
            if (!this.notificationSignatures.has(signature)) {
                this.notifications.unshift(notification);
                this.notificationSignatures.set(signature, true);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            this.unreadCount += addedCount;
            
            // Save to cache
            this.saveNotificationsToCache();
            
            this.updateNotificationUI();
            this.updateRecentActivities(newNotifications.slice(0, addedCount));
            this.playNotificationSound();
            this.showToast(`${addedCount} new notification(s) received!`, 'info');
            
            // Dispatch event for other components (like Support & Reviews tab)
            document.dispatchEvent(new CustomEvent('newUnifiedNotification', {
                detail: {
                    notifications: newNotifications.slice(0, addedCount),
                    count: addedCount
                }
            }));
        }
    }

    /**
     * Generate unique signature for notification deduplication
     */
    generateNotificationSignature(notification) {
        return `${notification.type}-${notification.message}-${notification.timestamp}`;
    }

    /**
     * Update notification UI
     */
    updateNotificationUI() {
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }

        if (list) {
            if (this.notifications.length === 0) {
                list.innerHTML = '<div class="no-notifications">No notifications yet</div>';
            } else {
                list.innerHTML = this.notifications.map(notification => `
                    <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                         data-id="${notification.id}"
                         onclick="window.unifiedNotificationSystem.viewNotificationDetails('${notification.id}')">
                        <div class="notification-icon">
                            <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                        </div>
                        <div class="notification-actions" onclick="event.stopPropagation()">
                            ${!notification.read ? `
                                <button onclick="window.unifiedNotificationSystem.markAsRead('${notification.id}')" class="mark-read-btn" title="Mark as read">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : `
                                <button class="mark-read-btn read-indicator" disabled title="Already read">
                                    <i class="fas fa-check-double"></i>
                                </button>
                            `}
                        </div>
                    </div>
                `).join('');
            }
        }
    }
    
    /**
     * View notification details - Navigate to Support & Reviews tab
     */
    viewNotificationDetails(notificationId) {
        console.log('📖 Viewing notification details:', notificationId);
        
        // Close the notification panel
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.remove('show');
        }
        
        // Switch to Support & Reviews tab if available
        const supportTab = document.querySelector('[data-tab="supportReviews"]');
        if (supportTab) {
            supportTab.click();
            
            // Wait for tab to load and then show notification details
            setTimeout(() => {
                if (window.supportManager) {
                    // Make sure we're on notifications section
                    window.supportManager.switchTab('notifications');
                    
                    // Trigger the notification details modal
                    setTimeout(() => {
                        window.supportManager.openNotificationDetailsModal(notificationId);
                    }, 300);
                }
            }, 500);
        } else {
            // Fallback: just show a toast with the details
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                this.showToast(`${notification.title}: ${notification.message}`, 'info');
            }
        }
    }
    
    /**
     * View all notifications in Support & Reviews tab
     */
    viewAllNotifications() {
        console.log('📋 Navigating to all notifications...');
        
        // Close the notification panel
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.remove('show');
        }
        
        // Switch to Support & Reviews tab
        const supportTab = document.querySelector('[data-tab="supportReviews"]');
        if (supportTab) {
            supportTab.click();
            
            // Wait for tab to load and ensure we're on notifications section
            setTimeout(() => {
                if (window.supportManager) {
                    window.supportManager.switchTab('notifications');
                }
            }, 300);
        } else {
            this.showToast('Support & Reviews tab not found', 'warning');
        }
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            // Payment related
            'payment': 'fa-credit-card',
            'payment_received': 'fa-money-bill-wave',
            'payment_pending': 'fa-clock',
            'payment_failed': 'fa-exclamation-circle',
            
            // Member related
            'member_added': 'fa-user-plus',
            'member_updated': 'fa-user-edit',
            'member_removed': 'fa-user-minus',
            'membership': 'fa-id-card',
            'membership_expiry': 'fa-calendar-times',
            
            // Trainer related
            'trainer_added': 'fa-user-tie',
            'trainer_updated': 'fa-user-edit',
            'trainer': 'fa-chalkboard-teacher',
            
            // Settings & Admin
            'settings': 'fa-cog',
            'settings_updated': 'fa-tools',
            'admin': 'fa-user-shield',
            'admin_action': 'fa-shield-alt',
            
            // System
            'system': 'fa-server',
            'attendance': 'fa-calendar-check',
            'equipment_added': 'fa-dumbbell',
            'equipment_updated': 'fa-wrench',
            'biometric_enrolled': 'fa-fingerprint',
            
            // Status
            'alert': 'fa-exclamation-triangle',
            'success': 'fa-check-circle',
            'info': 'fa-info-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle',
            
            // Trial bookings
            'trial_booking': 'fa-calendar-plus',
            'trial_confirmed': 'fa-check-double',
            'trial_cancelled': 'fa-calendar-times',
            
            // Notifications
            'notification_sent': 'fa-paper-plane'
        };
        return icons[type] || 'fa-bell';
    }

    /**
     * Format timestamp for display
     */
    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    /**
     * Toggle notification panel
     */
    togglePanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('show');
        }
    }

    /**
     * Open notification composer
     */
    openComposer() {
        const modal = document.getElementById('notificationComposerModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Setup character counters
            this.setupCharacterCounters();
            
            // Setup form interactions
            this.setupFormInteractions();
        }
    }

    /**
     * Apply notification template
     */
    applyTemplate(templateKey) {
        if (!templateKey) return;
        
        const template = this.templates.get(templateKey);
        if (template) {
            document.getElementById('unifiedNotificationTitle').value = template.title;
            document.getElementById('notificationMessage').value = template.message;
            
            // Update character counters
            this.updateCharacterCount('unifiedNotificationTitle', 'titleCharCount');
            this.updateCharacterCount('notificationMessage', 'messageCharCount');
        }
    }

    /**
     * Setup character counters
     */
    setupCharacterCounters() {
        const titleInput = document.getElementById('unifiedNotificationTitle');
        const messageInput = document.getElementById('notificationMessage');
        
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.updateCharacterCount('unifiedNotificationTitle', 'titleCharCount');
            });
        }
        
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.updateCharacterCount('notificationMessage', 'messageCharCount');
            });
        }
    }

    /**
     * Update character count display
     */
    updateCharacterCount(inputId, counterId) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        
        if (input && counter) {
            counter.textContent = input.value.length;
        }
    }

    /**
     * Setup form interactions
     */
    setupFormInteractions() {
        // Recipients change handler
        const recipientsSelect = document.getElementById('notificationRecipients');
        const customGroup = document.getElementById('customRecipientsGroup');
        
        if (recipientsSelect) {
            recipientsSelect.addEventListener('change', () => {
                if (customGroup) {
                    customGroup.style.display = recipientsSelect.value === 'custom' ? 'block' : 'none';
                }
            });
        }
        
        // Delivery time change handler
        const deliveryTimeSelect = document.getElementById('deliveryTime');
        const scheduleGroup = document.getElementById('scheduleGroup');
        
        if (deliveryTimeSelect) {
            deliveryTimeSelect.addEventListener('change', () => {
                if (scheduleGroup) {
                    scheduleGroup.style.display = deliveryTimeSelect.value === 'schedule' ? 'block' : 'none';
                }
            });
        }
    }

    /**
     * Send notification
     */
    async sendNotification() {
        const title = document.getElementById('unifiedNotificationTitle').value.trim();
        const message = document.getElementById('notificationMessage').value.trim();
        const recipients = document.getElementById('notificationRecipients').value;
        
        if (!title || !message) {
            this.showToast('Please fill in title and message', 'error');
            return;
        }
        
        try {
            const notificationData = {
                title,
                message,
                recipients,
                channels: {
                    system: document.getElementById('systemNotification').checked,
                    email: document.getElementById('emailNotification').checked,
                    whatsapp: document.getElementById('whatsappNotification').checked
                },
                deliveryTime: document.getElementById('deliveryTime').value,
                scheduledTime: document.getElementById('scheduledTime')?.value
            };
            
            if (recipients === 'custom') {
                notificationData.customRecipients = document.getElementById('customRecipients').value;
            }
            
            const apiURL = window.API_CONFIG ? window.API_CONFIG.getURL(this.config.endpoints.system) : this.config.endpoints.system;
            const response = await fetch(apiURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });
            
            if (response.ok) {
                this.showToast('Notification sent successfully!', 'success');
                document.getElementById('notificationComposerModal').style.display = 'none';
                this.resetComposerForm();
            } else {
                throw new Error('Failed to send notification');
            }
            
        } catch (error) {
            console.error('Failed to send notification:', error);
            this.showToast('Failed to send notification', 'error');
        }
    }

    /**
     * Reset composer form
     */
    resetComposerForm() {
        document.getElementById('notificationTemplate').value = '';
        document.getElementById('unifiedNotificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationRecipients').value = 'all-members';
        document.getElementById('deliveryTime').value = 'now';
        
        // Reset checkboxes
        document.getElementById('systemNotification').checked = true;
        document.getElementById('emailNotification').checked = false;
        document.getElementById('whatsappNotification').checked = false;
        
        // Hide conditional groups
        document.getElementById('customRecipientsGroup').style.display = 'none';
        document.getElementById('scheduleGroup').style.display = 'none';
        
        // Reset character counters
        document.getElementById('titleCharCount').textContent = '0';
        document.getElementById('messageCharCount').textContent = '0';
    }

    /**
     * Show toast notification with enhanced UI
     */
    showToast(message, type = 'info') {
        // Remove any existing toasts of the same message to prevent duplicates
        const existingToasts = Array.from(document.querySelectorAll('.unified-toast'));
        existingToasts.forEach(existingToast => {
            if (existingToast.textContent.includes(message)) {
                existingToast.remove();
            }
        });

        // Icon mapping for different toast types
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };

        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('unifiedToastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'unifiedToastContainer';
            toastContainer.className = 'unified-toast-container';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `unified-toast unified-toast-${type}`;
        toast.innerHTML = `
            <div class="unified-toast-icon">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="unified-toast-content">
                <div class="unified-toast-message">${message}</div>
            </div>
            <button class="unified-toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('unified-toast-show');
        }, 100);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('unified-toast-hide');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 4000);
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRvIBAABXQVZFZm10IBAAAAABAA...');
            audio.play().catch(() => {
                // Ignore audio play errors
            });
        } catch (error) {
            // Ignore audio errors
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                
                // Save to localStorage immediately
                this.saveNotificationsToCache();
                
                // Update UI
                this.updateNotificationUI();
                
                // Update on server
                const apiURL = window.API_CONFIG ? window.API_CONFIG.getURL(`/api/notifications/${notificationId}/read`) : `/api/notifications/${notificationId}/read`;
                await fetch(apiURL, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                this.showToast('Notification marked as read', 'success');
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            this.showToast('Failed to mark notification as read', 'error');
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            this.notifications.forEach(n => n.read = true);
            this.unreadCount = 0;
            
            // Save to localStorage immediately
            this.saveNotificationsToCache();
            
            // Update UI
            this.updateNotificationUI();
            
            // Update on server
            const apiURL = window.API_CONFIG ? window.API_CONFIG.getURL('/api/notifications/mark-all-read') : '/api/notifications/mark-all-read';
            await fetch(apiURL, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            this.showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            this.showToast('Failed to mark all notifications as read', 'error');
        }
    }

    /**
     * Load existing notifications
     */
    async loadExistingNotifications() {
        try {
            // First, try to load from cache
            const cachedNotifications = this.loadNotificationsFromCache();
            if (cachedNotifications) {
                this.notifications = cachedNotifications;
                this.unreadCount = this.notifications.filter(n => !n.read).length;
                this.updateNotificationUI();
            }
            
            // Then fetch from server
            const fetchFunction = window.cachedFetch || fetch;
            const apiURL = window.API_CONFIG ? window.API_CONFIG.getURL('/api/notifications/all') : '/api/notifications/all';
            const response = await fetchFunction(apiURL, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const serverNotifications = data.notifications || [];
                
                // Merge with cached notifications, preserving read status
                this.mergeNotifications(serverNotifications);
                
                // Save to cache
                this.saveNotificationsToCache();
                
                this.unreadCount = this.notifications.filter(n => !n.read).length;
                this.updateNotificationUI();
            }
        } catch (error) {
            console.error('Failed to load existing notifications:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Save notifications to localStorage
     */
    saveNotificationsToCache() {
        try {
            const cacheKey = `notifications_${localStorage.getItem('gymAdminToken')?.substring(0, 10)}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                notifications: this.notifications,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save notifications to cache:', error);
        }
    }
    
    /**
     * Load notifications from localStorage
     */
    loadNotificationsFromCache() {
        try {
            const cacheKey = `notifications_${localStorage.getItem('gymAdminToken')?.substring(0, 10)}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const data = JSON.parse(cached);
                const age = Date.now() - data.timestamp;
                
                // Use cache if less than 5 minutes old
                if (age < 5 * 60 * 1000) {
                    return data.notifications;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to load notifications from cache:', error);
            return null;
        }
    }
    
    /**
     * Merge server notifications with cached ones, preserving read status
     */
    mergeNotifications(serverNotifications) {
        const existingMap = new Map(this.notifications.map(n => [n.id, n]));
        
        serverNotifications.forEach(serverNotif => {
            const existing = existingMap.get(serverNotif.id);
            
            if (existing) {
                // Preserve local read status if it's marked as read
                serverNotif.read = existing.read || serverNotif.read;
            }
        });
        
        this.notifications = serverNotifications;
    }

    /**
     * Load settings
     */
    loadSettings() {
        try {
            return JSON.parse(localStorage.getItem('notificationSettings')) || this.config.defaults;
        } catch {
            return this.config.defaults;
        }
    }

    /**
     * Save settings
     */
    saveSettings(settings) {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        this.settings = settings;
    }

    /**
     * Add notification styles
     */
    addNotificationStyles() {
        if (document.getElementById('unifiedNotificationStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'unifiedNotificationStyles';
        style.textContent = `
            .notification-bell-container {
                position: relative;
                display: inline-block;
                margin-left: 20px;
            }
            
            .notification-bell {
                position: relative;
                color: var(--primary);
                background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #333333 100%);;
                border: 1px solid #333;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .notification-bell:hover {
                color: var(--primary-dark);
                background: #f8f9fa;
                border-color: var(--primary-dark);
            }
            
            .notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                min-width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
            }
            
            .notification-panel {
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                width: 400px;
                max-height: 500px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            
            .notification-panel.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
                pointer-events: auto;
            }
            
            .notification-header {
                padding: 24px 24px 16px;
               border-bottom: 1px solid #e5e7eb;
               display: flex;
               justify-content: space-between;
               align-items: center;
               background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }
            
            .notification-list {
                max-height: 350px;
                overflow-y: auto;
            }
            
            .notification-item {
                padding: 15px;
                border-bottom: 1px solid #f1f3f4;
                display: flex;
                align-items: flex-start;
                transition: background-color 0.2s ease;
                cursor: pointer;
                position: relative;
            }
            
            .notification-item:hover {
                background: #f8f9fa;
            }
            
            .notification-item.unread {
                background: #f0f8ff;
            }
            
            .notification-item.unread:hover {
                background: #e6f3ff;
            }
            
            .notification-item::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--primary);
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .notification-item.unread::before {
                opacity: 1;
            }
            
            .notification-item:hover::before {
                opacity: 1;
                background: var(--primary-dark);
            }
            
            .notification-icon {
                margin-right: 12px;
                color: var(--primary);
            }
            
            .notification-content {
                flex: 1;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .notification-message {
                color: #666;
                font-size: 14px;
                margin-bottom: 5px;
            }
            
            .notification-time {
                color: #999;
                font-size: 12px;
            }
            
            .notification-footer {
                padding: 15px;
                border-top: 1px solid #eee;
                text-align: center;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .view-all-notifications {
                width: 100%;
                padding: 10px;
                background: transparent;
                color: var(--primary);
                border: 1px solid var(--primary);
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .view-all-notifications:hover {
                background: var(--primary);
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            button.mark-read-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 8px;
                min-width: 32px;
                min-height: 32px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
            }

            button.mark-read-btn:hover:not(:disabled) {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
            }

            button.mark-read-btn:active:not(:disabled) {
                transform: translateY(0);
                box-shadow: 0 1px 2px rgba(16, 185, 129, 0.2);
            }

            button.mark-read-btn:focus {
                outline: 2px solid #10b981;
                outline-offset: 2px;
            }
            
            button.mark-read-btn.read-indicator {
                background: #e5e7eb;
                color: #6b7280;
                cursor: not-allowed;
                box-shadow: none;
            }
            
            button.mark-read-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .mark-all-read {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
            }
            
            .mark-all-read:hover {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
            }
            
            .mark-all-read:active {
                transform: translateY(0);
            }
            .compose-notification {
                background: var(--primary);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .compose-notification:hover {
                background: var(--primary-dark);
            }
            
            .notification-modal .modal-content {
                max-width: 600px;
                margin: 2% auto;
            }
            
            .notification-composer .form-group {
                margin-bottom: 20px;
            }
            
            .notification-composer label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
            }
            
            .notification-composer .required {
                color: #dc3545;
            }
            
            .notification-composer input,
            .notification-composer textarea,
            .notification-composer select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .notification-composer .char-count {
                color: #666;
                font-size: 12px;
                margin-top: 5px;
                display: block;
            }
            
            .notification-composer .checkbox-group {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .notification-composer .checkbox-group label {
                display: flex;
                align-items: center;
                font-weight: normal;
                margin-bottom: 0;
                cursor: pointer;
            }
            
            .notification-composer .checkbox-group input[type="checkbox"] {
                width: auto;
                margin-right: 8px;
            }
            
            /* Enhanced Toast Notification Styles */
            .unified-toast-container {
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            }
            
            .unified-toast {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 320px;
                max-width: 450px;
                padding: 16px 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
                opacity: 0;
                transform: translateX(120%) scale(0.9);
                transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: auto;
                border-left: 4px solid;
                position: relative;
                overflow: hidden;
            }
            
            .unified-toast::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, currentColor, transparent);
                animation: shimmer 2s infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .unified-toast-show {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            
            .unified-toast-hide {
                opacity: 0;
                transform: translateX(120%) scale(0.8);
            }
            
            .unified-toast-icon {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
                animation: iconPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            
            @keyframes iconPop {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .unified-toast-content {
                flex: 1;
                min-width: 0;
            }
            
            .unified-toast-message {
                font-size: 14px;
                font-weight: 500;
                color: #1f2937;
                line-height: 1.5;
                word-wrap: break-word;
            }
            
            .unified-toast-close {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: none;
                background: #f3f4f6;
                color: #6b7280;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.2s ease;
                opacity: 0.7;
            }
            
            .unified-toast-close:hover {
                background: #e5e7eb;
                color: #374151;
                opacity: 1;
                transform: scale(1.1);
            }
            
            /* Success Toast */
            .unified-toast-success {
                border-left-color: #10b981;
            }
            
            .unified-toast-success .unified-toast-icon {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }
            
            /* Error Toast */
            .unified-toast-error {
                border-left-color: #ef4444;
            }
            
            .unified-toast-error .unified-toast-icon {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            }
            
            /* Warning Toast */
            .unified-toast-warning {
                border-left-color: #f59e0b;
            }
            
            .unified-toast-warning .unified-toast-icon {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            }
            
            /* Info Toast */
            .unified-toast-info {
                border-left-color: #3b82f6;
            }
            
            .unified-toast-info .unified-toast-icon {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            
            /* Responsive */
            @media (max-width: 640px) {
                .unified-toast-container {
                    left: 10px;
                    right: 10px;
                    top: 70px;
                }
                
                .unified-toast {
                    min-width: auto;
                    max-width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup debug functions
     */
    setupDebugFunctions() {
        window.notificationDebug = {
            getSystem: () => this,
            addTestNotification: () => {
                this.processNewNotifications([{
                    id: Date.now(),
                    type: 'test',
                    title: 'Test Notification',
                    message: 'This is a test notification',
                    timestamp: new Date().toISOString(),
                    read: false
                }]);
            },
            getMetrics: () => ({
                totalNotifications: this.notifications.length,
                unreadCount: this.unreadCount,
                templatesCount: this.templates.size,
                pollingActive: !!this.pollerManager
            })
        };
    }

    /**
     * Bind event listeners
     */
    bindEventListeners() {
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const bell = document.querySelector('.notification-bell-container');
            const panel = document.getElementById('notificationPanel');
            
            if (bell && panel && !bell.contains(e.target)) {
                panel.classList.remove('show');
            }
        });
    }

    /**
     * Update recent activities section on dashboard
     */
    updateRecentActivities(newActivities) {
        const recentActivityList = document.getElementById('recentActivityList');
        if (!recentActivityList) return;

        // Convert notifications to activity format
        const activities = newActivities.map(notification => this.convertNotificationToActivity(notification));
        
        // Get existing activities
        const existingItems = Array.from(recentActivityList.querySelectorAll('.activity-item:not(.loading-row)'));
        
        // Add new activities to the top
        activities.forEach(activity => {
            const activityHTML = this.renderActivityItem(activity);
            recentActivityList.insertAdjacentHTML('afterbegin', activityHTML);
        });
        
        // Limit to 8 activities
        const allItems = recentActivityList.querySelectorAll('.activity-item');
        if (allItems.length > 8) {
            Array.from(allItems).slice(8).forEach(item => item.remove());
        }
    }

    /**
     * Convert notification to activity format
     */
    convertNotificationToActivity(notification) {
        const iconBgColors = {
            'member_added': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            'payment': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            'payment_received': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            'trainer_added': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'settings': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            'admin': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            'trial_booking': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            'equipment_added': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            'notification_sent': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
        };

        return {
            id: notification.id || Date.now(),
            type: notification.type || 'info',
            title: notification.title,
            description: notification.message,
            timestamp: notification.timestamp || new Date().toISOString(),
            icon: this.getNotificationIcon(notification.type),
            iconBg: iconBgColors[notification.type] || 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            badge: this.getCategoryFromType(notification.type)
        };
    }

    /**
     * Get category badge from notification type
     */
    getCategoryFromType(type) {
        const categories = {
            'member_added': 'Members',
            'payment': 'Payments',
            'payment_received': 'Payments',
            'trainer_added': 'Trainers',
            'settings': 'Settings',
            'admin': 'Admin',
            'trial_booking': 'Bookings',
            'equipment_added': 'Equipment',
            'notification_sent': 'System'
        };
        return categories[type] || 'System';
    }

    /**
     * Render activity item for recent activities
     */
    renderActivityItem(activity) {
        const relativeTime = this.formatTime(activity.timestamp);
        
        return `
            <li class="activity-item" data-activity-id="${activity.id}">
                <div class="activity-icon" style="background: ${activity.iconBg};">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">
                        <i class="fas fa-clock"></i>
                        ${relativeTime}
                    </div>
                </div>
                <div class="activity-badge">
                    ${activity.badge}
                </div>
            </li>
        `;
    }

    /**
     * Add notification programmatically (for integrations)
     */
    addNotification(type, title, message, metadata = {}) {
        const notification = {
            id: Date.now(),
            type: type,
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            read: false,
            metadata: metadata
        };
        
        this.processNewNotifications([notification]);
        return notification;
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        if (this.pollerManager) {
            this.pollerManager.stop();
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Remove UI elements
        const bell = document.getElementById('notificationBell');
        const modal = document.getElementById('notificationComposerModal');
        const styles = document.getElementById('unifiedNotificationStyles');
        
        [bell, modal, styles].forEach(element => {
            if (element) element.remove();
        });
    }
}

// Global instance
window.unifiedNotificationSystem = new UnifiedNotificationSystem();

// Backward compatibility
window.NotificationSystem = UnifiedNotificationSystem;
window.NotificationManager = window.unifiedNotificationSystem;

console.log('🔔 Unified Notification System loaded with performance optimizations');