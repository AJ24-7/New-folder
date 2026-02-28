import 'package:flutter/material.dart';
import '../services/location_monitoring_service.dart';
import '../widgets/location_warning_dialog.dart';
import '../config/app_theme.dart';

/// Example: User Attendance Screen with Location Integration
/// This shows how to integrate location monitoring and warnings
class UserAttendanceScreenExample extends StatefulWidget {
  final String gymId;
  final String memberId;
  final String authToken;

  const UserAttendanceScreenExample({
    super.key,
    required this.gymId,
    required this.memberId,
    required this.authToken,
  });

  @override
  State<UserAttendanceScreenExample> createState() => _UserAttendanceScreenExampleState();
}

class _UserAttendanceScreenExampleState extends State<UserAttendanceScreenExample>
    with WidgetsBindingObserver {
  final LocationMonitoringService _locationMonitoring = LocationMonitoringService();
  
  GeofenceRequirements? _geofenceRequirements;
  LocationStatus? _currentLocationStatus;
  bool _isLoading = true;
  bool _showLocationBanner = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeLocationMonitoring();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    
    if (state == AppLifecycleState.resumed) {
      _locationMonitoring.reportAppOpened();
      _checkLocationStatus();
    } else if (state == AppLifecycleState.paused) {
      _locationMonitoring.reportAppClosed();
    }
  }

  Future<void> _initializeLocationMonitoring() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Initialize location monitoring service
      await _locationMonitoring.initialize(
        gymId: widget.gymId,
        memberId: widget.memberId,
        authToken: widget.authToken,
      );

      // Get geofence requirements
      _geofenceRequirements = await _locationMonitoring.getGeofenceRequirements();

      // Check current location status
      await _checkLocationStatus();

    } catch (e) {
      print('Error initializing location monitoring: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _checkLocationStatus() async {
    try {
      _currentLocationStatus = await _locationMonitoring.getCurrentLocationStatus();
      
      // Check if geofence is enabled and if there are issues
      if (_geofenceRequirements != null && _geofenceRequirements!.geofenceEnabled) {
        final meetsRequirements = await _locationMonitoring.meetsGeofenceRequirements();
        
        if (!meetsRequirements && mounted) {
          _showLocationWarnings();
          setState(() {
            _showLocationBanner = true;
          });
        } else {
          setState(() {
            _showLocationBanner = false;
          });
        }
      }
    } catch (e) {
      print('Error checking location status: $e');
    }
  }

  void _showLocationWarnings() {
    if (_currentLocationStatus == null) return;

    final warnings = <LocationWarning>[];

    if (!_currentLocationStatus!.locationEnabled) {
      warnings.add(LocationWarning.locationDisabled());
    }

    if (_currentLocationStatus!.locationPermission != 'granted') {
      warnings.add(LocationWarning.permissionDenied());
    }

    if (!_currentLocationStatus!.backgroundLocationEnabled ||
        _currentLocationStatus!.backgroundLocationPermission != 'granted') {
      warnings.add(LocationWarning.backgroundPermissionDenied());
    }

    if (_currentLocationStatus!.locationAccuracy == 'low') {
      warnings.add(LocationWarning.lowAccuracy());
    }

    if (warnings.isNotEmpty) {
      // Show warning dialog after a short delay to ensure UI is ready
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          LocationWarningDialog.show(context, warnings: warnings);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Attendance'),
        actions: [
          if (_geofenceRequirements != null && _geofenceRequirements!.geofenceEnabled)
            IconButton(
              icon: Icon(
                _currentLocationStatus?.meetsGeofenceRequirements ?? false
                    ? Icons.location_on
                    : Icons.location_off,
                color: _currentLocationStatus?.meetsGeofenceRequirements ?? false
                    ? Colors.green
                    : Colors.red,
              ),
              onPressed: () {
                _showLocationStatusDialog();
              },
              tooltip: 'Location Status',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Location warning banner (if issues exist)
                if (_showLocationBanner)
                  LocationWarningBanner(
                    message: 'Location services need attention for automatic attendance',
                    onFixNow: () {
                      _showLocationWarnings();
                    },
                    onDismiss: () {
                      setState(() {
                        _showLocationBanner = false;
                      });
                    },
                  ),

                // Geofence info card (if enabled)
                if (_geofenceRequirements != null && _geofenceRequirements!.geofenceEnabled)
                  _buildGeofenceInfoCard(),

                // Main attendance content
                Expanded(
                  child: _buildAttendanceContent(),
                ),
              ],
            ),
    );
  }

  Widget _buildGeofenceInfoCard() {
    final meetsRequirements = _currentLocationStatus?.meetsGeofenceRequirements ?? false;

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (meetsRequirements ? Colors.green : Colors.orange)
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.location_on,
                color: meetsRequirements ? Colors.green : Colors.orange,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    meetsRequirements
                        ? 'Automatic Attendance Active'
                        : 'Location Setup Required',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    meetsRequirements
                        ? 'Your attendance will be marked automatically when you enter the gym'
                        : 'Enable location services to use automatic attendance',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            if (!meetsRequirements)
              IconButton(
                icon: const Icon(Icons.settings),
                onPressed: () {
                  _showLocationWarnings();
                },
                tooltip: 'Fix Location',
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceContent() {
    // Your existing attendance content
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 100,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 16),
          const Text(
            'Your Attendance',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Check-in and check-out times will appear here',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  void _showLocationStatusDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Location Status'),
        content: _currentLocationStatus != null
            ? Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusRow(
                    'Location Services',
                    _currentLocationStatus!.locationEnabled,
                  ),
                  _buildStatusRow(
                    'Location Permission',
                    _currentLocationStatus!.locationPermission == 'granted',
                  ),
                  _buildStatusRow(
                    'Background Location',
                    _currentLocationStatus!.backgroundLocationEnabled,
                  ),
                  _buildStatusRow(
                    'Background Permission',
                    _currentLocationStatus!.backgroundLocationPermission == 'granted',
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Accuracy: ${_currentLocationStatus!.locationAccuracy.toUpperCase()}',
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
              )
            : const Text('Unable to get location status'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          if (_currentLocationStatus != null &&
              !_currentLocationStatus!.meetsGeofenceRequirements)
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _showLocationWarnings();
              },
              child: const Text('Fix Issues'),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, bool isEnabled) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            isEnabled ? Icons.check_circle : Icons.cancel,
            color: isEnabled ? Colors.green : Colors.red,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
    );
  }
}
