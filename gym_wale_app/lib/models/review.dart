class Review {
  final String id;
  final String userId;
  final String gymId;
  final String userName;
  final String? userImage;
  final int rating;
  final String comment;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final AdminReply? adminReply;

  Review({
    required this.id,
    required this.userId,
    required this.gymId,
    required this.userName,
    this.userImage,
    required this.rating,
    required this.comment,
    required this.createdAt,
    this.updatedAt,
    this.adminReply,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    // Handle user data (can be populated object or just ID)
    String extractUserName() {
      if (json['reviewerName'] != null && json['reviewerName'].toString().isNotEmpty) {
        return json['reviewerName'].toString();
      }
      if (json['user'] is Map) {
        final user = json['user'] as Map<String, dynamic>;
        final firstName = user['firstName']?.toString() ?? '';
        final lastName = user['lastName']?.toString() ?? '';
        if (firstName.isNotEmpty || lastName.isNotEmpty) {
          return [firstName, lastName].where((s) => s.isNotEmpty).join(' ');
        }
        if (user['name'] != null) return user['name'].toString();
      }
      if (json['userName'] != null) return json['userName'].toString();
      return 'Anonymous';
    }
    
    String extractUserId() {
      if (json['user'] is Map) {
        return (json['user'] as Map<String, dynamic>)['_id']?.toString() ?? '';
      }
      if (json['user'] is String) return json['user'].toString();
      return json['userId']?.toString() ?? '';
    }
    
    String? extractUserImage() {
      if (json['user'] is Map) {
        return (json['user'] as Map<String, dynamic>)['profileImage']?.toString();
      }
      return json['userImage']?.toString();
    }
    
    String extractGymId() {
      if (json['gym'] is Map) {
        return (json['gym'] as Map<String, dynamic>)['_id']?.toString() ?? '';
      }
      if (json['gym'] is String) return json['gym'].toString();
      return json['gymId']?.toString() ?? '';
    }
    
    AdminReply? extractAdminReply() {
      if (json['adminReply'] != null && json['adminReply'] is Map) {
        final replyData = json['adminReply'] as Map<String, dynamic>;
        if (replyData['reply'] != null && replyData['reply'].toString().isNotEmpty) {
          return AdminReply.fromJson(replyData);
        }
      }
      return null;
    }

    return Review(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      userId: extractUserId(),
      gymId: extractGymId(),
      userName: extractUserName(),
      userImage: extractUserImage(),
      rating: (json['rating'] ?? 0) is int ? json['rating'] : int.tryParse(json['rating'].toString()) ?? 0,
      comment: (json['comment'] ?? '').toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
      adminReply: extractAdminReply(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'gymId': gymId,
      'userName': userName,
      'userImage': userImage,
      'rating': rating,
      'comment': comment,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'adminReply': adminReply?.toJson(),
    };
  }
}

class AdminReply {
  final String reply;
  final DateTime repliedAt;
  final GymInfo? repliedBy;

  AdminReply({
    required this.reply,
    required this.repliedAt,
    this.repliedBy,
  });

  factory AdminReply.fromJson(Map<String, dynamic> json) {
    GymInfo? extractGymInfo() {
      if (json['repliedBy'] != null && json['repliedBy'] is Map) {
        return GymInfo.fromJson(json['repliedBy'] as Map<String, dynamic>);
      }
      return null;
    }

    return AdminReply(
      reply: (json['reply'] ?? '').toString(),
      repliedAt: DateTime.tryParse(json['repliedAt']?.toString() ?? '') ?? DateTime.now(),
      repliedBy: extractGymInfo(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'reply': reply,
      'repliedAt': repliedAt.toIso8601String(),
      'repliedBy': repliedBy?.toJson(),
    };
  }
}

class GymInfo {
  final String id;
  final String gymName;
  final String? logoUrl;

  GymInfo({
    required this.id,
    required this.gymName,
    this.logoUrl,
  });

  factory GymInfo.fromJson(Map<String, dynamic> json) {
    return GymInfo(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      gymName: (json['gymName'] ?? json['name'] ?? 'Gym').toString(),
      logoUrl: json['logoUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'gymName': gymName,
      'logoUrl': logoUrl,
    };
  }
}
