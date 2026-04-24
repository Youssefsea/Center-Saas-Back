# EdTech Platform - API Contract Documentation v2.0

> **Professional API Reference for Egyptian Learning Centers Management Platform**

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Response Format](#common-response-format)
4. [Error Codes](#error-codes)
5. [Module 1: Auth](#module-1-auth)
6. [Module 2: Users](#module-2-users)
7. [Module 3: Centers](#module-3-centers)
8. [Module 4: Teachers](#module-4-teachers)
9. [Module 5: Sessions](#module-5-sessions)
10. [Module 6: Bookings](#module-6-bookings)
11. [Module 7: Attendance](#module-7-attendance)
12. [Module 8: Rooms](#module-8-rooms)
13. [Module 9: Content](#module-9-content)
14. [Module 10: Wallet](#module-10-wallet)
15. [Module 11: Reviews](#module-11-reviews)
16. [Module 12: Discovery](#module-12-discovery)
17. [Module 13: Admin](#module-13-admin)

---

## Overview

| Property | Value |
|----------|-------|
| **Base URL** | `/api/v1` |
| **Protocol** | HTTPS |
| **Content-Type** | `application/json` |
| **Tech Stack** | Node.js, Express.js, PostgreSQL, PostGIS |
| **Version** | 2.0.0 |

### User Roles

| Role | Description |
|------|-------------|
| `student` | Can browse, book sessions, access rooms, leave reviews |
| `teacher` | Can manage rooms, content; linked to centers |
| `center_admin` | Owns a center; manages teachers, sessions |
| `super_admin` | Full system access |

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle
- **Access Token**: 15 minutes validity
- **Refresh Token**: 7 days validity, stored in `refresh_tokens` table

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `SESSION_FULL` | 400 | Session capacity reached |
| `INSUFFICIENT_BALANCE` | 400 | Wallet balance too low |
| `DUPLICATE_BOOKING` | 400 | Already booked this session |
| `CONTENT_ACCESS_DENIED` | 403 | No room access |
| `ALREADY_ATTENDED` | 400 | QR already scanned |
| `OUTSIDE_TIME_WINDOW` | 400 | Check-in unavailable |

---

# Module 1: Auth

## 1.1 Register User

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/auth/register` |
| **Method** | POST |
| **Module** | Auth |
| **Purpose** | Create a new user account |
| **Business Use Case** | Students, teachers, or center admins sign up for the platform |
| **Auth Required** | No |
| **Middleware** | `validateRegister`, `uploadAvatar` |

### Request Body

```json
{
  "name": "string (required, 3-150 chars)",
  "email": "string (required, valid email)",
  "phone": "string (required, Egyptian format)",
  "password": "string (required, min 8 chars)",
  "role": "enum: student|teacher|center_admin (required)",
  "lat": "number (optional, latitude)",
  "lng": "number (optional, longitude)",
  "bio": "string (optional, teacher only)",
  "subjects": "array<string> (optional, teacher only)",
  "grade_levels": "array<string> (optional, teacher only)",
  "center_name": "string (required for center_admin)",
  "center_address": "string (required for center_admin)",
  "center_lat": "number (required for center_admin)",
  "center_lng": "number (required for center_admin)",
  "center_description": "string (optional, center_admin)",
  "center_phone": "string (optional, center_admin)"
}
```

### Validation Rules

- `email`: Must be unique, valid email format
- `phone`: Must be unique, Egyptian phone format (01xxxxxxxxx)
- `password`: Minimum 8 characters
- `role`: Must be one of enum values
- For `center_admin`: center_name, center_address, center_lat, center_lng are required

### Success Response (201)

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "avatar_url": "string|null",
    "is_active": true,
    "created_at": "timestamp"
  },
  "moreInfo": {
    "id": "uuid",
    "bio": "string (teacher)",
    "subjects": ["array"],
    "grade_levels": ["array"],
    "rating": 0.0,
    "total_reviews": 0
  },
  "token": "jwt_token"
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `USER_EXISTS` | User already exists |
| 400 | `VALIDATION_ERROR` | Center details required for center_admin |
| 500 | `SERVER_ERROR` | Internal server error |

### Affected Tables

- `users` (INSERT)
- `teachers` (INSERT if role=teacher)
- `centers` (INSERT if role=center_admin)

### Side Effects

- Password is hashed with bcrypt (10 rounds)
- Avatar uploaded to Cloudinary if provided
- Location stored as PostGIS geography point
- JWT token generated for immediate login

### Related Workflow

First step in user onboarding → Next: Login or use token directly

### Frontend Integration Notes

- Handle multipart/form-data for avatar upload
- Store returned token in secure storage
- Redirect based on role after registration

---

## 1.2 Login User

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/auth/login` |
| **Method** | POST |
| **Module** | Auth |
| **Purpose** | Authenticate user and get access token |
| **Business Use Case** | Returning users sign in to access the platform |
| **Auth Required** | No |
| **Middleware** | `validateLogin` |

### Request Body

```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

### Validation Rules

- `email`: Required, valid format
- `password`: Required

### Success Response (200)

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "string",
    "role": "string"
  },
  "token": "jwt_access_token"
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `INVALID_CREDENTIALS` | Invalid email or password |
| 500 | `SERVER_ERROR` | Internal server error |

### Affected Tables

- `users` (SELECT)
- `refresh_tokens` (INSERT - future)

### Side Effects

- Password compared with bcrypt
- JWT token generated with user id, email, role
- `last_login_at` can be updated

### Frontend Integration Notes

- Store token securely (httpOnly cookie or secure storage)
- Include token in all subsequent authenticated requests

---

# Module 2: Users

## 2.1 Get Current User Profile

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/users/me` |
| **Method** | GET |
| **Module** | Users |
| **Purpose** | Get authenticated user's profile |
| **Business Use Case** | Display user dashboard, profile page |
| **Auth Required** | Yes |
| **Middleware** | `verifyToken` |

### Query Params

None

### Success Response (200)

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "avatar_url": "string|null",
    "is_active": true,
    "created_at": "timestamp",
    "wallet_balance": "decimal"
  }
}
```

### Affected Tables

- `users` (SELECT)
- `wallet_transactions` (SELECT for balance calculation)

---

## 2.2 Update User Profile

| Property | Details |
|----------|---------|
| **Endpoint** | `PUT /api/v1/users/me` |
| **Method** | PUT |
| **Module** | Users |
| **Purpose** | Update user profile information |
| **Business Use Case** | User updates their name, phone, or avatar |
| **Auth Required** | Yes |
| **Middleware** | `verifyToken`, `uploadAvatar` |

### Request Body

```json
{
  "name": "string (optional)",
  "phone": "string (optional)",
  "lat": "number (optional)",
  "lng": "number (optional)"
}
```

### Affected Tables

- `users` (UPDATE)

---

# Module 3: Centers

## 3.1 Update Center Profile

| Property | Details |
|----------|---------|
| **Endpoint** | `PUT /api/v1/centers/me` |
| **Method** | PUT |
| **Module** | Centers |
| **Purpose** | Update center information |
| **Business Use Case** | Center admin updates their center details |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Request Body

```json
{
  "name": "string (required)",
  "address": "string (required)",
  "lat": "number (required)",
  "lng": "number (required)",
  "description": "string (optional)",
  "phone": "string (optional)"
}
```

### Validation Rules

- `name`, `address`, `lat`, `lng` are required
- Coordinates must be valid latitude/longitude

### Success Response (200)

```json
{
  "message": "Center profile updated successfully",
  "center": {
    "id": "uuid",
    "name": "string",
    "address": "string",
    "coordinates": "geography",
    "description": "string",
    "phone": "string"
  }
}
```

### Affected Tables

- `centers` (UPDATE)

---

## 3.2 Add Teacher to Center

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/centers/teachers` |
| **Method** | POST |
| **Module** | Centers |
| **Purpose** | Link a teacher to the center |
| **Business Use Case** | Center admin hires/associates a teacher |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Request Body

```json
{
  "teacherId": "uuid (required)"
}
```

### Validation Rules

- Teacher must exist in `teachers` table
- Teacher cannot already be linked to this center (unique constraint)

### Success Response (200)

```json
{
  "message": "Teacher added to center successfully"
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Center not found |
| 404 | `NOT_FOUND` | Teacher not found |
| 400 | `DUPLICATE` | Teacher already in center |

### Affected Tables

- `centers` (SELECT)
- `teachers` (SELECT)
- `center_teachers` (INSERT)

---

## 3.3 Remove Teacher from Center

| Property | Details |
|----------|---------|
| **Endpoint** | `DELETE /api/v1/centers/teachers` |
| **Method** | DELETE |
| **Module** | Centers |
| **Purpose** | Unlink a teacher from the center |
| **Business Use Case** | Center admin removes a teacher association |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Request Body

```json
{
  "teacherId": "uuid (required)"
}
```

### Success Response (200)

```json
{
  "message": "Teacher removed from center successfully"
}
```

### Affected Tables

- `center_teachers` (DELETE)

---

## 3.4 Get Center Teachers

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/centers/teachers` |
| **Method** | GET |
| **Module** | Centers |
| **Purpose** | List all teachers linked to the center |
| **Business Use Case** | Center admin views their teacher roster |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Success Response (200)

```json
{
  "teachers": [
    {
      "id": "uuid",
      "bio": "string",
      "subjects": ["array"],
      "grade_levels": ["array"],
      "rating": 4.5,
      "total_reviews": 10
    }
  ]
}
```

### Affected Tables

- `centers` (SELECT)
- `teachers` (SELECT via JOIN)
- `center_teachers` (JOIN)

---

# Module 4: Teachers

## 4.1 Get Teacher Details

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/teachers/:id` |
| **Method** | GET |
| **Module** | Teachers |
| **Purpose** | Get detailed teacher profile with centers |
| **Business Use Case** | View teacher profile before booking |
| **Auth Required** | No |
| **Middleware** | None |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | Teacher ID |

### Success Response (200)

```json
{
  "success": true,
  "teacher": {
    "teacher_id": "uuid",
    "teacher_name": "string",
    "avatar_url": "string",
    "subjects": ["array"],
    "grade_levels": ["array"],
    "rating": 4.5,
    "total_reviews": 10,
    "centers": [
      {
        "center_id": "uuid",
        "center_name": "string",
        "center_address": "string"
      }
    ]
  }
}
```

### Affected Tables

- `teachers` (SELECT)
- `users` (JOIN)
- `center_teachers` (JOIN)
- `centers` (JOIN)

---

## 4.2 Get Teacher Reviews

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/teachers/:id/reviews` |
| **Method** | GET |
| **Module** | Teachers |
| **Purpose** | Get all reviews for a teacher |
| **Business Use Case** | View teacher feedback before booking |
| **Auth Required** | No |
| **Middleware** | None |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | Teacher ID |

### Success Response (200)

```json
{
  "success": true,
  "reviews": [
    {
      "review_id": "uuid",
      "rating": 5,
      "comment": "string",
      "created_at": "timestamp",
      "reviewer_name": "string",
      "reviewer_avatar": "string"
    }
  ]
}
```

### Affected Tables

- `reviews` (SELECT)
- `users` (JOIN for reviewer info)

---

# Module 5: Sessions

## 5.1 Create Session

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/centers/sessions` |
| **Method** | POST |
| **Module** | Sessions |
| **Purpose** | Create a new teaching session |
| **Business Use Case** | Center admin schedules a new class |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Request Body

```json
{
  "teacherId": "uuid (required)",
  "subject": "string (required)",
  "gradeLevel": "string (required)",
  "scheduledAt": "ISO 8601 datetime (required)",
  "durationMin": "integer (optional, default: 60)",
  "capacity": "integer (optional, default: 30)",
  "price": "decimal (required)",
  "notes": "string (optional)"
}
```

### Validation Rules

- Teacher must be linked to this center via `center_teachers`
- `scheduledAt` must be in the future
- `price` must be >= 0
- `capacity` must be > 0

### Success Response (201)

```json
{
  "message": "Session created successfully",
  "session": {
    "id": "uuid",
    "subject": "string",
    "grade_level": "string",
    "scheduled_at": "timestamp",
    "duration_min": 60,
    "capacity": 30,
    "seats_booked": 0,
    "price": "100.00",
    "status": "scheduled"
  }
}
```

### Affected Tables

- `sessions` (INSERT)
- `center_teachers` (SELECT for validation)

### Side Effects

- None

---

## 5.2 Update Session

| Property | Details |
|----------|---------|
| **Endpoint** | `PUT /api/v1/centers/sessions/:id` |
| **Method** | PUT |
| **Module** | Sessions |
| **Purpose** | Update session details |
| **Business Use Case** | Modify session time, price, or capacity |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | Session ID |

### Request Body

```json
{
  "scheduledAt": "ISO 8601 datetime (optional)",
  "durationMin": "integer (optional)",
  "capacity": "integer (optional)",
  "price": "decimal (optional)",
  "notes": "string (optional)",
  "status": "session_status (optional)"
}
```

### Validation Rules

- Cannot reduce capacity below `seats_booked`
- Session must belong to admin's center

### Affected Tables

- `sessions` (UPDATE)

---

## 5.3 Cancel Session

| Property | Details |
|----------|---------|
| **Endpoint** | `PUT /api/v1/centers/sessions/:id/cancel` |
| **Method** | PUT |
| **Module** | Sessions |
| **Purpose** | Cancel a scheduled session |
| **Business Use Case** | Cancel class and refund students |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Validation Rules

- Session status must be `scheduled`
- Session must belong to admin's center

### Side Effects

- All bookings marked as `cancelled`
- Refund transactions created for students
- Notification sent to booked students

### Affected Tables

- `sessions` (UPDATE status)
- `bookings` (UPDATE status)
- `wallet_transactions` (INSERT refunds)
- `notifications` (INSERT)

---

## 5.4 Get Center Sessions

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/centers/sessions` |
| **Method** | GET |
| **Module** | Sessions |
| **Purpose** | List sessions at the center |
| **Business Use Case** | View scheduled classes |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by session status |
| `teacherId` | UUID | Filter by teacher |
| `fromDate` | date | Start date filter |
| `toDate` | date | End date filter |

### Success Response (200)

```json
{
  "sessions": [
    {
      "id": "uuid",
      "subject": "string",
      "grade_level": "string",
      "scheduled_at": "timestamp",
      "duration_min": 60,
      "capacity": 30,
      "seats_booked": 15,
      "price": "100.00",
      "status": "scheduled",
      "teacher": {
        "id": "uuid",
        "name": "string"
      }
    }
  ]
}
```

### Affected Tables

- `sessions` (SELECT)
- `teachers` (JOIN)
- `users` (JOIN)

---

# Module 6: Bookings

## 6.1 Book Session

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/bookings` |
| **Method** | POST |
| **Module** | Bookings |
| **Purpose** | Create a session booking for student |
| **Business Use Case** | Student reserves spot in a class |
| **Auth Required** | Yes (student) |
| **Middleware** | `verifyToken`, `isStudent` |

### Request Body

```json
{
  "sessionId": "uuid (required)"
}
```

### Validation Rules

- Session must exist and have `status = 'scheduled'`
- Session must have available seats (`seats_booked < capacity`)
- Student must have sufficient wallet balance
- Student cannot book same session twice

### Success Response (201)

```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "session_id": "uuid",
    "status": "confirmed",
    "qr_code": "string",
    "amount_paid": "100.00",
    "booked_at": "timestamp"
  }
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `SESSION_FULL` | No available seats |
| 400 | `INSUFFICIENT_BALANCE` | Wallet balance too low |
| 400 | `ALREADY_BOOKED` | Already booked this session |

### Affected Tables

- `sessions` (SELECT, UPDATE seats_booked via trigger)
- `bookings` (INSERT)
- `wallet_transactions` (INSERT charge)
- `users` (SELECT for balance check)

### Side Effects

- QR code generated automatically
- Wallet transaction created
- Session `seats_booked` incremented (via trigger)

---

## 6.2 Get My Bookings

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/bookings/me` |
| **Method** | GET |
| **Module** | Bookings |
| **Purpose** | Get student's booking history |
| **Business Use Case** | View upcoming and past bookings |
| **Auth Required** | Yes (student) |
| **Middleware** | `verifyToken` |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by booking status |

### Success Response (200)

```json
{
  "success": true,
  "bookings": [
    {
      "id": "uuid",
      "session": {
        "id": "uuid",
        "subject": "string",
        "scheduled_at": "timestamp",
        "center_name": "string"
      },
      "status": "confirmed",
      "qr_code": "string",
      "amount_paid": "100.00"
    }
  ]
}
```

### Affected Tables

- `bookings` (SELECT)
- `sessions` (JOIN)
- `centers` (JOIN)

---

## 6.3 Cancel Booking

| Property | Details |
|----------|---------|
| **Endpoint** | `PUT /api/v1/bookings/:id/cancel` |
| **Method** | PUT |
| **Module** | Bookings |
| **Purpose** | Cancel a booking and refund |
| **Business Use Case** | Student cancels class reservation |
| **Auth Required** | Yes (student) |
| **Middleware** | `verifyToken` |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | Booking ID |

### Validation Rules

- Booking must belong to authenticated student
- Booking status must be `pending` or `confirmed`
- Session must not have started yet

### Side Effects

- Refund transaction created
- Session `seats_booked` decremented

### Affected Tables

- `bookings` (UPDATE status)
- `sessions` (UPDATE seats_booked)
- `wallet_transactions` (INSERT refund)

---

# Module 7: Attendance

## 7.1 Record Attendance (QR Scan)

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/attendance/scan` |
| **Method** | POST |
| **Module** | Attendance |
| **Purpose** | Record student attendance via QR code |
| **Business Use Case** | Staff scans student QR at session |
| **Auth Required** | Yes (center_admin or staff) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Request Body

```json
{
  "qrCode": "string (required)"
}
```

### Validation Rules

- QR code must correspond to valid booking
- Booking status must be `confirmed`
- Session must be within valid time window
- Cannot scan same booking twice

### Success Response (200)

```json
{
  "success": true,
  "message": "Attendance recorded",
  "attendance": {
    "id": "uuid",
    "booking_id": "uuid",
    "student_name": "string",
    "session_subject": "string",
    "scanned_at": "timestamp"
  }
}
```

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 404 | `NOT_FOUND` | Booking not found |
| 400 | `ALREADY_ATTENDED` | Already marked attended |
| 400 | `SESSION_NOT_STARTED` | Session hasn't started |

### Affected Tables

- `bookings` (SELECT, UPDATE status to 'attended')
- `attendances` (INSERT)
- `sessions` (SELECT for validation)

### Side Effects

- Booking status updated to `attended`
- Student eligible to review teacher

---

## 7.2 Get Session Attendance

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/centers/sessions/:id/attendance` |
| **Method** | GET |
| **Module** | Attendance |
| **Purpose** | List attendance records for session |
| **Business Use Case** | View who attended a class |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | Session ID |

### Success Response (200)

```json
{
  "session_id": "uuid",
  "attendance": [
    {
      "student_id": "uuid",
      "student_name": "string",
      "status": "attended",
      "scanned_at": "timestamp"
    }
  ],
  "summary": {
    "total_booked": 20,
    "attended": 18,
    "no_show": 2
  }
}
```

### Affected Tables

- `bookings` (SELECT)
- `attendances` (SELECT)
- `users` (JOIN)

---

# Module 8: Rooms

## 8.1 Create Room

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/rooms` |
| **Method** | POST |
| **Module** | Rooms |
| **Purpose** | Create a digital content room |
| **Business Use Case** | Teacher creates room for course content |
| **Auth Required** | Yes (center_admin) |
| **Middleware** | `verifyToken`, `isCenterAdmin` |

### Request Body

```json
{
  "teacherId": "uuid (required)",
  "name": "string (required)",
  "description": "string (optional)",
  "gradeLevel": "string (required)",
  "subject": "string (required)"
}
```

### Success Response (201)

```json
{
  "success": true,
  "room": {
    "id": "uuid",
    "name": "string",
    "access_code": "string (auto-generated)",
    "teacher_id": "uuid",
    "is_active": true
  }
}
```

### Affected Tables

- `rooms` (INSERT)
- `teachers` (SELECT for validation)

### Side Effects

- Unique `access_code` generated

---

## 8.2 Join Room

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/rooms/join` |
| **Method** | POST |
| **Module** | Rooms |
| **Purpose** | Student joins room with access code |
| **Business Use Case** | Student enters class room code |
| **Auth Required** | Yes (student) |
| **Middleware** | `verifyToken` |

### Request Body

```json
{
  "accessCode": "string (required)"
}
```

### Validation Rules

- Access code must be valid
- Student not already a member

### Success Response (200)

```json
{
  "success": true,
  "message": "Joined room successfully",
  "room": {
    "id": "uuid",
    "name": "string",
    "access_tier": "free"
  }
}
```

### Affected Tables

- `rooms` (SELECT)
- `room_members` (INSERT)

---

## 8.3 Get My Rooms

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/rooms/me` |
| **Method** | GET |
| **Module** | Rooms |
| **Purpose** | Get rooms student has joined |
| **Business Use Case** | View enrolled courses |
| **Auth Required** | Yes (student) |
| **Middleware** | `verifyToken` |

### Success Response (200)

```json
{
  "success": true,
  "rooms": [
    {
      "id": "uuid",
      "name": "string",
      "teacher_name": "string",
      "subject": "string",
      "access_tier": "paid",
      "content_count": 15
    }
  ]
}
```

### Affected Tables

- `room_members` (SELECT)
- `rooms` (JOIN)
- `teachers` (JOIN)
- `content_items` (COUNT)

---

# Module 9: Content

## 9.1 Add Content to Room

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/rooms/:roomId/content` |
| **Method** | POST |
| **Module** | Content |
| **Purpose** | Add content item to room |
| **Business Use Case** | Teacher uploads video/PDF |
| **Auth Required** | Yes (center_admin or teacher) |
| **Middleware** | `verifyToken`, `canManageRoom` |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `roomId` | UUID | Room ID |

### Request Body

```json
{
  "type": "video|pdf|link (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "url": "string (required)",
  "isFree": "boolean (default: false)",
  "sortOrder": "integer (optional)"
}
```

### Success Response (201)

```json
{
  "success": true,
  "content": {
    "id": "uuid",
    "type": "video",
    "title": "string",
    "url": "string",
    "is_free": false
  }
}
```

### Affected Tables

- `content_items` (INSERT)
- `rooms` (UPDATE content_count via trigger)

---

## 9.2 Get Room Content

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/rooms/:roomId/content` |
| **Method** | GET |
| **Module** | Content |
| **Purpose** | List content in a room |
| **Business Use Case** | View course materials |
| **Auth Required** | Yes (room member) |
| **Middleware** | `verifyToken`, `isRoomMember` |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `roomId` | UUID | Room ID |

### Success Response (200)

```json
{
  "success": true,
  "content": [
    {
      "id": "uuid",
      "type": "video",
      "title": "string",
      "description": "string",
      "url": "string (null if paid and user is free tier)",
      "is_free": false,
      "sort_order": 1
    }
  ]
}
```

### Business Logic

- Free tier members only see `url` for `is_free: true` items
- Paid tier members see all content

### Affected Tables

- `content_items` (SELECT)
- `room_members` (SELECT for access check)

---

# Module 10: Wallet

## 10.1 Get Wallet Balance

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/wallet/balance` |
| **Method** | GET |
| **Module** | Wallet |
| **Purpose** | Get user's current wallet balance |
| **Business Use Case** | Display balance before booking |
| **Auth Required** | Yes |
| **Middleware** | `verifyToken` |

### Success Response (200)

```json
{
  "success": true,
  "balance": "500.00"
}
```

### Business Logic

Balance = SUM(deposits + refunds) - SUM(charges) from `wallet_transactions`

### Affected Tables

- `wallet_transactions` (SELECT SUM)

---

## 10.2 Get Transaction History

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/wallet/transactions` |
| **Method** | GET |
| **Module** | Wallet |
| **Purpose** | Get wallet transaction history |
| **Business Use Case** | View payment history |
| **Auth Required** | Yes |
| **Middleware** | `verifyToken` |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by transaction type |
| `limit` | integer | Number of records |
| `offset` | integer | Pagination offset |

### Success Response (200)

```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "amount": "100.00",
      "type": "booking_charge",
      "status": "completed",
      "notes": "Session booking",
      "created_at": "timestamp"
    }
  ]
}
```

### Affected Tables

- `wallet_transactions` (SELECT)

---

## 10.3 Deposit to Wallet

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/wallet/deposit` |
| **Method** | POST |
| **Module** | Wallet |
| **Purpose** | Add funds to wallet |
| **Business Use Case** | Student tops up balance |
| **Auth Required** | Yes |
| **Middleware** | `verifyToken` |

### Request Body

```json
{
  "amount": "decimal (required, min: 10)",
  "paymentMethod": "string (required)"
}
```

### Success Response (200)

```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "amount": "100.00",
    "type": "deposit",
    "status": "completed"
  },
  "new_balance": "600.00"
}
```

### Affected Tables

- `wallet_transactions` (INSERT)

---

# Module 11: Reviews

## 11.1 Submit Review

| Property | Details |
|----------|---------|
| **Endpoint** | `POST /api/v1/reviews` |
| **Method** | POST |
| **Module** | Reviews |
| **Purpose** | Submit teacher review |
| **Business Use Case** | Student rates teacher after attending |
| **Auth Required** | Yes (student) |
| **Middleware** | `verifyToken` |

### Request Body

```json
{
  "bookingId": "uuid (required)",
  "rating": "integer 1-5 (required)",
  "comment": "string (optional)"
}
```

### Validation Rules

- Booking must belong to student
- Booking status must be `attended`
- Cannot review same booking twice

### Success Response (201)

```json
{
  "success": true,
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "string",
    "created_at": "timestamp"
  }
}
```

### Affected Tables

- `reviews` (INSERT)
- `teachers` (UPDATE rating via trigger)
- `bookings` (SELECT for validation)

### Side Effects

- Teacher's `rating` and `total_reviews` updated via trigger

---

# Module 12: Discovery

## 12.1 Get Nearby Centers

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/discovery/centers/nearby` |
| **Method** | GET |
| **Module** | Discovery |
| **Purpose** | Find centers near location |
| **Business Use Case** | Student searches for nearby classes |
| **Auth Required** | No |
| **Middleware** | None |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `lat` | decimal | Latitude (required) |
| `lng` | decimal | Longitude (required) |
| `radius` | integer | Radius in meters (default: 10000) |

### Success Response (200)

```json
{
  "success": true,
  "centers": [
    {
      "id": "uuid",
      "name": "string",
      "address": "string",
      "distance_km": 2.5,
      "logo_url": "string"
    }
  ]
}
```

### Business Logic

Uses PostGIS `ST_DWithin` and `ST_Distance` for geospatial query

### Affected Tables

- `centers` (SELECT with geospatial functions)

---

## 12.2 Search Teachers

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/discovery/teachers` |
| **Method** | GET |
| **Module** | Discovery |
| **Purpose** | Search teachers with filters |
| **Business Use Case** | Find teachers by subject/location |
| **Auth Required** | No |
| **Middleware** | None |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `lat` | decimal | Latitude |
| `lng` | decimal | Longitude |
| `radius` | integer | Search radius (meters) |
| `subject` | string | Filter by subject |
| `gradeLevel` | string | Filter by grade |

### Success Response (200)

```json
{
  "success": true,
  "teachers": [
    {
      "teacher_id": "uuid",
      "teacher_name": "string",
      "subjects": ["Math", "Physics"],
      "rating": 4.8,
      "center_name": "string",
      "distance_km": 3.2,
      "next_session": "timestamp",
      "session_price": "100.00"
    }
  ]
}
```

### Business Logic

Uses `teacher_discovery` view for optimized search

### Affected Tables

- `teacher_discovery` (VIEW)

---

# Module 13: Admin (Super Admin)

## 13.1 Get All Users

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/admin/users` |
| **Method** | GET |
| **Module** | Admin |
| **Purpose** | List all platform users |
| **Business Use Case** | Admin dashboard user management |
| **Auth Required** | Yes (super_admin) |
| **Middleware** | `verifyToken`, `isSuperAdmin` |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `role` | string | Filter by role |
| `isActive` | boolean | Filter by status |
| `search` | string | Search by name/email |
| `limit` | integer | Page size |
| `offset` | integer | Pagination offset |

### Success Response (200)

```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "student",
      "is_active": true,
      "created_at": "timestamp"
    }
  ],
  "total": 500
}
```

### Affected Tables

- `users` (SELECT)

---

## 13.2 Get Platform Analytics

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/admin/analytics` |
| **Method** | GET |
| **Module** | Admin |
| **Purpose** | Get platform-wide statistics |
| **Business Use Case** | Admin dashboard overview |
| **Auth Required** | Yes (super_admin) |
| **Middleware** | `verifyToken`, `isSuperAdmin` |

### Success Response (200)

```json
{
  "success": true,
  "analytics": {
    "total_users": 5000,
    "total_centers": 150,
    "total_teachers": 300,
    "total_sessions": 2000,
    "total_bookings": 15000,
    "total_revenue": "500000.00",
    "active_users_today": 450
  }
}
```

### Affected Tables

- `users` (COUNT)
- `centers` (COUNT)
- `teachers` (COUNT)
- `sessions` (COUNT)
- `bookings` (COUNT)
- `wallet_transactions` (SUM)

---

## 13.3 Deactivate User

| Property | Details |
|----------|---------|
| **Endpoint** | `PUT /api/v1/admin/users/:id/deactivate` |
| **Method** | PUT |
| **Module** | Admin |
| **Purpose** | Deactivate a user account |
| **Business Use Case** | Ban or suspend user |
| **Auth Required** | Yes (super_admin) |
| **Middleware** | `verifyToken`, `isSuperAdmin` |

### Path Params

| Param | Type | Description |
|-------|------|-------------|
| `id` | UUID | User ID |

### Success Response (200)

```json
{
  "success": true,
  "message": "User deactivated"
}
```

### Affected Tables

- `users` (UPDATE is_active)

---

## 13.4 Get Audit Logs

| Property | Details |
|----------|---------|
| **Endpoint** | `GET /api/v1/admin/audit-logs` |
| **Method** | GET |
| **Module** | Admin |
| **Purpose** | View system audit trail |
| **Business Use Case** | Security and compliance monitoring |
| **Auth Required** | Yes (super_admin) |
| **Middleware** | `verifyToken`, `isSuperAdmin` |

### Query Params

| Param | Type | Description |
|-------|------|-------------|
| `userId` | UUID | Filter by user |
| `action` | string | Filter by action type |
| `tableName` | string | Filter by table |
| `fromDate` | date | Start date |
| `toDate` | date | End date |

### Success Response (200)

```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "UPDATE",
      "table_name": "users",
      "record_id": "uuid",
      "old_data": {},
      "new_data": {},
      "ip_address": "string",
      "created_at": "timestamp"
    }
  ]
}
```

### Affected Tables

- `audit_logs` (SELECT)

---

# Appendix A: Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 400 | `SESSION_FULL` | No available seats |
| 400 | `INSUFFICIENT_BALANCE` | Wallet balance too low |
| 400 | `DUPLICATE_BOOKING` | Already booked this session |
| 400 | `ALREADY_ATTENDED` | QR code already scanned |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |

---

# Appendix B: Authentication

## JWT Token Structure

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

## Token Payload

```json
{
  "userId": "uuid",
  "role": "student|teacher|center_admin|super_admin",
  "centerId": "uuid (for center_admin only)",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Middleware Chain

| Middleware | Purpose |
|------------|---------|
| `verifyToken` | Validates JWT, attaches user to request |
| `isStudent` | Verifies role is 'student' |
| `isCenterAdmin` | Verifies role is 'center_admin' |
| `isSuperAdmin` | Verifies role is 'super_admin' |
| `isRoomMember` | Verifies user has access to room |

---

# Appendix C: Rate Limiting

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Auth (login/register) | 5/min |
| Discovery/Search | 30/min |
| Booking operations | 10/min |
| QR Scanning | 30/min |
| Wallet operations | 5/min |
| General API | 100/min |

---

# Appendix D: Database Tables Reference

## Core Tables

| Table | Purpose |
|-------|---------|
| `users` | All platform users |
| `centers` | Education centers |
| `teachers` | Teacher profiles |
| `center_teachers` | Center-teacher associations |
| `sessions` | Scheduled classes |
| `bookings` | Student session bookings |
| `attendances` | QR scan records |
| `rooms` | Digital content rooms |
| `room_members` | Room memberships |
| `content_items` | Room content (videos/PDFs) |
| `wallet_transactions` | Financial transactions |
| `reviews` | Teacher reviews |

## Supporting Tables

| Table | Purpose |
|-------|---------|
| `refresh_tokens` | JWT refresh tokens |
| `notifications` | User notifications |
| `audit_logs` | System audit trail |

## Views

| View | Purpose |
|------|---------|
| `teacher_discovery` | Geo-search for teachers |
| `center_analytics` | Center dashboard stats |
| `student_bookings_summary` | Student booking overview |

---

# Appendix E: Endpoint Summary

| Module | Count | Description |
|--------|-------|-------------|
| Auth | 3 | Registration, login, logout |
| Users | 2 | Profile management |
| Centers | 4 | Center operations |
| Teachers | 2 | Teacher profiles |
| Sessions | 4 | Session CRUD |
| Bookings | 3 | Booking operations |
| Attendance | 2 | QR scanning |
| Rooms | 3 | Room management |
| Content | 2 | Content management |
| Wallet | 3 | Financial operations |
| Reviews | 1 | Teacher reviews |
| Discovery | 2 | Geo-search |
| Admin | 4 | Platform management |
| **Total** | **35** | Production-ready endpoints |

---

*Document Version: 2.0*
*Last Updated: 2024*
*Compatible with schema.sql v2.0*
