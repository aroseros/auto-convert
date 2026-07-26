(() => {
  const { SUPPORTED_CURRENCIES, SUPPORTED_CODES, DEFAULTS } = globalThis.UsdAutoConverterCurrencies;
  const { buildPopupView } = globalThis.UsdAutoConverterPopupView;
  const { syncTab } = globalThis.UsdAutoConverterInjection;

  const elements = {};
  let ratePayload = null;
  let currentView = null;
  let copyResetTimer = null;

  async function initialise() {
    Object.assign(elements, {
      amount: document.querySelector('#amount'),
      currency: document.querySelector('#currency'),
      result: document.querySelector('#result'),
      rate: document.querySelector('#rate'),
      meta: document.querySelector('#meta'),
      error: document.querySelector('#error'),
      copy: document.querySelector('#copy'),
      copyLabel: document.querySelector('#copy-label'),
      autoConvert: document.querySelector('#auto-convert'),
    });

    populateCurrencies();
    bindEvents();

    const preferences = await chrome.storage.sync.get(DEFAULTS);
    elements.currency.value = SUPPORTED_CODES.includes(preferences.sourceCurrency)
      ? preferences.sourceCurrency
      : DEFAULTS.sourceCurrency;
    elements.autoConvert.checked = typeof preferences.autoConvert === 'boolean'
      ? preferences.autoConvert
      : DEFAULTS.autoConvert;

    render();
    await synchroniseCurrentTab(elements.autoConvert.checked);

    try {
      ratePayload = await chrome.runtime.sendMessage({ type: 'GET_RATES' });
    } catch (error) {
      ratePayload = { ok: false, error: error instanceof Error ? error.message : 'Unable to load exchange rates' };
    }
    render();
  }

  function populateCurrencies() {
    const fragment = document.createDocumentFragment();
    for (const currency of SUPPORTED_CURRENCIES) {
      const option = document.createElement('option');
      option.value = currency.code;
      option.textContent = `${currency.code} · ${currency.name}`;
      fragment.append(option);
    }
    elements.currency.append(fragment);
  }

  function bindEvents() {
    elements.amount.addEventListener('input', render);
    elements.currency.addEventListener('change', async () => {
      await chrome.storage.sync.set({ sourceCurrency: elements.currency.value });
      render();
    });
    elements.autoConvert.addEventListener('change', async () => {
      const checked = elements.autoConvert.checked;
      await chrome.storage.sync.set({ autoConvert: checked });
      await synchroniseCurrentTab(checked);
    });
    elements.copy.addEventListener('click', copyResult);
  }

  async function synchroniseCurrentTab(enabled) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await syncTab(chrome, tab, enabled);
    } catch {
      // Browser-internal pages and closed tabs cannot be injected.
    }
  }

  function render() {
    currentView = buildPopupView(elements.amount.value, elements.currency.value, ratePayload);
    elements.result.textContent = currentView.result;
    elements.rate.textContent = currentView.rateText || (ratePayload ? '' : 'Loading rates…');
    elements.meta.textContent = currentView.metaText;
    elements.error.textContent = currentView.error;
    elements.copy.disabled = !currentView.canCopy;
    elements.result.title = currentView.canCopy ? currentView.result : '';
  }

  async function copyResult() {
    if (!currentView?.canCopy) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentView.result);
      } else {
        fallbackCopy(currentView.result);
      }
      showCopyFeedback('Copied');
    } catch {
      showCopyFeedback('Failed');
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }

  function showCopyFeedback(label) {
    clearTimeout(copyResetTimer);
    elements.copyLabel.textContent = label;
    copyResetTimer = setTimeout(() => { elements.copyLabel.textContent = 'Copy'; }, 1200);
  }

  document.addEventListener('DOMContentLoaded', initialise, { once: true });
})();
