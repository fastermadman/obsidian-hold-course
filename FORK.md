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

## Fork-only layer (never offered upstream)

| Change | Issues | Status |
|---|---|---|
| Notes as vault files (`fileIsTruth`), stub frontmatter, per-kind subfolders | #5b | carried; **check** against upstream's template-based notes |
| Open in Horus / quick-open buttons | #22 | carried |
| In-process API for ItsWiz (`plugin.api.update`), `CURRENT_DATA_VERSION` contract | #84, #63 | carried |
| Device-local settings in `device-settings.json` | #10, #28 | carried; settings split decides the port (#103) |
| Install script for the Boox config, BRAT release workflow | #97 | carried |

## Worth offering upstream

| Change | Issues | Status |
|---|---|---|
| Fixes: bulk-add hang on an unknown day name, notes text lost on re-render, selectable text, chevrons respect hide-done | #66, #73 | pitch, once reproduced on the newest tag |
| Time format 12h / 24h / auto | | pitch |
| Calendar: legend-as-filter, weekend auto-hide, ISO week numbers, sticky header, day popover scroll, today highlight | #68, #94 | pitch, one PR per item |
| Per-lecture time / location / instructor | #41 | pitch (needs a migration note) |
| Type, status, class and tab icons; colour rail; next-assignment block; deadline radar incl. exams | #44, #45, #50, #51, #56, #57, #58 | pitch the icons first |
| Leaf-history navigation model | #14, #35 | design doc first (`plans/0014-navigation-model.md`) |
| Neutral grayscale palette | #9 | maybe later, with contrast numbers |
| Test suite + `module.exports` test hooks, CI | #82 | offer only |

## Ported from upstream (so they drop out when we rebase)

Note links follow moves/renames (#89) · class delete and move cleanup (#91) · hide
completed/dropped classes (#88) · mobile modal fixes (#92).
