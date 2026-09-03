'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calLegendFilterPasses } = require('./_bootstrap.js');

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
