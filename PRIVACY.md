# Privacy Notice

**USD Auto Converter version 1.1.0**

USD Auto Converter does not collect, sell, share, or transmit personal information.

## Data processed locally

To provide automatic conversion, the content script reads visible text nodes on webpages in the browser and looks for supported currency patterns. This page text remains on the device. It is not saved, logged, analysed remotely, or sent to the exchange-rate service.

## Data stored by the extension

The extension uses Chrome Storage to retain:

- The last selected source currency.
- Whether automatic webpage conversion is enabled.
- A temporary cache of exchange rates, their source dates, and the cache timestamp.

No browsing history, page URLs, page content, account information, or conversion history is stored.

## Network requests

The background service worker requests exchange-rate data from `api.frankfurter.dev`. The request contains only the fixed list of supported currency codes. It does not contain webpage text, visited URLs, manually entered amounts, or personal information.

The public Frankfurter service may receive standard connection metadata, such as an IP address, as part of normal HTTPS delivery. Its own service and infrastructure policies apply to that connection.

## Analytics and advertising

The extension contains no analytics, telemetry, tracking pixels, advertising SDKs, or advertisements.

## Permissions

- `storage`: saves preferences and cached exchange rates.
- `scripting`: activates the local converter on tabs that were already open when the extension was installed or when the toggle is enabled.
- Access to HTTP and HTTPS pages: detects and annotates supported prices locally.
- `https://api.frankfurter.dev/*`: retrieves reference exchange rates.
