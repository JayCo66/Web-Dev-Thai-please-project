const { randomInt } = require("node:crypto");
// Shared starter-board distribution; personalized AI boards keep their own levels.
const MIX = { easy: 12, medium: 8, hard: 4 };
// Starter template has one 12-point premium line. Rotation preserves its line scores.
const TEMPLATE = [
  3, 3, 2, 2, 2, 2, 1, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 1, 2, 1, 1, 2, 3, 3, 1,
];
const STARTER_CODES = [
  "TX_COUNT_ANY",
  "SPEND_TOTAL_ANY",
  "CATEGORY_COUNT_FD",
  "CATEGORY_COUNT_GD",
  "DISTINCT_MERCHANTS_ANY",
  "REPEAT_MERCHANT_ANY",
  "SINGLE_TICKET_ANY",
  "SPEND_TOTAL_FD",
  "SPEND_TOTAL_GD",
  "NEW_MERCHANTS_ANY",
  "CATEGORY_DAYS_FD",
  "CATEGORY_DAYS_GD",
  "FD_MORNING",
  "FD_LUNCH",
  "FD_AFTERNOON",
  "GD_WEEKDAY",
  "DAYPART_MORNING",
  "DAYPART_LUNCH",
  "DAYPART_AFTERNOON",
  "WEEKDAY_COUNT",
  "WEEKEND_COUNT",
  "STREAK_DAYS_ANY",
  "DISTINCT_MERCHANTS_FD",
  "SPEND_SINGLE_MERCHANT",
];
const phaseOf = (profile) =>
  profile.board_phase ||
  (profile.bingo_history?.boards_played > 0 ? "PERSONALIZED" : "STARTER");
function starterSelection(quests) {
  const byCode = new Map(quests.map((q) => [q.quest_code, q]));
  const ordered = [
    ...STARTER_CODES.map((code) => byCode.get(code)).filter(Boolean),
    ...quests
      .filter((q) => !STARTER_CODES.includes(q.quest_code))
      .sort((a, b) => a.quest_code.localeCompare(b.quest_code)),
  ].slice(0, 24);
  return ordered.map((q, i) => ({
    quest_code: q.quest_code,
    level: TEMPLATE.filter(Boolean)[i],
  }));
}
function mixedDifficulty(suggestions, quests, profile, source = "AI") {
  const byCode = new Map(quests.map((q) => [q.quest_code, q]));
  const starter = phaseOf(profile) === "STARTER";
  return suggestions.map((suggestion, index) => {
    const quest = byCode.get(suggestion.quest_code);
    const level = starter ? TEMPLATE.filter(Boolean)[index] : suggestion.level;
    const target = quest.ladder[level - 1];
    const aiLevel = !starter && source === "AI" ? suggestion.level : null;
    return {
      quest_code: quest.quest_code,
      quest_id: quest.quest_id || null,
      family: quest.family,
      unit: quest.unit,
      level,
      ai_level: aiLevel,
      level_adjusted: aiLevel !== null && level !== aiLevel,
      target_value: target,
      title: quest.text.replace(/\{n\}|\bn\b/g, String(target)),
      reason: starter
        ? "ภารกิจตั้งต้นร่วมกัน คละง่าย กลาง และท้าทาย เพื่อเริ่มเก็บพฤติกรรม"
        : `ข้อมูลล่าสุดทำได้ ${quest.achieved_last_period} ${quest.unit} · เป้าหมาย ${target} ${quest.unit}`,
      reason_source: "SERVER_DATA",
    };
  });
}
function mixedLayout(cells, center, starter = false) {
  const groups = {
    1: cells.filter((c) => c.level === 1),
    2: cells.filter((c) => c.level === 2),
    3: cells.filter((c) => c.level === 3),
  };
  if (
    groups[1].length !== 12 ||
    groups[2].length !== 8 ||
    groups[3].length !== 4
  ) {
    const grid = [...cells];
    grid.splice(12, 0, center);
    return grid;
  }
  if (!starter)
    for (const bucket of Object.values(groups))
      for (let i = bucket.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
      }
  let template = [...TEMPLATE];
  if (!starter) {
    const rotations = randomInt(4),
      flip = randomInt(2);
    for (let t = 0; t < rotations; t++)
      template = template.map(
        (_, i) => template[(4 - (i % 5)) * 5 + Math.floor(i / 5)],
      );
    if (flip)
      template = template.map(
        (_, i) => template[Math.floor(i / 5) * 5 + 4 - (i % 5)],
      );
  }
  return template.map((level) =>
    level === 0 ? center : groups[level].shift(),
  );
}
function lineBonus(cells, positions) {
  const difficulty = positions.reduce((sum, position) => {
    const c = cells.find((c) => c.position === position);
    return sum + (c?.family === "DONATION" ? 3 : Number(c?.level) || 1);
  }, 0);
  return { difficultyScore: difficulty, tokenReward: 20 + difficulty * 4 };
}
module.exports = {
  MIX,
  TEMPLATE,
  STARTER_CODES,
  phaseOf,
  starterSelection,
  mixedDifficulty,
  mixedLayout,
  lineBonus,
};
