import 'package:flutter/material.dart';
import '../../models/support_models.dart';
import '../../services/support_service.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'dart:async';

class CommunicationsTab extends StatefulWidget {
  final List<Communication> communications;
  final VoidCallback onRefresh;
  final SupportService supportService;
  final String? communicationIdToOpen;

  const CommunicationsTab({
    Key? key,
    required this.communications,
    required this.onRefresh,
    required this.supportService,
    this.communicationIdToOpen,
  }) : super(key: key);

  @override
  State<CommunicationsTab> createState() => _CommunicationsTabState();
}

class _CommunicationsTabState extends State<CommunicationsTab> {
  String _searchQuery = '';
  String _filterStatus = 'all'; // all, active, resolved, closed
  bool _hasOpenedInitialChat = false;

  List<Communication> get _filteredCommunications {
    return widget.communications.where((comm) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!comm.userName.toLowerCase().contains(query) &&
            !comm.category.toLowerCase().contains(query)) {
          return false;
        }
      }

      // Status filter
      if (_filterStatus != 'all' && comm.status != _filterStatus) {
        return false;
      }

      return true;
    }).toList();
  }

  @override
  void didUpdateWidget(CommunicationsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Auto-open chat if communicationIdToOpen is provided and we haven't opened it yet
    if (widget.communicationIdToOpen != null && 
        !_hasOpenedInitialChat &&
        widget.communications.isNotEmpty) {
      _openChatFromId(widget.communicationIdToOpen!);
    }
  }

  void _openChatFromId(String communicationId) {
    // Find the communication by ID
    final communication = widget.communications.firstWhere(
      (comm) => comm.id == communicationId,
      orElse: () => widget.communications.isNotEmpty ? widget.communications.first : throw Exception('No communications found'),
    );
    
    // Mark as having opened the chat so we don't open it again
    if (mounted) {
      setState(() {
        _hasOpenedInitialChat = true;
      });
      
      // Open the chat after a short delay to ensure the UI is ready
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          _showChatDialog(communication);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search and Filters
        _buildSearchAndFilters(),
        // Communications List
        Expanded(
          child: _filteredCommunications.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: () async => widget.onRefresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredCommunications.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      return _buildCommunicationCard(_filteredCommunications[index]);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Column(
        children: [
          // Search bar
          TextField(
            decoration: InputDecoration(
              hintText: 'Search chats by member name or subject...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
              });
            },
          ),
          const SizedBox(height: 12),
          // Status filter
          DropdownButtonFormField<String>(
            initialValue: _filterStatus,
            decoration: InputDecoration(
              labelText: 'Status',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
            ),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('All Status')),
              DropdownMenuItem(value: 'active', child: Text('Active')),
              DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
              DropdownMenuItem(value: 'closed', child: Text('Closed')),
            ],
            onChanged: (value) {
              setState(() {
                _filterStatus = value ?? 'all';
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCommunicationCard(Communication communication) {
    Color statusColor = _getStatusColor(communication.status);
    bool hasUnread = communication.unreadCount > 0;
    bool hasAutomatedMessages = communication.messages.any((m) => 
      m.senderType == 'system' || 
      (m.metadata != null && m.metadata!['isAutomated'] == true)
    );
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: hasUnread ? 3 : 1,
      color: hasUnread 
          ? (isDark ? Colors.blue[900]!.withValues(alpha: 0.3) : Colors.blue[50])
          : null,
      child: InkWell(
        onTap: () => _showChatDialog(communication),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with name and status
              Row(
                children: [
                  _buildAvatar(communication.userImage, communication.userName, hasUnread),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      communication.userName,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: hasUnread
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (communication.isMember) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.green,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Text(
                                        'MEMBER',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                  if (hasAutomatedMessages) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.purple,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            '🤖',
                                            style: TextStyle(fontSize: 8),
                                          ),
                                          SizedBox(width: 2),
                                          Text(
                                            'BOT',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            if (hasUnread)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  communication.unreadCount > 99
                                      ? '99+'
                                      : communication.unreadCount.toString(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          communication.category,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      communication.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              if (communication.messages.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  communication.messages.last.message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.access_time, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    timeago.format(communication.messages.isNotEmpty ? communication.messages.last.timestamp : communication.updatedAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    icon: const Icon(Icons.chat, size: 16),
                    label: const Text('Open Chat'),
                    onPressed: () => _showChatDialog(communication),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 16),
          Text(
            'No conversations yet',
            style: TextStyle(
              fontSize: 16,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  void _showChatDialog(Communication communication) async {
    // Mark as read when opening
    if (communication.unreadCount > 0) {
      try {
        await widget.supportService.markChatAsRead(communication.id);
        // Refresh the list to update unread count
        widget.onRefresh();
      } catch (e) {
        print('Error marking chat as read: $e');
      }
    }

    showDialog(
      context: context,
      builder: (context) => _ChatDialog(
        communication: communication,
        supportService: widget.supportService,
        onRefresh: widget.onRefresh,
      ),
    );
  }

  Widget _buildAvatar(String? imageUrl, String name, bool hasUnread) {
    final bool hasValidImage = imageUrl != null && 
                                imageUrl.isNotEmpty && 
                                !imageUrl.endsWith('default.png') &&
                                imageUrl.startsWith('http');
    
    return CircleAvatar(
      backgroundColor: hasUnread ? Colors.blue : Colors.grey,
      child: hasValidImage
          ? ClipOval(
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                width: 40,
                height: 40,
                errorBuilder: (context, error, stackTrace) {
                  return Text(
                    name[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white),
                  );
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Text(
                    name[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white),
                  );
                },
              ),
            )
          : Text(
              name[0].toUpperCase(),
              style: const TextStyle(color: Colors.white),
            ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'resolved':
        return Colors.blue;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }
}

class _ChatDialog extends StatefulWidget {
  final Communication communication;
  final SupportService supportService;
  final VoidCallback onRefresh;

  const _ChatDialog({
    Key? key,
    required this.communication,
    required this.supportService,
    required this.onRefresh,
  }) : super(key: key);

  @override
  State<_ChatDialog> createState() => _ChatDialogState();
}

class _ChatDialogState extends State<_ChatDialog> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<ChatMessage> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  Timer? _pollingTimer;

  // Quick reply templates
  static const List<String> _quickReplies = [
    'Thank you for contacting us!',
    'We are looking into this matter.',
    'Your issue has been resolved.',
    'Please provide more details.',
    'We will get back to you soon.',
  ];

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _startPolling();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _pollingTimer?.cancel();
    super.dispose();
  }
  
  void _startPolling() {
    // Poll for new messages every 3 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      _checkForNewMessages();
    });
  }
  
  Future<void> _checkForNewMessages() async {
    if (!mounted || _isSending) return;
    
    try {
      final messages = await widget.supportService.getChatMessages(
        widget.communication.id,
      );
      
      if (mounted && messages.length != _messages.length) {
        // Store scroll position
        final bool wasAtBottom = _scrollController.hasClients &&
            _scrollController.position.pixels >= 
            _scrollController.position.maxScrollExtent - 50;
        
        setState(() {
          _messages = messages;
        });
        
        // Auto-scroll to bottom if we were already there
        if (wasAtBottom) {
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
        
        // Refresh parent to update unread counts
        widget.onRefresh();
      }
    } catch (e) {
      // Silently fail for polling errors
      print('Error polling for new messages: $e');
    }
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await widget.supportService.getChatMessages(
        widget.communication.id,
      );
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoading = false;
        });
        // Scroll to bottom after loading
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load messages: $e')),
        );
      }
    }
  }

  Future<void> _sendMessage(String message) async {
    if (message.trim().isEmpty || _isSending) return;

    setState(() {
      _isSending = true;
    });

    try {
      await widget.supportService.sendChatMessage(
        widget.communication.id,
        message.trim(),
      );
      _messageController.clear();
      await _loadMessages();
      widget.onRefresh();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.blue[900]!.withValues(alpha: 0.3)
                    : Colors.blue[50],
                border: Border(bottom: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
              ),
              child: Row(
                children: [
                  _buildDialogAvatar(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                widget.communication.userName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (widget.communication.isMember) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  'MEMBER',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          widget.communication.userEmail ?? widget.communication.category,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // Messages
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
                      ? const Center(child: Text('No messages yet'))
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            return _buildMessageBubble(_messages[index]);
                          },
                        ),
            ),
            // Quick Replies
            Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _quickReplies.length,
                itemBuilder: (context, index) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      label: Text(
                        _quickReplies[index],
                        style: const TextStyle(fontSize: 11),
                      ),
                      onPressed: () {
                        _messageController.text = _quickReplies[index];
                      },
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),
            // Input
            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        hintText: 'Type your message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                      maxLines: 3,
                      minLines: 1,
                      textInputAction: TextInputAction.send,
                      onSubmitted: _sendMessage,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: _isSending
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                    onPressed: _isSending
                        ? null
                        : () => _sendMessage(_messageController.text),
                    color: Colors.blue,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    bool isAdmin = message.senderType == 'admin';
    bool isAutomated = message.senderType == 'system' || 
                      (message.metadata != null && message.metadata!['isAutomated'] == true);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Align(
      alignment: isAdmin ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: isAutomated
              ? (isDark ? Colors.purple[900]!.withValues(alpha: 0.3) : Colors.purple[50])
              : (isAdmin 
                  ? (isDark ? Colors.blue[800] : Colors.blue[100])
                  : Theme.of(context).colorScheme.surfaceContainerHighest),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(12),
            topRight: const Radius.circular(12),
            bottomLeft: isAdmin ? const Radius.circular(12) : Radius.zero,
            bottomRight: isAdmin ? Radius.zero : const Radius.circular(12),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isAutomated)
              Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.purple.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  '🤖 automated msg',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Colors.purple,
                  ),
                ),
              ),
            Text(message.message),
            const SizedBox(height: 4),
            Text(
              timeago.format(message.timestamp),
              style: TextStyle(
                fontSize: 10,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDialogAvatar() {
    final imageUrl = widget.communication.userImage;
    final userName = widget.communication.userName;
    final bool hasValidImage = imageUrl != null && 
                                imageUrl.isNotEmpty && 
                                !imageUrl.endsWith('default.png') &&
                                imageUrl.startsWith('http');
    
    return CircleAvatar(
      backgroundColor: Colors.blue,
      child: hasValidImage
          ? ClipOval(
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                width: 40,
                height: 40,
                errorBuilder: (context, error, stackTrace) {
                  return Text(
                    userName[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white),
                  );
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Text(
                    userName[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white),
                  );
                },
              ),
            )
          : Text(
              userName[0].toUpperCase(),
              style: const TextStyle(color: Colors.white),
            ),
    );
  }
}
