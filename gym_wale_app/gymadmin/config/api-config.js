/**
 * API Configuration
 * Automatically detects the correct API base URL based on the environment
 */

const API_CONFIG = (() => {
    // Check if we're on localhost:5500 (Live Server) or served from backend
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // If we're on Live Server (port 5500), API is likely on localhost:5000
    // If we're served from backend, use relative URLs
    let apiBaseUrl;
    
    if (currentPort === '5500') {
        // Live Server - point to backend on port 5000
        apiBaseUrl = 'http://localhost:5000';
        console.log('🔧 API Config: Detected Live Server, using http://localhost:5000 for API');
    } else if (currentPort === '5000' || currentPort === '3000') {
        // Served from backend - use relative URLs
        apiBaseUrl = '';
        console.log('🔧 API Config: Served from backend, using relative URLs');
    } else if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        // Fallback for other local ports
        apiBaseUrl = 'http://localhost:5000';
        console.log('🔧 API Config: Local environment detected, using http://localhost:5000');
    } else {
        // Production - use relative URLs
        apiBaseUrl = '';
        console.log('🔧 API Config: Production environment, using relative URLs');
    }
    
    return {
        baseURL: apiBaseUrl,
        
        // Helper method to construct full API URL
        getURL: (endpoint) => {
            // Remove leading slash if present to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            return `${apiBaseUrl}${cleanEndpoint}`;
        }
    };
})();

// Make it globally available
window.API_CONFIG = API_CONFIG;

console.log('✅ API Configuration loaded:', API_CONFIG.baseURL || 'relative URLs');
