/**
 * Offers and Coupons Management Module
 * Handles all offer-related functionality in the gym admin dashboard
 * Uses the same proven pattern as support-reviews.js for consistent behavior
 */

console.log('🚀 OFFERS MANAGER SCRIPT LOADING...');

class OffersManager {
  constructor() {
    this.BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';
    console.log('🏗️ OffersManager constructor called');
    this.currentTab = 'templates';
    this.offers = [];
    this.coupons = [];
    this.templates = [];
    this.analytics = {};
    this.initialized = false;
    this.templatesLoaded = false; // Track template loading state
    
    // Initialize templates immediately to prevent counting issues
    this.templates = this.getPreDesignedTemplates();
    this.templatesLoaded = true; // Mark as loaded since we have pre-designed templates
    console.log('📋 Templates initialized in constructor:', this.templates.length);
    
    // Make this instance globally available immediately
    window.offersManager = this;
    console.log('🌐 OffersManager made globally available');
    
    this.init();
  }

  async init() {
    console.log('🎯 Offers Manager: Setting up with enhanced backend workflow...');
    
    // Ensure we have a gym ID before proceeding
    const gymId = this.getGymId();
    if (!gymId) {
      console.warn('⚠️ No gym ID found, creating a temporary one for testing');
      // For testing purposes, create a temporary gym ID
      const tempGymId = `gym_${Date.now()}`;
      localStorage.setItem('gymId', tempGymId);
      console.log('📝 Created temporary gym ID:', tempGymId);
    }

    try {
      // Initialize UI bindings first
      this.bindEvents();
      
      // Add cleanup listener for when leaving offers tab
      this.setupTabCleanup();
      
      // Load initial data and setup backend workflow integration
      await this.loadInitialData();
      await this.initializeWithBackendWorkflow();
      
      console.log('✅ OffersManager initialization completed successfully');
    } catch (error) {
      console.error('❌ OffersManager initialization failed:', error);
      // Continue with local-only mode
      this.initializeLocalMode();
    }
  }
  
  setupTabCleanup() {
    // CRITICAL FIX: Don't add event listeners to sidebar links!
    // This was interfering with the main gymadmin.js tab navigation
    // Instead, use a custom event or rely on hideAllMainTabs() to clean up
    
    // Listen for custom event when tabs are being switched
    document.addEventListener('tabSwitching', (e) => {
      const targetTab = e.detail?.targetTab;
      // If switching AWAY from offers tab, close any open modals
      if (targetTab && targetTab !== 'offersTab') {
        console.log('🧹 Cleaning up offers modals - switching away from offers tab');
        this.closeModal(); // Close all modals
      }
    });
  }

  async initializeWithBackendWorkflow() {
    console.log('🔧 Initializing backend workflow integration...');
    
    // Check authentication status
    const adminToken = this.getAdminToken();
    if (adminToken) {
      console.log('✅ Admin authenticated, enabling full backend integration');
      
      try {
        // Sync with backend - This endpoint does not exist and causes 404 errors.
        // await this.syncOffersWithBackend();
        
        // Load real-time data
        await this.loadBackendStats();
        
      } catch (error) {
        console.warn('⚠️ Backend sync failed, falling back to local mode:', error);
        this.initializeLocalMode();
      }
    } else {
      console.log('🔒 No admin token, initializing local mode');
      this.initializeLocalMode();
    }
    
    // Initialize UI updates
    this.initializeUIUpdates();
  }

  initializeLocalMode() {
    console.log('🏠 Initializing local mode...');
    
    // Ensure sample data exists
    this.ensureSampleData();
    
    // Calculate and display local stats
    const stats = this.getLocalStats();
    console.log('📊 Local mode stats:', stats);
    
    // Update UI with local data
    this.updateOffersCountBadge();
    
    // Set up periodic local updates
    this.setupPeriodicUpdates();
  }

  initializeUIUpdates() {
    console.log('🎨 Initializing UI updates...');
    
    // Update tab counters and stats cards immediately
    this.updateOffersCountBadge();
    
    // Ensure templates are loaded if we're on templates tab
    if (this.currentTab === 'templates') {
      console.log('🎯 Currently on templates tab, ensuring immediate load');
      this.loadOfferTemplates();
    }
    
    // Refresh gym details offers if on gym details page
    if (window.location.pathname.includes('gymdetails')) {
      this.refreshGymDetailsOffers();
    }
    
    // Set up real-time UI updates
    this.setupRealtimeUpdates();
    
    // Force template counter update after brief delay to ensure DOM is ready
    setTimeout(() => {
      this.updateTemplateCounter();
      console.log('🔄 Force template counter update completed');
    }, 200);
  }

  setupPeriodicUpdates() {
    // Update UI every 30 seconds
    setInterval(() => {
      this.updateOffersCountBadge();
    }, 30000);
    
    // Sync with backend every 5 minutes if authenticated
    setInterval(async () => {
      const adminToken = this.getAdminToken();
      if (adminToken) {
        try {
          // await this.syncOffersWithBackend(); // This endpoint does not exist and causes 404 errors.
        } catch (error) {
          console.warn('⚠️ Periodic backend sync failed:', error);
        }
      }
    }, 300000);
  }

  setupRealtimeUpdates() {
    // Listen for storage changes to update UI in real-time
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.includes('Campaigns') || e.key.includes('Coupons') || e.key.includes('gymOffers'))) {
        console.log('🔄 Storage change detected, updating UI...');
        setTimeout(() => {
          this.updateOffersCountBadge();
          // Reload current tab data to show updates
          if (this.currentTab) {
            this.loadTabData(this.currentTab);
          }
        }, 100);
      }
    });
    
    // Listen for custom events from other components
    document.addEventListener('offersUpdated', () => {
      console.log('🔄 Offers updated event received, refreshing UI...');
      this.updateOffersCountBadge();
      if (this.currentTab) {
        this.loadTabData(this.currentTab);
      }
    });
    
    // Listen for offer claimed event from gym details page
    window.addEventListener('offerClaimed', (e) => {
      console.log('🎉 Offer claimed event received:', e.detail);
      
      if (e.detail && e.detail.offerId) {
        // Update specific campaign claim count in real-time
        this.updateCampaignClaimCount(e.detail.offerId, e.detail.usageCount);
      }
      
      this.updateOffersCountBadge();
      // Reload campaigns to show updated claim counts
      if (this.currentTab === 'campaigns') {
        this.loadActiveCampaigns();
      }
    });
    
    // Listen for backend claim updates
    window.addEventListener('offerClaimUpdated', (e) => {
      console.log('📡 Backend claim update received:', e.detail);
      
      if (e.detail && e.detail.offerId) {
        this.updateCampaignClaimCount(e.detail.offerId, e.detail.usageCount);
      }
    });
  }
  
  // Update campaign claim count in real-time
  updateCampaignClaimCount(offerId, usageCount) {
    try {
      // Update in local storage
      const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
      const campaignIndex = campaigns.findIndex(c => 
        (c.id || c._id || c.backendId) === offerId
      );
      
      if (campaignIndex !== -1) {
        const newCount = usageCount || (campaigns[campaignIndex].usageCount || 0) + 1;
        campaigns[campaignIndex].usageCount = newCount;
        campaigns[campaignIndex].claimsCount = newCount;
        campaigns[campaignIndex].claimedCount = newCount;
        campaigns[campaignIndex].usedCount = newCount;
        
        localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));
        
        // Update UI card if visible
        const campaignCard = document.querySelector(`[data-campaign-id="${offerId}"]`);
        if (campaignCard) {
          const claimsValue = campaignCard.querySelector('.metric-value');
          if (claimsValue) {
            claimsValue.textContent = newCount;
          }
          
          const progressText = campaignCard.querySelector('.progress-info span:last-child');
          if (progressText) {
            const maxUses = campaigns[campaignIndex].maxUses || 100;
            progressText.textContent = `${newCount}/${maxUses}`;
            
            const progressFill = campaignCard.querySelector('.progress-fill');
            if (progressFill) {
              const progressPercent = Math.min((newCount / maxUses) * 100, 100);
              progressFill.style.width = `${progressPercent}%`;
            }
          }
        }
        
        console.log(`✅ Updated claim count for offer ${offerId}: ${newCount}`);
      }
    } catch (error) {
      console.error('Error updating campaign claim count:', error);
    }
  }

  async syncOffersWithBackend() {
    console.log('🔄 Syncing offers with backend...');
    
    try {
      const adminToken = this.getAdminToken();
      const gymId = this.getGymId();
      
      const response = await fetch('/api/offers/sync', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Gym-ID': gymId
        }
      });

      if (response.ok) {
        const backendData = await response.json();
        
        // Update local storage with backend data
        if (backendData.campaigns) {
          localStorage.setItem('activeCampaigns', JSON.stringify(backendData.campaigns));
        }
        if (backendData.coupons) {
          localStorage.setItem('generatedCoupons', JSON.stringify(backendData.coupons));
        }
        
        console.log('✅ Backend sync completed successfully');
        
        // Trigger UI update
        this.updateOffersCountBadge();
        
        return backendData;
      } else {
        throw new Error(`Backend sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Backend sync error:', error);
      throw error;
    }
  }

  async loadBackendStats() {
    try {
      const adminToken = this.getAdminToken();
      const gymId = this.getGymId();
      
      const response = await fetch(`/api/offers/analytics?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-Gym-ID': gymId
        }
      });

      if (response.ok) {
        const backendStats = await response.json();
        console.log('📊 Backend stats loaded:', backendStats);
        
        // Store backend stats locally
        localStorage.setItem('backendStats', JSON.stringify(backendStats));
        localStorage.setItem('lastStatsUpdate', new Date().toISOString());
        
        return backendStats;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load backend stats:', error);
      return this.getLocalStats();
    }
  }

  refreshGymDetailsOffers() {
    // Trigger offers refresh on gym details page
    const offersContainer = document.querySelector('.gym-offers-container');
    if (offersContainer && window.gymDetailsOffers) {
      console.log('🔄 Refreshing gym details offers...');
      window.gymDetailsOffers.loadOffers();
    }
  }

  bindEvents() {
    console.log('🔗 Binding offers tab events');
    
    // Tab navigation - Enhanced with better event handling and debugging
    // CRITICAL: Only handle clicks within the offers tab, don't prevent propagation
    document.addEventListener('click', (e) => {
      if (e.target.matches('.support-tab-btn') || e.target.closest('.support-tab-btn')) {
        // Only handle clicks within the offers tab
        const offersTab = e.target.closest('#offersTab');
        if (!offersTab) return; // Let other tabs handle their own clicks
        
        e.preventDefault();
        e.stopPropagation();
        const tabBtn = e.target.closest('.support-tab-btn') || e.target;
        const tabName = tabBtn.dataset.tab;
        console.log(`🎯 Offers tab clicked: ${tabName}, current: ${this.currentTab}`);
        if (tabName && this.currentTab !== tabName) {
          this.switchTab(tabName);
        }
        return false;
      }
    });

    // Main action buttons in offers tab
    document.addEventListener('click', (e) => {
      if (e.target.matches('#offersCreateOfferBtn') || e.target.closest('#offersCreateOfferBtn')) {
        console.log('🎯 Create Offer button clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.openOfferCreationModal();
      }
      if (e.target.matches('#offersGenerateCouponBtn') || e.target.closest('#offersGenerateCouponBtn')) {
        console.log('🎯 Generate Coupon button clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.openCouponGenerationModal();
      }
      if (e.target.matches('#generateCouponBtn') || e.target.closest('#generateCouponBtn')) {
        console.log('🎯 Generate Coupon (alt) button clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.openCouponGenerationModal();
      }
      if (e.target.matches('#exportCouponsBtn') || e.target.closest('#exportCouponsBtn')) {
        e.preventDefault();
        e.stopPropagation();
        this.exportCoupons();
      }
    });

    // Modal controls with enhanced event handling
    document.addEventListener('click', (e) => {
      // Check for modal close buttons
      if (e.target.matches('.support-modal-close') || e.target.closest('.support-modal-close')) {
        const modal = e.target.closest('.support-modal');
        if (modal) {
          this.closeModal(modal.id);
        }
      }
      
      // Check for clicking outside modal content
      if (e.target.matches('.support-modal') && !e.target.closest('.support-modal-content')) {
        this.closeModal(e.target.id);
      }

      // Handle cancel buttons specifically
      if (e.target.matches('#cancelOfferBtn') || e.target.closest('#cancelOfferBtn')) {
        e.preventDefault();
        this.closeModal('offerCreationModal');
      }
      
      if (e.target.matches('#cancelCouponBtn') || e.target.closest('#cancelCouponBtn')) {
        e.preventDefault();
        this.closeModal('couponGenerationModal');
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.matches('#offerCreationForm')) {
        e.preventDefault();
        this.handleOfferSubmission(e.target);
      }
      if (e.target.matches('#couponGenerationForm')) {
        e.preventDefault();
        this.handleCouponSubmission(e.target);
      }
    });

    // Search and filters
    document.addEventListener('input', (e) => {
      if (e.target.matches('#couponSearchInput')) {
        this.filterCoupons(e.target.value);
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.matches('#couponStatusFilter')) {
        this.filterCouponsByStatus(e.target.value);
      }
    });

    console.log('🔗 Offers events bound successfully');
  }

  switchTab(tabName) {
    if (!tabName) return;
    
    console.log(`🔄 Switching from ${this.currentTab} to ${tabName} tab`);
    
    // Update tab buttons with forced refresh - only within offers tab
    const offersTabElement = document.getElementById('offersTab');
    if (!offersTabElement) return;
    
    offersTabElement.querySelectorAll('.support-tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.pointerEvents = 'auto'; // Ensure buttons are clickable
    });
    
    const targetBtn = offersTabElement.querySelector(`[data-tab="${tabName}"]`);
    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    // Update tab content with animation - only within offers tab
    offersTabElement.querySelectorAll('.support-section').forEach(section => {
      section.classList.remove('active');
      section.style.display = 'none';
    });
    
    const targetSection = offersTabElement.querySelector(`#${tabName}Section`);
    if (targetSection) {
      targetSection.style.display = 'block';
      // Force reflow before adding active class for smooth animation
      targetSection.offsetHeight;
      targetSection.classList.add('active');
    }

    this.currentTab = tabName;
    
    // Update counters IMMEDIATELY with forced refresh
    this.updateOffersCountBadge();
    
    // Load tab data - ALWAYS reload to ensure fresh data
    this.loadTabData(tabName);
    
    // Force another counter update after data load
    setTimeout(() => {
      this.updateOffersCountBadge();
    }, 100);
    
    console.log(`✅ Successfully switched to ${tabName} tab`);
  }

  // Smart tab data loading - only reload if necessary
  loadTabDataSmart(tabName) {
    console.log(`📋 Smart loading data for ${tabName} tab`);
    
    switch (tabName) {
      case 'templates': {
        // Only load templates if not already loaded or grid is empty
        const templatesGrid = document.getElementById('templatesGrid');
        const gridIsEmpty = !templatesGrid || 
                           templatesGrid.innerHTML.trim() === '' ||
                           templatesGrid.innerHTML.includes('loading-state') ||
                           templatesGrid.innerHTML.includes('error-state');
        
        if (!this.templatesLoaded || gridIsEmpty) {
          console.log('📋 Templates need loading/rendering');
          this.loadOfferTemplates();
        } else {
          console.log('📋 Templates already loaded and rendered, updating counter only');
          this.updateTemplateCounter();
        }
        break;
      }
        
      case 'campaigns': {
        this.renderActiveCampaigns();
        break;
      }
        
      case 'coupons': {
        this.renderCoupons();
        break;
      }
        
      case 'analytics': {
        this.renderAnalytics();
        break;
      }
        
      default: {
        console.warn(`Unknown tab: ${tabName}`);
      }
    }
  }

  async loadInitialData() {
    console.log('📊 Loading initial data for Offers & Coupons');
    
    // Check if we have any existing data, if not create sample data
    this.ensureSampleData();
    
    // Wait a brief moment for DOM to be fully ready (after tab switch animation)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Load templates first and ensure they're available for counting
    await this.loadOfferTemplates();
    
    // Then load other data in parallel
    await Promise.all([
      this.loadActiveCampaigns(),
      this.loadCoupons(),
      this.loadAnalytics()
    ]);
    
    // Update counters after data is loaded - now templates should be available
    this.updateOffersCountBadge();
    
    // Update stats after loading
    const stats = this.getLocalStats();
    this.updateStatsDisplay(stats);
    
    // Ensure templates tab is active by default and force refresh
    this.switchTab('templates');
    
    // Force another counter update to ensure accuracy
    setTimeout(() => {
      this.updateOffersCountBadge();
      console.log('🔄 Secondary counter update completed');
    }, 100);
    
    console.log('📊 Initial data loaded successfully');
  }

  ensureSampleData() {
    // If no campaigns exist, create a sample one for testing
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    if (campaigns.length === 0) {
      console.log('📝 Creating sample campaign for testing...');
      const sampleCampaign = {
        id: `sample_${Date.now()}`,
        _id: `sample_${Date.now()}`,
        title: 'Welcome Offer',
        description: 'Special offer for new members',
        discount: 20,
        discountType: 'percentage',
        status: 'active',
        isActive: true,
        targetAudience: 'new',
        totalClaimLimit: 100,
        maxUses: 100,
        claimsCount: 5,
        usageCount: 5,
        viewsCount: 25,
        views: 25,
        gymId: this.getGymId(),
        createdAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        features: ['Full gym access', 'Free consultation'],
        icon: 'fas fa-star',
        showOnGymProfile: true
      };
      
      campaigns.push(sampleCampaign);
      localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));
      
      // Also store for gym details page
      this.storeForGymDetails(sampleCampaign);
      
      console.log('✅ Sample campaign created:', sampleCampaign);
    }
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case 'templates':
        this.renderOfferTemplates();
        break;
      case 'campaigns':
        this.renderActiveCampaigns();
        break;
      case 'coupons':
        this.renderCoupons();
        break;
      case 'analytics':
        this.renderAnalytics();
        break;
    }
  }

  renderOfferTemplates() {
    this.loadOfferTemplates();
  }

  renderActiveCampaigns() {
    this.loadActiveCampaigns();
  }

  renderCoupons() {
    // Load both generated coupons and user claimed offers
    this.loadCoupons();
    this.updateUserOffersSection();
  }

  renderAnalytics() {
    this.loadAnalytics();
  }

  createTemplateCard(template) {
    // Get gym info from window.currentGymProfile (same as gym-profile.js)
    const gymData = window.currentGymProfile || {};
    
    let gymLogo = '/gymadmin/public/Gym-Wale.png'; // Default fallback - server serves /gymadmin path
    if (gymData.logoUrl) {
      gymLogo = gymData.logoUrl.startsWith('http') 
        ? gymData.logoUrl 
        : `${this.BASE_URL}${gymData.logoUrl.startsWith('/') ? gymData.logoUrl : '/' + gymData.logoUrl}`;
    }
    
    const gymName = gymData.gymName || gymData.name || 'Your Gym';
    
    return `
      <div class="template-card enhanced ${template.type}" data-template-id="${template.id}">
        <div class="template-background-animation">
          <div class="animated-particles"></div>
          <div class="gradient-overlay"></div>
        </div>
        
        <div class="template-gym-branding">
          <img src="${gymLogo}" alt="${gymName}" class="gym-logo" onerror="this.src='/gymadmin/public/Gym-Wale.png'">
          <span class="gym-name">${gymName}</span>
        </div>
        
        <div class="template-header">
          <div class="template-icon-container">
            <div class="template-icon"><i class="${template.icon}"></i></div>
            <div class="template-badge">${template.discount}${template.discountType === 'percentage' ? '%' : '₹'} OFF</div>
          </div>
          <h3 class="template-title">${template.title}</h3>
          <p class="template-description">${template.description}</p>
          <div class="template-duration">
            <i class="fas fa-clock"></i> ${template.duration}
          </div>
        </div>
        
        <div class="template-features">
          <div class="features-title">What's Included:</div>
          <ul>${template.features.map(f => `<li><i class="fas fa-check"></i>${f}</li>`).join('')}</ul>
        </div>
        
        <div class="template-actions">
          <button class="template-btn preview pulse" onclick="offersManager.previewTemplate('${template.id}')">
            <i class="fas fa-eye"></i> Preview
          </button>
          <button class="template-btn launch glow" onclick="offersManager.showLaunchDialog('${template.id}')">
            <i class="fas fa-rocket"></i> Launch Offer
          </button>
        </div>
        
        <div class="template-corner-decoration"></div>
      </div>`;
  }

  previewTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    const content = document.getElementById('templatePreviewContent');
    if (content) content.innerHTML = this.generateTemplatePreview(template);
    this.openModal('templatePreviewModal');
    setTimeout(() => {
      document.getElementById('customizeTemplateBtn').onclick = () => { this.closeModal('templatePreviewModal'); this.customizeTemplate(template); };
      document.getElementById('launchOfferBtn').onclick = () => { this.closeModal('templatePreviewModal'); this.launchOffer(template); };
    }, 100);
  }

    generateTemplatePreview(template) {
        return `
        <div class="template-preview">
            <div class="preview-header" style="text-align: center; margin-bottom: 24px;">
            <div class="preview-icon" style="width: 80px; height: 80px; margin: 0 auto 16px; background: linear-gradient(135deg, #1976d2, #42a5f5); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px;">
                <i class="${template.icon}"></i>
            </div>
            <h2 style="margin-bottom: 8px;">${template.title}</h2>
            <p style="color: #6c757d; font-size: 16px;">${template.description}</p>
            </div>
            <div class="preview-details" style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div><strong>Discount:</strong> ${template.discount}${template.discountType === 'percentage' ? '%' : '₹'} off</div>
                <div><strong>Duration:</strong> ${template.duration}</div>
            </div>
            </div>
            <div class="preview-features">
            <h4 style="margin-bottom: 12px;">Included Features:</h4>
            <ul style="list-style: none; padding: 0;">
                ${template.features.map(feature => `<li style="padding: 8px 0; display: flex; align-items: center; gap: 8px;"><i class="fas fa-check-circle" style="color: #4caf50;"></i> ${feature}</li>`).join('')}
            </ul>
            </div>
        </div>`;
    }

  useTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (template) this.launchOffer(template);
  }

  customizeTemplate(template) {
    const modal = document.getElementById('offerCreationModal');
    if (!modal) return;
    document.getElementById('offerTitle').value = template.title;
    document.getElementById('offerType').value = template.discountType;
    document.getElementById('offerValue').value = template.discount;
    document.getElementById('offerDescription').value = template.description;
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('offerStartDate').value = startDate.toISOString().slice(0, 16);
    document.getElementById('offerEndDate').value = endDate.toISOString().slice(0, 16);
    this.openModal('offerCreationModal');
  }

  async launchOffer(template) {
    // Mock implementation
    console.log("Launching offer:", template);
    this.showSuccess(`Offer "${template.title}" launched successfully!`);
    this.switchToTab('campaigns');
  }

  showLaunchDialog(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    
    console.log('🚀 Opening launch dialog for template:', template.title);
    
    // Create and show the launch dialog
    this.createLaunchDialog(template);
    this.openModal('offerLaunchDialog');
  }

  createLaunchDialog(template) {
    // Remove existing dialog if present
    const existingDialog = document.getElementById('offerLaunchDialog');
    if (existingDialog) existingDialog.remove();
    
    const dialogHTML = `
      <div id="offerLaunchDialog" class="support-modal launch-dialog">
        <div class="support-modal-content large launch-content">
          <div class="launch-dialog-header">
            <div class="launch-header-icon">
              <i class="${template.icon}"></i>
            </div>
            <h2>Launch: ${template.title}</h2>
            <button class="support-modal-close" onclick="offersManager.closeModal('offerLaunchDialog')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="launch-dialog-body">
            <div class="launch-sections">
              <!-- Target Audience Section -->
              <div class="launch-section">
                <h3><i class="fas fa-users"></i> Target Audience</h3>
                <div class="audience-options">
                  <label class="option-card">
                    <input type="radio" name="targetAudience" value="new" checked>
                    <div class="option-content">
                      <i class="fas fa-user-plus"></i>
                      <h4>New Users Only</h4>
                      <p>Show to visitors and potential new members</p>
                    </div>
                  </label>
                  <label class="option-card">
                    <input type="radio" name="targetAudience" value="existing">
                    <div class="option-content">
                      <i class="fas fa-user-check"></i>
                      <h4>Existing Members</h4>
                      <p>Show to current gym members</p>
                    </div>
                  </label>
                  <label class="option-card">
                    <input type="radio" name="targetAudience" value="all">
                    <div class="option-content">
                      <i class="fas fa-users-cog"></i>
                      <h4>Everyone</h4>
                      <p>Show to all visitors and members</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <!-- Campaign Settings Section -->
              <div class="launch-section">
                <h3><i class="fas fa-cog"></i> Campaign Settings</h3>
                <div class="settings-grid">
                  <div class="setting-group">
                    <label>Total Claim Limit</label>
                    <input type="number" id="totalClaimLimit" value="100" min="1" max="10000">
                    <small>Maximum number of people who can claim this offer</small>
                  </div>
                  <div class="setting-group">
                    <label>Per User Limit</label>
                    <input type="number" id="perUserLimit" value="1" min="1" max="10">
                    <small>How many times each user can claim this offer</small>
                  </div>
                  <div class="setting-group">
                    <label>Campaign Duration</label>
                    <select id="campaignDuration">
                      <option value="7">1 Week</option>
                      <option value="14">2 Weeks</option>
                      <option value="30" selected>1 Month</option>
                      <option value="60">2 Months</option>
                      <option value="90">3 Months</option>
                      <option value="custom">Custom Duration</option>
                    </select>
                  </div>
                  <div class="setting-group" id="customDurationGroup" style="display: none;">
                    <label>End Date</label>
                    <input type="datetime-local" id="customEndDate">
                  </div>
                </div>
              </div>
              
              <!-- Display Options Section -->
              <div class="launch-section">
                <h3><i class="fas fa-eye"></i> Display Options</h3>
                <div class="display-options">
                  <label class="toggle-option">
                    <input type="checkbox" id="showOnGymProfile" checked>
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <h4>Show on Gym Profile Page</h4>
                      <p>Display as popup when users visit your gym details</p>
                    </div>
                  </label>
                  <label class="toggle-option">
                    <input type="checkbox" id="showOnHomepage">
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <h4>Feature on Homepage</h4>
                      <p>Display in featured offers section</p>
                    </div>
                  </label>
                  <label class="toggle-option">
                    <input type="checkbox" id="enableNotifications" checked>
                    <span class="toggle-slider"></span>
                    <div class="toggle-content">
                      <h4>Send Push Notifications</h4>
                      <p>Notify existing members about this offer</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <!-- Preview Section -->
              <div class="launch-section">
                <h3><i class="fas fa-preview"></i> Offer Preview</h3>
                <div class="offer-preview-card">
                  <div class="preview-badge">${template.discount}${template.discountType === 'percentage' ? '%' : '₹'} OFF</div>
                  <h4>${template.title}</h4>
                  <p>${template.description}</p>
                  <div class="preview-features">
                    ${template.features.slice(0, 3).map(f => `<span class="feature-tag">${f}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="launch-dialog-footer">
            <button class="btn-secondary" onclick="offersManager.closeModal('offerLaunchDialog')">
              <i class="fas fa-times"></i> Cancel
            </button>
            <button class="btn-primary launch-btn" onclick="offersManager.executeLaunch('${template.id}')">
              <i class="fas fa-rocket"></i> Launch Campaign
            </button>
          </div>
        </div>
      </div>`;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // Add event listeners for dynamic behavior
    setTimeout(() => {
      this.setupLaunchDialogEvents();
    }, 100);
  }

  setupLaunchDialogEvents() {
    // Campaign duration change handler
    const durationSelect = document.getElementById('campaignDuration');
    const customGroup = document.getElementById('customDurationGroup');
    
    if (durationSelect) {
      durationSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customGroup.style.display = 'block';
          const now = new Date();
          const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          document.getElementById('customEndDate').value = futureDate.toISOString().slice(0, 16);
        } else {
          customGroup.style.display = 'none';
        }
      });
    }
  }

  async executeLaunch(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Collect form data
    const formData = {
      templateId,
      targetAudience: document.querySelector('input[name="targetAudience"]:checked')?.value || 'new',
      totalClaimLimit: parseInt(document.getElementById('totalClaimLimit')?.value) || 100,
      perUserLimit: parseInt(document.getElementById('perUserLimit')?.value) || 1,
      duration: document.getElementById('campaignDuration')?.value || '30',
      customEndDate: document.getElementById('customEndDate')?.value,
      showOnGymProfile: document.getElementById('showOnGymProfile')?.checked || false,
      showOnHomepage: document.getElementById('showOnHomepage')?.checked || false,
      enableNotifications: document.getElementById('enableNotifications')?.checked || false
    };
    
    console.log('🚀 Launching campaign with settings:', formData);
    
    try {
      this.showLoadingState();
      
      // Use enhanced campaign creation with backend integration
      const campaign = await this.createAndStoreLocalCampaign(template, {
        ...formData,
        displaySettings: {
          showOnGymProfile: formData.showOnGymProfile,
          showOnHomepage: formData.showOnHomepage,
          enableNotifications: formData.enableNotifications
        }
      });
      
      if (campaign) {
        this.hideLoadingState();
        this.closeModal('offerLaunchDialog');
        
        // Show enhanced success notification
        this.showLaunchSuccessNotification(template, campaign);
        
        // Switch to campaigns tab and refresh
        this.switchTab('campaigns');
        
        // Comprehensive UI refresh
        await this.refreshAllOffersData();
        
        console.log('✅ Campaign launched and UI refreshed successfully');
      } else {
        throw new Error('Failed to create campaign');
      }
      
    } catch (error) {
      this.hideLoadingState();
      this.showError('Failed to launch campaign. Please try again.');
      console.error('Launch error:', error);
    }
  }

  calculateValidUntil(duration, customEndDate) {
    if (duration === 'custom' && customEndDate) {
      return new Date(customEndDate);
    } else {
      const days = parseInt(duration);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + days);
      return validUntil;
    }
  }

  async createLocalCampaign(template, settings, backendId) {
    const validUntil = this.calculateValidUntil(settings.duration, settings.customEndDate);
    
    const campaign = {
      id: backendId,
      _id: backendId,
      backendId: backendId,
      templateId: template.id,
      title: template.title,
      description: template.description,
      discount: template.discount,
      discountType: template.discountType,
      discountValue: template.discount,
      value: template.discount,
      features: template.features,
      icon: template.icon,
      type: template.type,
      offerType: template.type,
      templateStyle: template.type,
      
      // Campaign settings
      targetAudience: settings.targetAudience || 'new',
      totalClaimLimit: settings.totalClaimLimit || 100,
      maxUses: settings.totalClaimLimit || 100,
      claimLimit: settings.totalClaimLimit || 100,
      perUserLimit: settings.perUserLimit || 1,
      
      // Status and tracking
      status: 'active',
      isActive: true,
      createdAt: new Date().toISOString(),
      startDate: new Date().toISOString(),
      endDate: validUntil.toISOString(),
      validUntil: validUntil.toISOString(),
      expiresAt: validUntil.toISOString(),
      
      // Usage tracking - multiple field names for compatibility
      claimsCount: 0,
      claimedCount: 0,
      usageCount: 0,
      usedCount: 0,
      viewsCount: 0,
      views: 0,
      
      // Display settings
      showOnGymProfile: settings.displaySettings?.showOnGymProfile || settings.showOnGymProfile || false,
      showOnHomepage: settings.displaySettings?.showOnHomepage || settings.showOnHomepage || false,
      enableNotifications: settings.displaySettings?.enableNotifications || settings.enableNotifications || false,
      displayOnProfile: settings.showOnGymProfile || false,
      
      // Gym association
      gymId: this.getGymId(),
      gym: this.getGymId(),
      
      // Additional metadata
      duration: settings.duration || '30',
      customEndDate: settings.customEndDate
    };
    
    console.log('📦 Creating local campaign:', campaign);
    
    // Store in local storage for quick access
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    campaigns.push(campaign);
    localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));
    
    // Store for gym details compatibility
    this.storeForGymDetails(campaign);
    
    // Trigger notification to gym details page
    this.notifyGymDetailsOfNewOffer();
    
    return campaign;
  }

  // Store campaign in format compatible with gym details page
  storeForGymDetails(campaign) {
    try {
      const gymOffersKey = `gymOffers_${this.getGymId()}`;
      const existingOffers = JSON.parse(localStorage.getItem(gymOffersKey) || '[]');
      
      // Convert to gym details format with ALL necessary fields
      const gymOffer = {
        _id: campaign.id,
        id: campaign.id,
        backendId: campaign.backendId || campaign.id, // CRITICAL: Include backendId for filtering!
        title: campaign.title,
        description: campaign.description,
        type: campaign.discountType,
        discountType: campaign.discountType,
        discountValue: campaign.discount || campaign.value,
        value: campaign.discount || campaign.value,
        maxUses: campaign.maxUses || campaign.claimLimit || 100,
        claimLimit: campaign.maxUses || campaign.claimLimit || 100,
        usageCount: campaign.usageCount || campaign.claimedCount || 0,
        claimedCount: campaign.usageCount || campaign.claimedCount || 0,
        validUntil: campaign.validUntil,
        endDate: campaign.endDate,
        expiresAt: campaign.validUntil,
        startDate: campaign.startDate,
        status: 'active',
        isActive: true,
        isTemplate: false, // CRITICAL: Mark as not a template
        gymId: campaign.gymId,
        gym: campaign.gymId,
        features: campaign.features || [],
        icon: campaign.icon,
        templateStyle: campaign.type || campaign.templateStyle,
        templateId: campaign.templateId, // Include template reference
        targetAudience: campaign.targetAudience || 'new',
        showOnGymProfile: campaign.showOnGymProfile || campaign.displayOnProfile || false,
        displayOnProfile: campaign.showOnGymProfile || campaign.displayOnProfile || false,
        backgroundImage: campaign.backgroundImage || '',
        perUserLimit: campaign.perUserLimit || 1
      };
      
      // Add to gym offers if not already present
      const existingIndex = existingOffers.findIndex(o => o._id === campaign.id || o.id === campaign.id);
      if (existingIndex >= 0) {
        existingOffers[existingIndex] = gymOffer;
      } else {
        existingOffers.push(gymOffer);
      }
      
      localStorage.setItem(gymOffersKey, JSON.stringify(existingOffers));
      console.log('✅ Campaign stored for gym details page');
      
    } catch (error) {
      console.error('Error storing campaign for gym details:', error);
    }
  }

  async createCampaign(template, settings) {
    // This method is now replaced by createLocalCampaign
    return this.createLocalCampaign(template, settings, `campaign_${Date.now()}`);
  }

  // Gym Profile Offer Integration
  static showGymProfileOffers(gymId, isNewUser = true) {
    console.log('🎯 Showing gym profile offers for:', gymId, 'New user:', isNewUser);
    
    // Get active campaigns for this gym
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const applicableCampaigns = campaigns.filter(campaign => {
      return campaign.status === 'active' && 
             campaign.showOnGymProfile &&
             (campaign.targetAudience === 'all' || 
              (campaign.targetAudience === 'new' && isNewUser) ||
              (campaign.targetAudience === 'existing' && !isNewUser));
    });
    
    if (applicableCampaigns.length === 0) {
      console.log('No applicable offers found for this user');
      return;
    }
    
    // Show the most recent or highest discount offer
    const bestOffer = applicableCampaigns.sort((a, b) => b.discount - a.discount)[0];
    this.displayGymProfileOfferPopup(bestOffer, gymId, isNewUser);
  }

  static displayGymProfileOfferPopup(offer, gymId, isNewUser) {
    // Remove existing popup if present
    const existingPopup = document.getElementById('gymProfileOfferPopup');
    if (existingPopup) existingPopup.remove();
    
    const popupHTML = `
      <div id="gymProfileOfferPopup" class="gym-profile-offer-popup">
        <div class="offer-popup-overlay" onclick="OffersManager.closeGymProfileOffer()"></div>
        <div class="offer-popup-content ${offer.type}">
          <button class="offer-popup-close" onclick="OffersManager.closeGymProfileOffer()">
            <i class="fas fa-times"></i>
          </button>
          
          <div class="offer-popup-header">
            <div class="offer-popup-badge">
              <span class="discount-value">${offer.discount}${offer.discountType === 'percentage' ? '%' : '₹'}</span>
              <span class="discount-text">OFF</span>
            </div>
            <div class="offer-popup-icon">
              <i class="${offer.icon}"></i>
            </div>
          </div>
          
          <div class="offer-popup-body">
            <h2 class="offer-popup-title">${offer.title}</h2>
            <p class="offer-popup-description">${offer.description}</p>
            
            <div class="offer-popup-features">
              <h4>What's Included:</h4>
              <ul>
                ${offer.features.slice(0, 4).map(feature => 
                  `<li><i class="fas fa-check-circle"></i>${feature}</li>`
                ).join('')}
              </ul>
            </div>
            
            <div class="offer-popup-validity">
              <i class="fas fa-clock"></i>
              <span>Limited time offer - Claim now!</span>
            </div>
          </div>
          
          <div class="offer-popup-footer">
            <button class="offer-btn secondary" onclick="OffersManager.closeGymProfileOffer()">
              Maybe Later
            </button>
            <button class="offer-btn primary claim-btn" onclick="OffersManager.claimOffer('${offer.id}', '${gymId}', ${isNewUser})">
              <i class="fas fa-gift"></i> Claim Offer
            </button>
          </div>
          
          <div class="offer-popup-decorations">
            <div class="decoration-1"></div>
            <div class="decoration-2"></div>
            <div class="decoration-3"></div>
          </div>
        </div>
      </div>`;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Animate in
    setTimeout(() => {
      const popup = document.getElementById('gymProfileOfferPopup');
      if (popup) popup.classList.add('show');
    }, 100);
    
    // Track view
    this.trackOfferView(offer.id);
  }

  static closeGymProfileOffer() {
    const popup = document.getElementById('gymProfileOfferPopup');
    if (popup) {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 300);
    }
  }

  static async claimOffer(offerId, gymId, isNewUser) {
    console.log('🎁 Claiming offer:', offerId, 'for gym:', gymId);
    
    try {
      // Show loading state
      const claimBtn = document.querySelector('.claim-btn');
      if (claimBtn) {
        claimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        claimBtn.disabled = true;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get current user ID (in real app, this would come from authentication)
      const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
      localStorage.setItem('userId', userId);
      
      // Create claimed offer
      const claimedOffer = {
        id: `claimed_${Date.now()}`,
        offerId,
        gymId,
        userId,
        claimedAt: new Date().toISOString(),
        status: 'active',
        usedAt: null
      };
      
      // Save to user's claimed offers
      const userOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');
      userOffers.push(claimedOffer);
      localStorage.setItem('userClaimedOffers', JSON.stringify(userOffers));
      
      // Update campaign claims count
      this.updateCampaignClaims(offerId);
      
      // Show success and close popup
      this.closeGymProfileOffer();
      this.showOfferClaimedSuccess();
      
      console.log('✅ Offer claimed successfully');
      
    } catch (error) {
      console.error('❌ Error claiming offer:', error);
      
      // Reset button state
      const claimBtn = document.querySelector('.claim-btn');
      if (claimBtn) {
        claimBtn.innerHTML = '<i class="fas fa-gift"></i> Claim Offer';
        claimBtn.disabled = false;
      }
      
      alert('Failed to claim offer. Please try again.');
    }
  }

  static updateCampaignClaims(offerId) {
    // Update in activeCampaigns
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const campaignIndex = campaigns.findIndex(c => c.id === offerId || c._id === offerId);
    
    if (campaignIndex >= 0) {
      campaigns[campaignIndex].claimsCount = (campaigns[campaignIndex].claimsCount || 0) + 1;
      campaigns[campaignIndex].claimedCount = (campaigns[campaignIndex].claimedCount || 0) + 1;
      campaigns[campaignIndex].usageCount = (campaigns[campaignIndex].usageCount || 0) + 1;
      localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));
      console.log('✅ Updated campaign claims in activeCampaigns');
    }
    
    // Also update in gymOffers for gym details page
    const gymId = localStorage.getItem('adminGymId') || localStorage.getItem('gymId');
    if (gymId) {
      const gymOffersKey = `gymOffers_${gymId}`;
      const gymOffers = JSON.parse(localStorage.getItem(gymOffersKey) || '[]');
      const offerIndex = gymOffers.findIndex(o => o.id === offerId || o._id === offerId);
      
      if (offerIndex >= 0) {
        gymOffers[offerIndex].claimedCount = (gymOffers[offerIndex].claimedCount || 0) + 1;
        gymOffers[offerIndex].usageCount = (gymOffers[offerIndex].usageCount || 0) + 1;
        localStorage.setItem(gymOffersKey, JSON.stringify(gymOffers));
        console.log('✅ Updated offer claims in gymOffers');
      }
    }
    
    // Dispatch event to notify UI components
    window.dispatchEvent(new CustomEvent('offerClaimed', { detail: { offerId } }));
  }

  static trackOfferView(offerId) {
    // Update in activeCampaigns
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const campaignIndex = campaigns.findIndex(c => c.id === offerId || c._id === offerId);
    
    if (campaignIndex >= 0) {
      campaigns[campaignIndex].viewsCount = (campaigns[campaignIndex].viewsCount || 0) + 1;
      campaigns[campaignIndex].views = (campaigns[campaignIndex].views || 0) + 1;
      localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));
    }
    
    // Also update in gymOffers
    const gymId = localStorage.getItem('adminGymId') || localStorage.getItem('gymId');
    if (gymId) {
      const gymOffersKey = `gymOffers_${gymId}`;
      const gymOffers = JSON.parse(localStorage.getItem(gymOffersKey) || '[]');
      const offerIndex = gymOffers.findIndex(o => o.id === offerId || o._id === offerId);
      
      if (offerIndex >= 0) {
        gymOffers[offerIndex].views = (gymOffers[offerIndex].views || 0) + 1;
        localStorage.setItem(gymOffersKey, JSON.stringify(gymOffers));
      }
    }
  }

  static showOfferClaimedSuccess() {
    const successHTML = `
      <div id="offerClaimedSuccess" class="offer-claimed-success">
        <div class="success-content">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>Offer Claimed Successfully!</h3>
          <p>Your exclusive offer has been added to your account. Check your offers & coupons section to use it.</p>
          <button class="success-btn" onclick="document.getElementById('offerClaimedSuccess').remove()">
            <i class="fas fa-thumbs-up"></i> Awesome!
          </button>
        </div>
      </div>`;
    
    document.body.insertAdjacentHTML('beforeend', successHTML);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      const successEl = document.getElementById('offerClaimedSuccess');
      if (successEl) successEl.remove();
    }, 5000);
  }

  // Get user's claimed offers
  static getUserClaimedOffers(userId = null) {
    if (!userId) {
      userId = localStorage.getItem('userId');
    }
    
    const allClaimedOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');
    return allClaimedOffers.filter(offer => offer.userId === userId);
  }

  // Use a claimed offer
  static useClaimedOffer(claimedOfferId) {
    const userOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');
    const offer = userOffers.find(o => o.id === claimedOfferId);
    
    if (offer && offer.status === 'active') {
      offer.status = 'used';
      offer.usedAt = new Date().toISOString();
      localStorage.setItem('userClaimedOffers', JSON.stringify(userOffers));
      return true;
    }
    
    return false;
  }

  // Enhanced user offers management for coupons section
  updateUserOffersSection() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const userOffers = OffersManager.getUserClaimedOffers(userId);
    const couponsTableBody = document.getElementById('couponsTableBody');
    
    if (!couponsTableBody) return;
    
    if (userOffers.length === 0) {
      couponsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px;">
            <div class="empty-state">
              <i class="fas fa-ticket-alt" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
              <h3>No Offers Claimed Yet</h3>
              <p>Visit gym profiles to discover and claim exclusive offers!</p>
            </div>
          </td>
        </tr>`;
      return;
    }
    
    // Get campaign details for each claimed offer
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    
    couponsTableBody.innerHTML = userOffers.map(userOffer => {
      const campaign = campaigns.find(c => c.id === userOffer.offerId);
      if (!campaign) return '';
      
      const statusClass = userOffer.status === 'active' ? 'active' : 'used';
      const statusIcon = userOffer.status === 'active' ? 'fa-check-circle' : 'fa-history';
      
      return `
        <tr class="coupon-row ${statusClass}">
          <td>
            <div class="coupon-info">
              <div class="coupon-icon ${campaign.type}">
                <i class="${campaign.icon}"></i>
              </div>
              <div class="coupon-details">
                <strong>${campaign.title}</strong>
                <small>${campaign.description}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="discount-badge ${campaign.discountType}">
              ${campaign.discount}${campaign.discountType === 'percentage' ? '%' : '₹'} OFF
            </span>
          </td>
          <td>${this.formatDate(userOffer.claimedAt)}</td>
          <td>
            <span class="status-badge ${statusClass}">
              <i class="fas ${statusIcon}"></i>
              ${userOffer.status === 'active' ? 'Available' : 'Used'}
            </span>
          </td>
          <td>
            ${userOffer.status === 'active' ? `
              <button class="use-offer-btn" onclick="offersManager.showUseOfferDialog('${userOffer.id}', '${campaign.title}')">
                <i class="fas fa-gift"></i> Use Offer
              </button>
            ` : `
              <span class="used-date">Used: ${this.formatDate(userOffer.usedAt)}</span>
            `}
          </td>
        </tr>`;
    }).filter(Boolean).join('');
  }

  showUseOfferDialog(claimedOfferId, offerTitle) {
    const dialogHTML = `
      <div id="useOfferDialog" class="support-modal">
        <div class="support-modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-gift"></i> Use Offer</h3>
            <button class="support-modal-close" onclick="offersManager.closeModal('useOfferDialog')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="use-offer-content">
              <div class="offer-icon">
                <i class="fas fa-ticket-alt"></i>
              </div>
              <h4>Confirm Offer Usage</h4>
              <p>Are you sure you want to use the offer "<strong>${offerTitle}</strong>"?</p>
              <p class="warning-text">
                <i class="fas fa-exclamation-triangle"></i>
                This action cannot be undone. The offer will be marked as used.
              </p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="offersManager.closeModal('useOfferDialog')">
              Cancel
            </button>
            <button class="btn-primary" onclick="offersManager.confirmUseOffer('${claimedOfferId}')">
              <i class="fas fa-check"></i> Confirm Use
            </button>
          </div>
        </div>
      </div>`;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    this.openModal('useOfferDialog');
  }

  confirmUseOffer(claimedOfferId) {
    const success = OffersManager.useClaimedOffer(claimedOfferId);
    
    if (success) {
      this.closeModal('useOfferDialog');
      this.showSuccess('Offer used successfully!');
      this.updateUserOffersSection();
    } else {
      this.showError('Failed to use offer. Please try again.');
    }
  }

  showLoadingState() {
    const launchBtn = document.querySelector('.launch-btn');
    if (launchBtn) {
      launchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Launching...';
      launchBtn.disabled = true;
    }
  }

  hideLoadingState() {
    const launchBtn = document.querySelector('.launch-btn');
    if (launchBtn) {
      launchBtn.innerHTML = '<i class="fas fa-rocket"></i> Launch Campaign';
      launchBtn.disabled = false;
    }
  }

  async loadActiveCampaigns() {
    const campaignsList = document.getElementById('campaignsList');
    if (!campaignsList) return;
    
    try {
      // Show loading
      campaignsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading active campaigns...</div>';
      
      // Try to load from backend first, fallback to local
      let campaigns = await this.loadActiveCampaignsFromBackend();
      
      // If no backend campaigns, try local campaigns
      if (campaigns.length === 0) {
        campaigns = this.getLocalCampaigns();
        if (campaigns.length > 0) {
          console.log('📦 Using local campaigns:', campaigns.length);
        }
      }
      
      if (campaigns.length > 0) {
        // Render campaigns with proper grid layout
        campaignsList.innerHTML = `
          <div class="campaigns-grid">
            ${campaigns.map(campaign => this.createCampaignCard(campaign)).join('')}
          </div>
        `;
        console.log('✅ Campaigns rendered:', campaigns.length);
      } else {
        // Show empty state with call to action
        campaignsList.innerHTML = this.getEmptyState('campaigns');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      // Try local fallback one more time
      const localCampaigns = this.getLocalCampaigns();
      if (localCampaigns.length > 0) {
        campaignsList.innerHTML = `
          <div class="campaigns-grid">
            ${localCampaigns.map(campaign => this.createCampaignCard(campaign)).join('')}
          </div>
        `;
      } else {
        campaignsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Failed to load campaigns. Please try again.</div>';
      }
    }
  }

  createCampaignCard(offer) {
    // Handle both backend offers and local campaigns
    const offerId = offer._id || offer.id || offer.backendId;
    const status = offer.status || 'active';
    
    // Calculate progress for claims
    const usageCount = offer.usageCount || offer.claimsCount || 0;
    const maxUses = offer.maxUses || offer.totalClaimLimit || 100;
    const progressPercent = maxUses ? Math.min((usageCount / maxUses) * 100, 100) : 0;
    
    // Status color
    const statusColor = status === 'active' ? '#4caf50' : 
                       status === 'paused' ? '#ff9800' : '#f44336';
    
    // Determine discount display
    let discountDisplay = 'Special';
    const offerType = offer.type || offer.discountType;
    const offerValue = offer.value || offer.discount;
    
    if (offerType === 'percentage') {
      discountDisplay = `${offerValue}%`;
    } else if (offerType === 'fixed') {
      discountDisplay = `₹${offerValue}`;
    }
    
    // Handle dates - backend offers may have different date fields
    const startDate = offer.startDate || offer.createdAt || new Date().toISOString();
    const endDate = offer.endDate || offer.validUntil || new Date(Date.now() + 30*24*60*60*1000).toISOString();
    
    return `
      <div class="campaign-card active" data-campaign-id="${offerId}">
        <div class="campaign-header">
          <div class="campaign-icon ${offer.category || offer.type || 'membership'}">
            <i class="fas fa-${this.getOfferIcon(offerType)}"></i>
          </div>
          <div class="campaign-status" style="background: ${statusColor}">
            ${status.toUpperCase()}
          </div>
        </div>
        
        <div class="campaign-content">
          <h3 class="campaign-title">${offer.title}</h3>
          <p class="campaign-description">${offer.description}</p>
          
          <div class="campaign-metrics">
            <div class="metric">
              <span class="metric-value">${usageCount}</span>
              <span class="metric-label">Claims</span>
            </div>
            <div class="metric">
              <span class="metric-value">${offer.views || offer.viewsCount || 0}</span>
              <span class="metric-label">Views</span>
            </div>
            <div class="metric">
              <span class="metric-value">${discountDisplay}</span>
              <span class="metric-label">Discount</span>
            </div>
          </div>
          
          <div class="campaign-progress">
            <div class="progress-info">
              <span>Claims Progress</span>
              <span>${usageCount}/${maxUses}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
          
          <div class="campaign-dates">
            <div class="date-item">
              <i class="fas fa-calendar-start"></i>
              <span>Start: ${new Date(startDate).toLocaleDateString()}</span>
            </div>
            <div class="date-item">
              <i class="fas fa-calendar-times"></i>
              <span>End: ${new Date(endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div class="campaign-actions">
          <button class="campaign-btn secondary" onclick="offersManager.editCampaign('${offerId}')" title="Edit Campaign">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="campaign-btn ${status === 'active' ? 'pause' : 'play'}" 
                  onclick="offersManager.toggleCampaign('${offerId}')" 
                  title="${status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}">
            <i class="fas fa-${status === 'active' ? 'pause' : 'play'}"></i> 
            ${status === 'active' ? 'Pause' : 'Resume'}
          </button>
          <button class="campaign-btn analytics" onclick="offersManager.viewCampaignAnalytics('${offerId}')" title="View Analytics">
            <i class="fas fa-chart-line"></i> Analytics
          </button>
          <button class="campaign-btn danger" onclick="offersManager.deleteCampaign('${offerId}')" title="Delete Campaign">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>`;
  }

  getOfferIcon(offerType) {
    const icons = {
      'percentage': 'percent',
      'fixed': 'rupee-sign',
      'bogo': 'plus-circle',
      'free_trial': 'gift',
      'special': 'star'
    };
    return icons[offerType] || 'tag';
  }

  async editCampaign(campaignId) {
    console.log('Editing campaign:', campaignId);
    
    try {
      // Get campaign details
      const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
      const campaign = campaigns.find(c => c.id === campaignId || c._id === campaignId);
      
      if (!campaign) {
        this.showError('Campaign not found');
        return;
      }

      // Show edit modal
      this.showEditCampaignModal(campaign);
      
    } catch (error) {
      console.error('Error editing campaign:', error);
      this.showError('Failed to load campaign for editing');
    }
  }

  showEditCampaignModal(campaign) {
    const modal = document.createElement('div');
    modal.className = 'support-modal show';
    modal.innerHTML = `
      <div class="support-modal-content large">
        <div class="support-modal-header">
          <h3><i class="fas fa-edit"></i> Edit Campaign</h3>
          <button class="close-modal" onclick="this.closest('.support-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="support-modal-body">
          <form id="editCampaignForm">
            <input type="hidden" id="editCampaignId" value="${campaign.id || campaign._id}">
            
            <div class="form-row">
              <div class="form-group">
                <label>Campaign Title</label>
                <input type="text" id="editTitle" value="${campaign.title}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Description</label>
                <textarea id="editDescription" rows="3" required>${campaign.description}</textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Discount Type</label>
                <select id="editDiscountType" required>
                  <option value="percentage" ${campaign.type === 'percentage' ? 'selected' : ''}>Percentage</option>
                  <option value="fixed" ${campaign.type === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
                  <option value="bogo" ${campaign.type === 'bogo' ? 'selected' : ''}>Buy One Get One</option>
                  <option value="free_trial" ${campaign.type === 'free_trial' ? 'selected' : ''}>Free Trial</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Discount Value</label>
                <input type="number" id="editDiscountValue" value="${campaign.value}" min="0" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Max Claims</label>
                <input type="number" id="editMaxClaims" value="${campaign.maxUses || 100}" min="1">
              </div>
              
              <div class="form-group">
                <label>End Date</label>
                <input type="date" id="editEndDate" value="${new Date(campaign.endDate).toISOString().split('T')[0]}" required>
              </div>
            </div>
          </form>
        </div>
        <div class="support-modal-footer">
          <button class="btn-secondary" onclick="this.closest('.support-modal').remove()">
            Cancel
          </button>
          <button class="btn-primary" onclick="offersManager.saveEditedCampaign()">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  async saveEditedCampaign() {
    try {
      const campaignId = document.getElementById('editCampaignId').value;
      const title = document.getElementById('editTitle').value;
      const description = document.getElementById('editDescription').value;
      const type = document.getElementById('editDiscountType').value;
      const value = parseFloat(document.getElementById('editDiscountValue').value);
      const maxUses = parseInt(document.getElementById('editMaxClaims').value);
      const endDate = document.getElementById('editEndDate').value;

      if (!title || !description || !value || !endDate) {
        this.showError('Please fill all required fields');
        return;
      }

      // Update local storage
      const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
      const campaignIndex = campaigns.findIndex(c => (c.id || c._id) === campaignId);
      
      if (campaignIndex !== -1) {
        campaigns[campaignIndex] = {
          ...campaigns[campaignIndex],
          title,
          description,
          type,
          value,
          maxUses,
          endDate: new Date(endDate),
          updatedAt: new Date()
        };
        
        localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));

        // Try to update in backend
        try {
          const token = this.getAdminToken();
          const gymId = this.getGymId();
          
          if (token && gymId) {
            const response = await fetch(`${this.BASE_URL}/api/offers/offers/${campaignId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                title,
                description,
                type,
                value,
                maxUses,
                endDate: new Date(endDate),
                gymId
              })
            });

            if (response.ok) {
              console.log('✅ Campaign updated in backend');
            }
          }
        } catch (backendError) {
          console.warn('Backend update failed, but local update succeeded:', backendError);
        }

        // Close modal and refresh
        document.querySelector('.support-modal')?.remove();
        await this.loadActiveCampaigns();
        this.showSuccess('Campaign updated successfully!');
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      this.showError('Failed to update campaign');
    }
  }

  async toggleCampaign(campaignId) {
    try {
      // Get campaign
      const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
      const campaign = campaigns.find(c => (c.id || c._id) === campaignId);
      
      if (!campaign) {
        this.showError('Campaign not found');
        return;
      }

      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      const action = newStatus === 'active' ? 'resume' : 'pause';

      // Update local storage
      campaign.status = newStatus;
      localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));

      // Try to update backend
      try {
        const token = this.getAdminToken();
        if (token) {
          const response = await fetch(`${this.BASE_URL}/api/offers/offers/${campaignId}/toggle`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action })
          });

          if (response.ok) {
            console.log(`✅ Campaign ${action}d in backend`);
          }
        }
      } catch (backendError) {
        console.warn('Backend toggle failed, but local update succeeded:', backendError);
      }

      // Refresh display
      await this.loadActiveCampaigns();
      this.showSuccess(`Campaign ${action}d successfully!`);
      
    } catch (error) {
      console.error('Error toggling campaign:', error);
      this.showError('Failed to toggle campaign status');
    }
  }

  async deleteCampaign(campaignId) {
    // Use unified confirmation dialog
    if (typeof window.showConfirmation === 'function') {
      const confirmed = await window.showConfirmation(
        'Delete Campaign',
        'Are you sure you want to delete this campaign? This action cannot be undone.',
        'Delete',
        'Cancel'
      );
      
      if (!confirmed) return;
    } else {
      // Fallback to standard confirm
      if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
        return;
      }
    }

    try {
      // Delete from local storage
      let campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
      campaigns = campaigns.filter(c => (c.id || c._id) !== campaignId);
      localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));

      // Try to delete from backend
      try {
        const token = this.getAdminToken();
        if (token) {
          const response = await fetch(`${this.BASE_URL}/api/offers/offers/${campaignId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            console.log('✅ Campaign deleted from backend');
          }
        }
      } catch (backendError) {
        console.warn('Backend deletion failed, but local deletion succeeded:', backendError);
      }

      // Refresh display and update counters
      await this.loadActiveCampaigns();
      this.updateOffersCountBadge();
      this.showSuccess('Campaign deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting campaign:', error);
      this.showError('Failed to delete campaign');
    }
  }

  viewCampaignAnalytics(campaignId) {
    console.log('Viewing analytics for campaign:', campaignId);
    
    // Get campaign data
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const campaign = campaigns.find(c => (c.id || c._id) === campaignId);
    
    if (!campaign) {
      this.showError('Campaign not found');
      return;
    }

    // Show analytics modal
    this.showCampaignAnalyticsModal(campaign);
  }

  showCampaignAnalyticsModal(campaign) {
    const usagePercent = campaign.maxUses ? (campaign.usageCount / campaign.maxUses * 100).toFixed(1) : 0;
    const daysRemaining = Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    const modal = document.createElement('div');
    modal.className = 'support-modal show';
    modal.innerHTML = `
      <div class="support-modal-content large">
        <div class="support-modal-header">
          <h3><i class="fas fa-chart-line"></i> Campaign Analytics: ${campaign.title}</h3>
          <button class="close-modal" onclick="this.closest('.support-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="support-modal-body">
          <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="stat-card">
              <div class="stat-icon" style="background: #667eea;">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">${campaign.usageCount || 0}</div>
                <div class="stat-label">Total Claims</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon" style="background: #f093fb;">
                <i class="fas fa-percentage"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">${usagePercent}%</div>
                <div class="stat-label">Usage Rate</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon" style="background: #4facfe;">
                <i class="fas fa-calendar-alt"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">${daysRemaining}</div>
                <div class="stat-label">Days Remaining</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon" style="background: #43e97b;">
                <i class="fas fa-chart-bar"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">${campaign.status}</div>
                <div class="stat-label">Status</div>
              </div>
            </div>
          </div>

          <div class="progress-section">
            <label>Campaign Progress</label>
            <div class="progress-bar-large" style="height: 30px; background: #f0f0f0; border-radius: 15px; overflow: hidden;">
              <div style="width: ${usagePercent}%; height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); transition: width 0.3s;"></div>
            </div>
            <p style="margin-top: 10px; color: #666;">${campaign.usageCount || 0} of ${campaign.maxUses || 'unlimited'} claims used</p>
          </div>

          <div class="campaign-details" style="margin-top: 30px;">
            <h4>Campaign Details</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Discount:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.value}${campaign.type === 'percentage' ? '%' : '₹'} OFF</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${campaign.type}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Created:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(campaign.createdAt).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Expires:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(campaign.endDate).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
        </div>
        <div class="support-modal-footer">
          <button class="btn-secondary" onclick="this.closest('.support-modal').remove()">
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  async loadCoupons() {
    const couponsTableBody = document.getElementById('couponsTableBody');
    if (!couponsTableBody) return;

    try {
      // Show loading state
      couponsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #667eea; margin-bottom: 10px;"></i>
            <div>Loading coupons...</div>
          </td>
        </tr>
      `;

      // Try to load from backend
      const coupons = await this.loadCouponsFromBackend();
      
      if (coupons.length === 0) {
        couponsTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
              <div class="empty-state">
                <i class="fas fa-ticket-alt" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
                <h3>No Coupons Found</h3>
                <p>Generate your first coupon to start offering discounts.</p>
                <button class="btn-primary" onclick="offersManager.openCouponGenerationModal()">
                  <i class="fas fa-plus"></i> Generate Coupon
                </button>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      // Render coupons
      couponsTableBody.innerHTML = coupons.map(coupon => this.createCouponRow(coupon)).join('');

    } catch (error) {
      console.error('Error loading coupons:', error);
      couponsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px;">
            <div class="error-state">
              <i class="fas fa-exclamation-triangle" style="color: #ff6b6b; font-size: 24px; margin-bottom: 10px;"></i>
              <div>Failed to load coupons. Please try again.</div>
            </div>
          </td>
        </tr>
      `;
    }
  }

   async loadCouponsFromBackend() {
    this.showLoadingState();
    try {
      if (!window.CouponBackendAPI) {
        this.showError("Coupon backend module is not available.");
        return [];
      }
      const gymId = this.getGymId();
      if (!gymId) {
        this.showError("Gym ID is not available. Cannot fetch coupons.");
        return [];
      }
      
      // FIX: Removed adminToken from the call as it's now handled by the API module
      const backendData = await CouponBackendAPI.getCoupons(gymId);

      this.coupons = backendData.coupons || [];
      this.updateOffersCountBadge();
      return this.coupons;

    } catch (error) {
      console.error('Error loading coupons from backend:', error);
      this.showError(`Failed to load coupons: ${error.message}`);
      return this.getLocalCoupons(); // Fallback to local
    } finally {
      this.hideLoadingState();
    }
  }

  getLocalCoupons() {
    // Get coupons from claimed offers
    const userOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    
    return userOffers.map(userOffer => {
      const campaign = campaigns.find(c => c.id === userOffer.offerId);
      
      return {
        _id: userOffer.id,
        code: userOffer.couponCode || `${userOffer.offerId.slice(-6).toUpperCase()}`,
        type: campaign ? campaign.discountType : 'percentage',
        value: campaign ? campaign.discount : 10,
        description: campaign ? campaign.title : 'Special Offer',
        status: userOffer.status,
        usageCount: userOffer.status === 'used' ? 1 : 0,
        maxUses: 1,
        validTill: campaign ? new Date(Date.now() + 30*24*60*60*1000) : new Date(),
        userId: userOffer.userId,
        claimedAt: userOffer.claimedAt,
        source: 'claimed' // Mark as claimed coupon
      };
    });
  }

  createCouponRow(coupon) {
    const statusClass = coupon.status === 'active' ? 'active' : 'inactive';
    const statusIcon = coupon.status === 'active' ? 'fa-check-circle' : 'fa-pause-circle';
    
    // Special styling for claimed coupons
    const sourceClass = coupon.source === 'claimed' ? 'claimed-coupon' : '';
    const sourceLabel = coupon.source === 'claimed' ? ' (User Claimed)' : '';
    
    return `
      <tr class="coupon-row ${statusClass} ${sourceClass}">
        <td>
          <div class="coupon-info">
            <div class="coupon-code-display">${coupon.code}</div>
            <small class="coupon-description">${coupon.description || 'Discount coupon'}${sourceLabel}</small>
            ${coupon.source === 'claimed' ? `<small class="claimed-date">Claimed: ${this.formatDate(coupon.claimedAt)}</small>` : ''}
          </div>
        </td>
        <td>
          <span class="discount-badge ${coupon.type}">
            ${coupon.type === 'percentage' ? coupon.value + '%' : '₹' + coupon.value} OFF
          </span>
        </td>
        <td>${coupon.usageCount || 0}</td>
        <td>${coupon.maxUses || 'Unlimited'}</td>
        <td>${this.formatDate(coupon.validTill)}</td>
        <td>
          <span class="status-badge ${statusClass}">
            <i class="fas ${statusIcon}"></i>
            ${coupon.status.charAt(0).toUpperCase() + coupon.status.slice(1)}
          </span>
        </td>
        <td>
          <div class="coupon-actions">
            ${coupon.source !== 'claimed' ? `
              <button class="action-btn edit" onclick="offersManager.editCoupon('${coupon._id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn toggle" onclick="offersManager.toggleCoupon('${coupon._id}')" title="${coupon.status === 'active' ? 'Deactivate' : 'Activate'}">
                <i class="fas fa-${coupon.status === 'active' ? 'pause' : 'play'}"></i>
              </button>
              <button class="action-btn delete" onclick="offersManager.deleteCoupon('${coupon._id}')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            ` : `
              <span class="claimed-info">
                <i class="fas fa-user"></i> User: ${coupon.userId ? coupon.userId.slice(-8) : 'Unknown'}
              </span>
            `}
          </div>
        </td>
      </tr>
    `;
  }

  async loadOfferStats() {
    try {
      // Try to load real stats from backend
      const stats = await this.loadOfferStatsFromBackend();
      this.updateStatsDisplay(stats);
    } catch (error) {
      console.error('Error loading offer stats:', error);
      // Fallback to default stats
      const stats = { activeOffers: 0, activeCoupons: 0, totalClaims: 0, revenue: 0 };
      this.updateStatsDisplay(stats);
    }
  }

  async loadOfferStatsFromBackend() {
    try {
      const gymId = this.getGymId();
      const adminToken = this.getAdminToken();
      
      if (!adminToken) {
        console.warn('No admin token found, using local stats');
        return this.getLocalStats();
      }

      const response = await fetch(`/api/offers/offers/stats?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Stats loaded from backend:', data);
        return data;
      } else {
        console.warn('Backend stats failed, using local stats');
        return this.getLocalStats();
      }
    } catch (error) {
      console.error('Error loading stats from backend:', error);
      console.log('📊 Falling back to local stats calculation');
      return this.getLocalStats();
    }
  }

  getLocalStats() {
    // Calculate stats from local data with backend workflow integration
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const coupons = JSON.parse(localStorage.getItem('generatedCoupons') || '[]');
    const activeCoupons = coupons.filter(c => c.status === 'active');
    const claimedOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');
    const templates = this.templates || Array.from({length: 6}, (_, i) => ({id: i + 1})); // Default templates
    
    const totalClaims = campaigns.reduce((sum, c) => sum + (c.claimsCount || 0), 0) + 
                       coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const revenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0) + 
                   coupons.reduce((sum, c) => sum + (c.revenue || 0), 0) || 
                   totalClaims * 150; // Fallback revenue calculation
    
    // Calculate conversion rate
    const totalViews = campaigns.reduce((sum, c) => sum + (c.views || 0), 0) || Math.max(totalClaims * 10, 100);
    const conversionRate = totalViews > 0 ? Math.round((totalClaims / totalViews) * 100) : 0;
    
    const stats = {
      activeCampaigns: activeCampaigns.length,
      totalTemplates: templates.length,
      activeCoupons: activeCoupons.length,
      totalClaims: totalClaims,
      revenue: revenue,
      conversionRate: conversionRate,
      // Legacy compatibility
      activeOffers: activeCampaigns.length
    };
    
    console.log('📊 Enhanced local stats calculated:', stats);
    
    // Trigger backend sync if connected (non-blocking)
    setTimeout(() => {
      this.syncStatsWithBackend(stats);
    }, 0);
    
    return stats;
  }

  async syncStatsWithBackend(localStats) {
    try {
      const adminToken = this.getAdminToken();
      if (!adminToken) {
        return localStats;
      }

      const gymId = this.getGymId();
      const apiBaseUrl = window.API_BASE_URL || 'http://localhost:5000';
      
      // Make this non-blocking - don't wait for backend response
      // Note: This endpoint may not exist yet, so we catch errors gracefully and silently
      fetch(`${apiBaseUrl}/api/offers/stats?gymId=${gymId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      }).then(response => {
        if (response.ok) {
          return response.json();
        } else {
          // Silently ignore - this endpoint might not be implemented yet
          return null;
        }
      }).then(backendStats => {
        if (backendStats && backendStats.data) {
          localStorage.setItem('lastBackendSync', new Date().toISOString());
        }
      }).catch(() => {
        // Silently fail - this is expected behavior if endpoint doesn't exist
      });

    } catch (error) {
      // Silently fail - use local stats only
    }
    
    // Always return local stats immediately
    return localStats;
  }

  async loadAnalytics() {
    const analyticsContainer = document.getElementById('analyticsContainer');
    if (!analyticsContainer) return;

    try {
      // Show loading state
      analyticsContainer.innerHTML = '<div class="loading-state">Loading analytics...</div>';

      // Load analytics data
      const analyticsData = await this.loadAnalyticsFromBackend();
      
      // Render analytics dashboard
      analyticsContainer.innerHTML = this.renderAnalyticsDashboard(analyticsData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      analyticsContainer.innerHTML = '<div class="error-state">Failed to load analytics. Please try again.</div>';
    }
  }

  async loadAnalyticsFromBackend() {
    try {
      const gymId = this.getGymId();
      const adminToken = this.getAdminToken();
      
      if (!adminToken) {
        return this.calculateLocalAnalytics();
      }

      // Fetch from multiple endpoints in parallel for comprehensive analytics
      const [offersResponse, couponsResponse, statsResponse] = await Promise.all([
        fetch(`${this.BASE_URL}/api/offers/offers?gymId=${gymId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${this.BASE_URL}/api/offers/coupons?gymId=${gymId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${this.BASE_URL}/api/offers/offers/stats?gymId=${gymId}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      let analytics = this.getDefaultAnalyticsData();
      let hasBackendData = false;

      // Merge offers data
      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        const offers = offersData.offers || [];
        
        analytics.totalOffers = offers.length;
        analytics.activeOffers = offers.filter(o => o.status === 'active').length;
        
        // Calculate total claims from offers
        const totalClaims = offers.reduce((sum, offer) => sum + (offer.usageCount || 0), 0);
        analytics.totalClaims = totalClaims;
        
        hasBackendData = true;
        console.log('✅ Offers data loaded:', offers.length, 'offers');
      }

      // Merge coupons data
      if (couponsResponse.ok) {
        const couponsData = await couponsResponse.json();
        const coupons = couponsData.coupons || [];
        
        analytics.activeCoupons = coupons.filter(c => c.status === 'active').length;
        analytics.totalCoupons = coupons.length;
        analytics.usedCoupons = coupons.filter(c => c.usageCount > 0).length;
        
        hasBackendData = true;
        console.log('✅ Coupons data loaded:', coupons.length, 'coupons');
      }

      // Merge stats data
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        if (statsData.totalRevenue) {
          analytics.revenue = statsData.totalRevenue;
        }
        if (statsData.totalRedemptions) {
          analytics.totalRedemptions = statsData.totalRedemptions;
        }
        if (statsData.conversionRate) {
          analytics.conversionRate = statsData.conversionRate;
        }
        
        console.log('✅ Stats data loaded:', statsData);
      }

      // If no backend data, fallback to local calculation
      if (!hasBackendData) {
        console.log('⚠️ No backend data, calculating from localStorage');
        return this.calculateLocalAnalytics();
      }

      console.log('✅ Comprehensive analytics loaded:', analytics);
      return analytics;

    } catch (error) {
      console.error('Error loading analytics from backend:', error);
      return this.calculateLocalAnalytics();
    }
  }

  // Calculate analytics from localStorage as fallback
  calculateLocalAnalytics() {
    try {
      const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
      const coupons = JSON.parse(localStorage.getItem('generatedCoupons') || '[]');
      const claimedOffers = JSON.parse(localStorage.getItem('userClaimedOffers') || '[]');

      const analytics = {
        totalOffers: campaigns.length,
        activeOffers: campaigns.filter(c => c.status === 'active').length,
        totalClaims: campaigns.reduce((sum, c) => sum + (c.usageCount || c.claimsCount || 0), 0),
        activeCoupons: coupons.filter(c => c.status === 'active').length,
        totalCoupons: coupons.length,
        usedCoupons: coupons.filter(c => c.usageCount > 0).length,
        totalRedemptions: claimedOffers.length,
        revenue: campaigns.reduce((sum, c) => {
          const value = c.type === 'percentage' ? 0 : (parseFloat(c.value) || 0);
          return sum + (value * (c.usageCount || 0));
        }, 0),
        conversionRate: campaigns.length > 0 ? 
          ((claimedOffers.length / campaigns.length) * 100).toFixed(1) : '0.0'
      };

      console.log('📊 Analytics calculated from localStorage:', analytics);
      return analytics;

    } catch (error) {
      console.error('Error calculating local analytics:', error);
      return this.getDefaultAnalyticsData();
    }
  }

  getDefaultAnalyticsData() {
    return {
      totalOffers: 0,
      totalCoupons: 0,
      totalClaims: 0,
      totalRevenue: 0,
      conversionRate: 0,
      popularOffers: [],
      recentActivity: [],
      monthlyStats: []
    };
  }

  // Coupon Management Functions
  async editCoupon(couponId) {
    console.log('✏️ Editing coupon:', couponId);
    
    try {
      // Find the coupon
      const coupon = this.coupons.find(c => c._id === couponId || c.id === couponId);
      if (!coupon) {
        this.showError('Coupon not found');
        return;
      }

      // Show edit modal with pre-filled data
      this.showEditCouponModal(coupon);
      
    } catch (error) {
      console.error('Error editing coupon:', error);
      this.showError('Failed to load coupon for editing');
    }
  }

  showEditCouponModal(coupon) {
    // Create and show modal with coupon data pre-filled
    const modal = document.createElement('div');
    modal.className = 'support-modal show';
    modal.id = 'editCouponModal';
    modal.innerHTML = `
      <div class="support-modal-content large">
        <div class="support-modal-header">
          <h3><i class="fas fa-edit"></i> Edit Coupon</h3>
          <button class="support-modal-close" onclick="offersManager.closeModal('editCouponModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="support-modal-body">
          <form id="editCouponForm">
            <input type="hidden" id="editCouponId" value="${coupon._id || coupon.id}">
            
            <div class="form-row">
              <div class="form-group">
                <label>Coupon Code</label>
                <input type="text" id="editCouponCode" value="${coupon.code}" readonly style="background: #f5f5f5;">
                <small>Code cannot be changed after creation</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Title</label>
                <input type="text" id="editCouponTitle" value="${coupon.title}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Description</label>
                <textarea id="editCouponDescription" rows="3">${coupon.description || ''}</textarea>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Discount Type</label>
                <select id="editDiscountType" required>
                  <option value="percentage" ${coupon.discountType === 'percentage' ? 'selected' : ''}>Percentage</option>
                  <option value="fixed" ${coupon.discountType === 'fixed' ? 'selected' : ''}>Fixed Amount</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Discount Value</label>
                <input type="number" id="editDiscountValue" value="${coupon.discountValue}" min="0" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Minimum Amount</label>
                <input type="number" id="editMinAmount" value="${coupon.minAmount || 0}" min="0">
              </div>
              
              <div class="form-group">
                <label>Usage Limit</label>
                <input type="number" id="editUsageLimit" value="${coupon.usageLimit || ''}" placeholder="Unlimited">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Expiry Date</label>
                <input type="date" id="editExpiryDate" value="${new Date(coupon.expiryDate || coupon.validTill).toISOString().split('T')[0]}" required>
              </div>
              
              <div class="form-group">
                <label>Status</label>
                <select id="editCouponStatus" required>
                  <option value="active" ${coupon.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="disabled" ${coupon.status === 'disabled' ? 'selected' : ''}>Disabled</option>
                  <option value="expired" ${coupon.status === 'expired' ? 'selected' : ''}>Expired</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div class="support-modal-footer">
          <button class="btn-secondary" onclick="offersManager.closeModal('editCouponModal')">
            Cancel
          </button>
          <button class="btn-primary" onclick="offersManager.saveEditedCoupon()">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  async saveEditedCoupon() {
    const couponId = document.getElementById('editCouponId').value;
    const updates = {
      title: document.getElementById('editCouponTitle').value,
      description: document.getElementById('editCouponDescription').value,
      discountValue: parseFloat(document.getElementById('editCouponValue').value),
      minAmount: parseFloat(document.getElementById('editCouponMinAmount').value),
      expiryDate: document.getElementById('editCouponExpiry').value,
    };

    try {
      this.showLoadingState();
      // FIX: Removed adminToken from the call
      await CouponBackendAPI.updateCoupon(couponId, updates);
      this.showSuccess('Coupon updated successfully!');
      this.closeModal('editCouponModal');
      this.renderCoupons(); // Refresh the list
    } catch (error) {
      this.showError(`Error updating coupon: ${error.message}`);
    } finally {
      this.hideLoadingState();
    }
  }

   async toggleCoupon(couponId) {
    const coupon = this.coupons.find(c => c._id === couponId);
    if (!coupon) return;
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';

    try {
      this.showLoadingState();
      // FIX: Corrected the API call and removed adminToken
      await CouponBackendAPI.toggleCouponStatus(couponId, newStatus);
      this.showSuccess(`Coupon status changed to ${newStatus}.`);
      this.renderCoupons();
    } catch (error) {
      this.showError(`Error toggling coupon status: ${error.message}`);
    } finally {
      this.hideLoadingState();
    }
  }

  async deleteCoupon(couponId) {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return;

    try {
      this.showLoadingState();
      // FIX: Removed adminToken from the call
      await CouponBackendAPI.deleteCoupon(couponId);
      this.showSuccess('Coupon deleted successfully.');
      this.renderCoupons();
    } catch (error) {
      this.showError(`Error deleting coupon: ${error.message}`);
    } finally {
      this.hideLoadingState();
    }
  }

  // Filter coupons by search query
  filterCoupons(searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    const couponsTableBody = document.getElementById('couponsTableBody');
    
    if (!couponsTableBody) return;

    // Get all coupon rows
    const rows = couponsTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (query === '' || text.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    // Show empty state if no results
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
    if (visibleRows.length === 0 && query !== '') {
      couponsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px;">
            <div class="empty-state">
              <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
              <p>No coupons found matching "${searchQuery}"</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  // Filter coupons by status
  filterCouponsByStatus(status) {
    const couponsTableBody = document.getElementById('couponsTableBody');
    
    if (!couponsTableBody) return;

    // If "all" is selected, reload all coupons
    if (status === 'all') {
      this.loadCoupons();
      return;
    }

    // Get all coupon rows
    const rows = couponsTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
      const statusBadge = row.querySelector('.status-badge');
      if (!statusBadge) return;
      
      const rowStatus = statusBadge.classList.contains('status-active') ? 'active' : 
                        statusBadge.classList.contains('status-expired') ? 'expired' : 'disabled';
      
      if (rowStatus === status) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    // Show empty state if no results
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
    if (visibleRows.length === 0) {
      couponsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px;">
            <div class="empty-state">
              <i class="fas fa-filter" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
              <p>No ${status} coupons found</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

  renderAnalyticsDashboard(data) {
    return `
      <div class="analytics-dashboard">
        <!-- Key Metrics -->
        <div class="analytics-metrics">
          <div class="metric-card">
            <div class="metric-icon offers">
              <i class="fas fa-gift"></i>
            </div>
            <div class="metric-content">
              <h3>${data.totalOffers || 0}</h3>
              <p>Total Offers</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon coupons">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <div class="metric-content">
              <h3>${data.totalCoupons || 0}</h3>
              <p>Total Coupons</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon claims">
              <i class="fas fa-hand-holding-heart"></i>
            </div>
            <div class="metric-content">
              <h3>${data.totalClaims || 0}</h3>
              <p>Total Claims</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon revenue">
              <i class="fas fa-rupee-sign"></i>
            </div>
            <div class="metric-content">
              <h3>₹${data.totalRevenue || 0}</h3>
              <p>Revenue Generated</p>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="analytics-charts">
          <div class="chart-container">
            <h4>Conversion Rate</h4>
            <div class="conversion-chart">
              <div class="conversion-circle">
                <div class="percentage">${data.conversionRate || 0}%</div>
                <p>Offer Conversion</p>
              </div>
            </div>
          </div>
          
          <div class="chart-container">
            <h4>Popular Offers</h4>
            <div class="popular-offers-list">
              ${data.popularOffers && data.popularOffers.length > 0 ? 
                data.popularOffers.map(offer => `
                  <div class="popular-offer-item">
                    <span class="offer-name">${offer.title}</span>
                    <span class="offer-claims">${offer.claims} claims</span>
                  </div>
                `).join('') : 
                '<p class="no-data">No popular offers data available</p>'
              }
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="analytics-activity">
          <h4>Recent Activity</h4>
          <div class="activity-list">
            ${data.recentActivity && data.recentActivity.length > 0 ? 
              data.recentActivity.map(activity => `
                <div class="activity-item">
                  <div class="activity-icon">
                    <i class="fas fa-${activity.type === 'claim' ? 'gift' : activity.type === 'create' ? 'plus' : 'edit'}"></i>
                  </div>
                  <div class="activity-content">
                    <p>${activity.description}</p>
                    <small>${this.formatDate(activity.timestamp)}</small>
                  </div>
                </div>
              `).join('') : 
              `<div class="no-activity">
                <i class="fas fa-chart-line" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
                <h3>No Activity Yet</h3>
                <p>Create your first offer to start seeing analytics data.</p>
                <button class="btn-primary" onclick="offersManager.switchTab('templates')">
                  <i class="fas fa-plus"></i> Create Offer
                </button>
              </div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  animateNumber(element, newValue) {
    const isMonetary = typeof newValue === 'string' && newValue.includes('₹');
    const numericValue = isMonetary ? parseInt(newValue.replace('₹', '')) : newValue;
    const currentValue = isMonetary ? 
      parseInt(element.textContent.replace('₹', '') || '0') : 
      parseInt(element.textContent || '0');
    
    const duration = 800; // Animation duration in ms
    const steps = 30;
    const increment = (numericValue - currentValue) / steps;
    let current = currentValue;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      
      if (step >= steps) {
        current = numericValue;
        clearInterval(timer);
      }
      
      const displayValue = Math.round(current);
      element.textContent = isMonetary ? `₹${displayValue}` : displayValue;
      
      // Add visual emphasis on final value
      if (step >= steps) {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#10b981';
        setTimeout(() => {
          element.style.transform = 'scale(1)';
          element.style.color = '';
        }, 300);
      }
    }, duration / steps);
  }

  updateAnalyticsStats(stats) {
    // Update analytics dashboard if it's visible
    const analyticsContainer = document.getElementById('analyticsContainer');
    if (analyticsContainer && this.currentTab === 'analytics') {
      // Force refresh analytics data
      setTimeout(() => {
        this.loadAnalytics();
      }, 100);
    }
  }

  updateOffersCountBadge() {
    // Silently update counters - don't spam console logs
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    
    // Update campaigns tab counter (existing element in HTML)
    const campaignsTabCounter = document.getElementById('campaignsTabCounter');
    if (campaignsTabCounter) {
      campaignsTabCounter.textContent = activeCampaigns.length;
    }
    
    // Update template count - ensure templates are initialized
    if (!this.templates || this.templates.length === 0) {
      this.templates = this.getPreDesignedTemplates();
    }
    const templatesCount = this.templates ? this.templates.length : 6; // Fallback to expected count
    const templatesTabCounter = document.getElementById('templatesTabCounter');
    if (templatesTabCounter) {
      templatesTabCounter.textContent = templatesCount;
    }
    
    // Update coupons count
    const coupons = JSON.parse(localStorage.getItem('generatedCoupons') || '[]');
    const activeCoupons = coupons.filter(c => c.status === 'active');
    const couponsTabCounter = document.getElementById('couponsTabCounter');
    if (couponsTabCounter) {
      couponsTabCounter.textContent = activeCoupons.length;
    }

    // Update analytics tab counter
    const analyticsTabCounter = document.getElementById('analyticsTabCounter');
    if (analyticsTabCounter) {
      const totalClaims = this.calculateTotalClaims();
      analyticsTabCounter.textContent = totalClaims;
    }
    
    // Update stats cards
    const stats = this.getLocalStats();
    this.updateStatsDisplay(stats);
  }

  updateStatsDisplay(stats) {
    // Silently update stats - don't spam console
    
    // Update stats cards with animation
    const statElements = {
      activeOffersCount: stats.activeCampaigns || 0,
      revenueFromOffersCount: `₹${(stats.revenue || 0).toLocaleString()}`,
      activeCouponsCount: stats.activeCoupons || 0,
      couponClaimsCount: stats.totalClaims || 0,
      conversionRateCount: `${stats.conversionRate || 0}%`
    };

    Object.entries(statElements).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        this.animateStatCounter(element, value);
      }
    });
  }

  animateStatCounter(element, targetValue) {
    // For percentage and currency values, just set directly with animation
    if (typeof targetValue === 'string') {
      element.textContent = targetValue;
      element.style.transition = 'all 0.3s ease';
      element.style.transform = 'scale(1.1)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 300);
      return;
    }

    // For numeric values, animate the counter
    const currentValue = parseInt(element.textContent) || 0;
    const increment = Math.ceil((targetValue - currentValue) / 20);
    let current = currentValue;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
        current = targetValue;
        clearInterval(timer);
      }
      element.textContent = current;
    }, 50);

    // Add visual feedback
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 300);
  }

  calculateTotalClaims() {
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const coupons = JSON.parse(localStorage.getItem('generatedCoupons') || '[]');
    
    let totalClaims = 0;
    campaigns.forEach(campaign => {
      totalClaims += campaign.claimsCount || 0;
    });
    coupons.forEach(coupon => {
      totalClaims += coupon.usageCount || 0;
    });
    
    return totalClaims;
  }

  openOfferCreationModal() {
    console.log('🚀 openOfferCreationModal() called');
    this.resetForm('offerCreationForm');
    this.openModal('offerCreationModal');
  }

  openCouponGenerationModal() {
    console.log('🚀 openCouponGenerationModal() called');
    this.resetForm('couponGenerationForm');
    this.generateRandomCouponCode();
    this.openModal('couponGenerationModal');
  }

  // Enhanced modal opening with consistent styling (like support-reviews.js)
  openModal(modalId) {
    console.log(`🔍 Attempting to open modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    
    if (modal) {
      console.log(`✅ Modal element found: ${modalId}`);
      console.log('🔍 Modal current classes:', modal.className);
      console.log('🔍 Modal current display:', window.getComputedStyle(modal).display);
      
      // Reset modal state with proper z-index and pointer events
      modal.style.display = 'flex';
      modal.style.opacity = '0';
      modal.style.zIndex = '999999';
      modal.style.pointerEvents = 'all';
      modal.style.visibility = 'visible';
      modal.classList.add('active');
      
      console.log('🔍 Modal after adding active class:', modal.className);
      console.log('🔍 Modal computed display after changes:', window.getComputedStyle(modal).display);
      
      // Smooth animation
      setTimeout(() => {
        modal.style.opacity = '1';
        console.log('✅ Modal opacity set to 1');
      }, 10);
      
      document.body.style.overflow = 'hidden';
      console.log(`✅ Modal ${modalId} opened successfully`);
    } else {
      console.error(`❌ Modal with ID ${modalId} not found.`);
      console.log('🔍 Available modal elements:', document.querySelectorAll('[id*="Modal"]'));
    }
  }

  closeModal(modalId = null) {
    // Close all support modals with smooth transition (like support-reviews.js)
    const modalsToClose = modalId ? [document.getElementById(modalId)] : document.querySelectorAll('.support-modal.active, .offers-modal.show');
    
    modalsToClose.forEach(modal => {
      if (modal && (modal.classList.contains('active') || modal.classList.contains('show'))) {
        modal.style.opacity = '0';
        setTimeout(() => {
          modal.classList.remove('active', 'show');
          modal.style.display = 'none';
          modal.style.zIndex = '-1';
          modal.style.pointerEvents = 'none';
          modal.style.visibility = 'hidden';
        }, 200);
      }
    });
    
    document.body.style.overflow = 'auto';
    console.log(`✅ Modal${modalId ? ` ${modalId}` : 's'} closed successfully`);
  }

  async handleOfferSubmission(event) {
    event.preventDefault();
    
    try {
      // Get form data
      const form = event.target;
      const formData = new FormData(form);
      
      // Extract offer data
      const offerData = {
        title: formData.get('offerTitle'),
        description: formData.get('offerDescription'),
        type: formData.get('offerType'),
        value: parseFloat(formData.get('offerValue')),
        category: formData.get('offerCategory') || 'membership',
        startDate: new Date(formData.get('offerStartDate')),
        endDate: new Date(formData.get('offerEndDate')),
        maxUses: formData.get('offerMaxUses') ? parseInt(formData.get('offerMaxUses')) : null,
        minAmount: parseFloat(formData.get('offerMinAmount')) || 0,
        displayOnWebsite: true,
        highlightOffer: formData.get('highlightOffer') === 'on'
      };

      // Validate required fields
      if (!offerData.title || !offerData.description || !offerData.type || !offerData.value) {
        this.showError('Please fill in all required fields');
        return;
      }

      // Validate dates
      if (offerData.startDate >= offerData.endDate) {
        this.showError('End date must be after start date');
        return;
      }

      if (offerData.startDate < new Date()) {
        this.showError('Start date cannot be in the past');
        return;
      }

      // Show loading
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
      submitBtn.disabled = true;

      // Create offer in backend
      const result = await this.createOfferInBackend(offerData);
      
      this.showSuccess(`Offer "${offerData.title}" created successfully!`);
      this.closeModal('offerCreationModal');
      this.loadOfferStats();
      this.switchTab('campaigns');
      
      // Reset form
      form.reset();

    } catch (error) {
      console.error('Error creating offer:', error);
      this.showError(error.message || 'Failed to create offer. Please try again.');
      
      // Reset button
      const submitBtn = event.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Offer';
        submitBtn.disabled = false;
      }
    }
  }

  async handleCouponSubmission(event) {
    event.preventDefault();
    const gymId = this.getGymId();
    if (!gymId) {
      this.showError('Cannot create coupon without a valid Gym ID.');
      return;
    }

    const couponData = {
      code: document.getElementById('couponCode').value,
      title: document.getElementById('couponTitle').value,
      description: document.getElementById('couponDescription').value,
      discountType: document.getElementById('couponDiscountType').value,
      discountValue: parseFloat(document.getElementById('couponDiscountValue').value),
      minAmount: parseFloat(document.getElementById('couponMinAmount').value),
      expiryDate: document.getElementById('couponExpiryDate').value,
      usageLimit: parseInt(document.getElementById('couponUsageLimit').value) || null,
      gymId: gymId,
    };

    try {
      this.showLoadingState();
      // FIX: Removed adminToken from the call
      await CouponBackendAPI.createCoupon(couponData);
      this.showSuccess('Coupon created successfully!');
      this.closeModal('couponGenerationModal');
      this.renderCoupons();
    } catch (error) {
      this.showError(`Error creating coupon: ${error.message}`);
    } finally {
      this.hideLoadingState();
    }
  }
  generateCouponCode() {
    const gymName = this.getGymName() || 'GYM';
    const prefix = gymName.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}${random}`;
    const couponCodeInput = document.getElementById('couponCode');
    if (couponCodeInput) couponCodeInput.value = code;
  }

  generateRandomCouponCode() {
    const adjectives = ['SUPER', 'MEGA', 'ULTRA', 'POWER', 'STRONG', 'FIT', 'ACTIVE'];
    const nouns = ['DEAL', 'SAVE', 'OFFER', 'BOOST', 'GAIN', 'FLEX', 'PUMP'];
    const numbers = Math.floor(Math.random() * 99) + 1;
    const code = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
    const couponCodeInput = document.getElementById('couponCodeInput');
    if (couponCodeInput) couponCodeInput.value = code;
  }

  // Backend Integration Functions
  async loadOfferTemplates() {
    const templatesGrid = document.getElementById('templatesGrid');
    if (!templatesGrid) {
      // Silently skip if DOM not ready - this is normal during tab switching
      return;
    }

    try {
      // Show loading only if grid is empty or has error
      const currentContent = templatesGrid.innerHTML.trim();
      const needsLoadingState = currentContent === '' || 
                               currentContent.includes('error-state') ||
                               currentContent.length < 50;
      
      if (needsLoadingState) {
        templatesGrid.innerHTML = '<div class="loading-state">Loading offer templates...</div>';
      }

      // Ensure templates are available
      if (!this.templates || this.templates.length === 0) {
        this.templates = this.getPreDesignedTemplates();
      }
      
      // Render templates immediately
      if (this.templates.length === 0) {
        templatesGrid.innerHTML = this.renderCreateOfferPrompt();
      } else {
        templatesGrid.innerHTML = this.templates.map(template => this.createTemplateCard(template)).join('');
      }

      // Mark templates as loaded
      this.templatesLoaded = true;

      // Update counter immediately
      this.updateTemplateCounter();

      console.log('✅ Template loading completed');

    } catch (error) {
      console.error('❌ Error loading offer templates:', error);
      templatesGrid.innerHTML = '<div class="error-state">Failed to load templates. <button onclick="window.offersManager.loadOfferTemplates()">Try Again</button></div>';
      
      // Ensure templates exist even on error
      if (!this.templates || this.templates.length === 0) {
        this.templates = this.getPreDesignedTemplates();
        this.templatesLoaded = true;
      }
    }
  }

  updateTemplateCounter() {
    const templatesCount = this.templates ? this.templates.length : 0;
    const templatesTabCounter = document.getElementById('templatesTabCounter');
    if (templatesTabCounter) {
      templatesTabCounter.textContent = templatesCount;
      console.log('✅ Template counter updated immediately:', templatesCount);
    } else {
      console.warn('❌ Templates tab counter element not found');
    }
  }

  getPreDesignedTemplates() {
    return [
      {
        id: 'new_member_special',
        title: 'New Member Special',
        description: 'Exclusive welcome offer for first-time gym members',
        discount: 50,
        discountType: 'percentage',
        duration: '30 days',
        type: 'premium',
        icon: 'fas fa-star',
        features: [
          'Full gym access',
          'Personal training session',
          'Nutrition consultation',
          'Free gym merchandise'
        ]
      },
      {
        id: 'student_discount',
        title: 'Student Discount',
        description: 'Special pricing for students with valid ID',
        discount: 30,
        discountType: 'percentage',
        duration: '90 days',
        type: 'standard',
        icon: 'fas fa-graduation-cap',
        features: [
          'Full gym access',
          'Group fitness classes',
          'Locker rental included',
          'Flexible timing'
        ]
      },
      {
        id: 'family_package',
        title: 'Family Package',
        description: 'Bring your family and save together',
        discount: 25,
        discountType: 'percentage',
        duration: '180 days',
        type: 'family',
        icon: 'fas fa-users',
        features: [
          'Up to 4 family members',
          'All gym facilities',
          'Family fitness classes',
          'Weekend special events'
        ]
      },
      {
        id: 'annual_membership',
        title: 'Annual Membership',
        description: 'Best value for committed fitness enthusiasts',
        discount: 2000,
        discountType: 'fixed',
        duration: '365 days',
        type: 'premium',
        icon: 'fas fa-calendar-alt',
        features: [
          'Full year access',
          'Priority booking',
          'Free guest passes',
          'Quarterly fitness assessment'
        ]
      },
      {
        id: 'corporate_wellness',
        title: 'Corporate Wellness',
        description: 'Group memberships for corporate teams',
        discount: 40,
        discountType: 'percentage',
        duration: '180 days',
        type: 'corporate',
        icon: 'fas fa-building',
        features: [
          'Group rates available',
          'Corporate fitness programs',
          'Team building activities',
          'Health seminars included'
        ]
      },
      {
        id: 'summer_special',
        title: 'Summer Body Special',
        description: 'Get ready for summer with this intensive program',
        discount: 35,
        discountType: 'percentage',
        duration: '90 days',
        type: 'seasonal',
        icon: 'fas fa-sun',
        features: [
          'Intensive workout plans',
          'Diet consultation',
          'Progress tracking',
          'Summer challenge participation'
        ]
      }
    ];
  }

  renderCreateOfferPrompt() {
    const gymName = this.getGymName();
    return `
      <div class="create-offer-prompt">
        <div class="prompt-content">
          <div class="prompt-icon">
            <i class="fas fa-plus-circle"></i>
          </div>
          <h3>Create Your First Offer</h3>
          <p>Start attracting customers by creating compelling offers for ${gymName}. 
             Offers you create here will automatically appear on your gym's public profile.</p>
          <div class="prompt-actions">
            <button class="btn-primary create-offer-btn" onclick="offersManager.openOfferCreationModal()">
              <i class="fas fa-plus"></i> Create New Offer
            </button>
            <button class="btn-secondary" onclick="offersManager.switchTab('campaigns')">
              <i class="fas fa-eye"></i> View Active Offers
            </button>
          </div>
        </div>
        <div class="offer-types-preview">
          <h4>Popular Offer Types:</h4>
          <div class="offer-type-cards">
            <div class="offer-type-card" onclick="offersManager.createQuickOffer('percentage')">
              <i class="fas fa-percent"></i>
              <span>Percentage Discount</span>
            </div>
            <div class="offer-type-card" onclick="offersManager.createQuickOffer('fixed')">
              <i class="fas fa-rupee-sign"></i>
              <span>Fixed Amount Off</span>
            </div>
            <div class="offer-type-card" onclick="offersManager.createQuickOffer('free_trial')">
              <i class="fas fa-gift"></i>
              <span>Free Trial</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createQuickOffer(offerType) {
    // Pre-fill the offer creation modal with the selected type
    this.openOfferCreationModal();
    
    setTimeout(() => {
      const typeSelect = document.getElementById('offerType');
      if (typeSelect) {
        typeSelect.value = offerType;
        
        // Trigger change event to update form
        typeSelect.dispatchEvent(new Event('change'));
      }
    }, 100);
  }

  async loadActiveCampaignsFromBackend() {
    try {
      const gymId = this.getGymId();
      const adminToken = this.getAdminToken();
      
      if (!adminToken) {
        console.warn('No admin token found, using local campaigns');
        return this.getLocalCampaigns();
      }

      const response = await fetch(`/api/offers/offers?gymId=${gymId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend campaigns loaded:', data.offers?.length || 0);
        return data.offers || [];
      } else {
        console.warn('Failed to load campaigns from backend:', response.status);
        return this.getLocalCampaigns();
      }
    } catch (error) {
      console.error('Error loading campaigns from backend:', error);
      return this.getLocalCampaigns();
    }
  }

  async createOfferInBackend(offerData) {
    try {
      const adminToken = this.getAdminToken();
      if (!adminToken) {
        throw new Error('Admin authentication required');
      }

      const response = await fetch('/api/offers/offers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...offerData,
          gymId: this.getGymId()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Offer created in backend:', result);
        return result;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create offer');
      }
    } catch (error) {
      console.error('Error creating offer in backend:', error);
      throw error;
    }
  }

  getGymId() { 
    const gymId = localStorage.getItem('gymId') || localStorage.getItem('adminGymId');
    console.log('🏢 Getting gymId:', gymId);
    if (!gymId) {
      console.warn('⚠️ No gym ID found in localStorage. Keys available:', Object.keys(localStorage));
    }
    return gymId;
  }
  
  getGymName() { 
    // Use the same pattern as gym-profile.js
    const gymData = window.currentGymProfile || {};
    return gymData.gymName || gymData.name || 'Your Gym';
  }

  // Enhanced authentication method using unified auth pattern
  getAdminToken() {
    // Check if UnifiedAuthManager is available
    if (window.authManager && typeof window.authManager.getToken === 'function') {
      const token = window.authManager.getToken();
      if (token) {
        console.log('✅ Token retrieved from UnifiedAuthManager');
        return token;
      }
    }

    // Fallback to direct localStorage checks with multiple possible keys
    const tokenKeys = ['gymAdminToken', 'adminToken', 'gymAuthToken'];
    
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token) {
        console.log(`✅ Token found in localStorage with key: ${key}`);
        return token;
      }
    }
    
    // Check sessionStorage as last resort
    for (const key of tokenKeys) {
      const token = sessionStorage.getItem(key);
      if (token) {
        console.log(`✅ Token found in sessionStorage with key: ${key}`);
        // Move to localStorage for persistence
        localStorage.setItem('gymAdminToken', token);
        return token;
      }
    }
    
    console.warn('❌ No admin token found in any storage location');
    return null;
  }

  // Local campaigns fallback for when backend is unavailable
  getLocalCampaigns() {
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    console.log('📦 Using local campaigns:', campaigns.length);
    return campaigns;
  }

  // Enhanced launch with proper campaign management
  async createAndStoreLocalCampaign(template, settings) {
    try {
      // First try to create in backend
      const backendOffer = await this.createOfferInBackend({
        title: template.title,
        description: template.description,
        type: template.discountType,
        value: template.discount,
        maxUses: settings.totalClaimLimit,
        perUserLimit: settings.perUserLimit,
        validUntil: this.calculateValidUntil(settings.duration, settings.customEndDate),
        targetAudience: settings.targetAudience,
        features: template.features,
        icon: template.icon,
        offerType: template.type,
        isActive: true,
        displaySettings: settings.displaySettings || {}
      });

      let campaignId;
      if (backendOffer && backendOffer._id) {
        campaignId = backendOffer._id;
        console.log('✅ Campaign created in backend with ID:', campaignId);
      } else {
        // Fallback to local storage
        campaignId = `local_${Date.now()}`;
        console.log('📦 Using local campaign storage with ID:', campaignId);
      }

      // Always store locally for quick access
      const campaign = await this.createLocalCampaign(template, settings, campaignId);
      
      return campaign;

    } catch (error) {
      console.error('Error in campaign creation:', error);
      // Fallback to local-only campaign
      const localId = `local_${Date.now()}`;
      return await this.createLocalCampaign(template, settings, localId);
    }
  }
  
  resetForm(formId) { document.getElementById(formId)?.reset(); }
  formatDate(dateString) { return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }

  getEmptyState(type) {
    const states = {
      campaigns: `<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No Active Campaigns</h3><p>Create your first campaign using templates or from scratch.</p><button class="btn-primary" onclick="offersManager.switchToTab('templates')"><i class="fas fa-plus"></i> Create Campaign</button></div>`,
      coupons: `<div class="empty-state"><i class="fas fa-ticket-alt"></i><h3>No Coupons Found</h3><p>Generate your first coupon to start offering discounts.</p><button class="btn-primary" onclick="offersManager.openCouponGenerationModal()"><i class="fas fa-plus"></i> Generate Coupon</button></div>`
    };
    return states[type] || '';
  }

  showSuccess(message) { 
    // Use unified notification system
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, 'success');
    } else {
      this.showNotification(message, 'success');
    }
  }
  
  showError(message) { 
    // Use unified notification system
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, 'error');
    } else {
      this.showNotification(message, 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Use unified notification system if available
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
      return;
    }
    
    // Fallback to custom notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Enhanced success notification for campaign launch
  showLaunchSuccessNotification(template, campaign) {
    const successModal = document.createElement('div');
    successModal.className = 'launch-success-modal support-modal active';
    successModal.innerHTML = `
      <div class="support-modal-content">
        <div class="launch-success-content">
          <div class="success-icon">
            <i class="fas fa-rocket"></i>
          </div>
          <h2>🎉 Campaign Launched Successfully!</h2>
          <div class="success-details">
            <div class="campaign-info">
              <h3>${template.title}</h3>
              <p>${template.description}</p>
            </div>
            <div class="launch-stats">
              <div class="stat-item">
                <i class="fas fa-users"></i>
                <span>Target: ${campaign.targetAudience === 'all' ? 'Everyone' : campaign.targetAudience === 'new' ? 'New Users' : 'Existing Members'}</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-gift"></i>
                <span>Limit: ${campaign.totalClaimLimit} claims</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-calendar"></i>
                <span>Duration: ${campaign.duration} days</span>
              </div>
            </div>
            <div class="next-steps">
              <h4>What happens next:</h4>
              <ul>
                <li><i class="fas fa-check"></i> Campaign is now live and visible on your gym profile</li>
                <li><i class="fas fa-check"></i> Users can start claiming this offer immediately</li>
                <li><i class="fas fa-check"></i> You can track claims in the Analytics section</li>
              </ul>
            </div>
          </div>
          <div class="success-actions">
            <button class="btn-primary" onclick="this.closest('.launch-success-modal').remove()">
              <i class="fas fa-thumbs-up"></i> Awesome!
            </button>
            <button class="btn-secondary" onclick="this.closest('.launch-success-modal').remove(); offersManager.switchTab('analytics')">
              <i class="fas fa-chart-line"></i> View Analytics
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(successModal);

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (successModal.parentNode) {
        successModal.remove();
      }
    }, 10000);

    // Also show a regular notification
    this.showSuccess(`🚀 Campaign "${template.title}" is now live!`);
  }

  // Comprehensive UI refresh after campaign launch
  async refreshAllOffersData() {
    try {
      console.log('🔄 Refreshing all offers data...');
      
      // Refresh campaigns list
      await this.loadActiveCampaigns();
      
      // Refresh analytics and stats
      await this.loadOfferStats();
      await this.loadAnalytics();
      
      // Refresh coupons list
      await this.loadCoupons();
      
      // Update tab counters
      this.updateOffersCountBadge();
      
      // Update stats display if on dashboard
      const stats = await this.loadOfferStatsFromBackend();
      this.updateStatsDisplay(stats);
      
      // Trigger gym details page refresh if available
      this.notifyGymDetailsOfNewOffer();
      
      console.log('✅ All offers data refreshed successfully');
      
    } catch (error) {
      console.error('Error refreshing offers data:', error);
    }
  }

  // Test method for debugging
  testDataAndCounters() {
    console.log('🧪 Testing offers data and counters...');
    
    const gymId = this.getGymId();
    console.log('🏢 Current gym ID:', gymId);
    
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    console.log('📋 Active campaigns:', campaigns.length, campaigns);
    
    const gymOffersKey = `gymOffers_${gymId}`;
    const gymOffers = JSON.parse(localStorage.getItem(gymOffersKey) || '[]');
    console.log('🏋️ Gym offers:', gymOffers.length, gymOffers);
    
    const stats = this.getLocalStats();
    console.log('📊 Local stats:', stats);
    
    // Test counter updates
    this.updateOffersCountBadge();
    this.updateStatsDisplay(stats);
    
    console.log('✅ Test completed');
    return {
      gymId,
      campaigns: campaigns.length,
      gymOffers: gymOffers.length,
      stats
    };
  }

  // Notify gym details page of new offer for immediate display
  notifyGymDetailsOfNewOffer() {
    try {
      // If gym details offers manager exists, refresh it
      if (window.gymOffersManager && typeof window.gymOffersManager.loadActiveOffers === 'function') {
        console.log('🔄 Refreshing gym details offers...');
        window.gymOffersManager.loadActiveOffers();
      }
      
      // Dispatch custom event for any listening components
      const event = new CustomEvent('offerLaunched', {
        detail: { timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error notifying gym details of new offer:', error);
    }
  }
}

// Manual initialization function (like support-reviews.js)
window.initializeOffersManager = function() {
  console.log('🚀 Called initializeOffersManager()');
  if (!window.offersManager) {
    console.log('🔄 Creating new OffersManager instance...');
    window.offersManager = new OffersManager();
  } else {
    console.log('⚠️ Offers Manager already initialized, calling loadInitialData...');
    window.offersManager.loadInitialData();
  }
};

// Test function for debugging
window.testOffersData = function() {
  if (window.offersManager) {
    return window.offersManager.testDataAndCounters();
  } else {
    console.error('❌ Offers manager not initialized');
    return null;
  }
};

// Enhanced test functions for comprehensive debugging
window.testOfferCounters = function() {
  console.log('🧪 Testing offer counters and stats...');
  
  if (window.offersManager) {
    // Test counter updates
    window.offersManager.updateOffersCountBadge();
    
    // Test stats calculation
    const stats = window.offersManager.getLocalStats();
    console.log('📊 Current stats:', stats);
    
    // Test individual elements
    const elements = {
      templatesTabCounter: document.getElementById('templatesTabCounter'),
      campaignsTabCounter: document.getElementById('campaignsTabCounter'),
      couponsTabCounter: document.getElementById('couponsTabCounter'),
      analyticsTabCounter: document.getElementById('analyticsTabCounter'),
      activeOffersCount: document.getElementById('activeOffersCount'),
      revenueFromOffersCount: document.getElementById('revenueFromOffersCount'),
      activeCouponsCount: document.getElementById('activeCouponsCount'),
      couponClaimsCount: document.getElementById('couponClaimsCount'),
      conversionRateCount: document.getElementById('conversionRateCount')
    };
    
    console.log('🔍 Element availability check:');
    Object.entries(elements).forEach(([name, element]) => {
      console.log(`${name}: ${element ? '✅ Found' : '❌ Missing'} ${element ? `(value: ${element.textContent})` : ''}`);
    });
    
    return {
      stats,
      elements: Object.fromEntries(Object.entries(elements).map(([k, v]) => [k, !!v]))
    };
  } else {
    console.error('❌ OffersManager not available');
    return null;
  }
};

window.testBackendWorkflow = function() {
  console.log('🧪 Testing backend workflow integration...');
  
  if (window.offersManager) {
    // Test authentication
    const adminToken = window.offersManager.getAdminToken();
    console.log('🔑 Admin token:', adminToken ? '✅ Present' : '❌ Missing');
    
    // Test gym ID
    const gymId = window.offersManager.getGymId();
    console.log('🏢 Gym ID:', gymId ? `✅ Present (${gymId})` : '❌ Missing');
    
    // Test local data
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const coupons = JSON.parse(localStorage.getItem('generatedCoupons') || '[]');
    
    console.log('📦 Local data:');
    console.log('  - Campaigns:', campaigns.length);
    console.log('  - Coupons:', coupons.length);
    
    // Test backend sync if available
    if (adminToken) {
      window.offersManager.syncOffersWithBackend()
        .then(() => console.log('✅ Backend sync test successful'))
        .catch(err => console.log('❌ Backend sync test failed:', err.message));
    }
    
    return {
      hasToken: !!adminToken,
      hasGymId: !!gymId,
      localDataCount: {
        campaigns: campaigns.length,
        coupons: coupons.length
      }
    };
  } else {
    console.error('❌ OffersManager not available');
    return null;
  }
};

window.forceUpdateUI = function() {
  console.log('🔄 Forcing UI update...');
  
  if (window.offersManager) {
    window.offersManager.updateOffersCountBadge();
    console.log('✅ UI update forced');
  } else {
    console.error('❌ OffersManager not available');
  }
};

window.testTemplateLoading = function() {
  console.log('🧪 Testing template loading specifically...');
  
  if (window.offersManager) {
    // Check if templates are loaded
    console.log('📋 Current templates:', window.offersManager.templates?.length || 0);
    console.log('📋 Templates loaded flag:', window.offersManager.templatesLoaded);
    
    // Force template initialization
    window.offersManager.templates = window.offersManager.getPreDesignedTemplates();
    window.offersManager.templatesLoaded = true;
    console.log('📋 After forced init:', window.offersManager.templates.length);
    
    // Update counter
    window.offersManager.updateTemplateCounter();
    
    // Check template grid
    const templatesGrid = document.getElementById('templatesGrid');
    console.log('🎯 Templates grid found:', !!templatesGrid);
    
    if (templatesGrid) {
      console.log('🎯 Templates grid content length:', templatesGrid.innerHTML.length);
      console.log('🎯 Grid has loading state:', templatesGrid.innerHTML.includes('loading-state'));
      console.log('🎯 Grid has error state:', templatesGrid.innerHTML.includes('error-state'));
      
      if (templatesGrid.innerHTML.length < 100 || templatesGrid.innerHTML.includes('loading-state')) {
        console.log('🔄 Grid seems empty or loading, forcing reload...');
        window.offersManager.loadOfferTemplates();
      }
    }
    
    // Force complete UI refresh
    window.offersManager.updateOffersCountBadge();
    
    return {
      templatesCount: window.offersManager.templates?.length || 0,
      templatesLoaded: window.offersManager.templatesLoaded,
      gridFound: !!templatesGrid,
      gridContentLength: templatesGrid?.innerHTML.length || 0,
      hasLoadingState: templatesGrid?.innerHTML.includes('loading-state') || false
    };
  } else {
    console.error('❌ OffersManager not available');
    return null;
  }
};

window.forceTemplateReload = function() {
  console.log('🔄 Forcing template reload...');
  
  if (window.offersManager) {
    // Reset state
    window.offersManager.templatesLoaded = false;
    window.offersManager.templates = [];
    
    // Clear grid
    const templatesGrid = document.getElementById('templatesGrid');
    if (templatesGrid) {
      templatesGrid.innerHTML = '';
    }
    
    // Force reload
    window.offersManager.loadOfferTemplates();
    
    console.log('✅ Template reload forced');
  } else {
    console.error('❌ OffersManager not available');
  }
};

// For global access
window.OffersManager = OffersManager;