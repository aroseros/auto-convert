const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WRAPPER_CLASS,
  ANNOTATION_CLASS,
  isExcludedElement,
  buildAnnotationText,
  buildAnnotationTitle,
} = require('../lib/content-logic.js');

function fakeElement(tagName, { parent = null, classes = [], contenteditable = null, isContentEditable = false } = {}) {
  return {
    nodeType: 1,
    tagName,
    parentElement: parent,
    isContentEditable,
    classList: { contains: (value) => classes.includes(value) },
    getAttribute: (name) => name === 'contenteditable' ? contenteditable : null,
  };
}

test('excludes unsafe and editable element ancestry', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'CANVAS', 'SELECT', 'OPTION']) {
    assert.equal(isExcludedElement(fakeElement(tag)), true, tag);
  }
  assert.equal(isExcludedElement(fakeElement('DIV', { contenteditable: 'true' })), true);
  assert.equal(isExcludedElement(fakeElement('DIV', { contenteditable: 'plaintext-only' })), true);
  assert.equal(isExcludedElement(fakeElement('DIV', { contenteditable: 'false' })), false);
  assert.equal(isExcludedElement(fakeElement('SPAN', { isContentEditable: true })), true);
});

test('excludes nodes inside converter wrappers and annotations', () => {
  const wrapper = fakeElement('SPAN', { classes: [WRAPPER_CLASS] });
  const annotation = fakeElement('SPAN', { classes: [ANNOTATION_CLASS] });
  assert.equal(isExcludedElement(fakeElement('EM', { parent: wrapper })), true);
  assert.equal(isExcludedElement(fakeElement('EM', { parent: annotation })), true);
});

test('allows ordinary webpage text containers', () => {
  const article = fakeElement('ARTICLE');
  assert.equal(isExcludedElement(fakeElement('P', { parent: article })), false);
});

test('builds approximate USD annotation text', () => {
  assert.equal(buildAnnotationText(120, 1.1624), '≈ $139.49');
  assert.equal(buildAnnotationText(-1, 1.2), '');
  assert.equal(buildAnnotationText(10, 0), '');
});

test('builds an informative annotation title', () => {
  assert.equal(buildAnnotationTitle('EUR', 1.1624, '2026-07-25'), '1 EUR = $1.1624 · Rate date 25 Jul 2026');
  assert.equal(buildAnnotationTitle('EUR', 1.1624, ''), '1 EUR = $1.1624');
});
