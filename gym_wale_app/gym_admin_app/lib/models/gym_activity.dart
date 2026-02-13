/// Model class for Gym Activity
/// Represents an activity offered by the gym with name, icon, and description
class GymActivity {
  final String name;
  final String icon; // FontAwesome icon name (e.g., 'fa-dumbbell')
  final String description;

  GymActivity({
    required this.name,
    required this.icon,
    required this.description,
  });

  factory GymActivity.fromJson(Map<String, dynamic> json) {
    return GymActivity(
      name: json['name'] ?? '',
      icon: json['icon'] ?? 'fa-dumbbell',
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'icon': icon,
      'description': description,
    };
  }

  GymActivity copyWith({
    String? name,
    String? icon,
    String? description,
  }) {
    return GymActivity(
      name: name ?? this.name,
      icon: icon ?? this.icon,
      description: description ?? this.description,
    );
  }
}

/// Predefined list of all possible activities with icons and descriptions
/// Matches the list from gymadmin.js for consistency
class PredefinedActivities {
  static final List<GymActivity> all = [
    GymActivity(
      name: 'Yoga',
      icon: 'fa-person-praying',
      description: 'Improve flexibility, balance, and mindfulness.',
    ),
    GymActivity(
      name: 'Zumba',
      icon: 'fa-music',
      description: 'Fun dance-based cardio workout.',
    ),
    GymActivity(
      name: 'CrossFit',
      icon: 'fa-dumbbell',
      description: 'High-intensity functional training.',
    ),
    GymActivity(
      name: 'Weight Training',
      icon: 'fa-weight-hanging',
      description: 'Strength and muscle building.',
    ),
    GymActivity(
      name: 'Cardio',
      icon: 'fa-heartbeat',
      description: 'Endurance and heart health.',
    ),
    GymActivity(
      name: 'Pilates',
      icon: 'fa-child',
      description: 'Core strength and flexibility.',
    ),
    GymActivity(
      name: 'HIIT',
      icon: 'fa-bolt',
      description: 'High-Intensity Interval Training.',
    ),
    GymActivity(
      name: 'Aerobics',
      icon: 'fa-running',
      description: 'Rhythmic aerobic exercise.',
    ),
    GymActivity(
      name: 'Martial Arts',
      icon: 'fa-hand-fist',
      description: 'Self-defense and discipline.',
    ),
    GymActivity(
      name: 'Spin Class',
      icon: 'fa-bicycle',
      description: 'Indoor cycling workout.',
    ),
    GymActivity(
      name: 'Swimming',
      icon: 'fa-person-swimming',
      description: 'Full-body low-impact exercise.',
    ),
    GymActivity(
      name: 'Boxing',
      icon: 'fa-hand-rock',
      description: 'Cardio and strength with boxing.',
    ),
    GymActivity(
      name: 'Personal Training',
      icon: 'fa-user-tie',
      description: '1-on-1 customized fitness.',
    ),
    GymActivity(
      name: 'Bootcamp',
      icon: 'fa-shoe-prints',
      description: 'Group-based intense training.',
    ),
    GymActivity(
      name: 'Stretching',
      icon: 'fa-arrows-up-down',
      description: 'Mobility and injury prevention.',
    ),
  ];
}
