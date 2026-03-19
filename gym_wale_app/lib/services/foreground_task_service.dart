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
  bool _exitMarkedToday = false;
  /// True only when entry was genuinely confirmed by the backend (200/201).
  /// Distinguishes real marks from hard-block "stop retrying" flags.
  bool _entryReallyMarked = false;
  String? _lastMarkedDateKey; // 'yyyy-MM-dd'

  /// Timestamp of the most recent confirmed EXIT, used for short-exit tolerance.
  /// If the user re-enters the geofence within [_shortExitToleranceSecs] seconds
  /// after a confirmed exit, we restore the original _enterTime instead of
  /// restarting the 5-minute dwell timer from zero.  This prevents GPS jitter
  /// at the boundary from indefinitely blocking auto-attendance marking.
  DateTime? _lastExitTime;
  /// Original enter-time saved across a short EXIT so we can restore it.
  DateTime? _savedEnterTimeAcrossExit;
  static const int _shortExitToleranceSecs = 180; // 3 minutes

  static const int _kBackendOk        = 0; // success — stop trying
  static const int _kBackendSoftFail  = 1; // transient error — retry later
  static const int _kBackendHardBlock = 2; // permanent block — stop today

  /// GPS jitter protection: require this many consecutive outside-boundary
  /// readings before we consider the user to have truly exited the geofence.
  /// At a 30-second poll interval this means ~300 s (5 min) outside before EXIT fires.
  static const int _exitGraceTicks = 10;
  int _consecutiveOutsideCount = 0;

  /// Incremental attempt counter for the DWELL mark — resets on success.
  int _dwellMarkAttempts = 0;
  static const int _maxDwellMarkAttempts = 3;

  /// Last backend error message — displayed in the notification for immediate
  /// diagnosis instead of silently retrying.
  String? _lastBackendErrorMsg;

  // ─── drawable notification icon constants ────────────────────────────────
  // Each metaDataName must match a <meta-data android:name="..."> entry in
  // AndroidManifest.xml that references the corresponding drawable resource.
  static const _iconLocation = NotificationIcon(metaDataName: 'com.gymwale.notif.ic_location');
  static const _iconDumbell  = NotificationIcon(metaDataName: 'com.gymwale.notif.ic_dumbell');
  static const _iconCheck    = NotificationIcon(metaDataName: 'com.gymwale.notif.ic_check');
  static const _iconGym      = NotificationIcon(metaDataName: 'com.gymwale.notif.ic_gym');

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
    String? icon,
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
            icon: icon,
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

      // ── CRITICAL: Refresh Dart-level cache from the native platform ──────
      // SharedPreferences caches all values in a per-isolate Dart Map on
      // first load.  When the main isolate (app process) updates operating
      // hours, active-days, auto-mark flags, etc. via persistOperatingSchedule
      // or other helpers, this background isolate's Dart cache does NOT see
      // those writes.  Calling reload() forces a re-read from the Android/iOS
      // SharedPreferences file so we always have the latest values.
      try {
        await prefs.reload();
      } catch (e) {
        debugPrint('[BGTask] prefs.reload() failed (non-fatal): $e');
      }

      // ── Guard: require login + active membership ─────────────────────────
      // Stop the foreground service entirely if the user has logged out or
      // has no active gym membership.  This prevents GPS polling, battery
      // drain, and unwanted notifications when the user is not entitled to
      // geofence attendance tracking.
      final authToken = prefs.getString('auth_token');
      if (authToken == null || authToken.isEmpty) {
        debugPrint('[BGTask] No auth token — stopping foreground service immediately');
        await FlutterForegroundTask.stopService();
        return;
      }
      final hasActiveMembership =
          prefs.getBool('geofence_has_active_membership') ?? false;
      if (!hasActiveMembership) {
        debugPrint('[BGTask] No active membership — stopping foreground service immediately');
        await FlutterForegroundTask.stopService();
        return;
      }

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
        _exitMarkedToday = false;
        _entryReallyMarked = false;
        _lastMarkedDateKey = today;
        _wasInsideGeofence = false;
        _enterTime = null;
        _consecutiveOutsideCount = 0;
        _dwellMarkAttempts = 0;
        _lastExitTime = null;
        _savedEnterTimeAcrossExit = null;
        _lastBackendErrorMsg = null;
        await prefs.remove('bg_task_entry_marked');
        await prefs.remove('bg_task_exit_marked');
        await prefs.remove('bg_task_entry_really_marked');
        await prefs.remove('bg_task_app_entry_marked');
        await prefs.remove('bg_task_app_exit_marked');
        await prefs.remove('bg_task_was_inside');
        await prefs.remove('bg_task_enter_time');
        await prefs.remove('bg_task_last_exit_time');
        await prefs.remove('bg_task_saved_enter_time');
        debugPrint('[BGTask] Daily state fully reset for $today');
      }

      // ── Cross-system sync ────────────────────────────────────────────────
      // The in-app AttendanceProvider may have marked attendance via its own
      // ApiService call (when the app is open).  It writes
      // bg_task_app_entry_marked = true to SharedPreferences.
      // IMPORTANT: We use separate keys (bg_task_app_entry_marked /
      // bg_task_app_exit_marked) to distinguish app-side marks from the
      // background task's own bg_task_entry_marked flag.  Previously both
      // systems wrote the same key, causing the bg task to read its own
      // hard-block flag back as "externally marked" → false positive.
      if (!_entryMarkedToday) {
        final externallyMarked = prefs.getBool('bg_task_app_entry_marked') ?? false;
        if (externallyMarked && prefs.getString('bg_task_last_date') == today) {
          _entryMarkedToday = true;
          _entryReallyMarked = true;
          debugPrint('[BGTask] Attendance already marked by in-app provider — synced');
        }
      }
      if (!_exitMarkedToday) {
        final externallyExitMarked = prefs.getBool('bg_task_app_exit_marked') ?? false;
        if (externallyExitMarked && prefs.getString('bg_task_last_date') == today) {
          _exitMarkedToday = true;
          debugPrint('[BGTask] Exit already marked by in-app provider — synced');
        }
      }

      // ── Guard: frozen membership ─────────────────────────────────────────
      // If the membership is frozen, skip all geofence processing.
      final isFrozen = prefs.getBool('geofence_membership_frozen') ?? false;
      if (isFrozen) {
        debugPrint('[BGTask] Membership is frozen — skipping geofence processing');
        _updateFgNotif(
          title: 'Attendance Paused',
          text: 'Your membership is currently frozen.',
          icon: _iconGym,
        );
        return;
      }

      // ── Guard: attendance fully done for today ───────────────────────────
      // Once entry is marked AND exit is either already marked or not needed,
      // stop the service immediately — no GPS polling needed until tomorrow.
      // This is checked BEFORE acquiring GPS to avoid unnecessary battery drain.
      final autoMarkExitEnabled = prefs.getBool('geofence_auto_mark_exit') ?? true;
      if (_entryMarkedToday && (_exitMarkedToday || !autoMarkExitEnabled)) {
        debugPrint('[BGTask] Attendance complete for today — stopping foreground service');
        try {
          FlutterForegroundTask.sendDataToMain({'event': 'service_stopped'});
        } catch (_) {}
        await FlutterForegroundTask.stopService();
        return;
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
      // Compute distance once — reused for circular containment and debug logging.
      final distance = Geolocator.distanceBetween(
          position.latitude, position.longitude, gymLat, gymLon);
      bool isInside;
      if (geofenceType == 'polygon' && polygonEncoded.isNotEmpty) {
        final polygon = _parsePolygon(polygonEncoded);
        if (polygon.length >= 3) {
          isInside = _isInsidePolygon(position.latitude, position.longitude, polygon);
        } else {
          // Fallback to circular if polygon is malformed
          isInside = distance <= gymRadius;
        }
      } else {
        isInside = distance <= gymRadius;
      }

      debugPrint(
        '[BGTask] tick — dist~${distance.toStringAsFixed(0)} m '
        'type=$geofenceType inside=$isInside was=$_wasInsideGeofence entryMarked=$_entryMarkedToday exitMarked=$_exitMarkedToday',
      );

      // ── state machine ────────────────────────────────────────────────────
      if (isInside && !_wasInsideGeofence) {
        // ── ENTER ──────────────────────────────────────────────────────────
        // Reset jitter counter — user is genuinely inside now.
        _consecutiveOutsideCount = 0;

        // IMPORTANT: always update state and start the dwell timer on ENTER,
        // regardless of operating hours.  The timer must run continuously so
        // that when the gym's operating window opens the user does NOT need to
        // leave and re-enter the geofence for attendance to be auto-marked.
        // (Previously the early `return` here prevented _wasInsideGeofence from
        // ever being set to true when outside hours, stalling all detection.)
        _wasInsideGeofence = true;
        _dwellMarkAttempts = 0;

        // ── Short-exit tolerance ───────────────────────────────────────────
        // If the user re-enters within _shortExitToleranceSecs after a
        // confirmed exit, restore the original enter time so the 5-min dwell
        // countdown is not reset by GPS jitter at the boundary.
        final now2 = DateTime.now();
        if (_lastExitTime != null &&
            _savedEnterTimeAcrossExit != null &&
            now2.difference(_lastExitTime!).inSeconds <= _shortExitToleranceSecs) {
          _enterTime = _savedEnterTimeAcrossExit;
          debugPrint('[BGTask] Short-exit re-enter — restoring original enter time: $_enterTime');
        } else {
          _enterTime = now2;
          debugPrint('[BGTask] ENTER — 5-min dwell timer started at $_enterTime');
        }
        _lastExitTime = null;
        _savedEnterTimeAcrossExit = null;

        await _saveDailyState(); // Persist timer so service-restart restores it

        // Check operating hours AFTER state/timer update — affects only
        // whether we show the "Gym Detected" notification, not the timer.
        final withinPeriod = _isWithinActivePeriod(prefs);
        if (!withinPeriod) {
          final reason = _buildOperatingHoursDebugText(prefs);
          debugPrint('[BGTask] ENTER outside operating hours — timer running, awaiting gym opening');
          _updateFgNotif(
            title: 'Inside Gym (Outside Hours)',
            text: reason,
            icon: _iconDumbell,
          );
          return;
        }

        // Only show "Gym Detected" notification if attendance hasn't been
        // marked yet today. Once marked, suppress all detection notifications.
        if (!_entryMarkedToday) {
          _updateFgNotif(
            title: 'Gym Detected',
            text: 'Stay 5 min to auto-mark attendance.',
            icon: _iconDumbell,
          );
          await _showLocalNotif(
            id: 3001,
            title: 'Gym Detected',
            body: 'Remain inside for 5 minutes to automatically mark your attendance.',
            importance: Importance.defaultImportance,
            icon: 'ic_dumbell',
          );
        } else if (_entryReallyMarked) {
          _updateFgNotif(
            title: 'Attendance Marked',
            text: 'Your attendance is recorded for today.',
            icon: _iconCheck,
          );
        } else {
          // Hard-block case: entry processing stopped but not genuinely marked
          _updateFgNotif(
            title: 'Inside Gym',
            text: _lastBackendErrorMsg ?? 'Auto-attendance unavailable today.',
            icon: _iconGym,
          );
        }

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
                title: 'Inside Gym',
                text: remainSec > 60
                    ? 'Auto-attendance in ~${(remainSec / 60).ceil()} min…'
                    : 'Auto-attendance in ~${remainSec}s…',
                icon: _iconDumbell,
              );
            }
          }
          return;
        }

        // EXIT confirmed
        _consecutiveOutsideCount = 0;
        _wasInsideGeofence = false;
        // Save enter time and exit timestamp for short-exit tolerance on re-enter.
        _savedEnterTimeAcrossExit = _enterTime;
        final now = DateTime.now();
        _lastExitTime = now;
        // The actual departure time is ~5 min ago (exitGraceTicks * 30s),
        // since we waited for consecutive outside readings to confirm exit.
        final actualExitTime = now.subtract(
          Duration(seconds: _exitGraceTicks * 30),
        );
        debugPrint('[BGTask] EXIT confirmed after grace period — actual exit time: ${_fmtTime(actualExitTime)}');

        _updateFgNotif(
          title: 'Gym Attendance Tracking',
          text: 'Monitoring your location…',
          icon: _iconLocation,
        );

        // Only mark exit if entry was GENUINELY marked by the backend (not
        // just a hard-block that set _entryMarkedToday to stop retrying).
        if (autoMarkExitEnabled && _entryReallyMarked && !_exitMarkedToday) {
          final result = await _callBackend(
            prefs: prefs,
            gymId: gymId,
            position: position,
            isEntry: false,
            overrideTimestamp: actualExitTime,
          );
          if (result == _kBackendOk) {
            _exitMarkedToday = true;
            _enterTime = null;
            _dwellMarkAttempts = 0;
            await _saveDailyState();
            debugPrint('[BGTask] Exit marked at ${_fmtTime(actualExitTime)} — stopping foreground service');
            await _showLocalNotif(
              id: 3003,
              title: 'Exit Recorded',
              body: 'Auto check-out at ${_fmtTime(actualExitTime)} — see you next time!',
              icon: 'ic_check',
            );
            try {
              FlutterForegroundTask.sendDataToMain({
                'event': 'attendance_exit',
                'gymId': gymId,
                'timestamp': DateTime.now().toIso8601String(),
              });
              FlutterForegroundTask.sendDataToMain({'event': 'service_stopped'});
            } catch (_) {}
            await FlutterForegroundTask.stopService();
            return;
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
            final withinPeriod = _isWithinActivePeriod(prefs);
            if (!withinPeriod) {
              final reason = _buildOperatingHoursDebugText(prefs);
              debugPrint('[BGTask] DWELL skipped — outside operating hours (timer kept, will mark when hours start)');
              _updateFgNotif(
                title: 'Inside Gym (Outside Hours)',
                text: reason,
                icon: _iconDumbell,
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
                _entryReallyMarked = true;
                _dwellMarkAttempts = 0;
                await _saveDailyState();

                // Cancel the "Gym Detected" notification now that attendance is done
                try {
                  await _notifPlugin.cancel(3001);
                } catch (_) {}

                await _showLocalNotif(
                  id: 3002,
                  title: 'Attendance Marked',
                  body:
                      'Auto check-in at ${_fmtTime(DateTime.now())} — enjoy your workout!',
                  icon: 'ic_check',
                );
                try {
                  FlutterForegroundTask.sendDataToMain({
                    'event': 'attendance_entry',
                    'gymId': gymId,
                    'timestamp': DateTime.now().toIso8601String(),
                  });
                  // If exit auto-mark is disabled, attendance is fully done —
                  // send the stop event in the same try block.
                  if (!autoMarkExitEnabled) {
                    FlutterForegroundTask.sendDataToMain({'event': 'service_stopped'});
                  }
                } catch (_) {}

                // If exit auto-mark is disabled, attendance is fully done —
                // stop the service immediately to save battery.
                if (!autoMarkExitEnabled) {
                  debugPrint('[BGTask] Entry marked & autoMarkExit disabled — stopping foreground service');
                  await FlutterForegroundTask.stopService();
                  return;
                }

                _updateFgNotif(
                  title: 'Attendance Marked',
                  text: 'Your attendance is recorded for today.',
                  icon: _iconCheck,
                );
              } else if (result == _kBackendHardBlock) {
                // Permanent error (no membership, geofence disabled, mock
                // location fraud). Stop retrying but do NOT set
                // _entryReallyMarked — so exit won't be marked either.
                debugPrint('[BGTask] Hard-block from backend — stopping for today');
                _entryMarkedToday = true;
                // _entryReallyMarked stays false — no genuine entry recorded
                _dwellMarkAttempts = 0;
                await _saveDailyState();
                _updateFgNotif(
                  title: 'Attendance Blocked',
                  text: 'Check membership or gym settings.',
                  icon: _iconGym,
                );
              } else if (_dwellMarkAttempts < _maxDwellMarkAttempts) {
                // Soft transient failure — show error IMMEDIATELY in both
                // the persistent notification and a pop-up so the user can
                // diagnose the issue without guessing.  Will retry once
                // more on the next tick.
                debugPrint('[BGTask] Soft-fail (attempt $_dwellMarkAttempts/$_maxDwellMarkAttempts) — will retry next tick');
                final errText = _lastBackendErrorMsg ?? 'Server error — retrying…';
                _updateFgNotif(
                  title: 'Auto-Mark Retrying…',
                  text: errText,
                  icon: _iconGym,
                );
                await _showLocalNotif(
                  id: 3006,
                  title: 'Auto-Attendance Error',
                  body: 'Attempt $_dwellMarkAttempts/$_maxDwellMarkAttempts failed: $errText',
                  importance: Importance.high,
                  icon: 'ic_gym',
                );
              } else {
                // ── Max soft retries exceeded ─────────────────────────────────
                // IMPORTANT: do NOT reset _enterTime here.  The old approach of
                // setting _enterTime = now - 240 s rewound the timer to 4 min,
                // causing DWELL to re-fire every 60 s indefinitely (the
                // "increasing / decreasing dwell time" oscillation bug).
                //
                // Instead, treat this the same as a hard-block: mark entry as
                // done for today so the task stops cycling and show a clear
                // error notification so the user knows to mark manually.
                debugPrint('[BGTask] Max retries ($_maxDwellMarkAttempts) exceeded — stopping auto-mark for today');
                _entryMarkedToday = true;
                _dwellMarkAttempts = 0;
                await _saveDailyState();

                _updateFgNotif(
                  title: 'Auto-Attendance Failed',
                  text: 'Could not reach the server after $_maxDwellMarkAttempts attempts. Please mark manually.',
                  icon: _iconGym,
                );
                await _showLocalNotif(
                  id: 3004,
                  title: 'Auto-Attendance Failed',
                  body: 'Gym presence was detected but attendance could not be '
                      'marked automatically after $_maxDwellMarkAttempts attempts. '
                      'Possible causes: weak network, low GPS accuracy, or a '
                      'temporary server issue. Please mark your attendance '
                      'manually from the app.',
                  importance: Importance.high,
                  icon: 'ic_gym',
                );
              }
            }
          } else {
            // Show precise countdown in the persistent notification
            final remainSec = 300 - elapsed.inSeconds;
            _updateFgNotif(
              title: 'Inside Gym',
              text: remainSec > 60
                  ? 'Auto-attendance in ~${(remainSec / 60).ceil()} min…'
                  : 'Auto-attendance in ~${remainSec}s…',
              icon: _iconDumbell,
            );
          }
        }
      } else if (isInside && _wasInsideGeofence && _entryMarkedToday) {
        // Already processed today — keep notification clean and suppress tracking.
        _consecutiveOutsideCount = 0;
        if (_entryReallyMarked) {
          _updateFgNotif(
            title: 'Attendance Marked',
            text: 'Your attendance is recorded for today.',
            icon: _iconCheck,
          );
        } else {
          _updateFgNotif(
            title: 'Inside Gym',
            text: _lastBackendErrorMsg ?? 'Auto-attendance unavailable today.',
            icon: _iconGym,
          );
        }
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
    DateTime? overrideTimestamp,
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
              if (overrideTimestamp != null)
                'timestamp': overrideTimestamp.toIso8601String(),
            }),
          )
          .timeout(const Duration(seconds: 30));

      if (resp.statusCode == 200 || resp.statusCode == 201) {
        debugPrint('[BGTask] ${isEntry ? "Entry" : "Exit"} backend call OK');
        return _kBackendOk;
      }

      // ── Classify non-2xx responses ─────────────────────────────────────────
      debugPrint('[BGTask] Backend ${resp.statusCode}: ${resp.body}');
      try {
        final body = (jsonDecode(resp.body) as Map<String, dynamic>);
        final msg  = (body['message'] as String? ?? '').toLowerCase();
        // Store the raw message for UI display so notifications can show
        // the exact reason (e.g. "attendance can only be marked during gym
        // operating hours") instead of a generic error.
        _lastBackendErrorMsg =
            body['message'] as String? ?? 'Unknown server error (${resp.statusCode})';
        // Hard-block: retrying will never help today.
        const hardBlocks = [
          'no active membership',
          'geofencing is disabled',
          'auto-mark entry is disabled',
          'auto-mark exit is disabled',
          'member not found',
          'mock locations are not allowed',
          // Auth errors — token is invalid/expired; retrying with the same
          // token will never succeed.
          'invalid token',
          'token missing',
          'invalid token type',
          'invalid token format',
          'user not found',
          'membership is frozen',
        ];
        // NOTE: "attendance can only be marked during gym operating hours"
        // is intentionally NOT a hard-block — the client-side operating
        // hours check handles this, but a slight clock skew between
        // client and server can cause this rejection transiently.
        // Treating it as soft-fail lets the task retry on the next tick
        // once the server's clock crosses into operating hours.
        if (hardBlocks.any(msg.contains)) {
          debugPrint('[BGTask] Hard-block: $msg');
          return _kBackendHardBlock;
        }
      } catch (_) {}

      // All other 4xx / 5xx → soft fail (distance check, GPS accuracy, etc.)
      return _kBackendSoftFail;
    } catch (e) {
      debugPrint('[BGTask] HTTP error: $e');
      _lastBackendErrorMsg = 'Network error: $e';
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
  bool _isWithinActivePeriod(SharedPreferences prefs) {
    final now = DateTime.now();

    // ── Active days check ──────────────────────────────────────────────────
    final activeDaysRaw = prefs.getString('gym_active_days') ?? '';
    if (activeDaysRaw.isNotEmpty) {
      const dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      final today = dayNames[now.weekday - 1]; // weekday 1=Mon … 7=Sun
      // Normalise to lowercase so server values like 'Monday' match 'monday'.
      final activeDays = activeDaysRaw.split(',').map((d) => d.trim().toLowerCase()).toList();
      if (!activeDays.contains(today)) {
        debugPrint('[BGTask] Today ($today) is not in active days: $activeDays');
        return false;
      }
    }

    // ── Operating hours check ──────────────────────────────────────────────
    final nowMin = now.hour * 60 + now.minute;

    final morningOpenStr  = prefs.getString('gym_morning_opening');
    final morningCloseStr = prefs.getString('gym_morning_closing');
    final eveningOpenStr  = prefs.getString('gym_evening_opening');
    final eveningCloseStr = prefs.getString('gym_evening_closing');

    final morningOpen  = _hmm2min(morningOpenStr);
    final morningClose = _hmm2min(morningCloseStr);
    final eveningOpen  = _hmm2min(eveningOpenStr);
    final eveningClose = _hmm2min(eveningCloseStr);

    debugPrint('[BGTask] Operating hours check — '
        'now=${now.hour}:${now.minute.toString().padLeft(2, '0')} ($nowMin min) | '
        'morning=${morningOpenStr ?? 'null'}-${morningCloseStr ?? 'null'} '
        '($morningOpen-$morningClose) | '
        'evening=${eveningOpenStr ?? 'null'}-${eveningCloseStr ?? 'null'} '
        '($eveningOpen-$eveningClose) | '
        'activeDays=${activeDaysRaw.isEmpty ? 'ALL' : activeDaysRaw}');

    // If no shift times stored at all → no restriction
    if (morningOpen == null && eveningOpen == null) {
      debugPrint('[BGTask] No operating hours configured — allowing (no restriction)');
      return true;
    }

    // Morning shift: require opening; if closing is missing treat as open
    // until end-of-day so a gym with only an opening time is never blocked.
    // Midnight-crossing: when close < open (e.g. 22:00–02:00), use OR logic.
    bool inMorning = false;
    if (morningOpen != null) {
      if (morningClose != null) {
        inMorning = morningClose >= morningOpen
            ? (nowMin >= morningOpen && nowMin <= morningClose)
            : (nowMin >= morningOpen || nowMin <= morningClose);
      } else {
        inMorning = nowMin >= morningOpen;
      }
    }

    // Evening shift: same permissive logic with midnight-crossing support.
    bool inEvening = false;
    if (eveningOpen != null) {
      if (eveningClose != null) {
        inEvening = eveningClose >= eveningOpen
            ? (nowMin >= eveningOpen && nowMin <= eveningClose)
            : (nowMin >= eveningOpen || nowMin <= eveningClose);
      } else {
        inEvening = nowMin >= eveningOpen;
      }
    }

    debugPrint('[BGTask] inMorning=$inMorning inEvening=$inEvening');

    if (!inMorning && !inEvening) {
      debugPrint('[BGTask] Current time ${now.hour}:${now.minute.toString().padLeft(2,'0')} is outside all operating shifts.');
      return false;
    }
    return true;
  }

  /// Build a human-readable string explaining the current operating hours
  /// state.  Used in notification text so the user (or developer) can
  /// immediately see the exact schedule values that caused the outside-hours
  /// decision — critical for diagnosing "gym shows closed when it's open".
  String _buildOperatingHoursDebugText(SharedPreferences prefs) {
    final now = DateTime.now();
    final nowStr =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final morningOpenStr  = prefs.getString('gym_morning_opening');
    final morningCloseStr = prefs.getString('gym_morning_closing');
    final eveningOpenStr  = prefs.getString('gym_evening_opening');
    final eveningCloseStr = prefs.getString('gym_evening_closing');
    final activeDaysRaw   = prefs.getString('gym_active_days') ?? '';

    // Check if it's an inactive day first
    if (activeDaysRaw.isNotEmpty) {
      const dayNames = [
        'monday', 'tuesday', 'wednesday', 'thursday',
        'friday', 'saturday', 'sunday'
      ];
      final today = dayNames[now.weekday - 1];
      final activeDays =
          activeDaysRaw.split(',').map((d) => d.trim().toLowerCase()).toList();
      if (!activeDays.contains(today)) {
        return 'Today ($today) is gym off-day. Active: ${activeDays.join(", ")}';
      }
    }

    // Build shift description
    final parts = <String>[];
    if (morningOpenStr != null) {
      parts.add('AM ${morningOpenStr}-${morningCloseStr ?? 'open'}');
    }
    if (eveningOpenStr != null) {
      parts.add('PM ${eveningOpenStr}-${eveningCloseStr ?? 'open'}');
    }
    if (parts.isEmpty) {
      return 'No operating hours saved (now $nowStr)';
    }
    return 'Now $nowStr | ${parts.join(", ")}';
  }

  // ─── helpers ───────────────────────────────────────────────────────────────
  void _updateFgNotif({
    required String title,
    required String text,
    NotificationIcon? icon,
  }) {
    try {
      FlutterForegroundTask.updateService(
        notificationTitle: title,
        notificationText: text,
        notificationIcon: icon,
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
        _exitMarkedToday = prefs.getBool('bg_task_exit_marked') ?? false;
        _entryReallyMarked = prefs.getBool('bg_task_entry_really_marked') ?? false;
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
          // Restore short-exit tolerance state
          final lastExitStr   = prefs.getString('bg_task_last_exit_time');
          final savedEnterStr = prefs.getString('bg_task_saved_enter_time');
          if (lastExitStr != null && savedEnterStr != null) {
            _lastExitTime              = DateTime.tryParse(lastExitStr);
            _savedEnterTimeAcrossExit  = DateTime.tryParse(savedEnterStr);
            debugPrint('[BGTask] Restored short-exit tolerance state: exit=$_lastExitTime savedEnter=$_savedEnterTimeAcrossExit');
          }
        }
      } else {
        // New day — clear everything
        _entryMarkedToday = false;
        _exitMarkedToday = false;
        _entryReallyMarked = false;
        _lastMarkedDateKey = today;
        await prefs.remove('bg_task_was_inside');
        await prefs.remove('bg_task_enter_time');
        await prefs.remove('bg_task_last_exit_time');
        await prefs.remove('bg_task_saved_enter_time');
        await prefs.remove('bg_task_exit_marked');
        await prefs.remove('bg_task_entry_really_marked');
      }
      debugPrint('[BGTask] Loaded daily state: entry=$_entryMarkedToday reallyMarked=$_entryReallyMarked exit=$_exitMarkedToday wasInside=$_wasInsideGeofence');
    } catch (_) {}
  }

  Future<void> _saveDailyState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('bg_task_last_date', _todayStr());
      await prefs.setBool('bg_task_entry_marked', _entryMarkedToday);
      await prefs.setBool('bg_task_exit_marked', _exitMarkedToday);
      await prefs.setBool('bg_task_entry_really_marked', _entryReallyMarked);
      // Persist the dwell timer so service-restart restores it
      if (_wasInsideGeofence && _enterTime != null && !_entryMarkedToday) {
        await prefs.setBool('bg_task_was_inside', true);
        await prefs.setString('bg_task_enter_time', _enterTime!.toIso8601String());
      } else {
        await prefs.remove('bg_task_was_inside');
        await prefs.remove('bg_task_enter_time');
      }
      // Persist short-exit tolerance state
      if (_lastExitTime != null && _savedEnterTimeAcrossExit != null) {
        await prefs.setString('bg_task_last_exit_time', _lastExitTime!.toIso8601String());
        await prefs.setString('bg_task_saved_enter_time', _savedEnterTimeAcrossExit!.toIso8601String());
      } else {
        await prefs.remove('bg_task_last_exit_time');
        await prefs.remove('bg_task_saved_enter_time');
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
      debugPrint('[FGTask] Already running — keeping existing notification state');
      // DO NOT overwrite the notification here.  The background isolate owns
      // the persistent notification and may currently be showing a dwell
      // countdown, outside-hours diagnostic, or error.  Resetting to
      // "Monitoring your location…" hides that information.
      return;
    }

    debugPrint('[FGTask] Starting foreground service');
    final result = await FlutterForegroundTask.startService(
      serviceId: 7001,
      notificationTitle: 'Gym Attendance Tracking',
      notificationText: 'Monitoring your location…',
      notificationIcon: const NotificationIcon(metaDataName: 'com.gymwale.notif.ic_location'),
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
      // Normalise to lowercase before persisting so the background-isolate
      // comparison is always case-insensitive.
      final normalised = activeDays.map((d) => d.trim().toLowerCase()).toList();
      await prefs.setString('gym_active_days', normalised.join(','));
    } else {
      await prefs.remove('gym_active_days');
    }
    debugPrint('[FGTask] Operating schedule persisted: '
        'morning=$morningOpening-$morningClosing '
        'evening=$eveningOpening-$eveningClosing '
        'activeDays=$activeDays');
  }

  /// Persist whether the user currently has an active gym membership.
  ///
  /// Set to `true` just before [startService] is called so the background
  /// isolate knows it is authorised to poll GPS and mark attendance.
  /// Set to `false` on [removeAllGeofences] and on user logout so the isolate
  /// halts immediately without making any network calls.
  static Future<void> persistActiveMembership(bool active) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('geofence_has_active_membership', active);
    debugPrint('[FGTask] Active membership flag persisted: $active');
  }

  /// Persist whether the user's membership is currently frozen.
  ///
  /// When true, the background isolate skips all geofence processing
  /// (no GPS polling, no attendance marking, no notifications) until
  /// the freeze is lifted.
  static Future<void> persistFrozenMembership(bool frozen) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('geofence_membership_frozen', frozen);
    debugPrint('[FGTask] Frozen membership flag persisted: $frozen');
  }
}
