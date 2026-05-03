import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../models/gym.dart';
import '../models/activity.dart';
import '../models/membership_plan.dart';
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
  final FocusNode _cityFocusNode = FocusNode();
  final _pincodeController = TextEditingController();
  List<Gym> _gyms = [];
  List<Gym> _filteredGyms = [];
  List<String> _selectedActivities = [];
  double _priceRange = 5000;
  bool _isLoading = true;
  String _selectedFilter = 'All';
  Set<String> _activeGymIds = {}; // Track gyms user is an active member of
  bool _isManualSearch = false; // Track if user is manually searching
  Position? _currentPosition;
  bool _useNearMe = false;
  double _nearMeRadiusKm = 10.0;
  List<Activity> _availableActivities = [];
  Timer? _reloadDebounce;
  Timer? _cityAvailabilityDebounce;
  final Map<String, bool> _cityAvailabilityCache = {};
  bool? _cityAvailability;
  bool _checkingCityAvailability = false;
  final List<String> _indianCities = const [
    'Agartala',
    'Agra',
    'Ahmedabad',
    'Aizawl',
    'Ajmer',
    'Akola',
    'Aligarh',
    'Allahabad',
    'Amritsar',
    'Aurangabad',
    'Bengaluru',
    'Bhopal',
    'Bhubaneswar',
    'Bilaspur',
    'Chandigarh',
    'Chennai',
    'Coimbatore',
    'Cuttack',
    'Dehradun',
    'Delhi',
    'Dhanbad',
    'Durgapur',
    'Faridabad',
    'Gandhinagar',
    'Ghaziabad',
    'Goa',
    'Gorakhpur',
    'Guntur',
    'Gurugram',
    'Guwahati',
    'Gwalior',
    'Hubli',
    'Hyderabad',
    'Indore',
    'Jabalpur',
    'Jaipur',
    'Jammu',
    'Jamnagar',
    'Jamshedpur',
    'Jodhpur',
    'Kanpur',
    'Kochi',
    'Kolkata',
    'Kota',
    'Lucknow',
    'Ludhiana',
    'Madurai',
    'Mangaluru',
    'Meerut',
    'Mumbai',
    'Mysuru',
    'Nagpur',
    'Nashik',
    'Noida',
    'Patna',
    'Pondicherry',
    'Pune',
    'Raipur',
    'Rajkot',
    'Ranchi',
    'Rourkela',
    'Salem',
    'Shimla',
    'Siliguri',
    'Solapur',
    'Surat',
    'Thane',
    'Tiruchirappalli',
    'Trivandrum',
    'Udaipur',
    'Ujjain',
    'Vadodara',
    'Varanasi',
    'Vijayawada',
    'Visakhapatnam',
  ];
  final Map<String, double> _gymRatingById = {};
  final Map<String, int> _gymReviewCountById = {};
  final Map<String, String> _gymLogoById = {};
  final Set<String> _gymRatingLoadInFlight = {};
  final Map<String, GymCardPriceSummary> _gymPriceSummaryById = {};
  final Set<String> _gymPriceLoadInFlight = {};

  bool get _isHindiWeb =>
      kIsWeb && Localizations.localeOf(context).languageCode == 'hi';

  String _webText(String english, String hindi) => _isHindiWeb ? hindi : english;

  bool get _showCityUnavailableMessage {
    return _cityController.text.trim().isNotEmpty && _cityAvailability == false;
  }

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
      _applyFilters();
      _scheduleReloadGyms();
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
    _reloadDebounce?.cancel();
    _cityAvailabilityDebounce?.cancel();
    _tabController.dispose();
    _searchController.dispose();
    _cityController.dispose();
    _cityFocusNode.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  void _scheduleReloadGyms({bool immediate = false}) {
    _reloadDebounce?.cancel();
    if (immediate) {
      _loadGyms();
      return;
    }

    _reloadDebounce = Timer(const Duration(milliseconds: 350), () {
      _loadGyms();
    });
  }

  String _normalizeCity(String city) => city.trim().toLowerCase();

  void _handleCityInputChange(String value) {
    final trimmed = value.trim();
    if (_useNearMe) {
      setState(() => _useNearMe = false);
    }
    if (trimmed.isEmpty) {
      setState(() {
        _cityAvailability = null;
        _checkingCityAvailability = false;
      });
      _scheduleReloadGyms(immediate: true);
      _applyFilters();
      return;
    }
    if (_cityAvailability != null) {
      setState(() => _cityAvailability = null);
    }
    _scheduleReloadGyms();
    _applyFilters();
    _scheduleCityAvailabilityCheck(trimmed);
  }

  void _applyCitySelection(String city) {
    final trimmed = city.trim();
    _cityController.text = trimmed;
    if (_useNearMe) {
      setState(() => _useNearMe = false);
    }
    if (trimmed.isEmpty) {
      setState(() {
        _cityAvailability = null;
        _checkingCityAvailability = false;
      });
      _scheduleReloadGyms(immediate: true);
      _applyFilters();
      return;
    }
    _scheduleReloadGyms(immediate: true);
    _applyFilters();
    _scheduleCityAvailabilityCheck(trimmed);
  }

  void _scheduleCityAvailabilityCheck(String city) {
    _cityAvailabilityDebounce?.cancel();
    final normalized = _normalizeCity(city);
    if (normalized.isEmpty) return;
    _cityAvailabilityDebounce = Timer(const Duration(milliseconds: 400), () {
      _checkCityAvailability(city);
    });
  }

  Future<void> _checkCityAvailability(String city) async {
    final normalized = _normalizeCity(city);
    if (normalized.isEmpty) return;
    if (_cityAvailabilityCache.containsKey(normalized)) {
      if (mounted) {
        setState(() => _cityAvailability = _cityAvailabilityCache[normalized]);
      }
      return;
    }

    if (mounted) {
      setState(() => _checkingCityAvailability = true);
    }

    try {
      final gyms = await ApiService.getGyms(city: city);
      final available = gyms.isNotEmpty;
      _cityAvailabilityCache[normalized] = available;
      if (mounted) {
        setState(() => _cityAvailability = available);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _cityAvailability = null);
      }
    } finally {
      if (mounted) {
        setState(() => _checkingCityAvailability = false);
      }
    }
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
      
      // print('[GYM_LIST] Loaded ${_activeGymIds.length} active gym memberships');
      if (_activeGymIds.isNotEmpty) {
        // print('[GYM_LIST] Active gym IDs: $_activeGymIds');
      }
    } catch (e) {
      // print('[GYM_LIST] Error loading active memberships: $e');
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
        _loadGymCardRatings(gymsWithDistance);
        _loadGymCardPrices(gymsWithDistance);
        _applyFilters();
      }
    } catch (e) {
      // print('Error loading gyms: $e');
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
      if (!found) return;

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
    // print('[GYM_LIST] Applying filters...');
    // print('[GYM_LIST] Total gyms: ${_gyms.length}');
    // print('[GYM_LIST] Selected activities: $_selectedActivities');

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
          // print('[GYM_LIST] Gym ${gym.name} (${gym.id}) - Active member: ${_isManualSearch ? "shown (manual search)" : "hidden"}');
        }

        final matchesNearMe = !_useNearMe || _currentPosition == null
            ? true
            : _resolveGymDistanceKm(gym) <= _nearMeRadiusKm;

        return matchesSearch && matchesActivities && notActiveMember && matchesNearMe;
      }).toList();

      // Apply current sort inline (avoids recursive setState issues)
      if (_useNearMe) {
        _filteredGyms.sort(
          (a, b) => _resolveGymDistanceKm(a).compareTo(_resolveGymDistanceKm(b)),
        );
      } else {
        switch (_selectedFilter) {
          case 'Rating':
            _filteredGyms.sort((a, b) => b.rating.compareTo(a.rating));
            break;
          case 'PriceLow':
            _filteredGyms.sort(_comparePriceAsc);
            break;
          case 'PriceHigh':
            _filteredGyms.sort(_comparePriceDesc);
            break;
        }
      }

      // print('[GYM_LIST] Filtered gyms: ${_filteredGyms.length}');
    });
  }

  Future<void> _loadGymCardRatings(List<Gym> gyms) async {
    if (gyms.isEmpty) return;

    final targets = gyms.take(14);
    final tasks = <Future<void>>[];

    for (final gym in targets) {
      if (gym.id.isEmpty ||
          _gymRatingById.containsKey(gym.id) ||
          _gymRatingLoadInFlight.contains(gym.id)) {
        continue;
      }

      _gymRatingLoadInFlight.add(gym.id);
      tasks.add(_fetchGymCardRating(gym.id));
    }

    if (tasks.isEmpty) return;
    await Future.wait(tasks);
  }

  Future<void> _fetchGymCardRating(String gymId) async {
    try {
      final gymDetails = await ApiService.getGymById(gymId);
      if (gymDetails != null && mounted) {
        setState(() {
          _gymRatingById[gymId] = gymDetails.rating;
          _gymReviewCountById[gymId] = gymDetails.reviewCount;
          if (gymDetails.logoUrl != null && gymDetails.logoUrl!.isNotEmpty) {
            _gymLogoById[gymId] = gymDetails.logoUrl!;
          }
        });
      }
    } catch (_) {
    } finally {
      _gymRatingLoadInFlight.remove(gymId);
    }
  }

  Future<void> _loadGymCardPrices(List<Gym> gyms) async {
    if (gyms.isEmpty) return;

    final targets = gyms.take(14);
    final tasks = <Future<void>>[];

    for (final gym in targets) {
      if (gym.id.isEmpty ||
          _gymPriceSummaryById.containsKey(gym.id) ||
          _gymPriceLoadInFlight.contains(gym.id)) {
        continue;
      }

      _gymPriceLoadInFlight.add(gym.id);
      tasks.add(_fetchGymCardPrice(gym.id));
    }

    if (tasks.isEmpty) return;
    await Future.wait(tasks);
  }

  Future<void> _fetchGymCardPrice(String gymId) async {
    try {
      final plan = await ApiService.getGymMembershipPlan(gymId);
      final bestPrice = _resolveBestMembershipPrice(plan);
      if (bestPrice != null && mounted) {
        setState(() {
          _gymPriceSummaryById[gymId] = bestPrice;
        });
        if (_selectedFilter == 'PriceLow' || _selectedFilter == 'PriceHigh') {
          _applyFilters();
        }
      }
    } catch (_) {
    } finally {
      _gymPriceLoadInFlight.remove(gymId);
    }
  }

  double? _resolveGymSortPrice(Gym gym) {
    final summary = _gymPriceSummaryById[gym.id];
    return summary?.finalPrice;
  }

  int _comparePriceAsc(Gym a, Gym b) {
    final aPrice = _resolveGymSortPrice(a);
    final bPrice = _resolveGymSortPrice(b);
    if (aPrice == null && bPrice == null) return 0;
    if (aPrice == null) return 1;
    if (bPrice == null) return -1;
    return aPrice.compareTo(bPrice);
  }

  int _comparePriceDesc(Gym a, Gym b) {
    final aPrice = _resolveGymSortPrice(a);
    final bPrice = _resolveGymSortPrice(b);
    if (aPrice == null && bPrice == null) return 0;
    if (aPrice == null) return 1;
    if (bPrice == null) return -1;
    return bPrice.compareTo(aPrice);
  }

  GymCardPriceSummary? _resolveBestMembershipPrice(MembershipPlan? plan) {
    if (plan == null) return null;

    GymCardPriceSummary? best;

    void considerOption(
      MonthlyOption option, {
      String? tierName,
    }) {
      if (option.price <= 0) return;

      final discountedPrice = option.finalPrice;
      final discountPercent = option.discount;
      final candidate = GymCardPriceSummary(
        basePrice: option.price,
        finalPrice: discountedPrice,
        discountPercent: discountPercent,
        durationLabel: option.durationLabel,
        tierName: tierName,
      );

      if (best == null) {
        best = candidate;
        return;
      }

      final candidateWinsOnPrice = candidate.finalPrice < best!.finalPrice;
      final tieButBetterDiscount =
          candidate.finalPrice == best!.finalPrice &&
              candidate.discountPercent > best!.discountPercent;

      if (candidateWinsOnPrice || tieButBetterDiscount) {
        best = candidate;
      }
    }

    if (plan.monthlyOptions.isNotEmpty) {
      for (final option in plan.monthlyOptions) {
        considerOption(option);
      }
    }

    if (plan.tiers.isNotEmpty) {
      for (final tier in plan.tiers) {
        for (final option in tier.monthlyOptions) {
          considerOption(option, tierName: tier.name);
        }
      }
    }

    return best;
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
        toolbarHeight: 48,
        titleSpacing: 0,
        title: const SizedBox.shrink(),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(46),
          child: TabBar(
            controller: _tabController,
            isScrollable: false,
            indicatorColor: AppTheme.primaryColor,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: AppTheme.textSecondary,
            labelStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
            unselectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.normal,
              fontSize: 13,
            ),
            tabs: [
              Tab(text: _webText('Find Gyms', 'जिम खोजें'), icon: const Icon(Icons.fitness_center, size: 18)),
              Tab(text: _webText('Trainers', 'ट्रेनर्स'), icon: const Icon(Icons.person_outline, size: 18)),
              Tab(text: _webText('Diet', 'डाइट'), icon: const Icon(Icons.restaurant_menu, size: 18)),
              Tab(text: _webText('Workout', 'वर्कआउट'), icon: const Icon(Icons.sports_gymnastics, size: 18)),
            ],
          ),
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
    final activitiesLabel = _selectedActivities.isEmpty
        ? _webText('Activities', 'गतिविधियां')
        : '${_selectedActivities.length} ${_webText('activities', 'गतिविधियां')}';

    final budgetLabel = _priceRange >= 10000
        ? _webText('Any budget', 'कोई भी बजट')
        : '₹${_priceRange.toInt()}+';

    final sortLabel = () {
      switch (_selectedFilter) {
        case 'Rating':
          return _webText('Top Rated', 'उच्च रेटिंग');
        case 'PriceLow':
          return _webText('Price: Low-High', 'कीमत: कम-ज़्यादा');
        case 'PriceHigh':
          return _webText('Price: High-Low', 'कीमत: ज्यादा-कम');
        default:
          return _webText('Sort', 'सॉर्ट');
      }
    }();

    final locationLabel = _useNearMe
      ? _webText('${_nearMeRadiusKm.toInt()} km radius', '${_nearMeRadiusKm.toInt()} किमी')
      : (_cityController.text.trim().isNotEmpty
        ? _cityController.text.trim()
        : _webText('Location', 'लोकेशन'));

    return Column(
      children: [
        // Compact Search + Actions Bar
        LayoutBuilder(
          builder: (context, constraints) {
            final isTight = constraints.maxWidth < 520;

            final searchField = TextField(
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
                          _scheduleReloadGyms();
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
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onChanged: (_) => _applyFilters(),
            );

            final filterBar = SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterPill(
                    icon: Icons.my_location,
                    label: locationLabel,
                    isActive: _useNearMe || _cityController.text.trim().isNotEmpty,
                    onTap: _openLocationSheet,
                  ),
                  _buildFilterPill(
                    icon: Icons.fitness_center,
                    label: activitiesLabel,
                    isActive: _selectedActivities.isNotEmpty,
                    onTap: _openActivitiesSheet,
                  ),
                  _buildFilterPill(
                    icon: Icons.currency_rupee,
                    label: budgetLabel,
                    isActive: _priceRange < 10000,
                    onTap: _openPriceSheet,
                  ),
                  PopupMenuButton<String>(
                    onSelected: _sortGyms,
                    itemBuilder: (context) => [
                      PopupMenuItem(value: 'All', child: Text(_webText('All', 'सभी'))),
                      PopupMenuItem(value: 'Rating', child: Text(_webText('Highest Rated', 'उच्च रेटिंग'))),
                      PopupMenuItem(value: 'PriceLow', child: Text(_webText('Price: Low to High', 'कीमत: कम से ज्यादा'))),
                      PopupMenuItem(value: 'PriceHigh', child: Text(_webText('Price: High to Low', 'कीमत: ज्यादा से कम'))),
                    ],
                    child: _buildFilterPill(
                      icon: Icons.sort,
                      label: sortLabel,
                      isActive: _selectedFilter != 'All',
                      onTap: null,
                    ),
                  ),
                ],
              ),
            );

            return Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
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
              child: isTight
                  ? Column(
                      children: [
                        searchField,
                        const SizedBox(height: 10),
                        filterBar,
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              searchField,
                              const SizedBox(height: 10),
                              filterBar,
                            ],
                          ),
                        ),
                      ],
                    ),
            );
          },
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
                            final rating = _gymRatingById[gym.id] ?? gym.rating;
                            final reviewCount = _gymReviewCountById[gym.id] ?? gym.reviewCount;
                            final logoOverride = _gymLogoById[gym.id];
                            final priceSummary = _gymPriceSummaryById[gym.id];
                            final isPriceLoading = _gymPriceLoadInFlight.contains(gym.id);
                            
                            return GymCard(
                              gym: gym,
                              ratingOverride: rating,
                              reviewCountOverride: reviewCount,
                              logoOverride: logoOverride,
                              priceSummary: priceSummary,
                              isPriceLoading: isPriceLoading,
                              onPriceTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => GymDetailScreen(
                                      gymId: gym.id,
                                    ),
                                  ),
                                );
                              },
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

  Widget _buildFilterPill({
    required IconData icon,
    required String label,
    required bool isActive,
    VoidCallback? onTap,
    bool showIndicator = false,
  }) {
    final baseColor = Theme.of(context).textTheme.bodyMedium?.color ?? AppTheme.textSecondary;
    final activeColor = AppTheme.primaryColor;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final background = isDark
        ? const Color(0xFF2A2A2A)
        : AppTheme.backgroundColor;
    final activeBackground = isDark
        ? AppTheme.primaryColor.withOpacity(0.25)
        : AppTheme.primaryColor.withOpacity(0.12);

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isActive ? activeBackground : background,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isActive ? activeColor.withOpacity(0.4) : Colors.transparent,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, size: 16, color: isActive ? activeColor : baseColor),
                  if (showIndicator)
                    Positioned(
                      right: -3,
                      top: -3,
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppTheme.primaryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isActive ? activeColor : baseColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openActivitiesSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final activities = _availableActivities.isNotEmpty
            ? _availableActivities
            : _getDefaultActivities();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _webText('Select Activities', 'गतिविधियां चुनें'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 12),
                Flexible(
                  child: SingleChildScrollView(
                    child: ActivitySelectionGrid(
                      availableActivities: activities,
                      selectedActivities: _selectedActivities,
                      onSelectionChanged: (activities) {
                        setState(() => _selectedActivities = activities);
                        _applyFilters();
                        _scheduleReloadGyms();
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() => _selectedActivities.clear());
                          _applyFilters();
                          _scheduleReloadGyms();
                        },
                        child: Text(_webText('Clear', 'हटाएं')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                        ),
                        child: Text(_webText('Done', 'ठीक है')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openPriceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _webText('Membership Budget', 'मेंबरशिप बजट'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 12),
                PriceRangeSlider(
                  currentPrice: _priceRange,
                  minPrice: 500,
                  maxPrice: 10000,
                  onPriceChanged: (price) {
                    setState(() => _priceRange = price);
                    _applyFilters();
                    _scheduleReloadGyms();
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() => _priceRange = 5000);
                          _applyFilters();
                          _scheduleReloadGyms();
                        },
                        child: Text(_webText('Reset', 'रीसेट')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                        ),
                        child: Text(_webText('Done', 'ठीक है')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openLocationSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _webText('Location Filter', 'लोकेशन फ़िल्टर'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 12),
                SwitchListTile.adaptive(
                  value: _useNearMe,
                  title: Text(_webText('Use current location', 'करेंट लोकेशन इस्तेमाल करें')),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (value) async {
                    if (!value) {
                      setState(() => _useNearMe = false);
                      _scheduleReloadGyms(immediate: true);
                      return;
                    }
                    final hasLocation = await _captureUserLocation();
                    if (!hasLocation) {
                      if (mounted) {
                        setState(() => _useNearMe = false);
                      }
                      return;
                    }
                    if (mounted) {
                      _cityController.clear();
                      setState(() {
                        _useNearMe = true;
                        _cityAvailability = null;
                      });
                      _scheduleReloadGyms(immediate: true);
                    }
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  _webText('City', 'शहर'),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 8),
                RawAutocomplete<String>(
                  textEditingController: _cityController,
                  focusNode: _cityFocusNode,
                  optionsBuilder: (TextEditingValue value) {
                    final query = value.text.trim().toLowerCase();
                    if (query.isEmpty) return _indianCities;
                    return _indianCities.where(
                      (city) => city.toLowerCase().contains(query),
                    );
                  },
                  onSelected: (city) => _applyCitySelection(city),
                  fieldViewBuilder: (context, controller, focusNode, onSubmit) {
                    return TextField(
                      controller: controller,
                      focusNode: focusNode,
                      decoration: InputDecoration(
                        hintText: _webText('Type or select a city', 'शहर टाइप करें या चुनें'),
                        prefixIcon: const Icon(Icons.location_city),
                        suffixIcon: controller.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  controller.clear();
                                  setState(() {
                                    _cityAvailability = null;
                                    _checkingCityAvailability = false;
                                  });
                                  _scheduleReloadGyms(immediate: true);
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
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      textInputAction: TextInputAction.search,
                      onChanged: _handleCityInputChange,
                      onSubmitted: (value) => _applyCitySelection(value),
                    );
                  },
                  optionsViewBuilder: (context, onSelected, options) {
                    return Align(
                      alignment: Alignment.topLeft,
                      child: Material(
                        elevation: 4,
                        borderRadius: BorderRadius.circular(12),
                        child: SizedBox(
                          height: 220,
                          child: ListView.builder(
                            padding: EdgeInsets.zero,
                            itemCount: options.length,
                            itemBuilder: (context, index) {
                              final option = options.elementAt(index);
                              return ListTile(
                                title: Text(option),
                                onTap: () => onSelected(option),
                              );
                            },
                          ),
                        ),
                      ),
                    );
                  },
                ),
                if (_checkingCityAvailability) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: const [
                      SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 8),
                      Text('Checking availability...'),
                    ],
                  ),
                ],
                if (_showCityUnavailableMessage) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.orange.withOpacity(0.3)),
                    ),
                    child: const Text(
                      "We're currently unavailable in your city, but don't worry we'll reach there soon 😊",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  _webText('Radius: ${_nearMeRadiusKm.toInt()} km', 'रेडियस: ${_nearMeRadiusKm.toInt()} किमी'),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Slider(
                  value: _nearMeRadiusKm,
                  min: 2,
                  max: 25,
                  divisions: 23,
                  label: '${_nearMeRadiusKm.toInt()} km',
                  onChanged: _useNearMe
                      ? (value) {
                          setState(() => _nearMeRadiusKm = value);
                        }
                      : null,
                  onChangeEnd: _useNearMe
                      ? (_) {
                          _scheduleReloadGyms(immediate: true);
                        }
                      : null,
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                    ),
                    child: Text(_webText('Done', 'ठीक है')),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}