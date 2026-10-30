// Live Typhoon quality probe using fictional transaction histories only.
// It does not call the database, create users, or write application state.
require("dotenv").config({ quiet: true });
process.env.AI_DEBUG_LOG = "false";

const assert = require("node:assert/strict");
const { evaluateQuestProgress } = require("../src/services/questMetrics");
const { generateBingoMissionsWithAI } = require("../src/services/questService");
const fixture = require("../examples/generate-board.mock.json");

const PERSONAS = [
  {
    name: "food-heavy-one-shop",
    transactions: 10,
    merchants: 1,
    foodTransactions: 10,
    retailTransactions: 0,
    activeDays: 6,
    amount: 120,
    previouslyCompleted: ["TX_COUNT_ANY", "REPEAT_MERCHANT_ANY"],
  },
  {
    name: "balanced-many-shops",
    transactions: 24,
    merchants: 12,
    foodTransactions: 12,
    retailTransactions: 12,
    activeDays: 14,
    amount: 160,
    previouslyCompleted: ["DISTINCT_MERCHANTS_ANY", "NEW_MERCHANTS_ANY"],
  },
  {
    name: "retail-heavy-two-shops",
    transactions: 16,
    merchants: 2,
    foodTransactions: 3,
    retailTransactions: 13,
    activeDays: 9,
    amount: 180,
    previouslyCompleted: ["CATEGORY_COUNT_GD", "SPEND_TOTAL_GD"],
  },
];

function makePersonaInput(persona) {
  const transactions = Array.from({ length: persona.transactions }, (_, index) => {
    const category = index < persona.foodTransactions ? "FOOD" : "RETAIL";
    const day = index % persona.activeDays;
    // 03:00 UTC is 10:00 in Bangkok; rotate times within the 30-day window.
    const paidAt = new Date(Date.UTC(2026, 9, 1 + day, 3 + (index % 10), 0, 0));
    return {
      transaction_id: `SYNTH-${persona.name}-${index}`,
      status: "COMPLETED",
      shop_id: `SHOP-${index % persona.merchants}`,
      shops: { category },
      total_amount: persona.amount,
      paid_at: paidAt,
    };
  });
  const categoryMix = { food_drink: 0, general_goods: 0, other: 0 };
  const categorySpend = { food_drink: 0, general_goods: 0, other: 0 };
  for (const tx of transactions) {
    const bucket = tx.shops.category === "FOOD" ? "food_drink" : "general_goods";
    categoryMix[bucket]++;
    categorySpend[bucket] += tx.total_amount;
  }
  const completed = new Set(persona.previouslyCompleted);
  const quests = structuredClone(fixture.quests).map((quest) => {
    const achieved = evaluateQuestProgress(quest.quest_code, transactions);
    let supportedLevel = 1;
    if (transactions.length >= 5 && achieved >= quest.ladder[1] * 0.8)
      supportedLevel = 2;
    if (transactions.length >= 12 && achieved >= quest.ladder[2] * 0.8)
      supportedLevel = 3;
    return {
      ...quest,
      achieved_last_period: achieved,
      safe_level: 3,
      supported_level: supportedLevel,
      bingo_history: completed.has(quest.quest_code)
        ? { offered: 1, completed: 1 }
        : null,
    };
  });
  return {
    board: structuredClone(fixture.board),
    user_profile: {
      ...structuredClone(fixture.user_profile),
      board_phase: "PERSONALIZED",
      period: { from: "2026-09-30", to: "2026-10-30" },
      transactions_last_period: transactions.length,
      spend_last_period: transactions.reduce((sum, tx) => sum + tx.total_amount, 0),
      category_mix_last_period: categoryMix,
      category_spend_last_period: categorySpend,
      active_days_last_period: new Set(transactions.map((tx) => tx.paid_at.toISOString().slice(0, 10))).size,
      distinct_merchants_last_period: new Set(transactions.map((tx) => tx.shop_id)).size,
      bingo_history: {
        boards_played: 1,
        cells_offered: 24,
        cells_completed: completed.size,
        completion_rate: completed.size / 24,
      },
    },
    quests,
  };
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  const intersection = [...a].filter((code) => b.has(code)).length;
  const union = new Set([...a, ...b]).size;
  return union ? Number((intersection / union).toFixed(3)) : 1;
}

(async () => {
  if (!process.env.TYPHOON_API_KEY)
    throw new Error("Configure TYPHOON_API_KEY in backend/.env first");

  const results = [];
  for (const persona of PERSONAS) {
    const generated = await generateBingoMissionsWithAI(makePersonaInput(persona));
    const selectedCodes = generated.bingo_board_5x5
      .filter((cell) => cell.family !== "DONATION")
      .map((cell) => cell.quest_code);
    if (generated.source === "AI") {
      assert.equal(generated.aiEvidence?.validation?.questCount, 24);
      assert.equal(generated.aiEvidence?.validation?.selectionRubricPassed, true);
    }
    const audit = generated.personalizationEvidence.selectionAudit;
    results.push({
      persona: persona.name,
      source: generated.source,
      fallbackReason: generated.aiDiagnostics.failureCode,
      providerSelectionWarnings: generated.aiDiagnostics.selectionQualityWarnings,
      profile: {
        transactions: generated.personalizationEvidence.profile.transactions,
        distinctMerchants: generated.personalizationEvidence.profile.distinctMerchants,
        categoryMix: generated.personalizationEvidence.profile.categoryMix,
      },
      checks: audit.checks,
      metrics: audit.metrics,
      warnings: audit.warnings,
      selectedCodes,
    });
  }

  const comparisons = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      comparisons.push({
        personas: [results[i].persona, results[j].persona],
        selectedMissionJaccard:
          results[i].source === "AI" && results[j].source === "AI"
            ? jaccard(results[i].selectedCodes, results[j].selectedCodes)
            : null,
      });
    }
  }
  const heuristicFailures = results.flatMap((result) =>
    Object.entries(result.checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => `${result.persona}:${check}`),
  );
  const distinctAiDifficultyProfiles = new Set(
    results
      .filter((result) => result.source === "AI")
      .map((result) => JSON.stringify(result.metrics.levels)),
  ).size;

  console.log(JSON.stringify({
    input: "3 fictional, behaviorally distinct profiles; no DB reads/writes or PII",
    evaluation: "catalog validity and predeclared selection heuristics; not real-user outcome proof",
    results: results.map(({ selectedCodes, ...result }) => result),
    comparisons,
    summary: {
      aiAcceptedBoards: results.filter((result) => result.source === "AI").length,
      ruleBasedFallbackBoards: results.filter((result) => result.source !== "AI").length,
      heuristicFailures,
      differentAiSelectionSets: comparisons.filter((item) => item.selectedMissionJaccard !== null && item.selectedMissionJaccard < 1).length,
      distinctAiDifficultyProfiles,
    },
  }, null, 2));
})().catch((error) => {
  // Do not print request bodies, provider responses or credentials.
  console.error(`AI quality evaluation failed: ${error.message}`);
  process.exitCode = 1;
});
