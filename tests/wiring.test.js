const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const background = fs.readFileSync('background.js', 'utf8');
const popupHtml = fs.readFileSync('popup.html', 'utf8');
const popup = fs.readFileSync('popup.js', 'utf8');
const content = fs.readFileSync('content.js', 'utf8');

test('manifest wires split-price detection and programmatic page activation', () => {
  assert.deepEqual(manifest.permissions, ['storage', 'scripting']);
  assert.deepEqual(manifest.host_permissions, [
    'https://api.frankfurter.dev/*',
    'http://*/*',
    'https://*/*',
  ]);
  assert.deepEqual(manifest.content_scripts[0].js, [
    'lib/currencies.js',
    'lib/formatter.js',
    'lib/price-parser.js',
    'lib/split-price.js',
    'lib/content-logic.js',
    'content.js',
  ]);
});

test('background and popup synchronise automatic conversion with open tabs', () => {
  assert.match(background, /lib\/injection\.js/);
  assert.match(background, /syncOpenTabs/);
  assert.match(popupHtml, /lib\/injection\.js/);
  assert.match(popup, /syncTab/);
});

test('content script supports split prices and explicit activation messages', () => {
  assert.match(content, /UsdAutoConverterSplitPrice/);
  assert.match(content, /USD_AUTO_CONVERTER_PING/);
  assert.match(content, /USD_AUTO_CONVERTER_SET_ENABLED/);
});
