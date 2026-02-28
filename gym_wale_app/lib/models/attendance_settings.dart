/// Attendance Settings Model for User App
/// Simplified version focused on member-facing settings
class AttendanceSettings {
  final String gymId;
  final AttendanceMode mode;
  final bool geofenceEnabled;
  final bool requiresBackgroundLocation;
  final bool autoMarkEnabled;
  final GeofenceSettings? geofenceSettings;

  AttendanceSettings({
    required this.gymId,
    required this.mode,
    this.geofenceEnabled = false,
    this.requiresBackgroundLocation = false,
    this.autoMarkEnabled = false,
    this.geofenceSettings,
  });

  factory AttendanceSettings.fromJson(Map<String, dynamic> json) {
    return AttendanceSettings(
      gymId: json['gymId'] ?? '',
      mode: _parseAttendanceMode(json['mode']),
      geofenceEnabled: json['geofenceEnabled'] ?? false,
      requiresBackgroundLocation: json['requiresBackgroundLocation'] ?? false,
      autoMarkEnabled: json['autoMarkEnabled'] ?? false,
      geofenceSettings: json['geofenceSettings'] != null
          ? GeofenceSettings.fromJson(json['geofenceSettings'])
          : null,
    );
  }

  static AttendanceMode _parseAttendanceMode(dynamic mode) {
    if (mode == null) return AttendanceMode.manual;
    
    final modeStr = mode.toString().toLowerCase();
    switch (modeStr) {
      case 'geofence':
        return AttendanceMode.geofence;
      case 'biometric':
        return AttendanceMode.biometric;
      case 'qr':
        return AttendanceMode.qr;
      case 'hybrid':
        return AttendanceMode.hybrid;
      default:
        return AttendanceMode.manual;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'gymId': gymId,
      'mode': mode.toString().split('.').last,
      'geofenceEnabled': geofenceEnabled,
      'requiresBackgroundLocation': requiresBackgroundLocation,
      'autoMarkEnabled': autoMarkEnabled,
      'geofenceSettings': geofenceSettings?.toJson(),
    };
  }

  AttendanceSettings copyWith({
    String? gymId,
    AttendanceMode? mode,
    bool? geofenceEnabled,
    bool? requiresBackgroundLocation,
    bool? autoMarkEnabled,
    GeofenceSettings? geofenceSettings,
  }) {
    return AttendanceSettings(
      gymId: gymId ?? this.gymId,
      mode: mode ?? this.mode,
      geofenceEnabled: geofenceEnabled ?? this.geofenceEnabled,
      requiresBackgroundLocation:
          requiresBackgroundLocation ?? this.requiresBackgroundLocation,
      autoMarkEnabled: autoMarkEnabled ?? this.autoMarkEnabled,
      geofenceSettings: geofenceSettings ?? this.geofenceSettings,
    );
  }

  bool get isGeofenceMode =>
      mode == AttendanceMode.geofence || mode == AttendanceMode.hybrid;

  bool get requiresPermissions => geofenceEnabled || requiresBackgroundLocation;
}

/// Attendance Mode Enum
enum AttendanceMode {
  manual,
  geofence,
  biometric,
  qr,
  hybrid, // Combination of multiple modes
}

/// Geofence Settings for User App
class GeofenceSettings {
  final bool enabled;
  final double? latitude;
  final double? longitude;
  final double? radius;
  final bool autoMarkEntry;
  final bool autoMarkExit;
  final bool allowMockLocation;
  final int? minAccuracyMeters;

  GeofenceSettings({
    required this.enabled,
    this.latitude,
    this.longitude,
    this.radius,
    this.autoMarkEntry = true,
    this.autoMarkExit = true,
    this.allowMockLocation = false,
    this.minAccuracyMeters,
  });

  factory GeofenceSettings.fromJson(Map<String, dynamic> json) {
    return GeofenceSettings(
      enabled: json['enabled'] ?? false,
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      radius: json['radius']?.toDouble(),
      autoMarkEntry: json['autoMarkEntry'] ?? true,
      autoMarkExit: json['autoMarkExit'] ?? true,
      allowMockLocation: json['allowMockLocation'] ?? false,
      minAccuracyMeters: json['minAccuracyMeters'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'enabled': enabled,
      'latitude': latitude,
      'longitude': longitude,
      'radius': radius,
      'autoMarkEntry': autoMarkEntry,
      'autoMarkExit': autoMarkExit,
      'allowMockLocation': allowMockLocation,
      'minAccuracyMeters': minAccuracyMeters,
    };
  }

  GeofenceSettings copyWith({
    bool? enabled,
    double? latitude,
    double? longitude,
    double? radius,
    bool? autoMarkEntry,
    bool? autoMarkExit,
    bool? allowMockLocation,
    int? minAccuracyMeters,
  }) {
    return GeofenceSettings(
      enabled: enabled ?? this.enabled,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      radius: radius ?? this.radius,
      autoMarkEntry: autoMarkEntry ?? this.autoMarkEntry,
      autoMarkExit: autoMarkExit ?? this.autoMarkExit,
      allowMockLocation: allowMockLocation ?? this.allowMockLocation,
      minAccuracyMeters: minAccuracyMeters ?? this.minAccuracyMeters,
    );
  }

  bool get isConfigured =>
      latitude != null && longitude != null && radius != null;

  bool get isValid => enabled && isConfigured;
}
