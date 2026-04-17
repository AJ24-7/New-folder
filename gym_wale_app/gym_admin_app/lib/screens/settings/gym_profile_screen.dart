// lib/screens/settings/gym_profile_screen.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../models/gym_profile.dart';
import '../../services/gym_service.dart';
import '../../services/location_permission_service.dart';
import '../../config/app_theme.dart';

class GymProfileScreen extends StatefulWidget {
  const GymProfileScreen({super.key});

  @override
  State<GymProfileScreen> createState() => _GymProfileScreenState();
}

class _GymProfileScreenState extends State<GymProfileScreen> {
  final GymService _gymService = GymService();
  final _formKey = GlobalKey<FormState>();
  
  GymProfile? _gymProfile;
  bool _isLoading = true;
  bool _isEditing = false;
  bool _isSaving = false;
  
  // Controllers
  final _gymNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _contactPersonController = TextEditingController();
  final _supportEmailController = TextEditingController();
  final _supportPhoneController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _currentPasswordController = TextEditingController();

  LatLng? _selectedLocation;
  GoogleMapController? _mapController;
  bool _isFetchingLocation = false;
  bool _isReverseGeocoding = false;
  static const LatLng _fallbackMapCenter = LatLng(20.5937, 78.9629);
  
  // Morning slot times
  TimeOfDay? _morningOpening;
  TimeOfDay? _morningClosing;
  
  // Evening slot times
  TimeOfDay? _eveningOpening;
  TimeOfDay? _eveningClosing;

  // Active days of the week
  static const List<String> _allDays = [
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday',
  ];
  late List<String> _activeDays;
  
  XFile? _logoFile;
  Uint8List? _logoBytes;
  
  @override
  void initState() {
    super.initState();
    _activeDays = List<String>.from(_allDays); // default: all days
    _loadProfile();
  }
  
  @override
  void dispose() {
    _gymNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _contactPersonController.dispose();
    _supportEmailController.dispose();
    _supportPhoneController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _landmarkController.dispose();
    _currentPasswordController.dispose();
    _mapController?.dispose();
    super.dispose();
  }
  
  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    
    try {
      final profile = await _gymService.getMyProfile();
      
      setState(() {
        _gymProfile = profile;
        _populateFields();
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showError('Failed to load profile: $e');
      }
    }
  }
  
  void _populateFields() {
    if (_gymProfile == null) return;
    
    _gymNameController.text = _gymProfile!.gymName;
    _emailController.text = _gymProfile!.email;
    _phoneController.text = _gymProfile!.phone;
    _contactPersonController.text = _gymProfile!.contactPerson ?? '';
    _supportEmailController.text = _gymProfile!.supportEmail ?? '';
    _supportPhoneController.text = _gymProfile!.supportPhone ?? '';
    _descriptionController.text = _gymProfile!.description ?? '';
    _addressController.text = _gymProfile!.location?.address ?? '';
    _cityController.text = _gymProfile!.location?.city ?? '';
    _stateController.text = _gymProfile!.location?.state ?? '';
    _pincodeController.text = _gymProfile!.location?.pincode ?? '';
    _landmarkController.text = _gymProfile!.location?.landmark ?? '';

    final lat = _gymProfile!.location?.latitude;
    final lng = _gymProfile!.location?.longitude;
    _selectedLocation = (lat != null && lng != null) ? LatLng(lat, lng) : null;
    
    // Parse morning and evening operating hours
    if (_gymProfile!.operatingHours?.morning?.opening != null) {
      final parts = _gymProfile!.operatingHours!.morning!.opening!.split(':');
      _morningOpening = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    
    if (_gymProfile!.operatingHours?.morning?.closing != null) {
      final parts = _gymProfile!.operatingHours!.morning!.closing!.split(':');
      _morningClosing = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    
    if (_gymProfile!.operatingHours?.evening?.opening != null) {
      final parts = _gymProfile!.operatingHours!.evening!.opening!.split(':');
      _eveningOpening = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    
    if (_gymProfile!.operatingHours?.evening?.closing != null) {
      final parts = _gymProfile!.operatingHours!.evening!.closing!.split(':');
      _eveningClosing = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }

    // Active days
    _activeDays = List<String>.from(_gymProfile!.activeDays);
  }
  
  Future<void> _pickLogo() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    
    if (image != null) {
      // Read bytes for preview (works on both mobile and web)
      final bytes = await image.readAsBytes();
      setState(() {
        _logoFile = image;
        _logoBytes = bytes;
      });
    }
  }
  
  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_currentPasswordController.text.isEmpty) {
      _showError('Current password is required to update profile');
      return;
    }
    
    setState(() => _isSaving = true);
    
    try {
      final updatedProfile = await _gymService.updateMyProfile(
        currentPassword: _currentPasswordController.text,
        gymName: _gymNameController.text,
        email: _emailController.text,
        phone: _phoneController.text,
        contactPerson: _contactPersonController.text,
        supportEmail: _supportEmailController.text,
        supportPhone: _supportPhoneController.text,
        description: _descriptionController.text,
        address: _addressController.text,
        city: _cityController.text,
        state: _stateController.text,
        pincode: _pincodeController.text,
        landmark: _landmarkController.text.isEmpty ? null : _landmarkController.text,
        latitude: _selectedLocation?.latitude,
        longitude: _selectedLocation?.longitude,
        morningOpening: _morningOpening != null 
          ? '${_morningOpening!.hour.toString().padLeft(2, '0')}:${_morningOpening!.minute.toString().padLeft(2, '0')}'
          : null,
        morningClosing: _morningClosing != null
          ? '${_morningClosing!.hour.toString().padLeft(2, '0')}:${_morningClosing!.minute.toString().padLeft(2, '0')}'
          : null,
        eveningOpening: _eveningOpening != null
          ? '${_eveningOpening!.hour.toString().padLeft(2, '0')}:${_eveningOpening!.minute.toString().padLeft(2, '0')}'
          : null,
        eveningClosing: _eveningClosing != null
          ? '${_eveningClosing!.hour.toString().padLeft(2, '0')}:${_eveningClosing!.minute.toString().padLeft(2, '0')}'
          : null,
        activeDays: _activeDays,
        logoFile: _logoFile,
      );
      
      setState(() {
        _gymProfile = updatedProfile;
        _isEditing = false;
        _isSaving = false;
        _currentPasswordController.clear();
        _logoFile = null;
        _logoBytes = null;
      });
      
      _showSuccess('Profile updated successfully');
    } catch (e) {
      setState(() => _isSaving = false);
      _showError(e.toString().replaceAll('Exception: ', ''));
    }
  }
  
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
  
  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _focusMapOnSelectedLocation({double zoom = 16}) async {
    final target = _selectedLocation;
    final controller = _mapController;
    if (target == null || controller == null) return;

    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: zoom),
      ),
    );
  }

  Future<void> _useCurrentLocation() async {
    if (_isFetchingLocation) return;
    setState(() => _isFetchingLocation = true);

    try {
      final permission = await LocationPermissionService.requestPermission();
      if (!permission.canUseLocation) {
        if (!mounted) return;
        _showError(permission.message);
        return;
      }

      final coords = await LocationPermissionService.getCurrentLocation();
      if (coords == null) {
        if (!mounted) return;
        _showError('Unable to fetch current location. Ensure GPS/location services are ON, then try again.');
        return;
      }

      await _setSelectedLocation(
        LatLng(coords.latitude, coords.longitude),
        showSuccessMessage: true,
      );
    } catch (_) {
      if (!mounted) return;
      _showError('Could not fetch current location right now.');
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
      _showSuccess(
        p == null && fallbackAddressData.isEmpty
            ? 'Location selected. Coordinates added. You can refine on map.'
            : 'Address auto-filled from current location.',
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
  
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkBackgroundColor : AppTheme.backgroundColor,
      body: Column(
        children: [
          // Top Navigation Bar
          Container(
            padding: EdgeInsets.only(
              top: topPadding > 0 ? topPadding + 8 : 16,
              bottom: 16,
              left: 12,
              right: 12,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF3730A3), const Color(0xFF5B21B6)]
                    : [AppTheme.primaryColor, AppTheme.secondaryColor],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withValues(alpha: 0.35),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const FaIcon(FontAwesomeIcons.arrowLeft, size: 20, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                ),
                Expanded(
                  child: Row(
                    children: [
                      FaIcon(
                        FontAwesomeIcons.building,
                        color: Colors.white,
                        size: isMobile ? 20 : 24,
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          'Gym Profile',
                          style: TextStyle(
                            fontSize: isMobile ? 18 : 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (!_isEditing && !_isLoading)
                  IconButton(
                    icon: const FaIcon(FontAwesomeIcons.penToSquare, size: 20, color: Colors.white),
                    onPressed: () => setState(() => _isEditing = true),
                    tooltip: 'Edit Profile',
                  ),
                if (_isEditing) ...[
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isEditing = false;
                        _populateFields();
                        _currentPasswordController.clear();
                        _logoFile = null;
                        _logoBytes = null;
                      });
                    },
                    child: const Text('Cancel', style: TextStyle(color: Colors.white)),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: _isSaving ? null : _saveProfile,
                    child: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Save', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ],
            ),
          ),
          // Content
          Expanded(
            child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _gymProfile == null
              ? const Center(child: Text('Failed to load profile'))
              : RefreshIndicator(
                  onRefresh: _loadProfile,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLogoSection(),
                          const SizedBox(height: 24),
                          _buildBasicInfoSection(),
                          const SizedBox(height: 24),
                          _buildContactSection(),
                          const SizedBox(height: 24),
                          _buildLocationSection(),
                          const SizedBox(height: 24),
                          _buildTimingsSection(),
                          const SizedBox(height: 24),
                          if (_isEditing) _buildPasswordSection(),
                        ],
                      ),
                    ),
                  ),
                ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildLogoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            CircleAvatar(
              radius: 60,
              backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
              backgroundImage: _logoBytes != null
                  ? MemoryImage(_logoBytes!)
                  : (_gymProfile?.logoUrl != null
                      ? NetworkImage(_gymProfile!.logoUrl!)
                      : null) as ImageProvider?,
              child: _logoBytes == null && _gymProfile?.logoUrl == null
                  ? const Icon(Icons.business, size: 60)
                  : null,
            ),
            if (_isEditing) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _pickLogo,
                icon: const Icon(Icons.upload),
                label: const Text('Change Logo'),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Widget _buildBasicInfoSection() {
    return _buildSection(
      title: 'Basic Information',
      icon: Icons.info_outline,
      children: [
        _buildTextField(
          controller: _gymNameController,
          label: 'Gym Name',
          icon: Icons.business,
          validator: (value) => value?.isEmpty ?? true ? 'Gym name is required' : null,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _emailController,
          label: 'Email',
          icon: Icons.email,
          keyboardType: TextInputType.emailAddress,
          validator: (value) {
            if (value?.isEmpty ?? true) return 'Email is required';
            if (!value!.contains('@')) return 'Invalid email';
            return null;
          },
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _phoneController,
          label: 'Phone',
          icon: Icons.phone,
          keyboardType: TextInputType.phone,
          validator: (value) => value?.isEmpty ?? true ? 'Phone is required' : null,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _descriptionController,
          label: 'Description',
          icon: Icons.description,
          maxLines: 3,
        ),
      ],
    );
  }
  
  Widget _buildContactSection() {
    return _buildSection(
      title: 'Contact Information',
      icon: Icons.contact_phone,
      children: [
        _buildTextField(
          controller: _contactPersonController,
          label: 'Contact Person',
          icon: Icons.person,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _supportEmailController,
          label: 'Support Email',
          icon: Icons.support_agent,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _supportPhoneController,
          label: 'Support Phone',
          icon: Icons.phone_in_talk,
          keyboardType: TextInputType.phone,
        ),
      ],
    );
  }
  
  Widget _buildLocationSection() {
    final hasStoredCoordinates = _selectedLocation != null;

    return _buildSection(
      title: 'Location',
      icon: Icons.location_on,
      children: [
        if (_isEditing)
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
        if (_isEditing) const SizedBox(height: 12),
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
                myLocationEnabled: _isEditing,
                myLocationButtonEnabled: false,
                zoomControlsEnabled: false,
                onTap: _isEditing ? (latLng) => _setSelectedLocation(latLng) : null,
                markers: {
                  if (_selectedLocation != null)
                    Marker(
                      markerId: const MarkerId('selected-gym-location-profile'),
                      position: _selectedLocation!,
                      draggable: _isEditing,
                      onDragEnd: _isEditing ? (latLng) => _setSelectedLocation(latLng) : null,
                    ),
                },
                gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                  Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer()),
                },
              ),
              if (!hasStoredCoordinates)
                Positioned.fill(
                  child: ColoredBox(
                    color: Colors.black.withValues(alpha: 0.04),
                    child: Center(
                      child: Text(
                        _isEditing
                            ? 'Tap on map or use current location'
                            : 'No saved map location. Tap Edit to update.',
                        style: const TextStyle(fontWeight: FontWeight.w600),
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
        const SizedBox(height: 16),
        _buildTextField(
          controller: _addressController,
          label: 'Address',
          icon: Icons.home,
          maxLines: 2,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _cityController,
                label: 'City',
                icon: Icons.location_city,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                controller: _stateController,
                label: 'State',
                icon: Icons.map,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _pincodeController,
                label: 'Pincode',
                icon: Icons.pin_drop,
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                controller: _landmarkController,
                label: 'Landmark',
                icon: Icons.place,
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildTimingsSection() {
    return _buildSection(
      title: 'Operating Hours & Days',
      icon: Icons.access_time,
      children: [
        // ── Active days ──────────────────────────────────────────────────────
        const Text(
          'Open Days',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: _allDays.map((day) {
            final selected = _activeDays.contains(day);
            return FilterChip(
              label: Text(day[0].toUpperCase() + day.substring(1, 3)),
              selected: selected,
              onSelected: _isEditing
                  ? (val) {
                      setState(() {
                        if (val) {
                          _activeDays.add(day);
                        } else {
                          _activeDays.remove(day);
                        }
                      });
                    }
                  : null,
            );
          }).toList(),
        ),
        const SizedBox(height: 20),
        // Morning slot
        const Text(
          'Morning Slot',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildTimeField(
                label: 'Morning Opening',
                time: _morningOpening,
                onTap: () async {
                  if (!_isEditing) return;
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _morningOpening ?? const TimeOfDay(hour: 6, minute: 0),
                  );
                  if (time != null) {
                    setState(() => _morningOpening = time);
                  }
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTimeField(
                label: 'Morning Closing',
                time: _morningClosing,
                onTap: () async {
                  if (!_isEditing) return;
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _morningClosing ?? const TimeOfDay(hour: 12, minute: 0),
                  );
                  if (time != null) {
                    setState(() => _morningClosing = time);
                  }
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        // Evening slot
        const Text(
          'Evening Slot',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildTimeField(
                label: 'Evening Opening',
                time: _eveningOpening,
                onTap: () async {
                  if (!_isEditing) return;
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _eveningOpening ?? const TimeOfDay(hour: 16, minute: 0),
                  );
                  if (time != null) {
                    setState(() => _eveningOpening = time);
                  }
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTimeField(
                label: 'Evening Closing',
                time: _eveningClosing,
                onTap: () async {
                  if (!_isEditing) return;
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _eveningClosing ?? const TimeOfDay(hour: 22, minute: 0),
                  );
                  if (time != null) {
                    setState(() => _eveningClosing = time);
                  }
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildPasswordSection() {
    return _buildSection(
      title: 'Security',
      icon: Icons.lock,
      children: [
        const Text(
          'Enter your current password to save changes',
          style: TextStyle(fontSize: 12),
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: _currentPasswordController,
          label: 'Current Password *',
          icon: Icons.lock_outline,
          obscureText: true,
          validator: (value) =>
              value?.isEmpty ?? true ? 'Current password is required' : null,
        ),
      ],
    );
  }
  
  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
  
  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      enabled: _isEditing,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: const OutlineInputBorder(),
        filled: !_isEditing,
        fillColor: !_isEditing ? Theme.of(context).colorScheme.surfaceContainerHighest : null,
      ),
    );
  }
  
  Widget _buildTimeField({
    required String label,
    required TimeOfDay? time,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.schedule),
          border: const OutlineInputBorder(),
          filled: !_isEditing,
          fillColor: !_isEditing ? Theme.of(context).colorScheme.surfaceContainerHighest : null,
        ),
        child: Text(
          time != null ? time.format(context) : 'Not set',
          style: TextStyle(
            fontSize: 16,
            color: time != null ? Theme.of(context).colorScheme.onSurface : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}
