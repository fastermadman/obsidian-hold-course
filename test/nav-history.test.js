'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HoldCourseView } = require('./_bootstrap.js');

// navigate()/origin/getState()/setState() are pure view-instance state
// machines — none of the paths under test touch this.plugin or the DOM, so
// both can be stubbed to nothing. Callers that DO stub render() (most tests
// here) are testing navigate()'s bookkeeping in isolation from rendering; the
// one test that needs render() to actually run (the re-entrancy guard) says so.
//
// Not covered here on purpose: whether scrollTop actually ends up where it
// should on screen. origin.scrollTop, _navigateToOrigin()'s restore and
// setEphemeralState() all read a real .hc-content element (_getScrollEl()),
// which _bootstrap.js deliberately doesn't stub — see its own comment. That's
// an on-device check (#33: "scrolled list → open row → back → same offset"),
// not a unit test.

// Stands in for the WorkspaceLeaf that owns the view. Mirrors Obsidian
// 1.13.1's real semantics (read out of its app.js for #35) — the parts this
// plugin depends on and would silently lose if they ever changed:
//   - recordHistory() drops entries for a view with navigation !== true,
//     and dedups against the top entry by JSON.stringify of its state
//   - pushState() clears forwardHistory
//   - go() walks the two stacks around a CURRENT state that is not itself
//     an entry — it's read live off the view via getState()
//   - the state handed back arrives through setState(), and the ephemeral
//     state AFTER it
function attachLeaf(view) {
  const history = {
    backHistory: [],
    forwardHistory: [],
    pushState(entry) {
      this.backHistory.push(entry);
      this.forwardHistory = [];
    },
    go(n) {
      const current = leaf.getHistoryState();
      let cursor = current, popped;
      while (n > 0 && (popped = this.forwardHistory.pop())) { this.backHistory.push(cursor); cursor = popped; n--; }
      while (n < 0 && (popped = this.backHistory.pop())) { this.forwardHistory.push(cursor); cursor = popped; n++; }
      if (cursor === current) return;
      leaf.setViewState({ ...cursor.state, popstate: true }, cursor.eState);
    },
    back() { this.go(-1); },
    forward() { this.go(1); },
  };
  const leaf = {
    history,
    getViewState() { return { type: 'hold-course', state: view.getState() }; },
    getHistoryState() {
      return { title: 'Hold Course', icon: 'graduation-cap', state: leaf.getViewState(), eState: view.getEphemeralState() };
    },
    recordHistory(entry) {
      if (!view.navigation) return;
      const top = history.backHistory[history.backHistory.length - 1];
      if (top && JSON.stringify(top.state) === JSON.stringify(entry.state)) return;
      history.pushState(entry);
    },
    setViewState(viewState, eState) {
      view.setState(viewState.state, { history: false, layout: false, close: false });
      if (eState) view.setEphemeralState(eState);
    },
  };
  view.leaf = leaf;
  return leaf;
}

function makeView() {
  const view = new HoldCourseView(null, {});
  view.render = () => {};
  attachLeaf(view);
  return view;
}

// Screens as the back stack records them: the entry holds the state of the
// screen being LEFT, so a stack is read oldest-first.
const screensIn = (leaf) => leaf.history.backHistory.map(e => e.state.state.screen);

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

test('navigation is on — it gates every native entry point (#35)', () => {
  // Obsidian's header arrows, app:go-back/go-forward and the mobile swipe all
  // check view.navigation, and recordHistory() drops entries without it. Turn
  // this off and back/forward goes silently dead, with nothing else breaking
  // to point at the cause.
  assert.equal(makeView().navigation, true);
});

test('navigate() records the screen it leaves; an identical re-navigate records nothing', () => {
  const view = makeView();
  const leaf = view.leaf;
  assert.deepEqual(screensIn(leaf), []);

  view.navigate('assignments');
  assert.deepEqual(screensIn(leaf), ['dashboard']);

  view.navigate('assignments'); // nothing actually changed
  assert.deepEqual(screensIn(leaf), ['dashboard']);
});

test('back/forward round-trip through the leaf; a fresh navigate() truncates the old forward branch', () => {
  const view = makeView();
  const leaf = view.leaf;

  view.navigate('assignments');
  view.navigate('assignment', 'c1', null, 'a1');
  view.navigate('assignment', 'c1', null, 'a2'); // chevron
  assert.deepEqual(screensIn(leaf), ['dashboard', 'assignments', 'assignment']);

  leaf.history.back();
  assert.equal(view.currentAssignmentId, 'a1');

  leaf.history.back();
  assert.equal(view.screen, 'assignments');

  leaf.history.forward();
  assert.equal(view.currentAssignmentId, 'a1');

  // Navigating from a "back"-ed-into state drops the abandoned a2 branch.
  view.navigate('assignment', 'c1', null, 'a3');
  assert.deepEqual(leaf.history.forwardHistory, []);
  assert.equal(view.currentAssignmentId, 'a3');

  leaf.history.forward(); // nothing beyond a3 anymore
  assert.equal(view.currentAssignmentId, 'a3');
});

test('back past the start and forward past the end are silent no-ops', () => {
  const view = makeView();
  view.navigate('assignments');
  view.leaf.history.back();   // back to dashboard, the one real entry
  view.leaf.history.back();   // nothing left
  assert.equal(view.screen, 'dashboard');
  view.leaf.history.forward();
  assert.equal(view.screen, 'assignments');
  view.leaf.history.forward();
  assert.equal(view.screen, 'assignments');
});

test('navigateTab records nothing, but the tab travels with the next entry recorded', () => {
  const view = makeView();
  const leaf = view.leaf;
  view.navigate('class', 'c1');
  assert.deepEqual(screensIn(leaf), ['dashboard']);

  view.navigateTab('Exams');
  assert.deepEqual(screensIn(leaf), ['dashboard'], 'a tab switch is not a navigation');
  assert.equal(view.currentTab, 'Exams');

  // Leaving the class is what records it — read live off getState(), so the
  // tab comes back with it.
  view.navigate('assignments');
  leaf.history.back();
  assert.equal(view.screen, 'class');
  assert.equal(view.currentTab, 'Exams');
});

test('a navigate() call made mid-render (a missing-data redirect) records no entry for the screen nobody saw', () => {
  const view = new HoldCourseView(null, {});
  const leaf = attachLeaf(view);
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
  view.navigate('lecture', 'c1', 'deleted-lecture-id');

  assert.deepEqual(screensIn(leaf), ['dashboard', 'class'],
    'the dead lecture screen must never become a back target');
  assert.equal(view.screen, 'class');
});

test('getState()/setState() round-trip the whole screen, not just its name (#15 persistence)', () => {
  const view = makeView();
  view.navigate('class', 'c1', null, null, null, null, 'sem-2');
  view.navigateTab('Exams');
  view.navigate('assignment', 'c1', null, 'a1');
  const saved = JSON.parse(JSON.stringify(view.getState())); // as workspace.json stores it

  const reopened = makeView();
  reopened.setState(saved, { history: true, layout: true, close: false });

  assert.equal(reopened.screen, 'assignment');
  assert.equal(reopened.currentAssignmentId, 'a1');
  assert.equal(reopened.viewedSemesterId, 'sem-2');
  assert.equal(reopened.enteredViaCourses, true);
  assert.deepEqual(reopened.origin, view.origin, 'the "back to X" button survives too');
});

test('setState() on a layout saved before #35 leaves the default screen alone', () => {
  const view = makeView();
  view.setState({}, { history: true, layout: true, close: false });
  assert.equal(view.screen, 'dashboard');
});
