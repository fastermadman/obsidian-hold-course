'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// getDueInfo() (used by the 'status' sort) reads document.body.classList to
// pick a light/dark accent color — irrelevant to sort order, but it means
// the module needs *a* document global to avoid throwing outside a real
// Obsidian window. Minimal stub, not a DOM: only what isDarkTheme() touches.
global.document = { body: { classList: { contains: () => false } } };

const { getGlobalAssignments } = require('./_bootstrap.js');

// Two classes, four assignments spanning class-level and lecture-level,
// mixed done/pending and mixed due dates — enough to exercise every filter
// and sort branch without needing a full fixture builder.
function makeSemester() {
  return {
    classes: [
      {
        id: 'c1', code: 'PHIL101', colorIndex: 0,
        assignments: [
          { id: 'a1', title: 'Essay',   type: 'Essay',  status: 'pending', dueDate: '2026-09-10' },
          { id: 'a2', title: 'Journal', type: 'Reading', status: 'done',    dueDate: '2026-09-01' },
        ],
        lectures: [
          { id: 'l1', title: 'Lec 1', assignments: [
            { id: 'a3', title: 'Quiz', type: 'Quiz', status: 'pending', dueDate: '2026-09-05' },
          ] },
        ],
      },
      {
        id: 'c2', code: 'MATH201', colorIndex: 1,
        assignments: [
          { id: 'a4', title: 'Problem set', type: 'Homework', status: 'pending', dueDate: null },
        ],
        lectures: [],
      },
    ],
  };
}

test('default (due, showDone=false) drops done items and orders by due date', () => {
  const sem = makeSemester();
  const result = getGlobalAssignments(sem);
  assert.deepEqual(result.map(a => a.id), ['a3', 'a1', 'a4']); // a2 is done, dropped; nulls last
});

test('showDone:true includes done items back in due-date order', () => {
  const sem = makeSemester();
  const result = getGlobalAssignments(sem, { showDone: true });
  assert.deepEqual(result.map(a => a.id), ['a2', 'a3', 'a1', 'a4']);
});

test('classId filter scopes to one class only', () => {
  const sem = makeSemester();
  const result = getGlobalAssignments(sem, { classId: 'c1', showDone: true });
  assert.deepEqual(result.map(a => a.id).sort(), ['a1', 'a2', 'a3']);
});

test('type filter narrows across classes', () => {
  const sem = makeSemester();
  const result = getGlobalAssignments(sem, { type: 'Reading', showDone: true });
  assert.deepEqual(result.map(a => a.id), ['a2']);
});

test('sort:class groups by classCode, due date within each group', () => {
  const sem = makeSemester();
  const result = getGlobalAssignments(sem, { sort: 'class' });
  assert.deepEqual(result.map(a => a.classCode), ['MATH201', 'PHIL101', 'PHIL101']);
});

test('sort:status ranks overdue/today/soon/upcoming ahead of no-due-date', () => {
  const sem = makeSemester();
  const result = getGlobalAssignments(sem, { sort: 'status', showDone: true });
  // a2 is done (rank 4), a4 has no due date (rank 5) — both sink behind the
  // dated pending items regardless of showDone.
  assert.equal(result[result.length - 1].id, 'a4');
});

test('empty semester returns an empty array, not a throw', () => {
  const result = getGlobalAssignments({ classes: [] });
  assert.deepEqual(result, []);
});
