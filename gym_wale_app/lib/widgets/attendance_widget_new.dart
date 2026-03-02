import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../config/app_theme.dart';
import '../models/attendance_settings.dart';
import '../providers/attendance_provider.dart';
import '../providers/auth_provider.dart';
import '../l10n/app_localizations.dart';
import '../services/location_monitoring_service.dart';
import '../services/api_service.dart';
import '../widgets/location_warning_dialog.dart';
import '../screens/attendance_history_screen.dart';

/// Stateful wrapper for AttendanceWidget that connects to AttendanceProvider
class AttendanceWidget extends StatefulWidget {
  final String gymId;
  final String? gymName;

  const AttendanceWidget({
    Key? key,
    required this.gymId,
    this.gymName,
  }) : super(key: key);

  @override
  State<AttendanceWidget> createState() => _AttendanceWidgetState();
}

class _AttendanceWidgetState extends State<AttendanceWidget> {
  final LocationMonitoringService _locationMonitoring = LocationMonitoringService();
  LocationStatus? _locationStatus;
  bool _isCheckingLocation = false;
  bool _geofenceEnabled = false;
  bool _showLocationWarning = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAttendanceData();
      _checkGeofenceAndLocation();
    });
  }

  @override
  void dispose() {
    // Don't dispose the singleton service, just stop monitoring for this gym
    super.dispose();
  }

  Future<void> _loadAttendanceData() async {
    final provider = Provider.of<AttendanceProvider>(context, listen: false);
    // Load attendance settings (needed for schedule / off-day banners)
    if (provider.attendanceSettings == null) {
      await provider.loadAttendanceSettings(widget.gymId);
    }
    await provider.fetchTodayAttendance(widget.gymId);
    await provider.fetchAttendanceStats(
      widget.gymId,
      month: DateTime.now().month,
      year: DateTime.now().year,
    );
  }

  /// Check if geofence is enabled and verify location setup
  Future<void> _checkGeofenceAndLocation() async {
    if (widget.gymId.isEmpty) return;

    setState(() {
      _isCheckingLocation = true;
    });

    try {
      // Get geofence requirements from backend
      final response = await ApiService.getGymAttendanceSettings(widget.gymId);
      
      if (response['success'] == true && response['settings'] != null) {
        final settings = response['settings'];
        final geofenceEnabled = settings['geofenceEnabled'] == true ||
                               settings['mode'] == 'geofence' ||
                               settings['mode'] == 'hybrid';
        
        setState(() {
          _geofenceEnabled = geofenceEnabled;
        });

        // Skip location monitoring on web platform
        if (kIsWeb) {
          debugPrint('[AttendanceWidget] Web platform - Geofencing not supported');
          if (geofenceEnabled) {
            // Show a static warning that geofencing is not supported on web
            setState(() {
              _showLocationWarning = true;
              _locationStatus = null; // Set to null to indicate web platform
            });
          }
          return;
        }

        if (geofenceEnabled) {
          // Check current location status (one-shot permission/service check).
          // Do NOT call _locationMonitoring.initialize() here — it starts a
          // periodic polling timer that conflicts with the geofence attendance
          // foreground task.
          final status = await _locationMonitoring.getCurrentLocationStatus();
          setState(() {
            _locationStatus = status;
            _showLocationWarning = !status.meetsGeofenceRequirements;
          });
        }
      }
    } catch (e) {
      debugPrint('[AttendanceWidget] Error checking geofence: $e');
    } finally {
      setState(() {
        _isCheckingLocation = false;
      });
    }
  }

  /// Show location warning dialog
  Future<void> _showLocationWarningDialog() async {
    if (_locationStatus == null) return;

    final warnings = <LocationWarning>[];

    if (!_locationStatus!.locationEnabled) {
      warnings.add(LocationWarning.locationDisabled());
    }
    
    if (_locationStatus!.locationPermission != 'granted') {
      warnings.add(LocationWarning.permissionDenied());
    }
    
    if (!_locationStatus!.backgroundLocationEnabled ||
        _locationStatus!.backgroundLocationPermission != 'granted') {
      warnings.add(LocationWarning.backgroundPermissionDenied());
    }
    
    if (_locationStatus!.locationAccuracy == 'low') {
      warnings.add(LocationWarning.lowAccuracy());
    }

    if (warnings.isNotEmpty) {
      await LocationWarningDialog.show(
        context,
        warnings: warnings,
      );
      
      // Recheck after user returns from settings
      await Future.delayed(const Duration(seconds: 1));
      await _checkGeofenceAndLocation();
    }
  }



  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Consumer<AttendanceProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading) {
          return _buildLoadingState(l10n);
        }

        if (provider.errorMessage != null) {
          return _buildErrorState(l10n, provider.errorMessage!);
        }

        final scheduleBanner = _buildScheduleBanner(provider.attendanceSettings);
        return Column(
          children: [
            // Show "off day" / "outside operating hours" banner
            if (scheduleBanner != null) scheduleBanner,
            // Show location warning banner if geofence is enabled but location is not set up
            // On web, show info message if geofence is enabled
            // On mobile, show warning if location requirements not met
            if (_geofenceEnabled && _showLocationWarning)
              _buildLocationWarningBanner(),
            _buildContent(l10n, provider),
          ],
        );
      },
    );
  }

  /// Build location warning banner
  Widget _buildLocationWarningBanner() {
    String message;
    bool showFixButton = true;
    
    // Web platform specific message
    if (kIsWeb) {
      message = 'Automatic attendance is not available on web. Please use the mobile app for geofence-based attendance.';
      showFixButton = false;
    } else if (_locationStatus == null) {
      message = 'Location access required for automatic attendance';
    } else if (!_locationStatus!.locationEnabled) {
      message = 'Enable location services for attendance tracking';
    } else if (_locationStatus!.locationPermission != 'granted') {
      message = 'Allow location permission for attendance';
    } else if (!_locationStatus!.backgroundLocationEnabled) {
      message = 'Enable background location for automatic attendance';
    } else {
      message = 'Location access required for automatic attendance';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.orange.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            kIsWeb ? Icons.info_outline : Icons.location_off,
            color: Colors.orange,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                color: Colors.orange,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (showFixButton) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: _isCheckingLocation ? null : _showLocationWarningDialog,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              child: _isCheckingLocation
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text('Fix Now'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLoadingState(AppLocalizations l10n) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
        ),
      ),
    );
  }

  Widget _buildErrorState(AppLocalizations l10n, String error) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.errorColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.errorColor),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.errorColor),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              error,
              style: const TextStyle(color: AppTheme.errorColor),
            ),
          ),
        ],
      ),
    );
  }

  // ── Schedule awareness helpers ─────────────────────────────────────────────

  /// Returns true when today's weekday is in the gym's active-days list.
  bool _isActiveDayToday(AttendanceSettings? settings) {
    if (settings == null) return true;
    // Check geofenceSettings.activeDays first, fall back to top-level activeDays
    final days = settings.geofenceSettings?.activeDays ?? settings.activeDays;
    if (days.isEmpty) return true;
    const dayNames = [
      'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
    ];
    final today = dayNames[DateTime.now().weekday - 1];
    return days.map((d) => d.toLowerCase()).contains(today);
  }

  /// Returns true when the current time is inside one of the gym's operating shifts.
  bool _isWithinOperatingHours(AttendanceSettings? settings) {
    if (settings == null) return true;
    final geo = settings.geofenceSettings;
    final now = DateTime.now();
    final cur = now.hour * 60 + now.minute;

    if (geo != null) {
      // Dual-shift from geofence settings
      final ms = _hhmm2min(geo.morningShift?.opening);
      final me = _hhmm2min(geo.morningShift?.closing);
      if (ms != null && me != null && cur >= ms && cur <= me) return true;

      final es = _hhmm2min(geo.eveningShift?.opening);
      final ee = _hhmm2min(geo.eveningShift?.closing);
      if (es != null && ee != null && cur >= es && cur <= ee) return true;

      // Legacy single window
      final ls = _hhmm2min(geo.operatingHoursStart);
      final le = _hhmm2min(geo.operatingHoursEnd);
      if (ms == null && es == null && ls == null) return true; // no restriction
      if (ls != null && le != null && cur >= ls && cur <= le) return true;

      return false;
    }

    // Fall back to top-level operatingHours (OperatingHoursInfo)
    final oh = settings.operatingHours;
    if (oh == null) return true;

    final ms = _hhmm2min(oh.morning?.opening);
    final me = _hhmm2min(oh.morning?.closing);
    if (ms != null && me != null && cur >= ms && cur <= me) return true;

    final es = _hhmm2min(oh.evening?.opening);
    final ee = _hhmm2min(oh.evening?.closing);
    if (es != null && ee != null && cur >= es && cur <= ee) return true;

    if (ms == null && es == null) return true; // no restriction configured
    return false;
  }

  int? _hhmm2min(String? s) {
    if (s == null || s.isEmpty) return null;
    final p = s.split(':');
    if (p.length < 2) return null;
    final h = int.tryParse(p[0]);
    final m = int.tryParse(p[1]);
    return (h != null && m != null) ? h * 60 + m : null;
  }

  /// Build a banner shown when the gym is closed today or outside hours.
  Widget? _buildScheduleBanner(AttendanceSettings? settings) {
    if (settings == null) return null;
    final isOffDay = !_isActiveDayToday(settings);
    final isOutsideHours = isOffDay ? false : !_isWithinOperatingHours(settings);

    if (!isOffDay && !isOutsideHours) return null;

    final message = isOffDay
        ? 'Off day today — gym is closed'
        : 'Visit during active hours to record attendance';
    final icon = isOffDay ? Icons.weekend_outlined : Icons.schedule_outlined;
    final color = isOffDay ? Colors.deepPurple : Colors.indigo;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 13,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(AppLocalizations l10n, AttendanceProvider provider) {
    final todayAttendance = provider.todayAttendance;
    final stats = provider.attendanceStats ?? {};

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Attendance',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_geofenceEnabled)
                          Row(
                            children: [
                              Icon(
                                _locationStatus?.meetsGeofenceRequirements == true
                                    ? Icons.check_circle
                                    : Icons.location_off,
                                color: _locationStatus?.meetsGeofenceRequirements == true
                                    ? Colors.green[300]
                                    : Colors.orange[300],
                                size: 12,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _locationStatus?.meetsGeofenceRequirements == true
                                    ? 'Auto-tracking enabled'
                                    : 'Location setup required',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  onPressed: () {
                    _loadAttendanceData();
                    if (_geofenceEnabled) {
                      _checkGeofenceAndLocation();
                    }
                  },
                  tooltip: 'Refresh',
                ),
              ],
            ),
          ),

          // Today's Status
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Today\'s Status',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                if (todayAttendance == null)
                  _buildTodayStatusCard(
                    'Not marked today',
                    Icons.check_circle_outline,
                    Colors.grey,
                  )
                else
                  _buildCheckedInStatus(l10n, todayAttendance),
              ],
            ),
          ),

          // Monthly Statistics
          if (stats.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'This Month',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          'Present Days',
                          '${stats['presentDays'] ?? 0}',
                          Icons.check_circle,
                          AppTheme.successColor,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          'Attendance Rate',
                          '${((stats['attendanceRate'] ?? 0.0) * 100).toStringAsFixed(0)}%',
                          Icons.trending_up,
                          AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildStatCard(
                    'Avg Workout Duration',
                    _formatDuration(stats['avgDuration'] ?? 0),
                    Icons.timer,
                    AppTheme.accentColor,
                  ),
                ],
              ),
            ),
          ],

          // Action Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AttendanceHistoryScreen(
                        gymId: widget.gymId,
                        gymName: widget.gymName ?? 'Gym',
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.history),
                label: const Text('View Attendance History'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayStatusCard(String text, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: color,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Safely parse a time value from the attendance map.
  /// Handles both full ISO-8601 datetime strings (from geofenceEntry.timestamp)
  /// and the backend's "HH:MM" shorthand stored in checkInTime / checkOutTime.
  /// Returns null on any parse failure instead of throwing.
  DateTime? _parseAttendanceTime(dynamic value) {
    if (value == null) return null;
    final str = value.toString().trim();
    if (str.isEmpty) return null;
    // Try full ISO-8601 first (e.g. "2025-06-01T14:30:00.000Z")
    try {
      return DateTime.parse(str);
    } catch (_) {}
    // Try "HH:MM" or "HH:MM:SS" format (stored by the Node.js backend as
    // new Date().toTimeString().split(' ')[0].substring(0,5))
    try {
      final parts = str.split(':');
      if (parts.length >= 2) {
        final h = int.parse(parts[0]);
        final m = int.parse(parts[1]);
        final s = parts.length >= 3 ? int.tryParse(parts[2]) ?? 0 : 0;
        final now = DateTime.now();
        return DateTime(now.year, now.month, now.day, h, m, s);
      }
    } catch (_) {}
    return null;
  }

  Widget _buildCheckedInStatus(AppLocalizations l10n, Map<String, dynamic> attendance) {
    // Prefer the full ISO timestamp from geofenceEntry for accuracy; fall back
    // to the "HH:MM" shorthand stored in checkInTime / checkOutTime.
    final checkInTime = _parseAttendanceTime(
          attendance['geofenceEntry']?['timestamp'] ?? attendance['checkInTime']);
    final checkOutTime = _parseAttendanceTime(
          attendance['geofenceExit']?['timestamp'] ?? attendance['checkOutTime']);
    final duration = attendance['durationInMinutes'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.successColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: AppTheme.successColor, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Check In',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    Text(
                      checkInTime != null
                          ? '${checkInTime.hour}:${checkInTime.minute.toString().padLeft(2, '0')}'
                          : '--:--',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.successColor,
                      ),
                    ),
                  ],
                ),
              ),
              if (checkOutTime != null) ...[
                const Icon(Icons.arrow_forward, color: Colors.grey, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Check Out',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      Text(
                        '${checkOutTime.hour}:${checkOutTime.minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          if (checkOutTime == null) ...[
            const SizedBox(height: 12),
            Text(
              'Workout in Progress',
              style: const TextStyle(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ] else if (duration > 0) ...[
            const SizedBox(height: 12),
            Text(
              'Duration: ${_formatDuration(duration)}',
              style: const TextStyle(
                color: Colors.grey,
                fontSize: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.grey,
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _formatDuration(int minutes) {
    if (minutes < 60) {
      return '$minutes min';
    } else {
      final hours = minutes ~/ 60;
      final mins = minutes % 60;
      return mins > 0 ? '${hours}h ${mins}min' : '${hours}h';
    }
  }
}
