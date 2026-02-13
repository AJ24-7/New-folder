class UserMembership {
  final String membershipId;
  final String memberName;
  final String planSelected;
  final String monthlyPlan;
  final DateTime joinDate;
  final String validUntil;
  final String activityPreference;
  final String? profileImage;

  UserMembership({
    required this.membershipId,
    required this.memberName,
    required this.planSelected,
    required this.monthlyPlan,
    required this.joinDate,
    required this.validUntil,
    required this.activityPreference,
    this.profileImage,
  });

  factory UserMembership.fromJson(Map<String, dynamic> json) {
    return UserMembership(
      membershipId: json['membershipId'] ?? '',
      memberName: json['memberName'] ?? '',
      planSelected: json['planSelected'] ?? '',
      monthlyPlan: json['monthlyPlan'] ?? '',
      joinDate: DateTime.parse(json['joinDate'] ?? DateTime.now().toIso8601String()),
      validUntil: json['validUntil'] ?? '',
      activityPreference: json['activityPreference'] ?? '',
      profileImage: json['profileImage'],
    );
  }

  bool get isActive {
    try {
      final validDate = DateTime.parse(validUntil);
      return validDate.isAfter(DateTime.now());
    } catch (e) {
      return false;
    }
  }

  DateTime? get validUntilDate {
    try {
      return DateTime.parse(validUntil);
    } catch (e) {
      return null;
    }
  }

  String get formattedValidUntil {
    final date = validUntilDate;
    if (date == null) return validUntil;
    return '${date.day}/${date.month}/${date.year}';
  }

  String get planTypeIcon {
    switch (planSelected.toLowerCase()) {
      case 'basic':
        return '🥉';
      case 'standard':
        return '🥈';
      case 'premium':
        return '🥇';
      default:
        return '🎫';
    }
  }
}

class MemberProblemReport {
  final String? id;
  final String gymId;
  final String category;
  final String subject;
  final String description;
  final String priority;
  final String? status;
  final DateTime? createdAt;
  final String? reportId;
  final AdminResponse? adminResponse;

  MemberProblemReport({
    this.id,
    required this.gymId,
    required this.category,
    required this.subject,
    required this.description,
    required this.priority,
    this.status,
    this.createdAt,
    this.reportId,
    this.adminResponse,
  });

  Map<String, dynamic> toJson() {
    return {
      'gymId': gymId,
      'category': category,
      'subject': subject,
      'description': description,
      'priority': priority,
    };
  }

  factory MemberProblemReport.fromJson(Map<String, dynamic> json) {
    return MemberProblemReport(
      id: json['_id'] ?? json['id'],
      gymId: json['gymId'],
      category: json['category'] ?? '',
      subject: json['subject'] ?? '',
      description: json['description'] ?? '',
      priority: json['priority'] ?? 'normal',
      status: json['status'],
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      reportId: json['reportId'],
      adminResponse: json['adminResponse'] != null 
        ? AdminResponse.fromJson(json['adminResponse']) 
        : null,
    );
  }

  String get statusDisplay {
    switch (status) {
      case 'open':
        return 'Open';
      case 'acknowledged':
        return 'Acknowledged';
      case 'in-progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return 'Pending';
    }
  }

  String get categoryDisplay {
    switch (category) {
      case 'equipment-broken':
        return '🏋️ Equipment Broken/Damaged';
      case 'equipment-unavailable':
        return '❌ Equipment Unavailable';
      case 'cleanliness-issue':
        return '🧹 Cleanliness Issue';
      case 'ac-heating-issue':
        return '❄️ AC/Heating Issue';
      case 'staff-behavior':
        return '👥 Staff Behavior';
      case 'class-schedule':
        return '📅 Class Schedule Problem';
      case 'overcrowding':
        return '👨‍👩‍👧‍👦 Overcrowding';
      case 'safety-concern':
        return '🛡️ Safety Concern';
      case 'facility-maintenance':
        return '🔧 Facility Maintenance';
      case 'locker-issue':
        return '🔒 Locker Issue';
      case 'payment-billing':
        return '💳 Payment/Billing';
      case 'trainer-complaint':
        return '👤 Trainer Complaint';
      default:
        return '📝 Other';
    }
  }
}

class AdminResponse {
  final String message;
  final DateTime respondedAt;

  AdminResponse({
    required this.message,
    required this.respondedAt,
  });

  factory AdminResponse.fromJson(Map<String, dynamic> json) {
    return AdminResponse(
      message: json['message'] ?? '',
      respondedAt: DateTime.parse(json['respondedAt']),
    );
  }
}
