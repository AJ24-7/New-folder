import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_picker/file_picker.dart';

import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../models/member.dart';
import '../../models/membership_plan.dart';
import '../../models/gym_activity.dart';
import '../../services/member_service.dart';
import '../../services/gym_service.dart';
import '../../services/cloudinary_service.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/sidebar_menu.dart';
import '../support/support_screen.dart';
import '../equipment/equipment_screen.dart';
import '../offers/offers_screen.dart';
import '../../utils/icon_mapper.dart';

class MembersScreen extends StatefulWidget {
  const MembersScreen({super.key});

  @override
  State<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends State<MembersScreen> {
  final MemberService _memberService = MemberService();
  final GymService _gymService = GymService();
  final CloudinaryService _cloudinaryService = CloudinaryService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final TextEditingController _searchController = TextEditingController();
  final _currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
  final _dateFormat = DateFormat('dd MMM yyyy');
  
  List<Member> _allMembers = [];
  List<Member> _filteredMembers = [];
  List<Member> _activeMembers = [];
  List<Member> _expiredMembers = [];
  MembershipPlan? _membershipPlan;
  List<GymActivity> _gymActivities = [];
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  String _expiryFilter = '';
  int _selectedIndex = 1; // Members tab

  @override
  void initState() {
    super.initState();
    _loadMembers();
    _loadMembershipPlan();
    _loadGymActivities();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMembershipPlan() async {
    try {
      final plan = await _gymService.getMembershipPlans();
      if (mounted && plan != null) {
        setState(() => _membershipPlan = plan);
      }
    } catch (_) {}
  }

  Future<void> _loadGymActivities() async {
    try {
      final activities = await _gymService.getGymActivities();
      if (mounted && activities.isNotEmpty) {
        setState(() => _gymActivities = activities);
      }
    } catch (_) {}
  }

  Future<void> _loadMembers() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final members = await _memberService.getMembers();
      setState(() {
        _allMembers = members;
        _filteredMembers = members;
        _splitMembersByStatus();
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

  void _splitMembersByStatus() {
    _activeMembers = _filteredMembers.where((m) => !_isMemberExpired(m)).toList();
    _expiredMembers = _filteredMembers.where((m) => _isMemberExpired(m)).toList();
  }

  bool _isMemberExpired(Member member) {
    if (member.membershipValidUntil == null) return false;
    final validUntil = member.membershipValidUntil!;
    final validDate = DateTime(validUntil.year, validUntil.month, validUntil.day);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    return validDate.isBefore(todayDate);
  }

  bool _isMemberExpiringSoon(Member member) {
    if (member.membershipValidUntil == null) return false;
    if (_isMemberExpired(member)) return false;
    final validUntil = member.membershipValidUntil!;
    final validDate = DateTime(validUntil.year, validUntil.month, validUntil.day);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    final daysUntilExpiry = validDate.difference(todayDate).inDays;
    return daysUntilExpiry <= 7;
  }

  void _onSearchChanged(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredMembers = _applyExpiryFilter(_allMembers);
      } else {
        final lowerQuery = query.toLowerCase();
        _filteredMembers = _allMembers.where((member) {
          return member.memberName.toLowerCase().contains(lowerQuery) ||
                 member.email.toLowerCase().contains(lowerQuery) ||
                 member.phone.contains(query) ||
                 (member.membershipId?.toLowerCase().contains(lowerQuery) ?? false);
        }).toList();
        _filteredMembers = _applyExpiryFilter(_filteredMembers);
      }
      _splitMembersByStatus();
    });
  }

  List<Member> _applyExpiryFilter(List<Member> members) {
    if (_expiryFilter.isEmpty) return members;
    return _memberService.filterMembersByExpiry(members, _expiryFilter);
  }

  void _onExpiryFilterChanged(String? filter) {
    setState(() {
      _expiryFilter = filter ?? '';
      _filteredMembers = _applyExpiryFilter(_allMembers);
      _splitMembersByStatus();
    });
  }

  void _showAddMemberDialog() {
    showDialog(
      context: context,
      builder: (context) => _AddMemberDialog(
        membershipPlan: _membershipPlan,
        gymActivities: _gymActivities,
        onMemberAdded: () {
          _loadMembers();
        },
      ),
    );
  }

  void _showRemoveMembersMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Remove Members',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: const FaIcon(FontAwesomeIcons.userSlash, color: AppTheme.errorColor),
              title: const Text('Remove Expired (7+ days)'),
              subtitle: const Text('Members whose membership expired over 7 days ago'),
              onTap: () {
                Navigator.pop(context);
                _showRemoveExpiredConfirmation(days: 7);
              },
            ),
            ListTile(
              leading: const FaIcon(FontAwesomeIcons.userXmark, color: AppTheme.errorColor),
              title: const Text('Remove Expired (30+ days)'),
              subtitle: const Text('Members whose membership expired over 30 days ago'),
              onTap: () {
                Navigator.pop(context);
                _showRemoveExpiredConfirmation(days: 30);
              },
            ),
            ListTile(
              leading: const FaIcon(FontAwesomeIcons.userGear, color: AppTheme.primaryColor),
              title: const Text('Custom Remove'),
              subtitle: const Text('Select individual members to remove'),
              onTap: () {
                Navigator.pop(context);
                _showCustomRemoveDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showImportMembersDialog() {
    showDialog(
      context: context,
      builder: (context) => _ImportMembersDialog(
        onImported: _loadMembers,
      ),
    );
  }

  void _showRemoveExpiredConfirmation({required int days}) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Expired Members'),
        content: Text(
          'Remove all members whose membership expired more than $days days ago?\n\nThis action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _removeExpiredMembers(days: days);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  Future<void> _removeExpiredMembers({required int days}) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final result = await _memberService.removeExpiredMembers(days: days);
      
      if (mounted) Navigator.pop(context);

      if (result['success']) {
        _showSuccessSnackBar(
          '${result['deletedCount']} expired member(s) removed successfully',
        );
        _loadMembers();
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      _showErrorSnackBar('Error removing expired members: $e');
    }
  }

  void _showCustomRemoveDialog() {
    showDialog(
      context: context,
      builder: (context) => _CustomRemoveMembersDialog(
        members: _allMembers,
        onMembersRemoved: () {
          _loadMembers();
        },
      ),
    );
  }

  void _showMemberDetails(Member member) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => _MemberDetailsSheet(
          member: member,
          scrollController: scrollController,
          onUpdate: _loadMembers,
        ),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
      ),
    );
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return;
    
    // Navigate to different screens based on index
    // Using pushReplacementNamed to properly replace current screen
    switch (index) {
      case 0: // Home
        Navigator.pushReplacementNamed(context, '/dashboard');
        break;
      case 1: // Members
        // Already on members screen, do nothing
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
        Navigator.pushReplacementNamed(context, '/payments');
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
        // Navigate to Support screen with proper screen replacement
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
              memberCount: _allMembers.length,
            ),
          Expanded(
            child: Column(
              children: [
                _buildTopBar(context, l10n, isDesktop),
                Expanded(
                  child: _buildContent(context, l10n, isDesktop),
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
                memberCount: _allMembers.length,
              ),
            )
          : null,
    );
  }

  Widget _buildTopBar(BuildContext context, AppLocalizations l10n, bool isDesktop) {
    final topPadding = MediaQuery.of(context).padding.top;
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    final isTablet = size.width > 600 && size.width <= 900;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(
        top: isDesktop ? 24 : (topPadding > 0 ? topPadding + 8 : 16),
        bottom: isDesktop ? 24 : 16,
        left: isDesktop ? 24 : 12,
        right: isDesktop ? 24 : 12,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF3730A3), const Color(0xFF5B21B6)]
              : [AppTheme.primaryColor, AppTheme.secondaryColor],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.35),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          if (!isDesktop)
            IconButton(
              icon: const FaIcon(FontAwesomeIcons.bars, size: 24, color: Colors.white),
              onPressed: () => _scaffoldKey.currentState?.openDrawer(),
              padding: const EdgeInsets.all(8),
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            ),
          Expanded(
            child: Row(
              children: [
                FaIcon(
                  FontAwesomeIcons.users,
                  color: Colors.white,
                  size: isMobile ? 20 : 24,
                ),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    'All Members',
                    style: TextStyle(
                      fontSize: isMobile ? 18 : 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Responsive action buttons
          if (isDesktop) ...[
            ElevatedButton.icon(
              onPressed: _showAddMemberDialog,
              icon: const FaIcon(FontAwesomeIcons.userPlus, size: 16),
              label: const Text('Add Member'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _showRemoveMembersMenu,
              icon: const FaIcon(FontAwesomeIcons.userMinus, size: 16),
              label: const Text('Remove Members'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.white70),
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _showImportMembersDialog,
              icon: const FaIcon(FontAwesomeIcons.fileArrowUp, size: 16),
              label: const Text('Upload Members'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.white70),
              ),
            ),
          ] else if (isTablet) ...[
            // Tablet: Show compact icon buttons
            IconButton(
              onPressed: _showAddMemberDialog,
              icon: const FaIcon(FontAwesomeIcons.userPlus, size: 20),
              tooltip: 'Add Member',
              color: AppTheme.primaryColor,
              style: IconButton.styleFrom(
                backgroundColor: Colors.white,
                padding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _showRemoveMembersMenu,
              icon: const FaIcon(FontAwesomeIcons.userMinus, size: 20),
              tooltip: 'Remove Members',
              color: Colors.white,
              style: IconButton.styleFrom(
                backgroundColor: AppTheme.errorColor.withValues(alpha: 0.85),
                padding: const EdgeInsets.all(12),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _showImportMembersDialog,
              icon: const FaIcon(FontAwesomeIcons.fileArrowUp, size: 20),
              tooltip: 'Upload Members',
              color: AppTheme.primaryColor,
              style: IconButton.styleFrom(
                backgroundColor: Colors.white,
                padding: const EdgeInsets.all(12),
              ),
            ),
          ] else ...[
            // Mobile: Show menu with actions
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: Colors.white),
              tooltip: 'More actions',
              onSelected: (value) {
                switch (value) {
                  case 'add':
                    _showAddMemberDialog();
                    break;
                  case 'remove':
                    _showRemoveMembersMenu();
                    break;
                  case 'import':
                    _showImportMembersDialog();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'add',
                  child: Row(
                    children: [
                      FaIcon(FontAwesomeIcons.userPlus, size: 18),
                      SizedBox(width: 12),
                      Text('Add Member'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'remove',
                  child: Row(
                    children: [
                      FaIcon(
                        FontAwesomeIcons.userMinus,
                        size: 18,
                        color: AppTheme.errorColor,
                      ),
                      SizedBox(width: 12),
                      Text('Remove Members'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'import',
                  child: Row(
                    children: [
                      FaIcon(FontAwesomeIcons.fileArrowUp, size: 18),
                      SizedBox(width: 12),
                      Text('Upload Members'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, AppLocalizations l10n, bool isDesktop) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_hasError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text(_errorMessage),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMembers,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMembers,
      child: Column(
        children: [
          _buildSearchBar(),
          Expanded(
            child: _filteredMembers.isEmpty
                ? const Center(child: Text('No members found'))
                : _buildMembersListWithSections(l10n, isDesktop),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search by Name, Email, Phone, Membership ID...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
            ),
          ),
          const SizedBox(width: 16),
          DropdownButton<String>(
            value: _expiryFilter.isEmpty ? null : _expiryFilter,
            hint: const Text('All Members'),
            items: const [
              DropdownMenuItem(value: '', child: Text('All Members')),
              DropdownMenuItem(value: '3days', child: Text('Expiring in 3 Days')),
              DropdownMenuItem(value: '1day', child: Text('Expiring in 1 Day')),
            ],
            onChanged: _onExpiryFilterChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildMembersListWithSections(AppLocalizations l10n, bool isDesktop) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Active Members Section
          if (_activeMembers.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    l10n.activeMembers,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_activeMembers.length}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.successColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            _buildMembersListView(_activeMembers, isDesktop),
          ],
          
          // Expired Members Section
          if (_expiredMembers.isNotEmpty) ...[
            const SizedBox(height: 24),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.errorColor.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.errorColor.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: AppTheme.errorColor,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        l10n.expiredMembers,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.errorColor,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.errorColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${_expiredMembers.length}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.errorColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildMembersListView(_expiredMembers, isDesktop),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
          
          if (_expiredMembers.isEmpty && _activeMembers.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No members found'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMembersListView(List<Member> members, bool isDesktop) {
    if (isDesktop) {
      return _buildMembersTable(members);
    } else {
      return _buildMembersMobileList(members);
    }
  }

  Widget _buildMembersMobileList(List<Member> members) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: members.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final member = members[index];
        return Material(
          color: member.currentlyFrozen
              ? Colors.yellow.shade50
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _showMemberDetails(member),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  _buildProfileImage(member),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          member.memberName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _currencyFormat.format(member.paymentAmount),
                          style: TextStyle(
                            fontSize: 13,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Valid Until',
                        style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 2),
                      _buildValidUntilCell(member),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMembersTable(List<Member> members) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Profile')),
          DataColumn(label: Text('Name')),
          DataColumn(label: Text('Status')),
          DataColumn(label: Text('Membership ID')),
          DataColumn(label: Text('Age')),
          DataColumn(label: Text('Gender')),
          DataColumn(label: Text('Phone')),
          DataColumn(label: Text('Email')),
          DataColumn(label: Text('Plan')),
          DataColumn(label: Text('Monthly')),
          DataColumn(label: Text('Valid Until')),
          DataColumn(label: Text('Amount Paid')),
          DataColumn(label: Text('Actions')),
        ],
        rows: members.map((member) {
          return DataRow(
              color: WidgetStateProperty.resolveWith<Color?>((Set<WidgetState> states) {
                if (member.currentlyFrozen) {
                  return Colors.yellow.shade50;
                }
                return null; // Use default color
              }),
              cells: [
                DataCell(_buildProfileImage(member)),
                DataCell(Text(member.memberName)),
                DataCell(_buildStatusBadge(member)),
                DataCell(Text(member.membershipId ?? 'N/A')),
                DataCell(Text(member.age.toString())),
                DataCell(Text(member.gender)),
                DataCell(Text(member.phone)),
                DataCell(Text(member.email)),
                DataCell(Text(member.planSelected)),
                DataCell(Text(member.monthlyPlan)),
                DataCell(_buildValidUntilCell(member)),
                DataCell(Text(_currencyFormat.format(member.paymentAmount))),
                DataCell(_buildActionButtons(member)),
              ],
              onSelectChanged: (_) => _showMemberDetails(member),
            );
          }).toList(),
      ),
    );
  }

  Widget _buildMembersGrid(List<Member> members) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: members.length,
      itemBuilder: (context, index) {
        final member = members[index];
        return _buildMemberCard(member);
      },
    );
  }

  Widget _buildMemberCard(Member member) {
    return Card(
      elevation: 2,
      color: member.currentlyFrozen ? Colors.yellow.shade50 : null,
      child: InkWell(
        onTap: () => _showMemberDetails(member),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(child: _buildProfileImage(member)),
                  const SizedBox(height: 8),
                  Text(
                    member.memberName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    member.membershipId ?? 'N/A',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
                  ),
                  const Spacer(),
                  _buildValidUntilCell(member),
                  const SizedBox(height: 4),
                  Text(
                    _currencyFormat.format(member.paymentAmount),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.successColor,
                    ),
                  ),
                ],
              ),
            ),
            // Frozen membership badge - Yellow highlight
            if (member.currentlyFrozen)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.yellow.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.orange.shade400, width: 1.5),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.ac_unit, size: 14, color: Colors.orange.shade700),
                      const SizedBox(width: 4),
                      Text(
                        'FROZEN',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileImage(Member member) {
    if (member.profileImage != null && member.profileImage!.isNotEmpty) {
      return CircleAvatar(
        radius: 24,
        backgroundColor: AppTheme.primaryColor,
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: _cloudinaryService.getThumbnailUrl(member.profileImage!, size: 48),
            fit: BoxFit.cover,
            width: 48,
            height: 48,
            placeholder: (context, url) => const CircularProgressIndicator(strokeWidth: 2),
            errorWidget: (context, url, error) => Text(
              member.memberName[0].toUpperCase(),
              style: TextStyle(color: Theme.of(context).colorScheme.onPrimary, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      );
    }
    
    return CircleAvatar(
      radius: 24,
      backgroundColor: AppTheme.primaryColor,
      child: Text(
        member.memberName[0].toUpperCase(),
        style: TextStyle(color: Theme.of(context).colorScheme.onPrimary, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildStatusBadge(Member member) {
    if (member.currentlyFrozen) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.orange.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.shade700, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.ac_unit,
              size: 14,
              color: Colors.orange.shade900,
            ),
            const SizedBox(width: 4),
            Text(
              'Frozen',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.orange.shade900,
              ),
            ),
          ],
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.check_circle,
            size: 14,
            color: AppTheme.successColor,
          ),
          const SizedBox(width: 4),
          Text(
            'Active',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.successColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildValidUntilCell(Member member) {
    if (member.membershipValidUntil == null) {
      return const Text('N/A');
    }

    final isExpired = _isMemberExpired(member);
    final isExpiringSoon = _isMemberExpiringSoon(member);
    
    Color color = AppTheme.successColor;
    if (isExpired) {
      color = AppTheme.errorColor;
    } else if (isExpiringSoon) {
      color = AppTheme.warningColor;
    }

    return Text(
      _dateFormat.format(member.membershipValidUntil!),
      style: TextStyle(color: color, fontWeight: FontWeight.w600),
    );
  }

  Widget _buildActionButtons(Member member) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const FaIcon(FontAwesomeIcons.penToSquare, size: 16),
          onPressed: () => _showMemberDetails(member),
          tooltip: 'View/Edit',
        ),
        IconButton(
          icon: const FaIcon(FontAwesomeIcons.arrowRotateRight, size: 16),
          onPressed: () => _showRenewDialog(member),
          tooltip: 'Renew',
        ),
      ],
    );
  }

  void _showRenewDialog(Member member) {
    showDialog(
      context: context,
      builder: (context) => _RenewMembershipDialog(
        member: member,
        membershipPlan: _membershipPlan,
        gymActivities: _gymActivities,
        onRenewed: _loadMembers,
      ),
    );
  }
}

// Add Member Dialog Widget
class _AddMemberDialog extends StatefulWidget {
  final VoidCallback onMemberAdded;
  final MembershipPlan? membershipPlan;
  final List<GymActivity> gymActivities;

  const _AddMemberDialog({
    required this.onMemberAdded,
    this.membershipPlan,
    this.gymActivities = const [],
  });

  @override
  State<_AddMemberDialog> createState() => _AddMemberDialogState();
}

class _AddMemberDialogState extends State<_AddMemberDialog> {
  final _formKey = GlobalKey<FormState>();
  final _memberService = MemberService();
  
  // Form controllers
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _amountController = TextEditingController(text: '0');
  
  String _gender = 'Male';
  String _paymentMode = 'Cash';
  String _plan = 'Basic';
  String _duration = '1 Month';
  double _paymentAmount = 0;
  Set<String> _selectedActivities = {};
  XFile? _profileImage;
  Uint8List? _profileImageBytes;
  bool _isSubmitting = false;

  bool get _isMultiTier => widget.membershipPlan?.isMultiTier ?? false;

  // Duration options from the gym's actual membership plan, fallback to hardcoded
  List<Map<String, dynamic>> get _durationOptions {
    final plan = widget.membershipPlan;
    if (plan != null) {
      // Multi-tier: use the selected tier's options
      if (plan.isMultiTier && plan.tiers.isNotEmpty) {
        final tier = plan.tiers.firstWhere((t) => t.name == _plan, orElse: () => plan.tiers.first);
        if (tier.monthlyOptions.isNotEmpty) {
          return tier.monthlyOptions.map((opt) {
            final label = opt.months == 1 ? '1 Month' : opt.months == 12 ? '12 Months' : '${opt.months} Months';
            return <String, dynamic>{'value': label, 'months': opt.months, 'price': opt.finalPrice, 'discount': opt.discount, 'isPopular': opt.isPopular};
          }).toList();
        }
      }
      // Single-tier: use top-level monthlyOptions
      if (plan.monthlyOptions.isNotEmpty) {
        return plan.monthlyOptions.map((opt) {
          final label = opt.months == 1 ? '1 Month' : opt.months == 12 ? '12 Months' : '${opt.months} Months';
          return <String, dynamic>{'value': label, 'months': opt.months, 'price': opt.finalPrice, 'discount': opt.discount, 'isPopular': opt.isPopular};
        }).toList();
      }
    }
    return <Map<String, dynamic>>[
      <String, dynamic>{'value': '1 Month', 'months': 1, 'price': 0.0},
      <String, dynamic>{'value': '3 Months', 'months': 3, 'price': 0.0},
      <String, dynamic>{'value': '6 Months', 'months': 6, 'price': 0.0},
      <String, dynamic>{'value': '12 Months', 'months': 12, 'price': 0.0},
    ];
  }

  // Resolve which activities to show as chips
  List<GymActivity> get _activityOptions {
    if (widget.gymActivities.isNotEmpty) return widget.gymActivities;
    return PredefinedActivities.all;
  }

  @override
  void initState() {
    super.initState();
    // Lock plan name in single-tier mode; use first tier name in multi-tier mode
    if (widget.membershipPlan != null) {
      if (_isMultiTier && widget.membershipPlan!.tiers.isNotEmpty) {
        _plan = widget.membershipPlan!.tiers.first.name;
      } else if (!_isMultiTier) {
        _plan = widget.membershipPlan!.name;
      }
    }
    // Pre-select first duration and auto-fill its price
    if (_durationOptions.isNotEmpty) {
      _duration = _durationOptions.first['value'] as String;
      _autoFillAmount();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  void _autoFillAmount() {
    final selected = _durationOptions.firstWhere(
      (opt) => opt['value'] == _duration,
      orElse: () => <String, dynamic>{'price': 0.0},
    );
    final price = (selected['price'] as num).toDouble();
    if (price > 0) {
      setState(() {
        _paymentAmount = price;
        _amountController.text = price.toStringAsFixed(0);
      });
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      final bytes = await pickedFile.readAsBytes();
      setState(() {
        _profileImage = pickedFile;
        _profileImageBytes = bytes;
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedActivities.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one activity'), backgroundColor: AppTheme.errorColor),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await _memberService.addMember(
        memberName: _nameController.text,
        age: int.parse(_ageController.text),
        gender: _gender,
        phone: _phoneController.text,
        email: _emailController.text,
        paymentMode: _paymentMode,
        paymentAmount: _paymentAmount,
        planSelected: _plan,
        monthlyPlan: _duration,
        activityPreference: _selectedActivities.join(', '),
        address: _addressController.text.isEmpty ? null : _addressController.text,
        profileImage: _profileImage,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Member added successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        widget.onMemberAdded();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding member: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          FaIcon(FontAwesomeIcons.userPlus, color: AppTheme.primaryColor),
          SizedBox(width: 12),
          Text('Add New Member'),
        ],
      ),
      content: SizedBox(
        width: 600,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Profile Image ────────────────────────────
                Center(
                  child: InkWell(
                    onTap: _pickImage,
                    child: CircleAvatar(
                      radius: 48,
                      backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                      backgroundImage: _profileImageBytes != null ? MemoryImage(_profileImageBytes!) : null,
                      child: _profileImageBytes == null
                          ? const FaIcon(FontAwesomeIcons.camera, size: 32, color: AppTheme.primaryColor)
                          : null,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Center(
                  child: Text('Tap to add photo', style: TextStyle(fontSize: 12, color: Colors.grey)),
                ),
                const SizedBox(height: 20),

                // ── Name ─────────────────────────────────────
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name *',
                    prefixIcon: Icon(Icons.person_outline),
                    border: OutlineInputBorder(),
                  ),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 14),

                // ── Age & Gender ──────────────────────────────
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _ageController,
                        decoration: const InputDecoration(
                          labelText: 'Age *',
                          prefixIcon: Icon(Icons.cake_outlined),
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Required';
                          final age = int.tryParse(v);
                          if (age == null || age < 1 || age > 120) return 'Invalid';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _gender,
                        decoration: const InputDecoration(
                          labelText: 'Gender *',
                          prefixIcon: Icon(Icons.wc_outlined),
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Male', child: Text('Male')),
                          DropdownMenuItem(value: 'Female', child: Text('Female')),
                          DropdownMenuItem(value: 'Other', child: Text('Other')),
                        ],
                        onChanged: (v) => setState(() => _gender = v!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // ── Phone ─────────────────────────────────────
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone *',
                    prefixIcon: Icon(Icons.phone_outlined),
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 14),

                // ── Email ─────────────────────────────────────
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email *',
                    prefixIcon: Icon(Icons.email_outlined),
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Required';
                    if (!v.contains('@')) return 'Invalid email';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // ── Address ───────────────────────────────────
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    labelText: 'Address',
                    prefixIcon: Icon(Icons.location_on_outlined),
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 14),

                // ── Membership Plan ────────────────────────────
                if (_isMultiTier) ...[
                  DropdownButtonFormField<String>(
                    initialValue: _plan,
                    decoration: const InputDecoration(
                      labelText: 'Membership Tier *',
                      prefixIcon: Icon(Icons.card_membership_outlined),
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Basic', child: Text('Basic')),
                      DropdownMenuItem(value: 'Standard', child: Text('Standard')),
                      DropdownMenuItem(value: 'Premium', child: Text('Premium')),
                    ],
                    onChanged: (v) => setState(() => _plan = v!),
                  ),
                ] else ...[
                  // Single plan – show locked chip
                  InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Membership Plan',
                      prefixIcon: Icon(Icons.card_membership_outlined),
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              FaIcon(FontAwesomeIcons.star, size: 12, color: AppTheme.primaryColor),
                              const SizedBox(width: 6),
                              Text(
                                _plan,
                                style: TextStyle(
                                  color: AppTheme.primaryColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.lock_outline, size: 12, color: AppTheme.primaryColor),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 14),

                // ── Duration ──────────────────────────────────
                DropdownButtonFormField<String>(
                  initialValue: _duration,
                  decoration: const InputDecoration(
                    labelText: 'Duration *',
                    prefixIcon: Icon(Icons.calendar_month_outlined),
                    border: OutlineInputBorder(),
                  ),
                  items: _durationOptions.map((opt) {
                    final label = opt['value'] as String;
                    final price = (opt['price'] as num).toDouble();
                    final isPopular = opt['isPopular'] == true;
                    final discount = opt['discount'] as int? ?? 0;
                    return DropdownMenuItem<String>(
                      value: label,
                      child: Row(
                        children: [
                          Text(label),
                          if (price > 0) ...[
                            const SizedBox(width: 6),
                            Text('– ₹${price.toStringAsFixed(0)}',
                                style: const TextStyle(color: AppTheme.successColor, fontSize: 11, fontWeight: FontWeight.w600)),
                          ],
                          if (discount > 0) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: AppTheme.successColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text('$discount% off',
                                  style: const TextStyle(color: AppTheme.successColor, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
                          if (isPopular) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('Popular',
                                  style: TextStyle(color: AppTheme.primaryColor, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (v) {
                    setState(() => _duration = v!);
                    _autoFillAmount();
                  },
                ),
                const SizedBox(height: 14),

                // ── Payment Mode & Amount ─────────────────────
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _paymentMode,
                        decoration: const InputDecoration(
                          labelText: 'Payment Mode *',
                          prefixIcon: Icon(Icons.payment_outlined),
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                          DropdownMenuItem(value: 'Card', child: Text('Card')),
                          DropdownMenuItem(value: 'UPI', child: Text('UPI')),
                          DropdownMenuItem(value: 'Online', child: Text('Online')),
                        ],
                        onChanged: (v) => setState(() => _paymentMode = v!),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _amountController,
                        decoration: const InputDecoration(
                          labelText: 'Amount Paid (₹) *',
                          prefixIcon: Icon(Icons.currency_rupee),
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        onChanged: (v) => setState(() => _paymentAmount = double.tryParse(v) ?? 0),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Required';
                          if (double.tryParse(v) == null) return 'Invalid';
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // ── Activity Preference (chips) ────────────────
                Text(
                  'Activity Preference *',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                if (_selectedActivities.isEmpty)
                  Text('Select at least one activity', style: TextStyle(fontSize: 12, color: AppTheme.errorColor)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: _activityOptions.map((activity) {
                    final isSelected = _selectedActivities.contains(activity.name);
                    return FilterChip(
                      avatar: FaIcon(
                        FontAwesomeIconMapper.getIcon(activity.icon),
                        size: 14,
                        color: isSelected ? Colors.white : AppTheme.primaryColor,
                      ),
                      label: Text(activity.name),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedActivities.add(activity.name);
                          } else {
                            _selectedActivities.remove(activity.name);
                          }
                        });
                      },
                      selectedColor: AppTheme.primaryColor,
                      checkmarkColor: Colors.white,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : null,
                        fontSize: 12,
                      ),
                      backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.06),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primaryColor : AppTheme.primaryColor.withValues(alpha: 0.25),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitForm,
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white),
          child: _isSubmitting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Add Member'),
        ),
      ],
    );
  }

}

class _ImportMembersDialog extends StatefulWidget {
  final VoidCallback onImported;

  const _ImportMembersDialog({
    required this.onImported,
  });

  @override
  State<_ImportMembersDialog> createState() => _ImportMembersDialogState();
}

class _ImportMembersDialogState extends State<_ImportMembersDialog> {
  final MemberService _memberService = MemberService();
  PlatformFile? _selectedFile;
  bool _isLoading = false;
  bool _isImporting = false;
  bool _mergeDuplicates = false;
  Map<String, dynamic>? _summary;
  List<dynamic> _previewRows = [];
  List<dynamic> _resultsPreview = [];
  List<dynamic> _duplicates = [];
  String? _message;

  String _formatFileSize(int bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes.toDouble();
    var unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return '${size.toStringAsFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}';
  }

  Future<void> _pickImportFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowMultiple: false,
      withData: true,
      allowedExtensions: const ['xlsx', 'xls', 'csv', 'pdf'],
    );

    if (result == null || result.files.isEmpty) return;

    setState(() {
      _selectedFile = result.files.first;
      _summary = null;
      _previewRows = [];
      _resultsPreview = [];
      _duplicates = [];
      _message = null;
    });
  }

  Future<void> _runPreview() async {
    if (_selectedFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a file first'),
          backgroundColor: AppTheme.warningColor,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _message = null;
    });

    try {
      final response = await _memberService.importMembersFromFile(
        file: _selectedFile!,
        commit: false,
        chunkSize: 700,
      );

      if (!mounted) return;
      setState(() {
        _summary = response['summary'] as Map<String, dynamic>?;
        _previewRows = (response['preview'] as List<dynamic>? ?? []);
        _resultsPreview = (response['resultsPreview'] as List<dynamic>? ?? []);
        _duplicates = (response['duplicates'] as List<dynamic>? ?? []);
        _message = response['message']?.toString();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Preview failed: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _importMembers() async {
    if (_selectedFile == null) return;

    setState(() => _isImporting = true);
    try {
      final response = await _memberService.importMembersFromFile(
        file: _selectedFile!,
        commit: true,
        chunkSize: 700,
        mergeDuplicates: _mergeDuplicates,
      );

      if (!mounted) return;
      final summary = response['summary'] as Map<String, dynamic>?;
      final importedCount = summary?['importedCount'] ?? 0;
      final mergedCount = summary?['mergedCount'] ?? 0;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Imported $importedCount, merged $mergedCount duplicate member(s)'),
          backgroundColor: AppTheme.successColor,
        ),
      );

      widget.onImported();
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Import failed: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isImporting = false);
      }
    }
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required Color color,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
          ],
          Text(
            '$title: ',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
          ),
          Text(
            value,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 520;
    final dialogWidth = screenWidth > 860 ? 760.0 : screenWidth * 0.9;
    final canImport = _summary != null && _selectedFile != null && !_isLoading && !_isImporting;
    final parsedRows = _summary?['parsedRows']?.toString() ?? '0';
    final duplicates = _summary?['skippedDuplicateCount']?.toString() ?? '0';
    final merged = _summary?['mergedCount']?.toString() ?? '0';
    final missingFields = _summary?['totalMissingFields']?.toString() ?? '0';

    return AlertDialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      title: Row(
        children: [
          const FaIcon(FontAwesomeIcons.fileArrowUp, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Upload Existing Members',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: isNarrow ? 18 : null),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: dialogWidth,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
                  border: Border.all(
                    color: Theme.of(context).dividerColor,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Supported files: Excel (.xlsx/.xls), CSV, PDF',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Different header names are auto-mapped (including Joining Date/DOJ). Missing values are displayed as NA in preview and imported with safe defaults.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _isLoading || _isImporting ? null : _pickImportFile,
                          icon: const Icon(Icons.attach_file),
                          label: const Text('Choose File'),
                        ),
                        OutlinedButton.icon(
                          onPressed: _isLoading || _isImporting || _selectedFile == null ? null : _runPreview,
                          icon: const Icon(Icons.visibility_outlined),
                          label: const Text('Preview Mapping'),
                        ),
                      ],
                    ),
                    if (_selectedFile != null) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          const Icon(Icons.description_outlined, size: 18, color: AppTheme.primaryColor),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '${_selectedFile!.name} (${_formatFileSize(_selectedFile!.size)})',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (_isLoading) ...[
                      const SizedBox(height: 12),
                      const LinearProgressIndicator(),
                    ],
                  ],
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: 10),
                Text(
                  _message!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
              if (_summary != null) ...[
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    _buildSummaryCard(
                      title: 'Parsed Rows',
                      value: parsedRows,
                      color: AppTheme.primaryColor,
                      icon: Icons.table_chart_outlined,
                    ),
                    _buildSummaryCard(
                      title: 'Duplicates',
                      value: duplicates,
                      color: AppTheme.warningColor,
                      icon: Icons.copy_all,
                    ),
                    _buildSummaryCard(
                      title: 'Merged',
                      value: merged,
                      color: AppTheme.successColor,
                      icon: Icons.merge_type,
                    ),
                    _buildSummaryCard(
                      title: 'Missing Fields',
                      value: missingFields,
                      color: AppTheme.errorColor,
                      icon: Icons.info_outline,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    children: [
                      SwitchListTile.adaptive(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Auto-merge duplicates while importing'),
                        subtitle: const Text('Merges duplicate Member ID/Email/Phone with existing records'),
                        value: _mergeDuplicates,
                        onChanged: _isImporting
                            ? null
                            : (value) => setState(() => _mergeDuplicates = value),
                      ),
                      if (_duplicates.isNotEmpty)
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: () {
                              showDialog(
                                context: context,
                                builder: (_) => _ImportDuplicatesDialog(duplicates: _duplicates),
                              );
                            },
                            icon: const Icon(Icons.manage_search),
                            label: Text('Review duplicate rows (${_duplicates.length})'),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              if (_previewRows.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Preview (first rows)',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Container(
                  constraints: const BoxConstraints(maxHeight: 260),
                  decoration: BoxDecoration(
                    border: Border.all(color: Theme.of(context).dividerColor),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: ListView.separated(
                    itemCount: _previewRows.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final row = _previewRows[index] as Map<String, dynamic>;
                      final missing = (row['missingFields'] as List<dynamic>? ?? []).cast<dynamic>();
                      return ListTile(
                        dense: true,
                        leading: CircleAvatar(
                          radius: 14,
                          backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.12),
                          child: Text('${row['rowNumber'] ?? '-'}', style: const TextStyle(fontSize: 10)),
                        ),
                        title: Text(
                          '${row['memberName'] ?? 'NA'} • ${row['phone'] ?? 'NA'}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '${row['email'] ?? 'NA'} | ${row['planSelected'] ?? 'NA'} | ${row['monthlyPlan'] ?? 'NA'}'
                          ' | Join: ${row['joinDate'] ?? 'NA'}'
                          '${missing.isNotEmpty ? ' | Missing: ${missing.join(', ')}' : ''}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
              if (_resultsPreview.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  'Import status preview: ${_resultsPreview.length} row(s)',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading || _isImporting ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton.icon(
          onPressed: canImport ? _importMembers : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
          ),
          icon: _isImporting
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.cloud_upload_outlined),
          label: Text(_isImporting ? 'Importing...' : (isNarrow ? 'Import' : 'Import Members')),
        ),
      ],
    );
  }
}

class _ImportDuplicatesDialog extends StatelessWidget {
  final List<dynamic> duplicates;

  const _ImportDuplicatesDialog({
    required this.duplicates,
  });

  Widget _buildDetailLine(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: RichText(
        text: TextSpan(
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 12,
          ),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(text: value.isEmpty ? 'NA' : value),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.content_copy, color: AppTheme.warningColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Duplicate Members Found (${duplicates.length})',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 860,
        height: 520,
        child: duplicates.isEmpty
            ? const Center(child: Text('No duplicates found'))
            : ListView.separated(
                itemCount: duplicates.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = duplicates[index] as Map<String, dynamic>;
                  final incoming = (item['incoming'] as Map<String, dynamic>? ?? {});
                  final existing = (item['existing'] as Map<String, dynamic>? ?? {});
                  final reason = (item['duplicateReason'] ?? 'duplicate').toString();

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.25),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.warningColor.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                'Row ${item['rowNumber'] ?? '-'}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              reason.replaceAll('_', ' '),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                fontSize: 12,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  color: AppTheme.primaryColor.withValues(alpha: 0.07),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Uploaded Row', style: TextStyle(fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 6),
                                    _buildDetailLine(context, 'Name', '${incoming['memberName'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Member ID', '${incoming['membershipId'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Phone', '${incoming['phone'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Email', '${incoming['email'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Join Date', '${incoming['joinDate'] ?? 'NA'}'),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  color: AppTheme.successColor.withValues(alpha: 0.08),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Existing Member', style: TextStyle(fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 6),
                                    _buildDetailLine(context, 'Name', '${existing['memberName'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Member ID', '${existing['membershipId'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Phone', '${existing['phone'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Email', '${existing['email'] ?? 'NA'}'),
                                    _buildDetailLine(context, 'Join Date', '${existing['joinDate'] ?? 'NA'}'),
                                  ],
                                ),
                              ),
                            ),
                          ],
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

// Member Details Sheet Widget
class _MemberDetailsSheet extends StatelessWidget {
  final Member member;
  final ScrollController scrollController;
  final VoidCallback onUpdate;

  const _MemberDetailsSheet({
    required this.member,
    required this.scrollController,
    required this.onUpdate,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy');
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
    final cloudinaryService = CloudinaryService();

    return Container(
      padding: const EdgeInsets.all(24),
      child: ListView(
        controller: scrollController,
        children: [
          Row(
            children: [
              member.profileImage != null && member.profileImage!.isNotEmpty
                  ? CircleAvatar(
                      radius: 48,
                      backgroundColor: AppTheme.primaryColor,
                      child: ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: cloudinaryService.getOptimizedUrl(
                            member.profileImage!,
                            width: 96,
                            height: 96,
                          ),
                          fit: BoxFit.cover,
                          width: 96,
                          height: 96,
                          placeholder: (context, url) => const CircularProgressIndicator(),
                          errorWidget: (context, url, error) => Text(
                            member.memberName[0].toUpperCase(),
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onPrimary,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    )
                  : CircleAvatar(
                      radius: 48,
                      backgroundColor: AppTheme.primaryColor,
                      child: Text(
                        member.memberName[0].toUpperCase(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onPrimary,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      member.memberName,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      member.membershipId ?? 'No ID',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildInfoRow(context, Icons.cake, 'Age', '${member.age} years'),
          _buildInfoRow(context, Icons.wc, 'Gender', member.gender),
          _buildInfoRow(context, Icons.phone, 'Phone', member.phone),
          _buildInfoRow(context, Icons.email, 'Email', member.email),
          if (member.address != null)
            _buildInfoRow(context, Icons.location_on, 'Address', member.address!),
          _buildInfoRow(context, Icons.credit_card, 'Plan', member.planSelected),
          _buildInfoRow(context, Icons.calendar_month, 'Duration', member.monthlyPlan),
          _buildInfoRow(context, Icons.fitness_center, 'Activity', member.activityPreference),
          _buildInfoRow(
            context,
            Icons.calendar_today,
            'Join Date',
            dateFormat.format(member.joinDate),
          ),
          _buildInfoRow(
            context,
            Icons.calendar_month,
            'Valid Until',
            member.membershipValidUntil != null
                ? dateFormat.format(member.membershipValidUntil!)
                : 'N/A',
          ),
          _buildInfoRow(
            context,
            Icons.attach_money,
            'Amount Paid',
            currencyFormat.format(member.paymentAmount),
          ),
          if (member.paymentStatus == 'pending')
            _buildInfoRow(
              context,
              Icons.warning,
              'Payment Status',
              'Pending - ${currencyFormat.format(member.pendingPaymentAmount)}',
            ),
          
          // Freeze Status Section
          if (member.currentlyFrozen) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.pause_circle, color: Colors.blue.shade700),
                      const SizedBox(width: 8),
                      Text(
                        'Membership Frozen',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (member.freezeStartDate != null && member.freezeEndDate != null) ...[
                    Text(
                      'From: ${dateFormat.format(member.freezeStartDate!)}',
                      style: const TextStyle(fontSize: 14),
                    ),
                    Text(
                      'Until: ${dateFormat.format(member.freezeEndDate!)}',
                      style: const TextStyle(fontSize: 14),
                    ),
                    Text(
                      'Days: ${member.freezeEndDate!.difference(member.freezeStartDate!).inDays} days',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            ),
          ],
          
          // Freeze History Section
          if (member.freezeHistory.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              'Freeze History (${member.freezeHistory.length})',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 12),
            ...member.freezeHistory.map((freeze) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).dividerColor,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${dateFormat.format(freeze.freezeStartDate)} - ${dateFormat.format(freeze.freezeEndDate)}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${freeze.freezeDays} days',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (freeze.reason != null && freeze.reason!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Reason: ${freeze.reason}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    'Requested: ${dateFormat.format(freeze.requestedAt)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).textTheme.bodySmall?.color,
                    ),
                  ),
                ],
              ),
            )),
          ],
          
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    // TODO: Show edit dialog
                  },
                  icon: const FaIcon(FontAwesomeIcons.penToSquare, size: 16),
                  label: const Text('Edit'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    // TODO: Show renew dialog
                  },
                  icon: const FaIcon(FontAwesomeIcons.arrowRotateRight, size: 16),
                  label: const Text('Renew'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.successColor),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Renew Membership Dialog Widget  
class _RenewMembershipDialog extends StatefulWidget {
  final Member member;
  final MembershipPlan? membershipPlan;
  final List<GymActivity> gymActivities;
  final VoidCallback onRenewed;

  const _RenewMembershipDialog({
    required this.member,
    required this.onRenewed,
    this.membershipPlan,
    this.gymActivities = const [],
  });

  @override
  State<_RenewMembershipDialog> createState() => _RenewMembershipDialogState();
}

class _RenewMembershipDialogState extends State<_RenewMembershipDialog> {
  final _memberService = MemberService();
  final _amountController = TextEditingController(text: '0');
  String _plan = 'Basic';
  String _duration = '1 Month';
  String _paymentMode = 'Cash';
  double _amount = 0;
  bool _isSubmitting = false;
  bool _is7DayAllowance = false;
  Set<String> _selectedActivities = {};

  bool get _isMultiTier => widget.membershipPlan?.isMultiTier ?? false;

  List<GymActivity> get _activityOptions {
    if (widget.gymActivities.isNotEmpty) return widget.gymActivities;
    return PredefinedActivities.all;
  }

  // Duration options from gym's actual membership plan, fallback to hardcoded
  List<Map<String, dynamic>> get _durationOptions {
    final plan = widget.membershipPlan;
    if (plan != null && plan.monthlyOptions.isNotEmpty) {
      return plan.monthlyOptions.map((opt) {
        final months = opt.months;
        final label = months == 1 ? '1 Month' : months == 12 ? '12 Months' : '$months Months';
        return <String, dynamic>{
          'value': label,
          'months': months,
          'price': opt.finalPrice,
          'discount': opt.discount,
          'isPopular': opt.isPopular,
        };
      }).toList();
    }
    return <Map<String, dynamic>>[
      <String, dynamic>{'value': '1 Month', 'months': 1, 'price': 0.0},
      <String, dynamic>{'value': '3 Months', 'months': 3, 'price': 0.0},
      <String, dynamic>{'value': '6 Months', 'months': 6, 'price': 0.0},
      <String, dynamic>{'value': '12 Months', 'months': 12, 'price': 0.0},
    ];
  }

  @override
  void initState() {
    super.initState();
    // Lock plan name in single-tier mode
    if (!_isMultiTier && widget.membershipPlan != null) {
      _plan = widget.membershipPlan!.name;
    } else {
      _plan = widget.member.planSelected;
    }
    // Pre-select member's existing activities
    final existing = widget.member.activityPreference;
    if (existing.isNotEmpty) {
      _selectedActivities = existing.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toSet();
    }
    // Pre-select first duration and auto-fill its price
    if (_durationOptions.isNotEmpty) {
      _duration = _durationOptions.first['value'] as String;
      _autoFillAmount();
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _autoFillAmount() {
    final selected = _durationOptions.firstWhere(
      (opt) => opt['value'] == _duration,
      orElse: () => <String, dynamic>{'price': 0.0},
    );
    final price = (selected['price'] as num).toDouble();
    if (price > 0) {
      setState(() {
        _amount = price;
        _amountController.text = price.toStringAsFixed(0);
      });
    }
  }

  Future<void> _submitRenewal() async {
    setState(() => _isSubmitting = true);

    try {
      final result = await _memberService.renewMembership(
        memberId: widget.member.id,
        planSelected: _plan,
        monthlyPlan: _duration,
        paymentAmount: _amount,
        paymentMode: _paymentMode,
        activityPreference: _selectedActivities.join(', '),
        is7DayAllowance: _is7DayAllowance,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Membership renewed successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        widget.onRenewed();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error renewing membership: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          FaIcon(FontAwesomeIcons.arrowRotateRight, color: AppTheme.primaryColor),
          SizedBox(width: 12),
          Text('Renew Membership'),
        ],
      ),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.member.memberName,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                    Text(
                      'Current Plan: ${widget.member.planSelected}',
                      style: TextStyle(color: Theme.of(context).colorScheme.onPrimaryContainer),
                    ),
                    if (widget.member.membershipValidUntil != null)
                      Text(
                        'Expires: ${DateFormat('dd MMM yyyy').format(widget.member.membershipValidUntil!)}',
                        style: TextStyle(color: Theme.of(context).colorScheme.onPrimaryContainer),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Plan section: locked chip for single-tier, dropdown for multi-tier
              if (_isMultiTier) ...[
                DropdownButtonFormField<String>(
                  initialValue: _plan,
                  decoration: const InputDecoration(
                    labelText: 'New Plan',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Basic', child: Text('Basic')),
                    DropdownMenuItem(value: 'Standard', child: Text('Standard')),
                    DropdownMenuItem(value: 'Premium', child: Text('Premium')),
                  ],
                  onChanged: (value) => setState(() => _plan = value!),
                ),
              ] else ...[
                InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Plan',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            FaIcon(FontAwesomeIcons.star, size: 12, color: AppTheme.primaryColor),
                            const SizedBox(width: 6),
                            Text(
                              _plan,
                              style: TextStyle(
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Icon(Icons.lock_outline, size: 16, color: Colors.grey.shade500),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 2),
                  child: Text(
                    'Single-plan gym — plan name is fixed',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _duration,
                decoration: const InputDecoration(
                  labelText: 'Duration',
                  border: OutlineInputBorder(),
                ),
                items: _durationOptions.map((opt) {
                  final label = opt['value'] as String;
                  final price = (opt['price'] as num).toDouble();
                  final isPopular = opt['isPopular'] == true;
                  final discount = opt['discount'] as int? ?? 0;
                  return DropdownMenuItem<String>(
                    value: label,
                    child: Row(
                      children: [
                        Text(label),
                        if (price > 0) ...[
                          const SizedBox(width: 6),
                          Text(
                            '– ₹${price.toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: AppTheme.successColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        if (discount > 0) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppTheme.successColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '$discount% off',
                              style: const TextStyle(
                                color: AppTheme.successColor,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                        if (isPopular) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Popular',
                              style: TextStyle(
                                color: AppTheme.primaryColor,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() => _duration = value!);
                  _autoFillAmount();
                },
              ),
              if (widget.membershipPlan != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Pricing from "${widget.membershipPlan!.name}" plan',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade600,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _amountController,
                decoration: const InputDecoration(
                  labelText: 'Payment Amount (₹)',
                  prefixIcon: Icon(Icons.currency_rupee),
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (value) => setState(() => _amount = double.tryParse(value) ?? 0),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _paymentMode,
                decoration: const InputDecoration(
                  labelText: 'Payment Mode',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                  DropdownMenuItem(value: 'Card', child: Text('Card')),
                  DropdownMenuItem(value: 'UPI', child: Text('UPI')),
                  DropdownMenuItem(value: 'Online', child: Text('Online')),
                ],
                onChanged: (value) => setState(() => _paymentMode = value!),
              ),
              const SizedBox(height: 16),
              // Activity preference chips
              InputDecorator(
                decoration: InputDecoration(
                  labelText: 'Activity Preference',
                  border: const OutlineInputBorder(),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  errorText: _selectedActivities.isEmpty ? 'Select at least one activity' : null,
                ),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: _activityOptions.map((activity) {
                    final isSelected = _selectedActivities.contains(activity.name);
                    return FilterChip(
                      avatar: FaIcon(
                        FontAwesomeIconMapper.getIcon(activity.icon),
                        size: 12,
                        color: isSelected ? Colors.white : AppTheme.primaryColor,
                      ),
                      label: Text(activity.name, style: const TextStyle(fontSize: 12)),
                      selected: isSelected,
                      selectedColor: AppTheme.primaryColor,
                      checkmarkColor: Colors.white,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : null,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedActivities.add(activity.name);
                          } else {
                            _selectedActivities.remove(activity.name);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                title: const Text('7-Day Payment Allowance'),
                subtitle: const Text('Allow member to pay within 7 days'),
                value: _is7DayAllowance,
                onChanged: (value) => setState(() => _is7DayAllowance = value ?? false),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitRenewal,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Renew'),
        ),
      ],
    );
  }
}

// Custom Remove Members Dialog
class _CustomRemoveMembersDialog extends StatefulWidget {
  final List<Member> members;
  final VoidCallback onMembersRemoved;

  const _CustomRemoveMembersDialog({
    required this.members,
    required this.onMembersRemoved,
  });

  @override
  State<_CustomRemoveMembersDialog> createState() => _CustomRemoveMembersDialogState();
}

class _CustomRemoveMembersDialogState extends State<_CustomRemoveMembersDialog> {
  final MemberService _memberService = MemberService();
  final TextEditingController _searchController = TextEditingController();
  final _dateFormat = DateFormat('dd MMM yyyy');
  Set<String> _selectedMemberIds = {};
  List<Member> _filteredMembers = [];
  bool _isRemoving = false;

  @override
  void initState() {
    super.initState();
    _filteredMembers = _sortedByStatus(widget.members);
  }

  bool _isMemberExpired(Member member) {
    if (member.membershipValidUntil == null) return false;
    final validUntil = member.membershipValidUntil!;
    final validDate = DateTime(validUntil.year, validUntil.month, validUntil.day);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    return validDate.isBefore(todayDate);
  }

  List<Member> _sortedByStatus(List<Member> members) {
    final activeMembers = members.where((m) => !_isMemberExpired(m)).toList();
    final expiredMembers = members.where((m) => _isMemberExpired(m)).toList();
    return [...activeMembers, ...expiredMembers];
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredMembers = _sortedByStatus(widget.members);
      } else {
        final lowerQuery = query.toLowerCase();
        final searchedMembers = widget.members.where((member) {
          return member.memberName.toLowerCase().contains(lowerQuery) ||
                 member.email.toLowerCase().contains(lowerQuery) ||
                 member.phone.contains(query) ||
                 (member.membershipId?.toLowerCase().contains(lowerQuery) ?? false);
        }).toList();
        _filteredMembers = _sortedByStatus(searchedMembers);
      }
    });
  }

  Future<void> _removeSelectedMembers() async {
    if (_selectedMemberIds.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Removal'),
        content: Text(
          'Are you sure you want to remove ${_selectedMemberIds.length} member(s)?\n\nThis action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isRemoving = true);

    int successCount = 0;
    int failCount = 0;

    for (final memberId in _selectedMemberIds) {
      try {
        await _memberService.removeSingleMember(memberId);
        successCount++;
      } catch (_) {
        failCount++;
      }
    }

    if (mounted) {
      setState(() => _isRemoving = false);
      Navigator.pop(context);

      if (failCount == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$successCount member(s) removed successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$successCount removed, $failCount failed'),
            backgroundColor: AppTheme.warningColor,
          ),
        );
      }
      widget.onMembersRemoved();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const FaIcon(FontAwesomeIcons.userGear, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          const Text('Custom Remove'),
          const Spacer(),
          if (_selectedMemberIds.isNotEmpty)
            Chip(
              label: Text('${_selectedMemberIds.length} selected'),
              backgroundColor: AppTheme.errorColor.withValues(alpha: 0.1),
              labelStyle: const TextStyle(color: AppTheme.errorColor, fontSize: 12),
            ),
        ],
      ),
      content: SizedBox(
        width: 500,
        height: 450,
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search members...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                TextButton(
                  onPressed: () {
                    setState(() {
                      _selectedMemberIds = _filteredMembers.map((m) => m.id).toSet();
                    });
                  },
                  child: const Text('Select All'),
                ),
                TextButton(
                  onPressed: () {
                    setState(() => _selectedMemberIds.clear());
                  },
                  child: const Text('Clear All'),
                ),
                const Spacer(),
                Text(
                  '${_filteredMembers.length} member(s)',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const Divider(),
            Expanded(
              child: _filteredMembers.isEmpty
                  ? const Center(child: Text('No members found'))
                  : ListView.builder(
                      itemCount: _filteredMembers.length,
                      itemBuilder: (context, index) {
                        final member = _filteredMembers[index];
                        final isSelected = _selectedMemberIds.contains(member.id);
                        final isExpired = _isMemberExpired(member);
                        return CheckboxListTile(
                          value: isSelected,
                          onChanged: (value) {
                            setState(() {
                              if (value == true) {
                                _selectedMemberIds.add(member.id);
                              } else {
                                _selectedMemberIds.remove(member.id);
                              }
                            });
                          },
                          title: Text(
                            member.memberName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${member.membershipId ?? 'No ID'} • ${member.phone}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              Row(
                                children: [
                                  Text(
                                    member.membershipValidUntil != null
                                        ? 'Valid until: ${_dateFormat.format(member.membershipValidUntil!)}'
                                        : 'No expiry date',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isExpired ? AppTheme.errorColor : AppTheme.successColor,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  if (isExpired) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: AppTheme.errorColor.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'EXPIRED',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.errorColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                          secondary: CircleAvatar(
                            backgroundColor: isExpired
                                ? AppTheme.errorColor.withValues(alpha: 0.2)
                                : AppTheme.primaryColor.withValues(alpha: 0.2),
                            child: Text(
                              member.memberName[0].toUpperCase(),
                              style: TextStyle(
                                color: isExpired ? AppTheme.errorColor : AppTheme.primaryColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          dense: true,
                          controlAffinity: ListTileControlAffinity.leading,
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isRemoving ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isRemoving || _selectedMemberIds.isEmpty ? null : _removeSelectedMembers,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.errorColor,
            foregroundColor: Colors.white,
          ),
          child: _isRemoving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text('Remove (${_selectedMemberIds.length})'),
        ),
      ],
    );
  }
}
