import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../config/app_theme.dart';
import '../l10n/app_localizations.dart';

class ReportProblemScreen extends StatefulWidget {
  final String gymId;
  final String gymName;
  final String membershipId;

  const ReportProblemScreen({
    Key? key,
    required this.gymId,
    required this.gymName,
    required this.membershipId,
  }) : super(key: key);

  @override
  State<ReportProblemScreen> createState() => _ReportProblemScreenState();
}

class _ReportProblemScreenState extends State<ReportProblemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  
  String _selectedCategory = 'equipment-broken';
  String _selectedPriority = 'normal';
  List<XFile> _selectedImages = [];
  bool _isSubmitting = false;
  
  // Quick message templates
  final Map<String, List<String>> _quickMessages = {
    'equipment-broken': [
      'Treadmill not working',
      'Weights missing',
      'Cable machine broken',
      'Bench press damaged',
    ],
    'equipment-unavailable': [
      'All machines occupied',
      'No free weights available',
      'Cardio equipment fully booked',
    ],
    'cleanliness-issue': [
      'Washroom needs cleaning',
      'Equipment not sanitized',
      'Floor needs mopping',
      'Locker room untidy',
    ],
    'ac-heating-issue': [
      'AC not working',
      'Too hot inside',
      'Too cold inside',
      'Poor ventilation',
    ],
    'staff-behavior': [
      'Rude staff member',
      'Unhelpful reception',
      'Trainer unprofessional',
    ],
    'overcrowding': [
      'Too crowded during peak hours',
      'Not enough space to workout',
      'Long wait for equipment',
    ],
    'safety-concern': [
      'Unsafe equipment',
      'Slippery floor',
      'Poor lighting',
      'Emergency exit blocked',
    ],
    'facility-maintenance': [
      'Water leakage',
      'Broken mirror',
      'Door not closing properly',
      'Light not working',
    ],
  };

  final Map<String, IconData> _categoryIcons = {
    'equipment-broken': Icons.build_circle,
    'equipment-unavailable': Icons.block,
    'cleanliness-issue': Icons.cleaning_services,
    'ac-heating-issue': Icons.ac_unit,
    'staff-behavior': Icons.person_off,
    'class-schedule': Icons.schedule,
    'overcrowding': Icons.groups,
    'safety-concern': Icons.warning,
    'facility-maintenance': Icons.construction,
    'locker-issue': Icons.lock,
    'payment-billing': Icons.payment,
    'trainer-complaint': Icons.fitness_center,
    'other': Icons.report_problem,
  };

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      // Request permissions on mobile platforms
      if (!kIsWeb) {
        PermissionStatus permission;
        
        if (source == ImageSource.camera) {
          permission = await Permission.camera.request();
        } else {
          // For gallery, request photos permission
          if (Platform.isIOS) {
            permission = await Permission.photos.request();
          } else {
            // Android 13+ uses granular media permissions
            if (await Permission.photos.isGranted) {
              permission = PermissionStatus.granted;
            } else {
              permission = await Permission.photos.request();
            }
          }
        }
        
        if (permission.isDenied || permission.isPermanentlyDenied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  source == ImageSource.camera
                      ? 'Camera permission is required to take photos'
                      : 'Storage permission is required to access photos',
                ),
                backgroundColor: AppTheme.errorColor,
                action: SnackBarAction(
                  label: 'Settings',
                  textColor: Colors.white,
                  onPressed: () {
                    openAppSettings();
                  },
                ),
              ),
            );
          }
          return;
        }
      }
      
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      
      if (image != null) {
        setState(() {
          _selectedImages.add(image);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  void _useQuickMessage(String message) {
    setState(() {
      _subjectController.text = message;
    });
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final result = await ApiService.submitMemberProblemReport(
        gymId: widget.gymId,
        category: _selectedCategory,
        subject: _subjectController.text.trim(),
        description: _descriptionController.text.trim(),
        priority: _selectedPriority,
        images: _selectedImages,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Report submitted successfully'),
            backgroundColor: AppTheme.successColor,
            duration: const Duration(seconds: 3),
          ),
        );
        Navigator.pop(context, true); // Return true to indicate success
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Failed to submit report'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Problem'),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Gym Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      Icons.fitness_center,
                      color: AppTheme.primaryColor,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.gymName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Membership: ${widget.membershipId}',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Category Selection
            Text(
              'Problem Category',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: InputDecoration(
                prefixIcon: Icon(_categoryIcons[_selectedCategory]),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: isDark ? const Color(0xFF2C2C2C) : Colors.grey[100],
              ),
              items: _categoryIcons.entries.map((entry) {
                return DropdownMenuItem(
                  value: entry.key,
                  child: Row(
                    children: [
                      Icon(entry.value, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        entry.key.split('-').map((word) => 
                          word[0].toUpperCase() + word.substring(1)
                        ).join(' '),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCategory = value!;
                  _subjectController.clear();
                });
              },
            ),
            const SizedBox(height: 24),

            // Quick Messages
            if (_quickMessages.containsKey(_selectedCategory)) ...[
              Text(
                'Quick Messages (Tap to use)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _quickMessages[_selectedCategory]!.map((message) {
                  return ActionChip(
                    label: Text(message),
                    avatar: const Icon(Icons.touch_app, size: 18),
                    onPressed: () => _useQuickMessage(message),
                    backgroundColor: isDark 
                        ? const Color(0xFF2C2C2C) 
                        : Colors.grey[200],
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
            ],

            // Subject
            Text(
              'Subject',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _subjectController,
              decoration: InputDecoration(
                hintText: 'Brief description of the problem',
                prefixIcon: const Icon(Icons.title),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: isDark ? const Color(0xFF2C2C2C) : Colors.grey[100],
              ),
              maxLength: 200,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a subject';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Description
            Text(
              'Description',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              decoration: InputDecoration(
                hintText: 'Provide detailed information about the problem...',
                alignLabelWithHint: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: isDark ? const Color(0xFF2C2C2C) : Colors.grey[100],
              ),
              maxLines: 5,
              maxLength: 2000,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please provide a description';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Priority
            Text(
              'Priority',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildPriorityChip('low', 'Low', Colors.grey),
                _buildPriorityChip('normal', 'Normal', Colors.blue),
                _buildPriorityChip('high', 'High', Colors.orange),
                _buildPriorityChip('urgent', 'Urgent', Colors.red),
              ],
            ),
            const SizedBox(height: 24),

            // Image Attachments
            Text(
              'Attachments (Optional)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Camera'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Gallery'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Image Preview
            if (_selectedImages.isNotEmpty) ...[
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedImages.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: kIsWeb
                                ? Image.network(
                                    _selectedImages[index].path,
                                    width: 120,
                                    height: 120,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Container(
                                        width: 120,
                                        height: 120,
                                        color: Colors.grey[300],
                                        child: const Icon(Icons.error),
                                      );
                                    },
                                  )
                                : Image.file(
                                    File(_selectedImages[index].path),
                                    width: 120,
                                    height: 120,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Container(
                                        width: 120,
                                        height: 120,
                                        color: Colors.grey[300],
                                        child: const Icon(Icons.error),
                                      );
                                    },
                                  ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: GestureDetector(
                              onTap: () => _removeImage(index),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _submitReport,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Icon(Icons.send),
                label: Text(_isSubmitting ? 'Submitting...' : 'Submit Report'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Info Card
            Card(
              color: Colors.blue.withValues(alpha: 0.1),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Your report will be sent to the gym management. They will review and respond as soon as possible.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue[700],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriorityChip(String value, String label, Color color) {
    final isSelected = _selectedPriority == value;
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: ChoiceChip(
          label: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isSelected ? Colors.white : color,
            ),
          ),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              _selectedPriority = value;
            });
          },
          selectedColor: color,
          backgroundColor: color.withValues(alpha: 0.1),
        ),
      ),
    );
  }
}
