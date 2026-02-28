import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/diet_service.dart';
import '../services/location_monitoring_service.dart';
import '../providers/auth_provider.dart';
import '../models/trial_booking.dart';
import '../models/user_diet_subscription.dart';
import '../models/diet_plan.dart';
import '../config/app_theme.dart';
import '../widgets/attendance_widget_new.dart';
import '../l10n/app_localizations.dart';
import 'diet_plan_detail_screen.dart';
import 'workout_assistant_screen.dart';
import 'report_problem_screen.dart';

class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({Key? key}) : super(key: key);

  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<dynamic> _gymMemberships = [];
  List<TrialBooking> _upcomingTrials = [];
  List<UserDietSubscription> _dietSubscriptions = [];
  List<dynamic> _trainerBookings = [];
  Map<String, bool> _gymFreezeSettings = {}; // Store freeze settings per gym

  bool _isLoading = true;
  int _selectedTabIndex = 0;
  
  final LocationMonitoringService _locationMonitoring = LocationMonitoringService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() => _selectedTabIndex = _tabController.index);
      }
    });
    _loadAllSubscriptions();
    _initializeLocationMonitoring();
  }

  /// Initialize location monitoring for active memberships
  Future<void> _initializeLocationMonitoring() async {
    try {
      // Skip location monitoring on web platform
      if (kIsWeb) {
        debugPrint('[SubscriptionsScreen] Web platform - Skipping location monitoring');
        return;
      }
      
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.user;
      final token = ApiService.token;
      
      if (user == null || token == null) {
        return;
      }

      // Wait for memberships to load
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Initialize monitoring for first active gym membership
      if (_gymMemberships.isNotEmpty) {
        final firstGymId = _extractGymId(_gymMemberships[0]);
        if (firstGymId != null) {
          await _locationMonitoring.initialize(
            gymId: firstGymId,
            memberId: user.id,
            authToken: token,
          );
          debugPrint('[SubscriptionsScreen] Location monitoring initialized for gym: $firstGymId');
        }
      }
    } catch (e) {
      debugPrint('[SubscriptionsScreen] Error initializing location monitoring: $e');
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    // Don't dispose location monitoring - it's a singleton
    super.dispose();
  }

  /// Helper to extract consistent gym ID
  String? _extractGymId(dynamic membership) {
    if (membership == null) return null;
    final gym = membership['gym'];
    if (gym == null) return null;
    return gym['_id'] ?? gym['id'];
  }

  Future<void> _loadAllSubscriptions() async {
    setState(() => _isLoading = true);

    try {
      // Load gym memberships using getActiveMemberships (same as settings screen)
      final memberships = await ApiService.getActiveMemberships();

      // Load gym settings for each membership
      final Map<String, bool> gymSettings = {};
      for (final membership in memberships) {
        final gymId = _extractGymId(membership);
        if (gymId != null && !gymSettings.containsKey(gymId)) {
          try {
            final settingsResult = await ApiService.getGymSettings(gymId);
            print('Settings result for gym $gymId: $settingsResult');
            
            if (settingsResult['success'] == true && settingsResult['settings'] != null) {
              final allowFreezing = settingsResult['settings']['allowMembershipFreezing'];
              gymSettings[gymId] = allowFreezing ?? false; // Default to false if not specified
              print('Gym $gymId allows freezing: ${gymSettings[gymId]}');
            } else {
              // If settings couldn't be loaded, default to false for safety
              gymSettings[gymId] = false;
              print('Failed to load settings for gym $gymId, defaulting to false');
            }
          } catch (e) {
            print('Error loading gym settings for $gymId: $e');
            gymSettings[gymId] = false; // Default to NOT allowing freeze for safety
          }
        }
      }

      // Load trial bookings and filter for upcoming only
      final trialBookingsData = await ApiService.getTrialBookings();
      final allTrials =
          trialBookingsData.map((data) => TrialBooking.fromJson(data)).toList();
      final now = DateTime.now();
      final upcomingTrials = allTrials
          .where((trial) =>
              trial.trialDate.isAfter(now) &&
              (trial.isPending || trial.isConfirmed))
          .toList();

      // Load diet subscriptions using DietService
      List<UserDietSubscription> diets = [];
      try {
        final dietResult = await DietService.getUserActiveDietSubscription();
        if (dietResult['success'] == true &&
            dietResult['subscription'] != null) {
          diets = [dietResult['subscription'] as UserDietSubscription];
        }
      } catch (e) {
        print('Error loading diet subscriptions: $e');
        diets = [];
      }

      // Load trainer bookings - mock data for now as API doesn't exist yet
      List<dynamic> trainers = [];
      // TODO: Implement trainer booking API in backend

      setState(() {
        _gymMemberships = memberships;
        _gymFreezeSettings = gymSettings;
        _upcomingTrials = upcomingTrials;
        _dietSubscriptions = diets;
        _trainerBookings = trainers;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading subscriptions: $e');
      setState(() => _isLoading = false);
    }
  }

  /// Show membership pass in bottom sheet
  Future<void> _showMembershipPass(dynamic membership) async {
    final membershipId = membership['id'] ?? membership['membershipId'] ?? '';

    try {
      final result = await ApiService.getMembershipPass(membershipId);

      if (!mounted) return;

      if (result['success'] == true && result['pass'] != null) {
        final pass = result['pass'];
        _showPassBottomSheet(pass);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text(result['message'] ?? 'Failed to load membership pass'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading pass: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  /// Show pass bottom sheet with animation
  void _showPassBottomSheet(Map<String, dynamic> pass) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final gymName = pass['gym']?['gymName'] ?? pass['gym']?['name'] ?? 'Gym';
    final gymLogo = pass['gym']?['logo'];
    final membershipId = pass['membershipId'] ?? 'N/A';
    // Use validUntil if available, otherwise try endDate or joinDate + monthlyPlan
    DateTime validUntil;
    if (pass['validUntil'] != null && pass['validUntil'].toString().isNotEmpty) {
      validUntil = DateTime.parse(pass['validUntil']);
    } else if (pass['endDate'] != null && pass['endDate'].toString().isNotEmpty) {
      validUntil = DateTime.parse(pass['endDate']);
    } else {
      // Fallback calculation from joinDate and monthlyPlan
      final joinDate = pass['joinDate'] != null ? DateTime.parse(pass['joinDate']) : DateTime.now();
      final monthlyPlan = pass['monthlyPlan'] ?? '1 Month';
      final months = int.tryParse(monthlyPlan.split(' ')[0]) ?? 1;
      validUntil = DateTime(joinDate.year, joinDate.month + months, joinDate.day);
    }
    
    // Generate QR code data
    final qrData = '''{"membershipId": "$membershipId", "validUntil": "${validUntil.toIso8601String()}"}''';
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header with gym info
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                  ),
                ),
                child: Row(
                  children: [
                    if (gymLogo != null && gymLogo.isNotEmpty)
                      Container(
                        width: 50,
                        height: 50,
                        margin: const EdgeInsets.only(right: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: CachedNetworkImage(
                            imageUrl: gymLogo,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Colors.grey.shade200,
                              child: const Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            ),
                            errorWidget: (context, error, stackTrace) {
                              print('❌ Error loading gym logo: $gymLogo - $error');
                              return const Icon(
                                Icons.fitness_center,
                                color: AppTheme.primaryColor,
                              );
                            },
                          ),
                        ),
                      ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Membership Details',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            gymName,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // User ID Card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              AppTheme.accentColor.withValues(alpha: 0.1),
                              AppTheme.primaryColor.withValues(alpha: 0.1),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          children: [
                            // User Info Row
                            Row(
                              children: [
                                // User/Member Photo
                                CircleAvatar(
                                  radius: 40,
                                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                  backgroundImage: pass['profileImage'] != null && pass['profileImage'].isNotEmpty
                                      ? CachedNetworkImageProvider(pass['profileImage'])
                                      : null,
                                  onBackgroundImageError: pass['profileImage'] != null && pass['profileImage'].isNotEmpty
                                      ? (exception, stackTrace) {
                                          print('❌ Error loading profile image: ${pass['profileImage']} - $exception');
                                        }
                                      : null,
                                  child: pass['profileImage'] == null || pass['profileImage'].isEmpty
                                      ? Text(
                                          (pass['memberName'] ?? 'U').substring(0, 1).toUpperCase(),
                                          style: const TextStyle(
                                            fontSize: 32,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryColor,
                                          ),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        pass['memberName'] ?? 'Member',
                                        style: TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context).textTheme.titleLarge?.color,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      if (pass['email'] != null)
                                        Text(
                                          pass['email'],
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Theme.of(context).textTheme.bodyMedium?.color,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            const Divider(),
                            const SizedBox(height: 16),
                            
                            // Membership ID
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surface,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Theme.of(context).dividerColor),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.credit_card,
                                    color: AppTheme.primaryColor,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Membership ID',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Theme.of(context).textTheme.bodyMedium?.color,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          membershipId,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context).textTheme.titleLarge?.color,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 20),
                      
                      // Membership Details
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor,
                          ),
                        ),
                        child: Column(
                          children: [
                            _buildPassDetailRow(
                              'Plan',
                              '${pass['planSelected'] ?? 'Standard'} - ${pass['monthlyPlan'] ?? '1 Month'}',
                              Icons.card_membership,
                            ),
                            const Divider(height: 24),
                            _buildPassDetailRow(
                              'Valid Until',
                              DateFormat('MMM dd, yyyy').format(validUntil),
                              Icons.event,
                            ),
                            const Divider(height: 24),
                            _buildPassDetailRow(
                              'Activity',
                              pass['activityPreference'] ?? 'General Fitness',
                              Icons.fitness_center,
                            ),
                            if (pass['currentlyFrozen'] == true) ...[
                              const Divider(height: 24),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.yellow.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.orange, width: 1.5),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.ac_unit, color: Colors.orange, size: 20),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'FROZEN until ${pass['freezeEndDate'] != null ? DateFormat('MMM dd').format(DateTime.parse(pass['freezeEndDate'])) : 'N/A'}',
                                        style: const TextStyle(
                                          color: Colors.orange,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 20),
                      
                      // QR Code Section
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor,
                          ),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'Membership QR Code',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).textTheme.titleLarge?.color,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Show this QR code at the gym for verification',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).textTheme.bodyMedium?.color,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.borderColor, width: 2),
                              ),
                              child: QrImageView(
                                data: qrData,
                                version: QrVersions.auto,
                                size: 200,
                                backgroundColor: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Valid for gym check-in and facility access',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPassDetailRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryColor, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).textTheme.titleLarge?.color,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Show freeze membership dialog
  Future<void> _showFreezeMembershipDialog(String membershipId) async {
    final l10n = AppLocalizations.of(context)!;
    int selectedDays = 7;
    String reason = '';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.ac_unit, color: AppTheme.primaryColor),
              const SizedBox(width: 12),
              Text(l10n.freezeMembership),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.freezeYourMembership,
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 20),

                // Criteria Info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Freeze Criteria:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                          fontSize: 13,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        '• Duration: 7-15 days only',
                        style: TextStyle(fontSize: 12, color: Colors.blue),
                      ),
                      Text(
                        '• Can freeze only once per membership',
                        style: TextStyle(fontSize: 12, color: Colors.blue),
                      ),
                      Text(
                        '• Validity extends automatically',
                        style: TextStyle(fontSize: 12, color: Colors.blue),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Days Slider
                Text(
                  '${l10n.freezeDuration}: $selectedDays ${l10n.days}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 8),
                Slider(
                  value: selectedDays.toDouble(),
                  min: 7,
                  max: 15,
                  divisions: 8,
                  label: '$selectedDays days',
                  activeColor: AppTheme.primaryColor,
                  onChanged: (value) {
                    setState(() {
                      selectedDays = value.toInt();
                    });
                  },
                ),
                Text(
                  '${l10n.membershipExtendedBy} $selectedDays ${l10n.days}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),

                const SizedBox(height: 16),

                // Reason TextField
                TextField(
                  decoration: InputDecoration(
                    labelText: l10n.reasonOptional,
                    hintText: l10n.reasonPlaceholder,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    prefixIcon: const Icon(Icons.edit_note),
                  ),
                  maxLines: 2,
                  onChanged: (value) {
                    reason = value;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(l10n.cancel),
            ),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context, true),
              icon: const Icon(Icons.ac_unit, size: 18),
              label: Text(l10n.freezeMembership),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      _freezeMembership(membershipId, selectedDays, reason);
    }
  }

  /// Freeze membership API call
  Future<void> _freezeMembership(
      String membershipId, int freezeDays, String reason) async {
    final l10n = AppLocalizations.of(context)!;
    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      final result = await ApiService.freezeMembership(
        membershipId,
        freezeDays,
        reason,
      );

      if (!mounted) return;

      // Close loading
      Navigator.pop(context);

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result['message'] ?? l10n.membershipFrozenSuccess,
            ),
            backgroundColor: AppTheme.successColor,
          ),
        );

        // Reload memberships
        _loadAllSubscriptions();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? l10n.failedToFreeze),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  /// Navigate to report problem screen
  Future<void> _navigateToReportProblem(dynamic membership) async {
    final gymId = _extractGymId(membership);
    final gymName = membership['gym']?['name'] ?? 'Unknown Gym';
    final membershipId = membership['id'] ?? membership['membershipId'] ?? '';

    if (gymId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to identify gym'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ReportProblemScreen(
          gymId: gymId,
          gymName: gymName,
          membershipId: membershipId,
        ),
      ),
    );

    // If report was submitted successfully, reload subscriptions
    if (result == true) {
      _loadAllSubscriptions();
    }
  }

  void _scheduleTrialReminder(TrialBooking trial) {
    final l10n = AppLocalizations.of(context)!;
    // Notification scheduling logic
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            '${l10n.reminderSet} ${trial.gymName} ${l10n.trialOn} ${DateFormat('MMM dd').format(trial.trialDate)}'),
        backgroundColor: AppTheme.successColor,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.subscriptions),
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'workout') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const WorkoutAssistantScreen(),
                  ),
                );
              } else if (value == 'diet') {
                Navigator.pushNamed(context, '/diet-plans');
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'workout',
                child: Row(
                  children: [
                    const Icon(Icons.fitness_center, color: AppTheme.primaryColor),
                    const SizedBox(width: 12),
                    Text(l10n.workoutPlans),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'diet',
                child: Row(
                  children: [
                    const Icon(Icons.restaurant_menu, color: AppTheme.primaryColor),
                    const SizedBox(width: 12),
                    Text(l10n.dietPlans),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          _buildTabBar(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildGymMembershipsTab(),
                      _buildDietPlansTab(),
                      _buildUpcomingTrialsTab(),
                      _buildTrainersTab(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    final l10n = AppLocalizations.of(context)!;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildTabButton(l10n.gymMemberships, Icons.fitness_center, 0,
                _gymMemberships.length),
            _buildTabButton(l10n.dietPlans, Icons.restaurant_menu, 1,
                _dietSubscriptions.length),
            _buildTabButton(
                l10n.upcomingTrials, Icons.schedule, 2, _upcomingTrials.length),
            _buildTabButton(
                l10n.trainers, Icons.person_outline, 3, _trainerBookings.length),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(String title, IconData icon, int index, int count) {
    final isSelected = _selectedTabIndex == index;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => _tabController.animateTo(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                )
              : null,
          color: isSelected
              ? null
              : (isDark ? const Color(0xFF2C2C2C) : Colors.white),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : (isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor),
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected
                  ? Colors.white
                  : (isDark ? Colors.grey[400] : AppTheme.textSecondary),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected
                    ? Colors.white
                    : Theme.of(context).textTheme.bodyLarge?.color,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 13,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : AppTheme.primaryColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: isSelected ? AppTheme.primaryColor : Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Gym Memberships Tab
  Widget _buildGymMembershipsTab() {
    final l10n = AppLocalizations.of(context)!;
    if (_gymMemberships.isEmpty) {
      return _buildEmptyState(
        icon: Icons.fitness_center_outlined,
        title: l10n.noActiveMemberships,
        subtitle: l10n.startFitnessJourneyToday,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllSubscriptions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _gymMemberships.length,
        itemBuilder: (context, index) {
          final membership = _gymMemberships[index];
          return _buildMembershipCard(membership);
        },
      ),
    );
  }

  Widget _buildMembershipCard(dynamic membership) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final daysRemaining = membership['daysRemaining'] ?? 0;
    final isExpiringSoon = daysRemaining <= 7;
    final gymName = membership['gym']?['name'] ?? 'Unknown Gym';
    final gymLogo = membership['gym']?['logo'];
    final planName = membership['plan']?['name'] ?? 'Standard Plan';
    final amount = membership['plan']?['price'] ?? 0;
    final startDate = membership['startDate'] != null
        ? DateTime.parse(membership['startDate'])
        : DateTime.now();
    final endDate = membership['endDate'] != null
        ? DateTime.parse(membership['endDate'])
        : DateTime.now();
    final membershipId = membership['id'] ?? membership['membershipId'] ?? '';
    final currentlyFrozen = membership['currentlyFrozen'] ?? false;
    final totalFreezeCount = membership['totalFreezeCount'] ?? 0;
    final freezeStartDate = membership['freezeStartDate'] != null
        ? DateTime.parse(membership['freezeStartDate'])
        : null;
    final freezeEndDate = membership['freezeEndDate'] != null
        ? DateTime.parse(membership['freezeEndDate'])
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Gym Logo
                if (gymLogo != null && gymLogo.isNotEmpty)
                  Container(
                    width: 50,
                    height: 50,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2C) : AppTheme.backgroundColor,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: (gymLogo != null && gymLogo.isNotEmpty)
                        ? Image.network(
                            gymLogo,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return const Icon(
                                Icons.fitness_center,
                                color: AppTheme.primaryColor,
                                size: 24,
                              );
                            },
                          )
                        : const Icon(
                            Icons.fitness_center,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                    ),
                  ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        gymName,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          planName,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.successColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle,
                          size: 14, color: AppTheme.successColor),
                      const SizedBox(width: 4),
                      Text(
                        l10n.active,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.successColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color:
                    isDark ? const Color(0xFF2C2C2C) : AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color:
                      isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildDateInfo(
                        l10n.startDate,
                        DateFormat('MMM dd, yyyy').format(startDate),
                        Icons.play_circle_outline,
                      ),
                      Container(
                        width: 1,
                        height: 40,
                        color: AppTheme.borderColor,
                      ),
                      _buildDateInfo(
                        l10n.endDate,
                        DateFormat('MMM dd, yyyy').format(endDate),
                        Icons.event,
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isExpiringSoon
                                ? Icons.warning_amber
                                : Icons.access_time,
                            size: 18,
                            color: isExpiringSoon
                                ? Colors.orange
                                : AppTheme.primaryColor,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '$daysRemaining days remaining',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isExpiringSoon
                                  ? Colors.orange
                                  : AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '₹${amount.toStringAsFixed(0)}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (currentlyFrozen &&
                freezeStartDate != null &&
                freezeEndDate != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.yellow.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange, width: 1.5),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.ac_unit, size: 18, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${l10n.membershipFrozenUntil} ${DateFormat('MMM dd, yyyy').format(freezeEndDate)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.orange,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (isExpiringSoon && !currentlyFrozen) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline,
                        size: 18, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        l10n.expiringMessage,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.orange,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            
            // Attendance Widget - Show for gym memberships
            AttendanceWidget(
              gymId: _extractGymId(membership) ?? '',
              gymName: gymName,
            ),
            const SizedBox(height: 12),
            
            // Show info when freeze is disabled by gym
            if (_gymFreezeSettings[_extractGymId(membership)] == false && !currentlyFrozen) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 18, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Membership freezing is currently not available at this gym',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[700],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            
            // Action Buttons Row
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showMembershipPass(membership),
                    icon: const Icon(Icons.badge_outlined, size: 18),
                    label: Text(l10n.showDetails),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      side: const BorderSide(color: AppTheme.primaryColor),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Report Problem Button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _navigateToReportProblem(membership),
                    icon: const Icon(Icons.report_problem_outlined, size: 18),
                    label: const Text('Report'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange,
                      side: const BorderSide(color: Colors.orange),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
            // Freeze Button Row (if enabled)
            if (_gymFreezeSettings[_extractGymId(membership)] == true) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: currentlyFrozen || totalFreezeCount > 0
                      ? null
                      : () => _showFreezeMembershipDialog(membershipId),
                  icon: const Icon(Icons.ac_unit, size: 18),
                  label: Text(
                    totalFreezeCount > 0 ? l10n.freezeUsed : l10n.freeze,
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    disabledBackgroundColor: Colors.grey,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDateInfo(String label, String date, IconData icon) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: Column(
        children: [
          Icon(
            icon,
            size: 16,
            color: isDark ? Colors.grey[400] : AppTheme.textSecondary,
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.grey[400] : AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            date,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).textTheme.bodyLarge?.color,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // Diet Plans Tab
  Widget _buildDietPlansTab() {
    final l10n = AppLocalizations.of(context)!;
    if (_dietSubscriptions.isEmpty) {
      return _buildEmptyState(
        icon: Icons.restaurant_menu_outlined,
        title: l10n.noDietPlans,
        subtitle: l10n.subscribeDietPlan,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllSubscriptions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _dietSubscriptions.length,
        itemBuilder: (context, index) {
          final diet = _dietSubscriptions[index];
          return _buildDietCard(diet);
        },
      ),
    );
  }

  Widget _buildDietCard(UserDietSubscription diet) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final DietPlanTemplate? plan = diet.planTemplate;
    final String planName = plan?.name ?? 'Custom Diet Plan';
    final int daysRemaining = diet.endDate != null
        ? diet.endDate!.difference(DateTime.now()).inDays
        : 0;
    final bool isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image header
          if (plan?.imageUrl != null)
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
              child: Image.network(
                plan!.imageUrl!,
                height: 160,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 160,
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                    ),
                    child: const Center(
                      child: Icon(Icons.restaurant_menu,
                          size: 60, color: Colors.white),
                    ),
                  );
                },
              ),
            )
          else
            Container(
              height: 160,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: const Center(
                child:
                    Icon(Icons.restaurant_menu, size: 60, color: Colors.white),
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            planName,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          if (plan?.description != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              plan!.description!,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    fontSize: 13,
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.color
                                        ?.withValues(alpha: 0.7),
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: diet.isActive
                            ? AppTheme.successColor.withValues(alpha: 0.1)
                            : Colors.grey.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            diet.isActive ? Icons.check_circle : Icons.cancel,
                            size: 14,
                            color: diet.isActive
                                ? AppTheme.successColor
                                : Colors.grey,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            diet.isActive ? 'ACTIVE' : 'INACTIVE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: diet.isActive
                                  ? AppTheme.successColor
                                  : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Macros info
                if (plan != null)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildMacroChip('${plan.dailyCalories} cal',
                          Icons.local_fire_department, Colors.orange),
                      if (plan.dailyProtein != null)
                        _buildMacroChip('P: ${plan.dailyProtein}g',
                            Icons.fitness_center, Colors.blue),
                      if (plan.dailyCarbs != null)
                        _buildMacroChip('C: ${plan.dailyCarbs}g',
                            Icons.rice_bowl, Colors.amber),
                      if (plan.dailyFats != null)
                        _buildMacroChip('F: ${plan.dailyFats}g',
                            Icons.water_drop, Colors.teal),
                    ],
                  ),
                const SizedBox(height: 12),

                // Tags
                if (plan != null && plan.tags.isNotEmpty)
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: plan.tags.take(5).map((tag) {
                      final displayTag = tag.replaceAll('-', ' ');
                      final capitalizedTag = displayTag
                          .split(' ')
                          .map((word) => word.isNotEmpty
                              ? '${word[0].toUpperCase()}${word.substring(1)}'
                              : '')
                          .join(' ');

                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getTagColor(tag),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          capitalizedTag,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                const SizedBox(height: 16),

                // Additional info
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF2C2C2C)
                        : AppTheme.backgroundColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.borderColor),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.calendar_today,
                                  size: 16, color: AppTheme.primaryColor),
                              const SizedBox(width: 8),
                              Text(
                                diet.endDate != null
                                    ? '$daysRemaining days remaining'
                                    : 'Active',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: isExpiringSoon
                                      ? Colors.orange
                                      : AppTheme.primaryColor,
                                ),
                              ),
                            ],
                          ),
                          if (plan != null)
                            Text(
                              '${plan.mealsPerDay} meals/day',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                        ],
                      ),
                      const Divider(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Completed Days',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          Text(
                            '${diet.completedDays}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                if (isExpiringSoon) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            size: 18, color: Colors.orange),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Your diet plan is expiring soon!',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.orange,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 12),

                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Unsubscribe Diet Plan'),
                              content: const Text(
                                  'Are you sure you want to unsubscribe from this diet plan?'),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: const Text('No'),
                                ),
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.errorColor,
                                  ),
                                  child: const Text('Yes, Unsubscribe'),
                                ),
                              ],
                            ),
                          );

                          if (confirmed == true) {
                            final result =
                                await DietService.cancelDietSubscription(
                                    diet.id);
                            if (result['success'] == true) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Diet plan unsubscribed successfully')),
                              );
                              _loadAllSubscriptions();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(result['message'] ??
                                      'Failed to unsubscribe'),
                                  backgroundColor: AppTheme.errorColor,
                                ),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.cancel_outlined, size: 18),
                        label: const Text('Unsubscribe'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.errorColor,
                          side: const BorderSide(color: AppTheme.errorColor),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          if (plan != null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    DietPlanDetailScreen(plan: plan),
                              ),
                            );
                          } else {
                            Navigator.pushNamed(context, '/diet-plans');
                          }
                        },
                        icon: const Icon(Icons.visibility, size: 18),
                        label: const Text('View Details'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMacroChip(String text, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Color _getTagColor(String tag) {
    final lowerTag = tag.toLowerCase();
    if (lowerTag.contains('veg') && !lowerTag.contains('non'))
      return Colors.green;
    if (lowerTag.contains('non-veg')) return Colors.red;
    if (lowerTag.contains('vegan')) return Colors.teal;
    if (lowerTag.contains('protein')) return Colors.blue;
    if (lowerTag.contains('keto')) return Colors.purple;
    if (lowerTag.contains('weight-loss')) return Colors.orange;
    if (lowerTag.contains('muscle')) return Colors.indigo;
    return AppTheme.primaryColor;
  }

  // Upcoming Trials Tab
  Widget _buildUpcomingTrialsTab() {
    final l10n = AppLocalizations.of(context)!;
    if (_upcomingTrials.isEmpty) {
      return _buildEmptyState(
        icon: Icons.play_circle_outline,
        title: l10n.noUpcomingTrials,
        subtitle: l10n.bookTrialFromGym,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllSubscriptions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _upcomingTrials.length,
        itemBuilder: (context, index) {
          final trial = _upcomingTrials[index];
          return _buildUpcomingTrialCard(trial);
        },
      ),
    );
  }

  Widget _buildUpcomingTrialCard(TrialBooking trial) {
    final l10n = AppLocalizations.of(context)!;
    final dateFormatter = DateFormat('MMM dd, yyyy');
    final daysUntil = trial.trialDate.difference(DateTime.now()).inDays;
    final isToday = daysUntil == 0;
    final isTomorrow = daysUntil == 1;

    Color statusColor =
        trial.isConfirmed ? AppTheme.successColor : Colors.orange;
    IconData statusIcon =
        trial.isConfirmed ? Icons.check_circle : Icons.schedule;
    String statusText = trial.isConfirmed ? l10n.confirmed : l10n.pending;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Gym Logo
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.borderColor),
                  ),
                  child: trial.gymLogo != null && trial.gymLogo!.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            trial.gymLogo!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.fitness_center,
                              size: 30,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        )
                      : const Icon(
                          Icons.fitness_center,
                          size: 30,
                          color: AppTheme.primaryColor,
                        ),
                ),
                const SizedBox(width: 12),

                // Gym Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        trial.gymName,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on,
                              size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '${trial.city}, ${trial.state}',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Status Badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 14, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const Divider(height: 24),

            // Trial Date & Time
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.1),
                    AppTheme.accentColor.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(10),
                border:
                    Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.calendar_today,
                          size: 18, color: AppTheme.primaryColor),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              dateFormatter.format(trial.trialDate),
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (isToday)
                              Text(
                                'Today',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.accentColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              )
                            else if (isTomorrow)
                              Text(
                                'Tomorrow',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.accentColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              )
                            else
                              Text(
                                'In $daysUntil days',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.textSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.access_time,
                          size: 18, color: AppTheme.primaryColor),
                      const SizedBox(width: 12),
                      Text(
                        '${trial.startTime} - ${trial.endTime}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            if (trial.address != null && trial.address!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.pin_drop,
                      size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      trial.address!,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 16),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _scheduleTrialReminder(trial),
                    icon: const Icon(Icons.notifications_active, size: 18),
                    label: Text(l10n.setReminder),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      side: const BorderSide(color: AppTheme.primaryColor),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Navigate to trial details or map
                    },
                    icon: const Icon(Icons.directions, size: 18),
                    label: Text(l10n.getDirections),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),

            if (trial.isPending) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline,
                        size: 18, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Waiting for gym confirmation. You\'ll be notified once confirmed.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.orange,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Trainers Tab
  Widget _buildTrainersTab() {
    final l10n = AppLocalizations.of(context)!;
    if (_trainerBookings.isEmpty) {
      return _buildEmptyState(
        icon: Icons.person_outline,
        title: l10n.noTrainersBooked,
        subtitle: l10n.getPersonalizedTraining,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllSubscriptions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _trainerBookings.length,
        itemBuilder: (context, index) {
          final trainer = _trainerBookings[index];
          return _buildTrainerCard(trainer);
        },
      ),
    );
  }

  Widget _buildTrainerCard(dynamic trainer) {
    final l10n = AppLocalizations.of(context)!;
    final String name = trainer['name'] ?? 'Trainer';
    final String specialization = trainer['specialization'] ?? 'Fitness Expert';
    final String experience = trainer['experience'] ?? 'Professional';
    final double rating = (trainer['rating'] ?? 4.5).toDouble();
    final String sessionType = trainer['sessionType'] ?? 'Personal Training';
    final int sessionsBooked = trainer['sessionsBooked'] ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                // Trainer Avatar
                CircleAvatar(
                  radius: 35,
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                  child: trainer['photo'] != null
                      ? ClipOval(
                          child: Image.network(
                            trainer['photo'],
                            width: 70,
                            height: 70,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.person,
                              size: 35,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        )
                      : const Icon(
                          Icons.person,
                          size: 35,
                          color: AppTheme.primaryColor,
                        ),
                ),
                const SizedBox(width: 16),

                // Trainer Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        specialization,
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.star, size: 14, color: Colors.amber),
                          const SizedBox(width: 4),
                          Text(
                            rating.toStringAsFixed(1),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Icon(Icons.work_outline,
                              size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 4),
                          Text(
                            experience,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.sessionType,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        sessionType,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        l10n.sessionsBooked,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$sessionsBooked',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // Contact trainer
                    },
                    icon: const Icon(Icons.message, size: 18),
                    label: Text(l10n.message),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      side: const BorderSide(color: AppTheme.primaryColor),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // View trainer profile or sessions
                    },
                    icon: const Icon(Icons.visibility, size: 18),
                    label: Text(l10n.viewProfile),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                size: 80, color: AppTheme.textSecondary.withValues(alpha: 0.5)),
            const SizedBox(height: 24),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
