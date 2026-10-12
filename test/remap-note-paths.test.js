'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { remapNotePaths } = require('./_bootstrap.js');

function makeData() {
  return { semesters: [{
    classes: [{
      assignments: [{ linkedNote: 'A/essay.md' }],
      exams: [{ notesLink: 'A/exam.md' }],
      lectures: [{ vaultLink: 'A/lec.md', notesLink: 'B/lec notes.md', assignments: [{ linkedNote: 'AB/other.md' }] }],
    }],
    resources: [{ vaultLink: 'A/sub/book.md', notesLink: 'C/book.md' }],
  }] };
}

test('a renamed file updates every field that pointed at it', () => {
  const data = makeData();
  assert.equal(remapNotePaths(data, 'B/lec notes.md', 'B/Lecture 1.md'), 1);
  assert.equal(data.semesters[0].classes[0].lectures[0].notesLink, 'B/Lecture 1.md');
});

test('a moved folder moves everything inside it, but not a sibling with the same prefix', () => {
  const data = makeData();
  assert.equal(remapNotePaths(data, 'A', 'Z'), 4);
  const cls = data.semesters[0].classes[0];
  assert.equal(cls.assignments[0].linkedNote, 'Z/essay.md');
  assert.equal(cls.exams[0].notesLink, 'Z/exam.md');
  assert.equal(cls.lectures[0].vaultLink, 'Z/lec.md');
  assert.equal(cls.lectures[0].assignments[0].linkedNote, 'AB/other.md');
  assert.equal(data.semesters[0].resources[0].vaultLink, 'Z/sub/book.md');
});

test('no match, or a no-op rename, changes nothing', () => {
  assert.equal(remapNotePaths(makeData(), 'X/none.md', 'Y/none.md'), 0);
  assert.equal(remapNotePaths(makeData(), 'A', 'A'), 0);
});
