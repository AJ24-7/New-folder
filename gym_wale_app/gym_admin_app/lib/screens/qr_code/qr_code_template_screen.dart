import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:ui' as ui;
import 'dart:math' as math;
import '../../config/app_theme.dart';

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
  late List<AnimationController> _floatingControllers;
  late List<Animation<double>> _floatingAnimations;

  // Brand colors
  static const Color navyBlue = Color(0xFF001F3F);
  static const Color orange = Color(0xFFFF6B35);

  @override
  void initState() {
    super.initState();
    _setupFloatingAnimations();
  }

  void _setupFloatingAnimations() {
    _floatingControllers = List.generate(
      8,
      (index) => AnimationController(
        duration: Duration(seconds: 10 + index % 3),
        vsync: this,
      )..repeat(),
    );

    _floatingAnimations = _floatingControllers.map((controller) {
      return Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: controller, curve: Curves.linear),
      );
    }).toList();
  }

  @override
  void dispose() {
    for (var controller in _floatingControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _downloadTemplate() async {
    setState(() => _isDownloading = true);

    try {
      await Future.delayed(const Duration(milliseconds: 500));

      final boundary =
          _templateKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 3.0);
      await image.toByteData(format: ui.ImageByteFormat.png);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Template ready! Right-click and "Save As..." to download.\n(Or take a screenshot for mobile)',
                ),
              ),
            ],
          ),
          backgroundColor: AppTheme.successColor,
          duration: const Duration(seconds: 5),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Download preparation failed: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 900;
    final scale = isDesktop ? 1.0 : (size.width / 800).clamp(0.5, 1.0);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              navyBlue.withOpacity(0.03),
              orange.withOpacity(0.02),
              Colors.white,
            ],
          ),
        ),
        child: Stack(
          children: [
            // Interactive floating background icons
            ..._buildFloatingIcons(),

            // Main content
            SafeArea(
              child: Column(
                children: [
                  // Top App Bar
                  _buildAppBar(context),

                  // Content
                  Expanded(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.symmetric(
                        horizontal: isDesktop ? 40 : 16,
                        vertical: 24,
                      ),
                      child: Column(
                        children: [
                          // Instructions Card
                          _buildInstructionsCard(),

                          const SizedBox(height: 32),

                          // A4 Template Preview
                          Center(
                            child: Transform.scale(
                              scale: scale,
                              child: RepaintBoundary(
                                key: _templateKey,
                                child: _buildA4Template(),
                              ),
                            ),
                          ),

                          const SizedBox(height: 32),

                          // Usage Tips
                          _buildUsageTips(),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context),
            tooltip: 'Back',
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'QR Code Registration Template',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Download and display at your gym',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: _isDownloading ? null : _downloadTemplate,
            icon: _isDownloading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Icon(Icons.download, size: 20),
            label: Text(_isDownloading ? 'Preparing...' : 'Download'),
            style: ElevatedButton.styleFrom(
              backgroundColor: navyBlue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionsCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            navyBlue.withOpacity(0.1),
            orange.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: navyBlue.withOpacity(0.2),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: navyBlue,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.lightbulb,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Text(
                  'How to Use This QR Code Template',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildInstructionItem(
            '1',
            'Download the Template',
            'Click the Download button to save this QR code template as an image',
            FontAwesomeIcons.download,
            orange,
          ),
          const SizedBox(height: 12),
          _buildInstructionItem(
            '2',
            'Print in A4 Size',
            'Print the template on A4 paper (8.27" x 11.69") for best results',
            FontAwesomeIcons.print,
            navyBlue,
          ),
          const SizedBox(height: 12),
          _buildInstructionItem(
            '3',
            'Display at Your Gym',
            'Place the printed QR code at your gym entrance or reception desk',
            FontAwesomeIcons.locationDot,
            orange,
          ),
          const SizedBox(height: 12),
          _buildInstructionItem(
            '4',
            'Members Scan & Register',
            'New members can scan the code with their phone camera to register instantly',
            FontAwesomeIcons.qrcode,
            navyBlue,
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionItem(
    String number,
    String title,
    String description,
    IconData icon,
    Color color,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  FaIcon(icon, size: 16, color: color),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildA4Template() {
    return Container(
      width: 595, // A4 width at 72 DPI
      height: 842, // A4 height at 72 DPI
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(
          children: [
            // Subtle gradient background
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white,
                      navyBlue.withOpacity(0.02),
                      orange.withOpacity(0.01),
                      Colors.white,
                    ],
                  ),
                ),
              ),
            ),

            // Decorative circles
            Positioned(
              top: -50,
              right: -50,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: orange.withOpacity(0.05),
                ),
              ),
            ),
            Positioned(
              bottom: -80,
              left: -80,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: navyBlue.withOpacity(0.03),
                ),
              ),
            ),

            // Main content
            Padding(
              padding: const EdgeInsets.all(40),
              child: Column(
                children: [
                  // Header with Gym-Wale branding
                  _buildTemplateHeader(),

                  const SizedBox(height: 30),

                  // Divider
                  Container(
                    height: 3,
                    width: 200,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [navyBlue, orange],
                      ),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  const SizedBox(height: 30),

                  // Gym information
                  _buildGymInfo(),

                  const Spacer(),

                  // QR Code
                  _buildQRCodeSection(),

                  const Spacer(),

                  // Scan instructions
                  _buildScanInstructions(),

                  const SizedBox(height: 20),

                  // Footer
                  _buildFooter(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTemplateHeader() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [navyBlue, navyBlue.withOpacity(0.8)],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: navyBlue.withOpacity(0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: const FaIcon(
                FontAwesomeIcons.dumbbell,
                color: Colors.white,
                size: 32,
              ),
            ),
            const SizedBox(width: 16),
            RichText(
              text: const TextSpan(
                children: [
                  TextSpan(
                    text: 'Gym',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: navyBlue,
                      letterSpacing: 1.5,
                      fontFamily: 'Roboto',
                    ),
                  ),
                  TextSpan(
                    text: '-Wale',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: orange,
                      letterSpacing: 1.5,
                      fontFamily: 'Roboto',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [orange.withOpacity(0.1), navyBlue.withOpacity(0.1)],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Smart Gym Management System',
            style: TextStyle(
              fontSize: 14,
              color: navyBlue.withOpacity(0.8),
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGymInfo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: navyBlue.withOpacity(0.1),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          if (widget.gymLogoUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                widget.gymLogoUrl!,
                width: 80,
                height: 80,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: navyBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.fitness_center,
                    size: 40,
                    color: navyBlue,
                  ),
                ),
              ),
            ),
          if (widget.gymLogoUrl != null) const SizedBox(height: 16),
          Text(
            widget.gymName,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: navyBlue,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Gym ID: ${widget.gymId}',
              style: TextStyle(
                fontSize: 13,
                color: orange.withOpacity(0.9),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQRCodeSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: navyBlue.withOpacity(0.15),
            blurRadius: 25,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(
                color: orange,
                width: 3,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: QrImageView(
              data: widget.qrData,
              version: QrVersions.auto,
              size: 280,
              backgroundColor: Colors.white,
              eyeStyle: QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: navyBlue,
              ),
              dataModuleStyle: QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: navyBlue,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [navyBlue, navyBlue.withOpacity(0.8)],
              ),
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: navyBlue.withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const FaIcon(
                    FontAwesomeIcons.qrcode,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'SCAN TO REGISTER',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanInstructions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: orange.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: orange.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FaIcon(
                FontAwesomeIcons.mobileScreen,
                color: orange,
                size: 18,
              ),
              const SizedBox(width: 10),
              Text(
                'Quick Registration Steps',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: navyBlue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildStep('📱', 'Open your phone camera'),
          const SizedBox(height: 6),
          _buildStep('🎯', 'Point at the QR code'),
          const SizedBox(height: 6),
          _buildStep('📝', 'Fill registration form'),
          const SizedBox(height: 6),
          _buildStep('✅', 'Start your fitness journey!'),
        ],
      ),
    );
  }

  Widget _buildStep(String emoji, String text) {
    return Row(
      children: [
        Text(
          emoji,
          style: const TextStyle(fontSize: 16),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              color: navyBlue.withOpacity(0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        Container(
          height: 2,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                navyBlue.withOpacity(0.3),
                Colors.transparent,
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 20,
          runSpacing: 8,
          children: [
            _buildFooterItem(FontAwesomeIcons.globe, 'www.gym-wale.com'),
            _buildFooterItem(FontAwesomeIcons.envelope, 'support@gym-wale.com'),
            _buildFooterItem(FontAwesomeIcons.phone, '+91-XXXX-XXXXXX'),
          ],
        ),
      ],
    );
  }

  Widget _buildFooterItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        FaIcon(
          icon,
          size: 11,
          color: Colors.grey.shade600,
        ),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildUsageTips() {
    return Container(
      constraints: const BoxConstraints(maxWidth: 800),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.grey.shade200,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 3),
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
                    colors: [orange, orange.withOpacity(0.8)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.tips_and_updates,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Pro Tips for Best Results',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTipItem(
            '📍',
            'Strategic Placement',
            'Display at eye level near your gym entrance or reception desk where members can easily see it',
          ),
          const Divider(height: 24),
          _buildTipItem(
            '🖼️',
            'Professional Framing',
            'Frame the printed QR code for a professional look and to protect it from damage',
          ),
          const Divider(height: 24),
          _buildTipItem(
            '💡',
            'Good Lighting',
            'Ensure the area is well-lit so phone cameras can easily scan the QR code',
          ),
          const Divider(height: 24),
          _buildTipItem(
            '🔄',
            'Multiple Locations',
            'Consider printing multiple copies for different areas of your gym',
          ),
        ],
      ),
    );
  }

  Widget _buildTipItem(String emoji, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          emoji,
          style: const TextStyle(fontSize: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildFloatingIcons() {
    final icons = [
      FontAwesomeIcons.dumbbell,
      FontAwesomeIcons.heart,
      FontAwesomeIcons.personRunning,
      FontAwesomeIcons.trophy,
      FontAwesomeIcons.fire,
      FontAwesomeIcons.stopwatch,
      FontAwesomeIcons.heartPulse,
      FontAwesomeIcons.bolt,
    ];

    return List.generate(8, (index) {
      final random = math.Random(index + 50);
      final left = random.nextDouble() * 100;
      final size = 20.0 + random.nextDouble() * 15;

      return AnimatedBuilder(
        animation: _floatingAnimations[index],
        builder: (context, child) {
          return Positioned(
            left: MediaQuery.of(context).size.width * (left / 100),
            top: MediaQuery.of(context).size.height *
                _floatingAnimations[index].value,
            child: Opacity(
              opacity: 0.08,
              child: FaIcon(
                icons[index % icons.length],
                size: size,
                color: index % 2 == 0 ? navyBlue : orange,
              ),
            ),
          );
        },
      );
    });
  }
}
