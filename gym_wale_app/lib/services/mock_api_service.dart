import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/gym.dart';
import '../models/membership.dart';
import '../models/booking.dart';
import '../models/payment.dart';
import '../models/review.dart';

/// Mock API Service for testing without backend
/// This simulates backend responses with local data
class MockApiService {
  static String? _token;
  static final Map<String, Map<String, dynamic>> _users = {};
  static final List<Map<String, dynamic>> _gyms = _mockGyms;
  static final List<Map<String, dynamic>> _bookings = [];
  static final List<Map<String, dynamic>> _favorites = [];
  static final List<Map<String, dynamic>> _reviews = [];
  
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
  }

  static Future<void> _saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  static Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  static bool get isAuthenticated => _token != null;

  // Authentication APIs
  static Future<Map<String, dynamic>> login(String email, String password) async {
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    
    if (_users.containsKey(email)) {
      final userData = _users[email]!;
      if (userData['password'] == password) {
        final token = 'mock_token_${DateTime.now().millisecondsSinceEpoch}';
        await _saveToken(token);
        
        return {
          'success': true,
          'user': User.fromJson(userData),
          'token': token,
        };
      } else {
        return {
          'success': false,
          'message': 'Invalid password',
        };
      }
    } else {
      return {
        'success': false,
        'message': 'User not found. Please register first.',
      };
    }
  }

  static Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    
    final email = userData['email'];
    if (_users.containsKey(email)) {
      return {
        'success': false,
        'message': 'Email already registered',
      };
    }
    
    final userId = 'user_${DateTime.now().millisecondsSinceEpoch}';
    final userWithId = {
      'id': userId,
      ...userData,
      'createdAt': DateTime.now().toIso8601String(),
    };
    
    _users[email] = userWithId;
    
    final token = 'mock_token_${DateTime.now().millisecondsSinceEpoch}';
    await _saveToken(token);
    
    return {
      'success': true,
      'user': User.fromJson(userWithId),
      'token': token,
    };
  }

  static Future<bool> logout() async {
    await clearToken();
    return true;
  }

  // User APIs
  static Future<User?> getProfile() async {
    if (!isAuthenticated) return null;
    
    await Future.delayed(const Duration(milliseconds: 300));
    
    // Find user by token (simplified)
    for (var userData in _users.values) {
      return User.fromJson(userData);
    }
    return null;
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> userData) async {
    if (!isAuthenticated) {
      return {
        'success': false,
        'message': 'Not authenticated',
      };
    }
    
    await Future.delayed(const Duration(milliseconds: 300));
    
    // Update first user (simplified)
    if (_users.isNotEmpty) {
      final email = _users.keys.first;
      _users[email] = {..._users[email]!, ...userData};
      
      return {
        'success': true,
        'user': User.fromJson(_users[email]!),
      };
    }
    
    return {
      'success': false,
      'message': 'User not found',
    };
  }

  // Gym APIs
  static Future<List<Gym>> getGyms() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return _gyms.map((g) => Gym.fromJson(g)).toList();
  }

  static Future<Gym?> getGymById(String id) async {
    await Future.delayed(const Duration(milliseconds: 300));
    try {
      final gymData = _gyms.firstWhere((g) => g['id'] == id);
      return Gym.fromJson(gymData);
    } catch (e) {
      return null;
    }
  }

  static Future<List<Gym>> getNearbyGyms(double lat, double lng, {double radius = 5.0}) async {
    await Future.delayed(const Duration(milliseconds: 500));
    return _gyms.map((g) => Gym.fromJson(g)).toList();
  }

  static Future<List<Gym>> searchGyms(String query) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final results = _gyms.where((g) => 
      g['name'].toString().toLowerCase().contains(query.toLowerCase()) ||
      g['address'].toString().toLowerCase().contains(query.toLowerCase())
    ).toList();
    return results.map((g) => Gym.fromJson(g)).toList();
  }

  // Membership APIs
  static Future<List<Membership>> getGymMemberships(String gymId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _mockMemberships.map((m) => Membership.fromJson(m)).toList();
  }

  // Booking APIs
  static Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    if (!isAuthenticated) {
      return {
        'success': false,
        'message': 'Not authenticated',
      };
    }
    
    await Future.delayed(const Duration(milliseconds: 500));
    
    final bookingId = 'booking_${DateTime.now().millisecondsSinceEpoch}';
    final booking = {
      'id': bookingId,
      ...bookingData,
      'status': 'confirmed',
      'createdAt': DateTime.now().toIso8601String(),
    };
    
    _bookings.add(booking);
    
    return {
      'success': true,
      'booking': Booking.fromJson(booking),
    };
  }

  static Future<List<Booking>> getMyBookings() async {
    if (!isAuthenticated) return [];
    
    await Future.delayed(const Duration(milliseconds: 400));
    return _bookings.map((b) => Booking.fromJson(b)).toList();
  }

  static Future<bool> cancelBooking(String id) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _bookings.removeWhere((b) => b['id'] == id);
    return true;
  }

  // Payment APIs
  static Future<Map<String, dynamic>> createPayment(Map<String, dynamic> paymentData) async {
    await Future.delayed(const Duration(milliseconds: 500));
    
    final paymentId = 'payment_${DateTime.now().millisecondsSinceEpoch}';
    return {
      'success': true,
      'paymentId': paymentId,
      'status': 'success',
    };
  }

  static Future<List<Payment>> getPaymentHistory() async {
    if (!isAuthenticated) return [];
    
    await Future.delayed(const Duration(milliseconds: 400));
    return [];
  }

  // Review APIs
  static Future<bool> createReview(Map<String, dynamic> reviewData) async {
    await Future.delayed(const Duration(milliseconds: 400));
    
    final reviewId = 'review_${DateTime.now().millisecondsSinceEpoch}';
    _reviews.add({
      'id': reviewId,
      ...reviewData,
      'createdAt': DateTime.now().toIso8601String(),
    });
    
    return true;
  }

  static Future<List<Review>> getGymReviews(String gymId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _mockReviews.map((r) => Review.fromJson(r)).toList();
  }

  // Favorite APIs
  static Future<bool> addFavorite(String gymId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _favorites.add({'gymId': gymId});
    return true;
  }

  static Future<bool> removeFavorite(String gymId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _favorites.removeWhere((f) => f['gymId'] == gymId);
    return true;
  }

  static Future<List<Gym>> getFavorites() async {
    if (!isAuthenticated) return [];
    
    await Future.delayed(const Duration(milliseconds: 400));
    return _gyms.take(2).map((g) => Gym.fromJson(g)).toList();
  }
}

// Mock Data
final List<Map<String, dynamic>> _mockGyms = [
  {
    'id': 'gym_1',
    'name': 'PowerFit Gym',
    'description': 'State-of-the-art gym with modern equipment and expert trainers.',
    'address': 'MG Road, Bangalore, Karnataka 560001',
    'latitude': 12.9716,
    'longitude': 77.5946,
    'phone': '+91 9876543210',
    'email': 'contact@powerfit.com',
    'rating': 4.5,
    'reviewCount': 120,
    'images': [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800',
    ],
    'amenities': ['WiFi', 'Parking', 'Locker', 'Shower', 'AC', 'Trainer'],
    'openTime': '06:00',
    'closeTime': '22:00',
    'isActive': true,
  },
  {
    'id': 'gym_2',
    'name': 'FlexZone Fitness',
    'description': 'Premium fitness center with yoga, zumba, and cardio sections.',
    'address': 'Koramangala, Bangalore, Karnataka 560034',
    'latitude': 12.9352,
    'longitude': 77.6245,
    'phone': '+91 9876543211',
    'email': 'info@flexzone.com',
    'rating': 4.7,
    'reviewCount': 89,
    'images': [
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800',
    ],
    'amenities': ['WiFi', 'Parking', 'Locker', 'Shower', 'AC', 'Trainer', 'Steam Bath'],
    'openTime': '05:30',
    'closeTime': '23:00',
    'isActive': true,
  },
  {
    'id': 'gym_3',
    'name': 'IronCore Gym',
    'description': 'Hardcore gym for serious lifters and bodybuilders.',
    'address': 'Indiranagar, Bangalore, Karnataka 560038',
    'latitude': 12.9719,
    'longitude': 77.6412,
    'phone': '+91 9876543212',
    'email': 'hello@ironcore.com',
    'rating': 4.3,
    'reviewCount': 67,
    'images': [
      'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=800',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800',
    ],
    'amenities': ['WiFi', 'Parking', 'Locker', 'Shower', 'Trainer'],
    'openTime': '06:00',
    'closeTime': '22:00',
    'isActive': true,
  },
];

final List<Map<String, dynamic>> _mockMemberships = [
  {
    'id': 'mem_1',
    'name': 'Monthly Basic',
    'duration': 30,
    'price': 1999.0,
    'features': ['Gym Access', 'Locker', 'Shower'],
    'description': 'Perfect for beginners and casual gym-goers',
  },
  {
    'id': 'mem_2',
    'name': 'Monthly Premium',
    'duration': 30,
    'price': 2999.0,
    'features': ['Gym Access', 'Locker', 'Shower', 'Personal Trainer', 'Diet Plan'],
    'description': 'Comprehensive package with trainer support',
  },
  {
    'id': 'mem_3',
    'name': 'Quarterly Premium',
    'duration': 90,
    'price': 7999.0,
    'features': ['Gym Access', 'Locker', 'Shower', 'Personal Trainer', 'Diet Plan', 'Steam Bath'],
    'description': 'Best value for serious fitness enthusiasts',
  },
  {
    'id': 'mem_4',
    'name': 'Annual Premium',
    'duration': 365,
    'price': 24999.0,
    'features': ['Gym Access', 'Locker', 'Shower', 'Personal Trainer', 'Diet Plan', 'Steam Bath', 'Priority Booking'],
    'description': 'Ultimate yearly plan with maximum savings',
  },
];

final List<Map<String, dynamic>> _mockReviews = [
  {
    'id': 'review_1',
    'userId': 'user_1',
    'userName': 'John Doe',
    'rating': 5.0,
    'comment': 'Excellent gym with great equipment and friendly staff!',
    'createdAt': '2024-01-15T10:30:00Z',
  },
  {
    'id': 'review_2',
    'userId': 'user_2',
    'userName': 'Jane Smith',
    'rating': 4.0,
    'comment': 'Good gym, but can get crowded during peak hours.',
    'createdAt': '2024-01-10T15:45:00Z',
  },
  {
    'id': 'review_3',
    'userId': 'user_3',
    'userName': 'Mike Johnson',
    'rating': 5.0,
    'comment': 'Best gym in the area! Highly recommend.',
    'createdAt': '2024-01-05T08:20:00Z',
  },
];
