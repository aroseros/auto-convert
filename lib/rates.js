(function exposeRates(root, factory) {
  const currencies = root.UsdAutoConverterCurrencies
    || (typeof require === 'function' ? require('./currencies.js') : null);
  const api = factory(currencies);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterRates = api;
})(globalThis, (currencies) => {
  if (!currencies) throw new Error('UsdAutoConverterCurrencies is required');

  const { SUPPORTED_CODES } = currencies;
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function validateAndTransformRows(rows, fetchedAt) {
    if (!Array.isArray(rows)) throw new Error('Rate response must be an array');
    if (!Number.isFinite(fetchedAt) || fetchedAt < 0) throw new Error('Invalid fetched timestamp');

    const byQuote = new Map();
    for (const row of rows) {
      if (!row || typeof row !== 'object') throw new Error('Invalid rate row');
      if (row.base !== 'USD') throw new Error('Rate row has an invalid base currency');
      if (!SUPPORTED_CODES.includes(row.quote)) continue;
      if (byQuote.has(row.quote)) throw new Error(`Duplicate rate for ${row.quote}`);
      if (!Number.isFinite(row.rate) || row.rate <= 0) throw new Error(`Invalid rate for ${row.quote}`);
      if (typeof row.date !== 'string' || !DATE_PATTERN.test(row.date)) throw new Error(`Invalid date for ${row.quote}`);
      byQuote.set(row.quote, row);
    }

    const rates = {};
    const dates = {};
    for (const code of SUPPORTED_CODES) {
      const row = byQuote.get(code);
      if (!row) throw new Error(`Missing rate for ${code}`);
      rates[code] = 1 / row.rate;
      dates[code] = row.date;
    }

    return { rates, dates, fetchedAt };
  }

  function isValidCache(cache) {
    if (!cache || typeof cache !== 'object') return false;
    if (!Number.isFinite(cache.fetchedAt) || cache.fetchedAt < 0) return false;
    if (!cache.rates || !cache.dates) return false;

    return SUPPORTED_CODES.every((code) => (
      Number.isFinite(cache.rates[code])
      && cache.rates[code] > 0
      && typeof cache.dates[code] === 'string'
      && DATE_PATTERN.test(cache.dates[code])
    ));
  }

  function isFresh(cache, now = Date.now()) {
    return isValidCache(cache)
      && Number.isFinite(now)
      && now >= cache.fetchedAt
      && now - cache.fetchedAt < CACHE_TTL_MS;
  }

  return Object.freeze({ CACHE_TTL_MS, validateAndTransformRows, isValidCache, isFresh });
});
