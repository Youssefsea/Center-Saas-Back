const pool = require('../Clouds/Data');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const jwt = require('jsonwebtoken');

let teacherContentTypeInfo = null;

const getTeacherContentTypeInfo = async () => {
    if (teacherContentTypeInfo) {
        return teacherContentTypeInfo;
    }

    const result = await pool.query(
        `SELECT t.typname, t.typtype
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_type t ON t.oid = a.atttypid
         WHERE c.relname = 'teacher_content'
           AND a.attname = 'type'
           AND a.attnum > 0
           AND NOT a.attisdropped`
    );

    teacherContentTypeInfo = result.rows[0] || { typname: 'content_type', typtype: 'e' };
    return teacherContentTypeInfo;
};

const getTeacherContentTypeSelectSql = async () => {
    const typeInfo = await getTeacherContentTypeInfo();
    if (typeInfo.typtype === 'c' && typeInfo.typname === 'content_items') {
        return '(tc.type).type::text';
    }
    return 'tc.type::text';
};

const getTeacherContentTypeInsertSql = async () => {
    const typeInfo = await getTeacherContentTypeInfo();
    if (typeInfo.typtype === 'c' && typeInfo.typname === 'content_items') {
        return '(tc.type).type::content_type';
    }
    if (typeInfo.typtype === 'e' && typeInfo.typname === 'content_type') {
        return 'tc.type';
    }
    return 'tc.type::text::content_type';
};






const addContent = async (req, res) => {
    const client = await pool.connect();
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.roomId;
        const { teacherContentId, isFree, sortOrder } = req.body;

        if (!teacherContentId) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'teacherContentId is required');
        }

        await client.query('BEGIN');

        const roomCheck = await client.query(
            `SELECT id FROM rooms WHERE id = $1 AND center_id = $2`,
            [roomId, centerId]
        );

        if (roomCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'ROOM_NOT_FOUND', 'Room not found');
        }

        const contentSource = await client.query(
            `SELECT tc.* FROM teacher_content tc
             JOIN center_teachers ct 
               ON ct.teacher_id = tc.teacher_id
              AND ct.center_id = $2
              AND ct.is_active = true
             WHERE tc.id = $1
               AND tc.center_id = $2
               AND tc.is_active = true`,
            [teacherContentId, centerId]
        );

        if (contentSource.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 403, 'CONTENT_NOT_AVAILABLE', 'المحتوى ده مش متاح لمركزك');
        }

        const alreadyAdded = await client.query(
            `SELECT id FROM content_items WHERE room_id = $1 AND teacher_content_id = $2`,
            [roomId, teacherContentId]
        );

        if (alreadyAdded.rows.length > 0) {
            await client.query('ROLLBACK');
            return sendError(res, 400, 'ALREADY_IN_ROOM', 'المحتوى ده مضاف للـ room بالفعل');
        }

        const typeInsertSql = await getTeacherContentTypeInsertSql();

        const insertResult = await client.query(
            `INSERT INTO content_items
                (room_id, teacher_content_id, type, title, description, url, is_free, sort_order)
             SELECT 
                $1, tc.id, ${typeInsertSql}, tc.title, tc.description, tc.url,
                COALESCE($3, tc.is_free),
                COALESCE($4, 0)
             FROM teacher_content tc
             WHERE tc.id = $2
             RETURNING id, room_id, teacher_content_id, type, title, description, url, is_free, sort_order, created_at`,
            [roomId, teacherContentId, isFree ?? null, sortOrder ?? null]
        );

        await client.query(
            `UPDATE rooms SET content_count = content_count + 1, updated_at = NOW() WHERE id = $1`,
            [roomId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            content: insertResult.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    } finally {
        client.release();
    }
};

const getTeacherContentForCenter = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const teacherId = req.params.teacherId;
        const { type, is_free } = req.query;
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;

        const validTypes = ['video', 'pdf', 'link'];
        if (type && !validTypes.includes(type)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Type must be video, pdf, or link');
        }

        let isFreeFilter = null;
        if (is_free !== undefined) {
            if (is_free === 'true') {
                isFreeFilter = true;
            } else if (is_free === 'false') {
                isFreeFilter = false;
            } else {
                return sendError(res, 400, 'VALIDATION_ERROR', 'is_free must be true or false');
            }
        }

        const teacherCheck = await pool.query(
            `SELECT id FROM center_teachers
             WHERE teacher_id = $1 AND center_id = $2 AND is_active = true`,
            [teacherId, centerId]
        );

        if (teacherCheck.rows.length === 0) {
            return sendError(res, 403, 'TEACHER_NOT_IN_YOUR_CENTER', 'Teacher is not associated with your center');
        }

        const typeSelectSql = await getTeacherContentTypeSelectSql();

        const result = await pool.query(
            `SELECT 
                tc.id, ${typeSelectSql} AS type, tc.title, tc.description,
                tc.url, tc.is_free, tc.sort_order, tc.created_at,
                u.name AS teacher_name,
                COUNT(ci.id) AS already_used_count
             FROM teacher_content tc
             JOIN teachers t ON t.id = tc.teacher_id
             JOIN users u ON u.id = t.user_id
             LEFT JOIN content_items ci 
               ON ci.teacher_content_id = tc.id
              AND ci.room_id IN (SELECT id FROM rooms WHERE center_id = $2)
             WHERE tc.teacher_id = $1
               AND tc.center_id = $2
               AND tc.is_active = true
               AND ($3::text IS NULL OR ${typeSelectSql} = $3)
               AND ($4::boolean IS NULL OR tc.is_free = $4)
             GROUP BY tc.id, u.name
             ORDER BY tc.sort_order ASC
             LIMIT $5 OFFSET $6`,
            [teacherId, centerId, type || null, isFreeFilter, limit, offset]
        );

        res.status(200).json({
            success: true,
            content: result.rows
        });
    } catch (err) {
        console.error('Error fetching teacher content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getRoomContentAdmin = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.roomId;

        const roomCheck = await pool.query(
            `SELECT id,teacher_id, name FROM rooms WHERE id = $1 AND center_id = $2`,
            [roomId, centerId]
        );

        if (roomCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Room not found');
        }

        const result = await pool.query(
            `SELECT id, type, title, description, url, is_free, sort_order, created_at
             FROM content_items
             WHERE room_id = $1
             ORDER BY sort_order ASC, created_at ASC`,
            [roomId]
        );

        res.status(200).json({
            success: true,
            room: roomCheck.rows[0],
            content: result.rows
        });

    } catch (err) {
        console.error('Error fetching content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

// const getContentOFTeacher = async (req, res) => 
//     {
//         try
//         {
//             const teacherId = req.params.teacherId;
//             const centerId = req.user.centerId;

//             const centerCheck = await pool.query(
//                 `SELECT id FROM center_teachers
//                  WHERE teacher_id = $1 AND center_id = $2 AND is_active = true`,
//                 [teacherId, centerId]
//              );
//              if (centerCheck.rows.length === 0) return sendError(res, 403, 'NOT_YOUR_CENTER', 'مش بتشتغل في السنتر دي');

//              const teacherContent = await pool.query(
//                 `SELECT id, type, title, description, url, is_free, sort_order, created_at
//                  FROM teacher_content
//                  WHERE teacher_id = $1 AND center_id = $2 AND is_active = true
//                  ORDER BY sort_order ASC, created_at ASC`,
//                 [teacherId, centerId]
//              );
//                 res.status(200).json({ success: true, content: teacherContent.rows });
//         }
//         catch(err)        {
//             console.error('Error fetching teacher content:', err);
//             res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
//         }
//     }

const updateContent = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const contentId = req.params.id;
        const { is_free, is_active, sort_order } = req.body;
        if (is_free === undefined && is_active === undefined && sort_order === undefined) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'At least one of is_free, is_active, or sort_order must be provided');
        }


        const contentCheck = await pool.query(
            `SELECT c.id FROM content_items c
             JOIN rooms r ON r.id = c.room_id
             WHERE c.id = $1 AND r.center_id = $2`,
            [contentId, centerId]
        );

        if (contentCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Content not found');
        }

        const result = await pool.query(
            `UPDATE content_items SET 
                is_free = COALESCE($1, is_free),
                is_active = COALESCE($2, is_active),
                sort_order = COALESCE($3, sort_order),
                updated_at = NOW()
             WHERE id = $4
             RETURNING id, type, title, description, url, is_free, is_active, sort_order`,
            [is_free, is_active, sort_order, contentId]
        );

        res.status(200).json({
            success: true,
            message: 'Content updated successfully',
            content: result.rows[0]
        });

    } catch (err) {
        console.error('Error updating content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const deleteContent = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const contentId = req.params.id;

        const result = await pool.query(
            `DELETE FROM content_items c
             USING rooms r
             WHERE c.room_id = r.id AND c.id = $1 AND r.center_id = $2
             RETURNING c.id`,
            [contentId, centerId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Content not found');
        }

        res.status(200).json({
            success: true,
            message: 'Content deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const reorderContent = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const roomId = req.params.roomId;
        const { contentOrder } = req.body; // Array of { id, sortOrder }

        if (!contentOrder || !Array.isArray(contentOrder)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Content order array is required');
        }

        const roomCheck = await pool.query(
            `SELECT id FROM rooms WHERE id = $1 AND center_id = $2`,
            [roomId, centerId]
        );

        if (roomCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Room not found');
        }

        for (const item of contentOrder) {
            await pool.query(
                `UPDATE content_items SET sort_order = $1 WHERE id = $2 AND room_id = $3`,
                [item.sortOrder, item.id, roomId]
            );
        }

        res.status(200).json({
            success: true,
            message: 'Content reordered successfully'
        });

    } catch (err) {
        console.error('Error reordering content:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};




module.exports = {
    addContent,
    getRoomContentAdmin,
    updateContent,
    deleteContent,
    reorderContent,
    getTeacherContentForCenter
};
