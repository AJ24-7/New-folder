import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import 'package:intl/intl.dart';
import '../../providers/theme_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/session_timer_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/sidebar_menu.dart';
import '../../widgets/session_warning_dialog.dart';
import '../members/members_screen.dart';
import '../equipment/equipment_screen.dart';
import '../support/support_screen.dart';
import 'gym_profile_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  int _selectedIndex = 8; // Settings is index 8
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    // Set up session expired callback
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      authProvider.setSessionExpiredCallback(() {
        _showSessionExpiredDialog();
      });
      authProvider.setSessionWarningCallback(() {
        SessionWarningDialog.show(context);
      });
    });
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return; // Already on settings

    setState(() => _selectedIndex = index);

    // Navigate to different screens based on index
    switch (index) {
      case 0:
        Navigator.pop(context); // Go back to dashboard
        break;
      case 1:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const MembersScreen()),
        );
        break;
      case 2:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trainers screen coming soon')),
        );
        break;
      case 3:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance screen coming soon')),
        );
        break;
      case 4:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payments screen coming soon')),
        );
        break;
      case 5:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const EquipmentScreen(),
          ),
        );
        break;
      case 6:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offers screen coming soon')),
        );
        break;
      case 7:
        // Navigate to Support & Reviews screen
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        final gymId = authProvider.currentAdmin?.id ?? '';
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => SupportScreen(gymId: gymId)),
        );
        break;
      case 8:
        // Already on settings
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final themeProvider = Provider.of<ThemeProvider>(context);
    final localeProvider = Provider.of<LocaleProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;

    return Scaffold(
      key: _scaffoldKey,
      body: Row(
        children: [
          // Sidebar
          if (isDesktop)
            SidebarMenu(
              selectedIndex: _selectedIndex,
              onItemSelected: _onMenuItemSelected,
            ),

          // Main Content
          Expanded(
            child: Column(
              children: [
                // Top bar for mobile/tablet with menu button
                if (!isDesktop)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
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
                        IconButton(
                          icon: const Icon(Icons.menu),
                          onPressed: () {
                            _scaffoldKey.currentState?.openDrawer();
                          },
                        ),
                        const SizedBox(width: 8),
                        Text(
                          l10n.settings,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                // Settings content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Text(
                          l10n.settings,
                          style: Theme.of(context).textTheme.headlineLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Manage your preferences and settings',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: Theme.of(
                                  context,
                                ).textTheme.bodySmall?.color,
                              ),
                        ),
                        const SizedBox(height: 32),

                        // Session Management Section
                        _buildSessionTimerCard(context, authProvider),

                        const SizedBox(height: 24),

                        // Appearance Section
                        _buildSectionCard(
                          context,
                          title: 'Appearance',
                          icon: Icons.palette_outlined,
                          children: [
                            _buildSettingTile(
                              context,
                              title: l10n.theme,
                              subtitle: themeProvider.isDarkMode
                                  ? l10n.darkMode
                                  : l10n.lightMode,
                              leading: Icon(
                                themeProvider.isDarkMode
                                    ? Icons.dark_mode
                                    : Icons.light_mode,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              trailing: Switch(
                                value: themeProvider.isDarkMode,
                                onChanged: (value) {
                                  themeProvider.toggleTheme();
                                },
                              ),
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: l10n.language,
                              subtitle: LocaleProvider.getLanguageName(
                                localeProvider.locale.languageCode,
                              ),
                              leading: Icon(
                                Icons.language,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () =>
                                  _showLanguageDialog(context, localeProvider),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Gym Profile Section
                        _buildSectionCard(
                          context,
                          title: l10n.gymProfile,
                          icon: Icons.business,
                          children: [
                            _buildSettingTile(
                              context,
                              title: l10n.gymConfiguration,
                              subtitle: 'Manage gym details and settings',
                              leading: Icon(
                                Icons.settings_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const GymProfileScreen(),
                                  ),
                                );
                              },
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: 'Operating Hours',
                              subtitle: 'Set gym opening and closing times',
                              leading: Icon(
                                Icons.access_time,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Navigate to operating hours
                              },
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Security Section
                        _buildSectionCard(
                          context,
                          title: l10n.securitySettings,
                          icon: Icons.security,
                          children: [
                            _buildSettingTile(
                              context,
                              title: l10n.changePassword,
                              subtitle: 'Update your account password',
                              leading: Icon(
                                Icons.lock_outline,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () => _showChangePasswordDialog(context),
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: l10n.adminManagement,
                              subtitle: 'Manage admin users and permissions',
                              leading: Icon(
                                Icons.admin_panel_settings_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Navigate to admin management
                              },
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Data Management Section
                        _buildSectionCard(
                          context,
                          title: 'Data Management',
                          icon: Icons.storage,
                          children: [
                            _buildSettingTile(
                              context,
                              title: l10n.backupData,
                              subtitle: 'Create a backup of your gym data',
                              leading: Icon(
                                Icons.backup_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Backup data
                                _showSnackBar(context, 'Backup initiated...');
                              },
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: l10n.restoreData,
                              subtitle: 'Restore data from a previous backup',
                              leading: Icon(
                                Icons.restore_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Restore data
                                _showRestoreConfirmation(context);
                              },
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: l10n.export,
                              subtitle: 'Export data to CSV or PDF',
                              leading: Icon(
                                Icons.download_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Export data
                              },
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Notifications Section
                        _buildSectionCard(
                          context,
                          title: l10n.notifications,
                          icon: Icons.notifications_outlined,
                          children: [
                            _buildSettingTile(
                              context,
                              title: 'Push Notifications',
                              subtitle: 'Receive instant updates and alerts',
                              leading: Icon(
                                Icons.notifications_active_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              trailing: Switch(
                                value: true,
                                onChanged: (value) {
                                  // Toggle notifications
                                },
                              ),
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: 'Email Notifications',
                              subtitle: 'Get updates via email',
                              leading: Icon(
                                Icons.email_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              trailing: Switch(
                                value: true,
                                onChanged: (value) {
                                  // Toggle email notifications
                                },
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // About Section
                        _buildSectionCard(
                          context,
                          title: 'About',
                          icon: Icons.info_outline,
                          children: [
                            _buildSettingTile(
                              context,
                              title: 'Version',
                              subtitle: '1.0.0',
                              leading: Icon(
                                Icons.info_outline,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: 'Terms of Service',
                              subtitle: 'Read our terms and conditions',
                              leading: Icon(
                                Icons.description_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Show terms
                              },
                            ),
                            const Divider(height: 1),
                            _buildSettingTile(
                              context,
                              title: 'Privacy Policy',
                              subtitle: 'Learn how we protect your data',
                              leading: Icon(
                                Icons.privacy_tip_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              onTap: () {
                                // Show privacy policy
                              },
                            ),
                          ],
                        ),

                        const SizedBox(height: 32),

                        // Logout Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () =>
                                _handleLogout(context, authProvider),
                            icon: const Icon(Icons.logout),
                            label: Text(l10n.logout),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(
                                context,
                              ).colorScheme.error,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
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
                  _onMenuItemSelected(index);
                  Navigator.pop(context);
                },
              ),
            )
          : null,
    );
  }

  Widget _buildSectionCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSettingTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required Widget leading,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: leading,
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 13,
          color: Theme.of(context).textTheme.bodySmall?.color,
        ),
      ),
      trailing:
          trailing ?? (onTap != null ? const Icon(Icons.chevron_right) : null),
      onTap: onTap,
    );
  }

  void _showLanguageDialog(
    BuildContext context,
    LocaleProvider localeProvider,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)!.language),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: LocaleProvider.supportedLocales.map((locale) {
            final isSelected = localeProvider.locale == locale;
            return RadioListTile<Locale>(
              value: locale,
              groupValue: localeProvider.locale,
              title: Text(LocaleProvider.getLanguageName(locale.languageCode)),
              selected: isSelected,
              activeColor: Theme.of(context).colorScheme.primary,
              onChanged: (value) {
                if (value != null) {
                  localeProvider.setLocale(value);
                  Navigator.pop(context);
                }
              },
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppLocalizations.of(context)!.cancel),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final l10n = AppLocalizations.of(context)!;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.changePassword),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentPasswordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.currentPassword,
                prefixIcon: const Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: newPasswordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.newPassword,
                prefixIcon: const Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: confirmPasswordController,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.confirmPassword,
                prefixIcon: const Icon(Icons.lock_outline),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              // Handle password change
              Navigator.pop(context);
              _showSnackBar(context, 'Password changed successfully');
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }

  void _showRestoreConfirmation(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.confirmAction),
        content: const Text(
          'Are you sure you want to restore data? This will overwrite current data.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.no),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showSnackBar(context, 'Restore initiated...');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Colors.white,
            ),
            child: Text(l10n.yes),
          ),
        ],
      ),
    );
  }

  void _handleLogout(BuildContext context, AuthProvider authProvider) {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.confirmAction),
        content: Text(l10n.areYouSure),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.no),
          ),
          ElevatedButton(
            onPressed: () {
              authProvider.logout();
              Navigator.of(context).pushReplacementNamed('/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Colors.white,
            ),
            child: Text(l10n.yes),
          ),
        ],
      ),
    );
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildSessionTimerCard(
    BuildContext context,
    AuthProvider authProvider,
  ) {
    final l10n = AppLocalizations.of(context)!;
    
    return ChangeNotifierProvider<SessionTimerService>.value(
      value: authProvider.sessionTimer,
      child: Consumer<SessionTimerService>(
        builder: (context, sessionTimer, child) {
          final isActive = sessionTimer.isActive;
          final remainingSeconds = sessionTimer.remainingSeconds;
          final percentage = sessionTimer.remainingPercentage;
          final loginTime = sessionTimer.loginTime;
          
          // Determine color based on remaining time
          Color getTimerColor() {
            if (remainingSeconds <= 300) {
              // Less than 5 minutes - red
              return Colors.red;
            } else if (remainingSeconds <= 600) {
              // Less than 10 minutes - orange
              return Colors.orange;
            } else {
              // More than 10 minutes - green
              return Colors.green;
            }
          }

          return Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        Icons.timer_outlined,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        l10n.sessionManagement,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                ),
                if (isActive) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status indicator
                        Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: getTimerColor(),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              l10n.sessionActive,
                              style: TextStyle(
                                color: getTimerColor(),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        
                        // Time remaining
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n.timeRemaining,
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 15,
                              ),
                            ),
                            Text(
                              sessionTimer.formattedTime,
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: getTimerColor(),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        
                        // Progress bar
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: percentage,
                            minHeight: 8,
                            backgroundColor: Colors.grey.withValues(alpha: 0.2),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              getTimerColor(),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // Login time
                        if (loginTime != null)
                          Row(
                            children: [
                              Icon(
                                Icons.login,
                                size: 16,
                                color: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.color,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${l10n.loggedInSince}: ${DateFormat('hh:mm a').format(loginTime)}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.color,
                                ),
                              ),
                            ],
                          ),
                        
                        // Warning message when time is low
                        if (remainingSeconds <= 300) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: Colors.red.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.warning_amber_rounded,
                                  color: Colors.red,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    l10n.sessionWillExpireSoon,
                                    style: const TextStyle(
                                      color: Colors.red,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ] else ...[
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Session timer is inactive',
                      style: TextStyle(
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                  ),
                ],
                // Session Timeout Settings
                Divider(height: 1),
                _buildSettingTile(
                  context,
                  title: l10n.autoSessionTimeout,
                  subtitle: l10n.autoSessionTimeoutDescription,
                  leading: Icon(
                    Icons.timer_outlined,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        l10n.currentTimeoutSetting(
                          _getTimeoutDurationLabel(
                            sessionTimer.timeoutDurationMinutes,
                            l10n,
                          ),
                        ),
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(Icons.chevron_right),
                    ],
                  ),
                  onTap: () => _showSessionTimeoutDialog(context, authProvider),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _getTimeoutDurationLabel(int minutes, AppLocalizations l10n) {
    if (minutes >= 43200) {
      return l10n.oneMonth;
    } else if (minutes >= 10080) {
      return l10n.sevenDays;
    } else if (minutes >= 4320) {
      return l10n.threeDays;
    } else {
      return '$minutes min${minutes > 1 ? 's' : ''}';
    }
  }

  void _showSessionTimeoutDialog(
    BuildContext context,
    AuthProvider authProvider,
  ) {
    final l10n = AppLocalizations.of(context)!;
    final currentTimeout = authProvider.sessionTimer.timeoutDurationMinutes;
    
    // Timeout options in minutes
    final Map<String, int> timeoutOptions = {
      l10n.threeDays: 4320, // 3 days = 4320 minutes
      l10n.sevenDays: 10080, // 7 days = 10080 minutes
      l10n.oneMonth: 43200, // 30 days = 43200 minutes
    };

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.selectSessionTimeout),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: timeoutOptions.entries.map((entry) {
            final isSelected = currentTimeout == entry.value;
            return RadioListTile<int>(
              value: entry.value,
              groupValue: currentTimeout,
              title: Text(entry.key),
              subtitle: Text('${entry.value ~/ 1440} days'),
              selected: isSelected,
              activeColor: Theme.of(dialogContext).colorScheme.primary,
              onChanged: (value) async {
                if (value != null) {
                  Navigator.of(dialogContext).pop();
                  await _updateSessionTimeout(
                    context,
                    authProvider,
                    value,
                    l10n,
                  );
                }
              },
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(l10n.cancel),
          ),
        ],
      ),
    );
  }

  Future<void> _updateSessionTimeout(
    BuildContext context,
    AuthProvider authProvider,
    int timeoutMinutes,
    AppLocalizations l10n,
  ) async {
    try {
      // Show loading indicator
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
                const SizedBox(width: 16),
                Text('Updating session timeout...'),
              ],
            ),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }

      final authService = AuthService();
      final result = await authService.updateSessionTimeout(
        timeoutMinutes: timeoutMinutes,
        enabled: true,
      );

      if (result['success'] == true) {
        // Restart the session timer with new duration
        authProvider.sessionTimer.stopTimer();
        authProvider.setSessionExpiredCallback(() {
          _showSessionExpiredDialog();
        });
        authProvider.setSessionWarningCallback(() {
          SessionWarningDialog.show(context);
        });
        
        // Manually restart timer with new duration
        authProvider.sessionTimer.startTimer(
          onSessionExpired: () {
            authProvider.logout();
            _showSessionExpiredDialog();
          },
          onWarning: () {
            SessionWarningDialog.show(context);
          },
          durationInMinutes: timeoutMinutes,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.sessionTimeoutUpdated),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.failedToUpdateSessionTimeout),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${l10n.error}: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showSessionExpiredDialog() {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.timer_off, color: Theme.of(context).colorScheme.error),
            const SizedBox(width: 8),
            Text(l10n.sessionExpiredTitle),
          ],
        ),
        content: Text(l10n.sessionExpiredMessage),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pushReplacementNamed('/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Login Again'),
          ),
        ],
      ),
    );
  }
}
