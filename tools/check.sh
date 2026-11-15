#!/bin/sh
# Runs every headless check and prints what each reports. Screenshots go to the folder given (default /tmp/arena-shots).
# Needs Playwright with Chromium. Run from the repo root:  sh tools/check.sh
OUT=${1:-/tmp/arena-shots}; mkdir -p "$OUT"; cd "$(dirname "$0")/tests" || exit 1
node ../sim.js 1 8 | head -1
node ../sim.js 1 6 six quest | head -1
node rooms.js | head -1
for t in party quest legion sprint1 doors crits guard summon; do echo "== $t"; node $t.js "$OUT" 2>&1 | tail -6; done
echo "== turns"; node turns.js 2>&1 | tail -2
