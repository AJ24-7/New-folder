const User = require('../models/User');
const { DietPlanTemplate, UserDietSubscription } = require('../models/DietPlan');
const Notification = require('../models/Notification');
const { fetchPexelsImage, getCuratedImage } = require('../utils/pexelsImageFetcher');

// ==================== HELPER FUNCTIONS ====================

/**
 * Enrich diet plan with images from Pexels
 * Fetches cover image for the plan and individual images for meals
 */
async function enrichPlanWithImages(planData) {
  try {
    // 2. Fetch images for all meals in the plan FIRST
    if (planData.meals) {
      const mealTypes = [
        'breakfast',
        'midMorningSnack',
        'lunch',
        'eveningSnack',
        'dinner',
        'postDinner'
      ];

      for (const mealType of mealTypes) {
        if (planData.meals[mealType] && Array.isArray(planData.meals[mealType])) {
          for (const meal of planData.meals[mealType]) {
            // Skip if image already provided
            if (!meal.imageUrl) {
              // Generate search query based on meal name and ingredients
              let searchQuery = meal.name;
              if (meal.ingredients && meal.ingredients.length > 0) {
                // Use first 2 ingredients with meal name for better search
                searchQuery = `${meal.ingredients.slice(0, 2).join(' ')} ${meal.name}`;
              }

              try {
                // Fetch image from Pexels
                const imageUrl = await fetchPexelsImage(searchQuery);
                if (imageUrl) {
                  meal.imageUrl = imageUrl;
                  console.log(`✓ Image fetched for meal: ${meal.name}`);
                } else {
                  console.warn(`Could not fetch image for meal: ${meal.name}`);
                }
              } catch (err) {
                console.error(`Error fetching image for meal ${meal.name}:`, err.message);
              }
            }
          }
        }
      }
    }

    // 1. Set plan cover image based on meals in the plan
    if (!planData.imageUrl) {
      // Try to get cover image based on first meal's ingredients
      let coverImageQuery = null;
      
      if (planData.meals?.breakfast?.[0]) {
        const firstMeal = planData.meals.breakfast[0];
        if (firstMeal.ingredients && firstMeal.ingredients.length > 0) {
          // Use 2-3 ingredients from first meal for cover
          coverImageQuery = `${firstMeal.ingredients.slice(0, 2).join(' ')} healthy meal`;
        }
      }

      // If we have a query from meals, use it; otherwise fall back to curated
      if (coverImageQuery) {
        try {
          const coverImage = await fetchPexelsImage(coverImageQuery);
          if (coverImage) {
            planData.imageUrl = coverImage;
            console.log(`✓ Cover image fetched based on meals: ${coverImageQuery}`);
          } else {
            planData.imageUrl = getCuratedImage(planData, 0);
            console.log(`✓ Using curated cover image (API failed)`);
          }
        } catch (err) {
          planData.imageUrl = getCuratedImage(planData, 0);
          console.log(`✓ Using curated cover image (error: ${err.message})`);
        }
      } else {
        planData.imageUrl = getCuratedImage(planData, 0);
        console.log(`✓ Using curated cover image (no meals found)`);
      }
    }
  } catch (error) {
    console.error('Error enriching plan with images:', error.message);
    // Don't fail the whole operation if image fetching fails
  }
}

// ==================== DIET PLAN TEMPLATES ====================

// Get all diet plan templates with optional filtering
exports.getDietPlanTemplates = async (req, res) => {
  try {
    const { tags, minCalories, maxCalories, mealsPerDay } = req.query;
    
    let query = { isActive: true };
    
    // Filter by tags (can be multiple)
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $all: tagArray };
    }
    
    // Filter by calorie range
    if (minCalories || maxCalories) {
      query.dailyCalories = {};
      if (minCalories) query.dailyCalories.$gte = parseInt(minCalories);
      if (maxCalories) query.dailyCalories.$lte = parseInt(maxCalories);
    }
    
    // Filter by meals per day
    if (mealsPerDay) {
      query.mealsPerDay = parseInt(mealsPerDay);
    }
    
    const plans = await DietPlanTemplate.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    console.error('❌ Error fetching diet plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching diet plans',
      error: error.message
    });
  }
};

// Get single diet plan template by ID
exports.getDietPlanTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await DietPlanTemplate.findById(id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Diet plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('❌ Error fetching diet plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching diet plan',
      error: error.message
    });
  }
};

// Create new diet plan template (Admin only)
exports.createDietPlanTemplate = async (req, res) => {
  try {
    const planData = req.body;
    
    // Add creator ID if admin is authenticated
    if (req.adminId) {
      planData.createdBy = req.adminId;
    }

    // Fetch images for the plan cover and all meals
    await enrichPlanWithImages(planData);
    
    const newPlan = new DietPlanTemplate(planData);
    await newPlan.save();
    
    res.status(201).json({
      success: true,
      message: 'Diet plan template created successfully',
      data: newPlan
    });
  } catch (error) {
    console.error('❌ Error creating diet plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating diet plan',
      error: error.message
    });
  }
};

// Update diet plan template (Admin only)
exports.updateDietPlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedPlan = await DietPlanTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Diet plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Diet plan updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    console.error('❌ Error updating diet plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating diet plan',
      error: error.message
    });
  }
};

// Delete diet plan template (Admin only)
exports.deleteDietPlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting isActive to false
    const deletedPlan = await DietPlanTemplate.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!deletedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Diet plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Diet plan deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting diet plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting diet plan',
      error: error.message
    });
  }
};

// ==================== USER DIET SUBSCRIPTIONS ====================

// Subscribe to a diet plan
exports.subscribeToDietPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const { planTemplateId, customMeals, mealNotifications, duration } = req.body;
    
    // Check if plan template exists
    const planTemplate = await DietPlanTemplate.findById(planTemplateId);
    if (!planTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Diet plan template not found'
      });
    }
    
    // Calculate end date based on duration (default 30 days)
    const startDate = new Date();
    const durationDays = duration || 30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    
    // Check if user already has an active subscription
    const existingSubscription = await UserDietSubscription.findOne({
      userId,
      isActive: true
    });
    
    if (existingSubscription) {
      // Deactivate existing subscription
      existingSubscription.isActive = false;
      await existingSubscription.save();
    }
    
    // Create new subscription
    const subscription = new UserDietSubscription({
      userId,
      planTemplateId,
      customMeals: customMeals || planTemplate.meals,
      mealNotifications: mealNotifications || {},
      startDate,
      endDate
    });
    
    await subscription.save();
    
    // Create initial notification
    await Notification.create({
      userId,
      type: 'diet-subscription',
      title: 'Diet Plan Activated! 🥗',
      message: `Your ${planTemplate.name} diet plan has been activated. Get ready to achieve your fitness goals!`,
      priority: 'high',
      metadata: {
        subscriptionId: subscription._id,
        planName: planTemplate.name
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to diet plan',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Error subscribing to diet plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error subscribing to diet plan',
      error: error.message
    });
  }
};

// Get user's active diet subscription
exports.getUserActiveDietSubscription = async (req, res) => {
  try {
    const userId = req.userId;
    
    const subscription = await UserDietSubscription.findOne({
      userId,
      isActive: true
    }).populate('planTemplateId', 'name description tags dailyCalories dailyProtein dailyCarbs dailyFats');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active diet subscription found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('❌ Error fetching active subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active subscription',
      error: error.message
    });
  }
};

// Update user's diet subscription (modify meals or settings)
exports.updateUserDietSubscription = async (req, res) => {
  try {
    const userId = req.userId;
    const { subscriptionId } = req.params;
    const { customMeals, mealNotifications } = req.body;
    
    const subscription = await UserDietSubscription.findOne({
      _id: subscriptionId,
      userId
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Update custom meals if provided
    if (customMeals) {
      subscription.customMeals = customMeals;
    }
    
    // Update meal notification settings if provided
    if (mealNotifications) {
      subscription.mealNotifications = {
        ...subscription.mealNotifications.toObject(),
        ...mealNotifications
      };
    }
    
    await subscription.save();
    
    res.status(200).json({
      success: true,
      message: 'Diet subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
};

// Cancel diet subscription
exports.cancelDietSubscription = async (req, res) => {
  try {
    const userId = req.userId;
    const { subscriptionId } = req.params;
    
    const subscription = await UserDietSubscription.findOne({
      _id: subscriptionId,
      userId
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    subscription.isActive = false;
    await subscription.save();
    
    // Create cancellation notification
    await Notification.create({
      userId,
      type: 'diet-cancellation',
      title: 'Diet Plan Cancelled',
      message: 'Your diet plan subscription has been cancelled.',
      priority: 'normal'
    });
    
    res.status(200).json({
      success: true,
      message: 'Diet subscription cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

// Get all user's diet subscriptions (history)
exports.getUserDietSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.userId;
    
    const subscriptions = await UserDietSubscription.find({ userId })
      .populate('planTemplateId', 'name description')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('❌ Error fetching subscription history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription history',
      error: error.message
    });
  }
};

// ==================== MEAL NOTIFICATIONS ====================

// This will be called by a scheduler (e.g., cron job) to send meal notifications
exports.sendMealNotifications = async () => {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Find all active subscriptions with notifications enabled
    const subscriptions = await UserDietSubscription.find({
      isActive: true,
      'mealNotifications.enabled': true
    }).populate('planTemplateId', 'name');
    
    const mealTypes = ['breakfast', 'midMorningSnack', 'lunch', 'eveningSnack', 'dinner', 'postDinner'];
    const mealEmojis = {
      breakfast: '🍳',
      midMorningSnack: '🍎',
      lunch: '🍱',
      eveningSnack: '☕',
      dinner: '🍽️',
      postDinner: '🥛'
    };
    
    for (const subscription of subscriptions) {
      for (const mealType of mealTypes) {
        const mealTime = subscription.mealNotifications[`${mealType}Time`];
        
        if (mealTime === currentTime) {
          const mealName = mealType.replace(/([A-Z])/g, ' $1').trim();
          const capitalizedMealName = mealName.charAt(0).toUpperCase() + mealName.slice(1);
          
          // Get meal details from custom meals or template
          let mealDetails = null;
          if (subscription.customMeals && subscription.customMeals[mealType] && subscription.customMeals[mealType].length > 0) {
            mealDetails = subscription.customMeals[mealType][0];
          } else if (subscription.planTemplateId.meals && subscription.planTemplateId.meals[mealType] && subscription.planTemplateId.meals[mealType].length > 0) {
            mealDetails = subscription.planTemplateId.meals[mealType][0];
          }
          
          const message = mealDetails 
            ? `Time for ${capitalizedMealName}! ${mealEmojis[mealType]}\n${mealDetails.name} - ${mealDetails.calories} cal`
            : `Time for your ${capitalizedMealName}! ${mealEmojis[mealType]}`;
          
          await Notification.create({
            userId: subscription.userId,
            type: 'meal-reminder',
            title: `${capitalizedMealName} Time!`,
            message,
            priority: 'normal',
            metadata: {
              subscriptionId: subscription._id,
              mealType,
              mealDetails
            }
          });
        }
      }
    }
    
    console.log('✅ Meal notifications processed');
  } catch (error) {
    console.error('❌ Error sending meal notifications:', error);
  }
};

// Legacy support for old diet plan model
exports.saveDietPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const { meals } = req.body;

    if (!meals) {
      return res.status(400).json({ message: 'Meals data missing' });
    }

    // This is legacy - redirect to new subscription system
    return res.status(400).json({
      message: 'Please use the new diet subscription system',
      redirect: '/api/diet/subscribe'
    });

  } catch (error) {
    console.error('❌ Error saving diet plan:', error);
    return res.status(500).json({ message: 'Error saving diet plan', error: error.message });
  }
};

exports.getUserDietPlan = async (req, res) => {
  try {
    // Redirect to new active subscription endpoint
    return res.status(400).json({
      message: 'Please use the new diet subscription system',
      redirect: '/api/diet/subscription/active'
    });
  } catch (err) {
    console.error("Error fetching diet plan:", err);
    res.status(500).json({ message: "Server error" });
  }
};
