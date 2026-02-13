/**
 * Migration Script: Add Geofence Radius to Existing Gyms
 * 
 * This script updates all existing gym records to include a default geofenceRadius
 * in their location object.
 * 
 * Run this once after deploying the geofencing feature.
 * 
 * Usage:
 *   node scripts/addGeofenceRadiusToGyms.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('../models/gym');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym_wale', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Main migration function
const migrateGyms = async () => {
  try {
    console.log('\n🚀 Starting Geofence Radius Migration...\n');

    // Find all gyms without geofenceRadius
    const gymsToUpdate = await Gym.find({
      'location.geofenceRadius': { $exists: false }
    });

    console.log(`📊 Found ${gymsToUpdate.length} gyms to update\n`);

    if (gymsToUpdate.length === 0) {
      console.log('✅ All gyms already have geofenceRadius set!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Update each gym
    for (const gym of gymsToUpdate) {
      try {
        // Set default geofence radius (100 meters)
        // Adjust based on gym size if needed
        const defaultRadius = 100;

        if (!gym.location) {
          gym.location = {};
        }

        gym.location.geofenceRadius = defaultRadius;
        await gym.save();

        console.log(`✅ Updated: ${gym.gymName} (ID: ${gym._id}) - Radius: ${defaultRadius}m`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to update ${gym.gymName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} gyms`);
    console.log(`   ❌ Failed to update: ${errorCount} gyms`);
    console.log(`   📊 Total processed: ${successCount + errorCount} gyms\n`);

    // Optional: Update gyms based on custom criteria
    console.log('💡 Tip: You can manually adjust geofence radius for specific gyms:');
    console.log('   - Large gyms (>1000 sqm): 150-200m radius');
    console.log('   - Medium gyms (500-1000 sqm): 100-150m radius');
    console.log('   - Small gyms (<500 sqm): 50-100m radius\n');

  } catch (error) {
    console.error('❌ Migration Error:', error);
    throw error;
  }
};

// Verify migration
const verifyMigration = async () => {
  try {
    console.log('🔍 Verifying migration...\n');

    const totalGyms = await Gym.countDocuments();
    const gymsWithRadius = await Gym.countDocuments({
      'location.geofenceRadius': { $exists: true }
    });

    console.log(`📊 Total Gyms: ${totalGyms}`);
    console.log(`📊 Gyms with Geofence Radius: ${gymsWithRadius}`);

    if (totalGyms === gymsWithRadius) {
      console.log('✅ Migration Verified: All gyms have geofenceRadius!\n');
    } else {
      console.log(`⚠️  Warning: ${totalGyms - gymsWithRadius} gyms still missing geofenceRadius\n`);
    }

    // Show sample gyms
    const sampleGyms = await Gym.find()
      .select('gymName location.geofenceRadius location.lat location.lng')
      .limit(5);

    console.log('📋 Sample Gyms:');
    sampleGyms.forEach(gym => {
      console.log(`   - ${gym.gymName}:`);
      console.log(`     Radius: ${gym.location?.geofenceRadius || 'NOT SET'}m`);
      console.log(`     Coords: (${gym.location?.lat || 'N/A'}, ${gym.location?.lng || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ Verification Error:', error);
  }
};

// Rollback function (if needed)
const rollback = async () => {
  try {
    console.log('\n⚠️  Starting Rollback...\n');

    const result = await Gym.updateMany(
      {},
      { $unset: { 'location.geofenceRadius': '' } }
    );

    console.log(`✅ Rolled back ${result.modifiedCount} gyms\n`);

  } catch (error) {
    console.error('❌ Rollback Error:', error);
  }
};

// Execute migration
const run = async () => {
  try {
    await connectDB();

    // Check command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'migrate':
        await migrateGyms();
        await verifyMigration();
        break;

      case 'verify':
        await verifyMigration();
        break;

      case 'rollback':
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        readline.question('⚠️  Are you sure you want to rollback? (yes/no): ', async (answer) => {
          if (answer.toLowerCase() === 'yes') {
            await rollback();
          } else {
            console.log('Rollback cancelled');
          }
          readline.close();
          process.exit(0);
        });
        return; // Don't exit yet, wait for readline

      default:
        await migrateGyms();
        await verifyMigration();
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Migration interrupted. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the script
run();
