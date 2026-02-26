import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/gym_profile_provider.dart';
import 'providers/notification_provider.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/members/members_screen.dart';
import 'screens/attendance/attendance_screen.dart';
import 'screens/payments/payments_screen.dart';
import 'screens/geofence/geofence_setup_screen.dart';
import 'screens/equipment/equipment_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/settings/gym_profile_screen.dart';
import 'screens/support/support_screen.dart';
import 'services/storage_service.dart';
import 'services/passcode_service.dart';
import 'services/firebase_messaging_service.dart';
import 'widgets/passcode_dialog.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  try {
    await Firebase.initializeApp();
    debugPrint('✅ Firebase initialized successfully');
    
    // Set background message handler
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    debugPrint('✅ Background message handler registered');
  } catch (e) {
    debugPrint('❌ Error initializing Firebase: $e');
  }
  
  // Initialize storage
  await StorageService().init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => GymProfileProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: Consumer2<ThemeProvider, LocaleProvider>(
        builder: (context, themeProvider, localeProvider, child) {
          return MaterialApp(
            title: 'Gym-Wale Admin',
            debugShowCheckedModeBanner: false,
            theme: ThemeProvider.lightTheme,
            darkTheme: ThemeProvider.darkTheme,
            themeMode: themeProvider.themeMode,
            locale: localeProvider.locale,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: LocaleProvider.supportedLocales,
            home: const AuthWrapper(),
            onGenerateRoute: (settings) {
              // Handle named routes for navigation after initial load
              switch (settings.name) {
                case '/login':
                  return MaterialPageRoute(builder: (_) => const LoginScreen());
                case '/dashboard':
                  return MaterialPageRoute(builder: (_) => const DashboardScreen());
                case '/members':
                  return MaterialPageRoute(builder: (_) => const MembersScreen());
                case '/attendance':
                  return MaterialPageRoute(builder: (_) => const AttendanceScreen());
                case '/payments':
                  return MaterialPageRoute(builder: (_) => const PaymentsScreen());
                case '/equipment':
                  return MaterialPageRoute(builder: (_) => const EquipmentScreen());
                case '/geofence-setup':
                  return MaterialPageRoute(builder: (_) => const GeofenceSetupScreen());
                case '/settings':
                  return MaterialPageRoute(builder: (_) => const SettingsScreen());
                case '/gym-profile':
                  return MaterialPageRoute(builder: (_) => const GymProfileScreen());
                case '/support':
                  final args = settings.arguments as Map<String, dynamic>?;
                  return MaterialPageRoute(
                    builder: (_) => SupportScreen(gymId: args?['gymId'] ?? ''),
                  );
                default:
                  return null;
              }
            },
          );
        },
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _checkingOnboarding = true;
  bool _onboardingCompleted = false;
  bool _checkingPasscode = false;
  bool _passcodeRequired = false;
  bool _passcodeVerified = false;
  bool _hasCheckedPasscode = false; // Track if we've already checked passcode settings
  final PasscodeService _passcodeService = PasscodeService();

  @override
  void initState() {
    super.initState();
    _checkOnboardingStatus();
  }

  Future<void> _checkOnboardingStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final completed = prefs.getBool('onboarding_completed') ?? false;
    
    if (mounted) {
      setState(() {
        _onboardingCompleted = completed;
        _checkingOnboarding = false;
      });
    }
  }

  Future<void> _checkPasscodeSettings() async {
    if (_hasCheckedPasscode) return; // Prevent multiple checks
    
    setState(() {
      _checkingPasscode = true;
      _hasCheckedPasscode = true;
    });
    
    try {
      final settings = await _passcodeService.getPasscodeSettings();
      final passcodeEnabled = settings['enabled'] ?? false;
      final passcodeType = settings['type'] ?? 'none';
      final hasPasscode = settings['hasPasscode'] ?? false;
      
      if (mounted) {
        final requiresPasscode = passcodeEnabled && passcodeType == 'app' && hasPasscode;
        
        setState(() {
          _passcodeRequired = requiresPasscode;
          _checkingPasscode = false;
        });

        // If passcode is required, show passcode dialog
        if (requiresPasscode && !_passcodeVerified) {
          await _showPasscodeDialog();
        } else if (!requiresPasscode) {
          // No passcode required, mark as verified
          setState(() => _passcodeVerified = true);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _passcodeRequired = false;
          _checkingPasscode = false;
          _passcodeVerified = true; // Allow access on error
        });
      }
    }
  }

  Future<void> _showPasscodeDialog() async {
    if (!mounted) return;
    
    final passcode = await PasscodeDialog.show(
      context,
      title: 'Enter Passcode',
      subtitle: 'Enter your passcode to continue',
      isSetup: false,
      dismissible: true, // Show cancel button to allow logout
      onVerify: (code) async {
        return await _passcodeService.verifyPasscode(code);
      },
    );

    if (!mounted) return;

    if (passcode != null) {
      // Passcode verified successfully
      if (mounted) {
        setState(() => _passcodeVerified = true);
      }
    } else {
      // If dialog was dismissed/cancelled, log out
      if (mounted) {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        authProvider.logout();
      }
    }
  }

  void _resetPasscodeCheck() {
    // Reset passcode check when logging out
    if (mounted) {
      setState(() {
        _hasCheckedPasscode = false;
        _passcodeVerified = false;
        _passcodeRequired = false;
        _checkingPasscode = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingOnboarding) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (!_onboardingCompleted) {
      return const OnboardingScreen();
    }

    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isLoggedIn) {
          // Check passcode settings only once when user logs in
          if (!_hasCheckedPasscode && !_checkingPasscode) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && !_hasCheckedPasscode) {
                _checkPasscodeSettings();
              }
            });
          }

          // Show loading while checking passcode
          if (_checkingPasscode) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }

          // If passcode is required but not verified, show loading
          // (dialog should be shown by _showPasscodeDialog)
          if (_passcodeRequired && !_passcodeVerified) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }

          // Show dashboard if no passcode required or passcode verified
          return const DashboardScreen();
        } else {
          // Reset passcode state when logged out
          if (_hasCheckedPasscode || _passcodeVerified) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _resetPasscodeCheck();
            });
          }
          return const LoginScreen();
        }
      },
    );
  }
}
