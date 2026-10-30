const prisma = require("../config/prisma");
const { charityMedia } = require("../services/charityMedia");
const {
  money,
  positiveId,
  requestKey,
  lockUser,
  demoOnly,
  fail,
  handleError,
  randomUUID,
} = require("../utils/operations");

function calculateDonationBonusTokens(amount) {
  return Math.max(1, Math.floor(money(amount) / 20));
}
async function getCharities(req, res) {
  try {
    const [charities, totals, donors] = await Promise.all([
      prisma.charities.findMany({
        where: { is_active: true },
        orderBy: { charity_id: "asc" },
      }),
      prisma.donations.groupBy({
        by: ["charity_id"],
        _sum: { amount: true },
        _count: { donation_id: true },
      }),
      prisma.donations.groupBy({ by: ["charity_id", "user_id"] }),
    ]);
    res.json({
      success: true,
      data: charities.map((c) => {
        const total = totals.find((t) => t.charity_id === c.charity_id);
        return {
          charityId: c.charity_id.toString(),
          ...charityMedia(c),
          name: c.name,
          description: c.description,
          impactType: c.impact_type,
          totalDonations: Number(total?._sum.amount || 0),
          donationCount: total?._count.donation_id || 0,
          donorCount: donors.filter((d) => d.charity_id === c.charity_id)
            .length,
          simulation: true,
        };
      }),
    });
  } catch (error) {
    handleError(res, error, "โหลดมูลนิธิไม่สำเร็จ");
  }
}
async function donateToCharity(req, res) {
  try {
    demoOnly();
    const userId = BigInt(req.user.userId);
    const amount = money(req.body.amount);
    const charityId = positiveId(req.body.charityId);
    const key = requestKey(req, "donation");
    const {
      ensureCurrentBoard,
      syncActivityInTransaction,
    } = require("./questController");
    await ensureCurrentBoard(userId.toString());
    const data = await prisma.$transaction(
      async (tx) => {
        const user = await lockUser(tx, userId);
        let donation = await tx.donations.findUnique({
          where: { request_key: key },
          include: { charities: true },
        });
        if (donation) {
          if (
            Number(donation.amount) !== amount ||
            donation.charity_id !== charityId
          )
            fail("รายการเดิมมีข้อมูลต่างกัน กรุณาเริ่มรายการใหม่", 409);
          return donationView(donation, Number(user.demo_balance), null, true);
        }
        const charity = await tx.charities.findUnique({
          where: { charity_id: charityId },
        });
        if (!charity?.is_active) fail("มูลนิธินี้ยังไม่เปิดรับรายการ", 404);
        if (Number(user.demo_balance) < amount)
          fail("เงินทดลองไม่พอ กรุณาเติมเงินทดลองก่อน");
        const updated = await tx.users.update({
          where: { user_id: userId },
          data: { demo_balance: { decrement: amount } },
        });
        donation = await tx.donations.create({
          data: {
            user_id: userId,
            charity_id: charityId,
            amount,
            request_key: key,
            edonation_ref: `DEMO-${randomUUID()}`,
          },
          include: { charities: true },
        });
        await tx.token_transactions.create({
          data: {
            user_id: userId,
            amount: calculateDonationBonusTokens(amount),
            type: "EARN_CELL",
            event_key: `${key}:bonus`,
          },
        });
        const questUpdate = await syncActivityInTransaction(
          tx,
          userId.toString(),
        );
        return donationView(
          donation,
          Number(updated.demo_balance),
          questUpdate,
        );
      },
      { timeout: 15000 },
    );
    res.status(data.replayed ? 200 : 201).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "บันทึกการบริจาคทดลองไม่สำเร็จ");
  }
}
function donationView(d, remainingBalance, questUpdate, replayed = false) {
  return {
    donationId: d.donation_id.toString(),
    charityName: d.charities.name,
    charityId: d.charity_id.toString(),
    impactType: d.charities.impact_type,
    amount: Number(d.amount),
    reference: d.edonation_ref,
    donatedAt: d.donated_at,
    bonusTokensAwarded: calculateDonationBonusTokens(d.amount),
    remainingBalance,
    questUpdate,
    replayed,
    simulation: true,
  };
}
async function getMyDonations(req, res) {
  try {
    const list = await prisma.donations.findMany({
      where: { user_id: BigInt(req.user.userId) },
      include: { charities: true },
      orderBy: { donated_at: "desc" },
    });
    res.json({ success: true, data: list.map((d) => donationView(d)) });
  } catch (error) {
    handleError(res, error, "โหลดประวัติบริจาคไม่สำเร็จ");
  }
}
module.exports = {
  calculateDonationBonusTokens,
  getCharities,
  donateToCharity,
  getMyDonations,
};
