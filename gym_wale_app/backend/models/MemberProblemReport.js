// models/MemberProblemReport.js
const mongoose = require('mongoose');

const memberProblemReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    // Not required here as it's auto-generated in pre-save hook
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  membershipId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'equipment-broken',
      'equipment-unavailable',
      'cleanliness-issue',
      'ac-heating-issue',
      'staff-behavior',
      'class-schedule',
      'overcrowding',
      'safety-concern',
      'facility-maintenance',
      'locker-issue',
      'payment-billing',
      'trainer-complaint',
      'other'
    ]
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  images: [{
    type: String, // Cloudinary URLs
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    respondedAt: Date
  },
  resolutionNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  notificationSent: {
    type: Boolean,
    default: false
  }
});

// Generate unique report ID
memberProblemReportSchema.pre('save', async function(next) {
  if (!this.reportId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reportId = `MPR-${timestamp}-${random}`;
  }
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
memberProblemReportSchema.index({ gymId: 1, status: 1 });
memberProblemReportSchema.index({ memberId: 1 });
memberProblemReportSchema.index({ userId: 1 });

module.exports = mongoose.model('MemberProblemReport', memberProblemReportSchema);
