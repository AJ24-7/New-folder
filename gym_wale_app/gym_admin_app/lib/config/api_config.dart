/// API Configuration for Gym Admin App
/// Manages base URL and API endpoints
class ApiConfig {
  // Base URL - Change this based on your environment
  // static const String baseUrl = 'http://localhost:5000';
  
  // Production URL
  static const String baseUrl = 'https://gym-wale.onrender.com';
  
  // API Endpoints
  static const String _apiPrefix = '/api';
  
  // Auth Endpoints - Gym Admin routes (not Super Admin)
  static const String login = '$_apiPrefix/gyms/login';
  static const String verify2FA = '$_apiPrefix/gyms/verify-login-2fa';
  static const String resend2FA = '$_apiPrefix/gyms/resend-2fa-code';
  static const String requestPasswordOTP = '$_apiPrefix/gyms/request-password-otp';
  static const String verifyPasswordOTP = '$_apiPrefix/gyms/verify-password-otp';
  static const String refreshToken = '$_apiPrefix/gyms/refresh-token';
  static const String logout = '$_apiPrefix/gyms/logout';
  
  // Dashboard Endpoints - Using gym-specific endpoints
  static const String dashboard = '$_apiPrefix/gyms/dashboard';
  
  // Profile Endpoints (Gym Admin)
  static const String profile = '$_apiPrefix/gyms/profile/me';
  static const String updateProfile = '$_apiPrefix/gyms/profile/me';
  static const String uploadProfilePicture = '$_apiPrefix/gyms/profile/upload-picture';
  static const String changePassword = '$_apiPrefix/gyms/change-password';
  
  // Gym Profile Endpoints (for gym admin managing their own gym)
  static const String gymProfile = '$_apiPrefix/gyms/profile/me';
  static const String updateGymProfile = '$_apiPrefix/gyms/profile/me';
  static const String uploadGymLogo = '$_apiPrefix/gyms/profile/upload-logo';
  static const String changeGymPassword = '$_apiPrefix/gyms/change-password';
  
 
  
  // Member Management Endpoints
  static const String members = '$_apiPrefix/members';
  static String memberById(String id) => '$_apiPrefix/members/$id';
  
  // Trainer Management Endpoints
  static const String trainers = '$_apiPrefix/trainers';
  static String trainerById(String id) => '$_apiPrefix/trainers/$id';
  static String approveTrainer(String id) => '$_apiPrefix/admin/trainers/$id/approve';
  static String rejectTrainer(String id) => '$_apiPrefix/admin/trainers/$id/reject';
  
  // Attendance Endpoints
  static const String attendance = '$_apiPrefix/attendance';
  static const String attendanceStats = '$_apiPrefix/attendance/stats';
  static const String geofenceAttendance = '$_apiPrefix/attendance/geofence';
  static const String geofenceConfig = '$_apiPrefix/geofence/config';
  
  // Payment Endpoints
  static const String payments = '$_apiPrefix/payments';
  static const String cashValidation = '$_apiPrefix/payments/cash-validation';
  static String paymentById(String id) => '$_apiPrefix/payments/$id';
  
  // Membership Endpoints
  static const String memberships = '$_apiPrefix/memberships';
  static String membershipById(String id) => '$_apiPrefix/memberships/$id';
  
  // Equipment Endpoints
  static const String equipment = '$_apiPrefix/equipment';
  static String equipmentById(String id) => '$_apiPrefix/equipment/$id';
  
  // Offers & Coupons Endpoints
  static const String offers = '$_apiPrefix/offers';
  static const String coupons = '$_apiPrefix/coupons';
  static String offerById(String id) => '$_apiPrefix/offers/$id';
  static String couponById(String id) => '$_apiPrefix/coupons/$id';
  
  // Support & Reviews Endpoints
  static const String support = '$_apiPrefix/support';
  static const String reviews = '$_apiPrefix/reviews';
  static String supportTicketById(String id) => '$_apiPrefix/support/$id';
  
  // Notification Endpoints (for Support Tab - Admin Notifications)
  static const String notifications = '$_apiPrefix/notifications';
  static const String notificationsAll = '$_apiPrefix/notifications/all';
  static String notificationById(String id) => '$_apiPrefix/notifications/$id/read';
  
  // Gym Notifications (gym-specific notifications)
  static const String gymNotifications = '$_apiPrefix/gyms/notifications';
  static String markGymNotificationRead(String id) => '$_apiPrefix/gyms/notifications/$id/read';
  
  // Grievances Endpoints
  static const String grievances = '$_apiPrefix/grievances';
  static String grievancesByGym(String gymId) => '$_apiPrefix/support/grievances/gym/$gymId';
  
  // Chat Endpoints (Communications)
  static const String chatConversations = '$_apiPrefix/chat/gym/conversations';
  static String chatMessages(String chatId) => '$_apiPrefix/chat/$chatId/messages';
  static String chatReply(String chatId) => '$_apiPrefix/chat/gym/reply/$chatId';
  static String chatMarkAsRead(String chatId) => '$_apiPrefix/chat/gym/read/$chatId';
  
  // Legacy Communications Endpoints (deprecated - use chat endpoints)
  static const String communications = '$_apiPrefix/communications';
  static String communicationsByGym(String gymId) => '$_apiPrefix/chat/gym/conversations';
  
  // Activity Endpoints
  static const String activities = '$_apiPrefix/gyms/activities';
  static const String markAllNotificationsRead = '$_apiPrefix/gyms/notifications/mark-all-read';
  static const String sendNotification = '$_apiPrefix/gyms/notifications/send';
  
  // Trial Bookings Endpoints
  static const String trialBookings = '$_apiPrefix/trial-bookings';
  static String trialBookingById(String id) => '$_apiPrefix/trial-bookings/$id';
  
  // Settings Endpoints
  static const String settings = '$_apiPrefix/settings';
  static const String securityLogs = '$_apiPrefix/admin/security/logs';
  static const String securityReport = '$_apiPrefix/admin/security/report';
  
  // Helper method to get full URL
  static String getFullUrl(String endpoint) {
    return '$baseUrl$endpoint';
  }
  
  // Timeout durations
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
}
