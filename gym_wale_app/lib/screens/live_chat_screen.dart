import 'package:flutter/material.dart';
import 'dart:async';
import '../config/app_theme.dart';
import '../services/chatbot_service.dart';
import '../services/api_service.dart';
import '../l10n/app_localizations.dart';

class LiveChatScreen extends StatefulWidget {
  final String? gymId;
  final String? gymName;
  
  const LiveChatScreen({
    Key? key, 
    this.gymId,
    this.gymName,
  }) : super(key: key);

  @override
  State<LiveChatScreen> createState() => _LiveChatScreenState();
}

class _LiveChatScreenState extends State<LiveChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatBubble> _messages = [];
  final List<String> _messageHistory = [];
  
  bool _isLoading = false;
  bool _isBotTyping = false;
  bool _isConnectedToAdmin = false;
  String? _currentTicketId;
  String? _conversationContext;
  Timer? _pollTimer;
  int _consecutiveUnresolvedMessages = 0;

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _initializeChat() async {
    setState(() => _isLoading = true);

    // Send welcome message
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (mounted) {
      setState(() {
        _messages.add(ChatBubble(
          message: '''Hello! 👋 Welcome to Gym-wale Support!

I'm your AI assistant, here to help you 24/7.

I can assist with:
• Membership management
• Payment & billing
• Booking trials  
• Technical issues
• General queries

What can I help you with today?''',
          isUser: false,
          timestamp: DateTime.now(),
          quickReplies: ['My Membership Status', 'Payment History', 'Book Trial', 'Technical Support'],
        ));
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  Future<void> _handleSendMessage(String message) async {
    if (message.trim().isEmpty) return;

    final userMessage = message.trim();
    _messageController.clear();

    // Add user message
    setState(() {
      _messages.add(ChatBubble(
        message: userMessage,
        isUser: true,
        timestamp: DateTime.now(),
      ));
      _isBotTyping = true;
      _messageHistory.add(userMessage);
    });
    _scrollToBottom();

    // Check if connected to admin
    if (_isConnectedToAdmin && _currentTicketId != null) {
      await _sendToAdmin(userMessage);
      return;
    }

    // Check if user wants human agent
    if (ChatbotService.wantsHumanAgent(userMessage)) {
      await _escalateToAdmin(userMessage);
      return;
    }

    // Check if should auto-escalate due to frustration or too many messages
    if (ChatbotService.shouldAutoEscalate(userMessage, _messageHistory)) {
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        setState(() {
          _messages.add(ChatBubble(
            message: '''I sense you might need more personalized help. Let me connect you with a support specialist who can better assist you.

Connecting to support team...''',
            isUser: false,
            timestamp: DateTime.now(),
            isSystem: true,
          ));
        });
        _scrollToBottom();
      }
      await _escalateToAdmin(userMessage, autoConnect: true);
      return;
    }

    // Get bot response with user context
    try {
      print('Getting bot response for: $userMessage');
      final response = await ChatbotService.getResponse(
        userMessage,
        conversationContext: _conversationContext,
        userContext: {}, // Can pass user-specific data here if needed
      );
      print('Bot response type: ${response['type']}');
      print('Bot response category: ${response['category']}');

      await Future.delayed(const Duration(milliseconds: 800));

      if (mounted) {
        // Track if response was helpful
        if (response['type'] == 'unknown') {
          _consecutiveUnresolvedMessages++;
        } else {
          _consecutiveUnresolvedMessages = 0;
        }

        // Auto-escalate after 3 unresolved queries
        if (_consecutiveUnresolvedMessages >= 3) {
          setState(() {
            _messages.add(ChatBubble(
              message: '''It seems I'm having trouble understanding your needs. Let me connect you with a human support agent who can better assist you.

Connecting to support team...''',
              isUser: false,
              timestamp: DateTime.now(),
              isSystem: true,
            ));
          });
          _scrollToBottom();
          await Future.delayed(const Duration(milliseconds: 1000));
          await _escalateToAdmin(userMessage, autoConnect: true);
          return;
        }

        setState(() {
          _messages.add(ChatBubble(
            message: response['message'],
            isUser: false,
            timestamp: DateTime.now(),
            quickReplies: response['suggestedActions'] != null
                ? List<String>.from(response['suggestedActions'])
                : ChatbotService.getQuickReplies(response['context'] ?? ''),
          ));

          if (response['followUp'] != null) {
            _conversationContext = response['context'];
          }

          if (response['requiresEscalation'] == true) {
            _escalateToAdmin(userMessage, autoConnect: true);
          }

          _isBotTyping = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      print('Error getting bot response: $e');
      if (mounted) {
        setState(() {
          _messages.add(ChatBubble(
            message: 'Sorry, I encountered an error. Let me connect you with a human agent.',
            isUser: false,
            timestamp: DateTime.now(),
          ));
          _isBotTyping = false;
        });
        _scrollToBottom();
        await _escalateToAdmin(userMessage, autoConnect: true);
      }
    }
  }

  Future<void> _escalateToAdmin(String userMessage, {bool autoConnect = false}) async {
    setState(() => _isBotTyping = true);

    try {
      final category = ChatbotService.detectCategory(userMessage) ?? 'general';
      
      // Prepare chat history for context - Include ALL messages (bot and user)
      final chatHistory = _messages
          .where((m) => !m.isSystem)
          .map((m) => {
                'message': m.message,
                'isUser': m.isUser,
                'timestamp': m.timestamp.toIso8601String(),
              })
          .toList();
      
      // Use widget's gymId if available
      final gymId = widget.gymId;
      final gymName = widget.gymName ?? 'gym';
      
      final result = await ApiService.createSupportTicket(
        category: category,
        subject: gymId != null 
            ? 'Chat Support - $gymName' 
            : 'Live Chat Support - ${category.toUpperCase()}',
        message: '''User Query: $userMessage

Category: ${category.toUpperCase()}
${gymId != null ? 'Gym: $gymName' : ''}
Escalation Reason: ${autoConnect ? 'Auto-escalated' : 'User requested'}

--- Chat History ---
${chatHistory.map((m) => '${m['isUser'] == true ? 'User' : 'Bot'}: ${m['message']}').join('\n')}
''',
        priority: autoConnect ? 'high' : 'medium',
        metadata: {
          'chatHistory': chatHistory,
          'detectedCategory': category,
          'escalationType': autoConnect ? 'auto' : 'manual',
          'messageCount': _messageHistory.length,
          'source': 'chat',
          if (gymId != null) 'gymId': gymId,
          'gymName': gymName,
        },
      );

      if (result['success'] == true) {
        _currentTicketId = result['ticketId'];
        final ticketId = _currentTicketId!.substring(0, 8);
        
        if (mounted) {
          setState(() {
            _isConnectedToAdmin = true;
            _consecutiveUnresolvedMessages = 0;
            _messages.add(ChatBubble(
              message: '''✅ **Connected to Live Support!**

**Ticket ID:** #$ticketId
**Category:** ${category.toUpperCase()}
**Priority:** ${autoConnect ? 'High' : 'Medium'}

🟢 A support specialist will respond shortly
⏱️ Average wait time: 2-5 minutes

Your complete chat history has been shared with the support team for better context.

Feel free to continue messaging - all responses will come from our support team.''',
              isUser: false,
              timestamp: DateTime.now(),
              isSystem: true,
            ));
            _isBotTyping = false;
          });
          _scrollToBottom();
          
          // Start polling for admin responses
          _startPollingForAdminReplies();
        }
      } else {
        throw Exception(result['message'] ?? 'Failed to create ticket');
      }
    } catch (e) {
      print('Error escalating to admin: $e');
      if (mounted) {
        setState(() {
          _messages.add(ChatBubble(
            message: '''❌ **Connection Failed**

We couldn't connect you to a support agent right now.

**Alternative Options:**
• Try again in a moment
• Create a support ticket manually
• Email us at support@gymwale.com

We apologize for the inconvenience!''',
            isUser: false,
            timestamp: DateTime.now(),
            isSystem: true,
            quickReplies: ['Try Again', 'Create Ticket', 'Back to Bot'],
          ));
          _isBotTyping = false;
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _sendToAdmin(String message) async {
    try {
      await ApiService.addTicketMessage(_currentTicketId!, message);
      
      setState(() {
        _isBotTyping = false;
      });
    } catch (e) {
      print('Error sending message to admin: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send message. Please try again.'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  void _startPollingForAdminReplies() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!_isConnectedToAdmin || _currentTicketId == null) {
        timer.cancel();
        return;
      }

      try {
        final ticket = await ApiService.getTicketDetails(_currentTicketId!);
        
        if (ticket != null && ticket['messages'] != null) {
          final messages = ticket['messages'] as List;
          final adminMessages = messages.where((m) => 
            m['sender'] == 'admin' && 
            !_messages.any((existing) => 
              existing.adminMessageId == m['_id']
            )
          ).toList();

          if (adminMessages.isNotEmpty && mounted) {
            setState(() {
              for (var msg in adminMessages) {
                _messages.add(ChatBubble(
                  message: msg['message'] ?? '',
                  isUser: false,
                  timestamp: DateTime.tryParse(msg['createdAt'] ?? '') ?? DateTime.now(),
                  adminMessageId: msg['_id'],
                  senderName: msg['senderName'] ?? 'Support Agent',
                ));
              }
            });
            _scrollToBottom();
          }

          // Check if ticket is closed
          if (ticket['status'] == 'closed' || ticket['status'] == 'resolved') {
            timer.cancel();
            if (mounted) {
              setState(() {
                _isConnectedToAdmin = false;
                _messages.add(ChatBubble(
                  message: '''This chat session has been closed.

Ticket Status: ${ticket['status']}

Thank you for contacting Gym-wale support! Feel free to start a new chat if you need more help.''',
                  isUser: false,
                  timestamp: DateTime.now(),
                  isSystem: true,
                ));
              });
              _scrollToBottom();
            }
          }
        }
      } catch (e) {
        print('Error polling for admin replies: $e');
      }
    });
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

  void _handleQuickReply(String reply) {
    print('Quick reply clicked: $reply');
    _handleSendMessage(reply);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Live Support Chat'),
            if (_isConnectedToAdmin)
              const Text(
                '🟢 Connected to Agent',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              )
            else
              const Text(
                '🤖 AI Assistant',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              ),
          ],
        ),
        elevation: 0,
        actions: [
          if (_currentTicketId != null)
            IconButton(
              icon: const Icon(Icons.info_outline),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Chat Information'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Ticket ID: $_currentTicketId'),
                        const SizedBox(height: 8),
                        Text('Status: ${_isConnectedToAdmin ? "Connected to Agent" : "Bot Chat"}'),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isBotTyping ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _isBotTyping) {
                        return _buildTypingIndicator();
                      }
                      return _messages[index];
                    },
                  ),
          ),

          // Input area
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: _isConnectedToAdmin 
                          ? 'Message support agent...'
                          : 'Type your message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: AppTheme.borderColor),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: _handleSendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: () => _handleSendMessage(_messageController.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDot(0),
                const SizedBox(width: 4),
                _buildDot(1),
                const SizedBox(width: 4),
                _buildDot(2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 600),
      builder: (context, value, child) {
        final delay = index * 0.2;
        final animValue = ((value - delay) % 1.0).clamp(0.0, 1.0);
        return Opacity(
          opacity: 0.4 + (animValue * 0.6),
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: AppTheme.textSecondary,
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }
}

class ChatBubble extends StatelessWidget {
  final String message;
  final bool isUser;
  final DateTime timestamp;
  final List<String>? quickReplies;
  final bool isSystem;
  final String? adminMessageId;
  final String? senderName;

  const ChatBubble({
    Key? key,
    required this.message,
    required this.isUser,
    required this.timestamp,
    this.quickReplies,
    this.isSystem = false,
    this.adminMessageId,
    this.senderName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!isUser && senderName != null)
            Padding(
              padding: const EdgeInsets.only(left: 8, bottom: 4),
              child: Text(
                senderName!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser)
                Container(
                  width: 32,
                  height: 32,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    gradient: isSystem
                        ? LinearGradient(
                            colors: [Colors.blue[400]!, Colors.blue[600]!],
                          )
                        : LinearGradient(
                            colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                          ),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isSystem ? Icons.info : (adminMessageId != null ? Icons.person : Icons.smart_toy),
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: isUser
                        ? LinearGradient(
                            colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                          )
                        : null,
                    color: isUser ? null : (isSystem 
                        ? Theme.of(context).colorScheme.primaryContainer 
                        : Theme.of(context).colorScheme.surfaceContainerHighest),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(20),
                      topRight: const Radius.circular(20),
                      bottomLeft: Radius.circular(isUser ? 20 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 20),
                    ),
                    border: isSystem
                        ? Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.5), width: 1)
                        : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message,
                        style: TextStyle(
                          color: isUser ? Colors.white : Theme.of(context).textTheme.bodyLarge?.color,
                          fontSize: 15,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatTime(timestamp),
                        style: TextStyle(
                          color: isUser
                              ? Colors.white.withOpacity(0.7)
                              : Theme.of(context).textTheme.bodySmall?.color,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (quickReplies != null && quickReplies!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: quickReplies!.map((reply) {
                  return OutlinedButton(
                    onPressed: () {
                      final chatState = context.findAncestorStateOfType<_LiveChatScreenState>();
                      chatState?._handleQuickReply(reply);
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.primaryColor),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    child: Text(
                      reply,
                      style: const TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 13,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      return '${diff.inHours}h ago';
    } else {
      return '${time.hour}:${time.minute.toString().padLeft(2, '0')}';
    }
  }
}
