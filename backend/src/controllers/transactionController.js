const { discountTerms, calculateDiscount } = require("../services/paymentDiscount");
const prisma = require("../config/prisma");
const {
  money,
  positiveId,
  requestKey,
  lockUser,
  bangkokPeriod,
  demoOnly,
  fail,
  handleError,
} = require("../utils/operations");

function calculateCoPay(totalAmount, usedSubsidyToday = 0, maxDailyCap = 150) {
  const total = money(totalAmount);
  const remaining = Math.max(
    0,
    Math.round(
      (maxDailyCap - Math.max(0, Number(usedSubsidyToday) || 0)) * 100,
    ) / 100,
  );
  const govSubsidy = Math.min(Math.round(total * 0.6 * 100) / 100, remaining);
  return {
    totalAmount: total,
    govSubsidy,
    userPayment: Math.round((total - govSubsidy) * 100) / 100,
    remainingCapAfter: Math.round((remaining - govSubsidy) * 100) / 100,
  };
}
async function getShops(req, res) {
  try {
    const shops = await prisma.shops.findMany({
      where: { is_active: true },
      orderBy: { shop_id: "asc" },
    });
    res.json({
      success: true,
      data: shops.map((s) => ({
        shopId: s.shop_id.toString(),
        shopName: s.shop_name,
        category: s.category,
        address: s.address,
      })),
    });
  } catch (error) {
    handleError(res, error, "โหลดร้านค้าไม่สำเร็จ");
  }
}
async function usedDiscounts(db, userId) {
  const items = await db.reward_redemptions.findMany({ where: { user_id: userId, status: "USED", kind: { in: ["COUPON", "DISCOUNT"] } } });
  return new Map(items.filter(item => item.metadata?.paymentId).map(item => [String(item.metadata.paymentId), item]));
}
function transactionView(t, coupon) {
  return {
    transactionId: t.transaction_id.toString(),
    shopId: t.shop_id.toString(),
    shopName: t.shops?.shop_name,
    category: t.shops?.category,
    totalAmount: Number(t.total_amount),
    originalAmount: Number(coupon?.metadata.originalAmount ?? t.total_amount),
    discountAmount: Number(coupon?.metadata.discountAmount || 0),
    couponRedemptionId: coupon ? String(coupon.redemption_id) : null,
    couponTitle: coupon?.metadata.title || null,
    userAmount: Number(t.user_amount),
    governmentAmount: Number(t.government_amount),
    paidAt: t.paid_at,
    status: t.status,
    simulation: true,
  };
}
async function createPayment(req, res) {
  try {
    demoOnly();
    const userId = BigInt(req.user.userId);
    const amount = money(req.body.amount);
    const shopId = positiveId(req.body.shopId);
    const key = requestKey(req, "payment");
    const couponId = req.body.couponRedemptionId == null ? null : positiveId(req.body.couponRedemptionId);
    const {
      ensureCurrentBoard,
      syncActivityInTransaction,
    } = require("./questController");
    await ensureCurrentBoard(userId.toString());
    const data = await prisma.$transaction(
      async (tx) => {
        const user = await lockUser(tx, userId);
        const previous = await tx.transactions.findUnique({
          where: { request_key: key },
          include: { shops: true },
        });
        if (previous) {
          const coupon = (await usedDiscounts(tx, userId)).get(String(previous.transaction_id));
          if (
            Number(coupon?.metadata.originalAmount ?? previous.total_amount) !== amount ||
            previous.shop_id !== shopId ||
            (coupon ? String(coupon.redemption_id) : null) !== (couponId ? String(couponId) : null)
          )
            fail("รายการเดิมมีข้อมูลต่างกัน กรุณาเริ่มรายการใหม่", 409);
          return {
            ...transactionView(previous, coupon),
            remainingBalance: Number(user.demo_balance),
            replayed: true,
          };
        }
        const shop = await tx.shops.findUnique({ where: { shop_id: shopId } });
        if (!shop?.is_active) fail("ร้านค้านี้ยังไม่เปิดรับรายการ", 404);
        let coupon = null;
        let discountAmount = 0;
        if (couponId) {
          coupon = await tx.reward_redemptions.findFirst({ where: { redemption_id: couponId, user_id: userId } });
          if (!coupon) fail("ไม่พบคูปองของคุณ", 404);
          if (coupon.status !== "AVAILABLE") fail("คูปองนี้ถูกใช้แล้วหรือยังใช้ไม่ได้", 409);
          if (coupon.expires_at && coupon.expires_at <= new Date()) fail("คูปองหมดอายุแล้ว", 409);
          const terms = discountTerms(coupon);
          if (!terms) fail("รายการนี้ไม่ใช่คูปองส่วนลดสำหรับชำระเงิน", 400);
          discountAmount = calculateDiscount(amount, terms);
        }
        const netAmount = Math.round((amount - discountAmount) * 100) / 100;
        const aggregate = await tx.transactions.aggregate({
          where: {
            user_id: userId,
            status: "COMPLETED",
            paid_at: { gte: bangkokPeriod().dayStart },
          },
          _sum: { government_amount: true },
        });
        const usedSubsidy = Number(aggregate._sum.government_amount || 0);
        const { govSubsidy, userPayment, remainingCapAfter } = netAmount > 0
          ? calculateCoPay(netAmount, usedSubsidy)
          : { govSubsidy: 0, userPayment: 0, remainingCapAfter: Math.max(0, 150 - usedSubsidy) };
        if (Number(user.demo_balance) < userPayment)
          fail("เงินทดลองไม่พอ กรุณาเติมเงินทดลองก่อน");
        const updated = await tx.users.update({
          where: { user_id: userId },
          data: { demo_balance: { decrement: userPayment } },
        });
        const payment = await tx.transactions.create({
          data: {
            user_id: userId,
            shop_id: shopId,
            total_amount: netAmount,
            user_amount: userPayment,
            government_amount: govSubsidy,
            status: "COMPLETED",
            request_key: key,
          },
          include: { shops: true },
        });
        if (coupon) {
          coupon = await tx.reward_redemptions.update({
            where: { redemption_id: coupon.redemption_id },
            data: { status: "USED", metadata: { ...coupon.metadata, paymentDiscount: discountTerms(coupon), usedAt: new Date().toISOString(), paymentId: String(payment.transaction_id), shopId: String(shopId), originalAmount: amount, discountAmount } },
          });
        }
        const questUpdate = await syncActivityInTransaction(
          tx,
          userId.toString(),
        );
        return {
          ...transactionView(payment, coupon),
          remainingBalance: Number(updated.demo_balance),
          remainingCapAfter,
          questUpdate,
        };
      },
      { timeout: 15000 },
    );
    res.status(data.replayed ? 200 : 201).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "บันทึกการชำระทดลองไม่สำเร็จ");
  }
}
async function getMyTransactions(req, res) {
  try {
    const list = await prisma.transactions.findMany({
      where: { user_id: BigInt(req.user.userId) },
      include: { shops: true },
      orderBy: { paid_at: "desc" },
    });
    const discounts = await usedDiscounts(prisma, BigInt(req.user.userId));
    res.json({ success: true, data: list.map(item => transactionView(item, discounts.get(String(item.transaction_id)))) });
  } catch (error) {
    handleError(res, error, "โหลดประวัติการใช้จ่ายไม่สำเร็จ");
  }
}
module.exports = { calculateCoPay, getShops, createPayment, getMyTransactions };
