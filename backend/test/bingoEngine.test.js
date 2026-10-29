const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeBingoLines, evaluateQuestIncrement, BINGO_LINES } = require('../src/controllers/questController');

describe('questController: analyzeBingoLines (5x5 Line Matching)', () => {

  test('identifies all 12 lines correctly on a 5x5 board', () => {
    assert.equal(BINGO_LINES.length, 12);
    const rows = BINGO_LINES.filter((l) => l.type === 'ROW');
    const cols = BINGO_LINES.filter((l) => l.type === 'COL');
    const diags = BINGO_LINES.filter((l) => l.type === 'DIAG');
    assert.equal(rows.length, 5);
    assert.equal(cols.length, 5);
    assert.equal(diags.length, 2);
  });

  test('reports 0 completed lines when board is empty', () => {
    const emptyCells = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      status: 'IN_PROGRESS',
    }));

    const lines = analyzeBingoLines(emptyCells);
    const completedLines = lines.filter((l) => l.isCompleted);
    assert.equal(completedLines.length, 0);
  });

  test('detects completed horizontal row (Row 1: positions 0,1,2,3,4)', () => {
    const cells = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      status: [0, 1, 2, 3, 4].includes(i) ? 'COMPLETED' : 'IN_PROGRESS',
    }));

    const lines = analyzeBingoLines(cells);
    const r1 = lines.find((l) => l.id === 'R1');
    assert.equal(r1.isCompleted, true);
    assert.equal(r1.completedCount, 5);
    assert.equal(r1.progressPercent, 100);

    const r2 = lines.find((l) => l.id === 'R2');
    assert.equal(r2.isCompleted, false);
  });

  test('detects completed vertical column (Column 3: center column 2,7,12,17,22)', () => {
    const cells = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      status: [2, 7, 12, 17, 22].includes(i) ? 'COMPLETED' : 'IN_PROGRESS',
    }));

    const lines = analyzeBingoLines(cells);
    const c3 = lines.find((l) => l.id === 'C3');
    assert.equal(c3.isCompleted, true);
    assert.equal(c3.completedCount, 5);
  });

  test('detects completed diagonals (D1: top-left to bottom-right, D2: top-right to bottom-left)', () => {
    // D1 positions: [0, 6, 12, 18, 24]
    const cellsD1 = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      status: [0, 6, 12, 18, 24].includes(i) ? 'CLAIMED' : 'IN_PROGRESS',
    }));
    const linesD1 = analyzeBingoLines(cellsD1);
    const d1 = linesD1.find((l) => l.id === 'D1');
    assert.equal(d1.isCompleted, true);

    // D2 positions: [4, 8, 12, 16, 20]
    const cellsD2 = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      status: [4, 8, 12, 16, 20].includes(i) ? 'COMPLETED' : 'IN_PROGRESS',
    }));
    const linesD2 = analyzeBingoLines(cellsD2);
    const d2 = linesD2.find((l) => l.id === 'D2');
    assert.equal(d2.isCompleted, true);
  });

  test('calculates accurate progress percentage when line is partially completed', () => {
    // 4 out of 5 positions completed
    const cells = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      status: [0, 1, 2, 3].includes(i) ? 'COMPLETED' : 'IN_PROGRESS',
    }));

    const lines = analyzeBingoLines(cells);
    const r1 = lines.find((l) => l.id === 'R1');
    assert.equal(r1.isCompleted, false);
    assert.equal(r1.completedCount, 4);
    assert.equal(r1.progressPercent, 80);
  });

});

describe('questController: evaluateQuestIncrement (Real-time Transaction Rules)', () => {

  test('increments transaction count (TX_COUNT_ANY) by 1', () => {
    const cell = { quest_code: 'TX_COUNT_ANY', progress: 2, target_value: 5 };
    const tx = { total_amount: 120 };
    assert.equal(evaluateQuestIncrement(cell, tx), 1);
  });

  test('increments total spend (SPEND_TOTAL_ANY) by floored amount', () => {
    const cell = { quest_code: 'SPEND_TOTAL_ANY', progress: 100, target_value: 500 };
    const tx = { total_amount: 250.75 };
    assert.equal(evaluateQuestIncrement(cell, tx), 250);
  });

  test('matches Food/Drink vs General Goods category', () => {
    const foodCell = { quest_code: 'CATEGORY_COUNT_FD', progress: 0, target_value: 3 };
    const goodsCell = { quest_code: 'CATEGORY_COUNT_GD', progress: 0, target_value: 3 };

    const foodTx = { shops: { category: 'ร้านอาหารตามสั่ง & คาเฟ่' } };
    assert.equal(evaluateQuestIncrement(foodCell, foodTx), 1);
    assert.equal(evaluateQuestIncrement(goodsCell, foodTx), 0);

    const goodsTx = { shops: { category: 'ร้านขายเสื้อผ้าและของใช้ทั่วไป' } };
    assert.equal(evaluateQuestIncrement(foodCell, goodsTx), 0);
    assert.equal(evaluateQuestIncrement(goodsCell, goodsTx), 1);
  });

  test('matches Daypart Lunch correctly (11:00 - 13:59 Thai time)', () => {
    const lunchCell = { quest_code: 'DAYPART_LUNCH', progress: 0, target_value: 2 };

    const lunchTx = { paid_at: new Date('2026-10-27T12:30:00+07:00') };
    assert.equal(evaluateQuestIncrement(lunchCell, lunchTx), 1);

    const eveningTx = { paid_at: new Date('2026-10-27T19:00:00+07:00') };
    assert.equal(evaluateQuestIncrement(lunchCell, eveningTx), 0);
  });

  test('matches Weekend vs Weekday correctly in Thai time', () => {
    const weekendCell = { quest_code: 'WEEKEND_COUNT', progress: 0, target_value: 2 };
    const weekdayCell = { quest_code: 'WEEKDAY_COUNT', progress: 0, target_value: 5 };

    // Sunday = 2026-10-25
    const sundayTx = { paid_at: new Date('2026-10-25T14:00:00+07:00') };
    assert.equal(evaluateQuestIncrement(weekendCell, sundayTx), 1);
    assert.equal(evaluateQuestIncrement(weekdayCell, sundayTx), 0);

    // Tuesday = 2026-10-27
    const tuesdayTx = { paid_at: new Date('2026-10-27T14:00:00+07:00') };
    assert.equal(evaluateQuestIncrement(weekendCell, tuesdayTx), 0);
    assert.equal(evaluateQuestIncrement(weekdayCell, tuesdayTx), 1);
  });

  test('handles SINGLE_TICKET_ANY threshold check', () => {
    const cell = { quest_code: 'SINGLE_TICKET_ANY', progress: 0, target_value: 300 };

    // Less than threshold -> 0
    const txLow = { total_amount: 250 };
    assert.equal(evaluateQuestIncrement(cell, txLow), 0);

    // Meets or exceeds threshold -> complete full target
    const txHigh = { total_amount: 350 };
    assert.equal(evaluateQuestIncrement(cell, txHigh), 300);
  });

});
