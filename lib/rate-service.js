(function exposeRateService(root, factory) {
  const rates = root.UsdAutoConverterRates
    || (typeof require === 'function' ? require('./rates.js') : null);
  const api = factory(rates);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterRateService = api;
})(globalThis, (rateHelpers) => {
  if (!rateHelpers) throw new Error('UsdAutoConverterRates is required');

  const { isFresh, isValidCache, validateAndTransformRows } = rateHelpers;

  function createRateService({ readCache, writeCache, fetchRows, now = Date.now }) {
    if (![readCache, writeCache, fetchRows, now].every((value) => typeof value === 'function')) {
      throw new TypeError('Rate service dependencies must be functions');
    }

    let inFlightRequest = null;

    async function getRates({ forceRefresh = false } = {}) {
      const cached = await readCache();
      const currentTime = now();

      if (!forceRefresh && isFresh(cached, currentTime)) {
        return { ok: true, data: cached, stale: false, source: 'cache' };
      }

      if (inFlightRequest) return inFlightRequest;

      inFlightRequest = (async () => {
        try {
          const rows = await fetchRows();
          const transformed = validateAndTransformRows(rows, currentTime);
          await writeCache(transformed);
          return { ok: true, data: transformed, stale: false, source: 'network' };
        } catch (error) {
          if (isValidCache(cached)) {
            return { ok: true, data: cached, stale: true, source: 'stale-cache' };
          }
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(`Unable to load exchange rates: ${reason}`);
        } finally {
          inFlightRequest = null;
        }
      })();

      return inFlightRequest;
    }

    return Object.freeze({ getRates });
  }

  return Object.freeze({ createRateService });
});
