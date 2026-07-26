(function exposeInjection(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UsdAutoConverterInjection = api;
})(globalThis, () => {
  const CONTENT_JS_FILES = Object.freeze([
    'lib/currencies.js',
    'lib/formatter.js',
    'lib/price-parser.js',
    'lib/split-price.js',
    'lib/content-logic.js',
    'content.js',
  ]);
  const CONTENT_CSS_FILES = Object.freeze(['content.css']);

  function isSupportedPageUrl(url) {
    return typeof url === 'string' && /^https?:\/\//iu.test(url);
  }

  async function syncTab(chromeApi, tab, enabled) {
    if (!chromeApi?.tabs || !chromeApi?.scripting || !Number.isInteger(tab?.id) || !isSupportedPageUrl(tab.url)) {
      return { ok: false, injected: false };
    }

    const message = { type: 'USD_AUTO_CONVERTER_SET_ENABLED', enabled: Boolean(enabled) };

    if (!enabled) {
      try {
        await chromeApi.tabs.sendMessage(tab.id, message);
      } catch {
        // A missing receiver simply means the content script was never loaded in this tab.
      }
      return { ok: true, injected: false };
    }

    try {
      const response = await chromeApi.tabs.sendMessage(tab.id, { type: 'USD_AUTO_CONVERTER_PING' });
      if (response?.ready) {
        await chromeApi.tabs.sendMessage(tab.id, message);
        return { ok: true, injected: false };
      }
    } catch {
      // Continue to programmatic injection below.
    }

    await chromeApi.scripting.insertCSS({
      target: { tabId: tab.id },
      files: [...CONTENT_CSS_FILES],
    });
    await chromeApi.scripting.executeScript({
      target: { tabId: tab.id },
      files: [...CONTENT_JS_FILES],
    });
    await chromeApi.tabs.sendMessage(tab.id, message);
    return { ok: true, injected: true };
  }

  async function syncOpenTabs(chromeApi, enabled) {
    if (!chromeApi?.tabs?.query) return [];
    const tabs = await chromeApi.tabs.query({});
    const supportedTabs = tabs.filter((tab) => Number.isInteger(tab?.id) && isSupportedPageUrl(tab.url));
    return Promise.all(supportedTabs.map(async (tab) => {
      try {
        return await syncTab(chromeApi, tab, enabled);
      } catch (error) {
        return {
          ok: false,
          injected: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }));
  }

  return Object.freeze({
    CONTENT_JS_FILES,
    CONTENT_CSS_FILES,
    isSupportedPageUrl,
    syncTab,
    syncOpenTabs,
  });
});
