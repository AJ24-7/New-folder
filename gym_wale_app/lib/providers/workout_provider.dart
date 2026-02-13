import 'package:flutter/foundation.dart';
import '../models/workout_plan.dart';
import '../services/workout_service.dart';

class WorkoutProvider with ChangeNotifier {
  List<WorkoutPlan> _workoutPlans = [];
  WorkoutPlan? _selectedPlan;
  UserWorkoutProgress? _userProgress;
  bool _isLoading = false;
  String? _error;

  // User BMI data
  double? _userBMI;
  String? _userBMICategory;
  String? _userFitnessLevel;

  List<WorkoutPlan> get workoutPlans => _workoutPlans;
  WorkoutPlan? get selectedPlan => _selectedPlan;
  UserWorkoutProgress? get userProgress => _userProgress;
  bool get isLoading => _isLoading;
  String? get error => _error;
  double? get userBMI => _userBMI;
  String? get userBMICategory => _userBMICategory;
  String? get userFitnessLevel => _userFitnessLevel;

  // Calculate BMI
  void calculateBMI(double weight, double height) {
    // height should be in meters, weight in kg
    if (height > 0 && weight > 0) {
      _userBMI = weight / (height * height);
      _userBMICategory = _getBMICategory(_userBMI!);
      notifyListeners();
    }
  }

  String _getBMICategory(double bmi) {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  // Set user fitness level
  void setFitnessLevel(String level) {
    _userFitnessLevel = level;
    notifyListeners();
  }

  // Load all workout plans
  Future<void> loadWorkoutPlans() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await WorkoutService.getWorkoutPlans();
      if (result['success']) {
        _workoutPlans = result['plans'] as List<WorkoutPlan>;
      } else {
        _error = result['message'];
      }
    } catch (e) {
      _error = 'Failed to load workout plans: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Get recommended workout plans based on BMI and fitness level
  Future<void> loadRecommendedPlans() async {
    if (_userBMICategory == null || _userFitnessLevel == null) {
      _error = 'Please set your BMI and fitness level first';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await WorkoutService.getRecommendedPlans(
        bmiCategory: _userBMICategory!,
        fitnessLevel: _userFitnessLevel!,
      );

      if (result['success']) {
        _workoutPlans = result['plans'] as List<WorkoutPlan>;
      } else {
        _error = result['message'];
      }
    } catch (e) {
      _error = 'Failed to load recommended plans: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Select a workout plan
  void selectPlan(WorkoutPlan plan) {
    _selectedPlan = plan;
    notifyListeners();
  }

  // Start a workout plan
  Future<bool> startWorkoutPlan(String planId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await WorkoutService.startWorkoutPlan(planId);
      if (result['success']) {
        _userProgress = result['progress'] as UserWorkoutProgress?;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = result['message'];
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Failed to start workout plan: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Load user progress
  Future<void> loadUserProgress() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await WorkoutService.getUserProgress();
      if (result['success']) {
        _userProgress = result['progress'] as UserWorkoutProgress?;
      } else {
        _error = result['message'];
      }
    } catch (e) {
      _error = 'Failed to load progress: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mark exercise as completed
  Future<bool> completeExercise({
    required String exerciseId,
    required int sets,
    required int reps,
    int? duration,
    String? notes,
  }) async {
    try {
      final result = await WorkoutService.completeExercise(
        exerciseId: exerciseId,
        sets: sets,
        reps: reps,
        duration: duration,
        notes: notes,
      );

      if (result['success']) {
        // Reload progress to get updated data
        await loadUserProgress();
        return true;
      } else {
        _error = result['message'];
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Failed to complete exercise: $e';
      notifyListeners();
      return false;
    }
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Reset provider
  void reset() {
    _workoutPlans = [];
    _selectedPlan = null;
    _userProgress = null;
    _isLoading = false;
    _error = null;
    _userBMI = null;
    _userBMICategory = null;
    _userFitnessLevel = null;
    notifyListeners();
  }
}
