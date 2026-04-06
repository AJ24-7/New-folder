import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/equipment_service.dart';
import '../../services/gym_service.dart';
import '../../services/setup_guide_service.dart';
import '../../services/storage_service.dart';

class SetupGuideScreen extends StatefulWidget {
  final bool isFirstTimeFlow;
  final VoidCallback? onCompleted;
  final VoidCallback? onSkipped;

  const SetupGuideScreen({
    super.key,
    this.isFirstTimeFlow = false,
    this.onCompleted,
    this.onSkipped,
  });

  @override
  State<SetupGuideScreen> createState() => _SetupGuideScreenState();
}

class _SetupGuideScreenState extends State<SetupGuideScreen> {
  final GymService _gymService = GymService();
  final EquipmentService _equipmentService = EquipmentService();
  final ApiService _apiService = ApiService();
  final StorageService _storage = StorageService();
  final SetupGuideService _setupGuideService = SetupGuideService();

  bool _loading = true;
  bool _saving = false;

  bool _profileDone = false;
  bool _plansDone = false;
  bool _equipmentDone = false;
  bool _photosDone = false;
  bool _attendanceDone = false;

  @override
  void initState() {
    super.initState();
    _loadSetupStatus();
  }

  Future<void> _loadSetupStatus() async {
    setState(() => _loading = true);

    bool profileDone = false;
    bool plansDone = false;
    bool equipmentDone = false;
    bool photosDone = false;
    bool attendanceDone = false;

    try {
      final profile = await _gymService.getMyProfile();
      final hasMorning = profile.operatingHours?.morning?.opening != null &&
          profile.operatingHours?.morning?.closing != null;
      final hasEvening = profile.operatingHours?.evening?.opening != null &&
          profile.operatingHours?.evening?.closing != null;

      profileDone =
          profile.gymName.trim().isNotEmpty &&
          profile.contactPerson?.trim().isNotEmpty == true &&
          profile.phone.trim().isNotEmpty &&
          profile.email.trim().isNotEmpty &&
          profile.location?.address?.trim().isNotEmpty == true &&
          profile.location?.city?.trim().isNotEmpty == true &&
          profile.location?.state?.trim().isNotEmpty == true &&
          profile.location?.pincode?.trim().isNotEmpty == true &&
          (hasMorning || hasEvening);

      final plans = await _gymService.getMembershipPlans();
      if (plans != null) {
        final hasSinglePlanDurations = plans.monthlyOptions.isNotEmpty;
        final hasMultiPlanDurations = plans.tiers.any((t) => t.monthlyOptions.isNotEmpty);
        plansDone = hasSinglePlanDurations || hasMultiPlanDurations;
      }

      final equipment = await _equipmentService.getAllEquipment();
      equipmentDone = equipment.isNotEmpty;
      final equipmentWithImage = equipment.any((e) => e.photos.isNotEmpty);

      final photos = await _gymService.getGymPhotos();
      final hasLogo = (profile.logoUrl ?? '').trim().isNotEmpty;
      photosDone = hasLogo && (photos.isNotEmpty || equipmentWithImage);

      final attendanceSettings = await _apiService.getAttendanceSettings();
      attendanceDone =
          attendanceSettings?.mode.toString().split('.').last != 'manual' ||
          attendanceSettings?.geofenceSettings?.enabled == true;
    } catch (_) {
      // Keep best-effort status if any endpoint fails.
    }

    if (!mounted) return;
    setState(() {
      _profileDone = profileDone;
      _plansDone = plansDone;
      _equipmentDone = equipmentDone;
      _photosDone = photosDone;
      _attendanceDone = attendanceDone;
      _loading = false;
    });
  }

  int get _completedCount {
    final flags = [_profileDone, _plansDone, _equipmentDone, _photosDone, _attendanceDone];
    return flags.where((e) => e).length;
  }

  bool get _allDone => _completedCount == 5;

  Future<void> _completeGuide() async {
    final gymId = _storage.getGymId();
    if (gymId == null || gymId.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to resolve gym id for setup completion.')),
        );
      }
      return;
    }

    if (!_allDone) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete all setup tasks, or use Skip for now.')),
      );
      return;
    }

    setState(() => _saving = true);
    await _setupGuideService.markCompleted(gymId);
    if (!mounted) return;
    setState(() => _saving = false);

    if (widget.onCompleted != null) {
      widget.onCompleted!.call();
      return;
    }

    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  Future<void> _skipGuide() async {
    final gymId = _storage.getGymId();
    if (gymId != null && gymId.isNotEmpty) {
      await _setupGuideService.markDismissed(gymId);
    }

    if (!mounted) return;

    if (widget.onSkipped != null) {
      widget.onSkipped!.call();
      return;
    }

    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  Future<void> _openStep(String routeName) async {
    await Navigator.pushNamed(context, routeName);
    if (mounted) {
      _loadSetupStatus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gym Setup Guide'),
        actions: [
          IconButton(
            onPressed: _loading ? null : _loadSetupStatus,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh setup status',
          ),
        ],
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
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : SafeArea(
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.isFirstTimeFlow
                                ? 'Welcome! Let us configure your gym account.'
                                : 'Complete your gym setup checklist.',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 10),
                          Text('$_completedCount of 5 tasks completed'),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: _completedCount / 5,
                            minHeight: 8,
                            borderRadius: BorderRadius.circular(999),
                            color: AppTheme.primaryColor,
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _stepCard(
                            title: 'Complete Gym Profile',
                            subtitle:
                                'Fill gym details, contacts, location, and operating hours.',
                            icon: FontAwesomeIcons.building,
                            done: _profileDone,
                            onOpen: () => _openStep('/gym-profile'),
                          ),
                          _stepCard(
                            title: 'Configure Membership Plans',
                            subtitle:
                                'Add durations and pricing in Dashboard membership plans section.',
                            icon: FontAwesomeIcons.idCard,
                            done: _plansDone,
                            onOpen: () => _openStep('/dashboard'),
                          ),
                          _stepCard(
                            title: 'Add Equipment Inventory',
                            subtitle: 'Create equipment records for your gym floor.',
                            icon: FontAwesomeIcons.dumbbell,
                            done: _equipmentDone,
                            onOpen: () => _openStep('/equipment'),
                          ),
                          _stepCard(
                            title: 'Upload Visual Content',
                            subtitle:
                                'Set gym logo and add at least one image (gym or equipment).',
                            icon: FontAwesomeIcons.images,
                            done: _photosDone,
                            onOpen: () => _openStep('/dashboard'),
                          ),
                          _stepCard(
                            title: 'Setup Attendance & Geofence',
                            subtitle: 'Enable attendance mode and geofence settings.',
                            icon: FontAwesomeIcons.locationDot,
                            done: _attendanceDone,
                            onOpen: () => _openStep('/attendance'),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF111827) : Colors.white,
                        border: Border(
                          top: BorderSide(
                            color: isDark ? Colors.white10 : Colors.black12,
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          if (widget.isFirstTimeFlow)
                            Expanded(
                              child: OutlinedButton(
                                onPressed: _saving ? null : _skipGuide,
                                child: const Text('Skip for now'),
                              ),
                            ),
                          if (widget.isFirstTimeFlow) const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _saving ? null : _completeGuide,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                              ),
                              child: _saving
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text('Finish Setup'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _stepCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool done,
    required VoidCallback onOpen,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: done ? Colors.green.withValues(alpha: 0.14) : AppTheme.primaryColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: FaIcon(
                done ? FontAwesomeIcons.circleCheck : icon,
                size: 18,
                color: done ? Colors.green : AppTheme.primaryColor,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          color: done ? Colors.green.withValues(alpha: 0.12) : Colors.orange.withValues(alpha: 0.12),
                        ),
                        child: Text(
                          done ? 'Completed' : 'Pending',
                          style: TextStyle(
                            color: done ? Colors.green : Colors.orange.shade800,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: onOpen,
                        icon: const Icon(Icons.open_in_new, size: 16),
                        label: const Text('Open'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
