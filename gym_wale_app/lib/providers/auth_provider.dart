import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && ApiService.isAuthenticated;

  /// Initialize auth provider and load saved user session
  Future<void> init() async {
    await ApiService.init();
    if (ApiService.isAuthenticated) {
      await loadUser();
    }
  }

  /// Login with email and password
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.login(email, password);
      
      _isLoading = false;
      if (result['success']) {
        _user = result['user'];
        _error = null;
        notifyListeners();
        return true;
      } else {
        _error = result['message'] ?? 'Login failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Connection error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  /// Register new user
  Future<bool> register(Map<String, dynamic> userData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.register(userData);
      
      _isLoading = false;
      if (result['success']) {
        _user = result['user'];
        _error = null;
        notifyListeners();
        return true;
      } else {
        _error = result['message'] ?? 'Registration failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Connection error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  /// Google Sign In
  Future<bool> googleSignIn(String idToken) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.googleAuth(idToken);
      
      _isLoading = false;
      if (result['success']) {
        _user = result['user'];
        _error = null;
        notifyListeners();
        return true;
      } else {
        _error = result['message'] ?? 'Google authentication failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Connection error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  /// Logout user
  Future<void> logout() async {
    await ApiService.logout();
    _user = null;
    _error = null;
    notifyListeners();
  }

  /// Load user profile from backend
  Future<void> loadUser() async {
    try {
      final user = await ApiService.getProfile();
      if (user != null) {
        _user = user;
        notifyListeners();
      }
    } catch (e) {
      print('Error loading user: $e');
    }
  }

  /// Update user profile
  Future<bool> updateProfile(
    Map<String, dynamic> userData, {
    File? profileImageFile,
    XFile? profileImageXFile,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.updateProfile(
        userData,
        profileImage: profileImageFile,
        profileImageXFile: profileImageXFile,
      );
      
      _isLoading = false;
      if (result['success']) {
        _user = result['user'];
        _error = null;
        notifyListeners();
        return true;
      } else {
        _error = result['message'] ?? 'Update failed';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = 'Connection error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  /// Clear error message
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
