import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/app_theme.dart';
import '../providers/workout_provider.dart';
import '../models/workout_plan.dart';
import '../l10n/app_localizations.dart';
import 'workout_plan_detail_screen.dart';
import 'diet_plans_screen.dart';
import 'subscriptions_screen.dart';

class WorkoutAssistantScreen extends StatefulWidget {
  const WorkoutAssistantScreen({Key? key}) : super(key: key);

  @override
  State<WorkoutAssistantScreen> createState() => _WorkoutAssistantScreenState();
}

class _WorkoutAssistantScreenState extends State<WorkoutAssistantScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _weightController = TextEditingController();
  final TextEditingController _heightController = TextEditingController();

  String _selectedFitnessLevel = 'beginner';
  bool _showBMICalculator = true;
  bool _hasCalculatedBMI = false;
  Set<String> _selectedGoals = {}; // Goal filters

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final provider = Provider.of<WorkoutProvider>(context, listen: false);
    await provider.loadWorkoutPlans();
    await provider.loadUserProgress();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _weightController.dispose();
    _heightController.dispose();
    super.dispose();
  }

  void _calculateBMI() {
    final weight = double.tryParse(_weightController.text);
    final height = double.tryParse(_heightController.text);

    if (weight == null || height == null || weight <= 0 || height <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter valid weight and height'),
          backgroundColor: AppTheme.dangerColor,
        ),
      );
      return;
    }

    final provider = Provider.of<WorkoutProvider>(context, listen: false);
    provider.calculateBMI(weight, height / 100); // Convert cm to meters
    provider.setFitnessLevel(_selectedFitnessLevel);

    setState(() {
      _hasCalculatedBMI = true;
      _showBMICalculator = false;
    });

    // Load recommended plans
    provider.loadRecommendedPlans();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('BMI calculated! Showing recommended workouts'),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.workoutAssistant ?? 'Workout Assistant'),
        elevation: 0,
        actions: [
          if (_hasCalculatedBMI)
            IconButton(
              icon: const Icon(Icons.calculate),
              onPressed: () {
                setState(() => _showBMICalculator = true);
              },
              tooltip: 'Recalculate BMI',
            ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'diet') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const DietPlansScreen(),
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
                value: 'diet',
                child: Row(
                  children: [
                    Icon(Icons.restaurant_menu, color: AppTheme.primaryColor),
                    SizedBox(width: 12),
                    Text('Diet Plans'),
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
        ],
        bottom: _hasCalculatedBMI && !_showBMICalculator
            ? TabBar(
                controller: _tabController,
                labelColor: AppTheme.primaryColor,
                unselectedLabelColor: AppTheme.textLight,
                indicatorColor: AppTheme.primaryColor,
                tabs: const [
                  Tab(text: 'Recommended'),
                  Tab(text: 'All Plans'),
                  Tab(text: 'My Progress'),
                ],
              )
            : null,
      ),
      body: _showBMICalculator
          ? _buildBMICalculator(l10n)
          : TabBarView(
              controller: _tabController,
              children: [
                _buildRecommendedTab(),
                _buildAllPlansTab(),
                _buildProgressTab(),
              ],
            ),
    );
  }

  Widget _buildBMICalculator(AppLocalizations? l10n) {
    return Consumer<WorkoutProvider>(
      builder: (context, provider, child) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.fitness_center,
                      size: 64,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Personalized Workout Plans',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Get customized workouts based on your BMI and fitness level',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white70,
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // BMI Input Card
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Calculate Your BMI',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 20),

                      // Weight Input
                      TextField(
                        controller: _weightController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Weight (kg)',
                          prefixIcon: const Icon(Icons.monitor_weight),
                          hintText: 'e.g., 70',
                          helperText: 'Enter your weight in kilograms',
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Height Input
                      TextField(
                        controller: _heightController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Height (cm)',
                          prefixIcon: const Icon(Icons.height),
                          hintText: 'e.g., 170',
                          helperText: 'Enter your height in centimeters',
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Fitness Level Selection
                      Text(
                        'Fitness Level',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _buildFitnessLevelChip('beginner', 'Beginner', Icons.flag),
                          _buildFitnessLevelChip('intermediate', 'Intermediate', Icons.trending_up),
                          _buildFitnessLevelChip('advanced', 'Advanced', Icons.military_tech),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Calculate Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _calculateBMI,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Calculate & Get Workouts'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Show BMI result if already calculated
              if (provider.userBMI != null) ...[
                const SizedBox(height: 24),
                _buildBMIResultCard(provider),
              ],

              const SizedBox(height: 24),

              // Info Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.accentColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.accentColor.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: AppTheme.accentColor,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'BMI is a measure of body fat based on height and weight. Our AI will recommend the best workout plans for your goals.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFitnessLevelChip(String value, String label, IconData icon) {
    final isSelected = _selectedFitnessLevel == value;

    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
          ),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
      onSelected: (selected) {
        setState(() => _selectedFitnessLevel = value);
      },
      backgroundColor: Colors.white,
      selectedColor: AppTheme.primaryColor.withOpacity(0.1),
      checkmarkColor: AppTheme.primaryColor,
      side: BorderSide(
        color: isSelected ? AppTheme.primaryColor : AppTheme.borderColor,
      ),
    );
  }

  Widget _buildBMIResultCard(WorkoutProvider provider) {
    final bmi = provider.userBMI!;
    final category = provider.userBMICategory!;

    Color categoryColor;
    IconData categoryIcon;
    String categoryMessage;

    switch (category) {
      case 'underweight':
        categoryColor = Colors.blue;
        categoryIcon = Icons.trending_down;
        categoryMessage = 'Focus on strength and muscle building';
        break;
      case 'normal':
        categoryColor = Colors.green;
        categoryIcon = Icons.check_circle;
        categoryMessage = 'Maintain with balanced workouts';
        break;
      case 'overweight':
        categoryColor = Colors.orange;
        categoryIcon = Icons.warning;
        categoryMessage = 'Cardio and strength training recommended';
        break;
      case 'obese':
        categoryColor = Colors.red;
        categoryIcon = Icons.error;
        categoryMessage = 'Start with low-impact exercises';
        break;
      default:
        categoryColor = Colors.grey;
        categoryIcon = Icons.help;
        categoryMessage = 'Calculate your BMI';
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [
              categoryColor.withOpacity(0.1),
              Colors.white,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: categoryColor.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    categoryIcon,
                    color: categoryColor,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your BMI: ${bmi.toStringAsFixed(1)}',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: categoryColor,
                            ),
                      ),
                      Text(
                        category.toUpperCase(),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: categoryColor,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: categoryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.tips_and_updates, color: categoryColor, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      categoryMessage,
                      style: Theme.of(context).textTheme.bodyMedium,
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

  Widget _buildRecommendedTab() {
    return Consumer<WorkoutProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppTheme.dangerColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    provider.error!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadRecommendedPlans(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        if (provider.workoutPlans.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.search_off,
                    size: 64,
                    color: AppTheme.textLight,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No recommended plans found',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Try adjusting your fitness level or check all plans',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadRecommendedPlans(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.workoutPlans.length,
            itemBuilder: (context, index) {
              final plan = provider.workoutPlans[index];
              return _buildWorkoutPlanCard(plan);
            },
          ),
        );
      },
    );
  }

  Widget _buildAllPlansTab() {
    return Consumer<WorkoutProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        // Filter plans based on selected goals
        final filteredPlans = _selectedGoals.isEmpty
            ? provider.workoutPlans
            : provider.workoutPlans.where((plan) {
                return plan.goals.any((goal) => _selectedGoals.contains(goal));
              }).toList();

        return Column(
          children: [
            // Goal Filters
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF2C2C2C)
                    : Colors.grey.shade100,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Filter by Goal',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      if (_selectedGoals.isNotEmpty)
                        TextButton(
                          onPressed: () {
                            setState(() => _selectedGoals.clear());
                          },
                          child: const Text('Clear'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildGoalFilterChip('weight-loss', 'Weight Loss', Icons.trending_down),
                      _buildGoalFilterChip('muscle-gain', 'Muscle Gain', Icons.fitness_center),
                      _buildGoalFilterChip('strength', 'Strength', Icons.sports_mma),
                      _buildGoalFilterChip('endurance', 'Endurance', Icons.directions_run),
                    ],
                  ),
                ],
              ),
            ),

            // Plans List
            Expanded(
              child: filteredPlans.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.search_off,
                              size: 64,
                              color: AppTheme.textLight,
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'No plans found',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 18),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Try adjusting your filters',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => provider.loadWorkoutPlans(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredPlans.length,
                        itemBuilder: (context, index) {
                          final plan = filteredPlans[index];
                          return _buildWorkoutPlanCard(plan);
                        },
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildGoalFilterChip(String value, String label, IconData icon) {
    final isSelected = _selectedGoals.contains(value);

    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
      checkmarkColor: AppTheme.primaryColor,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(
        color: isSelected ? AppTheme.primaryColor : AppTheme.textPrimary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (selected) {
        setState(() {
          if (selected) {
            _selectedGoals.add(value);
          } else {
            _selectedGoals.remove(value);
          }
        });
      },
    );
  }

  Widget _buildWorkoutPlanCard(WorkoutPlan plan) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => WorkoutPlanDetailScreen(plan: plan),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Stack(
                children: [
                  CachedNetworkImage(
                    imageUrl: plan.imageUrl,
                    height: 180,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      height: 180,
                      color: Theme.of(context).brightness == Brightness.dark 
                          ? const Color(0xFF2C2C2C) 
                          : Colors.grey.shade200,
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    errorWidget: (context, url, error) {
                      print('❌ Error loading workout image: $url - $error');
                      return Container(
                        height: 180,
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.fitness_center,
                            size: 64,
                            color: Colors.white,
                          ),
                        ),
                      );
                    },
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _getLevelColor(plan.level),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        plan.level.toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.name,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    plan.description,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),

                  // Stats Row
                  Row(
                    children: [
                      _buildStatChip(
                        Icons.calendar_today,
                        '${plan.durationWeeks} weeks',
                      ),
                      const SizedBox(width: 8),
                      _buildStatChip(
                        Icons.event_available,
                        '${plan.weeklySchedule.length} days/week',
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Goals
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: plan.goals.take(3).map((goal) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.accentColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          goal.replaceAll('-', ' ').toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.secondaryColor,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.primaryColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getLevelColor(String level) {
    switch (level.toLowerCase()) {
      case 'beginner':
        return Colors.green;
      case 'intermediate':
        return Colors.orange;
      case 'advanced':
        return Colors.red;
      default:
        return AppTheme.primaryColor;
    }
  }

  Widget _buildProgressTab() {
    return Consumer<WorkoutProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.userProgress == null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.fitness_center,
                    size: 80,
                    color: AppTheme.textLight,
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'No Active Workout Plan',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Start a workout plan to track your progress',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      _tabController.animateTo(0);
                    },
                    icon: const Icon(Icons.explore),
                    label: const Text('Explore Workout Plans'),
                  ),
                ],
              ),
            ),
          );
        }

        final progress = provider.userProgress!;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Progress Card
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: AppTheme.primaryGradient,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Overall Progress',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: LinearProgressIndicator(
                          value: progress.progress / 100,
                          minHeight: 10,
                          backgroundColor: Colors.white30,
                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${progress.progress.toStringAsFixed(1)}% Complete',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Completed',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                              Text(
                                '${progress.completedCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'Total',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                              Text(
                                '${progress.totalWorkouts}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Recent Workouts
              Text(
                'Recent Workouts',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 12),

              if (progress.completedWorkouts.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Center(
                      child: Text(
                        'No completed workouts yet. Start exercising!',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ),
                )
              else
                ...progress.completedWorkouts.reversed.take(10).map((workout) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.successColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.check_circle,
                          color: AppTheme.successColor,
                        ),
                      ),
                      title: Text(
                        workout.exerciseName ?? 'Exercise',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${workout.setsCompleted} sets × ${workout.repsCompleted} reps' +
                            (workout.caloriesBurned != null
                                ? ' • ${workout.caloriesBurned} cal'
                                : ''),
                      ),
                      trailing: Text(
                        _formatDate(workout.completedDate),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  );
                }).toList(),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.day}/${date.month}/${date.year}';
  }
}
