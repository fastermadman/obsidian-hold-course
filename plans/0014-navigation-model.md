---
issue: 14
title: "Design a real navigation model: hierarchical breadcrumb vs. history-based back/forward"
status: designed        # designed | in-progress | shipped | superseded
created: 2026-09-02T11:00:00Z
updated: 2026-09-02T12:34:16Z
author: Claude Opus 5
repo: fastermadman/obsidian-hold-course
milestone: "Navigation layer"
branch: 14-navigation-model
depends_on: [12, 13]
related_issues: [15, 16, 17, 18, 19]
supersedes: []
labels: [model:opus, effort:high]
---

# Issue #14 — A real navigation model for HoldCourse

## Context

Issues #12 and #13 exposed that this plugin has no navigation *model*, only per-screen
improvisation. Three detail screens had a "back" button duplicating the breadcrumb's
class-code link (#13 deleted them); a fourth — Assignment detail — had a *contextual* back
button driven by `previousScreen` (`main.js:1462`, set at `:1513`), which remembers only the
most recent screen *name*. That exception is undocumented and behaves unlike its neighbours.

The issue frames the choice as **hierarchy vs. history**. Reading the code changes that
framing. The data is a strict tree (Semester → Class → Lecture → Assignment), but users meet
it through **lenses**: the global Assignments list, Calendar, Courses, the Today sidebar. The
real workflow is *working a list* — open an item, act, move on.

That exposes a latent defect nobody had named. Open an assignment from the global, filtered
Assignments list (say 8 rows) and the prev/next chevrons iterate `getAssignmentsSorted(cls)`
— that *class's* 23 assignments (`main.js:2985`). The chevrons walk a different set than the
one you came from. Same root cause as the back-button inconsistency: **the screen forgets
which collection you are working through.**

So there are three axes, and one piece of state answers two of them:

| Axis | Question | Mechanism | Today |
|---|---|---|---|
| **Up** | Where does this belong? | Breadcrumb, derived from data | Works |
| **Along** | What else is in the set I'm working? | Named "back to list" + prev/next **in that list's order and filter** | Half-exists, wrongly scoped |
| **Back** | Undo my last move | History stack | Absent |

Browser back/forward is built for the web, where the graph is unknown. Here it is fully
known, and a stack pop is *worse* for list work: open/back/open/back leaves six entries and a
meaningless forward. So the visible affordance is a **named place** (`← All Assignments`),
not an invisible pop. A real history stack is still built — it deletes `previousScreen` and
proves the model with a genuine forward — but is surfaced only as commands, so it never
competes with the named back.

A full audit of the navigation layer then turned up five further defects, all in scope
(scroll, breadcrumb root, Today, deletion targets, filter-state rule) and four that are not
(§8).

**Decisions taken with the user:** working set is the visible model; history is command-only;
breadcrumb untouched as the "up" axis; only real screen changes are history steps; gestures
out of scope this round.

## Constraint: this must be shippable upstream

The stated goal is that LiveAQuietLife wants this in the original. That is a design
constraint, not a nicety:

- **No fork-only concepts in #14's code or comments** — no e-ink, `--hc-mobile-scale`, or
  Boox references, so every commit cherry-picks onto `upstream/main` cleanly. The fork is
  ~20 commits ahead and `test/` exists **only here**; upstream has no tests at all. Note in
  passing: #13's `.hc-header` comment justifies itself with `--hc-mobile-scale`, so if #13 is
  also offered upstream that comment needs rewording first.
- **No new dependencies, no build step, no new settings.** Single-file plugin; keep it so.
- **The diff should shrink the detail renderers.** Four ad hoc blocks deleted and replaced by
  one rule is far easier to accept than a subsystem bolted on.
- **Ship as a reviewable commit series, not one blob** — see §9.
- **Match the maintainer's comment culture**: dense, explanatory, stating *why* and what was
  rejected (e.g. `main.js:873-888`, `:1494-1503`). Terse code with no rationale will read as
  foreign here.

## 0. Prerequisite: land #12 and #13 first

`main.js`/`styles.css` hold #12's and #13's implementations **uncommitted** while both issues
are still open. Split before starting, so #14's diff is navigation alone:

1. `12-vault-open-rows` — open-linked-note row buttons (`main.js` ~2361, ~2776, ~2921) plus
   the two `openLinkText` → `openVaultNote` refactors (~3154, ~3584). PR: `Closes #12`.
2. `13-sticky-detail-nav` — the `hc-header`/`hc-subheader` wrapper (`main.js:1550`,
   `styles.css:13-42`), three back-button removals, subheader relocation. PR: `Closes #13`.
3. Merge both, delete the branches, branch `14-navigation-model` off `main`.

Hunks are cleanly separable; use `git add -p`.

> **Status update (2026-09-02):** done. #12 merged as `ecbb6fd`, #13 merged as `23b910e`,
> both closed with a comment on GitHub, branches deleted, merged `main` verified
> byte-identical to the original uncommitted working tree.

## 1. `this.origin` — the working set

Descriptor of the list screen the current detail was opened from. Replaces `previousScreen`.

```js
// Snapshot of the list screen this detail screen was opened from.
// null on list screens (you are AT the list).
this.origin = null;   // { screen, classId, lectureId, tab }
```

Set inside `navigate()` by **one inferred rule, with zero call-site changes**:

> If the destination screen differs from the current screen, `origin` becomes a snapshot of
> the current screen. If it is the same screen (prev/next), `origin` is left untouched.

Checked against every existing call site:

- `assignments → assignment` — differs → origin = the global list ✓
- `assignment → assignment` (chevrons) — same → origin **persists** ✓
- `lecture → assignment` — differs → origin = that lecture ✓
- `class → lecture` — differs → origin = class + active tab ✓
- `assignment → resource` (book link, `:3151`) — origin = that assignment ✓
- `→ class` / `→ assignments` / `→ calendar` — list screens → origin resets to null ✓

This is not `previousScreen` renamed. `previousScreen` held a screen *name* and was
overwritten by the first chevron press, silently degrading the back button from
"All Assignments" to the class code. `origin` holds the full route **and survives prev/next**
— which is exactly the bug.

**Today sidebar** (`_navigateToItem`, `:7052`) navigates the main view from another leaf, so
the inferred rule would pick up whatever that view happened to show. It sets `origin`
explicitly instead — `{ screen: 'today' }`, labelled `Today` — rather than inheriting an
unrelated screen.

**Deletion handlers** (`:3090`, `:3103`, `:3435`, `:3662`) currently navigate to the class
with a hardcoded tab. They return to `origin` instead, falling back to today's behaviour when
there is none. Otherwise the rule is not "the same everywhere".

## 2. `_originSequence()` — prev/next scoped to the working set

Returns an array of **navigation targets** (`{ screen, classId, lectureId, assignmentId,
examId, resourceId }`), so the subheader's prev/next is one type-agnostic block instead of
four per-screen copies.

- `origin.screen === 'assignments'` → the global list with **the filter and sort the user is
  actually looking at**. Requires extracting the gather/filter/sort block from
  `_renderAssignmentsView` (`main.js` ~3930–3970) into a pure
  `getGlobalAssignments(sem, { classId, type, showDone, sort })`, called from both places.
  Reuses existing `getAllAssignments` / `getDueInfo`. Currently untestable inline logic; this
  is the one real refactor here and it earns its keep.
- `origin.screen === 'class'` → by `origin.tab`, reusing `getLecturesSorted` (`:316`),
  `getAssignmentsSorted` (`:468`) honouring `classAssignFilterType`, `getExamsSorted`
  (`:487`), Library resources.
- `origin.screen === 'lecture'` → that lecture's assignments.
- anything else (calendar, courses, today, dashboard, null) → **null**, and the screen falls
  back to exactly today's class-scoped sequence. Nothing regresses. Mark with a `ponytail:`
  comment naming the ceiling; per-lens sequences are issue #17.

## 3. History stack — real, but command-only

```js
this.history = [];    // snapshots: the 7 navigate() params + tab + origin + scrollTop
this.histIndex = -1;
```

- `navigate()` — apply params as today, truncate forward (`history.length = histIndex+1`),
  push, `histIndex++`. Skip the push when the snapshot equals the top. Cap at 50.
- `back()` / `forward()` — move `histIndex`, then `_restore(entry)` which assigns fields
  **directly and calls `render()`, bypassing `navigate()`** so it never pushes.
- **What counts as a history step: only a real screen change.** Tab switches
  (`navigateTab`, `:1536`), calendar month/week paging (`:4359-4393`) and filter changes are
  state *on* a screen: they **update the current entry in place** so returning restores them,
  but they do not push. Consequence, accepted deliberately: the tab you were on is
  *remembered*, but a tab click is not itself undoable — back always means "somewhere else",
  never "same place, other tab", and forward stays meaningful. Write this down in the code.

**Re-entrancy guard (required).** Twelve renderers call `this.navigate()` on missing data
(`:2410`, `:2973`, `:3370`, `:3617`, …) and `render()` is called *from* `navigate()`. Without
a guard a redirect pushes an entry for the broken screen and back bounces off it forever.
Fix: set `this._inRender` around the `switch` in `render()`; a `navigate()` while it is set
**replaces the top entry instead of pushing**. Four lines, covers all twelve sites, no call
site changes, and makes back self-healing after a deletion.

**Commands** `hc-nav-back` / `hc-nav-forward` ("Hold Course: Back" / "Forward"), registered
with the others (`:760-846`) following `activateAndNavigate` (`:913`). **No default hotkey**
— the user binds them. Silent no-op when there is nowhere to go.

## 4. Scroll restoration — two halves

No `scrollTop` handling exists in 7,100 lines, while `render()` is called from **71 sites**
and begins with `contentEl.empty()`. Toggling one row's status in a 40-row list throws you to
the top. This is the largest single defect in the layer, and it is not only a navigation
problem.

- **Same-screen re-render**: `render()` captures the scroll offset before `empty()` and
  restores it after building, whenever the screen identity is unchanged. Covers all 71 call
  sites — status toggles, filter changes, saves — without touching any of them.
- **Back/forward**: the offset is written into the current history entry on leaving and
  restored by `_restore()`, so returning to a list lands where you left it.

Restore after the content is in the DOM; guard against overshoot when the list is now shorter
(clamp to `scrollHeight`). One shared helper, not per-screen code.

## 5. Breadcrumb root — remove the last history leak

`main.js:1610-1617` derives the root label from `fromCourses = !!this.viewedSemesterId`, so it
reads "Courses" or "Overview". The comment defends this as "state, not history", but it is
literally *the route you took* — the same family as `previousScreen`, in the one component
that is supposed to be pure hierarchy. Have the root read the `origin` chain instead of
overloading `viewedSemesterId`, which goes back to meaning only "which semester do detail
screens resolve against". Behaviour is unchanged for the user; the concept stops being
smuggled.

## 6. Filter/sort state — write the rule down

Filter state lives in three places with three lifetimes and no stated rule: `sem.assignSort` /
`sem.assignShowDone` persist in data.json; `globalAssignFilterClassId/Type`,
`classAssignFilterType`, `libraryFilterClassId`, `coursesFilter*` die with the view;
`currentTab` resets on class change (`:1508-1512`). This round **fixes the rule, not the
storage**: state a single rule in a comment beside the field declarations —

> *Screen-shaped* state (which tab, which filter, which month) belongs to the history entry
> and is restored on return. *Preference-shaped* state (sort order, show-done) belongs in
> `data.json` and survives restart. Nothing lives on the view instance alone.

— then correct the places that contradict it, and record which fields still do not comply.
Moving the non-compliant fields is issue #16.

## 7. Uniform subheader

Populated **once in `render()`**, before the screen switch, so the rule lives in one place:

```
[← <origin label>]                         [‹  n / N  ›]
```

- Back button only when `origin` is set (⇒ detail screens). Label from one
  `_originLabel(origin)` switch: `All Assignments` / `PHIL101 · Readings` / `Lecture 3` /
  `Today` / `Calendar`. Replaces the ~25 lines of ad hoc labelling at `:2993-3012` — a net
  deletion.
- prev/next only when a sequence exists and the current item is in it.
- On list screens both are absent, so the existing `.hc-subheader:empty { display: none }`
  (`styles.css:42`) keeps the dashboard free of dead vertical space.

#13's `hc-header`/`hc-subheader` DOM and CSS are reused **unchanged**; only the population
moves up a level. So: drop the `subheader` parameter #13 just added to the four detail
renderers, and delete their four per-screen nav blocks. Rename `.hc-lecture-back-btn`
(`styles.css:1062`) to `.hc-nav-back-btn` — it is no longer lecture-specific.

## 8. Spun out as new issues

Created under the `Navigation layer` milestone with `model:*`/`effort:*` labels set at
creation:

- **#15 — Persist view state via Obsidian's `getState()`/`setState()`** — zero occurrences in
  `main.js`; the view resets to dashboard on every reload, which the install→device loop hits
  daily. `model:sonnet`, `effort:medium`.
- **#16 — Filter/sort state has three storage locations with three lifetimes** — implements
  the move that §6 only specifies. `model:sonnet`, `effort:medium`.
- **#17 — Per-lens prev/next sequences for Calendar and Courses origins** — the documented
  ceiling from §2. `model:sonnet`, `effort:low`.
- **#18 — List rows are unreachable by keyboard** — `hc-lecture-row`, `hc-assign-row`,
  `hc-exam-row`, `hc-resource-row`, `hc-class-card` are plain `div`s with click handlers; the
  whole file contains 5 `tabindex`/`role`/`keydown` occurrences and all are Enter-to-save in
  modals. Keyboard-only users cannot navigate the app. Accessibility defect, not a preference.
  `model:sonnet`, `effort:high`.
- **#19 — Trackpad/touch swipe navigation** — a local tracking issue referencing the upstream
  note (LiveAQuietLife/obsidian-hold-course#13) so it has a home now that the history stack it
  depends on exists. `model:sonnet`, `effort:medium`.

## 9. Commit series

Each step independently reviewable and revertible — this is what makes the upstream PR
acceptable:

1. Extract `getGlobalAssignments` + its test. Pure refactor, no behaviour change.
2. `origin` replaces `previousScreen`; uniform subheader; delete the four per-screen blocks.
3. `_originSequence()` — prev/next re-scoped to the working set.
4. History stack, re-entrancy guard, back/forward commands.
5. Scroll restoration (both halves).
6. Breadcrumb root reads `origin`; filter-state rule documented.

## Files to change

- **`main.js`** (view class):
  - constructor `:1447-1484` — drop `previousScreen`; add `origin`, `history`, `histIndex`.
  - `navigate()` `:1493` — origin rule, push/replace, re-entrancy guard.
  - new `back()`, `forward()`, `_restore()`, `_snapshot()`, `_originLabel()`,
    `_originSequence()`, scroll helper.
  - `navigateTab()` `:1536` and calendar paging `:4359-4393` — in-place entry update.
  - `render()` `:1543` — `_inRender` flag, scroll capture/restore, populate subheader, drop
    the `subheader` args.
  - `_renderLectureDetail` `:2401`, `_renderAssignmentDetail` `:2967`, `_renderExamDetail`
    `:3361`, `_renderResourceDetail` `:3608` — delete nav blocks and contextual back button.
  - `_renderBreadcrumb` `:1606` — root reads `origin`.
  - `_renderAssignmentsView` `:3782` — call the extracted helper.
  - deletion handlers `:3090`, `:3103`, `:3435`, `:3662` — return to `origin`.
  - `HoldCourseTodayView._navigateToItem` `:7052` — set `origin` explicitly.
  - new module-level `getGlobalAssignments` beside the other `get*Sorted` helpers.
  - export block `:7106` — add `HoldCourseView`, `getGlobalAssignments`.
- **`styles.css`** — rename `.hc-lecture-back-btn` → `.hc-nav-back-btn` (`:1062`); otherwise
  reuse `.hc-detail-nav` (`:1070`) as-is.
- **`README.md`** — "Navigating" (`:295`) and the command list (`:308`).
- **`test/nav-history.test.js`** — new.

## Verification

**Unit — `node --test test/*.test.js`** (existing pattern; `test/_bootstrap.js` stubs
`obsidian`, no new dependency). `HoldCourseView` constructs fine under the stub since
`ItemView` is an empty class; stub `view.render = () => {}` to keep the DOM out. Assert:

- back/forward round-trip; a new `navigate()` truncates the forward entries.
- `origin` set on list→detail, **preserved across same-screen prev/next**, replaced on
  detail→different-detail, cleared on →list.
- `navigateTab` updates in place and does **not** push.
- an in-render redirect **replaces** the top entry rather than pushing (stub `render` to call
  `navigate` once; assert `history.length`).
- `getGlobalAssignments` filter + sort, including that its order matches the rendered list.

**On device — `./install.sh` → Boox; Mac is symlinked and already live.** Reload, then walk
what unit tests cannot cover:

| From | Do | Expect |
|---|---|---|
| Global Assignments, type-filtered | open a row | back reads `All Assignments`; chevrons walk **the filtered 8**, not the class's 23 |
| Same | chevron next ×2, then back | still the filtered global list — not the class |
| Long Assignments list, scrolled down | toggle one row's status | stays put; no jump to top |
| Same | open a row, then back | returns to the same scroll offset |
| Class → Readings tab | open a reading | back reads `PHIL101 · Readings`; Readings tab restored |
| Class | click through 4 tabs, open an exam, back | lands on the class with the **last** tab; a second back leaves the class |
| Lecture detail | open one of its assignments | back reads `Lecture 3` |
| Assignment detail | open the linked book | back reads that assignment |
| Today sidebar | open an item | back reads `Today`, not an unrelated screen |
| Calendar | open a lecture | back reads `Calendar`; chevrons fall back to class order |
| Any detail | breadcrumb class link | unchanged |
| Courses → a class → a lecture | breadcrumb root | still reads `Courses` |
| Dashboard, fresh open | — | no subheader, no wasted vertical space |
| Any screen | command Back, then Forward | forward genuinely returns |
| Delete the item you are on | back | does not bounce; lands on a real screen |

Verify the last four on the Boox too — e-ink repaint makes a stuck back button expensive to
diagnose later.

## Documenting the reasoning

Required by the issue's goal metric, because the previous ad hoc choice stayed invisible until
someone went looking. Two places: a block comment above the navigation section in `main.js`
stating the three axes, why the visible back is a named place rather than a stack pop, why
history is command-only, and why a tab switch is remembered but not undoable; and the same
summary as a comment on #14 before closing it.

## Deliberately out of scope

- **Swipe gestures** — Electron gives plugins no real gesture event, so it means a `wheel`
  listener accumulating `deltaX` with threshold and cooldown, competing with system gestures
  on the device. Tracked as #19; the stack it needs now exists.
- **Refactoring `navigate()`'s seven positional parameters** — tempting (`:3765` is
  unreadable), but `_snapshot()`/`_restore()` handle the object form internally, so no call
  site must change. Separate issue if it keeps hurting.

## Log

- **2026-09-02T11:00Z** — Plan drafted in Claude plan mode after full navigation-layer audit
  and three rounds of clarifying questions with the user.
- **2026-09-02T12:34Z** — #12 and #13 split into their own branches, merged, verified
  byte-identical, closed with comments. Issues #15–#19 and the `Navigation layer` milestone
  created. Plan moved from Claude's local plan-mode file into this repo at the user's request,
  so navigation history and rationale live with the code, not in a Claude-only temp path.
  Model handed off to Sonnet (high effort recommended) for §1–§7 implementation.
