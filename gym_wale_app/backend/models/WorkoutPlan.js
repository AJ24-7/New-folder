const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'warmup', 'cooldown'],
    default: 'strength',
  },
  muscleGroup: {
    type: String,
    enum: ['chest', 'back', 'legs', 'arms', 'shoulders', 'core', 'full-body'],
    default: 'full-body',
  },
  sets: {
    type: Number,
    default: 3,
  },
  reps: {
    type: Number,
    default: 10,
  },
  duration: {
    type: Number, // in seconds for timed exercises
  },
  restBetweenSets: {
    type: Number,
    default: 60, // in seconds
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  imageSource: {
    type: String,
    enum: ['pixabay', 'cloudinary', 'custom', 'placeholder'],
    default: 'placeholder',
  },
  pixabayData: {
    largeUrl: String,
    previewUrl: String,
    tags: String,
    photographer: String,
  },
  videoUrl: {
    type: String,
  },
  instructions: [{
    type: String,
  }],
  tips: [{
    type: String,
  }],
  equipment: {
    type: String,
    enum: ['none', 'dumbbells', 'barbell', 'resistance-bands', 'machine', 'bodyweight', 'kettlebell', 'other'],
    default: 'bodyweight',
  },
});

const workoutDaySchema = new mongoose.Schema({
  dayName: {
    type: String,
    required: true,
  },
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 7,
  },
  focus: {
    type: String,
    required: true, // e.g., "Upper Body", "Lower Body", "Cardio", "Rest"
  },
  exercises: [exerciseSchema],
  estimatedDuration: {
    type: Number, // in minutes
    default: 45,
  },
  notes: {
    type: String,
  },
});

const workoutPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
  },
  bmiRange: {
    type: String,
    enum: ['underweight', 'normal', 'overweight', 'obese', 'all'],
    default: 'all',
  },
  durationWeeks: {
    type: Number,
    default: 4,
  },
  goals: [{
    type: String,
    enum: ['weight-loss', 'muscle-gain', 'strength', 'endurance', 'flexibility', 'general-fitness'],
  }],
  weeklySchedule: [workoutDaySchema],
  imageUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
workoutPlanSchema.index({ level: 1, bmiRange: 1 });
workoutPlanSchema.index({ goals: 1 });

const completedWorkoutSchema = new mongoose.Schema({
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  exerciseName: {
    type: String,
  },
  completedDate: {
    type: Date,
    default: Date.now,
  },
  setsCompleted: {
    type: Number,
    default: 0,
  },
  repsCompleted: {
    type: Number,
    default: 0,
  },
  durationCompleted: {
    type: Number, // in seconds
  },
  notes: {
    type: String,
  },
  caloriesBurned: {
    type: Number,
  },
});

const userWorkoutProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workoutPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutPlan',
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  completedWorkouts: [completedWorkoutSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  progress: {
    type: Number,
    default: 0, // 0-100
  },
  totalWorkouts: {
    type: Number,
    default: 0,
  },
  completedCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
userWorkoutProgressSchema.index({ userId: 1, isActive: 1 });

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
const UserWorkoutProgress = mongoose.model('UserWorkoutProgress', userWorkoutProgressSchema);

module.exports = { WorkoutPlan, UserWorkoutProgress };
