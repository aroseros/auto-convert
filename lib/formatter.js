(function exposeFormatter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterFormatter = api;
})(globalThis, () => {
  const MAX_SAFE_AMOUNT = 1_000_000_000_000_000;
  const groupedNumberFormatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

  function parseFlexibleNumber(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;

    let text = String(value).trim().replace(/[\u00A0\u202F]/g, ' ');
    if (!text || !/^[0-9.,'’\s]+$/.test(text)) return null;

    text = text.replace(/[ '’]/g, '');
    if (!text || !/^\d[\d.,]*$/.test(text)) return null;

    const commas = [...text.matchAll(/,/g)].map((match) => match.index);
    const dots = [...text.matchAll(/\./g)].map((match) => match.index);
    let normalised;

    if (commas.length && dots.length) {
      const decimalSeparator = commas.at(-1) > dots.at(-1) ? ',' : '.';
      const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
      const decimalIndex = text.lastIndexOf(decimalSeparator);
      const decimalDigits = text.length - decimalIndex - 1;
      if (decimalDigits < 1 || decimalDigits > 2) return null;

      const integerPart = text.slice(0, decimalIndex);
      const decimalPart = text.slice(decimalIndex + 1);
      if (!isValidGroupedInteger(integerPart, groupingSeparator)) return null;
      if (integerPart.includes(decimalSeparator)) return null;

      normalised = `${integerPart.split(groupingSeparator).join('')}.${decimalPart}`;
    } else {
      const separator = commas.length ? ',' : dots.length ? '.' : null;
      if (!separator) {
        normalised = text;
      } else {
        const parts = text.split(separator);
        if (parts.some((part) => !/^\d+$/.test(part))) return null;

        if (parts.length === 2) {
          const fractionalLength = parts[1].length;
          if (fractionalLength === 1 || fractionalLength === 2) {
            normalised = `${parts[0]}.${parts[1]}`;
          } else if (fractionalLength === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
            normalised = `${parts[0]}${parts[1]}`;
          } else {
            return null;
          }
        } else if (parts.length > 2 && parts[0].length >= 1 && parts[0].length <= 3 && parts.slice(1).every((part) => part.length === 3)) {
          normalised = parts.join('');
        } else {
          return null;
        }
      }
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(normalised)) return null;
    const number = Number(normalised);
    if (!Number.isFinite(number) || number < 0 || number > MAX_SAFE_AMOUNT) return null;
    return number;
  }

  function isValidGroupedInteger(value, separator) {
    if (!value.includes(separator)) return /^\d+$/.test(value);
    const groups = value.split(separator);
    return /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((group) => /^\d{3}$/.test(group));
  }

  function convertToUsd(amount, rate) {
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate <= 0) return null;
    const result = amount * rate;
    return Number.isFinite(result) ? result : null;
  }

  function formatUsd(value) {
    if (!Number.isFinite(value)) return '';
    return `$${groupedNumberFormatter.format(value)}`;
  }

  function formatRate(value) {
    if (!Number.isFinite(value) || value <= 0) return '';
    return new Intl.NumberFormat('en-GB', {
      maximumFractionDigits: 6,
      useGrouping: false,
    }).format(value);
  }

  return Object.freeze({ parseFlexibleNumber, convertToUsd, formatUsd, formatRate });
});
