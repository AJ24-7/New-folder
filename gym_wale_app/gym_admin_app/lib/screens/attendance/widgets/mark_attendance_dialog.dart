import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../services/api_service.dart';
import '../../../services/member_service.dart';
import '../../../models/member.dart';
import '../../../config/app_theme.dart';

/// Mark Attendance Dialog
/// Mark attendance for individual members
class MarkAttendanceDialog extends StatefulWidget {
  final DateTime selectedDate;
  final String defaultStatus;

  const MarkAttendanceDialog({
    super.key,
    required this.selectedDate,
    this.defaultStatus = 'present',
  });

  @override
  State<MarkAttendanceDialog> createState() => _MarkAttendanceDialogState();
}

class _MarkAttendanceDialogState extends State<MarkAttendanceDialog> {
  final ApiService _apiService = ApiService();
  final MemberService _memberService = MemberService();
  final _formKey = GlobalKey<FormState>();
  
  List<Member> _members = [];
  String? _selectedMemberId;
  String _status = 'present';
  TimeOfDay? _checkInTime;
  TimeOfDay? _checkOutTime;
  final TextEditingController _notesController = TextEditingController();
  
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _status = widget.defaultStatus;
    _loadMembers();
  }

  Future<void> _loadMembers() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final members = await _memberService.getMembers();
      setState(() {
        _members = members;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: 500,
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
              child: Row(
                children: [
                  const Icon(FontAwesomeIcons.userCheck, color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  const Text(
                    'Mark Attendance',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context, false),
                  ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Member selection
                            const Text(
                              'Select Member',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              initialValue: _selectedMemberId,
                              decoration: InputDecoration(
                                hintText: 'Choose a member',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              ),
                              items: _members.map((member) {
                                return DropdownMenuItem<String>(
                                  value: member.id,
                                  child: Text(member.memberName),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedMemberId = value;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please select a member';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 20),
                            
                            // Status selection
                            const Text(
                              'Status',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 12,
                              children: [
                                _buildStatusChip('present', 'Present', FontAwesomeIcons.circleCheck, Colors.green),
                                _buildStatusChip('absent', 'Absent', FontAwesomeIcons.circleXmark, Colors.red),
                                _buildStatusChip('late', 'Late', FontAwesomeIcons.clock, Colors.orange),
                                _buildStatusChip('leave', 'On Leave', FontAwesomeIcons.umbrellaBeach, Colors.blue),
                              ],
                            ),
                            const SizedBox(height: 20),
                            
                            // Time fields (for present/late status)
                            if (_status == 'present' || _status == 'late') ...[
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Check-in Time',
                                          style: TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                        const SizedBox(height: 8),
                                        InkWell(
                                          onTap: () => _selectTime(true),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                            decoration: BoxDecoration(
                                              border: Border.all(color: Colors.grey[400]!),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(Icons.access_time, size: 20),
                                                const SizedBox(width: 8),
                                                Text(
                                                  _checkInTime != null
                                                      ? _checkInTime!.format(context)
                                                      : 'Select time',
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Check-out Time (Optional)',
                                          style: TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                        const SizedBox(height: 8),
                                        InkWell(
                                          onTap: () => _selectTime(false),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                            decoration: BoxDecoration(
                                              border: Border.all(color: Colors.grey[400]!),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(Icons.access_time, size: 20),
                                                const SizedBox(width: 8),
                                                Text(
                                                  _checkOutTime != null
                                                      ? _checkOutTime!.format(context)
                                                      : 'Select time',
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),
                            ],
                            
                            // Notes
                            const Text(
                              'Notes (Optional)',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _notesController,
                              decoration: InputDecoration(
                                hintText: 'Add any notes...',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                contentPadding: const EdgeInsets.all(16),
                              ),
                              maxLines: 3,
                            ),
                          ],
                        ),
                      ),
                    ),
            ),
            
            // Footer
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _submitAttendance,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Mark Attendance'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String value, String label, IconData icon, Color color) {
    final isSelected = _status == value;
    
    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: isSelected ? Colors.white : color),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
      selectedColor: color,
      checkmarkColor: Colors.white,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : color,
        fontWeight: FontWeight.w600,
      ),
      onSelected: (selected) {
        setState(() {
          _status = value;
        });
      },
    );
  }

  Future<void> _selectTime(bool isCheckIn) async {
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    
    if (time != null) {
      setState(() {
        if (isCheckIn) {
          _checkInTime = time;
        } else {
          _checkOutTime = time;
        }
      });
    }
  }

  Future<void> _submitAttendance() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _isSubmitting = true;
    });
    
    try {
      final success = await _apiService.markAttendance(
        memberId: _selectedMemberId!,
        status: _status,
        checkInTime: _checkInTime?.format(context),
        checkOutTime: _checkOutTime?.format(context),
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
      );
      
      if (success && mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance marked successfully')),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to mark attendance')),
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
