/**
 * Script to clear existing workout plans and reseed with unique Pixabay images
 * Run: node clear-and-reseed-workouts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { WorkoutPlan } = require('./models/WorkoutPlan');

async function clearAndReseed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count existing plans
    const count = await WorkoutPlan.countDocuments();
    console.log(`📊 Found ${count} existing workout plans`);

    if (count > 0) {
      console.log('🗑️  Deleting existing workout plans...');
      await WorkoutPlan.deleteMany({});
      console.log('✅ All workout plans deleted\n');
    }

    console.log('🌱 Now call the seed endpoint to create new plans with unique images:');
    console.log('   POST http://localhost:5000/api/workouts/seed\n');
    console.log('💡 Or use this curl command:');
    console.log('   curl -X POST http://localhost:5000/api/workouts/seed\n');

    await mongoose.connection.close();
    console.log('✅ Done! Database connection closed.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearAndReseed();
