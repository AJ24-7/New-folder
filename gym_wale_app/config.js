// Centralized frontend API configuration for admin and web portals.
(function initApiConfig() {
  const DEFAULT_BASE_URL = 'https://gym-wale.onrender.com';

  // Optional runtime overrides:
  // 1) localStorage key: API_BASE_URL
  // 2) query param: ?apiBaseUrl=https://your-backend.com
  const fromStorage = (typeof localStorage !== 'undefined' && localStorage.getItem('API_BASE_URL')) || '';
  const fromQuery = new URLSearchParams(window.location.search).get('apiBaseUrl') || '';

  const baseUrl = (fromQuery || fromStorage || DEFAULT_BASE_URL).replace(/\/$/, '');

  window.API_CONFIG = {
    BASE_URL: baseUrl,
    API_BASE_URL: `${baseUrl}/api`
  };

  if (typeof console !== 'undefined') {
    console.log('[API_CONFIG] Using backend:', window.API_CONFIG.BASE_URL);
  }
})();
