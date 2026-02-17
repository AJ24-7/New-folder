import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../models/support_models.dart';
import '../../services/support_service.dart';
import '../../widgets/sidebar_menu.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/support/notification_tab.dart';
import '../../widgets/support/reviews_tab.dart';
import '../../widgets/support/grievances_tab.dart';
import '../../widgets/support/communications_tab.dart';
import '../equipment/equipment_screen.dart';

class SupportScreen extends StatefulWidget {
  final String gymId;

  const SupportScreen({Key? key, required this.gymId}) : super(key: key);

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen>
    with SingleTickerProviderStateMixin {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  late TabController _tabController;
  late SupportService _supportService;

  // Data
  List<SupportNotification> _notifications = [];
  List<GymReview> _reviews = [];
  List<Grievance> _grievances = [];
  List<Communication> _communications = [];
  List<Map<String, dynamic>> _memberReports = [];
  SupportStats? _stats;

  // Loading states
  bool _isLoading = true;
  String? _error;

  // Auto-refresh timer
  bool _autoRefreshEnabled = true;
  static const _refreshInterval = Duration(seconds: 10);

  int _selectedIndex = 7; // Support tab index

  // Communication ID to open (from notification)
  String? _communicationIdToOpen;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _supportService = SupportService();
    
    _loadAllData();
    _startAutoRefresh();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    
    // Check for navigation arguments
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && args['communicationId'] != null) {
      _communicationIdToOpen = args['communicationId'] as String;
      // Switch to Communications tab (index 3)
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _tabController.index != 3) {
          _tabController.animateTo(3);
        }
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _startAutoRefresh() {
    Future.doWhile(() async {
      if (!mounted || !_autoRefreshEnabled) return false;
      await Future.delayed(_refreshInterval);
      if (mounted && _autoRefreshEnabled) {
        _loadAllData(silent: true);
      }
      return mounted && _autoRefreshEnabled;
    });
  }

  Future<void> _loadAllData({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final results = await Future.wait([
        _supportService.getNotifications(widget.gymId),
        _supportService.getReviews(widget.gymId),
        _supportService.getGrievances(widget.gymId),
        _supportService.getCommunications(widget.gymId),
        _supportService.getMemberProblemReports(),
      ]);

      final notifications = results[0] as List<SupportNotification>;
      final reviews = results[1] as List<GymReview>;
      final grievances = results[2] as List<Grievance>;
      final communications = results[3] as List<Communication>;
      final memberReports = results[4] as List<Map<String, dynamic>>;

      final stats = await _supportService.calculateStats(
        notifications: notifications,
        reviews: reviews,
        grievances: grievances,
        communications: communications,
        memberReports: memberReports,
      );

      if (mounted) {
        setState(() {
          _notifications = notifications;
          _reviews = reviews;
          _grievances = grievances;
          _communications = communications;
          _memberReports = memberReports;
          _stats = stats;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return;
    
    // Navigate to different screens based on index
    // Using pushReplacementNamed to properly replace current screen
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payments screen coming soon')),
        );
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offers screen coming soon')),
        );
        break;
      case 7: // Support
        // Already on support screen, do nothing
        break;
      case 8: // Settings
        Navigator.pushNamed(context, '/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isTablet = size.width > 600 && size.width <= 900;

    return Scaffold(
      key: _scaffoldKey,
      body: Row(
        children: [
          // Sidebar
          if (isDesktop)
            SidebarMenu(
              selectedIndex: _selectedIndex,
              onItemSelected: _onMenuItemSelected,
            ),

          // Main Content
          Expanded(
            child: Column(
              children: [
                _buildTopBar(context, isDesktop),
                Expanded(
                  child: _buildContent(context, isDesktop),
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

  Widget _buildTopBar(BuildContext context, bool isDesktop) {
    final l10n = AppLocalizations.of(context)!;
    final topPadding = MediaQuery.of(context).padding.top;
    return Container(
      padding: EdgeInsets.only(
        top: isDesktop ? 12 : (topPadding > 0 ? topPadding + 8 : 12),
        bottom: 12,
        left: isDesktop ? 16 : 12,
        right: isDesktop ? 16 : 12,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.1),
            blurRadius: 4,
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
          if (!isDesktop) const SizedBox(width: 4),
          const FaIcon(
            FontAwesomeIcons.headset,
            color: AppTheme.primaryColor,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              l10n.support, // "Support & Reviews"
              style: TextStyle(
                fontSize: isDesktop ? 24 : 18,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
              _autoRefreshEnabled ? Icons.sync : Icons.sync_disabled,
              size: 20,
            ),
            onPressed: () {
              setState(() {
                _autoRefreshEnabled = !_autoRefreshEnabled;
              });
              if (_autoRefreshEnabled) _startAutoRefresh();
            },
            tooltip: _autoRefreshEnabled
                ? 'Auto-refresh enabled'
                : 'Auto-refresh disabled',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loadAllData,
            tooltip: '${l10n.refresh} now',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, bool isDesktop) {
    final l10n = AppLocalizations.of(context)!;
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text('${l10n.error}: $_error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadAllData,
              child: Text(l10n.tryAgain),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Stats Cards
        _buildStatsCards(),
        const Divider(height: 1),
        // Tab Bar
        Container(
          color: Theme.of(context).cardColor,
          child: TabBar(
            controller: _tabController,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: Theme.of(context).colorScheme.onSurfaceVariant,
            indicatorColor: AppTheme.primaryColor,
            labelStyle: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
            unselectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.normal,
              fontSize: 14,
            ),
            tabs: [
              Tab(
                child: _buildTabLabel(
                  l10n.notifications,
                  _stats?.notifications.unread ?? 0,
                ),
              ),
              Tab(
                child: _buildTabLabel(
                  'Reviews', // TODO: Add to localizations
                  _stats?.reviews.pending ?? 0,
                ),
              ),
              Tab(
                child: _buildTabLabel(
                  l10n.grievances,
                  _stats?.grievances.open ?? 0,
                ),
              ),
              Tab(
                child: _buildTabLabel(
                  'Chats', // TODO: Add to localizations
                  _stats?.communications.unread ?? 0,
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        // Tab Views
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              NotificationTab(
                notifications: _notifications,
                onRefresh: _loadAllData,
                supportService: _supportService,
              ),
              ReviewsTab(
                reviews: _reviews,
                onRefresh: _loadAllData,
                supportService: _supportService,
              ),
              GrievancesTab(
                grievances: _grievances,
                gymId: widget.gymId,
                onRefresh: _loadAllData,
                supportService: _supportService,
              ),
              CommunicationsTab(
                communications: _communications,
                onRefresh: _loadAllData,
                supportService: _supportService,
                communicationIdToOpen: _communicationIdToOpen,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTabLabel(String text, int count) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(text),
        if (count > 0) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              count > 99 ? '99+' : count.toString(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onError,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatsCards() {
    if (_stats == null) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context)!;
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isMobile = size.width <= 600;

    return Container(
      padding: EdgeInsets.all(isMobile ? 12 : 16),
      child: GridView.count(
        crossAxisCount: isDesktop ? 4 : (isMobile ? 2 : 4),
        crossAxisSpacing: isMobile ? 8 : 12,
        mainAxisSpacing: isMobile ? 8 : 12,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: isMobile ? 1.3 : (isDesktop ? 1.8 : 1.5),
        children: [
          StatCard(
            title: l10n.notifications,
            value: _stats!.notifications.total.toString(),
            icon: Icons.notifications,
            color: Colors.blue,
          ),
          StatCard(
            title: 'Reviews',
            value: _stats!.reviews.average.toStringAsFixed(1),
            icon: Icons.star,
            color: Colors.orange,
          ),
          _buildGrievanceStatCard(),
          _buildChatStatCard(),
        ],
      ),
    );
  }

  Widget _buildGrievanceStatCard() {
    if (_stats == null) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context)!;
    
    return Card(
      elevation: 2,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          gradient: LinearGradient(
            colors: [
              AppTheme.errorColor.withValues(alpha: 0.1),
              AppTheme.errorColor.withValues(alpha: 0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(
                  Icons.report_problem,
                  color: AppTheme.errorColor,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.grievances,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _stats!.grievances.total.toString(),
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.errorColor,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.pending_actions,
                        size: 14,
                        color: Colors.orange,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          '${_stats!.grievances.open}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 14,
                        color: Colors.green,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          '${_stats!.grievances.closed}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
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

  Widget _buildChatStatCard() {
    if (_stats == null) return const SizedBox.shrink();
    
    return Card(
      elevation: 2,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          gradient: LinearGradient(
            colors: [
              AppTheme.successColor.withValues(alpha: 0.1),
              AppTheme.successColor.withValues(alpha: 0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(
                  Icons.chat,
                  color: AppTheme.successColor,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Chats',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _stats!.communications.total.toString(),
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.successColor,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.mark_chat_unread,
                        size: 14,
                        color: Colors.red,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          '${_stats!.communications.unread}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.reply,
                        size: 14,
                        color: Colors.blue,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          '${_stats!.communications.replied}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.blue,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
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

}
