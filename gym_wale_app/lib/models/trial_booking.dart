class TrialBooking {
  final String id;
  final String gymId;
  final String gymName;
  final String? gymLogo;
  final DateTime trialDate;
  final String? startTime;
  final String? endTime;
  final String status;
  final String? address;
  final String? city;
  final String? state;
  final DateTime createdAt;

  TrialBooking({
    required this.id,
    required this.gymId,
    required this.gymName,
    this.gymLogo,
    required this.trialDate,
    this.startTime,
    this.endTime,
    required this.status,
    this.address,
    this.city,
    this.state,
    required this.createdAt,
  });

  factory TrialBooking.fromJson(Map<String, dynamic> json) {
    return TrialBooking(
      id: json['id'] ?? json['_id'] ?? '',
      gymId: json['gymId'] ?? '',
      gymName: json['gymName'] ?? 'Unknown Gym',
      gymLogo: json['gymLogo'],
      trialDate: DateTime.parse(json['trialDate'] ?? DateTime.now().toIso8601String()),
      startTime: json['startTime'],
      endTime: json['endTime'],
      status: json['status'] ?? 'pending',
      address: json['address'],
      city: json['city'],
      state: json['state'],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isConfirmed => status.toLowerCase() == 'confirmed';
  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isCancelled => status.toLowerCase() == 'cancelled';
  bool get isUpcoming => isConfirmed && trialDate.isAfter(DateTime.now());
}
