import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geofence_service/geofence_service.dart';
import '../services/geofencing_service.dart';
import '../services/api_service.dart';
import '../services/local_notification_service.dart';
import '../services/attendance_settings_service.dart';
import '../models/attendance_settings.dart';

class AttendanceProvider extends ChangeNotifier {
  GeofencingService? _geofencingService;
  final AttendanceSettingsService _settingsService = AttendanceSettingsService();
  
  StreamSubscription<GeofenceStatus>? _geofenceSubscription;
  bool _bgListenerRegistered = false;
  // Guards against the same DWELL event triggering concurrent markAttendanceEntry
  // calls (geofence_service fires DWELL every poll tick once loiteringDelayMs is hit).
  bool _isDwellMarkInProgress = false;

  /// How many consecutive DWELL-triggered mark attempts have soft-failed.
  /// Resets on any success or on daily status reset.
  /// When this reaches [_maxDwellFailsBeforeGiveUp] the provider stops trying
  /// for the rest of the day (sets _isAttendanceMarkedToday = true) and shows
  /// an error notification — preventing the infinite retry loop that occurred
  /// because geofence_service fires DWELL on every ~5 s poll tick.
  int _dwellMarkFailCount = 0;
  static const int _maxDwellFailsBeforeGiveUp = 3;

  bool _isAttendanceMarkedToday = false;
  bool get isAttendanceMarkedToday => _isAttendanceMarkedToday;

  bool _hasCheckedOut = false;
  bool get hasCheckedOut => _hasCheckedOut;

  DateTime? _checkInTime;
  DateTime? get checkInTime => _checkInTime;

  DateTime? _checkOutTime;
  DateTime? get checkOutTime => _checkOutTime;

  Map<String, dynamic>? _todayAttendance;
  Map<String, dynamic>? get todayAttendance => _todayAttendance;

  List<Map<String, dynamic>> _attendanceHistory = [];
  List<Map<String, dynamic>> get attendanceHistory => _attendanceHistory;

  Map<String, dynamic>? _attendanceStats;
  Map<String, dynamic>? get attendanceStats => _attendanceStats;

  AttendanceSettings? _attendanceSettings;
  AttendanceSettings? get attendanceSettings => _attendanceSettings;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  // Retry configuration
  int _retryAttempts = 0;
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 5);

  AttendanceProvider();
  
  /// Initialize geofencing service if needed
  void initializeGeofencingService(GeofencingService service) {
    _geofencingService = service;
    _initializeGeofenceListener();
    _initializeBackgroundTaskListener();
  }

  /// Listen for data sent from the background (killed-app) isolate so the UI
  /// refreshes automatically, e.g. after the foreground task marks attendance.
  /// Guard: only register once — ChangeNotifierProxyProvider may call
  /// initializeGeofencingService repeatedly whenever GeofencingService notifies.
  void _initializeBackgroundTaskListener() {
    if (_bgListenerRegistered) return;
    FlutterForegroundTask.addTaskDataCallback(_onBackgroundTaskData);
    _bgListenerRegistered = true;
  }

  /// Called in the main isolate when the background isolate sends data via
  /// FlutterForegroundTask.sendDataToMain(...).
  void _onBackgroundTaskData(Object data) {
    try {
      if (data is Map) {
        final event  = data['event'] as String?;
        final gymId  = data['gymId']  as String?;
        if (gymId == null) return;

        debugPrint('[ATTENDANCE] Background task event: $event for gym: $gymId');

        if (event == 'attendance_entry') {
          _isAttendanceMarkedToday = true;
          _checkInTime = DateTime.now();
          _hasCheckedOut = false;
          notifyListeners();
          // Also re-fetch from backend to get the full attendance record
          fetchTodayAttendance(gymId);
        } else if (event == 'attendance_exit') {
          _checkOutTime = DateTime.now();
          _hasCheckedOut = true;
          notifyListeners();
          fetchTodayAttendance(gymId);
        }
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error handling background task data: $e');
    }
  }

  /// Initialize listener for geofence events.
  /// Always cancels any existing subscription first so that repeated calls from
  /// ChangeNotifierProxyProvider.update do not pile up duplicate listeners on
  /// the broadcast stream (which would trigger multiple concurrent
  /// markAttendanceEntry calls per DWELL event).
  void _initializeGeofenceListener() {
    if (_geofencingService == null) return;
    _geofenceSubscription?.cancel();
    _geofenceSubscription = _geofencingService!.geofenceStream.listen(
      _onGeofenceStatusChanged,
      onError: (error) {
        debugPrint('[ATTENDANCE] Geofence stream error: $error');
      },
    );
  }

  /// Handle geofence status changes
  /// ─────────────────────────────────────────────────────────────────────────
  /// ENTER  → user crossed the boundary; GeofencingService already showed the
  ///          "Gym detected – stay 5 min" local notification. Nothing to do here.
  /// DWELL  → user has been inside for loiteringDelayMs (5 minutes) → AUTO MARK
  /// EXIT   → user left the geofence → auto-mark exit
  ///
  /// Gates (checked in order):
  ///   1. geofenceEnabled  – if false, tear down the geofence entirely.
  ///   2. autoMarkEnabled  – if false, skip (but keep monitoring).
  ///   3. Operating hours  – if outside hours, skip this event.
  ///   4. Hard server error after marking → tear down geofence.
  Future<void> _onGeofenceStatusChanged(GeofenceStatus status) async {
    if (_geofencingService == null) return;
    final gymId = _geofencingService!.currentGymId;
    if (gymId == null) return;

    // ── Lazy-load attendance settings if not yet available ─────────────────
    // This happens when the geofence was restored from SharedPreferences on
    // app start: registerGymGeofence() reregisters the boundary, but
    // _attendanceSettings is still null because loadAttendanceSettings() was
    // never called for this session.  Load them now so all gate checks work.
    if (_attendanceSettings == null) {
      debugPrint('[ATTENDANCE] Settings not loaded – fetching before handling event…');
      await loadAttendanceSettings(gymId);
    }

    // ── Gate 1: Geofence enabled ────────────────────────────────────────────
    // If the gym has disabled geofence entirely, tear down the service so we
    // stop consuming battery for location tracking altogether.
    if (_attendanceSettings != null && !_attendanceSettings!.geofenceEnabled) {
      debugPrint('[ATTENDANCE] Geofence disabled by gym settings – stopping geofence service.');
      await _geofencingService!.removeAllGeofences();
      return;
    }

    // ── Gate 2: Auto-mark setting ───────────────────────────────────────────
    // If settings were loaded but auto-mark is explicitly disabled, skip.
    // Default is TRUE (allow) so a network failure never silently blocks.
    if (_attendanceSettings != null && !isAutoMarkEnabled()) {
      debugPrint('[ATTENDANCE] Auto-mark disabled by gym settings – skipping.');
      return;
    }

    // ── Gate 3: Operating hours ─────────────────────────────────────────────
    // Skip (but do NOT stop the service) when outside configured hours.
    // The geofence stays active so it fires again at next re-entry.
    if (status == GeofenceStatus.DWELL || status == GeofenceStatus.EXIT) {
      if (!_isWithinOperatingHours()) {
        debugPrint('[ATTENDANCE] Outside gym operating hours – skipping auto-mark.');
        return;
      }
    }

    if (status == GeofenceStatus.ENTER) {
      // Notification shown by GeofencingService; no API call yet.
      debugPrint('[ATTENDANCE] Geofence ENTER – waiting for 5-min DWELL before marking.');
    } else if (status == GeofenceStatus.DWELL) {
      // 5 minutes elapsed inside the geofence → mark entry.
      // geofence_service fires DWELL on EVERY poll tick (~5 s) once the
      // loiteringDelayMs threshold is crossed, so gate with a flag to prevent
      // concurrent / duplicate markAttendanceEntry calls.
      if (_isAttendanceMarkedToday) {
        debugPrint('[ATTENDANCE] Geofence DWELL – attendance already marked today, skipping.');
      } else if (_isDwellMarkInProgress) {
        debugPrint('[ATTENDANCE] Geofence DWELL – mark already in progress, skipping duplicate.');
      } else if (_geofencingService!.shouldAutoMarkEntry()) {
        debugPrint('[ATTENDANCE] Geofence DWELL (5 min) – auto-marking attendance entry.');
        _isDwellMarkInProgress = true;
        final success = await markAttendanceEntry(gymId);
        _isDwellMarkInProgress = false;

        if (success) {
          // Reset fail counter so a future session works from scratch.
          _dwellMarkFailCount = 0;
        } else if (_isHardBlockError(_errorMessage)) {
          // ── Gate 4a: Hard server errors ───────────────────────────────────
          // Stop geofence tracking on permanent errors (expired membership,
          // geofence disabled server-side) to avoid repeated failed calls.
          debugPrint('[ATTENDANCE] Hard block – stopping geofence: $_errorMessage');
          _dwellMarkFailCount = 0;
          await _geofencingService!.removeAllGeofences();
        } else {
          // ── Gate 4b: Soft / transient failure ────────────────────────────
          // geofence_service fires DWELL every ~5 s indefinitely once the
          // threshold is passed.  After _maxDwellFailsBeforeGiveUp consecutive
          // failures we stop retrying for today to avoid burning battery and
          // spamming the backend, and notify the user with a clear reason.
          _dwellMarkFailCount++;
          debugPrint('[ATTENDANCE] DWELL soft-fail $_dwellMarkFailCount/$_maxDwellFailsBeforeGiveUp — error: $_errorMessage');

          if (_dwellMarkFailCount >= _maxDwellFailsBeforeGiveUp) {
            debugPrint('[ATTENDANCE] Max DWELL fails reached — giving up for today');
            // Mark as done so DWELL events are silently ignored for the rest
            // of the day.  The user must mark attendance manually.
            _isAttendanceMarkedToday = true;
            _dwellMarkFailCount = 0;
            notifyListeners();

            final reason = _buildFailureReason(_errorMessage);
            await LocalNotificationService.instance.showAttendanceFailedNotification(
              reason: reason,
            );
          }
        }
      } else {
        debugPrint('[ATTENDANCE] Auto-mark entry disabled in settings.');
      }
    } else if (status == GeofenceStatus.EXIT) {
      _isDwellMarkInProgress = false; // Allow fresh mark on next entry
      if (_geofencingService!.shouldAutoMarkExit()) {
        debugPrint('[ATTENDANCE] Geofence EXIT – auto-marking attendance exit.');
        await markAttendanceExit(gymId);
      } else {
        debugPrint('[ATTENDANCE] Auto-mark exit disabled in settings.');
      }
    }
  }

  /// Returns true when the current wall-clock time is within the gym's
  /// configured operating hours and the current day is an active day.
  ///
  /// Checks (in order):
  ///   1. Active days of the week (if configured).
  ///   2. Morning shift + evening shift (preferred, from geofenceSettings or
  ///      top-level operatingHours).
  ///   3. Legacy single-window operatingHoursStart/End as a fallback.
  ///
  /// Returns true (no restriction) when no shift information is stored,
  /// mirroring the behaviour of the background-isolate `_isWithinActivePeriod`.
  bool _isWithinOperatingHours() {
    final settings = _attendanceSettings;
    if (settings == null) return true;

    final now = DateTime.now();

    // ── 1. Active days --─────────────────────────────────────────────────────
    const dayNames = [
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    ];
    final activeDays = settings.geofenceSettings?.activeDays ?? settings.activeDays;
    if (activeDays.isNotEmpty) {
      final today = dayNames[now.weekday - 1]; // weekday: 1=Mon … 7=Sun
      if (!activeDays.contains(today)) {
        debugPrint('[ATTENDANCE] Today ($today) is not an active gym day — skipping auto-mark.');
        return false;
      }
    }

    // ── 2. Shift-based hours check ────────────────────────────────────────────
    // Helper: parse "HH:mm" → minutes since midnight. Returns null on error.
    int? hmm(String? s) {
      if (s == null || s.isEmpty) return null;
      final p = s.split(':');
      if (p.length < 2) return null;
      final h = int.tryParse(p[0]);
      final m = int.tryParse(p[1]);
      return (h != null && m != null) ? h * 60 + m : null;
    }

    final geo   = settings.geofenceSettings;
    final hours = settings.operatingHours;

    // Prefer geofenceSettings shifts; fall back to top-level operatingHours.
    final morningShift = geo?.morningShift ?? hours?.morning;
    final eveningShift = geo?.eveningShift ?? hours?.evening;

    if (morningShift != null || eveningShift != null) {
      final mo = hmm(morningShift?.opening);
      final mc = hmm(morningShift?.closing);
      final eo = hmm(eveningShift?.opening);
      final ec = hmm(eveningShift?.closing);

      final nowMin    = now.hour * 60 + now.minute;
      final inMorning = (mo != null && mc != null) && (nowMin >= mo && nowMin <= mc);
      final inEvening = (eo != null && ec != null) && (nowMin >= eo && nowMin <= ec);

      if (!inMorning && !inEvening) {
        debugPrint('[ATTENDANCE] Outside all operating shifts '
            '(${now.hour}:${now.minute.toString().padLeft(2, '0')}) — skipping.');
        return false;
      }
      return true;
    }

    // ── 3. Legacy single-window fallback ──────────────────────────────────────
    final legacyStart = geo?.operatingHoursStart;
    final legacyEnd   = geo?.operatingHoursEnd;
    if (legacyStart != null && legacyEnd != null &&
        legacyStart.isNotEmpty && legacyEnd.isNotEmpty) {
      final current = '${now.hour.toString().padLeft(2, '0')}'
          ':${now.minute.toString().padLeft(2, '0')}';
      return current.compareTo(legacyStart) >= 0 &&
             current.compareTo(legacyEnd)   <= 0;
    }

    return true; // No shift information stored → no time restriction
  }

  /// Builds a human-readable failure reason from a raw error message.
  String _buildFailureReason(String? raw) {
    if (raw == null || raw.isEmpty) {
      return 'Gym presence was detected but attendance could not be marked '
          'automatically. Possible causes: weak network, low GPS accuracy, or '
          'a temporary server issue. Please mark your attendance manually.';
    }
    final lower = raw.toLowerCase();
    if (lower.contains('location') || lower.contains('gps') || lower.contains('accuracy')) {
      return 'Attendance could not be auto-marked due to a GPS / location '
          'accuracy problem. Move to an open area and mark manually.';
    }
    if (lower.contains('network') || lower.contains('connection') || lower.contains('timeout')) {
      return 'Attendance could not be auto-marked — no internet connection. '
          'Please check your network and mark manually.';
    }
    if (lower.contains('operating hours') || lower.contains('outside')) {
      return 'Attendance was not marked because you checked in outside the '
          "gym's operating hours. Please contact the gym if this is incorrect.";
    }
    return 'Auto-attendance failed: $raw. Please mark your attendance manually.';
  }

  /// Returns true when the server-returned error should permanently stop
  /// geofence tracking (i.e. retrying will never help).
  bool _isHardBlockError(String? message) {
    if (message == null) return false;
    const hardBlocks = [
      'No active membership',
      'Geofencing is disabled',
      'Auto-mark entry is disabled',
      'Member not found',
    ];
    return hardBlocks.any((e) => message.contains(e));
  }

  /// Mark attendance entry when entering gym geofence
  Future<bool> markAttendanceEntry(String gymId) async {
    return await _markAttendanceWithRetry(gymId, isEntry: true);
  }

  /// Mark attendance with retry logic for robustness
  Future<bool> _markAttendanceWithRetry(String gymId, {required bool isEntry, int attempt = 0}) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      if (_geofencingService == null) {
        _errorMessage = 'Geofencing service not initialized';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get current location
      final position = await _geofencingService!.getCurrentLocation();
      if (position == null) {
        _errorMessage = 'Unable to get current location';
        _isLoading = false;
        notifyListeners();
        
        // Retry if we haven't exceeded max attempts
        if (attempt < maxRetryAttempts) {
          debugPrint('[ATTENDANCE] Retrying after location failure (attempt ${attempt + 1}/$maxRetryAttempts)');
          await Future.delayed(retryDelay);
          return await _markAttendanceWithRetry(gymId, isEntry: isEntry, attempt: attempt + 1);
        }
        return false;
      }

      // Check if location is mocked
      final isMockLocation = position.isMocked;

      // Prepare request data
      final requestData = {
        'gymId': gymId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'isMockLocation': isMockLocation,
      };

      // Call API based on entry or exit
      final response = isEntry 
          ? await ApiService.markGeofenceEntry(requestData)
          : await ApiService.markGeofenceExit(requestData);

      if (response['success'] == true) {
        if (isEntry) {
          _isAttendanceMarkedToday = true;
          _checkInTime = DateTime.now();
          _todayAttendance = response['attendance'];
          _hasCheckedOut = false;
          debugPrint('[ATTENDANCE] Entry marked successfully');
        } else {
          _checkOutTime = DateTime.now();
          _hasCheckedOut = true;
          _todayAttendance = response['attendance'];
          debugPrint('[ATTENDANCE] Exit marked successfully');
          debugPrint('[ATTENDANCE] Duration: ${response['durationInMinutes']} minutes');
        }
        
        // Show local notification
        try {
          final notification = response['notification'];
          if (notification != null && notification['title'] != null) {
            await LocalNotificationService.instance.showAttendanceNotification(
              title: notification['title'],
              message: notification['message'] ?? (isEntry ? 'Your attendance has been marked' : 'Gym exit recorded'),
            );
          } else {
            // Fallback notification
            if (isEntry) {
              await LocalNotificationService.instance.showAttendanceEntryNotification(
                gymName: 'the gym',
                time: _checkInTime!.hour.toString().padLeft(2, '0') + ':' + 
                      _checkInTime!.minute.toString().padLeft(2, '0'),
                sessionsRemaining: response['sessionsRemaining'],
              );
            } else {
              await LocalNotificationService.instance.showAttendanceExitNotification(
                gymName: 'the gym',
                time: _checkOutTime!.hour.toString().padLeft(2, '0') + ':' + 
                      _checkOutTime!.minute.toString().padLeft(2, '0'),
                durationMinutes: response['durationInMinutes'] ?? 0,
              );
            }
          }
        } catch (notifError) {
          debugPrint('[ATTENDANCE] Error showing notification: $notifError');
          // Don't fail attendance marking if notification fails
        }
        
        _retryAttempts = 0; // Reset retry counter on success
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to mark attendance';
        _isLoading = false;
        notifyListeners();
        
        // Retry for certain error conditions
        if (attempt < maxRetryAttempts && _shouldRetry(response['message'])) {
          debugPrint('[ATTENDANCE] Retrying after API failure (attempt ${attempt + 1}/$maxRetryAttempts)');
          await Future.delayed(retryDelay * (attempt + 1)); // Exponential backoff
          return await _markAttendanceWithRetry(gymId, isEntry: isEntry, attempt: attempt + 1);
        }
        return false;
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error marking ${isEntry ? 'entry' : 'exit'}: $e');
      _errorMessage = 'Error marking attendance: $e';
      _isLoading = false;
      notifyListeners();
      
      // Retry on network errors
      if (attempt < maxRetryAttempts) {
        debugPrint('[ATTENDANCE] Retrying after exception (attempt ${attempt + 1}/$maxRetryAttempts)');
        await Future.delayed(retryDelay * (attempt + 1)); // Exponential backoff
        return await _markAttendanceWithRetry(gymId, isEntry: isEntry, attempt: attempt + 1);
      }
      return false;
    }
  }

  /// Determine if we should retry based on error message
  bool _shouldRetry(String? errorMessage) {
    if (errorMessage == null) return true;
    
    // Don't retry for these permanent / logic errors
    const noRetryErrors = [
      'Mock locations are not allowed',
      'No active membership',
      'You are',           // Distance-related
      'Minimum stay time',
      'already marked',
      'Geofencing is disabled',
      'Auto-mark entry is disabled',
      'operating hours',   // Outside operating hours
      'Member not found',
    ];
    
    for (final error in noRetryErrors) {
      if (errorMessage.contains(error)) {
        return false;
      }
    }
    
    return true; // Retry for network / server transient errors
  }

  /// Mark attendance entry when entering gym geofence (legacy method - kept for compatibility)
  Future<bool> _markAttendanceEntryLegacy(String gymId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      if (_geofencingService == null) {
        _errorMessage = 'Geofencing service not initialized';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get current location
      final position = await _geofencingService!.getCurrentLocation();
      if (position == null) {
        _errorMessage = 'Unable to get current location';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Check if location is mocked
      final isMockLocation = position.isMocked;

      // Prepare request data
      final requestData = {
        'gymId': gymId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'isMockLocation': isMockLocation,
      };

      // Call API
      final response = await ApiService.markGeofenceEntry(requestData);

      if (response['success'] == true) {
        _isAttendanceMarkedToday = true;
        _checkInTime = DateTime.now();
        _todayAttendance = response['attendance'];
        _hasCheckedOut = false;

        debugPrint('[ATTENDANCE] Entry marked successfully');
        
        // Show local notification
        try {
          final notification = response['notification'];
          if (notification != null && notification['title'] != null) {
            await LocalNotificationService.instance.showAttendanceNotification(
              title: notification['title'],
              message: notification['message'] ?? 'Your attendance has been marked',
            );
          } else {
            // Fallback notification
            await LocalNotificationService.instance.showAttendanceEntryNotification(
              gymName: 'the gym',
              time: _checkInTime!.hour.toString().padLeft(2, '0') + ':' + 
                    _checkInTime!.minute.toString().padLeft(2, '0'),
              sessionsRemaining: response['sessionsRemaining'],
            );
          }
        } catch (notifError) {
          debugPrint('[ATTENDANCE] Error showing notification: $notifError');
          // Don't fail attendance marking if notification fails
        }
        
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to mark attendance';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error marking entry: $e');
      _errorMessage = 'Error marking attendance: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Mark attendance exit when leaving gym geofence
  Future<bool> markAttendanceExit(String gymId) async {
    return await _markAttendanceWithRetry(gymId, isEntry: false);
  }

  /// Mark attendance exit when leaving gym geofence (legacy method - kept for compatibility)
  Future<bool> _markAttendanceExitLegacy(String gymId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      if (_geofencingService == null) {
        _errorMessage = 'Geofencing service not initialized';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get current location
      final position = await _geofencingService!.getCurrentLocation();
      if (position == null) {
        _errorMessage = 'Unable to get current location';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Prepare request data
      final requestData = {
        'gymId': gymId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
      };

      // Call API
      final response = await ApiService.markGeofenceExit(requestData);

      if (response['success'] == true) {
        _checkOutTime = DateTime.now();
        _hasCheckedOut = true;
        _todayAttendance = response['attendance'];

        debugPrint('[ATTENDANCE] Exit marked successfully');
        debugPrint('[ATTENDANCE] Duration: ${response['durationInMinutes']} minutes');

        // Show local notification for exit
        try {
          final notification = response['notification'];
          if (notification != null && notification['title'] != null) {
            await LocalNotificationService.instance.showAttendanceNotification(
              title: notification['title'],
              message: notification['message'] ?? 'Gym exit recorded',
            );
          } else {
            // Fallback notification
            await LocalNotificationService.instance.showAttendanceExitNotification(
              gymName: 'the gym',
              time: _checkOutTime!.hour.toString().padLeft(2, '0') + ':' + 
                    _checkOutTime!.minute.toString().padLeft(2, '0'),
              durationMinutes: response['durationInMinutes'] ?? 0,
            );
          }
        } catch (notifError) {
          debugPrint('[ATTENDANCE] Error showing exit notification: $notifError');
        }

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to mark exit';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('[ATTENDANCE] Error marking exit: $e');
      _errorMessage = 'Error marking exit: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Get today's attendance status
  Future<void> fetchTodayAttendance(String gymId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final response = await ApiService.getTodayAttendance(gymId);

      if (response['success'] == true) {
        _isAttendanceMarkedToday = response['isMarked'] ?? false;
        _hasCheckedOut = response['hasCheckedOut'] ?? false;
        _todayAttendance = response['attendance'];

        if (_todayAttendance != null) {
          // Parse check-in time
          if (_todayAttendance!['geofenceEntry'] != null &&
              _todayAttendance!['geofenceEntry']['timestamp'] != null) {
            _checkInTime =
                DateTime.parse(_todayAttendance!['geofenceEntry']['timestamp']);
          }

          // Parse check-out time
          if (_todayAttendance!['geofenceExit'] != null &&
              _todayAttendance!['geofenceExit']['timestamp'] != null) {
            _checkOutTime =
                DateTime.parse(_todayAttendance!['geofenceExit']['timestamp']);
          }
        }
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[ATTENDANCE] Error fetching today\'s attendance: $e');
      _errorMessage = 'Error fetching attendance: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get attendance history
  Future<void> fetchAttendanceHistory(
    String gymId, {
    String? startDate,
    String? endDate,
    int limit = 30,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final response = await ApiService.getAttendanceHistory(
        gymId,
        startDate: startDate,
        endDate: endDate,
        limit: limit,
      );

      if (response['success'] == true) {
        final raw = response['attendance'] as List? ?? [];
        _attendanceHistory = raw
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      } else {
        _attendanceHistory = [];
        _errorMessage = response['message'];
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[ATTENDANCE] Error fetching history: $e');
      _errorMessage = 'Error fetching history: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get attendance statistics
  Future<void> fetchAttendanceStats(
    String gymId, {
    int? month,
    int? year,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final response = await ApiService.getAttendanceStats(
        gymId,
        month: month,
        year: year,
      );

      if (response['success'] == true && response['stats'] != null) {
        final s = response['stats'] as Map;
        _attendanceStats = {
          'presentDays':    s['presentDays']    ?? 0,
          'totalDays':      s['totalDays']      ?? 0,
          'attendanceRate': (s['attendanceRate'] ?? 0.0) / 100.0,
          'avgDuration':    s['averageDurationMinutes'] ?? 0,
          'geofenceDays':   s['geofenceDays']   ?? 0,
        };
      } else {
        _attendanceStats = {
          'presentDays': 0, 'totalDays': 0,
          'attendanceRate': 0.0, 'avgDuration': 0, 'geofenceDays': 0,
        };
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[ATTENDANCE] Error fetching stats: $e');
      _errorMessage = 'Error fetching stats: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Verify if user is inside geofence
  Future<Map<String, dynamic>?> verifyGeofence(
    String gymId,
    double latitude,
    double longitude,
  ) async {
    try {
      final requestData = {
        'gymId': gymId,
        'latitude': latitude,
        'longitude': longitude,
      };

      final response = await ApiService.verifyGeofence(requestData);
      return response;
    } catch (e) {
      debugPrint('[ATTENDANCE] Error verifying geofence: $e');
      return null;
    }
  }

  /// Setup geofencing for a gym
  Future<bool> setupGeofencing({
    required String gymId,
    required double latitude,
    required double longitude,
    required double radius,
  }) async {
    try {
      if (_geofencingService == null) {
        debugPrint('[ATTENDANCE] Geofencing service not initialized');
        return false;
      }

      final success = await _geofencingService!.registerGymGeofence(
        gymId: gymId,
        latitude: latitude,
        longitude: longitude,
        radius: radius,
      );

      if (success) {
        // Fetch today's attendance after setting up geofence
        await fetchTodayAttendance(gymId);
      }

      return success;
    } catch (e) {
      debugPrint('[ATTENDANCE] Error setting up geofencing: $e');
      return false;
    }
  }

  /// Remove geofencing
  Future<void> removeGeofencing() async {
    if (_geofencingService != null) {
      await _geofencingService!.removeAllGeofences();
    }
    _isAttendanceMarkedToday = false;
    _hasCheckedOut = false;
    _checkInTime = null;
    _checkOutTime = null;
    _todayAttendance = null;
    notifyListeners();
  }

  /// Reset daily attendance status (called at midnight or app restart)
  void resetDailyStatus() {
    _isAttendanceMarkedToday = false;
    _hasCheckedOut = false;
    _checkInTime = null;
    _checkOutTime = null;
    _todayAttendance = null;
    _isDwellMarkInProgress = false;
    _dwellMarkFailCount = 0;
    notifyListeners();
  }

  /// Get formatted check-in time
  String? getFormattedCheckInTime() {
    if (_checkInTime == null) return null;
    return '${_checkInTime!.hour.toString().padLeft(2, '0')}:${_checkInTime!.minute.toString().padLeft(2, '0')}';
  }

  /// Get formatted check-out time
  String? getFormattedCheckOutTime() {
    if (_checkOutTime == null) return null;
    return '${_checkOutTime!.hour.toString().padLeft(2, '0')}:${_checkOutTime!.minute.toString().padLeft(2, '0')}';
  }

  /// Get duration in gym
  String? getDurationInGym() {
    if (_checkInTime == null || _checkOutTime == null) return null;
    
    final duration = _checkOutTime!.difference(_checkInTime!);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    
    return '${hours}h ${minutes}m';
  }

  /// Clear error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Load attendance settings for a gym
  Future<bool> loadAttendanceSettings(String gymId) async {
    try {
      debugPrint('[ATTENDANCE PROVIDER] Loading attendance settings for gym: $gymId');
      
      _attendanceSettings = await _settingsService.loadSettings(gymId);
      
      if (_attendanceSettings != null) {
        debugPrint('[ATTENDANCE PROVIDER] Settings loaded successfully');
        debugPrint('[ATTENDANCE PROVIDER] Mode: ${_attendanceSettings!.mode}');
        debugPrint('[ATTENDANCE PROVIDER] Geofence enabled: ${_attendanceSettings!.geofenceEnabled}');
        debugPrint('[ATTENDANCE PROVIDER] Auto-mark enabled: ${_attendanceSettings!.autoMarkEnabled}');
        notifyListeners();
        return true;
      }
      
      return false;
    } catch (e) {
      debugPrint('[ATTENDANCE PROVIDER] Error loading settings: $e');
      return false;
    }
  }

  /// Check if geofencing should be enabled for this gym
  bool shouldEnableGeofencing() {
    return _attendanceSettings?.geofenceEnabled ?? false;
  }

  /// Check if auto-mark is enabled.
  /// Defaults to TRUE so a restored geofence (with settings not yet loaded)
  /// does not silently block attendance marking.
  bool isAutoMarkEnabled() {
    return _attendanceSettings?.autoMarkEnabled ?? true;
  }

  /// Get attendance mode
  AttendanceMode? getAttendanceMode() {
    return _attendanceSettings?.mode;
  }

  /// Setup geofencing with attendance settings integration
  Future<bool> setupGeofencingWithSettings(String gymId) async {
    try {
      if (_geofencingService == null) {
        debugPrint('[ATTENDANCE] Geofencing service not initialized');
        return false;
      }

      // First load attendance settings
      final settingsLoaded = await loadAttendanceSettings(gymId);
      if (!settingsLoaded) {
        debugPrint('[ATTENDANCE] Failed to load attendance settings');
        return false;
      }

      // Check if geofencing should be enabled
      if (!shouldEnableGeofencing()) {
        debugPrint('[ATTENDANCE] Geofencing is not enabled for this gym');
        debugPrint('[ATTENDANCE] Current mode: ${_attendanceSettings?.mode}');
        return false;
      }

      // Configure geofencing from settings
      final success = await _geofencingService!.configureFromSettings(gymId);
      
      if (success) {
        debugPrint('[ATTENDANCE] Geofencing setup successful with settings');
        // Fetch today's attendance after setting up geofence
        await fetchTodayAttendance(gymId);
        return true;
      }

      return false;
    } catch (e) {
      debugPrint('[ATTENDANCE] Error setting up geofencing with settings: $e');
      return false;
    }
  }

  /// Refresh attendance settings and update geofencing if needed
  Future<bool> refreshAttendanceSettings(String gymId) async {
    try {
      debugPrint('[ATTENDANCE PROVIDER] Refreshing attendance settings');
      
      // Clear cached settings and reload
      _settingsService.clearSettings();
      final loaded = await loadAttendanceSettings(gymId);
      
      if (loaded && _geofencingService != null) {
        // If geofencing is enabled in settings, reconfigure it
        if (shouldEnableGeofencing()) {
          await _geofencingService!.refreshSettings(gymId);
        } else {
          // If geofencing is disabled, remove any active geofences
          await removeGeofencing();
        }
      }
      
      return loaded;
    } catch (e) {
      debugPrint('[ATTENDANCE PROVIDER] Error refreshing settings: $e');
      return false;
    }
  }

  /// Check if geofence is properly configured
  bool isGeofenceConfigured() {
    if (_geofencingService == null) return false;
    return _geofencingService!.isGeofenceEnabledInSettings();
  }

  /// Validate location against settings requirements
  bool validateLocationAccuracy(double accuracy) {
    if (_geofencingService == null) return true;
    return _geofencingService!.isLocationAccuracyValid(accuracy);
  }

  @override
  void dispose() {
    _geofenceSubscription?.cancel();
    FlutterForegroundTask.removeTaskDataCallback(_onBackgroundTaskData);
    _settingsService.dispose();
    super.dispose();
  }
}
