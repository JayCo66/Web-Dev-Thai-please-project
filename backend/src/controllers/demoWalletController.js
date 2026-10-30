const prisma = require("../config/prisma");
const {
  requestKey,
  lockUser,
  demoOnly,
  fail,
  handleError,
} = require("../utils/operations");

exports.topUp = async (req, res) => {
  try {
    demoOnly();
    const key = requestKey(req, "topup");
    const userId = BigInt(req.user.userId);
    const data = await prisma.$transaction(async (tx) => {
      const user = await lockUser(tx, userId);
      const previous = await tx.token_transactions.findUnique({
        where: { event_key: key },
      });
      if (previous)
        return { balance: Number(user.demo_balance), replayed: true };
      if (Number(user.demo_balance) + 500 > 10000)
        fail("กระเป๋าทดลองเติมได้สูงสุด 10,000 บาท");
      const updated = await tx.users.update({
        where: { user_id: userId },
        data: { demo_balance: { increment: 500 } },
      });
      await tx.token_transactions.create({
        data: { user_id: userId, amount: 0, type: "EARN_CELL", event_key: key },
      });
      return {
        balance: Number(updated.demo_balance),
        added: 500,
        simulation: true,
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, "เติมเงินทดลองไม่สำเร็จ กรุณาลองใหม่");
  }
};
