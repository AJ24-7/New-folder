class Member {
  final String id;
  final String gym;
  final String memberName;
  final int age;
  final String gender;
  final String phone;
  final String email;
  final String paymentMode;
  final double paymentAmount;
  final String planSelected;
  final String monthlyPlan;
  final String activityPreference;
  final String? address;
  final DateTime joinDate;
  final String? profileImage;
  final String? membershipId;
  final DateTime? membershipValidUntil;
  final String paymentStatus;
  final double pendingPaymentAmount;
  final DateTime? lastPaymentDate;
  final DateTime? nextPaymentDue;
  final DateTime? allowanceGrantedDate;
  final DateTime? allowanceExpiryDate;
  final DateTime? planStartDate;
  final DateTime? plannedValidityDate;
  final List<FreezeHistory> freezeHistory;
  final bool currentlyFrozen;
  final DateTime? freezeStartDate;
  final DateTime? freezeEndDate;
  final int totalFreezeCount;
  final String? passId;
  final DateTime? passGeneratedDate;
  final String? passQRCode;
  final String? passFilePath;
  final bool expiryNotified7Days;
  final bool expiryNotified3Days;
  final bool expiryNotified1Day;
  final double? amount;
  final String? membershipPlan;
  final String? validity;
  final DateTime? validUntil;
  final List<String> benefits;

  Member({
    required this.id,
    required this.gym,
    required this.memberName,
    required this.age,
    required this.gender,
    required this.phone,
    required this.email,
    required this.paymentMode,
    required this.paymentAmount,
    required this.planSelected,
    required this.monthlyPlan,
    required this.activityPreference,
    this.address,
    required this.joinDate,
    this.profileImage,
    this.membershipId,
    this.membershipValidUntil,
    this.paymentStatus = 'paid',
    this.pendingPaymentAmount = 0,
    this.lastPaymentDate,
    this.nextPaymentDue,
    this.allowanceGrantedDate,
    this.allowanceExpiryDate,
    this.planStartDate,
    this.plannedValidityDate,
    this.freezeHistory = const [],
    this.currentlyFrozen = false,
    this.freezeStartDate,
    this.freezeEndDate,
    this.totalFreezeCount = 0,
    this.passId,
    this.passGeneratedDate,
    this.passQRCode,
    this.passFilePath,
    this.expiryNotified7Days = false,
    this.expiryNotified3Days = false,
    this.expiryNotified1Day = false,
    this.amount,
    this.membershipPlan,
    this.validity,
    this.validUntil,
    this.benefits = const [],
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['_id'] ?? '',
      gym: json['gym'] ?? '',
      memberName: json['memberName'] ?? '',
      age: json['age'] is int ? json['age'] : int.tryParse(json['age']?.toString() ?? '0') ?? 0,
      gender: json['gender'] ?? 'Other',
      phone: json['phone']?.toString() ?? '',
      email: json['email'] ?? '',
      paymentMode: json['paymentMode'] ?? 'Cash',
      paymentAmount: (json['paymentAmount'] is num ? json['paymentAmount'] : double.tryParse(json['paymentAmount']?.toString() ?? '0') ?? 0).toDouble(),
      planSelected: json['planSelected'] ?? 'Basic',
      monthlyPlan: json['monthlyPlan'] ?? '1 Month',
      activityPreference: json['activityPreference'] ?? '',
      address: json['address'],
      joinDate: _parseDate(json['joinDate']) ?? DateTime.now(),
      profileImage: json['profileImage'],
      membershipId: json['membershipId'],
      membershipValidUntil: _parseDate(json['membershipValidUntil']),
      paymentStatus: json['paymentStatus'] ?? 'paid',
      pendingPaymentAmount: (json['pendingPaymentAmount'] is num ? json['pendingPaymentAmount'] : double.tryParse(json['pendingPaymentAmount']?.toString() ?? '0') ?? 0).toDouble(),
      lastPaymentDate: _parseDate(json['lastPaymentDate']),
      nextPaymentDue: _parseDate(json['nextPaymentDue']),
      allowanceGrantedDate: _parseDate(json['allowanceGrantedDate']),
      allowanceExpiryDate: _parseDate(json['allowanceExpiryDate']),
      planStartDate: _parseDate(json['planStartDate']),
      plannedValidityDate: _parseDate(json['plannedValidityDate']),
      freezeHistory: (json['freezeHistory'] as List<dynamic>?)
              ?.map((e) => FreezeHistory.fromJson(e))
              .toList() ??
          [],
      currentlyFrozen: json['currentlyFrozen'] ?? false,
      freezeStartDate: _parseDate(json['freezeStartDate']),
      freezeEndDate: _parseDate(json['freezeEndDate']),
      totalFreezeCount: json['totalFreezeCount'] is int ? json['totalFreezeCount'] : int.tryParse(json['totalFreezeCount']?.toString() ?? '0') ?? 0,
      passId: json['passId'],
      passGeneratedDate: _parseDate(json['passGeneratedDate']),
      passQRCode: json['passQRCode'],
      passFilePath: json['passFilePath'],
      expiryNotified7Days: json['expiryNotified7Days'] ?? false,
      expiryNotified3Days: json['expiryNotified3Days'] ?? false,
      expiryNotified1Day: json['expiryNotified1Day'] ?? false,
      amount: json['amount']?.toDouble(),
      membershipPlan: json['membershipPlan'],
      validity: json['validity'],
      validUntil: _parseDate(json['validUntil']),
      benefits: (json['benefits'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  static DateTime? _parseDate(dynamic date) {
    if (date == null) return null;
    try {
      if (date is String) {
        // Try parsing different date formats
        // ISO 8601: 2026-03-07T00:00:00.000Z
        if (date.contains('T') || date.contains('Z')) {
          return DateTime.parse(date);
        }
        // Simple date string: 2026-03-07
        final parts = date.split('-');
        if (parts.length == 3) {
          final year = int.tryParse(parts[0]);
          final month = int.tryParse(parts[1]);
          final day = int.tryParse(parts[2]);
          if (year != null && month != null && day != null) {
            return DateTime(year, month, day);
          }
        }
        // Fallback to DateTime.parse
        return DateTime.parse(date);
      } else if (date is DateTime) {
        return date;
      }
      return null;
    } catch (e) {
      print('Error parsing date: $date - $e');
      return null;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'gym': gym,
      'memberName': memberName,
      'age': age,
      'gender': gender,
      'phone': phone,
      'email': email,
      'paymentMode': paymentMode,
      'paymentAmount': paymentAmount,
      'planSelected': planSelected,
      'monthlyPlan': monthlyPlan,
      'activityPreference': activityPreference,
      if (address != null) 'address': address,
      'joinDate': joinDate.toIso8601String(),
      if (profileImage != null) 'profileImage': profileImage,
      if (membershipId != null) 'membershipId': membershipId,
      if (membershipValidUntil != null) 'membershipValidUntil': membershipValidUntil!.toIso8601String(),
      'paymentStatus': paymentStatus,
      'pendingPaymentAmount': pendingPaymentAmount,
      if (lastPaymentDate != null) 'lastPaymentDate': lastPaymentDate!.toIso8601String(),
      if (nextPaymentDue != null) 'nextPaymentDue': nextPaymentDue!.toIso8601String(),
      if (allowanceGrantedDate != null) 'allowanceGrantedDate': allowanceGrantedDate!.toIso8601String(),
      if (allowanceExpiryDate != null) 'allowanceExpiryDate': allowanceExpiryDate!.toIso8601String(),
      if (planStartDate != null) 'planStartDate': planStartDate!.toIso8601String(),
      if (plannedValidityDate != null) 'plannedValidityDate': plannedValidityDate!.toIso8601String(),
      'freezeHistory': freezeHistory.map((e) => e.toJson()).toList(),
      'currentlyFrozen': currentlyFrozen,
      if (freezeStartDate != null) 'freezeStartDate': freezeStartDate!.toIso8601String(),
      if (freezeEndDate != null) 'freezeEndDate': freezeEndDate!.toIso8601String(),
      'totalFreezeCount': totalFreezeCount,
      if (passId != null) 'passId': passId,
      if (passGeneratedDate != null) 'passGeneratedDate': passGeneratedDate!.toIso8601String(),
      if (passQRCode != null) 'passQRCode': passQRCode,
      if (passFilePath != null) 'passFilePath': passFilePath,
      'expiryNotified7Days': expiryNotified7Days,
      'expiryNotified3Days': expiryNotified3Days,
      'expiryNotified1Day': expiryNotified1Day,
      if (amount != null) 'amount': amount,
      if (membershipPlan != null) 'membershipPlan': membershipPlan,
      if (validity != null) 'validity': validity,
      if (validUntil != null) 'validUntil': validUntil!.toIso8601String(),
      'benefits': benefits,
    };
  }

  bool get isExpired {
    if (membershipValidUntil == null) return false;
    return membershipValidUntil!.isBefore(DateTime.now());
  }

  bool get isExpiringSoon {
    if (membershipValidUntil == null) return false;
    final daysUntilExpiry = membershipValidUntil!.difference(DateTime.now()).inDays;
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  }

  int get daysUntilExpiry {
    if (membershipValidUntil == null) return -1;
    return membershipValidUntil!.difference(DateTime.now()).inDays;
  }
}

class FreezeHistory {
  final DateTime freezeStartDate;
  final DateTime freezeEndDate;
  final int freezeDays;
  final String? reason;
  final DateTime requestedAt;

  FreezeHistory({
    required this.freezeStartDate,
    required this.freezeEndDate,
    required this.freezeDays,
    this.reason,
    required this.requestedAt,
  });

  factory FreezeHistory.fromJson(Map<String, dynamic> json) {
    return FreezeHistory(
      freezeStartDate: DateTime.parse(json['freezeStartDate']),
      freezeEndDate: DateTime.parse(json['freezeEndDate']),
      freezeDays: json['freezeDays'] ?? 0,
      reason: json['reason'],
      requestedAt: json['requestedAt'] != null
          ? DateTime.parse(json['requestedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'freezeStartDate': freezeStartDate.toIso8601String(),
      'freezeEndDate': freezeEndDate.toIso8601String(),
      'freezeDays': freezeDays,
      if (reason != null) 'reason': reason,
      'requestedAt': requestedAt.toIso8601String(),
    };
  }
}
