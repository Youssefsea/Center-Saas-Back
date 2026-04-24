const pool = require('../Clouds/Data');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape

const submitReview = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { teacherId, rating, comment } = req.body;

        if (!teacherId || !rating) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Teacher ID and rating are required');
        }

        if (rating < 1 || rating > 5) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Rating must be between 1 and 5');
        }

        const teacherResult = await pool.query(
            `SELECT id FROM teachers WHERE id = $1`,
            [teacherId]
        );

        if (teacherResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Teacher not found');
        }

    const attendanceCheck = await pool.query(
        `SELECT b.id, s.teacher_id 
 FROM bookings b
 JOIN sessions s ON s.id = b.session_id
 WHERE b.student_id = $1 
   AND b.status = 'attended'
   AND s.teacher_id = $2
 LIMIT 1`,
        [studentId, teacherId]
    );


if (attendanceCheck.rows.length === 0) {
    return sendError(res, 403, 'FORBIDDEN', 'You must attend a session with this teacher before leaving a review');
}
    const bookingid =  attendanceCheck.rows[0].id 



        if (attendanceCheck.rows.length === 0) {
            return sendError(res, 403, 'FORBIDDEN', 'You must attend a session with this teacher before leaving a review');
        }

        const existingReview = await pool.query(
            `SELECT id FROM reviews WHERE student_id = $1 AND teacher_id = $2`,
            [studentId, teacherId]
        );

        if (existingReview.rows.length > 0) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'You have already reviewed this teacher');
        }

        const result = await pool.query(
            `INSERT INTO reviews (student_id,booking_id, teacher_id, rating, comment)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, rating, comment, created_at`,
            [studentId, bookingid, teacherId, rating, comment || null]
        );


        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review: result.rows[0]
        });

    } catch (err) {
        console.error('Error submitting review:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const updateReview = async (req, res) => {
    try {
        const studentId = req.user.id;
        const reviewId = req.params.id;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Rating must be between 1 and 5');
        }

        const reviewResult = await pool.query(
            `SELECT id FROM reviews WHERE id = $1 AND student_id = $2`,
            [reviewId, studentId]
        );

        if (reviewResult.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Review not found or you are not the author');
        }

        const result = await pool.query(
            `UPDATE reviews SET rating = $1, comment = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING id, rating, comment, updated_at`,
            [rating, comment || null, reviewId]
        );

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            review: result.rows[0]
        });

    } catch (err) {
        console.error('Error updating review:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

const deleteReview = async (req, res) => {
    try {
        const studentId = req.user.id;
        const reviewId = req.params.id;

        const result = await pool.query(
            `DELETE FROM reviews WHERE id = $1 AND student_id = $2 RETURNING id`,
            [reviewId, studentId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 404, 'NOT_FOUND', 'Review not found or you are not the author');
        }

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
    }
};

module.exports = {
    submitReview,
    updateReview,
    deleteReview
};
