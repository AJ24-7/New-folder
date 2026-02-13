class Trainer {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String specialty;
  final int experience;
  final String bio;
  final String? photo;
  final String trainerType; // 'gym' or 'independent'
  final double rating;
  final int totalReviews;
  final String status;
  final List<String> certifications;
  final List<String> locations;
  final double? hourlyRate;
  final double? monthlyRate;
  final GymInfo? gym;

  Trainer({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.specialty,
    required this.experience,
    required this.bio,
    this.photo,
    required this.trainerType,
    this.rating = 0.0,
    this.totalReviews = 0,
    required this.status,
    this.certifications = const [],
    this.locations = const [],
    this.hourlyRate,
    this.monthlyRate,
    this.gym,
  });

  String get fullName => '$firstName $lastName'.trim();
  
  String get experienceText => '$experience ${experience == 1 ? 'year' : 'years'} exp';

  factory Trainer.fromJson(Map<String, dynamic> json) {
    GymInfo? extractGymInfo() {
      if (json['gym'] != null && json['gym'] is Map) {
        return GymInfo.fromJson(json['gym'] as Map<String, dynamic>);
      }
      return null;
    }

    return Trainer(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      firstName: (json['firstName'] ?? '').toString(),
      lastName: (json['lastName'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      specialty: (json['specialty'] ?? '').toString(),
      experience: (json['experience'] ?? 0) is int 
          ? json['experience'] 
          : int.tryParse(json['experience'].toString()) ?? 0,
      bio: (json['bio'] ?? '').toString(),
      photo: json['photo']?.toString() ?? json['image']?.toString(),
      trainerType: (json['trainerType'] ?? 'gym').toString(),
      rating: (json['rating'] ?? 0.0) is double
          ? json['rating']
          : double.tryParse(json['rating'].toString()) ?? 0.0,
      totalReviews: (json['totalReviews'] ?? 0) is int
          ? json['totalReviews']
          : int.tryParse(json['totalReviews'].toString()) ?? 0,
      status: (json['status'] ?? 'pending').toString(),
      certifications: json['certifications'] != null
          ? List<String>.from(json['certifications'])
          : [],
      locations: json['locations'] != null
          ? List<String>.from(json['locations'])
          : [],
      hourlyRate: json['hourlyRate'] != null
          ? double.tryParse(json['hourlyRate'].toString())
          : null,
      monthlyRate: json['monthlyRate'] != null
          ? double.tryParse(json['monthlyRate'].toString())
          : null,
      gym: extractGymInfo(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'phone': phone,
      'specialty': specialty,
      'experience': experience,
      'bio': bio,
      'photo': photo,
      'trainerType': trainerType,
      'rating': rating,
      'totalReviews': totalReviews,
      'status': status,
      'certifications': certifications,
      'locations': locations,
      'hourlyRate': hourlyRate,
      'monthlyRate': monthlyRate,
      'gym': gym?.toJson(),
    };
  }
}

class GymInfo {
  final String id;
  final String gymName;
  final String? logoUrl;
  final String? address;
  final String? city;

  GymInfo({
    required this.id,
    required this.gymName,
    this.logoUrl,
    this.address,
    this.city,
  });

  factory GymInfo.fromJson(Map<String, dynamic> json) {
    return GymInfo(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      gymName: (json['gymName'] ?? json['name'] ?? 'Gym').toString(),
      logoUrl: json['logoUrl']?.toString(),
      address: json['address']?.toString(),
      city: json['city']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'gymName': gymName,
      'logoUrl': logoUrl,
      'address': address,
      'city': city,
    };
  }
}
