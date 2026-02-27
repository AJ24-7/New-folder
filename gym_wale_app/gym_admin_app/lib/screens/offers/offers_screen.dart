import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../../models/gym_offer.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../config/app_theme.dart';
import '../../widgets/sidebar_menu.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/offer_carousel_templates.dart';
import '../dashboard/dashboard_screen.dart';

class OffersScreen extends StatefulWidget {
  const OffersScreen({Key? key}) : super(key: key);

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  final StorageService _storage = StorageService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  late TabController _tabController;
  List<GymOffer> _offers = [];
  List<GymCoupon> _coupons = [];
  OfferStats? _stats;
  bool _isLoading = true;
  String _selectedStatus = 'all';
  String _selectedCategory = 'all';
  String? _gymId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    _gymId = await _storage.getGymId();
    
    await Future.wait([
      _loadOffers(),
      _loadCoupons(),
      _loadStats(),
    ]);
    
    setState(() => _isLoading = false);
  }

  Future<void> _loadOffers() async {
    try {
      final offersData = await _apiService.getAllOffers();
      setState(() {
        _offers = offersData.map((json) => GymOffer.fromJson(json)).toList();
      });
    } catch (e) {
      debugPrint('Error loading offers: $e');
    }
  }

  Future<void> _loadCoupons() async {
    try {
      final couponsData = await _apiService.getAllCoupons();
      setState(() {
        _coupons = couponsData.map((json) => GymCoupon.fromJson(json)).toList();
      });
    } catch (e) {
      debugPrint('Error loading coupons: $e');
    }
  }

  Future<void> _loadStats() async {
    try {
      final statsData = await _apiService.getOfferStats();
      if (statsData != null) {
        setState(() {
          _stats = OfferStats.fromJson(statsData);
        });
      }
    } catch (e) {
      debugPrint('Error loading stats: $e');
    }
  }

  List<GymOffer> get _filteredOffers {
    return _offers.where((offer) {
      if (_selectedStatus != 'all' && offer.status != _selectedStatus) return false;
      if (_selectedCategory != 'all' && offer.category != _selectedCategory) return false;
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: isDark ? AppTheme.darkBackgroundColor : AppTheme.backgroundColor,
      body: Row(
        children: [
          // Sidebar - only show on desktop
          if (isDesktop)
            SidebarMenu(
              selectedIndex: 6,
              onItemSelected: _handleMenuItemSelected,
            ),
          
          // Main Content
          Expanded(
            child: Column(
              children: [
                // Top Bar
                _buildTopBar(context, isDesktop),
                
                // Content
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Stats Cards
                              _buildStatsCards(isDesktop),
                              const SizedBox(height: 24),
                              
                              // Tabs and Content
                              Card(
                                child: Column(
                                  children: [
                                    // Tab Bar
                                    Container(
                                      decoration: BoxDecoration(
                                        border: Border(
                                          bottom: BorderSide(
                                            color: Theme.of(context).dividerColor,
                                            width: 1,
                                          ),
                                        ),
                                      ),
                                      child: TabBar(
                                        controller: _tabController,
                                        labelColor: AppTheme.primaryColor,
                                        unselectedLabelColor: Theme.of(context).textTheme.bodySmall?.color,
                                        indicatorColor: AppTheme.primaryColor,
                                        tabs: const [
                                          Tab(
                                            icon: Icon(Icons.local_offer),
                                            text: 'Offers',
                                          ),
                                          Tab(
                                            icon: Icon(Icons.confirmation_number),
                                            text: 'Coupons',
                                          ),
                                        ],
                                      ),
                                    ),
                                    // Tab Content
                                    SizedBox(
                                      height: 600,
                                      child: TabBarView(
                                        controller: _tabController,
                                        children: [
                                          _buildOffersTab(),
                                          _buildCouponsTab(),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
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
      // Drawer - only show on mobile/tablet
      drawer: !isDesktop
          ? Drawer(
              child: SidebarMenu(
                selectedIndex: 6,
                onItemSelected: (index) {
                  Navigator.pop(context);
                  _handleMenuItemSelected(index);
                },
              ),
            )
          : null,
    );
  }

  Widget _buildTopBar(BuildContext context, bool isDesktop) {
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
                  FontAwesomeIcons.tags,
                  color: AppTheme.primaryColor,
                  size: isMobile ? 20 : 24,
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    'Offers & Coupons',
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
          // Responsive create button
          if (isDesktop)
            ElevatedButton.icon(
              onPressed: () => _tabController.index == 0 
                  ? _showCreateOfferDialog() 
                  : _showCreateCouponDialog(),
              icon: const FaIcon(FontAwesomeIcons.plus, size: 16),
              label: Text(_tabController.index == 0 ? 'Create Offer' : 'Create Coupon'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            )
          else if (!isMobile)
            // Tablet: Icon button
            IconButton(
              onPressed: () => _tabController.index == 0 
                  ? _showCreateOfferDialog() 
                  : _showCreateCouponDialog(),
              icon: const FaIcon(FontAwesomeIcons.plus, size: 20),
              tooltip: _tabController.index == 0 ? 'Create Offer' : 'Create Coupon',
              color: Colors.white,
              style: IconButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.all(12),
              ),
            )
          else
            // Mobile: Small FAB
            FloatingActionButton.small(
              onPressed: () => _tabController.index == 0 
                  ? _showCreateOfferDialog() 
                  : _showCreateCouponDialog(),
              backgroundColor: AppTheme.primaryColor,
              child: const FaIcon(FontAwesomeIcons.plus, color: Colors.white, size: 20),
            ),
        ],
      ),
    );
  }

  void _handleMenuItemSelected(int index) {
    // Handle navigation based on menu selection
    switch (index) {
      case 0: // Dashboard
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const DashboardScreen()),
        );
        break;
      case 1: // Members
        Navigator.pushReplacementNamed(context, '/members');
        break;
      case 2: // Trainers
        Navigator.pushReplacementNamed(context, '/trainers');
        break;
      case 3: // Attendance
        Navigator.pushReplacementNamed(context, '/attendance');
        break;
      case 4: // Payments
        Navigator.pushReplacementNamed(context, '/payments');
        break;
      case 5: // Equipment
        Navigator.pushReplacementNamed(context, '/equipment');
        break;
      case 6: // Offers (current screen)
        break;
      case 7: // Support
        Navigator.pushReplacementNamed(context, '/support');
        break;
      case 8: // Settings
        Navigator.pushReplacementNamed(context, '/settings');
        break;
    }
  }

  Widget _buildStatsCards(bool isDesktop) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    
    return GridView.count(
      crossAxisCount: isDesktop ? 4 : 2,
      crossAxisSpacing: isMobile ? 8 : 16,
      mainAxisSpacing: isMobile ? 8 : 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: isDesktop ? 1.8 : (isMobile ? 1.6 : 1.5),
      children: [
        StatCard(
          title: 'Active Offers',
          value: _stats?.activeOffers.toString() ?? '0',
          icon: Icons.local_offer,
          color: Colors.green,
          trend: null,
        ),
        StatCard(
          title: 'Active Coupons',
          value: _stats?.activeCoupons.toString() ?? '0',
          icon: Icons.confirmation_number,
          color: Colors.blue,
          trend: null,
        ),
        StatCard(
          title: 'Total Claims',
          value: _stats?.totalClaims.toString() ?? '0',
          icon: Icons.redeem,
          color: Colors.orange,
          trend: null,
        ),
        StatCard(
          title: 'Revenue Generated',
          value: '₹${_stats?.revenue.toStringAsFixed(0) ?? '0'}',
          icon: Icons.currency_rupee,
          color: Colors.purple,
          trend: null,
        ),
      ],
    );
  }

  Widget _buildOffersTab() {
    return Column(
      children: [
        // Filters
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: _buildFilterDropdown(
                  'Status',
                  _selectedStatus,
                  ['all', 'active', 'paused', 'expired'],
                  (value) => setState(() => _selectedStatus = value ?? 'all'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildFilterDropdown(
                  'Category',
                  _selectedCategory,
                  ['all', 'membership', 'training', 'trial', 'equipment'],
                  (value) => setState(() => _selectedCategory = value ?? 'all'),
                ),
              ),
            ],
          ),
        ),
        // Offers List
        Expanded(
          child: _filteredOffers.isEmpty
              ? _buildEmptyState('No offers found', 'Create your first offer to attract more members')
              : RefreshIndicator(
                  onRefresh: _loadOffers,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredOffers.length,
                    itemBuilder: (context, index) {
                      return _buildOfferCard(_filteredOffers[index]);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildCouponsTab() {
    return _coupons.isEmpty
        ? _buildEmptyState('No coupons found', 'Create coupons to offer discounts to your members')
        : RefreshIndicator(
            onRefresh: _loadCoupons,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _coupons.length,
              itemBuilder: (context, index) {
                return _buildCouponCard(_coupons[index]);
              },
            ),
          );
  }

  Widget _buildFilterDropdown(String label, String value, List<String> items, Function(String?) onChanged) {
    return DropdownButtonFormField<String>(
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        filled: true,
        fillColor: Theme.of(context).cardColor,
      ),
      initialValue: value,
      items: items.map((item) => DropdownMenuItem(
        value: item,
        child: Text(item.toUpperCase()),
      )).toList(),
      onChanged: onChanged,
    );
  }

  Widget _buildOfferCard(GymOffer offer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _showOfferDetails(offer),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? AppTheme.primaryColor.withValues(alpha: 0.2)
                          : AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      offer.discountText,
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? offer.statusColor.withValues(alpha: 0.2)
                          : offer.statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      offer.status.toUpperCase(),
                      style: TextStyle(
                        color: offer.statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  PopupMenuButton(
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'edit',
                        child: const Row(
                          children: [Icon(Icons.edit, size: 18), SizedBox(width: 8), Text('Edit')],
                        ),
                      ),
                      PopupMenuItem(
                        value: offer.status == 'active' ? 'pause' : 'resume',
                        child: Row(
                          children: [
                            Icon(offer.status == 'active' ? Icons.pause : Icons.play_arrow, size: 18),
                            const SizedBox(width: 8),
                            Text(offer.status == 'active' ? 'Pause' : 'Resume'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [Icon(Icons.delete, size: 18, color: Colors.red), SizedBox(width: 8), Text('Delete', style: TextStyle(color: Colors.red))],
                        ),
                      ),
                    ],
                    onSelected: (value) => _handleOfferAction(offer, value.toString()),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                offer.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                offer.description,
                style: TextStyle(
                  fontSize: 14,
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(offer.categoryIcon, size: 16, color: Theme.of(context).textTheme.bodySmall?.color),
                  const SizedBox(width: 4),
                  Text(
                    offer.categoryDisplay,
                    style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.calendar_today, size: 16, color: Theme.of(context).textTheme.bodySmall?.color),
                  const SizedBox(width: 4),
                  Text(
                    offer.remainingDays,
                    style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.people, size: 16, color: Theme.of(context).textTheme.bodySmall?.color),
                  const SizedBox(width: 4),
                  Text(
                    offer.usageStatus,
                    style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                  ),
                ],
              ),
              if (offer.couponCode != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[800]
                        : Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.grey[700]!
                          : Colors.grey[300]!,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.confirmation_number, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'Code: ${offer.couponCode}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCouponCard(GymCoupon coupon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _showCouponDetails(coupon),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.green.withValues(alpha: 0.2)
                          : Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.green, width: 2, style: BorderStyle.solid),
                    ),
                    child: Text(
                      coupon.code,
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? (coupon.isValid ? Colors.green.withValues(alpha: 0.2) : Colors.red.withValues(alpha: 0.2))
                          : (coupon.isValid ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      coupon.isValid ? 'ACTIVE' : 'EXPIRED',
                      style: TextStyle(
                        color: coupon.isValid ? Colors.green : Colors.red,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  PopupMenuButton(
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [Icon(Icons.edit, size: 18), SizedBox(width: 8), Text('Edit')],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [Icon(Icons.delete, size: 18, color: Colors.red), SizedBox(width: 8), Text('Delete', style: TextStyle(color: Colors.red))],
                        ),
                      ),
                    ],
                    onSelected: (value) => _handleCouponAction(coupon, value.toString()),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                coupon.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                coupon.description,
                style: TextStyle(
                  fontSize: 13,
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? AppTheme.primaryColor.withValues(alpha: 0.2)
                          : AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      coupon.discountText,
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.timer, size: 16, color: Theme.of(context).textTheme.bodySmall?.color),
                  const SizedBox(width: 4),
                  Text(
                    coupon.remainingDays,
                    style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.people, size: 16, color: Theme.of(context).textTheme.bodySmall?.color),
                  const SizedBox(width: 4),
                  Text(
                    '${coupon.usageCount} used',
                    style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.local_offer_outlined,
            size: 80,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.grey[700]
                : Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.bodyLarge?.color?.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).textTheme.bodySmall?.color,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showOfferDetails(GymOffer offer) {
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
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[700]
                        : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? AppTheme.primaryColor.withValues(alpha: 0.2)
                          : AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      offer.discountText,
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? offer.statusColor.withValues(alpha: 0.2)
                          : offer.statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      offer.status.toUpperCase(),
                      style: TextStyle(
                        color: offer.statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                offer.title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                offer.description,
                style: TextStyle(
                  fontSize: 16,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                ),
              ),
              const SizedBox(height: 24),
              _buildDetailRow('Category', offer.categoryDisplay, offer.categoryIcon),
              _buildDetailRow('Type', offer.type.toUpperCase(), Icons.category),
              _buildDetailRow('Value', offer.value.toString(), Icons.attach_money),
              _buildDetailRow('Min Amount', '₹${offer.minAmount.toStringAsFixed(0)}', Icons.money),
              _buildDetailRow('Valid From', DateFormat('MMM dd, yyyy').format(offer.startDate), Icons.date_range),
              _buildDetailRow('Valid Until', DateFormat('MMM dd, yyyy').format(offer.endDate), Icons.event),
              _buildDetailRow('Remaining', offer.remainingDays, Icons.timer),
              _buildDetailRow('Usage', offer.usageStatus, Icons.people),
              if (offer.couponCode != null)
                _buildDetailRow('Coupon Code', offer.couponCode!, Icons.confirmation_number),
              _buildDetailRow('Revenue', '₹${offer.revenue.toStringAsFixed(0)}', Icons.currency_rupee),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _editOffer(offer);
                      },
                      icon: const Icon(Icons.edit),
                      label: const Text('Edit'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _toggleOfferStatus(offer);
                      },
                      icon: Icon(offer.status == 'active' ? Icons.pause : Icons.play_arrow),
                      label: Text(offer.status == 'active' ? 'Pause' : 'Resume'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
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

  Widget _buildDetailRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).textTheme.bodySmall?.color),
          const SizedBox(width: 12),
          Text(
            '$label:',
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).textTheme.bodySmall?.color,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  void _showCouponDetails(GymCoupon coupon) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[700]
                        : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.green.withValues(alpha: 0.2)
                      : Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green, width: 2),
                ),
                child: Center(
                  child: Text(
                    coupon.code,
                    style: const TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                      fontFamily: 'monospace',
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                coupon.title,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                coupon.description,
                style: TextStyle(
                  fontSize: 15,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                ),
              ),
              const SizedBox(height: 24),
              _buildDetailRow('Discount', coupon.discountText, Icons.local_offer),
              _buildDetailRow('Type', coupon.discountType.toUpperCase(), Icons.category),
              _buildDetailRow('Min Amount', '₹${coupon.minAmount.toStringAsFixed(0)}', Icons.money),
              if (coupon.maxDiscountAmount != null)
                _buildDetailRow('Max Discount', '₹${coupon.maxDiscountAmount!.toStringAsFixed(0)}', Icons.trending_down),
              _buildDetailRow('Expires', DateFormat('MMM dd, yyyy').format(coupon.expiryDate), Icons.event),
              _buildDetailRow('Status', coupon.remainingDays, Icons.timer),
              _buildDetailRow('Usage', '${coupon.usageCount} times', Icons.people),
              if (coupon.usageLimit != null)
                _buildDetailRow('Usage Limit', coupon.usageLimit.toString(), Icons.bar_chart),
              _buildDetailRow('New Users Only', coupon.newUsersOnly ? 'Yes' : 'No', Icons.new_releases),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _editCoupon(coupon);
                      },
                      icon: const Icon(Icons.edit),
                      label: const Text('Edit'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _deleteCoupon(coupon);
                      },
                      icon: const Icon(Icons.delete),
                      label: const Text('Delete'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
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

  void _handleOfferAction(GymOffer offer, String action) {
    switch (action) {
      case 'edit':
        _editOffer(offer);
        break;
      case 'pause':
      case 'resume':
        _toggleOfferStatus(offer);
        break;
      case 'delete':
        _deleteOffer(offer);
        break;
    }
  }

  void _handleCouponAction(GymCoupon coupon, String action) {
    switch (action) {
      case 'edit':
        _editCoupon(coupon);
        break;
      case 'delete':
        _deleteCoupon(coupon);
        break;
    }
  }

  Future<void> _toggleOfferStatus(GymOffer offer) async {
    final action = offer.status == 'active' ? 'pause' : 'resume';
    final success = await _apiService.toggleOfferStatus(offer.id, action);
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Offer ${action}d successfully')),
      );
      _loadOffers();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update offer status')),
      );
    }
  }

  Future<void> _deleteOffer(GymOffer offer) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Offer'),
        content: Text('Are you sure you want to delete "${offer.title}"?'),
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

    if (confirm == true) {
      final success = await _apiService.deleteOffer(offer.id);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offer deleted successfully')),
        );
        _loadOffers();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete offer')),
        );
      }
    }
  }

  Future<void> _deleteCoupon(GymCoupon coupon) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Coupon'),
        content: Text('Are you sure you want to delete coupon "${coupon.code}"?'),
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

    if (confirm == true) {
      final success = await _apiService.deleteCoupon(coupon.id);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Coupon deleted successfully')),
        );
        _loadCoupons();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete coupon')),
        );
      }
    }
  }

  void _editOffer(GymOffer offer) {
    _showOfferDialog(offer);
  }

  void _editCoupon(GymCoupon coupon) {
    _showCouponDialog(coupon);
  }

  void _showCreateOfferDialog() {
    _showOfferDialog(null);
  }

  void _showCreateCouponDialog() {
    _showCouponDialog(null);
  }

  void _showOfferDialog(GymOffer? offer) {
    final isEdit = offer != null;
    final titleController = TextEditingController(text: offer?.title ?? '');
    final descriptionController = TextEditingController(text: offer?.description ?? '');
    final valueController = TextEditingController(text: offer != null ? offer.value.toString() : '');
    final minAmountController = TextEditingController(text: offer != null ? offer.minAmount.toString() : '');
    final couponCodeController = TextEditingController(text: offer?.couponCode ?? '');
    final maxUsesController = TextEditingController(text: offer != null && offer.maxUses != null ? offer.maxUses.toString() : '');
    
    String selectedType = offer?.type ?? 'percentage';
    String selectedCategory = offer?.category ?? 'membership';
    String? selectedTemplateId = offer?.templateId ?? 'modern_gradient';
    DateTime? startDate = offer?.startDate;
    DateTime? endDate = offer?.endDate;
    List<String> features = List.from(offer?.features ?? []);
    final featureController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(isEdit ? 'Edit Offer' : 'Create New Offer'),
          content: SizedBox(
            width: MediaQuery.of(context).size.width * 0.9,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Offer Title *',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description *',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 24),
                  // Carousel Template Selector
                  OfferCarouselTemplateSelector(
                    selectedTemplateId: selectedTemplateId,
                    onTemplateSelected: (templateId) {
                      setState(() => selectedTemplateId = templateId);
                    },
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedType,
                          decoration: const InputDecoration(
                            labelText: 'Discount Type',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'percentage', child: Text('Percentage')),
                            DropdownMenuItem(value: 'fixed', child: Text('Fixed Amount')),
                            DropdownMenuItem(value: 'trial', child: Text('Free Trial')),
                          ],
                          onChanged: (value) {
                            setState(() => selectedType = value!);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: valueController,
                          decoration: InputDecoration(
                            labelText: selectedType == 'percentage' ? 'Discount %' : 'Amount',
                            border: const OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedCategory,
                          decoration: const InputDecoration(
                            labelText: 'Category',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'membership', child: Text('Membership')),
                            DropdownMenuItem(value: 'training', child: Text('Training')),
                            DropdownMenuItem(value: 'trial', child: Text('Trial')),
                            DropdownMenuItem(value: 'equipment', child: Text('Equipment')),
                          ],
                          onChanged: (value) {
                            setState(() => selectedCategory = value!);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: minAmountController,
                          decoration: const InputDecoration(
                            labelText: 'Min Purchase (₹)',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: couponCodeController,
                    decoration: const InputDecoration(
                      labelText: 'Coupon Code (Optional)',
                      border: OutlineInputBorder(),
                      hintText: 'e.g., SPECIAL50',
                    ),
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: maxUsesController,
                    decoration: const InputDecoration(
                      labelText: 'Max Uses Per User',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.calendar_today),
                          label: Text(
                            startDate == null 
                                ? 'Start Date *' 
                                : DateFormat('dd MMM yyyy').format(startDate!),
                          ),
                          onPressed: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: startDate ?? DateTime.now(),
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (date != null) {
                              setState(() => startDate = date);
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.calendar_today),
                          label: Text(
                            endDate == null 
                                ? 'End Date *' 
                                : DateFormat('dd MMM yyyy').format(endDate!),
                          ),
                          onPressed: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: endDate ?? DateTime.now().add(const Duration(days: 30)),
                              firstDate: startDate ?? DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (date != null) {
                              setState(() => endDate = date);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Key Features:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (features.isNotEmpty)
                    Wrap(
                      spacing: 8,
                      children: features.map((feature) => Chip(
                        label: Text(feature),
                        onDeleted: () {
                          setState(() => features.remove(feature));
                        },
                      )).toList(),
                    ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: featureController,
                          decoration: const InputDecoration(
                            labelText: 'Add Feature',
                            border: OutlineInputBorder(),
                          ),
                          onSubmitted: (value) {
                            if (value.isNotEmpty) {
                              setState(() {
                                features.add(value);
                                featureController.clear();
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () {
                          if (featureController.text.isNotEmpty) {
                            setState(() {
                              features.add(featureController.text);
                              featureController.clear();
                            });
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleController.text.isEmpty || 
                    descriptionController.text.isEmpty ||
                    valueController.text.isEmpty ||
                    startDate == null ||
                    endDate == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please fill all required fields')),
                  );
                  return;
                }

                final data = {
                  'title': titleController.text,
                  'description': descriptionController.text,
                  'type': selectedType,
                  'value': double.parse(valueController.text),
                  'category': selectedCategory,
                  'templateId': selectedTemplateId,
                  'startDate': startDate!.toIso8601String(),
                  'endDate': endDate!.toIso8601String(),
                  if (minAmountController.text.isNotEmpty) 
                    'minAmount': double.parse(minAmountController.text),
                  if (couponCodeController.text.isNotEmpty) 
                    'couponCode': couponCodeController.text,
                  if (maxUsesController.text.isNotEmpty) 
                    'maxUses': int.parse(maxUsesController.text),
                  'features': features,
                  'gymId': _gymId,
                };

                try {
                  final success = isEdit
                      ? await _apiService.updateOffer(offer.id, data)
                      : await _apiService.createOffer(data);

                  if (!mounted) return;
                  Navigator.pop(context);

                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Offer ${isEdit ? 'updated' : 'created'} successfully')),
                    );
                    _loadOffers();
                    _loadStats();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to ${isEdit ? 'update' : 'create'} offer')),
                    );
                  }
                } catch (e) {
                  if (!mounted) return;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: ${e.toString()}')),
                  );
                }
              },
              child: Text(isEdit ? 'Update' : 'Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCouponDialog(GymCoupon? coupon) {
    final isEdit = coupon != null;
    final codeController = TextEditingController(text: coupon?.code ?? '');
    final titleController = TextEditingController(text: coupon?.title ?? '');
    final descriptionController = TextEditingController(text: coupon?.description ?? '');
    final valueController = TextEditingController(text: coupon != null ? coupon.discountValue.toString() : '');
    final minAmountController = TextEditingController(text: coupon != null ? coupon.minAmount.toString() : '');
    final maxDiscountController = TextEditingController(text: coupon != null && coupon.maxDiscountAmount != null ? coupon.maxDiscountAmount.toString() : '');
    final maxUsesController = TextEditingController(text: coupon != null ? coupon.userUsageLimit.toString() : '');
    
    String selectedType = coupon?.discountType ?? 'percentage';
    DateTime? expiryDate = coupon?.expiryDate;
    bool newUsersOnly = coupon?.newUsersOnly ?? false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(isEdit ? 'Edit Coupon' : 'Create New Coupon'),
          content: SizedBox(
            width: 600,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: codeController,
                    decoration: const InputDecoration(
                      labelText: 'Coupon Code *',
                      border: OutlineInputBorder(),
                      hintText: 'e.g., WELCOME50',
                    ),
                    enabled: !isEdit,
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Title *',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description *',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedType,
                          decoration: const InputDecoration(
                            labelText: 'Discount Type',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'percentage', child: Text('Percentage')),
                            DropdownMenuItem(value: 'fixed', child: Text('Fixed Amount')),
                          ],
                          onChanged: (value) {
                            setState(() => selectedType = value!);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: valueController,
                          decoration: InputDecoration(
                            labelText: selectedType == 'percentage' ? 'Discount % *' : 'Amount *',
                            border: const OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: minAmountController,
                          decoration: const InputDecoration(
                            labelText: 'Min Purchase (₹)',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: maxDiscountController,
                          decoration: const InputDecoration(
                            labelText: 'Max Discount (₹)',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: maxUsesController,
                    decoration: const InputDecoration(
                      labelText: 'Max Uses Per User',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today),
                    label: Text(
                      expiryDate == null 
                          ? 'Expiry Date *' 
                          : DateFormat('dd MMM yyyy').format(expiryDate!),
                    ),
                    onPressed: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: expiryDate ?? DateTime.now().add(const Duration(days: 30)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (date != null) {
                        setState(() => expiryDate = date);
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  CheckboxListTile(
                    title: const Text('New Users Only'),
                    subtitle: const Text('Restrict this coupon to new members only'),
                    value: newUsersOnly,
                    onChanged: (value) {
                      setState(() => newUsersOnly = value ?? false);
                    },
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (codeController.text.isEmpty || 
                    titleController.text.isEmpty ||
                    descriptionController.text.isEmpty ||
                    valueController.text.isEmpty ||
                    expiryDate == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please fill all required fields')),
                  );
                  return;
                }

                final data = {
                  'code': codeController.text,
                  'title': titleController.text,
                  'description': descriptionController.text,
                  'discountType': selectedType,
                  'discountValue': double.parse(valueController.text),
                  'expiryDate': expiryDate?.toIso8601String() ?? DateTime.now().add(const Duration(days: 30)).toIso8601String(),
                  'newUsersOnly': newUsersOnly,
                  if (minAmountController.text.isNotEmpty) 
                    'minAmount': double.parse(minAmountController.text),
                  if (maxDiscountController.text.isNotEmpty) 
                    'maxDiscountAmount': double.parse(maxDiscountController.text),
                  if (maxUsesController.text.isNotEmpty) 
                    'userUsageLimit': int.parse(maxUsesController.text),
                  'gymId': _gymId,
                };

                try {
                  final success = isEdit
                      ? await _apiService.updateCoupon(coupon.id, data)
                      : await _apiService.createCoupon(data);

                  if (!mounted) return;
                  Navigator.pop(context);

                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Coupon ${isEdit ? 'updated' : 'created'} successfully')),
                    );
                    _loadCoupons();
                    _loadStats();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to ${isEdit ? 'update' : 'create'} coupon')),
                    );
                  }
                } catch (e) {
                  if (!mounted) return;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: ${e.toString()}')),
                  );
                }
              },
              child: Text(isEdit ? 'Update' : 'Create'),
            ),
          ],
        ),
      ),
    );
  }
}
