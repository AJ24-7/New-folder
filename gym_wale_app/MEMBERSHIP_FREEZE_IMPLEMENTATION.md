# Membership Freeze & Extend Feature Implementation

## Overview
This document describes the complete implementation of the membership freezing feature with gym admin controls and membership extension functionality.

## Features Implemented

### 1. **Gym Settings - Allow Membership Freezing**
Gym admins can now control whether members can freeze their memberships through a setting.

### 2. **Conditional Freeze Button Display**
The freeze membership button in the user app only appears if the gym has enabled this feature.

### 3. **Membership Extension**
Gym admins can manually extend member memberships by a specified number of days.

---

## Backend Changes

### 1. **Gym Model Update** (`backend/models/gym.js`)
- **Added Field:**
  ```javascript
  allowMembershipFreezing: { type: Boolean, default: true }
  ```
- **Purpose:** Controls whether members of this gym can freeze their memberships
- **Default:** `true` (enabled by default for backward compatibility)

### 2. **New Controller** (`backend/controllers/gymSettingsController.js`)
Created a new controller to manage gym settings:

#### Endpoints:
- **GET `/api/gym/settings`** (Gym Admin Auth)
  - Returns gym settings for the authenticated admin
  - Response:
    ```json
    {
      "success": true,
      "settings": {
        "allowMembershipFreezing": true
      }
    }
    ```

- **PUT `/api/gym/settings`** (Gym Admin Auth)
  - Updates gym settings
  - Body:
    ```json
    {
      "allowMembershipFreezing": true/false
    }
    ```

- **GET `/api/gym/:gymId/settings`** (Public)
  - Returns settings for a specific gym (used by user app)
  - No authentication required

### 3. **Member Controller Update** (`backend/controllers/memberController.js`)
- **Added Function:** `extendMembership`
  - Allows gym admins to extend membership validity
  - Validates extension days (1-90 days)
  - Updates membership validity date
  - Creates activity log for tracking

#### Endpoint:
- **POST `/api/members/:memberId/extend`** (Gym Admin Auth)
  - Body:
    ```json
    {
      "days": 7,
      "reason": "Compensation for gym closure"
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "message": "Membership extended successfully",
      "data": {
        "memberId": "...",
        "memberName": "John Doe",
        "previousValidUntil": "2026-03-01",
        "newValidUntil": "2026-03-08",
        "daysExtended": 7
      }
    }
    ```

### 4. **Routes Update** (`backend/routes/gymRoutes.js` & `memberRoutes.js`)
- Added routes for gym settings endpoints
- Added route for membership extension

---

## Frontend Changes

### User App (Flutter)

#### 1. **API Service Update** (`lib/services/api_service.dart`)
- **Added Method:** `getGymSettings(String gymId)`
  - Fetches gym settings including freeze permission
  - Returns default value on error to prevent blocking users

#### 2. **Subscriptions Screen Update** (`lib/screens/subscriptions_screen.dart`)
- **Added State Variable:**
  ```dart
  Map<String, bool> _gymFreezeSettings = {};
  ```
- **Updated `_loadAllSubscriptions()`:**
  - Now loads gym settings for each membership
  - Stores freeze permission per gym

- **Modified Freeze Button Display:**
  - Conditionally shows freeze button based on gym settings
  - Button only appears if `_gymFreezeSettings[gymId] == true`
  - Falls back to `true` if settings not loaded (backward compatibility)

**Code Example:**
```dart
if (_gymFreezeSettings[gymId] ?? true) ...[
  const SizedBox(width: 12),
  Expanded(
    child: ElevatedButton.icon(
      onPressed: currentlyFrozen || totalFreezeCount > 0
          ? null
          : () => _showFreezeMembershipDialog(membershipId),
      icon: const Icon(Icons.ac_unit, size: 18),
      label: Text(totalFreezeCount > 0 ? l10n.freezeUsed : l10n.freeze),
      // ... styling
    ),
  ),
],
```

### Gym Admin App (Flutter)

#### 1. **New Service** (`gym_admin_app/lib/services/gym_settings_service.dart`)
Service to manage gym settings:
- `getGymSettings()` - Fetch current settings
- `updateGymSettings({bool? allowMembershipFreezing})` - Update settings

#### 2. **Member Service Update** (`gym_admin_app/lib/services/member_service.dart`)
- **Added Method:** `extendMembership({required String memberId, required int days, String? reason})`
  - Allows admins to extend member memberships
  - Validates extension (1-90 days)
  - Includes optional reason field

---

## Usage Instructions

### For Gym Admins

#### Enable/Disable Membership Freezing

**Option 1: Via API (Postman/cURL)**
```bash
PUT /api/gym/settings
Headers: Authorization: Bearer <gym_admin_token>
Body: {
  "allowMembershipFreezing": true
}
```

**Option 2: Via Gym Admin Panel (Web - Coming Soon)**
1. Navigate to Settings
2. Find "Membership Settings" section
3. Toggle "Allow Membership Freezing"
4. Save changes

**Option 3: Via Flutter Admin App (To Be Implemented)**
A settings screen needs to be added to the gym admin Flutter app with a toggle for this setting.

#### Extend Member Membership

**Via API:**
```bash
POST /api/members/:memberId/extend
Headers: Authorization: Bearer <gym_admin_token>
Body: {
  "days": 7,
  "reason": "Gym maintenance closure"
}
```

**Via Gym Admin App (To Be Implemented):**
1. Go to Members screen
2. Select a member
3. Click "Extend Membership"
4. Enter days and reason
5. Confirm

### For Gym Members

#### Freeze Membership
1. Open app and go to "Subscriptions" screen
2. Select your active gym membership
3. If the gym allows freezing, you'll see a "Freeze" button
4. Tap "Freeze" and select duration (7-15 days)
5. Confirm freeze request

**Note:** 
- Freeze button will not appear if gym has disabled this feature
- You can only freeze once per membership
- Membership validity is automatically extended by freeze duration

---

## Integration with Existing Features

### 1. **Freeze Membership Logic**
The existing freeze membership logic (`freezeMembership` in memberController.js) remains unchanged:
- Validates freeze duration (7-15 days)
- Checks if already frozen
- Checks if freeze already used
- Extends membership validity automatically
- Stores freeze history

### 2. **Member Model**
Already contains necessary freeze fields:
- `currentlyFrozen: Boolean`
- `freezeStartDate: Date`
- `freezeEndDate: Date`
- `totalFreezeCount: Number`
- `freezeHistory: Array`

---

## Next Steps / TODO

### High Priority
1. **Create Settings Screen in Gym Admin Flutter App**
   - Add toggle for "Allow Membership Freezing"
   - Add other gym preference settings

2. **Add Extend Membership UI in Gym Admin App**
   - Add "Extend" button in member details view
   - Create dialog to input days and reason
   - Show confirmation and success message

3. **Add Settings Toggle in Web Admin Panel**
   - Update `gymadmin/gymadmin.html` with settings section
   - Add JavaScript to update settings via API

### Medium Priority
4. **Add Activity Logs View**
   - Show membership extensions in admin activity feed
   - Track who extended and when

5. **Email Notifications**
   - Notify member when membership is extended
   - Include reason and new validity date

6. **Analytics**
   - Track freeze requests per gym
   - Track membership extensions

### Low Priority
7. **Bulk Operations**
   - Extend multiple memberships at once
   - Useful for gym-wide closures

8. **Freeze Request Approval**
   - Optional setting for gym to approve freeze requests
   - Members request, admin approves

---

## Testing Checklist

### Backend
- [ ] Test gym settings GET endpoint
- [ ] Test gym settings UPDATE endpoint
- [ ] Test gym settings by ID endpoint (public)
- [ ] Test membership extension with valid data
- [ ] Test membership extension with invalid days (< 1 or > 90)
- [ ] Test membership extension for non-existent member
- [ ] Test activity log creation on extension

### User App
- [ ] Test freeze button appears when setting is enabled
- [ ] Test freeze button hidden when setting is disabled
- [ ] Test freeze functionality still works
- [ ] Test settings loaded correctly for multiple gyms
- [ ] Test fallback behavior when settings fail to load

### Gym Admin App
- [ ] Test settings service GET
- [ ] Test settings service UPDATE
- [ ] Test member extension service
- [ ] Test UI integration (when implemented)

---

## Database Schema Changes

### Gym Collection
```javascript
{
  // ... existing fields
  allowMembershipFreezing: Boolean (default: true)
}
```

### Activity Collection (for extension logs)
```javascript
{
  gym: ObjectId,
  type: 'membership_extended',
  description: 'Extended membership for John Doe by 7 days',
  metadata: {
    memberId: ObjectId,
    memberName: String,
    daysExtended: Number,
    previousValidUntil: String,
    newValidUntil: String,
    reason: String
  }
}
```

---

## API Reference Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/gym/settings` | GET | Gym Admin | Get gym settings |
| `/api/gym/settings` | PUT | Gym Admin | Update gym settings |
| `/api/gym/:gymId/settings` | GET | Public | Get gym settings by ID |
| `/api/members/:memberId/extend` | POST | Gym Admin | Extend membership |
| `/api/members/:membershipId/freeze` | POST | User Auth | Freeze membership (existing) |

---

## Error Handling

### Common Errors

1. **Extension days out of range:**
   ```json
   {
     "success": false,
     "message": "Extension days must be between 1 and 90"
   }
   ```

2. **Member not found:**
   ```json
   {
     "success": false,
     "message": "Member not found"
   }
   ```

3. **Settings update failed:**
   ```json
   {
     "success": false,
     "message": "Failed to update gym settings"
   }
   ```

---

## Backward Compatibility

- All changes are backward compatible
- `allowMembershipFreezing` defaults to `true` for existing gyms
- User app shows freeze button by default if settings fail to load
- Existing freeze functionality unchanged

---

## Security Considerations

1. **Authentication Required:**
   - Settings endpoints require gym admin authentication
   - Extension endpoint requires gym admin authentication
   - Only gym owner can modify their gym's settings

2. **Validation:**
   - Extension days validated (1-90 range)
   - Member must belong to admin's gym
   - Freeze duration validated (7-15 days)

3. **Authorization:**
   - Admins can only extend memberships for their own gym
   - Users can only freeze their own memberships

---

## Performance Impact

- Minimal: One additional API call per membership when loading subscriptions
- Cached in state to avoid repeated calls
- Settings fetched only for unique gyms (deduplicated)

---

## Conclusion

The membership freeze control and extension features are now fully implemented in the backend with partial frontend integration. The remaining work involves creating UI components in the gym admin app to allow easy management of these features through a graphical interface.

**Status:**
- ✅ Backend: Complete
- ✅ User App: Complete
- ⏳ Gym Admin App: Service layer complete, UI pending
- ⏳ Web Admin Panel: Pending

