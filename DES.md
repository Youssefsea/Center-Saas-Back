# 🎨 Frontend Developer's Implementation Guide: Senter SaaS

> **Comprehensive Implementation Guide for Building the Senter SaaS Frontend**
> 
> This document is written for mid-level frontend developers who need to build a production-grade frontend consuming the Senter SaaS backend API.

---

## 📑 Table of Contents

1. [Frontend Architecture](#frontend-architecture)
2. [Page Map & Routes](#page-map--routes)
3. [Navigation Flow](#navigation-flow)
4. [API Integration Plan](#api-integration-plan)
5. [Component Breakdown](#component-breakdown)
6. [State Management](#state-management)
7. [Folder Structure](#folder-structure)
8. [Form Specifications](#form-specifications)
9. [UI/UX Recommendations](#uiux-recommendations)
10. [Performance Optimization](#performance-optimization)
11. [Authentication Flow](#authentication-flow)
12. [Error Handling Strategy](#error-handling-strategy)
13. [Implementation Phases](#implementation-phases)
14. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## 🏗️ Frontend Architecture

### Recommended Stack

```
Frontend Stack for Senter SaaS:

┌─────────────────────────────────────────────────┐
│          React 18+ / Next.js 14+                │  ← Core Framework
│     (TypeScript recommended)                    │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┼───────────┬────────────┐
       ▼           ▼           ▼            ▼
   ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
   │ React  │ │TanStack│ │  Zustand│ │ React    │
   │ Query  │ │ Router │ │ / Redux │ │ Context  │
   │(Data)  │ │(Routes)│ │(State)  │ │(Auth)    │
   └────────┘ └────────┘ └─────────┘ └──────────┘
       │           │           │            │
       └───────────┼───────────┴────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
   ┌────────┐ ┌────────┐ ┌──────────┐
   │Tailwind│ │ Radix UI│ │ Recharts │
   │  CSS   │ │Components│ │ (Charts) │
   └────────┘ └────────┘ └──────────┘
       │
       ▼
   ┌──────────┐
   │ Vite /   │
   │ Next.js  │
   │ (Build)  │
   └──────────┘
```

### Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                   UI LAYER                          │
│  Pages, Components, Forms, Dialogs                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│              STATE MANAGEMENT LAYER                 │
│  Zustand/Redux Store, Context Providers             │
│  • User Authentication State                        │
│  • UI State (modals, filters)                       │
│  • Temporary Form Data                              │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│              DATA FETCHING LAYER                    │
│  React Query / SWR                                  │
│  • Query Cache                                      │
│  • Mutations                                        │
│  • Background Sync                                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│              API CLIENT LAYER                       │
│  Axios / Fetch Wrapper                              │
│  • Request Interceptors                             │
│  • Response Interceptors                            │
│  • Token Injection                                  │
│  • Error Handling                                   │
└────────────────────┬────────────────────────────────┘
                     │
                Backend API
```

### Key Technologies

```javascript
// package.json dependencies for optimal setup

{
  "dependencies": {
    // Core Framework
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    
    // Routing
    "react-router-dom": "^6.20.0",
    
    // State Management
    "zustand": "^4.4.0",          // OR "redux-toolkit", "recoil"
    "@tanstack/react-query": "^5.0.0",
    
    // HTTP Client
    "axios": "^1.6.0",
    
    // UI Components
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-form": "^0.1.0",
    
    // Styling
    "tailwindcss": "^3.3.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    
    // Data Visualization
    "recharts": "^2.10.0",
    
    // Forms
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    
    // Maps (for location features)
    "react-map-gl": "^7.0.0",
    "mapbox-gl": "^2.15.0",
    
    // Utilities
    "date-fns": "^2.30.0",
    "uuid": "^9.0.0",
    "lodash-es": "^4.17.21",
    
    // Toast Notifications
    "sonner": "^1.2.0",
    
    // Loading States
    "nprogress": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

---

## 📄 Page Map & Routes

### Complete Page Inventory

```
PUBLIC ROUTES (No Authentication Required)
├── /login                    # Login page
├── /register                 # Registration page
├── /forgot-password          # Password recovery
├── /reset-password/:token    # Password reset
└── /discover                 # Public center/teacher discovery

STUDENT ROUTES (Role: student)
├── /dashboard
│   ├── /student/home         # Student dashboard/home
│   ├── /student/bookings     # My bookings
│   ├── /student/wallet       # Wallet management
│   ├── /student/rooms        # My joined rooms/classes
│   ├── /student/reviews      # My reviews
│   └── /student/profile      # My profile
│
├── /discovery
│   ├── /centers              # Browse centers (map view, list view)
│   ├── /centers/:id          # Center details page
│   ├── /teachers             # Browse teachers (search, filters)
│   ├── /teachers/:id         # Teacher profile & reviews
│   └── /sessions/:id         # Session details
│
├── /learning
│   ├── /rooms/:id            # Room details & content
│   ├── /rooms/:id/content    # Room content list
│   └── /rooms/:id/stream     # Video streaming
│
└── /settings
    └── /student/settings     # Account settings

TEACHER ROUTES (Role: teacher)
├── /dashboard
│   ├── /teacher/home         # Teacher dashboard
│   ├── /teacher/sessions     # My sessions (list, create, edit)
│   ├── /teacher/content      # My content library
│   ├── /teacher/rooms        # My rooms
│   ├── /teacher/centers      # Centers I teach at
│   ├── /teacher/reviews      # My reviews & ratings
│   ├── /teacher/analytics    # Teaching analytics/stats
│   └── /teacher/profile      # My profile
│
└── /settings
    └── /teacher/settings     # Account settings

CENTER ADMIN ROUTES (Role: center_admin)
├── /dashboard
│   ├── /admin/home           # Center admin dashboard
│   ├── /admin/teachers       # Manage teachers
│   ├── /admin/sessions       # Manage sessions
│   ├── /admin/rooms          # Manage rooms
│   ├── /admin/content        # Manage content
│   ├── /admin/attendance     # Attendance tracking
│   ├── /admin/bookings       # View bookings
│   ├── /admin/revenue        # Revenue & earnings
│   ├── /admin/analytics      # Center analytics
│   └── /admin/profile        # Center profile
│
└── /settings
    └── /admin/settings       # Center settings

SUPER ADMIN ROUTES (Role: super_admin)
├── /admin
│   ├── /super-admin/users       # User management
│   ├── /super-admin/analytics   # Platform analytics
│   ├── /super-admin/audit-logs  # Audit logs
│   └── /super-admin/settings    # Platform settings
```

### Route Protection Strategy

```typescript
// Protected Route Wrapper
<ProtectedRoute
  requiredRole="student"
  fallback={<LoginPage />}
>
  <StudentDashboard />
</ProtectedRoute>

// Available roles: 'student', 'teacher', 'center_admin', 'super_admin'
```

---

## 🗺️ Navigation Flow

### User Journey Diagrams

#### Student Journey
```
┌──────────────┐
│   Landing    │
│   Page       │
└──────┬───────┘
       │
       ├─ New User? ──→ Register ──┐
       │                            │
       └─ Existing? ──→ Login ──────┤
                                    │
                                    ▼
                            ┌──────────────────┐
                            │ Student          │
                            │ Dashboard        │
                            └────┬─────────────┘
                                 │
                    ┌────────────┬┴────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────────┐ ┌─────────┐ ┌────────────┐
            │ Discovery    │ │ Bookings│ │ My Rooms   │
            │ (Centers/    │ │ List    │ │ (Content)  │
            │  Teachers)   │ │         │ │            │
            └──────────────┘ └─────────┘ └────────────┘
                    │            │
                    │            ▼
            ┌──────────────┐ ┌─────────────────┐
            │ Center       │ │ Book Session    │
            │ Details      │ │ → Payment       │
            └──────────────┘ │ → Confirmation  │
                    │        └─────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ Teacher      │
            │ Profile      │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ Leave        │
            │ Review       │
            └──────────────┘
```

#### Teacher Journey
```
┌──────────────┐
│   Login      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Teacher Dashboard    │
└──────┬───────────────┘
       │
       ├─► Session Management
       │   ├─ Create Session
       │   ├─ Edit Session
       │   ├─ Cancel Session
       │   └─ View Bookings
       │
       ├─► Content Management
       │   ├─ Upload Content
       │   ├─ Organize Content
       │   └─ View Analytics
       │
       ├─► My Centers
       │   ├─ View Associated Centers
       │   └─ Teaching Stats
       │
       └─► Reviews & Rating
           ├─ View Student Reviews
           └─ Analytics
```

#### Center Admin Journey
```
┌──────────────┐
│   Login      │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Center Dashboard     │
└──────┬───────────────┘
       │
       ├─► Teacher Management
       │   ├─ Add Teacher
       │   ├─ Remove Teacher
       │   └─ View Teachers
       │
       ├─► Session Management
       │   ├─ Create Session
       │   ├─ Edit Session
       │   ├─ Cancel Session
       │   └─ View Attendance
       │
       ├─► Room Management
       │   ├─ Create Room
       │   ├─ Add Content
       │   ├─ Manage Members
       │   └─ Set Pricing
       │
       ├─► Attendance Tracking
       │   ├─ QR Code Scanner
       │   ├─ Record Attendance
       │   └─ Reports
       │
       └─► Revenue & Analytics
           ├─ Revenue Report
           ├─ Booking Analytics
           └─ Earnings
```

---

## 🔌 API Integration Plan

### API Client Setup

```typescript
// services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    meta?: Record<string, any>;
  };
}

class ApiClient {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request Interceptor: Add JWT token
    this.instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response Interceptor: Handle errors
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<any>>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid → redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config = {}): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data.data!;
  }

  async post<T>(url: string, data: any, config = {}): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data.data!;
  }

  async put<T>(url: string, data: any, config = {}): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data.data!;
  }

  async delete<T>(url: string, config = {}): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data.data!;
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL);
```

### React Query Setup

```typescript
// hooks/queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

// ============ STUDENT QUERIES ============

// Get nearby centers
export const useNearbyCenters = (lat: number, lng: number, radius = 10) => {
  return useQuery({
    queryKey: ['centers', 'nearby', lat, lng, radius],
    queryFn: () =>
      apiClient.get(`/discovery/centers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get bookings
export const useMyBookings = () => {
  return useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: () => apiClient.get('/bookings/me'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get wallet balance
export const useWalletBalance = () => {
  return useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => apiClient.get('/wallet/balance'),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Get transaction history
export const useTransactionHistory = () => {
  return useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: () => apiClient.get('/wallet/transactions'),
  });
};

// ============ STUDENT MUTATIONS ============

// Book session
export const useBookSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.post('/bookings', { sessionId }),
    onSuccess: () => {
      // Refetch bookings and wallet after booking
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
    },
  });
};

// Cancel booking
export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.put(`/bookings/${bookingId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
    },
  });
};

// Deposit to wallet
export const useDepositWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string }) =>
      apiClient.post('/wallet/deposit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
};

// ============ TEACHER QUERIES ============

export const useTeacherProfile = () => {
  return useQuery({
    queryKey: ['teacher', 'profile'],
    queryFn: () => apiClient.get('/teacher/me'),
  });
};

export const useTeacherStats = () => {
  return useQuery({
    queryKey: ['teacher', 'stats'],
    queryFn: () => apiClient.get('/teacher/me/stats'),
    staleTime: 5 * 60 * 1000,
  });
};

// ============ CENTER ADMIN QUERIES ============

export const useCenterProfile = () => {
  return useQuery({
    queryKey: ['center', 'profile'],
    queryFn: () => apiClient.get('/centers/me'),
  });
};

export const useCenterTeachers = () => {
  return useQuery({
    queryKey: ['center', 'teachers'],
    queryFn: () => apiClient.get('/centers/teachers'),
  });
};

export const useCenterSessions = () => {
  return useQuery({
    queryKey: ['center', 'sessions'],
    queryFn: () => apiClient.get('/centers/sessions'),
    staleTime: 2 * 60 * 1000,
  });
};

// ============ CENTER ADMIN MUTATIONS ============

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/centers/sessions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center', 'sessions'] });
    },
  });
};
```

### API Integration Matrix

| Feature | Endpoint | Method | Use | Cache |
|---------|----------|--------|-----|-------|
| **Authentication** |
| Register | POST /auth/register | POST | useRegister | 0s |
| Login | POST /auth/login | POST | useLogin | 0s |
| Get Profile | GET /users/me | GET | useUserProfile | 5m |
| **Discovery** |
| Nearby Centers | GET /discovery/centers/nearby | GET | useNearbyCenters | 5m |
| Search Centers | GET /discovery/centers/search | GET | useSearchCenters | 5m |
| Search Teachers | GET /discovery/teachers/search | GET | useSearchTeachers | 5m |
| Center Details | GET /discovery/centers/:id | GET | useCenterDetails | 10m |
| **Bookings** |
| Book Session | POST /bookings | POST | useBookSession | 0s |
| Get My Bookings | GET /bookings/me | GET | useMyBookings | 2m |
| Cancel Booking | PUT /bookings/:id/cancel | PUT | useCancelBooking | 0s |
| **Wallet** |
| Get Balance | GET /wallet/balance | GET | useWalletBalance | 1m |
| Get Transactions | GET /wallet/transactions | GET | useTransactionHistory | 2m |
| Deposit | POST /wallet/deposit | POST | useDepositWallet | 0s |
| **Rooms & Content** |
| Join Room | POST /rooms/join | POST | useJoinRoom | 0s |
| Get My Rooms | GET /rooms/me | GET | useMyRooms | 2m |
| Get Room Content | GET /rooms/:id/content | GET | useRoomContent | 5m |
| Stream Content | GET /rooms/:id/content/stream | GET | Direct URL | - |
| **Reviews** |
| Submit Review | POST /reviews | POST | useSubmitReview | 0s |
| Update Review | PUT /reviews/:id | PUT | useUpdateReview | 0s |
| **Attendance** |
| Record Attendance | POST /attendance/scan | POST | useRecordAttendance | 0s |
| Get Session Attendance | GET /centers/sessions/:id/attendance | GET | useSessionAttendance | 2m |

---

## 🧩 Component Breakdown

### Reusable Component Library

```typescript
// components/

├── Common/
│   ├── Button.tsx            # Primary, secondary, outline, danger
│   ├── Input.tsx             # Text, email, password, number
│   ├── Select.tsx            # Dropdown selection
│   ├── Checkbox.tsx          # Single checkbox
│   ├── Radio.tsx             # Radio group
│   ├── Card.tsx              # Container component
│   ├── Modal.tsx             # Dialog/modal
│   ├── Toast.tsx             # Notifications
│   ├── Badge.tsx             # Status badges
│   ├── Loading.tsx           # Spinner & skeleton
│   ├── Error.tsx             # Error message display
│   ├── Avatar.tsx            # User profile pictures
│   └── Pagination.tsx        # Page navigation
│
├── Layout/
│   ├── Header.tsx            # Top navigation
│   ├── Sidebar.tsx           # Left navigation
│   ├── Footer.tsx            # Bottom section
│   ├── Container.tsx         # Max-width wrapper
│   ├── Grid.tsx              # Responsive grid
│   └── Navigation.tsx        # Navigation logic
│
├── Forms/
│   ├── LoginForm.tsx         # Login form
│   ├── RegisterForm.tsx      # Registration form
│   ├── ProfileForm.tsx       # User profile edit
│   ├── SessionForm.tsx       # Create/edit session
│   ├── RoomForm.tsx          # Create/edit room
│   ├── ReviewForm.tsx        # Submit review
│   └── FilterForm.tsx        # Search & filter
│
├── Cards/
│   ├── SessionCard.tsx       # Session display
│   ├── CenterCard.tsx        # Center preview
│   ├── TeacherCard.tsx       # Teacher preview
│   ├── BookingCard.tsx       # Booking summary
│   ├── RoomCard.tsx          # Room preview
│   └── ReviewCard.tsx        # Review display
│
├── Lists/
│   ├── SessionList.tsx       # Multiple sessions
│   ├── BookingList.tsx       # Bookings list
│   ├── TeacherList.tsx       # Teachers list
│   ├── RoomList.tsx          # Rooms list
│   └── ReviewList.tsx        # Reviews list
│
├── Tables/
│   ├── AttendanceTable.tsx   # Attendance records
│   ├── TransactionTable.tsx  # Wallet transactions
│   ├── UserTable.tsx         # User management (admin)
│   └── RevenueTable.tsx      # Revenue breakdown
│
├── Charts/
│   ├── RevenueChart.tsx      # Revenue over time
│   ├── BookingChart.tsx      # Booking statistics
│   ├── SessionChart.tsx      # Session analytics
│   └── RatingChart.tsx       # Ratings distribution
│
├── Maps/
│   ├── CenterMap.tsx         # Show centers on map
│   ├── LocationPicker.tsx    # Pick location for profile
│   └── RadiusSearch.tsx      # Search within radius
│
├── Auth/
│   ├── ProtectedRoute.tsx    # Role-based route guard
│   ├── LoginGuard.tsx        # Redirect if already logged in
│   └── AuthProvider.tsx      # Auth context
│
└── Modals/
    ├── BookingModal.tsx      # Confirm booking
    ├── PaymentModal.tsx      # Payment dialog
    ├── ConfirmModal.tsx      # Generic confirmation
    ├── CreateSessionModal.tsx # Quick session creation
    └── AttendanceModal.tsx   # QR scanner modal
```

### Key Component Examples

#### ProtectedRoute Component
```typescript
// components/Auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  requiredRole?: 'student' | 'teacher' | 'center_admin' | 'super_admin';
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRole,
  children,
  fallback,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  if (!user) {
    return fallback || <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return fallback || <Navigate to="/" />;
  }

  return <>{children}</>;
};
```

#### BookingCard Component
```typescript
// components/Cards/BookingCard.tsx
interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
  showQRCode?: boolean;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  showQRCode,
}) => {
  const [showQR, setShowQR] = useState(false);

  return (
    <Card className="p-4 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{booking.session.subject}</h3>
          <p className="text-sm text-gray-600">{booking.center_name}</p>
          <p className="text-sm text-gray-600">{booking.teacher_name}</p>
          <p className="text-sm mt-2">
            {format(new Date(booking.session.scheduled_at), 'PPp')}
          </p>
        </div>
        <Badge variant={booking.status}>{booking.status}</Badge>
      </div>

      <div className="mt-4 flex gap-2">
        {booking.status === 'confirmed' && (
          <Button
            variant="secondary"
            onClick={() => setShowQR(!showQR)}
          >
            Show QR Code
          </Button>
        )}
        {booking.status === 'confirmed' && (
          <Button
            variant="danger"
            onClick={() => onCancel?.(booking.id)}
          >
            Cancel
          </Button>
        )}
      </div>

      {showQR && showQRCode && (
        <div className="mt-4 p-4 bg-gray-50">
          <QRCode value={booking.qr_code} />
        </div>
      )}
    </Card>
  );
};
```

#### SessionList Component
```typescript
// components/Lists/SessionList.tsx
interface SessionListProps {
  sessions: Session[];
  loading?: boolean;
  onBook?: (sessionId: string) => void;
  showFilters?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  loading,
  onBook,
  showFilters,
}) => {
  const [filters, setFilters] = useState({
    subject: '',
    gradeLevel: '',
    minPrice: 0,
    maxPrice: 1000,
  });

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filters.subject && !s.subject.includes(filters.subject)) return false;
      if (filters.gradeLevel && s.grade_level !== filters.gradeLevel)
        return false;
      if (s.price < filters.minPrice || s.price > filters.maxPrice) return false;
      return true;
    });
  }, [sessions, filters]);

  if (loading) return <Loading />;
  if (filtered.length === 0) return <Error message="No sessions found" />;

  return (
    <div>
      {showFilters && (
        <FilterForm filters={filters} onChange={setFilters} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onBook={() => onBook?.(session.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## 📊 State Management

### Zustand Store Setup

```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'center_admin' | 'super_admin';
  avatar_url?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user')!)
    : null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      set({ user: response.user, token: response.token });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      set({ error: 'Login failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', data);
      set({ user: response.user, token: response.token });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      set({ error: 'Registration failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  setToken: (token) => {
    set({ token });
    localStorage.setItem('token', token);
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const updated = await apiClient.put('/users/me', data);
      set({ user: { ...get().user!, ...updated } });
      localStorage.setItem('user', JSON.stringify(updated));
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

### Store for UI State

```typescript
// stores/uiStore.ts
interface UiStore {
  // Modals
  modals: {
    bookingModal: boolean;
    paymentModal: boolean;
    filterModal: boolean;
  };
  openModal: (modal: string) => void;
  closeModal: (modal: string) => void;

  // Filters
  filters: {
    subject: string;
    gradeLevel: string;
    radius: number;
  };
  setFilters: (filters: Partial<UiStore['filters']>) => void;

  // Loading & Errors
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;
  errors: Record<string, string>;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  modals: {
    bookingModal: false,
    paymentModal: false,
    filterModal: false,
  },
  openModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    })),
  closeModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    })),

  filters: {
    subject: '',
    gradeLevel: '',
    radius: 10,
  },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  loading: {},
  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),

  errors: {},
  setError: (key, error) =>
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    })),
  clearError: (key) =>
    set((state) => {
      const newErrors = { ...state.errors };
      delete newErrors[key];
      return { errors: newErrors };
    }),
}));
```

### What Goes Where

```
├─ Authentication State (Zustand/Redux)
│  ├─ User profile
│  ├─ JWT token
│  ├─ Login/logout status
│  └─ User permissions/role
│
├─ UI State (Zustand/Redux)
│  ├─ Modal open/close states
│  ├─ Sidebar collapsed state
│  ├─ Filters & search
│  ├─ Loading indicators
│  └─ Error messages
│
├─ Server State (React Query)
│  ├─ Bookings list
│  ├─ Sessions list
│  ├─ Centers list
│  ├─ Teacher profiles
│  ├─ Wallet balance
│  ├─ Attendance records
│  └─ Any API response data
│
├─ Form State (React Hook Form)
│  ├─ Login form
│  ├─ Registration form
│  ├─ Profile edit form
│  ├─ Session creation form
│  └─ Search filters
│
└─ Local Component State (useState)
   ├─ Input focus
   ├─ Textarea content (before submit)
   ├─ Tab selection
   ├─ Collapse/expand
   └─ Hover states
```

---

## 📂 Folder Structure

### Recommended Project Structure

```
senter-frontend/
│
├── public/
│   ├── favicon.ico
│   ├── logo.png
│   └── manifest.json
│
├── src/
│   ├── api/
│   │   ├── client.ts           # Axios instance
│   │   └── endpoints.ts        # API URL constants
│   │
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth hook
│   │   ├── useApi.ts           # Generic API hook
│   │   ├── useLocation.ts      # Geolocation hook
│   │   ├── useDebounce.ts      # Debounce hook
│   │   ├── useLocalStorage.ts  # LocalStorage hook
│   │   └── queries.ts          # React Query hooks
│   │
│   ├── stores/
│   │   ├── authStore.ts        # Zustand auth store
│   │   ├── uiStore.ts          # UI state store
│   │   └── filterStore.ts      # Search/filter store
│   │
│   ├── components/
│   │   ├── Common/
│   │   ├── Layout/
│   │   ├── Forms/
│   │   ├── Cards/
│   │   ├── Lists/
│   │   ├── Tables/
│   │   ├── Charts/
│   │   ├── Maps/
│   │   ├── Auth/
│   │   └── Modals/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   │
│   │   ├── student/
│   │   │   ├── dashboard.tsx
│   │   │   ├── bookings.tsx
│   │   │   ├── wallet.tsx
│   │   │   ├── rooms.tsx
│   │   │   └── profile.tsx
│   │   │
│   │   ├── teacher/
│   │   │   ├── dashboard.tsx
│   │   │   ├── sessions.tsx
│   │   │   ├── content.tsx
│   │   │   └── analytics.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── dashboard.tsx
│   │   │   ├── users.tsx
│   │   │   ├── analytics.tsx
│   │   │   └── settings.tsx
│   │   │
│   │   └── public/
│   │       ├── home.tsx
│   │       ├── discovery.tsx
│   │       └── center-details.tsx
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── session.ts
│   │   ├── booking.ts
│   │   ├── center.ts
│   │   ├── teacher.ts
│   │   ├── room.ts
│   │   └── api.ts
│   │
│   ├── utils/
│   │   ├── constants.ts        # App constants
│   │   ├── formatters.ts       # Format dates, prices
│   │   ├── validators.ts       # Form validators
│   │   ├── storage.ts          # LocalStorage helpers
│   │   ├── geolocation.ts      # Location helpers
│   │   └── errors.ts           # Error handling
│   │
│   ├── styles/
│   │   ├── globals.css         # Tailwind imports
│   │   ├── animations.css      # Custom animations
│   │   └── variables.css       # CSS variables
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx      # For login/register
│   │   ├── AppLayout.tsx       # Main app layout
│   │   └── AdminLayout.tsx     # Admin panel layout
│   │
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Root styles
│
├── .env.example
├── .env.local
├── .gitignore
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind config
├── postcss.config.js           # PostCSS config
├── package.json
└── README.md
```

---

## 📋 Form Specifications

### Login Form
```typescript
// pages/auth/login.tsx
interface LoginFormData {
  email: string;
  password: string;
}

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password too short'),
});

// Features:
// - Email/password input
// - Forgot password link
// - Loading state during submission
// - Error messages below fields
// - Remember me checkbox (optional)
// - Social login buttons (optional: Google, Facebook)
```

### Session Booking Form
```typescript
// components/Modals/BookingModal.tsx
interface BookingFormData {
  sessionId: string;
  quantity: number;
}

// Features:
// - Session selection dropdown
// - Quantity selector (usually 1)
// - Price display
// - Wallet balance check
// - Discount code input (optional)
// - Terms & conditions checkbox
// - Confirm button with loading state
```

### Create Session Form (Center Admin)
```typescript
interface CreateSessionFormData {
  teacherId: string;
  subject: string;
  gradeLevel: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMin: number;
  capacity: number;
  price: number;
}

// Validation:
// - All required fields present
// - Price > 0
// - Capacity > 0
// - Duration > 0
// - Scheduled date is future
// - No teacher conflicts

// Features:
// - Teacher dropdown (from center teachers)
// - Subject autocomplete
// - Grade level select
// - Date/time picker
// - Conflict checking in real-time
// - Capacity & price inputs with validation
```

### Room Creation Form
```typescript
interface CreateRoomFormData {
  teacherId: string;
  name: string;
  description?: string;
  gradeLevel: string;
  subject: string;
  paidPrice?: number;
}

// Validation:
// - Unique room name per center
// - Teacher teaches specified subject/grade
// - Price >= 0 if set

// Features:
// - Teacher selection (associated with center)
// - Room name with uniqueness check
// - Subject & grade validation against teacher
// - Optional pricing tier
```

---

## 🎨 UI/UX Recommendations

### Design System

```
COLOR PALETTE:
├─ Primary: #0066FF (blue)
├─ Secondary: #00CC88 (green)
├─ Danger: #FF3333 (red)
├─ Warning: #FFAA00 (orange)
├─ Neutral: #F5F5F5 to #333333 (grays)
└─ Success: #00AA33 (green)

TYPOGRAPHY:
├─ Headlines: Inter Bold, 28px-32px
├─ Subheads: Inter Semibold, 20px-24px
├─ Body: Inter Regular, 14px-16px
└─ Small: Inter Regular, 12px

SPACING (8px base):
├─ xs: 4px
├─ sm: 8px
├─ md: 16px
├─ lg: 24px
├─ xl: 32px
└─ 2xl: 48px

SHADOWS:
├─ sm: 0 1px 2px rgba(0,0,0,0.05)
├─ md: 0 4px 6px rgba(0,0,0,0.1)
├─ lg: 0 10px 15px rgba(0,0,0,0.1)
└─ xl: 0 20px 25px rgba(0,0,0,0.15)
```

### Dashboard Layouts

#### Student Dashboard
```
┌─────────────────────────────────────────┐
│ Header (Logo, Notifications, Profile)   │
├──────────┬──────────────────────────────┤
│ Sidebar  │                              │
│          │    Quick Stats Cards         │
│ • Home   │ ├─ Bookings                 │
│ • Book   │ ├─ Wallet Balance           │
│ • Rooms  │ ├─ Reviews                  │
│ • Wallet │ └─ Upcoming Sessions        │
│ • Reviews│                              │
│ • Logout │────────────────────────────│
│          │  My Recent Bookings         │
│          │  [Booking Cards]            │
│          │  [Booking Cards]            │
│          │                              │
│          │────────────────────────────│
│          │  Recommended Centers        │
│          │  [Center Cards]             │
│          │  [Center Cards]             │
└──────────┴──────────────────────────────┘
```

#### Teacher Dashboard
```
┌─────────────────────────────────────────┐
│ Header (Logo, Notifications, Profile)   │
├──────────┬──────────────────────────────┤
│ Sidebar  │                              │
│          │    Stats Cards              │
│ • Home   │ ├─ Total Sessions           │
│ • Session│ ├─ Upcoming Sessions        │
│ • Content│ ├─ Total Students           │
│ • Room   │ ├─ Rating                   │
│ • Center │                              │
│ • Reviews│────────────────────────────│
│ • Logout │  Charts                     │
│          │ ├─ Revenue Chart            │
│          │ ├─ Session Stats            │
│          │ └─ Rating Trends            │
│          │                              │
│          │────────────────────────────│
│          │  Upcoming Sessions          │
│          │  [Session Cards]            │
└──────────┴──────────────────────────────┘
```

#### Center Admin Dashboard
```
┌─────────────────────────────────────────┐
│ Header (Logo, Center Name, Profile)     │
├──────────┬──────────────────────────────┤
│ Sidebar  │                              │
│          │    KPI Cards               │
│ • Home   │ ├─ Total Revenue            │
│ • Teacher│ ├─ Bookings                 │
│ • Session│ ├─ Active Sessions          │
│ • Rooms  │ ├─ Attendance               │
│ • Attend │                              │
│ • Revenue│────────────────────────────│
│ • Logout │  Revenue Chart              │
│          │  [Line Chart]               │
│          │                              │
│          │────────────────────────────│
│          │  Tables (Teachers/Sessions) │
│          │  [Data Table]               │
└──────────┴──────────────────────────────┘
```

### Key Pages

#### Discovery Page (Student)
```
┌──────────────────────────────────────┐
│ [Search] [Filters] [Map/List Toggle]  │
├──────────────────────────────────────┤
│ Filters Panel                        │
│ ├─ Distance (slider)                 │
│ ├─ Subject (multi-select)            │
│ ├─ Grade Level (select)              │
│ ├─ Price Range (slider)              │
│ └─ Rating (star select)              │
├──────────────────────────────────────┤
│ Results:                             │
│                                      │
│ [Center Card] [Center Card]          │
│ [Center Card] [Center Card]          │
│ [Center Card] [Center Card]          │
│ [Pagination]                         │
└──────────────────────────────────────┘
```

#### Session Details Page
```
┌──────────────────────────────────────┐
│ [Back] Session Title              │
├──────────────────────────────────────┤
│ Left: Session Info           Right: Teacher │
│ ├─ Subject                   ├─ Profile Pic │
│ ├─ Grade Level              ├─ Name        │
│ ├─ Date & Time              ├─ Rating      │
│ ├─ Duration                 ├─ Reviews     │
│ ├─ Capacity/Booked          └─ Bio         │
│ ├─ Price                             │
│ ├─ Center Name                       │
│ └─ [Book Button]                     │
├──────────────────────────────────────┤
│ Description                          │
│ Lorem ipsum dolor sit amet...        │
└──────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Complete Auth Implementation

```typescript
// pages/auth/login.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        placeholder="Email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        type="password"
        placeholder="Password"
        error={errors.password?.message}
      />
      <Button loading={isSubmitting} type="submit">
        Login
      </Button>
    </form>
  );
};

// App.tsx - Main routing logic
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/student/*" element={<StudentRoutes />} />
              <Route path="/teacher/*" element={<TeacherRoutes />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Token Management

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const { user, token, login, logout, setToken } = useAuthStore();
  const navigate = useNavigate();

  // Validate token on app startup
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Optionally validate token with backend
    } else if (user) {
      logout();
    }
  }, []);

  // Handle token refresh
  useEffect(() => {
    if (!token) return;

    // Set up token refresh timer (before expiration)
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 6 * 24 * 60 * 60 * 1000); // Refresh every 6 days (7-day expiry)

    return () => clearInterval(refreshInterval);
  }, [token]);

  return { user, token, login, logout };
};
```

---

## ⚠️ Error Handling Strategy

### Global Error Handler

```typescript
// utils/errorHandler.ts
type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    meta?: Record<string, any>;
  };
};

export const handleApiError = (error: AxiosError<ErrorResponse>) => {
  const errorData = error.response?.data;

  switch (errorData?.error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
      break;

    case 'FORBIDDEN':
      toast.error('You do not have permission');
      break;

    case 'VALIDATION_ERROR':
      toast.error(errorData.error.message);
      break;

    case 'INSUFFICIENT_BALANCE':
      toast.error(`Need ${errorData.error.meta?.required}. Have ${errorData.error.meta?.current}`);
      break;

    case 'SESSION_FULL':
      toast.error('Session is full. Try another session');
      break;

    default:
      toast.error(errorData?.error.message || 'An error occurred');
  }
};
```

### Display Error States

```typescript
// Common error display pattern
export const DataDisplay = () => {
  const { data, error, isLoading } = useQuery(...);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} onRetry={refetch} />;
  if (!data) return <Empty message="No data found" />;

  return <div>{/* Render data */}</div>;
};
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
```
├─ Project setup (Vite, TypeScript, Tailwind)
├─ Environment configuration
├─ API client setup
├─ Auth store & login/register pages
├─ Protected route wrapper
├─ Basic layout (header, sidebar)
└─ Navigation structure
```

### Phase 2: Student Core (Week 3-4)
```
├─ Discovery pages (centers, teachers, sessions)
├─ Booking system
├─ Wallet features
├─ My bookings page
├─ Review system
├─ Room/content access
└─ Student dashboard
```

### Phase 3: Teacher Features (Week 5-6)
```
├─ Teacher dashboard
├─ Session management (CRUD)
├─ Content management
├─ Analytics/stats
├─ Reviews view
└─ Room management
```

### Phase 4: Admin Features (Week 7)
```
├─ Admin dashboard
├─ Teacher management
├─ Attendance tracking
├─ Revenue reports
├─ User management
└─ Platform analytics
```

### Phase 5: Polish & Deployment (Week 8)
```
├─ Performance optimization
├─ Error handling refinement
├─ Mobile responsiveness
├─ Testing (unit, integration)
├─ Documentation
└─ Deployment setup
```

---

## 🐛 Common Pitfalls & Solutions

### Pitfall 1: Not Validating Token Expiration
```typescript
// ❌ WRONG: Assume token is always valid
const user = JSON.parse(localStorage.getItem('user'));

// ✅ RIGHT: Handle token expiration
const token = localStorage.getItem('token');
if (!token) {
  navigate('/login');
} else {
  try {
    // Validate token with backend
    const response = await apiClient.get('/users/me');
  } catch (error) {
    if (error.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  }
}
```

### Pitfall 2: Fetching Data Without Caching
```typescript
// ❌ WRONG: Fetch on every component mount
useEffect(() => {
  fetch('/bookings/me');
}, []);

// ✅ RIGHT: Use React Query with caching
const { data: bookings } = useQuery({
  queryKey: ['bookings', 'my'],
  queryFn: () => apiClient.get('/bookings/me'),
  staleTime: 2 * 60 * 1000, // Cache for 2 minutes
});
```

### Pitfall 3: Not Handling Loading States
```typescript
// ❌ WRONG: No loading state
<button onClick={bookSession}>Book</button>

// ✅ RIGHT: Show loading indicator
<button 
  onClick={bookSession}
  disabled={isLoading}
  loading={isLoading}
>
  {isLoading ? 'Booking...' : 'Book'}
</button>
```

### Pitfall 4: Leaking Form Subscriptions
```typescript
// ❌ WRONG: Memory leaks from mounted listeners
useEffect(() => {
  priceInput.addEventListener('change', updateTotal);
  // Missing cleanup
}, []);

// ✅ RIGHT: Cleanup event listeners
useEffect(() => {
  const handleChange = () => updateTotal();
  priceInput.addEventListener('change', handleChange);
  return () => priceInput.removeEventListener('change', handleChange);
}, []);
```

### Pitfall 5: Not Invalidating Cache After Mutations
```typescript
// ❌ WRONG: Cache stays stale after booking
const bookSession = async () => {
  await apiClient.post('/bookings', data);
  // Bookings list is still stale!
};

// ✅ RIGHT: Invalidate related queries
const bookSession = useMutation({
  mutationFn: (data) => apiClient.post('/bookings', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
  },
});
```

### Pitfall 6: Not Validating Geolocation
```typescript
// ❌ WRONG: Assume user allows location
navigator.geolocation.getCurrentPosition((pos) => {
  // May never be called!
});

// ✅ RIGHT: Handle permission denial
useEffect(() => {
  if (!navigator.geolocation) {
    setLocationError('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => setLocation(pos.coords),
    (err) => {
      if (err.code === 1) {
        setLocationError('Location permission denied');
      } else {
        setLocationError('Unable to get location');
      }
    }
  );
}, []);
```

### Pitfall 7: Race Conditions in Filters
```typescript
// ❌ WRONG: Race condition when filtering quickly
const [results, setResults] = useState([]);

const search = async (query) => {
  const data = await apiClient.get(`/search?q=${query}`);
  setResults(data); // May overwrite newer request
};

// ✅ RIGHT: Cancel previous requests
const search = useMutation({
  mutationFn: async (query) => {
    return apiClient.get(`/search?q=${query}`);
  },
  onSuccess: (data) => setResults(data),
});

// Or use query with debounce
const { data: results } = useQuery({
  queryKey: ['search', debouncedQuery],
  queryFn: () => apiClient.get(`/search?q=${debouncedQuery}`),
  enabled: debouncedQuery.length > 2,
});
```

### Pitfall 8: Storing Sensitive Data in localStorage
```typescript
// ❌ WRONG: Storing password
localStorage.setItem('password', password);

// ✅ RIGHT: Only store token, never password
localStorage.setItem('token', token);
// Token should be httpOnly cookie if possible
```

---

## 📊 Performance Optimization Tips

### 1. Code Splitting
```typescript
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));

<Suspense fallback={<Loading />}>
  <StudentDashboard />
</Suspense>
```

### 2. Image Optimization
```typescript
// Use Next Image or similar
<img 
  src={imageUrl}
  alt="description"
  loading="lazy"
  width={400}
  height={400}
/>
```

### 3. Debounce Search
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => {
    searchSessions(query);
  }, 300),
  []
);
```

### 4. Virtualization for Long Lists
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={bookings.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <BookingCard booking={bookings[index]} />
    </div>
  )}
</FixedSizeList>
```

### 5. Prefetch Data
```typescript
onMouseEnter={() => {
  queryClient.prefetchQuery({
    queryKey: ['center', centerId],
    queryFn: () => fetchCenter(centerId),
  });
}}
```

---

## 📞 Architecture Decision Record

### Why React + TypeScript?
- Strong typing prevents runtime errors
- Large ecosystem and community support
- Excellent tooling and developer experience

### Why Zustand over Redux?
- Simpler boilerplate for small/medium apps
- Easier learning curve
- More flexible subscription model

### Why Tailwind CSS?
- Utility-first approach speeds up development
- Consistent design system
- Great for responsive design
- Smaller bundle than component libraries

### Why React Query?
- Automatic caching and synchronization
- Handles background updates
- Built-in loading/error states
- Great devtools

---

## 🎓 Senior Architect's Advice

### Start with Authentication
Build a rock-solid auth system first. Everything else depends on it.

### Plan Your State Structure Early
Don't mix server state with UI state. React Query ↔ Zustand separation is key.

### Test Edge Cases
- Token expiration
- Network failures
- Permission denials (location, camera)
- Concurrent requests
- Empty states

### Document Your API Integration
Create clear contracts between frontend and backend. Use OpenAPI/Swagger.

### Build Accessible
- Use semantic HTML
- Test with screen readers
- Color contrast ratios
- Keyboard navigation

### Optimize Bundle Size
- Monitor with `npm run build --analysis`
- Tree-shake unused code
- Lazy load routes and components
- Compress images

### Handle Offline
- Consider showing cached data when offline
- Queue mutations for retry
- Show "offline" indicator

### Performance Metrics
- Measure Core Web Vitals
- Use Lighthouse regularly
- Monitor real user data

---

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod Validation](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)

---

**Built with knowledge from production experience**

Last Updated: January 2024
