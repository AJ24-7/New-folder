import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/diet_plan.dart';
import '../models/user_diet_subscription.dart';

class DietService {
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

  // ==================== DIET PLAN TEMPLATES ====================

  /// Get all diet plan templates with optional filters
  static Future<Map<String, dynamic>> getDietPlanTemplates({
    List<String>? tags,
    int? minCalories,
    int? maxCalories,
    int? mealsPerDay,
  }) async {
    try {
      // Build query parameters
      final queryParams = <String, String>{};

      if (tags != null && tags.isNotEmpty) {
        queryParams['tags'] = tags.join(',');
      }
      if (minCalories != null) {
        queryParams['minCalories'] = minCalories.toString();
      }
      if (maxCalories != null) {
        queryParams['maxCalories'] = maxCalories.toString();
      }
      if (mealsPerDay != null) {
        queryParams['mealsPerDay'] = mealsPerDay.toString();
      }

      final uri = Uri.parse('${ApiConfig.baseUrl}/diet/templates')
          .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

      final headers = await _headers;
      final response = await http
          .get(uri, headers: headers)
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final plans = (data['data'] as List)
            .map((json) => DietPlanTemplate.fromJson(json))
            .toList();

        return {
          'success': true,
          'plans': plans,
          'count': data['count'] ?? plans.length,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch diet plans',
        };
      }
    } catch (e) {
      print('Error fetching diet plans: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get single diet plan template by ID
  static Future<Map<String, dynamic>> getDietPlanTemplateById(
      String planId) async {
    try {
      final url =
          Uri.parse('${ApiConfig.baseUrl}/diet/templates/$planId');

      final headers = await _headers;
      final response = await http
          .get(url, headers: headers)
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'plan': DietPlanTemplate.fromJson(data['data']),
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Diet plan not found',
        };
      }
    } catch (e) {
      print('Error fetching diet plan: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // ==================== USER DIET SUBSCRIPTIONS ====================

  /// Subscribe to a diet plan
  static Future<Map<String, dynamic>> subscribeToDietPlan({
    required String planTemplateId,
    MealPlan? customMeals,
    MealNotificationSettings? mealNotifications,
    int duration = 30,
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/diet/subscribe');

      final body = {
        'planTemplateId': planTemplateId,
        'duration': duration,
        if (customMeals != null) 'customMeals': customMeals.toJson(),
        if (mealNotifications != null)
          'mealNotifications': mealNotifications.toJson(),
      };

      final headers = await _headers;
      final response = await http
          .post(
            url,
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 && data['success'] == true) {
        return {
          'success': true,
          'subscription': UserDietSubscription.fromJson(data['data']),
          'message': data['message'] ?? 'Successfully subscribed to diet plan',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to subscribe to diet plan',
        };
      }
    } catch (e) {
      print('Error subscribing to diet plan: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get user's active diet subscription
  static Future<Map<String, dynamic>> getUserActiveDietSubscription() async {
    try {
      final url =
          Uri.parse('${ApiConfig.baseUrl}/diet/subscription/active');

      final headers = await _headers;
      final response = await http
          .get(url, headers: headers)
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'subscription': UserDietSubscription.fromJson(data['data']),
        };
      } else if (response.statusCode == 404) {
        return {
          'success': true,
          'subscription': null,
          'message': 'No active subscription found',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch subscription',
        };
      }
    } catch (e) {
      print('Error fetching active subscription: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Update user's diet subscription
  static Future<Map<String, dynamic>> updateUserDietSubscription({
    required String subscriptionId,
    MealPlan? customMeals,
    MealNotificationSettings? mealNotifications,
  }) async {
    try {
      final url = Uri.parse(
          '${ApiConfig.baseUrl}/diet/subscription/$subscriptionId');

      final body = <String, dynamic>{};
      if (customMeals != null) {
        body['customMeals'] = customMeals.toJson();
      }
      if (mealNotifications != null) {
        body['mealNotifications'] = mealNotifications.toJson();
      }

      final headers = await _headers;
      final response = await http
          .put(
            url,
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'subscription': UserDietSubscription.fromJson(data['data']),
          'message':
              data['message'] ?? 'Successfully updated diet subscription',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update subscription',
        };
      }
    } catch (e) {
      print('Error updating subscription: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Cancel diet subscription
  static Future<Map<String, dynamic>> cancelDietSubscription(
      String subscriptionId) async {
    try {
      final url = Uri.parse(
          '${ApiConfig.baseUrl}/diet/subscription/$subscriptionId');

      final headers = await _headers;
      final response = await http
          .delete(url, headers: headers)
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'message': data['message'] ?? 'Successfully cancelled subscription',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to cancel subscription',
        };
      }
    } catch (e) {
      print('Error cancelling subscription: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get user's diet subscription history
  static Future<Map<String, dynamic>> getUserDietSubscriptionHistory() async {
    try {
      final url =
          Uri.parse('${ApiConfig.baseUrl}/diet/subscription/history');

      final headers = await _headers;
      final response = await http
          .get(url, headers: headers)
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final subscriptions = (data['data'] as List)
            .map((json) => UserDietSubscription.fromJson(json))
            .toList();

        return {
          'success': true,
          'subscriptions': subscriptions,
          'count': data['count'] ?? subscriptions.length,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch subscription history',
        };
      }
    } catch (e) {
      print('Error fetching subscription history: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }
}
