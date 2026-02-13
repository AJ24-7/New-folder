import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/gym.dart';
import 'gym_chat_drawer.dart';

class FloatingChatButton extends StatefulWidget {
  final Gym gym;

  const FloatingChatButton({
    Key? key,
    required this.gym,
  }) : super(key: key);

  @override
  State<FloatingChatButton> createState() => _FloatingChatButtonState();
}

class _FloatingChatButtonState extends State<FloatingChatButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _showDrawer = false;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _toggleDrawer() {
    setState(() {
      _showDrawer = !_showDrawer;
      if (_showDrawer) {
        _unreadCount = 0; // Clear unread when opening
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Chat Drawer
        if (_showDrawer)
          GymChatDrawer(
            gym: widget.gym,
            onClose: _toggleDrawer,
            onNewMessage: (count) {
              if (!_showDrawer) {
                setState(() => _unreadCount = count);
              }
            },
          ),

        // Floating Button
        Positioned(
          right: 20,
          bottom: 20,
          child: GestureDetector(
            onTap: _toggleDrawer,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Pulse Rings
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        // Outer pulse
                        Transform.scale(
                          scale: 1.0 + (_pulseController.value * 0.5),
                          child: Container(
                            width: 70,
                            height: 70,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppTheme.primaryColor.withOpacity(
                                  0.3 * (1 - _pulseController.value),
                                ),
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                        // Inner pulse
                        Transform.scale(
                          scale: 1.0 + (_pulseController.value * 0.3),
                          child: Container(
                            width: 66,
                            height: 66,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppTheme.accentColor.withOpacity(
                                  0.5 * (1 - _pulseController.value),
                                ),
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),

                // Main Button
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primaryColor,
                        AppTheme.secondaryColor,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryColor.withOpacity(0.4),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Icon(
                    _showDrawer ? Icons.close : Icons.chat_bubble,
                    color: Colors.white,
                    size: 28,
                  ),
                ),

                // Unread Badge
                if (_unreadCount > 0 && !_showDrawer)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white,
                          width: 2,
                        ),
                      ),
                      child: Text(
                        _unreadCount > 9 ? '9+' : _unreadCount.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
