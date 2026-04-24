const pool = require('../Clouds/Data');
const crypto = require('crypto');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const recordAttendance = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const { qrCode } = req.body;


        if (!qrCode) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'QR code is required');
        }

        const qrCodeParts = qrCode.split('_');
        if (qrCodeParts.length !== 3) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid QR code format');
        }
        const StudentId = qrCodeParts[0];
        const sessionId = qrCodeParts[1];

        const sessionCheck = await pool.query(
            `SELECT id, center_id FROM sessions WHERE id = $1`,
            [sessionId]
        );
        if (sessionCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Session not found');
        }
        if (sessionCheck.rows[0].center_id !== centerId) {
            return sendError(res, 403, 'FORBIDDEN', 'This session does not belong to your center');
        }


        const bookingResult = await pool.query(
            `SELECT
                b.id AS booking_id,
                b.student_id,
                b.status AS booking_status,
                s.scheduled_at,
                s.duration_min,
                s.subject,
                u.name AS student_name,
                s.center_id
             FROM bookings b
             JOIN sessions s ON s.id = b.session_id
             JOIN users u ON u.id = b.student_id
             WHERE b.qr_code = $1`,
            [qrCode]
        );

        if (bookingResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Booking not found');
        }
if (bookingResult.rows.length > 1) {
    console.warn(`Multiple bookings found for QR code ${qrCode}. This should not happen.`);
}



        const booking = bookingResult.rows[0];

        if (booking.center_id !== centerId) {
            return sendError(res, 403, 'FORBIDDEN', 'This booking is not for your center');
        }
        

        if (booking.booking_status === 'attended') {
            return sendError(res, 400, 'ALREADY_ATTENDED', 'Attendance already recorded');
        }

        if (booking.booking_status !== 'confirmed') {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid booking status for attendance');
        }

        const sessionStart = new Date(booking.scheduled_at);
        const sessionEnd = new Date(sessionStart.getTime() + booking.duration_min * 60000);
        const earlyCheckIn = new Date(sessionStart.getTime() - 15 * 60000); 
        const now = new Date();
        let errormsg = '';

        if (now < earlyCheckIn) {
            return sendError(res, 400, 'TOO_EARLY', 'Can check in 15 minutes before session start it is ' + earlyCheckIn+'and now is '+now);
        }

        if (now > sessionEnd) {
            try{
            await pool.query('insert into notifications (user_id, message, type) values ($1, $2, $3)', [booking.student_id, `You missed your session on ${sessionStart.toLocaleString('en-US')}. Please contact the center for rescheduling.`, 'session_missed']);
            }
            catch(err){
                console.error('Error sending missed session notification:', err);
                errormsg += 'Failed to send missed session notification. ';

            }
            return sendError(res, 400, 'OUTSIDE_TIME_WINDOW', 'Session has already ended');
        }

        const attendanceResult = await pool.query(
            `INSERT INTO attendances (booking_id, scanned_by, scanned_at)
             VALUES ($1, $2, NOW())
             RETURNING id, scanned_at`,
            [booking.booking_id, req.user.id]
        );
try {
        await pool.query(
            `UPDATE bookings SET status = 'attended' WHERE id = $1`,
            [booking.booking_id]
        );
    }
    catch(err){
        console.error('Error updating booking status to attended:', err);
 return sendError(res, 500, 'SERVER_ERROR', 'Failed to update booking status to attended');
    };
    try{
        await pool.query('insert into notifications (user_id, message, type) values ($1, $2, $3)', [booking.student_id, `Your attendance for the session on ${sessionStart.toLocaleString('en-US')} has been recorded successfully.`, 'attendance_recorded']);
    }
    catch(err){
        console.error('Error sending attendance recorded notification:', err);
        errormsg += 'Failed to send attendance recorded notification. ';
    }

        

        res.status(200).json({
            success: true,
            message: 'Attendance recorded',
            attendance: {
                id: attendanceResult.rows[0].id,
                booking_id: booking.booking_id,
                student_name: booking.student_name,
                session_subject: booking.subject,
                scanned_at: attendanceResult.rows[0].scanned_at
            },

            errormsg: errormsg.trim() ? errormsg.trim() : undefined
        });

    } catch (err) {
        console.error('Error recording attendance:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const getSessionAttendance = async (req, res) => {
    try {
        const centerId = req.user.centerId;
        const sessionId = req.params.id;

        const sessionCheck = await pool.query(
            `SELECT id FROM sessions WHERE id = $1 AND center_id = $2`,
            [sessionId, centerId]
        );

        if (sessionCheck.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Session not found');
        }

        const attendanceResult = await pool.query(
            `SELECT 
                b.id AS booking_id,
                b.student_id,
                b.status,
                u.name AS student_name,
                u.avatar_url AS student_avatar,
                a.scanned_at
            FROM bookings b
            JOIN users u ON u.id = b.student_id
            LEFT JOIN attendances a ON a.booking_id = b.id
            WHERE b.session_id = $1
            ORDER BY u.name ASC`,
            [sessionId]
        );

        const total = attendanceResult.rows.length;
        const attended = attendanceResult.rows.filter(r => r.status === 'attended').length;
        const noShow = attendanceResult.rows.filter(r => r.status === 'confirmed').length;
        const cancelled = attendanceResult.rows.filter(r => r.status === 'cancelled').length;

        res.status(200).json({
            success: true, // ✅ FIXED: standardized success response shape
            session_id: sessionId,
            attendance: attendanceResult.rows.map(row => ({
                student_id: row.student_id,
                student_name: row.student_name,
                student_avatar: row.student_avatar,
                status: row.status,
                scanned_at: row.scanned_at
            })),
            summary: {
                total_booked: total,
                attended: attended,
                no_show: noShow,
                cancelled: cancelled
            }
        });

    } catch (err) {
        console.error('Error fetching attendance:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const StudentAttendAtCenter = async (req, res) => {
    const client = await pool.connect();
    try {
        const centerId = req.user.centerId;
        const userID = req.user.id;
        const { StudentId, sessionId, amount_paid } = req.body;

        if (!StudentId || !sessionId) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Student ID and Session ID are required');
        }

        await client.query('BEGIN');

        const sessionCheck = await client.query(
            `SELECT id, center_id, scheduled_at, duration_min FROM sessions WHERE id = $1`,
            [sessionId]
        );

        if (sessionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'NOT_FOUND', 'Session not found');
        }

        if (sessionCheck.rows[0].center_id !== centerId) {
            await client.query('ROLLBACK');
            return sendError(res, 403, 'FORBIDDEN', 'This session does not belong to your center');
        }

        const session = sessionCheck.rows[0];
        const sessionStart = new Date(session.scheduled_at);
        const sessionEnd = new Date(sessionStart.getTime() + session.duration_min * 60000);
        const earlyCheckIn = new Date(sessionStart.getTime() - 15 * 60000);
        const now = new Date();

        if (now < earlyCheckIn) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: { code: 'TOO_EARLY', message: 'Can check in 15 minutes before session start, it is ' + earlyCheckIn }
            });
        }

        if (now > sessionEnd) {
            await client.query('ROLLBACK');
            try {
                await pool.query(
                    `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
                    [StudentId, `You missed your session on ${sessionStart.toLocaleString('en-US')}. Please contact the center for rescheduling.`, 'session_missed']
                );
            } catch (notifErr) {
                console.error('Error sending missed session notification:', notifErr);
            }
            return sendError(res, 400, 'OUTSIDE_TIME_WINDOW', 'Session has already ended');
        }

        const studentCheck = await client.query(
            `SELECT id, name FROM users WHERE id = $1`,
            [StudentId]
        );

        if (studentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'NOT_FOUND', 'Student not found');
        }

        const existingBooking = await client.query(
            `SELECT id, status FROM bookings WHERE student_id = $1 AND session_id = $2`,
            [StudentId, sessionId]
        );

        if (existingBooking.rows.length > 0) {
            await client.query('ROLLBACK');
            return sendError(res, 400, 'VALIDATION_ERROR', 'Student already booked this session');
        }

        const qr_code = `${StudentId}_${sessionId}_${crypto.randomBytes(4).toString('hex')}`;

        const addToBooking = await client.query(
            `INSERT INTO bookings (student_id, session_id, amount_paid, qr_code, status, booked_at)
             VALUES ($1, $2, $3, $4, 'confirmed', NOW())
             RETURNING id`,
            [StudentId, sessionId, amount_paid || 0, qr_code]
        );

        const bookingId = addToBooking.rows[0].id;

        const addToAttendance = await client.query(
            `INSERT INTO attendances (booking_id, scanned_by, scanned_at)
             VALUES ($1, $2, NOW())
             RETURNING id, scanned_at`,
            [bookingId, userID]
        );

        await client.query(
            `UPDATE bookings SET status = 'attended' WHERE id = $1`,
            [bookingId]
        );

        if (amount_paid && amount_paid > 0) {
            await client.query(
                `INSERT INTO wallet_transactions 
                    (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
                 VALUES ($1, $2, 'deposit', 'completed', $3, 'booking', 'Cash payment at center', NOW())`,
                [StudentId, amount_paid, bookingId]
            );

            const centerOwner = await client.query(
                `SELECT owner_id FROM centers WHERE id = $1`,
                [centerId]
            );

            if (centerOwner.rows.length > 0) {
                await client.query(
                    `INSERT INTO wallet_transactions 
                        (user_id, amount, type, status, reference_id, reference_type, description, completed_at)
                     VALUES ($1, $2, 'transfer', 'completed', $3, 'booking', 'Cash earning from session booking', NOW())`,
                    [centerOwner.rows[0].owner_id, amount_paid, bookingId]
                );
            }
        }

        await client.query('COMMIT');

        try {
            await pool.query(
                `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
                [StudentId, `Your attendance for the session on ${sessionStart.toLocaleString('en-US')} has been recorded successfully.`, 'attendance_recorded']
            );
        } catch (notifErr) {
            console.error('Error sending attendance notification:', notifErr);
        }

        res.status(200).json({
            success: true, // ✅ FIXED: standardized success response shape
            message: 'Student attendance recorded successfully',
            attendance: {
                id: addToAttendance.rows[0].id,
                booking_id: bookingId,
                scanned_by: userID,
                scanned_at: addToAttendance.rows[0].scanned_at
            },
            student: {
                id: StudentId,
                name: studentCheck.rows[0].name
            },
            payment: amount_paid && amount_paid > 0 ? {
                amount: amount_paid,
                method: 'cash',
                status: 'completed'
            } : undefined
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in studentAttendAtCenter:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    } finally {
        client.release();
    }
};

module.exports = {
    recordAttendance,
    getSessionAttendance,
    StudentAttendAtCenter
};
