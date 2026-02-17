import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../models/payment.dart';
import '../../services/payment_service.dart';
import '../../widgets/sidebar_menu.dart';

/// Payment Management Screen for Gym Admin App
/// Features: Payment stats, chart, recent payments, pending payments, recurring payments
class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  final PaymentService _paymentService = PaymentService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final _currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
  
  PaymentStats? _stats;
  PaymentChartData? _chartData;
  List<Payment> _recentPayments = [];
  List<Payment> _pendingPayments = [];
  List<Payment> _recurringPayments = [];
  
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  int _selectedIndex = 2; // Payments tab index
  
  // Chart filters
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  
  // Recurring payments filter
  String _recurringFilter = 'all'; // 'all', 'monthly-recurring', 'pending', 'overdue', 'completed'

  @override
  void initState() {
    super.initState();
    _loadPaymentData();
  }

  Future<void> _loadPaymentData() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final stats = await _paymentService.getPaymentStats();
      final chartData = await _paymentService.getPaymentChartData(
        month: _selectedMonth,
        year: _selectedYear,
      );
      final recentPayments = await _paymentService.getRecentPayments(limit: 10);
      final pendingPayments = await _paymentService.getPendingPayments();
      final recurringPayments = await _paymentService.getRecurringPayments(
        filter: _recurringFilter,
      );

      setState(() {
        _stats = stats;
        _chartData = chartData;
        _recentPayments = recentPayments;
        _pendingPayments = pendingPayments;
        _recurringPayments = recurringPayments;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshData() async {
    await _loadPaymentData();
  }

  void _showAddPaymentDialog() {
    showDialog(
      context: context,
      builder: (context) => _AddPaymentDialog(
        onPaymentAdded: () {
          _refreshData();
          Navigator.pop(context);
        },
      ),
    );
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return;
    
    // Navigate to different screens based on index
    switch (index) {
      case 0: // Dashboard
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
        Navigator.pushReplacementNamed(context, '/attendance');
        break;
      case 4: // Payments
        // Already on payments screen, do nothing
        break;
      case 5: // Equipment
        Navigator.pushReplacementNamed(context, '/equipment');
        break;
      case 6: // Offers
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offers screen coming soon')),
        );
        break;
      case 7: // Support & Reviews
        Navigator.pushReplacementNamed(context, '/support', arguments: {'gymId': ''});
        break;
      case 8: // Settings
        Navigator.pushReplacementNamed(context, '/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: isDark ? AppTheme.darkBackgroundColor : AppTheme.backgroundColor,
      body: Row(
        children: [
          // Sidebar
          SidebarMenu(
            selectedIndex: _selectedIndex,
            onItemSelected: _onMenuItemSelected,
          ),
          
          // Main Content
          Expanded(
            child: Column(
              children: [
                // App Bar
                _buildAppBar(context, l10n),
                
                // Content
                Expanded(
                  child: _isLoading
                      ? _buildLoadingState()
                      : _hasError
                          ? _buildErrorState()
                          : _buildPaymentContent(context, l10n, isDark),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, AppLocalizations l10n) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
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
          IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          const SizedBox(width: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const FaIcon(
                  FontAwesomeIcons.creditCard,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                l10n.payments,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const Spacer(),
          ElevatedButton.icon(
            onPressed: _showAddPaymentDialog,
            icon: const FaIcon(FontAwesomeIcons.plus, size: 16),
            label: Text(l10n.addPayment),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const FaIcon(
            FontAwesomeIcons.triangleExclamation,
            size: 64,
            color: AppTheme.errorColor,
          ),
          const SizedBox(height: 16),
          Text(
            'Error Loading Payments',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _refreshData,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentContent(BuildContext context, AppLocalizations l10n, bool isDark) {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Payment Statistics Cards
            _buildStatsGrid(l10n),
            const SizedBox(height: 24),
            
            // Payment Chart
            _buildPaymentChart(l10n, isDark),
            const SizedBox(height: 24),
            
            // Payment Content Grid
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Dues Section
                Expanded(
                  flex: 2,
                  child: _buildRecurringPaymentsSection(l10n, isDark),
                ),
                const SizedBox(width: 16),
                
                // Right Column
                Expanded(
                  child: Column(
                    children: [
                      // Pending Payments Section
                      _buildPendingPaymentsSection(l10n, isDark),
                      const SizedBox(height: 16),
                      
                      // Recent Payments Section
                      _buildRecentPaymentsSection(l10n, isDark),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid(AppLocalizations l10n) {
    if (_stats == null) return const SizedBox.shrink();

    return GridView.count(
      crossAxisCount: 5,
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.8,
      children: [
        _buildStatCard(
          title: l10n.amountReceived,
          value: _currencyFormat.format(_stats!.amountReceived),
          icon: FontAwesomeIcons.arrowDown,
          color: AppTheme.successColor,
          change: _stats!.receivedChange,
          isPositive: _stats!.receivedChange >= 0,
          onTap: () => _showReceivedPaymentsDetails(),
        ),
        _buildStatCard(
          title: l10n.amountPaid,
          value: _currencyFormat.format(_stats!.amountPaid),
          icon: FontAwesomeIcons.arrowUp,
          color: AppTheme.errorColor,
          change: _stats!.paidChange,
          isPositive: false,
          onTap: () => _showPaidPaymentsDetails(),
        ),
        _buildStatCard(
          title: l10n.pendingPayments,
          value: _currencyFormat.format(_stats!.pendingPayments),
          icon: FontAwesomeIcons.clock,
          color: AppTheme.warningColor,
          onTap: () => _showPendingPaymentsDetails(),
        ),
        _buildStatCard(
          title: l10n.duePayments,
          value: _currencyFormat.format(_stats!.duePayments),
          icon: FontAwesomeIcons.calendarXmark,
          color: Colors.orange,
          change: _stats!.dueChange,
          isPositive: false,
          onTap: () => _showDuePaymentsDetails(),
        ),
        _buildStatCard(
          title: l10n.profitLoss,
          value: _currencyFormat.format(_stats!.profitLoss),
          icon: FontAwesomeIcons.chartLine,
          color: _stats!.profitLoss >= 0 ? AppTheme.successColor : AppTheme.errorColor,
          change: _stats!.profitChange,
          isPositive: _stats!.profitChange >= 0,
          onTap: () => _showProfitLossDetails(),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    double? change,
    bool isPositive = true,
    VoidCallback? onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: FaIcon(
                      icon,
                      size: 16,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              if (change != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    FaIcon(
                      isPositive ? FontAwesomeIcons.arrowUp : FontAwesomeIcons.arrowDown,
                      size: 10,
                      color: isPositive ? AppTheme.successColor : AppTheme.errorColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${change.abs().toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontSize: 12,
                        color: isPositive ? AppTheme.successColor : AppTheme.errorColor,
                        fontWeight: FontWeight.w500,
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

  Widget _buildPaymentChart(AppLocalizations l10n, bool isDark) {
    if (_chartData == null) return const SizedBox.shrink();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const FaIcon(
                      FontAwesomeIcons.chartArea,
                      size: 20,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      l10n.paymentTrends,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Month Dropdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButton<int>(
                        value: _selectedMonth,
                        underline: const SizedBox.shrink(),
                        items: List.generate(12, (index) => index + 1)
                            .map((month) => DropdownMenuItem(
                                  value: month,
                                  child: Text(DateFormat.MMMM().format(DateTime(2000, month))),
                                ))
                            .toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedMonth = value);
                            _loadChartData();
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Year Dropdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButton<int>(
                        value: _selectedYear,
                        underline: const SizedBox.shrink(),
                        items: List.generate(5, (index) => DateTime.now().year - 2 + index)
                            .map((year) => DropdownMenuItem(
                                  value: year,
                                  child: Text(year.toString()),
                                ))
                            .toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedYear = value);
                            _loadChartData();
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 300,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 5000,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: Colors.grey.shade200,
                        strokeWidth: 1,
                      );
                    },
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 60,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            _currencyFormat.format(value),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= 0 && value.toInt() < _chartData!.labels.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                _chartData!.labels[value.toInt()],
                                style: const TextStyle(fontSize: 10),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    // Received Line
                    LineChartBarData(
                      spots: _chartData!.received
                          .asMap()
                          .entries
                          .map((e) => FlSpot(e.key.toDouble(), e.value))
                          .toList(),
                      isCurved: true,
                      color: AppTheme.successColor,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppTheme.successColor.withValues(alpha: 0.1),
                      ),
                    ),
                    // Paid Line
                    LineChartBarData(
                      spots: _chartData!.paid
                          .asMap()
                          .entries
                          .map((e) => FlSpot(e.key.toDouble(), e.value))
                          .toList(),
                      isCurved: true,
                      color: AppTheme.errorColor,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppTheme.errorColor.withValues(alpha: 0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildLegendItem('Received', AppTheme.successColor),
                const SizedBox(width: 24),
                _buildLegendItem('Paid', AppTheme.errorColor),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 14)),
      ],
    );
  }

  Widget _buildRecurringPaymentsSection(AppLocalizations l10n, bool isDark) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const FaIcon(
                      FontAwesomeIcons.calendarDays,
                      size: 20,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      l10n.dues,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Filter Buttons
            Wrap(
              spacing: 8,
              children: [
                _buildFilterChip('All', 'all'),
                _buildFilterChip('Monthly Recurring', 'monthly-recurring'),
                _buildFilterChip('Pending', 'pending'),
                _buildFilterChip('Overdue', 'overdue'),
                _buildFilterChip('Completed', 'completed'),
              ],
            ),
            const SizedBox(height: 16),
            // Recurring Payments List
            if (_recurringPayments.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      const FaIcon(
                        FontAwesomeIcons.calendarDays,
                        size: 48,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No dues found',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _recurringPayments.length,
                itemBuilder: (context, index) {
                  final payment = _recurringPayments[index];
                  return _buildPaymentCard(payment, isDark);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String filterValue) {
    final isSelected = _recurringFilter == filterValue;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() => _recurringFilter = filterValue);
        _loadRecurringPayments();
      },
      selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
      checkmarkColor: AppTheme.primaryColor,
    );
  }

  Widget _buildPendingPaymentsSection(AppLocalizations l10n, bool isDark) {
    final pendingAmount = _pendingPayments.fold<double>(
      0,
      (sum, payment) => sum + payment.amount,
    );

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const FaIcon(
                      FontAwesomeIcons.clock,
                      size: 20,
                      color: AppTheme.warningColor,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      l10n.pendingPayments,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_pendingPayments.length} pending',
                  style: const TextStyle(
                    color: AppTheme.textSecondaryColor,
                    fontSize: 12,
                  ),
                ),
                Text(
                  _currencyFormat.format(pendingAmount),
                  style: const TextStyle(
                    color: AppTheme.warningColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_pendingPayments.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      const FaIcon(
                        FontAwesomeIcons.userClock,
                        size: 48,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No pending payments',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _pendingPayments.length,
                itemBuilder: (context, index) {
                  final payment = _pendingPayments[index];
                  return _buildPaymentCard(payment, isDark, showMarkPaid: true);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentPaymentsSection(AppLocalizations l10n, bool isDark) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const FaIcon(
                      FontAwesomeIcons.clockRotateLeft,
                      size: 20,
                      color: AppTheme.infoColor,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      l10n.recentPayments,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_recentPayments.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      const FaIcon(
                        FontAwesomeIcons.clockRotateLeft,
                        size: 48,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No recent payments',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _recentPayments.length,
                itemBuilder: (context, index) {
                  final payment = _recentPayments[index];
                  return _buildPaymentCard(payment, isDark);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentCard(Payment payment, bool isDark, {bool showMarkPaid = false}) {
    final isReceived = payment.type == 'received';
    final color = isReceived ? AppTheme.successColor : AppTheme.errorColor;
    
    Color statusColor;
    switch (payment.status) {
      case 'completed':
        statusColor = AppTheme.successColor;
        break;
      case 'pending':
        statusColor = AppTheme.warningColor;
        break;
      case 'overdue':
        statusColor = AppTheme.errorColor;
        break;
      default:
        statusColor = AppTheme.textSecondaryColor;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark 
            ? Colors.grey.shade800.withValues(alpha: 0.3) 
            : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? Colors.grey.shade700 : Colors.grey.shade200,
        ),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Center(
              child: FaIcon(
                isReceived ? FontAwesomeIcons.arrowDown : FontAwesomeIcons.arrowUp,
                size: 16,
                color: color,
              ),
            ),
          ),
          const SizedBox(width: 12),
          
          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  payment.memberName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  payment.description ?? payment.planName ?? 'Payment',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondaryColor,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    FaIcon(
                      FontAwesomeIcons.calendar,
                      size: 10,
                      color: AppTheme.textSecondaryColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      DateFormat('dd MMM yyyy').format(payment.createdAt),
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        payment.status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Amount
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isReceived ? '+' : '-'}${_currencyFormat.format(payment.amount)}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: color,
                ),
              ),
              if (showMarkPaid && payment.isPending) ...[
                const SizedBox(height: 4),
                SizedBox(
                  height: 28,
                  child: ElevatedButton(
                    onPressed: () => _markPaymentAsPaid(payment.id!),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.successColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      minimumSize: const Size(0, 28),
                    ),
                    child: const Text('Mark Paid', style: TextStyle(fontSize: 10)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _loadChartData() async {
    try {
      final chartData = await _paymentService.getPaymentChartData(
        month: _selectedMonth,
        year: _selectedYear,
      );
      setState(() => _chartData = chartData);
    } catch (e) {
      debugPrint('Error loading chart data: $e');
    }
  }

  Future<void> _loadRecurringPayments() async {
    try {
      final payments = await _paymentService.getRecurringPayments(
        filter: _recurringFilter,
      );
      setState(() => _recurringPayments = payments);
    } catch (e) {
      debugPrint('Error loading recurring payments: $e');
    }
  }

  Future<void> _markPaymentAsPaid(String paymentId) async {
    try {
      await _paymentService.markPaymentAsPaid(paymentId: paymentId);
      _refreshData();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment marked as paid')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    }
  }

  // Placeholder methods for detail modals
  void _showReceivedPaymentsDetails() {
    // TODO: Implement received payments details modal
  }

  void _showPaidPaymentsDetails() {
    // TODO: Implement paid payments details modal
  }

  void _showPendingPaymentsDetails() {
    // TODO: Implement pending payments details modal
  }

  void _showDuePaymentsDetails() {
    // TODO: Implement due payments details modal
  }

  void _showProfitLossDetails() {
    // TODO: Implement profit/loss details modal
  }
}

// Add Payment Dialog
class _AddPaymentDialog extends StatefulWidget {
  final VoidCallback onPaymentAdded;

  const _AddPaymentDialog({required this.onPaymentAdded});

  @override
  State<_AddPaymentDialog> createState() => _AddPaymentDialogState();
}

class _AddPaymentDialogState extends State<_AddPaymentDialog> {
  final _formKey = GlobalKey<FormState>();
  final PaymentService _paymentService = PaymentService();
  
  final _memberNameController = TextEditingController();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _notesController = TextEditingController();
  
  String _selectedType = 'received';
  String _selectedMethod = 'cash';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _memberNameController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitPayment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      await _paymentService.addPayment(
        memberName: _memberNameController.text,
        amount: double.parse(_amountController.text),
        type: _selectedType,
        method: _selectedMethod,
        description: _descriptionController.text,
        notes: _notesController.text,
      );

      widget.onPaymentAdded();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error adding payment: ${e.toString()}')),
      );
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return AlertDialog(
      title: Row(
        children: [
          const FaIcon(FontAwesomeIcons.plus, size: 20),
          const SizedBox(width: 12),
          Text(l10n.addPayment),
        ],
      ),
      content: SizedBox(
        width: 500,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _memberNameController,
                  decoration: InputDecoration(
                    labelText: '${l10n.memberName} *',
                    prefixIcon: const Icon(FontAwesomeIcons.user),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter member name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _amountController,
                  decoration: InputDecoration(
                    labelText: '${l10n.amount} *',
                    prefixIcon: const Icon(FontAwesomeIcons.indianRupeeSign),
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter amount';
                    }
                    if (double.tryParse(value) == null) {
                      return 'Please enter a valid number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedType,
                  decoration: InputDecoration(
                    labelText: l10n.paymentType,
                    prefixIcon: const Icon(FontAwesomeIcons.rightLeft),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'received', child: Text('Received')),
                    DropdownMenuItem(value: 'paid', child: Text('Paid')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _selectedType = value);
                    }
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedMethod,
                  decoration: InputDecoration(
                    labelText: l10n.paymentMethod,
                    prefixIcon: const Icon(FontAwesomeIcons.creditCard),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'cash', child: Text('Cash')),
                    DropdownMenuItem(value: 'card', child: Text('Card')),
                    DropdownMenuItem(value: 'upi', child: Text('UPI')),
                    DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _selectedMethod = value);
                    }
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  decoration: InputDecoration(
                    labelText: l10n.description,
                    prefixIcon: const Icon(FontAwesomeIcons.alignLeft),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _notesController,
                  decoration: InputDecoration(
                    labelText: l10n.notes,
                    prefixIcon: const Icon(FontAwesomeIcons.noteSticky),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: Text(l10n.cancel),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitPayment,
          child: _isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(l10n.addPayment),
        ),
      ],
    );
  }
}
