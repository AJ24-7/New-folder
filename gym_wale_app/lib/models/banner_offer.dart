import 'package:flutter/material.dart';

class BannerOffer {
  final String id;
  final String title;
  final String description;
  final String? imageUrl;
  final String type; // 'admin', 'gym', 'diet', 'general', 'feature', 'tip'
  final String? gymId;
  final String? gymName;
  final DateTime? validUntil;
  final String? discountText;
  final String? ctaText;
  final String? ctaLink;
  final IconData? icon;
  final String? route;

  BannerOffer({
    required this.id,
    required this.title,
    required this.description,
    this.imageUrl,
    required this.type,
    this.gymId,
    this.gymName,
    this.validUntil,
    this.discountText,
    this.ctaText,
    this.ctaLink,
    this.icon,
    this.route,
  });

  factory BannerOffer.fromJson(Map<String, dynamic> json) {
    return BannerOffer(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      imageUrl: json['imageUrl']?.toString() ?? json['image']?.toString(),
      type: (json['type'] ?? 'general').toString(),
      gymId: json['gymId']?.toString(),
      gymName: json['gymName']?.toString(),
      validUntil: json['validUntil'] != null || json['endDate'] != null
          ? DateTime.tryParse(
              json['validUntil']?.toString() ?? json['endDate']?.toString() ?? '')
          : null,
      discountText: json['discountText']?.toString() ?? 
                    json['discount']?.toString(),
      ctaText: json['ctaText']?.toString() ?? 'Learn More',
      ctaLink: json['ctaLink']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'imageUrl': imageUrl,
      'type': type,
      'gymId': gymId,
      'gymName': gymName,
      'validUntil': validUntil?.toIso8601String(),
      'discountText': discountText,
      'ctaText': ctaText,
      'ctaLink': ctaLink,
    };
  }

  bool get isValid {
    if (validUntil == null) return true;
    return validUntil!.isAfter(DateTime.now());
  }

  // Static factory methods for app feature banners
  static BannerOffer gymExploration() {
    return BannerOffer(
      id: 'feature_gyms',
      title: 'Explore Gyms',
      description: 'Find the perfect gym near you with advanced filters',
      type: 'feature',
      icon: Icons.fitness_center,
      route: '/gyms',
      ctaText: 'Explore Now',
    );
  }

  static BannerOffer dietPlans() {
    return BannerOffer(
      id: 'feature_diet',
      title: 'Diet Plans',
      description: 'Get personalized diet plans from certified nutritionists',
      type: 'feature',
      icon: Icons.restaurant_menu,
      route: '/diet',
      ctaText: 'View Plans',
    );
  }

  static BannerOffer trainerSearch() {
    return BannerOffer(
      id: 'feature_trainers',
      title: 'Find Trainers',
      description: 'Connect with certified trainers for personalized coaching',
      type: 'feature',
      icon: Icons.person_search,
      route: '/trainers',
      ctaText: 'Search Trainers',
    );
  }

  static BannerOffer bookingTip() {
    return BannerOffer(
      id: 'tip_booking',
      title: 'Quick Booking',
      description: 'Book gym sessions, classes, and trainers in just a few taps',
      type: 'tip',
      icon: Icons.calendar_today,
      ctaText: 'Learn More',
    );
  }

  static BannerOffer favoriteTip() {
    return BannerOffer(
      id: 'tip_favorites',
      title: 'Save Favorites',
      description: 'Bookmark your favorite gyms and trainers for quick access',
      type: 'tip',
      icon: Icons.favorite,
      ctaText: 'Got it',
    );
  }

  static BannerOffer locationTip() {
    return BannerOffer(
      id: 'tip_location',
      title: 'Location Based',
      description: 'Discover gyms and trainers near your current location',
      type: 'tip',
      icon: Icons.location_on,
      ctaText: 'Enable Location',
    );
  }
}
