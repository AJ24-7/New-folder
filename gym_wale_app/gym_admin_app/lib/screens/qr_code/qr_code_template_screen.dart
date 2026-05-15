import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/foundation.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:ui' as ui;
import '../../config/app_theme.dart';
import '../../utils/download_helper.dart';

class QRCodeTemplateScreen extends StatefulWidget {
  final String qrData;
  final String gymName;
  final String gymId;
  final String? gymLogoUrl;

  const QRCodeTemplateScreen({
    super.key,
    required this.qrData,
    required this.gymName,
    required this.gymId,
    this.gymLogoUrl,
  });

  @override
  State<QRCodeTemplateScreen> createState() => _QRCodeTemplateScreenState();
}

class _QRCodeTemplateScreenState extends State<QRCodeTemplateScreen>
    with TickerProviderStateMixin {
  final GlobalKey _templateKey = GlobalKey();
  bool _isDownloading = false;
  late List<AnimationController> _bgControllers;
  late List<Animation<double>> _bgAnimations;

  // ── Brand colors (fixed – never theme-dependent) ─────────────────
  static const Color _navy = Color(0xFF001F3F);
  static const Color _orange = Color(0xFFFF6B35);
  static const Color _midBlue = Color(0xFF0056B3);

  // ── Static watermark positions for the A4 printable template ─────
  // Each record: (leftFraction, topFraction, size, iconIndex)
  static const List<(double, double, double, int)> _tmplBgPos = [
    (0.04, 0.06, 28.0, 0),
    (0.87, 0.04, 22.0, 1),
    (0.93, 0.21, 20.0, 2),
    (0.01, 0.34, 26.0, 3),
    (0.89, 0.40, 18.0, 4),
    (0.05, 0.56, 22.0, 5),
    (0.84, 0.60, 24.0, 6),
    (0.07, 0.73, 18.0, 7),
    (0.91, 0.77, 20.0, 8),
    (0.02, 0.89, 16.0, 9),
    (0.87, 0.91, 18.0, 0),
    (0.46, 0.02, 20.0, 1),
    (0.50, 0.95, 16.0, 3),
    (0.42, 0.50, 14.0, 5),
    (0.66, 0.32, 16.0, 2),
  ];

  static const List<IconData> _gymIcons = [
    FontAwesomeIcons.dumbbell,
    FontAwesomeIcons.heartPulse,
    FontAwesomeIcons.personRunning,
    FontAwesomeIcons.fire,
    FontAwesomeIcons.trophy,
    FontAwesomeIcons.stopwatch,
    FontAwesomeIcons.bolt,
    FontAwesomeIcons.weightHanging,
    FontAwesomeIcons.medal,
    FontAwesomeIcons.bicycle,
  ];

  @override
  void initState() {
    super.initState();
    _bgControllers = List.generate(
      10,
      (i) => AnimationController(
        duration: Duration(seconds: 14 + i * 3),
        vsync: this,
      )..repeat(),
    );
    _bgAnimations = _bgControllers
        .map((c) => Tween<double>(begin: 0.0, end: 1.0)
            .animate(CurvedAnimation(parent: c, curve: Curves.linear)))
        .toList();
  }

  @override
  void dispose() {
    for (final c in _bgControllers) {
      c.dispose();
    }
    super.dispose();
  }

  // ── Download ─────────────────────────────────────────────────────

  Future<void> _downloadTemplate() async {
    setState(() => _isDownloading = true);
    try {
      // Allow the UI to settle before capture
      await Future.delayed(const Duration(milliseconds: 200));

      final boundary = _templateKey.currentContext?.findRenderObject()
          as RenderRepaintBoundary?;
      if (boundary == null) throw Exception('Template not ready for capture');

      // 3× pixel ratio → ~1785 × 2526 px (≈ A4 at 215 DPI, excellent for print)
      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) throw Exception('Failed to encode PNG');

      final bytes = byteData.buffer.asUint8List();
      final safeName =
          widget.gymName.replaceAll(RegExp(r'[^\w]'), '_').toLowerCase();
      final savedPath = await downloadFile(bytes, 'gym_wale_qr_$safeName.png');

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  kIsWeb ? 'Template downloaded!' : 'Saved to: $savedPath',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
          backgroundColor: AppTheme.successColor,
          duration: const Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Download failed: $e'),
          backgroundColor: AppTheme.errorColor,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  // ── Build ─────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 1000;
    // Scale the 595-px-wide template to fit available width
    final scale = isDesktop ? 1.0 : (screenWidth / 660.0).clamp(0.44, 1.0);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? AppTheme.darkBackgroundColor : const Color(0xFFF0F4F8),
      body: Stack(
        children: [
          // Animated floating icons – screen background, theme-aware
          ..._buildScreenBgIcons(isDark),
          SafeArea(
            child: Column(
              children: [
                _buildAppBar(context, isDark),
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(
                      horizontal: isDesktop ? 48 : 16,
                      vertical: 24,
                    ),
                    child: Column(
                      children: [
                        _buildInstructionsCard(isDark),
                        const SizedBox(height: 32),

                        // A4 template preview with correct layout sizing.
                        // SizedBox reserves the scaled visual footprint;
                        // OverflowBox lets the child render at its true 595×842
                        // so RepaintBoundary always captures the full A4 page.
                        Align(
                          alignment: Alignment.topCenter,
                          child: SizedBox(
                            width: 595.0 * scale,
                            height: 842.0 * scale,
                            child: OverflowBox(
                              maxWidth: 595.0,
                              maxHeight: 842.0,
                              alignment: Alignment.topCenter,
                              child: RepaintBoundary(
                                key: _templateKey,
                                child: _buildA4Template(),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 32),
                        _buildTipsCard(isDark),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Screen background – animated floating icons ───────────────────

  List<Widget> _buildScreenBgIcons(bool isDark) {
    return List.generate(10, (i) {
      final xFrac = ((i * 137 + 23) % 100) / 100.0;
      final size = 18.0 + (i % 4) * 8.0;
      final color = i % 2 == 0 ? _navy : _orange;
      return AnimatedBuilder(
        animation: _bgAnimations[i],
        builder: (context, _) {
          final h = MediaQuery.of(context).size.height;
          final w = MediaQuery.of(context).size.width;
          return Positioned(
            left: w * xFrac,
            top: h * _bgAnimations[i].value - size,
            child: Opacity(
              opacity: isDark ? 0.06 : 0.05,
              child: FaIcon(_gymIcons[i % _gymIcons.length],
                  size: size, color: color),
            ),
          );
        },
      );
    });
  }

  // ── App Bar ───────────────────────────────────────────────────────

  Widget _buildAppBar(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1B2132) : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: isDark ? Colors.white70 : _navy,
            ),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'QR Code Print Template',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : _navy,
                  ),
                ),
                Text(
                  'A4 · ${widget.gymName}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white54 : Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: _isDownloading ? null : _downloadTemplate,
            icon: _isDownloading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Icon(Icons.download_rounded, size: 18),
            label: Text(
              _isDownloading ? 'Downloading…' : 'Download PNG',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: _orange,
              foregroundColor: Colors.white,
              disabledBackgroundColor: Colors.grey.shade400,
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
              elevation: 2,
            ),
          ),
        ],
      ),
    );
  }

  // ── Instructions card (screen, theme-aware) ───────────────────────

  Widget _buildInstructionsCard(bool isDark) {
    final steps = [
      (_orange, Icons.download_rounded, 'Download',
          'Tap Download PNG above'),
      (_midBlue, Icons.print_rounded, 'Print A4',
          'Print portrait on A4 paper'),
      (_navy, Icons.storefront_rounded, 'Display',
          'Place at entrance or reception'),
      (_orange, Icons.qr_code_scanner_rounded, 'Members Scan',
          'Scan to register instantly'),
    ];

    return Container(
      constraints: const BoxConstraints(maxWidth: 720),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1B2132) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color:
              isDark ? Colors.white.withOpacity(0.07) : _navy.withOpacity(0.10),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.25 : 0.06),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [_navy, Color(0xFF003066)]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.lightbulb_outline_rounded,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                'How to Use This Template',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : _navy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...steps.asMap().entries.map((e) {
            final idx = e.key;
            final (color, icon, title, desc) = e.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                        color: color, shape: BoxShape.circle),
                    child: Center(
                      child: Text(
                        '${idx + 1}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Icon(icon, color: color, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        Text(
                          desc,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white54
                                : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // A4 TEMPLATE  (595 × 842 logical px – always white for printing)
  // ══════════════════════════════════════════════════════════════════

  Widget _buildA4Template() {
    return Container(
      width: 595,
      height: 842,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.20),
            blurRadius: 36,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Stack(
          children: [
            // Subtle radial gradient background
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment(0.0, -0.3),
                    radius: 1.2,
                    colors: [Color(0xFFFFFFFF), Color(0xFFF5F8FF)],
                  ),
                ),
              ),
            ),
            // Decorative corner circles
            Positioned(
              top: -70,
              right: -70,
              child: Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _orange.withOpacity(0.07),
                ),
              ),
            ),
            Positioned(
              bottom: -90,
              left: -90,
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _navy.withOpacity(0.05),
                ),
              ),
            ),
            // Static semi-transparent gym icon watermarks
            _buildTemplateBgIcons(),
            // Top accent bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 5,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [_navy, _midBlue, _orange],
                  ),
                ),
              ),
            ),
            // Main content
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(36, 22, 36, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildTemplateHeader(),
                    const SizedBox(height: 16),
                    _buildDividerBar(),
                    const SizedBox(height: 16),
                    _buildGymInfoBox(),
                    const SizedBox(height: 14),
                    Expanded(child: _buildQRSection()),
                    const SizedBox(height: 14),
                    _buildScanSteps(),
                    const SizedBox(height: 12),
                    _buildTemplateFooter(),
                  ],
                ),
              ),
            ),
            // Bottom accent bar
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 4,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [_orange, _midBlue, _navy],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTemplateBgIcons() {
    return Positioned.fill(
      child: Stack(
        children: _tmplBgPos.map((pos) {
          final (lf, tf, size, idx) = pos;
          return Positioned(
            left: 595.0 * lf,
            top: 842.0 * tf,
            child: Opacity(
              opacity: 0.07,
              child: FaIcon(
                _gymIcons[idx % _gymIcons.length],
                size: size,
                color: idx % 2 == 0 ? _navy : _orange,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // Header: real Gym-Wale logo image + brand name + tagline
  Widget _buildTemplateHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            width: 58,
            height: 58,
            child: Image.asset(
              'assets/images/gymadmin_white.png',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Container(
                color: _navy,
                child: const FaIcon(FontAwesomeIcons.dumbbell,
                    color: Colors.white, size: 28),
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RichText(
              text: const TextSpan(
                children: [
                  TextSpan(
                    text: 'Gym',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.w900,
                      color: _navy,
                      letterSpacing: 0.5,
                      height: 1.0,
                    ),
                  ),
                  TextSpan(
                    text: '-Wale',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.w900,
                      color: _orange,
                      letterSpacing: 0.5,
                      height: 1.0,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFF1EA), Color(0xFFEAF0FF)],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: _orange.withOpacity(0.30), width: 1),
              ),
              child: const Text(
                'Smart Gym Management System',
                style: TextStyle(
                  fontSize: 11,
                  color: _navy,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDividerBar() {
    return Container(
      height: 2.5,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Colors.transparent,
            _navy,
            _orange,
            Colors.transparent,
          ],
          stops: [0.0, 0.3, 0.7, 1.0],
        ),
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  // Gym info: gym logo + name + ID badge
  Widget _buildGymInfoBox() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _navy.withOpacity(0.12), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: _navy.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Gym's own logo
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: _navy.withOpacity(0.06),
              borderRadius: BorderRadius.circular(12),
              border:
                  Border.all(color: _navy.withOpacity(0.10), width: 1),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: widget.gymLogoUrl != null
                  ? Image.network(
                      widget.gymLogoUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.fitness_center_rounded,
                        color: _navy,
                        size: 32,
                      ),
                    )
                  : const Icon(
                      Icons.fitness_center_rounded,
                      color: _navy,
                      size: 32,
                    ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  widget.gymName,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: _navy,
                    height: 1.1,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: _orange.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                        color: _orange.withOpacity(0.25), width: 1),
                  ),
                  child: Text(
                    'GYM ID: ${widget.gymId}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: _orange,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // QR code + "SCAN TO REGISTER" badge
  Widget _buildQRSection() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _navy.withOpacity(0.10), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: _navy.withOpacity(0.12),
            blurRadius: 24,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
              child: Center(
                child: AspectRatio(
                  aspectRatio: 1.0,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _orange, width: 2.5),
                      boxShadow: [
                        BoxShadow(
                          color: _orange.withOpacity(0.15),
                          blurRadius: 14,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(10),
                    child: QrImageView(
                      data: widget.qrData,
                      version: QrVersions.auto,
                      size: double.infinity,
                      backgroundColor: Colors.white,
                      eyeStyle: const QrEyeStyle(
                        eyeShape: QrEyeShape.square,
                        color: _navy,
                      ),
                      dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: _navy,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_navy, Color(0xFF003580)],
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: _navy.withOpacity(0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FaIcon(FontAwesomeIcons.qrcode, color: _orange, size: 18),
                  SizedBox(width: 10),
                  Text(
                    'SCAN TO REGISTER',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 2.0,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanSteps() {
    final steps = [
      (FontAwesomeIcons.camera, _midBlue, 'Open Camera'),
      (FontAwesomeIcons.crosshairs, _orange, 'Point at QR'),
      (FontAwesomeIcons.penToSquare, _navy, 'Fill Form'),
      (FontAwesomeIcons.circleCheck, const Color(0xFF16A34A), 'You\'re In!'),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _orange.withOpacity(0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _orange.withOpacity(0.22), width: 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: steps.asMap().entries.map((e) {
          final (icon, color, label) = e.value;
          final isLast = e.key == steps.length - 1;
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: FaIcon(icon, size: 16, color: color),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 10,
                      color: _navy,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              if (!isLast) ...[
                const SizedBox(width: 8),
                Icon(Icons.arrow_forward_ios_rounded,
                    size: 10, color: _orange.withOpacity(0.55)),
                const SizedBox(width: 8),
              ],
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTemplateFooter() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          height: 1,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                _navy.withOpacity(0.20),
                Colors.transparent,
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _TemplateFooterItem(FontAwesomeIcons.globe, 'www.gym-wale.com'),
            SizedBox(width: 24),
            _TemplateFooterItem(
                FontAwesomeIcons.envelope, 'support@gym-wale.com'),
          ],
        ),
      ],
    );
  }

  // ── Tips card (screen, theme-aware) ──────────────────────────────

  Widget _buildTipsCard(bool isDark) {
    final tips = [
      (Icons.place_rounded, 'Strategic Placement',
          'Eye level near entrance or reception for maximum visibility'),
      (Icons.crop_free_rounded, 'Laminate or Frame It',
          'Protect the print for a professional, long-lasting display'),
      (Icons.wb_sunny_rounded, 'Good Lighting',
          'Ensure adequate light so cameras can scan easily'),
      (Icons.content_copy_rounded, 'Print Multiple Copies',
          'Place extras in the cardio zone, locker rooms, and stairs'),
    ];

    return Container(
      constraints: const BoxConstraints(maxWidth: 720),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1B2132) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.07)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.20 : 0.05),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                      colors: [_orange, _orange.withOpacity(0.75)]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.tips_and_updates_rounded,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                'Pro Tips for Best Results',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : _navy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          ...tips.asMap().entries.map((e) {
            final (icon, title, desc) = e.value;
            final isLast = e.key == tips.length - 1;
            return Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _orange.withOpacity(isDark ? 0.15 : 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(icon, color: _orange, size: 18),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            desc,
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark
                                  ? Colors.white54
                                  : Colors.grey.shade600,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (!isLast)
                  Divider(
                    height: 24,
                    color: isDark
                        ? Colors.white.withOpacity(0.07)
                        : Colors.grey.shade200,
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }
}

// ── Footer item used only inside the A4 template ─────────────────────

class _TemplateFooterItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const _TemplateFooterItem(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        FaIcon(icon, size: 10, color: Colors.grey.shade500),
        const SizedBox(width: 5),
        Text(
          text,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
        ),
      ],
    );
  }
}

