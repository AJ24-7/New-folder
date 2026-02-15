# Notification API Quick Reference

## Member App Endpoints

### Get All Notifications
```http
GET /notifications?limit=50&unreadOnly=false
Authorization: Bearer <token>

Response:
{
  "success": true,
  "notifications": [...],
  "unreadCount": 5,
  "total": 50
}
```

### Poll for New Notifications (Real-Time)
```http
GET /notifications/poll?since=2026-02-15T10:30:00Z
Authorization: Bearer <token>

Response:
{
  "success": true,
  "notifications": [...],  // Only new notifications
  "unreadCount": 5,
  "count": 2,              // Number of new notifications
  "timestamp": "2026-02-15T10:35:00Z"  // Use this for next poll
}
```

### Get Unread Count
```http
GET /notifications/unread-count
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5
}
```

### Mark as Read
```http
PUT /notifications/:id/read
Authorization: Bearer <token>

Response:
{
  "success": true,
  "notification": {...}
}
```

### Mark All as Read
```http
PUT /notifications/read-all
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### Delete Notification
```http
DELETE /notifications/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Admin App Endpoints

### Send to Members
```http
POST /api/notifications/send-to-members
Authorization: Bearer <gym_admin_token>
Content-Type: application/json

{
  "title": "Holiday Notice",
  "message": "Gym will be closed on Monday",
  "priority": "high",           // low, normal, high
  "type": "holiday-notice",     // general, membership-renewal, holiday-notice, payment, event
  "filters": {
    "membershipStatus": "active",  // active, expired, pending
    "gender": "male",              // male, female, other
    "minAge": 18,
    "maxAge": 60
  },
  "scheduleFor": "2026-02-20T09:00:00Z"  // Optional
}

Response:
{
  "success": true,
  "message": "Notification sent successfully to 45 members (2 failed)",
  "stats": {
    "totalMembers": 47,
    "successCount": 45,
    "failureCount": 2,
    "deliveryRate": "95.74%",
    "failedRecipients": [
      {
        "memberId": "123",
        "name": "John Doe",
        "reason": "No linked user account"
      }
    ]
  },
  "notification": {
    "title": "Holiday Notice",
    "type": "holiday-notice",
    "priority": "high",
    "sentAt": "2026-02-15T10:35:00Z"
  }
}
```

### Get Admin Notifications
```http
GET /api/notifications/all?type=all&priority=all&read=all&page=1&limit=50
Authorization: Bearer <gym_admin_token>

Response:
{
  "success": true,
  "notifications": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 150,
    "itemsPerPage": 50
  },
  "unreadCount": 12
}
```

### Get Unread Admin Notifications
```http
GET /api/notifications/unread
Authorization: Bearer <gym_admin_token>

Response:
{
  "success": true,
  "notifications": [...],
  "count": 12
}
```

### Send to Super Admin
```http
POST /api/notifications/send-to-super-admin
Authorization: Bearer <gym_admin_token>
Content-Type: application/json

{
  "title": "Bug Report",
  "message": "Payment gateway not working",
  "type": "bug-report",
  "priority": "high",
  "metadata": {
    "category": "payment",
    "severity": "critical"
  }
}

Response:
{
  "success": true,
  "message": "Report sent to super admin",
  "notification": {...}
}
```

### Send Renewal Reminders
```http
POST /api/notifications/renewal-reminders
Authorization: Bearer <gym_admin_token>
Content-Type: application/json

{
  "daysBeforeExpiry": 7,
  "customMessage": "Your membership is expiring soon!"
}

Response:
{
  "success": true,
  "message": "Renewal reminders sent to 15 members",
  "recipientCount": 15
}
```

### Get Notification Stats
```http
GET /api/notifications/admin/stats
Authorization: Bearer <gym_admin_token>

Response:
{
  "success": true,
  "stats": {
    "byType": [
      { "_id": "general", "count": 50, "unread": 5 },
      { "_id": "membership-renewal", "count": 20, "unread": 3 }
    ],
    "byPriority": [
      { "_id": "high", "count": 10 },
      { "_id": "normal", "count": 40 }
    ],
    "recentCount": 25,
    "totalUnread": 8
  }
}
```

---

## Notification Types

| Type | Description | Priority |
|------|-------------|----------|
| `general` | General announcements | normal |
| `membership-renewal` | Membership expiring soon | high |
| `holiday-notice` | Gym closure/holiday | high |
| `payment` | Payment reminders | medium |
| `event` | Special events | normal |
| `offer` | Special offers/discounts | normal |
| `trial_booking` | Trial session updates | normal |
| `reminder` | General reminders | normal |
| `achievement` | User achievements | low |

---

## Priority Levels

- `low`: Low importance, can be read later
- `normal`: Regular notifications
- `high`: Important, requires attention

---

## Filter Options

### Membership Status
- `active`: Currently active members
- `expired`: Expired memberships
- `pending`: Pending approval/payment

### Gender
- `male`: Male members
- `female`: Female members
- `other`: Other gender

### Age Range
- `minAge`: Minimum age (integer)
- `maxAge`: Maximum age (integer)

Example: Send to active male members aged 25-40
```json
{
  "filters": {
    "membershipStatus": "active",
    "gender": "male",
    "minAge": 25,
    "maxAge": 40
  }
}
```

---

## Polling Best Practices

### Recommended Polling Intervals
- **Production**: 30-60 seconds
- **Development**: 15-30 seconds
- **Testing**: 5-10 seconds

### Timestamp Usage
Always use the server's returned timestamp for the next poll:
```dart
// First poll
final response = await pollNotifications();

// Subsequent polls
final nextResponse = await pollNotifications(
  since: response['timestamp']
);
```

### Error Handling
```dart
try {
  final data = await ApiService.pollNotifications(since: lastTimestamp);
  // Process data
} catch (e) {
  // Silent fail - don't notify user for polling errors
  print('Polling error: $e');
}
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid token) |
| 404 | Not Found |
| 500 | Server Error |

---

## Example Flutter Implementation

### Start Polling on Screen Open
```dart
@override
void initState() {
  super.initState();
  final provider = context.read<NotificationProvider>();
  provider.initialize();
  provider.loadNotifications();
  provider.startPolling();  // Start auto-updates
}
```

### Stop Polling on Screen Close
```dart
@override
void dispose() {
  context.read<NotificationProvider>().stopPolling();
  super.dispose();
}
```

### Pull-to-Refresh
```dart
RefreshIndicator(
  onRefresh: () async {
    await provider.pollNow();  // Trigger immediate poll
    await provider.loadNotifications();  // Full refresh
  },
  child: ListView(...),
)
```

---

## Testing with cURL

### Poll for New Notifications
```bash
curl -X GET "http://localhost:5000/notifications/poll?since=2026-02-15T10:30:00Z" \
  -H "Authorization: Bearer <your_token>"
```

### Send Notification to Members
```bash
curl -X POST "http://localhost:5000/api/notifications/send-to-members" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test",
    "priority": "normal",
    "type": "general",
    "filters": {
      "membershipStatus": "active"
    }
  }'
```

### Mark as Read
```bash
curl -X PUT "http://localhost:5000/notifications/<id>/read" \
  -H "Authorization: Bearer <your_token>"
```

---

## Monitoring & Debugging

### Server Logs
Check for these logs:
- `✅ Notification sent: X succeeded, Y failed`
- `📡 Polling request from user: <userId>`
- `🔔 New notification created for user: <userId>`

### Client Logs
- `📡 Notification polling started (every 30s)`
- `🔔 New notification: <title>`
- `✅ Notification sent successfully`
- `📊 Stats: {...}`

### Common Issues

1. **Polling Not Working**
   - Check if `startPolling()` is called
   - Verify token is valid
   - Check internet connection

2. **Notifications Not Appearing**
   - Verify member has linked user account
   - Check membership filters
   - Look at `failedRecipients` in response

3. **High Failure Rate**
   - Members may not have user accounts
   - Check Member-User linking in database
   - Review filter criteria

---

## Performance Metrics

### Expected Response Times
- Poll endpoint: < 100ms
- Send notification: < 500ms (for 50 members)
- Mark as read: < 50ms

### Database Queries
- Poll query uses index on `(userId, createdAt)`
- Send uses index on `(gymId, membershipStatus)`
- Unread count uses index on `(userId, isRead)`

Ensure these indexes exist for optimal performance!
