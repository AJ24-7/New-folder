import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/share_service.dart';
import '../models/gym.dart';
import '../models/membership.dart';
import '../models/membership_plan.dart';
import '../models/review.dart';
import '../models/activity.dart';
import '../models/user_membership.dart';
import '../config/app_theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/review_dialog.dart';
import '../widgets/floating_chat_button.dart';
import '../widgets/photo_gallery_widget.dart';
import '../widgets/equipment_gallery_widget.dart';
import '../widgets/activity_widgets.dart';
import 'booking_screen.dart';
import 'login_screen.dart';

class GymDetailScreen extends StatefulWidget {
  final String gymId;

  const GymDetailScreen({Key? key, required this.gymId}) : super(key: key);

  @override
  State<GymDetailScreen> createState() => _GymDetailScreenState();
}

class _GymDetailScreenState extends State<GymDetailScreen> {
  Gym? _gym;
  MembershipPlan? _membershipPlan;
  List<Review> _reviews = [];
  List<GymPhoto> _photos = [];
  List<GymEquipment> _equipment = [];
  List<Activity> _activities = [];
  bool _isLoading = true;
  bool _isFavorite = false;
  int _selectedTab = 0;
  UserMembership? _userMembership;
  bool _hasActiveMembership = false;
  late PageController _imagePageController;
  int _currentImageIndex = 0;

  @override
  void initState() {
    super.initState();
    _imagePageController = PageController();
    _loadGymDetails();
    _checkUserMembership();
    _startAutoScroll();
  }

  @override
  void dispose() {
    _imagePageController.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    Future.delayed(const Duration(seconds: 3), () {
      if (!mounted || _gym == null || _gym!.images.length <= 1) return;
      
      _currentImageIndex = (_currentImageIndex + 1) % _gym!.images.length;
      if (_imagePageController.hasClients) {
        _imagePageController.animateToPage(
          _currentImageIndex,
          duration: const Duration(milliseconds: 800),
          curve: Curves.easeInOut,
        );
      }
      _startAutoScroll();
    });
  }

  Future<void> _loadGymDetails() async {
    setState(() => _isLoading = true);

    try {
      // Get raw gym data to access gymPhotos and equipment
      final gymDataRaw = await ApiService.getGymDetailsRaw(widget.gymId);
      final membershipPlan = await ApiService.getGymMembershipPlan(widget.gymId);
      final reviews = await ApiService.getGymReviews(widget.gymId);
      
      // Check favorite status
      final isFav = await ApiService.checkFavorite(widget.gymId);

      if (gymDataRaw != null) {
        // Convert to Gym object
        final gym = Gym.fromJson(gymDataRaw);
        
        // Parse photos from raw data
        List<GymPhoto> photos = [];
        if (gymDataRaw['gymPhotos'] != null && gymDataRaw['gymPhotos'] is List) {
          try {
            photos = (gymDataRaw['gymPhotos'] as List)
                .map((p) => GymPhoto.fromJson(p as Map<String, dynamic>))
                .toList();
          } catch (e) {
            print('Error parsing gym photos: $e');
          }
        }
        
        // Parse equipment from raw data
        List<GymEquipment> equipment = [];
        if (gymDataRaw['equipment'] != null && gymDataRaw['equipment'] is List) {
          try {
            equipment = (gymDataRaw['equipment'] as List)
                .map((e) => GymEquipment.fromJson(e as Map<String, dynamic>))
                .toList();
          } catch (e) {
            print('Error parsing equipment: $e');
          }
        }
        
        // Parse activities from raw data
        List<Activity> activities = [];
        print('DEBUG: Checking activities in gymDataRaw');
        print('DEBUG: activities field exists: ${gymDataRaw['activities'] != null}');
        print('DEBUG: activities is List: ${gymDataRaw['activities'] is List}');
        print('DEBUG: activities data: ${gymDataRaw['activities']}');
        
        if (gymDataRaw['activities'] != null && gymDataRaw['activities'] is List) {
          try {
            activities = (gymDataRaw['activities'] as List)
                .map((a) => Activity.fromJson(a as Map<String, dynamic>))
                .toList();
            print('DEBUG: Parsed ${activities.length} activities');
          } catch (e) {
            print('Error parsing activities: $e');
          }
        }

        setState(() {
          _gym = gym;
          _membershipPlan = membershipPlan;
          _reviews = reviews;
          _photos = photos;
          _equipment = equipment;
          _activities = activities;
          _isFavorite = isFav;
          _isLoading = false;
        });
        
        print('DEBUG: Final activities count in state: ${_activities.length}');
        print('DEBUG: Membership plan loaded: ${membershipPlan != null}');
        print('DEBUG: Membership plan options: ${membershipPlan?.monthlyOptions.length ?? 0}');
      }
    } catch (e) {
      print('Error loading gym details: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _checkUserMembership() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (!authProvider.isAuthenticated) {
      setState(() {
        _hasActiveMembership = false;
        _userMembership = null;
      });
      return;
    }

    try {
      final result = await ApiService.checkUserMembership(widget.gymId);
      if (result['success'] == true && result['hasActiveMembership'] == true) {
        setState(() {
          _hasActiveMembership = true;
          _userMembership = result['membership'] as UserMembership?;
        });
        print('User has active membership: ${_userMembership?.membershipId}');
      } else {
        setState(() {
          _hasActiveMembership = false;
          _userMembership = null;
        });
      }
    } catch (e) {
      print('Error checking membership: $e');
      setState(() {
        _hasActiveMembership = false;
        _userMembership = null;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    if (_gym == null) return;

    final success = _isFavorite
        ? await ApiService.removeFavorite(_gym!.id)
        : await ApiService.addFavorite(_gym!.id);

    if (success) {
      setState(() => _isFavorite = !_isFavorite);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _isFavorite ? 'Added to favorites' : 'Removed from favorites',
          ),
        ),
      );
    }
  }

  Future<void> _openMap() async {
    if (_gym == null) return;
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${_gym!.latitude},${_gym!.longitude}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_gym == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Gym not found')),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              // Enhanced App Bar with Image and Gradient
              SliverAppBar(
                expandedHeight: 350,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Auto-scrolling PageView for images
                      _gym!.images.isNotEmpty
                          ? PageView.builder(
                              controller: _imagePageController,
                              itemCount: _gym!.images.length,
                              onPageChanged: (index) {
                                setState(() => _currentImageIndex = index);
                              },
                              itemBuilder: (context, index) {
                                return CachedNetworkImage(
                                  imageUrl: _gym!.images[index],
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => Container(
                                    color: AppTheme.backgroundColor,
                                  ),
                                  errorWidget: (context, url, error) => Container(
                                    color: AppTheme.backgroundColor,
                                    child: const Icon(Icons.fitness_center, size: 64),
                                  ),
                                );
                              },
                            )
                          : Container(
                              color: AppTheme.backgroundColor,
                              child: const Icon(Icons.fitness_center, size: 64),
                            ),
                      // Page indicators
                      if (_gym!.images.length > 1)
                        Positioned(
                          bottom: 60,
                          left: 0,
                          right: 0,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              _gym!.images.length,
                              (index) => Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                width: _currentImageIndex == index ? 24 : 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(4),
                                  color: _currentImageIndex == index
                                      ? Colors.white
                                      : Colors.white.withOpacity(0.5),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                actions: [
                  IconButton(
                    icon: Icon(
                      _isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: _isFavorite ? AppTheme.accentColor : Colors.white,
                    ),
                    onPressed: _toggleFavorite,
                  ),
                  IconButton(
                    icon: const Icon(Icons.share, color: Colors.white),
                    onPressed: _shareGym,
                  ),
                ],
              ),

              // Content
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Enhanced Gym Info Card
                    Container(
                      margin: const EdgeInsets.all(16),
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
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                // Gym Logo
                                if (_gym!.logoUrl != null && _gym!.logoUrl!.isNotEmpty)
                                  Container(
                                    width: 50,
                                    height: 50,
                                    margin: const EdgeInsets.only(right: 12),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppTheme.primaryColor, width: 2),
                                      color: Colors.white,
                                    ),
                                    child: ClipOval(
                                      child: CachedNetworkImage(
                                        imageUrl: _gym!.logoUrl!,
                                        fit: BoxFit.cover,
                                        errorWidget: (context, url, error) => const Icon(
                                          Icons.fitness_center,
                                          color: AppTheme.primaryColor,
                                          size: 24,
                                        ),
                                      ),
                                    ),
                                  ),
                                Expanded(
                                  child: Text(
                                    _gym!.name,
                                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context).textTheme.titleLarge?.color,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppTheme.warningColor.withOpacity(0.3),
                                    AppTheme.secondaryColor.withOpacity(0.2),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.star, size: 20, color: AppTheme.warningColor),
                                  const SizedBox(width: 6),
                                  Text(
                                    _gym!.rating.toStringAsFixed(1),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  Text(
                                    ' (${_gym!.reviewCount} reviews)',
                                    style: TextStyle(
                                      color: Theme.of(context).textTheme.bodyMedium?.color,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                            
                            // Address with enhanced styling
                            _buildInfoRow(
                              icon: Icons.location_on,
                              title: _gym!.address,
                              actionLabel: 'View Map',
                              onAction: _openMap,
                            ),
                            
                            // Timings
                            if (_gym!.openingTime != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: _buildInfoRow(
                                  icon: Icons.access_time,
                                  title: '${_gym!.openingTime} - ${_gym!.closingTime}',
                                  actionLabel: null,
                                  onAction: null,
                                ),
                              ),
                            
                            // Active Membership Badge (if user is a member)
                            if (_hasActiveMembership && _userMembership != null) ...[
                              const SizedBox(height: 20),
                              _buildActiveMembershipBadge(),
                              const SizedBox(height: 12),
                              // Member Problem Report Button
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: _showProblemReportDialog,
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    backgroundColor: Colors.orange.shade600,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  icon: const Icon(Icons.report_problem, size: 24),
                                  label: const Text(
                                    'Report a Problem',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ] else ...[
                              // Book Trial Button (only for non-members)
                              const SizedBox(height: 20),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: _showTrialBookingDialog,
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    backgroundColor: AppTheme.accentColor,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  icon: const Icon(Icons.play_circle_outline, size: 24),
                                  label: const Text(
                                    'Book Free Trial Session',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Enhanced Tabs with animations - Mobile optimized
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.backgroundColor,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Row(
                          children: [
                            _buildTab('About', Icons.info_outline, 0),
                            _buildTab('Photos', Icons.photo_library_outlined, 1),
                            _buildTab('Equipment', Icons.fitness_center, 2),
                            _buildTab('Plans', Icons.card_membership, 3),
                            _buildTab('Reviews', Icons.rate_review_outlined, 4),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Tab Content
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: _buildTabContent(),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          // Floating Chat Button
          FloatingChatButton(gym: _gym!),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppTheme.primaryColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (actionLabel != null && onAction != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                actionLabel,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTab(String title, IconData icon, int index) {
    final isSelected = _selectedTab == index;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        child: InkWell(
          onTap: () => setState(() => _selectedTab = index),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? LinearGradient(
                      colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                    )
                  : null,
              color: isSelected ? null : Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: AppTheme.primaryColor.withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: isSelected ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color,
                ),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    switch (_selectedTab) {
      case 0:
        return _buildAboutTab();
      case 1:
        return _buildPhotosTab();
      case 2:
        return _buildEquipmentTab();
      case 3:
        return _buildMembershipsTab();
      case 4:
        return _buildReviewsTab();
      default:
        return const SizedBox();
    }
  }

  Widget _buildAboutTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'About',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Text(
          _gym!.description,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        
        // Activities section
        if (_activities.isNotEmpty) ...[
          const SizedBox(height: 24),
          Row(
            children: [
              Icon(
                Icons.fitness_center,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'Activities & Classes',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Tap any activity to learn more',
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).textTheme.bodySmall?.color,
            ),
          ),
          const SizedBox(height: 16),
          ActivityGrid(activities: _activities),
        ],
        
        if (_gym!.amenities.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text(
            'Amenities',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _gym!.amenities.map((amenity) {
              return Chip(
                label: Text(amenity),
                backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildMembershipsTab() {
    // If user has active membership, show status instead of plans
    if (_hasActiveMembership && _userMembership != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primaryColor.withOpacity(0.1), AppTheme.accentColor.withOpacity(0.1)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3), width: 2),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.check_circle, size: 80, color: Colors.green),
                    const SizedBox(height: 16),
                    const Text(
                      'You\'re Already an Active Member!',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    _buildMembershipInfoRow('Membership ID', _userMembership!.membershipId),
                    const Divider(height: 24),
                    _buildMembershipInfoRow('Plan', '${_userMembership!.planSelected} - ${_userMembership!.monthlyPlan}'),
                    const Divider(height: 24),
                    _buildMembershipInfoRow('Valid Until', _userMembership!.formattedValidUntil),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.info_outline, color: Colors.blue, size: 20),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'To upgrade or renew your membership, please contact the gym directly.',
                              style: TextStyle(fontSize: 13, color: Colors.black87),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }
    
    if (_membershipPlan == null || !_membershipPlan!.hasOptions) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.card_membership, size: 64, color: Colors.grey),
              SizedBox(height: 16),
              Text(
                'No memberships available',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: _buildMembershipPlanCard(_membershipPlan!),
    );
  }

  Widget _buildMembershipPlanCard(MembershipPlan plan) {
    // Determine card color based on plan name
    Color planColor = AppTheme.primaryColor;
    IconData planIcon = Icons.fitness_center;
    
    if (plan.name.toLowerCase().contains('basic')) {
      planColor = const Color(0xFF38b000);
      planIcon = Icons.eco;
    } else if (plan.name.toLowerCase().contains('standard')) {
      planColor = const Color(0xFF3a86ff);
      planIcon = Icons.star;
    } else if (plan.name.toLowerCase().contains('premium')) {
      planColor = const Color(0xFF8338ec);
      planIcon = Icons.diamond;
    }

    return _MembershipPlanCardWidget(
      membershipPlan: plan,
      gym: _gym!,
      planColor: planColor,
      planIcon: planIcon,
    );
  }

  Future<void> _showTrialBookingDialog() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    if (!authProvider.isAuthenticated) {
      final shouldLogin = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Login Required'),
          content: const Text('You need to be logged in to book a trial session.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Login'),
            ),
          ],
        ),
      );
      
      if (shouldLogin == true && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
      return;
    }

    // Check if user can book trial at this specific gym
    final eligibility = await ApiService.canBookTrialAtGym(widget.gymId);
    
    if (eligibility == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to check trial eligibility. Please try again.'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }
    
    if (eligibility['canBook'] == false) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(
                eligibility['reason'] == 'membership_exists'
                    ? Icons.card_membership
                    : Icons.block,
                color: AppTheme.errorColor,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  eligibility['reason'] == 'membership_exists'
                      ? 'Already a Member'
                      : 'Trial Limit Reached',
                ),
              ),
            ],
          ),
          content: Text(eligibility['message'] ?? 'Cannot book trial at this gym.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }

    final remaining = eligibility['remaining'] ?? 0;

    // Show booking dialog
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => _TrialBookingDialog(
        gymId: widget.gymId,
        gymName: _gym?.name ?? '',
        remainingTrials: remaining,
      ),
    );

    if (result == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Trial session booked successfully!'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }

  Future<void> _showReviewDialog() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    if (!authProvider.isAuthenticated) {
      final shouldLogin = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Login Required'),
          content: const Text('You need to be logged in to write a review.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Login'),
            ),
          ],
        ),
      );
      
      if (shouldLogin == true && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
      return;
    }

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => ReviewDialog(
        gymId: widget.gymId,
        gymName: _gym?.name ?? '',
      ),
    );

    if (result == true) {
      // Reload reviews
      _loadGymDetails();
    }
  }

  Widget _buildReviewsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Reviews (${_reviews.length})',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            ElevatedButton.icon(
              onPressed: _showReviewDialog,
              icon: const Icon(Icons.rate_review, size: 18),
              label: const Text('Write Review'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        if (_reviews.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: Column(
                children: [
                  Icon(Icons.reviews_outlined, size: 64, color: AppTheme.textSecondary),
                  SizedBox(height: 16),
                  Text(
                    'No reviews yet',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Be the first to review this gym!',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          )
        else
          ..._reviews.map((review) {
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        review.userImage != null && review.userImage!.isNotEmpty
                            ? CircleAvatar(
                                radius: 20,
                                backgroundImage: CachedNetworkImageProvider(review.userImage!),
                                onBackgroundImageError: (_, __) {},
                                child: review.userImage!.isEmpty
                                    ? Text(
                                        (review.userName.isNotEmpty ? review.userName[0] : '?').toUpperCase(),
                                      )
                                    : null,
                              )
                            : CircleAvatar(
                                radius: 20,
                                child: Text(
                                  (review.userName.isNotEmpty ? review.userName[0] : '?').toUpperCase(),
                                ),
                              ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                review.userName,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Row(
                                children: [
                                  RatingBarIndicator(
                                    rating: review.rating.toDouble(),
                                    itemBuilder: (context, index) => const Icon(
                                      Icons.star,
                                      color: AppTheme.warningColor,
                                    ),
                                    itemCount: 5,
                                    itemSize: 16.0,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    _formatDate(review.createdAt),
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: AppTheme.textSecondary,
                                        ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      review.comment,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    
                    // Admin Reply Section
                    if (review.adminReply != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppTheme.primaryColor.withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                // Gym Logo
                                if (review.adminReply!.repliedBy?.logoUrl != null && 
                                    review.adminReply!.repliedBy!.logoUrl!.isNotEmpty)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: CachedNetworkImage(
                                      imageUrl: review.adminReply!.repliedBy!.logoUrl!,
                                      width: 32,
                                      height: 32,
                                      fit: BoxFit.cover,
                                      errorWidget: (context, url, error) => Container(
                                        width: 32,
                                        height: 32,
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryColor,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(
                                          Icons.fitness_center,
                                          size: 16,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryColor,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.fitness_center,
                                      size: 16,
                                      color: Colors.white,
                                    ),
                                  ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            review.adminReply!.repliedBy?.gymName ?? 'Gym Admin',
                                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primaryColor,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          Icon(
                                            Icons.verified,
                                            size: 14,
                                            color: AppTheme.primaryColor,
                                          ),
                                        ],
                                      ),
                                      Text(
                                        _formatDate(review.adminReply!.repliedAt),
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: AppTheme.textSecondary,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              review.adminReply!.reply,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          }).toList(),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inDays == 0) {
      if (diff.inHours == 0) {
        return '${diff.inMinutes}m ago';
      }
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else if (diff.inDays < 30) {
      return '${(diff.inDays / 7).floor()}w ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  Widget _buildPhotosTab() {
    if (_photos.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.photo_library_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No photos available',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }
    return PhotoGalleryWidget(
      photos: _photos,
      gymName: _gym?.name ?? '',
    );
  }

  Widget _buildEquipmentTab() {
    if (_equipment.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.fitness_center_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No equipment information available',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }
    return EquipmentGalleryWidget(equipment: _equipment);
  }

  Future<void> _shareGym() async {
    if (_gym == null) return;
    
    await ShareService.shareGym(
      gymId: _gym!.id,
      gymName: _gym!.name,
      description: _gym!.description,
      imageUrl: _gym!.images.isNotEmpty ? _gym!.images.first : null,
    );
  }

  // Build Active Membership Badge
  Widget _buildActiveMembershipBadge() {
    if (_userMembership == null) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.accentColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.card_membership,
              color: AppTheme.primaryColor,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      _userMembership!.planTypeIcon,
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Active Member',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'ID: ${_userMembership!.membershipId}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Valid until: ${_userMembership!.formattedValidUntil}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              // Show QR code in a dialog
              _showMembershipQRCode();
            },
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.qr_code,
                color: AppTheme.primaryColor,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMembershipInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 15,
            color: Theme.of(context).textTheme.bodyMedium?.color,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  // Show Membership QR Code Dialog
  void _showMembershipQRCode() {
    if (_userMembership == null) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Membership QR Code'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Theme.of(context).dividerColor, width: 2),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.qr_code_2,
                    size: 180,
                    color: AppTheme.textPrimary,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _userMembership!.membershipId,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Show this QR code at the gym entrance',
              style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
              textAlign: TextAlign.center,
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

  // Show Problem Report Dialog
  void _showProblemReportDialog() {
    final categories = [
      {'value': 'equipment-broken', 'label': '🏋️ Equipment Broken/Damaged'},
      {'value': 'equipment-unavailable', 'label': '❌ Equipment Unavailable'},
      {'value': 'cleanliness-issue', 'label': '🧹 Cleanliness Issue'},
      {'value': 'ac-heating-issue', 'label': '❄️ AC/Heating Issue'},
      {'value': 'staff-behavior', 'label': '👥 Staff Behavior'},
      {'value': 'class-schedule', 'label': '📅 Class Schedule Problem'},
      {'value': 'overcrowding', 'label': '👨‍👩‍👧‍👦 Overcrowding'},
      {'value': 'safety-concern', 'label': '🛡️ Safety Concern'},
      {'value': 'facility-maintenance', 'label': '🔧 Facility Maintenance'},
      {'value': 'locker-issue', 'label': '🔒 Locker Issue'},
      {'value': 'payment-billing', 'label': '💳 Payment/Billing'},
      {'value': 'trainer-complaint', 'label': '👤 Trainer Complaint'},
      {'value': 'other', 'label': '📝 Other'},
    ];

    String? selectedCategory;
    String? selectedPriority = 'normal';
    final subjectController = TextEditingController();
    final descriptionController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.report_problem, color: Colors.orange),
              SizedBox(width: 8),
              Text('Report a Problem'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_userMembership != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.badge, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Membership ID: ${_userMembership!.membershipId}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
                const Text(
                  'Problem Category *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: selectedCategory,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    hintText: 'Select a category',
                  ),
                  items: categories.map((cat) {
                    return DropdownMenuItem(
                      value: cat['value'],
                      child: Text(cat['label']!, style: const TextStyle(fontSize: 14)),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setDialogState(() => selectedCategory = value);
                  },
                ),
                const SizedBox(height: 16),
                const Text(
                  'Priority Level *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: selectedPriority,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'normal', child: Text('Normal - Can wait')),
                    DropdownMenuItem(value: 'high', child: Text('High - Needs attention')),
                    DropdownMenuItem(value: 'urgent', child: Text('Urgent - Immediate action')),
                  ],
                  onChanged: (value) {
                    setDialogState(() => selectedPriority = value);
                  },
                ),
                const SizedBox(height: 16),
                const Text(
                  'Subject *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: subjectController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Brief summary of the problem',
                    contentPadding: EdgeInsets.all(12),
                  ),
                  maxLength: 200,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Description *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Please provide detailed information...',
                    contentPadding: EdgeInsets.all(12),
                  ),
                  maxLines: 4,
                  maxLength: 2000,
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.info_outline, size: 18, color: Colors.blue),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your report will be sent to gym management. You\'ll receive updates via notifications.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (selectedCategory == null ||
                          subjectController.text.trim().isEmpty ||
                          descriptionController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please fill in all required fields'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);

                      final report = MemberProblemReport(
                        gymId: widget.gymId,
                        category: selectedCategory!,
                        subject: subjectController.text.trim(),
                        description: descriptionController.text.trim(),
                        priority: selectedPriority ?? 'normal',
                      );

                      final result = await ApiService.submitMemberProblem(report);

                      if (!mounted) return;

                      Navigator.pop(context);

                      if (result['success'] == true) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Problem reported successfully! Report ID: ${result['reportId']}',
                            ),
                            backgroundColor: Colors.green,
                            duration: const Duration(seconds: 4),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(result['message'] ?? 'Failed to submit report'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
              ),
              child: isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Submit Report'),
            ),
          ],
        ),
      ),
    );
  }
}

// Enhanced Membership Plan Card Widget
class _MembershipPlanCardWidget extends StatefulWidget {
  final MembershipPlan membershipPlan;
  final Gym gym;
  final Color planColor;
  final IconData planIcon;

  const _MembershipPlanCardWidget({
    Key? key,
    required this.membershipPlan,
    required this.gym,
    required this.planColor,
    required this.planIcon,
  }) : super(key: key);

  @override
  State<_MembershipPlanCardWidget> createState() => _MembershipPlanCardWidgetState();
}

class _MembershipPlanCardWidgetState extends State<_MembershipPlanCardWidget> {
  int _selectedOptionIndex = 0;

  MonthlyOption get _selectedOption => widget.membershipPlan.monthlyOptions[_selectedOptionIndex];

  @override
  void initState() {
    super.initState();
    // Select the popular option by default, or the first if none is popular
    final popularIndex = widget.membershipPlan.monthlyOptions.indexWhere((o) => o.isPopular);
    if (popularIndex != -1) {
      _selectedOptionIndex = popularIndex;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width > 600;
    
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _selectedOption.isPopular
              ? widget.planColor.withOpacity(0.5)
              : Theme.of(context).dividerColor.withOpacity(0.5),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: widget.planColor.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: isWideScreen 
        ? IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 2, child: _buildCardHeader()),
                Expanded(flex: 3, child: _buildCardContent()),
              ],
            ),
          )
        : Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildCardHeader(),
              _buildCardContent(),
            ],
          ),
    );
  }

  Widget _buildCardHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            widget.planColor.withOpacity(0.1),
            widget.planColor.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: MediaQuery.of(context).size.width > 600
            ? const BorderRadius.only(
                topLeft: Radius.circular(18),
                bottomLeft: Radius.circular(18),
              )
            : const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
              ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_selectedOption.discount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.red.shade400, Colors.orange.shade400],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                'SAVE ${_selectedOption.discount}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          const SizedBox(height: 16),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: widget.planColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: widget.planColor.withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Icon(
              widget.planIcon,
              size: 40,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            widget.membershipPlan.name,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: widget.planColor,
            ),
            textAlign: TextAlign.center,
          ),
          if (widget.membershipPlan.note.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              widget.membershipPlan.note,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).textTheme.bodySmall?.color,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCardContent() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Benefits
          if (widget.membershipPlan.benefits.isNotEmpty) ...[
            ...widget.membershipPlan.benefits.map((benefit) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: widget.planColor,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      benefit,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            )),
            const SizedBox(height: 16),
          ],

          // Month selection
          const Text(
            'Select Duration',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(widget.membershipPlan.monthlyOptions.length, (index) {
              final option = widget.membershipPlan.monthlyOptions[index];
              final isSelected = index == _selectedOptionIndex;
              return InkWell(
                onTap: () => setState(() => _selectedOptionIndex = index),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? widget.planColor
                        : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected
                          ? widget.planColor
                          : Colors.grey.shade300,
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        option.durationLabel,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? Colors.white : AppTheme.textPrimary,
                        ),
                      ),
                      if (option.discount > 0)
                        Text(
                          '${option.discount}% off',
                          style: TextStyle(
                            fontSize: 10,
                            color: isSelected ? Colors.white : Colors.green,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          
          // Total price with discount
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: widget.planColor.withOpacity(0.05),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: widget.planColor.withOpacity(0.2),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Total Price',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (_selectedOption.discount > 0) ...[
                        Text(
                          '₹${_selectedOption.price.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                      Text(
                        '₹${_selectedOption.finalPrice.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: widget.planColor,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_selectedOption.discount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.shade100,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      'Save ₹${(_selectedOption.price - _selectedOption.finalPrice).toStringAsFixed(0)}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.green.shade700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          
          // Buy button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Navigate to booking with selected option
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Selected: ${_selectedOption.durationLabel} - ₹${_selectedOption.finalPrice.toStringAsFixed(0)}'),
                  ),
                );
                // TODO: Implement booking navigation with MonthlyOption
                // Navigator.push(
                //   context,
                //   MaterialPageRoute(
                //     builder: (_) => BookingScreen(
                //       gym: widget.gym,
                //       monthlyOption: _selectedOption,
                //     ),
                //   ),
                // );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.planColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 4,
                shadowColor: widget.planColor.withOpacity(0.4),
              ),
              child: const Text(
                'Buy Membership',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Old Membership Card with Month Selection (DEPRECATED - kept for backwards compatibility)
class _MembershipCardWithMonthSelection extends StatefulWidget {
  final Membership membership;
  final Gym gym;
  final Color planColor;
  final IconData planIcon;

  const _MembershipCardWithMonthSelection({
    Key? key,
    required this.membership,
    required this.gym,
    required this.planColor,
    required this.planIcon,
  }) : super(key: key);

  @override
  State<_MembershipCardWithMonthSelection> createState() => _MembershipCardWithMonthSelectionState();
}

class _MembershipCardWithMonthSelectionState extends State<_MembershipCardWithMonthSelection> {
  int _selectedMonths = 1;
  final List<int> _monthOptions = [1, 3, 6, 12];

  double get _basePrice => widget.membership.price;
  
  double get _totalPrice {
    double price = _basePrice * _selectedMonths;
    // Apply discount for longer durations
    if (_selectedMonths == 3) {
      price *= 0.95; // 5% off
    } else if (_selectedMonths == 6) {
      price *= 0.90; // 10% off
    } else if (_selectedMonths == 12) {
      price *= 0.85; // 15% off
    }
    return price;
  }

  int? get _discountPercent {
    if (_selectedMonths == 3) return 5;
    if (_selectedMonths == 6) return 10;
    if (_selectedMonths == 12) return 15;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isWideScreen = MediaQuery.of(context).size.width > 600;
    
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: widget.membership.isPopular
              ? widget.planColor.withOpacity(0.5)
              : Theme.of(context).dividerColor.withOpacity(0.5),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: widget.planColor.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: isWideScreen 
        ? IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 2, child: _buildCardHeader()),
                Expanded(flex: 3, child: _buildCardContent()),
              ],
            ),
          )
        : Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildCardHeader(),
              _buildCardContent(),
            ],
          ),
    );
  }

  Widget _buildCardHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            widget.planColor.withOpacity(0.1),
            widget.planColor.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: MediaQuery.of(context).size.width > 600
            ? const BorderRadius.only(
                topLeft: Radius.circular(18),
                bottomLeft: Radius.circular(18),
              )
            : const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
              ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_discountPercent != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.red.shade400, Colors.orange.shade400],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.red.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                'SAVE $_discountPercent%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          const SizedBox(height: 16),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: widget.planColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: widget.planColor.withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Icon(
              widget.planIcon,
              size: 40,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            widget.membership.name,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: widget.planColor,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '₹',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: widget.planColor,
                ),
              ),
              Text(
                _basePrice.toStringAsFixed(0),
                style: TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.bold,
                  color: widget.planColor,
                  height: 1,
                ),
              ),
            ],
          ),
          Text(
            'per month',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).textTheme.bodySmall?.color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardContent() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Benefits
          ...widget.membership.features.take(3).map((feature) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Icon(
                  Icons.check_circle,
                  color: widget.planColor,
                  size: 18,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    feature,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Month selection
                const Text(
                  'Select Duration',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _monthOptions.map((months) {
                    final isSelected = months == _selectedMonths;
                    return InkWell(
                      onTap: () => setState(() => _selectedMonths = months),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? widget.planColor
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? widget.planColor
                                : Colors.grey.shade300,
                            width: 1.5,
                          ),
                        ),
                        child: Text(
                          '$months Month${months > 1 ? 's' : ''}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white : AppTheme.textPrimary,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
          
          // Total price with discount
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: widget.planColor.withOpacity(0.05),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: widget.planColor.withOpacity(0.2),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Total Price',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (_discountPercent != null) ...[
                        Text(
                          '₹${(_basePrice * _selectedMonths).toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                      Text(
                        '₹${_totalPrice.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: widget.planColor,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_discountPercent != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.shade100,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      'Save ₹${((_basePrice * _selectedMonths) - _totalPrice).toStringAsFixed(0)}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.green.shade700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          
          // Buy button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BookingScreen(
                      gym: widget.gym,
                      membership: widget.membership,
                      selectedMonths: _selectedMonths,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.planColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 4,
                shadowColor: widget.planColor.withOpacity(0.4),
              ),
              child: const Text(
                'Buy Membership',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Trial Booking Dialog
class _TrialBookingDialog extends StatefulWidget {
  final String gymId;
  final String gymName;
  final int remainingTrials;

  const _TrialBookingDialog({
    Key? key,
    required this.gymId,
    required this.gymName,
    required this.remainingTrials,
  }) : super(key: key);

  @override
  State<_TrialBookingDialog> createState() => _TrialBookingDialogState();
}

class _TrialBookingDialogState extends State<_TrialBookingDialog> {
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String _selectedTime = '09:00 AM';
  String _sessionType = 'General Training';
  bool _isLoading = false;

  final List<String> _timeSlots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
    '11:00 AM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  final List<String> _sessionTypes = [
    'General Training',
    'Cardio Session',
    'Weight Training',
    'Yoga/Flexibility',
    'CrossFit',
  ];

  Future<void> _bookTrial() async {
    setState(() => _isLoading = true);

    try {
      final result = await ApiService.bookTrial(
        gymId: widget.gymId,
        preferredDate: _selectedDate.toIso8601String(),
        preferredTime: _selectedTime,
        sessionType: _sessionType,
      );

      if (result['success'] == true && mounted) {
        Navigator.of(context).pop(true);
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Failed to book trial'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.play_circle, color: AppTheme.accentColor),
              SizedBox(width: 8),
              Text('Book Trial Session'),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            widget.gymName,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary,
                ),
          ),
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.successColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.successColor),
            ),
            child: Text(
              '${widget.remainingTrials} trial${widget.remainingTrials > 1 ? 's' : ''} remaining this month',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.successColor,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Session Type
            const Text(
              'Session Type',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _sessionType,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              items: _sessionTypes.map((type) {
                return DropdownMenuItem(
                  value: type,
                  child: Text(type),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _sessionType = value);
                }
              },
            ),
            const SizedBox(height: 16),

            // Preferred Date
            const Text(
              'Preferred Date',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (date != null) {
                  setState(() => _selectedDate = date);
                }
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                      style: const TextStyle(fontSize: 16),
                    ),
                    const Icon(Icons.calendar_today, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Preferred Time
            const Text(
              'Preferred Time',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _selectedTime,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              items: _timeSlots.map((time) {
                return DropdownMenuItem(
                  value: time,
                  child: Text(time),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedTime = value);
                }
              },
            ),
            const SizedBox(height: 16),

            // Info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 20, color: AppTheme.primaryColor),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'The gym will confirm your trial session within 24 hours.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _bookTrial,
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Book Trial'),
        ),
      ],
    );
  }
}
