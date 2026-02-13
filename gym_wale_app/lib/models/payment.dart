class Payment {
  final String id;
  final String userId;
  final String bookingId;
  final String? orderId;
  final String? transactionId;
  final double amount;
  final String currency;
  final String status; // 'pending', 'completed', 'failed', 'refunded'
  final String paymentMethod; // 'card', 'upi', 'netbanking', 'wallet'
  final String? paymentGateway;
  final DateTime createdAt;
  final DateTime? completedAt;

  Payment({
    required this.id,
    required this.userId,
    required this.bookingId,
    this.orderId,
    this.transactionId,
    required this.amount,
    this.currency = 'INR',
    required this.status,
    required this.paymentMethod,
    this.paymentGateway,
    required this.createdAt,
    this.completedAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['_id'] ?? json['id'] ?? '',
      userId: json['userId'] ?? json['user'] ?? '',
      bookingId: json['bookingId'] ?? json['booking'] ?? '',
      orderId: json['orderId'],
      transactionId: json['transactionId'],
      amount: (json['amount'] ?? 0.0).toDouble(),
      currency: json['currency'] ?? 'INR',
      status: json['status'] ?? 'pending',
      paymentMethod: json['paymentMethod'] ?? 'card',
      paymentGateway: json['paymentGateway'],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'bookingId': bookingId,
      'orderId': orderId,
      'transactionId': transactionId,
      'amount': amount,
      'currency': currency,
      'status': status,
      'paymentMethod': paymentMethod,
      'paymentGateway': paymentGateway,
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
    };
  }

  bool get isCompleted => status == 'completed';
  bool get isPending => status == 'pending';
  bool get isFailed => status == 'failed';
}
