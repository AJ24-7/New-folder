import 'package:share_plus/share_plus.dart';
import 'package:flutter/services.dart';

class ShareService {
  // Base URL for deep links (update with your actual domain)
  static const String baseUrl = 'https://gym-wale.app';
  static const String webUrl = 'https://gym-wale.web.app'; // or your web domain
  
  /// Share gym details with deep link
  static Future<void> shareGym({
    required String gymId,
    required String gymName,
    String? description,
    String? imageUrl,
  }) async {
    try {
      // Create deep link
      final deepLink = '$baseUrl/gym/$gymId';
      final webLink = '$webUrl/gym/$gymId';
      
      // Create share text
      final shareText = '''
🏋️ Check out $gymName on Gym-Wale!

${description ?? 'Find the perfect gym for your fitness journey.'}

Open in app: $deepLink
View online: $webLink

Download Gym-Wale app for the best experience! 📱
      '''.trim();

      // Share with image if available
      if (imageUrl != null && imageUrl.isNotEmpty) {
        await Share.share(
          shareText,
          subject: 'Check out $gymName on Gym-Wale',
        );
      } else {
        await Share.share(
          shareText,
          subject: 'Check out $gymName on Gym-Wale',
        );
      }
    } catch (e) {
      print('Error sharing gym: $e');
      rethrow;
    }
  }

  /// Copy gym link to clipboard
  static Future<bool> copyGymLink({
    required String gymId,
    required String gymName,
  }) async {
    try {
      final deepLink = '$baseUrl/gym/$gymId';
      await Clipboard.setData(ClipboardData(text: deepLink));
      return true;
    } catch (e) {
      print('Error copying link: $e');
      return false;
    }
  }

  /// Generate QR code data for gym
  static String getGymQRData({
    required String gymId,
    required String gymName,
  }) {
    return '$baseUrl/gym/$gymId';
  }

  /// Share offer
  static Future<void> shareOffer({
    required String offerId,
    required String offerTitle,
    required String gymName,
    required int discount,
  }) async {
    try {
      final deepLink = '$baseUrl/offer/$offerId';
      final webLink = '$webUrl/offer/$offerId';
      
      final shareText = '''
🎉 Special Offer at $gymName!

$offerTitle
Get $discount% OFF!

Claim this offer: $deepLink
View online: $webLink

Download Gym-Wale app now! 📱
      '''.trim();

      await Share.share(
        shareText,
        subject: 'Special Offer: $offerTitle',
      );
    } catch (e) {
      print('Error sharing offer: $e');
      rethrow;
    }
  }

  /// Share trial booking
  static Future<void> shareTrialBooking({
    required String gymName,
    required String date,
    required String time,
  }) async {
    try {
      final shareText = '''
🎯 I just booked a trial session!

Gym: $gymName
Date: $date
Time: $time

Join me on my fitness journey! Download Gym-Wale app: $baseUrl
      '''.trim();

      await Share.share(
        shareText,
        subject: 'Trial Session Booked at $gymName',
      );
    } catch (e) {
      print('Error sharing trial booking: $e');
      rethrow;
    }
  }

  /// Share app invite
  static Future<void> shareAppInvite() async {
    try {
      final shareText = '''
🏋️ Join me on Gym-Wale!

Find the best gyms near you, book trial sessions, and start your fitness journey today!

Download now: $baseUrl

#GymWale #Fitness #HealthyLifestyle
      '''.trim();

      await Share.share(
        shareText,
        subject: 'Join Gym-Wale - Your Fitness Companion',
      );
    } catch (e) {
      print('Error sharing app invite: $e');
      rethrow;
    }
  }

  /// Share membership purchase
  static Future<void> shareMembership({
    required String gymName,
    required String planName,
  }) async {
    try {
      final shareText = '''
🎊 I just purchased a membership!

Gym: $gymName
Plan: $planName

Ready to achieve my fitness goals! 💪

Find your perfect gym on Gym-Wale: $baseUrl
      '''.trim();

      await Share.share(
        shareText,
        subject: 'New Membership at $gymName',
      );
    } catch (e) {
      print('Error sharing membership: $e');
      rethrow;
    }
  }

  /// Share achievement
  static Future<void> shareAchievement({
    required String title,
    required String description,
  }) async {
    try {
      final shareText = '''
🏆 New Achievement Unlocked!

$title
$description

Powered by Gym-Wale: $baseUrl

#Fitness #Achievement #GymWale
      '''.trim();

      await Share.share(
        shareText,
        subject: 'Achievement: $title',
      );
    } catch (e) {
      print('Error sharing achievement: $e');
      rethrow;
    }
  }

  /// Parse deep link
  static Map<String, String>? parseDeepLink(String link) {
    try {
      final uri = Uri.parse(link);
      
      // Check if it's a gym-wale link
      if (!uri.host.contains('gym-wale')) {
        return null;
      }

      final pathSegments = uri.pathSegments;
      if (pathSegments.isEmpty) {
        return null;
      }

      final type = pathSegments[0];
      final id = pathSegments.length > 1 ? pathSegments[1] : null;

      if (id == null) {
        return null;
      }

      return {
        'type': type, // gym, offer, etc.
        'id': id,
      };
    } catch (e) {
      print('Error parsing deep link: $e');
      return null;
    }
  }
}
