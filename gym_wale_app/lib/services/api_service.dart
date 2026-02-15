import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../models/gym.dart';
import '../models/membership.dart';
import '../models/booking.dart';
import '../models/payment.dart';
import '../models/review.dart';
import '../models/user_membership.dart';

class ApiService {
  static String? _token;
  
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
  }

  static Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
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
    await prefs.remove('user_id');
    await prefs.remove('user_email');
  }

  static bool get isAuthenticated => _token != null;
  static String? get token => _token;

  // ========== Authentication APIs ==========
  
  /// Login user with email and password
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.login);
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        if (data['token'] != null) {
          await _saveToken(data['token']);
        }
        try {
          return {
            'success': true,
            'user': User.fromJson(data['user'] ?? data['data'] ?? data),
            'token': data['token'],
          };
        } catch (parseError) {
          print('Error parsing user data: $parseError');
          print('Raw user data: ${data['user'] ?? data['data']}');
          return {
            'success': false,
            'message': 'Error parsing user data: ${parseError.toString()}',
          };
        }
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Login failed',
        };
      }
    } catch (e) {
      print('Login error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Register a new user
  static Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.register);
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': userData['name'] ?? userData['username'],
          'email': userData['email'],
          'phone': userData['phone'],
          'password': userData['password'],
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        if (data['token'] != null) {
          await _saveToken(data['token']);
        }
        
        try {
          final userData = data['user'] ?? data['data'] ?? data;
          if (userData == null || userData is! Map) {
            print('Warning: User data is null or not a Map in register response');
            return {
              'success': false,
              'message': 'Invalid user data received from server',
            };
          }
          
          return {
            'success': true,
            'user': User.fromJson(userData as Map<String, dynamic>),
            'token': data['token'],
          };
        } catch (parseError) {
          print('Error parsing user data in register: $parseError');
          return {
            'success': false,
            'message': 'Error parsing user data: ${parseError.toString()}',
          };
        }
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Registration failed',
        };
      }
    } catch (e) {
      print('Register error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Google Sign In
  static Future<Map<String, dynamic>> googleAuth(String idToken) async {
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.googleAuth);
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'idToken': idToken,
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        if (data['token'] != null) {
          await _saveToken(data['token']);
        }
        
        try {
          final userData = data['user'] ?? data['data'] ?? data;
          if (userData == null || userData is! Map) {
            print('Warning: User data is null or not a Map in google auth response');
            return {
              'success': false,
              'message': 'Invalid user data received from server',
            };
          }
          
          return {
            'success': true,
            'user': User.fromJson(userData as Map<String, dynamic>),
            'token': data['token'],
          };
        } catch (parseError) {
          print('Error parsing user data in google auth: $parseError');
          return {
            'success': false,
            'message': 'Error parsing user data',
          };
        }
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Google authentication failed',
        };
      }
    } catch (e) {
      print('Google auth error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Logout user
  static Future<bool> logout() async {
    await clearToken();
    return true;
  }

  // ========== User Profile APIs ==========
  
  /// Get user profile
  static Future<User?> getProfile() async {
    if (_token == null) {
      print('Get profile error: No token available');
      return null;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.profile);
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      print('Profile response status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Profile response data type: ${data.runtimeType}');
        
        try {
          // Backend returns user object directly or nested in 'user' or 'data'
          dynamic userData = data;
          
          if (data is Map) {
            userData = data['user'] ?? data['data'] ?? data;
          }
          
          print('UserData type: ${userData.runtimeType}');
          
          // Check if userData is actually a Map before parsing
          if (userData == null) {
            print('Error: userData is null');
            return null;
          }
          
          if (userData is! Map<String, dynamic>) {
            print('Error: userData is not a Map, it is ${userData.runtimeType}');
            print('UserData value: $userData');
            return null;
          }
          
          return User.fromJson(userData);
        } catch (parseError) {
          print('Error parsing profile data: $parseError');
          if (parseError is Error) {
            print('Stack trace: ${parseError.stackTrace}');
          }
          print('Raw profile data: $data');
          return null;
        }
      } else {
        print('Get profile error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Get profile error: $e');
      if (e is Error) {
        print('Stack trace: ${e.stackTrace}');
      }
    }
    return null;
  }

  /// Update user profile
  static Future<Map<String, dynamic>> updateProfile(
    Map<String, dynamic> userData, {
    dynamic profileImage,
    XFile? profileImageXFile,
  }) async {
    if (_token == null) {
      return {'success': false, 'message': 'Not authenticated'};
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.updateProfile);
      var request = http.MultipartRequest(
        'PUT',
        url,
      );
      
      request.headers['Authorization'] = 'Bearer $_token';
      
      // Add text fields
      userData.forEach((key, value) {
        if (value != null) {
          request.fields[key] = value.toString();
        }
      });
      
      // Add profile image if provided
      if (kIsWeb && profileImageXFile != null) {
        // For web, use XFile directly
        final bytes = await profileImageXFile.readAsBytes();
        final extension = profileImageXFile.name.split('.').last.toLowerCase();
        String contentType = 'image/jpeg'; // default
        
        if (extension == 'png') {
          contentType = 'image/png';
        } else if (extension == 'gif') {
          contentType = 'image/gif';
        } else if (extension == 'webp') {
          contentType = 'image/webp';
        } else if (extension == 'jpg' || extension == 'jpeg') {
          contentType = 'image/jpeg';
        }
        
        request.files.add(
          http.MultipartFile.fromBytes(
            'profileImage',
            bytes,
            filename: profileImageXFile.name,
            contentType: MediaType.parse(contentType),
          ),
        );
      } else if (!kIsWeb && profileImage != null) {
        // For mobile, use File
        request.files.add(
          await http.MultipartFile.fromPath(
            'profileImage',
            profileImage.path,
          ),
        );
      }
      
      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        try {
          final userData = data['user'] ?? data['data'] ?? data;
          if (userData == null || userData is! Map) {
            print('Warning: User data is null or not a Map in update profile response');
            return {
              'success': false,
              'message': 'Invalid user data received from server',
            };
          }
          
          return {
            'success': true,
            'user': User.fromJson(userData as Map<String, dynamic>),
          };
        } catch (parseError) {
          print('Error parsing user data in update profile: $parseError');
          return {
            'success': false,
            'message': 'Error parsing user data',
          };
        }
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Update failed',
        };
      }
    } catch (e) {
      print('Update profile error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // ========== Gym APIs ==========
  
  /// Get all gyms with optional filters
  static Future<List<Gym>> getGyms({
    String? search,
    String? city,
    double? lat,
    double? lng,
    double? radius,
  }) async {
    try {
      final Map<String, String> queryParams = {};
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (city != null && city.isNotEmpty) queryParams['city'] = city;

      final uri = Uri.parse(ApiConfig.baseUrl + '/gyms/search').replace(queryParameters: queryParams);
      print('Fetching gyms from: $uri');
      
      final response = await http.get(
        uri,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        try {
          final data = jsonDecode(response.body);
          // Backend may return a List directly, an object with `gyms`/`data`, or unexpected shapes (e.g., String)
          final gymsList = data is List
              ? data
              : (data is Map
                  ? (data['gyms'] ?? data['data'] ?? data)
                  : const []);
          
          if (gymsList is List) {
            print('Found ${gymsList.length} gyms');
            var gyms = <Gym>[];
            
            // Parse each gym with individual error handling
            for (var i = 0; i < gymsList.length; i++) {
              try {
                final gymData = gymsList[i];
                if (gymData == null) {
                  print('Warning: Gym at index $i is null, skipping');
                  continue;
                }
                if (gymData is! Map) {
                  print('Warning: Gym at index $i is not a Map (type: ${gymData.runtimeType}), skipping');
                  continue;
                }
                gyms.add(Gym.fromJson(gymData as Map<String, dynamic>));
              } catch (parseError, stackTrace) {
                print('❌ Error parsing gym at index $i: $parseError');
                print('Stack trace: $stackTrace');
                print('Gym data type: ${gymsList[i]?.runtimeType}');
                try {
                  print('Gym data preview: ${gymsList[i]?.toString().substring(0, 200)}...');
                } catch (_) {
                  print('Cannot preview gym data');
                }
                // Continue with other gyms
              }
            }
            
            // If lat/lng provided, filter by distance
            if (lat != null && lng != null && radius != null) {
              gyms = gyms.where((gym) {
                if (gym.latitude == 0.0 && gym.longitude == 0.0) return false;
                final distance = _calculateDistance(lat, lng, gym.latitude, gym.longitude);
                return distance <= radius;
              }).toList();
              print('Filtered to ${gyms.length} gyms within ${radius}km');
            }
            
            return gyms;
          } else {
            print('Get gyms error: Response is not a list - type: ${gymsList.runtimeType} value: $gymsList');
          }
        } catch (parseError) {
          print('Get gyms parse error: $parseError');
          print('Response body: ${response.body}');
        }
      } else {
        print('Get gyms error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Get gyms error: $e');
    }
    return [];
  }
  
  // Helper to calculate distance between two points (Haversine formula)
  static double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371; // km
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) * cos(_toRadians(lat2)) *
        sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }
  
  static double _toRadians(double degree) {
    return degree * pi / 180;
  }

  /// Get gym details by ID
  static Future<Gym?> getGymById(String id) async {
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.gymById(id));
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Gym.fromJson(data['gym'] ?? data['data'] ?? data);
      }
    } catch (e) {
      print('Get gym error: $e');
    }
    return null;
  }

  /// Get raw gym details with photos and equipment
  static Future<Map<String, dynamic>?> getGymDetailsRaw(String id) async {
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.gymById(id));
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['gym'] ?? data['data'] ?? data;
      }
    } catch (e) {
      print('Get gym raw details error: $e');
    }
    return null;
  }

  /// Get nearby gyms based on location
  static Future<List<Gym>> getNearbyGyms(double lat, double lng, {double radius = 10}) async {
    return getGyms(lat: lat, lng: lng, radius: radius);
  }

  // ========== Booking APIs ==========
  
  /// Get user bookings
  static Future<List<Booking>> getMyBookings() async {
    if (_token == null) return [];
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.myBookings);
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final bookingsList = data['bookings'] ?? data['data'] ?? data;
        if (bookingsList is List) {
          return bookingsList.map((booking) => Booking.fromJson(booking)).toList();
        }
      }
    } catch (e) {
      print('Get bookings error: $e');
    }
    return [];
  }

  // Membership APIs
  static Future<List<Membership>> getGymMemberships(String gymId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/gyms/$gymId/membership-plans');
      print('Fetching memberships from: $url');
      
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      print('Memberships response status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Memberships response data: $data');
        
        final membershipsList = data['memberships'] ?? data['data'] ?? [];
        print('Memberships list: $membershipsList');
        
        if (membershipsList is List) {
          return membershipsList.map((m) => Membership.fromJson(m as Map<String, dynamic>)).toList();
        }
      } else {
        print('Memberships error response: ${response.body}');
      }
    } catch (e) {
      print('Get memberships error: $e');
    }
    return [];
  }

  /// Get user's active memberships
  static Future<Map<String, dynamic>> getUserMemberships() async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/members/my-memberships');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'memberships': data['memberships'] ?? data['data'] ?? [],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch memberships',
          'memberships': [],
        };
      }
    } catch (e) {
      print('Get user memberships error: $e');
      return {
        'success': false,
        'message': 'Error: $e',
        'memberships': [],
      };
    }
  }

  /// Get user's payment history
  static Future<Map<String, dynamic>> getUserPayments() async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.userPayments}');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'payments': data['payments'] ?? data['data'] ?? [],
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch payments',
          'payments': [],
        };
      }
    } catch (e) {
      print('Get user payments error: $e');
      return {
        'success': false,
        'message': 'Error: $e',
        'payments': [],
      };
    }
  }

  /// Book a membership
  static Future<Map<String, dynamic>> bookMembership({
    required String gymId,
    required String membershipPlan,
    required String monthlyPlan,
    required String paymentMode,
    required double paymentAmount,
    String activityPreference = 'General Fitness',
  }) async {
    if (_token == null) {
      return {'success': false, 'message': 'Not authenticated'};
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/members/book-membership');
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'gymId': gymId,
          'membershipPlan': membershipPlan,
          'monthlyPlan': monthlyPlan,
          'paymentMode': paymentMode,
          'paymentAmount': paymentAmount,
          'activityPreference': activityPreference,
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      print('Book membership response: $data');
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'member': data['member'],
          'message': data['message'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to book membership',
        };
      }
    } catch (e) {
      print('Book membership error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Create a new booking
  static Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    if (_token == null) {
      return {'success': false, 'message': 'Not authenticated'};
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.bookings);
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(bookingData),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {
          'success': true,
          'booking': Booking.fromJson(data['booking'] ?? data['data'] ?? data),
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Booking failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  static Future<bool> cancelBooking(String bookingId) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cancelBooking}/$bookingId/cancel'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      return response.statusCode == 200;
    } catch (e) {
      print('Cancel booking error: $e');
      return false;
    }
  }

  /// Freeze membership
  static Future<Map<String, dynamic>> freezeMembership(
    String membershipId,
    int freezeDays,
    String reason,
  ) async {
    if (_token == null) {
      return {
        'success': false,
        'message': 'Not authenticated',
      };
    }

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/members/$membershipId/freeze');
      print('Freezing membership: $url');
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'freezeDays': freezeDays,
          'reason': reason,
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      print('Freeze membership response: $data');

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Membership frozen successfully',
          'membership': data['membership'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to freeze membership',
        };
      }
    } catch (e) {
      print('Freeze membership error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get membership pass details
  static Future<Map<String, dynamic>> getMembershipPass(String membershipId) async {
    if (_token == null) {
      return {
        'success': false,
        'message': 'Not authenticated',
      };
    }

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/members/$membershipId/pass');
      print('Getting membership pass: $url');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      print('Membership pass response: $data');

      if (response.statusCode == 200) {
        return {
          'success': true,
          'pass': data['pass'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get membership pass',
        };
      }
    } catch (e) {
      print('Get membership pass error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Payment APIs
  static Future<Map<String, dynamic>> createPayment(Map<String, dynamic> paymentData) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.createPayment}'),
        headers: _headers,
        body: jsonEncode(paymentData),
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {
          'success': true,
          'payment': Payment.fromJson(data['payment'] ?? data['data']),
          'orderId': data['orderId'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Payment initialization failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get payment history
  static Future<List<Payment>> getPaymentHistory() async {
    if (_token == null) return [];
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.userPayments);
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final paymentsList = data['payments'] ?? data['data'] ?? data;
        if (paymentsList is List) {
          return paymentsList.map((p) => Payment.fromJson(p)).toList();
        }
      }
    } catch (e) {
      print('Get payment history error: $e');
    }
    return [];
  }

  // Review APIs
  static Future<Map<String, dynamic>> createReview(Map<String, dynamic> reviewData) async {
    if (_token == null) {
      return {
        'success': false,
        'message': 'Authentication required. Please log in to submit a review.',
      };
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.createReview);
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(reviewData),
      ).timeout(const Duration(seconds: 30));

      print('Create review response status: ${response.statusCode}');
      final data = jsonDecode(response.body);
      print('Create review response: $data');
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {
          'success': true,
          'review': Review.fromJson(data['review'] ?? data['data']),
          'message': data['message'] ?? 'Review submitted successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Review submission failed',
        };
      }
    } catch (e) {
      print('Create review error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  static Future<List<Review>> getGymReviews(String gymId) async {
    try {
      final url = Uri.parse(ApiConfig.baseUrl + ApiConfig.gymReviews(gymId));
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      print('Get reviews response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Reviews response data: $data');
        
        final reviewsList = data['reviews'] ?? data['data'] ?? [];
        if (reviewsList is! List) {
          print('Reviews data is not a list: ${reviewsList.runtimeType}');
          return [];
        }
        
        final reviews = <Review>[];
        for (var i = 0; i < reviewsList.length; i++) {
          try {
            if (reviewsList[i] != null) {
              reviews.add(Review.fromJson(reviewsList[i] as Map<String, dynamic>));
            }
          } catch (parseError) {
            print('Error parsing review at index $i: $parseError');
            continue;
          }
        }
        
        print('Successfully parsed ${reviews.length} reviews');
        return reviews;
      } else {
        print('Get reviews error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Get reviews error: $e');
    }
    return [];
  }

  // Favorites APIs
  // Add gym to favorites
  static Future<bool> addFavorite(String gymId) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.addFavorite(gymId)}'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('Add favorite error: $e');
      return false;
    }
  }

  // Remove gym from favorites
  static Future<bool> removeFavorite(String gymId) async {
    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.removeFavorite(gymId)}'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      return response.statusCode == 200;
    } catch (e) {
      print('Remove favorite error: $e');
      return false;
    }
  }

  // Check if gym is favorited
  static Future<bool> checkFavorite(String gymId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.checkFavorite(gymId)}'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['isFavorite'] ?? false;
      }
      return false;
    } catch (e) {
      print('Check favorite error: $e');
      return false;
    }
  }

  static Future<List<Gym>> getFavorites() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.favorites}'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final gymsList = data['gyms'] ?? data['favorites'] ?? data['data'] ?? [];
        return (gymsList as List).map((gym) => Gym.fromJson(gym)).toList();
      }
    } catch (e) {
      print('Get favorites error: $e');
    }
    return [];
  }

  // ========== Trainer APIs ==========
  
  /// Get all approved trainers
  static Future<List<dynamic>> getTrainers({String? city}) async {
    try {
      String url = '${ApiConfig.baseUrl}/trainers?status=approved';
      if (city != null) {
        url += '&city=$city';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          return data;
        } else if (data['trainers'] != null) {
          return data['trainers'];
        } else if (data['data'] != null) {
          return data['data'];
        }
      }
    } catch (e) {
      print('Get trainers error: $e');
    }
    return [];
  }

  /// Get top rated trainers
  static Future<List<dynamic>> getTopTrainers({int limit = 5}) async {
    try {
      final trainers = await getTrainers();
      // Sort by rating and return top trainers
      trainers.sort((a, b) => (b['rating'] ?? 0).compareTo(a['rating'] ?? 0));
      return trainers.take(limit).toList();
    } catch (e) {
      print('Get top trainers error: $e');
      return [];
    }
  }

  // ========== Offers/Banners APIs ==========
  
  /// Get active offers/banners
  static Future<List<dynamic>> getOffers({String? city}) async {
    try {
      String url = '${ApiConfig.baseUrl}/offers/active';
      if (city != null) {
        url += '?city=$city';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          return data;
        } else if (data['offers'] != null) {
          return data['offers'];
        } else if (data['data'] != null) {
          return data['data'];
        }
      }
    } catch (e) {
      print('Get offers error: $e');
    }
    return [];
  }

  // ========== Settings & Preferences APIs ==========

  /// Get user preferences (notification and privacy settings)
  static Future<Map<String, dynamic>?> getPreferences() async {
    if (_token == null) {
      print('Get preferences error: No token available');
      return null;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/preferences');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['preferences'];
      } else {
        print('Get preferences error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Get preferences error: $e');
    }
    return null;
  }

  /// Update notification preferences
  static Future<bool> updateNotificationPreferences(Map<String, dynamic> settings) async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/preferences/notifications');
      final response = await http.put(
        url,
        headers: _headers,
        body: jsonEncode(settings),
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Update notification preferences error: $e');
      return false;
    }
  }

  /// Update privacy preferences
  static Future<bool> updatePrivacySettings(Map<String, dynamic> settings) async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/preferences/privacy');
      final response = await http.put(
        url,
        headers: _headers,
        body: jsonEncode(settings),
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Update privacy settings error: $e');
      return false;
    }
  }

  /// Get user gym bookings/memberships
  static Future<List<Map<String, dynamic>>> getGymBookings() async {
    if (_token == null) {
      return [];
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/bookings/gym');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['bookings'] ?? []);
      }
    } catch (e) {
      print('Get gym bookings error: $e');
    }
    return [];
  }

  /// Get trial bookings
  static Future<List<Map<String, dynamic>>> getTrialBookings() async {
    if (_token == null) {
      return [];
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/bookings/trial');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['bookings'] ?? []);
      }
    } catch (e) {
      print('Get trial bookings error: $e');
    }
    return [];
  }

  /// Get trial booking limits
  static Future<Map<String, dynamic>?> getTrialLimits() async {
    if (_token == null) {
      return null;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/bookings/trial-limits');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['limits'];
      }
    } catch (e) {
      print('Get trial limits error: $e');
    }
    return null;
  }

  /// Get active memberships with full details
  static Future<List<Map<String, dynamic>>> getActiveMemberships() async {
    if (_token == null) {
      print('Get active memberships: No token available');
      return [];
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/memberships/active');
      print('Fetching active memberships from: $url');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      print('Active memberships response status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Active memberships data: ${data['count'] ?? 0} memberships found');
        return List<Map<String, dynamic>>.from(data['memberships'] ?? []);
      } else {
        print('Active memberships error response: ${response.body}');
      }
    } catch (e) {
      print('Get active memberships error: $e');
    }
    return [];
  }

  /// Get payment transactions history
  static Future<List<Map<String, dynamic>>> getTransactions() async {
    if (_token == null) {
      return [];
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/transactions');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['transactions'] ?? []);
      }
    } catch (e) {
      print('Get transactions error: $e');
    }
    return [];
  }

  /// Get user notifications
  static Future<List<Map<String, dynamic>>> getNotifications({int limit = 50, bool unreadOnly = false}) async {
    if (_token == null) {
      return [];
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/notifications?limit=$limit&unreadOnly=$unreadOnly');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['notifications'] ?? []);
      }
    } catch (e) {
      print('Get notifications error: $e');
    }
    return [];
  }

  /// Mark notification as read
  static Future<bool> markNotificationAsRead(String notificationId) async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/notifications/$notificationId/read');
      final response = await http.put(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Mark notification read error: $e');
      return false;
    }
  }

  /// Mark all notifications as read
  static Future<bool> markAllNotificationsAsRead() async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/notifications/read-all');
      final response = await http.put(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Mark all notifications read error: $e');
      return false;
    }
  }

  /// Delete notification
  static Future<bool> deleteNotification(String notificationId) async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/notifications/$notificationId');
      final response = await http.delete(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Delete notification error: $e');
      return false;
    }
  }

  /// Get unread notification count
  static Future<int> getUnreadNotificationCount() async {
    if (_token == null) {
      return 0;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/notifications/unread-count');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['count'] ?? 0;
      }
    } catch (e) {
      print('Get unread count error: $e');
    }
    return 0;
  }

  /// Poll for new notifications since a specific timestamp
  /// This is used for real-time notification updates
  static Future<Map<String, dynamic>> pollNotifications({String? since}) async {
    if (_token == null) {
      return {'notifications': [], 'unreadCount': 0};
    }
    
    try {
      final queryParams = since != null ? '?since=$since' : '';
      final url = Uri.parse(ApiConfig.baseUrl + '/notifications/poll$queryParams');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'notifications': data['notifications'] ?? [],
          'unreadCount': data['unreadCount'] ?? 0,
          'count': data['count'] ?? 0,
          'timestamp': data['timestamp'], // Server timestamp for next poll
        };
      }
    } catch (e) {
      print('Poll notifications error: $e');
    }
    return {'notifications': [], 'unreadCount': 0};
  }

  /// Mark notification as read
  static Future<bool> markNotificationRead(String notificationId) async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/notifications/$notificationId/read');
      final response = await http.put(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Mark notification read error: $e');
      return false;
    }
  }

  /// Mark all notifications as read
  static Future<bool> markAllNotificationsRead() async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/notifications/read-all');
      final response = await http.put(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Mark all notifications read error: $e');
      return false;
    }
  }

  /// Export user account data
  static Future<Map<String, dynamic>?> exportAccountData() async {
    if (_token == null) {
      return null;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/account/export-data');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'];
      }
    } catch (e) {
      print('Export account data error: $e');
    }
    return null;
  }

  /// Request account deletion
  static Future<bool> requestAccountDeletion(String reason) async {
    if (_token == null) {
      return false;
    }
    
    try {
      final url = Uri.parse(ApiConfig.baseUrl + '/user-settings/account/delete-request');
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'reason': reason}),
      ).timeout(const Duration(seconds: 30));

      return response.statusCode == 200;
    } catch (e) {
      print('Request account deletion error: $e');
      return false;
    }
  }

  // ========== Coupon APIs ==========

  /// Get available coupons for a gym
  static Future<List<Map<String, dynamic>>> getAvailableCoupons(String gymId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/offers/coupons/available?gymId=$gymId');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['coupons'] ?? []);
      }
      return [];
    } catch (e) {
      print('Get available coupons error: $e');
      return [];
    }
  }

  /// Validate a coupon code
  static Future<Map<String, dynamic>> validateCoupon({
    required String code,
    required String gymId,
    required double amount,
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/offers/coupons/validate/$code?gymId=$gymId&purchaseAmount=$amount');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'valid': data['valid'] ?? false,
          'coupon': data['coupon'],
          'discountDetails': data['discountDetails'],
        };
      } else {
        return {
          'valid': false,
          'message': data['message'] ?? 'Invalid coupon',
        };
      }
    } catch (e) {
      print('Validate coupon error: $e');
      return {
        'valid': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Apply coupon to get discount
  static Future<Map<String, dynamic>> applyCoupon({
    required String code,
    required String gymId,
    required double amount,
  }) async {
    try {
      final result = await validateCoupon(
        code: code,
        gymId: gymId,
        amount: amount,
      );
      
      if (result['valid'] == true && result['discountDetails'] != null) {
        final discount = result['discountDetails'];
        return {
          'success': true,
          'discountAmount': discount['discountAmount'] ?? 0.0,
          'finalAmount': discount['finalAmount'] ?? amount,
          'coupon': result['coupon'],
        };
      }
      
      return {
        'success': false,
        'message': result['message'] ?? 'Invalid coupon',
      };
    } catch (e) {
      print('Apply coupon error: $e');
      return {
        'success': false,
        'message': 'Error applying coupon: ${e.toString()}',
      };
    }
  }

  // ========== Password Reset APIs ==========

  /// Request password reset OTP
  static Future<Map<String, dynamic>> requestPasswordResetOTP(String email) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/users/request-password-reset-otp');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': data['success'] ?? true,
          'message': data['message'] ?? 'OTP sent to your email',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to send OTP',
        };
      }
    } catch (e) {
      print('Request password reset OTP error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Verify password reset OTP and reset password
  static Future<Map<String, dynamic>> verifyPasswordResetOTP({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/users/verify-password-reset-otp');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'otp': otp,
          'newPassword': newPassword,
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': data['success'] ?? true,
          'message': data['message'] ?? 'Password reset successful',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to reset password',
        };
      }
    } catch (e) {
      print('Verify password reset OTP error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // ========== Trial Booking APIs ==========

  /// Check if user can book trial at specific gym
  static Future<Map<String, dynamic>?> canBookTrialAtGym(String gymId) async {
    if (_token == null) {
      return null;
    }
    
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/user-settings/bookings/can-book-trial/$gymId');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data;
      }
    } catch (e) {
      print('Check trial eligibility error: $e');
    }
    return null;
  }

  /// Book a trial session at a gym
  static Future<Map<String, dynamic>> bookTrial({
    required String gymId,
    required String preferredDate,
    required String preferredTime,
    String sessionType = 'General Training',
  }) async {
    if (_token == null) {
      return {'success': false, 'message': 'Not authenticated'};
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final userEmail = prefs.getString('user_email') ?? '';
      final userName = prefs.getString('user_name') ?? '';
      final userPhone = prefs.getString('user_phone') ?? '';

      final url = Uri.parse('${ApiConfig.baseUrl}/trial-bookings');
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'name': userName,
          'email': userEmail,
          'phone': userPhone,
          'gymId': gymId,
          'sessionType': sessionType,
          'preferredDate': preferredDate,
          'preferredTime': preferredTime,
        }),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': data['success'] ?? true,
          'booking': data['booking'],
          'message': data['message'] ?? 'Trial booked successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to book trial',
        };
      }
    } catch (e) {
      print('Book trial error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // ========== User Membership APIs ==========

  /// Check if user has active membership at a specific gym
  static Future<Map<String, dynamic>> checkUserMembership(String gymId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/api/members/check-membership/$gymId');
      print('Checking membership at: $url');

      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      print('Membership check response: $data');

      if (response.statusCode == 200 && data['success'] == true) {
        if (data['hasActiveMembership'] == true && data['membership'] != null) {
          return {
            'success': true,
            'hasActiveMembership': true,
            'membership': UserMembership.fromJson(data['membership']),
          };
        } else {
          return {
            'success': true,
            'hasActiveMembership': false,
          };
        }
      } else {
        return {
          'success': false,
          'hasActiveMembership': false,
          'message': data['message'] ?? 'Failed to check membership',
        };
      }
    } catch (e) {
      print('Check membership error: $e');
      return {
        'success': false,
        'hasActiveMembership': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Submit a member problem report
  static Future<Map<String, dynamic>> submitMemberProblem(MemberProblemReport report) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/api/member-problems/submit');
      print('Submitting problem report to: $url');

      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(report.toJson()),
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      print('Problem report response: $data');

      if (response.statusCode == 201 && data['success'] == true) {
        return {
          'success': true,
          'reportId': data['reportId'],
          'message': data['message'] ?? 'Problem reported successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to submit problem report',
        };
      }
    } catch (e) {
      print('Submit problem error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get user's problem reports for a specific gym
  static Future<List<MemberProblemReport>> getMemberProblemReports(String gymId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/api/member-problems/my-reports/$gymId');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['reports'] != null) {
          return (data['reports'] as List)
              .map((r) => MemberProblemReport.fromJson(r))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Get problem reports error: $e');
      return [];
    }
  }

  // ========== USER SETTINGS ENDPOINTS ==========

  /// Get user settings (theme, language, app settings)
  static Future<Map<String, dynamic>?> getUserSettings() async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/user-settings/settings');
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return {
            'theme': data['theme'],
            'language': data['language'],
            'appSettings': data['appSettings'],
            'preferences': data['preferences'],
          };
        }
      }
      return null;
    } catch (e) {
      print('Get user settings error: $e');
      return null;
    }
  }

  /// Update user settings (theme, language, app settings)
  static Future<bool> updateUserSettings(Map<String, dynamic> settings) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/user-settings/settings');
      final response = await http.put(
        url,
        headers: _headers,
        body: jsonEncode(settings),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      print('Update user settings error: $e');
      return false;
    }
  }

  // ========== SUPPORT & HELP CENTER ENDPOINTS ==========

  /// Create a new support ticket
  static Future<Map<String, dynamic>> createSupportTicket({
    required String category,
    required String subject,
    required String message,
    String priority = 'medium',
    String? phone,
    bool emailUpdates = true,
    List<String> attachments = const [],
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.supportTickets}');
      print('Creating support ticket at: $url');
      
      final body = {
        'category': category,
        'subject': subject,
        'message': message,
        'priority': priority,
        'phone': phone,
        'emailUpdates': emailUpdates,
        'attachments': attachments,
        if (metadata != null) 'metadata': metadata,
      };
      
      print('Request body: ${jsonEncode(body)}');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(body),
      ).timeout(ApiConfig.timeout);

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Support ticket created successfully',
          'ticketId': data['ticketId'] ?? data['ticket']?['_id'],
          'ticket': data['ticket'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to create support ticket',
        };
      }
    } catch (e) {
      print('Create support ticket error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get user's support tickets
  static Future<Map<String, dynamic>> getUserSupportTickets({
    int page = 1,
    int limit = 10,
    String? status,
    String? priority,
  }) async {
    try {
      final queryParams = <String, String>{
        'page': page.toString(),
        'limit': limit.toString(),
      };
      
      if (status != null) queryParams['status'] = status;
      if (priority != null) queryParams['priority'] = priority;

      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.mySupportTickets}')
          .replace(queryParameters: queryParams);
      
      print('Getting support tickets from: $url');
      
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      print('Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'tickets': data['tickets'] ?? [],
          'pagination': data['pagination'] ?? {},
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch support tickets',
          'tickets': [],
        };
      }
    } catch (e) {
      print('Get support tickets error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
        'tickets': [],
      };
    }
  }

  /// Reply to a support ticket
  static Future<Map<String, dynamic>> replyToSupportTicket({
    required String ticketId,
    required String message,
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.replyToTicket(ticketId)}');
      
      print('Replying to ticket at: $url');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'message': message}),
      ).timeout(ApiConfig.timeout);

      print('Response status: ${response.statusCode}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Reply sent successfully',
          'ticket': data['ticket'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to send reply',
        };
      }
    } catch (e) {
      print('Reply to ticket error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get ticket details by ID
  static Future<Map<String, dynamic>> getSupportTicketDetails(String ticketId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.supportTicketById(ticketId)}');
      
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'ticket': data['ticket'],
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch ticket details',
        };
      }
    } catch (e) {
      print('Get ticket details error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Add message to existing ticket
  static Future<bool> addTicketMessage(String ticketId, String message) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/support/tickets/$ticketId/messages');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'message': message}),
      ).timeout(ApiConfig.timeout);

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('Add ticket message error: $e');
      return false;
    }
  }

  /// Get detailed ticket information including messages
  static Future<Map<String, dynamic>?> getTicketDetails(String ticketId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/support/tickets/$ticketId');
      
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['ticket'];
      }
      return null;
    } catch (e) {
      print('Get ticket details error: $e');
      return null;
    }
  }

  // ========== Geofence Attendance APIs ==========
  
  /// Mark attendance entry when user enters gym geofence
  static Future<Map<String, dynamic>> markGeofenceEntry(Map<String, dynamic> data) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/geofence-attendance/auto-mark/entry');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(data),
      ).timeout(ApiConfig.timeout);

      final responseData = jsonDecode(response.body);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          ...responseData,
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to mark entry',
        };
      }
    } catch (e) {
      print('Mark geofence entry error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Mark attendance exit when user leaves gym geofence
  static Future<Map<String, dynamic>> markGeofenceExit(Map<String, dynamic> data) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/geofence-attendance/auto-mark/exit');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(data),
      ).timeout(ApiConfig.timeout);

      final responseData = jsonDecode(response.body);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          ...responseData,
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to mark exit',
        };
      }
    } catch (e) {
      print('Mark geofence exit error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get today's attendance status
  static Future<Map<String, dynamic>> getTodayAttendance(String gymId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/geofence-attendance/today/$gymId');
      
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          ...data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch attendance',
        };
      }
    } catch (e) {
      print('Get today attendance error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Verify if user is inside geofence
  static Future<Map<String, dynamic>> verifyGeofence(Map<String, dynamic> data) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/geofence-attendance/verify');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode(data),
      ).timeout(ApiConfig.timeout);

      final responseData = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          ...responseData,
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to verify geofence',
        };
      }
    } catch (e) {
      print('Verify geofence error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // ========== GYM CHAT APIs ==========

  /// Send chat message to gym
  static Future<Map<String, dynamic>> sendChatMessage({
    required String gymId,
    required String message,
    String? quickMessage,
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/chat/send');
      print('Sending chat message to: $url');
      
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'gymId': gymId,
          'message': message,
          'quickMessage': quickMessage,
        }),
      ).timeout(ApiConfig.timeout);

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'chatId': data['chatId'],
          'ticketId': data['ticketId'],
          'messageCount': data['messageCount'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to send message',
        };
      }
    } catch (e) {
      print('Send chat message error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  /// Get chat history with gym
  static Future<Map<String, dynamic>> getChatHistory(String gymId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/chat/history/$gymId');
      print('Getting chat history from: $url');
      
      final response = await http.get(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      print('Response status: ${response.statusCode}');

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'chatId': data['chatId'],
          'ticketId': data['ticketId'],
          'status': data['status'],
          'messages': data['messages'] ?? [],
          'hasActiveChat': data['hasActiveChat'] ?? false,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch chat history',
          'messages': [],
        };
      }
    } catch (e) {
      print('Get chat history error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
        'messages': [],
      };
    }
  }

  /// Mark chat messages as read
  static Future<bool> markChatAsRead(String chatId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/chat/read/$chatId');
      
      final response = await http.put(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      return response.statusCode == 200 && data['success'] == true;
    } catch (e) {
      print('Mark chat as read error: $e');
      return false;
    }
  }

  /// Close chat conversation
  static Future<Map<String, dynamic>> closeChatConversation(String chatId) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/chat/close/$chatId');
      
      final response = await http.put(
        url,
        headers: _headers,
      ).timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'message': data['message'] ?? 'Chat closed successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to close chat',
        };
      }
    } catch (e) {
      print('Close chat error: $e');
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }
}