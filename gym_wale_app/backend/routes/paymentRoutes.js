const express = require('express');
const router = express.Router();
const {
  getPaymentStats,
  getPaymentChartData,
  getRecentPayments,
  getRecurringPayments,
  getPaymentReminders,
  addPayment,
  updatePayment,
  markPaymentAsPaid,
  deletePayment
  // Removed old cash validation functions
} = require('../controllers/paymentController');

// Import NEW cash validation controller functions
const {
  createCashValidation,
  getPendingValidations,
  checkValidationStatus,
  confirmCashPayment,
  rejectCashPayment
} = require('../controllers/cashValidationController');

const gymAdminAuth = require('../middleware/gymadminAuth');

// Get payment statistics

// Payment routes
router.get('/stats', gymAdminAuth, getPaymentStats);
router.get('/chart-data', gymAdminAuth, getPaymentChartData);
router.get('/recent', gymAdminAuth, getRecentPayments);
router.get('/recurring', gymAdminAuth, getRecurringPayments);
router.get('/reminders', gymAdminAuth, getPaymentReminders);
router.post('/', gymAdminAuth, addPayment);
router.put('/:id', gymAdminAuth, updatePayment);
router.patch('/:id/mark-paid', gymAdminAuth, markPaymentAsPaid);
router.delete('/:id', gymAdminAuth, deletePayment);

// Pending-verification members: members who paid via Razorpay link
// but whose payment hasn't been confirmed by the gym yet
router.get('/pending-verification', gymAdminAuth, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const Member = require('../models/Member');
    const mongoose = require('mongoose');

    const members = await Member.find({
      gym: mongoose.Types.ObjectId.isValid(gymId)
        ? new mongoose.Types.ObjectId(gymId)
        : gymId,
      paymentStatus: 'pending_verification'
    }).sort({ joinDate: -1 });

    res.json({
      success: true,
      data: members.map(m => ({
        _id: m._id,
        memberName: m.memberName,
        email: m.email,
        phone: m.phone,
        amount: m.paymentAmount || m.amount || 0,
        planSelected: m.planSelected,
        monthlyPlan: m.monthlyPlan,
        paymentMode: m.paymentMode,
        transactionId: m.transactionId || null,
        joinDate: m.joinDate,
        membershipId: m.membershipId,
      }))
    });
  } catch (error) {
    console.error('Error fetching pending-verification members:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark a pending-verification member as paid (approve their Razorpay payment)
router.patch('/pending-verification/:memberId/approve', gymAdminAuth, async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { memberId } = req.params;
    const Member = require('../models/Member');
    const mongoose = require('mongoose');

    const member = await Member.findOneAndUpdate(
      {
        _id: memberId,
        gym: mongoose.Types.ObjectId.isValid(gymId)
          ? new mongoose.Types.ObjectId(gymId)
          : gymId,
        paymentStatus: 'pending_verification'
      },
      { $set: { paymentStatus: 'paid', lastPaymentDate: new Date() } },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found or already verified' });
    }

    // Create a payment record for accounting
    const Payment = require('../models/Payment');
    await new Payment({
      gymId,
      memberId: member._id,
      memberName: member.memberName,
      type: 'received',
      category: 'membership',
      amount: member.paymentAmount || member.amount || 0,
      description: `Online payment verified – ${member.planSelected}`,
      paymentMethod: member.paymentMode?.toLowerCase() || 'online',
      status: 'completed',
      registrationSource: 'online_membership',
      planSelected: member.planSelected,
      monthlyPlan: member.monthlyPlan,
      transactionId: member.transactionId,
      paidDate: new Date(),
      createdBy: gymId,
    }).save();

    res.json({ success: true, message: 'Payment verified successfully', member });
  } catch (error) {
    console.error('Error approving pending-verification member:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Cash payment validation routes (OLD - DEPRECATED)
// router.post('/cash-payment-request', createCashPaymentRequest);
// router.get('/check-cash-validation/:validationCode', checkCashValidation);
// router.get('/pending-cash-validations', gymAdminAuth, getPendingCashValidations);
// router.post('/approve-cash-validation/:validationCode', gymAdminAuth, approveCashValidation);

// NEW instant cash validation routes
router.post('/create-cash-validation', createCashValidation);
router.get('/pending-validations', getPendingValidations);
router.get('/validation-status/:validationCode', checkValidationStatus);
router.post('/confirm-cash-validation/:validationCode', confirmCashPayment);
router.post('/reject-cash-validation/:validationCode', rejectCashPayment);

module.exports = router;
