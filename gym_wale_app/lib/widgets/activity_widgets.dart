import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/activity.dart';

/// Helper method to map FontAwesome icon classes to Flutter Icons
IconData mapFontAwesomeToFlutter(String fontAwesomeIcon) {
  final iconMap = {
    'fa-dumbbell': Icons.fitness_center,
    'fa-running': Icons.directions_run,
    'fa-swimmer': Icons.pool,
    'fa-bicycle': Icons.directions_bike,
    'fa-heart': Icons.favorite,
    'fa-yoga': Icons.self_improvement,
    'fa-weight': Icons.monitor_weight,
    'fa-boxing': Icons.sports_mma,
    'fa-tennis': Icons.sports_tennis,
    'fa-basketball': Icons.sports_basketball,
    'fa-volleyball': Icons.sports_volleyball,
    'fa-football': Icons.sports_football,
    'fa-baseball': Icons.sports_baseball,
    'fa-golf': Icons.golf_course,
    'fa-skating': Icons.downhill_skiing,
    'fa-hiking': Icons.hiking,
    'fa-martial-arts': Icons.sports_martial_arts,
    'fa-gym': Icons.fitness_center,
    'fa-crossfit': Icons.accessibility_new,
    'fa-cardio': Icons.monitor_heart,
    'fa-strength': Icons.sentiment_very_satisfied,
    'fa-aerobics': Icons.accessibility,
    'fa-dance': Icons.music_note,
    'fa-pilates': Icons.self_improvement,
    'fa-meditation': Icons.spa,
    'fa-stretching': Icons.airline_seat_recline_extra,
    'fa-training': Icons.model_training,
    'fa-zumba': Icons.music_note,
    'fa-spinning': Icons.pedal_bike,
    'fa-hiit': Icons.bolt,
  };
  
  return iconMap[fontAwesomeIcon.toLowerCase()] ?? Icons.fitness_center;
}

/// Enhanced Activity Card Widget with description
class ActivityCard extends StatelessWidget {
  final Activity activity;
  final VoidCallback? onTap;

  const ActivityCard({
    Key? key,
    required this.activity,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap ?? () {
        // Show activity details in a bottom sheet
        showModalBottomSheet(
          context: context,
          backgroundColor: Colors.transparent,
          isScrollControlled: true,
          builder: (context) => Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with icon and name
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppTheme.primaryColor.withOpacity(0.2),
                            AppTheme.accentColor.withOpacity(0.2),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        mapFontAwesomeToFlutter(activity.icon),
                        color: AppTheme.primaryColor,
                        size: 32,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        activity.name,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).textTheme.titleLarge?.color,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Description
                Text(
                  activity.description.isNotEmpty
                      ? activity.description
                      : 'Join our ${activity.name} sessions for an amazing workout experience!',
                  style: TextStyle(
                    fontSize: 16,
                    color: Theme.of(context).textTheme.bodyMedium?.color,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 24),
                // Close button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Got it!',
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
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor.withOpacity(0.08),
              AppTheme.primaryColor.withOpacity(0.03),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.primaryColor.withOpacity(0.15),
            width: 1.5,
          ),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Icon container
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.15),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(
                mapFontAwesomeToFlutter(activity.icon),
                color: AppTheme.primaryColor,
                size: 28,
              ),
            ),
            const SizedBox(height: 10),
            // Activity name
            Text(
              activity.name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            // Short description preview
            if (activity.description.isNotEmpty) ...[
              const SizedBox(height: 4),
              Flexible(
                child: Text(
                  activity.description,
                  style: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                    height: 1.3,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Activity selection chip widget for filtering
class ActivityChip extends StatelessWidget {
  final String activityName;
  final String activityIcon;
  final bool isSelected;
  final VoidCallback onTap;

  const ActivityChip({
    Key? key,
    required this.activityName,
    required this.activityIcon,
    required this.isSelected,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryColor : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : Theme.of(context).dividerColor,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              mapFontAwesomeToFlutter(activityIcon),
              size: 20,
              color: isSelected ? Colors.white : AppTheme.primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              activityName,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? Colors.white : Theme.of(context).textTheme.titleMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Activity Grid Widget - displays activities in a grid layout
class ActivityGrid extends StatelessWidget {
  final List<Activity> activities;
  final double childAspectRatio;

  const ActivityGrid({
    Key? key,
    required this.activities,
    this.childAspectRatio = 1.3,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (activities.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.fitness_center_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No activities available',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: activities.length,
      itemBuilder: (context, index) {
        return ActivityCard(activity: activities[index]);
      },
    );
  }
}

/// Activity selection grid widget for filtering
class ActivitySelectionGrid extends StatefulWidget {
  final List<Activity> availableActivities;
  final List<String> selectedActivities;
  final Function(List<String>) onSelectionChanged;

  const ActivitySelectionGrid({
    Key? key,
    required this.availableActivities,
    required this.selectedActivities,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<ActivitySelectionGrid> createState() => _ActivitySelectionGridState();
}

class _ActivitySelectionGridState extends State<ActivitySelectionGrid> {
  late List<String> _selectedActivities;

  @override
  void initState() {
    super.initState();
    _selectedActivities = List.from(widget.selectedActivities);
  }

  void _toggleActivity(String activityName) {
    setState(() {
      if (_selectedActivities.contains(activityName)) {
        _selectedActivities.remove(activityName);
      } else {
        _selectedActivities.add(activityName);
      }
    });
    widget.onSelectionChanged(_selectedActivities);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.fitness_center,
              color: AppTheme.primaryColor,
              size: 24,
            ),
            const SizedBox(width: 8),
            Text(
              'Choose Your Activities',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: widget.availableActivities.map((activity) {
            final isSelected = _selectedActivities.contains(activity.name);
            return ActivityChip(
              activityName: activity.name,
              activityIcon: activity.icon,
              isSelected: isSelected,
              onTap: () => _toggleActivity(activity.name),
            );
          }).toList(),
        ),
        if (_selectedActivities.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.check_circle,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${_selectedActivities.length} ${_selectedActivities.length == 1 ? 'activity' : 'activities'} selected',
                    style: const TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _selectedActivities.clear();
                    });
                    widget.onSelectionChanged(_selectedActivities);
                  },
                  child: const Text('Clear All'),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Price range slider widget
class PriceRangeSlider extends StatefulWidget {
  final double minPrice;
  final double maxPrice;
  final double currentPrice;
  final Function(double) onPriceChanged;

  const PriceRangeSlider({
    Key? key,
    this.minPrice = 500,
    this.maxPrice = 10000,
    required this.currentPrice,
    required this.onPriceChanged,
  }) : super(key: key);

  @override
  State<PriceRangeSlider> createState() => _PriceRangeSliderState();
}

class _PriceRangeSliderState extends State<PriceRangeSlider> {
  late double _currentPrice;

  @override
  void initState() {
    super.initState();
    _currentPrice = widget.currentPrice;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.account_balance_wallet,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Monthly Budget',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: AppTheme.accentGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '₹${_currentPrice.toInt()}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
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
            value: _currentPrice,
            min: widget.minPrice,
            max: widget.maxPrice,
            divisions: ((widget.maxPrice - widget.minPrice) / 500).round(),
            onChanged: (value) {
              setState(() {
                _currentPrice = value;
              });
              widget.onPriceChanged(value);
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '₹${widget.minPrice.toInt()}',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textLight,
              ),
            ),
            Text(
              '₹${widget.maxPrice.toInt()}+',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textLight,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
