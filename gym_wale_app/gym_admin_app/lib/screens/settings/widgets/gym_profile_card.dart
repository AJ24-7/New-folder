import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../../providers/gym_profile_provider.dart';
import '../../../models/gym_profile.dart';
import 'package:image_picker/image_picker.dart';

class GymProfileCard extends StatefulWidget {
  const GymProfileCard({super.key});

  @override
  State<GymProfileCard> createState() => _GymProfileCardState();
}

class _GymProfileCardState extends State<GymProfileCard> {
  bool _isEditMode = false;
  final _formKey = GlobalKey<FormState>();
  
  // Form controllers
  late TextEditingController _gymNameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _contactPersonController;
  late TextEditingController _supportEmailController;
  late TextEditingController _supportPhoneController;
  late TextEditingController _descriptionController;
  late TextEditingController _addressController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _pincodeController;
  late TextEditingController _landmarkController;
  late TextEditingController _openingTimeController;
  late TextEditingController _closingTimeController;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    _gymNameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _contactPersonController = TextEditingController();
    _supportEmailController = TextEditingController();
    _supportPhoneController = TextEditingController();
    _descriptionController = TextEditingController();
    _addressController = TextEditingController();
    _cityController = TextEditingController();
    _stateController = TextEditingController();
    _pincodeController = TextEditingController();
    _landmarkController = TextEditingController();
    _openingTimeController = TextEditingController();
    _closingTimeController = TextEditingController();
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
    _openingTimeController.dispose();
    _closingTimeController.dispose();
    super.dispose();
  }

  void _populateFields(GymProfile profile) {
    _gymNameController.text = profile.gymName;
    _emailController.text = profile.email;
    _phoneController.text = profile.phone;
    _contactPersonController.text = profile.contactPerson ?? '';
    _supportEmailController.text = profile.supportEmail ?? '';
    _supportPhoneController.text = profile.supportPhone ?? '';
    _descriptionController.text = profile.description ?? '';
    _addressController.text = profile.location?.address ?? '';
    _cityController.text = profile.location?.city ?? '';
    _stateController.text = profile.location?.state ?? '';
    _pincodeController.text = profile.location?.pincode ?? '';
    _landmarkController.text = profile.location?.landmark ?? '';
    _openingTimeController.text = profile.openingTime ?? '';
    _closingTimeController.text = profile.closingTime ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final profileProvider = context.watch<GymProfileProvider>();

    if (profileProvider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (profileProvider.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(profileProvider.error!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => profileProvider.loadProfile(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final profile = profileProvider.currentProfile;
    if (profile == null) {
      return const Center(child: Text('No profile data available'));
    }

    // Populate fields when profile is loaded
    if (!_isEditMode) {
      _populateFields(profile);
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with mode toggle
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.gymProfile,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Row(
                    children: [
                      if (_isEditMode) ...[
                        OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _isEditMode = false;
                              _populateFields(profile);
                            });
                          },
                          child: Text(l10n.cancel),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _saveProfile,
                          child: Text(l10n.save),
                        ),
                      ] else
                        ElevatedButton.icon(
                          onPressed: () {
                            setState(() => _isEditMode = true);
                          },
                          icon: const Icon(Icons.edit),
                          label: const Text('Edit Profile'),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Logo Section
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 60,
                      backgroundImage: profile.logoUrl != null
                          ? NetworkImage(profile.logoUrl!)
                          : null,
                      child: profile.logoUrl == null
                          ? Icon(Icons.business, size: 48, color: theme.colorScheme.primary)
                          : null,
                    ),
                    if (_isEditMode)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: CircleAvatar(
                          radius: 18,
                          backgroundColor: theme.colorScheme.primary,
                          child: IconButton(
                            icon: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                            onPressed: _uploadLogo,
                            padding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Basic Information
              _buildSectionTitle('Basic Information', Icons.info_outline),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _gymNameController,
                      label: 'Gym Name',
                      icon: Icons.business,
                      enabled: _isEditMode,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTextField(
                      controller: _contactPersonController,
                      label: 'Owner/Contact Person',
                      icon: Icons.person,
                      enabled: _isEditMode,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _emailController,
                      label: 'Email',
                      icon: Icons.email,
                      enabled: _isEditMode,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTextField(
                      controller: _phoneController,
                      label: 'Phone',
                      icon: Icons.phone,
                      enabled: _isEditMode,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Support Contact
              _buildSectionTitle('Support Contact', Icons.support_agent),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _supportEmailController,
                      label: 'Support Email',
                      icon: Icons.email_outlined,
                      enabled: _isEditMode,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTextField(
                      controller: _supportPhoneController,
                      label: 'Support Phone',
                      icon: Icons.phone_outlined,
                      enabled: _isEditMode,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Location Information
              _buildSectionTitle('Location', Icons.location_on),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _addressController,
                label: 'Address',
                icon: Icons.home,
                enabled: _isEditMode,
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
                      enabled: _isEditMode,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTextField(
                      controller: _stateController,
                      label: 'State',
                      icon: Icons.map,
                      enabled: _isEditMode,
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
                      enabled: _isEditMode,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTextField(
                      controller: _landmarkController,
                      label: 'Landmark',
                      icon: Icons.place,
                      enabled: _isEditMode,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Operational Information
              _buildSectionTitle('Operational Hours', Icons.access_time),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _openingTimeController,
                      label: 'Opening Time',
                      icon: Icons.wb_sunny,
                      enabled: _isEditMode,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTextField(
                      controller: _closingTimeController,
                      label: 'Closing Time',
                      icon: Icons.nights_stay,
                      enabled: _isEditMode,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Description
              _buildSectionTitle('Description', Icons.description),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _descriptionController,
                label: 'Gym Description',
                icon: Icons.notes,
                enabled: _isEditMode,
                maxLines: 4,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, color: theme.colorScheme.primary, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required bool enabled,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  Future<void> _uploadLogo() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      final provider = context.read<GymProfileProvider>();
      final success = await provider.uploadLogo(image.path);
      
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Logo uploaded successfully')),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to upload logo')),
        );
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<GymProfileProvider>();
    final currentProfile = provider.currentProfile!;

    final updatedProfile = currentProfile.copyWith(
      gymName: _gymNameController.text,
      email: _emailController.text,
      phone: _phoneController.text,
      contactPerson: _contactPersonController.text,
      supportEmail: _supportEmailController.text,
      supportPhone: _supportPhoneController.text,
      description: _descriptionController.text,
      openingTime: _openingTimeController.text,
      closingTime: _closingTimeController.text,
      location: GymLocation(
        address: _addressController.text,
        city: _cityController.text,
        state: _stateController.text,
        pincode: _pincodeController.text,
        landmark: _landmarkController.text,
      ),
    );

    final success = await provider.updateProfile(updatedProfile);

    if (success && mounted) {
      setState(() => _isEditMode = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully')),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update profile')),
      );
    }
  }
}
