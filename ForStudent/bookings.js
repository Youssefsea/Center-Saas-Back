const pool = require('../Clouds/Data');
const crypto = require('crypto');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const bookSession = async (req, res) => {
     const client = await pool.connect(); 
    try {
        const studentId = req.user.id;
        const { sessionId } = req.body;

        if (!sessionId) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Session ID is required');
        }
  await client.query('BEGIN');
        const sessionResult = await client.query(
            `SELECT id,center_id ,price, capacity, seats_booked, status, scheduled_at 
             FROM sessions WHERE id = $1`,
            [sessionId]
        );

        console.log('Session query result:', sessionResult.rows);
        if (sessionResult.rows.length === 0) {
            await client.query('ROLLBACK'); // ✅ FIXED: rollback before early return in transaction
            return sendError(res, 404, 'NOT_FOUND', 'Session not found');
        }

        const session = sessionResult.rows[0];

        if (session.status !== 'scheduled') {
            await client.query('ROLLBACK'); // ✅ FIXED: rollback before early return in transaction
            return sendError(res, 400, 'VALIDATION_ERROR', 'Session is not available for booking');
        }

        if (session.seats_booked >= session.capacity) {
            await client.query('ROLLBACK'); // ✅ FIXED: rollback before early return in transaction
            return sendError(res, 400, 'SESSION_FULL', 'Session is full');
        }

        if (new Date(session.scheduled_at) <= new Date()) {
            console.warn(`Attempt to book session ${sessionId} that has already started.`);
            await client.query('ROLLBACK'); // ✅ FIXED: rollback before early return in transaction
            return sendError(res, 400, 'VALIDATION_ERROR', 'Session has already started');
        }

        const existingBooking = await client.query(
            `SELECT id FROM bookings WHERE session_id = $1 AND student_id = $2`,
            [sessionId, studentId]
        );

        if (existingBooking.rows.length > 0) {
            await client.query('ROLLBACK'); // ✅ FIXED: rollback before early return in transaction
            return sendError(res, 400, 'ALREADY_BOOKED', 'You have already booked this session');
        }

        const balanceResult = await client.query(
            `SELECT COALESCE(
                SUM(CASE 
                    WHEN type IN ('deposit', 'refund') AND status = 'completed' THEN amount
                    WHEN type IN ('withdrawal', 'booking_charge') AND status = 'completed' THEN -amount
                    ELSE 0
                END), 0
            ) AS balance
            FROM wallet_transactions WHERE user_id = $1`,
            [studentId]
        );

        const balance = parseFloat(balanceResult.rows[0].balance);
        const price = parseFloat(session.price);

        if (balance < price) {
            await client.query('ROLLBACK'); 
            return sendError(res, 400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance', {
                required: price,
                current: balance
            });
        }

        const qrCode = String(studentId +'_'+sessionId).concat('_', crypto.randomBytes(4).toString('hex'));

        const bookingResult = await client.query(
            `INSERT INTO bookings (session_id, student_id, status, qr_code, amount_paid)
             VALUES ($1, $2, 'confirmed', $3, $4)
             RETURNING id, session_id, status, qr_code, amount_paid, booked_at`,
            [sessionId, studentId, qrCode, price]
        );

        await client.query(
            `INSERT INTO wallet_transactions (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
             VALUES ($1, $2, 'booking_charge', 'completed', $3, 'booking', 'Session booking charge', NOW())`,
            [studentId, price, bookingResult.rows[0].id]
        );
        const CenterOwnerID=await client.query('SELECT owner_id FROM centers WHERE id = $1',[session.center_id]);

     const addMoneyToCenter=await client.query(
    `INSERT INTO wallet_transactions (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
     VALUES ($1, $2, 'transfer', 'completed', $3, 'booking', 'Earning from session booking', NOW())`,
    [CenterOwnerID.rows[0].owner_id, price, bookingResult.rows[0].id]
);
        await client.query(
            `UPDATE sessions SET seats_booked = seats_booked + 1 WHERE id = $1`,
            [sessionId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            booking: bookingResult.rows[0]
        });


    } catch (err) {
        console.error('Error booking session:', err);
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
        finally {
        client.release();
        }
};

const getMyBookings = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { status } = req.query;

        let query = `
            SELECT 
                b.id,
                b.status,
                b.qr_code,
                b.amount_paid,
                b.booked_at,
                s.id AS session_id,
                s.teacher_id,
                u.name AS teacher_name,
                json_build_object(
                    'id', s.id,
                    'subject', s.subject,
                    'grade_level', s.grade_level,
                    'scheduled_at', s.scheduled_at,
                    'duration_min', s.duration_min,
                    'status', s.status
                ) AS session,
                c.name AS center_name,
                u.name AS teacher_name
            FROM bookings b
            JOIN sessions s ON s.id = b.session_id
            JOIN centers c ON c.id = s.center_id
            JOIN teachers t ON t.id = s.teacher_id
            JOIN users u ON u.id = t.user_id
            WHERE b.student_id = $1
        `;

        const params = [studentId];

        if (status) {
            query += ` AND b.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY b.booked_at DESC`;

        const result = await pool.query(query, params);

        res.status(200).json({
            success: true,
            bookings: result.rows
        });

    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const studentId = req.user.id;
        const bookingId = req.params.id;

        const bookingResult = await pool.query(
            `SELECT b.id, b.status, b.amount_paid, b.student_id, s.scheduled_at
             FROM bookings b
             JOIN sessions s ON s.id = b.session_id
             WHERE b.id = $1`,
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Booking not found');
        }

        const booking = bookingResult.rows[0];

        if (booking.student_id !== studentId) {
            return sendError(res, 403, 'FORBIDDEN', 'You can only cancel your own bookings');
        }

        if (!['pending', 'confirmed'].includes(booking.status)) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'This booking cannot be cancelled');
        }

        if (new Date(booking.scheduled_at) <= new Date()) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Cannot cancel after session has started');
        }

        await pool.query(
            `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
            [bookingId]
        );

        await pool.query(
            `INSERT INTO wallet_transactions (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
             VALUES ($1, $2, 'refund', 'completed', $3, 'booking', 'Booking cancellation refund', NOW())`,
            [studentId, booking.amount_paid, bookingId]
        );

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            refund_amount: booking.amount_paid
        });

    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

module.exports = {
    bookSession,
    getMyBookings,
    cancelBooking
};
