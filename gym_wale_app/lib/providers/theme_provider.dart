import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

enum ThemeType { light, dark, system }

class ThemeProvider extends ChangeNotifier {
  ThemeType _themeType = ThemeType.system;
  bool _isInitialized = false;

  ThemeType get themeType => _themeType;
  bool get isInitialized => _isInitialized;

  ThemeProvider() {
    _loadThemePreference();
  }

  /// Load theme preference from SharedPreferences
  Future<void> _loadThemePreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final themeString = prefs.getString('theme_preference') ?? 'system';
      _themeType = _stringToThemeType(themeString);
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      print('Error loading theme preference: $e');
      _isInitialized = true;
      notifyListeners();
    }
  }

  /// Set theme and persist to both local storage and backend
  Future<void> setTheme(ThemeType themeType) async {
    if (_themeType == themeType) return;

    _themeType = themeType;
    notifyListeners();

    try {
      // Save to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('theme_preference', _themeTypeToString(themeType));

      // Save to backend
      await _syncThemeToBackend(themeType);
    } catch (e) {
      print('Error saving theme preference: $e');
    }
  }

  /// Sync theme preference to backend
  Future<void> _syncThemeToBackend(ThemeType themeType) async {
    try {
      await ApiService.updateUserSettings({
        'theme': _themeTypeToString(themeType),
      });
    } catch (e) {
      print('Error syncing theme to backend: $e');
    }
  }

  /// Load theme from backend (called after login)
  Future<void> loadThemeFromBackend() async {
    try {
      final settings = await ApiService.getUserSettings();
      if (settings != null && settings['theme'] != null) {
        final themeType = _stringToThemeType(settings['theme']);
        if (_themeType != themeType) {
          _themeType = themeType;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('theme_preference', settings['theme']);
          notifyListeners();
        }
      }
    } catch (e) {
      print('Error loading theme from backend: $e');
    }
  }

  /// Get the actual ThemeMode to use (resolves system theme)
  ThemeMode getThemeMode() {
    switch (_themeType) {
      case ThemeType.light:
        return ThemeMode.light;
      case ThemeType.dark:
        return ThemeMode.dark;
      case ThemeType.system:
        return ThemeMode.system;
    }
  }

  /// Convert string to ThemeType
  ThemeType _stringToThemeType(String theme) {
    switch (theme.toLowerCase()) {
      case 'light':
        return ThemeType.light;
      case 'dark':
        return ThemeType.dark;
      case 'system':
      default:
        return ThemeType.system;
    }
  }

  /// Convert ThemeType to string
  String _themeTypeToString(ThemeType themeType) {
    switch (themeType) {
      case ThemeType.light:
        return 'light';
      case ThemeType.dark:
        return 'dark';
      case ThemeType.system:
        return 'system';
    }
  }

  /// Get display name for theme type
  String getThemeDisplayName(ThemeType themeType) {
    switch (themeType) {
      case ThemeType.light:
        return 'Light';
      case ThemeType.dark:
        return 'Dark';
      case ThemeType.system:
        return 'System Default';
    }
  }
}
