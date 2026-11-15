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

Exit route (#123): the one way a row leaves the fork. **Adopt** = upstream takes it ·
**Extend** = a companion plugin or CSS snippet does it through an extension surface ·
**Drop** = not worth carrying (owner's call) · **Carry** = small patch (#104).
Routes marked *(owner)* are open decisions, not findings.

## Fork-only layer (never offered upstream)

| Change | Issues | Exit | Status and evidence |
|---|---|---|---|
| Notes as vault files (`fileIsTruth`), stub frontmatter, per-kind subfolders | #5b | **Carry** | 1.15.0 has template-based notes only (no in-app rendering, no stub frontmatter). Only a "note provider" hook could move part of it to Extend. |
| Open in Horus / quick-open buttons | #22 | **Extend** | Needs upstream's note-action registry (#106). 1.15.0 has no `file-menu` or Horus hook, and `file-menu` doesn't reach HC's own rows. Without the hook this falls back to Carry. |
| In-process API for ItsWiz (`plugin.api.update`), `CURRENT_DATA_VERSION` contract | #84, #63 | **Extend** | Needs an upstream "API for companion plugins". 1.15.0 has no `api`; its `dataVersion` only stamps, no newer-version guard. Without the API this falls back to Carry. |
| Device-local settings in `device-settings.json` | #10, #28 | **Adopt** | 1.15.0 keeps `einkMode` in `data.json` (`uiScaleMobile` is per-platform but also in `data.json`). The two-device problem is real upstream. |
| Install script for the Boox config, BRAT release workflow | #97 | **Carry** | Fork infrastructure; has no upstream home. |

## Worth offering upstream

| Change | Issues | Exit | Status and evidence |
|---|---|---|---|
| Fix: bulk-add hang on an unknown day name | #66 | **Adopt** | Reproduced on 1.15.0 (test killed by 20 s alarm). Small PR, test ready. |
| Fix: notes text lost on re-render | #73 | **Adopt** | Not reproduced yet (#121). 1.15.0 has no draft capture. |
| Fix: chevrons respect hide-done | #34 | **Adopt** | Likely still open in 1.15.0 (static): `assignSorted` ignores `assignShowDone`. |
| Selectable text | | **Extend** | Pure CSS (snippet): commit `5caed51` touches only `styles.css`; 1.15.0 has no `user-select: text`. |
| Time format 12h / 24h / auto | | **Adopt** | 1.15.0 displays by locale ("auto"); picker is 12h only; no setting. |
| Calendar: legend-as-filter, weekend auto-hide, ISO week numbers, sticky header, day popover scroll | #68 | **Adopt** | One PR per item. 1.15.0 has none of weekend hide, week numbers or legend filter (it has class, kind and type dropdowns). Its `.hc-toolbar` is already sticky; the fork's sticky header is a different element. Popover has no `max-height`/`overflow`; fork's fix touches JS and CSS. |
| Calendar: today highlight | #94 | **Extend** | Pure CSS (snippet): commit `3cbd5c6` touches only `styles.css`. 1.15.0's highlight exists but is weak. |
| Container-query reflow of grids | | **Extend** | Pure CSS (snippet): commit `73beb36`. 1.15.0 has no `@container` and no `@media`. |
| Per-lecture time / location / instructor | #41 | **Adopt** | Needs a migration note. 1.15.0 `addLecture` has no such fields. |
| Type, status, class and tab icons; colour rail; next-assignment block; deadline radar incl. exams | #44, #45, #50, #51, #56, #57, #58 | **Adopt** | Pitch the icons first. Icons and colour rail don't exist in 1.15.0; its next-assignment block opens the tab, not the item; radar-with-exams unconfirmed (all static). |
| Leaf-history navigation model | #14, #35 | **Drop or Carry** *(owner)* | Decide in #119. 1.15.0 has only `previousScreen` + `assignmentOrigin`, no history stack. Design doc: `plans/0014-navigation-model.md`. |
| Neutral grayscale palette | #9 | **Adopt** *(owner may Drop)* | Not pure CSS (lives in the JS palette, commit `086bb96`). 1.15.0 already has darker same-hue e-ink shades, so only neutral gray is the delta. Low priority; bring contrast numbers. |
| Test suite + `module.exports` test hooks, CI | #82 | **Adopt** | Offer only; Carry if not taken. |

## Ported from upstream (so they drop out when we rebase)

Note links follow moves/renames (#89) · class delete and move cleanup (#91, its tests
pass on 1.15.0) · hide completed/dropped classes (#88) · mobile modal fixes (#92).
