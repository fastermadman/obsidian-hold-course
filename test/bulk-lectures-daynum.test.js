'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBulkLectures } = require('./_bootstrap.js');

// #66: parseBulkLectures gated auto-dating on meetingDays.length, but nextSlot()
// scans against the BULK_DAY_NUM-filtered subset. A day name outside {Mon..Sun}
// (a full "Monday" from sync_hold_course.py or a hand-edited data.json) passed
// the gate and vanished from the filter, so dayNums could be [] while
// patternActive was true — an unbounded while() on the UI thread. Fix: derive
// patternActive from dayNums, and cap the scan at 7.

test('unrecognised day names → auto-dating off, returns instead of hanging', () => {
  const r = parseBulkLectures('L1\nL2\nL3', {
    startDate: '2026-01-05',
    meetingDays: ['Monday', 'Wednesday'], // full names — not in {Mon..Sun}
  });
  assert.equal(r.patternActive, false);
  assert.equal(r.counts.lectures, 3);
  assert.equal(r.counts.undated, 3);
  assert.deepEqual(r.rows.map(row => row.date), ['', '', '']);
});

test('short day names still auto-date on the pattern', () => {
  const r = parseBulkLectures('L1\nL2\nL3', {
    startDate: '2026-01-05', // a Monday
    meetingDays: ['Mon', 'Wed'],
  });
  assert.equal(r.patternActive, true);
  assert.deepEqual(r.rows.map(row => row.date), ['2026-01-05', '2026-01-07', '2026-01-12']);
});

test('mix of valid and junk day names uses only the valid ones', () => {
  const r = parseBulkLectures('L1\nL2', {
    startDate: '2026-01-05',
    meetingDays: ['Mon', 'Funday'],
  });
  assert.equal(r.patternActive, true);
  assert.deepEqual(r.rows.map(row => row.date), ['2026-01-05', '2026-01-12']);
});

test('the 7-cap does not truncate a legitimate ≤6-day scan', () => {
  const r = parseBulkLectures('L1', {
    startDate: '2026-01-06', // a Tuesday
    meetingDays: ['Mon'],     // next slot is 6 days out
  });
  assert.deepEqual(r.rows.map(row => row.date), ['2026-01-12']);
});
