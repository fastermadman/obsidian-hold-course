'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HoldCourseView } = require('./_bootstrap.js');

// navigate()/back()/forward()/origin are pure view-instance state machines —
// none of the paths under test touch this.plugin or the DOM, so both can be
// stubbed to nothing. Callers that DO stub render() (most tests here) are
// testing navigate()'s bookkeeping in isolation from rendering; the one test
// that needs render() to actually run (the re-entrancy guard) says so.
//
// Not covered here on purpose: whether scrollTop actually ends up where it
// should on screen. origin.scrollTop and _navigateToOrigin()'s restore both
// read a real .hc-content element (_getScrollEl()), which _bootstrap.js
// deliberately doesn't stub — see its own comment. That's an on-device check
// (#33: "scrolled list → open row → back → same offset"), not a unit test.
function makeView() {
  const view = new HoldCourseView(null, {});
  view.render = () => {};
  return view;
}

test('origin is set opening a detail screen from a list screen', () => {
  const view = makeView();
  view.navigate('assignments');
  assert.equal(view.origin, null);

  view.navigate('assignment', 'c1', null, 'a1');
  assert.deepEqual(view.origin, {
    screen: 'assignments', classId: null, lectureId: null,
    assignmentId: null, examId: null, resourceId: null, tab: 'Lectures', scrollTop: 0,
  });
});

test('origin survives prev/next (same screen) — the exact bug previousScreen had', () => {
  const view = makeView();
  view.navigate('assignments');
  view.navigate('assignment', 'c1', null, 'a1');
  const originAfterOpen = view.origin;

  view.navigate('assignment', 'c1', null, 'a2'); // chevron click, same screen
  assert.deepEqual(view.origin, originAfterOpen);
  view.navigate('assignment', 'c1', null, 'a3'); // a second chevron click
  assert.deepEqual(view.origin, originAfterOpen);
});

test('origin is replaced, not merged, moving from one detail screen to another', () => {
  const view = makeView();
  view.navigate('class', 'c1');
  view.navigate('lecture', 'c1', 'l1');
  view.navigate('assignment', 'c1', 'l1', 'a1'); // opened from the lecture

  assert.equal(view.origin.screen, 'lecture');
  assert.equal(view.origin.lectureId, 'l1');
});

test('origin clears navigating to a list screen', () => {
  const view = makeView();
  view.navigate('assignments');
  view.navigate('assignment', 'c1', null, 'a1');
  assert.notEqual(view.origin, null);

  view.navigate('class', 'c1');
  assert.equal(view.origin, null);
});

test('navigate() pushes a history entry per real navigation; an identical re-navigate is deduped', () => {
  const view = makeView();
  assert.equal(view.history.length, 0);

  view.navigate('assignments');
  assert.equal(view.history.length, 1);
  assert.equal(view.histIndex, 0);

  view.navigate('assignments'); // nothing actually changed
  assert.equal(view.history.length, 1);
});

test('back()/forward() round-trip; a fresh navigate() truncates the old forward branch', () => {
  const view = makeView();

  view.navigate('assignments');                       // 0
  view.navigate('assignment', 'c1', null, 'a1');       // 1
  view.navigate('assignment', 'c1', null, 'a2');       // 2 — chevron
  assert.equal(view.history.length, 3);
  assert.equal(view.histIndex, 2);

  view.back();
  assert.equal(view.currentAssignmentId, 'a1');
  assert.equal(view.histIndex, 1);

  view.back();
  assert.equal(view.screen, 'assignments');
  assert.equal(view.histIndex, 0);

  view.forward();
  assert.equal(view.currentAssignmentId, 'a1');
  assert.equal(view.histIndex, 1);

  // Navigating from a "back"-ed-into state drops the abandoned a2 branch.
  view.navigate('assignment', 'c1', null, 'a3');
  assert.equal(view.history.length, 3);
  assert.equal(view.currentAssignmentId, 'a3');

  view.forward(); // nothing beyond a3 anymore
  assert.equal(view.currentAssignmentId, 'a3');
});

test('back() past the start and forward() past the end are silent no-ops', () => {
  const view = makeView();
  view.navigate('assignments');
  view.back();
  assert.equal(view.screen, 'assignments');
  view.forward();
  assert.equal(view.screen, 'assignments');
});

test('navigateTab updates the current history entry in place and does not push', () => {
  const view = makeView();
  view.navigate('class', 'c1');
  assert.equal(view.history.length, 1);

  view.navigateTab('Exams');
  assert.equal(view.history.length, 1);
  assert.equal(view.history[0].tab, 'Exams');
  assert.equal(view.currentTab, 'Exams');
});

test('a navigate() call made mid-render (a missing-data redirect) replaces the top entry instead of pushing', () => {
  const view = new HoldCourseView(null, {});
  let redirected = false;
  // Simulates render()'s own _inRender guard around a renderer that calls
  // navigate() because the id it was given no longer resolves to anything.
  view.render = () => {
    if (!redirected && view.screen === 'lecture') {
      redirected = true;
      view._inRender = true;
      view.navigate('class', view.currentClassId);
      view._inRender = false;
    }
  };

  view.navigate('class', 'c1');
  assert.equal(view.history.length, 1);

  view.navigate('lecture', 'c1', 'deleted-lecture-id');
  assert.equal(view.history.length, 2, 'redirect must not add a third entry');
  assert.equal(view.history[1].screen, 'class');
  assert.equal(view.screen, 'class');
});
