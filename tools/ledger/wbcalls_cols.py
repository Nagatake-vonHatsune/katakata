"""Turn a write-back plan into single-column update_values calls (K and M cells; step 6c-2).

Usage (from the repo root):
    python3 -I tools/ledger/wbcalls_cols.py <before.json> <map.json> <calls.json> [max_gap]

For every column that the plan changes, the planned rows are grouped into runs (a gap of at most `max_gap` unplanned rows,
default 10, is bridged); a call writes one column over a run, and the cells in the run that need no change are written back
with the value of the "before" read. Make the calls, read the whole tab again and run writeback.py verify.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import writeback as w  # noqa: E402

before = w.load(sys.argv[1])
gap = int(sys.argv[4]) if len(sys.argv) > 4 else 10
plan = w.plan(before, json.load(open(sys.argv[2], encoding="utf-8")))
by_col = {}
for p in plan:
    for c in p["cells"]:
        by_col.setdefault(c["col"], {})[p["row"]] = c["after"]
calls = []
for col, cells in sorted(by_col.items()):
    rows = sorted(cells)
    runs, cur = [], [rows[0]]
    for r in rows[1:]:
        if r - cur[-1] - 1 <= gap:
            cur.append(r)
        else:
            runs.append(cur)
            cur = [r]
    runs.append(cur)
    idx = "ABCDEFGHIJKLMNOPQRST".index(col)
    for run in runs:
        a, b = run[0], run[-1]
        vals = [[cells.get(r, before[r - 1][idx])] for r in range(a, b + 1)]
        calls.append({"range": f"Ledger!{col}{a}:{col}{b}", "values": vals, "planned": len(run)})
json.dump(calls, open(sys.argv[3], "w"), ensure_ascii=False)
print(len(calls), "calls")
for c in calls:
    print(c["range"], len(c["values"]), "rows,", c["planned"], "planned")
