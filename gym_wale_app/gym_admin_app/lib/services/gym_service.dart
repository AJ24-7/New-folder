import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../models/gym_photo.dart';
import '../models/membership_plan.dart';
import '../models/gym_profile.dart';
import '../models/gym_activity.dart';
import '../config/api_config.dart';
import 'storage_service.dart';
import 'cloudinary_service.dart';

class GymService {
  final Dio _dio;
  final StorageService _storage = StorageService();
  final CloudinaryService _cloudinary = CloudinaryService();

  GymService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: ApiConfig.connectTimeout,
    receiveTimeout: ApiConfig.receiveTimeout,
    sendTimeout: ApiConfig.sendTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  )) {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  // ==================== GYM PHOTOS ====================

  /// Get all gym photos
  Future<List<GymPhoto>> getGymPhotos() async {
    try {
      final response = await _dio.get('/api/gyms/photos');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> photos = response.data['photos'] ?? [];
        return photos.map((json) => GymPhoto.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Error fetching gym photos: $e');
    }
  }

  /// Upload a new gym photo with Cloudinary
  Future<GymPhoto> uploadGymPhoto({
    required XFile photoFile,
    required String title,
    required String description,
    required String category,
  }) async {
    try {
      // Upload to Cloudinary first
      final imageUrl = await _cloudinary.uploadImageFromXFile(
        photoFile,
        folder: 'gym_wale/gym_photos',
      );

      // Create photo record in backend
      final response = await _dio.post(
        '/api/gyms/photos',
        data: {
          'title': title,
          'description': description,
          'category': category,
          'imageUrl': imageUrl,
        },
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return GymPhoto.fromJson(response.data['gymImage']);
      }
      throw Exception('Failed to upload gym photo');
    } catch (e) {
      throw Exception('Error uploading gym photo: $e');
    }
  }

  /// Update an existing gym photo
  Future<GymPhoto> updateGymPhoto({
    required String photoId,
    String? title,
    String? description,
    XFile? newPhotoFile,
  }) async {
    try {
      String? newImageUrl;
      
      // Upload new image to Cloudinary if provided
      if (newPhotoFile != null) {
        newImageUrl = await _cloudinary.uploadImageFromXFile(
          newPhotoFile,
          folder: 'gym_wale/gym_photos',
        );
      }

      final data = <String, dynamic>{};
      if (title != null) data['title'] = title;
      if (description != null) data['description'] = description;
      if (newImageUrl != null) data['imageUrl'] = newImageUrl;

      final response = await _dio.patch(
        '/api/gyms/photos/$photoId',
        data: data,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return GymPhoto.fromJson(response.data['photo']);
      }
      throw Exception('Failed to update gym photo');
    } catch (e) {
      throw Exception('Error updating gym photo: $e');
    }
  }

  /// Delete a gym photo
  Future<bool> deleteGymPhoto(String photoId) async {
    try {
      final response = await _dio.delete('/api/gyms/photos/$photoId');
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      throw Exception('Error deleting gym photo: $e');
    }
  }

  // ==================== GYM LOGO ====================

  /// Update gym logo
  Future<String> updateGymLogo(XFile logoFile) async {
    try {
      // Upload to Cloudinary
      final logoUrl = await _cloudinary.uploadImageFromXFile(
        logoFile,
        folder: 'gym_wale/gym_logos',
      );

      // Update in backend
      final response = await _dio.put(
        '/api/gyms/profile/me',
        data: {'logoUrl': logoUrl},
      );

      if (response.statusCode == 200) {
        return logoUrl;
      }
      throw Exception('Failed to update gym logo');
    } catch (e) {
      throw Exception('Error updating gym logo: $e');
    }
  }

  /// Get gym profile (includes logo)
  Future<Map<String, dynamic>> getGymProfile() async {
    try {
      final response = await _dio.get('/api/gyms/profile/me');
      if (response.statusCode == 200) {
        return response.data;
      }
      throw Exception('Failed to fetch gym profile');
    } catch (e) {
      throw Exception('Error fetching gym profile: $e');
    }
  }

  /// Get full gym profile with GymProfile model
  Future<GymProfile> getMyProfile() async {
    try {
      final response = await _dio.get('/api/gyms/profile/me');
      if (response.statusCode == 200) {
        return GymProfile.fromJson(response.data);
      }
      throw Exception('Failed to fetch gym profile');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized. Please login again.');
      }
      throw Exception('Error fetching gym profile: ${e.message}');
    } catch (e) {
      throw Exception('Error fetching gym profile: $e');
    }
  }

  /// Update gym profile  
  Future<GymProfile> updateMyProfile({
    required String currentPassword,
    String? gymName,
    String? email,
    String? phone,
    String? contactPerson,
    String? supportEmail,
    String? supportPhone,
    String? description,
    String? address,
    String? city,
    String? state,
    String? pincode,
    String? landmark,
    String? morningOpening,
    String? morningClosing,
    String? eveningOpening,
    String? eveningClosing,
    List<String>? activeDays,
    XFile? logoFile,
  }) async {
    try {
      // Upload logo to Cloudinary first if provided
      String? cloudinaryLogoUrl;
      if (logoFile != null) {
        cloudinaryLogoUrl = await _cloudinary.uploadImageFromXFile(
          logoFile,
          folder: 'gym_wale/gym_logos',
        );
      }

      // Prepare form data
      final Map<String, dynamic> data = {
        'currentPassword': currentPassword,
      };
      
      // Optional fields
      if (gymName != null) data['gymName'] = gymName;
      if (email != null) data['email'] = email;
      if (phone != null) data['phone'] = phone;
      if (contactPerson != null) data['contactPerson'] = contactPerson;
      if (supportEmail != null) data['supportEmail'] = supportEmail;
      if (supportPhone != null) data['supportPhone'] = supportPhone;
      if (description != null) data['description'] = description;
      if (address != null) data['address'] = address;
      if (city != null) data['city'] = city;
      if (state != null) data['state'] = state;
      if (pincode != null) data['pincode'] = pincode;
      if (landmark != null) data['landmark'] = landmark;
      
      // Operating hours - morning and evening slots
      if (morningOpening != null) data['morningOpening'] = morningOpening;
      if (morningClosing != null) data['morningClosing'] = morningClosing;
      if (eveningOpening != null) data['eveningOpening'] = eveningOpening;
      if (eveningClosing != null) data['eveningClosing'] = eveningClosing;

      // Active days
      if (activeDays != null) data['activeDays'] = activeDays;

      // Cloudinary logo URL
      if (cloudinaryLogoUrl != null) data['gymLogo'] = cloudinaryLogoUrl;

      final response = await _dio.put(
        '/api/gyms/profile/me',
        data: data,
      );

      if (response.statusCode == 200) {
        return GymProfile.fromJson(response.data['gym'] ?? response.data);
      }
      throw Exception('Failed to update gym profile');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final message = e.response?.data['message'] ?? 'Invalid current password';
        throw Exception(message);
      }
      if (e.response?.statusCode == 400) {
        final message = e.response?.data['message'] ?? 'Invalid data provided';
        throw Exception(message);
      }
      throw Exception('Error updating profile: ${e.message}');
    } catch (e) {
      throw Exception('Error updating gym profile: $e');
    }
  }

  // ==================== MEMBERSHIP PLANS ====================

  /// Get membership plan for the gym
  Future<MembershipPlan?> getMembershipPlans() async {
    try {
      final response = await _dio.get('/api/gyms/membership-plans');
      if (response.statusCode == 200 && response.data != null) {
        return MembershipPlan.fromJson(response.data);
      }
      return null;
    } catch (e) {
      throw Exception('Error fetching membership plan: $e');
    }
  }

  /// Update membership plan for the gym
  Future<MembershipPlan?> updateMembershipPlans(MembershipPlan plan) async {
    try {
      final response = await _dio.put(
        '/api/gyms/membership-plans',
        data: plan.toJson(),
      );

      if (response.statusCode == 200 && response.data != null) {
        return MembershipPlan.fromJson(response.data);
      }
      throw Exception('Failed to update membership plan');
    } catch (e) {
      throw Exception('Error updating membership plan: $e');
    }
  }

  // ==================== GYM ACTIVITIES ====================

  /// Get gym activities
  Future<List<GymActivity>> getGymActivities() async {
    try {
      final response = await _dio.get('/api/gyms/profile/me');
      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> activitiesData = response.data['activities'] ?? [];
        return activitiesData.map((json) => GymActivity.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Error fetching gym activities: $e');
    }
  }

  /// Update gym activities
  Future<List<GymActivity>> updateGymActivities(List<GymActivity> activities) async {
    try {
      final response = await _dio.put(
        '/api/gyms/activities',
        data: {
          'activities': activities.map((a) => a.toJson()).toList(),
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> activitiesData = response.data['activities'] ?? [];
        return activitiesData.map((json) => GymActivity.fromJson(json)).toList();
      }
      throw Exception('Failed to update gym activities');
    } catch (e) {
      throw Exception('Error updating gym activities: $e');
    }
  }
}
