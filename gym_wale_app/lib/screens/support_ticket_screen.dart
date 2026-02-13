import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../services/api_service.dart';

class SupportTicketScreen extends StatefulWidget {
  const SupportTicketScreen({Key? key}) : super(key: key);

  @override
  State<SupportTicketScreen> createState() => _SupportTicketScreenState();
}

class _SupportTicketScreenState extends State<SupportTicketScreen> {
  List<dynamic> _tickets = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await ApiService.getUserSupportTickets(
        status: _selectedFilter != 'all' ? _selectedFilter : null,
      );

      if (mounted) {
        setState(() {
          if (result['success'] == true) {
            // Filter out chat tickets - only show feedback, bug reports, etc.
            final allTickets = result['tickets'] ?? [];
            _tickets = allTickets.where((ticket) => 
              ticket['category'] != 'chat'
            ).toList();
          } else {
            _errorMessage = result['message'] ?? 'Failed to load tickets';
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error loading tickets: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Support Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTickets,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            padding: const EdgeInsets.all(16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All', 'all'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Open', 'open'),
                  const SizedBox(width: 8),
                  _buildFilterChip('In Progress', 'in-progress'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Resolved', 'resolved'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Closed', 'closed'),
                ],
              ),
            ),
          ),

          // Tickets list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline,
                                size: 64, color: AppTheme.errorColor),
                            const SizedBox(height: 16),
                            Text(_errorMessage!),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadTickets,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _tickets.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.support_agent,
                                    size: 64, color: AppTheme.textSecondary),
                                const SizedBox(height: 16),
                                const Text(
                                  'No support tickets yet',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Report bugs, send feedback, or get help from admin',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '(Gym chats are managed separately)',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 12,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadTickets,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _tickets.length,
                              itemBuilder: (context, index) {
                                return _buildTicketCard(_tickets[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateTicketDialog(),
        icon: const Icon(Icons.add),
        label: const Text('New Ticket'),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() => _selectedFilter = value);
          _loadTickets();
        }
      },
      selectedColor: AppTheme.primaryColor,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppTheme.textPrimary,
      ),
    );
  }

  Widget _buildTicketCard(dynamic ticket) {
    final status = ticket['status'] ?? 'open';
    final priority = ticket['priority'] ?? 'medium';
    final ticketId = ticket['ticketId'] ?? '';
    final subject = ticket['subject'] ?? 'No subject';
    final category = ticket['category'] ?? 'general';
    final createdAt = ticket['createdAt'] != null
        ? DateTime.parse(ticket['createdAt'])
        : DateTime.now();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showTicketDetails(ticket),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      subject,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  _buildStatusChip(status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.label, size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    category.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.priority_high,
                      size: 16, color: _getPriorityColor(priority)),
                  const SizedBox(width: 4),
                  Text(
                    priority.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      color: _getPriorityColor(priority),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.confirmation_number,
                      size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    ticketId,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  Icon(Icons.access_time,
                      size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(createdAt),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    IconData icon;

    switch (status.toLowerCase()) {
      case 'open':
        color = AppTheme.warningColor;
        icon = Icons.hourglass_empty;
        break;
      case 'in-progress':
        color = AppTheme.accentColor;
        icon = Icons.pending;
        break;
      case 'resolved':
        color = AppTheme.successColor;
        icon = Icons.check_circle;
        break;
      case 'closed':
        color = AppTheme.textLight;
        icon = Icons.cancel;
        break;
      default:
        color = AppTheme.textLight;
        icon = Icons.help;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            status.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return AppTheme.errorColor;
      case 'high':
        return AppTheme.warningColor;
      case 'medium':
        return AppTheme.accentColor;
      case 'low':
        return AppTheme.successColor;
      default:
        return AppTheme.textSecondary;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes}m ago';
      }
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  void _showTicketDetails(dynamic ticket) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return TicketDetailsView(
            ticket: ticket,
            scrollController: scrollController,
            onUpdate: _loadTickets,
          );
        },
      ),
    );
  }

  void _showCreateTicketDialog() {
    showDialog(
      context: context,
      builder: (context) => CreateTicketDialog(
        onTicketCreated: _loadTickets,
      ),
    );
  }
}

class TicketDetailsView extends StatelessWidget {
  final dynamic ticket;
  final ScrollController scrollController;
  final VoidCallback onUpdate;

  const TicketDetailsView({
    Key? key,
    required this.ticket,
    required this.scrollController,
    required this.onUpdate,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final messages = ticket['messages'] as List? ?? [];
    final description = ticket['description'] ?? ticket['message'] ?? 'No description';

    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            ticket['subject'] ?? 'Ticket Details',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ticket ID: ${ticket['ticketId']}',
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          const Divider(height: 24),
          Expanded(
            child: ListView(
              controller: scrollController,
              children: [
                const Text(
                  'Description:',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(description),
                const SizedBox(height: 24),
                if (messages.isNotEmpty) ...[
                  const Text(
                    'Conversation:',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...messages.map((msg) => _buildMessage(msg)).toList(),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                // TODO: Show reply dialog
              },
              child: const Text('Reply to Ticket'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(dynamic message) {
    final sender = message['sender'] ?? 'unknown';
    final text = message['message'] ?? '';
    final timestamp = message['timestamp'] != null
        ? DateTime.parse(message['timestamp'])
        : DateTime.now();
    final isAdmin = sender == 'admin';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isAdmin ? AppTheme.primaryColor.withOpacity(0.1) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isAdmin ? AppTheme.primaryColor : Colors.grey[300]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isAdmin ? Icons.support_agent : Icons.person,
                size: 16,
                color: isAdmin ? AppTheme.primaryColor : AppTheme.textSecondary,
              ),
              const SizedBox(width: 8),
              Text(
                isAdmin ? 'Support Team' : 'You',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isAdmin ? AppTheme.primaryColor : AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                _formatTime(timestamp),
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(text),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')} ${dateTime.day}/${dateTime.month}';
  }
}

class CreateTicketDialog extends StatefulWidget {
  final VoidCallback onTicketCreated;
  final String initialCategory;
  final String initialSubject;

  const CreateTicketDialog({
    Key? key, 
    required this.onTicketCreated,
    this.initialCategory = 'general',
    this.initialSubject = '',
  }) : super(key: key);

  @override
  State<CreateTicketDialog> createState() => _CreateTicketDialogState();
}

class _CreateTicketDialogState extends State<CreateTicketDialog> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  final _phoneController = TextEditingController();

  late String _selectedCategory;
  String _selectedPriority = 'medium';
  bool _emailUpdates = true;
  bool _isSubmitting = false;
  
  // Category-specific fields
  List<dynamic> _userMemberships = [];
  List<dynamic> _userPayments = [];
  String? _selectedMembershipId;
  String? _selectedPaymentId;
  String? _selectedComplaint;
  bool _isLoadingData = false;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory;
    _subjectController.text = widget.initialSubject;
    _loadCategorySpecificData();
  }
  
  Future<void> _loadCategorySpecificData() async {
    if (_selectedCategory == 'membership' || _selectedCategory == 'billing') {
      setState(() => _isLoadingData = true);
      try {
        if (_selectedCategory == 'membership') {
          // Load user's active memberships using the same method as settings screen
          final memberships = await ApiService.getActiveMemberships();
          if (mounted) {
            setState(() => _userMemberships = memberships);
          }
        } else if (_selectedCategory == 'billing') {
          // Load user's recent payments using the same method as settings screen
          final payments = await ApiService.getTransactions();
          if (mounted) {
            setState(() => _userPayments = payments);
          }
        }
      } catch (e) {
        print('Error loading category data: $e');
      } finally {
        if (mounted) setState(() => _isLoadingData = false);
      }
    }
  }

  final List<Map<String, String>> _categories = [
    {'value': 'technical', 'label': 'Technical Issue'},
    {'value': 'billing', 'label': 'Billing'},
    {'value': 'membership', 'label': 'Membership'},
    {'value': 'general', 'label': 'General Inquiry'},
    {'value': 'complaint', 'label': 'Complaint'},
  ];

  final List<Map<String, String>> _priorities = [
    {'value': 'low', 'label': 'Low'},
    {'value': 'medium', 'label': 'Medium'},
    {'value': 'high', 'label': 'High'},
    {'value': 'urgent', 'label': 'Urgent'},
  ];
  
  final List<Map<String, String>> _complaintOptions = [
    {'value': 'poor_equipment', 'label': 'Poor Equipment Quality'},
    {'value': 'unhygienic', 'label': 'Unhygienic Facilities'},
    {'value': 'staff_behavior', 'label': 'Staff Behavior'},
    {'value': 'overcrowding', 'label': 'Overcrowding Issues'},
    {'value': 'safety_concerns', 'label': 'Safety Concerns'},
    {'value': 'noise', 'label': 'Excessive Noise'},
    {'value': 'maintenance', 'label': 'Poor Maintenance'},
    {'value': 'schedule_issues', 'label': 'Class Schedule Issues'},
    {'value': 'trainer_quality', 'label': 'Trainer Quality/Availability'},
    {'value': 'billing_dispute', 'label': 'Billing Dispute'},
    {'value': 'membership_issue', 'label': 'Membership Issue'},
    {'value': 'other', 'label': 'Other Issue'},
  ];

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;
    
    // Build enhanced message with category-specific details
    String enhancedMessage = _messageController.text.trim();
    
    if (_selectedCategory == 'membership' && _selectedMembershipId != null) {
      final membership = _userMemberships.firstWhere(
        (m) => (m['_id'] ?? m['id'] ?? m['membershipId']) == _selectedMembershipId,
        orElse: () => {},
      );
      final gymName = membership['gym']?['name'] ?? membership['gymName'] ?? 'N/A';
      final planName = membership['plan']?['name'] ?? membership['planName'] ?? 'N/A';
      enhancedMessage = 'Related Membership: $gymName - $planName\n\n$enhancedMessage';
    } else if (_selectedCategory == 'billing' && _selectedPaymentId != null) {
      final payment = _userPayments.firstWhere(
        (p) => (p['_id'] ?? p['id']) == _selectedPaymentId,
        orElse: () => {},
      );
      final gymName = payment['gymName'] ?? 'N/A';
      final planName = payment['planName'] ?? 'N/A';
      enhancedMessage = 'Related Payment: ₹${payment['amount'] ?? 'N/A'} - $gymName - $planName\n\n$enhancedMessage';
    } else if (_selectedCategory == 'complaint' && _selectedComplaint != null) {
      final complaint = _complaintOptions.firstWhere(
        (c) => c['value'] == _selectedComplaint,
        orElse: () => {'label': 'N/A'},
      );
      enhancedMessage = 'Issue Type: ${complaint['label']}\n\n$enhancedMessage';
    }

    setState(() => _isSubmitting = true);

    try {
      final result = await ApiService.createSupportTicket(
        category: _selectedCategory,
        subject: _subjectController.text.trim(),
        message: enhancedMessage,
        priority: _selectedPriority,
        phone: _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
        emailUpdates: _emailUpdates,
      );

      if (mounted) {
        setState(() => _isSubmitting = false);

        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Ticket created successfully! ID: ${result['ticketId']}'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          Navigator.pop(context);
          widget.onTicketCreated();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to create ticket'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Create Support Ticket',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                DropdownButtonFormField<String>(
                  initialValue: _selectedCategory,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                  ),
                  items: _categories.map((cat) {
                    return DropdownMenuItem(
                      value: cat['value'],
                      child: Text(cat['label']!),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedCategory = value!;
                      _selectedMembershipId = null;
                      _selectedPaymentId = null;
                      _selectedComplaint = null;
                    });
                    _loadCategorySpecificData();
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _selectedPriority,
                  decoration: const InputDecoration(
                    labelText: 'Priority',
                    border: OutlineInputBorder(),
                  ),
                  items: _priorities.map((pri) {
                    return DropdownMenuItem(
                      value: pri['value'],
                      child: Text(pri['label']!),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() => _selectedPriority = value!);
                  },
                ),
                const SizedBox(height: 16),
                
                // Category-specific fields
                if (_selectedCategory == 'membership') ..._buildMembershipFields(),
                if (_selectedCategory == 'billing') ..._buildBillingFields(),
                if (_selectedCategory == 'complaint') ..._buildComplaintFields(),
                
                TextFormField(
                  controller: _subjectController,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter a subject';
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
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter a message';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone (Optional)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 16),
                CheckboxListTile(
                  value: _emailUpdates,
                  onChanged: (value) {
                    setState(() => _emailUpdates = value ?? true);
                  },
                  title: const Text('Receive email updates'),
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isSubmitting
                            ? null
                            : () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitTicket,
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white),
                                ),
                              )
                            : const Text('Submit'),
                      ),
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
  
  // Build membership-specific fields
  List<Widget> _buildMembershipFields() {
    if (_isLoadingData) {
      return [
        const Center(child: CircularProgressIndicator()),
        const SizedBox(height: 16),
      ];
    }
    
    if (_userMemberships.isEmpty) {
      return [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: Colors.orange, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'No active memberships found',
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ];
    }
    
    return [
      DropdownButtonFormField<String>(
        initialValue: _selectedMembershipId,
        decoration: const InputDecoration(
          labelText: 'Select Related Membership',
          border: OutlineInputBorder(),
          helperText: 'Choose the membership this issue is about',
        ),
        items: _userMemberships.map((membership) {
          final membershipId = (membership['_id'] ?? membership['id'] ?? membership['membershipId']) as String;
          final gymName = membership['gym']?['name'] ?? membership['gymName'] ?? 'Unknown Gym';
          final planName = membership['plan']?['name'] ?? membership['planName'] ?? 'Plan';
          return DropdownMenuItem(
            value: membershipId,
            child: Text(
              '$gymName - $planName',
              overflow: TextOverflow.ellipsis,
            ),
          );
        }).toList(),
        onChanged: (value) {
          setState(() => _selectedMembershipId = value);
        },
      ),
      const SizedBox(height: 16),
    ];
  }
  
  // Build billing-specific fields
  List<Widget> _buildBillingFields() {
    if (_isLoadingData) {
      return [
        const Center(child: CircularProgressIndicator()),
        const SizedBox(height: 16),
      ];
    }
    
    if (_userPayments.isEmpty) {
      return [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: Colors.orange, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'No recent payments found',
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ];
    }
    
    return [
      DropdownButtonFormField<String>(
        initialValue: _selectedPaymentId,
        decoration: const InputDecoration(
          labelText: 'Select Related Payment',
          border: OutlineInputBorder(),
          helperText: 'Choose the payment this issue is about',
        ),
        items: _userPayments.map((payment) {
          final paymentId = (payment['_id'] ?? payment['id']) as String;
          final amount = payment['amount'] ?? 0;
          final gymName = payment['gymName'] ?? 'Unknown';
          final planName = payment['planName'] ?? 'Payment';
          final date = payment['date'] != null 
              ? (payment['date'] is String ? DateTime.parse(payment['date']) : payment['date'] as DateTime).toString().split(' ')[0]
              : (payment['createdAt'] != null 
                  ? DateTime.parse(payment['createdAt']).toString().split(' ')[0]
                  : 'N/A');
          return DropdownMenuItem(
            value: paymentId,
            child: Text(
              '₹$amount - $gymName - $date',
              overflow: TextOverflow.ellipsis,
            ),
          );
        }).toList(),
        onChanged: (value) {
          setState(() => _selectedPaymentId = value);
        },
      ),
      const SizedBox(height: 16),
    ];
  }
  
  // Build complaint-specific fields
  List<Widget> _buildComplaintFields() {
    return [
      DropdownButtonFormField<String>(
        initialValue: _selectedComplaint,
        decoration: const InputDecoration(
          labelText: 'Type of Complaint',
          border: OutlineInputBorder(),
          helperText: 'Select the issue you\'re experiencing',
        ),
        items: _complaintOptions.map((complaint) {
          return DropdownMenuItem(
            value: complaint['value'],
            child: Text(complaint['label']!),
          );
        }).toList(),
        onChanged: (value) {
          setState(() => _selectedComplaint = value);
        },
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'Please select a complaint type';
          }
          return null;
        },
      ),
      const SizedBox(height: 16),
    ];
  }
}
