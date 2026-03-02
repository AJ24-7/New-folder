// lib/services/foreground_task_service.dart
//
// Keeps geofence-based auto-attendance running even when the app is
// force-killed from the task switcher.
//
// Architecture:
//   • flutter_foreground_task creates a persistent Android foreground service
//     (with a user-visible notification) that survives app force-kill.
//   • Inside that service, Flutter starts a Dart isolate whose entry-point is
//     startCallback() below.
//   • _GeofenceTaskHandler polls GPS every ~30 s, tracks ENTER / DWELL / EXIT
//     transitions, and calls the backend REST API directly with HTTP.
//
// Tested on Android 10-14.  iOS background location is handled by the OS
// significant-change API (handled separately by geofence_service).

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT — called in the background isolate (killed-app scenario).
// Must be a top-level function annotated @pragma('vm:entry-point').
// ─────────────────────────────────────────────────────────────────────────────
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(_GeofenceTaskHandler());
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK HANDLER — all geofence logic executed in the background isolate
// ─────────────────────────────────────────────────────────────────────────────
class _GeofenceTaskHandler extends TaskHandler {
  // ─── state ─────────────────────────────────────────────────────────────────
  bool _wasInsideGeofence = false;
  DateTime? _enterTime;
  bool _entryMarkedToday = false;
  String? _lastMarkedDateKey; // 'yyyy-MM-dd'

  static const int _kBackendOk        = 0; // success — stop trying
  static const int _kBackendSoftFail  = 1; // transient error — retry later
  static const int _kBackendHardBlock = 2; // permanent block — stop today

  /// GPS jitter protection: require this many consecutive outside-boundary
  /// readings before we consider the user to have truly exited the geofence.
  /// At a 30-second poll interval this means ~60 s outside before EXIT fires.
  static const int _exitGraceTicks = 2;
  int _consecutiveOutsideCount = 0;

  /// Incremental attempt counter for the DWELL mark — resets on success.
  int _dwellMarkAttempts = 0;
  static const int _maxDwellMarkAttempts = 5;

  // Local notification plugin for the background isolate
  final FlutterLocalNotificationsPlugin _notifPlugin =
      FlutterLocalNotificationsPlugin();
  bool _notifInitialized = false;

  // ─── notification bootstrap ─────────────────────────────────────────────────
  Future<void> _ensureNotifInit() async {
    if (_notifInitialized) return;
    try {
      const android = AndroidInitializationSettings('@mipmap/ic_launcher');
      await _notifPlugin.initialize(
        const InitializationSettings(android: android),
      );
      _notifInitialized = true;
    } catch (e) {
      debugPrint('[BGTask] notif-init error: $e');
    }
  }

  Future<void> _showLocalNotif({
    required int id,
    required String title,
    required String body,
    Importance importance = Importance.high,
  }) async {
    await _ensureNotifInit();
    try {
      await _notifPlugin.show(
        id,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'gym_wale_attendance',
            'Attendance Notifications',
            channelDescription: 'Automatic gym attendance notifications',
            importance: importance,
            priority: Priority.high,
          ),
        ),
      );
    } catch (e) {
      debugPrint('[BGTask] show-notif error: $e');
    }
  }

  // ─── TaskHandler lifecycle ──────────────────────────────────────────────────

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    debugPrint('[BGTask] onStart — starter: $starter');
    await _ensureNotifInit();
    await _loadDailyState();
  }

  @override
  Future<void> onRepeatEvent(DateTime timestamp) async {
    await _tick();
  }

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    debugPrint('[BGTask] onDestroy');
  }

  /// Receives data sent from the main isolate via
  /// [FlutterForegroundTask.sendDataToTask].
  @override
  void onReceiveData(Object data) {
    debugPrint('[BGTask] onReceiveData: $data');
    // Params are also stored in SharedPreferences; no extra action required.
  }

  // ─── core polling tick ─────────────────────────────────────────────────────
  Future<void> _tick() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Read geofence config saved by GeofencingService
      final gymId     = prefs.getString('geofence_gym_id');
      final gymLat    = prefs.getDouble('geofence_latitude');
      final gymLon    = prefs.getDouble('geofence_longitude');
      final gymRadius = prefs.getDouble('geofence_radius');

      if (gymId == null || gymLat == null || gymLon == null || gymRadius == null) {
        // No geofence configured — don't poll
        return;
      }

      // Read polygon support fields
      final geofenceType = prefs.getString('geofence_type') ?? 'circular';
      final polygonEncoded = prefs.getString('geofence_polygon_coordinates') ?? '';

      // ── daily reset ──────────────────────────────────────────────────────
      final today = _todayStr();
      if (_lastMarkedDateKey != today) {
        _entryMarkedToday = false;
        _lastMarkedDateKey = today;
        await prefs.remove('bg_task_entry_marked');
        debugPrint('[BGTask] Daily state reset for $today');
      }

      // ── get current GPS position ─────────────────────────────────────────
      Position position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        ).timeout(const Duration(seconds: 15));
      } catch (e) {
        debugPrint('[BGTask] Location timeout: $e');
        return;
      }

      // ── containment check: polygon OR circular ───────────────────────────
      bool isInside;
      if (geofenceType == 'polygon' && polygonEncoded.isNotEmpty) {
        final polygon = _parsePolygon(polygonEncoded);
        if (polygon.length >= 3) {
          isInside = _isInsidePolygon(position.latitude, position.longitude, polygon);
        } else {
          // Fallback to circular if polygon is malformed
          final distance = Geolocator.distanceBetween(
            position.latitude, position.longitude, gymLat, gymLon);
          isInside = distance <= gymRadius;
        }
      } else {
        final distance = Geolocator.distanceBetween(
          position.latitude, position.longitude, gymLat, gymLon);
        isInside = distance <= gymRadius;
      }

      // Keep a human-readable distance for debug messages (circular only)
      final distance = Geolocator.distanceBetween(
          position.latitude, position.longitude, gymLat, gymLon);

      debugPrint(
        '[BGTask] tick — dist~${distance.toStringAsFixed(0)} m '
        'type=$geofenceType inside=$isInside was=$_wasInsideGeofence entryMarked=$_entryMarkedToday',
      );

      // ── state machine ────────────────────────────────────────────────────
      if (isInside && !_wasInsideGeofence) {
        // ── ENTER ──────────────────────────────────────────────────────────
        // Reset jitter counter — user is genuinely inside now.
        _consecutiveOutsideCount = 0;

        // Check operating hours and active days before triggering anything
        final withinPeriod = await _isWithinActivePeriod(prefs);
        if (!withinPeriod) {
          debugPrint('[BGTask] ENTER ignored — outside operating hours or non-working day');
          return;
        }

        _wasInsideGeofence = true;
        _enterTime = DateTime.now();
        _dwellMarkAttempts = 0;
        await _saveDailyState(); // Persist timer so service-restart restores it
        debugPrint('[BGTask] ENTER — 5-min dwell timer started at $_enterTime');

        _updateFgNotif(
          title: '🏋️ Gym Detected',
          text: 'Stay 5 min to auto-mark attendance.',
        );
        await _showLocalNotif(
          id: 3001,
          title: '🏋️ Gym Detected',
          body: 'Remain inside for 5 minutes to automatically mark your attendance.',
          importance: Importance.defaultImportance,
        );

      } else if (!isInside && _wasInsideGeofence) {
        // ── EXIT (with GPS jitter protection) ──────────────────────────────
        // Require _exitGraceTicks consecutive outside-boundary readings before
        // treating this as a real EXIT. This prevents the 5-min timer from
        // resetting due to momentary GPS drift while the user is still inside.
        _consecutiveOutsideCount++;
        debugPrint('[BGTask] Outside reading ${_consecutiveOutsideCount}/$_exitGraceTicks (grace-period check)');
        if (_consecutiveOutsideCount < _exitGraceTicks) {
          // Not confirmed yet — keep current state, show countdown if applicable
          if (_enterTime != null && !_entryMarkedToday) {
            final elapsed = DateTime.now().difference(_enterTime!);
            final remainSec = 300 - elapsed.inSeconds;
            if (remainSec > 0) {
              _updateFgNotif(
                title: '🏋️ Inside Gym',
                text: remainSec > 60
                    ? 'Auto-attendance in ~${(remainSec / 60).ceil()} min…'
                    : 'Auto-attendance in ~${remainSec}s…',
              );
            }
          }
          return;
        }

        // EXIT confirmed
        _consecutiveOutsideCount = 0;
        _wasInsideGeofence = false;
        debugPrint('[BGTask] EXIT confirmed after grace period');

        _updateFgNotif(
          title: '📍 Gym Attendance Tracking',
          text: 'Monitoring your location…',
        );

        final autoMarkExit = prefs.getBool('geofence_auto_mark_exit') ?? true;
        if (autoMarkExit && _entryMarkedToday) {
          final result = await _callBackend(
            prefs: prefs,
            gymId: gymId,
            position: position,
            isEntry: false,
          );
          if (result == _kBackendOk) {
            await _showLocalNotif(
              id: 3003,
              title: '✅ Gym Exit Recorded',
              body: 'Your gym session has been saved. See you next time!',
            );
          }
        }
        _enterTime = null;
        _dwellMarkAttempts = 0;
        await _saveDailyState();

      } else if (isInside && _wasInsideGeofence && !_entryMarkedToday) {
        // ── DWELL check ────────────────────────────────────────────────────
        // Reset jitter counter — user is confirmed inside.
        _consecutiveOutsideCount = 0;

        if (_enterTime != null) {
          final elapsed = DateTime.now().difference(_enterTime!);
          // Use seconds precision to avoid the minute-truncation leading to
          // a 59-second window where 1-min-remaining is shown but never fires.
          if (elapsed.inSeconds >= 300) {
            // Re-check operating hours at dwell time before marking.
            // IMPORTANT: do NOT reset _wasInsideGeofence / _enterTime when
            // outside hours — just skip this tick so marking happens as soon
            // as operating hours start instead of restarting the 5-min timer.
            final withinPeriod = await _isWithinActivePeriod(prefs);
            if (!withinPeriod) {
              debugPrint('[BGTask] DWELL skipped — outside operating hours (timer kept, will mark when hours start)');
              _updateFgNotif(
                title: '🏋️ Inside Gym',
                text: 'Attendance will mark when gym opens.',
              );
              return;
            }

            debugPrint('[BGTask] DWELL reached (${elapsed.inSeconds}s elapsed) — marking entry');
            final autoMarkEntry =
                prefs.getBool('geofence_auto_mark_entry') ?? true;
            if (autoMarkEntry) {
              _dwellMarkAttempts++;
              final result = await _callBackend(
                prefs: prefs,
                gymId: gymId,
                position: position,
                isEntry: true,
              );
              if (result == _kBackendOk) {
                _entryMarkedToday = true;
                _dwellMarkAttempts = 0;
                await _saveDailyState();

                _updateFgNotif(
                  title: '✅ Attendance Marked',
                  text: 'Check-in: ${_fmtTime(DateTime.now())}',
                );
                await _showLocalNotif(
                  id: 3002,
                  title: '✅ Attendance Marked!',
                  body:
                      'Auto check-in at ${_fmtTime(DateTime.now())} — enjoy your workout! 💪',
                );
              } else if (result == _kBackendHardBlock) {
                // Permanent error (no membership, geofence disabled, mock
                // location fraud). Mark as done for today so the task stops
                // cycling and burning battery.
                debugPrint('[BGTask] Hard-block from backend — stopping for today');
                _entryMarkedToday = true;
                _dwellMarkAttempts = 0;
                await _saveDailyState();
                _updateFgNotif(
                  title: '⚠️ Attendance Blocked',
                  text: 'Check membership or gym settings.',
                );
              } else if (_dwellMarkAttempts < _maxDwellMarkAttempts) {
                // Soft transient failure (GPS, network, operating-hours edge).
                // Retry on next tick without the aggressive backoff that was
                // causing the "stuck 30 s / 2 s" notification loop.
                debugPrint('[BGTask] Soft-fail (attempt $_dwellMarkAttempts/$_maxDwellMarkAttempts) — will retry next tick');
              } else {
                // Max soft retries exceeded — back off 60 s (2 ticks) to give
                // GPS / network time to recover without hammering the backend.
                debugPrint('[BGTask] Max retries reached — backing off 60 s');
                _dwellMarkAttempts = 0;
                _enterTime = DateTime.now().subtract(const Duration(seconds: 240));
                await _saveDailyState();
              }
            }
          } else {
            // Show precise countdown in the persistent notification
            final remainSec = 300 - elapsed.inSeconds;
            _updateFgNotif(
              title: '🏋️ Inside Gym',
              text: remainSec > 60
                  ? 'Auto-attendance in ~${(remainSec / 60).ceil()} min…'
                  : 'Auto-attendance in ~${remainSec}s…',
            );
          }
        }
      } else if (isInside && _wasInsideGeofence && _entryMarkedToday) {
        // Already marked today — just keep the notification clean.
        _consecutiveOutsideCount = 0;
      }
    } catch (e) {
      debugPrint('[BGTask] tick error: $e');
    }
  }

  // ─── backend call (raw HTTP, no Flutter Provider) ───────────────────────────
  //
  // Returns one of the _kBackend* constants:
  //   _kBackendOk        (0) → request succeeded; mark attendance as done.
  //   _kBackendSoftFail  (1) → transient failure (GPS, network, operating hours
  //                            boundary); worth retrying.
  //   _kBackendHardBlock (2) → permanent server block (no membership, geofence
  //                            disabled, mock-location fraud); stop for today.
  Future<int> _callBackend({
    required SharedPreferences prefs,
    required String gymId,
    required Position position,
    required bool isEntry,
  }) async {
    try {
      final token   = prefs.getString('auth_token');
      final baseUrl = prefs.getString('api_base_url');

      if (token == null || baseUrl == null) {
        debugPrint('[BGTask] No auth token or base URL — cannot call backend');
        return _kBackendSoftFail;
      }

      final endpoint = isEntry
          ? '$baseUrl/api/geofence-attendance/auto-mark/entry'
          : '$baseUrl/api/geofence-attendance/auto-mark/exit';

      final resp = await http
          .post(
            Uri.parse(endpoint),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'gymId':         gymId,
              'latitude':      position.latitude,
              'longitude':     position.longitude,
              'accuracy':      position.accuracy,
              'isMockLocation': position.isMocked,
            }),
          )
          .timeout(const Duration(seconds: 30));

      if (resp.statusCode == 200 || resp.statusCode == 201) {
        debugPrint('[BGTask] ${isEntry ? "Entry" : "Exit"} backend call OK');

        // ── Notify the main isolate so AttendanceProvider refreshes the UI ──
        // If the app is open / in background (not killed), the main isolate
        // receives this data via FlutterForegroundTask.addTaskDataCallback.
        try {
          FlutterForegroundTask.sendDataToMain({
            'event': isEntry ? 'attendance_entry' : 'attendance_exit',
            'gymId': gymId,
            'timestamp': DateTime.now().toIso8601String(),
          });
        } catch (_) {}

        return _kBackendOk;
      }

      // ── Classify non-2xx responses ─────────────────────────────────────────
      debugPrint('[BGTask] Backend ${resp.statusCode}: ${resp.body}');
      try {
        final body = (jsonDecode(resp.body) as Map<String, dynamic>);
        final msg  = (body['message'] as String? ?? '').toLowerCase();
        // Hard-block: retrying will never help today.
        const hardBlocks = [
          'no active membership',
          'geofencing is disabled',
          'auto-mark entry is disabled',
          'auto-mark exit is disabled',
          'member not found',
          'mock locations are not allowed',
        ];
        if (hardBlocks.any(msg.contains)) {
          debugPrint('[BGTask] Hard-block: $msg');
          return _kBackendHardBlock;
        }
      } catch (_) {}

      // All other 4xx / 5xx → soft fail (distance check, GPS accuracy, etc.)
      return _kBackendSoftFail;
    } catch (e) {
      debugPrint('[BGTask] HTTP error: $e');
      return _kBackendSoftFail;
    }
  }

  // ─── operating hours / active-days guard ──────────────────────────────────

  /// Parses an "HH:mm" string → minutes since midnight.  Returns null on error.
  int? _hmm2min(String? s) {
    if (s == null) return null;
    final p = s.split(':');
    if (p.length < 2) return null;
    final h = int.tryParse(p[0]);
    final m = int.tryParse(p[1]);
    return (h != null && m != null) ? h * 60 + m : null;
  }

  /// Returns false if [now] is outside all configured operating shifts or is a
  /// non-working day.  Returns true when no restrictions are stored.
  Future<bool> _isWithinActivePeriod(SharedPreferences prefs) async {
    final now = DateTime.now();

    // ── Active days check ──────────────────────────────────────────────────
    final activeDaysRaw = prefs.getString('gym_active_days') ?? '';
    if (activeDaysRaw.isNotEmpty) {
      const dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      final today = dayNames[now.weekday - 1]; // weekday 1=Mon … 7=Sun
      final activeDays = activeDaysRaw.split(',');
      if (!activeDays.contains(today)) {
        debugPrint('[BGTask] Today ($today) is not in active days: $activeDays');
        return false;
      }
    }

    // ── Operating hours check ──────────────────────────────────────────────
    final nowMin = now.hour * 60 + now.minute;

    final morningOpen  = _hmm2min(prefs.getString('gym_morning_opening'));
    final morningClose = _hmm2min(prefs.getString('gym_morning_closing'));
    final eveningOpen  = _hmm2min(prefs.getString('gym_evening_opening'));
    final eveningClose = _hmm2min(prefs.getString('gym_evening_closing'));

    // If no shift times stored at all → no restriction
    if (morningOpen == null && eveningOpen == null) return true;

    final inMorning = (morningOpen != null && morningClose != null)
        ? (nowMin >= morningOpen && nowMin <= morningClose)
        : false;
    final inEvening = (eveningOpen != null && eveningClose != null)
        ? (nowMin >= eveningOpen && nowMin <= eveningClose)
        : false;

    if (!inMorning && !inEvening) {
      debugPrint('[BGTask] Current time ${now.hour}:${now.minute.toString().padLeft(2,'0')} is outside all operating shifts.');
      return false;
    }
    return true;
  }

  // ─── helpers ───────────────────────────────────────────────────────────────
  void _updateFgNotif({required String title, required String text}) {
    try {
      FlutterForegroundTask.updateService(
        notificationTitle: title,
        notificationText: text,
      );
    } catch (_) {}
  }

  String _todayStr() {
    final n = DateTime.now();
    return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
  }

  String _fmtTime(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  // ─── polygon containment helpers ───────────────────────────────────────────

  /// Parse a comma-separated "lat:lng,lat:lng,..." string into a list of maps.
  List<Map<String, double>> _parsePolygon(String encoded) {
    final result = <Map<String, double>>[];
    for (final pair in encoded.split(',')) {
      final parts = pair.trim().split(':');
      if (parts.length == 2) {
        final lat = double.tryParse(parts[0]);
        final lng = double.tryParse(parts[1]);
        if (lat != null && lng != null) {
          result.add({'lat': lat, 'lng': lng});
        }
      }
    }
    return result;
  }

  /// Ray-casting algorithm: returns true when [lat]/[lng] is inside [polygon].
  bool _isInsidePolygon(double lat, double lng, List<Map<String, double>> polygon) {
    bool inside = false;
    final n = polygon.length;
    for (int i = 0, j = n - 1; i < n; j = i++) {
      final xi = polygon[i]['lat']!;
      final yi = polygon[i]['lng']!;
      final xj = polygon[j]['lat']!;
      final yj = polygon[j]['lng']!;
      final intersect = ((yi > lng) != (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  Future<void> _loadDailyState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _lastMarkedDateKey = prefs.getString('bg_task_last_date');
      final today = _todayStr();
      if (_lastMarkedDateKey == today) {
        _entryMarkedToday = prefs.getBool('bg_task_entry_marked') ?? false;
        // ── Restore timer state so a service restart doesn't reset the 5-min
        //    dwell countdown (the root cause of the "stuck 1-min" bug).
        if (!_entryMarkedToday) {
          final wasInside = prefs.getBool('bg_task_was_inside') ?? false;
          final enterTimeStr = prefs.getString('bg_task_enter_time');
          if (wasInside && enterTimeStr != null) {
            final restored = DateTime.tryParse(enterTimeStr);
            if (restored != null) {
              _wasInsideGeofence = true;
              _enterTime = restored;
              debugPrint('[BGTask] Restored enter time from prefs: $restored');
            }
          }
        }
      } else {
        // New day — clear everything
        _entryMarkedToday = false;
        _lastMarkedDateKey = today;
        await prefs.remove('bg_task_was_inside');
        await prefs.remove('bg_task_enter_time');
      }
      debugPrint('[BGTask] Loaded daily state: marked=$_entryMarkedToday wasInside=$_wasInsideGeofence');
    } catch (_) {}
  }

  Future<void> _saveDailyState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('bg_task_last_date', _todayStr());
      await prefs.setBool('bg_task_entry_marked', _entryMarkedToday);
      // Persist the dwell timer so service-restart restores it
      if (_wasInsideGeofence && _enterTime != null && !_entryMarkedToday) {
        await prefs.setBool('bg_task_was_inside', true);
        await prefs.setString('bg_task_enter_time', _enterTime!.toIso8601String());
      } else {
        await prefs.remove('bg_task_was_inside');
        await prefs.remove('bg_task_enter_time');
      }
    } catch (_) {}
  }
}

// =============================================================================
// PUBLIC SERVICE — used by GeofencingService and main.dart
// =============================================================================

/// Manages the flutter_foreground_task persistent Android foreground service.
///
/// Call [init] once before `runApp`, then [startService] / [stopService] to
/// control the lifecycle together with [GeofencingService].
class ForegroundTaskService {
  static final ForegroundTaskService _instance =
      ForegroundTaskService._internal();
  factory ForegroundTaskService() => _instance;
  ForegroundTaskService._internal();

  bool _initialized = false;

  // ─── init ───────────────────────────────────────────────────────────────────

  /// Configure the foreground service.  Call once in main() before runApp().
  void init() {
    if (_initialized) return;

    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'gym_wale_geofence_bg',
        channelName: 'Geofence Background Service',
        channelDescription:
            'Keeps gym attendance geofencing active even when the app is closed.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        // Poll GPS every 30 seconds for ENTER / DWELL / EXIT detection
        eventAction: ForegroundTaskEventAction.repeat(30000),
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );

    _initialized = true;
    debugPrint('[FGTask] Initialized');
  }

  // ─── start / stop ───────────────────────────────────────────────────────────

  /// Start the persistent foreground service.
  /// Geofence params must already be stored in SharedPreferences before calling.
  Future<void> startService() async {
    if (!_initialized) init();

    if (await FlutterForegroundTask.isRunningService) {
      debugPrint('[FGTask] Already running — refreshing notification');
      await FlutterForegroundTask.updateService(
        notificationTitle: '📍 Gym Attendance Tracking',
        notificationText: 'Monitoring your location…',
      );
      return;
    }

    debugPrint('[FGTask] Starting foreground service');
    final result = await FlutterForegroundTask.startService(
      serviceId: 7001,
      notificationTitle: '📍 Gym Attendance Tracking',
      notificationText: 'Monitoring your location…',
      callback: startCallback,
    );
    debugPrint('[FGTask] startService result: $result');
  }

  /// Stop the foreground service.
  Future<void> stopService() async {
    debugPrint('[FGTask] Stopping foreground service');
    await FlutterForegroundTask.stopService();
  }

  /// Whether the foreground service is currently alive.
  Future<bool> get isRunning => FlutterForegroundTask.isRunningService;

  /// Persist the base URL so the killed-app isolate can reach the backend.
  /// Call after [ApiConfig.baseUrl] is known (e.g. after dotenv is loaded).
  static Future<void> persistApiBaseUrl(String baseUrlWithoutApiSuffix) async {
    final prefs = await SharedPreferences.getInstance();
    // Store without the trailing /api so the task can build its own paths.
    await prefs.setString('api_base_url', baseUrlWithoutApiSuffix);
  }

  /// Persist the auto-mark flags so the background isolate respects them.
  static Future<void> persistAutoMarkFlags({
    required bool autoMarkEntry,
    required bool autoMarkExit,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('geofence_auto_mark_entry', autoMarkEntry);
    await prefs.setBool('geofence_auto_mark_exit', autoMarkExit);
  }

  /// Persist gym operating hours and active days so the background isolate can
  /// gate notifications/attendance marking to the gym's working schedule.
  ///
  /// [morningOpening]/[morningClosing] and [eveningOpening]/[eveningClosing]
  /// must be in "HH:mm" format (e.g. "06:00", "12:00").
  /// [activeDays] is a list of lowercase day names
  /// (e.g. ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']).
  static Future<void> persistOperatingSchedule({
    String? morningOpening,
    String? morningClosing,
    String? eveningOpening,
    String? eveningClosing,
    List<String>? activeDays,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    if (morningOpening != null) {
      await prefs.setString('gym_morning_opening', morningOpening);
    } else {
      await prefs.remove('gym_morning_opening');
    }
    if (morningClosing != null) {
      await prefs.setString('gym_morning_closing', morningClosing);
    } else {
      await prefs.remove('gym_morning_closing');
    }
    if (eveningOpening != null) {
      await prefs.setString('gym_evening_opening', eveningOpening);
    } else {
      await prefs.remove('gym_evening_opening');
    }
    if (eveningClosing != null) {
      await prefs.setString('gym_evening_closing', eveningClosing);
    } else {
      await prefs.remove('gym_evening_closing');
    }
    if (activeDays != null && activeDays.isNotEmpty) {
      await prefs.setString('gym_active_days', activeDays.join(','));
    } else {
      await prefs.remove('gym_active_days');
    }
    debugPrint('[FGTask] Operating schedule persisted: '
        'morning=$morningOpening-$morningClosing '
        'evening=$eveningOpening-$eveningClosing '
        'activeDays=$activeDays');
  }
}
