const express = require('express');
const router = express.Router();
const {
  createQRCode,
  getQRCodes,
  getQRCodeByToken,
  validateQRCode,
  updateQRCode,
  deactivateQRCode,
  getQRCodeStats
} = require('../controllers/qrCodeController');
const gymadminAuth = require('../middleware/gymadminAuth');

// Create a new QR code (protected route for gym admins)
router.post('/', gymadminAuth, createQRCode);

// Get QR codes for a gym (protected route)
router.get('/', gymadminAuth, getQRCodes);

// Get QR code statistics (protected route)
router.get('/stats', gymadminAuth, getQRCodeStats);

// Test endpoint to create a demo QR code (development only)
router.get('/test-qr/:gymId', async (req, res) => {
  try {
    const QRCode = require('../models/QRCode');
    const Gym = require('../models/gym');
    
    const { gymId } = req.params;
    
    // Check if gym exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    
    // Create test QR code
    const testToken = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const qrCode = new QRCode({
      token: testToken,
      gymId: gymId,
      registrationType: 'standard',
      defaultPlan: 'Basic',
      usageLimit: 'unlimited',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      specialOffer: '🎉 Welcome bonus: Get 10% off on first month!',
      createdBy: gymId,
      isActive: true
    });
    
    await qrCode.save();
    
    const registrationUrl = `http://localhost:5000/frontend/register.html?token=${testToken}&gym=${gymId}`;
    
    res.json({
      success: true,
      message: 'Test QR code created',
      qrCode: {
        token: testToken,
        gymId: gymId,
        gymName: gym.gymName || gym.name,
        registrationUrl: registrationUrl,
        expiryDate: qrCode.expiryDate
      }
    });
    
  } catch (error) {
    console.error('Error creating test QR code:', error);
    res.status(500).json({ message: 'Failed to create test QR code', error: error.message });
  }
});

// Validate QR code for registration (public route)
router.get('/validate/:token', validateQRCode);

// Get QR code by token (protected route)
router.get('/:token', gymadminAuth, getQRCodeByToken);

// Update QR code (protected route)
router.put('/:token', gymadminAuth, updateQRCode);

// Deactivate QR code (protected route)
router.patch('/:token/deactivate', gymadminAuth, deactivateQRCode);

module.exports = router;
