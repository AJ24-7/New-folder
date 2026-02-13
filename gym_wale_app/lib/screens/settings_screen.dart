import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:universal_html/html.dart' as html;
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/locale_provider.dart';
import '../providers/settings_provider.dart';
import '../services/api_service.dart';
import '../config/app_theme.dart';
import '../models/membership.dart';
import '../widgets/attendance_widget_new.dart';
import '../l10n/app_localizations.dart';
import 'login_screen.dart';
import 'edit_profile_screen.dart';
import 'support_ticket_screen.dart';
import 'live_chat_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedTabIndex = 0;
  bool _isLoading = true;
  
  // Data
  List<dynamic> _gymBookings = [];
  List<dynamic> _trainerBookings = [];
  List<dynamic> _trialBookings = [];
  List<Membership> _activeMemberships = [];
  List<dynamic> _paymentMethods = [];
  List<dynamic> _transactions = [];
  Map<String, dynamic>? _trialLimits;
  
  // Settings
  final Map<String, bool> _notificationSettings = {
    'emailBookingConfirm': true,
    'emailMembershipExpiry': true,
    'emailOffers': false,
    'smsBookingReminder': true,
    'smsPaymentConfirm': false,
    'pushNotifications': true,
  };
  
  final Map<String, String> _privacySettings = {
    'profileVisibility': 'public',
    'dataSharing': 'yes',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 9, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() => _selectedTabIndex = _tabController.index);
      }
    });
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    
    try {
      // Load data in parallel
      await Future.wait([
        _loadBookings(),
        _loadMemberships(),
        _loadTransactions(),
        _loadPreferences(),
        _loadTrialLimits(),
      ]);
      
      if (mounted) {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      print('Error loading settings data: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
      _showErrorSnackBar('Failed to load some data. Please try again.');
    }
  }

  Future<void> _loadBookings() async {
    try {
      final gymBookings = await ApiService.getGymBookings();
      final trialBookings = await ApiService.getTrialBookings();
      
      if (mounted) {
        setState(() {
          _gymBookings = gymBookings;
          _trialBookings = trialBookings;
        });
      }
    } catch (e) {
      print('Error loading bookings: $e');
    }
  }

  Future<void> _loadMemberships() async {
    try {
      final memberships = await ApiService.getActiveMemberships();
      print('Loaded ${memberships.length} active memberships');
      if (memberships.isNotEmpty) {
        print('First membership data: ${memberships[0]}');
      }
      
      if (mounted) {
        setState(() {
          _gymBookings = memberships; // Store full data for ID card
          _activeMemberships = memberships.map((m) {
            final daysRemaining = m['daysRemaining'] ?? 0;
            final endDate = m['endDate'] != null 
              ? DateTime.parse(m['endDate']) 
              : DateTime.now();
            final startDate = m['startDate'] != null 
              ? DateTime.parse(m['startDate']) 
              : DateTime.now();
            
            String description;
            if (daysRemaining > 30) {
              description = 'Valid for ${(daysRemaining / 30).floor()} more months';
            } else if (daysRemaining > 0) {
              description = 'Expires in $daysRemaining days';
            } else {
              description = 'Expired';
            }
            
            // Calculate correct duration from plan data
            final planDuration = m['plan']?['duration'] ?? 1;
            final planDurationType = m['plan']?['durationType'] ?? 'month';
            int durationDays = planDuration;
            if (planDurationType == 'month') {
              durationDays = planDuration * 30;
            } else if (planDurationType == 'quarter') {
              durationDays = 90;
            } else if (planDurationType == 'year') {
              durationDays = 365;
            }
            
            return Membership(
              id: m['id'] ?? m['membershipId'] ?? '',
              gymId: m['gym']?['id'] ?? '',
              name: '${m['gym']?['name'] ?? 'Unknown Gym'} - ${m['plan']?['name'] ?? 'Standard'}',
              description: description,
              price: ((m['plan']?['price'] ?? 0) is int 
                  ? (m['plan']?['price'] ?? 0).toDouble() 
                  : m['plan']?['price'] ?? 0.0),
              duration: durationDays,
              durationType: planDurationType,
              features: List<String>.from(m['benefits'] ?? []),
              isPopular: false,
              createdAt: startDate,
            );
          }).toList();
        });
      }
    } catch (e) {
      print('Error loading memberships: $e');
    }
  }

  Future<void> _loadTransactions() async {
    try {
      final transactions = await ApiService.getTransactions();
      
      if (mounted) {
        setState(() {
          _transactions = transactions.map((t) {
            return {
              'id': t['id'],
              'type': t['type'] ?? 'membership',
              'title': t['gymName'] ?? 'Unknown Gym',
              'subtitle': '${t['planName']} - ${t['duration']}',
              'amount': t['amount'] ?? 0,
              'date': t['date'] ?? DateTime.now().toString(),
              'status': t['paymentStatus'] ?? 'pending',
              'paymentMode': t['paymentMode'] ?? 'Cash',
            };
          }).toList();
        });
      }
    } catch (e) {
      print('Error loading transactions: $e');
    }
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await ApiService.getPreferences();
      
      if (prefs != null && mounted) {
        setState(() {
          final notifications = prefs['notifications'];
          if (notifications != null) {
            _notificationSettings['emailBookingConfirm'] = 
              notifications['email']?['bookingConfirm'] ?? true;
            _notificationSettings['emailMembershipExpiry'] = 
              notifications['email']?['membershipExpiry'] ?? true;
            _notificationSettings['emailOffers'] = 
              notifications['email']?['offers'] ?? false;
            _notificationSettings['smsBookingReminder'] = 
              notifications['sms']?['bookingReminder'] ?? true;
            _notificationSettings['smsPaymentConfirm'] = 
              notifications['sms']?['paymentConfirm'] ?? false;
            _notificationSettings['pushNotifications'] = 
              notifications['push']?['enabled'] ?? true;
          }
          
          final privacy = prefs['privacy'];
          if (privacy != null) {
            _privacySettings['profileVisibility'] = 
              privacy['profileVisibility'] ?? 'public';
            _privacySettings['dataSharing'] = 
              privacy['dataSharing'] ?? 'yes';
          }
        });
      }
    } catch (e) {
      print('Error loading preferences: $e');
    }
  }

  Future<void> _loadTrialLimits() async {
    try {
      final limits = await ApiService.getTrialLimits();
      
      if (limits != null && mounted) {
        setState(() {
          _trialLimits = limits;
        });
      }
    } catch (e) {
      print('Error loading trial limits: $e');
    }
  }

  void _showErrorSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
      
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoading ? _buildLoadingScreen() : _buildMainContent(),
    );
  }

  Widget _buildLoadingScreen() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.secondaryColor, AppTheme.primaryColor],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: AppTheme.accentColor),
            const SizedBox(height: 24),
            Text(
              'Loading your settings...',
              style: TextStyle(
                color: Theme.of(context).textTheme.bodyLarge?.color,
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    return SafeArea(
      child: Column(
        children: [
          _buildHeader(),
          _buildTabBar(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildGeneralTab(),
                _buildBookingsTab(),
                _buildMembershipsTab(),
                _buildPaymentsTab(),
                _buildCouponsTab(),
                _buildNotificationsTab(),
                _buildPrivacyTab(),
                _buildAccountTab(),
                _buildSupportTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        final user = authProvider.user;
        final name = (user?.name ?? 'User').trim();
        final hasImage = user?.profileImage != null && user!.profileImage!.isNotEmpty;
        
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
            ),
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(24),
              bottomRight: Radius.circular(24),
            ),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 35,
                backgroundColor: Colors.white.withOpacity(0.2),
                backgroundImage: hasImage ? CachedNetworkImageProvider(user.profileImage!) : null,
                onBackgroundImageError: hasImage ? (exception, stackTrace) {
                  print('❌ Error loading profile image: ${user.profileImage} - $exception');
                } : null,
                child: !hasImage
                    ? Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'U',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
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
                      name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.email ?? '',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.accentColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Free Account',
                        style: TextStyle(
                          color: AppTheme.darkColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                  );
                },
                icon: const Icon(Icons.edit, color: Colors.white),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildTabButton('General', Icons.settings, 0),
            _buildTabButton('My Bookings', Icons.calendar_today, 1),
            _buildTabButton('Memberships', Icons.card_membership, 2),
            _buildTabButton('Payments', Icons.payment, 3),
            _buildTabButton('Coupons', Icons.local_offer, 4),
            _buildTabButton('Notifications', Icons.notifications, 5),
            _buildTabButton('Privacy', Icons.security, 6),
            _buildTabButton('Account', Icons.person, 7),
            _buildTabButton('Support', Icons.help, 8),
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(String title, IconData icon, int index) {
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
          color: isSelected ? null : (isDark ? const Color(0xFF2C2C2C) : Colors.white),
          border: Border.all(
            color: isSelected ? Colors.transparent : (isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor),
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
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
              color: isSelected ? Colors.white : (isDark ? Colors.grey[400] : AppTheme.textSecondary),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : Theme.of(context).textTheme.bodyLarge?.color,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Tab Content Builders
  Widget _buildGeneralTab() {
    // Check if user has active gym memberships to show attendance
    final hasActiveMembership = _activeMemberships.isNotEmpty;
    final firstMembership = hasActiveMembership ? _gymBookings.first : null;
    final gymId = firstMembership?['gym']?['_id'] ?? firstMembership?['gym']?['id'];
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('General Settings', 'Customize your app experience'),
          const SizedBox(height: 24),
          
          // Attendance Widget - Show only if user has active gym membership
          if (hasActiveMembership && gymId != null) ...[
            AttendanceWidget(gymId: gymId),
            const SizedBox(height: 24),
          ],
          
          // Appearance Section
          _buildSettingsSection(
            'Appearance',
            Icons.palette,
            [
              _buildThemeSetting(),
              _buildLanguageSetting(),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Display Settings
          _buildSettingsSection(
            'Display',
            Icons.display_settings,
            [
              _buildToggleSetting(
                'Show Animations',
                'Enable smooth animations throughout the app',
                true,
                Icons.animation,
                (value) async {
                  // TODO: Implement in settings provider
                },
              ),
              _buildSliderSetting(
                'Font Size',
                'Adjust text size for better readability',
                14.0,
                12.0,
                18.0,
                Icons.format_size,
                (value) async {
                  // TODO: Implement in settings provider
                },
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // App Settings
          _buildSettingsSection(
            'App Preferences',
            Icons.tune,
            [
              _buildToggleSetting(
                'Sound',
                'Play sounds for app interactions',
                true,
                Icons.volume_up,
                (value) async {
                  // TODO: Implement in settings provider
                },
              ),
              _buildToggleSetting(
                'Vibration',
                'Haptic feedback for interactions',
                true,
                Icons.vibration,
                (value) async {
                  // TODO: Implement in settings provider
                },
              ),
              _buildToggleSetting(
                'Auto-play Videos',
                'Automatically play videos in feeds',
                false,
                Icons.play_circle,
                (value) async {
                  // TODO: Implement in settings provider
                },
              ),
              _buildToggleSetting(
                'Data Saver Mode',
                'Reduce data usage by loading lower quality images',
                false,
                Icons.data_saver_on,
                (value) async {
                  // TODO: Implement in settings provider
                },
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Measurement Settings
          _buildSettingsSection(
            'Measurements',
            Icons.straighten,
            [
              _buildMeasurementSystemSetting(),
            ],
          ),
          
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildBookingsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('My Bookings', 'Manage your gym memberships, trainer sessions, and trial bookings'),
          const SizedBox(height: 20),
          // Trial Limits Card
          if (_trialLimits != null) _buildTrialLimitsCard(),
          if (_trialLimits != null) const SizedBox(height: 20),
          _buildBookingCategory(
            'Gym Memberships',
            Icons.fitness_center,
            _gymBookings,
            'gym',
          ),
          const SizedBox(height: 20),
          _buildBookingCategory(
            'Trainer Sessions',
            Icons.person,
            _trainerBookings,
            'trainer',
          ),
          const SizedBox(height: 20),
          _buildBookingCategory(
            'Trial Bookings',
            Icons.event_available,
            _trialBookings,
            'trial',
          ),
        ],
      ),
    );
  }

  Widget _buildMembershipsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Active Memberships', 'View and manage your current gym memberships'),
          const SizedBox(height: 20),
          _activeMemberships.isEmpty
              ? _buildEmptyState('No active memberships', 'Browse gyms to start your fitness journey')
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _activeMemberships.length,
                  itemBuilder: (context, index) {
                    final membership = _activeMemberships[index];
                    return _buildMembershipCard(membership);
                  },
                ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                  label: const Text('Find New Gym'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Payment Methods & History', 'Manage your payment methods and view transaction history'),
          const SizedBox(height: 20),
          _buildSubsectionTitle('Saved Payment Methods'),
          const SizedBox(height: 12),
          _paymentMethods.isEmpty
              ? _buildEmptyState('No saved payment methods', 'Add a payment method for faster checkout')
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _paymentMethods.length,
                  itemBuilder: (context, index) => _buildPaymentMethodCard(_paymentMethods[index]),
                ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _showAddPaymentMethodDialog,
            icon: const Icon(Icons.add),
            label: const Text('Add Payment Method'),
          ),
          const SizedBox(height: 24),
          _buildSubsectionTitle('Recent Transactions'),
          const SizedBox(height: 12),
          _transactions.isEmpty
              ? _buildEmptyState('No transactions yet', '')
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _transactions.length,
                  itemBuilder: (context, index) => _buildTransactionCard(_transactions[index]),
                ),
        ],
      ),
    );
  }

  Widget _buildCouponsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('My Coupons & Offers', 'Manage your claimed coupons and discover new offers'),
          const SizedBox(height: 20),
          _buildEmptyState('No coupons available', 'Check back later for exciting offers'),
        ],
      ),
    );
  }

  Widget _buildNotificationsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Notification Preferences', 'Control how and when you receive notifications'),
          const SizedBox(height: 20),
          _buildNotificationGroup(
            'Email Notifications',
            [
              {'key': 'emailBookingConfirm', 'title': 'Booking Confirmations', 'subtitle': 'Get notified when booking is confirmed'},
              {'key': 'emailMembershipExpiry', 'title': 'Membership Expiry', 'subtitle': 'Reminders before membership expires'},
              {'key': 'emailOffers', 'title': 'Promotional Offers', 'subtitle': 'Receive exclusive deals and offers'},
            ],
          ),
          const SizedBox(height: 20),
          _buildNotificationGroup(
            'SMS Notifications',
            [
              {'key': 'smsBookingReminder', 'title': 'Booking Reminders', 'subtitle': 'SMS reminders before your session'},
              {'key': 'smsPaymentConfirm', 'title': 'Payment Confirmations', 'subtitle': 'Instant payment confirmations'},
            ],
          ),
          const SizedBox(height: 20),
          _buildNotificationGroup(
            'Push Notifications',
            [
              {'key': 'pushNotifications', 'title': 'Enable Push Notifications', 'subtitle': 'Get real-time updates on your phone'},
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _saveNotificationSettings,
              icon: const Icon(Icons.save),
              label: const Text('Save Preferences'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacyTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Privacy & Security', 'Manage your privacy settings and account security'),
          const SizedBox(height: 20),
          _buildPrivacySection(),
          const SizedBox(height: 20),
          _buildSecuritySection(),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _savePrivacySettings,
              icon: const Icon(Icons.save),
              label: const Text('Save Privacy Settings'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Account Settings', 'Manage your account preferences and data'),
          const SizedBox(height: 20),
          _buildAccountInfo(),
          const SizedBox(height: 20),
          _buildDataManagement(),
          const SizedBox(height: 20),
          _buildDangerZone(),
        ],
      ),
    );
  }

  Widget _buildSupportTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Help & Support', 'Get help with your account, report issues, and find answers'),
          const SizedBox(height: 20),
          _buildSupportQuickActions(),
          const SizedBox(height: 20),
          _buildContactOptions(),
          const SizedBox(height: 20),
          _buildFAQSection(),
        ],
      ),
    );
  }

  // Helper Widgets
  Widget _buildSectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).textTheme.titleLarge?.color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 14,
            color: Theme.of(context).textTheme.bodyMedium?.color,
          ),
        ),
      ],
    );
  }

  Widget _buildSubsectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Theme.of(context).textTheme.titleLarge?.color,
      ),
    );
  }

  Widget _buildTrialLimitsCard() {
    final used = _trialLimits?['used'] ?? 0;
    final total = _trialLimits?['total'] ?? 3;
    final remaining = _trialLimits?['remaining'] ?? 0;
    final pending = _trialLimits?['pending'] ?? 0;
    final completed = _trialLimits?['completed'] ?? 0;

    final progress = total > 0 ? used / total : 0.0;
    
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor.withOpacity(0.1),
              AppTheme.accentColor.withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.accentColor.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.play_circle,
                    color: AppTheme.accentColor,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Free Trial Sessions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).textTheme.titleLarge?.color,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Monthly Allowance',
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).textTheme.bodyMedium?.color,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // Progress Bar
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '$used of $total trials used',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).textTheme.bodyLarge?.color,
                            ),
                          ),
                          Text(
                            '$remaining remaining',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: remaining > 0 ? AppTheme.successColor : AppTheme.errorColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 10,
                          backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            remaining > 0 ? AppTheme.successColor : AppTheme.errorColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Stats Row
            Row(
              children: [
                Expanded(
                  child: _buildStatChip(
                    'Pending',
                    pending.toString(),
                    Icons.schedule,
                    Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatChip(
                    'Completed',
                    completed.toString(),
                    Icons.check_circle,
                    AppTheme.successColor,
                  ),
                ),
              ],
            ),
            
            if (remaining <= 0)
              Container(
                margin: const EdgeInsets.only(top: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.errorColor),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info, size: 20, color: AppTheme.errorColor),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Trial limit reached for this month. Limit resets next month.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.errorColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip(String label, String value, IconData icon, Color color) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(isDark ? 0.2 : 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCategory(String title, IconData icon, List<dynamic> bookings, String type) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppTheme.primaryColor),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleLarge?.color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            bookings.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: Text(
                        'No bookings found',
                        style: TextStyle(
                          color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
                        ),
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: bookings.length,
                    itemBuilder: (context, index) => _buildBookingItem(bookings[index]),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingItem(dynamic booking) {
    final type = booking['type'] ?? 'unknown';
    final gymName = booking['gymName'] ?? 'Unknown Gym';
    final gymLogo = booking['gymLogo'];
    
    String displayName;
    String displayDetails;
    String status;
    Color statusColor;
    
    if (type == 'gym') {
      // Gym Membership
      displayName = gymName;
      final membershipName = booking['membershipName'] ?? 'Membership';
      final duration = booking['duration'] ?? '';
      displayDetails = '$membershipName${duration.isNotEmpty ? ' - $duration' : ''}';
      
      // Check if membership is expired
      if (booking['endDate'] != null) {
        final endDate = DateTime.parse(booking['endDate']);
        final now = DateTime.now();
        
        if (endDate.isBefore(now)) {
          status = 'Expired';
          statusColor = AppTheme.errorColor;
        } else {
          final daysRemaining = endDate.difference(now).inDays;
          if (daysRemaining <= 7) {
            status = 'Expiring Soon';
            statusColor = Colors.orange;
          } else {
            status = 'Active';
            statusColor = AppTheme.successColor;
          }
        }
      } else {
        // Fallback: check status from backend
        final backendStatus = booking['status']?.toString().toLowerCase() ?? '';
        if (backendStatus == 'expired') {
          status = 'Expired';
          statusColor = AppTheme.errorColor;
        } else if (backendStatus == 'active' || backendStatus == 'paid') {
          status = 'Active';
          statusColor = AppTheme.successColor;
        } else {
          status = backendStatus.isNotEmpty ? backendStatus[0].toUpperCase() + backendStatus.substring(1) : 'Unknown';
          statusColor = Colors.orange;
        }
      }
    } else if (type == 'trial') {
      // Trial Booking
      displayName = gymName;
      final trialDateStr = booking['trialDate'];
      final startTime = booking['startTime'] ?? '';
      
      if (trialDateStr != null) {
        final trialDate = DateTime.parse(trialDateStr);
        final formattedDate = '${trialDate.day}/${trialDate.month}/${trialDate.year}';
        displayDetails = 'Trial on $formattedDate${startTime.isNotEmpty ? ' at $startTime' : ''}';
        
        // Check if trial date has passed
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        final trialDay = DateTime(trialDate.year, trialDate.month, trialDate.day);
        
        if (trialDay.isBefore(today)) {
          status = 'Completed';
          statusColor = AppTheme.primaryColor;
        } else if (trialDay.isAtSameMomentAs(today)) {
          status = 'Today';
          statusColor = AppTheme.accentColor;
        } else {
          final bookingStatus = booking['status'] ?? 'pending';
          if (bookingStatus == 'confirmed') {
            status = 'Confirmed';
            statusColor = AppTheme.successColor;
          } else if (bookingStatus == 'cancelled') {
            status = 'Cancelled';
            statusColor = AppTheme.errorColor;
          } else {
            status = 'Pending';
            statusColor = Colors.orange;
          }
        }
      } else {
        displayDetails = 'Trial Session';
        status = booking['status'] ?? 'Pending';
        statusColor = Colors.orange;
      }
    } else {
      displayName = 'Booking';
      displayDetails = 'Details';
      status = 'Unknown';
      statusColor = Colors.grey;
    }
    
    return InkWell(
      onTap: () => _showBookingDetailsDialog(booking),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
        children: [
          // Gym Logo
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: AppTheme.backgroundColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: gymLogo != null && gymLogo.isNotEmpty
                ? ClipRRect(
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
                      errorWidget: (context, url, error) {
                        print('❌ Error loading gym logo: $url - $error');
                        return const Icon(
                          Icons.fitness_center,
                          color: AppTheme.primaryColor,
                          size: 24,
                        );
                      },
                    ),
                  )
                : const Icon(
                    Icons.fitness_center,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  displayDetails,
                  style: TextStyle(
                    color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor),
            ),
            child: Text(
              status,
              style: TextStyle(
                color: statusColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
        ),
      ),
    );
  }

  final GlobalKey _qrKey = GlobalKey();

  void _showMembershipDetailsDialog(Membership membership, Map<String, dynamic> bookingData) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    
    // Debug log to check booking data
    print('Booking data: $bookingData');
    
    final gymName = bookingData['gym']?['name'] ?? bookingData['gymName'] ?? membership.name.split(' - ')[0];
    final gymLogo = bookingData['gym']?['logo'] ?? bookingData['gymLogo'];
    final gymAddress = bookingData['gym']?['address'] ?? 'Address not available';
    final membershipId = bookingData['membershipId'] ?? bookingData['id'] ?? membership.id;
    final planName = bookingData['plan']?['name'] ?? 'Standard';
    final startDate = membership.createdAt;
    // Calculate endDate properly
    final endDate = bookingData['endDate'] != null 
        ? DateTime.parse(bookingData['endDate'])
        : bookingData['membershipValidUntil'] != null
            ? DateTime.parse(bookingData['membershipValidUntil'])
            : DateTime.now();
    // Calculate days remaining from actual dates
    final now = DateTime.now();
    final daysRemaining = endDate.isAfter(now) ? endDate.difference(now).inDays : 0;
    
    // Generate QR code data
    final qrData = '''{
  "membershipId": "$membershipId",
  "userId": "${user?.id ?? ''}",
  "userName": "${user?.name ?? ''}",
  "userEmail": "${user?.email ?? ''}",
  "gymId": "${membership.gymId}",
  "gymName": "$gymName",
  "planName": "$planName",
  "validUntil": "${endDate.toIso8601String()}"
}''';

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 500, maxHeight: 700),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                    ),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
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
                            child: (gymLogo != null && gymLogo.isNotEmpty) 
                              ? Image.network(
                                  gymLogo,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return const Icon(
                                      Icons.fitness_center,
                                      color: AppTheme.primaryColor,
                                    );
                                  },
                                )
                              : const Icon(
                                  Icons.fitness_center,
                                  color: AppTheme.primaryColor,
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
                
                // User ID Card
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppTheme.accentColor.withOpacity(0.1),
                          AppTheme.primaryColor.withOpacity(0.1),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
                    ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        // User Info Row
                        Row(
                          children: [
                            // User Image
                            CircleAvatar(
                              radius: 40,
                              backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                              backgroundImage: user?.profileImage != null && user!.profileImage!.isNotEmpty
                                  ? CachedNetworkImageProvider(user.profileImage!)
                                  : null,
                              onBackgroundImageError: user?.profileImage != null && user!.profileImage!.isNotEmpty
                                  ? (exception, stackTrace) {
                                      print('❌ Error loading profile image: ${user.profileImage} - $exception');
                                    }
                                  : null,
                              child: user?.profileImage == null || user!.profileImage!.isEmpty
                                  ? Text(
                                      (user?.name ?? 'U').substring(0, 1).toUpperCase(),
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
                                    user?.name ?? 'User',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Theme.of(context).textTheme.titleLarge?.color,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    user?.email ?? '',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Theme.of(context).textTheme.bodyMedium?.color,
                                    ),
                                  ),
                                  if (user?.address != null && user!.address!.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Icon(
                                          Icons.location_on,
                                          size: 14,
                                          color: Theme.of(context).textTheme.bodyMedium?.color,
                                        ),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            user.address!,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Theme.of(context).textTheme.bodyMedium?.color,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
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
                ),
                
                // Membership Details
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      _buildDetailRow('Plan', planName),
                      _buildDetailRow('Duration', membership.durationLabel),
                      _buildDetailRow('Start Date', '${startDate.day}/${startDate.month}/${startDate.year}'),
                      _buildDetailRow('Valid Until', '${endDate.day}/${endDate.month}/${endDate.year}'),
                      _buildDetailRow('Days Remaining', daysRemaining > 0 ? '$daysRemaining days' : 'Expired'),
                      _buildDetailRow('Amount Paid', '₹${membership.price.toStringAsFixed(0)}'),
                      _buildDetailRow('Gym Address', gymAddress),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 20),
                
                // QR Code
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
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
                      RepaintBoundary(
                        key: _qrKey,
                        child: Container(
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
                      ),
                    ],
                  ),
                ),
                
                // Download Button
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _downloadQRCode(membershipId),
                      icon: const Icon(Icons.download),
                      label: const Text('Download QR Code'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _downloadQRCode(String membershipId) async {
    try {
      // Find the RenderRepaintBoundary
      final boundary = _qrKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) {
        _showErrorSnackBar('Failed to generate QR code');
        return;
      }
      
      // Convert to image
      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      
      if (byteData == null) {
        _showErrorSnackBar('Failed to generate QR code');
        return;
      }
      
      final pngBytes = byteData.buffer.asUint8List();
      final fileName = 'membership_qr_$membershipId.png';
      
      if (kIsWeb) {
        // Web download
        final blob = html.Blob([pngBytes]);
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.AnchorElement(href: url)
          ..setAttribute('download', fileName)
          ..click();
        html.Url.revokeObjectUrl(url);
        
        if (mounted) {
          _showSuccessSnackBar('QR code downloaded successfully');
        }
      } else {
        // Mobile download
        final directory = Platform.isAndroid
            ? Directory('/storage/emulated/0/Download')
            : await getApplicationDocumentsDirectory();
        
        final file = File('${directory.path}/$fileName');
        await file.writeAsBytes(pngBytes);
        
        if (mounted) {
          _showSuccessSnackBar('QR code saved to ${directory.path}/$fileName');
        }
      }
    } catch (e) {
      print('Error downloading QR code: $e');
      if (mounted) {
        _showErrorSnackBar('Failed to download QR code');
      }
    }
  }

  void _showBookingDetailsDialog(dynamic booking) {
    final type = booking['type'] ?? 'unknown';
    final gymName = booking['gymName'] ?? 'Unknown Gym';
    final gymLogo = booking['gymLogo'];
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            if (gymLogo != null && gymLogo.isNotEmpty)
              Container(
                width: 40,
                height: 40,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    gymLogo,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.fitness_center,
                      color: AppTheme.primaryColor,
                      size: 24,
                    ),
                  ),
                ),
              ),
            Expanded(
              child: Text(
                type == 'gym' ? 'Membership Details' : 'Trial Details',
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDetailRow('Gym Name', gymName),
              const Divider(height: 24),
              
              if (type == 'gym') ...[
                // Membership specific details
                if (booking['membershipId'] != null && booking['membershipId'].toString().isNotEmpty)
                  _buildDetailRow('Membership ID', booking['membershipId'].toString()),
                
                if (booking['membershipName'] != null)
                  _buildDetailRow('Plan', booking['membershipName'].toString()),
                
                if (booking['duration'] != null)
                  _buildDetailRow('Duration', booking['duration'].toString()),
                
                if (booking['startDate'] != null)
                  ..._buildStartDateRow(booking['startDate']),
                
                if (booking['endDate'] != null)
                  ..._buildEndDateRows(booking['endDate']),
                
                if (booking['amount'] != null)
                  _buildDetailRow('Amount Paid', '₹${booking['amount']}', 
                    valueStyle: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                      fontSize: 16,
                    ),
                  ),
                
                if (booking['status'] != null)
                  ..._buildMembershipStatusRow(booking['status'], booking['endDate']),
                
                if (booking['address'] != null && booking['address'].toString().isNotEmpty) ...[
                  const Divider(height: 24),
                  _buildDetailRow('Address', booking['address'].toString(), 
                    valueStyle: const TextStyle(fontSize: 13),
                  ),
                ],
              ] else if (type == 'trial') ...[
                // Trial specific details
                if (booking['trialDate'] != null)
                  ..._buildTrialDateRow(booking['trialDate']),
                
                if (booking['startTime'] != null)
                  _buildDetailRow('Time', booking['startTime'].toString()),
                
                if (booking['status'] != null)
                  ..._buildTrialStatusRow(booking['status'], booking['trialDate']),
                
                if (booking['address'] != null && booking['address'].toString().isNotEmpty) ...[
                  const Divider(height: 24),
                  _buildDetailRow('Address', booking['address'].toString(),
                    valueStyle: const TextStyle(fontSize: 13),
                  ),
                ],
              ],
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

  List<Widget> _buildStartDateRow(dynamic startDateStr) {
    final startDate = DateTime.parse(startDateStr);
    return [
      _buildDetailRow('Booking Date', '${startDate.day}/${startDate.month}/${startDate.year}'),
    ];
  }

  List<Widget> _buildEndDateRows(dynamic endDateStr) {
    final endDate = DateTime.parse(endDateStr);
    final now = DateTime.now();
    final isExpired = endDate.isBefore(now);
    final daysRemaining = endDate.difference(now).inDays;
    
    return [
      _buildDetailRow('Valid Until', '${endDate.day}/${endDate.month}/${endDate.year}'),
      if (!isExpired && daysRemaining >= 0)
        _buildDetailRow('Days Remaining', '$daysRemaining days'),
    ];
  }

  List<Widget> _buildMembershipStatusRow(dynamic status, dynamic endDateStr) {
    final backendStatus = status.toString().toLowerCase();
    String statusText;
    Color statusColor;
    
    if (endDateStr != null) {
      final endDate = DateTime.parse(endDateStr);
      final now = DateTime.now();
      if (endDate.isBefore(now)) {
        statusText = 'Expired';
        statusColor = AppTheme.errorColor;
      } else {
        final daysRemaining = endDate.difference(now).inDays;
        if (daysRemaining <= 7) {
          statusText = 'Expiring Soon';
          statusColor = Colors.orange;
        } else {
          statusText = 'Active';
          statusColor = AppTheme.successColor;
        }
      }
    } else if (backendStatus == 'expired') {
      statusText = 'Expired';
      statusColor = AppTheme.errorColor;
    } else if (backendStatus == 'active' || backendStatus == 'paid') {
      statusText = 'Active';
      statusColor = AppTheme.successColor;
    } else {
      statusText = backendStatus[0].toUpperCase() + backendStatus.substring(1);
      statusColor = Colors.orange;
    }
    
    return [
      const Divider(height: 24),
      Row(
        children: [
          const Text(
            'Status',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor),
            ),
            child: Text(
              statusText,
              style: TextStyle(
                color: statusColor,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    ];
  }

  List<Widget> _buildTrialDateRow(dynamic trialDateStr) {
    final trialDate = DateTime.parse(trialDateStr);
    return [
      _buildDetailRow('Trial Date', '${trialDate.day}/${trialDate.month}/${trialDate.year}'),
    ];
  }

  List<Widget> _buildTrialStatusRow(dynamic status, dynamic trialDateStr) {
    final trialStatus = status.toString();
    String statusText;
    Color statusColor;
    
    if (trialDateStr != null) {
      final trialDate = DateTime.parse(trialDateStr);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final trialDay = DateTime(trialDate.year, trialDate.month, trialDate.day);
      
      if (trialDay.isBefore(today)) {
        statusText = 'Completed';
        statusColor = AppTheme.primaryColor;
      } else if (trialDay.isAtSameMomentAs(today)) {
        statusText = 'Today';
        statusColor = AppTheme.accentColor;
      } else {
        if (trialStatus.toLowerCase() == 'confirmed') {
          statusText = 'Confirmed';
          statusColor = AppTheme.successColor;
        } else if (trialStatus.toLowerCase() == 'cancelled') {
          statusText = 'Cancelled';
          statusColor = AppTheme.errorColor;
        } else {
          statusText = 'Pending';
          statusColor = Colors.orange;
        }
      }
    } else {
      statusText = trialStatus[0].toUpperCase() + trialStatus.substring(1);
      statusColor = Colors.orange;
    }
    
    return [
      const Divider(height: 24),
      Row(
        children: [
          const Text(
            'Status',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor),
            ),
            child: Text(
              statusText,
              style: TextStyle(
                color: statusColor,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    ];
  }

  Widget _buildDetailRow(String label, String value, {TextStyle? valueStyle}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: valueStyle ?? TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMembershipCard(Membership membership) {
    // Find the full booking data for this membership
    Map<String, dynamic> bookingData;
    try {
      bookingData = _gymBookings.firstWhere(
        (b) => (b['id'] ?? b['membershipId']) == membership.id,
      );
      print('Found booking data for membership ${membership.id}: has gym? ${bookingData['gym'] != null}');
    } catch (e) {
      print('No booking data found for membership ${membership.id}, using empty map');
      bookingData = <String, dynamic>{};
    }
    final gymLogo = bookingData['gym']?['logo'];
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _showMembershipDetailsDialog(membership, bookingData),
        borderRadius: BorderRadius.circular(12),
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
                        color: AppTheme.backgroundColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          gymLogo,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return const Icon(
                              Icons.fitness_center,
                              color: AppTheme.primaryColor,
                              size: 24,
                            );
                          },
                        ),
                      ),
                    ),
                Expanded(
                  child: Text(
                    membership.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.successColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Active',
                    style: const TextStyle(
                      color: AppTheme.successColor,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              membership.description,
              style: TextStyle(
                color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Duration',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      membership.durationLabel,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Price',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '₹${membership.price.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (membership.features.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: membership.features.take(3).map((feature) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      feature,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    ),
    );
  }

  Widget _buildPaymentMethodCard(dynamic method) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.credit_card, color: AppTheme.primaryColor),
        title: const Text('Card ending in ****'),
        subtitle: const Text('Expires 12/25'),
        trailing: IconButton(
          icon: const Icon(Icons.delete, color: AppTheme.errorColor),
          onPressed: () {},
        ),
      ),
    );
  }

  Widget _buildTransactionCard(dynamic transaction) {
    final amount = transaction['amount'] ?? 0;
    final status = transaction['status'] ?? 'pending';
    final date = transaction['date'] is String 
        ? DateTime.tryParse(transaction['date']) ?? DateTime.now()
        : DateTime.now();
    
    Color statusColor;
    String statusText;
    switch (status.toLowerCase()) {
      case 'paid':
        statusColor = AppTheme.successColor;
        statusText = 'Paid';
        break;
      case 'pending':
        statusColor = Colors.orange;
        statusText = 'Pending';
        break;
      case 'failed':
        statusColor = AppTheme.errorColor;
        statusText = 'Failed';
        break;
      default:
        statusColor = Colors.grey;
        statusText = status;
    }
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.receipt, color: AppTheme.primaryColor),
        ),
        title: Text(
          transaction['title'] ?? 'Transaction',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(transaction['subtitle'] ?? ''),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  '${date.day}/${date.month}/${date.year}',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
                const SizedBox(width: 8),
                Text(
                  '• ${transaction['paymentMode'] ?? 'Cash'}',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      fontSize: 10,
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: Text(
          '₹${amount is int ? amount : (amount as double).toStringAsFixed(0)}',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: AppTheme.primaryColor,
          ),
        ),
        isThreeLine: true,
      ),
    );
  }

  Widget _buildNotificationGroup(String title, List<Map<String, String>> options) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.titleLarge?.color,
              ),
            ),
            const SizedBox(height: 16),
            ...options.map((option) {
              final key = option['key']!;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            option['title']!,
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).textTheme.bodyLarge?.color,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            option['subtitle']!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _notificationSettings[key] ?? false,
                      onChanged: (value) {
                        setState(() {
                          _notificationSettings[key] = value;
                        });
                      },
                      activeThumbColor: AppTheme.primaryColor,
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildPrivacySection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Profile Visibility',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.titleLarge?.color,
              ),
            ),
            const SizedBox(height: 16),
            RadioListTile<String>(
              title: Text(
                'Public',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              subtitle: Text(
                'Anyone can view your profile',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                ),
              ),
              value: 'public',
              groupValue: _privacySettings['profileVisibility'],
              onChanged: (value) {
                setState(() {
                  _privacySettings['profileVisibility'] = value!;
                });
              },
            ),
            RadioListTile<String>(
              title: Text(
                'Friends Only',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              subtitle: Text(
                'Only your friends can view',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                ),
              ),
              value: 'friends',
              groupValue: _privacySettings['profileVisibility'],
              onChanged: (value) {
                setState(() {
                  _privacySettings['profileVisibility'] = value!;
                });
              },
            ),
            RadioListTile<String>(
              title: Text(
                'Private',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              subtitle: Text(
                'Only you can view your profile',
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                ),
              ),
              value: 'private',
              groupValue: _privacySettings['profileVisibility'],
              onChanged: (value) {
                setState(() {
                  _privacySettings['profileVisibility'] = value!;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecuritySection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Security',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.lock, color: AppTheme.primaryColor),
              title: const Text('Change Password'),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showChangePasswordDialog,
            ),
            ListTile(
              leading: const Icon(Icons.security, color: AppTheme.primaryColor),
              title: const Text('Two-Factor Authentication'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountInfo() {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Account Information',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.titleLarge?.color,
              ),
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Member Since', 'January 2025'),
            _buildInfoRow('Account Type', 'Free'),
            _buildInfoRow('User ID', user?.id ?? 'N/A'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: Theme.of(context).textTheme.bodyLarge?.color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataManagement() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Data Management',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.download, color: AppTheme.primaryColor),
              title: const Text('Download My Data'),
              subtitle: const Text('Get a copy of your account data'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDangerZone() {
    return Card(
      color: AppTheme.errorColor.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Danger Zone',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppTheme.errorColor,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.delete_forever, color: AppTheme.errorColor),
              title: const Text(
                'Delete Account',
                style: TextStyle(color: AppTheme.errorColor),
              ),
              subtitle: const Text('Permanently delete your account and data'),
              trailing: const Icon(Icons.chevron_right, color: AppTheme.errorColor),
              onTap: _showDeleteAccountDialog,
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.errorColor,
                side: const BorderSide(color: AppTheme.errorColor),
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSupportQuickActions() {
    final actions = [
      {'icon': Icons.bug_report, 'title': 'Report Bug', 'subtitle': 'Found a bug? Let us know', 'action': 'bug'},
      {'icon': Icons.feedback, 'title': 'Send Feedback', 'subtitle': 'Share your thoughts', 'action': 'feedback'},
      {'icon': Icons.help_outline, 'title': 'FAQs', 'subtitle': 'Find quick answers', 'action': 'faq'},
      {'icon': Icons.chat, 'title': 'Live Chat', 'subtitle': 'Chat with support', 'action': 'chat'},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.5,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return Card(
          child: InkWell(
            onTap: () => _handleSupportAction(action['action'] as String),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    action['icon'] as IconData,
                    color: AppTheme.primaryColor,
                    size: 32,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    action['title'] as String,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    action['subtitle'] as String,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _handleSupportAction(String action) {
    switch (action) {
      case 'bug':
        _showCreateTicketDialog(category: 'technical', subject: 'Bug Report');
        break;
      case 'feedback':
        _showCreateTicketDialog(category: 'general', subject: 'Feedback');
        break;
      case 'faq':
        // FAQs are already shown in the support tab
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Scroll down to view FAQs')),
        );
        break;
      case 'chat':
        // Navigate to live chat screen with AI bot
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const LiveChatScreen(),
          ),
        );
        break;
    }
  }

  void _showCreateTicketDialog({String category = 'general', String subject = ''}) {
    showDialog(
      context: context,
      builder: (context) => CreateTicketDialog(
        initialCategory: category,
        initialSubject: subject,
        onTicketCreated: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Support ticket created successfully!'),
              backgroundColor: AppTheme.successColor,
            ),
          );
        },
      ),
    );
  }

  Widget _buildContactOptions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Contact Us',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.email, color: AppTheme.primaryColor),
              title: const Text('Email Support'),
              subtitle: const Text('support@gym-wale.com'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                // Open email client
                final Uri emailUri = Uri(
                  scheme: 'mailto',
                  path: 'support@gym-wale.com',
                  query: 'subject=Support Request from Gym-Wale App',
                );
                // Use url_launcher package or show snackbar
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening email client...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.phone, color: AppTheme.primaryColor),
              title: const Text('Phone Support'),
              subtitle: const Text('+91 1234567890'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                // Open phone dialer
                final Uri phoneUri = Uri(
                  scheme: 'tel',
                  path: '+911234567890',
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening phone dialer...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.support_agent, color: AppTheme.primaryColor),
              title: const Text('View My Tickets'),
              subtitle: const Text('Track your support requests'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const SupportTicketScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFAQSection() {
    final faqs = [
      {
        'question': 'How do I cancel my membership?',
        'answer': 'You can cancel your membership from the Memberships tab. Navigate to the active membership and click the Cancel button.',
      },
      {
        'question': 'How do I apply a coupon?',
        'answer': 'Coupons are automatically applied at checkout when you book a membership or trial session.',
      },
      {
        'question': 'Can I change my registered email?',
        'answer': 'Currently, email changes are not supported. Please contact support for assistance.',
      },
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Frequently Asked Questions',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...faqs.map((faq) {
              return ExpansionTile(
                title: Text(
                  faq['question']!,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      faq['answer']!,
                      style: const TextStyle(color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Dialogs
  void _showAddPaymentMethodDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Payment Method'),
        content: const Text('Payment method integration coming soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: const Text('Password change feature coming soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text('Are you sure you want to permanently delete your account? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Account deletion feature coming soon')),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveNotificationSettings() async {
    try {
      final settings = {
        'email': {
          'bookingConfirm': _notificationSettings['emailBookingConfirm'],
          'membershipExpiry': _notificationSettings['emailMembershipExpiry'],
          'offers': _notificationSettings['emailOffers'],
        },
        'sms': {
          'bookingReminder': _notificationSettings['smsBookingReminder'],
          'paymentConfirm': _notificationSettings['smsPaymentConfirm'],
        },
        'push': {
          'enabled': _notificationSettings['pushNotifications'],
        },
      };
      
      final success = await ApiService.updateNotificationPreferences(settings);
      
      if (success && mounted) {
        _showSuccessSnackBar('Notification preferences saved');
      } else if (mounted) {
        _showErrorSnackBar('Failed to save notification preferences');
      }
    } catch (e) {
      print('Error saving notification settings: $e');
      if (mounted) {
        _showErrorSnackBar('Failed to save notification preferences');
      }
    }
  }

  Future<void> _savePrivacySettings() async {
    try {
      final settings = {
        'profileVisibility': _privacySettings['profileVisibility'],
        'dataSharing': _privacySettings['dataSharing'],
      };
      
      final success = await ApiService.updatePrivacySettings(settings);
      
      if (success && mounted) {
        _showSuccessSnackBar('Privacy settings saved');
      } else if (mounted) {
        _showErrorSnackBar('Failed to save privacy settings');
      }
    } catch (e) {
      print('Error saving privacy settings: $e');
      if (mounted) {
        _showErrorSnackBar('Failed to save privacy settings');
      }
    }
  }

  // General Settings UI Helpers
  Widget _buildSettingsSection(String title, IconData icon, List<Widget> children) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: AppTheme.primaryColor, size: 24),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleLarge?.color,
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

  Widget _buildThemeSetting() {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final currentTheme = themeProvider.themeType;
        final l10n = AppLocalizations.of(context)!;
        
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.brightness_6, color: AppTheme.primaryColor),
          title: Text(l10n.theme),
          subtitle: Text(themeProvider.getThemeDisplayName(currentTheme)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            showDialog(
              context: context,
              builder: (dialogContext) => AlertDialog(
                title: Text(l10n.chooseTheme),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RadioListTile<ThemeType>(
                      title: Text(l10n.light),
                      value: ThemeType.light,
                      groupValue: currentTheme,
                      onChanged: (value) async {
                        await themeProvider.setTheme(value!);
                        if (mounted) {
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.themeUpdatedSuccessfully);
                        }
                      },
                    ),
                    RadioListTile<ThemeType>(
                      title: Text(l10n.dark),
                      value: ThemeType.dark,
                      groupValue: currentTheme,
                      onChanged: (value) async {
                        await themeProvider.setTheme(value!);
                        if (mounted) {
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.themeUpdatedSuccessfully);
                        }
                      },
                    ),
                    RadioListTile<ThemeType>(
                      title: Text(l10n.systemDefault),
                      value: ThemeType.system,
                      groupValue: currentTheme,
                      onChanged: (value) async {
                        await themeProvider.setTheme(value!);
                        if (mounted) {
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.themeUpdatedSuccessfully);
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildLanguageSetting() {
    return Consumer<LocaleProvider>(
      builder: (context, localeProvider, _) {
        final currentLanguage = localeProvider.currentLanguage;
        final l10n = AppLocalizations.of(context)!;
        
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.language, color: AppTheme.primaryColor),
          title: Text(l10n.language),
          subtitle: Text(localeProvider.getLanguageDisplayName(currentLanguage)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            showDialog(
              context: context,
              builder: (dialogContext) => AlertDialog(
                title: Text(l10n.chooseLanguage),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RadioListTile<AppLanguage>(
                      title: Text(l10n.english),
                      value: AppLanguage.english,
                      groupValue: currentLanguage,
                      onChanged: (value) async {
                        await localeProvider.setLanguage(value!);
                        if (mounted) {
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.languageUpdatedSuccessfully);
                        }
                      },
                    ),
                    RadioListTile<AppLanguage>(
                      title: Text(l10n.hindi),
                      value: AppLanguage.hindi,
                      groupValue: currentLanguage,
                      onChanged: (value) async {
                        await localeProvider.setLanguage(value!);
                        if (mounted) {
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.languageUpdatedSuccessfully);
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildToggleSetting(
    String title,
    String subtitle,
    bool value,
    IconData icon,
    Function(bool) onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(
            icon,
            color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
            size: 24,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppTheme.primaryColor,
          ),
        ],
      ),
    );
  }

  Widget _buildSliderSetting(
    String title,
    String subtitle,
    double value,
    double min,
    double max,
    IconData icon,
    Function(double) onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                size: 24,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${value.toStringAsFixed(0)} pt',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
            ],
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: ((max - min) / 1).toInt(),
            activeColor: AppTheme.primaryColor,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildMeasurementSystemSetting() {
    return Consumer<SettingsProvider>(
      builder: (context, settingsProvider, child) {
        final currentSystem = settingsProvider.measurementSystem;
        final l10n = AppLocalizations.of(context)!;
        
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.straighten, color: AppTheme.primaryColor),
          title: Text(
            l10n.measurementSystem,
            style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color),
          ),
          subtitle: Text(
            currentSystem == 'Metric' ? l10n.kgKm : l10n.lbsMiles,
            style: TextStyle(color: Theme.of(context).textTheme.bodyMedium?.color),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            showDialog(
              context: context,
              builder: (dialogContext) => AlertDialog(
                title: Text(l10n.chooseMeasurementSystem),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RadioListTile<String>(
                      title: Text(l10n.metric),
                      subtitle: Text(l10n.kgKm),
                      value: 'Metric',
                      groupValue: currentSystem,
                      onChanged: (value) async {
                        if (value != null) {
                          await settingsProvider.setMeasurementSystem(value);
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.measurementSystemUpdated);
                        }
                      },
                    ),
                    RadioListTile<String>(
                      title: Text(l10n.imperial),
                      subtitle: Text(l10n.lbsMiles),
                      value: 'Imperial',
                      groupValue: currentSystem,
                      onChanged: (value) async {
                        if (value != null) {
                          await settingsProvider.setMeasurementSystem(value);
                          Navigator.pop(dialogContext);
                          _showSuccessSnackBar(l10n.measurementSystemUpdated);
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
