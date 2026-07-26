(function exposeContentLogic(root, factory) {
  const formatter = root.UsdAutoConverterFormatter
    || (typeof require === 'function' ? require('./formatter.js') : null);
  const api = factory(formatter);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterContentLogic = api;
})(globalThis, (formatter) => {
  if (!formatter) throw new Error('UsdAutoConverterFormatter is required');

  const { convertToUsd, formatUsd, formatRate } = formatter;
  const WRAPPER_CLASS = 'usd-auto-converter__price';
  const ANNOTATION_CLASS = 'usd-auto-converter__annotation';
  const EXCLUDED_TAGS = new Set([
    'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON',
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE',
    'CODE', 'PRE', 'KBD', 'SAMP',
    'SVG', 'CANVAS', 'IFRAME', 'OBJECT', 'EMBED',
  ]);
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  function isExcludedElement(element) {
    let current = element;
    while (current && current.nodeType === 1) {
      const tagName = String(current.tagName || '').toUpperCase();
      if (EXCLUDED_TAGS.has(tagName)) return true;
      if (current.classList?.contains(WRAPPER_CLASS) || current.classList?.contains(ANNOTATION_CLASS)) return true;
      const editable = current.getAttribute?.('contenteditable');
      if (current.isContentEditable || (editable !== null && editable !== 'false')) return true;
      current = current.parentElement;
    }
    return false;
  }

  function buildAnnotationText(amount, rate) {
    const converted = convertToUsd(amount, rate);
    return converted === null ? '' : `≈ ${formatUsd(converted)}`;
  }

  function buildAnnotationTitle(currency, rate, isoDate) {
    if (typeof currency !== 'string' || !formatRate(rate)) return '';
    let title = `1 ${currency} = $${formatRate(rate)}`;
    const formattedDate = formatDate(isoDate);
    if (formattedDate) title += ` · Rate date ${formattedDate}`;
    return title;
  }

  function formatDate(isoDate) {
    if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return '';
    return dateFormatter.format(date);
  }

  return Object.freeze({
    WRAPPER_CLASS,
    ANNOTATION_CLASS,
    isExcludedElement,
    buildAnnotationText,
    buildAnnotationTitle,
  });
});
