/// Equipment Model for Gym Admin App
class Equipment {
  final String id;
  final String name;
  final String? brand;
  final String category;
  final String? model;
  final int quantity;
  final EquipmentStatus status;
  final DateTime? purchaseDate;
  final double? price;
  final int? warranty; // in months
  final String? location;
  final String? description;
  final String? specifications;
  final List<String> photos;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Equipment({
    required this.id,
    required this.name,
    this.brand,
    required this.category,
    this.model,
    required this.quantity,
    required this.status,
    this.purchaseDate,
    this.price,
    this.warranty,
    this.location,
    this.description,
    this.specifications,
    required this.photos,
    this.createdAt,
    this.updatedAt,
  });

  factory Equipment.fromJson(Map<String, dynamic> json) {
    // Debug: Print the ID fields to understand what's being parsed
    final customId = json['id'];
    final mongoId = json['_id'];
    print('🔍 Equipment JSON parsing - id: $customId, _id: $mongoId');
    
    final finalId = json['id'] ?? json['_id']?.toString() ?? '';
    print('✅ Final equipment ID selected: $finalId');
    
    return Equipment(
      id: finalId,
      name: json['name'] ?? '',
      brand: json['brand'],
      category: json['category'] ?? 'General',
      model: json['model'],
      quantity: json['quantity'] ?? 1,
      status: _parseStatus(json['status']),
      purchaseDate: json['purchaseDate'] != null 
          ? DateTime.tryParse(json['purchaseDate']) 
          : null,
      price: json['price'] != null ? (json['price'] as num).toDouble() : null,
      warranty: json['warranty'],
      location: json['location'],
      description: json['description'],
      specifications: json['specifications'],
      photos: (json['photos'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      createdAt: json['createdAt'] != null 
          ? DateTime.tryParse(json['createdAt']) 
          : null,
      updatedAt: json['updatedAt'] != null 
          ? DateTime.tryParse(json['updatedAt']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'brand': brand,
      'category': category,
      'model': model,
      'quantity': quantity,
      'status': status.value,
      'purchaseDate': purchaseDate?.toIso8601String(),
      'price': price,
      'warranty': warranty,
      'location': location,
      'description': description,
      'specifications': specifications,
    };
  }

  static EquipmentStatus _parseStatus(dynamic status) {
    if (status == null) return EquipmentStatus.available;
    final statusStr = status.toString().toLowerCase();
    if (statusStr.contains('maintenance')) return EquipmentStatus.maintenance;
    if (statusStr.contains('out') || statusStr.contains('order')) {
      return EquipmentStatus.outOfOrder;
    }
    return EquipmentStatus.available;
  }

  Equipment copyWith({
    String? id,
    String? name,
    String? brand,
    String? category,
    String? model,
    int? quantity,
    EquipmentStatus? status,
    DateTime? purchaseDate,
    double? price,
    int? warranty,
    String? location,
    String? description,
    String? specifications,
    List<String>? photos,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Equipment(
      id: id ?? this.id,
      name: name ?? this.name,
      brand: brand ?? this.brand,
      category: category ?? this.category,
      model: model ?? this.model,
      quantity: quantity ?? this.quantity,
      status: status ?? this.status,
      purchaseDate: purchaseDate ?? this.purchaseDate,
      price: price ?? this.price,
      warranty: warranty ?? this.warranty,
      location: location ?? this.location,
      description: description ?? this.description,
      specifications: specifications ?? this.specifications,
      photos: photos ?? this.photos,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Equipment Status Enum
enum EquipmentStatus {
  available('available'),
  maintenance('maintenance'),
  outOfOrder('out-of-order');

  final String value;
  const EquipmentStatus(this.value);

  String get displayName {
    switch (this) {
      case EquipmentStatus.available:
        return 'Available';
      case EquipmentStatus.maintenance:
        return 'Maintenance';
      case EquipmentStatus.outOfOrder:
        return 'Out of Order';
    }
  }
}

/// Equipment Statistics Model
class EquipmentStats {
  final int total;
  final int available;
  final int maintenance;
  final int outOfOrder;
  final double availablePercentage;

  EquipmentStats({
    required this.total,
    required this.available,
    required this.maintenance,
    required this.outOfOrder,
  }) : availablePercentage = total > 0 ? (available / total) * 100 : 0;

  factory EquipmentStats.fromEquipmentList(List<Equipment> equipmentList) {
    final total = equipmentList.length;
    final available = equipmentList
        .where((e) => e.status == EquipmentStatus.available)
        .length;
    final maintenance = equipmentList
        .where((e) => e.status == EquipmentStatus.maintenance)
        .length;
    final outOfOrder = equipmentList
        .where((e) => e.status == EquipmentStatus.outOfOrder)
        .length;

    return EquipmentStats(
      total: total,
      available: available,
      maintenance: maintenance,
      outOfOrder: outOfOrder,
    );
  }
}

/// Equipment Category constants
class EquipmentCategories {
  static const List<String> all = [
    'Cardio',
    'Strength',
    'Functional',
    'Flexibility',
    'Accessories',
    'Other',
  ];
}
