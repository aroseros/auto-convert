const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseFlexibleNumber,
  convertToUsd,
  formatUsd,
  formatRate,
} = require('../lib/formatter.js');

test('parses common grouped and decimal number formats', () => {
  assert.equal(parseFlexibleNumber('1,234.56'), 1234.56);
  assert.equal(parseFlexibleNumber('1.234,56'), 1234.56);
  assert.equal(parseFlexibleNumber('2 000'), 2000);
  assert.equal(parseFlexibleNumber("2'000.5"), 2000.5);
  assert.equal(parseFlexibleNumber('1000,5'), 1000.5);
  assert.equal(parseFlexibleNumber('10,000'), 10000);
});

test('rejects malformed, ambiguous, and unsafe numbers', () => {
  assert.equal(parseFlexibleNumber(''), null);
  assert.equal(parseFlexibleNumber('1,23,4'), null);
  assert.equal(parseFlexibleNumber('1.234.56'), null);
  assert.equal(parseFlexibleNumber('12,3456'), null);
  assert.equal(parseFlexibleNumber('abc'), null);
  assert.equal(parseFlexibleNumber('1000000000000001'), null);
});

test('converts only finite non-negative values with positive rates', () => {
  assert.equal(convertToUsd(100, 1.25), 125);
  assert.equal(convertToUsd(0, 1.25), 0);
  assert.equal(convertToUsd(-1, 1.25), null);
  assert.equal(convertToUsd(100, 0), null);
  assert.equal(convertToUsd(Number.POSITIVE_INFINITY, 1.2), null);
});

test('formats USD using en-GB separators and an explicit dollar sign', () => {
  assert.equal(formatUsd(1234.56), '$1,234.56');
  assert.equal(formatUsd(0), '$0.00');
  assert.equal(formatUsd(Number.NaN), '');
});

test('formats rates compactly without meaningless trailing zeroes', () => {
  assert.equal(formatRate(1.2), '1.2');
  assert.equal(formatRate(1.23456789), '1.234568');
  assert.equal(formatRate(Number.NaN), '');
});
