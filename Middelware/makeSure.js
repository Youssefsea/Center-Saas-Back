/**
 * Authentication & Authorization Middleware
 * Fixed async/await patterns and added role-based access
 */

const jwt = require('jsonwebtoken');
const pool = require('../Clouds/Data');

const sureToken = (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }
    
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
    });
  }
};

/**
 * Require student role
 */
const isStudent = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Students only' }
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require teacher role and load teacher ID
 */
const isTeacher = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Teachers only' }
      });
    }
    
    const result = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Teacher profile not found' }
      });
    }
    
    req.user.teacherId = result.rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require center_admin role and load center ID
 */
const isCenterAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'center_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Center admins only' }
      });
    }
    
    const result = await pool.query(
      'SELECT id FROM centers WHERE owner_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Center not found' }
      });
    }
    
    req.user.centerId = result.rows[0].id;
    req.user.adminId = result.rows[0].id; 
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require super_admin role
 */
const isSuperAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Super admins only' }
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Allow multiple roles
 * @param  {...string} roles - Allowed roles
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Access denied: Requires one of: ${roles.join(', ')}` }
      });
    }
    next();
  };
};

// Legacy exports for backward compatibility
const SureRoleStudent = isStudent;
const SureRoleTeacher = isTeacher;
const SureRoleAdmin = isCenterAdmin;

module.exports = {
  sureToken,
  isStudent,
  isTeacher,
  isCenterAdmin,
  isSuperAdmin,
  hasRole,
  // Legacy
  SureRoleStudent,
  SureRoleTeacher,
  SureRoleAdmin
};