'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  splitFrontmatter,
  sanitizeNoteFilename,
  buildNoteStub,
  mergeResourceFrontmatter,
  applyFrontmatterToResource,
} = require('./_bootstrap.js');

// #5b: "file is truth" resource notes. These cover the pure parsing/formatting
// bits — the vault read/write orchestration is verified on-device (needs a
// real Obsidian vault adapter), same split as #5a.

test('splitFrontmatter: no block → whole text is body', () => {
  const r = splitFrontmatter('just a note\nsecond line');
  assert.equal(r.frontmatter, '');
  assert.equal(r.body, 'just a note\nsecond line');
});

test('splitFrontmatter: leading block is peeled off, body preserved verbatim', () => {
  const text = '---\nhc_resource_id: "abc"\n---\n\nThe body.\n';
  const r = splitFrontmatter(text);
  assert.equal(r.frontmatter, '---\nhc_resource_id: "abc"\n---\n');
  assert.equal(r.body, '\nThe body.\n');
});

test('splitFrontmatter: a mid-file --- is not mistaken for frontmatter', () => {
  const text = 'intro\n---\nnot frontmatter\n';
  assert.equal(splitFrontmatter(text).frontmatter, '');
});

test('splitFrontmatter: tolerates CRLF and empty input', () => {
  assert.equal(splitFrontmatter('---\r\na: 1\r\n---\r\nbody').body, 'body');
  assert.deepEqual(splitFrontmatter(''), { frontmatter: '', body: '' });
  assert.deepEqual(splitFrontmatter(undefined), { frontmatter: '', body: '' });
});

test('sanitizeNoteFilename: strips filesystem/Obsidian-illegal characters', () => {
  assert.equal(sanitizeNoteFilename('A/B: "C" #D? [E]|F*'), 'AB C D EF');
});

test('sanitizeNoteFilename: collapses whitespace, caps length, falls back', () => {
  assert.equal(sanitizeNoteFilename('  spaced   out  '), 'spaced out');
  assert.equal(sanitizeNoteFilename('x'.repeat(200)).length, 100);
  assert.equal(sanitizeNoteFilename(''), 'Untitled');
  assert.equal(sanitizeNoteFilename('///'), 'Untitled');
});

test('buildNoteStub: frontmatter ties the file to its resource', () => {
  const out = buildNoteStub(
    { id: 'r1', title: 'Den musikpædagogiske', author: 'Frede V. Nielsen' },
    'MUS',
    '',
  );
  assert.match(out, /^---\n/);
  assert.match(out, /hc_resource_id: "r1"/);
  assert.match(out, /hc_title: "Den musikpædagogiske"/);
  assert.match(out, /hc_author: "Frede V. Nielsen"/);
  assert.match(out, /hc_class: "MUS"/);
});

test('buildNoteStub: optional lines are omitted when their value is empty', () => {
  const out = buildNoteStub({ id: 'r1', title: 'T' }, '', '');
  assert.doesNotMatch(out, /hc_author/);
  assert.doesNotMatch(out, /hc_class/);
  assert.doesNotMatch(out, /Kilde:/);
});

test('buildNoteStub: source link becomes a wikilink, .md stripped', () => {
  const out = buildNoteStub({ id: 'r1', title: 'T' }, '', 'FAG/Musik/Enhed 3/Nielsen.md');
  assert.match(out, /Kilde: \[\[FAG\/Musik\/Enhed 3\/Nielsen\]\]/);
});

test('buildNoteStub: existing data.json notes text is migrated into the body', () => {
  const out = buildNoteStub({ id: 'r1', title: 'T', notes: 'my old notes' }, '', '');
  const { body } = splitFrontmatter(out);
  assert.equal(body.trim(), 'my old notes');
});

test('buildNoteStub: hc_type is written when the resource has a type', () => {
  const out = buildNoteStub({ id: 'r1', title: 'T', type: 'Book' }, '', '');
  assert.match(out, /hc_type: "Book"/);
  assert.doesNotMatch(buildNoteStub({ id: 'r1', title: 'T' }, '', ''), /hc_type/);
});

// #5b Del A: field <-> frontmatter sync (write side).

test('mergeResourceFrontmatter: writes non-empty fields into our own stub', () => {
  const fm = { hc_resource_id: 'r1' };
  const changed = mergeResourceFrontmatter(fm, { id: 'r1', title: 'T', author: 'A', type: 'Book' });
  assert.equal(changed, true);
  assert.deepEqual(fm, { hc_resource_id: 'r1', hc_title: 'T', hc_author: 'A', hc_type: 'Book' });
});

test('mergeResourceFrontmatter: refuses a stub that is not ours', () => {
  const fm = { hc_resource_id: 'other' };
  assert.equal(mergeResourceFrontmatter(fm, { id: 'r1', title: 'T' }), false);
  assert.deepEqual(fm, { hc_resource_id: 'other' });
  assert.equal(mergeResourceFrontmatter({}, { id: 'r1', title: 'T' }), false);
});

test('mergeResourceFrontmatter: an emptied field never deletes an existing key', () => {
  const fm = { hc_resource_id: 'r1', hc_author: 'Old Author', hc_type: 'Book' };
  const changed = mergeResourceFrontmatter(fm, { id: 'r1', title: 'T', author: '', type: '  ' });
  assert.equal(changed, true); // hc_title added
  assert.equal(fm.hc_author, 'Old Author');
  assert.equal(fm.hc_type, 'Book');
});

test('mergeResourceFrontmatter: no change when values already match', () => {
  const fm = { hc_resource_id: 'r1', hc_title: 'T', hc_author: 'A', hc_type: 'Book' };
  assert.equal(mergeResourceFrontmatter(fm, { id: 'r1', title: 'T', author: 'A', type: 'Book' }), false);
});

// #5b Del A: field <-> frontmatter sync (read side).

test('applyFrontmatterToResource: file frontmatter overrides the JSON fields', () => {
  const resource = { id: 'r1', title: 'stale', author: 'stale', type: '' };
  const changed = applyFrontmatterToResource(
    { hc_resource_id: 'r1', hc_title: 'Fresh', hc_author: 'Fresh Author', hc_type: 'PDF' },
    resource,
  );
  assert.equal(changed, true);
  assert.deepEqual(resource, { id: 'r1', title: 'Fresh', author: 'Fresh Author', type: 'PDF' });
});

test('applyFrontmatterToResource: ignores frontmatter from someone else\'s file', () => {
  const resource = { id: 'r1', title: 'mine' };
  assert.equal(applyFrontmatterToResource({ hc_resource_id: 'other', hc_title: 'theirs' }, resource), false);
  assert.equal(applyFrontmatterToResource(undefined, resource), false);
  assert.equal(resource.title, 'mine');
});

test('applyFrontmatterToResource: a missing or blank hc_ key leaves the JSON value alone', () => {
  const resource = { id: 'r1', title: 'T', author: 'Keep', type: 'Book' };
  const changed = applyFrontmatterToResource({ hc_resource_id: 'r1', hc_title: 'T', hc_author: '   ' }, resource);
  assert.equal(changed, false);
  assert.equal(resource.author, 'Keep');
  assert.equal(resource.type, 'Book');
});

// #5b Del B: the same stub shape backs lecture notes, keyed on hc_lecture_id.

test('buildNoteStub: idKey picks which item owns the file', () => {
  const out = buildNoteStub({ id: 'l1', title: 'Når børn synger' }, 'MUS', '', 'hc_lecture_id');
  assert.match(out, /hc_lecture_id: "l1"/);
  assert.doesNotMatch(out, /hc_resource_id/);
  assert.match(out, /hc_title: "Når børn synger"/);
  assert.match(out, /hc_class: "MUS"/);
});

test('buildNoteStub: a lecture date becomes hc_date, absent otherwise', () => {
  assert.match(
    buildNoteStub({ id: 'l1', title: 'T', date: '2026-09-10' }, '', '', 'hc_lecture_id'),
    /hc_date: "2026-09-10"/,
  );
  assert.doesNotMatch(buildNoteStub({ id: 'r1', title: 'T' }, '', ''), /hc_date/);
});

test('buildNoteStub: an existing lecture note is migrated into the file body', () => {
  const out = buildNoteStub(
    { id: 'l1', title: 'T', notes: 'my prep notes' }, '', 'FAG/Musik/Uge 37/[NOTE] Lektion.md', 'hc_lecture_id',
  );
  const { body } = splitFrontmatter(out);
  assert.match(body, /Kilde: \[\[FAG\/Musik\/Uge 37\/\[NOTE\] Lektion\]\]/);
  assert.match(body, /my prep notes/);
});
