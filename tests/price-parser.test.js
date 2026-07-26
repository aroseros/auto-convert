const test = require('node:test');
const assert = require('node:assert/strict');

const { findPrices } = require('../lib/price-parser.js');

function simplified(text) {
  return findPrices(text).map(({ raw, currency, amount }) => ({ raw, currency, amount }));
}

test('recognises supported symbol-prefixed prices', () => {
  assert.deepEqual(simplified('€120 £85 CA$50 A$75 ₺2,000 ¥10,000'), [
    { raw: '€120', currency: 'EUR', amount: 120 },
    { raw: '£85', currency: 'GBP', amount: 85 },
    { raw: 'CA$50', currency: 'CAD', amount: 50 },
    { raw: 'A$75', currency: 'AUD', amount: 75 },
    { raw: '₺2,000', currency: 'TRY', amount: 2000 },
    { raw: '¥10,000', currency: 'JPY', amount: 10000 },
  ]);
});

test('recognises ISO codes before and after numbers for all supported currencies', () => {
  assert.deepEqual(simplified('EUR 120; 85 GBP; CAD 50; 75 AUD; TRY 2.000; AED 300; 250 SAR; JPY 10 000'), [
    { raw: 'EUR 120', currency: 'EUR', amount: 120 },
    { raw: '85 GBP', currency: 'GBP', amount: 85 },
    { raw: 'CAD 50', currency: 'CAD', amount: 50 },
    { raw: '75 AUD', currency: 'AUD', amount: 75 },
    { raw: 'TRY 2.000', currency: 'TRY', amount: 2000 },
    { raw: 'AED 300', currency: 'AED', amount: 300 },
    { raw: '250 SAR', currency: 'SAR', amount: 250 },
    { raw: 'JPY 10 000', currency: 'JPY', amount: 10000 },
  ]);
});

test('supports non-breaking spaces and preserves source offsets', () => {
  const text = 'Offer: EUR\u00A01.234,56 today';
  const [match] = findPrices(text);
  assert.equal(match.raw, 'EUR\u00A01.234,56');
  assert.equal(match.amount, 1234.56);
  assert.equal(text.slice(match.start, match.end), match.raw);
});

test('returns multiple matches in original order', () => {
  const matches = simplified('First €10, then AED 20, finally 30 SAR.');
  assert.deepEqual(matches.map(({ currency }) => currency), ['EUR', 'AED', 'SAR']);
});

test('excludes USD, bare dollars, IQD, and Iraqi dinar markers', () => {
  assert.deepEqual(simplified('$100 USD 100 100 USD IQD 50 50 IQD 50 د.ع'), []);
});

test('rejects malformed numeric tokens instead of matching a valid prefix', () => {
  assert.deepEqual(simplified('EUR 1,23,4 and GBP 1.234.56 and AED 12,3456'), []);
});

test('does not recognise currency codes embedded inside words', () => {
  assert.deepEqual(simplified('SUPEREUR 100 and JPYA 20 and PAID 30'), []);
});
