const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['present', 'absent', 'pending'],
        default: 'pending'
    },
    checkInTime: {
        type: String,
        default: null
    },
    checkOutTime: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: ''
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        default: null
    },
    // Biometric authentication fields
    authenticationMethod: {
        type: String,
        enum: ['manual', 'fingerprint', 'face_recognition', 'qr_code', 'card'],
        default: 'manual'
    },
    biometricData: {
        biometricType: {
            type: String,
            enum: ['fingerprint', 'face', 'none'],
            default: 'none'
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        deviceId: {
            type: String,
            default: null
        },
        templateMatched: {
            type: Boolean,
            default: false
        },
        verificationTime: {
            type: Number, // Time in milliseconds for verification
            default: null
        }
    },
    location: {
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        accuracy: {
            type: Number,
            default: null
        }
    },
    // Geofence-based attendance fields
    geofenceEntry: {
        timestamp: {
            type: Date,
            default: null
        },
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        accuracy: {
            type: Number,
            default: null
        },
        isMockLocation: {
            type: Boolean,
            default: false
        },
        distanceFromGym: {
            type: Number, // Distance in meters from gym center
            default: null
        }
    },
    geofenceExit: {
        timestamp: {
            type: Date,
            default: null
        },
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        accuracy: {
            type: Number,
            default: null
        },
        durationInside: {
            type: Number, // Duration in minutes
            default: null
        }
    },
    isGeofenceAttendance: {
        type: Boolean,
        default: false
    },
    deviceInfo: {
        deviceType: {
            type: String,
            enum: ['web', 'mobile', 'scanner', 'kiosk'],
            default: 'web'
        },
        userAgent: {
            type: String,
            default: null
        },
        ipAddress: {
            type: String,
            default: null
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure one attendance record per person per date
attendanceSchema.index({ gymId: 1, personId: 1, date: 1 }, { unique: true });

// Index for efficient querying
attendanceSchema.index({ gymId: 1, date: 1 });
attendanceSchema.index({ gymId: 1, personType: 1, date: 1 });

// Virtual for attendance rate calculation
attendanceSchema.virtual('attendanceRate').get(function() {
    return this.status === 'present' ? 100 : 0;
});

// Pre-save middleware to update timestamps
attendanceSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to get attendance summary
attendanceSchema.statics.getAttendanceSummary = async function(gymId, startDate, endDate) {
    const summary = await this.aggregate([
        {
            $match: {
                gymId: new mongoose.Types.ObjectId(gymId),
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $group: {
                _id: {
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$date"
                        }
                    },
                    personType: "$personType",
                    status: "$status"
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: {
                    date: "$_id.date",
                    personType: "$_id.personType"
                },
                statusCounts: {
                    $push: {
                        status: "$_id.status",
                        count: "$count"
                    }
                }
            }
        },
        {
            $group: {
                _id: "$_id.date",
                typeStats: {
                    $push: {
                        personType: "$_id.personType",
                        statusCounts: "$statusCounts"
                    }
                }
            }
        },
        {
            $sort: { "_id": 1 }
        }
    ]);

    return summary;
};

// Static method to get individual attendance records
attendanceSchema.statics.getPersonAttendance = async function(gymId, personId, startDate, endDate) {
    return await this.find({
        gymId: new mongoose.Types.ObjectId(gymId),
        personId: new mongoose.Types.ObjectId(personId),
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ date: 1 });
};

// Static method to get attendance statistics
attendanceSchema.statics.getAttendanceStats = async function(gymId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const stats = await this.aggregate([
        {
            $match: {
                gymId: new mongoose.Types.ObjectId(gymId),
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: {
                    personType: "$personType",
                    status: "$status"
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: "$_id.personType",
                statusCounts: {
                    $push: {
                        status: "$_id.status",
                        count: "$count"
                    }
                }
            }
        }
    ]);

    return stats;
};

// Method to check if person was present on a specific date
attendanceSchema.methods.wasPresent = function() {
    return this.status === 'present';
};

// Method to get formatted check-in time
attendanceSchema.methods.getFormattedCheckInTime = function() {
    if (!this.checkInTime) return null;
    return this.checkInTime;
};

// Method to calculate duration (if check-out time exists)
attendanceSchema.methods.getDuration = function() {
    if (!this.checkInTime || !this.checkOutTime) return null;
    
    const checkIn = new Date(`1970-01-01T${this.checkInTime}`);
    const checkOut = new Date(`1970-01-01T${this.checkOutTime}`);
    
    const diffMs = checkOut - checkIn;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
