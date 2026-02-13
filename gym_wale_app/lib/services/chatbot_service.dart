import 'dart:async';
import 'api_service.dart';

class ChatbotService {
  static const Map<String, List<Map<String, dynamic>>> _knowledgeBase = {
    'membership': [
      {
        'keywords': ['cancel', 'cancellation', 'stop membership', 'end membership'],
        'response': '''To cancel your membership:
1. Go to Settings → Memberships tab
2. Select the active membership
3. Click on "Cancel Membership" button
4. Confirm your cancellation

Note: Refunds are processed within 5-7 business days for eligible cancellations.

Does this help? Reply with "yes" or "no".''',
        'followUp': 'Would you like me to connect you with an admin for further assistance?'
      },
      {
        'keywords': ['freeze', 'pause', 'hold membership'],
        'response': '''To freeze your membership:
1. Go to Settings → Memberships tab
2. Select your active membership
3. Look for "Freeze Membership" option
4. Select the freeze duration (max 30 days)
5. Confirm the freeze

Your membership will be paused and extended by the freeze duration.

Does this solve your issue?''',
        'followUp': 'Need more help? I can connect you with our support team.'
      },
      {
        'keywords': ['extend', 'renew', 'continue membership'],
        'response': '''To extend/renew your membership:
1. Visit the gym details page
2. Click on "Renew Membership"
3. Select your preferred plan
4. Complete the payment

You can also enable auto-renewal in membership settings.

Is this helpful?''',
        'followUp': 'Would you like assistance with the renewal process?'
      },
    ],
    'payment': [
      {
        'keywords': ['payment failed', 'transaction failed', 'payment error'],
        'response': '''If your payment failed:
1. Check your internet connection
2. Verify your payment method details
3. Ensure sufficient balance
4. Try using a different payment method
5. Clear app cache and retry

If the issue persists, I can help you connect with our payment support team.

Did this resolve your issue?''',
        'followUp': 'Shall I escalate this to our payment specialists?'
      },
      {
        'keywords': ['refund', 'money back', 'return payment'],
        'response': '''Refund Process:
• Cancellations within 7 days: Full refund
• After 7 days: Prorated refund (if eligible)
• Processing time: 5-7 business days

To request a refund:
1. Go to Settings → Payments → Transactions
2. Find the transaction
3. Click "Request Refund"
4. Provide reason and submit

Would you like to proceed with a refund request?''',
        'followUp': 'I can connect you with our billing team for immediate assistance.'
      },
    ],
    'booking': [
      {
        'keywords': ['trial', 'trial booking', 'book trial', 'free trial'],
        'response': '''To book a trial session:
1. Browse gyms on the Explore page
2. Select a gym you like
3. Click "Book Trial"
4. Choose date and time slot
5. Confirm booking

Note: You can book up to 3 trial sessions total.

Need help booking?''',
        'followUp': 'Would you like me to guide you through the booking process?'
      },
      {
        'keywords': ['reschedule', 'change booking', 'modify trial'],
        'response': '''To reschedule a trial:
1. Go to Bookings → Trials tab
2. Select your trial booking
3. Click "Reschedule"
4. Choose new date/time
5. Confirm changes

Rescheduling is free if done 24+ hours before the trial.

Did this answer your question?''',
        'followUp': 'Need help with rescheduling?'
      },
    ],
    'technical': [
      {
        'keywords': ['app crash', 'not working', 'freezing', 'slow'],
        'response': '''Quick fixes:
1. Force close and restart the app
2. Clear app cache:
   - Settings → Apps → Gym-wale → Clear Cache
3. Update to latest version from Play Store
4. Restart your device
5. Reinstall the app (last resort)

Has this resolved the issue?''',
        'followUp': 'If problem persists, I\'ll connect you with our technical team.'
      },
      {
        'keywords': ['login problem', 'cant login', 'forgot password'],
        'response': '''Login Issues:

For forgot password:
1. Click "Forgot Password" on login screen
2. Enter your registered email
3. Check email for reset link
4. Create new password

For other login issues:
• Verify email/phone number is correct
• Check internet connection
• Try social login (Google)

Are you able to login now?''',
        'followUp': 'Still having trouble? I can escalate this to support.'
      },
    ],
    'general': [
      {
        'keywords': ['how to', 'guide', 'help', 'tutorial'],
        'response': '''I can help you with:

📱 **Membership Issues** - Cancel, freeze, renew
💳 **Payment Problems** - Failed payments, refunds
📅 **Bookings** - Trial sessions, rescheduling
🔧 **Technical Issues** - App problems, login
💪 **Gym Services** - Finding gyms, facilities

What do you need help with?''',
        'followUp': 'Please describe your specific issue.'
      },
    ],
  };

  static const List<String> _greetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'start'
  ];
  
  // Check if message is ONLY a greeting (not a greeting + question)
  static bool _isOnlyGreeting(String message) {
    final lowerMessage = message.toLowerCase().trim();
    // Exact matches or very short greetings
    if (lowerMessage.length <= 20 && _greetings.any((g) => lowerMessage == g || lowerMessage.startsWith('$g ') || lowerMessage.startsWith('$g!'))) {
      return true;
    }
    return false;
  }

  static const List<String> _confirmations = [
    'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'affirmative'
  ];

  static const List<String> _negations = [
    'no', 'nope', 'nah', 'not', 'negative', 'wrong'
  ];

  /// Get automated response based on user message
  static Future<Map<String, dynamic>> getResponse(
    String message, {
    String? conversationContext,
    Map<String, dynamic>? userContext,
  }) async {
    // Simulate processing delay for realistic chat experience
    await Future.delayed(const Duration(milliseconds: 500));

    final lowerMessage = message.toLowerCase().trim();

    // First, try to detect specific categories (before checking greetings)
    final category = detectCategory(lowerMessage);
    print('Detected category: $category for message: $lowerMessage');
    
    if (category != null) {
      final dynamicResponse = await _getDynamicResponse(category, lowerMessage, userContext);
      if (dynamicResponse != null) {
        print('Returning dynamic response for category: $category');
        return dynamicResponse;
      } else {
        print('Dynamic response returned null for category: $category');
      }
    } else {
      print('No category detected for message: $lowerMessage');
    }

    // Handle greetings (only if message is purely a greeting, not a question)
    if (_isOnlyGreeting(message)) {
      return {
        'type': 'greeting',
        'message': '''Hello! 👋 I'm your Gym-wale Assistant.

I can help you with:
• Membership management
• Payment and billing
• Booking trials
• Technical issues
• General queries

How can I assist you today?''',
        'requiresEscalation': false,
        'suggestedActions': ['My Membership Status', 'Payment History', 'Book Trial', 'Technical Support'],
      };
    }

    // Handle confirmations
    if (conversationContext == 'awaiting_escalation') {
      if (_confirmations.any((word) => lowerMessage.contains(word))) {
        return {
          'type': 'escalation',
          'message': 'Perfect! Connecting you with a support agent... Please hold on.',
          'requiresEscalation': true,
          'escalationType': 'admin',
        };
      } else if (_negations.any((word) => lowerMessage.contains(word))) {
        return {
          'type': 'continue',
          'message': 'No problem! Is there anything else I can help you with?',
          'requiresEscalation': false,
        };
      }
    }



    // Search knowledge base for matching response
    for (final category in _knowledgeBase.entries) {
      for (final item in category.value) {
        final keywords = item['keywords'] as List<String>;
        if (keywords.any((keyword) => lowerMessage.contains(keyword.toLowerCase()))) {
          return {
            'type': 'solution',
            'category': category.key,
            'message': item['response'],
            'followUp': item['followUp'],
            'requiresEscalation': false,
            'context': 'awaiting_escalation',
          };
        }
      }
    }

    // If no match found, offer to escalate
    return {
      'type': 'unknown',
      'message': '''I'm not sure I understand your question. 

Could you please:
• Rephrase your query
• Choose from common issues below
• Or let me connect you with a human agent

What would you prefer?''',
      'requiresEscalation': false,
      'suggestedActions': [
        'Talk to Agent',
        'My Membership Status',
        'Payment History',
        'Technical Support',
      ],
      'context': 'unknown_query',
    };
  }

  /// Get dynamic response with real user data
  static Future<Map<String, dynamic>?> _getDynamicResponse(
    String category,
    String message,
    Map<String, dynamic>? userContext,
  ) async {
    print('=== GET DYNAMIC RESPONSE ===');
    print('Category: $category');
    print('Message: $message');
    
    try {
      switch (category) {
        case 'membership':
          print('Calling membership handler...');
          return await _handleMembershipQuery(message);
        
        case 'payment':
          print('Calling payment handler...');
          return await _handlePaymentQuery(message);
        
        case 'booking':
          print('Calling booking handler...');
          return await _handleBookingQuery(message);
        
        case 'general':
          print('Calling general/navigation handler...');
          return _handleGeneralQuery(message);
        
        case 'technical':
          print('Calling technical handler...');
          return _handleTechnicalQuery(message);
        
        default:
          print('No handler for category: $category');
          return null;
      }
    } catch (e) {
      print('Error getting dynamic response: $e');
      return null;
    }
  }
  
  /// Handle general queries like Browse Gyms
  static Map<String, dynamic> _handleGeneralQuery(String message) {
    if (message.toLowerCase().contains('browse')) {
      return {
        'type': 'navigation',
        'category': 'general',
        'message': '''🏋️ **Browse Gyms**

To explore gyms in your area:
1. Go to the **Explore** tab (home screen)
2. Use filters to refine your search:
   • Location/Distance
   • Price range
   • Facilities & amenities
   • Ratings
3. Tap on any gym to view details
4. Book a trial or purchase membership

Would you like help with anything specific?''',
        'requiresEscalation': false,
        'suggestedActions': ['Book Trial', 'My Memberships', 'Talk to Agent'],
      };
    }
    
    return {
      'type': 'info',
      'category': 'general',
      'message': '''I can help you with:

🏋️ **Browse & Find Gyms** - Search nearby gyms
💳 **Memberships** - View, manage, renew
💰 **Payments** - Transactions, refunds
📅 **Bookings** - Trial sessions
🔧 **Support** - Technical help

What would you like to do?''',
      'requiresEscalation': false,
      'suggestedActions': ['Browse Gyms', 'My Membership Status', 'Payment History'],
    };
  }
  
  /// Handle technical support queries
  static Map<String, dynamic> _handleTechnicalQuery(String message) {
    return {
      'type': 'support',
      'category': 'technical',
      'message': '''🔧 **Technical Support**

Common fixes:
• Force close and restart the app
• Clear app cache in phone settings
• Check for app updates
• Ensure stable internet connection
• Try logging out and back in

If the problem persists, I can connect you with our technical support team who can provide personalized assistance.

Does this help, or would you like to speak with a support agent?''',
      'requiresEscalation': false,
      'suggestedActions': ['Talk to Agent', 'Try Again', 'Report Bug'],
    };
  }
  
  /// Handle membership-related queries with real data
  static Future<Map<String, dynamic>?> _handleMembershipQuery(String message) async {
    print('=== MEMBERSHIP QUERY HANDLER ===');
    print('Message: $message');
    
    try {
      // Fetch user's active memberships
      print('Fetching active memberships from API...');
      final memberships = await ApiService.getActiveMemberships();
      print('Received ${memberships.length} memberships');
      if (memberships.isNotEmpty) {
        print('First membership data: ${memberships[0]}');
      }
      
      // Default: Show membership overview for general queries
      if (message.contains('help') || message.contains('status') || message.contains('active') || 
          message.contains('my membership') || message.contains('membership')) {
        print('Matched membership query - showing overview');
        if (memberships.isEmpty) {
          return {
            'type': 'data_response',
            'category': 'membership',
            'message': '''📋 **Membership Status**

You don't have any active memberships at the moment.

Would you like to:
• Browse nearby gyms
• View membership plans
• Learn about benefits

What would you like to do?''',
            'requiresEscalation': false,
            'suggestedActions': ['Browse Gyms', 'View Plans', 'Talk to Agent'],
          };
        } else {
          final membershipInfo = StringBuffer('📋 **Your Active Memberships**\n\n');
          
          for (var i = 0; i < memberships.length; i++) {
            final m = memberships[i];
            // Handle multiple possible field name variations
            final gymName = m['gymName'] ?? m['gym_name'] ?? m['gymId']?['name'] ?? m['gym']?['name'] ?? 'Unknown Gym';
            final planName = m['planName'] ?? m['plan_name'] ?? m['membershipPlan'] ?? m['membership_plan'] ?? m['plan'] ?? 'Unknown Plan';
            final endDate = m['endDate'] ?? m['end_date'] ?? m['validUntil'] ?? m['valid_until'] ?? m['expiryDate'] ?? m['expiry_date'];
            final startDate = m['startDate'] ?? m['start_date'] ?? m['createdAt'] ?? m['created_at'];
            final status = m['status'] ?? 'active';
            
            String formattedEndDate = 'N/A';
            if (endDate != null) {
              try {
                formattedEndDate = DateTime.parse(endDate.toString()).toString().split(' ')[0];
              } catch (e) {
                formattedEndDate = endDate.toString();
              }
            }
            
            print('Membership $i: Gym=$gymName, Plan=$planName, End=$formattedEndDate, Status=$status');
            
            membershipInfo.write('''${i + 1}. **$gymName**
   Plan: $planName
   Status: ${status.toUpperCase()}
   Valid until: $endDate
   
''');
          }
          
          membershipInfo.write('\nNeed help with any of these memberships?');
          
          return {
            'type': 'data_response',
            'category': 'membership',
            'message': membershipInfo.toString(),
            'requiresEscalation': false,
            'suggestedActions': ['Cancel Membership', 'Freeze Membership', 'Renew Membership'],
          };
        }
      }
      
      // Check for expiring memberships
      if (message.contains('expir') || message.contains('renew') || message.contains('extend')) {
        final expiringMemberships = memberships.where((m) {
          if (m['endDate'] == null) return false;
          final endDate = DateTime.parse(m['endDate']);
          final daysLeft = endDate.difference(DateTime.now()).inDays;
          return daysLeft <= 30 && daysLeft >= 0;
        }).toList();
        
        if (expiringMemberships.isNotEmpty) {
          final info = StringBuffer('⏰ **Memberships Expiring Soon**\n\n');
          
          for (var m in expiringMemberships) {
            final gymName = m['gymName'] ?? 'Unknown Gym';
            final endDate = DateTime.parse(m['endDate']);
            final daysLeft = endDate.difference(DateTime.now()).inDays;
            
            info.write('''• **$gymName**
  Expires in: $daysLeft days
  
''');
          }
          
          info.write('To renew:\n1. Go to the gym page\n2. Click "Renew Membership"\n3. Select your plan\n4. Complete payment\n\nNeed help renewing?');
          
          return {
            'type': 'data_response',
            'category': 'membership',
            'message': info.toString(),
            'requiresEscalation': false,
            'suggestedActions': ['Yes, help me renew', 'View Membership Plans', 'Talk to Agent'],
          };
        } else {
          return {
            'type': 'data_response',
            'category': 'membership',
            'message': '''✅ All your memberships are valid!

No memberships expiring in the next 30 days.

You can enable auto-renewal in your membership settings to avoid interruptions.

Need anything else?''',
            'requiresEscalation': false,
            'suggestedActions': ['View Memberships', 'Browse Gyms', 'I\'m good'],
          };
        }
      }
    } catch (e) {
      print('Error handling membership query: $e');
      return {
        'type': 'error_response',
        'category': 'membership',
        'message': '''Sorry, I encountered an error fetching your membership information.

Please try again or let me connect you with a support agent who can help.''',
        'requiresEscalation': false,
        'suggestedActions': ['Try Again', 'Talk to Agent'],
      };
    }
    
    return null;
  }

  /// Handle payment-related queries with real data
  static Future<Map<String, dynamic>?> _handlePaymentQuery(String message) async {
    print('=== PAYMENT QUERY HANDLER ===');
    print('Message: $message');
    
    try {
      // Fetch user's payment history
      print('Fetching payment history from API...');
      final paymentsResult = await ApiService.getUserPayments();
      print('Payment API result: $paymentsResult');
      final payments = paymentsResult['payments'] as List? ?? [];
      print('Received ${payments.length} payments');
      if (payments.isNotEmpty) {
        print('First payment data: ${payments[0]}');
      }
      
      // Default: Show payment overview for general queries
      if (message.contains('help') || message.contains('issue') || message.contains('history') || 
          message.contains('transaction') || message.contains('my payment') || message.contains('payment')) {
        print('Matched payment query - showing overview');
        if (payments.isEmpty) {
          return {
            'type': 'data_response',
            'category': 'payment',
            'message': '''💳 **Payment History**

You don't have any payment transactions yet.

Once you make your first membership payment, it will appear here.

Need help with making a payment?''',
            'requiresEscalation': false,
            'suggestedActions': ['Browse Gyms', 'Payment Help', 'Talk to Agent'],
          };
        } else {
          final recentPayments = payments.take(5).toList();
          final paymentInfo = StringBuffer('💳 **Recent Payment History**\n\n');
          
          for (var i = 0; i < recentPayments.length; i++) {
            final p = recentPayments[i];
            // Handle multiple possible field name variations
            final amount = p['amount'] ?? p['paymentAmount'] ?? p['payment_amount'] ?? p['totalAmount'] ?? p['total_amount'] ?? 0;
            final status = p['status'] ?? p['paymentStatus'] ?? p['payment_status'] ?? 'unknown';
            final dateField = p['createdAt'] ?? p['created_at'] ?? p['paymentDate'] ?? p['payment_date'] ?? p['date'];
            final method = p['paymentMethod'] ?? p['payment_method'] ?? p['paymentMode'] ?? p['payment_mode'] ?? p['method'] ?? 'N/A';
            
            String formattedDate = 'N/A';
            if (dateField != null) {
              try {
                formattedDate = DateTime.parse(dateField.toString()).toString().split(' ')[0];
              } catch (e) {
                formattedDate = dateField.toString();
              }
            }
            
            print('Payment $i: Amount=$amount, Status=$status, Date=$formattedDate, Method=$method');
            
            final statusEmoji = status == 'completed' ? '✅' : 
                               status == 'pending' ? '⏳' : 
                               status == 'failed' ? '❌' : '❓';
            
            paymentInfo.write('''$statusEmoji ${i + 1}. ₹$amount
   Status: ${status.toUpperCase()}
   Method: $method
   Date: $formattedDate
   
''');
          }
          
          paymentInfo.write('Need help with any transaction?');
          
          return {
            'type': 'data_response',
            'category': 'payment',
            'message': paymentInfo.toString(),
            'requiresEscalation': false,
            'suggestedActions': ['Request Refund', 'Payment Issue', 'Talk to Agent'],
          };
        }
      }
      
      // Check for failed payments
      if (message.contains('fail') || message.contains('error') || message.contains('problem')) {
        final failedPayments = payments.where((p) => p['status'] == 'failed').toList();
        
        if (failedPayments.isNotEmpty) {
          final info = StringBuffer('❌ **Failed Payments Found**\n\n');
          info.write('You have ${failedPayments.length} failed payment(s):\n\n');
          
          for (var p in failedPayments.take(3)) {
            final amount = p['amount'] ?? 0;
            final date = p['createdAt'] != null
                ? DateTime.parse(p['createdAt']).toString().split(' ')[0]
                : 'N/A';
            
            info.write('• ₹$amount on $date\n');
          }
          
          info.write('''\n**Common Solutions:**
1. Check internet connection
2. Verify payment method
3. Ensure sufficient balance
4. Try different payment method
5. Clear app cache

Would you like to retry or talk to our payment team?''');
          
          return {
            'type': 'data_response',
            'category': 'payment',
            'message': info.toString(),
            'requiresEscalation': false,
            'suggestedActions': ['Retry Payment', 'Payment Help', 'Talk to Agent'],
          };
        } else {
          return {
            'type': 'data_response',
            'category': 'payment',
            'message': '''✅ **No Failed Payments**

Good news! You don't have any failed payment transactions.

All your payments have been processed successfully.

Need help with anything else?''',
            'requiresEscalation': false,
            'suggestedActions': ['Payment History', 'Make Payment', 'Talk to Agent'],
          };
        }
      }
    } catch (e) {
      print('Error handling payment query: $e');
      return {
        'type': 'error_response',
        'category': 'payment',
        'message': '''Sorry, I encountered an error fetching your payment information.

Please try again or let me connect you with a support agent who can help.''',
        'requiresEscalation': false,
        'suggestedActions': ['Try Again', 'Talk to Agent'],
      };
    }
    
    return null;
  }

  /// Handle booking-related queries with real data
  static Future<Map<String, dynamic>?> _handleBookingQuery(String message) async {
    try {
      // Fetch user's trial bookings
      final trialBookings = await ApiService.getTrialBookings();
      final trialLimits = await ApiService.getTrialLimits();
      
      // Default: Show trial booking overview for general queries
      if (message.contains('help') || message.contains('trial') || message.contains('booking') || 
          message.contains('book')) {
        final usedTrials = trialBookings.length;
        final totalTrials = trialLimits?['total'] ?? 3;
        final remaining = totalTrials - usedTrials;
        
        final info = StringBuffer('📅 **Trial Booking Status**\n\n');
        info.write('Trials Used: $usedTrials / $totalTrials\n');
        info.write('Remaining: $remaining trial(s)\n\n');
        
        if (trialBookings.isNotEmpty) {
          info.write('**Your Trial Bookings:**\n\n');
          
          for (var i = 0; i < trialBookings.length; i++) {
            final booking = trialBookings[i];
            final gymName = booking['gymName'] ?? 'Unknown Gym';
            final date = booking['preferredDate'] ?? 'N/A';
            final time = booking['preferredTime'] ?? 'N/A';
            final status = booking['status'] ?? 'pending';
            
            final statusEmoji = status == 'confirmed' ? '✅' :
                               status == 'pending' ? '⏳' :
                               status == 'completed' ? '✔️' :
                               status == 'cancelled' ? '❌' : '❓';
            
            info.write('''$statusEmoji ${i + 1}. **$gymName**
   Date: $date
   Time: $time
   Status: ${status.toUpperCase()}
   
''');
          }
        }
        
        if (remaining > 0) {
          info.write('\nYou can still book $remaining more trial session(s)!\n\nWant to book a trial?');
        } else {
          info.write('\nYou\'ve used all your trial sessions.\n\nReady to purchase a membership?');
        }
        
        return {
          'type': 'data_response',
          'category': 'booking',
          'message': info.toString(),
          'requiresEscalation': false,
          'suggestedActions': remaining > 0 
              ? ['Book Trial', 'Browse Gyms', 'Talk to Agent']
              : ['View Memberships', 'Browse Gyms', 'Talk to Agent'],
        };
      }
    } catch (e) {
      print('Error handling booking query: $e');
      return {
        'type': 'error_response',
        'category': 'booking',
        'message': '''Sorry, I encountered an error fetching your booking information.

Please try again or let me connect you with a support agent who can help.''',
        'requiresEscalation': false,
        'suggestedActions': ['Try Again', 'Talk to Agent'],
      };
    }
    
    return null;
  }

  /// Get suggested quick replies
  static List<String> getQuickReplies(String context) {
    switch (context) {
      case 'awaiting_escalation':
        return ['Yes, connect me', 'No, I\'m good', 'Try something else'];
      case 'unknown_query':
        return ['Talk to Agent', 'View FAQs', 'Start Over'];
      case 'greeting':
        return ['My Membership Status', 'Payment History', 'Book Trial', 'Technical Support'];
      default:
        return ['Yes', 'No', 'Need more help'];
    }
  }

  /// Check if message indicates user wants to talk to human
  static bool wantsHumanAgent(String message) {
    final indicators = [
      'agent', 'human', 'person', 'representative', 'support team',
      'talk to someone', 'speak to', 'connect me', 'escalate'
    ];
    final lowerMessage = message.toLowerCase();
    return indicators.any((indicator) => lowerMessage.contains(indicator));
  }

  /// Get category from user message
  static String? detectCategory(String message) {
    final lowerMessage = message.toLowerCase();
    
    // Check for membership-related queries (including quick reply buttons)
    if (lowerMessage.contains('membership') || 
        lowerMessage.contains('cancel') || 
        lowerMessage.contains('freeze') ||
        lowerMessage.contains('renew') ||
        lowerMessage.contains('extend') ||
        lowerMessage.contains('status') ||  // "My Membership Status"
        lowerMessage.contains('view membership')) {
      return 'membership';
    }
    
    // Check for payment-related queries (including quick reply buttons)
    if (lowerMessage.contains('payment') || 
        lowerMessage.contains('refund') || 
        lowerMessage.contains('transaction') ||
        lowerMessage.contains('billing') ||
        lowerMessage.contains('money') ||
        lowerMessage.contains('history')) {  // "Payment History"
      return 'payment';
    }
    
    // Check for booking-related queries
    if (lowerMessage.contains('trial') || 
        lowerMessage.contains('booking') || 
        lowerMessage.contains('book') ||
        lowerMessage.contains('reschedule')) {
      return 'booking';
    }
    
    // Check for gym browsing/general queries
    if (lowerMessage.contains('browse') ||
        lowerMessage.contains('find gym') ||
        lowerMessage.contains('search gym') ||
        lowerMessage.contains('gyms near')) {
      return 'general';
    }
    
    // Check for technical support
    if (lowerMessage.contains('app') || 
        lowerMessage.contains('crash') || 
        lowerMessage.contains('login') ||
        lowerMessage.contains('technical') ||
        lowerMessage.contains('bug') ||
        lowerMessage.contains('error') ||
        lowerMessage.contains('not working')) {
      return 'technical';
    }
    
    return null;
  }

  /// Check if chatbot should escalate based on conversation
  static bool shouldAutoEscalate(String message, List<String> messageHistory) {
    // Escalate if user is frustrated
    final frustrationIndicators = [
      'this is not working',
      'this doesn\'t help',
      'useless',
      'not helpful',
      'still have problem',
      'doesn\'t work',
      'not solved',
    ];
    
    final lowerMessage = message.toLowerCase();
    if (frustrationIndicators.any((ind) => lowerMessage.contains(ind))) {
      return true;
    }
    
    // Escalate if too many messages without resolution
    if (messageHistory.length > 6) {
      return true;
    }
    
    return false;
  }
}
