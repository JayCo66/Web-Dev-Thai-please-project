const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildUserMissionInput } = require("../src/services/bingoProfile");
const fixture = require("../examples/generate-board.mock.json");
test("personalization includes today, switches after a stored first board, and excludes simulated completions", async () => {
  const now = new Date("2026-10-30T12:00:00+07:00");
  const payment = {
    transaction_id: 1n,
    shop_id: 1n,
    total_amount: 50,
    paid_at: new Date("2026-10-30T11:30:00+07:00"),
    status: "COMPLETED",
    shops: { category: "อาหาร" },
  };
  let queriedEnd;
  const cells = Array.from({ length: 25 }, (_, i) => ({
    quest_code: i < 2 ? "TX_COUNT_ANY" : "Q" + i,
    status: i < 2 ? "COMPLETED" : "IN_PROGRESS",
    demo_completed: i === 0,
  }));
  const db = {
    bingo_quests: {
      findMany: async () =>
        fixture.quests.map((q, i) => ({
          quest_id: BigInt(i + 1),
          quest_code: q.quest_code,
          title: q.text,
          unit: q.unit,
          levels_json: JSON.stringify(q.ladder),
        })),
    },
    transactions: {
      findMany: async (args) => {
        if (args.include) {
          queriedEnd = args.where.paid_at.lte;
          return [payment];
        }
        return [];
      },
    },
    bingo_boards: { findMany: async () => [{ snapshot: { cells } }] },
  };
  const data = await buildUserMissionInput(db, "1", now);
  assert.equal(queriedEnd.getTime(), now.getTime());
  assert.equal(data.user_profile.board_phase, "PERSONALIZED");
  assert.equal(data.user_profile.transactions_last_period, 1);
  assert.equal(data.user_profile.spend_last_period, 50);
  assert.equal(
    data.quests.find((q) => q.quest_code === "TX_COUNT_ANY").bingo_history
      .completed,
    1,
  );
});
