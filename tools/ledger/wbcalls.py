"""Turn a write-back plan into update_values calls: one J:K range per run of consecutive planned rows.

Usage (from the repo root):
    python3 -I tools/ledger/wbcalls.py <before.json> <map.json> <calls.json>

Prints the ranges and writes [{"range": "Ledger!J605:K605", "values": [[card IDs, place]]}, ...]. Each call writes the
planned J (card IDs) and K (place) cells and nothing else; cells in the run that need no change are written back
unchanged. Make the calls, read the whole tab again and run writeback.py verify.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import writeback as w  # noqa: E402

before = w.load(sys.argv[1])
m = json.load(open(sys.argv[2], encoding="utf-8"))
plan=w.plan(before,m)
rows={p["row"]:p for p in plan}
runs=[]; cur=[]
for r in sorted(rows):
    if cur and r==cur[-1]+1: cur.append(r)
    else:
        if cur: runs.append(cur)
        cur=[r]
if cur: runs.append(cur)
calls=[]
for run in runs:
    vals=[]
    for r in run:
        lid=before[r-1][0]; mm=m[lid]
        vals.append([", ".join(mm["ids"]), mm["place"]])
    calls.append({"range":f"Ledger!J{run[0]}:K{run[-1]}","values":vals})
json.dump(calls,open(sys.argv[3],"w"),ensure_ascii=False,indent=0)
print(len(calls),"calls;",sum(len(c["values"]) for c in calls),"rows")
for c in calls: print(c["range"],len(c["values"]))
