import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../models/payment.dart';
import '../../services/payment_service.dart';
import '../../services/passcode_service.dart';
import '../../widgets/sidebar_menu.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/passcode_dialog.dart';
import '../dashboard/dashboard_screen.dart';
import '../members/members_screen.dart';
import '../attendance/attendance_screen.dart';
import '../equipment/equipment_screen.dart';
import '../offers/offers_screen.dart';
import '../support/support_screen.dart';

/// Payment Management Screen for Gym Admin App
/// Features: Payment stats, chart, recent payments, pending payments, recurring payments
class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  final PaymentService _paymentService = PaymentService();
  final PasscodeService _passcodeService = PasscodeService();
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
  int _selectedIndex = 4; // Payments tab index
  
  // Chart filters
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  
  // Recurring payments filter
  String _recurringFilter = 'all'; // 'all', 'monthly-recurring', 'pending', 'overdue', 'completed'
  
  // Passcode verification
  bool _checkingPasscode = true;

  @override
  void initState() {
    super.initState();
    // Delay passcode check until after first frame to avoid assertion errors
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPasscodeAndLoad();
    });
  }

  Future<void> _checkPasscodeAndLoad() async {
    try {
      final settings = await _passcodeService.getPasscodeSettings();
      final passcodeEnabled = settings['enabled'] ?? false;
      final passcodeType = settings['type'] ?? 'none';
      final hasPasscode = settings['hasPasscode'] ?? false;
      
      // Check if passcode is required for payments
      if (passcodeEnabled && passcodeType == 'payments' && hasPasscode) {
        // Only show dialog if passcode is actually set
        if (mounted) {
          setState(() => _checkingPasscode = true);
          
          final passcode = await PasscodeDialog.show(
            context,
            title: 'Payments Access',
            subtitle: 'Enter passcode to access payments',
            isSetup: false,
            dismissible: true,
            onVerify: (enteredPasscode) async {
              // Verify the passcode
              return await _passcodeService.verifyPasscode(enteredPasscode);
            },
          );

          if (passcode != null && mounted) {
            // Passcode verified successfully - prepare for data loading
            setState(() {
              _checkingPasscode = false;
            });
            // Use microtask to ensure UI updates before loading data
            Future.microtask(() => _loadPaymentData());
          } else {
            // Passcode dialog cancelled, navigate back to previous screen
            if (mounted) {
              Navigator.pop(context);
            }
          }
        }
      } else if (passcodeEnabled && passcodeType == 'payments' && !hasPasscode) {
        // Passcode is enabled but not set yet - show error and navigate back
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please set up a passcode in Settings first'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 3),
            ),
          );
          Navigator.pop(context);
        }
      } else {
        // No passcode required, load data directly
        if (mounted) {
          setState(() {
            _checkingPasscode = false;
          });
          // Use microtask to ensure UI updates before loading data
          Future.microtask(() => _loadPaymentData());
        }
      }
    } catch (e) {
      print('Error checking passcode: $e');
      // If error checking passcode settings, allow access
      if (mounted) {
        setState(() {
          _checkingPasscode = false;
        });
        // Use microtask to ensure UI updates before loading data
        Future.microtask(() => _loadPaymentData());
      }
    }
  }

  Future<void> _loadPaymentData() async {
    if (!mounted) return;
    
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

      if (!mounted) return;
      
      setState(() {
        _stats = stats;
        _chartData = chartData;
        _recentPayments = recentPayments;
        _pendingPayments = pendingPayments;
        _recurringPayments = recurringPayments;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      
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
      case 0: // Home
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const DashboardScreen(),
          ),
        );
        break;
      case 1: // Members
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const MembersScreen(),
          ),
        );
        break;
      case 2: // Trainers
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trainers screen coming soon')),
        );
        break;
      case 3: // Attendance
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const AttendanceScreen(),
          ),
        );
        break;
      case 4: // Payments
        // Already on payments screen, do nothing
        break;
      case 5: // Equipment
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const EquipmentScreen(),
          ),
        );
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
      case 7: // Support & Reviews
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const SupportScreen(gymId: ''),
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
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: isDark ? AppTheme.darkBackgroundColor : AppTheme.backgroundColor,
      body: Row(
        children: [
          // Sidebar - only show on desktop
          if (isDesktop)
            SidebarMenu(
              selectedIndex: _selectedIndex,
              onItemSelected: _onMenuItemSelected,
            ),
          
          // Main Content
          Expanded(
            child: Column(
              children: [
                // App Bar
                _buildAppBar(context, l10n, isDesktop),
                
                // Content
                Expanded(
                  child: _checkingPasscode
                      ? _buildLoadingState()
                      : _isLoading
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
      // Drawer - only show on mobile/tablet
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

  Widget _buildAppBar(BuildContext context, AppLocalizations l10n, bool isDesktop) {
    final topPadding = MediaQuery.of(context).padding.top;
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    final isTablet = size.width > 600 && size.width <= 900;
    
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
                FaIcon(
                  FontAwesomeIcons.creditCard,
                  color: AppTheme.primaryColor,
                  size: isMobile ? 20 : 24,
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    l10n.payments,
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
          // Responsive add payment button
          if (isDesktop)
            ElevatedButton.icon(
              onPressed: _showAddPaymentDialog,
              icon: const FaIcon(FontAwesomeIcons.plus, size: 16),
              label: Text(l10n.addPayment),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            )
          else if (!isMobile)
            // Tablet: Icon button
            IconButton(
              onPressed: _showAddPaymentDialog,
              icon: const FaIcon(FontAwesomeIcons.plus, size: 20),
              tooltip: l10n.addPayment,
              color: Colors.white,
              style: IconButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.all(12),
              ),
            )
          else
            // Mobile: Small FAB
            FloatingActionButton.small(
              onPressed: _showAddPaymentDialog,
              backgroundColor: AppTheme.primaryColor,
              child: const FaIcon(FontAwesomeIcons.plus, color: Colors.white, size: 20),
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
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isMobile = size.width <= 600;
    
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: EdgeInsets.all(isMobile ? 12 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Payment Statistics Cards
            _buildStatsGrid(l10n),
            SizedBox(height: isMobile ? 16 : 24),
            
            // Payment Chart
            _buildPaymentChart(l10n, isDark),
            SizedBox(height: isMobile ? 16 : 24),
            
            // Payment Content Grid - Stack on mobile, side-by-side on desktop
            if (isDesktop)
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
              )
            else
              Column(
                children: [
                  // Dues Section
                  _buildRecurringPaymentsSection(l10n, isDark),
                  SizedBox(height: isMobile ? 12 : 16),
                  
                  // Pending Payments Section
                  _buildPendingPaymentsSection(l10n, isDark),
                  SizedBox(height: isMobile ? 12 : 16),
                  
                  // Recent Payments Section
                  _buildRecentPaymentsSection(l10n, isDark),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid(AppLocalizations l10n) {
    if (_stats == null) return const SizedBox.shrink();

    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isMobile = size.width <= 600;

    return GridView.count(
      crossAxisCount: isDesktop ? 3 : 2,
      mainAxisSpacing: isMobile ? 8 : 16,
      crossAxisSpacing: isMobile ? 8 : 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: isDesktop ? 1.8 : (isMobile ? 1.6 : 1.5),
      children: [
        GestureDetector(
          onTap: () => _showAmountReceivedDetails(),
          child: StatCard(
            title: l10n.amountReceived,
            value: _currencyFormat.format(_stats!.amountReceived),
            icon: Icons.arrow_downward,
            color: AppTheme.successColor,
            trend: _stats!.receivedChange,
          ),
        ),
        GestureDetector(
          onTap: () => _showAmountPaidDetails(),
          child: StatCard(
            title: l10n.amountPaid,
            value: _currencyFormat.format(_stats!.amountPaid),
            icon: Icons.arrow_upward,
            color: AppTheme.errorColor,
            trend: _stats!.paidChange,
          ),
        ),
        StatCard(
          title: l10n.profitLoss,
          value: _currencyFormat.format(_stats!.profitLoss),
          icon: Icons.trending_up,
          color: _stats!.profitLoss >= 0 ? AppTheme.successColor : AppTheme.errorColor,
          trend: _stats!.profitChange,
        ),
      ],
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
                Flexible(
                  child: Row(
                    children: [
                      // Month Dropdown
                      Flexible(
                        flex: 2,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: DropdownButton<int>(
                            value: _selectedMonth,
                            underline: const SizedBox.shrink(),
                            isExpanded: true,
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
                      ),
                      const SizedBox(width: 12),
                      // Year Dropdown
                      Flexible(
                        flex: 1,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: DropdownButton<int>(
                            value: _selectedYear,
                            underline: const SizedBox.shrink(),
                            isExpanded: true,
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
                      ),
                    ],
                  ),
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
    final displayCount = _recurringPayments.length > 10 ? 10 : _recurringPayments.length;
    final hasMore = _recurringPayments.length > 10;
    
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
              runSpacing: 8,
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
                itemCount: displayCount,
                itemBuilder: (context, index) {
                  final payment = _recurringPayments[index];
                  return _buildPaymentCard(payment, isDark);
                },
              ),
            if (hasMore)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Center(
                  child: TextButton.icon(
                    onPressed: () {
                      // TODO: Show all recurring payments in a dialog or new screen
                      _showAllRecurringPayments();
                    },
                    icon: const Icon(Icons.arrow_forward),
                    label: Text('View All ${_recurringPayments.length} Dues'),
                  ),
                ),
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

    final displayCount = _pendingPayments.length > 5 ? 5 : _pendingPayments.length;
    final hasMore = _pendingPayments.length > 5;

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
              Column(
                children: [
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: displayCount,
                    itemBuilder: (context, index) {
                      final payment = _pendingPayments[index];
                      return _buildPaymentCard(payment, isDark, showMarkPaid: true);
                    },
                  ),
                  if (hasMore)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Center(
                        child: TextButton.icon(
                          onPressed: () {
                            _showAllPendingPayments();
                          },
                          icon: const Icon(Icons.arrow_forward),
                          label: Text('View All ${_pendingPayments.length} Pending'),
                        ),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentPaymentsSection(AppLocalizations l10n, bool isDark) {
    final displayCount = _recentPayments.length > 5 ? 5 : _recentPayments.length;
    final hasMore = _recentPayments.length > 5;
    
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
              Column(
                children: [
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: displayCount,
                    itemBuilder: (context, index) {
                      final payment = _recentPayments[index];
                      return _buildPaymentCard(payment, isDark);
                    },
                  ),
                  if (hasMore)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Center(
                        child: TextButton.icon(
                          onPressed: () {
                            _showAllRecentPayments();
                          },
                          icon: const Icon(Icons.arrow_forward),
                          label: Text('View All ${_recentPayments.length} Payments'),
                        ),
                      ),
                    ),
                ],
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
                    Flexible(
                      child: Text(
                        DateFormat('dd MMM yyyy').format(payment.createdAt),
                        style: TextStyle(
                          fontSize: 10,
                          color: AppTheme.textSecondaryColor,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Container(
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
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Amount
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${isReceived ? '+' : '-'}${_currencyFormat.format(payment.amount)}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: color,
                  ),
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.right,
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
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: const Size(0, 28),
                      ),
                      child: const Text('Mark Paid', style: TextStyle(fontSize: 10)),
                    ),
                  ),
                ],
              ],
            ),
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
      if (!mounted) return;
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
      if (!mounted) return;
      setState(() => _recurringPayments = payments);
    } catch (e) {
      debugPrint('Error loading recurring payments: $e');
    }
  }

  Future<void> _markPaymentAsPaid(String paymentId) async {
    try {
      await _paymentService.markPaymentAsPaid(paymentId: paymentId);
      _refreshData();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment marked as paid')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    }
  }

  void _showAmountReceivedDetails() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          width: 600,
          constraints: const BoxConstraints(maxHeight: 700),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.1),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.successColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const FaIcon(
                        FontAwesomeIcons.arrowDown,
                        color: AppTheme.successColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Amount Received',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _currencyFormat.format(_stats?.amountReceived ?? 0),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.successColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const FaIcon(FontAwesomeIcons.xmark, size: 20),
                    ),
                  ],
                ),
              ),
              
              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stats Summary
                      Row(
                        children: [
                          Expanded(
                            child: _buildDetailStatCard(
                              'Total Received',
                              _stats?.totalReceived.toString() ?? '0',
                              FontAwesomeIcons.receipt,
                              AppTheme.successColor,
                              'transactions',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildDetailStatCard(
                              'Pending',
                              _currencyFormat.format(_stats?.pendingPayments ?? 0),
                              FontAwesomeIcons.clock,
                              AppTheme.warningColor,
                              '${_stats?.totalPending ?? 0} pending',
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Pending Payments Section
                      if (_pendingPayments.isNotEmpty) ...[
                        Row(
                          children: [
                            const FaIcon(
                              FontAwesomeIcons.clock,
                              size: 16,
                              color: AppTheme.warningColor,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Pending Payments',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_pendingPayments.length} items',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondaryColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _pendingPayments.length > 5 ? 5 : _pendingPayments.length,
                          itemBuilder: (context, index) {
                            final payment = _pendingPayments[index];
                            return _buildPaymentCard(payment, isDark, showMarkPaid: true);
                          },
                        ),
                        if (_pendingPayments.length > 5)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Center(
                              child: TextButton.icon(
                                onPressed: () {
                                  Navigator.pop(context);
                                  _showAllPendingPayments();
                                },
                                icon: const FaIcon(FontAwesomeIcons.arrowRight, size: 14),
                                label: Text('View All ${_pendingPayments.length} Pending'),
                              ),
                            ),
                          ),
                      ] else ...[
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              children: [
                                const FaIcon(
                                  FontAwesomeIcons.circleCheck,
                                  size: 48,
                                  color: AppTheme.successColor,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No pending payments!',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: AppTheme.successColor,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'All payments are up to date',
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppTheme.textSecondaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAmountPaidDetails() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    // Filter paid/expense payments
    final expensePayments = _recentPayments.where((p) => p.type == 'paid').toList();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          width: 600,
          constraints: const BoxConstraints(maxHeight: 700),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withValues(alpha: 0.1),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const FaIcon(
                        FontAwesomeIcons.arrowUp,
                        color: AppTheme.errorColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Amount Paid',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _currencyFormat.format(_stats?.amountPaid ?? 0),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.errorColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const FaIcon(FontAwesomeIcons.xmark, size: 20),
                    ),
                  ],
                ),
              ),
              
              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stats Summary
                      Row(
                        children: [
                          Expanded(
                            child: _buildDetailStatCard(
                              'Total Paid',
                              _stats?.totalPaid.toString() ?? '0',
                              FontAwesomeIcons.receipt,
                              AppTheme.errorColor,
                              'bills/expenses',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildDetailStatCard(
                              'Due Payments',
                              _currencyFormat.format(_stats?.duePayments ?? 0),
                              FontAwesomeIcons.calendarXmark,
                              Colors.orange,
                              '${_stats?.totalDue ?? 0} due',
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Bills & Expenses Section
                      if (expensePayments.isNotEmpty) ...[
                        Row(
                          children: [
                            const FaIcon(
                              FontAwesomeIcons.fileInvoiceDollar,
                              size: 16,
                              color: AppTheme.errorColor,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Recent Bills & Expenses',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${expensePayments.length} items',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondaryColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: expensePayments.length > 5 ? 5 : expensePayments.length,
                          itemBuilder: (context, index) {
                            final payment = expensePayments[index];
                            return _buildPaymentCard(payment, isDark);
                          },
                        ),
                      ],
                      
                      // Due Payments Section
                      if (_recurringPayments.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            const FaIcon(
                              FontAwesomeIcons.calendarXmark,
                              size: 16,
                              color: Colors.orange,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Due Payments',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_recurringPayments.length} items',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondaryColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _recurringPayments.length > 3 ? 3 : _recurringPayments.length,
                          itemBuilder: (context, index) {
                            final payment = _recurringPayments[index];
                            return _buildPaymentCard(payment, isDark);
                          },
                        ),
                        if (_recurringPayments.length > 3)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Center(
                              child: TextButton.icon(
                                onPressed: () {
                                  Navigator.pop(context);
                                  _showAllRecurringPayments();
                                },
                                icon: const FaIcon(FontAwesomeIcons.arrowRight, size: 14),
                                label: Text('View All ${_recurringPayments.length} Dues'),
                              ),
                            ),
                          ),
                      ],
                      
                      // Empty state
                      if (expensePayments.isEmpty && _recurringPayments.isEmpty) ...[
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              children: [
                                const FaIcon(
                                  FontAwesomeIcons.moneyBillWave,
                                  size: 48,
                                  color: Colors.grey,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No bills or expenses found',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
    String subtitle,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              FaIcon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: color,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 10,
              color: color.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  void _showAllRecurringPayments() {
    showDialog(
      context: context,
      builder: (context) => _AllPaymentsDialog(
        title: 'All Dues',
        payments: _recurringPayments,
        isDark: Theme.of(context).brightness == Brightness.dark,
      ),
    );
  }

  void _showAllPendingPayments() {
    showDialog(
      context: context,
      builder: (context) => _AllPaymentsDialog(
        title: 'All Pending Payments',
        payments: _pendingPayments,
        isDark: Theme.of(context).brightness == Brightness.dark,
        showMarkPaid: true,
        onMarkPaid: _markPaymentAsPaid,
      ),
    );
  }

  void _showAllRecentPayments() {
    showDialog(
      context: context,
      builder: (context) => _AllPaymentsDialog(
        title: 'All Recent Payments',
        payments: _recentPayments,
        isDark: Theme.of(context).brightness == Brightness.dark,
      ),
    );
  }
}

// All Payments Dialog
class _AllPaymentsDialog extends StatelessWidget {
  final String title;
  final List<Payment> payments;
  final bool isDark;
  final bool showMarkPaid;
  final Function(String)? onMarkPaid;

  const _AllPaymentsDialog({
    required this.title,
    required this.payments,
    required this.isDark,
    this.showMarkPaid = false,
    this.onMarkPaid,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
    
    return AlertDialog(
      title: Row(
        children: [
          const FaIcon(FontAwesomeIcons.list, size: 20),
          const SizedBox(width: 12),
          Text(title),
        ],
      ),
      content: SizedBox(
        width: 600,
        height: 500,
        child: ListView.builder(
          itemCount: payments.length,
          itemBuilder: (context, index) {
            final payment = payments[index];
            final isReceived = payment.type == 'received';
            final color = isReceived ? AppTheme.successColor : AppTheme.errorColor;
            
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
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondaryColor,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${isReceived ? '+' : '-'}${currencyFormat.format(payment.amount)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: color,
                          ),
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.right,
                        ),
                        if (showMarkPaid && payment.isPending && onMarkPaid != null) ...[
                          const SizedBox(height: 4),
                          SizedBox(
                            height: 28,
                            child: ElevatedButton(
                              onPressed: () {
                                onMarkPaid!(payment.id!);
                                Navigator.pop(context);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.successColor,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                minimumSize: const Size(0, 28),
                              ),
                              child: const Text('Mark Paid', style: TextStyle(fontSize: 10)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    );
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
                  initialValue: _selectedType,
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
                  initialValue: _selectedMethod,
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
