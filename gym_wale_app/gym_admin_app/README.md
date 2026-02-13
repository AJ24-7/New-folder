# Gym-Wale Admin App

Cross-platform Flutter admin dashboard for Gym-Wale gym management system.

## Features

✅ **Cross-Platform Support**
- Windows Desktop
- macOS Desktop  
- Linux Desktop
- Android Mobile
- iOS Mobile
- Web Browser

✅ **Admin Features**
- Secure authentication with 2FA support
- Dashboard with real-time analytics
- Member management
- Trainer management & approval
- Attendance tracking & geofencing
- Payment processing & cash validation
- Equipment inventory management
- Offers & coupons management
- Support tickets & reviews
- Push notifications
- Security logs & audit trails

✅ **Modern UI/UX**
- Responsive Material Design
- Dark/Light theme support
- Smooth animations
- Shimmer loading effects
- Charts and analytics visualizations

## Tech Stack

- **Framework**: Flutter 3.10+
- **State Management**: Provider
- **HTTP Client**: Dio
- **Local Storage**: SharedPreferences + Flutter Secure Storage
- **Charts**: FL Chart + Syncfusion Charts
- **Icons**: Font Awesome Flutter
- **UI Components**: Material 3

## Project Structure

```
lib/
├── config/           # App configuration
│   ├── api_config.dart
│   └── app_theme.dart
├── models/           # Data models
│   ├── admin.dart
│   └── dashboard_stats.dart
├── providers/        # State management
│   └── auth_provider.dart
├── screens/          # UI screens
│   ├── auth/
│   │   └── login_screen.dart
│   ├── dashboard/
│   │   └── dashboard_screen.dart
│   ├── members/
│   ├── trainers/
│   ├── attendance/
│   ├── payments/
│   ├── equipment/
│   ├── offers/
│   ├── support/
│   └── settings/
├── services/         # Business logic
│   ├── api_service.dart
│   ├── auth_service.dart
│   └── storage_service.dart
├── utils/            # Utilities
├── widgets/          # Reusable widgets
│   ├── sidebar_menu.dart
│   └── stat_card.dart
└── main.dart         # App entry point
```

## Prerequisites

- Flutter SDK 3.10 or higher
- Dart SDK 3.10 or higher
- For Windows: Visual Studio 2022 with Desktop Development with C++
- For macOS: Xcode 14 or higher
- For Linux: GTK 3.0+ development libraries
- For Mobile: Android Studio or Xcode

## Installation

1. **Clone the repository**
```bash
cd gym_wale_app
```

2. **Install dependencies**
```bash
cd gym_admin_app
flutter pub get
```

3. **Configure API endpoint**

Edit `lib/config/api_config.dart`:
```dart
static const String baseUrl = 'http://your-backend-url:5000';
```

For local development:
```dart
static const String baseUrl = 'http://localhost:5000';
```

## Running the App

### Windows Desktop
```bash
flutter run -d windows
```

### macOS Desktop
```bash
flutter run -d macos
```

### Linux Desktop
```bash
flutter run -d linux
```

### Android
```bash
flutter run -d android
```

### iOS
```bash
flutter run -d ios
```

### Web
```bash
flutter run -d chrome
```

## Building for Production

### Windows
```bash
flutter build windows --release
```
Output: `build/windows/runner/Release/`

### macOS
```bash
flutter build macos --release
```
Output: `build/macos/Build/Products/Release/`

### Linux
```bash
flutter build linux --release
```
Output: `build/linux/x64/release/bundle/`

### Android APK
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (for Play Store)
```bash
flutter build appbundle --release
```
Output: `build/app/outputs/bundle/release/app-release.aab`

### iOS
```bash
flutter build ios --release
```
Then open in Xcode and archive

### Web
```bash
flutter build web --release
```
Output: `build/web/`

## Default Admin Credentials

For testing, you can create a default admin account via backend:

```bash
# In the backend folder
node setup-admin.js
```

Or use the API endpoint:
```
POST /api/admin/create-default-admin
```

Default credentials:
- Email: `admin@gym-wale.com`
- Password: `SecureAdmin@2024`

**⚠️ Change these credentials immediately after first login!**

## API Integration

The app connects to the Gym-Wale backend server. Ensure the backend is running and accessible:

Backend endpoints:
- Authentication: `/api/admin/auth/*`
- Dashboard: `/api/admin/dashboard`
- Members: `/api/members`
- Trainers: `/api/trainers`
- Payments: `/api/payments`
- And more...

## Features Implementation Status

| Feature | Status |
|---------|--------|
| Authentication & 2FA | ✅ Complete |
| Dashboard Analytics | ✅ Complete |
| Member Management | 🚧 To be implemented |
| Trainer Management | 🚧 To be implemented |
| Attendance System | 🚧 To be implemented |
| Payment Processing | 🚧 To be implemented |
| Equipment Management | 🚧 To be implemented |
| Offers & Coupons | 🚧 To be implemented |
| Support & Reviews | 🚧 To be implemented |
| Settings & Profile | 🚧 To be implemented |

## Development

### Hot Reload
While the app is running:
- Press `r` for hot reload
- Press `R` for hot restart
- Press `q` to quit

### Running Tests
```bash
flutter test
```

### Code Analysis
```bash
flutter analyze
```

## Troubleshooting

### Windows Build Issues
If you encounter build errors on Windows:
1. Ensure Visual Studio 2022 is installed with C++ Desktop Development
2. Run: `flutter doctor -v` to check for issues
3. Try: `flutter clean && flutter pub get`

### macOS Build Issues
1. Ensure Xcode is properly installed
2. Run: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
3. Accept Xcode license: `sudo xcodebuild -license accept`

### API Connection Issues
- Check backend is running: `http://localhost:5000/api/health`
- Verify API base URL in `lib/config/api_config.dart`
- For mobile emulators, use `10.0.2.2` instead of `localhost`
- For physical devices, use your computer's IP address

## Next Steps

The foundation is complete! You can now:

1. **Implement remaining screens** based on your HTML/CSS/JS modules:
   - Members screen with full CRUD operations
   - Trainers screen with approval workflow
   - Attendance screen with geofencing visualization
   - Payments screen with cash validation
   - Equipment inventory management
   - Offers & coupons management
   - Support tickets & reviews

2. **Add advanced features**:
   - Real-time updates using WebSockets
   - Export reports to PDF/Excel
   - Multi-language support
   - Advanced charts and analytics
   - Push notifications

3. **Test on all platforms** and make responsive adjustments

## Contributing

This is a private project for gym management. For access or contributions, please contact the development team.

## License

Proprietary - All rights reserved © 2026 Gym-Wale

---

**Built with ❤️ using Flutter**
