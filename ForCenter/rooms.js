const pool = require('../Clouds/Data');
const crypto = require('crypto');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const createRoom = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const { teacherId, name, description, gradeLevel, subject, paidPrice } = req.body;
      

        if (!teacherId || !name || !gradeLevel || !subject) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher ID, name, grade level and subject are required');
        }

        const checkRoomExists = await pool.query(
            `SELECT id FROM rooms WHERE name = $1 AND center_id = $2`,
            [name, centerId]
        );
        if (checkRoomExists.rows.length > 0) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'A room with this name already exists in your center');
         }


        const teacherCheck = await pool.query(
            `SELECT ct.teacher_id, t.user_id ,t.subjects,t.grade_levels FROM center_teachers ct
            join teachers t on t.id = ct.teacher_id

             WHERE ct.center_id = $1 AND ct.teacher_id = $2`,
            [centerId, teacherId]
        );


        if (teacherCheck.rows.length === 0) {
            return sendError(res, 403, 'FORBIDDEN', `Teacher is not associated with your center he teach ${teacherCheck.rows[0]?.subjects?.join(', ') || 'unknown'}`,);
        }
            const teacherInfo = teacherCheck.rows[0];
          
            if (!teacherInfo.grade_levels.includes(gradeLevel) || !teacherInfo.subjects.includes(subject)) {
                return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher does not teach the specified grade level or subject');
             }


  let accessCode;
let isUnique = false;
while (!isUnique) {
    accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const existing = await pool.query(
        `SELECT id FROM rooms WHERE access_code = $1`, [accessCode]
    );
    if (existing.rows.length === 0) isUnique = true;
}

        const result = await pool.query(
            `INSERT INTO rooms (center_id, teacher_id, name, description, grade_level, subject, access_code, paid_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, name, description, grade_level, subject, access_code, is_active, created_at`,
            [centerId, teacherId, name, description || null, gradeLevel, subject, accessCode, paidPrice]
        );

        res.status(201).json({
            success: true,
            room: {
                ...result.rows[0],
                teacher_id: teacherId
            }
        });

    } catch (err) {
        console.error('Error creating room:', err);
        if (err.code === '23505') {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Room with this name already exists');
        }
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getCenterRooms = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const { teacherId, isActive } = req.query;

        let query = `
            SELECT 
                r.id, r.name, r.description, r.grade_level, r.subject, 
                r.access_code, r.is_active, COUNT(DISTINCT ci.id) AS content_count, r.created_at, r.paid_price,
                t.id AS teacher_id,
                u.name AS teacher_name,
                COUNT(DISTINCT rm.id) AS member_count
            FROM rooms r
            JOIN teachers t ON t.id = r.teacher_id
            JOIN users u ON u.id = t.user_id
            LEFT JOIN content_items ci ON ci.room_id = r.id
            LEFT JOIN room_members rm ON rm.room_id = r.id
            WHERE r.center_id = $1
        `;
        const params = [centerId];

        if (teacherId && teacherId !== null && teacherId !== '') {
            query += ` AND r.teacher_id = $${params.length + 1}`;
            params.push(teacherId);
        }

        if (isActive !== undefined && isActive !== null && isActive !== '') {
            query += ` AND r.is_active = $${params.length + 1}`;
            params.push(isActive === 'true');
        }

        query += `
            GROUP BY r.id, t.id, u.name
            ORDER BY r.created_at DESC
        `;

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            rooms: result.rows
        });

    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const updateRoom = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.id;
        const { name, description, gradeLevel, subject, isActive, paidPrice } = req.body;

        const roomCheck = await pool.query(
            `SELECT id FROM rooms WHERE id = $1 AND center_id = $2`,
            [roomId, centerId]
        );

        if (roomCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Room not found');
        }

        const result = await pool.query(
            `UPDATE rooms SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                grade_level = COALESCE($3, grade_level),
                subject = COALESCE($4, subject),
                is_active = COALESCE($5, is_active),
                paid_price = COALESCE($6, paid_price),
                updated_at = NOW()
             WHERE id = $7
             RETURNING id, name, description, grade_level, subject, access_code, is_active,paid_price, created_at, teacher_id,content_count, member_count`,
            [name, description, gradeLevel, subject, isActive, paidPrice, roomId]
        );

        res.status(200).json({
            success: true,
            message: 'Room updated successfully',
            room: result.rows[0]
        });

    } catch (err) {
        console.error('Error updating room:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const deleteRoom = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.id;

        const result = await pool.query(
            `DELETE FROM rooms WHERE id = $1 AND center_id = $2 RETURNING id`,
            [roomId, centerId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Room not found');
        }

        res.status(200).json({
            success: true,
            message: 'Room deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting room:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getRoomMembers = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.id;

        const roomCheck = await pool.query(
            `SELECT id FROM rooms WHERE id = $1 AND center_id = $2`,
            [roomId, centerId]
        );

        if (roomCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Room not found');
        }

        const result = await pool.query(
            `SELECT 
                rm.id, rm.access_tier, rm.joined_at,
                u.id AS student_id, u.name AS student_name, u.email AS student_email, u.avatar_url
            FROM room_members rm
            JOIN users u ON u.id = rm.student_id
            WHERE rm.room_id = $1
            ORDER BY rm.joined_at DESC`,
            [roomId]
        );

        res.status(200).json({
            success: true,
            members: result.rows
        });

    } catch (err) {
        console.error('Error fetching room members:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const regenerateAccessCode = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.id;

        const roomCheck = await pool.query(
            `SELECT id FROM rooms WHERE id = $1 AND center_id = $2`,
            [roomId, centerId]
        );

        if (roomCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Room not found');
        }

        const newCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const result = await pool.query(
            `UPDATE rooms SET access_code = $1 WHERE id = $2 RETURNING access_code`,
            [newCode, roomId]
        );

        res.status(200).json({
            success: true,
            access_code: result.rows[0].access_code
        });

    } catch (err) {
        console.error('Error regenerating access code:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

module.exports = {
    createRoom,
    getCenterRooms,
    updateRoom,
    deleteRoom,
    getRoomMembers,
    regenerateAccessCode
};
