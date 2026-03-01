import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/attendance_record.dart' as attendance_model;
import '../../models/attendance_stats.dart';
import '../../models/attendance_settings.dart';
import '../../widgets/sidebar_menu.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/member_location_status_badge.dart';
import '../support/support_screen.dart';
import '../offers/offers_screen.dart';
import 'widgets/attendance_calendar.dart';
import 'widgets/attendance_list_item.dart';
import 'widgets/mark_attendance_dialog.dart';
import 'widgets/bulk_attendance_dialog.dart';

/// Comprehensive Attendance Management Screen
/// Features: Calendar view, daily list, statistics, rush hour analysis,
/// manual/geofence modes, bulk operations, and settings
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final ApiService _apiService = ApiService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  DateTime _selectedDate = DateTime.now();
  List<attendance_model.AttendanceRecord> _attendanceRecords = [];
  AttendanceStats? _stats;
  AttendanceSettings? _settings;
  Map<String, dynamic>? _rushHourData;
  Map<String, dynamic>? _locationStatusData;
  Map<String, dynamic> _memberLocationStatuses = {};
  
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  int _selectedIndex = 3; // Attendance is index 3 in sidebar
  
  String _filterStatus = 'all'; // all, present, absent, late, leave
  String _searchQuery = '';
  
  @override
  void initState() {
    super.initState();
    _loadAttendanceData();
  }

  Future<void> _loadAttendanceData() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    
    try {
      // Load all data in parallel
      final results = await Future.wait([
        _apiService.getAttendanceByDate(_selectedDate),
        _apiService.getMonthlyAttendanceStats(
          month: _selectedDate.month,
          year: _selectedDate.year,
        ),
        _apiService.getAttendanceSettings(),
        _apiService.getRushHourAnalysis(days: 7),
        _apiService.getMembersLocationStatus(),
      ]);
      
      setState(() {
        _attendanceRecords = results[0] as List<attendance_model.AttendanceRecord>;
        _stats = results[1] as AttendanceStats?;
        _settings = results[2] as AttendanceSettings?;
        _rushHourData = results[3] as Map<String, dynamic>?;
        _locationStatusData = results[4] as Map<String, dynamic>?;
        
        // Parse location status data
        if (_locationStatusData != null && _locationStatusData!['statuses'] != null) {
          for (var status in _locationStatusData!['statuses']) {
            final memberId = status['memberId']?['_id'] ?? status['memberId'];
            if (memberId != null) {
              _memberLocationStatuses[memberId] = status;
            }
          }
        }
        
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _refreshData() async {
    await _loadAttendanceData();
  }

  void _onDateSelected(DateTime date) {
    setState(() {
      _selectedDate = date;
    });
    _loadAttendanceData();
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return;
    
    switch (index) {
      case 0: // Home
        Navigator.pushReplacementNamed(context, '/dashboard');
        break;
      case 1: // Members
        Navigator.pushReplacementNamed(context, '/members');
        break;
      case 2: // Trainers
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trainers screen coming soon')),
        );
        break;
      case 3: // Attendance
        // Already on attendance
        break;
      case 4: // Payments
        Navigator.pushReplacementNamed(context, '/payments');
        break;
      case 5: // Equipment
        Navigator.pushReplacementNamed(context, '/equipment');
        break;
      case 6: // Offers
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const OffersScreen(),
          ),
        );
        break;
      case 7: // Support
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        final gymId = authProvider.currentAdmin?.id ?? '';
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => SupportScreen(gymId: gymId),
          ),
        );
        break;
      case 8: // Settings
        Navigator.pushReplacementNamed(context, '/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isTablet = size.width > 600 && size.width <= 900;
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: isDark ? AppTheme.darkBackgroundColor : AppTheme.backgroundColor,
      body: Row(
        children: [
          if (isDesktop)
            SidebarMenu(
              selectedIndex: _selectedIndex,
              onItemSelected: _onMenuItemSelected,
            ),
          Expanded(
            child: Column(
              children: [
                _buildTopNavBar(context, l10n, isDesktop, isTablet),
                Expanded(
                  child: _buildAttendanceContent(context, l10n, isDesktop),
                ),
              ],
            ),
          ),
        ],
      ),
      drawer: !isDesktop
          ? Drawer(
              child: SidebarMenu(
                selectedIndex: _selectedIndex,
                onItemSelected: (index) {
                  Navigator.pop(context);
                  _onMenuItemSelected(index);
                },
              ),
            )
          : null,
    );
  }

  Widget _buildTopNavBar(
    BuildContext context,
    AppLocalizations l10n,
    bool isDesktop,
    bool isTablet,
  ) {
    final topPadding = MediaQuery.of(context).padding.top;
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return Container(
      padding: EdgeInsets.only(
        top: isDesktop ? 24 : (topPadding > 0 ? topPadding + 8 : 16),
        bottom: isDesktop ? 24 : 16,
        left: isDesktop ? 24 : 12,
        right: isDesktop ? 24 : 12,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          if (!isDesktop)
            IconButton(
              icon: const FaIcon(FontAwesomeIcons.bars, size: 24),
              onPressed: () => _scaffoldKey.currentState?.openDrawer(),
              padding: const EdgeInsets.all(8),
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            ),
          Expanded(
            child: Row(
              children: [
                Icon(
                  FontAwesomeIcons.clipboardCheck,
                  color: AppTheme.primaryColor,
                  size: isMobile ? 20 : 24,
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    'Attendance Management',
                    style: TextStyle(
                      fontSize: isMobile ? 18 : 24,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Settings button - responsive
          IconButton(
            icon: Badge(
              label: Text(_settings?.mode.toString().split('.').last.toUpperCase() ?? 'MANUAL'),
              backgroundColor: _getModeBadgeColor(),
              textColor: Colors.white,
              child: Icon(Icons.settings, size: isMobile ? 20 : 24),
            ),
            onPressed: () {
              // Navigate to settings screen with attendance section
              Navigator.pushNamed(
                context,
                '/settings',
                arguments: {'scrollTo': 'attendance'},
              );
            },
            tooltip: 'Attendance Settings',
          ),
        ],
      ),
    );
  }

  Color _getModeBadgeColor() {
    if (_settings == null) return Colors.grey;
    switch (_settings!.mode) {
      case AttendanceMode.geofence:
        return Colors.green;
      case AttendanceMode.manual:
        return Colors.blue;
      case AttendanceMode.biometric:
        return Colors.purple;
      case AttendanceMode.qr:
        return Colors.orange;
      case AttendanceMode.hybrid:
        return Colors.teal;
    }
  }

  Widget _buildAttendanceContent(BuildContext context, AppLocalizations l10n, bool isDesktop) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: $_errorMessage'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadAttendanceData,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: EdgeInsets.all(isDesktop ? 24 : 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Statistics Cards
            _buildStatsCards(l10n, isDesktop),
            const SizedBox(height: 24),
            
            // Quick Actions & Calendar Row
            _buildQuickActionsAndCalendar(l10n, isDesktop),
            const SizedBox(height: 24),

            // ── Auto-Marked Members Section ─────────────────────────────────
            _buildAutoMarkedSection(isDesktop),
            const SizedBox(height: 16),

            // ── Location Services Off Section ───────────────────────────────
            _buildLocationOffSection(isDesktop),
            const SizedBox(height: 16),
            
            // Rush Hour Analysis (if available)
            if (_rushHourData != null) ...[
              _buildRushHourAnalysis(l10n, isDesktop),
              const SizedBox(height: 24),
            ],
            
            // Attendance List with Filters
            _buildAttendanceList(l10n, isDesktop),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCards(AppLocalizations l10n, bool isDesktop) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return GridView.count(
      crossAxisCount: isDesktop ? 4 : (isMobile ? 2 : 3),
      crossAxisSpacing: isMobile ? 8 : 16,
      mainAxisSpacing: isMobile ? 8 : 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: isDesktop ? 1.8 : (isMobile ? 1.6 : 1.5),
      children: [
        StatCard(
          title: 'Total Members',
          value: _stats?.totalMembers.toString() ?? '0',
          icon: FontAwesomeIcons.users,
          color: Colors.blue,
          trend: null,
        ),
        StatCard(
          title: 'Present Today',
          value: _stats?.presentToday.toString() ?? '0',
          icon: FontAwesomeIcons.userCheck,
          color: Colors.green,
          trend: _stats?.attendanceRateToday,
        ),
        StatCard(
          title: 'Absent Today',
          value: _stats?.absentToday.toString() ?? '0',
          icon: FontAwesomeIcons.userXmark,
          color: Colors.red,
          trend: null,
        ),
        StatCard(
          title: 'Attendance Rate',
          value: _stats != null
              ? '${_stats!.monthlyAttendanceRate.toStringAsFixed(1)}%'
              : '0%',
          icon: FontAwesomeIcons.chartLine,
          color: Colors.purple,
          trend: _stats?.monthlyAttendanceRate,
        ),
      ],
    );
  }

  Widget _buildQuickActionsAndCalendar(AppLocalizations l10n, bool isDesktop) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Quick Actions
        Expanded(
          flex: isDesktop ? 2 : 1,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(FontAwesomeIcons.boltLightning, size: 20, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      const Text(
                        'Quick Actions',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _buildQuickActionButton(
                        icon: FontAwesomeIcons.userCheck,
                        label: 'Mark Present',
                        color: Colors.green,
                        onTap: () => _showMarkAttendanceDialog('present'),
                      ),
                      _buildQuickActionButton(
                        icon: FontAwesomeIcons.users,
                        label: 'Bulk Mark',
                        color: Colors.blue,
                        onTap: _showBulkAttendanceDialog,
                      ),
                      _buildQuickActionButton(
                        icon: FontAwesomeIcons.mapLocationDot,
                        label: 'Geofence Setup',
                        color: Colors.teal,
                        onTap: () => Navigator.pushNamed(context, '/geofence-setup'),
                      ),
                      _buildQuickActionButton(
                        icon: FontAwesomeIcons.clockRotateLeft,
                        label: 'History',
                        color: Colors.orange,
                        onTap: _showAttendanceHistory,
                      ),
                      _buildQuickActionButton(
                        icon: FontAwesomeIcons.chartBar,
                        label: 'Reports',
                        color: Colors.purple,
                        onTap: _showAttendanceReports,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        if (isDesktop) const SizedBox(width: 16),
        
        // Calendar
        if (isDesktop)
          Expanded(
            flex: 1,
            child: AttendanceCalendar(
              selectedDate: _selectedDate,
              onDateSelected: _onDateSelected,
              attendanceData: {}, // TODO: Add monthly attendance data
            ),
          ),
      ],
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Auto-Marked Members ─────────────────────────────────────────────────────

  /// Members whose attendance was recorded automatically via geofence today.
  Widget _buildAutoMarkedSection(bool isDesktop) {
    final autoMarked = _attendanceRecords
        .where((r) =>
            r.status == 'present' &&
            (r.attendanceType == 'geofence' ||
                (r.geofenceEntry != null)))
        .toList();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: autoMarked.isNotEmpty,
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(FontAwesomeIcons.locationDot,
                color: Colors.green, size: 18),
          ),
          title: Text(
            'Auto-Marked via Geofence',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          subtitle: Text(
            autoMarked.isEmpty
                ? 'No auto-marked attendance yet today'
                : '${autoMarked.length} member${autoMarked.length == 1 ? "" : "s"} auto-checked in today',
            style: TextStyle(
              fontSize: 13,
              color: autoMarked.isEmpty ? Colors.grey : Colors.green.shade700,
            ),
          ),
          children: [
            if (autoMarked.isEmpty)
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Row(
                  children: [
                    Icon(Icons.info_outline,
                        color: Colors.grey.shade400, size: 18),
                    const SizedBox(width: 10),
                    Text(
                      'Members will appear here once geofence-based\nauto-attendance is recorded.',
                      style: TextStyle(
                          color: Colors.grey.shade500, fontSize: 13),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: autoMarked.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1),
                itemBuilder: (context, i) {
                  final r = autoMarked[i];
                  final checkIn = r.checkInTime ?? '--:--';
                  final dur = r.durationInMinutes ?? 0;
                  final checkedOut = r.checkOutTime != null;
                  return ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    leading: CircleAvatar(
                      backgroundColor:
                          Colors.green.withValues(alpha: 0.15),
                      backgroundImage: r.memberPhoto != null &&
                              r.memberPhoto!.isNotEmpty
                          ? NetworkImage(r.memberPhoto!)
                          : null,
                      child: r.memberPhoto == null || r.memberPhoto!.isEmpty
                          ? Text(
                              r.memberName.isNotEmpty
                                  ? r.memberName[0].toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                  color: Colors.green,
                                  fontWeight: FontWeight.bold),
                            )
                          : null,
                    ),
                    title: Text(r.memberName,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Row(
                      children: [
                        const Icon(Icons.login,
                            size: 12, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(checkIn,
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey)),
                        if (dur > 0) ...[
                          const SizedBox(width: 10),
                          const Icon(Icons.timer_outlined,
                              size: 12, color: Colors.grey),
                          const SizedBox(width: 3),
                          Text(_fmtDur(dur),
                              style: const TextStyle(
                                  fontSize: 12, color: Colors.grey)),
                        ],
                      ],
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: checkedOut
                            ? Colors.blue.withValues(alpha: 0.1)
                            : Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: checkedOut
                              ? Colors.blue.withValues(alpha: 0.4)
                              : Colors.green.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Text(
                        checkedOut ? 'Checked Out' : '✓ Present',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: checkedOut ? Colors.blue : Colors.green,
                        ),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  String _fmtDur(int minutes) {
    if (minutes < 60) return '${minutes}m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m > 0 ? '${h}h ${m}m' : '${h}h';
  }

  // ── Location Services Off ────────────────────────────────────────────────────

  /// Members whose location services or permissions are turned off.
  /// We only report the flag — we do NOT track or display the user's
  /// current coordinates.
  Widget _buildLocationOffSection(bool isDesktop) {
    // Only relevant in geofence / hybrid mode
    final isGeofenceMode = _settings?.mode == AttendanceMode.geofence ||
        _settings?.mode == AttendanceMode.hybrid;

    if (!isGeofenceMode || _memberLocationStatuses.isEmpty) {
      return const SizedBox.shrink();
    }

    final locationOffMembers = _memberLocationStatuses.values
        .map((s) => MemberLocationStatus.fromJson(s as Map<String, dynamic>))
        .where((s) => !s.locationEnabled || s.locationPermission != 'granted')
        .toList()
      ..sort((a, b) =>
          a.memberName.compareTo(b.memberName));

    if (locationOffMembers.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: true,
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(FontAwesomeIcons.locationArrow,
                color: Colors.orange, size: 18),
          ),
          title: const Text(
            'Location Services Off',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          subtitle: Text(
            '${locationOffMembers.length} member${locationOffMembers.length == 1 ? "" : "s"} '
            'with location off — auto-attendance unavailable',
            style:
                const TextStyle(fontSize: 13, color: Colors.orange),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
              child: Row(
                children: [
                  const Icon(Icons.info_outline,
                      size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'These members have location services disabled. '
                      'Geofence auto-attendance will not work for them.',
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ),
                ],
              ),
            ),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: locationOffMembers.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final s = locationOffMembers[i];
                final label = !s.locationEnabled
                    ? 'Location Off'
                    : 'Permission Denied';
                final color = !s.locationEnabled
                    ? Colors.red
                    : Colors.orange;
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  leading: CircleAvatar(
                    backgroundColor: color.withValues(alpha: 0.12),
                    child: Icon(Icons.location_off,
                        color: color, size: 18),
                  ),
                  title: Text(
                    s.memberName.isNotEmpty ? s.memberName : s.memberId,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: color.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRushHourAnalysis(AppLocalizations l10n, bool isDesktop) {
    final hourlyData = _rushHourData?['hourlyData'] as Map<String, dynamic>? ?? {};
    if (hourlyData.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(FontAwesomeIcons.chartColumn, size: 20, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                const Text(
                  'Rush Hour Analysis',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Text(
                  'Last 7 Days',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: (_rushHourData?['peakHour']?['totalVisits'] is int 
                      ? (_rushHourData?['peakHour']?['totalVisits'] as int).toDouble() 
                      : _rushHourData?['peakHour']?['totalVisits'] as double?) ?? 100.0,
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final hour = value.toInt();
                          if (hourlyData.containsKey(hour.toString())) {
                            final data = hourlyData[hour.toString()];
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                data['formattedHour'] ?? '',
                                style: const TextStyle(fontSize: 10),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            value.toInt().toString(),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: hourlyData.entries.map((entry) {
                    final hour = int.tryParse(entry.key) ?? 0;
                    final data = entry.value as Map<String, dynamic>;
                    final visits = (data['totalVisits'] ?? 0).toDouble();
                    final level = data['rushLevel'] ?? 'low';
                    
                    Color barColor;
                    switch (level) {
                      case 'peak':
                        barColor = Colors.red;
                        break;
                      case 'high':
                        barColor = Colors.orange;
                        break;
                      case 'medium':
                        barColor = Colors.amber;
                        break;
                      default:
                        barColor = Colors.green;
                    }
                    
                    return BarChartGroupData(
                      x: hour,
                      barRods: [
                        BarChartRodData(
                          toY: visits,
                          color: barColor,
                          width: 16,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceList(AppLocalizations l10n, bool isDesktop) {
    final filteredRecords = _attendanceRecords.where((record) {
      // Filter by status
      if (_filterStatus != 'all' && record.status != _filterStatus) {
        return false;
      }
      
      // Filter by search query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return record.memberName.toLowerCase().contains(query);
      }
      
      return true;
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with filters
            Row(
              children: [
                const Icon(FontAwesomeIcons.listCheck, size: 20, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Attendance - ${DateFormat('MMMM d, yyyy').format(_selectedDate)}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Spacer(),
                // Date navigation
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    _onDateSelected(_selectedDate.subtract(const Duration(days: 1)));
                  },
                  tooltip: 'Previous Day',
                ),
                TextButton.icon(
                  onPressed: () {
                    _onDateSelected(DateTime.now());
                  },
                  icon: const Icon(Icons.today),
                  label: const Text('Today'),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    final tomorrow = _selectedDate.add(const Duration(days: 1));
                    if (tomorrow.isBefore(DateTime.now().add(const Duration(days: 1)))) {
                      _onDateSelected(tomorrow);
                    }
                  },
                  tooltip: 'Next Day',
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Search and filter row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search members...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _filterStatus,
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All')),
                    DropdownMenuItem(value: 'present', child: Text('Present')),
                    DropdownMenuItem(value: 'absent', child: Text('Absent')),
                    DropdownMenuItem(value: 'late', child: Text('Late')),
                    DropdownMenuItem(value: 'leave', child: Text('On Leave')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _filterStatus = value;
                      });
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Attendance list
            if (filteredRecords.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(
                        FontAwesomeIcons.calendarXmark,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No attendance records found',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredRecords.length,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final record = filteredRecords[index];
                  final locationStatus = _memberLocationStatuses[record.memberId];
                  final isGeofenceMode = _settings?.mode == AttendanceMode.geofence || 
                                        _settings?.mode == AttendanceMode.hybrid;
                  
                  return AttendanceListItem(
                    record: record,
                    onEdit: () => _editAttendance(record),
                    onDelete: () => _deleteAttendance(record),
                    locationStatus: locationStatus != null
                        ? MemberLocationStatus.fromJson(locationStatus)
                        : null,
                    showLocationBadge: isGeofenceMode,
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // Action methods
  void _showMarkAttendanceDialog(String defaultStatus) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => MarkAttendanceDialog(
        selectedDate: _selectedDate,
        defaultStatus: defaultStatus,
      ),
    );
    
    if (result == true) {
      _refreshData();
    }
  }

  void _showBulkAttendanceDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => BulkAttendanceDialog(
        selectedDate: _selectedDate,
      ),
    );
    
    if (result == true) {
      _refreshData();
    }
  }

  void _showAttendanceHistory() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Attendance history feature coming soon')),
    );
  }

  void _showAttendanceReports() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Attendance reports feature coming soon')),
    );
  }

  void _editAttendance(attendance_model.AttendanceRecord record) async {
    // TODO: Implement edit attendance dialog
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Edit attendance for ${record.memberName}')),
    );
  }

  void _deleteAttendance(attendance_model.AttendanceRecord record) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Attendance'),
        content: Text('Are you sure you want to delete attendance for ${record.memberName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _apiService.deleteAttendance(record.id);
      if (success && mounted) {
        _refreshData();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance deleted successfully')),
        );
      }
    }
  }
}
