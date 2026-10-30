const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeQuests, analyzeSpending, buildFunnel } = require('../src/services/adminAnalytics');

const cell = (code, family, level, status, progress, target) => ({ quest_code: code, family, level, status, progress, target_value: target, position: 0 });
const board = (userId, cells, source = 'RULE_BASED') => ({ user_id: userId, snapshot: { source, cells } });
const titles = new Map([['TX', 'ใช้จ่ายครบ n ครั้ง']]);

describe('adminAnalytics: quest success rate', () => {
  test('counts offered/completed per quest and a completion rate', () => {
    const result = analyzeQuests(
      [
        board(1, [cell('TX', 'ACTIVITY', 1, 'COMPLETED', 4, 4), cell('SP', 'SPEND', 3, 'IN_PROGRESS', 100, 400)]),
        board(2, [cell('TX', 'ACTIVITY', 1, 'IN_PROGRESS', 2, 4)]),
      ],
      titles,
    );
    const tx = result.quests.find((q) => q.questCode === 'TX');
    assert.equal(tx.offered, 2);
    assert.equal(tx.completed, 1);
    assert.equal(tx.rate, 50);
    assert.equal(tx.title, 'ใช้จ่ายครบ n ครั้ง');
    assert.equal(tx.reliable, false, 'two cells is too few to call a finding');
    assert.equal(result.boards.cellsTotal, 3);
    assert.equal(result.levels.find((l) => l.level === 1).rate, 50);
  });

  test('ignores the centre donation cell and boards without a snapshot', () => {
    const result = analyzeQuests(
      [board(1, [{ quest_code: 'DONATION', family: 'DONATION', status: 'COMPLETED' }, cell('TX', 'ACTIVITY', 2, 'COMPLETED', 4, 4)]), { user_id: 9, snapshot: null }],
      titles,
    );
    assert.equal(result.boards.count, 1);
    assert.equal(result.boards.cellsTotal, 1);
  });

  test('progress is capped at the target so overshoot cannot inflate it', () => {
    const result = analyzeQuests([board(1, [cell('TX', 'ACTIVITY', 1, 'COMPLETED', 50, 4)])], titles);
    assert.equal(result.quests[0].avgProgress, 100);
  });
});

describe('adminAnalytics: spending and funnel', () => {
  const tx = (user, shop, amount, iso, category = 'อาหาร') => ({ user_id: user, shop_id: shop, total_amount: amount, paid_at: new Date(iso), shops: { category, shop_name: `s${shop}` } });

  test('bins hours in Thai time and measures repeat payers', () => {
    const result = analyzeSpending(
      [tx(1, 1, 100, '2026-10-30T05:30:00Z'), tx(1, 1, 50, '2026-10-30T00:10:00Z'), tx(2, 2, 200, '2026-10-30T17:00:00Z')],
      3,
      new Date('2026-10-30T12:00:00Z'),
    );
    // 05:30Z = 12:30 Thai (lunch), 00:10Z = 07:10 Thai (morning), 17:00Z = 00:00 Thai next day (night)
    assert.equal(result.hours.find((h) => h.key === 'lunch').count, 1);
    assert.equal(result.hours.find((h) => h.key === 'morning').count, 1);
    assert.equal(result.hours.find((h) => h.key === 'night').count, 1);
    assert.equal(result.summary.payers, 2);
    assert.equal(result.summary.repeatRate, 50);
    assert.equal(result.trend.length, 3);
  });

  test('funnel percentages are relative to total and to the previous step', () => {
    const funnel = buildFunnel({ citizens: 10, payers: 8, repeatPayers: 4, completers: 4, donors: 1, redeemers: 0 });
    assert.equal(funnel[1].percentOfTotal, 80);
    assert.equal(funnel[2].percentOfPrevious, 50);
    assert.equal(funnel[5].count, 0);
  });
});
