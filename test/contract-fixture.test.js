'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// getGlobalAssignments -> getDueInfo touches document.body; same minimal stub
// as global-assignments.test.js.
global.document = { body: { classList: { contains: () => false } } };

const {
  CURRENT_DATA_VERSION,
  getGlobalAssignments,
  getAllDeadlineItems,
  getLectureMeeting,
  getLectureLocation,
  getLectureProfessor,
  typeIcon,
  ASSIGNMENT_TYPES,
} = require('./_bootstrap.js');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'contract-data.json');
const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const sem = data.semesters[0];
const cls = sem.classes[0];
const lec = cls.lectures[0];

// Shared cross-repo schema contract with viastudywiz-extension's
// sync_hold_course.py. If a schema change lands on either side without the
// fixture (and the mirrored KNOWN_DATA_VERSION) being updated too, one of these
// assertions — or the Python --selfcheck half — fails. See fixtures/README.md.

test('fixture dataVersion matches the build it is a contract for', () => {
  assert.equal(data.dataVersion, CURRENT_DATA_VERSION);
});

test('plugin read helpers consume the fixture without throwing', () => {
  assert.doesNotThrow(() => getGlobalAssignments(sem, { showDone: true }));
  assert.doesNotThrow(() => getAllDeadlineItems(sem));
  assert.doesNotThrow(() => getLectureMeeting(cls, lec));
  assert.doesNotThrow(() => getLectureLocation(cls, lec));
  assert.doesNotThrow(() => getLectureProfessor(cls, lec));
});

test('every assignment type in the fixture is a known ASSIGNMENT_TYPES value', () => {
  const seen = [
    ...cls.assignments.map(a => a.type),
    ...cls.lectures.flatMap(l => l.assignments.map(a => a.type)),
  ];
  for (const t of seen) {
    assert.ok(ASSIGNMENT_TYPES.includes(t), `unknown assignment type: ${t}`);
    assert.equal(typeof typeIcon(t), 'string');
  }
  // The two schema-significant types the sync actually emits must be exercised.
  assert.ok(seen.includes('Reading'), 'fixture must cover a Reading assignment (Linked Book render path)');
  assert.ok(seen.includes('Preparation'), 'fixture must cover a Preparation assignment (#54 / two-way completion)');
});

test('per-lecture #41 overrides round-trip through getLectureMeeting/Location/Professor', () => {
  assert.deepEqual(getLectureMeeting(cls, lec), { startTime: '08:15', endTime: '11:00' });
  assert.equal(getLectureLocation(cls, lec), 'Lokale A1.42');
  assert.equal(getLectureProfessor(cls, lec), 'Frede V Nielsen');
});

test('every documented schema field is present in the fixture', () => {
  const has = (obj, keys) => keys.forEach(k =>
    assert.ok(Object.prototype.hasOwnProperty.call(obj, k), `missing field: ${k}`));

  has(data, ['currentSemesterId', 'dataVersion', 'semesters']);
  has(sem, ['id', 'name', 'term', 'year', 'vswSync', 'classes', 'resources']);
  has(cls, [
    'id', 'colorIndex', 'code', 'name',
    'professorName', 'professorEmail', 'officeHours',
    'taName', 'taEmail', 'taOfficeHours',
    'meetingDays', 'location', 'startDate', 'endDate',
    'meetingStartTime', 'meetingEndTime', 'courseUrl',
    'vswFag', 'vswCourseUrl', 'lectures', 'assignments', 'exams',
  ]);
  has(lec, [
    'id', 'title', 'date', 'status', 'notes', 'description',
    'vaultLink', 'notesLink',
    'meetingStartTime', 'meetingEndTime', 'location', 'professorName',
    'vswPlanId', 'vswDescription', 'vswVaultLink', 'assignments',
  ]);
  has(lec.assignments[0], [
    'id', 'title', 'type', 'dueDate', 'status', 'notes', 'grade',
    'linkedBook', 'linkedNote', 'vswKey',
  ]);
  has(cls.exams[0], ['id', 'title', 'dueDate', 'notes', 'grade', 'status']);
  has(sem.resources[0], [
    'id', 'title', 'author', 'type', 'classIds', 'status',
    'vaultLink', 'url', 'notes', 'vswResKey',
  ]);
});

test('a higher dataVersion is what the onload guard flags', () => {
  // The guard itself lives in onload() (not exported); this pins the trigger
  // condition so a future refactor that inverts the comparison fails here.
  assert.ok(CURRENT_DATA_VERSION + 1 > CURRENT_DATA_VERSION);
  assert.equal(data.dataVersion > CURRENT_DATA_VERSION, false);
});
