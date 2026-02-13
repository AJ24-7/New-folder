const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'No token, authorization denied',
            error: 'missing_token'
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔐 JWT decoded for gym admin:', {
            hasAdmin: !!decoded.admin,
            hasGym: !!decoded.gym,
            adminId: decoded.admin?.id,
            gymId: decoded.gym?.id || decoded.admin?.id,
            structure: Object.keys(decoded)
        });
        
        // Support multiple JWT structures for compatibility
        if (decoded.admin) {
            req.admin = decoded.admin;
            req.gym = decoded.admin; // Gym admin info is in admin field
        } else if (decoded.gym) {
            req.gym = decoded.gym;
            req.admin = decoded.gym;
        } else {
            // Fallback for direct user structure
            req.gym = {
                id: decoded.id || decoded._id,
                email: decoded.email,
                gymName: decoded.gymName || decoded.name
            };
            req.admin = req.gym;
        }
        
        next();
    } catch (err) {
        console.error('❌ JWT verification failed:', err.message);
        return res.status(401).json({ 
            message: 'Token is not valid',
            error: 'invalid_token',
            details: err.message
        });
    }
};