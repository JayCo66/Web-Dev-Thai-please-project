const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateDonationBonusTokens } = require('../src/controllers/charityController');

describe('charityController: calculateDonationBonusTokens (Social Impact Bonus Tokens)', () => {

  test('awards 1 token per 20 THB donated', () => {
    assert.equal(calculateDonationBonusTokens(20), 1);
    assert.equal(calculateDonationBonusTokens(40), 2);
    assert.equal(calculateDonationBonusTokens(100), 5);
    assert.equal(calculateDonationBonusTokens(500), 25);
  });

  test('awards minimum 1 token for donations under 20 THB', () => {
    assert.equal(calculateDonationBonusTokens(1), 1);
    assert.equal(calculateDonationBonusTokens(10), 1);
    assert.equal(calculateDonationBonusTokens(19.99), 1);
  });

  test('floors fractional 20 THB increments above minimum', () => {
    // 35 THB -> 1 token (not rounded up to 2)
    assert.equal(calculateDonationBonusTokens(35), 1);
    // 59 THB -> 2 tokens
    assert.equal(calculateDonationBonusTokens(59), 2);
  });

  test('rejects non-positive donation amounts', () => {
    assert.throws(
      () => calculateDonationBonusTokens(0),
      (err) => err.statusCode === 400
    );
    assert.throws(
      () => calculateDonationBonusTokens(-100),
      (err) => err.statusCode === 400
    );
  });

});
