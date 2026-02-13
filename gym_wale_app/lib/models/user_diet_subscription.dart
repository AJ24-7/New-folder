import 'diet_plan.dart';

class MealNotificationSettings {
  final bool enabled;
  final String breakfastTime;
  final String midMorningSnackTime;
  final String lunchTime;
  final String eveningSnackTime;
  final String dinnerTime;
  final String postDinnerTime;

  MealNotificationSettings({
    this.enabled = true,
    this.breakfastTime = '08:00',
    this.midMorningSnackTime = '10:30',
    this.lunchTime = '13:00',
    this.eveningSnackTime = '17:00',
    this.dinnerTime = '20:00',
    this.postDinnerTime = '22:00',
  });

  factory MealNotificationSettings.fromJson(Map<String, dynamic> json) {
    return MealNotificationSettings(
      enabled: json['enabled'] ?? true,
      breakfastTime: json['breakfastTime'] ?? '08:00',
      midMorningSnackTime: json['midMorningSnackTime'] ?? '10:30',
      lunchTime: json['lunchTime'] ?? '13:00',
      eveningSnackTime: json['eveningSnackTime'] ?? '17:00',
      dinnerTime: json['dinnerTime'] ?? '20:00',
      postDinnerTime: json['postDinnerTime'] ?? '22:00',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'enabled': enabled,
      'breakfastTime': breakfastTime,
      'midMorningSnackTime': midMorningSnackTime,
      'lunchTime': lunchTime,
      'eveningSnackTime': eveningSnackTime,
      'dinnerTime': dinnerTime,
      'postDinnerTime': postDinnerTime,
    };
  }

  MealNotificationSettings copyWith({
    bool? enabled,
    String? breakfastTime,
    String? midMorningSnackTime,
    String? lunchTime,
    String? eveningSnackTime,
    String? dinnerTime,
    String? postDinnerTime,
  }) {
    return MealNotificationSettings(
      enabled: enabled ?? this.enabled,
      breakfastTime: breakfastTime ?? this.breakfastTime,
      midMorningSnackTime: midMorningSnackTime ?? this.midMorningSnackTime,
      lunchTime: lunchTime ?? this.lunchTime,
      eveningSnackTime: eveningSnackTime ?? this.eveningSnackTime,
      dinnerTime: dinnerTime ?? this.dinnerTime,
      postDinnerTime: postDinnerTime ?? this.postDinnerTime,
    );
  }
}

class UserDietSubscription {
  final String id;
  final String userId;
  final String planTemplateId;
  final DietPlanTemplate? planTemplate; // Populated if included
  final MealPlan? customMeals;
  final MealNotificationSettings mealNotifications;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isActive;
  final int completedDays;
  final int skippedMeals;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserDietSubscription({
    required this.id,
    required this.userId,
    required this.planTemplateId,
    this.planTemplate,
    this.customMeals,
    required this.mealNotifications,
    required this.startDate,
    this.endDate,
    this.isActive = true,
    this.completedDays = 0,
    this.skippedMeals = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory UserDietSubscription.fromJson(Map<String, dynamic> json) {
    return UserDietSubscription(
      id: json['_id'] ?? '',
      userId: json['userId'] ?? '',
      planTemplateId: json['planTemplateId'] is String
          ? json['planTemplateId']
          : json['planTemplateId']?['_id'] ?? '',
      planTemplate: json['planTemplateId'] is Map<String, dynamic>
          ? DietPlanTemplate.fromJson(json['planTemplateId'])
          : null,
      customMeals: json['customMeals'] != null
          ? MealPlan.fromJson(json['customMeals'])
          : null,
      mealNotifications: json['mealNotifications'] != null
          ? MealNotificationSettings.fromJson(json['mealNotifications'])
          : MealNotificationSettings(),
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'])
          : DateTime.now(),
      endDate:
          json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      isActive: json['isActive'] ?? true,
      completedDays: json['completedDays']?.toInt() ?? 0,
      skippedMeals: json['skippedMeals']?.toInt() ?? 0,
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
      'userId': userId,
      'planTemplateId': planTemplateId,
      if (customMeals != null) 'customMeals': customMeals!.toJson(),
      'mealNotifications': mealNotifications.toJson(),
      'startDate': startDate.toIso8601String(),
      if (endDate != null) 'endDate': endDate!.toIso8601String(),
      'isActive': isActive,
      'completedDays': completedDays,
      'skippedMeals': skippedMeals,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  // Helper methods
  int get daysRemaining {
    if (endDate == null) return 0;
    final now = DateTime.now();
    if (now.isAfter(endDate!)) return 0;
    return endDate!.difference(now).inDays;
  }

  int get totalDays {
    if (endDate == null) return 0;
    return endDate!.difference(startDate).inDays;
  }

  double get progressPercentage {
    if (totalDays == 0) return 0.0;
    return (completedDays / totalDays) * 100;
  }

  bool get isExpired {
    if (endDate == null) return false;
    return DateTime.now().isAfter(endDate!);
  }

  MealPlan get effectiveMealPlan {
    return customMeals ?? planTemplate?.meals ?? MealPlan();
  }
}
