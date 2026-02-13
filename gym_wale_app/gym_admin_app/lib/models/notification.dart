// lib/models/notification.dart
class GymNotification {
  final String id;
  final String title;
  final String message;
  final String type;
  final String priority;
  final bool read;
  final DateTime timestamp;
  final DateTime createdAt;
  final DateTime? readAt;
  final Map<String, dynamic>? metadata;
  final String? icon;
  final String? color;
  final String? actionType;
  final String? actionData;

  GymNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.priority = 'normal',
    this.read = false,
    required this.timestamp,
    required this.createdAt,
    this.readAt,
    this.metadata,
    this.icon,
    this.color,
    this.actionType,
    this.actionData,
  });

  factory GymNotification.fromJson(Map<String, dynamic> json) {
    // Parse timestamp and createdAt with proper fallback logic
    DateTime? parsedTimestamp;
    DateTime? parsedCreatedAt;
    
    try {
      if (json['timestamp'] != null) {
        parsedTimestamp = DateTime.parse(json['timestamp'].toString());
      }
    } catch (e) {
      print('⚠️ Error parsing timestamp: $e for value: ${json['timestamp']}');
    }
    
    try {
      if (json['createdAt'] != null) {
        parsedCreatedAt = DateTime.parse(json['createdAt'].toString());
      }
    } catch (e) {
      print('⚠️ Error parsing createdAt: $e for value: ${json['createdAt']}');
    }
    
    // Use timestamp if available, otherwise createdAt, otherwise a fallback
    final DateTime effectiveTimestamp = parsedTimestamp ?? parsedCreatedAt ?? DateTime.now();
    final DateTime effectiveCreatedAt = parsedCreatedAt ?? parsedTimestamp ?? DateTime.now();
    
    // Debug logging
    if (parsedTimestamp == null && parsedCreatedAt == null) {
      print('⚠️ Both timestamp and createdAt are null, using fallback DateTime.now()');
    } else {
      print('✅ Parsed notification date - timestamp: $effectiveTimestamp, createdAt: $effectiveCreatedAt');
    }
    
    return GymNotification(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['type'] ?? 'general',
      priority: json['priority'] ?? 'normal',
      read: json['read'] ?? json['isRead'] ?? false,
      timestamp: effectiveTimestamp,
      createdAt: effectiveCreatedAt,
      readAt: json['readAt'] != null ? DateTime.parse(json['readAt']) : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
      icon: json['icon'],
      color: json['color'],
      actionType: json['actionType'],
      actionData: json['actionData'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'type': type,
      'priority': priority,
      'read': read,
      'timestamp': timestamp.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'readAt': readAt?.toIso8601String(),
      'metadata': metadata,
      'icon': icon,
      'color': color,
      'actionType': actionType,
      'actionData': actionData,
    };
  }

  GymNotification copyWith({
    String? id,
    String? title,
    String? message,
    String? type,
    String? priority,
    bool? read,
    DateTime? timestamp,
    DateTime? createdAt,
    DateTime? readAt,
    Map<String, dynamic>? metadata,
    String? icon,
    String? color,
    String? actionType,
    String? actionData,
  }) {
    return GymNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      priority: priority ?? this.priority,
      read: read ?? this.read,
      timestamp: timestamp ?? this.timestamp,
      createdAt: createdAt ?? this.createdAt,
      readAt: readAt ?? this.readAt,
      metadata: metadata ?? this.metadata,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      actionType: actionType ?? this.actionType,
      actionData: actionData ?? this.actionData,
    );
  }
}

class NotificationFilters {
  final String? membershipStatus; // 'active', 'expired', 'pending'
  final String? membershipType; // specific plan type
  final int? minAge;
  final int? maxAge;
  final String? gender; // 'male', 'female', 'other'
  final List<String>? specificMemberIds;

  NotificationFilters({
    this.membershipStatus,
    this.membershipType,
    this.minAge,
    this.maxAge,
    this.gender,
    this.specificMemberIds,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> filters = {};

    if (membershipStatus != null) {
      filters['membershipStatus'] = membershipStatus;
    }
    if (membershipType != null) {
      filters['membershipType'] = membershipType;
    }
    if (minAge != null || maxAge != null) {
      filters['ageRange'] = {};
      if (minAge != null) filters['ageRange']['min'] = minAge;
      if (maxAge != null) filters['ageRange']['max'] = maxAge;
    }
    if (gender != null) {
      filters['gender'] = gender;
    }
    if (specificMemberIds != null && specificMemberIds!.isNotEmpty) {
      filters['specificMembers'] = specificMemberIds;
    }

    return filters;
  }

  bool get isEmpty {
    return membershipStatus == null &&
        membershipType == null &&
        minAge == null &&
        maxAge == null &&
        gender == null &&
        (specificMemberIds == null || specificMemberIds!.isEmpty);
  }

  bool get hasAgeFilter => minAge != null || maxAge != null;
  
  String getFilterSummary() {
    final List<String> parts = [];
    
    if (membershipStatus != null) {
      parts.add('Status: $membershipStatus');
    }
    if (membershipType != null) {
      parts.add('Plan: $membershipType');
    }
    if (hasAgeFilter) {
      if (minAge != null && maxAge != null) {
        parts.add('Age: $minAge-$maxAge');
      } else if (minAge != null) {
        parts.add('Age: $minAge+');
      } else if (maxAge != null) {
        parts.add('Age: <$maxAge');
      }
    }
    if (gender != null) {
      parts.add('Gender: $gender');
    }
    if (specificMemberIds != null && specificMemberIds!.isNotEmpty) {
      parts.add('${specificMemberIds!.length} specific members');
    }
    
    return parts.isEmpty ? 'No filters' : parts.join(', ');
  }
}

class NotificationStats {
  final Map<String, int> byType;
  final Map<String, int> byPriority;
  final int recentCount;
  final int totalUnread;

  NotificationStats({
    required this.byType,
    required this.byPriority,
    required this.recentCount,
    required this.totalUnread,
  });

  factory NotificationStats.fromJson(Map<String, dynamic> json) {
    return NotificationStats(
      byType: Map<String, int>.from(
          (json['byType'] as List? ?? []).fold<Map<String, int>>(
        {},
        (map, item) {
          map[item['_id']] = item['count'] ?? 0;
          return map;
        },
      )),
      byPriority: Map<String, int>.from(
          (json['byPriority'] as List? ?? []).fold<Map<String, int>>(
        {},
        (map, item) {
          map[item['_id']] = item['count'] ?? 0;
          return map;
        },
      )),
      recentCount: json['recentCount'] ?? 0,
      totalUnread: json['totalUnread'] ?? 0,
    );
  }

  factory NotificationStats.empty() {
    return NotificationStats(
      byType: {},
      byPriority: {},
      recentCount: 0,
      totalUnread: 0,
    );
  }
}
