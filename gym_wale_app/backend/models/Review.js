const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    gym: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        trim: true,
        required: true
    },
    // This field is added based on the frontend form, but ideally, name should be from the populated user.
    // However, keeping it allows for flexibility if user details change or for unauthenticated (though less ideal) reviews if you adapt the logic.
    reviewerName: {
        type: String,
        trim: true
    },
    // Admin reply system
    adminReply: {
        reply: {
            type: String,
            trim: true
        },
        repliedAt: {
            type: Date,
            default: null
        },
        repliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Gym',
            default: null
        }
    },
    // Featured review system
    isFeatured: {
        type: Boolean,
        default: false
    },
    featuredAt: {
        type: Date,
        default: null
    },
    featuredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user can only review a specific gym once
reviewSchema.index({ gym: 1, user: 1 }, { unique: true });

// Middleware to populate user details (name) when finding reviews
// This is not strictly necessary here if population is handled in controller, but can be useful.
// reviewSchema.pre(/^find/, function(next) {
//   this.populate({
//     path: 'user',
//     select: 'name' // Only select the name field from the User model
//   });
//   next();
// });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
