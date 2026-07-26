const test = require('node:test');
const assert = require('node:assert/strict');

const { findSplitPriceMatches } = require('../lib/split-price.js');

test('detects a supported price split across sibling text parts', () => {
  assert.deepEqual(findSplitPriceMatches(['€', '120']), [{
    start: 0,
    end: 4,
    raw: '€120',
    currency: 'EUR',
    amount: 120,
    firstPartIndex: 0,
    lastPartIndex: 1,
  }]);
});

test('detects a currency code and amount split across nested text parts', () => {
  const [match] = findSplitPriceMatches(['EUR', ' ', '1,234.56']);
  assert.equal(match.currency, 'EUR');
  assert.equal(match.amount, 1234.56);
  assert.equal(match.firstPartIndex, 0);
  assert.equal(match.lastPartIndex, 2);
});

test('ignores prices contained entirely within one text part', () => {
  assert.deepEqual(findSplitPriceMatches(['Product ', '€120']), []);
});

test('ignores USD, IQD and ambiguous multi-price groups', () => {
  assert.deepEqual(findSplitPriceMatches(['USD ', '100']), []);
  assert.deepEqual(findSplitPriceMatches(['IQD ', '100']), []);
  assert.deepEqual(findSplitPriceMatches(['€', '10', ' and ', '£', '20']), []);
});
