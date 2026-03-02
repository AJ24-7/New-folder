import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding data model
// ─────────────────────────────────────────────────────────────────────────────
class _OnboardingPage {
  final String title;
  final String subtitle;
  final String description;
  final IconData icon;
  final List<Color> gradientColors;
  final List<_FeaturePill> features;

  const _OnboardingPage({
    required this.title,
    required this.subtitle,
    required this.description,
    required this.icon,
    required this.gradientColors,
    required this.features,
  });
}

class _FeaturePill {
  final IconData icon;
  final String label;
  const _FeaturePill(this.icon, this.label);
}

const List<_OnboardingPage> _pages = [
  _OnboardingPage(
    title: 'Find Your\nPerfect Gym',
    subtitle: 'Discover & Explore',
    description:
        'Browse hundreds of verified gyms near you. Compare facilities, trainers, and pricing — all in one place.',
    icon: Icons.explore_rounded,
    gradientColors: [Color(0xFF264653), Color(0xFF2A9D8F)],
    features: [
      _FeaturePill(Icons.location_on_rounded, 'Nearby Gyms'),
      _FeaturePill(Icons.star_rounded, 'Ratings & Reviews'),
      _FeaturePill(Icons.filter_list_rounded, 'Smart Filters'),
    ],
  ),
  _OnboardingPage(
    title: 'Book &\nManage Plans',
    subtitle: 'Hassle-Free Memberships',
    description:
        'Buy memberships, book sessions, and manage your fitness plans effortlessly from your phone.',
    icon: Icons.calendar_month_rounded,
    gradientColors: [Color(0xFF2A9D8F), Color(0xFF52B788)],
    features: [
      _FeaturePill(Icons.credit_card_rounded, 'Easy Payments'),
      _FeaturePill(Icons.receipt_long_rounded, 'Digital Receipts'),
      _FeaturePill(Icons.history_rounded, 'Plan History'),
    ],
  ),
  _OnboardingPage(
    title: 'Track Your\nProgress',
    subtitle: 'Stay Consistent',
    description:
        'Monitor attendance, workout streaks, and body stats. Let data fuel your motivation every day.',
    icon: Icons.show_chart_rounded,
    gradientColors: [Color(0xFF52B788), Color(0xFFE9C46A)],
    features: [
      _FeaturePill(Icons.fitness_center_rounded, 'Workout Logs'),
      _FeaturePill(Icons.bolt_rounded, 'Streak Tracker'),
      _FeaturePill(Icons.bar_chart_rounded, 'Progress Stats'),
    ],
  ),
  _OnboardingPage(
    title: 'Smart\nAttendance',
    subtitle: 'Auto Check-In',
    description:
        'Geo-fenced auto check-in marks your attendance the moment you step into the gym — no manual effort.',
    icon: Icons.location_on_rounded,
    gradientColors: [Color(0xFFE9C46A), Color(0xFFF4A261)],
    features: [
      _FeaturePill(Icons.sensors_rounded, 'Geo-Fencing'),
      _FeaturePill(Icons.notifications_active_rounded, 'Smart Alerts'),
      _FeaturePill(Icons.verified_rounded, 'Auto Mark'),
    ],
  ),
  _OnboardingPage(
    title: 'Everything\nIn One App',
    subtitle: 'Your Fitness Hub',
    description:
        'QR check-ins, trainer connect, class schedules, diet plans, and more — all designed for your fitness journey.',
    icon: Icons.apps_rounded,
    gradientColors: [Color(0xFFF4A261), Color(0xFFE76F51)],
    features: [
      _FeaturePill(Icons.qr_code_scanner_rounded, 'QR Check-In'),
      _FeaturePill(Icons.person_rounded, 'Trainer Connect'),
      _FeaturePill(Icons.restaurant_menu_rounded, 'Diet Plans'),
    ],
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Screen
// ─────────────────────────────────────────────────────────────────────────────
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({Key? key}) : super(key: key);

  /// Call once at app start to decide whether to show onboarding.
  static Future<bool> shouldShow() async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool('onboarding_complete') ?? false);
  }

  /// Marks onboarding as complete so it never shows again.
  static Future<void> markComplete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_complete', true);
  }

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  // ── Controllers ──────────────────────────────────────────────────────────
  late final PageController _pageController;
  late final AnimationController _iconAnimController;
  late final AnimationController _bgAnimController;
  late final AnimationController _particleAnimController;
  late final AnimationController _textSlideController;
  late final AnimationController _pillAnimController;

  // ── Animations ───────────────────────────────────────────────────────────
  late Animation<double> _iconScale;
  late Animation<double> _iconRotate;
  late Animation<double> _bgAnim;
  late Animation<double> _textSlide;
  late Animation<double> _textFade;
  late Animation<double> _pillFade;

  int _currentPage = 0;

  @override
  void initState() {
    super.initState();

    _pageController = PageController();

    // Icon bounce + spin
    _iconAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _iconScale = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _iconAnimController, curve: Curves.elasticOut),
    );
    _iconRotate = Tween<double>(begin: -0.15, end: 0.0).animate(
      CurvedAnimation(parent: _iconAnimController, curve: Curves.easeOut),
    );

    // Subtle background gradient drift
    _bgAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
    _bgAnim = Tween<double>(begin: 0.0, end: 1.0).animate(_bgAnimController);

    // Floating particles
    _particleAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();

    // Text slide-up
    _textSlideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _textSlide = Tween<double>(begin: 40.0, end: 0.0).animate(
      CurvedAnimation(parent: _textSlideController, curve: Curves.easeOut),
    );
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _textSlideController, curve: Curves.easeIn),
    );

    // Feature pills appear
    _pillAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _pillFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pillAnimController, curve: Curves.easeIn),
    );

    _playEnterAnimations();
  }

  void _playEnterAnimations() {
    _iconAnimController.forward(from: 0);
    _textSlideController.forward(from: 0);
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _pillAnimController.forward(from: 0);
    });
  }

  void _onPageChanged(int index) {
    setState(() => _currentPage = index);
    _iconAnimController.forward(from: 0);
    _textSlideController.forward(from: 0);
    _pillAnimController.forward(from: 0);
  }

  Future<void> _completeOnboarding() async {
    await OnboardingScreen.markComplete();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (_, __, ___) => const LoginScreen(),
        transitionsBuilder: (_, animation, __, child) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, 0.08),
                end: Offset.zero,
              ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)),
              child: child,
            ),
          );
        },
      ),
    );
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOutCubic,
      );
    } else {
      _completeOnboarding();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _iconAnimController.dispose();
    _bgAnimController.dispose();
    _particleAnimController.dispose();
    _textSlideController.dispose();
    _pillAnimController.dispose();
    super.dispose();
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final page = _pages[_currentPage];
    final size = MediaQuery.of(context).size;
    final isLast = _currentPage == _pages.length - 1;

    return Scaffold(
      body: AnimatedContainer(
        duration: const Duration(milliseconds: 500),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: page.gradientColors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            // ── Floating particles background ─────────────────────────────
            AnimatedBuilder(
              animation: _particleAnimController,
              builder: (_, __) => CustomPaint(
                size: size,
                painter: _ParticlePainter(
                  progress: _particleAnimController.value,
                  colors: page.gradientColors,
                ),
              ),
            ),

            // ── Subtle BG wave ────────────────────────────────────────────
            AnimatedBuilder(
              animation: _bgAnim,
              builder: (_, __) => Positioned(
                bottom: -80 + (_bgAnim.value * 20),
                left: -60,
                right: -60,
                child: Container(
                  height: size.height * 0.45,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(200),
                  ),
                ),
              ),
            ),

            // ── Main content ──────────────────────────────────────────────
            SafeArea(
              child: Column(
                children: [
                  // Skip button row
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20.0, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Page counter chip
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${_currentPage + 1} / ${_pages.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        // Skip
                        if (!isLast)
                          TextButton(
                            onPressed: _completeOnboarding,
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                                side: BorderSide(
                                    color: Colors.white.withOpacity(0.5)),
                              ),
                            ),
                            child: const Text(
                              'Skip',
                              style: TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                          )
                        else
                          const SizedBox(width: 56),
                      ],
                    ),
                  ),

                  // ── PageView ──────────────────────────────────────────────
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: _onPageChanged,
                      itemCount: _pages.length,
                      itemBuilder: (context, index) {
                        return _buildPageContent(
                            context, _pages[index], size, index == _currentPage);
                      },
                    ),
                  ),

                  // ── Bottom controls ───────────────────────────────────────
                  _buildBottomControls(context, isLast),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPageContent(
      BuildContext context, _OnboardingPage page, Size size, bool isActive) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // ── Icon container with glow ────────────────────────────────────
          if (isActive)
            AnimatedBuilder(
              animation: _iconAnimController,
              builder: (_, __) => Transform.rotate(
                angle: _iconRotate.value,
                child: Transform.scale(
                  scale: _iconScale.value,
                  child: _buildIconContainer(page),
                ),
              ),
            )
          else
            _buildIconContainer(page),

          const SizedBox(height: 32),

          // ── Subtitle label ───────────────────────────────────────────────
          if (isActive)
            AnimatedBuilder(
              animation: _textSlideController,
              builder: (_, __) => Transform.translate(
                offset: Offset(0, _textSlide.value),
                child: Opacity(
                  opacity: _textFade.value,
                  child: _buildSubtitleChip(page),
                ),
              ),
            )
          else
            _buildSubtitleChip(page),

          const SizedBox(height: 14),

          // ── Title ─────────────────────────────────────────────────────────
          if (isActive)
            AnimatedBuilder(
              animation: _textSlideController,
              builder: (_, __) => Transform.translate(
                offset: Offset(0, _textSlide.value * 1.2),
                child: Opacity(
                  opacity: _textFade.value,
                  child: _buildTitle(page),
                ),
              ),
            )
          else
            _buildTitle(page),

          const SizedBox(height: 16),

          // ── Description ───────────────────────────────────────────────────
          if (isActive)
            AnimatedBuilder(
              animation: _textSlideController,
              builder: (_, __) => Transform.translate(
                offset: Offset(0, _textSlide.value * 1.4),
                child: Opacity(
                  opacity: _textFade.value,
                  child: _buildDescription(page),
                ),
              ),
            )
          else
            _buildDescription(page),

          const SizedBox(height: 28),

          // ── Feature pills ─────────────────────────────────────────────────
          if (isActive)
            AnimatedBuilder(
              animation: _pillAnimController,
              builder: (_, __) => Opacity(
                opacity: _pillFade.value,
                child: _buildFeaturePills(page),
              ),
            )
          else
            _buildFeaturePills(page),
        ],
      ),
    );
  }

  Widget _buildIconContainer(_OnboardingPage page) {
    return Container(
      width: 140,
      height: 140,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 40,
            offset: const Offset(0, 16),
          ),
          BoxShadow(
            color: Colors.white.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(-4, -4),
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
      ),
      child: Icon(
        page.icon,
        size: 68,
        color: Colors.white,
      ),
    );
  }

  Widget _buildSubtitleChip(_OnboardingPage page) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.4)),
      ),
      child: Text(
        page.subtitle,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildTitle(_OnboardingPage page) {
    return Text(
      page.title,
      textAlign: TextAlign.center,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 34,
        fontWeight: FontWeight.w800,
        height: 1.15,
        letterSpacing: -0.5,
      ),
    );
  }

  Widget _buildDescription(_OnboardingPage page) {
    return Text(
      page.description,
      textAlign: TextAlign.center,
      style: TextStyle(
        color: Colors.white.withOpacity(0.85),
        fontSize: 15,
        height: 1.6,
        fontWeight: FontWeight.w400,
      ),
    );
  }

  Widget _buildFeaturePills(_OnboardingPage page) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 10,
      runSpacing: 10,
      children: page.features
          .map((f) => _FeaturePillWidget(icon: f.icon, label: f.label))
          .toList(),
    );
  }

  Widget _buildBottomControls(BuildContext context, bool isLast) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 12, 28, 36),
      child: Column(
        children: [
          // Dots indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              _pages.length,
              (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: i == _currentPage ? 28 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: i == _currentPage
                      ? Colors.white
                      : Colors.white.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
          const SizedBox(height: 28),

          // Next / Get Started button
          SizedBox(
            width: double.infinity,
            height: 58,
            child: ElevatedButton(
              onPressed: _nextPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: _pages[_currentPage].gradientColors.last,
                elevation: 8,
                shadowColor: Colors.black.withOpacity(0.3),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: isLast
                    ? Row(
                        key: const ValueKey('start'),
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Get Started',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: _pages[_currentPage].gradientColors.last,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Icon(
                            Icons.rocket_launch_rounded,
                            size: 22,
                            color: _pages[_currentPage].gradientColors.last,
                          ),
                        ],
                      )
                    : Row(
                        key: const ValueKey('next'),
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Next',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: _pages[_currentPage].gradientColors.last,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Icon(
                            Icons.arrow_forward_rounded,
                            size: 22,
                            color: _pages[_currentPage].gradientColors.last,
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature pill widget
// ─────────────────────────────────────────────────────────────────────────────
class _FeaturePillWidget extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FeaturePillWidget({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withOpacity(0.35), width: 1.2),
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

// ─────────────────────────────────────────────────────────────────────────────
// Floating particle painter
// ─────────────────────────────────────────────────────────────────────────────
class _ParticlePainter extends CustomPainter {
  final double progress;
  final List<Color> colors;

  // Fixed seeds for deterministic positions
  static const List<double> _xSeeds = [
    0.1, 0.25, 0.45, 0.6, 0.78, 0.88, 0.15, 0.55, 0.72, 0.38,
    0.92, 0.05, 0.65, 0.82, 0.32,
  ];
  static const List<double> _ySeeds = [
    0.08, 0.22, 0.15, 0.35, 0.12, 0.28, 0.6, 0.72, 0.5, 0.85,
    0.65, 0.90, 0.42, 0.78, 0.55,
  ];
  static const List<double> _speedSeeds = [
    0.4, 0.6, 0.3, 0.8, 0.5, 0.7, 0.45, 0.65, 0.35, 0.75,
    0.55, 0.85, 0.42, 0.62, 0.52,
  ];
  static const List<double> _sizeSeeds = [
    3, 5, 2, 7, 4, 6, 3, 5, 4, 6, 2, 8, 3, 5, 4,
  ];

  const _ParticlePainter({required this.progress, required this.colors});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    for (int i = 0; i < _xSeeds.length; i++) {
      final speed = _speedSeeds[i];
      final particleProgress = (progress * speed + i * 0.07) % 1.0;

      final x = _xSeeds[i] * size.width +
          math.sin(particleProgress * 2 * math.pi + i) * 20;
      final y = _ySeeds[i] * size.height - particleProgress * size.height * 0.3;
      final wrappedY = y < -10 ? y + size.height + 10 : y;

      final opacity = (math.sin(particleProgress * math.pi)).clamp(0.05, 0.35);
      paint.color = Colors.white.withOpacity(opacity.toDouble());

      canvas.drawCircle(Offset(x, wrappedY), _sizeSeeds[i], paint);
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter old) => old.progress != progress;
}
