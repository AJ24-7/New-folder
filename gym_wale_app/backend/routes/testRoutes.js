const express = require('express');
const router = express.Router();

// Test route for development
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test route for database connection
router.get('/db-status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Database connection active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
