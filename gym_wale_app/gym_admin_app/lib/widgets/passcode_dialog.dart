import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../config/app_theme.dart';

/// Passcode Input Dialog Widget
/// Used for both setting and verifying passcodes
class PasscodeDialog extends StatefulWidget {
  final String title;
  final String subtitle;
  final bool isSetup; // true for setup, false for verification
  final Function(String) onComplete;
  final VoidCallback? onCancel;
  final bool showCancelButton;

  const PasscodeDialog({
    super.key,
    required this.title,
    required this.subtitle,
    this.isSetup = false,
    required this.onComplete,
    this.onCancel,
    this.showCancelButton = true,
  });

  @override
  State<PasscodeDialog> createState() => _PasscodeDialogState();

  /// Show passcode dialog with optional verification callback
  static Future<String?> show(
    BuildContext context, {
    required String title,
    required String subtitle,
    bool isSetup = false,
    bool dismissible = true,
    Future<bool> Function(String)? onVerify,
  }) async {
    return await showDialog<String>(
      context: context,
      barrierDismissible: false, // Always false, use cancel button instead
      barrierColor: Colors.black54,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
        child: _PasscodeDialogWithVerification(
          title: title,
          subtitle: subtitle,
          isSetup: isSetup,
          showCancelButton: dismissible,
          onVerify: onVerify,
        ),
      ),
    );
  }
}

/// Internal dialog that handles verification
class _PasscodeDialogWithVerification extends StatefulWidget {
  final String title;
  final String subtitle;
  final bool isSetup;
  final bool showCancelButton;
  final Future<bool> Function(String)? onVerify;

  const _PasscodeDialogWithVerification({
    required this.title,
    required this.subtitle,
    required this.isSetup,
    required this.showCancelButton,
    this.onVerify,
  });

  @override
  State<_PasscodeDialogWithVerification> createState() => _PasscodeDialogWithVerificationState();
}

class _PasscodeDialogWithVerificationState extends State<_PasscodeDialogWithVerification> {
  final GlobalKey<_PasscodeDialogState> _dialogKey = GlobalKey<_PasscodeDialogState>();

  Future<void> _handleComplete(String passcode) async {
    if (widget.onVerify != null) {
      // Verification mode
      final isValid = await widget.onVerify!(passcode);
      if (isValid) {
        if (mounted) {
          Navigator.of(context).pop(passcode);
        }
      } else {
        // Show error and shake
        _dialogKey.currentState?.showError('Invalid passcode. Please try again.');
      }
    } else {
      // Setup mode or no verification
      Navigator.of(context).pop(passcode);
    }
  }

  void _handleCancel() {
    Navigator.of(context).pop(null);
  }

  @override
  Widget build(BuildContext context) {
    return PasscodeDialog(
      key: _dialogKey,
      title: widget.title,
      subtitle: widget.subtitle,
      isSetup: widget.isSetup,
      showCancelButton: widget.showCancelButton,
      onComplete: _handleComplete,
      onCancel: widget.showCancelButton ? _handleCancel : null,
    );
  }
}

class _PasscodeDialogState extends State<PasscodeDialog> with SingleTickerProviderStateMixin {
  final List<TextEditingController> _controllers = List.generate(
    4,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(4, (_) => FocusNode());
  
  String _confirmPasscode = '';
  bool _isConfirming = false;
  bool _isProcessing = false;
  String? _errorMessage;
  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 10).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticIn),
    );
    
    // Auto-focus first field after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _focusNodes[0].canRequestFocus) {
        _focusNodes[0].requestFocus();
      }
    });
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    _shakeController.dispose();
    super.dispose();
  }

  String get _currentPasscode =>
      _controllers.map((c) => c.text).join();

  /// Public method to show error from parent
  void showError(String message) {
    if (mounted) {
      setState(() {
        _errorMessage = message;
        _isProcessing = false;
      });
      _shakeController.forward(from: 0);
      _clearFields();
      Future.delayed(const Duration(milliseconds: 100), () {
        if (mounted && _focusNodes[0].canRequestFocus) {
          _focusNodes[0].requestFocus();
        }
      });
    }
  }

  void _onDigitChanged(int index, String value) {
    if (value.isEmpty) {
      if (index > 0) {
        _focusNodes[index - 1].requestFocus();
      }
    } else {
      if (index < 3) {
        _focusNodes[index + 1].requestFocus();
      } else {
        // All digits entered
        _handlePasscodeComplete();
      }
    }
    setState(() {
      _errorMessage = null;
    });
  }

  void _handlePasscodeComplete() async {
    final passcode = _currentPasscode;
    
    if (passcode.length != 4) return;

    if (widget.isSetup) {
      if (!_isConfirming) {
        // First entry - ask for confirmation
        setState(() {
          _confirmPasscode = passcode;
          _isConfirming = true;
          _errorMessage = null;
        });
        _clearFields();
        _focusNodes[0].requestFocus();
      } else {
        // Confirmation entry
        if (passcode == _confirmPasscode) {
          setState(() => _isProcessing = true);
          widget.onComplete(passcode);
        } else {
          setState(() {
            _errorMessage = 'Passcodes do not match. Try again.';
            _isConfirming = false;
            _confirmPasscode = '';
          });
          _shakeController.forward(from: 0);
          _clearFields();
          _focusNodes[0].requestFocus();
        }
      }
    } else {
      // Verification mode
      setState(() => _isProcessing = true);
      widget.onComplete(passcode);
    }
  }

  void _clearFields() {
    for (var controller in _controllers) {
      controller.clear();
    }
  }

  void _handleCancel() {
    if (widget.onCancel != null) {
      widget.onCancel!();
    } else {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final isSmallScreen = size.width < 400;
    
    // Responsive sizing
    final fieldHeight = isSmallScreen ? 60.0 : 70.0;
    final horizontalPadding = isSmallScreen ? 3.0 : 8.0;
    final dialogPadding = isSmallScreen ? 16.0 : 24.0;

    return AnimatedBuilder(
      animation: _shakeAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_shakeAnimation.value, 0),
          child: child,
        );
      },
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: SingleChildScrollView(
          child: Container(
            padding: EdgeInsets.all(dialogPadding),
            constraints: BoxConstraints(
              maxWidth: 400,
              maxHeight: size.height * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: EdgeInsets.all(isSmallScreen ? 12.0 : 16.0),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: FaIcon(
                    FontAwesomeIcons.lock,
                    size: isSmallScreen ? 32 : 40,
                    color: AppTheme.primaryColor,
                  ),
                ),
                SizedBox(height: isSmallScreen ? 16 : 20),
                
                // Title
                Text(
                  _isConfirming && widget.isSetup ? 'Confirm Passcode' : widget.title,
                  style: TextStyle(
                    fontSize: isSmallScreen ? 18 : 22,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                
                // Subtitle
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    _isConfirming && widget.isSetup
                        ? 'Enter your passcode again to confirm'
                        : widget.subtitle,
                    style: TextStyle(
                      fontSize: isSmallScreen ? 12 : 14,
                      color: Colors.grey.shade600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                SizedBox(height: isSmallScreen ? 24 : 32),
                
                // Passcode Input Fields
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(4, (index) {
                    return Flexible(
                      child: Container(
                        constraints: BoxConstraints(
                          maxWidth: isSmallScreen ? 60 : 80,
                        ),
                        margin: EdgeInsets.symmetric(horizontal: horizontalPadding),
                        child: AspectRatio(
                          aspectRatio: isSmallScreen ? 0.85 : 0.85,
                          child: TextField(
                            controller: _controllers[index],
                            focusNode: _focusNodes[index],
                            enabled: !_isProcessing,
                            textAlign: TextAlign.center,
                            keyboardType: TextInputType.number,
                            maxLength: 1,
                            obscureText: true,
                            style: TextStyle(
                              fontSize: isSmallScreen ? 24 : 32,
                              fontWeight: FontWeight.bold,
                            ),
                            decoration: InputDecoration(
                              counterText: '',
                              filled: true,
                              fillColor: isDark
                                  ? Colors.grey.shade800
                                  : Colors.grey.shade100,
                              contentPadding: EdgeInsets.zero,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: _errorMessage != null
                                      ? AppTheme.errorColor
                                      : Colors.grey.shade300,
                                  width: 2,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: _errorMessage != null
                                      ? AppTheme.errorColor
                                      : Colors.grey.shade300,
                                  width: 2,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: _errorMessage != null
                                      ? AppTheme.errorColor
                                      : AppTheme.primaryColor,
                                  width: 2,
                                ),
                              ),
                            ),
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            onChanged: (value) => _onDigitChanged(index, value),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                
                // Error Message
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: EdgeInsets.all(isSmallScreen ? 10 : 12),
                    decoration: BoxDecoration(
                      color: AppTheme.errorColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.errorColor.withValues(alpha: 0.3),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        FaIcon(
                          FontAwesomeIcons.triangleExclamation,
                          size: isSmallScreen ? 14 : 16,
                          color: AppTheme.errorColor,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(
                              color: AppTheme.errorColor,
                              fontSize: isSmallScreen ? 12 : 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                
                // Processing Indicator
                if (_isProcessing) ...[
                  SizedBox(height: isSmallScreen ? 20 : 24),
                  const CircularProgressIndicator(),
                  const SizedBox(height: 8),
                  Text(
                    'Verifying...',
                    style: TextStyle(
                      fontSize: isSmallScreen ? 12 : 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
                
                // Actions
                if (!_isProcessing) ...[
                  SizedBox(height: isSmallScreen ? 24 : 32),
                  Row(
                    children: [
                      if (widget.showCancelButton)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _handleCancel,
                            style: OutlinedButton.styleFrom(
                              padding: EdgeInsets.symmetric(
                                vertical: isSmallScreen ? 12 : 14,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              side: BorderSide(
                                color: AppTheme.primaryColor,
                                width: 1.5,
                              ),
                            ),
                            child: Text(
                              'Cancel',
                              style: TextStyle(
                                fontSize: isSmallScreen ? 14 : 16,
                              ),
                            ),
                          ),
                        ),
                      if (widget.showCancelButton) const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _clearFields,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.grey.shade300,
                            foregroundColor: Colors.black87,
                            padding: EdgeInsets.symmetric(
                              vertical: isSmallScreen ? 12 : 14,
                            ),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text(
                            'Clear',
                            style: TextStyle(
                              fontSize: isSmallScreen ? 14 : 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
