class ChatMessage {
  final String id;
  final String chatId;
  final String senderId;
  final String? senderName;
  final String? senderImage;
  final String message;
  final String senderType; // 'user' or 'gym'
  final bool isRead;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  ChatMessage({
    required this.id,
    required this.chatId,
    required this.senderId,
    this.senderName,
    this.senderImage,
    required this.message,
    required this.senderType,
    this.isRead = false,
    required this.createdAt,
    this.metadata,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      chatId: (json['chatId'] ?? json['chat'] ?? '').toString(),
      senderId: (json['senderId'] ?? json['sender'] ?? '').toString(),
      senderName: json['senderName']?.toString(),
      senderImage: json['senderImage']?.toString(),
      message: (json['message'] ?? '').toString(),
      senderType: (json['senderType'] ?? 'user').toString(),
      isRead: json['isRead'] == true || json['isRead'] == 'true',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chatId': chatId,
      'senderId': senderId,
      'senderName': senderName,
      'senderImage': senderImage,
      'message': message,
      'senderType': senderType,
      'isRead': isRead,
      'createdAt': createdAt.toIso8601String(),
      if (metadata != null) 'metadata': metadata,
    };
  }

  bool get isFromUser => senderType == 'user';
  bool get isFromGym => senderType == 'gym';
}
