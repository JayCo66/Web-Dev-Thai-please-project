const authService = require('../services/authService');
const prisma = require('../config/prisma');

/**
 * POST /api/v1/auth/login-thaid
 */
async function loginThaiD(req, res) {
  try {
    const { citizenId, fullName } = req.body;

    if (!citizenId) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุเลขประจำตัวประชาชน 13 หลัก',
      });
    }

    const result = await authService.loginWithThaiD({
      citizenId,
      fullName,
    });

    return res.status(200).json({
      success: true,
      message: result.isNew
        ? 'เข้าสู่ระบบและสร้างกระดานภารกิจเริ่มต้นผ่าน ThaiD สำเร็จ'
        : 'เข้าสู่ระบบผ่าน ThaiD สำเร็จ',
      data: result,
    });
  } catch (error) {
    console.error('Error in loginThaiD:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการ ThaiD',
    });
  }
}

/**
 * POST /api/v1/auth/login
 */
async function loginCredentials(req, res) {
  try {
    const { identifier, password } = req.body;
    const result = await authService.loginWithCredentials({ identifier, password });

    return res.status(200).json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: result,
    });
  } catch (error) {
    console.error('Error in loginCredentials:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
    });
  }
}

/**
 * POST /api/v1/users/register-thai-please
 */
async function registerCitizen(req, res) {
  try {
    const { citizenId, fullName, phoneNumber, email, password, pin, provinceCode } = req.body;

    const result = await authService.registerCitizen({
      citizenId,
      fullName,
      phoneNumber,
      email,
      password,
      pin,
      provinceCode,
    });

    return res.status(201).json({
      success: true,
      message: 'ลงทะเบียนเข้าร่วมโครงการไทยช่วยไทยพลีสสำเร็จ ยินดีต้อนรับสู่ระบบ',
      data: result,
    });
  } catch (error) {
    console.error('Error in registerCitizen:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน',
    });
  }
}

/**
 * POST /api/v1/merchants/register
 */
async function registerMerchant(req, res) {
  try {
    const { shopName, contactName, phoneNumber, email, password, addressLine, category } = req.body;

    const result = await authService.registerMerchant({
      shopName,
      contactName,
      phoneNumber,
      email,
      password,
      addressLine,
      category,
    });

    return res.status(201).json({
      success: true,
      message: 'ลงทะเบียนร้านค้าเข้าร่วมโครงการไทยช่วยไทยพลีสสำเร็จ',
      data: result,
    });
  } catch (error) {
    console.error('Error in registerMerchant:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียนร้านค้า',
    });
  }
}

/**
 * GET /api/v1/users/me
 */
async function getCurrentUser(req, res) {
  try {
    const profile = await authService.getUserProfile(req.user.userId);
    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเรียกข้อมูลโปรไฟล์',
    });
  }
}

/**
 * Seed demo data check
 */
async function seedDemoAccounts(req, res) {
  return res.status(200).json({
    success: true,
    message: 'บัญชีทดสอบระบบพร้อมใช้งาน',
    demoAccounts: [
      {
        role: 'ประชาชน (Citizen)',
        name: 'นายสมชาย ใจดี',
        identifier: '1100500123451 หรือ 0812345678',
        password: 'password123',
        pin: '123456',
      },
      {
        role: 'ร้านค้า (Merchant)',
        name: 'ร้านป้าพร อาหารตามสั่ง',
        identifier: '0898765432 หรือ paporntasty@gmail.com',
        password: 'password123',
      },
      {
        role: 'ผู้ดูแลระบบ (Admin)',
        name: 'นายสมศักดิ์ ผู้ดูแลระบบ',
        identifier: 'admin@thaiplease.go.th',
        password: 'password123',
      },
      {
        role: 'ผู้บริหารภาครัฐ (Gov Executive)',
        name: 'ผศ.ดร. ดวงเพ็ญ เจตน์พิพัฒนพงษ์',
        identifier: 'executive@thaiplease.go.th',
        password: 'password123',
      },
    ],
  });
}

/**
 * List provinces for dropdown
 */
function getProvinces(req, res) {
  const provinces = [
    { code: 'BKK', nameTh: 'กรุงเทพมหานคร' },
    { code: 'NPT', nameTh: 'นครปฐม' },
    { code: 'NBI', nameTh: 'นนทบุรี' },
    { code: 'PTE', nameTh: 'ปทุมธานี' },
    { code: 'SPK', nameTh: 'สมุทรปราการ' },
    { code: 'CMI', nameTh: 'เชียงใหม่' },
    { code: 'KKN', nameTh: 'ขอนแก่น' },
    { code: 'NMA', nameTh: 'นครราชสีมา' },
    { code: 'CPN', nameTh: 'ชลบุรี' },
    { code: 'PKT', nameTh: 'ภูเก็ต' },
    { code: 'OTHER', nameTh: 'จังหวัดอื่น ๆ ทั่วประเทศ' },
  ];
  return res.json({ success: true, data: provinces });
}

module.exports = {
  loginThaiD,
  loginCredentials,
  registerCitizen,
  registerMerchant,
  getCurrentUser,
  seedDemoAccounts,
  getProvinces,
};
