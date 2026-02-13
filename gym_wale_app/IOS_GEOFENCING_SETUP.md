# iOS Geofencing Configuration Guide

## Overview
This guide explains how to configure iOS for geofence-based attendance tracking in the Gym Wale app.

## Configuration Steps

### 1. Info.plist Configuration

Add the following keys to your `ios/Runner/Info.plist` file:

```xml
<!-- Location Permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to automatically mark your gym attendance when you arrive at the gym.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need constant access to your location to automatically track your gym attendance even when the app is in the background.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>We need constant access to your location to automatically track your gym attendance even when the app is in the background.</string>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
    <string>processing</string>
</array>

<!-- Motion & Fitness (for activity recognition) -->
<key>NSMotionUsageDescription</key>
<string>We use motion data to optimize battery usage while tracking your location.</string>
```

### 2. Background Location Capabilities

1. Open your project in Xcode: `ios/Runner.xcworkspace`
2. Select your app target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability" button
5. Add "Background Modes"
6. Check the following options:
   - ✅ Location updates
   - ✅ Background fetch
   - ✅ Background processing

### 3. Location Accuracy Authorization (iOS 14+)

For iOS 14 and later, you need to add the following to Info.plist:

```xml
<key>NSLocationTemporaryUsageDescriptionDictionary</key>
<dict>
    <key>AttendanceTracking</key>
    <string>We need precise location to verify you are at the gym for attendance marking.</string>
</dict>
```

### 4. Deployment Target

Ensure your iOS deployment target is at least iOS 12.0:

In `ios/Podfile`:
```ruby
platform :ios, '12.0'
```

### 5. AppDelegate.swift Configuration

Update `ios/Runner/AppDelegate.swift` to register background tasks:

```swift
import UIKit
import Flutter
import CoreLocation

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        GeneratedPluginRegistrant.register(with: self)
        
        // Register background tasks if needed
        if #available(iOS 13.0, *) {
            // Handle background tasks
        }
        
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
    
    // Handle location updates in background
    override func applicationDidEnterBackground(_ application: UIApplication) {
        // Keep location services active
    }
}
```

## Important iOS Limitations

### Background Location Restrictions

1. **iOS 11+**: App can monitor up to 20 geofences simultaneously
2. **iOS 13+**: User must explicitly grant "Always" location permission
3. **iOS 15+**: System may show blue status bar when tracking location in background

### Battery Optimization

iOS automatically optimizes geofence monitoring:
- Uses cell tower and Wi-Fi positioning when possible
- GPS used only when entering/exiting regions
- System may delay callbacks to save battery

### User Permissions Flow

1. First request: "Allow While Using App"
2. After some time using the app, iOS will prompt: "Change to Always Allow?"
3. Users can change this in Settings > Privacy > Location Services

### Testing on iOS

1. **Simulator Limitations**:
   - Geofencing doesn't work reliably in iOS Simulator
   - Use real devices for testing

2. **Debug Mode**:
   - Enable location simulation in Xcode
   - Use GPX files to simulate location changes

3. **Background Testing**:
   - Lock device and move to test background geofencing
   - Check Console.app logs for geofence events

## Privacy Considerations

### App Store Review

When submitting to App Store, explain:
- Why you need "Always" location access
- How it benefits the user (automatic attendance)
- Privacy measures in place

### Privacy Manifest (iOS 17+)

Create `ios/Runner/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeLocation</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

## Troubleshooting

### Geofence Not Triggering

1. Verify location permissions are set to "Always"
2. Check if location services are enabled
3. Ensure geofence radius is at least 100 meters (iOS recommendation)
4. Verify device has moved far enough from geofence boundary

### High Battery Drain

1. Reduce geofence monitoring frequency
2. Use larger geofence radius
3. Enable activity recognition for smart tracking
4. Ensure app is not constantly querying location

### Permission Denied

1. Guide users to Settings > Privacy > Location Services
2. Explain benefits of "Always" permission
3. Provide fallback to manual attendance marking

## Testing Checklist

- [ ] Location permissions requested correctly
- [ ] Geofence registers successfully
- [ ] Entry event triggers when entering gym area
- [ ] Exit event triggers when leaving gym area
- [ ] Works when app is in background
- [ ] Works when app is terminated (iOS may not support this)
- [ ] No significant battery drain
- [ ] Mock locations rejected properly
- [ ] Error handling for permission denial

## Next Steps

After configuring iOS:
1. Run `cd ios && pod install`
2. Test on a real iOS device
3. Monitor battery usage
4. Test in various scenarios (background, terminated, etc.)

## Resources

- [Apple Location Services Guide](https://developer.apple.com/documentation/corelocation)
- [Geofencing Documentation](https://developer.apple.com/documentation/corelocation/monitoring_the_user_s_proximity_to_geographic_regions)
- [Background Execution Guide](https://developer.apple.com/documentation/backgroundtasks)
