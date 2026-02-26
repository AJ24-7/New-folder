import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Storage Service for managing local data
class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  late SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Initialize storage
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Keys
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userDataKey = 'user_data';
  static const String _deviceFingerprintKey = 'device_fingerprint';
  static const String _rememberMeKey = 'remember_me';
  static const String _gymIdKey = 'gym_id';
  static const String _sessionLoginTimeKey = 'session_login_time';
  static const String _sessionTimeoutDurationKey = 'session_timeout_duration';
  static const String _fcmTokenKey = 'fcm_token';

  // Token methods
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  Future<void> deleteToken() async {
    await _secureStorage.delete(key: _tokenKey);
  }

  // Refresh Token methods
  Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> deleteRefreshToken() async {
    await _secureStorage.delete(key: _refreshTokenKey);
  }

  // User Data methods
  Future<void> saveUserData(String userData) async {
    await _prefs.setString(_userDataKey, userData);
  }

  String? getUserData() {
    return _prefs.getString(_userDataKey);
  }

  Future<void> deleteUserData() async {
    await _prefs.remove(_userDataKey);
  }

  // Device Fingerprint methods
  Future<void> saveDeviceFingerprint(String fingerprint) async {
    await _prefs.setString(_deviceFingerprintKey, fingerprint);
  }

  String? getDeviceFingerprint() {
    return _prefs.getString(_deviceFingerprintKey);
  }

  // Remember Me methods
  Future<void> saveRememberMe(bool remember) async {
    await _prefs.setBool(_rememberMeKey, remember);
  }

  bool getRememberMe() {
    return _prefs.getBool(_rememberMeKey) ?? false;
  }

  // Gym ID methods
  Future<void> saveGymId(String gymId) async {
    await _prefs.setString(_gymIdKey, gymId);
  }

  String? getGymId() {
    return _prefs.getString(_gymIdKey);
  }

  Future<void> deleteGymId() async {
    await _prefs.remove(_gymIdKey);
  }

  // FCM Token methods
  Future<void> saveFCMToken(String token) async {
    await _prefs.setString(_fcmTokenKey, token);
  }

  String? getFCMToken() {
    return _prefs.getString(_fcmTokenKey);
  }

  Future<void> deleteFCMToken() async {
    await _prefs.remove(_fcmTokenKey);
  }

  // Clear all data
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
    await _prefs.clear();
  }

  // Generic methods
  Future<void> setString(String key, String value) async {
    await _prefs.setString(key, value);
  }

  String? getString(String key) {
    return _prefs.getString(key);
  }

  Future<void> setBool(String key, bool value) async {
    await _prefs.setBool(key, value);
  }

  bool? getBool(String key) {
    return _prefs.getBool(key);
  }

  Future<void> setInt(String key, int value) async {
    await _prefs.setInt(key, value);
  }

  int? getInt(String key) {
    return _prefs.getInt(key);
  }

  Future<void> remove(String key) async {
    await _prefs.remove(key);
  }

  // Session Timer methods
  Future<void> saveSessionLoginTime(DateTime loginTime) async {
    await _prefs.setString(_sessionLoginTimeKey, loginTime.toIso8601String());
  }

  DateTime? getSessionLoginTime() {
    final timeString = _prefs.getString(_sessionLoginTimeKey);
    if (timeString != null) {
      return DateTime.parse(timeString);
    }
    return null;
  }

  Future<void> deleteSessionLoginTime() async {
    await _prefs.remove(_sessionLoginTimeKey);
  }

  Future<void> saveSessionTimeoutDuration(int minutes) async {
    await _prefs.setInt(_sessionTimeoutDurationKey, minutes);
  }

  int? getSessionTimeoutDuration() {
    return _prefs.getInt(_sessionTimeoutDurationKey);
  }

  Future<void> deleteSessionTimeoutDuration() async {
    await _prefs.remove(_sessionTimeoutDurationKey);
  }
}
