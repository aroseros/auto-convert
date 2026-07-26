const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTENT_JS_FILES,
  CONTENT_CSS_FILES,
  isSupportedPageUrl,
  syncTab,
  syncOpenTabs,
} = require('../lib/injection.js');

test('recognises normal web pages and rejects browser-internal pages', () => {
  assert.equal(isSupportedPageUrl('https://example.com/item'), true);
  assert.equal(isSupportedPageUrl('http://localhost:3000'), true);
  assert.equal(isSupportedPageUrl('chrome://extensions'), false);
  assert.equal(isSupportedPageUrl('file:///tmp/test.html'), false);
});

test('injects the converter into an enabled tab when no content receiver exists', async () => {
  const calls = [];
  let messageCount = 0;
  const chromeApi = {
    tabs: {
      sendMessage: async (tabId, message) => {
        calls.push(['message', tabId, message.type]);
        messageCount += 1;
        if (messageCount === 1) throw new Error('Receiving end does not exist');
        return { ready: true, enabled: true };
      },
    },
    scripting: {
      insertCSS: async (details) => calls.push(['css', details]),
      executeScript: async (details) => calls.push(['js', details]),
    },
  };

  const result = await syncTab(chromeApi, { id: 42, url: 'https://example.com' }, true);

  assert.deepEqual(result, { ok: true, injected: true });
  assert.deepEqual(calls[1][1].files, CONTENT_CSS_FILES);
  assert.deepEqual(calls[2][1].files, CONTENT_JS_FILES);
  assert.deepEqual(calls.at(-1), ['message', 42, 'USD_AUTO_CONVERTER_SET_ENABLED']);
});

test('does not inject when disabling and quietly handles a missing receiver', async () => {
  let injectionCalls = 0;
  const chromeApi = {
    tabs: {
      sendMessage: async () => { throw new Error('Receiving end does not exist'); },
    },
    scripting: {
      insertCSS: async () => { injectionCalls += 1; },
      executeScript: async () => { injectionCalls += 1; },
    },
  };

  const result = await syncTab(chromeApi, { id: 7, url: 'https://example.com' }, false);
  assert.deepEqual(result, { ok: true, injected: false });
  assert.equal(injectionCalls, 0);
});

test('syncs all open supported tabs without one failure stopping the rest', async () => {
  const messaged = [];
  const chromeApi = {
    tabs: {
      query: async () => [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'chrome://settings' },
        { id: 3, url: 'http://localhost/test' },
      ],
      sendMessage: async (id) => {
        messaged.push(id);
        if (id === 3) throw new Error('tab closed');
        return { ready: true };
      },
    },
    scripting: {
      insertCSS: async () => {},
      executeScript: async () => {},
    },
  };

  const results = await syncOpenTabs(chromeApi, false);
  assert.equal(results.length, 2);
  assert.deepEqual(messaged, [1, 3]);
});
