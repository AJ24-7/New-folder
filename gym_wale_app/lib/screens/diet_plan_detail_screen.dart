import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/diet_plan.dart';
import '../models/user_diet_subscription.dart';
import '../services/diet_service.dart';

class DietPlanDetailScreen extends StatefulWidget {
  final DietPlanTemplate plan;
  final UserDietSubscription? existingSubscription;

  const DietPlanDetailScreen({
    Key? key,
    required this.plan,
    this.existingSubscription,
  }) : super(key: key);

  @override
  State<DietPlanDetailScreen> createState() => _DietPlanDetailScreenState();
}

class _DietPlanDetailScreenState extends State<DietPlanDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late MealPlan _customMeals;
  late MealNotificationSettings _notificationSettings;
  bool _hasModifications = false;
  bool _isSubscribing = false;

  final List<String> _mealTypes = [
    'Breakfast',
    'Mid Morning',
    'Lunch',
    'Evening Snack',
    'Dinner',
    'Post Dinner',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _customMeals = MealPlan(
      breakfast: List.from(widget.plan.meals.breakfast),
      midMorningSnack: List.from(widget.plan.meals.midMorningSnack),
      lunch: List.from(widget.plan.meals.lunch),
      eveningSnack: List.from(widget.plan.meals.eveningSnack),
      dinner: List.from(widget.plan.meals.dinner),
      postDinner: List.from(widget.plan.meals.postDinner),
    );
    _notificationSettings = widget.existingSubscription?.mealNotifications ??
        MealNotificationSettings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Meal> _getMealsForType(String mealType) {
    switch (mealType) {
      case 'Breakfast':
        return _customMeals.breakfast;
      case 'Mid Morning':
        return _customMeals.midMorningSnack;
      case 'Lunch':
        return _customMeals.lunch;
      case 'Evening Snack':
        return _customMeals.eveningSnack;
      case 'Dinner':
        return _customMeals.dinner;
      case 'Post Dinner':
        return _customMeals.postDinner;
      default:
        return [];
    }
  }

  String _getTimeForMealType(String mealType) {
    switch (mealType) {
      case 'Breakfast':
        return _notificationSettings.breakfastTime;
      case 'Mid Morning':
        return _notificationSettings.midMorningSnackTime;
      case 'Lunch':
        return _notificationSettings.lunchTime;
      case 'Evening Snack':
        return _notificationSettings.eveningSnackTime;
      case 'Dinner':
        return _notificationSettings.dinnerTime;
      case 'Post Dinner':
        return _notificationSettings.postDinnerTime;
      default:
        return '00:00';
    }
  }

  void _updateMealTime(String mealType, String time) {
    setState(() {
      _hasModifications = true;
      switch (mealType) {
        case 'Breakfast':
          _notificationSettings = _notificationSettings.copyWith(breakfastTime: time);
          break;
        case 'Mid Morning':
          _notificationSettings =
              _notificationSettings.copyWith(midMorningSnackTime: time);
          break;
        case 'Lunch':
          _notificationSettings = _notificationSettings.copyWith(lunchTime: time);
          break;
        case 'Evening Snack':
          _notificationSettings =
              _notificationSettings.copyWith(eveningSnackTime: time);
          break;
        case 'Dinner':
          _notificationSettings = _notificationSettings.copyWith(dinnerTime: time);
          break;
        case 'Post Dinner':
          _notificationSettings =
              _notificationSettings.copyWith(postDinnerTime: time);
          break;
      }
    });
  }

  Future<void> _subscribeToPlan() async {
    setState(() => _isSubscribing = true);

    try {
      final result = await DietService.subscribeToDietPlan(
        planTemplateId: widget.plan.id,
        customMeals: _hasModifications ? _customMeals : null,
        mealNotifications: _notificationSettings,
      );

      if (result['success']) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Successfully subscribed!'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          Navigator.of(context).pop(true); // Return true to indicate success
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to subscribe'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubscribing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          SliverToBoxAdapter(
            child: Column(
              children: [
                _buildPlanHeader(),
                _buildTabBar(),
              ],
            ),
          ),
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildMealsTab(),
                _buildNotificationsTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      pinned: true,
      expandedHeight: 200,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          widget.plan.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        background: widget.plan.imageUrl != null && widget.plan.imageUrl!.isNotEmpty
            ? Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    widget.plan.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => _buildFallbackHeader(),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.4),
                        ],
                      ),
                    ),
                  ),
                ],
              )
            : _buildFallbackHeader(),
      ),
    );
  }

  Widget _buildFallbackHeader() {
    return Container(
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
    );
  }

  Widget _buildPlanHeader() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.plan.description != null) ...[
            Text(
              widget.plan.description!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
          ],
          Row(
            children: [
              _buildStatCard(
                'Calories',
                '${widget.plan.dailyCalories}',
                Icons.local_fire_department,
                Colors.orange,
              ),
              const SizedBox(width: 12),
              if (widget.plan.dailyProtein != null)
                _buildStatCard(
                  'Protein',
                  '${widget.plan.dailyProtein}g',
                  Icons.fitness_center,
                  Colors.blue,
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (widget.plan.dailyCarbs != null)
                _buildStatCard(
                  'Carbs',
                  '${widget.plan.dailyCarbs}g',
                  Icons.rice_bowl,
                  AppTheme.warningColor,
                ),
              const SizedBox(width: 12),
              if (widget.plan.dailyFats != null)
                _buildStatCard(
                  'Fats',
                  '${widget.plan.dailyFats}g',
                  Icons.water_drop,
                  AppTheme.accentColor,
                ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: widget.plan.tags.map((tag) {
              final displayTag = tag.replaceAll('-', ' ');
              final capitalizedTag = displayTag
                  .split(' ')
                  .map((word) => word.isNotEmpty
                      ? '${word[0].toUpperCase()}${word.substring(1)}'
                      : '')
                  .join(' ');
              return Chip(
                label: Text(
                  capitalizedTag,
                  style: const TextStyle(fontSize: 11),
                ),
                backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color.withOpacity(0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: Colors.white,
        unselectedLabelColor: Theme.of(context).textTheme.bodyMedium?.color,
        indicator: BoxDecoration(
          gradient: AppTheme.primaryGradient,
          borderRadius: BorderRadius.circular(12),
        ),
        tabs: const [
          Tab(text: 'Overview'),
          Tab(text: 'Meals'),
          Tab(text: 'Reminders'),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader('Plan Details'),
          const SizedBox(height: 12),
          _buildInfoRow('Duration', widget.plan.duration),
          _buildInfoRow('Meals per Day', '${widget.plan.mealsPerDay}'),
          _buildInfoRow('Difficulty', widget.plan.difficulty),
          const SizedBox(height: 24),
          _buildSectionHeader('Daily Nutrition Breakdown'),
          const SizedBox(height: 12),
          _buildNutritionBar(
              'Protein', widget.plan.dailyProtein ?? 0, AppTheme.accentColor),
          _buildNutritionBar('Carbs', widget.plan.dailyCarbs ?? 0, AppTheme.warningColor),
          _buildNutritionBar('Fats', widget.plan.dailyFats ?? 0, AppTheme.accentColor),
          if (widget.plan.dailyFiber != null)
            _buildNutritionBar('Fiber', widget.plan.dailyFiber!, AppTheme.successColor),
        ],
      ),
    );
  }

  Widget _buildMealsTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _mealTypes.length,
      itemBuilder: (context, index) {
        final mealType = _mealTypes[index];
        final meals = _getMealsForType(mealType);
        if (meals.isEmpty) return const SizedBox.shrink();

        return _buildMealSection(mealType, meals);
      },
    );
  }

  Widget _buildNotificationsTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        SwitchListTile(
          title: const Text('Enable Meal Reminders'),
          subtitle: const Text('Get notified for each meal time'),
          value: _notificationSettings.enabled,
          onChanged: (value) {
            setState(() {
              _hasModifications = true;
              _notificationSettings =
                  _notificationSettings.copyWith(enabled: value);
            });
          },
          activeThumbColor: AppTheme.primaryColor,
        ),
        const Divider(),
        if (_notificationSettings.enabled) ...[
          ..._mealTypes.map((mealType) {
            final meals = _getMealsForType(mealType);
            if (meals.isEmpty) return const SizedBox.shrink();

            return _buildTimeSelector(mealType);
          }),
        ],
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNutritionBar(String label, int value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '${value}g',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: value / 300,
              backgroundColor: color.withOpacity(0.2),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMealSection(String mealType, List<Meal> meals) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF2C2C2C) : Colors.transparent,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.restaurant, color: AppTheme.primaryColor, size: 20),
                const SizedBox(width: 8),
                Text(
                  mealType,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  _getTimeForMealType(mealType),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          ...meals.map((meal) => _buildMealCard(meal)),
        ],
      ),
    );
  }

  Widget _buildMealCard(Meal meal) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (meal.imageUrl != null && meal.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                meal.imageUrl!,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  height: 180,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.restaurant, size: 40),
                ),
              ),
            ),
          if (meal.imageUrl != null && meal.imageUrl!.isNotEmpty)
            const SizedBox(height: 12),
          Text(
            meal.name,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (meal.description != null) ...[
            const SizedBox(height: 4),
            Text(
              meal.description!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 13,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              _buildMealMacro('${meal.calories} cal', Icons.local_fire_department,
                  AppTheme.warningColor),
              if (meal.protein != null)
                _buildMealMacro('P: ${meal.protein}g', Icons.fitness_center,
                    AppTheme.accentColor),
              if (meal.carbs != null)
                _buildMealMacro(
                    'C: ${meal.carbs}g', Icons.rice_bowl, AppTheme.warningColor),
              if (meal.fats != null)
                _buildMealMacro(
                    'F: ${meal.fats}g', Icons.water_drop, AppTheme.accentColor),
            ],
          ),
          if (meal.ingredients != null && meal.ingredients!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: meal.ingredients!.take(5).map((ingredient) {
                final isDark = Theme.of(context).brightness == Brightness.dark;
                return Chip(
                  label: Text(ingredient),
                  backgroundColor: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade100,
                  labelStyle: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).textTheme.bodyMedium?.color,
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMealMacro(String text, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(right: 8, bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSelector(String mealType) {
    final currentTime = _getTimeForMealType(mealType);

    return ListTile(
      title: Text(mealType),
      trailing: TextButton(
        onPressed: () async {
          final TimeOfDay? picked = await showTimePicker(
            context: context,
            initialTime: TimeOfDay(
              hour: int.parse(currentTime.split(':')[0]),
              minute: int.parse(currentTime.split(':')[1]),
            ),
          );
          if (picked != null) {
            final timeString =
                '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
            _updateMealTime(mealType, timeString);
          }
        },
        child: Text(
          currentTime,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.primaryColor,
          ),
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0xFF2C2C2C) : Colors.grey.shade200,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (widget.plan.budgetAmount != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.accentColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Budget',
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.7),
                      ),
                    ),
                    Text(
                      '₹${widget.plan.budgetAmount}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.accentColor,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _isSubscribing ? null : _subscribeToPlan,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubscribing
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Subscribe to Plan',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
