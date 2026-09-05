'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getLectureMeeting, getLectureLocation, getLectureProfessor, validateLectureTime,
} = require('./_bootstrap.js');

// #41 — per-lecture overrides of the class's meetingStartTime/meetingEndTime/
// location/professorName. These four functions are the whole feature's
// logic; the modal UI around them is just data entry, and getItemsForDate's
// use of getLectureMeeting is covered indirectly by these same cases since
// it calls straight through.

test('getLectureMeeting: lecture override wins even on a day the class does not meet', () => {
  const cls = {
    meetingDays: ['Mon'], meetingStartTime: '10:00', meetingEndTime: '11:15',
    startDate: '2026-01-01', endDate: '2026-05-01',
  };
  // A Wednesday makeup lecture — classMeetsOnDate would say no, but this
  // lecture has its own explicit time regardless.
  const lec = { date: '2026-02-04', meetingStartTime: '14:00', meetingEndTime: '15:00' };
  assert.deepEqual(getLectureMeeting(cls, lec), { startTime: '14:00', endTime: '15:00' });
});

test('getLectureMeeting: falls back to the class schedule when the date matches and lecture has no override', () => {
  const cls = {
    meetingDays: ['Wed'], meetingStartTime: '10:00', meetingEndTime: '11:15',
    startDate: '2026-01-01', endDate: '2026-05-01',
  };
  const lec = { date: '2026-02-04' }; // a Wednesday
  assert.deepEqual(getLectureMeeting(cls, lec), { startTime: '10:00', endTime: '11:15' });
});

test('getLectureMeeting: no override and an off-schedule date means no time, same as before #41', () => {
  const cls = {
    meetingDays: ['Mon'], meetingStartTime: '10:00', meetingEndTime: '11:15',
    startDate: '2026-01-01', endDate: '2026-05-01',
  };
  const lec = { date: '2026-02-04' }; // a Wednesday — class doesn't meet
  assert.deepEqual(getLectureMeeting(cls, lec), { startTime: '', endTime: '' });
});

test('getLectureLocation/getLectureProfessor: lecture overrides, else the class, on any date', () => {
  const cls = { location: 'Room 214', professorName: 'Dr. Cohen' };
  assert.equal(getLectureLocation(cls, { location: 'Room 5B' }), 'Room 5B');
  assert.equal(getLectureLocation(cls, {}), 'Room 214');
  assert.equal(getLectureProfessor(cls, { professorName: 'Dr. Nguyen' }), 'Dr. Nguyen');
  assert.equal(getLectureProfessor(cls, {}), 'Dr. Cohen');
});

test('getLectureLocation/getLectureProfessor: empty when neither lecture nor class has one', () => {
  assert.equal(getLectureLocation({}, {}), '');
  assert.equal(getLectureProfessor({}, {}), '');
});

test('validateLectureTime: neither set is valid (inherits the class default)', () => {
  assert.equal(validateLectureTime('', ''), null);
});

test('validateLectureTime: both set and end after start is valid', () => {
  assert.equal(validateLectureTime('10:00', '11:15'), null);
});

test('validateLectureTime: only one of the pair set is rejected', () => {
  assert.match(validateLectureTime('10:00', ''), /both/i);
  assert.match(validateLectureTime('', '11:15'), /both/i);
});

test('validateLectureTime: end not after start is rejected', () => {
  assert.match(validateLectureTime('11:15', '10:00'), /after/i);
  assert.match(validateLectureTime('10:00', '10:00'), /after/i);
});
