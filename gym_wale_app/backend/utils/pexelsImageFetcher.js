// Pexels Image Fetcher Utility
// Get free images from Pexels API for diet plans

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'YOUR_PEXELS_API_KEY';

/**
 * Fetch image URL from Pexels based on search query
 * @param {string} query - Search query for the image
 * @returns {Promise<string>} - Image URL
 */
async function fetchPexelsImage(query) {
  try {
    console.log(`    🔍 Searching Pexels for: "${query}"`);
    
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      console.log(`    ✓ Found image: ${data.photos[0].src.large}`);
      return data.photos[0].src.large; // Use large size for better quality
    }
    
    console.log(`    ⚠ No images found for query: "${query}"`);
    return null;
  } catch (error) {
    console.error(`    ✗ Error fetching image for "${query}":`, error.message);
    return null;
  }
}

/**
 * Get curated diet-specific image URLs from Pexels
 * These are pre-selected quality images for different diet types
 */
const dietImageQueries = {
  // Weight Loss
  'Budget Vegetarian Weight Loss': 'healthy vegetable salad bowl',
  'Quick Weight Loss': 'fresh green salad diet',
  'Low-Carb Vegetarian': 'low carb vegetables cauliflower',
  
  // Muscle Gain
  'Budget High Protein Veg': 'protein rich food paneer tofu',
  'Eggetarian Muscle Builder': 'boiled eggs protein breakfast',
  'Budget Muscle Gain': 'muscle building food rice chicken',
  'High Calorie Bulking': 'high calorie meal steak rice',
  
  // Non-Vegetarian
  'Balanced Non-Veg Plan': 'grilled chicken breast vegetables',
  'Flexible Dieting Plan': 'balanced meal chicken rice vegetables',
  'Mediterranean Balanced': 'mediterranean fish seafood salad',
  'Heart-Healthy Plan': 'grilled salmon omega 3',
  
  // Keto
  'Keto Fat Loss Plan': 'keto diet avocado eggs bacon',
  'Keto Vegetarian': 'keto vegetarian cheese nuts avocado',
  
  // Athletic & Performance
  'Athletic Performance Plan': 'athlete meal prep high protein',
  
  // Vegan
  'Premium Vegan Plan': 'vegan buddha bowl quinoa vegetables',
  
  // Balanced & Maintenance
  'Balanced Vegetarian': 'indian vegetarian thali meal',
  'Student Special Budget': 'simple healthy meal dal rice',
  'Diabetic-Friendly Plan': 'diabetic friendly low sugar meal',
};

/**
 * Generate image search query based on diet plan properties
 * @param {Object} plan - Diet plan object
 * @returns {string} - Search query for Pexels
 */
function generateImageQuery(plan) {
  // If we have a predefined query, use it
  if (dietImageQueries[plan.name]) {
    return dietImageQueries[plan.name];
  }

  // Otherwise, generate based on plan characteristics
  let query = '';

  // Determine diet type
  if (plan.tags.includes('vegetarian')) {
    query += 'vegetarian ';
  } else if (plan.tags.includes('vegan')) {
    query += 'vegan ';
  } else if (plan.tags.includes('non-vegetarian')) {
    query += 'chicken fish ';
  } else if (plan.tags.includes('eggetarian')) {
    query += 'eggs ';
  }

  // Add goal-specific terms
  if (plan.tags.includes('weight-loss')) {
    query += 'healthy salad diet ';
  } else if (plan.tags.includes('muscle-gain')) {
    query += 'protein high calorie meal ';
  } else if (plan.tags.includes('keto')) {
    query += 'keto low carb high fat ';
  } else {
    query += 'healthy meal ';
  }

  // Add meal type based on first meal
  if (plan.meals && plan.meals.breakfast && plan.meals.breakfast[0]) {
    const mainIngredient = plan.meals.breakfast[0].ingredients?.[0];
    if (mainIngredient) {
      query += mainIngredient.toLowerCase();
    }
  }

  return query.trim() || 'healthy food meal';
}

/**
 * Curated free-to-use Pexels image URLs for different diet categories
 * These are backup images if API is not available
 */
const curatedDietImages = {
  // Weight Loss (Fresh, Green, Salads)
  weightLoss: [
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1095550/pexels-photo-1095550.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Muscle Gain (Protein Rich)
  muscleGain: [
    'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1630309/pexels-photo-1630309.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Vegetarian (Indian Style)
  vegetarian: [
    'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/4331489/pexels-photo-4331489.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Non-Vegetarian (Chicken, Fish)
  nonVegetarian: [
    'https://images.pexels.com/photos/1640771/pexels-photo-1640771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1352270/pexels-photo-1352270.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Keto (Avocado, Eggs, High Fat)
  keto: [
    'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1893556/pexels-photo-1893556.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Vegan (Plant-based bowls)
  vegan: [
    'https://images.pexels.com/photos/1640776/pexels-photo-1640776.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1211887/pexels-photo-1211887.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Eggetarian (Egg dishes)
  eggetarian: [
    'https://images.pexels.com/photos/1640778/pexels-photo-1640778.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Balanced/Maintenance
  balanced: [
    'https://images.pexels.com/photos/1640779/pexels-photo-1640779.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1410236/pexels-photo-1410236.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Athletic/Performance
  athletic: [
    'https://images.pexels.com/photos/1640780/pexels-photo-1640780.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1602726/pexels-photo-1602726.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  
  // Budget
  budget: [
    'https://images.pexels.com/photos/1640781/pexels-photo-1640781.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
};

/**
 * Get appropriate curated image for a diet plan
 * @param {Object} plan - Diet plan object
 * @param {number} index - Index for variety
 * @returns {string} - Image URL
 */
function getCuratedImage(plan, index = 0) {
  let category = 'balanced';
  
  // Determine primary category
  if (plan.tags.includes('weight-loss')) {
    category = 'weightLoss';
  } else if (plan.tags.includes('muscle-gain')) {
    category = 'muscleGain';
  } else if (plan.tags.includes('keto')) {
    category = 'keto';
  } else if (plan.tags.includes('vegan')) {
    category = 'vegan';
  } else if (plan.tags.includes('eggetarian')) {
    category = 'eggetarian';
  } else if (plan.tags.includes('non-vegetarian')) {
    category = 'nonVegetarian';
  } else if (plan.tags.includes('vegetarian')) {
    category = 'vegetarian';
  } else if (plan.tags.includes('athletic-performance')) {
    category = 'athletic';
  } else if (plan.tags.some(tag => tag.startsWith('budget-'))) {
    category = 'budget';
  }
  
  const images = curatedDietImages[category];
  return images[index % images.length];
}

module.exports = {
  fetchPexelsImage,
  generateImageQuery,
  getCuratedImage,
  curatedDietImages,
};
