import 'dart:async';
import 'package:flutter/foundation.dart';

/// Service to manage JWT token expiration and auto-logout
class SessionTimerService extends ChangeNotifier {
  static final SessionTimerService _instance = SessionTimerService._internal();
  factory SessionTimerService() => _instance;
  SessionTimerService._internal();

  // JWT token expires in 30 minutes (1800 seconds) by default
  static const int _defaultTokenExpiryDuration = 1800; // 30 minutes in seconds
  static const int _warningThreshold = 300; // Show warning 5 minutes before expiry

  Timer? _sessionTimer;
  Timer? _countdownTimer;
  DateTime? _loginTime;
  int _tokenExpiryDuration = _defaultTokenExpiryDuration; // Configurable duration
  int _remainingSeconds = _defaultTokenExpiryDuration;
  bool _isActive = false;
  bool _showWarning = false;
  
  // Callbacks
  VoidCallback? _onSessionExpired;
  VoidCallback? _onWarning;

  // Getters
  bool get isActive => _isActive;
  int get remainingSeconds => _remainingSeconds;
  bool get showWarning => _showWarning;
  DateTime? get loginTime => _loginTime;
  
  // Format remaining time as MM:SS
  String get formattedTime {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  // Format remaining time in human readable format
  String get humanReadableTime {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    
    if (minutes > 0) {
      return '$minutes min${minutes > 1 ? 's' : ''} ${seconds}s';
    } else {
      return '$seconds second${seconds != 1 ? 's' : ''}';
    }
  }

  /// Start the session timer
  void startTimer({
    required VoidCallback onSessionExpired,
    VoidCallback? onWarning,
    int? durationInMinutes, // New parameter for configurable duration
  }) {
    _onSessionExpired = onSessionExpired;
    _onWarning = onWarning;
    _loginTime = DateTime.now();
    
    // Set duration: use provided duration or default
    if (durationInMinutes != null && durationInMinutes > 0) {
      _tokenExpiryDuration = durationInMinutes * 60; // Convert minutes to seconds
    } else {
      _tokenExpiryDuration = _defaultTokenExpiryDuration;
    }
    
    _remainingSeconds = _tokenExpiryDuration;
    _isActive = true;
    _showWarning = false;

    // Cancel any existing timers
    _sessionTimer?.cancel();
    _countdownTimer?.cancel();

    // Start countdown timer that updates every second
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        
        // Show warning when threshold is reached
        if (_remainingSeconds == _warningThreshold && !_showWarning) {
          _showWarning = true;
          _onWarning?.call();
        }
        
        notifyListeners();
      } else {
        // Session expired
        stopTimer();
        _onSessionExpired?.call();
      }
    });

    debugPrint('✅ Session timer started. Token will expire in $_tokenExpiryDuration seconds');
  }

  /// Reset the timer (called after token refresh)
  void resetTimer() {
    if (_isActive) {
      _remainingSeconds = _tokenExpiryDuration;
      _loginTime = DateTime.now();
      _showWarning = false;
      notifyListeners();
      debugPrint('🔄 Session timer reset. New expiry in $_tokenExpiryDuration seconds');
    }
  }

  /// Stop the timer
  void stopTimer() {
    _sessionTimer?.cancel();
    _countdownTimer?.cancel();
    _sessionTimer = null;
    _countdownTimer = null;
    _isActive = false;
    _showWarning = false;
    _remainingSeconds = _tokenExpiryDuration;
    _loginTime = null;
    notifyListeners();
    debugPrint('⏹️ Session timer stopped');
  }

  /// Extend the session (for manual refresh)
  void extendSession() {
    resetTimer();
    debugPrint('⏰ Session extended manually');
  }

  
  /// Get configured timeout duration in minutes
  int get timeoutDurationMinutes {
    return (_tokenExpiryDuration / 60).round();
  }
  /// Check if warning should be shown
  bool shouldShowWarning() {
    return _isActive && _remainingSeconds <= _warningThreshold;
  }

  /// Get remaining time percentage (0.0 to 1.0)
  double get remainingPercentage {
    return _remainingSeconds / _tokenExpiryDuration;
  }

  @override
  void dispose() {
    stopTimer();
    super.dispose();
  }
}
