class AppNotification {
  final String id;
  final String title;
  final String message;
  final String type; // 'offer', 'membership_expiry', 'trial_booking', 'reminder', 'general'
  final DateTime createdAt;
  final bool isRead;
  final Map<String, dynamic>? data; // Additional data like gymId, offerId, etc.
  final String? imageUrl;
  final String? actionType; // 'navigate', 'external_link', 'none'
  final String? actionData; // Route or URL

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    this.isRead = false,
    this.data,
    this.imageUrl,
    this.actionType,
    this.actionData,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic dateValue) {
      try {
        if (dateValue == null) return DateTime.now();
        if (dateValue is DateTime) return dateValue;
        if (dateValue is String) return DateTime.parse(dateValue);
        return DateTime.now();
      } catch (e) {
        print('Error parsing notification date: $e');
        return DateTime.now();
      }
    }

    return AppNotification(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'general',
      createdAt: parseDate(json['createdAt'] ?? json['timestamp'] ?? json['created_at']),
      isRead: json['isRead'] ?? json['read'] ?? false,
      data: json['data'] is Map<String, dynamic> ? json['data'] : null,
      imageUrl: json['imageUrl']?.toString(),
      actionType: json['actionType']?.toString(),
      actionData: json['actionData']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'type': type,
      'createdAt': createdAt.toIso8601String(),
      'isRead': isRead,
      'data': data,
      'imageUrl': imageUrl,
      'actionType': actionType,
      'actionData': actionData,
    };
  }

  String get typeLabel {
    switch (type) {
      case 'offer':
        return 'Special Offer';
      case 'membership_expiry':
        return 'Membership Alert';
      case 'trial_booking':
        return 'Trial Booking';
      case 'reminder':
        return 'Reminder';
      case 'payment':
        return 'Payment';
      case 'achievement':
        return 'Achievement';
      case 'ticket_update':
        return 'Support Ticket';
      case 'ticket_reply':
        return 'Admin Reply';
      case 'ticket_resolved':
        return 'Ticket Resolved';
      default:
        return 'Notification';
    }
  }

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
    }
  }
}
