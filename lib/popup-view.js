(function exposePopupView(root, factory) {
  const formatter = root.UsdAutoConverterFormatter
    || (typeof require === 'function' ? require('./formatter.js') : null);
  const api = factory(formatter);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterPopupView = api;
})(globalThis, (formatter) => {
  if (!formatter) throw new Error('UsdAutoConverterFormatter is required');

  const { parseFlexibleNumber, convertToUsd, formatUsd, formatRate } = formatter;
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  function formatRateDate(isoDate) {
    if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return '';
    return dateFormatter.format(date);
  }

  function buildPopupView(amountText, currency, payload) {
    const empty = { result: '—', rateText: '', metaText: '', error: '', canCopy: false };
    if (!payload) return { ...empty, metaText: 'Loading rates…' };
    if (!payload.ok) return { ...empty, error: payload.error || 'Unable to load exchange rates' };

    const rate = payload.data?.rates?.[currency];
    const date = payload.data?.dates?.[currency];
    if (!Number.isFinite(rate) || rate <= 0) {
      return { ...empty, error: `${currency} rate is unavailable` };
    }

    const rateText = `1 ${currency} = $${formatRate(rate)}`;
    const formattedDate = formatRateDate(date);
    const metaPrefix = payload.stale ? 'Cached' : 'Updated';
    const metaText = formattedDate ? `${metaPrefix} · ${formattedDate}` : metaPrefix;
    const amount = parseFlexibleNumber(amountText);
    const converted = amount === null ? null : convertToUsd(amount, rate);

    return {
      result: converted === null ? '—' : formatUsd(converted),
      rateText,
      metaText,
      error: '',
      canCopy: converted !== null,
    };
  }

  return Object.freeze({ buildPopupView, formatRateDate });
});
