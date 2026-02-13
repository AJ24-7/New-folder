const axios = require('axios');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const PIXABAY_API_URL = 'https://pixabay.com/api/';

// Cache to avoid duplicate API calls
const imageCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch workout illustration from Pixabay API
 * @param {string} exerciseName - Name of the exercise/workout
 * @param {string} muscleGroup - Optional muscle group for better results
 * @returns {Promise<Object|null>} - Image data or null if not found
 */
async function fetchWorkoutImage(exerciseName, muscleGroup = '') {
  try {
    if (!PIXABAY_API_KEY) {
      console.error('Pixabay API key not found in environment variables');
      return null;
    }

    // Create cache key
    const cacheKey = `${exerciseName}-${muscleGroup}`.toLowerCase();
    
    // Check cache first
    const cachedData = imageCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Using cached image for: ${exerciseName}`);
      return cachedData.data;
    }

    // Build search query with exercise name and context
    let searchQuery = `${exerciseName} exercise workout`;
    if (muscleGroup && muscleGroup !== 'full-body') {
      searchQuery += ` ${muscleGroup}`;
    }

    console.log(`Fetching Pixabay image for: ${searchQuery}`);

    const response = await axios.get(PIXABAY_API_URL, {
      params: {
        key: PIXABAY_API_KEY,
        q: searchQuery,
        image_type: 'photo', // or 'illustration' or 'vector'
        category: 'sports',
        per_page: 5,
        safesearch: true,
        order: 'popular',
        min_width: 640,
        min_height: 480,
      },
      timeout: 5000, // 5 second timeout
    });

    if (response.data.hits && response.data.hits.length > 0) {
      const imageData = {
        url: response.data.hits[0].webformatURL,
        largeUrl: response.data.hits[0].largeImageURL,
        previewUrl: response.data.hits[0].previewURL,
        tags: response.data.hits[0].tags,
        photographer: response.data.hits[0].user,
        photographerUrl: response.data.hits[0].userImageURL,
      };

      // Cache the result
      imageCache.set(cacheKey, {
        data: imageData,
        timestamp: Date.now(),
      });

      return imageData;
    }

    console.log(`No Pixabay image found for: ${exerciseName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching Pixabay image for ${exerciseName}:`, error.message);
    return null;
  }
}

/**
 * Fetch images for multiple exercises in batch
 * @param {Array} exercises - Array of exercise objects with name and muscleGroup
 * @returns {Promise<Map>} - Map of exercise names to image data
 */
async function fetchBatchWorkoutImages(exercises) {
  const imageMap = new Map();
  
  // Process in batches to avoid rate limiting (100 requests/minute)
  const batchSize = 10;
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);
    
    const promises = batch.map(async (exercise) => {
      const imageData = await fetchWorkoutImage(exercise.name, exercise.muscleGroup);
      if (imageData) {
        imageMap.set(exercise.name, imageData);
      }
    });

    await Promise.all(promises);
    
    // Add delay between batches (1 second) to respect rate limits
    if (i + batchSize < exercises.length) {
      await delay(1000);
    }
  }

  return imageMap;
}

/**
 * Get fallback image URL for exercises without Pixabay images
 * @param {string} muscleGroup - Muscle group for fallback
 * @returns {string} - Placeholder image URL
 */
function getFallbackImage(muscleGroup) {
  const fallbackImages = {
    chest: 'https://via.placeholder.com/640x480/4A90E2/ffffff?text=Chest+Exercise',
    back: 'https://via.placeholder.com/640x480/50C878/ffffff?text=Back+Exercise',
    legs: 'https://via.placeholder.com/640x480/FF6B6B/ffffff?text=Leg+Exercise',
    arms: 'https://via.placeholder.com/640x480/FFD93D/ffffff?text=Arm+Exercise',
    shoulders: 'https://via.placeholder.com/640x480/A78BFA/ffffff?text=Shoulder+Exercise',
    core: 'https://via.placeholder.com/640x480/FB923C/ffffff?text=Core+Exercise',
    'full-body': 'https://via.placeholder.com/640x480/6366F1/ffffff?text=Workout+Exercise',
  };

  return fallbackImages[muscleGroup] || fallbackImages['full-body'];
}

/**
 * Clear image cache
 */
function clearCache() {
  imageCache.clear();
  console.log('Pixabay image cache cleared');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: imageCache.size,
    entries: Array.from(imageCache.keys()),
  };
}

module.exports = {
  fetchWorkoutImage,
  fetchBatchWorkoutImages,
  getFallbackImage,
  clearCache,
  getCacheStats,
};
