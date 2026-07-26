import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = path.resolve(process.argv[2] || process.cwd());
const requireFromRoot = createRequire(path.join(root, 'package.json'));

function fail(message) {
  throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) fail(`Missing file: ${relativePath}`);
}

function pngDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) fail(`${relativePath} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

assertFile('manifest.json');
const manifest = JSON.parse(read('manifest.json'));

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (manifest.version !== '1.1.0') fail('manifest version must be 1.1.0');
if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage', 'scripting'])) fail('Required permissions are incorrect');
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify([
  'https://api.frankfurter.dev/*',
  'http://*/*',
  'https://*/*',
])) {
  fail('Required API and webpage host permissions are incorrect');
}
if (manifest.background?.service_worker !== 'background.js') fail('Background service worker is missing');
if (manifest.action?.default_popup !== 'popup.html') fail('Popup entry is missing');

const referenced = new Set([
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action.default_icon || {}),
]);
for (const entry of manifest.content_scripts || []) {
  for (const file of entry.js || []) referenced.add(file);
  for (const file of entry.css || []) referenced.add(file);
}
for (const file of referenced) assertFile(file);

const expectedContentScripts = [
  'lib/currencies.js',
  'lib/formatter.js',
  'lib/price-parser.js',
  'lib/split-price.js',
  'lib/content-logic.js',
  'content.js',
];
const actualContentScripts = manifest.content_scripts?.[0]?.js || [];
if (JSON.stringify(actualContentScripts) !== JSON.stringify(expectedContentScripts)) {
  fail('Content scripts are not loaded in the required dependency order');
}

const currencies = requireFromRoot('./lib/currencies.js');
const expectedCodes = ['EUR', 'GBP', 'CAD', 'AUD', 'TRY', 'AED', 'SAR', 'JPY'];
if (JSON.stringify(currencies.SUPPORTED_CODES) !== JSON.stringify(expectedCodes)) fail('Supported currency list is incorrect');
if (currencies.DEFAULTS.sourceCurrency !== 'EUR' || currencies.DEFAULTS.autoConvert !== true) fail('Default preferences are incorrect');

const runtimeFiles = [
  'manifest.json', 'background.js', 'popup.html', 'popup.css', 'popup.js',
  'content.js', 'content.css',
  ...fs.readdirSync(path.join(root, 'lib')).filter((name) => name.endsWith('.js')).map((name) => `lib/${name}`),
];
for (const file of runtimeFiles) {
  const source = read(file);
  if (/\bIQD\b|د\.ع/iu.test(source)) fail(`Excluded currency appears in runtime file: ${file}`);
  if (/\beval\s*\(|new\s+Function\s*\(/u.test(source)) fail(`Remote-code pattern appears in: ${file}`);
}

for (const [sizeText, iconPath] of Object.entries(manifest.icons || {})) {
  const expected = Number(sizeText);
  const dimensions = pngDimensions(iconPath);
  if (dimensions.width !== expected || dimensions.height !== expected) {
    fail(`${iconPath} must be ${expected}x${expected}`);
  }
}

const popupHtml = read('popup.html');
if (/<script[^>]+src=["']https?:/iu.test(popupHtml)) fail('Popup must not load remote scripts');

console.log(`Extension validation passed at ${root}`);
