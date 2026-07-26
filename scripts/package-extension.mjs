import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const output = path.join(dist, 'usd-auto-converter-v1.1.0.zip');
const files = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'content.js',
  'content.css',
  'README.md',
  'PRIVACY.md',
  'lib/currencies.js',
  'lib/formatter.js',
  'lib/price-parser.js',
  'lib/split-price.js',
  'lib/rates.js',
  'lib/rate-service.js',
  'lib/popup-view.js',
  'lib/content-logic.js',
  'lib/injection.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

fs.mkdirSync(dist, { recursive: true });
fs.rmSync(output, { force: true });
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing package file: ${file}`);
}
execFileSync('zip', ['-q', '-9', '-X', output, ...files], { cwd: root, stdio: 'inherit' });
console.log(output);
