import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../services/location_permission_service.dart';
import '../../../config/app_theme.dart';

/// Permission Setup Dialog
/// Guides users through granting location permissions
class PermissionSetupDialog extends StatefulWidget {
  final VoidCallback onPermissionGranted;

  const PermissionSetupDialog({
    super.key,
    required this.onPermissionGranted,
  });

  @override
  State<PermissionSetupDialog> createState() => _PermissionSetupDialogState();
}

class _PermissionSetupDialogState extends State<PermissionSetupDialog> {
  bool _isChecking = false;
  String _statusMessage = 'Location permission is required for geofence attendance.';

  Future<void> _requestPermission() async {
    setState(() {
      _isChecking = true;
      _statusMessage = 'Requesting permission...';
    });

    final status = await LocationPermissionService.requestPermission();

    setState(() {
      _isChecking = false;
      _statusMessage = status.message;
    });

    if (status.canUseLocation) {
      widget.onPermissionGranted();
      Navigator.pop(context);
    } else if (status.isPermanentlyDenied) {
      _showOpenSettingsDialog();
    }
  }

  void _showOpenSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Permission Denied'),
        content: const Text(
          'Location permission is permanently denied. Please enable it in app settings to use geofence attendance.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await LocationPermissionService.openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(FontAwesomeIcons.locationDot, color: AppTheme.primaryColor),
          SizedBox(width: 12),
          Text('Location Permission Required'),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_statusMessage),
            const SizedBox(height: 20),
            const Text(
              'Why we need location permission:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _buildPermissionReason(
              FontAwesomeIcons.mapMarkerAlt,
              'Track member attendance when they enter/exit gym premises',
            ),
            _buildPermissionReason(
              FontAwesomeIcons.shield,
              'Ensure accurate location with anti-mock protection',
            ),
            _buildPermissionReason(
              FontAwesomeIcons.clock,
              'Automatically mark attendance without manual check-in',
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: const Row(
                children: [
                  Icon(FontAwesomeIcons.circleInfo, color: Colors.blue, size: 20),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'We only access location when setting up geofence and for attendance verification. Your privacy is protected.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            if (_isChecking) ...[
              const SizedBox(height: 20),
              const Center(
                child: CircularProgressIndicator(),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Skip for Now'),
        ),
        ElevatedButton(
          onPressed: _isChecking ? null : _requestPermission,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
          ),
          child: const Text('Grant Permission'),
        ),
      ],
    );
  }

  Widget _buildPermissionReason(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
        ],
      ),
    );
  }
}
