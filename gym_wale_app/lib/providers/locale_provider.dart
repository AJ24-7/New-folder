import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

enum AppLanguage { english, hindi }

class LocaleProvider extends ChangeNotifier {
  Locale _locale = const Locale('en');
  bool _isInitialized = false;

  Locale get locale => _locale;
  bool get isInitialized => _isInitialized;
  AppLanguage get currentLanguage => _locale.languageCode == 'hi' ? AppLanguage.hindi : AppLanguage.english;

  LocaleProvider() {
    _loadLocalePreference();
  }

  /// Load locale preference from SharedPreferences
  Future<void> _loadLocalePreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final languageCode = prefs.getString('language_preference') ?? 'en';
      _locale = Locale(languageCode);
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      print('Error loading locale preference: $e');
      _isInitialized = true;
      notifyListeners();
    }
  }

  /// Set locale and persist to both local storage and backend
  Future<void> setLocale(Locale locale) async {
    if (_locale == locale) return;

    _locale = locale;
    notifyListeners();

    try {
      // Save to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('language_preference', locale.languageCode);

      // Save to backend
      await _syncLocaleToBackend(locale);
    } catch (e) {
      print('Error saving locale preference: $e');
    }
  }

  /// Set language using AppLanguage enum
  Future<void> setLanguage(AppLanguage language) async {
    final locale = language == AppLanguage.hindi ? const Locale('hi') : const Locale('en');
    await setLocale(locale);
  }

  /// Sync locale preference to backend
  Future<void> _syncLocaleToBackend(Locale locale) async {
    try {
      await ApiService.updateUserSettings({
        'language': locale.languageCode,
      });
    } catch (e) {
      print('Error syncing locale to backend: $e');
    }
  }

  /// Load locale from backend (called after login)
  Future<void> loadLocaleFromBackend() async {
    try {
      final settings = await ApiService.getUserSettings();
      if (settings != null && settings['language'] != null) {
        final locale = Locale(settings['language']);
        if (_locale != locale) {
          _locale = locale;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('language_preference', settings['language']);
          notifyListeners();
        }
      }
    } catch (e) {
      print('Error loading locale from backend: $e');
    }
  }

  /// Get display name for language
  String getLanguageDisplayName(AppLanguage language) {
    switch (language) {
      case AppLanguage.english:
        return 'English';
      case AppLanguage.hindi:
        return 'हिंदी (Hindi)';
    }
  }

  /// Get all supported locales
  static List<Locale> get supportedLocales => const [
        Locale('en'), // English
        Locale('hi'), // Hindi
      ];
}
