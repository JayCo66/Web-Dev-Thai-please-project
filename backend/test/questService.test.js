const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  generateBingoMissionsWithAI,
  applyDifficultyPolicy,
  validateSuggestion,
} = require("../src/services/questService");
const fixture = require("../examples/generate-board.mock.json");
const clone = () => {
  const data = structuredClone(fixture);
  data.user_profile.board_phase = "PERSONALIZED";
  data.quests.forEach((q) => (q.safe_level = 3));
  return data;
};
const response = (cells) => ({
  choices: [
    { finish_reason: "stop", message: { content: JSON.stringify({ cells }) } },
  ],
});
const suggested = (input) =>
  (() => {
    const families = ["ACTIVITY", "VARIETY", "TIME", "SPEND"];
    const buckets = Object.fromEntries(families.map((family) => [
      family,
      input.quests.filter((q) => q.family === family),
    ]));
    const picked = [];
    const count = (family) => picked.filter((q) => q.family === family).length;
    const highDiversity = input.user_profile.transactions_last_period >= 8 &&
      input.user_profile.distinct_merchants_last_period >= 8;
    const lowDiversity = input.user_profile.transactions_last_period >= 3 &&
      input.user_profile.distinct_merchants_last_period <= 2;
    for (const family of families) {
      const minimum = family === "VARIETY" && lowDiversity ? 4 : 2;
      while (count(family) < minimum && buckets[family].length)
        picked.push(buckets[family].shift());
    }
    while (picked.length < 24) {
      let added = false;
      for (const family of families) {
        if (family === "VARIETY" && highDiversity && count(family) >= 2) continue;
        if (buckets[family].length && picked.length < 24) {
          picked.push(buckets[family].shift());
          added = true;
        }
      }
      if (!added) break;
    }
    return picked.map((q) => ({ quest_code: q.quest_code, level: 3 }));
  })();

test("new users get a mixed common 25-cell starter board and donation task", async () => {
  const input = clone();
  input.user_profile.board_phase = "STARTER";
  input.user_profile.transactions_last_period = 0;
  input.user_profile.spend_last_period = 0;
  input.user_profile.category_mix_last_period = {
    food_drink: 0,
    general_goods: 0,
    other: 0,
  };
  let calls = 0;
  const board = await generateBingoMissionsWithAI(input, {
    createCompletion: () => {
      calls++;
    },
  });
  assert.equal(calls, 0);
  assert.equal(board.source, "RULE_BASED");
  assert.equal(board.sourceReason, "COMMON_STARTER");
  assert.deepEqual(board.difficultyMix, { easy: 12, medium: 8, hard: 4 });
  assert.equal(board.total_cells, 25);
  assert.equal(
    new Set(board.bingo_board_5x5.map((c) => c.quest_code)).size,
    25,
  );
  assert.equal(board.bingo_board_5x5[12].quest_code, "DONATION");
});
test("personalized board uses AI levels directly without a fixed 12/8/4 mix", async () => {
  const input = clone();
  const aiSuggestions = suggested(input).map((q, index) => ({
    ...q,
    level: (index % 3) + 1,
  }));
  const board = await generateBingoMissionsWithAI(input, {
    createCompletion: async () => response(aiSuggestions),
  });
  assert.equal(board.source, "AI");
  assert.deepEqual(board.difficultyMix, { easy: 8, medium: 8, hard: 8 });
  assert.equal(board.total_level, 48);
  assert.equal(board.personalizationEvidence.profile.transactions, input.user_profile.transactions_last_period);
  assert.equal(board.personalizationEvidence.selectedMissions.length, 24);
  for (const cell of board.bingo_board_5x5.filter(
    (c) => c.family !== "DONATION",
  )) {
    const q = input.quests.find((q) => q.quest_code === cell.quest_code);
    const selected = aiSuggestions.find((q) => q.quest_code === cell.quest_code);
    assert.ok(cell.level <= q.safe_level);
    assert.equal(cell.level, selected.level);
    assert.equal(cell.target_value, q.ladder[cell.level - 1]);
  }
});
test("AI candidate prompt interleaves families so the first 24 options include spend missions", async () => {
  const input = clone();
  let firstPageFamilies;
  const board = await generateBingoMissionsWithAI(input, {
    createCompletion: async (request) => {
      const payload = JSON.parse(request.messages[1].content);
      firstPageFamilies = payload.quests.slice(0, 24).reduce((counts, quest) => {
        counts[quest.family] = (counts[quest.family] || 0) + 1;
        return counts;
      }, {});
      return response(suggested(input));
    },
  });
  assert.equal(board.source, "AI");
  for (const family of ["ACTIVITY", "VARIETY", "TIME", "SPEND"])
    assert.ok(firstPageFamilies[family] >= 2, `${family} must appear in the first 24 candidates`);
});
test("malformed AI is corrected once and a repeated failure returns a truthful fallback", async () => {
  const input = clone();
  let calls = 0;
  const board = await generateBingoMissionsWithAI(input, {
    createCompletion: async () => {
      calls++;
      return response([]);
    },
  });
  assert.equal(calls, 2);
  assert.equal(board.source, "RULE_BASED");
  assert.equal(board.sourceReason, "AI_UNAVAILABLE");
});
test("AI that ignores spend-family coverage is retried then replaced by an audited rule fallback", async () => {
  const input = clone();
  const first24 = input.quests.slice(0, 24).map((quest) => ({
    quest_code: quest.quest_code,
    level: 1,
  }));
  let calls = 0;
  const board = await generateBingoMissionsWithAI(input, {
    createCompletion: async () => {
      calls++;
      return response(first24);
    },
  });
  assert.equal(calls, 2);
  assert.equal(board.source, "RULE_BASED");
  assert.equal(board.sourceReason, "AI_SELECTION_QUALITY_FAILED");
  assert.equal(board.aiDiagnostics.failureCode, "SELECTION_QUALITY_FAILED");
  assert.equal(board.personalizationEvidence.selectionAudit.checks.coversAvailableFamiliesAtLeastTwice, true);
});
test("provider rate limiting falls back immediately without repeated paid requests", async () => {
  let calls = 0;
  const board = await generateBingoMissionsWithAI(clone(), {
    createCompletion: async () => {
      calls++;
      throw Object.assign(new Error("rate limited"), { status: 429 });
    },
  });
  assert.equal(calls, 1);
  assert.equal(board.source, "RULE_BASED");
});
test("invalid profile and insufficient eligible pool are rejected", async () => {
  const invalid = clone();
  invalid.user_profile.category_mix_last_period.food_drink++;
  await assert.rejects(
    generateBingoMissionsWithAI(invalid, { forceRules: true }),
    (e) => e.statusCode === 400,
  );
  const empty = clone();
  empty.quests.forEach((q) => (q.safe_level = 0));
  await assert.rejects(
    generateBingoMissionsWithAI(empty, { forceRules: true }),
    (e) => e.statusCode === 503,
  );
});
test("AI proposed levels are not overwritten by backend difficulty quotas", () => {
  const input = clone();
  input.quests.forEach((q) => {
    q.safe_level = 3;
    q.achieved_last_period = 0;
  });
  const proposed = suggested(input);
  const cells = applyDifficultyPolicy(
    proposed,
    input.quests,
    input.user_profile,
    "AI",
  );
  assert.equal(cells.filter((c) => c.level === 3).length, 24);
  assert.ok(cells.every((cell) => cell.ai_level === 3));
  assert.ok(cells.every((cell) => cell.level_adjusted === false));
});

test("AI cannot propose a level above the quest safety limit", () => {
  const input = clone();
  const cells = suggested(input);
  const restrictedQuest = input.quests[0];
  restrictedQuest.safe_level = 1;
  const suggestion = cells.map((cell) => ({ ...cell }));
  suggestion[0].level = 2;
  assert.throws(() => validateSuggestion(JSON.stringify({ cells: suggestion }), input.quests));
});


test("fallback diagnostics distinguish safe error categories without exposing provider details", async () => {
  for (const [error, expected] of [
    [Object.assign(new Error("secret-provider-detail"), { status: 401 }), "AUTH_FAILED"],
    [Object.assign(new Error("secret-provider-detail"), { status: 429 }), "RATE_LIMITED"],
    [Object.assign(new Error("secret-provider-detail"), { status: 404 }), "MODEL_NOT_FOUND"],
    [Object.assign(new Error("secret-provider-detail"), { name: "APIConnectionTimeoutError" }), "TIMEOUT"],
    [Object.assign(new Error("secret-provider-detail"), { name: "APIConnectionError" }), "CONNECTION_FAILED"],
  ]) {
    const board = await generateBingoMissionsWithAI(clone(), { createCompletion: async () => { throw error; } });
    assert.equal(board.source, "RULE_BASED");
    assert.equal(board.aiDiagnostics.failureCode, expected);
    assert.equal(board.aiDiagnostics.attempts, 1);
    assert.equal(JSON.stringify(board.aiDiagnostics).includes("secret-provider-detail"), false);
  }
});

test("successful retry clears an earlier fallback cause", async () => {
  const input = clone();
  let calls = 0;
  const board = await generateBingoMissionsWithAI(input, { createCompletion: async () => ++calls === 1 ? response([]) : response(suggested(input)) });
  assert.equal(board.source, "AI");
  assert.equal(board.aiDiagnostics.failureCode, null);
  assert.equal(board.aiDiagnostics.attempts, 2);
});


test("single whole-response Markdown JSON fences are accepted with the same strict quest validation", () => {
  const input = clone();
  const cells = suggested(input);
  const fenced = "```json\n" + JSON.stringify({cells}) + "\n```";
  assert.deepEqual(validateSuggestion(fenced, input.quests), cells);
  assert.throws(() => validateSuggestion("Explanation\n" + fenced, input.quests));
  assert.throws(() => validateSuggestion("```json\n" + JSON.stringify({cells:cells.slice(1)}) + "\n```", input.quests));
  const duplicate = structuredClone(cells);
  duplicate[1] = duplicate[0];
  assert.throws(() => validateSuggestion("```json\n" + JSON.stringify({cells:duplicate}) + "\n```", input.quests));
  const unknown = structuredClone(cells);
  unknown[0].quest_code = "INVENTED_QUEST";
  assert.throws(() => validateSuggestion("```json\n" + JSON.stringify({cells:unknown}) + "\n```", input.quests));
});


test("accepted provider selection is exactly the final board mission set and carries safe evidence", async () => {
  const input=clone();
  const selected=suggested(input).reverse();
  const board=await generateBingoMissionsWithAI(input,{createCompletion:async()=>({...response(selected),id:"test-provider-receipt",model:"test-model",usage:{prompt_tokens:100,completion_tokens:200,total_tokens:300}})});
  assert.equal(board.source,"AI");
  assert.equal(board.aiDiagnostics.ruleBasedUsed,false);
  assert.equal(board.aiEvidence.responseId,"test-provider-receipt");
  assert.equal(board.aiEvidence.validation.questCount,24);
  assert.deepEqual(board.bingo_board_5x5.filter(c=>c.family!=="DONATION").map(c=>c.quest_code).sort(),selected.map(c=>c.quest_code).sort());
  const {createHash}=require("node:crypto");
  assert.equal(board.aiEvidence.selectionSha256,createHash("sha256").update(JSON.stringify(selected)).digest("hex"));
});
test("explicit rules mode cannot claim provider evidence or call AI", async () => {
  let called=0;
  const board=await generateBingoMissionsWithAI(clone(),{forceRules:true,createCompletion:async()=>{called++;throw new Error("must not call");}});
  assert.equal(called,0);
  assert.equal(board.source,"RULE_BASED");
  assert.equal(board.aiEvidence,null);
  assert.equal(board.aiDiagnostics.ruleBasedUsed,true);
});


test("AI debug logging shows input, response and final result without exposing the configured key", async () => {
  const originalLog=console.log;
  const oldFlag=process.env.AI_DEBUG_LOG, oldKey=process.env.TYPHOON_API_KEY;
  const logs=[];
  const secret="debug-only-secret-not-a-real-key";
  try {
    process.env.AI_DEBUG_LOG="true";
    process.env.TYPHOON_API_KEY=secret;
    console.log=(...args)=>logs.push(args.join(" "));
    const input=clone();input.user_profile.debug_marker=secret;
    const selected=suggested(input);
    await generateBingoMissionsWithAI(input,{createCompletion:async params=>{
      assert.equal(typeof params.messages[1].content,"string");
      return {choices:[{finish_reason:"stop",message:{content:JSON.stringify({cells:selected,marker:secret})}}]};
    }});
    assert.ok(logs.some(line=>line.startsWith("[AI][REQUEST]")));
    assert.ok(logs.some(line=>line.startsWith("[AI][RESPONSE]")));
    assert.ok(logs.some(line=>line.startsWith("[AI][RESULT]")));
    assert.ok(logs.some(line=>line.includes("transactions_last_period")));
    assert.ok(logs.every(line=>!line.includes(secret)));
    assert.ok(logs.some(line=>line.includes("[REDACTED]")));
    logs.length=0;
    process.env.AI_DEBUG_LOG="false";
    await generateBingoMissionsWithAI(clone(),{forceRules:true});
    assert.equal(logs.length,0);
  } finally {
    console.log=originalLog;
    if(oldFlag===undefined)delete process.env.AI_DEBUG_LOG;else process.env.AI_DEBUG_LOG=oldFlag;
    if(oldKey===undefined)delete process.env.TYPHOON_API_KEY;else process.env.TYPHOON_API_KEY=oldKey;
  }
});
