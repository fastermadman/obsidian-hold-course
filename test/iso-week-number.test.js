'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getISOWeekNumber } = require('./_bootstrap.js');

test('getISOWeekNumber: known ISO week boundaries', () => {
  assert.equal(getISOWeekNumber('2026-01-01'), 1);   // Thursday, week 1
  assert.equal(getISOWeekNumber('2025-12-29'), 1);   // Monday, falls into 2026 week 1
  assert.equal(getISOWeekNumber('2025-12-28'), 52);  // Sunday, still 2025's last week
  assert.equal(getISOWeekNumber('2026-09-07'), 37);  // Monday
});
