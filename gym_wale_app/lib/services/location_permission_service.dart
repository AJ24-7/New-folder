import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

/// Location Permission Service for User App
/// Handles all location permission requests and checks for geofencing
class LocationPermissionService {
  /// Check if location services are enabled
  static Future<bool> isLocationServiceEnabled() async {
    // Web platform doesn't support location services check
    if (kIsWeb) {
      return false;
    }
    return await Geolocator.isLocationServiceEnabled();
  }

  /// Check current permission status
  static Future<LocationPermission> checkPermission() async {
    // Web platform returns denied as it doesn't support native permissions
    if (kIsWeb) {
      return LocationPermission.denied;
    }
    return await Geolocator.checkPermission();
  }

  /// Request location permission
  static Future<LocationPermission> requestPermission() async {
    // Web platform returns denied as it doesn't support native permissions
    if (kIsWeb) {
      return LocationPermission.denied;
    }
    return await Geolocator.requestPermission();
  }

  /// Check if we have required permissions for geofencing
  static Future<PermissionStatus> checkGeofencingPermissions() async {
    // Web platform doesn't support geofencing
    if (kIsWeb) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Geofencing is not supported on web platform. Please use the mobile app for automatic attendance.',
        isWebPlatform: true,
      );
    }
    
    // Check if location services are enabled
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Location services are disabled. Please enable location in settings.',
        isWebPlatform: false,
      );
    }

    // Check basic location permission
    final permission = await checkPermission();
    final hasLocationPermission = permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;

    if (!hasLocationPermission) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Location permission is required for attendance tracking.',
        isWebPlatform: false,
      );
    }

    // Check background location permission
    final hasBackgroundPermission = permission == LocationPermission.always;

    // Check activity recognition permission (Android only)
    bool hasActivityRecognition = true;
    if (Platform.isAndroid) {
      final activityStatus = await ph.Permission.activityRecognition.status;
      hasActivityRecognition = activityStatus.isGranted;
    }

    // Can use geofencing if we have at least whileInUse permission
    final canUseGeofencing = hasLocationPermission;

    String message;
    if (!hasBackgroundPermission) {
      message = Platform.isAndroid
          ? 'For best results, grant "Allow all the time" location permission in Settings.'
          : 'For best results, select "Always Allow" location permission.';
    } else {
      message = 'All permissions granted. Geofencing is ready.';
    }

    return PermissionStatus(
      hasLocationPermission: hasLocationPermission,
      hasBackgroundPermission: hasBackgroundPermission,
      hasActivityRecognition: hasActivityRecognition,
      canUseGeofencing: canUseGeofencing,
      message: message,
    );
  }

  /// Request all required permissions for geofencing
  static Future<PermissionStatus> requestGeofencingPermissions() async {
    // Web platform doesn't support geofencing
    if (kIsWeb) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Geofencing is not supported on web platform. Please use the mobile app for automatic attendance.',
        isWebPlatform: true,
      );
    }
    
    // Check if location services are enabled
    final serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Please enable location services in your device settings.',
        isWebPlatform: false,
      );
    }

    // Request location permission
    LocationPermission permission = await checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await requestPermission();
    }

    if (permission == LocationPermission.denied) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Location permission denied. Attendance tracking requires location access.',
        isWebPlatform: false,
      );
    }

    if (permission == LocationPermission.deniedForever) {
      return PermissionStatus(
        hasLocationPermission: false,
        hasBackgroundPermission: false,
        hasActivityRecognition: false,
        canUseGeofencing: false,
        message: 'Location permission permanently denied. Please enable in app settings.',
        isWebPlatform: false,
      );
    }

    // Request activity recognition permission (Android only)
    bool hasActivityRecognition = true;
    if (Platform.isAndroid) {
      final activityStatus = await ph.Permission.activityRecognition.request();
      hasActivityRecognition = activityStatus.isGranted;
    }

    final hasLocationPermission = permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
    final hasBackgroundPermission = permission == LocationPermission.always;
    final canUseGeofencing = hasLocationPermission;

    String message;
    if (!hasBackgroundPermission) {
      if (Platform.isAndroid) {
        message = 'Basic permissions granted. For automatic attendance, go to Settings > Apps > Gym Wale > Permissions > Location and select "Allow all the time".';
      } else {
        message = 'Basic permissions granted. For automatic attendance, tap the location permission and select "Always Allow".';
      }
    } else if (!hasActivityRecognition) {
      message = 'Location permission granted. Activity recognition permission recommended for better accuracy.';
    } else {
      message = 'All permissions granted! Automatic attendance tracking is enabled.';
    }

    return PermissionStatus(
      hasLocationPermission: hasLocationPermission,
      hasBackgroundPermission: hasBackgroundPermission,
      hasActivityRecognition: hasActivityRecognition,
      canUseGeofencing: canUseGeofencing,
      message: message,
      isWebPlatform: false,
    );
  }

  /// Get current location
  static Future<Position?> getCurrentLocation() async {
    try {
      final permission = await checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (e) {
      debugPrint('[LOCATION] Error getting current location: $e');
      return null;
    }
  }

  /// Open app settings
  static Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  /// Open location settings
  static Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  /// Calculate distance between two points in meters
  static double calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  /// Check if a location is within a geofence radius
  static bool isWithinGeofence({
    required double userLat,
    required double userLon,
    required double centerLat,
    required double centerLon,
    required double radiusMeters,
  }) {
    final distance = calculateDistance(userLat, userLon, centerLat, centerLon);
    return distance <= radiusMeters;
  }
}

/// Permission status result
class PermissionStatus {
  final bool hasLocationPermission;
  final bool hasBackgroundPermission;
  final bool hasActivityRecognition;
  final bool canUseGeofencing;
  final String message;
  final bool isWebPlatform;

  PermissionStatus({
    required this.hasLocationPermission,
    required this.hasBackgroundPermission,
    required this.hasActivityRecognition,
    required this.canUseGeofencing,
    required this.message,
    this.isWebPlatform = false,
  });

  bool get isFullyGranted => !isWebPlatform && hasLocationPermission && hasBackgroundPermission;
  bool get needsBackgroundPermission => !isWebPlatform && hasLocationPermission && !hasBackgroundPermission;
  bool get supportsGeofencing => !isWebPlatform;
}
