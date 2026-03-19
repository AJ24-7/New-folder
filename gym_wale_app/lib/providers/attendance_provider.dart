import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/geofencing_service.dart';
import '../services/api_service.dart';
import '../services/attendance_settings_service.dart';
import '../models/attendance_settings.dart';

class AttendanceProvider extends ChangeNotifier {
  GeofencingService? _geofencingService;
  final AttendanceSettingsService _settingsService = AttendanceSettingsService();
  
  bool _bgListenerRegistered = false;

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

  AttendanceProvider();
  
  /// Initialize geofencing service if needed.
  /// Only registers the background-task data callback (once) so the UI
  /// refreshes when the foreground-task isolate marks attendance.
  void initializeGeofencingService(GeofencingService service) {
    _geofencingService = service;
    _initializeBackgroundTaskListener();
  }

  /// Listen for data sent from the background (killed-app) isolate so the UI
  /// refreshes automatically, e.g. after the foreground task marks attendance.
  /// Guard: only register once — ChangeNotifierProxyProvider may call
  /// initializeGeofencingService repeatedly whenever GeofencingService notifies.
  void _initializeBackgroundTaskListener() {
    if (_bgListenerRegistered) return;
    FlutterForegroundTask.addTaskDataCallback(_onBackgroundTaskData);
    _bgListenerRegistered = true;
  }

  /// Called in the main isolate when the background isolate sends data via
  /// FlutterForegroundTask.sendDataToMain(...).
  void _onBackgroundTaskData(Object data) {
    try {
      if (data is Map) {
        final event  = data['event'] as String?;

        // Handle service-lifecycle events that carry no gymId first.
        if (event == 'service_stopped') {
          // Background isolate has halted the foreground service (attendance
          // complete for today).  Keep the UI in sync.
          _geofencingService?.onBackgroundServiceStopped();
          return;
        }

        final gymId  = data['gymId']  as String?;
        if (gymId == null) return;

        debugPrint('[ATTENDANCE] Background task event: $event for gym: $gymId');

        if (event == 'attendance_entry') {
          _isAttendanceMarkedToday = true;
          _checkInTime = DateTime.now();
          _hasCheckedOut = false;
          notifyListeners();
          // Also re-fetch from backend to get the full attendance record
          fetchTodayAttendance(gymId);
        } else if (event == 'attendance_exit') {
          _checkOutTime = DateTime.now();
          _hasCheckedOut = true;
          notifyListeners();
          fetchTodayAttendance(gymId);
        }
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error handling background task data: $e');
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
          // Parse check-in time (convert UTC to local)
          if (_todayAttendance!['geofenceEntry'] != null &&
              _todayAttendance!['geofenceEntry']['timestamp'] != null) {
            _checkInTime =
                DateTime.parse(_todayAttendance!['geofenceEntry']['timestamp']).toLocal();
          }

          // Parse check-out time (convert UTC to local)
          if (_todayAttendance!['geofenceExit'] != null &&
              _todayAttendance!['geofenceExit']['timestamp'] != null) {
            _checkOutTime =
                DateTime.parse(_todayAttendance!['geofenceExit']['timestamp']).toLocal();
          }
        }

        // ── Sync attendance state to background isolate ──────────────────
        // Write separate app-side keys so the background task knows the
        // in-app provider already marked attendance (avoids double-marking).
        _syncAttendanceToBackgroundTask();
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

      final response = await ApiService.getAttendanceHistory(
        gymId,
        startDate: startDate,
        endDate: endDate,
        limit: limit,
      );

      if (response['success'] == true) {
        final raw = response['attendance'] as List? ?? [];
        _attendanceHistory = raw
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      } else {
        _attendanceHistory = [];
        _errorMessage = response['message'];
      }

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

      final response = await ApiService.getAttendanceStats(
        gymId,
        month: month,
        year: year,
      );

      if (response['success'] == true && response['stats'] != null) {
        final s = response['stats'] as Map;
        _attendanceStats = {
          'presentDays':    s['presentDays']    ?? 0,
          'totalDays':      s['totalDays']      ?? 0,
          'attendanceRate': (s['attendanceRate'] ?? 0.0) / 100.0,
          'avgDuration':    s['averageDurationMinutes'] ?? 0,
          'geofenceDays':   s['geofenceDays']   ?? 0,
        };
      } else {
        _attendanceStats = {
          'presentDays': 0, 'totalDays': 0,
          'attendanceRate': 0.0, 'avgDuration': 0, 'geofenceDays': 0,
        };
      }

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

  /// Write app-side attendance flags to SharedPreferences so the background
  /// isolate (foreground task) can detect that attendance was already marked
  /// from the app and stop retrying.
  ///
  /// Uses separate keys (bg_task_app_entry_marked / bg_task_app_exit_marked)
  /// to avoid confusion with the background task's own internal flags.
  Future<void> _syncAttendanceToBackgroundTask() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final now = DateTime.now();
      final today =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      await prefs.setString('bg_task_last_date', today);
      if (_isAttendanceMarkedToday) {
        await prefs.setBool('bg_task_app_entry_marked', true);
      }
      if (_hasCheckedOut) {
        await prefs.setBool('bg_task_app_exit_marked', true);
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error syncing to bg task: $e');
    }
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

  /// Check if auto-mark is enabled.
  /// Defaults to TRUE so a restored geofence (with settings not yet loaded)
  /// does not silently block attendance marking.
  bool isAutoMarkEnabled() {
    return _attendanceSettings?.autoMarkEnabled ?? true;
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
    FlutterForegroundTask.removeTaskDataCallback(_onBackgroundTaskData);
    _settingsService.dispose();
    super.dispose();
  }
}
