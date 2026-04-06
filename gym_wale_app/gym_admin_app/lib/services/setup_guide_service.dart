import 'package:shared_preferences/shared_preferences.dart';

class SetupGuideService {
  String _completedKey(String gymId) => 'setup_guide_completed_$gymId';
  String _dismissedKey(String gymId) => 'setup_guide_dismissed_$gymId';

  Future<bool> shouldShowOnLogin(String gymId) async {
    final prefs = await SharedPreferences.getInstance();
    final isCompleted = prefs.getBool(_completedKey(gymId)) ?? false;
    final isDismissed = prefs.getBool(_dismissedKey(gymId)) ?? false;
    return !isCompleted && !isDismissed;
  }

  Future<void> markCompleted(String gymId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_completedKey(gymId), true);
    await prefs.setBool(_dismissedKey(gymId), true);
  }

  Future<void> markDismissed(String gymId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_dismissedKey(gymId), true);
  }

  Future<void> reset(String gymId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_completedKey(gymId));
    await prefs.remove(_dismissedKey(gymId));
  }
}
