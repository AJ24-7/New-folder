# Firebase Push Notifications - Complete Setup Guide
## Gym Admin App

### 📋 Overview
Firebase Cloud Messaging (FCM) push notifications have been fully implemented in the gym_admin_app. This document covers the complete setup, configuration, and usage.

---

## ✅ What Has Been Implemented

### 1. **Firebase Messaging Service** 
- Created: `gym_admin_app/lib/services/firebase_messaging_service.dart`
- Features:
  - FCM token management
  - Foreground/background message handling
  - Local notification display
  - Multiple notification channels (Android)
  - Topic subscription support
  - Notification permission handling

### 2. **Storage Service Updates**
- Added FCM token storage methods to `storage_service.dart`:
  - `saveFCMToken(String token)`
  - `getFCMToken()`
  - `deleteFCMToken()`

### 3. **Notification Service Updates**
- Added FCM token registration with backend:
  - `registerFCMToken(String fcmToken)` - Registers token with server
  - `unregisterFCMToken()` - Removes token on logout

### 4. **Notification Provider Integration**
- Enhanced `notification_provider.dart` with:
  - `initializeFCM()` - Initialize FCM service
  - `unregisterFCM()` - Clean up on logout
  - Real-time message handling
  - Token refresh handling
  - Stream subscriptions for incoming messages

### 5. **Main App Initialization**
- Updated `main.dart`:
  - Firebase initialization
  - Background message handler registration
  - Proper error handling

### 6. **Dashboard Integration**
- FCM automatically initializes when user logs into dashboard
- Seamless notification receiving while app is active

### 7. **Android Configuration**
- **AndroidManifest.xml** updated with:
  - `POST_NOTIFICATIONS` permission
  - FCM metadata (default channel, icon, color)
  - Notification click intent filters
  - Show when locked & turn screen on

### 8. **iOS Configuration**
- **AppDelegate.swift** updated with:
  - Firebase initialization
  - Notification delegates
  - Foreground notification handling
  
- **Info.plist** updated with:
  - Background modes for remote notifications
  - Firebase auto-init enabled

- **GoogleService-Info.plist** created:
  - Template added (needs iOS app configuration)

---

## 🔧 Backend Requirements

Your backend needs to implement these endpoints:

### 1. Register FCM Token
```
POST /api/admin/fcm-token
Headers: Authorization: Bearer {token}
Body: {
  "fcmToken": "string",
  "platform": "admin_app"
}
```

### 2. Unregister FCM Token
```
DELETE /api/admin/fcm-token
Headers: Authorization: Bearer {token}
Body: {
  "fcmToken": "string"
}
```

### 3. Sending Push Notifications
Your backend should use Firebase Admin SDK to send notifications:

```javascript
const admin = require('firebase-admin');

// Send to specific admin
await admin.messaging().send({
  token: fcmToken,
  notification: {
    title: 'New Member Check-in',
    body: 'John Doe checked in at 10:30 AM'
  },
  data: {
    type: 'check-in',
    priority: 'normal',
    memberId: '123',
    timestamp: new Date().toISOString()
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'member_activity_channel'
    }
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1
      }
    }
  }
});
```

---

## 📱 Notification Channels (Android)

The app supports 4 notification channels:

1. **high_priority_channel** - For urgent notifications
2. **default_channel** - For general notifications
3. **member_activity_channel** - For member activities (check-ins, payments, renewals)
4. **system_alerts_channel** - For critical system alerts

Channel is automatically selected based on the `type` and `priority` fields in notification data.

---

## 🔔 Notification Data Format

When sending notifications from backend, include these fields in the `data` payload:

```json
{
  "type": "check-in | payment | renewal | alert | warning | system | general",
  "priority": "low | normal | high | urgent",
  "memberId": "optional_member_id",
  "timestamp": "ISO8601_timestamp",
  "action": "optional_action_to_take",
  "navigationRoute": "optional_route"
}
```

---

## 🚀 Testing Push Notifications

### Test from Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification details
4. Select target: Choose your device FCM token
5. Additional options:
   - Add data: `type: test, priority: high`
6. Send test message

### Test from Backend:
```javascript
// Example using Firebase Admin SDK
const message = {
  token: 'device_fcm_token',
  notification: {
    title: 'Test Notification',
    body: 'This is a test message'
  },
  data: {
    type: 'general',
    priority: 'normal',
    timestamp: new Date().toISOString()
  }
};

await admin.messaging().send(message);
```

### Get FCM Token:
The FCM token is automatically:
- Generated when user logs in
- Sent to backend via `/api/admin/fcm-token`
- Stored locally for reference
- Refreshed automatically if needed

To manually check the token, add debug logs in dashboard initialization.

---

## 🔐 Permissions

### Android (API 33+):
- Runtime permission for `POST_NOTIFICATIONS`
- Automatically requested on first app launch
- User can enable/disable in system settings

### iOS:
- Permission requested on first notification
- User can enable/disable in system settings
- Check status: `NotificationProvider.areNotificationsEnabled()`
- Request again: `NotificationProvider.requestNotificationPermissions()`

---

## 📊 Notification States

### Foreground (App Open):
- Message received via `FirebaseMessaging.onMessage`
- Local notification displayed automatically
- UI updated in real-time
- Badge count updated

### Background (App Minimized):
- Handled by Firebase automatically
- Notification shown in system tray
- Tap opens app and triggers navigation

### Terminated (App Closed):
- Handled by OS
- Notification shown in system tray
- Tap launches app with notification data

---

## 🎯 Usage in App

### Initialize FCM (Already Done):
```dart
// In dashboard_screen.dart initState
final notificationProvider = Provider.of<NotificationProvider>(context, listen: false);
await notificationProvider.initializeFCM();
```

### Listen to Notifications:
```dart
// In any screen
final notificationProvider = Provider.of<NotificationProvider>(context);

// Access notifications
List<GymNotification> notifications = notificationProvider.notifications;
int unreadCount = notificationProvider.unreadCount;

// Refresh manually
await notificationProvider.refresh();
```

### Handle Notification Tap:
Add navigation logic in `firebase_messaging_service.dart → _handleNotificationTap()`:
```dart
void _handleNotificationTap(Map<String, dynamic> data) {
  final type = data['type'];
  
  switch (type) {
    case 'check-in':
      // Navigate to attendance screen
      break;
    case 'payment':
      // Navigate to payments screen
      break;
    // Add more cases
  }
}
```

---

## ⚠️ Important iOS Setup Step

**You MUST add your iOS app to Firebase:**

1. Go to Firebase Console → Project Settings
2. Under "Your apps", click "Add app" → iOS
3. Enter iOS bundle ID: `com.gymwale.gym_admin_app`
4. Download the new `GoogleService-Info.plist`
5. Replace the template file at:
   ```
   gym_admin_app/ios/Runner/GoogleService-Info.plist
   ```
6. The key field to update:
   ```xml
   <key>GOOGLE_APP_ID</key>
   <string>1:12577918948:ios:YOUR_ACTUAL_IOS_APP_ID</string>
   ```

---

## 🐛 Troubleshooting

### No Notifications Received:
1. Check FCM token is registered: Look for logs `FCM token registered successfully`
2. Verify backend is sending to correct token
3. Check notification permissions are enabled
4. Verify Firebase project configuration

### Android Build Issues:
- Ensure google-services.json is present
- Check build.gradle has google-services plugin
- Clean and rebuild: `flutter clean && flutter build apk`

### iOS Build Issues:
- Ensure GoogleService-Info.plist has correct GOOGLE_APP_ID
- Check podfile iOS deployment target >= 12.0
- Run: `cd ios && pod install && cd..`
- Clean and rebuild: `flutter clean && flutter build ios`

### FCM Token Not Generated:
- Check Firebase is initialized in main.dart
- Verify google-services.json (Android) / GoogleService-Info.plist (iOS)
- Check internet connectivity
- Review logs for Firebase initialization errors

---

## 📝 Notification Types

The system supports these notification types:

| Type | Description | Channel |
|------|-------------|---------|
| `check-in` | Member check-in | member_activity_channel |
| `payment` | Payment received | member_activity_channel |
| `renewal` | Membership renewal | member_activity_channel |
| `member-activity` | Other member activities | member_activity_channel |
| `alert` | System alerts | system_alerts_channel |
| `warning` | Warning messages | system_alerts_channel |
| `system` | System messages | system_alerts_channel |
| `general` | General notifications | default_channel |
| `bug-report` | Bug reports | system_alerts_channel |

---

## 🔄 Unregistering on Logout

FCM token should be unregistered when admin logs out. To implement:

1. **Option A**: Call in logout handler
```dart
// In auth_provider.dart or logout button handler
final notificationProvider = Provider.of<NotificationProvider>(context, listen: false);
await notificationProvider.unregisterFCM();
```

2. **Option B**: Add lifecycle listener in main.dart
```dart
// Listen to auth state changes and unregister on logout
```

---

## ✨ Features Summary

### ✅ Implemented:
- [x] Firebase initialization
- [x] FCM token generation & management
- [x] Foreground message handling
- [x] Background message handling
- [x] Local notification display
- [x] Multiple notification channels
- [x] Notification permissions
- [x] Token refresh handling
- [x] Backend registration
- [x] Android configuration
- [x] iOS configuration (needs GOOGLE_APP_ID)
- [x] Dashboard integration

### 🎯 Ready for:
- Push notifications from backend
- Real-time member activity alerts
- Payment notifications
- System alerts
- Scheduled notifications
- Topic-based messaging

---

## 📚 Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Flutter Firebase Messaging Plugin](https://pub.dev/packages/firebase_messaging)
- [Flutter Local Notifications](https://pub.dev/packages/flutter_local_notifications)
- [FCM HTTP v1 API Reference](https://firebase.google.com/docs/cloud-messaging/http-server-ref)

---

## 🎉 You're All Set!

Firebase Push Notifications are now fully functional in the gym_admin_app. Once you:
1. Update iOS `GoogleService-Info.plist` with correct GOOGLE_APP_ID
2. Implement backend FCM token endpoints
3. Start sending notifications from backend

The app will receive and display push notifications in all states (foreground, background, terminated).

**Happy Coding! 🚀**
