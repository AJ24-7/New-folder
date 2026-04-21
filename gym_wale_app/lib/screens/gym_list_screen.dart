import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
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
  final String? initialSearchQuery;
  final bool autoUseNearMe;
  final int initialTabIndex;
  
  const GymListScreen({
    Key? key,
    this.showSearch = false,
    this.initialActivities,
    this.maxPrice,
    this.initialSearchQuery,
    this.autoUseNearMe = false,
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
  Set<String> _activeGymIds = {}; // Track gyms user is an active member of
  bool _isManualSearch = false; // Track if user is manually searching
  Position? _currentPosition;
  bool _useNearMe = false;
  final double _nearMeRadiusKm = 10.0;
  List<Activity> _availableActivities = [];

  bool get _isHindiWeb =>
      kIsWeb && Localizations.localeOf(context).languageCode == 'hi';

  String _webText(String english, String hindi) => _isHindiWeb ? hindi : english;

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
    _useNearMe = widget.autoUseNearMe;

    if (widget.initialSearchQuery != null &&
        widget.initialSearchQuery!.trim().isNotEmpty) {
      _searchController.text = widget.initialSearchQuery!.trim();
      _isManualSearch = true;
    }

    _initializeData();
    
    // Listen to search changes to detect manual search
    _searchController.addListener(() {
      setState(() {
        _isManualSearch = _searchController.text.isNotEmpty;
      });
      _applyFilters(); // Reapply filters when search changes
    });
  }

  /// Initialize data in proper sequence
  Future<void> _initializeData() async {
    await _loadActiveMemberships();

    if (_useNearMe) {
      final hasLocation = await _captureUserLocation(showError: false);
      if (!hasLocation) {
        _useNearMe = false;
      }
    }

    await _loadGyms();
  }

  Future<bool> _captureUserLocation({bool showError = true}) async {
    final position = await LocationService.getCurrentPosition();
    if (position == null) {
      if (showError && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to get location. Please enable location services.'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
      return false;
    }

    _currentPosition = position;
    return true;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _cityController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  /// Load user's active memberships to filter gyms
  Future<void> _loadActiveMemberships() async {
    try {
      final activeMemberships = await ApiService.getActiveMemberships();
      
      setState(() {
        _activeGymIds = activeMemberships
            .map((membership) {
              // Gym ID is nested under gym.id in the response
              if (membership['gym'] != null && membership['gym'] is Map) {
                return membership['gym']['id']?.toString();
              }
              return null;
            })
            .where((id) => id != null)
            .cast<String>()
            .toSet();
      });
      
      print('[GYM_LIST] Loaded ${_activeGymIds.length} active gym memberships');
      if (_activeGymIds.isNotEmpty) {
        print('[GYM_LIST] Active gym IDs: $_activeGymIds');
      }
    } catch (e) {
      print('[GYM_LIST] Error loading active memberships: $e');
    }
  }

  Future<void> _loadGyms() async {
    setState(() => _isLoading = true);

    try {
      // Pass activities and price to backend for server-side filtering
      final gyms = await ApiService.getGyms(
        city: _cityController.text.isNotEmpty ? _cityController.text : null,
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
        activities: _selectedActivities.isNotEmpty ? _selectedActivities : null,
        maxPrice: _priceRange < 10000 ? _priceRange : null,
        lat: _currentPosition?.latitude,
        lng: _currentPosition?.longitude,
        radius: (_useNearMe && _currentPosition != null) ? _nearMeRadiusKm : null,
      );

      final gymsWithDistance = _attachComputedDistances(gyms);
      
      if (mounted) {
        setState(() {
          _gyms = gymsWithDistance;
          _availableActivities = _deriveAvailableActivities(gymsWithDistance);
          _isLoading = false;
        });
        _applyFilters();
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
      final found = await _captureUserLocation();
      if (!found) {
        return;
      }

      setState(() => _useNearMe = true);
      await _loadGyms();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Found ${_gyms.length} gyms within ${_nearMeRadiusKm.toInt()} km'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  /// Normalize an activity name for comparison: trim, lowercase, remove spaces.
    /// Keep spacing intact to enforce exact admin activity name matching.
  String _normalizeActivity(String s) =>
      s.trim().toLowerCase();

  List<Gym> _attachComputedDistances(List<Gym> gyms) {
    if (_currentPosition == null) return gyms;

    return gyms.map((gym) {
      if (gym.distance != null && gym.distance!.isFinite) {
        return gym;
      }

      if (gym.latitude == 0.0 && gym.longitude == 0.0) {
        return gym;
      }

      final distanceKm = LocationService.calculateDistance(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        gym.latitude,
        gym.longitude,
      );

      return gym.copyWith(distance: distanceKm);
    }).toList();
  }

  double _resolveGymDistanceKm(Gym gym) {
    if (gym.distance != null && gym.distance!.isFinite) {
      return gym.distance!;
    }

    if (_currentPosition == null || (gym.latitude == 0.0 && gym.longitude == 0.0)) {
      return double.infinity;
    }

    return LocationService.calculateDistance(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      gym.latitude,
      gym.longitude,
    );
  }

  List<Activity> _deriveAvailableActivities(List<Gym> gyms) {
    final defaults = _getDefaultActivities();
    final byName = <String, Activity>{
      for (final activity in defaults) _normalizeActivity(activity.name): activity,
    };

    for (final gym in gyms) {
      for (final activityName in gym.activities) {
        final trimmed = activityName.trim();
        if (trimmed.isEmpty) continue;

        final key = _normalizeActivity(trimmed);
        byName.putIfAbsent(
          key,
          () => Activity(
            name: trimmed,
            icon: 'fa-dumbbell',
            description: '',
          ),
        );
      }
    }

    final ordered = <Activity>[];
    final remaining = Map<String, Activity>.from(byName);

    for (final activity in defaults) {
      final key = _normalizeActivity(activity.name);
      final found = remaining.remove(key);
      if (found != null) {
        ordered.add(found);
      }
    }

    final extras = remaining.values.toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    ordered.addAll(extras);

    return ordered;
  }

  void _applyFilters() {
    print('[GYM_LIST] Applying filters...');
    print('[GYM_LIST] Total gyms: ${_gyms.length}');
    print('[GYM_LIST] Selected activities: $_selectedActivities');

    setState(() {
      _filteredGyms = _gyms.where((gym) {
        // Search filter
        final matchesSearch = _searchController.text.isEmpty ||
            gym.name.toLowerCase().contains(_searchController.text.toLowerCase()) ||
            (gym.city?.toLowerCase().contains(_searchController.text.toLowerCase()) ?? false);

        // Activities filter — gym must offer at least one of the selected activities.
        // Match exact activity names (case-insensitive) from admin-configured list.
        final matchesActivities = _selectedActivities.isEmpty ||
            _selectedActivities.any((selected) =>
                gym.activities.any((a) =>
                    _normalizeActivity(a) == _normalizeActivity(selected)));

        // Filter out active member gyms UNLESS user is manually searching
        final notActiveMember = !_activeGymIds.contains(gym.id) || _isManualSearch;
        if (_activeGymIds.contains(gym.id)) {
          print('[GYM_LIST] Gym ${gym.name} (${gym.id}) - Active member: ${_isManualSearch ? "shown (manual search)" : "hidden"}');
        }

        final matchesNearMe = !_useNearMe || _currentPosition == null
            ? true
            : _resolveGymDistanceKm(gym) <= _nearMeRadiusKm;

        return matchesSearch && matchesActivities && notActiveMember && matchesNearMe;
      }).toList();

      // Apply current sort inline (avoids recursive setState issues)
      switch (_selectedFilter) {
        case 'Rating':
          _filteredGyms.sort((a, b) => b.rating.compareTo(a.rating));
          break;
        case 'Distance':
          _filteredGyms.sort((a, b) => _resolveGymDistanceKm(a).compareTo(_resolveGymDistanceKm(b)));
          break;
        case 'Name':
          _filteredGyms.sort((a, b) => a.name.compareTo(b.name));
          break;
      }

      print('[GYM_LIST] Filtered gyms: ${_filteredGyms.length}');
    });
  }

  /// Get default activities for filtering — matches PredefinedActivities in admin app
  List<Activity> _getDefaultActivities() {
    return [
      Activity(name: 'Yoga',              icon: 'fa-person-praying',   description: 'Mind and body wellness'),
      Activity(name: 'Zumba',             icon: 'fa-music',            description: 'Dance fitness'),
      Activity(name: 'CrossFit',          icon: 'fa-dumbbell',         description: 'High intensity training'),
      Activity(name: 'Weight Training',   icon: 'fa-weight-hanging',   description: 'Strength training'),
      Activity(name: 'Cardio',            icon: 'fa-heartbeat',        description: 'Cardiovascular exercises'),
      Activity(name: 'Pilates',           icon: 'fa-child',            description: 'Core strengthening'),
      Activity(name: 'HIIT',              icon: 'fa-bolt',             description: 'High intensity interval training'),
      Activity(name: 'Aerobics',          icon: 'fa-running',          description: 'Aerobic exercises'),
      Activity(name: 'Martial Arts',      icon: 'fa-hand-fist',        description: 'Self defense training'),
      Activity(name: 'Spin Class',        icon: 'fa-bicycle',          description: 'Indoor cycling'),
      Activity(name: 'Swimming',          icon: 'fa-person-swimming',  description: 'Water exercises'),
      Activity(name: 'Boxing',            icon: 'fa-hand-rock',        description: 'Combat training'),
      Activity(name: 'Personal Training', icon: 'fa-user-tie',         description: 'One-on-one training'),
      Activity(name: 'Bootcamp',          icon: 'fa-shoe-prints',      description: 'Group fitness bootcamp'),
      Activity(name: 'Stretching',        icon: 'fa-arrows-up-down',   description: 'Flexibility training'),
    ];
  }

  void _sortGyms(String sortType) {
    setState(() => _selectedFilter = sortType);
    _applyFilters();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_webText('Explore', 'एक्सप्लोर')),
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
          tabs: [
            Tab(text: _webText('Find Gyms', 'जिम खोजें'), icon: const Icon(Icons.fitness_center, size: 20)),
            Tab(text: _webText('Trainers', 'ट्रेनर्स'), icon: const Icon(Icons.person_outline, size: 20)),
            Tab(text: _webText('Diet', 'डाइट'), icon: const Icon(Icons.restaurant_menu, size: 20)),
            Tab(text: _webText('Workout', 'वर्कआउट'), icon: const Icon(Icons.sports_gymnastics, size: 20)),
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
                  _webText('Find Gyms', 'जिम खोजें'),
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
                  PopupMenuItem(value: 'All', child: Text(_webText('All', 'सभी'))),
                  PopupMenuItem(value: 'Rating', child: Text(_webText('Highest Rated', 'उच्च रेटिंग'))),
                  PopupMenuItem(value: 'Distance', child: Text(_webText('Nearest', 'नजदीकी'))),
                  PopupMenuItem(value: 'Name', child: Text(_webText('Name (A-Z)', 'नाम (A-Z)'))),
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
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF1E1E1E)
                  : Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _webText('Filters', 'फ़िल्टर'),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).textTheme.titleLarge?.color,
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
                    availableActivities: _availableActivities.isNotEmpty
                        ? _availableActivities
                        : _getDefaultActivities(),
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
                              _useNearMe = false;
                              _showFilters = false;
                            });
                            _loadGyms(); // Reload without filters
                          },
                          child: Text(_webText('Clear Filters', 'फ़िल्टर साफ़ करें')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() => _showFilters = false);
                            _loadGyms(); // Reload from backend with current filters
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                          ),
                          child: Text(_webText('Apply', 'लागू करें')),
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
                  _buildFilterChip('All', _webText('All', 'सभी')),
                  _buildFilterChip('Rating', _webText('Rating', 'रेटिंग')),
                  _buildFilterChip('Distance', _webText('Distance', 'दूरी')),
                  _buildFilterChip('Name', _webText('Name', 'नाम')),
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
                            final gym = _filteredGyms[index];
                            final isActiveMember = _activeGymIds.contains(gym.id);
                            
                            return GymCard(
                              gym: gym,
                              showActiveMemberBadge: isActiveMember,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => GymDetailScreen(
                                      gymId: gym.id,
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

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _selectedFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => _sortGyms(value),
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