// Live Typhoon verification with fictional input only; does not modify the database.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { generateBingoMissionsWithAI } = require("../src/services/questService");
const input = structuredClone(require("../examples/generate-board.mock.json"));
input.user_profile.board_phase = "PERSONALIZED";
(async () => {
  if (!process.env.TYPHOON_API_KEY) throw new Error("Configure TYPHOON_API_KEY in backend/.env first");
  const rule = await generateBingoMissionsWithAI(structuredClone(input), {forceRules:true});
  assert.equal(rule.source,"RULE_BASED");
  assert.equal(rule.ai_attempts,0);
  assert.equal(rule.aiEvidence,null);
  const ai = await generateBingoMissionsWithAI(structuredClone(input));
  if (ai.source !== "AI") throw new Error("AI did not pass validation: " + JSON.stringify(ai.aiDiagnostics));
  assert.equal(ai.aiDiagnostics.ruleBasedUsed,false);
  assert.equal(ai.aiEvidence.validation.questCount,24);
  const actualCodes=ai.bingo_board_5x5.filter(c=>c.family!=="DONATION").map(c=>c.quest_code).sort();
  assert.deepEqual(actualCodes,ai.aiEvidence.selectedQuests.map(c=>c.quest_code).sort());
  assert.equal(createHash("sha256").update(JSON.stringify(ai.aiEvidence.selectedQuests)).digest("hex"),ai.aiEvidence.selectionSha256);
  console.log(JSON.stringify({ input:"fictional example; no user history or database writes", checks:{rulesDidNotCallProvider:true,aiResponseValidated:true,aiSelectionMatchesFinalBoard:true,fallbackUsedForAiBoard:false}, rule:{source:rule.source,attempts:rule.ai_attempts}, ai:{source:ai.source,attempts:ai.ai_attempts,evidence:ai.aiEvidence}, note:"Provider receipt and selection matching establish the code path; they are not a signature or proof that recommendations improve outcomes." },null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
