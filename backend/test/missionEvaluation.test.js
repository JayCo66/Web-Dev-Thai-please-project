const { test } = require("node:test");
const assert = require("node:assert/strict");
const { evaluateMissionSelection } = require("../src/services/missionEvaluation");
const fixture = require("../examples/generate-board.mock.json");

function selectedPool() {
  const buckets = ["ACTIVITY", "VARIETY", "TIME", "SPEND"].map((family) =>
    fixture.quests.filter((quest) => quest.family === family),
  );
  const picked = [];
  while (picked.length < 24)
    for (const bucket of buckets)
      if (bucket.length && picked.length < 24) picked.push(bucket.shift());
  return picked.map((quest, index) => ({
    quest_code: quest.quest_code,
    level: (index % 3) + 1,
  }));
}

test("selection rubric checks catalog validity, mission-family breadth and levels", () => {
  const quests = structuredClone(fixture.quests);
  quests.forEach((quest) => {
    quest.safe_level = 3;
    quest.supported_level = 3;
  });
  const report = evaluateMissionSelection(
    {
      ...fixture.user_profile,
      transactions_last_period: 10,
      distinct_merchants_last_period: 1,
    },
    quests,
    selectedPool(),
  );
  assert.equal(report.scope, "selection_heuristics_not_outcome_proof");
  assert.equal(report.checks.valid24UniqueCatalogMissions, true);
  assert.equal(report.checks.coversAvailableFamiliesAtLeastTwice, true);
  assert.equal(report.checks.prioritizesShopVarietyWhenNeeded, true);
  assert.equal(report.metrics.supportedLevelCount, 24);
  assert.equal(report.metrics.withinSupportedLevelCount, 24);
});

test("selection rubric flags weak merchant and category diversity for matching profiles", () => {
  const quests = structuredClone(fixture.quests);
  quests.forEach((quest) => {
    quest.safe_level = 3;
    quest.supported_level = 1;
  });
  const nonVarietyPool = quests.filter((quest) => quest.family !== "VARIETY");
  const lowVariety = nonVarietyPool.slice(0, 24).map((quest, index) => ({
    quest_code: quest.quest_code,
    level: (index % 3) + 1,
  }));
  const report = evaluateMissionSelection(
    {
      transactions_last_period: 8,
      distinct_merchants_last_period: 1,
      category_spend_last_period: {
        food_drink: 700,
        general_goods: 0,
        other: 0,
      },
    },
    quests,
    lowVariety,
  );
  assert.equal(report.metrics.lowMerchantDiversity, true);
  assert.equal(report.metrics.dominantCategory, "food_drink");
  assert.equal(report.metrics.expansionCategories[0], "general_goods");
  assert.equal(report.checks.prioritizesShopVarietyWhenNeeded, false);
  assert.equal(report.metrics.aboveSupportedLevelCount, 16);
  assert.equal(report.metrics.withinSupportedLevelCount, 8);
});

test("high merchant diversity does not trigger an arbitrary variety-mission ceiling", () => {
  const quests = structuredClone(fixture.quests);
  quests.forEach((quest) => (quest.safe_level = 3));
  const selected = selectedPool();
  const report = evaluateMissionSelection(
    {
      transactions_last_period: 24,
      distinct_merchants_last_period: 12,
      category_spend_last_period: { food_drink: 1200, general_goods: 1200, other: 0 },
    },
    quests,
    selected,
  );
  assert.equal(report.metrics.merchantVarietyQuests, 4);
  assert.equal(report.checks.prioritizesShopVarietyWhenNeeded, true);
});

test("a concentrated other category asks for missions in both named categories", () => {
  const quests = structuredClone(fixture.quests);
  quests.forEach((quest) => (quest.safe_level = 3));
  const selected = selectedPool();
  const report = evaluateMissionSelection(
    {
      transactions_last_period: 10,
      distinct_merchants_last_period: 6,
      category_spend_last_period: {
        food_drink: 0,
        general_goods: 0,
        other: 900,
      },
    },
    quests,
    selected,
  );
  assert.deepEqual(report.metrics.expansionCategories, ["food_drink", "general_goods"]);
  assert.deepEqual(Object.keys(report.metrics.expansionMissionCounts), ["food_drink", "general_goods"]);
});
