import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

/// Cloudinary Service for image uploads (cross-platform: mobile & web)
/// 
/// SETUP INSTRUCTIONS:
/// 1. Sign up for a free account at https://cloudinary.com
/// 2. Go to Settings > Upload > Upload presets
/// 3. Click "Add upload preset" and set:
///    - Preset name: gym_wale_app
///    - Signing mode: Unsigned
///    - Folder: gym_wale (or your preferred folder)
/// 4. Replace the values below with your credentials
class CloudinaryService {
  // TODO: IMPORTANT - Replace these with your actual Cloudinary credentials
  static const String cloudName = 'djqmtdopk'; // From Cloudinary Dashboard
  static const String uploadPreset = 'gym_wale_app'; // Your upload preset name
  
  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      sendTimeout: const Duration(seconds: 60),
    ),
  );

  /// Validates if Cloudinary credentials are configured
  bool _areCredentialsConfigured() {
    return cloudName != 'YOUR_CLOUD_NAME' && 
           uploadPreset != 'gym_wale_preset' &&
           cloudName.isNotEmpty && 
           uploadPreset.isNotEmpty;
  }

  /// Upload image to Cloudinary from XFile (works on both mobile and web)
  /// [imageFile] - The XFile from image picker
  /// [folder] - Optional folder path in Cloudinary (e.g., 'members', 'gym_images')
  /// Returns the secure URL of the uploaded image
  Future<String> uploadImageFromXFile(
    XFile imageFile, {
    String folder = 'gym_wale',
  }) async {
    // Check if credentials are configured
    if (!_areCredentialsConfigured()) {
      throw Exception(
        'Cloudinary not configured!\n\n'
        'Please configure your Cloudinary credentials in:\n'
        'lib/services/cloudinary_service.dart\n\n'
        'Steps:\n'
        '1. Sign up at https://cloudinary.com\n'
        '2. Get your Cloud Name from the dashboard\n'
        '3. Create an unsigned upload preset\n'
        '4. Update cloudName and uploadPreset constants'
      );
    }

    try {
      // Read image bytes (works on both mobile and web)
      final bytes = await imageFile.readAsBytes();
      final fileName = imageFile.name;

      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          bytes,
          filename: fileName,
        ),
        'upload_preset': uploadPreset,
        'folder': folder,
        'resource_type': 'image',
      });

      final response = await _dio.post(
        'https://api.cloudinary.com/v1_1/$cloudName/image/upload',
        data: formData,
      );

      if (response.statusCode == 200) {
        return response.data['secure_url'] as String;
      } else {
        throw Exception('Failed to upload image: ${response.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception(
          'Cloudinary Upload Failed (401 Unauthorized)\n\n'
          'Your upload preset might be incorrect or not configured as "unsigned".\n\n'
          'Please verify:\n'
          '1. Cloud Name: $cloudName\n'
          '2. Upload Preset: $uploadPreset\n\n'
          'Go to Cloudinary Dashboard > Settings > Upload > Upload presets\n'
          'Make sure the preset is set to "Unsigned" mode.'
        );
      }
      throw Exception('Upload error: ${e.message}');
    } catch (e) {
      throw Exception('Error uploading image to Cloudinary: $e');
    }
  }

  /// Upload image to Cloudinary from bytes (cross-platform)
  /// [bytes] - Image data as bytes
  /// [fileName] - Name of the file
  /// [folder] - Optional folder path in Cloudinary
  /// Returns the secure URL of the uploaded image
  Future<String> uploadImageFromBytes(
    Uint8List bytes,
    String fileName, {
    String folder = 'gym_wale',
  }) async {
    // Check if credentials are configured
    if (!_areCredentialsConfigured()) {
      throw Exception(
        'Cloudinary not configured!\n\n'
        'Please configure your Cloudinary credentials in:\n'
        'lib/services/cloudinary_service.dart\n\n'
        'Steps:\n'
        '1. Sign up at https://cloudinary.com\n'
        '2. Get your Cloud Name from the dashboard\n'
        '3. Create an unsigned upload preset\n'
        '4. Update cloudName and uploadPreset constants'
      );
    }

    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          bytes,
          filename: fileName,
        ),
        'upload_preset': uploadPreset,
        'folder': folder,
        'resource_type': 'image',
      });

      final response = await _dio.post(
        'https://api.cloudinary.com/v1_1/$cloudName/image/upload',
        data: formData,
      );

      if (response.statusCode == 200) {
        return response.data['secure_url'] as String;
      } else {
        throw Exception('Failed to upload image: ${response.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception(
          'Cloudinary Upload Failed (401 Unauthorized)\n\n'
          'Your upload preset might be incorrect or not configured as "unsigned".\n\n'
          'Please verify:\n'
          '1. Cloud Name: $cloudName\n'
          '2. Upload Preset: $uploadPreset\n\n'
          'Go to Cloudinary Dashboard > Settings > Upload > Upload presets\n'
          'Make sure the preset is set to "Unsigned" mode.'
        );
      }
      throw Exception('Upload error: ${e.message}');
    } catch (e) {
      throw Exception('Error uploading image to Cloudinary: $e');
    }
  }

  /// Upload member profile image
  Future<String> uploadMemberImage(XFile imageFile, String memberId) async {
    return await uploadImageFromXFile(
      imageFile,
      folder: 'gym_wale/members/$memberId',
    );
  }

  /// Upload gym image
  Future<String> uploadGymImage(XFile imageFile, String gymId) async {
    return await uploadImageFromXFile(
      imageFile,
      folder: 'gym_wale/gyms/$gymId/gallery',
    );
  }

  /// Upload gym logo
  Future<String> uploadGymLogo(XFile imageFile, String gymId) async {
    return await uploadImageFromXFile(
      imageFile,
      folder: 'gym_wale/gyms/$gymId/logo',
    );
  }

  /// Delete image from Cloudinary
  /// [publicId] - The public ID of the image to delete
  Future<bool> deleteImage(String publicId) async {
    try {
      // Note: Deleting requires authentication with API secret
      // This should ideally be done from backend for security
      // For now, images will remain in Cloudinary even if deleted from DB
      return true;
    } catch (e) {
      print('Error deleting image: $e');
      return false;
    }
  }

  /// Extract public ID from Cloudinary URL
  String? getPublicIdFromUrl(String url) {
    try {
      final uri = Uri.parse(url);
      final pathSegments = uri.pathSegments;
      
      // Find 'upload' segment and get everything after it
      final uploadIndex = pathSegments.indexOf('upload');
      if (uploadIndex != -1 && uploadIndex < pathSegments.length - 1) {
        final publicIdWithExtension = pathSegments.sublist(uploadIndex + 2).join('/');
        // Remove file extension
        final lastDot = publicIdWithExtension.lastIndexOf('.');
        if (lastDot != -1) {
          return publicIdWithExtension.substring(0, lastDot);
        }
        return publicIdWithExtension;
      }
      return null;
    } catch (e) {
      print('Error extracting public ID: $e');
      return null;
    }
  }

  /// Get optimized image URL
  /// [url] - Original Cloudinary URL
  /// [width] - Desired width
  /// [height] - Desired height
  /// [quality] - Image quality (auto, best, good, eco, low)
  String getOptimizedUrl(
    String url, {
    int? width,
    int? height,
    String quality = 'auto',
  }) {
    try {
      final uri = Uri.parse(url);
      final pathSegments = uri.pathSegments.toList();
      
      // Find 'upload' segment
      final uploadIndex = pathSegments.indexOf('upload');
      if (uploadIndex != -1) {
        // Build transformation string
        final transformations = <String>[];
        if (width != null) transformations.add('w_$width');
        if (height != null) transformations.add('h_$height');
        transformations.add('q_$quality');
        transformations.add('f_auto');
        
        // Insert transformations after 'upload'
        pathSegments.insert(uploadIndex + 1, transformations.join(','));
        
        return Uri(
          scheme: uri.scheme,
          host: uri.host,
          pathSegments: pathSegments,
        ).toString();
      }
      return url;
    } catch (e) {
      print('Error optimizing URL: $e');
      return url;
    }
  }

  /// Get thumbnail URL
  String getThumbnailUrl(String url, {int size = 150}) {
    return getOptimizedUrl(
      url,
      width: size,
      height: size,
      quality: 'auto',
    );
  }
}
