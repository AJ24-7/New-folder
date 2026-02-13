// Trial Bookings Management System
class TrialBookingsManager {
    constructor() {
    this.BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
        this.trialBookings = [];
        this.filteredBookings = [];
        this.currentFilters = {
            search: '',
            status: '',
            date: ''
        };
        
        // Memory leak prevention - track event listeners
        this.eventListeners = [];
        this.boundHandlers = new Map();
        
        // Lazy loading manager reference
        this.lazyLoader = window.LazyLoadManager;
        
        this.init();
    }
    
    // Get authentication token directly from localStorage
    getAuthToken() {
        return localStorage.getItem('gymAdminToken');
    }

    getGymId() {
        // Get gym ID from localStorage
        return localStorage.getItem('gymId');
    }

    // Tracked event listener system for memory leak prevention
    addTrackedEventListener(element, event, handler, options = {}) {
        const boundHandler = handler.bind && typeof handler.bind === 'function' ? handler : handler;
        this.boundHandlers.set(handler, boundHandler);
        this.eventListeners.push({ element, event, handler: boundHandler, options });
        element.addEventListener(event, boundHandler, options);
    }

    // Cleanup method to remove all tracked event listeners
    cleanup() {
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
        this.boundHandlers.clear();
    }

    async init() {
        console.log('Initializing Trial Bookings Manager with lazy loading...');
        
        // Immediate initialization - critical UI setup
        this.initializeEventListeners();
        
        // Defer heavy operations until idle time
        if (this.lazyLoader) {
            this.lazyLoader.deferUntilIdle('trial-bookings-data', async () => {
                await this.loadTrialBookings();
                this.updateStatistics();
                this.renderTrialBookings();
            });
        } else {
            // Fallback - stagger operations
            setTimeout(async () => {
                await this.loadTrialBookings();
                this.updateStatistics();
                this.renderTrialBookings();
            }, 200);
        }
    }

    initializeEventListeners() {
        // Search input
        const searchInput = document.getElementById('trialSearchInput');
        if (searchInput) {
            this.addTrackedEventListener(searchInput, 'input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('trialStatusFilter');
        if (statusFilter) {
            this.addTrackedEventListener(statusFilter, 'change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Date filter
        const dateFilter = document.getElementById('trialDateFilter');
        if (dateFilter) {
            this.addTrackedEventListener(dateFilter, 'change', (e) => {
                this.currentFilters.date = e.target.value;
                this.applyFilters();
            });
        }

        // Tab click handler
        this.setupTabClickHandler();
    }

    setupTabClickHandler() {
        // Find Trial Bookings menu items and add click handlers
        document.querySelectorAll('.menu-link').forEach(link => {
            const menuText = link.querySelector('.menu-text');
            if (menuText && menuText.textContent.trim() === 'Trial Bookings') {
                this.addTrackedEventListener(link, 'click', (e) => {
                    e.preventDefault();
                    this.showTrialBookingsTab();
                });
            }
        });
    }

    showTrialBookingsTab() {
        // Hide all tabs
        document.querySelectorAll('[id$="Tab"]').forEach(tab => {
            tab.style.display = 'none';
        });

        // Show trial bookings tab
        const trialTab = document.getElementById('trialBookingsTab');
        if (trialTab) {
            trialTab.style.display = 'block';
        }

        // Update active menu item
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });

        document.querySelectorAll('.menu-link').forEach(link => {
            const menuText = link.querySelector('.menu-text');
            if (menuText && menuText.textContent.trim() === 'Trial Bookings') {
                link.classList.add('active');
            }
        });

        // Refresh data when tab is shown
        this.loadTrialBookings();
    }

    async loadTrialBookings() {
        try {
            this.showLoading();
            
            const token = this.getAuthToken();
            if (!token) {
                console.error('No authentication token found');
                this.hideLoading();
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Authentication required. Please login again.', 'error');
                }
                return;
            }
            
            const gymId = this.getGymId();
            if (!gymId) {
                console.error('Gym ID not found');
                this.hideLoading();
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Gym ID not found. Please login again.', 'error');
                }
                return;
            }

            const response = await fetch(`${this.BASE_URL}/api/gyms/trial-bookings/${gymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load trial bookings: ${response.statusText}`);
            }

            const data = await response.json();
            this.trialBookings = data.bookings || [];
            this.filteredBookings = [...this.trialBookings];
            
            this.hideLoading();
            this.updateStatistics();
            this.renderTrialBookings();

        } catch (error) {
            console.error('Error loading trial bookings:', error);
            this.hideLoading();
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Failed to load trial bookings. Please try again.', 'error');
            }
        }
    }

    applyFilters() {
        this.filteredBookings = this.trialBookings.filter(booking => {
            const matchesSearch = this.matchesSearchFilter(booking);
            const matchesStatus = this.matchesStatusFilter(booking);
            const matchesDate = this.matchesDateFilter(booking);
            
            return matchesSearch && matchesStatus && matchesDate;
        });

        this.updateStatistics();
        this.renderTrialBookings();
    }

    matchesSearchFilter(booking) {
        if (!this.currentFilters.search) return true;
        
        const searchTerm = this.currentFilters.search;
        return (
            booking.customerName?.toLowerCase().includes(searchTerm) ||
            booking.email?.toLowerCase().includes(searchTerm) ||
            booking.phone?.toLowerCase().includes(searchTerm) ||
            booking.fitnessGoal?.toLowerCase().includes(searchTerm)
        );
    }

    matchesStatusFilter(booking) {
        if (!this.currentFilters.status) return true;
        return booking.status === this.currentFilters.status;
    }

    matchesDateFilter(booking) {
        if (!this.currentFilters.date) return true;
        
        const bookingDate = new Date(booking.preferredDate);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        switch (this.currentFilters.date) {
            case 'today':
                return this.isSameDay(bookingDate, today);
            case 'tomorrow':
                return this.isSameDay(bookingDate, tomorrow);
            case 'this-week':
                return this.isInCurrentWeek(bookingDate);
            case 'next-week':
                return this.isInNextWeek(bookingDate);
            case 'this-month':
                return this.isInCurrentMonth(bookingDate);
            default:
                return true;
        }
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    isInCurrentWeek(date) {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return date >= startOfWeek && date <= endOfWeek;
    }

    isInNextWeek(date) {
        const today = new Date();
        const startOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7));
        const endOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 13));
        return date >= startOfNextWeek && date <= endOfNextWeek;
    }

    isInCurrentMonth(date) {
        const today = new Date();
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }

    updateStatistics() {
        const total = this.trialBookings.length;
        const pending = this.trialBookings.filter(b => b.status === 'pending').length;
        const confirmed = this.trialBookings.filter(b => b.status === 'confirmed').length;
        
        // Calculate this week's bookings
        const thisWeek = this.trialBookings.filter(booking => {
            const bookingDate = new Date(booking.createdAt || booking.preferredDate);
            return this.isInCurrentWeek(bookingDate);
        }).length;

        // Update statistics in UI
        this.updateStatElement('totalTrialBookings', total);
        this.updateStatElement('pendingTrialBookings', pending);
        this.updateStatElement('confirmedTrialBookings', confirmed);
        this.updateStatElement('thisWeekTrialBookings', thisWeek);
        this.updateStatElement('trialBookingsCount', this.filteredBookings.length);
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    renderTrialBookings() {
        const tableContainer = document.getElementById('trialBookingsTableContainer');
        const table = document.getElementById('trialBookingsTable');
        const tbody = document.getElementById('trialBookingsTableBody');
        const emptyState = document.getElementById('trialBookingsEmpty');

        if (!tableContainer || !table || !tbody || !emptyState) {
            console.error('Trial bookings table elements not found');
            return;
        }

        if (this.filteredBookings.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        emptyState.style.display = 'none';

        tbody.innerHTML = '';

        this.filteredBookings.forEach(booking => {
            const row = this.createBookingRow(booking);
            tbody.appendChild(row);
        });
    }

    createBookingRow(booking) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';

        const statusBadge = this.getStatusBadge(booking.status);
        const preferredDate = new Date(booking.preferredDate).toLocaleDateString();
        const createdDate = new Date(booking.createdAt || Date.now()).toLocaleDateString();

        // Check if user profile data is available
        const hasProfilePicture = booking.userProfile && booking.userProfile.profilePicture;
        const profileImageSrc = hasProfilePicture ? 
            (booking.userProfile.profilePicture.startsWith('http') ? 
                booking.userProfile.profilePicture : 
                `${this.BASE_URL}${booking.userProfile.profilePicture}`) : 
            `${this.BASE_URL}/uploads/profile-pics/default.png`;

        const profileDisplay = hasProfilePicture ? 
            `<img src="${profileImageSrc}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" 
                  onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'">` :
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.1rem;">
                ${(booking.customerName || 'N').charAt(0).toUpperCase()}
            </div>`;

        row.innerHTML = `
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${profileDisplay}
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">${booking.customerName || 'N/A'}</div>
                        <div style="font-size: 0.9rem; color: #6b7280;">${booking.fitnessGoal || 'General Fitness'}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 16px;">
                <div style="color: #1f2937;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <i class="fas fa-envelope" style="color: #6b7280; font-size: 0.9rem;"></i>
                        <span style="font-size: 0.9rem;">${booking.email || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-phone" style="color: #6b7280; font-size: 0.9rem;"></i>
                        <span style="font-size: 0.9rem;">${booking.phone || 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-calendar" style="color: #1976d2;"></i>
                    <span style="font-weight: 500;">${preferredDate}</span>
                </div>
            </td>
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clock" style="color: #1976d2;"></i>
                    <span style="font-weight: 500;">${booking.preferredTime || 'Flexible'}</span>
                </div>
            </td>
            <td style="padding: 16px;">
                <span style="background: #e3f2fd; color: #1976d2; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 500;">
                    ${booking.fitnessGoal || 'General Fitness'}
                </span>
            </td>
            <td style="padding: 16px;">
                ${statusBadge}
            </td>
            <td style="padding: 16px;">
                <span style="color: #6b7280; font-size: 0.9rem;">${createdDate}</span>
            </td>
            <td style="padding: 16px; text-align: center;">
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button onclick="trialBookingsManager.viewBookingDetails('${booking._id || booking.id}')" 
                            style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" 
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="trialBookingsManager.contactCustomer('${booking._id || booking.id}')" 
                            style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" 
                            title="Contact Customer">
                        <i class="fas fa-phone"></i>
                    </button>
                    ${booking.status !== 'confirmed' ? 
                        `<button onclick="trialBookingsManager.confirmBooking('${booking._id || booking.id}')" 
                                style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" 
                                title="Confirm Booking & Send Email">
                            <i class="fas fa-check"></i>
                        </button>` : 
                        `<span style="background: #d1fae5; color: #059669; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem;">
                            <i class="fas fa-check-circle"></i> Confirmed
                        </span>`
                    }
                </div>
            </td>
        `;

        return row;
    }

    getStatusBadge(status) {
        const statusConfig = {
            'pending': { color: '#f59e0b', bg: '#fef3c7', text: 'Pending' },
            'confirmed': { color: '#059669', bg: '#d1fae5', text: 'Confirmed' },
            'contacted': { color: '#3b82f6', bg: '#dbeafe', text: 'Contacted' },
            'completed': { color: '#059669', bg: '#d1fae5', text: 'Completed' },
            'cancelled': { color: '#dc2626', bg: '#fee2e2', text: 'Cancelled' },
            'no-show': { color: '#6b7280', bg: '#f3f4f6', text: 'No Show' }
        };

        const config = statusConfig[status] || statusConfig['pending'];
        
        return `
            <span style="background: ${config.bg}; color: ${config.color}; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 500;">
                ${config.text}
            </span>
        `;
    }

    async viewBookingDetails(bookingId) {
        const booking = this.trialBookings.find(b => (b._id || b.id) === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }

        // Create detailed view modal
        const modalHtml = `
            <div class="booking-details-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h2 style="margin: 0; font-size: 1.5rem;">Trial Booking Details</h2>
                            <button onclick="this.closest('.booking-details-modal').remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                            <div>
                                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.2rem;">Customer Information</h3>
                                <div style="space-y: 12px;">
                                    <div style="margin-bottom: 12px;">
                                        <strong>Name:</strong> ${booking.customerName || 'N/A'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Email:</strong> ${booking.email || 'N/A'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Phone:</strong> ${booking.phone || 'N/A'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Age:</strong> ${booking.age || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.2rem;">Booking Details</h3>
                                <div style="space-y: 12px;">
                                    <div style="margin-bottom: 12px;">
                                        <strong>Preferred Date:</strong> ${new Date(booking.preferredDate).toLocaleDateString()}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Preferred Time:</strong> ${booking.preferredTime || 'Flexible'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Fitness Goal:</strong> ${booking.fitnessGoal || 'General Fitness'}
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <strong>Status:</strong> ${this.getStatusBadge(booking.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${booking.message ? `
                            <div style="margin-bottom: 24px;">
                                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.2rem;">Message</h3>
                                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; color: #374151;">
                                    ${booking.message}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button onclick="trialBookingsManager.contactCustomer('${bookingId}')" 
                                    style="background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-phone"></i> Contact Customer
                            </button>
                            <button onclick="trialBookingsManager.updateBookingStatus('${bookingId}', 'confirmed')" 
                                    style="background: #1976d2; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-check"></i> Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async contactCustomer(bookingId) {
        const booking = this.trialBookings.find(b => (b._id || b.id) === bookingId);
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return;
        }

        // Create contact options modal
        const modalHtml = `
            <div class="contact-customer-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; width: 90%; max-width: 500px;">
                    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h2 style="margin: 0; font-size: 1.5rem;">Contact Customer</h2>
                            <button onclick="this.closest('.contact-customer-modal').remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding: 24px;">
                        <div style="margin-bottom: 24px;">
                            <h3 style="margin: 0 0 8px 0;">${booking.customerName || 'Customer'}</h3>
                            <p style="color: #6b7280; margin: 0;">Choose how you'd like to contact this customer:</p>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${booking.phone ? `
                                <button onclick="window.open('tel:${booking.phone}', '_self')" 
                                        style="background: #1976d2; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: 500; text-align: left; display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-phone"></i>
                                    <div>
                                        <div>Call ${booking.phone}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">Make a direct phone call</div>
                                    </div>
                                </button>
                            ` : ''}
                            
                            ${booking.email ? `
                                <button onclick="window.open('mailto:${booking.email}?subject=Trial Session Booking&body=Hi ${booking.customerName || 'there'},%0A%0AThank you for your interest in our gym. We would like to schedule your trial session.%0A%0ABest regards,%0AYour Gym Team', '_blank')" 
                                        style="background: #dc2626; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: 500; text-align: left; display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-envelope"></i>
                                    <div>
                                        <div>Email ${booking.email}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">Send an email</div>
                                    </div>
                                </button>
                            ` : ''}
                            
                            ${booking.phone ? `
                                <button onclick="window.open('https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=Hi ${booking.customerName || 'there'}, thank you for your interest in our gym. We would like to schedule your trial session.', '_blank')" 
                                        style="background: #059669; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; font-weight: 500; text-align: left; display: flex; align-items: center; gap: 12px;">
                                    <i class="fab fa-whatsapp"></i>
                                    <div>
                                        <div>WhatsApp ${booking.phone}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">Send a WhatsApp message</div>
                                    </div>
                                </button>
                            ` : ''}
                        </div>
                        
                        <div style="margin-top: 24px; text-align: center;">
                            <button onclick="trialBookingsManager.markAsContacted('${bookingId}')" 
                                    style="background: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-check"></i> Mark as Contacted
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async markAsContacted(bookingId) {
        await this.updateBookingStatus(bookingId, 'contacted');
        
        // Close any open modals
        document.querySelectorAll('.contact-customer-modal').forEach(modal => modal.remove());
    }

    async confirmBooking(bookingId) {
        try {
            // Find the booking details
            const booking = this.trialBookings.find(b => (b._id || b.id) === bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }

            // Show enhanced confirmation modal
            this.showTrialConfirmationModal(booking);

        } catch (error) {
            console.error('Error showing confirmation modal:', error);
            this.showError(error.message || 'Failed to load booking details. Please try again.');
        }
    }

    async updateBookingStatus(bookingId, newStatus) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Authentication required', 'error');
                }
                return;
            }

            const response = await fetch(`${this.BASE_URL}/api/gyms/trial-bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error(`Failed to update booking status: ${response.statusText}`);
            }

            // Update local data
            const bookingIndex = this.trialBookings.findIndex(b => (b._id || b.id) === bookingId);
            if (bookingIndex !== -1) {
                this.trialBookings[bookingIndex].status = newStatus;
            }

            // Refresh display
            this.applyFilters();
            
            // Show success message
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(`Booking status updated to ${newStatus}`, 'success');
            }

        } catch (error) {
            console.error('Error updating booking status:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Failed to update booking status. Please try again.', 'error');
            }
        }
    }

    showLoading() {
        const loading = document.getElementById('trialBookingsLoading');
        const table = document.getElementById('trialBookingsTable');
        const empty = document.getElementById('trialBookingsEmpty');
        
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    hideLoading() {
        const loading = document.getElementById('trialBookingsLoading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        // Use unified notification system
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast(message, 'error');
            return;
        }
        
        // Fallback to console error
        console.error(message);
    }

    showSuccessMessage(message) {
        // Use unified notification system
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast(message, 'success');
            return;
        }
        
        // Fallback to console log
        console.log(message);
    }
}

// Dashboard Trial Bookings Manager
class DashboardTrialBookingsManager {
    constructor() {
        this.trialBookings = [];
        this.filteredBookings = [];
        this.maxDisplayItems = 5; // Show only recent 5 bookings on dashboard
        this.currentFilter = '';
        this.init();
    }
    
    // Get authentication token directly from localStorage
    getAuthToken() {
        return localStorage.getItem('gymAdminToken');
    }

    async init() {
        console.log('Initializing Dashboard Trial Bookings Manager...');
        await this.loadTrialBookings();
        this.initializeEventListeners();
        this.renderDashboardTrialBookings();
    }

    initializeEventListeners() {
        // Status filter for dashboard
        const dashboardStatusFilter = document.getElementById('dashboardTrialStatusFilter');
        if (dashboardStatusFilter) {
            dashboardStatusFilter.addEventListener('change', () => {
                this.currentFilter = dashboardStatusFilter.value;
                this.applyDashboardFilters();
            });
        }
    }

    async loadTrialBookings() {
        try {
            this.showDashboardLoading();
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('No authentication token found');
                this.hideDashboardLoading();
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Authentication required', 'error');
                }
                return;
            }

            const gymId = localStorage.getItem('gymId');
            if (!gymId) {
                console.error('Gym ID not found');
                this.hideDashboardLoading();
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Gym ID not found', 'error');
                }
                return;
            }

            const response = await fetch(`${this.BASE_URL}/api/gyms/trial-bookings/${gymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Initialize as empty array if no bookings
            this.trialBookings = Array.isArray(data.bookings) ? data.bookings : [];
            
            // Apply filters and render
            this.hideDashboardLoading();
            this.applyDashboardFilters();
            
        } catch (error) {
            console.error('Error loading dashboard trial bookings:', error);
            this.hideDashboardLoading();
            this.trialBookings = [];
            this.filteredBookings = [];
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Failed to load trial bookings', 'error');
            }
        }
    }

    applyDashboardFilters() {
        // Ensure trialBookings is initialized as an array
        if (!Array.isArray(this.trialBookings)) {
            this.trialBookings = [];
        }
        
        this.filteredBookings = this.trialBookings.filter(booking => {
            if (!this.currentFilter) return true;
            return booking.status === this.currentFilter;
        });

        // Sort by created date (most recent first) and limit to maxDisplayItems
        this.filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        this.filteredBookings = this.filteredBookings.slice(0, this.maxDisplayItems);
        
        this.renderDashboardTrialBookings();
    }

    renderDashboardTrialBookings() {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');

        if (!tableBody) return;

        // Remove loading row
        const loadingRow = tableBody.querySelector('.loading-row');
        if (loadingRow) {
            loadingRow.remove();
        }

        if (this.filteredBookings.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                        <div style="font-size: 1.1rem; margin-bottom: 8px;">No trial bookings found</div>
                        <div style="font-size: 0.9rem;">Trial bookings will appear here</div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredBookings.map(booking => this.createDashboardBookingRow(booking)).join('');
    }

    showDashboardLoading() {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #1976d2;"></i>
                            <p style="margin: 0; color: #6b7280; font-size: 0.95rem;">Loading trial bookings...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    hideDashboardLoading() {
        const tableBody = document.getElementById('dashboardTrialBookingsTableBody');
        if (tableBody) {
            const loadingRow = tableBody.querySelector('.loading-row');
            if (loadingRow) {
                loadingRow.remove();
            }
        }
    }

    createDashboardBookingRow(booking) {
        const statusColors = {
            pending: '#fbbf24',
            confirmed: '#10b981',
            contacted: '#3b82f6',
            completed: '#22c55e',
            cancelled: '#ef4444',
            'no-show': '#6b7280'
        };

        const statusColor = statusColors[booking.status] || '#6b7280';
        const customerName = booking.customerName || booking.name || 'Unknown Customer';
        
        // Fix profile picture URL - check if userProfile data is available
        let profilePicUrl;
        if (booking.userProfile && booking.userProfile.profilePicture) {
            profilePicUrl = booking.userProfile.profilePicture.startsWith('http') ? 
                booking.userProfile.profilePicture : 
                `${this.BASE_URL}${booking.userProfile.profilePicture}`;
        } else {
            profilePicUrl = `${this.BASE_URL}/uploads/profile-pics/default.png`;
        }

        // Handle different field names that might come from the API
        const email = booking.customerEmail || booking.email || 'N/A';
        const phone = booking.customerPhone || booking.phone || 'N/A';
        const timeSlot = booking.preferredTimeSlot || booking.preferredTime || booking.timeSlot || 'Not specified';
        const activity = booking.preferredActivity || booking.fitnessGoal || booking.activity || 'General fitness';
        const date = booking.preferredDate || booking.trialDate || null;

        // Format time slot with date if available
        const formattedTimeSlot = date ? 
            `${new Date(date).toLocaleDateString()} - ${timeSlot}` : 
            timeSlot;
        
        return `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${profilePicUrl}" alt="Profile" 
                             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
                             onerror="this.src='${this.BASE_URL}/uploads/profile-pics/default.png'">
                        <div>
                            <div style="font-weight: 600; color: #1f2937;">${customerName}</div>
                            <div style="font-size: 0.85rem; color: #6b7280;">${activity}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 16px; color: #374151;">${email}</td>
                <td style="padding: 16px; color: #374151;">${phone}</td>
                <td style="padding: 16px; color: #374151;">${formattedTimeSlot}</td>
                <td style="padding: 16px;">
                    <span style="background: ${statusColor}22; color: ${statusColor}; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </td>
                <td style="padding: 16px;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick="dashboardTrialBookings.contactCustomer('${email}', '${phone}', '${customerName}')" 
                                style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;"
                                title="Contact Customer">
                            <i class="fas fa-phone"></i>
                        </button>
                        ${booking.status !== 'confirmed' ? 
                            `<button onclick="dashboardTrialBookings.showTrialConfirmationModal(${JSON.stringify(booking).replace(/"/g, '&quot;')})" 
                                    style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;"
                                    title="Confirm Trial">
                                <i class="fas fa-check"></i>
                            </button>` : 
                            `<span style="background: #d1fae5; color: #059669; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem;">
                                <i class="fas fa-check-circle"></i> Confirmed
                            </span>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }

    async updateBookingStatus(bookingId, newStatus) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast('Authentication required', 'error');
                }
                return;
            }

            const response = await fetch(`${this.BASE_URL}/api/gyms/trial-bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update booking status');
            }

            // Reload to reflect changes
            await this.loadTrialBookings();
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(`Booking ${newStatus} successfully!`, 'success');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Failed to update booking status', 'error');
            }
        }
    }

    contactCustomer(email, phone, name) {
        // Create contact options modal
        const modalHtml = `
            <div class="contact-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%;">
                    <h3 style="margin: 0 0 16px 0; color: #1f2937;">Contact ${name}</h3>
                    <p style="color: #6b7280; margin-bottom: 20px;">Choose how to contact:</p>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${phone ? `
                            <a href="tel:${phone}" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #1976d2; color: white; text-decoration: none; border-radius: 8px;">
                                <i class="fas fa-phone"></i> Call ${phone}
                            </a>
                        ` : ''}
                        ${email ? `
                            <a href="mailto:${email}" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">
                                <i class="fas fa-envelope"></i> Email ${email}
                            </a>
                        ` : ''}
                        ${phone ? `
                            <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #059669; color: white; text-decoration: none; border-radius: 8px;">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </a>
                        ` : ''}
                    </div>
                    <button onclick="this.closest('.contact-modal').remove()" style="width: 100%; margin-top: 16px; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

// Initialize the trial bookings manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trialBookingsManager = new TrialBookingsManager();
    window.dashboardTrialBookings = new DashboardTrialBookingsManager();
});
