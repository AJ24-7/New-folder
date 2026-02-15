# Google Maps API Setup Guide

## Overview
This guide will help you set up the Google Maps API key for the Gym Admin App to enable geofence features.

## Getting Your API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Click on the project dropdown at the top
   - Create a new project or select an existing one

3. **Enable Required APIs**
   - Navigate to "APIs & Services" → "Library"
   - Enable the following APIs:
     - **Maps JavaScript API** (for web)
     - **Maps SDK for Android**
     - **Maps SDK for iOS**
     - **Geocoding API** (for address conversion)
     - **Geolocation API** (optional, for location detection)

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Restrict Your API Key (Recommended)**
   - Click on your newly created API key
   - Under "Application restrictions":
     - For web: Choose "HTTP referrers" and add your domain
     - For Android: Choose "Android apps" and add your package name and SHA-1
     - For iOS: Choose "iOS apps" and add your bundle identifier
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose the APIs you enabled in step 3
   - Save changes

## Installing Your API Key

### 1. Web (index.html)

File: `gym_admin_app/web/index.html`

Replace `YOUR_API_KEY_HERE` with your actual API key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY" defer></script>
```

### 2. Android (AndroidManifest.xml)

File: `gym_admin_app/android/app/src/main/AndroidManifest.xml`

Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ACTUAL_API_KEY"/>
```

### 3. iOS (AppDelegate.swift)

File: `gym_admin_app/ios/Runner/AppDelegate.swift`

Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:

```swift
GMSServices.provideAPIKey("YOUR_ACTUAL_API_KEY")
```

## Security Best Practices

### DO:
✅ Restrict your API key to specific platforms and APIs
✅ Use different API keys for development and production
✅ Monitor API usage in Google Cloud Console
✅ Set up billing alerts to avoid unexpected charges
✅ Store API keys in environment variables for backend use

### DON'T:
❌ Commit API keys to public repositories without restrictions
❌ Use the same unrestricted key across all platforms
❌ Share your API key publicly
❌ Ignore quota warnings

## Environment-Specific Configuration (Optional)

For better security, you can use environment-specific API keys:

### Development
- Create a `.dev.env` file with: `GOOGLE_MAPS_API_KEY=your_dev_key`

### Production  
- Use platform-specific environment variables or CI/CD secrets

## Troubleshooting

### Map not loading on web?
- Check browser console for errors
- Verify API key is correct in `index.html`
- Ensure "Maps JavaScript API" is enabled
- Check domain restrictions if any

### Map not loading on Android?
- Verify API key in `AndroidManifest.xml`
- Ensure "Maps SDK for Android" is enabled
- Add package name and SHA-1 to API restrictions
- Get SHA-1: Run `cd android && ./gradlew signingReport`

### Map not loading on iOS?
- Verify API key in `AppDelegate.swift`
- Ensure "Maps SDK for iOS" is enabled
- Check bundle identifier in API restrictions
- Run `flutter clean` and rebuild

### TypeError: Cannot read properties of undefined (reading 'maps')
- This was fixed by adding the Google Maps script to `index.html`
- Ensure the script loads before the Flutter app initializes
- Check that the `defer` attribute is present

## Verification

After installing the API key:

1. **Web**: Open the app in a browser and check console for errors
2. **Android**: Build and run on an Android device/emulator
3. **iOS**: Build and run on an iOS device/simulator

Navigate to "Geofence Setup" screen to verify the map loads correctly.

## Cost Management

Google Maps provides a **$200 monthly credit** for the Maps, Routes, and Places APIs.

Typical usage for this app:
- **Map loads**: ~7,000 free loads per month
- **Geocoding**: ~40,000 free requests per month

For most gym admin apps, you won't exceed the free tier.

## Support

If you encounter issues:
1. Check the Flutter google_maps_flutter documentation
2. Review Google Maps Platform documentation
3. Check your API quota and billing in Google Cloud Console

---

**Last Updated**: February 2026
