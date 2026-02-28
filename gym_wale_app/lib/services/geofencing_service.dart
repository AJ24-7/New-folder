import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:geofence_service/geofence_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/attendance_settings.dart';
import './attendance_settings_service.dart';
import './local_notification_service.dart';
import './foreground_task_service.dart';

class GeofencingService extends ChangeNotifier {
  late final GeofenceService _geofenceService;

  final StreamController<GeofenceStatus> _geofenceController =
      StreamController<GeofenceStatus>.broadcast();

  Stream<GeofenceStatus> get geofenceStream => _geofenceController.stream;

  bool _isServiceRunning = false;
  bool get isServiceRunning => _isServiceRunning;

  List<Geofence> _geofenceList = [];
  List<Geofence> get geofenceList => _geofenceList;

  String? _currentGymId;
  String? get currentGymId => _currentGymId;

  AttendanceSettings? _attendanceSettings;
  AttendanceSettings? get attendanceSettings => _attendanceSettings;

  final AttendanceSettingsService _settingsService = AttendanceSettingsService();
  final ForegroundTaskService _fgTaskService = ForegroundTaskService();

  // ── Dwell tracking (5-minute rule) ─────────────────────────────────────────
  // gymId → timestamp of first ENTER event (used to enforce 5-min dwell)
  final Map<String, DateTime> _enterTimestamps = {};

  GeofencingService() {
    _geofenceService = GeofenceService.instance.setup(
      interval: 5000,       // location poll every 5 s
      accuracy: 100,        // 100 m accuracy bucket
      // loiteringDelayMs = 5 min dwell before DWELL event fires
      // This is the core "stay 5 minutes" enforcement.
      loiteringDelayMs: 300000,   // 5 minutes = 300 000 ms
      statusChangeDelayMs: 10000, // 10 s debounce before state switch
      useActivityRecognition: true,
      allowMockLocations: false,
      printDevLog: kDebugMode,
      geofenceRadiusSortType: GeofenceRadiusSortType.DESC,
    );
    _initializeService();
  }

  void _initializeService() {
    // Listen to geofence status changes
    _geofenceService.addGeofenceStatusChangeListener((geofence, geofenceRadius, geofenceStatus, location) async {
      await _onGeofenceStatusChanged(geofence, geofenceRadius, geofenceStatus, location);
    });
    
    // Listen to location changes
    _geofenceService.addLocationChangeListener(_onLocationChanged);
    
    // Listen to location service status changes
    _geofenceService.addLocationServicesStatusChangeListener(
        _onLocationServicesStatusChanged);
    
    // Listen to stream errors
    _geofenceService.addStreamErrorListener(_onStreamError);
  }

  /// Open app settings for background location permission
  Future<void> openLocationSettings() async {
    try {
      await geo.Geolocator.openLocationSettings();
    } catch (e) {
      debugPrint('[GEOFENCE] Error opening location settings: $e');
    }
  }

  /// Open app settings page
  Future<void> openAppSettings() async {
    try {
      await geo.Geolocator.openAppSettings();
    } catch (e) {
      debugPrint('[GEOFENCE] Error opening app settings: $e');
    }
  }

  /// Check if we have background location permission
  Future<bool> hasBackgroundLocationPermission() async {
    try {
      final permission = await geo.Geolocator.checkPermission();
      return permission == geo.LocationPermission.always;
    } catch (e) {
      debugPrint('[GEOFENCE] Error checking background permission: $e');
      return false;
    }
  }

  /// Check and request location permissions
  Future<bool> checkAndRequestPermissions() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await geo.Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[GEOFENCE] Location services are disabled');
        return false;
      }

      // Check location permission
      geo.LocationPermission permission = await geo.Geolocator.checkPermission();
      
      if (permission == geo.LocationPermission.denied) {
        permission = await geo.Geolocator.requestPermission();
        if (permission == geo.LocationPermission.denied) {
          debugPrint('[GEOFENCE] Location permission denied');
          return false;
        }
      }

      if (permission == geo.LocationPermission.deniedForever) {
        debugPrint('[GEOFENCE] Location permission permanently denied');
        return false;
      }

      // For Android: Handle background location separately
      if (Platform.isAndroid) {
        // Request activity recognition permission (for better geofencing)
        final activityPermission = await Permission.activityRecognition.request();
        if (!activityPermission.isGranted) {
          debugPrint('[GEOFENCE] Activity recognition permission denied');
        }

        // Check if we have always permission for background tracking
        if (permission != geo.LocationPermission.always) {
          debugPrint('[GEOFENCE] Background location permission not granted');
          debugPrint('[GEOFENCE] User needs to manually enable "Allow all the time" in Settings');
          // On Android 10+, background location must be granted separately in Settings
          // Geolocator will show a dialog prompting user to go to Settings
          // We'll continue with whileInUse permission for now
        }
      }

      // For iOS: Request always permission
      if (Platform.isIOS) {
        if (permission != geo.LocationPermission.always) {
          debugPrint('[GEOFENCE] Background location permission not granted on iOS');
          debugPrint('[GEOFENCE] User needs to select "Always" in location permission dialog');
          // iOS handles this through the permission dialog automatically
        }
      }

      // Return true if we have at least whileInUse permission
      // Background tracking will work if user has granted always permission
      return permission == geo.LocationPermission.whileInUse || 
             permission == geo.LocationPermission.always;
             
    } catch (e) {
      debugPrint('[GEOFENCE] Error checking permissions: $e');
      return false;
    }
  }

  /// Register a geofence for a gym
  Future<bool> registerGymGeofence({
    required String gymId,
    required double latitude,
    required double longitude,
    required double radius,
  }) async {
    try {
      // Check permissions first
      final hasPermission = await checkAndRequestPermissions();
      if (!hasPermission) {
        debugPrint('[GEOFENCE] Insufficient permissions');
        return false;
      }

      // Remove existing geofences
      await removeAllGeofences();

      // Create new geofence
      final geofence = Geofence(
        id: gymId,
        latitude: latitude,
        longitude: longitude,
        radius: [
          GeofenceRadius(id: 'radius_$radius', length: radius),
        ],
      );

      _geofenceList = [geofence];
      _currentGymId = gymId;

      // Save to preferences for persistence
      await _saveGeofenceToPreferences(gymId, latitude, longitude, radius);

      // Start geofence service with proper error handling
      try {
        await _geofenceService.start(_geofenceList);
        _isServiceRunning = true;
        notifyListeners();

        // Show an ongoing notification so Android keeps the process alive
        // when the app is sent to the background (screen off / locked).
        await LocalNotificationService.instance.showGeofenceActiveNotification();

        // ── Start the true killed-app foreground service ──────────────────────
        // Persist auto-mark flags so the background isolate can read them.
        await ForegroundTaskService.persistAutoMarkFlags(
          autoMarkEntry: shouldAutoMarkEntry(),
          autoMarkExit:  shouldAutoMarkExit(),
        );
        // Start the persistent Android foreground service (survives force-kill).
        await _fgTaskService.startService();

        debugPrint('[GEOFENCE] Geofence registered for gym: $gymId');
        debugPrint('[GEOFENCE] Location: ($latitude, $longitude), Radius: $radius m');
        debugPrint('[GEOFENCE] Foreground task service started for killed-app tracking');

        return true;
      } catch (startError) {
        debugPrint('[GEOFENCE] Error starting geofence service: $startError');
        // Clean up on failure
        _geofenceList.clear();
        _currentGymId = null;
        _isServiceRunning = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('[GEOFENCE] Error registering geofence: $e');
      return false;
    }
  }

  /// Remove all geofences
  Future<void> removeAllGeofences() async {
    try {
      if (_isServiceRunning) {
        await _geofenceService.stop();
      }
      _geofenceList.clear();
      _currentGymId = null;
      _isServiceRunning = false;

      // Dismiss the ongoing background-tracking notification
      await LocalNotificationService.instance.hideGeofenceActiveNotification();

      // Stop the persistent foreground service
      await _fgTaskService.stopService();

      // Clear from preferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('geofence_gym_id');
      await prefs.remove('geofence_latitude');
      await prefs.remove('geofence_longitude');
      await prefs.remove('geofence_radius');
      await prefs.remove('geofence_type');
      await prefs.remove('geofence_polygon_coordinates');
      
      notifyListeners();
      debugPrint('[GEOFENCE] All geofences removed');
    } catch (e) {
      debugPrint('[GEOFENCE] Error removing geofences: $e');
    }
  }

  /// Restore geofence from saved preferences (called on app start)
  Future<bool> restoreGeofenceFromPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final gymId = prefs.getString('geofence_gym_id');
      final latitude = prefs.getDouble('geofence_latitude');
      final longitude = prefs.getDouble('geofence_longitude');
      final radius = prefs.getDouble('geofence_radius');

      if (gymId != null && latitude != null && longitude != null && radius != null) {
        debugPrint('[GEOFENCE] Restoring geofence for gym: $gymId');

        // Check permissions before restoring
        final hasPermission = await checkAndRequestPermissions();
        if (!hasPermission) {
          debugPrint('[GEOFENCE] Cannot restore geofence: insufficient permissions');
          return false;
        }

        final registered = await registerGymGeofence(
          gymId: gymId,
          latitude: latitude,
          longitude: longitude,
          radius: radius,
        );

        if (registered) {
          // Reload attendance settings so that shouldAutoMarkEntry/Exit()
          // and isGeofenceEnabledInSettings() return correct values for this
          // session even though configureFromSettings() was not called.
          debugPrint('[GEOFENCE] Reloading attendance settings after restore…');
          _attendanceSettings = await _settingsService.loadSettings(gymId);
          if (_attendanceSettings != null) {
            debugPrint('[GEOFENCE] Settings restored – autoMarkEntry: '
                '${_attendanceSettings!.geofenceSettings?.autoMarkEntry}, '
                'autoMarkExit: ${_attendanceSettings!.geofenceSettings?.autoMarkExit}');
          }
        }

        return registered;
      }

      debugPrint('[GEOFENCE] No saved geofence to restore');
      return false;
    } catch (e) {
      debugPrint('[GEOFENCE] Error restoring geofence: $e');
      return false;
    }
  }

  /// Get current permission status
  Future<String> getPermissionStatus() async {
    try {
      final permission = await geo.Geolocator.checkPermission();
      switch (permission) {
        case geo.LocationPermission.denied:
          return 'denied';
        case geo.LocationPermission.deniedForever:
          return 'deniedForever';
        case geo.LocationPermission.whileInUse:
          return 'whileInUse';
        case geo.LocationPermission.always:
          return 'always';
        default:
          return 'unknown';
      }
    } catch (e) {
      debugPrint('[GEOFENCE] Error getting permission status: $e');
      return 'error';
    }
  }

  /// Check if location services are enabled on the device
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await geo.Geolocator.isLocationServiceEnabled();
    } catch (e) {
      debugPrint('[GEOFENCE] Error checking location service: $e');
      return false;
    }
  }

  /// Save geofence data to preferences
  Future<void> _saveGeofenceToPreferences(
      String gymId, double latitude, double longitude, double radius) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('geofence_gym_id', gymId);
    await prefs.setDouble('geofence_latitude', latitude);
    await prefs.setDouble('geofence_longitude', longitude);
    await prefs.setDouble('geofence_radius', radius);
    // Type defaults to circular when saved via this method
    await prefs.setString('geofence_type', 'circular');
    await prefs.remove('geofence_polygon_coordinates');
  }

  /// Save full geofence settings (including polygon) to preferences
  Future<void> _saveFullGeofenceToPreferences({
    required String gymId,
    required double latitude,
    required double longitude,
    required double radius,
    required String type,
    List<Map<String, double>> polygonCoordinates = const [],
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('geofence_gym_id', gymId);
    await prefs.setDouble('geofence_latitude', latitude);
    await prefs.setDouble('geofence_longitude', longitude);
    await prefs.setDouble('geofence_radius', radius);
    await prefs.setString('geofence_type', type);
    if (type == 'polygon' && polygonCoordinates.isNotEmpty) {
      // Serialize as comma-separated "lat:lng" pairs
      final encoded = polygonCoordinates
          .map((c) => '${c['lat']!}:${c['lng']!}')
          .join(',');
      await prefs.setString('geofence_polygon_coordinates', encoded);
    } else {
      await prefs.remove('geofence_polygon_coordinates');
    }
  }

  /// Callback when geofence status changes
  Future<void> _onGeofenceStatusChanged(
      Geofence geofence,
      GeofenceRadius geofenceRadius,
      GeofenceStatus geofenceStatus,
      dynamic location) async {
    debugPrint('[GEOFENCE] Status changed: ${geofenceStatus.toString()}');
    debugPrint('[GEOFENCE] Gym ID: ${geofence.id}');

    if (location != null) {
      debugPrint('[GEOFENCE] Location: ${location.latitude}, ${location.longitude}');
      debugPrint('[GEOFENCE] Accuracy: ${location.accuracy}');
      debugPrint('[GEOFENCE] Is Mock: ${location.isMock ?? false}');
    }

    // Emit raw event to stream (AttendanceProvider listens to this)
    _geofenceController.add(geofenceStatus);

    if (geofenceStatus == GeofenceStatus.ENTER) {
      // Record entry time and show "gym detected" notification.
      // Actual attendance marking waits for DWELL (5 min).
      _enterTimestamps[geofence.id] = DateTime.now();
      await _handleGeofenceEntry(geofence.id, location);
    } else if (geofenceStatus == GeofenceStatus.DWELL) {
      // User has been inside the geofence for loiteringDelayMs (5 min).
      // This is the trigger for auto attendance marking.
      await _handleGeofenceDwell(geofence.id, location);
    } else if (geofenceStatus == GeofenceStatus.EXIT) {
      _enterTimestamps.remove(geofence.id);
      await _handleGeofenceExit(geofence.id, location);
    }
  }

  /// Callback when location changes
  void _onLocationChanged(dynamic location) {
    if (location != null) {
      debugPrint('[GEOFENCE] Location update: ${location.latitude}, ${location.longitude}');
    }
  }

  /// Callback when location services status changes
  void _onLocationServicesStatusChanged(bool status) {
    debugPrint('[GEOFENCE] Location services ${status ? 'enabled' : 'disabled'}');
    if (!status) {
      // Location services disabled, handle accordingly
      // You might want to show a notification to the user
    }
  }

  /// Callback for stream errors
  void _onStreamError(dynamic error) {
    debugPrint('[GEOFENCE] Stream error: $error');
  }

  /// Handle geofence ENTER event
  /// Fires when the user first crosses into the geofence boundary.
  /// We show a local notification so the user knows the 5-min timer started.
  Future<void> _handleGeofenceEntry(String gymId, dynamic location) async {
    debugPrint('[GEOFENCE] ENTER event for gym: $gymId (5-min dwell timer started)');
    try {
      // Notify user that we detected the gym — attendance will be marked at DWELL
      await LocalNotificationService.instance.showGeofenceEnteredNotification(
        gymName: _attendanceSettings?.gymId ?? 'your gym',
      );
    } catch (e) {
      debugPrint('[GEOFENCE] Error showing entry notification: $e');
    }
  }

  /// Handle geofence DWELL event (fires after loiteringDelayMs = 5 min).
  /// This is the actual trigger for auto attendance marking.
  /// AttendanceProvider listens to the stream and will call the backend API.
  Future<void> _handleGeofenceDwell(String gymId, dynamic location) async {
    debugPrint('[GEOFENCE] DWELL event (5 min inside) for gym: $gymId – triggering attendance mark');
    // The stream event (DWELL) is already emitted above; AttendanceProvider
    // will detect it and call markAttendanceEntry().
  }

  /// Handle geofence EXIT event
  Future<void> _handleGeofenceExit(String gymId, dynamic location) async {
    debugPrint('[GEOFENCE] EXIT event for gym: $gymId');
    // Stream event (EXIT) already emitted; AttendanceProvider handles the API call.
  }

  /// Get current location
  Future<geo.Position?> getCurrentLocation() async {
    try {
      final hasPermission = await checkAndRequestPermissions();
      if (!hasPermission) {
        return null;
      }

      return await geo.Geolocator.getCurrentPosition(
        desiredAccuracy: geo.LocationAccuracy.high,
      );
    } catch (e) {
      debugPrint('[GEOFENCE] Error getting current location: $e');
      return null;
    }
  }

  /// Calculate distance between two points (Haversine formula)
  double calculateDistance(
      double lat1, double lon1, double lat2, double lon2) {
    return geo.Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  /// Check if a location is inside the geofence
  bool isInsideGeofence(double lat, double lon) {
    if (_geofenceList.isEmpty) return false;

    final geofence = _geofenceList.first;
    final distance = calculateDistance(
        lat, lon, geofence.latitude, geofence.longitude);
    
    return distance <= geofence.radius.first.length;
  }

  /// Pause geofence service
  Future<void> pause() async {
    if (_isServiceRunning) {
      _geofenceService.pause();
      debugPrint('[GEOFENCE] Service paused');
    }
  }

  /// Resume geofence service
  Future<void> resume() async {
    if (_isServiceRunning) {
      _geofenceService.resume();
      debugPrint('[GEOFENCE] Service resumed');
    }
  }

  /// Load and configure geofence based on gym's attendance settings
  Future<bool> configureFromSettings(String gymId) async {
    try {
      debugPrint('[GEOFENCE] Loading attendance settings for gym: $gymId');
      
      // Load attendance settings
      _attendanceSettings = await _settingsService.loadSettings(gymId);

      if (_attendanceSettings == null) {
        debugPrint('[GEOFENCE] Failed to load attendance settings');
        return false;
      }

      debugPrint('[GEOFENCE] Settings loaded - Mode: ${_attendanceSettings!.mode}');
      debugPrint('[GEOFENCE] Geofence enabled: ${_attendanceSettings!.geofenceEnabled}');

      // Check if geofence is enabled and properly configured
      if (!_attendanceSettings!.geofenceEnabled) {
        debugPrint('[GEOFENCE] Geofence is not enabled for this gym');
        return false;
      }

      if (_attendanceSettings!.geofenceSettings == null ||
          !_attendanceSettings!.geofenceSettings!.isValid) {
        debugPrint('[GEOFENCE] Geofence settings are not properly configured');
        return false;
      }

      final geofenceSettings = _attendanceSettings!.geofenceSettings!;
      final isPolygon = geofenceSettings.type == 'polygon';

      debugPrint('[GEOFENCE] Geofence type: ${geofenceSettings.type}');

      // For both circular and polygon, the backend provides pre-computed
      // centroid lat/lng and bounding-circle radius so geofence_service
      // (which only supports circular) can do a broad-area check.
      // For polygon, the exact containment check happens on the backend
      // when the attendance API is called.
      final success = await registerGymGeofence(
        gymId: gymId,
        latitude: geofenceSettings.latitude!,
        longitude: geofenceSettings.longitude!,
        radius: geofenceSettings.radius!,
      );

      if (success) {
        // Persist full geofence data (including polygon coords) for the
        // background isolate (foreground task service) that does its own
        // containment check without a backend call.
        await _saveFullGeofenceToPreferences(
          gymId: gymId,
          latitude: geofenceSettings.latitude!,
          longitude: geofenceSettings.longitude!,
          radius: geofenceSettings.radius!,
          type: geofenceSettings.type,
          polygonCoordinates: isPolygon ? geofenceSettings.polygonCoordinates : [],
        );

        debugPrint('[GEOFENCE] Configured successfully from attendance settings');
        debugPrint('[GEOFENCE] Auto-mark entry: ${geofenceSettings.autoMarkEntry}');
        debugPrint('[GEOFENCE] Auto-mark exit: ${geofenceSettings.autoMarkExit}');
      }

      return success;
    } catch (e) {
      debugPrint('[GEOFENCE] Error configuring from settings: $e');
      return false;
    }
  }

  /// Check if attendance settings allow geofencing
  bool isGeofenceEnabledInSettings() {
    return _attendanceSettings?.geofenceEnabled ?? false;
  }

  /// Check if auto-mark entry is enabled
  /// Defaults to true when settings have not been loaded yet so that a
  /// restored geofence (from SharedPreferences) still triggers attendance
  /// marking on the first DWELL event of the session.
  bool shouldAutoMarkEntry() {
    return _attendanceSettings?.geofenceSettings?.autoMarkEntry ?? true;
  }

  /// Check if auto-mark exit is enabled
  /// Same default-true rationale as shouldAutoMarkEntry().
  bool shouldAutoMarkExit() {
    return _attendanceSettings?.geofenceSettings?.autoMarkExit ?? true;
  }

  /// Check if mock locations are allowed
  bool areMockLocationsAllowed() {
    return _attendanceSettings?.geofenceSettings?.allowMockLocation ?? false;
  }

  /// Get minimum accuracy requirement in meters
  int? getMinAccuracyRequirement() {
    return _attendanceSettings?.geofenceSettings?.minAccuracyMeters;
  }

  /// Refresh attendance settings and reconfigure geofence if needed
  Future<bool> refreshSettings(String gymId) async {
    try {
      debugPrint('[GEOFENCE] Refreshing attendance settings');
      
      // Stop current geofence
      if (_isServiceRunning) {
        await removeAllGeofences();
      }

      // Load fresh settings and reconfigure
      return await configureFromSettings(gymId);
    } catch (e) {
      debugPrint('[GEOFENCE] Error refreshing settings: $e');
      return false;
    }
  }

  /// Validate location accuracy against settings
  bool isLocationAccuracyValid(double accuracy) {
    final minAccuracy = getMinAccuracyRequirement();
    if (minAccuracy == null) return true;
    return accuracy <= minAccuracy;
  }

  @override
  void dispose() {
    _geofenceController.close();
    _settingsService.dispose();
    super.dispose();
  }
}
