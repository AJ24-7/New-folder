class Activity {
  final String name;
  final String icon; // FontAwesome class name from backend
  final String description;

  Activity({
    required this.name,
    required this.icon,
    required this.description,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    return Activity(
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
}
