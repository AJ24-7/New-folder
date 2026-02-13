// Equipment Management JavaScript
class EquipmentManager {
    constructor() {
        this.equipmentData = [];
        this.currentEquipment = null;
        this.selectedPhotos = [];
        this.gymId = this.getGymId();
        this.token = null; // Will be set asynchronously
        
        // Memory leak prevention - track event listeners
        this.eventListeners = [];
        this.boundHandlers = new Map();
        
        // Authentication helper reference
        this.AuthHelper = window.AuthHelper;
        
        // API manager reference
        this.api = window.asyncFetchManager;
        
        // Lazy loading manager reference
        this.lazyLoader = window.LazyLoadManager;
        
        this.init();
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

    getGymId() {
        // Use centralized GymIdManager if available
        if (window.GymIdManager) {
            return window.GymIdManager.getCurrentGymId();
        }
        
        // Fallback to original logic
        let gymId = localStorage.getItem('gymId');
        if (!gymId) {
            gymId = localStorage.getItem('currentGymId');
        }
        if (!gymId && window.currentGymProfile) {
            gymId = window.currentGymProfile._id || window.currentGymProfile.id;
        }
        return gymId;
    }

    async getAuthToken() {
        // Use AuthHelper for standardized authentication
        if (this.AuthHelper) {
            return await this.AuthHelper.getToken();
        }
        
        // Fallback to localStorage if AuthHelper not available
        let token = localStorage.getItem('gymAdminToken');
        if (!token) {
            token = localStorage.getItem('token');
        }
        if (!token) {
            token = localStorage.getItem('authToken');
        }
        return token;
    }

    async init() {
        // Immediate initialization - critical UI setup
        this.bindEvents();
        
        // Defer heavy data loading until needed
        if (this.lazyLoader) {
            this.lazyLoader.deferUntilIdle('equipment-data-load', () => this.loadEquipmentData());
        } else {
            // Fallback - load after a short delay
            setTimeout(() => this.loadEquipmentData(), 300);
        }
        
        // Refresh auth data periodically
        setInterval(async () => {
            this.token = await this.getAuthToken();
            this.gymId = this.getGymId();
        }, 30000); // Refresh every 30 seconds
    }

    bindEvents() {
        // Main buttons
        const addBtn = document.getElementById('addEquipmentBtn');
        if (addBtn) this.addTrackedEventListener(addBtn, 'click', () => this.openAddEquipmentModal());
        
        const bulkBtn = document.getElementById('bulkImportBtn');
        if (bulkBtn) this.addTrackedEventListener(bulkBtn, 'click', () => this.openBulkImportModal());

        // Modal controls
        const closeModal = document.getElementById('closeEquipmentModal');
        if (closeModal) this.addTrackedEventListener(closeModal, 'click', () => this.closeEquipmentModal());
        
        const closeDetailModal = document.getElementById('closeEquipmentDetailModal');
        if (closeDetailModal) this.addTrackedEventListener(closeDetailModal, 'click', () => this.closeEquipmentDetailModal());
        
        const closePhotoModal = document.getElementById('closePhotoGalleryModal');
        if (closePhotoModal) this.addTrackedEventListener(closePhotoModal, 'click', () => this.closePhotoGalleryModal());

        // Form events
        const equipForm = document.getElementById('equipmentForm');
        if (equipForm) this.addTrackedEventListener(equipForm, 'submit', (e) => this.handleFormSubmit(e));
        
        const cancelBtn = document.getElementById('cancelEquipmentBtn');
        if (cancelBtn) this.addTrackedEventListener(cancelBtn, 'click', () => this.closeEquipmentModal());

        // Photo upload events
        const photoUpload = document.getElementById('equipmentPhotoUpload');
        if (photoUpload) this.addTrackedEventListener(photoUpload, 'click', () => this.triggerPhotoUpload());
        
        const photoInput = document.getElementById('equipmentPhotos');
        if (photoInput) this.addTrackedEventListener(photoInput, 'change', (e) => this.handlePhotoSelection(e));

        // Drag and drop for photos
        const uploadArea = document.getElementById('equipmentPhotoUpload');
        if (uploadArea) {
            this.addTrackedEventListener(uploadArea, 'dragover', (e) => this.handleDragOver(e));
            this.addTrackedEventListener(uploadArea, 'dragleave', (e) => this.handleDragLeave(e));
            this.addTrackedEventListener(uploadArea, 'drop', (e) => this.handleDrop(e));
        }

        // Search and filters
        const searchInput = document.getElementById('equipmentSearchInput');
        if (searchInput) this.addTrackedEventListener(searchInput, 'input', (e) => this.handleSearch(e));
        
        const categoryFilter = document.getElementById('equipmentCategoryFilter');
        if (categoryFilter) this.addTrackedEventListener(categoryFilter, 'change', () => this.handleFilter());
        
        const statusFilter = document.getElementById('equipmentStatusFilter');
        if (statusFilter) this.addTrackedEventListener(statusFilter, 'change', () => this.handleFilter());
        
        const sortBy = document.getElementById('equipmentSortBy');
        if (sortBy) this.addTrackedEventListener(sortBy, 'change', () => this.handleSort());

        // Photo gallery navigation
        const prevPhoto = document.getElementById('prevPhoto');
        if (prevPhoto) this.addTrackedEventListener(prevPhoto, 'click', () => this.showPrevPhoto());
        
        const nextPhoto = document.getElementById('nextPhoto');
        if (nextPhoto) this.addTrackedEventListener(nextPhoto, 'click', () => this.showNextPhoto());
    }

    async loadEquipmentData() {
        try {
            this.showLoadingState();
            this.showStatCardsLoading(); // Show skeleton on stat cards
            
            // Get fresh token using AuthHelper
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const gymId = this.getGymId();
            if (!gymId) {
                throw new Error('Gym ID is not available. Please ensure you are logged in and have selected a gym.');
            }

            // Use the specific gym endpoint to get gym data including equipment
            const response = await fetch(`/api/gyms/${gymId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                if (errorText.trim().startsWith('<!DOCTYPE')) {
                    throw new Error(`Authentication failed. Server returned HTML instead of JSON. Please login again. (Status: ${response.status})`);
                }
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.message || `Server error: ${response.status}`);
                } catch {
                    throw new Error(`Server error: ${response.status} - ${errorText}`);
                }
            }
            
            const gymData = await response.json();
            
            // Store gym ID if we didn't have it
            if (!this.gymId && gymData._id) {
                this.gymId = gymData._id;
                localStorage.setItem('gymId', this.gymId);
            }
            
            // Extract equipment data
            this.equipmentData = gymData.equipment || [];
            
            this.renderEquipmentGrid();
            this.updateStatistics();
            
            // Refresh dashboard equipment gallery if we're not on equipment tab
            if (!document.getElementById('equipmentTab')?.style.display || 
                document.getElementById('equipmentTab').style.display === 'none') {
                this.refreshDashboardEquipmentGallery();
            }
        } catch (error) {
            console.error('Error loading equipment data:', error);
            this.showErrorState(`Failed to load equipment data: ${error.message}`);
        }
    }

    showLoadingState() {
        const grid = document.getElementById('equipmentGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="equipment-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading equipment...</p>
                </div>
            `;
        }
    }

    showErrorState(message) {
        const grid = document.getElementById('equipmentGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="equipment-empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Equipment</h3>
                    <p>${message}</p>
                    <button onclick="equipmentManager.loadEquipmentData()">Try Again</button>
                </div>
            `;
        }
    }

    renderEquipmentGrid() {
        const grid = document.getElementById('equipmentGrid');
        if (!grid) return;

        if (this.equipmentData.length === 0) {
            grid.innerHTML = `
                <div class="equipment-empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <h3>No Equipment Added Yet</h3>
                    <p>Start by adding your first piece of equipment to track and manage your gym inventory.</p>
                    <button onclick="equipmentManager.openAddEquipmentModal()">Add Equipment</button>
                </div>
            `;
            return;
        }

        const filteredData = this.getFilteredEquipment();
        
        grid.innerHTML = filteredData.map(equipment => this.createEquipmentCard(equipment)).join('');
    }

    createEquipmentCard(equipment) {
        const statusClass = `status-${equipment.status || 'available'}`;
        const statusText = this.getStatusText(equipment.status || 'available');
        const imageUrl = equipment.photos && equipment.photos.length > 0 
            ? equipment.photos[0] 
            : null;

        return `
            <div class="equipment-card" data-id="${equipment.id || equipment._id}">
                <div class="equipment-image">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" alt="${equipment.name}" loading="lazy">` 
                        : `<div class="equipment-image-placeholder"><i class="fas fa-dumbbell"></i></div>`
                    }
                    <div class="equipment-status-badge ${statusClass}">${statusText}</div>
                </div>
                <div class="equipment-info">
                    <div class="equipment-category">${equipment.category || 'General'}</div>
                    <h3 class="equipment-name">${equipment.name}</h3>
                    ${equipment.brand ? `<div class="equipment-brand">${equipment.brand} ${equipment.model || ''}</div>` : ''}
                    
                    <div class="equipment-details">
                        <div class="equipment-quantity">Quantity: ${equipment.quantity || 1}</div>
                        ${equipment.location ? `<div class="equipment-location">${equipment.location}</div>` : ''}
                    </div>
                    
                    ${equipment.description ? `<div class="equipment-description">${equipment.description}</div>` : ''}
                    
                    <div class="equipment-actions">
                        <button class="equipment-action-btn view-btn" onclick="equipmentManager.viewEquipment('${equipment.id || equipment._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="equipment-action-btn edit-btn" onclick="equipmentManager.editEquipment('${equipment.id || equipment._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="equipment-action-btn delete-btn" onclick="equipmentManager.deleteEquipment('${equipment.id || equipment._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'available': 'Available',
            'maintenance': 'Maintenance',
            'out-of-order': 'Out of Order'
        };
        return statusMap[status] || 'Available';
    }

    showStatCardsLoading() {
        // Show skeleton loading on all equipment stat cards
        const statCards = [
            'totalEquipmentStatCard',
            'availableEquipmentStatCard', 
            'maintenanceEquipmentStatCard',
            'outOfOrderEquipmentStatCard'
        ];
        
        statCards.forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                card.classList.add('loading');
            }
        });
    }

    hideStatCardsLoading() {
        // Hide skeleton loading on all equipment stat cards
        const statCards = [
            'totalEquipmentStatCard',
            'availableEquipmentStatCard',
            'maintenanceEquipmentStatCard',
            'outOfOrderEquipmentStatCard'
        ];
        
        statCards.forEach(cardId => {
            const card = document.getElementById(cardId);
            if (card) {
                card.classList.remove('loading');
            }
        });
    }

    updateStatistics() {
        const total = this.equipmentData.length;
        const available = this.equipmentData.filter(eq => eq.status === 'available' || !eq.status).length;
        const maintenance = this.equipmentData.filter(eq => eq.status === 'maintenance').length;
        const outOfOrder = this.equipmentData.filter(eq => eq.status === 'out-of-order').length;

        // Calculate percentages
        const availablePercentage = total > 0 ? ((available / total) * 100).toFixed(1) : 0;

        // Update stat card values
        document.getElementById('totalEquipmentCount').textContent = total;
        document.getElementById('availableEquipmentCount').textContent = available;
        document.getElementById('maintenanceEquipmentCount').textContent = maintenance;
        document.getElementById('outOfOrderEquipmentCount').textContent = outOfOrder;

        // Update stat change indicators
        const availableCard = document.getElementById('availableEquipmentStatCard');
        if (availableCard) {
            const changeElement = availableCard.querySelector('.stat-change');
            if (changeElement && availablePercentage > 0) {
                changeElement.innerHTML = `<i class="fas fa-arrow-up"></i> ${availablePercentage}%`;
            }
        }

        // Hide skeleton loading after updating
        this.hideStatCardsLoading();
    }

    getFilteredEquipment() {
        let filtered = [...this.equipmentData];

        // Search filter
        const searchTerm = document.getElementById('equipmentSearchInput')?.value?.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(equipment => 
                equipment.name?.toLowerCase().includes(searchTerm) ||
                equipment.category?.toLowerCase().includes(searchTerm) ||
                equipment.brand?.toLowerCase().includes(searchTerm) ||
                equipment.description?.toLowerCase().includes(searchTerm)
            );
        }

        // Category filter
        const categoryFilter = document.getElementById('equipmentCategoryFilter')?.value || '';
        if (categoryFilter) {
            filtered = filtered.filter(equipment => equipment.category === categoryFilter);
        }

        // Status filter
        const statusFilter = document.getElementById('equipmentStatusFilter')?.value || '';
        if (statusFilter) {
            filtered = filtered.filter(equipment => (equipment.status || 'available') === statusFilter);
        }

        // Sort
        const sortBy = document.getElementById('equipmentSortBy')?.value || 'name';
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'category':
                    return (a.category || '').localeCompare(b.category || '');
                case 'quantity':
                    return (b.quantity || 0) - (a.quantity || 0);
                case 'status':
                    return (a.status || 'available').localeCompare(b.status || 'available');
                case 'date':
                    return new Date(b.purchaseDate || b.createdAt || 0) - new Date(a.purchaseDate || a.createdAt || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    handleSearch() {
        this.renderEquipmentGrid();
    }

    handleFilter() {
        this.renderEquipmentGrid();
    }

    handleSort() {
        this.renderEquipmentGrid();
    }

    openAddEquipmentModal() {
        this.currentEquipment = null;
        this.selectedPhotos = [];
        document.getElementById('equipmentModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add Equipment';
        document.getElementById('equipmentForm').reset();
        document.getElementById('equipmentPhotoPreview').innerHTML = '';
        document.getElementById('equipmentModal').style.display = 'flex';
    }

    editEquipment(id) {
        const equipment = this.equipmentData.find(eq => (eq.id || eq._id) === id);
        if (!equipment) return;

        this.currentEquipment = equipment;
        // Convert existing photos to the expected format
        this.selectedPhotos = (equipment.photos || []).map(photoUrl => ({
            url: photoUrl,
            name: photoUrl.split('/').pop() || 'photo',
            isExisting: true // Flag to identify existing photos
        }));
        
        document.getElementById('equipmentModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Equipment';
        this.populateForm(equipment);
        this.renderPhotoPreview();
        document.getElementById('equipmentModal').style.display = 'flex';
    }

    populateForm(equipment) {
        document.getElementById('equipmentId').value = equipment.id || equipment._id || '';
        document.getElementById('equipmentName').value = equipment.name || '';
        document.getElementById('equipmentBrand').value = equipment.brand || '';
        document.getElementById('equipmentCategory').value = equipment.category || '';
        document.getElementById('equipmentModel').value = equipment.model || '';
        document.getElementById('equipmentQuantity').value = equipment.quantity || 1;
        document.getElementById('equipmentStatus').value = equipment.status || 'available';
        document.getElementById('equipmentPurchaseDate').value = equipment.purchaseDate || '';
        document.getElementById('equipmentPrice').value = equipment.price || '';
        document.getElementById('equipmentWarranty').value = equipment.warranty || '';
        document.getElementById('equipmentLocation').value = equipment.location || '';
        document.getElementById('equipmentDescription').value = equipment.description || '';
        document.getElementById('equipmentSpecs').value = equipment.specifications || '';
    }

    viewEquipment(id) {
        const equipment = this.equipmentData.find(eq => (eq.id || eq._id) === id);
        if (!equipment) return;

        this.renderEquipmentDetail(equipment);
        document.getElementById('equipmentDetailModal').style.display = 'flex';
    }

    renderEquipmentDetail(equipment) {
        const container = document.getElementById('equipmentDetailContent');
        if (!container) return;

        const statusClass = `status-${equipment.status || 'available'}`;
        const statusText = this.getStatusText(equipment.status || 'available');

        container.innerHTML = `
            <div class="equipment-detail-content">
                ${equipment.photos && equipment.photos.length > 0 ? `
                    <div class="equipment-detail-images">
                        <div class="main-image" onclick="equipmentManager.openPhotoGallery('${equipment.id || equipment._id}')">
                            <img src="${equipment.photos[0]}" alt="${equipment.name}">
                            <div class="image-count"><i class="fas fa-images"></i> ${equipment.photos.length} photos</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="equipment-detail-info">
                    <div class="equipment-header">
                        <h2>${equipment.name}</h2>
                        <div class="equipment-status-badge ${statusClass}">${statusText}</div>
                    </div>
                    
                    <div class="equipment-specs-grid">
                        <div class="spec-item">
                            <label>Category:</label>
                            <span>${equipment.category || 'Not specified'}</span>
                        </div>
                        ${equipment.brand ? `
                            <div class="spec-item">
                                <label>Brand:</label>
                                <span>${equipment.brand}</span>
                            </div>
                        ` : ''}
                        ${equipment.model ? `
                            <div class="spec-item">
                                <label>Model:</label>
                                <span>${equipment.model}</span>
                            </div>
                        ` : ''}
                        <div class="spec-item">
                            <label>Quantity:</label>
                            <span>${equipment.quantity || 1}</span>
                        </div>
                        ${equipment.location ? `
                            <div class="spec-item">
                                <label>Location:</label>
                                <span>${equipment.location}</span>
                            </div>
                        ` : ''}
                        ${equipment.purchaseDate ? `
                            <div class="spec-item">
                                <label>Purchase Date:</label>
                                <span>${new Date(equipment.purchaseDate).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                        ${equipment.price ? `
                            <div class="spec-item">
                                <label>Purchase Price:</label>
                                <span>₹${equipment.price}</span>
                            </div>
                        ` : ''}
                        ${equipment.warranty ? `
                            <div class="spec-item">
                                <label>Warranty:</label>
                                <span>${equipment.warranty} months</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${equipment.description ? `
                        <div class="equipment-description-full">
                            <h4>Description</h4>
                            <p>${equipment.description}</p>
                        </div>
                    ` : ''}
                    
                    ${equipment.specifications ? `
                        <div class="equipment-specifications">
                            <h4>Technical Specifications</h4>
                            <p>${equipment.specifications}</p>
                        </div>
                    ` : ''}
                    
                    <div class="equipment-detail-actions">
                        <button class="btn btn-primary" onclick="equipmentManager.editEquipment('${equipment.id || equipment._id}')">
                            <i class="fas fa-edit"></i> Edit Equipment
                        </button>
                        <button class="btn btn-danger" onclick="equipmentManager.deleteEquipment('${equipment.id || equipment._id}')">
                            <i class="fas fa-trash"></i> Delete Equipment
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async deleteEquipment(id) {
        if (!confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) {
            return;
        }

        try {
            if (!this.token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`/api/equipment/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.equipmentData = this.equipmentData.filter(eq => (eq.id || eq._id) !== id);
                this.renderEquipmentGrid();
                this.updateStatistics();
                this.showSuccessMessage('Equipment deleted successfully');
                this.closeEquipmentDetailModal();
                
                // Refresh dashboard equipment gallery
                this.refreshDashboardEquipmentGallery();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete equipment');
            }
        } catch (error) {
            console.error('Error deleting equipment:', error);
            this.showErrorMessage(`Failed to delete equipment: ${error.message}`);
        }
    }

    closeEquipmentModal() {
        document.getElementById('equipmentModal').style.display = 'none';
        this.currentEquipment = null;
        this.selectedPhotos = [];
    }

    closeEquipmentDetailModal() {
        document.getElementById('equipmentDetailModal').style.display = 'none';
    }

    closePhotoGalleryModal() {
        document.getElementById('equipmentPhotoGalleryModal').style.display = 'none';
    }

    triggerPhotoUpload() {
        document.getElementById('equipmentPhotos').click();
    }

    handlePhotoSelection(event) {
        const files = Array.from(event.target.files);
        this.processSelectedFiles(files);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.processSelectedFiles(files);
    }

    processSelectedFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.selectedPhotos.push({
                        file: file,
                        url: e.target.result,
                        name: file.name
                    });
                    this.renderPhotoPreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    renderPhotoPreview() {
        const container = document.getElementById('equipmentPhotoPreview');
        if (!container) return;

        container.innerHTML = this.selectedPhotos.map((photo, index) => {
            // Handle both existing photos (URLs) and new uploads (File objects)
            const imageUrl = photo.url || photo;
            const photoName = photo.name || (typeof photo === 'string' ? photo.split('/').pop() : 'photo');
            
            return `
                <div class="photo-preview-item">
                    <img src="${imageUrl}" alt="${photoName}" onerror="this.style.display='none'">
                    <button type="button" class="photo-remove-btn" onclick="equipmentManager.removePhoto(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                    ${photo.isExisting ? '<div class="existing-photo-badge">Existing</div>' : ''}
                </div>
            `;
        }).join('');
    }

    removePhoto(index) {
        this.selectedPhotos.splice(index, 1);
        this.renderPhotoPreview();
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (!this.token) {
            this.showErrorMessage('No authentication token found. Please login again.');
            return;
        }
        
        const formData = new FormData();
        const form = event.target;
        
        // Add form fields
        const formFields = [
            'name', 'brand', 'category', 'model', 'quantity', 'status',
            'purchaseDate', 'price', 'warranty', 'location', 'description', 'specifications'
        ];
        
        formFields.forEach(field => {
            const value = form.elements[field]?.value;
            if (value) formData.append(field, value);
        });

        // Add photos - separate new uploads from existing photos
        const newPhotoFiles = [];
        const existingPhotoUrls = [];
        
        this.selectedPhotos.forEach(photo => {
            if (photo.file) {
                // New file upload
                newPhotoFiles.push(photo.file);
            } else if (photo.isExisting || typeof photo === 'string') {
                // Existing photo URL
                existingPhotoUrls.push(photo.url || photo);
            }
        });

        // Add new photo files to FormData
        newPhotoFiles.forEach(file => {
            formData.append('photos', file);
        });

        // Add existing photo URLs to FormData
        if (existingPhotoUrls.length > 0) {
            formData.append('existingPhotos', JSON.stringify(existingPhotoUrls));
        }

        try {
            const url = this.currentEquipment 
                ? `/api/equipment/${this.currentEquipment.id || this.currentEquipment._id}`
                : '/api/equipment';
            
            const method = this.currentEquipment ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (this.currentEquipment) {
                // Update existing equipment
                const index = this.equipmentData.findIndex(eq => 
                    (eq.id || eq._id) === (this.currentEquipment.id || this.currentEquipment._id)
                );
                if (index !== -1) {
                    this.equipmentData[index] = result.equipment || result;
                }
                this.showSuccessMessage('Equipment updated successfully');
                
                // Enhanced notification for equipment update
                const equipmentName = result.equipment?.name || result.name;
                if (window.NotificationManager) {
                    window.NotificationManager.notifyEquipment('updated', equipmentName, 'Successfully updated');
                }
                
                // Show payment notification if price was provided
                const equipmentPrice = result.equipment?.price || result.price;
                if (equipmentPrice && equipmentPrice > 0) {
                    setTimeout(() => {
                        this.showPaymentNotification('Equipment price updated - payment record has been updated', equipmentPrice);
                        
                        // Enhanced payment notification for equipment price update
                        if (window.NotificationManager) {
                            window.NotificationManager.notify(
                                'Equipment Price Update',
                                `Price updated to ₹${equipmentPrice} for ${equipmentName}`,
                                'info'
                            );
                        }
                    }, 1500);
                }
            } else {
                // Add new equipment
                this.equipmentData.push(result.equipment || result);
                this.showSuccessMessage('Equipment added successfully');
                
                // Enhanced notification for equipment addition
                const equipmentName = result.equipment?.name || result.name;
                if (window.NotificationManager) {
                    window.NotificationManager.notifyEquipment('added', equipmentName, 'Successfully added to inventory');
                }
                
                // Show payment notification if price was provided
                const equipmentPrice = result.equipment?.price || result.price;
                if (equipmentPrice && equipmentPrice > 0) {
                    setTimeout(() => {
                        this.showPaymentNotification('Equipment purchase recorded - payment entry has been created', equipmentPrice);
                        
                        // Enhanced payment notification for equipment purchase
                        if (window.NotificationManager) {
                            window.NotificationManager.notify(
                                'Equipment Purchase',
                                `Payment of ₹${equipmentPrice} recorded for ${equipmentName}`,
                                'success'
                            );
                        }
                    }, 1500);
                }
            }
            
            this.renderEquipmentGrid();
            this.updateStatistics();
            this.closeEquipmentModal();
            
            // Refresh dashboard equipment gallery
            this.refreshDashboardEquipmentGallery();
            
            // Enhanced notification refresh using unified system
            if (window.NotificationManager && window.NotificationManager.getInstance()) {
                window.NotificationManager.getInstance().loadExistingNotifications();
            }
        } catch (error) {
            console.error('Error saving equipment:', error);
            this.showErrorMessage(`Failed to save equipment: ${error.message}`);
        }
    }

    openPhotoGallery(equipmentId) {
        const equipment = this.equipmentData.find(eq => (eq.id || eq._id) === equipmentId);
        if (!equipment || !equipment.photos || equipment.photos.length === 0) return;

        this.currentPhotoIndex = 0;
        this.currentEquipmentPhotos = equipment.photos;
        
        document.getElementById('photoGalleryTitle').textContent = `${equipment.name} - Photos`;
        this.updatePhotoGallery();
        document.getElementById('equipmentPhotoGalleryModal').style.display = 'flex';
    }

    updatePhotoGallery() {
        const mainPhoto = document.getElementById('mainPhotoDisplay');
        const thumbnails = document.getElementById('photoThumbnails');
        
        if (mainPhoto) {
            mainPhoto.src = this.currentEquipmentPhotos[this.currentPhotoIndex];
        }
        
        if (thumbnails) {
            thumbnails.innerHTML = this.currentEquipmentPhotos.map((photo, index) => `
                <div class="photo-thumbnail ${index === this.currentPhotoIndex ? 'active' : ''}" 
                     onclick="equipmentManager.showPhoto(${index})">
                    <img src="${photo}" alt="Photo ${index + 1}">
                </div>
            `).join('');
        }
    }

    showPhoto(index) {
        this.currentPhotoIndex = index;
        this.updatePhotoGallery();
    }

    showPrevPhoto() {
        this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.currentEquipmentPhotos.length) % this.currentEquipmentPhotos.length;
        this.updatePhotoGallery();
    }

    showNextPhoto() {
        this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.currentEquipmentPhotos.length;
        this.updatePhotoGallery();
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }

    showErrorMessage(message) {
        // Use centralized ErrorManager if available
        if (window.ErrorManager) {
            window.ErrorManager.showError(message);
            return;
        }
        
        // Fallback to original implementation
        const messageDiv = document.createElement('div');
        messageDiv.className = 'error-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }

    showPaymentNotification(message, amount) {
        // Create a temporary payment notification message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'payment-notification-message';
        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-rupee-sign"></i>
                <div>
                    <div style="font-weight: 600;">${message}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Amount: ₹${amount}</div>
                </div>
            </div>
        `;
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #17a2b8;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 4000);
    }

    openBulkImportModal() {
        // Placeholder for bulk import functionality
        alert('Bulk import feature coming soon! You can manually add equipment for now.');
    }

    // Refresh dashboard equipment gallery
    refreshDashboardEquipmentGallery() {
        // Call the global loadDashboardEquipment function if it exists
        if (typeof window.loadDashboardEquipment === 'function') {
            window.loadDashboardEquipment();
        } else if (typeof loadDashboardEquipment === 'function') {
            loadDashboardEquipment();
        }
    }
}

// Initialize equipment manager when the page loads
let equipmentManager;

// Add CSS animations for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    .equipment-detail-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .equipment-detail-images .main-image {
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        height: 300px;
    }

    .equipment-detail-images .main-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .equipment-detail-images .image-count {
        position: absolute;
        bottom: 12px;
        right: 12px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
    }

    .equipment-specs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin: 20px 0;
    }

    .spec-item {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
    }

    .spec-item label {
        font-weight: 600;
        color: #666;
    }

    .spec-item span {
        color: #333;
    }

    .equipment-description-full,
    .equipment-specifications {
        margin: 20px 0;
    }

    .equipment-description-full h4,
    .equipment-specifications h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-size: 16px;
    }

    .equipment-description-full p,
    .equipment-specifications p {
        margin: 0;
        color: #666;
        line-height: 1.6;
    }

    .equipment-detail-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #eee;
    }

    .equipment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .equipment-header h2 {
        margin: 0;
        color: #333;
    }

    .existing-photo-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        background: #17a2b8;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
    }

    .photo-preview-item {
        position: relative;
        display: inline-block;
        margin: 4px;
    }

    .photo-preview-item img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 8px;
        border: 2px solid #ddd;
    }

    .photo-remove-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .photo-remove-btn:hover {
        background: #c82333;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        equipmentManager = new EquipmentManager();
        window.equipmentManager = equipmentManager; // Make it globally accessible
    });
} else {
    equipmentManager = new EquipmentManager();
    window.equipmentManager = equipmentManager; // Make it globally accessible
}
