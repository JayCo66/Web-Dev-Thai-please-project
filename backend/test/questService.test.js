const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateBingoMissionsWithAI, applyDifficultyPolicy } = require('../src/services/questService');
const fixture = require('../examples/generate-board.mock.json');
const clone = () => structuredClone(fixture);
const response = cells => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ cells }) } }] });
const suggested = input => input.quests.slice(0,24).map(q => ({quest_code:q.quest_code,level:3}));

test('new users get a persistent-ready 25-cell board with easy goals and a real donation task', async () => {
  const input=clone(); input.user_profile.transactions_last_period=0;input.user_profile.spend_last_period=0;
  input.user_profile.category_mix_last_period={food_drink:0,general_goods:0,other:0};
  let calls=0;
  const board=await generateBingoMissionsWithAI(input,{createCompletion:()=>{calls++;}});
  assert.equal(calls,0);assert.equal(board.source,'RULE_BASED');assert.equal(board.sourceReason,'NEW_USER');
  assert.deepEqual(board.difficultyMix,{easy:24,medium:0,hard:0});
  assert.equal(board.total_cells,25);assert.equal(new Set(board.bingo_board_5x5.map(c=>c.quest_code)).size,25);
  assert.equal(board.bingo_board_5x5[12].quest_code,'DONATION');
});
test('AI selections are checked and do not force the legacy budget of 63', async () => {
  const input=clone();
  const board=await generateBingoMissionsWithAI(input,{createCompletion:async()=>response(suggested(input))});
  assert.equal(board.source,'AI');assert.ok(board.difficultyMix.easy>=12);
  assert.ok(board.difficultyMix.medium<=8);assert.ok(board.difficultyMix.hard<=4);
  assert.ok(board.total_level<=40);
  for(const cell of board.bingo_board_5x5.filter(c=>c.family!=='DONATION')) {
    const q=input.quests.find(q=>q.quest_code===cell.quest_code);
    assert.ok(cell.level<=q.safe_level);assert.equal(cell.target_value,q.ladder[cell.level-1]);
  }
});
test('malformed AI is corrected once and a repeated failure returns a truthful fallback', async()=>{
  const input=clone();let calls=0;
  const board=await generateBingoMissionsWithAI(input,{createCompletion:async()=>{calls++;return response([]);}});
  assert.equal(calls,2);assert.equal(board.source,'RULE_BASED');assert.equal(board.sourceReason,'AI_UNAVAILABLE');
});
test('provider rate limiting falls back immediately without repeated paid requests',async()=>{
  let calls=0;const board=await generateBingoMissionsWithAI(clone(),{createCompletion:async()=>{calls++;throw Object.assign(new Error('rate limited'),{status:429});}});
  assert.equal(calls,1);assert.equal(board.source,'RULE_BASED');
});
test('invalid profile and insufficient eligible pool are rejected',async()=>{
  const invalid=clone();invalid.user_profile.category_mix_last_period.food_drink++;
  await assert.rejects(generateBingoMissionsWithAI(invalid,{forceRules:true}),e=>e.statusCode===400);
  const empty=clone();empty.quests.forEach(q=>q.safe_level=0);
  await assert.rejects(generateBingoMissionsWithAI(empty,{forceRules:true}),e=>e.statusCode===503);
});
test('difficulty never escalates a low-history mission even when AI proposes hard',()=>{
  const input=clone();input.quests.forEach(q=>{q.safe_level=3;q.achieved_last_period=0;});
  const cells=applyDifficultyPolicy(suggested(input),input.quests,input.user_profile);
  assert.ok(cells.every(c=>c.level===1));
});
