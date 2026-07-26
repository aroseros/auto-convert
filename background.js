importScripts(
  'lib/currencies.js',
  'lib/rates.js',
  'lib/rate-service.js',
  'lib/injection.js',
);

const { SUPPORTED_CODES, DEFAULTS } = globalThis.UsdAutoConverterCurrencies;
const { createRateService } = globalThis.UsdAutoConverterRateService;
const { syncOpenTabs } = globalThis.UsdAutoConverterInjection;

const CACHE_KEY = 'usdAutoConverterRateCache';
const API_URL = `https://api.frankfurter.dev/v2/rates?base=USD&quotes=${SUPPORTED_CODES.join(',')}`;

const rateService = createRateService({
  readCache: async () => {
    const stored = await chrome.storage.local.get(CACHE_KEY);
    return stored[CACHE_KEY] || null;
  },
  writeCache: async (cache) => {
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  },
  fetchRows: async () => {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Rate API returned HTTP ${response.status}`);
    return response.json();
  },
  now: () => Date.now(),
});

async function readPreferencesAndRepairDefaults() {
  const current = await chrome.storage.sync.get(['sourceCurrency', 'autoConvert']);
  const updates = {};
  if (!SUPPORTED_CODES.includes(current.sourceCurrency)) updates.sourceCurrency = DEFAULTS.sourceCurrency;
  if (typeof current.autoConvert !== 'boolean') updates.autoConvert = DEFAULTS.autoConvert;
  if (Object.keys(updates).length) await chrome.storage.sync.set(updates);
  return { ...DEFAULTS, ...current, ...updates };
}

async function synchroniseOpenTabs(enabled) {
  try {
    await syncOpenTabs(chrome, Boolean(enabled));
  } catch {
    // Tabs can close or navigate while the synchronisation is running.
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const preferences = await readPreferencesAndRepairDefaults();
  await synchroniseOpenTabs(preferences.autoConvert);
});

chrome.runtime.onStartup.addListener(async () => {
  const preferences = await readPreferencesAndRepairDefaults();
  if (preferences.autoConvert) await synchroniseOpenTabs(true);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes.autoConvert) return;
  synchroniseOpenTabs(changes.autoConvert.newValue);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'GET_RATES') return undefined;

  rateService.getRates({ forceRefresh: Boolean(message.forceRefresh) })
    .then(sendResponse)
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to load exchange rates',
    }));

  return true;
});
