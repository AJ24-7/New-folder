import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../providers/attendance_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/location_permission_service.dart';
import '../services/geofencing_service.dart';
import '../config/app_theme.dart';
import 'attendance_history_screen.dart';

/// User Attendance Screen
/// Shows attendance status, check-in/out times, and geofence information
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with WidgetsBindingObserver {
  bool _isLoadingPermissions = true;
  PermissionStatus? _permissionStatus;
  bool _isSettingUpGeofence = false;
  String? _activeGymId;
  bool _isLoadingGymId = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermissions();
    _loadAttendanceData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Refresh attendance data whenever the app returns to the foreground.
  /// This covers the case where the background foreground-task or the
  /// geofence_service marked attendance while the screen was not visible.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadAttendanceData();
    }
  }

  Future<void> _checkPermissions() async {
    setState(() {
      _isLoadingPermissions = true;
    });

    final status = await LocationPermissionService.checkGeofencingPermissions();
    setState(() {
      _permissionStatus = status;
      _isLoadingPermissions = false;
    });
  }

  /// Resolve the user's active gym ID from their membership
  Future<String?> _resolveActiveGymId() async {
    if (_activeGymId != null) return _activeGymId;
    if (_isLoadingGymId) return null;
    _isLoadingGymId = true;
    try {
      // First check if geofence service already knows the gymId (restored from prefs)
      final geofencingService =
          Provider.of<GeofencingService>(context, listen: false);
      if (geofencingService.currentGymId != null) {
        _activeGymId = geofencingService.currentGymId;
        return _activeGymId;
      }

      // Fetch from active memberships API
      final memberships = await ApiService.getActiveMemberships();
      for (final m in memberships) {
        String? gymId;
        if (m['gymId'] != null) {
          gymId = m['gymId'].toString();
        } else if (m['gym'] != null && m['gym'] is Map) {
          gymId = (m['gym']['_id'] ?? m['gym']['id'])?.toString();
        }
        if (gymId != null && gymId.isNotEmpty) {
          _activeGymId = gymId;
          return gymId;
        }
      }
    } catch (e) {
      debugPrint('[ATTENDANCE SCREEN] Error resolving gym ID: $e');
    } finally {
      _isLoadingGymId = false;
    }
    return null;
  }

  Future<void> _loadAttendanceData() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final attendanceProvider =
        Provider.of<AttendanceProvider>(context, listen: false);

    final currentUser = authProvider.user;
    if (currentUser == null) return;

    final gymId = await _resolveActiveGymId();
    if (gymId == null) {
      debugPrint('[ATTENDANCE SCREEN] No active gym membership found');
      return;
    }

    // Fetch today's attendance status and monthly stats
    await Future.wait([
      attendanceProvider.fetchTodayAttendance(gymId),
      attendanceProvider.fetchAttendanceStats(
        gymId,
        month: DateTime.now().month,
        year: DateTime.now().year,
      ),
    ]);
  }

  Future<void> _requestPermissions() async {
    setState(() {
      _isLoadingPermissions = true;
    });

    final status = await LocationPermissionService.requestGeofencingPermissions();
    setState(() {
      _permissionStatus = status;
      _isLoadingPermissions = false;
    });

    if (status.canUseGeofencing) {
      _setupGeofence();
    }
  }

  Future<void> _setupGeofence() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final attendanceProvider =
        Provider.of<AttendanceProvider>(context, listen: false);

    final currentUser = authProvider.user;
    if (currentUser == null) {
      _showSnackBar('Please login to enable attendance tracking',
          isError: true);
      return;
    }

    setState(() => _isSettingUpGeofence = true);

    try {
      // Resolve gymId from active membership
      final gymId = await _resolveActiveGymId();
      if (gymId == null) {
        _showSnackBar(
            'No active gym membership found. Please join a gym first.',
            isError: true);
        return;
      }

      // setupGeofencingWithSettings fetches gym coordinates from attendance
      // settings API and registers the geofence. It also loads _attendanceSettings
      // so that isAutoMarkEnabled() / shouldAutoMarkEntry() work correctly.
      final success =
          await attendanceProvider.setupGeofencingWithSettings(gymId);

      if (success) {
        _showSnackBar('Automatic attendance tracking enabled!');
        // Refresh today's attendance status
        await attendanceProvider.fetchTodayAttendance(gymId);
      } else {
        // setupGeofencingWithSettings() returns false either when geofencing is
        // disabled for this gym or coordinates aren't configured.
        // Fall back to reading raw gym location from the gym document.
        final error = attendanceProvider.errorMessage;
        _showSnackBar(
            error ?? 'Geofence not configured for this gym. Contact your gym.',
            isError: true);
      }
    } catch (e) {
      debugPrint('[ATTENDANCE SCREEN] Setup error: $e');
      _showSnackBar('Error enabling tracking: $e', isError: true);
    } finally {
      setState(() => _isSettingUpGeofence = false);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: Duration(seconds: isError ? 4 : 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Attendance'),
        actions: [
          IconButton(
            icon: const Icon(FontAwesomeIcons.clockRotateLeft),
            onPressed: () async {
              // Resolve the gymId before navigating so AttendanceHistoryScreen
              // receives the required parameters.
              final gymId = await _resolveActiveGymId();
              if (gymId == null || !mounted) return;

              // Attempt to get gym name from memberships for the app bar title
              String gymName = 'Your Gym';
              try {
                final memberships = await ApiService.getActiveMemberships();
                for (final m in memberships) {
                  final mGymId = (m['gymId'] ??
                          m['gym']?['_id'] ??
                          m['gym']?['id'])
                      ?.toString();
                  if (mGymId == gymId) {
                    gymName = m['gymName']?.toString() ??
                        m['gym']?['gymName']?.toString() ??
                        m['gym']?['name']?.toString() ??
                        'Your Gym';
                    break;
                  }
                }
              } catch (_) {}

              if (!mounted) return;
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AttendanceHistoryScreen(
                    gymId: gymId,
                    gymName: gymName,
                  ),
                ),
              );
            },
            tooltip: 'History',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            _checkPermissions(),
            _loadAttendanceData(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Permission Status Card
              _buildPermissionCard(),
              const SizedBox(height: 16),

              // Today's Attendance Card
              _buildTodayAttendanceCard(),
              const SizedBox(height: 16),

              // Geofence Status Card
              _buildGeofenceStatusCard(),
              const SizedBox(height: 16),

              // Weekly Summary Card
              _buildWeeklySummaryCard(),
              const SizedBox(height: 16),

              // Instructions
              _buildInstructionsCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionCard() {
    if (_isLoadingPermissions) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (_permissionStatus == null) {
      return const SizedBox.shrink();
    }

    final status = _permissionStatus!;
    Color statusColor;
    IconData statusIcon;

    if (status.isFullyGranted) {
      statusColor = Colors.green;
      statusIcon = FontAwesomeIcons.circleCheck;
    } else if (status.canUseGeofencing) {
      statusColor = Colors.orange;
      statusIcon = FontAwesomeIcons.circleExclamation;
    } else {
      statusColor = Colors.red;
      statusIcon = FontAwesomeIcons.circleXmark;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Permission Status',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              status.message,
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 16),
            
            // Permission Details
            _buildPermissionItem(
              'Location Access',
              status.hasLocationPermission,
            ),
            _buildPermissionItem(
              'Background Location',
              status.hasBackgroundPermission,
            ),
            _buildPermissionItem(
              'Activity Recognition',
              status.hasActivityRecognition,
            ),
            
            const SizedBox(height: 16),
            
            // Action Buttons
            if (!status.isFullyGranted)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: status.canUseGeofencing
                      ? () => LocationPermissionService.openAppSettings()
                      : _requestPermissions,
                  icon: Icon(status.canUseGeofencing
                      ? FontAwesomeIcons.gear
                      : FontAwesomeIcons.unlock),
                  label: Text(status.canUseGeofencing
                      ? 'Open Settings'
                      : 'Grant Permissions'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionItem(String label, bool granted) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            granted ? FontAwesomeIcons.check : FontAwesomeIcons.xmark,
            size: 16,
            color: granted ? Colors.green : Colors.red,
          ),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
    );
  }

  Widget _buildTodayAttendanceCard() {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        final isMarked = attendanceProvider.isAttendanceMarkedToday;
        final checkInTime = attendanceProvider.getFormattedCheckInTime();
        final checkOutTime = attendanceProvider.getFormattedCheckOutTime();
        final duration = attendanceProvider.getDurationInGym();

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      FontAwesomeIcons.calendarDay,
                      color: AppTheme.primaryColor,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Today - ${DateFormat('MMMM d, yyyy').format(DateTime.now())}',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                if (!isMarked)
                  Center(
                    child: Column(
                      children: [
                        Icon(
                          FontAwesomeIcons.hourglass,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No attendance marked yet',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Enter the gym premises to mark attendance',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Column(
                    children: [
                      // Check-in
                      _buildAttendanceRow(
                        'Check-in',
                        checkInTime ?? '--:--',
                        FontAwesomeIcons.arrowRightToBracket,
                        Colors.green,
                      ),
                      const SizedBox(height: 12),
                      
                      // Check-out
                      _buildAttendanceRow(
                        'Check-out',
                        checkOutTime ?? 'Not yet',
                        FontAwesomeIcons.arrowRightFromBracket,
                        checkOutTime != null ? Colors.red : Colors.grey,
                      ),
                      
                      if (duration != null) ...[
                        const SizedBox(height: 12),
                        _buildAttendanceRow(
                          'Duration',
                          duration,
                          FontAwesomeIcons.clock,
                          AppTheme.primaryColor,
                        ),
                      ],
                    ],
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAttendanceRow(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildGeofenceStatusCard() {
    return Consumer2<GeofencingService, AttendanceProvider>(
      builder: (context, geofencingService, attendanceProvider, child) {
        final isRunning = geofencingService.isServiceRunning;
        final gymId = geofencingService.currentGymId;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      FontAwesomeIcons.locationDot,
                      color: isRunning ? Colors.green : Colors.grey,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Geofence Status',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isRunning
                            ? Colors.green.withValues(alpha: 0.2)
                            : Colors.grey.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        isRunning ? 'Active' : 'Inactive',
                        style: TextStyle(
                          color: isRunning ? Colors.green : Colors.grey,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                if (!isRunning)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Automatic attendance tracking is disabled',
                        style: TextStyle(color: Colors.grey[700]),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _isSettingUpGeofence ? null : _setupGeofence,
                          icon: _isSettingUpGeofence
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(FontAwesomeIcons.play),
                          label: Text(_isSettingUpGeofence
                              ? 'Enabling...'
                              : 'Enable Tracking'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your attendance will be automatically marked when you enter or leave the gym.',
                        style: TextStyle(color: Colors.grey[700]),
                      ),
                      if (gymId != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Gym ID: $gymId',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            await attendanceProvider.removeGeofencing();
                            _showSnackBar('Automatic tracking disabled');
                          },
                          icon: const Icon(FontAwesomeIcons.stop),
                          label: const Text('Disable Tracking'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildWeeklySummaryCard() {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        final stats = attendanceProvider.attendanceStats;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      FontAwesomeIcons.chartLine,
                      color: AppTheme.primaryColor,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'This Month',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                Row(
                  children: [
                    Expanded(
                      child: _buildStatItem(
                        'Present Days',
                        stats?['presentDays']?.toString() ?? '0',
                        FontAwesomeIcons.calendarCheck,
                        Colors.green,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatItem(
                        'Attendance',
                        '${stats?['attendanceRate']?.toStringAsFixed(1) ?? '0'}%',
                        FontAwesomeIcons.percent,
                        Colors.blue,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  FontAwesomeIcons.circleInfo,
                  color: Colors.blue,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Text(
                  'How it Works',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInstructionStep(
              1,
              'Grant location permissions',
              'Allow "Always" location access for automatic tracking',
            ),
            _buildInstructionStep(
              2,
              'Enable geofence tracking',
              'Tap "Enable Tracking" to activate automatic attendance',
            ),
            _buildInstructionStep(
              3,
              'Enter the gym',
              'Your check-in will be marked automatically when you arrive',
            ),
            _buildInstructionStep(
              4,
              'Leave the gym',
              'Your check-out will be marked when you exit the geofence',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructionStep(int step, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                step.toString(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
