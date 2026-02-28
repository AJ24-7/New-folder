import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/app_theme.dart';

/// Location Warning Dialog
/// Shows warnings when geofence is enabled but location services are not properly configured
class LocationWarningDialog extends StatelessWidget {
  final List<LocationWarning> warnings;
  final VoidCallback onDismiss;
  final VoidCallback onOpenSettings;

  const LocationWarningDialog({
    super.key,
    required this.warnings,
    required this.onDismiss,
    required this.onOpenSettings,
  });

  /// Show the dialog
  static Future<void> show(
    BuildContext context, {
    required List<LocationWarning> warnings,
  }) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => LocationWarningDialog(
        warnings: warnings,
        onDismiss: () => Navigator.of(context).pop(),
        onOpenSettings: () {
          openAppSettings();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              FontAwesomeIcons.triangleExclamation,
              color: Colors.orange,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Location Setup Required',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your gym uses automatic attendance tracking. Please configure location services to ensure accurate attendance:',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            ...warnings.map((warning) => _buildWarningItem(warning)),
            const SizedBox(height: 16),
            _buildInfoBox(),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: onDismiss,
          child: const Text('Later'),
        ),
        ElevatedButton(
          onPressed: onOpenSettings,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Text('Open Settings'),
        ),
      ],
    );
  }

  Widget _buildWarningItem(LocationWarning warning) {
    IconData icon;
    Color color;
    
    switch (warning.type) {
      case LocationWarningType.locationDisabled:
        icon = FontAwesomeIcons.locationArrow;
        color = Colors.red;
        break;
      case LocationWarningType.permissionDenied:
        icon = FontAwesomeIcons.lock;
        color = Colors.orange;
        break;
      case LocationWarningType.backgroundPermissionDenied:
        icon = FontAwesomeIcons.clockRotateLeft;
        color = Colors.orange;
        break;
      case LocationWarningType.lowAccuracy:
        icon = FontAwesomeIcons.signalWeak;
        color = Colors.amber;
        break;
      case LocationWarningType.geofenceNotSetup:
        icon = FontAwesomeIcons.mapLocationDot;
        color = Colors.red;
        break;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: color,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  warning.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  warning.message,
                  style: TextStyle(
                    fontSize: 12,
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

  Widget _buildInfoBox() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Colors.blue.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            FontAwesomeIcons.circleInfo,
            color: Colors.blue,
            size: 16,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Location is only used for attendance tracking within gym premises',
              style: TextStyle(
                fontSize: 12,
                color: Colors.blue[800],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Location Warning Model
class LocationWarning {
  final LocationWarningType type;
  final String title;
  final String message;

  LocationWarning({
    required this.type,
    required this.title,
    required this.message,
  });

  factory LocationWarning.locationDisabled() {
    return LocationWarning(
      type: LocationWarningType.locationDisabled,
      title: 'Location Services Disabled',
      message: 'Please enable location services in your device settings',
    );
  }

  factory LocationWarning.permissionDenied() {
    return LocationWarning(
      type: LocationWarningType.permissionDenied,
      title: 'Location Permission Required',
      message: 'Allow location access to enable automatic attendance',
    );
  }

  factory LocationWarning.backgroundPermissionDenied() {
    return LocationWarning(
      type: LocationWarningType.backgroundPermissionDenied,
      title: 'Background Location Required',
      message: 'Please select "Always Allow" for location permission to track attendance when app is closed',
    );
  }

  factory LocationWarning.lowAccuracy() {
    return LocationWarning(
      type: LocationWarningType.lowAccuracy,
      title: 'Low Location Accuracy',
      message: 'Enable High Accuracy mode in location settings for better attendance tracking',
    );
  }

  factory LocationWarning.geofenceNotSetup() {
    return LocationWarning(
      type: LocationWarningType.geofenceNotSetup,
      title: 'Geofence Setup Failed',
      message: 'Unable to set up attendance tracking. Please try restarting the app',
    );
  }
}

enum LocationWarningType {
  locationDisabled,
  permissionDenied,
  backgroundPermissionDenied,
  lowAccuracy,
  geofenceNotSetup,
}

/// Persistent Bottom Banner for Location Issues
class LocationWarningBanner extends StatelessWidget {
  final String message;
  final VoidCallback onFixNow;
  final VoidCallback? onDismiss;

  const LocationWarningBanner({
    super.key,
    required this.message,
    required this.onFixNow,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        border: Border(
          top: BorderSide(
            color: Colors.orange.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            FontAwesomeIcons.triangleExclamation,
            color: Colors.orange,
            size: 16,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: onFixNow,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            child: const Text('Fix Now'),
          ),
          if (onDismiss != null) ...[
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(Icons.close, size: 16),
              onPressed: onDismiss,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ],
      ),
    );
  }
}
