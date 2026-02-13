import 'attendance_record.dart';

/// Attendance Statistics Model
class AttendanceStats {
  final int totalMembers;
  final int presentToday;
  final int absentToday;
  final double attendanceRateToday;
  
  // Monthly stats
  final int month;
  final int year;
  final int totalWorkingDays;
  final int averagePresent;
  final double monthlyAttendanceRate;
  
  // Status breakdown
  final Map<String, int> statusBreakdown;
  
  // Attendance by type
  final Map<String, int> attendanceByType;
  
  // Daily attendance data (for charts)
  final List<DailyAttendanceData>? dailyData;
  
  // Peak hours
  final List<RushHourStat>? peakHours;

  AttendanceStats({
    required this.totalMembers,
    required this.presentToday,
    required this.absentToday,
    required this.attendanceRateToday,
    required this.month,
    required this.year,
    required this.totalWorkingDays,
    required this.averagePresent,
    required this.monthlyAttendanceRate,
    required this.statusBreakdown,
    required this.attendanceByType,
    this.dailyData,
    this.peakHours,
  });

  factory AttendanceStats.fromJson(Map<String, dynamic> json) {
    return AttendanceStats(
      totalMembers: json['totalMembers'] ?? 0,
      presentToday: json['presentToday'] ?? 0,
      absentToday: json['absentToday'] ?? 0,
      attendanceRateToday: (json['attendanceRateToday'] ?? 0.0).toDouble(),
      month: json['month'] ?? DateTime.now().month,
      year: json['year'] ?? DateTime.now().year,
      totalWorkingDays: json['totalWorkingDays'] ?? 0,
      averagePresent: json['averagePresent'] ?? 0,
      monthlyAttendanceRate: (json['monthlyAttendanceRate'] ?? 0.0).toDouble(),
      statusBreakdown: json['statusBreakdown'] != null
          ? Map<String, int>.from(json['statusBreakdown'])
          : {},
      attendanceByType: json['attendanceByType'] != null
          ? Map<String, int>.from(json['attendanceByType'])
          : {},
      dailyData: json['dailyData'] != null
          ? (json['dailyData'] as List)
              .map((e) => DailyAttendanceData.fromJson(e))
              .toList()
          : null,
      peakHours: json['peakHours'] != null
          ? (json['peakHours'] as List)
              .map((e) => RushHourStat.fromJson(e))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalMembers': totalMembers,
      'presentToday': presentToday,
      'absentToday': absentToday,
      'attendanceRateToday': attendanceRateToday,
      'month': month,
      'year': year,
      'totalWorkingDays': totalWorkingDays,
      'averagePresent': averagePresent,
      'monthlyAttendanceRate': monthlyAttendanceRate,
      'statusBreakdown': statusBreakdown,
      'attendanceByType': attendanceByType,
      'dailyData': dailyData?.map((e) => e.toJson()).toList(),
      'peakHours': peakHours?.map((e) => e.toJson()).toList(),
    };
  }
}

/// Daily Attendance Data for Charts
class DailyAttendanceData {
  final DateTime date;
  final int present;
  final int absent;
  final int late;
  final int total;
  final double rate;

  DailyAttendanceData({
    required this.date,
    required this.present,
    required this.absent,
    required this.late,
    required this.total,
    required this.rate,
  });

  factory DailyAttendanceData.fromJson(Map<String, dynamic> json) {
    return DailyAttendanceData(
      date: DateTime.parse(json['date']),
      present: json['present'] ?? 0,
      absent: json['absent'] ?? 0,
      late: json['late'] ?? 0,
      total: json['total'] ?? 0,
      rate: (json['rate'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'date': date.toIso8601String(),
      'present': present,
      'absent': absent,
      'late': late,
      'total': total,
      'rate': rate,
    };
  }
}

/// Rush Hour Statistics
class RushHourStat {
  final String hour;
  final int count;
  final String label;
  final String level; // 'low', 'medium', 'high', 'peak'

  RushHourStat({
    required this.hour,
    required this.count,
    required this.label,
    required this.level,
  });

  factory RushHourStat.fromJson(Map<String, dynamic> json) {
    return RushHourStat(
      hour: json['hour'] ?? '',
      count: json['count'] ?? 0,
      label: json['label'] ?? '',
      level: json['level'] ?? 'low',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'hour': hour,
      'count': count,
      'label': label,
      'level': level,
    };
  }
}

/// Member Attendance History
class MemberAttendanceHistory {
  final String memberId;
  final String memberName;
  final String? memberPhoto;
  final int totalDays;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final double attendanceRate;
  final List<AttendanceRecord> records;

  MemberAttendanceHistory({
    required this.memberId,
    required this.memberName,
    this.memberPhoto,
    required this.totalDays,
    required this.presentDays,
    required this.absentDays,
    required this.lateDays,
    required this.attendanceRate,
    required this.records,
  });

  factory MemberAttendanceHistory.fromJson(Map<String, dynamic> json) {
    return MemberAttendanceHistory(
      memberId: json['memberId'] ?? '',
      memberName: json['memberName'] ?? '',
      memberPhoto: json['memberPhoto'],
      totalDays: json['totalDays'] ?? 0,
      presentDays: json['presentDays'] ?? 0,
      absentDays: json['absentDays'] ?? 0,
      lateDays: json['lateDays'] ?? 0,
      attendanceRate: (json['attendanceRate'] ?? 0.0).toDouble(),
      records: json['records'] != null
          ? (json['records'] as List)
              .map((e) => AttendanceRecord.fromJson(e))
              .toList()
          : [],
    );
  }
}
