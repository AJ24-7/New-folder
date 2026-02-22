/// Payment Model for Gym Admin App
class Payment {
  final String? id;
  final String? memberId;
  final String memberName;
  final String? memberEmail;
  final double amount;
  final String type; // 'received', 'paid', 'recurring'
  final String method; // 'cash', 'card', 'upi', 'bank_transfer'
  final String status; // 'completed', 'pending', 'overdue', 'cancelled'
  final String? planName;
  final int? duration;
  final String? description;
  final String? category;
  final DateTime createdAt;
  final DateTime? dueDate;
  final DateTime? paidDate;
  final String? validationCode;
  final String? gymId;
  final bool isRecurring;
  final String? recurrenceInterval; // 'monthly', 'quarterly', 'yearly'
  final DateTime? nextDueDate;
  final String? notes;

  Payment({
    this.id,
    this.memberId,
    required this.memberName,
    this.memberEmail,
    required this.amount,
    required this.type,
    required this.method,
    required this.status,
    this.planName,
    this.duration,
    this.description,
    this.category,
    required this.createdAt,
    this.dueDate,
    this.paidDate,
    this.validationCode,
    this.gymId,
    this.isRecurring = false,
    this.recurrenceInterval,
    this.nextDueDate,
    this.notes,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['_id'] ?? json['id'],
      memberId: json['memberId'],
      memberName: json['memberName'] ?? json['member']?['memberName'] ?? 'Unknown',
      memberEmail: json['memberEmail'] ?? json['member']?['email'],
      amount: (json['amount'] ?? 0).toDouble(),
      type: json['type'] ?? 'received',
      method: json['method'] ?? 'cash',
      status: json['status'] ?? 'pending',
      planName: json['planName'],
      duration: json['duration'],
      description: json['description'],
      category: json['category'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
      paidDate: json['paidDate'] != null ? DateTime.parse(json['paidDate']) : null,
      validationCode: json['validationCode'],
      gymId: json['gymId'] ?? json['gym'],
      isRecurring: json['isRecurring'] ?? false,
      recurrenceInterval: json['recurrenceInterval'],
      nextDueDate: json['nextDueDate'] != null 
          ? DateTime.parse(json['nextDueDate']) 
          : null,
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      if (memberId != null) 'memberId': memberId,
      'memberName': memberName,
      if (memberEmail != null) 'memberEmail': memberEmail,
      'amount': amount,
      'type': type,
      'method': method,
      'status': status,
      if (planName != null) 'planName': planName,
      if (duration != null) 'duration': duration,
      if (description != null) 'description': description,
      if (category != null) 'category': category,
      'createdAt': createdAt.toIso8601String(),
      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
      if (paidDate != null) 'paidDate': paidDate!.toIso8601String(),
      if (validationCode != null) 'validationCode': validationCode,
      if (gymId != null) 'gymId': gymId,
      'isRecurring': isRecurring,
      if (recurrenceInterval != null) 'recurrenceInterval': recurrenceInterval,
      if (nextDueDate != null) 'nextDueDate': nextDueDate!.toIso8601String(),
      if (notes != null) 'notes': notes,
    };
  }

  bool get isPending => status == 'pending';
  bool get isOverdue => status == 'overdue';
  bool get isCompleted => status == 'completed';
  bool get isPaid => type == 'received';
  bool get isExpense => type == 'paid';
}

/// Payment Statistics Model
class PaymentStats {
  final double amountReceived;
  final double amountPaid;
  final double pendingPayments;
  final double duePayments;
  final double profitLoss;
  final double receivedChange;
  final double paidChange;
  final double dueChange;
  final double profitChange;
  final int totalReceived;
  final int totalPaid;
  final int totalPending;
  final int totalDue;

  PaymentStats({
    required this.amountReceived,
    required this.amountPaid,
    required this.pendingPayments,
    required this.duePayments,
    required this.profitLoss,
    this.receivedChange = 0.0,
    this.paidChange = 0.0,
    this.dueChange = 0.0,
    this.profitChange = 0.0,
    this.totalReceived = 0,
    this.totalPaid = 0,
    this.totalPending = 0,
    this.totalDue = 0,
  });

  factory PaymentStats.fromJson(Map<String, dynamic> json) {
    return PaymentStats(
      amountReceived: (json['received'] ?? json['amountReceived'] ?? 0).toDouble(),
      amountPaid: (json['paid'] ?? json['amountPaid'] ?? 0).toDouble(),
      pendingPayments: (json['pending'] ?? json['pendingPayments'] ?? 0).toDouble(),
      duePayments: (json['due'] ?? json['duePayments'] ?? 0).toDouble(),
      profitLoss: (json['profit'] ?? json['profitLoss'] ?? 0).toDouble(),
      receivedChange: (json['receivedGrowth'] ?? json['receivedChange'] ?? 0).toDouble(),
      paidChange: (json['paidGrowth'] ?? json['paidChange'] ?? 0).toDouble(),
      dueChange: (json['dueGrowth'] ?? json['dueChange'] ?? 0).toDouble(),
      profitChange: (json['profitGrowth'] ?? json['profitChange'] ?? 0).toDouble(),
      totalReceived: json['totalReceived'] ?? 0,
      totalPaid: json['totalPaid'] ?? 0,
      totalPending: json['totalPending'] ?? 0,
      totalDue: json['totalDue'] ?? 0,
    );
  }
}

/// Payment Chart Data Model
class PaymentChartData {
  final List<double> received;
  final List<double> paid;
  final List<String> labels;
  final String period;

  PaymentChartData({
    required this.received,
    required this.paid,
    required this.labels,
    required this.period,
  });

  factory PaymentChartData.fromJson(Map<String, dynamic> json) {
    // Backend returns { labels: [...], datasets: [{label, data}, ...] }
    List<double> receivedList = [];
    List<double> paidList = [];
    
    if (json['datasets'] != null && json['datasets'] is List) {
      final datasets = json['datasets'] as List;
      for (var dataset in datasets) {
        final label = dataset['label'] ?? '';
        final data = dataset['data'] ?? [];
        if (label.toLowerCase().contains('received')) {
          receivedList = List<double>.from(
            (data as List).map((e) => (e ?? 0).toDouble()),
          );
        } else if (label.toLowerCase().contains('paid')) {
          paidList = List<double>.from(
            (data as List).map((e) => (e ?? 0).toDouble()),
          );
        }
      }
    } else if (json['received'] != null && json['paid'] != null) {
      // Fallback for direct format
      receivedList = List<double>.from(
        (json['received'] ?? []).map((e) => (e ?? 0).toDouble()),
      );
      paidList = List<double>.from(
        (json['paid'] ?? []).map((e) => (e ?? 0).toDouble()),
      );
    }
    
    return PaymentChartData(
      received: receivedList,
      paid: paidList,
      labels: List<String>.from((json['labels'] ?? []).map((e) => e.toString())),
      period: json['period'] ?? '',
    );
  }
}
