import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
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
import 'services/foreground_task_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'l10n/app_localizations.dart';
import 'services/location_service.dart';
import 'services/firebase_notification_service.dart';
import 'services/api_service.dart';
import 'widgets/floating_icons_background.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── flutter_foreground_task: must be called before runApp ──────────────────
  if (!kIsWeb) {
    FlutterForegroundTask.initCommunicationPort();
  }

  await dotenv.load(fileName: ".env");

  if (!kIsWeb) {
    // ── Configure & init the persistent foreground service ──────────────────
    ForegroundTaskService().init();

    // Persist the API base URL so the killed-app background isolate can call
    // the backend directly (it has no access to dotenv or ApiConfig).
    try {
      final rawBase = dotenv.env['API_BASE_URL'] ?? '';
      await ForegroundTaskService.persistApiBaseUrl(rawBase);
    } catch (_) {}
  }

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('Firebase initialized successfully');
    if (!kIsWeb) {
      await FirebaseNotificationService.instance.initialize();
    }
  } catch (e) {
    print('Error initializing Firebase: $e');
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
          // WithForegroundTask ensures the foreground service communication
          // port stays alive while the app is in the foreground.
          // Not supported on web (dart:isolate unavailable).
          final app = MaterialApp(
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
          return kIsWeb ? app : WithForegroundTask(child: app);
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

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final AnimationController _slideController;
  late final AnimationController _pulseController;
  late final Animation<double> _fadeAnim;
  late final Animation<Offset> _slideAnim;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeController, curve: Curves.easeIn);

    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic));

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _fadeController.forward();
    _slideController.forward();

    _initializeApp();
  }

  Future<void> _initializeApp() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final geofencingService = Provider.of<GeofencingService>(context, listen: false);
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    
    await authProvider.init();

    // Register FCM token with backend now that auth token is available.
    if (!kIsWeb) {
      final fcmToken = FirebaseNotificationService.instance.fcmToken;
      if (fcmToken != null && authProvider.isAuthenticated) {
        try {
          await ApiService.registerFcmToken(fcmToken);
        } catch (_) {}
      }
    }

    // Initialize local notification service
    await LocalNotificationService.instance.initialize();

    // Request permissions
    await _requestPermissions();
    
    // Restore geofence only when the user is authenticated — never auto-start
    // location tracking or foreground service for a logged-out user.
    if (authProvider.isAuthenticated) {
      try {
        final restored = await geofencingService.restoreGeofenceFromPreferences();
        // If the geofence was restored, also load attendance settings into the
        // AttendanceProvider so that isAutoMarkEnabled() / shouldAutoMarkEntry()
        // return the correct values for this session (fixes silent DWELL skip).
        if (restored) {
          final restoredGymId = geofencingService.currentGymId;
          if (restoredGymId != null) {
            debugPrint('[MAIN] Loading attendance settings after restore for gym: $restoredGymId');
            await attendanceProvider.loadAttendanceSettings(restoredGymId);
          }
        }
      } catch (e) {
        print('[GEOFENCE] Error restoring geofence: $e');
      }
    } else {
      // User is logged out — ensure any lingering foreground service is stopped
      // so no attendance notification or GPS polling occurs.
      try {
        await ForegroundTaskService().stopService();
      } catch (_) {}
    }

    // Add a small delay for splash screen effect
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      Widget destination;
      if (authProvider.isAuthenticated) {
        destination = const HomeScreen();
      } else if (await OnboardingScreen.shouldShow()) {
        destination = const OnboardingScreen();
      } else {
        destination = const LoginScreen();
      }
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => destination),
      );
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    _pulseController.dispose();
    super.dispose();
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
      body: FloatingIconsBackground(
        gradientColors: const [Color(0xFF264653), Color(0xFF2A9D8F)],
        child: SafeArea(
          child: Center(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Feature highlights row
                    _buildFeatureRow(
                      Icons.fitness_center_rounded,
                      Icons.show_chart_rounded,
                      Icons.location_on_rounded,
                    ),

                    const SizedBox(height: 40),

                    // App Name
                    const Text(
                      'Gym-wale',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 46,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.5,
                        height: 1.1,
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Subtitle chip
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.3),
                        ),
                      ),
                      child: const Text(
                        'Your Fitness Partner',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),

                    const SizedBox(height: 48),

                    // Feature pills
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 10,
                      runSpacing: 10,
                      children: const [
                        _SplashPill(Icons.explore_rounded, 'Find Gyms'),
                        _SplashPill(Icons.calendar_month_rounded, 'Book Plans'),
                        _SplashPill(Icons.bolt_rounded, 'Track Progress'),
                      ],
                    ),

                    const SizedBox(height: 56),

                    // Loading indicator
                    AnimatedBuilder(
                      animation: _pulseAnim,
                      builder: (_, __) => Opacity(
                        opacity: _pulseAnim.value,
                        child: Column(
                          children: [
                            SizedBox(
                              width: 180,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: const LinearProgressIndicator(
                                  backgroundColor: Colors.white24,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.white),
                                  minHeight: 3,
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'Getting things ready...',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.7),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureRow(IconData a, IconData b, IconData c) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildGlowIcon(a, 56),
        const SizedBox(width: 20),
        _buildGlowIcon(b, 64),
        const SizedBox(width: 20),
        _buildGlowIcon(c, 56),
      ],
    );
  }

  Widget _buildGlowIcon(IconData icon, double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withOpacity(0.25), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withOpacity(0.08),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Icon(icon, color: Colors.white, size: size * 0.48),
    );
  }
}

class _SplashPill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SplashPill(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withOpacity(0.3), width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 16),
          const SizedBox(width: 7),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
