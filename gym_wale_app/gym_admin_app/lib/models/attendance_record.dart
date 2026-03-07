/// Attendance Record Model
class AttendanceRecord {
  final String id;
  final String memberId;
  final String memberName;
  final String? memberPhoto;
  final String gymId;
  final DateTime date;
  final String? checkInTime;
  final String? checkOutTime;
  final String status; // 'present', 'absent', 'late', 'leave'
  final String? attendanceType; // 'manual', 'geofence', 'biometric', 'qr'
  final String? notes;
  final DateTime createdAt;
  final DateTime? updatedAt;
  
  // Geofence-specific fields
  final Map<String, dynamic>? geofenceEntry;
  final Map<String, dynamic>? geofenceExit;
  final int? durationInMinutes;
  final bool? isMockLocation;

  AttendanceRecord({
    required this.id,
    required this.memberId,
    required this.memberName,
    this.memberPhoto,
    required this.gymId,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    required this.status,
    this.attendanceType,
    this.notes,
    required this.createdAt,
    this.updatedAt,
    this.geofenceEntry,
    this.geofenceExit,
    this.durationInMinutes,
    this.isMockLocation,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    final rawMember = json['memberId'];
    final memberIsMap = rawMember is Map;
    final rawGym = json['gymId'];
    final gymIsMap = rawGym is Map;

    return AttendanceRecord(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      memberId: (memberIsMap ? rawMember['_id'] : rawMember)?.toString() ?? '',
      memberName: (memberIsMap ? rawMember['name'] : null)?.toString() ?? json['memberName']?.toString() ?? 'Unknown',
      memberPhoto: (memberIsMap ? rawMember['photo'] : null)?.toString() ?? json['memberPhoto']?.toString(),
      gymId: (gymIsMap ? rawGym['_id'] : rawGym)?.toString() ?? '',
      date: DateTime.parse(json['date']),
      checkInTime: json['checkInTime']?.toString(),
      checkOutTime: json['checkOutTime']?.toString(),
      status: json['status']?.toString() ?? 'absent',
      attendanceType: json['attendanceType']?.toString(),
      notes: json['notes']?.toString(),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
      geofenceEntry: json['geofenceEntry'] is Map<String, dynamic> ? json['geofenceEntry'] : null,
      geofenceExit: json['geofenceExit'] is Map<String, dynamic> ? json['geofenceExit'] : null,
      durationInMinutes: json['durationInMinutes'] is num ? (json['durationInMinutes'] as num).toInt() : null,
      isMockLocation: json['isMockLocation'] is bool ? json['isMockLocation'] : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'memberId': memberId,
      'memberName': memberName,
      'memberPhoto': memberPhoto,
      'gymId': gymId,
      'date': date.toIso8601String(),
      'checkInTime': checkInTime,
      'checkOutTime': checkOutTime,
      'status': status,
      'attendanceType': attendanceType,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'geofenceEntry': geofenceEntry,
      'geofenceExit': geofenceExit,
      'durationInMinutes': durationInMinutes,
      'isMockLocation': isMockLocation,
    };
  }

  AttendanceRecord copyWith({
    String? id,
    String? memberId,
    String? memberName,
    String? memberPhoto,
    String? gymId,
    DateTime? date,
    String? checkInTime,
    String? checkOutTime,
    String? status,
    String? attendanceType,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? geofenceEntry,
    Map<String, dynamic>? geofenceExit,
    int? durationInMinutes,
    bool? isMockLocation,
  }) {
    return AttendanceRecord(
      id: id ?? this.id,
      memberId: memberId ?? this.memberId,
      memberName: memberName ?? this.memberName,
      memberPhoto: memberPhoto ?? this.memberPhoto,
      gymId: gymId ?? this.gymId,
      date: date ?? this.date,
      checkInTime: checkInTime ?? this.checkInTime,
      checkOutTime: checkOutTime ?? this.checkOutTime,
      status: status ?? this.status,
      attendanceType: attendanceType ?? this.attendanceType,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      geofenceEntry: geofenceEntry ?? this.geofenceEntry,
      geofenceExit: geofenceExit ?? this.geofenceExit,
      durationInMinutes: durationInMinutes ?? this.durationInMinutes,
      isMockLocation: isMockLocation ?? this.isMockLocation,
    );
  }
}

/// Attendance Summary Model
class AttendanceSummary {
  final int totalMembers;
  final int presentCount;
  final int absentCount;
  final int lateCount;
  final int onLeaveCount;
  final double attendanceRate;
  final DateTime date;

  AttendanceSummary({
    required this.totalMembers,
    required this.presentCount,
    required this.absentCount,
    required this.lateCount,
    required this.onLeaveCount,
    required this.attendanceRate,
    required this.date,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) {
    return AttendanceSummary(
      totalMembers: json['totalMembers'] ?? 0,
      presentCount: json['presentCount'] ?? 0,
      absentCount: json['absentCount'] ?? 0,
      lateCount: json['lateCount'] ?? 0,
      onLeaveCount: json['onLeaveCount'] ?? 0,
      attendanceRate: (json['attendanceRate'] ?? 0.0).toDouble(),
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
    );
  }
}

/// Rush Hour Data Model
class RushHourData {
  final int hour;
  final String formattedHour;
  final int totalVisits;
  final double averageVisits;
  final int percentage;
  final String rushLevel; // 'low', 'medium', 'high', 'peak'
  final int barHeight;

  RushHourData({
    required this.hour,
    required this.formattedHour,
    required this.totalVisits,
    required this.averageVisits,
    required this.percentage,
    required this.rushLevel,
    required this.barHeight,
  });

  factory RushHourData.fromJson(int hour, Map<String, dynamic> json) {
    return RushHourData(
      hour: hour,
      formattedHour: json['formattedHour'] ?? '',
      totalVisits: json['totalVisits'] ?? 0,
      averageVisits: (json['averageVisits'] ?? 0.0).toDouble(),
      percentage: json['percentage'] ?? 0,
      rushLevel: json['rushLevel'] ?? 'low',
      barHeight: json['barHeight'] ?? 0,
    );
  }
}
