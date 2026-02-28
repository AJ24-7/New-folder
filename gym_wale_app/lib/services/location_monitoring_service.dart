import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'location_permission_service.dart';
import '../config/api_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Location Monitoring Service
/// Monitors location services status and reports to backend
/// Used for geofence-based attendance tracking
class LocationMonitoringService {
  static final LocationMonitoringService _instance = LocationMonitoringService._internal();
  factory LocationMonitoringService() => _instance;
  LocationMonitoringService._internal();

  Timer? _monitoringTimer;
  bool _isMonitoring = false;
  String? _currentGymId;
  String? _currentMemberId;
  String? _authToken;

  // Status cache
  LocationStatus? _lastStatus;

  // Configuration
  static const Duration _updateInterval = Duration(minutes: 5);
  static const String _prefsKeyGymId = 'current_gym_id';
  static const String _prefsKeyMemberId = 'current_member_id';

  /// Initialize monitoring service
  Future<void> initialize({
    required String gymId,
    required String memberId,
    required String authToken,
  }) async {
    _currentGymId = gymId;
    _currentMemberId = memberId;
    _authToken = authToken;

    // Save to preferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKeyGymId, gymId);
    await prefs.setString(_prefsKeyMemberId, memberId);

    // Start monitoring
    await startMonitoring();
  }

  /// Start monitoring location status
  Future<void> startMonitoring() async {
    if (_isMonitoring) return;

    debugPrint('[LocationMonitor] Starting location monitoring...');
    _isMonitoring = true;

    // Do immediate check
    await _checkAndReportStatus();

    // Schedule periodic updates
    _monitoringTimer = Timer.periodic(_updateInterval, (timer) async {
      await _checkAndReportStatus();
    });
  }

  /// Stop monitoring
  void stopMonitoring() {
    debugPrint('[LocationMonitor] Stopping location monitoring...');
    _isMonitoring = false;
    _monitoringTimer?.cancel();
    _monitoringTimer = null;
  }

  /// Check status and report to backend
  Future<LocationStatus> _checkAndReportStatus() async {
    try {
      final status = await getCurrentLocationStatus();
      
      // Report to backend
      if (_currentGymId != null && _currentMemberId != null) {
        await _reportStatusToBackend(status);
      }

      _lastStatus = status;

      return status;
    } catch (e) {
      debugPrint('[LocationMonitor] Error checking status: $e');
      rethrow;
    }
  }

  /// Get current location status
  Future<LocationStatus> getCurrentLocationStatus() async {
    // For web platform, geofencing is not supported
    if (kIsWeb) {
      debugPrint('[LocationMonitor] Running on web - Geofencing not supported');
      return LocationStatus(
        locationEnabled: false,
        locationPermission: 'notSupported',
        backgroundLocationEnabled: false,
        backgroundLocationPermission: 'notSupported',
        locationAccuracy: 'unknown',
        currentLocation: null,
        platform: 'web',
        isWebPlatform: true,
      );
    }

    // For mobile platforms
    bool locationEnabled = false;
    LocationPermission permission = LocationPermission.denied;
    
    try {
      locationEnabled = await Geolocator.isLocationServiceEnabled();
      permission = await Geolocator.checkPermission();
    } catch (e) {
      debugPrint('[LocationMonitor] Error checking location status: $e');
    }
    
    // Get background location permission status (platform specific)
    bool backgroundEnabled = false;
    LocationPermission backgroundPermission = LocationPermission.denied;
    
    // On Android, background location is separate permission
    // On iOS, "Always" permission includes background
    if (defaultTargetPlatform == TargetPlatform.android) {
      // For Android 10+, we need to check background location separately
      // This is simplified - in production you'd use platform channels
      backgroundEnabled = permission == LocationPermission.always;
      backgroundPermission = permission;
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      backgroundEnabled = permission == LocationPermission.always;
      backgroundPermission = permission;
    }

    // Get device info
    String platform = 'unknown';
    if (defaultTargetPlatform == TargetPlatform.android) {
      platform = 'android';
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      platform = 'ios';
    }

    // Get current location
    Position? position;
    try {
      if (locationEnabled && (permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse)) {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10),
        );
      }
    } catch (e) {
      debugPrint('[LocationMonitor] Error getting position: $e');
    }

    // Determine location accuracy
    String accuracy = 'unknown';
    if (position != null) {
      if (position.accuracy <= 10) {
        accuracy = 'high';
      } else if (position.accuracy <= 50) {
        accuracy = 'medium';
      } else {
        accuracy = 'low';
      }
    }

    return LocationStatus(
      locationEnabled: locationEnabled,
      locationPermission: _permissionToString(permission),
      backgroundLocationEnabled: backgroundEnabled,
      backgroundLocationPermission: _permissionToString(backgroundPermission),
      locationAccuracy: accuracy,
      currentLocation: position != null
          ? LocationData(
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy,
              timestamp: DateTime.now(),
            )
          : null,
      platform: platform,
      isWebPlatform: false,
    );
  }

  /// Report status to backend
  Future<Map<String, dynamic>> _reportStatusToBackend(LocationStatus status) async {
    if (_authToken == null) {
      throw Exception('Auth token not set');
    }

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/member/location-status');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_authToken',
        },
        body: jsonEncode({
          'memberId': _currentMemberId,
          'gymId': _currentGymId,
          'locationEnabled': status.locationEnabled,
          'locationPermission': status.locationPermission,
          'backgroundLocationEnabled': status.backgroundLocationEnabled,
          'backgroundLocationPermission': status.backgroundLocationPermission,
          'locationAccuracy': status.locationAccuracy,
          'deviceInfo': {
            'platform': status.platform,
            'deviceModel': '', // Add device_info_plus package for more details
            'osVersion': '',
            'appVersion': '',
          },
          'currentLocation': status.currentLocation != null
              ? {
                  'latitude': status.currentLocation!.latitude,
                  'longitude': status.currentLocation!.longitude,
                  'accuracy': status.currentLocation!.accuracy,
                  'timestamp': status.currentLocation!.timestamp.toIso8601String(),
                }
              : null,
          'appActive': true,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        debugPrint('[LocationMonitor] Status reported successfully');
        return data;
      } else {
        debugPrint('[LocationMonitor] Failed to report status: ${response.statusCode}');
        throw Exception('Failed to report location status');
      }
    } catch (e) {
      debugPrint('[LocationMonitor] Error reporting status: $e');
      throw Exception('Error reporting location status: $e');
    }
  }

  /// Get geofence requirements from backend
  Future<GeofenceRequirements?> getGeofenceRequirements() async {
    if (_currentGymId == null || _authToken == null) {
      return null;
    }

    try {
      final url = Uri.parse('${ApiConfig.baseUrl}/member/geofence-requirements/$_currentGymId');
      
      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer $_authToken',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return GeofenceRequirements.fromJson(data);
        }
      }
      return null;
    } catch (e) {
      debugPrint('[LocationMonitor] Error fetching geofence requirements: $e');
      return null;
    }
  }

  /// Check if geofence requirements are met
  Future<bool> meetsGeofenceRequirements() async {
    final requirements = await getGeofenceRequirements();
    if (requirements == null || !requirements.geofenceEnabled) {
      return true; // Geofence not required
    }

    final status = _lastStatus ?? await getCurrentLocationStatus();
    
    return status.locationEnabled &&
           status.locationPermission == 'granted' &&
           status.backgroundLocationEnabled &&
           status.backgroundLocationPermission == 'granted';
  }

  /// Get last known status
  LocationStatus? get lastStatus => _lastStatus;

  /// Force an immediate status update
  Future<LocationStatus> forceUpdate() async {
    return await _checkAndReportStatus();
  }

  /// Convert LocationPermission to string
  String _permissionToString(LocationPermission permission) {
    switch (permission) {
      case LocationPermission.always:
        return 'granted';
      case LocationPermission.whileInUse:
        return 'granted'; // For basic functionality
      case LocationPermission.denied:
        return 'denied';
      case LocationPermission.deniedForever:
        return 'deniedForever';
      default:
        return 'notDetermined';
    }
  }

  /// Report app opened
  Future<void> reportAppOpened() async {
    if (_currentGymId != null && _currentMemberId != null) {
      await _checkAndReportStatus();
    }
  }

  /// Report app closed
  Future<void> reportAppClosed() async {
    // Quick update before closing
    if (_currentGymId != null && _currentMemberId != null) {
      try {
        final status = await getCurrentLocationStatus();
        await _reportStatusToBackend(status);
      } catch (e) {
        debugPrint('[LocationMonitor] Error reporting app close: $e');
      }
    }
  }

  /// Dispose and cleanup
  void dispose() {
    stopMonitoring();
    _currentGymId = null;
    _currentMemberId = null;
    _authToken = null;
  }
}

/// Location Status Model
class LocationStatus {
  final bool locationEnabled;
  final String locationPermission;
  final bool backgroundLocationEnabled;
  final String backgroundLocationPermission;
  final String locationAccuracy;
  final LocationData? currentLocation;
  final String platform;
  final bool isWebPlatform;

  LocationStatus({
    required this.locationEnabled,
    required this.locationPermission,
    required this.backgroundLocationEnabled,
    required this.backgroundLocationPermission,
    required this.locationAccuracy,
    this.currentLocation,
    required this.platform,
    this.isWebPlatform = false,
  });

  bool get meetsBasicRequirements =>
      !isWebPlatform && locationEnabled && locationPermission == 'granted';

  bool get meetsGeofenceRequirements =>
      !isWebPlatform &&
      locationEnabled &&
      locationPermission == 'granted' &&
      backgroundLocationEnabled &&
      backgroundLocationPermission == 'granted';
      
  bool get supportsGeofencing => !isWebPlatform;
}

/// Location Data Model
class LocationData {
  final double latitude;
  final double longitude;
  final double accuracy;
  final DateTime timestamp;

  LocationData({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.timestamp,
  });
}

/// Geofence Requirements Model
class GeofenceRequirements {
  final bool geofenceEnabled;
  final String attendanceMode;
  final Map<String, dynamic>? geofenceConfig;

  GeofenceRequirements({
    required this.geofenceEnabled,
    required this.attendanceMode,
    this.geofenceConfig,
  });

  factory GeofenceRequirements.fromJson(Map<String, dynamic> json) {
    return GeofenceRequirements(
      geofenceEnabled: json['geofenceEnabled'] ?? false,
      attendanceMode: json['attendanceMode'] ?? 'manual',
      geofenceConfig: json['geofenceConfig'],
    );
  }
}
