const { test } = require("node:test");
const assert = require("node:assert/strict");
const { arrangeFairBoardLayout } = require("../src/services/questService");
const {
  analyzeBingoLines,
  calculateBoardYield,
} = require("../src/controllers/questController");
test("layout preserves all quests and donation slot for varied difficulty distributions", () => {
  for (let hard = 0; hard <= 4; hard++) {
    const cells = Array.from({ length: 24 }, (_, i) => ({
      quest_code: `Q${i}`,
      level: i < hard ? 3 : i < 12 ? 2 : 1,
    }));
    const result = arrangeFairBoardLayout(cells, {
      quest_code: "DONATION",
      level: null,
    });
    assert.equal(result.length, 25);
    assert.equal(result[12].quest_code, "DONATION");
    assert.equal(new Set(result.map((c) => c.quest_code)).size, 25);
    const completed = result.map((c, position) => ({
      ...c,
      position,
      status: "COMPLETED",
    }));
    assert.ok(analyzeBingoLines(completed).every((l) => l.tokenReward >= 40));
  }
});
test("bonus opportunity is identical across beginner and experienced boards", () => {
  assert.equal(
    calculateBoardYield(24).lineTokens,
    calculateBoardYield(40).lineTokens,
  );
  assert.equal(calculateBoardYield(24).lineTokens, 68);
});
