import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../config/app_theme.dart';

/// Geofence Instructions Dialog
/// Provides detailed setup instructions for gym admins
class GeofenceInstructionsDialog extends StatelessWidget {
  const GeofenceInstructionsDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(FontAwesomeIcons.circleInfo, color: AppTheme.primaryColor),
          SizedBox(width: 12),
          Text('Geofence Setup Instructions'),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSection(
              'What is Geofence Attendance?',
              'Geofence attendance automatically marks members present when they enter your gym premises and records their exit time when they leave. No manual check-in required!',
              FontAwesomeIcons.mapLocationDot,
              Colors.blue,
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            
            _buildSectionTitle('Setup Steps:', FontAwesomeIcons.listCheck),
            const SizedBox(height: 12),
            
            _buildStep(
              1,
              'Choose Geofence Type',
              'Polygon: For irregular gym shapes (advanced, more accurate)\nCircular: For simple round area (easy, quick setup)',
            ),
            _buildStep(
              2,
              'Define Geofence Area',
              'Polygon: Tap on map to mark corners of your gym\nCircular: Tap center point and adjust radius slider',
            ),
            _buildStep(
              3,
              'Configure Settings',
              'Set operating hours, minimum accuracy, stay duration, and auto-mark preferences',
            ),
            _buildStep(
              4,
              'Save Configuration',
              'Click "Save Geofence Configuration" to activate the system',
            ),
            
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            
            _buildSectionTitle('Tips for Accurate Setup:', FontAwesomeIcons.lightbulb),
            const SizedBox(height: 12),
            
            _buildTip(
              'Use Polygon for Best Results',
              'Polygon geofences follow the exact shape of your gym building, preventing false attendance from nearby areas.',
              Icons.check_circle,
              Colors.green,
            ),
            _buildTip(
              'Include Entry Points',
              'Ensure all gym entrances are within the geofence area so members can check in from any entry.',
              Icons.door_front_door,
              Colors.orange,
            ),
            _buildTip(
              'Avoid Including Parking',
              'Don\'t extend geofence too far into parking areas to prevent early check-ins.',
              Icons.local_parking,
              Colors.red,
            ),
            _buildTip(
              'Set Minimum Stay Duration',
              'Recommended: 5-10 minutes to ensure members actually worked out.',
              Icons.timer,
              Colors.blue,
            ),
            
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            
            _buildSection(
              'Member App Setup Required',
              'For geofence attendance to work, members must:\n\n'
              '1. Install the GymWale member app\n'
              '2. Grant location permission (Always Allow recommended)\n'
              '3. Enable background location access\n'
              '4. Keep location services turned on\n\n'
              'Members will receive setup instructions in their app.',
              FontAwesomeIcons.mobileScreen,
              AppTheme.primaryColor,
            ),
            
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: const Row(
                children: [
                  Icon(FontAwesomeIcons.triangleExclamation, 
                    color: Colors.amber, size: 20),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Important: Test the geofence by walking around your gym with a member account before enabling it for all members.',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
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
          onPressed: () => Navigator.pop(context),
          child: const Text('Got It'),
        ),
      ],
    );
  }

  Widget _buildSection(String title, String content, IconData icon, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          content,
          style: const TextStyle(fontSize: 14, height: 1.5),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryColor, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildStep(int number, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Text(
                '$number',
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
                  style: const TextStyle(fontSize: 12, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTip(String title, String description, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: const TextStyle(fontSize: 12, height: 1.3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
