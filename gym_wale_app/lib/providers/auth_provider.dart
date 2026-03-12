import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/firebase_notification_service.dart';

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
      // First restore the cached user so the session is valid immediately,
      // even before the network request completes.
      final cachedUser = await ApiService.getCachedUser();
      if (cachedUser != null) {
        _user = cachedUser;
        notifyListeners();
      }
      // Then try to refresh user data from the server in the background.
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
        // Persist user data locally so the session survives restarts.
        if (_user != null) await ApiService.cacheUser(_user!);
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
        if (_user != null) await ApiService.cacheUser(_user!);
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
        if (_user != null) await ApiService.cacheUser(_user!);
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
    // Remove FCM token from backend and Firebase before clearing auth so the
    // server stops sending push notifications to this device after logout.
    try {
      await ApiService.unregisterFcmToken();
    } catch (_) {}
    try {
      if (!kIsWeb) await FirebaseNotificationService.instance.deleteToken();
    } catch (_) {}
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
        // Keep local cache in sync with the latest server data.
        await ApiService.cacheUser(user);
        notifyListeners();
      }
      // If getProfile() returns null (network/token issue) we intentionally
      // keep the previously loaded _user so the session stays alive.
    } catch (e) {
      print('Error loading user: $e');
      // Don't clear _user on error — keep the cached session alive.
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
        if (_user != null) await ApiService.cacheUser(_user!);
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
