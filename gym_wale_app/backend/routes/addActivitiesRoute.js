// Temporary API endpoint to add sample activities to all gyms
// Add this to your backend server.js temporarily

const express = require('express');
const router = express.Router();
const Gym = require('../models/gym');

const sampleActivities = [
  {
    name: 'Cardio Training',
    icon: 'fa-running',
    description: 'High-intensity cardiovascular exercises to boost endurance and burn calories'
  },
  {
    name: 'Weight Training',
    icon: 'fa-dumbbell',
    description: 'Build strength and muscle with free weights and resistance machines'
  },
  {
    name: 'Yoga Classes',
    icon: 'fa-yoga',
    description: 'Improve flexibility, balance, and mindfulness through guided yoga sessions'
  },
  {
    name: 'Swimming',
    icon: 'fa-swimmer',
    description: 'Full-body aquatic workout suitable for all fitness levels'
  },
  {
    name: 'Cycling',
    icon: 'fa-bicycle',
    description: 'Indoor cycling classes for cardio and leg strength training'
  },
  {
    name: 'Boxing',
    icon: 'fa-boxing',
    description: 'High-energy boxing and martial arts training sessions'
  }
];

// POST /api/gyms/add-sample-activities
router.post('/add-sample-activities', async (req, res) => {
  try {
    const gyms = await Gym.find({});
    let updated = 0;
    
    for (const gym of gyms) {
      if (!gym.activities || gym.activities.length === 0) {
        gym.activities = sampleActivities;
        await gym.save();
        updated++;
      }
    }
    
    res.json({
      success: true,
      message: `Added activities to ${updated} gyms`,
      totalGyms: gyms.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding activities',
      error: error.message
    });
  }
});

module.exports = router;
