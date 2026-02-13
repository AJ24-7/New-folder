/// Attendance Settings Model
class AttendanceSettings {
  final String gymId;
  final AttendanceMode mode;
  final bool autoMarkEnabled;
  final bool requireCheckOut;
  final bool allowLateCheckIn;
  final int? lateThresholdMinutes;
  final bool sendNotifications;
  final bool trackDuration;
  
  // Geofence settings
  final GeofenceSettings? geofenceSettings;
  
  // Manual attendance settings
  final ManualAttendanceSettings? manualSettings;

  AttendanceSettings({
    required this.gymId,
    required this.mode,
    this.autoMarkEnabled = false,
    this.requireCheckOut = false,
    this.allowLateCheckIn = true,
    this.lateThresholdMinutes,
    this.sendNotifications = false,
    this.trackDuration = true,
    this.geofenceSettings,
    this.manualSettings,
  });

  factory AttendanceSettings.fromJson(Map<String, dynamic> json) {
    return AttendanceSettings(
      gymId: json['gymId'] ?? '',
      mode: AttendanceMode.values.firstWhere(
        (e) => e.toString().split('.').last == (json['mode'] ?? 'manual'),
        orElse: () => AttendanceMode.manual,
      ),
      autoMarkEnabled: json['autoMarkEnabled'] ?? false,
      requireCheckOut: json['requireCheckOut'] ?? false,
      allowLateCheckIn: json['allowLateCheckIn'] ?? true,
      lateThresholdMinutes: json['lateThresholdMinutes'],
      sendNotifications: json['sendNotifications'] ?? false,
      trackDuration: json['trackDuration'] ?? true,
      geofenceSettings: json['geofenceSettings'] != null
          ? GeofenceSettings.fromJson(json['geofenceSettings'])
          : null,
      manualSettings: json['manualSettings'] != null
          ? ManualAttendanceSettings.fromJson(json['manualSettings'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'gymId': gymId,
      'mode': mode.toString().split('.').last,
      'autoMarkEnabled': autoMarkEnabled,
      'requireCheckOut': requireCheckOut,
      'allowLateCheckIn': allowLateCheckIn,
      'lateThresholdMinutes': lateThresholdMinutes,
      'sendNotifications': sendNotifications,
      'trackDuration': trackDuration,
      'geofenceSettings': geofenceSettings?.toJson(),
      'manualSettings': manualSettings?.toJson(),
    };
  }

  AttendanceSettings copyWith({
    String? gymId,
    AttendanceMode? mode,
    bool? autoMarkEnabled,
    bool? requireCheckOut,
    bool? allowLateCheckIn,
    int? lateThresholdMinutes,
    bool? sendNotifications,
    bool? trackDuration,
    GeofenceSettings? geofenceSettings,
    ManualAttendanceSettings? manualSettings,
  }) {
    return AttendanceSettings(
      gymId: gymId ?? this.gymId,
      mode: mode ?? this.mode,
      autoMarkEnabled: autoMarkEnabled ?? this.autoMarkEnabled,
      requireCheckOut: requireCheckOut ?? this.requireCheckOut,
      allowLateCheckIn: allowLateCheckIn ?? this.allowLateCheckIn,
      lateThresholdMinutes: lateThresholdMinutes ?? this.lateThresholdMinutes,
      sendNotifications: sendNotifications ?? this.sendNotifications,
      trackDuration: trackDuration ?? this.trackDuration,
      geofenceSettings: geofenceSettings ?? this.geofenceSettings,
      manualSettings: manualSettings ?? this.manualSettings,
    );
  }
}

/// Attendance Mode Enum
enum AttendanceMode {
  manual,
  geofence,
  biometric,
  qr,
  hybrid, // Combination of multiple modes
}

/// Geofence Settings Model
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
}

/// Manual Attendance Settings Model
class ManualAttendanceSettings {
  final bool requireApproval;
  final bool allowBulkMark;
  final bool enableNotes;
  final List<String>? allowedStatuses;

  ManualAttendanceSettings({
    this.requireApproval = false,
    this.allowBulkMark = true,
    this.enableNotes = true,
    this.allowedStatuses,
  });

  factory ManualAttendanceSettings.fromJson(Map<String, dynamic> json) {
    return ManualAttendanceSettings(
      requireApproval: json['requireApproval'] ?? false,
      allowBulkMark: json['allowBulkMark'] ?? true,
      enableNotes: json['enableNotes'] ?? true,
      allowedStatuses: json['allowedStatuses'] != null
          ? List<String>.from(json['allowedStatuses'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'requireApproval': requireApproval,
      'allowBulkMark': allowBulkMark,
      'enableNotes': enableNotes,
      'allowedStatuses': allowedStatuses,
    };
  }
}
