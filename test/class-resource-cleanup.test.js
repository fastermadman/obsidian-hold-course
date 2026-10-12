'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const HoldCoursePlugin = require('./_bootstrap.js');

// c1 owns r1 alone; r2 is tagged to c1 and c2; r3 is tagged only to c1 but
// c2's reading links it. Semester s2 is a move target.
function makePlugin() {
  const plugin = Object.create(HoldCoursePlugin.prototype);
  plugin.data = { semesters: [
    { id: 's1', classes: [
      { id: 'c1', assignments: [{ id: 'a1', linkedBook: 'r1' }], lectures: [] },
      { id: 'c2', assignments: [], lectures: [{ id: 'l1', assignments: [{ id: 'a2', linkedBook: 'r3' }] }] },
    ], resources: [
      { id: 'r1', classIds: ['c1'] },
      { id: 'r2', classIds: ['c1', 'c2'] },
      { id: 'r3', classIds: ['c1'] },
    ] },
    { id: 's2', classes: [], resources: [] },
  ] };
  return plugin;
}

test('deleting a class deletes resources only it used, keeps shared and linked ones untagged', () => {
  const p = makePlugin();
  p.deleteClass('s1', 'c1');
  const res = p.data.semesters[0].resources;
  assert.deepEqual(res.map(r => [r.id, r.classIds]), [['r2', ['c2']], ['r3', []]]);
});

test('moving a class copies a book a staying reading links, instead of taking it', () => {
  const p = makePlugin();
  p.visibleSemesters = () => p.data.semesters;
  assert.ok(p.moveClass('s1', 's2', 'c1'));
  const [s1, s2] = p.data.semesters;
  assert.deepEqual(s1.resources.map(r => r.id).sort(), ['r2', 'r3']);
  assert.equal(s2.resources.length, 3);
  assert.ok(s2.resources.some(r => r.id === 'r1')); // used by nobody else: moved as-is
});

test('deleting a resource clears the readings that linked it', () => {
  const p = makePlugin();
  p.deleteResource('s1', 'r3');
  assert.equal(p.data.semesters[0].classes[1].lectures[0].assignments[0].linkedBook, '');
});
