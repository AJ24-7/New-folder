import 'package:shared_preferences/shared_preferences.dart';
import 'gym_settings_service.dart';

/// Service for handling passcode operations
class PasscodeService {
  static const String _passcodeVerifiedKey = 'passcode_verified';
  static const String _passcodeVerifiedTimeKey = 'passcode_verified_time';
  static const int _verificationValidityMinutes = 30; // Session validity

  final GymSettingsService _gymSettingsService = GymSettingsService();

  /// Check if passcode is enabled and what type
  Future<Map<String, dynamic>> getPasscodeSettings() async {
    try {
      final response = await _gymSettingsService.getGymSettings();
      if (response['success'] == true) {
        final settings = response['settings'] as Map<String, dynamic>?;
        return {
          'enabled': settings?['passcodeEnabled'] ?? false,
          'type': settings?['passcodeType'] ?? 'none', // 'none', 'app', 'payments'
          'hasPasscode': settings?['hasPasscode'] ?? false,
        };
      }
      return {
        'enabled': false,
        'type': 'none',
        'hasPasscode': false,
      };
    } catch (e) {
      return {
        'enabled': false,
        'type': 'none',
        'hasPasscode': false,
      };
    }
  }

  /// Verify passcode with backend
  Future<bool> verifyPasscode(String passcode) async {
    try {
      final response = await _gymSettingsService.verifyPasscode(passcode);
      if (response['success'] == true && response['valid'] == true) {
        await _markPasscodeVerified();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Mark passcode as verified for current session
  Future<void> _markPasscodeVerified() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_passcodeVerifiedKey, true);
    await prefs.setInt(_passcodeVerifiedTimeKey, DateTime.now().millisecondsSinceEpoch);
  }

  /// Check if passcode verification is still valid
  Future<bool> isPasscodeVerified() async {
    final prefs = await SharedPreferences.getInstance();
    final isVerified = prefs.getBool(_passcodeVerifiedKey) ?? false;
    
    if (!isVerified) return false;

    // Check if verification is still valid
    final verifiedTime = prefs.getInt(_passcodeVerifiedTimeKey) ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;
    final elapsedMinutes = (now - verifiedTime) / (1000 * 60);

    if (elapsedMinutes > _verificationValidityMinutes) {
      // Expired, clear verification
      await clearPasscodeVerification();
      return false;
    }

    return true;
  }

  /// Clear passcode verification (on logout or expiry)
  Future<void> clearPasscodeVerification() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_passcodeVerifiedKey);
    await prefs.remove(_passcodeVerifiedTimeKey);
  }

  /// Set/update passcode
  Future<Map<String, dynamic>> setPasscode({
    required String passcode,
    required bool enabled,
    required String type, // 'none', 'app', 'payments'
  }) async {
    try {
      final response = await _gymSettingsService.updateGymSettings(
        passcodeEnabled: enabled,
        passcodeType: type,
        passcode: passcode,
      );
      return response;
    } catch (e) {
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  /// Remove passcode
  Future<Map<String, dynamic>> removePasscode() async {
    try {
      final response = await _gymSettingsService.updateGymSettings(
        passcodeEnabled: false,
        passcodeType: 'none',
        passcode: '',
      );
      await clearPasscodeVerification();
      return response;
    } catch (e) {
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  /// Update passcode type (app or payments)
  Future<Map<String, dynamic>> updatePasscodeType(String type) async {
    try {
      final response = await _gymSettingsService.updateGymSettings(
        passcodeType: type,
      );
      return response;
    } catch (e) {
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }
}
