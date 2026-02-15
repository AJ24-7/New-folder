// lib/screens/notifications/send_notification_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/notification_provider.dart';
import '../../models/notification.dart';

class SendNotificationScreen extends StatefulWidget {
  final String? initialType;

  const SendNotificationScreen({super.key, this.initialType});

  @override
  State<SendNotificationScreen> createState() => _SendNotificationScreenState();
}

class _SendNotificationScreenState extends State<SendNotificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  
  String _selectedType = 'general';
  String _selectedPriority = 'normal';
  
  // Filters
  String? _membershipStatus;
  String? _gender;
  int? _minAge;
  int? _maxAge;
  
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialType != null) {
      _selectedType = widget.initialType!;
      _loadTemplate();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _loadTemplate() {
    switch (_selectedType) {
      case 'membership-renewal':
        _titleController.text = 'Membership Renewal Reminder';
        _messageController.text = 'Your membership is expiring soon. Please renew to continue enjoying our services.';
        _selectedPriority = 'high';
        break;
      case 'holiday-notice':
        _titleController.text = 'Holiday Notice';
        _messageController.text = 'Our gym will be closed on [DATE] for [REASON]. We will resume operations on [RESUME_DATE].';
        _selectedPriority = 'high';
        break;
      case 'payment':
        _titleController.text = 'Payment Reminder';
        _messageController.text = 'This is a friendly reminder about your pending payment.';
        _selectedPriority = 'medium';
        break;
      default:
        break;
    }
    setState(() {});
  }

  Future<void> _sendNotification() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSending = true);

    final notificationProvider = context.read<NotificationProvider>();

    final filters = NotificationFilters(
      membershipStatus: _membershipStatus,
      gender: _gender,
      minAge: _minAge,
      maxAge: _maxAge,
    );

    final result = await notificationProvider.sendToMembers(
      title: _titleController.text.trim(),
      message: _messageController.text.trim(),
      priority: _selectedPriority,
      type: _selectedType,
      filters: filters,
    );

    setState(() => _isSending = false);

    if (mounted) {
      if (result['success'] == true) {
        // Show detailed success dialog
        final stats = result['stats'] ?? {};
        final successCount = stats['successCount'] ?? 0;
        final failureCount = stats['failureCount'] ?? 0;
        final totalMembers = stats['totalMembers'] ?? 0;
        final deliveryRate = stats['deliveryRate'] ?? '0%';
        
        _showSuccessDialog(
          successCount: successCount,
          failureCount: failureCount,
          totalMembers: totalMembers,
          deliveryRate: deliveryRate,
          failedRecipients: stats['failedRecipients'],
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send: ${result['message'] ?? notificationProvider.error}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  void _showSuccessDialog({
    required int successCount,
    required int failureCount,
    required int totalMembers,
    required String deliveryRate,
    List<dynamic>? failedRecipients,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              failureCount == 0 ? Icons.check_circle : Icons.info,
              color: failureCount == 0 ? Colors.green : Colors.orange,
              size: 28,
            ),
            const SizedBox(width: 12),
            const Text('Notification Sent'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your notification has been sent to members.',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 20),
            _buildStatRow('Total Members', '$totalMembers', Icons.people),
            _buildStatRow('Delivered', '$successCount', Icons.check_circle, Colors.green),
            if (failureCount > 0)
              _buildStatRow('Failed', '$failureCount', Icons.error, Colors.red),
            _buildStatRow('Delivery Rate', deliveryRate, Icons.show_chart, Colors.blue),
            
            if (failedRecipients != null && failedRecipients.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'Failed Recipients:',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.red.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 150),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: failedRecipients.map((recipient) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          '• ${recipient['name'] ?? 'Unknown'}: ${recipient['reason'] ?? 'Unknown error'}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close screen
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value, IconData icon, [Color? color]) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color ?? Colors.grey),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 14),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Send Notification'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Template Selection
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Template',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Notification Type',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'general', child: Text('General Announcement')),
                        DropdownMenuItem(value: 'membership-renewal', child: Text('Membership Renewal')),
                        DropdownMenuItem(value: 'holiday-notice', child: Text('Holiday Notice')),
                        DropdownMenuItem(value: 'payment', child: Text('Payment Reminder')),
                        DropdownMenuItem(value: 'event', child: Text('Event Announcement')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _selectedType = value);
                          _loadTemplate();
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Message Content
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Message Content',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        border: OutlineInputBorder(),
                        counterText: '',
                      ),
                      maxLength: 100,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Title is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        labelText: 'Message',
                        border: OutlineInputBorder(),
                        alignLabelWithHint: true,
                      ),
                      maxLines: 5,
                      maxLength: 500,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Message is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedPriority,
                      decoration: const InputDecoration(
                        labelText: 'Priority',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'low', child: Text('Low')),
                        DropdownMenuItem(value: 'normal', child: Text('Normal')),
                        DropdownMenuItem(value: 'high', child: Text('High')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _selectedPriority = value);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Recipient Filters
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Recipient Filters (Optional)',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Leave empty to send to all members',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _membershipStatus,
                      decoration: const InputDecoration(
                        labelText: 'Membership Status',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('All')),
                        DropdownMenuItem(value: 'active', child: Text('Active Only')),
                        DropdownMenuItem(value: 'expired', child: Text('Expired Only')),
                        DropdownMenuItem(value: 'pending', child: Text('Pending Only')),
                      ],
                      onChanged: (value) => setState(() => _membershipStatus = value),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _gender,
                      decoration: const InputDecoration(
                        labelText: 'Gender',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('All')),
                        DropdownMenuItem(value: 'male', child: Text('Male')),
                        DropdownMenuItem(value: 'female', child: Text('Female')),
                        DropdownMenuItem(value: 'other', child: Text('Other')),
                      ],
                      onChanged: (value) => setState(() => _gender = value),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            decoration: const InputDecoration(
                              labelText: 'Min Age',
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (value) {
                              setState(() => _minAge = int.tryParse(value));
                            },
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextFormField(
                            decoration: const InputDecoration(
                              labelText: 'Max Age',
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (value) {
                              setState(() => _maxAge = int.tryParse(value));
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Send Button
            ElevatedButton.icon(
              onPressed: _isSending ? null : _sendNotification,
              icon: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send),
              label: Text(_isSending ? 'Sending...' : 'Send Notification'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                textStyle: const TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
