import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../models/attendance_settings.dart';
import '../../../config/app_theme.dart';

/// Attendance Settings Dialog
/// Configure attendance mode and preferences
class AttendanceSettingsDialog extends StatefulWidget {
  final AttendanceSettings? currentSettings;

  const AttendanceSettingsDialog({
    super.key,
    this.currentSettings,
  });

  @override
  State<AttendanceSettingsDialog> createState() => _AttendanceSettingsDialogState();
}

class _AttendanceSettingsDialogState extends State<AttendanceSettingsDialog> {
  late AttendanceMode _selectedMode;
  late bool _autoMarkEnabled;
  late bool _requireCheckOut;
  late bool _allowLateCheckIn;
  late bool _sendNotifications;
  late bool _trackDuration;
  late int _lateThresholdMinutes;
  
  // Geofence settings
  late bool _geofenceEnabled;
  late bool _autoMarkEntry;
  late bool _autoMarkExit;
  late bool _allowMockLocation;
  late double _geofenceRadius;
  
  @override
  void initState() {
    super.initState();
    
    if (widget.currentSettings != null) {
      _selectedMode = widget.currentSettings!.mode;
      _autoMarkEnabled = widget.currentSettings!.autoMarkEnabled;
      _requireCheckOut = widget.currentSettings!.requireCheckOut;
      _allowLateCheckIn = widget.currentSettings!.allowLateCheckIn;
      _sendNotifications = widget.currentSettings!.sendNotifications;
      _trackDuration = widget.currentSettings!.trackDuration;
      _lateThresholdMinutes = widget.currentSettings!.lateThresholdMinutes ?? 15;
      
      _geofenceEnabled = widget.currentSettings!.geofenceSettings?.enabled ?? false;
      _autoMarkEntry = widget.currentSettings!.geofenceSettings?.autoMarkEntry ?? true;
      _autoMarkExit = widget.currentSettings!.geofenceSettings?.autoMarkExit ?? true;
      _allowMockLocation = widget.currentSettings!.geofenceSettings?.allowMockLocation ?? false;
      _geofenceRadius = widget.currentSettings!.geofenceSettings?.radius ?? 100.0;
    } else {
      _selectedMode = AttendanceMode.manual;
      _autoMarkEnabled = false;
      _requireCheckOut = false;
      _allowLateCheckIn = true;
      _sendNotifications = false;
      _trackDuration = true;
      _lateThresholdMinutes = 15;
      
      _geofenceEnabled = false;
      _autoMarkEntry = true;
      _autoMarkExit = true;
      _allowMockLocation = false;
      _geofenceRadius = 100.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return Dialog(
      child: Container(
        width: isMobile ? size.width * 0.9 : 600,
        constraints: BoxConstraints(maxHeight: size.height * 0.9),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.settings, color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  const Text(
                    'Attendance Settings',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Attendance Mode Selection
                    const Text(
                      'Attendance Mode',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    _buildModeSelector(),
                    const SizedBox(height: 24),
                    
                    // General Settings
                    const Text(
                      'General Settings',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    _buildGeneralSettings(),
                    const SizedBox(height: 24),
                    
                    // Geofence Settings (if geofence mode selected)
                    if (_selectedMode == AttendanceMode.geofence ||
                        _selectedMode == AttendanceMode.hybrid) ...[
                      const Text(
                        'Geofence Settings',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      _buildGeofenceSettings(),
                    ],
                  ],
                ),
              ),
            ),
            
            // Footer
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _saveSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Save Settings'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeSelector() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: AttendanceMode.values.map((mode) {
        final isSelected = _selectedMode == mode;
        return _buildModeCard(mode, isSelected);
      }).toList(),
    );
  }

  Widget _buildModeCard(AttendanceMode mode, bool isSelected) {
    IconData icon;
    String label;
    String description;
    
    switch (mode) {
      case AttendanceMode.manual:
        icon = FontAwesomeIcons.handPointer;
        label = 'Manual';
        description = 'Mark attendance manually';
        break;
      case AttendanceMode.geofence:
        icon = FontAwesomeIcons.locationDot;
        label = 'Geofence';
        description = 'Auto-mark using location';
        break;
      case AttendanceMode.biometric:
        icon = FontAwesomeIcons.fingerprint;
        label = 'Biometric';
        description = 'Fingerprint/Face ID';
        break;
      case AttendanceMode.qr:
        icon = FontAwesomeIcons.qrcode;
        label = 'QR Code';
        description = 'Scan QR to mark';
        break;
      case AttendanceMode.hybrid:
        icon = FontAwesomeIcons.layerGroup;
        label = 'Hybrid';
        description = 'Multiple methods';
        break;
    }
    
    return InkWell(
      onTap: () {
        setState(() {
          _selectedMode = mode;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 140,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryColor.withValues(alpha: 0.1)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : Colors.grey[300]!,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? AppTheme.primaryColor : Colors.grey[600],
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: isSelected ? AppTheme.primaryColor : Colors.grey[800],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              description,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGeneralSettings() {
    return Column(
      children: [
        SwitchListTile(
          title: const Text('Auto-mark Attendance'),
          subtitle: const Text('Automatically mark attendance when conditions are met'),
          value: _autoMarkEnabled,
          onChanged: (value) {
            setState(() {
              _autoMarkEnabled = value;
            });
          },
        ),
        SwitchListTile(
          title: const Text('Require Check-out'),
          subtitle: const Text('Members must mark check-out time'),
          value: _requireCheckOut,
          onChanged: (value) {
            setState(() {
              _requireCheckOut = value;
            });
          },
        ),
        SwitchListTile(
          title: const Text('Allow Late Check-in'),
          subtitle: const Text('Members can check in after scheduled time'),
          value: _allowLateCheckIn,
          onChanged: (value) {
            setState(() {
              _allowLateCheckIn = value;
            });
          },
        ),
        if (_allowLateCheckIn) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Text('Late threshold: '),
                const SizedBox(width: 12),
                Expanded(
                  child: Slider(
                    value: _lateThresholdMinutes.toDouble(),
                    min: 5,
                    max: 60,
                    divisions: 11,
                    label: '$_lateThresholdMinutes min',
                    onChanged: (value) {
                      setState(() {
                        _lateThresholdMinutes = value.toInt();
                      });
                    },
                  ),
                ),
                Text('$_lateThresholdMinutes min'),
              ],
            ),
          ),
        ],
        SwitchListTile(
          title: const Text('Send Notifications'),
          subtitle: const Text('Notify members about attendance'),
          value: _sendNotifications,
          onChanged: (value) {
            setState(() {
              _sendNotifications = value;
            });
          },
        ),
        SwitchListTile(
          title: const Text('Track Duration'),
          subtitle: const Text('Record time spent in gym'),
          value: _trackDuration,
          onChanged: (value) {
            setState(() {
              _trackDuration = value;
            });
          },
        ),
      ],
    );
  }

  Widget _buildGeofenceSettings() {
    return Column(
      children: [
        SwitchListTile(
          title: const Text('Enable Geofencing'),
          subtitle: const Text('Use location-based attendance'),
          value: _geofenceEnabled,
          onChanged: (value) {
            setState(() {
              _geofenceEnabled = value;
            });
          },
        ),
        if (_geofenceEnabled) ...[
          SwitchListTile(
            title: const Text('Auto-mark Entry'),
            subtitle: const Text('Mark attendance when entering geofence'),
            value: _autoMarkEntry,
            onChanged: (value) {
              setState(() {
                _autoMarkEntry = value;
              });
            },
          ),
          SwitchListTile(
            title: const Text('Auto-mark Exit'),
            subtitle: const Text('Mark check-out when leaving geofence'),
            value: _autoMarkExit,
            onChanged: (value) {
              setState(() {
                _autoMarkExit = value;
              });
            },
          ),
          SwitchListTile(
            title: const Text('Allow Mock Location'),
            subtitle: const Text('Accept fake/spoofed GPS (not recommended)'),
            value: _allowMockLocation,
            onChanged: (value) {
              setState(() {
                _allowMockLocation = value;
              });
            },
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Text('Geofence radius: '),
                const SizedBox(width: 12),
                Expanded(
                  child: Slider(
                    value: _geofenceRadius,
                    min: 50,
                    max: 500,
                    divisions: 9,
                    label: '${_geofenceRadius.toInt()}m',
                    onChanged: (value) {
                      setState(() {
                        _geofenceRadius = value;
                      });
                    },
                  ),
                ),
                Text('${_geofenceRadius.toInt()}m'),
              ],
            ),
          ),
        ],
      ],
    );
  }

  void _saveSettings() {
    final settings = AttendanceSettings(
      gymId: widget.currentSettings?.gymId ?? '',
      mode: _selectedMode,
      autoMarkEnabled: _autoMarkEnabled,
      requireCheckOut: _requireCheckOut,
      allowLateCheckIn: _allowLateCheckIn,
      lateThresholdMinutes: _lateThresholdMinutes,
      sendNotifications: _sendNotifications,
      trackDuration: _trackDuration,
      geofenceSettings: (_selectedMode == AttendanceMode.geofence ||
              _selectedMode == AttendanceMode.hybrid)
          ? GeofenceSettings(
              enabled: _geofenceEnabled,
              autoMarkEntry: _autoMarkEntry,
              autoMarkExit: _autoMarkExit,
              allowMockLocation: _allowMockLocation,
              radius: _geofenceRadius,
            )
          : null,
      manualSettings: ManualAttendanceSettings(
        allowBulkMark: true,
        enableNotes: true,
      ),
    );
    
    Navigator.pop(context, settings);
  }
}
