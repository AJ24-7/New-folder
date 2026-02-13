/**
 * Tab Switcher Module
 * Handles all tab navigation logic for the gym admin dashboard
 * Supports both desktop sidebar and mobile hamburger menu
 */

(function() {
    'use strict';

    // ============================================================================
    // DOM ELEMENT REFERENCES
    // ============================================================================

    // Main container
    const mainContent = document.getElementById('mainContent');
    
    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    
    // Desktop menu links (sidebar)
    const sidebarMenuLinks = document.querySelectorAll('.sidebar .menu-link');
    
    // Mobile menu elements
    const hamburgerMenuBtn = document.getElementById('hamburgerMenuBtn');
    const mobileSidebarDropdown = document.getElementById('mobileSidebarDropdown');
    const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');
    const closeMobileSidebar = document.getElementById('closeMobileSidebar');
    const mobileMenuLinks = document.querySelectorAll('#mobileSidebarDropdown .menu-link');
    
    // Tab content elements
    const dashboardContent = document.querySelector('.content'); // Dashboard tab
    const memberDisplayTab = document.getElementById('memberDisplayTab');
    const trainerTab = document.getElementById('trainerTab');
    const attendanceTab = document.getElementById('attendanceTab');
    const paymentTab = document.getElementById('paymentTab');
    const equipmentTab = document.getElementById('equipmentTab');
    const offersTab = document.getElementById('offersTab');
    const supportReviewsTab = document.getElementById('supportReviewsTab');
    const settingsTab = document.getElementById('settingsTab');

    // ============================================================================
    // CORE TAB SWITCHING FUNCTIONS
    // ============================================================================

    /**
     * Hides all tabs and closes any open modals
     */
    function hideAllTabs() {
        
        // Close all modals
        document.querySelectorAll('.modal.show, .modal[style*="display: flex"], .modal[style*="display:flex"]').forEach(modal => {
            modal.classList.remove('show', 'active');
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.zIndex = '-1';
        });
        
        // Reset body overflow
        document.body.style.overflow = '';
        
        // Hide dashboard (uses class="content")
        if (dashboardContent) {
            dashboardContent.style.display = 'none';
            dashboardContent.classList.remove('active');
        }
        
        // Hide all other tabs (use class="tab-content")
        const allTabs = [
            memberDisplayTab,
            trainerTab,
            attendanceTab,
            paymentTab,
            equipmentTab,
            offersTab,
            supportReviewsTab,
            settingsTab
        ];
        
        allTabs.forEach(tab => {
            if (tab) {
                tab.style.display = 'none';
                tab.classList.remove('active');
            }
        });
        
        // Remove active class from all menu links
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });
        
    }

    /**
     * Shows a tab with optional skeleton loading animation
     * @param {HTMLElement} tabElement - The tab element to show
     * @param {string} skeletonType - Type of skeleton loader (table, dashboard-stats, card-grid, list, form)
     * @param {Function} initFunction - Optional initialization function to call
     */
    function showTabWithSkeleton(tabElement, skeletonType = null, initFunction = null) {
        if (!tabElement) {
            console.warn('⚠️ Tab element not found');
            return;
        }
        
        const tabId = tabElement.id || tabElement.className;
        
        // Show the tab
        tabElement.style.display = 'block';
        tabElement.classList.add('active');
        
        // Show skeleton loading if available
        if (skeletonType && window.showSkeleton) {
            window.showSkeleton(tabId, skeletonType);
            
            // Load data asynchronously if init function provided
            if (initFunction && typeof initFunction === 'function') {
                setTimeout(() => {
                    try {
                        const result = initFunction();
                        
                        // If init function returns a promise, wait for it
                        if (result && typeof result.then === 'function') {
                            result.then(() => {
                                if (window.hideSkeleton) window.hideSkeleton(tabId);
                            }).catch((error) => {
                                console.error('❌ Tab initialization error:', error);
                                if (window.hideSkeleton) window.hideSkeleton(tabId);
                            });
                        } else {
                            // If not a promise, hide skeleton after short delay
                            setTimeout(() => {
                                if (window.hideSkeleton) window.hideSkeleton(tabId);
                            }, 300);
                        }
                    } catch (error) {
                        console.error('❌ Tab initialization error:', error);
                        if (window.hideSkeleton) window.hideSkeleton(tabId);
                    }
                }, 50);
            }
        } else if (initFunction && typeof initFunction === 'function') {
            // No skeleton, just call init function
            setTimeout(() => {
                try {
                    initFunction();
                } catch (error) {
                    console.error('❌ Tab initialization error:', error);
                }
            }, 50);
        }
        
    }

    /**
     * Closes the mobile sidebar menu
     */
    function closeMobileSidebarMenu() {
        if (mobileSidebarDropdown) mobileSidebarDropdown.classList.remove('open');
        if (mobileSidebarBackdrop) mobileSidebarBackdrop.classList.remove('active');
        if (hamburgerMenuBtn) hamburgerMenuBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ============================================================================
    // TAB SWITCHING HANDLERS
    // ============================================================================

    /**
     * Switch to Dashboard tab
     */
    function showDashboard() {
        hideAllTabs();
        
        if (dashboardContent) {
            dashboardContent.style.display = 'block';
            dashboardContent.classList.add('active');
            
            // Refresh dashboard data
            setTimeout(() => {
                if (typeof initializeStatCards === 'function') {
                    initializeStatCards();
                }
                if (typeof window.loadDashboardData === 'function') {
                    window.loadDashboardData();
                }
            }, 50);
        }
        
        // Set dashboard link as active
        const dashboardLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-tachometer-alt')
        );
        if (dashboardLink) dashboardLink.classList.add('active');
    }

    /**
     * Switch to Members tab
     */
    function showMembers() {
        hideAllTabs();
        
        // Directly show the tab WITHOUT skeleton loader to avoid visibility issues
        if (memberDisplayTab) {
            memberDisplayTab.style.display = 'block';
            memberDisplayTab.classList.add('active');
            
            // Ensure nested containers are visible
            const tableContainer = document.getElementById('membersTableContainer');
            if (tableContainer) {
                tableContainer.style.display = 'block';
            }
            
            const membersTable = document.getElementById('membersTable');
            if (membersTable) {
                membersTable.style.display = 'table';
            }
            
            // Call the fetch function WITHOUT skeleton wrapper
            if (typeof fetchAndDisplayMembers === 'function') {
                fetchAndDisplayMembers().catch(err => {
                    console.error('Error fetching members:', err);
                });
            }
        }
        
        const membersLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-users')
        );
        if (membersLink) membersLink.classList.add('active');
    }

    /**
     * Switch to Trainers tab
     */
    function showTrainers() {
        hideAllTabs();
        
        showTabWithSkeleton(trainerTab, 'list', () => {
            if (typeof window.showTrainerTab === 'function') {
                return window.showTrainerTab();
            }
        });
        
        const trainersLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-user-tie')
        );
        if (trainersLink) trainersLink.classList.add('active');
    }

    /**
     * Switch to Attendance tab
     */
    function showAttendance() {
        hideAllTabs();
        
        showTabWithSkeleton(attendanceTab, 'table', () => {
            if (typeof window.attendanceManager !== 'undefined') {
                window.attendanceManager.loadData();
                window.attendanceManager.loadAttendanceForDate();
            }
        });
        
        const attendanceLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-calendar-check')
        );
        if (attendanceLink) attendanceLink.classList.add('active');
    }

    /**
     * Switch to Payments tab
     */
    function showPayments() {
        hideAllTabs();
        
        showTabWithSkeleton(paymentTab, 'dashboard-stats', () => {
            if (typeof window.paymentManager !== 'undefined') {
                return window.paymentManager.loadPaymentData();
            }
        });
        
        const paymentsLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-credit-card')
        );
        if (paymentsLink) paymentsLink.classList.add('active');
    }

    /**
     * Switch to Equipment tab
     */
    function showEquipment() {
        hideAllTabs();
        
        showTabWithSkeleton(equipmentTab, 'card-grid', () => {
            if (typeof window.equipmentManager !== 'undefined') {
                return window.equipmentManager.loadEquipmentData();
            }
        });
        
        const equipmentLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-dumbbell')
        );
        if (equipmentLink) equipmentLink.classList.add('active');
    }

    /**
     * Switch to Offers tab
     */
    function showOffers() {
        hideAllTabs();
        
        // Close any open modals first
        document.querySelectorAll('.modal.show, .offers-modal.show').forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
        
        showTabWithSkeleton(offersTab, 'dashboard-stats', () => {
            // Initialize offers manager if not already done
            if (!window.offersManager) {
                if (typeof window.initializeOffersManager === 'function') {
                    window.initializeOffersManager();
                }
            }
            
            // Force reload data and switch to templates tab
            if (window.offersManager) {
                // Update counters immediately
                window.offersManager.updateOffersCountBadge();
                // Load all data
                window.offersManager.loadInitialData();
                // Switch to templates tab
                setTimeout(() => {
                    window.offersManager.switchTab('templates');
                }, 100);
            } else {
                console.error('❌ Offers manager not available');
            }
        });
        
        const offersLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-tags')
        );
        if (offersLink) offersLink.classList.add('active');
    }

    /**
     * Switch to Support & Reviews tab
     */
    function showSupport() {
        hideAllTabs();
        
        showTabWithSkeleton(supportReviewsTab, 'list', () => {
            if (typeof window.supportModule !== 'undefined' && window.supportModule.loadData) {
                return window.supportModule.loadData();
            }
        });
        
        const supportLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-headset')
        );
        if (supportLink) supportLink.classList.add('active');
    }

    /**
     * Switch to Settings tab
     */
    function showSettings() {
        hideAllTabs();
        
        // Close any open modals first
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
        
        showTabWithSkeleton(settingsTab, 'form', () => {
            if (typeof window.loadSettingsData === 'function') {
                return window.loadSettingsData();
            }
        });
        
        const settingsLink = Array.from(document.querySelectorAll('.menu-link')).find(link => 
            link.querySelector('.fa-cog')
        );
        if (settingsLink) settingsLink.classList.add('active');
    }

    // ============================================================================
    // EVENT LISTENERS - DESKTOP SIDEBAR
    // ============================================================================

    sidebarMenuLinks.forEach((link, index) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Determine which tab to show based on icon class
            const icon = this.querySelector('i');
            if (!icon) return;
            
            if (icon.classList.contains('fa-tachometer-alt')) {
                showDashboard();
            } else if (icon.classList.contains('fa-users')) {
                showMembers();
            } else if (icon.classList.contains('fa-user-tie')) {
                showTrainers();
            } else if (icon.classList.contains('fa-calendar-check')) {
                showAttendance();
            } else if (icon.classList.contains('fa-credit-card')) {
                showPayments();
            } else if (icon.classList.contains('fa-dumbbell')) {
                showEquipment();
            } else if (icon.classList.contains('fa-tags')) {
                showOffers();
            } else if (icon.classList.contains('fa-headset')) {
                showSupport();
            } else if (icon.classList.contains('fa-cog')) {
                showSettings();
            }
        });
    });

    // ============================================================================
    // EVENT LISTENERS - MOBILE MENU
    // ============================================================================

    // Hamburger menu toggle
    if (hamburgerMenuBtn) {
        hamburgerMenuBtn.addEventListener('click', function() {
            if (mobileSidebarDropdown) mobileSidebarDropdown.classList.add('open');
            if (mobileSidebarBackdrop) mobileSidebarBackdrop.classList.add('active');
            this.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close mobile menu button
    if (closeMobileSidebar) {
        closeMobileSidebar.addEventListener('click', closeMobileSidebarMenu);
    }

    // Backdrop click to close
    if (mobileSidebarBackdrop) {
        mobileSidebarBackdrop.addEventListener('click', closeMobileSidebarMenu);
    }

    // Mobile menu links
    mobileMenuLinks.forEach((link) => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Determine which tab to show based on icon class
            const icon = this.querySelector('i');
            if (!icon) return;
            
            if (icon.classList.contains('fa-tachometer-alt')) {
                showDashboard();
            } else if (icon.classList.contains('fa-users')) {
                showMembers();
            } else if (icon.classList.contains('fa-user-tie')) {
                showTrainers();
            } else if (icon.classList.contains('fa-calendar-check')) {
                showAttendance();
            } else if (icon.classList.contains('fa-credit-card')) {
                showPayments();
            } else if (icon.classList.contains('fa-dumbbell')) {
                showEquipment();
            } else if (icon.classList.contains('fa-tags')) {
                showOffers();
            } else if (icon.classList.contains('fa-headset')) {
                showSupport();
            } else if (icon.classList.contains('fa-cog')) {
                showSettings();
            }
            
            // Close mobile menu after selection
            closeMobileSidebarMenu();
        });
    });

    // ============================================================================
    // SIDEBAR COLLAPSE/EXPAND TOGGLE
    // ============================================================================

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-collapsed');
            
            // Update icon
            const icon = this.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('sidebar-collapsed')) {
                    icon.classList.remove('fa-chevron-left');
                    icon.classList.add('fa-chevron-right');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-left');
                }
            }
            
        });
    }

    // Handle window resize for responsive behavior
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // Desktop view - close mobile menu if open
            closeMobileSidebarMenu();
        }
    });

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    // On page load, show dashboard by default
    document.addEventListener('DOMContentLoaded', function() {
        
        // Small delay to ensure all other scripts are loaded
        setTimeout(() => {
            showDashboard();
        }, 100);
    });

    // ============================================================================
    // EXPORT PUBLIC API (for use by other modules)
    // ============================================================================

    window.tabSwitcher = {
        showDashboard,
        showMembers,
        showTrainers,
        showAttendance,
        showPayments,
        showEquipment,
        showOffers,
        showSupport,
        showSettings,
        hideAllTabs,
        closeMobileMenu: closeMobileSidebarMenu
    };


})();
