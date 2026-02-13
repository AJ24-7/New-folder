/**
 * Smart Polling Manager
 * Replaces resource-heavy setInterval polling with visibility-aware,
 * pause/resume mechanisms and WebSocket fallbacks
 */

class SmartPollingManager {
    constructor() {
        this.activePollers = new Map();
        this.pausedPollers = new Map();
        this.isTabVisible = !document.hidden;
        this.isWindowFocused = document.hasFocus();
        
        // Performance tracking
        this.metrics = {
            pollersCreated: 0,
            pollsExecuted: 0,
            pollsSkipped: 0,
            backgroundPauses: 0,
            resourcesSaved: 0
        };

        this.setupVisibilityListeners();
    }

    /**
     * Setup page visibility and focus listeners
     */
    setupVisibilityListeners() {
        // Page visibility API
        document.addEventListener('visibilitychange', () => {
            this.isTabVisible = !document.hidden;
            if (this.isTabVisible) {
                this.resumeAllPollers();
            } else {
                this.pauseBackgroundPollers();
            }
        });

        // Window focus/blur events
        window.addEventListener('focus', () => {
            this.isWindowFocused = true;
            this.resumeAllPollers();
        });

        window.addEventListener('blur', () => {
            this.isWindowFocused = false;
            this.pauseBackgroundPollers();
        });
    }

    /**
     * Create smart poller with visibility awareness
     */
    createPoller(id, pollFunction, options = {}) {
        const config = {
            interval: options.interval || 5000, // Default 5 seconds
            pauseWhenHidden: options.pauseWhenHidden !== false, // Default true
            pauseWhenBlurred: options.pauseWhenBlurred || false,
            maxRetries: options.maxRetries || 3,
            backoffMultiplier: options.backoffMultiplier || 1.5,
            priority: options.priority || 'normal', // low, normal, high
            ...options
        };

        const poller = {
            id,
            pollFunction,
            config,
            intervalId: null,
            currentInterval: config.interval,
            retryCount: 0,
            lastPollTime: 0,
            isActive: false,
            isPaused: false,
            element: options.element ? document.getElementById(options.element) : null
        };

        this.activePollers.set(id, poller);
        this.metrics.pollersCreated++;

        // Start polling if conditions are met
        if (this.shouldStartPoller(poller)) {
            this.startPoller(poller);
        }

        return {
            id,
            pause: () => this.pausePoller(id),
            resume: () => this.resumePoller(id),
            stop: () => this.stopPoller(id),
            updateInterval: (newInterval) => this.updatePollerInterval(id, newInterval)
        };
    }

    /**
     * Check if poller should start based on visibility and priority
     */
    shouldStartPoller(poller) {
        // High priority pollers always start
        if (poller.config.priority === 'high') {
            return true;
        }

        // Check visibility requirements
        if (poller.config.pauseWhenHidden && !this.isTabVisible) {
            return false;
        }

        if (poller.config.pauseWhenBlurred && !this.isWindowFocused) {
            return false;
        }

        // Check element visibility if specified
        if (poller.element && !this.isElementVisible(poller.element)) {
            return false;
        }

        return true;
    }

    /**
     * Check if element is visible in viewport
     */
    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const isInViewport = (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );

        // Also check if element is not hidden by CSS
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';

        return isInViewport && isVisible;
    }

    /**
     * Start individual poller
     */
    startPoller(poller) {
        if (poller.isActive) return;

        poller.isActive = true;
        poller.isPaused = false;

        const executePoll = async () => {
            const startTime = performance.now();

            try {
                // Check if should continue polling
                if (!this.shouldContinuePolling(poller)) {
                    this.pausePoller(poller.id);
                    return;
                }

                await poller.pollFunction();
                
                // Reset retry count on success
                poller.retryCount = 0;
                poller.currentInterval = poller.config.interval;
                poller.lastPollTime = Date.now();
                
                this.metrics.pollsExecuted++;

            } catch (error) {
                console.warn(`Poller ${poller.id} failed:`, error.message);
                this.handlePollerError(poller);
            }

            // Schedule next poll if still active
            if (poller.isActive && !poller.isPaused) {
                poller.intervalId = setTimeout(executePoll, poller.currentInterval);
            }
        };

        // Start first execution
        poller.intervalId = setTimeout(executePoll, 0);
    }

    /**
     * Check if poller should continue running
     */
    shouldContinuePolling(poller) {
        // High priority always continues
        if (poller.config.priority === 'high') {
            return true;
        }

        // Check visibility conditions
        if (poller.config.pauseWhenHidden && !this.isTabVisible) {
            this.metrics.pollsSkipped++;
            return false;
        }

        if (poller.config.pauseWhenBlurred && !this.isWindowFocused) {
            this.metrics.pollsSkipped++;
            return false;
        }

        // Check element visibility
        if (poller.element && !this.isElementVisible(poller.element)) {
            this.metrics.pollsSkipped++;
            return false;
        }

        return true;
    }

    /**
     * Handle poller execution errors with backoff
     */
    handlePollerError(poller) {
        poller.retryCount++;

        if (poller.retryCount >= poller.config.maxRetries) {
            console.error(`Poller ${poller.id} exceeded max retries, stopping`);
            this.stopPoller(poller.id);
            return;
        }

        // Exponential backoff
        poller.currentInterval *= poller.config.backoffMultiplier;
        console.log(`Poller ${poller.id} backing off to ${poller.currentInterval}ms`);
    }

    /**
     * Pause specific poller
     */
    pausePoller(id) {
        const poller = this.activePollers.get(id);
        if (!poller || poller.isPaused) return;

        if (poller.intervalId) {
            clearTimeout(poller.intervalId);
            poller.intervalId = null;
        }

        poller.isPaused = true;
        console.log(`📊 Paused poller: ${id}`);
    }

    /**
     * Resume specific poller
     */
    resumePoller(id) {
        const poller = this.activePollers.get(id);
        if (!poller || !poller.isPaused) return;

        if (this.shouldStartPoller(poller)) {
            this.startPoller(poller);
            console.log(`▶️ Resumed poller: ${id}`);
        }
    }

    /**
     * Stop and remove poller
     */
    stopPoller(id) {
        const poller = this.activePollers.get(id);
        if (!poller) return;

        if (poller.intervalId) {
            clearTimeout(poller.intervalId);
        }

        poller.isActive = false;
        this.activePollers.delete(id);
        console.log(`⏹️ Stopped poller: ${id}`);
    }

    /**
     * Update poller interval
     */
    updatePollerInterval(id, newInterval) {
        const poller = this.activePollers.get(id);
        if (!poller) return;

        poller.config.interval = newInterval;
        poller.currentInterval = newInterval;

        // Restart if active
        if (poller.isActive && !poller.isPaused) {
            this.pausePoller(id);
            this.resumePoller(id);
        }
    }

    /**
     * Pause all background pollers when tab becomes hidden
     */
    pauseBackgroundPollers() {
        let pausedCount = 0;
        
        for (const [id, poller] of this.activePollers) {
            if (poller.config.pauseWhenHidden && this.isTabVisible === false) {
                this.pausePoller(id);
                pausedCount++;
            } else if (poller.config.pauseWhenBlurred && this.isWindowFocused === false) {
                this.pausePoller(id);
                pausedCount++;
            }
        }

        if (pausedCount > 0) {
            this.metrics.backgroundPauses++;
            this.metrics.resourcesSaved += pausedCount;
            console.log(`⏸️ Paused ${pausedCount} pollers for background efficiency`);
        }
    }

    /**
     * Resume all paused pollers when tab becomes visible
     */
    resumeAllPollers() {
        let resumedCount = 0;

        for (const [id, poller] of this.activePollers) {
            if (poller.isPaused && this.shouldStartPoller(poller)) {
                this.resumePoller(id);
                resumedCount++;
            }
        }

        if (resumedCount > 0) {
            console.log(`▶️ Resumed ${resumedCount} pollers after visibility change`);
        }
    }

    /**
     * Create WebSocket-based poller as alternative to intervals
     */
    createWebSocketPoller(id, websocketUrl, messageHandler, options = {}) {
        let ws = null;
        let reconnectTimeout = null;
        let reconnectAttempts = 0;
        const maxReconnects = options.maxReconnects || 5;

        const connect = () => {
            try {
                ws = new WebSocket(websocketUrl);

                ws.onopen = () => {
                    console.log(`🔌 WebSocket poller ${id} connected`);
                    reconnectAttempts = 0;
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        messageHandler(data);
                    } catch (error) {
                        console.error(`WebSocket message error for ${id}:`, error);
                    }
                };

                ws.onclose = () => {
                    if (reconnectAttempts < maxReconnects) {
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                        reconnectTimeout = setTimeout(() => {
                            reconnectAttempts++;
                            connect();
                        }, delay);
                    }
                };

                ws.onerror = (error) => {
                    console.error(`WebSocket error for ${id}:`, error);
                };

            } catch (error) {
                console.error(`Failed to create WebSocket poller ${id}:`, error);
            }
        };

        connect();

        return {
            id,
            close: () => {
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                if (ws) {
                    ws.close();
                }
            },
            send: (data) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(typeof data === 'string' ? data : JSON.stringify(data));
                }
            }
        };
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const activeCount = this.activePollers.size;
        const averageInterval = activeCount > 0 
            ? Array.from(this.activePollers.values())
                .reduce((sum, poller) => sum + poller.config.interval, 0) / activeCount
            : 0;

        return {
            ...this.metrics,
            activePollers: activeCount,
            averageInterval: `${averageInterval.toFixed(0)}ms`,
            tabVisible: this.isTabVisible,
            windowFocused: this.isWindowFocused
        };
    }

    /**
     * Stop all pollers and cleanup
     */
    destroy() {
        for (const id of this.activePollers.keys()) {
            this.stopPoller(id);
        }

        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('focus', this.handleFocus);
        window.removeEventListener('blur', this.handleBlur);
    }
}

// Global instance
window.smartPollingManager = new SmartPollingManager();

// Helper functions for easy migration from setInterval
window.createSmartPoller = (id, pollFunction, options) => {
    return window.smartPollingManager.createPoller(id, pollFunction, options);
};

window.createWebSocketPoller = (id, url, handler, options) => {
    return window.smartPollingManager.createWebSocketPoller(id, url, handler, options);
};

// Migration helper for existing setInterval code
window.smartInterval = function(callback, interval, options = {}) {
    const id = options.id || `interval_${Date.now()}_${Math.random()}`;
    return window.smartPollingManager.createPoller(id, callback, {
        interval,
        ...options
    });
};

console.log('⚡ SmartPollingManager initialized - setInterval calls will be optimized');