import 'package:flutter_dotenv/flutter_dotenv.dart';
class ApiConfig {
  // Base URL - Update this with your actual backend URL
  // For local development: http://localhost:5000
  // For production: https://your-domain.com
  static String get baseUrl {
    return '${dotenv.env['API_BASE_URL']}/api'; }
  
  // ========== Authentication Endpoints ==========
  static const String login = '/users/login';
  static const String register = '/users/signup';
  static const String googleAuth = '/users/google-auth';
  static const String profile = '/users/profile';
  static const String updateProfile = '/users/update-profile';
  static const String changePassword = '/users/change-password';
  static const String requestPasswordReset = '/users/request-password-reset-otp';
  static const String verifyPasswordReset = '/users/verify-password-reset-otp';
  
  // ========== Gym Endpoints ==========
  static const String gyms = '/gyms';
  static String gymById(String id) => '/gyms/$id';
  static const String nearbyGyms = '/gyms/nearby';
  static const String gymsByCities = '/gyms/cities';
  
  // ========== Membership Endpoints ==========
  static const String memberships = '/memberships';
  static String gymMemberships(String gymId) => '/gyms/$gymId/membership-plans';
  
  // ========== Booking Endpoints ==========
  static const String bookings = '/bookings';
  static const String myBookings = '/bookings/my';
  static String bookingById(String id) => '/bookings/$id';
  static String cancelBooking(String id) => '/bookings/$id/cancel';
  
  // ========== Trial Booking Endpoints ==========
  static const String trialBookings = '/trial-bookings';
  static String trialBookingById(String id) => '/trial-bookings/$id';
  
  // ========== Payment Endpoints ==========
  static const String payments = '/payments';
  static const String createPayment = '/payments/create';
  static const String userPayments = '/user-payments';
  static const String verifyPayment = '/payments/verify';
  
  // ========== Review Endpoints ==========
  static const String reviews = '/reviews';
  static String gymReviews(String gymId) => '/reviews/gym/$gymId';
  static const String createReview = '/reviews';
  
  // ========== Favorites Endpoints ==========
  static const String favorites = '/favorites';
  static String addFavorite(String gymId) => '/favorites/$gymId';
  static String removeFavorite(String gymId) => '/favorites/$gymId';
  static String checkFavorite(String gymId) => '/favorites/check/$gymId';
  
  // ========== Diet Plan Endpoints ==========
  static const String dietPlans = '/diets';
  static String dietPlanById(String id) => '/diets/$id';
  
  // ========== Workout Schedule Endpoints ==========
  static const String workoutSchedule = '/users/workout-schedule';
  
  // ========== Coupon Endpoints ==========
  static String userCoupons(String userId) => '/users/$userId/coupons';
  static String saveCoupon(String userId) => '/users/$userId/coupons';
  static String checkCoupon(String userId, String couponId) => 
      '/users/$userId/coupons/$couponId/check';
  
  // ========== Notification Endpoints ==========
  static const String notifications = '/notifications';
  static const String gymNotifications = '/gym-notifications';
  
  // ========== Support Endpoints ==========
  static const String support = '/support';
  static const String supportTickets = '/support/tickets';
  static const String mySupportTickets = '/support/tickets/my';
  static String supportTicketById(String ticketId) => '/support/tickets/$ticketId';
  static String replyToTicket(String ticketId) => '/support/tickets/$ticketId/reply-user';
  
  // ========== Attendance Endpoints ==========
  static const String attendance = '/attendance';
  static const String markAttendance = '/attendance/mark';
  
  // ========== Communication Endpoints ==========
  static const String communication = '/communication';
  static const String gymCommunication = '/gym-communication';
  
  // ========== Configuration ==========
  static const Duration timeout = Duration(seconds: 30);
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // ========== Headers ==========
  static Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  static Map<String, String> headersWithAuth(String token) => {
    ...headers,
    'Authorization': 'Bearer $token',
  };
}
