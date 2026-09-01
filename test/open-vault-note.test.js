'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { openVaultNote, ConfirmReloadModal } = require('./_bootstrap.js');

// Fake `app` covering exactly what openVaultNote() touches: vault index
// lookup, adapter existence/reconcile, and note-opening. `indexed` starts
// false to simulate "not in Obsidian's in-memory index yet"; reconcileFile
// (if it succeeds) flips it true, mirroring the real API forcing a reindex.
function makeApp({ indexed, onDisk, reconcileThrows = false }) {
  const calls = { openLinkText: [], reconcileFile: 0, notices: [] };
  let isIndexed = indexed;
  return {
    calls,
    vault: {
      getAbstractFileByPath: (p) => (isIndexed ? { path: p } : null),
      adapter: {
        exists: async () => onDisk,
        reconcileFile: async () => {
          calls.reconcileFile += 1;
          if (reconcileThrows) throw new Error('reconcileFile not available');
          isIndexed = true;
        },
      },
    },
    workspace: {
      openLinkText: (p) => calls.openLinkText.push(p),
    },
  };
}

test('already indexed: opens directly, no adapter calls needed', async () => {
  const app = makeApp({ indexed: true, onDisk: true });
  await openVaultNote(app, 'note.md');
  assert.deepEqual(app.calls.openLinkText, ['note.md']);
  assert.equal(app.calls.reconcileFile, 0);
});

test('not indexed but on disk: reconcile succeeds, then opens', async () => {
  const app = makeApp({ indexed: false, onDisk: true, reconcileThrows: false });
  await openVaultNote(app, 'note.md');
  assert.equal(app.calls.reconcileFile, 1);
  assert.deepEqual(app.calls.openLinkText, ['note.md']);
});

test('not indexed, on disk, reconcile fails: shows reload modal, does not open', async (t) => {
  let opened = 0;
  t.mock.method(ConfirmReloadModal.prototype, 'open', function () { opened += 1; });

  const app = makeApp({ indexed: false, onDisk: true, reconcileThrows: true });
  await openVaultNote(app, 'note.md');

  assert.equal(app.calls.reconcileFile, 1);
  assert.equal(app.calls.openLinkText.length, 0);
  assert.equal(opened, 1);
});

test('not on disk at all: "not found", no reconcile attempt', async () => {
  const app = makeApp({ indexed: false, onDisk: false });
  await openVaultNote(app, 'ghost.md');
  assert.equal(app.calls.reconcileFile, 0);
  assert.equal(app.calls.openLinkText.length, 0);
});
