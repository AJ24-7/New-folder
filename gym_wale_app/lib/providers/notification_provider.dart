import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/notification.dart';
import '../services/api_service.dart';

class NotificationProvider with ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  int _unreadCount = 0;
  Set<String> _localReadIds = {}; // Track locally read notifications
  
  // Polling configuration
  Timer? _pollingTimer;
  DateTime? _lastPollTime;
  bool _isPollingEnabled = false;
  final Duration _pollingInterval = const Duration(seconds: 30); // Poll every 30 seconds

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _unreadCount;
  bool get isPollingEnabled => _isPollingEnabled;

  List<AppNotification> get unreadNotifications =>
      _notifications.where((n) => !n.isRead).toList();

  /// Initialize provider and load cached read notification IDs
  Future<void> initialize() async {
    await _loadLocalReadIds();
  }

  /// Load locally cached read notification IDs from SharedPreferences
  Future<void> _loadLocalReadIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final readIds = prefs.getStringList('read_notification_ids') ?? [];
      _localReadIds = readIds.toSet();
      print('Loaded ${_localReadIds.length} locally read notification IDs');
    } catch (e) {
      print('Error loading local read IDs: $e');
    }
  }

  /// Save read notification ID locally
  Future<void> _saveReadIdLocally(String notificationId) async {
    try {
      _localReadIds.add(notificationId);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('read_notification_ids', _localReadIds.toList());
      print('Saved notification $notificationId as read locally');
    } catch (e) {
      print('Error saving read ID locally: $e');
    }
  }

  /// Save all read notification IDs locally
  Future<void> _saveAllReadIdsLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('read_notification_ids', _localReadIds.toList());
      print('Saved all read notification IDs locally');
    } catch (e) {
      print('Error saving all read IDs locally: $e');
    }
  }

  /// Clear local read cache (for logout, etc.)
  Future<void> clearLocalReadCache() async {
    try {
      _localReadIds.clear();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('read_notification_ids');
      print('Cleared local read notification cache');
    } catch (e) {
      print('Error clearing local read cache: $e');
    }
  }

  /// Play notification sound
  Future<void> _playNotificationSound() async {
    try {
      // Play system notification sound
      await SystemSound.play(SystemSoundType.alert);
    } catch (e) {
      print('Error playing notification sound: $e');
    }
  }

  /// Update app badge count (iOS/Android)
  /// To enable full badge functionality:
  /// 1. Add to pubspec.yaml: flutter_app_badger: ^1.5.0
  /// 2. Uncomment the FlutterAppBadger.updateBadgeCount() line below
  /// 3. Import: import 'package:flutter_app_badger/flutter_app_badger.dart';
  Future<void> _updateBadgeCount() async {
    try {
      // This would require a plugin like flutter_app_badger
      // For now, we'll just log it
      print('Badge count updated to: $_unreadCount');
      // TODO: Implement badge update with flutter_app_badger package
      // FlutterAppBadger.updateBadgeCount(_unreadCount);
    } catch (e) {
      print('Error updating badge: $e');
    }
  }

  Future<void> loadNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final data = await ApiService.getNotifications();
      _notifications = data.map((json) {
        final notification = AppNotification.fromJson(json);
        // Apply local read status if not already read from server
        if (!notification.isRead && _localReadIds.contains(notification.id)) {
          return AppNotification(
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.createdAt,
            isRead: true, // Mark as read based on local cache
            data: notification.data,
            imageUrl: notification.imageUrl,
            actionType: notification.actionType,
            actionData: notification.actionData,
          );
        }
        return notification;
      }).toList();
      _unreadCount = _notifications.where((n) => !n.isRead).length;
      await _updateBadgeCount();
    } catch (e) {
      print('Error loading notifications: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      // Mark as read locally first for immediate UI update
      final index = _notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1 && !_notifications[index].isRead) {
        _notifications[index] = AppNotification(
          id: _notifications[index].id,
          title: _notifications[index].title,
          message: _notifications[index].message,
          type: _notifications[index].type,
          createdAt: _notifications[index].createdAt,
          isRead: true,
          data: _notifications[index].data,
          imageUrl: _notifications[index].imageUrl,
          actionType: _notifications[index].actionType,
          actionData: _notifications[index].actionData,
        );
        _unreadCount = _notifications.where((n) => !n.isRead).length;
        
        // Save to local storage immediately
        await _saveReadIdLocally(notificationId);
        
        await _updateBadgeCount();
        notifyListeners();
      }
      
      // Then sync with server in background
      await ApiService.markNotificationAsRead(notificationId);
    } catch (e) {
      print('Error marking notification as read: $e');
      // Even if server sync fails, local state is preserved
    }
  }

  Future<void> markAllAsRead() async {
    try {
      // Mark all as read locally first
      _notifications = _notifications.map((n) {
        if (!n.isRead) {
          _localReadIds.add(n.id);
        }
        return AppNotification(
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt,
          isRead: true,
          data: n.data,
          imageUrl: n.imageUrl,
          actionType: n.actionType,
          actionData: n.actionData,
        );
      }).toList();
      _unreadCount = 0;
      
      // Save all to local storage
      await _saveAllReadIdsLocally();
      
      await _updateBadgeCount();
      notifyListeners();
      
      // Then sync with server
      await ApiService.markAllNotificationsAsRead();
    } catch (e) {
      print('Error marking all notifications as read: $e');
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    try {
      await ApiService.deleteNotification(notificationId);
      
      _notifications.removeWhere((n) => n.id == notificationId);
      _unreadCount = _notifications.where((n) => !n.isRead).length;
      await _updateBadgeCount();
      notifyListeners();
    } catch (e) {
      print('Error deleting notification: $e');
    }
  }

  void addNotification(AppNotification notification) {
    _notifications.insert(0, notification);
    if (!notification.isRead) {
      _unreadCount++;
      // Play sound and update badge for new notifications
      _playNotificationSound();
      _updateBadgeCount();
    }
    notifyListeners();
  }
  
  /// Start automatic polling for new notifications
  void startPolling() {
    if (_isPollingEnabled) return;
    
    _isPollingEnabled = true;
    _lastPollTime = DateTime.now();
    
    _pollingTimer = Timer.periodic(_pollingInterval, (timer) {
      _pollForNewNotifications();
    });
    
    print('📡 Notification polling started (every ${_pollingInterval.inSeconds}s)');
  }
  
  /// Stop automatic polling
  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _isPollingEnabled = false;
    print('📡 Notification polling stopped');
  }
  
  /// Poll for new notifications since last check
  Future<void> _pollForNewNotifications() async {
    if (_isLoading) return; // Skip if already loading
    
    try {
      final since = _lastPollTime?.toIso8601String();
      final data = await ApiService.pollNotifications(since: since);
      
      if (data['notifications'] != null && data['notifications'].isNotEmpty) {
        final newNotifications = (data['notifications'] as List).map((json) {
          final notification = AppNotification.fromJson(json);
          // Apply local read status
          if (!notification.isRead && _localReadIds.contains(notification.id)) {
            return AppNotification(
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              createdAt: notification.createdAt,
              isRead: true,
              data: notification.data,
              imageUrl: notification.imageUrl,
              actionType: notification.actionType,
              actionData: notification.actionData,
            );
          }
          return notification;
        }).toList();
        
        // Add new notifications to the beginning of the list
        for (final notification in newNotifications.reversed) {
          // Check if notification already exists
          if (!_notifications.any((n) => n.id == notification.id)) {
            _notifications.insert(0, notification);
            
            // Play sound and show visual feedback for unread notifications
            if (!notification.isRead) {
              _playNotificationSound();
              print('🔔 New notification: ${notification.title}');
            }
          }
        }
        
        // Update unread count from server
        if (data['unreadCount'] != null) {
          _unreadCount = data['unreadCount'];
          await _updateBadgeCount();
        }
        
        notifyListeners();
      }
      
      // Update last poll time from server response if available
      if (data['timestamp'] != null) {
        _lastPollTime = DateTime.parse(data['timestamp']);
      } else {
        _lastPollTime = DateTime.now();
      }
    } catch (e) {
      print('Error polling notifications: $e');
      // Don't notify listeners on polling errors to avoid UI disruptions
    }
  }
  
  /// Manually trigger a poll (useful for pull-to-refresh)
  Future<void> pollNow() async {
    await _pollForNewNotifications();
  }
  
  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
