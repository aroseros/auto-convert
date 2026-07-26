# USD Auto Converter

A compact Chrome Manifest V3 extension that converts a focused list of currencies into US dollars. It includes a manual popup converter and can append an approximate USD value beside recognised prices on webpages.

## Supported source currencies

- EUR — Euro
- GBP — British Pound
- CAD — Canadian Dollar
- AUD — Australian Dollar
- TRY — Turkish Lira
- AED — UAE Dirham
- SAR — Saudi Riyal
- JPY — Japanese Yen

USD is always the target. IQD is intentionally excluded.

## Features

- Converts while you type in the compact popup.
- Remembers the last selected source currency.
- Copies the converted USD result with one click.
- Detects high-confidence webpage prices, including prices split across nearby HTML elements, and preserves the original page content.
- Displays conversions as `€120 ≈ $…`.
- Handles prices added later by dynamic websites.
- Lets you disable automatic webpage conversion from the popup.
- Caches rates for 12 hours and can use the most recent cache temporarily while offline.
- Contains no analytics, tracking, account system, remote scripts, or advertisements.

## Install in Chrome

1. Extract `usd-auto-converter-v1.1.0.zip` to a folder.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted extension folder containing `manifest.json`.
6. Pin **USD Auto Converter** from Chrome's extensions menu for quick access.

Chrome will request access to webpages because automatic conversion must read visible page text and insert the local USD annotation. Page text is processed entirely inside the browser and is never sent to the exchange-rate provider.

## Use

Open the toolbar popup, enter an amount, and select a source currency. The USD result updates immediately.

Automatic webpage conversion is enabled by default. Version 1.1 also activates conversion on tabs that were already open when the extension was installed or updated. Use the switch at the bottom of the popup to turn it off. Turning it off removes annotations already added to open pages.

The detector intentionally skips:

- Bare `$` amounts and existing USD values.
- IQD values.
- Ambiguous or malformed numbers.
- Inputs, textareas, selectors, buttons, editable content, scripts, styles, code blocks, SVG, and canvas content.

## Exchange-rate source

Rates come from the free Frankfurter v2 API. Frankfurter provides reference exchange-rate data from institutional sources and requires no API key. These are daily reference rates intended for convenient estimates, not live trading, card settlement, accounting, or guaranteed retail exchange prices.

## Privacy

See [PRIVACY.md](PRIVACY.md). In summary, the extension stores only its preferences and cached rates. It does not collect browsing history or send webpage text anywhere.

## Development and testing

Requirements: Node.js 22 or a compatible recent Node.js release.

```bash
npm test
node scripts/validate-extension.mjs
```

`test-page.html` contains static, excluded, and dynamically inserted price examples for manual browser testing.

## Project layout

```text
manifest.json       Chrome extension configuration
background.js       API request and cache service worker
popup.*             Compact manual converter
content.*           Automatic webpage conversion
lib/                Shared parsing, formatting, and rate logic
icons/              Extension icons
tests/              Dependency-free Node.js tests
scripts/             Validation and packaging helpers
```
