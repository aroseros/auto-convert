# USD Auto Converter

A compact Chrome Manifest V3 extension that converts supported currencies into US dollars. It provides a manual popup converter and automatically appends an approximate USD amount beside recognised webpage prices while preserving the original price.

## Supported source currencies

EUR, GBP, CAD, AUD, TRY, AED, SAR and JPY. USD is always the target, and IQD is intentionally excluded.

## Features

- Converts while you type in a compact popup.
- Remembers the last selected source currency.
- Copies the USD result with one click.
- Detects normal prices and prices split across nearby HTML elements.
- Converts dynamically loaded webpage prices.
- Displays results as `€120 ≈ $…` without replacing the original price.
- Can inject automatic conversion into tabs that were already open.
- Lets you disable page conversion and removes existing annotations.
- Uses free Frankfurter reference rates and caches them for 12 hours.
- Contains no analytics, advertisements or remote scripts.

## Install in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose this repository folder, which contains `manifest.json`.
6. Pin **USD Auto Converter** from Chrome's extensions menu.

Automatic webpage conversion is enabled by default. It works on normal `http://` and `https://` pages, but Chrome does not allow extensions to inject into protected pages such as `chrome://extensions`.

## Development

Use a recent Node.js release, then run:

```bash
npm test
npm run validate
npm run package
```

`test-page.html` contains static, split-element, excluded and dynamically inserted price examples for browser testing. The packaged extension is written to `dist/usd-auto-converter-v1.1.0.zip`.

## Privacy

Page text is examined only inside the browser and is never sent to the rate provider. The extension stores preferences and cached exchange rates only. See [PRIVACY.md](PRIVACY.md).

## Exchange-rate source

Rates come from the free Frankfurter v2 API. They are daily reference rates intended for convenient estimates, not live trading, card settlement or accounting.
