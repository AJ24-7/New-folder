const Gym = require('../models/gym');

/**
 * Get gym settings
 * GET /api/gym/settings
 */
exports.getGymSettings = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no admin ID found'
      });
    }

    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found for this admin'
      });
    }

    res.json({
      success: true,
      settings: {
        allowMembershipFreezing: gym.allowMembershipFreezing ?? true
      }
    });
  } catch (error) {
    console.error('Error fetching gym settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gym settings',
      error: error.message
    });
  }
};

/**
 * Update gym settings
 * PUT /api/gym/settings
 */
exports.updateGymSettings = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no admin ID found'
      });
    }

    const { allowMembershipFreezing } = req.body;

    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found for this admin'
      });
    }

    // Update settings
    if (allowMembershipFreezing !== undefined) {
      gym.allowMembershipFreezing = allowMembershipFreezing;
    }

    await gym.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        allowMembershipFreezing: gym.allowMembershipFreezing
      }
    });
  } catch (error) {
    console.error('Error updating gym settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update gym settings',
      error: error.message
    });
  }
};

/**
 * Get gym settings by gym ID (public endpoint for user app)
 * GET /api/gym/:gymId/settings
 */
exports.getGymSettingsById = async (req, res) => {
  try {
    const { gymId } = req.params;

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    res.json({
      success: true,
      settings: {
        allowMembershipFreezing: gym.allowMembershipFreezing ?? true
      }
    });
  } catch (error) {
    console.error('Error fetching gym settings by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gym settings',
      error: error.message
    });
  }
};
