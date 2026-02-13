class WorkoutPlan {
  final String id;
  final String name;
  final String description;
  final String level; // beginner, intermediate, advanced
  final String bmiRange; // underweight, normal, overweight, obese
  final int durationWeeks;
  final List<String> goals; // weight-loss, muscle-gain, strength, endurance, flexibility
  final List<WorkoutDay> weeklySchedule;
  final String imageUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  WorkoutPlan({
    required this.id,
    required this.name,
    required this.description,
    required this.level,
    required this.bmiRange,
    required this.durationWeeks,
    required this.goals,
    required this.weeklySchedule,
    required this.imageUrl,
    this.createdAt,
    this.updatedAt,
  });

  factory WorkoutPlan.fromJson(Map<String, dynamic> json) {
    return WorkoutPlan(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      level: json['level'] ?? 'beginner',
      bmiRange: json['bmiRange'] ?? 'normal',
      durationWeeks: json['durationWeeks'] ?? 4,
      goals: List<String>.from(json['goals'] ?? []),
      weeklySchedule: (json['weeklySchedule'] as List<dynamic>?)
              ?.map((day) => WorkoutDay.fromJson(day))
              .toList() ??
          [],
      imageUrl: json['imageUrl'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'level': level,
      'bmiRange': bmiRange,
      'durationWeeks': durationWeeks,
      'goals': goals,
      'weeklySchedule': weeklySchedule.map((day) => day.toJson()).toList(),
      'imageUrl': imageUrl,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

class WorkoutDay {
  final String dayName; // Monday, Tuesday, etc.
  final int dayNumber; // 1-7
  final String focus; // Upper Body, Lower Body, Cardio, Rest, etc.
  final List<Exercise> exercises;
  final int estimatedDuration; // in minutes
  final String? notes;

  WorkoutDay({
    required this.dayName,
    required this.dayNumber,
    required this.focus,
    required this.exercises,
    required this.estimatedDuration,
    this.notes,
  });

  factory WorkoutDay.fromJson(Map<String, dynamic> json) {
    return WorkoutDay(
      dayName: json['dayName'] ?? '',
      dayNumber: json['dayNumber'] ?? 1,
      focus: json['focus'] ?? '',
      exercises: (json['exercises'] as List<dynamic>?)
              ?.map((exercise) => Exercise.fromJson(exercise))
              .toList() ??
          [],
      estimatedDuration: json['estimatedDuration'] ?? 0,
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dayName': dayName,
      'dayNumber': dayNumber,
      'focus': focus,
      'exercises': exercises.map((exercise) => exercise.toJson()).toList(),
      'estimatedDuration': estimatedDuration,
      'notes': notes,
    };
  }
}

class Exercise {
  final String id;
  final String name;
  final String description;
  final String category; // strength, cardio, flexibility, warmup, cooldown
  final String muscleGroup; // chest, back, legs, arms, core, full-body
  final int sets;
  final int reps;
  final int? duration; // in seconds, for timed exercises
  final int restBetweenSets; // in seconds
  final String difficulty; // beginner, intermediate, advanced
  final String imageUrl; // Pixabay image
  final String? videoUrl;
  final List<String> instructions;
  final List<String> tips;
  final String? equipment; // none, dumbbells, barbell, machine, etc.

  Exercise({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.muscleGroup,
    required this.sets,
    required this.reps,
    this.duration,
    required this.restBetweenSets,
    required this.difficulty,
    required this.imageUrl,
    this.videoUrl,
    required this.instructions,
    required this.tips,
    this.equipment,
  });

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'strength',
      muscleGroup: json['muscleGroup'] ?? 'full-body',
      sets: json['sets'] ?? 3,
      reps: json['reps'] ?? 10,
      duration: json['duration'],
      restBetweenSets: json['restBetweenSets'] ?? 60,
      difficulty: json['difficulty'] ?? 'beginner',
      imageUrl: json['imageUrl'] ?? '',
      videoUrl: json['videoUrl'],
      instructions: List<String>.from(json['instructions'] ?? []),
      tips: List<String>.from(json['tips'] ?? []),
      equipment: json['equipment'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'muscleGroup': muscleGroup,
      'sets': sets,
      'reps': reps,
      'duration': duration,
      'restBetweenSets': restBetweenSets,
      'difficulty': difficulty,
      'imageUrl': imageUrl,
      'videoUrl': videoUrl,
      'instructions': instructions,
      'tips': tips,
      'equipment': equipment,
    };
  }
}

class UserWorkoutProgress {
  final String id;
  final String userId;
  final String workoutPlanId;
  final DateTime startDate;
  final DateTime? endDate;
  final List<CompletedWorkout> completedWorkouts;
  final bool isActive;
  final double progress; // 0-100

  UserWorkoutProgress({
    required this.id,
    required this.userId,
    required this.workoutPlanId,
    required this.startDate,
    this.endDate,
    required this.completedWorkouts,
    required this.isActive,
    required this.progress,
  });

  factory UserWorkoutProgress.fromJson(Map<String, dynamic> json) {
    return UserWorkoutProgress(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      userId: json['userId'] ?? '',
      workoutPlanId: json['workoutPlanId'] ?? '',
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'])
          : DateTime.now(),
      endDate:
          json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      completedWorkouts: (json['completedWorkouts'] as List<dynamic>?)
              ?.map((workout) => CompletedWorkout.fromJson(workout))
              .toList() ??
          [],
      isActive: json['isActive'] ?? true,
      progress: (json['progress'] ?? 0.0).toDouble(),
    );
  }

  // Computed properties
  int get completedCount => completedWorkouts.length;
  
  int get totalWorkouts {
    // This should be calculated based on the workout plan
    // For now, estimate based on progress percentage
    if (progress > 0) {
      return (completedCount / (progress / 100)).round();
    }
    return 0;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'workoutPlanId': workoutPlanId,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'completedWorkouts':
          completedWorkouts.map((workout) => workout.toJson()).toList(),
      'isActive': isActive,
      'progress': progress,
    };
  }
}

class CompletedWorkout {
  final String exerciseId;
  final DateTime completedDate;
  final int setsCompleted;
  final int repsCompleted;
  final int? durationCompleted; // in seconds
  final String? notes;
  final int? caloriesBurned;

  CompletedWorkout({
    required this.exerciseId,
    required this.completedDate,
    required this.setsCompleted,
    required this.repsCompleted,
    this.durationCompleted,
    this.notes,
    this.caloriesBurned,
  });

  // For display purposes - exercise name from ID
  String? get exerciseName {
    // This will be populated from the exercise data
    // For now, return a formatted version of the ID
    if (exerciseId.isEmpty) return null;
    return notes ?? 'Exercise';
  }

  factory CompletedWorkout.fromJson(Map<String, dynamic> json) {
    return CompletedWorkout(
      exerciseId: json['exerciseId'] ?? '',
      completedDate: json['completedDate'] != null
          ? DateTime.parse(json['completedDate'])
          : DateTime.now(),
      setsCompleted: json['setsCompleted'] ?? 0,
      repsCompleted: json['repsCompleted'] ?? 0,
      durationCompleted: json['durationCompleted'],
      notes: json['notes'],
      caloriesBurned: json['caloriesBurned'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'exerciseId': exerciseId,
      'completedDate': completedDate.toIso8601String(),
      'setsCompleted': setsCompleted,
      'repsCompleted': repsCompleted,
      'durationCompleted': durationCompleted,
      'notes': notes,
      'caloriesBurned': caloriesBurned,
    };
  }
}
