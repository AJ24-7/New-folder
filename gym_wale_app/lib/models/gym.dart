class Gym {
  final String id;
  final String name;
  final String description;
  final String address;
  final double latitude;
  final double longitude;
  final String? city;
  final String? state;
  final String? pincode;
  final String? phone;
  final String? email;
  final String? logoUrl;
  final List<String> images;
  final List<String> amenities;
  final List<String> activities;
  final String? openingTime;
  final String? closingTime;
  final double rating;
  final int reviewCount;
  final double? distance;
  final bool isFavorite;
  final DateTime createdAt;

  Gym({
    required this.id,
    required this.name,
    required this.description,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.city,
    this.state,
    this.pincode,
    this.phone,
    this.email,
    this.logoUrl,
    this.images = const [],
    this.amenities = const [],
    this.activities = const [],
    this.openingTime,
    this.closingTime,
    this.rating = 0.0,
    this.reviewCount = 0,
    this.distance,
    this.isFavorite = false,
    required this.createdAt,
  });

  factory Gym.fromJson(Map<String, dynamic>? json) {
    // Return default gym if json is null
    if (json == null) {
      return Gym(
        id: '',
        name: 'Unknown Gym',
        description: '',
        address: '',
        latitude: 0.0,
        longitude: 0.0,
        createdAt: DateTime.now(),
      );
    }
    
    // Helper to safely parse numeric values (handles both int and string)
    double safeParseDouble(dynamic value, [double defaultValue = 0.0]) {
      if (value == null) return defaultValue;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) {
        final parsed = double.tryParse(value);
        if (parsed == null) {
          print('Warning: Could not parse "$value" as double, using $defaultValue');
        }
        return parsed ?? defaultValue;
      }
      print('Warning: Unexpected type ${value.runtimeType} for numeric value, using $defaultValue');
      return defaultValue;
    }
    
    int safeParseInt(dynamic value, [int defaultValue = 0]) {
      if (value == null) return defaultValue;
      if (value is int) return value;
      if (value is double) return value.toInt();
      if (value is String) {
        final parsed = int.tryParse(value);
        if (parsed == null) {
          print('Warning: Could not parse "$value" as int, using $defaultValue');
        }
        return parsed ?? defaultValue;
      }
      print('Warning: Unexpected type ${value.runtimeType} for integer value, using $defaultValue');
      return defaultValue;
    }
    
    // Safely get coordinates from array
    double getCoordinate(dynamic coords, int index, [double defaultValue = 0.0]) {
      if (coords == null) return defaultValue;
      if (coords is! List) return defaultValue;
      if (coords.isEmpty || coords.length <= index) return defaultValue;
      return safeParseDouble(coords[index], defaultValue);
    }
    
    // Extract latitude with multiple fallback options
    double getLatitude() {
      // Try direct latitude field
      if (json['latitude'] != null) {
        return safeParseDouble(json['latitude']);
      }
      // Try location.lat
      if (json['location']?['lat'] != null) {
        return safeParseDouble(json['location']['lat']);
      }
      // Try coordinates array (GeoJSON format: [lng, lat])
      if (json['location']?['coordinates'] != null) {
        return getCoordinate(json['location']['coordinates'], 1);
      }
      // Try top-level coordinates
      if (json['coordinates'] != null) {
        return getCoordinate(json['coordinates'], 1);
      }
      return 0.0;
    }
    
    // Extract longitude with multiple fallback options
    double getLongitude() {
      // Try direct longitude field
      if (json['longitude'] != null) {
        return safeParseDouble(json['longitude']);
      }
      // Try location.lng
      if (json['location']?['lng'] != null) {
        return safeParseDouble(json['location']['lng']);
      }
      // Try coordinates array (GeoJSON format: [lng, lat])
      if (json['location']?['coordinates'] != null) {
        return getCoordinate(json['location']['coordinates'], 0);
      }
      // Try top-level coordinates
      if (json['coordinates'] != null) {
        return getCoordinate(json['coordinates'], 0);
      }
      return 0.0;
    }
    
    return Gym(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['gymName'] ?? json['name'] ?? 'Unknown Gym').toString(),
      description: (json['description'] ?? '').toString(),
      address: (json['location']?['address'] ?? json['address'] ?? '').toString(),
      latitude: getLatitude(),
      longitude: getLongitude(),
      city: json['location']?['city']?.toString() ?? json['city']?.toString(),
      state: json['location']?['state']?.toString() ?? json['state']?.toString(),
      pincode: json['location']?['pincode']?.toString() ?? json['pincode']?.toString(),
      phone: json['phone']?.toString(),
      email: json['email']?.toString(),
      logoUrl: json['logoUrl']?.toString(),
      images: _safeParseImages(json),
      amenities: _safeParseList(json['amenities']),
      activities: _safeParseActivities(json['activities']),
      openingTime: json['openingTime']?.toString(),
      closingTime: json['closingTime']?.toString(),
      rating: safeParseDouble(json['rating']),
      reviewCount: safeParseInt(json['reviewCount']),
      distance: json['distance'] != null ? safeParseDouble(json['distance']) : null,
      isFavorite: json['isFavorite'] == true || json['isFavorite'] == 'true',
      createdAt: _safeParseDatetime(json['createdAt']),
    );
  }
  
  // Helper methods for parsing
  static List<String> _safeParseImages(Map<String, dynamic> json) {
    try {
      if (json['gymPhotos'] != null && json['gymPhotos'] is List) {
        final photos = json['gymPhotos'] as List;
        final result = <String>[];
        for (var p in photos) {
          try {
            if (p is Map && p['imageUrl'] != null) {
              final url = p['imageUrl'].toString();
              if (url.isNotEmpty) result.add(url);
            } else if (p != null) {
              final url = p.toString();
              if (url.isNotEmpty) result.add(url);
            }
          } catch (e) {
            print('Error parsing individual image: $e');
            continue;
          }
        }
        if (result.isNotEmpty) return result;
      }
      if (json['images'] != null && json['images'] is List) {
        final images = json['images'] as List;
        final result = <String>[];
        for (var img in images) {
          try {
            if (img != null) {
              final url = img.toString();
              if (url.isNotEmpty) result.add(url);
            }
          } catch (e) {
            print('Error parsing individual image: $e');
            continue;
          }
        }
        return result;
      }
    } catch (e) {
      print('Error parsing images: $e');
    }
    return [];
  }
  
  static List<String> _safeParseList(dynamic value) {
    try {
      if (value == null) return [];
      if (value is List) {
        final result = <String>[];
        for (var item in value) {
          try {
            if (item != null) {
              final str = item.toString();
              if (str.isNotEmpty) result.add(str);
            }
          } catch (e) {
            print('Error parsing list item: $e');
            continue;
          }
        }
        return result;
      }
      if (value is String && value.isNotEmpty) return [value];
    } catch (e) {
      print('Error parsing list: $e');
    }
    return [];
  }
  
  static List<String> _safeParseActivities(dynamic value) {
    try {
      if (value == null) return [];
      if (value is List) {
        final result = <String>[];
        for (var item in value) {
          try {
            if (item is Map && item['name'] != null) {
              // Extract activity name from object
              final name = item['name'].toString();
              if (name.isNotEmpty) result.add(name);
            } else if (item is String && item.isNotEmpty) {
              // Direct string activity name
              result.add(item);
            }
          } catch (e) {
            print('Error parsing activity item: $e');
            continue;
          }
        }
        return result;
      }
    } catch (e) {
      print('Error parsing activities: $e');
    }
    return [];
  }
  
  static DateTime _safeParseDatetime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value;
    if (value is String) {
      try {
        return DateTime.parse(value);
      } catch (e) {
        return DateTime.now();
      }
    }
    return DateTime.now();
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'city': city,
      'state': state,
      'pincode': pincode,
      'phone': phone,
      'email': email,
      'images': images,
      'amenities': amenities,
      'activities': activities,
      'openingTime': openingTime,
      'closingTime': closingTime,
      'rating': rating,
      'reviewCount': reviewCount,
      'distance': distance,
      'isFavorite': isFavorite,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  Gym copyWith({
    String? id,
    String? name,
    String? description,
    String? address,
    double? latitude,
    double? longitude,
    String? city,
    String? state,
    String? pincode,
    String? phone,
    String? email,
    List<String>? images,
    List<String>? amenities,
    List<String>? activities,
    String? openingTime,
    String? closingTime,
    double? rating,
    int? reviewCount,
    double? distance,
    bool? isFavorite,
    DateTime? createdAt,
  }) {
    return Gym(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      city: city ?? this.city,
      state: state ?? this.state,
      pincode: pincode ?? this.pincode,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      images: images ?? this.images,
      amenities: amenities ?? this.amenities,
      activities: activities ?? this.activities,
      openingTime: openingTime ?? this.openingTime,
      closingTime: closingTime ?? this.closingTime,
      rating: rating ?? this.rating,
      reviewCount: reviewCount ?? this.reviewCount,
      distance: distance ?? this.distance,
      isFavorite: isFavorite ?? this.isFavorite,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
