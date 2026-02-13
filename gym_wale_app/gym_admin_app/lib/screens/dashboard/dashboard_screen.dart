import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:ui' as ui;
import 'package:flutter/rendering.dart';

import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/locale_provider.dart';
import '../../services/api_service.dart';
import '../../services/gym_service.dart';
import '../../models/dashboard_stats.dart';
import '../../models/gym_photo.dart';
import '../../models/membership_plan.dart';
import '../../models/gym_activity.dart';
import '../../models/trial_booking.dart';
import '../../utils/icon_mapper.dart';
import '../support/support_screen.dart';
import '../equipment/equipment_screen.dart';
import '../attendance/attendance_screen.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/sidebar_menu.dart';
import '../../widgets/notification_bell.dart';
import '../../widgets/notification_quick_actions.dart';
import '../../widgets/notification_preview_card.dart';

/// Comprehensive Dashboard Screen for Gym Admin App
/// Features: Stats cards, quick actions, membership plans, new members,
/// trial bookings, attendance charts, gym photos, activities, equipment gallery
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _apiService = ApiService();
  final GymService _gymService = GymService();
  final _currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
  
  DashboardStats? _stats;
  List<GymPhoto> _gymPhotos = [];
  MembershipPlan? _membershipPlan;
  String? _gymLogoUrl;
  List<dynamic> _recentActivities = [];
  List<GymActivity> _gymActivities = [];
  List<TrialBooking> _trialBookings = [];
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  int _selectedIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  String _trialStatusFilter = '';
  String _trialDateFilter = '';
  
  // Dashboard Data - TODO: Implement when backend endpoints are ready
  // final List<dynamic> _newMembers = [];
  // final List<dynamic> _trialBookings = [];
  // final List<dynamic> _recentActivity = [];
  // final List<dynamic> _equipmentGallery = [];
  // final List<dynamic> _gymPhotos = [];
  // final List<dynamic> _membershipPlans = [];
  // final List<dynamic> _activities = [];
  
  // Chart Data - TODO: Implement attendance chart
  // final int _selectedMonth = DateTime.now().month - 1;
  // final int _selectedYear = DateTime.now().year;
  // final List<double> _attendanceData = List.filled(31, 0);
  
  // Trial Bookings Filter - TODO: Implement trial bookings filter
  // final String _trialStatusFilter = '';

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    
    try {
      // Load dashboard stats (critical - if this fails, show error)
      final stats = await _apiService.getDashboardStats();
      
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
      
      // Load gym photos independently (non-critical - failures won't break the page)
      _loadGymPhotos();
      
      // Load membership plans independently (non-critical)
      _loadMembershipPlans();
      
      // Load gym logo independently (non-critical)
      _loadGymLogo();
      
      // Load recent activities independently (non-critical)
      _loadRecentActivities();
      
      // Load gym activities independently (non-critical)
      _loadGymActivities();
      
      // Load trial bookings independently (non-critical)
      _loadTrialBookings();
      
      // TODO: Load additional dashboard data (implement these methods in ApiService)
      // _newMembers = await _apiService.getNewMembers(limit: 5);
      // _trialBookings = await _apiService.getTrialBookings(limit: 5);
      // _recentActivity = await _apiService.getRecentActivity(limit: 10);
      // _equipmentGallery = await _apiService.getEquipment(limit: 4);
      // _activities = await _apiService.getGymActivities();
      // _attendanceData = await _apiService.getAttendanceChartData(_selectedMonth, _selectedYear);
      
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _loadGymPhotos() async {
    try {
      final photos = await _gymService.getGymPhotos();
      setState(() {
        _gymPhotos = photos;
      });
    } catch (e) {
      debugPrint('Error loading gym photos: $e');
      // Keep empty list, don't break the page
      setState(() {
        _gymPhotos = [];
      });
    }
  }

  Future<void> _loadMembershipPlans() async {
    try {
      final plan = await _gymService.getMembershipPlans();
      setState(() {
        _membershipPlan = plan;
      });
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        _handleTokenExpiration();
      }
      debugPrint('Error loading membership plan: $e');
      setState(() {
        _membershipPlan = null;
      });
    } catch (e) {
      debugPrint('Error loading membership plan: $e');
      setState(() {
        _membershipPlan = null;
      });
    }
  }

  Future<void> _loadGymLogo() async {
    try {
      final profile = await _gymService.getGymProfile();
      setState(() {
        _gymLogoUrl = profile['logoUrl'];
      });
    } catch (e) {
      debugPrint('Error loading gym logo: $e');
      // Logo can be null, don't break the page
    }
  }

  Future<void> _loadRecentActivities() async {
    try {
      final activities = await _apiService.getRecentActivities();
      setState(() {
        _recentActivities = activities;
      });
    } catch (e) {
      debugPrint('Error loading recent activities: $e');
      setState(() {
        _recentActivities = [];
      });
    }
  }

  Future<void> _loadGymActivities() async {
    try {
      final activities = await _gymService.getGymActivities();
      setState(() {
        _gymActivities = activities;
      });
    } catch (e) {
      debugPrint('Error loading gym activities: $e');
      setState(() {
        _gymActivities = [];
      });
    }
  }

  Future<void> _loadTrialBookings() async {
    try {
      final result = await _apiService.getTrialBookings(
        page: 1,
        limit: 10,
        status: _trialStatusFilter.isNotEmpty ? _trialStatusFilter : null,
        dateFilter: _trialDateFilter.isNotEmpty ? _trialDateFilter : null,
      );
      
      if (result != null && result['bookings'] != null) {
        setState(() {
          _trialBookings = result['bookings'] as List<TrialBooking>;
        });
      }
    } catch (e) {
      debugPrint('Error loading trial bookings: $e');
      setState(() {
        _trialBookings = [];
      });
    }
  }

  String _getCurrentGymId() {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      return authProvider.currentAdmin?.id ?? '';
    } catch (e) {
      debugPrint('Error getting gym ID: $e');
      return '';
    }
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return;
    
    // Navigate to different screens based on index
    // Using pushReplacementNamed/pushReplacement to properly replace current screen
    switch (index) {
      case 0: // Dashboard
        // Already on dashboard, do nothing
        break;
      case 1: // Members
        Navigator.pushReplacementNamed(context, '/members');
        break;
      case 2: // Trainers
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trainers screen coming soon')),
        );
        break;
      case 3: // Attendance
        // Navigate to Attendance screen with proper screen replacement
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const AttendanceScreen(),
          ),
        );
        break;
      case 4: // Payments
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payments screen coming soon')),
        );
        break;
      case 5: // Equipment
        // Navigate to Equipment screen with proper screen replacement
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const EquipmentScreen(),
          ),
        );
        break;
      case 6: // Offers
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offers screen coming soon')),
        );
        break;
      case 7: // Support & Reviews
        // Navigate to Support screen with proper screen replacement
        if (!mounted) return;
        final gymId = _getCurrentGymId();
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => SupportScreen(gymId: gymId),
          ),
        );
        break;
      case 8: // Settings
        Navigator.pushNamed(context, '/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isTablet = size.width > 600 && size.width <= 900;
    final authProvider = Provider.of<AuthProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final localeProvider = Provider.of<LocaleProvider>(context);
    final admin = authProvider.currentAdmin;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      key: _scaffoldKey,
      body: Row(
        children: [
          // Sidebar
          if (isDesktop)
            SidebarMenu(
              selectedIndex: _selectedIndex,
              onItemSelected: _onMenuItemSelected,
              memberCount: _stats?.totalUsers,
            ),

          // Main Content
          Expanded(
            child: Column(
              children: [
                // Top Navigation Bar - Compact Version
                _buildTopNavBar(context, l10n, isDesktop, isTablet, admin, themeProvider, localeProvider),

                // Content Area
                Expanded(
                  child: _buildDashboardContent(context, l10n, isDesktop),
                ),
              ],
            ),
          ),
        ],
      ),
      drawer: !isDesktop
          ? Drawer(
              child: SidebarMenu(
                selectedIndex: _selectedIndex,
                onItemSelected: (index) {
                  // Close drawer first, then navigate
                  Navigator.pop(context);
                  // Use Future.delayed to ensure drawer is fully closed
                  Future.delayed(const Duration(milliseconds: 100), () {
                    if (mounted) {
                      _onMenuItemSelected(index);
                    }
                  });
                },
                memberCount: _stats?.totalUsers,
              ),
            )
          : null,
    );
  }
  
  Widget _buildTopNavBar(
    BuildContext context,
    AppLocalizations l10n,
    bool isDesktop,
    bool isTablet,
    dynamic admin,
    ThemeProvider themeProvider,
    LocaleProvider localeProvider,
  ) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isDesktop ? 24 : 12,
        vertical: 16,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          if (!isDesktop)
            IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => _scaffoldKey.currentState?.openDrawer(),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          if (!isDesktop) const SizedBox(width: 8),
          Flexible(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const FaIcon(FontAwesomeIcons.gaugeHigh, color: AppTheme.primaryColor, size: 18),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    l10n.dashboardOverview,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      fontSize: isDesktop ? null : 16,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          // Notification Bell
          const NotificationBell(),
          SizedBox(width: isDesktop ? 16 : 8),
          _buildProfileMenu(context, l10n, admin, isDesktop, isTablet),
        ],
      ),
    );
  }

  Widget _buildProfileMenu(
    BuildContext context,
    AppLocalizations l10n,
    dynamic admin,
    bool isDesktop,
    bool isTablet,
  ) {
    return PopupMenuButton<String>(
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundImage: _gymLogoUrl != null
                ? NetworkImage(_gymLogoUrl!)
                : null,
            backgroundColor: AppTheme.primaryColor,
            child: _gymLogoUrl == null
                ? const Icon(
                    Icons.fitness_center,
                    color: Colors.white,
                    size: 18,
                  )
                : null,
          ),
          if (isDesktop || isTablet) ...[
            const SizedBox(width: 8),
            Text(admin?.name ?? 'Admin', style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down, size: 18),
          ],
        ],
      ),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'profile',
          child: Row(
            children: [
              const Icon(Icons.person_outline, size: 18),
              const SizedBox(width: 12),
              Text(l10n.profile),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'logout',
          child: Row(
            children: [
              const Icon(Icons.logout, size: 18, color: AppTheme.errorColor),
              const SizedBox(width: 12),
              const Text('Logout', style: TextStyle(color: AppTheme.errorColor)),
            ],
          ),
        ),
      ],
      onSelected: (value) {
        if (value == 'logout') {
          _handleLogout();
        } else if (value == 'profile') {
          Navigator.pushNamed(context, '/gym-profile');
        }
      },
    );
  }

  Widget _buildDashboardContent(BuildContext context, AppLocalizations l10n, bool isDesktop) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text(_errorMessage),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadDashboardData,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadDashboardData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats Cards
            _buildStatsCards(l10n, isDesktop),
            const SizedBox(height: 24),
            
            // Notification Components Row
            if (isDesktop)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(
                    flex: 2,
                    child: NotificationPreviewCard(),
                  ),
                  const SizedBox(width: 24),
                  const Expanded(
                    flex: 1,
                    child: NotificationQuickActions(),
                  ),
                ],
              )
            else
              Column(
                children: [
                  NotificationPreviewCard(),
                  SizedBox(height: 16),
                  NotificationQuickActions(),
                ],
              ),
            const SizedBox(height: 24),
            
            // Quick Actions & Activities Row
            _buildQuickActionsRow(isDesktop),
            const SizedBox(height: 24),
            
            // Gym Photos Section
            _buildGymPhotosSection(),
            const SizedBox(height: 24),
            
            // Membership Plans
            _buildMembershipPlansSection(),
            const SizedBox(height: 24),
            
            // Main Content Grid
            if (isDesktop)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        _buildNewMembersCard(l10n),
                        const SizedBox(height: 24),
                        _buildTrialBookingsCard(l10n),
                        const SizedBox(height: 24),
                        _buildAttendanceChart(l10n),
                      ],
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    flex: 1,
                    child: Column(
                      children: [
                        _buildRecentActivityCard(l10n),
                        const SizedBox(height: 24),
                        _buildEquipmentGalleryCard(l10n),
                      ],
                    ),
                  ),
                ],
              )
            else
              Column(
                children: [
                  _buildNewMembersCard(l10n),
                  const SizedBox(height: 24),
                  _buildTrialBookingsCard(l10n),
                  const SizedBox(height: 24),
                  _buildRecentActivityCard(l10n),
                  const SizedBox(height: 24),
                  _buildAttendanceChart(l10n),
                  const SizedBox(height: 24),
                  _buildEquipmentGalleryCard(l10n),
                ],
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatsCards(AppLocalizations l10n, bool isDesktop) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return GridView.count(
      crossAxisCount: isDesktop ? 4 : 2,
      crossAxisSpacing: isMobile ? 8 : 16,
      mainAxisSpacing: isMobile ? 8 : 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: isDesktop ? 1.8 : (isMobile ? 1.6 : 1.5),
      children: [
        StatCard(
          title: 'Members',
          value: _stats?.totalUsers.toString() ?? '0',
          icon: Icons.people,
          color: AppTheme.primaryColor,
          trend: _stats?.usersGrowthPercentage,
        ),
        StatCard(
          title: 'Total Payments',
          value: _currencyFormat.format(_stats?.combinedTotalRevenue ?? 0),
          icon: Icons.credit_card,
          color: AppTheme.successColor,
          trend: 12.5,
        ),
        StatCard(
          title: 'Overall Attendance',
          value: '85.0%',
          icon: Icons.calendar_today,
          color: AppTheme.infoColor,
          trend: 5.2,
        ),
        StatCard(
          title: 'Active Trainers',
          value: _stats?.activeSubscriptions.toString() ?? '0',
          icon: Icons.person,
          color: AppTheme.secondaryColor,
          trend: 8.0,
        ),
      ],
    );
  }

  Widget _buildQuickActionsRow(bool isDesktop) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      FaIcon(FontAwesomeIcons.bolt, color: AppTheme.primaryColor, size: 18),
                      SizedBox(width: 12),
                      Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _buildQuickActionsGrid(),
                ],
              ),
            ),
          ),
        ),
        if (isDesktop) ...[
          const SizedBox(width: 24),
          Expanded(
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        FaIcon(FontAwesomeIcons.heart, color: AppTheme.errorColor, size: 18),
                        SizedBox(width: 12),
                        Text('Activities Offered', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        Spacer(),
                        TextButton.icon(
                          onPressed: _showManageActivitiesDialog,
                          icon: FaIcon(FontAwesomeIcons.pen, size: 14),
                          label: Text('Manage'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _gymActivities.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                children: [
                                  FaIcon(FontAwesomeIcons.dumbbell, size: 48, color: Colors.grey[400]),
                                  SizedBox(height: 12),
                                  Text('No activities added yet', style: TextStyle(color: Colors.grey[600])),
                                  SizedBox(height: 8),
                                  ElevatedButton.icon(
                                    onPressed: _showManageActivitiesDialog,
                                    icon: FaIcon(FontAwesomeIcons.plus, size: 14),
                                    label: Text('Add Activities'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: _gymActivities.map((activity) => _buildActivityCard(activity)).toList(),
                          ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
  
  Widget _buildQuickActionsGrid() {
    final actions = [
      {'icon': FontAwesomeIcons.userPlus, 'label': 'Add Member', 'onTap': _showAddMemberDialog},
      {'icon': FontAwesomeIcons.moneyBillWave, 'label': 'Record Payment', 'onTap': _showRecordPaymentDialog},
      {'icon': FontAwesomeIcons.userTie, 'label': 'Add Trainer', 'onTap': _showAddTrainerDialog},
      {'icon': FontAwesomeIcons.dumbbell, 'label': 'Add Equipment', 'onTap': _showAddEquipmentDialog},
      {'icon': FontAwesomeIcons.qrcode, 'label': 'Generate QR', 'onTap': _showQRCodeDialog},
      {'icon': FontAwesomeIcons.fingerprint, 'label': 'Biometric', 'onTap': _showBiometricDialog},
    ];
    
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: actions.map((action) {
        return InkWell(
          onTap: action['onTap'] as VoidCallback?,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 120,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
            ),
            child: Column(
              children: [
                FaIcon(action['icon'] as IconData, color: AppTheme.primaryColor, size: 24),
                const SizedBox(height: 8),
                Text(
                  action['label'] as String,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActivityCard(GymActivity activity) {
    return InkWell(
      onTap: () => _showActivityDetailsDialog(activity),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FaIcon(
              FontAwesomeIconMapper.getIcon(activity.icon),
              color: AppTheme.primaryColor,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              activity.name,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Show activity details on click
  void _showActivityDetailsDialog(GymActivity activity) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            FaIcon(
              FontAwesomeIconMapper.getIcon(activity.icon),
              color: AppTheme.primaryColor,
              size: 28,
            ),
            SizedBox(width: 12),
            Expanded(
              child: Text(activity.name),
            ),
          ],
        ),
        content: Text(
          activity.description,
          style: TextStyle(fontSize: 16, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close'),
          ),
        ],
      ),
    );
  }

  // Show manage activities dialog
  void _showManageActivitiesDialog() async {
    // Track selected activities
    List<String> selectedActivityNames = _gymActivities.map((a) => a.name).toList();
    
    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Row(
            children: [
              FaIcon(FontAwesomeIcons.dumbbell, color: AppTheme.primaryColor),
              SizedBox(width: 12),
              Text('Manage Activities'),
            ],
          ),
          content: SizedBox(
            width: 600,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Select the activities offered at your gym:',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: PredefinedActivities.all.map((activity) {
                      final isSelected = selectedActivityNames.contains(activity.name);
                      return InkWell(
                        onTap: () {
                          setState(() {
                            if (isSelected) {
                              selectedActivityNames.remove(activity.name);
                            } else {
                              selectedActivityNames.add(activity.name);
                            }
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 140,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected 
                                ? AppTheme.primaryColor.withValues(alpha: 0.15)
                                : Colors.grey.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected 
                                  ? AppTheme.primaryColor
                                  : Colors.grey.withValues(alpha: 0.3),
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Column(
                            children: [
                              FaIcon(
                                FontAwesomeIconMapper.getIcon(activity.icon),
                                color: isSelected ? AppTheme.primaryColor : Colors.grey[600],
                                size: 28,
                              ),
                              SizedBox(height: 8),
                              Text(
                                activity.name,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected ? AppTheme.primaryColor : Colors.grey[800],
                                ),
                              ),
                              if (isSelected)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: FaIcon(
                                    FontAwesomeIcons.circleCheck,
                                    size: 16,
                                    color: AppTheme.successColor,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel'),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                Navigator.pop(context);
                await _saveActivities(selectedActivityNames);
              },
              icon: FaIcon(FontAwesomeIcons.floppyDisk, size: 16),
              label: Text('Save Activities'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveActivities(List<String> selectedNames) async {
    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(child: CircularProgressIndicator()),
      );

      // Get selected activities with full details
      final selectedActivities = PredefinedActivities.all
          .where((activity) => selectedNames.contains(activity.name))
          .toList();

      // Update activities via API
      final updatedActivities = await _gymService.updateGymActivities(selectedActivities);

      if (!mounted) return;
      Navigator.pop(context); // Close loading

      setState(() {
        _gymActivities = updatedActivities;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Activities updated successfully'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); // Close loading
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update activities: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }
  
  Widget _buildGymPhotosSection() {
    final size = MediaQuery.of(context).size;
    final isTablet = size.width > 600 && size.width <= 900;
    final isMobile = size.width <= 600;
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Flexible(
                  child: Row(
                    children: [
                      FaIcon(FontAwesomeIcons.images, color: AppTheme.primaryColor, size: 18),
                      SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          'Gym Photos',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                isMobile
                    ? IconButton(
                        onPressed: _showUploadPhotoDialog,
                        icon: const FaIcon(FontAwesomeIcons.camera, size: 18),
                        tooltip: 'Upload Photo',
                      )
                    : ElevatedButton.icon(
                        onPressed: _showUploadPhotoDialog,
                        icon: const FaIcon(FontAwesomeIcons.camera, size: 14),
                        label: const Text('Upload Photo'),
                      ),
              ],
            ),
            const SizedBox(height: 20),
            if (_gymPhotos.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    children: [
                      const Icon(Icons.photo_library_outlined, size: 48, color: Colors.grey),
                      const SizedBox(height: 12),
                      const Text(
                        'No photos uploaded yet',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Upload gym photos to showcase your facilities',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: isMobile ? 2 : (isTablet ? 3 : 4),
                  crossAxisSpacing: isMobile ? 8 : 12,
                  mainAxisSpacing: isMobile ? 8 : 12,
                  childAspectRatio: isMobile ? 0.85 : 1.2,
                ),
                itemCount: _gymPhotos.length,
                itemBuilder: (context, index) {
                  final photo = _gymPhotos[index];
                  return _buildPhotoCard(photo);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoCard(GymPhoto photo) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            photo.imageUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stack) => Container(
              color: Colors.grey[300],
              child: const Icon(Icons.broken_image, size: 48, color: Colors.grey),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.8),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    photo.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    photo.category,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: PopupMenuButton<String>(
              icon: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Icon(Icons.more_vert, color: Colors.white, size: 16),
              ),
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: Text('Edit')),
                const PopupMenuItem(value: 'delete', child: Text('Delete')),
              ],
              onSelected: (value) {
                if (value == 'edit') {
                  _showEditPhotoDialog(photo);
                } else if (value == 'delete') {
                  _deletePhoto(photo);
                }
              },
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMembershipPlansSection() {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Flexible(
                  child: Row(
                    children: [
                      FaIcon(FontAwesomeIcons.crown, color: Color(0xFFFFBE0B), size: 18),
                      SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          'Membership Plans',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (_membershipPlan != null && _membershipPlan!.monthlyOptions.isNotEmpty)
                  isMobile
                      ? IconButton(
                          onPressed: _showEditMembershipPlansDialog,
                          icon: const FaIcon(FontAwesomeIcons.penToSquare, size: 18),
                          tooltip: 'Edit Plan',
                        )
                      : OutlinedButton.icon(
                          onPressed: _showEditMembershipPlansDialog,
                          icon: const FaIcon(FontAwesomeIcons.penToSquare, size: 14),
                          label: const Text('Edit Plan'),
                        ),
              ],
            ),
            const SizedBox(height: 20),
            if (_membershipPlan == null || _membershipPlan!.monthlyOptions.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    children: [
                      const Icon(Icons.card_membership_outlined, size: 48, color: Colors.grey),
                      const SizedBox(height: 12),
                      const Text(
                        'No membership plan created yet',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Create a membership plan to offer to your members',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _showEditMembershipPlansDialog,
                        icon: const FaIcon(FontAwesomeIcons.plus, size: 14),
                        label: const Text('Create Plan'),
                      ),
                    ],
                  ),
                ),
              )
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Color(int.parse(_membershipPlan!.color.replaceFirst('#', '0xFF'))).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: FaIcon(
                          _getIconData(_membershipPlan!.icon),
                          color: Color(int.parse(_membershipPlan!.color.replaceFirst('#', '0xFF'))),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _membershipPlan!.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (_membershipPlan!.note.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                _membershipPlan!.note,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: _membershipPlan!.monthlyOptions.map((option) {
                      final Color planColor = Color(int.parse(_membershipPlan!.color.replaceFirst('#', '0xFF')));
                      return SizedBox(
                        width: 180,
                        child: Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      '${option.months} months',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (option.isPopular) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: planColor.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: const Text(
                                          'POPULAR',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.primaryColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _currencyFormat.format(option.finalPrice),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                                if (option.discount > 0) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    '${option.discount}% OFF • ${_currencyFormat.format(option.price)}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppTheme.successColor,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  if (_membershipPlan!.benefits.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Benefits Included',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _membershipPlan!.benefits
                          .map(
                            (benefit) => Chip(
                              avatar: const Icon(
                                Icons.check_circle,
                                size: 14,
                                color: AppTheme.successColor,
                              ),
                              label: Text(benefit),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ],
              ),
          ],
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'fa-star':
        return FontAwesomeIcons.star;
      case 'fa-gem':
        return FontAwesomeIcons.gem;
      case 'fa-crown':
        return FontAwesomeIcons.crown;
      default:
        return FontAwesomeIcons.leaf;
    }
  }
  
  Widget _buildNewMembersCard(AppLocalizations l10n) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                FaIcon(FontAwesomeIcons.users, color: AppTheme.primaryColor, size: 18),
                SizedBox(width: 12),
                Text('New Members', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 20),
            const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('No new members'))),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTrialBookingsCard(AppLocalizations l10n) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const FaIcon(FontAwesomeIcons.calendarPlus, color: AppTheme.primaryColor, size: 18),
                const SizedBox(width: 12),
                const Text('Trial Bookings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                // Filter buttons
                PopupMenuButton<String>(
                  icon: const Icon(Icons.filter_list, size: 20),
                  tooltip: 'Filter by status',
                  onSelected: (value) {
                    setState(() {
                      _trialStatusFilter = value;
                    });
                    _loadTrialBookings();
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(value: '', child: Text('All Statuses')),
                    PopupMenuItem(value: 'pending', child: Text('Pending')),
                    PopupMenuItem(value: 'confirmed', child: Text('Confirmed')),
                    PopupMenuItem(value: 'contacted', child: Text('Contacted')),
                    PopupMenuItem(value: 'completed', child: Text('Completed')),
                    PopupMenuItem(value: 'cancelled', child: Text('Cancelled')),
                    PopupMenuItem(value: 'no-show', child: Text('No Show')),
                  ],
                ),
                const SizedBox(width: 8),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.date_range, size: 20),
                  tooltip: 'Filter by date',
                  onSelected: (value) {
                    setState(() {
                      _trialDateFilter = value;
                    });
                    _loadTrialBookings();
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(value: '', child: Text('All Dates')),
                    PopupMenuItem(value: 'today', child: Text('Today')),
                    PopupMenuItem(value: 'tomorrow', child: Text('Tomorrow')),
                    PopupMenuItem(value: 'this-week', child: Text('This Week')),
                    PopupMenuItem(value: 'next-week', child: Text('Next Week')),
                    PopupMenuItem(value: 'this-month', child: Text('This Month')),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (_trialBookings.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    children: [
                      FaIcon(FontAwesomeIcons.calendarXmark, 
                        size: 48, 
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No trial bookings found',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _trialBookings.length > 5 ? 5 : _trialBookings.length,
                separatorBuilder: (context, index) => const Divider(height: 24),
                itemBuilder: (context, index) {
                  final booking = _trialBookings[index];
                  return _buildTrialBookingItem(booking);
                },
              ),
            if (_trialBookings.length > 5)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Center(
                  child: TextButton.icon(
                    onPressed: () {
                      // TODO: Navigate to full trial bookings page
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Full trial bookings page coming soon')),
                      );
                    },
                    icon: const Icon(Icons.arrow_forward),
                    label: Text('View All ${_trialBookings.length} Bookings'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrialBookingItem(TrialBooking booking) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    Color statusColor;
    IconData statusIcon;
    
    switch (booking.status.toLowerCase()) {
      case 'confirmed':
        statusColor = AppTheme.successColor;
        statusIcon = FontAwesomeIcons.circleCheck;
        break;
      case 'pending':
        statusColor = Colors.orange;
        statusIcon = FontAwesomeIcons.clock;
        break;
      case 'contacted':
        statusColor = Colors.blue;
        statusIcon = FontAwesomeIcons.phone;
        break;
      case 'completed':
        statusColor = Colors.green.shade700;
        statusIcon = FontAwesomeIcons.checkDouble;
        break;
      case 'cancelled':
        statusColor = AppTheme.errorColor;
        statusIcon = FontAwesomeIcons.circleXmark;
        break;
      case 'no-show':
        statusColor = Colors.grey;
        statusIcon = FontAwesomeIcons.userSlash;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = FontAwesomeIcons.question;
    }

    return InkWell(
      onTap: () => _showTrialBookingDetailsDialog(booking),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: EdgeInsets.all(isMobile ? 12 : 16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade200),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // User Profile Picture
                CircleAvatar(
                  radius: isMobile ? 20 : 24,
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                  backgroundImage: booking.profilePicture != null
                      ? NetworkImage(booking.profilePicture!)
                      : null,
                  child: booking.profilePicture == null
                      ? FaIcon(
                          FontAwesomeIcons.user,
                          size: isMobile ? 16 : 20,
                          color: AppTheme.primaryColor,
                        )
                      : null,
                ),
                SizedBox(width: isMobile ? 12 : 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.displayName,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: isMobile ? 14 : 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          FaIcon(
                            FontAwesomeIcons.envelope,
                            size: 11,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              booking.displayEmail,
                              style: TextStyle(
                                fontSize: isMobile ? 11 : 12,
                                color: Colors.grey.shade600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                // Status Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FaIcon(statusIcon, size: 12, color: statusColor),
                      const SizedBox(width: 6),
                      Text(
                        booking.status[0].toUpperCase() + booking.status.substring(1),
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Booking Details
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                _buildBookingDetail(
                  FontAwesomeIcons.calendarDay,
                  DateFormat('MMM dd, yyyy').format(booking.preferredDate),
                ),
                _buildBookingDetail(
                  FontAwesomeIcons.clock,
                  booking.preferredTime,
                ),
                if (booking.displayPhone.isNotEmpty)
                  _buildBookingDetail(
                    FontAwesomeIcons.phone,
                    booking.displayPhone,
                  ),
                if (booking.fitnessGoal != null && booking.fitnessGoal!.isNotEmpty)
                  _buildBookingDetail(
                    FontAwesomeIcons.dumbbell,
                    booking.fitnessGoal!,
                  ),
              ],
            ),
            if (!isMobile && booking.isPending) ...[
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => _updateTrialBookingStatus(booking.id, 'contacted'),
                    icon: const FaIcon(FontAwesomeIcons.phone, size: 12),
                    label: const Text('Mark Contacted'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: () => _confirmTrialBooking(booking),
                    icon: const FaIcon(FontAwesomeIcons.check, size: 12),
                    label: const Text('Confirm'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.successColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBookingDetail(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        FaIcon(icon, size: 12, color: Colors.grey.shade600),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
        ),
      ],
    );
  }
  
  Widget _buildAttendanceChart(AppLocalizations l10n) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                FaIcon(FontAwesomeIcons.chartLine, color: AppTheme.primaryColor, size: 18),
                SizedBox(width: 12),
                Text('Attendance Trend', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 300,
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: true),
                  titlesData: const FlTitlesData(show: true),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: List.generate(10, (i) => FlSpot(i.toDouble(), (i * 5).toDouble())),
                      isCurved: true,
                      color: AppTheme.primaryColor,
                      barWidth: 3,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(show: true, color: AppTheme.primaryColor.withValues(alpha: 0.1)),
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
  
  Widget _buildRecentActivityCard(AppLocalizations l10n) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                FaIcon(FontAwesomeIcons.clock, color: AppTheme.primaryColor, size: 18),
                SizedBox(width: 12),
                Text('Recent Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 20),
            if (_recentActivities.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('No recent activity')))
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _recentActivities.length > 10 ? 10 : _recentActivities.length,
                separatorBuilder: (context, index) => const Divider(),
                itemBuilder: (context, index) {
                  final activity = _recentActivities[index];
                  final type = activity['type'] ?? '';
                  final description = activity['description'] ?? 'Activity';
                  final createdAt = activity['createdAt'] != null 
                    ? DateTime.parse(activity['createdAt'])
                    : DateTime.now();
                  final timeAgo = _getTimeAgo(createdAt);
                  
                  IconData icon;
                  Color color;
                  
                  switch (type) {
                    case 'membership_plan_updated':
                      icon = FontAwesomeIcons.crown;
                      color = const Color(0xFFFFBE0B);
                      break;
                    case 'member_added':
                      icon = FontAwesomeIcons.userPlus;
                      color = AppTheme.successColor;
                      break;
                    case 'payment_recorded':
                      icon = FontAwesomeIcons.moneyBillWave;
                      color = AppTheme.primaryColor;
                      break;
                    default:
                      icon = FontAwesomeIcons.circleInfo;
                      color = Colors.grey;
                  }
                  
                  return ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: FaIcon(icon, color: color, size: 16),
                    ),
                    title: Text(
                      description,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      timeAgo,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    contentPadding: EdgeInsets.zero,
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
  
  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inDays > 0) {
      return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''} ago';
    } else {
      return 'Just now';
    }
  }
  
  Widget _buildEquipmentGalleryCard(AppLocalizations l10n) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                FaIcon(FontAwesomeIcons.dumbbell, color: AppTheme.primaryColor, size: 18),
                SizedBox(width: 12),
                Text('Equipment Gallery', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 20),
            const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('No equipment added yet'))),
          ],
        ),
      ),
    );
  }
  
  // Quick Action: Add Member
  void _showAddMemberDialog() {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final phoneController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 500),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const FaIcon(FontAwesomeIcons.userPlus, color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  const Text('Add New Member', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () async {
                      if (nameController.text.isEmpty || emailController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please fill in all required fields')),
                        );
                        return;
                      }
                      
                      final success = await _apiService.addMember({
                        'name': nameController.text,
                        'email': emailController.text,
                        'phone': phoneController.text,
                      });
                      
                      Navigator.pop(context);
                      
                      if (success) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Member added successfully!'), backgroundColor: AppTheme.successColor),
                        );
                        _loadDashboardData();
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to add member'), backgroundColor: AppTheme.errorColor),
                        );
                      }
                    },
                    child: const Text('Add Member'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Quick Action: Record Payment
  void _showRecordPaymentDialog() {
    final amountController = TextEditingController();
    String selectedMemberId = '';
    String paymentMode = 'Cash';
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 500),
          child: StatefulBuilder(
            builder: (context, setState) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const FaIcon(FontAwesomeIcons.moneyBillWave, color: AppTheme.successColor),
                    const SizedBox(width: 12),
                    const Text('Record Payment', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Text('Member ID'),
                const SizedBox(height: 8),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Enter Member ID',
                    prefixIcon: Icon(Icons.badge),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) => selectedMemberId = value,
                ),
                const SizedBox(height: 16),
                const Text('Amount'),
                const SizedBox(height: 8),
                TextField(
                  controller: amountController,
                  decoration: const InputDecoration(
                    hintText: 'Enter Amount',
                    prefixIcon: Icon(Icons.currency_rupee),
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                const Text('Payment Mode'),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: paymentMode,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.payment),
                  ),
                  items: ['Cash', 'Card', 'UPI', 'Bank Transfer']
                      .map((mode) => DropdownMenuItem(value: mode, child: Text(mode)))
                      .toList(),
                  onChanged: (value) => setState(() => paymentMode = value!),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () async {
                        if (selectedMemberId.isEmpty || amountController.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please fill in all fields')),
                          );
                          return;
                        }
                        
                        final success = await _apiService.recordPayment({
                          'memberId': selectedMemberId,
                          'amount': double.tryParse(amountController.text) ?? 0,
                          'paymentMode': paymentMode,
                          'date': DateTime.now().toIso8601String(),
                        });
                        
                        Navigator.pop(context);
                        
                        if (success) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Payment recorded successfully!'), backgroundColor: AppTheme.successColor),
                          );
                          _loadDashboardData();
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Failed to record payment'), backgroundColor: AppTheme.errorColor),
                          );
                        }
                      },
                      child: const Text('Record Payment'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Quick Action: Add Trainer
  void _showAddTrainerDialog() {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final phoneController = TextEditingController();
    final specialtyController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 500),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const FaIcon(FontAwesomeIcons.userTie, color: AppTheme.secondaryColor),
                  const SizedBox(width: 12),
                  const Text('Add New Trainer', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: specialtyController,
                decoration: const InputDecoration(
                  labelText: 'Specialty',
                  prefixIcon: Icon(Icons.fitness_center),
                  border: OutlineInputBorder(),
                  hintText: 'e.g., Yoga, CrossFit, Weight Training',
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () async {
                      if (nameController.text.isEmpty || emailController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please fill in all required fields')),
                        );
                        return;
                      }
                      
                      final success = await _apiService.addTrainer({
                        'name': nameController.text,
                        'email': emailController.text,
                        'phone': phoneController.text,
                        'specialty': specialtyController.text,
                      });
                      
                      Navigator.pop(context);
                      
                      if (success) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Trainer added successfully!'), backgroundColor: AppTheme.successColor),
                        );
                        _loadDashboardData();
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to add trainer'), backgroundColor: AppTheme.errorColor),
                        );
                      }
                    },
                    child: const Text('Add Trainer'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Quick Action: Add Equipment
  void _showAddEquipmentDialog() {
    final nameController = TextEditingController();
    final typeController = TextEditingController();
    final quantityController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 500),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const FaIcon(FontAwesomeIcons.dumbbell, color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  const Text('Add Equipment', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Equipment Name',
                  prefixIcon: Icon(Icons.fitness_center),
                  border: OutlineInputBorder(),
                  hintText: 'e.g., Treadmill, Dumbbells',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: typeController,
                decoration: const InputDecoration(
                  labelText: 'Type/Category',
                  prefixIcon: Icon(Icons.category),
                  border: OutlineInputBorder(),
                  hintText: 'e.g., Cardio, Strength',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: quantityController,
                decoration: const InputDecoration(
                  labelText: 'Quantity',
                  prefixIcon: Icon(Icons.numbers),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () async {
                      if (nameController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter equipment name')),
                        );
                        return;
                      }
                      
                      final success = await _apiService.addEquipment({
                        'name': nameController.text,
                        'type': typeController.text,
                        'quantity': int.tryParse(quantityController.text) ?? 1,
                      });
                      
                      Navigator.pop(context);
                      
                      if (success) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Equipment added successfully!'), backgroundColor: AppTheme.successColor),
                        );
                        _loadDashboardData();
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to add equipment'), backgroundColor: AppTheme.errorColor),
                        );
                      }
                    },
                    child: const Text('Add Equipment'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Quick Action: Biometric Enrollment
  void _showBiometricDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const FaIcon(FontAwesomeIcons.fingerprint, size: 64, color: AppTheme.primaryColor),
              const SizedBox(height: 24),
              const Text(
                'Biometric Enrollment',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              const Text(
                'Connect your biometric device to enroll members. Ensure the device is properly connected and configured.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Biometric enrollment feature coming soon')),
                  );
                },
                icon: const FaIcon(FontAwesomeIcons.fingerprint, size: 18),
                label: const Text('Start Enrollment'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Global key for capturing QR code as image
  final GlobalKey _qrKey = GlobalKey();

  void _showQRCodeDialog() async {
    // Fetch gym QR data
    final qrData = await _apiService.getGymQRData();
    
    if (qrData == null || !mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to generate QR code'), backgroundColor: AppTheme.errorColor),
      );
      return;
    }
    
    // Generate registration URL for QR code
    final baseUrl = 'https://gym-wale.onrender.com';
    final registrationUrl = '$baseUrl/gym-register.html?gymId=${qrData['gymId']}';
    final gymName = qrData['gymName'] ?? 'Gym';
    final gymId = qrData['gymId'] ?? '';
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 550,
            maxHeight: MediaQuery.of(context).size.height * 0.9,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  border: Border(
                    bottom: BorderSide(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Flexible(
                      child: Text(
                        'Gym Registration QR Code',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              // Scrollable content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, color: AppTheme.infoColor),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Members can scan this QR code to register or update their information',
                                style: TextStyle(fontSize: 13, color: Colors.blue.shade900),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      RepaintBoundary(
                        key: _qrKey,
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: QrImageView(
                            data: registrationUrl,
                            version: QrVersions.auto,
                            size: 250,
                            backgroundColor: Colors.white,
                            embeddedImage: _gymLogoUrl != null ? NetworkImage(_gymLogoUrl!) : null,
                            embeddedImageStyle: const QrEmbeddedImageStyle(
                              size: Size(40, 40),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        gymName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Gym ID: $gymId',
                          style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.w500),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        alignment: WrapAlignment.center,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _downloadQRCodeA4Template(registrationUrl, gymName, gymId),
                            icon: const Icon(Icons.download, size: 18),
                            label: const Text('Download A4'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => _copyUrlToClipboard(registrationUrl),
                            icon: const Icon(Icons.copy, size: 18),
                            label: const Text('Copy Link'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close, size: 18),
                            label: const Text('Close'),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                          ),
                        ],
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

  // Copy URL to clipboard
  Future<void> _copyUrlToClipboard(String url) async {
    try {
      await Clipboard.setData(ClipboardData(text: url));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration URL copied to clipboard'),
          backgroundColor: AppTheme.successColor,
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to copy URL: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  // Download QR code as A4 creative template
  Future<void> _downloadQRCodeA4Template(String qrData, String gymName, String gymId) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Generating A4 template...'),
                ],
              ),
            ),
          ),
        ),
      );

      // Show A4 template dialog for download
      Navigator.pop(context); // Close loading
      _showA4TemplateDialog(qrData, gymName, gymId);
      
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); // Close loading
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to generate template: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  // Show A4 template dialog
  void _showA4TemplateDialog(String qrData, String gymName, String gymId) {
    final GlobalKey _a4Key = GlobalKey();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 800,
            maxHeight: MediaQuery.of(context).size.height * 0.9,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  border: Border(
                    bottom: BorderSide(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'A4 QR Code Template',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: () async {
                            try {
                              final boundary = _a4Key.currentContext!.findRenderObject() as RenderRepaintBoundary;
                              final image = await boundary.toImage(pixelRatio: 3.0);
                              await image.toByteData(format: ui.ImageByteFormat.png);
                              
                              // Save file (you'll need to implement platform-specific file saving)
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Template ready! Right-click and "Save As..." to download'),
                                  backgroundColor: AppTheme.successColor,
                                ),
                              );
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Download failed: $e'),
                                  backgroundColor: AppTheme.errorColor,
                                ),
                              );
                            }
                          },
                          icon: const Icon(Icons.download, size: 18),
                          label: const Text('Download'),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Scrollable A4 template
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: RepaintBoundary(
                      key: _a4Key,
                      child: _buildA4Template(qrData, gymName, gymId),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Build A4 creative template
  Widget _buildA4Template(String qrData, String gymName, String gymId) {
    return Container(
      width: 595, // A4 width at 72 DPI (8.27 inches)
      height: 842, // A4 height at 72 DPI (11.69 inches)
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.secondaryColor.withValues(alpha: 0.05),
          ],
        ),
        border: Border.all(color: Colors.grey.shade300, width: 2),
      ),
      child: Stack(
        children: [
          // Background pattern
          Positioned.fill(
            child: Opacity(
              opacity: 0.03,
              child: Image.asset(
                'assets/icons/icon.png',
                repeat: ImageRepeat.repeat,
                errorBuilder: (context, error, stackTrace) => const SizedBox(),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Gym Wale Brand Header
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const FaIcon(
                              FontAwesomeIcons.dumbbell,
                              color: Colors.white,
                              size: 32,
                            ),
                          ),
                          const SizedBox(width: 16),
                          const Text(
                            'Gym Wale',
                            style: TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Powering Fitness Across India',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.secondaryColor,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Decorative divider
                Container(
                  height: 3,
                  width: 200,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                
                const SizedBox(height: 30),
                
                // Gym Name Sub-brand
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      if (_gymLogoUrl != null)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            _gymLogoUrl!,
                            width: 80,
                            height: 80,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.fitness_center, size: 40, color: AppTheme.primaryColor),
                            ),
                          ),
                        ),
                      if (_gymLogoUrl != null) const SizedBox(height: 12),
                      Text(
                        gymName,
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.darkColor,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'ID: $gymId',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),
                
                // QR Code
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryColor.withValues(alpha: 0.2),
                        blurRadius: 30,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: AppTheme.primaryColor.withValues(alpha: 0.3),
                            width: 3,
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: QrImageView(
                          data: qrData,
                          version: QrVersions.auto,
                          size: 300,
                          backgroundColor: Colors.white,
                          embeddedImage: _gymLogoUrl != null ? NetworkImage(_gymLogoUrl!) : null,
                          embeddedImageStyle: const QrEmbeddedImageStyle(
                            size: Size(60, 60),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Scan to Register',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),
                
                // Instructions
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.infoColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.infoColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const FaIcon(
                            FontAwesomeIcons.mobileScreen,
                            color: AppTheme.infoColor,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'How to Register',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade900,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '1. Open your phone camera\n2. Point it at the QR code\n3. Tap the notification to open the registration page\n4. Fill in your details and submit',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.blue.shade800,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Footer
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const FaIcon(
                      FontAwesomeIcons.globe,
                      size: 12,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'www.gym-wale.com',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(width: 16),
                    const FaIcon(
                      FontAwesomeIcons.envelope,
                      size: 12,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'support@gym-wale.com',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
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
  
  void _handleLogout() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('No')),
          ElevatedButton(
            onPressed: () {
              Provider.of<AuthProvider>(context, listen: false).logout();
              Navigator.of(context).pushReplacementNamed('/login');
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Yes'),
          ),
        ],
      ),
    );
  }

  void _handleTokenExpiration() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Your session has expired. Please login again.'),
        backgroundColor: AppTheme.errorColor,
        duration: Duration(seconds: 3),
      ),
    );
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        Provider.of<AuthProvider>(context, listen: false).logout();
        Navigator.of(context).pushReplacementNamed('/login');
      }
    });
  }

  // Gym Photos CRUD Operations
  Future<void> _performPhotoUpload(
    XFile photoFile,
    String title,
    String description,
    String category,
  ) async {
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => const Center(child: CircularProgressIndicator()),
    );
    
    try {
      await _gymService.uploadGymPhoto(
        photoFile: photoFile,
        title: title,
        description: description,
        category: category,
      );

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo uploaded successfully')),
        );
        _loadDashboardData();
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload photo: $e')),
        );
      }
    }
  }

  Future<void> _performPhotoUpdate(
    String photoId,
    String title,
    String description,
    XFile? newPhotoFile,
  ) async {
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => const Center(child: CircularProgressIndicator()),
    );
    
    try {
      await _gymService.updateGymPhoto(
        photoId: photoId,
        title: title,
        description: description,
        newPhotoFile: newPhotoFile,
      );

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo updated successfully')),
        );
        _loadDashboardData();
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update photo: $e')),
        );
      }
    }
  }

  Future<void> _showUploadPhotoDialog() async {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    String category = 'facilities';
    XFile? selectedImage;
    Uint8List? imageBytes;
    final imagePicker = ImagePicker();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Row(
            children: [
              FaIcon(FontAwesomeIcons.upload, size: 20),
              SizedBox(width: 12),
              Text('Upload Gym Photo'),
            ],
          ),
          content: SizedBox(
            width: 500,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (imageBytes != null)
                    Container(
                      height: 200,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: MemoryImage(imageBytes!),
                          fit: BoxFit.cover,
                        ),
                      ),
                    )
                  else
                    Container(
                      height: 200,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.image, size: 48, color: Colors.grey),
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: () async {
                                final pickedFile = await imagePicker.pickImage(
                                  source: ImageSource.gallery,
                                  maxWidth: 1920,
                                  maxHeight: 1920,
                                  imageQuality: 85,
                                );
                                if (pickedFile != null) {
                                  final bytes = await pickedFile.readAsBytes();
                                  setState(() {
                                    selectedImage = pickedFile;
                                    imageBytes = bytes;
                                  });
                                }
                              },
                              icon: const Icon(Icons.add_photo_alternate),
                              label: const Text('Select Image'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Title',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'facilities', child: Text('Facilities')),
                      DropdownMenuItem(value: 'equipment', child: Text('Equipment')),
                      DropdownMenuItem(value: 'classes', child: Text('Classes')),
                      DropdownMenuItem(value: 'exterior', child: Text('Exterior')),
                      DropdownMenuItem(value: 'amenities', child: Text('Amenities')),
                      DropdownMenuItem(value: 'general', child: Text('General')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          category = value;
                        });
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedImage == null
                  ? null
                  : () async {
                      if (titleController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter a title')),
                        );
                        return;
                      }

                      // Save values before dismissing dialog
                      final photoFile = selectedImage!;
                      final photoTitle = titleController.text;
                      final photoDescription = descriptionController.text;
                      final photoCategory = category;

                      // Close the form dialog
                      Navigator.of(context).pop();
                      
                      // Perform upload
                      _performPhotoUpload(photoFile, photoTitle, photoDescription, photoCategory);
                    },
              child: const Text('Upload'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showEditPhotoDialog(GymPhoto photo) async {
    final titleController = TextEditingController(text: photo.title);
    final descriptionController = TextEditingController(text: photo.description);
    String category = photo.category;
    XFile? selectedImage;
    Uint8List? imageBytes;
    final imagePicker = ImagePicker();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Row(
            children: [
              FaIcon(FontAwesomeIcons.penToSquare, size: 20),
              SizedBox(width: 12),
              Text('Edit Gym Photo'),
            ],
          ),
          content: SizedBox(
            width: 500,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    children: [
                      Container(
                        height: 200,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          image: DecorationImage(
                            image: imageBytes != null
                                ? MemoryImage(imageBytes!) as ImageProvider
                                : NetworkImage(photo.imageUrl),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            final pickedFile = await imagePicker.pickImage(
                              source: ImageSource.gallery,
                              maxWidth: 1920,
                              maxHeight: 1920,
                              imageQuality: 85,
                            );
                            if (pickedFile != null) {
                              final bytes = await pickedFile.readAsBytes();
                              setState(() {
                                selectedImage = pickedFile;
                                imageBytes = bytes;
                              });
                            }
                          },
                          icon: const Icon(Icons.camera_alt, size: 16),
                          label: const Text('Change'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Title',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'facilities', child: Text('Facilities')),
                      DropdownMenuItem(value: 'equipment', child: Text('Equipment')),
                      DropdownMenuItem(value: 'classes', child: Text('Classes')),
                      DropdownMenuItem(value: 'exterior', child: Text('Exterior')),
                      DropdownMenuItem(value: 'amenities', child: Text('Amenities')),
                      DropdownMenuItem(value: 'general', child: Text('General')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          category = value;
                        });
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter a title')),
                  );
                  return;
                }

                // Save values before dismissing dialog
                final photoId = photo.id;
                final photoTitle = titleController.text;
                final photoDescription = descriptionController.text;
                final newPhoto = selectedImage;

                // Close the form dialog
                Navigator.of(context).pop();
                
                // Perform update
                _performPhotoUpdate(photoId, photoTitle, photoDescription, newPhoto);
              },
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deletePhoto(GymPhoto photo) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Photo'),
        content: Text('Are you sure you want to delete "${photo.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => const Center(child: CircularProgressIndicator()),
    );
    
    try {
      await _gymService.deleteGymPhoto(photo.id);

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo deleted successfully')),
        );
        _loadDashboardData();
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete photo: $e')),
        );
      }
    }
  }

  // Membership Plan Create/Edit Operation
  Future<void> _showEditMembershipPlansDialog() async {
    final bool isCreating = _membershipPlan == null || _membershipPlan!.monthlyOptions.isEmpty;
    
    final nameController = TextEditingController(text: isCreating ? 'Standard' : _membershipPlan!.name);
    final noteController = TextEditingController(text: isCreating ? '' : _membershipPlan!.note);
    String selectedIcon = isCreating ? 'fa-star' : _membershipPlan!.icon;
    String selectedColor = isCreating ? '#3a86ff' : _membershipPlan!.color;
    List<String> selectedBenefits = isCreating ? [] : List.from(_membershipPlan!.benefits);
    List<MonthlyOption> monthOptions = isCreating 
      ? [MonthlyOption(months: 1, price: 1500), MonthlyOption(months: 3, price: 4000), MonthlyOption(months: 6, price: 7500)]
      : _membershipPlan!.monthlyOptions.map((o) => MonthlyOption(
          months: o.months,
          price: o.price,
          discount: o.discount,
          isPopular: o.isPopular,
        )).toList();

    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    final isTablet = size.width > 600 && size.width <= 900;

    // Capture the parent context before showing the dialog
    final parentContext = context;

    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Row(
            children: [
              const FaIcon(FontAwesomeIcons.crown, size: 20),
              const SizedBox(width: 12),
              Flexible(
                child: Text(
                  isCreating ? 'Create Membership Plan' : 'Edit Membership Plan',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          content: SizedBox(
            width: isMobile ? size.width * 0.9 : (isTablet ? 600 : 900),
            height: isMobile ? size.height * 0.6 : 600,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Plan Name and Icon
                  if (isMobile) ...[
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Plan Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: selectedIcon,
                            decoration: const InputDecoration(
                              labelText: 'Icon',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'fa-star', child: Row(children: [FaIcon(FontAwesomeIcons.star, size: 16), SizedBox(width: 8), Text('Star')])),
                              DropdownMenuItem(value: 'fa-gem', child: Row(children: [FaIcon(FontAwesomeIcons.gem, size: 16), SizedBox(width: 8), Text('Gem')])),
                              DropdownMenuItem(value: 'fa-crown', child: Row(children: [FaIcon(FontAwesomeIcons.crown, size: 16), SizedBox(width: 8), Text('Crown')])),
                              DropdownMenuItem(value: 'fa-leaf', child: Row(children: [FaIcon(FontAwesomeIcons.leaf, size: 16), SizedBox(width: 8), Text('Leaf')])),
                              DropdownMenuItem(value: 'fa-fire', child: Row(children: [FaIcon(FontAwesomeIcons.fire, size: 16), SizedBox(width: 8), Text('Fire')])),
                              DropdownMenuItem(value: 'fa-bolt', child: Row(children: [FaIcon(FontAwesomeIcons.bolt, size: 16), SizedBox(width: 8), Text('Bolt')])),
                            ],
                            onChanged: (value) => setState(() => selectedIcon = value!),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: selectedColor,
                            decoration: const InputDecoration(
                              labelText: 'Color',
                              border: OutlineInputBorder(),
                            ),
                            items: [
                              DropdownMenuItem(value: '#3a86ff', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFF3a86ff)), SizedBox(width: 8), Text('Blue')])),
                              DropdownMenuItem(value: '#8338ec', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFF8338ec)), SizedBox(width: 8), Text('Purple')])),
                              DropdownMenuItem(value: '#38b000', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFF38b000)), SizedBox(width: 8), Text('Green')])),
                              DropdownMenuItem(value: '#ff006e', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFFff006e)), SizedBox(width: 8), Text('Pink')])),
                              DropdownMenuItem(value: '#fb5607', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFFfb5607)), SizedBox(width: 8), Text('Orange')])),
                            ],
                            onChanged: (value) => setState(() => selectedColor = value!),
                          ),
                        ),
                      ],
                    ),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: nameController,
                            decoration: const InputDecoration(
                              labelText: 'Plan Name',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: selectedIcon,
                            decoration: const InputDecoration(
                              labelText: 'Icon',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'fa-star', child: Row(children: [FaIcon(FontAwesomeIcons.star, size: 16), SizedBox(width: 8), Text('Star')])),
                              DropdownMenuItem(value: 'fa-gem', child: Row(children: [FaIcon(FontAwesomeIcons.gem, size: 16), SizedBox(width: 8), Text('Gem')])),
                              DropdownMenuItem(value: 'fa-crown', child: Row(children: [FaIcon(FontAwesomeIcons.crown, size: 16), SizedBox(width: 8), Text('Crown')])),
                              DropdownMenuItem(value: 'fa-leaf', child: Row(children: [FaIcon(FontAwesomeIcons.leaf, size: 16), SizedBox(width: 8), Text('Leaf')])),
                              DropdownMenuItem(value: 'fa-fire', child: Row(children: [FaIcon(FontAwesomeIcons.fire, size: 16), SizedBox(width: 8), Text('Fire')])),
                              DropdownMenuItem(value: 'fa-bolt', child: Row(children: [FaIcon(FontAwesomeIcons.bolt, size: 16), SizedBox(width: 8), Text('Bolt')])),
                            ],
                            onChanged: (value) => setState(() => selectedIcon = value!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: selectedColor,
                            decoration: const InputDecoration(
                              labelText: 'Color',
                              border: OutlineInputBorder(),
                            ),
                            items: [
                              DropdownMenuItem(value: '#3a86ff', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFF3a86ff)), SizedBox(width: 8), Text('Blue')])),
                              DropdownMenuItem(value: '#8338ec', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFF8338ec)), SizedBox(width: 8), Text('Purple')])),
                              DropdownMenuItem(value: '#38b000', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFF38b000)), SizedBox(width: 8), Text('Green')])),
                              DropdownMenuItem(value: '#ff006e', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFFff006e)), SizedBox(width: 8), Text('Pink')])),
                              DropdownMenuItem(value: '#fb5607', child: Row(children: [Container(width: 20, height: 20, color: Color(0xFFfb5607)), SizedBox(width: 8), Text('Orange')])),
                            ],
                            onChanged: (value) => setState(() => selectedColor = value!),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: noteController,
                    decoration: const InputDecoration(
                      labelText: 'Plan Note',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Month Options
                  const Text('Monthly Pricing Options:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ...monthOptions.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final opt = entry.value;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: isMobile
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: TextEditingController(text: opt.months.toString()),
                                          decoration: const InputDecoration(labelText: 'Months', border: OutlineInputBorder(), isDense: true),
                                          keyboardType: TextInputType.number,
                                          onChanged: (v) {
                                            monthOptions[idx] = opt.copyWith(months: int.tryParse(v) ?? opt.months);
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: TextField(
                                          controller: TextEditingController(text: opt.price.toString()),
                                          decoration: const InputDecoration(labelText: 'Price (₹)', border: OutlineInputBorder(), isDense: true),
                                          keyboardType: TextInputType.number,
                                          onChanged: (v) {
                                            monthOptions[idx] = opt.copyWith(price: double.tryParse(v) ?? opt.price);
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: TextEditingController(text: opt.discount.toString()),
                                          decoration: const InputDecoration(labelText: 'Discount %', border: OutlineInputBorder(), isDense: true),
                                          keyboardType: TextInputType.number,
                                          onChanged: (v) {
                                            monthOptions[idx] = opt.copyWith(discount: int.tryParse(v) ?? opt.discount);
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Checkbox(
                                                  value: opt.isPopular,
                                                  onChanged: (v) {
                                                    setState(() {
                                                      monthOptions = monthOptions.map((o) => o.copyWith(isPopular: false)).toList();
                                                      monthOptions[idx] = monthOptions[idx].copyWith(isPopular: v ?? false);
                                                    });
                                                  },
                                                ),
                                                const Text('Popular', style: TextStyle(fontSize: 12)),
                                              ],
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                                              onPressed: monthOptions.length > 1 ? () {
                                                setState(() => monthOptions.removeAt(idx));
                                              } : null,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              )
                            : Row(
                          children: [
                            SizedBox(
                              width: 80,
                              child: TextField(
                                controller: TextEditingController(text: opt.months.toString()),
                                decoration: const InputDecoration(labelText: 'Months', border: OutlineInputBorder()),
                                keyboardType: TextInputType.number,
                                onChanged: (v) {
                                  monthOptions[idx] = opt.copyWith(months: int.tryParse(v) ?? opt.months);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: TextEditingController(text: opt.price.toString()),
                                decoration: const InputDecoration(labelText: 'Price (₹)', border: OutlineInputBorder()),
                                keyboardType: TextInputType.number,
                                onChanged: (v) {
                                  monthOptions[idx] = opt.copyWith(price: double.tryParse(v) ?? opt.price);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 100,
                              child: TextField(
                                controller: TextEditingController(text: opt.discount.toString()),
                                decoration: const InputDecoration(labelText: 'Discount %', border: OutlineInputBorder()),
                                keyboardType: TextInputType.number,
                                onChanged: (v) {
                                  monthOptions[idx] = opt.copyWith(discount: int.tryParse(v) ?? opt.discount);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              children: [
                                const Text('Popular', style: TextStyle(fontSize: 11)),
                                Checkbox(
                                  value: opt.isPopular,
                                  onChanged: (v) {
                                    setState(() {
                                      // Set all to false first
                                      monthOptions = monthOptions.map((o) => o.copyWith(isPopular: false)).toList();
                                      // Set this one to true
                                      monthOptions[idx] = monthOptions[idx].copyWith(isPopular: v ?? false);
                                    });
                                  },
                                ),
                              ],
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: monthOptions.length > 1 ? () {
                                setState(() => monthOptions.removeAt(idx));
                              } : null,
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        monthOptions.add(MonthlyOption(months: 1, price: 1500));
                      });
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Add Month Option'),
                  ),
                  const SizedBox(height: 20),
                  // Benefits
                  const Text('Benefits:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: PredefinedBenefits.all.map((benefit) {
                      final isSelected = selectedBenefits.contains(benefit);
                      return FilterChip(
                        label: Text(benefit),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            if (selected) {
                              selectedBenefits.add(benefit);
                            } else {
                              selectedBenefits.remove(benefit);
                            }
                          });
                        },
                        selectedColor: AppTheme.primaryColor.withValues(alpha: 0.3),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                // Validate inputs
                if (nameController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter a plan name')),
                  );
                  return;
                }
                if (monthOptions.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please add at least one pricing option')),
                  );
                  return;
                }
                
                // Close the dialog first
                Navigator.pop(dialogContext);
                
                // Show loading
                showDialog(
                  context: parentContext,
                  barrierDismissible: false,
                  builder: (loadingContext) => const Center(child: CircularProgressIndicator()),
                );
                
                try {
                  final updatedPlan = MembershipPlan(
                    name: nameController.text,
                    icon: selectedIcon,
                    color: selectedColor,
                    note: noteController.text,
                    benefits: selectedBenefits,
                    monthlyOptions: monthOptions,
                  );

                  await _gymService.updateMembershipPlans(updatedPlan);

                  if (!mounted) return;
                  
                  // Close loading dialog
                  Navigator.pop(parentContext);

                  // Show success message
                  ScaffoldMessenger.of(parentContext).showSnackBar(
                    SnackBar(
                      content: Text(isCreating ? 'Membership plan created successfully' : 'Membership plan updated successfully'),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );

                  // Reload data
                  await _loadMembershipPlans();
                  await _loadRecentActivities();
                } catch (e) {
                  if (!mounted) return;
                  
                  // Close loading dialog
                  Navigator.pop(parentContext);
                  
                  // Show error message
                  ScaffoldMessenger.of(parentContext).showSnackBar(
                    SnackBar(
                      content: Text(isCreating ? 'Failed to create plan: $e' : 'Failed to update plan: $e'),
                      backgroundColor: AppTheme.errorColor,
                    ),
                  );
                }
              },
              child: Text(isCreating ? 'Create Plan' : 'Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  // Trial Booking Action Methods
  void _showTrialBookingDetailsDialog(TrialBooking booking) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    Color statusColor;
    IconData statusIcon;
    
    switch (booking.status.toLowerCase()) {
      case 'confirmed':
        statusColor = AppTheme.successColor;
        statusIcon = FontAwesomeIcons.circleCheck;
        break;
      case 'pending':
        statusColor = Colors.orange;
        statusIcon = FontAwesomeIcons.clock;
        break;
      case 'contacted':
        statusColor = Colors.blue;
        statusIcon = FontAwesomeIcons.phone;
        break;
      case 'completed':
        statusColor = Colors.green.shade700;
        statusIcon = FontAwesomeIcons.checkDouble;
        break;
      case 'cancelled':
        statusColor = AppTheme.errorColor;
        statusIcon = FontAwesomeIcons.circleXmark;
        break;
      case 'no-show':
        statusColor = Colors.grey;
        statusIcon = FontAwesomeIcons.userSlash;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = FontAwesomeIcons.question;
    }

    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: isMobile ? double.infinity : 600,
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: SingleChildScrollView(
            padding: EdgeInsets.all(isMobile ? 20 : 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const FaIcon(FontAwesomeIcons.calendarPlus, color: AppTheme.primaryColor),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Trial Booking Details',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const Divider(height: 32),
                // User Profile Section
                Row(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                      backgroundImage: booking.profilePicture != null
                          ? NetworkImage(booking.profilePicture!)
                          : null,
                      child: booking.profilePicture == null
                          ? const FaIcon(
                              FontAwesomeIcons.user,
                              size: 28,
                              color: AppTheme.primaryColor,
                            )
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            booking.displayName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              FaIcon(
                                FontAwesomeIcons.envelope,
                                size: 12,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  booking.displayEmail,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (booking.displayPhone.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                FaIcon(
                                  FontAwesomeIcons.phone,
                                  size: 12,
                                  color: Colors.grey.shade600,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  booking.displayPhone,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Status Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FaIcon(statusIcon, size: 14, color: statusColor),
                      const SizedBox(width: 8),
                      Text(
                        'Status: ${booking.status[0].toUpperCase()}${booking.status.substring(1)}',
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                // Booking Details
                _buildDetailRow('Preferred Date', 
                  DateFormat('EEEE, MMMM dd, yyyy').format(booking.preferredDate),
                  FontAwesomeIcons.calendarDay,
                ),
                const SizedBox(height: 16),
                _buildDetailRow('Preferred Time', 
                  booking.preferredTime,
                  FontAwesomeIcons.clock,
                ),
                if (booking.fitnessGoal != null && booking.fitnessGoal!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _buildDetailRow('Fitness Goal/Activity', 
                    booking.fitnessGoal!,
                    FontAwesomeIcons.dumbbell,
                  ),
                ],
                if (booking.message != null && booking.message!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _buildDetailRow('Message', 
                    booking.message!,
                    FontAwesomeIcons.message,
                  ),
                ],
                const SizedBox(height: 16),
                _buildDetailRow('Booking Date', 
                  DateFormat('MMM dd, yyyy - hh:mm a').format(booking.createdAt),
                  FontAwesomeIcons.calendarCheck,
                ),
                const SizedBox(height: 32),
                // Action Buttons
                if (booking.isPending || booking.isContacted) ...[
                  const Text(
                    'Quick Actions',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      if (booking.isPending)
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _updateTrialBookingStatus(booking.id, 'contacted');
                          },
                          icon: const FaIcon(FontAwesomeIcons.phone, size: 14),
                          label: const Text('Mark Contacted'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          _confirmTrialBooking(booking);
                        },
                        icon: const FaIcon(FontAwesomeIcons.check, size: 14),
                        label: const Text('Confirm Booking'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successColor,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          _updateTrialBookingStatus(booking.id, 'cancelled');
                        },
                        icon: const FaIcon(FontAwesomeIcons.xmark, size: 14),
                        label: const Text('Cancel'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.errorColor,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ] else if (booking.isConfirmed) ...[
                  const Text(
                    'Update Status',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          _updateTrialBookingStatus(booking.id, 'completed');
                        },
                        icon: const FaIcon(FontAwesomeIcons.checkDouble, size: 14),
                        label: const Text('Mark Completed'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade700,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          _updateTrialBookingStatus(booking.id, 'no-show');
                        },
                        icon: FaIcon(FontAwesomeIcons.userSlash, size: 14),
                        label: const Text('Mark No-Show'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FaIcon(icon, size: 16, color: AppTheme.primaryColor),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _updateTrialBookingStatus(String bookingId, String newStatus) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final success = await _apiService.updateTrialBookingStatus(bookingId, newStatus);

      if (!mounted) return;
      Navigator.pop(context); // Close loading

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking status updated to $newStatus'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        _loadTrialBookings(); // Reload bookings
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update booking status'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); // Close loading
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<void> _confirmTrialBooking(TrialBooking booking) async {
    final messageController = TextEditingController();
    bool sendEmail = true;
    bool sendWhatsApp = false;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Confirm Trial Booking'),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Confirm trial booking for ${booking.displayName}?'),
                const SizedBox(height: 20),
                CheckboxListTile(
                  value: sendEmail,
                  onChanged: (value) => setState(() => sendEmail = value ?? true),
                  title: const Text('Send Email Confirmation'),
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                ),
                CheckboxListTile(
                  value: sendWhatsApp,
                  onChanged: (value) => setState(() => sendWhatsApp = value ?? false),
                  title: const Text('Send WhatsApp Confirmation'),
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: messageController,
                  decoration: const InputDecoration(
                    labelText: 'Additional Message (Optional)',
                    border: OutlineInputBorder(),
                    hintText: 'Any special instructions...',
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.successColor,
                foregroundColor: Colors.white,
              ),
              child: const Text('Confirm'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true) return;

    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final success = await _apiService.confirmTrialBooking(
        booking.id,
        sendEmail: sendEmail,
        sendWhatsApp: sendWhatsApp,
        additionalMessage: messageController.text,
      );

      if (!mounted) return;
      Navigator.pop(context); // Close loading

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Trial booking confirmed successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        _loadTrialBookings(); // Reload bookings
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to confirm booking'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
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
