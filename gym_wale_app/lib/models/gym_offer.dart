import 'package:flutter/material.dart';

/// Represents a gym offer/promotion
class GymOffer {
  final String id;
  final String title;
  final String description;
  final String type; // 'percentage', 'fixed', 'bogo', 'free_trial', 'special'
  final double value;
  final String category; // 'membership', 'training', 'trial', 'equipment', 'all'
  final DateTime startDate;
  final DateTime endDate;
  final int? maxUses;
  final int usageCount;
  final double minAmount;
  final String gymId;
  final String? gymName;
  final String? templateId;
  final List<String> features;
  final String status; // 'active', 'paused', 'expired', 'deleted'
  final bool isActive;
  final double revenue;
  final double conversionRate;
  final String? couponCode;
  final bool displayOnWebsite;
  final bool highlightOffer;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;
  final bool offerNotificationSent;
  final double? discount;
  final bool? isClaimed;
  final String? claimId;

  GymOffer({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.value,
    required this.category,
    required this.startDate,
    required this.endDate,
    this.maxUses,
    this.usageCount = 0,
    this.minAmount = 0,
    required this.gymId,
    this.gymName,
    this.templateId,
    this.features = const [],
    this.status = 'active',
    this.isActive = true,
    this.revenue = 0,
    this.conversionRate = 0,
    this.couponCode,
    this.displayOnWebsite = true,
    this.highlightOffer = false,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.offerNotificationSent = false,
    this.discount,
    this.isClaimed,
    this.claimId,
  });

  factory GymOffer.fromJson(Map<String, dynamic> json) {
    return GymOffer(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      type: json['type']?.toString() ?? 'percentage',
      value: _parseDouble(json['value']),
      category: json['category']?.toString() ?? 'membership',
      startDate: _parseDate(json['startDate']) ?? DateTime.now(),
      endDate: _parseDate(json['endDate']) ?? DateTime.now().add(const Duration(days: 30)),
      maxUses: json['maxUses'] != null ? _parseInt(json['maxUses']) : null,
      usageCount: _parseInt(json['usageCount']),
      minAmount: _parseDouble(json['minAmount']),
      gymId: json['gymId']?.toString() ?? '',
      gymName: json['gymName']?.toString(),
      templateId: json['templateId']?.toString(),
      features: _parseList(json['features']),
      status: json['status']?.toString() ?? 'active',
      isActive: json['isActive'] ?? true,
      revenue: _parseDouble(json['revenue']),
      conversionRate: _parseDouble(json['conversionRate']),
      couponCode: json['couponCode']?.toString(),
      displayOnWebsite: json['displayOnWebsite'] ?? true,
      highlightOffer: json['highlightOffer'] ?? false,
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(json['updatedAt']) ?? DateTime.now(),
      createdBy: json['createdBy']?.toString(),
      offerNotificationSent: json['offerNotificationSent'] ?? false,
      discount: json['discount'] != null ? _parseDouble(json['discount']) : null,
      isClaimed: json['isClaimed'],
      claimId: json['claimId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'title': title,
      'description': description,
      'type': type,
      'value': value,
      'category': category,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'maxUses': maxUses,
      'usageCount': usageCount,
      'minAmount': minAmount,
      'gymId': gymId,
      'gymName': gymName,
      'templateId': templateId,
      'features': features,
      'status': status,
      'isActive': isActive,
      'revenue': revenue,
      'conversionRate': conversionRate,
      'couponCode': couponCode,
      'displayOnWebsite': displayOnWebsite,
      'highlightOffer': highlightOffer,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'createdBy': createdBy,
      'offerNotificationSent': offerNotificationSent,
      'discount': discount,
      'isClaimed': isClaimed,
      'claimId': claimId,
    };
  }

  // Helper methods
  bool get isValid {
    final now = DateTime.now();
    return startDate.isBefore(now) &&
        endDate.isAfter(now) &&
        status == 'active' &&
        (maxUses == null || usageCount < maxUses!);
  }

  bool get isExpired => DateTime.now().isAfter(endDate);

  String get discountText {
    switch (type) {
      case 'percentage':
        return '${value.toInt()}% OFF';
      case 'fixed':
        return '₹${value.toInt()} OFF';
      case 'bogo':
        return 'BOGO';
      case 'free_trial':
        return 'FREE TRIAL';
      case 'special':
        return 'SPECIAL OFFER';
      default:
        return 'OFFER';
    }
  }

  String get categoryDisplay {
    switch (category) {
      case 'membership':
        return 'Membership';
      case 'training':
        return 'Training';
      case 'trial':
        return 'Trial';
      case 'equipment':
        return 'Equipment';
      case 'all':
        return 'All Services';
      default:
        return category;
    }
  }

  IconData get categoryIcon {
    switch (category) {
      case 'membership':
        return Icons.card_membership;
      case 'training':
        return Icons.fitness_center;
      case 'trial':
        return Icons.event_available;
      case 'equipment':
        return Icons.sports_gymnastics;
      case 'all':
        return Icons.stars;
      default:
        return Icons.local_offer;
    }
  }

  Color get statusColor {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'paused':
        return Colors.orange;
      case 'expired':
        return Colors.red;
      case 'deleted':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String get remainingDays {
    if (isExpired) return 'Expired';
    final diff = endDate.difference(DateTime.now()).inDays;
    if (diff == 0) return 'Last day!';
    if (diff == 1) return '1 day left';
    return '$diff days left';
  }

  String get usageStatus {
    if (maxUses == null) return '$usageCount used';
    return '$usageCount / $maxUses used';
  }

  double get usagePercentage {
    if (maxUses == null) return 0;
    return (usageCount / maxUses!) * 100;
  }

  GymOffer copyWith({
    String? id,
    String? title,
    String? description,
    String? type,
    double? value,
    String? category,
    DateTime? startDate,
    DateTime? endDate,
    int? maxUses,
    int? usageCount,
    double? minAmount,
    String? gymId,
    String? gymName,
    String? templateId,
    List<String>? features,
    String? status,
    bool? isActive,
    double? revenue,
    double? conversionRate,
    String? couponCode,
    bool? displayOnWebsite,
    bool? highlightOffer,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
    bool? offerNotificationSent,
    double? discount,
    bool? isClaimed,
    String? claimId,
  }) {
    return GymOffer(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      type: type ?? this.type,
      value: value ?? this.value,
      category: category ?? this.category,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      maxUses: maxUses ?? this.maxUses,
      usageCount: usageCount ?? this.usageCount,
      minAmount: minAmount ?? this.minAmount,
      gymId: gymId ?? this.gymId,
      gymName: gymName ?? this.gymName,
      templateId: templateId ?? this.templateId,
      features: features ?? this.features,
      status: status ?? this.status,
      isActive: isActive ?? this.isActive,
      revenue: revenue ?? this.revenue,
      conversionRate: conversionRate ?? this.conversionRate,
      couponCode: couponCode ?? this.couponCode,
      displayOnWebsite: displayOnWebsite ?? this.displayOnWebsite,
      highlightOffer: highlightOffer ?? this.highlightOffer,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
      offerNotificationSent: offerNotificationSent ?? this.offerNotificationSent,
      discount: discount ?? this.discount,
      isClaimed: isClaimed ?? this.isClaimed,
      claimId: claimId ?? this.claimId,
    );
  }

  // Helper parsing functions
  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  static List<String> _parseList(dynamic value) {
    if (value == null) return [];
    if (value is List) return value.map((e) => e.toString()).toList();
    return [];
  }
}

/// Represents a coupon that can be used to redeem offers
class GymCoupon {
  final String id;
  final String code;
  final String title;
  final String description;
  final String discountType; // 'percentage', 'fixed'
  final double discountValue;
  final double minAmount;
  final double? maxDiscountAmount;
  final int? usageLimit;
  final int usageCount;
  final int userUsageLimit;
  final DateTime expiryDate;
  final String gymId;
  final String? gymName;
  final String? offerId;
  final String? userId;
  final List<String> applicableCategories;
  final bool newUsersOnly;
  final String status; // 'active', 'used', 'expired', 'disabled'
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;

  GymCoupon({
    required this.id,
    required this.code,
    required this.title,
    required this.description,
    required this.discountType,
    required this.discountValue,
    this.minAmount = 0,
    this.maxDiscountAmount,
    this.usageLimit,
    this.usageCount = 0,
    this.userUsageLimit = 1,
    required this.expiryDate,
    required this.gymId,
    this.gymName,
    this.offerId,
    this.userId,
    this.applicableCategories = const ['all'],
    this.newUsersOnly = false,
    this.status = 'active',
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
  });

  factory GymCoupon.fromJson(Map<String, dynamic> json) {
    return GymCoupon(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      discountType: json['discountType']?.toString() ?? 'percentage',
      discountValue: GymOffer._parseDouble(json['discountValue']),
      minAmount: GymOffer._parseDouble(json['minAmount']),
      maxDiscountAmount: json['maxDiscountAmount'] != null 
          ? GymOffer._parseDouble(json['maxDiscountAmount']) 
          : null,
      usageLimit: json['usageLimit'] != null 
          ? GymOffer._parseInt(json['usageLimit']) 
          : null,
      usageCount: GymOffer._parseInt(json['usageCount']),
      userUsageLimit: GymOffer._parseInt(json['userUsageLimit']) == 0 
          ? 1 
          : GymOffer._parseInt(json['userUsageLimit']),
      expiryDate: GymOffer._parseDate(json['expiryDate']) ?? 
          GymOffer._parseDate(json['validUntil']) ?? 
          DateTime.now().add(const Duration(days: 30)),
      gymId: json['gymId']?.toString() ?? '',
      gymName: json['gymName']?.toString(),
      offerId: json['offerId']?.toString(),
      userId: json['userId']?.toString(),
      applicableCategories: GymOffer._parseList(json['applicableCategories']),
      newUsersOnly: json['newUsersOnly'] ?? false,
      status: json['status']?.toString() ?? 'active',
      isActive: json['isActive'] ?? true,
      createdAt: GymOffer._parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: GymOffer._parseDate(json['updatedAt']) ?? DateTime.now(),
      createdBy: json['createdBy']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'code': code,
      'title': title,
      'description': description,
      'discountType': discountType,
      'discountValue': discountValue,
      'minAmount': minAmount,
      'maxDiscountAmount': maxDiscountAmount,
      'usageLimit': usageLimit,
      'usageCount': usageCount,
      'userUsageLimit': userUsageLimit,
      'expiryDate': expiryDate.toIso8601String(),
      'gymId': gymId,
      'gymName': gymName,
      'offerId': offerId,
      'userId': userId,
      'applicableCategories': applicableCategories,
      'newUsersOnly': newUsersOnly,
      'status': status,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'createdBy': createdBy,
    };
  }

  bool get isValid {
    final now = DateTime.now();
    return expiryDate.isAfter(now) &&
        status == 'active' &&
        isActive &&
        (usageLimit == null || usageCount < usageLimit!);
  }

  bool get isExpired => DateTime.now().isAfter(expiryDate);

  String get discountText {
    switch (discountType) {
      case 'percentage':
        return '${discountValue.toInt()}% OFF';
      case 'fixed':
        return '₹${discountValue.toInt()} OFF';
      default:
        return 'DISCOUNT';
    }
  }

  String get remainingDays {
    if (isExpired) return 'Expired';
    final diff = expiryDate.difference(DateTime.now()).inDays;
    if (diff == 0) return 'Expires Today';
    if (diff == 1) return 'Expires Tomorrow';
    return 'Expires in $diff days';
  }

  double calculateDiscount(double amount) {
    if (!isValid || amount < minAmount) return 0;
    
    double discount = 0;
    if (discountType == 'percentage') {
      discount = (amount * discountValue) / 100;
    } else if (discountType == 'fixed') {
      discount = discountValue;
    }

    // Apply max discount cap if exists
    if (maxDiscountAmount != null && discount > maxDiscountAmount!) {
      discount = maxDiscountAmount!;
    }

    return discount;
  }
}

/// Offer statistics for gym admin
class OfferStats {
  final int activeOffers;
  final int activeCoupons;
  final int totalClaims;
  final double revenue;

  OfferStats({
    required this.activeOffers,
    required this.activeCoupons,
    required this.totalClaims,
    required this.revenue,
  });

  factory OfferStats.fromJson(Map<String, dynamic> json) {
    return OfferStats(
      activeOffers: json['activeOffers'] ?? 0,
      activeCoupons: json['activeCoupons'] ?? 0,
      totalClaims: json['totalClaims'] ?? 0,
      revenue: GymOffer._parseDouble(json['revenue']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'activeOffers': activeOffers,
      'activeCoupons': activeCoupons,
      'totalClaims': totalClaims,
      'revenue': revenue,
    };
  }
}
