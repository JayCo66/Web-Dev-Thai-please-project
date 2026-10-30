const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const { demoOnly, handleError, randomUUID } = require("../utils/operations");
exports.login = async (req, res) => {
  try {
    demoOnly();
    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: "ผู้ใช้ทดลอง",
          email: `demo-${randomUUID()}@example.test`,
          role: "CITIZEN",
          demo_balance: 500,
        },
      });
      await tx.token_transactions.create({
        data: {
          user_id: user.user_id,
          amount: 50,
          type: "EARN_CELL",
          event_key: `welcome:${user.user_id}`,
        },
      });
      return user;
    });
    const token = jwt.sign(
      { user_id: user.user_id.toString(), roles: [user.role] },
      process.env.JWT_SECRET || "thai_please_super_secret_jwt_key_2026",
      { expiresIn: "7d" },
    );
    res.json({
      success: true,
      data: {
        token,
        user: {
          userId: user.user_id.toString(),
          fullName: user.name,
          role: user.role,
        },
        tokens: 50,
        wallet: { balance: "500.00", simulation: true },
        simulation: true,
      },
    });
  } catch (error) {
    handleError(res, error, "เริ่มบัญชีทดลองไม่สำเร็จ");
  }
};
