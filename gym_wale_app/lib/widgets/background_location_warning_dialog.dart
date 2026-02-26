import 'package:flutter/material.dart';
import '../services/geofencing_service.dart';

/// Warning dialog to prompt users to enable "Always" location permission
/// when gym uses geofence-based attendance marking
class BackgroundLocationWarningDialog extends StatelessWidget {
  final String gymName;
  final VoidCallback? onSettingsPressed;
  final VoidCallback? onDismiss;

  const BackgroundLocationWarningDialog({
    Key? key,
    required this.gymName,
    this.onSettingsPressed,
    this.onDismiss,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.location_on,
              color: Colors.orange.shade700,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Background Location Required',
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
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color: Colors.orange.shade700,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Important: Enable "Always" Location',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.orange.shade900,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '$gymName uses automatic attendance marking with geofencing.',
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'To track your attendance automatically when you enter and exit the gym, you need to:',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            _buildStep(
              '1',
              'Enable "Allow all the time" or "Always" for location access',
              Colors.blue,
            ),
            const SizedBox(height: 8),
            _buildStep(
              '2',
              'Keep location services enabled on your device',
              Colors.green,
            ),
            const SizedBox(height: 8),
            _buildStep(
              '3',
              'Ensure the app isn\'t restricted by battery optimization',
              Colors.purple,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Colors.blue.shade700,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your location is only used when you\'re near the gym. We respect your privacy.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue.shade900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            if (onDismiss != null) {
              onDismiss!();
            }
          },
          child: const Text(
            'Later',
            style: TextStyle(color: Colors.grey),
          ),
        ),
        ElevatedButton.icon(
          onPressed: () async {
            Navigator.of(context).pop();
            if (onSettingsPressed != null) {
              onSettingsPressed!();
            }
          },
          icon: const Icon(Icons.settings),
          label: const Text('Open Settings'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep(String number, String text, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            number,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Show the warning dialog
  static Future<void> show({
    required BuildContext context,
    required String gymName,
    required GeofencingService geofencingService,
  }) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => BackgroundLocationWarningDialog(
        gymName: gymName,
        onSettingsPressed: () async {
          // Open app settings to allow user to change location permission
          await geofencingService.openAppSettings();
        },
      ),
    );
  }

  /// Check if we should show the warning dialog
  static Future<bool> shouldShow({
    required GeofencingService geofencingService,
    required bool geofenceEnabled,
  }) async {
    if (!geofenceEnabled) {
      return false; // No need to show if geofence is disabled
    }

    // Check current permission status
    final permissionStatus = await geofencingService.getPermissionStatus();
    
    // Show warning if permission is not "always"
    return permissionStatus != 'always';
  }
}
