const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/plans', workoutController.getWorkoutPlans);
router.get('/recommended', workoutController.getRecommendedPlans);
router.get('/plans/:id', workoutController.getWorkoutPlanById);

// Image fetching routes
router.get('/images/exercise', workoutController.getExerciseImage);
router.post('/images/fetch/:planId', workoutController.fetchWorkoutImages);
router.post('/images/fetch-all', workoutController.fetchAllWorkoutImages);

// Protected routes (require authentication)
router.post('/start', protect, workoutController.startWorkoutPlan);
router.get('/progress', protect, workoutController.getUserProgress);
router.post('/complete-exercise', protect, workoutController.completeExercise);
router.get('/history', protect, workoutController.getUserWorkoutHistory);

// Seed route (for development/testing - should be protected in production)
router.post('/seed', workoutController.seedWorkoutPlans);

module.exports = router;
