import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';

import 'package:gym_admin_app/l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../models/member.dart';
import '../../services/member_service.dart';
import '../../services/cloudinary_service.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/sidebar_menu.dart';
import '../support/support_screen.dart';
import '../equipment/equipment_screen.dart';

class MembersScreen extends StatefulWidget {
  const MembersScreen({super.key});

  @override
  State<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends State<MembersScreen> {
  final MemberService _memberService = MemberService();
  final CloudinaryService _cloudinaryService = CloudinaryService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final TextEditingController _searchController = TextEditingController();
  final _currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
  final _dateFormat = DateFormat('dd MMM yyyy');
  
  List<Member> _allMembers = [];
  List<Member> _filteredMembers = [];
  List<Member> _activeMembers = [];
  List<Member> _expiredMembers = [];
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  String _expiryFilter = '';
  int _selectedIndex = 1; // Members tab

  @override
  void initState() {
    super.initState();
    _loadMembers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
    _activeMembers = _filteredMembers.where((m) => !m.isExpired).toList();
    _expiredMembers = _filteredMembers.where((m) => m.isExpired).toList();
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
              onTap: () {
                Navigator.pop(context);
                _showRemoveExpiredConfirmation();
              },
            ),
            ListTile(
              leading: const FaIcon(FontAwesomeIcons.userGear, color: AppTheme.primaryColor),
              title: const Text('Custom Remove'),
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

  void _showRemoveExpiredConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Expired Members'),
        content: const Text(
          'Remove all members whose membership expired more than 7 days ago?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _removeExpiredMembers();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  Future<void> _removeExpiredMembers() async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final result = await _memberService.removeExpiredMembers();
      
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
    // TODO: Implement custom member removal dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Custom removal feature coming soon')),
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
      case 0: // Dashboard
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
        Navigator.pushNamed(context, '/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      key: _scaffoldKey,
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
          const Row(
            children: [
              FaIcon(FontAwesomeIcons.users, color: AppTheme.primaryColor),
              SizedBox(width: 12),
              Text(
                'All Members',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const Spacer(),
          if (isDesktop) ...[
            ElevatedButton.icon(
              onPressed: _showAddMemberDialog,
              icon: const FaIcon(FontAwesomeIcons.userPlus, size: 16),
              label: const Text('Add Member'),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _showRemoveMembersMenu,
              icon: const FaIcon(FontAwesomeIcons.userMinus, size: 16),
              label: const Text('Remove Members'),
              style: OutlinedButton.styleFrom(foregroundColor: AppTheme.errorColor),
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
      return _buildMembersGrid(members);
    }
  }

  Widget _buildMembersTable(List<Member> members) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Profile')),
          DataColumn(label: Text('Name')),
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
              cells: [
                DataCell(_buildProfileImage(member)),
                DataCell(Text(member.memberName)),
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

  Widget _buildValidUntilCell(Member member) {
    if (member.membershipValidUntil == null) {
      return const Text('N/A');
    }

    final isExpired = member.isExpired;
    final isExpiringSoon = member.isExpiringSoon;
    
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
        onRenewed: _loadMembers,
      ),
    );
  }
}

// Add Member Dialog Widget
class _AddMemberDialog extends StatefulWidget {
  final VoidCallback onMemberAdded;

  const _AddMemberDialog({required this.onMemberAdded});

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
  final _activityController = TextEditingController();
  
  String _gender = 'Male';
  String _paymentMode = 'Cash';
  String _plan = 'Basic';
  String _duration = '1 Month';
  double _paymentAmount = 0;
  XFile? _profileImage;
  Uint8List? _profileImageBytes;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _activityController.dispose();
    super.dispose();
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
        activityPreference: _activityController.text,
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
              children: [
                // Profile Image
                InkWell(
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
                const SizedBox(height: 24),
                
                // Name
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Name *'),
                  validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                
                // Age and Gender
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _ageController,
                        decoration: const InputDecoration(labelText: 'Age *'),
                        keyboardType: TextInputType.number,
                        validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _gender,
                        decoration: const InputDecoration(labelText: 'Gender *'),
                        items: const [
                          DropdownMenuItem(value: 'Male', child: Text('Male')),
                          DropdownMenuItem(value: 'Female', child: Text('Female')),
                          DropdownMenuItem(value: 'Other', child: Text('Other')),
                        ],
                        onChanged: (value) => setState(() => _gender = value!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Phone and Email
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(labelText: 'Phone *'),
                  keyboardType: TextInputType.phone,
                  validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Email *'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                
                // Address
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(labelText: 'Address'),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                
                // Plan and Duration
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _plan,
                        decoration: const InputDecoration(labelText: 'Plan *'),
                        items: const [
                          DropdownMenuItem(value: 'Basic', child: Text('Basic')),
                          DropdownMenuItem(value: 'Standard', child: Text('Standard')),
                          DropdownMenuItem(value: 'Premium', child: Text('Premium')),
                        ],
                        onChanged: (value) => setState(() {
                          _plan = value!;
                          _calculatePayment();
                        }),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _duration,
                        decoration: const InputDecoration(labelText: 'Duration *'),
                        items: const [
                          DropdownMenuItem(value: '1 Month', child: Text('1 Month')),
                          DropdownMenuItem(value: '3 Months', child: Text('3 Months')),
                          DropdownMenuItem(value: '6 Months', child: Text('6 Months')),
                          DropdownMenuItem(value: '12 Months', child: Text('12 Months')),
                        ],
                        onChanged: (value) => setState(() {
                          _duration = value!;
                          _calculatePayment();
                        }),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Payment Mode and Amount
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _paymentMode,
                        decoration: const InputDecoration(labelText: 'Payment Mode *'),
                        items: const [
                          DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                          DropdownMenuItem(value: 'Card', child: Text('Card')),
                          DropdownMenuItem(value: 'UPI', child: Text('UPI')),
                          DropdownMenuItem(value: 'Online', child: Text('Online')),
                        ],
                        onChanged: (value) => setState(() => _paymentMode = value!),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        initialValue: _paymentAmount.toString(),
                        decoration: const InputDecoration(labelText: 'Amount *'),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => setState(() {
                          _paymentAmount = double.tryParse(value) ?? 0;
                        }),
                        validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Activity Preference
                TextFormField(
                  controller: _activityController,
                  decoration: const InputDecoration(labelText: 'Activity Preference *'),
                  validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
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
          child: _isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Add Member'),
        ),
      ],
    );
  }

  void _calculatePayment() {
    // TODO: Implement payment calculation based on plan and duration
    // This should fetch pricing from backend or use predefined rates
    setState(() {
      _paymentAmount = 1000; // Placeholder
    });
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
  final VoidCallback onRenewed;

  const _RenewMembershipDialog({
    required this.member,
    required this.onRenewed,
  });

  @override
  State<_RenewMembershipDialog> createState() => _RenewMembershipDialogState();
}

class _RenewMembershipDialogState extends State<_RenewMembershipDialog> {
  final _memberService = MemberService();
  String _plan = 'Basic';
  String _duration = '1 Month';
  String _paymentMode = 'Cash';
  String _activity = '';
  double _amount = 0;
  bool _isSubmitting = false;
  bool _is7DayAllowance = false;

  @override
  void initState() {
    super.initState();
    _plan = widget.member.planSelected;
    _activity = widget.member.activityPreference;
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
        activityPreference: _activity,
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
        width: 400,
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
              DropdownButtonFormField<String>(
                initialValue: _plan,
                decoration: const InputDecoration(labelText: 'New Plan'),
                items: const [
                  DropdownMenuItem(value: 'Basic', child: Text('Basic')),
                  DropdownMenuItem(value: 'Standard', child: Text('Standard')),
                  DropdownMenuItem(value: 'Premium', child: Text('Premium')),
                ],
                onChanged: (value) => setState(() => _plan = value!),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _duration,
                decoration: const InputDecoration(labelText: 'Duration'),
                items: const [
                  DropdownMenuItem(value: '1 Month', child: Text('1 Month')),
                  DropdownMenuItem(value: '3 Months', child: Text('3 Months')),
                  DropdownMenuItem(value: '6 Months', child: Text('6 Months')),
                  DropdownMenuItem(value: '12 Months', child: Text('12 Months')),
                ],
                onChanged: (value) => setState(() => _duration = value!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                initialValue: _amount.toString(),
                decoration: const InputDecoration(labelText: 'Payment Amount'),
                keyboardType: TextInputType.number,
                onChanged: (value) => setState(() => _amount = double.tryParse(value) ?? 0),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _paymentMode,
                decoration: const InputDecoration(labelText: 'Payment Mode'),
                items: const [
                  DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                  DropdownMenuItem(value: 'Card', child: Text('Card')),
                  DropdownMenuItem(value: 'UPI', child: Text('UPI')),
                  DropdownMenuItem(value: 'Online', child: Text('Online')),
                ],
                onChanged: (value) => setState(() => _paymentMode = value!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                initialValue: _activity,
                decoration: const InputDecoration(labelText: 'Activity Preference'),
                onChanged: (value) => setState(() => _activity = value),
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
          child: _isSubmitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Renew'),
        ),
      ],
    );
  }
}
