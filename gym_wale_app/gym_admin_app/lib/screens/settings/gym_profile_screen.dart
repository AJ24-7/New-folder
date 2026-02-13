// lib/screens/settings/gym_profile_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/gym_profile.dart';
import '../../services/gym_service.dart';
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
  
  // Morning slot times
  TimeOfDay? _morningOpening;
  TimeOfDay? _morningClosing;
  
  // Evening slot times
  TimeOfDay? _eveningOpening;
  TimeOfDay? _eveningClosing;
  
  XFile? _logoFile;
  Uint8List? _logoBytes;
  
  @override
  void initState() {
    super.initState();
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
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gym Profile'),
        actions: [
          if (!_isEditing && !_isLoading)
            IconButton(
              icon: const Icon(Icons.edit),
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
              child: const Text('Cancel'),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: _isSaving ? null : _saveProfile,
              child: _isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save'),
            ),
            const SizedBox(width: 16),
          ],
        ],
      ),
      body: _isLoading
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
    return _buildSection(
      title: 'Location',
      icon: Icons.location_on,
      children: [
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
      title: 'Operating Hours',
      icon: Icons.access_time,
      children: [
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
