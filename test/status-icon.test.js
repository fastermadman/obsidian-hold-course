'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.document = { body: { classList: { contains: () => false } } };

const { statusIcon, cycleStatus } = require('./_bootstrap.js');

// #51 — each of the 3 states has a distinct icon, and the icon set lines up
// with the states cycleStatus() actually produces.
test('every cycled status has a distinct icon', () => {
  const seen = new Set();
  let s = 'not-started';
  for (let i = 0; i < 3; i++) {
    const icon = statusIcon(s);
    assert.equal(typeof icon, 'string');
    assert.ok(icon.length > 0);
    seen.add(icon);
    s = cycleStatus(s);
  }
  assert.equal(seen.size, 3, 'three states -> three different icons');
});

test('unknown status falls back to not-started icon', () => {
  assert.equal(statusIcon('bogus'), statusIcon('not-started'));
});
