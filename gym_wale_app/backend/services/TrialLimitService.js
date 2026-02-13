const User = require('../models/User');
const TrialBooking = require('../models/TrialBooking');

class TrialLimitService {
    
    // Check if user's trial limits need to be reset (monthly reset on 1st)
    static async checkAndResetTrialLimits(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');
            
            const now = new Date();
            const lastReset = new Date(user.trialLimits.lastResetDate);
            
            // Calculate the 1st of current month
            const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            // Check if we need to reset (if last reset was before the 1st of current month)
            const needsReset = lastReset < firstOfCurrentMonth;
            
            if (needsReset) {
                // Reset trial limits for the new month - only update lastResetDate
                // usedTrials and remainingTrials are calculated dynamically
                user.trialLimits.lastResetDate = firstOfCurrentMonth;
                await user.save();
                
                console.log(`Trial limits reset for user ${userId} on 1st of month`);
            }
            
            return user.trialLimits;
        } catch (error) {
            console.error('Error checking trial limits:', error);
            throw error;
        }
    }
    
    // Get user's current trial status
    static async getUserTrialStatus(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');
            
            // Check and reset if needed
            await this.checkAndResetTrialLimits(userId);
            
            // Get updated user data
            const updatedUser = await User.findById(userId);
            
            // Get trial bookings for this month (with proper timezone handling)
            const currentMonth = new Date();
            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            
            console.log(`[TrialLimitService] Checking trial status for user ${userId}`);
            console.log(`[TrialLimitService] User ID type: ${typeof userId}`);
            console.log(`[TrialLimitService] Current time: ${new Date().toISOString()}`);
            console.log(`[TrialLimitService] Date range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);
            
            // Convert userId to ObjectId for database queries
            const mongoose = require('mongoose');
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
            
            console.log(`[TrialLimitService] Converting userId ${userId} to ObjectId: ${userObjectId}`);
            
            // First, find ALL trial bookings for this user to debug
            const allUserTrials = await TrialBooking.find({ userId: userObjectId });
            console.log(`[TrialLimitService] ALL trial bookings for user ${userObjectId}:`, allUserTrials.map(trial => ({
                id: trial._id,
                userId: trial.userId,
                userIdType: typeof trial.userId,
                bookingDate: trial.bookingDate,
                trialDate: trial.trialDate,
                gymName: trial.gymName,
                status: trial.status,
                isTrialUsed: trial.isTrialUsed
            })));
            
            // Also check for trial bookings by email (in case user booked as guest)
            const currentUser = updatedUser; // Use existing user data
            if (currentUser && currentUser.email) {
                const emailTrials = await TrialBooking.find({ 
                    email: currentUser.email,
                    userId: { $ne: userObjectId } // Different userId but same email
                });
                console.log(`[TrialLimitService] Trial bookings with same email but different userId:`, emailTrials.map(trial => ({
                    id: trial._id,
                    email: trial.email,
                    userId: trial.userId,
                    bookingDate: trial.bookingDate,
                    isTrialUsed: trial.isTrialUsed
                })));
                
                // Update guest bookings to be associated with the user account
                if (emailTrials.length > 0) {
                    console.log(`[TrialLimitService] Updating ${emailTrials.length} guest bookings to be associated with user account`);
                    await TrialBooking.updateMany(
                        { email: currentUser.email, userId: { $ne: userObjectId } },
                        { userId: userObjectId, isTrialUsed: true }
                    );
                }
            }
            
            // Now find monthly trials with our query
            const monthlyTrials = await TrialBooking.find({
                userId: userObjectId,
                bookingDate: { $gte: startOfMonth, $lte: endOfMonth },
                status: { $ne: 'cancelled' }
            });
            
            console.log(`[TrialLimitService] Found ${monthlyTrials.length} trial bookings this month (including isTrialUsed=false)`);
            
            // Filter for trials that should count against limits
            const countableTrials = monthlyTrials.filter(trial => trial.isTrialUsed === true);
            console.log(`[TrialLimitService] Found ${countableTrials.length} countable trial bookings (isTrialUsed=true)`);
            
            console.log(`[TrialLimitService] Trial booking details:`, monthlyTrials.map(trial => ({
                id: trial._id,
                bookingDate: trial.bookingDate,
                trialDate: trial.trialDate,
                gymName: trial.gymName,
                status: trial.status,
                isTrialUsed: trial.isTrialUsed
            })));
            console.log(`[TrialLimitService] Total trials allowed: ${updatedUser.trialLimits.totalTrials}`);
            
            // Calculate next reset date (1st of next month)
            const now = new Date();
            const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            
            const result = {
                totalTrials: updatedUser.trialLimits.totalTrials,
                usedTrials: countableTrials.length,
                remainingTrials: Math.max(0, updatedUser.trialLimits.totalTrials - countableTrials.length),
                lastResetDate: updatedUser.trialLimits.lastResetDate,
                nextResetDate: nextResetDate,
                monthlyTrials: countableTrials
            };
            
            console.log(`[TrialLimitService] Calculated result:`, result);
            return result;
        } catch (error) {
            console.error('Error getting trial status:', error);
            throw error;
        }
    }
    
    // Check if user can book a trial
    static async canBookTrial(userId, gymId, trialDate) {
        try {
            const trialStatus = await this.getUserTrialStatus(userId);
            
            // Check if user has remaining trials
            if (trialStatus.remainingTrials <= 0) {
                return {
                    canBook: false,
                    reason: 'monthly_limit_exceeded',
                    message: `You have used all ${trialStatus.totalTrials} free trials for this month. Trials reset on the 1st of each month.`
                };
            }
            
            // Convert userId to ObjectId for database queries
            const mongoose = require('mongoose');
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
            
            // Check if user already has a trial on the same date
            const sameDate = new Date(trialDate);
            const startOfDay = new Date(sameDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(sameDate.setHours(23, 59, 59, 999));
            
            const existingTrialOnDate = await TrialBooking.findOne({
                userId: userObjectId,
                trialDate: { $gte: startOfDay, $lte: endOfDay },
                status: { $ne: 'cancelled' }
            });
            
            if (existingTrialOnDate) {
                return {
                    canBook: false,
                    reason: 'same_day_booking',
                    message: 'You cannot book more than one trial session per day.'
                };
            }
            
            // Check if user has already booked a trial at this gym in the last 2 days
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            
            const recentGymTrial = await TrialBooking.findOne({
                userId: userObjectId,
                gymId: gymId,
                trialDate: { $gte: twoDaysAgo },
                status: { $ne: 'cancelled' }
            });
            
            if (recentGymTrial) {
                return {
                    canBook: false,
                    reason: 'gym_cooldown',
                    message: 'You can only book one trial per gym every 2 days.'
                };
            }
            
            return {
                canBook: true,
                remainingTrials: trialStatus.remainingTrials,
                message: `You have ${trialStatus.remainingTrials} free trials remaining this month.`
            };
            
        } catch (error) {
            console.error('Error checking if user can book trial:', error);
            throw error;
        }
    }
    
    // Book a trial for the user
    static async bookTrial(userId, trialData) {
        try {
            const canBook = await this.canBookTrial(userId, trialData.gymId, trialData.trialDate);
            
            if (!canBook.canBook) {
                throw new Error(canBook.message);
            }
            
            // Convert userId to ObjectId for database storage
            const mongoose = require('mongoose');
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
            
            // Create trial booking
            const trialBooking = new TrialBooking({
                ...trialData,
                userId: userObjectId,
                isTrialUsed: true,
                trialType: 'free',
                status: 'scheduled'
            });
            
            await trialBooking.save();
            
            // Update user's trial history
            const user = await User.findById(userId);
            user.trialLimits.trialHistory.push({
                gymId: trialData.gymId,
                gymName: trialData.gymName,
                bookingDate: new Date(),
                trialDate: trialData.trialDate,
                status: 'scheduled'
            });
            
            await user.save();
            
            return {
                success: true,
                trialBooking: trialBooking,
                remainingTrials: canBook.remainingTrials - 1,
                message: 'Trial booked successfully!'
            };
            
        } catch (error) {
            console.error('Error booking trial:', error);
            throw error;
        }
    }
    
    // Cancel a trial booking
    static async cancelTrial(userId, trialBookingId) {
        try {
            // Convert userId to ObjectId for database queries
            const mongoose = require('mongoose');
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
            
            const trialBooking = await TrialBooking.findOne({
                _id: trialBookingId,
                userId: userObjectId
            });
            
            if (!trialBooking) {
                throw new Error('Trial booking not found');
            }
            
            if (trialBooking.status === 'cancelled') {
                throw new Error('Trial is already cancelled');
            }
            
            // Update trial booking status
            trialBooking.status = 'cancelled';
            await trialBooking.save();
            
            // Update user's trial history
            const user = await User.findById(userId);
            const historyItem = user.trialLimits.trialHistory.find(
                item => item.gymId.toString() === trialBooking.gymId && 
                       item.trialDate.getTime() === trialBooking.trialDate.getTime()
            );
            
            if (historyItem) {
                historyItem.status = 'cancelled';
                await user.save();
            }
            
            return {
                success: true,
                message: 'Trial cancelled successfully!'
            };
            
        } catch (error) {
            console.error('Error cancelling trial:', error);
            throw error;
        }
    }
    
    // Get user's trial history
    static async getUserTrialHistory(userId, options = {}) {
        try {
            const { page = 1, limit = 10, status } = options;
            
            // Convert userId to ObjectId for database queries
            const mongoose = require('mongoose');
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
            
            const query = { userId: userObjectId };
            if (status) query.status = status;
            
            const trialBookings = await TrialBooking.find(query)
                .populate('gymId', 'gymName logoUrl')
                .sort({ trialDate: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);
            
            const total = await TrialBooking.countDocuments(query);
            
            return {
                trialBookings,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            };
            
        } catch (error) {
            console.error('Error getting trial history:', error);
            throw error;
        }
    }
    
    // Admin function to reset all users' trial limits (manual reset)
    static async resetAllTrialLimits() {
        try {
            // Use the 1st of current month as reset date for consistency
            const firstOfCurrentMonth = new Date();
            firstOfCurrentMonth.setDate(1);
            firstOfCurrentMonth.setHours(0, 0, 0, 0);
            
            const result = await User.updateMany(
                {},
                {
                    $set: {
                        'trialLimits.lastResetDate': firstOfCurrentMonth
                    }
                }
            );
            
            return {
                success: true,
                modifiedCount: result.modifiedCount,
                message: `Reset trial limits for ${result.modifiedCount} users`
            };
            
        } catch (error) {
            console.error('Error resetting all trial limits:', error);
            throw error;
        }
    }
}

module.exports = TrialLimitService;
