const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPopupView, formatRateDate } = require('../lib/popup-view.js');

const payload = {
  ok: true,
  stale: false,
  source: 'network',
  data: {
    rates: { EUR: 1.1426, GBP: 1.31 },
    dates: { EUR: '2026-07-25', GBP: '2026-07-24' },
    fetchedAt: 123,
  },
};

test('builds a converted popup result for a valid amount', () => {
  assert.deepEqual(buildPopupView('100', 'EUR', payload), {
    result: '$114.26',
    rateText: '1 EUR = $1.1426',
    metaText: 'Updated · 25 Jul 2026',
    error: '',
    canCopy: true,
  });
});

test('keeps the rate visible but blanks an invalid amount result', () => {
  assert.deepEqual(buildPopupView('not a number', 'EUR', payload), {
    result: '—',
    rateText: '1 EUR = $1.1426',
    metaText: 'Updated · 25 Jul 2026',
    error: '',
    canCopy: false,
  });
});

test('labels stale rate data as cached', () => {
  const view = buildPopupView('10', 'GBP', { ...payload, stale: true, source: 'stale-cache' });
  assert.equal(view.metaText, 'Cached · 24 Jul 2026');
  assert.equal(view.result, '$13.10');
});

test('shows a clear API error', () => {
  const view = buildPopupView('10', 'EUR', { ok: false, error: 'Unable to load exchange rates' });
  assert.equal(view.result, '—');
  assert.equal(view.error, 'Unable to load exchange rates');
  assert.equal(view.canCopy, false);
});

test('shows an unavailable message when the selected rate is missing', () => {
  const view = buildPopupView('10', 'CAD', payload);
  assert.equal(view.result, '—');
  assert.match(view.error, /CAD rate is unavailable/);
});

test('formats ISO rate dates using en-GB presentation', () => {
  assert.equal(formatRateDate('2026-07-05'), '5 Jul 2026');
  assert.equal(formatRateDate('invalid'), '');
});
