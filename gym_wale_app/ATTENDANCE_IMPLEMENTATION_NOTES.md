# Attendance Screen Integration - Implementation Notes

## Fixed Issues
✅ Fixed `currentUser` -> `user` (AuthProvider property name)
✅ Added comprehensive TODOs for gym ID retrieval

## Required Implementation Steps

### 1. Add Current Gym ID to User Model

**Option A: Add to User Model (Recommended)**

Edit `lib/models/user.dart`:

```dart
class User {
  final String id;
  final String email;
  final String name;
  final String? phone;
  final String? profileImage;
  final String? address;
  final String? currentGymId; // Add this field
  final DateTime createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone,
    this.profileImage,
    this.address,
    this.currentGymId, // Add this
    required this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic>? json) {
    // ... existing code ...
    return User(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      name: buildName(),
      phone: json['phone']?.toString(),
      profileImage: json['profileImage']?.toString(),
      address: json['address']?.toString(),
      currentGymId: json['currentGymId']?.toString(), // Add this
      createdAt: safeParseDatetime(json['createdAt']),
      updatedAt: json['updatedAt'] != null ? safeParseDatetime(json['updatedAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'phone': phone,
      'profileImage': profileImage,
      'address': address,
      'currentGymId': currentGymId, // Add this
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}
```

**Option B: Use SharedPreferences**

Create a service to store/retrieve current gym ID:

```dart
// lib/services/user_preferences_service.dart
import 'package:shared_preferences/shared_preferences.dart';

class UserPreferencesService {
  static const String _currentGymIdKey = 'current_gym_id';
  
  static Future<void> setCurrentGymId(String gymId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_currentGymIdKey, gymId);
  }
  
  static Future<String?> getCurrentGymId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_currentGymIdKey);
  }
  
  static Future<void> clearCurrentGymId() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_currentGymIdKey);
  }
}
```

### 2. Update Attendance Screen

After implementing Option A or B above, update the attendance screen:

**If using Option A (User Model):**

```dart
// In _loadAttendanceData method:
Future<void> _loadAttendanceData() async {
  final authProvider = Provider.of<AuthProvider>(context, listen: false);
  final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
  
  final currentUser = authProvider.user;
  final currentGymId = currentUser?.currentGymId;
  
  if (currentGymId != null) {
    await attendanceProvider.fetchTodayAttendance(currentGymId);
  }
}

// In _setupGeofence method:
Future<void> _setupGeofence() async {
  final authProvider = Provider.of<AuthProvider>(context, listen: false);
  final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
  
  final currentUser = authProvider.user;
  final gymId = currentUser?.currentGymId;
  
  if (currentUser == null) {
    _showSnackBar('Please login to enable attendance tracking', isError: true);
    return;
  }
  
  if (gymId == null) {
    _showSnackBar('Please join a gym first to enable attendance tracking', isError: true);
    return;
  }

  setState(() {
    _isSettingUpGeofence = true;
  });

  try {
    // Fetch gym details to get coordinates
    final gymDetails = await ApiService.getGymDetails(gymId);
    
    if (gymDetails == null) {
      _showSnackBar('Failed to fetch gym details', isError: true);
      return;
    }
    
    // Assuming gym details has latitude, longitude, and geofenceRadius
    final latitude = gymDetails['latitude'] ?? 28.6139;
    final longitude = gymDetails['longitude'] ?? 77.2090;
    final radius = gymDetails['geofenceRadius']?.toDouble() ?? 100.0;
    
    final success = await attendanceProvider.setupGeofencing(
      gymId: gymId,
      latitude: latitude,
      longitude: longitude,
      radius: radius,
    );

    if (success) {
      _showSnackBar('Automatic attendance tracking enabled!');
    } else {
      _showSnackBar('Failed to setup attendance tracking', isError: true);
    }
  } catch (e) {
    _showSnackBar('Error: $e', isError: true);
  } finally {
    setState(() {
      _isSettingUpGeofence = false;
    });
  }
}
```

**If using Option B (SharedPreferences):**

```dart
import '../services/user_preferences_service.dart';

// In _loadAttendanceData method:
Future<void> _loadAttendanceData() async {
  final authProvider = Provider.of<AuthProvider>(context, listen: false);
  final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
  
  final currentGymId = await UserPreferencesService.getCurrentGymId();
  
  if (currentGymId != null) {
    await attendanceProvider.fetchTodayAttendance(currentGymId);
  }
}

// Similar changes for _setupGeofence
```

### 3. Set Current Gym ID When User Joins

When a user joins or selects a gym, save the gym ID:

**Option A:**
```dart
// Update the user in AuthProvider with currentGymId
authProvider.updateUser(user.copyWith(currentGymId: selectedGymId));
```

**Option B:**
```dart
// Save to SharedPreferences
await UserPreferencesService.setCurrentGymId(selectedGymId);
```

### 4. Add API Endpoint to Get Gym Details

If not already available, add to `lib/services/api_service.dart`:

```dart
static Future<Map<String, dynamic>?> getGymDetails(String gymId) async {
  try {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/gyms/$gymId'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['success'] ? data['gym'] : null;
    }
    return null;
  } catch (e) {
    debugPrint('Error fetching gem details: $e');
    return null;
  }
}
```

### 5. Update Backend (if needed)

Ensure the User model in your backend includes `currentGymId`:

```javascript
// backend/models/User.js
const UserSchema = new Schema({
  email: String,
  name: String,
  phone: String,
  profileImage: String,
  address: String,
  currentGymId: {
    type: Schema.Types.ObjectId,
    ref: 'Gym',
    default: null
  },
  // ... other fields
});
```

## Testing Checklist

After implementing the above:

- [ ] User can see their current gym (if any)
- [ ] User can enable geofence tracking
- [ ] Attendance data loads correctly
- [ ] Geofence setup uses correct gym coordinates
- [ ] Error messages are clear when gym ID is missing
- [ ] Switching gyms updates the geofence

## Current Status

✅ Errors fixed - code compiles
⚠️ Functionality incomplete - needs gym ID implementation (choose Option A or B above)
📝 TODOs added in code for clarity

## Recommended Approach

**Use Option A (Add to User Model)** because:
- Cleaner architecture
- Centralized user data
- Easier to manage
- Available across the app without extra service calls
- Matches the backend structure

Implement these changes and the attendance screen will be fully functional!
