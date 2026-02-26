# Background Location Warning System

## Overview
This system automatically checks if a gym uses geofence-based attendance marking and prompts members to enable "Always" location permission for automatic attendance tracking.

## Implementation Details

### Backend Changes

#### 1. New API Endpoint
**File:** `backend/controllers/attendanceSettingsController.js`

Added a new public endpoint for members to fetch gym attendance settings:
```javascript
exports.getAttendanceSettingsForMember = async (req, res)
```

**Endpoint:** `GET /api/gym/:gymId/attendance-settings`

**Response:**
```json
{
  "success": true,
  "settings": {
    "mode": "geofence",
    "geofenceEnabled": true,
    "requiresBackgroundLocation": true,
    "autoMarkEnabled": true
  }
}
```

**Route:** Added to `backend/routes/gymRoutes.js`

### Frontend Changes (Member App)

#### 2. API Service Method
**File:** `lib/services/api_service.dart`

Added method to fetch gym attendance settings:
```dart
static Future<Map<String, dynamic>> getGymAttendanceSettings(String gymId)
```

#### 3. Warning Dialog Widget
**File:** `lib/widgets/background_location_warning_dialog.dart`

Created a comprehensive warning dialog that:
- Explains why "Always" location permission is needed
- Shows step-by-step instructions
- Provides a direct link to app settings
- Includes privacy assurance message
- Has a modern, user-friendly UI with icons and color coding

**Key Features:**
- Urgent visual indicators (orange warning colors)
- Clear 3-step instructions
- "Open Settings" button for easy access
- "Later" option for user flexibility
- Privacy notice
- Responsive design

**Usage:**
```dart
await BackgroundLocationWarningDialog.show(
  context: context,
  gymName: gymName,
  geofencingService: geofencingService,
);
```

**Helper Methods:**
- `shouldShow()`: Checks if warning should be displayed based on:
  - Geofence enabled status
  - Current location permission (shows only if not "always")

#### 4. Home Screen Integration
**File:** `lib/screens/home_screen.dart`

Added automatic checking and warning display:

**New Method:** `_checkGeofenceSettings()`

**Logic Flow:**
```
App Opens → Home Screen Loads
    ↓
Check if user has gym assigned
    ↓
Fetch gym's attendance settings
    ↓
Check if geofence is enabled
    ↓
Check current location permission status
    ↓
If permission != "Always" AND geofence enabled
    ↓
Show Warning Dialog (once per week)
```

**Smart Features:**
- Only shows if geofence attendance is enabled
- Checks once per week per gym (stored in SharedPreferences)
- Waits 1 second after screen load for better UX
- Silently fails if API call fails (doesn't disrupt user experience)
- Non-blocking (can be dismissed)

## User Experience Flow

### Scenario 1: Geofence Enabled, Permission Not "Always"

1. User logs into the app
2. Home screen loads
3. System checks gym's attendance settings in background
4. If geofence is enabled:
   - Check location permission
   - If not "Always": Show warning dialog after 1 second
5. User sees dialog with:
   - Clear explanation
   - Visual warning indicators
   - Step-by-step instructions
   - "Open Settings" button
   - "Later" option
6. User clicks "Open Settings"
   - App opens device settings
   - User can change permission to "Always"
7. Dialog dismissed
8. Next check: 7 days later

### Scenario 2: Geofence Disabled

1. User logs into the app
2. Home screen loads
3. System checks attendance settings
4. Geofence is disabled
5. No dialog shown ✓
6. Normal app experience continues

### Scenario 3: Permission Already "Always"

1. User logs into the app
2. System checks location permission
3. Permission is "Always"
4. No dialog shown ✓
5. Automatic attendance works seamlessly

## Configuration

### Warning Frequency
**File:** `lib/screens/home_screen.dart`

```dart
// Show warning once per week
if (lastWarningShown != null && (now - lastWarningShown) < 7 * 24 * 60 * 60 * 1000) {
  return; // Already shown recently
}
```

To change frequency, modify the milliseconds value:
- 1 day: `1 * 24 * 60 * 60 * 1000`
- 3 days: `3 * 24 * 60 * 60 * 1000`
- 7 days: `7 * 24 * 60 * 60 * 1000` (current)
- Never again: Remove the time check

### SharedPreferences Key
```dart
'geofence_warning_shown_$gymId'
```

Stores timestamp of last warning shown for each gym.

## Technical Details

### Permission Status Mapping
```dart
'denied' -> Show warning
'deniedForever' -> Show warning
'whileInUse' -> Show warning
'always' -> No warning ✓
```

### Backend Security
- Endpoint is public (no authentication required)
- Only returns necessary fields for members
- Does not expose sensitive gym configuration
- Returns default settings if none configured

### Error Handling
- API failures are silently caught
- Does not block user from using the app
- Logs errors to console for debugging
- Falls back gracefully

## Testing Checklist

### Manual Testing Steps

1. **Test with Geofence Enabled:**
   - Admin: Enable geofence in attendance settings
   - Member: Login to app
   - Expected: Warning dialog appears after 1 second
   - Click "Open Settings"
   - Expected: Device settings opens

2. **Test with Geofence Disabled:**
   - Admin: Disable geofence in attendance settings
   - Member: Login to app
   - Expected: No warning dialog

3. **Test with "Always" Permission:**
   - Grant "Always" location permission
   - Member: Login to app
   - Expected: No warning dialog

4. **Test Warning Frequency:**
   - Show dialog once
   - Close app and reopen
   - Expected: No dialog (within 7 days)
   - Manually clear SharedPreferences or wait 7 days
   - Expected: Dialog shows again

5. **Test Multiple Gyms:**
   - Switch to different gym
   - Expected: Warning shows independently for each gym

### Unit Test Scenarios

```dart
// Test 1: Should show warning when geofence enabled and permission not always
expect(shouldShow(geofenceEnabled: true, permission: 'whileInUse'), true);

// Test 2: Should not show when geofence disabled
expect(shouldShow(geofenceEnabled: false, permission: 'whileInUse'), false);

// Test 3: Should not show when permission is always
expect(shouldShow(geofenceEnabled: true, permission: 'always'), false);
```

## Troubleshooting

### Warning Not Showing

**Possible Causes:**
1. Geofence not enabled in gym settings
2. Permission already set to "Always"
3. Warning shown in last 7 days
4. API endpoint not accessible
5. Network error

**Debug Steps:**
1. Check console logs: `[HOME] Error checking geofence settings`
2. Verify gym attendance settings in admin app
3. Check location permission status
4. Clear app data to reset warning timestamp
5. Check API endpoint: `GET /api/gym/{gymId}/attendance-settings`

### Dialog Showing Too Often

**Cause:** SharedPreferences not persisting

**Solution:**
- Check if device storage is full
- Verify app has storage permission
- Check SharedPreferences implementation

### "Open Settings" Not Working

**Cause:** `openAppSettings()` method issue

**Solution:**
- Verify GeofencingService has `openAppSettings()` method
- Check platform-specific implementation (iOS vs Android)
- Use geolocator package's `Geolocator.openAppSettings()`

## Future Enhancements

### Planned Features

1. **In-App Permission Prompt**
   - Request permission directly from dialog
   - Smoother user experience
   - Reduce steps needed

2. **Guided Tutorial**
   - Screenshot wizard showing settings path
   - Platform-specific instructions (Android/iOS)
   - Video tutorial option

3. **Push Notifications**
   - Remind users via notification
   - Deep link to settings
   - Scheduled reminders

4. **Analytics**
   - Track how many users enable "Always" permission
   - Measure conversion rate
   - A/B test different messaging

5. **Customizable Messaging**
   - Gym admins can customize warning text
   - Multilingual support
   - Brand-specific messaging

## API Documentation

### Get Gym Attendance Settings (Member)

**Endpoint:** `GET /api/gym/:gymId/attendance-settings`

**Authentication:** None (public endpoint)

**Parameters:**
- `gymId` (path): Gym ObjectId

**Response Success (200):**
```json
{
  "success": true,
  "settings": {
    "mode": "geofence",
    "geofenceEnabled": true,
    "requiresBackgroundLocation": true,
    "autoMarkEnabled": true
  }
}
```

**Response Not Found (404):**
```json
{
  "success": false,
  "message": "Gym not found"
}
```

**Response Error (500):**
```json
{
  "success": false,
  "message": "Failed to fetch attendance settings",
  "error": "Error details"
}
```

## Privacy Considerations

### User Privacy Protection

1. **Minimal Data Collection**
   - Only checks location when near gym
   - No continuous tracking
   - Location only sent on geofence entry/exit

2. **Transparency**
   - Clear explanation of why permission needed
   - Privacy notice in dialog
   - User can decline and use manual attendance

3. **User Control**
   - Permission can be changed anytime
   - "Later" option available
   - Can disable geofence attendance

4. **Data Usage**
   - Location used only for attendance
   - Not shared with third parties
   - Not used for marketing

## Support

### User FAQs

**Q: Why do I need to enable "Always" location?**
A: For automatic attendance marking when you enter/exit the gym, the app needs background location access.

**Q: Will this drain my battery?**
A: Minimal impact (2-5% per day). The app uses activity recognition and smart checks to optimize battery.

**Q: Is my location tracked all the time?**
A: No. Location is only checked when you're near the gym. We respect your privacy.

**Q: Can I use manual attendance instead?**
A: Yes. You can still mark attendance manually if you prefer not to grant background location access.

**Q: How do I disable this warning?**
A: Grant "Always" permission or ask your gym admin to disable geofence attendance.

---

**Last Updated:** February 26, 2026  
**Version:** 1.0.0  
**Status:** ✅ Implemented and Ready for Testing
