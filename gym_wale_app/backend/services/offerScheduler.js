// services/offerScheduler.js
const cron = require('node-cron');
const Offer = require('../models/Offer');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');

/**
 * Offer Scheduler Service
 * Handles automatic expiration of offers and sends notifications
 */

// Run every hour to check for expired offers
const checkExpiredOffers = cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔍 Checking for expired offers...');
    
    const now = new Date();
    
    // Find all active offers that have passed their end date
    const expiredOffers = await Offer.find({
      status: 'active',
      endDate: { $lt: now }
    }).populate('gymId', 'name');

    if (expiredOffers.length > 0) {
      console.log(`📅 Found ${expiredOffers.length} expired offers`);
      
      for (const offer of expiredOffers) {
        // Update offer status to expired
        offer.status = 'expired';
        offer.isActive = false;
        await offer.save();
        
        // Also expire any associated coupons
        if (offer.couponCode) {
          await Coupon.updateMany(
            { offerId: offer._id, status: 'active' },
            { status: 'expired', isActive: false }
          );
        }
        
        // Create notification for gym admin
        const notification = new Notification({
          title: 'Offer Expired',
          message: `Your offer "${offer.title}" has expired and has been automatically deactivated.`,
          type: 'offer_expired',
          priority: 'normal',
          icon: 'fa-calendar-times',
          color: '#F59E0B',
          user: offer.gymId._id,
          data: {
            offerId: offer._id,
            offerTitle: offer.title,
            usageCount: offer.usageCount,
            revenue: offer.revenue
          }
        });
        
        await notification.save();
        
        console.log(`✅ Expired offer: ${offer.title} (ID: ${offer._id})`);
      }
      
      console.log(`✅ Successfully processed ${expiredOffers.length} expired offers`);
    } else {
      console.log('✅ No expired offers found');
    }
  } catch (error) {
    console.error('❌ Error checking expired offers:', error);
  }
});

// Run daily at midnight to send upcoming expiry warnings
const checkExpiringOffers = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('🔍 Checking for expiring offers...');
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    // Find offers expiring in the next 3 days
    const expiringOffers = await Offer.find({
      status: 'active',
      endDate: {
        $gt: now,
        $lte: threeDaysFromNow
      }
    }).populate('gymId', 'name');

    if (expiringOffers.length > 0) {
      console.log(`⚠️ Found ${expiringOffers.length} offers expiring soon`);
      
      for (const offer of expiringOffers) {
        const daysRemaining = Math.ceil((offer.endDate - now) / (1000 * 60 * 60 * 24));
        
        // Create notification for gym admin
        const notification = new Notification({
          title: 'Offer Expiring Soon',
          message: `Your offer "${offer.title}" will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Consider extending it or creating a new one.`,
          type: 'offer_expiring',
          priority: 'medium',
          icon: 'fa-exclamation-triangle',
          color: '#F59E0B',
          user: offer.gymId._id,
          data: {
            offerId: offer._id,
            offerTitle: offer.title,
            daysRemaining: daysRemaining,
            endDate: offer.endDate
          }
        });
        
        await notification.save();
        
        console.log(`✅ Sent expiry warning for: ${offer.title} (${daysRemaining} days)`);
      }
    } else {
      console.log('✅ No offers expiring soon');
    }
  } catch (error) {
    console.error('❌ Error checking expiring offers:', error);
  }
});

// Initialize scheduler
const startOfferScheduler = () => {
  console.log('🚀 Starting offer scheduler...');
  checkExpiredOffers.start();
  checkExpiringOffers.start();
  console.log('✅ Offer scheduler started successfully');
  
  // Run immediately on startup to catch any missed expirations
  setTimeout(async () => {
    console.log('🔍 Running initial offer expiry check...');
    const now = new Date();
    
    const expiredOffers = await Offer.find({
      status: 'active',
      endDate: { $lt: now }
    });
    
    if (expiredOffers.length > 0) {
      console.log(`📅 Found ${expiredOffers.length} expired offers on startup`);
      for (const offer of expiredOffers) {
        offer.status = 'expired';
        offer.isActive = false;
        await offer.save();
        
        if (offer.couponCode) {
          await Coupon.updateMany(
            { offerId: offer._id, status: 'active' },
            { status: 'expired', isActive: false }
          );
        }
      }
      console.log('✅ Initial cleanup completed');
    }
  }, 5000); // Run 5 seconds after startup
};

// Stop scheduler (for graceful shutdown)
const stopOfferScheduler = () => {
  checkExpiredOffers.stop();
  checkExpiringOffers.stop();
  console.log('🛑 Offer scheduler stopped');
};

module.exports = {
  startOfferScheduler,
  stopOfferScheduler
};
