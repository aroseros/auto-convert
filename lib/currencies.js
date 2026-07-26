(function exposeCurrencies(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterCurrencies = api;
})(globalThis, () => {
  const SUPPORTED_CURRENCIES = Object.freeze([
    Object.freeze({ code: 'EUR', name: 'Euro', symbol: '€' }),
    Object.freeze({ code: 'GBP', name: 'British Pound', symbol: '£' }),
    Object.freeze({ code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' }),
    Object.freeze({ code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }),
    Object.freeze({ code: 'TRY', name: 'Turkish Lira', symbol: '₺' }),
    Object.freeze({ code: 'AED', name: 'UAE Dirham', symbol: 'AED' }),
    Object.freeze({ code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' }),
    Object.freeze({ code: 'JPY', name: 'Japanese Yen', symbol: '¥' }),
  ]);

  const SUPPORTED_CODES = Object.freeze(SUPPORTED_CURRENCIES.map(({ code }) => code));
  const DEFAULTS = Object.freeze({ sourceCurrency: 'EUR', autoConvert: true });

  return Object.freeze({ SUPPORTED_CURRENCIES, SUPPORTED_CODES, DEFAULTS });
});
