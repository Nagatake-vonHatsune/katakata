"""Join two reads of the sheet's Ledger tab (the Google Sheets get_values JSON files) into one values file.

Usage (from the repo root):
    python3 -I tools/ledger/join_reads.py <A1-T600.json> <A601-T1400.json> <out.json>

The Ledger tab is too large for one get_values call, so it is read as Ledger!A1:T600 and Ledger!A601:T1400 and joined:
{"values": part1 + part2}. The result feeds sheet_to_snapshot.py and writeback.py.
"""

import json
import sys

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
a = json.load(open(sys.argv[1], encoding="utf-8"))["values"]
b = json.load(open(sys.argv[2], encoding="utf-8"))["values"]
print(len(a), len(b), a[-1][0], b[0][0], b[-1][0])
json.dump({"values": a + b}, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False)
