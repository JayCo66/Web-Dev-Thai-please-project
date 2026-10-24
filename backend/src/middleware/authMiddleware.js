const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'thai_please_super_secret_jwt_key_2026';

/**
 * Verify JWT Bearer Token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(decoded.user_id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบบัญชีผู้ใช้งานในระบบ',
      });
    }

    const roles = [user.role];
    req.user = {
      userId: user.user_id.toString(),
      fullName: user.name,
      email: user.email,
      phoneNumber: user.phone_number,
      provinceCode: user.province_code,
      role: user.role,
      roles,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
    });
  }
}

/**
 * Role-based authorization middleware
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: 'ท่านไม่มีสิทธิ์ในการเข้าถึงส่วนงานนี้ (Forbidden)',
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
