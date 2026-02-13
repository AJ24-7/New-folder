import 'package:flutter/material.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../notifications/notification_list_screen.dart';
import '../../notifications/send_notification_screen.dart';

class NotificationSettingsCard extends StatefulWidget {
  const NotificationSettingsCard({super.key});

  @override
  State<NotificationSettingsCard> createState() => _NotificationSettingsCardState();
}

class _NotificationSettingsCardState extends State<NotificationSettingsCard> {
  bool _pushNotifications = true;
  bool _emailNotifications = true;
  bool _membershipAlerts = true;
  bool _paymentAlerts = true;
  bool _attendanceAlerts = false;
  bool _systemAlerts = true;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.notifications, color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  l10n.notifications,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Manage your notification preferences',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
            const SizedBox(height: 24),

            // General Notifications
            Text(
              'General',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            _buildNotificationToggle(
              title: 'Push Notifications',
              subtitle: 'Receive instant updates and alerts',
              icon: Icons.notifications_active,
              value: _pushNotifications,
              onChanged: (value) => setState(() => _pushNotifications = value),
            ),
            _buildNotificationToggle(
              title: 'Email Notifications',
              subtitle: 'Get updates via email',
              icon: Icons.email,
              value: _emailNotifications,
              onChanged: (value) => setState(() => _emailNotifications = value),
            ),

            const Divider(height: 32),

            // Category-specific Notifications
            Text(
              'Categories',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            _buildNotificationToggle(
              title: 'Membership Alerts',
              subtitle: 'New memberships and renewals',
              icon: Icons.card_membership,
              value: _membershipAlerts,
              onChanged: (value) => setState(() => _membershipAlerts = value),
            ),
            _buildNotificationToggle(
              title: 'Payment Alerts',
              subtitle: 'Payment received and pending',
              icon: Icons.payment,
              value: _paymentAlerts,
              onChanged: (value) => setState(() => _paymentAlerts = value),
            ),
            _buildNotificationToggle(
              title: 'Attendance Alerts',
              subtitle: 'Daily attendance summaries',
              icon: Icons.how_to_reg,
              value: _attendanceAlerts,
              onChanged: (value) => setState(() => _attendanceAlerts = value),
            ),
            _buildNotificationToggle(
              title: 'System Alerts',
              subtitle: 'Important system notifications',
              icon: Icons.info,
              value: _systemAlerts,
              onChanged: (value) => setState(() => _systemAlerts = value),
            ),

            const SizedBox(height: 24),

            // Quick Links to Notification System
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: theme.colorScheme.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Notification System',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const NotificationListScreen(),
                              ),
                            );
                          },
                          icon: const Icon(Icons.notifications, size: 18),
                          label: const Text('View All'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: theme.colorScheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const SendNotificationScreen(),
                              ),
                            );
                          },
                          icon: const Icon(Icons.send, size: 18),
                          label: const Text('Send New'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saveNotificationSettings,
                child: const Text('Save Notification Preferences'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationToggle({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: theme.dividerColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: value
                    ? theme.colorScheme.primary.withValues(alpha: 0.1)
                    : theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: value ? theme.colorScheme.primary : theme.iconTheme.color,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: value,
              onChanged: onChanged,
            ),
          ],
        ),
      ),
    );
  }

  void _saveNotificationSettings() {
    // TODO: Save notification preferences to backend
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Notification preferences saved'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
