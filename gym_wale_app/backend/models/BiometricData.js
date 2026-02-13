const mongoose = require('mongoose');

const biometricDataSchema = new mongoose.Schema({
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    personId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'personType'
    },
    personType: {
        type: String,
        required: true,
        enum: ['Member', 'Trainer']
    },
    biometricType: {
        type: String,
        required: true,
        enum: ['fingerprint', 'face', 'both']
    },
    fingerprintData: {
        template: {
            type: String, // Base64 encoded fingerprint template
            default: null
        },
        quality: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        enrollmentDate: {
            type: Date,
            default: null
        }
    },
    faceData: {
        template: {
            type: String, // Base64 encoded face template
            default: null
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        enrollmentDate: {
            type: Date,
            default: null
        },
        imageUrl: {
            type: String, // URL to stored face image
            default: null
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    enrolledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    enrollmentDevice: {
        deviceId: {
            type: String,
            default: null
        },
        deviceType: {
            type: String,
            enum: ['fingerprint_scanner', 'camera', 'mobile_app'],
            default: null
        },
        deviceModel: {
            type: String,
            default: null
        }
    },
    securityLevel: {
        type: String,
        enum: ['standard', 'high', 'maximum'],
        default: 'standard'
    },
    lastVerificationDate: {
        type: Date,
        default: null
    },
    verificationCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better performance
biometricDataSchema.index({ gymId: 1, personId: 1, biometricType: 1 });
biometricDataSchema.index({ gymId: 1, isActive: 1 });
biometricDataSchema.index({ personId: 1, personType: 1 });

// Pre-save middleware to update timestamp
biometricDataSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Instance methods
biometricDataSchema.methods.updateVerification = function() {
    this.lastVerificationDate = new Date();
    this.verificationCount += 1;
    return this.save();
};

biometricDataSchema.methods.deactivate = function() {
    this.isActive = false;
    return this.save();
};

// Static methods
biometricDataSchema.statics.findByPersonAndType = function(personId, biometricType, gymId) {
    return this.findOne({
        personId,
        biometricType: { $in: [biometricType, 'both'] },
        gymId,
        isActive: true
    });
};

biometricDataSchema.statics.getGymBiometricStats = function(gymId) {
    return this.aggregate([
        { $match: { gymId: mongoose.Types.ObjectId(gymId), isActive: true } },
        {
            $group: {
                _id: '$biometricType',
                count: { $sum: 1 },
                avgQuality: { $avg: '$fingerprintData.quality' },
                avgConfidence: { $avg: '$faceData.confidence' }
            }
        }
    ]);
};

module.exports = mongoose.model('BiometricData', biometricDataSchema);
