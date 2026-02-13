const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Optional authentication middleware - doesn't reject requests without tokens
const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user data and attach to request
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      // User not found, continue without authentication
      req.user = null;
      return next();
    }
    
    req.user = user;
    next();
  } catch (err) {
    // Invalid token, continue without authentication
    req.user = null;
    next();
  }
};

module.exports = optionalAuthMiddleware;
