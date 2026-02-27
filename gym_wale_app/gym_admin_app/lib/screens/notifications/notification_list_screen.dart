// lib/screens/notifications/notification_list_screen.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/notification_provider.dart';
import '../../models/notification.dart';
import 'send_notification_screen.dart';

class NotificationListScreen extends StatefulWidget {
  const NotificationListScreen({super.key});

  @override
  State<NotificationListScreen> createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().loadNotifications(refresh: true);
    });

    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent * 0.8) {
      context.read<NotificationProvider>().loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final notificationProvider = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (notificationProvider.unreadCount > 0)
            TextButton.icon(
              icon: const Icon(Icons.done_all, color: Colors.white),
              label: const Text('Mark all read', style: TextStyle(color: Colors.white)),
              onPressed: () {
                notificationProvider.markAllAsRead();
              },
            ),
          PopupMenuButton(
            icon: const Icon(Icons.filter_list),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'all',
                child: Text('All Notifications'),
              ),
              const PopupMenuItem(
                value: 'unread',
                child: Text('Unread Only'),
              ),
              const PopupMenuItem(
                value: 'read',
                child: Text('Read Only'),
              ),
            ],
            onSelected: (value) {
              notificationProvider.setFilters(read: value);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => notificationProvider.refresh(),
        child: notificationProvider.isLoading && notificationProvider.notifications.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : notificationProvider.notifications.isEmpty
                ? _buildEmptyState()
                : ListView.separated(
                    controller: _scrollController,
                    itemCount: notificationProvider.notifications.length + 1,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      if (index == notificationProvider.notifications.length) {
                        return notificationProvider.hasMore
                            ? const Padding(
                                padding: EdgeInsets.all(16),
                                child: Center(child: CircularProgressIndicator()),
                              )
                            : const SizedBox.shrink();
                      }

                      final notification = notificationProvider.notifications[index];
                      return _buildNotificationTile(context, notification);
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SendNotificationScreen()),
          );
        },
        icon: const Icon(Icons.send),
        label: const Text('Send Notification'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'No notifications yet',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'You\'re all caught up!',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationTile(BuildContext context, GymNotification notification) {
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      background: Container(
        color: Colors.red,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        context.read<NotificationProvider>().deleteNotification(notification.id);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification deleted')),
        );
      },
      child: ListTile(
        leading: _buildNotificationIcon(notification),
        title: Text(
          notification.title,
          style: TextStyle(
            fontWeight: notification.read ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              notification.message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              _formatTimestamp(notification.timestamp),
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: !notification.read
            ? Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  color: Colors.blue,
                  shape: BoxShape.circle,
                ),
              )
            : null,
        onTap: () {
          if (!notification.read) {
            context.read<NotificationProvider>().markAsRead(notification.id);
          }
          
          // Handle different notification actions
          if (notification.actionType == 'open-chat' && notification.actionData != null) {
            _handleChatNotification(context, notification);
          } else {
            _showNotificationDetails(context, notification);
          }
        },
      ),
    );
  }

  Widget _buildNotificationIcon(GymNotification notification) {
    IconData iconData;
    Color iconColor;

    switch (notification.type) {
      case 'membership-freeze':
        iconData = Icons.pause_circle;
        iconColor = Colors.blue;
        break;
      case 'chat-message':
      case 'chat':
        iconData = Icons.chat_bubble;
        iconColor = Colors.purple;
        break;
      case 'membership-renewal':
      case 'membership':
        iconData = Icons.card_membership;
        iconColor = Colors.orange;
        break;
      case 'payment':
      case 'payment-received':
        iconData = Icons.payment;
        iconColor = Colors.green;
        break;
      case 'holiday-notice':
      case 'holiday':
        iconData = Icons.beach_access;
        iconColor = Colors.blue;
        break;
      case 'bug-report':
        iconData = Icons.bug_report;
        iconColor = Colors.red;
        break;
      case 'system-alert':
      case 'alert':
        iconData = Icons.warning;
        iconColor = Colors.amber;
        break;
      case 'announcement':
      case 'general':
        iconData = Icons.campaign;
        iconColor = Colors.indigo;
        break;
      case 'review':
      case 'feedback':
        iconData = Icons.star;
        iconColor = Colors.yellow[700]!;
        break;
      case 'grievance':
      case 'complaint':
      case 'member-problem-report':
        iconData = Icons.report_problem;
        iconColor = Colors.deepOrange;
        break;
      case 'attendance':
        iconData = Icons.checklist;
        iconColor = Colors.teal;
        break;
      case 'promotion':
      case 'offer':
        iconData = Icons.local_offer;
        iconColor = Colors.pink;
        break;
      case 'maintenance':
        iconData = Icons.construction;
        iconColor = Colors.brown;
        break;
      default:
        iconData = Icons.notifications;
        iconColor = Theme.of(context).colorScheme.primary;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: iconColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(iconData, color: iconColor),
    );
  }

  void _showNotificationDetails(BuildContext context, GymNotification notification) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(notification.title),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(notification.message),
              const SizedBox(height: 16),
              
              // Show additional details for membership-freeze notifications
              if (notification.type == 'membership-freeze' && notification.metadata != null) ...[
                const Divider(),
                const SizedBox(height: 8),
                Text(
                  'Freeze Details',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 12),
                _buildDetailRow('Member', notification.metadata!['memberName'] ?? 'N/A'),
                _buildDetailRow('Membership ID', notification.metadata!['membershipId'] ?? 'N/A'),
                _buildDetailRow('Freeze Days', '${notification.metadata!['freezeDays'] ?? 0} days'),
                if (notification.metadata!['reason'] != null)
                  _buildDetailRow('Reason', notification.metadata!['reason']),
                if (notification.metadata!['freezeStartDate'] != null)
                  _buildDetailRow(
                    'Start Date',
                    DateFormat('MMM d, y').format(DateTime.parse(notification.metadata!['freezeStartDate'])),
                  ),
                if (notification.metadata!['freezeEndDate'] != null)
                  _buildDetailRow(
                    'End Date',
                    DateFormat('MMM d, y').format(DateTime.parse(notification.metadata!['freezeEndDate'])),
                  ),
                const SizedBox(height: 16),
              ],
              
              Text(
                'Type: ${notification.type}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                'Priority: ${notification.priority}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                'Time: ${DateFormat('MMM d, y h:mm a').format(notification.timestamp)}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
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

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  void _handleChatNotification(BuildContext context, GymNotification notification) {
    try {
      // Parse actionData to get communicationId
      final actionData = notification.actionData;
      String? communicationId;
      
      if (actionData != null) {
        // Try to parse as JSON
        try {
          final data = json.decode(actionData);
          communicationId = data['communicationId'] as String?;
        } catch (e) {
          // If not JSON, might be direct string
          communicationId = actionData;
        }
      }
      
      // Fallback to metadata if actionData doesn't have it
      communicationId ??= notification.metadata?['communicationId'] as String?;
      
      if (communicationId == null) {
        // If no communicationId, just show details
        _showNotificationDetails(context, notification);
        return;
      }
      
      // Navigate to support screen with the communication ID
      Navigator.pushNamed(
        context,
        '/support',
        arguments: {'communicationId': communicationId},
      );
    } catch (e) {
      print('Error handling chat notification: $e');
      _showNotificationDetails(context, notification);
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d, y').format(timestamp);
    }
  }
}
