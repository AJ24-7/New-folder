const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Gym = require('../models/gym');

async function resolveGymFromToken(decoded) {
    const candidateIds = [
        decoded?.gym?.gymId,
        decoded?.admin?.gymId,
        decoded?.gym?.id,
        decoded?.admin?.id,
        decoded?.id,
        decoded?._id,
    ].filter(Boolean);

    for (const rawId of candidateIds) {
        if (!mongoose.Types.ObjectId.isValid(rawId)) continue;

        let gym = await Gym.findById(rawId).select('_id email admin');
        if (!gym) {
            gym = await Gym.findOne({ admin: rawId }).select('_id email admin');
        }
        if (gym) return gym;
    }

    const tokenEmail = decoded?.gym?.email || decoded?.admin?.email || decoded?.email;
    if (tokenEmail && typeof tokenEmail === 'string') {
        return Gym.findOne({ email: tokenEmail.toLowerCase().trim() }).select('_id email admin');
    }

    return null;
}

module.exports = async function (req, res, next) {
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
        const resolvedGym = await resolveGymFromToken(decoded);
        const resolvedGymId = resolvedGym?._id?.toString();

        console.log('🔐 JWT decoded for gym admin:', {
            hasAdmin: !!decoded.admin,
            hasGym: !!decoded.gym,
            adminId: decoded.admin?.id,
            gymId: resolvedGymId || decoded.gym?.id || decoded.admin?.id,
            structure: Object.keys(decoded)
        });
        
        // Support multiple JWT structures and normalize to a usable gym identity.
        const fallbackId = decoded?.gym?.id || decoded?.admin?.id || decoded?.id || decoded?._id;
        const normalizedGymId = resolvedGymId;

        if (!normalizedGymId) {
            return res.status(404).json({
                message: 'Gym not found for this authenticated user',
                error: 'gym_not_found'
            });
        }

        if (decoded.admin) {
            req.admin = decoded.admin;
            req.gym = decoded.admin;
        } else if (decoded.gym) {
            req.gym = decoded.gym;
            req.admin = decoded.gym;
        } else {
            req.gym = {
                id: decoded.id || decoded._id,
                email: decoded.email,
                gymName: decoded.gymName || decoded.name
            };
            req.admin = req.gym;
        }

        // Preserve original token identity and attach normalized gym identity.
        req.admin.authId = req.admin.id || fallbackId;
        req.admin.id = normalizedGymId;
        req.admin.gymId = normalizedGymId;

        req.gym.id = normalizedGymId;
        req.gym.gymId = normalizedGymId;
        if (!req.gym.email && req.admin.email) {
            req.gym.email = req.admin.email;
        }

        req.gymId = normalizedGymId;
        
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