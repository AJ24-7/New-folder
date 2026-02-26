// lib/services/notification_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/notification.dart';
import '../config/api_config.dart';
import 'storage_service.dart';

class NotificationService {
  final StorageService _storage = StorageService();
  
  String get baseUrl => '${ApiConfig.baseUrl}/api';

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// Register FCM token with backend
  Future<bool> registerFCMToken(String fcmToken) async {
    try {
      final headers = await _getHeaders();
      final body = json.encode({
        'fcmToken': fcmToken,
        'platform': 'admin_app',
      });

      print('📤 Registering FCM token with backend...');
      final response = await http.post(
        Uri.parse('$baseUrl/admin/fcm-token'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        print('✅ FCM token registered successfully');
        return true;
      } else {
        print('❌ Failed to register FCM token: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('❌ Error registering FCM token: $e');
      return false;
    }
  }

  /// Unregister FCM token from backend
  Future<bool> unregisterFCMToken() async {
    try {
      final headers = await _getHeaders();
      final fcmToken = _storage.getFCMToken();
      
      if (fcmToken == null) return true;

      final response = await http.delete(
        Uri.parse('$baseUrl/admin/fcm-token'),
        headers: headers,
        body: json.encode({'fcmToken': fcmToken}),
      );

      if (response.statusCode == 200) {
        print('✅ FCM token unregistered successfully');
        await _storage.deleteFCMToken();
        return true;
      } else {
        print('❌ Failed to unregister FCM token: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('❌ Error unregistering FCM token: $e');
      return false;
    }
  }

  /// Get all notifications with filters and pagination
  /// Uses unified endpoint /notifications/all (same as Support Tab)
  Future<Map<String, dynamic>> getNotifications({
    String type = 'all',
    String priority = 'all',
    String read = 'all',
    int page = 1,
    int limit = 50,
    String sortBy = 'createdAt',
    String sortOrder = 'desc',
  }) async {
    try {
      final headers = await _getHeaders();
      final queryParams = {
        'type': type,
        'priority': priority,
        'read': read,
        'page': page.toString(),
        'limit': limit.toString(),
        'sortBy': sortBy,
        'sortOrder': sortOrder,
      };

      final uri = Uri.parse('$baseUrl/notifications/all').replace(
        queryParameters: queryParams,
      );

      print('📡 Fetching notifications from: $uri');
      final response = await http.get(uri, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List notifications = data['notifications'] ?? data ?? [];
        
        // Debug: Print first notification to check date format
        if (notifications.isNotEmpty) {
          print('📅 Sample notification data: ${notifications.first}');
          print('📅 First notification createdAt: ${notifications.first['createdAt']}');
          print('📅 First notification timestamp: ${notifications.first['timestamp']}');
        }
        
        // Count unread notifications from the response
        int unreadCount = 0;
        if (notifications.isNotEmpty) {
          unreadCount = notifications.where((n) => !(n['read'] ?? false) && !(n['isRead'] ?? false)).length;
        }
        
        return {
          'notifications': notifications
              .map((n) => GymNotification.fromJson(n))
              .toList(),
          'pagination': data['pagination'] ?? {'totalPages': 1, 'currentPage': page},
          'unreadCount': unreadCount,
        };
      } else {
        print('❌ Failed to load notifications: ${response.statusCode} - ${response.body}');
        throw Exception('Failed to load notifications');
      }
    } catch (e) {
      print('❌ Error loading notifications: $e');
      throw Exception('Error loading notifications: $e');
    }
  }

  /// Get unread count
  /// Uses unified endpoint /notifications/unread (same as Support Tab)
  Future<int> getUnreadCount() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/notifications/unread'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['count'] ?? data['unreadCount'] ?? 0;
      } else {
        return 0;
      }
    } catch (e) {
      print('Error getting unread count: $e');
      return 0;
    }
  }

  /// Mark notification as read
  /// Uses unified endpoint /notifications/:id/read (same as Support Tab)
  Future<void> markAsRead(String notificationId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.patch(
        Uri.parse('$baseUrl/notifications/$notificationId/read'),
        headers: headers,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to mark notification as read');
      }
    } catch (e) {
      throw Exception('Error marking notification as read: $e');
    }
  }

  /// Mark all notifications as read
  /// Uses unified endpoint /notifications/mark-all-read (same as Support Tab)
  Future<void> markAllAsRead() async {
    try {
      final headers = await _getHeaders();
      final response = await http.patch(
        Uri.parse('$baseUrl/notifications/mark-all-read'),
        headers: headers,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to mark all as read');
      }
    } catch (e) {
      throw Exception('Error marking all as read: $e');
    }
  }

  /// Delete notification
  Future<void> deleteNotification(String notificationId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$baseUrl/notifications/$notificationId'),
        headers: headers,
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to delete notification');
      }
    } catch (e) {
      throw Exception('Error deleting notification: $e');
    }
  }

  /// Send notification to members with filters
  Future<Map<String, dynamic>> sendToMembers({
    required String title,
    required String message,
    String priority = 'normal',
    String type = 'general',
    required NotificationFilters filters,
    DateTime? scheduleFor,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = json.encode({
        'title': title,
        'message': message,
        'priority': priority,
        'type': type,
        'filters': filters.toJson(),
        if (scheduleFor != null) 'scheduleFor': scheduleFor.toIso8601String(),
      });

      print('📤 Sending notification to members...');
      final response = await http.post(
        Uri.parse('$baseUrl/notifications/send-to-members'),
        headers: headers,
        body: body,
      );

      final responseData = json.decode(response.body);

      if (response.statusCode == 200) {
        // Enhanced response with detailed stats
        print('✅ Notification sent successfully');
        print('📊 Stats: ${responseData['stats']}');
        return {
          'success': true,
          'message': responseData['message'] ?? 'Notification sent successfully',
          'stats': responseData['stats'] ?? {},
          'notification': responseData['notification'] ?? {},
        };
      } else {
        throw Exception(responseData['message'] ?? 'Failed to send notification');
      }
    } catch (e) {
      print('❌ Error sending notification: $e');
      throw Exception('Error sending notification to members: $e');
    }
  }

  /// Send bug report/message to super admin
  Future<Map<String, dynamic>> sendToSuperAdmin({
    required String title,
    required String message,
    String type = 'bug-report',
    String priority = 'high',
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = json.encode({
        'title': title,
        'message': message,
        'type': type,
        'priority': priority,
        'metadata': metadata ?? {},
      });

      final response = await http.post(
        Uri.parse('$baseUrl/notifications/send-to-super-admin'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to send report');
      }
    } catch (e) {
      throw Exception('Error sending report to super admin: $e');
    }
  }

  /// Send membership renewal reminders
  Future<Map<String, dynamic>> sendRenewalReminders({
    int daysBeforeExpiry = 7,
    String? customMessage,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = json.encode({
        'daysBeforeExpiry': daysBeforeExpiry,
        if (customMessage != null) 'customMessage': customMessage,
      });

      final response = await http.post(
        Uri.parse('$baseUrl/notifications/renewal-reminders'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to send renewal reminders');
      }
    } catch (e) {
      throw Exception('Error sending renewal reminders: $e');
    }
  }

  /// Send holiday notice to all members
  Future<Map<String, dynamic>> sendHolidayNotice({
    required String title,
    required String message,
    required DateTime holidayDate,
    DateTime? resumeDate,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = json.encode({
        'title': title,
        'message': message,
        'holidayDate': holidayDate.toIso8601String(),
        if (resumeDate != null) 'resumeDate': resumeDate.toIso8601String(),
      });

      final response = await http.post(
        Uri.parse('$baseUrl/notifications/holiday-notice'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to send holiday notice');
      }
    } catch (e) {
      throw Exception('Error sending holiday notice: $e');
    }
  }

  /// Get notification statistics
  Future<NotificationStats> getNotificationStats() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/notifications/stats'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return NotificationStats.fromJson(data['stats']);
      } else {
        return NotificationStats.empty();
      }
    } catch (e) {
      print('Error getting notification stats: $e');
      return NotificationStats.empty();
    }
  }
}
