# FORK.md

This is a fork of [LiveAQuietLife/obsidian-hold-course](https://github.com/LiveAQuietLife/obsidian-hold-course).
Upstream ships `main.js` as one large hand-written file, so what we carry has to stay
easy to find, easy to re-apply, and easy to drop once upstream has it.

- Last upstream release looked at: see `.upstream-seen`. A weekly job
  (`.github/workflows/upstream-watch.yml`) opens an issue when a newer one appears,
  with a dry-run conflict count.
- Plan: carry the fork as a patch stack on top of upstream's latest tag (#104).
- Review of what to take from upstream, and what to offer back: #85, #103.

Status: **carried** = only in the fork · **pitch** = worth offering upstream ·
**check** = verify against the newest upstream before keeping.
Rows below were verified against upstream 1.15.0 in #123 (evidence in the comment
there). **static** = read in code, not run; **snippet** = pure CSS, could ship as a
CSS snippet instead of a patch.

## Fork-only layer (never offered upstream)

| Change | Issues | Status |
|---|---|---|
| Notes as vault files (`fileIsTruth`), stub frontmatter, per-kind subfolders | #5b | carried; 1.15.0 has template-based notes only (no in-app rendering, no stub frontmatter) |
| Open in Horus / quick-open buttons | #22 | carried; 1.15.0 has no `file-menu` or Horus hook |
| In-process API for ItsWiz (`plugin.api.update`), `CURRENT_DATA_VERSION` contract | #84, #63 | carried; 1.15.0 has no `api`; its `dataVersion` only stamps, no newer-version guard |
| Device-local settings in `device-settings.json` | #10, #28 | carried / pitch; 1.15.0 keeps `einkMode` in `data.json` (`uiScaleMobile` is per-platform but also in `data.json`) |
| Install script for the Boox config, BRAT release workflow | #97 | carried |

## Worth offering upstream

| Change | Issues | Status |
|---|---|---|
| Fixes: bulk-add hang on an unknown day name, notes text lost on re-render, selectable text, chevrons respect hide-done | #66, #73 | #66 reproduced on 1.15.0, pitch; #73 not reproduced yet (#121); chevrons/hide-done likely still open (static) |
| Time format 12h / 24h / auto | | pitch; 1.15.0 displays by locale ("auto"), picker is 12h only |
| Calendar: legend-as-filter, weekend auto-hide, ISO week numbers, sticky header, day popover scroll, today highlight | #68, #94 | pitch, one PR per item; 1.15.0 has none of weekend hide / week numbers / legend filter (it has class, kind and type dropdowns); today highlight is pure CSS (snippet) |
| Per-lecture time / location / instructor | #41 | pitch (needs a migration note); 1.15.0 lectures have no time/location/instructor |
| Type, status, class and tab icons; colour rail; next-assignment block; deadline radar incl. exams | #44, #45, #50, #51, #56, #57, #58 | pitch the icons first; icons and colour rail don't exist in 1.15.0; its next-assignment block opens the tab, not the item; radar-with-exams unconfirmed (all static) |
| Leaf-history navigation model | #14, #35 | design doc first (`plans/0014-navigation-model.md`); 1.15.0 has only `previousScreen` + `assignmentOrigin`, no history stack (#119) |
| Neutral grayscale palette | #9 | not pure CSS (lives in the JS palette); 1.15.0 already has darker same-hue e-ink shades, so only neutral gray is the delta |
| Test suite + `module.exports` test hooks, CI | #82 | offer only |

## Ported from upstream (so they drop out when we rebase)

Note links follow moves/renames (#89) · class delete and move cleanup (#91, its tests pass on 1.15.0) · hide
completed/dropped classes (#88) · mobile modal fixes (#92).

## Pure CSS, could ship as a snippet (verified in #123)

Container-query reflow (`73beb36`), selectable text (`5caed51`), today highlight (#94).
