class Booking {
  final String id;
  final String userId;
  final String gymId;
  final String membershipId;
  final String gymName;
  final String membershipName;
  final DateTime startDate;
  final DateTime endDate;
  final double amount;
  final String status; // 'pending', 'confirmed', 'cancelled', 'expired'
  final String? paymentId;
  final bool isPaid;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Booking({
    required this.id,
    required this.userId,
    required this.gymId,
    required this.membershipId,
    required this.gymName,
    required this.membershipName,
    required this.startDate,
    required this.endDate,
    required this.amount,
    required this.status,
    this.paymentId,
    this.isPaid = false,
    required this.createdAt,
    this.updatedAt,
  });

  factory Booking.fromJson(Map<String, dynamic>? json) {
    // Return default booking if json is null
    if (json == null) {
      return Booking(
        id: '',
        userId: '',
        gymId: '',
        membershipId: '',
        gymName: 'Unknown',
        membershipName: 'Unknown',
        startDate: DateTime.now(),
        endDate: DateTime.now(),
        amount: 0.0,
        status: 'unknown',
        createdAt: DateTime.now(),
      );
    }
    
    // Safe parsers
    double safeParseDouble(dynamic value, [double defaultValue = 0.0]) {
      if (value == null) return defaultValue;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? defaultValue;
      return defaultValue;
    }
    
    DateTime safeParseDatetime(dynamic value, [DateTime? defaultValue]) {
      if (value == null) return defaultValue ?? DateTime.now();
      if (value is DateTime) return value;
      if (value is String) {
        try {
          return DateTime.parse(value);
        } catch (e) {
          return defaultValue ?? DateTime.now();
        }
      }
      return defaultValue ?? DateTime.now();
    }
    
    bool safeParseBool(dynamic value, [bool defaultValue = false]) {
      if (value == null) return defaultValue;
      if (value is bool) return value;
      if (value is String) return value.toLowerCase() == 'true';
      if (value is int) return value != 0;
      return defaultValue;
    }
    
    return Booking(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      userId: (json['userId'] ?? json['user'] ?? '').toString(),
      gymId: (json['gymId'] ?? json['gym']?['_id'] ?? json['gym'] ?? '').toString(),
      membershipId: (json['membershipId'] ?? json['membership']?['_id'] ?? json['membership'] ?? '').toString(),
      gymName: (json['gymName'] ?? json['gym']?['name'] ?? '').toString(),
      membershipName: (json['membershipName'] ?? json['membership']?['name'] ?? '').toString(),
      startDate: safeParseDatetime(json['startDate']),
      endDate: safeParseDatetime(json['endDate']),
      amount: safeParseDouble(json['amount']),
      status: (json['status'] ?? 'pending').toString(),
      paymentId: json['paymentId']?.toString(),
      isPaid: safeParseBool(json['isPaid']),
      createdAt: safeParseDatetime(json['createdAt']),
      updatedAt: json['updatedAt'] != null ? safeParseDatetime(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'gymId': gymId,
      'membershipId': membershipId,
      'gymName': gymName,
      'membershipName': membershipName,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'amount': amount,
      'status': status,
      'paymentId': paymentId,
      'isPaid': isPaid,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  bool get isActive {
    return status == 'confirmed' && 
           DateTime.now().isBefore(endDate) && 
           DateTime.now().isAfter(startDate);
  }

  bool get isExpired {
    return DateTime.now().isAfter(endDate) || status == 'expired';
  }

  bool get isCancelled {
    return status == 'cancelled';
  }

  int get daysRemaining {
    if (isExpired || isCancelled) return 0;
    return endDate.difference(DateTime.now()).inDays;
  }
}
