const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateBingoMissionsWithAI } = require("../src/services/questService");
const {
  analyzeBingoLines,
  rowToBoard,
} = require("../src/controllers/questController");
const { mixedLayout } = require("../src/services/missionPolicy");
const fixture = require("../examples/generate-board.mock.json");
const input = (phase) => {
  const data = structuredClone(fixture);
  data.user_profile.board_phase = phase;
  data.quests.forEach((q) => (q.safe_level = 3));
  return data;
};
const selectAcrossFamilies = (quests) => {
  const buckets = ["ACTIVITY", "VARIETY", "TIME", "SPEND"].map((family) =>
    quests.filter((quest) => quest.family === family),
  );
  const picked = [];
  while (picked.length < 24)
    for (const bucket of buckets)
      if (bucket.length && picked.length < 24) picked.push(bucket.shift());
  return picked;
};
test("first boards have the same mixed goals and positions across different users", async () => {
  const a = input("STARTER"),
    b = input("STARTER");
  b.user_profile.transactions_last_period = 0;
  b.user_profile.spend_last_period = 0;
  b.user_profile.category_mix_last_period = {
    food_drink: 0,
    general_goods: 0,
    other: 0,
  };
  let calls = 0;
  const adapter = async () => {
    calls++;
    throw new Error("Starter should not call AI");
  };
  const first = await generateBingoMissionsWithAI(a, {
      createCompletion: adapter,
    }),
    second = await generateBingoMissionsWithAI(b, {
      createCompletion: adapter,
    });
  assert.equal(calls, 0);
  assert.deepEqual(first.difficultyMix, { easy: 12, medium: 8, hard: 4 });
  assert.deepEqual(
    first.bingo_board_5x5.map((c) => [c.quest_code, c.level, c.target_value]),
    second.bingo_board_5x5.map((c) => [c.quest_code, c.level, c.target_value]),
  );
});
test("the second board reaches AI and keeps AI-proposed levels", async () => {
  const data = input("PERSONALIZED");
  data.user_profile.transactions_last_period = 0;
  data.user_profile.spend_last_period = 0;
  data.user_profile.category_mix_last_period = {
    food_drink: 0,
    general_goods: 0,
    other: 0,
  };
  let calls = 0;
  const board = await generateBingoMissionsWithAI(data, {
    createCompletion: async () => {
      calls++;
      return {
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                cells: selectAcrossFamilies(data.quests)
                  .map((q) => ({ quest_code: q.quest_code, level: 1 })),
              }),
            },
          },
        ],
      };
    },
  });
  assert.equal(calls, 1);
  assert.equal(board.source, "AI");
  assert.deepEqual(board.difficultyMix, { easy: 24, medium: 0, hard: 0 });
  assert.equal(board.personalizationEvidence.profile.transactions, 0);
  assert.equal(board.personalizationEvidence.profile.distinctMerchants, data.user_profile.distinct_merchants_last_period);
});
test("harder lines pay more and every new mixed layout has the same highest bonus", () => {
  const cells = Array.from({ length: 24 }, (_, i) => ({
    quest_code: "Q" + i,
    family: "ACTIVITY",
    level: i < 4 ? 3 : i < 12 ? 2 : 1,
  }));
  for (let i = 0; i < 32; i++) {
    const grid = mixedLayout(cells, {
      quest_code: "DONATION",
      family: "DONATION",
      level: null,
    }).map((c, position) => ({ ...c, position, status: "COMPLETED" }));
    const lines = analyzeBingoLines(grid);
    assert.equal(Math.max(...lines.map((l) => l.tokenReward)), 68);
    assert.ok(new Set(lines.map((l) => l.tokenReward)).size > 1);
    const sorted = [...lines].sort(
      (a, b) => a.difficultyScore - b.difficultyScore,
    );
    assert.ok(sorted[0].tokenReward < sorted.at(-1).tokenReward);
  }
});
test("an already-paid legacy line keeps its original reward in history", () => {
  const cells = Array.from({ length: 25 }, (_, position) => ({
    position,
    level: 1,
    status: "COMPLETED",
  }));
  const row = {
    board_id: 1n,
    board_index: 0,
    status: "ACCEPTED",
    selected_line: "R1",
    snapshot: { version: 2, cells },
  };
  assert.equal(
    rowToBoard(row).lines.find((l) => l.id === "R1").tokenReward,
    20,
  );
});
