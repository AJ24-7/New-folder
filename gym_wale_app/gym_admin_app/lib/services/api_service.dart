import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../models/dashboard_stats.dart';
import '../models/gym_profile.dart';
import '../models/trial_booking.dart';
import '../models/attendance_record.dart';
import '../models/attendance_stats.dart';
import '../models/attendance_settings.dart';
import 'storage_service.dart';

/// API Service for all admin operations
class ApiService {
  final Dio _dio;
  final StorageService _storage = StorageService();

  ApiService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: ApiConfig.connectTimeout,
    receiveTimeout: ApiConfig.receiveTimeout,
    sendTimeout: ApiConfig.sendTimeout,
  )) {
    _setupInterceptors();
  }

  // Callback for handling authentication errors
  static VoidCallback? _onAuthError;
  
  /// Set authentication error callback (called when token expires)
  static void setAuthErrorCallback(VoidCallback callback) {
    _onAuthError = callback;
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
          print('🔑 Token found and added to request: ${token.substring(0, 20)}...');
        } else {
          print('⚠️ No token found in storage');
        }
        options.headers['Content-Type'] = 'application/json';
        return handler.next(options);
      },
      onError: (error, handler) async {
        print('❌ API Error: ${error.response?.statusCode}');
        print('❌ Error Message: ${error.message}');
        print('❌ Error Data: ${error.response?.data}');
        
        if (error.response?.statusCode == 401) {
          print('🔓 401 Unauthorized - Token expired or invalid');
          
          // Check if error is due to JWT expiration
          final errorData = error.response?.data;
          final isTokenExpired = errorData is Map && 
              (errorData['error'] == 'invalid_token' || 
               errorData['details']?.toString().contains('expired') == true);
          
          if (isTokenExpired) {
            print('⏰ JWT Token has expired - triggering logout');
            
            // Clear all stored data
            await _storage.deleteToken();
            await _storage.deleteRefreshToken();
            await _storage.deleteUserData();
            
            // Trigger auth error callback to logout and redirect
            _onAuthError?.call();
          } else {
            print('⚠️ Invalid authentication - clearing storage');
            await _storage.deleteToken();
          }
        }
        return handler.next(error);
      },
    ));
  }

  // Dashboard
  Future<DashboardStats?> getDashboardStats() async {
    try {
      final response = await _dio.get(ApiConfig.dashboard);
      if (response.statusCode == 200 && response.data['success'] == true) {
        return DashboardStats.fromJson(response.data);
      }
      return null;
    } catch (e) {
      print('Error fetching dashboard stats: $e');
      return null;
    }
  }


  // Members
  Future<List<dynamic>> getAllMembers() async {
    try {
      final response = await _dio.get(ApiConfig.members);
      if (response.statusCode == 200) {
        return response.data['members'] ?? response.data ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Trainers
  Future<List<dynamic>> getAllTrainers() async {
    try {
      final response = await _dio.get(ApiConfig.trainers);
      if (response.statusCode == 200) {
        return response.data['trainers'] ?? response.data ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Payments
  Future<List<dynamic>> getAllPayments() async {
    try {
      final response = await _dio.get(ApiConfig.payments);
      if (response.statusCode == 200) {
        return response.data['payments'] ?? response.data ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Equipment
  Future<List<dynamic>> getAllEquipment() async {
    try {
      final response = await _dio.get(ApiConfig.equipment);
      if (response.statusCode == 200) {
        return response.data['equipment'] ?? response.data ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<bool> addEquipment(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(ApiConfig.equipment, data: data);
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateEquipment(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put(ApiConfig.equipmentById(id), data: data);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteEquipment(String id) async {
    try {
      final response = await _dio.delete(ApiConfig.equipmentById(id));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Offers & Coupons
  Future<List<dynamic>> getAllOffers() async {
    try {
      final response = await _dio.get(ApiConfig.offers);
      if (response.statusCode == 200) {
        return response.data['offers'] ?? response.data ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getAllCoupons() async {
    try {
      final response = await _dio.get(ApiConfig.coupons);
      if (response.statusCode == 200) {
        return response.data['coupons'] ?? response.data ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Notifications
  Future<List<dynamic>> getNotifications() async {
    try {
      final response = await _dio.get(ApiConfig.notifications);
      if (response.statusCode == 200) {
        return response.data['notifications'] ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Activities
  Future<List<dynamic>> getRecentActivities({int limit = 10}) async {
    try {
      final response = await _dio.get(
        ApiConfig.activities,
        queryParameters: {'limit': limit},
      );
      if (response.statusCode == 200) {
        return response.data['activities'] ?? [];
      }
      return [];
    } catch (e) {
      print('Error fetching recent activities: $e');
      return [];
    }
  }

  Future<bool> sendNotification(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(ApiConfig.sendNotification, data: data);
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  // Profile
  Future<Map<String, dynamic>?> getProfile() async {
    try {
      final response = await _dio.get(ApiConfig.profile);
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['admin'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    try {
      final response = await _dio.put(ApiConfig.updateProfile, data: data);
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.put(
        ApiConfig.changePassword,
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  // Gym Profile Management
  Future<GymProfile?> getGymProfile() async {
    try {
      final response = await _dio.get(ApiConfig.gymProfile);
      if (response.statusCode == 200) {
        return GymProfile.fromJson(response.data);
      }
      return null;
    } catch (e) {
      print('Error fetching gym profile: $e');
      return null;
    }
  }

  Future<bool> updateGymProfile(Map<String, dynamic> data) async {
    try {
      final response = await _dio.put(ApiConfig.updateGymProfile, data: data);
      return response.statusCode == 200;
    } catch (e) {
      print('Error updating gym profile: $e');
      return false;
    }
  }

  Future<String?> uploadGymLogo(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'logo': await MultipartFile.fromFile(filePath),
      });
      
      final response = await _dio.post(ApiConfig.uploadGymLogo, data: formData);
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['logoUrl'];
      }
      return null;
    } catch (e) {
      print('Error uploading gym logo: $e');
      return null;
    }
  }

  Future<bool> changeGymPassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.post(
        ApiConfig.changeGymPassword,
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error changing password: $e');
      return false;
    }
  }

  // Members Management
  Future<Map<String, dynamic>?> getMemberById(String id) async {
    try {
      final response = await _dio.get(ApiConfig.memberById(id));
      if (response.statusCode == 200) {
        return response.data['member'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> addMember(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(ApiConfig.members, data: data);
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateMember(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put(ApiConfig.memberById(id), data: data);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteMember(String id) async {
    try {
      final response = await _dio.delete(ApiConfig.memberById(id));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ============== ATTENDANCE MANAGEMENT ==============
  
  /// Get attendance records for a specific date
  Future<List<AttendanceRecord>> getAttendanceByDate(DateTime date) async {
    try {
      final dateStr = date.toIso8601String().split('T')[0];
      final response = await _dio.get('${ApiConfig.attendance}/$dateStr');
      
      if (response.statusCode == 200) {
        final data = response.data;
        final attendanceList = data['attendance'] ?? data ?? [];
        return (attendanceList as List)
            .map((json) => AttendanceRecord.fromJson(json))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error fetching attendance by date: $e');
      return [];
    }
  }

  /// Get attendance summary for a date range
  Future<Map<String, dynamic>?> getAttendanceSummary({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final startStr = startDate.toIso8601String().split('T')[0];
      final endStr = endDate.toIso8601String().split('T')[0];
      
      final response = await _dio.get(
        '${ApiConfig.attendance}/summary/$startStr/$endStr',
      );
      
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      print('Error fetching attendance summary: $e');
      return null;
    }
  }

  /// Get monthly attendance statistics
  Future<AttendanceStats?> getMonthlyAttendanceStats({
    required int month,
    required int year,
  }) async {
    try {
      final response = await _dio.get(
        '${ApiConfig.attendance}/stats/$month/$year',
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return AttendanceStats.fromJson(response.data);
      }
      return null;
    } catch (e) {
      print('Error fetching monthly attendance stats: $e');
      return null;
    }
  }

  /// Get member attendance history
  Future<Map<String, dynamic>?> getMemberAttendanceHistory(
    String memberId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await _dio.get(
        '${ApiConfig.attendance}/history/$memberId',
        queryParameters: queryParams,
      );
      
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      print('Error fetching member attendance history: $e');
      return null;
    }
  }

  /// Mark attendance manually for a member
  Future<bool> markAttendance({
    required String memberId,
    String status = 'present',
    String? checkInTime,
    String? checkOutTime,
    String? notes,
  }) async {
    try {
      final response = await _dio.post(
        ApiConfig.attendance,
        data: {
          'memberId': memberId,
          'status': status,
          'checkInTime': checkInTime,
          'checkOutTime': checkOutTime,
          'notes': notes,
          'attendanceType': 'manual',
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('Error marking attendance: $e');
      return false;
    }
  }

  /// Mark bulk attendance
  Future<Map<String, dynamic>?> markBulkAttendance({
    required List<Map<String, dynamic>> attendanceData,
  }) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.attendance}/bulk',
        data: {'attendance': attendanceData},
      );
      
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      print('Error marking bulk attendance: $e');
      return null;
    }
  }

  /// Update attendance record
  Future<bool> updateAttendance({
    required String attendanceId,
    String? status,
    String? checkInTime,
    String? checkOutTime,
    String? notes,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (status != null) data['status'] = status;
      if (checkInTime != null) data['checkInTime'] = checkInTime;
      if (checkOutTime != null) data['checkOutTime'] = checkOutTime;
      if (notes != null) data['notes'] = notes;

      final response = await _dio.put(
        '${ApiConfig.attendance}/$attendanceId',
        data: data,
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error updating attendance: $e');
      return false;
    }
  }

  /// Delete attendance record
  Future<bool> deleteAttendance(String attendanceId) async {
    try {
      final response = await _dio.delete(
        '${ApiConfig.attendance}/$attendanceId',
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error deleting attendance: $e');
      return false;
    }
  }

  /// Get rush hour analysis
  Future<Map<String, dynamic>?> getRushHourAnalysis({
    int days = 7,
  }) async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) return null;

      final response = await _dio.get(
        '${ApiConfig.attendance}/rush-analysis/${gymProfile.id}',
        queryParameters: {'days': days},
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data;
      }
      return null;
    } catch (e) {
      print('Error fetching rush hour analysis: $e');
      return null;
    }
  }

  /// Get attendance settings
  Future<AttendanceSettings?> getAttendanceSettings() async {
    try {
      final response = await _dio.get('${ApiConfig.attendance}/settings');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return AttendanceSettings.fromJson(response.data['settings']);
      }
      return null;
    } catch (e) {
      print('Error fetching attendance settings: $e');
      
      // Return default settings on error
      final gymProfile = await getGymProfile();
      if (gymProfile != null) {
        return AttendanceSettings(
          gymId: gymProfile.id,
          mode: AttendanceMode.manual,
          autoMarkEnabled: false,
          requireCheckOut: false,
          allowLateCheckIn: true,
          sendNotifications: false,
          trackDuration: true,
          lateThresholdMinutes: 15,
        );
      }
      return null;
    }
  }

  /// Update attendance settings
  Future<bool> updateAttendanceSettings(AttendanceSettings settings) async {
    try {
      final response = await _dio.put(
        '${ApiConfig.attendance}/settings',
        data: settings.toJson(),
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        print('Attendance settings updated successfully');
        return true;
      }
      return false;
    } catch (e) {
      print('Error updating attendance settings: $e');
      return false;
    }
  }
  
  /// Reset attendance settings to default
  Future<bool> resetAttendanceSettings() async {
    try {
      final response = await _dio.post('${ApiConfig.attendance}/settings/reset');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        print('Attendance settings reset successfully');
        return true;
      }
      return false;
    } catch (e) {
      print('Error resetting attendance settings: $e');
      return false;
    }
  }

  // ============== GEOFENCE ATTENDANCE ==============
  
  /// Verify geofence location
  Future<Map<String, dynamic>?> verifyGeofence({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) return null;

      final response = await _dio.post(
        '${ApiConfig.geofenceAttendance}/verify',
        data: {
          'gymId': gymProfile.id,
          'latitude': latitude,
          'longitude': longitude,
        },
      );
      
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      print('Error verifying geofence: $e');
      return null;
    }
  }

  /// Get geofence attendance history
  Future<List<dynamic>> getGeofenceAttendanceHistory({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) return [];

      final queryParams = <String, dynamic>{};
      if (startDate != null) {
        queryParams['startDate'] = startDate.toIso8601String();
      }
      if (endDate != null) {
        queryParams['endDate'] = endDate.toIso8601String();
      }

      final response = await _dio.get(
        '${ApiConfig.geofenceAttendance}/history/${gymProfile.id}',
        queryParameters: queryParams,
      );
      
      if (response.statusCode == 200) {
        return response.data['attendance'] ?? [];
      }
      return [];
    } catch (e) {
      print('Error fetching geofence attendance history: $e');
      return [];
    }
  }

  /// Get geofence configuration
  Future<Map<String, dynamic>?> getGeofenceConfig() async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) {
        print('No gym profile found');
        return null;
      }

      final response = await _dio.get(
        ApiConfig.geofenceConfig,
        queryParameters: {'gymId': gymProfile.id},
      );

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data['config'] ?? response.data,
        };
      }
      return null;
    } catch (e) {
      print('Error fetching geofence config: $e');
      return null;
    }
  }

  /// Save geofence configuration
  Future<Map<String, dynamic>?> saveGeofenceConfig(Map<String, dynamic> config) async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) {
        print('No gym profile found');
        return null;
      }

      final payload = {
        ...config,
        'gymId': gymProfile.id,
      };

      final response = await _dio.post(
        ApiConfig.geofenceConfig,
        data: payload,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'message': response.data['message'] ?? 'Geofence saved successfully',
          'data': response.data['config'] ?? response.data,
        };
      }
      return {
        'success': false,
        'message': response.data['message'] ?? 'Failed to save geofence',
      };
    } catch (e) {
      print('Error saving geofence config: $e');
      return {
        'success': false,
        'message': 'Error saving geofence: $e',
      };
    }
  }

  /// Delete geofence configuration
  Future<bool> deleteGeofenceConfig() async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) {
        print('No gym profile found');
        return false;
      }

      final response = await _dio.delete(
        ApiConfig.geofenceConfig,
        queryParameters: {'gymId': gymProfile.id},
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error deleting geofence config: $e');
      return false;
    }
  }

  // Trainer Management
  Future<bool> addTrainer(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(ApiConfig.trainers, data: data);
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateTrainer(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put(ApiConfig.trainerById(id), data: data);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteTrainer(String id) async {
    try {
      final response = await _dio.delete(ApiConfig.trainerById(id));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Payment Management
  Future<bool> recordPayment(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(ApiConfig.payments, data: data);
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      print('Error recording payment: $e');
      return false;
    }
  }

  // QR Code Generation
  Future<Map<String, dynamic>?> getGymQRData() async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile != null) {
        return {
          'gymId': gymProfile.id,
          'gymName': gymProfile.gymName,
          'type': 'gym',
        };
      }
      return null;
    } catch (e) {
      print('Error getting QR data: $e');
      return null;
    }
  }

  // Trial Bookings Management
  Future<Map<String, dynamic>?> getTrialBookings({
    int page = 1,
    int limit = 50,
    String? status,
    String? dateFilter,
    String? search,
  }) async {
    try {
      final gymProfile = await getGymProfile();
      if (gymProfile == null) {
        print('Error: Unable to fetch gym profile');
        return null;
      }

      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (status != null && status.isNotEmpty) queryParams['status'] = status;
      if (dateFilter != null && dateFilter.isNotEmpty) queryParams['dateFilter'] = dateFilter;
      if (search != null && search.isNotEmpty) queryParams['search'] = search;

      final response = await _dio.get(
        '/api/gyms/trial-bookings/${gymProfile.id}',
        queryParameters: queryParams,
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        final bookings = (response.data['bookings'] as List)
            .map((json) => TrialBooking.fromJson(json))
            .toList();
        
        return {
          'bookings': bookings,
          'total': response.data['total'],
          'totalPages': response.data['totalPages'],
          'currentPage': response.data['currentPage'],
        };
      }
      return null;
    } catch (e) {
      print('Error fetching trial bookings: $e');
      return null;
    }
  }

  Future<bool> updateTrialBookingStatus(String bookingId, String status) async {
    try {
      final response = await _dio.put(
        '/api/gyms/trial-bookings/$bookingId/status',
        data: {'status': status},
      );
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      print('Error updating trial booking status: $e');
      return false;
    }
  }

  Future<bool> confirmTrialBooking(
    String bookingId, {
    bool sendEmail = true,
    bool sendWhatsApp = false,
    String additionalMessage = '',
  }) async {
    try {
      final response = await _dio.put(
        '/api/gyms/trial-bookings/$bookingId/confirm',
        data: {
          'sendEmail': sendEmail,
          'sendWhatsApp': sendWhatsApp,
          'additionalMessage': additionalMessage,
        },
      );
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (e) {
      print('Error confirming trial booking: $e');
      return false;
    }
  }
}
