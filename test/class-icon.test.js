'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.document = { body: { classList: { contains: () => false } } };

const { classIconRenderKind } = require('./_bootstrap.js');
// _bootstrap stubs getIconIds() -> ['circle', 'book-open', 'presentation', 'graduation-cap']

// #44 — cls.icon is one string; how it renders is decided by membership in the
// Lucide id set, not a stored type tag.
test('a Lucide id renders as an icon', () => {
  assert.equal(classIconRenderKind('book-open'), 'lucide');
});

test('a typed symbol renders as literal text', () => {
  assert.equal(classIconRenderKind('♪'), 'literal');
  assert.equal(classIconRenderKind('LSmu'), 'literal'); // not a Lucide id
});

test('empty / unset renders nothing', () => {
  assert.equal(classIconRenderKind(''), 'none');
  assert.equal(classIconRenderKind(undefined), 'none');
  assert.equal(classIconRenderKind(null), 'none');
});
