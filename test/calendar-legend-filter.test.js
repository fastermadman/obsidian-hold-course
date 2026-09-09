'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calLegendFilterPasses, isWeekendDate } = require('./_bootstrap.js');

const CLS_A = { id: 'a' };
const CLS_B = { id: 'b' };

function lecture(cls)               { return { kind: 'lecture', cls }; }
function assignment(cls, type)      { return { kind: 'assignment', cls, assignment: { type } }; }
function exam(cls)                  { return { kind: 'exam', cls }; }

test('class toggle gates every kind from that class', () => {
  const classesOn  = { a: true, b: false };
  const typesOn    = { Reading: true, Exam: true };

  assert.equal(calLegendFilterPasses(lecture(CLS_A), classesOn, typesOn), true);
  assert.equal(calLegendFilterPasses(lecture(CLS_B), classesOn, typesOn), false);
  assert.equal(calLegendFilterPasses(assignment(CLS_B, 'Reading'), classesOn, typesOn), false);
  assert.equal(calLegendFilterPasses(exam(CLS_B), classesOn, typesOn), false);
});

test('assignment items also need their type toggled on', () => {
  const classesOn = { a: true };
  assert.equal(calLegendFilterPasses(assignment(CLS_A, 'Reading'), classesOn, { Reading: true }), true);
  assert.equal(calLegendFilterPasses(assignment(CLS_A, 'Reading'), classesOn, { Reading: false }), false);
  assert.equal(calLegendFilterPasses(assignment(CLS_A, 'Writing'), classesOn, { Reading: true }), false);
});

test('exam items are gated by the "Exam" type toggle, not a kind toggle', () => {
  const classesOn = { a: true };
  assert.equal(calLegendFilterPasses(exam(CLS_A), classesOn, { Exam: true }), true);
  assert.equal(calLegendFilterPasses(exam(CLS_A), classesOn, { Exam: false }), false);
});

test('lecture items only need the class check — no type gate applies', () => {
  const classesOn = { a: true };
  assert.equal(calLegendFilterPasses(lecture(CLS_A), classesOn, {}), true);
});

test('isWeekendDate: Saturday/Sunday true, weekdays false', () => {
  assert.equal(isWeekendDate(new Date('2026-09-05T12:00:00')), true);  // Saturday
  assert.equal(isWeekendDate(new Date('2026-09-06T12:00:00')), true);  // Sunday
  assert.equal(isWeekendDate(new Date('2026-09-07T12:00:00')), false); // Monday
});

// #68 — the legend only has dots for CAL_LEGEND_TYPES, so a type outside that
// list has no toggle that could ever reveal it. External data is the source:
// in-app creation always defaults to 'Other'.
test('a type with no legend dot folds into the "Other" toggle', () => {
  const classesOn = { a: true };
  const allOn  = { Reading: true,  Writing: true,  Discussion: true,  Project: true,  Exam: true,  Preparation: true,  Other: true  };
  const allOff = { Reading: false, Writing: false, Discussion: false, Project: false, Exam: false, Preparation: false, Other: false };

  // 'Quiz' has a style and an icon (ASSIGNMENT_TYPE_STYLE/ICON) but no legend dot.
  assert.equal(calLegendFilterPasses(assignment(CLS_A, 'Quiz'), classesOn, allOn), true);
  assert.equal(calLegendFilterPasses(assignment(CLS_A, 'Quiz'), classesOn, allOff), false);

  // A missing type — what sync_hold_course.py can write — behaves the same.
  assert.equal(calLegendFilterPasses(assignment(CLS_A, undefined), classesOn, allOn), true);
  assert.equal(calLegendFilterPasses(assignment(CLS_A, undefined), classesOn, allOff), false);

  // Folding into Other means the Other dot alone governs it.
  assert.equal(calLegendFilterPasses(assignment(CLS_A, 'Quiz'), classesOn, { ...allOn, Other: false }), false);
});
