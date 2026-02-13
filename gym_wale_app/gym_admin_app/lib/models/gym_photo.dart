class GymPhoto {
  final String id;
  final String title;
  final String description;
  final String category;
  final String imageUrl;
  final DateTime uploadedAt;

  GymPhoto({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.imageUrl,
    required this.uploadedAt,
  });

  factory GymPhoto.fromJson(Map<String, dynamic> json) {
    return GymPhoto(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? 'general',
      imageUrl: json['imageUrl'] ?? '',
      uploadedAt: json['uploadedAt'] != null 
          ? DateTime.parse(json['uploadedAt']) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'title': title,
      'description': description,
      'category': category,
      'imageUrl': imageUrl,
      'uploadedAt': uploadedAt.toIso8601String(),
    };
  }
}
