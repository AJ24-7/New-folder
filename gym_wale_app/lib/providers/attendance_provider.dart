import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geofence_service/geofence_service.dart';
import '../services/geofencing_service.dart';
import '../services/api_service.dart';
import '../services/local_notification_service.dart';
import '../services/attendance_settings_service.dart';
import '../models/attendance_settings.dart';

class AttendanceProvider extends ChangeNotifier {
  GeofencingService? _geofencingService;
  final AttendanceSettingsService _settingsService = AttendanceSettingsService();
  
  StreamSubscription<GeofenceStatus>? _geofenceSubscription;

  bool _isAttendanceMarkedToday = false;
  bool get isAttendanceMarkedToday => _isAttendanceMarkedToday;

  bool _hasCheckedOut = false;
  bool get hasCheckedOut => _hasCheckedOut;

  DateTime? _checkInTime;
  DateTime? get checkInTime => _checkInTime;

  DateTime? _checkOutTime;
  DateTime? get checkOutTime => _checkOutTime;

  Map<String, dynamic>? _todayAttendance;
  Map<String, dynamic>? get todayAttendance => _todayAttendance;

  List<Map<String, dynamic>> _attendanceHistory = [];
  List<Map<String, dynamic>> get attendanceHistory => _attendanceHistory;

  Map<String, dynamic>? _attendanceStats;
  Map<String, dynamic>? get attendanceStats => _attendanceStats;

  AttendanceSettings? _attendanceSettings;
  AttendanceSettings? get attendanceSettings => _attendanceSettings;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  // Retry configuration
  int _retryAttempts = 0;
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 5);

  AttendanceProvider();
  
  /// Initialize geofencing service if needed
  void initializeGeofencingService(GeofencingService service) {
    _geofencingService = service;
    _initializeGeofenceListener();
  }

  /// Initialize listener for geofence events
  void _initializeGeofenceListener() {
    if (_geofencingService == null) return;
    _geofenceSubscription = _geofencingService!.geofenceStream.listen(
      _onGeofenceStatusChanged,
      onError: (error) {
        debugPrint('[ATTENDANCE] Geofence stream error: $error');
      },
    );
  }

  /// Handle geofence status changes
  Future<void> _onGeofenceStatusChanged(GeofenceStatus status) async {
    if (_geofencingService == null) return;
    final gymId = _geofencingService!.currentGymId;
    if (gymId == null) return;

    // Check if auto-mark is enabled in settings before marking attendance
    if (!isAutoMarkEnabled()) {
      debugPrint('[ATTENDANCE] Auto-mark is disabled, skipping automatic attendance');
      return;
    }

    if (status == GeofenceStatus.ENTER) {
      // Check if auto-mark entry is enabled
      if (_geofencingService!.shouldAutoMarkEntry()) {
        await markAttendanceEntry(gymId);
      } else {
        debugPrint('[ATTENDANCE] Auto-mark entry is disabled in settings');
      }
    } else if (status == GeofenceStatus.EXIT) {
      // Check if auto-mark exit is enabled
      if (_geofencingService!.shouldAutoMarkExit()) {
        await markAttendanceExit(gymId);
      } else {
        debugPrint('[ATTENDANCE] Auto-mark exit is disabled in settings');
      }
    }
  }

  /// Mark attendance entry when entering gym geofence
  Future<bool> markAttendanceEntry(String gymId) async {
    return await _markAttendanceWithRetry(gymId, isEntry: true);
  }

  /// Mark attendance with retry logic for robustness
  Future<bool> _markAttendanceWithRetry(String gymId, {required bool isEntry, int attempt = 0}) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      if (_geofencingService == null) {
        _errorMessage = 'Geofencing service not initialized';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get current location
      final position = await _geofencingService!.getCurrentLocation();
      if (position == null) {
        _errorMessage = 'Unable to get current location';
        _isLoading = false;
        notifyListeners();
        
        // Retry if we haven't exceeded max attempts
        if (attempt < maxRetryAttempts) {
          debugPrint('[ATTENDANCE] Retrying after location failure (attempt ${attempt + 1}/$maxRetryAttempts)');
          await Future.delayed(retryDelay);
          return await _markAttendanceWithRetry(gymId, isEntry: isEntry, attempt: attempt + 1);
        }
        return false;
      }

      // Check if location is mocked
      final isMockLocation = position.isMocked;

      // Prepare request data
      final requestData = {
        'gymId': gymId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'isMockLocation': isMockLocation,
      };

      // Call API based on entry or exit
      final response = isEntry 
          ? await ApiService.markGeofenceEntry(requestData)
          : await ApiService.markGeofenceExit(requestData);

      if (response['success'] == true) {
        if (isEntry) {
          _isAttendanceMarkedToday = true;
          _checkInTime = DateTime.now();
          _todayAttendance = response['attendance'];
          _hasCheckedOut = false;
          debugPrint('[ATTENDANCE] Entry marked successfully');
        } else {
          _checkOutTime = DateTime.now();
          _hasCheckedOut = true;
          _todayAttendance = response['attendance'];
          debugPrint('[ATTENDANCE] Exit marked successfully');
          debugPrint('[ATTENDANCE] Duration: ${response['durationInMinutes']} minutes');
        }
        
        // Show local notification
        try {
          final notification = response['notification'];
          if (notification != null && notification['title'] != null) {
            await LocalNotificationService.instance.showAttendanceNotification(
              title: notification['title'],
              message: notification['message'] ?? (isEntry ? 'Your attendance has been marked' : 'Gym exit recorded'),
            );
          } else {
            // Fallback notification
            if (isEntry) {
              await LocalNotificationService.instance.showAttendanceEntryNotification(
                gymName: 'the gym',
                time: _checkInTime!.hour.toString().padLeft(2, '0') + ':' + 
                      _checkInTime!.minute.toString().padLeft(2, '0'),
                sessionsRemaining: response['sessionsRemaining'],
              );
            } else {
              await LocalNotificationService.instance.showAttendanceExitNotification(
                gymName: 'the gym',
                time: _checkOutTime!.hour.toString().padLeft(2, '0') + ':' + 
                      _checkOutTime!.minute.toString().padLeft(2, '0'),
                durationMinutes: response['durationInMinutes'] ?? 0,
              );
            }
          }
        } catch (notifError) {
          debugPrint('[ATTENDANCE] Error showing notification: $notifError');
          // Don't fail attendance marking if notification fails
        }
        
        _retryAttempts = 0; // Reset retry counter on success
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to mark attendance';
        _isLoading = false;
        notifyListeners();
        
        // Retry for certain error conditions
        if (attempt < maxRetryAttempts && _shouldRetry(response['message'])) {
          debugPrint('[ATTENDANCE] Retrying after API failure (attempt ${attempt + 1}/$maxRetryAttempts)');
          await Future.delayed(retryDelay * (attempt + 1)); // Exponential backoff
          return await _markAttendanceWithRetry(gymId, isEntry: isEntry, attempt: attempt + 1);
        }
        return false;
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error marking ${isEntry ? 'entry' : 'exit'}: $e');
      _errorMessage = 'Error marking attendance: $e';
      _isLoading = false;
      notifyListeners();
      
      // Retry on network errors
      if (attempt < maxRetryAttempts) {
        debugPrint('[ATTENDANCE] Retrying after exception (attempt ${attempt + 1}/$maxRetryAttempts)');
        await Future.delayed(retryDelay * (attempt + 1)); // Exponential backoff
        return await _markAttendanceWithRetry(gymId, isEntry: isEntry, attempt: attempt + 1);
      }
      return false;
    }
  }

  /// Determine if we should retry based on error message
  bool _shouldRetry(String? errorMessage) {
    if (errorMessage == null) return true;
    
    // Don't retry for these specific errors
    final noRetryErrors = [
      'Mock locations are not allowed',
      'No active membership',
      'You are',  // Distance-related errors
      'Minimum stay time',
      'already marked',
    ];
    
    for (final error in noRetryErrors) {
      if (errorMessage.contains(error)) {
        return false;
      }
    }
    
    return true; // Retry for network errors, server errors, etc.
  }

  /// Mark attendance entry when entering gym geofence (legacy method - kept for compatibility)
  Future<bool> _markAttendanceEntryLegacy(String gymId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      if (_geofencingService == null) {
        _errorMessage = 'Geofencing service not initialized';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get current location
      final position = await _geofencingService!.getCurrentLocation();
      if (position == null) {
        _errorMessage = 'Unable to get current location';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Check if location is mocked
      final isMockLocation = position.isMocked;

      // Prepare request data
      final requestData = {
        'gymId': gymId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'isMockLocation': isMockLocation,
      };

      // Call API
      final response = await ApiService.markGeofenceEntry(requestData);

      if (response['success'] == true) {
        _isAttendanceMarkedToday = true;
        _checkInTime = DateTime.now();
        _todayAttendance = response['attendance'];
        _hasCheckedOut = false;

        debugPrint('[ATTENDANCE] Entry marked successfully');
        
        // Show local notification
        try {
          final notification = response['notification'];
          if (notification != null && notification['title'] != null) {
            await LocalNotificationService.instance.showAttendanceNotification(
              title: notification['title'],
              message: notification['message'] ?? 'Your attendance has been marked',
            );
          } else {
            // Fallback notification
            await LocalNotificationService.instance.showAttendanceEntryNotification(
              gymName: 'the gym',
              time: _checkInTime!.hour.toString().padLeft(2, '0') + ':' + 
                    _checkInTime!.minute.toString().padLeft(2, '0'),
              sessionsRemaining: response['sessionsRemaining'],
            );
          }
        } catch (notifError) {
          debugPrint('[ATTENDANCE] Error showing notification: $notifError');
          // Don't fail attendance marking if notification fails
        }
        
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to mark attendance';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error marking entry: $e');
      _errorMessage = 'Error marking attendance: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Mark attendance exit when leaving gym geofence
  Future<bool> markAttendanceExit(String gymId) async {
    return await _markAttendanceWithRetry(gymId, isEntry: false);
  }

  /// Mark attendance exit when leaving gym geofence (legacy method - kept for compatibility)
  Future<bool> _markAttendanceExitLegacy(String gymId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      if (_geofencingService == null) {
        _errorMessage = 'Geofencing service not initialized';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get current location
      final position = await _geofencingService!.getCurrentLocation();
      if (position == null) {
        _errorMessage = 'Unable to get current location';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Prepare request data
      final requestData = {
        'gymId': gymId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
      };

      // Call API
      final response = await ApiService.markGeofenceExit(requestData);

      if (response['success'] == true) {
        _checkOutTime = DateTime.now();
        _hasCheckedOut = true;
        _todayAttendance = response['attendance'];

        debugPrint('[ATTENDANCE] Exit marked successfully');
        debugPrint('[ATTENDANCE] Duration: ${response['durationInMinutes']} minutes');

        // Show local notification for exit
        try {
          final notification = response['notification'];
          if (notification != null && notification['title'] != null) {
            await LocalNotificationService.instance.showAttendanceNotification(
              title: notification['title'],
              message: notification['message'] ?? 'Gym exit recorded',
            );
          } else {
            // Fallback notification
            await LocalNotificationService.instance.showAttendanceExitNotification(
              gymName: 'the gym',
              time: _checkOutTime!.hour.toString().padLeft(2, '0') + ':' + 
                    _checkOutTime!.minute.toString().padLeft(2, '0'),
              durationMinutes: response['durationInMinutes'] ?? 0,
            );
          }
        } catch (notifError) {
          debugPrint('[ATTENDANCE] Error showing exit notification: $notifError');
        }

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to mark exit';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error marking exit: $e');
      _errorMessage = 'Error marking exit: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Get today's attendance status
  Future<void> fetchTodayAttendance(String gymId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final response = await ApiService.getTodayAttendance(gymId);

      if (response['success'] == true) {
        _isAttendanceMarkedToday = response['isMarked'] ?? false;
        _hasCheckedOut = response['hasCheckedOut'] ?? false;
        _todayAttendance = response['attendance'];

        if (_todayAttendance != null) {
          // Parse check-in time
          if (_todayAttendance!['geofenceEntry'] != null &&
              _todayAttendance!['geofenceEntry']['timestamp'] != null) {
            _checkInTime =
                DateTime.parse(_todayAttendance!['geofenceEntry']['timestamp']);
          }

          // Parse check-out time
          if (_todayAttendance!['geofenceExit'] != null &&
              _todayAttendance!['geofenceExit']['timestamp'] != null) {
            _checkOutTime =
                DateTime.parse(_todayAttendance!['geofenceExit']['timestamp']);
          }
        }
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[ATTENDANCE] Error fetching today\'s attendance: $e');
      _errorMessage = 'Error fetching attendance: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get attendance history
  Future<void> fetchAttendanceHistory(
    String gymId, {
    String? startDate,
    String? endDate,
    int limit = 30,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      // Note: This should be updated to use the actual geofence-attendance endpoint when available
      // For now, use a placeholder that returns empty list
      _attendanceHistory = [];

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[ATTENDANCE] Error fetching history: $e');
      _errorMessage = 'Error fetching history: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get attendance statistics
  Future<void> fetchAttendanceStats(
    String gymId, {
    int? month,
    int? year,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final queryParams = <String, dynamic>{};
      if (month != null) queryParams['month'] = month.toString();
      if (year != null) queryParams['year'] = year.toString();

      // Note: This should use the actual geofence-attendance stats endpoint
      // For now, return empty stats
      _attendanceStats = {
        'presentDays': 0,
        'totalDays': 0,
        'attendanceRate': 0.0,
        'avgDuration': 0,
      };

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[ATTENDANCE] Error fetching stats: $e');
      _errorMessage = 'Error fetching stats: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Verify if user is inside geofence
  Future<Map<String, dynamic>?> verifyGeofence(
    String gymId,
    double latitude,
    double longitude,
  ) async {
    try {
      final requestData = {
        'gymId': gymId,
        'latitude': latitude,
        'longitude': longitude,
      };

      final response = await ApiService.verifyGeofence(requestData);
      return response;
    } catch (e) {
      debugPrint('[ATTENDANCE] Error verifying geofence: $e');
      return null;
    }
  }

  /// Setup geofencing for a gym
  Future<bool> setupGeofencing({
    required String gymId,
    required double latitude,
    required double longitude,
    required double radius,
  }) async {
    try {
      if (_geofencingService == null) {
        debugPrint('[ATTENDANCE] Geofencing service not initialized');
        return false;
      }

      final success = await _geofencingService!.registerGymGeofence(
        gymId: gymId,
        latitude: latitude,
        longitude: longitude,
        radius: radius,
      );

      if (success) {
        // Fetch today's attendance after setting up geofence
        await fetchTodayAttendance(gymId);
      }

      return success;
    } catch (e) {
      debugPrint('[ATTENDANCE] Error setting up geofencing: $e');
      return false;
    }
  }

  /// Remove geofencing
  Future<void> removeGeofencing() async {
    if (_geofencingService != null) {
      await _geofencingService!.removeAllGeofences();
    }
    _isAttendanceMarkedToday = false;
    _hasCheckedOut = false;
    _checkInTime = null;
    _checkOutTime = null;
    _todayAttendance = null;
    notifyListeners();
  }

  /// Reset daily attendance status (called at midnight or app restart)
  void resetDailyStatus() {
    _isAttendanceMarkedToday = false;
    _hasCheckedOut = false;
    _checkInTime = null;
    _checkOutTime = null;
    _todayAttendance = null;
    notifyListeners();
  }

  /// Get formatted check-in time
  String? getFormattedCheckInTime() {
    if (_checkInTime == null) return null;
    return '${_checkInTime!.hour.toString().padLeft(2, '0')}:${_checkInTime!.minute.toString().padLeft(2, '0')}';
  }

  /// Get formatted check-out time
  String? getFormattedCheckOutTime() {
    if (_checkOutTime == null) return null;
    return '${_checkOutTime!.hour.toString().padLeft(2, '0')}:${_checkOutTime!.minute.toString().padLeft(2, '0')}';
  }

  /// Get duration in gym
  String? getDurationInGym() {
    if (_checkInTime == null || _checkOutTime == null) return null;
    
    final duration = _checkOutTime!.difference(_checkInTime!);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    
    return '${hours}h ${minutes}m';
  }

  /// Clear error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Load attendance settings for a gym
  Future<bool> loadAttendanceSettings(String gymId) async {
    try {
      debugPrint('[ATTENDANCE PROVIDER] Loading attendance settings for gym: $gymId');
      
      _attendanceSettings = await _settingsService.loadSettings(gymId);
      
      if (_attendanceSettings != null) {
        debugPrint('[ATTENDANCE PROVIDER] Settings loaded successfully');
        debugPrint('[ATTENDANCE PROVIDER] Mode: ${_attendanceSettings!.mode}');
        debugPrint('[ATTENDANCE PROVIDER] Geofence enabled: ${_attendanceSettings!.geofenceEnabled}');
        debugPrint('[ATTENDANCE PROVIDER] Auto-mark enabled: ${_attendanceSettings!.autoMarkEnabled}');
        notifyListeners();
        return true;
      }
      
      return false;
    } catch (e) {
      debugPrint('[ATTENDANCE PROVIDER] Error loading settings: $e');
      return false;
    }
  }

  /// Check if geofencing should be enabled for this gym
  bool shouldEnableGeofencing() {
    return _attendanceSettings?.geofenceEnabled ?? false;
  }

  /// Check if auto-mark is enabled
  bool isAutoMarkEnabled() {
    return _attendanceSettings?.autoMarkEnabled ?? false;
  }

  /// Get attendance mode
  AttendanceMode? getAttendanceMode() {
    return _attendanceSettings?.mode;
  }

  /// Setup geofencing with attendance settings integration
  Future<bool> setupGeofencingWithSettings(String gymId) async {
    try {
      if (_geofencingService == null) {
        debugPrint('[ATTENDANCE] Geofencing service not initialized');
        return false;
      }

      // First load attendance settings
      final settingsLoaded = await loadAttendanceSettings(gymId);
      if (!settingsLoaded) {
        debugPrint('[ATTENDANCE] Failed to load attendance settings');
        return false;
      }

      // Check if geofencing should be enabled
      if (!shouldEnableGeofencing()) {
        debugPrint('[ATTENDANCE] Geofencing is not enabled for this gym');
        debugPrint('[ATTENDANCE] Current mode: ${_attendanceSettings?.mode}');
        return false;
      }

      // Configure geofencing from settings
      final success = await _geofencingService!.configureFromSettings(gymId);
      
      if (success) {
        debugPrint('[ATTENDANCE] Geofencing setup successful with settings');
        // Fetch today's attendance after setting up geofence
        await fetchTodayAttendance(gymId);
        return true;
      }

      return false;
    } catch (e) {
      debugPrint('[ATTENDANCE] Error setting up geofencing with settings: $e');
      return false;
    }
  }

  /// Refresh attendance settings and update geofencing if needed
  Future<bool> refreshAttendanceSettings(String gymId) async {
    try {
      debugPrint('[ATTENDANCE PROVIDER] Refreshing attendance settings');
      
      // Clear cached settings and reload
      _settingsService.clearSettings();
      final loaded = await loadAttendanceSettings(gymId);
      
      if (loaded && _geofencingService != null) {
        // If geofencing is enabled in settings, reconfigure it
        if (shouldEnableGeofencing()) {
          await _geofencingService!.refreshSettings(gymId);
        } else {
          // If geofencing is disabled, remove any active geofences
          await removeGeofencing();
        }
      }
      
      return loaded;
    } catch (e) {
      debugPrint('[ATTENDANCE PROVIDER] Error refreshing settings: $e');
      return false;
    }
  }

  /// Check if geofence is properly configured
  bool isGeofenceConfigured() {
    if (_geofencingService == null) return false;
    return _geofencingService!.isGeofenceEnabledInSettings();
  }

  /// Validate location against settings requirements
  bool validateLocationAccuracy(double accuracy) {
    if (_geofencingService == null) return true;
    return _geofencingService!.isLocationAccuracyValid(accuracy);
  }

  @override
  void dispose() {
    _geofenceSubscription?.cancel();
    _settingsService.dispose();
    super.dispose();
  }
}
