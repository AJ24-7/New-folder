import 'dart:math' as math;
import 'package:flutter/material.dart';

/// A floating-icons background used across splash, login, and register screens
/// to provide a consistent modern look matching the onboarding style.
class FloatingIconsBackground extends StatefulWidget {
  /// Gradient colors for the background. Defaults to the onboarding palette.
  final List<Color> gradientColors;

  /// Color used for the floating icons. Defaults to white.
  final Color iconColor;

  /// Optional child rendered above the background.
  final Widget? child;

  /// Whether to show the radial glow overlay effects.
  final bool showGlowOverlays;

  const FloatingIconsBackground({
    Key? key,
    this.gradientColors = const [Color(0xFF264653), Color(0xFF2A9D8F)],
    this.iconColor = Colors.white,
    this.child,
    this.showGlowOverlays = false,
  }) : super(key: key);

  @override
  State<FloatingIconsBackground> createState() =>
      _FloatingIconsBackgroundState();
}

class _FloatingIconsBackgroundState extends State<FloatingIconsBackground>
    with TickerProviderStateMixin {
  late final AnimationController _floatController;
  late final AnimationController _gradientController;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
    _gradientController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _floatController.dispose();
    _gradientController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return AnimatedBuilder(
      animation: _gradientController,
      builder: (_, __) {
        final t = _gradientController.value;
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: widget.gradientColors,
              begin: Alignment.lerp(
                  Alignment.topLeft, Alignment.topRight, t)!,
              end: Alignment.lerp(
                  Alignment.bottomRight, Alignment.bottomLeft, t)!,
            ),
          ),
          child: Stack(
            children: [
              // Floating icons
              AnimatedBuilder(
                animation: _floatController,
                builder: (_, __) => CustomPaint(
                  size: size,
                  painter: _FloatingIconsPainter(
                    progress: _floatController.value,
                    iconColor: widget.iconColor,
                  ),
                ),
              ),
              // Radial glow overlays for premium feel
              if (widget.showGlowOverlays) ...[
                Positioned(
                  top: -size.height * 0.15,
                  left: -size.width * 0.2,
                  child: Container(
                    width: size.width * 0.7,
                    height: size.width * 0.7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          const Color(0xFF2A9D8F).withOpacity(0.18),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -size.height * 0.1,
                  right: -size.width * 0.15,
                  child: Container(
                    width: size.width * 0.6,
                    height: size.width * 0.6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          const Color(0xFF3F51B5).withOpacity(0.12),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
              ],
              // Subtle wave overlay
              Positioned(
                bottom: -100 + (t * 30),
                left: -80,
                right: -80,
                child: Container(
                  height: size.height * 0.4,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(220),
                  ),
                ),
              ),
              Positioned(
                top: -120 + (t * 20),
                left: -60,
                right: -60,
                child: Container(
                  height: size.height * 0.3,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(180),
                  ),
                ),
              ),
              if (widget.child != null) widget.child!,
            ],
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Painter that draws floating fitness-related icons
// ─────────────────────────────────────────────────────────────────────────────

class _FloatingIcon {
  final double xSeed;
  final double ySeed;
  final double speed;
  final double size;
  final int codePoint;

  const _FloatingIcon({
    required this.xSeed,
    required this.ySeed,
    required this.speed,
    required this.size,
    required this.codePoint,
  });
}

class _FloatingIconsPainter extends CustomPainter {
  final double progress;
  final Color iconColor;

  const _FloatingIconsPainter({required this.progress, required this.iconColor});

  // Pre-defined floating icons with deterministic positions
  static final List<_FloatingIcon> _icons = [
    _FloatingIcon(xSeed: 0.08, ySeed: 0.12, speed: 0.35, size: 28, codePoint: Icons.fitness_center.codePoint),
    _FloatingIcon(xSeed: 0.85, ySeed: 0.08, speed: 0.5, size: 24, codePoint: Icons.directions_run.codePoint),
    _FloatingIcon(xSeed: 0.22, ySeed: 0.35, speed: 0.45, size: 22, codePoint: Icons.favorite.codePoint),
    _FloatingIcon(xSeed: 0.72, ySeed: 0.28, speed: 0.55, size: 26, codePoint: Icons.restaurant_menu.codePoint),
    _FloatingIcon(xSeed: 0.48, ySeed: 0.05, speed: 0.4, size: 20, codePoint: Icons.calendar_month.codePoint),
    _FloatingIcon(xSeed: 0.92, ySeed: 0.45, speed: 0.6, size: 24, codePoint: Icons.timer.codePoint),
    _FloatingIcon(xSeed: 0.15, ySeed: 0.65, speed: 0.38, size: 26, codePoint: Icons.sports_gymnastics.codePoint),
    _FloatingIcon(xSeed: 0.62, ySeed: 0.55, speed: 0.52, size: 22, codePoint: Icons.show_chart.codePoint),
    _FloatingIcon(xSeed: 0.38, ySeed: 0.78, speed: 0.42, size: 28, codePoint: Icons.self_improvement.codePoint),
    _FloatingIcon(xSeed: 0.78, ySeed: 0.72, speed: 0.48, size: 20, codePoint: Icons.emoji_events.codePoint),
    _FloatingIcon(xSeed: 0.05, ySeed: 0.88, speed: 0.55, size: 24, codePoint: Icons.local_fire_department.codePoint),
    _FloatingIcon(xSeed: 0.55, ySeed: 0.92, speed: 0.36, size: 22, codePoint: Icons.monitor_weight.codePoint),
    _FloatingIcon(xSeed: 0.30, ySeed: 0.48, speed: 0.58, size: 18, codePoint: Icons.water_drop.codePoint),
    _FloatingIcon(xSeed: 0.88, ySeed: 0.85, speed: 0.44, size: 20, codePoint: Icons.bolt.codePoint),
    _FloatingIcon(xSeed: 0.42, ySeed: 0.22, speed: 0.50, size: 24, codePoint: Icons.location_on.codePoint),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (int i = 0; i < _icons.length; i++) {
      final icon = _icons[i];
      final p = (progress * icon.speed + i * 0.067) % 1.0;

      // Floating motion
      final x = icon.xSeed * size.width +
          math.sin(p * 2 * math.pi + i * 0.8) * 18;
      final baseY = icon.ySeed * size.height;
      final y = baseY + math.cos(p * 2 * math.pi + i * 1.2) * 14;

      // Pulsing opacity
      final opacity =
          (0.08 + 0.14 * math.sin(p * math.pi + i * 0.5)).clamp(0.04, 0.22);

      textPainter.text = TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontSize: icon.size.toDouble(),
          fontFamily: 'MaterialIcons',
          color: iconColor.withOpacity(opacity),
        ),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x, y));
    }
  }

  @override
  bool shouldRepaint(_FloatingIconsPainter old) =>
      old.progress != progress || old.iconColor != iconColor;
}
