import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart' as carousel;
import 'package:flutter_animate/flutter_animate.dart';
import '../config/app_theme.dart';
import '../models/banner_offer.dart';

class OfferCarousel extends StatefulWidget {
  final List<BannerOffer> offers;
  final Function(BannerOffer)? onOfferTap;

  const OfferCarousel({
    Key? key,
    required this.offers,
    this.onOfferTap,
  }) : super(key: key);

  @override
  State<OfferCarousel> createState() => _OfferCarouselState();
}

class _OfferCarouselState extends State<OfferCarousel> with TickerProviderStateMixin {
  final carousel.CarouselSliderController _carouselController = carousel.CarouselSliderController();
  int _currentPage = 0;
  late AnimationController _floatingController;
  late AnimationController _rotationController;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    
    // Floating animation (up and down motion)
    _floatingController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    )..repeat(reverse: true);
    
    // Rotation animation (subtle spin)
    _rotationController = AnimationController(
      duration: const Duration(milliseconds: 4000),
      vsync: this,
    )..repeat(reverse: true);
    
    // Pulse animation (breathing effect)
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _floatingController.dispose();
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.offers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        carousel.CarouselSlider.builder(
          carouselController: _carouselController,
          itemCount: widget.offers.length,
          options: carousel.CarouselOptions(
            height: 180,
            viewportFraction: 0.88,
            enlargeCenterPage: true,
            enlargeFactor: 0.25,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 5),
            autoPlayAnimationDuration: const Duration(milliseconds: 800),
            autoPlayCurve: Curves.easeInOutCubic,
            pauseAutoPlayOnTouch: true,
            onPageChanged: (index, reason) {
              setState(() {
                _currentPage = index;
              });
            },
          ),
          itemBuilder: (context, index, realIndex) {
            final offer = widget.offers[index];
            return _buildPremiumCard(offer, index);
          },
        ),
        const SizedBox(height: 16),
        // Animated Indicators
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            widget.offers.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: _currentPage == index ? 28 : 8,
              height: 8,
              decoration: BoxDecoration(
                gradient: _currentPage == index
                    ? LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                      )
                    : null,
                color: _currentPage == index ? null : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(4),
                boxShadow: _currentPage == index
                    ? [
                        BoxShadow(
                          color: AppTheme.primaryColor.withOpacity(0.4),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPremiumCard(BannerOffer offer, int index) {
    return GestureDetector(
      onTap: () => widget.onOfferTap?.call(offer),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        decoration: BoxDecoration(
          gradient: _getPremiumGradient(offer.type),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: _getColorForType(offer.type).withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
              spreadRadius: 0,
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Animated background circles
            _buildFloatingCircles(offer.type),
            
            // Glass morphism overlay
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withOpacity(0.1),
                    Colors.white.withOpacity(0.05),
                  ],
                ),
              ),
            ),
            
            // Main content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  // Left side - Animated Icon
                  _buildFloatingIcon(offer),
                  
                  const SizedBox(width: 16),
                  
                  // Right side - Content
                  Expanded(
                    child: _buildCardContent(offer),
                  ),
                ],
              ),
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(duration: 400.ms, delay: (index * 100).ms)
          .slideX(begin: 0.2, end: 0, duration: 500.ms, curve: Curves.easeOutCubic)
          .scale(begin: const Offset(0.9, 0.9), delay: (index * 100).ms),
    );
  }

  Widget _buildFloatingIcon(BannerOffer offer) {
    return AnimatedBuilder(
      animation: Listenable.merge([_floatingController, _rotationController, _pulseController]),
      builder: (context, child) {
        final floatValue = math.sin(_floatingController.value * 2 * math.pi) * 8;
        final rotateValue = _rotationController.value * 0.1 - 0.05;
        final pulseValue = 1.0 + (math.sin(_pulseController.value * 2 * math.pi) * 0.08);
        
        return Transform.translate(
          offset: Offset(0, floatValue),
          child: Transform.rotate(
            angle: rotateValue,
            child: Transform.scale(
              scale: pulseValue,
              child: Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withOpacity(0.3),
                      Colors.white.withOpacity(0.1),
                    ],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.white.withOpacity(0.2),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: Icon(
                  offer.icon ?? _getIconForType(offer.type),
                  size: 36,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCardContent(BannerOffer offer) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Type badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.25),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.white.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Text(
            _getLabelForType(offer.type),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 9,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
        )
            .animate(onPlay: (controller) => controller.repeat(reverse: true))
            .shimmer(duration: 2000.ms, color: Colors.white.withOpacity(0.3)),
        
        const SizedBox(height: 10),
        
        // Discount text
        if (offer.discountText != null)
          Text(
            offer.discountText!,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              height: 1,
              letterSpacing: -0.5,
            ),
          )
              .animate(onPlay: (controller) => controller.repeat())
              .shimmer(duration: 2500.ms, delay: 500.ms)
              .shake(duration: 1000.ms, hz: 0.5, curve: Curves.easeInOut),
        
        if (offer.discountText != null) const SizedBox(height: 6),
        
        // Title
        Text(
          offer.title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            height: 1.2,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        
        const SizedBox(height: 4),
        
        // Description
        Text(
          offer.description,
          style: TextStyle(
            color: Colors.white.withOpacity(0.85),
            fontSize: 11,
            height: 1.3,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        
        const SizedBox(height: 12),
        
        // CTA Button
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.15),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                offer.ctaText ?? 'Learn More',
                style: TextStyle(
                  color: _getColorForType(offer.type),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(width: 6),
              Icon(
                Icons.arrow_forward_rounded,
                size: 14,
                color: _getColorForType(offer.type),
              ),
            ],
          ),
        )
            .animate(onPlay: (controller) => controller.repeat(reverse: true))
            .scale(duration: 1500.ms, begin: const Offset(1, 1), end: const Offset(1.05, 1.05))
            .then()
            .scale(duration: 1500.ms, begin: const Offset(1.05, 1.05), end: const Offset(1, 1)),
      ],
    );
  }

  Widget _buildFloatingCircles(String type) {
    return Stack(
      children: [
        // Circle 1 - Top Right
        Positioned(
          right: -20,
          top: -20,
          child: AnimatedBuilder(
            animation: _floatingController,
            builder: (context, child) {
              final offset = math.sin(_floatingController.value * 2 * math.pi) * 10;
              return Transform.translate(
                offset: Offset(offset, -offset),
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        Colors.white.withOpacity(0.15),
                        Colors.white.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        
        // Circle 2 - Bottom Left
        Positioned(
          left: -30,
          bottom: -30,
          child: AnimatedBuilder(
            animation: _floatingController,
            builder: (context, child) {
              final offset = math.cos(_floatingController.value * 2 * math.pi) * 15;
              return Transform.translate(
                offset: Offset(-offset, offset),
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        Colors.white.withOpacity(0.12),
                        Colors.white.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        
        // Circle 3 - Center
        Positioned(
          right: 40,
          bottom: 20,
          child: AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = 1.0 + (math.sin(_pulseController.value * 2 * math.pi) * 0.2);
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        Colors.white.withOpacity(0.1),
                        Colors.white.withOpacity(0.0),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  LinearGradient _getPremiumGradient(String type) {
    switch (type.toLowerCase()) {
      case 'admin':
        return const LinearGradient(
          colors: [Color(0xFF667eea), Color(0xFF764ba2)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'gym':
        return const LinearGradient(
          colors: [Color(0xFF11998e), Color(0xFF38ef7d)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'diet':
        return const LinearGradient(
          colors: [Color(0xFFfa709a), Color(0xFFfee140)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'feature':
        return const LinearGradient(
          colors: [Color(0xFF4facfe), Color(0xFF00f2fe)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'tip':
        return const LinearGradient(
          colors: [Color(0xFFf093fb), Color(0xFFf5576c)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }

  Color _getColorForType(String type) {
    switch (type.toLowerCase()) {
      case 'admin':
        return const Color(0xFF667eea);
      case 'gym':
        return const Color(0xFF11998e);
      case 'diet':
        return const Color(0xFFfa709a);
      case 'feature':
        return const Color(0xFF4facfe);
      case 'tip':
        return const Color(0xFFf093fb);
      default:
        return AppTheme.primaryColor;
    }
  }

  IconData _getIconForType(String type) {
    switch (type.toLowerCase()) {
      case 'admin':
        return Icons.stars;
      case 'gym':
        return Icons.fitness_center;
      case 'diet':
        return Icons.restaurant_menu;
      case 'feature':
        return Icons.explore;
      case 'tip':
        return Icons.lightbulb_outline;
      default:
        return Icons.local_offer;
    }
  }

  String _getLabelForType(String type) {
    switch (type.toLowerCase()) {
      case 'admin':
        return 'SPECIAL OFFER';
      case 'gym':
        return 'GYM OFFER';
      case 'diet':
        return 'DIET PLAN';
      case 'feature':
        return 'APP FEATURE';
      case 'tip':
        return 'PRO TIP';
      default:
        return 'OFFER';
    }
  }
}
