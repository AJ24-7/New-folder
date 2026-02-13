const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Member = require('../models/Member');
const TrialBooking = require('../models/TrialBooking');
const Gym = require('../models/gym');
const Trainer = require('../models/trainerModel');

// Get user's gym memberships
router.get('/gym-memberships', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find all gym memberships for this user
    const memberships = await Member.find({ 
      email: req.user?.email 
    }).populate('gym', 'gymName logoUrl location');
    
    const formattedMemberships = memberships.map(membership => ({
      id: membership._id,
      gymName: membership.gym?.gymName || 'Unknown Gym',
      planName: membership.membershipPlan || 'Standard Plan',
      duration: membership.validity || 'N/A',
      startDate: membership.joinDate,
      endDate: membership.validUntil,
      status: membership.paymentStatus || 'active',
      price: membership.amount || 0,
      gymLogo: membership.gym?.logoUrl
    }));
    
    res.json(formattedMemberships);
  } catch (error) {
    console.error('Error fetching gym memberships:', error);
    res.status(500).json({ message: 'Failed to fetch gym memberships' });
  }
});

// Get user's trainer sessions
router.get('/trainer-sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // For now, return mock data as trainer booking system needs to be implemented
    const mockTrainerSessions = [
      {
        id: '1',
        trainerName: 'John Doe',
        sessionType: 'Personal Training',
        sessionDate: new Date(Date.now() + 86400000), // Tomorrow
        sessionTime: '10:00 AM',
        status: 'scheduled',
        duration: '60 minutes',
        price: 500
      },
      {
        id: '2',
        trainerName: 'Jane Smith',
        sessionType: 'Yoga Session',
        sessionDate: new Date(Date.now() + 172800000), // Day after tomorrow
        sessionTime: '6:00 PM',
        status: 'scheduled',
        duration: '45 minutes',
        price: 300
      }
    ];
    
    res.json(mockTrainerSessions);
  } catch (error) {
    console.error('Error fetching trainer sessions:', error);
    res.status(500).json({ message: 'Failed to fetch trainer sessions' });
  }
});

// Get user's trial bookings
router.get('/trials', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find trial bookings by user email
    const trialBookings = await TrialBooking.find({ 
      email: req.user?.email 
    }).populate('gym', 'gymName logoUrl location');
    
    const formattedTrials = trialBookings.map(trial => ({
      id: trial._id,
      gymName: trial.gym?.gymName || trial.gymName || 'Unknown Gym',
      trialDate: trial.trialDate,
      duration: '1 day',
      status: trial.status || 'pending',
      gymLogo: trial.gym?.logoUrl,
      phone: trial.phone,
      name: trial.name
    }));
    
    res.json(formattedTrials);
  } catch (error) {
    console.error('Error fetching trial bookings:', error);
    res.status(500).json({ message: 'Failed to fetch trial bookings' });
  }
});

// Get user's active memberships
router.get('/active-memberships', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find active memberships
    const activeMemberships = await Member.find({ 
      email: req.user?.email,
      validUntil: { $gte: new Date() }
    }).populate('gym', 'gymName logoUrl location');
    
    const formattedMemberships = activeMemberships.map(membership => ({
      id: membership._id,
      planName: membership.membershipPlan || 'Standard Plan',
      gymName: membership.gym?.gymName || 'Unknown Gym',
      endDate: membership.validUntil,
      price: membership.amount || 0,
      status: membership.paymentStatus || 'active',
      remainingDays: Math.ceil((new Date(membership.validUntil) - new Date()) / (1000 * 60 * 60 * 24))
    }));
    
    res.json(formattedMemberships);
  } catch (error) {
    console.error('Error fetching active memberships:', error);
    res.status(500).json({ message: 'Failed to fetch active memberships' });
  }
});

// Get user account statistics
router.get('/account-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = req.user?.email;
    
    // Count memberships
    const totalMemberships = await Member.countDocuments({ email: userEmail });
    const activeMemberships = await Member.countDocuments({ 
      email: userEmail,
      validUntil: { $gte: new Date() }
    });
    
    // Count trial bookings
    const trialBookings = await TrialBooking.countDocuments({ email: userEmail });
    
    // Get user creation date
    const user = await require('../models/User').findById(userId);
    
    const stats = {
      memberSince: user?.createdAt || new Date(),
      accountType: activeMemberships > 0 ? 'Premium' : 'Free',
      totalBookings: totalMemberships + trialBookings,
      activeMemberships: activeMemberships,
      totalMemberships: totalMemberships,
      trialBookings: trialBookings
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching account stats:', error);
    res.status(500).json({ message: 'Failed to fetch account statistics' });
  }
});

module.exports = router;
