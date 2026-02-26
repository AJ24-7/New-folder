import 'package:flutter/material.dart';
import '../config/app_theme.dart';

class OfferCarouselTemplate {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final List<Color> gradientColors;
  final String pattern;
  final Widget Function(BuildContext context, String title, String subtitle) builder;

  OfferCarouselTemplate({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.gradientColors,
    required this.pattern,
    required this.builder,
  });
}

class OfferCarouselTemplates {
  static final List<OfferCarouselTemplate> templates = [
    // Template 1: Modern Gradient Card
    OfferCarouselTemplate(
      id: 'modern_gradient',
      name: 'Modern Gradient',
      description: 'Sleek gradient design with modern aesthetics',
      icon: Icons.gradient,
      gradientColors: [Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFD946EF)],
      pattern: 'gradient_diagonal',
      builder: (context, title, subtitle) => _ModernGradientCard(title: title, subtitle: subtitle),
    ),
    
    // Template 2: Bold Accent Banner
    OfferCarouselTemplate(
      id: 'bold_accent',
      name: 'Bold Accent',
      description: 'Eye-catching design with bold accents',
      icon: Icons.flash_on,
      gradientColors: [Color(0xFFFF6B6B), Color(0xFFFF8E53)],
      pattern: 'accent_border',
      builder: (context, title, subtitle) => _BoldAccentBanner(title: title, subtitle: subtitle),
    ),
    
    // Template 3: Minimal Elegance
    OfferCarouselTemplate(
      id: 'minimal_elegant',
      name: 'Minimal Elegance',
      description: 'Clean and professional minimal design',
      icon: Icons.check_circle_outline,
      gradientColors: [Color(0xFF1E293B), Color(0xFF334155)],
      pattern: 'minimal_clean',
      builder: (context, title, subtitle) => _MinimalElegantCard(title: title, subtitle: subtitle),
    ),
    
    // Template 4: Vibrant Neon
    OfferCarouselTemplate(
      id: 'vibrant_neon',
      name: 'Vibrant Neon',
      description: 'High-energy neon style for gym vibes',
      icon: Icons.fitness_center,
      gradientColors: [Color(0xFF00F5FF), Color(0xFFFF00FF), Color(0xFFFFFF00)],
      pattern: 'neon_glow',
      builder: (context, title, subtitle) => _VibrantNeonCard(title: title, subtitle: subtitle),
    ),
    
    // Template 5: Premium Gold
    OfferCarouselTemplate(
      id: 'premium_gold',
      name: 'Premium Gold',
      description: 'Luxurious gold theme for premium offers',
      icon: Icons.star,
      gradientColors: [Color(0xFFFFD700), Color(0xFFFFA500), Color(0xFFFF8C00)],
      pattern: 'gold_luxury',
      builder: (context, title, subtitle) => _PremiumGoldCard(title: title, subtitle: subtitle),
    ),
    
    // Template 6: Fresh Spring
    OfferCarouselTemplate(
      id: 'fresh_spring',
      name: 'Fresh Spring',
      description: 'Refreshing green theme for new beginnings',
      icon: Icons.eco,
      gradientColors: [Color(0xFF10B981), Color(0xFF34D399), Color(0xFF6EE7B7)],
      pattern: 'spring_fresh',
      builder: (context, title, subtitle) => _FreshSpringCard(title: title, subtitle: subtitle),
    ),
    
    // Template 7: Sunset Vibes
    OfferCarouselTemplate(
      id: 'sunset_vibes',
      name: 'Sunset Vibes',
      description: 'Warm sunset gradient for evening offers',
      icon: Icons.wb_sunny,
      gradientColors: [Color(0xFFFF6B6B), Color(0xFFFFA500), Color(0xFFFFD700)],
      pattern: 'sunset_warm',
      builder: (context, title, subtitle) => _SunsetVibesCard(title: title, subtitle: subtitle),
    ),
    
    // Template 8: Ocean Blue
    OfferCarouselTemplate(
      id: 'ocean_blue',
      name: 'Ocean Blue',
      description: 'Calming ocean blue theme',
      icon: Icons.waves,
      gradientColors: [Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF60A5FA)],
      pattern: 'ocean_waves',
      builder: (context, title, subtitle) => _OceanBlueCard(title: title, subtitle: subtitle),
    ),
    
    // Template 9: Monochrome Classic
    OfferCarouselTemplate(
      id: 'monochrome_classic',
      name: 'Monochrome',
      description: 'Timeless black and white design',
      icon: Icons.contrast,
      gradientColors: [Color(0xFF000000), Color(0xFF404040), Color(0xFF808080)],
      pattern: 'monochrome_stripes',
      builder: (context, title, subtitle) => _MonochromeClassicCard(title: title, subtitle: subtitle),
    ),
    
    // Template 10: Fire Energy
    OfferCarouselTemplate(
      id: 'fire_energy',
      name: 'Fire Energy',
      description: 'High-intensity fire theme for motivation',
      icon: Icons.local_fire_department,
      gradientColors: [Color(0xFFDC2626), Color(0xFFEF4444), Color(0xFFF97316)],
      pattern: 'fire_flames',
      builder: (context, title, subtitle) => _FireEnergyCard(title: title, subtitle: subtitle),
    ),
  ];

  static OfferCarouselTemplate? getTemplateById(String id) {
    try {
      return templates.firstWhere((template) => template.id == id);
    } catch (e) {
      return null;
    }
  }
}

// Template Card Widgets

class _ModernGradientCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _ModernGradientCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFD946EF)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF8B5CF6).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -30,
            top: -30,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BoldAccentBanner extends StatelessWidget {
  final String title;
  final String subtitle;

  const _BoldAccentBanner({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Color(0xFFFF6B6B), width: 4),
        boxShadow: [
          BoxShadow(
            color: Color(0xFFFF6B6B).withValues(alpha: 0.3),
            blurRadius: 15,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            child: Container(
              width: 10,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFFF6B6B), Color(0xFFFF8E53)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFFF6B6B),
                    letterSpacing: 1.5,
                  ),
                  textAlign: TextAlign.right,
                ),
                SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 16,
                    color: Color(0xFF334155),
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.right,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MinimalElegantCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _MinimalElegantCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 4,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.white, Colors.white.withValues(alpha: 0.3)],
                ),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            SizedBox(height: 20),
            Text(
              title,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w300,
                color: Colors.white,
                letterSpacing: 3,
              ),
            ),
            SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.7),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VibrantNeonCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _VibrantNeonCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Color(0xFF00F5FF), width: 2),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF00F5FF).withValues(alpha: 0.5),
            blurRadius: 30,
            offset: Offset(0, 0),
          ),
          BoxShadow(
            color: Color(0xFFFF00FF).withValues(alpha: 0.3),
            blurRadius: 30,
            offset: Offset(0, 0),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ShaderMask(
              shaderCallback: (bounds) => LinearGradient(
                colors: [Color(0xFF00F5FF), Color(0xFFFF00FF), Color(0xFFFFFF00)],
              ).createShader(bounds),
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: 2,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.9),
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _PremiumGoldCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _PremiumGoldCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFD700), Color(0xFFFFA500), Color(0xFFFF8C00)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFFFFD700).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _GoldPatternPainter(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.workspace_premium, size: 40, color: Colors.white),
                SizedBox(height: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.2,
                    shadows: [
                      Shadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        offset: Offset(2, 2),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withValues(alpha: 0.95),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FreshSpringCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _FreshSpringCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF10B981), Color(0xFF34D399), Color(0xFF6EE7B7)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF10B981).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -10,
            child: Icon(
              Icons.local_florist,
              size: 120,
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.white.withValues(alpha: 0.95),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SunsetVibesCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SunsetVibesCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFF6B6B), Color(0xFFFFA500), Color(0xFFFFD700)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFFFFA500).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wb_twilight, size: 50, color: Colors.white),
            SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1.2,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.95),
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _OceanBlueCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _OceanBlueCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF60A5FA)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF3B82F6).withValues(alpha: 0.4),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _WavePatternPainter(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.white.withValues(alpha: 0.95),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MonochromeClassicCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _MonochromeClassicCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'EXCLUSIVE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                  letterSpacing: 2,
                ),
              ),
            ),
            SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1.5,
              ),
            ),
            SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.9),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FireEnergyCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _FireEnergyCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFDC2626), Color(0xFFEF4444), Color(0xFFF97316)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFFEF4444).withValues(alpha: 0.5),
            blurRadius: 30,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(
              Icons.local_fire_department,
              size: 150,
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Icon(Icons.local_fire_department, color: Colors.white, size: 32),
                    SizedBox(width: 8),
                    Text(
                      'HOT DEAL',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withValues(alpha: 0.95),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Custom Painters for Patterns

class _GoldPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    for (var i = 0; i < 5; i++) {
      final rect = Rect.fromLTWH(
        size.width * 0.7 + i * 10,
        -20 + i * 10,
        60,
        60,
      );
      canvas.drawOval(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _WavePatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path();
    for (var i = 0; i < 3; i++) {
      path.moveTo(0, size.height * 0.5 + i * 20);
      for (var x = 0; x < size.width; x += 20) {
        path.quadraticBezierTo(
          x + 10,
          size.height * 0.5 + i * 20 - 10,
          x + 20,
          size.height * 0.5 + i * 20,
        );
      }
      canvas.drawPath(path, paint);
      path.reset();
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Carousel Template Selector Widget
class OfferCarouselTemplateSelector extends StatefulWidget {
  final String? selectedTemplateId;
  final Function(String templateId) onTemplateSelected;

  const OfferCarouselTemplateSelector({
    Key? key,
    this.selectedTemplateId,
    required this.onTemplateSelected,
  }) : super(key: key);

  @override
  State<OfferCarouselTemplateSelector> createState() => _OfferCarouselTemplateSelectorState();
}

class _OfferCarouselTemplateSelectorState extends State<OfferCarouselTemplateSelector> {
  late String? _selectedId;
  final PageController _pageController = PageController(viewportFraction: 0.85);
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.selectedTemplateId;
    _pageController.addListener(() {
      int page = _pageController.page!.round();
      if (page != _currentPage) {
        setState(() => _currentPage = page);
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            'Choose a Template Design',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.titleLarge?.color,
            ),
          ),
        ),
        SizedBox(
          height: 250,
          child: PageView.builder(
            controller: _pageController,
            itemCount: OfferCarouselTemplates.templates.length,
            itemBuilder: (context, index) {
              final template = OfferCarouselTemplates.templates[index];
              final isSelected = _selectedId == template.id;
              final scale = _currentPage == index ? 1.0 : 0.9;

              return AnimatedScale(
                scale: scale,
                duration: Duration(milliseconds: 300),
                child: GestureDetector(
                  onTap: () {
                    setState(() => _selectedId = template.id);
                    widget.onTemplateSelected(template.id);
                    _pageController.animateToPage(
                      index,
                      duration: Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                  child: Container(
                    margin: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : Colors.transparent,
                        width: 3,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isSelected 
                              ? AppTheme.primaryColor.withValues(alpha: 0.3)
                              : Colors.black.withValues(alpha: 0.1),
                          blurRadius: isSelected ? 20 : 10,
                          offset: Offset(0, 5),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: template.builder(
                        context,
                        '50% OFF',
                        'Limited Time Offer',
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        SizedBox(height: 16),
        Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              OfferCarouselTemplates.templates.length,
              (index) => AnimatedContainer(
                duration: Duration(milliseconds: 300),
                margin: EdgeInsets.symmetric(horizontal: 4),
                width: _currentPage == index ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _currentPage == index 
                      ? AppTheme.primaryColor 
                      : Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
        ),
        if (_selectedId != null) ...[
          SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    OfferCarouselTemplates.templates[_currentPage].icon,
                    color: AppTheme.primaryColor,
                    size: 32,
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          OfferCarouselTemplates.templates[_currentPage].name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          OfferCarouselTemplates.templates[_currentPage].description,
                          style: TextStyle(
                            fontSize: 13,
                            color: Theme.of(context).textTheme.bodySmall?.color,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
