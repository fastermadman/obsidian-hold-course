'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// typeIcon() reads nothing from the DOM, but _bootstrap loads main.js which
// touches document at module scope elsewhere. Minimal stub.
global.document = { body: { classList: { contains: () => false } } };

const { typeIcon, ASSIGNMENT_TYPES } = require('./_bootstrap.js');

// #45 — every assignment type resolves to a non-empty Lucide icon id, and an
// unknown type falls back to the 'Other' icon rather than undefined.
test('every assignment type has an icon', () => {
  for (const type of ASSIGNMENT_TYPES) {
    assert.equal(typeof typeIcon(type), 'string');
    assert.ok(typeIcon(type).length > 0, `${type} has an icon`);
  }
});

test('unknown type falls back to the Other icon', () => {
  assert.equal(typeIcon('Nonsense'), typeIcon('Other'));
  assert.equal(typeIcon(undefined), typeIcon('Other'));
});
