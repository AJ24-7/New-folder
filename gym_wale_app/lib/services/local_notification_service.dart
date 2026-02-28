import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// ────────────────────────────────────────────────────────────────────────────
/// LocalNotificationService
///
/// Device-level local notifications for all geofence + attendance events:
///   • Gym entry detected        → informs user that 5-min dwell check starts
///   • Attendance auto-marked    → success pop-up with check-in time
///   • Geofence exit recorded    → workout duration summary
///   • Background location warning (if permission missing)
///
/// Works on Android (API 21+) and iOS (13+). Web is silently skipped.
/// ────────────────────────────────────────────────────────────────────────────
class LocalNotificationService {
  // ── Singleton ──────────────────────────────────────────────────────────────
  static LocalNotificationService? _instance;
  static LocalNotificationService get instance {
    _instance ??= LocalNotificationService._();
    return _instance!;
  }
  LocalNotificationService._();

  // ── Core plugin ────────────────────────────────────────────────────────────
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  // ── Notification IDs ───────────────────────────────────────────────────────
  static const int _idGeofenceEnter   = 2001;
  static const int _idAttendanceEntry = 2002;
  static const int _idAttendanceExit  = 2003;
  static const int _idGeneral         = 2000;
  static const int _idLocationWarning = 2010;

  // ── Android channel IDs ────────────────────────────────────────────────────
  static const String _channelAttendanceId    = 'gym_wale_attendance';
  static const String _channelAttendanceName  = 'Attendance Notifications';
  static const String _channelForegroundId    = 'gym_wale_geofence_service';
  static const String _channelForegroundName  = 'Geofence Background Service';

  // ────────────────────────────────────────────────────────────────────────────
  // INITIALIZE
  // ────────────────────────────────────────────────────────────────────────────

  /// Call once from `main()` before runApp, or from the root widget initState.
  Future<void> initialize() async {
    if (_initialized) return;
    if (kIsWeb) {
      debugPrint('[LOCAL_NOTIF] Web – skipping local notifications.');
      return;
    }
    try {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS:     darwinSettings,
        macOS:   darwinSettings,
      );

      await _plugin.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onTap,
        onDidReceiveBackgroundNotificationResponse: _onBackgroundTap,
      );

      await _createAndroidChannels();
      _initialized = true;
      debugPrint('[LOCAL_NOTIF] Initialized.');
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] Init error: $e');
    }
  }

  Future<void> _createAndroidChannels() async {
    if (!Platform.isAndroid) return;
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return;
    await android.createNotificationChannel(const AndroidNotificationChannel(
      _channelAttendanceId,
      _channelAttendanceName,
      description: 'Automatic attendance marking notifications',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
      showBadge: true,
    ));
    await android.createNotificationChannel(const AndroidNotificationChannel(
      _channelForegroundId,
      _channelForegroundName,
      description: 'Keeps geofence tracking running in the background',
      importance: Importance.low,
      playSound: false,
      enableVibration: false,
      showBadge: false,
    ));
    debugPrint('[LOCAL_NOTIF] Android channels created.');
  }

  static void _onTap(NotificationResponse r) =>
      debugPrint('[LOCAL_NOTIF] Tapped: ${r.payload}');

  @pragma('vm:entry-point')
  static void _onBackgroundTap(NotificationResponse r) =>
      debugPrint('[LOCAL_NOTIF] Background tap: ${r.payload}');

  // ────────────────────────────────────────────────────────────────────────────
  // PERMISSION REQUEST
  // ────────────────────────────────────────────────────────────────────────────

  Future<bool> requestPermission() async {
    if (kIsWeb) return false;
    try {
      if (Platform.isIOS) {
        final granted = await _plugin
            .resolvePlatformSpecificImplementation<
                IOSFlutterLocalNotificationsPlugin>()
            ?.requestPermissions(alert: true, badge: true, sound: true);
        return granted ?? false;
      }
      if (Platform.isAndroid) {
        final granted = await _plugin
            .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin>()
            ?.requestNotificationsPermission();
        return granted ?? false;
      }
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] requestPermission error: $e');
    }
    return true;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PUBLIC NOTIFICATION METHODS
  // ────────────────────────────────────────────────────────────────────────────

  /// Shown immediately when user enters the geofence.
  /// Tells the user that a 5-minute dwell check has started.
  Future<void> showGeofenceEnteredNotification({required String gymName}) async {
    await _show(
      id: _idGeofenceEnter,
      title: '📍 Gym Detected – $gymName',
      body:
          'You\'re near $gymName. Stay for 5 minutes to auto-mark your attendance.',
      payload: 'geofence_enter',
    );
  }

  /// Shown when the 5-minute dwell completes and attendance is auto-marked.
  Future<void> showAttendanceEntryNotification({
    required String gymName,
    required String time,
    int? sessionsRemaining,
  }) async {
    final body = (sessionsRemaining != null && sessionsRemaining > 0)
        ? 'Welcome to $gymName! ✅ Checked in at $time. Sessions left: $sessionsRemaining'
        : 'Welcome to $gymName! ✅ Attendance marked at $time.';
    await _show(
      id: _idAttendanceEntry,
      title: '✅ Attendance Marked',
      body: body,
      payload: 'attendance_entry',
    );
  }

  /// Shown when the user exits the geofence.
  Future<void> showAttendanceExitNotification({
    required String gymName,
    required String time,
    required int durationMinutes,
  }) async {
    await _show(
      id: _idAttendanceExit,
      title: '👋 Gym Exit Recorded',
      body:
          'Checked out from $gymName at $time. Duration: ${_fmt(durationMinutes)}. Great session! 💪',
      payload: 'attendance_exit',
    );
  }

  /// Generic attendance notification (API-driven message).
  Future<void> showAttendanceNotification({
    required String title,
    required String message,
  }) async {
    await _show(
        id: _idGeneral, title: title, body: message, payload: 'attendance_general');
  }

  /// Warning when background location permission is missing.
  Future<void> showLocationPermissionWarning() async {
    await _show(
      id: _idLocationWarning,
      title: '⚠️ Background Location Required',
      body:
          'Enable "Always" location permission so Gym Wale can auto-mark your gym attendance.',
      payload: 'location_warning',
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CANCEL
  // ────────────────────────────────────────────────────────────────────────────

  Future<void> cancelNotification(int id) async {
    try {
      await _plugin.cancel(id);
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] cancelNotification error: $e');
    }
  }

  Future<void> cancelAllNotifications() async {
    try {
      await _plugin.cancelAll();
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] cancelAll error: $e');
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  Future<void> _show({
    required int id,
    required String title,
    required String body,
    String? payload,
    bool ongoing = false,
  }) async {
    if (!_initialized) {
      debugPrint('[LOCAL_NOTIF] Not initialized – skipping "$title"');
      return;
    }
    if (kIsWeb) return;
    try {
      final androidDetails = AndroidNotificationDetails(
        _channelAttendanceId,
        _channelAttendanceName,
        channelDescription: 'Automatic attendance marking notifications',
        importance: Importance.high,
        priority: Priority.high,
        ongoing: ongoing,
        autoCancel: !ongoing,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
        styleInformation: BigTextStyleInformation(body),
      );
      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );
      await _plugin.show(
        id, title, body,
        NotificationDetails(android: androidDetails, iOS: iosDetails),
        payload: payload,
      );
      debugPrint('[LOCAL_NOTIF] Shown: "$title"');
    } catch (e) {
      debugPrint('[LOCAL_NOTIF] _show error: $e');
    }
  }

  String _fmt(int minutes) {
    if (minutes < 60) return '$minutes min';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m > 0 ? '${h}h ${m}min' : '${h}h';
  }
}
