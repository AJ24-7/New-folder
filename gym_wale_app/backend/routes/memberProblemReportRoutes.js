// routes/memberProblemReportRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const gymadminAuth = require('../middleware/gymadminAuth');
const {
  submitMemberProblemReport,
  getMemberProblemReports,
  getGymProblemReports,
  respondToMemberProblem,
  updateProblemReportStatus,
  getProblemReportById
} = require('../controllers/memberProblemReportController');

console.log('📋 Member Problem Report Routes loading...');

// User routes (requires authentication)
router.post('/submit', authMiddleware, submitMemberProblemReport);
router.get('/my-reports/:gymId', authMiddleware, getMemberProblemReports);
router.get('/:reportId', authMiddleware, getProblemReportById);

// Admin routes (requires gym admin authentication)
router.get('/gym/all', gymadminAuth, getGymProblemReports);
router.post('/:reportId/respond', gymadminAuth, respondToMemberProblem);
router.patch('/:reportId/status', gymadminAuth, updateProblemReportStatus);

console.log('📋 Member Problem Report Routes loaded successfully');

module.exports = router;
