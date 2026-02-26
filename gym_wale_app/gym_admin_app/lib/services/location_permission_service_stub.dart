/// Stub implementation for non-web platforms
/// This file is used for conditional imports but should never be executed
class LocationPermissionServiceWeb {
  static Future<dynamic> checkPermissionStatus() async {
    throw UnsupportedError('Web implementation should not be used on mobile platforms');
  }

  static Future<dynamic> requestPermission() async {
    throw UnsupportedError('Web implementation should not be used on mobile platforms');
  }

  static Future<dynamic> getCurrentLocation() async {
    throw UnsupportedError('Web implementation should not be used on mobile platforms');
  }

  static Future<void> openAppSettings() async {
    throw UnsupportedError('Web implementation should not be used on mobile platforms');
  }
}

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
}
