const express = require('express');
const router = express.Router();
const {
  createCashValidation,
  getPendingValidations,
  checkValidationStatus,
  confirmCashPayment,
  rejectCashPayment
} = require('../controllers/cashValidationController');

// Create new cash validation request
router.post('/create-cash-validation', createCashValidation);

// Get all pending validations (for admin polling)
router.get('/pending-cash-validations', getPendingValidations);

// Check validation status
router.get('/validation-status/:validationCode', checkValidationStatus);

// Confirm cash payment (admin action)
router.post('/confirm-cash-validation/:validationCode', confirmCashPayment);

// Reject cash payment (admin action)  
router.post('/reject-cash-validation/:validationCode', rejectCashPayment);

module.exports = router;
