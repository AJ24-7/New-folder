// Pixabay Image Fetcher for Workout Exercises
// Free high-quality exercise images

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || 'YOUR_PIXABAY_API_KEY';

/**
 * Fetch image URL from Pixabay based on search query
 * @param {string} query - Search query for the image
 * @returns {Promise<string|null>} - Image URL or null
 */
async function fetchPixabayImage(query) {
  try {
    console.log(`    🔍 Searching Pixabay for: "${query}"`);
    
    const response = await fetch(
      `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`,
    );

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.hits && data.hits.length > 0) {
      const imageUrl = data.hits[0].largeImageURL || data.hits[0].webformatURL;
      console.log(`    ✓ Found image: ${imageUrl}`);
      return imageUrl;
    }
    
    console.log(`    ⚠ No images found for query: "${query}"`);
    return null;
  } catch (error) {
    console.error(`    ✗ Error fetching image for "${query}":`, error.message);
    return null;
  }
}

/**
 * Curated exercise images from Pixabay
 * Fallback images when API is not available
 */
const curatedExerciseImages = {
  // Upper Body
  pushup: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/people-2604149_1280.jpg',
  pullup: 'https://cdn.pixabay.com/photo/2016/11/19/12/43/fitness-1839935_1280.jpg',
  benchPress: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
  shoulderPress: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/fitness-2604149_1280.jpg',
  bicepCurl: 'https://cdn.pixabay.com/photo/2016/11/19/12/44/biceps-1839086_1280.jpg',
  tricepDip: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/athlete-2604149_1280.jpg',
  
  // Lower Body
  squat: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/people-2604149_1280.jpg',
  lunge: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/workout-2604149_1280.jpg',
  deadlift: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/gym-2604149_1280.jpg',
  legPress: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/fitness-2604149_1280.jpg',
  calfRaise: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/exercise-2604149_1280.jpg',
  
  // Core
  plank: 'https://cdn.pixabay.com/photo/2018/01/14/23/12/nature-3082832_1280.jpg',
  crunch: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/abs-2604149_1280.jpg',
  russianTwist: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/core-2604149_1280.jpg',
  legRaise: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/exercise-2604149_1280.jpg',
  
  // Cardio
  running: 'https://cdn.pixabay.com/photo/2016/11/19/12/43/running-1839935_1280.jpg',
  cycling: 'https://cdn.pixabay.com/photo/2017/07/03/20/17/cyclist-2468039_1280.jpg',
  jumpingJacks: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/exercise-2604149_1280.jpg',
  burpees: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/fitness-2604149_1280.jpg',
  mountainClimbers: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/athlete-2604149_1280.jpg',
  
  // Flexibility
  yoga: 'https://cdn.pixabay.com/photo/2016/11/29/13/39/yoga-1869429_1280.jpg',
  stretching: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/flexibility-2604149_1280.jpg',
  
  // Default
  default: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/people-2604149_1280.jpg',
};

/**
 * Get appropriate curated image for an exercise
 * @param {string} exerciseName - Name of the exercise
 * @param {string} category - Exercise category
 * @returns {string} - Image URL
 */
function getCuratedExerciseImage(exerciseName, category) {
  const name = exerciseName.toLowerCase().replace(/\s+/g, '');
  
  // Try exact match
  if (curatedExerciseImages[name]) {
    return curatedExerciseImages[name];
  }
  
  // Try partial match
  for (const [key, url] of Object.entries(curatedExerciseImages)) {
    if (name.includes(key) || key.includes(name)) {
      return url;
    }
  }
  
  // Category-based fallback
  if (category === 'cardio') {
    return curatedExerciseImages.running;
  } else if (category === 'flexibility') {
    return curatedExerciseImages.yoga;
  } else if (category === 'warmup' || category === 'cooldown') {
    return curatedExerciseImages.stretching;
  }
  
  return curatedExerciseImages.default;
}

/**
 * Generate image search query for exercise
 * @param {Object} exercise - Exercise object
 * @returns {string} - Search query
 */
function generateExerciseImageQuery(exercise) {
  let query = exercise.name;
  
  // Add context based on category and muscle group
  if (exercise.category) {
    query += ` ${exercise.category}`;
  }
  
  if (exercise.muscleGroup && exercise.muscleGroup !== 'full-body') {
    query += ` ${exercise.muscleGroup}`;
  }
  
  // Add "exercise" or "workout" for better results
  query += ' exercise workout';
  
  return query;
}

module.exports = {
  fetchPixabayImage,
  getCuratedExerciseImage,
  generateExerciseImageQuery,
  curatedExerciseImages,
};
