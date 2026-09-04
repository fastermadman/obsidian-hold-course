'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  splitFrontmatter,
  sanitizeNoteFilename,
  buildNoteStub,
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
