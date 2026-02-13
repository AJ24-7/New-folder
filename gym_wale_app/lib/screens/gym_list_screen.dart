import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../models/gym.dart';
import '../models/activity.dart';
import '../config/app_theme.dart';
import '../widgets/gym_card.dart';
import '../widgets/activity_widgets.dart';
import '../l10n/app_localizations.dart';
import 'gym_detail_screen.dart';
import 'trainers_screen.dart';
import 'diet_plans_screen.dart';
import 'workout_assistant_screen.dart';

class GymListScreen extends StatefulWidget {
  final bool showSearch;
  final List<String>? initialActivities;
  final double? maxPrice;
  final int initialTabIndex;
  
  const GymListScreen({
    Key? key,
    this.showSearch = false,
    this.initialActivities,
    this.maxPrice,
    this.initialTabIndex = 0,
  }) : super(key: key);

  @override
  State<GymListScreen> createState() => _GymListScreenState();
}

class _GymListScreenState extends State<GymListScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  final _cityController = TextEditingController();
  final _pincodeController = TextEditingController();
  List<Gym> _gyms = [];
  List<Gym> _filteredGyms = [];
  List<String> _selectedActivities = [];
  double _priceRange = 5000;
  bool _isLoading = true;
  bool _showFilters = false;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _selectedActivities = widget.initialActivities ?? [];
    _priceRange = widget.maxPrice ?? 5000;
    _loadGyms();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _cityController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  Future<void> _loadGyms() async {
    setState(() => _isLoading = true);
    
    try {
      // Get gyms from real backend API
      final gyms = await ApiService.getGyms(
        city: _cityController.text.isNotEmpty ? _cityController.text : null,
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
      );
      
      if (mounted) {
        setState(() {
          _gyms = gyms;
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error loading gyms: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load gyms: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _getUserLocation() async {
    try {
      final position = await LocationService.getCurrentPosition();
      
      if (position == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Unable to get location. Please enable location services.'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
        return;
      }

      // Load nearby gyms based on location
      final nearbyGyms = await ApiService.getNearbyGyms(
        position.latitude,
        position.longitude,
        radius: 10.0, // 10 km radius
      );
      
      if (mounted) {
        setState(() {
          _gyms = nearbyGyms;
          _applyFilters();
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Found ${nearbyGyms.length} gyms nearby'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
      
      _applyFilters();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredGyms = _gyms.where((gym) {
        // Price filter
        bool matchesPrice = true; // Would check gym's lowest membership price
        
        // Search filter
        bool matchesSearch = _searchController.text.isEmpty ||
            gym.name.toLowerCase().contains(_searchController.text.toLowerCase()) ||
            (gym.city?.toLowerCase().contains(_searchController.text.toLowerCase()) ?? false);
        
        return matchesPrice && matchesSearch;
      }).toList();
      
      // Apply sort
      _sortGyms(_selectedFilter);
    });
  }

  /// Get default activities for filtering
  List<Activity> _getDefaultActivities() {
    return [
      Activity(name: 'Yoga', icon: 'fa-yoga', description: 'Mind and body wellness'),
      Activity(name: 'Gym', icon: 'fa-dumbbell', description: 'Strength training'),
      Activity(name: 'Zumba', icon: 'fa-music', description: 'Dance fitness'),
      Activity(name: 'CrossFit', icon: 'fa-crossfit', description: 'High intensity training'),
      Activity(name: 'Cardio', icon: 'fa-heartbeat', description: 'Cardiovascular exercises'),
      Activity(name: 'Pilates', icon: 'fa-spa', description: 'Core strengthening'),
      Activity(name: 'Boxing', icon: 'fa-boxing-glove', description: 'Combat training'),
      Activity(name: 'Swimming', icon: 'fa-swimmer', description: 'Water exercises'),
      Activity(name: 'Cycling', icon: 'fa-bicycle', description: 'Indoor cycling'),
      Activity(name: 'Martial Arts', icon: 'fa-fist-raised', description: 'Self defense training'),
    ];
  }

  void _sortGyms(String sortType) {
    setState(() {
      _selectedFilter = sortType;
      switch (sortType) {
        case 'Rating':
          _filteredGyms.sort((a, b) => b.rating.compareTo(a.rating));
          break;
        case 'Distance':
          _filteredGyms.sort((a, b) => 
            (a.distance ?? double.infinity).compareTo(b.distance ?? double.infinity));
          break;
        case 'Name':
          _filteredGyms.sort((a, b) => a.name.compareTo(b.name));
          break;
        default:
          _filteredGyms = List.from(_gyms);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Explore'),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: false,
          indicatorColor: AppTheme.primaryColor,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.normal,
            fontSize: 14,
          ),
          tabs: const [
            Tab(text: 'Find Gyms', icon: Icon(Icons.fitness_center, size: 20)),
            Tab(text: 'Trainers', icon: Icon(Icons.person_outline, size: 20)),
            Tab(text: 'Diet', icon: Icon(Icons.restaurant_menu, size: 20)),
            Tab(text: 'Workout', icon: Icon(Icons.sports_gymnastics, size: 20)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGymsTab(),
          const TrainersScreen(),
          const DietPlansScreen(),
          const WorkoutAssistantScreen(),
        ],
      ),
    );
  }

  Widget _buildGymsTab() {
    return Column(
      children: [
        // Filter and Sort Actions Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF1E1E1E)
                : Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Find Gyms',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                icon: Icon(_showFilters ? Icons.filter_list_off : Icons.filter_list),
                onPressed: () {
                  setState(() => _showFilters = !_showFilters);
                },
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.sort),
                onSelected: _sortGyms,
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'All', child: Text('All')),
                  const PopupMenuItem(value: 'Rating', child: Text('Highest Rated')),
                  const PopupMenuItem(value: 'Distance', child: Text('Nearest')),
                  const PopupMenuItem(value: 'Name', child: Text('Name (A-Z)')),
                ],
              ),
            ],
          ),
        ),
        
          // Search Bar with Near Me Button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF1E1E1E)
                  : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    autofocus: widget.showSearch,
                    style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color),
                    decoration: InputDecoration(
                      hintText: AppLocalizations.of(context)!.searchGyms,
                      hintStyle: TextStyle(color: Theme.of(context).textTheme.bodyMedium?.color),
                      prefixIcon: Icon(Icons.search, color: Theme.of(context).iconTheme.color),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: Icon(Icons.clear, color: Theme.of(context).iconTheme.color),
                              onPressed: () {
                                _searchController.clear();
                                _applyFilters();
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFF2C2C2C)
                          : AppTheme.backgroundColor,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: (val) => _applyFilters(),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: _getUserLocation,
                  icon: const Icon(Icons.my_location, size: 18),
                  label: Text(AppLocalizations.of(context)!.nearMe),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Advanced Filters (Expandable)
          if (_showFilters)
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Filters',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Price Range
                  PriceRangeSlider(
                    currentPrice: _priceRange,
                    minPrice: 500,
                    maxPrice: 10000,
                    onPriceChanged: (price) {
                      setState(() => _priceRange = price);
                      _applyFilters();
                    },
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Activities
                  ActivitySelectionGrid(
                    availableActivities: _getDefaultActivities(),
                    selectedActivities: _selectedActivities,
                    onSelectionChanged: (activities) {
                      setState(() => _selectedActivities = activities);
                      _applyFilters();
                    },
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Apply/Clear Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _selectedActivities.clear();
                              _priceRange = 5000;
                              _showFilters = false;
                            });
                            _applyFilters();
                          },
                          child: const Text('Clear Filters'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() => _showFilters = false);
                            _applyFilters();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                          ),
                          child: const Text('Apply'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          
          // Filter Chips
          if (!_showFilters)
            Container(
              height: 50,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildFilterChip('All'),
                  _buildFilterChip('Rating'),
                  _buildFilterChip('Distance'),
                  _buildFilterChip('Name'),
                ],
              ),
            ),
          
          // Gym List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredGyms.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.search_off,
                              size: 64,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              AppLocalizations.of(context)!.noGymsFound,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              AppLocalizations.of(context)!.tryAdjustingSearch,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadGyms,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredGyms.length,
                          itemBuilder: (context, index) {
                            return GymCard(
                              gym: _filteredGyms[index],
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => GymDetailScreen(
                                      gymId: _filteredGyms[index].id,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => _sortGyms(label),
        backgroundColor: AppTheme.backgroundColor,
        selectedColor: AppTheme.primaryColor.withOpacity(0.2),
        checkmarkColor: AppTheme.primaryColor,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
    );
  }
}