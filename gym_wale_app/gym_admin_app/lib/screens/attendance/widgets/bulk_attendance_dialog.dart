import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../services/api_service.dart';
import '../../../services/member_service.dart';
import '../../../models/member.dart';
import '../../../config/app_theme.dart';

/// Bulk Attendance Dialog
/// Mark attendance for multiple members at once
class BulkAttendanceDialog extends StatefulWidget {
  final DateTime selectedDate;

  const BulkAttendanceDialog({
    super.key,
    required this.selectedDate,
  });

  @override
  State<BulkAttendanceDialog> createState() => _BulkAttendanceDialogState();
}

class _BulkAttendanceDialogState extends State<BulkAttendanceDialog> {
  final ApiService _apiService = ApiService();
  final MemberService _memberService = MemberService();
  
  List<Member> _allMembers = [];
  Map<String, String> _memberStatusMap = {}; // memberId -> status
  String _defaultStatus = 'present';
  
  bool _isLoading = true;
  bool _isSubmitting = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  Future<void> _loadMembers() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final members = await _memberService.getMembers();
      setState(() {
        _allMembers = members;
        // Initialize all members as present by default
        for (var member in members) {
          _memberStatusMap[member.id] = _defaultStatus;
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredMembers = _allMembers.where((member) {
      if (_searchQuery.isEmpty) return true;
      return member.memberName.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Dialog(
      child: Container(
        width: 600,
        height: MediaQuery.of(context).size.height * 0.8,
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(FontAwesomeIcons.users, color: AppTheme.primaryColor),
                      const SizedBox(width: 12),
                      const Text(
                        'Bulk Mark Attendance',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context, false),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Search bar
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Search members...',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                ],
              ),
            ),
            
            // Quick actions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
              ),
              child: Row(
                children: [
                  const Text(
                    'Mark all as:',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 12),
                  _buildQuickActionButton('Present', 'present', Colors.green),
                  const SizedBox(width: 8),
                  _buildQuickActionButton('Absent', 'absent', Colors.red),
                  const SizedBox(width: 8),
                  _buildQuickActionButton('Late', 'late', Colors.orange),
                ],
              ),
            ),
            
            // Members list
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredMembers.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                FontAwesomeIcons.userXmark,
                                size: 64,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No members found',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredMembers.length,
                          separatorBuilder: (context, index) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            return _buildMemberItem(filteredMembers[index]);
                          },
                        ),
            ),
            
            // Footer
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                border: Border(top: BorderSide(color: Colors.grey[300]!)),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${_memberStatusMap.length} members',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitBulkAttendance,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Submit Attendance'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionButton(String label, String status, Color color) {
    return OutlinedButton(
      onPressed: () {
        setState(() {
          for (var member in _allMembers) {
            _memberStatusMap[member.id] = status;
          }
        });
      },
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12)),
    );
  }

  Widget _buildMemberItem(Member member) {
    final currentStatus = _memberStatusMap[member.id] ?? 'present';

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      leading: CircleAvatar(
        radius: 20,
        backgroundImage: member.profileImage != null ? NetworkImage(member.profileImage!) : null,
        backgroundColor: _getStatusColor(currentStatus).withValues(alpha: 0.2),
        child: member.profileImage == null
            ? Text(
                member.memberName.substring(0, 1).toUpperCase(),
                style: TextStyle(
                  color: _getStatusColor(currentStatus),
                  fontWeight: FontWeight.bold,
                ),
              )
            : null,
      ),
      title: Text(
        member.memberName,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      trailing: DropdownButton<String>(
        value: currentStatus,
        underline: const SizedBox.shrink(),
        items: const [
          DropdownMenuItem(value: 'present', child: Text('Present')),
          DropdownMenuItem(value: 'absent', child: Text('Absent')),
          DropdownMenuItem(value: 'late', child: Text('Late')),
          DropdownMenuItem(value: 'leave', child: Text('Leave')),
        ],
        onChanged: (value) {
          if (value != null) {
            setState(() {
              _memberStatusMap[member.id] = value;
            });
          }
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return Colors.green;
      case 'absent':
        return Colors.red;
      case 'late':
        return Colors.orange;
      case 'leave':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  Future<void> _submitBulkAttendance() async {
    setState(() {
      _isSubmitting = true;
    });
    
    try {
      // Prepare attendance data
      final attendanceData = _memberStatusMap.entries.map((entry) {
        return {
          'memberId': entry.key,
          'status': entry.value,
          'attendanceType': 'manual',
        };
      }).toList();

      final result = await _apiService.markBulkAttendance(
        attendanceData: attendanceData,
      );
      
      if (result != null && mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Attendance marked for ${attendanceData.length} members'),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to mark bulk attendance'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}
