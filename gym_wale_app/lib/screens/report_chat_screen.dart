import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../config/app_theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

enum _Stage { selectCategory, troubleshoot, describeIssue, collectDetails, submitting, done, error }

class _ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final List<String>? quickReplies;

  const _ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.quickReplies,
  });
}

class ReportChatScreen extends StatefulWidget {
  const ReportChatScreen({Key? key}) : super(key: key);

  @override
  State<ReportChatScreen> createState() => _ReportChatScreenState();
}

class _ReportChatScreenState extends State<ReportChatScreen> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];

  bool _isBotTyping = false;
  bool _inputEnabled = false;
  _Stage _stage = _Stage.selectCategory;

  String? _selectedCategory;
  String? _issueDescription;
  String? _userName;
  List<dynamic> _memberships = [];
  bool _isLoadingContext = true;

  static const Map<String, Map<String, String>> _categories = {
    'app_bug': {'label': 'App Bug / Technical Issue', 'icon': '🐛', 'priority': 'high'},
    'payment': {'label': 'Payment Problem', 'icon': '💳', 'priority': 'high'},
    'membership': {'label': 'Membership Issue', 'icon': '🏋️', 'priority': 'medium'},
    'account': {'label': 'Account Problem', 'icon': '👤', 'priority': 'medium'},
    'other': {'label': 'Other Issue', 'icon': '💬', 'priority': 'low'},
  };

  static const Map<String, List<String>> _troubleshootTips = {
    'app_bug': [
      '🔄 Force close the app and reopen it',
      '📶 Check your internet connection',
      '🔁 Log out and log back in',
      '📱 Restart your phone',
      '⬆️ Update the app from the Play Store / App Store',
    ],
    'payment': [
      '⏳ Wait 24–48 hours — bank processing can take time',
      '📲 Check your bank app or SMS for transaction status',
      '💳 Verify your card/wallet has sufficient balance',
      '🔄 Try a different payment method if available',
    ],
    'membership': [
      '🔄 Pull down to refresh your membership screen',
      '⏰ Allow up to 30 minutes after payment for activation',
      '📧 Check your email for a membership confirmation',
    ],
    'account': [
      '🔄 Log out and log back in',
      '📶 Check your internet connection',
      '🔑 Try resetting your password via "Forgot Password"',
      '📧 Check your email for any account notifications',
    ],
  };

  @override
  void initState() {
    super.initState();
    _loadUserContextAndGreet();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadUserContextAndGreet() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    _userName = (authProvider.user?.name ?? '').trim();
    if (_userName!.isEmpty) _userName = 'there';

    // Load memberships in background for richer context
    try {
      _memberships = await ApiService.getActiveMemberships();
    } catch (_) {
      _memberships = [];
    }

    if (!mounted) return;
    setState(() => _isLoadingContext = false);

    // Greet the user
    final greeting = _memberships.isNotEmpty
        ? 'Hi $_userName! 👋 I\'m here to help you report any problems to our support team.\n\nI can see you have ${_memberships.length} active membership${_memberships.length > 1 ? 's' : ''}. Your report will be sent directly to the super admin.\n\nWhat type of issue are you facing?'
        : 'Hi $_userName! 👋 I\'m here to help you report any problems to our support team.\n\nYour report will be sent directly to the super admin.\n\nWhat type of issue are you facing?';

    await _addBotMessage(
      greeting,
      quickReplies: _categories.values.map((c) => '${c['icon']} ${c['label']}').toList(),
    );
  }

  Future<void> _addBotMessage(String text, {List<String>? quickReplies}) async {
    setState(() => _isBotTyping = true);
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() {
      _isBotTyping = false;
      _messages.add(_ChatMessage(
        text: text,
        isUser: false,
        timestamp: DateTime.now(),
        quickReplies: quickReplies,
      ));
    });
    _scrollToBottom();
  }

  void _addUserMessage(String text) {
    setState(() {
      _messages.add(_ChatMessage(
        text: text,
        isUser: true,
        timestamp: DateTime.now(),
      ));
      _inputEnabled = false;
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _getCategoryPrompt(String catKey) {
    final catMeta = _categories[catKey] ?? _categories['other']!;
    final catLabel = catMeta['label']!;
    switch (catKey) {
      case 'app_bug':
        return 'Please describe what happened:\n• What were you doing when the issue occurred?\n• What did you see vs. what you expected?\n• Any error messages?';
      case 'payment':
        return 'Please provide payment details:\n• What was the transaction amount and date?\n• Was it a failed payment, wrong charge, or refund issue?\n• Any transaction/order ID if available?';
      case 'membership':
        String memCtx = '';
        if (_memberships.isNotEmpty) {
          final gymNames = _memberships.map((m) {
            return m['gym']?['name'] ?? m['gymName'] ?? 'Unknown Gym';
          }).join(', ');
          memCtx = '\n\nYour active membership(s): $gymNames';
        }
        return 'Please describe the membership issue:$memCtx\n• Which gym is this about?\n• Is it about plan activation, expiry, freeze, or something else?';
      case 'account':
        return 'Please describe what\'s wrong with your account:\n• Login issues, profile not updating, notification problems?\n• When did this start?';
      default:
        return 'Please describe your issue in as much detail as possible so our team can help you quickly.';
    }
  }

  Future<void> _handleQuickReply(String reply) async {
    _addUserMessage(reply);

    switch (_stage) {
      case _Stage.selectCategory:
        for (final entry in _categories.entries) {
          if (reply.contains(entry.value['label']!)) {
            _selectedCategory = entry.key;
            break;
          }
        }
        _selectedCategory ??= 'other';

        final tips = _troubleshootTips[_selectedCategory!];
        if (tips != null && tips.isNotEmpty) {
          _stage = _Stage.troubleshoot;
          final tipsText = tips.map((t) => '  $t').join('\n');
          await _addBotMessage(
            'Before we file a ticket, here are some quick fixes to try:\n\n$tipsText\n\nDid any of these resolve your issue?',
            quickReplies: ['✅ Issue Resolved!', '❌ Still Having the Issue'],
          );
        } else {
          _stage = _Stage.describeIssue;
          await _addBotMessage(_getCategoryPrompt(_selectedCategory!));
          setState(() => _inputEnabled = true);
        }
        break;

      case _Stage.troubleshoot:
        if (reply.contains('Issue Resolved')) {
          _stage = _Stage.done;
          await _addBotMessage(
            '🎉 So glad to hear it, $_userName! Happy to help.\n\nFeel free to come back anytime if you face more problems. Have a great workout! 💪',
            quickReplies: ['Done'],
          );
        } else {
          _stage = _Stage.describeIssue;
          await _addBotMessage(_getCategoryPrompt(_selectedCategory ?? 'other'));
          setState(() => _inputEnabled = true);
        }
        break;

      case _Stage.error:
        if (reply.contains('Retry')) {
          await _submitReport();
        } else if (reply.contains('Start Over')) {
          setState(() {
            _stage = _Stage.selectCategory;
            _selectedCategory = null;
            _issueDescription = null;
            _inputEnabled = false;
          });
          await _addBotMessage(
            'No problem! Let\'s start fresh. What type of issue are you facing?',
            quickReplies: _categories.values.map((c) => '${c['icon']} ${c['label']}').toList(),
          );
        } else {
          Navigator.pop(context);
        }
        break;

      default:
        break;
    }
  }

  Future<void> _handleTextSubmit() async {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    _inputController.clear();
    _addUserMessage(text);

    switch (_stage) {
      case _Stage.describeIssue:
        _issueDescription = text;
        _stage = _Stage.collectDetails;
        await _addBotMessage(
          'Thank you for the details, $_userName.\n\nIs there anything else you\'d like to add? (e.g., your phone number, steps to reproduce, screenshots description)\n\nOr type *"submit"* to send your report now.',
        );
        setState(() => _inputEnabled = true);
        break;

      case _Stage.collectDetails:
        if (text.toLowerCase() == 'submit' ||
            text.toLowerCase() == 'no' ||
            text.toLowerCase() == 'none') {
          await _submitReport();
        } else {
          // Append extra details to description
          _issueDescription = '$_issueDescription\n\nAdditional details: $text';
          await _addBotMessage(
            'Thanks! Submitting your report now...',
          );
          await _submitReport();
        }
        break;

      default:
        break;
    }
  }

  Future<void> _submitReport() async {
    _stage = _Stage.submitting;
    setState(() => _inputEnabled = false);

    final catMeta = _categories[_selectedCategory ?? 'other']!;
    final subject = '${catMeta['label']} - Reported by $_userName';

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userEmail = authProvider.user?.email ?? '';
    final userPhone = authProvider.user?.phone ?? '';

    // Build membership context
    String membershipContext = '';
    if (_memberships.isNotEmpty) {
      membershipContext = '\n\n--- User Membership Info ---\n';
      for (final m in _memberships) {
        final gymName = m['gym']?['name'] ?? m['gymName'] ?? 'Unknown';
        final planName = m['plan']?['name'] ?? m['planName'] ?? 'Plan';
        membershipContext += '• $gymName - $planName\n';
      }
    }

    final fullMessage =
        'Report from: $_userName ($userEmail${userPhone.isNotEmpty ? ', $userPhone' : ''})\n'
        'Category: ${catMeta['label']}\n\n'
        '--- Issue Description ---\n'
        '$_issueDescription'
        '$membershipContext';

    // Map chatbot categories to valid backend enum values:
    // enum: ['technical', 'billing', 'membership', 'equipment', 'general', 'complaint', 'chat']
    const categoryMap = {
      'app_bug': 'technical',
      'payment': 'billing',
      'membership': 'membership',
      'account': 'general',
      'other': 'general',
    };
    final backendCategory = categoryMap[_selectedCategory ?? 'other'] ?? 'general';

    try {
      final result = await ApiService.createSupportTicket(
        category: backendCategory,
        subject: subject,
        message: fullMessage,
        priority: catMeta['priority'] ?? 'medium',
        phone: userPhone.isNotEmpty ? userPhone : null,
        emailUpdates: true,
        metadata: {
          'source': 'report_chat',
          'reportedBy': _userName,
          'userEmail': userEmail,
          'membershipCount': _memberships.length,
        },
      );

      if (!mounted) return;

      if (result['success'] == true) {
        _stage = _Stage.done;
        final ticketId = result['ticketId'] ?? '';
        await _addBotMessage(
          '✅ Your report has been submitted successfully!\n\n'
          'Ticket ID: *$ticketId*\n\n'
          'Our super admin team will review your report and get back to you via email. You can track progress in *My Support Tickets*.',
          quickReplies: ['View My Tickets', 'Done'],
        );
      } else {
        _stage = _Stage.error;
        final serverMsg = result['message']?.toString() ?? '';
        await _addBotMessage(
          '❌ Sorry, we couldn\'t submit your report right now.\n\n'
          '${serverMsg.isNotEmpty ? serverMsg : 'The server returned an error. This may be a temporary issue.'}\n\n'
          'What would you like to do?',
          quickReplies: ['🔄 Retry Submission', '↩️ Start Over', 'Cancel'],
        );
      }
    } catch (e) {
      if (!mounted) return;
      _stage = _Stage.error;
      await _addBotMessage(
        '❌ Connection error — could not reach the server.\n\n'
        'Please check your internet connection and try again.',
        quickReplies: ['🔄 Retry Submission', '↩️ Start Over', 'Cancel'],
      );
    }
  }

  void _handleDoneAction(String reply) {
    if (reply == 'View My Tickets') {
      Navigator.pop(context);
      // Navigate to support tickets is handled by the parent (settings screen)
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.support_agent,
                  color: AppTheme.primaryColor, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Report a Problem',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Super Admin Support',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.normal),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        foregroundColor: isDark ? Colors.white : AppTheme.textPrimary,
        elevation: 1,
      ),
      backgroundColor: isDark ? const Color(0xFF121212) : const Color(0xFFF5F7FA),
      body: _isLoadingContext
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Status banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  color: AppTheme.primaryColor.withValues(alpha: 0.08),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppTheme.successColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Connected to Support  •  Reports go to Super Admin',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.white60 : AppTheme.textLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // Messages
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isBotTyping ? 1 : 0),
                    itemBuilder: (ctx, i) {
                      if (_isBotTyping && i == _messages.length) {
                        return _buildTypingBubble(isDark);
                      }
                      return _buildMessageBubble(_messages[i], isDark);
                    },
                  ),
                ),

                // Input bar
                _buildInputBar(isDark),
              ],
            ),
    );
  }

  Widget _buildMessageBubble(_ChatMessage msg, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment:
            msg.isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment:
                msg.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!msg.isUser) ...[
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.15),
                  child: const Icon(Icons.support_agent,
                      color: AppTheme.primaryColor, size: 16),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: msg.isUser
                        ? AppTheme.primaryColor
                        : (isDark ? const Color(0xFF1E1E1E) : Colors.white),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(msg.isUser ? 16 : 4),
                      bottomRight: Radius.circular(msg.isUser ? 4 : 16),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    msg.text,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: msg.isUser
                          ? Colors.white
                          : (isDark ? Colors.white.withValues(alpha: 0.87) : AppTheme.textPrimary),
                    ),
                  ),
                ),
              ),
              if (msg.isUser) ...[
                const SizedBox(width: 8),
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                  child: Text(
                    (_userName ?? 'U').substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: EdgeInsets.only(
              left: msg.isUser ? 0 : 40,
              right: msg.isUser ? 40 : 0,
            ),
            child: Text(
              _formatTime(msg.timestamp),
              style: TextStyle(
                fontSize: 10,
                color: isDark ? Colors.white38 : AppTheme.textLight,
              ),
            ),
          ),
          // Quick replies
          if (!msg.isUser && msg.quickReplies != null && msg.quickReplies!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8, left: 40),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: msg.quickReplies!.map((reply) {
                  return _buildQuickReplyChip(reply, isDark);
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQuickReplyChip(String reply, bool isDark) {
    return GestureDetector(
      onTap: () {
        if (_stage == _Stage.done) {
          _handleDoneAction(reply);
        } else {
          _handleQuickReply(reply);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.6)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Text(
          reply,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.white.withValues(alpha: 0.87) : AppTheme.primaryColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildTypingBubble(bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.15),
            child: const Icon(Icons.support_agent,
                color: AppTheme.primaryColor, size: 16),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(16),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                return _AnimatedDot(delay: Duration(milliseconds: i * 200));
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFE5E7EB),
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _inputController,
                enabled: _inputEnabled,
                maxLines: 3,
                minLines: 1,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: _inputEnabled
                      ? 'Type your message...'
                      : 'Please select an option above',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.white38 : AppTheme.textLight,
                    fontSize: 14,
                  ),
                  filled: true,
                  fillColor: isDark
                      ? const Color(0xFF2C2C2C)
                      : const Color(0xFFF3F4F6),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 10),
                ),
                style: TextStyle(
                  color: isDark ? Colors.white.withValues(alpha: 0.87) : AppTheme.textPrimary,
                  fontSize: 14,
                ),
                onSubmitted: (_) => _inputEnabled ? _handleTextSubmit() : null,
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _inputEnabled ? _handleTextSubmit : null,
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _inputEnabled
                      ? AppTheme.primaryColor
                      : (isDark ? const Color(0xFF2C2C2C) : Colors.grey[200]),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.send_rounded,
                  color: _inputEnabled
                      ? Colors.white
                      : (isDark ? Colors.white38 : Colors.grey[400]),
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _AnimatedDot extends StatefulWidget {
  final Duration delay;
  const _AnimatedDot({required this.delay});

  @override
  State<_AnimatedDot> createState() => _AnimatedDotState();
}

class _AnimatedDotState extends State<_AnimatedDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    Future.delayed(widget.delay, () {
      if (mounted) _ctrl.repeat(reverse: true);
    });
    _anim = Tween<double>(begin: 0, end: -6).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 3),
        child: Transform.translate(
          offset: Offset(0, _anim.value),
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
          ),
        ),
      ),
    );
  }
}
