import 'package:flutter/material.dart';
import '../models/admin.dart';
import '../services/auth_service.dart';
import '../services/session_timer_service.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

/// Authentication Provider
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final SessionTimerService _sessionTimer = SessionTimerService();
  
  Admin? _currentAdmin;
  bool _isLoading = false;
  String? _error;
  bool _isLoggedIn = false;
  VoidCallback? _onSessionExpiredCallback;
  VoidCallback? _onSessionWarningCallback;

  Admin? get currentAdmin => _currentAdmin;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _isLoggedIn;
  SessionTimerService get sessionTimer => _sessionTimer;

  AuthProvider() {
    _checkLoginStatus();
    // Set up API service auth error callback
    ApiService.setAuthErrorCallback(() {
      _handleSessionExpired();
    });
  }

  Future<void> _checkLoginStatus() async {
    _isLoggedIn = await _authService.isLoggedIn();
    if (_isLoggedIn) {
      _currentAdmin = await _authService.getCurrentAdmin();
      // Start session timer if user is already logged in
      _startSessionTimer();
    }
    notifyListeners();
  }

  /// Set callback for session expiration
  void setSessionExpiredCallback(VoidCallback callback) {
    _onSessionExpiredCallback = callback;
  }

  /// Set callback for session warning
  void setSessionWarningCallback(VoidCallback callback) {
    _onSessionWarningCallback = callback;
  }

  /// Start session timer
  Future<void> _startSessionTimer({bool restoreExisting = true, int? tokenExpiresInMinutes}) async {
    // Priority for duration:
    // 1. Explicit value from login/2FA response (tokenExpiresInMinutes)
    // 2. Locally saved duration from storage (set during login)
    // 3. API call to backend (may fail on app restart if token is near expiry)
    // 4. Default fallback (60 minutes)
    int? durationInMinutes = tokenExpiresInMinutes;
    
    if (durationInMinutes == null || durationInMinutes <= 0) {
      // Try locally saved value first — this was persisted at login time
      final stored = StorageService().getSessionTimeoutDuration();
      if (stored != null && stored > 0) {
        durationInMinutes = stored;
        debugPrint('⏱️ Using stored session timeout: $durationInMinutes minutes');
      }
    }
    
    if (durationInMinutes == null || durationInMinutes <= 0) {
      // Fallback: try API call (non-critical — if it fails, use default)
      try {
        final timeoutConfig = await _authService.getSessionTimeout();
        durationInMinutes = timeoutConfig['timeoutMinutes'] as int? ?? 60;
      } catch (e) {
        debugPrint('⚠️ Could not fetch session timeout from API: $e');
        durationInMinutes = 60;
      }
    }
    
    debugPrint('⏱️ Starting session timer with $durationInMinutes minutes (restore: $restoreExisting)');
    
    await _sessionTimer.startTimer(
      onSessionExpired: () {
        // Auto-logout when session expires
        debugPrint('⏰ Session expired - auto logout triggered');
        _handleSessionExpired();
      },
      onWarning: () async {
        // Session warning reached — proactively attempt token refresh
        debugPrint('⚠️ Session warning — attempting proactive token refresh');
        try {
          final refreshed = await _authService.refreshToken();
          if (refreshed) {
            debugPrint('🔄 Proactive token refresh succeeded — resetting session timer');
            await _sessionTimer.resetTimer();
            // Update login time in storage for accurate restore on restart
            return; // Skip showing the warning since we refreshed
          }
        } catch (e) {
          debugPrint('⚠️ Proactive token refresh failed: $e');
        }
        // Refresh failed — show warning to user
        _onSessionWarningCallback?.call();
        notifyListeners();
      },
      durationInMinutes: durationInMinutes,
      restoreExisting: restoreExisting,
    );
  }
  
  /// Handle session expiration
  Future<void> _handleSessionExpired() async {
    debugPrint('🚪 Handling session expiration - logging out');
    
    // Stop the session timer
    _sessionTimer.stopTimer();
    
    // Clear authentication state
    _currentAdmin = null;
    _isLoggedIn = false;
    notifyListeners();
    
    // Clear stored data
    await _authService.clearTokens();
    
    // Trigger callback to show dialog and redirect
    _onSessionExpiredCallback?.call();
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.login(
        email: email,
        password: password,
        rememberMe: rememberMe,
      );

      if (result['success'] == true) {
        if (result['requires2FA'] != true) {
          _isLoggedIn = true;
          _currentAdmin = Admin.fromJson(result['admin']);
          // Start session timer after successful login without 2FA (fresh session)
          final expiryMinutes = result['tokenExpiresInMinutes'] as int?;
          await _startSessionTimer(restoreExisting: false, tokenExpiresInMinutes: expiryMinutes);
        }
      } else {
        _error = result['message'];
      }

      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return {'success': false, 'message': _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> verify2FA({
    required String tempToken,
    required String code,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.verify2FA(
        tempToken: tempToken,
        code: code,
      );

      if (result['success'] == true) {
        // Start session timer after successful 2FA verification (fresh session)
        final expiryMinutes = result['tokenExpiresInMinutes'] as int?;
        await _startSessionTimer(restoreExisting: false, tokenExpiresInMinutes: expiryMinutes);
        _isLoggedIn = true;
        _currentAdmin = Admin.fromJson(result['admin']);
      } else {
        _error = result['message'];
      }

      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return {'success': false, 'message': _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    // Stop session timer
    await _sessionTimer.stopTimer();
    
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.logout();
      _currentAdmin = null;
      _isLoggedIn = false;
    } catch (e) {
      _error = 'Error during logout';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> requestPasswordOTP(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.requestPasswordOTP(email);
      if (result['success'] != true) {
        _error = result['message'];
      }
      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return {'success': false, 'message': _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> verifyOTPAndResetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.verifyOTPAndResetPassword(
        email: email,
        otp: otp,
        newPassword: newPassword,
      );
      if (result['success'] != true) {
        _error = result['message'];
      }
      return result;
    } catch (e) {
      _error = 'An unexpected error occurred';
      return {'success': false, 'message': _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
