/**
 * Visibility-Gated Chart Manager
 * Defers Chart.js initialization until elements become visible
 * Prevents blocking main thread during startup
 */

class VisibilityChartManager {
    constructor() {
        this.pendingCharts = new Map();
        this.activeCharts = new Map();
        this.intersectionObserver = null;
        this.initializeObserver();
        
        // Performance tracking
        this.metrics = {
            chartsDeferred: 0,
            chartsLoaded: 0,
            loadingTimesSaved: 0
        };
    }

    /**
     * Initialize Intersection Observer for visibility detection
     */
    initializeObserver() {
        if (!window.IntersectionObserver) {
            console.warn('IntersectionObserver not supported, falling back to immediate loading');
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadChartForElement(entry.target);
                    }
                });
            },
            {
                root: null,
                rootMargin: '50px', // Start loading 50px before visible
                threshold: 0.1 // Trigger when 10% visible
            }
        );
    }

    /**
     * Register a chart for deferred loading
     */
    deferChart(elementId, chartConfig, dependencies = []) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Chart element ${elementId} not found`);
            return null;
        }

        const chartData = {
            elementId,
            element,
            config: chartConfig,
            dependencies,
            timestamp: performance.now()
        };

        this.pendingCharts.set(elementId, chartData);
        this.metrics.chartsDeferred++;

        // Add placeholder content
        this.addChartPlaceholder(element);

        // Start observing if intersection observer is available
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        } else {
            // Fallback: load after a short delay
            setTimeout(() => this.loadChartForElement(element), 100);
        }

        return elementId;
    }

    /**
     * Add loading placeholder to chart container
     */
    addChartPlaceholder(element) {
        const placeholder = document.createElement('div');
        placeholder.className = 'chart-loading-placeholder';
        placeholder.innerHTML = `
            <div class="chart-skeleton">
                <div class="chart-skeleton-title"></div>
                <div class="chart-skeleton-legend">
                    <div class="chart-skeleton-legend-item"></div>
                    <div class="chart-skeleton-legend-item"></div>
                    <div class="chart-skeleton-legend-item"></div>
                </div>
                <div class="chart-skeleton-canvas">
                    <div class="chart-skeleton-bars">
                        <div class="chart-skeleton-bar" style="height: 60%"></div>
                        <div class="chart-skeleton-bar" style="height: 80%"></div>
                        <div class="chart-skeleton-bar" style="height: 45%"></div>
                        <div class="chart-skeleton-bar" style="height: 90%"></div>
                        <div class="chart-skeleton-bar" style="height: 70%"></div>
                        <div class="chart-skeleton-bar" style="height: 55%"></div>
                    </div>
                </div>
            </div>
        `;

        // Add skeleton CSS if not already present
        this.addSkeletonCSS();

        element.appendChild(placeholder);
    }

    /**
     * Add skeleton loading CSS
     */
    addSkeletonCSS() {
        if (document.getElementById('chart-skeleton-styles')) return;

        const style = document.createElement('style');
        style.id = 'chart-skeleton-styles';
        style.textContent = `
            .chart-loading-placeholder {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 300px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }

            .chart-skeleton {
                width: 90%;
                max-width: 600px;
                animation: chart-pulse 1.5s ease-in-out infinite;
            }

            .chart-skeleton-title {
                height: 20px;
                background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%);
                border-radius: 4px;
                margin-bottom: 20px;
                background-size: 200% 100%;
                animation: skeleton-shimmer 1.5s infinite;
            }

            .chart-skeleton-legend {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                justify-content: center;
            }

            .chart-skeleton-legend-item {
                width: 60px;
                height: 12px;
                background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%);
                border-radius: 6px;
                background-size: 200% 100%;
                animation: skeleton-shimmer 1.5s infinite;
            }

            .chart-skeleton-canvas {
                height: 200px;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                gap: 8px;
                padding: 20px 0;
            }

            .chart-skeleton-bars {
                display: flex;
                align-items: flex-end;
                gap: 12px;
                height: 160px;
            }

            .chart-skeleton-bar {
                width: 24px;
                background: linear-gradient(180deg, #007bff, #0056b3);
                border-radius: 2px 2px 0 0;
                opacity: 0.3;
                animation: skeleton-bar-pulse 2s ease-in-out infinite;
            }

            .chart-skeleton-bar:nth-child(1) { animation-delay: 0s; }
            .chart-skeleton-bar:nth-child(2) { animation-delay: 0.2s; }
            .chart-skeleton-bar:nth-child(3) { animation-delay: 0.4s; }
            .chart-skeleton-bar:nth-child(4) { animation-delay: 0.6s; }
            .chart-skeleton-bar:nth-child(5) { animation-delay: 0.8s; }
            .chart-skeleton-bar:nth-child(6) { animation-delay: 1s; }

            @keyframes skeleton-shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }

            @keyframes skeleton-bar-pulse {
                0%, 100% { opacity: 0.3; transform: scaleY(1); }
                50% { opacity: 0.6; transform: scaleY(1.1); }
            }

            @keyframes chart-pulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Load chart when element becomes visible
     */
    async loadChartForElement(element) {
        const elementId = element.id;
        const chartData = this.pendingCharts.get(elementId);
        
        if (!chartData || this.activeCharts.has(elementId)) {
            return;
        }

        const startTime = performance.now();

        try {
            // Remove from pending and stop observing
            this.pendingCharts.delete(elementId);
            if (this.intersectionObserver) {
                this.intersectionObserver.unobserve(element);
            }

            // Load dependencies first
            await this.loadDependencies(chartData.dependencies);

            // Remove placeholder
            const placeholder = element.querySelector('.chart-loading-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Ensure Chart.js is available
            if (!window.Chart) {
                console.error('Chart.js not loaded');
                return;
            }

            // Create canvas element if not exists
            let canvas = element.querySelector('canvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                element.appendChild(canvas);
            }

            // Initialize chart with fade-in effect
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 0.3s ease-in-out';

            const chart = new Chart(canvas, chartData.config);
            this.activeCharts.set(elementId, chart);

            // Fade in the chart
            requestAnimationFrame(() => {
                canvas.style.opacity = '1';
            });

            const loadTime = performance.now() - startTime;
            this.metrics.chartsLoaded++;
            this.metrics.loadingTimesSaved += (performance.now() - chartData.timestamp);

            console.log(`📊 Chart ${elementId} loaded in ${loadTime.toFixed(2)}ms`);

        } catch (error) {
            console.error(`Failed to load chart ${elementId}:`, error);
            this.showChartError(element);
        }
    }

    /**
     * Load chart dependencies
     */
    async loadDependencies(dependencies) {
        if (!dependencies || dependencies.length === 0) return;

        const loadPromises = dependencies.map(dep => {
            if (typeof dep === 'string') {
                return this.loadScript(dep);
            }
            return Promise.resolve(dep);
        });

        await Promise.all(loadPromises);
    }

    /**
     * Load external script
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Show error state for failed chart
     */
    showChartError(element) {
        element.innerHTML = `
            <div class="chart-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load chart</p>
                <button onclick="window.visibilityChartManager.retryChart('${element.id}')" class="retry-btn">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Retry loading a failed chart
     */
    retryChart(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            this.loadChartForElement(element);
        }
    }

    /**
     * Force load all pending charts (for debugging)
     */
    loadAllCharts() {
        console.log('🚀 Force loading all pending charts...');
        for (const [elementId, chartData] of this.pendingCharts) {
            this.loadChartForElement(chartData.element);
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            pendingCharts: this.pendingCharts.size,
            activeCharts: this.activeCharts.size,
            averageTimesSaved: this.metrics.chartsDeferred > 0 
                ? (this.metrics.loadingTimesSaved / this.metrics.chartsDeferred).toFixed(2) + 'ms'
                : '0ms'
        };
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        // Destroy active charts
        for (const chart of this.activeCharts.values()) {
            if (chart.destroy) {
                chart.destroy();
            }
        }

        this.pendingCharts.clear();
        this.activeCharts.clear();
    }
}

// Global instance
window.visibilityChartManager = new VisibilityChartManager();

// Helper function for easy chart deferring
window.deferChart = (elementId, chartConfig, dependencies = []) => {
    return window.visibilityChartManager.deferChart(elementId, chartConfig, dependencies);
};

console.log('📊 VisibilityChartManager initialized - Charts will load only when visible');