const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Gym = require('../models/gym');
const User = require('../models/User');

// Get all offers for a gym
exports.getOffers = async (req, res) => {
  try {
    const { gymId } = req.query;
    const { status, category, page = 1, limit = 10 } = req.query;
    
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    // Build query
    const query = { gymId };
    if (status) query.status = status;
    if (category && category !== 'all') query.category = category;

    // Pagination
    const skip = (page - 1) * limit;
    
    const offers = await Offer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    const total = await Offer.countDocuments(query);

    res.json({
      offers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
};

// Get offer statistics
exports.getOfferStats = async (req, res) => {
  try {
    const { gymId } = req.query;
    
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    const [activeOffers, activeCoupons, totalClaims, revenueData] = await Promise.all([
      Offer.countDocuments({ gymId, status: 'active' }),
      Coupon.countDocuments({ gymId, status: 'active' }),
      CouponUsage.countDocuments({ gymId, status: 'completed' }),
      CouponUsage.aggregate([
        { $match: { gymId: mongoose.Types.ObjectId(gymId), status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' } } }
      ])
    ]);

    const revenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.json({
      activeOffers,
      activeCoupons,
      totalClaims,
      revenue
    });
  } catch (error) {
    console.error('Error fetching offer stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

// Create new offer
exports.createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      value,
      category,
      startDate,
      endDate,
      maxUses,
      minAmount,
      gymId,
      templateId,
      features,
      couponCode
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !value || !startDate || !endDate || !gymId) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, description, type, value, startDate, endDate, gymId' 
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Check if gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Create offer data
    const offerData = {
      title,
      description,
      type,
      value: parseFloat(value),
      category: category || 'membership',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxUses: maxUses ? parseInt(maxUses) : null,
      minAmount: minAmount ? parseFloat(minAmount) : 0,
      gymId,
      templateId,
      features: features || [],
      createdBy: req.user?.id || req.admin?.id
    };

    // Add coupon code if provided
    if (couponCode) {
      // Check if coupon code already exists
      const existingCoupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
      offerData.couponCode = couponCode.toUpperCase();
    }

    const offer = new Offer(offerData);
    await offer.save();

    // Create associated coupon if coupon code was provided
    if (couponCode) {
      const couponData = {
        code: couponCode.toUpperCase(),
        title: `${title} Coupon`,
        description: `Auto-generated coupon for ${title}`,
        discountType: type === 'percentage' ? 'percentage' : 'fixed',
        discountValue: value,
        minAmount: minAmount || 0,
        expiryDate: new Date(endDate),
        gymId,
        offerId: offer._id,
        applicableCategories: [category || 'membership'],
        createdBy: req.user?.id || req.admin?.id
      };

      const coupon = new Coupon(couponData);
      await coupon.save();
    }

    res.status(201).json({ 
      message: 'Offer created successfully', 
      offer: await offer.populate('createdBy', 'name email')
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }
    res.status(500).json({ message: 'Failed to create offer', error: error.message });
  }
};

// Update offer
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.usageCount;
    delete updates.revenue;

    // Validate dates if provided
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    const offer = await Offer.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.json({ message: 'Offer updated successfully', offer });
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ message: 'Failed to update offer', error: error.message });
  }
};

// Delete offer
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Soft delete by updating status
    offer.status = 'deleted';
    offer.isActive = false;
    await offer.save();

    // Also disable associated coupon if exists
    if (offer.couponCode) {
      await Coupon.findOneAndUpdate(
        { offerId: offer._id },
        { status: 'disabled', isActive: false }
      );
    }

    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ message: 'Failed to delete offer', error: error.message });
  }
};

// Pause/Resume offer
exports.toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'pause' or 'resume'

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (action === 'pause') {
      offer.status = 'paused';
    } else if (action === 'resume') {
      offer.status = 'active';
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "pause" or "resume"' });
    }

    await offer.save();

    res.json({ 
      message: `Offer ${action}d successfully`, 
      offer: await offer.populate('createdBy', 'name email')
    });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({ message: 'Failed to update offer status', error: error.message });
  }
};

// Get valid offers for public display (for gym details page)
exports.getValidOffers = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { category } = req.query;

    const offers = await Offer.findValidOffers(gymId, category);

    res.json(offers);
  } catch (error) {
    console.error('Error fetching valid offers:', error);
    res.status(500).json({ message: 'Failed to fetch offers', error: error.message });
  }
};

// ==================== COUPON MANAGEMENT ====================

// Get all coupons for a gym
exports.getCoupons = async (req, res) => {
  try {
    const { gymId } = req.query;
    const { status, page = 1, limit = 10 } = req.query;
    
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    // Build query
    const query = { gymId };
    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = 'active';
        query.expiryDate = { $gte: new Date() };
      } else {
        query.status = status;
      }
    }

    // Pagination
    const skip = (page - 1) * limit;
    
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('offerId', 'title')
      .populate('createdBy', 'name email');

    const total = await Coupon.countDocuments(query);

    res.json({
      coupons,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Failed to fetch coupons', error: error.message });
  }
};

// Create new coupon
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minAmount,
      maxDiscountAmount,
      usageLimit,
      userUsageLimit,
      expiryDate,
      gymId,
      applicableCategories,
      newUsersOnly
    } = req.body;

    // Validate required fields
    if (!code || !title || !discountType || !discountValue || !expiryDate || !gymId) {
      return res.status(400).json({ 
        message: 'Missing required fields: code, title, discountType, discountValue, expiryDate, gymId' 
      });
    }

    // Check if gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const couponData = {
      code: code.toUpperCase(),
      title,
      description,
      discountType,
      discountValue: parseFloat(discountValue),
      minAmount: minAmount ? parseFloat(minAmount) : 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : 1,
      expiryDate: new Date(expiryDate),
      gymId,
      applicableCategories: applicableCategories || ['all'],
      newUsersOnly: newUsersOnly || false,
      createdBy: req.user?.id || req.admin?.id
    };

    const coupon = new Coupon(couponData);
    await coupon.save();

    res.status(201).json({ 
      message: 'Coupon created successfully', 
      coupon: await coupon.populate('createdBy', 'name email')
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }
    res.status(500).json({ message: 'Failed to create coupon', error: error.message });
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.usageCount;
    delete updates.totalRevenue;
    delete updates.totalSavings;

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Failed to update coupon', error: error.message });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Soft delete by updating status
    coupon.status = 'disabled';
    coupon.isActive = false;
    await coupon.save();

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Failed to delete coupon', error: error.message });
  }
};

// Validate coupon for use
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const { gymId, userId, purchaseAmount, category } = req.query;

    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    const coupon = await Coupon.findByCode(code, gymId);
    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Coupon not found' });
    }

    // Check basic validity
    if (!coupon.isValid) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Coupon is expired or not active' 
      });
    }

    // Check category applicability
    if (category && coupon.applicableCategories.length > 0 && 
        !coupon.applicableCategories.includes('all') && 
        !coupon.applicableCategories.includes(category)) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Coupon is not applicable for this category' 
      });
    }

    // Check user eligibility if userId is provided
    if (userId) {
      const isNewUser = await CouponUsage.isNewUser(userId, gymId);
      const eligibility = coupon.canBeUsedBy(userId, parseFloat(purchaseAmount || 0), isNewUser);
      
      if (!eligibility.valid) {
        return res.status(400).json({ 
          valid: false, 
          message: eligibility.reason 
        });
      }

      // Check user usage limit
      const userUsageValidation = await Coupon.validateUserUsage(code, userId, gymId);
      if (!userUsageValidation.valid) {
        return res.status(400).json({ 
          valid: false, 
          message: userUsageValidation.reason 
        });
      }
    }

    // Calculate discount if purchase amount is provided
    let discountDetails = null;
    if (purchaseAmount) {
      try {
        discountDetails = coupon.apply(parseFloat(purchaseAmount));
      } catch (error) {
        return res.status(400).json({ 
          valid: false, 
          message: error.message 
        });
      }
    }

    res.json({ 
      valid: true, 
      coupon: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minAmount: coupon.minAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        expiryDate: coupon.expiryDate
      },
      discountDetails 
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ message: 'Failed to validate coupon', error: error.message });
  }
};

// Use coupon (record usage)
exports.useCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const {
      userId,
      gymId,
      originalAmount,
      usageType,
      usageDescription,
      membershipId,
      paymentId,
      ipAddress,
      userAgent
    } = req.body;

    if (!userId || !gymId || !originalAmount || !usageType) {
      return res.status(400).json({ 
        message: 'Missing required fields: userId, gymId, originalAmount, usageType' 
      });
    }

    // Validate coupon first
    const coupon = await Coupon.findByCode(code, gymId);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const isNewUser = await CouponUsage.isNewUser(userId, gymId);
    const eligibility = coupon.canBeUsedBy(userId, parseFloat(originalAmount), isNewUser);
    
    if (!eligibility.valid) {
      return res.status(400).json({ message: eligibility.reason });
    }

    // Check user usage limit
    const userUsageValidation = await Coupon.validateUserUsage(code, userId, gymId);
    if (!userUsageValidation.valid) {
      return res.status(400).json({ message: userUsageValidation.reason });
    }

    // Apply the coupon
    const discountDetails = coupon.apply(parseFloat(originalAmount));

    // Record the usage
    const usage = new CouponUsage({
      couponId: coupon._id,
      userId,
      gymId,
      originalAmount: discountDetails.originalAmount,
      discountAmount: discountDetails.discountAmount,
      finalAmount: discountDetails.finalAmount,
      usageType,
      usageDescription,
      membershipId,
      paymentId,
      ipAddress,
      userAgent
    });

    await usage.save();

    // Update coupon usage count and revenue
    await coupon.incrementUsage(discountDetails.finalAmount, discountDetails.discountAmount);

    res.json({ 
      message: 'Coupon used successfully', 
      usage,
      discountDetails 
    });
  } catch (error) {
    console.error('Error using coupon:', error);
    res.status(500).json({ message: 'Failed to use coupon', error: error.message });
  }
};

// Get coupon usage analytics
exports.getCouponAnalytics = async (req, res) => {
  try {
    const { gymId } = req.query;
    const { startDate, endDate } = req.query;

    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    const [usageStats, topCoupons] = await Promise.all([
      CouponUsage.getGymStats(gymId, startDate, endDate),
      CouponUsage.getTopCoupons(gymId, 10)
    ]);

    res.json({
      usageStats,
      topCoupons
    });
  } catch (error) {
    console.error('Error fetching coupon analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
};

// Export coupons to JSON
exports.exportCoupons = async (req, res) => {
  try {
    const { gymId } = req.query;
    
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    const coupons = await Coupon.find({ gymId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const exportData = coupons.map(coupon => ({
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minAmount: coupon.minAmount,
      usageCount: coupon.usageCount,
      usageLimit: coupon.usageLimit || 'Unlimited',
      expiryDate: coupon.expiryDate.toISOString().split('T')[0],
      status: coupon.status,
      totalRevenue: coupon.totalRevenue,
      createdBy: coupon.createdBy?.name || 'Unknown',
      createdAt: coupon.createdAt.toISOString().split('T')[0]
    }));

    res.json({
      message: 'Coupons exported successfully',
      data: exportData,
      count: exportData.length
    });
  } catch (error) {
    console.error('Error exporting coupons:', error);
    res.status(500).json({ message: 'Failed to export coupons', error: error.message });
  }
};

// Get all valid offers for a specific gym (for frontend display)
exports.getValidOffersByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    
    if (!gymId) {
      return res.status(400).json({ message: 'Gym ID is required' });
    }

    const now = new Date();
    
    const offers = await Offer.find({
      gymId: gymId,
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: 'active'
    })
    .select('title description type value couponCode minAmount highlightOffer templateId features startDate endDate displayOnWebsite')
    .sort({ highlightOffer: -1, createdAt: -1 })
    .limit(10); // Limit to prevent too many offers

    res.json(offers);
  } catch (error) {
    console.error('Error fetching valid offers by gym:', error);
    res.status(500).json({ 
      message: 'Failed to fetch offers',
      error: error.message 
    });
  }
};

// Validate coupon code (public endpoint)
exports.validateCouponCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { gymId } = req.query;
    
    if (!code) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Coupon code is required' 
      });
    }

    const coupon = await Coupon.findOne({ 
      code: code,
      gymId: gymId || undefined
    });

    if (!coupon) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Invalid coupon code' 
      });
    }

    const now = new Date();
    
    // Check if coupon is expired
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Coupon has expired' 
      });
    }

    // Check if coupon has usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Coupon usage limit reached' 
      });
    }

    // Check if gym-specific coupon matches
    if (coupon.gymId && gymId && coupon.gymId.toString() !== gymId) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Coupon not valid for this gym' 
      });
    }

    // Check user eligibility if user is logged in
    let userEligible = true;
    if (req.user) {
      userEligible = await coupon.isUserEligible(req.user._id);
    }

    if (!userEligible) {
      return res.status(400).json({ 
        valid: false, 
        message: 'You have already used this coupon' 
      });
    }

    res.json({ 
      valid: true, 
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        description: coupon.description
      },
      discountDetails: {
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount
      }
    });
    
  } catch (error) {
    console.error('Error validating coupon code:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Failed to validate coupon code',
      error: error.message 
    });
  }
};

// Claim an offer (public endpoint)
exports.claimOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { userId, gymId } = req.body;

    console.log('📝 Claim offer request:', { offerId, userId, gymId });

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    // Find the offer
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        message: 'Offer not found' 
      });
    }

    // Check if offer is valid
    const now = new Date();
    if (offer.endDate < now || offer.startDate > now || offer.status !== 'active') {
      return res.status(400).json({ 
        success: false,
        message: 'Offer is not currently valid' 
      });
    }

    // Check usage limits
    if (offer.maxUses && offer.usageCount >= offer.maxUses) {
      return res.status(400).json({ 
        success: false,
        message: 'Offer usage limit reached' 
      });
    }

    // Check if user already claimed this offer
    const existingCoupon = await Coupon.findOne({
      offerId: offerId,
      userId: userId,
      status: { $in: ['active', 'used'] }
    });

    if (existingCoupon) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already claimed this offer' 
      });
    }

    // Generate unique coupon code
    const couponCode = offer.couponCode || `${offer.type.toUpperCase()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Fetch user details for better tracking
    const user = await User.findById(userId);
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';

    // Create coupon for user
    const coupon = new Coupon({
      code: couponCode,
      title: offer.title,
      description: offer.description,
      discountType: offer.type,
      discountValue: offer.value,
      minAmount: offer.minAmount || 0,
      gymId: gymId || offer.gymId,
      offerId: offerId,
      userId: userId,
      expiryDate: offer.endDate,
      status: 'active',
      isActive: true,
      createdBy: offer.createdBy
    });

    await coupon.save();

    // CRITICAL: Increment offer usage count atomically
    const updatedOffer = await Offer.findByIdAndUpdate(
      offerId,
      { 
        $inc: { usageCount: 1 },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    console.log('✅ Offer claimed successfully:', {
      offerId,
      userId,
      userName,
      couponCode,
      previousCount: updatedOffer.usageCount - 1,
      newCount: updatedOffer.usageCount
    });

    // Send success response
    res.json({
      success: true,
      message: 'Offer claimed successfully',
      couponCode: couponCode,
      claimId: coupon._id,
      usageCount: updatedOffer.usageCount,
      maxUses: updatedOffer.maxUses,
      coupon: {
        _id: coupon._id,
        code: couponCode,
        title: offer.title,
        description: offer.description,
        discountType: offer.type,
        discountValue: offer.value,
        minAmount: offer.minAmount,
        validUntil: offer.endDate,
        gymName: user?.gymName || 'Gym',
        status: 'active'
      }
    });

  } catch (error) {
    console.error('❌ Error claiming offer:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to claim offer',
      error: error.message 
    });
  }
};