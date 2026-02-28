import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/geofencing_service.dart';
import '../models/gym.dart';
import '../models/trainer.dart';
import '../models/banner_offer.dart';
import '../models/activity.dart';
import '../config/app_theme.dart';
import '../widgets/gym_card.dart';
import '../widgets/activity_widgets.dart';
import '../widgets/offer_carousel.dart';
import '../widgets/trainer_spotlight.dart';
import '../widgets/background_location_warning_dialog.dart';
import '../l10n/app_localizations.dart';
import 'gym_list_screen.dart';
import 'gym_detail_screen.dart';
import 'subscriptions_screen.dart';
import 'profile_screen.dart';
import 'favorites_screen.dart';
import 'diet_plans_screen.dart';
import 'workout_assistant_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  List<Gym> _popularGyms = [];
  List<Trainer> _topTrainers = [];
  List<BannerOffer> _offers = [];
  List<String> _selectedActivities = [];
  double _priceRange = 3000;
  Position? _currentPosition;
  String? _currentCity;
  String? _currentAddress;
  bool _showCenterFAB = true; // Default to showing FAB
  Set<String> _activeGymIds = {}; // Track gyms user is an active member of

  @override
  void initState() {
    super.initState();
    _loadPreferences();
    _initializeData();
  }

  /// Initialize data in proper sequence
  Future<void> _initializeData() async {
    await _loadActiveMemberships();
    await _loadData();
    await _loadLocation();
    await _loadNotifications();
    await _loadTrainers();
    await _loadOffers();
    
    // Check geofence settings after all data is loaded and user is authenticated
    await _checkGeofenceSettings();
  }

  /// Check if gym uses geofence attendance and warn about background location
  Future<void> _checkGeofenceSettings() async {
    try {
      // Skip geofence checks on web platform
      if (kIsWeb) {
        debugPrint('[HOME] Web platform detected - Skipping geofence checks');
        return;
      }
      
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.user;
      
      if (user == null) {
        debugPrint('[HOME] User not authenticated, skipping geofence check');
        return; // User not logged in
      }

      // Get user's active memberships
      debugPrint('[HOME] Checking geofence settings for active memberships');
      final activeMemberships = await ApiService.getActiveMemberships();
      
      if (activeMemberships.isEmpty) {
        return; // No active memberships
      }

      // Check each active membership for geofencing
      final prefs = await SharedPreferences.getInstance();
      final geofencingService = Provider.of<GeofencingService>(context, listen: false);
      final now = DateTime.now().millisecondsSinceEpoch;
      
      for (final membership in activeMemberships) {
        // Extract gym ID from various possible locations
        String? gymId;
        String? gymName;
        
        if (membership['gymId'] != null) {
          gymId = membership['gymId'].toString();
        } else if (membership['gym']?['_id'] != null) {
          gymId = membership['gym']['_id'].toString();
        } else if (membership['gym']?['id'] != null) {
          gymId = membership['gym']['id'].toString();
        }
        
        gymName = membership['gymName']?.toString() ?? 
                  membership['gym']?['gymName']?.toString() ?? 
                  membership['gym']?['name']?.toString() ?? 
                  'Your gym';
        
        if (gymId == null) continue;
        
        // Check if we've already shown this warning for this gym today
        final lastWarningShown = prefs.getInt('geofence_warning_shown_$gymId');
        
        // Show warning once per day per gym
        if (lastWarningShown != null && (now - lastWarningShown) < 24 * 60 * 60 * 1000) {
          continue; // Already shown today for this gym
        }

        // Fetch gym's attendance settings
        debugPrint('[HOME] Fetching attendance settings for gym: $gymId ($gymName)');
        final response = await ApiService.getGymAttendanceSettings(gymId);
        
        if (response['success'] == true) {
          final settings = response['settings'];
          final geofenceEnabled = settings['geofenceEnabled'] == true ||
                                  settings['mode'] == 'geofence' ||
                                  settings['mode'] == 'hybrid';
          
          debugPrint('[HOME] Gym $gymId geofence enabled: $geofenceEnabled');
          
          if (!geofenceEnabled) {
            continue; // Geofence not enabled for this gym
          }

          // Check if we need to show warning
          debugPrint('[HOME] Checking if should show location warning for gym: $gymName');
          
          try {
            final shouldShow = await BackgroundLocationWarningDialog.shouldShow(
              geofencingService: geofencingService,
              geofenceEnabled: geofenceEnabled,
            );

            debugPrint('[HOME] Should show warning: $shouldShow');

            if (shouldShow && mounted) {
              // Wait a bit for the screen to fully load
              await Future.delayed(const Duration(milliseconds: 800));
              
              if (mounted) {
                debugPrint('[HOME] Showing location warning dialog for gym: $gymName');
                await BackgroundLocationWarningDialog.show(
                  context: context,
                  gymName: gymName,
                  geofencingService: geofencingService,
                );
                
                // Mark as shown for this gym
                await prefs.setInt('geofence_warning_shown_$gymId', now);
                debugPrint('[HOME] Location warning shown and marked in preferences');
              }
              
              // Only show warning for one gym at a time
              break;
            }
          } catch (warningError) {
            debugPrint('[HOME] Error showing location warning: $warningError');
            // Continue to next membership if this one fails
            continue;
          }
        }
      }
    } catch (e) {
      debugPrint('[HOME] Error checking geofence settings: $e');
      // Silently fail - don't disrupt user experience
    }
  }

  /// Load user's active memberships to filter gyms
  Future<void> _loadActiveMemberships() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      if (!authProvider.isAuthenticated) {
        return;
      }

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
      
      print('[HOME] Loaded ${_activeGymIds.length} active gym memberships');
      if (_activeGymIds.isNotEmpty) {
        print('[HOME] Active gym IDs: $_activeGymIds');
      }
    } catch (e) {
      print('[HOME] Error loading active memberships: $e');
    }
  }

  /// Load user preferences
  Future<void> _loadPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        _showCenterFAB = prefs.getBool('show_center_fab') ?? true;
      });
    } catch (e) {
      print('Error loading preferences: $e');
    }
  }

  /// Toggle FAB visibility
  Future<void> _toggleFABVisibility(bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('show_center_fab', value);
      setState(() {
        _showCenterFAB = value;
      });
    } catch (e) {
      print('Error saving FAB preference: $e');
    }
  }

  /// Show FAB toggle dialog
  void _showFABToggleDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Quick Action Button'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Show floating quick action button on home screen?'),
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(child: Text('Show FAB')),
                Switch(
                  value: _showCenterFAB,
                  onChanged: (value) {
                    _toggleFABVisibility(value);
                    Navigator.pop(context);
                  },
                  activeThumbColor: AppTheme.primaryColor,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _showCenterFAB 
                ? 'Quick actions grid is hidden, FAB is shown'
                : 'Quick actions grid is shown, FAB is hidden',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
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

  /// Load user notifications
  Future<void> _loadNotifications() async {
    try {
      final notificationProvider = Provider.of<NotificationProvider>(context, listen: false);
      await notificationProvider.loadNotifications();
    } catch (e) {
      print('Error loading notifications: $e');
    }
  }

  /// Load gyms data from backend
  Future<void> _loadData() async {
    try {
      // Get gyms from actual backend
      final gyms = await ApiService.getGyms();
      
      if (mounted) {
        print('[HOME] Total gyms loaded: ${gyms.length}');
        print('[HOME] Active gym IDs to filter: $_activeGymIds');
        
        // Filter out gyms where user is an active member
        final filteredGyms = gyms.where((gym) {
          final isActiveMember = _activeGymIds.contains(gym.id);
          if (isActiveMember) {
            print('[HOME] Filtering out gym: ${gym.name} (${gym.id})');
          }
          return !isActiveMember;
        }).toList();
        
        print('[HOME] Gyms after filtering: ${filteredGyms.length}');
        
        setState(() {
          _popularGyms = filteredGyms.take(5).toList();
        });
      }
    } catch (e) {
      print('Error loading gyms: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load gyms: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  /// Load user's current location
  Future<void> _loadLocation() async {
    try {
      print('Starting location fetch...');
      final position = await LocationService.getCurrentPosition();
      print('Position received: $position');
      
      if (position != null && mounted) {
        // Get city name and address from coordinates
        final city = await LocationService.getCityFromCoordinates(
          position.latitude,
          position.longitude,
        );
        final address = await LocationService.getAddressFromCoordinates(
          position.latitude,
          position.longitude,
        );
        
        print('City: $city, Address: $address');
        
        setState(() {
          _currentPosition = position;
          _currentCity = city ?? 'Location found';
          _currentAddress = address;
        });
        
        // Load nearby gyms if location available
        _loadNearbyGyms();
        // Reload offers for this city
        _loadOffers();
      } else {
        print('Position is null or widget not mounted');
        // Set a fallback message
        if (mounted) {
          setState(() {
            _currentCity = 'Enable location';
          });
        }
      }
    } catch (e) {
      print('Error getting location: $e');
      if (mounted) {
        setState(() {
          _currentCity = 'Location unavailable';
        });
      }
    }
  }
  
  /// Load top trainers
  Future<void> _loadTrainers() async {
    try {
      final trainersData = await ApiService.getTopTrainers(limit: 5);
      if (mounted) {
        setState(() {
          _topTrainers = trainersData
              .map((data) => Trainer.fromJson(data))
              .toList();
        });
      }
    } catch (e) {
      print('Error loading trainers: $e');
    }
  }
  
  /// Load offers/banners (combine backend offers with static feature/tip banners)
  Future<void> _loadOffers() async {
    try {
      // Load backend offers – only show super-admin / platform-level offers
      // (gymId == null means it was created by the platform, not a gym admin).
      final offersData = await ApiService.getOffers(city: _currentCity);
      final backendOffers = offersData
          .map((data) => BannerOffer.fromJson(data))
          .where((offer) => offer.isValid && offer.gymId == null)
          .toList();
      
      // Create static app feature and tip banners
      final staticBanners = [
        BannerOffer.gymExploration(),
        BannerOffer.dietPlans(),
        BannerOffer.trainerSearch(),
        BannerOffer.bookingTip(),
        BannerOffer.favoriteTip(),
        BannerOffer.locationTip(),
      ];
      
      if (mounted) {
        setState(() {
          // Interleave backend offers with static banners for better variety
          _offers = _interleaveOffers(backendOffers, staticBanners);
        });
      }
    } catch (e) {
      print('Error loading offers: $e');
      // Still show static banners even if backend fails
      if (mounted) {
        setState(() {
          _offers = [
            BannerOffer.gymExploration(),
            BannerOffer.dietPlans(),
            BannerOffer.trainerSearch(),
            BannerOffer.bookingTip(),
            BannerOffer.favoriteTip(),
            BannerOffer.locationTip(),
          ];
        });
      }
    }
  }
  
  /// Interleave backend offers with static banners
  List<BannerOffer> _interleaveOffers(
    List<BannerOffer> backend,
    List<BannerOffer> static,
  ) {
    final result = <BannerOffer>[];
    int backendIndex = 0;
    int staticIndex = 0;
    
    // Alternate between backend and static (backend, static, static, backend, static, static...)
    while (backendIndex < backend.length || staticIndex < static.length) {
      // Add one backend offer
      if (backendIndex < backend.length) {
        result.add(backend[backendIndex++]);
      }
      
      // Add two static banners
      if (staticIndex < static.length) {
        result.add(static[staticIndex++]);
      }
      if (staticIndex < static.length) {
        result.add(static[staticIndex++]);
      }
    }
    
    return result;
  }
  
  /// Handle offer/banner tap with navigation
  void _handleOfferTap(BannerOffer offer) {
    switch (offer.type) {
      case 'feature':
        // Handle feature banner navigation
        if (offer.route == '/gyms') {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const GymListScreen()),
          );
        } else if (offer.route == '/diet') {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const DietPlansScreen()),
          );
        } else if (offer.route == '/trainers') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Trainer search coming soon!'),
              backgroundColor: AppTheme.primaryColor,
            ),
          );
        }
        break;
        
      case 'tip':
        // Handle tip banner actions
        if (offer.id == 'tip_location') {
          _getUserLocation();
        } else if (offer.id == 'tip_favorites') {
          setState(() => _selectedIndex = 3);
        } else if (offer.id == 'tip_booking') {
          setState(() => _selectedIndex = 2);
        }
        break;
        
      case 'gym':
      case 'admin':
      case 'diet':
        // Handle backend offer navigation
        if (offer.gymId != null) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => GymDetailScreen(gymId: offer.gymId!),
            ),
          );
        }
        break;
        
      default:
        // Generic handling
        if (offer.gymId != null) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => GymDetailScreen(gymId: offer.gymId!),
            ),
          );
        }
    }
  }

  /// Load nearby gyms based on current location
  Future<void> _loadNearbyGyms() async {
    if (_currentPosition == null) return;
    
    try {
      final gyms = await ApiService.getNearbyGyms(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        radius: 10.0, // 10 km radius
      );
      
      if (mounted) {
        print('[HOME] Nearby gyms loaded: ${gyms.length}');
        print('[HOME] Active gym IDs to filter: $_activeGymIds');
        
        setState(() {
          // Filter out gyms where user is an active member
          final filteredGyms = gyms.where((gym) {
            final isActiveMember = _activeGymIds.contains(gym.id);
            if (isActiveMember) {
              print('[HOME] Filtering out nearby gym: ${gym.name} (${gym.id})');
            }
            return !isActiveMember;
          }).toList();
          
          print('[HOME] Nearby gyms after filtering: ${filteredGyms.length}');
          _popularGyms = filteredGyms.take(5).toList();
        });
      }
    } catch (e) {
      print('Error loading nearby gyms: $e');
    }
  }

  /// Get user location and show nearby gyms
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

      // Update current position
      setState(() {
        _currentPosition = position;
      });
      
      // Load nearby gyms
      await _loadNearbyGyms();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Location set! Showing nearby gyms'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
      
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error getting location: $e')),
        );
      }
    }
  }

  Widget _buildHomeTab() {
    final authProvider = Provider.of<AuthProvider>(context);
    
    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Header with Gradient
            Container(
              decoration: const BoxDecoration(
                gradient: AppTheme.heroGradient,
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Logo and Welcome
                      Row(
                        children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.asset(
                                'assets/images/logo.png',
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return const Icon(
                                    Icons.fitness_center,
                                    color: AppTheme.primaryColor,
                                    size: 30,
                                  );
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Gym-wale',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                                Text(
                                  'Hello, ${authProvider.user?.name ?? "User"}!',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Notification Bell Icon with Badge
                          Consumer<NotificationProvider>(
                            builder: (context, notificationProvider, child) {
                              final unreadCount = notificationProvider.unreadCount;
                              return GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const NotificationsScreen(),
                                    ),
                                  );
                                },
                                child: Container(
                                  margin: const EdgeInsets.only(right: 12),
                                  child: Stack(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(
                                          Icons.notifications_outlined,
                                          color: Colors.white,
                                          size: 24,
                                        ),
                                      ),
                                      if (unreadCount > 0)
                                        Positioned(
                                          right: 0,
                                          top: 0,
                                          child: Container(
                                            padding: const EdgeInsets.all(4),
                                            decoration: const BoxDecoration(
                                              color: Colors.red,
                                              shape: BoxShape.circle,
                                            ),
                                            constraints: const BoxConstraints(
                                              minWidth: 18,
                                              minHeight: 18,
                                            ),
                                            child: Text(
                                              unreadCount > 99 ? '99+' : '$unreadCount',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const ProfileScreen()),
                              );
                            },
                            child: CircleAvatar(
                              radius: 20,
                              backgroundColor: Theme.of(context).colorScheme.surface,
                              backgroundImage: authProvider.user?.profileImage != null && authProvider.user!.profileImage!.isNotEmpty
                                  ? CachedNetworkImageProvider(authProvider.user!.profileImage!)
                                  : null,
                              onBackgroundImageError: authProvider.user?.profileImage != null && authProvider.user!.profileImage!.isNotEmpty 
                                  ? (exception, stackTrace) {
                                      print('❌ Error loading profile image: ${authProvider.user!.profileImage} - $exception');
                                    }
                                  : null,
                              child: authProvider.user?.profileImage == null || authProvider.user!.profileImage!.isEmpty
                                  ? const Icon(
                                      Icons.person_outline,
                                      color: AppTheme.primaryColor,
                                      size: 24,
                                    )
                                  : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Location Display
                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            color: Colors.white.withOpacity(0.9),
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _currentCity ?? 'Getting location...',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (_currentAddress != null)
                                  Text(
                                    _currentAddress!,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.8),
                                      fontSize: 12,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            // Content Section
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  // Offers Carousel - Always show if available
                  OfferCarousel(
                    offers: _offers,
                    onOfferTap: (offer) {
                      _handleOfferTap(offer);
                    },
                  ),
                  if (_offers.isNotEmpty) const SizedBox(height: 32),
                  
                  // Quick Actions Grid - Only show if FAB is hidden
                  if (!_showCenterFAB) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.dashboard_outlined,
                              size: 24,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              AppLocalizations.of(context)!.quickActions,
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).textTheme.titleLarge?.color,
                              ),
                            ),
                          ],
                        ),
                        // Settings icon to toggle FAB
                        IconButton(
                          icon: const Icon(Icons.settings, size: 20),
                          onPressed: () {
                            _showFABToggleDialog();
                          },
                          tooltip: 'Toggle Quick Action Menu',
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (!_showCenterFAB)
                    GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 3,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.0,
                    children: [
                      _buildQuickActionCard(
                        title: 'Find Gyms',
                        icon: Icons.fitness_center_outlined,
                        onTap: () {
                          setState(() => _selectedIndex = 1);
                        },
                      ),
                      _buildQuickActionCard(
                        title: 'Find Trainers',
                        icon: Icons.person_search_outlined,
                        onTap: () {
                          // Navigate to trainer exploration screen
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Trainer exploration coming soon!'),
                            ),
                          );
                        },
                      ),
                      _buildQuickActionCard(
                        title: 'Diet Plans',
                        icon: Icons.restaurant_menu_outlined,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const DietPlansScreen()),
                          );
                        },
                      ),
                      _buildQuickActionCard(
                        title: 'Workout Plans',
                        icon: Icons.fitness_center_outlined,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const WorkoutAssistantScreen()),
                          );
                        },
                      ),
                      _buildQuickActionCard(
                        title: 'Bookings',
                        icon: Icons.event_available_outlined,
                        onTap: () {
                          setState(() => _selectedIndex = 2);
                        },
                      ),
                      _buildQuickActionCard(
                        title: 'Favorites',
                        icon: Icons.favorite_outline,
                        onTap: () {
                          setState(() => _selectedIndex = 3);
                        },
                      ),
                      _buildQuickActionCard(
                        title: 'Profile',
                        icon: Icons.person_outline,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const ProfileScreen()),
                          );
                        },
                      ),
                    ],
                  ),
                  
                  if (!_showCenterFAB) const SizedBox(height: 32),
                  
                  // Search Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.location_on,
                              color: AppTheme.primaryColor,
                              size: 28,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                AppLocalizations.of(context)!.findYourPerfectGym,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).textTheme.titleLarge?.color,
                                ),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: _getUserLocation,
                              icon: const Icon(Icons.my_location, size: 18),
                              label: Text(AppLocalizations.of(context)!.nearMe),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 10,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        
                        // Price Range Slider
                        PriceRangeSlider(
                          currentPrice: _priceRange,
                          minPrice: 500,
                          maxPrice: 10000,
                          onPriceChanged: (price) {
                            setState(() => _priceRange = price);
                          },
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Activities Selection
                        ActivitySelectionGrid(
                          availableActivities: _getDefaultActivities(),
                          selectedActivities: _selectedActivities,
                          onSelectionChanged: (activities) {
                            setState(() => _selectedActivities = activities);
                          },
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Search Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => GymListScreen(
                                    showSearch: true,
                                    initialActivities: _selectedActivities,
                                    maxPrice: _priceRange,
                                  ),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.search, size: 24),
                                SizedBox(width: 12),
                                Text(
                                  'Search Gyms',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Popular Gyms
                  if (_popularGyms.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.trending_up_outlined,
                              size: 24,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  AppLocalizations.of(context)!.popularGyms,
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).textTheme.titleLarge?.color,
                                  ),
                                ),
                                Text(
                                  AppLocalizations.of(context)!.topRatedGyms,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context).textTheme.bodySmall?.color,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            setState(() => _selectedIndex = 1);
                          },
                          child: Text(AppLocalizations.of(context)!.seeAll),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _popularGyms.length > 3 ? 3 : _popularGyms.length,
                      itemBuilder: (context, index) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: GymCard(
                            gym: _popularGyms[index],
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => GymDetailScreen(
                                    gymId: _popularGyms[index].id,
                                  ),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ],
                  
                  const SizedBox(height: 32),
                  
                  // Trainer Spotlight
                  if (_topTrainers.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.stars_outlined,
                              size: 24,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Top Trainers',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).textTheme.titleLarge?.color,
                                  ),
                                ),
                                Text(
                                  'Certified professionals near you',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Theme.of(context).textTheme.bodySmall?.color,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Full trainer list coming soon!'),
                              ),
                            );
                          },
                          child: const Text('See All'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TrainerSpotlight(
                      trainers: _topTrainers,
                      onTrainerTap: (trainer) {
                        // Handle trainer tap - navigate to trainer detail screen
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('View ${trainer.fullName} profile'),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 32),
                  ],
                  
                  // Features Section
                  Row(
                    children: [
                      Icon(
                        Icons.star_outline,
                        size: 24,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Why Choose Gym-wale?',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).textTheme.titleLarge?.color,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Column(
                    children: [
                      _buildFeatureBenefit(
                        icon: Icons.fitness_center_outlined,
                        title: 'State-of-the-art Equipment',
                        description: 'Access to modern gym equipment and facilities',
                      ),
                      const SizedBox(height: 16),
                      _buildFeatureBenefit(
                        icon: Icons.person_outline,
                        title: 'Expert Personal Training',
                        description: 'Certified trainers to guide your fitness journey',
                      ),
                      const SizedBox(height: 16),
                      _buildFeatureBenefit(
                        icon: Icons.card_membership_outlined,
                        title: 'Flexible Membership Plans',
                        description: 'Monthly, quarterly, and yearly plans available',
                      ),
                      const SizedBox(height: 16),
                      _buildFeatureBenefit(
                        icon: Icons.restaurant_menu_outlined,
                        title: 'Personalized Diet Plans',
                        description: 'Nutrition plans tailored to your fitness goals',
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppTheme.borderColor,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: AppTheme.primaryColor,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureBenefit({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: AppTheme.primaryColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleLarge?.color,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).textTheme.bodyMedium?.color,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showQuickActionMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.85,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                AppLocalizations.of(context)!.quickActions,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 3,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.0,
                    children: [
                _buildQuickMenuItem(
                  icon: Icons.search,
                  label: 'Search Gyms',
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _selectedIndex = 1);
                  },
                ),
                _buildQuickMenuItem(
                  icon: Icons.fitness_center,
                  label: 'Book Trial',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const GymListScreen(showSearch: true),
                      ),
                    );
                  },
                ),
                _buildQuickMenuItem(
                  icon: Icons.person_search,
                  label: 'Find Trainer',
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Trainer search coming soon!'),
                      ),
                    );
                  },
                ),
                _buildQuickMenuItem(
                  icon: Icons.restaurant_menu,
                  label: 'Diet Plans',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DietPlansScreen()),
                    );
                  },
                ),
                _buildQuickMenuItem(
                  icon: Icons.favorite,
                  label: 'Favorites',
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _selectedIndex = 3);
                  },
                ),
                _buildQuickMenuItem(
                  icon: Icons.person,
                  label: 'Profile',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    );
                  },
                ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickMenuItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 32,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> _screens = [
      _buildHomeTab(),
      const GymListScreen(),
      const SubscriptionsScreen(),
      const FavoritesScreen(),
    ];

    return Scaffold(
      body: _screens[_selectedIndex],
      floatingActionButton: _selectedIndex == 0 && _showCenterFAB
          ? FloatingActionButton.extended(
              onPressed: () {
                // Show quick action menu
                _showQuickActionMenu(context);
              },
              icon: const Icon(Icons.add),
              label: const Text('Quick Action'),
              backgroundColor: AppTheme.primaryColor,
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) => setState(() => _selectedIndex = index),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppTheme.primaryColor,
          unselectedItemColor: AppTheme.textLight,
          selectedFontSize: 12,
          unselectedFontSize: 12,
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.home_outlined),
              activeIcon: const Icon(Icons.home),
              label: AppLocalizations.of(context)!.home,
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.search_outlined),
              activeIcon: const Icon(Icons.search),
              label: AppLocalizations.of(context)!.explore,
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.card_membership_outlined),
              activeIcon: const Icon(Icons.card_membership),
              label: 'Subscriptions',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.favorite_outline),
              activeIcon: const Icon(Icons.favorite),
              label: AppLocalizations.of(context)!.favorites,
            ),
          ],
        ),
      ),
    );
  }
}
