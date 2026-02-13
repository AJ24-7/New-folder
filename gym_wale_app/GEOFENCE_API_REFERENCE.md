# Geofence Attendance API Reference

## Base URL
```
http://your-backend-url/api/attendance
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Auto-Mark Entry
Mark attendance when user enters gym geofence.

**Endpoint:** `POST /auto-mark/entry`

**Request Body:**
```json
{
  "gymId": "6501234567890abcdef12345",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10.5,
  "isMockLocation": false
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Attendance marked successfully via geofence",
  "attendance": {
    "_id": "6501234567890abcdef12346",
    "gymId": "6501234567890abcdef12345",
    "personId": "6501234567890abcdef12347",
    "personType": "Member",
    "date": "2026-01-02T00:00:00.000Z",
    "status": "present",
    "checkInTime": "09:30",
    "authenticationMethod": "geofence",
    "isGeofenceAttendance": true,
    "geofenceEntry": {
      "timestamp": "2026-01-02T09:30:15.000Z",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": 10.5,
      "isMockLocation": false,
      "distanceFromGym": 45
    }
  },
  "sessionsRemaining": 25
}
```

**Error Responses:**

**400 - Missing Fields:**
```json
{
  "success": false,
  "message": "Missing required fields: gymId, latitude, longitude"
}
```

**403 - Mock Location:**
```json
{
  "success": false,
  "message": "Mock locations are not allowed for attendance marking"
}
```

**403 - Outside Geofence:**
```json
{
  "success": false,
  "message": "You are 250m away from the gym. Must be within 100m.",
  "distance": 250,
  "requiredRadius": 100
}
```

**403 - No Active Membership:**
```json
{
  "success": false,
  "message": "No active membership found. Please renew your membership."
}
```

**403 - Outside Time Window:**
```json
{
  "success": false,
  "message": "Attendance can only be marked during gym operating hours"
}
```

**200 - Already Marked:**
```json
{
  "success": true,
  "message": "Attendance already marked for today",
  "attendance": { ... },
  "alreadyMarked": true
}
```

---

### 2. Auto-Mark Exit
Mark exit when user leaves gym geofence.

**Endpoint:** `POST /auto-mark/exit`

**Request Body:**
```json
{
  "gymId": "6501234567890abcdef12345",
  "latitude": 28.6145,
  "longitude": 77.2095,
  "accuracy": 12.3
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Gym exit recorded successfully",
  "attendance": {
    "_id": "6501234567890abcdef12346",
    "checkOutTime": "11:45",
    "geofenceExit": {
      "timestamp": "2026-01-02T11:45:30.000Z",
      "latitude": 28.6145,
      "longitude": 77.2095,
      "accuracy": 12.3,
      "durationInside": 135
    }
  },
  "durationInMinutes": 135
}
```

**Error Responses:**

**404 - No Entry Found:**
```json
{
  "success": false,
  "message": "No attendance entry found for today"
}
```

**403 - Minimum Stay:**
```json
{
  "success": false,
  "message": "Minimum stay time is 5 minutes. Current duration: 3 minutes.",
  "durationInMinutes": 3
}
```

---

### 3. Get Today's Attendance
Check if attendance is marked for today.

**Endpoint:** `GET /today/:gymId`

**Success Response (200):**
```json
{
  "success": true,
  "attendance": {
    "_id": "6501234567890abcdef12346",
    "gymId": "6501234567890abcdef12345",
    "personId": "6501234567890abcdef12347",
    "date": "2026-01-02T00:00:00.000Z",
    "status": "present",
    "checkInTime": "09:30",
    "checkOutTime": "11:45",
    "isGeofenceAttendance": true,
    "geofenceEntry": { ... },
    "geofenceExit": { ... }
  },
  "isMarked": true,
  "hasCheckedOut": true
}
```

**No Attendance Response (200):**
```json
{
  "success": true,
  "attendance": null,
  "isMarked": false,
  "hasCheckedOut": false
}
```

---

### 4. Get Attendance History
Retrieve attendance records for a date range.

**Endpoint:** `GET /history/:gymId`

**Query Parameters:**
- `startDate` (optional): ISO date string (e.g., "2026-01-01")
- `endDate` (optional): ISO date string
- `limit` (optional): Number of records (default: 30)

**Example:**
```
GET /history/6501234567890abcdef12345?startDate=2026-01-01&endDate=2026-01-31&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 20,
  "attendance": [
    {
      "_id": "6501234567890abcdef12346",
      "date": "2026-01-02T00:00:00.000Z",
      "status": "present",
      "checkInTime": "09:30",
      "checkOutTime": "11:45",
      "isGeofenceAttendance": true,
      "geofenceEntry": {
        "timestamp": "2026-01-02T09:30:15.000Z",
        "durationInside": 135
      }
    },
    // ... more records
  ]
}
```

---

### 5. Get Attendance Statistics
Get monthly attendance statistics.

**Endpoint:** `GET /stats/:gymId`

**Query Parameters:**
- `month` (optional): Month number (1-12)
- `year` (optional): Year (e.g., 2026)

**Example:**
```
GET /stats/6501234567890abcdef12345?month=1&year=2026
```

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "month": 1,
    "year": 2026,
    "totalDays": 31,
    "presentDays": 20,
    "geofenceDays": 18,
    "attendanceRate": 64.52,
    "averageDurationMinutes": 95
  }
}
```

---

### 6. Verify Geofence
Test if a location is within the geofence (for debugging).

**Endpoint:** `POST /verify`

**Request Body:**
```json
{
  "gymId": "6501234567890abcdef12345",
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

**Success Response (200):**
```json
{
  "success": true,
  "gymLocation": {
    "lat": 28.6139,
    "lng": 77.2090,
    "radius": 100
  },
  "userLocation": {
    "lat": 28.6139,
    "lng": 77.2090
  },
  "distance": 5,
  "isInsideGeofence": true,
  "message": "You are inside the geofence"
}
```

**Outside Geofence Response (200):**
```json
{
  "success": true,
  "distance": 250,
  "isInsideGeofence": false,
  "message": "You are 150m outside the geofence"
}
```

---

## Error Codes Summary

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created (new attendance) |
| 400 | Bad Request (missing fields, invalid data) |
| 403 | Forbidden (mock location, outside geofence, no membership, etc.) |
| 404 | Not Found (gym not found, no attendance entry) |
| 500 | Server Error |

---

## Common Error Response Format

```json
{
  "success": false,
  "message": "Error description here",
  "error": "Detailed error message (in development mode)"
}
```

---

## Data Models

### Attendance Object
```typescript
{
  _id: ObjectId,
  gymId: ObjectId,
  personId: ObjectId,
  personType: 'Member',
  date: Date,
  status: 'present' | 'absent' | 'pending',
  checkInTime: string,        // "HH:MM" format
  checkOutTime: string | null,
  authenticationMethod: 'geofence',
  isGeofenceAttendance: boolean,
  geofenceEntry: {
    timestamp: Date,
    latitude: number,
    longitude: number,
    accuracy: number,
    isMockLocation: boolean,
    distanceFromGym: number    // meters
  },
  geofenceExit: {
    timestamp: Date,
    latitude: number,
    longitude: number,
    accuracy: number,
    durationInside: number     // minutes
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## Testing with cURL

### Mark Entry
```bash
curl -X POST http://localhost:5000/api/attendance/auto-mark/entry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gymId": "6501234567890abcdef12345",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 10.5,
    "isMockLocation": false
  }'
```

### Get Today's Attendance
```bash
curl -X GET http://localhost:5000/api/attendance/today/6501234567890abcdef12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Verify Geofence
```bash
curl -X POST http://localhost:5000/api/attendance/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "gymId": "6501234567890abcdef12345",
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

---

## Rate Limiting

Consider implementing rate limiting:
- Entry/Exit marking: 10 requests per minute per user
- History/Stats: 30 requests per minute per user
- Verify: 60 requests per minute per user

---

## Best Practices

1. **Always validate isMockLocation** on the client side before sending
2. **Cache today's attendance** to reduce API calls
3. **Batch history requests** instead of frequent small requests
4. **Handle network failures** gracefully with retry logic
5. **Store geofence data locally** for offline functionality
6. **Monitor battery usage** and adjust tracking frequency

---

## WebSocket Support (Future Enhancement)

Consider implementing WebSocket for real-time updates:
```javascript
// Example WebSocket event
{
  "event": "attendance_marked",
  "data": {
    "memberId": "...",
    "gymId": "...",
    "timestamp": "...",
    "type": "entry"
  }
}
```

---

**Last Updated:** January 2, 2026
**API Version:** 1.0
