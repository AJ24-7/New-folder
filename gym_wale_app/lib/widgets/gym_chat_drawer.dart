import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:async';
import '../config/app_theme.dart';
import '../models/gym.dart';
import '../models/chat_message.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class GymChatDrawer extends StatefulWidget {
  final Gym gym;
  final VoidCallback onClose;
  final Function(int) onNewMessage;

  const GymChatDrawer({
    Key? key,
    required this.gym,
    required this.onClose,
    required this.onNewMessage,
  }) : super(key: key);

  @override
  State<GymChatDrawer> createState() => _GymChatDrawerState();
}

class _GymChatDrawerState extends State<GymChatDrawer>
    with SingleTickerProviderStateMixin {
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;
  
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  
  bool _isLoading = true;
  bool _isSending = false;
  bool _showTypingIndicator = false;
  Timer? _pollingTimer;
  String? _chatId;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(1.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));
    
    _slideController.forward();
    _loadChatHistory();
    _startPolling();
  }

  @override
  void dispose() {
    _slideController.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadChatHistory() async {
    setState(() => _isLoading = true);
    
    try {
      final result = await ApiService.getChatHistory(widget.gym.id);
      
      if (result['success'] == true && mounted) {
        _chatId = result['chatId'];
        final messages = result['messages'] as List;
        
        setState(() {
          _messages.clear();
          
          // Add fetched messages
          for (var msgData in messages) {
            _messages.add(ChatMessage(
              id: msgData['id'] ?? msgData['_id'] ?? '',
              chatId: _chatId ?? '',
              senderId: msgData['sender'] == 'user' ? 'user' : widget.gym.id,
              senderName: msgData['senderName'] ?? (msgData['sender'] == 'user' ? 'You' : widget.gym.name),
              message: msgData['message'] ?? '',
              senderType: msgData['sender'] ?? 'gym',
              createdAt: msgData['timestamp'] != null 
                  ? DateTime.parse(msgData['timestamp']) 
                  : DateTime.now(),
              metadata: msgData['metadata'],
            ));
          }
          
          // If no messages, add welcome message
          if (_messages.isEmpty) {
            _messages.add(ChatMessage(
              id: 'welcome',
              chatId: _chatId ?? '',
              senderId: widget.gym.id,
              senderName: widget.gym.name,
              message: 'Welcome to ${widget.gym.name}! How can we help you today?',
              senderType: 'gym',
              createdAt: DateTime.now(),
            ));
          }
          
          _isLoading = false;
        });
        _scrollToBottom();
      } else {
        // No chat history, add welcome message
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              id: 'welcome',
              chatId: _chatId ?? '',
              senderId: widget.gym.id,
              senderName: widget.gym.name,
              message: 'Welcome to ${widget.gym.name}! How can we help you today?',
              senderType: 'gym',
              createdAt: DateTime.now(),
            ));
            _isLoading = false;
          });
          _scrollToBottom();
        }
      }
    } catch (e) {
      print('Error loading chat: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      _checkForNewMessages();
    });
  }

  Future<void> _checkForNewMessages() async {
    if (!mounted) return;
    
    try {
      final result = await ApiService.getChatHistory(widget.gym.id);
      
      if (result['success'] == true && mounted) {
        final messages = result['messages'] as List;
        final previousMessageCount = _messages.length;
        
        // Build new message list
        final List<ChatMessage> newMessages = [];
        for (var msgData in messages) {
          newMessages.add(ChatMessage(
            id: msgData['id'] ?? msgData['_id'] ?? '',
            chatId: _chatId ?? '',
            senderId: msgData['sender'] == 'user' ? 'user' : widget.gym.id,
            senderName: msgData['senderName'] ?? (msgData['sender'] == 'user' ? 'You' : widget.gym.name),
            message: msgData['message'] ?? '',
            senderType: msgData['sender'] ?? 'gym',
            createdAt: msgData['timestamp'] != null 
                ? DateTime.parse(msgData['timestamp']) 
                : DateTime.now(),
            metadata: msgData['metadata'],
          ));
        }
        
        // Check if there are actual changes
        if (newMessages.length != _messages.length || 
            _hasMessageChanges(newMessages)) {
          
          // Store scroll position
          final bool wasAtBottom = _scrollController.hasClients &&
              _scrollController.position.pixels >= 
              _scrollController.position.maxScrollExtent - 50;
          
          setState(() {
            _messages.clear();
            _messages.addAll(newMessages);
          });
          
          // Scroll to bottom if we were already at bottom or if new messages arrived
          if (wasAtBottom || newMessages.length > previousMessageCount) {
            _scrollToBottom();
          }
          
          // Notify parent about new messages
          if (newMessages.length > previousMessageCount) {
            widget.onNewMessage(newMessages.length - previousMessageCount);
          }
        }
      }
    } catch (e) {
      print('Error checking for new messages: $e');
    }
  }
  
  bool _hasMessageChanges(List<ChatMessage> newMessages) {
    if (newMessages.length != _messages.length) return true;
    
    for (int i = 0; i < newMessages.length; i++) {
      if (newMessages[i].id != _messages[i].id ||
          newMessages[i].message != _messages[i].message) {
        return true;
      }
    }
    return false;
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty || _isSending) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (!authProvider.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login to send messages'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    setState(() => _isSending = true);
    _messageController.clear();

    // Add user message to UI immediately
    final userMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      chatId: _chatId ?? '',
      senderId: authProvider.user!.id,
      senderName: authProvider.user!.name,
      message: message,
      senderType: 'user',
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages.add(userMessage);
    });
    _scrollToBottom();

    try {
      // Call actual send message API
      final result = await ApiService.sendChatMessage(
        gymId: widget.gym.id,
        message: message,
      );
      
      if (result['success'] == true && mounted) {
        // Update chatId if it was just created
        if (_chatId == null || _chatId!.isEmpty) {
          _chatId = result['chatId'];
        }
        
        print('Message sent successfully to gym admin');
      } else {
        throw Exception(result['message'] ?? 'Failed to send message');
      }
    } catch (e) {
      print('Error sending message: $e');
      if (mounted) {
        // Remove the optimistically added message
        setState(() {
          _messages.remove(userMessage);
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send message: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
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

  void _sendQuickMessage(String message) {
    _messageController.text = message;
    _sendMessage();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: Align(
        alignment: Alignment.bottomRight,
        child: Container(
          width: 380,
          height: MediaQuery.of(context).size.height * 0.7,
          margin: const EdgeInsets.only(right: 20, bottom: 100),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 30,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildHeader(),
              _buildQuickActions(),
              Expanded(child: _buildMessagesList()),
              if (_showTypingIndicator) _buildTypingIndicator(),
              _buildInputArea(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Row(
        children: [
          // Gym Logo/Avatar
          CircleAvatar(
            radius: 22,
            backgroundColor: Colors.white.withOpacity(0.3),
            backgroundImage: widget.gym.logoUrl != null && widget.gym.logoUrl!.isNotEmpty
                ? CachedNetworkImageProvider(widget.gym.logoUrl!)
                : null,
            onBackgroundImageError: widget.gym.logoUrl != null && widget.gym.logoUrl!.isNotEmpty
                ? (exception, stackTrace) {
                    print('❌ Error loading gym logo: ${widget.gym.logoUrl} - $exception');
                  }
                : null,
            child: widget.gym.logoUrl == null || widget.gym.logoUrl!.isEmpty
                ? const Icon(Icons.fitness_center, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.gym.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.greenAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Online',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: widget.onClose,
            icon: const Icon(Icons.close, color: Colors.white),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final quickActions = [
      {'icon': Icons.card_membership, 'label': 'Membership Plans', 'message': 'What are your membership plans?'},
      {'icon': Icons.access_time, 'label': 'Timings', 'message': 'What are your operating hours?'},
      {'icon': Icons.calendar_today, 'label': 'Book Trial', 'message': 'Can I book a trial session?'},
      {'icon': Icons.fitness_center, 'label': 'Training', 'message': 'Do you offer personal training?'},
    ];

    return Container(
      padding: const EdgeInsets.all(12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: quickActions.map((action) {
          return InkWell(
            onTap: () => _sendQuickMessage(action['message'] as String),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.primaryColor.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(action['icon'] as IconData, size: 16, color: AppTheme.primaryColor),
                  const SizedBox(width: 6),
                  Text(
                    action['label'] as String,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildMessagesList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        return _buildMessageBubble(message);
      },
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isUser = message.isFromUser;
    
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.7,
        ),
        child: Column(
          crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: isUser
                    ? LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                      )
                    : null,
                color: isUser ? null : AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                message.message,
                style: TextStyle(
                  color: isUser ? Colors.white : AppTheme.textPrimary,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(message.createdAt),
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.backgroundColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (index) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  child: const CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  maxLines: null,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                  decoration: InputDecoration(
                    hintText: 'Type your message...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(25),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: AppTheme.backgroundColor,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _isSending ? Icons.hourglass_empty : Icons.send,
                        color: AppTheme.primaryColor,
                      ),
                      onPressed: _isSending ? null : _sendMessage,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Powered by FIT-verse AI',
            style: TextStyle(
              fontSize: 10,
              color: AppTheme.textSecondary.withOpacity(0.6),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }
}
