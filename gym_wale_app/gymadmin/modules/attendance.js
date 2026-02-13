// Attendance Management System
class AttendanceManager {
    // Helper to format date as YYYY-MM-DD in local time
    formatDateLocal(date) {
        return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
    }
    constructor() {
    this.BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
        this.currentDate = new Date();
        this.currentTab = 'members';
        this.attendanceData = {};
        this.membersData = [];
        this.trainersData = [];
        this.gymId = null; // Store gymId for current admin
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
        this.updateDateDisplay();
        this.loadAttendanceForDate();
        
        // Check biometric agent status on load (after a short delay)
        setTimeout(() => {
            this.showAgentStatus();
        }, 1000);
    }

    // Use unified auth manager for token operations
    async getAuthToken() {
        if (window.unifiedAuthManager) {
            return await window.unifiedAuthManager.waitForToken();
        }
        // Fallback for backward compatibility
        return localStorage.getItem('gymAdminToken');
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.attendance-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Date navigation
        document.getElementById('prevDay')?.addEventListener('click', () => {
            this.navigateDate(-1);
        });

        document.getElementById('nextDay')?.addEventListener('click', () => {
            this.navigateDate(1);
        });

        document.getElementById('todayBtn')?.addEventListener('click', () => {
            this.goToToday();
        });

        document.getElementById('attendanceDate')?.addEventListener('change', (e) => {
            this.currentDate = new Date(e.target.value);
            this.loadAttendanceForDate();
        });

        // Search functionality
        document.getElementById('attendanceSearch')?.addEventListener('input', (e) => {
            this.filterAttendance(e.target.value);
        });

        // Filter functionality
        document.getElementById('attendanceFilter')?.addEventListener('change', (e) => {
            this.filterByStatus(e.target.value);
        });

        // Quick Biometric Verify
        document.getElementById('quickBiometricBtn')?.addEventListener('click', () => {
            this.showQuickVerifyModal();
        });

        // Bulk actions
        document.getElementById('bulkPresentBtn')?.addEventListener('click', () => {
            this.bulkMarkAttendance('present');
        });

        document.getElementById('bulkAbsentBtn')?.addEventListener('click', () => {
            this.bulkMarkAttendance('absent');
        });

        // Export functionality
        document.getElementById('exportAttendanceBtn')?.addEventListener('click', () => {
            this.exportAttendance();
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.attendance-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update filter options
        this.updateFilterOptions();
        
        // Reload attendance data
        this.loadAttendanceForDate();
    }

    updateFilterOptions() {
        const filterSelect = document.getElementById('attendanceFilter');
        if (!filterSelect) return;

        const baseOptions = [
            { value: 'all', text: 'All' },
            { value: 'present', text: 'Present' },
            { value: 'absent', text: 'Absent' },
            { value: 'pending', text: 'Pending' }
        ];

        if (this.currentTab === 'members') {
            baseOptions.push({ value: 'expiring', text: 'Membership Expiring' });
        }

        filterSelect.innerHTML = baseOptions.map(option => 
            `<option value="${option.value}">${option.text}</option>`
        ).join('');
    }

    navigateDate(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this.updateDateDisplay();
        this.loadAttendanceForDate();
    }

    goToToday() {
        this.currentDate = new Date();
        this.updateDateDisplay();
        this.loadAttendanceForDate();
    }

    updateDateDisplay() {
        const dateInput = document.getElementById('attendanceDate');
        if (dateInput) {
            dateInput.value = this.formatDateLocal(this.currentDate);
        }
    }

    async loadData() {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                console.error('No token found');
                return;
            }

            // Load members data
            const membersResponse = await fetch(`${this.BASE_URL}/api/members`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (membersResponse.ok) {
                const contentType = membersResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        this.membersData = await membersResponse.json();
                        console.log(`✅ Successfully loaded ${this.membersData.length || 0} members`);
                    } catch (jsonError) {
                        console.warn('Failed to parse members JSON response:', jsonError);
                        this.membersData = [];
                    }
                } else {
                    console.warn('Members API returned non-JSON response');
                    this.membersData = [];
                }
            } else {
                console.warn(`Members API returned status ${membersResponse.status}: ${membersResponse.statusText}`);
                this.membersData = [];
            }

            // Fetch gymId from admin profile if not already set
            if (!this.gymId) {
                try {
                    const profileResponse = await fetch(`${this.BASE_URL}/api/gyms/profile/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (profileResponse.ok) {
                        const contentType = profileResponse.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            try {
                                const profile = await profileResponse.json();
                                this.gymId = profile.gymId || profile._id || profile.gym?._id || null;
                                console.log(`✅ Successfully loaded gym profile, gymId: ${this.gymId}`);
                            } catch (jsonError) {
                                console.warn('Failed to parse profile JSON response:', jsonError);
                                this.gymId = null;
                            }
                        } else {
                            console.warn('Profile API returned non-JSON response');
                            this.gymId = null;
                        }
                    } else {
                        console.warn(`Profile API returned status ${profileResponse.status}: ${profileResponse.statusText}`);
                        this.gymId = null;
                    }
                } catch (e) {
                    this.gymId = null;
                }
            }

            // Load trainers data (status=approved, gym=<gymId>)
            let trainersUrl = '${this.BASE_URL}/api/trainers?status=approved';
            if (this.gymId) trainersUrl += `&gym=${this.gymId}`;

            const trainersResponse = await fetch(trainersUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (trainersResponse.ok) {
                const contentType = trainersResponse.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        this.trainersData = await trainersResponse.json();
                        console.log(`✅ Successfully loaded ${this.trainersData.length || 0} trainers`);
                    } catch (jsonError) {
                        console.warn('Failed to parse trainers JSON response:', jsonError);
                        this.trainersData = [];
                    }
                } else {
                    console.warn('Trainers API returned non-JSON response');
                    this.trainersData = [];
                }
            } else {
                console.warn(`Trainers API returned status ${trainersResponse.status}: ${trainersResponse.statusText}`);
                this.trainersData = [];
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Ensure data arrays are initialized even on error
            this.membersData = this.membersData || [];
            this.trainersData = this.trainersData || [];
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Error loading data', 'error');
            }
        }
    }

    async loadAttendanceForDate() {
        const dateStr = this.formatDateLocal(this.currentDate);
        console.log(`🔍 Loading attendance for date: ${dateStr}`);
        
        // Show skeleton loading
        this.showSkeletonLoading();
        
        try {
            const token = await this.getAuthToken();
            if (!token) {
                console.error('No token found');
                return;
            }

            console.log(`🌐 Fetching attendance from: ${this.BASE_URL}/api/attendance/${dateStr}`);
            const response = await fetch(`${this.BASE_URL}/api/attendance/${dateStr}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            console.log(`📡 Response content-type: ${response.headers.get('content-type')}`);
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        this.attendanceData = await response.json();
                        console.log(`✅ Successfully loaded attendance data:`, this.attendanceData);
                    } catch (jsonError) {
                        console.warn('Failed to parse attendance JSON response:', jsonError);
                        this.attendanceData = {};
                    }
                } else {
                    console.warn('Attendance API returned non-JSON response');
                    this.attendanceData = {};
                }
            } else {
                console.warn(`Attendance API returned status ${response.status}: ${response.statusText}`);
                this.attendanceData = {};
            }
            
            this.renderAttendance();
            this.updateStats();
        } catch (error) {
            console.error('Error loading attendance:', error);
            this.attendanceData = {};
            this.renderAttendance();
            this.updateStats();
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Error loading attendance data', 'error');
            }
        }
    }

    showSkeletonLoading() {
        const container = document.getElementById('attendanceTableBody');
        if (!container) return;
        
        const skeletonRows = Array(5).fill(0).map(() => `
            <div class="skeleton-table-row">
                <div><div class="skeleton skeleton-avatar"></div></div>
                <div>
                    <div class="skeleton skeleton-line" style="width: 70%; margin-bottom: 8px;"></div>
                    <div class="skeleton skeleton-line short" style="width: 40%;"></div>
                </div>
                <div><div class="skeleton skeleton-line" style="width: 80px;"></div></div>
                <div><div class="skeleton skeleton-badge"></div></div>
                <div><div class="skeleton skeleton-line" style="width: 60px;"></div></div>
                <div class="skeleton-buttons">
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                    <div class="skeleton skeleton-button"></div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = skeletonRows;
    }
    
    showStatsSkeletonLoading() {
        const statsContainer = document.getElementById('attendanceStatsGrid');
        if (!statsContainer) return;
        
        const skeletonStats = Array(4).fill(0).map(() => `
            <div class="skeleton-stat-card">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-icon"></div>
                </div>
                <div class="skeleton skeleton-number"></div>
            </div>
        `).join('');
        
        statsContainer.innerHTML = skeletonStats;
    }

    renderAttendance() {
        const container = document.getElementById('attendanceTableBody');
        if (!container) return;

        const data = this.currentTab === 'members' ? this.membersData : this.trainersData;
        const filteredData = this.filterExpiredMembers(data);

        if (filteredData.length === 0) {
            container.innerHTML = this.getEmptyStateRow();
            return;
        }

        container.innerHTML = filteredData.map(person => this.createAttendanceRow(person)).join('');
        
        // Add biometric status indicators after rows are rendered
        setTimeout(() => {
            this.addBiometricStatusToRows();
        }, 100);
    }

    filterExpiredMembers(data) {
        if (this.currentTab !== 'members') return data;

        const today = new Date();
        return data.filter(member => {
            if (!member.membershipValidUntil) return true;
            const expiryDate = new Date(member.membershipValidUntil);
            return expiryDate >= today;
        });
    }

    createAttendanceRow(person) {
        const dateStr = this.formatDateLocal(this.currentDate);
        const attendanceRecord = this.attendanceData[person._id] || {};
        const status = attendanceRecord.status || 'pending';
        const checkInTime = attendanceRecord.checkInTime || '';

        const isExpiringSoon = this.currentTab === 'members' && this.isMembershipExpiringSoon(person);
        
        // Use correct image field for trainers
        let avatarUrl;
        if (this.currentTab === 'trainers') {
            avatarUrl = person.image || 'https://via.placeholder.com/50?text=User';
        } else {
            avatarUrl = person.profileImage || 'https://via.placeholder.com/50?text=User';
        }

        const personName = person.memberName || person.firstName + ' ' + person.lastName;
        const personId = this.currentTab === 'members' ? 
            (person.membershipId || 'N/A') : 
            (person.specialty || 'General');

        return `
            <div class="attendance-row ${status}" data-id="${person._id}" data-person-id="${person._id}" data-person-type="${person.isTrainer ? 'trainer' : 'member'}">
                <div class="member-photo-container">
                    <img src="${avatarUrl}" alt="${personName}" class="member-photo">
                </div>
                
                <div class="member-name-container">
                    <h4 class="member-name">${personName}</h4>
                    ${isExpiringSoon ? `
                        <div class="expiry-warning-row">
                            <i class="fas fa-exclamation-triangle"></i>
                            Expires in ${this.getDaysUntilExpiry(person)} days
                        </div>
                    ` : ''}
                </div>
                
                <div class="member-id-container">
                    <span class="member-id">${personId}</span>
                </div>
                
                <div class="status-container">
                    <span class="status-badge-enhanced ${status}">
                        <i class="fas fa-${status === 'present' ? 'check-circle' : status === 'absent' ? 'times-circle' : 'clock'}"></i>
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                
                <div class="check-in-container">
                    ${checkInTime ? `<span class="check-in-time-enhanced">${checkInTime}</span>` : '<span class="check-in-time-enhanced">--:--</span>'}
                </div>
                
                <div class="row-actions">
                    <button class="action-btn-enhanced present ${status === 'present' ? 'disabled' : ''}" 
                            onclick="attendanceManager.markAttendance('${person._id}', 'present')"
                            ${status === 'present' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                        Present
                    </button>
                    <button class="action-btn-enhanced absent ${status === 'absent' ? 'disabled' : ''}" 
                            onclick="attendanceManager.markAttendance('${person._id}', 'absent')"
                            ${status === 'absent' ? 'disabled' : ''}>
                        <i class="fas fa-times"></i>
                        Absent
                    </button>
                    <button class="action-btn-enhanced history" 
                            onclick="attendanceManager.showAttendanceHistory('${person._id}', '${personName}', '${this.currentTab}')">
                        <i class="fas fa-history"></i>
                        History
                    </button>
                </div>
            </div>
        `;
    }

    isMembershipExpiringSoon(member) {
        if (!member.membershipValidUntil) return false;
        
        const today = new Date();
        const expiryDate = new Date(member.membershipValidUntil);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    }

    getDaysUntilExpiry(member) {
        if (!member.membershipValidUntil) return 0;
        
        const today = new Date();
        const expiryDate = new Date(member.membershipValidUntil);
        return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    }

    async markAttendance(personId, status) {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString();

        // Fix: personType must be capitalized to match backend enum
        const personType = this.currentTab === 'members' ? 'Member' : 'Trainer';

        // Get token using the same method as gymadmin.js
        const token = await this.getAuthToken();
        if (!token) {
            console.error('No token found');
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Authentication required', 'error');
            }
            return;
        }

        try {
            const response = await fetch(`${this.BASE_URL}/api/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    personId,
                    personType,
                    date: dateStr,
                    status,
                    checkInTime: status === 'present' ? currentTime : null
                })
            });

            if (response.ok) {
                // Update local data
                if (!this.attendanceData[personId]) {
                    this.attendanceData[personId] = {};
                }
                this.attendanceData[personId].status = status;
                this.attendanceData[personId].checkInTime = status === 'present' ? currentTime : null;

                // Don't clear the entire cache, just update today's data
                // if (this.attendanceHistory && this.attendanceHistory[personId]) {
                //     delete this.attendanceHistory[personId];
                // }

                // Immediately update attendance history with today's data
                if (!this.attendanceHistory) this.attendanceHistory = {};
                if (!this.attendanceHistory[personId]) this.attendanceHistory[personId] = {};
                
                // Store today's attendance in history cache
                this.attendanceHistory[personId][dateStr] = {
                    date: dateStr,
                    status: status,
                    checkInTime: status === 'present' ? currentTime : null,
                    checkOutTime: null
                };

                console.log(`✅ Stored today's attendance for ${personId} on ${dateStr}:`, this.attendanceHistory[personId][dateStr]);

                // Also refresh attendance history for the current month to get any other data
                await this.refreshAttendanceHistory(personId);

                // Re-render the specific card
                this.renderAttendance();
                this.updateStats();
                
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast(`Attendance marked as ${status}`, 'success');
                }
            } else {
                throw new Error('Failed to mark attendance');
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Error marking attendance', 'error');
            }
        }
    }

    filterAttendance(searchTerm) {
        const container = document.getElementById('attendanceTableBody');
        if (!container) return;
        const data = this.currentTab === 'members' ? this.membersData : this.trainersData;
        const filteredData = this.filterExpiredMembers(data).filter(person => {
            const name = (person.memberName || (person.firstName + ' ' + person.lastName)).toLowerCase();
            const id = (person.membershipId || '').toLowerCase();
            return name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
        });

        // Show searched member results
        if (searchTerm && filteredData.length > 0) {
            container.innerHTML = filteredData.map(person => this.createAttendanceRow(person)).join('');
        } else {
            this.renderAttendance();
        }
    }

    filterByStatus(statusFilter) {
        const rows = document.querySelectorAll('.attendance-row');
        rows.forEach(row => {
            const rowStatus = row.classList.contains('present') ? 'present' : 
                             row.classList.contains('absent') ? 'absent' : 'pending';
            
            if (statusFilter === 'all' || rowStatus === statusFilter) {
                row.style.display = 'grid';
            } else if (statusFilter === 'expiring' && this.currentTab === 'members') {
                const hasExpiryWarning = row.querySelector('.expiry-warning-row');
                row.style.display = hasExpiryWarning ? 'grid' : 'none';
            } else {
                row.style.display = 'none';
            }
        });
    }

    async bulkMarkAttendance(status) {
        const visibleRows = document.querySelectorAll('.attendance-row:not([style*="display: none"])');
        const promises = [];

        visibleRows.forEach(row => {
            const personId = row.dataset.id;
            const currentStatus = row.classList.contains('present') ? 'present' : 
                                 row.classList.contains('absent') ? 'absent' : 'pending';
            
            if (currentStatus !== status) {
                promises.push(this.markAttendance(personId, status));
            }
        });

        try {
            await Promise.all(promises);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(`Bulk attendance marked as ${status}`, 'success');
            }
        } catch (error) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Error in bulk attendance marking', 'error');
            }
        }
    }

    updateStats() {
        // Safety check: Only update if elements exist (tab is visible)
        if (!document.getElementById('totalCount')) {
            console.warn('⚠️ Stats elements not found - attendance tab may not be visible yet');
            return;
        }

        const data = this.currentTab === 'members' ? this.membersData : this.trainersData;
        const filteredData = this.filterExpiredMembers(data);
        
        let presentCount = 0;
        let absentCount = 0;
        let totalCount = filteredData.length;

        filteredData.forEach(person => {
            const attendanceRecord = this.attendanceData[person._id] || {};
            const status = attendanceRecord.status || 'pending';
            
            if (status === 'present') presentCount++;
            else if (status === 'absent') absentCount++;
        });

        // Update stats display - with null checks to prevent errors
        const totalCountEl = document.getElementById('totalCount');
        const presentCountEl = document.getElementById('presentCount');
        const absentCountEl = document.getElementById('absentCount');
        const pendingCountEl = document.getElementById('pendingCount');
        const membersCountEl = document.getElementById('membersCount');
        const trainersCountEl = document.getElementById('trainersCount');

        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (presentCountEl) presentCountEl.textContent = presentCount;
        if (absentCountEl) absentCountEl.textContent = absentCount;
        if (pendingCountEl) pendingCountEl.textContent = totalCount - presentCount - absentCount;
        
        // Update tab counts
        if (membersCountEl) membersCountEl.textContent = this.membersData.length;
        if (trainersCountEl) trainersCountEl.textContent = this.trainersData.length;
        
        // Update current tab label
        const tabLabel = this.currentTab === 'members' ? 'Members' : 'Trainers';
        document.querySelectorAll('.currentTabLabel').forEach(el => {
            el.textContent = tabLabel;
        });
    }

    updateSummary(total, present, absent) {
        const summaryContainer = document.getElementById('attendanceSummary');
        if (!summaryContainer) return;

        const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
        // Compact summary layout
        summaryContainer.innerHTML = `
            <div class="summary-header compact">
                <span><i class="fas fa-chart-bar"></i> Daily Summary</span>
                <button class="export-btn" id="exportAttendanceBtn" title="Export">
                    <i class="fas fa-download"></i>
                </button>
            </div>
            <div class="summary-grid compact">
                <div class="summary-item total-summary"><span class="summary-number">${total}</span> <span class="summary-label">${this.currentTab === 'members' ? 'Members' : 'Trainers'}</span></div>
                <div class="summary-item present-summary"><span class="summary-number">${present}</span> <span class="summary-label">Present</span></div>
                <div class="summary-item absent-summary"><span class="summary-number">${absent}</span> <span class="summary-label">Absent</span></div>
                <div class="summary-item"><span class="summary-number">${attendanceRate}%</span> <span class="summary-label">Rate</span></div>
            </div>
        `;
        document.getElementById('exportAttendanceBtn')?.addEventListener('click', () => {
            this.exportAttendance();
        });
    }

    exportAttendance() {
        const dateStr = this.formatDateLocal(this.currentDate);
        const data = this.currentTab === 'members' ? this.membersData : this.trainersData;
        const filteredData = this.filterExpiredMembers(data);

        const csvContent = this.generateCSV(filteredData, dateStr);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `attendance_${this.currentTab}_${dateStr}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast('Attendance data exported successfully', 'success');
        }
    }

    generateCSV(data, date) {
        const headers = this.currentTab === 'members' 
            ? ['Date', 'Member ID', 'Name', 'Phone', 'Status', 'Check-in Time', 'Membership Expiry']
            : ['Date', 'Trainer ID', 'Name', 'Phone', 'Specialty', 'Status', 'Check-in Time'];

        const rows = data.map(person => {
            const attendanceRecord = this.attendanceData[person._id] || {};
            const status = attendanceRecord.status || 'pending';
            const checkInTime = attendanceRecord.checkInTime || '';

            if (this.currentTab === 'members') {
                return [
                    date,
                    person.membershipId || 'N/A',
                    person.memberName || 'N/A',
                    person.memberPhone || 'N/A',
                    status,
                    checkInTime,
                    person.membershipValidUntil || 'N/A'
                ];
            } else {
                return [
                    date,
                    person._id,
                    person.firstName + ' ' + person.lastName,
                    person.phone || 'N/A',
                    person.specialty || 'N/A',
                    status,
                    checkInTime
                ];
            }
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    getEmptyStateRow() {
        return `
            <div class="attendance-row" style="justify-content: center; align-items: center; grid-column: 1 / -1; padding: 60px 20px;">
                <div style="text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                    <h3 style="margin: 0 0 8px 0; font-size: 1.2rem;">No ${this.currentTab} found</h3>
                    <p style="margin: 0; font-size: 0.9rem;">There are no ${this.currentTab} registered in the system.</p>
                </div>
            </div>
        `;
    }

    showToast(message, type = 'info') {
        // Use unified notification system if available
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast(message, type);
        } else {
            // Fallback to custom toast implementation
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }
    }

    // Auto-remove expired members
    async removeExpiredMembers() {
        const today = new Date();
        const expiredMembers = this.membersData.filter(member => {
            if (!member.membershipValidUntil) return false;
            const expiryDate = new Date(member.membershipValidUntil);
            return expiryDate < today;
        });

        if (expiredMembers.length === 0) return;

        try {
            const response = await fetch(`${this.BASE_URL}/api/members/remove-expired`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({ expiredMemberIds: expiredMembers.map(m => m._id) })
            });

            if (response.ok) {
                this.loadData(); // Reload data
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast(`${expiredMembers.length} expired members removed`, 'info');
                }
            }
        } catch (error) {
            console.error('Error removing expired members:', error);
        }
    }

    // Force refresh attendance history for a person
    async refreshAttendanceHistory(personId) {
        console.log(`🔄 Force refreshing attendance history for person ${personId}`);
        
        // Don't clear existing cache - we'll merge new data
        if (!this.attendanceHistory) this.attendanceHistory = {};
        if (!this.attendanceHistory[personId]) this.attendanceHistory[personId] = {};
        
        // Clear membership info cache
        if (this.membershipInfo && this.membershipInfo[personId]) {
            delete this.membershipInfo[personId];
        }
        
        // Fetch fresh data for current month
        const currentDate = new Date();
        await this.fetchAttendanceHistoryForMonth(personId, currentDate);
        
        console.log(`✅ Refreshed attendance history for ${personId}:`, this.attendanceHistory[personId]);
    }

    // Show attendance history modal
    async showAttendanceHistory(personId, personName, personType) {
        const modal = document.createElement('div');
        modal.className = 'attendance-history-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 800px;
            width: 90%;
            max-height: 90%;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        `;

        modalContent.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #e9ecef; padding-bottom: 15px;">
                <h2 style="margin: 0; color: #1976d2;">
                    <i class="fas fa-calendar-alt"></i> ${personName} - Attendance History
                </h2>
                <div style="display: flex; gap: 10px;">
                    <button id="refreshHistory" style="background: #4caf50; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button id="closeHistoryModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
            </div>
            <div id="membershipInfo" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: none;">
                <h4 style="margin: 0 0 10px 0; color: #1976d2;">Membership Information</h4>
                <div id="membershipDetails"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <button id="prevMonth" style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h3 id="currentMonth" style="margin: 0; min-width: 200px; text-align: center; color: #333;"></h3>
                <button id="nextMonth" style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div style="display: flex; gap: 20px; margin-bottom: 20px; justify-content: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: #4caf50; border-radius: 50%;"></div>
                    <span style="font-size: 14px;">Present</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: #f44336; border-radius: 50%;"></div>
                    <span style="font-size: 14px;">Absent</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: #ff9800; border-radius: 50%;"></div>
                    <span style="font-size: 14px;">Not Marked</span>
                </div>
            </div>
            <div id="attendanceCalendar" style="margin-bottom: 20px;"></div>
            <div id="attendanceStats" style="display: flex; gap: 20px; justify-content: center; padding: 15px; background: #f8f9fa; border-radius: 8px;"></div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        let currentDate = new Date();
        let attendanceHistory = {};
        let membershipInfo = null;
        let isWithinMembershipPeriod = true;

        // Get member/trainer data to find membership dates
        const personData = this.findPersonData(personId, personType);
        console.log('Person data found:', personData);
        
        if (personData && personType === 'members') {
            membershipInfo = {
                joinDate: personData.joinDate,
                membershipValidUntil: personData.membershipValidUntil
            };
            
            // Display membership information
            const membershipInfoDiv = modalContent.querySelector('#membershipInfo');
            const membershipDetailsDiv = modalContent.querySelector('#membershipDetails');
            
            if (membershipInfo.joinDate || membershipInfo.membershipValidUntil) {
                membershipInfoDiv.style.display = 'block';
                const joinDateStr = membershipInfo.joinDate ? new Date(membershipInfo.joinDate).toLocaleDateString() : 'N/A';
                const validUntilStr = membershipInfo.membershipValidUntil ? new Date(membershipInfo.membershipValidUntil).toLocaleDateString() : 'N/A';
                
                membershipDetailsDiv.innerHTML = `
                    <div style="display: flex; gap: 30px;">
                        <div><strong>Join Date:</strong> ${joinDateStr}</div>
                        <div><strong>Valid Until:</strong> ${validUntilStr}</div>
                    </div>
                `;
                
                // Set initial date to join date if available, otherwise current date
                if (membershipInfo.joinDate) {
                    const joinDate = new Date(membershipInfo.joinDate);
                    const today = new Date();
                    // Start from join date or current date, whichever is earlier
                    currentDate = joinDate < today ? new Date(joinDate) : new Date(today);
                } else {
                    currentDate = new Date();
                }
            }
        } else {
            // For trainers, start with current date
            currentDate = new Date();
        }

        // Close modal functionality
        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modalContent.querySelector('#closeHistoryModal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Refresh history button
        modalContent.querySelector('#refreshHistory').addEventListener('click', async () => {
            console.log('🔄 Refreshing attendance history...');
            await this.refreshAttendanceHistory(personId);
            await updateCalendar();
        });

        // Month navigation with membership period validation
        const updateCalendar = async () => {
            // Fetch attendance data for the current month first
            await this.fetchAttendanceHistoryForMonth(personId, currentDate);
            
            // Use membership info from backend if available, otherwise use local data
            let currentMembershipInfo = membershipInfo;
            if (this.membershipInfo && this.membershipInfo[personId]) {
                currentMembershipInfo = this.membershipInfo[personId];
                console.log('Using membership info from backend:', currentMembershipInfo);
            }
            
            // Check if current month is within membership period
            if (personType === 'members' && currentMembershipInfo) {
                const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const joinDate = currentMembershipInfo.joinDate ? new Date(currentMembershipInfo.joinDate) : null;
                const validUntil = currentMembershipInfo.membershipValidUntil ? new Date(currentMembershipInfo.membershipValidUntil) : new Date();
                
                if (joinDate && currentMonth < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1)) {
                    isWithinMembershipPeriod = false;
                } else if (validUntil && currentMonth > new Date(validUntil.getFullYear(), validUntil.getMonth(), 1)) {
                    isWithinMembershipPeriod = false;
                } else {
                    isWithinMembershipPeriod = true;
                }
            }

            const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            modalContent.querySelector('#currentMonth').textContent = monthName;

            // Update navigation buttons based on membership period
            const prevBtn = modalContent.querySelector('#prevMonth');
            const nextBtn = modalContent.querySelector('#nextMonth');
            
            if (personType === 'members' && currentMembershipInfo) {
                const joinDate = currentMembershipInfo.joinDate ? new Date(currentMembershipInfo.joinDate) : null;
                const validUntil = currentMembershipInfo.membershipValidUntil ? new Date(currentMembershipInfo.membershipValidUntil) : new Date();
                
                // Disable previous button if we're at or before join month
                if (joinDate) {
                    const joinMonth = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
                    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    prevBtn.disabled = currentMonth <= joinMonth;
                    prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
                    prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
                }
                
                // Disable next button if we're at or after valid until month
                if (validUntil) {
                    const validUntilMonth = new Date(validUntil.getFullYear(), validUntil.getMonth(), 1);
                    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    nextBtn.disabled = currentMonth >= validUntilMonth;
                    nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
                    nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
                }
            }

            // Show loading state
            modalContent.querySelector('#attendanceCalendar').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <div>Loading attendance data...</div>
                </div>
            `;
            modalContent.querySelector('#attendanceStats').innerHTML = '';

            // Render calendar and stats with updated membership info
            this.renderCalendar(modalContent.querySelector('#attendanceCalendar'), currentDate, personId, currentMembershipInfo);
            this.updateAttendanceStats(modalContent.querySelector('#attendanceStats'), currentDate, personId, currentMembershipInfo);
        };

        modalContent.querySelector('#prevMonth').addEventListener('click', () => {
            if (!modalContent.querySelector('#prevMonth').disabled) {
                currentDate.setMonth(currentDate.getMonth() - 1);
                updateCalendar();
            }
        });

        modalContent.querySelector('#nextMonth').addEventListener('click', () => {
            if (!modalContent.querySelector('#nextMonth').disabled) {
                currentDate.setMonth(currentDate.getMonth() + 1);
                updateCalendar();
            }
        });

        // Initial load
        await updateCalendar();
    }

    // Helper function to find person data
    findPersonData(personId, personType) {
        const data = personType === 'members' ? this.membersData : this.trainersData;
        return data.find(person => person._id === personId);
    }

    // Fetch attendance history for a specific month
    async fetchAttendanceHistoryForMonth(personId, date) {
        try {
            const token = await this.getAuthToken();
            if (!token) return;

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            console.log(`Fetching attendance history for ${personId} from ${startDate} to ${endDate}`);

            const response = await fetch(`${this.BASE_URL}/api/attendance/history/${personId}?startDate=${startDate}&endDate=${endDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const data = await response.json();
                        console.log('Attendance history response:', data);
                        
                        // Initialize attendance history for this person if not exists
                        if (!this.attendanceHistory) this.attendanceHistory = {};
                        if (!this.attendanceHistory[personId]) this.attendanceHistory[personId] = {};
                        
                        // Handle backend response format
                        if (data.history && Array.isArray(data.history)) {
                            console.log(`Found ${data.history.length} attendance records for ${personId}`);
                            data.history.forEach(record => {
                                const dateKey = record.date.split('T')[0];
                                this.attendanceHistory[personId][dateKey] = {
                                    date: dateKey,
                                    status: record.status,
                                    checkInTime: record.checkInTime,
                                    checkOutTime: record.checkOutTime
                                };
                                console.log(`Stored record for ${dateKey}: ${record.status}`);
                            });
                            
                            // Store membership info if available
                            if (data.membershipInfo) {
                                if (!this.membershipInfo) this.membershipInfo = {};
                                this.membershipInfo[personId] = data.membershipInfo;
                                console.log('Membership info stored:', this.membershipInfo[personId]);
                            }
                        } else {
                            // Fallback for old format
                            const history = Array.isArray(data) ? data : [];
                            history.forEach(record => {
                                const dateKey = record.date.split('T')[0];
                                this.attendanceHistory[personId][dateKey] = {
                                    date: dateKey,
                                    status: record.status,
                                    checkInTime: record.checkInTime,
                                    checkOutTime: record.checkOutTime
                                };
                            });
                        }
                        
                        console.log(`Total records loaded for ${personId}:`, Object.keys(this.attendanceHistory[personId]).length);
                        console.log('Attendance history data:', this.attendanceHistory[personId]);
                        
                    } catch (jsonError) {
                        console.warn('Failed to parse attendance history JSON response:', jsonError);
                        return;
                    }
                } else {
                    console.warn('Attendance history API returned non-JSON response');
                    return;
                }
            } else {
                console.warn(`Attendance history API returned status ${response.status}: ${response.statusText}`);
                return;
            }
        } catch (error) {
            console.error('Error fetching attendance history:', error);
            // Fallback to alternative method
            await this.fetchAttendanceHistoryAlternative(personId, startDate, endDate);
        }
    }

    // Alternative method to fetch attendance history using existing endpoint
    async fetchAttendanceHistoryAlternative(personId, startDate, endDate) {
        try {
            const token = await this.getAuthToken();
            if (!token) return;

            console.log(`Using alternative method to fetch attendance from ${startDate} to ${endDate}`);

            if (!this.attendanceHistory) this.attendanceHistory = {};
            if (!this.attendanceHistory[personId]) this.attendanceHistory[personId] = {};

            // Don't clear existing data - we'll merge new data
            // this.attendanceHistory[personId] = {};

            // Fetch attendance data for each day in the range
            const start = new Date(startDate);
            const end = new Date(endDate);
            const promises = [];
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                
                const promise = fetch(`${this.BASE_URL}/api/attendance/${dateStr}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).then(response => {
                    if (response.ok) {
                        return response.json().then(dayData => ({
                            date: dateStr,
                            data: dayData
                        }));
                    }
                    return null;
                }).catch(error => {
                    console.error(`Error fetching attendance for ${dateStr}:`, error);
                    return null;
                });
                
                promises.push(promise);
            }

            // Wait for all requests to complete
            const results = await Promise.all(promises);
            
            // Process results
            results.forEach(result => {
                if (result && result.data && result.data[personId]) {
                    this.attendanceHistory[personId][result.date] = {
                        date: result.date,
                        status: result.data[personId].status,
                        checkInTime: result.data[personId].checkInTime,
                        checkOutTime: result.data[personId].checkOutTime
                    };
                    console.log(`Alternative method stored record for ${result.date}: ${result.data[personId].status}`);
                }
            });

            console.log(`Alternative method loaded ${Object.keys(this.attendanceHistory[personId]).length} records for ${personId}`);
            console.log('Alternative method attendance data:', this.attendanceHistory[personId]);
        } catch (error) {
            console.error('Error in alternative attendance history fetch:', error);
        }
    }

    // Render calendar with attendance data
    renderCalendar(container, date, personId, membershipInfo = null) {
        console.log(`Rendering calendar for personId: ${personId}, date: ${date.toISOString().split('T')[0]}`);
        console.log('Membership info:', membershipInfo);
        console.log('Attendance history for person:', this.attendanceHistory ? this.attendanceHistory[personId] : 'No history');
        
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Always use system date for 'today' (local time, no timezone offset)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

        // Calculate membership period boundaries
        let membershipStart = null;
        let membershipEnd = null;
        
        if (membershipInfo) {
            membershipStart = membershipInfo.joinDate ? new Date(membershipInfo.joinDate) : null;
            membershipEnd = membershipInfo.membershipValidUntil ? new Date(membershipInfo.membershipValidUntil) : null;
            console.log('Membership period:', membershipStart, 'to', membershipEnd);
        }

        let calendarHTML = `
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 10px;">
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Sun</div>
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Mon</div>
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Tue</div>
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Wed</div>
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Thu</div>
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Fri</div>
                <div style="padding: 8px; font-weight: bold; text-align: center; background: #f5f5f5; border-radius: 4px;">Sat</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;">
        `;

        const currentDate = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const dateStr = this.formatDateLocal(currentDate);
            const dayNumber = currentDate.getDate();
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = dateStr === todayStr;
            // Fix: Compare only date parts, not time
            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const isPastDate = currentDateOnly <= todayDateOnly;
            const isSunday = currentDate.getDay() === 0;

            // Check if date is within membership period
            let isWithinMembershipPeriod = true;
            let membershipStatus = '';
            
            if (membershipInfo) {
                const dayDate = new Date(currentDate);
                dayDate.setHours(0, 0, 0, 0);
                
                if (membershipStart) {
                    const startDate = new Date(membershipStart);
                    startDate.setHours(0, 0, 0, 0);
                    if (dayDate < startDate) {
                        isWithinMembershipPeriod = false;
                        membershipStatus = 'before-membership';
                    }
                }
                
                if (membershipEnd) {
                    const endDate = new Date(membershipEnd);
                    endDate.setHours(0, 0, 0, 0);
                    if (dayDate > endDate) {
                        isWithinMembershipPeriod = false;
                        membershipStatus = 'after-membership';
                    }
                }
            }

            let attendanceStatus = 'none';
            let dotColor = 'transparent';
            let statusText = 'No data';
            let checkInTime = '';
            let cellBackground = isCurrentMonth ? (isToday ? '#e3f2fd' : '#fff') : '#f9f9f9';
            let cellOpacity = '1';

            // Handle different cases for attendance status
            if (!isWithinMembershipPeriod) {
                if (membershipStatus === 'before-membership') {
                    statusText = 'Before membership started';
                    cellBackground = '#ffe0e0';
                    cellOpacity = '0.6';
                } else if (membershipStatus === 'after-membership') {
                    statusText = 'After membership expired';
                    cellBackground = '#ffe0e0';
                    cellOpacity = '0.6';
                }
            } else if (isCurrentMonth && isPastDate && this.attendanceHistory && this.attendanceHistory[personId] && this.attendanceHistory[personId][dateStr]) {
                const record = this.attendanceHistory[personId][dateStr];
                attendanceStatus = record.status;
                checkInTime = record.checkInTime || '';
                console.log(`Found attendance record for ${dateStr}: ${record.status}`, record);
                switch (record.status) {
                    case 'present':
                        dotColor = '#4caf50';
                        statusText = `Present${checkInTime ? ' at ' + checkInTime : ''}`;
                        break;
                    case 'absent':
                        dotColor = '#f44336';
                        statusText = 'Absent';
                        break;
                    default:
                        dotColor = '#ff9800';
                        statusText = 'Not marked';
                        break;
                }
            } else if (isCurrentMonth && isToday && this.attendanceData && this.attendanceData[personId] && this.attendanceData[personId].status && this.attendanceData[personId].status !== 'pending') {
                // Special case for today's attendance from attendanceData
                const todayRecord = this.attendanceData[personId];
                attendanceStatus = todayRecord.status;
                checkInTime = todayRecord.checkInTime || '';
                console.log(`Found today's attendance record for ${dateStr}: ${todayRecord.status}`, todayRecord);
                switch (todayRecord.status) {
                    case 'present':
                        dotColor = '#4caf50';
                        statusText = `Present${checkInTime ? ' at ' + checkInTime : ''}`;
                        break;
                    case 'absent':
                        dotColor = '#f44336';
                        statusText = 'Absent';
                        break;
                    default:
                        dotColor = '#ff9800';
                        statusText = 'Not marked';
                        break;
                }
            } else if (isCurrentMonth && isPastDate && !isSunday && isWithinMembershipPeriod) {
                dotColor = '#ff9800';
                statusText = 'Not marked';
                console.log(`No attendance record found for ${dateStr}, marking as not marked`);
            } else if (isSunday && isCurrentMonth) {
                statusText = 'Weekend';
                dotColor = 'transparent';
            } else if (!isPastDate && isCurrentMonth) {
                statusText = 'Future date';
                dotColor = 'transparent';
            } else if (!isCurrentMonth) {
                statusText = 'Outside current month';
                dotColor = 'transparent';
            }

            calendarHTML += `
                <div style="
                    padding: 8px;
                    text-align: center;
                    background: ${cellBackground};
                    color: ${isCurrentMonth ? '#333' : '#ccc'};
                    border-radius: 4px;
                    position: relative;
                    min-height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    border: ${isToday ? '2px solid #1976d2' : '1px solid #e0e0e0'};
                    cursor: ${isCurrentMonth ? 'pointer' : 'default'};
                    transition: all 0.2s ease;
                    opacity: ${cellOpacity};
                " ${isCurrentMonth ? `title="${dayNumber} ${date.toLocaleString('default', { month: 'long' })}: ${statusText}"` : ''}>
                    <span style="font-size: 14px; font-weight: ${isToday ? 'bold' : 'normal'};">${dayNumber}</span>
                    ${dotColor !== 'transparent' ? `<div style="width: 8px; height: 8px; background: ${dotColor}; border-radius: 50%; margin-top: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>` : ''}
                    ${isSunday && isCurrentMonth ? '<div style="position: absolute; top: 2px; right: 2px; font-size: 8px; color: #999;">⚡</div>' : ''}
                    ${!isWithinMembershipPeriod && isCurrentMonth ? '<div style="position: absolute; top: 2px; left: 2px; font-size: 8px; color: #f44336;">✗</div>' : ''}
                </div>
            `;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        calendarHTML += '</div>';
        
        // Add membership period information if available
        if (membershipInfo) {
            const joinDateStr = membershipInfo.joinDate ? new Date(membershipInfo.joinDate).toLocaleDateString() : 'N/A';
            const validUntilStr = membershipInfo.membershipValidUntil ? new Date(membershipInfo.membershipValidUntil).toLocaleDateString() : 'N/A';
            
            calendarHTML += `
                <div style="margin-top: 15px; padding: 10px; background: #f0f8ff; border-radius: 6px; border-left: 4px solid #1976d2;">
                    <small style="color: #666; display: block; margin-bottom: 5px;">
                        <i class="fas fa-info-circle"></i> Membership Period: ${joinDateStr} - ${validUntilStr}
                    </small>
                    <small style="color: #666;">
                        <span style="color: #f44336;">✗</span> Days outside membership period are marked
                    </small>
                </div>
            `;
        }
        
        container.innerHTML = calendarHTML;

        // Add hover effects
        container.querySelectorAll('div[title]').forEach(dayElement => {
            dayElement.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            });
            dayElement.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = 'none';
            });
        });
    }

    // Update attendance statistics for the month
    updateAttendanceStats(container, date, personId, membershipInfo = null) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const today = new Date();

        let presentCount = 0;
        let absentCount = 0;
        let notMarkedCount = 0;
        let totalWorkingDays = 0;

        // Determine membership boundaries
        let membershipStart = null;
        let membershipEnd = null;
        
        if (membershipInfo) {
            membershipStart = membershipInfo.joinDate ? new Date(membershipInfo.joinDate) : null;
            membershipEnd = membershipInfo.membershipValidUntil ? new Date(membershipInfo.membershipValidUntil) : null;
        }

        // Count working days (excluding Sundays) in the month within membership period
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            // Skip Sundays
            if (d.getDay() === 0) continue;
            
            // Fix: Compare only date parts, not time
            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const currentDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            // Skip future dates
            if (currentDateOnly > todayDateOnly) continue;
            
            // Check if date is within membership period
            if (membershipStart && d < membershipStart) continue;
            if (membershipEnd && d > membershipEnd) continue;
            
            totalWorkingDays++;
            const dateStr = this.formatDateLocal(d);
            
            if (this.attendanceHistory && this.attendanceHistory[personId] && this.attendanceHistory[personId][dateStr]) {
                const record = this.attendanceHistory[personId][dateStr];
                if (record.status === 'present') {
                    presentCount++;
                } else if (record.status === 'absent') {
                    absentCount++;
                } else {
                    notMarkedCount++;
                }
            } else {
                notMarkedCount++;
            }
        }

        const attendanceRate = totalWorkingDays > 0 ? Math.round((presentCount / totalWorkingDays) * 100) : 0;

        container.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${presentCount}</div>
                <div style="font-size: 14px; color: #666;">Present</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f44336;">${absentCount}</div>
                <div style="font-size: 14px; color: #666;">Absent</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #ff9800;">${notMarkedCount}</div>
                <div style="font-size: 14px; color: #666;">Not Marked</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #1976d2;">${attendanceRate}%</div>
                <div style="font-size: 14px; color: #666;">Attendance Rate</div>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <div style="font-size: 12px; color: #666;">Working Days: ${totalWorkingDays}</div>
            </div>
        `;
    }

    // ========== BIOMETRIC ATTENDANCE FUNCTIONS ==========

    // Show biometric enrollment modal for a member/trainer
    async showBiometricEnrollment(personId, personType, personName) {
        // First check device connectivity
        const deviceStatus = await this.checkBiometricDeviceStatus();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content biometric-modal">
                <div class="modal-header gradient-header">
                    <div class="header-content">
                        <i class="fas fa-fingerprint"></i>
                        <h3>Biometric Enrollment</h3>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="person-info">
                        <i class="fas fa-user-circle"></i>
                        <div>
                            <strong>${personName}</strong>
                            <span class="person-type">${personType}</span>
                        </div>
                    </div>

                    <div class="device-status-banner ${deviceStatus.connected ? 'status-success' : 'status-error'}">
                        <i class="fas fa-${deviceStatus.connected ? 'check-circle' : 'exclamation-triangle'}"></i>
                        <div>
                            <strong>${deviceStatus.connected ? 'Device Connected' : 'No Device Detected'}</strong>
                            <p>${deviceStatus.message}</p>
                        </div>
                        ${!deviceStatus.connected ? `
                        <button class="btn btn-sm btn-outline" onclick="location.reload()">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="window.attendanceManager.showBiometricAgentSetup(); this.closest('.modal-overlay').remove();">
                            <i class="fas fa-cog"></i> Setup Agent
                        </button>
                    ` : ''}
                    </div>
                    
                    ${deviceStatus.connected ? `
                        <div class="enrollment-tabs">
                            <button class="tab-btn ${deviceStatus.devices.fingerprint > 0 ? 'active' : 'disabled'}" 
                                    data-tab="fingerprint" 
                                    ${deviceStatus.devices.fingerprint === 0 ? 'disabled' : ''}>
                                <i class="fas fa-fingerprint"></i> 
                                <span>Fingerprint</span>
                                <small>${deviceStatus.devices.fingerprint} device(s)</small>
                            </button>
                            <button class="tab-btn ${deviceStatus.devices.camera > 0 && deviceStatus.devices.fingerprint === 0 ? 'active' : deviceStatus.devices.camera === 0 ? 'disabled' : ''}" 
                                    data-tab="face"
                                    ${deviceStatus.devices.camera === 0 ? 'disabled' : ''}>
                                <i class="fas fa-user"></i> 
                                <span>Face Recognition</span>
                                <small>${deviceStatus.devices.camera} device(s)</small>
                            </button>
                        </div>
                        
                        ${deviceStatus.devices.fingerprint > 0 ? `
                            <div class="tab-content ${deviceStatus.devices.fingerprint > 0 ? 'active' : ''}" id="fingerprint-tab">
                                <div class="enrollment-area">
                                    <div class="scanner-visual">
                                        <div class="fingerprint-scanner">
                                            <i class="fas fa-fingerprint scanner-icon"></i>
                                            <div class="scan-animation"></div>
                                        </div>
                                    </div>
                                    <p class="instruction-text"><i class="fas fa-hand-point-up"></i> Place finger on scanner and hold still</p>
                                    <div class="device-info">
                                        <i class="fas fa-microchip"></i>
                                        <span id="fingerprint-device-name">${deviceStatus.deviceNames.fingerprint || 'Detecting...'}</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" id="fingerprint-progress"></div>
                                    </div>
                                    <div class="scan-status" id="fingerprint-status">
                                        <i class="fas fa-circle status-indicator"></i>
                                        <span>Ready to scan</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${deviceStatus.devices.camera > 0 ? `
                            <div class="tab-content ${deviceStatus.devices.fingerprint === 0 && deviceStatus.devices.camera > 0 ? 'active' : ''}" id="face-tab">
                                <div class="enrollment-area">
                                    <div class="camera-visual">
                                        <div class="face-camera">
                                            <i class="fas fa-camera camera-icon"></i>
                                            <div class="face-outline"></div>
                                        </div>
                                    </div>
                                    <p class="instruction-text"><i class="fas fa-camera"></i> Look directly at camera and remain still</p>
                                    <div class="device-info">
                                        <i class="fas fa-video"></i>
                                        <span id="face-device-name">${deviceStatus.deviceNames.camera || 'Detecting...'}</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" id="face-progress"></div>
                                    </div>
                                    <div class="scan-status" id="face-status">
                                        <i class="fas fa-circle status-indicator"></i>
                                        <span>Ready to scan</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    ` : `
                        <div class="no-device-message">
                            <i class="fas fa-plug"></i>
                            <h4>Biometric Agent Not Connected</h4>
                            <p>The biometric agent service is not running or no devices are detected.</p>
                            <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border-left: 4px solid #3a86ff;">
                                <h5 style="margin: 0 0 8px 0; color: #1a1a1a;">
                                    <i class="fas fa-info-circle"></i> Setup Required
                                </h5>
                                <p style="margin: 0 0 12px 0; font-size: 0.95rem; color: #4b5563;">
                                    For production-grade biometric attendance, you need to configure the biometric agent with your hardware devices.
                                </p>
                                <button class="btn btn-primary" onclick="window.attendanceManager.showBiometricAgentSetup(); this.closest('.modal-overlay').remove();" style="width: 100%;">
                                    <i class="fas fa-cog"></i> Go to Biometric Setup
                                </button>
                            </div>
                        </div>
                    `}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    ${deviceStatus.connected ? `
                        <button class="btn btn-primary" id="start-enrollment">
                            <i class="fas fa-play"></i> Start Enrollment
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Tab switching
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabContents = modal.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                modal.querySelector(`#${tabId}-tab`).classList.add('active');
            });
        });

        // Start enrollment
        const startBtn = modal.querySelector('#start-enrollment');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const activeTab = modal.querySelector('.tab-btn.active')?.dataset?.tab;
                if (activeTab) {
                    this.startBiometricEnrollment(personId, personType, activeTab, modal, deviceStatus);
                }
            });
        }
    }

    // Check biometric device status
    async checkBiometricDeviceStatus() {
        try {
            // Check biometric agent health with timeout
            const healthController = new AbortController();
            const healthTimeout = setTimeout(() => healthController.abort(), 5000); // 5 second timeout
            
            const healthResponse = await fetch('http://localhost:5001/health', {
                signal: healthController.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(healthTimeout);
            
            if (!healthResponse.ok) {
                return {
                    connected: false,
                    message: 'Biometric agent service is not running. Please start the agent.',
                    devices: { fingerprint: 0, camera: 0 },
                    deviceNames: {},
                    deviceList: { fingerprint: [], camera: [] }
                };
            }

            // Scan for devices with timeout
            const scanController = new AbortController();
            const scanTimeout = setTimeout(() => scanController.abort(), 8000); // 8 second timeout
            
            const devicesResponse = await fetch('http://localhost:5001/api/devices/scan', {
                method: 'POST',
                signal: scanController.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            clearTimeout(scanTimeout);
            
            const devicesData = await devicesResponse.json();

            if (!devicesData.success) {
                return {
                    connected: false,
                    message: 'Failed to scan for devices',
                    devices: { fingerprint: 0, camera: 0 },
                    deviceNames: {},
                    deviceList: { fingerprint: [], camera: [] }
                };
            }

            // Filter devices by type and status
            const fingerprintDevices = (devicesData.devices || []).filter(d => 
                (d.type === 'fingerprint' || d.category === 'fingerprint') && 
                d.status === 'ready'
            );
            const cameraDevices = (devicesData.devices || []).filter(d => 
                (d.type === 'camera' || d.category === 'camera') && 
                d.status === 'ready'
            );

            return {
                connected: fingerprintDevices.length > 0 || cameraDevices.length > 0,
                message: fingerprintDevices.length > 0 || cameraDevices.length > 0 
                    ? `${fingerprintDevices.length + cameraDevices.length} device(s) ready`
                    : 'No biometric devices detected',
                devices: {
                    fingerprint: fingerprintDevices.length,
                    camera: cameraDevices.length
                },
                deviceNames: {
                    fingerprint: fingerprintDevices[0]?.name || null,
                    camera: cameraDevices[0]?.name || null
                },
                deviceList: {
                    fingerprint: fingerprintDevices,
                    camera: cameraDevices
                }
            };
        } catch (error) {
            console.error('Error checking device status:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Biometric agent is offline. Please start the agent service.';
            if (error.name === 'AbortError') {
                errorMessage = 'Connection timeout. Please check if the biometric agent is running.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to biometric agent. Please ensure it is running on port 5001.';
            }
            
            return {
                connected: false,
                message: errorMessage,
                devices: { fingerprint: 0, camera: 0 },
                deviceNames: {},
                deviceList: { fingerprint: [], camera: [] }
            };
        }
    }

    // Start the actual enrollment process with real hardware
    async startBiometricEnrollment(personId, personType, biometricType, modal, deviceStatus) {
        const progressBar = modal.querySelector(`#${biometricType}-progress`);
        const statusElement = modal.querySelector(`#${biometricType}-status span`);
        const statusIndicator = modal.querySelector(`#${biometricType}-status i`);
        const scannerIcon = modal.querySelector('.scanner-icon, .camera-icon');
        const startBtn = modal.querySelector('#start-enrollment');
        
        if (startBtn) startBtn.disabled = true;
        
        try {
            // Get device ID
            const devices = deviceStatus.deviceList[biometricType];
            if (!devices || devices.length === 0) {
                throw new Error(`No ${biometricType} device available`);
            }
            const deviceId = devices[0].id;

            // Step 1: Initialize
            statusIndicator.className = 'fas fa-spinner fa-spin status-indicator';
            statusElement.textContent = 'Initializing device...';
            progressBar.style.width = '10%';
            progressBar.style.backgroundColor = '#3a86ff';
            
            await this.delay(500);
            
            // Step 2: Ready for capture
            statusIndicator.className = 'fas fa-circle-notch fa-spin status-indicator';
            statusElement.textContent = biometricType === 'fingerprint' 
                ? 'Place finger on scanner' 
                : 'Position face in camera view';
            progressBar.style.width = '25%';
            if (scannerIcon) scannerIcon.classList.add('scanning');
            
            // Step 3: Call biometric agent to enroll with timeout
            const agentEndpoint = `http://localhost:5001/api/${biometricType}/enroll`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout for enrollment
            
            const enrollResponse = await fetch(agentEndpoint, {
                method: 'POST',
                signal: controller.signal,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    personId,
                    personType,
                    gymId: this.authManager?.gymId || 'default',
                    deviceId
                })
            });
            clearTimeout(timeout);

            if (!enrollResponse.ok) {
                const errorData = await enrollResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Device enrollment failed');
            }

            const enrollResult = await enrollResponse.json();
            
            if (!enrollResult.success) {
                throw new Error(enrollResult.error || 'Enrollment failed');
            }

            // Step 4: Capturing
            statusIndicator.className = 'fas fa-fingerprint status-indicator text-warning';
            statusElement.textContent = 'Capturing biometric data...';
            progressBar.style.width = '60%';
            
            await this.delay(1000);
            
            // Step 5: Save to backend
            statusIndicator.className = 'fas fa-cloud-upload-alt status-indicator';
            statusElement.textContent = 'Saving enrollment data...';
            progressBar.style.width = '80%';
            
            const backendResponse = await fetch(`${this.BASE_URL}/api/biometric/enroll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    personId,
                    personType,
                    biometricType,
                    deviceId,
                    enrollmentOptions: {
                        templateId: enrollResult.templateId,
                        quality: enrollResult.quality
                    }
                })
            });

            if (!backendResponse.ok) {
                const errorData = await backendResponse.json();
                throw new Error(errorData.error || 'Failed to save enrollment data');
            }

            const backendResult = await backendResponse.json();
            
            // Step 6: Success
            statusIndicator.className = 'fas fa-check-circle status-indicator text-success';
            statusElement.textContent = 'Enrollment successful!';
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#00b026';
            
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(
                    `${biometricType} enrollment completed successfully`, 
                    'success'
                );
            }
            
            setTimeout(() => {
                modal.remove();
                this.loadData(); // Refresh to show updated biometric status
            }, 2000);
            
        } catch (error) {
            console.error('Enrollment error:', error);
            statusIndicator.className = 'fas fa-exclamation-circle status-indicator text-danger';
            statusElement.textContent = 'Enrollment failed: ' + error.message;
            progressBar.style.backgroundColor = '#ef233c';
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Biometric enrollment failed', 'error');
            }
            console.error('Enrollment error:', error);
        } finally {
            scannerIcon.classList.remove('scanning');
        }
    }

    // Verify biometric and mark attendance instantly
    async verifyBiometricAttendance(personId, personType, biometricType = 'fingerprint') {
        // Show loading notification
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast(
                'Checking device connection...', 
                'info', 
                3000
            );
        }
        
        try {
            // Check device status first
            const deviceStatus = await this.checkBiometricDeviceStatus();
            
            if (!deviceStatus.connected) {
                throw new Error('Biometric agent is not running. Please start the agent service and try again.');
            }
            
            if (deviceStatus.devices[biometricType] === 0) {
                throw new Error(`No ${biometricType} device detected. Please connect a device and try again.`);
            }

            // Get device ID
            const devices = deviceStatus.deviceList[biometricType];
            if (!devices || devices.length === 0) {
                throw new Error(`No ${biometricType} device available`);
            }
            const deviceId = devices[0].id;

            // Show scanning notification
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(
                    'Place finger on scanner...', 
                    'info', 
                    5000
                );
            }

            // Step 1: Call biometric agent to verify with timeout
            const agentEndpoint = `http://localhost:5001/api/${biometricType}/verify`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const verifyResponse = await fetch(agentEndpoint, {
                method: 'POST',
                signal: controller.signal,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    personId,
                    gymId: this.authManager?.gymId || 'default',
                    deviceId
                })
            });
            clearTimeout(timeout);

            if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Device verification failed');
            }

            const verifyResult = await verifyResponse.json();
            
            if (!verifyResult.success || !verifyResult.verified) {
                throw new Error('Fingerprint not recognized. Please try again or enroll first.');
            }

            // Step 2: Mark attendance on backend
            const response = await fetch(`${this.BASE_URL}/api/biometric/verify-attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    personId,
                    personType,
                    biometricType,
                    deviceId,
                    verificationOptions: {
                        confidence: verifyResult.confidence,
                        matchScore: verifyResult.matchScore
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to mark attendance');
            }

            const result = await response.json();
            
            if (result.success && result.verified) {
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast(
                        `✓ ${biometricType} verified! Attendance marked successfully.`,
                        'success',
                        3000
                    );
                }
                
                // Instantly refresh attendance data to show the update
                await this.loadData();
                
                return result;
            } else {
                throw new Error('Biometric not recognized');
            }
            
        } catch (error) {
            console.error('Verification error:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(
                    error.message || 'Biometric verification failed',
                    'error',
                    4000
                );
            }
            throw error;
        }
    }

    // Generate mock biometric template for development
    generateMockTemplate(biometricType) {
        if (biometricType === 'fingerprint') {
            return {
                minutiae: Array.from({length: 20}, () => ({
                    x: Math.floor(Math.random() * 256),
                    y: Math.floor(Math.random() * 256),
                    angle: Math.floor(Math.random() * 360),
                    type: Math.random() > 0.5 ? 'ridge_ending' : 'bifurcation'
                })),
                quality: Math.floor(Math.random() * 30) + 70 // 70-100
            };
        } else if (biometricType === 'face') {
            return {
                encoding: Array.from({length: 128}, () => Math.random() * 2 - 1),
                landmarks: Array.from({length: 68}, () => ({
                    x: Math.floor(Math.random() * 256),
                    y: Math.floor(Math.random() * 256)
                })),
                quality: Math.floor(Math.random() * 30) + 70 // 70-100
            };
        }
    }

    // Add biometric status indicators to attendance rows
    addBiometricStatusToRows() {
        const rows = document.querySelectorAll('.attendance-row');
        
        rows.forEach(row => {
            const personId = row.dataset.personId;
            const personType = row.dataset.personType;
            
            if (!personId) return;
            
            // Check if biometric status already added
            if (row.querySelector('.biometric-status')) return;
            
            const statusContainer = document.createElement('div');
            statusContainer.className = 'biometric-status';
            statusContainer.innerHTML = `
                <div class="biometric-indicators">
                    <span class="biometric-indicator fingerprint" title="Fingerprint enrolled">
                        <i class="fas fa-fingerprint"></i>
                    </span>
                    <span class="biometric-indicator face" title="Face recognition enrolled">
                        <i class="fas fa-user"></i>
                    </span>
                </div>
                <div class="biometric-actions">
                    <button class="btn btn-sm btn-biometric" onclick="window.attendanceManager.showBiometricEnrollment('${personId}', '${personType}', '${row.querySelector('.member-name, .trainer-name')?.textContent || 'Unknown'}')">
                        <i class="fas fa-plus"></i> Enroll
                    </button>
                    <button class="btn btn-sm btn-verify" onclick="window.attendanceManager.verifyBiometricAttendance('${personId}', '${personType}', 'fingerprint')">
                        <i class="fas fa-fingerprint"></i> Verify
                    </button>
                </div>
            `;
            
            // Add to the row (append to the end)
            row.appendChild(statusContainer);
        });
    }

    // Quick Biometric Verify Modal
    async showQuickVerifyModal() {
        const deviceStatus = await this.checkBiometricDeviceStatus();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content biometric-modal quick-verify-modal">
                <div class="modal-header gradient-header">
                    <div class="header-content">
                        <i class="fas fa-fingerprint"></i>
                        <h3>Quick Biometric Verification</h3>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${deviceStatus.connected ? `
                        <div class="device-status-banner status-success">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <strong>Device Ready</strong>
                                <p>${deviceStatus.message}</p>
                            </div>
                        </div>
                        
                        <div class="quick-verify-area">
                            <div class="scanner-visual">
                                <div class="fingerprint-scanner" id="quickVerifyScanner">
                                    <i class="fas fa-fingerprint scanner-icon"></i>
                                    <div class="scan-animation"></div>
                                </div>
                            </div>
                            <p class="instruction-text">
                                <i class="fas fa-hand-point-up"></i> 
                                Place any enrolled finger on the scanner
                            </p>
                            <div class="device-info">
                                <i class="fas fa-microchip"></i>
                                <span>${deviceStatus.deviceNames.fingerprint || 'Fingerprint Scanner'}</span>
                            </div>
                            <div class="verify-status" id="quickVerifyStatus">
                                <i class="fas fa-circle status-indicator"></i>
                                <span>Waiting for fingerprint...</span>
                            </div>
                            <div class="verify-result" id="verifyResult" style="display: none;"></div>
                        </div>
                    ` : `
                        <div class="device-status-banner status-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>No Device Connected</strong>
                                <p>${deviceStatus.message}</p>
                            </div>
                            <button class="btn btn-outline" onclick="location.reload()">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                        
                        <div class="no-device-message">
                            <i class="fas fa-plug"></i>
                            <h4>Connect Biometric Device</h4>
                            <p>Please connect a fingerprint scanner to use quick verification.</p>
                        </div>
                    `}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    ${deviceStatus.connected ? `
                        <button class="btn btn-primary" id="startQuickVerify">
                            <i class="fas fa-play"></i> Start Scanning
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        if (deviceStatus.connected) {
            const startBtn = modal.querySelector('#startQuickVerify');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    this.startQuickVerification(modal, deviceStatus);
                });
            }
        }
    }

    // Start quick verification process
    async startQuickVerification(modal, deviceStatus) {
        const scanner = modal.querySelector('#quickVerifyScanner');
        const statusElement = modal.querySelector('#quickVerifyStatus span');
        const statusIndicator = modal.querySelector('#quickVerifyStatus i');
        const resultDiv = modal.querySelector('#verifyResult');
        const startBtn = modal.querySelector('#startQuickVerify');
        
        if (startBtn) startBtn.disabled = true;
        if (scanner) scanner.querySelector('.scanner-icon').classList.add('scanning');
        
        try {
            statusIndicator.className = 'fas fa-spinner fa-spin status-indicator';
            statusElement.textContent = 'Scanning for fingerprint...';
            
            const devices = deviceStatus.deviceList.fingerprint;
            if (!devices || devices.length === 0) {
                throw new Error('No fingerprint device available');
            }
            const deviceId = devices[0].id;

            // Continuous scanning mode - wait for fingerprint
            statusElement.textContent = 'Place finger on scanner now...';
            
            // Call verification endpoint without personId to identify who it is
            const verifyResponse = await fetch('http://localhost:5001/api/fingerprint/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gymId: this.authManager?.gymId || 'default',
                    deviceId,
                    identifyMode: true  // This mode identifies the person
                })
            });

            if (!verifyResponse.ok) {
                throw new Error('Verification failed');
            }

            const verifyResult = await verifyResponse.json();
            
            if (verifyResult.success && verifyResult.verified && verifyResult.personId) {
                // Person identified, now mark attendance
                statusIndicator.className = 'fas fa-check-circle status-indicator text-success';
                statusElement.textContent = 'Person identified! Marking attendance...';
                
                // Get person details
                const personType = verifyResult.personType || 'Member';
                const personId = verifyResult.personId;
                
                // Mark attendance
                await this.verifyBiometricAttendance(personId, personType, 'fingerprint');
                
                // Show success
                resultDiv.style.display = 'block';
                resultDiv.className = 'verify-result success';
                resultDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <h4>Attendance Marked!</h4>
                    <p>Successfully verified and marked attendance</p>
                `;
                
                setTimeout(() => modal.remove(), 3000);
                
            } else {
                throw new Error('Fingerprint not recognized in database');
            }
            
        } catch (error) {
            console.error('Quick verification error:', error);
            statusIndicator.className = 'fas fa-exclamation-circle status-indicator text-danger';
            statusElement.textContent = 'Verification failed';
            
            resultDiv.style.display = 'block';
            resultDiv.className = 'verify-result error';
            resultDiv.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <h4>Verification Failed</h4>
                <p>${error.message || 'Fingerprint not recognized'}</p>
            `;
            
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Try Again';
            }
        } finally {
            if (scanner) scanner.querySelector('.scanner-icon').classList.remove('scanning');
        }
    }

    // Show biometric agent status indicator
    async showAgentStatus() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'biometric-agent-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        
        try {
            const status = await this.checkBiometricDeviceStatus();
            
            if (status.connected) {
                statusDiv.style.background = 'linear-gradient(135deg, #00b026 0%, #00d930 100%)';
                statusDiv.style.color = 'white';
                statusDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span><strong>Agent Online</strong> - ${status.devices.fingerprint} fingerprint, ${status.devices.camera} camera</span>
                `;
            } else {
                statusDiv.style.background = 'linear-gradient(135deg, #ef233c 0%, #ff4757 100%)';
                statusDiv.style.color = 'white';
                statusDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>Agent Offline</strong> - ${status.message}</span>
                    <button onclick="window.attendanceManager.showBiometricAgentSetup()" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 4px 8px; border-radius: 4px; margin-left: 8px; cursor: pointer; transition: all 0.2s ease;">
                        <i class="fas fa-cog"></i> Setup Agent
                    </button>
                `;
            }
        } catch (error) {
            statusDiv.style.background = 'linear-gradient(135deg, #ef233c 0%, #ff4757 100%)';
            statusDiv.style.color = 'white';
            statusDiv.innerHTML = `
                <i class="fas fa-times-circle"></i>
                <span><strong>Connection Error</strong> - Cannot reach biometric agent</span>
            `;
        }
        
        // Remove existing status if any
        const existing = document.getElementById('biometric-agent-status');
        if (existing) existing.remove();
        
        document.body.appendChild(statusDiv);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (statusDiv && statusDiv.parentNode) {
                statusDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => statusDiv.remove(), 300);
            }
        }, 10000);
    }

    // Show biometric agent setup modal (production-grade)
    async showBiometricAgentSetup() {
        // Check if agent is running
        const isRunning = await this.isAgentRunning();
        
        if (!isRunning) {
            this.showAgentInstallationGuide();
            return;
        }
        
        // Agent is running, show device configuration
        this.showDeviceConfigurationModal();
    }

    // Show agent installation guide
    showAgentInstallationGuide() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content biometric-modal" style="max-width: 650px;">
                <div class="modal-header gradient-header">
                    <div class="header-content">
                        <i class="fas fa-rocket"></i>
                        <h3>Setup Biometric Agent</h3>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info" style="background: linear-gradient(135deg, #3a86ff 0%, #667eea 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 24px; display: flex; align-items: start; gap: 12px;">
                        <i class="fas fa-info-circle" style="font-size: 24px; margin-top: 2px;"></i>
                        <div>
                            <strong style="font-size: 1.1rem; display: block; margin-bottom: 6px;">Agent Not Running</strong>
                            <p style="margin: 0;">One-click automatic installation and setup for production-grade biometric hardware.</p>
                        </div>
                    </div>
                    
                    <div style="padding: 24px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; margin-bottom: 20px; border: 2px solid #3b82f6;">
                        <h4 style="margin: 0 0 16px 0; color: #1e40af; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-magic"></i> Fully Automated Installation
                        </h4>
                        
                        <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i> Install all drivers automatically
                            </p>
                            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i> Configure biometric agent service
                            </p>
                            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i> Auto-detect and setup devices
                            </p>
                            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i> Start agent service automatically
                            </p>
                            <p style="margin: 0; color: #374151; font-weight: 500;">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i> Never closes unexpectedly - always shows errors
                            </p>
                        </div>
                        
                        <button class="btn btn-primary" onclick="window.attendanceManager.autoInstallAgent()" style="width: 100%; padding: 14px; font-size: 1rem; font-weight: 600;">
                            <i class="fas fa-download"></i> Download Installers (2 files)
                        </button>
                        <p style="margin: 12px 0 0 0; font-size: 0.85rem; color: #1e40af; text-align: center;">
                            <i class="fas fa-info-circle"></i> Downloads simple PowerShell + BAT installer
                        </p>
                    </div>
                    
                    <div style="padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <h5 style="margin: 0 0 12px 0; color: #374151; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-laptop-code"></i> What Happens Next?
                        </h5>
                        <ol style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 0.9rem; line-height: 1.8;">
                            <li>Installer downloads automatically (enhanced-installer.bat)</li>
                            <li>Run the installer file (opens automatically)</li>
                            <li>Setup wizard installs all required drivers</li>
                            <li>Agent service starts automatically</li>
                            <li>This page refreshes to show device configuration</li>
                        </ol>
                    </div>
                    
                    <div style="margin-top: 16px; padding: 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; color: #78350f; font-size: 0.9rem;">
                            <i class="fas fa-exclamation-triangle"></i> <strong>System Requirements:</strong> Windows 10/11 (64-bit), Node.js 14+, USB ports
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn btn-outline" onclick="window.attendanceManager.showManualInstallGuide()">
                        <i class="fas fa-book"></i> Manual Setup
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Show device configuration modal (when agent is running)
    async showDeviceConfigurationModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content biometric-modal" style="max-width: 700px;">
                <div class="modal-header gradient-header">
                    <div class="header-content">
                        <i class="fas fa-cogs"></i>
                        <h3>Configure Biometric Devices</h3>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <i class="fas fa-check-circle"></i>
                        <strong>Agent Connected</strong>
                        <p style="margin: 8px 0 0 0;">Biometric agent is running and ready for device configuration.</p>
                    </div>
                    
                    <div style="padding: 20px; background: #f9fafb; border-radius: 12px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 16px 0; color: #1a1a1a;">
                            <i class="fas fa-usb"></i> Connected Devices
                        </h4>
                        
                        <div id="devicesList" style="min-height: 100px;">
                            <div style="text-align: center; color: #6b7280; padding: 20px;">
                                <i class="fas fa-spinner fa-spin"></i> Scanning for devices...
                            </div>
                        </div>
                        
                        <button class="btn btn-outline" onclick="window.attendanceManager.scanBiometricDevices()" style="width: 100%; margin-top: 12px;">
                            <i class="fas fa-sync"></i> Refresh Device List
                        </button>
                    </div>
                    
                    <div style="padding: 16px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h5 style="margin: 0 0 8px 0; color: #1e40af;">
                            <i class="fas fa-lightbulb"></i> Supported Devices
                        </h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;">
                            <div style="padding: 12px; background: white; border-radius: 6px;">
                                <strong style="color: #1f2937;"><i class="fas fa-fingerprint"></i> Fingerprint</strong>
                                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #6b7280;">Mantra, SecuGen, Bio-Max, Startek, Evolute, Precision</p>
                            </div>
                            <div style="padding: 12px; background: white; border-radius: 6px;">
                                <strong style="color: #1f2937;"><i class="fas fa-camera"></i> Camera</strong>
                                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #6b7280;">USB/Built-in cameras (720p min, 1080p recommended)</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn btn-primary" onclick="window.attendanceManager.testBiometricConnection()">
                        <i class="fas fa-heartbeat"></i> Test Connection
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-scan for devices
        setTimeout(() => {
            this.scanBiometricDevices();
        }, 500);
    }

    // Scan for biometric devices
    async scanBiometricDevices() {
        const devicesList = document.getElementById('devicesList');
        if (!devicesList) return;
        
        devicesList.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Scanning for devices...</div>';
        
        try {
            const response = await fetch('http://localhost:5001/api/devices/scan', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const devices = data.devices || [];
                
                if (devices.length > 0) {
                    devicesList.innerHTML = devices.map(device => `
                        <div style="background: white; padding: 16px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #10b981; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-${device.type === 'fingerprint' ? 'fingerprint' : 'camera'}" style="font-size: 24px; color: #10b981;"></i>
                            <div style="flex: 1;">
                                <strong style="color: #1f2937;">${device.name || 'Unknown Device'}</strong>
                                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #6b7280;">
                                    ${device.type || 'Unknown Type'} • ${device.status || 'Ready'}
                                </p>
                            </div>
                            <span style="padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                <i class="fas fa-check"></i> Connected
                            </span>
                        </div>
                    `).join('');
                    
                    if (window.unifiedNotificationSystem) {
                        window.unifiedNotificationSystem.showToast(`Found ${devices.length} device(s)`, 'success', 2000);
                    }
                } else {
                    devicesList.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #9ca3af;">
                            <i class="fas fa-plug" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                            <h4 style="margin: 0 0 8px 0; color: #6b7280;">No Devices Found</h4>
                            <p style="margin: 0; font-size: 0.9rem;">Please connect your biometric devices and click refresh.</p>
                        </div>
                    `;
                    
                    if (window.unifiedNotificationSystem) {
                        window.unifiedNotificationSystem.showToast('No biometric devices detected', 'warning', 2000);
                    }
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            devicesList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h4 style="margin: 0 0 8px 0;">Connection Error</h4>
                    <p style="margin: 0; font-size: 0.9rem;">Unable to scan devices. Please ensure the agent is running.</p>
                </div>
            `;
            
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Device scan failed', 'error', 2000);
            }
        }
    }

    // Auto-install biometric agent (automatic execution)
    async autoInstallAgent() {
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast(
                'Downloading installers...', 
                'info', 
                2000
            );
        }
        
        try {
            // Download Simple PowerShell installer (RECOMMENDED - never closes unexpectedly)
            const simpleLink = document.createElement('a');
            simpleLink.href = '/biometric-agent/simple-installer.ps1';
            simpleLink.download = 'biometric-agent-simple-installer.ps1';
            simpleLink.style.display = 'none';
            document.body.appendChild(simpleLink);
            simpleLink.click();
            document.body.removeChild(simpleLink);
            
            // Small delay between downloads
            await this.delay(500);
            
            // Download BAT installer (alternative)
            const batLink = document.createElement('a');
            batLink.href = '/biometric-agent/enhanced-installer.bat';
            batLink.download = 'biometric-agent-installer.bat';
            batLink.style.display = 'none';
            document.body.appendChild(batLink);
            batLink.click();
            document.body.removeChild(batLink);
            
            // Show success message with next steps
            setTimeout(() => {
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast(
                        '✅ Installers downloaded! Follow the instructions.', 
                        'success', 
                        5000
                    );
                }
                
                // Show post-download instructions
                this.showPostDownloadInstructions();
            }, 1000);
            
        } catch (error) {
            console.error('Download error:', error);
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(
                    'Download failed. Please try manual installation.', 
                    'error', 
                    4000
                );
            }
        }
    }

    // Show post-download instructions
    showPostDownloadInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content biometric-modal" style="max-width: 650px;">
                <div class="modal-header gradient-header">
                    <div class="header-content">
                        <i class="fas fa-check-circle"></i>
                        <h3>Installation Files Ready!</h3>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-download" style="font-size: 64px; color: #10b981; margin-bottom: 20px;"></i>
                        <h4 style="margin: 0 0 12px 0; color: #1f2937;">Downloaded to your Downloads folder</h4>
                        <p style="margin: 0 0 24px 0; color: #6b7280;">Two installers provided - choose one</p>
                        
                        <div style="padding: 20px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; margin-bottom: 16px; border: 3px solid #10b981; text-align: left;">
                            <h5 style="margin: 0 0 12px 0; color: #065f46; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-star" style="color: #fbbf24; font-size: 1.2rem;"></i>
                                <span style="font-size: 1.1rem;">RECOMMENDED: Simple PowerShell Installer</span>
                            </h5>
                            <div style="background: white; padding: 14px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <p style="margin: 0 0 10px 0; color: #374151; font-weight: 600; font-size: 0.95rem;">
                                    <i class="fas fa-file-code" style="color: #3b82f6;"></i> biometric-agent-simple-installer.ps1
                                </p>
                                <ol style="margin: 0; padding-left: 20px; color: #1f2937; line-height: 1.8; font-size: 0.9rem;">
                                    <li><strong>Right-click</strong> the file in Downloads</li>
                                    <li>Select <strong>"Run with PowerShell"</strong></li>
                                    <li>Wait 2-3 minutes for automatic setup</li>
                                    <li>Done! Agent starts automatically</li>
                                </ol>
                            </div>
                            <div style="padding: 10px; background: rgba(16, 185, 129, 0.15); border-radius: 6px; border-left: 3px solid #10b981;">
                                <p style="margin: 0; color: #065f46; font-size: 0.85rem; font-weight: 500;">
                                    <i class="fas fa-shield-check"></i> <strong>Why this one?</strong>
                                </p>
                                <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #065f46; font-size: 0.85rem; line-height: 1.6;">
                                    <li><strong>Never closes unexpectedly</strong> - always shows errors</li>
                                    <li>Clear step-by-step progress with colors</li>
                                    <li>Pauses on errors so you can read them</li>
                                    <li>Auto-opens Node.js download if missing</li>
                                    <li>Most reliable for production use</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div style="padding: 16px; background: #f9fafb; border-radius: 12px; margin-bottom: 16px; border: 1px solid #e5e7eb; text-align: left;">
                            <h5 style="margin: 0 0 8px 0; color: #6b7280; font-size: 0.95rem;">
                                <i class="fas fa-terminal"></i> Alternative: BAT Installer
                            </h5>
                            <div style="background: white; padding: 10px; border-radius: 6px;">
                                <p style="margin: 0 0 6px 0; color: #374151; font-size: 0.9rem;">
                                    <i class="fas fa-file-code" style="color: #6b7280;"></i> biometric-agent-installer.bat
                                </p>
                                <p style="margin: 0; color: #6b7280; font-size: 0.85rem;">
                                    Right-click → <strong>"Run as Administrator"</strong>
                                </p>
                            </div>
                        </div>
                        
                        <div style="padding: 14px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; border-left: 4px solid #3b82f6; text-align: left;">
                            <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 0.9rem; font-weight: 600;">
                                <i class="fas fa-info-circle"></i> What happens automatically:
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 0.85rem; line-height: 1.6;">
                                <li>Checks system requirements (Node.js, npm, admin rights)</li>
                                <li>Installs all npm dependencies</li>
                                <li>Configures Windows service (auto-start on boot)</li>
                                <li>Detects and configures biometric devices</li>
                                <li>Opens agent interface: http://localhost:5001</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Refresh After Install
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-close after 60 seconds (more time to read instructions)
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 60000);
    }

    // Show manual installation guide
    showManualInstallGuide() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content biometric-modal" style="max-width: 600px;">
                <div class="modal-header gradient-header">
                    <div class="header-content">
                        <i class="fas fa-book"></i>
                        <h3>Manual Installation Guide</h3>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    <div style="padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 16px;">
                        <h4 style="margin: 0 0 12px 0; color: #1f2937;">
                            <i class="fas fa-terminal"></i> Option 1: Run Installer Directly
                        </h4>
                        <ol style="margin: 0; padding-left: 20px; color: #6b7280; line-height: 1.8;">
                            <li>Navigate to: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">biometric-agent/</code> folder</li>
                            <li>Right-click <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">enhanced-installer.bat</code></li>
                            <li>Select "Run as Administrator"</li>
                            <li>Follow the automated setup</li>
                        </ol>
                    </div>
                    
                    <div style="padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 16px;">
                        <h4 style="margin: 0 0 12px 0; color: #1f2937;">
                            <i class="fas fa-rocket"></i> Option 2: Quick Start Script
                        </h4>
                        <ol style="margin: 0; padding-left: 20px; color: #6b7280; line-height: 1.8;">
                            <li>Navigate to: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">biometric-agent/</code> folder</li>
                            <li>Double-click <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">quick-start.bat</code></li>
                            <li>Agent will start automatically</li>
                            <li>Keep the window open while using</li>
                        </ol>
                    </div>
                    
                    <div style="padding: 16px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; border: 1px solid #3b82f6;">
                        <h5 style="margin: 0 0 8px 0; color: #1e40af;">
                            <i class="fas fa-lightbulb"></i> Pro Tip
                        </h5>
                        <p style="margin: 0; color: #1e40af; font-size: 0.9rem;">
                            The enhanced installer includes all drivers and sets up the agent as a Windows service that starts automatically with your system.
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="window.attendanceManager.autoInstallAgent(); this.closest('.modal-overlay').remove();">
                        <i class="fas fa-download"></i> Download Installer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Test biometric connection
    async testBiometricConnection() {
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast('Testing connection...', 'info', 2000);
        }
        
        try {
            const isRunning = await this.isAgentRunning();
            
            if (isRunning) {
                if (window.unifiedNotificationSystem) {
                    window.unifiedNotificationSystem.showToast(
                        '✅ Biometric agent connection successful!', 
                        'success', 
                        3000
                    );
                }
            } else {
                throw new Error('Agent not responding');
            }
        } catch (error) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast(
                    '❌ Connection test failed', 
                    'error', 
                    3000
                );
            }
        }
    }

    // Check if agent is running (quick check)
    async isAgentRunning() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch('http://localhost:5001/health', {
                signal: controller.signal
            });
            clearTimeout(timeout);
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Simulate delay for demo purposes
    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Hide toast message
    hideToast(toastElement) {
        if (toastElement && toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
        }
    }
}

// Initialize attendance manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the attendance tab
    if (document.getElementById('attendanceTab')) {
        window.attendanceManager = new AttendanceManager();
        
        // Auto-remove expired members daily
        setInterval(() => {
            window.attendanceManager.removeExpiredMembers();
        }, 24 * 60 * 60 * 1000); // Run once per day
    }
});

// Export for global access
window.AttendanceManager = AttendanceManager;