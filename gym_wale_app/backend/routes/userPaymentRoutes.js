const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

// Get user's payment methods (mock data for now)
router.get('/methods', authMiddleware, async (req, res) => {
  try {
    // For demo purposes, return mock payment methods
    // In a real application, this would fetch from a payment processor like Stripe
    const mockPaymentMethods = [
      {
        id: 'pm_1',
        type: 'Visa',
        lastFour: '4242',
        expiryMonth: '12',
        expiryYear: '25',
        isDefault: true
      },
      {
        id: 'pm_2',
        type: 'Mastercard',
        lastFour: '5555',
        expiryMonth: '10',
        expiryYear: '26',
        isDefault: false
      }
    ];
    
    res.json(mockPaymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods' });
  }
});

// Get user's payment history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const Payment = require('../models/Payment');
    
    // Fetch actual payment records from database
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // If no payments found, return empty array instead of mock data
    if (!payments || payments.length === 0) {
      return res.json({
        success: true,
        payments: []
      });
    }
    
    // Format payments
    const formattedPayments = payments.map(p => ({
      _id: p._id,
      amount: p.amount,
      description: p.description || p.purpose || 'Payment',
      createdAt: p.createdAt,
      status: p.status || 'completed',
      paymentMethod: p.paymentMethod || 'N/A'
    }));
    
    res.json({
      success: true,
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      payments: []
    });
  }
});

// Get user's payment history (backward compatibility)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const Payment = require('../models/Payment');
    
    // Fetch actual payment records from database
    const userPayments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Format payments  
    const formattedPayments = userPayments.map(p => ({
      id: p._id,
      amount: p.amount,
      description: p.description || p.purpose || 'Payment',
      date: p.createdAt,
      status: p.status || 'success',
      paymentMethod: p.paymentMethod || 'N/A'
    }));
    
    res.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
});

// Add new payment method
router.post('/methods', authMiddleware, async (req, res) => {
  try {
    const { cardNumber, expiryMonth, expiryYear, cvv, cardType } = req.body;
    
    // In a real application, you would integrate with a payment processor here
    // For demo purposes, just return the new payment method details
    
    const newPaymentMethod = {
      id: 'pm_' + Date.now(),
      type: cardType,
      lastFour: cardNumber.slice(-4),
      expiryMonth,
      expiryYear,
      isDefault: false
    };
    
    res.json({ success: true, paymentMethod: newPaymentMethod });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ message: 'Failed to add payment method' });
  }
});

// Remove payment method
router.delete('/methods/:methodId', authMiddleware, async (req, res) => {
  try {
    const { methodId } = req.params;
    
    // In a real application, you would remove from payment processor
    // For demo purposes, just return success
    
    res.json({ success: true, message: 'Payment method removed successfully' });
  } catch (error) {
    console.error('Error removing payment method:', error);
    res.status(500).json({ message: 'Failed to remove payment method' });
  }
});

module.exports = router;
