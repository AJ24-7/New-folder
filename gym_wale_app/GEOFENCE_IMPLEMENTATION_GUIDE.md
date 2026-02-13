# Geofence-Based Attendance System - Complete Implementation Guide

## 🎯 Overview

This system automatically marks gym attendance when users enter/exit the gym premises using geofencing technology. It includes comprehensive anti-fraud measures and works even when the app is in the background.

## 📋 Features Implemented

### Backend Features ✅
- ✅ Enhanced Attendance model with geofence fields
- ✅ Geofence entry/exit tracking
- ✅ Mock location detection and rejection
- ✅ Time window validation (gym operating hours)
- ✅ One attendance per day enforcement
- ✅ Minimum stay time validation (5 minutes)
- ✅ Active membership verification
- ✅ Distance calculation from gym center
- ✅ Automatic session deduction
- ✅ Entry/exit timestamps
- ✅ Duration tracking

### Flutter Features ✅
- ✅ Geofencing service with background tracking
- ✅ Location permission handling
- ✅ Attendance provider for state management
- ✅ API integration for attendance marking
- ✅ Geofence event listeners (ENTER/EXIT)
- ✅ Mock location rejection
- ✅ Persistence of geofence data
- ✅ Auto-restore on app restart

### Platform Configuration ✅
- ✅ Android permissions and services
- ✅ iOS configuration guide
- ✅ Background location permissions
- ✅ Foreground services setup

## 🔧 Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

The following models and controllers have been created:
- `models/Attendance.js` - Enhanced with geofence fields
- `models/gym.js` - Updated with geofenceRadius
- `controllers/geofenceAttendanceController.js` - Complete attendance logic
- `routes/geofenceAttendance.js` - API routes

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/auto-mark/entry` | Auto-mark attendance on gym entry |
| POST | `/api/attendance/auto-mark/exit` | Auto-mark exit on gym exit |
| GET | `/api/attendance/today/:gymId` | Get today's attendance status |
| GET | `/api/attendance/history/:gymId` | Get attendance history |
| GET | `/api/attendance/stats/:gymId` | Get attendance statistics |
| POST | `/api/attendance/verify` | Verify geofence location (testing) |

#### Request Body for Entry
```json
{
  "gymId": "gym_id_here",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10.5,
  "isMockLocation": false
}
```

### 2. Flutter Setup

#### Install Dependencies
```bash
flutter pub get
```

Added packages:
- `flutter_geofence: ^0.5.0`
- `geofence_service: ^5.2.2`
- `geolocator: ^11.0.0`
- `permission_handler: ^11.3.0`

#### Initialize Providers

Update `main.dart` to include the providers:

```dart
import 'package:provider/provider.dart';
import 'services/geofencing_service.dart';
import 'providers/attendance_provider.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final geofencingService = GeofencingService();
  final apiService = ApiService();
  
  // Restore geofence on app start
  await geofencingService.restoreGeofenceFromPreferences();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => geofencingService),
        ChangeNotifierProvider(
          create: (_) => AttendanceProvider(
            geofencingService: geofencingService,
            apiService: apiService,
          ),
        ),
        // ... other providers
      ],
      child: MyApp(),
    ),
  );
}
```

### 3. Gym Setup - Configure Geofence

When a gym is registered or updated, ensure the location coordinates and radius are set:

```dart
// Example: When creating/updating gym
final gymData = {
  'gymName': 'Fitness Pro Gym',
  'location': {
    'address': '123 Main Street',
    'city': 'New Delhi',
    'state': 'Delhi',
    'pincode': '110001',
    'lat': 28.6139,
    'lng': 77.2090,
    'geofenceRadius': 100, // 100 meters radius
  },
  // ... other gym data
};
```

### 4. Member Setup - Register Geofence

When a member joins a gym or logs in, register the geofence:

```dart
import 'package:provider/provider.dart';

// In your gym details or member dashboard screen
Future<void> setupGeofenceForGym(BuildContext context, Map<String, dynamic> gym) async {
  final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
  
  final success = await attendanceProvider.setupGeofencing(
    gymId: gym['_id'],
    latitude: gym['location']['lat'],
    longitude: gym['location']['lng'],
    radius: gym['location']['geofenceRadius'] ?? 100.0,
  );
  
  if (success) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Automatic attendance tracking enabled!')),
    );
  } else {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Failed to enable attendance tracking')),
    );
  }
}
```

## 📱 Usage Example Screen

Here's a complete example of an attendance tracking screen:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/attendance_provider.dart';
import '../services/geofencing_service.dart';

class AttendanceTrackingScreen extends StatefulWidget {
  final String gymId;
  final Map<String, dynamic> gymData;

  const AttendanceTrackingScreen({
    Key? key,
    required this.gymId,
    required this.gymData,
  }) : super(key: key);

  @override
  State<AttendanceTrackingScreen> createState() => _AttendanceTrackingScreenState();
}

class _AttendanceTrackingScreenState extends State<AttendanceTrackingScreen> {
  @override
  void initState() {
    super.initState();
    _initializeAttendance();
  }

  Future<void> _initializeAttendance() async {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    
    // Fetch today's attendance
    await attendanceProvider.fetchTodayAttendance(widget.gymId);
    
    // Setup geofencing if not already setup
    final geofencingService = Provider.of<GeofencingService>(context, listen: false);
    if (geofencingService.currentGymId != widget.gymId) {
      await attendanceProvider.setupGeofencing(
        gymId: widget.gymId,
        latitude: widget.gymData['location']['lat'],
        longitude: widget.gymData['location']['lng'],
        radius: widget.gymData['location']['geofenceRadius'] ?? 100.0,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Attendance Tracking'),
        actions: [
          IconButton(
            icon: Icon(Icons.history),
            onPressed: _showAttendanceHistory,
          ),
        ],
      ),
      body: Consumer<AttendanceProvider>(
        builder: (context, attendanceProvider, child) {
          if (attendanceProvider.isLoading) {
            return Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () => attendanceProvider.fetchTodayAttendance(widget.gymId),
            child: SingleChildScrollView(
              physics: AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusCard(attendanceProvider),
                  SizedBox(height: 20),
                  _buildTodayAttendance(attendanceProvider),
                  SizedBox(height: 20),
                  _buildGeofenceStatus(context),
                  SizedBox(height: 20),
                  _buildMonthlyStats(attendanceProvider),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusCard(AttendanceProvider provider) {
    return Card(
      color: provider.isAttendanceMarkedToday ? Colors.green[50] : Colors.orange[50],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              provider.isAttendanceMarkedToday ? Icons.check_circle : Icons.pending,
              size: 48,
              color: provider.isAttendanceMarkedToday ? Colors.green : Colors.orange,
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    provider.isAttendanceMarkedToday
                        ? 'Attendance Marked!'
                        : 'Not Marked Today',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    provider.isAttendanceMarkedToday
                        ? 'Your attendance was automatically recorded'
                        : 'Visit the gym to mark attendance',
                    style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayAttendance(AttendanceProvider provider) {
    if (!provider.isAttendanceMarkedToday) {
      return SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Today\'s Session',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            _buildInfoRow('Check-in', provider.getFormattedCheckInTime() ?? 'N/A'),
            if (provider.hasCheckedOut) ...[
              SizedBox(height: 8),
              _buildInfoRow('Check-out', provider.getFormattedCheckOutTime() ?? 'N/A'),
              SizedBox(height: 8),
              _buildInfoRow('Duration', provider.getDurationInGym() ?? 'N/A'),
            ] else ...[
              SizedBox(height: 8),
              _buildInfoRow('Status', 'In Progress 🏋️'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey[600])),
        Text(value, style: TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildGeofenceStatus(BuildContext context) {
    return Consumer<GeofencingService>(
      builder: (context, geofencingService, child) {
        return Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Auto-Tracking',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Icon(
                      geofencingService.isServiceRunning
                          ? Icons.location_on
                          : Icons.location_off,
                      color: geofencingService.isServiceRunning
                          ? Colors.green
                          : Colors.red,
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Text(
                  geofencingService.isServiceRunning
                      ? 'Automatic attendance tracking is active. Your attendance will be marked when you enter the gym.'
                      : 'Automatic tracking is disabled. Enable it to mark attendance automatically.',
                  style: TextStyle(color: Colors.grey[600]),
                ),
                if (!geofencingService.isServiceRunning) ...[
                  SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => _initializeAttendance(),
                    child: Text('Enable Auto-Tracking'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMonthlyStats(AttendanceProvider provider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'This Month',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                TextButton(
                  onPressed: () => _fetchMonthlyStats(provider),
                  child: Text('Refresh'),
                ),
              ],
            ),
            SizedBox(height: 12),
            if (provider.attendanceStats != null) ...[
              _buildStatRow(
                'Present Days',
                '${provider.attendanceStats!['presentDays'] ?? 0}/${provider.attendanceStats!['totalDays'] ?? 0}',
              ),
              SizedBox(height: 8),
              _buildStatRow(
                'Attendance Rate',
                '${provider.attendanceStats!['attendanceRate'] ?? 0}%',
              ),
              SizedBox(height: 8),
              _buildStatRow(
                'Avg. Duration',
                '${provider.attendanceStats!['averageDurationMinutes'] ?? 0} mins',
              ),
            ] else ...[
              Center(
                child: TextButton(
                  onPressed: () => _fetchMonthlyStats(provider),
                  child: Text('Load Statistics'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey[600])),
        Text(
          value,
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ],
    );
  }

  Future<void> _fetchMonthlyStats(AttendanceProvider provider) async {
    final now = DateTime.now();
    await provider.fetchAttendanceStats(
      widget.gymId,
      month: now.month,
      year: now.year,
    );
  }

  Future<void> _showAttendanceHistory() async {
    final provider = Provider.of<AttendanceProvider>(context, listen: false);
    await provider.fetchAttendanceHistory(widget.gymId, limit: 30);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        builder: (context, scrollController) {
          return Container(
            padding: EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  'Attendance History',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 16),
                Expanded(
                  child: ListView.builder(
                    controller: scrollController,
                    itemCount: provider.attendanceHistory.length,
                    itemBuilder: (context, index) {
                      final record = provider.attendanceHistory[index];
                      return _buildHistoryItem(record);
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHistoryItem(Map<String, dynamic> record) {
    final date = DateTime.parse(record['date']);
    final checkIn = record['checkInTime'] ?? 'N/A';
    final checkOut = record['checkOutTime'] ?? 'N/A';
    
    return Card(
      margin: EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          record['status'] == 'present' ? Icons.check_circle : Icons.cancel,
          color: record['status'] == 'present' ? Colors.green : Colors.red,
        ),
        title: Text('${date.day}/${date.month}/${date.year}'),
        subtitle: Text('In: $checkIn | Out: $checkOut'),
        trailing: record['isGeofenceAttendance'] == true
            ? Chip(
                label: Text('Auto', style: TextStyle(fontSize: 10)),
                backgroundColor: Colors.blue[100],
              )
            : null,
      ),
    );
  }
}
```

## 🔐 Anti-Fraud Measures Implemented

1. **Mock Location Detection** ✅
   - Rejects fake GPS locations
   - Validates location source

2. **Minimum Stay Time** ✅
   - 5-minute minimum inside gym
   - Prevents quick in/out fraud

3. **Time Window Validation** ✅
   - Only during gym operating hours
   - Configurable per gym

4. **One Attendance Per Day** ✅
   - Unique constraint in database
   - Server-side validation

5. **Distance Verification** ✅
   - Calculates distance from gym center
   - Validates within geofence radius

6. **Active Membership Check** ✅
   - Verifies active subscription
   - Checks expiry date

7. **Location Accuracy** ✅
   - Tracks GPS accuracy
   - Stores for audit trail

## 📊 Database Schema

### Attendance Model Fields

```javascript
{
  gymId: ObjectId,
  personId: ObjectId,
  personType: 'Member',
  date: Date,
  status: 'present|absent|pending',
  checkInTime: String,
  checkOutTime: String,
  
  // Geofence Entry
  geofenceEntry: {
    timestamp: Date,
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    isMockLocation: Boolean,
    distanceFromGym: Number
  },
  
  // Geofence Exit
  geofenceExit: {
    timestamp: Date,
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    durationInside: Number // minutes
  },
  
  isGeofenceAttendance: Boolean,
  authenticationMethod: 'geofence'
}
```

## 🧪 Testing Guide

### 1. Test Geofence Entry
```bash
# Use real device or emulator with location enabled
# Move to gym location
# Observe logs: [GEOFENCE] ENTER event
# Check API call: POST /api/attendance/auto-mark/entry
```

### 2. Test Mock Location Rejection
```bash
# Enable mock locations in developer settings
# Try to mark attendance
# Should receive: "Mock locations are not allowed"
```

### 3. Test Minimum Stay Time
```bash
# Enter geofence
# Exit immediately (< 5 minutes)
# Should receive: "Minimum stay time is 5 minutes"
```

### 4. Test Background Tracking
```bash
# Lock device
# Move to gym location
# Unlock and check - attendance should be marked
```

## 🚀 Deployment Checklist

- [ ] Backend routes registered in server.js
- [ ] Database indexes created for Attendance model
- [ ] Flutter dependencies installed (`flutter pub get`)
- [ ] Android permissions configured
- [ ] iOS permissions configured (if using iOS)
- [ ] Test on real devices
- [ ] Monitor battery usage
- [ ] Test background location tracking
- [ ] Verify mock location rejection
- [ ] Test with various geofence radii
- [ ] Document gym setup process for admins

## 📝 Next Steps & Enhancements

1. **Admin Dashboard** 📊
   - Real-time attendance monitoring
   - Geofence visualization on map
   - Analytics and reports

2. **Notifications** 🔔
   - Entry/exit confirmations
   - Daily attendance reminders
   - Weekly summary reports

3. **Advanced Features** ⭐
   - Crowd estimation
   - Heatmap visualization
   - Late entry warnings
   - Manual fallback (QR/PIN)
   - Multiple gym support

4. **Optimization** ⚡
   - Battery usage optimization
   - Network request batching
   - Offline queue for attendance

## 🐛 Troubleshooting

### Geofence Not Triggering
- Ensure location permissions are "Always"
- Check geofence radius (minimum 100m recommended)
- Verify gym coordinates are correct
- Test on real device (not emulator)

### High Battery Drain
- Reduce monitoring frequency
- Use activity recognition
- Optimize geofence radius

### Permission Issues
- Check AndroidManifest.xml permissions
- For iOS, verify Info.plist entries
- Guide users to enable "Always" permission

## 📚 Resources

- [Geofence Service Documentation](https://pub.dev/packages/geofence_service)
- [Geolocator Package](https://pub.dev/packages/geolocator)
- [Android Geofencing API](https://developer.android.com/training/location/geofencing)
- [iOS Core Location](https://developer.apple.com/documentation/corelocation)

---

**Implementation Status**: ✅ Complete

All core features have been implemented. Test thoroughly before deploying to production!
