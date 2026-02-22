import 'package:flutter/material.dart';
import '../../models/support_models.dart';
import '../../services/support_service.dart';
import 'package:timeago/timeago.dart' as timeago;

class GrievancesTab extends StatefulWidget {
  final List<Grievance> grievances;
  final String gymId;
  final VoidCallback onRefresh;
  final SupportService supportService;

  const GrievancesTab({
    Key? key,
    required this.grievances,
    required this.gymId,
    required this.onRefresh,
    required this.supportService,
  }) : super(key: key);

  @override
  State<GrievancesTab> createState() => _GrievancesTabState();
}

class _GrievancesTabState extends State<GrievancesTab> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  String _searchQuery = '';
  String _filterStatus = 'all'; // all, open, in-progress, resolved, closed
  String _filterPriority = 'all'; // all, low, medium, high, urgent
  String _viewType = 'all'; // all, grievances, member-reports
  List<Map<String, dynamic>> _memberReports = [];
  bool _isLoadingReports = false;

  @override
  void initState() {
    super.initState();
    _loadMemberReports();
  }

  Future<void> _loadMemberReports() async {
    setState(() {
      _isLoadingReports = true;
    });

    try {
      final reports = await widget.supportService.getMemberProblemReports();
      if (mounted) {
        setState(() {
          _memberReports = reports;
          _isLoadingReports = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading member reports: $e');
      if (mounted) {
        setState(() {
          _isLoadingReports = false;
        });
      }
    }
  }

  // Silent refresh without showing loading indicator
  Future<void> _refreshMemberReportsSilently() async {
    try {
      final reports = await widget.supportService.getMemberProblemReports();
      if (mounted) {
        setState(() {
          _memberReports = reports;
        });
      }
    } catch (e) {
      debugPrint('Error refreshing member reports: $e');
    }
  }

  List<Grievance> get _filteredGrievances {
    if (_viewType == 'member-reports') return [];
    
    return widget.grievances.where((grievance) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!grievance.title.toLowerCase().contains(query) &&
            !grievance.description.toLowerCase().contains(query) &&
            !grievance.userName.toLowerCase().contains(query)) {
          return false;
        }
      }

      // Status filter
      if (_filterStatus != 'all' && grievance.status != _filterStatus) {
        return false;
      }

      // Priority filter
      if (_filterPriority != 'all' && grievance.priority != _filterPriority) {
        return false;
      }

      return true;
    }).toList();
  }

  List<Map<String, dynamic>> get _filteredMemberReports {
    if (_viewType == 'grievances') return [];
    
    return _memberReports.where((report) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final subject = (report['subject'] ?? '').toString().toLowerCase();
        final description = (report['description'] ?? '').toString().toLowerCase();
        final memberName = (report['memberId']?['memberName'] ?? '').toString().toLowerCase();
        
        if (!subject.contains(query) &&
            !description.contains(query) &&
            !memberName.contains(query)) {
          return false;
        }
      }

      // Status filter
      if (_filterStatus != 'all' && report['status'] != _filterStatus) {
        return false;
      }

      // Priority filter
      if (_filterPriority != 'all' && report['priority'] != _filterPriority) {
        return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final showGrievances = _viewType == 'all' || _viewType == 'grievances';
    final showReports = _viewType == 'all' || _viewType == 'member-reports';
    final hasAnyItems = (showGrievances && _filteredGrievances.isNotEmpty) || 
                        (showReports && _filteredMemberReports.isNotEmpty);

    return Column(
      children: [
        // Search, Filters, and Raise Grievance button
        _buildHeaderSection(),
        // Grievances and Reports List
        Expanded(
          child: _isLoadingReports
              ? const Center(child: CircularProgressIndicator())
              : !hasAnyItems
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: () async {
                    widget.onRefresh();
                    await _loadMemberReports();
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (showReports && _filteredMemberReports.isNotEmpty) ...[
                        if (_viewType == 'all') ...[
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              children: [
                                Icon(Icons.report_problem, color: Colors.orange, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Member Problem Reports (${_filteredMemberReports.length})',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        ..._filteredMemberReports.map((report) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildMemberReportCard(report),
                        )),
                        if (_viewType == 'all' && _filteredGrievances.isNotEmpty)
                          const Divider(height: 32, thickness: 2),
                      ],
                      if (showGrievances && _filteredGrievances.isNotEmpty) ...[
                        if (_viewType == 'all') ...[
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              children: [
                                Icon(Icons.support_agent, color: Colors.blue, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Support Grievances (${_filteredGrievances.length})',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        ..._filteredGrievances.map((grievance) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildGrievanceCard(grievance),
                        )),
                      ],
                    ],
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildHeaderSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Column(
        children: [
          // View Type Selector
          Row(
            children: [
              Expanded(
                child: SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'all', label: Text('All'), icon: Icon(Icons.list, size: 16)),
                    ButtonSegment(value: 'member-reports', label: Text('Reports'), icon: Icon(Icons.report_problem, size: 16)),
                    ButtonSegment(value: 'grievances', label: Text('Grievances'), icon: Icon(Icons.support_agent, size: 16)),
                  ],
                  selected: {_viewType},
                  onSelectionChanged: (Set<String> newSelection) {
                    setState(() {
                      _viewType = newSelection.first;
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Raise Grievance button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Raise New Grievance'),
              onPressed: _showRaiseGrievanceDialog,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGrievanceCard(Grievance grievance) {
    Color statusColor = _getStatusColor(grievance.status);
    Color priorityColor = _getPriorityColor(grievance.priority);

    return Card(
      elevation: 2,
      child: InkWell(
        onTap: () => _showGrievanceDetail(grievance),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with title and badges
              Row(
                children: [
                  Expanded(
                    child: Text(
                      grievance.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: priorityColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      grievance.priority.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: priorityColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      grievance.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Description
              Text(
                grievance.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              // Meta information
              Row(
                children: [
                  Icon(Icons.person, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    grievance.userName,
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.category, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    grievance.category,
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.access_time, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    timeago.format(grievance.createdAt),
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
              if (grievance.messages.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.message, size: 14, color: Colors.blue),
                    const SizedBox(width: 4),
                    Text(
                      '${grievance.messages.length} message(s)',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.blue,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMemberReportCard(Map<String, dynamic> report) {
    final status = report['status'] ?? 'open';
    final priority = report['priority'] ?? 'normal';
    final statusColor = _getStatusColor(status);
    final priorityColor = _getPriorityColor(priority);
    final subject = report['subject'] ?? 'No Subject';
    final description = report['description'] ?? '';
    final category = report['category'] ?? 'other';
    final memberInfo = report['memberId'] as Map<String, dynamic>?;
    final memberName = memberInfo?['memberName'] ?? 'Unknown Member';
    final membershipId = memberInfo?['membershipId'] ?? '';
    final createdAt = report['createdAt'] != null 
        ? DateTime.parse(report['createdAt']) 
        : DateTime.now();
    final images = List<String>.from(report['images'] ?? []);
    final hasResponse = report['adminResponse'] != null;

    return Card(
      elevation: 2,
      child: InkWell(
        onTap: () => _showMemberReportDetail(report),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with title and badges
              Row(
                children: [
                  Icon(Icons.report_problem, color: Colors.orange, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      subject,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: priorityColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      priority.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: priorityColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Description
              Text(
                description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 12),
              // Meta information
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.person, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        memberName,
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                  if (membershipId.isNotEmpty)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.badge, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Text(
                          membershipId,
                          style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.category, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        category.split('-').map((w) => w[0].toUpperCase() + w.substring(1)).join(' '),
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.access_time, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        timeago.format(createdAt),
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ],
              ),
              if (images.isNotEmpty || hasResponse) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (images.isNotEmpty) ...[
                      const Icon(Icons.image, size: 14, color: Colors.green),
                      const SizedBox(width: 4),
                      Text(
                        '${images.length} image(s)',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.green,
                        ),
                      ),
                      if (hasResponse) const SizedBox(width: 16),
                    ],
                    if (hasResponse) ...[
                      const Icon(Icons.reply, size: 14, color: Colors.blue),
                      const SizedBox(width: 4),
                      const Text(
                        'Response sent',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.report_problem_outlined, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 16),
          Text(
            'No grievances found',
            style: TextStyle(
              fontSize: 16,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            icon: const Icon(Icons.add),
            label: const Text('Raise New Grievance'),
            onPressed: _showRaiseGrievanceDialog,
          ),
        ],
      ),
    );
  }

  void _showGrievanceDetail(Grievance grievance) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                color: _getStatusColor(grievance.status).withValues(alpha: 0.1),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            grievance.title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('By ${grievance.userName}'),
                    Text(
                      timeago.format(grievance.createdAt),
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Details
                      Row(
                        children: [
                          _buildDetailBadge(
                            'Status',
                            grievance.status,
                            _getStatusColor(grievance.status),
                          ),
                          const SizedBox(width: 12),
                          _buildDetailBadge(
                            'Priority',
                            grievance.priority,
                            _getPriorityColor(grievance.priority),
                          ),
                          const SizedBox(width: 12),
                          _buildDetailBadge(
                            'Category',
                            grievance.category,
                            Colors.blue,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Description:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(grievance.description),
                      const SizedBox(height: 24),
                      // Messages
                      const Text(
                        'Conversation:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...grievance.messages.map((msg) => _buildMessageBubble(msg)),
                      const SizedBox(height: 16),
                      // Add message
                      _buildAddMessageField(grievance),
                    ],
                  ),
                ),
              ),
              // Actions
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButton<String>(
                        value: grievance.status,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'open', child: Text('Open')),
                          DropdownMenuItem(
                              value: 'in-progress', child: Text('In Progress')),
                          DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                          DropdownMenuItem(value: 'closed', child: Text('Closed')),
                        ],
                        onChanged: (status) {
                          if (status != null) {
                            _updateStatus(grievance, status);
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (grievance.status != 'resolved' &&
                        grievance.status != 'closed')
                      ElevatedButton.icon(
                        icon: const Icon(Icons.warning),
                        label: const Text('Escalate'),
                        onPressed: () {
                          Navigator.pop(context);
                          _showEscalateDialog(grievance);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailBadge(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: color),
          ),
          child: Text(
            value.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMessageBubble(GrievanceMessage message) {
    bool isAdmin = message.senderType == 'admin';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Align(
      alignment: isAdmin ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: isAdmin 
              ? (isDark ? Colors.blue[800] : Colors.blue[100])
              : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  isAdmin ? 'Admin' : 'Member',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Text(
                  timeago.format(message.timestamp),
                  style: TextStyle(
                    fontSize: 10,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(message.message),
          ],
        ),
      ),
    );
  }

  Widget _buildAddMessageField(Grievance grievance) {
    final TextEditingController controller = TextEditingController();

    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: 'Type your message...',
              border: OutlineInputBorder(),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: const Icon(Icons.send),
          onPressed: () async {
            if (controller.text.trim().isNotEmpty) {
              try {
                await widget.supportService.addGrievanceMessage(
                  grievance.id,
                  controller.text.trim(),
                  'admin',
                );
                controller.clear();
                widget.onRefresh();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Message sent')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to send: $e')),
                  );
                }
              }
            }
          },
        ),
      ],
    );
  }

  void _showMemberReportDetail(Map<String, dynamic> report) {
    final status = report['status'] ?? 'open';
    final subject = report['subject'] ?? 'No Subject';
    final description = report['description'] ?? '';
    final memberInfo = report['memberId'] as Map<String, dynamic>?;
    final memberName = memberInfo?['memberName'] ?? 'Unknown Member';
    final membershipId = memberInfo?['membershipId'] ?? '';
    final category = report['category'] ?? 'other';
    final priority = report['priority'] ?? 'normal';
    final createdAt = report['createdAt'] != null 
        ? DateTime.parse(report['createdAt']) 
        : DateTime.now();
    final images = List<String>.from(report['images'] ?? []);
    final adminResponse = report['adminResponse'] as Map<String, dynamic>?;
    final reportId = report['_id'] ?? '';

    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700, maxHeight: 800),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(12),
                color: _getStatusColor(status).withValues(alpha: 0.1),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.report_problem, color: Colors.orange, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            subject,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: [
                        Text('By $memberName', style: const TextStyle(fontSize: 13)),
                        if (membershipId.isNotEmpty) ...[
                          const Text(' • ', style: TextStyle(fontSize: 13)),
                          Text('ID: $membershipId', style: const TextStyle(fontSize: 13)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      timeago.format(createdAt),
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Details
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _buildDetailBadge('Status', status, _getStatusColor(status)),
                          _buildDetailBadge('Priority', priority, _getPriorityColor(priority)),
                          _buildDetailBadge('Category', category.split('-').map((w) => w[0].toUpperCase() + w.substring(1)).join(' '), Colors.blue),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Description:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      Text(description, style: const TextStyle(fontSize: 13)),
                      // Images
                      if (images.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Attached Images:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 100,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: images.length,
                            itemBuilder: (context, index) {
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    images[index],
                                    width: 100,
                                    height: 100,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stack) => Container(
                                      width: 100,
                                      height: 100,
                                      color: Colors.grey[300],
                                      child: const Icon(Icons.error, size: 20),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      // Admin Response
                      const Text(
                        'Admin Response:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (adminResponse != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.blue),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.admin_panel_settings, size: 14, color: Colors.blue),
                                  const SizedBox(width: 8),
                                  const Flexible(
                                    child: Text(
                                      'Admin Response',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      adminResponse['respondedAt'] != null
                                          ? timeago.format(DateTime.parse(adminResponse['respondedAt']))
                                          : '',
                                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                                      textAlign: TextAlign.right,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(adminResponse['message'] ?? '', style: const TextStyle(fontSize: 13)),
                            ],
                          ),
                        ),
                      ] else ...[
                        _buildRespondField(reportId),
                      ],
                    ],
                  ),
                ),
              ),
              // Actions
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
                ),
                child: DropdownButtonFormField<String>(
                  initialValue: status,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Update Status',
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'open', child: Text('Open', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'acknowledged', child: Text('Acknowledged', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'in-progress', child: Text('In Progress', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'resolved', child: Text('Resolved', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'closed', child: Text('Closed', style: TextStyle(fontSize: 13))),
                  ],
                  onChanged: (newStatus) {
                    if (newStatus != null && reportId.isNotEmpty) {
                      _updateReportStatus(reportId, newStatus);
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRespondField(String reportId) {
    final TextEditingController controller = TextEditingController();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Type your response to the member...',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.all(12),
          ),
          style: const TextStyle(fontSize: 13),
          maxLines: 3,
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.send, size: 18),
            label: const Text('Send Response', style: TextStyle(fontSize: 13)),
            onPressed: () async {
              if (controller.text.trim().isNotEmpty && reportId.isNotEmpty) {
                try {
                  await widget.supportService.respondToMemberProblem(
                    reportId,
                    controller.text.trim(),
                    status: 'acknowledged',
                  );
                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Response sent successfully')),
                    );
                    // Refresh data silently in background
                    _refreshMemberReportsSilently();
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to send response: $e')),
                    );
                  }
                }
              }
            },
          ),
        ),
      ],
    );
  }

  Future<void> _updateReportStatus(String reportId, String newStatus) async {
    try {
      await widget.supportService.updateProblemReportStatus(reportId, newStatus);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Status updated successfully')),
        );
        // Refresh data silently in background
        _refreshMemberReportsSilently();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e')),
        );
      }
    }
  }

  void _showRaiseGrievanceDialog() {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    String category = 'service';
    String priority = 'medium';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Raise New Grievance'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
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
                  maxLines: 4,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'service', child: Text('Service')),
                    DropdownMenuItem(value: 'billing', child: Text('Billing')),
                    DropdownMenuItem(value: 'technical', child: Text('Technical')),
                    DropdownMenuItem(value: 'facility', child: Text('Facility')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      category = value ?? 'service';
                    });
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: priority,
                  decoration: const InputDecoration(
                    labelText: 'Priority',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'low', child: Text('Low')),
                    DropdownMenuItem(value: 'medium', child: Text('Medium')),
                    DropdownMenuItem(value: 'high', child: Text('High')),
                    DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      priority = value ?? 'medium';
                    });
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleController.text.trim().isNotEmpty &&
                    descriptionController.text.trim().isNotEmpty) {
                  try {
                    await widget.supportService.createGrievance(
                      gymId: widget.gymId,
                      title: titleController.text.trim(),
                      description: descriptionController.text.trim(),
                      category: category,
                      priority: priority,
                    );
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Grievance created successfully')),
                      );
                      widget.onRefresh();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to create: $e')),
                      );
                    }
                  }
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEscalateDialog(Grievance grievance) {
    final reasonController = TextEditingController();
    String priority = 'high';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Escalate to Main Admin'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: 'Reason for escalation',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: priority,
                decoration: const InputDecoration(
                  labelText: 'Priority',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'high', child: Text('High')),
                  DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                ],
                onChanged: (value) {
                  setState(() {
                    priority = value ?? 'high';
                  });
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (reasonController.text.trim().isNotEmpty) {
                  try {
                    await widget.supportService.escalateGrievance(
                      grievance.id,
                      reasonController.text.trim(),
                      priority,
                    );
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Grievance escalated')),
                      );
                      widget.onRefresh();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to escalate: $e')),
                      );
                    }
                  }
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
              child: const Text('Escalate'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(Grievance grievance, String newStatus) async {
    try {
      await widget.supportService.updateGrievanceStatus(grievance.id, newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Status updated successfully')),
        );
        widget.onRefresh();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e')),
        );
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'open':
        return Colors.blue;
      case 'in-progress':
        return Colors.orange;
      case 'resolved':
        return Colors.green;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'urgent':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.blue;
      case 'low':
      default:
        return Colors.grey;
    }
  }
}
