// Meal Notification Scheduler
// This should be called periodically (e.g., every minute) by a cron job

const cron = require('node-cron');
const { sendMealNotifications } = require('../controllers/dietController');

// Schedule the meal notification checker to run every minute
const scheduleMealNotifications = () => {
  // Run every minute: '* * * * *'
  // For production, you might want to run every 5-15 minutes to reduce load
  cron.schedule('* * * * *', async () => {
    console.log('⏰ Running meal notification scheduler...');
    try {
      await sendMealNotifications();
    } catch (error) {
      console.error('❌ Error in meal notification scheduler:', error);
    }
  });

  console.log('✅ Meal notification scheduler initialized');
};

module.exports = { scheduleMealNotifications };
