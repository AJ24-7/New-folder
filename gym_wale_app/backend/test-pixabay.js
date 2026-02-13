/**
 * Test script for Pixabay Workout Integration
 * Run: node test-pixabay.js
 */

require('dotenv').config();

const { fetchWorkoutImage, fetchBatchWorkoutImages, getCacheStats } = require('./services/pixabayService');

async function testSingleImage() {
  console.log('\n🧪 Testing Single Image Fetch...');
  console.log('='.repeat(50));
  
  const testExercises = [
    { name: 'Push-ups', muscleGroup: 'chest' },
    { name: 'Squats', muscleGroup: 'legs' },
    { name: 'Plank', muscleGroup: 'core' },
    { name: 'Lunges', muscleGroup: 'legs' },
    { name: 'Burpees', muscleGroup: 'full-body' }
  ];

  for (const exercise of testExercises) {
    console.log(`\n📸 Fetching image for: ${exercise.name} (${exercise.muscleGroup})`);
    
    const imageData = await fetchWorkoutImage(exercise.name, exercise.muscleGroup);
    
    if (imageData) {
      console.log('✅ Success!');
      console.log(`   URL: ${imageData.url.substring(0, 60)}...`);
      console.log(`   Tags: ${imageData.tags}`);
      console.log(`   Photographer: ${imageData.photographer}`);
    } else {
      console.log('❌ No image found');
    }
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testBatchFetch() {
  console.log('\n🧪 Testing Batch Image Fetch...');
  console.log('='.repeat(50));
  
  const exercises = [
    { name: 'Deadlifts', muscleGroup: 'back' },
    { name: 'Bench Press', muscleGroup: 'chest' },
    { name: 'Shoulder Press', muscleGroup: 'shoulders' },
    { name: 'Bicep Curls', muscleGroup: 'arms' },
    { name: 'Tricep Dips', muscleGroup: 'arms' }
  ];

  console.log(`\n📦 Fetching images for ${exercises.length} exercises...`);
  
  const imageMap = await fetchBatchWorkoutImages(exercises);
  
  console.log(`\n✅ Fetched ${imageMap.size} images`);
  
  imageMap.forEach((imageData, exerciseName) => {
    console.log(`\n   ${exerciseName}:`);
    console.log(`   URL: ${imageData.url.substring(0, 60)}...`);
  });
}

async function testCaching() {
  console.log('\n🧪 Testing Cache Functionality...');
  console.log('='.repeat(50));
  
  console.log('\n📊 Initial cache stats:');
  console.log(getCacheStats());
  
  // Fetch same image twice
  console.log('\n📸 First fetch (should hit API)...');
  const start1 = Date.now();
  await fetchWorkoutImage('Push-ups', 'chest');
  const time1 = Date.now() - start1;
  console.log(`   Time: ${time1}ms`);
  
  console.log('\n📸 Second fetch (should use cache)...');
  const start2 = Date.now();
  await fetchWorkoutImage('Push-ups', 'chest');
  const time2 = Date.now() - start2;
  console.log(`   Time: ${time2}ms`);
  
  console.log(`\n⚡ Cache speedup: ${time1 - time2}ms faster`);
  
  console.log('\n📊 Final cache stats:');
  console.log(getCacheStats());
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  PIXABAY WORKOUT INTEGRATION TEST SUITE');
  console.log('='.repeat(60));
  
  try {
    await testSingleImage();
    await testBatchFetch();
    await testCaching();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  }
}

// Run tests
runAllTests();
