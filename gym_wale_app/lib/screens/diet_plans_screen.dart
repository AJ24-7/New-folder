import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/app_theme.dart';
import '../services/diet_service.dart';
import '../models/diet_plan.dart';
import '../models/user_diet_subscription.dart';
import 'diet_plan_detail_screen.dart';
import 'workout_assistant_screen.dart';
import 'subscriptions_screen.dart';

class DietPlansScreen extends StatefulWidget {
  const DietPlansScreen({Key? key}) : super(key: key);

  @override
  State<DietPlansScreen> createState() => _DietPlansScreenState();
}

class _DietPlansScreenState extends State<DietPlansScreen> {
  bool _isLoading = true;
  List<DietPlanTemplate> _allPlans = [];
  List<DietPlanTemplate> _filteredPlans = [];
  UserDietSubscription? _activeSubscription;

  // Filter states
  final Set<String> _selectedTags = {};
  double _budgetRange = 5000;
  int? _selectedCalorieRange;

  // Available filters
  final List<Map<String, dynamic>> _budgets = [
    {'id': 'budget-1000', 'label': '₹1000', 'value': 1000},
    {'id': 'budget-2000', 'label': '₹2000', 'value': 2000},
    {'id': 'budget-3000', 'label': '₹3000', 'value': 3000},
    {'id': 'budget-4000', 'label': '₹4000', 'value': 4000},
    {'id': 'budget-5000', 'label': '₹5000', 'value': 5000},
  ];

  final List<Map<String, dynamic>> _dietTypes = [
    {'id': 'vegetarian', 'name': 'Vegetarian', 'icon': Icons.local_florist, 'color': Colors.green},
    {'id': 'non-vegetarian', 'name': 'Non-Veg', 'icon': Icons.restaurant, 'color': Colors.red},
    {'id': 'vegan', 'name': 'Vegan', 'icon': Icons.eco, 'color': Colors.teal},
    {'id': 'eggetarian', 'name': 'Eggetarian', 'icon': Icons.egg, 'color': Colors.orange},
  ];

  final List<Map<String, dynamic>> _nutritionTypes = [
    {'id': 'high-protein', 'name': 'High Protein', 'icon': Icons.fitness_center},
    {'id': 'low-carb', 'name': 'Low Carb', 'icon': Icons.rice_bowl},
    {'id': 'balanced', 'name': 'Balanced', 'icon': Icons.balance},
    {'id': 'keto', 'name': 'Keto', 'icon': Icons.water_drop},
  ];

  final List<Map<String, dynamic>> _goals = [
    {'id': 'weight-loss', 'name': 'Weight Loss', 'icon': Icons.trending_down},
    {'id': 'muscle-gain', 'name': 'Muscle Gain', 'icon': Icons.fitness_center},
    {'id': 'maintenance', 'name': 'Maintenance', 'icon': Icons.balance},
    {'id': 'athletic-performance', 'name': 'Athletic', 'icon': Icons.sports},
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      // Load active subscription
      final subscriptionResult = await DietService.getUserActiveDietSubscription();
      if (subscriptionResult['success'] && subscriptionResult['subscription'] != null) {
        _activeSubscription = subscriptionResult['subscription'];
      }

      // Load all diet plans
      final plansResult = await DietService.getDietPlanTemplates();
      if (plansResult['success']) {
        _allPlans = plansResult['plans'] as List<DietPlanTemplate>;
        _applyFilters();
      } else {
        _showError(plansResult['message']);
      }
    } catch (e) {
      _showError('Failed to load diet plans: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredPlans = _allPlans.where((plan) {
        // Budget filter - check if plan budget is within range
        if (plan.budgetAmount != null && double.parse(plan.budgetAmount!) > _budgetRange) {
          return false;
        }

        // Tag filters - check if any plan tag contains the filter tag (more flexible matching)
        if (_selectedTags.isNotEmpty) {
          for (final tag in _selectedTags) {
            // Check if any of the plan's tags contains this filter tag
            bool tagMatches = plan.tags.any((planTag) => 
              planTag.toLowerCase().contains(tag.toLowerCase()) ||
              tag.toLowerCase().contains(planTag.toLowerCase())
            );
            if (!tagMatches) {
              return false;
            }
          }
        }

        // Calorie range filter
        if (_selectedCalorieRange != null) {
          final ranges = {
            0: [1000, 1500],
            1: [1500, 2000],
            2: [2000, 2500],
            3: [2500, 3000],
            4: [3000, 3500],
          };
          final range = ranges[_selectedCalorieRange];
          if (range != null) {
            if (plan.dailyCalories < range[0] || plan.dailyCalories > range[1]) {
              return false;
            }
          }
        }

        return true;
      }).toList();
      
      // Debug logging
      print('Filter applied: Budget=₹$_budgetRange, Tags=$_selectedTags, Results=${_filteredPlans.length}');
      if (_filteredPlans.isEmpty && _allPlans.isNotEmpty) {
        print('No matches found. Total plans: ${_allPlans.length}');
        if (_selectedTags.isNotEmpty) {
          print('Selected tags: $_selectedTags');
          print('Available tags in plans:');
          for (var p in _allPlans) {
            print('  ${p.name}: ${p.tags}');
          }
        }
      }
    });
  }

  void _toggleTag(String tag) {
    setState(() {
      if (_selectedTags.contains(tag)) {
        _selectedTags.remove(tag);
      } else {
        _selectedTags.add(tag);
      }
      _applyFilters();
    });
  }

  void _clearFilters() {
    setState(() {
      _selectedTags.clear();
      _budgetRange = 5000;
      _selectedCalorieRange = null;
      _applyFilters();
    });
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else ...[
            if (_activeSubscription != null) ...[
              SliverToBoxAdapter(child: _buildActiveSubscriptionBanner()),
            ],
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeroSection(),
                    const SizedBox(height: 24),
                    _buildFiltersSection(),
                    const SizedBox(height: 24),
                    _buildResultsHeader(),
                  ],
                ),
              ),
            ),
            _filteredPlans.isEmpty
                ? SliverFillRemaining(child: _buildEmptyState())
                : SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) => _buildPlanCard(_filteredPlans[index]),
                        childCount: _filteredPlans.length,
                      ),
                    ),
                  ),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Diet Plans',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        background: Container(
          decoration: const BoxDecoration(
            gradient: AppTheme.primaryGradient,
          ),
          child: Center(
            child: Icon(
              Icons.restaurant_menu,
              size: 80,
              color: Colors.white.withOpacity(0.3),
            ),
          ),
        ),
      ),
      actions: [
        PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'workout') {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const WorkoutAssistantScreen(),
                ),
              );
            } else if (value == 'subscriptions') {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SubscriptionsScreen(),
                ),
              );
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'workout',
              child: Row(
                children: [
                  Icon(Icons.fitness_center, color: AppTheme.primaryColor),
                  SizedBox(width: 12),
                  Text('Workout Plans'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'subscriptions',
              child: Row(
                children: [
                  Icon(Icons.card_membership, color: AppTheme.primaryColor),
                  SizedBox(width: 12),
                  Text('My Subscriptions'),
                ],
              ),
            ),
          ],
        ),
        if (_selectedTags.isNotEmpty || _budgetRange != 5000 || _selectedCalorieRange != null)
          IconButton(
            icon: const Icon(Icons.filter_list_off),
            onPressed: _clearFilters,
            tooltip: 'Clear filters',
          ),
      ],
    );
  }

  Widget _buildActiveSubscriptionBanner() {
    if (_activeSubscription == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppTheme.accentGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accentColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.restaurant_menu, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Active Diet Plan',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _activeSubscription!.planTemplate?.name ?? 'Your Diet Plan',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_activeSubscription!.daysRemaining} days remaining',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 20),
            onPressed: () {
              // Navigate to subscription details
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark 
            ? [AppTheme.accentColor.withOpacity(0.15), const Color(0xFF1E1E1E)]
            : [AppTheme.accentColor.withOpacity(0.2), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.accentColor.withOpacity(isDark ? 0.4 : 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: AppTheme.accentGradient,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.accentColor.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.emoji_food_beverage,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Build Your Perfect Diet',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Customize based on your budget & goals',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Select your preferences below to find diet plans that match your budget, dietary needs, and fitness goals. Each plan includes detailed meal breakdowns with complete nutritional information.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontSize: 14,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFiltersSection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.tune, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                'Filter Your Options',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              if (_selectedTags.isNotEmpty || _budgetRange != 5000)
                TextButton.icon(
                  onPressed: _clearFilters,
                  icon: const Icon(Icons.clear_all, size: 16),
                  label: const Text('Clear'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.dangerColor,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Budget Filter - Slider
          _buildModernFilterSection(
            title: 'Monthly Budget',
            icon: Icons.account_balance_wallet,
            child: _buildBudgetSlider(),
          ),
          const SizedBox(height: 20),
          
          // Diet Type Filter
          _buildModernFilterSection(
            title: 'Diet Preference',
            icon: Icons.restaurant_menu,
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _dietTypes.map((type) {
                final isSelected = _selectedTags.contains(type['id']);
                return _buildIconChip(
                  label: type['name'],
                  icon: type['icon'],
                  color: type['color'],
                  isSelected: isSelected,
                  onTap: () => _toggleTag(type['id']),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 20),
          
          // Nutrition & Goals in Grid
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _buildModernFilterSection(
                  title: 'Nutrition',
                  icon: Icons.restaurant,
                  compact: true,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _nutritionTypes.map((type) {
                      final isSelected = _selectedTags.contains(type['id']);
                      return _buildCompactChip(
                        label: type['name'],
                        icon: type['icon'],
                        isSelected: isSelected,
                        onTap: () => _toggleTag(type['id']),
                      );
                    }).toList(),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildModernFilterSection(
                  title: 'Goals',
                  icon: Icons.emoji_events,
                  compact: true,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _goals.map((goal) {
                      final isSelected = _selectedTags.contains(goal['id']);
                      return _buildCompactChip(
                        label: goal['name'],
                        icon: goal['icon'],
                        isSelected: isSelected,
                        onTap: () => _toggleTag(goal['id']),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBudgetSlider() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Up to',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 13,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: AppTheme.accentGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '₹${_budgetRange.toInt()}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: AppTheme.primaryColor,
            inactiveTrackColor: AppTheme.primaryColor.withOpacity(0.2),
            thumbColor: AppTheme.primaryColor,
            overlayColor: AppTheme.primaryColor.withOpacity(0.2),
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
          ),
          child: Slider(
            value: _budgetRange,
            min: 500,
            max: 10000,
            divisions: 19,
            onChanged: (value) {
              setState(() {
                _budgetRange = value;
              });
            },
            onChangeEnd: (value) {
              _applyFilters();
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '₹500',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
              ),
            ),
            Text(
              '₹10,000',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildModernFilterSection({
    required String title,
    required IconData icon,
    required Widget child,
    bool compact = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              icon,
              size: compact ? 14 : 16,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(width: 6),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontSize: compact ? 12 : 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        SizedBox(height: compact ? 8 : 12),
        child,
      ],
    );
  }

  Widget _buildIconChip({
    required String label,
    required IconData icon,
    required Color color,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? color
              : isDark
                  ? const Color(0xFF2C2C2C)
                  : color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : color.withOpacity(0.3),
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : color,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isSelected
                    ? Colors.white
                    : isDark
                        ? Colors.white70
                        : color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactChip({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected ? AppTheme.primaryGradient : null,
          color: isSelected
              ? null
              : isDark
                  ? const Color(0xFF2C2C2C)
                  : AppTheme.primaryColor.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : AppTheme.primaryColor.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? Colors.white : AppTheme.primaryColor,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSelected
                      ? Colors.white
                      : isDark
                          ? Colors.white70
                          : AppTheme.primaryColor,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          '${_filteredPlans.length} Plans Available',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 80,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'No Diet Plans Found',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Try adjusting your filters to see more options',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _clearFilters,
              icon: const Icon(Icons.refresh),
              label: const Text('Clear Filters'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanCard(DietPlanTemplate plan) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => DietPlanDetailScreen(plan: plan),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image header
              if (plan.imageUrl != null && plan.imageUrl!.isNotEmpty)
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                  child: CachedNetworkImage(
                    imageUrl: plan.imageUrl!,
                    height: 160,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      height: 160,
                      color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade200,
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    errorWidget: (context, url, error) {
                      print('❌ Error loading image: $url - $error');
                      return Container(
                        height: 160,
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                        ),
                        child: const Center(
                          child: Icon(Icons.restaurant_menu, size: 60, color: Colors.white),
                        ),
                      );
                    },
                  ),
                ),
              
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                plan.name,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (plan.description != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  plan.description!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontSize: 13,
                                    color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (plan.budgetAmount != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: AppTheme.accentGradient,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '₹${plan.budgetAmount}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                
                // Macros info
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildMacroChip('${plan.dailyCalories} cal', Icons.local_fire_department, AppTheme.warningColor),
                    if (plan.dailyProtein != null)
                      _buildMacroChip('P: ${plan.dailyProtein}g', Icons.fitness_center, AppTheme.accentColor),
                    if (plan.dailyCarbs != null)
                      _buildMacroChip('C: ${plan.dailyCarbs}g', Icons.rice_bowl, AppTheme.warningColor),
                    if (plan.dailyFats != null)
                      _buildMacroChip('F: ${plan.dailyFats}g', Icons.water_drop, AppTheme.accentColor),
                  ],
                ),
                const SizedBox(height: 12),
                
                // Tags
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: plan.tags.take(5).map((tag) {
                    final displayTag = tag.replaceAll('-', ' ');
                    final capitalizedTag = displayTag
                        .split(' ')
                        .map((word) => word.isNotEmpty
                            ? '${word[0].toUpperCase()}${word.substring(1)}'
                            : '')
                        .join(' ');
                    
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getTagColor(tag),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        capitalizedTag,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                
                // Additional info
                Row(
                  children: [
                    Icon(
                      Icons.restaurant,
                      size: 16,
                      color: Theme.of(context).textTheme.bodyMedium?.color,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${plan.mealsPerDay} meals/day',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Icon(
                      Icons.calendar_today,
                      size: 16,
                      color: Theme.of(context).textTheme.bodyMedium?.color,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      plan.duration,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 13,
                      ),
                    ),
                    const Spacer(),
                    const Icon(Icons.arrow_forward_ios, size: 16, color: AppTheme.primaryColor),
                  ],
                ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMacroChip(String text, IconData icon, Color color) {
    return Flexible(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                text,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getTagColor(String tag) {
    if (tag.contains('vegetarian')) return Colors.green;
    if (tag.contains('non-vegetarian')) return Colors.red;
    if (tag.contains('vegan')) return Colors.teal;
    if (tag.contains('protein')) return Colors.blue;
    if (tag.contains('weight-loss')) return Colors.orange;
    if (tag.contains('muscle')) return Colors.purple;
    if (tag.contains('keto')) return Colors.indigo;
    if (tag.contains('budget')) return AppTheme.accentColor;
    return AppTheme.primaryColor;
  }
}
