const test = require('node:test');
const assert = require('node:assert/strict');

const { SUPPORTED_CODES } = require('../lib/currencies.js');
const {
  CACHE_TTL_MS,
  validateAndTransformRows,
  isFresh,
  isValidCache,
} = require('../lib/rates.js');
const { createRateService } = require('../lib/rate-service.js');

function validRows() {
  return SUPPORTED_CODES.map((quote, index) => ({
    date: `2026-07-${String(10 + index).padStart(2, '0')}`,
    base: 'USD',
    quote,
    rate: 0.5 + index * 0.1,
  }));
}

test('validates Frankfurter rows and inverts USD quote rates', () => {
  const cache = validateAndTransformRows(validRows(), 123456789);
  assert.equal(cache.fetchedAt, 123456789);
  assert.equal(cache.rates.EUR, 2);
  assert.equal(cache.rates.GBP, 1 / 0.6);
  assert.equal(cache.dates.JPY, '2026-07-17');
  assert.deepEqual(Object.keys(cache.rates), SUPPORTED_CODES);
});

test('rejects incomplete, duplicated, or malformed API responses', () => {
  assert.throws(() => validateAndTransformRows(validRows().slice(1), Date.now()), /missing/i);
  assert.throws(() => validateAndTransformRows([...validRows(), validRows()[0]], Date.now()), /duplicate/i);
  assert.throws(() => validateAndTransformRows(validRows().map((row, i) => i === 0 ? { ...row, base: 'EUR' } : row), Date.now()), /base/i);
  assert.throws(() => validateAndTransformRows(validRows().map((row, i) => i === 0 ? { ...row, rate: 0 } : row), Date.now()), /rate/i);
  assert.throws(() => validateAndTransformRows(validRows().map((row, i) => i === 0 ? { ...row, date: '26-07-01' } : row), Date.now()), /date/i);
});

test('uses a strict twelve-hour freshness window', () => {
  const cache = validateAndTransformRows(validRows(), 1_000_000);
  assert.equal(isFresh(cache, 1_000_000 + CACHE_TTL_MS - 1), true);
  assert.equal(isFresh(cache, 1_000_000 + CACHE_TTL_MS), false);
  assert.equal(isFresh(cache, 999_999), false);
});

test('validates persisted cache shape and values', () => {
  const cache = validateAndTransformRows(validRows(), 1234);
  assert.equal(isValidCache(cache), true);
  assert.equal(isValidCache({ ...cache, rates: { ...cache.rates, EUR: -1 } }), false);
  assert.equal(isValidCache({ ...cache, dates: { ...cache.dates, JPY: 'bad' } }), false);
  assert.equal(isValidCache(null), false);
});

test('rate service returns fresh cache without fetching', async () => {
  const cache = validateAndTransformRows(validRows(), 10_000);
  let fetchCount = 0;
  const service = createRateService({
    readCache: async () => cache,
    writeCache: async () => assert.fail('fresh cache must not be rewritten'),
    fetchRows: async () => { fetchCount += 1; return validRows(); },
    now: () => 10_000 + 100,
  });

  const result = await service.getRates();
  assert.equal(result.source, 'cache');
  assert.equal(result.stale, false);
  assert.equal(fetchCount, 0);
});

test('rate service fetches and persists stale data', async () => {
  const staleCache = validateAndTransformRows(validRows(), 1);
  let saved;
  const service = createRateService({
    readCache: async () => staleCache,
    writeCache: async (cache) => { saved = cache; },
    fetchRows: async () => validRows(),
    now: () => CACHE_TTL_MS + 100,
  });

  const result = await service.getRates();
  assert.equal(result.source, 'network');
  assert.equal(result.stale, false);
  assert.equal(saved.fetchedAt, CACHE_TTL_MS + 100);
});

test('rate service falls back to stale valid cache on network failure', async () => {
  const staleCache = validateAndTransformRows(validRows(), 1);
  const service = createRateService({
    readCache: async () => staleCache,
    writeCache: async () => {},
    fetchRows: async () => { throw new Error('offline'); },
    now: () => CACHE_TTL_MS + 100,
  });

  const result = await service.getRates();
  assert.equal(result.source, 'stale-cache');
  assert.equal(result.stale, true);
  assert.equal(result.data, staleCache);
});

test('rate service deduplicates simultaneous network refreshes', async () => {
  let resolveFetch;
  let fetchCount = 0;
  const service = createRateService({
    readCache: async () => null,
    writeCache: async () => {},
    fetchRows: async () => {
      fetchCount += 1;
      return new Promise((resolve) => { resolveFetch = () => resolve(validRows()); });
    },
    now: () => 5000,
  });

  const first = service.getRates();
  const second = service.getRates();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 1);
  resolveFetch();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, b);
});

test('rate service reports an error when neither network nor cache is usable', async () => {
  const service = createRateService({
    readCache: async () => ({ broken: true }),
    writeCache: async () => {},
    fetchRows: async () => { throw new Error('offline'); },
    now: () => 5000,
  });

  await assert.rejects(() => service.getRates(), /unable to load exchange rates/i);
});
