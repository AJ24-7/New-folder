import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/app_theme.dart';
import '../models/workout_plan.dart';
import '../providers/workout_provider.dart';

class CustomizeWorkoutScreen extends StatefulWidget {
  final WorkoutPlan plan;
  final int dayIndex;

  const CustomizeWorkoutScreen({
    Key? key,
    required this.plan,
    required this.dayIndex,
  }) : super(key: key);

  @override
  State<CustomizeWorkoutScreen> createState() => _CustomizeWorkoutScreenState();
}

class _CustomizeWorkoutScreenState extends State<CustomizeWorkoutScreen> {
  late List<Exercise> _selectedExercises;
  List<Exercise> _availableExercises = [];
  String _selectedMuscleGroup = 'all';
  String _selectedCategory = 'all';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedExercises = List.from(widget.plan.weeklySchedule[widget.dayIndex].exercises);
    _loadAvailableExercises();
  }

  Future<void> _loadAvailableExercises() async {
    setState(() => _isLoading = true);
    
    try {
      final provider = Provider.of<WorkoutProvider>(context, listen: false);
      
      // Get all exercises from all plans
      final allExercises = <Exercise>[];
      for (final plan in provider.workoutPlans) {
        for (final day in plan.weeklySchedule) {
          allExercises.addAll(day.exercises);
        }
      }
      
      // Remove duplicates based on exercise name
      final uniqueExercises = <String, Exercise>{};
      for (final exercise in allExercises) {
        if (!uniqueExercises.containsKey(exercise.name)) {
          uniqueExercises[exercise.name] = exercise;
        }
      }
      
      setState(() {
        _availableExercises = uniqueExercises.values.toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading exercises: $e'),
            backgroundColor: AppTheme.dangerColor,
          ),
        );
      }
    }
  }

  List<Exercise> get filteredExercises {
    return _availableExercises.where((exercise) {
      final muscleMatch = _selectedMuscleGroup == 'all' || 
                          exercise.muscleGroup == _selectedMuscleGroup;
      final categoryMatch = _selectedCategory == 'all' || 
                            exercise.category == _selectedCategory;
      return muscleMatch && categoryMatch;
    }).toList();
  }

  bool _isExerciseSelected(Exercise exercise) {
    return _selectedExercises.any((e) => e.name == exercise.name);
  }

  void _toggleExercise(Exercise exercise) {
    setState(() {
      final index = _selectedExercises.indexWhere((e) => e.name == exercise.name);
      if (index >= 0) {
        _selectedExercises.removeAt(index);
      } else {
        _selectedExercises.add(exercise);
      }
    });
  }

  void _saveCustomPlan() {
    if (_selectedExercises.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one exercise'),
          backgroundColor: AppTheme.dangerColor,
        ),
      );
      return;
    }

    // Update the day's exercises by creating a new WorkoutDay
    final updatedDay = WorkoutDay(
      dayName: widget.plan.weeklySchedule[widget.dayIndex].dayName,
      dayNumber: widget.plan.weeklySchedule[widget.dayIndex].dayNumber,
      focus: widget.plan.weeklySchedule[widget.dayIndex].focus,
      exercises: _selectedExercises,
      estimatedDuration: widget.plan.weeklySchedule[widget.dayIndex].estimatedDuration,
      notes: widget.plan.weeklySchedule[widget.dayIndex].notes,
    );
    
    // Replace the day in the schedule
    widget.plan.weeklySchedule[widget.dayIndex] = updatedDay;
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Workout customized successfully!'),
        backgroundColor: AppTheme.successColor,
      ),
    );
    
    Navigator.pop(context, widget.plan);
  }

  @override
  Widget build(BuildContext context) {
    final day = widget.plan.weeklySchedule[widget.dayIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text('Customize ${day.dayName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saveCustomPlan,
            tooltip: 'Save Changes',
          ),
        ],
      ),
      body: Column(
        children: [
          // Current Selection Summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              border: Border(
                bottom: BorderSide(
                  color: AppTheme.borderColor,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppTheme.primaryColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '${_selectedExercises.length} exercises selected',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                if (_selectedExercises.isNotEmpty)
                  TextButton(
                    onPressed: () {
                      setState(() => _selectedExercises.clear());
                    },
                    child: const Text('Clear All'),
                  ),
              ],
            ),
          ),

          // Filters
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF2C2C2C)
                  : Colors.grey.shade100,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filter Exercises',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                
                // Muscle Group Filter
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('all', 'All', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                      _buildFilterChip('chest', 'Chest', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                      _buildFilterChip('back', 'Back', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                      _buildFilterChip('legs', 'Legs', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                      _buildFilterChip('shoulders', 'Shoulders', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                      _buildFilterChip('arms', 'Arms', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                      _buildFilterChip('core', 'Core', _selectedMuscleGroup, (value) {
                        setState(() => _selectedMuscleGroup = value);
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                
                // Category Filter
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('all', 'All Types', _selectedCategory, (value) {
                        setState(() => _selectedCategory = value);
                      }),
                      _buildFilterChip('strength', 'Strength', _selectedCategory, (value) {
                        setState(() => _selectedCategory = value);
                      }),
                      _buildFilterChip('cardio', 'Cardio', _selectedCategory, (value) {
                        setState(() => _selectedCategory = value);
                      }),
                      _buildFilterChip('warmup', 'Warmup', _selectedCategory, (value) {
                        setState(() => _selectedCategory = value);
                      }),
                      _buildFilterChip('cooldown', 'Cooldown', _selectedCategory, (value) {
                        setState(() => _selectedCategory = value);
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Exercise List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredExercises.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.search_off,
                              size: 64,
                              color: AppTheme.textLight,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No exercises found',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Try adjusting your filters',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredExercises.length,
                        itemBuilder: (context, index) {
                          final exercise = filteredExercises[index];
                          final isSelected = _isExerciseSelected(exercise);
                          
                          return _buildExerciseCard(exercise, isSelected);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    String value,
    String label,
    String selectedValue,
    Function(String) onSelected,
  ) {
    final isSelected = selectedValue == value;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Text(label),
        selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
        checkmarkColor: AppTheme.primaryColor,
        backgroundColor: Colors.white,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.primaryColor : AppTheme.textPrimary,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          fontSize: 12,
        ),
        onSelected: (selected) {
          onSelected(value);
        },
      ),
    );
  }

  Widget _buildExerciseCard(Exercise exercise, bool isSelected) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isSelected ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? AppTheme.primaryColor : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: () => _toggleExercise(exercise),
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Row
            Row(
              children: [
                // Exercise Image
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    bottomLeft: Radius.circular(12),
                  ),
                  child: CachedNetworkImage(
                    imageUrl: exercise.imageUrl.isNotEmpty
                        ? exercise.imageUrl
                        : 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200',
                    width: 120,
                    height: 100,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      width: 120,
                      height: 100,
                      color: Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFF2C2C2C)
                          : Colors.grey.shade200,
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      width: 120,
                      height: 100,
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      child: const Icon(
                        Icons.fitness_center,
                        size: 32,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ),
                
                // Exercise Details
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                exercise.name,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (isSelected)
                              const Icon(
                                Icons.check_circle,
                                color: AppTheme.primaryColor,
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          exercise.description,
                          style: Theme.of(context).textTheme.bodySmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _buildTag(
                              exercise.muscleGroup.replaceAll('-', ' '),
                              AppTheme.primaryColor,
                            ),
                            _buildTag(
                              exercise.category,
                              AppTheme.accentColor,
                            ),
                            if (exercise.equipment != null)
                              _buildTag(
                                exercise.equipment!.replaceAll('-', ' '),
                                AppTheme.secondaryColor,
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
