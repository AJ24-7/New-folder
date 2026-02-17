import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../models/equipment.dart';
import '../config/api_config.dart';
import 'storage_service.dart';
import 'cloudinary_service.dart';

/// Equipment Service for managing gym equipment
class EquipmentService {
  final Dio _dio;
  final StorageService _storage = StorageService();
  final CloudinaryService _cloudinary = CloudinaryService();

  EquipmentService()
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
      onError: (error, handler) {
        print('❌ Equipment API Error: ${error.response?.statusCode}');
        print('❌ Error Message: ${error.message}');
        print('❌ Error Data: ${error.response?.data}');
        return handler.next(error);
      },
    ));
  }

  /// Get all equipment for the gym
  Future<List<Equipment>> getAllEquipment() async {
    try {
      final gymId = await _storage.getGymId();
      if (gymId == null) {
        throw Exception('Gym ID not found');
      }

      // Using the gym endpoint to get gym data including equipment
      final response = await _dio.get('/api/gyms/$gymId');

      if (response.statusCode == 200) {
        final gymData = response.data['gym'] ?? response.data['data'] ?? response.data;
        final List<dynamic> equipmentList = gymData['equipment'] ?? [];
        print('📦 Fetched ${equipmentList.length} equipment items');
        
        // Debug: Print first equipment item to verify ID structure
        if (equipmentList.isNotEmpty) {
          print('📋 Sample equipment data: ${equipmentList.first}');
        }
        
        return equipmentList.map((json) => Equipment.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching equipment: $e');
      throw Exception('Failed to load equipment: $e');
    }
  }

  /// Get equipment statistics
  Future<EquipmentStats> getEquipmentStats() async {
    try {
      final equipmentList = await getAllEquipment();
      return EquipmentStats.fromEquipmentList(equipmentList);
    } catch (e) {
      print('Error fetching equipment stats: $e');
      return EquipmentStats(
        total: 0,
        available: 0,
        maintenance: 0,
        outOfOrder: 0,
      );
    }
  }

  /// Add new equipment
  Future<Equipment> addEquipment({
    required String name,
    String? brand,
    required String category,
    String? model,
    required int quantity,
    required EquipmentStatus status,
    DateTime? purchaseDate,
    double? price,
    int? warranty,
    String? location,
    String? description,
    String? specifications,
    List<XFile>? photoFiles,
  }) async {
    try {
      // Upload photos to Cloudinary first
      List<String> photoUrls = [];
      if (photoFiles != null && photoFiles.isNotEmpty) {
        for (final photoFile in photoFiles) {
          try {
            final url = await _cloudinary.uploadImageFromXFile(
              photoFile,
              folder: 'gym_wale/equipment',
            );
            photoUrls.add(url);
          } catch (e) {
            print('Error uploading photo: $e');
            // Continue with other photos
          }
        }
      }

      // Create equipment data - send photos array directly
      final equipmentData = {
        'name': name,
        if (brand != null && brand.isNotEmpty) 'brand': brand,
        'category': category,
        if (model != null && model.isNotEmpty) 'model': model,
        'quantity': quantity,
        'status': status.value,
        if (purchaseDate != null) 'purchaseDate': purchaseDate.toIso8601String(),
        if (price != null) 'price': price,
        if (warranty != null) 'warranty': warranty,
        if (location != null && location.isNotEmpty) 'location': location,
        if (description != null && description.isNotEmpty) 'description': description,
        if (specifications != null && specifications.isNotEmpty) 'specifications': specifications,
        if (photoUrls.isNotEmpty) 'photos': photoUrls,
      };

      print('📤 Adding equipment with data: $equipmentData');

      final response = await _dio.post(
        ApiConfig.equipment,
        data: equipmentData,
      );

      print('✅ Equipment added: ${response.statusCode}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        final equipmentJson = response.data['equipment'] ?? response.data;
        return Equipment.fromJson(equipmentJson);
      }

      throw Exception('Failed to add equipment');
    } catch (e) {
      print('❌ Error adding equipment: $e');
      throw Exception('Failed to add equipment: $e');
    }
  }

  /// Update existing equipment
  Future<Equipment> updateEquipment({
    required String id,
    String? name,
    String? brand,
    String? category,
    String? model,
    int? quantity,
    EquipmentStatus? status,
    DateTime? purchaseDate,
    double? price,
    int? warranty,
    String? location,
    String? description,
    String? specifications,
    List<String>? existingPhotos,
    List<XFile>? newPhotoFiles,
  }) async {
    try {
      // Upload new photos to Cloudinary
      List<String> newPhotoUrls = [];
      if (newPhotoFiles != null && newPhotoFiles.isNotEmpty) {
        for (final photoFile in newPhotoFiles) {
          try {
            final url = await _cloudinary.uploadImageFromXFile(
              photoFile,
              folder: 'gym_wale/equipment',
            );
            newPhotoUrls.add(url);
          } catch (e) {
            print('Error uploading photo: $e');
            // Continue with other photos
          }
        }
      }

      // Combine existing and new photos
      final allPhotos = [
        ...(existingPhotos ?? []),
        ...newPhotoUrls,
      ];

      // Create update data - only include non-null values
      final updateData = <String, dynamic>{
        if (name != null && name.isNotEmpty) 'name': name,
        if (brand != null && brand.isNotEmpty) 'brand': brand,
        if (category != null && category.isNotEmpty) 'category': category,
        if (model != null && model.isNotEmpty) 'model': model,
        if (quantity != null) 'quantity': quantity,
        if (status != null) 'status': status.value,
        if (purchaseDate != null) 'purchaseDate': purchaseDate.toIso8601String(),
        if (price != null) 'price': price,
        if (warranty != null) 'warranty': warranty,
        if (location != null && location.isNotEmpty) 'location': location,
        if (description != null && description.isNotEmpty) 'description': description,
        if (specifications != null && specifications.isNotEmpty) 'specifications': specifications,
        'photos': allPhotos, // Always send photos array
      };

      print('📤 Updating equipment $id with data: $updateData');
      print('📍 API URL: ${ApiConfig.equipmentById(id)}');

      final response = await _dio.put(
        ApiConfig.equipmentById(id),
        data: updateData,
      );

      print('✅ Equipment updated: ${response.statusCode}');

      if (response.statusCode == 200) {
        final equipmentJson = response.data['equipment'] ?? response.data;
        return Equipment.fromJson(equipmentJson);
      }

      throw Exception('Failed to update equipment');
    } catch (e) {
      print('❌ Error updating equipment: $e');
      if (e.toString().contains('404')) {
        throw Exception('Equipment not found. The equipment may have been deleted or the ID is invalid.');
      }
      throw Exception('Failed to update equipment: $e');
    }
  }

  /// Delete equipment
  Future<bool> deleteEquipment(String id) async {
    try {
      print('🗑️ Deleting equipment with ID: $id');
      print('📍 Delete API URL: ${ApiConfig.equipmentById(id)}');
      
      final response = await _dio.delete(ApiConfig.equipmentById(id));
      print('✅ Equipment deleted: ${response.statusCode}');
      return response.statusCode == 200;
    } catch (e) {
      print('❌ Error deleting equipment: $e');
      if (e.toString().contains('404')) {
        throw Exception('Equipment not found. The equipment may have been deleted or the ID is invalid.');
      }
      throw Exception('Failed to delete equipment: $e');
    }
  }

  /// Get equipment by ID
  Future<Equipment?> getEquipmentById(String id) async {
    try {
      final allEquipment = await getAllEquipment();
      return allEquipment.firstWhere(
        (equipment) => equipment.id == id,
        orElse: () => throw Exception('Equipment not found'),
      );
    } catch (e) {
      print('Error fetching equipment by ID: $e');
      return null;
    }
  }
}
