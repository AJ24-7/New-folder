class MonthlyOption {
  final int months;
  final double price;
  final int discount;
  final bool isPopular;

  MonthlyOption({
    required this.months,
    required this.price,
    this.discount = 0,
    this.isPopular = false,
  });

  factory MonthlyOption.fromJson(Map<String, dynamic> json) {
    return MonthlyOption(
      months: json['months'] is int ? json['months'] : int.tryParse(json['months']?.toString() ?? '0') ?? 0,
      price: (json['price'] is num ? json['price'] : double.tryParse(json['price']?.toString() ?? '0') ?? 0).toDouble(),
      discount: json['discount'] is int ? json['discount'] : int.tryParse(json['discount']?.toString() ?? '0') ?? 0,
      isPopular: json['isPopular'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'months': months,
      'price': price,
      'discount': discount,
      'isPopular': isPopular,
    };
  }

  double get finalPrice => price * (1 - discount / 100);
  
  String get durationLabel {
    if (months == 1) return '1 Month';
    if (months == 3) return '3 Months';
    if (months == 6) return '6 Months';
    if (months == 12) return '1 Year';
    return '$months Months';
  }
}

/// A single tier in a multi-tier membership plan (e.g., Basic / Standard / Premium).
class PlanTier {
  final String name;
  final String icon;
  final String color;
  final String note;
  final List<String> benefits;
  final List<MonthlyOption> monthlyOptions;

  PlanTier({
    required this.name,
    this.icon = 'fa-star',
    this.color = '#3a86ff',
    this.note = '',
    this.benefits = const [],
    this.monthlyOptions = const [],
  });

  factory PlanTier.fromJson(Map<String, dynamic> json) {
    return PlanTier(
      name: json['name'] ?? 'Plan',
      icon: json['icon'] ?? 'fa-star',
      color: json['color'] ?? '#3a86ff',
      note: json['note'] ?? '',
      benefits: (json['benefits'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      monthlyOptions: (json['monthlyOptions'] as List<dynamic>?)
              ?.map((e) => MonthlyOption.fromJson(e as Map<String, dynamic>))
              .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'icon': icon,
      'color': color,
      'note': note,
      'benefits': benefits,
      'monthlyOptions': monthlyOptions.map((e) => e.toJson()).toList(),
    };
  }
}

class MembershipPlan {
  final String name;
  final List<String> benefits;
  final String note;
  final String icon;
  final String color;
  /// 'single' = one plan name with multiple durations
  /// 'multi'  = Basic / Standard / Premium tiers
  final String planMode;
  final List<MonthlyOption> monthlyOptions;
  /// Used only in multi-tier mode
  final List<PlanTier> tiers;

  MembershipPlan({
    required this.name,
    this.benefits = const [],
    this.note = '',
    this.icon = 'fa-star',
    this.color = '#3a86ff',
    this.planMode = 'single',
    this.monthlyOptions = const [],
    this.tiers = const [],
  });

  factory MembershipPlan.fromJson(Map<String, dynamic> json) {
    return MembershipPlan(
      name: json['name'] ?? 'Standard',
      benefits: (json['benefits'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      note: json['note'] ?? '',
      icon: json['icon'] ?? 'fa-star',
      color: json['color'] ?? '#3a86ff',
      planMode: (json['planMode'] ?? 'single') == 'multi' ? 'multi' : 'single',
      monthlyOptions: (json['monthlyOptions'] as List<dynamic>?)
              ?.map((e) => MonthlyOption.fromJson(e as Map<String, dynamic>))
              .toList() ?? [],
      tiers: (json['tiers'] as List<dynamic>?)
              ?.map((e) => PlanTier.fromJson(e as Map<String, dynamic>))
              .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'benefits': benefits,
      'note': note,
      'icon': icon,
      'color': color,
      'planMode': planMode,
      'monthlyOptions': monthlyOptions.map((o) => o.toJson()).toList(),
      'tiers': tiers.map((t) => t.toJson()).toList(),
    };
  }

  bool get hasOptions =>
      planMode == 'multi' ? tiers.isNotEmpty : monthlyOptions.isNotEmpty;
  bool get isMultiTier => planMode == 'multi';
}
