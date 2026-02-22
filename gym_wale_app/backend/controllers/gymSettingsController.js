const Gym = require('../models/gym');
const bcrypt = require('bcryptjs');

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
        allowMembershipFreezing: gym.allowMembershipFreezing ?? true,
        passcodeEnabled: gym.passcodeEnabled ?? false,
        passcodeType: gym.passcodeType ?? 'none',
        hasPasscode: gym.passcodeHash ? true : false
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

    const { allowMembershipFreezing, passcodeEnabled, passcodeType, passcode } = req.body;

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

    if (passcodeEnabled !== undefined) {
      gym.passcodeEnabled = passcodeEnabled;
    }

    if (passcodeType !== undefined) {
      gym.passcodeType = passcodeType;
    }

    // Update passcode if provided
    if (passcode !== undefined) {
      if (passcode === '') {
        // Remove passcode
        gym.passcodeHash = undefined;
        gym.passcodeEnabled = false;
        gym.passcodeType = 'none';
      } else {
        // Hash and store passcode
        const salt = await bcrypt.genSalt(10);
        gym.passcodeHash = await bcrypt.hash(passcode, salt);
      }
    }

    await gym.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        allowMembershipFreezing: gym.allowMembershipFreezing,
        passcodeEnabled: gym.passcodeEnabled,
        passcodeType: gym.passcodeType,
        hasPasscode: gym.passcodeHash ? true : false
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

/**
 * Verify passcode
 * POST /api/gym/settings/verify-passcode
 */
exports.verifyPasscode = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no admin ID found'
      });
    }

    const { passcode } = req.body;

    if (!passcode) {
      return res.status(400).json({
        success: false,
        message: 'Passcode is required'
      });
    }

    const gym = await Gym.findOne({ admin: adminId });
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found for this admin'
      });
    }

    if (!gym.passcodeHash) {
      return res.status(400).json({
        success: false,
        message: 'No passcode set for this gym'
      });
    }

    const isValid = await bcrypt.compare(passcode, gym.passcodeHash);

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    console.error('Error verifying passcode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify passcode',
      error: error.message
    });
  }
};
