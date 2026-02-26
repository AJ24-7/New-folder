import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'dart:async';
import '../../models/geofence_config.dart';
import '../../services/location_permission_service.dart';
import '../../services/api_service.dart';
import '../../config/app_theme.dart';
import 'widgets/permission_setup_dialog.dart';
import 'widgets/geofence_instructions_dialog.dart';

/// Geofence Setup Screen
/// Allows gym admins to set up polygon or circular geofences
class GeofenceSetupScreen extends StatefulWidget {
  const GeofenceSetupScreen({super.key});

  @override
  State<GeofenceSetupScreen> createState() => _GeofenceSetupScreenState();
}

class _GeofenceSetupScreenState extends State<GeofenceSetupScreen> {
  final ApiService _apiService = ApiService();
  GoogleMapController? _mapController;
  
  GeofenceType _selectedType = GeofenceType.polygon;
  List<LatLng> _polygonPoints = [];
  LatLng? _circleCenter;
  double _circleRadius = 100.0;
  
  LatLng _currentLocation = const LatLng(28.6139, 77.2090); // Default Delhi
  bool _isLoading = true;
  bool _hasPermission = false;
  
  // Settings
  bool _enabled = true;
  bool _autoMarkEntry = true;
  bool _autoMarkExit = true;
  bool _allowMockLocation = false;
  int _minimumAccuracy = 20;
  int _minimumStayDuration = 5;
  TimeOfDay? _operatingStart;
  TimeOfDay? _operatingEnd;

  final Set<Marker> _markers = {};
  final Set<Polygon> _polygons = {};
  final Set<Circle> _circles = {};

  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }

  Future<void> _initializeScreen() async {
    await _checkPermissions();
    await _loadCurrentLocation();
    await _loadExistingGeofence();
    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _checkPermissions() async {
    final status = await LocationPermissionService.checkPermissionStatus();
    setState(() {
      _hasPermission = status.canUseLocation;
    });

    if (!_hasPermission) {
      _showPermissionSetupDialog();
    }
  }

  void _showPermissionSetupDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PermissionSetupDialog(
        onPermissionGranted: () {
          setState(() {
            _hasPermission = true;
          });
          _loadCurrentLocation();
        },
      ),
    );
  }

  Future<void> _loadCurrentLocation() async {
    if (!_hasPermission) return;

    final location = await LocationPermissionService.getCurrentLocation();
    if (location != null) {
      setState(() {
        _currentLocation = location;
      });
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(_currentLocation, 17),
      );
    }
  }

  Future<void> _loadExistingGeofence() async {
    try {
      final response = await _apiService.getGeofenceConfig();
      if (response != null && response['success'] == true && response['data'] != null) {
        final config = GeofenceConfig.fromJson(response['data']);
        setState(() {
          _selectedType = config.type;
          _enabled = config.enabled;
          _autoMarkEntry = config.autoMarkEntry;
          _autoMarkExit = config.autoMarkExit;
          _allowMockLocation = config.allowMockLocation;
          _minimumAccuracy = config.minimumAccuracy;
          _minimumStayDuration = config.minimumStayDuration;

          if (config.operatingHoursStart != null) {
            final parts = config.operatingHoursStart!.split(':');
            _operatingStart = TimeOfDay(
              hour: int.parse(parts[0]),
              minute: int.parse(parts[1]),
            );
          }
          if (config.operatingHoursEnd != null) {
            final parts = config.operatingHoursEnd!.split(':');
            _operatingEnd = TimeOfDay(
              hour: int.parse(parts[0]),
              minute: int.parse(parts[1]),
            );
          }

          if (config.isPolygon && config.polygonCoordinates != null) {
            _polygonPoints = config.polygonCoordinates!;
            _updatePolygon();
          } else if (config.isCircular && config.center != null && config.radius != null) {
            _circleCenter = config.center;
            _circleRadius = config.radius!;
            _updateCircle();
          }
        });
      } else {
        print('No geofence config found or invalid response');
      }
    } catch (e) {
      print('Error loading geofence: $e');
      // Don't show error to user, just log it - this is expected for new setups
    }
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  void _onMapTapped(LatLng position) {
    if (_selectedType == GeofenceType.polygon) {
      setState(() {
        _polygonPoints.add(position);
        _updatePolygon();
        _addMarker(position, _polygonPoints.length);
      });
    } else {
      setState(() {
        _circleCenter = position;
        _updateCircle();
      });
    }
  }

  void _addMarker(LatLng position, int index) {
    _markers.add(
      Marker(
        markerId: MarkerId('point_$index'),
        position: position,
        draggable: true,
        onDragEnd: (newPosition) {
          setState(() {
            _polygonPoints[index - 1] = newPosition;
            _updatePolygon();
          });
        },
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: InfoWindow(title: 'Point $index'),
      ),
    );
  }

  void _updatePolygon() {
    _polygons.clear();
    if (_polygonPoints.length >= 3) {
      _polygons.add(
        Polygon(
          polygonId: const PolygonId('geofence_polygon'),
          points: _polygonPoints,
          fillColor: AppTheme.primaryColor.withValues(alpha: 0.3),
          strokeColor: AppTheme.primaryColor,
          strokeWidth: 3,
        ),
      );
    }
  }

  void _updateCircle() {
    _circles.clear();
    if (_circleCenter != null) {
      _circles.add(
        Circle(
          circleId: const CircleId('geofence_circle'),
          center: _circleCenter!,
          radius: _circleRadius,
          fillColor: AppTheme.primaryColor.withValues(alpha: 0.3),
          strokeColor: AppTheme.primaryColor,
          strokeWidth: 3,
        ),
      );
      
      _markers.clear();
      _markers.add(
        Marker(
          markerId: const MarkerId('circle_center'),
          position: _circleCenter!,
          draggable: true,
          onDragEnd: (newPosition) {
            setState(() {
              _circleCenter = newPosition;
              _updateCircle();
            });
          },
        ),
      );
    }
  }

  void _clearGeofence() {
    setState(() {
      _polygonPoints.clear();
      _circleCenter = null;
      _markers.clear();
      _polygons.clear();
      _circles.clear();
    });
  }

  Future<void> _saveGeofence() async {
    if (_selectedType == GeofenceType.polygon && _polygonPoints.length < 3) {
      _showSnackBar('Please select at least 3 points for polygon geofence', isError: true);
      return;
    }

    if (_selectedType == GeofenceType.circular && _circleCenter == null) {
      _showSnackBar('Please select a center point for circular geofence', isError: true);
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final config = GeofenceConfig(
        id: '',
        gymId: '',
        type: _selectedType,
        center: _circleCenter,
        radius: _selectedType == GeofenceType.circular ? _circleRadius : null,
        polygonCoordinates: _selectedType == GeofenceType.polygon ? _polygonPoints : null,
        enabled: _enabled,
        autoMarkEntry: _autoMarkEntry,
        autoMarkExit: _autoMarkExit,
        allowMockLocation: _allowMockLocation,
        minimumAccuracy: _minimumAccuracy,
        minimumStayDuration: _minimumStayDuration,
        operatingHoursStart: _operatingStart != null
            ? '${_operatingStart!.hour.toString().padLeft(2, '0')}:${_operatingStart!.minute.toString().padLeft(2, '0')}'
            : null,
        operatingHoursEnd: _operatingEnd != null
            ? '${_operatingEnd!.hour.toString().padLeft(2, '0')}:${_operatingEnd!.minute.toString().padLeft(2, '0')}'
            : null,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final response = await _apiService.saveGeofenceConfig(config.toJson());
      
      if (response != null && response['success'] == true) {
        _showSnackBar('Geofence saved successfully!');
      } else {
        _showSnackBar('Failed to save geofence', isError: true);
      }
    } catch (e) {
      _showSnackBar('Error saving geofence: $e', isError: true);
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  void _showInstructions() {
    showDialog(
      context: context,
      builder: (context) => const GeofenceInstructionsDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Geofence Setup'),
        actions: [
          IconButton(
            icon: const Icon(FontAwesomeIcons.circleInfo),
            onPressed: _showInstructions,
            tooltip: 'Instructions',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Controls Panel
                Card(
                  margin: const EdgeInsets.all(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Type Selection
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Geofence Type:',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                ChoiceChip(
                                  label: const Text('Polygon'),
                                  selected: _selectedType == GeofenceType.polygon,
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _selectedType = GeofenceType.polygon;
                                        _clearGeofence();
                                      });
                                    }
                                  },
                                ),
                                ChoiceChip(
                                  label: const Text('Circular'),
                                  selected: _selectedType == GeofenceType.circular,
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _selectedType = GeofenceType.circular;
                                        _clearGeofence();
                                      });
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Radius Slider (for circular)
                        if (_selectedType == GeofenceType.circular) ...[
                          Text(
                            'Radius: ${_circleRadius.toInt()}m',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Slider(
                            value: _circleRadius,
                            min: 50,
                            max: 500,
                            divisions: 45,
                            label: '${_circleRadius.toInt()}m',
                            onChanged: (value) {
                              setState(() {
                                _circleRadius = value;
                                _updateCircle();
                              });
                            },
                          ),
                        ],

                        // Polygon Points Count
                        if (_selectedType == GeofenceType.polygon) ...[
                          Text(
                            'Points: ${_polygonPoints.length} ${_polygonPoints.length < 3 ? '(minimum 3)' : ''}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                        ],

                        // Action Buttons
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ElevatedButton.icon(
                              onPressed: _clearGeofence,
                              icon: const Icon(Icons.clear_all, size: 18),
                              label: const Text('Clear'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: _loadCurrentLocation,
                              icon: const Icon(FontAwesomeIcons.locationCrosshairs, size: 16),
                              label: const Text('Location'),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () => _showSettingsDialog(),
                              icon: const Icon(Icons.settings, size: 18),
                              label: const Text('Settings'),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Map
                Expanded(
                  child: GoogleMap(
                    onMapCreated: _onMapCreated,
                    initialCameraPosition: CameraPosition(
                      target: _currentLocation,
                      zoom: 17,
                    ),
                    onTap: _onMapTapped,
                    markers: _markers,
                    polygons: _polygons,
                    circles: _circles,
                    myLocationEnabled: _hasPermission,
                    myLocationButtonEnabled: true,
                    mapType: MapType.hybrid,
                    zoomControlsEnabled: true,
                    compassEnabled: true,
                  ),
                ),

                // Save Button
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  child: ElevatedButton(
                    onPressed: _saveGeofence,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text(
                      'Save Geofence Configuration',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Geofence Settings'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SwitchListTile(
                title: const Text('Enable Geofence'),
                value: _enabled,
                onChanged: (value) {
                  setState(() {
                    _enabled = value;
                  });
                  Navigator.pop(context);
                  _showSettingsDialog();
                },
              ),
              SwitchListTile(
                title: const Text('Auto Mark Entry'),
                value: _autoMarkEntry,
                onChanged: (value) {
                  setState(() {
                    _autoMarkEntry = value;
                  });
                  Navigator.pop(context);
                  _showSettingsDialog();
                },
              ),
              SwitchListTile(
                title: const Text('Auto Mark Exit'),
                value: _autoMarkExit,
                onChanged: (value) {
                  setState(() {
                    _autoMarkExit = value;
                  });
                  Navigator.pop(context);
                  _showSettingsDialog();
                },
              ),
              SwitchListTile(
                title: const Text('Allow Mock Location (Not Recommended)'),
                value: _allowMockLocation,
                onChanged: (value) {
                  setState(() {
                    _allowMockLocation = value;
                  });
                  Navigator.pop(context);
                  _showSettingsDialog();
                },
              ),
              ListTile(
                title: const Text('Minimum Accuracy'),
                subtitle: Slider(
                  value: _minimumAccuracy.toDouble(),
                  min: 10,
                  max: 50,
                  divisions: 8,
                  label: '${_minimumAccuracy}m',
                  onChanged: (value) {
                    setState(() {
                      _minimumAccuracy = value.toInt();
                    });
                  },
                ),
                trailing: Text('${_minimumAccuracy}m'),
              ),
              ListTile(
                title: const Text('Minimum Stay Duration'),
                subtitle: Slider(
                  value: _minimumStayDuration.toDouble(),
                  min: 1,
                  max: 60,
                  divisions: 59,
                  label: '${_minimumStayDuration} min',
                  onChanged: (value) {
                    setState(() {
                      _minimumStayDuration = value.toInt();
                    });
                  },
                ),
                trailing: Text('${_minimumStayDuration} min'),
              ),
              ListTile(
                title: const Text('Operating Hours Start'),
                trailing: Text(_operatingStart != null
                    ? _operatingStart!.format(context)
                    : 'Not Set'),
                onTap: () async {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _operatingStart ?? const TimeOfDay(hour: 6, minute: 0),
                  );
                  if (time != null) {
                    setState(() {
                      _operatingStart = time;
                    });
                    Navigator.pop(context);
                    _showSettingsDialog();
                  }
                },
              ),
              ListTile(
                title: const Text('Operating Hours End'),
                trailing: Text(_operatingEnd != null
                    ? _operatingEnd!.format(context)
                    : 'Not Set'),
                onTap: () async {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _operatingEnd ?? const TimeOfDay(hour: 22, minute: 0),
                  );
                  if (time != null) {
                    setState(() {
                      _operatingEnd = time;
                    });
                    Navigator.pop(context);
                    _showSettingsDialog();
                  }
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
