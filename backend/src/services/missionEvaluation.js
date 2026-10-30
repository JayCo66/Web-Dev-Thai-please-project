const FAMILY_NAMES = ["ACTIVITY", "VARIETY", "TIME", "SPEND"];

function evaluateMissionSelection(profile, quests, selected) {
  const candidates = new Map(quests.map((quest) => [quest.quest_code, quest]));
  const uniqueCodes = new Set(selected.map((item) => item.quest_code));
  const picked = selected
    .map((item) => ({ item, quest: candidates.get(item.quest_code) }))
    .filter(({ quest }) => quest);
  const familyCounts = Object.fromEntries(FAMILY_NAMES.map((name) => [name, 0]));
  const availableFamilyCounts = Object.fromEntries(FAMILY_NAMES.map((name) => [name, 0]));
  for (const quest of quests)
    if (availableFamilyCounts[quest.family] !== undefined)
      availableFamilyCounts[quest.family]++;
  const levels = { easy: 0, medium: 0, hard: 0 };
  const categoryQuestCounts = { food_drink: 0, general_goods: 0, other: 0 };
  let merchantVarietyQuests = 0;
  let previouslyCompletedQuests = 0;
  let aboveSupportedLevelCount = 0;
  let supportedLevelCount = 0;

  for (const { item, quest } of picked) {
    if (familyCounts[quest.family] !== undefined) familyCounts[quest.family]++;
    if (item.level === 1) levels.easy++;
    else if (item.level === 2) levels.medium++;
    else if (item.level === 3) levels.hard++;
    if (quest.quest_code.endsWith("_FD")) categoryQuestCounts.food_drink++;
    else if (quest.quest_code.endsWith("_GD")) categoryQuestCounts.general_goods++;
    else if (quest.quest_code.endsWith("_OTHER")) categoryQuestCounts.other++;
    if (quest.family === "VARIETY") merchantVarietyQuests++;
    if ((quest.bingo_history?.completed || 0) > 0) previouslyCompletedQuests++;
    if (Number.isInteger(quest.supported_level)) {
      supportedLevelCount++;
      if (item.level > quest.supported_level) aboveSupportedLevelCount++;
    }
  }

  const spend = profile.category_spend_last_period || {};
  const spendTotal = Object.values(spend).reduce(
    (total, amount) => total + (Number(amount) || 0),
    0,
  );
  const rankedCategories = Object.entries(spend).sort(
    ([, a], [, b]) => Number(b) - Number(a),
  );
  const [topCategory, topAmount] = rankedCategories[0] || [];
  const dominantCategory =
    spendTotal > 0 && Number(topAmount) / spendTotal >= 0.6
      ? topCategory
      : null;
  const lowMerchantDiversity =
    profile.transactions_last_period >= 3 &&
    profile.distinct_merchants_last_period <= 2;
  const expansionCategories =
    dominantCategory === "food_drink"
      ? ["general_goods"]
      : dominantCategory === "general_goods"
        ? ["food_drink"]
        : dominantCategory === "other"
          ? ["food_drink", "general_goods"]
          : [];
  const expansionMissionCounts = Object.fromEntries(
    expansionCategories.map((category) => [category, categoryQuestCounts[category]]),
  );

  const checks = {
    valid24UniqueCatalogMissions:
      selected.length === 24 &&
      uniqueCodes.size === 24 &&
      picked.length === 24 &&
      picked.every(
        ({ item, quest }) =>
          Number.isInteger(item.level) &&
          item.level >= 1 &&
          item.level <= Math.min(3, quest.safe_level),
      ),
    coversAvailableFamiliesAtLeastTwice: FAMILY_NAMES.filter(
      (family) => availableFamilyCounts[family] > 0,
    ).every(
      (family) =>
        familyCounts[family] >= Math.min(2, availableFamilyCounts[family]),
    ),
    prioritizesShopVarietyWhenNeeded:
      !lowMerchantDiversity || merchantVarietyQuests >= 4,
    offersCategoryBreadthWhenSpendingIsConcentrated:
      expansionCategories.every((category) => categoryQuestCounts[category] >= 2),
  };

  return {
    rubricVersion: 1,
    scope: "selection_heuristics_not_outcome_proof",
    checks,
    metrics: {
      selectedCount: selected.length,
      uniqueCount: uniqueCodes.size,
      familyCounts,
      requiredFamilyMinimums: Object.fromEntries(
        FAMILY_NAMES.filter((family) => availableFamilyCounts[family] > 0).map(
          (family) => [family, Math.min(2, availableFamilyCounts[family])],
        ),
      ),
      levels,
      merchantVarietyQuests,
      previouslyCompletedQuests,
      supportedLevelCount,
      withinSupportedLevelCount: supportedLevelCount - aboveSupportedLevelCount,
      aboveSupportedLevelCount,
      lowMerchantDiversity,
      dominantCategory,
      expansionCategories,
      expansionMissionCounts,
    },
    warnings: Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name),
  };
}

module.exports = { evaluateMissionSelection };
