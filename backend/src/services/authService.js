const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const {
  hashCitizenId,
  hashPassword,
  comparePassword,
  hashPin,
  validateThaiCitizenId,
  maskCitizenId,
  maskPhoneNumber,
  maskEmail,
} = require('../utils/security');

const JWT_SECRET = process.env.JWT_SECRET || 'thai_please_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id.toString(),
      email: user.email,
      roles: [user.role],
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Calculate user total Impact Tokens
 */
async function getUserTotalTokens(userId, db = prisma) {
  const txs = await db.token_transactions.findMany({
    where: { user_id: BigInt(userId) },
    select: { amount: true },
  });
  return txs.reduce((acc, curr) => acc + curr.amount, 0);
}

/**
 * Register Citizen
 */
async function registerCitizen({
  citizenId,
  fullName,
  phoneNumber,
  email,
  password,
  pin,
  provinceCode = 'BKK',
}) {
  const cleanCitizenId = String(citizenId).replace(/\D/g, '');
  if (!validateThaiCitizenId(cleanCitizenId)) {
    const error = new Error('เลขประจำตัวประชาชน 13 หลักไม่ถูกต้องตามหลักการคำนวณของกรมการปกครอง');
    error.statusCode = 400;
    throw error;
  }

  if (!fullName || fullName.trim().length < 3) {
    const error = new Error('กรุณาระบุชื่อ-นามสกุลให้ถูกต้องครบถ้วน');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = phoneNumber ? String(phoneNumber).replace(/\D/g, '') : null;
  if (!cleanPhone || cleanPhone.length !== 10) {
    const error = new Error('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก (เช่น 0812345678)');
    error.statusCode = 400;
    throw error;
  }

  const citizenHash = hashCitizenId(cleanCitizenId);
  const existingCitizen = await prisma.users.findUnique({
    where: { thai_id_hash: citizenHash },
  });
  if (existingCitizen) {
    const error = new Error('เลขประจำตัวประชาชนนี้ได้ลงทะเบียนเข้าร่วมโครงการไทยช่วยไทยแล้ว');
    error.statusCode = 400;
    throw error;
  }

  if (cleanPhone) {
    const existingPhone = await prisma.users.findUnique({
      where: { phone_number: cleanPhone },
    });
    if (existingPhone) {
      const error = new Error('หมายเลขโทรศัพท์นี้ถูกใช้งานในระบบแล้ว');
      error.statusCode = 400;
      throw error;
    }
  }

  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = await prisma.users.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      const error = new Error('อีเมลนี้ถูกใช้งานในระบบแล้ว');
      error.statusCode = 400;
      throw error;
    }
  }

  const passwordHash = password ? await hashPassword(password) : null;
  const pinHash = pin ? await hashPin(pin) : null;

  const newUser = await prisma.users.create({
    data: {
      thai_id_hash: citizenHash,
      thai_id_encrypted: maskCitizenId(cleanCitizenId),
      name: fullName.trim(),
      email: email && email.trim() ? email.trim().toLowerCase() : null,
      phone_number: cleanPhone,
      password_hash: passwordHash,
      pin_hash: pinHash,
      province_code: provinceCode || 'BKK',
      role: 'CITIZEN',
    },
  });

  // Grant initial Welcome Impact Tokens
  await prisma.token_transactions.create({
    data: {
      user_id: newUser.user_id,
      amount: 50,
      type: 'EARN_CELL',
    },
  });

  const token = generateToken(newUser);

  return {
    token,
    user: {
      userId: newUser.user_id.toString(),
      fullName: newUser.name,
      maskedCitizenId: maskCitizenId(cleanCitizenId),
      maskedPhone: maskPhoneNumber(newUser.phone_number),
      maskedEmail: maskEmail(newUser.email),
      provinceCode: newUser.province_code,
      role: newUser.role,
      roles: [newUser.role],
    },
    tokens: 50,
    wallet: {
      balance: '500.00',
      copayRate: '60%',
      dailyQuota: '150.00',
      totalQuota: '3000.00',
    },
  };
}

/**
 * Register Merchant
 */
async function registerMerchant({
  shopName,
  contactName,
  phoneNumber,
  email,
  password,
  addressLine,
  category = 'อาหารและเครื่องดื่ม',
}) {
  if (!shopName || shopName.trim().length < 2) {
    const error = new Error('กรุณาระบุชื่อร้านค้า');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = phoneNumber ? String(phoneNumber).replace(/\D/g, '') : null;
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

  let user = null;
  if (cleanPhone) {
    user = await prisma.users.findUnique({ where: { phone_number: cleanPhone } });
  }
  if (!user && cleanEmail) {
    user = await prisma.users.findUnique({ where: { email: cleanEmail } });
  }

  if (!user) {
    const passwordHash = password ? await hashPassword(password) : null;
    user = await prisma.users.create({
      data: {
        name: contactName || shopName,
        phone_number: cleanPhone,
        email: cleanEmail,
        password_hash: passwordHash,
        role: 'MERCHANT',
      },
    });
  }

  const newShop = await prisma.shops.create({
    data: {
      shop_name: shopName.trim(),
      category: category || 'อาหารและเครื่องดื่ม',
      address: addressLine || '',
      owner_user_id: user.user_id,
      is_active: true,
    },
  });

  const token = generateToken(user);

  return {
    token,
    user: {
      userId: user.user_id.toString(),
      fullName: user.name,
      maskedPhone: maskPhoneNumber(user.phone_number),
      maskedEmail: maskEmail(user.email),
      role: user.role,
      roles: [user.role],
    },
    shop: {
      shopId: newShop.shop_id.toString(),
      shopName: newShop.shop_name,
      category: newShop.category,
    },
  };
}

/**
 * Login with Credentials
 */
async function loginWithCredentials({ identifier, password }) {
  if (!identifier || !password) {
    const error = new Error('กรุณากรอกข้อมูลเข้าสู่ระบบและรหัสผ่าน');
    error.statusCode = 400;
    throw error;
  }

  const clean = identifier.trim();
  const digitsOnly = clean.replace(/\D/g, '');

  let user = null;
  if (digitsOnly.length === 13) {
    const citizenHash = hashCitizenId(digitsOnly);
    user = await prisma.users.findUnique({ where: { thai_id_hash: citizenHash } });
  }

  if (!user && digitsOnly.length === 10) {
    user = await prisma.users.findUnique({ where: { phone_number: digitsOnly } });
  }

  if (!user && clean.includes('@')) {
    user = await prisma.users.findUnique({ where: { email: clean.toLowerCase() } });
  }

  if (!user) {
    const error = new Error('ไม่พบบัญชีผู้ใช้งานที่ตรงกับข้อมูลที่ระบุ');
    error.statusCode = 404;
    throw error;
  }

  if (!user.password_hash) {
    const error = new Error('บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาเข้าสู่ระบบผ่าน ThaiD');
    error.statusCode = 400;
    throw error;
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);
  const totalTokens = await getUserTotalTokens(user.user_id);

  let shopInfo = null;
  if (user.role === 'MERCHANT') {
    const shop = await prisma.shops.findFirst({
      where: { owner_user_id: user.user_id },
    });
    if (shop) {
      shopInfo = {
        shopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
        category: shop.category,
      };
    }
  }

  return {
    token,
    user: {
      userId: user.user_id.toString(),
      fullName: user.name,
      maskedPhone: maskPhoneNumber(user.phone_number),
      maskedEmail: maskEmail(user.email),
      maskedCitizenId: user.thai_id_encrypted,
      provinceCode: user.province_code,
      role: user.role,
      roles: [user.role],
    },
    tokens: totalTokens,
    wallet: {
      balance: '500.00',
      copayRate: '60%',
      dailyQuota: '150.00',
      totalQuota: '3000.00',
    },
    shop: shopInfo,
  };
}

/**
 * Login with ThaiD
 */
async function loginWithThaiD({ citizenId, fullName }) {
  const cleanId = String(citizenId || '').replace(/\D/g, '');
  if (cleanId.length !== 13) {
    const error = new Error('เลขประจำตัวประชาชนต้องมี 13 หลัก');
    error.statusCode = 400;
    throw error;
  }

  const citizenHash = hashCitizenId(cleanId);
  let user = await prisma.users.findUnique({
    where: { thai_id_hash: citizenHash },
  });

  let isNew = false;
  if (!user) {
    isNew = true;
    user = await prisma.users.create({
      data: {
        thai_id_hash: citizenHash,
        thai_id_encrypted: maskCitizenId(cleanId),
        name: fullName || 'ประชาชนผู้ใช้สิทธิ์ ThaiD',
        province_code: 'BKK',
        role: 'CITIZEN',
      },
    });

    // Grant 50 Welcome Impact Tokens
    await prisma.token_transactions.create({
      data: {
        user_id: user.user_id,
        amount: 50,
        type: 'EARN_CELL',
      },
    });
  }

  const token = generateToken(user);
  const totalTokens = await getUserTotalTokens(user.user_id);

  return {
    token,
    isNew,
    user: {
      userId: user.user_id.toString(),
      fullName: user.name,
      maskedCitizenId: user.thai_id_encrypted || maskCitizenId(cleanId),
      maskedPhone: maskPhoneNumber(user.phone_number),
      role: user.role,
      roles: [user.role],
    },
    tokens: totalTokens,
    wallet: {
      balance: '500.00',
      copayRate: '60%',
      dailyQuota: '150.00',
      totalQuota: '3000.00',
    },
  };
}

/**
 * Get User Profile
 */
async function getUserProfile(userId) {
  const user = await prisma.users.findUnique({
    where: { user_id: BigInt(userId) },
    include: {
      shops: true,
      bingo_boards: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  });

  if (!user) {
    const error = new Error('ไม่พบบัญชีผู้ใช้');
    error.statusCode = 404;
    throw error;
  }

  const totalTokens = await getUserTotalTokens(user.user_id);
  const shop = user.shops && user.shops.length > 0 ? user.shops[0] : null;

  return {
    userId: user.user_id.toString(),
    fullName: user.name,
    maskedPhone: maskPhoneNumber(user.phone_number),
    maskedEmail: maskEmail(user.email),
    maskedCitizenId: user.thai_id_encrypted,
    provinceCode: user.province_code,
    role: user.role,
    roles: [user.role],
    tokens: totalTokens,
    wallet: {
      balance: '500.00',
      copayRate: '60%',
      dailyQuota: '150.00',
      totalQuota: '3000.00',
    },
    activeBoard: user.bingo_boards && user.bingo_boards.length > 0 ? user.bingo_boards[0] : null,
    shop: shop
      ? {
          shopId: shop.shop_id.toString(),
          shopName: shop.shop_name,
          category: shop.category,
        }
      : null,
  };
}

module.exports = {
  getUserTotalTokens,
  registerCitizen,
  registerMerchant,
  loginWithCredentials,
  loginWithThaiD,
  getUserProfile,
};
