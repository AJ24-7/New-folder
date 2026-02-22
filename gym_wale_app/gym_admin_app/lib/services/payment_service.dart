import 'package:dio/dio.dart';
import '../models/payment.dart';
import '../config/api_config.dart';
import 'storage_service.dart';

/// Payment Service for managing gym payments
class PaymentService {
  final Dio _dio;
  final StorageService _storage = StorageService();

  PaymentService()
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConfig.baseUrl,
          connectTimeout: ApiConfig.connectTimeout,
          receiveTimeout: ApiConfig.receiveTimeout,
          sendTimeout: ApiConfig.sendTimeout,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        )) {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  /// Get payment statistics
  Future<PaymentStats> getPaymentStats() async {
    try {
      final response = await _dio.get('/api/payments/stats');
      
      if (response.statusCode == 200) {
        // Backend returns {success: true, data: {...}}
        final data = response.data['data'] ?? response.data;
        return PaymentStats.fromJson(data);
      } else {
        throw Exception('Failed to load payment statistics: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Payment statistics endpoint not found. Please check your connection.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Get payment chart data for a specific month/year
  Future<PaymentChartData> getPaymentChartData({
    required int month,
    required int year,
  }) async {
    try {
      final response = await _dio.get(
        '/api/payments/chart-data',
        queryParameters: {
          'month': month - 1, // Backend expects 0-indexed month
          'year': year,
        },
      );
      
      if (response.statusCode == 200) {
        // Backend returns {success: true, data: {...}}
        final data = response.data['data'] ?? response.data;
        return PaymentChartData.fromJson(data);
      } else {
        throw Exception('Failed to load chart data: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Chart data endpoint not found. Please check your connection.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Get recent payments with optional filters
  Future<List<Payment>> getRecentPayments({
    int limit = 10,
    String? type,
    String? status,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit,
      };
      
      if (type != null) queryParams['type'] = type;
      if (status != null) queryParams['status'] = status;

      final response = await _dio.get(
        '/api/payments/recent',
        queryParameters: queryParams,
      );
      
      if (response.statusCode == 200) {
        final data = response.data['data'] ?? response.data;
        if (data is List) {
          return data.map((json) => Payment.fromJson(json)).toList();
        }
        return [];
      } else {
        throw Exception('Failed to load recent payments: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Recent payments endpoint not found. Please check your connection.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Get recurring payments (dues)
  Future<List<Payment>> getRecurringPayments({
    String filter = 'all', // 'all', 'monthly-recurring', 'pending', 'overdue', 'completed'
  }) async {
    try {
      final response = await _dio.get(
        '/api/payments/recurring',
        queryParameters: {
          'filter': filter,
        },
      );
      
      if (response.statusCode == 200) {
        final data = response.data['data'] ?? response.data;
        if (data is List) {
          return data.map((json) => Payment.fromJson(json)).toList();
        }
        return [];
      } else {
        throw Exception('Failed to load recurring payments: ${response.statusMessage}');
      }
    } on DioException catch (e) {      if (e.response?.statusCode == 404) {
        throw Exception('Recurring payments endpoint not found. Please check your connection.');
      }      throw Exception('Network error: ${e.message}');
    }
  }

  /// Get pending payments (uses recurring endpoint with pending filter)
  Future<List<Payment>> getPendingPayments() async {
    try {
      final response = await _dio.get(
        '/api/payments/recurring',
        queryParameters: {
          'filter': 'pending',
        },
      );
      
      if (response.statusCode == 200) {
        final data = response.data['data'] ?? response.data;
        if (data is List) {
          return data.map((json) => Payment.fromJson(json)).toList();
        }
        return [];
      } else {
        throw Exception('Failed to load pending payments: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Pending payments endpoint not found. Please contact support.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Get payment reminders
  Future<List<Payment>> getPaymentReminders() async {
    try {
      final response = await _dio.get('/api/payments/reminders');
      
      if (response.statusCode == 200) {
        final data = response.data['data'] ?? response.data;
        if (data is List) {
          return data.map((json) => Payment.fromJson(json)).toList();
        }
        return [];
      } else {
        throw Exception('Failed to load payment reminders: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Payment reminders endpoint not found. Please check your connection.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Add a new payment
  Future<Payment> addPayment({
    required String memberName,
    String? memberId,
    required double amount,
    required String type,
    required String method,
    String status = 'completed',
    String? planName,
    int? duration,
    String? description,
    String? category,
    DateTime? dueDate,
    bool isRecurring = false,
    String? recurrenceInterval,
    String? notes,
  }) async {
    try {
      final response = await _dio.post(
        '/api/payments',
        data: {
          'memberName': memberName,
          if (memberId != null) 'memberId': memberId,
          'amount': amount,
          'type': type,
          'method': method,
          'status': status,
          if (planName != null) 'planName': planName,
          if (duration != null) 'duration': duration,
          if (description != null) 'description': description,
          if (category != null) 'category': category,
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
          'isRecurring': isRecurring,
          if (recurrenceInterval != null) 'recurrenceInterval': recurrenceInterval,
          if (notes != null) 'notes': notes,
        },
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Payment.fromJson(response.data['payment'] ?? response.data);
      } else {
        throw Exception('Failed to add payment: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Add payment endpoint not found. Please check your connection.');
      }
      if (e.response?.statusCode == 400) {
        throw Exception('Invalid payment data. Please check all fields.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Update an existing payment
  Future<Payment> updatePayment({
    required String paymentId,
    String? memberName,
    double? amount,
    String? type,
    String? method,
    String? status,
    String? planName,
    int? duration,
    String? description,
    String? category,
    DateTime? dueDate,
    bool? isRecurring,
    String? recurrenceInterval,
    String? notes,
  }) async {
    try {
      final data = <String, dynamic>{};
      
      if (memberName != null) data['memberName'] = memberName;
      if (amount != null) data['amount'] = amount;
      if (type != null) data['type'] = type;
      if (method != null) data['method'] = method;
      if (status != null) data['status'] = status;
      if (planName != null) data['planName'] = planName;
      if (duration != null) data['duration'] = duration;
      if (description != null) data['description'] = description;
      if (category != null) data['category'] = category;
      if (dueDate != null) data['dueDate'] = dueDate.toIso8601String();
      if (isRecurring != null) data['isRecurring'] = isRecurring;
      if (recurrenceInterval != null) data['recurrenceInterval'] = recurrenceInterval;
      if (notes != null) data['notes'] = notes;

      final response = await _dio.put(
        '/api/payments/$paymentId',
        data: data,
      );
      
      if (response.statusCode == 200) {
        return Payment.fromJson(response.data['payment'] ?? response.data);
      } else {
        throw Exception('Failed to update payment: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Payment not found. The payment may have been deleted or the ID is invalid.');
      }
      if (e.response?.statusCode == 400) {
        throw Exception('Invalid payment data. Please check all fields.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Mark payment as paid
  Future<Payment> markPaymentAsPaid({
    required String paymentId,
    DateTime? paidDate,
  }) async {
    try {
      final response = await _dio.patch(
        '/api/payments/$paymentId/mark-paid',
        data: {
          if (paidDate != null) 'paidDate': paidDate.toIso8601String(),
        },
      );
      
      if (response.statusCode == 200) {
        return Payment.fromJson(response.data['payment'] ?? response.data);
      } else {
        throw Exception('Failed to mark payment as paid: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Payment not found. The payment may have been deleted or the ID is invalid.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Delete a payment
  Future<void> deletePayment(String paymentId) async {
    try {
      final response = await _dio.delete('/api/payments/$paymentId');
      
      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete payment: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Payment not found. The payment may have been already deleted.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Get pending cash validations
  Future<List<Map<String, dynamic>>> getPendingCashValidations() async {
    try {
      final response = await _dio.get('/api/payments/pending-validations');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['validations'] ?? response.data;
        return List<Map<String, dynamic>>.from(data);
      } else {
        throw Exception('Failed to load pending validations: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Pending validations endpoint not found. Please check your connection.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Confirm cash payment validation
  Future<void> confirmCashValidation(String validationCode) async {
    try {
      final response = await _dio.post(
        '/api/payments/confirm-cash-validation/$validationCode',
      );
      
      if (response.statusCode != 200) {
        throw Exception('Failed to confirm cash validation: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Cash validation not found or already processed.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }

  /// Reject cash payment validation
  Future<void> rejectCashValidation(String validationCode, String reason) async {
    try {
      final response = await _dio.post(
        '/api/payments/reject-cash-validation/$validationCode',
        data: {'reason': reason},
      );
      
      if (response.statusCode != 200) {
        throw Exception('Failed to reject cash validation: ${response.statusMessage}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Cash validation not found or already processed.');
      }
      throw Exception('Network error: ${e.message}');
    }
  }
}
