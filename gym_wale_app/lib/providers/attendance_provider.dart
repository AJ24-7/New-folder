import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geofence_service/geofence_service.dart';
import '../services/geofencing_service.dart';
import '../services/api_service.dart';

class AttendanceProvider extends ChangeNotifier {
  GeofencingService? _geofencingService;
  
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

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

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

    if (status == GeofenceStatus.ENTER) {
      await markAttendanceEntry(gymId);
    } else if (status == GeofenceStatus.EXIT) {
      await markAttendanceExit(gymId);
    }
  }

  /// Mark attendance entry when entering gym geofence
  Future<bool> markAttendanceEntry(String gymId) async {
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

  @override
  void dispose() {
    _geofenceSubscription?.cancel();
    super.dispose();
  }
}
