const express = require('express');
const router = express.Router();

const authRoutes = require('./Auth');
const centerRoutes = require('./ForCenter/CenterAdmin');
const StudentRoutes = require('./ForStudent/student');
const bookingRoutes = require('./ForStudent/bookings');
const walletRoutes = require('./ForStudent/wallet');
const studentRoomRoutes = require('./ForStudent/rooms');
const reviewRoutes = require('./ForStudent/reviews');
const attendanceRoutes = require('./ForCenter/attendance');
const centerRoomRoutes = require('./ForCenter/rooms');
const contentRoutes = require('./ForCenter/content');
const adminRoutes = require('./Admin');
const upload = require('./Middelware/upload');
const teacherRoutes = require('./ForTeacher/teacher');

const { sureToken, isStudent, isTeacher, isCenterAdmin, isSuperAdmin } = require('./Middelware/makeSure');

router.post('/auth/register', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), authRoutes.registerUser); // ✅ FIXED: added multer fields middleware for avatar/logo
router.post('/auth/login', authRoutes.loginUser);

router.get('/users/me', sureToken, authRoutes.getUserProfile);
router.put('/users/me', sureToken, authRoutes.updateUserProfile);

router.get('/centers/me', sureToken, isCenterAdmin, centerRoutes.getCenterProfile);
router.put('/centers/me', sureToken, isCenterAdmin, centerRoutes.updateCenterProfile);
router.post('/centers/teachers', sureToken, isCenterAdmin, centerRoutes.AddTeacherToCenter);
router.delete('/centers/teachers', sureToken, isCenterAdmin, centerRoutes.RemoveTeacherFromCenter);
router.get('/centers/teachers', sureToken, isCenterAdmin, centerRoutes.GetCenterTeachers);
router.get('/centers/teachers/:teacherId/content', sureToken, isCenterAdmin, contentRoutes.getTeacherContentForCenter);

router.post('/centers/sessions', sureToken, isCenterAdmin, centerRoutes.addSessionToCenterWithConflictCheck);
router.put('/centers/sessions/:sessionId', sureToken, isCenterAdmin, centerRoutes.updateSessionInCenterWithConflictCheck);
router.put('/centers/sessions/:sessionId/cancel', sureToken, isCenterAdmin, centerRoutes.cancelSession);
router.delete('/centers/sessions/:sessionId', sureToken, isCenterAdmin, centerRoutes.deleteSessionFromCenter);
router.get('/centers/sessions', sureToken, isCenterAdmin, centerRoutes.GetAllSessionsOfCenter);

router.post('/attendance/scan', sureToken, isCenterAdmin, attendanceRoutes.recordAttendance);
router.post('/attendance/scan/AtCenter', sureToken, isCenterAdmin, attendanceRoutes.StudentAttendAtCenter);
router.get('/centers/sessions/:id/attendance', sureToken, isCenterAdmin, attendanceRoutes.getSessionAttendance);

router.post('/rooms', sureToken, isCenterAdmin, centerRoomRoutes.createRoom);
router.get('/centers/rooms', sureToken, isCenterAdmin, centerRoomRoutes.getCenterRooms);
router.put('/rooms/:id', sureToken, isCenterAdmin, centerRoomRoutes.updateRoom);
router.delete('/rooms/:id', sureToken, isCenterAdmin, centerRoomRoutes.deleteRoom);
router.get('/rooms/:id/members', sureToken, isCenterAdmin, centerRoomRoutes.getRoomMembers);
router.post('/rooms/:id/regenerate-code', sureToken, isCenterAdmin, centerRoomRoutes.regenerateAccessCode);

router.post('/rooms/:roomId/content', sureToken, isCenterAdmin, contentRoutes.addContent);
router.get('/centers/rooms/:roomId/content', sureToken, isCenterAdmin, contentRoutes.getRoomContentAdmin);
router.put('/content/:id', sureToken, isCenterAdmin, contentRoutes.updateContent);
router.delete('/content/:id', sureToken, isCenterAdmin, contentRoutes.deleteContent);
router.put('/rooms/:roomId/content/reorder', sureToken, isCenterAdmin, contentRoutes.reorderContent);


router.get('/teachers/:id', StudentRoutes.DetelsOfTeacher);
router.get('/teachers/:id/reviews', StudentRoutes.getTeacherReviews);

router.get('/teacher/me', sureToken, isTeacher, teacherRoutes.teacherDetels);
router.get('/teacher/me/stats', sureToken, isTeacher, teacherRoutes.statsOFTeacher);
router.get('/teacher/me/centers', sureToken, isTeacher, teacherRoutes.teacherCenters);
router.get('/teacher/me/sessions', sureToken, isTeacher, teacherRoutes.teacherSessions);
router.get('/teacher/me/reviews', sureToken, isTeacher, teacherRoutes.teacherReviews);
router.get('/teacher/me/content', sureToken, isTeacher, teacherRoutes.ContentCenter);
router.post('/teacher/me/content', sureToken, isTeacher, teacherRoutes.addContentToCenter);
router.put('/teacher/me/content/:contentId', sureToken, isTeacher, teacherRoutes.UpdateContent);
router.delete('/teacher/me/content/:contentId', sureToken, isTeacher, teacherRoutes.DeleteContent);

router.get('/discovery/centers/nearby', StudentRoutes.getNearbyCenters);
router.get('/discovery/centers/search', StudentRoutes.SearchForCenters);
router.get('/discovery/teachers/search', StudentRoutes.SearchForTeachers);
router.get('/discovery/subjects', StudentRoutes.GetAllSubjects);
router.get('/discovery/centers/:id/sessions', StudentRoutes.GetAllSessionsOFCenter);
router.get('/discovery/centers/:id', StudentRoutes.DetelsOfCenter);


router.post('/bookings', sureToken, isStudent, bookingRoutes.bookSession); // ✅ FIXED: ensured isStudent guard on student-only endpoint
router.get('/bookings/me', sureToken, bookingRoutes.getMyBookings);
router.put('/bookings/:id/cancel', sureToken, bookingRoutes.cancelBooking);

router.get('/wallet/balance', sureToken, walletRoutes.getWalletBalance);
router.get('/wallet/transactions', sureToken, walletRoutes.getTransactionHistory);
router.post('/wallet/deposit', sureToken, walletRoutes.depositToWallet);

router.post('/rooms/join', sureToken, isStudent, studentRoomRoutes.joinRoom); 
router.get('/rooms/me', sureToken, studentRoomRoutes.getMyRooms);
router.get('/rooms/:roomId/content', sureToken, studentRoomRoutes.getRoomContent);
router.put('/rooms/:roomId/upgrade', sureToken, studentRoomRoutes.upgradeRoomAccess);
router.get('/rooms/:roomId/content/token', sureToken,isStudent, studentRoomRoutes.getContentToken);
router.get('/rooms/:roomId/content/stream', sureToken,isStudent, studentRoomRoutes.streamContent);
router.post('/reviews', sureToken, isStudent, reviewRoutes.submitReview); 
router.put('/reviews/:id', sureToken, reviewRoutes.updateReview);
router.delete('/reviews/:id', sureToken, reviewRoutes.deleteReview);

router.get('/admin/users', sureToken, isSuperAdmin, adminRoutes.getAllUsers);
router.get('/admin/users/:id', sureToken, isSuperAdmin, adminRoutes.getUserDetails);
router.put('/admin/users/:id/status', sureToken, isSuperAdmin, adminRoutes.toggleUserStatus);
router.get('/admin/analytics', sureToken, isSuperAdmin, adminRoutes.getPlatformAnalytics);
router.get('/admin/audit-logs', sureToken, isSuperAdmin, adminRoutes.getAuditLogs);

module.exports=router;
