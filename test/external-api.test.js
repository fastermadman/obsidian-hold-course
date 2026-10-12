'use strict';

// #84: the ownership guard behind plugin.api.update(), run against the shared
// contract fixture so it covers the same shapes ItsWiz writes.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HoldCoursePlugin = require('./_bootstrap.js');
const { guardExternalUpdate, EXTERNAL_API_VERSION } = HoldCoursePlugin;

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'contract-data.json'), 'utf8'));
const fresh = () => structuredClone(FIXTURE);
const lec = (d) => d.semesters[0].classes[0].lectures[0];
const asg = (d, id) => d.semesters[0].classes[0].lectures[0].assignments.find(a => a.id === id);
const always = () => true;

test('sync-owned fields and new objects pass untouched', () => {
  const before = fresh();
  const after = fresh();
  lec(after).title = 'Ny titel';
  lec(after).description = 'Ny beskrivelse';
  lec(after).vswDescription = 'Ny beskrivelse';
  asg(after, 'asg-read-1').dueDate = '2026-09-08';
  lec(after).assignments.push({ id: 'new-1', title: 'Ny', status: 'not-started', vswKey: 'k' });
  const expected = structuredClone(after);
  assert.deepEqual(guardExternalUpdate(before, after, always), []);
  assert.deepEqual(after, expected);
});

test('status pill, grade, notes and class contact fields are restored', () => {
  const before = fresh();
  asg(before, 'asg-read-1').status = 'in-progress';
  asg(before, 'asg-read-1').grade = '12';
  const after = structuredClone(before);
  asg(after, 'asg-read-1').status = 'done';
  asg(after, 'asg-read-1').grade = '';
  lec(after).notes = 'overskrevet';
  after.semesters[0].classes[0].professorEmail = 'x@via.dk';
  const restored = guardExternalUpdate(before, after, always);
  assert.equal(restored.length, 4);
  assert.deepEqual(after, before);
});

test('not-started -> done is the one status move allowed, and never back', () => {
  const before = fresh();
  const after = fresh();
  asg(after, 'asg-prep-1').status = 'done';
  assert.deepEqual(guardExternalUpdate(before, after, always), []);

  const back = structuredClone(after);
  asg(back, 'asg-prep-1').status = 'not-started';
  guardExternalUpdate(after, back, always);
  assert.equal(asg(back, 'asg-prep-1').status, 'done');
});

test('a linked note the user picked stays; an empty one may be filled', () => {
  const before = fresh();
  const after = fresh();
  asg(after, 'asg-read-1').linkedNote = 'andet.md';
  after.semesters[0].classes[0].assignments[0].linkedNote = 'fyldt.md';
  guardExternalUpdate(before, after, always);
  assert.equal(asg(after, 'asg-read-1').linkedNote, asg(before, 'asg-read-1').linkedNote);
  assert.equal(after.semesters[0].classes[0].assignments[0].linkedNote, 'fyldt.md');
});

test('removal: stamped or dead-link objects may go, the user\'s own may not', () => {
  const before = fresh();
  const stamped = fresh();
  lec(stamped).assignments = lec(stamped).assignments.filter(a => a.id !== 'asg-read-1');
  assert.doesNotThrow(() => guardExternalUpdate(before, stamped, always));

  const own = fresh();
  own.semesters[0].classes[0].assignments = [];
  assert.throws(() => guardExternalUpdate(before, own, always), /Studieopgave/);

  const withDead = fresh();
  withDead.semesters[0].classes[0].assignments[0].linkedNote = 'væk.md';
  const pruned = structuredClone(withDead);
  pruned.semesters[0].classes[0].assignments = [];
  assert.doesNotThrow(() => guardExternalUpdate(withDead, pruned, p => p !== 'væk.md'));
});

test('a lecture moved to another class keeps its identity and fields', () => {
  const before = fresh();
  const after = fresh();
  const moved = after.semesters[0].classes[0].lectures.shift();
  after.semesters[0].classes.push({ id: 'cls-2', lectures: [moved], assignments: [] });
  assert.deepEqual(guardExternalUpdate(before, after, always), []);
});

test('api.update(): one save, repaint, restore report, sync-only', async () => {
  const plugin = new HoldCoursePlugin();
  let saves = 0;
  plugin.app = {
    workspace: { getLeavesOfType: () => [] },
    vault: { adapter: { exists: async () => true } },
  };
  plugin.saveData = async () => { saves++; };
  plugin.data = fresh();
  asg(plugin.data, 'asg-read-1').status = 'in-progress';

  const { result, restored } = await plugin._externalUpdate((d) => {
    lec(d).title = 'Opdateret';
    asg(d, 'asg-read-1').status = 'not-started';
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(saves, 1);
  assert.equal(lec(plugin.data).title, 'Opdateret');
  assert.equal(asg(plugin.data, 'asg-read-1').status, 'in-progress');
  assert.equal(restored.length, 1);

  await plugin._externalUpdate(() => {});
  assert.equal(saves, 1, 'no save when nothing changed');

  await assert.rejects(plugin._externalUpdate(async () => {}), /synchronous/);
  assert.equal(EXTERNAL_API_VERSION, 1);
});
