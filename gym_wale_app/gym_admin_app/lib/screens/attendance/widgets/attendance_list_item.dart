import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../../models/attendance_record.dart';

/// Attendance List Item Widget
/// Displays individual attendance record with actions
class AttendanceListItem extends StatelessWidget {
  final AttendanceRecord record;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const AttendanceListItem({
    super.key,
    required this.record,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: CircleAvatar(
        radius: 24,
        backgroundImage: record.memberPhoto != null
            ? NetworkImage(record.memberPhoto!)
            : null,
        backgroundColor: _getStatusColor(record.status).withValues(alpha: 0.2),
        child: record.memberPhoto == null
            ? Text(
                record.memberName.substring(0, 1).toUpperCase(),
                style: TextStyle(
                  color: _getStatusColor(record.status),
                  fontWeight: FontWeight.bold,
                ),
              )
            : null,
      ),
      title: Text(
        record.memberName,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                _getStatusIcon(record.status),
                size: 14,
                color: _getStatusColor(record.status),
              ),
              const SizedBox(width: 4),
              Text(
                _getStatusText(record.status),
                style: TextStyle(
                  color: _getStatusColor(record.status),
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                ),
              ),
              if (record.checkInTime != null) ...[
                const SizedBox(width: 12),
                Icon(Icons.login, size: 14, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  record.checkInTime!,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
              if (record.checkOutTime != null) ...[
                const SizedBox(width: 12),
                Icon(Icons.logout, size: 14, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  record.checkOutTime!,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ],
          ),
          if (record.attendanceType != null) ...[
            const SizedBox(height: 4),
            _buildAttendanceTypeBadge(record.attendanceType!),
          ],
          if (record.notes != null && record.notes!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              record.notes!,
              style: TextStyle(fontSize: 12, color: Colors.grey[600], fontStyle: FontStyle.italic),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
      trailing: PopupMenuButton<String>(
        itemBuilder: (context) => [
          const PopupMenuItem(
            value: 'edit',
            child: Row(
              children: [
                Icon(Icons.edit, size: 18),
                SizedBox(width: 8),
                Text('Edit'),
              ],
            ),
          ),
          const PopupMenuItem(
            value: 'delete',
            child: Row(
              children: [
                Icon(Icons.delete, size: 18, color: Colors.red),
                SizedBox(width: 8),
                Text('Delete', style: TextStyle(color: Colors.red)),
              ],
            ),
          ),
        ],
        onSelected: (value) {
          if (value == 'edit') {
            onEdit();
          } else if (value == 'delete') {
            onDelete();
          }
        },
      ),
    );
  }

  Widget _buildAttendanceTypeBadge(String type) {
    IconData icon;
    Color color;
    
    switch (type.toLowerCase()) {
      case 'geofence':
        icon = FontAwesomeIcons.locationDot;
        color = Colors.green;
        break;
      case 'biometric':
        icon = FontAwesomeIcons.fingerprint;
        color = Colors.purple;
        break;
      case 'qr':
        icon = FontAwesomeIcons.qrcode;
        color = Colors.orange;
        break;
      default:
        icon = FontAwesomeIcons.handPointer;
        color = Colors.blue;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 4),
          Text(
            type.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
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

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return FontAwesomeIcons.circleCheck;
      case 'absent':
        return FontAwesomeIcons.circleXmark;
      case 'late':
        return FontAwesomeIcons.clock;
      case 'leave':
        return FontAwesomeIcons.umbrellaBeach;
      default:
        return FontAwesomeIcons.circle;
    }
  }

  String _getStatusText(String status) {
    return status.substring(0, 1).toUpperCase() + status.substring(1);
  }
}
