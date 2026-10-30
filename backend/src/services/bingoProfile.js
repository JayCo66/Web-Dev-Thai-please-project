const {
  DAY,
  THAI_OFFSET,
  categoryOf,
  thaiDateParts,
  evaluateQuestProgress,
  familyOf,
  RULES,
} = require("./questMetrics");

function safeJson(value, fallback) {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function buildUserMissionInput(db, userId, now = new Date()) {
  // Thirty complete Bangkok days. Names, citizen IDs and contact details never leave the server.
  const today = new Date(`${thaiDateParts(now).date}T00:00:00+07:00`);
  const from = new Date(today.getTime() - 30 * DAY);
  const [pool, activity, pastMerchants, boards] = await Promise.all([
    db.bingo_quests.findMany({
      where: {
        is_active: true,
        verification_type: "AUTO_TRANSACTION",
        quest_code: { not: null },
      },
    }),
    db.transactions.findMany({
      where: {
        user_id: BigInt(userId),
        status: "COMPLETED",
        paid_at: { gte: from, lt: today },
      },
      include: { shops: true },
    }),
    db.transactions.findMany({
      where: {
        user_id: BigInt(userId),
        status: "COMPLETED",
        paid_at: { lt: from },
      },
      select: { shop_id: true },
      distinct: ["shop_id"],
    }),
    db.bingo_boards.findMany({
      where: { user_id: BigInt(userId) },
      orderBy: { board_id: "desc" },
      take: 12,
    }),
  ]);
  const historicCells = boards.flatMap(
    (b) => safeJson(b.snapshot, {}).cells || [],
  );
  const historyFor = (code) => {
    const cells = historicCells.filter((c) => c.quest_code === code);
    if (!cells.length) return null;
    return {
      offered: cells.length,
      completed: cells.filter(
        (c) => c.status === "COMPLETED" || c.status === "CLAIMED",
      ).length,
    };
  };
  const mix = { food_drink: 0, general_goods: 0, other: 0 };
  const spend = { food_drink: 0, general_goods: 0, other: 0 };
  const names = { FOOD: "food_drink", RETAIL: "general_goods", OTHER: "other" };
  for (const tx of activity) {
    const name = names[categoryOf(tx)];
    mix[name]++;
    spend[name] += Number(tx.total_amount);
  }
  for (const key of Object.keys(spend))
    spend[key] = Math.round(spend[key] * 100) / 100;
  const completed = historicCells.filter(
    (c) => c.status === "COMPLETED" || c.status === "CLAIMED",
  ).length;
  const quests = pool
    .filter((q) => RULES[q.quest_code])
    .map((q) => {
      const ladder = safeJson(q.levels_json, []);
      if (ladder.length < 3) return null;
      const achieved = evaluateQuestProgress(q.quest_code, activity, {
        previousMerchantIds: pastMerchants.map((t) => t.shop_id),
      });
      // A little stretch is allowed, but absence of evidence never forces a harder target.
      let safeLevel = 1;
      if (activity.length >= 5 && achieved >= ladder[1] * 0.8) safeLevel = 2;
      if (activity.length >= 12 && achieved >= ladder[2] * 0.8) safeLevel = 3;
      return {
        quest_id: q.quest_id.toString(),
        quest_code: q.quest_code,
        text: q.title,
        family: familyOf(q.quest_code),
        unit: q.unit || "ครั้ง",
        ladder,
        achieved_last_period: achieved,
        safe_level: safeLevel,
        bingo_history: historyFor(q.quest_code),
      };
    })
    .filter(Boolean);
  return {
    board: {
      cells: 24,
      levels: [1, 3],
      period_days: 30,
      center_quest: "DONATION",
    },
    user_profile: {
      mode: "purchases_and_bingo_history",
      period: {
        from: thaiDateParts(from).date,
        to: thaiDateParts(new Date(today.getTime() - 1)).date,
      },
      transactions_last_period: activity.length,
      spend_last_period:
        Math.round(
          activity.reduce((sum, tx) => sum + Number(tx.total_amount), 0) * 100,
        ) / 100,
      category_mix_last_period: mix,
      category_spend_last_period: spend,
      active_days_last_period: new Set(
        activity.map((t) => thaiDateParts(t.paid_at).date),
      ).size,
      distinct_merchants_last_period: new Set(
        activity.map((t) => String(t.shop_id)),
      ).size,
      confidence: Math.min(1, activity.length / 20),
      bingo_history: historicCells.length
        ? {
            boards_played: boards.length,
            cells_offered: historicCells.length,
            cells_completed: completed,
            completion_rate: completed / historicCells.length,
          }
        : null,
    },
    quests,
  };
}

module.exports = { buildUserMissionInput, safeJson };
