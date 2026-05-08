// lib/widgets/cash_payment_request_dialog.dart
// Popup dialog shown on the gym admin app when a new member requests cash payment
// via QR registration. Admin has 2 minutes to confirm or reject.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import '../services/storage_service.dart';

class CashPaymentRequestDialog extends StatefulWidget {
  final String memberName;
  final String amount;
  final String planName;
  final String duration;
  final String validationCode;
  final String gymId;
  final String memberId;

  const CashPaymentRequestDialog({
    super.key,
    required this.memberName,
    required this.amount,
    required this.planName,
    required this.duration,
    required this.validationCode,
    required this.gymId,
    required this.memberId,
  });

  /// Show the dialog as an overlay that cannot be dismissed by tapping outside.
  static Future<void> show(BuildContext context, Map<String, dynamic> data) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => CashPaymentRequestDialog(
        memberName: data['memberName'] ?? 'Unknown',
        amount: data['amount'] ?? '0',
        planName: data['planName'] ?? '',
        duration: data['duration'] ?? '',
        validationCode: data['validationCode'] ?? '',
        gymId: data['gymId'] ?? '',
        memberId: data['memberId'] ?? '',
      ),
    );
  }

  @override
  State<CashPaymentRequestDialog> createState() => _CashPaymentRequestDialogState();
}

class _CashPaymentRequestDialogState extends State<CashPaymentRequestDialog>
    with SingleTickerProviderStateMixin {
  static const int _totalSeconds = 120;
  int _secondsLeft = _totalSeconds;
  Timer? _timer;
  bool _isLoading = false;
  String? _resultMessage;
  bool _confirmed = false;
  bool _rejected = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _startTimer();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) {
        t.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  String get _formattedTime {
    final m = _secondsLeft ~/ 60;
    final s = _secondsLeft % 60;
    return '${m.toString().padLeft(1, '0')}:${s.toString().padLeft(2, '0')}';
  }

  double get _timerProgress =>
      (_secondsLeft / _totalSeconds).clamp(0.0, 1.0);

  Color get _timerColor {
    if (_secondsLeft > 60) return const Color(0xFF22c55e);
    if (_secondsLeft > 30) return const Color(0xFFf59e0b);
    return const Color(0xFFef4444);
  }

  Future<void> _confirmPayment() async {
    setState(() => _isLoading = true);
    try {
      final storage = StorageService();
      final token = await storage.getToken();
      final url =
          '${ApiConfig.baseUrl}/api/confirm-cash-validation/${Uri.encodeComponent(widget.validationCode)}';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      final body = jsonDecode(response.body);
      if (response.statusCode == 200 && body['success'] == true) {
        _timer?.cancel();
        setState(() {
          _confirmed = true;
          _isLoading = false;
          _resultMessage = 'Payment confirmed! Member registered successfully.';
        });
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) Navigator.of(context).pop(true);
      } else {
        setState(() {
          _isLoading = false;
          _resultMessage = body['error'] ?? 'Confirmation failed. Try again.';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _resultMessage = 'Network error. Please try again.';
      });
    }
  }

  Future<void> _rejectPayment() async {
    setState(() => _isLoading = true);
    try {
      final storage = StorageService();
      final token = await storage.getToken();
      final url =
          '${ApiConfig.baseUrl}/api/reject-cash-validation/${Uri.encodeComponent(widget.validationCode)}';

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      _timer?.cancel();
      final body = jsonDecode(response.body);
      setState(() {
        _rejected = true;
        _isLoading = false;
        _resultMessage = body['message'] ?? 'Payment request rejected.';
      });
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) Navigator.of(context).pop(false);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _resultMessage = 'Network error. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final expired = _secondsLeft <= 0 && !_confirmed && !_rejected;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 380),
        decoration: BoxDecoration(
          color: const Color(0xFF1a1a2e),
          border: Border.all(
            color: _confirmed
                ? const Color(0xFF22c55e)
                : _rejected || expired
                    ? const Color(0xFFef4444)
                    : const Color(0xFF3b82f6),
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 30,
              spreadRadius: 4,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header icon
              ScaleTransition(
                scale: (_confirmed || _rejected || expired)
                    ? const AlwaysStoppedAnimation(1.0)
                    : _pulseAnimation,
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: _confirmed
                        ? const Color(0xFF22c55e).withOpacity(0.15)
                        : _rejected || expired
                            ? const Color(0xFFef4444).withOpacity(0.15)
                            : const Color(0xFF22c55e).withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _confirmed
                        ? Icons.check_circle_rounded
                        : _rejected
                            ? Icons.cancel_rounded
                            : expired
                                ? Icons.timer_off_rounded
                                : Icons.payments_rounded,
                    color: _confirmed
                        ? const Color(0xFF22c55e)
                        : _rejected || expired
                            ? const Color(0xFFef4444)
                            : const Color(0xFF22c55e),
                    size: 36,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Title
              Text(
                _confirmed
                    ? 'Payment Confirmed!'
                    : _rejected
                        ? 'Request Rejected'
                        : expired
                            ? 'Request Expired'
                            : '💵 Cash Payment Request',
                style: const TextStyle(
                  color: Color(0xFFf1f5f9),
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              if (!_confirmed && !_rejected) ...[
                // Member info card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0f172a),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    children: [
                      _infoRow(Icons.person_rounded, 'Member', widget.memberName),
                      const SizedBox(height: 8),
                      _infoRow(Icons.currency_rupee_rounded, 'Amount',
                          '₹${widget.amount}',
                          valueColor: const Color(0xFF3b82f6),
                          valueBold: true),
                      const SizedBox(height: 8),
                      _infoRow(Icons.card_membership_rounded, 'Plan',
                          '${widget.planName} · ${widget.duration}'),
                      const SizedBox(height: 8),
                      _infoRow(Icons.tag_rounded, 'Reference', widget.validationCode,
                          valueColor: const Color(0xFFf59e0b)),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Instruction
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF22c55e).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: const Color(0xFF22c55e).withOpacity(0.25)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.store_rounded,
                          color: Color(0xFF22c55e), size: 18),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Collect cash at the counter, then tap Confirm.',
                          style: TextStyle(
                            color: Color(0xFFe2e8f0),
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Timer
                if (!expired) ...[
                  Text(
                    'Confirmation window',
                    style: TextStyle(
                        color: const Color(0xFF94a3b8), fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formattedTime,
                    style: TextStyle(
                      color: _timerColor,
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 3,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _timerProgress,
                      minHeight: 6,
                      backgroundColor: const Color(0xFF334155),
                      valueColor:
                          AlwaysStoppedAnimation<Color>(_timerColor),
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFef4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.timer_off_rounded,
                            color: Color(0xFFef4444), size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Time expired. Request closed.',
                          style: TextStyle(
                              color: Color(0xFFef4444), fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 16),

                // Result message
                if (_resultMessage != null) ...[
                  Text(
                    _resultMessage!,
                    style: const TextStyle(
                        color: Color(0xFFf87171), fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                ],

                // Action buttons
                if (!expired) ...[
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isLoading ? null : _rejectPayment,
                          icon: const Icon(Icons.close_rounded, size: 16),
                          label: const Text('Reject'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFef4444),
                            side: const BorderSide(
                                color: Color(0xFFef4444)),
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: _isLoading ? null : _confirmPayment,
                          icon: _isLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white),
                                )
                              : const Icon(Icons.check_rounded, size: 18),
                          label: Text(_isLoading
                              ? 'Confirming...'
                              : 'Confirm Payment'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF22c55e),
                            foregroundColor: Colors.white,
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ] else ...[
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF94a3b8),
                        side: const BorderSide(color: Color(0xFF475569)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Dismiss'),
                    ),
                  ),
                ],
              ] else ...[
                // Confirmed / Rejected result screen
                const SizedBox(height: 8),
                Text(
                  _resultMessage ?? '',
                  style: TextStyle(
                    color: _confirmed
                        ? const Color(0xFF22c55e)
                        : const Color(0xFFef4444),
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value,
      {Color? valueColor, bool valueBold = false}) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF64748b), size: 15),
        const SizedBox(width: 6),
        Text(
          '$label: ',
          style: const TextStyle(
              color: Color(0xFF94a3b8), fontSize: 13),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: valueColor ?? const Color(0xFFe2e8f0),
              fontSize: 13,
              fontWeight:
                  valueBold ? FontWeight.w700 : FontWeight.normal,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
