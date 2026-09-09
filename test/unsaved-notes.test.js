'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HoldCourseView } = require('./_bootstrap.js');

// #73: a full re-render (or an onExternalSettingsChange() data swap) must not
// throw away text typed into a notes field that hasn't blurred yet. These
// cover the JSON-backed merge seam — _captureDirtyNote() reads the pending
// text before the swap, _restoreDirtyNote() re-resolves the entity in the
// fresh graph and writes it back without clobbering a sibling external change.
// The blur-before-empty() half (_flushFocusedNote) and the file-backed path
// are DOM/vault orchestration, verified on-device.

function makeData() {
  return {
    fileIsTruth: false,
    semesters: [{
      id: 's1',
      classes: [{
        id: 'c1',
        assignments: [{ id: 'a1', title: 'Essay', notes: 'old', grade: '' }],
        lectures: [],
        exams: [],
      }],
    }],
  };
}

function makePlugin(data) {
  return {
    data,
    saves: 0,
    save() { this.saves++; },
    getCurrentSemester() { return this.data.semesters[0]; },
    findAssignment(semId, clsId, aId) {
      const cls = this.data.semesters.find(s => s.id === semId)
        ?.classes.find(c => c.id === clsId);
      const a = cls?.assignments.find(x => x.id === aId);
      return a ? { assignment: a, lectureId: null } : null;
    },
    findExam() { return null; },
    findResource() { return null; },
  };
}

function makeView(plugin, el) {
  const v = Object.create(HoldCourseView.prototype);
  v.plugin = plugin;
  v.screen = 'assignment';
  v.currentClassId = 'c1';
  v.currentAssignmentId = 'a1';
  v.contentEl = { querySelector: () => el };
  return v;
}

function makeEl(value) {
  return {
    value,
    selectionStart: value.length,
    selectionEnd: value.length,
    focus() { this.focused = true; },
    setSelectionRange(a, b) { this.range = [a, b]; },
  };
}

test('_captureDirtyNote: returns the pending text + selection when the field is dirty', () => {
  const plugin = makePlugin(makeData());
  const view = makeView(plugin, makeEl('a longer draft'));
  assert.deepEqual(view._captureDirtyNote(), {
    screen: 'assignment', value: 'a longer draft', selStart: 14, selEnd: 14,
  });
});

test('_captureDirtyNote: returns null when the field matches what is already stored', () => {
  const plugin = makePlugin(makeData());
  const view = makeView(plugin, makeEl('old'));
  assert.equal(view._captureDirtyNote(), null);
});

test('_captureDirtyNote: returns null when nothing is focused', () => {
  const plugin = makePlugin(makeData());
  const view = makeView(plugin, null);
  assert.equal(view._captureDirtyNote(), null);
});

test('_restoreDirtyNote: writes the typed text into the post-swap graph, leaving a sibling external change intact', () => {
  const plugin = makePlugin(makeData());
  const view = makeView(plugin, makeEl('a longer draft'));
  const pending = view._captureDirtyNote();

  // The swap: fresh graph loaded from disk. The sync changed the title;
  // notes is still the pre-edit value.
  const fresh = makeData();
  fresh.semesters[0].classes[0].assignments[0].title = 'Essay (revised by sync)';
  plugin.data = fresh;
  const freshEl = makeEl('old');
  view.contentEl.querySelector = () => freshEl;

  view._restoreDirtyNote(pending);

  const a = fresh.semesters[0].classes[0].assignments[0];
  assert.equal(a.notes, 'a longer draft', 'typed text landed in the new graph');
  assert.equal(a.title, 'Essay (revised by sync)', 'external change untouched');
  assert.ok(plugin.saves >= 1, 'persisted');
  assert.deepEqual(freshEl.range, [14, 14], 'caret restored on the repainted field');
});

test('_restoreDirtyNote: no-op (no redundant save) when the fresh graph already has the text', () => {
  const plugin = makePlugin(makeData());
  plugin.data.semesters[0].classes[0].assignments[0].notes = 'already synced in';
  const view = makeView(plugin, makeEl('already synced in'));
  plugin.saves = 0;
  view._restoreDirtyNote({ screen: 'assignment', value: 'already synced in', selStart: 0, selEnd: 0 });
  assert.equal(plugin.saves, 0);
});

test('_restoreDirtyNote: bails when the user navigated away during the reload', () => {
  const plugin = makePlugin(makeData());
  const view = makeView(plugin, makeEl('draft'));
  view.screen = 'dashboard';
  plugin.saves = 0;
  view._restoreDirtyNote({ screen: 'assignment', value: 'draft', selStart: 0, selEnd: 0 });
  assert.equal(plugin.saves, 0);
});

test('_resolveNoteTarget: returns null for a file-backed lecture note (nothing to merge into data.json)', () => {
  const plugin = makePlugin(makeData());
  plugin.data.fileIsTruth = true;
  plugin.data.semesters[0].classes[0].lectures.push({ id: 'l1', notes: '' });
  const view = makeView(plugin, makeEl('x'));
  view.screen = 'lecture';
  view.currentLectureId = 'l1';
  assert.equal(view._resolveNoteTarget(), null);
});
