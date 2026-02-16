import 'package:dio/dio.dart';
import '../models/support_models.dart';
import '../config/api_config.dart';
import 'storage_service.dart';

class SupportService {
  final Dio _dio;
  final StorageService _storage = StorageService();

  SupportService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: ApiConfig.connectTimeout,
    receiveTimeout: ApiConfig.receiveTimeout,
    sendTimeout: ApiConfig.sendTimeout,
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
        options.headers['Content-Type'] = 'application/json';
        return handler.next(options);
      },
    ));
  }

  // ========== NOTIFICATIONS ==========

  /// Get all notifications for the gym
  /// GET /api/notifications/all
  Future<List<SupportNotification>> getNotifications(String gymId) async {
    try {
      print('📡 Fetching support notifications from: ${ApiConfig.notificationsAll}');
      final response = await _dio.get(ApiConfig.notificationsAll);
      final List notifications = response.data['notifications'] ?? response.data ?? [];
      
      // Debug: Print first notification to check date format
      if (notifications.isNotEmpty) {
        print('📅 Support - Sample notification data: ${notifications.first}');
        print('📅 Support - First notification createdAt: ${notifications.first['createdAt']}');
        print('📅 Support - First notification timestamp: ${notifications.first['timestamp']}');
      }
      
      return notifications.map((json) => SupportNotification.fromJson(json)).toList();
    } on DioException catch (e) {
      print('❌ Error fetching support notifications: ${e.message}');
      throw Exception('Failed to load notifications: ${e.message}');
    }
  }

  /// Mark notification as read
  /// PUT /api/notifications/:id/read
  Future<void> markNotificationAsRead(String notificationId) async {
    try {
      await _dio.put(ApiConfig.notificationById(notificationId));
    } on DioException catch (e) {
      print('Error marking notification as read: ${e.message}');
      throw Exception('Failed to mark notification as read');
    }
  }

  /// Send notification reply
  /// POST /api/notifications/:id/reply
  Future<void> replyToNotification(String notificationId, String message) async {
    try {
      await _dio.post('${ApiConfig.notifications}/$notificationId/reply', data: {
        'message': message,
      });
    } on DioException catch (e) {
      print('Error replying to notification: ${e.message}');
      throw Exception('Failed to send reply');
    }
  }

  // ========== REVIEWS ==========

  /// Get all reviews for the gym
  /// GET /api/reviews/gym/:gymId
  Future<List<GymReview>> getReviews(String gymId) async {
    try {
      final response = await _dio.get('${ApiConfig.reviews}/gym/$gymId');
      final List reviews = response.data['reviews'] ?? response.data ?? [];
      return reviews.map((json) => GymReview.fromJson(json)).toList();
    } on DioException catch (e) {
      print('Error fetching reviews: ${e.message}');
      throw Exception('Failed to load reviews: ${e.message}');
    }
  }

  /// Reply to a review
  /// PUT /api/reviews/:id/reply
  Future<void> replyToReview(String reviewId, String reply) async {
    try {
      await _dio.put('${ApiConfig.reviews}/$reviewId/reply', data: {
        'reply': reply,
      });
    } on DioException catch (e) {
      print('Error replying to review: ${e.message}');
      throw Exception('Failed to reply to review');
    }
  }

  /// Toggle feature status of a review
  /// PUT /api/reviews/:id/feature
  Future<void> toggleFeatureReview(String reviewId, bool isFeatured) async {
    try {
      await _dio.put('${ApiConfig.reviews}/$reviewId/feature', data: {
        'isFeatured': isFeatured,
      });
    } on DioException catch (e) {
      print('Error toggling review feature: ${e.message}');
      throw Exception('Failed to update review feature status');
    }
  }

  /// Delete a review
  /// DELETE /api/reviews/:id/gym-delete
  Future<void> deleteReview(String reviewId) async {
    try {
      await _dio.delete('${ApiConfig.reviews}/$reviewId/gym-delete');
    } on DioException catch (e) {
      print('Error deleting review: ${e.message}');
      throw Exception('Failed to delete review');
    }
  }

  // ========== GRIEVANCES ==========

  /// Get all grievances for the gym
  /// GET /api/support/grievances/gym/:gymId
  Future<List<Grievance>> getGrievances(String gymId) async {
    try {
      final response = await _dio.get(ApiConfig.grievancesByGym(gymId));
      final List grievances = response.data['grievances'] ?? response.data ?? [];
      return grievances.map((json) => Grievance.fromJson(json)).toList();
    } on DioException catch (e) {
      print('Error fetching grievances: ${e.message}');
      throw Exception('Failed to load grievances: ${e.message}');
    }
  }

  /// Create a new grievance (raise grievance)
  /// POST /api/grievances
  Future<Grievance> createGrievance({
    required String gymId,
    required String title,
    required String description,
    required String category,
    required String priority,
  }) async {
    try {
      final response = await _dio.post(ApiConfig.grievances, data: {
        'gymId': gymId,
        'title': title,
        'description': description,
        'category': category,
        'priority': priority,
      });
      return Grievance.fromJson(response.data['grievance'] ?? response.data);
    } on DioException catch (e) {
      print('Error creating grievance: ${e.message}');
      throw Exception('Failed to create grievance');
    }
  }

  /// Update grievance status
  /// PUT /api/grievances/:id/status
  Future<void> updateGrievanceStatus(String grievanceId, String status) async {
    try {
      await _dio.put('${ApiConfig.grievances}/$grievanceId/status', data: {
        'status': status,
      });
    } on DioException catch (e) {
      print('Error updating grievance status: ${e.message}');
      throw Exception('Failed to update grievance status');
    }
  }

  /// Add message to grievance
  /// POST /api/grievances/:id/message
  Future<void> addGrievanceMessage(
    String grievanceId,
    String message,
    String senderType,
  ) async {
    try {
      await _dio.post('${ApiConfig.grievances}/$grievanceId/message', data: {
        'message': message,
        'senderType': senderType,
      });
    } on DioException catch (e) {
      print('Error adding grievance message: ${e.message}');
      throw Exception('Failed to add message');
    }
  }

  /// Escalate grievance to main admin
  /// POST /api/grievances/:id/escalate
  Future<void> escalateGrievance(
    String grievanceId,
    String reason,
    String priority,
  ) async {
    try {
      await _dio.post('${ApiConfig.grievances}/$grievanceId/escalate', data: {
        'reason': reason,
        'priority': priority,
      });
    } on DioException catch (e) {
      print('Error escalating grievance: ${e.message}');
      throw Exception('Failed to escalate grievance');
    }
  }

  // ========== COMMUNICATIONS (CHATS) ==========

  /// Get all communications/chats for the gym
  /// GET /api/chat/gym/conversations
  Future<List<Communication>> getCommunications(String gymId) async {
    try {
      final response = await _dio.get(ApiConfig.chatConversations);
      final List conversations = response.data['conversations'] ?? response.data['communications'] ?? response.data['tickets'] ?? response.data ?? [];
      return conversations
          .map((json) => Communication.fromJson(json))
          .toList();
    } on DioException catch (e) {
      print('Error fetching communications: ${e.message}');
      print('Error response: ${e.response?.data}');
      throw Exception('Failed to load communications: ${e.message}');
    }
  }

  /// Get messages for a specific communication/chat
  /// GET /api/chat/:chatId/messages
  Future<List<ChatMessage>> getChatMessages(String communicationId) async {
    try {
      final response = await _dio.get(ApiConfig.chatMessages(communicationId));
      final List messages = response.data['messages'] ?? response.data ?? [];
      return messages.map((json) => ChatMessage.fromJson(json)).toList();
    } on DioException catch (e) {
      print('Error fetching chat messages: ${e.message}');
      print('Error response: ${e.response?.data}');
      throw Exception('Failed to load messages: ${e.message}');
    }
  }

  /// Send a chat message
  /// POST /api/chat/gym/reply/:chatId
  Future<void> sendChatMessage(String communicationId, String message) async {
    try {
      await _dio.post(ApiConfig.chatReply(communicationId), data: {
        'message': message,
      });
    } on DioException catch (e) {
      print('Error sending chat message: ${e.message}');
      throw Exception('Failed to send message');
    }
  }

  /// Mark chat messages as read
  /// PUT /api/chat/read/:chatId
  Future<void> markChatAsRead(String communicationId) async {
    try {
      await _dio.put(ApiConfig.chatMarkAsRead(communicationId));
    } on DioException catch (e) {
      print('Error marking chat as read: ${e.message}');
      throw Exception('Failed to mark as read');
    }
  }

  // ========== SEND NOTIFICATION (Gym Admin to Users) ==========

  /// Send notification to members
  /// POST /api/gym-notifications/send
  Future<void> sendNotificationToMembers({
    required String gymId,
    required String title,
    required String message,
    required List<String> channels, // ['app', 'email', 'sms']
    String? scheduleTime,
  }) async {
    try {
      await _dio.post('/api/gym-notifications/send', data: {
        'gymId': gymId,
        'title': title,
        'message': message,
        'channels': channels,
        if (scheduleTime != null) 'scheduleTime': scheduleTime,
      });
    } on DioException catch (e) {
      print('Error sending notification: ${e.message}');
      throw Exception('Failed to send notification');
    }
  }

  // ========== STATS ==========

  /// Calculate and return support statistics
  Future<SupportStats> calculateStats({
    required List<SupportNotification> notifications,
    required List<GymReview> reviews,
    required List<Grievance> grievances,
    required List<Communication> communications,
  }) async {
    // Notifications stats
    final unreadNotifications = notifications.where((n) => !n.read).length;
    final systemNotifications = notifications.where((n) => n.type == 'system').length;
    final priorityNotifications = notifications
        .where((n) => n.priority == 'high' || n.priority == 'urgent')
        .length;

    // Reviews stats
    final averageRating = reviews.isNotEmpty
        ? reviews.map((r) => r.rating).reduce((a, b) => a + b) / reviews.length
        : 0.0;
    final pendingReviews = reviews.where((r) => r.adminReply == null).length;
    final weekAgo = DateTime.now().subtract(const Duration(days: 7));
    final recentReviews = reviews.where((r) => r.createdAt.isAfter(weekAgo)).length;

    // Grievances stats
    final openGrievances = grievances
        .where((g) => g.status == 'open' || g.status == 'in-progress')
        .length;
    final resolvedGrievances = grievances.where((g) => g.status == 'resolved').length;
    final urgentGrievances = grievances.where((g) => g.priority == 'urgent').length;

    // Communications stats
    final unreadChats = communications.where((c) => c.unreadCount > 0).length;
    final repliedChats = communications.where((c) => c.repliedCount > 0).length;
    final activeChats = communications.where((c) => c.status == 'active').length;

    return SupportStats(
      notifications: NotificationStats(
        total: notifications.length,
        unread: unreadNotifications,
        system: systemNotifications,
        priority: priorityNotifications,
      ),
      reviews: ReviewStats(
        total: reviews.length,
        average: averageRating,
        pending: pendingReviews,
        recent: recentReviews,
      ),
      grievances: GrievanceStats(
        total: grievances.length,
        open: openGrievances,
        resolved: resolvedGrievances,
        urgent: urgentGrievances,
      ),
      communications: CommunicationStats(
        total: communications.length,
        unread: unreadChats,
        replied: repliedChats,
        active: activeChats,
        responseTime: 2, // Mock average response time in hours
      ),
    );
  }

  // ========== MEMBER PROBLEM REPORTS ==========

  /// Get all problem reports for the gym
  /// GET /api/member-problems/gym/all
  Future<List<Map<String, dynamic>>> getMemberProblemReports({
    String? status,
    String? category,
    String? priority,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (category != null) queryParams['category'] = category;
      if (priority != null) queryParams['priority'] = priority;

      final response = await _dio.get(
        '/api/member-problems/gym/all',
        queryParameters: queryParams,
      );
      
      if (response.data['success'] == true) {
        return List<Map<String, dynamic>>.from(response.data['reports'] ?? []);
      }
      return [];
    } on DioException catch (e) {
      print('Error fetching member problem reports: ${e.message}');
      throw Exception('Failed to load problem reports: ${e.message}');
    }
  }

  /// Respond to a member problem report
  /// POST /api/member-problems/:reportId/respond
  Future<void> respondToMemberProblem(String reportId, String message, {String? status}) async {
    try {
      await _dio.post('/api/member-problems/$reportId/respond', data: {
        'message': message,
        if (status != null) 'status': status,
      });
    } on DioException catch (e) {
      print('Error responding to problem report: ${e.message}');
      throw Exception('Failed to send response: ${e.message}');
    }
  }

  /// Update problem report status
  /// PATCH /api/member-problems/:reportId/status
  Future<void> updateProblemReportStatus(String reportId, String status, {String? resolutionNotes}) async {
    try {
      await _dio.patch('/api/member-problems/$reportId/status', data: {
        'status': status,
        if (resolutionNotes != null) 'resolutionNotes': resolutionNotes,
      });
    } on DioException catch (e) {
      print('Error updating problem report status: ${e.message}');
      throw Exception('Failed to update status: ${e.message}');
    }
  }
}
