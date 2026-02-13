const TrialBooking = require('../models/TrialBooking');
const Gym = require('../models/gym');
const User = require('../models/User');
const Notification = require('../models/Notification');
const adminNotificationService = require('../services/adminNotificationService');
const TrialLimitService = require('../services/TrialLimitService');

// Get the notification scheduler instance (will be initialized in server.js)
let notificationScheduler = null;
const setNotificationScheduler = (scheduler) => {
  notificationScheduler = scheduler;
};
const getNotificationScheduler = () => notificationScheduler;

// Create a new trial booking
const createBooking = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      gymId,
      sessionType,
      preferredDate,
      preferredTime,
      emergencyContact,
      healthConditions,
      fitnessGoals,
      previousExperience
    } = req.body;

    // Validate required fields with detailed feedback
    const missingFields = [];
    if (!name || name.trim() === '') missingFields.push('name');
    if (!email || email.trim() === '') missingFields.push('email');
    if (!phone || phone.trim() === '') missingFields.push('phone');
    if (!gymId || gymId.trim() === '') missingFields.push('gymId');
    if (!sessionType || sessionType.trim() === '') missingFields.push('sessionType');
    if (!preferredDate || preferredDate.trim() === '') missingFields.push('preferredDate');
    if (!preferredTime || preferredTime.trim() === '') missingFields.push('preferredTime');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate phone format
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    // Validate future date
    const trialDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (trialDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Trial date must be in the future'
      });
    }

    console.log('Trial booking request data:', { gymId, name, email, sessionType, preferredDate });

    // Check if gym exists - handle both ObjectId and string-based IDs
    let gym;
    try {
      // First try to find by MongoDB ObjectId
      console.log('Attempting to find gym by ObjectId:', gymId);
      gym = await Gym.findById(gymId);
      console.log('Gym found by ObjectId:', gym ? gym.gymName : 'None');
    } catch (error) {
      console.log('ObjectId lookup failed, trying alternative methods:', error.message);
      // If it fails (invalid ObjectId), try to find by custom string ID or name
      gym = await Gym.findOne({
        $or: [
          { gymName: gymId },
          { 'customId': gymId }
        ]
      });
      console.log('Gym found by name/customId:', gym ? gym.gymName : 'None');
    }
    
    // If still not found, try alternative lookup methods
    if (!gym) {
      console.log('Attempting fuzzy search for gym:', gymId);
      gym = await Gym.findOne({
        $or: [
          { gymName: { $regex: new RegExp(gymId, 'i') } },
          { email: gymId }
        ]
      });
      console.log('Gym found by fuzzy search:', gym ? gym.gymName : 'None');
    }
    
    if (!gym) {
      console.log('No gym found with identifier:', gymId);
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }
    
    console.log('Using gym:', { id: gym._id, name: gym.gymName });
    console.log('Full gym object keys:', Object.keys(gym.toObject ? gym.toObject() : gym));
    console.log('Gym gymName field:', gym.gymName);
    console.log('Gym name field:', gym.name);

    // If user is authenticated and booking a trial, check trial limits
    // If authenticated user and trial session, check trial limits first
    if (req.user && sessionType === 'trial') {
      console.log('Checking trial limits for authenticated user:', req.user._id);
      try {
        const canBook = await TrialLimitService.canBookTrial(req.user._id, gym._id.toString(), new Date(preferredDate));
        
        if (!canBook.canBook) {
          console.log('Trial booking denied due to limits:', canBook.message);
          return res.status(400).json({
            success: false,
            message: canBook.message,
            reason: canBook.reason
          });
        }
        console.log('Trial limits check passed for user');
      } catch (trialLimitError) {
        console.error('Error checking trial limits:', trialLimitError);
        return res.status(500).json({
          success: false,
          message: 'Error checking trial availability. Please try again.'
        });
      }
    } else if (sessionType === 'trial') {
      console.log('Anonymous trial booking request (no authentication)');
    }

    // Create booking
    const gymNameValue = gym.gymName || gym.name || 'Unknown Gym';
    console.log('Using gymName value:', gymNameValue);
    
    const booking = new TrialBooking({
      name,
      email,
      phone,
      gymId: gym._id.toString(), // Use the actual gym's ObjectId
      gymName: gymNameValue,
      trialDate: new Date(preferredDate),
      trialTime: preferredTime,
      preferredActivity: fitnessGoals,
      message: req.body.message,
      userId: req.user ? req.user._id : null, // Use _id instead of id to get proper ObjectId
      status: 'pending',
      isTrialUsed: req.user ? true : false // Only mark as trial used for authenticated users
    });

    const savedBooking = await booking.save();

    console.log('Trial booking saved successfully:', {
      bookingId: savedBooking._id,
      userId: savedBooking.userId,
      isTrialUsed: savedBooking.isTrialUsed,
      bookingDate: savedBooking.bookingDate,
      trialDate: savedBooking.trialDate
    });

    // If authenticated user booked a trial, update their trial history
    if (req.user && sessionType === 'trial') {
      try {
        console.log('Updating trial history for user after successful booking');
        const user = await User.findById(req.user._id);
        if (user) {
          console.log('Current trial limits before update:', user.trialLimits);
          
          // Add to trial history
          user.trialLimits.trialHistory.push({
            gymId: gym._id.toString(),
            gymName: gymNameValue,
            bookingDate: new Date(),
            trialDate: new Date(preferredDate),
            trialBookingId: savedBooking._id,
            status: 'pending'
          });
          await user.save();
          
          console.log('Trial history updated successfully');
          console.log('Updated trial history length:', user.trialLimits.trialHistory.length);
        }
      } catch (trialUpdateError) {
        console.error('Error updating trial history after booking:', trialUpdateError);
        // Don't fail the booking response, but log the issue
      }
    }

    // Create notification for gym admin
    try {
      console.log('Creating notification for gym admin');
      const notification = new Notification({
        type: 'trial_booking',
        title: 'New Trial Booking',
        message: `New trial booking from ${name} for ${gymNameValue}`,
        gymId: gym._id.toString(),
        relatedId: savedBooking._id,
        priority: 'medium'
      });
      await notification.save();
      console.log('Notification created successfully');

      // Send real-time notification
      try {
        await adminNotificationService.sendNotification({
          type: 'trial_booking',
          gymId: gym._id.toString(),
          title: 'New Trial Booking',
          message: `${name} has booked a ${sessionType} session`,
          data: {
            bookingId: savedBooking._id,
            customerName: name,
            email: email,
            phone: phone,
            preferredDate: preferredDate,
            preferredTime: preferredTime
          }
        });
        console.log('Real-time notification sent successfully');
      } catch (realtimeNotificationError) {
        console.error('Error sending real-time notification:', realtimeNotificationError);
        // Don't fail the booking if real-time notification fails
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the booking if notification fails
    }

    // Send user-side trial booking success notification
    try {
      if (notificationScheduler) {
        await notificationScheduler.sendTrialBookingSuccessNotification(savedBooking);
      }
    } catch (userNotificationError) {
      console.error('Error sending user trial booking notification:', userNotificationError);
      // Don't fail the booking if user notification fails
    }

    console.log('Trial booking process completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Trial booking created successfully',
      booking: {
        id: savedBooking._id,
        name: savedBooking.name,
        email: savedBooking.email,
        phone: savedBooking.phone,
        gymName: savedBooking.gymName,
        trialDate: savedBooking.trialDate,
        trialTime: savedBooking.trialTime,
        status: savedBooking.status,
        createdAt: savedBooking.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating trial booking:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format provided'
      });
    }
    
    // Handle notification service errors gracefully
    if (error.message && error.message.includes('notification')) {
      return res.status(200).json({
        success: true,
        message: 'Trial booking created successfully (notification delivery pending)',
        booking: { status: 'pending', message: 'Booking confirmed, gym will contact you soon' }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating trial booking. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all bookings (admin function)
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, gymId, sessionType } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (gymId) filter.gymId = gymId;
    if (sessionType) filter.sessionType = sessionType;

    const bookings = await TrialBooking.find(filter)
      .populate('gymId', 'name location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TrialBooking.countDocuments(filter);

    res.status(200).json({
      success: true,
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const booking = await TrialBooking.findById(bookingId).populate('gymId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;
    if (adminNotes) booking.adminNotes = adminNotes;
    booking.updatedAt = new Date();

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
};

// Delete booking
const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await TrialBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await TrialBooking.findByIdAndDelete(bookingId);

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: error.message
    });
  }
};

// Get user trial status
const getUserTrialStatus = async (req, res) => {
  try {
    const userId = req.user._id; // Use _id instead of id
    const status = await TrialLimitService.getUserTrialStatus(userId);
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting trial status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trial status',
      error: error.message
    });
  }
};

// Check trial availability for specific gym and date
const checkTrialAvailability = async (req, res) => {
  try {
    const userId = req.user._id; // Use _id instead of id
    const { gymId, date } = req.query;
    
    if (!gymId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Gym ID and date are required'
      });
    }
    
    const canBook = await TrialLimitService.canBookTrial(userId, gymId, new Date(date));
    
    res.status(200).json({
      success: true,
      data: {
        canBook: canBook.canBook,
        message: canBook.message,
        restrictions: canBook.restrictions || null
      }
    });
  } catch (error) {
    console.error('Error checking trial availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking availability',
      error: error.message
    });
  }
};

// Cancel trial booking
const cancelTrialBooking = async (req, res) => {
  try {
    const userId = req.user._id; // Use _id instead of id
    const { bookingId } = req.params;
    
    // Find the booking and verify ownership
    const booking = await TrialBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this booking'
      });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();
    
    // Refund trial if booking was for a trial session
    if (booking.sessionType === 'trial') {
      const user = await User.findById(userId);
      if (user) {
        // Remove from trial history if it exists
        user.trialLimits.trialHistory = user.trialLimits.trialHistory.filter(
          trial => trial.bookingId.toString() !== bookingId
        );
        
        await user.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// Get user trial history
const getUserTrialHistory = async (req, res) => {
  try {
    const userId = req.user._id; // Use _id instead of id
    const { page = 1, limit = 10, status } = req.query;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Build filter for trial bookings
    const mongoose = require('mongoose');
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    let filter = {
      userId: userObjectId
      // Remove sessionType filter as it doesn't exist in TrialBooking model
    };
    
    if (status) {
      filter.status = status;
    }
    
    // Get trial bookings without populate since gymId is stored as string, not ObjectId reference
    // We'll use the gymName field that's already stored in the booking
    const bookings = await TrialBooking.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await TrialBooking.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        trialLimits: user.trialLimits,
        bookings,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Error getting trial history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trial history',
      error: error.message
    });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  getUserTrialStatus,
  checkTrialAvailability,
  cancelTrialBooking,
  getUserTrialHistory,
  setNotificationScheduler,
  getNotificationScheduler
};