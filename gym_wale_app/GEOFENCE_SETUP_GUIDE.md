# Geofence Setup Guide for Gym Admins

## 📍 Overview

This guide provides complete instructions for setting up polygon-based geofence attendance tracking in your gym. With this system, members' attendance is automatically marked when they enter and exit your gym premises.

## ✨ Key Features

### Advanced Polygon Geofencing
- ✅ **Polygon Mode**: Draw custom boundaries matching your exact gym shape
- ✅ **Circular Mode**: Simple radius-based geofence for quick setup
- ✅ **High Precision**: GPS accuracy down to 10-20 meters
- ✅ **Real-time Verification**: Instant location validation

### Automatic Attendance
- ✅ Auto-mark entry when members arrive
- ✅ Auto-mark exit when members leave
- ✅ Duration tracking for workout length
- ✅ Operating hours validation

### Anti-Fraud Protection
- ✅ Mock location detection and rejection
- ✅ Minimum stay duration enforcement
- ✅ One attendance per day limit
- ✅ Accuracy threshold validation

---

## 🚀 Setup Instructions

### Step 1: Access Geofence Setup

1. Open the Gym Admin App
2. Navigate to **Attendance** from the sidebar
3. Click on **Geofence Setup** button in Quick Actions
4. Grant location permission when prompted

### Step 2: Grant Location Permissions

When you first access the Geofence Setup screen, you'll see a permission dialog:

**What you need to allow:**
- ✅ **Location Access**: Required to determine gym coordinates
- ✅ **Precise Location**: For accurate boundary detection
- ✅ **Background Location** (Optional): For testing location tracking

**How to grant permissions:**
1. Click "Grant Permission" in the dialog
2. When system prompt appears, select "While using the app" or "Always"
3. For optimal results, choose "Precise Location" if available

**If permissions are denied:**
- The app will show a prompt to open settings
- Navigate to: Settings → Apps → Gym Admin App → Permissions
- Enable Location permissions

### Step 3: Choose Geofence Type

You have two options:

#### Option A: Polygon Geofence (Recommended)
**Best for:**
- Irregularly shaped gyms
- Multi-floor facilities
- Buildings with specific entry points
- Maximum accuracy required

**Advantages:**
- Exact fit to gym building shape
- Excludes parking lots and nearby areas
- Prevents false check-ins from outside
- Professional and precise

#### Option B: Circular Geofence (Simple)
**Best for:**
- Small, compact gyms
- Single-room facilities
- Quick setup needed
- Gyms in standalone buildings

**Advantages:**
- Fast one-click setup
- Easy to configure
- Good for beginners
- Adequate for most use cases

### Step 4: Define Geofence Boundaries

#### For Polygon Geofence:

1. **Zoom and Position Map**
   - Use pinch gesture to zoom in on your gym
   - Center your gym building on the screen
   - Use satellite view for accuracy

2. **Mark Boundary Points**
   - Tap on each corner of your gym building
   - Create a closed polygon around the perimeter
   - Minimum 3 points required, 6-10 recommended
   - Tap carefully on building edges

3. **Adjust Points** (if needed)
   - Drag markers to fine-tune position
   - Delete by holding and dragging away
   - Clear all to start over

4. **Verification**
   - Ensure all entry points are inside
   - Check that parking is outside (optional)
   - Verify no nearby buildings overlap

**Pro Tips:**
- Walk around your gym with the app to test coverage
- Include main entrance and all side entrances
- Exclude areas you don't want to trigger attendance
- Leave 5-10 meter buffer from exact walls

#### For Circular Geofence:

1. **Set Center Point**
   - Tap on the center of your gym
   - Use "My Location" button to auto-center
   - Marker shows exact center

2. **Adjust Radius**
   - Use slider to set radius (50m - 500m)
   - Default: 100 meters
   - Recommended: 80-150 meters for most gyms

3. **Visual Feedback**
   - Blue circle shows coverage area
   - Ensure entire gym is covered
   - Avoid excessive overlap with surroundings

### Step 5: Configure Settings

Click the "Settings" button to customize geofence behavior:

#### General Settings

**Enable Geofence**
- ✅ Turn this ON to activate geofencing
- When OFF, system won't track location

**Auto Mark Entry**
- ✅ ON: Attendance marked automatically on entry
- ❌ OFF: Manual check-in required

**Auto Mark Exit**
- ✅ ON: Exit time recorded automatically
- ❌ OFF: Exit not tracked

**Allow Mock Location**
- ❌ OFF (Recommended): Block fake GPS apps
- ✅ ON: Allow mock locations (testing only)
  
#### Accuracy & Validation

**Minimum Accuracy: 10-50 meters**
- Default: 20 meters
- Lower = More strict (better GPS required)
- Higher = More lenient (works in poor signal areas)
- Recommended: 20 meters for outdoor, 30 for indoor

**Minimum Stay Duration: 1-60 minutes**
- Default: 5 minutes
- Prevents drive-by check-ins
- Ensures actual workout session
- Recommended: 5-10 minutes

#### Operating Hours

**Start Time**
- Set gym opening time (e.g., 6:00 AM)
- Attendance only marked during hours
- Default: 6:00 AM

**End Time**
- Set gym closing time (e.g., 10:00 PM)
- Prevents late-night false entries
- Default: 10:00 PM

**Benefits:**
- Prevents accidental check-ins when gym is closed
- Ensures staff is available
- Matches actual business hours

### Step 6: Save Configuration

1. Review all settings carefully
2. Click **"Save Geofence Configuration"** button
3. Wait for confirmation message
4. System is now active!

---

## 📱 Member App Setup (User Side)

For geofence attendance to work, members must also set up their app:

### Member Requirements

1. **Install GymWale Member App**
   - Download from Play Store / App Store
   - Login with member credentials

2. **Grant Location Permissions**
   - App will prompt on first launch
   - Select "Allow all the time" or "Always"
   - Enable "Precise Location" if available

3. **Enable Background Location**
   - Required for automatic tracking
   - App can detect gym presence even when closed

4. **Keep Location Services ON**
   - GPS must be enabled on device
   - High accuracy mode recommended

### Instruction Template for Members

You can share these instructions with your members:

---

**🎯 GymWale Auto-Attendance Setup**

To enable automatic attendance at [Gym Name]:

1. Install the GymWale app from your app store
2. Log in with your membership credentials
3. Allow location permissions when prompted
   - Choose "Always" or "Allow all the time"
   - Enable "Precise Location" for best results
4. Ensure your phone's GPS is turned ON
5. The app will automatically mark your attendance when you arrive!

**Note**: Keep the app installed and location enabled. Your attendance will be tracked automatically - no manual check-in needed!

---

## 🧪 Testing Your Geofence

Before rolling out to all members, test thoroughly:

### Testing Checklist

**✅ Entry Test**
1. Open member app  
2. Walk to gym from outside geofence
3. Cross the boundary
4. Check if attendance is marked automatically
5. Verify timestamp is accurate

**✅ Exit Test**
1. Ensure entry was recorded
2. Leave the gym premises
3. Walk outside geofence boundary
4. Verify exit time is recorded
5. Check total duration

**✅ Boundary Test**
1. Walk around gym perimeter
2. Note exactly where auto check-in triggers
3. Adjust boundaries if needed
4. Test all entry points

**✅ Mock Location Test**
1. Install a fake GPS app (testing only)
2. Try to spoof location
3. Verify system rejects the attendance
4. Should show "Mock location detected" error

**✅ Operating Hours Test**
1. Test entry before opening time
2. Should be rejected
3. Test during operating hours
4. Should work normally

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Attendance not marked | Location permission denied | Re-grant permissions in Settings |
| Late entry detection | GPS signal weak | Increase minimum accuracy setting |
| False entries from parking | Geofence too large | Reduce radius or adjust polygon |
| Missed entries | Geofence too small | Expand boundaries by 10-20m |
| Mock location detected | User has fake GPS | Contact member, disable mock apps |

---

## 🔒 Security & Privacy

### Data Protection
- Location data is only collected near gym
- No history stored outside gym visits
- Encrypted transmission to server
- GDPR compliant

### Anti-Fraud Measures
- Mock location detection
- One attendance per day limit
- Minimum stay duration
- Operating hours validation
- Accuracy threshold enforcement

### Member Privacy
- Members can see their own location data only
- Gym admins see only attendance records, not continuous location
- Location tracking stops when member leaves gym area
- Members can opt out anytime (disables auto-attendance)

---

## 📊 Monitoring Attendance

### Admin Dashboard Features

**Attendance Reports**
- Daily attendance summary
- Entry/exit timestamps
- Duration per member
- Rush hour analysis

**Geofence Analytics**
- Average entry time
- Peak hours
- Attendance patterns
- Member punctuality stats

**Alerts & Notifications**
- Late check-ins
- Unusual patterns
- Mock location attempts
- System errors

---

## 🛠️ Advanced Configuration

### Multiple Gym Locations

If you manage multiple gym branches:

1. Set up geofence for each gym separately
2. Each gym has independent boundaries
3. Members can attend any gym (if allowed)
4. Attendance tracked per location

### Seasonal Adjustments

**Summer/Winter Hours:**
- Update operating hours seasonally
- Expand geofence for outdoor areas (summer)
- Adjust for daylight saving time

**Temporary Closures:**
- Disable geofence during holidays
- Re-enable when reopening
- No manual configuration changes needed

### High-Precision Mode

For gyms requiring maximum accuracy:

1. Use Polygon mode with 8-12 points
2. Set minimum accuracy to 15 meters
3. Increase minimum stay to 10 minutes
4. Enable exit tracking
5. Monitor for false rejections

---

## 📞 Support & Troubleshooting

### Getting Help

**Technical Support:**
- Email: support@gymwale.com
- Phone: +91-XXXX-XXXXXX
- Live Chat: Available in app

**Documentation:**
- User manuals in app
- Video tutorials on YouTube
- FAQ section on website

### Reporting Issues

When contacting support, provide:
1. Gym name and ID
2. Screenshot of geofence configuration
3. Description of issue
4. Time and date of occurrence
5. Member ID (if member-specific)

---

## 📋 Best Practices

### Do's ✅
- Test thoroughly before announcing to members
- Communicate clearly about automatic attendance
- Monitor first week closely for issues
- Adjust settings based on actual usage
- Keep operating hours updated
- Review geofence quarterly

### Don'ts ❌
- Don't set geofence too large (includes nearby areas)
- Don't enable mock locations in production
- Don't ignore member complaints about missed attendance
- Don't forget to test all entry points
- Don't disable without member notification

---

## 🎓 Training Resources

### For Gym Staff
- Admin panel overview (30 min video)
- Geofence setup walkthrough (15 min)
- Troubleshooting guide (PDF)
- Monthly webinars

### For Members
- Member app tutorial (10 min video)
- Permission setup guide (PDF)
- FAQ webpage
- In-app help center

---

## 📈 Success Metrics

Track these KPIs to measure success:

- **Adoption Rate**: % of members using auto-attendance
- **Accuracy**: % of correct check-ins vs total
- **Missed Entries**: Number of failed auto-marks
- **Mock Attempts**: Security breach attempts
- **Member Satisfaction**: Feedback scores

**Target Goals:**
- 90%+ adoption within 3 months
- 95%+ accuracy rate
- <5% missed entries
- 0 successful mock location attempts

---

## 🔄 Regular Maintenance

### Weekly Tasks
- Review attendance anomalies
- Check for mock location attempts
- Respond to member issues

### Monthly Tasks
- Analyze peak hours
- Update operating hours if needed
- Review boundary accuracy
- Staff training refresh

### Quarterly Tasks
- Full system audit
- Boundary verification (walk test)
- Settings optimization
- Member feedback survey

---

## 📄 Appendix

### Technical Specifications

**GPS Requirements:**
- Minimum accuracy: 10 meters
- Update frequency: Every 30 seconds near gym
- Battery optimization: Low impact mode

**Network Requirements:**
- Internet connection for attendance sync
- Offline capable (syncs when connected)
- 4G/5G/WiFi supported

**Device Compatibility:**
- Android 8.0+
- iOS 13.0+
- All modern smartphones

### Glossary

**Geofence**: Virtual boundary around physical location  
**Polygon**: Multi-point custom boundary shape  
**Mock Location**: Fake GPS coordinates from spoofing apps  
**Accuracy**: GPS precision in meters  
**Auto-mark**: Automatic attendance recording  
**Operating Hours**: Valid time range for attendance

---

## ✅ Setup Complete!

Congratulations! Your geofence-based attendance system is now configured. 

**Next Steps:**
1. Inform all members about the new system
2. Provide setup instructions
3. Monitor for first week
4. Collect feedback
5. Optimize based on usage patterns

**Need Help?** Contact support@gymwale.com

---

*Last Updated: February 2026*  
*Version: 2.0*  
*GymWale Attendance System*
