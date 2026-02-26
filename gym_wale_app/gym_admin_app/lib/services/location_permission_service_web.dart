import 'dart:async';
import 'dart:js_interop';
import 'package:web/web.dart' as web;
import '../models/geofence_config.dart';

/// Web-specific implementation of location permission service
/// Uses browser's Geolocation API via package:web
class LocationPermissionServiceWeb {
  /// Check if geolocation is supported in the browser
  static bool get isGeolocationSupported {
    // Geolocation is always available in modern browsers
    return true;
  }

  /// Check current location permission status
  static Future<LocationPermissionStatus> checkPermissionStatus() async {
    if (!isGeolocationSupported) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: false,
        message: 'Geolocation is not supported in this browser.',
      );
    }

    try {
      // Try to query permission status if supported
      final query = PermissionDescriptor(name: 'geolocation');
      final permissionStatus = await web.window.navigator.permissions.query(query).toDart;
      
      final state = permissionStatus.state;
      
      if (state == 'granted') {
        return LocationPermissionStatus(
          isGranted: true,
          isPermanentlyDenied: false,
          isServiceEnabled: true,
          message: 'Location permission granted.',
        );
      } else if (state == 'denied') {
        return LocationPermissionStatus(
          isGranted: false,
          isPermanentlyDenied: true,
          isServiceEnabled: true,
          message: 'Location permission denied. Please enable it in your browser settings.',
        );
      } else if (state == 'prompt') {
        return LocationPermissionStatus(
          isGranted: false,
          isPermanentlyDenied: false,
          isServiceEnabled: true,
          message: 'Location permission needs to be requested.',
        );
      }
    } catch (e) {
      // Ignore - permission API may not be supported
    }

    // If permission API is not supported, assume we need to request
    return LocationPermissionStatus(
      isGranted: false,
      isPermanentlyDenied: false,
      isServiceEnabled: true,
      message: 'Location permission status unknown. Will request when needed.',
    );
  }

  /// Request location permission by attempting to get current position
  static Future<LocationPermissionStatus> requestPermission() async {
    if (!isGeolocationSupported) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: false,
        message: 'Geolocation is not supported in this browser.',
      );
    }

    try {
      final completer = Completer<LocationPermissionStatus>();
      final geolocation = web.window.navigator.geolocation;

      // Request current position which will trigger permission prompt
      geolocation.getCurrentPosition(
        (web.GeolocationPosition position) {
          // Success - permission granted
          completer.complete(LocationPermissionStatus(
            isGranted: true,
            isPermanentlyDenied: false,
            isServiceEnabled: true,
            message: 'Location permission granted.',
          ));
        }.toJS,
        (web.GeolocationPositionError error) {
          // Error - permission denied or other error
          final errorMessage = error.message;
          final isDenied = error.code == 1; // PERMISSION_DENIED
          
          completer.complete(LocationPermissionStatus(
            isGranted: false,
            isPermanentlyDenied: isDenied,
            isServiceEnabled: true,
            message: isDenied 
                ? 'Location permission denied. Please enable it in your browser settings.'
                : 'Error requesting location: $errorMessage',
          ));
        }.toJS,
        web.PositionOptions(
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        ),
      );

      return await completer.future;
    } catch (e) {
      return LocationPermissionStatus(
        isGranted: false,
        isPermanentlyDenied: false,
        isServiceEnabled: true,
        message: 'Error requesting location permission: $e',
      );
    }
  }

  /// Get current location
  static Future<WebPosition?> getCurrentLocation() async {
    if (!isGeolocationSupported) {
      return null;
    }

    try {
      final completer = Completer<WebPosition?>();
      final geolocation = web.window.navigator.geolocation;

      geolocation.getCurrentPosition(
        (web.GeolocationPosition position) {
          completer.complete(WebPosition(
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: DateTime.now(),
          ));
        }.toJS,
        (web.GeolocationPositionError error) {
          completer.complete(null);
        }.toJS,
        web.PositionOptions(
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        ),
      );

      return await completer.future;
    } catch (e) {
      return null;
    }
  }

  /// Open browser settings (not directly possible, show instructions instead)
  static Future<void> openAppSettings() async {
    web.window.alert(
      'To enable location permissions:\n\n'
      '1. Click the lock icon in your browser\'s address bar\n'
      '2. Find the Location permission setting\n'
      '3. Change it to "Allow"\n'
      '4. Refresh the page'
    );
  }
}

/// Permission descriptor for querying permissions
extension type PermissionDescriptor._(JSObject _) implements JSObject {
  external factory PermissionDescriptor({String name});
}

/// Web-specific position model
class WebPosition {
  final double latitude;
  final double longitude;
  final double accuracy;
  final DateTime timestamp;

  WebPosition({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.timestamp,
  });

  bool get isMocked => false; // Web doesn't expose this information
}
