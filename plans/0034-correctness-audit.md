---
issue: 34
title: "Full-plugin correctness/consistency pass on main.js (post #14 follow-ups)"
status: designed    # designed | in-progress | shipped | superseded
created: 2026-09-09T00:00:00Z
updated: 2026-09-09T00:00:00Z
author: Claude Opus 5
repo: fastermadman/obsidian-hold-course
milestone: null
branch: null
depends_on: [14]
related_issues: [15, 16, 17, 33, 35]
labels: [model:opus, effort:high]
---

# Issue #34 — correctness & consistency audit of `main.js`

Read-only pass over all 8,651 lines at commit `4f36929`. Method is #34's own: trace
state and clicks through the code, not a complexity scan. Baseline: `node --test
test/*.test.js` → 88/88 pass, both before and after (nothing was changed).

## Method note: `improve` was not run

#34 step 5 says to use the `improve` skill for the survey. It wasn't run, deliberately —
recording that here so a later session doesn't re-run it looking for a missing artefact.

`improve` produces "prioritized, self-contained implementation plans for OTHER
models/agents to execute", read-only. That is exactly the shape of §3 and §5 below and of
the nine issues filed from them: each carries `file:line`, a concrete failure scenario and
a fix sketch, and is self-contained enough to hand off cold. Running it after the fact
would re-derive the same ground *without* the click-trace that found most of these — #34's
own framing says the method is tracing, not scanning, because that is what found #33.

Its extra breadth (test coverage, security, DX, roadmap) is out of scope by #34's own
"Out of scope" section. If a future pass wants that breadth, it is a different issue, not
a re-run of this one.

## Timing caveat

#34's own Timing section says to run this *after* #15, #16, #17 and #33 land. All four
are still open. Everything below is therefore filtered against them: findings that
those issues already cover are listed in §4 as "already tracked" and are **not** filed
again. §1's calendar-field finding and §1's `coursesSort*` classification are the two
places where this audit says #16's scope is *incomplete*, not where it duplicates it.

---

## 1. Every stateful field on `HoldCourseView`, classified

The rule (#14 §6, restated in the constructor comment at `main.js:2100-2108`):

> *Screen-shaped* state (which tab, which filter, which month) belongs to the history
> entry and is restored on return. *Preference-shaped* state (sort order, show-done)
> belongs in `data.json` and survives restart. Nothing lives on the view instance alone.

"On the history entry" now means: in `_identity()` (`:2209`) → `_snapshot()` (`:2228`)
→ `getState()` (`:2273`), which Obsidian both replays on back/forward and writes into
`workspace.json`.

### 1a. Compliant — screen-shaped, carried on the snapshot

| Field | Decl. | Notes |
|---|---|---|
| `screen` | `:2046` | in `_identity()` |
| `currentClassId` | `:2047` | in `_identity()` |
| `currentLectureId` | `:2048` | in `_identity()`; see §3.12 for a consistency wrinkle |
| `currentAssignmentId` | `:2049` | in `_identity()` |
| `currentExamId` | `:2050` | in `_identity()` |
| `currentResourceId` | `:2051` | in `_identity()` |
| `currentTab` | `:2071` | in `_identity()`; deliberately *not* a history step (`navigateTab`, `:2335`) |
| `origin` | `:2092` | in `_snapshot()` |
| `viewedSemesterId` | `:2056` | in `_snapshot()`; class-subtree lifetime, documented |
| `enteredViaCourses` | `:2066` | in `_snapshot()`; own field on purpose, documented |

### 1b. Compliant — preference-shaped, in `data.json`

Not view fields at all; listed so the rule's other half is visible as satisfied.
`sem.assignSort` / `sem.assignShowDone` (`:5173-5174`), `sem.librarySort` (`:4574`),
`cls.lectureSort` / `cls.lectureShowDone` (`:3309-3310`), `cls.assignShowDone`
(`:3757`), `cls.readingsShowDone` (`:3947`), `cls.examShowDone` (`:4378`).

### 1c. Violations — screen-shaped, view-instance-only

Each dies on reload and is absent from `getState()`.

| Field | Decl. | Already in #16? |
|---|---|---|
| `globalAssignFilterClassId` | `:2109` | yes |
| `globalAssignFilterType` | `:2110` | yes |
| `classAssignFilterType` | `:2111` | yes |
| `libraryFilterClassId` | `:2112` | yes |
| `coursesFilterYear` | `:2113` | yes |
| `coursesFilterTerm` | `:2114` | yes |
| `calView` | `:2117` | **no** |
| `calYear` | `:2118` | **no** |
| `calMonth` | `:2119` | **no** |
| `calWeekStart` | `:2120` | **no** |
| `calFilterClassIds` | `:2121` | **no** |
| `calFilterTypes` | `:2122` | **no** |

The six calendar fields are the gap. #14 §6 names "which month" as its own example of
screen-shaped state, and #16 — the issue that exists to move the non-compliant fields —
lists none of them. **Failure**: page the calendar to March, switch to Week, turn off two
classes in the legend, restart Obsidian. `setState()` restores `screen: 'calendar'`, so
you land on the calendar — in Month view, at the current month, every legend dot back on.

### 1d. Violation — preference-shaped, view-instance-only

| Field | Decl. | Note |
|---|---|---|
| `coursesSortKey` | `:2115` | sort order → belongs in `data.json` by the rule |
| `coursesSortDir` | `:2116` | same |

#16 lists both, but in its "view instance → history entry" bucket alongside the filters.
By the rule they belong in the *other* bucket: every other list's sort already persists
(`sem.assignSort`, `sem.librarySort`, `cls.lectureSort`). Courses is the lone exception.

### 1e. Correctly outside the rule — machinery, not user-visible state

`plugin` (`:2045`), `navigation` (`:2096`), `_inRender` (`:2097`), `_lastRenderedIdentity`
(assigned at `:2415`, never declared in the constructor — harmless, `_identityEqual`
returns `false` for `undefined`, which is the right answer on a first render),
`_semDropEl` / `_semCloseHandler` / `_calPopoverEl` / `_calPopoverCloseHandler`
(`:2125-2128`).

---

## 2. `_originSequence()` vs. every renderer it mirrors

`_originSequence()` (`:2637`) is hand-duplicated from five list renderers. Checked
branch by branch, filter by filter, sort by sort.

| Origin branch | Renderer | Set | Order | Verdict |
|---|---|---|---|---|
| `assignments` (`:2644`) | `_renderAssignmentsView` `:5159` | ✅ both call `getGlobalAssignments` with the same four args | ✅ same call | **match** |
| `lecture` (`:2655`) | `_renderLectureDetail` `:3639-3667` | ✅ same two show-done flags, same Reading/non-Reading split | ❌ **flat `lec.assignments` order vs. two rendered sections** | **mismatch** |
| `class` / Lectures (`:2679`) | `_renderLectureList` `:3306` | ✅ same `lectureShowDone` | ❌ **`cls.lectureSort` reversal not mirrored** | **mismatch** |
| `class` / Assignments (`:2691`) | `_renderAssignmentList` `:3756` | ✅ show-done + `classAssignFilterType` + non-Reading | ✅ stable sort on the same key; surviving order identical | **match** |
| `class` / Readings (`:2691`) | `_renderReadingsList` `:3946` | ✅ `readingsShowDone` + Reading-only | ✅ same | **match** |
| `class` / Exams (`:2712`) | `_renderExamList` `:4377` | ✅ `examShowDone` | ✅ `getExamsSorted` vs. identical inline sort | **match** |
| `class` / Library | — | returns `null` | — | **match** (resource detail never had prev/next; `ponytail:` comment says so) |
| calendar / courses / today | — | returns `null` | — | **match** (documented fallback, #17) |

Two concrete mismatches:

**2a. Lectures branch ignores `cls.lectureSort`** (`:2684` vs `:3310-3312`).
`_renderLectureList` does `sortDesc ? [...sorted].reverse() : sorted` *then* filters;
`_originSequence` only filters. The set is identical (filtering commutes with reversing),
the order is inverted.
*Failure*: class with 10 dated lectures, sort = "Newest first". List shows Lecture 10
first. Click that top row → subheader reads **"10 / 10"**, next is disabled with nine
rows visibly below it, and prev goes to Lecture 9 — the row *underneath* the one opened.

**2b. Lecture branch ignores the Readings/Assignments split** (`:2655` vs `:3639-3667`).
`_renderLectureDetail` renders two sections, Readings first, then non-Readings.
`_originSequence` builds one flat list in raw `lec.assignments` order.
*Failure*: `lec.assignments = [Essay (Writing), Chapter 3 (Reading), Poster (Project)]`.
The screen shows Readings: `[Chapter 3]`; Assignments: `[Essay, Poster]`. Open
"Chapter 3", the only row in its section → subheader reads **"2 / 3"**, next goes to
Poster, prev to Essay, both from the other section.

Everything else in the mirror is genuinely in sync, including the two subtle cases:
`(type || 'Other') === 'Reading'` vs. the renderers' strict `type === 'Reading'` agree
for every input, and `getAssignmentsSorted`'s pre-sort order (class-level first, then
lectures) plus a stable `Array.sort` make the Assignments/Readings order identical to
the renderers' own inline sort even for equal due dates.

---

## 3. Findings, ranked

CONFIRMED = traced to a specific input and a specific wrong output.
PLAUSIBLE = the code path is real, the trigger depends on timing or external data.

### P1 — data loss / hang

**3.1 `main.js:691` — `parseBulkLectures` hangs Obsidian. CONFIRMED.**
`patternActive` is gated on `meetingDays.length > 0`, but `nextSlot()` loops on
`dayNums`, the `BULK_DAY_NUM`-filtered subset. A `meetingDays` entry outside
`{Mon…Sun}` survives the gate and vanishes from the filter.
*Failure*: `cls.meetingDays = ['Monday','Wednesday']` (full names — reachable from
`sync_hold_course.py` or a hand-edited `data.json`; the chip picker at `:7292` only
iterates `DAYS`, so an out-of-set value is invisible in the UI but stays in the array)
plus a start date. Open Bulk add lectures, type one character → `_refresh()` (`:7321`)
→ `while (!cursor.dayNums.includes(...))` never exits. UI thread hangs, no error.

**3.2 `main.js:1734` — `moveClass` makes two resources share one note file. CONFIRMED.**
The copy branch takes a new `id` but keeps the original's `notesLink`. `_ownsNoteFile`
(`:5117`) checks `notesLink === file.path` *first*, so both records pass the ownership
gate and both may write. `mergeResourceFrontmatter` / `applyFrontmatterToResource`
(`:205`/`:219`) gate on `fm.hc_resource_id === resource.id`, so the copy fails those.
*Failure*: PHIL101 and HIST202 both tag "Kant, Critique", which has a Hold Course note
file. Move PHIL101 to another semester → a copy lands there pointing at the same `.md`.
Edit the copy's Notes → `_writeNoteBody` rewrites the shared file, silently replacing
what the original resource shows. The copy's title/author/type never mirror either way.

**3.3 `main.js:1405` — a full re-render eats a focused notes textarea. PLAUSIBLE.**
`refreshMainView()` / `refreshAllViews()` (`:1378`) call `render()`, which starts with
`contentEl.empty()`. Notes save on `blur` (`:4227`, `:4934`, `:5108`); destroying the
element never fires it.
*Failure*: type a paragraph into an assignment's Notes without clicking away;
`sync_hold_course.py` writes `data.json` → `onExternalSettingsChange` →
`refreshMainView()` → `empty()`. Paragraph gone, no error. Same via `refreshAllViews()`
when the e-ink or mobile-scale setting is toggled.
Note the comment at `:1387-1400` accepts a *different* risk — "mutated in memory but not
yet written to disk". Text still sitting in an `<input>` was never in memory at all, so
it is outside what was actually reasoned about.

### P2 — silently wrong output

**3.4 `main.js:1191` — the calendar hides items whose type isn't a legend type. CONFIRMED.**
`calLegendFilterPasses` indexes `filterTypes` with the raw `item.assignment.type`
instead of `calItemTypeKey()` (`:364`), which exists precisely to apply `|| 'Other'`.
`calFilterTypes` is seeded only for `CAL_LEGEND_TYPES` (`:5776`).
*Failure*: an assignment with `type: 'Quiz'` — a value this codebase already treats as
real (`ASSIGNMENT_TYPE_STYLE:53`, `ASSIGNMENT_TYPE_ICON:351`,
`test/global-assignments.test.js:28`) — renders fine in every list, on the class card
and in the Today sidebar, but is invisible in both calendar grids, and turning **every**
legend dot on does not reveal it. Same for a missing `type` from external data.

**3.5 `main.js:2684` — Lectures prev/next inverted under "Newest first". CONFIRMED.**
See §2a.

**3.6 `main.js:2655` — lecture prev/next crosses the Readings/Assignments split. CONFIRMED.**
See §2b.

**3.7 `main.js:2927` — the deadline radar counts dropped and completed classes. CONFIRMED.**
`_renderTodayStrip` filters `getAllDeadlineItems()` on status and due date only. Every
other date-driven surface goes through `getItemsForDate`, which skips completed/dropped
classes explicitly and says so (`:1117-1119`: "Today, Tomorrow, month, and week all read
this same list").
*Failure*: set PHIL101 to "dropped" in Courses. Its assignments leave the Calendar and
the Today sidebar, but the Overview's Overdue / Due today / Coming up columns keep
listing them.

### P3 — scope and wording mismatches

**3.8 `main.js:2117` — the six calendar fields are off the snapshot. CONFIRMED.**
See §1c. Not covered by #16.

**3.9 `main.js:4571` — the class Library tab lists the whole semester. CONFIRMED.**
`_renderLibraryList` starts from `sem.resources` and narrows only by
`this.libraryFilterClassId`, which `navigate()` resets to `null` on every class change
(`:2168`) — so the tab always opens unfiltered. The `cls` argument reaches the rows but
never scopes the list. `README.md:231` says the tab "collects every resource associated
with a class"; `README.md:235` describes the all-classes filter. The code implements 235
and contradicts 231.
*Failure*: PHIL101 and HIST202 in one semester; a book tagged HIST202 only. Open
PHIL101 → Library: the HIST202 book is listed. Click it → the breadcrumb reads
"… › PHIL101 › Resource" while that screen's own Classes chips say HIST202.

**3.10 `main.js:4670` — Library's empty state can't tell "none" from "filtered out". CONFIRMED.**
One empty state, keyed on the post-filter array. Every other list distinguishes the two
(`:3365`/`:3369`, `:3864`/`:3867`, `:4001`/`:4004`, `:4414`/`:4417`, `:5323`/`:5327`).
*Failure*: 10 resources, none tagged HIST202; set the filter to HIST202 → "No resources
yet. Add your first one above." beside a filter button that still reads HIST202.

**3.11 `main.js:2114` — `coursesSortKey`/`coursesSortDir` are in the wrong half of the rule. CONFIRMED.**
See §1d.

### P4 — consistency, no reachable failure today

**3.12 `main.js:3108`, `:5398` — `lectureId` is not canonical for an assignment.**
The class card's "Next assignment due" and the global Assignments row click both pass
`lectureId: null`, while the Today strip (`:2954`), `_navigateCalItem` (`:6038`) and
`_originSequence`'s own targets pass the real one. So the same assignment yields two
different `_identity()` values depending on how it was opened.
Nothing reads `this.currentLectureId` on the assignment screen — `_renderAssignmentDetail`
derives it from `findAssignment` (`:4109`) — so this is latent, not a live bug. It makes
`_identity()` a non-canonical key, which matters the moment anything starts trusting it
(e.g. #15/#35 dedup, or a future per-lecture sequence).

**3.13 `main.js:4898` — `enteredViaCourses` re-derived from `viewedSemesterId`.**
The resource detail's "referenced by" row forwards `this.viewedSemesterId` as the
`semesterId` argument, and `navigate()` then sets `enteredViaCourses = !!semesterId`
(`:2159`). The result is correct today for every reachable route, but it re-establishes
exactly the coupling the constructor comment (`:2058-2065`) says the field exists to
avoid: "this field's value should keep meaning 'you came from Courses' even if that
stops being true."

**3.14 `main.js:5133` — `_syncResourceFromNoteFrontmatter` saves from inside `render()`.**
Called from `_renderResourceDetail` (`:4728`), it can fire `plugin.save()` mid-render.
No recursion (`save()` only refreshes the Today sidebar), but it is an unconditional
disk write on a render path.

**3.15 `main.js:5017` — `_renderFileNote`'s inner `render()` is async and unanchored.**
It awaits `_resolveNoteFile` and `vault.read`, then writes into a `wrap` captured before
the await. A `HoldCourseView.render()` during that window detaches `wrap`, and the
continuation paints a node that is no longer in the document — the Notes section stays
blank until the screen is re-entered.

### Checked and found correct

Recorded so the next pass doesn't re-derive them: `getISOWeekNumber` / `getDaysUntil` /
`addDaysISO` are DST-safe (noon anchoring plus `Math.round` over a 12 h offset);
`render()`'s re-entrancy guard and its "a nested render already moved on" bail-out
(`:2408`) are correct including the restore-rather-than-clear of `_inRender`;
`_navigateToOrigin`'s tab restore before `navigate()` is correct against `navigate()`'s
own class-changed tab reset; `moveClass`'s untagged-but-linked resource case; the month
grid's week-number column when weekend columns are dropped; `getAllAssignments` always
yields a resolvable `classId`, so `_renderAssignmentsView`'s `if (!cls) continue`
(`:5326`) is unreachable defensive code rather than a set mismatch with
`_originSequence`.

---

## 4. Already tracked elsewhere — deliberately not re-filed

- Filter fields on the view instance (`globalAssign*`, `classAssignFilterType`,
  `libraryFilterClassId`, `coursesFilter*`) → **#16**. §1c only adds the calendar six.
- View state not surviving restart at all → **#15**.
- Calendar/Courses origins having no prev/next sequence → **#17**.
- `origin` scroll restoration and the duplicated identity helpers → **#33** (both since
  implemented on `main`: `origin.scrollTop` at `:2186`, `_identity()`/`_identityEqual`
  at `:2209`/`:2221` — #33's checklist looks stale against the code).
- Keyboard reachability of list rows → **#18**.
- Complexity / dead code (e.g. the unreachable guard at `:5326`) → out of scope by #34's
  own §"Out of scope"; `ponytail-audit` owns it.

## 5. Suggested landing order

1. #3.1 (hang) and #3.2 (note-file collision) — the only two that destroy something.
2. #3.4, #3.5, #3.6, #3.7 — silently wrong output, all small and local.
3. #3.9 + #3.10 together (one function), after a decision on which README line is right.
4. #3.8 + #3.11 fold into #16 as scope additions rather than new work.
5. #3.3 needs a design call (capture on `input`, or skip `render()` when a focused
   textarea is dirty) — not a one-liner.
6. §P4 items are cheap and can ride along with whatever touches those functions.
