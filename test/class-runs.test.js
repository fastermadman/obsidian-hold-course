'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { markClassRuns } = require('./_bootstrap.js');

const item = (id) => ({ cls: { id } });

test('lone items get no run marker', () => {
  assert.deepEqual(markClassRuns([item('a'), item('b'), item('c')]), [null, null, null]);
});

test('a run of two is first + last', () => {
  assert.deepEqual(markClassRuns([item('a'), item('a')]), ['first', 'last']);
});

test('a run of three marks the middle', () => {
  assert.deepEqual(markClassRuns([item('a'), item('a'), item('a')]), ['first', 'mid', 'last']);
});

test('runs and lone items interleave', () => {
  assert.deepEqual(
    markClassRuns([item('a'), item('b'), item('b'), item('c'), item('c'), item('c')]),
    [null, 'first', 'last', 'first', 'mid', 'last'],
  );
});

test('same class split by another class is two runs, not one', () => {
  assert.deepEqual(
    markClassRuns([item('a'), item('b'), item('a')]),
    [null, null, null],
  );
});

test('empty input', () => {
  assert.deepEqual(markClassRuns([]), []);
});
