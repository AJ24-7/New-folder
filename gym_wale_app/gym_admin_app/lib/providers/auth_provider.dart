import 'package:flutter/material.dart';
import '../models/admin.dart';
import '../services/auth_service.dart';
import '../services/session_timer_service.dart';

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
  Future<void> _startSessionTimer() async {
    // Load session timeout configuration from backend
    final timeoutConfig = await _authService.getSessionTimeout();
    final durationInMinutes = timeoutConfig['timeoutMinutes'] ?? 30;
    
    _sessionTimer.startTimer(
      onSessionExpired: () {
        // Auto-logout when session expires
        _handleSessionExpired();
      },
      onWarning: () {
        // Show warning when threshold is reached
        _onSessionWarningCallback?.call();
        notifyListeners();
      },
      durationInMinutes: durationInMinutes,
    );
  }
  
  /// Handle session expiration
  Future<void> _handleSessionExpired() async {
    await logout();
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
          // Start session timer after successful login without 2FA
          _startSessionTimer();
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
        // Start session timer after successful 2FA verification
        _startSessionTimer();
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
    _sessionTimer.stopTimer();
    
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
