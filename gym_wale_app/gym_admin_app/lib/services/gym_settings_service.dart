import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'storage_service.dart';

class GymSettingsService {
  final Dio _dio;
  final StorageService _storage = StorageService();

  GymSettingsService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: ApiConfig.connectTimeout,
    receiveTimeout: ApiConfig.receiveTimeout,
    sendTimeout: ApiConfig.sendTimeout,
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
        options.headers['Content-Type'] = 'application/json';
        return handler.next(options);
      },
    ));
  }

  /// Get gym settings
  Future<Map<String, dynamic>> getGymSettings() async {
    try {
      final response = await _dio.get('/api/gym/settings');
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'settings': response.data['settings'] ?? {},
        };
      } else {
        throw Exception('Failed to load gym settings');
      }
    } catch (e) {
      throw Exception('Error fetching gym settings: $e');
    }
  }

  /// Update gym settings
  Future<Map<String, dynamic>> updateGymSettings({
    bool? allowMembershipFreezing,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (allowMembershipFreezing != null) {
        data['allowMembershipFreezing'] = allowMembershipFreezing;
      }

      final response = await _dio.put('/api/gym/settings', data: data);
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'message': response.data['message'] ?? 'Settings updated successfully',
          'settings': response.data['settings'] ?? {},
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to update settings');
      }
    } catch (e) {
      throw Exception('Error updating gym settings: $e');
    }
  }
}
