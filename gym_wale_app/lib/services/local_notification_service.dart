import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local Notification Service for showing attendance notifications
/// 
/// This service handles local notifications for attendance events.
/// For full push notification support, enable Firebase Cloud Messaging.
/// 
/// SETUP INSTRUCTIONS:
/// 
/// 1. Add dependencies to pubspec.yaml:
///    ```yaml
///    dependencies:
///      flutter_local_notifications: ^18.0.1
///    ```
/// 
/// 2. Android Configuration (android/app/src/main/AndroidManifest.xml):
///    ```xml
///    <!-- Add inside <application> tag -->
///    <meta-data
///        android:name="com.google.firebase.messaging.default_notification_channel_id"
///        android:value="gym_wale_attendance" />
///    ```
/// 
/// 3. iOS Configuration:
///    - Add notification capability in Xcode
///    - Update Info.plist for notification permissions

class LocalNotificationService {
  static LocalNotificationService? _instance;
  static LocalNotificationService get instance {
    _instance ??= LocalNotificationService._();
    return _instance!;
  }

  LocalNotificationService._();

  // Uncomment when flutter_local_notifications is added
  // FlutterLocalNotificationsPlugin? _notificationsPlugin;
  bool _initialized = false;

  /// Initialize local notifications
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      if (kIsWeb) {
        debugPrint('[LOCAL_NOTIF] Local notifications not supported on web');
        return;
      }

      // TODO: Uncomment when flutter_local_notifications package is added
      /*
      _notificationsPlugin = FlutterLocalNotificationsPlugin();

      // Android initialization
      const AndroidInitializationSettings androidSettings =
          AndroidInitializationSettings('@drawable/ic_notification');

      // iOS initialization
      const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const InitializationSettings initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _notificationsPlugin!.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      // Create notification channel for Android
      await _createNotificationChannels();

      _initialized = true;
      debugPrint('[LOCAL_NOTIF] Local notification service initialized');
      */

      _initialized = true;
      debugPrint('[LOCAL_NOTIF] Local notification service initialized (stub mode)');
      debugPrint('[LOCAL_NOTIF] To enable: Add flutter_local_notifications to pubspec.yaml');
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error initializing: $e');
    }
  }

  /// Create notification channels for Android
  /// TODO: Uncomment when flutter_local_notifications is added
  /*
  Future<void> _createNotificationChannels() async {
    const AndroidNotificationChannel attendanceChannel = AndroidNotificationChannel(
      'gym_wale_attendance',
      'Attendance Notifications',
      description: 'Notifications for automatic attendance marking',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
      showBadge: true,
    );

    await _notificationsPlugin!
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(attendanceChannel);
  }

  /// Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('[LOCAL_NOTIF] Notification tapped: ${response.payload}');
    // Handle navigation based on payload
    // You can use a navigation service or callback here
  }
  */

  /// Show attendance entry notification
  Future<void> showAttendanceEntryNotification({
    required String gymName,
    required String time,
    int? sessionsRemaining,
  }) async {
    try {
      final title = '✅ Attendance Marked';
      final body = sessionsRemaining != null
          ? 'Welcome to $gymName! Check-in: $time. Sessions left: $sessionsRemaining'
          : 'Welcome to $gymName! Check-in time: $time';

      await _showNotification(
        id: 1001,
        title: title,
        body: body,
        payload: 'attendance_entry',
      );
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error showing entry notification: $e');
    }
  }

  /// Show attendance exit notification
  Future<void> showAttendanceExitNotification({
    required String gymName,
    required String time,
    required int durationMinutes,
  }) async {
    try {
      final title = '👋 Gym Exit Recorded';
      final body = 'You checked out at $time. Workout duration: $durationMinutes minutes. Great session!';

      await _showNotification(
        id: 1002,
        title: title,
        body: body,
        payload: 'attendance_exit',
      );
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error showing exit notification: $e');
    }
  }

  /// Show generic attendance notification
  Future<void> showAttendanceNotification({
    required String title,
    required String message,
  }) async {
    try {
      await _showNotification(
        id: 1000,
        title: title,
        body: message,
        payload: 'attendance_general',
      );
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error showing notification: $e');
    }
  }

  /// Internal method to show notification
  Future<void> _showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) {
      debugPrint('[LOCAL_NOTIF] Not initialized, skipping notification: $title');
      return;
    }

    // TODO: Uncomment when flutter_local_notifications is added
    /*
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'gym_wale_attendance',
      'Attendance Notifications',
      channelDescription: 'Notifications for automatic attendance marking',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      icon: '@drawable/ic_notification',
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notificationsPlugin!.show(
      id,
      title,
      body,
      platformDetails,
      payload: payload,
    );
    */

    // Stub mode - just log
    debugPrint('[LOCAL_NOTIF] Would show notification:');
    debugPrint('[LOCAL_NOTIF]   Title: $title');
    debugPrint('[LOCAL_NOTIF]   Body: $body');
    debugPrint('[LOCAL_NOTIF]   Payload: $payload');
  }

  /// Request notification permission (iOS)
  Future<bool> requestPermission() async {
    try {
      // TODO: Uncomment when flutter_local_notifications is added
      /*
      if (Platform.isIOS) {
        final bool? granted = await _notificationsPlugin
            ?.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
            ?.requestPermissions(
              alert: true,
              badge: true,
              sound: true,
            );
        return granted ?? false;
      }
      */
      return true; // Android doesn't need explicit permission for local notifications
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error requesting permission: $e');
      return false;
    }
  }

  /// Cancel a specific notification
  Future<void> cancelNotification(int id) async {
    try {
      // TODO: Uncomment when flutter_local_notifications is added
      // await _notificationsPlugin?.cancel(id);
      debugPrint('[LOCAL_NOTIF] Notification $id cancelled');
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error cancelling notification: $e');
    }
  }

  /// Cancel all notifications
  Future<void> cancelAllNotifications() async {
    try {
      // TODO: Uncomment when flutter_local_notifications is added
      // await _notificationsPlugin?.cancelAll();
      debugPrint('[LOCAL_NOTIF] All notifications cancelled');
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Error cancelling all notifications: $e');
    }
  }
}
