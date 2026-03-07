import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:share_plus/share_plus.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/geofencing_service.dart';
import '../config/app_theme.dart';
import 'edit_profile_screen.dart';
import 'subscriptions_screen.dart';
import 'attendance_history_screen.dart';
import 'notifications_screen.dart';
import 'favorites_screen.dart';
import 'diet_plans_screen.dart';
import 'workout_assistant_screen.dart';
import 'bookings_screen.dart';
import 'support_ticket_screen.dart';
import 'login_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          final user = authProvider.user;
          final name = (user?.name ?? '').trim();
          final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
          final hasImage =
              user?.profileImage != null && user!.profileImage!.isNotEmpty;

          return CustomScrollView(
            slivers: [
              // ── Profile Header ────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(32),
                      bottomRight: Radius.circular(32),
                    ),
                  ),
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                      child: Column(
                        children: [
                          // App bar row
                          Row(
                            children: [
                              if (Navigator.of(context).canPop())
                                IconButton(
                                  icon: const Icon(Icons.arrow_back_ios_new,
                                      color: Colors.white, size: 20),
                                  onPressed: () => Navigator.pop(context),
                                ),
                              const Spacer(),
                              const Text(
                                'Settings',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Spacer(),
                              // Invisible widget for centering
                              if (Navigator.of(context).canPop())
                                const SizedBox(width: 48),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Profile avatar & info
                          GestureDetector(
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const EditProfileScreen()),
                            ),
                            child: Row(
                              children: [
                                // Avatar
                                CircleAvatar(
                                  radius: 36,
                                  backgroundColor:
                                      Colors.white.withOpacity(0.25),
                                  backgroundImage: hasImage
                                      ? CachedNetworkImageProvider(
                                          user.profileImage!)
                                      : null,
                                  onBackgroundImageError: hasImage
                                      ? (_, __) {}
                                      : null,
                                  child: !hasImage
                                      ? Text(
                                          initial,
                                          style: const TextStyle(
                                            fontSize: 28,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 16),
                                // Name & email
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name.isNotEmpty ? name : 'User',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        user?.email ?? '',
                                        style: TextStyle(
                                          color: Colors.white.withOpacity(0.8),
                                          fontSize: 13,
                                        ),
                                      ),
                                      if (user?.phone != null &&
                                          user!.phone!.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          user.phone!,
                                          style: TextStyle(
                                            color:
                                                Colors.white.withOpacity(0.7),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                // Edit icon
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.edit_outlined,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // ── Settings Sections ─────────────────────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    // ── Account ─────────────────────────────────────────────
                    _SectionHeader(title: 'Account'),
                    const SizedBox(height: 8),
                    _SettingsCard(
                      children: [
                        _SettingsTile(
                          icon: Icons.person_outline,
                          iconColor: AppTheme.primaryColor,
                          title: 'Edit Profile',
                          subtitle: 'Update name, phone & photo',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const EditProfileScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.notifications_outlined,
                          iconColor: const Color(0xFFF59E0B),
                          title: 'Notifications',
                          subtitle: 'Manage alerts & reminders',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const NotificationsScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.favorite_outline,
                          iconColor: const Color(0xFFEF4444),
                          title: 'Favorites',
                          subtitle: 'Your saved gyms',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const FavoritesScreen()),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Memberships & Payments ──────────────────────────────
                    _SectionHeader(title: 'Memberships & Payments'),
                    const SizedBox(height: 8),
                    _SettingsCard(
                      children: [
                        _SettingsTile(
                          icon: Icons.card_membership_outlined,
                          iconColor: AppTheme.primaryColor,
                          title: 'My Subscriptions',
                          subtitle: 'Active plans & renewal',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const SubscriptionsScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.payment_outlined,
                          iconColor: const Color(0xFF8B5CF6),
                          title: 'Payment History',
                          subtitle: 'Invoices & transactions',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const SubscriptionsScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.event_available_outlined,
                          iconColor: const Color(0xFF3B82F6),
                          title: 'My Bookings',
                          subtitle: 'Trial sessions & appointments',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const BookingsScreen()),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Fitness ─────────────────────────────────────────────
                    _SectionHeader(title: 'Fitness & Wellness'),
                    const SizedBox(height: 8),
                    _SettingsCard(
                      children: [
                        _SettingsTile(
                          icon: Icons.history_outlined,
                          iconColor: AppTheme.primaryColor,
                          title: 'Attendance History',
                          subtitle: 'Check-in records & streaks',
                          onTap: () => _openAttendanceHistory(context),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.restaurant_menu_outlined,
                          iconColor: const Color(0xFF10B981),
                          title: 'Diet Plans',
                          subtitle: 'Nutrition & meal guidance',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const DietPlansScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.fitness_center_outlined,
                          iconColor: const Color(0xFFF59E0B),
                          title: 'Workout Plans',
                          subtitle: 'Routines & exercise guides',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) =>
                                    const WorkoutAssistantScreen()),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Offers & Rewards ────────────────────────────────────
                    _SectionHeader(title: 'Offers & Rewards'),
                    const SizedBox(height: 8),
                    _SettingsCard(
                      children: [
                        _SettingsTile(
                          icon: Icons.local_offer_outlined,
                          iconColor: const Color(0xFFEC4899),
                          title: 'Coupons & Offers',
                          subtitle: 'Discounts & promotional codes',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Coupons & Offers coming soon!')),
                            );
                          },
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.share_outlined,
                          iconColor: AppTheme.primaryColor,
                          title: 'Refer & Earn',
                          subtitle: 'Invite friends, get rewards',
                          onTap: () {
                            Share.share(
                              'Check out Gym-wale – the easiest way to find and join gyms near you! Download now.',
                            );
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Support ─────────────────────────────────────────────
                    _SectionHeader(title: 'Help & Support'),
                    const SizedBox(height: 8),
                    _SettingsCard(
                      children: [
                        _SettingsTile(
                          icon: Icons.support_agent_outlined,
                          iconColor: const Color(0xFF3B82F6),
                          title: 'Support Tickets',
                          subtitle: 'Raise or track an issue',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const SupportTicketScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.bug_report_outlined,
                          iconColor: const Color(0xFFF59E0B),
                          title: 'Report a Problem',
                          subtitle: 'Let us know if something is wrong',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const SupportTicketScreen()),
                          ),
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.privacy_tip_outlined,
                          iconColor: AppTheme.textLight,
                          title: 'Privacy Policy',
                          subtitle: 'How we handle your data',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Privacy Policy coming soon!')),
                            );
                          },
                        ),
                        const _TileDivider(),
                        _SettingsTile(
                          icon: Icons.description_outlined,
                          iconColor: AppTheme.textLight,
                          title: 'Terms of Service',
                          subtitle: 'Usage terms & conditions',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('Terms of Service coming soon!')),
                            );
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 32),

                    // ── Logout Button ───────────────────────────────────────
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton.icon(
                        onPressed: () => _handleLogout(context),
                        icon: const Icon(Icons.logout, size: 20),
                        label: const Text(
                          'Logout',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.errorColor,
                          side: const BorderSide(color: AppTheme.errorColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── App version ─────────────────────────────────────────
                    Center(
                      child: Text(
                        'Gym-wale v1.0.0',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textLight,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  /// Fetches the user's active memberships and navigates to the
  /// AttendanceHistoryScreen for the selected (or only) gym.
  Future<void> _openAttendanceHistory(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final bar = messenger.showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            ),
            SizedBox(width: 12),
            Text('Loading your memberships…'),
          ],
        ),
        duration: Duration(seconds: 30),
      ),
    );

    try {
      final memberships = await ApiService.getActiveMemberships();
      bar.close();

      if (!context.mounted) return;

      if (memberships.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('No active memberships found.')),
        );
        return;
      }

      if (memberships.length == 1) {
        final m = memberships.first;
        final gymId =
            (m['gymId'] ?? m['gym']?['_id'] ?? m['gym']?['id'] ?? '')
                .toString();
        final gymName =
            (m['gymName'] ?? m['gym']?['gymName'] ?? m['gym']?['name'] ?? 'Your Gym')
                .toString();
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                AttendanceHistoryScreen(gymId: gymId, gymName: gymName),
          ),
        );
        return;
      }

      // Multiple memberships – show picker
      final picked = await showModalBottomSheet<Map<String, dynamic>>(
        context: context,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select a Gym',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...memberships.map((m) {
                final name =
                    (m['gymName'] ?? m['gym']?['gymName'] ?? m['gym']?['name'] ?? 'Gym')
                        .toString();
                return ListTile(
                  leading: const Icon(Icons.fitness_center,
                      color: AppTheme.primaryColor),
                  title: Text(name),
                  onTap: () => Navigator.pop(ctx, m),
                );
              }),
            ],
          ),
        ),
      );

      if (picked == null || !context.mounted) return;
      final gymId =
          (picked['gymId'] ?? picked['gym']?['_id'] ?? picked['gym']?['id'] ?? '')
              .toString();
      final gymName =
          (picked['gymName'] ?? picked['gym']?['gymName'] ?? picked['gym']?['name'] ?? 'Your Gym')
              .toString();
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              AttendanceHistoryScreen(gymId: gymId, gymName: gymName),
        ),
      );
    } catch (e) {
      bar.close();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading memberships: $e')),
        );
      }
    }
  }

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final geofencingService =
          Provider.of<GeofencingService>(context, listen: false);
      try {
        await geofencingService.removeAllGeofences();
      } catch (_) {}
      await authProvider.logout();

      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }
}

// ─── Private helper widgets ──────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: isDark ? const Color(0xFFB0B0B0) : AppTheme.textLight,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isDark
            ? Border.all(color: const Color(0xFF2C2C2C), width: 1)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: isDark ? 8 : 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }
}

class _TileDivider extends StatelessWidget {
  const _TileDivider();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Divider(
      height: 1,
      indent: 64,
      endIndent: 16,
      color: isDark ? const Color(0xFF2C2C2C) : AppTheme.borderColor.withOpacity(0.6),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      splashColor: iconColor.withOpacity(0.08),
      highlightColor: isDark
          ? Colors.white.withOpacity(0.04)
          : AppTheme.primaryColor.withOpacity(0.04),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDark
                    ? iconColor.withOpacity(0.15)
                    : iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark
                          ? const Color(0xFFB0B0B0)
                          : AppTheme.textLight,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: isDark
                  ? const Color(0xFF606060)
                  : AppTheme.textLight.withOpacity(0.6),
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}
