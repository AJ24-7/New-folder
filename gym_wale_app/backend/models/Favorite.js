// Favorites Model Schema
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to prevent duplicate favorites
favoriteSchema.index({ userId: 1, gymId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
