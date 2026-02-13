const express = require('express');
const router = express.Router();
const {
  getOffers,
  getOfferStats,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getValidOffers,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  useCoupon,
  getCouponAnalytics,
  exportCoupons,
  getValidOffersByGym,
  validateCouponCode,
  claimOffer
} = require('../controllers/offersController');

// Middleware to verify admin authentication
const verifyAdminToken = require('../middleware/adminAuth');
// Middleware for gym admin authentication (compatible with gym tokens)
const gymadminAuth = require('../middleware/gymadminAuth');

// ==================== OFFER ROUTES ====================

// NOTE: Switched to gymadminAuth to support gym admin tokens issued by /api/gyms/login
// Get all offers for a gym (gym admin)
router.get('/offers', gymadminAuth, getOffers);

// Get offer statistics (gym admin)
router.get('/offers/stats', gymadminAuth, getOfferStats);

// Backward-compatible alias for stats to resolve frontend calls to /api/offers/stats
router.get('/stats', gymadminAuth, getOfferStats);

// Create new offer (gym admin)
router.post('/offers', gymadminAuth, createOffer);

// Update offer (gym admin)
router.put('/offers/:id', gymadminAuth, updateOffer);

// Delete offer (gym admin)
router.delete('/offers/:id', gymadminAuth, deleteOffer);

// Pause/Resume offer (gym admin)
router.patch('/offers/:id/toggle', gymadminAuth, toggleOfferStatus);

// Get valid offers for public display (no auth required)
router.get('/offers/valid/:gymId', getValidOffers);

// ==================== COUPON ROUTES ====================

// Get all coupons for a gym (gym admin - uses gym-compatible auth)
router.get('/coupons', gymadminAuth, getCoupons);

// Get available coupons for users (public - no auth)
router.get('/coupons/available', async (req, res) => {
  try {
    const { gymId } = req.query;
    
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    const Coupon = require('../models/Coupon');
    
    // Get active, non-expired coupons
    const coupons = await Coupon.find({
      gymId,
      status: 'active',
      expiryDate: { $gte: new Date() },
    })
      .select('code title description discountType discountValue minAmount maxDiscountAmount expiryDate')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ coupons });
  } catch (error) {
    console.error('Error fetching available coupons:', error);
    res.status(500).json({ message: 'Failed to fetch coupons', coupons: [] });
  }
});

// Create new coupon (gym admin - uses gym-compatible auth)
router.post('/coupons', gymadminAuth, createCoupon);

// Update coupon (gym admin - uses gym-compatible auth)
router.put('/coupons/:id', gymadminAuth, updateCoupon);

// Delete coupon (gym admin - uses gym-compatible auth)
router.delete('/coupons/:id', gymadminAuth, deleteCoupon);

// Validate coupon (public - for users)
router.get('/coupons/validate/:code', validateCoupon);

// Use coupon (public - for users)
router.post('/coupons/use/:code', useCoupon);

// Get coupon analytics (gym admin - uses gym-compatible auth)
router.get('/coupons/analytics', gymadminAuth, getCouponAnalytics);

// Export coupons to CSV (gym admin - uses gym-compatible auth)
router.get('/coupons/export', gymadminAuth, exportCoupons);

// Public endpoints for frontend display (gym details page)
router.get('/valid/:gymId', getValidOffersByGym);
router.get('/coupons/validate/:code', validateCouponCode);

// ==================== GYM DETAILS OFFERS ROUTES ====================

// Get active offers for specific gym (public - for gym details page)
router.get('/gym/:gymId/active', getValidOffersByGym);

// Claim an offer (public - for users)
router.post('/:offerId/claim', claimOffer);

// Get user's claimed offers
router.get('/user/:userId/claimed', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Demo response - implement actual logic
    res.json([]);
    
  } catch (error) {
    console.error('Error fetching user claimed offers:', error);
    res.status(500).json({ error: 'Failed to fetch claimed offers' });
  }
});

// Get user's coupons for specific gym
router.get('/user/:userId/coupons', async (req, res) => {
  try {
    const { userId } = req.params;
    const { gymId } = req.query;
    
    // Demo response - implement actual logic
    res.json([]);
    
  } catch (error) {
    console.error('Error fetching user coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Validate coupon for membership purchase
router.post('/coupon/:couponCode/validate', async (req, res) => {
  try {
    const { couponCode } = req.params;
    const { userId, membershipPrice, gymId } = req.body;

    // Demo validation logic
    const isValid = couponCode.startsWith('DEMO') || couponCode.startsWith('PCT') || couponCode.startsWith('FREE');
    
    if (!isValid) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid coupon code' 
      });
    }

    const discountValue = couponCode.startsWith('PCT') ? 20 : (couponCode.startsWith('FREE') ? 0 : 15);
    const discountType = couponCode.startsWith('FREE') ? 'free_service' : 'percentage';
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (membershipPrice * discountValue) / 100;
    }

    const finalPrice = Math.max(0, membershipPrice - discountAmount);

    res.json({
      success: true,
      originalPrice: membershipPrice,
      discountAmount,
      finalPrice,
      discountType,
      discountValue,
      message: 'Coupon is valid'
    });

  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate coupon' 
    });
  }
});

// Apply coupon (mark as used)
router.post('/coupon/:couponCode/apply', async (req, res) => {
  try {
    const { couponCode } = req.params;
    const { userId, membershipId, transactionId } = req.body;

    // Demo application logic
    res.json({
      success: true,
      message: 'Coupon applied successfully',
      couponCode,
      appliedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to apply coupon' 
    });
  }
});

// ==================== PUBLIC ACTIVE OFFERS ====================

// Get all active offers (public endpoint)
router.get('/active', async (req, res) => {
  try {
    const Offer = require('../models/Offer');
    
    const now = new Date();
    const activeOffers = await Offer.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
    .select('title description type value category startDate endDate maxUses usageCount features')
    .populate('gymId', 'name location')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({
      success: true,
      offers: activeOffers
    });

  } catch (error) {
    console.error('Error fetching active offers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active offers',
      error: error.message 
    });
  }
});

module.exports = router;