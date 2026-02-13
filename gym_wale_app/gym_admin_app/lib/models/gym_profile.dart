/// Gym Profile Model - Matches backend gym schema
class GymProfile {
  final String id;
  final String gymName;
  final String email;
  final String phone;
  final String? contactPerson;
  final String? supportEmail;
  final String? supportPhone;
  final String? logoUrl;
  final String? description;
  final GymLocation? location;
  final OperatingHours? operatingHours;
  final String? openingTime; // Legacy
  final String? closingTime; // Legacy
  final int? membersCount;
  final List<String>? amenities;
  final List<String>? services;
  final bool isActive;
  final String? subscriptionPlan;
  final DateTime? subscriptionExpiresAt;

  GymProfile({
    required this.id,
    required this.gymName,
    required this.email,
    required this.phone,
    this.contactPerson,
    this.supportEmail,
    this.supportPhone,
    this.logoUrl,
    this.description,
    this.location,
    this.operatingHours,
    this.openingTime,
    this.closingTime,
    this.membersCount,
    this.amenities,
    this.services,
    this.isActive = true,
    this.subscriptionPlan,
    this.subscriptionExpiresAt,
  });

  factory GymProfile.fromJson(Map<String, dynamic> json) {
    return GymProfile(
      id: json['_id'] ?? json['id'] ?? '',
      gymName: json['gymName'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      contactPerson: json['contactPerson'],
      supportEmail: json['supportEmail'],
      supportPhone: json['supportPhone'],
      logoUrl: json['logoUrl'],
      description: json['description'],
      location: json['location'] != null 
          ? GymLocation.fromJson(json['location']) 
          : null,
      operatingHours: json['operatingHours'] != null
          ? OperatingHours.fromJson(json['operatingHours'])
          : null,
      openingTime: json['openingTime'],
      closingTime: json['closingTime'],
      membersCount: json['membersCount'],
      amenities: json['amenities'] != null 
          ? List<String>.from(json['amenities']) 
          : null,
      services: json['services'] != null 
          ? List<String>.from(json['services']) 
          : null,
      isActive: json['isActive'] ?? true,
      subscriptionPlan: json['subscriptionPlan'],
      subscriptionExpiresAt: json['subscriptionExpiresAt'] != null
          ? DateTime.parse(json['subscriptionExpiresAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'gymName': gymName,
      'email': email,
      'phone': phone,
      'contactPerson': contactPerson,
      'supportEmail': supportEmail,
      'supportPhone': supportPhone,
      'logoUrl': logoUrl,
      'description': description,
      'location': location?.toJson(),
      'operatingHours': operatingHours?.toJson(),
      'openingTime': openingTime,
      'closingTime': closingTime,
      'membersCount': membersCount,
      'amenities': amenities,
      'services': services,
      'isActive': isActive,
      'subscriptionPlan': subscriptionPlan,
      'subscriptionExpiresAt': subscriptionExpiresAt?.toIso8601String(),
    };
  }

  GymProfile copyWith({
    String? id,
    String? gymName,
    String? email,
    String? phone,
    String? contactPerson,
    String? supportEmail,
    String? supportPhone,
    String? logoUrl,
    String? description,
    GymLocation? location,
    String? openingTime,
    String? closingTime,
    int? membersCount,
    List<String>? amenities,
    List<String>? services,
    bool? isActive,
    String? subscriptionPlan,
    DateTime? subscriptionExpiresAt,
  }) {
    return GymProfile(
      id: id ?? this.id,
      gymName: gymName ?? this.gymName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      contactPerson: contactPerson ?? this.contactPerson,
      supportEmail: supportEmail ?? this.supportEmail,
      supportPhone: supportPhone ?? this.supportPhone,
      logoUrl: logoUrl ?? this.logoUrl,
      description: description ?? this.description,
      location: location ?? this.location,
      openingTime: openingTime ?? this.openingTime,
      closingTime: closingTime ?? this.closingTime,
      membersCount: membersCount ?? this.membersCount,
      amenities: amenities ?? this.amenities,
      services: services ?? this.services,
      isActive: isActive ?? this.isActive,
      subscriptionPlan: subscriptionPlan ?? this.subscriptionPlan,
      subscriptionExpiresAt: subscriptionExpiresAt ?? this.subscriptionExpiresAt,
    );
  }
}

class GymLocation {
  final String? address;
  final String? city;
  final String? state;
  final String? pincode;
  final String? landmark;
  final double? latitude;
  final double? longitude;

  GymLocation({
    this.address,
    this.city,
    this.state,
    this.pincode,
    this.landmark,
    this.latitude,
    this.longitude,
  });

  factory GymLocation.fromJson(Map<String, dynamic> json) {
    return GymLocation(
      address: json['address'],
      city: json['city'],
      state: json['state'],
      pincode: json['pincode'],
      landmark: json['landmark'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'address': address,
      'city': city,
      'state': state,
      'pincode': pincode,
      'landmark': landmark,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class OperatingHours {
  final TimeSlot? morning;
  final TimeSlot? evening;

  OperatingHours({
    this.morning,
    this.evening,
  });

  factory OperatingHours.fromJson(Map<String, dynamic> json) {
    return OperatingHours(
      morning: json['morning'] != null ? TimeSlot.fromJson(json['morning']) : null,
      evening: json['evening'] != null ? TimeSlot.fromJson(json['evening']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (morning != null) 'morning': morning!.toJson(),
      if (evening != null) 'evening': evening!.toJson(),
    };
  }
}

class TimeSlot {
  final String? opening;
  final String? closing;

  TimeSlot({
    this.opening,
    this.closing,
  });

  factory TimeSlot.fromJson(Map<String, dynamic> json) {
    return TimeSlot(
      opening: json['opening'],
      closing: json['closing'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (opening != null) 'opening': opening,
      if (closing != null) 'closing': closing,
    };
  }
}
