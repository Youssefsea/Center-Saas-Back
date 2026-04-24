const pool = require('../Clouds/Data');

const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } });

const isValidUrl = (value) => {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

let teacherContentTypeInfo = null;

const getTeacherContentTypeInfo = async () => {
    if (teacherContentTypeInfo) {
        return teacherContentTypeInfo;
    }

    const result = await pool.query(
        `SELECT t.typname, t.typtype, COALESCE(ta.attcount, 0) AS attcount
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_type t ON t.oid = a.atttypid
         LEFT JOIN (
             SELECT attrelid, COUNT(*) AS attcount
             FROM pg_attribute
             WHERE attnum > 0 AND NOT attisdropped
             GROUP BY attrelid
         ) ta ON ta.attrelid = t.typrelid
         WHERE c.relname = 'teacher_content'
           AND a.attname = 'type'
           AND a.attnum > 0
           AND NOT a.attisdropped`
    );

    teacherContentTypeInfo = result.rows[0] || { typname: 'content_type', typtype: 'e', attcount: 0 };
    return teacherContentTypeInfo;
};

const teacherDetels = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT 
                u.id, u.name, u.email, u.phone, u.avatar_url,
                t.id AS teacher_id, t.bio, t.subjects, t.grade_levels,
                t.rating, t.total_reviews, t.total_sessions,
                t.total_students, t.is_verified, t.created_at
            FROM users u
            JOIN teachers t ON t.user_id = u.id
            WHERE u.id = $1`,
            [userId]
        );
        if (result.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        }

        const teacher = result.rows[0];

        const sessionsCountsResult = await pool.query(
            `SELECT status, COUNT(*)::int AS count
             FROM sessions
             WHERE teacher_id = $1
             GROUP BY status`,
            [teacher.teacher_id]
        );

        const sessionsByStatus = {
            scheduled: 0,
            ongoing: 0,
            completed: 0,
            cancelled: 0
        };

        for (const row of sessionsCountsResult.rows) {
            if (sessionsByStatus[row.status] !== undefined) {
                sessionsByStatus[row.status] = row.count;
            }
        }

        const activeSessions = sessionsByStatus.scheduled + sessionsByStatus.ongoing;

        res.status(200).json({
            success: true,
            teacher,
            sessions: {
                by_status: sessionsByStatus,
                active_sessions: activeSessions
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const statsOFTeacher = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;

        const sessionsStats = await pool.query(
            `SELECT 
                COUNT(*) AS total_sessions,
                COUNT(*) FILTER (WHERE status = 'completed' OR (status = 'scheduled' AND scheduled_at < NOW())) AS completed_sessions,
                COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at > NOW()) AS upcoming_sessions,
                COALESCE(SUM(seats_booked), 0) AS total_students_taught
            FROM sessions
            WHERE teacher_id = $1`,
            [teacherId]
        );

        const ratingStats = await pool.query(
            `SELECT rating, total_reviews
             FROM teachers
             WHERE id = $1`,
            [teacherId]
        );

        if (ratingStats.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        }

        const roomsStats = await pool.query(
            `SELECT COUNT(*) AS total_rooms
             FROM rooms
             WHERE teacher_id = $1 AND is_active = true`,
            [teacherId]
        );

        const centersStats = await pool.query(
            `SELECT COUNT(*) AS total_centers
             FROM center_teachers
             WHERE teacher_id = $1 AND is_active = true`,
            [teacherId]
        );

        res.status(200).json({
            success: true,
            stats: {
                total_sessions: Number(sessionsStats.rows[0].total_sessions),
                completed_sessions: Number(sessionsStats.rows[0].completed_sessions),
                upcoming_sessions: Number(sessionsStats.rows[0].upcoming_sessions),
                total_students_taught: Number(sessionsStats.rows[0].total_students_taught),
                rating: ratingStats.rows[0].rating,
                total_reviews: Number(ratingStats.rows[0].total_reviews),
                total_rooms: Number(roomsStats.rows[0].total_rooms),
                total_centers: Number(centersStats.rows[0].total_centers)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const teacherCenters = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;
        const result = await pool.query(
            `SELECT 
                c.id, c.name, c.address, c.phone, c.logo_url,
                c.rating, c.is_active,
                ct.joined_at,
                COUNT(DISTINCT s.id) AS my_sessions_count,
                COUNT(DISTINCT r.id) AS my_rooms_count
            FROM center_teachers ct
            JOIN centers c ON c.id = ct.center_id
            LEFT JOIN sessions s ON s.center_id = c.id AND s.teacher_id = $1
            LEFT JOIN rooms r ON r.center_id = c.id AND r.teacher_id = $1
            WHERE ct.teacher_id = $1 AND ct.is_active = true
            GROUP BY c.id, ct.joined_at
            ORDER BY ct.joined_at DESC`,
            [teacherId]
        );

        res.status(200).json({ success: true, centers: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const teacherSessions = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;
        const status = req.query.status || null;
        const centerId = req.query.centerId || null;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;
        const from = req.query.from || null;
        const to = req.query.to || null;

        if (from && Number.isNaN(Date.parse(from))) {
            return sendError(res, 400, 'INVALID_DATE', 'Invalid from date');
        }

        if (to && Number.isNaN(Date.parse(to))) {
            return sendError(res, 400, 'INVALID_DATE', 'Invalid to date');
        }

        if (from && to && new Date(from) > new Date(to)) {
            return sendError(res, 400, 'INVALID_DATE_RANGE', 'from must be before to');
        }
      const sessionsQuery = `
    SELECT 
        s.id, s.subject, s.grade_level, s.title,
        s.scheduled_at, s.duration_min, s.capacity,
        s.seats_booked, s.price,
        CASE 
            WHEN s.status = 'scheduled' AND s.scheduled_at < NOW() THEN 'ended'
            ELSE s.status::text
        END AS status,
        c.id AS center_id, c.name AS center_name,
        COUNT(b.id) AS total_bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS confirmed_bookings,
        COUNT(a.id) AS total_attended
    FROM sessions s
    JOIN centers c ON c.id = s.center_id
    LEFT JOIN bookings b ON b.session_id = s.id
    LEFT JOIN attendances a ON a.booking_id = b.id
    WHERE s.teacher_id = $1
      AND (
        $2::text IS NULL
        OR ($2 = 'ended' AND s.status = 'scheduled' AND s.scheduled_at < NOW())
        OR ($2 = 'scheduled' AND s.status = 'scheduled' AND s.scheduled_at >= NOW())
        OR ($2 NOT IN ('ended', 'scheduled') AND s.status = $2::session_status)
      )
      AND ($3::uuid IS NULL OR s.center_id = $3)
      AND ($4::timestamptz IS NULL OR s.scheduled_at >= $4::timestamptz)
      AND ($5::timestamptz IS NULL OR s.scheduled_at <= $5::timestamptz)
    GROUP BY s.id, c.id
    ORDER BY s.scheduled_at DESC
    LIMIT $6 OFFSET $7`;

const countQuery = `
    SELECT COUNT(*) AS total
    FROM sessions s
    WHERE s.teacher_id = $1
      AND (
        $2::text IS NULL
        OR ($2 = 'ended' AND s.status = 'scheduled' AND s.scheduled_at < NOW())
        OR ($2 = 'scheduled' AND s.status = 'scheduled' AND s.scheduled_at >= NOW())
        OR ($2 NOT IN ('ended', 'scheduled') AND s.status = $2::session_status)
      )
      AND ($3::uuid IS NULL OR s.center_id = $3)
      AND ($4::timestamptz IS NULL OR s.scheduled_at >= $4::timestamptz)
      AND ($5::timestamptz IS NULL OR s.scheduled_at <= $5::timestamptz)`;

        const [sessionsResult, countResult] = await Promise.all([
            pool.query(sessionsQuery, [teacherId, status, centerId, from, to, limit, offset]),
            pool.query(countQuery, [teacherId, status, centerId, from, to])
        ]);

        res.status(200).json({
            success: true,
            sessions: sessionsResult.rows,
            total: Number(countResult.rows[0].total),
            limit,
            offset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const teacherReviews = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;

        const reviewsQuery = `
            SELECT 
                r.id, r.rating, r.comment, r.created_at,
                u.name AS student_name, u.avatar_url AS student_avatar,
                s.subject, s.grade_level,
                c.name AS center_name
            FROM reviews r
            JOIN users u ON u.id = r.student_id
            JOIN bookings b ON b.id = r.booking_id
            JOIN sessions s ON s.id = b.session_id
            JOIN centers c ON c.id = s.center_id
            WHERE r.teacher_id = $1 AND r.is_visible = true
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3`;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM reviews r
            WHERE r.teacher_id = $1 AND r.is_visible = true`;

        const [reviewsResult, countResult] = await Promise.all([
            pool.query(reviewsQuery, [teacherId, limit, offset]),
            pool.query(countQuery, [teacherId])
        ]);

        res.status(200).json({
            success: true,
            reviews: reviewsResult.rows,
            total: Number(countResult.rows[0].total),
            limit,
            offset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const addContentToCenter = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;
        const { centerId, type, title, description, url, is_free, sort_order } = req.body;

        if (!centerId) return sendError(res, 400, 'VALIDATION_ERROR', 'centerId is required');
        if (!type || !title || !url) return sendError(res, 400, 'VALIDATION_ERROR', 'type, title and url are required');

        const validTypes = ['video', 'pdf', 'link'];
        if (!validTypes.includes(type)) return sendError(res, 400, 'INVALID_TYPE', 'Type must be video, pdf, or link');
        if (title.length > 255) return sendError(res, 400, 'VALIDATION_ERROR', 'Title must be at most 255 characters');
        if (!isValidUrl(url)) return sendError(res, 400, 'INVALID_URL', 'Invalid URL format');

        const centerCheck = await pool.query(
            `SELECT id FROM center_teachers 
             WHERE teacher_id = $1 AND center_id = $2 AND is_active = true`,
            [teacherId, centerId]
        );
        if (centerCheck.rows.length === 0) return sendError(res, 403, 'NOT_YOUR_CENTER', 'مش بتشتغل في السنتر دي');

        const typeInfo = await getTeacherContentTypeInfo();
        if (typeInfo.typtype !== 'e') {
            return sendError(res, 500, 'INVALID_CONTENT_TYPE_SCHEMA', 'teacher_content.type must be an enum');
        }

        const insertResult = await pool.query(
            `INSERT INTO teacher_content 
                (teacher_id, center_id, type, title, description, url, is_free, sort_order)
             VALUES ($1, $2, $3::${typeInfo.typname}, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                teacherId,
                centerId,
                type,
                title,
                description || null,
                url,
                is_free === undefined ? false : is_free,
                sort_order === undefined ? 0 : sort_order
            ]
        );

        res.status(201).json({ success: true, content: insertResult.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const ContentCenter = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;
        const centerId = req.query.centerId;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;

        if (!centerId) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'centerId is required');
        }

        const centerCheck = await pool.query(
            `SELECT id FROM center_teachers 
             WHERE teacher_id = $1 AND center_id = $2 AND is_active = true`,
            [teacherId, centerId]
        );

        if (centerCheck.rows.length === 0) {
            return sendError(res, 403, 'NOT_YOUR_CENTER', 'مش بتشتغل في السنتر دي');
        }

        const typeInfo = await getTeacherContentTypeInfo();
        const typeSelectSql = (typeInfo.typtype === 'c' && typeInfo.typname === 'content_items')
            ? '(tc.type).type::text'
            : 'tc.type::text';

        const contentQuery = `
            SELECT 
                tc.id,
                ${typeSelectSql} AS type,
                tc.title,
                tc.description,
                tc.url,
                tc.is_free,
                tc.is_active,
                tc.sort_order,
                tc.created_at,
                COUNT(ci.id) AS used_in_rooms_count
            FROM teacher_content tc
            LEFT JOIN content_items ci ON ci.teacher_content_id = tc.id
            WHERE tc.teacher_id = $1 AND tc.center_id = $2
            GROUP BY tc.id
            ORDER BY tc.sort_order ASC, tc.created_at DESC
            LIMIT $3 OFFSET $4`;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM teacher_content
            WHERE teacher_id = $1 AND center_id = $2`;

        const [contentResult, countResult] = await Promise.all([
            pool.query(contentQuery, [teacherId, centerId, limit, offset]),
            pool.query(countQuery, [teacherId, centerId])
        ]);

        res.status(200).json({
            success: true,
            content: contentResult.rows,
            total: Number(countResult.rows[0].total),
            limit,
            offset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const UpdateContent = async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const teacherId = req.user.teacherId;
        const contentId = req.params.contentId;
        const { title, description, url, is_free, is_active, sort_order } = req.body;

        const contentResult = await client.query(
            `SELECT id, teacher_id FROM teacher_content WHERE id = $1`,
            [contentId]
        );

        if (contentResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Content not found');
        }

        if (contentResult.rows[0].teacher_id !== teacherId) {
            return sendError(res, 403, 'NOT_YOUR_CONTENT', 'Access denied');
        }

        if (title && title.length > 255) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Title must be at most 255 characters');
        }

        if (url && !isValidUrl(url)) {
            return sendError(res, 400, 'INVALID_URL', 'Invalid URL format');
        }

        await client.query('BEGIN');
        transactionStarted = true;

        const updateResult = await client.query(
            `UPDATE teacher_content SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                url = COALESCE($3, url),
                is_free = COALESCE($4, is_free),
                is_active = COALESCE($5, is_active),
                sort_order = COALESCE($6, sort_order),
                updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [title, description, url, is_free, is_active, sort_order, contentId]
        );

        const updatedContent = updateResult.rows[0];

        await client.query(
            `UPDATE content_items
             SET title = $1, description = $2, url = $3
             WHERE teacher_content_id = $4`,
            [updatedContent.title, updatedContent.description, updatedContent.url, contentId]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        res.status(200).json({ success: true, content: updatedContent });
    } catch (err) {
        console.error(err);
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    } finally {
        client.release();
    }
};

const DeleteContent = async (req, res) => {
    try {
        const teacherId = req.user.teacherId;
        const contentId = req.params.contentId;

        const contentCheck = await pool.query(
            `SELECT id FROM teacher_content WHERE id = $1 AND teacher_id = $2`,
            [contentId, teacherId]
        );

        if (contentCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Content not found');
        }

        const usageResult = await pool.query(
            `SELECT COUNT(*) AS count FROM content_items WHERE teacher_content_id = $1`,
            [contentId]
        );

        const usageCount = Number(usageResult.rows[0].count);

        if (usageCount > 0) {
            await pool.query(
                `UPDATE teacher_content SET is_active = false, updated_at = NOW() WHERE id = $1`,
                [contentId]
            );
            return res.status(200).json({
                success: true,
                action: 'deactivated',
                message: 'المحتوى متستخدم في rooms، اتوقف بدل ما اتمسح'
            });
        }

        await pool.query(
            `DELETE FROM teacher_content WHERE id = $1`,
            [contentId]
        );

        res.status(200).json({
            success: true,
            action: 'deleted',
            message: 'اتمسح المحتوى بنجاح'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

module.exports = {
    teacherDetels,
    statsOFTeacher,
    teacherCenters,
    teacherSessions,
    teacherReviews,
    addContentToCenter,
    ContentCenter,
    UpdateContent,
    DeleteContent
};
