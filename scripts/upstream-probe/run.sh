#!/usr/bin/env bash
# Run the upstream probes against any git ref's main.js (default: upstream/main).
# Usage: scripts/upstream-probe/run.sh [ref]      e.g. 1.15.0, upstream/main, HEAD
# Nothing is written to the repo: main.js is copied to a temp dir with an exports
# hook appended, and every probe runs there under a hard timeout (macOS has no
# `timeout`, so perl's alarm is used). Not part of CI (`node --test test/`).
set -u
REF="${1:-upstream/main}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "$HERE" rev-parse --show-toplevel)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git -C "$ROOT" show "$REF:main.js" > "$TMP/main.js" || { echo "cannot read main.js at $REF"; exit 2; }
names=$(grep -E -o '^(async )?function [A-Za-z0-9_]+|^const [A-Za-z0-9_]+|^class [A-Za-z0-9_]+' "$TMP/main.js" | awk '{print $NF}' | sort -u | tr '\n' ',')
printf '\n;Object.assign(module.exports, {%s});\n' "${names%,}" >> "$TMP/main.js"

echo "== probes against $REF ($(git -C "$ROOT" rev-parse --short "$REF"))"
fail=0
for p in "$HERE"/probes/[!_]*.js; do
  echo "-- $(basename "$p")"
  HC_MAIN="$TMP/main.js" perl -e 'alarm 20; exec @ARGV' node "$p"
  rc=$?
  if [ $rc -eq 142 ]; then echo "HANG: killed after 20 s (unbounded loop)"; fail=1
  elif [ $rc -ne 0 ]; then fail=1; fi
done
exit $fail
