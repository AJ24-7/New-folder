# Push Notification Setup Guide for Gym Wale App

## Overview
This guide will help you set up push notifications with custom sounds and proper visibility on mobile devices.

## Issues Fixed

### 1. ✅ Notification Read Status Persistence
**Problem**: Notifications marked as read would appear as unread after closing/refreshing the app.

**Solution**: 
- Added local persistence using `shared_preferences`
- Backend model updated to use `isRead` field consistently
- Notifications are marked as read locally first, then synced with server
- Read status is cached and reapplied when loading notifications

### 2. ⚙️ Custom Notification Sounds (Requires Firebase Setup)
**Problem**: No custom notification sounds for different notification types.

**Solution**: 
- Created Firebase notification service with custom Android notification channels
- Each notification type has its own channel with custom sound
- Proper notification priority and visibility settings

### 3. ⚙️ Floating Notifications (Requires Firebase Setup)
**Problem**: Notifications not showing as floating/heads-up notifications on mobile.

**Solution**:
- High-importance notification channels for urgent notifications
- Proper Android notification settings with vibration and LED
- iOS notification configuration with alert, badge, and sound

## Quick Start

### Step 1: Update Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  # Existing dependencies...
  
  # Firebase for Push Notifications (OPTIONAL - add these to enable push notifications)
  firebase_core: ^3.8.1
  firebase_messaging: ^15.1.5
  flutter_local_notifications: ^18.0.1
```

**Note**: The app will work without Firebase. Firebase is only needed for:
- Push notifications when app is closed/background
- Custom notification sounds
- Notification channels and priority

### Step 2: Firebase Project Setup (Optional)

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Create/Select Project**: 
   - Click "Add project" or select existing
   - Follow the setup wizard

3. **Add Android App**:
   - Click "Add app" → Android icon
   - Package name: `com.yourcompany.gym_wale_app` (from android/app/build.gradle.kts)
   - Download `google-services.json`
   - Place in `android/app/` directory

4. **Add iOS App** (if needed):
   - Click "Add app" → iOS icon
   - Bundle ID: from ios/Runner.xcodeproj
   - Download `GoogleService-Info.plist`
   - Place in `ios/Runner/` directory

### Step 3: Android Configuration

#### 3.1 Update `android/build.gradle.kts`:

```kotlin
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.1.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0")
        // Add this line:
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

#### 3.2 Update `android/app/build.gradle.kts`:

Add at the top:
```kotlin
plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
    // Add this line:
    id("com.google.gms.google-services")
}
```

#### 3.3 Update `android/app/src/main/AndroidManifest.xml`:

Inside the `<application>` tag, add:

```xml
<!-- Firebase Cloud Messaging -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="gym_wale_notifications" />

<!-- Notification Icon (default launcher icon) -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@mipmap/ic_launcher" />

<!-- Notification Color -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@android:color/holo_blue_dark" />
```

### Step 4: Add Custom Notification Sounds (Optional)

#### For Android:

1. **Create directory**: `android/app/src/main/res/raw/`

2. **Add sound files** (must be .mp3 or .wav, lowercase, no spaces):
   ```
   android/app/src/main/res/raw/
   ├── notification_high.mp3      (urgent notifications)
   ├── notification_offer.mp3     (special offers)
   ├── notification_alert.mp3     (membership alerts)
   └── notification_success.mp3   (trial bookings)
   ```

3. **Find free sounds**:
   - https://notificationsounds.com/
   - https://freesound.org/
   - Keep files under 5 seconds and small size

#### For iOS:

1. **Add sound files** to `ios/Runner/Resources/`
2. **Open in Xcode**: `open ios/Runner.xcworkspace`
3. **Drag files** into project navigator
4. **Check**: "Copy items if needed" and add to Runner target
5. **Supported formats**: .aiff, .wav, or .caf

### Step 5: Initialize Firebase in Your App

Update your `lib/main.dart`:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'services/firebase_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase (only if you added firebase packages)
  try {
    await Firebase.initializeApp();
    await FirebaseNotificationService.instance.initialize();
  } catch (e) {
    print('Firebase not configured: $e');
    // App will work without Firebase
  }
  
  runApp(const MyApp());
}
```

### Step 6: Test Notifications

#### Test Local Notifications:
The app already supports local notification management. Just:
1. Run the app
2. Navigate to notifications screen
3. Mark notifications as read
4. Close and reopen app - they should stay marked as read ✅

#### Test Push Notifications (requires Firebase):
1. Get FCM token from app logs
2. Send test notification from Firebase Console:
   - Go to Firebase Console → Cloud Messaging
   - Click "Send your first message"
   - Enter title and message
   - Select your app
   - Send test message

## Backend Integration

### Send FCM Token to Backend

Add this to your login/auth flow:

```dart
// After successful login
final token = FirebaseNotificationService.instance.fcmToken;
if (token != null) {
  await ApiService.updateFcmToken(token);
}
```

### Backend Endpoint Example

Add to your backend (`backend/routes/userRoutes.js`):

```javascript
// Update FCM token
router.post('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { fcmToken } = req.body;
    
    await User.findByIdAndUpdate(userId, { fcmToken });
    
    res.json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update FCM token' });
  }
});
```

### Send Notifications from Backend

Install Firebase Admin SDK:
```bash
npm install firebase-admin
```

Example service (`backend/services/notificationService.js`):

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin (add your service account key)
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

async function sendPushNotification(fcmToken, notification) {
  const message = {
    notification: {
      title: notification.title,
      body: notification.message,
    },
    data: {
      type: notification.type,
      notificationId: notification._id.toString(),
      ...notification.data,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: getChannelId(notification.type),
        sound: getNotificationSound(notification.type),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: getNotificationSound(notification.type),
          badge: 1,
        },
      },
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

function getChannelId(type) {
  switch (type) {
    case 'offer':
      return 'gym_wale_offers';
    case 'membership_expiry':
      return 'gym_wale_membership';
    case 'trial_booking':
      return 'gym_wale_trials';
    case 'ticket_update':
    case 'ticket_reply':
      return 'gym_wale_high_importance';
    default:
      return 'gym_wale_notifications';
  }
}

function getNotificationSound(type) {
  // Android uses sound name without extension
  // iOS needs full filename with extension
  switch (type) {
    case 'membership_expiry':
      return 'notification_alert';
    case 'offer':
      return 'notification_offer';
    case 'trial_booking':
      return 'notification_success';
    case 'ticket_update':
    case 'ticket_reply':
      return 'notification_high';
    default:
      return 'default';
  }
}

module.exports = { sendPushNotification };
```

## Notification Types and Channels

| Type | Channel | Sound | Priority | Use Case |
|------|---------|-------|----------|----------|
| `offer` | Offers & Promotions | notification_offer | Default | Special gym offers |
| `membership_expiry` | Membership Alerts | notification_alert | High | Expiring memberships |
| `trial_booking` | Trial Bookings | notification_success | Default | Trial confirmations |
| `ticket_update` | High Importance | notification_high | High | Support ticket updates |
| `general` | General | default | Default | Other notifications |

## Testing Checklist

- [ ] Notifications marked as read stay read after app restart
- [ ] Different notification types show different icons
- [ ] Push notifications appear when app is in background
- [ ] Push notifications appear when app is closed
- [ ] Tapping notification opens the app
- [ ] Custom sounds play (if configured)
- [ ] Notification badge count updates
- [ ] Heads-up notifications appear for high-priority items

## Troubleshooting

### Notifications not persisting as read:
- ✅ **Already Fixed**: Backend and frontend updated to use consistent field names
- Clear app data and test again

### Push notifications not received:
- Check Firebase configuration in Console
- Verify `google-services.json` is in `android/app/`
- Check app is connected to internet
- Check notification permissions are granted
- Check FCM token is being sent to backend

### Custom sounds not playing:
- Verify sound files are in `raw` folder (Android)
- File names must be lowercase, no spaces
- Restart app after adding sounds
- Check Android notification channels are created

### Build errors:
- Run `flutter clean`
- Run `flutter pub get`
- Rebuild: `flutter run`

## Without Firebase

The app works perfectly without Firebase! You get:
- ✅ Notification list with filtering
- ✅ Mark as read/unread
- ✅ Persistent read status
- ✅ Pull to refresh
- ✅ Delete notifications
- ✅ Unread count badge

You only need Firebase for:
- Push notifications when app is closed
- Custom notification sounds
- Advanced notification channels

## Additional Resources

- [Firebase Console](https://console.firebase.google.com)
- [FlutterFire Documentation](https://firebase.flutter.dev/)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Local Notifications Plugin](https://pub.dev/packages/flutter_local_notifications)

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all configuration files are in place
3. Try `flutter clean && flutter pub get`
4. Check Firebase Console for errors
5. Verify notification permissions are granted

---

**Note**: The notification persistence fix is already active! Notifications will now correctly stay marked as read. Firebase setup is optional for enhanced push notification features.
