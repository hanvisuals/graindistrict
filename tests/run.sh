#!/usr/bin/env bash
# Runs every browser test and prints a pass/fail line per file.
#   ./run.sh              - all of them
#   ./run.sh testdrag.js  - just one
#
# APP    path to the index.html under test   (default ../index.html)
# CHROME path to a Chromium binary           (default Playwright's own)
set -u
cd "$(dirname "$0")"
export APP="${APP:-$(cd .. && pwd)/index.html}"
if [ -z "${CHROME:-}" ] && [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then
  export CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
fi
[ -d node_modules ] || npm install --silent
files="${*:-$(ls test*.js test*.mjs)}"
fails=0
for t in $files; do
  printf '%-22s ' "$t"
  out=$(timeout 300 node "$t" 2>&1)
  p=$(printf '%s' "$out" | grep -cE '(^|: )PASS')
  f=$(printf '%s' "$out" | grep -cE '^(FAIL|PAGE ERROR)|: FAIL')
  echo "$p pass, $f fail"
  if [ "$f" -gt 0 ]; then fails=$((fails+1)); printf '%s\n' "$out" | grep -E '^(FAIL|PAGE ERROR)|: FAIL' | sed 's/^/    /'; fi
done
[ "$fails" -eq 0 ] || echo "--- $fails file(s) with failures"
exit "$fails"
