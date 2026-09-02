---
issue: 14
title: "Manual test checklist for the navigation model (Mac first, then Boox)"
status: testing
created: 2026-09-02T13:26:11Z
updated: 2026-09-02T13:26:11Z
author: Claude Sonnet 5
repo: fastermadman/obsidian-hold-course
branch: 14-navigation-model
related_docs: [plans/0014-navigation-model.md]
---

# #14 Navigation model — manual test checklist

Two passes: **Mac first** (this checklist in full — Mac is symlinked straight to the repo,
so just reload the plugin in Obsidian, no `install.sh` needed), **then Boox** (only the rows
marked 🔶 below — the ones e-ink/touch could plausibly break differently from desktop).

**How to reload on Mac:** Cmd+P → "Reload app without saving" (or toggle the plugin off/on in
Settings → Community plugins).

Check a box, or write a one-line note next to it if something's off — doesn't need to be
fancy, just enough for me to find the spot in the code from your note.

---

## 1. Back button reads the right place, every time

- [ ] Global **Assignments** list, filter it down (class or type filter) → open a row → back
      button reads **"All Assignments"**
- [ ] Class → **Readings** tab → open a reading → back button reads **"‹Code› · Readings"**
- [ ] Class → **Assignments** tab → open an item → back button reads just the class code (no
      "· Assignments" suffix — Lectures/Assignments-as-default don't get a tab suffix)
- [ ] Class → **Exams** tab → open an exam → back reads **"‹Code› · Exams"**
- [ ] Class → **Lectures** tab (default) → open a lecture → back reads just the class code
- [ ] Open a lecture → open one of **its** assignments → back reads **"Lecture N"**
- [ ] Open an assignment → click its linked book → back reads **"Assignment"**
- [ ] **HC Today sidebar** → click any item → back reads **"Today"** 🔶
- [ ] Calendar → open a lecture/assignment/exam → back reads **"Calendar"**

## 2. Prev/next chevrons walk the list you were actually looking at

This is the main bug #14 fixes — chevrons used to always walk the *class's full list*,
even when you opened the item from a smaller, filtered one.

- [ ] Global Assignments, filtered to ~5–8 rows → open one → chevrons show `1 / N` where N
      matches the **filtered** count, not the class's total assignment count
- [ ] Same screen → click next a couple of times → still cycling through the filtered set
- [ ] Class **Assignments** tab, toggle **"Hide done"** on → open an item → next/prev never
      lands on a done item (it's hidden from the count too)
- [ ] Class **Readings** tab → open a reading → chevrons only cycle Readings, never a regular
      Assignment
- [ ] Class **Exams** tab, hide done exams → open one → chevrons skip hidden ones
- [ ] Lecture detail → open one of its assignments → chevrons only cycle **that lecture's**
      assignments, not the whole class's
- [ ] Library resource detail → no chevrons at all (not yet built — see issue #17, expected)
- [ ] Calendar-opened detail screen → no chevrons (also expected — see #17)

## 3. Back button vs. chevrons stay in sync as you click through

- [ ] From a filtered global-Assignments row: click next twice, then click back → lands back
      on the **global Assignments list**, filter still applied — not the class screen

## 4. Scroll position (found while building this, not originally in scope — worth checking)

- [ ] Scroll partway down a long list (Assignments view or a class tab with 15+ rows) → click
      a status pill to toggle it → page does **not** jump back to the top
- [ ] Same idea, but change a filter/sort instead of a status → still no jump
- [ ] Scroll down a list → open an item → click back → returns to roughly the same scroll spot
      (not necessarily pixel-perfect, but same general area)

## 5. Moving/deleting an item returns to the right place

- [ ] Open an assignment from a lecture → **Move** it to a different lecture → lands back on
      the **original lecture**, not just "the class"
- [ ] Open an assignment from the global list → **Delete** it → lands back on the **global
      Assignments list**, not the class
- [ ] Open an exam from the Exams tab → **Delete** it → lands back on the Exams tab
- [ ] Open a resource from the Library tab → **Delete** it → lands back on the Library tab

## 6. Things that should look completely unchanged

- [ ] Breadcrumb (top bar, e.g. "Overview › Fall 2026 › PHIL101") still works exactly as
      before on every detail screen
- [ ] Courses → click into a class → breadcrumb root still says **"Courses"**, not "Overview"
      — and this holds even several screens deep (class → lecture → assignment)
- [ ] Dashboard, fresh open — no empty gap where the back-button row would be (it should just
      not render at all on list screens)
- [ ] Nothing else in the app looks or behaves differently — colors, icons, layout unchanged

## 7. Back/Forward commands (new — bind a hotkey to try these, none is set by default)

Settings → Hotkeys → search "Hold Course: Back" / "Hold Course: Forward" → bind something,
e.g. `Cmd+[` / `Cmd+]`.

- [ ] Click through several screens, then trigger **Back** repeatedly — retraces your actual
      path, one real navigation at a time (tab switches don't count as separate steps)
- [ ] After going Back a few times, trigger **Forward** — returns you the way you came
- [ ] Navigate somewhere new after going Back — Forward now does nothing (the old forward
      path is gone, same as a browser)
- [ ] Delete an item you're currently viewing, then trigger Back — doesn't get stuck bouncing
      off the now-empty screen

## 8. 🔶 Boox-only pass

Run just these after `./install.sh` and syncing to the Boox:

- [ ] Section 1 (back-button labels) — touch targets not too small, layout doesn't wrap oddly
- [ ] Section 2 (chevron scoping) — same checks, on the narrower screen
- [ ] Section 4 (scroll) — e-ink repaint is slow, so specifically check the page doesn't
      visibly *flash back to top before settling* — that'd be a giveaway the restore is
      happening a frame late
- [ ] Section 7 (Back/Forward commands) — bind a hotkey there too if the Boox has a keyboard
      attached, otherwise skip (no gesture/swipe binding exists yet — that's issue #19)

---

## If something's wrong

Note which numbered item, what you did, and what happened instead of what was expected — that's
enough for me to find it. No need to write a full bug report.
