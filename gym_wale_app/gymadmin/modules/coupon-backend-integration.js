/**
 * Coupon Backend Integration Module
 * Handles all backend API calls for coupon management
 */

const CouponBackendAPI = {
  // Get API base URL from global config or use default
  getApiBaseUrl() {
    return window.API_BASE_URL || 'http://localhost:5000';
  },

  /**
   * Safely decode a JWT payload without verifying signature (client-side check only)
   */
  decodeJwtPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload || null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieves the admin token using a robust strategy across storage locations.
   * Prioritizes gym admin tokens and avoids user tokens.
   */
  async getToken(tokenKey = 'gymAdminToken') {
    // 1) Preferred keys and locations
    const preferredKeys = ['gymAdminToken', 'adminToken', 'gymAuthToken'];
    const altKeys = ['authToken', 'token']; // May contain user tokens
    const stores = [localStorage, sessionStorage];

    // Helper to validate token shape (must contain admin/gym in payload)
    const isGymAdminToken = (t) => {
      const payload = this.decodeJwtPayload(t);
      return payload && (payload.admin || payload.gym);
    };

    // Try preferred keys first (both storages)
    for (const store of stores) {
      for (const key of preferredKeys) {
        const val = store.getItem(key);
        if (val && isGymAdminToken(val)) {
          if (key !== tokenKey) localStorage.setItem(tokenKey, val);
          return val;
        }
      }
    }

    // Try alt keys but only accept if payload looks like gym/admin
    for (const store of stores) {
      for (const key of altKeys) {
        const val = store.getItem(key);
        if (val && isGymAdminToken(val)) {
          localStorage.setItem(tokenKey, val);
          return val;
        }
      }
    }

    console.error('❌ No valid gym admin authentication token found.');
    return null;
  },

  /**
   * Get all coupons for a gym from backend
   */
  async getCoupons(gymId, filters = {}) {
    try {
      const adminToken = await this.getToken();
      if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }

      // Debug: confirm token structure to avoid using user tokens unintentionally
      const __dbgPayload = this.decodeJwtPayload(adminToken);
      console.log('🔐 Token payload check:', __dbgPayload ? Object.keys(__dbgPayload) : 'no payload', {
        hasAdmin: !!__dbgPayload?.admin,
        hasGym: !!__dbgPayload?.gym,
        type: __dbgPayload?.type || null
      });

      const params = new URLSearchParams({
        gymId,
        ...filters
      });

      const apiUrl = `${this.getApiBaseUrl()}/api/offers/coupons?${params}`;
      console.log('🔄 Fetching coupons from backend:', { gymId, filters, apiUrl });
      console.log('🔑 Using token:', adminToken ? `${adminToken.substring(0, 20)}...` : 'NO TOKEN');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          errorData = JSON.parse(errorText);
          console.error('❌ Error response body:', errorData);
        } catch {
          console.error('❌ Could not parse error response');
          errorData = { message: 'Unknown error' };
        }
        
        if (response.status === 401) {
          // Check if it's a token type mismatch (should be resolved with gymadminAuth middleware)
          if (errorData.message && errorData.message.includes('Invalid token type')) {
            console.error('❌ Token type error. This should not happen with proper gym authentication.');
            console.error('💡 If you see this, the backend routes may need to use gymadminAuth middleware.');
            // Return empty list to prevent UI crash
            return { coupons: [], pagination: null };
          }
          throw new Error('Session expired. Please login again.');
        } else if (response.status === 404) {
          return { coupons: [], pagination: null };
        } else if (response.status === 400) {
          throw new Error(errorData.message || 'Bad request');
        }
        throw new Error(`Failed to fetch coupons (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupons fetched successfully:', data);
      
      return {
        coupons: data.coupons || [],
        pagination: data.pagination || null
      };

    } catch (error) {
      console.error('❌ Error fetching coupons:', error);
      throw error;
    }
  },

  /**
   * Create a new coupon
   */
  async createCoupon(couponData) {
    try {
      const adminToken = await this.getToken();
       if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }
      console.log('🔄 Creating coupon:', couponData);
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(couponData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create coupon (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupon created successfully:', data);
      
      return data.coupon;

    } catch (error) {
      console.error('❌ Error creating coupon:', error);
      throw error;
    }
  },

  /**
   * Update an existing coupon
   */
  async updateCoupon(couponId, updates) {
    try {
      const adminToken = await this.getToken();
       if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }
      console.log('🔄 Updating coupon:', couponId, updates);
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update coupon (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupon updated successfully:', data);
      
      return data.coupon;

    } catch (error) {
      console.error('❌ Error updating coupon:', error);
      throw error;
    }
  },

  /**
   * Delete a coupon (soft delete)
   */
  async deleteCoupon(couponId) {
    try {
      const adminToken = await this.getToken();
      if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }
      console.log('🔄 Deleting coupon:', couponId);
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/${couponId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete coupon (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupon deleted successfully:', data);
      
      return data;

    } catch (error) {
      console.error('❌ Error deleting coupon:', error);
      throw error;
    }
  },

  /**
   * Toggle coupon status (activate/deactivate)
   */
  async toggleCouponStatus(couponId, newStatus) {
    try {
      const adminToken = await this.getToken();
       if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }
      console.log('🔄 Toggling coupon status:', couponId, newStatus);
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          isActive: newStatus === 'active'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to toggle coupon status (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupon status toggled successfully:', data);
      
      return data.coupon;

    } catch (error) {
      console.error('❌ Error toggling coupon status:', error);
      throw error;
    }
  },

  /**
   * Validate a coupon code
   */
  async validateCoupon(couponCode, gymId, options = {}) {
    try {
      const { userId, purchaseAmount, category } = options;
      const params = new URLSearchParams({
        gymId,
        ...(userId && { userId }),
        ...(purchaseAmount && { purchaseAmount }),
        ...(category && { category })
      });

      console.log('🔄 Validating coupon:', couponCode, options);
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/validate/${couponCode}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          valid: false,
          message: data.message || 'Invalid coupon'
        };
      }

      console.log('✅ Coupon validation result:', data);
      
      return data;

    } catch (error) {
      console.error('❌ Error validating coupon:', error);
      return {
        valid: false,
        message: 'Failed to validate coupon'
      };
    }
  },

  /**
   * Use a coupon (record usage)
   */
  async useCoupon(couponCode, usageData) {
    try {
      console.log('🔄 Using coupon:', couponCode, usageData);
      
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add user token if available
      const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
      if (userToken) {
          headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/use/${couponCode}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(usageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to use coupon (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupon used successfully:', data);
      
      return data;

    } catch (error) {
      console.error('❌ Error using coupon:', error);
      throw error;
    }
  },

  /**
   * Get coupon analytics
   */
  async getCouponAnalytics(gymId, dateRange = {}) {
    try {
      const adminToken = await this.getToken();
       if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }
      const params = new URLSearchParams({
        gymId,
        ...dateRange
      });

      console.log('🔄 Fetching coupon analytics:', { gymId, dateRange });
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/analytics?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Analytics fetched successfully:', data);
      
      return data;

    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      throw error;
    }
  },

  /**
   * Export coupons data
   */
  async exportCoupons(gymId) {
    try {
      const adminToken = await this.getToken();
      if (!adminToken) {
        throw new Error('Authentication required. Please login as admin.');
      }
      console.log('🔄 Exporting coupons:', gymId);
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/coupons/export?gymId=${gymId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export coupons (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Coupons exported successfully:', data);
      
      return data;

    } catch (error) {
      console.error('❌ Error exporting coupons:', error);
      throw error;
    }
  },

  /**
   * Get user's claimed coupons
   */
  async getUserCoupons(userId, gymId) {
    try {
       const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
       if (!userToken) {
         throw new Error('Authentication required. Please login as user.');
      }
      console.log('🔄 Fetching user coupons:', { userId, gymId });
      
      const params = new URLSearchParams();
      if (gymId) params.append('gymId', gymId);

      const response = await fetch(`${this.getApiBaseUrl()}/api/offers/user/${userId}/coupons?${params}`, {
        method: 'GET',
        headers: {
           'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch user coupons (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ User coupons fetched:', data);
      
      return Array.isArray(data) ? data : data.coupons || [];

    } catch (error) {
      console.error('❌ Error fetching user coupons:', error);
      return [];
    }
  }
};

// Make it available globally
window.CouponBackendAPI = CouponBackendAPI;