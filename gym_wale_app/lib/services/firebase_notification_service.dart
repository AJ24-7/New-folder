import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'local_notification_service.dart';

/// Top-level background handler – must be outside any class.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('[FCM] Background message: ${message.notification?.title}');
}

/// Firebase Cloud Messaging service for the user app.
///
/// Handles:
///   - FCM initialisation and permission request
///   - FCM token lifecycle (get / refresh / delete)
///   - Foreground messages via [LocalNotificationService]
///   - Background / tapped message routing
class FirebaseNotificationService {
  //  Singleton 
  static FirebaseNotificationService? _instance;
  static FirebaseNotificationService get instance {
    _instance ??= FirebaseNotificationService._();
    return _instance!;
  }
  FirebaseNotificationService._();

  bool _initialized = false;
  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  /// Optional callback invoked when the user taps a notification.
  void Function(RemoteMessage message)? onNotificationTap;

  //  Initialise 

  Future<void> initialize() async {
    if (_initialized || kIsWeb) return;
    try {
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;

      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        announcement: false,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
      );
      debugPrint('[FCM] Permission: ${settings.authorizationStatus}');

      // Disable OS-level foreground banner so the system does NOT auto-show
      // a notification while the app is open.  _handleForeground (below) will
      // display a local notification via LocalNotificationService instead.
      // Keeping alert/badge/sound = true causes a DUPLICATE on iOS:
      //   iOS system banner  +  local notification from _handleForeground.
      await messaging.setForegroundNotificationPresentationOptions(
        alert: false,
        badge: false,
        sound: false,
      );

      _fcmToken = await messaging.getToken();
      debugPrint('[FCM] Token: ${_fcmToken?.substring(0, 20)}...');
      if (_fcmToken != null) await _persistToken(_fcmToken!);

      messaging.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        await _persistToken(newToken);
        debugPrint('[FCM] Token refreshed.');
      });

      FirebaseMessaging.onMessage.listen(_handleForeground);
      FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);

      final initial = await messaging.getInitialMessage();
      if (initial != null) _handleTap(initial);

      _initialized = true;
      debugPrint('[FCM] Service initialised.');
    } catch (e) {
      debugPrint('[FCM] Init error: $e');
    }
  }

  //  Foreground message  show local notification 

  void _handleForeground(RemoteMessage message) {
    debugPrint('[FCM] Foreground: ${message.notification?.title}');
    final type  = message.data['type'] as String? ?? 'general';
    final title = message.notification?.title ?? '';
    final body  = message.notification?.body  ?? '';

    switch (type) {
      case 'chat':
      case 'chat-message':
        LocalNotificationService.instance.showChatNotification(
          title: title.isNotEmpty ? title : 'New message from gym',
          message: body,
          gymName: message.data['gymName'] as String? ?? '',
        );
        break;
      case 'notice':
      case 'announcement':
      case 'holiday-notice':
      case 'general':
        LocalNotificationService.instance.showNoticeNotification(
          title: title,
          message: body,
        );
        break;
      case 'problem-report-response':
      case 'report_reply':
        LocalNotificationService.instance.showReportReplyNotification(
          title: title.isNotEmpty ? title : 'Response to your report',
          message: body,
        );
        break;
      default:
        LocalNotificationService.instance.showGeneralNotification(
          title: title,
          message: body,
        );
    }
  }

  //  Tap handler 

  void _handleTap(RemoteMessage message) {
    debugPrint('[FCM] Tapped: ${message.data}');
    onNotificationTap?.call(message);
  }

  //  Token helpers 

  Future<void> _persistToken(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', token);
    } catch (e) {
      debugPrint('[FCM] _persistToken error: $e');
    }
  }

  /// Delete the FCM token on logout.
  Future<void> deleteToken() async {
    try {
      if (!kIsWeb) await FirebaseMessaging.instance.deleteToken();
      _fcmToken = null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('fcm_token');
      debugPrint('[FCM] Token deleted.');
    } catch (e) {
      debugPrint('[FCM] deleteToken error: $e');
    }
  }
}
