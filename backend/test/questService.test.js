const test = require('node:test');
const assert = require('node:assert/strict');
const { generateBingoMissionsWithAI: generate } = require('../src/services/questService');
const fixture = require('../examples/generate-board.mock.json');
const input = () => structuredClone(fixture);
const cells = () => fixture.quests.slice(0,24).map((q,i) => ({ quest_code:q.quest_code, level:i<15?3:2, reason:`achieved ${q.achieved_last_period}, target ${q.ladder[(i<15?3:2)-1]}` }));
const completion = value => async () => ({ choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}] });

test('25 cells, unique positions/codes, ladder mapping, budget excludes donation', async()=>{
 const board=await generate(input(),{createCompletion:completion({cells:cells()})});
 assert.equal(board.total_cells,25);
 assert.equal(new Set(board.bingo_board_5x5.map(c=>c.position)).size,25);
 assert.equal(new Set(board.bingo_board_5x5.map(c=>c.quest_code)).size,25);
 assert.deepEqual(board.bingo_board_5x5.map(c=>c.position),Array.from({length:25},(_,i)=>i));
 const normal=board.bingo_board_5x5.filter(c=>c.family!=='DONATION');
 assert.equal(normal.reduce((sum,c)=>sum+c.level,0),63);
 for(const c of normal) assert.equal(c.target_value,fixture.quests.find(q=>q.quest_code===c.quest_code).ladder[c.level-1]);
 assert.equal(board.bingo_board_5x5.filter(c=>c.family==='DONATION').length,1);
});
test('infeasible budget rejected before calling AI',async()=>{const data=input();data.quests.forEach(q=>q.safe_level=1);await assert.rejects(generate(data,{createCompletion:()=>{throw Error('must not call');}}),/เป็นไปไม่ได้/);});
test('too few eligible quests rejected',async()=>{const data=input();data.quests=data.quests.slice(0,23);await assert.rejects(generate(data),/อย่างน้อย 24/);});
test('duplicates and unknown codes rejected',async()=>{for(const code of [cells()[0].quest_code,'UNKNOWN']){const c=cells();c[1].quest_code=code;await assert.rejects(generate(input(),{createCompletion:completion({cells:c})}),/ไม่อนุญาตหรือซ้ำ/);}});
test('level above safe_level rejected',async()=>{const data=input();data.quests[0].safe_level=2;await assert.rejects(generate(data,{createCompletion:completion({cells:cells()})}),/ระดับเกิน/);});
test('budget is balanced in both directions and targets recomputed; wrong count rejected',async()=>{
 for(const level of [1,3]) {
  const c=cells().map(c=>({...c,level}));
  const b=await generate(input(),{createCompletion:completion({cells:c})});
  assert.equal(b.total_level,63);
  assert.ok(b.adjusted_cells_count>0);
  for(const cell of b.bingo_board_5x5.filter(c=>c.family!=='DONATION')) {
   const q=fixture.quests.find(q=>q.quest_code===cell.quest_code);
   assert.equal(cell.ai_level,level);
   assert.ok(cell.level>=1 && cell.level<=Math.min(3,q.safe_level));
   assert.equal(cell.target_value,q.ladder[cell.level-1]);
  }
 }
 await assert.rejects(generate(input(),{createCompletion:completion({cells:cells().slice(1)})}),/24 รายการ/);
});
test('invalid JSON, truncated output and upstream error do not become fake success',async()=>{for(const response of [{choices:[{finish_reason:'stop',message:{content:'invalid'}}]},{choices:[{finish_reason:'length',message:{content:'{}'}}]}]) await assert.rejects(generate(input(),{createCompletion:async()=>response}),e=>e.statusCode===502);await assert.rejects(generate(input(),{createCompletion:async()=>{throw {status:429};}}),e=>e.statusCode===429);});
test('malformed ladder and impossible dates rejected',async()=>{const data=input();data.quests[0].ladder=[1];await assert.rejects(generate(data),/ladder/);const bad=input();bad.user_profile.period.from='2026-02-30';await assert.rejects(generate(bad),/period/);});

test('invalid first answer is repaired once, without accepting an invalid board',async()=>{
 let calls=0;
 const board=await generate(input(),{createCompletion:async params=>{
  calls++;
  if(calls===2) assert.match(params.messages.at(-1).content,/คำตอบผิดกติกา/);
  return completion({cells:calls===1?cells().slice(1):cells()})();
 }});
 assert.equal(calls,2);
 assert.equal(board.ai_attempts,2);
 assert.equal(board.total_level,63);
});

test('extended data is sent intact, no reference anchors first request, donation can lock center',async()=>{
 const data=input();
 data.quests[0].completion={self_purchases:{periods:3,rate:[1,0.67,0.33]},self_bingo:{'1':{offered:2,completed:2},'2':null},all_users:{users:15,rate:[0.8,0.6,0.47]},similar_users:{users:5,rate:[0.95,0.8,0.6]}};
 const b=await generate(data,{createCompletion:async params=>{
  const sent=JSON.parse(params.messages[1].content);
  assert.equal(sent.user_profile.active_days_last_period,13);
  assert.equal(sent.quests[0].achieved_period_before,14);
  assert.deepEqual(sent.quests[0].completion,data.quests[0].completion);
  assert.equal(sent.quests[1].bingo_history,null);
  assert.equal(sent.feasible_reference_cells,undefined);
  return completion({cells:cells()})();
 }});
 assert.equal(b.bingo_board_5x5[12].quest_code,'DONATION');
 for(const c of b.bingo_board_5x5){assert.ok(!c.title.includes('?'));assert.ok(!c.unit.includes('?'));}
});

test('broken text, contradictory board levels and invalid completion are rejected',async()=>{
 const badText=input();badText.quests[0].text='????';await assert.rejects(generate(badText),/UTF-8/);
 const levels=input();levels.board.levels=[1,10];await assert.rejects(generate(levels),/levels/);
 const stats=input();stats.quests[0].completion={all_users:{users:5,rate:[1,1.5,0]}};await assert.rejects(generate(stats),/completion/);
});

test('display reasons use source facts instead of unsupported AI claims',async()=>{
 const c=cells();c[0].reason='รักษาพฤติกรรมที่ดี';
 const b=await generate(input(),{createCompletion:completion({cells:c})});
 const q=b.bingo_board_5x5.find(q=>q.quest_code===c[0].quest_code);
 assert.equal(q.reason_source,'SERVER_DATA');
 assert.ok(q.reason.includes(String(fixture.quests[0].achieved_last_period)));
 assert.ok(q.reason.includes(String(q.target_value)));
 assert.ok(!q.reason.includes(c[0].reason));
});
