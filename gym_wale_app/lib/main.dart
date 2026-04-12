import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'firebase_options.dart';
import 'config/api_config.dart';
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
      final rawBase = ApiConfig.baseUrlWithoutApi;
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
  late final AnimationController _shimmerController;
  late final Animation<double> _fadeAnim;
  late final Animation<Offset> _slideAnim;
  late final Animation<double> _pulseAnim;

  // Brand colors
  static const Color _brandIndigo = Color(0xFF3F51B5);
  static const Color _brandOrange = Color.fromARGB(255, 238, 165, 7);
  static const Color _tealAccent = Color(0xFF2A9D8F);

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

    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _fadeController.forward();
    _slideController.forward();

    _initializeApp();
  }

  Future<void> _initializeApp() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final geofencingService = Provider.of<GeofencingService>(context, listen: false);
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    bool restoredGeofence = false;

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

    // Request permissions only on mobile platforms.
    if (!kIsWeb) {
      await _requestPermissions();
    }

    // Restore geofence only when the user is authenticated — never auto-start
    // location tracking or foreground service for a logged-out user.
    if (authProvider.isAuthenticated) {
      try {
        restoredGeofence = await geofencingService.restoreGeofenceFromPreferences();
        if (restoredGeofence) {
          final restoredGymId = geofencingService.currentGymId;
          if (restoredGymId != null) {
            debugPrint('[MAIN] Loading attendance settings after restore for gym: $restoredGymId');
            await attendanceProvider.loadAttendanceSettings(restoredGymId);
          }
        }
      } catch (e) {
        print('[GEOFENCE] Error restoring geofence: $e');
      }

      // Fallback: if nothing was restored, bootstrap geofencing from active
      // memberships here so attendance works even before HomeScreen logic runs.
      if (!restoredGeofence && !geofencingService.isServiceRunning) {
        await _bootstrapGeofenceFromMemberships(attendanceProvider, geofencingService);
      }
    } else if (!kIsWeb) {
      try {
        await ForegroundTaskService().stopService();
      } catch (_) {}
    }

    // Add a small delay for splash screen effect
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      Widget destination;
      if (kIsWeb) {
        destination = const HomeScreen();
      } else if (authProvider.isAuthenticated) {
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

  Future<void> _bootstrapGeofenceFromMemberships(
    AttendanceProvider attendanceProvider,
    GeofencingService geofencingService,
  ) async {
    try {
      final activeMemberships = await ApiService.getActiveMemberships();
      if (activeMemberships.isEmpty) return;

      for (final membership in activeMemberships) {
        final isFrozen = membership['currentlyFrozen'] == true;
        if (isFrozen) continue;

        String? gymId;
        if (membership['gymId'] != null) {
          gymId = membership['gymId'].toString();
        } else if (membership['gym']?['_id'] != null) {
          gymId = membership['gym']['_id'].toString();
        } else if (membership['gym']?['id'] != null) {
          gymId = membership['gym']['id'].toString();
        }
        if (gymId == null || gymId.isEmpty) continue;

        final response = await ApiService.getGymAttendanceSettings(gymId);
        if (response['success'] != true) continue;

        final settings = response['settings'];
        if (settings is! Map<String, dynamic>) continue;

        final geofenceEnabled = settings['geofenceEnabled'] == true ||
            settings['mode'] == 'geofence' ||
            settings['mode'] == 'hybrid';
        if (!geofenceEnabled) continue;

        debugPrint('[MAIN] Bootstrapping geofence from active membership for gym: $gymId');
        final setupOk = await attendanceProvider.setupGeofencingWithSettings(gymId);
        if (setupOk || geofencingService.isServiceRunning) {
          break;
        }
      }
    } catch (e) {
      debugPrint('[MAIN] Geofence bootstrap skipped: $e');
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    _pulseController.dispose();
    _shimmerController.dispose();
    super.dispose();
  }

  /// Request necessary permissions for the app
  Future<void> _requestPermissions() async {
    try {
      LocationPermission locationPermission = await LocationService.checkPermission();
      if (locationPermission == LocationPermission.denied ||
          locationPermission == LocationPermission.deniedForever) {
        await LocationService.requestPermission();
      }
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
        gradientColors: const [Color(0xFF1A1A2E), Color(0xFF16213E)],
        iconColor: _tealAccent,
        showGlowOverlays: true,
        child: SafeArea(
          child: Center(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo
                    Container(
                      width: 110,
                      height: 110,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [
                            _tealAccent.withOpacity(0.2),
                            _brandIndigo.withOpacity(0.15),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: Border.all(
                          color: _tealAccent.withOpacity(0.4),
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _tealAccent.withOpacity(0.25),
                            blurRadius: 30,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 70,
                          height: 70,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.fitness_center_rounded,
                            size: 52,
                            color: _tealAccent,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Brand Name: Gym(indigo)-wale(orange)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          'Gym',
                          style: TextStyle(
                            color: _brandIndigo,
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                            height: 1.1,
                            shadows: [
                              Shadow(
                                color: _brandIndigo.withOpacity(0.4),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '-',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 48,
                            fontWeight: FontWeight.w300,
                            height: 1.1,
                          ),
                        ),
                        Text(
                          'wale',
                          style: TextStyle(
                            color: _brandOrange,
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                            height: 1.1,
                            shadows: [
                              Shadow(
                                color: _brandOrange.withOpacity(0.4),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Featured tagline
                    AnimatedBuilder(
                      animation: _shimmerController,
                      builder: (_, __) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 22, vertical: 10),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                _tealAccent.withOpacity(0.15),
                                _brandIndigo.withOpacity(0.1),
                                _tealAccent.withOpacity(0.15),
                              ],
                              stops: [
                                0.0,
                                _shimmerController.value,
                                1.0,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                              color: _tealAccent.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            'Complete Fitness Solutions',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
                            ),
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 48),

                    // Feature pills with teal accent
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _SplashPill(Icons.explore_rounded, 'Find Gyms', _tealAccent),
                        _SplashPill(Icons.calendar_month_rounded, 'Book Plans', _tealAccent),
                        _SplashPill(Icons.bolt_rounded, 'Track Progress', _tealAccent),
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
                                child: LinearProgressIndicator(
                                  backgroundColor: Colors.white12,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      _tealAccent),
                                  minHeight: 3,
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'Getting things ready...',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.5),
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
}

class _SplashPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color accentColor;
  const _SplashPill(this.icon, this.label, this.accentColor);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: accentColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: accentColor.withOpacity(0.3), width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: accentColor.withOpacity(0.8), size: 16),
          const SizedBox(width: 7),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.85),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
