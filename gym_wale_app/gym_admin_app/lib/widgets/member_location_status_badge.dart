import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

/// Member Location Status Badge
/// Shows member's location services status for geofence attendance
class MemberLocationStatusBadge extends StatelessWidget {
  final bool locationEnabled;
  final bool hasPermission;
  final bool hasBackgroundPermission;
  final bool isStale;
  final bool showLabel;
  final double size;

  const MemberLocationStatusBadge({
    super.key,
    required this.locationEnabled,
    required this.hasPermission,
    required this.hasBackgroundPermission,
    this.isStale = false,
    this.showLabel = false,
    this.size = 20,
  });

  @override
  Widget build(BuildContext context) {
    final status = _getStatus();
    
    if (showLabel) {
      return _buildLabeledBadge(status);
    }
    
    return _buildIconBadge(status);
  }

  Widget _buildIconBadge(LocationStatusInfo status) {
    return Tooltip(
      message: status.tooltip,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: status.color.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Icon(
            status.icon,
            size: size * 0.6,
            color: status.color,
          ),
        ),
      ),
    );
  }

  Widget _buildLabeledBadge(LocationStatusInfo status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: status.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            status.icon,
            size: 12,
            color: status.color,
          ),
          const SizedBox(width: 4),
          Text(
            status.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: status.color,
            ),
          ),
        ],
      ),
    );
  }

  LocationStatusInfo _getStatus() {
    if (isStale) {
      return LocationStatusInfo(
        icon: FontAwesomeIcons.clockRotateLeft,
        color: Colors.grey,
        label: 'Offline',
        tooltip: 'Last updated more than 30 minutes ago',
      );
    }

    if (!locationEnabled) {
      return LocationStatusInfo(
        icon: FontAwesomeIcons.locationCrosshairs,
        color: Colors.red,
        label: 'Location Off',
        tooltip: 'Location services disabled on device',
      );
    }

    if (!hasPermission) {
      return LocationStatusInfo(
        icon: FontAwesomeIcons.lock,
        color: Colors.orange,
        label: 'No Permission',
        tooltip: 'Location permission not granted',
      );
    }

    if (!hasBackgroundPermission) {
      return LocationStatusInfo(
        icon: FontAwesomeIcons.triangleExclamation,
        color: Colors.amber,
        label: 'Background Off',
        tooltip: 'Background location permission not granted',
      );
    }

    return LocationStatusInfo(
      icon: FontAwesomeIcons.circleCheck,
      color: Colors.green,
      label: 'Active',
      tooltip: 'Location services properly configured',
    );
  }
}

class LocationStatusInfo {
  final IconData icon;
  final Color color;
  final String label;
  final String tooltip;

  LocationStatusInfo({
    required this.icon,
    required this.color,
    required this.label,
    required this.tooltip,
  });
}

/// Member Location Status Model for Admin
class MemberLocationStatus {
  final String memberId;
  final String memberName;
  final bool locationEnabled;
  final String locationPermission;
  final bool backgroundLocationEnabled;
  final String backgroundLocationPermission;
  final String locationAccuracy;
  final DateTime? lastUpdate;
  final bool appActive;

  MemberLocationStatus({
    required this.memberId,
    required this.memberName,
    required this.locationEnabled,
    required this.locationPermission,
    required this.backgroundLocationEnabled,
    required this.backgroundLocationPermission,
    required this.locationAccuracy,
    this.lastUpdate,
    required this.appActive,
  });

  factory MemberLocationStatus.fromJson(Map<String, dynamic> json) {
    return MemberLocationStatus(
      memberId: json['memberId']?['_id'] ?? json['memberId'] ?? '',
      memberName: json['memberId']?['memberName'] ?? '',
      locationEnabled: json['locationEnabled'] ?? false,
      locationPermission: json['locationPermission'] ?? 'notDetermined',
      backgroundLocationEnabled: json['backgroundLocationEnabled'] ?? false,
      backgroundLocationPermission: json['backgroundLocationPermission'] ?? 'notDetermined',
      locationAccuracy: json['locationAccuracy'] ?? 'unknown',
      lastUpdate: json['lastStatusUpdate'] != null
          ? DateTime.parse(json['lastStatusUpdate'])
          : null,
      appActive: json['appActive'] ?? false,
    );
  }

  bool get hasPermission =>
      locationPermission == 'granted' &&
      locationEnabled;

  bool get hasBackgroundPermission =>
      backgroundLocationPermission == 'granted' &&
      backgroundLocationEnabled;

  bool get isStale {
    if (lastUpdate == null) return true;
    final thirtyMinutesAgo = DateTime.now().subtract(const Duration(minutes: 30));
    return lastUpdate!.isBefore(thirtyMinutesAgo);
  }

  bool get meetsGeofenceRequirements =>
      locationEnabled &&
      hasPermission &&
      hasBackgroundPermission &&
      !isStale;

  LocationStatusSeverity get severity {
    if (isStale) return LocationStatusSeverity.warning;
    if (!locationEnabled) return LocationStatusSeverity.critical;
    if (!hasPermission) return LocationStatusSeverity.critical;
    if (!hasBackgroundPermission) return LocationStatusSeverity.warning;
    return LocationStatusSeverity.ok;
  }
}

enum LocationStatusSeverity {
  ok,
  warning,
  critical,
}

/// Location Status Summary Card for Admin Dashboard
class LocationStatusSummaryCard extends StatelessWidget {
  final int totalMembers;
  final int fullyConfigured;
  final int locationDisabled;
  final int permissionDenied;
  final int backgroundIssue;
  final VoidCallback? onTap;

  const LocationStatusSummaryCard({
    super.key,
    required this.totalMembers,
    required this.fullyConfigured,
    required this.locationDisabled,
    required this.permissionDenied,
    required this.backgroundIssue,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final issuesCount = locationDisabled + permissionDenied + backgroundIssue;
    final percentage = totalMembers > 0
        ? ((fullyConfigured / totalMembers) * 100).toInt()
        : 0;

    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: issuesCount > 0
                          ? Colors.orange.withValues(alpha: 0.1)
                          : Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      FontAwesomeIcons.locationDot,
                      color: issuesCount > 0 ? Colors.orange : Colors.green,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Location Status',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$percentage% Configured',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (issuesCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$issuesCount Issues',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              _buildStatusRow(
                'Fully Configured',
                fullyConfigured,
                Colors.green,
                FontAwesomeIcons.circleCheck,
              ),
              const SizedBox(height: 8),
              _buildStatusRow(
                'Location Disabled',
                locationDisabled,
                Colors.red,
                FontAwesomeIcons.locationCrosshairs,
              ),
              const SizedBox(height: 8),
              _buildStatusRow(
                'Permission Issues',
                permissionDenied,
                Colors.orange,
                FontAwesomeIcons.lock,
              ),
              const SizedBox(height: 8),
              _buildStatusRow(
                'Background Issues',
                backgroundIssue,
                Colors.amber,
                FontAwesomeIcons.triangleExclamation,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, int count, Color color, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13),
          ),
        ),
        Text(
          count.toString(),
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
