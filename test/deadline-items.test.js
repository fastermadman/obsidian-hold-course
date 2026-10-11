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

// #71 — same rule as getItemsForDate: a completed or dropped class stops
// producing deadlines, assignments and exams alike.
for (const status of ['dropped', 'completed']) {
  test(`a ${status} class contributes no deadline items`, () => {
    const sem = makeSemester();
    sem.classes[0].status = status;
    assert.deepEqual(getAllDeadlineItems(sem), []);
  });
}

test('an ongoing class next to a dropped one still contributes', () => {
  const sem = makeSemester();
  sem.classes.push({
    id: 'c2', code: 'PHIL', status: 'dropped',
    assignments: [{ id: 'x1', title: 'Dropped essay', dueDate: '2026-09-01', status: 'not-started' }],
    lectures: [], exams: [{ id: 'x2', title: 'Dropped exam', dueDate: '2026-09-02', status: 'not-started' }],
  });
  const ids = getAllDeadlineItems(sem).map(i => i.id).sort();
  assert.deepEqual(ids, ['a1', 'a2', 'e1']);
});
