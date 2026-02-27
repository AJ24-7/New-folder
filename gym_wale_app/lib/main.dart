import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'firebase_options.dart';
import 'config/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/settings_provider.dart';
import 'providers/workout_provider.dart';
import 'providers/attendance_provider.dart';
import 'services/geofencing_service.dart';
import 'services/local_notification_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'l10n/app_localizations.dart';
import 'services/location_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('✅ Firebase initialized successfully');
  } catch (e) {
    print('❌ Error initializing Firebase: $e');
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => WorkoutProvider()),
        ChangeNotifierProvider(create: (_) => GeofencingService()),
        ChangeNotifierProxyProvider<GeofencingService, AttendanceProvider>(
          create: (_) => AttendanceProvider(),
          update: (context, geofencingService, previous) {
            final provider = previous ?? AttendanceProvider();
            provider.initializeGeofencingService(geofencingService);
            return provider;
          },
        ),
      ],
      child: Consumer2<ThemeProvider, LocaleProvider>(
        builder: (context, themeProvider, localeProvider, _) {
          return MaterialApp(
            title: 'Gym-wale',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.getThemeMode(),
            locale: localeProvider.locale,
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: LocaleProvider.supportedLocales,
            home: const SplashScreen(),
          );
        },
      ),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final geofencingService = Provider.of<GeofencingService>(context, listen: false);
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    
    await authProvider.init();

    // Initialize local notification service
    await LocalNotificationService.instance.initialize();

    // Request permissions
    await _requestPermissions();
    
    // Restore geofence if previously set up
    try {
      await geofencingService.restoreGeofenceFromPreferences();
    } catch (e) {
      print('[GEOFENCE] Error restoring geofence: $e');
    }

    // Add a small delay for splash screen effect
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => authProvider.isAuthenticated
              ? const HomeScreen()
              : const LoginScreen(),
        ),
      );
    }
  }

  /// Request necessary permissions for the app
  Future<void> _requestPermissions() async {
    try {
      // Request location permission
      LocationPermission locationPermission = await LocationService.checkPermission();
      
      if (locationPermission == LocationPermission.denied || 
          locationPermission == LocationPermission.deniedForever) {
        await LocationService.requestPermission();
      }
      
      // Request notification permission for Android 13+
      if (await Permission.notification.isDenied) {
        await Permission.notification.request();
      }
    } catch (e) {
      print('Error requesting permissions: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppTheme.primaryGradient,
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // App Logo
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(20),
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/logo.png',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return const Icon(
                        Icons.fitness_center,
                        size: 80,
                        color: AppTheme.primaryColor,
                      );
                    },
                  ),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // App Name
              const Text(
                'Gym-wale',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 42,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              ),
              
              const SizedBox(height: 8),
              
              const Text(
                'Your Fitness Partner',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 18,
                  letterSpacing: 0.5,
                ),
              ),
              
              const SizedBox(height: 48),
              
              // Loading Indicator
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
