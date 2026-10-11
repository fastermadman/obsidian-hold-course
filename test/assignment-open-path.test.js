'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getAssignmentOpenPath } = require('./_bootstrap.js');

const sem = { resources: [{ id: 'b1', vaultLink: 'Books/Kant.md' }, { id: 'b2', vaultLink: '' }] };

test('own linked note wins', () => {
  assert.equal(getAssignmentOpenPath(sem, { type: 'Reading', linkedNote: 'Notes/x.md', linkedBook: 'b1' }), 'Notes/x.md');
});

test('a hand-made reading falls back to its linked book\'s file', () => {
  assert.equal(getAssignmentOpenPath(sem, { type: 'Reading', linkedBook: 'b1' }), 'Books/Kant.md');
});

test('no file anywhere, no path', () => {
  assert.equal(getAssignmentOpenPath(sem, { type: 'Reading', linkedBook: 'b2' }), '');
  assert.equal(getAssignmentOpenPath(sem, { type: 'Reading' }), '');
});

test('only Readings use the book fallback', () => {
  assert.equal(getAssignmentOpenPath(sem, { type: 'Writing', linkedBook: 'b1' }), '');
});
