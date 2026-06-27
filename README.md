# 🎓 Senter SaaS - Educational Centers Management Platform

**A Production-Grade Backend for Managing Educational Centers, Teachers, Students, and Online Learning Experiences**

> A comprehensive SaaS platform designed for Egyptian educational centers to streamline operations, manage sessions, handle bookings, process payments, and deliver digital content to students.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Architecture](#architecture)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Authentication & Authorization](#authentication--authorization)
9. [Environment Variables](#environment-variables)
10. [Installation & Setup](#installation--setup)
11. [Running the Project](#running-the-project)
12. [Error Handling](#error-handling)
13. [Security Features](#security-features)
14. [Best Practices](#best-practices)
15. [Deployment](#deployment)

---

## 🎯 Overview

### Purpose

Senter SaaS is a backend platform built for **educational center management** in Egypt and similar markets. It solves the critical problem of managing educational operations at scale:

- **For Center Admins**: Manage teachers, create sessions, track attendance, manage revenue
- **For Teachers**: Create content, teach sessions, track student progress, earn revenue
- **For Students**: Discover centers, book sessions, access content, manage wallet, leave reviews
- **For Platform**: Monitor analytics, manage users, ensure security, facilitate payments

### Business Model

**Multi-Sided Marketplace Model:**
- **Revenue Streams**: Session bookings (commission), content access (paid rooms), premium features
- **Trust**: Reviews, ratings, verified teachers, attendance tracking
- **Scale**: Supports thousands of students across multiple centers
- **Retention**: Wallet system, gamification through ratings, content library

### Problem Solved

Educational centers in developing markets lack integrated solutions to:
- ✅ Manage multiple teachers and their schedules
- ✅ Handle student bookings and payments efficiently
- ✅ Track attendance and student progress
- ✅ Distribute digital content
- ✅ Manage center revenue distribution
- ✅ Build trust through reviews and ratings

### User Roles

| Role | Responsibilities | Key Features |
|------|-----------------|--------------|
| **Student** | Book sessions, learn, review teachers, manage wallet | Discovery, Bookings, Wallet, Content Access, Reviews |
| **Teacher** | Create sessions, teach, manage content, track performance | Session Creation, Content Management, Stats, Reviews |
| **Center Admin** | Manage center, teachers, sessions, attendance, revenue | Center Management, Teacher Management, Session Management, Attendance, Revenue Tracking |
| **Super Admin** | Platform management, analytics, user management, auditing | User Management, Analytics, Audit Logs, Platform Monitoring |

---

## ✨ Features

### 🔐 Authentication & User Management

- **User Registration**: Support for Student, Teacher, and Center Admin roles
- **JWT-based Authentication**: Secure token generation with 7-day expiration
- **Password Hashing**: bcrypt with salt rounds for security
- **Profile Management**: User profiles with avatar uploads to Cloudinary
- **Role-based Access Control**: Four distinct role levels with middleware protection

### 🏫 Center Management

- **Center Profiles**: Location-based centers with geographic coordinates (PostGIS)
- **Center Dashboard**: View profile, manage teachers, sessions, and revenue
- **Teacher Association**: Add/remove teachers from centers
- **Teacher Verification**: Verify teachers through attendance tracking
- **Center Analytics**: Track sessions, bookings, revenue, room activity

### 👨‍🏫 Teacher Management

- **Teacher Profiles**: Bio, subjects taught, grade levels, specialization
- **Teaching Sessions**: Create and manage educational sessions
- **Content Creation**: Upload and manage educational content (video, PDF, links)
- **Performance Metrics**: Track total sessions, students taught, ratings
- **Multi-Center Support**: Teachers can teach at multiple centers
- **Revenue Tracking**: Earn from sessions and content access

### 📚 Educational Sessions

- **Session Creation**: Create sessions with pricing, capacity, duration
- **Conflict Detection**: Prevent teacher double-booking
- **Session Scheduling**: Upcoming, ongoing, completed, cancelled statuses
- **Session Capacity Management**: Track seats, handle overbooking prevention
- **Subject & Grade Filtering**: Organize sessions by subject and grade level

### 👨‍🎓 Student Features

- **Center Discovery**: Find nearby centers using geolocation (10km default radius)
- **Teacher Search**: Search teachers by subject, grade level, name
- **Session Booking**: Book sessions with payment through wallet
- **QR Code Generation**: Unique QR codes for attendance tracking
- **Wallet System**: Deposit funds, track transactions, automatic deductions
- **Digital Content Access**: Free and paid room access with tiered pricing
- **Reviews & Ratings**: Rate teachers after attending sessions

### 💰 Wallet & Payment System

- **Wallet Balance**: Real-time balance calculation
- **Transaction Types**: Deposits, withdrawals, booking charges, refunds, transfers
- **Transaction History**: Complete audit trail with filtering
- **Payment Integration Ready**: External payment references for gateway integration
- **Automatic Distribution**: Money transfers from students to center owners
- **Refund System**: Handle cancellations with automatic refunds

### 🎓 Attendance Management

- **QR Code Scanning**: Scan student QR codes for attendance
- **Time Window Validation**: Check-in 15 minutes before session start
- **Session Duration Tracking**: Validate attendance within session time
- **Attendance Records**: Complete attendance history with timestamps
- **No-Show Detection**: Track students who don't attend
- **Session Attendance Report**: Detailed attendance per session

### 📖 Content Management

- **Teacher Content**: Teachers create content at center level
- **Content Types**: Video, PDF, Links
- **Room Content Linking**: Add teacher content to rooms
- **Access Control**: Free and paid content tiers
- **Content Streaming**: Stream video content with JWT tokens
- **Content Reordering**: Manage content display order

### 🏛️ Rooms & Learning Spaces

- **Room Creation**: Create learning spaces with unique access codes
- **Access Codes**: Randomly generated codes for room entry
- **Member Management**: Track room members and their access tier
- **Paid Rooms**: Premium access with pricing tiers
- **Room Analytics**: Content count, member count, engagement
- **Room Deactivation**: Disable rooms without deletion

### ⭐ Review & Rating System

- **Teacher Reviews**: Students can review teachers after attendance
- **Rating System**: 1-5 star ratings with comments
- **Attendance Validation**: Ensure reviews only from attendees
- **Review Updates**: Modify or delete reviews
- **Rating Aggregation**: Calculate teacher and center ratings
- **Review Visibility**: Public reviews for social proof

### 📊 Analytics & Reporting

- **Platform Analytics**: User statistics by role
- **Session Analytics**: Track scheduled, completed, cancelled sessions
- **Booking Analytics**: Revenue, booking status breakdown
- **Center Performance**: Active centers, total centers
- **Room Analytics**: Total rooms, memberships, content items
- **User Search**: Find users by name, email, phone with filters

### 🔔 Notification System

- **Booking Notifications**: Confirmation when booking sessions
- **Attendance Notifications**: Confirmation when attendance recorded
- **Missed Session Alerts**: Notify students of missed sessions
- **Session Reminders**: Ready for scheduled notifications

### 🛡️ Admin Controls

- **User Management**: View all users, filter by role/status
- **User Status Toggle**: Activate/deactivate users
- **Audit Logs**: Track platform activities
- **Platform Analytics**: Real-time platform metrics
- **Content Moderation**: Manage inappropriate content

---

## 🛠️ Tech Stack

### Backend Framework
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** (v5.2.1) - Lightweight, flexible web framework with middleware support

### Database
- **PostgreSQL** - Production-grade relational database
- **PostGIS** - Geographic data support for location-based queries
- **pg-trgm** - Trigram matching for fuzzy text search
- **pg** (v8.20.0) - Node.js PostgreSQL client

### Authentication & Security
- **JWT (jsonwebtoken v9.0.3)** - Token-based authentication
- **bcrypt** (v6.0.0) - Password hashing with salt rounds
- **Environment Variables** (dotenv v17.4.0) - Secure configuration management

### File Upload & Storage
- **Multer** (v2.1.1) - Middleware for file uploads
- **Cloudinary** (v2.9.0) - Cloud storage for images and documents
- **UUID** (v9.0.0) - Unique identifier generation for records

### Development Tools
- **CORS** - Cross-Origin Resource Sharing enabled
- **JSON Parsing** - Express body parser for JSON requests
- **URL Encoding** - Express urlencoded parser for form data

---

## 📁 Folder Structure

```
Senter-Saas-backend/
│
├── api/
│   └── start.js                 # Express app configuration and middleware setup
│
├── Clouds/
│   ├── Data.js                  # PostgreSQL connection pool setup
│   └── imgup.js                 # Cloudinary configuration for image uploads
│
├── Middelware/
│   ├── makeSure.js              # Authentication & authorization middleware
│   ├── JwtMaking.js             # JWT token generation
│   ├── upload.js                # Multer file upload configuration
│   ├── errorHandler.js          # Global error handling (ready for expansion)
│   └── contentSecCheck.js       # Content security validation
│
├── ForStudent/
│   ├── student.js               # Student discovery, profiles, teacher details
│   ├── bookings.js              # Session booking and cancellation logic
│   ├── wallet.js                # Wallet balance, transactions, deposits
│   ├── rooms.js                 # Room access, content streaming, upgrades
│   └── reviews.js               # Review submission and management
│
├── ForCenter/
│   ├── CenterAdmin.js           # Center profile, teacher management, sessions
│   ├── attendance.js            # QR scanning, attendance recording
│   ├── rooms.js                 # Room creation, management, member tracking
│   └── content.js               # Content addition, retrieval, management
│
├── ForTeacher/
│   └── teacher.js               # Teacher profile, stats, sessions, content
│
├── Auth.js                      # User registration and login
├── Admin.js                     # Super admin functions and analytics
├── router.js                    # Central route definitions with middleware guards
├── package.json                 # Project dependencies and metadata
├── schema.sql                   # PostgreSQL schema with all tables and indexes
├── vercel.json                  # Deployment configuration for Vercel
└── README.md                    # This file
```

### Folder Purposes

| Folder | Purpose | Contains |
|--------|---------|----------|
| **api/** | Express app initialization | CORS, middleware setup, route mounting |
| **Clouds/** | External service integrations | Database connection, cloud storage config |
| **Middelware/** | Request processing middleware | Auth, file upload, validation, error handling |
| **ForStudent/** | Student-facing features | Discovery, bookings, wallet, content, reviews |
| **ForCenter/** | Center admin operations | Center management, teacher management, attendance, content |
| **ForTeacher/** | Teacher operations | Teacher dashboard, sessions, content, analytics |

---

## 🏗️ Architecture

### 1. Request Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │ HTTP Request
       ▼
┌──────────────────────────────────────┐
│      Express Server (api/start.js)   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  CORS Middleware & Body Parsers      │
│  (JSON, URL-encoded, multipart)      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Router (router.js)                  │
│  Route Matching & Selection          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Route-Specific Middleware           │
│  • JWT Authentication (sureToken)    │
│  • Role Verification (isStudent...)  │
│  • File Upload (multer)              │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Controller Layer                    │
│  (ForStudent/, ForCenter/, etc.)     │
│  • Validate Input                    │
│  • Process Business Logic            │
│  • Coordinate Database Calls         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Service Layer (if needed)           │
│  • Complex calculations              │
│  • External API calls                │
│  • Cloudinary uploads                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Database Layer                      │
│  • PostgreSQL Connection Pool        │
│  • Query Execution                   │
│  • Transaction Management            │
└──────┬───────────────────────────────┘
       │
       ▼
    PostgreSQL
   (Data Store)
       │
       ▼
┌──────────────────────────────────────┐
│  Response Construction               │
│  • Format JSON Response              │
│  • Include Status Code               │
│  • Add Headers                       │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Response  │
│  Sent Back  │
│   to Client │
└─────────────┘
```

### 2. MVC Architecture

```
MODEL LAYER (Database)
├── Users Table
├── Teachers Table
├── Centers Table
├── Sessions Table
├── Bookings Table
├── Wallet Transactions
├── Rooms & Content
└── Reviews & Ratings

    ▲
    │ SQL Queries
    │

CONTROLLER LAYER (Business Logic)
├── Auth.js (registerUser, loginUser)
├── ForStudent/ (discovery, bookings)
├── ForCenter/ (admin operations)
├── ForTeacher/ (teacher operations)
└── Admin.js (platform analytics)

    ▲
    │ Route Handling
    │

VIEW LAYER (HTTP Responses)
├── JSON Responses
├── Status Codes
├── Error Messages
└── Data Serialization
```

### 3. Middleware Chain

```
Request
  │
  ├─► CORS Middleware (api/start.js)
  │   └─► Allow/Deny based on origin
  │
  ├─► Body Parser Middleware
  │   └─► Parse JSON/URL-encoded body
  │
  ├─► Router (router.js)
  │   └─► Match route and pass to handler
  │
  ├─► File Upload Middleware (multer)
  │   └─► For image uploads (optional)
  │
  ├─► Authentication Middleware (makeSure.js)
  │   ├─► sureToken - Verify JWT
  │   └─► Extract user info
  │
  ├─► Authorization Middleware
  │   ├─► isStudent - Check role = student
  │   ├─► isTeacher - Check role = teacher
  │   ├─► isCenterAdmin - Check role = center_admin
  │   └─► isSuperAdmin - Check role = super_admin
  │
  └─► Controller Handler
      └─► Execute business logic
```

### 4. Request Lifecycle

```
1. REQUEST VALIDATION
   • Check required fields
   • Validate data types
   • Validate formats (UUID, email, phone)
   • Check constraints (ratings 1-5)

2. AUTHENTICATION
   • Extract JWT from header/cookie
   • Verify token signature
   • Check expiration
   • Extract user ID, email, role

3. AUTHORIZATION
   • Check user role
   • Load role-specific IDs (teacherId, centerId)
   • Verify ownership/permission
   • Ensure user is active

4. BUSINESS LOGIC
   • Database queries
   • Calculate values
   • Update state
   • Handle errors

5. EXTERNAL SERVICES
   • Cloudinary uploads
   • Email notifications
   • Payment gateways (ready)

6. TRANSACTION MANAGEMENT
   • BEGIN transaction
   • Execute queries
   • COMMIT or ROLLBACK
   • Release connection

7. RESPONSE
   • Format JSON
   • Include status code
   • Add success/error flag
   • Return to client
```

### 5. Data Flow for Key Operations

#### A. Session Booking Flow
```
Student clicks "Book Session"
       │
       ▼
POST /bookings (student ID from JWT)
       │
       ▼
1. Fetch session (check exists, capacity, status)
2. Check student hasn't already booked
3. Verify session time (not started, not in past)
4. Calculate wallet balance
5. Check sufficient balance
6. Generate unique QR code
7. Create booking record
8. Deduct from student wallet
9. Add to center owner wallet
10. Increment session seats_booked
11. Return booking confirmation
```

#### B. Attendance Recording Flow
```
Center admin scans QR code
       │
       ▼
POST /attendance/scan (centerId from JWT)
       │
       ▼
1. Parse QR code (extract student, session IDs)
2. Fetch booking by QR code
3. Validate belongs to this center
4. Check booking status = confirmed
5. Validate time window (15 min before to end)
6. Create attendance record
7. Update booking status to attended
8. Send notification to student
9. Return attendance confirmation
```

#### C. Content Access Flow
```
Student views room content
       │
       ▼
GET /rooms/:roomId/content (student ID from JWT)
       │
       ▼
1. Check student is room member
2. Check access tier (free/paid)
3. If paid, check if upgraded
4. Fetch content items
5. Return with access details
       │
       ▼
Student clicks video/document
       │
       ▼
GET /rooms/:roomId/content/stream or /token
       │
       ▼
1. Verify student access
2. Generate signed JWT token (short-lived)
3. Return streaming URL or token
4. Frontend uses token to access Cloudinary
```

---

## 🗄️ Database Schema

### Core Tables Overview

```
USERS (Core)
  ├── Authentication & Profile
  ├── Roles: student, teacher, center_admin, super_admin
  └── Location data: geography type with GIS index

TEACHERS
  ├── Extends user profiles
  ├── Subjects & grade levels (array types)
  └── Rating & review statistics

CENTER_TEACHERS (Junction)
  ├── Links teachers to centers
  ├── Tracks active/inactive associations
  └── Join/leave timestamps

CENTERS
  ├── Educational center profiles
  ├── Owner relationship
  └── Geographic location

SESSIONS
  ├── Educational sessions
  ├── Teacher & center assignments
  ├── Scheduling & capacity management
  └── Price and status tracking

BOOKINGS
  ├── Student session reservations
  ├── QR codes for attendance
  └── Payment amount tracking

WALLET_TRANSACTIONS
  ├── Financial transactions
  ├── Types: deposit, withdrawal, booking_charge, refund, transfer
  └── Status tracking & references

ROOMS & CONTENT_ITEMS
  ├── Learning spaces
  ├── Digital content management
  └── Access control (free/paid)

REVIEWS
  ├── Teacher ratings & comments
  ├── Student feedback
  └── Rating aggregation
```

### Key Tables Details

#### USERS Table
```sql
id (UUID PK)
name (VARCHAR 150)
email (VARCHAR 255, UNIQUE)
phone (VARCHAR 20, UNIQUE)
role (ENUM: student, teacher, center_admin, super_admin)
password_hash (TEXT)
location (GEOGRAPHY with GIST index)
avatar_url (TEXT - Cloudinary URL)
is_active (BOOLEAN)
is_verified (BOOLEAN)
last_login_at (TIMESTAMPTZ)
created_at, updated_at (TIMESTAMPTZ)

INDEXES:
- idx_users_role
- idx_users_email
- idx_users_phone
- idx_users_location (GIST for geographic queries)
- idx_users_name_trgm (GIN for fuzzy search)
- idx_users_is_active
- idx_users_created_at
```

#### SESSIONS Table
```sql
id (UUID PK)
center_id (FK → centers)
teacher_id (FK → teachers)
subject (VARCHAR 100)
grade_level (VARCHAR 50)
title, description (TEXT)
scheduled_at (TIMESTAMPTZ)
duration_min (INT)
capacity (INT)
seats_booked (INT)
price (DECIMAL 10,2)
status (ENUM: scheduled, ongoing, completed, cancelled)
notes, metadata (JSONB)
created_at, updated_at (TIMESTAMPTZ)

CONSTRAINTS:
- seats_booked ≤ capacity
- capacity > 0
- duration_min > 0
- price ≥ 0

INDEXES:
- idx_sessions_center
- idx_sessions_teacher
- idx_sessions_scheduled
- idx_sessions_status
- idx_sessions_subject
- idx_sessions_grade_level
- idx_sessions_upcoming (for scheduling queries)
- idx_sessions_available (for booking)
```

#### BOOKINGS Table
```sql
id (UUID PK)
session_id (FK → sessions)
student_id (FK → users)
status (ENUM: pending, confirmed, attended, cancelled, no_show)
qr_code (TEXT, UNIQUE)
amount_paid (DECIMAL 10,2)
booked_at, attended_at, cancelled_at (TIMESTAMPTZ)

RELATIONSHIPS:
- Each booking ties student to specific session
- QR code unique for attendance scanning
- Status progression: pending → confirmed → attended OR cancelled
```

#### WALLET_TRANSACTIONS Table
```sql
id (UUID PK)
user_id (FK → users)
amount (DECIMAL 10,2)
type (ENUM: deposit, withdrawal, booking_charge, refund, transfer)
status (ENUM: pending, completed, failed, cancelled)
reference_id (UUID - booking/transaction reference)
reference_type (TEXT - booking, transfer, refund)
description (TEXT)
payment_method (TEXT)
external_ref (TEXT - payment gateway reference)
created_at, completed_at (TIMESTAMPTZ)

BUSINESS LOGIC:
- Balance = SUM(deposit + refund + transfer) - SUM(withdrawal + booking_charge)
- All calculations use completed status only
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: multipart/form-data

Parameters:
  name (string, required): User's full name
  email (string, required): Unique email address
  phone (string, required): Unique phone number
  password (string, required): User's password (hashed with bcrypt)
  role (string, required): student | teacher | center_admin
  lat (number, optional): Latitude for user location
  lng (number, optional): Longitude for user location
  avatar (file, optional): Profile picture for Cloudinary
  logo (file, optional): Center/business logo for center_admin

For Teacher Role:
  bio (string, optional): Teacher biography
  subjects (string[], optional): Subjects taught (e.g., ["Math", "Physics"])
  grade_levels (string[], optional): Grade levels (e.g., ["10th", "11th"])

For Center Admin Role:
  center_name (string, required): Center name
  center_address (string, required): Full address
  center_lat (number, required): Center latitude
  center_lng (number, required): Center longitude
  center_description (string, optional): Center description
  center_phone (string, optional): Center phone number

Response (201 Created):
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "phone": "+201012345678",
    "role": "student",
    "avatar_url": "https://cloudinary.com/...",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "moreInfo": {
    // For teacher: { id, bio, subjects, grade_levels, rating, total_reviews }
    // For center_admin: { id, name, address, description, phone, logo_url }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Errors:
  400 VALIDATION_ERROR: User already exists
  500 SERVER_ERROR: Failed to create user
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

Body:
{
  "email": "ahmed@example.com",
  "password": "SecurePass123!"
}

Response (200 OK):
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "name": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "role": "student",
    "avatar_url": "https://cloudinary.com/..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Errors:
  400 INVALID_CREDENTIALS: Invalid email or password
  500 SERVER_ERROR: Internal server error
```

#### Get User Profile
```http
GET /users/me
Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "phone": "+201012345678",
    "role": "student",
    "avatar_url": "https://cloudinary.com/...",
    "is_active": true,
    "location": { lat: 30.0444, lng: 31.2357 },
    "created_at": "2024-01-15T10:30:00Z"
  },
  "stats": {
    // For student: { total_bookings, attended_sessions, pending_bookings }
    // For teacher: { total_sessions, students_taught, rating }
    // For center_admin: { total_sessions, active_sessions, total_revenue }
  }
}

Errors:
  401 UNAUTHORIZED: No token provided or invalid
  404 NOT_FOUND: User not found
```

---

### Student Discovery Endpoints

#### Get Nearby Centers
```http
GET /discovery/centers/nearby?lat=30.0444&lng=31.2357&radius=10&page=1&limit=20
Authorization: Bearer {token}

Parameters:
  lat (number, required): User's latitude
  lng (number, required): User's longitude
  radius (number, optional): Search radius in km (default: 10)
  page (number, optional): Page number for pagination (default: 1)
  limit (number, optional): Results per page (default: 20)

Response (200 OK):
{
  "success": true,
  "centers": [
    {
      "id": "uuid",
      "name": "Math Excellence Center",
      "address": "123 Cairo Street",
      "description": "Premier math tutoring center",
      "phone": "+201012345678",
      "logo_url": "https://cloudinary.com/...",
      "is_active": true,
      "distance_km": 2.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}

Errors:
  400 VALIDATION_ERROR: Valid latitude and longitude required
```

#### Search Centers
```http
GET /discovery/centers/search?name=Math&address=Cairo&lat=30.0444&lng=31.2357&grade_level=10th&subject=Math
Authorization: Bearer {token}

Parameters:
  name (string, optional): Center name (partial match)
  address (string, optional): Center address (partial match)
  lat (number, required): Latitude
  lng (number, required): Longitude
  grade_level (string, optional): Grade level to filter
  subject (string, optional): Subject to filter

Response: Array of centers with distance_km sorted by proximity
```

#### Get Center Details
```http
GET /discovery/centers/:id
Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "center": {
    "center_id": "uuid",
    "center_name": "Math Excellence Center",
    "center_address": "123 Cairo Street",
    "center_description": "Premier math tutoring center",
    "center_phone": "+201012345678",
    "center_logo_url": "https://cloudinary.com/...",
    "teachers": [
      {
        "teacher_id": "uuid",
        "teacher_name": "Dr. Ahmed",
        "avatar_url": "https://cloudinary.com/...",
        "subjects": ["Math", "Physics"],
        "grade_levels": ["10th", "11th"],
        "rating": 4.8,
        "total_reviews": 125
      }
    ]
  }
}

Errors:
  404 NOT_FOUND: Center not found
```

---

### Student Booking Endpoints

#### Book Session
```http
POST /bookings
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "sessionId": "uuid"
}

Response (201 Created):
{
  "success": true,
  "booking": {
    "id": "uuid",
    "session_id": "uuid",
    "status": "confirmed",
    "qr_code": "studentId_sessionId_randomHash",
    "amount_paid": 250.00,
    "booked_at": "2024-01-15T10:30:00Z"
  }
}

Errors:
  400 SESSION_FULL: Session is full
  400 INSUFFICIENT_BALANCE: Insufficient wallet balance
  400 ALREADY_BOOKED: Already booked this session
  400 VALIDATION_ERROR: Session has already started
  404 NOT_FOUND: Session not found
```

#### Get My Bookings
```http
GET /bookings/me?status=confirmed
Authorization: Bearer {token}

Parameters:
  status (string, optional): Filter by status (pending, confirmed, attended, cancelled)

Response (200 OK):
{
  "success": true,
  "bookings": [
    {
      "id": "uuid",
      "status": "confirmed",
      "qr_code": "...",
      "amount_paid": 250.00,
      "booked_at": "2024-01-15T10:30:00Z",
      "session": {
        "id": "uuid",
        "subject": "Algebra",
        "grade_level": "10th",
        "scheduled_at": "2024-01-20T14:00:00Z",
        "duration_min": 60,
        "status": "scheduled"
      },
      "center_name": "Math Excellence",
      "teacher_name": "Dr. Ahmed"
    }
  ]
}
```

#### Cancel Booking
```http
PUT /bookings/:id/cancel
Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refund": {
    "amount": 250.00,
    "status": "completed"
  }
}

Errors:
  403 FORBIDDEN: Only owner can cancel
  400 VALIDATION_ERROR: Cannot cancel attended session
```

---

### Wallet Endpoints

#### Get Wallet Balance
```http
GET /wallet/balance
Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "balance": 1500.50
}
```

#### Get Transaction History
```http
GET /wallet/transactions?type=deposit&limit=50&offset=0
Authorization: Bearer {token}

Parameters:
  type (string, optional): Filter by type (deposit, withdrawal, booking_charge, refund, transfer)
  limit (number, optional): Results per page (default: 50)
  offset (number, optional): Pagination offset (default: 0)

Response (200 OK):
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "amount": 500.00,
      "type": "deposit",
      "status": "completed",
      "description": "Wallet deposit",
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:31:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### Deposit to Wallet
```http
POST /wallet/deposit
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "amount": 500.00,
  "paymentMethod": "credit_card",
  "paymentReference": "ch_1234567890"
}

Response (201 Created):
{
  "success": true,
  "message": "Deposit successful",
  "transaction": {
    "id": "uuid",
    "amount": 500.00,
    "type": "deposit",
    "status": "completed",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "new_balance": 2000.50
}

Errors:
  400 VALIDATION_ERROR: Valid amount required
```

---

### Center Admin Endpoints

#### Get Center Profile
```http
GET /centers/me
Authorization: Bearer {token}
Role: center_admin

Response (200 OK):
{
  "success": true,
  "center": {
    "id": "uuid",
    "name": "Math Excellence Center",
    "address": "123 Cairo Street",
    "description": "Premier math tutoring center",
    "phone": "+201012345678",
    "logo_url": "https://cloudinary.com/...",
    "lat": 30.0444,
    "lng": 31.2357,
    "created_at": "2024-01-01T00:00:00Z"
  }
}

Errors:
  404 NOT_FOUND: Center not found or access denied
```

#### Update Center Profile
```http
PUT /centers/me
Authorization: Bearer {token}
Role: center_admin
Content-Type: application/json

Body:
{
  "name": "Updated Center Name",
  "address": "New Address",
  "lat": 30.0500,
  "lng": 31.2400,
  "description": "Updated description",
  "phone": "+201087654321"
}

Response (200 OK):
{
  "success": true,
  "message": "Center profile updated successfully",
  "center": { /* Updated center data */ }
}

Errors:
  400 VALIDATION_ERROR: Required fields missing
  404 NOT_FOUND: Center not found
```

#### Create Session
```http
POST /centers/sessions
Authorization: Bearer {token}
Role: center_admin
Content-Type: application/json

Body:
{
  "teacherId": "uuid",
  "subject": "Algebra",
  "gradeLevel": "10th",
  "title": "Linear Equations Session",
  "description": "Advanced linear equations",
  "scheduledAt": "2024-01-20T14:00:00Z",
  "durationMin": 60,
  "capacity": 30,
  "price": 250.00
}

Response (201 Created):
{
  "success": true,
  "session": {
    "id": "uuid",
    "subject": "Algebra",
    "grade_level": "10th",
    "scheduled_at": "2024-01-20T14:00:00Z",
    "capacity": 30,
    "price": 250.00,
    "status": "scheduled"
  }
}

Errors:
  400 VALIDATION_ERROR: Required fields missing or invalid
  409 CONFLICT: Teacher already has session at this time
```

#### Record Attendance
```http
POST /attendance/scan
Authorization: Bearer {token}
Role: center_admin
Content-Type: application/json

Body:
{
  "qrCode": "studentId_sessionId_randomHash"
}

Response (200 OK):
{
  "success": true,
  "message": "Attendance recorded",
  "attendance": {
    "id": "uuid",
    "booking_id": "uuid",
    "student_name": "Ahmed Hassan",
    "session_subject": "Algebra",
    "scanned_at": "2024-01-20T14:05:00Z"
  }
}

Errors:
  400 TOO_EARLY: Check in only 15 minutes before session
  400 OUTSIDE_TIME_WINDOW: Session has already ended
  400 ALREADY_ATTENDED: Attendance already recorded
  404 NOT_FOUND: Booking not found
```

---

### Teacher Endpoints

#### Get Teacher Profile
```http
GET /teacher/me
Authorization: Bearer {token}
Role: teacher

Response (200 OK):
{
  "success": true,
  "teacher": {
    "id": "uuid",
    "name": "Dr. Ahmed",
    "email": "ahmed@example.com",
    "phone": "+201012345678",
    "avatar_url": "https://cloudinary.com/...",
    "teacher_id": "uuid",
    "bio": "Expert in mathematics with 10 years experience",
    "subjects": ["Math", "Physics"],
    "grade_levels": ["10th", "11th"],
    "rating": 4.8,
    "total_reviews": 125,
    "total_sessions": 450,
    "total_students": 1200,
    "is_verified": true
  },
  "sessions": {
    "by_status": {
      "scheduled": 15,
      "ongoing": 2,
      "completed": 450,
      "cancelled": 5
    },
    "active_sessions": 17
  }
}
```

#### Get Teacher Stats
```http
GET /teacher/me/stats
Authorization: Bearer {token}
Role: teacher

Response (200 OK):
{
  "success": true,
  "stats": {
    "total_sessions": 450,
    "completed_sessions": 435,
    "upcoming_sessions": 15,
    "total_students_taught": 1200,
    "rating": 4.8,
    "total_reviews": 125,
    "total_rooms": 8,
    "total_centers": 3
  }
}
```

---

### Admin Endpoints

#### Get All Users
```http
GET /admin/users?role=student&isActive=true&search=Ahmed&limit=50&offset=0
Authorization: Bearer {token}
Role: super_admin

Parameters:
  role (string, optional): Filter by role
  isActive (boolean, optional): Filter by active status
  search (string, optional): Search by name, email, or phone
  limit (number, optional): Results per page
  offset (number, optional): Pagination offset

Response (200 OK):
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "Ahmed Hassan",
      "email": "ahmed@example.com",
      "phone": "+201012345678",
      "role": "student",
      "avatar_url": "https://cloudinary.com/...",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1250,
  "limit": 50,
  "offset": 0
}
```

#### Get Platform Analytics
```http
GET /admin/analytics
Authorization: Bearer {token}
Role: super_admin

Response (200 OK):
{
  "success": true,
  "analytics": {
    "users_by_role": {
      "student": 1500,
      "teacher": 250,
      "center_admin": 50,
      "super_admin": 5
    },
    "centers": {
      "total": 50,
      "active": 45
    },
    "sessions": {
      "total": 5000,
      "scheduled": 500,
      "completed": 4000,
      "cancelled": 500
    },
    "bookings": {
      "total": 20000,
      "confirmed": 15000,
      "attended": 12000,
      "cancelled": 5000,
      "total_revenue": 5000000
    },
    "rooms": {
      "total_rooms": 200,
      "total_memberships": 5000,
      "total_content": 1500
    }
  }
}
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```javascript
HEADER:
{
  "alg": "HS256",
  "typ": "JWT"
}

PAYLOAD:
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "student|teacher|center_admin|super_admin",
  "iat": 1671096000,
  "exp": 1671700800  // 7 days from issue
}

SIGNATURE:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  process.env.JWT_SECRET
)
```

### Authentication Flow

```
1. User submits credentials (email, password)
   ↓
2. Backend finds user by email
   ↓
3. Compare submitted password with stored hash using bcrypt
   ↓
   ├─ Match? → Generate JWT token
   │            └─ Include user id, email, role
   │            └─ Set 7-day expiration
   └─ No match? → Return 400 INVALID_CREDENTIALS
   ↓
4. Return token in response
5. Frontend stores token (localStorage/sessionStorage)
6. Frontend includes token in Authorization header: Bearer {token}
7. Backend verifies token on each protected request
```

### Authorization Hierarchy

```
┌─ Unprotected Routes
│  ├─ POST /auth/register
│  ├─ POST /auth/login
│  ├─ GET /discovery/* (public search)
│  └─ GET /teachers/:id (public profiles)
│
├─ Student Only Routes (isStudent)
│  ├─ POST /bookings
│  ├─ POST /rooms/join
│  ├─ POST /reviews
│  └─ GET /wallet/*
│
├─ Teacher Only Routes (isTeacher)
│  ├─ GET /teacher/me
│  ├─ GET /teacher/me/sessions
│  ├─ POST /teacher/me/content
│  └─ GET /teacher/me/reviews
│
├─ Center Admin Only Routes (isCenterAdmin)
│  ├─ POST /centers/sessions
│  ├─ POST /attendance/scan
│  ├─ POST /rooms
│  └─ GET /centers/me
│
└─ Super Admin Only Routes (isSuperAdmin)
   ├─ GET /admin/users
   ├─ GET /admin/analytics
   └─ PUT /admin/users/:id/status
```

### Password Hashing

```javascript
// Registration
password = "MyPassword123"
salt = bcrypt.genSalt(10)  // Generate random salt
hash = bcrypt.hash(password, salt)  // Hash password with salt
stored_password_hash = hash

// Login
submitted_password = "MyPassword123"
is_match = bcrypt.compare(submitted_password, stored_password_hash)
// Returns true if password matches
```

---

## ⚙️ Environment Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/senter` | ✅ Yes |
| `JWT_SECRET` | Secret key for JWT signing | `your-super-secret-key-min-32-chars` | ✅ Yes |
| `CLOUDINARY_NAME` | Cloudinary account name | `dx1234567` | ✅ Yes |
| `CLOUDINARY_KEY` | Cloudinary API key | `123456789012345` | ✅ Yes |
| `CLOUDINARY_SECRET` | Cloudinary API secret | `abcdefghijklmnopqrstuvwxyz` | ✅ Yes |
| `PORT` | Server port | `3000` | ❌ No (default: 3000) |
| `NODE_ENV` | Environment | `development` / `production` | ❌ No |

### .env Example
```env
DATABASE_URL=postgresql://user:password@localhost:5432/senter_saas_db
JWT_SECRET=your-super-secure-secret-key-minimum-32-characters-long
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET=your_cloudinary_api_secret
PORT=3000
NODE_ENV=development
```

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v13+)
- npm or yarn
- Cloudinary account (for image uploads)

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/Senter-Saas-backend.git
cd Senter-Saas-backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### Step 4: Set Up Database

#### Create PostgreSQL Database
```bash
createdb senter_saas_db
```

#### Run Schema
```bash
psql senter_saas_db < schema.sql
```

This will:
- Create all extensions (uuid-ossp, postgis, pg_trgm)
- Create all ENUM types
- Create all tables with proper indexes
- Set up foreign keys and constraints

### Step 5: Verify Configuration
```bash
npm run test:connection
# Should print: "connection ok [timestamp]"
```

---

## 🚀 Running the Project

### Development Mode
```bash
# Watch mode with nodemon (if installed)
npm run dev

# Or standard Node
node api/start.js

# Server will start on http://localhost:3000
```

### Production Mode
```bash
NODE_ENV=production npm start
```

### Vercel Deployment
```bash
# vercel.json is pre-configured
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## ❌ Error Handling

### Global Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "meta": {}  // Optional additional info
  }
}
```

### Error Codes & Status Codes

| HTTP | Code | Meaning | Example |
|------|------|---------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input data | Missing required field |
| 400 | `INVALID_CREDENTIALS` | Wrong email/password | Login failed |
| 400 | `INSUFFICIENT_BALANCE` | Not enough wallet balance | Booking cost > balance |
| 400 | `SESSION_FULL` | No seats available | Session at capacity |
| 400 | `ALREADY_BOOKED` | Student already booked session | Duplicate booking |
| 400 | `ALREADY_IN_ROOM` | Content already added to room | Duplicate content |
| 400 | `ALREADY_ATTENDED` | Attendance already recorded | Double attendance |
| 400 | `TOO_EARLY` | Check-in window not open | Before 15 min mark |
| 400 | `OUTSIDE_TIME_WINDOW` | Session ended | After session end |
| 401 | `UNAUTHORIZED` | No valid token | Missing/invalid JWT |
| 403 | `FORBIDDEN` | Insufficient permissions | Wrong role for endpoint |
| 404 | `NOT_FOUND` | Resource doesn't exist | User/Session not found |
| 409 | `CONFLICT` | Constraint violation | Teacher double-booked |
| 500 | `SERVER_ERROR` | Internal server error | Database connection failed |

### Example Error Responses

```javascript
// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Valid latitude and longitude are required"
  }
}

// Insufficient Balance
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient wallet balance",
    "required": 250.00,
    "current": 150.00
  }
}

// Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## 🛡️ Security Features

### 1. Password Security
- **bcrypt Hashing**: Salt rounds = 10
- **Never stored in plain text**: Only hash stored in DB
- **Never returned in responses**: Password hash never sent to client
- **Timing attack resistance**: bcrypt constant-time comparison

### 2. JWT Security
- **Secret key protection**: Stored in environment variables
- **7-day expiration**: Limits token window of compromise
- **Signature verification**: HS256 algorithm
- **Token validation**: Checked on every protected route

### 3. Database Security
- **Connection pooling**: Prevents connection exhaustion
- **SSL support**: PostgreSQL SSL connection option
- **Parameter binding**: Prevents SQL injection
- **Transaction management**: ACID compliance
- **Foreign key constraints**: Referential integrity

### 4. API Security
- **CORS enabled**: Whitelisted origins (localhost:3000, localhost:3005)
- **Rate limiting**: Ready for implementation
- **Input validation**: All inputs validated
- **Role-based access**: Endpoint-level authorization
- **Ownership verification**: Users can only modify own data

### 5. File Upload Security
- **Cloudinary integration**: Secure cloud storage
- **File type validation**: Check MIME types
- **File size limits**: Multer maxSize configuration
- **Public ID hashing**: Cloudinary overwrite protection

### 6. Data Protection
- **Location data encryption**: PostGIS geography type
- **Sensitive data filtering**: Never expose passwords or internal IDs
- **Transaction isolation**: Prevents race conditions
- **Audit capability**: Timestamps on all records

---

## ✅ Best Practices

### 1. Error Response Standardization
All endpoints follow a consistent error response shape:
```javascript
res.json({
  success: false,
  error: { code, message, ...meta }
})
```

### 2. Middleware Layering
Clear separation of concerns:
- Parsing middleware → Authentication → Authorization → Business Logic

### 3. Database Transactions
Critical operations use transactions:
```javascript
await client.query('BEGIN');
try {
  // Multiple queries
  await client.query('COMMIT');
} catch {
  await client.query('ROLLBACK');
}
```

### 4. Query Optimization
- Indexes on frequently queried columns
- JOIN optimization with DISTINCT when needed
- Aggregation functions in database
- Pagination to prevent large result sets

### 5. Asynchronous Patterns
- Proper async/await usage
- Error handling in async operations
- Promise.all() for parallel queries
- Connection release in finally blocks

### 6. Validation Layers
- Input validation before database queries
- Type checking (UUID format, number ranges)
- Business rule validation (capacity checks, time windows)
- Constraint validation (unique emails, ratings 1-5)

### 7. Clean Code
- Consistent naming conventions (camelCase for JS, snake_case for DB)
- Reusable error handler function
- Proper error logging with context
- Code comments for complex logic

---

## 📈 Deployment

### Vercel Deployment
```bash
# Pre-configured in vercel.json
npm install -g vercel
vercel
```

### Heroku Deployment
```bash
git push heroku main
heroku config:set DATABASE_URL=postgresql://...
heroku config:set JWT_SECRET=...
```

### Docker Deployment
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup
Before deploying, ensure all environment variables are set in the hosting platform's configuration.

---

## 🔄 Future Improvements

1. **Rate Limiting**: Implement rate limiting middleware to prevent abuse
2. **Email Notifications**: Send email confirmations for bookings, attendance
3. **Payment Gateway Integration**: Stripe/Paymob for real payment processing
4. **Push Notifications**: Real-time notifications for bookings and attendance
5. **Advanced Analytics**: Charts, reports, revenue dashboards
6. **Search Optimization**: Elasticsearch for advanced search
7. **Caching Layer**: Redis for frequently accessed data
8. **API Versioning**: v2 endpoints with backward compatibility
9. **Logging System**: Winston/Morgan for structured logging
10. **API Documentation**: Swagger/OpenAPI with interactive UI

---

## 📞 Support & Contact

For issues, questions, or contributions:
- GitHub Issues: [Create an issue]
- Email: support@senter.com
- Documentation: [Full API docs]

---

## 📄 License

This project is licensed under the ISC License.

---

**Built with ❤️ for Egyptian Education**

Last Updated: January 2024
