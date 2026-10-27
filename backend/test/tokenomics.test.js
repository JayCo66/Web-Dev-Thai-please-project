const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateLuckyDrawCost, checkMonthlyHardSinkQuota } = require('../src/controllers/rewardController');
const { BINGO_LINE_BONUS_TOKENS, calculateBoardYield } = require('../src/controllers/questController');

describe('Tokenomics Rebalancing (ADR-0001 & ADR-0002)', () => {

  describe('Bingo Board Yield & Faucets', () => {
    test('enforces line bonus constant at 20 tokens per line', () => {
      assert.equal(BINGO_LINE_BONUS_TOKENS, 20);
    });

    test('calculates single board full-clear yield capped at 376 tokens', () => {
      // 24 cells with levels summing to 63:
      // cell reward = level * 2 -> 63 * 2 = 126
      // 1 center donation = 10
      // 12 lines * 20 = 240
      // Total = 126 + 10 + 240 = 376
      const totalYield = calculateBoardYield(63, 12);
      assert.equal(totalYield.cellTokens, 126);
      assert.equal(totalYield.donationTokens, 10);
      assert.equal(totalYield.lineTokens, 240);
      assert.equal(totalYield.totalTokens, 376);
      assert.ok(totalYield.totalTokens <= 380);
    });
  });

  describe('Lucky Draw Package Pricing (Soft Sink)', () => {
    test('calculates 1 ticket at 25 tokens', () => {
      assert.equal(calculateLuckyDrawCost(1), 25);
    });

    test('calculates bundled discounts: 3 tickets for 60 tokens, 5 tickets for 90 tokens', () => {
      assert.equal(calculateLuckyDrawCost(3), 60);
      assert.equal(calculateLuckyDrawCost(5), 90);
    });

    test('calculates unbundled counts at 25 tokens each', () => {
      assert.equal(calculateLuckyDrawCost(2), 50);
      assert.equal(calculateLuckyDrawCost(4), 100);
      assert.equal(calculateLuckyDrawCost(10), 250);
    });

    test('rejects non-positive or invalid ticket counts', () => {
      assert.throws(
        () => calculateLuckyDrawCost(0),
        (err) => err.statusCode === 400
      );
      assert.throws(
        () => calculateLuckyDrawCost(-3),
        (err) => err.statusCode === 400
      );
      assert.throws(
        () => calculateLuckyDrawCost('invalid'),
        (err) => err.statusCode === 400
      );
    });
  });

  describe('Monthly Hard Sink Quota Enforcement', () => {
    test('allows redemption when user has 0 redemptions this month', () => {
      assert.equal(checkMonthlyHardSinkQuota(0, 1), true);
    });

    test('blocks redemption when user has reached monthly quota of 1', () => {
      assert.equal(checkMonthlyHardSinkQuota(1, 1), false);
      assert.equal(checkMonthlyHardSinkQuota(2, 1), false);
    });
  });

});
