#!/bin/sh
# Kopiér pluginet ind i ViaVaults Boox-konfiguration.
#
# Mac-konfigurationen (.obsidian) er SYMLINKET direkte til dette repo —
# den opdateres af sig selv, intet script nødvendigt, redigeringer er live
# med det samme.
#
# .obsidian-onyx kan IKKE symlinkes: den mappe synces fysisk til Boox via
# Syncthing. En symlink der peger på en sti på denne Mac er meningsløs på
# Android — enten virker pluginet ikke på enheden, eller Syncthing roder
# rundt i konflikt-filer den ikke kan afgøre. Boox skal have ægte
# fil-indhold, derfor skal dette script køres før hver device-test.
#
# data.json røres ikke af dette script. Efter viastudywiz-extension#146 reconciler
# sync_hold_course.py selv data.json'ens INDHOLD (semesters, currentSemesterId) ind
# i .obsidian-onyx — kun `settings` (einkMode, mobileScale) er bevidst per-enhed og
# bevares af den reconcile. Dette script skal derfor stadig holde fingrene væk.
#
# manifest.json kopieres IKKE: repoets manifest har isDesktopOnly: true
# (se issue #4, ikke løst i koden endnu), men enhedens kopi er patchet til
# isDesktopOnly: false lokalt — ellers loader pluginet slet ikke på Android.
set -e

VAULT="${1:-$HOME/ViaVault}"
DEST="$VAULT/.obsidian-onyx/plugins/hold-course"

cd "$(dirname "$0")"
[ -d "$DEST" ] || { echo "Findes ikke: $DEST"; exit 1; }

cp main.js styles.css "$DEST/"
echo "✓ .obsidian-onyx  →  $(wc -c < "$DEST/main.js" | tr -d ' ') bytes — husk at synce til Boox og genindlæse pluginet"
