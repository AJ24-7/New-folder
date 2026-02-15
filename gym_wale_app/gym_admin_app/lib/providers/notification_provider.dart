// lib/providers/notification_provider.dart
import 'package:flutter/material.dart';
import '../models/notification.dart';
import '../services/notification_service.dart';

class NotificationProvider with ChangeNotifier {
  final NotificationService _notificationService = NotificationService();

  List<GymNotification> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;
  String? _error;
  NotificationStats _stats = NotificationStats.empty();

  // Filters
  String _typeFilter = 'all';
  String _priorityFilter = 'all';
  String _readFilter = 'all';

  // Pagination
  int _currentPage = 1;
  int _totalPages = 1;
  final int _itemsPerPage = 50;

  List<GymNotification> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;
  String? get error => _error;
  NotificationStats get stats => _stats;
  
  String get typeFilter => _typeFilter;
  String get priorityFilter => _priorityFilter;
  String get readFilter => _readFilter;
  
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  bool get hasMore => _currentPage < _totalPages;

  // Unread notifications only
  List<GymNotification> get unreadNotifications =>
      _notifications.where((n) => !n.read).toList();

  // Recent notifications (last 24 hours)
  List<GymNotification> get recentNotifications {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return _notifications.where((n) => n.createdAt.isAfter(yesterday)).toList();
  }

  /// Load notifications with current filters
  Future<void> loadNotifications({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _notifications.clear();
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _notificationService.getNotifications(
        type: _typeFilter,
        priority: _priorityFilter,
        read: _readFilter,
        page: _currentPage,
        limit: _itemsPerPage,
      );

      if (refresh) {
        _notifications = result['notifications'];
      } else {
        _notifications.addAll(result['notifications']);
      }

      _unreadCount = result['unreadCount'];
      _totalPages = result['pagination']['totalPages'];

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load more notifications (pagination)
  Future<void> loadMore() async {
    if (!hasMore || _isLoading) return;

    _currentPage++;
    await loadNotifications();
  }

  /// Refresh notifications
  Future<void> refresh() async {
    await loadNotifications(refresh: true);
    await loadUnreadCount();
    await loadStats();
  }

  /// Load unread count only
  Future<void> loadUnreadCount() async {
    try {
      final count = await _notificationService.getUnreadCount();
      _unreadCount = count;
      notifyListeners();
    } catch (e) {
      print('Error loading unread count: $e');
    }
  }

  /// Load notification statistics
  Future<void> loadStats() async {
    try {
      _stats = await _notificationService.getNotificationStats();
      notifyListeners();
    } catch (e) {
      print('Error loading notification stats: $e');
    }
  }

  /// Mark notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      await _notificationService.markAsRead(notificationId);

      // Update local state
      final index = _notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1) {
        _notifications[index] = _notifications[index].copyWith(
          read: true,
          readAt: DateTime.now(),
        );
        _unreadCount = (_unreadCount - 1).clamp(0, double.infinity).toInt();
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    try {
      await _notificationService.markAllAsRead();

      // Update local state
      _notifications = _notifications.map((n) => n.copyWith(
        read: true,
        readAt: DateTime.now(),
      )).toList();
      _unreadCount = 0;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Delete notification
  Future<void> deleteNotification(String notificationId) async {
    try {
      await _notificationService.deleteNotification(notificationId);

      // Update local state
      final notification = _notifications.firstWhere((n) => n.id == notificationId);
      if (!notification.read) {
        _unreadCount = (_unreadCount - 1).clamp(0, double.infinity).toInt();
      }
      _notifications.removeWhere((n) => n.id == notificationId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Send notification to members
  Future<Map<String, dynamic>> sendToMembers({
    required String title,
    required String message,
    String priority = 'normal',
    String type = 'general',
    NotificationFilters? filters,
    DateTime? scheduleFor,
  }) async {
    try {
      _error = null;
      final result = await _notificationService.sendToMembers(
        title: title,
        message: message,
        priority: priority,
        type: type,
        filters: filters ?? NotificationFilters(),
        scheduleFor: scheduleFor,
      );
      
      // Return detailed stats from the response
      return {
        'success': true,
        'message': result['message'] ?? 'Notification sent successfully',
        'stats': result['stats'] ?? {},
        'notification': result['notification'] ?? {},
      };
    } catch (e) {
      _error = e.toString();
      print('❌ Error in sendToMembers: $e');
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  /// Send bug report to super admin
  Future<bool> sendToSuperAdmin({
    required String title,
    required String message,
    String type = 'bug-report',
    String priority = 'high',
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _notificationService.sendToSuperAdmin(
        title: title,
        message: message,
        type: type,
        priority: priority,
        metadata: metadata ?? {},
      );
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Send membership renewal reminders
  Future<bool> sendRenewalReminders({
    int daysBeforeExpiry = 7,
    String? customMessage,
  }) async {
    try {
      await _notificationService.sendRenewalReminders(
        daysBeforeExpiry: daysBeforeExpiry,
        customMessage: customMessage,
      );
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Send holiday notice
  Future<bool> sendHolidayNotice({
    required String title,
    required String message,
    required DateTime holidayDate,
    DateTime? resumeDate,
  }) async {
    try {
      await _notificationService.sendHolidayNotice(
        title: title,
        message: message,
        holidayDate: holidayDate,
        resumeDate: resumeDate,
      );
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Update filters
  void setFilters({
    String? type,
    String? priority,
    String? read,
  }) {
    bool changed = false;

    if (type != null && type != _typeFilter) {
      _typeFilter = type;
      changed = true;
    }

    if (priority != null && priority != _priorityFilter) {
      _priorityFilter = priority;
      changed = true;
    }

    if (read != null && read != _readFilter) {
      _readFilter = read;
      changed = true;
    }

    if (changed) {
      loadNotifications(refresh: true);
    }
  }

  /// Clear all filters
  void clearFilters() {
    _typeFilter = 'all';
    _priorityFilter = 'all';
    _readFilter = 'all';
    loadNotifications(refresh: true);
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
