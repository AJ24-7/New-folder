import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/location_permission_service.dart';
import '../legal/privacy_policy_screen.dart';
import '../legal/terms_and_conditions_screen.dart';
import 'login_screen.dart';

class RegisterGymScreen extends StatefulWidget {
  const RegisterGymScreen({super.key});

  @override
  State<RegisterGymScreen> createState() => _RegisterGymScreenState();
}

class _RegisterGymScreenState extends State<RegisterGymScreen> {
  final _formKey = GlobalKey<FormState>();
  final _authService = AuthService();
  final _picker = ImagePicker();

  final _gymNameController = TextEditingController();
  final _contactPersonController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _supportEmailController = TextEditingController();
  final _supportPhoneController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final List<String> _allDays = const [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  late final Set<String> _activeDays;

  TimeOfDay? _morningOpening;
  TimeOfDay? _morningClosing;
  TimeOfDay? _eveningOpening;
  TimeOfDay? _eveningClosing;
  XFile? _gymLogo;
  final List<XFile> _gymPhotos = [];
  final Map<String, Uint8List> _imageBytesByPath = {};

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;
  bool _isFetchingLocation = false;
  bool _isReverseGeocoding = false;
  int _currentStep = 0;
  LatLng? _selectedLocation;
  GoogleMapController? _mapController;

  static const LatLng _fallbackMapCenter = LatLng(20.5937, 78.9629);

  @override
  void initState() {
    super.initState();
    _activeDays = _allDays.toSet();
  }

  @override
  void dispose() {
    _gymNameController.dispose();
    _contactPersonController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _supportEmailController.dispose();
    _supportPhoneController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _landmarkController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _focusMapOnSelectedLocation({double zoom = 17}) async {
    final target = _selectedLocation;
    final controller = _mapController;
    if (target == null || controller == null) return;

    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: zoom),
      ),
    );
  }

  String _formatTime(TimeOfDay? t) {
    if (t == null) return 'Select time';
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  Future<void> _pickTime({
    required bool isMorning,
    required bool isOpening,
  }) async {
    final initial = TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
    );
    if (picked == null) return;

    setState(() {
      if (isMorning && isOpening) _morningOpening = picked;
      if (isMorning && !isOpening) _morningClosing = picked;
      if (!isMorning && isOpening) _eveningOpening = picked;
      if (!isMorning && !isOpening) _eveningClosing = picked;
    });
  }

  bool _hasAtLeastOneValidSlot() {
    final morningValid = _morningOpening != null && _morningClosing != null;
    final eveningValid = _eveningOpening != null && _eveningClosing != null;
    return morningValid || eveningValid;
  }

  Future<void> _pickGymLogo() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;

    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _gymLogo = picked;
      _imageBytesByPath[picked.path] = bytes;
    });
  }

  Future<void> _pickGymPhotos() async {
    final picked = await _picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;

    final newPhotos = <XFile>[];
    for (final file in picked) {
      if (_gymPhotos.length + newPhotos.length >= 5) break;
      if (_gymPhotos.any((p) => p.path == file.path)) continue;
      newPhotos.add(file);
    }

    for (final file in newPhotos) {
      _imageBytesByPath[file.path] = await file.readAsBytes();
    }

    if (!mounted) return;
    setState(() {
      _gymPhotos.addAll(newPhotos);
    });
  }

  Future<void> _useCurrentLocation() async {
    if (_isFetchingLocation) return;
    setState(() => _isFetchingLocation = true);

    try {
      final permission = await LocationPermissionService.requestPermission();
      if (!permission.canUseLocation) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(permission.message),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }

      final coords = await LocationPermissionService.getCurrentLocation();
      if (coords == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to fetch current location. Ensure GPS/location services are ON, then try again.'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }

      await _setSelectedLocation(
        LatLng(coords.latitude, coords.longitude),
        showSuccessMessage: true,
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not fetch current location right now.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isFetchingLocation = false);
      }
    }
  }

  Future<void> _setSelectedLocation(
    LatLng latLng, {
    bool showSuccessMessage = false,
  }) async {
    if (!mounted) return;
    setState(() {
      _selectedLocation = latLng;
      _isReverseGeocoding = true;
    });

    await _focusMapOnSelectedLocation();

    List<Placemark> places = const [];
    Placemark? place;
    try {
      places = await placemarkFromCoordinates(latLng.latitude, latLng.longitude);
      if (places.isNotEmpty) {
        place = places.first;
      }
    } catch (_) {
      // Keep manual fallback values if reverse geocoding fails.
    }

    final fallbackAddressData = await _reverseGeocodeWithNominatim(latLng);

    if (!mounted) return;

    final p = place;
    final addressParts = <String>[
      p?.name ?? '',
      p?.street ?? '',
      p?.subLocality ?? '',
      p?.locality ?? '',
      p?.subAdministrativeArea ?? '',
      p?.administrativeArea ?? '',
    ].where((e) => e.trim().isNotEmpty).toList();

    final fallbackAddress =
        'Lat: ${latLng.latitude.toStringAsFixed(6)}, Lng: ${latLng.longitude.toStringAsFixed(6)}';

    String firstNonEmpty(List<String> values) {
      for (final value in values) {
        final v = value.trim();
        if (v.isNotEmpty) return v;
      }
      return '';
    }

    String firstNonEmptyFromPlacemark(Iterable<String?> Function(Placemark p) selector) {
      for (final candidate in places) {
        for (final raw in selector(candidate)) {
          final value = (raw ?? '').trim();
          if (value.isNotEmpty) return value;
        }
      }
      return '';
    }

    setState(() {
      final resolvedAddress = firstNonEmpty([
        addressParts.join(', '),
        fallbackAddressData['address'] ?? '',
      ]);
      _addressController.text = resolvedAddress.isNotEmpty ? resolvedAddress : fallbackAddress;

      final resolvedCity = firstNonEmptyFromPlacemark(
        (x) => [x.locality, x.subAdministrativeArea, x.subLocality],
      );
      final cityFromFallback = fallbackAddressData['city'] ?? '';
      final finalCity = firstNonEmpty([resolvedCity, cityFromFallback]);
      if (finalCity.isNotEmpty) {
        _cityController.text = finalCity;
      }

      final resolvedState = firstNonEmptyFromPlacemark(
        (x) => [x.administrativeArea, x.subAdministrativeArea],
      );
      final stateFromFallback = fallbackAddressData['state'] ?? '';
      final finalState = firstNonEmpty([resolvedState, stateFromFallback]);
      if (finalState.isNotEmpty) {
        _stateController.text = finalState;
      }

      final resolvedPincode = firstNonEmptyFromPlacemark(
        (x) => [x.postalCode],
      );
      final pincodeFromFallback = fallbackAddressData['pincode'] ?? '';
      final finalPincode = firstNonEmpty([resolvedPincode, pincodeFromFallback]);
      if (finalPincode.isNotEmpty) {
        _pincodeController.text = finalPincode;
      }

      final resolvedLandmark = firstNonEmpty([
        (p?.name ?? p?.subLocality ?? '').trim(),
        fallbackAddressData['landmark'] ?? '',
      ]);
      if (resolvedLandmark.isNotEmpty) {
        _landmarkController.text = resolvedLandmark;
      }

      _isReverseGeocoding = false;
    });

    if (showSuccessMessage) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            p == null && fallbackAddressData.isEmpty
                ? 'Location selected. Coordinates added. You can refine on map.'
                : 'Address auto-filled from current location.',
          ),
        ),
      );
    }
  }

  Future<Map<String, String>> _reverseGeocodeWithNominatim(LatLng latLng) async {
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
        'lat': latLng.latitude.toString(),
        'lon': latLng.longitude.toString(),
        'format': 'jsonv2',
        'addressdetails': '1',
      });

      final response = await http.get(
        uri,
        headers: const {
          'Accept': 'application/json',
          'User-Agent': 'GymWaleAdminApp/1.0',
        },
      );

      if (response.statusCode != 200) {
        return <String, String>{};
      }

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        return <String, String>{};
      }

      final address = decoded['address'];
      final addressMap = address is Map ? address.cast<String, dynamic>() : <String, dynamic>{};

      String pick(List<String> keys) {
        for (final key in keys) {
          final value = (addressMap[key] ?? '').toString().trim();
          if (value.isNotEmpty) return value;
        }
        return '';
      }

      final houseNumber = pick(['house_number']);
      final road = pick(['road', 'pedestrian', 'footway', 'street']);
      final suburb = pick(['suburb', 'neighbourhood', 'quarter', 'city_district']);
      final city = pick(['city', 'town', 'village', 'municipality', 'county']);
      final state = pick(['state', 'region']);
      final pincode = pick(['postcode']);
      final landmark = pick(['attraction', 'building', 'amenity', 'hamlet']);
      final displayName = (decoded['display_name'] ?? '').toString().trim();

      final stitchedAddress = [houseNumber, road, suburb, city].where((e) => e.trim().isNotEmpty).join(', ');

      return <String, String>{
        'address': stitchedAddress.isNotEmpty ? stitchedAddress : displayName,
        'city': city,
        'state': state,
        'pincode': pincode,
        'landmark': landmark,
      };
    } catch (_) {
      return <String, String>{};
    }
  }

  bool _validateStep(int step) {
    switch (step) {
      case 0:
        final requiredControllers = [
          _gymNameController,
          _contactPersonController,
          _emailController,
          _phoneController,
          _supportEmailController,
          _supportPhoneController,
        ];
        final hasMissing = requiredControllers.any((c) => c.text.trim().isEmpty);
        if (hasMissing) {
          _showError('Please fill all required basic details.');
          return false;
        }
        return true;
      case 1:
        if (_selectedLocation == null) {
          _showError('Please select your gym location on map.');
          return false;
        }
        final requiredControllers = [
          _addressController,
          _cityController,
          _stateController,
          _pincodeController,
        ];
        final hasMissing = requiredControllers.any((c) => c.text.trim().isEmpty);
        if (hasMissing) {
          _showError('Please complete address details.');
          return false;
        }
        return true;
      case 2:
        if (_activeDays.isEmpty) {
          _showError('Select at least one active day.');
          return false;
        }
        if (!_hasAtLeastOneValidSlot()) {
          _showError('Add at least one operating slot (morning or evening).');
          return false;
        }
        return true;
      case 3:
        if (_gymPhotos.length < 2) {
          _showError('Please upload at least 2 gym photos.');
          return false;
        }
        return true;
      case 4:
        if (_passwordController.text != _confirmPasswordController.text) {
          _showError('Passwords do not match.');
          return false;
        }
        if (_passwordController.text.length < 8) {
          _showError('Password must be at least 8 characters.');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
      ),
    );
  }

  void _onStepContinue() {
    if (!_validateStep(_currentStep)) return;
    if (_currentStep == 4) {
      _submit();
      return;
    }
    setState(() => _currentStep += 1);
  }

  void _onStepCancel() {
    if (_currentStep == 0) return;
    setState(() => _currentStep -= 1);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passwords do not match.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    if (_activeDays.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select at least one active day.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    if (!_hasAtLeastOneValidSlot()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add at least one operating slot (morning or evening).'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    if (_gymPhotos.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please upload at least 2 gym photos.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = <String, dynamic>{
      'gymName': _gymNameController.text.trim(),
      'contactPerson': _contactPersonController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'supportEmail': _supportEmailController.text.trim(),
      'supportPhone': _supportPhoneController.text.trim(),
      'description': _descriptionController.text.trim(),
      'address': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'pincode': _pincodeController.text.trim(),
      'landmark': _landmarkController.text.trim(),
      'latitude': _selectedLocation?.latitude,
      'longitude': _selectedLocation?.longitude,
      'password': _passwordController.text,
      'morningOpening': _morningOpening == null ? null : _formatTime(_morningOpening),
      'morningClosing': _morningClosing == null ? null : _formatTime(_morningClosing),
      'eveningOpening': _eveningOpening == null ? null : _formatTime(_eveningOpening),
      'eveningClosing': _eveningClosing == null ? null : _formatTime(_eveningClosing),
      'activeDays': _allDays.where((d) => _activeDays.contains(d)).toList(),
    };

    final result = await _authService.registerGym(
      payload: payload,
      logoFile: _gymLogo,
      gymImages: _gymPhotos,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result['success'] == true) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Registration Submitted'),
          content: Text(
            result['message']?.toString() ??
                'Your gym registration is submitted and pending super admin approval.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
              child: const Text('Go to Login'),
            ),
          ],
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result['message']?.toString() ?? 'Registration failed.'),
        backgroundColor: AppTheme.errorColor,
      ),
    );
  }

  InputDecoration _dec(String label) {
    return InputDecoration(
      labelText: label,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Register Gym With Gym-Wale'),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
                : [Colors.white, const Color(0xFFF8FAFC)],
          ),
        ),
        child: SafeArea(
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Mandatory Registration Details',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Complete all required steps before submitting for approval.',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 20),
                Stepper(
                  currentStep: _currentStep,
                  type: StepperType.vertical,
                  onStepContinue: _isSubmitting ? null : _onStepContinue,
                  onStepCancel: _isSubmitting ? null : _onStepCancel,
                  onStepTapped: (index) {
                    if (_isSubmitting) return;
                    setState(() => _currentStep = index);
                  },
                  controlsBuilder: (context, details) {
                    final isLast = _currentStep == 4;
                    return Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _isSubmitting ? null : details.onStepContinue,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                              ),
                              child: _isSubmitting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(isLast ? 'Submit For Approval' : 'Continue'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          TextButton(
                            onPressed: _isSubmitting ? null : details.onStepCancel,
                            child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                          ),
                        ],
                      ),
                    );
                  },
                  steps: [
                    Step(
                      title: const Text('Basic Details'),
                      isActive: _currentStep >= 0,
                      content: Column(
                        children: [
                          TextFormField(
                            controller: _gymNameController,
                            decoration: _dec('Gym Name *'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _contactPersonController,
                            decoration: _dec('Contact Person *'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _descriptionController,
                            minLines: 2,
                            maxLines: 4,
                            decoration: _dec('Gym Description (Optional)'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: _dec('Admin Email *'),
                            validator: (v) {
                              final s = (v ?? '').trim();
                              if (s.isEmpty) return 'Required';
                              if (!s.contains('@') || !s.contains('.')) return 'Enter valid email';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: _dec('Admin Phone *'),
                            validator: (v) {
                              final s = (v ?? '').trim();
                              if (s.isEmpty) return 'Required';
                              if (s.length < 10) return 'Enter valid phone number';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _supportEmailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: _dec('Support Email *'),
                            validator: (v) {
                              final s = (v ?? '').trim();
                              if (s.isEmpty) return 'Required';
                              if (!s.contains('@') || !s.contains('.')) return 'Enter valid email';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _supportPhoneController,
                            keyboardType: TextInputType.phone,
                            decoration: _dec('Support Phone *'),
                            validator: (v) {
                              final s = (v ?? '').trim();
                              if (s.isEmpty) return 'Required';
                              if (s.length < 10) return 'Enter valid phone number';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    Step(
                      title: const Text('Address'),
                      isActive: _currentStep >= 1,
                      content: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: _isFetchingLocation ? null : _useCurrentLocation,
                              icon: _isFetchingLocation
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.my_location),
                              label: const Text('Use Current Location'),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            height: 190,
                            decoration: BoxDecoration(
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Stack(
                              children: [
                                GoogleMap(
                                  onMapCreated: (controller) {
                                    _mapController = controller;
                                    _focusMapOnSelectedLocation();
                                  },
                                  initialCameraPosition: CameraPosition(
                                    target: _selectedLocation ?? _fallbackMapCenter,
                                    zoom: _selectedLocation == null ? 4.5 : 16,
                                  ),
                                  myLocationEnabled: true,
                                  myLocationButtonEnabled: false,
                                  zoomControlsEnabled: false,
                                  onTap: (latLng) {
                                    _setSelectedLocation(latLng);
                                  },
                                  markers: {
                                    if (_selectedLocation != null)
                                      Marker(
                                        markerId: const MarkerId('selected-gym-location'),
                                        position: _selectedLocation!,
                                        draggable: true,
                                        onDragEnd: (latLng) => _setSelectedLocation(latLng),
                                      ),
                                  },
                                  gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                                    Factory<OneSequenceGestureRecognizer>(
                                      () => EagerGestureRecognizer(),
                                    ),
                                  },
                                ),
                                if (_selectedLocation == null)
                                  Positioned.fill(
                                    child: ColoredBox(
                                      color: Colors.black.withValues(alpha: 0.04),
                                      child: const Center(
                                        child: Text(
                                          'Tap on map or use current location',
                                          style: TextStyle(fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                    ),
                                  ),
                                if (_isReverseGeocoding)
                                  const Positioned(
                                    top: 10,
                                    right: 10,
                                    child: SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _selectedLocation == null
                                ? 'No map location selected yet.'
                                : 'Lat: ${_selectedLocation!.latitude.toStringAsFixed(6)}, Lng: ${_selectedLocation!.longitude.toStringAsFixed(6)}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _addressController,
                            decoration: _dec('Address *'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _cityController,
                            decoration: _dec('City *'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _stateController,
                            decoration: _dec('State *'),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _pincodeController,
                            keyboardType: TextInputType.number,
                            decoration: _dec('Pincode *'),
                            validator: (v) {
                              final s = (v ?? '').trim();
                              if (s.isEmpty) return 'Required';
                              if (s.length < 5) return 'Enter valid pincode';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _landmarkController,
                            decoration: _dec('Landmark (Optional)'),
                          ),
                        ],
                      ),
                    ),
                    Step(
                      title: const Text('Operating Hours'),
                      isActive: _currentStep >= 2,
                      content: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _timeRow(
                            title: 'Morning Slot',
                            opening: _formatTime(_morningOpening),
                            closing: _formatTime(_morningClosing),
                            onPickOpening: () => _pickTime(isMorning: true, isOpening: true),
                            onPickClosing: () => _pickTime(isMorning: true, isOpening: false),
                          ),
                          const SizedBox(height: 8),
                          _timeRow(
                            title: 'Evening Slot',
                            opening: _formatTime(_eveningOpening),
                            closing: _formatTime(_eveningClosing),
                            onPickOpening: () => _pickTime(isMorning: false, isOpening: true),
                            onPickClosing: () => _pickTime(isMorning: false, isOpening: false),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Active Days *',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _allDays.map((day) {
                              final selected = _activeDays.contains(day);
                              return FilterChip(
                                label: Text(day[0].toUpperCase() + day.substring(1, 3)),
                                selected: selected,
                                onSelected: (v) {
                                  setState(() {
                                    if (v) {
                                      _activeDays.add(day);
                                    } else {
                                      _activeDays.remove(day);
                                    }
                                  });
                                },
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                    Step(
                      title: const Text('Photos & Logo'),
                      isActive: _currentStep >= 3,
                      content: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          OutlinedButton.icon(
                            onPressed: _pickGymLogo,
                            icon: const Icon(Icons.add_a_photo_outlined),
                            label: Text(_gymLogo == null ? 'Upload Gym Logo (Optional)' : 'Change Gym Logo'),
                          ),
                          if (_gymLogo != null) ...[
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.memory(
                                _imageBytesByPath[_gymLogo!.path] ?? Uint8List(0),
                                width: 90,
                                height: 90,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const SizedBox(
                                  width: 90,
                                  height: 90,
                                  child: ColoredBox(color: Color(0xFFE5E7EB)),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: _pickGymPhotos,
                            icon: const Icon(Icons.photo_library_outlined),
                            label: const Text('Upload Gym Photos (Min 2 Required)'),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Selected: ${_gymPhotos.length}/5',
                            style: const TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 10),
                          if (_gymPhotos.isNotEmpty)
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _gymPhotos.map((file) {
                                final bytes = _imageBytesByPath[file.path] ?? Uint8List(0);
                                return Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.memory(
                                        bytes,
                                        width: 88,
                                        height: 88,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const SizedBox(
                                          width: 88,
                                          height: 88,
                                          child: ColoredBox(color: Color(0xFFE5E7EB)),
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      right: 0,
                                      top: 0,
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            _gymPhotos.removeWhere((p) => p.path == file.path);
                                            _imageBytesByPath.remove(file.path);
                                          });
                                        },
                                        child: Container(
                                          decoration: const BoxDecoration(
                                            color: Colors.black54,
                                            shape: BoxShape.circle,
                                          ),
                                          padding: const EdgeInsets.all(2),
                                          child: const Icon(Icons.close, color: Colors.white, size: 14),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                        ],
                      ),
                    ),
                    Step(
                      title: const Text('Security'),
                      isActive: _currentStep >= 4,
                      content: Column(
                        children: [
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: _dec('Create Password *').copyWith(
                              suffixIcon: IconButton(
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                              ),
                            ),
                            validator: (v) {
                              final s = v ?? '';
                              if (s.isEmpty) return 'Required';
                              if (s.length < 8) return 'Minimum 8 characters required';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _confirmPasswordController,
                            obscureText: _obscureConfirmPassword,
                            decoration: _dec('Confirm Password *').copyWith(
                              suffixIcon: IconButton(
                                onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                                icon: Icon(_obscureConfirmPassword ? Icons.visibility : Icons.visibility_off),
                              ),
                            ),
                            validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Note: Remember this password. This password will be used once your gym is approved.',
                              style: TextStyle(fontSize: 12.5),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            alignment: WrapAlignment.start,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 4,
                            runSpacing: 2,
                            children: [
                              Text(
                                'By submitting, you agree to our',
                                style: TextStyle(
                                  color: isDark ? Colors.white70 : const Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                              TextButton(
                                style: TextButton.styleFrom(
                                  minimumSize: const Size(0, 24),
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const TermsAndConditionsScreen(),
                                    ),
                                  );
                                },
                                child: const Text('Terms & Conditions'),
                              ),
                              Text(
                                'and',
                                style: TextStyle(
                                  color: isDark ? Colors.white70 : const Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                              TextButton(
                                style: TextButton.styleFrom(
                                  minimumSize: const Size(0, 24),
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const PrivacyPolicyScreen(),
                                    ),
                                  );
                                },
                                child: const Text('Privacy Policy'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  },
                  child: const Text('Already registered? Login'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _timeRow({
    required String title,
    required String opening,
    required String closing,
    required VoidCallback onPickOpening,
    required VoidCallback onPickClosing,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onPickOpening,
                    child: Text('Open: $opening'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: onPickClosing,
                    child: Text('Close: $closing'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
