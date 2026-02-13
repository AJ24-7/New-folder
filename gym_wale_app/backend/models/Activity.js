const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  gym: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Gym', 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: [
      'membership_plan_updated',
      'photo_uploaded',
      'photo_updated',
      'photo_deleted',
      'equipment_added',
      'equipment_updated',
      'member_added',
      'payment_received',
      'profile_updated',
      'other'
    ]
  },
  description: { 
    type: String, 
    required: true 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster queries
activitySchema.index({ gym: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
