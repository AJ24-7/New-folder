const mongoose = require('mongoose');

const trialBookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  trialDate: { type: Date, required: true },
  trialTime: { type: String, required: true },
  preferredActivity: { type: String },
  message: { type: String, required: false },
  gymId: { type: String, required: true },
  gymName: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to user account
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'confirmed', 'contacted', 'completed', 'cancelled', 'no-show'] 
  },
  bookingDate: { type: Date, default: Date.now }, // When the booking was made
  isTrialUsed: { type: Boolean, default: false }, // Whether this counts against trial limit
  trialType: { type: String, default: 'free', enum: ['free', 'paid'] }, // Type of trial
  // Notification tracking
  reminderSent: { type: Boolean, default: false },
  // Additional fields
  startTime: { type: String },
  endTime: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('TrialBooking', trialBookingSchema);
