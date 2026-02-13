const jwt = require('jsonwebtoken');

// Temporary authentication middleware for development/testing
module.exports = function tempAuth(req, res, next) {
  try {
    // Check for Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded.admin || decoded; // Set req.admin to match other middleware
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please login again.' 
      });
    }
    
    return res.status(400).json({ 
      message: 'Invalid token.' 
    });
  }
};
