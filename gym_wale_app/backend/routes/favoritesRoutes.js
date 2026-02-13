// Favorites Routes
const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const Gym = require('../models/gym');
const authMiddleware = require('../middleware/authMiddleware');

// Get user's favorite gyms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find all favorite gym IDs for the user
    const favorites = await Favorite.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('gymId createdAt');

    const gymIds = favorites.map(fav => fav.gymId);

    // Get full gym details
    const gyms = await Gym.find({
      _id: { $in: gymIds },
      status: 'approved',
    });

    // Map gyms with favorite date
    const gymData = gyms.map(gym => {
      const favorite = favorites.find(
        fav => fav.gymId.toString() === gym._id.toString()
      );
      return {
        ...gym.toObject(),
        favoritedAt: favorite?.createdAt,
        isFavorite: true,
      };
    });

    const total = await Favorite.countDocuments({ userId });

    res.json({
      success: true,
      gyms: gymData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites',
      error: error.message,
    });
  }
});

// Check if gym is favorited
router.get('/check/:gymId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { gymId } = req.params;

    const favorite = await Favorite.findOne({ userId, gymId });

    res.json({
      success: true,
      isFavorite: !!favorite,
    });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking favorite status',
      error: error.message,
    });
  }
});

// Add gym to favorites
router.post('/:gymId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { gymId } = req.params;

    // Check if gym exists and is approved
    const gym = await Gym.findOne({ _id: gymId, status: 'approved' });
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found or not approved',
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ userId, gymId });
    if (existingFavorite) {
      return res.json({
        success: true,
        message: 'Gym already in favorites',
        favorite: existingFavorite,
      });
    }

    // Create favorite
    const favorite = new Favorite({ userId, gymId });
    await favorite.save();

    res.status(201).json({
      success: true,
      message: 'Gym added to favorites',
      favorite,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding gym to favorites',
      error: error.message,
    });
  }
});

// Remove gym from favorites
router.delete('/:gymId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { gymId } = req.params;

    const result = await Favorite.findOneAndDelete({ userId, gymId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    res.json({
      success: true,
      message: 'Gym removed from favorites',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing gym from favorites',
      error: error.message,
    });
  }
});

// Get favorite count for user
router.get('/count', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const count = await Favorite.countDocuments({ userId });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error counting favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error counting favorites',
      error: error.message,
    });
  }
});

module.exports = router;
