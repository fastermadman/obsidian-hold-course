#!/usr/bin/env bash
# Looks for a new upstream release (LiveAQuietLife/obsidian-hold-course) and, if
# there is one, opens an issue with a dry-run conflict count against our main.
#
#   .upstream-seen   the newest upstream tag we have already looked at
#   DRY_RUN=1        print the issue instead of creating it
#   UPSTREAM_SEEN=x  override .upstream-seen (for local testing)
set -euo pipefail

UPSTREAM_URL="https://github.com/LiveAQuietLife/obsidian-hold-course.git"
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
git fetch --quiet --tags upstream main

# Plain x.y.z tags only (the fork's own tags look like 1.8.0-fm.1).
latest=$(git tag --list --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
seen=${UPSTREAM_SEEN:-$(tr -d '[:space:]' < .upstream-seen)}

newest=$(printf '%s\n%s\n' "$latest" "$seen" | sort -V | tail -1)
if [ "$latest" = "$seen" ] || [ "$newest" = "$seen" ]; then
  echo "No new upstream release (latest $latest, seen $seen)."
  exit 0
fi

title="Upstream $latest is out"
if [ -z "${DRY_RUN:-}" ] && [ "$(gh issue list --state all --search "\"$title\" in:title" --json number --jq length)" != "0" ]; then
  echo "Issue for $latest already exists."
  exit 0
fi

# Dry-run merge of the new tag into our main; nothing is written to any branch.
set +e
out=$(git merge-tree --write-tree --name-only HEAD "$latest" 2>&1)
set -e
tree=$(printf '%s\n' "$out" | head -1)
files=$(printf '%s\n' "$out" | grep -c '^CONFLICT' || true)
hunks=0
for f in main.js styles.css; do
  n=$(git show "$tree:$f" 2>/dev/null | grep -c '^<<<<<<< ' || true)
  hunks=$((hunks + n))
done

body=$(cat <<BODY
Upstream tagged **$latest** (we last looked at $seen).

Dry-run merge into \`main\`: **$files conflicted file(s), $hunks conflict hunk(s)** in \`main.js\`/\`styles.css\`.

- Compare: https://github.com/LiveAQuietLife/obsidian-hold-course/compare/$seen...$latest
- Review it like #103: keep / later / skip, and check each of our changes in \`FORK.md\` against it.
- When done, set \`.upstream-seen\` to \`$latest\`.
BODY
)

if [ -n "${DRY_RUN:-}" ]; then
  printf 'TITLE: %s\n\n%s\n' "$title" "$body"
else
  gh issue create --title "$title" --label enhancement --body "$body"
fi
