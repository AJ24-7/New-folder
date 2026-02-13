const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('=== AUTH MIDDLEWARE DEBUG ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Authorization header:', authHeader);
  console.log('Full headers:', JSON.stringify(req.headers, null, 2));
  
  if (!authHeader) {
    console.log('No authorization header found');
    return res.status(401).json({ success: false, message: 'Token missing' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('Invalid authorization header format. Expected Bearer token, got:', authHeader.substring(0, 20));
    return res.status(401).json({ success: false, message: 'Invalid token type' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('No token found in authorization header');
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }
  
  console.log('Token extracted:', token.substring(0, 30) + '...');
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    req.userId = decoded.userId;
    
    // Fetch user data and attach to request
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('User found:', user.email);
    req.user = user;
    next();
  } catch (err) {
    console.log('Token verification failed:', err.message);
    console.log('Error details:', err);
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Export both as default and named export for compatibility
module.exports = authMiddleware;
module.exports.protect = authMiddleware;
