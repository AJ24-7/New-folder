const { WorkoutPlan, UserWorkoutProgress } = require('../models/WorkoutPlan');
const { fetchWorkoutImage, fetchBatchWorkoutImages, getFallbackImage } = require('../services/pixabayService');

// Helper function to enrich exercises with Pixabay images
async function enrichExercisesWithImages(exercises) {
  const enrichedExercises = await Promise.all(exercises.map(async (exercise) => {
    // Skip if exercise already has an image from a valid source
    if (exercise.imageUrl && exercise.imageSource && exercise.imageSource !== 'placeholder') {
      return exercise;
    }

    // Fetch image from Pixabay
    const imageData = await fetchWorkoutImage(exercise.name, exercise.muscleGroup);
    
    if (imageData) {
      exercise.imageUrl = imageData.url;
      exercise.imageSource = 'pixabay';
      exercise.pixabayData = {
        largeUrl: imageData.largeUrl,
        previewUrl: imageData.previewUrl,
        tags: imageData.tags,
        photographer: imageData.photographer,
      };
    } else {
      // Use fallback if no Pixabay image found
      exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
      exercise.imageSource = 'placeholder';
    }

    return exercise;
  }));

  return enrichedExercises;
}

// Helper function to enrich workout plans with images
async function enrichWorkoutPlanWithImages(plan) {
  if (!plan || !plan.weeklySchedule) return plan;

  const planObj = plan.toObject ? plan.toObject() : plan;

  for (let i = 0; i < planObj.weeklySchedule.length; i++) {
    if (planObj.weeklySchedule[i].exercises && planObj.weeklySchedule[i].exercises.length > 0) {
      planObj.weeklySchedule[i].exercises = await enrichExercisesWithImages(
        planObj.weeklySchedule[i].exercises
      );
    }
  }

  return planObj;
}

// Get all workout plans
exports.getWorkoutPlans = async (req, res) => {
  try {
    const { includeImages } = req.query;
    const plans = await WorkoutPlan.find({ isActive: true })
      .sort({ createdAt: -1 });

    // Enrich with Pixabay images if requested
    if (includeImages === 'true') {
      const enrichedPlans = await Promise.all(
        plans.map(plan => enrichWorkoutPlanWithImages(plan))
      );
      
      return res.json({
        success: true,
        plans: enrichedPlans,
      });
    }

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout plans',
      error: error.message,
    });
  }
};

// Get recommended workout plans based on BMI category and fitness level
exports.getRecommendedPlans = async (req, res) => {
  try {
    const { bmiCategory, level, includeImages } = req.query;

    if (!bmiCategory || !level) {
      return res.status(400).json({
        success: false,
        message: 'BMI category and fitness level are required',
      });
    }

    // Find plans matching the criteria or plans suitable for all BMI ranges
    const plans = await WorkoutPlan.find({
      isActive: true,
      level,
      $or: [
        { bmiRange: bmiCategory },
        { bmiRange: 'all' }
      ]
    }).sort({ createdAt: -1 });

    // Enrich with Pixabay images if requested
    if (includeImages === 'true') {
      const enrichedPlans = await Promise.all(
        plans.map(plan => enrichWorkoutPlanWithImages(plan))
      );
      
      return res.json({
        success: true,
        plans: enrichedPlans,
      });
    }

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Error fetching recommended plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended plans',
      error: error.message,
    });
  }
};

// Get workout plan by ID
exports.getWorkoutPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeImages } = req.query;

    const plan = await WorkoutPlan.findById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found',
      });
    }

    // Enrich with Pixabay images if requested
    if (includeImages === 'true') {
      const enrichedPlan = await enrichWorkoutPlanWithImages(plan);
      
      return res.json({
        success: true,
        plan: enrichedPlan,
      });
    }

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout plan',
      error: error.message,
    });
  }
};

// Start a workout plan for a user
exports.startWorkoutPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Workout plan ID is required',
      });
    }

    // Check if plan exists
    const plan = await WorkoutPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found',
      });
    }

    // Deactivate any existing active workout plans for this user
    await UserWorkoutProgress.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Calculate total workouts
    const totalWorkouts = plan.weeklySchedule.reduce((total, day) => {
      return total + day.exercises.length;
    }, 0);

    // Create new progress entry
    const progress = new UserWorkoutProgress({
      userId,
      workoutPlanId: planId,
      startDate: new Date(),
      isActive: true,
      totalWorkouts: totalWorkouts * plan.durationWeeks,
      completedCount: 0,
      progress: 0,
    });

    await progress.save();

    // Populate the workout plan details
    const populatedProgress = await UserWorkoutProgress.findById(progress._id)
      .populate('workoutPlanId');

    res.status(201).json({
      success: true,
      message: 'Workout plan started successfully',
      progress: populatedProgress,
    });
  } catch (error) {
    console.error('Error starting workout plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start workout plan',
      error: error.message,
    });
  }
};

// Get user's workout progress
exports.getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progress = await UserWorkoutProgress.findOne({
      userId,
      isActive: true,
    }).populate('workoutPlanId');

    if (!progress) {
      return res.json({
        success: true,
        progress: null,
        message: 'No active workout plan',
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user progress',
      error: error.message,
    });
  }
};

// Mark exercise as completed
exports.completeExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      exerciseId,
      setsCompleted,
      repsCompleted,
      durationCompleted,
      notes,
    } = req.body;

    // Find active progress
    const progress = await UserWorkoutProgress.findOne({
      userId,
      isActive: true,
    }).populate('workoutPlanId');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No active workout plan found',
      });
    }

    // Find the exercise in the workout plan
    let exerciseName = 'Unknown Exercise';
    if (progress.workoutPlanId && progress.workoutPlanId.weeklySchedule) {
      for (const day of progress.workoutPlanId.weeklySchedule) {
        const exercise = day.exercises.find(ex => ex._id.toString() === exerciseId);
        if (exercise) {
          exerciseName = exercise.name;
          break;
        }
      }
    }

    // Calculate calories burned (rough estimate)
    const caloriesBurned = Math.round((setsCompleted * repsCompleted * 0.5) + (durationCompleted || 0) * 0.1);

    // Add completed workout
    progress.completedWorkouts.push({
      exerciseId,
      exerciseName,
      completedDate: new Date(),
      setsCompleted,
      repsCompleted,
      durationCompleted,
      notes,
      caloriesBurned,
    });

    // Update progress
    progress.completedCount += 1;
    progress.progress = Math.min(100, (progress.completedCount / progress.totalWorkouts) * 100);

    await progress.save();

    res.json({
      success: true,
      message: 'Exercise completed successfully',
      progress,
    });
  } catch (error) {
    console.error('Error completing exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete exercise',
      error: error.message,
    });
  }
};

// Get all user workout history
exports.getUserWorkoutHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await UserWorkoutProgress.find({ userId })
      .populate('workoutPlanId')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Error fetching workout history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout history',
      error: error.message,
    });
  }
};

// Seed workout plans (for development/testing)
exports.seedWorkoutPlans = async (req, res) => {
  try {
    // Check if plans already exist
    const existingPlans = await WorkoutPlan.countDocuments();
    if (existingPlans > 0) {
      return res.json({
        success: true,
        message: 'Workout plans already exist',
        count: existingPlans,
      });
    }

    console.log('🎨 Seeding workout plans with Pixabay images...');

    const samplePlans = [
      {
        name: 'Beginner Full Body Workout',
        description: 'Perfect for those starting their fitness journey. Build foundational strength with basic exercises.',
        level: 'beginner',
        bmiRange: 'all',
        durationWeeks: 4,
        goals: ['general-fitness', 'strength'],
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
        weeklySchedule: [
          {
            dayName: 'Monday',
            dayNumber: 1,
            focus: 'Full Body Strength',
            estimatedDuration: 45,
            exercises: [
              {
                name: 'Bodyweight Squats',
                description: 'Basic squat exercise for leg strength',
                category: 'strength',
                muscleGroup: 'legs',
                sets: 3,
                reps: 12,
                restBetweenSets: 60,
                difficulty: 'beginner',
                equipment: 'bodyweight',
                instructions: [
                  'Stand with feet shoulder-width apart',
                  'Lower your body as if sitting back into a chair',
                  'Keep your chest up and knees behind toes',
                  'Push through heels to return to start'
                ],
                tips: [
                  'Keep your core engaged',
                  'Don\'t let knees cave inward',
                  'Start with partial squats if needed'
                ]
              },
              {
                name: 'Push-ups',
                description: 'Classic upper body exercise',
                category: 'strength',
                muscleGroup: 'chest',
                sets: 3,
                reps: 10,
                restBetweenSets: 60,
                difficulty: 'beginner',
                equipment: 'bodyweight',
                instructions: [
                  'Start in plank position with hands shoulder-width',
                  'Lower body until chest nearly touches floor',
                  'Push back up to starting position',
                  'Keep body in straight line throughout'
                ],
                tips: [
                  'Modify on knees if needed',
                  'Keep elbows at 45-degree angle',
                  'Don\'t let hips sag'
                ]
              },
              {
                name: 'Plank',
                description: 'Core strengthening exercise',
                category: 'strength',
                muscleGroup: 'core',
                sets: 3,
                reps: 1,
                duration: 30,
                restBetweenSets: 60,
                difficulty: 'beginner',
                equipment: 'bodyweight',
                instructions: [
                  'Start in push-up position',
                  'Rest on forearms instead of hands',
                  'Keep body in straight line from head to heels',
                  'Hold position for specified time'
                ],
                tips: [
                  'Don\'t let hips drop or rise',
                  'Keep core tight',
                  'Breathe normally'
                ]
              }
            ]
          },
          {
            dayName: 'Wednesday',
            dayNumber: 3,
            focus: 'Cardio & Core',
            estimatedDuration: 40,
            exercises: [
              {
                name: 'Jumping Jacks',
                description: 'Full body cardio warmup',
                category: 'cardio',
                muscleGroup: 'full-body',
                sets: 3,
                reps: 20,
                restBetweenSets: 45,
                difficulty: 'beginner',
                equipment: 'none',
                instructions: [
                  'Stand with feet together, arms at sides',
                  'Jump while spreading legs and raising arms',
                  'Jump back to starting position',
                  'Repeat at steady pace'
                ],
                tips: [
                  'Land softly on balls of feet',
                  'Keep movements controlled',
                  'Modify by stepping instead of jumping'
                ]
              },
              {
                name: 'Mountain Climbers',
                description: 'Dynamic core and cardio exercise',
                category: 'cardio',
                muscleGroup: 'core',
                sets: 3,
                reps: 15,
                restBetweenSets: 60,
                difficulty: 'beginner',
                equipment: 'bodyweight',
                instructions: [
                  'Start in push-up position',
                  'Bring one knee toward chest',
                  'Quickly switch legs',
                  'Continue alternating at a running pace'
                ],
                tips: [
                  'Keep hips level',
                  'Engage your core',
                  'Slow down if form breaks'
                ]
              }
            ]
          },
          {
            dayName: 'Friday',
            dayNumber: 5,
            focus: 'Lower Body & Flexibility',
            estimatedDuration: 45,
            exercises: [
              {
                name: 'Lunges',
                description: 'Leg strengthening exercise',
                category: 'strength',
                muscleGroup: 'legs',
                sets: 3,
                reps: 10,
                restBetweenSets: 60,
                difficulty: 'beginner',
                equipment: 'bodyweight',
                instructions: [
                  'Stand with feet hip-width apart',
                  'Step forward with one leg',
                  'Lower hips until both knees bent at 90 degrees',
                  'Push back to starting position'
                ],
                tips: [
                  'Keep front knee behind toes',
                  'Maintain upright torso',
                  'Engage core for balance'
                ]
              },
              {
                name: 'Calf Raises',
                description: 'Strengthen lower legs',
                category: 'strength',
                muscleGroup: 'legs',
                sets: 3,
                reps: 15,
                restBetweenSets: 45,
                difficulty: 'beginner',
                equipment: 'bodyweight',
                instructions: [
                  'Stand with feet hip-width apart',
                  'Rise up onto balls of feet',
                  'Hold briefly at top',
                  'Lower back down slowly'
                ],
                tips: [
                  'Use wall for balance if needed',
                  'Go full range of motion',
                  'Squeeze calves at top'
                ]
              }
            ]
          },
          {
            dayName: 'Sunday',
            dayNumber: 7,
            focus: 'Active Recovery',
            estimatedDuration: 30,
            notes: 'Light stretching and mobility work',
            exercises: [
              {
                name: 'Full Body Stretch',
                description: 'Comprehensive stretching routine',
                category: 'flexibility',
                muscleGroup: 'full-body',
                sets: 2,
                reps: 1,
                duration: 300,
                restBetweenSets: 30,
                difficulty: 'beginner',
                equipment: 'none',
                instructions: [
                  'Perform gentle stretches for all major muscle groups',
                  'Hold each stretch for 20-30 seconds',
                  'Breathe deeply and relax into each stretch',
                  'Never bounce or force a stretch'
                ],
                tips: [
                  'Don\'t push to pain',
                  'Focus on breathing',
                  'Stretch after muscles are warm'
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Weight Loss Cardio Blast',
        description: 'High-intensity cardio program designed to burn calories and improve cardiovascular fitness.',
        level: 'intermediate',
        bmiRange: 'overweight',
        durationWeeks: 6,
        goals: ['weight-loss', 'endurance'],
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
        weeklySchedule: [
          {
            dayName: 'Monday',
            dayNumber: 1,
            focus: 'HIIT Cardio',
            estimatedDuration: 35,
            exercises: [
              {
                name: 'Burpees',
                description: 'Full body explosive exercise',
                category: 'cardio',
                muscleGroup: 'full-body',
                sets: 4,
                reps: 10,
                restBetweenSets: 60,
                difficulty: 'intermediate',
                equipment: 'bodyweight',
                instructions: [
                  'Start standing, drop into squat position',
                  'Kick feet back to plank position',
                  'Do a push-up',
                  'Jump feet back to squat, explode upward'
                ],
                tips: [
                  'Modify by stepping back instead of jumping',
                  'Keep core tight throughout',
                  'Land softly'
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Muscle Building Program',
        description: 'Advanced strength training program for muscle hypertrophy and maximum strength gains.',
        level: 'advanced',
        bmiRange: 'normal',
        durationWeeks: 8,
        goals: ['muscle-gain', 'strength'],
        imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800',
        weeklySchedule: [
          {
            dayName: 'Monday',
            dayNumber: 1,
            focus: 'Chest & Triceps',
            estimatedDuration: 60,
            exercises: [
              {
                name: 'Barbell Bench Press',
                description: 'Primary chest building exercise',
                category: 'strength',
                muscleGroup: 'chest',
                sets: 4,
                reps: 8,
                restBetweenSets: 120,
                difficulty: 'advanced',
                equipment: 'barbell',
                instructions: [
                  'Lie on bench, grip bar slightly wider than shoulders',
                  'Lower bar to mid-chest with control',
                  'Press bar up until arms fully extended',
                  'Keep feet flat on floor, back slightly arched'
                ],
                tips: [
                  'Use spotter for heavy weights',
                  'Keep elbows at 45-degree angle',
                  'Don\'t bounce bar off chest'
                ]
              }
            ]
          }
        ]
      }
    ];

    // Insert plans first without images
    const createdPlans = await WorkoutPlan.insertMany(samplePlans);

    // Now fetch unique images for each exercise
    console.log('📸 Fetching unique images from Pixabay for each exercise...');
    let imagesFetched = 0;
    
    for (const plan of createdPlans) {
      for (const day of plan.weeklySchedule) {
        for (const exercise of day.exercises) {
          try {
            const imageData = await fetchWorkoutImage(exercise.name, exercise.muscleGroup);
            
            if (imageData) {
              exercise.imageUrl = imageData.url;
              exercise.imageSource = 'pixabay';
              exercise.pixabayData = {
                largeUrl: imageData.largeUrl,
                previewUrl: imageData.previewUrl,
                tags: imageData.tags,
                photographer: imageData.photographer,
              };
              imagesFetched++;
              console.log(`✅ Fetched image for: ${exercise.name}`);
            } else {
              exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
              exercise.imageSource = 'placeholder';
              console.log(`⚠️  Using fallback for: ${exercise.name}`);
            }
            
            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`❌ Error fetching image for ${exercise.name}:`, error.message);
            exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
            exercise.imageSource = 'placeholder';
          }
        }
      }
      
      // Save the plan with images
      await plan.save();
    }

    console.log(`🎉 Seeded ${createdPlans.length} plans with ${imagesFetched} unique images!`);

    res.status(201).json({
      success: true,
      message: 'Workout plans seeded successfully',
      count: createdPlans.length,
      plans: createdPlans,
    });
  } catch (error) {
    console.error('Error seeding workout plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed workout plans',
      error: error.message,
    });
  }
};

// Fetch and update workout images from Pixabay
exports.fetchWorkoutImages = async (req, res) => {
  try {
    const { planId } = req.params;
    const { forceRefresh } = req.query;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Workout plan ID is required',
      });
    }

    const plan = await WorkoutPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Workout plan not found',
      });
    }

    let updatedCount = 0;
    let failedCount = 0;

    // Process each day's exercises
    for (const day of plan.weeklySchedule) {
      for (const exercise of day.exercises) {
        // Skip if image exists and not forcing refresh
        if (exercise.imageUrl && exercise.imageSource !== 'placeholder' && forceRefresh !== 'true') {
          continue;
        }

        try {
          const imageData = await fetchWorkoutImage(exercise.name, exercise.muscleGroup);

          if (imageData) {
            exercise.imageUrl = imageData.url;
            exercise.imageSource = 'pixabay';
            exercise.pixabayData = {
              largeUrl: imageData.largeUrl,
              previewUrl: imageData.previewUrl,
              tags: imageData.tags,
              photographer: imageData.photographer,
            };
            updatedCount++;
          } else {
            exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
            exercise.imageSource = 'placeholder';
            failedCount++;
          }
        } catch (error) {
          console.error(`Error fetching image for ${exercise.name}:`, error.message);
          exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
          exercise.imageSource = 'placeholder';
          failedCount++;
        }
      }
    }

    // Save updated plan
    await plan.save();

    res.json({
      success: true,
      message: 'Workout images fetched successfully',
      stats: {
        totalExercises: updatedCount + failedCount,
        imagesUpdated: updatedCount,
        imagesFailed: failedCount,
      },
      plan,
    });
  } catch (error) {
    console.error('Error fetching workout images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout images',
      error: error.message,
    });
  }
};

// Fetch images for all workout plans
exports.fetchAllWorkoutImages = async (req, res) => {
  try {
    const { forceRefresh } = req.query;

    const plans = await WorkoutPlan.find({ isActive: true });

    let totalUpdated = 0;
    let totalFailed = 0;
    let plansProcessed = 0;

    for (const plan of plans) {
      for (const day of plan.weeklySchedule) {
        for (const exercise of day.exercises) {
          // Skip if image exists and not forcing refresh
          if (exercise.imageUrl && exercise.imageSource !== 'placeholder' && forceRefresh !== 'true') {
            continue;
          }

          try {
            const imageData = await fetchWorkoutImage(exercise.name, exercise.muscleGroup);

            if (imageData) {
              exercise.imageUrl = imageData.url;
              exercise.imageSource = 'pixabay';
              exercise.pixabayData = {
                largeUrl: imageData.largeUrl,
                previewUrl: imageData.previewUrl,
                tags: imageData.tags,
                photographer: imageData.photographer,
              };
              totalUpdated++;
            } else {
              exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
              exercise.imageSource = 'placeholder';
              totalFailed++;
            }
          } catch (error) {
            console.error(`Error fetching image for ${exercise.name}:`, error.message);
            exercise.imageUrl = getFallbackImage(exercise.muscleGroup);
            exercise.imageSource = 'placeholder';
            totalFailed++;
          }

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await plan.save();
      plansProcessed++;
    }

    res.json({
      success: true,
      message: 'All workout images fetched successfully',
      stats: {
        plansProcessed,
        totalImagesUpdated: totalUpdated,
        totalImagesFailed: totalFailed,
      },
    });
  } catch (error) {
    console.error('Error fetching all workout images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all workout images',
      error: error.message,
    });
  }
};

// Get single exercise image
exports.getExerciseImage = async (req, res) => {
  try {
    const { exerciseName, muscleGroup } = req.query;

    if (!exerciseName) {
      return res.status(400).json({
        success: false,
        message: 'Exercise name is required',
      });
    }

    const imageData = await fetchWorkoutImage(exerciseName, muscleGroup);

    if (imageData) {
      res.json({
        success: true,
        image: imageData,
      });
    } else {
      res.json({
        success: true,
        image: {
          url: getFallbackImage(muscleGroup || 'full-body'),
          source: 'placeholder',
        },
      });
    }
  } catch (error) {
    console.error('Error fetching exercise image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exercise image',
      error: error.message,
    });
  }
};
