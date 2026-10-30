const prisma = require("../config/prisma");
const { getUserTotalTokens } = require("../services/authService");
const {
  fail,
  positiveId,
  requestKey,
  lockUser,
  bangkokPeriod,
  demoOnly,
  handleError,
  randomUUID,
} = require("../utils/operations");

function calculateLuckyDrawCost(value, base = 25) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1 || count > 100)
    fail("เลือกจำนวนสิทธิ์ตั้งแต่ 1 ถึง 100");
  return (
    { 1: base, 3: Math.round(base * 2.4), 5: Math.round(base * 3.6) }[count] ||
    count * base
  );
}
function checkMonthlyHardSinkQuota(count, max = 1) {
  return Number(count || 0) < max;
}
function itemView(item) {
  return {
    id: item.redemption_id.toString(),
    kind: item.kind,
    code: item.code,
    rewardId: item.reward_id?.toString() || null,
    tokensSpent: item.token_cost,
    status:
      item.expires_at && item.expires_at < new Date() ? "EXPIRED" : item.status,
    createdAt: item.created_at,
    expiresAt: item.expires_at,
    ...item.metadata,
  };
}
exports.getRewards = async (req, res) => {
  try {
    const list = await prisma.rewards.findMany({
      where: { is_active: true },
      orderBy: { token_cost: "asc" },
    });
    const { month } = bangkokPeriod();
    res.json({
      success: true,
      data: {
        simulation: true,
        prizes: list
          .filter((r) => r.reward_type === "LUCKY_DRAW")
          .map((r) => ({
            rewardId: r.reward_id.toString(),
            name: r.name,
            imageUrl: r.image_url,
            description: r.description,
            tokenCost: r.token_cost,
            packages: [1, 3, 5].map((tickets) => ({
              tickets,
              tokens: calculateLuckyDrawCost(tickets, r.token_cost),
            })),
          })),
        rewards: list
          .filter((r) => r.reward_type !== "LUCKY_DRAW")
          .map((r) => ({
            rewardId: r.reward_id.toString(),
            name: r.name,
            description: r.description,
            rewardType: r.reward_type,
            tokenCost: r.token_cost,
            imageUrl: r.image_url,
          })),
        luckyDrawCampaign: {
          campaignId: `DEMO-${month}`,
          title: "สะสมสิทธิ์ลุ้นรางวัล",
          simulation: true,
          description: "ตั๋วทดลองสำหรับโครงงาน ยังไม่มีการจับรางวัลจริง",
          packages: [
            { tickets: 1, tokens: 25 },
            { tickets: 3, tokens: 60 },
            { tickets: 5, tokens: 90 },
          ],
        },
      },
    });
  } catch (error) {
    handleError(res, error, "โหลดรางวัลไม่สำเร็จ");
  }
};

async function redeem(req, res, lucky) {
  try {
    demoOnly();
    const userId = BigInt(req.user.userId);
    const key = requestKey(req, lucky ? "draw" : "reward");
    const rewardId =
      lucky && !req.body.rewardId ? null : positiveId(req.body.rewardId);
    const count = lucky ? Number(req.body.ticketsCount || 1) : 0;
    if (lucky) calculateLuckyDrawCost(count);
    const result = await prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const previous = await tx.reward_redemptions.findUnique({
        where: { request_key: key },
      });
      if (previous) {
        if (
          (lucky && previous.metadata.ticketsCount !== count) ||
          (rewardId !== null && previous.reward_id !== rewardId)
        )
          fail("รายการเดิมมีข้อมูลต่างกัน กรุณาเริ่มรายการใหม่", 409);
        return {
          ...itemView(previous),
          remainingTokens: await getUserTotalTokens(userId, tx),
          replayed: true,
        };
      }
      const reward = rewardId
        ? await tx.rewards.findUnique({ where: { reward_id: rewardId } })
        : await tx.rewards.findFirst({
            where: { is_active: true, reward_type: "LUCKY_DRAW" },
            orderBy: { reward_id: "asc" },
          });
      if (
        !reward?.is_active ||
        (lucky
          ? reward.reward_type !== "LUCKY_DRAW"
          : reward.reward_type === "LUCKY_DRAW")
      )
        fail("ไม่พบรางวัลที่เลือก", 404);
      const tokenCost = lucky
        ? calculateLuckyDrawCost(count, reward.token_cost)
        : reward.token_cost;
      if (!Number.isSafeInteger(tokenCost) || tokenCost <= 0)
        fail("รางวัลนี้ยังไม่พร้อมให้แลก", 409);
      if (
        !lucky &&
        ["COUPON", "DISCOUNT"].includes(reward.reward_type) &&
        tokenCost >= 500
      ) {
        const used = await tx.reward_redemptions.count({
          where: {
            user_id: userId,
            kind: { in: ["COUPON", "DISCOUNT"] },
            token_cost: { gte: 500 },
            created_at: { gte: bangkokPeriod().monthStart },
          },
        });
        if (!checkMonthlyHardSinkQuota(used))
          fail("ใช้สิทธิ์คูปองมูลค่าสูงครบ 1 ครั้งในเดือนนี้แล้ว");
      }
      const balance = await getUserTotalTokens(userId, tx);
      if (balance < tokenCost)
        fail(`แต้มไม่พอ ขาดอีก ${tokenCost - balance} แต้ม`);
      const code = `DEMO-${randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
      const metadata = lucky
        ? {
            title: `สิทธิ์ลุ้น ${reward.name}`,
            prizeName: reward.name,
            imageUrl: reward.image_url,
            ticketsCount: count,
            campaignId: `DEMO-${bangkokPeriod().month}-${reward.reward_id}`,
            simulation: true,
          }
        : {
            title: reward.name,
            rewardName: reward.name,
            imageUrl: reward.image_url,
            rewardType: reward.reward_type,
            voucherCode: code,
            simulation: true,
          };
      const item = await tx.reward_redemptions.create({
        data: {
          user_id: userId,
          reward_id: reward.reward_id,
          kind: lucky ? "LUCKY_DRAW" : reward.reward_type,
          code,
          metadata,
          token_cost: tokenCost,
          request_key: key,
          expires_at: lucky ? null : new Date(Date.now() + 45 * 86400000),
        },
      });
      await tx.token_transactions.create({
        data: {
          user_id: userId,
          amount: -tokenCost,
          type: "REDEEM_REWARD",
          event_key: key,
        },
      });
      return { ...itemView(item), remainingTokens: balance - tokenCost };
    });
    res
      .status(result.replayed ? 200 : 201)
      .json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, "ทำรายการรางวัลไม่สำเร็จ กรุณาลองใหม่");
  }
}
exports.redeemReward = (req, res) => redeem(req, res, false);
exports.enterLuckyDraw = (req, res) => redeem(req, res, true);
exports.getMyItems = async (req, res) => {
  try {
    const items = await prisma.reward_redemptions.findMany({
      where: { user_id: BigInt(req.user.userId) },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    res.json({ success: true, data: items.map(itemView) });
  } catch (error) {
    handleError(res, error, "โหลดรางวัลของฉันไม่สำเร็จ");
  }
};
exports.getMyTokenHistory = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    const txs = await prisma.token_transactions.findMany({
      where: { user_id: userId, amount: { not: 0 } },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    res.json({
      success: true,
      data: {
        totalTokens: await getUserTotalTokens(userId),
        history: txs.map((t) => ({
          id: t.token_transaction_id.toString(),
          amount: t.amount,
          type: t.type,
          createdAt: t.created_at,
          description:
            t.type === "EARN_LINE"
              ? "โบนัสเส้นบิงโก"
              : t.type === "REDEEM_REWARD"
                ? "แลกรางวัล / สิทธิ์ลุ้น"
                : t.amount > 0
                  ? "ได้รับแต้มจากกิจกรรม"
                  : "ปรับยอดแต้ม",
        })),
      },
    });
  } catch (error) {
    handleError(res, error, "โหลดประวัติแต้มไม่สำเร็จ");
  }
};
exports.instantSpin = (req, res) =>
  res.status(410).json({
    success: false,
    error: "ใช้เมนูแลกรางวัลหรือสะสมสิทธิ์ลุ้นรางวัล",
  });
exports.faucetTokens = (req, res) =>
  res
    .status(403)
    .json({ success: false, error: "สะสมแต้มได้จากการทำภารกิจบิงโกและบริจาค" });
exports.calculateLuckyDrawCost = calculateLuckyDrawCost;
exports.checkMonthlyHardSinkQuota = checkMonthlyHardSinkQuota;
