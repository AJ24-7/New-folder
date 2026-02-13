class Coupon {
  final String id;
  final String code;
  final String title;
  final String description;
  final String discountType; // 'percentage' or 'fixed'
  final double discountValue;
  final double minAmount;
  final double? maxDiscountAmount;
  final DateTime expiryDate;
  final bool isActive;

  Coupon({
    required this.id,
    required this.code,
    required this.title,
    required this.description,
    required this.discountType,
    required this.discountValue,
    required this.minAmount,
    this.maxDiscountAmount,
    required this.expiryDate,
    this.isActive = true,
  });

  factory Coupon.fromJson(Map<String, dynamic> json) {
    return Coupon(
      id: json['_id'] ?? json['id'] ?? '',
      code: json['code'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      discountType: json['discountType'] ?? 'percentage',
      discountValue: (json['discountValue'] ?? 0.0).toDouble(),
      minAmount: (json['minAmount'] ?? 0.0).toDouble(),
      maxDiscountAmount: json['maxDiscountAmount'] != null 
          ? (json['maxDiscountAmount'] as num).toDouble() 
          : null,
      expiryDate: DateTime.parse(json['expiryDate'] ?? DateTime.now().toIso8601String()),
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'title': title,
      'description': description,
      'discountType': discountType,
      'discountValue': discountValue,
      'minAmount': minAmount,
      'maxDiscountAmount': maxDiscountAmount,
      'expiryDate': expiryDate.toIso8601String(),
      'isActive': isActive,
    };
  }

  bool get isExpired => DateTime.now().isAfter(expiryDate);
  
  double calculateDiscount(double amount) {
    if (amount < minAmount) {
      return 0.0;
    }
    
    if (discountType == 'percentage') {
      double discount = (amount * discountValue / 100);
      if (maxDiscountAmount != null && discount > maxDiscountAmount!) {
        return maxDiscountAmount!;
      }
      return discount;
    } else {
      // Fixed discount
      return discountValue;
    }
  }

  String get discountLabel {
    if (discountType == 'percentage') {
      return '${discountValue.toStringAsFixed(0)}% OFF';
    } else {
      return '₹${discountValue.toStringAsFixed(0)} OFF';
    }
  }
}
