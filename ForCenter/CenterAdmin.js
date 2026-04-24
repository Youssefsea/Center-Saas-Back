const pool=require('../Clouds/Data');
const cloudinary = require('../Clouds/imgup');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape


const getCenterProfile = async (req, res) => {
try
{
const centerId = req.user.centerId;
const adminId = req.user.id;

const result = await pool.query(
    `Select 
    c.id, c.name, c.address, c.description, c.phone,u.avatar_url,
    ST_X(c.coordinates::geometry) AS lng,
    ST_Y(c.coordinates::geometry) AS lat,
    c.created_at, c.updated_at
    FROM centers c
    JOIN users u ON c.owner_id = u.id
    WHERE c.id = $1 AND c.owner_id = $2`,
    [centerId, adminId]
);

    

if (result.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
}
res.status(200).json({ success: true, center: result.rows[0] });

}
catch(err)
{
    console.error('Error fetching center profile:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}
}

const updateCenterProfile = async (req, res) => {

try
{
const centerId = req.user.centerId;
const adminId = req.user.id;
const { name, address, lat, lng, description, phone } = req.body;

if (!name || !address || !lat || !lng) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Center name, address and coordinates are required');
}
const query=`UPDATE centers SET name = $1, address = $2, coordinates = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, description = $5, phone = $6, updated_at = NOW() WHERE id = $7 AND owner_id = $8 RETURNING *`;
const values = [name, address, parseFloat(lng), parseFloat(lat), description, phone, centerId, adminId];
const result = await pool.query(query, values);

if (result.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
}
res.status(200).json({ success: true, message: 'Center profile updated successfully', center: result.rows[0] }); // ✅ FIXED: standardized success response shape

}
catch(err)
{
    console.error('Error updating center profile:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}
}


const AddTeacherToCenter = async (req, res) => {
try
{
    const centerId = req.user.centerId;
    const adminId = req.user.id;
    const { teacherId } = req.body;
console.log("teacherId", teacherId);

    const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
    if (centerResult.rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
    }

    const teacherResult = await pool.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
    }

    const existingAssociation = await pool.query('SELECT id FROM center_teachers WHERE center_id = $1 AND teacher_id = $2', [centerId, teacherId]);
    if (existingAssociation.rows.length > 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher is already associated with this center');
    }

    await pool.query('INSERT INTO center_teachers (center_id, teacher_id) VALUES ($1, $2)', [centerId, teacherId]);
    res.status(200).json({ success: true, message: 'Teacher added to center successfully' }); // ✅ FIXED: standardized success response shape



}

catch(err)
{
    console.error('Error adding teacher to center:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}

}


const RemoveTeacherFromCenter = async (req, res) => {
try
{
    const centerId = req.user.centerId;
    const adminId = req.user.id;
    const { teacherId } = req.body;
    const centerResult = await pool.query('SELECT id,name FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
    if (centerResult.rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
    }
    const teacherResult = await pool.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
    }
    const associationResult = await pool.query('SELECT id FROM center_teachers WHERE center_id = $1 AND teacher_id = $2', [centerId, teacherId]);
    if (associationResult.rows.length === 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher is not associated with this center');
    }

    await pool.query('DELETE FROM center_teachers WHERE center_id = $1 AND teacher_id = $2', [centerId, teacherId]);
    res.status(200).json({ success: true, message: 'Teacher removed from center successfully' }); // ✅ FIXED: standardized success response shape
}

catch(err)
{
    console.error('Error removing teacher from center:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}
};

const GetCenterTeachers = async (req, res) => {
try
{
    const centerId = req.user.centerId;
    const adminId = req.user.id;
    const centerResult = await pool.query('SELECT id,name FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
    if (centerResult.rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
    }
    const teachersResult = await pool.query(`SELECT t.id, u.name as user_name, t.bio, t.subjects, t.grade_levels, t.rating, t.total_reviews,
    COALESCE(COUNT(s.id), 0) as sessionsCount,
    COALESCE(COUNT(s.id) FILTER (WHERE s.scheduled_at > NOW() AND s.status != 'cancelled'), 0) as upcomingSessions
                                         FROM teachers t
                                         JOIN center_teachers ct ON t.id = ct.teacher_id
                                         JOIN users u ON t.user_id = u.id
                                         LEFT JOIN sessions s ON s.teacher_id = t.id AND s.center_id = ct.center_id
                                         WHERE ct.center_id = $1
                                         GROUP BY t.id, u.name, t.bio, t.subjects, t.grade_levels, t.rating, t.total_reviews`, [centerId]);
    res.status(200).json({ success: true, teachers: teachersResult.rows }); // ✅ FIXED: standardized success response shape
}
catch(err)
{
    console.error('Error fetching center teachers:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}
};

const addSessionToCenterWithConflictCheck = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const adminId = req.user.id;
        const { teacherId, subject, grade_level, scheduled_at, duration_min, capacity, price } = req.body;
        const notes = req.body.notes || null;
console.log('Received session data:', { teacherId, subject, grade_level, scheduled_at, duration_min, capacity, price });
        if (!subject || !grade_level || !scheduled_at || !duration_min || !capacity || !price) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Subject, grade level, scheduled time, duration, capacity and price are required');
        }
console.log('Adding session with data:', { teacherId, subject, grade_level, scheduled_at, duration_min, capacity, price });
        const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
        if (centerResult.rows.length === 0) return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');

        const teacherResult = await pool.query('SELECT id, grade_levels, subjects FROM teachers WHERE id = $1', [teacherId]);
        if (teacherResult.rows.length === 0) return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        if (!teacherResult.rows[0].grade_levels.includes(grade_level)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher does not teach the specified grade level');
        }
        if (!teacherResult.rows[0].subjects.includes(subject)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher does not teach the specified subject');
        }
const existingSessions = await pool.query(
    'SELECT id, subject, grade_level, scheduled_at, duration_min FROM sessions WHERE teacher_id = $1',
    [teacherId]
);
console.log('Existing sessions for this teacher:', existingSessions.rows);

const teacherOverlapQuery = `
    SELECT id, subject, grade_level, scheduled_at
    FROM sessions
    WHERE teacher_id = $1
    AND tstzrange(scheduled_at, scheduled_at + (duration_min * interval '1 minute'))
        && tstzrange($2::timestamptz, $2::timestamptz + ($3 * interval '1 minute'))
`;

        const teacherConflict = await pool.query(teacherOverlapQuery, [
            teacherId,
            scheduled_at,
            duration_min
        ]);

console.log('Teacher conflict check result:', teacherConflict.rows);
        if (teacherConflict.rows.length > 0) {
            const conflict = teacherConflict.rows[0];
            return sendError(res, 400, 'VALIDATION_ERROR', 'المدرس مشغول في هذا الوقت!', {
                details: `عنده حصة ${conflict.subject} لـ ${conflict.grade_level} تبدأ في ${conflict.scheduled_at}`
            });
        }

    const gradeOverlapQuery = `
    SELECT id, subject, scheduled_at
    FROM sessions
    WHERE center_id = $1
    AND grade_level = $2
    AND tstzrange(scheduled_at, scheduled_at + (duration_min * interval '1 minute'))
        && tstzrange($3::timestamptz, $3::timestamptz + ($4 * interval '1 minute'))
`;

        const gradeConflict = await pool.query(gradeOverlapQuery, [
            centerId,
            grade_level,
            scheduled_at,
            duration_min
        ]);

        console.log('Grade conflict check result:', gradeConflict.rows);
        if (gradeConflict.rows.length > 0) {
            const conflict = gradeConflict.rows[0];
            return sendError(res, 400, 'VALIDATION_ERROR', 'احترس! يوجد تداخل في المواعيد لنفس الصف الدراسي.', {
                details: `حصة ${conflict.subject} تبدأ في ${conflict.scheduled_at}`
            });
        }

        const insertQuery = `
            INSERT INTO sessions (center_id, teacher_id, subject, grade_level, scheduled_at, duration_min, capacity, notes, price)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `;
        const newSession = await pool.query(insertQuery, [centerId, teacherId, subject, grade_level, scheduled_at, duration_min, capacity, notes, price]);
console.log('New session added:', newSession.rows[0]);
        res.status(201).json({ success: true, message: 'Session added successfully', session: newSession.rows[0] }); // ✅ FIXED: standardized success response shape

    } catch (err) {
        console.error('Error adding session to center:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};


const addSessionToCenterWithoutConflictCheck = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const adminId = req.user.id;
        const { teacherId, subject, grade_level, scheduled_at, duration_min, capacity, price } = req.body;
        const notes = req.body.notes || null;
        if (!subject || !grade_level || !scheduled_at || !duration_min || !capacity || !price) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Subject, grade level, scheduled time, duration, capacity and price are required');
        }
        const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
        if (centerResult.rows.length === 0) return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
        const teacherResult = await pool.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
        if (teacherResult.rows.length === 0) return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        const insertQuery = `
            INSERT INTO sessions (center_id, teacher_id, subject, grade_level, scheduled_at, duration_min, capacity, notes, price)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `;
        const newSession = await pool.query(insertQuery, [centerId, teacherId, subject, grade_level, scheduled_at, duration_min, capacity, notes, price]);
        res.status(201).json({ success: true, message: 'Session added successfully', session: newSession.rows[0] }); // ✅ FIXED: standardized success response shape
    } catch (err) {
        console.error('Error adding session to center:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};


const updateSessionInCenterWithConflictCheck = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const adminId = req.user.id;
        const sessionId = req.params.sessionId;
        const { teacherId, subject, grade_level, scheduled_at, duration_min, capacity, price } = req.body;
        const notes = req.body.notes || null;

        if (!subject || !grade_level || !scheduled_at || !duration_min || !capacity || !price) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Subject, grade level, scheduled time, duration, capacity and price are required');
        }

        const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
        if (centerResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
        }

        const teacherResult = await pool.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
        if (teacherResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        }

        const sessionResult = await pool.query('SELECT id FROM sessions WHERE id = $1 AND center_id = $2', [sessionId, centerId]);
        if (sessionResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Session not found for this center');
        }


const teacherOverlapQuery = `
    SELECT id, subject, grade_level, scheduled_at
    FROM sessions
    WHERE teacher_id = $1
    AND id != $2
    AND tstzrange(scheduled_at, scheduled_at + (duration_min * interval '1 minute'))
        && tstzrange($3::timestamptz, $3::timestamptz + ($4 * interval '1 minute'))
`;


const teacherConflict = await pool.query(teacherOverlapQuery, [
    teacherId,
    sessionId,
    scheduled_at,
    duration_min
]);

if (teacherConflict.rows.length > 0) {
    const conflict = teacherConflict.rows[0];
    return sendError(res, 400, 'VALIDATION_ERROR', 'المدرس مشغول في هذا الوقت!', {
        details: `عنده حصة ${conflict.subject} لـ ${conflict.grade_level} تبدأ في ${conflict.scheduled_at}`
    });
}
const gradeOverlapQuery = `
    SELECT id, subject, scheduled_at
    FROM sessions
    WHERE center_id = $1
    AND grade_level = $2
    AND id != $3
    AND tstzrange(scheduled_at, scheduled_at + (duration_min * interval '1 minute'))
        && tstzrange($4::timestamptz, $4::timestamptz + ($5 * interval '1 minute'))
`;

     const gradeConflict = await pool.query(gradeOverlapQuery, [
    centerId,
    grade_level,
    sessionId,
    scheduled_at,
    duration_min
]);

        if (gradeConflict.rows.length > 0) {
            const conflict = gradeConflict.rows[0];
            return sendError(res, 400, 'VALIDATION_ERROR', 'احترس! يوجد تداخل في المواعيد لنفس الصف الدراسي.', {
                details: `حصة ${conflict.subject} تبدأ في ${conflict.scheduled_at}`
            });
        }

        const updateQuery = `
            UPDATE sessions
            SET teacher_id = $1, subject = $2, grade_level = $3, scheduled_at = $4, duration_min = $5, capacity = $6, notes = $7, price = $8
            WHERE id = $9 AND center_id = $10
            RETURNING *
        `;
        const updatedSession = await pool.query(updateQuery, [teacherId, subject, grade_level, scheduled_at, duration_min, capacity, notes, price, sessionId, centerId]);

        res.status(200).json({ success: true, message: 'Session updated successfully', session: updatedSession.rows[0] }); // ✅ FIXED: standardized success response shape
    } catch(err) {
        console.error('Error updating session in center:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};


const updateSessionInCenterWithoutConflictCheck = async (req, res) => {

try
{
const centerId = req.user.centerId;
const adminId = req.user.id;
const sessionId = req.params.sessionId;
const { teacherId, subject, grade_level, scheduled_at, duration_min, capacity, price } = req.body;
const notes = req.body.notes || null;
if (!subject || !grade_level || !scheduled_at || !duration_min || !capacity || !price) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Subject, grade level, scheduled time, duration, capacity and price are required');
}
const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
if (centerResult.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
}
const teacherResult = await pool.query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
if (teacherResult.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
}
const sessionResult = await pool.query('SELECT id FROM sessions WHERE id = $1 AND center_id = $2', [sessionId, centerId]);
if (sessionResult.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found for this center');
}
const updateQuery = `
    UPDATE sessions
    SET teacher_id = $1, subject = $2, grade_level = $3, scheduled_at = $4, duration_min = $5, capacity = $6, notes = $7, price = $8
    WHERE id = $9 AND center_id = $10
    RETURNING *
`;

const updatedSession = await pool.query(updateQuery, [teacherId, subject, grade_level, scheduled_at, duration_min, capacity, notes, price, sessionId, centerId]);
res.status(200).json({ success: true, message: 'Session updated successfully', session: updatedSession.rows[0] }); // ✅ FIXED: standardized success response shape



}
catch(err)
{
    console.error('Error updating session in center:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}

}



const deleteSessionFromCenter = async (req, res) => {

try
{
const centerId = req.user.centerId;
const adminId = req.user.id;
const sessionId = req.params.sessionId;
const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
if (centerResult.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
}
const sessionResult = await pool.query('SELECT id FROM sessions WHERE id = $1 AND center_id = $2', [sessionId, centerId]);
if (sessionResult.rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found for this center');
}
await pool.query('DELETE FROM sessions WHERE id = $1 AND center_id = $2', [sessionId, centerId]);
res.status(200).json({ success: true, message: 'Session deleted successfully' }); // ✅ FIXED: standardized success response shape

}
catch(err)
{
    console.error('Error deleting session from center:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}
}


const GetAllSessionsOfCenter = async (req, res) => {

try
{
    const centerId = req.user.centerId;
    const adminId = req.user.id;
    const centerResult = await pool.query('SELECT id FROM centers WHERE id = $1 AND owner_id = $2', [centerId, adminId]);
    if (centerResult.rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
    }
    const sessionsResult = await pool.query(`SELECT s.id, s.subject, s.grade_level, s.scheduled_at, s.duration_min, s.capacity, s.notes,u.name AS teacherName,s.price,
    CASE
        WHEN s.status = 'cancelled' THEN 'cancelled'::session_status
        WHEN NOW() >= (s.scheduled_at + (s.duration_min * interval '1 minute')) THEN 'completed'::session_status
        WHEN NOW() >= s.scheduled_at AND NOW() < (s.scheduled_at + (s.duration_min * interval '1 minute')) THEN 'ongoing'::session_status
        ELSE 'scheduled'::session_status
    END AS status,
    CASE
        WHEN s.status = 'cancelled' THEN 'cancelled'
        WHEN NOW() >= (s.scheduled_at + (s.duration_min * interval '1 minute')) THEN 'ended'
        WHEN NOW() >= s.scheduled_at AND NOW() < (s.scheduled_at + (s.duration_min * interval '1 minute')) THEN 'is started now'
        ELSE 'scheduled'
    END AS status_label,
    (s.capacity - COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND b.status IN ('pending', 'confirmed')), 0)) AS available_slots,

                                         t.id AS teacher_id, t.bio AS teacher_bio, t.subjects AS teacher_subjects,
                                         t.grade_levels AS teacher_grade_levels, t.rating AS teacher_rating,
                                         t.total_reviews AS teacher_total_reviews
                                         FROM sessions s
                                         JOIN teachers t ON s.teacher_id = t.id
                                         join users u on t.user_id = u.id
                                         WHERE s.center_id = $1`, [centerId]);
    res.status(200).json({ success: true, sessions: sessionsResult.rows }); // ✅ FIXED: standardized success response shape

}
catch(err)
{
    console.error('Error fetching sessions for center:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}

}



const cancelSession = async (req, res) => {
    const client = await pool.connect(); // ← client منفصل للـ transaction
    try {
        const centerId = req.user.centerId;
        const adminId = req.user.id;
        const sessionId = req.params.sessionId;

        await client.query('BEGIN');

        // ✅ FIXED: verify center ownership before accessing sessions
        const centerVerify = await client.query(
            `SELECT id FROM centers WHERE id = $1 AND owner_id = $2`,
            [centerId, adminId]
        );

        if (centerVerify.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'NOT_FOUND', 'Center not found or access denied');
        }

        const sessionResult = await client.query(
            `SELECT id, status, scheduled_at FROM sessions
             WHERE id = $1 AND center_id = $2 FOR UPDATE`, // ← FOR UPDATE يمنع race condition
            [sessionId, centerId]
        );

        if (sessionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'NOT_FOUND', 'Session not found for this center');
        }

        const session = sessionResult.rows[0];

        if (session.status !== 'scheduled') {
            await client.query('ROLLBACK');
            return sendError(res, 400, 'VALIDATION_ERROR', 'Only scheduled sessions can be cancelled');
        }

        const bookingsResult = await client.query(
            `SELECT id, student_id, amount_paid FROM bookings
             WHERE session_id = $1 AND status IN ('pending', 'confirmed')`,
            [sessionId]
        );

        for (const booking of bookingsResult.rows) {
            await client.query(
                `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
                [booking.id]
            );

            if (booking.amount_paid > 0) {
                await client.query(
                    `INSERT INTO wallet_transactions
                     (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
                     VALUES ($1, $2, 'refund', 'completed', $3, 'session_cancellation', 'Refund for cancelled session', NOW())`,
                    [booking.student_id, booking.amount_paid, booking.id]
                ); // ✅ FIXED: replaced direct wallets table write with wallet_transactions refund insert
            }
        }

        await client.query(
            `UPDATE sessions SET status = 'cancelled' WHERE id = $1`,
            [sessionId]
        );

        await client.query('COMMIT'); // ← كل حاجة تمت صح → احفظ

        res.status(200).json({
            success: true,
            message: 'Session cancelled successfully',
            refunds_processed: bookingsResult.rows.filter(b => b.amount_paid > 0).length
        });

    } catch (err) {
        await client.query('ROLLBACK'); // ← أي error → ارجع لزيرو
        console.error('Error cancelling session:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    } finally {
        client.release(); // ← دايماً release الـ client
    }
};



module.exports = {
    updateCenterProfile,
    AddTeacherToCenter,
    RemoveTeacherFromCenter,
    GetCenterTeachers,
    addSessionToCenterWithConflictCheck,
    addSessionToCenterWithoutConflictCheck,
    updateSessionInCenterWithConflictCheck,
    updateSessionInCenterWithoutConflictCheck,
    deleteSessionFromCenter,
    GetAllSessionsOfCenter,
    cancelSession,getCenterProfile
};

