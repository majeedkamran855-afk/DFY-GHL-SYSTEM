const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMAO } = require('./mao-calculator');

test('calculates the 70 percent rule', () => {
  assert.equal(calculateMAO({ arv: 250000, repairEstimate: 35000, wholesaleFeeTarget: 10000 }), 130000);
});
test('never returns a negative offer', () => {
  assert.equal(calculateMAO({ arv: 50000, repairEstimate: 40000, wholesaleFeeTarget: 10000, investorMarginFactor: 0.7 }), 0);
});
test('rejects invalid factors', () => {
  assert.throws(() => calculateMAO({ arv: 1, repairEstimate: 0, wholesaleFeeTarget: 0, investorMarginFactor: 2 }));
});
