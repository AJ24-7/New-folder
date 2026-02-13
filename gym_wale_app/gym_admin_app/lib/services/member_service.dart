import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../models/member.dart';
import '../config/api_config.dart';
import 'storage_service.dart';
import 'cloudinary_service.dart';

class MemberService {
  final Dio _dio;
  final StorageService _storage = StorageService();
  final CloudinaryService _cloudinary = CloudinaryService();

  MemberService() : _dio = Dio(BaseOptions(
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

  /// Get all members for the authenticated gym
  Future<List<Member>> getMembers() async {
    try {
      final response = await _dio.get(ApiConfig.members);
      
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['members'] ?? response.data ?? [];
        return data.map((json) => Member.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load members: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching members: $e');
    }
  }

  /// Add a new member with optional profile image
  Future<Member> addMember({
    required String memberName,
    required int age,
    required String gender,
    required String phone,
    required String email,
    required String paymentMode,
    required double paymentAmount,
    required String planSelected,
    required String monthlyPlan,
    required String activityPreference,
    String? address,
    XFile? profileImage,
  }) async {
    try {
      String? imageUrl;
      
      // Upload image to Cloudinary if provided
      if (profileImage != null) {
        imageUrl = await _cloudinary.uploadImageFromXFile(
          profileImage,
          folder: 'gym_wale/members',
        );
      }
      
      final data = {
        'memberName': memberName,
        'age': age,
        'gender': gender,
        'phone': phone,
        'email': email,
        'paymentMode': paymentMode,
        'paymentAmount': paymentAmount,
        'planSelected': planSelected,
        'monthlyPlan': monthlyPlan,
        'activityPreference': activityPreference,
        if (address != null) 'address': address,
        if (imageUrl != null) 'profileImage': imageUrl,
      };
      
      final response = await _dio.post(
        ApiConfig.members,
        data: data,
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return Member.fromJson(response.data['member'] ?? response.data);
      } else {
        throw Exception(response.data['message'] ?? 'Failed to add member');
      }
    } catch (e) {
      throw Exception('Error adding member: $e');
    }
  }

  /// Update an existing member
  Future<Member> updateMember({
    required String memberId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final response = await _dio.put(
        ApiConfig.memberById(memberId),
        data: updates,
      );
      
      if (response.statusCode == 200) {
        return Member.fromJson(response.data['member'] ?? response.data);
      } else {
        throw Exception(response.data['message'] ?? 'Failed to update member');
      }
    } catch (e) {
      throw Exception('Error updating member: $e');
    }
  }

  /// Renew membership for an existing member
  Future<Map<String, dynamic>> renewMembership({
    required String memberId,
    required String planSelected,
    required String monthlyPlan,
    required double paymentAmount,
    required String paymentMode,
    required String activityPreference,
    bool is7DayAllowance = false,
  }) async {
    try {
      final response = await _dio.put(
        '${ApiConfig.members}/renew/$memberId',
        data: {
          'planSelected': planSelected,
          'monthlyPlan': monthlyPlan,
          'paymentAmount': paymentAmount,
          'paymentMode': paymentMode,
          'activityPreference': activityPreference,
          'is7DayAllowance': is7DayAllowance,
        },
      );
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'message': response.data['message'] ?? 'Membership renewed successfully',
          'newExpiryDate': response.data['newExpiryDate'],
          'member': response.data['member'] != null ? Member.fromJson(response.data['member']) : null,
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to renew membership');
      }
    } catch (e) {
      throw Exception('Error renewing membership: $e');
    }
  }

  /// Remove members by their membership IDs (bulk delete)
  Future<Map<String, dynamic>> removeMembers(List<String> membershipIds) async {
    try {
      final response = await _dio.delete(
        '${ApiConfig.members}/bulk',
        data: {'membershipIds': membershipIds},
      );
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'message': response.data['message'] ?? 'Members removed successfully',
          'deletedCount': response.data['deletedCount'] ?? 0,
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to remove members');
      }
    } catch (e) {
      throw Exception('Error removing members: $e');
    }
  }

  /// Remove all expired members (membership expired > 7 days ago)
  Future<Map<String, dynamic>> removeExpiredMembers() async {
    try {
      final response = await _dio.delete('${ApiConfig.members}/expired');
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'message': response.data['message'] ?? 'Expired members removed successfully',
          'deletedCount': response.data['deletedCount'] ?? 0,
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to remove expired members');
      }
    } catch (e) {
      throw Exception('Error removing expired members: $e');
    }
  }

  /// Get members with pending payments
  Future<List<Member>> getMembersWithPendingPayments() async {
    try {
      final allMembers = await getMembers();
      return allMembers.where((member) => member.paymentStatus == 'pending').toList();
    } catch (e) {
      throw Exception('Error fetching pending payments: $e');
    }
  }

  /// Get expiring members (expiring within specified days)
  Future<List<Member>> getExpiringMembers({int days = 7}) async {
    try {
      final allMembers = await getMembers();
      final now = DateTime.now();
      return allMembers.where((member) {
        if (member.membershipValidUntil == null) return false;
        final daysUntilExpiry = member.membershipValidUntil!.difference(now).inDays;
        return daysUntilExpiry > 0 && daysUntilExpiry <= days;
      }).toList();
    } catch (e) {
      throw Exception('Error fetching expiring members: $e');
    }
  }

  /// Grant 7-day payment allowance to a member
  Future<Map<String, dynamic>> grantSevenDayAllowance({
    required String memberId,
    required double pendingAmount,
  }) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.members}/$memberId/grant-allowance',
        data: {
          'pendingAmount': pendingAmount,
        },
      );
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'message': response.data['message'] ?? '7-day allowance granted',
          'allowanceExpiryDate': response.data['allowanceExpiryDate'],
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to grant allowance');
      }
    } catch (e) {
      throw Exception('Error granting allowance: $e');
    }
  }

  /// Mark pending payment as paid
  Future<Map<String, dynamic>> markPaymentAsPaid({
    required String memberId,
    required String paymentMode,
  }) async {
    try {
      final response = await _dio.post(
        '${ApiConfig.members}/$memberId/mark-paid',
        data: {
          'paymentMode': paymentMode,
        },
      );
      
      if (response.statusCode == 200) {
        return {
          'success': response.data['success'] ?? true,
          'message': response.data['message'] ?? 'Payment marked as paid',
          'member': response.data['member'] != null ? Member.fromJson(response.data['member']) : null,
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to mark payment as paid');
      }
    } catch (e) {
      throw Exception('Error marking payment as paid: $e');
    }
  }

  /// Search members by name, email, phone, or membership ID
  Future<List<Member>> searchMembers(String query) async {
    try {
      final allMembers = await getMembers();
      final lowerQuery = query.toLowerCase();
      
      return allMembers.where((member) {
        return member.memberName.toLowerCase().contains(lowerQuery) ||
               member.email.toLowerCase().contains(lowerQuery) ||
               member.phone.contains(query) ||
               (member.membershipId?.toLowerCase().contains(lowerQuery) ?? false);
      }).toList();
    } catch (e) {
      throw Exception('Error searching members: $e');
    }
  }

  /// Filter members by expiry status
  List<Member> filterMembersByExpiry(List<Member> members, String filter) {
    final now = DateTime.now();
    
    switch (filter) {
      case '1day':
        return members.where((member) {
          if (member.membershipValidUntil == null) return false;
          final daysUntilExpiry = member.membershipValidUntil!.difference(now).inDays;
          return daysUntilExpiry == 1;
        }).toList();
      case '3days':
        return members.where((member) {
          if (member.membershipValidUntil == null) return false;
          final daysUntilExpiry = member.membershipValidUntil!.difference(now).inDays;
          return daysUntilExpiry > 0 && daysUntilExpiry <= 3;
        }).toList();
      default:
        return members;
    }
  }

  /// Export members data (could be CSV, Excel, etc.)
  Future<void> exportMembers() async {
    // TODO: Implement export functionality
    throw UnimplementedError('Export functionality not implemented yet');
  }
}
