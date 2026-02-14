import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import '../../l10n/app_localizations.dart';
import '../../config/app_theme.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/equipment.dart';
import '../../services/equipment_service.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/sidebar_menu.dart';
import '../dashboard/dashboard_screen.dart';
import '../members/members_screen.dart';
import '../attendance/attendance_screen.dart';
import '../support/support_screen.dart';

/// Equipment Management Screen
class EquipmentScreen extends StatefulWidget {
  const EquipmentScreen({super.key});

  @override
  State<EquipmentScreen> createState() => _EquipmentScreenState();
}

class _EquipmentScreenState extends State<EquipmentScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final EquipmentService _equipmentService = EquipmentService();
  final _searchController = TextEditingController();

  List<Equipment> _allEquipment = [];
  List<Equipment> _filteredEquipment = [];
  EquipmentStats? _stats;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  // Filters
  String _selectedCategory = '';
  EquipmentStatus? _selectedStatus;
  String _sortBy = 'name';
  
  // Navigation
  int _selectedIndex = 5; // Equipment tab index

  @override
  void initState() {
    super.initState();
    _loadEquipmentData();
    _searchController.addListener(_applyFilters);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadEquipmentData() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final equipment = await _equipmentService.getAllEquipment();
      final stats = await _equipmentService.getEquipmentStats();

      setState(() {
        _allEquipment = equipment;
        _filteredEquipment = equipment;
        _stats = stats;
        _isLoading = false;
      });

      _applyFilters();
    } catch (e) {
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredEquipment = _allEquipment.where((equipment) {
        // Search filter
        if (_searchController.text.isNotEmpty) {
          final searchLower = _searchController.text.toLowerCase();
          if (!equipment.name.toLowerCase().contains(searchLower) &&
              !(equipment.brand?.toLowerCase().contains(searchLower) ?? false) &&
              !equipment.category.toLowerCase().contains(searchLower) &&
              !(equipment.description?.toLowerCase().contains(searchLower) ?? false)) {
            return false;
          }
        }

        // Category filter
        if (_selectedCategory.isNotEmpty && equipment.category != _selectedCategory) {
          return false;
        }

        // Status filter
        if (_selectedStatus != null && equipment.status != _selectedStatus) {
          return false;
        }

        return true;
      }).toList();

      // Sort
      _filteredEquipment.sort((a, b) {
        switch (_sortBy) {
          case 'name':
            return a.name.compareTo(b.name);
          case 'category':
            return a.category.compareTo(b.category);
          case 'quantity':
            return b.quantity.compareTo(a.quantity);
          case 'status':
            return a.status.value.compareTo(b.status.value);
          case 'date':
            return (b.purchaseDate ?? DateTime(1970))
                .compareTo(a.purchaseDate ?? DateTime(1970));
          default:
            return 0;
        }
      });
    });
  }

  String _getCurrentGymId() {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      return authProvider.currentAdmin?.id ?? '';
    } catch (e) {
      debugPrint('Error getting gym ID: $e');
      return '';
    }
  }

  void _onMenuItemSelected(int index) {
    if (index == _selectedIndex) return;
    
    // Navigate to different screens based on index
    switch (index) {
      case 0: // Dashboard
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payments screen coming soon')),
        );
        break;
      case 5: // Equipment
        // Already on equipment screen, do nothing
        break;
      case 6: // Offers
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Offers screen coming soon')),
        );
        break;
      case 7: // Support & Reviews
        if (!mounted) return;
        final gymId = _getCurrentGymId();
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
    final l10n = AppLocalizations.of(context)!;
    final themeProvider = Provider.of<ThemeProvider>(context);
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 1024;

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
                _buildTopBar(context, l10n, isDesktop),
                Expanded(
                  child: _isLoading
                      ? _buildLoadingState()
                      : _hasError
                          ? _buildErrorState()
                          : _buildMainContent(l10n, themeProvider, isDesktop),
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
      floatingActionButton: !_isLoading && !_hasError && !isDesktop
          ? FloatingActionButton.extended(
              onPressed: () => _showAddEquipmentDialog(),
              icon: const Icon(Icons.add),
              label: Text(l10n.addEquipment),
              backgroundColor: AppTheme.primaryColor,
            )
          : null,
    );
  }

  Widget _buildTopBar(BuildContext context, AppLocalizations l10n, bool isDesktop) {
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
          const Icon(
            Icons.fitness_center,
            color: AppTheme.primaryColor,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              l10n.equipment,
              style: TextStyle(
                fontSize: isDesktop ? 24 : 18,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (isDesktop)
            ElevatedButton.icon(
              onPressed: () => _showAddEquipmentDialog(),
              icon: const Icon(Icons.add),
              label: Text(l10n.addEquipment),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
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
          const Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
          const SizedBox(height: 16),
          Text(
            'Error Loading Equipment',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadEquipmentData,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildMainContent(AppLocalizations l10n, ThemeProvider themeProvider, bool isDesktop) {
    return RefreshIndicator(
      onRefresh: _loadEquipmentData,
      child: SingleChildScrollView(
        padding: EdgeInsets.all(isDesktop ? 24 : 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats Cards
            _buildStatsCards(l10n, isDesktop),
            const SizedBox(height: 24),

            // Filters and Search
            _buildFiltersSection(l10n, isDesktop),
            const SizedBox(height: 24),

            // Equipment Grid
            _buildEquipmentGrid(isDesktop),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCards(AppLocalizations l10n, bool isDesktop) {
    if (_stats == null) return const SizedBox.shrink();

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
          title: l10n.totalEquipment,
          value: _stats!.total.toString(),
          icon: Icons.fitness_center,
          color: AppTheme.primaryColor,
        ),
        StatCard(
          title: l10n.availableEquipment,
          value: _stats!.available.toString(),
          icon: Icons.check_circle,
          color: AppTheme.successColor,
          trend: _stats!.availablePercentage,
        ),
        StatCard(
          title: l10n.maintenanceEquipment,
          value: _stats!.maintenance.toString(),
          icon: Icons.build,
          color: AppTheme.warningColor,
        ),
        StatCard(
          title: l10n.outOfOrderEquipment,
          value: _stats!.outOfOrder.toString(),
          icon: Icons.warning,
          color: AppTheme.errorColor,
        ),
      ],
    );
  }

  Widget _buildFiltersSection(AppLocalizations l10n, bool isDesktop) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Search Bar
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: l10n.searchEquipment,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Filters Row
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                // Category Filter
                SizedBox(
                  width: 200,
                  child: DropdownButtonFormField<String>(
                    initialValue: _selectedCategory.isEmpty ? '' : _selectedCategory,
                    decoration: InputDecoration(
                      labelText: l10n.category,
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: [
                      DropdownMenuItem(value: '', child: Text(l10n.allCategories)),
                      ...EquipmentCategories.all.map(
                        (cat) => DropdownMenuItem(value: cat, child: Text(cat)),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedCategory = value ?? '';
                      });
                      _applyFilters();
                    },
                  ),
                ),

                // Status Filter
                SizedBox(
                  width: 200,
                  child: DropdownButtonFormField<String>(
                    initialValue: _selectedStatus?.value ?? 'all',
                    decoration: InputDecoration(
                      labelText: l10n.status,
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: [
                      DropdownMenuItem(value: 'all', child: Text(l10n.allStatuses)),
                      ...EquipmentStatus.values.map(
                        (status) => DropdownMenuItem(
                          value: status.value,
                          child: Text(status.displayName),
                        ),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() {
                        if (value == 'all') {
                          _selectedStatus = null;
                        } else {
                          _selectedStatus = EquipmentStatus.values.firstWhere(
                            (s) => s.value == value,
                            orElse: () => EquipmentStatus.available,
                          );
                        }
                      });
                      _applyFilters();
                    },
                  ),
                ),

                // Sort By
                SizedBox(
                  width: 200,
                  child: DropdownButtonFormField<String>(
                    initialValue: _sortBy,
                    decoration: InputDecoration(
                      labelText: l10n.sortBy,
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: [
                      DropdownMenuItem(value: 'name', child: Text(l10n.name)),
                      DropdownMenuItem(value: 'category', child: Text(l10n.category)),
                      DropdownMenuItem(value: 'quantity', child: Text(l10n.quantity)),
                      DropdownMenuItem(value: 'status', child: Text(l10n.status)),
                      DropdownMenuItem(value: 'date', child: Text(l10n.purchaseDate)),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _sortBy = value ?? 'name';
                      });
                      _applyFilters();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEquipmentGrid(bool isDesktop) {
    if (_filteredEquipment.isEmpty) {
      return _buildEmptyState();
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isDesktop ? 3 : (MediaQuery.of(context).size.width > 600 ? 2 : 1),
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: isDesktop ? 0.85 : 0.9,
      ),
      itemCount: _filteredEquipment.length,
      itemBuilder: (context, index) {
        return _buildEquipmentCard(_filteredEquipment[index]);
      },
    );
  }

  Widget _buildEquipmentCard(Equipment equipment) {
    final statusColor = equipment.status == EquipmentStatus.available
        ? AppTheme.successColor
        : equipment.status == EquipmentStatus.maintenance
            ? AppTheme.warningColor
            : AppTheme.errorColor;

    return Card(
      elevation: 2,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showEquipmentDetails(equipment),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Stack(
              children: [
                equipment.photos.isNotEmpty
                    ? Image.network(
                        equipment.photos.first,
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            _buildPlaceholderImage(),
                      )
                    : _buildPlaceholderImage(),
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      equipment.status.displayName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Category
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        equipment.category,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Name
                    Text(
                      equipment.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Brand & Model
                    if (equipment.brand != null)
                      Text(
                        '${equipment.brand}${equipment.model != null ? " ${equipment.model}" : ""}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),

                    const Spacer(),

                    // Quantity & Location
                    Row(
                      children: [
                        Icon(Icons.numbers, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          'Qty: ${equipment.quantity}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                        ),
                        if (equipment.location != null) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.location_on, size: 14, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              equipment.location!,
                              style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),

                    const SizedBox(height: 8),

                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _showEditEquipmentDialog(equipment),
                            icon: const Icon(Icons.edit, size: 16),
                            label: const Text('Edit', style: TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: () => _deleteEquipment(equipment),
                          icon: const Icon(Icons.delete, color: AppTheme.errorColor),
                          iconSize: 20,
                          tooltip: 'Delete',
                        ),
                      ],
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

  Widget _buildPlaceholderImage() {
    return Container(
      height: 160,
      width: double.infinity,
      color: Colors.grey[300],
      child: const Center(
        child: Icon(Icons.fitness_center, size: 64, color: Colors.grey),
      ),
    );
  }

  Widget _buildEmptyState() {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.fitness_center, size: 80, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              l10n.noEquipmentFound,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.noEquipmentFoundDescription,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showAddEquipmentDialog(),
              icon: const Icon(Icons.add),
              label: Text(l10n.addEquipment),
            ),
          ],
        ),
      ),
    );
  }

  void _showEquipmentDetails(Equipment equipment) {
    showDialog(
      context: context,
      builder: (context) => _EquipmentDetailsDialog(equipment: equipment),
    );
  }

  void _showAddEquipmentDialog() {
    showDialog(
      context: context,
      builder: (context) => _EquipmentFormDialog(
        onSave: _handleAddEquipment,
      ),
    );
  }

  void _showEditEquipmentDialog(Equipment equipment) {
    showDialog(
      context: context,
      builder: (context) => _EquipmentFormDialog(
        equipment: equipment,
        onSave: (data) => _handleEditEquipment(equipment.id, data),
      ),
    );
  }

  Future<void> _handleAddEquipment(Map<String, dynamic> data) async {
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => const Center(child: CircularProgressIndicator()),
    );
    
    try {
      await _equipmentService.addEquipment(
        name: data['name'],
        brand: data['brand'],
        category: data['category'],
        model: data['model'],
        quantity: data['quantity'],
        status: data['status'],
        purchaseDate: data['purchaseDate'],
        price: data['price'],
        warranty: data['warranty'],
        location: data['location'],
        description: data['description'],
        specifications: data['specifications'],
        photoFiles: data['photoFiles'],
      );

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Equipment added successfully')),
        );
        _loadEquipmentData();
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add equipment: $e')),
        );
      }
    }
  }

  Future<void> _handleEditEquipment(String id, Map<String, dynamic> data) async {
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => const Center(child: CircularProgressIndicator()),
    );
    
    try {
      await _equipmentService.updateEquipment(
        id: id,
        name: data['name'],
        brand: data['brand'],
        category: data['category'],
        model: data['model'],
        quantity: data['quantity'],
        status: data['status'],
        purchaseDate: data['purchaseDate'],
        price: data['price'],
        warranty: data['warranty'],
        location: data['location'],
        description: data['description'],
        specifications: data['specifications'],
        existingPhotos: data['existingPhotos'],
        newPhotoFiles: data['newPhotoFiles'],
      );

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Equipment updated successfully')),
        );
        _loadEquipmentData();
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update equipment: $e')),
        );
      }
    }
  }

  Future<void> _deleteEquipment(Equipment equipment) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.confirmDelete),
        content: Text(l10n.confirmDeleteEquipmentMessage(equipment.name)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _equipmentService.deleteEquipment(equipment.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Equipment deleted successfully')),
          );
        }
        _loadEquipmentData();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete equipment: $e')),
          );
        }
      }
    }
  }
}

// Equipment Details Dialog
class _EquipmentDetailsDialog extends StatelessWidget {
  final Equipment equipment;

  const _EquipmentDetailsDialog({required this.equipment});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(4),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      equipment.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Photos
                    if (equipment.photos.isNotEmpty)
                      SizedBox(
                        height: 200,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: equipment.photos.length,
                          itemBuilder: (context, index) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                equipment.photos[index],
                                width: 300,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 20),

                    // Details Grid
                    _buildDetailRow(l10n.category, equipment.category),
                    if (equipment.brand != null)
                      _buildDetailRow(l10n.brand, equipment.brand!),
                    if (equipment.model != null)
                      _buildDetailRow(l10n.model, equipment.model!),
                    _buildDetailRow(l10n.quantity, equipment.quantity.toString()),
                    _buildDetailRow(l10n.status, equipment.status.displayName),
                    if (equipment.location != null)
                      _buildDetailRow(l10n.location, equipment.location!),
                    if (equipment.purchaseDate != null)
                      _buildDetailRow(
                        l10n.purchaseDate,
                        DateFormat('MMM dd, yyyy').format(equipment.purchaseDate!),
                      ),
                    if (equipment.price != null)
                      _buildDetailRow(l10n.price, currencyFormat.format(equipment.price)),
                    if (equipment.warranty != null)
                      _buildDetailRow(
                        l10n.warranty,
                        '${equipment.warranty} ${l10n.months}',
                      ),

                    if (equipment.description != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        l10n.description,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(equipment.description!),
                    ],

                    if (equipment.specifications != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        l10n.specifications,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(equipment.specifications!),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}

// Equipment Form Dialog (Add/Edit)
class _EquipmentFormDialog extends StatefulWidget {
  final Equipment? equipment;
  final Function(Map<String, dynamic>) onSave;

  const _EquipmentFormDialog({
    this.equipment,
    required this.onSave,
  });

  @override
  State<_EquipmentFormDialog> createState() => _EquipmentFormDialogState();
}

class _EquipmentFormDialogState extends State<_EquipmentFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();
  final _warrantyController = TextEditingController();
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _specificationsController = TextEditingController();

  String _selectedCategory = EquipmentCategories.all.first;
  EquipmentStatus _selectedStatus = EquipmentStatus.available;
  DateTime? _purchaseDate;
  List<String> _existingPhotos = [];
  List<XFile> _newPhotoFiles = [];

  @override
  void initState() {
    super.initState();
    if (widget.equipment != null) {
      _loadEquipmentData();
    }
  }

  void _loadEquipmentData() {
    final eq = widget.equipment!;
    _nameController.text = eq.name;
    _brandController.text = eq.brand ?? '';
    _modelController.text = eq.model ?? '';
    _selectedCategory = eq.category;
    _quantityController.text = eq.quantity.toString();
    _selectedStatus = eq.status;
    _purchaseDate = eq.purchaseDate;
    _priceController.text = eq.price?.toString() ?? '';
    _warrantyController.text = eq.warranty?.toString() ?? '';
    _locationController.text = eq.location ?? '';
    _descriptionController.text = eq.description ?? '';
    _specificationsController.text = eq.specifications ?? '';
    _existingPhotos = List.from(eq.photos);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    _warrantyController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    _specificationsController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final ImagePicker picker = ImagePicker();
    final List<XFile> images = await picker.pickMultiImage();
    setState(() {
      _newPhotoFiles.addAll(images);
    });
  }

  void _removeExistingPhoto(int index) {
    setState(() {
      _existingPhotos.removeAt(index);
    });
  }

  void _removeNewPhoto(int index) {
    setState(() {
      _newPhotoFiles.removeAt(index);
    });
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final data = {
      'name': _nameController.text.trim(),
      'brand': _brandController.text.trim().isEmpty ? null : _brandController.text.trim(),
      'category': _selectedCategory,
      'model': _modelController.text.trim().isEmpty ? null : _modelController.text.trim(),
      'quantity': int.parse(_quantityController.text),
      'status': _selectedStatus,
      'purchaseDate': _purchaseDate,
      'price': _priceController.text.isEmpty ? null : double.parse(_priceController.text),
      'warranty': _warrantyController.text.isEmpty ? null : int.parse(_warrantyController.text),
      'location': _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      'specifications': _specificationsController.text.trim().isEmpty ? null : _specificationsController.text.trim(),
      if (widget.equipment != null) 'existingPhotos': _existingPhotos,
      if (widget.equipment != null) 'newPhotoFiles': _newPhotoFiles,
      if (widget.equipment == null) 'photoFiles': _newPhotoFiles,
    };

    // Close the form dialog first
    if (mounted) {
      Navigator.pop(context);
    }
    
    // Pass data to parent handler which will show loading dialog and handle the API call
    widget.onSave(data);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 700, maxHeight: 700),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(4),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    widget.equipment == null ? Icons.add : Icons.edit,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.equipment == null ? l10n.addEquipment : l10n.editEquipment,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),

            // Form
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Name
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          labelText: '${l10n.equipmentName} *',
                          border: const OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            value?.isEmpty ?? true ? 'Please enter name' : null,
                      ),
                      const SizedBox(height: 16),

                      // Brand & Model Row
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _brandController,
                              decoration: InputDecoration(
                                labelText: l10n.brand,
                                border: const OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _modelController,
                              decoration: InputDecoration(
                                labelText: l10n.model,
                                border: const OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Category & Quantity Row
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: _selectedCategory,
                              decoration: InputDecoration(
                                labelText: '${l10n.category} *',
                                border: const OutlineInputBorder(),
                              ),
                              items: EquipmentCategories.all
                                  .map((cat) => DropdownMenuItem(
                                        value: cat,
                                        child: Text(cat),
                                      ))
                                  .toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedCategory = value!;
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _quantityController,
                              decoration: InputDecoration(
                                labelText: '${l10n.quantity} *',
                                border: const OutlineInputBorder(),
                              ),
                              keyboardType: TextInputType.number,
                              validator: (value) {
                                if (value?.isEmpty ?? true) return 'Required';
                                if (int.tryParse(value!) == null) return 'Invalid number';
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Status
                      DropdownButtonFormField<EquipmentStatus>(
                        initialValue: _selectedStatus,
                        decoration: InputDecoration(
                          labelText: '${l10n.status} *',
                          border: const OutlineInputBorder(),
                        ),
                        items: EquipmentStatus.values
                            .map((status) => DropdownMenuItem(
                                  value: status,
                                  child: Text(status.displayName),
                                ))
                            .toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedStatus = value!;
                          });
                        },
                      ),
                      const SizedBox(height: 16),

                      // Purchase Date & Price Row
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final date = await showDatePicker(
                                  context: context,
                                  initialDate: _purchaseDate ?? DateTime.now(),
                                  firstDate: DateTime(2000),
                                  lastDate: DateTime.now(),
                                );
                                if (date != null) {
                                  setState(() {
                                    _purchaseDate = date;
                                  });
                                }
                              },
                              child: InputDecorator(
                                decoration: InputDecoration(
                                  labelText: l10n.purchaseDate,
                                  border: const OutlineInputBorder(),
                                  suffixIcon: const Icon(Icons.calendar_today),
                                ),
                                child: Text(
                                  _purchaseDate != null
                                      ? DateFormat('MMM dd, yyyy').format(_purchaseDate!)
                                      : 'Select date',
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _priceController,
                              decoration: InputDecoration(
                                labelText: l10n.price,
                                border: const OutlineInputBorder(),
                                prefixText: '₹ ',
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Warranty & Location Row
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _warrantyController,
                              decoration: InputDecoration(
                                labelText: '${l10n.warranty} (months)',
                                border: const OutlineInputBorder(),
                              ),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _locationController,
                              decoration: InputDecoration(
                                labelText: l10n.location,
                                border: const OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Description
                      TextFormField(
                        controller: _descriptionController,
                        decoration: InputDecoration(
                          labelText: l10n.description,
                          border: const OutlineInputBorder(),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),

                      // Specifications
                      TextFormField(
                        controller: _specificationsController,
                        decoration: InputDecoration(
                          labelText: l10n.specifications,
                          border: const OutlineInputBorder(),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),

                      // Photos Section
                      Text(
                        l10n.photos,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Existing Photos
                      if (_existingPhotos.isNotEmpty) ...[
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _existingPhotos
                              .asMap()
                              .entries
                              .map((entry) => Stack(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          entry.value,
                                          width: 80,
                                          height: 80,
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                      Positioned(
                                        top: 0,
                                        right: 0,
                                        child: IconButton(
                                          icon: const Icon(Icons.close,
                                              color: Colors.white, size: 16),
                                          style: IconButton.styleFrom(
                                            backgroundColor: Colors.black54,
                                            padding: EdgeInsets.zero,
                                            minimumSize: const Size(24, 24),
                                          ),
                                          onPressed: () => _removeExistingPhoto(entry.key),
                                        ),
                                      ),
                                    ],
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // New Photos
                      if (_newPhotoFiles.isNotEmpty) ...[
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _newPhotoFiles
                              .asMap()
                              .entries
                              .map((entry) => Stack(
                                    children: [
                                      Container(
                                        width: 80,
                                        height: 80,
                                        decoration: BoxDecoration(
                                          color: Colors.grey[300],
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(Icons.image, size: 40),
                                      ),
                                      Positioned(
                                        top: 0,
                                        right: 0,
                                        child: IconButton(
                                          icon: const Icon(Icons.close,
                                              color: Colors.white, size: 16),
                                          style: IconButton.styleFrom(
                                            backgroundColor: Colors.black54,
                                            padding: EdgeInsets.zero,
                                            minimumSize: const Size(24, 24),
                                          ),
                                          onPressed: () => _removeNewPhoto(entry.key),
                                        ),
                                      ),
                                    ],
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Add Photos Button
                      OutlinedButton.icon(
                        onPressed: _pickImages,
                        icon: const Icon(Icons.add_photo_alternate),
                        label: Text(l10n.addPhotos),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Actions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.grey[300]!)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(l10n.cancel),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _handleSave,
                    child: Text(l10n.save),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
