class User {
  final String id;
  final String email;
  final String name;
  final String? phone;
  final String? profileImage;
  final String? address;
  final DateTime createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone,
    this.profileImage,
    this.address,
    required this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic>? json) {
    // Return default user if json is null
    if (json == null) {
      return User(
        id: '',
        email: '',
        name: 'Unknown User',
        createdAt: DateTime.now(),
      );
    }
    
    // Helper to safely parse DateTime
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
    
    // Build name from various field combinations
    String buildName() {
      if (json['name'] != null && json['name'].toString().isNotEmpty) {
        return json['name'].toString();
      }
      final firstName = json['firstName']?.toString() ?? '';
      final lastName = json['lastName']?.toString() ?? '';
      final username = json['username']?.toString() ?? '';
      
      if (firstName.isNotEmpty || lastName.isNotEmpty) {
        return [firstName, lastName].where((s) => s.isNotEmpty).join(' ');
      }
      return username.isNotEmpty ? username : json['email']?.toString() ?? '';
    }
    
    return User(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      name: buildName(),
      phone: json['phone']?.toString(),
      profileImage: json['profileImage']?.toString(),
      address: json['address']?.toString(),
      createdAt: safeParseDatetime(json['createdAt']),
      updatedAt: json['updatedAt'] != null ? safeParseDatetime(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'phone': phone,
      'profileImage': profileImage,
      'address': address,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? phone,
    String? profileImage,
    String? address,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      profileImage: profileImage ?? this.profileImage,
      address: address ?? this.address,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
