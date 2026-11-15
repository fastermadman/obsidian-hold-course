# upstream-probe

Runs small probes against any ref's `main.js` to check what upstream actually does,
without touching the repo. Used for #123 (exit routes) and meant to be re-run when
`upstream-watch` reports a new release.

    scripts/upstream-probe/run.sh [ref]     # default upstream/main; e.g. 1.15.0, HEAD

How it works: `main.js` is read with `git show <ref>:main.js`, an exports hook listing
every top-level name is appended in a temp dir, `obsidian` is stubbed (unknown exports
become empty classes), and each probe runs under a 20 s alarm. A probe that loops
forever reports `HANG`.

Probes (`probes/`, files starting with `_` are helpers):

- `bulk-hang.js`: #66, `parseBulkLectures` with full day names must return.
- `unknown-fields.js`: #123 task 5, fields a companion plugin adds (`x_ext`) must
  survive load/save, Copy class, Move class, the update methods, bulk add and backup.
  Controls (fields Copy class deletes on purpose) prove the probe can see a loss. CSV
  and syllabus are reported as `info`: they write fixed columns.

Not in CI (`node --test test/` only runs `test/`). Methods missing at a ref are reported
as `info`, so older refs (the fork's base is 1.8.0) give a partial run, not a crash.
Limits: it tests the plugin's data methods, not the UI, so an edit modal that rebuilds
an object itself would not be caught.
