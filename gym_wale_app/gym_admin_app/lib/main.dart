import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:gym_admin_app/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
import 'widgets/passcode_dialog.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
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
    setState(() => _checkingPasscode = true);
    
    try {
      final settings = await _passcodeService.getPasscodeSettings();
      final passcodeEnabled = settings['passcodeEnabled'] ?? false;
      final passcodeType = settings['passcodeType'] ?? 'none';
      
      if (mounted) {
        setState(() {
          _passcodeRequired = passcodeEnabled && passcodeType == 'app';
          _checkingPasscode = false;
        });

        // If passcode is required, show passcode dialog
        if (_passcodeRequired) {
          _showPasscodeDialog();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _passcodeRequired = false;
          _checkingPasscode = false;
        });
      }
    }
  }

  Future<void> _showPasscodeDialog() async {
    final passcode = await PasscodeDialog.show(
      context,
      title: 'Enter Passcode',
      subtitle: 'Enter your passcode to continue',
      isSetup: false,
      dismissible: false,
    );

    if (passcode != null) {
      // Verify the passcode
      final isValid = await _passcodeService.verifyPasscode(passcode);
      
      if (isValid) {
        setState(() => _passcodeVerified = true);
      } else {
        // If verification failed, show error and log out
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Invalid passcode')),
          );
        }
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        authProvider.logout();
      }
    } else {
      // If dialog was dismissed, log out
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      authProvider.logout();
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
          // Check passcode settings when user logs in
          if (!_checkingPasscode && !_passcodeVerified && _passcodeRequired == false) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _checkPasscodeSettings();
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
          if (_passcodeVerified) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              setState(() {
                _passcodeVerified = false;
                _passcodeRequired = false;
              });
            });
          }
          return const LoginScreen();
        }
      },
    );
  }
}
