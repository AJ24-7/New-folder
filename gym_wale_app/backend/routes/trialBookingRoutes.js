const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const {
  createBooking,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  getUserTrialStatus,
  checkTrialAvailability,
  cancelTrialBooking,
  getUserTrialHistory
} = require('../controllers/trialBookingController');

// Public routes (authentication optional)
router.post('/book-trial', optionalAuthMiddleware, createBooking); // Auth optional but recommended
router.get('/bookings', getAllBookings);
router.put('/booking/:bookingId/status', updateBookingStatus);
router.delete('/booking/:bookingId', deleteBooking);

// Debug route to check all trial bookings
router.get('/debug/all-trials', async (req, res) => {
  try {
    const TrialBooking = require('../models/TrialBooking');
    
    // Get all trial bookings
    const allTrials = await TrialBooking.find({}).sort({ bookingDate: -1 }).limit(20);
    
    // Current month range
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Current month trials
    const currentMonthTrials = await TrialBooking.find({
      bookingDate: { $gte: startOfMonth, $lte: endOfMonth },
      isTrialUsed: true,
      status: { $ne: 'cancelled' }
    });
    
    res.json({
      success: true,
      data: {
        totalTrials: allTrials.length,
        currentMonthRange: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
          current: new Date().toISOString()
        },
        currentMonthTrialsCount: currentMonthTrials.length,
        allTrials: allTrials.map(trial => ({
          id: trial._id,
          userId: trial.userId,
          email: trial.email,
          gymName: trial.gymName,
          bookingDate: trial.bookingDate,
          trialDate: trial.trialDate,
          status: trial.status,
          isTrialUsed: trial.isTrialUsed
        })),
        currentMonthTrials: currentMonthTrials.map(trial => ({
          id: trial._id,
          userId: trial.userId,
          email: trial.email,
          bookingDate: trial.bookingDate,
          isTrialUsed: trial.isTrialUsed,
          status: trial.status
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// User-specific routes (authentication required)
router.get('/trial-status', authMiddleware, getUserTrialStatus);
router.get('/check-availability', authMiddleware, checkTrialAvailability);
router.put('/cancel/:bookingId', authMiddleware, cancelTrialBooking);
router.get('/history', authMiddleware, getUserTrialHistory);

module.exports = router;
