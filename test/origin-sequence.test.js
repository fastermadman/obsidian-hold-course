'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HoldCourseView, getLecturesDisplayed, getLectureAssignmentSections } = require('./_bootstrap.js');

// _originSequence() must walk rows in the order the screen it came from shows
// them. These build a bare view (no DOM, no plugin) around one semester.
function viewFor(sem, fields) {
  const view = Object.create(HoldCourseView.prototype);
  view._getViewedSemester = () => sem;
  return Object.assign(view, fields);
}

function lecturesClass(lectureSort) {
  return {
    id: 'c1', code: 'PHIL', lectureSort,
    lectures: [
      { id: 'l2', date: '2026-09-08', status: 'done' },
      { id: 'l1', date: '2026-09-01', status: 'not-started' },
      { id: 'l3', date: '2026-09-15', status: 'not-started' },
    ],
  };
}

// #69
test('Lectures prev/next follows "Newest first"', () => {
  const cls = lecturesClass('desc');
  const sem = { classes: [cls] };
  const view = viewFor(sem, { origin: { screen: 'class', classId: 'c1', tab: 'Lectures' }, currentLectureId: 'l3' });
  const seq = view._originSequence();
  assert.deepEqual(seq.items.map(i => i.lectureId), ['l3', 'l2', 'l1']);
  assert.equal(seq.index, 0, 'top row of the list is 1 / 3');
});

test('Lectures sequence equals the rendered list, with hide-done', () => {
  for (const lectureSort of ['asc', 'desc']) {
    const cls = { ...lecturesClass(lectureSort), lectureShowDone: false };
    const view = viewFor({ classes: [cls] }, { origin: { screen: 'class', classId: 'c1', tab: 'Lectures' }, currentLectureId: 'l1' });
    assert.deepEqual(
      view._originSequence().items.map(i => i.lectureId),
      getLecturesDisplayed(cls).map(l => l.id),
    );
  }
});

// #70
test('lecture prev/next walks Readings, then Assignments', () => {
  const lec = {
    id: 'l1',
    assignments: [
      { id: 'essay', type: 'Writing', status: 'not-started' },
      { id: 'ch3', type: 'Reading', status: 'not-started' },
      { id: 'poster', type: 'Project', status: 'not-started' },
    ],
  };
  const cls = { id: 'c1', code: 'PHIL', lectures: [lec] };
  const view = viewFor({ classes: [cls] }, { origin: { screen: 'lecture', classId: 'c1', lectureId: 'l1' }, currentAssignmentId: 'ch3' });
  const seq = view._originSequence();
  assert.deepEqual(seq.items.map(i => i.assignmentId), ['ch3', 'essay', 'poster']);
  assert.equal(seq.index, 0);
});

test('lecture sections respect each section\'s own hide-done flag', () => {
  const lec = {
    assignments: [
      { id: 'r1', type: 'Reading', status: 'done' },
      { id: 'a1', type: 'Writing', status: 'done' },
    ],
  };
  const { readings, assignments } = getLectureAssignmentSections({ readingsShowDone: false }, lec);
  assert.deepEqual(readings, []);
  assert.deepEqual(assignments.map(a => a.id), ['a1']);
});
