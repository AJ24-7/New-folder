import 'dart:convert';
import 'dart:io' show Platform;
import 'package:device_info_plus/device_info_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:image_picker/image_picker.dart';
import '../config/api_config.dart';
import '../models/admin.dart';
import 'storage_service.dart';

/// Authentication Service for admin login and session management
class AuthService {
  final Dio _dio;
  final StorageService _storage = StorageService();

  AuthService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: ApiConfig.connectTimeout,
    receiveTimeout: ApiConfig.receiveTimeout,
    sendTimeout: ApiConfig.sendTimeout,
    headers: {
      'Content-Type': 'application/json',
    },
  )) {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add auth token to requests
        final token = await _storage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        // Debug logging
        debugPrint('🔵 Request: ${options.method} ${options.uri}');
        debugPrint('🔵 Headers: ${options.headers}');
        debugPrint('🔵 Data: ${options.data}');
        return handler.next(options);
      },
      onResponse: (response, handler) {
        debugPrint('✅ Response: ${response.statusCode} ${response.requestOptions.uri}');
        return handler.next(response);
      },
      onError: (error, handler) async {
        debugPrint('❌ Error: ${error.response?.statusCode} ${error.requestOptions.uri}');
        debugPrint('❌ Message: ${error.message}');
        debugPrint('❌ Response: ${error.response?.data}');
        
        // Handle 401 errors and refresh token
        if (error.response?.statusCode == 401) {
          try {
            await refreshToken();
            // Retry the request
            final opts = Options(
              method: error.requestOptions.method,
              headers: error.requestOptions.headers,
            );
            final response = await _dio.request(
              error.requestOptions.path,
              options: opts,
              data: error.requestOptions.data,
              queryParameters: error.requestOptions.queryParameters,
            );
            return handler.resolve(response);
          } catch (e) {
            // Refresh failed, logout user
            await logout();
            return handler.next(error);
          }
        }
        return handler.next(error);
      },
    ));
  }

  /// Generate device fingerprint
  Future<String> _generateDeviceFingerprint() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      String fingerprint = '';

      if (kIsWeb) {
        final webInfo = await deviceInfo.webBrowserInfo;
        fingerprint = '${webInfo.browserName}-${webInfo.userAgent?.hashCode ?? 'unknown'}-web';
      } else {
        if (Platform.isAndroid) {
          final androidInfo = await deviceInfo.androidInfo;
          fingerprint = '${androidInfo.model}-${androidInfo.id}-android';
        } else if (Platform.isIOS) {
          final iosInfo = await deviceInfo.iosInfo;
          fingerprint = '${iosInfo.model}-${iosInfo.identifierForVendor}-ios';
        } else if (Platform.isWindows) {
          final windowsInfo = await deviceInfo.windowsInfo;
          fingerprint = '${windowsInfo.computerName}-windows';
        } else if (Platform.isMacOS) {
          final macInfo = await deviceInfo.macOsInfo;
          fingerprint = '${macInfo.model}-macos';
        } else if (Platform.isLinux) {
          final linuxInfo = await deviceInfo.linuxInfo;
          fingerprint = '${linuxInfo.name}-linux';
        }
      }

      await _storage.saveDeviceFingerprint(fingerprint);
      return fingerprint;
    } catch (e) {
      debugPrint('⚠️ Error generating device fingerprint: $e');
      return 'unknown-device';
    }
  }

  /// Get Device Info
  Future<Map<String, dynamic>> _getDeviceInfo() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      String browser = 'Flutter App';
      String os = 'Unknown';
      String userAgent = '';
      String platform = '';

      if (kIsWeb) {
        final webInfo = await deviceInfo.webBrowserInfo;
        browser = webInfo.browserName.toString();
        os = webInfo.platform ?? 'Web';
        platform = 'Web';
        userAgent = webInfo.userAgent ?? 'Flutter/Web';
      } else {
        if (Platform.isAndroid) {
          final androidInfo = await deviceInfo.androidInfo;
          os = 'Android ${androidInfo.version.release}';
          platform = 'Android';
          userAgent = 'Flutter/${androidInfo.model}';
        } else if (Platform.isIOS) {
          final iosInfo = await deviceInfo.iosInfo;
          os = 'iOS ${iosInfo.systemVersion}';
          platform = 'iOS';
          userAgent = 'Flutter/${iosInfo.model}';
        } else if (Platform.isWindows) {
          await deviceInfo.windowsInfo; // Get device info but don't need to store
          os = 'Windows';
          platform = 'Windows';
          userAgent = 'Flutter/Windows';
        } else if (Platform.isMacOS) {
          await deviceInfo.macOsInfo; // Get device info but don't need to store
          os = 'MacOS';
          platform = 'MacOS';
          userAgent = 'Flutter/MacOS';
        } else if (Platform.isLinux) {
          await deviceInfo.linuxInfo; // Get device info but don't need to store
          os = 'Linux';
          platform = 'Linux';
          userAgent = 'Flutter/Linux';
        }
      }

      return {
        'userAgent': userAgent,
        'browser': browser,
        'os': os,
        'platform': platform,
        'timezone': DateTime.now().timeZoneName,
      };
    } catch (e) {
      debugPrint('⚠️ Error getting device info: $e');
      return {
        'userAgent': 'Unknown',
        'browser': 'Flutter App',
        'os': 'Unknown',
        'platform': kIsWeb ? 'Web' : 'Unknown',
        'timezone': DateTime.now().timeZoneName,
      };
    }
  }

  /// Get Location Info
  Future<Map<String, dynamic>> _getLocationInfo() async {
    try {
      // Return default location info for mobile apps
      // In a real app, you could use geolocator package for actual location
      return {
        'latitude': null,
        'longitude': null,
        'city': 'Unknown',
        'country': 'Unknown',
        'method': 'mobile-app',
      };
    } catch (e) {
      return {
        'latitude': null,
        'longitude': null,
        'city': 'Unknown',
        'country': 'Unknown',
        'method': 'error',
      };
    }
  }

  /// Login
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    try {
      debugPrint('🔐 Starting login for: $email');
      
      // Get device info and location info like in admin-login.js
      final deviceFingerprint = await _generateDeviceFingerprint();
      final deviceInfo = await _getDeviceInfo();
      final locationInfo = await _getLocationInfo();

      debugPrint('📱 Device fingerprint: $deviceFingerprint');
      debugPrint('📱 Device info: $deviceInfo');

      final response = await _dio.post(
        ApiConfig.login,
        data: {
          'email': email,
          'password': password,
          'deviceInfo': {
            'userAgent': deviceInfo['userAgent'],
            'browser': deviceInfo['browser'],
            'os': deviceInfo['os'],
            'timezone': deviceInfo['timezone'],
          },
          'locationInfo': {
            'latitude': locationInfo['latitude'],
            'longitude': locationInfo['longitude'],
            'city': locationInfo['city'],
            'country': locationInfo['country'],
          },
          'deviceFingerprint': deviceFingerprint,
        },
      );

      debugPrint('✅ Login response status: ${response.statusCode}');
      debugPrint('✅ Login response data: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data;

        // Check if 2FA is required
        if (data['requires2FA'] == true) {
          debugPrint('🔐 2FA required, tempToken: ${data['tempToken']?.substring(0, 20)}...');
          return {
            'success': true,
            'requires2FA': true,
            'tempToken': data['tempToken'],
            'message': data['message'],
            'email': email, // Include email for resend functionality
          };
        }

        // Save tokens
        if (data['token'] != null) {
          await _storage.saveToken(data['token']);
          debugPrint('✅ Token saved');
        } else {
          debugPrint('⚠️ No token in response');
        }
        
        if (data['refreshToken'] != null) {
          await _storage.saveRefreshToken(data['refreshToken']);
          debugPrint('✅ Refresh token saved');
        }

        // Save admin data
        if (data['admin'] != null) {
          debugPrint('✅ Admin data found: ${data['admin']}');
          final admin = Admin.fromJson(data['admin']);
          await _storage.saveUserData(jsonEncode(admin.toJson()));
          debugPrint('✅ Admin data saved');
        } else {
          debugPrint('⚠️ No admin data in response');
        }

        // Save gymId if present
        if (data['gymId'] != null) {
          await _storage.saveGymId(data['gymId']);
          debugPrint('✅ Gym ID saved: ${data['gymId']}');
        }

        // Save token expiry duration from backend response
        final tokenExpiresInMinutes = data['tokenExpiresInMinutes'] as int?;
        if (tokenExpiresInMinutes != null && tokenExpiresInMinutes > 0) {
          await _storage.saveSessionTimeoutDuration(tokenExpiresInMinutes);
          debugPrint('✅ Token expiry saved: $tokenExpiresInMinutes minutes');
        }

        await _storage.saveRememberMe(rememberMe);

        return {
          'success': true,
          'admin': data['admin'],
          'token': data['token'],
          'gymId': data['gymId'],
          'tokenExpiresInMinutes': tokenExpiresInMinutes,
        };
      } else {
        debugPrint('❌ Login failed: ${response.data}');
        return {
          'success': false,
          'message': response.data['message'] ?? 'Login failed',
        };
      }
    } on DioException catch (e) {
      debugPrint('❌ DioException in login: ${e.message}');
      debugPrint('❌ Response: ${e.response?.data}');
      debugPrint('❌ Status code: ${e.response?.statusCode}');
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Network error occurred',
      };
    } catch (e) {
      debugPrint('❌ Exception in login: $e');
      debugPrint('❌ Stack trace: ${StackTrace.current}');
      return {
        'success': false,
        'message': 'An unexpected error occurred',
      };
    }
  }

  /// Register Gym (new gym admin onboarding)
  Future<Map<String, dynamic>> registerGym({
    required Map<String, dynamic> payload,
    XFile? logoFile,
    List<XFile>? gymImages,
  }) async {
    try {
      final hasUploads = logoFile != null || (gymImages != null && gymImages.isNotEmpty);

      dynamic requestBody = payload;
      Options? requestOptions;

      if (hasUploads) {
        final formMap = <String, dynamic>{...payload};

        if (logoFile != null) {
          final logoBytes = await logoFile.readAsBytes();
          formMap['logo'] = MultipartFile.fromBytes(
            logoBytes,
            filename: logoFile.name,
          );
        }

        if (gymImages != null && gymImages.isNotEmpty) {
          final files = <MultipartFile>[];
          for (final image in gymImages) {
            final bytes = await image.readAsBytes();
            files.add(
              MultipartFile.fromBytes(
                bytes,
                filename: image.name,
              ),
            );
          }
          formMap['gymImages'] = files;
        }

        requestBody = FormData.fromMap(formMap);
        requestOptions = Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        );
      }

      final response = await _dio.post(
        ApiConfig.registerGym,
        data: requestBody,
        options: (requestOptions ?? Options()).copyWith(
          // Gym registration can take longer because image upload, cloud storage,
          // DB writes, notifications, and email happen in one request.
          sendTimeout: const Duration(minutes: 2),
          receiveTimeout: const Duration(minutes: 2),
        ),
      );

      final data = response.data is Map<String, dynamic>
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{};

      final statusCode = response.statusCode ?? 0;
      final isHttpSuccess = statusCode >= 200 && statusCode < 300;
      final successField = data['success'];
      final statusField = (data['status'] ?? '').toString().toLowerCase();
      final messageField = (data['message'] ?? '').toString().toLowerCase();

      final hasSuccessSignal = successField == true ||
          successField == 'true' ||
          statusField == 'pending' ||
          statusField == 'success' ||
          messageField.contains('submitted') ||
          messageField.contains('success');

      final isSuccess = isHttpSuccess && (hasSuccessSignal || data.isNotEmpty);

      return {
        'success': isSuccess,
        'status': data['status'],
        'message': data['message'] ?? 'Registration submitted successfully',
      };
    } on DioException catch (e) {
      final message = e.response?.data is Map<String, dynamic>
          ? (e.response?.data['message'] ?? 'Registration failed').toString()
          : 'Registration failed';

      // If backend processing exceeded client wait time, the submission may still be saved.
      // Treat receive timeout as pending success to avoid duplicate resubmits.
      if (e.type == DioExceptionType.receiveTimeout) {
        return {
          'success': true,
          'status': 'pending',
          'message':
              'Registration submitted and is being processed. If you already received confirmation, please do not resubmit.',
        };
      }

      // Common when first request actually succeeded but user retries after timeout.
      final normalizedMessage = message.toLowerCase();
      if (normalizedMessage.contains('already exists') &&
          normalizedMessage.contains('email or phone')) {
        return {
          'success': true,
          'status': 'pending',
          'message':
              'Registration already submitted for this email/phone and is likely pending admin approval.',
        };
      }

      return {
        'success': false,
        'message': message,
      };
    } catch (_) {
      return {
        'success': false,
        'message': 'An unexpected error occurred during registration',
      };
    }
  }

  /// Verify 2FA
  Future<Map<String, dynamic>> verify2FA({
    required String tempToken,
    required String code,
  }) async {
    try {
      debugPrint('🔐 Verifying 2FA code...');
      debugPrint('🔐 Temp token: ${tempToken.substring(0, 20)}...');
      debugPrint('🔐 Code length: ${code.length}');
      
      // Match admin-login.js: use 'otp' instead of 'code' and set Authorization header
      final response = await _dio.post(
        ApiConfig.verify2FA,
        data: {
          'otp': code,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $tempToken',
          },
        ),
      );

      debugPrint('✅ 2FA Response status: ${response.statusCode}');
      debugPrint('✅ 2FA Response data: ${response.data}');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data;

        // Save tokens
        if (data['token'] != null) {
          await _storage.saveToken(data['token']);
          debugPrint('✅ Token saved');
        } else {
          debugPrint('⚠️ No token in response');
        }
        
        if (data['refreshToken'] != null) {
          await _storage.saveRefreshToken(data['refreshToken']);
          debugPrint('✅ Refresh token saved');
        }

        // Save admin data
        if (data['admin'] != null) {
          debugPrint('✅ Admin data found: ${data['admin']}');
          final admin = Admin.fromJson(data['admin']);
          await _storage.saveUserData(jsonEncode(admin.toJson()));
          debugPrint('✅ Admin data saved');
        } else {
          debugPrint('⚠️ No admin data in response');
        }

        // Save gymId if present
        if (data['gymId'] != null) {
          await _storage.saveGymId(data['gymId']);
          debugPrint('✅ Gym ID saved: ${data['gymId']}');
        }

        // Save token expiry duration from backend response
        final tokenExpiresInMinutes = data['tokenExpiresInMinutes'] as int?;
        if (tokenExpiresInMinutes != null && tokenExpiresInMinutes > 0) {
          await _storage.saveSessionTimeoutDuration(tokenExpiresInMinutes);
          debugPrint('✅ Token expiry saved: $tokenExpiresInMinutes minutes');
        }

        return {
          'success': true,
          'admin': data['admin'],
          'token': data['token'],
          'gymId': data['gymId'],
          'tokenExpiresInMinutes': tokenExpiresInMinutes,
        };
      } else {
        debugPrint('❌ 2FA verification failed: ${response.data}');
        return {
          'success': false,
          'message': response.data['message'] ?? '2FA verification failed',
        };
      }
    } on DioException catch (e) {
      debugPrint('❌ DioException in verify2FA: ${e.message}');
      debugPrint('❌ Response: ${e.response?.data}');
      debugPrint('❌ Status code: ${e.response?.statusCode}');
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Verification failed',
      };
    } catch (e) {
      debugPrint('❌ Exception in verify2FA: $e');
      debugPrint('❌ Stack trace: ${StackTrace.current}');
      return {
        'success': false,
        'message': 'An error occurred during 2FA verification',
      };
    }
  }

  /// Resend 2FA Code
  Future<Map<String, dynamic>> resend2FA(String email) async {
    try {
      final response = await _dio.post(
        ApiConfig.resend2FA,
        data: {'email': email},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'message': response.data['message'] ?? 'Code sent successfully',
        };
      } else {
        return {
          'success': false,
          'message': response.data['message'] ?? 'Failed to resend code',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Network error occurred',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'An unexpected error occurred',
      };
    }
  }

  /// Refresh Token — calls the gym admin refresh-token endpoint with the current JWT.
  /// The backend issues a new token with the same session timeout.
  Future<bool> refreshToken() async {
    try {
      final currentToken = await _storage.getToken();
      if (currentToken == null) return false;

      final response = await _dio.post(
        ApiConfig.refreshToken,
        options: Options(
          headers: {
            'Authorization': 'Bearer $currentToken',
          },
        ),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        await _storage.saveToken(response.data['token']);
        final expiresInMinutes = response.data['tokenExpiresInMinutes'] as int?;
        if (expiresInMinutes != null && expiresInMinutes > 0) {
          await _storage.saveSessionTimeoutDuration(expiresInMinutes);
        }
        debugPrint('🔄 Token refreshed, expires in $expiresInMinutes minutes');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('❌ Token refresh failed: $e');
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    // No API call needed - backend doesn't have logout endpoint
    // Just clear local storage (token, admin data, etc.)
    await _storage.clearAll();
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await _storage.getToken();
    return token != null;
  }

  /// Get current admin
  Future<Admin?> getCurrentAdmin() async {
    final userData = _storage.getUserData();
    if (userData == null) return null;
    
    try {
      final json = jsonDecode(userData);
      return Admin.fromJson(json);
    } catch (e) {
      return null;
    }
  }

  /// Request Password Reset OTP
  Future<Map<String, dynamic>> requestPasswordOTP(String email) async {
    try {
      final response = await _dio.post(
        ApiConfig.requestPasswordOTP,
        data: {'email': email},
      );

      return {
        'success': response.data['success'] ?? false,
        'message': response.data['message'] ?? 'Request processed',
        'email': response.data['email'],
      };
    } on DioException catch (e) {
      debugPrint('OTP Request Error: ${e.response?.statusCode} - ${e.message}');
      debugPrint('URL: ${e.requestOptions.uri}');
      debugPrint('Response: ${e.response?.data}');
      
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 
                   'Error ${e.response?.statusCode ?? 'occurred'}: ${e.message}',
        'statusCode': e.response?.statusCode,
      };
    } catch (e) {
      debugPrint('Unexpected error in requestPasswordOTP: $e');
      return {
        'success': false,
        'message': 'An unexpected error occurred: $e',
      };
    }
  }

  /// Verify OTP and Reset Password
  Future<Map<String, dynamic>> verifyOTPAndResetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.post(
        ApiConfig.verifyPasswordOTP,
        data: {
          'email': email,
          'otp': otp,
          'newPassword': newPassword,
        },
      );

      return {
        'success': response.data['success'] ?? false,
        'message': response.data['message'] ?? 'Request processed',
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'An error occurred',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'An unexpected error occurred',
      };
    }
  }

  /// Get Session Timeout Settings
  Future<Map<String, dynamic>> getSessionTimeout() async {
    try {
      final response = await _dio.get('/api/gyms/security/session-timeout');
      
      if (response.data['success'] == true) {
        return {
          'success': true,
          'timeoutMinutes': response.data['data']['timeoutMinutes'] ?? 30,
          'enabled': response.data['data']['enabled'] ?? true,
        };
      } else {
        return {
          'success': false,
          'message': response.data['message'] ?? 'Failed to get session timeout',
          'timeoutMinutes': 30, // Default fallback
          'enabled': true,
        };
      }
    } on DioException catch (e) {
      debugPrint('Get Session Timeout Error: ${e.response?.statusCode} - ${e.message}');
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'An error occurred',
        'timeoutMinutes': 30, // Default fallback
        'enabled': true,
      };
    } catch (e) {
      debugPrint('Unexpected error in getSessionTimeout: $e');
      return {
        'success': false,
        'message': 'An unexpected error occurred',
        'timeoutMinutes': 30, // Default fallback
        'enabled': true,
      };
    }
  }

  /// Update Session Timeout Settings
  Future<Map<String, dynamic>> updateSessionTimeout({
    required int timeoutMinutes,
    bool? enabled,
  }) async {
    try {
      final response = await _dio.post(
        '/api/gyms/security/session-timeout',
        data: {
          'timeoutMinutes': timeoutMinutes,
          'enabled': enabled ?? true,
        },
      );

      return {
        'success': response.data['success'] ?? false,
        'message': response.data['message'] ?? 'Session timeout updated',
        'timeoutMinutes': response.data['data']?['timeoutMinutes'] ?? timeoutMinutes,
        'enabled': response.data['data']?['enabled'] ?? (enabled ?? true),
      };
    } on DioException catch (e) {
      debugPrint('Update Session Timeout Error: ${e.response?.statusCode} - ${e.message}');
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'An error occurred',
      };
    } catch (e) {
      debugPrint('Unexpected error in updateSessionTimeout: $e');
      return {
        'success': false,
        'message': 'An unexpected error occurred',
      };
    }
  }
  
  /// Clear all tokens and user data (used when session expires)
  Future<void> clearTokens() async {
    try {
      await _storage.deleteToken();
      await _storage.deleteRefreshToken();
      await _storage.deleteUserData();
      await _storage.deleteGymId();
      debugPrint('✅ All tokens and user data cleared');
    } catch (e) {
      debugPrint('⚠️ Error clearing tokens: $e');
    }
  }
}
