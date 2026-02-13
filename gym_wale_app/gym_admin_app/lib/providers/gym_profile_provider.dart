import 'package:flutter/material.dart';
import '../models/gym_profile.dart';
import '../services/api_service.dart';

/// Gym Profile Provider - Manages gym profile state
class GymProfileProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  GymProfile? _currentProfile;
  bool _isLoading = false;
  String? _error;

  GymProfile? get currentProfile => _currentProfile;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasProfile => _currentProfile != null;

  /// Load gym profile from API
  Future<void> loadProfile() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final profile = await _apiService.getGymProfile();
      if (profile != null) {
        _currentProfile = profile;
        _error = null;
      } else {
        _error = 'Failed to load gym profile';
      }
    } catch (e) {
      _error = 'Error loading profile: $e';
      _currentProfile = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update gym profile
  Future<bool> updateProfile(GymProfile updatedProfile) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success = await _apiService.updateGymProfile(updatedProfile.toJson());
      if (success) {
        _currentProfile = updatedProfile;
        _error = null;
        notifyListeners();
        return true;
      } else {
        _error = 'Failed to update profile';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating profile: $e';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Upload gym logo
  Future<bool> uploadLogo(String filePath) async {
    try {
      final logoUrl = await _apiService.uploadGymLogo(filePath);
      if (logoUrl != null && _currentProfile != null) {
        _currentProfile = _currentProfile!.copyWith(logoUrl: logoUrl);
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = 'Error uploading logo: $e';
      notifyListeners();
      return false;
    }
  }

  /// Change password
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      return await _apiService.changeGymPassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
    } catch (e) {
      _error = 'Error changing password: $e';
      notifyListeners();
      return false;
    }
  }

  /// Clear profile data (on logout)
  void clearProfile() {
    _currentProfile = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }

  /// Refresh profile
  Future<void> refresh() async {
    await loadProfile();
  }
}
