const {test}=require('node:test');
const assert=require('node:assert/strict');
const {RULES,evaluateQuestProgress,thaiDateParts}=require('../src/services/questMetrics');
const pool=require('../examples/generate-board.mock.json');
const tx=(id,shop,amount,date,category='อาหาร')=>({transaction_id:BigInt(id),shop_id:BigInt(shop),total_amount:amount,paid_at:new Date(date),status:'COMPLETED',shops:{category}});
test('every one of the 31 pool missions has an evaluator',()=>{
  assert.equal(pool.quests.length,31);for(const q of pool.quests){assert.ok(RULES[q.quest_code],q.quest_code);assert.equal(evaluateQuestProgress(q.quest_code,[]),0);}
});
test('unique shops, repeated shops, new shops, sums and duplicate events are distinguished',()=>{
  const a=tx(1,1,50,'2026-10-23T12:00:00+07:00'),b=tx(2,1,60,'2026-10-24T12:00:00+07:00'),c=tx(3,2,100,'2026-10-25T12:00:00+07:00');
  const rows=[a,b,c,a];
  assert.equal(evaluateQuestProgress('TX_COUNT_ANY',rows),3);
  assert.equal(evaluateQuestProgress('DISTINCT_MERCHANTS_ANY',rows),2);
  assert.equal(evaluateQuestProgress('REPEAT_MERCHANT_ANY',rows),2);
  assert.equal(evaluateQuestProgress('NEW_MERCHANTS_ANY',rows,{previousMerchantIds:[1n]}),1);
  assert.equal(evaluateQuestProgress('SPEND_TOTAL_ANY',rows),210);
  assert.equal(evaluateQuestProgress('SPEND_SINGLE_MERCHANT',rows),110);
  assert.equal(evaluateQuestProgress('SINGLE_TICKET_ANY',rows),100);
  assert.equal(evaluateQuestProgress('STREAK_DAYS_ANY',rows),3);
});
test('combined category and time filters must both match in Bangkok time',()=>{
  const food=tx(1,1,70,'2026-10-23T01:00:00Z'),goods=tx(2,2,80,'2026-10-23T01:00:00Z','สินค้าทั่วไป');
  assert.equal(evaluateQuestProgress('FD_MORNING',[food,goods]),1);
  assert.equal(evaluateQuestProgress('GD_WEEKDAY',[food,goods]),1);
  assert.equal(evaluateQuestProgress('FRIDAY_COUNT',[food,goods]),2);
  assert.equal(evaluateQuestProgress('SPEND_TOTAL_FD',[food,goods]),70);
  assert.equal(thaiDateParts('2026-10-31T18:00:00Z').date,'2026-11-01');
});
