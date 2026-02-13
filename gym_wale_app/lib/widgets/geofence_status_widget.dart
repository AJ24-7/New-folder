import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../providers/attendance_provider.dart';
import '../services/geofencing_service.dart';
import '../config/app_theme.dart';

/// Geofence Status Widget
/// Shows current geofence tracking status on dashboard/home screen
class GeofenceStatusWidget extends StatelessWidget {
  final VoidCallback? onTap;
  
  const GeofenceStatusWidget({
    super.key,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer2<GeofencingService, AttendanceProvider>(
      builder: (context, geofencingService, attendanceProvider, child) {
        final isRunning = geofencingService.isServiceRunning;
        final isMarkedToday = attendanceProvider.isAttendanceMarkedToday;
        final checkInTime = attendanceProvider.getFormattedCheckInTime();

        return Card(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: InkWell(
            onTap: onTap ?? () => Navigator.pushNamed(context, '/attendance'),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isRunning
                      ? [
                          Colors.green.shade400,
                          Colors.green.shade700,
                        ]
                      : [
                          Colors.grey.shade400,
                          Colors.grey.shade600,
                        ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          isRunning
                              ? FontAwesomeIcons.locationDot
                              : FontAwesomeIcons.locationCrosshairs,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isRunning ? Colors.white : Colors.grey.shade300,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              isRunning ? 'Active' : 'Inactive',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Attendance Tracking',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (isMarkedToday && checkInTime != null)
                    Row(
                      children: [
                        const Icon(
                          FontAwesomeIcons.clock,
                          color: Colors.white70,
                          size: 14,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Checked in at $checkInTime',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    )
                  else
                    Text(
                      isRunning
                          ? 'Automatic check-in when you arrive'
                          : 'Tap to enable automatic tracking',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Spacer(),
                      const Text(
                        'View Details',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.arrow_forward_ios,
                        color: Colors.white,
                        size: 14,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Compact Geofence Status Tile
/// Smaller version for use in lists or compact layouts
class GeofenceStatusTile extends StatelessWidget {
  final VoidCallback? onTap;
  
  const GeofenceStatusTile({
    super.key,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer2<GeofencingService, AttendanceProvider>(
      builder: (context, geofencingService, attendanceProvider, child) {
        final isRunning = geofencingService.isServiceRunning;
        final isMarkedToday = attendanceProvider.isAttendanceMarkedToday;

        return ListTile(
          onTap: onTap ?? () => Navigator.pushNamed(context, '/attendance'),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isRunning
                  ? Colors.green.withValues(alpha: 0.2)
                  : Colors.grey.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              FontAwesomeIcons.locationDot,
              color: isRunning ? Colors.green : Colors.grey,
              size: 20,
            ),
          ),
          title: const Text(
            'Attendance Tracking',
            style: TextStyle(
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Text(
            isMarkedToday
                ? 'Attendance marked today'
                : isRunning
                    ? 'Active - Automatic tracking'
                    : 'Inactive - Tap to enable',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: isRunning ? Colors.green : Colors.grey,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right),
            ],
          ),
        );
      },
    );
  }
}

/// Attendance Quick Action Button
/// Quick action button for home screen
class AttendanceQuickAction extends StatelessWidget {
  const AttendanceQuickAction({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AttendanceProvider>(
      builder: (context, attendanceProvider, child) {
        final isMarkedToday = attendanceProvider.isAttendanceMarkedToday;
        final checkInTime = attendanceProvider.getFormattedCheckInTime();
        final hasCheckedOut = attendanceProvider.hasCheckedOut;

        return InkWell(
          onTap: () => Navigator.pushNamed(context, '/attendance'),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.primaryColor.withValues(alpha: 0.3),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isMarkedToday
                      ? FontAwesomeIcons.circleCheck
                      : FontAwesomeIcons.calendar,
                  color: AppTheme.primaryColor,
                  size: 32,
                ),
                const SizedBox(height: 8),
                Text(
                  isMarkedToday
                      ? hasCheckedOut
                          ? 'Checked Out'
                          : 'Present'
                      : 'Mark Attendance',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (checkInTime != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    checkInTime,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
