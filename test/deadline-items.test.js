'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.document = { body: { classList: { contains: () => false } } };

const { getAllDeadlineItems } = require('./_bootstrap.js');

function makeSemester() {
  return {
    classes: [
      {
        id: 'c1', code: 'RLST', colorIndex: 0, icon: '',
        assignments: [{ id: 'a1', title: 'Essay', dueDate: '2026-09-10', status: 'not-started' }],
        lectures: [
          { id: 'l1', assignments: [{ id: 'a2', title: 'Read ch.3', dueDate: '2026-09-08', status: 'not-started' }] },
        ],
        exams: [{ id: 'e1', title: 'Midterm', dueDate: '2026-09-20', status: 'not-started' }],
      },
    ],
  };
}

// #57 — the deadline radar draws assignments, lecture-level readings AND exams;
// lectures themselves never appear.
test('exams are included with kind "exam"', () => {
  const items = getAllDeadlineItems(makeSemester());
  const exam = items.find(i => i.id === 'e1');
  assert.ok(exam, 'exam present');
  assert.equal(exam.kind, 'exam');
  assert.equal(exam.classCode, 'RLST');
  assert.equal(exam.dueDate, '2026-09-20');
});

test('assignments and lecture readings are kind "assignment"', () => {
  const items = getAllDeadlineItems(makeSemester());
  assert.equal(items.find(i => i.id === 'a1').kind, 'assignment');
  const reading = items.find(i => i.id === 'a2');
  assert.equal(reading.kind, 'assignment');
  assert.equal(reading.lectureId, 'l1');
});

test('no lecture rows leak in', () => {
  const items = getAllDeadlineItems(makeSemester());
  assert.ok(!items.some(i => i.id === 'l1'));
  assert.equal(items.length, 3);
});
