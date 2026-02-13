/**
 * Skeleton Loading Manager
 * Provides instant visual feedback for heavy tabs with animated placeholders
 * while data loads asynchronously in background
 */

class SkeletonLoadingManager {
    constructor() {
        this.activeSkeletons = new Map();
        this.skeletonTemplates = new Map();
        this.addSkeletonCSS();
        
        // Performance tracking
        this.metrics = {
            skeletonsShown: 0,
            skeletonsHidden: 0,
            averageShowTime: 0,
            totalShowTime: 0
        };

        this.setupDefaultTemplates();
    }

    /**
     * Add skeleton CSS animations and styles
     */
    addSkeletonCSS() {
        if (document.getElementById('skeleton-loading-styles')) return;

        const style = document.createElement('style');
        style.id = 'skeleton-loading-styles';
        style.textContent = `
            .skeleton-container {
                position: relative;
                overflow: hidden;
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
            }

            .skeleton-item {
                background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%);
                background-size: 200% 100%;
                animation: skeleton-shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 10px;
            }

            .skeleton-text {
                height: 16px;
            }

            .skeleton-title {
                height: 24px;
                width: 60%;
                margin-bottom: 20px;
            }

            .skeleton-line-short {
                width: 70%;
            }

            .skeleton-line-medium {
                width: 85%;
            }

            .skeleton-line-long {
                width: 95%;
            }

            .skeleton-button {
                height: 36px;
                width: 120px;
                border-radius: 6px;
            }

            .skeleton-card {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
            }

            .skeleton-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                display: inline-block;
                vertical-align: top;
                margin-right: 12px;
            }

            .skeleton-table {
                width: 100%;
                border-collapse: collapse;
            }

            .skeleton-table-row {
                border-bottom: 1px solid #e9ecef;
            }

            .skeleton-table-cell {
                padding: 12px 8px;
                height: 20px;
            }

            .skeleton-chart {
                height: 300px;
                display: flex;
                align-items: flex-end;
                justify-content: space-around;
                padding: 20px;
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
            }

            .skeleton-chart-bar {
                width: 24px;
                background: linear-gradient(180deg, #007bff, #0056b3);
                border-radius: 2px 2px 0 0;
                animation: skeleton-bar-wave 2s ease-in-out infinite;
            }

            .skeleton-chart-bar:nth-child(1) { height: 60%; animation-delay: 0s; }
            .skeleton-chart-bar:nth-child(2) { height: 80%; animation-delay: 0.2s; }
            .skeleton-chart-bar:nth-child(3) { height: 45%; animation-delay: 0.4s; }
            .skeleton-chart-bar:nth-child(4) { height: 90%; animation-delay: 0.6s; }
            .skeleton-chart-bar:nth-child(5) { height: 70%; animation-delay: 0.8s; }
            .skeleton-chart-bar:nth-child(6) { height: 55%; animation-delay: 1s; }

            .skeleton-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .skeleton-stat-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }

            .skeleton-stat-icon {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                margin-bottom: 15px;
            }

            .skeleton-stat-value {
                height: 32px;
                width: 80px;
                margin-bottom: 8px;
            }

            .skeleton-stat-label {
                height: 14px;
                width: 120px;
            }

            .skeleton-list {
                background: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
            }

            .skeleton-list-item {
                display: flex;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #f1f3f4;
            }

            .skeleton-list-item:last-child {
                border-bottom: none;
            }

            .skeleton-list-content {
                flex: 1;
                margin-left: 12px;
            }

            .skeleton-pulse {
                animation: skeleton-pulse 2s ease-in-out infinite;
            }

            @keyframes skeleton-shimmer {
                0% {
                    background-position: -200% 0;
                }
                100% {
                    background-position: 200% 0;
                }
            }

            @keyframes skeleton-pulse {
                0%, 100% {
                    opacity: 0.4;
                }
                50% {
                    opacity: 0.8;
                }
            }

            @keyframes skeleton-bar-wave {
                0%, 100% {
                    opacity: 0.4;
                    transform: scaleY(1);
                }
                50% {
                    opacity: 0.8;
                    transform: scaleY(1.1);
                }
            }

            .skeleton-fade-out {
                animation: skeleton-fade-out 0.3s ease-out forwards;
            }

            @keyframes skeleton-fade-out {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }

            .skeleton-fade-in {
                animation: skeleton-fade-in 0.3s ease-out forwards;
            }

            @keyframes skeleton-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Setup default skeleton templates for common UI patterns
     */
    setupDefaultTemplates() {
        // Dashboard stats template
        this.skeletonTemplates.set('dashboard-stats', () => `
            <div class="skeleton-stats-grid">
                <div class="skeleton-stat-card">
                    <div class="skeleton-item skeleton-stat-icon"></div>
                    <div class="skeleton-item skeleton-stat-value"></div>
                    <div class="skeleton-item skeleton-stat-label"></div>
                </div>
                <div class="skeleton-stat-card">
                    <div class="skeleton-item skeleton-stat-icon"></div>
                    <div class="skeleton-item skeleton-stat-value"></div>
                    <div class="skeleton-item skeleton-stat-label"></div>
                </div>
                <div class="skeleton-stat-card">
                    <div class="skeleton-item skeleton-stat-icon"></div>
                    <div class="skeleton-item skeleton-stat-value"></div>
                    <div class="skeleton-item skeleton-stat-label"></div>
                </div>
                <div class="skeleton-stat-card">
                    <div class="skeleton-item skeleton-stat-icon"></div>
                    <div class="skeleton-item skeleton-stat-value"></div>
                    <div class="skeleton-item skeleton-stat-label"></div>
                </div>
            </div>
        `);

        // Table template
        this.skeletonTemplates.set('table', () => `
            <div class="skeleton-container">
                <div class="skeleton-item skeleton-title"></div>
                <table class="skeleton-table">
                    ${Array.from({length: 8}, () => `
                        <tr class="skeleton-table-row">
                            <td class="skeleton-table-cell"><div class="skeleton-item skeleton-text"></div></td>
                            <td class="skeleton-table-cell"><div class="skeleton-item skeleton-text skeleton-line-short"></div></td>
                            <td class="skeleton-table-cell"><div class="skeleton-item skeleton-text skeleton-line-medium"></div></td>
                            <td class="skeleton-table-cell"><div class="skeleton-item skeleton-button"></div></td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `);

        // List template
        this.skeletonTemplates.set('list', () => `
            <div class="skeleton-list">
                ${Array.from({length: 6}, () => `
                    <div class="skeleton-list-item">
                        <div class="skeleton-item skeleton-avatar"></div>
                        <div class="skeleton-list-content">
                            <div class="skeleton-item skeleton-text skeleton-line-medium"></div>
                            <div class="skeleton-item skeleton-text skeleton-line-short"></div>
                        </div>
                        <div class="skeleton-item skeleton-button"></div>
                    </div>
                `).join('')}
            </div>
        `);

        // Chart template
        this.skeletonTemplates.set('chart', () => `
            <div class="skeleton-container">
                <div class="skeleton-item skeleton-title"></div>
                <div class="skeleton-chart">
                    <div class="skeleton-chart-bar"></div>
                    <div class="skeleton-chart-bar"></div>
                    <div class="skeleton-chart-bar"></div>
                    <div class="skeleton-chart-bar"></div>
                    <div class="skeleton-chart-bar"></div>
                    <div class="skeleton-chart-bar"></div>
                </div>
            </div>
        `);

        // Form template
        this.skeletonTemplates.set('form', () => `
            <div class="skeleton-container">
                <div class="skeleton-item skeleton-title"></div>
                ${Array.from({length: 5}, () => `
                    <div style="margin-bottom: 20px;">
                        <div class="skeleton-item skeleton-text skeleton-line-short" style="margin-bottom: 8px;"></div>
                        <div class="skeleton-item" style="height: 40px; width: 100%;"></div>
                    </div>
                `).join('')}
                <div class="skeleton-item skeleton-button"></div>
            </div>
        `);

        // Card grid template
        this.skeletonTemplates.set('card-grid', () => `
            <div class="skeleton-container">
                <div class="skeleton-item skeleton-title"></div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                    ${Array.from({length: 6}, () => `
                        <div class="skeleton-card">
                            <div class="skeleton-item" style="height: 120px; margin-bottom: 15px;"></div>
                            <div class="skeleton-item skeleton-text skeleton-line-medium"></div>
                            <div class="skeleton-item skeleton-text skeleton-line-short"></div>
                            <div class="skeleton-item skeleton-button" style="margin-top: 15px;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
    }

    /**
     * Show skeleton loading state
     */
    showSkeleton(containerId, templateType = 'table', options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Store original content
        const originalContent = container.innerHTML;
        const startTime = performance.now();

        // Get template
        const template = this.skeletonTemplates.get(templateType);
        if (!template) {
            console.error(`Skeleton template ${templateType} not found`);
            return;
        }

        // Apply skeleton
        container.innerHTML = template();
        container.classList.add('skeleton-fade-in');

        // Store skeleton info
        this.activeSkeletons.set(containerId, {
            originalContent,
            startTime,
            templateType
        });

        this.metrics.skeletonsShown++;
        console.log(`💀 Skeleton shown for ${containerId} (${templateType})`);

        return containerId;
    }

    /**
     * Hide skeleton and restore content with smooth transition
     */
    async hideSkeleton(containerId, newContent = null) {
        const container = document.getElementById(containerId);
        const skeletonInfo = this.activeSkeletons.get(containerId);
        
        if (!container || !skeletonInfo) {
            return;
        }

        // Calculate show time
        const showTime = performance.now() - skeletonInfo.startTime;
        this.metrics.totalShowTime += showTime;

        try {
            // Add fade out animation
            container.classList.add('skeleton-fade-out');

            // Wait for fade out animation
            await new Promise(resolve => setTimeout(resolve, 300));

            // Replace content
            const contentToShow = newContent || skeletonInfo.originalContent;
            container.innerHTML = contentToShow;

            // Remove skeleton classes and add fade in
            container.classList.remove('skeleton-fade-out', 'skeleton-fade-in');
            container.classList.add('skeleton-fade-in');

            // Remove fade in after animation
            setTimeout(() => {
                container.classList.remove('skeleton-fade-in');
            }, 300);

        } finally {
            // Cleanup
            this.activeSkeletons.delete(containerId);
            this.metrics.skeletonsHidden++;
            this.metrics.averageShowTime = this.metrics.totalShowTime / this.metrics.skeletonsHidden;

            console.log(`✅ Skeleton hidden for ${containerId} (shown for ${showTime.toFixed(0)}ms)`);
        }
    }

    /**
     * Register custom skeleton template
     */
    registerTemplate(name, templateFunction) {
        this.skeletonTemplates.set(name, templateFunction);
        console.log(`📝 Registered skeleton template: ${name}`);
    }

    /**
     * Show skeleton for specific data loading scenarios
     */
    async showForDataLoad(containerId, templateType, dataLoadPromise) {
        // Show skeleton immediately
        this.showSkeleton(containerId, templateType);

        try {
            // Wait for data to load
            const result = await dataLoadPromise;
            
            // Hide skeleton after minimum show time (prevents flicker)
            const minShowTime = 500; // 500ms minimum
            const skeletonInfo = this.activeSkeletons.get(containerId);
            if (skeletonInfo) {
                const elapsed = performance.now() - skeletonInfo.startTime;
                if (elapsed < minShowTime) {
                    await new Promise(resolve => setTimeout(resolve, minShowTime - elapsed));
                }
            }

            return result;
        } catch (error) {
            // Show error state
            this.showError(containerId, error.message);
            throw error;
        }
    }

    /**
     * Show error state
     */
    showError(containerId, message = 'Failed to load data') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="skeleton-container" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 20px;"></i>
                <h3 style="color: #dc3545; margin-bottom: 10px;">Loading Failed</h3>
                <p style="color: #666; margin-bottom: 20px;">${message}</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;

        // Remove from active skeletons
        this.activeSkeletons.delete(containerId);
    }

    /**
     * Bulk skeleton operations for multiple containers
     */
    showMultiple(containers, templateType = 'table') {
        const results = {};
        containers.forEach(containerId => {
            results[containerId] = this.showSkeleton(containerId, templateType);
        });
        return results;
    }

    hideMultiple(containers) {
        const promises = containers.map(containerId => 
            this.hideSkeleton(containerId)
        );
        return Promise.all(promises);
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeskeletons: this.activeSkeletons.size,
            availableTemplates: this.skeletonTemplates.size,
            averageShowTime: `${this.metrics.averageShowTime.toFixed(0)}ms`
        };
    }

    /**
     * Cleanup all skeletons
     */
    cleanup() {
        for (const containerId of this.activeSkeletons.keys()) {
            this.hideSkeleton(containerId);
        }
    }
}

// Global instance
window.skeletonLoadingManager = new SkeletonLoadingManager();

// Helper functions for easy usage
window.showSkeleton = (containerId, templateType, options) => {
    return window.skeletonLoadingManager.showSkeleton(containerId, templateType, options);
};

window.hideSkeleton = (containerId, newContent) => {
    return window.skeletonLoadingManager.hideSkeleton(containerId, newContent);
};

window.skeletonForDataLoad = (containerId, templateType, dataPromise) => {
    return window.skeletonLoadingManager.showForDataLoad(containerId, templateType, dataPromise);
};

console.log('💀 SkeletonLoadingManager initialized - Instant visual feedback available');