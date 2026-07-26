(function exposeSplitPrice(root, factory) {
  const parser = root.UsdAutoConverterPriceParser
    || (typeof require === 'function' ? require('./price-parser.js') : null);
  const api = factory(parser);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterSplitPrice = api;
})(globalThis, (parser) => {
  if (!parser) throw new Error('UsdAutoConverterPriceParser is required');

  const { findPrices } = parser;

  function findSplitPriceMatches(parts) {
    if (!Array.isArray(parts) || parts.length < 2) return [];

    const normalisedParts = parts.map((part) => typeof part === 'string' ? part : '');
    const boundaries = [];
    let text = '';

    for (let index = 0; index < normalisedParts.length; index += 1) {
      const start = text.length;
      text += normalisedParts[index];
      boundaries.push({ index, start, end: text.length });
    }

    const prices = findPrices(text);
    if (prices.length !== 1) return [];

    const [price] = prices;
    const touched = boundaries.filter(({ start, end }) => end > start && price.start < end && price.end > start);
    if (touched.length < 2) return [];

    return [{
      ...price,
      firstPartIndex: touched[0].index,
      lastPartIndex: touched.at(-1).index,
    }];
  }

  return Object.freeze({ findSplitPriceMatches });
});
