/// Admin Model
class Admin {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? profilePicture;
  final String role;
  final List<String> permissions;
  final String status;
  final bool twoFactorEnabled;
  final DateTime? lastLogin;
  final String? lastLoginIP;
  final DateTime? createdAt;
  final DateTime? passwordChangedAt;
  final int loginCount;

  Admin({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.profilePicture,
    required this.role,
    required this.permissions,
    required this.status,
    required this.twoFactorEnabled,
    this.lastLogin,
    this.lastLoginIP,
    this.createdAt,
    this.passwordChangedAt,
    this.loginCount = 0,
  });

  factory Admin.fromJson(Map<String, dynamic> json) {
    return Admin(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      profilePicture: json['profilePicture'],
      role: json['role'] ?? 'admin',
      permissions: json['permissions'] != null
          ? List<String>.from(json['permissions'])
          : [],
      status: json['status'] ?? 'active',
      twoFactorEnabled: json['twoFactorEnabled'] ?? false,
      lastLogin: json['lastLogin'] != null
          ? DateTime.parse(json['lastLogin'])
          : null,
      lastLoginIP: json['lastLoginIP'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
      passwordChangedAt: json['passwordChangedAt'] != null
          ? DateTime.parse(json['passwordChangedAt'])
          : null,
      loginCount: json['loginCount'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'profilePicture': profilePicture,
      'role': role,
      'permissions': permissions,
      'status': status,
      'twoFactorEnabled': twoFactorEnabled,
      'lastLogin': lastLogin?.toIso8601String(),
      'lastLoginIP': lastLoginIP,
      'createdAt': createdAt?.toIso8601String(),
      'passwordChangedAt': passwordChangedAt?.toIso8601String(),
      'loginCount': loginCount,
    };
  }

  Admin copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? profilePicture,
    String? role,
    List<String>? permissions,
    String? status,
    bool? twoFactorEnabled,
    DateTime? lastLogin,
    String? lastLoginIP,
    DateTime? createdAt,
    DateTime? passwordChangedAt,
    int? loginCount,
  }) {
    return Admin(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      profilePicture: profilePicture ?? this.profilePicture,
      role: role ?? this.role,
      permissions: permissions ?? this.permissions,
      status: status ?? this.status,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
      lastLogin: lastLogin ?? this.lastLogin,
      lastLoginIP: lastLoginIP ?? this.lastLoginIP,
      createdAt: createdAt ?? this.createdAt,
      passwordChangedAt: passwordChangedAt ?? this.passwordChangedAt,
      loginCount: loginCount ?? this.loginCount,
    );
  }
}
