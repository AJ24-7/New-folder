class UserProfile {
  final String? profilePicture;
  final String? fullName;
  final String? email;
  final String? phone;

  UserProfile({
    this.profilePicture,
    this.fullName,
    this.email,
    this.phone,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      profilePicture: json['profilePicture'],
      fullName: json['fullName'],
      email: json['email'],
      phone: json['phone'],
    );
  }
}

class TrialBooking {
  final String id;
  final String customerName;
  final String email;
  final String phone;
  final DateTime preferredDate;
  final String preferredTime;
  final String? fitnessGoal;
  final String status;
  final DateTime createdAt;
  final String? message;
  final DateTime? bookingDate;
  final UserProfile? userProfile;

  TrialBooking({
    required this.id,
    required this.customerName,
    required this.email,
    required this.phone,
    required this.preferredDate,
    required this.preferredTime,
    this.fitnessGoal,
    required this.status,
    required this.createdAt,
    this.message,
    this.bookingDate,
    this.userProfile,
  });

  factory TrialBooking.fromJson(Map<String, dynamic> json) {
    return TrialBooking(
      id: json['_id'] ?? json['id'] ?? '',
      customerName: json['customerName'] ?? 'Unknown',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      preferredDate: json['preferredDate'] != null 
        ? DateTime.parse(json['preferredDate'])
        : DateTime.now(),
      preferredTime: json['preferredTime'] ?? '',
      fitnessGoal: json['fitnessGoal'],
      status: json['status'] ?? 'pending',
      createdAt: json['createdAt'] != null
        ? DateTime.parse(json['createdAt'])
        : DateTime.now(),
      message: json['message'],
      bookingDate: json['bookingDate'] != null
        ? DateTime.parse(json['bookingDate'])
        : null,
      userProfile: json['userProfile'] != null
        ? UserProfile.fromJson(json['userProfile'])
        : null,
    );
  }

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isConfirmed => status.toLowerCase() == 'confirmed';
  bool get isContacted => status.toLowerCase() == 'contacted';
  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isCancelled => status.toLowerCase() == 'cancelled';
  bool get isNoShow => status.toLowerCase() == 'no-show';
  
  bool get isUpcoming => 
    (isPending || isConfirmed) && 
    preferredDate.isAfter(DateTime.now().subtract(const Duration(days: 1)));

  String get displayName => userProfile?.fullName ?? customerName;
  String get displayEmail => userProfile?.email ?? email;
  String get displayPhone => userProfile?.phone ?? phone;
  String? get profilePicture => userProfile?.profilePicture;
}
