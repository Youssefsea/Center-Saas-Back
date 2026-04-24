const pool = require('./Clouds/Data');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const getAllUsers = async (req, res) => {
    try {
        const { role, isActive, search, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT id, name, email, phone, role, avatar_url, is_active, created_at, last_login_at
            FROM users
            WHERE 1=1
        `;
        const params = [];
        let countQuery = `
            SELECT COUNT(*) as count
            FROM users
            WHERE 1=1
        `; // ✅ FIXED: define countQuery for pagination
        const countParams = []; // ✅ FIXED: define countParams for pagination

        if (role) {
            params.push(role);
            query += ` AND role = $${params.length}`;
            countParams.push(role);
            countQuery += ` AND role = $${countParams.length}`; // ✅ FIXED: apply same role filter to count query
        }

        if (isActive !== undefined) {
            params.push(isActive === 'true');
            query += ` AND is_active = $${params.length}`;
            countParams.push(isActive === 'true');
            countQuery += ` AND is_active = $${countParams.length}`; // ✅ FIXED: apply same isActive filter to count query
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
            countParams.push(`%${search}%`);
            countQuery += ` AND (name ILIKE $${countParams.length} OR email ILIKE $${countParams.length} OR phone ILIKE $${countParams.length})`; // ✅ FIXED: apply same search filter to count query
        }

        const countResult = await pool.query(countQuery, countParams);

        params.push(parseInt(limit), parseInt(offset));
        query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            users: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getPlatformAnalytics = async (req, res) => {
    try {
        const userStats = await pool.query(`
            SELECT role, COUNT(*) as count FROM users GROUP BY role
        `);

        const centerCount = await pool.query(`
            SELECT COUNT(*) as total, 
                   COUNT(*) FILTER (WHERE is_active = true) as active
            FROM centers
        `);

        const sessionStats = await pool.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
            FROM sessions
        `);

        const bookingStats = await pool.query(`
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                COUNT(*) FILTER (WHERE status = 'attended') as attended,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COALESCE(SUM(amount_paid), 0) as total_revenue
            FROM bookings
        `);

        const roomStats = await pool.query(`
            SELECT 
                COUNT(*) as total_rooms,
                COALESCE(SUM(member_count), 0) as total_memberships,
                COALESCE(SUM(content_count), 0) as total_content
            FROM rooms
        `);

        const recentActivity = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users,
                (SELECT COUNT(*) FROM sessions WHERE created_at >= NOW() - INTERVAL '30 days') as new_sessions,
                (SELECT COUNT(*) FROM bookings WHERE booked_at >= NOW() - INTERVAL '30 days') as new_bookings
        `);

        res.status(200).json({
            success: true,
            analytics: {
                users: {
                    by_role: userStats.rows.reduce((acc, row) => {
                        acc[row.role] = parseInt(row.count);
                        return acc;
                    }, {}),
                    total: userStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
                },
                centers: {
                    total: parseInt(centerCount.rows[0].total),
                    active: parseInt(centerCount.rows[0].active)
                },
                sessions: {
                    total: parseInt(sessionStats.rows[0].total_sessions),
                    scheduled: parseInt(sessionStats.rows[0].scheduled),
                    completed: parseInt(sessionStats.rows[0].completed),
                    cancelled: parseInt(sessionStats.rows[0].cancelled)
                },
                bookings: {
                    total: parseInt(bookingStats.rows[0].total_bookings),
                    confirmed: parseInt(bookingStats.rows[0].confirmed),
                    attended: parseInt(bookingStats.rows[0].attended),
                    cancelled: parseInt(bookingStats.rows[0].cancelled),
                    total_revenue: parseFloat(bookingStats.rows[0].total_revenue)
                },
                rooms: {
                    total: parseInt(roomStats.rows[0].total_rooms),
                    total_memberships: parseInt(roomStats.rows[0].total_memberships),
                    total_content: parseInt(roomStats.rows[0].total_content)
                },
                recent_30_days: {
                    new_users: parseInt(recentActivity.rows[0].new_users),
                    new_sessions: parseInt(recentActivity.rows[0].new_sessions),
                    new_bookings: parseInt(recentActivity.rows[0].new_bookings)
                }
            }
        });

    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { isActive, reason } = req.body;

        if (isActive === undefined) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'isActive field is required');
        }

        const userCheck = await pool.query(
            `SELECT id, role, is_active FROM users WHERE id = $1`,
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'User not found');
        }

        if (userCheck.rows[0].role === 'super_admin') {
            return sendError(res, 403, 'FORBIDDEN', 'Cannot modify super admin accounts');
        }

        await pool.query(
            `UPDATE users SET is_active = $1 WHERE id = $2`,
            [isActive, userId]
        );

        await pool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, 'user', $3, $4)`,
            [req.user.id, isActive ? 'activate_user' : 'deactivate_user', userId, JSON.stringify({ reason: reason || null })]
        );

        res.status(200).json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });

    } catch (err) {
        console.error('Error toggling user status:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const { adminId, action, entityType, fromDate, toDate, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                al.id, al.action, al.entity_type, al.entity_id, al.details, al.created_at,
                u.name AS admin_name, u.email AS admin_email
            FROM audit_logs al
            JOIN users u ON u.id = al.admin_id
            WHERE 1=1
        `;
        const params = [];

        if (adminId) {
            params.push(adminId);
            query += ` AND al.admin_id = $${params.length}`;
        }

        if (action) {
            params.push(action);
            query += ` AND al.action = $${params.length}`;
        }

        if (entityType) {
            params.push(entityType);
            query += ` AND al.entity_type = $${params.length}`;
        }

        if (fromDate) {
            params.push(fromDate);
            query += ` AND al.created_at >= $${params.length}`;
        }

        if (toDate) {
            params.push(toDate);
            query += ` AND al.created_at <= $${params.length}`;
        }

        params.push(parseInt(limit), parseInt(offset));
        query += ` ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            logs: result.rows,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;

        const userResult = await pool.query(
            `SELECT id, name, email, phone, role, avatar_url, is_active, created_at, last_login_at,
                    ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
             FROM users WHERE id = $1`,
            [userId] // ✅ FIXED: use location column from users table
        );

        if (userResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'User not found');
        }

        const user = userResult.rows[0];
        let additionalInfo = {};

        if (user.role === 'teacher') {
            const teacherResult = await pool.query(
                `SELECT id, bio, subjects, grade_levels, rating, total_reviews
                 FROM teachers WHERE user_id = $1`,
                [userId]
            );
            additionalInfo.teacher = teacherResult.rows[0] || null;
        } else if (user.role === 'center_admin') {
            const centerResult = await pool.query(
                `SELECT id, name, address, description, phone, is_active
                 FROM centers WHERE owner_id = $1`,
                [userId]
            );
            additionalInfo.center = centerResult.rows[0] || null;
        } else if (user.role === 'student') {
            const bookingStats = await pool.query(
                `SELECT COUNT(*) as total_bookings,
                        COUNT(*) FILTER (WHERE status = 'attended') as attended
                 FROM bookings WHERE student_id = $1`,
                [userId]
            );
            additionalInfo.booking_stats = bookingStats.rows[0];
        }

        res.status(200).json({
            success: true,
            user: user,
            ...additionalInfo
        });

    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

module.exports = {
    getAllUsers,
    getPlatformAnalytics,
    toggleUserStatus,
    getAuditLogs,
    getUserDetails
};
