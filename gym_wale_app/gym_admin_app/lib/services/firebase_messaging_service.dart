// lib/services/firebase_messaging_service.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'storage_service.dart';

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('🔔 [FCM] Background message received: ${message.messageId}');
  debugPrint('🔔 [FCM] Title: ${message.notification?.title}');
  debugPrint('🔔 [FCM] Body: ${message.notification?.body}');
  debugPrint('🔔 [FCM] Data: ${message.data}');
  
  // Store notification for later display
  await _storeBackgroundNotification(message);
}

Future<void> _storeBackgroundNotification(RemoteMessage message) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final notifications = prefs.getStringList('background_notifications') ?? [];
    
    final notifData = jsonEncode({
      'messageId': message.messageId,
      'title': message.notification?.title,
      'body': message.notification?.body,
      'data': message.data,
      'timestamp': DateTime.now().toIso8601String(),
    });
    
    notifications.add(notifData);
    await prefs.setStringList('background_notifications', notifications);
  } catch (e) {
    debugPrint('🔔 [FCM] Error storing background notification: $e');
  }
}

class FirebaseMessagingService {
  static final FirebaseMessagingService _instance = FirebaseMessagingService._internal();
  factory FirebaseMessagingService() => _instance;
  FirebaseMessagingService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final StorageService _storage = StorageService();
  
  bool _initialized = false;
  String? _fcmToken;
  
  // Stream controllers for notification events
  final StreamController<RemoteMessage> _messageStreamController = StreamController<RemoteMessage>.broadcast();
  final StreamController<String> _tokenRefreshController = StreamController<String>.broadcast();
  
  Stream<RemoteMessage> get onMessage => _messageStreamController.stream;
  Stream<String> get onTokenRefresh => _tokenRefreshController.stream;
  
  String? get fcmToken => _fcmToken;

  /// Initialize Firebase Messaging and Local Notifications
  Future<void> initialize() async {
    if (_initialized) {
      debugPrint('🔔 [FCM] Already initialized');
      return;
    }

    try {
      debugPrint('🔔 [FCM] Initializing Firebase Messaging Service...');
      
      // Initialize local notifications first
      await _initializeLocalNotifications();
      
      // Request notification permissions
      await _requestPermissions();
      
      // Get FCM token
      await _getFCMToken();
      
      // Configure message handlers
      _configureMessageHandlers();
      
      // Listen to token refresh
      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        debugPrint('🔔 [FCM] Token refreshed: $newToken');
        _fcmToken = newToken;
        _tokenRefreshController.add(newToken);
        _saveFCMToken(newToken);
      });
      
      _initialized = true;
      debugPrint('✅ [FCM] Firebase Messaging Service initialized successfully');
    } catch (e) {
      debugPrint('❌ [FCM] Error initializing: $e');
      rethrow;
    }
  }

  /// Initialize local notifications plugin
  Future<void> _initializeLocalNotifications() async {
    try {
      // Android initialization settings
      const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      
      // iOS initialization settings
      const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
        requestCriticalPermission: false,
      );
      
      const InitializationSettings initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );
      
      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );
      
      // Create notification channels for Android
      if (defaultTargetPlatform == TargetPlatform.android) {
        await _createAndroidNotificationChannels();
      }
      
      debugPrint('✅ [FCM] Local notifications initialized');
    } catch (e) {
      debugPrint('❌ [FCM] Error initializing local notifications: $e');
    }
  }

  /// Create Android notification channels
  Future<void> _createAndroidNotificationChannels() async {
    try {
      // High priority channel
      const AndroidNotificationChannel highPriorityChannel = AndroidNotificationChannel(
        'high_priority_channel',
        'High Priority Notifications',
        description: 'Channel for high priority notifications',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      );
      
      // Default channel
      const AndroidNotificationChannel defaultChannel = AndroidNotificationChannel(
        'default_channel',
        'General Notifications',
        description: 'Channel for general notifications',
        importance: Importance.defaultImportance,
        playSound: true,
      );
      
      // Member activity channel
      const AndroidNotificationChannel memberChannel = AndroidNotificationChannel(
        'member_activity_channel',
        'Member Activity',
        description: 'Notifications about member check-ins, payments, renewals',
        importance: Importance.high,
        playSound: true,
      );
      
      // System alerts channel
      const AndroidNotificationChannel systemChannel = AndroidNotificationChannel(
        'system_alerts_channel',
        'System Alerts',
        description: 'Important system notifications and alerts',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );
      
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(highPriorityChannel);
          
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(defaultChannel);
          
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(memberChannel);
          
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(systemChannel);
      
      debugPrint('✅ [FCM] Android notification channels created');
    } catch (e) {
      debugPrint('❌ [FCM] Error creating notification channels: $e');
    }
  }

  /// Request notification permissions
  Future<NotificationSettings> _requestPermissions() async {
    try {
      final settings = await _firebaseMessaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
      
      debugPrint('🔔 [FCM] Permission status: ${settings.authorizationStatus}');
      return settings;
    } catch (e) {
      debugPrint('❌ [FCM] Error requesting permissions: $e');
      rethrow;
    }
  }

  /// Get FCM token
  Future<String?> _getFCMToken() async {
    try {
      _fcmToken = await _firebaseMessaging.getToken();
      debugPrint('🔔 [FCM] Token obtained: $_fcmToken');
      
      if (_fcmToken != null) {
        await _saveFCMToken(_fcmToken!);
      }
      
      return _fcmToken;
    } catch (e) {
      debugPrint('❌ [FCM] Error getting token: $e');
      return null;
    }
  }

  /// Save FCM token to storage
  Future<void> _saveFCMToken(String token) async {
    try {
      await _storage.saveFCMToken(token);
      debugPrint('✅ [FCM] Token saved to storage');
    } catch (e) {
      debugPrint('❌ [FCM] Error saving token: $e');
    }
  }

  /// Configure message handlers
  void _configureMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('🔔 [FCM] Foreground message received');
      debugPrint('🔔 [FCM] Title: ${message.notification?.title}');
      debugPrint('🔔 [FCM] Body: ${message.notification?.body}');
      debugPrint('🔔 [FCM] Data: ${message.data}');
      
      // Show local notification when app is in foreground
      _showLocalNotification(message);
      
      // Emit to stream for app to handle
      _messageStreamController.add(message);
    });
    
    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('🔔 [FCM] Notification tapped (app in background)');
      debugPrint('🔔 [FCM] Data: ${message.data}');
      
      // Handle notification tap
      _handleNotificationTap(message.data);
    });
    
    // Handle initial message (app opened from terminated state)
    _firebaseMessaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        debugPrint('🔔 [FCM] App opened from notification (terminated state)');
        debugPrint('🔔 [FCM] Data: ${message.data}');
        
        // Handle notification tap
        _handleNotificationTap(message.data);
      }
    });
  }

  /// Show local notification for foreground messages
  Future<void> _showLocalNotification(RemoteMessage message) async {
    try {
      final notification = message.notification;
      if (notification == null) return;
      
      // Determine channel based on notification data
      String channelId = _getChannelId(message.data);
      
      final androidDetails = AndroidNotificationDetails(
        channelId,
        _getChannelName(channelId),
        channelDescription: _getChannelDescription(channelId),
        importance: _getImportance(message.data),
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
      );
      
      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );
      
      final notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );
      
      await _localNotifications.show(
        message.hashCode,
        notification.title,
        notification.body,
        notificationDetails,
        payload: jsonEncode(message.data),
      );
      
      debugPrint('✅ [FCM] Local notification shown');
    } catch (e) {
      debugPrint('❌ [FCM] Error showing local notification: $e');
    }
  }

  /// Get channel ID based on message data
  String _getChannelId(Map<String, dynamic> data) {
    final type = data['type'] ?? '';
    final priority = data['priority'] ?? '';
    
    if (priority == 'high' || priority == 'urgent') {
      return 'high_priority_channel';
    }
    
    switch (type) {
      case 'check-in':
      case 'payment':
      case 'renewal':
      case 'member-activity':
        return 'member_activity_channel';
      case 'alert':
      case 'warning':
      case 'system':
        return 'system_alerts_channel';
      default:
        return 'default_channel';
    }
  }

  /// Get channel name
  String _getChannelName(String channelId) {
    switch (channelId) {
      case 'high_priority_channel':
        return 'High Priority Notifications';
      case 'member_activity_channel':
        return 'Member Activity';
      case 'system_alerts_channel':
        return 'System Alerts';
      default:
        return 'General Notifications';
    }
  }

  /// Get channel description
  String _getChannelDescription(String channelId) {
    switch (channelId) {
      case 'high_priority_channel':
        return 'Channel for high priority notifications';
      case 'member_activity_channel':
        return 'Notifications about member check-ins, payments, renewals';
      case 'system_alerts_channel':
        return 'Important system notifications and alerts';
      default:
        return 'Channel for general notifications';
    }
  }

  /// Get importance level
  Importance _getImportance(Map<String, dynamic> data) {
    final priority = data['priority'] ?? '';
    
    switch (priority) {
      case 'high':
      case 'urgent':
        return Importance.high;
      case 'low':
        return Importance.low;
      default:
        return Importance.defaultImportance;
    }
  }

  /// Handle notification tap
  void _handleNotificationTap(Map<String, dynamic> data) {
    debugPrint('🔔 [FCM] Handling notification tap: $data');
    
    // TODO: Navigate to appropriate screen based on notification type
    // This can be handled by the app through the onMessage stream
    _messageStreamController.add(
      RemoteMessage(
        data: data,
        messageId: DateTime.now().millisecondsSinceEpoch.toString(),
      ),
    );
  }

  /// Handle notification response (local notification tap)
  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('🔔 [FCM] Local notification tapped');
    
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!) as Map<String, dynamic>;
        _handleNotificationTap(data);
      } catch (e) {
        debugPrint('❌ [FCM] Error parsing notification payload: $e');
      }
    }
  }

  /// Subscribe to topic
  Future<void> subscribeToTopic(String topic) async {
    try {
      await _firebaseMessaging.subscribeToTopic(topic);
      debugPrint('✅ [FCM] Subscribed to topic: $topic');
    } catch (e) {
      debugPrint('❌ [FCM] Error subscribing to topic: $e');
    }
  }

  /// Unsubscribe from topic
  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _firebaseMessaging.unsubscribeFromTopic(topic);
      debugPrint('✅ [FCM] Unsubscribed from topic: $topic');
    } catch (e) {
      debugPrint('❌ [FCM] Error unsubscribing from topic: $e');
    }
  }

  /// Get notification settings
  Future<NotificationSettings> getNotificationSettings() async {
    return await _firebaseMessaging.getNotificationSettings();
  }

  /// Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    final settings = await getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
           settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// Request permissions again (for settings)
  Future<bool> requestPermissions() async {
    final settings = await _requestPermissions();
    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }

  /// Dispose resources
  void dispose() {
    _messageStreamController.close();
    _tokenRefreshController.close();
  }
}
