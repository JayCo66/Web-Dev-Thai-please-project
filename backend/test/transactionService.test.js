const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateCoPay } = require('../src/controllers/transactionController');

describe('transactionController: calculateCoPay (Co-Payment 60/40 & Daily Cap)', () => {

  test('calculates 60% government subsidy and 40% citizen payment when under daily cap', () => {
    const result = calculateCoPay(100.00, 0, 150.00);

    assert.equal(result.totalAmount, 100.00);
    assert.equal(result.govSubsidy, 60.00);
    assert.equal(result.userPayment, 40.00);
    assert.equal(result.remainingCapAfter, 90.00);
  });

  test('caps government subsidy at remaining daily limit across multiple transactions', () => {
    // User already used 60 THB today, remaining cap is 90 THB
    // Total is 200 THB -> 60% would be 120 THB, but cap only allows 90 THB
    const result = calculateCoPay(200.00, 60.00, 150.00);

    assert.equal(result.totalAmount, 200.00);
    assert.equal(result.govSubsidy, 90.00);
    assert.equal(result.userPayment, 110.00);
    assert.equal(result.remainingCapAfter, 0.00);
  });

  test('citizen pays 100% when daily government subsidy quota has been completely exhausted', () => {
    // User already used full 150 THB subsidy today
    const result = calculateCoPay(150.00, 150.00, 150.00);

    assert.equal(result.totalAmount, 150.00);
    assert.equal(result.govSubsidy, 0.00);
    assert.equal(result.userPayment, 150.00);
    assert.equal(result.remainingCapAfter, 0.00);
  });

  test('caps single transaction subsidy at max 150 THB when amount is large', () => {
    // 60% of 1,000 THB is 600 THB, capped at 150 THB
    const result = calculateCoPay(1000.00, 0, 150.00);

    assert.equal(result.totalAmount, 1000.00);
    assert.equal(result.govSubsidy, 150.00);
    assert.equal(result.userPayment, 850.00);
    assert.equal(result.remainingCapAfter, 0.00);
  });

  test('handles decimal precision and rounding correctly', () => {
    // 33.33 * 0.60 = 19.998 -> 20.00
    const result = calculateCoPay(33.33, 0, 150.00);

    assert.equal(result.totalAmount, 33.33);
    assert.equal(result.govSubsidy + result.userPayment, 33.33);
  });

  test('rejects non-positive transaction amounts', () => {
    assert.throws(
      () => calculateCoPay(0, 0),
      (err) => err.statusCode === 400
    );
    assert.throws(
      () => calculateCoPay(-50, 0),
      (err) => err.statusCode === 400
    );
  });

});
