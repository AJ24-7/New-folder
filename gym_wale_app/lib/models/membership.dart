class Membership {
  final String id;
  final String gymId;
  final String name;
  final String description;
  final double price;
  final int duration; // in days
  final String durationType; // 'month', 'quarter', 'year'
  final List<String> features;
  final bool isPopular;
  final DateTime createdAt;

  Membership({
    required this.id,
    required this.gymId,
    required this.name,
    required this.description,
    required this.price,
    required this.duration,
    required this.durationType,
    this.features = const [],
    this.isPopular = false,
    required this.createdAt,
  });

  factory Membership.fromJson(Map<String, dynamic> json) {
    return Membership(
      id: json['_id'] ?? json['id'] ?? '',
      gymId: json['gymId'] ?? json['gym'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      duration: json['duration'] ?? 0,
      durationType: json['durationType'] ?? 'month',
      features: json['features'] != null ? List<String>.from(json['features']) : [],
      isPopular: json['isPopular'] ?? false,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'gymId': gymId,
      'name': name,
      'description': description,
      'price': price,
      'duration': duration,
      'durationType': durationType,
      'features': features,
      'isPopular': isPopular,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  String get durationLabel {
    switch (durationType) {
      case 'month':
        return '${duration ~/ 30} Month${duration > 30 ? 's' : ''}';
      case 'quarter':
        return '3 Months';
      case 'year':
        return '1 Year';
      default:
        return '$duration Days';
    }
  }
}
