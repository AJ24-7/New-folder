const express = require('express');
const router = express.Router();
const dietController = require('../controllers/dietController');
const protect = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (Diet Plan Templates) ====================
// Get all diet plan templates with optional filters
router.get('/templates', dietController.getDietPlanTemplates);

// Get single diet plan template by ID
router.get('/templates/:id', dietController.getDietPlanTemplateById);

// ==================== PROTECTED USER ROUTES ====================
// Subscribe to a diet plan
router.post('/subscribe', protect, dietController.subscribeToDietPlan);

// Get user's active diet subscription
router.get('/subscription/active', protect, dietController.getUserActiveDietSubscription);

// Update user's diet subscription (modify meals/settings)
router.put('/subscription/:subscriptionId', protect, dietController.updateUserDietSubscription);

// Cancel diet subscription
router.delete('/subscription/:subscriptionId', protect, dietController.cancelDietSubscription);

// Get user's diet subscription history
router.get('/subscription/history', protect, dietController.getUserDietSubscriptionHistory);

// ==================== ADMIN ROUTES (Diet Plan Template Management) ====================
// Note: Add admin middleware when ready
// const adminAuth = require('../middleware/adminAuth');

// Create new diet plan template
router.post('/templates', dietController.createDietPlanTemplate);

// Update diet plan template
router.put('/templates/:id', dietController.updateDietPlanTemplate);

// Delete diet plan template
router.delete('/templates/:id', dietController.deleteDietPlanTemplate);

// ==================== LEGACY ROUTES (Deprecated) ====================
router.post('/user-meals', protect, dietController.saveDietPlan);
router.get('/my-plan', protect, dietController.getUserDietPlan);

module.exports = router;
