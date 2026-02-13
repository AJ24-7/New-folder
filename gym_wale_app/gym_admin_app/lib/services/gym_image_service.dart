import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../config/api_config.dart';
import 'storage_service.dart';
import 'cloudinary_service.dart';

class GymImageService {
  final Dio _dio;
  final StorageService _storage = StorageService();
  final CloudinaryService _cloudinary = CloudinaryService();

  GymImageService() : _dio = Dio(BaseOptions(
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

  /// Upload gym image
  /// The image will be uploaded to Cloudinary and the URL will be saved to the database
  /// This makes it accessible to both admin and user apps
  Future<Map<String, dynamic>> uploadGymImage({
    required XFile imageFile,
    String? caption,
    String? category,
  }) async {
    try {
      // Upload to Cloudinary
      final imageUrl = await _cloudinary.uploadGymImage(
        imageFile,
        await _storage.getGymId() ?? 'default',
      );

      // Save image metadata to backend
      final response = await _dio.post(
        '/gym/images',
        data: {
          'imageUrl': imageUrl,
          'caption': caption,
          'category': category ?? 'general',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'message': 'Image uploaded successfully',
          'imageUrl': imageUrl,
          'image': response.data['image'],
        };
      } else {
        throw Exception(response.data['message'] ?? 'Failed to upload image');
      }
    } catch (e) {
      throw Exception('Error uploading gym image: $e');
    }
  }

  /// Get all gym images
  Future<List<Map<String, dynamic>>> getGymImages() async {
    try {
      final response = await _dio.get('/gym/images');

      if (response.statusCode == 200) {
        final List<dynamic> images = response.data['images'] ?? response.data ?? [];
        return images.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to load gym images');
      }
    } catch (e) {
      throw Exception('Error fetching gym images: $e');
    }
  }

  /// Delete gym image
  Future<bool> deleteGymImage(String imageId) async {
    try {
      final response = await _dio.delete('/gym/images/$imageId');

      if (response.statusCode == 200) {
        return true;
      } else {
        throw Exception(response.data['message'] ?? 'Failed to delete image');
      }
    } catch (e) {
      throw Exception('Error deleting gym image: $e');
    }
  }

  /// Update gym logo
  Future<String> updateGymLogo(XFile logoFile) async {
    try {
      // Upload to Cloudinary
      final logoUrl = await _cloudinary.uploadGymLogo(
        logoFile,
        await _storage.getGymId() ?? 'default',
      );

      // Update gym profile with new logo
      final response = await _dio.put(
        '/gym/profile',
        data: {
          'logo': logoUrl,
        },
      );

      if (response.statusCode == 200) {
        return logoUrl;
      } else {
        throw Exception(response.data['message'] ?? 'Failed to update logo');
      }
    } catch (e) {
      throw Exception('Error updating gym logo: $e');
    }
  }

  /// Bulk upload gym images
  Future<Map<String, dynamic>> bulkUploadImages(List<XFile> imageFiles) async {
    try {
      int successCount = 0;
      int failureCount = 0;
      final List<String> uploadedUrls = [];
      final List<String> errors = [];

      for (final file in imageFiles) {
        try {
          final result = await uploadGymImage(imageFile: file);
          if (result['success'] == true) {
            successCount++;
            uploadedUrls.add(result['imageUrl']);
          } else {
            failureCount++;
            errors.add('Failed to upload ${file.name}');
          }
        } catch (e) {
          failureCount++;
          errors.add('Error uploading ${file.path}: $e');
        }
      }

      return {
        'success': successCount > 0,
        'message': 'Uploaded $successCount/${{successCount + failureCount}} images',
        'successCount': successCount,
        'failureCount': failureCount,
        'uploadedUrls': uploadedUrls,
        'errors': errors,
      };
    } catch (e) {
      throw Exception('Error in bulk upload: $e');
    }
  }

  /// Get optimized image URL for display
  String getOptimizedImageUrl(String url, {int? width, int? height}) {
    return _cloudinary.getOptimizedUrl(
      url,
      width: width,
      height: height,
      quality: 'auto',
    );
  }

  /// Get thumbnail URL
  String getThumbnailUrl(String url, {int size = 150}) {
    return _cloudinary.getThumbnailUrl(url, size: size);
  }
}
