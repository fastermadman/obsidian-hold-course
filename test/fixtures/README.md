# Shared contract fixtures

`contract-data.json` is the cross-repo schema contract between this plugin and
`viastudywiz-extension`'s `watchfolder/sync_hold_course.py`. It is a minimal but
**complete** `data.json`: one semester → one class → one lecture → assignments of
the schema-relevant types, plus a class-level assignment, an exam, and a
semester-level resource. Every field either side reads or writes appears once,
including all `vsw*` ownership stamps the sync relies on surviving a round-trip
through the plugin UI.

Both repos' test suites load this same file:

- **This repo** — `test/contract-fixture.test.js`: the plugin parses it without
  throwing, its `dataVersion` equals `CURRENT_DATA_VERSION`, and every documented
  field name is present.
- **viastudywiz-extension** — `sync_hold_course.py --selfcheck` locates it via the
  sibling checkout (`../obsidian-hold-course/test/fixtures/contract-data.json`)
  and asserts `sync_data()` round-trips it idempotently with every unknown key and
  `vsw*` stamp preserved. Skips with a note if the sibling repo isn't checked out.

A deliberate schema change on either side that isn't mirrored breaks one of these
tests instead of surfacing weeks later as a message between two Claude sessions.
Canonical prose contract: `ValdiVault/10_Projects/VIAstudyWiz/14-hold-course-synk.md`.
