import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_theme.dart';
import '../models/notification.dart';
import '../providers/notification_provider.dart';
import '../l10n/app_localizations.dart';
import 'support_ticket_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedFilter = 'all'; // 'all', 'unread', 'offer', 'membership', 'trial'

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    
    // Initialize and load notifications
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final provider = context.read<NotificationProvider>();
      await provider.initialize(); // Load local read cache
      await provider.loadNotifications(); // Load notifications with local state applied
      
      // Start polling for new notifications
      provider.startPolling();
    });
  }

  @override
  void dispose() {
    // Stop polling when screen is disposed
    context.read<NotificationProvider>().stopPolling();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notifications),
        elevation: 0,
        actions: [
          Consumer<NotificationProvider>(
            builder: (context, provider, _) {
              return provider.unreadCount > 0
                  ? TextButton.icon(
                      onPressed: () => provider.markAllAsRead(),
                      icon: const Icon(Icons.done_all, size: 18),
                      label: Text(l10n.markAllRead),
                    )
                  : const SizedBox.shrink();
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final filteredNotifications = _getFilteredNotifications(provider.notifications);

          if (filteredNotifications.isEmpty) {
            return _buildEmptyState();
          }

          return RefreshIndicator(
            onRefresh: () async {
              await provider.pollNow(); // Trigger immediate poll
              await provider.loadNotifications(); // Also do full refresh
            },
            child: Column(
              children: [
                if (provider.unreadCount > 0) _buildUnreadBanner(provider.unreadCount),
                _buildFilterChips(),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: filteredNotifications.length,
                    itemBuilder: (context, index) {
                      return _buildNotificationCard(filteredNotifications[index], provider);
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  List<AppNotification> _getFilteredNotifications(List<AppNotification> notifications) {
    switch (_selectedFilter) {
      case 'unread':
        return notifications.where((n) => !n.isRead).toList();
      case 'offer':
        return notifications.where((n) => n.type == 'offer').toList();
      case 'membership':
        return notifications.where((n) => n.type == 'membership_expiry').toList();
      case 'trial':
        return notifications.where((n) => n.type == 'trial_booking').toList();
      default:
        return notifications;
    }
  }

  Widget _buildUnreadBanner(int count) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.accentColor.withOpacity(isDark ? 0.2 : 0.1),
            AppTheme.primaryColor.withOpacity(isDark ? 0.2 : 0.1),
          ],
        ),
        border: Border(
          bottom: BorderSide(color: AppTheme.accentColor.withOpacity(0.3)),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.accentColor,
              shape: BoxShape.circle,
            ),
            child: Text(
              count.toString(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '$count unread notification${count > 1 ? 's' : ''}',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).textTheme.bodyLarge?.color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    final l10n = AppLocalizations.of(context)!;
    
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          _buildFilterChip(l10n.all, 'all', Icons.notifications),
          _buildFilterChip(l10n.unread, 'unread', Icons.mark_email_unread),
          _buildFilterChip(l10n.offer, 'offer', Icons.local_offer),
          _buildFilterChip(l10n.membership, 'membership', Icons.card_membership),
          _buildFilterChip(l10n.trials, 'trial', Icons.event_available),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, IconData icon) {
    final isSelected = _selectedFilter == value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? Colors.white : AppTheme.primaryColor,
            ),
            const SizedBox(width: 6),
            Text(label),
          ],
        ),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilter = value;
          });
        },
        selectedColor: AppTheme.primaryColor,
        backgroundColor: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade100,
        checkmarkColor: Colors.white,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Theme.of(context).textTheme.bodyLarge?.color,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }

  Widget _buildNotificationCard(AppNotification notification, NotificationProvider provider) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: AppTheme.errorColor,
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => provider.deleteNotification(notification.id),
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 0),
        elevation: notification.isRead ? 0 : 2,
        color: isDark 
            ? (notification.isRead ? const Color(0xFF1E1E1E) : const Color(0xFF2C2C2C))
            : (notification.isRead ? Colors.white : AppTheme.accentColor.withOpacity(0.05)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: notification.isRead 
                ? (isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor)
                : AppTheme.accentColor.withOpacity(0.3),
            width: notification.isRead ? 1 : 2,
          ),
        ),
        child: InkWell(
          onTap: () {
            if (!notification.isRead) {
              provider.markAsRead(notification.id);
            }
            _handleNotificationTap(notification);
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildNotificationIcon(notification.type),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: notification.isRead 
                                    ? FontWeight.w600 
                                    : FontWeight.bold,
                                color: Theme.of(context).textTheme.bodyLarge?.color,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (!notification.isRead)
                            Container(
                              width: 8,
                              height: 8,
                              margin: const EdgeInsets.only(left: 8),
                              decoration: const BoxDecoration(
                                color: AppTheme.accentColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        notification.message,
                        style: TextStyle(
                          fontSize: 14,
                          color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.8),
                          height: 1.4,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getTypeColor(notification.type).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              notification.typeLabel,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _getTypeColor(notification.type),
                              ),
                            ),
                          ),
                          const Spacer(),
                          Icon(
                            Icons.access_time,
                            size: 12,
                            color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            notification.timeAgo,
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationIcon(String type) {
    IconData iconData;
    Color backgroundColor;

    switch (type) {
      case 'offer':
        iconData = Icons.local_offer;
        backgroundColor = Colors.orange;
        break;
      case 'membership_expiry':
        iconData = Icons.warning_amber;
        backgroundColor = Colors.red;
        break;
      case 'trial_booking':
        iconData = Icons.event_available;
        backgroundColor = Colors.green;
        break;
      case 'reminder':
        iconData = Icons.alarm;
        backgroundColor = AppTheme.accentColor;
        break;
      case 'payment':
        iconData = Icons.payment;
        backgroundColor = AppTheme.secondaryColor;
        break;
      case 'achievement':
        iconData = Icons.emoji_events;
        backgroundColor = AppTheme.warningColor;
        break;
      case 'ticket_update':
      case 'ticket_reply':
        iconData = Icons.support_agent;
        backgroundColor = AppTheme.accentColor;
        break;
      case 'ticket_resolved':
        iconData = Icons.check_circle;
        backgroundColor = AppTheme.successColor;
        break;
      default:
        iconData = Icons.notifications;
        backgroundColor = AppTheme.primaryColor;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        iconData,
        size: 24,
        color: backgroundColor,
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'offer':
        return AppTheme.warningColor;
      case 'membership_expiry':
        return AppTheme.errorColor;
      case 'trial_booking':
        return AppTheme.successColor;
      case 'reminder':
        return AppTheme.accentColor;
      case 'payment':
        return AppTheme.secondaryColor;
      case 'achievement':
        return AppTheme.warningColor;
      case 'ticket_update':
      case 'ticket_reply':
        return AppTheme.accentColor;
      case 'ticket_resolved':
        return AppTheme.successColor;
      default:
        return AppTheme.secondaryColor;
    }
  }

  Widget _buildEmptyState() {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _selectedFilter == 'unread' 
                ? Icons.mark_email_read 
                : Icons.notifications_off,
            size: 80,
            color: isDark ? Colors.grey[700] : Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            _selectedFilter == 'unread' 
                ? l10n.youAreAllCaughtUp
                : l10n.noNotifications,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _selectedFilter == 'unread'
                ? 'You\'ve read all your notifications'
                : 'We\'ll notify you when something new arrives',
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    final l10n = AppLocalizations.of(context)!;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${l10n.filters} ${l10n.notifications}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildFilterOption('${l10n.all} ${l10n.notifications}', 'all', Icons.notifications),
            _buildFilterOption('${l10n.unread} Only', 'unread', Icons.mark_email_unread),
            _buildFilterOption(l10n.offer, 'offer', Icons.local_offer),
            _buildFilterOption('${l10n.membership} Alerts', 'membership', Icons.card_membership),
            _buildFilterOption('${l10n.trial} Bookings', 'trial', Icons.event_available),
          ],
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

  Widget _buildFilterOption(String label, String value, IconData icon) {
    final isSelected = _selectedFilter == value;
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? AppTheme.primaryColor : Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
      ),
      title: Text(
        label,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? AppTheme.primaryColor : Theme.of(context).textTheme.bodyLarge?.color,
        ),
      ),
      trailing: isSelected 
          ? const Icon(Icons.check, color: AppTheme.primaryColor)
          : null,
      onTap: () {
        setState(() {
          _selectedFilter = value;
        });
        Navigator.pop(context);
      },
    );
  }

  void _handleNotificationTap(AppNotification notification) {
    // Handle ticket-related notifications
    if (notification.type.startsWith('ticket_')) {
      final ticketId = notification.data?['ticketId'];
      if (ticketId != null) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const SupportTicketScreen(),
          ),
        );
      }
      return;
    }
    
    // Handle different notification actions
    if (notification.actionType == 'navigate' && notification.actionData != null) {
      // Navigate to specific screen
      // Navigator.pushNamed(context, notification.actionData!);
    }
    // Add more action handlers as needed
  }
}
