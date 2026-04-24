const pool=require('../Clouds/Data');
const sendError = (res, status, code, message, meta = {}) =>
    res.status(status).json({ success: false, error: { code, message, ...meta } }); // ✅ FIXED: normalized error response shape


const studentAttendAtCenter=async(req,res)=>{
try
{
const centerId=req.user.adminId;
const userID=req.user.id;
const StudentId=req.body.StudentId;
const sessionId=req.body.sessionId;
const amount_paid=req.body.amount_paid;

if(!centerId || !StudentId || !sessionId){
    return sendError(res, 400, 'VALIDATION_ERROR', 'Center ID, Student ID, and Session ID are required');
}
const qr_code=toString(StudentId+sessionId);
const addToBooking=await pool.query('INSERT INTO bookings ( student_id, session_id, amount_paid,qr_code) VALUES ($1, $2,$3, $4) RETURNING *',[StudentId,sessionId,amount_paid,qr_code]);
const bookingId=addToBooking.rows[0].id;
const addToAttendance=await pool.query('INSERT INTO attendances (booking_id, scanned_by) VALUES ($1, $2) RETURNING *',[bookingId,userID]);
const studentInfo=await pool.query('SELECT name FROM users WHERE id = $1',[StudentId]);
res.status(200).json({success: true, message:'Student attendance recorded successfully', attendance:addToAttendance.rows[0], student: studentInfo.rows[0]}); // ✅ FIXED: standardized success response shape

}
catch(err)
{
    console.error('Error in studentAttendAtCenter:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
}


}



module.exports = { studentAttendAtCenter };
