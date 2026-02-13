const mongoose = require('mongoose');

// Detailed meal schema with nutrition information
const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  time: String, // e.g., "08:00 AM"
  calories: { type: Number, required: true },
  protein: Number, // in grams
  carbs: Number, // in grams
  fats: Number, // in grams
  fiber: Number,
  ingredients: [String],
  preparation: String,
  imageUrl: String
});

// Master diet plan template schema (created by admins/system)
const dietPlanTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  tags: [{
    type: String,
    enum: [
      // Budget tags
      'budget-1000', 'budget-2000', 'budget-3000', 'budget-4000', 'budget-5000',
      // Diet type tags
      'vegetarian', 'non-vegetarian', 'vegan', 'eggetarian',
      // Nutrition focus
      'high-protein', 'low-carb', 'balanced', 'keto', 'paleo',
      // Goal tags
      'weight-loss', 'muscle-gain', 'maintenance', 'athletic-performance',
      // Special tags
      'gluten-free', 'dairy-free', 'diabetic-friendly', 'heart-healthy'
    ]
  }],
  
  // Nutrition summary
  dailyCalories: { type: Number, required: true },
  dailyProtein: Number,
  dailyCarbs: Number,
  dailyFats: Number,
  dailyFiber: Number,
  
  // Meals per day
  mealsPerDay: { type: Number, default: 5 },
  
  // Meal plan structure
  meals: {
    breakfast: [mealSchema],
    midMorningSnack: [mealSchema],
    lunch: [mealSchema],
    eveningSnack: [mealSchema],
    dinner: [mealSchema],
    postDinner: [mealSchema]
  },
  
  // Metadata
  duration: { type: String, default: '30 days' },
  difficulty: { type: String, enum: ['easy', 'moderate', 'challenging'], default: 'moderate' },
  imageUrl: String, // Plan thumbnail image
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

// User's subscribed/customized diet plan
const userDietSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'DietPlanTemplate', required: true },
  
  // User's customized meals (if they modified the template)
  customMeals: {
    breakfast: [mealSchema],
    midMorningSnack: [mealSchema],
    lunch: [mealSchema],
    eveningSnack: [mealSchema],
    dinner: [mealSchema],
    postDinner: [mealSchema]
  },
  
  // Notification settings for meal reminders
  mealNotifications: {
    enabled: { type: Boolean, default: true },
    breakfastTime: { type: String, default: '08:00' },
    midMorningSnackTime: { type: String, default: '10:30' },
    lunchTime: { type: String, default: '13:00' },
    eveningSnackTime: { type: String, default: '17:00' },
    dinnerTime: { type: String, default: '20:00' },
    postDinnerTime: { type: String, default: '22:00' }
  },
  
  // Subscription details
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  isActive: { type: Boolean, default: true },
  
  // Progress tracking
  completedDays: { type: Number, default: 0 },
  skippedMeals: { type: Number, default: 0 }
}, { timestamps: true });

// Indexes
dietPlanTemplateSchema.index({ tags: 1, isActive: 1 });
dietPlanTemplateSchema.index({ dailyCalories: 1 });
userDietSubscriptionSchema.index({ userId: 1, isActive: 1 });

const DietPlanTemplate = mongoose.model('DietPlanTemplate', dietPlanTemplateSchema);
const UserDietSubscription = mongoose.model('UserDietSubscription', userDietSubscriptionSchema);

module.exports = {
  DietPlanTemplate,
  UserDietSubscription
};
