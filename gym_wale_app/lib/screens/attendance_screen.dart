import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../providers/attendance_provider.dart';
import '../providers/auth_provider.dart';
import '../services/location_permission_service.dart';
import '../services/geofencing_service.dart';
import '../config/app_theme.dart';

/// User Attendance Screen
/// Shows attendance status, check-in/out times, and geofence information
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _isLoadingPermissions = true;
  PermissionStatus? _permissionStatus;
  bool _isSettingUpGeofence = false;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
    _loadAttendanceData();
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

  Future<void> _loadAttendanceData() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    
    // TODO: Get gym ID from user's active membership
    // For now, this needs to be fetched from user memberships
    // You may need to add a currentGymId field to User model or get it from UserMembership
    final currentUser = authProvider.user;
    if (currentUser != null) {
      // await attendanceProvider.fetchTodayAttendance(gymId);
    }
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
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    
    final currentUser = authProvider.user;
    if (currentUser == null) {
      _showSnackBar('Please login to enable attendance tracking', isError: true);
      return;
    }

    // TODO: Get gym ID from user's active membership or stored preferences
    // You need to:
    // 1. Add a method to get user's active gym membership
    // 2. Store current gym ID in SharedPreferences when user joins
    // 3. Or add currentGymId field to User model
    
    // For now, return an error to guide user
    _showSnackBar('Please configure your gym membership first', isError: true);
    return;
    
    // Uncomment below when gym ID retrieval is implemented
    /*
    setState(() {
      _isSettingUpGeofence = true;
    });

    try {
      // Get gym details to get geofence coordinates
      // TODO: Fetch actual gym coordinates from API using gym ID
      final gymId = 'YOUR_GYM_ID'; // Get from user's active membership
      final success = await attendanceProvider.setupGeofencing(
        gymId: gymId,
        latitude: 28.6139, // TODO: Replace with actual gym latitude from API
        longitude: 77.2090, // TODO: Replace with actual gym longitude from API
        radius: 100.0, // TODO: Replace with actual gym geofence radius from API
      );

      if (success) {
        _showSnackBar('Automatic attendance tracking enabled!');
      } else {
        _showSnackBar('Failed to setup attendance tracking', isError: true);
      }
    } catch (e) {
      _showSnackBar('Error: $e', isError: true);
    } finally {
      setState(() {
        _isSettingUpGeofence = false;
      });
    }
    */
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
            onPressed: () {
              // Navigate to attendance history
              Navigator.pushNamed(context, '/attendance-history');
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
