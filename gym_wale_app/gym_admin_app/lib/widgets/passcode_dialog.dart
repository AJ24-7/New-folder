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

  const PasscodeDialog({
    super.key,
    required this.title,
    required this.subtitle,
    this.isSetup = false,
    required this.onComplete,
    this.onCancel,
  });

  @override
  State<PasscodeDialog> createState() => _PasscodeDialogState();

  /// Show passcode dialog
  static Future<String?> show(
    BuildContext context, {
    required String title,
    required String subtitle,
    bool isSetup = false,
    bool dismissible = true,
  }) async {
    return await showDialog<String>(
      context: context,
      barrierDismissible: dismissible,
      builder: (context) => PasscodeDialog(
        title: title,
        subtitle: subtitle,
        isSetup: isSetup,
        onComplete: (passcode) => Navigator.of(context).pop(passcode),
        onCancel: dismissible ? () => Navigator.of(context).pop() : null,
      ),
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
    
    // Auto-focus first field
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNodes[0].requestFocus();
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
        child: Container(
          padding: const EdgeInsets.all(24),
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const FaIcon(
                  FontAwesomeIcons.lock,
                  size: 40,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 20),
              
              // Title
              Text(
                _isConfirming && widget.isSetup ? 'Confirm Passcode' : widget.title,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              
              // Subtitle
              Text(
                _isConfirming && widget.isSetup
                    ? 'Enter your passcode again to confirm'
                    : widget.subtitle,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              // Passcode Input Fields
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (index) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: SizedBox(
                      width: 60,
                      height: 70,
                      child: TextField(
                        controller: _controllers[index],
                        focusNode: _focusNodes[index],
                        enabled: !_isProcessing,
                        textAlign: TextAlign.center,
                        keyboardType: TextInputType.number,
                        maxLength: 1,
                        obscureText: true,
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                        decoration: InputDecoration(
                          counterText: '',
                          filled: true,
                          fillColor: isDark
                              ? Colors.grey.shade800
                              : Colors.grey.shade100,
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
                  );
                }),
              ),
              
              // Error Message
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const FaIcon(
                        FontAwesomeIcons.triangleExclamation,
                        size: 16,
                        color: AppTheme.errorColor,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: AppTheme.errorColor,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              
              // Processing Indicator
              if (_isProcessing) ...[
                const SizedBox(height: 24),
                const CircularProgressIndicator(),
              ],
              
              // Actions
              if (!_isProcessing) ...[
                const SizedBox(height: 32),
                Row(
                  children: [
                    if (widget.onCancel != null)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _handleCancel,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('Cancel'),
                        ),
                      ),
                    if (widget.onCancel != null) const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _clearFields,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.shade300,
                          foregroundColor: Colors.black87,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text('Clear'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
