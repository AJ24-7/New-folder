import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config/app_theme.dart';
import '../providers/attendance_provider.dart';

/// ─────────────────────────────────────────────────────────────────────────────
/// AttendanceHistoryScreen
///
/// Full-page attendance history + monthly stats for one gym membership.
/// Reached from the "View Attendance History" button in AttendanceWidget.
/// ─────────────────────────────────────────────────────────────────────────────
class AttendanceHistoryScreen extends StatefulWidget {
  final String gymId;
  final String gymName;

  const AttendanceHistoryScreen({
    Key? key,
    required this.gymId,
    required this.gymName,
  }) : super(key: key);

  @override
  State<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  DateTime _selectedMonth = DateTime.now();
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isRefreshing = true);
    final provider = context.read<AttendanceProvider>();
    // Load settings if not already available (needed for off-day highlighting)
    if (provider.attendanceSettings == null) {
      provider.loadAttendanceSettings(widget.gymId);
    }
    await Future.wait([
      provider.fetchAttendanceHistory(widget.gymId, limit: 60),
      provider.fetchAttendanceStats(
        widget.gymId,
        month: _selectedMonth.month,
        year: _selectedMonth.year,
      ),
    ]);
    if (mounted) setState(() => _isRefreshing = false);
  }

  Future<void> _changeMonth(int delta) async {
    setState(() {
      _selectedMonth = DateTime(
        _selectedMonth.year,
        _selectedMonth.month + delta,
      );
    });
    await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Attendance History',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(widget.gymName,
                style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.85))),
          ],
        ),
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(gradient: AppTheme.primaryGradient),
        ),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.calendar_month), text: 'Monthly Stats'),
            Tab(icon: Icon(Icons.history), text: 'All History'),
          ],
        ),
        actions: [
          IconButton(
            icon: _isRefreshing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _loadData,
          ),
        ],
      ),
      body: Consumer<AttendanceProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && !_isRefreshing) {
            return const Center(child: CircularProgressIndicator());
          }
          return TabBarView(
            controller: _tabs,
            children: [
              _buildMonthlyStats(provider, isDark),
              _buildHistoryList(provider, isDark),
            ],
          );
        },
      ),
    );
  }

  // ── Monthly Stats Tab ────────────────────────────────────────────────────────
  Widget _buildMonthlyStats(AttendanceProvider provider, bool isDark) {
    final stats = provider.attendanceStats ?? {};

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Month navigation
            _buildMonthNavigator(),
            const SizedBox(height: 20),

            // Key stats cards
            Row(
              children: [
                Expanded(
                  child: _statCard(
                    '${stats['presentDays'] ?? 0}',
                    'Days Present',
                    Icons.check_circle,
                    AppTheme.successColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCard(
                    '${((stats['attendanceRate'] as double? ?? 0.0) * 100).toStringAsFixed(0)}%',
                    'Attendance Rate',
                    Icons.trending_up,
                    AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _statCard(
                    _formatDuration(stats['avgDuration'] as int? ?? 0),
                    'Avg Duration',
                    Icons.timer,
                    Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _statCard(
                    '${stats['geofenceDays'] ?? 0}',
                    'Auto-Marked Days',
                    Icons.location_on,
                    Colors.blue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Progress bar
            Text(
              'Monthly Progress',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildProgressBar(stats, isDark),
            const SizedBox(height: 24),

            // Calendar heat-map for this month
            Text(
              'Attendance Calendar',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildCalendarGrid(provider, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthNavigator() {
    final monthLabel = DateFormat('MMMM yyyy').format(_selectedMonth);
    final now = DateTime.now();
    final isCurrentMonth = _selectedMonth.year == now.year &&
        _selectedMonth.month == now.month;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _changeMonth(-1),
            color: AppTheme.primaryColor,
          ),
          Column(
            children: [
              Text(
                monthLabel,
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold),
              ),
              if (isCurrentMonth)
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text('Current Month',
                      style:
                          TextStyle(color: Colors.white, fontSize: 10)),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: isCurrentMonth ? null : () => _changeMonth(1),
            color: isCurrentMonth ? Colors.grey : AppTheme.primaryColor,
          ),
        ],
      ),
    );
  }

  Widget _statCard(String value, String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: color)),
          const SizedBox(height: 4),
          Text(label,
              style:
                  const TextStyle(color: Colors.grey, fontSize: 11),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildProgressBar(Map stats, bool isDark) {
    final present = (stats['presentDays'] as int? ?? 0);
    final total = (stats['totalDays'] as int? ?? 30);
    final progress = total > 0 ? present / total : 0.0;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('$present / $total days',
                style: const TextStyle(fontWeight: FontWeight.w600)),
            Text('${(progress * 100).toStringAsFixed(0)}%',
                style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            minHeight: 12,
            backgroundColor: isDark
                ? const Color(0xFF2C2C2C)
                : Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
          ),
        ),
      ],
    );
  }

  Widget _buildCalendarGrid(AttendanceProvider provider, bool isDark) {
    final history = provider.attendanceHistory;
    final settings = provider.attendanceSettings;
    final presentDates = history
        .where((a) => a['status'] == 'present')
        .map((a) {
          try {
            return DateFormat('yyyy-MM-dd')
                .format(DateTime.parse(a['date'] as String));
          } catch (_) {
            return '';
          }
        })
        .toSet();

    // Active days for off-day highlighting
    final activeDays =
        settings?.geofenceSettings?.activeDays ?? settings?.activeDays ?? [];

    final firstDay = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
    final daysInMonth =
        DateTime(_selectedMonth.year, _selectedMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday % 7; // Sunday = 0

    const dayNames = [
      'sunday','monday','tuesday','wednesday','thursday','friday','saturday'
    ];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        children: [
          // Day headers
          Row(
            children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                .map((d) => Expanded(
                      child: Center(
                        child: Text(d,
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey.shade500)),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 8),
          // Day cells
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1,
              mainAxisSpacing: 4,
              crossAxisSpacing: 4,
            ),
            itemCount: startWeekday + daysInMonth,
            itemBuilder: (context, index) {
              if (index < startWeekday) return const SizedBox();
              final day = index - startWeekday + 1;
              final dateObj = DateTime(
                  _selectedMonth.year, _selectedMonth.month, day);
              final dateStr = DateFormat('yyyy-MM-dd').format(dateObj);

              final isPresent = presentDates.contains(dateStr);
              final isToday = dateStr ==
                  DateFormat('yyyy-MM-dd').format(DateTime.now());
              final isFuture = dateObj.isAfter(DateTime.now());

              // Determine if this day is an "off day" for the gym
              // dayNames[0]=sunday, matches startWeekday=0 logic from firstDay.weekday%7
              final weekdayIdx = dateObj.weekday % 7; // 0=Sun,1=Mon,...6=Sat
              final dayName = dayNames[weekdayIdx];
              final isOffDay = activeDays.isNotEmpty &&
                  !activeDays.map((d) => d.toLowerCase()).contains(dayName);

              Color bgColor;
              Color textColor;
              BoxBorder? border;

              if (isPresent) {
                bgColor = AppTheme.successColor;
                textColor = Colors.white;
              } else if (isOffDay && !isFuture) {
                bgColor = (isDark ? Colors.grey.shade800 : Colors.grey.shade200);
                textColor = Colors.grey.shade500;
              } else if (isToday && !isPresent) {
                bgColor = AppTheme.primaryColor.withValues(alpha: 0.15);
                textColor = Theme.of(context).textTheme.bodyMedium?.color ??
                    Colors.black;
                border = Border.all(color: AppTheme.primaryColor, width: 1.5);
              } else {
                bgColor = Colors.transparent;
                textColor = isFuture
                    ? (isDark
                        ? Colors.grey.shade600
                        : Colors.grey.shade300)
                    : Theme.of(context).textTheme.bodyMedium?.color ??
                        Colors.black;
              }

              return Tooltip(
                message: isOffDay && !isFuture ? 'Off day' : '',
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: bgColor,
                    border: border,
                  ),
                  child: Center(
                    child: isOffDay && !isFuture && !isPresent
                        ? Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '$day',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: textColor,
                                ),
                              ),
                              Container(
                                width: 4,
                                height: 4,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.grey.shade400,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            '$day',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: textColor,
                            ),
                          ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          // Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _legendDot(AppTheme.successColor, 'Present'),
              const SizedBox(width: 12),
              _legendDot(Colors.grey.shade300, 'Absent'),
              const SizedBox(width: 12),
              _legendDot(Colors.grey.shade400, 'Off day'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }

  // ── History List Tab ─────────────────────────────────────────────────────────
  Widget _buildHistoryList(AttendanceProvider provider, bool isDark) {
    final history = provider.attendanceHistory;

    if (history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today_outlined,
                size: 72,
                color: Colors.grey.withValues(alpha: 0.4)),
            const SizedBox(height: 20),
            const Text('No attendance records yet',
                style:
                    TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text(
              'Your attendance will appear here once\nyou visit the gym.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: history.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) =>
            _buildHistoryCard(history[index], isDark),
      ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> record, bool isDark) {
    DateTime? date;
    try {
      date = DateTime.parse(record['date'] as String);
    } catch (_) {}

    final checkIn = record['checkInTime'] as String?;
    final checkOut = record['checkOutTime'] as String?;
    final status = record['status'] as String? ?? 'present';
    final isGeofence = record['isGeofenceAttendance'] == true;
    final authMethod = record['authenticationMethod'] as String? ?? '';
    final exitInfo = record['geofenceExit'] as Map?;
    final duration = exitInfo?['durationInside'] as int? ?? 0;

    final isPresent = status == 'present';
    final statusColor = isPresent ? AppTheme.successColor : Colors.red;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0xFF3C3C3C) : AppTheme.borderColor,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Date badge
          Container(
            width: 52,
            height: 64,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  date != null ? DateFormat('dd').format(date) : '--',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: statusColor),
                ),
                Text(
                  date != null ? DateFormat('MMM').format(date) : '--',
                  style:
                      TextStyle(fontSize: 11, color: statusColor),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      date != null
                          ? DateFormat('EEEE').format(date)
                          : 'Unknown',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const Spacer(),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: statusColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        status[0].toUpperCase() + status.substring(1),
                        style: TextStyle(
                            fontSize: 11,
                            color: statusColor,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if (checkIn != null) ...[
                      const Icon(Icons.login, size: 13, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(checkIn,
                          style: const TextStyle(
                              fontSize: 12, color: Colors.grey)),
                    ],
                    if (checkIn != null && checkOut != null)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(Icons.arrow_forward,
                            size: 12, color: Colors.grey),
                      ),
                    if (checkOut != null) ...[
                      const Icon(Icons.logout, size: 13, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(checkOut,
                          style: const TextStyle(
                              fontSize: 12, color: Colors.grey)),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (duration > 0) ...[
                      const Icon(Icons.timer_outlined,
                          size: 13, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(_formatDuration(duration),
                          style: const TextStyle(
                              fontSize: 12, color: Colors.grey)),
                      const SizedBox(width: 10),
                    ],
                    if (isGeofence) ...[
                      const Icon(Icons.location_on,
                          size: 13, color: Colors.blue),
                      const SizedBox(width: 3),
                      Text(
                        authMethod == 'geofence'
                            ? 'Auto (Geofence)'
                            : 'Location',
                        style: const TextStyle(
                            fontSize: 11, color: Colors.blue),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDuration(int minutes) {
    if (minutes <= 0) return '';
    if (minutes < 60) return '$minutes min';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m > 0 ? '${h}h ${m}min' : '${h}h';
  }
}
