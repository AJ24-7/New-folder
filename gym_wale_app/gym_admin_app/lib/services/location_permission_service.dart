import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as ph;
import 'package:google_maps_flutter/google_maps_flutter.dart' show LatLng;
import '../models/geofence_config.dart';
import 'location_permission_service_web.dart' if (dart.library.io) 'location_permission_service_stub.dart';

/// Location Permission Service
/// Handles all location permission requests and checks across platforms
class LocationPermissionService {
  /// Check current location permission status
  static Future<LocationPermissionStatus> checkPermissionStatus() async {
    if (kIsWeb) {
      return await LocationPermissionServiceWeb.checkPermissionStatus();
    }

    bool serviceEnabled;
    LocationPermission permission;

    // Check if location services are enabled
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: false,
        message: 'Location services are disabled. Please enable location services in settings.',
      );
    }

    // Check permission status
    permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: serviceEnabled,
        message: 'Location permission is denied. Please grant location permission.',
      );
    }

    if (permission == LocationPermission.deniedForever) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: true,
        isServiceEnabled: serviceEnabled,
        message: 'Location permission is permanently denied. Please enable it in app settings.',
      );
    }

    // Permission is granted
    return LocationPermissionStatus(
      isGranted: true,
      isPermanentlyDenied: false,
      isServiceEnabled: serviceEnabled,
      message: 'Location permission granted.',
    );
  }

  /// Request location permission
  static Future<LocationPermissionStatus> requestPermission() async {
    if (kIsWeb) {
      return await LocationPermissionServiceWeb.requestPermission();
    }

    bool serviceEnabled;
    LocationPermission permission;

    // Check if location services are enabled
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: false,
        message: 'Location services are disabled. Please enable location services in settings.',
      );
    }

    // Request permission
    permission = await Geolocator.requestPermission();
    
    if (permission == LocationPermission.denied) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: serviceEnabled,
        message: 'Location permission denied.',
      );
    }

    if (permission == LocationPermission.deniedForever) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: true,
        isServiceEnabled: serviceEnabled,
        message: 'Location permission permanently denied. Please enable it in app settings.',
      );
    }

    return LocationPermissionStatus(
      isGranted: true,
      isPermanentlyDenied: false,
      isServiceEnabled: serviceEnabled,
      message: 'Location permission granted successfully.',
    );
  }

  /// Open app settings
  static Future<void> openAppSettings() async {
    if (kIsWeb) {
      await LocationPermissionServiceWeb.openAppSettings();
    } else {
      await ph.openAppSettings();
    }
  }

  /// Get current location (returns LatLng for cross-platform compatibility)
  static Future<LatLng?> getCurrentLocation() async {
    if (kIsWeb) {
      final webPosition = await LocationPermissionServiceWeb.getCurrentLocation();
      if (webPosition != null) {
        return LatLng(webPosition.latitude, webPosition.longitude);
      }
      return null;
    }

    final status = await checkPermissionStatus();
    
    if (!status.canUseLocation) {
      return null;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      return LatLng(position.latitude, position.longitude);
    } catch (e) {
      debugPrint('Error getting current location: $e');
      return null;
    }
  }
  
  /// Get current position (mobile platforms only)
  static Future<Position?> getCurrentPositionMobile() async {
    if (kIsWeb) {
      return null;
    }

    final status = await checkPermissionStatus();
    
    if (!status.canUseLocation) {
      return null;
    }

    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      debugPrint('Error getting current location: $e');
      return null;
    }
  }

  /// Check if location is mock/fake
  static Future<bool> isMockLocation() async {
    if (kIsWeb) {
      return false;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      return position.isMocked;
    } catch (e) {
      debugPrint('Error checking mock location: $e');
      return false;
    }
  }

  /// Get location accuracy
  static Future<double?> getLocationAccuracy() async {
    if (kIsWeb) {
      return null;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      return position.accuracy;
    } catch (e) {
      debugPrint('Error getting location accuracy: $e');
      return null;
    }
  }
}
