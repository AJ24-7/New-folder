import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:io';

class ImageService {
  static const String _baseUrl = 'https://api.pexels.com/v1/search';
  static const String _pexelsApiKey = 'YOUR_PEXELS_API_KEY'; // Should be in env

  /// Fetch a relevant image URL from Pexels based on search query
  /// Returns null if the image cannot be fetched
  static Future<String?> fetchMealImage(String mealName, List<String>? ingredients) async {
    try {
      // Build search query from meal name and ingredients
      String searchQuery = mealName;
      if (ingredients != null && ingredients.isNotEmpty) {
        // Use first 2 ingredients with meal name for better search
        searchQuery = '$mealName ${ingredients.take(2).join(' ')}';
      }

      final response = await http.get(
        Uri.parse(_baseUrl).replace(
          queryParameters: {
            'query': searchQuery,
            'per_page': '1',
            'orientation': 'landscape',
          },
        ),
        headers: {
          'Authorization': _pexelsApiKey,
        },
      ).timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw SocketException('Request timeout'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['photos'] != null && (data['photos'] as List).isNotEmpty) {
          final photoUrl = data['photos'][0]['src']['large'];
          return photoUrl;
        }
      }
      return null;
    } catch (e) {
      print('Error fetching image for "$mealName": $e');
      return null;
    }
  }

  /// Fetch image for diet plan based on plan tags
  static Future<String?> fetchDietPlanImage(
    String planName,
    List<String> tags, {
    int index = 0,
  }) async {
    try {
      String searchQuery = planName;

      // Build search query based on plan characteristics
      if (tags.contains('vegetarian')) {
        searchQuery = 'healthy vegetarian meal';
      } else if (tags.contains('vegan')) {
        searchQuery = 'vegan meal bowl';
      } else if (tags.contains('non-vegetarian')) {
        searchQuery = 'grilled chicken meal';
      } else if (tags.contains('eggetarian')) {
        searchQuery = 'boiled eggs breakfast';
      }

      if (tags.contains('weight-loss')) {
        searchQuery += ' salad diet';
      } else if (tags.contains('muscle-gain')) {
        searchQuery += ' protein meal';
      } else if (tags.contains('keto')) {
        searchQuery += ' keto high fat';
      }

      final response = await http.get(
        Uri.parse(_baseUrl).replace(
          queryParameters: {
            'query': searchQuery,
            'per_page': '1',
            'orientation': 'landscape',
          },
        ),
        headers: {
          'Authorization': _pexelsApiKey,
        },
      ).timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw SocketException('Request timeout'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['photos'] != null && (data['photos'] as List).isNotEmpty) {
          final photoUrl = data['photos'][0]['src']['large'];
          return photoUrl;
        }
      }
      return null;
    } catch (e) {
      print('Error fetching diet plan image for "$planName": $e');
      return null;
    }
  }

  /// Curated Pexels image URLs for different diet categories
  /// These are fallback images if API is not available
  static const Map<String, List<String>> curatedDietImages = {
    'weightLoss': [
      'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1095550/pexels-photo-1095550.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'muscleGain': [
      'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1630309/pexels-photo-1630309.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'vegetarian': [
      'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/4331489/pexels-photo-4331489.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'nonVegetarian': [
      'https://images.pexels.com/photos/1640771/pexels-photo-1640771.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1352270/pexels-photo-1352270.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'keto': [
      'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1893556/pexels-photo-1893556.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'vegan': [
      'https://images.pexels.com/photos/1640776/pexels-photo-1640776.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1211887/pexels-photo-1211887.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    'balanced': [
      'https://images.pexels.com/photos/1640779/pexels-photo-1640779.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1410236/pexels-photo-1410236.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
  };

  /// Get curated fallback image for a diet plan
  static String getCuratedImage(List<String> tags, {int index = 0}) {
    String category = 'balanced';

    if (tags.contains('weight-loss')) {
      category = 'weightLoss';
    } else if (tags.contains('muscle-gain')) {
      category = 'muscleGain';
    } else if (tags.contains('keto')) {
      category = 'keto';
    } else if (tags.contains('vegan')) {
      category = 'vegan';
    } else if (tags.contains('non-vegetarian')) {
      category = 'nonVegetarian';
    } else if (tags.contains('vegetarian')) {
      category = 'vegetarian';
    }

    final images = curatedDietImages[category] ?? curatedDietImages['balanced']!;
    return images[index % images.length];
  }

  /// Curated meal images
  static const Map<String, String> mealImages = {
    'oats': 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=500',
    'egg': 'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=500',
    'chicken': 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=500',
    'fish': 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=500',
    'salad': 'https://images.pexels.com/photos/1095550/pexels-photo-1095550.jpeg?auto=compress&cs=tinysrgb&w=500',
    'rice': 'https://images.pexels.com/photos/3915857/pexels-photo-3915857.jpeg?auto=compress&cs=tinysrgb&w=500',
    'dal': 'https://images.pexels.com/photos/1640781/pexels-photo-1640781.jpeg?auto=compress&cs=tinysrgb&w=500',
    'roti': 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=500',
  };
}
