const jwt = require('jsonwebtoken');
const Trainer = require('../models/trainerModel');

module.exports = async function trainerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');

    if (!decoded.trainerId) {
      return res.status(401).json({ success: false, message: 'Invalid trainer token' });
    }

    const trainer = await Trainer.findById(decoded.trainerId).select('+password');
    if (!trainer) {
      return res.status(401).json({ success: false, message: 'Trainer not found' });
    }

    if (trainer.status !== 'approved' || trainer.verificationStatus !== 'verified') {
      return res.status(403).json({ success: false, message: 'Trainer not approved yet' });
    }

    req.trainer = {
      id: trainer._id.toString(),
      _id: trainer._id,
      email: trainer.email,
      name: trainer.fullName,
      trainerType: trainer.trainerType,
      gym: trainer.gym || null
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token', error: err.message });
  }
};
