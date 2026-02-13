import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
/// Firebase Cloud Messaging Service for Push Notifications
/// 
/// SETUP INSTRUCTIONS:
/// 
/// 1. Add dependencies to pubspec.yaml:
///    ```yaml
///    dependencies:
///      firebase_core: ^3.8.1
///      firebase_messaging: ^15.1.5
///      flutter_local_notifications: ^18.0.1
///    ```
/// 
/// 2. Setup Firebase for your project:
///    - Go to https://console.firebase.google.com
///    - Create a new project or select existing
///    - Add Android and/or iOS apps
///    - Download google-services.json (Android) and GoogleService-Info.plist (iOS)
/// 
/// 3. Android Configuration:
///    a) Place google-services.json in android/app/
///    b) Update android/build.gradle.kts:
///       ```kotlin
///       buildscript {
///           dependencies {
///               classpath("com.google.gms:google-services:4.4.0")
///           }
///       }
///       ```
///    c) Update android/app/build.gradle.kts:
///       ```kotlin
///       plugins {
///           id("com.android.application")
///           id("com.google.gms.google-services")
///       }
///       ```
///    d) Add to android/app/src/main/AndroidManifest.xml inside <application>:
///       ```xml
///       <!-- Firebase Cloud Messaging -->
///       <meta-data
///           android:name="com.google.firebase.messaging.default_notification_channel_id"
///           android:value="gym_wale_notifications" />
///       
///       <!-- Notification Icon (add your own icon) -->
///       <meta-data
///           android:name="com.google.firebase.messaging.default_notification_icon"
///           android:resource="@drawable/ic_notification" />
///       
///       <!-- Notification Color -->
///       <meta-data
///           android:name="com.google.firebase.messaging.default_notification_color"
///           android:resource="@color/notification_color" />
///       ```
/// 
/// 4. iOS Configuration:
///    a) Place GoogleService-Info.plist in ios/Runner/
///    b) Enable Push Notifications capability in Xcode
///    c) Update ios/Runner/AppDelegate.swift to register for remote notifications
/// 
/// 5. Initialize in main.dart:
///    ```dart
///    await Firebase.initializeApp(
///      options: DefaultFirebaseOptions.currentPlatform,
///    );
///    await FirebaseNotificationService.instance.initialize();
///    ```

class FirebaseNotificationService {
  static FirebaseNotificationService? _instance;
  static FirebaseNotificationService get instance {
    _instance ??= FirebaseNotificationService._();
    return _instance!;
  }

  FirebaseNotificationService._();

  // Uncomment when firebase_messaging is added
  // FirebaseMessaging? _messaging;
  // FlutterLocalNotificationsPlugin? _localNotifications;
  
  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  /// Initialize Firebase Cloud Messaging
  Future<void> initialize() async {
    try {
      if (kIsWeb) {
        print('Firebase messaging not supported on web');
        return;
      }

      // TODO: Uncomment when firebase packages are added
      /*
      _messaging = FirebaseMessaging.instance;
      _localNotifications = FlutterLocalNotificationsPlugin();

      // Request permission for iOS
      NotificationSettings settings = await _messaging!.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('User granted permission for notifications');
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
        print('User granted provisional permission');
      } else {
        print('User declined or has not accepted permission');
      }

      // Get FCM token
      _fcmToken = await _messaging!.getToken();
      print('FCM Token: $_fcmToken');

      // Save token locally
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', _fcmToken ?? '');

      // Listen for token refresh
      _messaging!.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _saveFcmToken(newToken);
        // TODO: Send token to your backend
        print('FCM Token refreshed: $newToken');
      });

      // Setup Android notification channels
      await _setupAndroidNotificationChannels();

      // Initialize local notifications
      await _initializeLocalNotifications();

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Handle notification taps
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Check if app was opened from a notification
      RemoteMessage? initialMessage = await _messaging!.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }
      */

      print('Firebase Notification Service initialized (stub mode)');
      print('To enable: Add firebase_core, firebase_messaging, and flutter_local_notifications to pubspec.yaml');
    } catch (e) {
      print('Error initializing Firebase notifications: $e');
    }
  }

  /// Setup Android notification channels with custom sounds
  Future<void> _setupAndroidNotificationChannels() async {
    // TODO: Uncomment when flutter_local_notifications is added
    /*
    const AndroidNotificationChannel highImportanceChannel = AndroidNotificationChannel(
      'gym_wale_high_importance', // id
      'High Importance Notifications', // name
      description: 'This channel is used for important notifications.',
      importance: Importance.high,
      playSound: true,
      sound: RawResourceAndroidNotificationSound('notification_high'),
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
      enableLights: true,
      ledColor: const Color(0xFF1E88E5),
    );

    const AndroidNotificationChannel offerChannel = AndroidNotificationChannel(
      'gym_wale_offers',
      'Offers & Promotions',
      description: 'Notifications for special offers and promotions',
      importance: Importance.defaultImportance,
      playSound: true,
      sound: RawResourceAndroidNotificationSound('notification_offer'),
    );

    const AndroidNotificationChannel membershipChannel = AndroidNotificationChannel(
      'gym_wale_membership',
      'Membership Alerts',
      description: 'Notifications for membership expiry and renewals',
      importance: Importance.high,
      playSound: true,
      sound: RawResourceAndroidNotificationSound('notification_alert'),
    );

    const AndroidNotificationChannel trialChannel = AndroidNotificationChannel(
      'gym_wale_trials',
      'Trial Bookings',
      description: 'Notifications for trial booking confirmations',
      importance: Importance.defaultImportance,
      playSound: true,
      sound: RawResourceAndroidNotificationSound('notification_success'),
    );

    const AndroidNotificationChannel generalChannel = AndroidNotificationChannel(
      'gym_wale_notifications',
      'General Notifications',
      description: 'General gym notifications',
      importance: Importance.defaultImportance,
      playSound: true,
    );

    await _localNotifications!
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(highImportanceChannel);

    await _localNotifications!
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(offerChannel);

    await _localNotifications!
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(membershipChannel);

    await _localNotifications!
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(trialChannel);

    await _localNotifications!
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(generalChannel);
    */
    
    print('Android notification channels setup completed (stub)');
  }

  /// Initialize local notifications plugin
  Future<void> _initializeLocalNotifications() async {
    // TODO: Uncomment when flutter_local_notifications is added
    /*
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    
    final DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
      onDidReceiveLocalNotification: (id, title, body, payload) async {
        // Handle iOS foreground notification
      },
    );

    final InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications!.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Handle notification tap
        if (response.payload != null) {
          _handleLocalNotificationTap(response.payload!);
        }
      },
    );
    */
  }

  /// Handle foreground messages
  void _handleForegroundMessage(dynamic message) {
    // TODO: Uncomment when firebase_messaging is added
    /*
    RemoteMessage msg = message as RemoteMessage;
    print('Foreground message received: ${msg.notification?.title}');

    // Show local notification when app is in foreground
    _showLocalNotification(msg);
    */
  }

  /// Show local notification
  Future<void> _showLocalNotification(dynamic message) async {
    // TODO: Uncomment when packages are added
    /*
    RemoteMessage msg = message as RemoteMessage;
    
    String channelId = _getChannelIdForType(msg.data['type'] ?? 'general');
    
    AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      channelId,
      _getChannelName(channelId),
      channelDescription: _getChannelDescription(channelId),
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      ticker: msg.notification?.title,
      styleInformation: BigTextStyleInformation(
        msg.notification?.body ?? '',
        contentTitle: msg.notification?.title,
      ),
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications!.show(
      msg.hashCode,
      msg.notification?.title,
      msg.notification?.body,
      details,
      payload: msg.data.toString(),
    );
    */
  }

  /// Get notification channel ID based on notification type
  String _getChannelIdForType(String type) {
    switch (type) {
      case 'offer':
        return 'gym_wale_offers';
      case 'membership_expiry':
      case 'membership':
        return 'gym_wale_membership';
      case 'trial_booking':
      case 'trial':
        return 'gym_wale_trials';
      case 'ticket_update':
      case 'ticket_reply':
      case 'ticket_resolved':
      case 'urgent':
        return 'gym_wale_high_importance';
      default:
        return 'gym_wale_notifications';
    }
  }

  /// Get channel name
  String _getChannelName(String channelId) {
    switch (channelId) {
      case 'gym_wale_offers':
        return 'Offers & Promotions';
      case 'gym_wale_membership':
        return 'Membership Alerts';
      case 'gym_wale_trials':
        return 'Trial Bookings';
      case 'gym_wale_high_importance':
        return 'High Importance Notifications';
      default:
        return 'General Notifications';
    }
  }

  /// Get channel description
  String _getChannelDescription(String channelId) {
    switch (channelId) {
      case 'gym_wale_offers':
        return 'Notifications for special offers and promotions';
      case 'gym_wale_membership':
        return 'Notifications for membership expiry and renewals';
      case 'gym_wale_trials':
        return 'Notifications for trial booking confirmations';
      case 'gym_wale_high_importance':
        return 'Important notifications that require immediate attention';
      default:
        return 'General gym notifications';
    }
  }

  /// Handle notification tap
  void _handleNotificationTap(dynamic message) {
    // TODO: Implement navigation based on notification data
    /*
    RemoteMessage msg = message as RemoteMessage;
    print('Notification tapped: ${msg.data}');
    
    // Navigate to appropriate screen based on notification type
    String? type = msg.data['type'];
    String? targetScreen = msg.data['screen'];
    
    if (targetScreen != null) {
      // Navigate to specific screen
      // navigatorKey.currentState?.pushNamed(targetScreen);
    }
    */
  }

  /// Handle local notification tap
  void _handleLocalNotificationTap(String payload) {
    print('Local notification tapped: $payload');
    // Parse payload and navigate
  }

  /// Save FCM token
  Future<void> _saveFcmToken(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', token);
      print('FCM token saved locally');
    } catch (e) {
      print('Error saving FCM token: $e');
    }
  }

  /// Subscribe to topic
  Future<void> subscribeToTopic(String topic) async {
    try {
      // TODO: Uncomment when firebase_messaging is added
      // await _messaging?.subscribeToTopic(topic);
      print('Subscribed to topic: $topic (stub)');
    } catch (e) {
      print('Error subscribing to topic: $e');
    }
  }

  /// Unsubscribe from topic
  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      // TODO: Uncomment when firebase_messaging is added
      // await _messaging?.unsubscribeFromTopic(topic);
      print('Unsubscribed from topic: $topic (stub)');
    } catch (e) {
      print('Error unsubscribing from topic: $e');
    }
  }

  /// Delete FCM token (for logout)
  Future<void> deleteToken() async {
    try {
      // TODO: Uncomment when firebase_messaging is added
      // await _messaging?.deleteToken();
      _fcmToken = null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('fcm_token');
      print('FCM token deleted');
    } catch (e) {
      print('Error deleting FCM token: $e');
    }
  }
}

/// Background message handler
/// Must be a top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(dynamic message) async {
  // TODO: Uncomment when firebase packages are added
  /*
  await Firebase.initializeApp();
  RemoteMessage msg = message as RemoteMessage;
  print('Background message received: ${msg.notification?.title}');
  */
}

/// CUSTOM NOTIFICATION SOUNDS SETUP:
/// 
/// Android:
/// 1. Create folder: android/app/src/main/res/raw/
/// 2. Add your sound files (.mp3 or .wav):
///    - notification_high.mp3
///    - notification_offer.mp3
///    - notification_alert.mp3
///    - notification_success.mp3
/// 3. Sound files must be lowercase, no spaces
/// 
/// iOS:
/// 1. Add sound files to ios/Runner/Resources/
/// 2. Open project in Xcode
/// 3. Drag sound files into project navigator
/// 4. Check "Copy items if needed" and add to Runner target
/// 5. Sound files can be .aiff, .wav, or .caf format
/// 
/// You can find free notification sounds at:
/// - https://notificationsounds.com/
/// - https://freesound.org/
