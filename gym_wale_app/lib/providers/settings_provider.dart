import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

/// Comprehensive settings provider for managing all app settings
class SettingsProvider extends ChangeNotifier {
  // General Settings
  bool _notificationsEnabled = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  bool _autoPlayVideos = false;
  bool _dataSaverMode = false;
  
  // Privacy Settings
  bool _shareWorkoutData = false;
  bool _shareProgress = true;
  String _profileVisibility = 'public'; // public, friends, private
  
  // Display Settings
  double _fontSize = 14.0;
  bool _showAnimations = true;
  
  // Measurement Settings
  String _measurementSystem = 'metric'; // metric, imperial
  String _distanceUnit = 'km'; // km, miles
  String _weightUnit = 'kg'; // kg, lbs
  
  bool _isInitialized = false;

  // Getters
  bool get notificationsEnabled => _notificationsEnabled;
  bool get soundEnabled => _soundEnabled;
  bool get vibrationEnabled => _vibrationEnabled;
  bool get autoPlayVideos => _autoPlayVideos;
  bool get dataSaverMode => _dataSaverMode;
  bool get shareWorkoutData => _shareWorkoutData;
  bool get shareProgress => _shareProgress;
  String get profileVisibility => _profileVisibility;
  double get fontSize => _fontSize;
  bool get showAnimations => _showAnimations;
  String get measurementSystem => _measurementSystem;
  String get distanceUnit => _distanceUnit;
  String get weightUnit => _weightUnit;
  bool get isInitialized => _isInitialized;

  SettingsProvider() {
    _loadSettings();
  }

  /// Load all settings from SharedPreferences
  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
      _soundEnabled = prefs.getBool('sound_enabled') ?? true;
      _vibrationEnabled = prefs.getBool('vibration_enabled') ?? true;
      _autoPlayVideos = prefs.getBool('auto_play_videos') ?? false;
      _dataSaverMode = prefs.getBool('data_saver_mode') ?? false;
      _shareWorkoutData = prefs.getBool('share_workout_data') ?? false;
      _shareProgress = prefs.getBool('share_progress') ?? true;
      _profileVisibility = prefs.getString('profile_visibility') ?? 'public';
      _fontSize = prefs.getDouble('font_size') ?? 14.0;
      _showAnimations = prefs.getBool('show_animations') ?? true;
      _measurementSystem = prefs.getString('measurement_system') ?? 'metric';
      _distanceUnit = prefs.getString('distance_unit') ?? 'km';
      _weightUnit = prefs.getString('weight_unit') ?? 'kg';
      
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      print('Error loading settings: $e');
      _isInitialized = true;
      notifyListeners();
    }
  }

  /// Load settings from backend
  Future<void> loadSettingsFromBackend() async {
    try {
      final settings = await ApiService.getUserSettings();
      if (settings != null && settings['appSettings'] != null) {
        final appSettings = settings['appSettings'];
        
        _notificationsEnabled = appSettings['notificationsEnabled'] ?? true;
        _soundEnabled = appSettings['soundEnabled'] ?? true;
        _vibrationEnabled = appSettings['vibrationEnabled'] ?? true;
        _autoPlayVideos = appSettings['autoPlayVideos'] ?? false;
        _dataSaverMode = appSettings['dataSaverMode'] ?? false;
        _shareWorkoutData = appSettings['shareWorkoutData'] ?? false;
        _shareProgress = appSettings['shareProgress'] ?? true;
        _profileVisibility = appSettings['profileVisibility'] ?? 'public';
        _fontSize = (appSettings['fontSize'] ?? 14.0).toDouble();
        _showAnimations = appSettings['showAnimations'] ?? true;
        _measurementSystem = appSettings['measurementSystem'] ?? 'metric';
        _distanceUnit = appSettings['distanceUnit'] ?? 'km';
        _weightUnit = appSettings['weightUnit'] ?? 'kg';
        
        await _saveAllToLocal();
        notifyListeners();
      }
    } catch (e) {
      print('Error loading settings from backend: $e');
    }
  }

  /// Save all settings to local storage
  Future<void> _saveAllToLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('notifications_enabled', _notificationsEnabled);
      await prefs.setBool('sound_enabled', _soundEnabled);
      await prefs.setBool('vibration_enabled', _vibrationEnabled);
      await prefs.setBool('auto_play_videos', _autoPlayVideos);
      await prefs.setBool('data_saver_mode', _dataSaverMode);
      await prefs.setBool('share_workout_data', _shareWorkoutData);
      await prefs.setBool('share_progress', _shareProgress);
      await prefs.setString('profile_visibility', _profileVisibility);
      await prefs.setDouble('font_size', _fontSize);
      await prefs.setBool('show_animations', _showAnimations);
      await prefs.setString('measurement_system', _measurementSystem);
      await prefs.setString('distance_unit', _distanceUnit);
      await prefs.setString('weight_unit', _weightUnit);
    } catch (e) {
      print('Error saving settings to local: $e');
    }
  }

  /// Sync settings to backend
  Future<void> _syncToBackend() async {
    try {
      await ApiService.updateUserSettings({
        'appSettings': {
          'notificationsEnabled': _notificationsEnabled,
          'soundEnabled': _soundEnabled,
          'vibrationEnabled': _vibrationEnabled,
          'autoPlayVideos': _autoPlayVideos,
          'dataSaverMode': _dataSaverMode,
          'shareWorkoutData': _shareWorkoutData,
          'shareProgress': _shareProgress,
          'profileVisibility': _profileVisibility,
          'fontSize': _fontSize,
          'showAnimations': _showAnimations,
          'measurementSystem': _measurementSystem,
          'distanceUnit': _distanceUnit,
          'weightUnit': _weightUnit,
        }
      });
    } catch (e) {
      print('Error syncing settings to backend: $e');
    }
  }

  // Setters with persistence
  Future<void> setNotificationsEnabled(bool value) async {
    _notificationsEnabled = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', value);
    await _syncToBackend();
  }

  Future<void> setSoundEnabled(bool value) async {
    _soundEnabled = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('sound_enabled', value);
    await _syncToBackend();
  }

  Future<void> setVibrationEnabled(bool value) async {
    _vibrationEnabled = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('vibration_enabled', value);
    await _syncToBackend();
  }

  Future<void> setAutoPlayVideos(bool value) async {
    _autoPlayVideos = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('auto_play_videos', value);
    await _syncToBackend();
  }

  Future<void> setDataSaverMode(bool value) async {
    _dataSaverMode = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('data_saver_mode', value);
    await _syncToBackend();
  }

  Future<void> setShareWorkoutData(bool value) async {
    _shareWorkoutData = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('share_workout_data', value);
    await _syncToBackend();
  }

  Future<void> setShareProgress(bool value) async {
    _shareProgress = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('share_progress', value);
    await _syncToBackend();
  }

  Future<void> setProfileVisibility(String value) async {
    _profileVisibility = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_visibility', value);
    await _syncToBackend();
  }

  Future<void> setFontSize(double value) async {
    _fontSize = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('font_size', value);
    await _syncToBackend();
  }

  Future<void> setShowAnimations(bool value) async {
    _showAnimations = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('show_animations', value);
    await _syncToBackend();
  }

  Future<void> setMeasurementSystem(String value) async {
    _measurementSystem = value;
    // Update dependent units
    if (value == 'metric') {
      _distanceUnit = 'km';
      _weightUnit = 'kg';
    } else {
      _distanceUnit = 'miles';
      _weightUnit = 'lbs';
    }
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('measurement_system', value);
    await prefs.setString('distance_unit', _distanceUnit);
    await prefs.setString('weight_unit', _weightUnit);
    await _syncToBackend();
  }
}
