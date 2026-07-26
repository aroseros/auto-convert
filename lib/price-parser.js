(function exposePriceParser(root, factory) {
  const formatter = root.UsdAutoConverterFormatter
    || (typeof require === 'function' ? require('./formatter.js') : null);
  const api = factory(formatter);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterPriceParser = api;
})(globalThis, (formatter) => {
  if (!formatter) throw new Error('UsdAutoConverterFormatter is required');

  const { parseFlexibleNumber } = formatter;
  const CODE_GROUP = 'EUR|GBP|CAD|AUD|TRY|AED|SAR|JPY';
  const NUMBER = String.raw`(?:\d{1,3}(?:[\s\u00A0\u202F'’.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
  const PREFIX = String.raw`(?:CA\$|C\$|AU\$|A\$|€|£|₺|¥|(?<![A-Z])(?:${CODE_GROUP})(?![A-Z]))`;
  const SUFFIX = String.raw`(?<![A-Z])(?:${CODE_GROUP})(?![A-Z])`;
  const PRICE_PATTERN = new RegExp(
    String.raw`(?:(?<prefix>${PREFIX})\s*(?<prefixAmount>${NUMBER})(?!\d|[.,]\d)|(?<![\d.,])(?<suffixAmount>${NUMBER})\s*(?<suffix>${SUFFIX}))`,
    'giu',
  );

  const SYMBOL_TO_CODE = Object.freeze({
    '€': 'EUR',
    '£': 'GBP',
    'CA$': 'CAD',
    'C$': 'CAD',
    'AU$': 'AUD',
    'A$': 'AUD',
    '₺': 'TRY',
    '¥': 'JPY',
  });

  function findPrices(text) {
    if (typeof text !== 'string' || !text) return [];

    const results = [];
    PRICE_PATTERN.lastIndex = 0;
    let match;

    while ((match = PRICE_PATTERN.exec(text)) !== null) {
      const marker = match.groups.prefix || match.groups.suffix;
      const numberText = match.groups.prefixAmount || match.groups.suffixAmount;
      const amount = parseFlexibleNumber(numberText);
      const currency = markerToCurrency(marker);

      if (amount !== null && currency) {
        results.push({
          start: match.index,
          end: match.index + match[0].length,
          raw: match[0],
          currency,
          amount,
        });
      }

      if (match[0].length === 0) PRICE_PATTERN.lastIndex += 1;
    }

    return results;
  }

  function markerToCurrency(marker) {
    if (!marker) return null;
    const upper = marker.toUpperCase();
    if (/^(EUR|GBP|CAD|AUD|TRY|AED|SAR|JPY)$/.test(upper)) return upper;
    return SYMBOL_TO_CODE[marker] || null;
  }

  return Object.freeze({ findPrices });
});
