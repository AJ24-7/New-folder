class Meal {
  final String? id;
  final String name;
  final String? description;
  final String? time;
  final int calories;
  final int? protein;
  final int? carbs;
  final int? fats;
  final int? fiber;
  final List<String>? ingredients;
  final String? preparation;
  final String? imageUrl;

  Meal({
    this.id,
    required this.name,
    this.description,
    this.time,
    required this.calories,
    this.protein,
    this.carbs,
    this.fats,
    this.fiber,
    this.ingredients,
    this.preparation,
    this.imageUrl,
  });

  factory Meal.fromJson(Map<String, dynamic> json) {
    return Meal(
      id: json['_id'],
      name: json['name'] ?? '',
      description: json['description'],
      time: json['time'],
      calories: json['calories']?.toInt() ?? 0,
      protein: json['protein']?.toInt(),
      carbs: json['carbs']?.toInt(),
      fats: json['fats']?.toInt(),
      fiber: json['fiber']?.toInt(),
      ingredients: json['ingredients'] != null
          ? List<String>.from(json['ingredients'])
          : null,
      preparation: json['preparation'],
      imageUrl: json['imageUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'name': name,
      if (description != null) 'description': description,
      if (time != null) 'time': time,
      'calories': calories,
      if (protein != null) 'protein': protein,
      if (carbs != null) 'carbs': carbs,
      if (fats != null) 'fats': fats,
      if (fiber != null) 'fiber': fiber,
      if (ingredients != null) 'ingredients': ingredients,
      if (preparation != null) 'preparation': preparation,
      if (imageUrl != null) 'imageUrl': imageUrl,
    };
  }

  Meal copyWith({
    String? id,
    String? name,
    String? description,
    String? time,
    int? calories,
    int? protein,
    int? carbs,
    int? fats,
    int? fiber,
    List<String>? ingredients,
    String? preparation,
    String? imageUrl,
  }) {
    return Meal(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      time: time ?? this.time,
      calories: calories ?? this.calories,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fats: fats ?? this.fats,
      fiber: fiber ?? this.fiber,
      ingredients: ingredients ?? this.ingredients,
      preparation: preparation ?? this.preparation,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }
}

class MealPlan {
  final List<Meal> breakfast;
  final List<Meal> midMorningSnack;
  final List<Meal> lunch;
  final List<Meal> eveningSnack;
  final List<Meal> dinner;
  final List<Meal> postDinner;

  MealPlan({
    this.breakfast = const [],
    this.midMorningSnack = const [],
    this.lunch = const [],
    this.eveningSnack = const [],
    this.dinner = const [],
    this.postDinner = const [],
  });

  factory MealPlan.fromJson(Map<String, dynamic> json) {
    return MealPlan(
      breakfast: json['breakfast'] != null
          ? (json['breakfast'] as List).map((m) => Meal.fromJson(m)).toList()
          : [],
      midMorningSnack: json['midMorningSnack'] != null
          ? (json['midMorningSnack'] as List).map((m) => Meal.fromJson(m)).toList()
          : [],
      lunch: json['lunch'] != null
          ? (json['lunch'] as List).map((m) => Meal.fromJson(m)).toList()
          : [],
      eveningSnack: json['eveningSnack'] != null
          ? (json['eveningSnack'] as List).map((m) => Meal.fromJson(m)).toList()
          : [],
      dinner: json['dinner'] != null
          ? (json['dinner'] as List).map((m) => Meal.fromJson(m)).toList()
          : [],
      postDinner: json['postDinner'] != null
          ? (json['postDinner'] as List).map((m) => Meal.fromJson(m)).toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'breakfast': breakfast.map((m) => m.toJson()).toList(),
      'midMorningSnack': midMorningSnack.map((m) => m.toJson()).toList(),
      'lunch': lunch.map((m) => m.toJson()).toList(),
      'eveningSnack': eveningSnack.map((m) => m.toJson()).toList(),
      'dinner': dinner.map((m) => m.toJson()).toList(),
      'postDinner': postDinner.map((m) => m.toJson()).toList(),
    };
  }
}

class DietPlanTemplate {
  final String id;
  final String name;
  final String? description;
  final List<String> tags;
  final int dailyCalories;
  final int? dailyProtein;
  final int? dailyCarbs;
  final int? dailyFats;
  final int? dailyFiber;
  final int mealsPerDay;
  final MealPlan meals;
  final String duration;
  final String difficulty;
  final String? imageUrl; // Plan thumbnail
  final bool isActive;
  final String? createdBy;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  DietPlanTemplate({
    required this.id,
    required this.name,
    this.description,
    required this.tags,
    required this.dailyCalories,
    this.dailyProtein,
    this.dailyCarbs,
    this.dailyFats,
    this.dailyFiber,
    this.mealsPerDay = 5,
    required this.meals,
    this.duration = '30 days',
    this.difficulty = 'moderate',
    this.imageUrl,
    this.isActive = true,
    this.createdBy,
    this.createdAt,
    this.updatedAt,
  });

  factory DietPlanTemplate.fromJson(Map<String, dynamic> json) {
    return DietPlanTemplate(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : [],
      dailyCalories: json['dailyCalories']?.toInt() ?? 0,
      dailyProtein: json['dailyProtein']?.toInt(),
      dailyCarbs: json['dailyCarbs']?.toInt(),
      dailyFats: json['dailyFats']?.toInt(),
      dailyFiber: json['dailyFiber']?.toInt(),
      mealsPerDay: json['mealsPerDay']?.toInt() ?? 5,
      meals: json['meals'] != null
          ? MealPlan.fromJson(json['meals'])
          : MealPlan(),
      duration: json['duration'] ?? '30 days',
      difficulty: json['difficulty'] ?? 'moderate',
      imageUrl: json['imageUrl'],
      isActive: json['isActive'] ?? true,
      createdBy: json['createdBy'],
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
      '_id': id,
      'name': name,
      if (description != null) 'description': description,
      'tags': tags,
      'dailyCalories': dailyCalories,
      if (dailyProtein != null) 'dailyProtein': dailyProtein,
      if (dailyCarbs != null) 'dailyCarbs': dailyCarbs,
      if (dailyFats != null) 'dailyFats': dailyFats,
      if (dailyFiber != null) 'dailyFiber': dailyFiber,
      'mealsPerDay': mealsPerDay,
      'meals': meals.toJson(),
      'duration': duration,
      'difficulty': difficulty,
      if (imageUrl != null) 'imageUrl': imageUrl,
      'isActive': isActive,
      if (createdBy != null) 'createdBy': createdBy,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  // Helper methods
  bool hasTag(String tag) => tags.contains(tag);

  List<String> get budgetTags =>
      tags.where((tag) => tag.startsWith('budget-')).toList();

  List<String> get dietTypeTags => tags
      .where((tag) => ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian']
          .contains(tag))
      .toList();

  List<String> get nutritionTags => tags
      .where((tag) =>
          ['high-protein', 'low-carb', 'balanced', 'keto', 'paleo']
              .contains(tag))
      .toList();

  List<String> get goalTags => tags
      .where((tag) => [
            'weight-loss',
            'muscle-gain',
            'maintenance',
            'athletic-performance'
          ].contains(tag))
      .toList();

  String? get budgetAmount {
    final budgetTag = budgetTags.isNotEmpty ? budgetTags.first : null;
    return budgetTag?.replaceFirst('budget-', '');
  }
}
