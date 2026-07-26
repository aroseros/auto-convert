const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const archive = 'dist/usd-auto-converter-v1.1.0.zip';
const touchedSource = 'manifest.json';

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('archive bytes do not depend on source access times', () => {
  execFileSync(process.execPath, ['scripts/package-extension.mjs'], { stdio: 'ignore' });
  const first = hashFile(archive);

  const stat = fs.statSync(touchedSource);
  fs.utimesSync(touchedSource, new Date(stat.atimeMs + 60_000), stat.mtime);
  execFileSync(process.execPath, ['scripts/package-extension.mjs'], { stdio: 'ignore' });
  const second = hashFile(archive);

  assert.equal(second, first);
});
