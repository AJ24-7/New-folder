const QRCode = require('../models/QRCode');
const Gym = require('../models/gym');
const Admin = require('../models/admin');

// Validate QR code for registration (public endpoint)
const validateQRCode = async (req, res) => {
  try {
    const { token } = req.params;

    // Find QR code
    const qrCode = await QRCode.findOne({ token, isActive: true }).populate('gymId');
    
    if (!qrCode) {
      return res.status(404).json({ 
        valid: false, 
        message: 'QR code not found or inactive' 
      });
    }

    // Check if expired
    if (new Date() > qrCode.expiryDate) {
      return res.status(400).json({ 
        valid: false, 
        message: 'QR code has expired' 
      });
    }

    // Check usage limit
    if (qrCode.usageLimit !== 'unlimited' && qrCode.usageCount >= parseInt(qrCode.usageLimit)) {
      return res.status(400).json({ 
        valid: false, 
        message: 'QR code usage limit reached' 
      });
    }

    // Return valid QR code with gym data
    res.json({
      valid: true,
      registrationType: qrCode.registrationType,
      defaultPlan: qrCode.defaultPlan,
      specialOffer: qrCode.specialOffer,
      gym: {
        id: qrCode.gymId._id,
        name: qrCode.gymId.gymName,
        address: qrCode.gymId.location?.address || 'Address not available',
        contact: qrCode.gymId.phone,
        email: qrCode.gymId.email,
        logo: qrCode.gymId.logo ? `/uploads/gym-logos/${qrCode.gymId.logo}` : null
      }
    });

  } catch (error) {
    console.error('Error validating QR code:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Server error during validation' 
    });
  }
};

// Create a new QR code
const createQRCode = async (req, res) => {
  try {
    const { 
      gymId, 
      registrationType, 
      defaultPlan, 
      usageLimit, 
      expiryDate, 
      specialOffer, 
      token 
    } = req.body;

    // Verify gym exists and admin has access
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Check if admin has access to this gym
    if (gym.adminId.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied to this gym' });
    }

    // Validate expiry date
    if (new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ message: 'Expiry date must be in the future' });
    }

    // Create QR code
    const qrCode = new QRCode({
      token,
      gymId,
      registrationType,
      defaultPlan,
      usageLimit,
      expiryDate: new Date(expiryDate),
      specialOffer,
      createdBy: req.admin.id
    });

    await qrCode.save();

    res.status(201).json({
      message: 'QR code created successfully',
      qrCode: {
        token: qrCode.token,
        gymId: qrCode.gymId,
        registrationType: qrCode.registrationType,
        defaultPlan: qrCode.defaultPlan,
        usageLimit: qrCode.usageLimit,
        usageCount: qrCode.usageCount,
        expiryDate: qrCode.expiryDate,
        specialOffer: qrCode.specialOffer,
        isActive: qrCode.isActive,
        createdAt: qrCode.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating QR code:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'QR code token already exists' });
    }
    
    res.status(500).json({ 
      message: 'Failed to create QR code',
      error: error.message 
    });
  }
};

// Get QR codes for a gym
const getQRCodes = async (req, res) => {
  try {
    const { gymId } = req.query;
    const { page = 1, limit = 20, status = 'all' } = req.query;

    // Build query
    let query = { gymId };
    
    if (status === 'active') {
      query.isActive = true;
      query.expiryDate = { $gt: new Date() };
    } else if (status === 'expired') {
      query.expiryDate = { $lt: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Verify gym access
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    if (gym.adminId.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied to this gym' });
    }

    // Get QR codes with pagination
    const skip = (page - 1) * limit;
    const qrCodes = await QRCode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'email')
      .lean();

    // Get total count
    const total = await QRCode.countDocuments(query);

    // Add calculated fields
    const enrichedQRCodes = qrCodes.map(qr => ({
      ...qr,
      isValid: qr.isActive && new Date(qr.expiryDate) > new Date() && 
               (qr.usageLimit === 'unlimited' || qr.usageCount < parseInt(qr.usageLimit)),
      isExpired: new Date(qr.expiryDate) <= new Date(),
      usagePercentage: qr.usageLimit === 'unlimited' ? 0 : 
                      Math.round((qr.usageCount / parseInt(qr.usageLimit)) * 100)
    }));

    res.json({
      qrCodes: enrichedQRCodes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({ 
      message: 'Failed to fetch QR codes',
      error: error.message 
    });
  }
};

// Get QR code by token
const getQRCodeByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const qrCode = await QRCode.findOne({ token })
      .populate('gymId', 'name address contact email')
      .populate('createdBy', 'email')
      .lean();

    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    // Check gym access for admin users
    if (qrCode.gymId.adminId.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied to this QR code' });
    }

    // Add calculated fields
    const enrichedQRCode = {
      ...qrCode,
      isValid: qrCode.isActive && new Date(qrCode.expiryDate) > new Date() && 
               (qrCode.usageLimit === 'unlimited' || qrCode.usageCount < parseInt(qrCode.usageLimit)),
      isExpired: new Date(qrCode.expiryDate) <= new Date(),
      usagePercentage: qrCode.usageLimit === 'unlimited' ? 0 : 
                      Math.round((qrCode.usageCount / parseInt(qrCode.usageLimit)) * 100)
    };

    res.json(enrichedQRCode);

  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ 
      message: 'Failed to fetch QR code',
      error: error.message 
    });
  }
};

// Update QR code
const updateQRCode = async (req, res) => {
  try {
    const { token } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.token;
    delete updates.gymId;
    delete updates.createdBy;
    delete updates.usageCount;
    delete updates.registrations;

    const qrCode = await QRCode.findOne({ token })
      .populate('gymId', 'adminId');

    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    // Check gym access
    if (qrCode.gymId.adminId.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied to this QR code' });
    }

    // Update QR code
    Object.assign(qrCode, updates);
    await qrCode.save();

    res.json({
      message: 'QR code updated successfully',
      qrCode: {
        token: qrCode.token,
        registrationType: qrCode.registrationType,
        defaultPlan: qrCode.defaultPlan,
        usageLimit: qrCode.usageLimit,
        usageCount: qrCode.usageCount,
        expiryDate: qrCode.expiryDate,
        specialOffer: qrCode.specialOffer,
        isActive: qrCode.isActive
      }
    });

  } catch (error) {
    console.error('Error updating QR code:', error);
    res.status(500).json({ 
      message: 'Failed to update QR code',
      error: error.message 
    });
  }
};

// Deactivate QR code
const deactivateQRCode = async (req, res) => {
  try {
    const { token } = req.params;

    const qrCode = await QRCode.findOne({ token })
      .populate('gymId', 'adminId');

    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    // Check gym access
    if (qrCode.gymId.adminId.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied to this QR code' });
    }

    qrCode.isActive = false;
    await qrCode.save();

    res.json({
      message: 'QR code deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating QR code:', error);
    res.status(500).json({ 
      message: 'Failed to deactivate QR code',
      error: error.message 
    });
  }
};

// Get QR code statistics
const getQRCodeStats = async (req, res) => {
  try {
    const { gymId } = req.query;

    // Verify gym access
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    if (gym.adminId.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Access denied to this gym' });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get statistics
    const stats = await QRCode.aggregate([
      { $match: { gymId: gym._id } },
      {
        $facet: {
          totalCodes: [{ $count: "count" }],
          activeCodes: [
            { 
              $match: { 
                isActive: true, 
                expiryDate: { $gt: now } 
              } 
            },
            { $count: "count" }
          ],
          expiredCodes: [
            { $match: { expiryDate: { $lt: now } } },
            { $count: "count" }
          ],
          totalUsage: [
            { $group: { _id: null, total: { $sum: "$usageCount" } } }
          ],
          recentCodes: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $count: "count" }
          ],
          usageByType: [
            {
              $group: {
                _id: "$registrationType",
                count: { $sum: 1 },
                usage: { $sum: "$usageCount" }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.json({
      totalCodes: result.totalCodes[0]?.count || 0,
      activeCodes: result.activeCodes[0]?.count || 0,
      expiredCodes: result.expiredCodes[0]?.count || 0,
      totalUsage: result.totalUsage[0]?.total || 0,
      recentCodes: result.recentCodes[0]?.count || 0,
      usageByType: result.usageByType || []
    });

  } catch (error) {
    console.error('Error fetching QR code stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch QR code statistics',
      error: error.message 
    });
  }
};

module.exports = {
  createQRCode,
  getQRCodes,
  getQRCodeByToken,
  validateQRCode,
  updateQRCode,
  deactivateQRCode,
  getQRCodeStats
};
