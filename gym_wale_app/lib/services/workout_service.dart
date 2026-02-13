import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/workout_plan.dart';

class WorkoutService {
  static Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<Map<String, String>> get _headers async {
    final token = await _getToken();
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Get all workout plans
  static Future<Map<String, dynamic>> getWorkoutPlans() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/workouts/plans'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final plans = (data['plans'] as List)
            .map((plan) => WorkoutPlan.fromJson(plan))
            .toList();

        return {
          'success': true,
          'plans': plans,
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to load workout plans',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // Get recommended workout plans based on BMI and fitness level
  static Future<Map<String, dynamic>> getRecommendedPlans({
    required String bmiCategory,
    required String fitnessLevel,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/workouts/recommended?bmiCategory=$bmiCategory&level=$fitnessLevel'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final plans = (data['plans'] as List)
            .map((plan) => WorkoutPlan.fromJson(plan))
            .toList();

        return {
          'success': true,
          'plans': plans,
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to load recommended plans',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // Get workout plan by ID
  static Future<Map<String, dynamic>> getWorkoutPlanById(String planId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/workouts/plans/$planId'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final plan = WorkoutPlan.fromJson(data['plan']);

        return {
          'success': true,
          'plan': plan,
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to load workout plan',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // Start a workout plan
  static Future<Map<String, dynamic>> startWorkoutPlan(String planId) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Please login to start a workout plan',
        };
      }

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/workouts/start'),
        headers: await _headers,
        body: json.encode({'planId': planId}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        final progress = UserWorkoutProgress.fromJson(data['progress']);

        return {
          'success': true,
          'progress': progress,
          'message': data['message'] ?? 'Workout plan started successfully',
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to start workout plan',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // Get user's workout progress
  static Future<Map<String, dynamic>> getUserProgress() async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Please login to view your progress',
        };
      }

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/workouts/progress'),
        headers: await _headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final progress = data['progress'] != null
            ? UserWorkoutProgress.fromJson(data['progress'])
            : null;

        return {
          'success': true,
          'progress': progress,
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to load progress',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // Mark exercise as completed
  static Future<Map<String, dynamic>> completeExercise({
    required String exerciseId,
    required int sets,
    required int reps,
    int? duration,
    String? notes,
  }) async {
    try {
      final token = await _getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Please login to track your progress',
        };
      }

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/workouts/complete-exercise'),
        headers: await _headers,
        body: json.encode({
          'exerciseId': exerciseId,
          'setsCompleted': sets,
          'repsCompleted': reps,
          'durationCompleted': duration,
          'notes': notes,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'message': data['message'] ?? 'Exercise completed',
          'progress': data['progress'] != null
              ? UserWorkoutProgress.fromJson(data['progress'])
              : null,
        };
      } else {
        final error = json.decode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Failed to complete exercise',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e',
      };
    }
  }

  // Calculate BMI
  static double calculateBMI(double weightKg, double heightCm) {
    final heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  // Get BMI category
  static String getBMICategory(double bmi) {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  // Get BMI recommendations
  static Map<String, dynamic> getBMIRecommendations(double bmi) {
    final category = getBMICategory(bmi);
    Map<String, dynamic> recommendations = {};

    switch (category) {
      case 'underweight':
        recommendations = {
          'category': 'Underweight',
          'color': 'blue',
          'message': 'Focus on strength training and proper nutrition',
          'workoutFocus': [
            'Strength training',
            'Muscle building exercises',
            'Moderate cardio'
          ],
          'calorieAdjustment': 'Calorie surplus recommended',
        };
        break;
      case 'normal':
        recommendations = {
          'category': 'Normal Weight',
          'color': 'green',
          'message': 'Maintain your healthy weight with balanced workouts',
          'workoutFocus': [
            'Balanced strength and cardio',
            'Flexibility training',
            'Athletic performance'
          ],
          'calorieAdjustment': 'Maintain current calorie intake',
        };
        break;
      case 'overweight':
        recommendations = {
          'category': 'Overweight',
          'color': 'orange',
          'message': 'Focus on cardio and calorie management',
          'workoutFocus': [
            'Cardio exercises',
            'Full-body workouts',
            'Strength training for metabolism'
          ],
          'calorieAdjustment': 'Calorie deficit recommended',
        };
        break;
      case 'obese':
        recommendations = {
          'category': 'Obese',
          'color': 'red',
          'message': 'Start with low-impact exercises and consult a professional',
          'workoutFocus': [
            'Low-impact cardio',
            'Walking and swimming',
            'Gradual strength training'
          ],
          'calorieAdjustment': 'Significant calorie deficit recommended',
        };
        break;
    }

    recommendations['bmi'] = bmi;
    return recommendations;
  }
}
