#!/bin/sh
# Re-make content/bridge/hanashishou-metfirst.json from a Hanashishou checkout (read only: the audit runs in a scratch copy).
# Usage (repo root): tools/bridge-metfirst.sh ../hanashishou
set -e
HANA="$(cd "$1" && pwd)"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
git -C "$HANA" archive HEAD | tar -x -C "$TMP"
(cd "$TMP" && npm ci --no-audit --no-fund >/dev/null && npm run content >/dev/null && npx tsx scripts/malay-audit.ts --ledger "$HERE/content/ledger/malay-ledger.csv" --words-out "$TMP/words.json" | tail -3)
python3 -I "$HERE/tools/bridge_metfirst.py" "$TMP/words.json" "$HANA"
rm -rf "$TMP"
