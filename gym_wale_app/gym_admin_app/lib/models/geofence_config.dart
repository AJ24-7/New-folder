import 'dart:math';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Geofence Configuration Model
/// Supports both circular and polygon geofences
class GeofenceConfig {
  final String id;
  final String gymId;
  final GeofenceType type;
  
  // For circular geofence
  final LatLng? center;
  final double? radius; // in meters
  
  // For polygon geofence
  final List<LatLng>? polygonCoordinates;
  
  // Common settings
  final bool enabled;
  final bool autoMarkEntry;
  final bool autoMarkExit;
  final bool allowMockLocation;
  final int minimumAccuracy; // in meters
  final int minimumStayDuration; //in minutes
  
  // Operating hours
  final String? operatingHoursStart;
  final String? operatingHoursEnd;
  
  final DateTime createdAt;
  final DateTime updatedAt;

  GeofenceConfig({
    required this.id,
    required this.gymId,
    required this.type,
    this.center,
    this.radius,
    this.polygonCoordinates,
    this.enabled = true,
    this.autoMarkEntry = true,
    this.autoMarkExit = true,
    this.allowMockLocation = false,
    this.minimumAccuracy = 20,
    this.minimumStayDuration = 5,
    this.operatingHoursStart,
    this.operatingHoursEnd,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GeofenceConfig.fromJson(Map<String, dynamic> json) {
    List<LatLng>? coordinates;
    if (json['polygonCoordinates'] != null) {
      coordinates = (json['polygonCoordinates'] as List)
          .map((coord) => LatLng(
                coord['lat'] ?? coord['latitude'] ?? 0.0,
                coord['lng'] ?? coord['longitude'] ?? 0.0,
              ))
          .toList();
    }

    return GeofenceConfig(
      id: json['_id'] ?? json['id'] ?? '',
      gymId: json['gymId'] ?? '',
      type: _parseGeofenceType(json['type']),
      center: json['center'] != null
          ? LatLng(
              json['center']['lat'] ?? json['center']['latitude'] ?? 0.0,
              json['center']['lng'] ?? json['center']['longitude'] ?? 0.0,
            )
          : null,
      radius: json['radius']?.toDouble(),
      polygonCoordinates: coordinates,
      enabled: json['enabled'] ?? true,
      autoMarkEntry: json['autoMarkEntry'] ?? true,
      autoMarkExit: json['autoMarkExit'] ?? true,
      allowMockLocation: json['allowMockLocation'] ?? false,
      minimumAccuracy: json['minimumAccuracy'] ?? 20,
      minimumStayDuration: json['minimumStayDuration'] ?? 5,
      operatingHoursStart: json['operatingHoursStart'],
      operatingHoursEnd: json['operatingHoursEnd'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'gymId': gymId,
      'type': type.toString().split('.').last,
      if (center != null) 'center': {
        'lat': center!.latitude,
        'lng': center!.longitude,
      },
      if (radius != null) 'radius': radius,
      if (polygonCoordinates != null) 'polygonCoordinates': polygonCoordinates!
          .map((coord) => {
                'lat': coord.latitude,
                'lng': coord.longitude,
              })
          .toList(),
      'enabled': enabled,
      'autoMarkEntry': autoMarkEntry,
      'autoMarkExit': autoMarkExit,
      'allowMockLocation': allowMockLocation,
      'minimumAccuracy': minimumAccuracy,
      'minimumStayDuration': minimumStayDuration,
      if (operatingHoursStart != null) 'operatingHoursStart': operatingHoursStart,
      if (operatingHoursEnd != null) 'operatingHoursEnd': operatingHoursEnd,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static GeofenceType _parseGeofenceType(String? type) {
    switch (type?.toLowerCase()) {
      case 'polygon':
        return GeofenceType.polygon;
      case 'circular':
      case 'circle':
        return GeofenceType.circular;
      default:
        return GeofenceType.circular;
    }
  }

  bool get isPolygon => type == GeofenceType.polygon;
  bool get isCircular => type == GeofenceType.circular;

  /// Check if a point is inside the geofence
  bool containsPoint(LatLng point) {
    if (isCircular && center != null && radius != null) {
      return _isPointInCircle(point, center!, radius!);
    } else if (isPolygon && polygonCoordinates != null) {
      return _isPointInPolygon(point, polygonCoordinates!);
    }
    return false;
  }

  /// Calculate distance between two points using Haversine formula
  static double _calculateDistance(LatLng point1, LatLng point2) {
    const earthRadius = 6371000; // meters
    final lat1Rad = point1.latitude * (pi / 180);
    final lat2Rad = point2.latitude * (pi / 180);
    final deltaLat = (point2.latitude - point1.latitude) * (pi / 180);
    final deltaLng = (point2.longitude - point1.longitude) * (pi / 180);

    final a = sin(deltaLat / 2) * sin(deltaLat / 2) +
        cos(lat1Rad) * cos(lat2Rad) * sin(deltaLng / 2) * sin(deltaLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));

    return earthRadius * c;
  }

  bool _isPointInCircle(LatLng point, LatLng center, double radius) {
    final distance = _calculateDistance(point, center);
    return distance <= radius;
  }

  /// Ray casting algorithm to check if point is inside polygon
  bool _isPointInPolygon(LatLng point, List<LatLng> polygon) {
    bool inside = false;
    for (int i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].latitude > point.latitude) != (polygon[j].latitude > point.latitude)) &&
          (point.longitude <
              (polygon[j].longitude - polygon[i].longitude) *
                      (point.latitude - polygon[i].latitude) /
                      (polygon[j].latitude - polygon[i].latitude) +
                  polygon[i].longitude)) {
        inside = !inside;
      }
    }
    return inside;
  }

  GeofenceConfig copyWith({
    String? id,
    String? gymId,
    GeofenceType? type,
    LatLng? center,
    double? radius,
    List<LatLng>? polygonCoordinates,
    bool? enabled,
    bool? autoMarkEntry,
    bool? autoMarkExit,
    bool? allowMockLocation,
    int? minimumAccuracy,
    int? minimumStayDuration,
    String? operatingHoursStart,
    String? operatingHoursEnd,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return GeofenceConfig(
      id: id ?? this.id,
      gymId: gymId ?? this.gymId,
      type: type ?? this.type,
      center: center ?? this.center,
      radius: radius ?? this.radius,
      polygonCoordinates: polygonCoordinates ?? this.polygonCoordinates,
      enabled: enabled ?? this.enabled,
      autoMarkEntry: autoMarkEntry ?? this.autoMarkEntry,
      autoMarkExit: autoMarkExit ?? this.autoMarkExit,
      allowMockLocation: allowMockLocation ?? this.allowMockLocation,
      minimumAccuracy: minimumAccuracy ?? this.minimumAccuracy,
      minimumStayDuration: minimumStayDuration ?? this.minimumStayDuration,
      operatingHoursStart: operatingHoursStart ?? this.operatingHoursStart,
      operatingHoursEnd: operatingHoursEnd ?? this.operatingHoursEnd,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

enum GeofenceType {
  circular,
  polygon,
}

/// Permission Status Model
class LocationPermissionStatus {
  final bool isGranted;
  final bool isPermanentlyDenied;
  final bool isServiceEnabled;
  final String message;

  LocationPermissionStatus({
    required this.isGranted,
    required this.isPermanentlyDenied,
    required this.isServiceEnabled,
    required this.message,
  });

  bool get canUseLocation => isGranted && isServiceEnabled;
}
