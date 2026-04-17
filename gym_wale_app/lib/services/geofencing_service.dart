import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/attendance_settings.dart';
import './attendance_settings_service.dart';
import './foreground_task_service.dart';

/// Manages geofence configuration, permissions, and the persistent background
/// foreground-task service that handles all attendance tracking (both when the
/// app is open and when it is killed).
///
/// The actual ENTER / DWELL / EXIT detection and attendance API calls are
/// handled exclusively by [ForegroundTaskService] and its background isolate
/// [_GeofenceTaskHandler].  This class is responsible for:
///   • Checking & requesting location permissions
///   • Saving/restoring geofence coordinates to SharedPreferences
///   • Starting/stopping the [ForegroundTaskService]
///   • Loading attendance settings from the backend
class GeofencingService extends ChangeNotifier {
  bool _isServiceRunning = false;
  bool get isServiceRunning => _isServiceRunning;

  String? _currentGymId;
  String? get currentGymId => _currentGymId;

  AttendanceSettings? _attendanceSettings;
  AttendanceSettings? get attendanceSettings => _attendanceSettings;

  final AttendanceSettingsService _settingsService = AttendanceSettingsService();
  final ForegroundTaskService _fgTaskService = ForegroundTaskService();

  GeofencingService();


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

      _currentGymId = gymId;

      // Save to preferences for persistence
      await _saveGeofenceToPreferences(gymId, latitude, longitude, radius);

      // Start the persistent foreground service
      try {
        // Persist auto-mark flags so the background isolate can read them.
        await ForegroundTaskService.persistAutoMarkFlags(
          autoMarkEntry: shouldAutoMarkEntry(),
          autoMarkExit:  shouldAutoMarkExit(),
        );
        // Persist operating schedule so the background isolate can gate events.
        if (_attendanceSettings != null) {
          final gs = _attendanceSettings!.geofenceSettings;
          final hours = _attendanceSettings!.operatingHours;
          await ForegroundTaskService.persistOperatingSchedule(
            morningOpening: gs?.morningShift?.opening ?? hours?.morning?.opening,
            morningClosing: gs?.morningShift?.closing ?? hours?.morning?.closing,
            eveningOpening: gs?.eveningShift?.opening ?? hours?.evening?.opening,
            eveningClosing: gs?.eveningShift?.closing ?? hours?.evening?.closing,
            activeDays: gs?.activeDays ?? _attendanceSettings!.activeDays,
          );
        }
        // Mark active membership so the background isolate is allowed to
        // poll GPS and call the backend.
        await ForegroundTaskService.persistActiveMembership(true);
        // Start the persistent Android foreground service (survives force-kill).
        await _fgTaskService.startService();

        _isServiceRunning = true;
        notifyListeners();

        debugPrint('[GEOFENCE] Geofence registered for gym: $gymId');
        debugPrint('[GEOFENCE] Location: ($latitude, $longitude), Radius: $radius m');

        return true;
      } catch (startError) {
        debugPrint('[GEOFENCE] Error starting foreground service: $startError');
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

  /// Remove all geofences and stop the background service.
  Future<void> removeAllGeofences() async {
    try {
      _currentGymId = null;
      _isServiceRunning = false;

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
      // Signal the background isolate to halt — no active membership/login.
      await ForegroundTaskService.persistActiveMembership(false);
      await ForegroundTaskService.persistFrozenMembership(false);

      notifyListeners();
      debugPrint('[GEOFENCE] All geofences removed');
    } catch (e) {
      debugPrint('[GEOFENCE] Error removing geofences: $e');
    }
  }

  /// Restore geofence from saved preferences (called on app start).
  ///
  /// Does **not** stop the persistent foreground task if it is already
  /// running — the background isolate keeps polling GPS without interruption.
  Future<bool> restoreGeofenceFromPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final gymId    = prefs.getString('geofence_gym_id');
      final latitude = prefs.getDouble('geofence_latitude');
      final longitude = prefs.getDouble('geofence_longitude');
      final radius   = prefs.getDouble('geofence_radius');

      if (gymId == null || latitude == null || longitude == null || radius == null) {
        debugPrint('[GEOFENCE] No saved geofence to restore');
        return false;
      }

      debugPrint('[GEOFENCE] Restoring geofence for gym: $gymId');

      // Check permissions before restoring
      final hasPermission = await checkAndRequestPermissions();
      if (!hasPermission) {
        debugPrint('[GEOFENCE] Cannot restore geofence: insufficient permissions');
        return false;
      }

      _currentGymId = gymId;
      _isServiceRunning = true;
      notifyListeners();

      // ── Foreground task: keep alive if running, else restart ─────────────
      // IMPORTANT: never call stopService() during restore — that would kill
      // the background isolate and lose the in-progress dwell timer.
      //
      // Always reaffirm the active-membership flag so the background isolate
      // does not stop itself if the flag was cleared in a previous session.
      await ForegroundTaskService.persistActiveMembership(true);

      final fgRunning = await _fgTaskService.isRunning;
      if (fgRunning) {
        debugPrint('[GEOFENCE] Foreground task already running — keeping alive on restore');
        // DO NOT overwrite the notification text here.  The background
        // isolate's _tick() owns the persistent notification and may be
        // showing a dwell countdown, operating-hours diagnostic, or error
        // state.  Resetting to "Monitoring your location…" would hide that
        // information and confuse users debugging an operating-hours issue.
      } else {
        debugPrint('[GEOFENCE] Foreground task not running — starting after restore');
        await _fgTaskService.startService();
      }

      // ── Reload attendance settings ────────────────────────────────────────
      debugPrint('[GEOFENCE] Reloading attendance settings after restore…');
      _attendanceSettings = await _settingsService.loadSettings(gymId);
      if (_attendanceSettings != null) {
        debugPrint('[GEOFENCE] Settings restored – autoMarkEntry: '
            '${_attendanceSettings!.geofenceSettings?.autoMarkEntry}, '
            'autoMarkExit: ${_attendanceSettings!.geofenceSettings?.autoMarkExit}');
        // Keep the background isolate in sync with the latest settings.
        await ForegroundTaskService.persistAutoMarkFlags(
          autoMarkEntry: shouldAutoMarkEntry(),
          autoMarkExit:  shouldAutoMarkExit(),
        );
        final gs    = _attendanceSettings!.geofenceSettings;
        final hours = _attendanceSettings!.operatingHours;
        await ForegroundTaskService.persistOperatingSchedule(
          morningOpening: gs?.morningShift?.opening ?? hours?.morning?.opening,
          morningClosing: gs?.morningShift?.closing ?? hours?.morning?.closing,
          eveningOpening: gs?.eveningShift?.opening ?? hours?.evening?.opening,
          eveningClosing: gs?.eveningShift?.closing ?? hours?.evening?.closing,
          activeDays: gs?.activeDays ?? _attendanceSettings!.activeDays,
        );
      }

      return true;
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

  /// Load and configure geofence based on gym's attendance settings
  Future<bool> configureFromSettings(String gymId, {bool isFrozen = false}) async {
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

      // Persist frozen membership state for the background isolate
      await ForegroundTaskService.persistFrozenMembership(isFrozen);
      if (isFrozen) {
        debugPrint('[GEOFENCE] Membership is frozen — geofence paused');
        return false;
      }

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

      // Persist the full geofence data (including polygon coords, operating
      // schedule, and auto-mark flags) BEFORE starting the service so the
      // background isolate reads the correct values on its very first tick.
      // This avoids a race where the service would otherwise start with the
      // interim circular-type data written by registerGymGeofence.
      await _saveFullGeofenceToPreferences(
        gymId: gymId,
        latitude: geofenceSettings.latitude!,
        longitude: geofenceSettings.longitude!,
        radius: geofenceSettings.radius!,
        type: geofenceSettings.type,
        polygonCoordinates: isPolygon ? geofenceSettings.polygonCoordinates : [],
      );

      final hours = _attendanceSettings!.operatingHours;
      await ForegroundTaskService.persistOperatingSchedule(
        morningOpening: geofenceSettings.morningShift?.opening ?? hours?.morning?.opening,
        morningClosing: geofenceSettings.morningShift?.closing ?? hours?.morning?.closing,
        eveningOpening: geofenceSettings.eveningShift?.opening ?? hours?.evening?.opening,
        eveningClosing: geofenceSettings.eveningShift?.closing ?? hours?.evening?.closing,
        activeDays: geofenceSettings.activeDays ?? _attendanceSettings!.activeDays,
      );

      await ForegroundTaskService.persistAutoMarkFlags(
        autoMarkEntry: shouldAutoMarkEntry(),
        autoMarkExit:  shouldAutoMarkExit(),
      );

      // For both circular and polygon, the backend provides pre-computed
      // centroid lat/lng and bounding-circle radius.  The background isolate
      // does its own containment check (polygon ray-casting or circular
      // distance).  For polygon, the exact containment also re-verified on
      // the backend when the attendance API is called.
      final success = await registerGymGeofence(
        gymId: gymId,
        latitude: geofenceSettings.latitude!,
        longitude: geofenceSettings.longitude!,
        radius: geofenceSettings.radius!,
      );

      if (success) {
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

  /// Called when the background foreground service stops itself (e.g. after
  /// attendance is fully marked for the day).  Updates the running state so
  /// the UI reflects the actual service status.
  void onBackgroundServiceStopped() {
    if (_isServiceRunning) {
      _isServiceRunning = false;
      notifyListeners();
      debugPrint('[GEOFENCE] Background service stopped — UI state updated');
    }
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
    _settingsService.dispose();
    super.dispose();
  }
}
