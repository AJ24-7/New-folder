class SupportNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final String priority; // low, normal, high, urgent
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  SupportNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.priority,
    this.read = false,
    required this.createdAt,
    this.metadata,
  });

  factory SupportNotification.fromJson(Map<String, dynamic> json) {
    // Parse createdAt/timestamp with proper error handling
    DateTime? parsedCreatedAt;
    DateTime? parsedTimestamp;
    
    try {
      if (json['createdAt'] != null) {
        parsedCreatedAt = DateTime.parse(json['createdAt'].toString());
      }
    } catch (e) {
      print('⚠️ Error parsing SupportNotification createdAt: $e for value: ${json['createdAt']}');
    }
    
    try {
      if (json['timestamp'] != null) {
        parsedTimestamp = DateTime.parse(json['timestamp'].toString());
      }
    } catch (e) {
      print('⚠️ Error parsing SupportNotification timestamp: $e for value: ${json['timestamp']}');
    }
    
    // Use createdAt if available, otherwise timestamp, with fallback
    final DateTime effectiveCreatedAt = parsedCreatedAt ?? parsedTimestamp ?? DateTime.now();
    
    // Debug logging
    if (parsedCreatedAt == null && parsedTimestamp == null) {
      print('⚠️ Support - Both createdAt and timestamp are null, using fallback DateTime.now()');
    } else {
      print('✅ Support - Parsed notification date: $effectiveCreatedAt');
    }
    
    return SupportNotification(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'system',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      priority: json['priority']?.toString() ?? 'normal',
      read: json['read'] == true || json['isRead'] == true,
      createdAt: effectiveCreatedAt,
      metadata: json['metadata'] is Map ? json['metadata'] : null,
    );
  }
}

class GymReview {
  final String id;
  final String userId;
  final String userName;
  final String? userEmail;
  final String? userImage;
  final String memberStatus; // 'current-member', 'ex-member', 'non-member'
  final int rating;
  final String comment;
  final String? adminReply;
  final DateTime? adminReplyDate;
  final String? gymName; // For admin reply
  final String? gymLogoUrl; // For admin reply
  final bool isFeatured;
  final DateTime createdAt;

  GymReview({
    required this.id,
    required this.userId,
    required this.userName,
    this.userEmail,
    this.userImage,
    this.memberStatus = 'non-member',
    required this.rating,
    required this.comment,
    this.adminReply,
    this.adminReplyDate,
    this.gymName,
    this.gymLogoUrl,
    this.isFeatured = false,
    required this.createdAt,
  });

  factory GymReview.fromJson(Map<String, dynamic> json) {
    // Handle adminReply which can be either a string or an object {reply: "text", repliedAt: "date"}
    String? adminReplyText;
    DateTime? adminReplyDateTime;
    String? gymNameValue;
    String? gymLogoUrlValue;
    
    if (json['adminReply'] != null) {
      if (json['adminReply'] is String) {
        adminReplyText = json['adminReply'];
      } else if (json['adminReply'] is Map) {
        adminReplyText = json['adminReply']['reply'];
        if (json['adminReply']['repliedAt'] != null) {
          adminReplyDateTime = DateTime.parse(json['adminReply']['repliedAt']);
        }
        // Get gym info from repliedBy
        if (json['adminReply']['repliedBy'] != null && json['adminReply']['repliedBy'] is Map) {
          gymNameValue = json['adminReply']['repliedBy']['gymName'];
          gymLogoUrlValue = json['adminReply']['repliedBy']['logoUrl'];
        }
      }
    }
    
    // Handle userId which can be populated (object) or just an ID (string)
    String userIdValue = '';
    String userNameValue = 'Anonymous';
    String? userEmailValue;
    String? userImageValue;
    
    if (json['userId'] != null) {
      if (json['userId'] is String) {
        userIdValue = json['userId'];
      } else if (json['userId'] is Map) {
        userIdValue = json['userId']['_id'] ?? json['userId']['id'] ?? '';
        userNameValue = json['userId']['name'] ?? json['userId']['firstName'] ?? 'Anonymous';
        userEmailValue = json['userId']['email'];
        userImageValue = json['userId']['profilePicture'];
      }
    }
    
    // Also check for 'user' field (backend might send it as 'user' instead of 'userId')
    if (json['user'] != null && json['user'] is Map) {
      userIdValue = json['user']['_id'] ?? json['user']['id'] ?? userIdValue;
      userNameValue = json['user']['firstName'] ?? json['user']['name'] ?? userNameValue;
      if (json['user']['lastName'] != null) {
        userNameValue = '$userNameValue ${json['user']['lastName']}';
      }
      userEmailValue = json['user']['email'] ?? userEmailValue;
      userImageValue = json['user']['profileImage'] ?? userImageValue;
    }
    
    // Use fallback values if userId was not populated
    if (userNameValue == 'Anonymous' && json['userName'] != null) {
      userNameValue = json['userName'];
    }
    if (userEmailValue == null && json['userEmail'] != null) {
      userEmailValue = json['userEmail'];
    }
    if (userImageValue == null && json['userImage'] != null) {
      userImageValue = json['userImage'];
    }
    
    // Get member status
    String memberStatusValue = json['memberStatus']?.toString() ?? 'non-member';
    
    return GymReview(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      userId: userIdValue,
      userName: userNameValue,
      userEmail: userEmailValue,
      userImage: userImageValue,
      memberStatus: memberStatusValue,
      rating: (json['rating'] is int) ? json['rating'] : (json['rating'] is double ? json['rating'].toInt() : 0),
      comment: json['comment']?.toString() ?? '',
      adminReply: adminReplyText,
      adminReplyDate: adminReplyDateTime ?? (json['adminReplyDate'] != null ? DateTime.parse(json['adminReplyDate']) : null),
      gymName: gymNameValue,
      gymLogoUrl: gymLogoUrlValue,
      isFeatured: json['isFeatured'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}

class Grievance {
  final String id;
  final String userId;
  final String userName;
  final String? userEmail;
  final String title;
  final String description;
  final String category;
  final String priority; // low, medium, high, urgent
  final String status; // open, in-progress, resolved, closed
  final List<GrievanceMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool escalatedToAdmin;
  final String? escalationReason;

  Grievance({
    required this.id,
    required this.userId,
    required this.userName,
    this.userEmail,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    this.messages = const [],
    required this.createdAt,
    required this.updatedAt,
    this.escalatedToAdmin = false,
    this.escalationReason,
  });

  factory Grievance.fromJson(Map<String, dynamic> json) {
    // Handle userId which can be populated or just an ID
    String userIdValue = '';
    String userNameValue = 'Anonymous';
    String? userEmailValue;
    
    if (json['userId'] != null) {
      if (json['userId'] is String) {
        userIdValue = json['userId'];
      } else if (json['userId'] is Map) {
        userIdValue = json['userId']['_id']?.toString() ?? json['userId']['id']?.toString() ?? '';
        userNameValue = json['userId']['name']?.toString() ?? 'Anonymous';
        userEmailValue = json['userId']['email']?.toString();
      }
    }
    
    // Fallback to top-level fields
    if (userNameValue == 'Anonymous' && json['userName'] != null) {
      userNameValue = json['userName'].toString();
    }
    if (userEmailValue == null && json['userEmail'] != null) {
      userEmailValue = json['userEmail'].toString();
    }
    
    return Grievance(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      userId: userIdValue,
      userName: userNameValue,
      userEmail: userEmailValue,
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'general',
      priority: json['priority']?.toString() ?? 'medium',
      status: json['status']?.toString() ?? 'open',
      messages: (json['messages'] as List?)
              ?.map((m) => GrievanceMessage.fromJson(m))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
      escalatedToAdmin: json['escalatedToAdmin'] == true,
      escalationReason: json['escalationReason']?.toString(),
    );
  }
}

class GrievanceMessage {
  final String id;
  final String sender;
  final String senderType; // user, admin, system
  final String message;
  final DateTime timestamp;

  GrievanceMessage({
    required this.id,
    required this.sender,
    required this.senderType,
    required this.message,
    required this.timestamp,
  });

  factory GrievanceMessage.fromJson(Map<String, dynamic> json) {
    return GrievanceMessage(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      sender: json['sender']?.toString() ?? '',
      senderType: json['senderType']?.toString() ?? 'user',
      message: json['message']?.toString() ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }
}

class Communication {
  final String id;
  final String userId;
  final String userName;
  final String? userEmail;
  final String? userImage;
  final String category;
  final List<ChatMessage> messages;
  final int unreadCount;
  final int repliedCount; // Number of admin replies
  final String status; // active, resolved, closed
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic>? metadata;
  final bool isMember; // Whether the user is a member of the gym
  final String? memberBadge; // 'member' tag if user is a member

  Communication({
    required this.id,
    required this.userId,
    required this.userName,
    this.userEmail,
    this.userImage,
    required this.category,
    this.messages = const [],
    this.unreadCount = 0,
    this.repliedCount = 0,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.metadata,
    this.isMember = false,
    this.memberBadge,
  });

  factory Communication.fromJson(Map<String, dynamic> json) {
    // Handle userId which can be populated or just an ID
    String userIdValue = '';
    String userNameValue = 'User';
    String? userEmailValue;
    String? userImageValue;
    
    if (json['userId'] != null) {
      if (json['userId'] is String) {
        userIdValue = json['userId'];
      } else if (json['userId'] is Map) {
        userIdValue = json['userId']['_id']?.toString() ?? json['userId']['id']?.toString() ?? '';
        userNameValue = json['userId']['name']?.toString() ?? 'User';
        userEmailValue = json['userId']['email']?.toString();
        userImageValue = json['userId']['profilePicture']?.toString() ?? json['userId']['profileImage']?.toString();
      }
    }
    
    // Fallback to top-level fields
    if (userNameValue == 'User' && json['userName'] != null) {
      userNameValue = json['userName'].toString();
    }
    if (userEmailValue == null && json['userEmail'] != null) {
      userEmailValue = json['userEmail'].toString();
    }
    
    // Check metadata for profile image
    if (userImageValue == null) {
      if (json['userImage'] != null) {
        userImageValue = json['userImage'].toString();
      } else if (json['metadata'] != null && json['metadata']['userProfileImage'] != null) {
        userImageValue = json['metadata']['userProfileImage'].toString();
      }
    }
    
    // Get member information from metadata
    final metadata = json['metadata'] is Map ? json['metadata'] : null;
    final isMember = metadata?['isMember'] == true;
    final memberBadge = metadata?['memberBadge']?.toString();
    
    return Communication(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      userId: userIdValue,
      userName: userNameValue,
      userEmail: userEmailValue,
      userImage: userImageValue,
      category: json['category']?.toString() ?? 'chat',
      messages: (json['messages'] as List?)
              ?.map((m) => ChatMessage.fromJson(m))
              .toList() ??
          [],
      unreadCount: (json['unreadCount'] is int) ? json['unreadCount'] : 0,
      repliedCount: (json['repliedCount'] is int) ? json['repliedCount'] : 0,
      status: json['status']?.toString() ?? 'active',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
      metadata: metadata,
      isMember: isMember,
      memberBadge: memberBadge,
    );
  }
}

class ChatMessage {
  final String id;
  final String sender;
  final String senderType; // user, admin
  final String message;
  final DateTime timestamp;
  final bool read;
  final Map<String, dynamic>? metadata;
  final String? senderImage; // Profile image of the sender
  final bool isMember; // Whether the sender is a member
  final String? memberBadge; // 'member' tag if sender is a member

  ChatMessage({
    required this.id,
    required this.sender,
    required this.senderType,
    required this.message,
    required this.timestamp,
    this.read = false,
    this.metadata,
    this.senderImage,
    this.isMember = false,
    this.memberBadge,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final metadata = json['metadata'] is Map ? json['metadata'] : null;
    final isMember = metadata?['isMember'] == true;
    final memberBadge = metadata?['memberBadge']?.toString();
    final senderImage = metadata?['userProfileImage']?.toString();
    
    return ChatMessage(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      sender: json['sender']?.toString() ?? json['senderName']?.toString() ?? '',
      senderType: json['senderType']?.toString() ?? json['sender']?.toString() ?? 'user',
      message: json['message']?.toString() ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
      read: json['read'] == true,
      metadata: metadata,
      senderImage: senderImage,
      isMember: isMember,
      memberBadge: memberBadge,
    );
  }
}

class SupportStats {
  final NotificationStats notifications;
  final ReviewStats reviews;
  final GrievanceStats grievances;
  final CommunicationStats communications;

  SupportStats({
    required this.notifications,
    required this.reviews,
    required this.grievances,
    required this.communications,
  });

  factory SupportStats.empty() {
    return SupportStats(
      notifications: NotificationStats(total: 0, unread: 0, system: 0, priority: 0),
      reviews: ReviewStats(total: 0, average: 0.0, pending: 0, recent: 0),
      grievances: GrievanceStats(total: 0, open: 0, resolved: 0, closed: 0, urgent: 0),
      communications: CommunicationStats(total: 0, unread: 0, replied: 0, active: 0, responseTime: 0),
    );
  }
}

class NotificationStats {
  final int total;
  final int unread;
  final int system;
  final int priority;

  NotificationStats({
    required this.total,
    required this.unread,
    required this.system,
    required this.priority,
  });
}

class ReviewStats {
  final int total;
  final double average;
  final int pending;
  final int recent;

  ReviewStats({
    required this.total,
    required this.average,
    required this.pending,
    required this.recent,
  });
}

class GrievanceStats {
  final int total;
  final int open;
  final int resolved;
  final int closed;
  final int urgent;

  GrievanceStats({
    required this.total,
    required this.open,
    required this.resolved,
    required this.closed,
    required this.urgent,
  });
}

class CommunicationStats {
  final int total;
  final int unread;
  final int replied;
  final int active;
  final int responseTime;

  CommunicationStats({
    required this.total,
    required this.unread,
    required this.replied,
    required this.active,
    required this.responseTime,
  });
}
