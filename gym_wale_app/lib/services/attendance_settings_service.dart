import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/attendance_settings.dart';
import '../services/api_service.dart';

/// Attendance Settings Service
/// Manages fetching, caching, and observing attendance settings for a gym
class AttendanceSettingsService extends ChangeNotifier {
  AttendanceSettings? _settings;
  AttendanceSettings? get settings => _settings;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  String? _cachedGymId;

  static const String _cacheKeyPrefix = 'attendance_settings_';
  static const Duration _cacheExpiry = Duration(hours: 1);

  /// Load attendance settings for a gym
  Future<AttendanceSettings?> loadSettings(String gymId) async {
    if (gymId.isEmpty) {
      _error = 'Gym ID is required';
      notifyListeners();
      return null;
    }

    // Return cached settings if available and not expired
    if (_cachedGymId == gymId && _settings != null) {
      final cached = await _getCachedSettings(gymId);
      if (cached != null) {
        debugPrint('[ATTENDANCE SETTINGS] Using cached settings for gym: $gymId');
        return cached;
      }
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.getGymAttendanceSettings(gymId);

      if (response['success'] == true && response['settings'] != null) {
        _settings = AttendanceSettings.fromJson(response['settings']);
        _cachedGymId = gymId;

        // Cache the settings
        await _cacheSettings(gymId, _settings!);

        debugPrint('[ATTENDANCE SETTINGS] Loaded settings for gym: $gymId');
        debugPrint('[ATTENDANCE SETTINGS] Mode: ${_settings!.mode}');
        debugPrint('[ATTENDANCE SETTINGS] Geofence enabled: ${_settings!.geofenceEnabled}');

        _isLoading = false;
        notifyListeners();
        return _settings;
      } else {
        _error = response['message'] ?? 'Failed to load attendance settings';
        _isLoading = false;
        notifyListeners();
        return null;
      }
    } catch (e) {
      _error = 'Error loading attendance settings: $e';
      debugPrint('[ATTENDANCE SETTINGS] Error: $e');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Refresh attendance settings from the server
  Future<AttendanceSettings?> refreshSettings(String gymId) async {
    // Clear cache before fetching
    await _clearCache(gymId);
    return loadSettings(gymId);
  }

  /// Check if geofence is enabled for the current gym
  bool isGeofenceEnabled() {
    return _settings?.geofenceEnabled ?? false;
  }

  /// Check if the gym requires background location permission
  bool requiresBackgroundLocation() {
    return _settings?.requiresBackgroundLocation ?? false;
  }

  /// Check if auto-mark attendance is enabled
  bool isAutoMarkEnabled() {
    return _settings?.autoMarkEnabled ?? false;
  }

  /// Get the current attendance mode
  AttendanceMode getAttendanceMode() {
    return _settings?.mode ?? AttendanceMode.manual;
  }

  /// Check if geofence settings are properly configured
  bool isGeofenceConfigured() {
    if (_settings == null || _settings!.geofenceSettings == null) {
      return false;
    }
    return _settings!.geofenceSettings!.isValid;
  }

  /// Get geofence coordinates
  Map<String, double>? getGeofenceCoordinates() {
    if (_settings?.geofenceSettings == null) return null;

    final gs = _settings!.geofenceSettings!;
    if (gs.latitude == null || gs.longitude == null || gs.radius == null) {
      return null;
    }

    return {
      'latitude': gs.latitude!,
      'longitude': gs.longitude!,
      'radius': gs.radius!,
    };
  }

  /// Cache settings to local storage
  Future<void> _cacheSettings(String gymId, AttendanceSettings settings) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKey = _cacheKeyPrefix + gymId;
      final cacheData = {
        'settings': settings.toJson(),
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };
      await prefs.setString(cacheKey, jsonEncode(cacheData));
      debugPrint('[ATTENDANCE SETTINGS] Cached settings for gym: $gymId');
    } catch (e) {
      debugPrint('[ATTENDANCE SETTINGS] Error caching settings: $e');
    }
  }

  /// Get cached settings if not expired
  Future<AttendanceSettings?> _getCachedSettings(String gymId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKey = _cacheKeyPrefix + gymId;
      final cachedJson = prefs.getString(cacheKey);

      if (cachedJson == null) return null;

      final cacheData = jsonDecode(cachedJson);
      final timestamp = cacheData['timestamp'] as int;
      final cachedTime = DateTime.fromMillisecondsSinceEpoch(timestamp);

      // Check if cache is expired
      if (DateTime.now().difference(cachedTime) > _cacheExpiry) {
        debugPrint('[ATTENDANCE SETTINGS] Cache expired for gym: $gymId');
        await _clearCache(gymId);
        return null;
      }

      _settings = AttendanceSettings.fromJson(cacheData['settings']);
      _cachedGymId = gymId;
      notifyListeners();
      return _settings;
    } catch (e) {
      debugPrint('[ATTENDANCE SETTINGS] Error reading cache: $e');
      return null;
    }
  }

  /// Clear cached settings for a gym
  Future<void> _clearCache(String gymId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKey = _cacheKeyPrefix + gymId;
      await prefs.remove(cacheKey);
      debugPrint('[ATTENDANCE SETTINGS] Cleared cache for gym: $gymId');
    } catch (e) {
      debugPrint('[ATTENDANCE SETTINGS] Error clearing cache: $e');
    }
  }

  /// Clear all cached settings
  Future<void> clearAllCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();
      for (final key in keys) {
        if (key.startsWith(_cacheKeyPrefix)) {
          await prefs.remove(key);
        }
      }
      debugPrint('[ATTENDANCE SETTINGS] Cleared all cached settings');
    } catch (e) {
      debugPrint('[ATTENDANCE SETTINGS] Error clearing all cache: $e');
    }
  }

  /// Clear current settings
  void clearSettings() {
    _settings = null;
    _cachedGymId = null;
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _settings = null;
    _cachedGymId = null;
    super.dispose();
  }
}
