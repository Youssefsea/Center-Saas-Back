-- ============================================================
-- EdTech Platform - Improved PostgreSQL Schema v2.0
-- Production-Ready with Enhanced Indexing, Analytics & Auditability
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================
-- ENUM Types
-- ============================================================

-- User roles in the system
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'center_admin', 'super_admin');

-- Booking lifecycle statuses
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'attended', 'cancelled', 'no_show');

-- Session lifecycle statuses
CREATE TYPE session_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

-- Content types for room materials
CREATE TYPE content_type AS ENUM ('video', 'pdf', 'link');

-- Access tier for room members
CREATE TYPE access_tier AS ENUM ('free', 'paid');

-- Wallet transaction types
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'booking_charge', 'refund', 'transfer');

-- Transaction statuses
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Notification types
CREATE TYPE notification_type AS ENUM (
    'booking_confirmed', 
    'booking_cancelled', 
    'session_reminder', 
    'session_cancelled',
    'payment_received',
    'refund_processed',
    'review_received',
    'room_access_granted'
);

-- ============================================================
-- USERS TABLE
-- Core table for all system users
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20) UNIQUE NOT NULL,
    role            user_role NOT NULL DEFAULT 'student',
    password_hash   TEXT NOT NULL,
    location        GEOGRAPHY(POINT, 4326),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_name_trgm ON users USING GIN(name gin_trgm_ops);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================
-- CENTERS TABLE
-- Educational centers/academies
-- ============================================================

CREATE TABLE centers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name            VARCHAR(200) NOT NULL,
    address         TEXT NOT NULL,
    coordinates     GEOGRAPHY(POINT, 4326) NOT NULL,
    description     TEXT,
    phone           VARCHAR(20),
    logo_url        TEXT,
    cover_image_url TEXT,
    rating          DECIMAL(2,1) DEFAULT 0.0,
    total_reviews   INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for centers
CREATE INDEX idx_centers_coordinates ON centers USING GIST(coordinates);
CREATE INDEX idx_centers_owner ON centers(owner_id);
CREATE INDEX idx_centers_is_active ON centers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_centers_name_trgm ON centers USING GIN(name gin_trgm_ops);
CREATE INDEX idx_centers_rating ON centers(rating DESC);
CREATE INDEX idx_centers_created_at ON centers(created_at DESC);

-- ============================================================
-- TEACHERS TABLE
-- Teacher profiles linked to users
-- ============================================================

CREATE TABLE teachers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio             TEXT,
    subjects        TEXT[] DEFAULT '{}',
    grade_levels    TEXT[] DEFAULT '{}',
    rating          DECIMAL(2,1) DEFAULT 0.0,
    total_reviews   INT DEFAULT 0,
    total_sessions  INT DEFAULT 0,
    total_students  INT DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teachers
CREATE INDEX idx_teachers_user ON teachers(user_id);
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects);
CREATE INDEX idx_teachers_grade_levels ON teachers USING GIN(grade_levels);
CREATE INDEX idx_teachers_rating ON teachers(rating DESC);
CREATE INDEX idx_teachers_is_verified ON teachers(is_verified) WHERE is_verified = TRUE;

-- ============================================================
-- CENTER_TEACHERS TABLE
-- Junction table linking teachers to centers
-- ============================================================

CREATE TABLE center_teachers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id       UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    is_active       BOOLEAN DEFAULT TRUE,
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    UNIQUE(center_id, teacher_id)
);

-- Indexes for center_teachers
CREATE INDEX idx_ct_center ON center_teachers(center_id);
CREATE INDEX idx_ct_teacher ON center_teachers(teacher_id);
CREATE INDEX idx_ct_is_active ON center_teachers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ct_joined_at ON center_teachers(joined_at DESC);

-- ============================================================
-- SESSIONS TABLE
-- Educational sessions at centers
-- ============================================================

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id       UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    subject         VARCHAR(100) NOT NULL,
    grade_level     VARCHAR(50) NOT NULL,
    title           VARCHAR(255),
    description     TEXT,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_min    INT NOT NULL DEFAULT 60,
    capacity        INT NOT NULL DEFAULT 30,
    seats_booked    INT NOT NULL DEFAULT 0,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status          session_status DEFAULT 'scheduled',
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_capacity CHECK (seats_booked <= capacity),
    CONSTRAINT chk_positive_capacity CHECK (capacity > 0),
    CONSTRAINT chk_positive_duration CHECK (duration_min > 0),
    CONSTRAINT chk_positive_price CHECK (price >= 0)
);

-- Indexes for sessions
CREATE INDEX idx_sessions_center ON sessions(center_id);
CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_subject ON sessions(subject);
CREATE INDEX idx_sessions_grade_level ON sessions(grade_level);
CREATE INDEX idx_sessions_center_grade_scheduled ON sessions(center_id, grade_level, scheduled_at);
CREATE INDEX idx_sessions_upcoming ON sessions(scheduled_at, status) WHERE status = 'scheduled';
CREATE INDEX idx_sessions_available ON sessions(center_id, scheduled_at) WHERE status = 'scheduled' AND seats_booked < capacity;

-- ============================================================
-- BOOKINGS TABLE
-- Student session bookings
-- ============================================================

CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status          booking_status DEFAULT 'pending',
    qr_code         TEXT UNIQUE NOT NULL,
    amount_paid     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    booked_at       TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- Indexes for bookings
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_qr ON bookings(qr_code);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booked_at ON bookings(booked_at DESC);
CREATE INDEX idx_bookings_student_status ON bookings(student_id, status);

-- ============================================================
-- ATTENDANCES TABLE
-- Attendance records for bookings
-- ============================================================

CREATE TABLE attendances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    scanned_by      UUID NOT NULL REFERENCES users(id),
    notes           TEXT
);

-- Indexes for attendances
CREATE INDEX idx_attendances_booking ON attendances(booking_id);
CREATE INDEX idx_attendances_scanned_by ON attendances(scanned_by);
CREATE INDEX idx_attendances_scanned_at ON attendances(scanned_at DESC);

-- ============================================================
-- ROOMS TABLE
-- Virtual rooms for teachers to share content
-- ============================================================

CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id       UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    grade_level     VARCHAR(50) NOT NULL,
    subject         VARCHAR(100) NOT NULL,
    access_code     VARCHAR(20) UNIQUE NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    member_count    INT DEFAULT 0,
    content_count   INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rooms
CREATE INDEX idx_rooms_center ON rooms(center_id);
CREATE INDEX idx_rooms_teacher ON rooms(teacher_id);
CREATE INDEX idx_rooms_code ON rooms(access_code);
CREATE INDEX idx_rooms_is_active ON rooms(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_rooms_subject_grade ON rooms(subject, grade_level);

-- ============================================================
-- ROOM_MEMBERS TABLE
-- Students with access to rooms
-- ============================================================

CREATE TABLE room_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_tier     access_tier NOT NULL DEFAULT 'free',
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(room_id, student_id)
);

-- Indexes for room_members
CREATE INDEX idx_rm_room ON room_members(room_id);
CREATE INDEX idx_rm_student ON room_members(student_id);
CREATE INDEX idx_rm_access_tier ON room_members(access_tier);
CREATE INDEX idx_rm_is_active ON room_members(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_rm_expires_at ON room_members(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- CONTENT_ITEMS TABLE
-- Content in virtual rooms
-- ============================================================

CREATE TABLE content_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    type            content_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    url             TEXT NOT NULL,
    thumbnail_url   TEXT,
    is_free         BOOLEAN DEFAULT FALSE,
    sort_order      INT DEFAULT 0,
    duration_seconds INT,
    view_count      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for content_items
CREATE INDEX idx_content_room ON content_items(room_id);
CREATE INDEX idx_content_free ON content_items(is_free);
CREATE INDEX idx_content_type ON content_items(type);
CREATE INDEX idx_content_sort ON content_items(room_id, sort_order);

-- ============================================================
-- WALLET_TRANSACTIONS TABLE
-- Financial transactions (wallet balance is computed from sum)
-- ============================================================

CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount          DECIMAL(10,2) NOT NULL,
    type            transaction_type NOT NULL,
    status          transaction_status DEFAULT 'pending',
    reference_id    UUID,
    reference_type  VARCHAR(50),
    description     TEXT,
    payment_method  VARCHAR(50),
    external_ref    VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Indexes for wallet_transactions
CREATE INDEX idx_wallet_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_user_status ON wallet_transactions(user_id, status);
CREATE INDEX idx_wallet_reference ON wallet_transactions(reference_id) WHERE reference_id IS NOT NULL;

-- ============================================================
-- REVIEWS TABLE
-- Reviews for teachers (linked to bookings for verification)
-- ============================================================

CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id),
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    is_visible      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, student_id, booking_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_teacher ON reviews(teacher_id);
CREATE INDEX idx_reviews_student ON reviews(student_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_visible ON reviews(teacher_id, is_visible) WHERE is_visible = TRUE;

-- ============================================================
-- NOTIFICATIONS TABLE
-- User notifications for various events
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    data            JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================
-- AUDIT_LOGS TABLE
-- Audit trail for important actions
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- REFRESH_TOKENS TABLE
-- JWT refresh tokens for authentication
-- ============================================================

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    device_info     TEXT,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    is_revoked      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refresh_tokens
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_active ON refresh_tokens(user_id, is_revoked) WHERE is_revoked = FALSE;

-- ============================================================
-- FUNCTION: Update teacher rating after review
-- ============================================================

CREATE OR REPLACE FUNCTION update_teacher_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE teachers
    SET
        rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
            FROM reviews
            WHERE teacher_id = NEW.teacher_id AND is_visible = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE teacher_id = NEW.teacher_id AND is_visible = TRUE
        ),
        updated_at = NOW()
    WHERE id = NEW.teacher_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_teacher_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_teacher_rating();

-- ============================================================
-- FUNCTION: Check and increment seats on booking
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_increment_seats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sessions
    SET seats_booked = seats_booked + 1
    WHERE id = NEW.session_id
      AND seats_booked < capacity
      AND status = 'scheduled';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session is full or not available for booking';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_seats
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION check_and_increment_seats();

-- ============================================================
-- FUNCTION: Decrement seats on booking cancellation
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_seats_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE sessions
        SET seats_booked = GREATEST(seats_booked - 1, 0)
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_seats
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION decrement_seats_on_cancel();

-- ============================================================
-- FUNCTION: Update room member count
-- ============================================================

CREATE OR REPLACE FUNCTION update_room_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE rooms SET member_count = member_count + 1, updated_at = NOW() WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE rooms SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW() WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_room_member_count
AFTER INSERT OR DELETE ON room_members
FOR EACH ROW EXECUTE FUNCTION update_room_member_count();

-- ============================================================
-- FUNCTION: Update room content count
-- ============================================================

CREATE OR REPLACE FUNCTION update_room_content_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE rooms SET content_count = content_count + 1, updated_at = NOW() WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE rooms SET content_count = GREATEST(content_count - 1, 0), updated_at = NOW() WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_room_content_count
AFTER INSERT OR DELETE ON content_items
FOR EACH ROW EXECUTE FUNCTION update_room_content_count();

-- ============================================================
-- FUNCTION: Update teacher statistics after session
-- ============================================================

CREATE OR REPLACE FUNCTION update_teacher_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE teachers 
        SET total_sessions = total_sessions + 1, updated_at = NOW() 
        WHERE id = NEW.teacher_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE teachers 
        SET total_sessions = GREATEST(total_sessions - 1, 0), updated_at = NOW() 
        WHERE id = OLD.teacher_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_teacher_session_stats
AFTER INSERT OR DELETE ON sessions
FOR EACH ROW EXECUTE FUNCTION update_teacher_session_stats();

-- ============================================================
-- FUNCTION: Auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_centers_updated_at BEFORE UPDATE ON centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_content_items_updated_at BEFORE UPDATE ON content_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: Calculate wallet balance (helper function)
-- ============================================================

CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    balance DECIMAL(10,2);
BEGIN
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN type IN ('deposit', 'refund') AND status = 'completed' THEN amount
                WHEN type IN ('withdrawal', 'booking_charge') AND status = 'completed' THEN -amount
                ELSE 0
            END
        ), 0
    ) INTO balance
    FROM wallet_transactions
    WHERE user_id = p_user_id;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VIEW: Teacher Discovery
-- Geospatial search for teachers with upcoming sessions
-- ============================================================

CREATE OR REPLACE VIEW teacher_discovery AS
SELECT
    t.id AS teacher_id,
    u.id AS user_id,
    u.name AS teacher_name,
    u.avatar_url,
    t.bio,
    t.subjects,
    t.grade_levels,
    t.rating,
    t.total_reviews,
    t.total_sessions,
    t.is_verified AS teacher_verified,
    c.id AS center_id,
    c.name AS center_name,
    c.address AS center_address,
    c.coordinates,
    c.phone AS center_phone,
    c.logo_url AS center_logo_url,
    c.rating AS center_rating,
    s.id AS session_id,
    s.scheduled_at AS next_session,
    s.price AS session_price,
    s.subject AS session_subject,
    s.grade_level AS session_grade_level,
    s.title AS session_title,
    s.duration_min,
    (s.capacity - s.seats_booked) AS available_seats
FROM teachers t
JOIN users u ON u.id = t.user_id AND u.is_active = TRUE
JOIN center_teachers ct ON ct.teacher_id = t.id AND ct.is_active = TRUE
JOIN centers c ON c.id = ct.center_id AND c.is_active = TRUE
LEFT JOIN LATERAL (
    SELECT s.*
    FROM sessions s
    WHERE s.teacher_id = t.id
      AND s.center_id = c.id
      AND s.status = 'scheduled'
      AND s.scheduled_at > NOW()
      AND s.seats_booked < s.capacity
    ORDER BY s.scheduled_at ASC
    LIMIT 1
) s ON TRUE;

-- ============================================================
-- VIEW: Center Analytics
-- Aggregate metrics for center dashboard
-- ============================================================

CREATE OR REPLACE VIEW center_analytics AS
SELECT
    c.id AS center_id,
    c.name AS center_name,
    COUNT(DISTINCT ct.teacher_id) FILTER (WHERE ct.is_active = TRUE) AS active_teachers,
    COUNT(DISTINCT s.id) AS total_sessions,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT b.student_id) AS unique_students,
    COUNT(DISTINCT a.id) AS total_attendances,
    COALESCE(SUM(b.amount_paid) FILTER (WHERE b.status IN ('confirmed', 'attended')), 0) AS total_revenue,
    COALESCE(ROUND(
        COUNT(DISTINCT a.id)::numeric / NULLIF(COUNT(DISTINCT b.id) FILTER (WHERE b.status != 'cancelled'), 0) * 100, 
        1
    ), 0) AS attendance_rate
FROM centers c
LEFT JOIN center_teachers ct ON ct.center_id = c.id
LEFT JOIN sessions s ON s.center_id = c.id
LEFT JOIN bookings b ON b.session_id = s.id
LEFT JOIN attendances a ON a.booking_id = b.id
GROUP BY c.id, c.name;

-- ============================================================
-- VIEW: Student Bookings Summary
-- Easy lookup for student's booking history
-- ============================================================

CREATE OR REPLACE VIEW student_bookings_summary AS
SELECT
    b.id AS booking_id,
    b.student_id,
    b.status AS booking_status,
    b.qr_code,
    b.amount_paid,
    b.booked_at,
    s.id AS session_id,
    s.subject,
    s.grade_level,
    s.title AS session_title,
    s.scheduled_at,
    s.duration_min,
    s.status AS session_status,
    t.id AS teacher_id,
    u.name AS teacher_name,
    u.avatar_url AS teacher_avatar,
    t.rating AS teacher_rating,
    c.id AS center_id,
    c.name AS center_name,
    c.address AS center_address,
    c.coordinates AS center_coordinates,
    CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS attended,
    a.scanned_at AS attended_at
FROM bookings b
JOIN sessions s ON s.id = b.session_id
JOIN teachers t ON t.id = s.teacher_id
JOIN users u ON u.id = t.user_id
JOIN centers c ON c.id = s.center_id
LEFT JOIN attendances a ON a.booking_id = b.id;

-- ============================================================
-- INDEXES FOR ANALYTICS QUERIES
-- ============================================================

CREATE INDEX idx_sessions_scheduled_month 
ON sessions(DATE_TRUNC('month', scheduled_at AT TIME ZONE 'UTC'));

CREATE INDEX idx_bookings_booked_month 
ON bookings(DATE_TRUNC('month', booked_at AT TIME ZONE 'UTC'));

CREATE INDEX idx_wallet_created_month 
ON wallet_transactions(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'));
-- Composite indexes for common join patterns
CREATE INDEX idx_sessions_center_teacher ON sessions(center_id, teacher_id);
CREATE INDEX idx_bookings_session_status ON bookings(session_id, status);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE users IS 'All system users including students, teachers, center admins, and super admins';
COMMENT ON TABLE centers IS 'Educational centers/academies with location data';
COMMENT ON TABLE teachers IS 'Teacher profiles with subjects, ratings, and stats';
COMMENT ON TABLE center_teachers IS 'Many-to-many relationship between centers and teachers';
COMMENT ON TABLE sessions IS 'Scheduled educational sessions at centers';
COMMENT ON TABLE bookings IS 'Student bookings for sessions with QR code for attendance';
COMMENT ON TABLE attendances IS 'Attendance records when QR codes are scanned';
COMMENT ON TABLE rooms IS 'Virtual rooms for content sharing by teachers';
COMMENT ON TABLE room_members IS 'Students with access to virtual rooms';
COMMENT ON TABLE content_items IS 'Educational content (videos, PDFs, links) in rooms';
COMMENT ON TABLE wallet_transactions IS 'Financial transactions for wallet (balance computed from sum)';
COMMENT ON TABLE reviews IS 'Student reviews for teachers, linked to verified bookings';
COMMENT ON TABLE notifications IS 'User notifications for various system events';
COMMENT ON TABLE audit_logs IS 'Audit trail for important system actions';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for authentication';

COMMENT ON VIEW teacher_discovery IS 'Geospatial view for discovering teachers with upcoming sessions near a location';
COMMENT ON VIEW center_analytics IS 'Aggregate metrics for center admin dashboards';
COMMENT ON VIEW student_bookings_summary IS 'Denormalized view of student bookings with all related info';

COMMENT ON FUNCTION get_wallet_balance IS 'Calculate current wallet balance from completed transactions';
