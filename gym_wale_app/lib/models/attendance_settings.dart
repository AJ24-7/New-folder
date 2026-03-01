/// Attendance Settings Model for User App
/// Simplified version focused on member-facing settings
class AttendanceSettings {
  final String gymId;
  final AttendanceMode mode;
  final bool geofenceEnabled;
  final bool requiresBackgroundLocation;
  final bool autoMarkEnabled;
  final GeofenceSettings? geofenceSettings;
  /// Active days of the week this gym is open (e.g. ['monday','tuesday',...])
  final List<String> activeDays;
  /// Top-level operating hours mirrors from gym profile
  final OperatingHoursInfo? operatingHours;

  AttendanceSettings({
    required this.gymId,
    required this.mode,
    this.geofenceEnabled = false,
    this.requiresBackgroundLocation = false,
    this.autoMarkEnabled = false,
    this.geofenceSettings,
    List<String>? activeDays,
    this.operatingHours,
  }) : activeDays = activeDays ??
            ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

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
      activeDays: json['activeDays'] != null
          ? List<String>.from(json['activeDays'])
          : null,
      operatingHours: json['operatingHours'] != null
          ? OperatingHoursInfo.fromJson(json['operatingHours'])
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
      'activeDays': activeDays,
      'operatingHours': operatingHours?.toJson(),
    };
  }

  AttendanceSettings copyWith({
    String? gymId,
    AttendanceMode? mode,
    bool? geofenceEnabled,
    bool? requiresBackgroundLocation,
    bool? autoMarkEnabled,
    GeofenceSettings? geofenceSettings,
    List<String>? activeDays,
    OperatingHoursInfo? operatingHours,
  }) {
    return AttendanceSettings(
      gymId: gymId ?? this.gymId,
      mode: mode ?? this.mode,
      geofenceEnabled: geofenceEnabled ?? this.geofenceEnabled,
      requiresBackgroundLocation:
          requiresBackgroundLocation ?? this.requiresBackgroundLocation,
      autoMarkEnabled: autoMarkEnabled ?? this.autoMarkEnabled,
      geofenceSettings: geofenceSettings ?? this.geofenceSettings,
      activeDays: activeDays ?? this.activeDays,
      operatingHours: operatingHours ?? this.operatingHours,
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
  /// 'circular' or 'polygon' — matches GeofenceConfig.type on the backend.
  final String type;
  /// Non-empty only when [type] == 'polygon'. Each map has 'lat' & 'lng'.
  final List<Map<String, double>> polygonCoordinates;
  /// Morning operating shift (opening/closing in "HH:mm" format).
  final TimeShift? morningShift;
  /// Evening operating shift (opening/closing in "HH:mm" format).
  final TimeShift? eveningShift;
  /// Active days of the week. Null falls back to AttendanceSettings.activeDays.
  final List<String>? activeDays;
  /// Legacy single-window fields (kept for backward compat).
  final String? operatingHoursStart;
  final String? operatingHoursEnd;
GeofenceSettings({
    required this.enabled,
    this.latitude,
    this.longitude,
    this.radius,
    this.autoMarkEntry = true,
    this.autoMarkExit = true,
    this.allowMockLocation = false,
    this.minAccuracyMeters,
    this.type = 'circular',
    this.polygonCoordinates = const [],
    this.morningShift,
    this.eveningShift,
    this.activeDays,
    this.operatingHoursStart,
    this.operatingHoursEnd,
  });

  factory GeofenceSettings.fromJson(Map<String, dynamic> json) {
    // Parse polygonCoordinates array (list of {lat, lng} maps)
    List<Map<String, double>> polyCords = [];
    if (json['polygonCoordinates'] is List) {
      for (final c in (json['polygonCoordinates'] as List)) {
        if (c is Map) {
          final lat = (c['lat'] as num?)?.toDouble();
          final lng = (c['lng'] as num?)?.toDouble();
          if (lat != null && lng != null) {
            polyCords.add({'lat': lat, 'lng': lng});
          }
        }
      }
    }
    return GeofenceSettings(
      enabled: json['enabled'] ?? false,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      radius: (json['radius'] as num?)?.toDouble(),
      autoMarkEntry: json['autoMarkEntry'] ?? true,
      autoMarkExit: json['autoMarkExit'] ?? true,
      allowMockLocation: json['allowMockLocation'] ?? false,
      minAccuracyMeters: json['minAccuracyMeters'] as int?,
      type: json['type'] as String? ?? 'circular',
      polygonCoordinates: polyCords,
      morningShift: json['morningShift'] != null
          ? TimeShift.fromJson(json['morningShift'])
          : null,
      eveningShift: json['eveningShift'] != null
          ? TimeShift.fromJson(json['eveningShift'])
          : null,
      activeDays: json['activeDays'] != null
          ? List<String>.from(json['activeDays'])
          : null,
      operatingHoursStart: json['operatingHoursStart'] as String?,
      operatingHoursEnd: json['operatingHoursEnd'] as String?,
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
      'type': type,
      'polygonCoordinates': polygonCoordinates,
      'morningShift': morningShift?.toJson(),
      'eveningShift': eveningShift?.toJson(),
      'activeDays': activeDays,
      'operatingHoursStart': operatingHoursStart,
      'operatingHoursEnd': operatingHoursEnd,
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
    String? type,
    List<Map<String, double>>? polygonCoordinates,
    TimeShift? morningShift,
    TimeShift? eveningShift,
    List<String>? activeDays,
    String? operatingHoursStart,
    String? operatingHoursEnd,
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
      type: type ?? this.type,
      polygonCoordinates: polygonCoordinates ?? this.polygonCoordinates,
      morningShift: morningShift ?? this.morningShift,
      eveningShift: eveningShift ?? this.eveningShift,
      activeDays: activeDays ?? this.activeDays,
      operatingHoursStart: operatingHoursStart ?? this.operatingHoursStart,
      operatingHoursEnd: operatingHoursEnd ?? this.operatingHoursEnd,
    );
  }

  bool get isConfigured =>
      type == 'polygon'
          ? polygonCoordinates.length >= 3
          : (latitude != null && longitude != null && radius != null);

  bool get isValid => enabled && isConfigured;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supporting classes
// ─────────────────────────────────────────────────────────────────────────────

/// A single opening/closing time slot in "HH:mm" format.
class TimeShift {
  final String? opening;
  final String? closing;

  const TimeShift({this.opening, this.closing});

  factory TimeShift.fromJson(Map<String, dynamic> json) {
    return TimeShift(
      opening: json['opening'] as String?,
      closing: json['closing'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {'opening': opening, 'closing': closing};
}

/// Top-level operating hours (mirrors gym profile morning + evening slots).
class OperatingHoursInfo {
  final TimeShift? morning;
  final TimeShift? evening;

  const OperatingHoursInfo({this.morning, this.evening});

  factory OperatingHoursInfo.fromJson(Map<String, dynamic> json) {
    return OperatingHoursInfo(
      morning: json['morning'] != null ? TimeShift.fromJson(json['morning']) : null,
      evening: json['evening'] != null ? TimeShift.fromJson(json['evening']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'morning': morning?.toJson(),
    'evening': evening?.toJson(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Operating-hours / active-days helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Returns the lowercase day-of-week name for [now] (e.g. "monday").
String _dayName(DateTime now) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days[now.weekday - 1]; // DateTime.weekday: 1=Mon … 7=Sun
}

/// Parses "HH:mm" → minutes-since-midnight, returns null on error.
int? _parseMinutes(String? hmm) {
  if (hmm == null) return null;
  final parts = hmm.split(':');
  if (parts.length < 2) return null;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return null;
  return h * 60 + m;
}

/// Returns true if [now] falls within at least one of the configured shifts
/// (morning or evening).  If neither shift is configured the function returns
/// true (no restriction).
bool isWithinOperatingHours({
  required DateTime now,
  TimeShift? morningShift,
  TimeShift? eveningShift,
}) {
  final nowMinutes = now.hour * 60 + now.minute;

  final morningOpen  = _parseMinutes(morningShift?.opening);
  final morningClose = _parseMinutes(morningShift?.closing);
  final eveningOpen  = _parseMinutes(eveningShift?.opening);
  final eveningClose = _parseMinutes(eveningShift?.closing);

  // If no shifts configured at all → no restriction
  if (morningOpen == null && eveningOpen == null) return true;

  bool inMorning = false;
  if (morningOpen != null && morningClose != null) {
    inMorning = nowMinutes >= morningOpen && nowMinutes <= morningClose;
  }

  bool inEvening = false;
  if (eveningOpen != null && eveningClose != null) {
    inEvening = nowMinutes >= eveningOpen && nowMinutes <= eveningClose;
  }

  return inMorning || inEvening;
}

/// Returns true if [now]'s day-of-week is in [activeDays].
/// If [activeDays] is empty the function returns true (open every day).
bool isActiveDay({required DateTime now, required List<String> activeDays}) {
  if (activeDays.isEmpty) return true;
  return activeDays.contains(_dayName(now));
}
