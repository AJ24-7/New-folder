// Attendance Statistics Module
class AttendanceStats {
    async renderDashboardChart(forceCurrentMonthYear = false) {
        const chartContainer = document.querySelector('.chart-container');
        const ctx = document.getElementById('dashboardAttendanceChart');
        if (!ctx || !chartContainer) return;

        // Use skeleton loading instead of custom spinner
        if (window.showSkeleton) {
            window.showSkeleton('dashboardAttendanceChart', 'chart');
        }

        // Destroy existing chart if it exists
        if (this.dashboardChart) {
            this.dashboardChart.destroy();
        }

        // Set month/year from dashboard filter, or force current month/year on initial load
        const monthSelect = document.getElementById('dashboardChartMonth');
        const yearSelect = document.getElementById('dashboardChartYear');
        let month, year;
        const now = new Date();
        if (monthSelect && yearSelect && !forceCurrentMonthYear) {
            month = parseInt(monthSelect.value);
            year = parseInt(yearSelect.value);
        } else {
            month = now.getMonth();
            year = now.getFullYear();
            if (monthSelect) monthSelect.value = month;
            if (yearSelect) {
                if (yearSelect.options.length === 0) {
                    const currentYear = now.getFullYear();
                    for (let y = currentYear - 3; y <= currentYear + 1; y++) {
                        const opt = document.createElement('option');
                        opt.value = y;
                        opt.textContent = y;
                        if (y === currentYear) opt.selected = true;
                        yearSelect.appendChild(opt);
                    }
                }
                yearSelect.value = year;
            }
        }

        // Always fetch fresh data for selected month/year
        this._dashboardChartData = null;
        this.getMonthlyAttendanceData(month, year).then(data => {
            this._dashboardChartData = data;
            this._dashboardChartDataMonth = month;
            this._dashboardChartDataYear = year;
            this._renderDashboardChartWithData(data);
        });

        // Add change listeners for dashboard chart filters (with smooth spinner)
        if (monthSelect && !monthSelect._listenerAdded) {
            monthSelect.addEventListener('change', () => {
                this.renderDashboardChart();
            });
            monthSelect._listenerAdded = true;
        }
        if (yearSelect && !yearSelect._listenerAdded) {
            yearSelect.addEventListener('change', () => {
                this.renderDashboardChart();
            });
            yearSelect._listenerAdded = true;
        }
    }

    _renderDashboardChartWithData(data) {
        const ctx = document.getElementById('dashboardAttendanceChart');
        if (!ctx) return;
        
        // Hide skeleton loading
        if (window.hideSkeleton) {
            window.hideSkeleton('dashboardAttendanceChart');
        }
        
        if (this.dashboardChart) {
            this.dashboardChart.destroy();
        }
        this.dashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Members Present',
                        data: data.membersData,
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Trainers Present',
                        data: data.trainersData,
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Total Present',
                        data: data.overallData,
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of People'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        // Skeleton loading is already hidden in the function above
    }

    constructor() {
        this.chart = null;
        this.attendanceData = {};
        this.membersData = [];
        this.trainersData = [];
        this.init();
        // Always set dashboard chart filters to current month/year before rendering
        setTimeout(() => {
            const now = new Date();
            const monthSelect = document.getElementById('dashboardChartMonth');
            const yearSelect = document.getElementById('dashboardChartYear');
            if (monthSelect) monthSelect.value = now.getMonth().toString();
            if (yearSelect) {
                if (yearSelect.options.length === 0) {
                    const currentYear = now.getFullYear();
                    for (let y = currentYear - 3; y <= currentYear + 1; y++) {
                        const opt = document.createElement('option');
                        opt.value = y;
                        opt.textContent = y;
                        if (y === currentYear) opt.selected = true;
                        yearSelect.appendChild(opt);
                    }
                }
                yearSelect.value = now.getFullYear().toString();
            }
            this.renderDashboardChart();
        }, 100);
    }

    init() {
        this.bindEvents();
        this.setCurrentMonthYear();
        // Only load today's attendance for stat card/modal, not for dashboard chart
        this.loadTodayAttendance();
    }

    bindEvents() {
        // Attendance stat card click
        document.getElementById('attendanceStatCard')?.addEventListener('click', () => {
            this.showAttendanceModal();
        });

        // Modal close
        document.getElementById('closeAttendanceStats')?.addEventListener('click', () => {
            this.hideAttendanceModal();
        });

        // Chart controls
        document.getElementById('attendanceChartMonth')?.addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('attendanceChartYear')?.addEventListener('change', () => {
            this.updateChart();
        });

        // Close modal when clicking outside
        document.getElementById('attendanceStatsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'attendanceStatsModal') {
                this.hideAttendanceModal();
            }
        });
    }

    setCurrentMonthYear() {
        const now = new Date();
        const monthSelect = document.getElementById('attendanceChartMonth');
        const yearSelect = document.getElementById('attendanceChartYear');
        
        if (monthSelect) monthSelect.value = now.getMonth().toString();
        if (yearSelect) yearSelect.value = now.getFullYear().toString();
    }

    async loadTodayAttendance() {
        try {
            const token = await this.getAuthToken();
            if (!token) return;

            const today = new Date();
            const dateStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
            
            // Load today's attendance data
            const response = await fetch(`/api/attendance/${dateStr}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.attendanceData = await response.json();
                await this.loadMembersAndTrainers();
                this.updateDashboardStats();
            }
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }

    async loadMembersAndTrainers() {
        try {
            const token = await this.getAuthToken();
            if (!token) return;

            // Load members
            const membersResponse = await fetch('/api/members', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (membersResponse.ok) {
                this.membersData = await membersResponse.json();
            }

            // Get gymId from profile (same logic as attendance.js)
            let gymId = null;
            if (window.currentGymProfile?._id) {
                gymId = window.currentGymProfile._id;
            } else if (this.membersData.length > 0 && this.membersData[0].gym) {
                gymId = this.membersData[0].gym;
            }

            // Load trainers
            let trainersUrl = '/api/trainers?status=approved';
            if (gymId) {
                trainersUrl += `&gym=${gymId}`;
            }
            const trainersResponse = await fetch(trainersUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (trainersResponse.ok) {
                let trainersData = await trainersResponse.json();
                // Filter by gymId in case backend returns more
                if (gymId) {
                    trainersData = trainersData.filter(trainer => trainer.gym === gymId || (trainer.gym && (trainer.gym._id === gymId || trainer.gym === gymId)));
                }
                this.trainersData = trainersData;
            }
        } catch (error) {
            console.error('Error loading members and trainers:', error);
        }
    }

    updateDashboardStats() {
        const today = new Date();
        
        // Filter active members only
        const activeMembers = this.membersData.filter(member => {
            if (!member.membershipValidUntil) return false;
            const expiryDate = new Date(member.membershipValidUntil);
            return expiryDate >= today;
        });

        // Count present members
        let membersPresent = 0;
        activeMembers.forEach(member => {
            if (this.attendanceData[member._id] && this.attendanceData[member._id].status === 'present') {
                membersPresent++;
            }
        });

        // Count present trainers
        let trainersPresent = 0;
        this.trainersData.forEach(trainer => {
            if (this.attendanceData[trainer._id] && this.attendanceData[trainer._id].status === 'present') {
                trainersPresent++;
            }
        });

        // Calculate overall percentage
        const totalPeople = activeMembers.length + this.trainersData.length;
        const totalPresent = membersPresent + trainersPresent;
        const overallPercentage = totalPeople > 0 ? Math.round((totalPresent / totalPeople) * 100) : 0;

        // Update dashboard stat card
        const statValue = document.getElementById('overallAttendanceValue');
        const statChange = document.getElementById('overallAttendanceChange');
        
        if (statValue) {
            statValue.textContent = `${overallPercentage}%`;
        }
        
        if (statChange) {
            statChange.textContent = `${totalPresent}/${totalPeople} present today`;
        }
    }

    async showAttendanceModal() {
        const modal = document.getElementById('attendanceStatsModal');
        if (!modal) return;

        modal.style.display = 'flex';
        
        // Update modal data
        await this.updateModalData();
        this.updateChart();
    }

    hideAttendanceModal() {
        const modal = document.getElementById('attendanceStatsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async updateModalData() {
        const today = new Date();
        
        // Filter active members only
        const activeMembers = this.membersData.filter(member => {
            if (!member.membershipValidUntil) return false;
            const expiryDate = new Date(member.membershipValidUntil);
            return expiryDate >= today;
        });

        // Count present members
        let membersPresent = 0;
        activeMembers.forEach(member => {
            if (this.attendanceData[member._id] && this.attendanceData[member._id].status === 'present') {
                membersPresent++;
            }
        });

        // Count present trainers
        let trainersPresent = 0;
        this.trainersData.forEach(trainer => {
            if (this.attendanceData[trainer._id] && this.attendanceData[trainer._id].status === 'present') {
                trainersPresent++;
            }
        });

        // Calculate percentages
        const membersAbsent = activeMembers.length - membersPresent;
        const trainersAbsent = this.trainersData.length - trainersPresent;
        const membersRate = activeMembers.length > 0 ? Math.round((membersPresent / activeMembers.length) * 100) : 0;
        const trainersRate = this.trainersData.length > 0 ? Math.round((trainersPresent / this.trainersData.length) * 100) : 0;
        const overallRate = (activeMembers.length + this.trainersData.length) > 0 ? 
            Math.round(((membersPresent + trainersPresent) / (activeMembers.length + this.trainersData.length)) * 100) : 0;

        // Update modal summary cards
        document.getElementById('totalMembersPresent').textContent = membersPresent;
        document.getElementById('totalTrainersPresent').textContent = trainersPresent;
        document.getElementById('overallAttendancePercentage').textContent = `${overallRate}%`;

        // Update detailed statistics
        document.getElementById('totalMembersCount').textContent = activeMembers.length;
        document.getElementById('membersPresentToday').textContent = membersPresent;
        document.getElementById('membersAbsentToday').textContent = membersAbsent;
        document.getElementById('membersAttendanceRate').textContent = `${membersRate}%`;

        document.getElementById('totalTrainersCount').textContent = this.trainersData.length;
        document.getElementById('trainersPresentToday').textContent = trainersPresent;
        document.getElementById('trainersAbsentToday').textContent = trainersAbsent;
        document.getElementById('trainersAttendanceRate').textContent = `${trainersRate}%`;
    }

    async updateChart() {
        const monthSelect = document.getElementById('attendanceChartMonth');
        const yearSelect = document.getElementById('attendanceChartYear');
        if (!monthSelect || !yearSelect) return;

        // Use skeleton loading for modal chart
        if (window.showSkeleton) {
            window.showSkeleton('attendanceChart', 'chart');
        }

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        try {
            const chartData = await this.getMonthlyAttendanceData(month, year);
            this.renderChart(chartData);
        } catch (error) {
            console.error('Error updating chart:', error);
        }
        
        // Hide skeleton loading
        if (window.hideSkeleton) {
            window.hideSkeleton('attendanceChart');
        }
    }

    async getMonthlyAttendanceData(month, year) {
        const token = await this.getAuthToken();
        if (!token) return {};

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const chartData = {
            labels: [],
            membersData: [],
            trainersData: [],
            overallData: []
        };

        // Generate labels for all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            chartData.labels.push(day.toString());
        }

        // Fetch attendance data for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            try {
                const response = await fetch(`/api/attendance/${dateStr}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const dayData = await response.json();
                    
                    // Count present members and trainers for this day
                    let membersPresent = 0;
                    let trainersPresent = 0;
                    
                    Object.values(dayData).forEach(attendance => {
                        if (attendance.status === 'present') {
                            if (attendance.personType === 'Member') {
                                membersPresent++;
                            } else if (attendance.personType === 'Trainer') {
                                trainersPresent++;
                            }
                        }
                    });

                    chartData.membersData.push(membersPresent);
                    chartData.trainersData.push(trainersPresent);
                    chartData.overallData.push(membersPresent + trainersPresent);
                } else {
                    chartData.membersData.push(0);
                    chartData.trainersData.push(0);
                    chartData.overallData.push(0);
                }
            } catch (error) {
                console.error(`Error fetching data for ${dateStr}:`, error);
                chartData.membersData.push(0);
                chartData.trainersData.push(0);
                chartData.overallData.push(0);
            }
        }

        return chartData;
    }

    renderChart(data) {
        const ctx = document.getElementById('attendanceChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Members Present',
                        data: data.membersData,
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Trainers Present',
                        data: data.trainersData,
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Total Present',
                        data: data.overallData,
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of People'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Day of Month'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    async getAuthToken() {
        // Try to get token from localStorage first
        let token = localStorage.getItem('gymAdminToken');
        if (!token) {
            // Try alternative storage locations
            token = sessionStorage.getItem('gymAdminToken');
        }
        
        if (token) {
            // Remove 'Bearer ' prefix if it exists
            return token.replace(/^Bearer\s+/, '');
        }
        
        return null;
    }
}

// Initialize attendance stats when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.attendanceStats = new AttendanceStats();
});