# Quick Integration Reference - Developer Guide

## Adding Attendance to Navigation

### 1. Add Route to MaterialApp

In `lib/main.dart` or your routes file, add:

```dart
routes: {
  '/attendance': (context) => const AttendanceScreen(),
  // ... other routes
},
```

### 2. Add to Bottom Navigation or Drawer

#### Option A: Bottom Navigation Bar
```dart
BottomNavigationBarItem(
  icon: Icon(FontAwesomeIcons.clipboardCheck),
  label: 'Attendance',
),
```

#### Option B: Drawer Menu
```dart
ListTile(
  leading: Icon(FontAwesomeIcons.clipboardCheck),
  title: Text('My Attendance'),
  onTap: () {
    Navigator.pushNamed(context, '/attendance');
  },
),
```

## Using Geofence Status Widgets

### 1. Dashboard Card (Full Widget)

Add to home screen or dashboard:

```dart
import '../widgets/geofence_status_widget.dart';

// In your build method:
GeofenceStatusWidget(
  onTap: () {
    Navigator.pushNamed(context, '/attendance');
  },
),
```

### 2. Compact List Tile

For lists or settings screens:

```dart
GeofenceStatusTile(
  onTap: () {
    // Optional custom action
    Navigator.pushNamed(context, '/attendance');
  },
),
```

### 3. Quick Action Button

For grid layouts or quick access sections:

```dart
AttendanceQuickAction(),
```

## Example: Adding to Home Screen

```dart
// lib/screens/home_screen.dart

import 'package:flutter/material.dart';
import '../widgets/geofence_status_widget.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Gym Wale')),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            // Welcome Section
            Text('Welcome Back!', style: TextStyle(fontSize: 24)),
            SizedBox(height: 16),
            
            // Geofence Status Card
            GeofenceStatusWidget(),
            SizedBox(height: 16),
            
            // Quick Actions Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                AttendanceQuickAction(),
                // Other quick actions...
              ],
            ),
            
            // Other content...
          ],
        ),
      ),
    );
  }
}
```

## Setup Geofencing for a User

### Automatic Setup (Recommended)

The system automatically restores geofencing on app start if previously configured.

### Manual Setup

```dart
// In any screen or button handler:
final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
final authProvider = Provider.of<AuthProvider>(context, listen: false);

final gymId = authProvider.currentUser?.currentGymId;
if (gymId != null) {
  // Note: You need to fetch actual gym coordinates
  // This is a placeholder - fetch from gym details API
  await attendanceProvider.setupGeofencing(
    gymId: gymId,
    latitude: gymLatitude,  // Get from gym data
    longitude: gymLongitude, // Get from gym data
    radius: gymRadius,      // Get from gym geofence config
  );
}
```

## Checking Attendance Status

### In Any Widget

```dart
Consumer<AttendanceProvider>(
  builder: (context, attendanceProvider, child) {
    return Text(
      attendanceProvider.isAttendanceMarkedToday
        ? 'Present Today'
        : 'Not Marked',
    );
  },
)
```

### One-time Check

```dart
final attendanceProvider = Provider.of<AttendanceProvider>(context);
if (attendanceProvider.isAttendanceMarkedToday) {
  // User has checked in today
  print('Check-in time: ${attendanceProvider.getFormattedCheckInTime()}');
}
```

## Listening to Geofence Events

The system automatically handles geofence events through the AttendanceProvider. 
To add custom handling:

```dart
// In initState or a listener:
final geofencingService = Provider.of<GeofencingService>(context, listen: false);

geofencingService.geofenceStream.listen((status) {
  if (status == GeofenceStatus.ENTER) {
    // User entered gym
    print('User entered gym!');
    // Show notification, etc.
  } else if (status == GeofenceStatus.EXIT) {
    // User left gym
    print('User left gym!');
    // Show summary, etc.
  }
});
```

## Checking Permission Status

```dart
import '../services/location_permission_service.dart';

// Check permissions
final permissionStatus = await LocationPermissionService.checkGeofencingPermissions();

if (!permissionStatus.canUseGeofencing) {
  // Request permissions
  final newStatus = await LocationPermissionService.requestGeofencingPermissions();
  
  if (newStatus.canUseGeofencing) {
    print('Permissions granted!');
  } else {
    // Show error or guide user to settings
    await LocationPermissionService.openAppSettings();
  }
}
```

## Common Use Cases

### 1. Show attendance on user profile
```dart
Card(
  child: ListTile(
    leading: Icon(FontAwesomeIcons.calendarCheck),
    title: Text('This Month'),
    subtitle: Consumer<AttendanceProvider>(
      builder: (context, provider, _) {
        final stats = provider.attendanceStats;
        return Text('${stats?['presentDays'] ?? 0} days present');
      },
    ),
  ),
)
```

### 2. Attendance badge/indicator
```dart
Badge(
  label: Text('✓'),
  isLabelVisible: Provider.of<AttendanceProvider>(context).isAttendanceMarkedToday,
  child: Icon(Icons.person),
)
```

### 3. Geofence toggle in settings
```dart
Consumer<GeofencingService>(
  builder: (context, service, _) {
    return SwitchListTile(
      title: Text('Automatic Attendance'),
      subtitle: Text('Track attendance using location'),
      value: service.isServiceRunning,
      onChanged: (enabled) async {
        if (enabled) {
          // Setup geofencing
          await _setupGeofence();
        } else {
          // Disable geofencing
          await Provider.of<AttendanceProvider>(context, listen: false)
              .removeGeofencing();
        }
      },
    );
  },
)
```

## Testing Checklist

- [ ] Permissions granted (especially background location)
- [ ] Geofence configured in admin panel
- [ ] User enrolled in a gym
- [ ] GPS enabled and has signal
- [ ] Battery optimization disabled for app
- [ ] Test on real device (not emulator)
- [ ] Walk in and out of geofence area
- [ ] Verify attendance records in backend

## Debugging

Enable debug logs by checking console output with filter:
- `[GEOFENCE]` - Geofencing service logs
- `[ATTENDANCE]` - Attendance provider logs
- `[LOCATION]` - Location permission logs

```dart
// In GeofencingService, logs are automatically printed to console
debugPrint('[GEOFENCE] Status changed: ${geofenceStatus.toString()}');
```

## Important Notes

1. **Always use real devices** for geofence testing
2. **Background permission is critical** for automatic tracking
3. **Geofence triggers may have 1-2 minute delay** (normal behavior)
4. **Battery saver mode** can affect geofence accuracy
5. **Poor GPS signal** will prevent accurate geofence detection

## Support Files Created

All necessary files have been created:
- ✅ `lib/services/location_permission_service.dart`
- ✅ `lib/screens/attendance_screen.dart`
- ✅ `lib/widgets/geofence_status_widget.dart`
- ✅ `lib/main.dart` (updated with geofence initialization)
- ✅ Android permissions (already configured)
- ✅ iOS permissions (documented for when iOS is added)

## Ready to Use!

The geofence attendance system is fully integrated and ready to use. Just add the attendance route to your navigation and start testing!
